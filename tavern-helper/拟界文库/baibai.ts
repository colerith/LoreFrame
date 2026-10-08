// Read the host plugin only on explicit import; never change its settings.
type LoreFrameBaibaiRecord = Record<string, any>;

function getLoreFrameBaibaiSettings(): LoreFrameBaibaiRecord {
  return (SillyTavern.extensionSettings as LoreFrameBaibaiRecord)?.baibai_image || {};
}

function loreFrameNovelAiEndpoint(value: string): string {
  const raw = value.trim() || 'https://image.novelai.net';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw Error('NovelAI 地址格式无效，请填写完整 HTTP(S) 地址');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw Error('NovelAI 地址不能包含密码、查询参数或锚点');
  return (
    raw.replace(/\/+$/, '').replace(/\/ai(?:\/(?:generate-image|encode-vibe|models))?$/, '') + '/ai/generate-image'
  );
}

function importLoreFrameBaibaiPresets(settings: LoreFrameBaibaiRecord, current: SettingsImageGeneration) {
  const nai = settings.nai;
  if (!nai || typeof nai !== 'object') throw Error('未找到柏宝绘 NovelAI 配置，请先在柏宝绘中保存接口');
  const endpoints =
    Array.isArray(nai.endpoints) && nai.endpoints.length
      ? nai.endpoints
      : [{ id: 'legacy', name: 'NovelAI', url: nai.url, key: nai.key }];
  const artist = Array.isArray(nai.artistPresets)
    ? nai.artistPresets.find((item: LoreFrameBaibaiRecord) => item.id === nai.activeArtistId)
    : undefined;
  const size = String(nai.portraitSize || nai.resolution || '').match(/^(\d+)\s*[x×]\s*(\d+)$/);
  const presets = [...current.presets];
  const imported: string[] = [];
  for (const [index, endpoint] of endpoints.entries()) {
    if (!endpoint || typeof endpoint.key !== 'string' || !endpoint.key.trim()) continue;
    const id = `baibai-nai-${endpoint.id || `slot-${index}`}`;
    const existing = presets.find(preset => preset.id === id);
    const preset = normalizeImageGenerationPreset({
      ...getDefaultImageGenerationPreset(),
      ...existing,
      id,
      name: `柏宝绘 · ${endpoint.name || 'NovelAI'}`,
      connection_mode: 'custom',
      endpoint: loreFrameNovelAiEndpoint(String(endpoint.url || '')),
      api_key: endpoint.key.trim(),
      model: String(nai.model || 'nai-diffusion-4-5-full'),
      size_preset: size ? `${Number(size[1])}x${Number(size[2])}` : undefined,
      width: size ? Number(size[1]) : 1024,
      height: size ? Number(size[2]) : 1024,
      steps: nai.steps,
      prompt_guidance: nai.scale,
      sampler: nai.sampler,
      noise_schedule: nai.noiseSchedule,
      prompt_guidance_rescale: nai.cfgRescale,
      seed: nai.seed,
      positive_prompt: [artist?.prompt, artist?.quality || nai.qualityTags].filter(Boolean).join(', '),
      negative_prompt: artist?.negative || nai.undesiredContent || '',
    });
    const position = presets.findIndex(item => item.id === id);
    if (position < 0) presets.push(preset);
    else presets[position] = preset;
    imported.push(id);
  }
  if (!imported.length) throw Error('柏宝绘没有已填写密钥的 NovelAI 接口');
  return { settings: { ...current, presets, active_preset_id: imported[0] }, count: imported.length };
}

function listLoreFrameBaibaiVibes(): { id: string; name: string }[] {
  const vibes = getLoreFrameBaibaiSettings().nai?.vibes;
  return Array.isArray(vibes)
    ? vibes.filter(v => v && v.id).map(v => ({ id: String(v.id), name: String(v.name || '参考图') }))
    : [];
}

async function readLoreFrameBaibaiVibe(id: string): Promise<SettingsImageGenerationVibeReference> {
  const vibe = getLoreFrameBaibaiSettings().nai?.vibes?.find((item: LoreFrameBaibaiRecord) => String(item.id) === id);
  if (!vibe) throw Error('柏宝绘参考图已不存在，请重新读取列表');
  let data: LoreFrameBaibaiRecord = vibe;
  if (typeof vibe.dataPath === 'string' && vibe.dataPath) {
    if (vibe.dataPath.startsWith('idb:')) {
      data = await new Promise((resolve, reject) => {
        const request = host_window.indexedDB.open('baibai_image_vibes');
        const timer = host_window.setTimeout(() => reject(Error('读取柏宝绘参考图超时')), 20000);
        const fail = () => {
          host_window.clearTimeout(timer);
          reject(Error('无法读取柏宝绘本地参考图'));
        };
        request.onupgradeneeded = () => {
          request.transaction?.abort();
          fail();
        };
        request.onerror = fail;
        request.onblocked = fail;
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('vibes')) {
            db.close();
            fail();
            return;
          }
          const read = db.transaction('vibes', 'readonly').objectStore('vibes').get(vibe.dataPath.slice(4));
          read.onsuccess = () => {
            host_window.clearTimeout(timer);
            db.close();
            resolve(read.result);
          };
          read.onerror = () => {
            db.close();
            fail();
          };
        };
      });
    } else {
      const url = new URL(vibe.dataPath, host_window.location.href);
      if (url.origin !== host_window.location.origin || !url.pathname.startsWith('/user/files/'))
        throw Error('柏宝绘参考图文件必须位于当前酒馆的 /user/files/');
      const response = await fetch(url.href, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error(`读取柏宝绘参考图失败（${response.status}）`);
      data = await response.json();
    }
  }
  if (!data) throw Error('柏宝绘参考图数据不存在');
  const image = typeof data.image === 'string' ? data.image : '';
  const encodings =
    data.encodings && typeof data.encodings === 'object'
      ? Object.fromEntries(
          Object.entries(data.encodings).filter(
            ([, value]) => value && typeof (value as LoreFrameBaibaiRecord).encoding === 'string',
          ),
        )
      : {};
  if (!image && !Object.keys(encodings).length) throw Error('参考图缺少原图和有效编码');
  return normalizeImageGenerationVibeReference({
    id: `baibai-${id}`,
    name: String(vibe.name || '柏宝绘参考图'),
    image_data: image ? (image.startsWith('data:') ? image : `data:image/png;base64,${image}`) : '',
    source: 'baibai',
    strength: vibe.enabled === false ? 0 : vibe.strength,
    encodings: encodings as SettingsImageGenerationVibeReference['encodings'],
  });
}
