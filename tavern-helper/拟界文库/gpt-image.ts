function readGptImageSettingsFromDom(document: Document): SettingsGptImage {
  const values = Object.fromEntries(
    Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-gpt-image-field]'),
    ).map(input => [input.dataset.gptImageField!, input.value]),
  );
  return normalizeGptImageSettings(values);
}

function renderGptImageSettings(document: Document, settings: SettingsImageGeneration) {
  document.querySelectorAll<HTMLElement>('[data-image-provider-panel]').forEach(panel => {
    panel.hidden = panel.dataset.imageProviderPanel !== settings.mode;
  });
  const config = normalizeGptImageSettings(settings.gpt_image);
  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-gpt-image-field]')
    .forEach(input => {
      input.value = config[input.dataset.gptImageField as keyof SettingsGptImage];
    });
}

function loreFrameGptImageRoot(endpoint: string): string {
  let url: URL;
  try {
    url = new URL(endpoint.trim() || 'https://api.openai.com');
  } catch {
    throw Error('GPT Image 地址格式错误，请填写完整 HTTP(S) 地址');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw Error('GPT Image 地址不能包含密码、查询参数或锚点');
  return url.href.replace(/\/+$/, '').replace(/\/v1(?:\/(?:images\/(?:generations|edits)|models))?$/, '');
}

async function requestGptImageModels(config: SettingsGptImage): Promise<string[]> {
  const response = await fetch(`${loreFrameGptImageRoot(config.endpoint)}/v1/models`, {
    headers: config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {},
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error(`模型列表返回 ${response.status}，仍可手动填写模型 ID`);
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(rows)) throw Error('模型列表格式无法识别，请手动填写模型 ID');
  const models: string[] = rows
    .map(row => (typeof row === 'string' ? row : row?.id))
    .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    .map(id => id.trim());
  if (!models.length) throw Error('接口没有返回模型，请手动填写模型 ID');
  return [...new Set(models)];
}

async function requestGptImage(config: SettingsGptImage, prompt: string) {
  if (!config.api_key.trim()) throw Error('请填写 GPT Image API Key');
  if (!config.model.trim()) throw Error('请填写 GPT Image 模型');
  if (!prompt.trim()) throw Error('图片缺少画面描述');
  if (config.background === 'transparent' && config.output_format === 'jpeg')
    throw Error('透明背景请使用 PNG 或 WebP 格式');
  const signal = AbortSignal.timeout(240000);
  const body = {
    model: config.model.trim(),
    prompt: prompt.trim(),
    n: 1,
    size: config.size,
    quality: config.quality,
    output_format: config.output_format,
    background: config.background,
  };
  const response = await fetch(`${loreFrameGptImageRoot(config.endpoint)}/v1/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.api_key.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw Error(`GPT Image 返回 ${response.status}，请检查密钥、模型权限、额度及参数`);
  const payload = await response.json();
  const result = payload?.data?.[0];
  const format = ['png', 'jpeg', 'webp'].includes(payload?.output_format)
    ? payload.output_format
    : config.output_format;
  if (typeof result?.b64_json === 'string' && result.b64_json)
    return { image: `data:image/${format};base64,${result.b64_json}`, body };
  // Compatible proxies may return a temporary URL. Persist bytes, never the expiring link.
  if (typeof result?.url === 'string' && /^https?:\/\//i.test(result.url)) {
    const image_response = await fetch(result.url, { signal });
    if (!image_response.ok) throw Error('GPT Image 已返回链接，但图片下载失败');
    const blob = await image_response.blob();
    if (!/^image\/(png|jpeg|webp)$/.test(blob.type) || blob.size > 30 * 1024 * 1024)
      throw Error('GPT Image 返回的图片格式或大小不受支持');
    return { image: `data:${blob.type};base64,${bytesToBase64(new Uint8Array(await blob.arrayBuffer()))}`, body };
  }
  throw Error('GPT Image 响应中没有可识别的图片');
}
