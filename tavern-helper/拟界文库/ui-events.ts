type PromptGroupKey = 'presets' | 'base' | 'detail';
type PromptTemplateType = 'base' | 'detail';
type SecondaryProvider = SettingsSecondaryApiProvider;
type PromptExportSelection = Record<PromptGroupKey, Set<string>>;
type PromptExportGroup = {
  key: PromptGroupKey;
  label: string;
  items: SettingsPromptPresetRuntime[] | SettingsPromptItemRuntime[];
};
type PromptExportPayload = {
  loreframe_prompt_export_version: number;
  exported_at: string;
  预设: SettingsPromptPreset[];
  基础: SettingsPromptItem[];
  个性化: SettingsPromptItem[];
};
type ImportedPromptIdMap = Record<string, string>;
type ImportPromptPayload = Record<string, unknown>;
type DetailImportMode = 'json' | 'worldbook' | 'text';
type DetailExportFormat = 'json' | 'worldbook' | 'text';
type DetailImportCandidate = {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
};

function imageGenerationSamplerValue(sampler: string) {
  const values: Record<string, string> = {
    Euler: 'k_euler',
    'Euler Ancestral': 'k_euler_ancestral',
    'DPM++ 2M': 'k_dpmpp_2m',
    'DPM++ SDE': 'k_dpmpp_sde',
    DDIM: 'ddim',
  };
  return values[sampler] || sampler;
}

function normalizeNovelAiPrompt(value: unknown) {
  return String(value || '')
    .replace(/\\r/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function imageDataToBase64(value: unknown) {
  const source = String(value || '').trim();
  const match = source.match(/^data:image\/[^;]+;base64,(.+)$/i);
  return (match ? match[1] : source).replace(/\s+/g, '');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk_size = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk_size) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunk_size, bytes.length)));
  }
  return btoa(binary);
}

function createNovelAiCacheSecretKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

async function encodeNovelAiVibe(
  preset: SettingsImageGenerationPreset,
  image: string,
) {
  const generate_endpoint = loreFrameNovelAiEndpoint(preset.connection_mode === 'custom'
    ? preset.endpoint
    : 'https://image.novelai.net/ai/generate-image');
  const encode_endpoint = generate_endpoint.replace(/\/ai\/generate-image\/?$/i, '/ai/encode-vibe');
  const endpoint = /\/ai\/encode-vibe\/?$/i.test(encode_endpoint)
    ? encode_endpoint
    : `${new URL(generate_endpoint).origin}/ai/encode-vibe`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${preset.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image,
      model: preset.model,
      information_extracted: 1,
    }),
  });
  if (!response.ok) {
    const error_text = (await response.text()).slice(0, 800);
    appendImageGenerationLog('错误', 'NovelAI Vibe 编码失败', {
      endpoint,
      status: response.status,
      status_text: response.statusText,
      body: error_text,
    });
    throw new Error(`NovelAI Vibe 编码失败（${response.status}）：${error_text}`);
  }
  const encoded_data = bytesToBase64(new Uint8Array(await response.arrayBuffer()));
  if (!encoded_data) {
    throw new Error('NovelAI Vibe 编码响应为空。');
  }
  return {
    cache_secret_key: createNovelAiCacheSecretKey(),
    data: encoded_data,
  };
}

async function extractImageFromNovelAiZip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  for (let offset = 0; offset + 30 <= bytes.length; offset += 1) {
    if (view.getUint32(offset, true) !== 0x04034b50) {
      continue;
    }
    const method = view.getUint16(offset + 8, true);
    const compressed_size = view.getUint32(offset + 18, true);
    const file_name_length = view.getUint16(offset + 26, true);
    const extra_length = view.getUint16(offset + 28, true);
    const data_start = offset + 30 + file_name_length + extra_length;
    const data_end = data_start + compressed_size;
    if (data_end > bytes.length) {
      throw new Error('NovelAI ZIP 图片数据不完整。');
    }
    const file_name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + file_name_length));
    if (!/\.(png|jpe?g|webp|avif)$/i.test(file_name)) {
      offset = data_end - 1;
      continue;
    }
    let image_bytes = bytes.slice(data_start, data_end);
    if (method === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('当前浏览器不支持解压 NovelAI 图片响应。');
      }
      const stream = new Blob([image_bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      image_bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (method !== 0) {
      throw new Error(`暂不支持 NovelAI ZIP 压缩方式：${method}`);
    }
    const mime = /\.jpe?g$/i.test(file_name)
      ? 'image/jpeg'
      : /\.webp$/i.test(file_name)
        ? 'image/webp'
        : /\.avif$/i.test(file_name)
          ? 'image/avif'
          : 'image/png';
    let binary = '';
    const chunk_size = 0x8000;
    for (let index = 0; index < image_bytes.length; index += chunk_size) {
      binary += String.fromCharCode(...image_bytes.subarray(index, Math.min(index + chunk_size, image_bytes.length)));
    }
    return `data:${mime};base64,${btoa(binary)}`;
  }
  throw new Error('NovelAI 响应中没有找到图片文件。');
}

async function readImageGenerationResponse(response: Response) {
  const content_type = response.headers.get('content-type') || '';
  if (content_type.startsWith('image/')) {
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('读取图片响应失败。'));
      reader.readAsDataURL(blob);
    });
  }
  const buffer = await response.arrayBuffer();
  if (content_type.includes('zip') || new Uint8Array(buffer).slice(0, 2)[0] === 0x50) {
    return extractImageFromNovelAiZip(buffer);
  }
  const text = new TextDecoder().decode(buffer);
  const payload = JSON.parse(text) as Record<string, unknown>;
  const image = payload.image || payload.image_data || payload.data;
  if (typeof image === 'string') {
    return image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
  }
  if (Array.isArray(image) && typeof image[0] === 'string') {
    const first = image[0];
    return first.startsWith('data:') ? first : `data:image/png;base64,${first}`;
  }
  throw new Error('生图响应中没有可识别的图片数据。');
}

async function requestNovelAiImage(
  preset: SettingsImageGenerationPreset,
  prompt: string,
  negative_prompt: string,
  vibe_references: SettingsImageGenerationVibeReference[] = [],
) {
  const endpoint = loreFrameNovelAiEndpoint(preset.connection_mode === 'custom' ? preset.endpoint : 'https://image.novelai.net/ai/generate-image');
  if (!endpoint || !preset.api_key) {
    throw new Error('NovelAI 生图端点或 API Key 未配置。');
  }
  const normalized_prompt = normalizeNovelAiPrompt(prompt);
  const normalized_negative_prompt = normalizeNovelAiPrompt(negative_prompt);
  const seed = Number.isFinite(Number(preset.seed)) && Number(preset.seed) > 0
    ? Number(preset.seed)
    : Math.floor(Math.random() * 0x100000000);
  const usable_vibes = vibe_references
    .map(reference => ({
      data: imageDataToBase64(reference.image_data),
      encoding: reference.encodings?.[preset.model.replace('nai-diffusion-', 'v').replace('-curated', 'curated').replace('-full', 'full')]?.encoding,
      strength: Math.min(1, Math.max(0, Number(reference.strength) || 0)),
    }))
    .filter(reference => reference.strength > 0);
  if (usable_vibes.length > 8) throw Error('最多启用 8 张 Vibe 参考图，请移除部分参考图或将强度设为 0');
  if (usable_vibes.some(reference => !reference.data && !reference.encoding))
    throw Error('参考图没有当前模型的编码或原图，请换用匹配模型或重新导入原图');
  const strength_sum = usable_vibes.reduce((sum, reference) => sum + reference.strength, 0);
  const normalized_vibe_strengths = usable_vibes.map(reference =>
    strength_sum > 1 ? reference.strength / strength_sum : reference.strength,
  );
  const cached_vibes = [] as Array<{ cache_secret_key: string; data: string }>;
  for (const reference of usable_vibes) {
    cached_vibes.push(reference.encoding
      ? { cache_secret_key: createNovelAiCacheSecretKey(), data: reference.encoding }
      : await encodeNovelAiVibe(preset, reference.data));
  }
  const body = {
    input: normalized_prompt,
    model: preset.model,
    action: 'generate',
    parameters: {
      params_version: preset.model.includes('diffusion-5') ? 4 : 3,
      width: preset.width,
      height: preset.height,
      scale: preset.prompt_guidance,
      sampler: imageGenerationSamplerValue(preset.sampler),
      noise_schedule: preset.noise_schedule,
      steps: preset.steps,
      seed,
      n_samples: 1,
      negative_prompt: normalized_negative_prompt,
      ucPreset: 3,
      qualityToggle: true,
      autoSmea: false,
      sm: preset.smea,
      sm_dyn: preset.smea_dyn,
      decrisp: preset.decrisp,
      dynamic_thresholding: false,
      skip_cfg_above_sigma: null,
      controlnet_strength: 1,
      legacy: false,
      legacy_uc: false,
      add_original_image: true,
      inpaintImg2ImgStrength: 1,
      dyn_sampling: false,
      legacy_v3_extend: false,
      cfg_rescale: preset.prompt_guidance_rescale,
      use_coords: false,
      reference_image_multiple_cached: cached_vibes,
      characterPrompts: [],
      v4_prompt: {
        caption: { base_caption: normalized_prompt, char_captions: [] },
        use_coords: false,
        use_order: true,
      },
      v4_negative_prompt: {
        caption: { base_caption: normalized_negative_prompt, char_captions: [] },
        legacy_uc: false,
        use_coords: false,
        use_order: false,
      },
      ...(cached_vibes.length
        ? {
            reference_strength_multiple: normalized_vibe_strengths,
            normalize_reference_strength_multiple: false,
          }
        : {}),
    },
  };
  const safe_parameters = Object.fromEntries(
    Object.entries(body.parameters).map(([key, value]) => {
      if (key === 'reference_image_multiple') {
        return [key, usable_vibes.length ? `[${usable_vibes.length} 个 Vibe 参考图，内容未记录]` : []];
      }
      if (key === 'reference_image_multiple_cached') {
        return [key, cached_vibes.map(reference => ({
          cache_secret_key_present: Boolean(reference.cache_secret_key),
          data: '已编码，内容未记录',
        }))];
      }
      return [key, value];
    }),
  );
  appendImageGenerationLog('调试', 'NovelAI Vibe 参数（独立详情）', {
    reference_count: usable_vibes.length,
    information_extracted: usable_vibes.map(() => 1),
    strengths: normalized_vibe_strengths,
    normalized: strength_sum > 1,
    strength_sum_before_normalize: strength_sum,
    cached_reference_count: cached_vibes.length,
    cache_keys_present: cached_vibes.map(reference => Boolean(reference.cache_secret_key)),
  });
  appendImageGenerationLog('调试', 'NovelAI 请求体已构建（已脱敏）', {
    endpoint,
    connection_mode: preset.connection_mode,
    api_key_configured: Boolean(preset.api_key),
    api_key_length: String(preset.api_key || '').length,
    model: body.model,
    input_length: body.input.length,
    parameter_types: Object.fromEntries(Object.entries(body.parameters).map(([key, value]) => [key, typeof value])),
    parameters: safe_parameters,
    vibe: {
      count: usable_vibes.length,
      strengths: normalized_vibe_strengths,
      cached_count: cached_vibes.length,
      request_format: cached_vibes.length ? 'reference_image_multiple_cached' : '无',
    },
    prompt: normalized_prompt,
    negative_prompt: normalized_negative_prompt,
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${preset.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const raw_error_text = await response.text();
    appendImageGenerationLog('错误', 'NovelAI 返回错误响应（详细）', {
      status: response.status,
      status_text: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body_length: raw_error_text.length,
      body: raw_error_text.slice(0, 4000),
    });
    const error_text = raw_error_text.slice(0, 800);
    throw new Error(`NovelAI 请求失败（${response.status}）：${error_text}`);
  }
  appendImageGenerationLog('调试', 'NovelAI 响应成功', {
    status: response.status,
    content_type: response.headers.get('content-type') || '',
    content_length: response.headers.get('content-length') || '',
  });
  return { image: await readImageGenerationResponse(response), body };
}

async function requestNovelAiModels(api_key: string) {
  const response = await fetch('https://image.novelai.net/oa/v1/models', {
    headers: { Authorization: `Bearer ${api_key}` },
  });
  if (!response.ok) {
    throw new Error(`NovelAI 模型列表请求失败（${response.status}）。`);
  }
  const payload = (await response.json()) as unknown;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? (payload as { data: unknown[] }).data
      : (payload as { models?: unknown[] })?.models || [];
  const fetched_models = items
    .map(item => (typeof item === 'string' ? item : String((item as { model?: unknown; id?: unknown; name?: unknown })?.model || (item as { id?: unknown })?.id || (item as { name?: unknown })?.name || '').trim()))
    .filter(Boolean);
  const documented_image_models = [
    'nai-diffusion-4-5-full',
    'nai-diffusion-4-5-curated',
    'nai-diffusion-4-full',
    'nai-diffusion-4-curated',
    'nai-diffusion-3',
    'nai-diffusion-furry-3',
  ];
  return [...new Set([...documented_image_models, ...fetched_models])];
}
type DetailImportPreview = {
  mode: DetailImportMode;
  suggestedFolderName: string;
  entries: DetailImportCandidate[];
};
type ScriptRuntimeUi = {
  openEntryForMessage?: (message_id: string | number) => void;
  destroy?: () => void;
};
type IconPickerItem = {
  label: string;
  value: string;
  search_text: string;
};
type FontAwesomeMetadataEntry = {
  aliases?: {
    names?: string[];
  };
  label?: string;
  search?: {
    terms?: string[];
  };
  styles?: string[];
};

let bubble_icon_picker_items_promise: Promise<IconPickerItem[]> | null = null;

function getPreferredFontAwesomeStyle(styles: string[] | null | undefined) {
  if (styles?.includes('solid')) {
    return 'fa-solid';
  }
  if (styles?.includes('regular')) {
    return 'fa-regular';
  }
  if (styles?.includes('brands')) {
    return 'fa-brands';
  }
  return 'fa-solid';
}

async function loadBubbleIconPickerItems() {
  if (bubble_icon_picker_items_promise) {
    return bubble_icon_picker_items_promise;
  }
  bubble_icon_picker_items_promise = (async () => {
    try {
      const response = await host_window.fetch(FONT_AWESOME_METADATA_URL);
      if (!response.ok) {
        throw new Error(`metadata request failed: ${response.status}`);
      }
      const metadata = (await response.json()) as Record<string, FontAwesomeMetadataEntry>;
      const items = Object.entries(metadata)
        .map(([icon_name, entry]) => {
          const value = `${getPreferredFontAwesomeStyle(entry.styles)} fa-${icon_name}`;
          const terms = [
            icon_name,
            entry.label || '',
            ...(entry.aliases?.names || []),
            ...(entry.search?.terms || []),
            ...(entry.styles || []),
            value,
          ]
            .map(term => String(term || '').trim())
            .filter(Boolean);
          return {
            label: entry.label || icon_name,
            value,
            search_text: [...new Set(terms)].join(' ').toLowerCase(),
          } satisfies IconPickerItem;
        })
        .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
      if (items.length) {
        return items;
      }
      throw new Error('metadata returned no icons');
    } catch (error) {
      console.warn('[LoreFrame] Font Awesome 元数据读取失败，回退 CSS 解析', error);
      const css_response = await host_window.fetch(FONT_AWESOME_CSS_URL);
      if (!css_response.ok) {
        throw new Error(`css request failed: ${css_response.status}`);
      }
      const css_text = await css_response.text();
      const matches = [...css_text.matchAll(/\.fa-([a-z0-9-]+):before\s*\{/g)];
      const icon_names = [...new Set(matches.map(match => match[1]).filter(Boolean))];
      return icon_names
        .map(icon_name => ({
          label: icon_name
            .split('-')
            .map(part => part.slice(0, 1).toUpperCase() + part.slice(1))
            .join(' '),
          value: `fa-solid fa-${icon_name}`,
          search_text: `${icon_name} fa-solid fa-${icon_name}`.toLowerCase(),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
    }
  })();
  return bubble_icon_picker_items_promise;
}

function mount() {
  console.info('[LoreFrame] mount: cleanupPreviousWindow');
  cleanupPreviousWindow();
  console.info('[LoreFrame] mount: loadWindowState');
  loadWindowState();

  console.info('[LoreFrame] mount: create iframe');
  const iframe = host_document.createElement('iframe');
  iframe.id = IFRAME_ID;
  iframe.title = APP_TITLE;
  iframe.setAttribute('aria-label', APP_TITLE);
  iframe.setAttribute('frameborder', '0');
  console.info('[LoreFrame] mount: build iframe html');
  iframe.srcdoc = buildIframeHtml();

  console.info('[LoreFrame] mount: set iframe mode bubble');
  setIframeMode(iframe, 'bubble');
  console.info('[LoreFrame] mount: append iframe');
  host_document.body.appendChild(iframe);
  console.info('[LoreFrame] mount: iframe appended, waiting load');

  iframe.addEventListener('load', () => {
    console.info('[LoreFrame] mount: iframe load');
    try {
      const iframe_document = iframe.contentDocument;
      if (!iframe_document) {
        console.error('[LoreFrame] 无法访问 iframe 内容');
        return;
      }
      current_iframe_document = iframe_document;

      const iframe_body = iframe_document.body;
      const close_button = iframe_document.querySelector<HTMLElement>('.online-close');
      const panel_header = iframe_document.querySelector<HTMLElement>('.online-panel__title');
      const panel_resize_handle = iframe_document.querySelector<HTMLElement>('.panel-resize-handle');
      const sidebar_toggle = iframe_document.querySelector<HTMLElement>('.sidebar-toggle');
      const settings_column = iframe_document.querySelector<HTMLElement>('.settings-column');
      const online_main = iframe_document.querySelector<HTMLElement>('.online-main');
      const nav_buttons = iframe_document.querySelectorAll<HTMLElement>('[data-nav-view]');
      const settings_nav_buttons = iframe_document.querySelectorAll<HTMLElement>('[data-settings-nav-view]');
      const save_all_settings = iframe_document.querySelector<HTMLElement>('[data-save-all-settings]');
      const prompt_select = iframe_document.querySelector<HTMLSelectElement>('[data-prompt-select]');
      const prompt_name = iframe_document.querySelector<HTMLInputElement>('[data-prompt-name]');
      const prompt_menu_toggle = iframe_document.querySelector<HTMLElement>('[data-prompt-menu-toggle]');
      const prompt_menu = iframe_document.querySelector<HTMLElement>('[data-prompt-menu]');
      const prompt_actions_more = iframe_document.querySelector<HTMLElement>('[data-prompt-actions-more]');
      const prompt_secondary_actions = iframe_document.querySelector<HTMLElement>('[data-prompt-secondary-actions]');
      const base_prompt_select = iframe_document.querySelector<HTMLSelectElement>('[data-base-prompt-select]');
      const detail_prompt_select = iframe_document.querySelector<HTMLSelectElement>('[data-detail-prompt-select]');
      const random_detail_enabled = iframe_document.querySelector<HTMLInputElement>('[data-random-detail-enabled]');
      const random_detail_count = iframe_document.querySelector<HTMLInputElement>('[data-random-detail-count]');
      const random_detail_probability = iframe_document.querySelector<HTMLInputElement>(
        '[data-random-detail-probability]',
      );
      const random_detail_list = iframe_document.querySelector<HTMLElement>('[data-random-detail-list]');
      const detail_library_root = iframe_document.querySelector<HTMLElement>('[data-detail-library-root]');
      const detail_prompt_name_display = iframe_document.querySelector<HTMLInputElement>(
        '[data-detail-prompt-name-display]',
      );
      const detail_prompt_description = iframe_document.querySelector<HTMLTextAreaElement>(
        '[data-detail-prompt-description]',
      );
      const open_detail_library_manager_buttons = Array.from(
        iframe_document.querySelectorAll<HTMLElement>('[data-open-detail-library-manager]'),
      );
      const back_detail_library_page = iframe_document.querySelector<HTMLElement>('[data-back-detail-library-page]');
      const restore_builtin_detail_prompts_button = iframe_document.querySelector<HTMLElement>(
        '[data-restore-builtin-detail-prompts]',
      );
      const detail_manager_toggle_selection = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-toggle-selection]',
      );
      const detail_manager_select_all = iframe_document.querySelector<HTMLElement>('[data-detail-manager-select-all]');
      const detail_manager_select_none = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-select-none]',
      );
      const detail_manager_activate_selected = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-activate-selected]',
      );
      const detail_manager_deactivate_selected = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-deactivate-selected]',
      );
      const detail_manager_delete_selected = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-delete-selected]',
      );
      const detail_manager_move_selected = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-move-selected]',
      );
      const detail_manager_sort_folders = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-sort-folders]',
      );
      const detail_manager_create_folder = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-create-folder]',
      );
      const detail_manager_rename_folder = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-rename-folder]',
      );
      const detail_manager_delete_folder = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-delete-folder]',
      );
      const detail_manager_create_prompt = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-create-prompt]',
      );
      const detail_manager_import = iframe_document.querySelector<HTMLElement>('[data-detail-manager-import]');
      const detail_manager_export = iframe_document.querySelector<HTMLElement>('[data-detail-manager-export]');
      const detail_manager_card_grid = iframe_document.querySelector<HTMLElement>('[data-detail-manager-card-grid]');
      const detail_manager_search = iframe_document.querySelector<HTMLInputElement>('[data-detail-manager-search]');
      const detail_manager_sort = iframe_document.querySelector<HTMLSelectElement>('[data-detail-manager-sort]');
      const detail_manager_source_filter = iframe_document.querySelector<HTMLSelectElement>(
        '[data-detail-manager-source-filter]',
      );
      const detail_manager_active_filter = iframe_document.querySelector<HTMLSelectElement>(
        '[data-detail-manager-active-filter]',
      );
      const detail_manager_tag_filter = iframe_document.querySelector<HTMLSelectElement>(
        '[data-detail-manager-tag-filter]',
      );
      const detail_manager_manage_tags = iframe_document.querySelector<HTMLElement>(
        '[data-detail-manager-manage-tags]',
      );
      const back_detail_edit_page = iframe_document.querySelector<HTMLElement>('[data-back-detail-edit-page]');
      const detail_edit_name = iframe_document.querySelector<HTMLInputElement>('[data-detail-edit-name]');
      const detail_edit_description = iframe_document.querySelector<HTMLInputElement>('[data-detail-edit-description]');
      const detail_edit_tags = iframe_document.querySelector<HTMLInputElement>('[data-detail-edit-tags]');
      const detail_edit_tag_suggestions = iframe_document.querySelector<HTMLElement>(
        '[data-detail-edit-tag-suggestions]',
      );
      const detail_edit_content = iframe_document.querySelector<HTMLTextAreaElement>('[data-detail-edit-content]');
      const save_detail_edit = iframe_document.querySelector<HTMLElement>('[data-save-detail-edit]');
      const cancel_detail_edit = iframe_document.querySelector<HTMLElement>('[data-cancel-detail-edit]');
      const base_prompt_name = iframe_document.querySelector<HTMLInputElement>('[data-base-prompt-name]');
      const detail_prompt_name = iframe_document.querySelector<HTMLInputElement>('[data-detail-prompt-name]');
      const base_prompt_content = iframe_document.querySelector<HTMLTextAreaElement>('[data-base-prompt-content]');
      const detail_prompt_content = iframe_document.querySelector<HTMLTextAreaElement>('[data-detail-prompt-content]');
      const edit_base_prompt = iframe_document.querySelector<HTMLElement>('[data-edit-base-prompt]');
      const edit_detail_prompt = iframe_document.querySelector<HTMLElement>('[data-edit-detail-prompt]');
      const save_base_prompt = iframe_document.querySelector<HTMLElement>('[data-save-base-prompt]');
      const save_as_base_prompt = iframe_document.querySelector<HTMLElement>('[data-save-as-base-prompt]');
      const toggle_publish_base_prompt = iframe_document.querySelector<HTMLElement>(
        '[data-toggle-publish-base-prompt]',
      );
      const cancel_base_prompt = iframe_document.querySelector<HTMLElement>('[data-cancel-base-prompt]');
      const delete_base_prompt = iframe_document.querySelector<HTMLElement>('[data-delete-base-prompt]');
      const save_detail_prompt = iframe_document.querySelector<HTMLElement>('[data-save-detail-prompt]');
      const save_as_detail_prompt = iframe_document.querySelector<HTMLElement>('[data-save-as-detail-prompt]');
      const toggle_publish_detail_prompt = iframe_document.querySelector<HTMLElement>(
        '[data-toggle-publish-detail-prompt]',
      );
      const cancel_detail_prompt = iframe_document.querySelector<HTMLElement>('[data-cancel-detail-prompt]');
      const delete_detail_prompt = iframe_document.querySelector<HTMLElement>('[data-delete-detail-prompt]');
      const summary_tag_select = iframe_document.querySelector<HTMLSelectElement>('[data-summary-tag-select]');
      const summary_tag_name = iframe_document.querySelector<HTMLInputElement>('[data-summary-tag-name]');
      const summary_open_tag = iframe_document.querySelector<HTMLInputElement>('[data-summary-open-tag]');
      const summary_close_tag = iframe_document.querySelector<HTMLInputElement>('[data-summary-close-tag]');
      const edit_summary_tag = iframe_document.querySelector<HTMLElement>('[data-edit-summary-tag]');
      const save_summary_tag = iframe_document.querySelector<HTMLElement>('[data-save-summary-tag]');
      const save_as_summary_tag = iframe_document.querySelector<HTMLElement>('[data-save-as-summary-tag]');
      const cancel_summary_tag = iframe_document.querySelector<HTMLElement>('[data-cancel-summary-tag]');
      const toggle_publish_summary_tag = iframe_document.querySelector<HTMLElement>(
        '[data-toggle-publish-summary-tag]',
      );
      const delete_summary_tag = iframe_document.querySelector<HTMLElement>('[data-delete-summary-tag]');
      const auto_generate = iframe_document.querySelector<HTMLInputElement>('[data-auto-generate]');
      const reset_appearance = iframe_document.querySelector<HTMLElement>('[data-reset-appearance]');
      const chat_history_depth = iframe_document.querySelector<HTMLInputElement>('[data-chat-history-depth]');
      const mobile_view_scale = iframe_document.querySelector<HTMLInputElement>('[data-mobile-view-scale]');
      const online_storage_limit_mb = iframe_document.querySelector<HTMLInputElement>('[data-online-storage-limit-mb]');
      const clear_current_online_storage = iframe_document.querySelector<HTMLElement>(
        '[data-clear-current-online-storage]',
      );
      const clear_online_storage = iframe_document.querySelector<HTMLElement>('[data-clear-online-storage]');
      const generation_retry_enabled = iframe_document.querySelector<HTMLInputElement>('[data-generation-retry-enabled]');
      const generation_retry_timeout_ms = iframe_document.querySelector<HTMLInputElement>(
        '[data-generation-retry-timeout-ms]',
      );
      const generation_retry_count = iframe_document.querySelector<HTMLInputElement>('[data-generation-retry-count]');
      const launch_entry_mode_inputs = iframe_document.querySelectorAll<HTMLInputElement>('[data-launch-entry-mode]');
      const edit_excluded_characters = iframe_document.querySelector<HTMLElement>('[data-edit-excluded-characters]');
      const excluded_tag_input = iframe_document.querySelector<HTMLInputElement>('[data-excluded-tag-input]');
      const add_excluded_tag = iframe_document.querySelector<HTMLElement>('[data-add-excluded-tag]');
      const inject_default_excluded_tags = iframe_document.querySelector<HTMLElement>(
        '[data-inject-default-excluded-tags]',
      );
      const excluded_tags_chips = iframe_document.querySelector<HTMLElement>('[data-excluded-tags-chips]');
      const theme_mode = iframe_document.querySelector<HTMLSelectElement>('[data-theme-mode]');
      const theme_day_start = iframe_document.querySelector<HTMLInputElement>('[data-theme-day-start]');
      const theme_night_start = iframe_document.querySelector<HTMLInputElement>('[data-theme-night-start]');
      const theme_schedule_fields = iframe_document.querySelector<HTMLElement>('[data-theme-schedule-fields]');
      const bubble_background_mode = iframe_document.querySelector<HTMLSelectElement>('[data-bubble-background-mode]');
      const bubble_background_color = iframe_document.querySelector<HTMLInputElement>('[data-bubble-background-color]');
      const bubble_icon_color_mode = iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-color-mode]');
      const bubble_icon_color = iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-color]');
      const bubble_icon_source = iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-source]');
      const bubble_icon_value = iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-value]');
      const bubble_icon_size_mode = iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-size-mode]');
      const bubble_icon_size_em = iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-size-em]');
      const open_bubble_icon_picker = iframe_document.querySelector<HTMLElement>('[data-open-bubble-icon-picker]');
      const secondary_api_enabled = iframe_document.querySelector<HTMLInputElement>('[data-secondary-api-enabled]');
      const secondary_api_provider = iframe_document.querySelector<HTMLSelectElement>('[data-secondary-api-provider]');
      const secondary_api_provider_panels = iframe_document.querySelectorAll<HTMLElement>(
        '[data-secondary-api-provider-panel]',
      );
      const secondary_api_url = iframe_document.querySelector<HTMLInputElement>('[data-secondary-api-url]');
      const secondary_api_key = iframe_document.querySelector<HTMLInputElement>('[data-secondary-api-key]');
      const secondary_api_proxy_password = iframe_document.querySelector<HTMLInputElement>(
        '[data-secondary-api-proxy-password]',
      );
      const secondary_api_vertex_token = iframe_document.querySelector<HTMLInputElement>(
        '[data-secondary-api-vertex-token]',
      );
      const secondary_api_vertex_location = iframe_document.querySelector<HTMLInputElement>(
        '[data-secondary-api-vertex-location]',
      );
      const secondary_api_vertex_project_id = iframe_document.querySelector<HTMLInputElement>(
        '[data-secondary-api-vertex-project-id]',
      );
      const secondary_api_model = iframe_document.querySelector<HTMLInputElement>('[data-secondary-api-model]');
      const secondary_api_model_toggle = iframe_document.querySelector<HTMLElement>(
        '[data-secondary-api-model-toggle]',
      );
      const secondary_api_model_menu = iframe_document.querySelector<HTMLElement>('[data-secondary-api-model-menu]');
      const secondary_api_profile_select = iframe_document.querySelector<HTMLSelectElement>(
        '[data-secondary-api-profile-select]',
      );
      const secondary_api_profile_create = iframe_document.querySelector<HTMLElement>(
        '[data-secondary-api-profile-create]',
      );
      const secondary_api_profile_rename = iframe_document.querySelector<HTMLElement>(
        '[data-secondary-api-profile-rename]',
      );
      const secondary_api_profile_delete = iframe_document.querySelector<HTMLElement>(
        '[data-secondary-api-profile-delete]',
      );
      const fetch_secondary_api_models = iframe_document.querySelector<HTMLButtonElement>(
        '[data-fetch-secondary-api-models]',
      );
      const image_generation_enabled = iframe_document.querySelector<HTMLInputElement>('[data-image-generation-enabled]');
      const image_generation_mode = iframe_document.querySelector<HTMLSelectElement>('[data-image-generation-mode]');
      const image_preset_select = iframe_document.querySelector<HTMLSelectElement>('[data-image-preset-select]');
      const image_preset_create = iframe_document.querySelector<HTMLElement>('[data-image-preset-create]');
      const image_preset_rename = iframe_document.querySelector<HTMLElement>('[data-image-preset-rename]');
      const image_preset_delete = iframe_document.querySelector<HTMLElement>('[data-image-preset-delete]');
      const image_connection_mode = iframe_document.querySelector<HTMLSelectElement>('[data-image-connection-mode]');
      const image_custom_endpoint_field = iframe_document.querySelector<HTMLElement>('[data-image-custom-endpoint-field]');
      const image_endpoint = iframe_document.querySelector<HTMLInputElement>('[data-image-endpoint]');
      const image_api_key = iframe_document.querySelector<HTMLInputElement>('[data-image-api-key]');
      const image_positive_prompt = iframe_document.querySelector<HTMLTextAreaElement>('[data-image-positive-prompt]');
      const image_negative_prompt = iframe_document.querySelector<HTMLTextAreaElement>('[data-image-negative-prompt]');
      const image_prompt_reference = iframe_document.querySelector<HTMLInputElement>('[data-image-prompt-reference]');
      const image_model = iframe_document.querySelector<HTMLInputElement>('[data-image-model]');
      const fetch_image_models = iframe_document.querySelector<HTMLElement>('[data-fetch-image-models]');
      const image_model_select = iframe_document.querySelector<HTMLSelectElement>('[data-image-model-select]');
      const image_sampler = iframe_document.querySelector<HTMLSelectElement>('[data-image-sampler]');
      const image_noise_schedule = iframe_document.querySelector<HTMLSelectElement>('[data-image-noise-schedule]');
      const image_guidance = iframe_document.querySelector<HTMLInputElement>('[data-image-guidance]');
      const image_guidance_rescale = iframe_document.querySelector<HTMLInputElement>('[data-image-guidance-rescale]');
      const image_size_preset = iframe_document.querySelector<HTMLSelectElement>('[data-image-size-preset]');
      const image_steps = iframe_document.querySelector<HTMLInputElement>('[data-image-steps]');
      const image_seed = iframe_document.querySelector<HTMLInputElement>('[data-image-seed]');
      const image_ai_default_character_position = iframe_document.querySelector<HTMLInputElement>(
        '[data-image-ai-default-character-position]',
      );
      const image_smea = iframe_document.querySelector<HTMLInputElement>('[data-image-smea]');
      const image_smea_dyn = iframe_document.querySelector<HTMLInputElement>('[data-image-smea-dyn]');
      const image_variety = iframe_document.querySelector<HTMLInputElement>('[data-image-variety]');
      const image_decrisp = iframe_document.querySelector<HTMLInputElement>('[data-image-decrisp]');
      const save_image_generation = iframe_document.querySelector<HTMLElement>('[data-save-image-generation]');
      const vibe_group_select = iframe_document.querySelector<HTMLSelectElement>('[data-vibe-group-select]');
      const vibe_group_create = iframe_document.querySelector<HTMLElement>('[data-vibe-group-create]');
      const vibe_group_rename = iframe_document.querySelector<HTMLElement>('[data-vibe-group-rename]');
      const vibe_group_delete = iframe_document.querySelector<HTMLElement>('[data-vibe-group-delete]');
      const vibe_file = iframe_document.querySelector<HTMLInputElement>('[data-vibe-file]');
      const vibe_image = iframe_document.querySelector<HTMLInputElement>('[data-vibe-image]');
      const vibe_reference_list = iframe_document.querySelector<HTMLElement>('[data-vibe-reference-list]');
      const vibe_library_list = iframe_document.querySelector<HTMLElement>('[data-vibe-library-list]');
      const vibe_library_prev = iframe_document.querySelector<HTMLButtonElement>('[data-vibe-library-prev]');
      const vibe_library_next = iframe_document.querySelector<HTMLButtonElement>('[data-vibe-library-next]');
      const save_prompt = iframe_document.querySelector<HTMLElement>('[data-save-prompt]');
      const sync_builtin_prompts = iframe_document.querySelector<HTMLElement>('[data-sync-builtin-prompts]');
      const import_prompts = iframe_document.querySelector<HTMLElement>('[data-import-prompts]');
      const export_prompts = iframe_document.querySelector<HTMLElement>('[data-export-prompts]');
      const delete_prompt = iframe_document.querySelector<HTMLElement>('[data-delete-prompt]');
      const save_secondary_api = iframe_document.querySelector<HTMLElement>('[data-save-secondary-api]');
      const save_as_prompt = iframe_document.querySelector<HTMLElement>('[data-save-as-prompt]');
      const toggle_publish_prompt = iframe_document.querySelector<HTMLElement>('[data-toggle-publish-prompt]');
      const reset_script_settings = iframe_document.querySelector<HTMLElement>('[data-reset-script-settings]');
      const format_script_all = iframe_document.querySelector<HTMLElement>('[data-format-script-all]');
      const format_current_chat = iframe_document.querySelector<HTMLElement>('[data-format-current-chat]');
      const regenerate_online = iframe_document.querySelector<HTMLButtonElement>('[data-regenerate-online]');
      const refresh_online = iframe_document.querySelector<HTMLButtonElement>('[data-refresh-online]');
      const quick_create_theater = iframe_document.querySelector<HTMLElement>('[data-quick-create-theater]');
      const delete_online = iframe_document.querySelector<HTMLElement>('[data-delete-online]');
      const edit_online_code = iframe_document.querySelector<HTMLElement>('[data-edit-online-code]');
      const previous_online_version = iframe_document.querySelector<HTMLElement>('[data-previous-online-version]');
      const next_online_version = iframe_document.querySelector<HTMLElement>('[data-next-online-version]');
      const toggle_panel_fullscreen = iframe_document.querySelector<HTMLElement>('[data-toggle-panel-fullscreen]');
      const save_online_code = iframe_document.querySelector<HTMLElement>('[data-save-online-code]');
      const cancel_online_code = iframe_document.querySelector<HTMLElement>('[data-cancel-online-code]');
      const online_code_editor = iframe_document.querySelector<HTMLTextAreaElement>('[data-online-code-editor]');
      const code_editor_panel = iframe_document.querySelector<HTMLElement>('[data-code-editor-panel]');
      const code_editor_title = iframe_document.querySelector<HTMLElement>('[data-code-editor-title]');
      const code_editor_hint = iframe_document.querySelector<HTMLElement>('[data-code-editor-hint]');
      const online_title_input = iframe_document.querySelector<HTMLInputElement>('[data-online-title-input]');
      const online_title_display = iframe_document.querySelector<HTMLElement>('[data-online-title-display]');
      const edit_online_title = iframe_document.querySelector<HTMLElement>('[data-edit-online-title]');
      const scroll_source_message = iframe_document.querySelector<HTMLElement>('[data-scroll-source-message]');
      const scroll_source_message_mobile = iframe_document.querySelector<HTMLElement>(
        '[data-scroll-source-message-mobile]',
      );
      const toggle_favorite = iframe_document.querySelector<HTMLElement>('[data-toggle-favorite]');
      const toolbar_more = iframe_document.querySelector<HTMLElement>('[data-toolbar-more]');
      const toolbar_menu = iframe_document.querySelector<HTMLElement>('[data-toolbar-menu]');
      const edit_choice_menu = iframe_document.querySelector<HTMLElement>('[data-edit-choice-menu]');
      const refresh_prompt_viewer = iframe_document.querySelector<HTMLElement>('[data-refresh-prompt-viewer]');
      const clear_run_log = iframe_document.querySelector<HTMLElement>('[data-clear-run-log]');
      const trigger_image_generation = iframe_document.querySelector<HTMLButtonElement>('[data-trigger-image-generation]');
      const clear_image_generation_log = iframe_document.querySelector<HTMLElement>('[data-clear-image-generation-log]');
      const monitor_stops = registerGenerationMonitor(iframe_document);
      let prompt_is_dirty = false;

      const set_prompt_dirty = (is_dirty: boolean) => {
        prompt_is_dirty = is_dirty;
        updateText(iframe_document, '[data-dirty-status]', is_dirty ? '[未保存]' : '');
      };

      const getLaunchEntryModesFromDom = (): SettingsLaunchEntryMode[] =>
        normalizeLaunchEntryModes(
          [...launch_entry_mode_inputs]
            .filter(input => input.checked)
            .map(input => input.dataset.launchEntryMode)
            .filter(Boolean),
        );

      const syncLaunchEntryModes = () => {
        const settings = getSettings();
        const launch_entry_modes = getLaunchEntryModesFromDom();
        const launch_entry_labels: Record<SettingsLaunchEntryMode, string> = {
          floating_ball: '悬浮球',
          qr_button: 'qr-button',
          extensions_menu: 'extensionsmenu',
        };
        saveSettings({
          ...settings,
          launch_entry_modes,
        });
        updateText(
          iframe_document,
          '[data-runtime-settings-detail]',
          `打开入口已更新：${launch_entry_modes.map(mode => launch_entry_labels[mode]).join('、') || '悬浮球'}。`,
        );
        sync_host_entry_buttons();
      };

      const syncGenerationRetrySettings = (show_detail = false) => {
        const settings = getSettings();
        const timeout_ms_value = generation_retry_timeout_ms?.value?.trim();
        const max_retries_value = generation_retry_count?.value?.trim();
        const generation_retry = normalizeGenerationRetrySettings({
          enabled: Boolean(generation_retry_enabled?.checked),
          timeout_ms: timeout_ms_value ? Number(timeout_ms_value) : undefined,
          max_retries: max_retries_value ? Number(max_retries_value) : undefined,
        });
        saveSettings({
          ...settings,
          generation_retry,
        });
        if (show_detail) {
          updateText(
            iframe_document,
            '[data-runtime-settings-detail]',
            generation_retry.enabled
              ? `已开启失败自动重试：超时 ${generation_retry.timeout_ms}ms，最多重试 ${generation_retry.max_retries} 次。`
              : '已关闭失败自动重试。',
          );
        }
        return generation_retry;
      };

      const saveExcludedSettings = (
        updates: Partial<Pick<SettingsState, 'excluded_character_names' | 'excluded_tags'>>,
        detail: string,
      ) => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          excluded_character_names:
            updates.excluded_character_names != null ? updates.excluded_character_names : settings.excluded_character_names,
          excluded_tags: updates.excluded_tags != null ? updates.excluded_tags : settings.excluded_tags,
        });
        renderPromptSettings(iframe_document);
        sync_host_entry_buttons();
        renderSourceJumpButtons();
        updateText(iframe_document, '[data-runtime-settings-detail]', detail);
      };

      const getImageGenerationSettings = () => getSettings().image_generation || getDefaultImageGenerationSettings();
      const getActiveImagePresetId = () => image_preset_select?.value || getImageGenerationSettings().active_preset_id;
      const getActiveVibeGroupId = () => vibe_group_select?.value || getImageGenerationSettings().active_vibe_group_id;
      const getAutoVibeGroupName = (references: SettingsImageGenerationVibeReference[], fallback = '默认 Vibe') => {
        const names = references.map(reference => reference.name.trim()).filter(Boolean);
        return names.length ? names.join('+') : fallback;
      };
      const readFileAsText = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || Error('文件读取失败。'));
          reader.readAsText(file);
        });
      const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || Error('图片读取失败。'));
          reader.readAsDataURL(file);
        });
      const readFileAsArrayBuffer = (file: File) =>
        new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error || Error('文件读取失败。'));
          reader.readAsArrayBuffer(file);
        });
      const parseImageMetadata = async (file: File) => {
        const buffer = await readFileAsArrayBuffer(file);
        const bytes = new Uint8Array(buffer);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const texts: string[] = [];
        const png_signature = [137, 80, 78, 71, 13, 10, 26, 10];
        const is_png = bytes.length >= 8 && png_signature.every((value, index) => bytes[index] === value);
        if (is_png) {
          const view = new DataView(buffer);
          let offset = 8;
          while (offset + 12 <= bytes.length) {
            const length = view.getUint32(offset);
            const type = decoder.decode(bytes.slice(offset + 4, offset + 8));
            const end = offset + 12 + length;
            if (end > bytes.length) break;
            if (type === 'tEXt' || type === 'iTXt') texts.push(decoder.decode(bytes.slice(offset + 8, offset + 8 + length)));
            offset = end;
            if (type === 'IEND') break;
          }
        }
        texts.push(decoder.decode(bytes));
        const cleanMetadataText = (value: unknown) => {
          let text = String(value || '').trim();
          for (let index = 0; index < 3; index += 1) {
            const decoded = text
              .replace(/\\r/g, '\r')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\u([0-9a-f]{4})/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)));
            if (decoded === text) break;
            text = decoded;
          }
          return text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
        };
type ParsedImageMetadata = { prompt: string; negative_prompt: string };

const extract = (value: unknown, depth = 0): ParsedImageMetadata => {
          if (depth > 8 || value == null || typeof value !== 'object') return { prompt: '', negative_prompt: '' };
          if (Array.isArray(value)) {
    return value.reduce<ParsedImageMetadata>((result, item) => {
              const next = extract(item, depth + 1);
              return { prompt: result.prompt || next.prompt, negative_prompt: result.negative_prompt || next.negative_prompt };
            }, { prompt: '', negative_prompt: '' });
          }
          const record = value as Record<string, unknown>;
          const own_prompt = cleanMetadataText(record.prompt || record.positive_prompt || record.positivePrompt || '');
          const own_negative_prompt = cleanMetadataText(record.uc || record.negative_prompt || record.negativePrompt || record.undesired_content || '');
  const nested = Object.values(record).reduce<ParsedImageMetadata>((result, item) => {
            const next = extract(item, depth + 1);
            return { prompt: result.prompt || next.prompt, negative_prompt: result.negative_prompt || next.negative_prompt };
          }, { prompt: '', negative_prompt: '' });
          return {
            prompt: own_prompt || nested.prompt,
            negative_prompt: own_negative_prompt || nested.negative_prompt,
          };
        };
        for (const text of texts) {
          const json_match = text.match(/\{[\s\S]{0,200000}\}/);
          for (const candidate of [text, json_match?.[0] || '']) {
            if (!candidate) continue;
            try {
              const result = extract(JSON.parse(candidate));
              if (result.prompt || result.negative_prompt) return result;
            } catch {
              const prompt = cleanMetadataText(candidate.match(/"(?:prompt|positive_prompt|positivePrompt)"\s*:\s*"((?:\\.|[^"\\])*)"/i)?.[1] || '');
              const negative_prompt = cleanMetadataText(candidate.match(/"(?:uc|negative_prompt|negativePrompt|undesired_content)"\s*:\s*"((?:\\.|[^"\\])*)"/i)?.[1] || '');
              if (prompt || negative_prompt) return { prompt, negative_prompt };
            }
          }
        }
        return { prompt: '', negative_prompt: '' };
      };
      const findVibeImageData = (value: unknown, depth = 0): string => {
        if (depth > 4 || value == null) return '';
        if (typeof value === 'string') {
          const source = value.trim();
          return /^(data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,|https?:\/\/|blob:)/i.test(source)
            ? source
            : '';
        }
        if (Array.isArray(value)) {
          return value.map(item => findVibeImageData(item, depth + 1)).find(Boolean) || '';
        }
        if (typeof value === 'object') {
          const record = value as Record<string, unknown>;
          for (const key of ['image', 'image_data', 'preview', 'thumbnail', 'preview_image']) {
            const image = findVibeImageData(record[key], depth + 1);
            if (image) return image;
          }
        }
        return '';
      };

      const getImagePresetFromDom = (base?: SettingsImageGenerationPreset) =>
        normalizeImageGenerationPreset({
          ...(base || getDefaultImageGenerationPreset()),
          id: base?.id || getActiveImagePresetId(),
          name: base?.name || 'NovelAI 默认',
          connection_mode: image_connection_mode?.value as SettingsImageGenerationConnectionMode,
          endpoint: image_endpoint?.value?.trim() || '',
          api_key: image_api_key?.value || '',
          positive_prompt: image_positive_prompt?.value || '',
          negative_prompt: image_negative_prompt?.value || '',
          model: image_model?.value?.trim() || '',
          sampler: image_sampler?.value || '',
          noise_schedule: image_noise_schedule?.value || '',
    prompt_guidance: image_guidance?.value ? Number(image_guidance.value) : undefined,
    prompt_guidance_rescale: image_guidance_rescale?.value ? Number(image_guidance_rescale.value) : undefined,
          size_preset: image_size_preset?.value || base?.size_preset,
    steps: image_steps?.value ? Number(image_steps.value) : undefined,
    seed: image_seed?.value ? Number(image_seed.value) : undefined,
          ai_default_character_position: Boolean(image_ai_default_character_position?.checked),
          smea: Boolean(image_smea?.checked),
          smea_dyn: Boolean(image_smea_dyn?.checked),
          variety: Boolean(image_variety?.checked),
          decrisp: Boolean(image_decrisp?.checked),
        });

      const saveImageGenerationState = (
        image_generation: SettingsImageGeneration,
        detail = '生图设置已保存。',
        rerender = true,
      ) => {
        const previous_image_generation = normalizeImageGenerationSettings(getSettings().image_generation);
        const previous_strengths = new Map<string, number>(
          [...previous_image_generation.vibe_library, ...previous_image_generation.vibe_groups.flatMap(group => group.references)]
            .map(reference => [reference.id, reference.strength]),
        );
        const preserveVibeStrength = (reference: SettingsImageGenerationVibeReference) => {
          const previous_strength = previous_strengths.get(reference.id);
          return previous_strength !== undefined && reference.strength === 0.6 && previous_strength !== 0.6
            ? { ...reference, strength: previous_strength }
            : reference;
        };
        const preserved_image_generation = {
          ...image_generation,
          vibe_library: image_generation.vibe_library.map(preserveVibeStrength),
          vibe_groups: image_generation.vibe_groups.map(group => ({
            ...group,
            references: group.references.map(preserveVibeStrength),
          })),
        } as SettingsImageGeneration;
        const next_settings = saveSettings({
          ...getSettings(),
          image_generation: normalizeImageGenerationSettings(preserved_image_generation),
        });
        if (rerender) {
          renderPromptSettings(iframe_document);
        }
        updateText(iframe_document, '[data-image-generation-detail]', detail);
        return next_settings.image_generation;
      };

const syncImageGenerationSettings = (show_detail = false) => {
  const image_generation = getImageGenerationSettings();
        const active_preset_id = getActiveImagePresetId();
        const active_preset =
          image_generation.presets.find(preset => preset.id === active_preset_id) || image_generation.presets[0];
        const next_presets = image_generation.presets.map(preset =>
          preset.id === active_preset.id ? getImagePresetFromDom(active_preset) : preset,
        );
        const active_vibe_group_id = getActiveVibeGroupId();
        const next_vibe_groups = image_generation.vibe_groups;
        const next_image_generation = normalizeImageGenerationSettings({
          ...image_generation,
          enabled: Boolean(image_generation_enabled?.checked),
          mode: (image_generation_mode?.value || image_generation.mode) as SettingsImageGenerationMode,
          active_preset_id: active_preset.id,
          presets: next_presets,
          active_vibe_group_id,
          vibe_groups: next_vibe_groups,
        });
        saveImageGenerationState(next_image_generation, show_detail ? '生图设置已更新。' : '生图设置已保存。', false);
        if (show_detail) {
          updateText(
            iframe_document,
            '[data-image-generation-detail]',
            next_image_generation.enabled
              ? '生图设置已更新，并会在后续请求中注入生图思考。'
              : '生图思考注入已关闭。',
          );
        }
        return normalizeImageGenerationSettings(getSettings().image_generation);
      };

      const getAvailableCharacterNames = () => {
        const context = getSillyTavernContext() as
          | { characters?: Array<{ name?: unknown; data?: { name?: unknown } | null }> }
          | null;
        const characters = Array.isArray(context?.characters) ? context.characters : [];
        const names = [
          '{{char}}',
          ...characters
            .map(character => String(character?.name || character?.data?.name || '').trim())
            .filter(Boolean),
        ];
        return [...new Set(names)].sort((left, right) => {
          if (left === '{{char}}') return -1;
          if (right === '{{char}}') return 1;
          return left.localeCompare(right, 'zh-CN');
        });
      };

      const getSecondaryApiProfiles = () => getSettings().secondary_api_profiles || [];
      const getActiveSecondaryApiProfileId = () =>
        secondary_api_profile_select?.value || getSettings().active_secondary_api_profile_id;
      const getActiveSecondaryApiProfile = () =>
        getSecondaryApiProfiles().find(profile => profile.id === getActiveSecondaryApiProfileId()) ||
        getSecondaryApiProfiles()[0] ||
        null;

      const saveSecondaryApiProfileState = (
        profiles: SettingsSecondaryApiProfile[],
        active_profile_id: string,
        options: {
          detail?: string;
          toast?: string;
          rerender?: boolean;
        } = {},
      ) => {
        const fallback_profile = profiles.find(profile => profile.id === active_profile_id) || profiles[0] || null;
        if (!fallback_profile) {
          return getSettings();
        }
        const next_settings = saveSettings({
          ...getSettings(),
          secondary_api_profiles: profiles,
          active_secondary_api_profile_id: fallback_profile.id,
          secondary_api: fallback_profile.config,
        });
        if (options.rerender !== false) {
          renderPromptSettings(iframe_document);
        }
        if (options.detail) {
          updateText(iframe_document, '[data-runtime-settings-detail]', options.detail);
        }
        if (options.toast) {
          showInlineToast(iframe_document, options.toast);
        }
        return next_settings;
      };

      const update_publish_button_states = () => {
        const settings = getSettings();
        const active_prompt_id = prompt_select?.value || settings.active_prompt_id;
        const active_base_prompt_id = base_prompt_select?.value || settings.active_base_prompt_id;
        const active_detail_prompt_id = detail_prompt_select?.value || settings.active_detail_prompt_id;
        const active_summary_tag_id = summary_tag_select?.value || settings.active_summary_tag_id;
        if (toggle_publish_prompt) {
          const is_published = getPublishedPromptPresets().some(prompt => prompt.id === active_prompt_id);
          toggle_publish_prompt.title = is_published ? '取消发布此预设' : '发布此预设';
          toggle_publish_prompt.setAttribute('aria-label', toggle_publish_prompt.title);
          toggle_publish_prompt.classList.toggle('is-active', is_published);
        }
        if (toggle_publish_base_prompt) {
          const is_published = getPublishedBasePromptItems().some(prompt => prompt.id === active_base_prompt_id);
          toggle_publish_base_prompt.title = is_published ? '取消发布基础提示词' : '发布基础提示词';
          toggle_publish_base_prompt.setAttribute('aria-label', toggle_publish_base_prompt.title);
          toggle_publish_base_prompt.classList.toggle('is-active', is_published);
        }
        if (toggle_publish_detail_prompt) {
          const is_published = getPublishedDetailPromptItems().some(prompt => prompt.id === active_detail_prompt_id);
          toggle_publish_detail_prompt.title = is_published ? '取消发布小剧场' : '发布小剧场';
          toggle_publish_detail_prompt.setAttribute('aria-label', toggle_publish_detail_prompt.title);
          toggle_publish_detail_prompt.classList.toggle('is-active', is_published);
        }
        if (toggle_publish_summary_tag) {
          const is_published = getPublishedSummaryTagPresets().some(tag => tag.id === active_summary_tag_id);
          toggle_publish_summary_tag.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>';
          toggle_publish_summary_tag.title = is_published ? '取消发布摘要标签' : '发布摘要标签';
          toggle_publish_summary_tag.setAttribute('aria-label', toggle_publish_summary_tag.title);
          toggle_publish_summary_tag.classList.toggle('is-active', is_published);
        }
      };

      const set_template_edit_mode = (type: PromptTemplateType, is_editing: boolean) => {
        const name_input = type === 'base' ? base_prompt_name : detail_prompt_name;
        const detail_name_display = type === 'detail' ? detail_prompt_name_display : null;
        const detail_description_input = type === 'detail' ? detail_prompt_description : null;
        const content_input = type === 'base' ? base_prompt_content : detail_prompt_content;
        const edit_button = type === 'base' ? edit_base_prompt : edit_detail_prompt;
        const actions = iframe_document.querySelector<HTMLElement>(
          type === 'base' ? '[data-base-prompt-actions]' : '[data-detail-prompt-actions]',
        );
        if (is_editing) {
          if (type === 'base') {
            name_input?.removeAttribute('hidden');
          } else {
            detail_name_display?.removeAttribute('readonly');
            detail_description_input?.removeAttribute('readonly');
          }
          content_input?.removeAttribute('readonly');
          actions?.removeAttribute('hidden');
          edit_button?.setAttribute('hidden', '');
          (type === 'base' ? name_input : detail_name_display)?.focus();
          return;
        }
        if (type === 'base') {
          name_input?.setAttribute('hidden', '');
        } else {
          detail_name_display?.setAttribute('readonly', '');
          detail_description_input?.setAttribute('readonly', '');
        }
        content_input?.setAttribute('readonly', '');
        actions?.setAttribute('hidden', '');
        edit_button?.removeAttribute('hidden');
      };

      const get_detail_library_selected_ids = () =>
        new Set(
          String(detail_library_root?.dataset.selectedPromptIds || '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean),
        );

      const set_detail_library_selected_ids = (ids: Iterable<string>) => {
        if (detail_library_root) {
          detail_library_root.dataset.selectedPromptIds = [...new Set([...ids].filter(Boolean))].join(',');
        }
      };

      const get_detail_library_checked_ids = () =>
        new Set(
          [...iframe_document.querySelectorAll<HTMLInputElement>('[data-detail-manager-select-prompt]:checked')]
            .map(input => String(input.dataset.detailManagerSelectPrompt || ''))
            .filter(Boolean),
        );

      const get_detail_manager_filters = () => ({
        search: String(detail_library_root?.dataset.search || '').trim(),
        sort: String(detail_library_root?.dataset.sort || 'created_desc'),
        source: String(detail_library_root?.dataset.sourceFilter || 'all'),
        active: String(detail_library_root?.dataset.activeFilter || 'all'),
        tag: String(detail_library_root?.dataset.tagFilter || 'all'),
      });

      const set_detail_manager_filters = (
        next_filters: Partial<{ search: string; sort: string; source: string; active: string; tag: string }>,
      ) => {
        if (!detail_library_root) {
          return;
        }
        const current_filters = get_detail_manager_filters();
        detail_library_root.dataset.search = String(next_filters.search ?? current_filters.search ?? '');
        detail_library_root.dataset.sort = String(next_filters.sort ?? current_filters.sort ?? 'created_desc');
        detail_library_root.dataset.sourceFilter = String(next_filters.source ?? current_filters.source ?? 'all');
        detail_library_root.dataset.activeFilter = String(next_filters.active ?? current_filters.active ?? 'all');
        detail_library_root.dataset.tagFilter = String(next_filters.tag ?? current_filters.tag ?? 'all');
      };

      const parse_detail_tags = (value: string) => [
        ...new Set(
          value
            .split(/[\n，,]+/)
            .map(tag => tag.trim())
            .filter(Boolean),
        ),
      ];

      const slugify_file_label = (value: string) =>
        String(value || '')
          .replace(/\.[^.]+$/, '')
          .replace(/^[\s._-]+|[\s._-]+$/g, '')
          .trim() || '导入小剧场';

      const read_file_text = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || Error('读取文件失败。'));
          reader.readAsText(file);
        });

      const build_detail_text_template = () =>
        [
          '# 小剧场标题',
          '描述: 这里填写一句描述',
          '标签: 日常, 氛围',
          '---',
          '这里填写小剧场提示词正文。',
          '===',
          '# 第二个小剧场',
          '描述: 可留空',
          '标签: ',
          '---',
          '这里继续填写正文。',
        ].join('\n');

      const parse_detail_text_entries = (text: string) => {
        const sections = text
          .split(/\n={3,}\n/g)
          .map(section => section.trim())
          .filter(Boolean);
        const entries: DetailImportCandidate[] = [];
        sections.forEach(section => {
          const lines = section.split(/\r?\n/);
          let name = '';
          let description = '';
          let tags: string[] = [];
          let body_start = 0;
          for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index].trim();
            if (!line && !name && !description && !tags.length) {
              continue;
            }
            if (!name && /^#\s+/.test(line)) {
              name = line.replace(/^#\s+/, '').trim();
              body_start = index + 1;
              continue;
            }
            if (/^标题[:：]/.test(line)) {
              name = line.replace(/^标题[:：]/, '').trim();
              body_start = index + 1;
              continue;
            }
            if (/^描述[:：]/.test(line)) {
              description = line.replace(/^描述[:：]/, '').trim();
              body_start = index + 1;
              continue;
            }
            if (/^标签[:：]/.test(line)) {
              tags = parse_detail_tags(line.replace(/^标签[:：]/, '').trim());
              body_start = index + 1;
              continue;
            }
            if (line === '---') {
              body_start = index + 1;
              break;
            }
          }
          const content = lines.slice(body_start).join('\n').trim();
          if (!name && !content) {
            return;
          }
          entries.push({
            id: createPromptId(),
            name: name || `导入小剧场 ${entries.length + 1}`,
            description,
            content,
            tags,
          });
        });
        return entries;
      };

      const parse_detail_import_json = (payload: ImportPromptPayload) => {
        const detail_items = Array.isArray(payload)
          ? payload
          : payload?.个性化 || payload?.detail || payload?.detail_prompts || [];
        if (!Array.isArray(detail_items)) {
          throw Error('JSON 中没有找到可导入的小剧场列表。');
        }
        return detail_items
          .filter(item => item && typeof item === 'object')
          .map((item, index) => {
            const source = item as Record<string, unknown>;
            return {
              id: createPromptId(),
              name: String(source.name || `导入小剧场 ${index + 1}`),
              description: String(source.description || ''),
              content: String(source.content || ''),
              tags: Array.isArray(source.tags) ? source.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
            } satisfies DetailImportCandidate;
          })
          .filter(item => item.content.trim() || item.name.trim());
      };

      const parse_worldbook_entries = (payload: ImportPromptPayload) => {
        const entries_object =
          payload?.entries && typeof payload.entries === 'object' ? (payload.entries as Record<string, unknown>) : null;
        if (!entries_object) {
          throw Error('世界书格式不正确：没有找到 entries。');
        }
        return Object.values(entries_object)
          .filter(entry => entry && typeof entry === 'object')
          .map((entry, index) => {
            const source = entry as Record<string, unknown>;
            return {
              id: createPromptId(),
              name: String(source.comment || source.title || `条目 ${index + 1}`).trim() || `条目 ${index + 1}`,
              description: '',
              content: String(source.content || ''),
              tags: [],
            } satisfies DetailImportCandidate;
          })
          .filter(item => item.content.trim());
      };

      const sync_detail_edit_tags_input = (next_tags: string[]) => {
        if (!detail_edit_tags) {
          return;
        }
        const normalized_tags = [...new Set(next_tags.map(tag => tag.trim()).filter(Boolean))];
        detail_edit_tags.value = normalized_tags.join(', ');
        detail_edit_tag_suggestions?.querySelectorAll<HTMLElement>('[data-detail-edit-tag-preset]').forEach(element => {
          element.classList.toggle(
            'is-active',
            normalized_tags.includes(String(element.dataset.detailEditTagPreset || '')),
          );
        });
      };

      const append_detail_edit_tags = (tags: string[]) => {
        const merged_tags = [...new Set([...parse_detail_tags(String(detail_edit_tags?.value || '')), ...tags])];
        sync_detail_edit_tags_input(merged_tags);
      };

      const is_dom_element = (value: unknown): value is Element =>
        value != null && typeof value === 'object' && 'nodeType' in value && Number((value as Node).nodeType) === 1;

      const is_dom_node = (value: unknown): value is Node =>
        value != null && typeof value === 'object' && 'nodeType' in value;

      const find_event_path_element = (event: Event, selector: string): HTMLElement | null => {
        const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
        for (const item of path) {
          if (is_dom_element(item) && typeof item.matches === 'function' && item.matches(selector)) {
            return item as HTMLElement;
          }
        }
        const raw_target = event.target;
        if (is_dom_element(raw_target)) {
          return raw_target.closest<HTMLElement>(selector);
        }
        if (is_dom_node(raw_target) && raw_target.parentElement) {
          return raw_target.parentElement.closest<HTMLElement>(selector);
        }
        return null;
      };

      const switch_detail_library_folder = (folder_id: string, options: { detail?: string } = {}) => {
        if (!detail_library_root) {
          console.info('[LoreFrame] 切换小剧场文件夹失败: detail_library_root 不存在', folder_id);
          return;
        }
        console.info('[LoreFrame] switch_detail_library_folder 调用', {
          requested_folder_id: folder_id,
          previous_folder_id: detail_library_root.dataset.folderId || '',
          previous_selected_prompt_id: detail_library_root.dataset.selectedPromptId || '',
          options,
        });
        detail_library_root.dataset.folderId = folder_id || '';
        detail_library_root.dataset.selectedPromptId = '';
        detail_library_root.dataset.selectedPromptIds = '';
        renderPromptSettings(iframe_document);
        console.info('[LoreFrame] switch_detail_library_folder 完成', {
          current_folder_id: detail_library_root.dataset.folderId || '',
          current_selected_prompt_id: detail_library_root.dataset.selectedPromptId || '',
        });
        if (options.detail) {
          updateText(iframe_document, '[data-prompt-settings-detail]', options.detail);
        }
      };

      const open_detail_prompt_editor_view = (prompt_id: string) => {
        const settings = getSettings();
        const prompt = settings.detail_prompts.find(item => item.id === prompt_id);
        console.info('[LoreFrame] 打开小剧场编辑页', prompt_id, prompt?.name || 'not-found');
        if (!prompt || !detail_library_root) {
          showInlineToast(iframe_document, '没有找到要编辑的小剧场。');
          return;
        }
        detail_library_root.dataset.editPromptId = prompt.id;
        detail_library_root.dataset.selectedPromptId = prompt.id;
        detail_library_root.dataset.folderId = prompt.folder_id || detail_library_root.dataset.folderId || '';
        handle_view_switch('theater-edit');
        const theater_edit_panel = iframe_document.querySelector<HTMLElement>('[data-view="theater-edit"]');
        console.info(
          '[LoreFrame] theater-edit 切换结果',
          JSON.stringify({
            hidden: theater_edit_panel?.hidden,
            activeView: active_view,
            editPromptId: detail_library_root.dataset.editPromptId || '',
          }),
        );
        showInlineToast(iframe_document, `正在打开小剧场：${prompt.name}`);
      };

      const delete_detail_prompt_item = async (prompt_id: string) => {
        if (!prompt_id) {
          return;
        }
        const settings = getSettings();
        const target_prompt = settings.detail_prompts.find(prompt => prompt.id === prompt_id);
        if (!target_prompt) {
          showInlineToast(iframe_document, '没有找到要删除的小剧场。');
          return;
        }
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'danger',
          title: '删除小剧场',
          message: `你确认要删除“${target_prompt.name}”吗？此操作不可撤销。`,
          confirmText: '删除',
        });
        if (!confirmed) {
          return;
        }
        if (target_prompt.source === 'default') {
          const next_deleted_ids = [...new Set([...(settings.deleted_builtin_detail_prompt_ids || []), prompt_id])];
          saveSettings({
            ...settings,
            deleted_builtin_detail_prompt_ids: next_deleted_ids,
            random_detail_prompt: {
              ...(settings.random_detail_prompt || {}),
              prompt_ids: (settings.random_detail_prompt?.prompt_ids || []).filter(id => id !== prompt_id),
            },
          });
          if (detail_library_root?.dataset.selectedPromptId === prompt_id) {
            const next_prompts = settings.detail_prompts.filter(prompt => prompt.id !== prompt_id);
            detail_library_root.dataset.selectedPromptId = next_prompts[0]?.id || '';
          }
          renderPromptSettings(iframe_document);
          showInlineToast(iframe_document, '已删除内置小剧场。');
          return;
        }
        const next_prompts = settings.detail_prompts.filter(prompt => prompt.id !== prompt_id);
        saveSettings({
          ...settings,
          detail_prompts: next_prompts,
          active_detail_prompt_id:
            settings.active_detail_prompt_id === prompt_id
              ? next_prompts[0]?.id || settings.active_detail_prompt_id
              : settings.active_detail_prompt_id,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            prompt_ids: (settings.random_detail_prompt?.prompt_ids || []).filter(id => id !== prompt_id),
          },
        });
        if (detail_library_root?.dataset.selectedPromptId === prompt_id) {
          detail_library_root.dataset.selectedPromptId = next_prompts[0]?.id || '';
        }
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '已删除小剧场。');
      };

      const show_quick_create_theater_dialog = () => {
        return new Promise<{
          name: string;
          description: string;
          content: string;
          tags: string[];
          folderId: string;
          newFolderName: string;
          oneTime: boolean;
        } | null>(resolve => {
          iframe_document.querySelectorAll('.confirm-backdrop').forEach(element => element.remove());
          const settings = getSettings();
          const folder_options = settings.detail_prompt_folders
            .map(folder => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`)
            .join('');
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog detail-import-dialog" role="dialog" aria-modal="true">' +
            '<div class="detail-import-dialog__hero">' +
            '<div class="detail-import-dialog__hero-copy">' +
            '<h3>快速新建小剧场</h3>' +
            '<p>可以直接补充标题、描述、标签和正文；勾选一次性使用后，将立即仅本次发送给 AI，不保存到小剧场管理。</p>' +
            '</div>' +
            '<label class="checkbox-row"><input type="checkbox" data-quick-theater-one-time /><span>一次性使用</span></label>' +
            '</div>' +
            '<div class="detail-import-dialog__body">' +
            '<div class="field"><label>标题</label><input class="input" type="text" data-quick-theater-name placeholder="新的小剧场" /></div>' +
            '<div class="field"><label>描述</label><input class="input" type="text" data-quick-theater-description placeholder="可留空" /></div>' +
            '<div class="field"><label>标签</label><input class="input" type="text" data-quick-theater-tags placeholder="使用逗号分隔多个标签" /></div>' +
            '<div class="appearance-theme-schedule">' +
            `<div class="field"><label>所属文件夹</label><select class="select" data-quick-theater-folder>${folder_options}</select></div>` +
            '<div class="field"><label>或新建文件夹</label><input class="input" type="text" data-quick-theater-new-folder placeholder="留空则使用左侧选择" /></div>' +
            '</div>' +
            '<div class="field"><label>详情</label><textarea class="textarea" rows="12" data-quick-theater-content placeholder="输入小剧场提示词正文"></textarea></div>' +
            '</div>' +
            '<div class="button-row">' +
            '<button class="plain-button" type="button" data-quick-theater-cancel>取消</button>' +
            '<button class="plain-button danger-button is-warning" type="button" data-quick-theater-confirm>确认</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const close = (
            value: {
              name: string;
              description: string;
              content: string;
              tags: string[];
              folderId: string;
              newFolderName: string;
              oneTime: boolean;
            } | null,
          ) => {
            backdrop.remove();
            resolve(value);
          };
          backdrop
            .querySelector<HTMLElement>('[data-quick-theater-cancel]')
            ?.addEventListener('click', () => close(null));
          backdrop.querySelector<HTMLElement>('[data-quick-theater-confirm]')?.addEventListener('click', () => {
            const name = String(
              backdrop.querySelector<HTMLInputElement>('[data-quick-theater-name]')?.value || '',
            ).trim();
            const content = String(
              backdrop.querySelector<HTMLTextAreaElement>('[data-quick-theater-content]')?.value || '',
            ).trim();
            if (!name) {
              showInlineToast(iframe_document, '请先填写小剧场标题。');
              return;
            }
            if (!content) {
              showInlineToast(iframe_document, '请先填写小剧场详情。');
              return;
            }
            close({
              name,
              description: String(
                backdrop.querySelector<HTMLInputElement>('[data-quick-theater-description]')?.value || '',
              ),
              content,
              tags: parse_detail_tags(
                String(backdrop.querySelector<HTMLInputElement>('[data-quick-theater-tags]')?.value || ''),
              ),
              folderId: String(backdrop.querySelector<HTMLSelectElement>('[data-quick-theater-folder]')?.value || ''),
              newFolderName: String(
                backdrop.querySelector<HTMLInputElement>('[data-quick-theater-new-folder]')?.value || '',
              ).trim(),
              oneTime: Boolean(backdrop.querySelector<HTMLInputElement>('[data-quick-theater-one-time]')?.checked),
            });
          });
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close(null);
            }
          });
        });
      };

      const show_delete_folder_mode_dialog = (
        current_folder_name: string,
        fallback_folder_name: string | null,
        prompt_count: number,
      ) => {
        return new Promise<'move' | 'delete_all' | null>(resolve => {
          iframe_document.querySelectorAll('.confirm-backdrop').forEach(element => element.remove());
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog is-warning" role="dialog" aria-modal="true">' +
            '<h3>删除文件夹</h3>' +
            `<p>你正在删除“${escapeHtml(current_folder_name)}”。当前文件夹内共有 ${prompt_count} 个小剧场。</p>` +
            (fallback_folder_name
              ? `<p>你可以只删除文件夹，并把内容迁移到“${escapeHtml(fallback_folder_name)}”；也可以连同文件夹里的内容一起删除。</p>`
              : '<p>当前只剩最后一个文件夹，因此不能迁移内容。你可以删除文件夹和其中内容，系统会自动保留一个新的空文件夹。</p>') +
            '<div class="button-row" style="margin-top: 6px;">' +
            (fallback_folder_name
              ? '<button class="plain-button" type="button" data-folder-delete-mode="move">删除文件夹，保留内容</button>'
              : '') +
            '<button class="plain-button danger-button is-danger" type="button" data-folder-delete-mode="delete_all">删除文件夹和内容</button>' +
            '<button class="plain-button" type="button" data-folder-delete-cancel>取消</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const close = (value: 'move' | 'delete_all' | null) => {
            backdrop.remove();
            resolve(value);
          };
          backdrop.querySelectorAll<HTMLElement>('[data-folder-delete-mode]').forEach(button => {
            button.addEventListener('click', () => close(button.dataset.folderDeleteMode as 'move' | 'delete_all'));
          });
          backdrop
            .querySelector<HTMLElement>('[data-folder-delete-cancel]')
            ?.addEventListener('click', () => close(null));
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close(null);
            }
          });
        });
      };

      const show_detail_folder_select_dialog = (exclude_folder_id?: string, title = '选择目标文件夹') => {
        return new Promise<string | null>(resolve => {
          const settings = getSettings();
          iframe_document.querySelectorAll('.confirm-backdrop').forEach(element => element.remove());
          const folder_options = settings.detail_prompt_folders
            .filter(folder => folder.id !== exclude_folder_id)
            .map(
              folder =>
                '<label class="random-prompt-option">' +
                `<input type="radio" name="detail-folder-select" value="${escapeHtml(folder.id)}" />` +
                `<span>${escapeHtml(folder.name)}</span>` +
                '</label>',
            )
            .join('');
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog" role="dialog" aria-modal="true">' +
            `<h3>${escapeHtml(title)}</h3>` +
            `<div class="random-prompt-list" style="max-height:260px;">${folder_options || '<p class="settings-card__note">没有可用的文件夹。</p>'}</div>` +
            '<div class="button-row" style="margin-top:12px;">' +
            '<button class="plain-button" type="button" data-detail-folder-select-confirm>确定</button>' +
            '<button class="plain-button" type="button" data-detail-folder-select-cancel>取消</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const close = (value: string | null) => {
            backdrop.remove();
            resolve(value);
          };
          backdrop.querySelector<HTMLElement>('[data-detail-folder-select-confirm]')?.addEventListener('click', () => {
            const selected = backdrop.querySelector<HTMLInputElement>('input[name="detail-folder-select"]:checked');
            close(selected?.value || null);
          });
          backdrop
            .querySelector<HTMLElement>('[data-detail-folder-select-cancel]')
            ?.addEventListener('click', () => close(null));
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close(null);
            }
          });
        });
      };

      const show_detail_folder_sort_dialog = () => {
        return new Promise<SettingsPromptFolder[] | null>(resolve => {
          const settings = getSettings();
          iframe_document.querySelectorAll('.confirm-backdrop').forEach(element => element.remove());
          let current_folders = [...settings.detail_prompt_folders];
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog detail-folder-sort-dialog" role="dialog" aria-modal="true">' +
            '<h3>排序文件夹</h3>' +
            '<p class="settings-card__note">使用上下按钮调整文件夹显示顺序。</p>' +
            '<div class="detail-folder-sort-list" data-detail-folder-sort-list></div>' +
            '<div class="button-row" style="margin-top:12px;">' +
            '<button class="plain-button" type="button" data-detail-folder-sort-save>保存</button>' +
            '<button class="plain-button" type="button" data-detail-folder-sort-cancel>取消</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const list = backdrop.querySelector<HTMLElement>('[data-detail-folder-sort-list]');
          const render_list = () => {
            if (!list) {
              return;
            }
            list.innerHTML = current_folders
              .map(
                (folder, index) =>
                  '<div class="detail-folder-sort-item" data-sort-index="' +
                  index +
                  '">' +
                  '<span>' +
                  escapeHtml(folder.name) +
                  '</span>' +
                  '<div class="detail-folder-sort-actions">' +
                  '<button class="icon-button" type="button" data-sort-move="up" ' +
                  (index === 0 ? 'disabled' : '') +
                  ' aria-label="上移" title="上移"><i class="fa-solid fa-chevron-up" aria-hidden="true"></i></button>' +
                  '<button class="icon-button" type="button" data-sort-move="down" ' +
                  (index === current_folders.length - 1 ? 'disabled' : '') +
                  ' aria-label="下移" title="下移"><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button>' +
                  '</div>' +
                  '</div>',
              )
              .join('');
          };
          const close = (value: SettingsPromptFolder[] | null) => {
            backdrop.remove();
            resolve(value);
          };
          list?.addEventListener('click', event => {
            const target = event.target;
            if (!is_dom_element(target)) {
              return;
            }
            const button = target.closest<HTMLElement>('[data-sort-move]');
            if (!button) {
              return;
            }
            const index_item = button.closest<HTMLElement>('[data-sort-index]');
            const index = Number(index_item?.dataset.sortIndex);
            if (Number.isNaN(index)) {
              return;
            }
            const direction = button.dataset.sortMove;
            const swap_index = direction === 'up' ? index - 1 : index + 1;
            if (swap_index < 0 || swap_index >= current_folders.length) {
              return;
            }
            const next_folders = [...current_folders];
            [next_folders[index], next_folders[swap_index]] = [next_folders[swap_index], next_folders[index]];
            current_folders = next_folders;
            render_list();
          });
          render_list();
          backdrop
            .querySelector<HTMLElement>('[data-detail-folder-sort-save]')
            ?.addEventListener('click', () => close(current_folders));
          backdrop
            .querySelector<HTMLElement>('[data-detail-folder-sort-cancel]')
            ?.addEventListener('click', () => close(null));
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close(null);
            }
          });
        });
      };

      const get_builtin_detail_prompt_ids = () => {
        const default_settings = getDefaultSettings();
        return default_settings.detail_prompts.map(prompt => prompt.id);
      };

      const restore_builtin_detail_prompts_handler = async () => {
        const settings = getSettings();
        const builtin_ids = get_builtin_detail_prompt_ids();
        if (!builtin_ids.length) {
          showInlineToast(iframe_document, '没有可恢复的内置小剧场。');
          return;
        }
        const builtin_folder_name = '内置小剧场';
        let builtin_folder = settings.detail_prompt_folders.find(folder => folder.name === builtin_folder_name);
        let next_folders = settings.detail_prompt_folders;
        if (!builtin_folder) {
          builtin_folder = { id: createPromptId(), name: builtin_folder_name };
          next_folders = [...settings.detail_prompt_folders, builtin_folder];
        }
        const next_deleted_ids = (settings.deleted_builtin_detail_prompt_ids || []).filter(
          id => !builtin_ids.includes(id),
        );
        saveSettings({
          ...settings,
          detail_prompt_folders: next_folders,
          deleted_builtin_detail_prompt_ids: next_deleted_ids,
          builtin_detail_prompt_folder_id: builtin_folder.id,
        });
        switch_detail_library_folder(builtin_folder.id);
        showInlineToast(iframe_document, `已恢复 ${builtin_ids.length} 个内置小剧场到“${builtin_folder_name}”。`);
      };

      const show_detail_tag_manager_dialog = () => {
        return new Promise<void>(resolve => {
          const settings = getSettings();
          iframe_document.querySelectorAll<HTMLElement>('.confirm-backdrop').forEach(element => element.remove());
          const tag_items = (settings.detail_prompt_tags || []).map(tag => {
            const count = settings.detail_prompts.filter(prompt => (prompt.tags || []).includes(tag)).length;
            return (
              '<label class="random-prompt-option">' +
              `<input type="checkbox" data-detail-tag-item="${escapeHtml(tag)}" />` +
              `<span>${escapeHtml(tag)} (${count})</span>` +
              '</label>'
            );
          });
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog detail-tag-manager-dialog" role="dialog" aria-modal="true">' +
            '<h3>标签管理</h3>' +
            '<div class="field">' +
            '<label>新建标签</label>' +
            '<input class="input" type="text" data-detail-tag-new placeholder="输入新标签名称" />' +
            '</div>' +
            '<div class="field">' +
            '<label>已有标签</label>' +
            `<div class="random-prompt-list" style="max-height:240px;">${tag_items.join('') || '<p class="settings-card__note">还没有标签。</p>'}</div>` +
            '</div>' +
            '<div class="button-row" style="margin-top:12px;">' +
            '<button class="plain-button" type="button" data-detail-tag-create>新建标签</button>' +
            '<button class="plain-button" type="button" data-detail-tag-delete>删除所选</button>' +
            '<button class="plain-button" type="button" data-detail-tag-close>关闭</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const new_input = backdrop.querySelector<HTMLInputElement>('[data-detail-tag-new]');
          const close = () => {
            backdrop.remove();
            resolve();
          };
          backdrop.querySelector<HTMLElement>('[data-detail-tag-create]')?.addEventListener('click', () => {
            const latest_settings = getSettings();
            const name = new_input?.value?.trim() || '';
            if (!name) {
              showInlineToast(iframe_document, '请输入标签名称。');
              return;
            }
            saveSettings({
              ...latest_settings,
              detail_prompt_tags: [...new Set([...(latest_settings.detail_prompt_tags || []), name])],
            });
            renderPromptSettings(iframe_document);
            close();
            showInlineToast(iframe_document, '已新建标签。');
          });
          backdrop.querySelector<HTMLElement>('[data-detail-tag-delete]')?.addEventListener('click', async () => {
            const selected_tags = [...backdrop.querySelectorAll<HTMLInputElement>('[data-detail-tag-item]:checked')]
              .map(input => input.dataset.detailTagItem)
              .filter((value): value is string => Boolean(value));
            if (!selected_tags.length) {
              showInlineToast(iframe_document, '请先选择要删除的标签。');
              return;
            }
            const confirmed = await showConfirmDialog(iframe_document, {
              tone: 'warning',
              title: '删除标签',
              message: `你确认要删除这 ${selected_tags.length} 个标签吗？\n\n相关小剧场会同步移除这些标签。`,
              confirmText: '删除',
            });
            if (!confirmed) {
              return;
            }
            const latest_settings = getSettings();
            saveSettings({
              ...latest_settings,
              detail_prompt_tags: (latest_settings.detail_prompt_tags || []).filter(
                tag => !selected_tags.includes(tag),
              ),
              detail_prompts: latest_settings.detail_prompts.map(prompt => ({
                ...prompt,
                tags: (prompt.tags || []).filter(tag => !selected_tags.includes(tag)),
              })),
            });
            set_detail_manager_filters({ tag: 'all' });
            renderPromptSettings(iframe_document);
            close();
            showInlineToast(iframe_document, '已删除所选标签。');
          });
          backdrop.querySelector<HTMLElement>('[data-detail-tag-close]')?.addEventListener('click', close);
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close();
            }
          });
        });
      };

      const show_detail_library_manager_dialog = () => {
        if (detail_library_root) {
          detail_library_root.dataset.selectionMode = 'false';
          detail_library_root.dataset.selectedPromptIds = '';
        }
        handle_view_switch('theater');
        updateText(iframe_document, '[data-prompt-settings-detail]', '已进入小剧场管理。');
      };

      const getPromptExportGroups = (): PromptExportGroup[] => {
        const settings = getSettings();
        return [
          { key: 'presets', label: '预设', items: settings.prompts || [] },
          { key: 'base', label: '基础', items: settings.base_prompts || [] },
          { key: 'detail', label: '小剧场内容', items: settings.detail_prompts || [] },
        ];
      };

      const stripPromptItemForExport = (
        item: SettingsPromptPresetRuntime | SettingsPromptItemRuntime,
        type: PromptGroupKey,
      ): SettingsPromptPreset | SettingsPromptItem => {
        const common = {
          id: String(item.id || createPromptId()),
          name: String(item.name || '未命名'),
        };
        if (type === 'presets') {
          const preset = item as SettingsPromptPresetRuntime;
          return {
            ...common,
            base_prompt_id: preset.base_prompt_id || '',
            detail_prompt_id: preset.detail_prompt_id || '',
            base_content: preset.base_content || '',
            detail_content: preset.detail_content || '',
          };
        }
        const prompt_item = item as SettingsPromptItemRuntime;
        return {
          ...common,
          description: String(prompt_item.description || ''),
          content: String(prompt_item.content || ''),
          folder_id: String(prompt_item.folder_id || ''),
          tags: Array.isArray(prompt_item.tags) ? prompt_item.tags.map(tag => String(tag)) : [],
          created_at: String(prompt_item.created_at || ''),
        };
      };

      const showPromptExportDialog = () => {
        return new Promise<PromptExportSelection | null>(resolve => {
          if (!iframe_document?.body) {
            resolve(null);
            return;
          }
          iframe_document.querySelectorAll('.confirm-backdrop').forEach(element => element.remove());
          const active_ids = new Set();
          const groups = getPromptExportGroups();
          const group_html = groups
            .map(group => {
              const options = group.items.length
                ? group.items
                    .map(
                      item =>
                        '<label class="random-prompt-option">' +
                        '<input type="checkbox" data-export-kind="' +
                        group.key +
                        '" data-export-id="' +
                        escapeHtml(item.id) +
                        '" ' +
                        (active_ids.has(item.id) ? 'checked' : '') +
                        ' />' +
                        '<span>' +
                        escapeHtml(item.name || '未命名') +
                        '</span>' +
                        '</label>',
                    )
                    .join('')
                : '<p class="settings-card__note">暂无可导出内容。</p>';
              return (
                '<section class="settings-card" style="padding:10px;gap:8px;"><div class="settings-card__head"><h3>' +
                escapeHtml(group.label) +
                '</h3></div><div class="random-prompt-list" style="max-height:150px;">' +
                options +
                '</div></section>'
              );
            })
            .join('');
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog prompt-export-dialog" role="dialog" aria-modal="true" style="width:min(520px, calc(100vw - 32px));background:var(--panel-bg);">' +
            '<h3>导出提示词 JSON</h3>' +
            '<p>选择要导出的内容。可单选或多选；导出的 JSON 会按“预设 / 基础 / 小剧场内容”分组。</p>' +
            '<div class="prompt-export-dialog__body" style="display:grid;gap:10px;max-height:min(62vh,520px);overflow:auto;padding-right:2px;">' +
            group_html +
            '</div>' +
            '<div class="button-row" style="margin-top:12px;">' +
            '<button class="plain-button" type="button" data-export-cancel>取消</button>' +
            '<button class="plain-button" type="button" data-export-all>全选</button>' +
            '<button class="plain-button danger-button is-warning" type="button" data-export-ok>导出</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const close = (value: PromptExportSelection | null) => {
            backdrop.remove();
            resolve(value);
          };
          backdrop.querySelector('[data-export-cancel]')?.addEventListener('click', () => close(null));
          backdrop.querySelector('[data-export-all]')?.addEventListener('click', () => {
            backdrop.querySelectorAll<HTMLInputElement>('[data-export-kind]').forEach(input => {
              input.checked = true;
            });
          });
          backdrop.querySelector('[data-export-ok]')?.addEventListener('click', () => {
            const selected: PromptExportSelection = { presets: new Set(), base: new Set(), detail: new Set() };
            backdrop.querySelectorAll<HTMLInputElement>('[data-export-kind]:checked').forEach(input => {
              const kind = input.dataset.exportKind as PromptGroupKey | undefined;
              if (kind) {
                selected[kind].add(input.dataset.exportId || '');
              }
            });
            close(selected);
          });
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) close(null);
          });
        });
      };

      const show_detail_import_mode_dialog = () => {
        return new Promise<'json' | 'worldbook' | 'text' | null>(resolve => {
          iframe_document.querySelectorAll('.confirm-backdrop').forEach(element => element.remove());
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog detail-import-dialog" role="dialog" aria-modal="true">' +
            '<h3>导入小剧场</h3>' +
            '<p>选择导入格式。JSON 适用于本工具导出的数据；世界书模式会读取 entries/comment/content；文本模式支持批量导入 txt，并可下载模板。</p>' +
            '<div class="detail-import-dialog__body">' +
            '<div class="button-row">' +
            '<button class="plain-button" type="button" data-detail-import-mode="json">导入 JSON</button>' +
            '<button class="plain-button" type="button" data-detail-import-mode="worldbook">导入世界书</button>' +
            '<button class="plain-button" type="button" data-detail-import-mode="text">导入文本</button>' +
            '<button class="plain-button" type="button" data-detail-download-text-template>下载 TXT 模板</button>' +
            '</div>' +
            '</div>' +
            '<div class="button-row">' +
            '<button class="plain-button" type="button" data-detail-import-cancel>取消</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const close = (value: 'json' | 'worldbook' | 'text' | null) => {
            backdrop.remove();
            resolve(value);
          };
          backdrop.querySelectorAll<HTMLElement>('[data-detail-import-mode]').forEach(button => {
            button.addEventListener('click', () => close(button.dataset.detailImportMode as DetailImportMode));
          });
          backdrop.querySelector<HTMLElement>('[data-detail-download-text-template]')?.addEventListener('click', () => {
            const blob = new Blob([build_detail_text_template()], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = iframe_document.createElement('a');
            anchor.href = url;
            anchor.download = 'LoreFrame-小剧场模板.txt';
            iframe_document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            showInlineToast(iframe_document, '已下载 TXT 模板。');
          });
          backdrop
            .querySelector<HTMLElement>('[data-detail-import-cancel]')
            ?.addEventListener('click', () => close(null));
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close(null);
            }
          });
        });
      };

      const choose_detail_import_file = (accept: string) =>
        new Promise<File | undefined>(resolve => {
          const input = iframe_document.createElement('input');
          input.type = 'file';
          input.accept = accept;
          input.addEventListener('change', () => resolve(input.files?.[0]));
          input.click();
        });

      const show_detail_import_preview_dialog = (preview: DetailImportPreview) => {
        return new Promise<{
          folderMode: 'new' | 'existing';
          folderName: string;
          folderId: string;
          selectedIds: string[];
        } | null>(resolve => {
          iframe_document.querySelectorAll('.confirm-backdrop').forEach(element => element.remove());
          const settings = getSettings();
          const folder_options = settings.detail_prompt_folders
            .map(
              folder =>
                `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)} (${settings.detail_prompts.filter(prompt => prompt.folder_id === folder.id).length})</option>`,
            )
            .join('');
          const cards = preview.entries
            .map(
              item =>
                '<label class="detail-import-card">' +
                '<div class="detail-import-card__head">' +
                `<input type="checkbox" data-detail-import-item="${escapeHtml(item.id)}" checked />` +
                '<div class="detail-import-card__title">' +
                `<strong>${escapeHtml(item.name)}</strong>` +
                `<p>${escapeHtml(item.description || '暂无描述')}</p>` +
                '</div>' +
                '</div>' +
                `<div class="detail-library-filter-tags">${(item.tags || []).map(tag => `<span class="detail-library-tag-chip">${escapeHtml(tag)}</span>`).join('') || '<span class="settings-card__note">无标签</span>'}</div>` +
                `<p>${escapeHtml((item.content || '').slice(0, 180))}${item.content.length > 180 ? '…' : ''}</p>` +
                '</label>',
            )
            .join('');
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog detail-import-dialog" role="dialog" aria-modal="true">' +
            `<h3>确认导入${preview.mode === 'worldbook' ? '世界书' : preview.mode === 'text' ? '文本' : 'JSON'}小剧场</h3>` +
            `<p>共识别出 ${preview.entries.length} 个条目。你可以修改新文件夹名称，或者直接导入到已有文件夹。</p>` +
            '<div class="detail-import-dialog__body">' +
            '<div class="appearance-theme-schedule">' +
            '<label class="field"><span>导入方式</span><select class="select" data-detail-import-folder-mode><option value="new">新建文件夹</option><option value="existing">导入到已有文件夹</option></select></label>' +
            `<label class="field"><span>新文件夹名称</span><input class="input" type="text" data-detail-import-folder-name value="${escapeHtml(preview.suggestedFolderName)}" /></label>` +
            `<label class="field"><span>已有文件夹</span><select class="select" data-detail-import-folder-id ${settings.detail_prompt_folders.length ? '' : 'disabled'}>${folder_options || '<option value="">暂无文件夹</option>'}</select></label>` +
            '</div>' +
            '<div class="detail-import-dialog__toolbar">' +
            '<span class="settings-card__note">勾选要导入的小剧场</span>' +
            '<div class="button-row">' +
            '<button class="plain-button" type="button" data-detail-import-select-all>全选</button>' +
            '<button class="plain-button" type="button" data-detail-import-select-none>取消全选</button>' +
            '</div>' +
            '</div>' +
            `<div class="detail-import-list">${cards || '<p class="settings-card__note">没有可导入的内容。</p>'}</div>` +
            '</div>' +
            '<div class="button-row">' +
            '<button class="plain-button" type="button" data-detail-import-cancel>取消</button>' +
            '<button class="plain-button danger-button is-warning" type="button" data-detail-import-confirm>确认导入</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const folder_mode = backdrop.querySelector<HTMLSelectElement>('[data-detail-import-folder-mode]');
          const folder_name = backdrop.querySelector<HTMLInputElement>('[data-detail-import-folder-name]');
          const folder_id = backdrop.querySelector<HTMLSelectElement>('[data-detail-import-folder-id]');
          const update_folder_fields = () => {
            const use_existing = folder_mode?.value === 'existing';
            folder_name?.toggleAttribute('disabled', use_existing);
            folder_id?.toggleAttribute('disabled', !use_existing);
          };
          const close = (
            value: {
              folderMode: 'new' | 'existing';
              folderName: string;
              folderId: string;
              selectedIds: string[];
            } | null,
          ) => {
            backdrop.remove();
            resolve(value);
          };
          update_folder_fields();
          folder_mode?.addEventListener('change', update_folder_fields);
          backdrop.querySelector<HTMLElement>('[data-detail-import-select-all]')?.addEventListener('click', () => {
            backdrop.querySelectorAll<HTMLInputElement>('[data-detail-import-item]').forEach(input => {
              input.checked = true;
            });
          });
          backdrop.querySelector<HTMLElement>('[data-detail-import-select-none]')?.addEventListener('click', () => {
            backdrop.querySelectorAll<HTMLInputElement>('[data-detail-import-item]').forEach(input => {
              input.checked = false;
            });
          });
          backdrop
            .querySelector<HTMLElement>('[data-detail-import-cancel]')
            ?.addEventListener('click', () => close(null));
          backdrop.querySelector<HTMLElement>('[data-detail-import-confirm]')?.addEventListener('click', () => {
            const selected_ids = [
              ...backdrop.querySelectorAll<HTMLInputElement>('[data-detail-import-item]:checked'),
            ].map(input => String(input.dataset.detailImportItem || ''));
            if (!selected_ids.length) {
              showInlineToast(iframe_document, '请至少勾选一个小剧场。');
              return;
            }
            if (folder_mode?.value !== 'existing' && !String(folder_name?.value || '').trim()) {
              showInlineToast(iframe_document, '请输入文件夹名称。');
              return;
            }
            close({
              folderMode: folder_mode?.value === 'existing' ? 'existing' : 'new',
              folderName: String(folder_name?.value || '').trim(),
              folderId: String(folder_id?.value || ''),
              selectedIds: selected_ids,
            });
          });
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close(null);
            }
          });
        });
      };

      const apply_detail_import_preview = (
        preview: DetailImportPreview,
        selection: { folderMode: 'new' | 'existing'; folderName: string; folderId: string; selectedIds: string[] },
      ) => {
        const settings = getSettings();
        const selected_entry_map = new Set(selection.selectedIds);
        const chosen_entries = preview.entries.filter(item => selected_entry_map.has(item.id));
        if (!chosen_entries.length) {
          return 0;
        }
        let next_folder_id = selection.folderId;
        let next_folders = [...settings.detail_prompt_folders];
        if (selection.folderMode === 'new') {
          const existing_folder = next_folders.find(folder => folder.name === selection.folderName);
          if (existing_folder) {
            next_folder_id = existing_folder.id;
          } else {
            next_folder_id = createPromptId();
            next_folders = [
              ...next_folders,
              { id: next_folder_id, name: selection.folderName || preview.suggestedFolderName },
            ];
          }
        }
        const next_prompts = [...settings.detail_prompts];
        chosen_entries.forEach(item => {
          next_prompts.push({
            id: createPromptId(),
            name: item.name || '导入小剧场',
            description: item.description || '',
            content: item.content || '',
            folder_id: next_folder_id || settings.detail_prompt_folders[0]?.id || 'detail-folder-default',
            tags: item.tags || [],
            created_at: new Date().toISOString(),
            source: 'personal',
            is_published: false,
          });
        });
        saveSettings({
          ...settings,
          detail_prompt_folders: next_folders,
          detail_prompt_tags: [
            ...new Set([...(settings.detail_prompt_tags || []), ...chosen_entries.flatMap(item => item.tags || [])]),
          ],
          detail_prompts: next_prompts,
          active_detail_prompt_id:
            next_prompts[next_prompts.length - chosen_entries.length]?.id || settings.active_detail_prompt_id,
        });
        if (detail_library_root && next_folder_id) {
          detail_library_root.dataset.folderId = next_folder_id;
        }
        return chosen_entries.length;
      };

      const show_detail_export_format_dialog = () => {
        return new Promise<DetailExportFormat | null>(resolve => {
          iframe_document.querySelectorAll('.confirm-backdrop').forEach(element => element.remove());
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog detail-export-dialog" role="dialog" aria-modal="true">' +
            '<h3>导出小剧场</h3>' +
            '<p>选择导出格式。JSON 适合回导本工具；世界书会转为 entries/comment/content 结构；文本会导出为可读的 txt 批量模板。</p>' +
            '<div class="detail-export-dialog__body"><div class="button-row">' +
            '<button class="plain-button" type="button" data-detail-export-format="json">导出 JSON</button>' +
            '<button class="plain-button" type="button" data-detail-export-format="worldbook">导出世界书</button>' +
            '<button class="plain-button" type="button" data-detail-export-format="text">导出文本</button>' +
            '</div></div>' +
            '<div class="button-row"><button class="plain-button" type="button" data-detail-export-cancel>取消</button></div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const close = (value: DetailExportFormat | null) => {
            backdrop.remove();
            resolve(value);
          };
          backdrop.querySelectorAll<HTMLElement>('[data-detail-export-format]').forEach(button => {
            button.addEventListener('click', () => close(button.dataset.detailExportFormat as DetailExportFormat));
          });
          backdrop
            .querySelector<HTMLElement>('[data-detail-export-cancel]')
            ?.addEventListener('click', () => close(null));
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close(null);
            }
          });
        });
      };

      const downloadPromptExport = (selected: PromptExportSelection) => {
        const groups = getPromptExportGroups();
        const payload: PromptExportPayload = {
          loreframe_prompt_export_version: 1,
          exported_at: new Date().toISOString(),
          预设: [],
          基础: [],
          个性化: [],
        };
        groups.forEach(group => {
          if (group.key === 'presets') {
            payload.预设 = group.items
              .filter(item => selected.presets.has(item.id))
              .map(item => stripPromptItemForExport(item, 'presets') as SettingsPromptPreset);
            return;
          }
          if (group.key === 'base') {
            payload.基础 = group.items
              .filter(item => selected.base.has(item.id))
              .map(item => stripPromptItemForExport(item, 'base') as SettingsPromptItem);
            return;
          }
          payload.个性化 = group.items
            .filter(item => selected.detail.has(item.id))
            .map(item => stripPromptItemForExport(item, 'detail') as SettingsPromptItem);
        });
        const count = payload.预设.length + payload.基础.length + payload.个性化.length;
        if (!count) {
          showInlineToast(iframe_document, '请至少选择一项提示词内容。');
          return;
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = iframe_document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        anchor.href = url;
        anchor.download = 'LoreFrame-prompts-' + stamp + '.json';
        iframe_document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showInlineToast(iframe_document, '已导出 ' + count + ' 项提示词内容。');
      };

      const download_detail_export = (
        items: SettingsPromptItemRuntime[],
        format: DetailExportFormat,
        folder_label: string,
      ) => {
        if (!items.length) {
          showInlineToast(iframe_document, '当前没有可导出的小剧场。');
          return;
        }
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safe_folder = slugify_file_label(folder_label || '小剧场');
        let blob: Blob;
        let filename = `LoreFrame-${safe_folder}-${stamp}`;
        if (format === 'json') {
          blob = new Blob(
            [
              JSON.stringify(
                {
                  loreframe_detail_export_version: 1,
                  exported_at: new Date().toISOString(),
                  个性化: items.map(item => stripPromptItemForExport(item, 'detail')),
                },
                null,
                2,
              ),
            ],
            { type: 'application/json;charset=utf-8' },
          );
          filename += '.json';
        } else if (format === 'worldbook') {
          const entries = items.reduce<Record<string, unknown>>((result, item, index) => {
            result[String(index)] = {
              uid: index,
              displayIndex: index,
              comment: item.name,
              content: item.content,
              disable: false,
              constant: true,
              selective: false,
              order: 998,
              position: 4,
              role: 0,
              depth: 3,
            };
            return result;
          }, {});
          blob = new Blob([JSON.stringify({ entries }, null, 2)], { type: 'application/json;charset=utf-8' });
          filename += '.worldbook.json';
        } else {
          const text = items
            .map(item =>
              [
                `# ${item.name || '未命名小剧场'}`,
                `描述: ${item.description || ''}`,
                `标签: ${(item.tags || []).join(', ')}`,
                '---',
                item.content || '',
              ].join('\n'),
            )
            .join('\n===\n');
          blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          filename += '.txt';
        }
        const url = URL.createObjectURL(blob);
        const anchor = iframe_document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        iframe_document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showInlineToast(iframe_document, `已导出 ${items.length} 个小剧场。`);
      };

      const mergeImportedPromptItems = (
        list: Array<SettingsPromptPresetRuntime | SettingsPromptItemRuntime>,
        items: unknown,
        options: { kind?: 'preset' | 'base' | 'detail' } = {},
      ) => {
        const next_list = [...list];
        const id_map: ImportedPromptIdMap = {};
        let count = 0;
        (Array.isArray(items) ? items : []).forEach(raw => {
          if (!raw || typeof raw !== 'object') return;
          const source = raw as Record<string, unknown>;
          const old_id = String(source.id || createPromptId());
          const existing_index = next_list.findIndex(item => item.id === old_id);
          const existing = existing_index >= 0 ? next_list[existing_index] : null;
          const next_id = existing && existing.source !== 'personal' ? createPromptId() : old_id;
          id_map[old_id] = next_id;
          const item: SettingsPromptPresetRuntime | SettingsPromptItemRuntime =
            options.kind === 'preset'
              ? {
                  id: next_id,
                  name: String(source.name || '导入预设'),
                  base_prompt_id: String(source.base_prompt_id || ''),
                  detail_prompt_id: String(source.detail_prompt_id || ''),
                  base_content: String(source.base_content || ''),
                  detail_content: String(source.detail_content || ''),
                  source: 'personal',
                  is_published: false,
                }
              : {
                  id: next_id,
                  name: String(source.name || '导入提示词'),
                  description: String(source.description || ''),
                  content: String(source.content || ''),
                  folder_id: String(
                    source.folder_id || detail_library_root?.dataset.folderId || 'detail-folder-default',
                  ),
                  tags: Array.isArray(source.tags) ? source.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
                  created_at: String(source.created_at || ''),
                  source: 'personal',
                  is_published: false,
                };
          if (existing_index >= 0 && existing?.source === 'personal') {
            next_list[existing_index] = item;
          } else {
            next_list.push(item);
          }
          count += 1;
        });
        return { list: next_list, id_map, count };
      };

      const importPromptJsonPayload = (payload: ImportPromptPayload) => {
        const presets = payload?.预设 || payload?.presets || payload?.prompts || [];
        const base_items = payload?.基础 || payload?.base || payload?.base_prompts || [];
        const detail_items = payload?.个性化 || payload?.detail || payload?.detail_prompts || [];
        if (!Array.isArray(presets) && !Array.isArray(base_items) && !Array.isArray(detail_items)) {
          throw Error('JSON 格式不正确：没有找到“预设 / 基础 / 小剧场内容”。');
        }
        const settings = getSettings();
        const base_result = mergeImportedPromptItems(settings.base_prompts, base_items, { kind: 'base' });
        const detail_result = mergeImportedPromptItems(settings.detail_prompts, detail_items, { kind: 'detail' });
        const preset_result = mergeImportedPromptItems(settings.prompts, presets, { kind: 'preset' });
        const next_prompts = preset_result.list.map(prompt =>
          prompt.source === 'personal' && 'base_prompt_id' in prompt && 'detail_prompt_id' in prompt
            ? {
                ...prompt,
                base_prompt_id: base_result.id_map[prompt.base_prompt_id] || prompt.base_prompt_id,
                detail_prompt_id: detail_result.id_map[prompt.detail_prompt_id] || prompt.detail_prompt_id,
              }
            : (prompt as SettingsPromptPresetRuntime),
        ) as SettingsPromptPresetRuntime[];
        const imported_preset_ids = Object.values(preset_result.id_map);
        const imported_base_ids = Object.values(base_result.id_map);
        const imported_detail_ids = Object.values(detail_result.id_map);
        const imported_detail_tags = [
          ...new Set((detail_result.list as SettingsPromptItemRuntime[]).flatMap(item => item.tags || [])),
        ];
        saveSettings({
          ...settings,
          prompts: next_prompts,
          base_prompts: base_result.list as SettingsPromptItemRuntime[],
          detail_prompt_tags: [...new Set([...(settings.detail_prompt_tags || []), ...imported_detail_tags])],
          detail_prompts: detail_result.list as SettingsPromptItemRuntime[],
          active_prompt_id: imported_preset_ids[0] || settings.active_prompt_id,
          active_base_prompt_id: imported_base_ids[0] || settings.active_base_prompt_id,
          active_detail_prompt_id: imported_detail_ids[0] || settings.active_detail_prompt_id,
        });
        return preset_result.count + base_result.count + detail_result.count;
      };

      const handlePromptImportFile = (file: File | undefined) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const count = importPromptJsonPayload(JSON.parse(String(reader.result || '{}')));
            renderPromptSettings(iframe_document);
            set_prompt_dirty(false);
            updateText(iframe_document, '[data-prompt-settings-detail]', '已导入 ' + count + ' 项提示词内容。');
            showInlineToast(iframe_document, '已导入 ' + count + ' 项提示词内容。');
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            updateText(iframe_document, '[data-prompt-settings-detail]', message);
            showInlineToast(iframe_document, message || '导入失败。');
          }
        };
        reader.readAsText(file);
      };

      const cancel_template_edit = (type: PromptTemplateType) => {
        const settings = getSettings();
        if (type === 'base') {
          const active_prompt = settings.base_prompts.find(prompt => prompt.id === base_prompt_select?.value);
          updateValue(iframe_document, '[data-base-prompt-name]', active_prompt?.name || '');
          updateValue(iframe_document, '[data-base-prompt-content]', active_prompt?.content || '');
        } else {
          const active_prompt = settings.detail_prompts.find(prompt => prompt.id === detail_prompt_select?.value);
          updateValue(iframe_document, '[data-detail-prompt-name]', active_prompt?.name || '');
          updateValue(iframe_document, '[data-detail-prompt-name-display]', active_prompt?.name || '');
          updateValue(iframe_document, '[data-detail-prompt-description]', active_prompt?.description || '');
          updateValue(iframe_document, '[data-detail-prompt-content]', active_prompt?.content || '');
        }
        set_template_edit_mode(type, false);
      };

      const set_summary_tag_edit_mode = (is_editing: boolean) => {
        const actions = iframe_document.querySelector<HTMLElement>('[data-summary-tag-actions]');
        if (is_editing) {
          summary_tag_name?.removeAttribute('hidden');
          summary_open_tag?.removeAttribute('readonly');
          summary_close_tag?.removeAttribute('readonly');
          actions?.removeAttribute('hidden');
          edit_summary_tag?.setAttribute('hidden', '');
          summary_tag_name?.focus();
          return;
        }
        summary_tag_name?.setAttribute('hidden', '');
        summary_open_tag?.setAttribute('readonly', '');
        summary_close_tag?.setAttribute('readonly', '');
        actions?.setAttribute('hidden', '');
        edit_summary_tag?.removeAttribute('hidden');
      };

      const cancel_summary_tag_edit = () => {
        const settings = getSettings();
        const active_tag = settings.summary_tags.find(tag => tag.id === summary_tag_select?.value);
        updateValue(iframe_document, '[data-summary-tag-name]', active_tag?.name || '');
        updateValue(iframe_document, '[data-summary-open-tag]', active_tag?.open_tag || '');
        updateValue(iframe_document, '[data-summary-close-tag]', active_tag?.close_tag || '');
        set_summary_tag_edit_mode(false);
      };

      const close_toolbar_menu = () => {
        toolbar_menu?.classList.remove('is-open');
        toolbar_more?.setAttribute('aria-expanded', 'false');
      };

      const reset_edit_button_state = () => {
        edit_online_code?.setAttribute('aria-expanded', 'false');
      };

      const open_online_editor = () => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          return;
        }
        close_toolbar_menu();
        reset_edit_button_state();
        code_editor_panel?.removeAttribute('hidden');
        code_editor_panel?.setAttribute('data-editor-mode', 'html');
        if (code_editor_title) {
          code_editor_title.textContent = '编辑代码';
        }
        if (code_editor_hint) {
          code_editor_hint.textContent = '修改 HTML 后保存，会自动重新提取正文记忆。';
        }
        updateValue(iframe_document, '[data-online-code-editor]', active_entry.html || '');
        online_code_editor?.focus();
      };

      const open_title_editor = () => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          return;
        }
        online_title_display?.setAttribute('hidden', '');
        online_title_input?.removeAttribute('hidden');
        updateValue(iframe_document, '[data-online-title-input]', active_entry.title || '');
        online_title_input?.focus();
        online_title_input?.select?.();
      };

      const save_title_editor = () => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          online_title_input?.setAttribute('hidden', '');
          online_title_display?.removeAttribute('hidden');
          return;
        }
        const next_title = online_title_input?.value?.trim() || active_entry.title;
        updateOnlineEntry(active_entry.id, {
          title: next_title,
        });
        renderOnlineContent(iframe_document);
        showInlineToast(iframe_document, '标题已保存。');
      };

      let theme_sync_timer = 0;
      let mobile_layout_resize_observer: ResizeObserver | null = null;

      const suspend_online_preview = () => {
        const preview = iframe_document.querySelector<HTMLIFrameElement>('[data-online-preview]');
        if (!preview) {
          return;
        }
        try {
          const preview_document = preview.contentDocument;
          preview_document?.querySelectorAll<HTMLMediaElement>('audio, video').forEach(media => {
            try {
              media.pause();
              media.currentTime = 0;
            } catch (error) {
              console.warn('[LoreFrame] 停止预览媒体失败', error);
            }
          });
          const preview_window = preview_document?.defaultView as (Window & { __TH_AUDIO_CONTEXTS__?: AudioContext[] }) | null;
          if (preview_window && Array.isArray(preview_window.__TH_AUDIO_CONTEXTS__)) {
            preview_window.__TH_AUDIO_CONTEXTS__.forEach(context => {
              context.close().catch?.(() => {});
            });
          }
        } catch (error) {
          console.debug('[LoreFrame] 预览 iframe 非同源，直接清空 srcdoc 停止播放。', error);
        }
        preview.srcdoc =
          '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"></head><body style="margin:0;background:transparent;"></body></html>';
      };

      const restore_online_preview = () => {
        renderOnlineContent(iframe_document);
      };

      const open_panel_with_preview = () => {
        restore_online_preview();
        openPanel(iframe, iframe_body);
      };

      const close_panel_and_suspend_preview = () => {
        suspend_online_preview();
        closePanel(iframe, iframe_body);
      };

      const ensureHostEntryStyle = () => {
        if (host_document.getElementById(HOST_ENTRY_STYLE_ID)) {
          return;
        }
        const style = host_document.createElement('style');
        style.id = HOST_ENTRY_STYLE_ID;
        style.textContent = `
          #${QR_BUTTON_ENTRY_ID} {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            gap: 0;
            width: auto;
            min-width: 0;
            white-space: nowrap;
            box-sizing: border-box;
          }
          #${QR_BUTTON_ENTRY_ID} .loreframe-qr-label {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
          }
          #${EXTENSIONS_MENU_ENTRY_ID} {
            display: inline-flex;
            align-items: center;
            justify-content: flex-start;
            gap: 8px;
            width: 100%;
            max-width: 100%;
            cursor: pointer;
            white-space: nowrap;
            box-sizing: border-box;
            text-align: left;
          }
          #${EXTENSIONS_MENU_ENTRY_ID} .loreframe-entry-label {
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
            flex: 1 1 auto;
            text-align: left;
          }
          #${EXTENSIONS_MENU_ENTRY_ID}.list-group-item,
          #${EXTENSIONS_MENU_ENTRY_ID}.flex-container {
            border-radius: inherit;
            font: inherit;
            line-height: inherit;
          }
          #${EXTENSIONS_MENU_ENTRY_ID} .loreframe-extension-icon {
            flex: 0 0 auto;
            width: 1.25em;
            text-align: center;
          }
        `;
        host_document.head.appendChild(style);
      };

      const removeHostEntryButton = (id: string) => {
        host_document.getElementById(id)?.remove();
      };

      const findHostEntryContainer = (selectors: string[]) => {
        for (const selector of selectors) {
          const element = host_document.querySelector<HTMLElement>(selector);
          if (element) {
            return element;
          }
        }
        return null;
      };

      const findHostEntryReference = (container: HTMLElement, id: string, variant: 'qr' | 'extensions') => {
        const selectors =
          variant === 'extensions'
            ? ['.list-group-item', '.flex-container', 'button', 'a', '[role="button"]']
            : ['.qr--button', '.menu_button', 'button', '[role="button"]'];
        for (const selector of selectors) {
          const candidates = [...container.querySelectorAll<HTMLElement>(selector)].filter(element => element.id !== id);
          if (candidates.length) {
            return candidates[0];
          }
        }
        return null;
      };

      const copyComputedStyles = (source: HTMLElement, target: HTMLElement, properties: string[]) => {
        const computed = host_window.getComputedStyle(source);
        properties.forEach(property => {
          const value = computed.getPropertyValue(property);
          if (value) {
            target.style.setProperty(property, value);
          }
        });
      };

      const applyAdaptiveHostEntryStyle = (
        button: HTMLButtonElement,
        container: HTMLElement,
        variant: 'qr' | 'extensions',
      ) => {
        button.style.cssText = '';
        const reference = findHostEntryReference(container, button.id, variant);
        if (reference) {
          copyComputedStyles(
            reference,
            button,
            variant === 'extensions'
              ? [
                  'background',
                  'background-image',
                  'color',
                  'border',
                  'border-radius',
                  'box-shadow',
                  'padding',
                  'min-height',
                  'height',
                  'font-size',
                  'font-weight',
                  'line-height',
                  'letter-spacing',
                  'text-transform',
                  'backdrop-filter',
                  'filter',
                  'opacity',
                ]
              : [
                  'background',
                  'background-image',
                  'color',
                  'border',
                  'border-radius',
                  'box-shadow',
                  'padding',
                  'min-height',
                  'height',
                  'font-size',
                  'font-weight',
                  'line-height',
                  'letter-spacing',
                  'text-transform',
                  'backdrop-filter',
                  'filter',
                  'opacity',
                ],
          );
        }
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.boxSizing = 'border-box';
        button.style.cursor = 'pointer';
        button.style.whiteSpace = 'nowrap';
        if (variant === 'extensions') {
          button.style.width = '100%';
          button.style.maxWidth = '100%';
          button.style.justifyContent = 'flex-start';
          button.style.textAlign = 'left';
          button.style.gap = '8px';
        } else {
          button.style.width = 'auto';
          button.style.minWidth = '0';
          button.style.justifyContent = 'center';
          button.style.gap = '0';
        }
      };

      const ensureHostEntryButton = (
        id: string,
        selectors: string[],
        options: { label: string; iconClass?: string; className?: string; title?: string; variant?: 'qr' | 'extensions' },
      ) => {
        const container = findHostEntryContainer(selectors);
        if (!container) {
          removeHostEntryButton(id);
          return null;
        }
        let button = host_document.getElementById(id) as HTMLButtonElement | null;
        if (!button) {
          button = host_document.createElement('button');
          button.id = id;
          button.type = 'button';
          button.className = options.className || 'menu_button';
          button.setAttribute('data-script-id', SCRIPT_ID);
          button.setAttribute('data-entry-variant', options.variant || 'qr');
          container.appendChild(button);
        } else if (button.parentElement !== container) {
          container.appendChild(button);
        }
        button.className = options.className || 'menu_button';
        button.setAttribute('data-entry-variant', options.variant || 'qr');
        const icon_class = String(options.iconClass || 'fa-solid fa-book-open').trim();
        if (options.variant === 'extensions') {
          button.innerHTML =
            `<i class="${escapeHtml(`loreframe-extension-icon ${icon_class}`)}" aria-hidden="true"></i>` +
            `<span class="loreframe-entry-label">${escapeHtml(options.label)}</span>`;
        } else {
          button.innerHTML = `<span class="loreframe-qr-label">${escapeHtml(options.label)}</span>`;
        }
        button.title = options.title || options.label;
        button.setAttribute('aria-label', options.title || options.label);
        button.onclick = event => {
          event.preventDefault();
          event.stopPropagation();
          open_panel_with_preview();
        };
        applyAdaptiveHostEntryStyle(button, container, options.variant || 'qr');
        return button;
      };

      const sync_host_entry_buttons = () => {
        const settings = getSettings();
        const launch_entry_modes = new Set(settings.launch_entry_modes || []);
        ensureHostEntryStyle();
        setFloatingLauncherVisible(launch_entry_modes.has('floating_ball'));
        if (launch_entry_modes.has('qr_button')) {
          ensureHostEntryButton(
            QR_BUTTON_ENTRY_ID,
            ['#qr--bar', '#qr_buttons', '#qr-buttons', '.qr--buttons', '.qr-buttons', '#send_form .extraMesButtons'],
            {
              label: '🌐拟界文库',
              iconClass: 'fa-solid fa-book-open',
              className: 'qr--button menu_button interactable',
              title: '打开拟界文库',
              variant: 'qr',
            },
          );
        } else {
          removeHostEntryButton(QR_BUTTON_ENTRY_ID);
        }
        if (launch_entry_modes.has('extensions_menu')) {
          ensureHostEntryButton(EXTENSIONS_MENU_ENTRY_ID, ['#extensionsMenu', '#extensionsmenu', '.extensionsMenu'], {
            label: '拟界文库',
            iconClass: 'fa-solid fa-book-open',
            className: 'list-group-item flex-container flexGap5 interactable',
            title: '打开拟界文库',
            variant: 'extensions',
          });
        } else {
          removeHostEntryButton(EXTENSIONS_MENU_ENTRY_ID);
        }
      };

      const sync_mobile_header_metrics = () => {
        const header_element = panel_header?.closest<HTMLElement>('.online-panel__header');
        const body_element = iframe_document.querySelector<HTMLElement>('.online-panel__body');
        const visual_viewport = host_window.visualViewport;
        const safe_top = Math.max(0, Math.round(visual_viewport?.offsetTop || 0));
        const safe_left = Math.max(0, Math.round(visual_viewport?.offsetLeft || 0));
        const safe_right = Math.max(
          0,
          Math.round(
            (host_window.innerWidth || host_document.documentElement.clientWidth || 0) -
              (visual_viewport?.width || host_window.innerWidth || 0) -
              (visual_viewport?.offsetLeft || 0),
          ),
        );
        const safe_bottom = Math.max(
          0,
          Math.round(
            (host_window.innerHeight || host_document.documentElement.clientHeight || 0) -
              (visual_viewport?.height || host_window.innerHeight || 0) -
              (visual_viewport?.offsetTop || 0),
          ),
        );
        const measured_header_height = Math.ceil(header_element?.offsetHeight || 0);
        const next_header_height = Math.max(72, measured_header_height || 96);
        const body_rect = body_element?.getBoundingClientRect();
        const measured_body_top = Math.ceil(body_rect?.top || next_header_height);
        const measured_body_height = Math.max(
          0,
          Math.ceil(body_rect?.height || host_window.innerHeight - measured_body_top - safe_bottom),
        );
        iframe_body.style.setProperty('--safe-top', `${safe_top}px`);
        iframe_body.style.setProperty('--safe-right', `${safe_right}px`);
        iframe_body.style.setProperty('--safe-bottom', `${safe_bottom}px`);
        iframe_body.style.setProperty('--safe-left', `${safe_left}px`);
        iframe_body.style.setProperty('--mobile-header-height', `${next_header_height}px`);
        iframe_body.style.setProperty('--mobile-body-top', `${measured_body_top}px`);
        iframe_body.style.setProperty('--mobile-body-height', `${measured_body_height}px`);
      };

      const sync_theme_controls = () => {
        const settings = getSettings();
        const mode = normalizeThemeMode(settings.theme_mode);
        const schedule = normalizeThemeSchedule(settings.theme_schedule);
        const resolved_theme = iframe_body.dataset.theme === 'night' ? 'night' : 'day';
        if (theme_mode) {
          theme_mode.value = mode;
        }
        if (theme_day_start) {
          theme_day_start.value = schedule.day_start;
        }
        if (theme_night_start) {
          theme_night_start.value = schedule.night_start;
        }
        if (theme_schedule_fields) {
          theme_schedule_fields.hidden = mode !== 'system';
        }
        updateText(
          iframe_document,
          '[data-theme-mode-detail]',
          mode === 'system'
            ? `当前按北京时间自动切换。日间 ${schedule.day_start} 开始，夜间 ${schedule.night_start} 开始；现在是${resolved_theme === 'night' ? '夜间' : '日间'}。`
            : `当前固定为${resolved_theme === 'night' ? '夜间' : '日间'}模式。`,
        );
      };

      const apply_runtime_theme = (should_render_online = true) => {
        applyThemePreference(iframe_body, getSettings());
        applyFloatingLauncherAppearance();
        sync_theme_controls();
        if (should_render_online && !getCurrentOnlineData().active_entry) {
          renderOnlineContent(iframe_document);
        }
      };

      console.info('[LoreFrame] mount: render initial views');
      apply_runtime_theme(false);
      setBubbleGenerationState(iframe_document, 'idle');
      applyViewportClass(iframe_body);
      sync_mobile_header_metrics();
      setSidebarOpen(iframe_body, false);
      switchMainView(iframe_document, active_view as MainViewName);
      renderPromptSettings(iframe_document);
      renderOnlineContent(iframe_document);
      renderAppearanceSettings(iframe_document);
      if (active_view === 'debug-tools') {
        renderPromptViewer(iframe_document, '初始化读取');
        renderRunLog(iframe_document);
        renderImageGenerationLog(iframe_document);
      }
      sync_theme_controls();
      console.info('[LoreFrame] mount: collect debug snapshot');
      collectSourceDebugSnapshot(iframe_document, '初始化读取');

      const bind_floating_launcher_drag = (launcher: HTMLButtonElement | null) => {
        if (!launcher || launcher.dataset.dragBound === 'true') {
          return;
        }
        launcher.dataset.dragBound = 'true';
        console.info('[LoreFrame] mount: bind floating launcher drag');
        makeDraggable(launcher, iframe, 'bubble');
      };

      const ensure_floating_launcher = () => {
        const launcher = ensureFloatingLauncherMounted(() => open_panel_with_preview());
        bind_floating_launcher_drag(launcher);
        return launcher;
      };

      console.info('[LoreFrame] mount: create floating launcher');
      ensure_floating_launcher();
      console.info('[LoreFrame] mount: reset iframe bubble mode');
      setIframeMode(iframe, 'bubble');
      dockFloatingLauncherToNearestEdge(iframe);
      sync_host_entry_buttons();

      let floating_launcher_restore_timer = 0;
      const restore_floating_launcher_if_needed = () => {
        host_window.clearTimeout(floating_launcher_restore_timer);
        floating_launcher_restore_timer = host_window.setTimeout(() => {
          const launcher_missing = !getFloatingLauncher();
          const style_missing = !host_document.getElementById(`${SCRIPT_ID}-launcher-style`);
          if (!launcher_missing && !style_missing) {
            return;
          }
          ensure_floating_launcher();
          if (!iframe_body.classList.contains('is-panel')) {
            setIframeMode(iframe, 'bubble');
            dockFloatingLauncherToNearestEdge(iframe, bubble_position || getDefaultBubblePosition());
          }
          sync_host_entry_buttons();
        }, 0);
      };

      let floating_launcher_dom_observer: MutationObserver | null = null;
      if (typeof MutationObserver !== 'undefined') {
        floating_launcher_dom_observer = new MutationObserver(() => {
          restore_floating_launcher_if_needed();
        });
        if (host_document.documentElement) {
          floating_launcher_dom_observer.observe(host_document.documentElement, {
            childList: true,
          });
        }
        if (host_document.body) {
          floating_launcher_dom_observer.observe(host_document.body, {
            childList: true,
          });
        }
        if (host_document.head) {
          floating_launcher_dom_observer.observe(host_document.head, {
            childList: true,
          });
        }
      }

      if (panel_header) {
        makeDraggable(panel_header, iframe, 'panel');
      }

      if (typeof ResizeObserver !== 'undefined') {
        const header_element = panel_header?.closest<HTMLElement>('.online-panel__header');
        const body_element = iframe_document.querySelector<HTMLElement>('.online-panel__body');
        if (header_element || body_element) {
          mobile_layout_resize_observer = new ResizeObserver(() => {
            sync_mobile_header_metrics();
          });
          if (header_element) {
            mobile_layout_resize_observer.observe(header_element);
          }
          if (body_element) {
            mobile_layout_resize_observer.observe(body_element);
          }
        }
      }

      if (panel_resize_handle) {
        makeResizable(panel_resize_handle, iframe);
      }

      close_button?.addEventListener('click', () => {
        close_panel_and_suspend_preview();
      });

      theme_mode?.addEventListener('change', () => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          theme_mode: normalizeThemeMode(theme_mode.value),
        });
        apply_runtime_theme();
        showInlineToast(iframe_document, '主题模式已保存。');
      });

      const save_theme_schedule = () => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          theme_schedule: normalizeThemeSchedule({
            day_start: theme_day_start?.value,
            night_start: theme_night_start?.value,
          }),
        });
        apply_runtime_theme();
      };

      theme_day_start?.addEventListener('change', () => {
        save_theme_schedule();
        showInlineToast(iframe_document, '日间开始时间已保存。');
      });

      theme_night_start?.addEventListener('change', () => {
        save_theme_schedule();
        showInlineToast(iframe_document, '夜间开始时间已保存。');
      });

      const get_bubble_controls = () => ({
        background_mode: iframe_document.querySelector<HTMLSelectElement>('[data-bubble-background-mode]'),
        background_color: iframe_document.querySelector<HTMLInputElement>('[data-bubble-background-color]'),
        icon_color_mode: iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-color-mode]'),
        icon_color: iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-color]'),
        icon_source: iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-source]'),
        icon_value: iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-value]'),
        icon_size_mode: iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-size-mode]'),
        icon_size_em: iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-size-em]'),
      });

      const save_bubble_style = () => {
        const controls = get_bubble_controls();
        const settings = getSettings();
        saveSettings({
          ...settings,
          bubble_style: normalizeBubbleStyleSettings({
            background_mode: controls.background_mode?.value as SettingsBubbleBackgroundMode | undefined,
            background_color: controls.background_color?.value,
            icon_color_mode: controls.icon_color_mode?.value as SettingsBubbleIconColorMode | undefined,
            icon_color: controls.icon_color?.value,
            icon_source: controls.icon_source?.value as SettingsBubbleIconSource | undefined,
            icon_value: controls.icon_value?.value,
            icon_size_mode: controls.icon_size_mode?.value as SettingsBubbleIconSizeMode | undefined,
            icon_size_em: controls.icon_size_em?.value ? Number(controls.icon_size_em.value) : undefined,
          }),
        });
        applyFloatingLauncherAppearance();
        updateText(iframe_document, '[data-appearance-detail]', '悬浮球美化已保存。');
      };

      const sync_bubble_controls = () => {
        const bubble_style = normalizeBubbleStyleSettings(getSettings().bubble_style);
        const controls = get_bubble_controls();
        if (controls.background_mode) {
          controls.background_mode.value = bubble_style.background_mode;
        }
        if (controls.background_color) {
          controls.background_color.value = bubble_style.background_color;
        }
        if (controls.icon_color_mode) {
          controls.icon_color_mode.value = bubble_style.icon_color_mode;
        }
        if (controls.icon_color) {
          controls.icon_color.value = bubble_style.icon_color;
        }
        if (controls.icon_source) {
          controls.icon_source.value = bubble_style.icon_source;
        }
        if (controls.icon_value) {
          controls.icon_value.value = bubble_style.icon_value;
        }
        if (controls.icon_size_mode) {
          controls.icon_size_mode.value = bubble_style.icon_size_mode;
        }
        if (controls.icon_size_em) {
          controls.icon_size_em.value = String(bubble_style.icon_size_em);
        }
        if (controls.background_color) {
          controls.background_color.disabled = bubble_style.background_mode !== 'custom';
        }
        if (controls.icon_color) {
          controls.icon_color.disabled = bubble_style.icon_color_mode !== 'custom';
        }
        if (controls.icon_size_em) {
          controls.icon_size_em.disabled = bubble_style.icon_size_mode !== 'custom';
        }
        if (controls.icon_value) {
          controls.icon_value.disabled = bubble_style.icon_source === 'default';
          controls.icon_value.placeholder =
            bubble_style.icon_source === 'image'
              ? '填写图标图链，如 https://example.com/icon.png'
              : '如 fa-solid fa-book-open';
        }
      };

      sync_bubble_controls();

      const showBubbleIconPickerDialog = () => {
        return new Promise<string | null>(resolve => {
          if (!iframe_document?.body) {
            console.log('[LoreFrame] 图标选择器打开失败: iframe body 不存在');
            resolve(null);
            return;
          }
          console.log('[LoreFrame] 打开图标选择器弹窗');
          iframe_document.querySelectorAll<HTMLElement>('.confirm-backdrop').forEach(element => element.remove());
          const backdrop = iframe_document.createElement('div');
          backdrop.className = 'confirm-backdrop';
          backdrop.innerHTML =
            '<section class="confirm-dialog icon-picker-dialog" role="dialog" aria-modal="true">' +
            '<h3>选择悬浮球图标</h3>' +
            '<p>这里会直接读取 Font Awesome 免费图标库；输入图标名或英文关键词筛选，然后点击一个图标直接应用。</p>' +
            '<input class="input icon-picker-dialog__search" type="text" data-icon-picker-search placeholder="搜索图标，如 book / star / map / gear / github" />' +
            '<div class="icon-picker-dialog__grid" data-icon-picker-grid></div>' +
            '<div class="button-row" style="margin-top:12px;">' +
            '<button class="plain-button" type="button" data-icon-picker-clear>默认图标</button>' +
            '<button class="plain-button" type="button" data-icon-picker-cancel>取消</button>' +
            '</div>' +
            '</section>';
          iframe_document.body.appendChild(backdrop);
          const search_input = backdrop.querySelector<HTMLInputElement>('[data-icon-picker-search]');
          const grid = backdrop.querySelector<HTMLElement>('[data-icon-picker-grid]');
          const current_value = normalizeFontAwesomeIconValue(get_bubble_controls().icon_value?.value || '');
          let icon_items: IconPickerItem[] = [];

          const close = (value: string | null) => {
            console.log('[LoreFrame] 关闭图标选择器弹窗', value ?? 'null');
            backdrop.remove();
            resolve(value);
          };

          const render_grid = async () => {
            if (!grid) {
              return;
            }
            if (!icon_items.length) {
              grid.innerHTML = '<p class="icon-picker-dialog__empty">正在载入 Font Awesome 免费图标库…</p>';
              try {
                icon_items = await loadBubbleIconPickerItems();
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                grid.innerHTML =
                  '<p class="icon-picker-dialog__empty">图标库载入失败，请稍后重试，或直接手动输入图标类名。<br />' +
                  escapeHtml(message) +
                  '</p>';
                return;
              }
            }
            const keyword = String(search_input?.value || '')
              .trim()
              .toLowerCase();
            const filtered = icon_items.filter(item => !keyword || item.search_text.includes(keyword));
            grid.innerHTML = filtered.length
              ? filtered
                  .map(
                    item =>
                      '<button class="icon-picker-dialog__item ' +
                      (item.value === current_value ? 'is-active' : '') +
                      '" type="button" data-icon-picker-value="' +
                      escapeHtml(item.value) +
                      '" aria-label="' +
                      escapeHtml(item.label) +
                      '" title="' +
                      escapeHtml(item.label) +
                      '">' +
                      '<i class="' +
                      escapeHtml(item.value) +
                      '" aria-hidden="true"></i>' +
                      '<span class="icon-picker-dialog__item-label">' +
                      escapeHtml(item.label) +
                      '</span>' +
                      '</button>',
                  )
                  .join('')
              : '<p class="icon-picker-dialog__empty">没有匹配的图标，可以继续搜索别的关键词。</p>';
            grid.querySelectorAll<HTMLElement>('.icon-picker-dialog__item').forEach(button => {
              button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                const selected_value = button.dataset.iconPickerValue || null;
                console.log('[LoreFrame] 图标选择器按钮点击', selected_value || 'unknown');
                close(selected_value);
              });
            });
          };

          void render_grid();
          search_input?.focus();
          search_input?.addEventListener('input', () => {
            void render_grid();
          });
          grid?.addEventListener('click', event => {
            const target = event.target instanceof Element ? event.target : null;
            const button = target?.closest<HTMLElement>('.icon-picker-dialog__item');
            console.log('[LoreFrame] 图标选择器网格点击', button?.dataset.iconPickerValue || 'unknown');
            if (!button) {
              return;
            }
            close(button.dataset.iconPickerValue || null);
          });
          backdrop
            .querySelector('[data-icon-picker-clear]')
            ?.addEventListener('click', () => close('fa-solid fa-book-open'));
          backdrop.querySelector('[data-icon-picker-cancel]')?.addEventListener('click', () => close(null));
          backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
              close(null);
            }
          });
        });
      };

      [bubble_background_mode, bubble_icon_color_mode, bubble_icon_source, bubble_icon_size_mode].forEach(element => {
        element?.addEventListener('change', () => {
          save_bubble_style();
          sync_bubble_controls();
        });
      });

      [bubble_background_color, bubble_icon_color].forEach(element => {
        element?.addEventListener('input', () => {
          const controls = get_bubble_controls();
          if (element === bubble_background_color && controls.background_mode) {
            controls.background_mode.value = 'custom';
          }
          if (element === bubble_icon_color && controls.icon_color_mode) {
            controls.icon_color_mode.value = 'custom';
          }
          save_bubble_style();
          sync_bubble_controls();
        });
        element?.addEventListener('change', () => {
          const controls = get_bubble_controls();
          if (element === bubble_background_color && controls.background_mode) {
            controls.background_mode.value = 'custom';
          }
          if (element === bubble_icon_color && controls.icon_color_mode) {
            controls.icon_color_mode.value = 'custom';
          }
          save_bubble_style();
          sync_bubble_controls();
        });
      });

      bubble_icon_value?.addEventListener('change', () => {
        save_bubble_style();
        sync_bubble_controls();
      });

      bubble_icon_size_em?.addEventListener('change', () => {
        save_bubble_style();
        sync_bubble_controls();
      });

      const handleBubbleIconPickerOpen = async () => {
        console.log('[LoreFrame] 开始处理悬浮球图标选择器打开');
        const selected = await showBubbleIconPickerDialog();
        console.log('[LoreFrame] 图标选择器返回结果', selected ?? 'null');
        const controls = get_bubble_controls();
        if (!selected || !controls.icon_value) {
          console.log('[LoreFrame] 图标选择器未应用', {
            selected: selected ?? null,
            hasIconValueControl: Boolean(controls.icon_value),
          });
          return;
        }
        if (controls.icon_source) {
          controls.icon_source.value = 'fontawesome';
        }
        controls.icon_value.value = selected;
        console.log('[LoreFrame] 已写入悬浮球图标值', {
          iconSource: controls.icon_source?.value || null,
          iconValue: controls.icon_value.value,
        });
        save_bubble_style();
        sync_bubble_controls();
        showInlineToast(iframe_document, '悬浮球图标已更新。');
      };

      console.log('[LoreFrame] 悬浮球图标选择器按钮', open_bubble_icon_picker ? '已绑定' : '未找到');

      open_bubble_icon_picker?.addEventListener('pointerdown', event => {
        console.log('[LoreFrame] 悬浮球图标选择器按钮 pointerdown');
        event.stopPropagation();
      });

      open_bubble_icon_picker?.addEventListener('click', event => {
        console.log('[LoreFrame] 悬浮球图标选择器按钮 direct click');
        event.preventDefault();
        event.stopPropagation();
        void handleBubbleIconPickerOpen();
      });

      iframe_document.addEventListener('click', async event => {
        const target = event.target instanceof Element ? event.target : null;
        const picker_trigger = target?.closest<HTMLElement>('[data-open-bubble-icon-picker]');
        if (picker_trigger) {
          console.log('[LoreFrame] 悬浮球图标选择器按钮 delegated click');
        }
        if (!picker_trigger) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        await handleBubbleIconPickerOpen();
      });

      theme_sync_timer = host_window.setInterval(() => {
        if (!current_iframe_document?.body) {
          return;
        }
        const next_theme = resolveThemeFromSettings(getSettings());
        if (next_theme !== (iframe_body.dataset.theme === 'night' ? 'night' : 'day')) {
          apply_runtime_theme();
          return;
        }
        sync_theme_controls();
        sync_bubble_controls();
      }, 30 * 1000);

      sidebar_toggle?.addEventListener('click', () => {
        setSidebarOpen(iframe_body, !iframe_body.classList.contains('sidebar-open'));
      });

      online_main?.addEventListener(
        'click',
        event => {
          if (!isMobileViewport() || !iframe_body.classList.contains('sidebar-open')) {
            return;
          }
          const event_path = typeof event.composedPath === 'function' ? event.composedPath() : [];
          if (
            (settings_column && event_path.includes(settings_column)) ||
            (sidebar_toggle && event_path.includes(sidebar_toggle))
          ) {
            return;
          }
          const target = event.target instanceof Element ? event.target : null;
          if (target?.closest('.settings-column') || target?.closest('.sidebar-toggle')) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setSidebarOpen(iframe_body, false);
        },
        false,
      );

      const handle_view_switch = (next_view: MainViewName) => {
        switchMainView(iframe_document, next_view);
        if (next_view === 'sources') {
          collectSourceDebugSnapshot(iframe_document, '目录切换');
        }
        if (next_view === 'debug-tools' || next_view === 'prompt-viewer') {
          renderPromptViewer(iframe_document, '目录切换');
          renderRunLog(iframe_document);
        }
        if (
          next_view === 'settings' ||
          next_view === 'prompt-management' ||
          next_view === 'appearance' ||
          next_view === 'theater' ||
          next_view === 'theater-edit'
        ) {
          if (!prompt_is_dirty) {
            renderPromptSettings(iframe_document);
            sync_theme_controls();
            sync_bubble_controls();
          }
        }
        if (next_view === 'online') {
          renderOnlineContent(iframe_document);
        }
      };

      nav_buttons.forEach(button => {
        button.addEventListener('click', () => {
          const next_view = button.dataset.navView as MainViewName | undefined;
          if (!next_view) {
            return;
          }

          handle_view_switch(next_view);
          if (isMobileViewport()) {
            setSidebarOpen(iframe_body, false);
          }
        });
      });

      settings_nav_buttons.forEach(button => {
        button.addEventListener('click', () => {
          const next_view = button.dataset.settingsNavView as MainViewName | undefined;
          if (!next_view) {
            return;
          }
          handle_view_switch(next_view);
        });
      });

      const handle_appearance_color_change = (event: Event) => {
        const target = event.target instanceof HTMLInputElement ? event.target : null;
        if (!target?.matches?.('[data-appearance-color]')) {
          return;
        }
        const settings = getSettings();
        const theme = target.dataset.appearanceTheme as keyof SettingsAppearance | undefined;
        const key = target.dataset.appearanceKey as keyof SettingsAppearanceTheme | undefined;
        if (!theme || !key) {
          return;
        }
        const next_appearance = normalizeAppearanceSettings(settings.appearance);
        next_appearance[theme][key] = normalizeHexColor(target.value, next_appearance[theme][key]);
        saveSettings({
          ...settings,
          appearance: next_appearance,
        });
        applyAppearanceSettings(iframe_body, getSettings());
        applyFloatingLauncherAppearance();
        sync_bubble_controls();
        updateText(iframe_document, '[data-appearance-detail]', '美化方案已保存。');
      };
      iframe_document.addEventListener('input', handle_appearance_color_change);
      iframe_document.addEventListener('change', handle_appearance_color_change);

      reset_appearance?.addEventListener('click', () => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          appearance: getDefaultAppearanceSettings(),
          bubble_style: getDefaultBubbleStyleSettings(),
        });
        renderPromptSettings(iframe_document);
        sync_bubble_controls();
        applyAppearanceSettings(iframe_body, getSettings());
        applyFloatingLauncherAppearance();
        updateText(iframe_document, '[data-appearance-detail]', '已恢复默认美化方案。');
        showInlineToast(iframe_document, '已恢复默认美化方案。');
      });
      refresh_prompt_viewer?.addEventListener('click', () => {
        renderPromptViewer(iframe_document, '手动刷新');
      });

      clear_run_log?.addEventListener('click', () => {
        run_logs = [];
        renderRunLog(iframe_document);
      });

      clear_image_generation_log?.addEventListener('click', () => {
        image_generation_logs = [];
        renderImageGenerationLog(iframe_document);
      });

      trigger_image_generation?.addEventListener('click', async () => {
        const online_data = getCurrentOnlineData();
        const active_entry = online_data.active_entry;
        const active_variant = getEntryActiveVariant(active_entry);
        const source_html = String(active_entry?.html || active_variant?.html || online_data.html || '');
        const image_settings = normalizeImageGenerationSettings(getSettings().image_generation);
        const active_preset = image_settings.presets.find(preset => preset.id === image_settings.active_preset_id);
        const active_vibe_group = image_settings.vibe_groups.find(group => group.id === image_settings.active_vibe_group_id);
        const active_vibe_references = active_vibe_group?.references || [];
        const asset_count = (source_html.match(/data-image-asset(?:\s|=|>)/gi) || []).length;
        if (!asset_count) {
          appendImageGenerationLog('跳过', '当前页面没有可处理的生图资产');
          showInlineToast(iframe_document, '当前页面没有可处理的生图资产。');
          return;
        }
        if (!image_settings.enabled || image_settings.mode !== 'novelai' || !active_preset) {
          appendImageGenerationLog('跳过', '生图配置未激活', {
            enabled: image_settings.enabled,
            mode: image_settings.mode,
            preset: active_preset?.name || '',
          });
          showInlineToast(iframe_document, '请先开启生图、选择 NovelAI 并激活有效预设。');
          return;
        }
        const parser = new DOMParser().parseFromString(source_html, 'text/html');
        const assets = [...parser.querySelectorAll<HTMLElement>('[data-image-asset]')];
        const images = assets.map(asset => asset.querySelector<HTMLImageElement>('img')).filter(Boolean) as HTMLImageElement[];
        trigger_image_generation.disabled = true;
        appendImageGenerationLog('请求', `开始生成 ${images.length} 张图片`, {
          endpoint: active_preset.connection_mode === 'custom' ? active_preset.endpoint : 'NovelAI 官网',
          model: active_preset.model,
          size: `${active_preset.width}x${active_preset.height}`,
        });
        let success_count = 0;
        try {
          for (let index = 0; index < images.length; index += 1) {
            const image = images[index];
            const html_prompt = String(image.dataset.imagePrompt || '').trim();
            const prompt = [active_preset.positive_prompt, html_prompt].map(normalizeNovelAiPrompt).filter(Boolean).join(', ');
            const negative_prompt = normalizeNovelAiPrompt(active_preset.negative_prompt);
            appendImageGenerationLog('请求', `发送第 ${index + 1}/${images.length} 张图片请求`, {
              prompt: prompt.slice(0, 512),
              negative_prompt: negative_prompt.slice(0, 512),
            });
            const result = await requestNovelAiImage(active_preset, prompt, negative_prompt, active_vibe_references);
            image.src = result.image;
            image.removeAttribute('data-image-asset-rendered');
            const status = assets[index].querySelector<HTMLElement>('[data-image-generation-status]');
            if (status) {
              status.textContent = `已生成图片 · ${index + 1}/${images.length}`;
            }
            success_count += 1;
            appendImageGenerationLog('成功', `第 ${index + 1}/${images.length} 张图片生成完成`, {
              response: '图片已解析并写回 HTML。',
            });
          }
          const next_html = `<!doctype html>\n${parser.documentElement.outerHTML}`;
          if (active_entry) {
            updateOnlineEntry(active_entry.id, { html: next_html });
          }
          online_data.html = next_html;
          appendImageGenerationLog('完成', `手动生图完成：${success_count}/${images.length}`);
          renderOnlineContent(iframe_document);
          showInlineToast(iframe_document, `已生成 ${success_count}/${images.length} 张图片。`);
        } catch (error) {
          appendImageGenerationLog('错误', `生图失败：已完成 ${success_count}/${images.length}`, error);
          showInlineToast(iframe_document, `生图失败：${error instanceof Error ? error.message : String(error)}`);
        } finally {
          trigger_image_generation.disabled = false;
        }
      });

      save_all_settings?.addEventListener('click', () => {
        saveSettings(getSettings());
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '已保存全部设置。');
      });

      const switch_prompt_preset = (prompt_id: string) => {
        if (prompt_is_dirty && !host_window.confirm('当前预设有未保存修改，切换后会丢失。确定切换吗？')) {
          if (prompt_select) {
            prompt_select.value = getSettings().active_prompt_id;
          }
          return;
        }
        const settings = getSettings();
        const selected_prompt = settings.prompts.find(prompt => prompt.id === prompt_id);
        if (!selected_prompt) {
          return;
        }
        saveSettings({
          ...settings,
          active_prompt_id: selected_prompt.id,
          active_base_prompt_id: selected_prompt.base_prompt_id || settings.active_base_prompt_id,
          active_detail_prompt_id: selected_prompt.detail_prompt_id || settings.active_detail_prompt_id,
        });
        renderPromptSettings(iframe_document);
        set_prompt_dirty(false);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已切换完整预设。');
      };

      prompt_select?.addEventListener('change', () => switch_prompt_preset(prompt_select.value));
      prompt_menu_toggle?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (prompt_menu) {
          prompt_menu.hidden = !prompt_menu.hidden;
        }
      });
      prompt_menu?.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target : null;
        const option = target?.closest<HTMLElement>('[data-prompt-option]');
        if (!option) {
          return;
        }
        prompt_menu.hidden = true;
        switch_prompt_preset(option.dataset.promptOption || '');
      });

      prompt_actions_more?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        prompt_secondary_actions?.classList.toggle('is-open');
      });

      open_detail_library_manager_buttons.forEach(button => {
        button.addEventListener('click', show_detail_library_manager_dialog);
      });
      back_detail_library_page?.addEventListener('click', () => {
        if (detail_library_root) {
          detail_library_root.dataset.selectionMode = 'false';
          detail_library_root.dataset.selectedPromptIds = '';
        }
        handle_view_switch('prompt-management');
        updateText(iframe_document, '[data-prompt-settings-detail]', '已返回提示词管理。');
      });

      detail_manager_toggle_selection?.addEventListener('click', () => {
        const next_selection_mode = detail_library_root?.dataset.selectionMode === 'true' ? 'false' : 'true';
        if (detail_library_root) {
          detail_library_root.dataset.selectionMode = next_selection_mode;
          if (next_selection_mode === 'false') {
            detail_library_root.dataset.selectedPromptIds = '';
          }
        }
        renderPromptSettings(iframe_document);
        updateText(
          iframe_document,
          '[data-prompt-settings-detail]',
          next_selection_mode === 'true' ? '已进入选择状态，可批量操作。' : '已退出选择状态。',
        );
      });

      detail_manager_select_all?.addEventListener('click', () => {
        const visible_ids = [
          ...iframe_document.querySelectorAll<HTMLInputElement>('[data-detail-manager-select-prompt]'),
        ]
          .map(input => String(input.dataset.detailManagerSelectPrompt || ''))
          .filter(Boolean);
        set_detail_library_selected_ids(visible_ids);
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, `已选中 ${visible_ids.length} 个小剧场。`);
      });

      detail_manager_select_none?.addEventListener('click', () => {
        set_detail_library_selected_ids([]);
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '已取消当前选择。');
      });

      detail_manager_create_folder?.addEventListener('click', () => {
        const settings = getSettings();
        const name = host_window.prompt('请输入文件夹名称', '新的文件夹');
        if (!name) {
          return;
        }
        const folder = { id: createPromptId(), name: name.trim() || '新的文件夹' };
        saveSettings({
          ...settings,
          detail_prompt_folders: [...settings.detail_prompt_folders, folder],
        });
        if (detail_library_root) {
          detail_library_root.dataset.folderId = folder.id;
        }
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '已新建小剧场文件夹。');
      });

      detail_manager_rename_folder?.addEventListener('click', () => {
        const settings = getSettings();
        const current_folder_id = String(
          detail_library_root?.dataset.folderId || settings.detail_prompt_folders[0]?.id || '',
        );
        if (current_folder_id === '__all__') {
          showInlineToast(iframe_document, '请先选择一个具体文件夹。');
          return;
        }
        const current_folder = settings.detail_prompt_folders.find(folder => folder.id === current_folder_id);
        if (!current_folder) {
          showInlineToast(iframe_document, '没有找到要重命名的文件夹。');
          return;
        }
        const next_name = host_window.prompt('请输入新的文件夹名称', current_folder.name);
        if (next_name == null) {
          return;
        }
        const trimmed_name = next_name.trim();
        if (!trimmed_name) {
          showInlineToast(iframe_document, '文件夹名称不能为空。');
          return;
        }
        saveSettings({
          ...settings,
          detail_prompt_folders: settings.detail_prompt_folders.map(folder =>
            folder.id === current_folder_id ? { ...folder, name: trimmed_name } : folder,
          ),
        });
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, `已重命名文件夹为“${trimmed_name}”。`);
      });

      detail_manager_delete_folder?.addEventListener('click', async () => {
        const settings = getSettings();
        const current_folder_id = String(
          detail_library_root?.dataset.folderId || settings.detail_prompt_folders[0]?.id || '',
        );
        if (current_folder_id === '__all__') {
          showInlineToast(iframe_document, '请先选择一个具体文件夹。');
          return;
        }
        const current_folder = settings.detail_prompt_folders.find(folder => folder.id === current_folder_id);
        const fallback_folder = settings.detail_prompt_folders.find(folder => folder.id !== current_folder_id);
        if (!current_folder) {
          showInlineToast(iframe_document, '没有找到要删除的文件夹。');
          return;
        }
        const prompts_in_folder = settings.detail_prompts.filter(prompt => prompt.folder_id === current_folder_id);
        const delete_mode = await show_delete_folder_mode_dialog(
          current_folder.name,
          fallback_folder?.name || null,
          prompts_in_folder.length,
        );
        if (!delete_mode) {
          return;
        }
        let next_folders = settings.detail_prompt_folders.filter(folder => folder.id !== current_folder_id);
        const next_prompts =
          delete_mode === 'move' && fallback_folder
            ? settings.detail_prompts.map(prompt =>
                prompt.folder_id === current_folder_id ? { ...prompt, folder_id: fallback_folder.id } : prompt,
              )
            : settings.detail_prompts.filter(prompt => prompt.folder_id !== current_folder_id);
        if (!next_folders.length) {
          const replacement_folder = { id: createPromptId(), name: '默认文件夹' };
          next_folders = [replacement_folder];
        }
        const next_active_detail_prompt_id =
          next_prompts.find(prompt => prompt.id === settings.active_detail_prompt_id)?.id ||
          next_prompts[0]?.id ||
          settings.active_detail_prompt_id;
        saveSettings({
          ...settings,
          detail_prompt_folders: next_folders,
          detail_prompts: next_prompts,
          active_detail_prompt_id: next_active_detail_prompt_id,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            prompt_ids: (settings.random_detail_prompt?.prompt_ids || []).filter(
              id => !prompts_in_folder.some(prompt => prompt.id === id) || delete_mode === 'move',
            ),
          },
        });
        if (detail_library_root) {
          detail_library_root.dataset.folderId =
            delete_mode === 'move' && fallback_folder ? fallback_folder.id : next_folders[0]?.id || '';
          detail_library_root.dataset.selectedPromptId = next_prompts[0]?.id || '';
        }
        renderPromptSettings(iframe_document);
        showInlineToast(
          iframe_document,
          delete_mode === 'move' ? '已删除文件夹，内容已迁移。' : '已删除文件夹和其中内容。',
        );
      });

      detail_manager_create_prompt?.addEventListener('click', async () => {
        const settings = getSettings();
        const current_folder_id =
          detail_library_root?.dataset.folderId === '__all__'
            ? String(settings.detail_prompt_folders[0]?.id || '')
            : String(detail_library_root?.dataset.folderId || settings.detail_prompt_folders[0]?.id || '');
        const name = host_window.prompt('请输入小剧场标题', '新的小剧场');
        if (!name) {
          return;
        }
        const prompt = {
          id: createPromptId(),
          name: name.trim() || '新的小剧场',
          description: '',
          content: '',
          folder_id: current_folder_id,
          tags: [],
          created_at: new Date().toISOString(),
        };
        saveSettings({
          ...settings,
          active_detail_prompt_id: prompt.id,
          detail_prompts: [...settings.detail_prompts, prompt],
        });
        if (detail_library_root) {
          detail_library_root.dataset.selectedPromptId = prompt.id;
          detail_library_root.dataset.folderId = current_folder_id;
        }
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '已新建小剧场。');
        open_detail_prompt_editor_view(prompt.id);
      });

      detail_manager_activate_selected?.addEventListener('click', () => {
        const selected_ids = [...get_detail_library_checked_ids()];
        if (!selected_ids.length) {
          showInlineToast(iframe_document, '请先选择要激活的小剧场。');
          return;
        }
        const settings = getSettings();
        const merged_ids = [...new Set([...(settings.random_detail_prompt?.prompt_ids || []), ...selected_ids])];
        saveSettings({
          ...settings,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            prompt_ids: merged_ids,
          },
        });
        renderPromptSettings(iframe_document);
        updateText(iframe_document, '[data-prompt-settings-detail]', `已激活 ${selected_ids.length} 个小剧场。`);
        showInlineToast(iframe_document, '已批量激活小剧场。');
      });

      detail_manager_deactivate_selected?.addEventListener('click', () => {
        const selected_ids = [...get_detail_library_checked_ids()];
        if (!selected_ids.length) {
          showInlineToast(iframe_document, '请先选择要取消激活的小剧场。');
          return;
        }
        const settings = getSettings();
        saveSettings({
          ...settings,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            prompt_ids: (settings.random_detail_prompt?.prompt_ids || []).filter(id => !selected_ids.includes(id)),
          },
        });
        renderPromptSettings(iframe_document);
        updateText(iframe_document, '[data-prompt-settings-detail]', `已取消激活 ${selected_ids.length} 个小剧场。`);
        showInlineToast(iframe_document, '已批量取消激活。');
      });

      detail_manager_delete_selected?.addEventListener('click', async () => {
        const selected_ids = [...get_detail_library_checked_ids()];
        if (!selected_ids.length) {
          showInlineToast(iframe_document, '请先勾选要删除的小剧场。');
          return;
        }
        const settings = getSettings();
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'danger',
          title: '批量删除小剧场',
          message: `将删除所选 ${selected_ids.length} 个小剧场。此操作不可撤销。`,
          confirmText: '删除',
        });
        if (!confirmed) {
          return;
        }
        const selected_builtin_ids = selected_ids.filter(id =>
          settings.detail_prompts.some(prompt => prompt.id === id && prompt.source === 'default'),
        );
        const selected_personal_ids = selected_ids.filter(id => !selected_builtin_ids.includes(id));
        const next_deleted_ids = [
          ...new Set([...(settings.deleted_builtin_detail_prompt_ids || []), ...selected_builtin_ids]),
        ];
        const next_prompts = settings.detail_prompts.filter(prompt => !selected_personal_ids.includes(prompt.id));
        saveSettings({
          ...settings,
          detail_prompts: next_prompts,
          deleted_builtin_detail_prompt_ids: next_deleted_ids,
          active_detail_prompt_id: next_prompts[0]?.id || settings.active_detail_prompt_id,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            prompt_ids: (settings.random_detail_prompt?.prompt_ids || []).filter(id => !selected_ids.includes(id)),
          },
        });
        set_detail_library_selected_ids([]);
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '已删除所选小剧场。');
      });

      detail_manager_move_selected?.addEventListener('click', async () => {
        const selected_ids = [...get_detail_library_checked_ids()];
        if (!selected_ids.length) {
          showInlineToast(iframe_document, '请先勾选要移动的小剧场。');
          return;
        }
        const settings = getSettings();
        const current_folder_id = String(detail_library_root?.dataset.folderId || '');
        const target_folder_id = await show_detail_folder_select_dialog(
          current_folder_id === '__all__' ? undefined : current_folder_id,
          '批量移动到文件夹',
        );
        if (!target_folder_id) {
          return;
        }
        const target_folder = settings.detail_prompt_folders.find(folder => folder.id === target_folder_id);
        if (!target_folder) {
          showInlineToast(iframe_document, '目标文件夹不存在。');
          return;
        }
        const selected_ids_set = new Set(selected_ids);
        const next_prompts = settings.detail_prompts.map(prompt =>
          selected_ids_set.has(prompt.id)
            ? { ...prompt, folder_id: target_folder_id, source: 'personal' as const }
            : prompt,
        );
        saveSettings({
          ...settings,
          detail_prompts: next_prompts,
        });
        set_detail_library_selected_ids([]);
        if (detail_library_root) {
          detail_library_root.dataset.folderId = target_folder_id;
        }
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, `已将 ${selected_ids.length} 个小剧场移动到“${target_folder.name}”。`);
      });

      detail_manager_sort_folders?.addEventListener('click', async () => {
        const settings = getSettings();
        if (settings.detail_prompt_folders.length < 2) {
          showInlineToast(iframe_document, '文件夹数量不足，无法排序。');
          return;
        }
        const next_folders = await show_detail_folder_sort_dialog();
        if (!next_folders) {
          return;
        }
        saveSettings({
          ...settings,
          detail_prompt_folders: next_folders,
        });
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '已更新文件夹排序。');
      });

      restore_builtin_detail_prompts_button?.addEventListener('click', () => {
        void restore_builtin_detail_prompts_handler();
      });

      detail_manager_import?.addEventListener('click', async () => {
        const mode = await show_detail_import_mode_dialog();
        if (!mode) {
          return;
        }
        const file = await choose_detail_import_file(mode === 'text' ? '.txt,text/plain' : 'application/json,.json');
        if (!file) {
          return;
        }
        try {
          const text = await read_file_text(file);
          const preview: DetailImportPreview = {
            mode,
            suggestedFolderName: slugify_file_label(file.name),
            entries:
              mode === 'json'
                ? parse_detail_import_json(JSON.parse(text) as ImportPromptPayload)
                : mode === 'worldbook'
                  ? parse_worldbook_entries(JSON.parse(text) as ImportPromptPayload)
                  : parse_detail_text_entries(text),
          };
          if (!preview.entries.length) {
            showInlineToast(iframe_document, '没有识别到可导入的小剧场。');
            return;
          }
          const selection = await show_detail_import_preview_dialog(preview);
          if (!selection) {
            return;
          }
          const count = apply_detail_import_preview(preview, selection);
          renderPromptSettings(iframe_document);
          showInlineToast(iframe_document, `已导入 ${count} 个小剧场。`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          showInlineToast(iframe_document, message || '导入失败。');
        }
      });

      detail_manager_export?.addEventListener('click', async () => {
        const format = await show_detail_export_format_dialog();
        if (!format) {
          return;
        }
        const settings = getSettings();
        const selected_ids = get_detail_library_selected_ids();
        const current_folder_id = String(
          detail_library_root?.dataset.folderId || settings.detail_prompt_folders[0]?.id || '',
        );
        const items = settings.detail_prompts.filter(prompt =>
          selected_ids.size
            ? selected_ids.has(prompt.id)
            : current_folder_id === '__all__'
              ? true
              : prompt.folder_id === current_folder_id,
        );
        const folder_label =
          current_folder_id === '__all__'
            ? '全部小剧场'
            : settings.detail_prompt_folders.find(folder => folder.id === current_folder_id)?.name || '小剧场';
        download_detail_export(items, format, folder_label);
      });

      detail_manager_manage_tags?.addEventListener('click', () => {
        void show_detail_tag_manager_dialog();
      });

      detail_manager_card_grid?.addEventListener('click', event => {
        const raw_target = event.target;
        const target = is_dom_element(raw_target)
          ? raw_target
          : is_dom_node(raw_target)
            ? raw_target.parentElement
            : null;
        console.info('[LoreFrame] 小剧场卡片区点击', target?.tagName || 'unknown', target?.className || '');
        const edit_button = find_event_path_element(event, '[data-detail-manager-edit-prompt]');
        if (edit_button) {
          const prompt_id = edit_button.dataset.detailManagerEditPrompt || '';
          console.info('[LoreFrame] 卡片区直连编辑按钮', prompt_id);
          event.preventDefault();
          event.stopPropagation();
          if (prompt_id) {
            open_detail_prompt_editor_view(prompt_id);
          }
          return;
        }
        const delete_button = find_event_path_element(event, '[data-detail-manager-delete-prompt]');
        if (delete_button) {
          const prompt_id = delete_button.dataset.detailManagerDeletePrompt || '';
          event.preventDefault();
          event.stopPropagation();
          void delete_detail_prompt_item(prompt_id);
          return;
        }
        const open_button = find_event_path_element(event, '[data-detail-manager-open-prompt]');
        if (open_button) {
          const prompt_id = open_button.dataset.detailManagerOpenPrompt || '';
          console.info('[LoreFrame] 卡片区点击标题按钮', prompt_id);
        }
      });

      detail_manager_search?.addEventListener('input', () => {
        set_detail_manager_filters({ search: detail_manager_search.value });
        renderPromptSettings(iframe_document);
      });
      detail_manager_sort?.addEventListener('change', () => {
        set_detail_manager_filters({ sort: detail_manager_sort.value });
        renderPromptSettings(iframe_document);
      });
      detail_manager_source_filter?.addEventListener('change', () => {
        set_detail_manager_filters({ source: detail_manager_source_filter.value });
        renderPromptSettings(iframe_document);
      });
      detail_manager_active_filter?.addEventListener('change', () => {
        set_detail_manager_filters({ active: detail_manager_active_filter.value });
        renderPromptSettings(iframe_document);
      });
      detail_manager_tag_filter?.addEventListener('change', () => {
        set_detail_manager_filters({ tag: detail_manager_tag_filter.value });
        renderPromptSettings(iframe_document);
      });
      detail_edit_tags?.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ',') {
          return;
        }
        event.preventDefault();
        sync_detail_edit_tags_input(parse_detail_tags(detail_edit_tags.value));
      });
      detail_edit_tags?.addEventListener('input', () => {
        if (!/[，,]/.test(detail_edit_tags.value)) {
          return;
        }
        sync_detail_edit_tags_input(parse_detail_tags(detail_edit_tags.value));
      });
      detail_edit_tags?.addEventListener('blur', () => {
        sync_detail_edit_tags_input(parse_detail_tags(detail_edit_tags.value));
      });
      detail_edit_tag_suggestions?.addEventListener('click', event => {
        const suggestion = find_event_path_element(event, '[data-detail-edit-tag-preset]');
        if (!suggestion) {
          return;
        }
        event.preventDefault();
        append_detail_edit_tags([String(suggestion.dataset.detailEditTagPreset || '')]);
      });
      back_detail_edit_page?.addEventListener('click', () => {
        handle_view_switch('theater');
      });
      cancel_detail_edit?.addEventListener('click', () => {
        handle_view_switch('theater');
      });
      save_detail_edit?.addEventListener('click', () => {
        const settings = getSettings();
        const prompt_id = String(detail_library_root?.dataset.editPromptId || '');
        const target_prompt = settings.detail_prompts.find(item => item.id === prompt_id);
        if (!target_prompt) {
          showInlineToast(iframe_document, '没有找到要保存的小剧场。');
          return;
        }
        const next_tags = parse_detail_tags(String(detail_edit_tags?.value || ''));
        saveSettings({
          ...settings,
          active_detail_prompt_id: target_prompt.id,
          detail_prompt_tags: [...new Set([...(settings.detail_prompt_tags || []), ...next_tags])],
          detail_prompts: settings.detail_prompts.map(item =>
            item.id === target_prompt.id
              ? {
                  ...item,
                  name: detail_edit_name?.value?.trim() || '未命名小剧场',
                  description: detail_edit_description?.value || '',
                  content: detail_edit_content?.value || '',
                  tags: next_tags,
                }
              : item,
          ),
        });
        showInlineToast(iframe_document, '已保存小剧场。');
        handle_view_switch('theater');
      });

      iframe_document.addEventListener('click', event => {
        const early_edit_button = find_event_path_element(event, '[data-detail-manager-edit-prompt]');
        if (early_edit_button) {
          const prompt_id = early_edit_button.dataset.detailManagerEditPrompt || '';
          console.info('[LoreFrame] 捕获到编辑按钮点击', prompt_id);
          event.preventDefault();
          event.stopPropagation();
          if (prompt_id) {
            open_detail_prompt_editor_view(prompt_id);
          }
          return;
        }
        const early_delete_button = find_event_path_element(event, '[data-detail-manager-delete-prompt]');
        if (early_delete_button) {
          const prompt_id = early_delete_button.dataset.detailManagerDeletePrompt || '';
          event.preventDefault();
          event.stopPropagation();
          void delete_detail_prompt_item(prompt_id);
          return;
        }
        const folder_button = find_event_path_element(event, '[data-detail-manager-folder-id]');
        if (folder_button && detail_library_root) {
          console.info('[LoreFrame] 点击小剧场文件夹', {
            folder_id: folder_button.dataset.detailManagerFolderId || '',
            folder_text: folder_button.textContent?.trim() || '',
            current_folder_id: detail_library_root.dataset.folderId || '',
            target_tag: folder_button.tagName,
            target_class: folder_button.className,
          });
          if (detail_library_root.dataset.folderJustDragged === 'true') {
            console.info('[LoreFrame] 忽略文件夹点击: folderJustDragged=true');
            detail_library_root.dataset.folderJustDragged = 'false';
            return;
          }
          switch_detail_library_folder(folder_button.dataset.detailManagerFolderId || '', {
            detail: '已切换小剧场文件夹。',
          });
          return;
        }
        const open_detail_button = find_event_path_element(event, '[data-detail-manager-open-prompt]');
        if (open_detail_button) {
          const prompt_id = open_detail_button.dataset.detailManagerOpenPrompt || '';
          const settings = getSettings();
          const selected_prompt = settings.detail_prompts.find(prompt => prompt.id === prompt_id);
          if (!selected_prompt) {
            return;
          }
          saveSettings({
            ...settings,
            active_detail_prompt_id: selected_prompt.id,
          });
          if (detail_library_root) {
            detail_library_root.dataset.selectedPromptId = selected_prompt.id;
            detail_library_root.dataset.folderId =
              selected_prompt.folder_id || detail_library_root.dataset.folderId || '';
          }
          renderPromptSettings(iframe_document);
          updateText(iframe_document, '[data-prompt-settings-detail]', '已切换当前查看的小剧场。');
          return;
        }
      });

      iframe_document.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        const target = event.target instanceof Element ? event.target : null;
        const folder_button = target?.closest<HTMLElement>('[data-detail-manager-folder-id]');
        if (!folder_button || !detail_library_root) {
          return;
        }
        event.preventDefault();
        console.info('[LoreFrame] 键盘切换小剧场文件夹', {
          folder_id: folder_button.dataset.detailManagerFolderId || '',
          folder_text: folder_button.textContent?.trim() || '',
          current_folder_id: detail_library_root.dataset.folderId || '',
          key: event.key,
        });
        switch_detail_library_folder(folder_button.dataset.detailManagerFolderId || '', {
          detail: '已切换小剧场文件夹。',
        });
      });

      iframe_document.addEventListener('pointerup', event => {
        const folder_button = find_event_path_element(event, '[data-detail-manager-folder-id]');
        if (!folder_button || !detail_library_root) {
          return;
        }
        if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
          return;
        }
        console.info('[LoreFrame] pointerup 切换小剧场文件夹', {
          folder_id: folder_button.dataset.detailManagerFolderId || '',
          folder_text: folder_button.textContent?.trim() || '',
          current_folder_id: detail_library_root.dataset.folderId || '',
          pointer_type: event.pointerType,
        });
        event.preventDefault();
        event.stopPropagation();
        if (detail_library_root.dataset.folderJustDragged === 'true') {
          console.info('[LoreFrame] 忽略 pointerup 文件夹切换: folderJustDragged=true');
          detail_library_root.dataset.folderJustDragged = 'false';
          return;
        }
        switch_detail_library_folder(folder_button.dataset.detailManagerFolderId || '', {
          detail: '已切换小剧场文件夹。',
        });
      });

      iframe_document.addEventListener('change', event => {
        const target = event.target instanceof HTMLInputElement ? event.target : null;
        if (!target?.matches('[data-detail-manager-select-prompt]')) {
          return;
        }
        const prompt_id = String(target.dataset.detailManagerSelectPrompt || '');
        const selected_ids = get_detail_library_selected_ids();
        if (target.checked) {
          selected_ids.add(prompt_id);
        } else {
          selected_ids.delete(prompt_id);
        }
        set_detail_library_selected_ids(selected_ids);
        renderPromptSettings(iframe_document);
      });

      base_prompt_select?.addEventListener('change', () => {
        const settings = getSettings();
        const selected_base = settings.base_prompts.find(prompt => prompt.id === base_prompt_select.value);
        if (!selected_base) {
          return;
        }
        saveSettings({
          ...settings,
          active_base_prompt_id: selected_base.id,
        });
        updateValue(iframe_document, '[data-base-prompt-name]', selected_base.name);
        updateValue(iframe_document, '[data-base-prompt-content]', selected_base.content);
        set_template_edit_mode('base', false);
        update_publish_button_states();
        set_prompt_dirty(false);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已切换基础提示词，将立即用于后续生成。');
      });

      detail_prompt_select?.addEventListener('change', () => {
        const settings = getSettings();
        const selected_detail = settings.detail_prompts.find(prompt => prompt.id === detail_prompt_select.value);
        if (!selected_detail) {
          return;
        }
        saveSettings({
          ...settings,
          active_detail_prompt_id: selected_detail.id,
        });
        updateValue(iframe_document, '[data-detail-prompt-name]', selected_detail.name);
        updateValue(iframe_document, '[data-detail-prompt-name-display]', selected_detail.name);
        updateValue(iframe_document, '[data-detail-prompt-description]', selected_detail.description || '');
        updateValue(iframe_document, '[data-detail-prompt-content]', selected_detail.content);
        if (detail_library_root) {
          detail_library_root.dataset.selectedPromptId = selected_detail.id;
          detail_library_root.dataset.folderId =
            selected_detail.folder_id || detail_library_root.dataset.folderId || '';
        }
        set_template_edit_mode('detail', false);
        update_publish_button_states();
        set_prompt_dirty(false);
        updateText(
          iframe_document,
          '[data-prompt-settings-detail]',
          '已切换小剧场，将立即用于后续生成；开启随机时仅使用勾选范围。',
        );
      });

      random_detail_enabled?.addEventListener('change', () => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            enabled: Boolean(random_detail_enabled.checked),
          },
        });
        updateText(
          iframe_document,
          '[data-prompt-settings-detail]',
          random_detail_enabled.checked ? '已开启随机小剧场。' : '已关闭随机小剧场。',
        );
        showInlineToast(iframe_document, random_detail_enabled.checked ? '已开启随机小剧场。' : '已关闭随机小剧场。');
      });

      random_detail_count?.addEventListener('change', () => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            count: Math.max(1, Math.min(10, Math.floor(Number(random_detail_count.value) || 1))),
          },
        });
        renderPromptSettings(iframe_document);
        updateText(
          iframe_document,
          '[data-prompt-settings-detail]',
          `每次将最多抽取 ${getSettings().random_detail_prompt.count} 个小剧场。`,
        );
      });

      random_detail_probability?.addEventListener('change', () => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            trigger_probability: Math.max(0, Math.min(100, Math.floor(Number(random_detail_probability.value) || 0))),
          },
        });
        renderPromptSettings(iframe_document);
        updateText(
          iframe_document,
          '[data-prompt-settings-detail]',
          `小剧场触发概率已更新为 ${getSettings().random_detail_prompt.trigger_probability}%。`,
        );
      });

      random_detail_list?.addEventListener('change', event => {
        const target = event.target instanceof HTMLInputElement ? event.target : null;
        if (!target?.matches?.('[data-random-detail-id]')) {
          return;
        }
        const settings = getSettings();
        const selected_ids = [
          ...random_detail_list.querySelectorAll<HTMLInputElement>('[data-random-detail-id]:checked'),
        ]
          .map(input => input.dataset.randomDetailId)
          .filter((value): value is string => Boolean(value));
        saveSettings({
          ...settings,
          random_detail_prompt: {
            ...(settings.random_detail_prompt || {}),
            prompt_ids: selected_ids,
          },
        });
        updateText(
          iframe_document,
          '[data-prompt-settings-detail]',
          `随机范围已更新：${selected_ids.length} 个小剧场。`,
        );
      });

      summary_tag_select?.addEventListener('change', () => {
        const settings = getSettings();
        const selected_tag = settings.summary_tags.find(tag => tag.id === summary_tag_select.value);
        if (!selected_tag) {
          return;
        }
        saveSettings({
          ...settings,
          active_summary_tag_id: selected_tag.id,
        });
        updateValue(iframe_document, '[data-summary-tag-name]', selected_tag.name);
        updateValue(iframe_document, '[data-summary-open-tag]', selected_tag.open_tag);
        updateValue(iframe_document, '[data-summary-close-tag]', selected_tag.close_tag);
        set_summary_tag_edit_mode(false);
        update_publish_button_states();
        updateText(iframe_document, '[data-runtime-settings-detail]', '已切换预设摘要标签。');
      });

      edit_base_prompt?.addEventListener('click', () => {
        update_publish_button_states();
        set_template_edit_mode('base', true);
      });
      edit_detail_prompt?.addEventListener('click', () => {
        update_publish_button_states();
        set_template_edit_mode('detail', true);
      });
      cancel_base_prompt?.addEventListener('click', () => cancel_template_edit('base'));
      cancel_detail_prompt?.addEventListener('click', () => cancel_template_edit('detail'));
      const delete_template_prompt = async (type: PromptTemplateType) => {
        const settings = getSettings();
        const is_base = type === 'base';
        const select = is_base ? base_prompt_select : detail_prompt_select;
        const list_key = is_base ? 'base_prompts' : 'detail_prompts';
        const active_key = is_base ? 'active_base_prompt_id' : 'active_detail_prompt_id';
        const label = is_base ? '基础提示词' : '小剧场';
        const active_id = select?.value || settings[active_key];
        const active_prompt = settings[list_key].find(prompt => prompt.id === active_id);
        if (!active_prompt) {
          return;
        }
        if (active_prompt.source === 'default') {
          updateText(
            iframe_document,
            '[data-prompt-settings-detail]',
            '内置' + label + '不能删除，可以另存为本地模板后编辑。',
          );
          showInlineToast(iframe_document, '内置' + label + '不能删除。');
          return;
        }
        if (active_prompt.source === 'published') {
          updateText(iframe_document, '[data-prompt-settings-detail]', '发布' + label + '请先取消发布。');
          showInlineToast(iframe_document, '发布' + label + '请先取消发布。');
          return;
        }
        if (settings[list_key].length <= 1) {
          updateText(iframe_document, '[data-prompt-settings-detail]', '至少需要保留一条' + label + '。');
          return;
        }
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'danger',
          title: '确认删除' + label,
          message: '将删除当前' + label + '：“' + active_prompt.name + '”。删除后会自动切换到下一条可用内容。',
          confirmText: '删除',
        });
        if (!confirmed) {
          return;
        }
        const next_list = settings[list_key].filter(prompt => prompt.id !== active_id);
        const next_active = next_list[0]?.id || '';
        const next_settings = {
          ...settings,
          [active_key]: next_active,
          [list_key]: next_list,
        };
        saveSettings(next_settings);
        renderPromptSettings(iframe_document);
        set_prompt_dirty(true);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已删除' + label + '。');
        showInlineToast(iframe_document, '已删除' + label + '。');
      };
      delete_base_prompt?.addEventListener('click', () => delete_template_prompt('base'));
      delete_detail_prompt?.addEventListener('click', () => delete_template_prompt('detail'));
      const toggle_publish_template_prompt = (type: PromptTemplateType) => {
        const settings = getSettings();
        const is_base = type === 'base';
        const select = is_base ? base_prompt_select : detail_prompt_select;
        const name_input = is_base ? base_prompt_name : detail_prompt_name;
        const content_input = is_base ? base_prompt_content : detail_prompt_content;
        const active_id =
          select?.value ||
          (is_base ? settings.active_base_prompt_id : settings.active_detail_prompt_id) ||
          createPromptId();
        const list = is_base ? settings.base_prompts : settings.detail_prompts;
        const active_prompt = list.find(prompt => prompt.id === active_id);
        const published_items = is_base ? getPublishedBasePromptItems() : getPublishedDetailPromptItems();
        const prompt_label = is_base ? '基础提示词' : '小剧场';

        if (published_items.some(prompt => prompt.id === active_id)) {
          if (!host_window.confirm(`确定取消发布当前${prompt_label}吗？`)) {
            return;
          }
          const ok = is_base
            ? savePublishedBasePromptItems(published_items.filter(prompt => prompt.id !== active_id))
            : savePublishedDetailPromptItems(published_items.filter(prompt => prompt.id !== active_id));
          if (!ok) {
            updateText(
              iframe_document,
              '[data-prompt-settings-detail]',
              `取消发布${prompt_label}失败：当前运行环境可能不支持脚本变量写入。`,
            );
            showInlineToast(iframe_document, `取消发布${prompt_label}失败：当前运行环境可能不支持脚本变量写入。`);
            return;
          }
          renderPromptSettings(iframe_document);
          updateText(iframe_document, '[data-prompt-settings-detail]', `已取消发布${prompt_label}。`);
          showInlineToast(iframe_document, `已取消发布${prompt_label}。`);
          return;
        }

        const prompt = stripPromptItemRuntimeFields(
          {
            id: active_id,
            name:
              (is_base ? name_input?.value?.trim() : detail_prompt_name_display?.value?.trim()) ||
              active_prompt?.name ||
              `未命名${prompt_label}`,
            description: is_base ? '' : detail_prompt_description?.value || active_prompt?.description || '',
            content: content_input?.value || active_prompt?.content || '',
            folder_id: is_base
              ? 'detail-folder-default'
              : active_prompt?.folder_id ||
                detail_library_root?.dataset.folderId ||
                getSettings().detail_prompt_folders[0]?.id ||
                'detail-folder-default',
          },
          `未命名${prompt_label}`,
        );
        if (!prompt.content.trim()) {
          updateText(iframe_document, '[data-prompt-settings-detail]', `保存到发布失败：${prompt_label}内容不能为空。`);
          showInlineToast(iframe_document, `保存到发布失败：${prompt_label}内容不能为空。`);
          return;
        }
        const next_published = published_items.some(item => item.id === active_id)
          ? published_items.map(item => (item.id === active_id ? prompt : item))
          : [...published_items, prompt];
        const ok = is_base
          ? savePublishedBasePromptItems(next_published)
          : savePublishedDetailPromptItems(next_published);
        if (!ok) {
          updateText(
            iframe_document,
            '[data-prompt-settings-detail]',
            `保存${prompt_label}到发布失败：当前运行环境可能不支持脚本变量写入。`,
          );
          showInlineToast(iframe_document, `保存${prompt_label}到发布失败：当前运行环境可能不支持脚本变量写入。`);
          return;
        }
        renderPromptSettings(iframe_document);
        updateText(iframe_document, '[data-prompt-settings-detail]', `已保存${prompt_label}到发布。`);
        showInlineToast(iframe_document, `已保存${prompt_label}到发布。`);
      };

      toggle_publish_base_prompt?.addEventListener('click', () => toggle_publish_template_prompt('base'));
      toggle_publish_detail_prompt?.addEventListener('click', () => toggle_publish_template_prompt('detail'));
      edit_summary_tag?.addEventListener('click', () => {
        update_publish_button_states();
        set_summary_tag_edit_mode(true);
      });
      cancel_summary_tag?.addEventListener('click', cancel_summary_tag_edit);
      delete_summary_tag?.addEventListener('click', async () => {
        const settings = getSettings();
        const active_id = summary_tag_select?.value || settings.active_summary_tag_id;
        const active_tag = settings.summary_tags.find(tag => tag.id === active_id);
        if (!active_tag) {
          return;
        }
        if (active_tag.source === 'default') {
          updateText(
            iframe_document,
            '[data-runtime-settings-detail]',
            '内置摘要标签不能删除，可以另存为本地标签后编辑。',
          );
          showInlineToast(iframe_document, '内置摘要标签不能删除。');
          return;
        }
        if (active_tag.source === 'published') {
          updateText(iframe_document, '[data-runtime-settings-detail]', '发布摘要标签请先取消发布。');
          showInlineToast(iframe_document, '发布摘要标签请先取消发布。');
          return;
        }
        if (settings.summary_tags.length <= 1) {
          updateText(iframe_document, '[data-runtime-settings-detail]', '至少需要保留一条摘要标签。');
          showInlineToast(iframe_document, '至少需要保留一条摘要标签。');
          return;
        }
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'danger',
          title: '确认删除摘要标签',
          message: '将删除当前摘要标签：“' + active_tag.name + '”。删除后会切换到第一条可用摘要标签。',
          confirmText: '删除',
        });
        if (!confirmed) {
          return;
        }
        const next_tags = settings.summary_tags.filter(tag => tag.id !== active_id);
        saveSettings({
          ...settings,
          active_summary_tag_id: next_tags[0]?.id || '',
          summary_tags: next_tags,
        });
        renderPromptSettings(iframe_document);
        updateText(iframe_document, '[data-runtime-settings-detail]', '已删除当前摘要标签。');
        showInlineToast(iframe_document, '已删除当前摘要标签。');
      });

      save_base_prompt?.addEventListener('click', () => {
        const settings = getSettings();
        const prompt_id = base_prompt_select?.value || settings.active_base_prompt_id;
        const prompt = {
          id: prompt_id,
          name: base_prompt_name?.value?.trim() || '未命名基础提示词',
          content: base_prompt_content?.value || '',
        };
        saveSettings({
          ...settings,
          active_base_prompt_id: prompt_id,
          base_prompts: settings.base_prompts.some(item => item.id === prompt_id)
            ? settings.base_prompts.map(item => (item.id === prompt_id ? prompt : item))
            : [...settings.base_prompts, prompt],
        });
        renderPromptSettings(iframe_document);
        set_prompt_dirty(true);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已保存基础提示词。');
        showInlineToast(iframe_document, '已保存基础提示词。');
      });

      save_as_base_prompt?.addEventListener('click', () => {
        const settings = getSettings();
        const default_name = base_prompt_name?.value?.trim() || '新的基础提示词';
        const name = host_window.prompt('请输入基础提示词名称', default_name);
        if (!name) {
          return;
        }
        const prompt = {
          id: createPromptId(),
          name: name.trim() || default_name,
          content: base_prompt_content?.value || '',
        };
        saveSettings({
          ...settings,
          active_base_prompt_id: prompt.id,
          base_prompts: [...settings.base_prompts, prompt],
        });
        renderPromptSettings(iframe_document);
        set_prompt_dirty(true);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已另存为新的基础提示词。');
        showInlineToast(iframe_document, '已另存为新的基础提示词。');
      });

      save_detail_prompt?.addEventListener('click', () => {
        const settings = getSettings();
        const prompt_id = detail_prompt_select?.value || settings.active_detail_prompt_id;
        const current_folder_id = String(
          detail_library_root?.dataset.folderId || settings.detail_prompt_folders[0]?.id || '',
        );
        const prompt = {
          id: prompt_id,
          name: detail_prompt_name_display?.value?.trim() || detail_prompt_name?.value?.trim() || '未命名小剧场',
          description: detail_prompt_description?.value || '',
          content: detail_prompt_content?.value || '',
          folder_id:
            settings.detail_prompts.find(item => item.id === prompt_id)?.folder_id ||
            current_folder_id ||
            'detail-folder-default',
          tags: settings.detail_prompts.find(item => item.id === prompt_id)?.tags || [],
          created_at:
            settings.detail_prompts.find(item => item.id === prompt_id)?.created_at || new Date().toISOString(),
        };
        saveSettings({
          ...settings,
          active_detail_prompt_id: prompt_id,
          detail_prompts: settings.detail_prompts.some(item => item.id === prompt_id)
            ? settings.detail_prompts.map(item => (item.id === prompt_id ? prompt : item))
            : [...settings.detail_prompts, prompt],
        });
        renderPromptSettings(iframe_document);
        set_prompt_dirty(true);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已保存小剧场。');
        showInlineToast(iframe_document, '已保存小剧场。');
      });

      save_as_detail_prompt?.addEventListener('click', () => {
        const settings = getSettings();
        const current_folder_id = String(
          detail_library_root?.dataset.folderId || settings.detail_prompt_folders[0]?.id || '',
        );
        const default_name =
          detail_prompt_name_display?.value?.trim() || detail_prompt_name?.value?.trim() || '新的小剧场';
        const name = host_window.prompt('请输入小剧场名称', default_name);
        if (!name) {
          return;
        }
        const prompt = {
          id: createPromptId(),
          name: name.trim() || default_name,
          description: detail_prompt_description?.value || '',
          content: detail_prompt_content?.value || '',
          folder_id: current_folder_id || 'detail-folder-default',
          tags: [],
          created_at: new Date().toISOString(),
        };
        saveSettings({
          ...settings,
          active_detail_prompt_id: prompt.id,
          detail_prompts: [...settings.detail_prompts, prompt],
        });
        renderPromptSettings(iframe_document);
        if (detail_library_root) {
          detail_library_root.dataset.selectedPromptId = prompt.id;
        }
        set_prompt_dirty(true);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已另存为新的小剧场。');
        showInlineToast(iframe_document, '已另存为新的小剧场。');
      });

      save_prompt?.addEventListener('click', () => {
        const settings = getSettings();
        const preset_id = settings.active_prompt_id || createPromptId();
        const preset = {
          id: preset_id,
          name: prompt_name?.value?.trim() || '未命名完整预设',
          base_prompt_id: base_prompt_select?.value || settings.active_base_prompt_id,
          detail_prompt_id: detail_prompt_select?.value || settings.active_detail_prompt_id,
          base_content: base_prompt_content?.value || '',
          detail_content: detail_prompt_content?.value || '',
        };
        saveSettings({
          ...settings,
          active_prompt_id: preset_id,
          prompts: settings.prompts.some(prompt => prompt.id === preset_id)
            ? settings.prompts.map(prompt => (prompt.id === preset_id ? preset : prompt))
            : [...settings.prompts, preset],
        });
        renderPromptSettings(iframe_document);
        set_prompt_dirty(false);
        updateText(iframe_document, '[data-prompt-settings-detail]', `已保存当前预设：${formatTime(new Date())}`);
        showInlineToast(iframe_document, '已保存到个人。');
      });

      save_as_prompt?.addEventListener('click', () => {
        const settings = getSettings();
        const default_name = prompt_name?.value?.trim() ? `${prompt_name.value.trim()} 副本` : '新的完整预设';
        const name = host_window.prompt('请输入新模板名称', default_name);
        if (!name) {
          return;
        }
        const new_id = createPromptId();
        saveSettings({
          ...settings,
          active_prompt_id: new_id,
          prompts: [
            ...settings.prompts,
            {
              id: new_id,
              name: name.trim() || default_name,
              base_prompt_id: base_prompt_select?.value || settings.active_base_prompt_id,
              detail_prompt_id: detail_prompt_select?.value || settings.active_detail_prompt_id,
              base_content: base_prompt_content?.value || '',
              detail_content: detail_prompt_content?.value || '',
            },
          ],
        });
        renderPromptSettings(iframe_document);
        set_prompt_dirty(false);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已另存为新模板。');
        showInlineToast(iframe_document, '已另存为新模板。');
      });

      import_prompts?.addEventListener('click', () => {
        const input = iframe_document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', () => handlePromptImportFile(input.files?.[0]));
        input.click();
      });

      export_prompts?.addEventListener('click', async () => {
        const selected = await showPromptExportDialog();
        if (selected) downloadPromptExport(selected);
      });

      sync_builtin_prompts?.addEventListener('click', async () => {
        const settings = getSettings();
        const conflicts = getBuiltinPromptSyncConflicts(settings);
        let mode: 'overwrite' | 'save_as' = 'overwrite';
        if (conflicts.length) {
          const conflict_names = conflicts
            .map(item => item.label)
            .slice(0, 6)
            .join('、');
          const more_text = conflicts.length > 6 ? ' 等 ' + conflicts.length + ' 项' : '';
          const choice = (await showChoiceDialog(iframe_document, {
            title: '同步内置提示词',
            message:
              '检测到这些内置提示词已被本地修改：' +
              conflict_names +
              more_text +
              '。\n\n覆盖：放弃本地改动并使用脚本内置最新版。\n另存为：先把本地改动保存为新的个人模板，再恢复内置最新版。',
            tone: 'warning',
            cancelText: '取消',
            choices: [
              { value: 'overwrite', label: '覆盖', tone: 'warning' },
              { value: 'save_as', label: '另存为' },
            ],
          })) as 'overwrite' | 'save_as' | null;
          if (!choice) {
            return;
          }
          mode = choice;
        }
        const result = syncBuiltinPromptTemplates(settings, mode);
        renderPromptSettings(iframe_document);
        set_prompt_dirty(false);
        const message = conflicts.length
          ? mode === 'save_as'
            ? '已同步内置提示词，并另存 ' + result.saved_copy_count + ' 个修改备份。'
            : '已覆盖本地改动并同步内置提示词。'
          : '内置提示词已经是最新。';
        updateText(iframe_document, '[data-prompt-settings-detail]', message);
        showInlineToast(iframe_document, message);
      });

      delete_prompt?.addEventListener('click', () => {
        const settings = getSettings();
        const active_prompt = settings.prompts.find(prompt => prompt.id === settings.active_prompt_id);
        if (active_prompt?.source === 'default') {
          updateText(iframe_document, '[data-prompt-settings-detail]', '内置预设不能删除，可以另存为本地模板后编辑。');
          return;
        }
        if (active_prompt?.source === 'published') {
          updateText(
            iframe_document,
            '[data-prompt-settings-detail]',
            '发布预设请先点击“取消发布”；不会删除他人的本地副本。',
          );
          return;
        }
        if (settings.prompts.length <= 1) {
          updateText(iframe_document, '[data-prompt-settings-detail]', '至少需要保留一条完整预设。');
          return;
        }
        if (!host_window.confirm('确定删除当前完整预设吗？')) {
          return;
        }
        const prompts = settings.prompts.filter(prompt => prompt.id !== settings.active_prompt_id);
        saveSettings({
          ...settings,
          active_prompt_id: prompts[0].id,
          prompts,
        });
        renderPromptSettings(iframe_document);
        set_prompt_dirty(false);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已删除当前完整预设。');
        showInlineToast(iframe_document, '已删除当前完整预设。');
      });

      toggle_publish_prompt?.addEventListener('click', () => {
        const settings = getSettings();
        const preset_id = settings.active_prompt_id || createPromptId();
        const published_prompts = getPublishedPromptPresets();

        if (published_prompts.some(prompt => prompt.id === preset_id)) {
          if (!host_window.confirm('确定取消发布当前预设吗？')) {
            return;
          }
          if (!savePublishedPromptPresets(published_prompts.filter(prompt => prompt.id !== preset_id))) {
            updateText(
              iframe_document,
              '[data-prompt-settings-detail]',
              '取消发布失败：当前运行环境可能不支持脚本变量写入。',
            );
            showInlineToast(iframe_document, '取消发布失败：当前运行环境可能不支持脚本变量写入。');
            return;
          }
          renderPromptSettings(iframe_document);
          set_prompt_dirty(false);
          updateText(iframe_document, '[data-prompt-settings-detail]', '已取消发布。');
          showInlineToast(iframe_document, '已取消发布。');
          return;
        }

        const preset = stripPromptRuntimeFields({
          id: preset_id,
          name: prompt_name?.value?.trim() || '未命名发布预设',
          base_prompt_id: base_prompt_select?.value || settings.active_base_prompt_id,
          detail_prompt_id: detail_prompt_select?.value || settings.active_detail_prompt_id,
          base_content: base_prompt_content?.value || '',
          detail_content: detail_prompt_content?.value || '',
        });
        const next_published = published_prompts.some(prompt => prompt.id === preset_id)
          ? published_prompts.map(prompt => (prompt.id === preset_id ? preset : prompt))
          : [...published_prompts, preset];
        if (!savePublishedPromptPresets(next_published)) {
          updateText(
            iframe_document,
            '[data-prompt-settings-detail]',
            '保存到发布失败：当前运行环境可能不支持脚本变量写入。',
          );
          showInlineToast(iframe_document, '保存到发布失败：当前运行环境可能不支持脚本变量写入。');
          return;
        }
        renderPromptSettings(iframe_document);
        set_prompt_dirty(false);
        updateText(iframe_document, '[data-prompt-settings-detail]', '已保存到发布。第二 API 设置不会被发布。');
        showInlineToast(iframe_document, '已保存到发布。第二 API 设置不会被发布。');
      });

      save_summary_tag?.addEventListener('click', () => {
        const settings = getSettings();
        const tag_id = summary_tag_select?.value || settings.active_summary_tag_id || createPromptId();
        const tag = {
          id: tag_id,
          name: summary_tag_name?.value?.trim() || '未命名摘要标签',
          open_tag: summary_open_tag?.value?.trim() || '',
          close_tag: summary_close_tag?.value?.trim() || '',
        };
        if (!tag.open_tag || !tag.close_tag) {
          updateText(
            iframe_document,
            '[data-runtime-settings-detail]',
            '摘要标签保存失败：开始标签和闭合标签不能为空。',
          );
          showInlineToast(iframe_document, '摘要标签保存失败：开始标签和闭合标签不能为空。');
          return;
        }
        saveSettings({
          ...settings,
          active_summary_tag_id: tag.id,
          summary_tags: settings.summary_tags.some(item => item.id === tag.id)
            ? settings.summary_tags.map(item => (item.id === tag.id ? tag : item))
            : [...settings.summary_tags, tag],
        });
        renderPromptSettings(iframe_document);
        updateText(iframe_document, '[data-runtime-settings-detail]', '已保存预设摘要标签。');
        showInlineToast(iframe_document, '已保存预设摘要标签。');
      });

      save_as_summary_tag?.addEventListener('click', () => {
        const settings = getSettings();
        const default_name = summary_tag_name?.value?.trim() || '新的摘要标签';
        const name = host_window.prompt('请输入摘要标签预设名称', default_name);
        if (!name) {
          return;
        }
        const tag = {
          id: createPromptId(),
          name: name.trim() || default_name,
          open_tag: summary_open_tag?.value?.trim() || '',
          close_tag: summary_close_tag?.value?.trim() || '',
        };
        if (!tag.open_tag || !tag.close_tag) {
          updateText(
            iframe_document,
            '[data-runtime-settings-detail]',
            '摘要标签另存失败：开始标签和闭合标签不能为空。',
          );
          showInlineToast(iframe_document, '摘要标签另存失败：开始标签和闭合标签不能为空。');
          return;
        }
        saveSettings({
          ...settings,
          active_summary_tag_id: tag.id,
          summary_tags: [...settings.summary_tags, tag],
        });
        renderPromptSettings(iframe_document);
        updateText(iframe_document, '[data-runtime-settings-detail]', '已另存为新的摘要标签。');
        showInlineToast(iframe_document, '已另存为新的摘要标签。');
      });

      toggle_publish_summary_tag?.addEventListener('click', () => {
        const settings = getSettings();
        const active_tag = settings.summary_tags.find(tag => tag.id === settings.active_summary_tag_id);
        const tag_id = settings.active_summary_tag_id || createPromptId();
        const published_tags = getPublishedSummaryTagPresets();

        if (published_tags.some(tag => tag.id === tag_id)) {
          if (!host_window.confirm('确定取消发布当前摘要标签吗？')) {
            return;
          }
          if (!savePublishedSummaryTagPresets(published_tags.filter(tag => tag.id !== tag_id))) {
            updateText(
              iframe_document,
              '[data-runtime-settings-detail]',
              '取消发布摘要标签失败：当前运行环境可能不支持脚本变量写入。',
            );
            showInlineToast(iframe_document, '取消发布摘要标签失败：当前运行环境可能不支持脚本变量写入。');
            return;
          }
          renderPromptSettings(iframe_document);
          updateText(iframe_document, '[data-runtime-settings-detail]', '已取消发布摘要标签。');
          showInlineToast(iframe_document, '已取消发布摘要标签。');
          return;
        }

        const tag = stripSummaryTagRuntimeFields({
          id: tag_id,
          name: summary_tag_name?.value?.trim() || active_tag?.name || '未命名摘要标签',
          open_tag: summary_open_tag?.value?.trim() || active_tag?.open_tag || '',
          close_tag: summary_close_tag?.value?.trim() || active_tag?.close_tag || '',
        });
        if (!tag.open_tag || !tag.close_tag) {
          updateText(iframe_document, '[data-runtime-settings-detail]', '保存到发布失败：开始标签和闭合标签不能为空。');
          showInlineToast(iframe_document, '保存到发布失败：开始标签和闭合标签不能为空。');
          return;
        }
        const next_published = published_tags.some(item => item.id === tag_id)
          ? published_tags.map(item => (item.id === tag_id ? tag : item))
          : [...published_tags, tag];
        if (!savePublishedSummaryTagPresets(next_published)) {
          updateText(
            iframe_document,
            '[data-runtime-settings-detail]',
            '保存摘要标签到发布失败：当前运行环境可能不支持脚本变量写入。',
          );
          showInlineToast(iframe_document, '保存摘要标签到发布失败：当前运行环境可能不支持脚本变量写入。');
          return;
        }
        renderPromptSettings(iframe_document);
        updateText(iframe_document, '[data-runtime-settings-detail]', '已保存摘要标签到发布。');
        showInlineToast(iframe_document, '已保存摘要标签到发布。');
      });

      [prompt_name, base_prompt_name, detail_prompt_name, base_prompt_content, detail_prompt_content].forEach(
        element => {
          element?.addEventListener('input', () => set_prompt_dirty(true));
        },
      );

      mobile_view_scale?.addEventListener('change', () => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          mobile_view_scale: normalizeMobileViewScale(mobile_view_scale.value),
        });
        renderOnlineContent(iframe_document);
        updateText(
          iframe_document,
          '[data-runtime-settings-detail]',
          `手机端页面缩放已设为 ${Math.round(normalizeMobileViewScale(mobile_view_scale.value) * 100)}%。`,
        );
        showInlineToast(iframe_document, '手机端页面缩放已保存。');
      });

      chat_history_depth?.addEventListener('change', () => {
        const settings = getSettings();
        const normalized_depth = normalizeChatHistoryDepth(chat_history_depth.value.trim());
        saveSettings({
          ...settings,
          chat_history_depth: normalized_depth,
        });
        updateValue(
          iframe_document,
          '[data-chat-history-depth]',
          normalized_depth === '' ? '' : String(normalized_depth),
        );
        const detail =
          normalized_depth === ''
            ? '已关闭主动裁剪；仅跟随酒馆隐藏楼层过滤历史页面。'
            : normalized_depth === 0
              ? '已设置为不发送 <ChatHistory>，仅发送 <LastChat>。'
              : `已设置为只保留最近 ${normalized_depth} 个历史 AI 楼层的 <ChatHistory>。`;
        updateText(iframe_document, '[data-runtime-settings-detail]', detail);
        showInlineToast(iframe_document, '自动隐藏设置已保存。');
      });

      online_storage_limit_mb?.addEventListener('change', () => {
        const settings = getSettings();
        const normalized_limit = normalizeOnlineStorageLimitMb(online_storage_limit_mb.value.trim());
        saveSettings({
          ...settings,
          online_storage: {
            ...settings.online_storage,
            limit_mb: normalized_limit,
          },
        });
        updateValue(iframe_document, '[data-online-storage-limit-mb]', String(normalized_limit));
        const prune_result = pruneOnlineStorageForCurrentScope(normalized_limit);
        const detail =
          prune_result.removed_entries > 0
            ? `缓存上限已设为 ${normalized_limit} MB，已自动清理 ${prune_result.removed_entries} 条未收藏小剧场。`
            : `缓存上限已设为 ${normalized_limit} MB，当前角色未收藏内容未超过上限。`;
        updateText(iframe_document, '[data-runtime-settings-detail]', detail);
        updateText(iframe_document, '[data-online-storage-summary]', getOnlineStorageSummaryText(normalized_limit));
        showInlineToast(iframe_document, '本地缓存设置已保存。');
      });

      clear_online_storage?.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'danger',
          title: '确认清理文库缓存',
          message:
            '将删除 LoreFrame 当前已登记的本地小剧场缓存、聊天索引和兼容旧版本缓存。可用于修复浏览器本地存储配额不足导致的写入失败。\n\n已保存的所有小剧场都会被清理，请谨慎操作。',
          confirmText: '确认清理',
        });
        if (!confirmed) {
          return;
        }
        clearKnownOnlineStorage();
        renderOnlineContent(iframe_document);
        updateText(iframe_document, '[data-runtime-settings-detail]', '已清理全部文库缓存，可重新生成页面。');
        updateText(
          iframe_document,
          '[data-online-storage-summary]',
          getOnlineStorageSummaryText(getSettings().online_storage.limit_mb),
        );
        collectSourceDebugSnapshot(iframe_document, '清理文库缓存');
        showInlineToast(iframe_document, '已清理全部文库缓存。');
      });

      clear_current_online_storage?.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'danger',
          title: '确认清理当前聊天缓存',
          message:
            '将只删除当前聊天对应的小剧场缓存，并保留其他聊天与角色卡下的文库内容。适合当前聊天缓存异常、预览空白或需要重新生成时使用。',
          confirmText: '确认清理',
        });
        if (!confirmed) {
          return;
        }
        clearCurrentOnlineData();
        renderOnlineContent(iframe_document);
        updateText(iframe_document, '[data-runtime-settings-detail]', '已清理当前聊天缓存，可重新生成页面。');
        updateText(
          iframe_document,
          '[data-online-storage-summary]',
          getOnlineStorageSummaryText(getSettings().online_storage.limit_mb),
        );
        collectSourceDebugSnapshot(iframe_document, '清理当前聊天缓存');
        showInlineToast(iframe_document, '已清理当前聊天缓存。');
      });

      auto_generate?.addEventListener('change', () => {
        const settings = getSettings();
        saveSettings({
          ...settings,
          auto_generate: Boolean(auto_generate.checked),
        });
        updateText(
          iframe_document,
          '[data-runtime-settings-detail]',
          auto_generate.checked ? '已开启自动生成。' : '已关闭自动生成。',
        );
      });

      const getSecondaryApiProviderConfigFromDom = (provider: SecondaryProvider) => {
        const panel = iframe_document.querySelector<HTMLElement>(
          '[data-secondary-api-provider-panel="' + provider + '"]',
        );
        const model = secondary_api_model?.value?.trim() || '';
        if (provider === 'openai') {
          return {
            apiurl: panel?.querySelector<HTMLInputElement>('[data-secondary-api-url]')?.value?.trim() || '',
            key: panel?.querySelector<HTMLInputElement>('[data-secondary-api-key]')?.value || '',
            model,
          };
        }
        if (provider === 'google_ai_studio') {
          return {
            key: panel?.querySelector<HTMLInputElement>('[data-secondary-api-key]')?.value || '',
            proxy_url: panel?.querySelector<HTMLInputElement>('[data-secondary-api-url]')?.value?.trim() || '',
            proxy_password:
              iframe_document.querySelector<HTMLInputElement>('[data-secondary-api-proxy-password]')?.value || '',
            model,
          };
        }
        return {
          key: panel?.querySelector<HTMLInputElement>('[data-secondary-api-key]')?.value || '',
          vertex_token:
            iframe_document.querySelector<HTMLInputElement>('[data-secondary-api-vertex-token]')?.value || '',
          vertex_location:
            iframe_document.querySelector<HTMLInputElement>('[data-secondary-api-vertex-location]')?.value?.trim() ||
            '',
          vertex_project_id:
            iframe_document.querySelector<HTMLInputElement>('[data-secondary-api-vertex-project-id]')?.value?.trim() ||
            '',
          model,
        };
      };

      const getSecondaryApiFormValues = () => {
        const provider = (secondary_api_provider?.value as SecondaryProvider | undefined) || 'openai';
        const active_profile = getActiveSecondaryApiProfile();
        const base_config = active_profile?.config || getSettings().secondary_api;
        const providers: SettingsSecondaryApiProviderConfigMap = {
          openai: { ...(base_config.providers?.openai || {}) },
          google_ai_studio: { ...(base_config.providers?.google_ai_studio || {}) },
          vertex_ai: { ...(base_config.providers?.vertex_ai || {}) },
        };
        if (provider === 'openai') {
          providers.openai = getSecondaryApiProviderConfigFromDom(
            provider,
          ) as SettingsSecondaryApiProviderConfigMap['openai'];
        } else if (provider === 'google_ai_studio') {
          providers.google_ai_studio = getSecondaryApiProviderConfigFromDom(
            provider,
          ) as SettingsSecondaryApiProviderConfigMap['google_ai_studio'];
        } else {
          providers.vertex_ai = getSecondaryApiProviderConfigFromDom(
            provider,
          ) as SettingsSecondaryApiProviderConfigMap['vertex_ai'];
        }
        return normalizeSecondaryApiSettings({
          ...base_config,
          enabled: Boolean(secondary_api_enabled?.checked),
          provider,
          source: provider,
          providers,
        });
      };

      const syncSecondaryProviderVisibility = () => {
        const provider = (secondary_api_provider?.value as SecondaryProvider | undefined) || 'openai';
        secondary_api_provider_panels.forEach(panel => {
          panel.hidden = panel.dataset.secondaryApiProviderPanel !== provider;
        });
      };

      const applySecondaryApiModelForProvider = () => {
        const provider = (secondary_api_provider?.value as SecondaryProvider | undefined) || 'openai';
        const active_profile = getActiveSecondaryApiProfile();
        const providers = active_profile?.config?.providers || getSettings().secondary_api.providers || {};
        const provider_config =
          provider === 'openai'
            ? providers.openai || {}
            : provider === 'google_ai_studio'
              ? providers.google_ai_studio || {}
              : providers.vertex_ai || {};
        if (secondary_api_model) {
          secondary_api_model.value = provider_config.model || '';
        }
        renderSecondaryApiModelMenu([provider_config.model || '']);
      };

      let latest_secondary_api_models: string[] = [];

      const renderSecondaryApiModelMenu = (models: string[]) => {
        if (!secondary_api_model_menu) {
          return;
        }
        const current_value = secondary_api_model?.value?.trim() || '';
        const unique_models = [...new Set((models || []).map(model => String(model).trim()).filter(Boolean))];
        latest_secondary_api_models = unique_models;
        secondary_api_model_menu.innerHTML = unique_models.length
          ? unique_models
              .map(
                model =>
                  '<button class="model-combobox__option ' +
                  (model === current_value ? 'is-active' : '') +
                  '" type="button" data-secondary-api-model-option="' +
                  escapeHtml(model) +
                  '">' +
                  escapeHtml(model) +
                  '</button>',
              )
              .join('')
          : '<button class="model-combobox__option" type="button" disabled>没有可显示的模型</button>';
        secondary_api_model_menu.querySelectorAll<HTMLElement>('.model-combobox__option').forEach(option => {
          if (option.hasAttribute('disabled')) {
            return;
          }
          option.addEventListener('click', event => {
            event.stopPropagation();
            const option_value = option.dataset.secondaryApiModelOption || '';
            console.info('[LoreFrame] second-api model option direct event', {
              event_type: event.type,
              option_value,
              option_text: option.textContent?.trim() || null,
            });
            applySelectedSecondaryApiModel(option_value, true);
            secondary_api_model_menu.hidden = true;
          });
        });
      };

      const applySelectedSecondaryApiModel = (model: string, show_detail = true) => {
        const next_model = String(model || '').trim();
        if (!secondary_api_model) {
          return;
        }
        console.info('[LoreFrame] second-api model pick:start', {
          picked_model: next_model,
          provider: (secondary_api_provider?.value as SecondaryProvider | undefined) || 'openai',
          input_before: secondary_api_model.value,
          saved_before: getActiveSecondaryApiProfile()?.config || getSettings().secondary_api,
        });
        updateValue(iframe_document, '[data-secondary-api-model]', next_model);
        console.info('[LoreFrame] second-api model pick:input-updated', {
          picked_model: next_model,
          input_after: secondary_api_model.value,
        });
        const provider = (secondary_api_provider?.value as SecondaryProvider | undefined) || 'openai';
        const settings = getSettings();
        const active_profile_id = getActiveSecondaryApiProfileId();
        const active_profile =
          settings.secondary_api_profiles.find(profile => profile.id === active_profile_id) ||
          settings.secondary_api_profiles[0];
        const active_config = active_profile?.config || settings.secondary_api;
        const providers: SettingsSecondaryApiProviderConfigMap = {
          openai: { ...(active_config.providers?.openai || {}) },
          google_ai_studio: { ...(active_config.providers?.google_ai_studio || {}) },
          vertex_ai: { ...(active_config.providers?.vertex_ai || {}) },
        };
        if (provider === 'openai') {
          providers.openai = {
            ...providers.openai,
            model: next_model,
          };
        } else if (provider === 'google_ai_studio') {
          providers.google_ai_studio = {
            ...providers.google_ai_studio,
            model: next_model,
          };
        } else {
          providers.vertex_ai = {
            ...providers.vertex_ai,
            model: next_model,
          };
        }
        const next_config = normalizeSecondaryApiSettings({
          ...active_config,
          provider,
          source: provider,
          model: next_model,
          providers,
        });
        const next_profiles = settings.secondary_api_profiles.map(profile =>
          profile.id === (active_profile?.id || active_profile_id) ? { ...profile, config: next_config } : profile,
        );
        saveSecondaryApiProfileState(next_profiles, active_profile?.id || active_profile_id, { rerender: false });
        console.info('[LoreFrame] second-api model pick:saved', {
          picked_model: next_model,
          provider,
          input_after_save: secondary_api_model.value,
          saved_after: getActiveSecondaryApiProfile()?.config || getSettings().secondary_api,
        });
        renderSecondaryApiModelMenu(latest_secondary_api_models.length ? latest_secondary_api_models : [next_model]);
        if (show_detail) {
          const detail = !next_model ? '第二 API 已开启；还需要填写或选择模型。' : '第二 API 模型已更新。';
          updateText(iframe_document, '[data-runtime-settings-detail]', detail);
        }
      };

      const syncSecondaryApiSettings = (show_detail = false) => {
        syncSecondaryProviderVisibility();
        const settings = getSettings();
        const form_values = getSecondaryApiFormValues();
        const active_profile_id = getActiveSecondaryApiProfileId();
        console.info('[LoreFrame] second-api sync:start', {
          show_detail,
          provider: form_values.provider,
          input_model: secondary_api_model?.value?.trim() || '',
          form_values,
          saved_before: getActiveSecondaryApiProfile()?.config || settings.secondary_api,
        });
        const next_profiles = settings.secondary_api_profiles.map(profile =>
          profile.id === active_profile_id ? { ...profile, config: form_values } : profile,
        );
        const next_settings = saveSecondaryApiProfileState(next_profiles, active_profile_id, { rerender: false });
        console.info('[LoreFrame] second-api sync:saved', {
          show_detail,
          provider: form_values.provider,
          input_model: secondary_api_model?.value?.trim() || '',
          saved_after: getActiveSecondaryApiProfile()?.config || getSettings().secondary_api,
        });
        if (show_detail) {
          const has_connection =
            form_values.provider === 'openai'
              ? Boolean(form_values.apiurl)
              : form_values.provider === 'google_ai_studio'
                ? Boolean(form_values.key || form_values.apiurl)
                : Boolean(form_values.key || form_values.vertex_token);
          const detail = !form_values.enabled
            ? '第二 API 已关闭，将使用主 API 当前模型。'
            : !form_values.model
              ? '第二 API 已开启；还需要填写或选择模型。'
              : has_connection
                ? '第二 API 设置已更新。'
                : '第二 API 已开启；当前接口类型还缺少连接信息。';
          updateText(iframe_document, '[data-runtime-settings-detail]', detail);
        }
        return next_settings.secondary_api;
      };

      syncSecondaryProviderVisibility();
      renderSecondaryApiModelMenu([secondary_api_model?.value || '']);

      secondary_api_profile_select?.addEventListener('change', () => {
        const next_profile_id = secondary_api_profile_select.value;
        const settings = getSettings();
        const next_profile = settings.secondary_api_profiles.find(profile => profile.id === next_profile_id);
        if (!next_profile) {
          return;
        }
        saveSecondaryApiProfileState(settings.secondary_api_profiles, next_profile.id, {
          detail: `已切换到第二 API 配置：${next_profile.name}。`,
          rerender: true,
        });
      });

      secondary_api_profile_create?.addEventListener('click', () => {
        const settings = getSettings();
        const active_profile = getActiveSecondaryApiProfile();
        const default_name = `配置 ${settings.secondary_api_profiles.length + 1}`;
        const name = host_window.prompt('请输入新的第二 API 配置名称', default_name);
        if (name == null) {
          return;
        }
        const trimmed_name = name.trim() || default_name;
        const new_profile: SettingsSecondaryApiProfile = {
          id: createSecondaryApiProfileId(),
          name: trimmed_name,
          config: normalizeSecondaryApiSettings(active_profile?.config || settings.secondary_api),
        };
        saveSecondaryApiProfileState([...settings.secondary_api_profiles, new_profile], new_profile.id, {
          detail: `已新建第二 API 配置：${trimmed_name}。`,
          toast: `已新建配置：${trimmed_name}`,
        });
      });

      secondary_api_profile_rename?.addEventListener('click', () => {
        const settings = getSettings();
        const active_profile = getActiveSecondaryApiProfile();
        if (!active_profile) {
          return;
        }
        const name = host_window.prompt('请输入新的第二 API 配置名称', active_profile.name);
        if (name == null) {
          return;
        }
        const trimmed_name = name.trim() || active_profile.name;
        const next_profiles = settings.secondary_api_profiles.map(profile =>
          profile.id === active_profile.id ? { ...profile, name: trimmed_name } : profile,
        );
        saveSecondaryApiProfileState(next_profiles, active_profile.id, {
          detail: `第二 API 配置已重命名为：${trimmed_name}。`,
          toast: '配置名称已更新。',
        });
      });

      secondary_api_profile_delete?.addEventListener('click', async () => {
        const settings = getSettings();
        const active_profile = getActiveSecondaryApiProfile();
        if (!active_profile || settings.secondary_api_profiles.length <= 1) {
          showInlineToast(iframe_document, '至少保留 1 套第二 API 配置。');
          return;
        }
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'warning',
          title: '删除第二 API 配置',
          message: `确认删除“${active_profile.name}”吗？此操作不会影响其它配置槽位。`,
          confirmText: '删除当前配置',
        });
        if (!confirmed) {
          return;
        }
        const next_profiles = settings.secondary_api_profiles.filter(profile => profile.id !== active_profile.id);
        const next_active_profile = next_profiles[0];
        saveSecondaryApiProfileState(next_profiles, next_active_profile.id, {
          detail: `已删除第二 API 配置：${active_profile.name}。`,
          toast: '当前配置已删除。',
        });
      });

      secondary_api_provider?.addEventListener('change', () => {
        syncSecondaryProviderVisibility();
        applySecondaryApiModelForProvider();
        syncSecondaryApiSettings(true);
      });

      secondary_api_model_toggle?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (secondary_api_model_menu) {
          secondary_api_model_menu.hidden = !secondary_api_model_menu.hidden;
        }
      });

      const handleExcludedTagRemoval = (event: Event) => {
        const remove_excluded_tag = find_event_path_element(event, '[data-remove-excluded-tag]');
        if (!remove_excluded_tag) {
          return false;
        }
        event.preventDefault();
        event.stopPropagation();
        const tag = String(remove_excluded_tag.dataset.removeExcludedTag || '').trim().toLowerCase();
        if (tag) {
          const settings = getSettings();
          saveExcludedSettings(
            {
              excluded_tags: (settings.excluded_tags || []).filter(item => item !== tag),
            },
            `已移除排除标签：${tag}。`,
          );
        }
        return true;
      };

      excluded_tags_chips?.addEventListener('click', event => {
        handleExcludedTagRemoval(event);
      });

      iframe_document.addEventListener('click', event => {
        if (handleExcludedTagRemoval(event)) {
          return;
        }
        if (handleVibeReferenceRemoval(event)) {
          return;
        }
        const target = event.target instanceof Element ? event.target : null;
        if (prompt_menu && !target?.closest('[data-prompt-combobox]')) {
          prompt_menu.hidden = true;
        }
        if (
          prompt_secondary_actions &&
          !target?.closest('[data-prompt-secondary-actions], [data-prompt-actions-more]')
        ) {
          prompt_secondary_actions.classList.remove('is-open');
        }
        if (!secondary_api_model_menu || target?.closest('[data-secondary-api-model-combobox]')) {
          return;
        }
        secondary_api_model_menu.hidden = true;
      });

      fetch_secondary_api_models?.addEventListener('click', async () => {
        fetch_secondary_api_models.disabled = true;
        try {
          updateText(iframe_document, '[data-runtime-settings-detail]', '正在获取模型列表...');
          const form_values = syncSecondaryApiSettings(false);
          const models = await fetchSecondaryApiModelList(form_values);
          renderSecondaryApiModelMenu(models);
          if (models.length && secondary_api_model && !secondary_api_model.value.trim()) {
            applySelectedSecondaryApiModel(models[0], false);
          }
          if (secondary_api_model_menu) {
            secondary_api_model_menu.hidden = false;
          }
          updateText(
            iframe_document,
            '[data-runtime-settings-detail]',
            '已获取 ' + models.length + ' 个模型，已显示在 Model 输入框的下拉列表中；也可以继续手动填写。',
          );
          showInlineToast(iframe_document, '已获取 ' + models.length + ' 个模型。');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          updateText(iframe_document, '[data-runtime-settings-detail]', message);
          showInlineToast(iframe_document, message || '获取模型列表失败。');
        } finally {
          fetch_secondary_api_models.disabled = false;
        }
      });

      save_secondary_api?.addEventListener('click', () => {
        const saved_api = syncSecondaryApiSettings(true);
        const detail = saved_api.enabled ? '已保存第二 API 设置。' : '已关闭第二 API，将使用主 API 当前模型。';
        updateText(iframe_document, '[data-runtime-settings-detail]', detail);
        showInlineToast(iframe_document, detail);
      });

      [
        secondary_api_url,
        secondary_api_key,
        secondary_api_proxy_password,
        secondary_api_vertex_token,
        secondary_api_vertex_location,
        secondary_api_vertex_project_id,
        secondary_api_model,
        ...iframe_document.querySelectorAll('[data-secondary-api-url], [data-secondary-api-key]'),
      ].forEach(element => {
        element?.addEventListener('change', () => syncSecondaryApiSettings(true));
      });

      secondary_api_enabled?.addEventListener('change', () => {
        syncSecondaryApiSettings(true);
        updateText(
          iframe_document,
          '[data-runtime-settings-detail]',
          secondary_api_enabled.checked
            ? '已开启第二 API；填写对应接口信息和模型后生效。'
            : '已关闭第二 API，将使用主 API。',
        );
      });

      image_generation_enabled?.addEventListener('change', () => {
        const saved = syncImageGenerationSettings(true);
        updateText(
          iframe_document,
          '[data-image-generation-detail]',
          saved.enabled ? '已开启生图思考注入。' : '已关闭生图思考注入。',
        );
      });

      const syncImageGenerationEndpointVisibility = () => {
        if (image_custom_endpoint_field) {
          image_custom_endpoint_field.hidden = image_connection_mode?.value !== 'custom';
        }
      };
      image_generation_mode?.addEventListener('change', () => {
        const image_generation = syncImageGenerationSettings(false);
        saveImageGenerationState(
          { ...image_generation, mode: image_generation_mode.value as SettingsImageGenerationMode },
          `已切换生图方法：${image_generation_mode.value === 'novelai' ? 'NovelAI' : image_generation_mode.value}。`,
        );
      });
      image_connection_mode?.addEventListener('change', syncImageGenerationEndpointVisibility);
      syncImageGenerationEndpointVisibility();

      fetch_image_models?.addEventListener('click', async () => {
        if (image_connection_mode?.value !== 'official') {
          showInlineToast(iframe_document, '只有 NovelAI 官网连接方式支持自动拉取模型。');
          return;
        }
        const api_key = image_api_key?.value?.trim() || '';
        if (!api_key) {
          showInlineToast(iframe_document, '请先填写 NovelAI API Key。');
          return;
        }
        fetch_image_models.setAttribute('disabled', '');
        appendImageGenerationLog('请求', '拉取 NovelAI 模型列表');
        try {
          const models = await requestNovelAiModels(api_key);
          const list = iframe_document.querySelector<HTMLElement>('[data-image-model-list]');
          if (list) {
            list.innerHTML = models.map(model => `<option value="${escapeHtml(model)}"></option>`).join('');
          }
          if (image_model_select) {
            const current_model = image_model?.value || models[0] || '';
            image_model_select.innerHTML = models
              .map(model => `<option value="${escapeHtml(model)}"${model === current_model ? ' selected' : ''}>${escapeHtml(model)}</option>`)
              .join('');
            if (image_model && current_model) image_model.value = current_model;
          }
          appendImageGenerationLog('成功', `已拉取 ${models.length} 个 NovelAI 模型`);
          showInlineToast(iframe_document, `已拉取 ${models.length} 个模型。`);
        } catch (error) {
          appendImageGenerationLog('错误', '拉取 NovelAI 模型失败', error);
          showInlineToast(iframe_document, `拉取模型失败：${error instanceof Error ? error.message : String(error)}`);
        } finally {
          fetch_image_models.removeAttribute('disabled');
        }
      });
      image_model_select?.addEventListener('change', () => {
        if (image_model && image_model_select.value) {
          image_model.value = image_model_select.value;
          image_model.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      iframe_document.querySelector('[data-import-baibai-presets]')?.addEventListener('click', () => {
        try {
          const current = syncImageGenerationSettings(false);
          const result = importLoreFrameBaibaiPresets(getLoreFrameBaibaiSettings(), current);
          saveImageGenerationState(result.settings, `已读取 ${result.count} 套柏宝绘接口及当前画风。`);
          showInlineToast(iframe_document, `已导入 ${result.count} 套配置，未改动柏宝绘设置。`);
        } catch (error) {
          showInlineToast(iframe_document, error instanceof Error ? error.message : '读取柏宝绘失败');
        }
      });
      iframe_document.querySelector('[data-list-baibai-vibes]')?.addEventListener('click', () => {
        const select = iframe_document.querySelector<HTMLSelectElement>('[data-baibai-vibe-select]');
        if (!select) return;
        const vibes = listLoreFrameBaibaiVibes();
        select.innerHTML = vibes.map(vibe => `<option value="${escapeHtml(vibe.id)}">${escapeHtml(vibe.name)}</option>`).join('');
        if (!vibes.length) showInlineToast(iframe_document, '柏宝绘中没有已保存的参考图。');
      });
      const import_baibai_vibe = iframe_document.querySelector<HTMLButtonElement>('[data-import-baibai-vibe]');
      import_baibai_vibe?.addEventListener('click', async () => {
        const id = iframe_document.querySelector<HTMLSelectElement>('[data-baibai-vibe-select]')?.value;
        if (!id) { showInlineToast(iframe_document, '请先读取并选择柏宝绘参考图。'); return; }
        import_baibai_vibe.disabled = true;
        try {
          const reference = await readLoreFrameBaibaiVibe(id);
          if (!iframe_document.body?.isConnected || !iframe.isConnected) return;
          const current = syncImageGenerationSettings(false);
          saveImageGenerationState({
            ...current,
            vibe_library: [...current.vibe_library.filter(item => item.id !== reference.id), reference],
          }, '已导入 Vibe 库，请在库中选择加入当前 Vibe 组。');
        } catch (error) {
          showInlineToast(iframe_document, error instanceof Error ? error.message : '导入参考图失败');
        } finally {
          import_baibai_vibe.disabled = false;
        }
      });

      image_preset_select?.addEventListener('change', () => {
        const image_generation = getImageGenerationSettings();
        const previous_active_preset =
          image_generation.presets.find(preset => preset.id === image_generation.active_preset_id) ||
          image_generation.presets[0];
        if (!previous_active_preset) return;
        const next_presets = image_generation.presets.map(preset =>
          preset.id === previous_active_preset.id ? getImagePresetFromDom(previous_active_preset) : preset,
        );
        saveImageGenerationState(
          {
            ...image_generation,
            presets: next_presets,
            active_preset_id: image_preset_select.value,
          },
          '已切换生图预设。',
        );
      });

      image_preset_create?.addEventListener('click', () => {
        const image_generation = syncImageGenerationSettings(false);
        const default_name = `生图预设 ${image_generation.presets.length + 1}`;
        const name = host_window.prompt('请输入新的生图预设名称', default_name);
        if (name == null) return;
        const active_preset =
          image_generation.presets.find(preset => preset.id === image_generation.active_preset_id) ||
          image_generation.presets[0];
        const new_preset = normalizeImageGenerationPreset({
          ...active_preset,
          id: createImageGenerationPresetId(),
          name: name.trim() || default_name,
        });
        saveImageGenerationState(
          {
            ...image_generation,
            active_preset_id: new_preset.id,
            presets: [...image_generation.presets, new_preset],
          },
          `已新建生图预设：${new_preset.name}。`,
        );
      });

      image_preset_rename?.addEventListener('click', () => {
        const image_generation = syncImageGenerationSettings(false);
        const active_preset =
          image_generation.presets.find(preset => preset.id === image_generation.active_preset_id) ||
          image_generation.presets[0];
        if (!active_preset) return;
        const name = host_window.prompt('请输入新的生图预设名称', active_preset.name);
        if (name == null) return;
        const trimmed_name = name.trim() || active_preset.name;
        saveImageGenerationState(
          {
            ...image_generation,
            presets: image_generation.presets.map(preset =>
              preset.id === active_preset.id ? { ...preset, name: trimmed_name } : preset,
            ),
          },
          `生图预设已重命名为：${trimmed_name}。`,
        );
      });

      image_preset_delete?.addEventListener('click', async () => {
        const image_generation = syncImageGenerationSettings(false);
        const active_preset =
          image_generation.presets.find(preset => preset.id === image_generation.active_preset_id) ||
          image_generation.presets[0];
        if (!active_preset || image_generation.presets.length <= 1) {
          showInlineToast(iframe_document, '至少保留 1 个生图预设。');
          return;
        }
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'warning',
          title: '删除生图预设',
          message: `确认删除“${active_preset.name}”吗？`,
          confirmText: '删除当前预设',
        });
        if (!confirmed) return;
        const next_presets = image_generation.presets.filter(preset => preset.id !== active_preset.id);
        saveImageGenerationState(
          {
            ...image_generation,
            active_preset_id: next_presets[0].id,
            presets: next_presets,
          },
          `已删除生图预设：${active_preset.name}。`,
        );
      });

      save_image_generation?.addEventListener('click', () => {
        syncImageGenerationSettings(true);
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '生图设置已保存。');
      });

      [
        image_connection_mode,
        image_endpoint,
        image_api_key,
        image_positive_prompt,
        image_negative_prompt,
        image_model,
        image_sampler,
        image_noise_schedule,
        image_guidance,
        image_guidance_rescale,
        image_size_preset,
        image_steps,
        image_seed,
        image_ai_default_character_position,
        image_smea,
        image_smea_dyn,
        image_variety,
        image_decrisp,
      ].forEach(element => {
        element?.addEventListener('change', () => syncImageGenerationSettings(true));
      });

      vibe_group_select?.addEventListener('change', () => {
        const image_generation = syncImageGenerationSettings(false);
        saveImageGenerationState(
          {
            ...image_generation,
            active_vibe_group_id: vibe_group_select.value,
          },
          '已切换 Vibe 组。',
        );
      });

      vibe_group_create?.addEventListener('click', () => {
        const image_generation = syncImageGenerationSettings(false);
        const default_name = `Vibe 组 ${image_generation.vibe_groups.length + 1}`;
        const name = host_window.prompt('请输入新的 Vibe 组名称', default_name);
        if (name == null) return;
        const new_group = normalizeImageGenerationVibeGroup({
          id: createImageGenerationVibeGroupId(),
          name: name.trim() || default_name,
          auto_name: true,
          style_strength: 0.6,
          references: [],
        });
        saveImageGenerationState(
          {
            ...image_generation,
            active_vibe_group_id: new_group.id,
            vibe_groups: [...image_generation.vibe_groups, new_group],
          },
          `已新建 Vibe 组：${new_group.name}。`,
        );
      });

      vibe_group_rename?.addEventListener('click', () => {
        const image_generation = syncImageGenerationSettings(false);
        const active_group =
          image_generation.vibe_groups.find(group => group.id === image_generation.active_vibe_group_id) ||
          image_generation.vibe_groups[0];
        if (!active_group) return;
        const name = host_window.prompt('请输入新的 Vibe 组名称', active_group.name);
        if (name == null) return;
        const trimmed_name = name.trim() || active_group.name;
        saveImageGenerationState(
          {
            ...image_generation,
            vibe_groups: image_generation.vibe_groups.map(group =>
              group.id === active_group.id ? { ...group, name: trimmed_name, auto_name: false } : group,
            ),
          },
          `Vibe 组已重命名为：${trimmed_name}。`,
        );
      });

      vibe_group_delete?.addEventListener('click', async () => {
        const image_generation = syncImageGenerationSettings(false);
        const active_group =
          image_generation.vibe_groups.find(group => group.id === image_generation.active_vibe_group_id) ||
          image_generation.vibe_groups[0];
        if (!active_group || image_generation.vibe_groups.length <= 1) {
          showInlineToast(iframe_document, '至少保留 1 个 Vibe 组。');
          return;
        }
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'warning',
          title: '删除 Vibe 组',
          message: `确认删除“${active_group.name}”及其参考图吗？`,
          confirmText: '删除当前组',
        });
        if (!confirmed) return;
        const next_groups = image_generation.vibe_groups.filter(group => group.id !== active_group.id);
        saveImageGenerationState(
          {
            ...image_generation,
            active_vibe_group_id: next_groups[0].id,
            vibe_groups: next_groups,
          },
          `已删除 Vibe 组：${active_group.name}。`,
        );
      });

      const appendVibeReferences = (references: SettingsImageGenerationVibeReference[], detail: string) => {
        const image_generation = syncImageGenerationSettings(false);
        const active_group_id = image_generation.active_vibe_group_id;
        const next_library = [...image_generation.vibe_library, ...references].filter(
          (reference, index, list) => list.findIndex(item => item.id === reference.id) === index,
        );
        const next_groups = image_generation.vibe_groups.map(group =>
          group.id === active_group_id
            ? normalizeImageGenerationVibeGroup({
                ...group,
                references: [...group.references, ...references],
                name: group.auto_name ? getAutoVibeGroupName([...group.references, ...references]) : group.name,
              })
            : group,
        );
        const metadata_reference = references.find(reference => reference.metadata_prompt || reference.metadata_negative_prompt);
        const next_presets = metadata_reference
          ? image_generation.presets.map(preset =>
              preset.id === image_generation.active_preset_id
                ? normalizeImageGenerationPreset({
                    ...preset,
                    positive_prompt: metadata_reference.metadata_prompt || preset.positive_prompt,
                    negative_prompt: metadata_reference.metadata_negative_prompt || preset.negative_prompt,
                  })
                : preset,
            )
          : image_generation.presets;
        saveImageGenerationState(
          {
            ...image_generation,
            presets: next_presets,
            vibe_groups: next_groups,
            vibe_library: next_library,
          },
          metadata_reference ? `${detail} 已从图片元数据提取提示词并回填当前预设。` : detail,
        );
      };

      vibe_image?.addEventListener('change', async () => {
        const files = [...(vibe_image.files || [])];
        if (!files.length) return;
        try {
          const references = await Promise.all(
            files.map(async (file, index) => {
              const metadata = await parseImageMetadata(file).catch(() => ({ prompt: '', negative_prompt: '' }));
              return normalizeImageGenerationVibeReference(
                {
                  id: createImageGenerationVibeReferenceId(),
                  name: file.name || `参考图 ${index + 1}`,
                  file_name: file.name || '',
                  image_data: await readFileAsDataUrl(file),
                  source: 'upload',
                  metadata_prompt: metadata.prompt,
                  metadata_negative_prompt: metadata.negative_prompt,
                },
                index,
              );
            }),
          );
          appendVibeReferences(references, `已上传 ${references.length} 张参考图。`);
        } catch (error) {
          showInlineToast(iframe_document, formatErrorForDisplay(error) || '参考图上传失败。');
        } finally {
          vibe_image.value = '';
        }
      });

      image_prompt_reference?.addEventListener('change', async () => {
        const files = [...(image_prompt_reference.files || [])];
        if (!files.length) return;
        try {
          const image_generation = syncImageGenerationSettings(false);
          const references = await Promise.all(
            files.map(async (file, index) => {
              const metadata = await parseImageMetadata(file).catch(() => ({ prompt: '', negative_prompt: '' }));
              return normalizeImageGenerationPromptReference({
                id: `prompt-ref-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                name: file.name || `提示词参考图 ${index + 1}`,
                file_name: file.name || '',
                image_data: await readFileAsDataUrl(file),
                metadata_prompt: metadata.prompt,
                metadata_negative_prompt: metadata.negative_prompt,
              }, index);
            }),
          );
          const metadata_reference = references.find(reference => reference.metadata_prompt || reference.metadata_negative_prompt);
          saveImageGenerationState(
            {
              ...image_generation,
              presets: image_generation.presets.map(preset =>
                preset.id === image_generation.active_preset_id
                  ? normalizeImageGenerationPreset({
                      ...preset,
                      prompt_references: [...preset.prompt_references, ...references],
                      positive_prompt: metadata_reference?.metadata_prompt || preset.positive_prompt,
                      negative_prompt: metadata_reference?.metadata_negative_prompt || preset.negative_prompt,
                    })
                  : preset,
              ),
            },
            metadata_reference ? '已导入提示词参考图，并解析元数据回填正负面提示词。' : '已导入提示词参考图；未读取到可用元数据。',
          );
        } catch (error) {
          showInlineToast(iframe_document, formatErrorForDisplay(error) || '提示词参考图导入失败。');
        } finally {
          image_prompt_reference.value = '';
        }
      });

      vibe_file?.addEventListener('change', async () => {
        const files = [...(vibe_file.files || [])];
        if (!files.length) return;
        try {
          const references: SettingsImageGenerationVibeReference[] = [];
          for (const file of files) {
            const text = await readFileAsText(file);
            let parsed: Record<string, unknown> | null = null;
            try {
              parsed = JSON.parse(text) as Record<string, unknown>;
            } catch {
              parsed = null;
            }
            const candidates = Array.isArray(parsed?.references)
              ? (parsed?.references as Array<Record<string, unknown>>)
              : Array.isArray(parsed?.vibes)
                ? (parsed?.vibes as Array<Record<string, unknown>>)
                : parsed
                  ? [parsed]
                  : [];
            const parsed_references = candidates
              .map((candidate, index) =>
                normalizeImageGenerationVibeReference(
                  {
                    id: createImageGenerationVibeReferenceId(),
                    name: String(candidate.name || candidate.title || file.name || `Vibe ${index + 1}`),
                    file_name: file.name || '',
                    image_data: findVibeImageData(candidate),
                    source: 'naiv4vibe',
                  },
                  index,
                ),
              )
              .filter(reference => reference.name || reference.image_data);
            references.push(
              ...(parsed_references.length
                ? parsed_references
                : [
                    normalizeImageGenerationVibeReference({
                      id: createImageGenerationVibeReferenceId(),
                      name: file.name || '导入的 Vibe',
                      file_name: file.name || '',
                      image_data: findVibeImageData(parsed),
                      source: 'naiv4vibe',
                    }),
                  ]),
            );
          }
          appendVibeReferences(references, `已导入 ${references.length} 个 Vibe 参考。`);
        } catch (error) {
          showInlineToast(iframe_document, formatErrorForDisplay(error) || 'Vibe 文件导入失败。');
        } finally {
          vibe_file.value = '';
        }
      });

      vibe_library_prev?.addEventListener('click', () => {
        if (!vibe_library_list) return;
        vibe_library_list.dataset.page = String(Math.max(0, Number(vibe_library_list.dataset.page || 0) - 1));
        renderPromptSettings(iframe_document);
      });

      vibe_library_next?.addEventListener('click', () => {
        if (!vibe_library_list) return;
        vibe_library_list.dataset.page = String(Number(vibe_library_list.dataset.page || 0) + 1);
        renderPromptSettings(iframe_document);
      });

      vibe_library_list?.addEventListener('click', event => {
        const add_button = find_event_path_element(event, '[data-add-vibe-to-group]') as HTMLButtonElement | null;
        if (!add_button || add_button.disabled) return;
        event.preventDefault();
        event.stopPropagation();
        const reference_id = String(add_button.dataset.addVibeToGroup || '');
        const image_generation = syncImageGenerationSettings(false);
        const library_reference = image_generation.vibe_library.find(reference => reference.id === reference_id);
        if (!library_reference) return;
        saveImageGenerationState(
          {
            ...image_generation,
            vibe_groups: image_generation.vibe_groups.map(group => {
              if (group.id !== image_generation.active_vibe_group_id || group.references.some(reference => reference.id === reference_id)) {
                return group;
              }
              const references = [...group.references, library_reference];
              return normalizeImageGenerationVibeGroup({
                ...group,
                references,
                name: group.auto_name ? getAutoVibeGroupName(references) : group.name,
              });
            }),
          },
          `已将“${library_reference.name}”加入当前 Vibe 组。`,
        );
      });

      const handleVibeReferenceRemoval = (event: Event) => {
        const remove_reference = find_event_path_element(event, '[data-remove-vibe-reference]');
        if (!remove_reference) {
          return false;
        }
        event.preventDefault();
        event.stopPropagation();
        const reference_id = String(remove_reference.dataset.removeVibeReference || '');
        const image_generation = syncImageGenerationSettings(false);
        const active_group_id = image_generation.active_vibe_group_id;
        const next_groups = image_generation.vibe_groups.map(group =>
          group.id === active_group_id
            ? {
                ...group,
                references: group.references.filter(reference => reference.id !== reference_id),
              }
            : group,
        );
        saveImageGenerationState(
          {
            ...image_generation,
            vibe_groups: next_groups,
          },
          '已移除 Vibe 参考图。',
        );
        return true;
      };

      vibe_reference_list?.addEventListener('click', event => {
        const rename_reference = find_event_path_element(event, '[data-rename-vibe-reference]');
        if (rename_reference) {
          event.preventDefault();
          event.stopPropagation();
          const reference_id = String(rename_reference.dataset.renameVibeReference || '');
          const image_generation = syncImageGenerationSettings(false);
          const active_group = image_generation.vibe_groups.find(group => group.id === image_generation.active_vibe_group_id);
          const reference = active_group?.references.find(item => item.id === reference_id);
          if (reference) {
            const name = host_window.prompt('请输入 Vibe 备注名称', reference.name);
            if (name != null && name.trim()) {
              const next_name = name.trim();
              saveImageGenerationState(
                {
                  ...image_generation,
                  vibe_library: image_generation.vibe_library.map(item => item.id === reference_id ? { ...item, name: next_name } : item),
                  vibe_groups: image_generation.vibe_groups.map(group => {
                    const references = group.references.map(item => item.id === reference_id ? { ...item, name: next_name } : item);
                    return group.auto_name ? { ...group, name: getAutoVibeGroupName(references), references } : { ...group, references };
                  }),
                },
                `Vibe 已重命名为：${next_name}。`,
              );
            }
          }
          return;
        }
        handleVibeReferenceRemoval(event);
      });

      vibe_reference_list?.addEventListener('input', event => {
        const target = event.target && (event.target as HTMLElement).tagName === 'INPUT'
          ? (event.target as HTMLInputElement)
          : null;
        const reference_id = target?.dataset.vibeStrengthReference || target?.dataset.vibeStrengthNumber || '';
        if (!target || !reference_id) return;
        const value = Math.min(1, Math.max(0, Number(target.value) || 0));
        const paired = [...vibe_reference_list.querySelectorAll<HTMLInputElement>('[data-vibe-strength-reference], [data-vibe-strength-number]')]
          .find(input => input !== target && (input.dataset.vibeStrengthReference === reference_id || input.dataset.vibeStrengthNumber === reference_id)) || null;
        if (paired) paired.value = String(value);
        const image_generation = normalizeImageGenerationSettings(getSettings().image_generation);
        saveImageGenerationState(
          {
            ...image_generation,
            vibe_library: image_generation.vibe_library.map(reference => reference.id === reference_id ? { ...reference, strength: value } : reference),
            vibe_groups: image_generation.vibe_groups.map(group => ({
              ...group,
              references: group.references.map(reference => reference.id === reference_id ? { ...reference, strength: value } : reference),
            })),
          },
          '已保存当前 Vibe 的画风强度。',
          false,
        );
      });

      vibe_reference_list?.addEventListener('change', event => {
        const target = event.target && (event.target as HTMLElement).tagName === 'INPUT'
          ? (event.target as HTMLInputElement)
          : null;
        const reference_id = target?.dataset.vibeStrengthReference || target?.dataset.vibeStrengthNumber || '';
        if (!target || !reference_id) return;
        const value = Math.min(1, Math.max(0, Number(target.value) || 0));
        const image_generation = normalizeImageGenerationSettings(getSettings().image_generation);
        saveImageGenerationState(
          {
            ...image_generation,
            vibe_library: image_generation.vibe_library.map(reference => reference.id === reference_id ? { ...reference, strength: value } : reference),
            vibe_groups: image_generation.vibe_groups.map(group =>
              group.id === image_generation.active_vibe_group_id
                ? { ...group, references: group.references.map(reference => reference.id === reference_id ? { ...reference, strength: value } : reference) }
                : group,
            ),
          },
          '已更新当前 Vibe 的画风强度。',
        );
      });

      [
        generation_retry_enabled,
        generation_retry_timeout_ms,
        generation_retry_count,
      ].forEach(element => {
        element?.addEventListener('change', () => syncGenerationRetrySettings(true));
      });

      edit_excluded_characters?.addEventListener('click', async () => {
        const settings = getSettings();
        const selected = await showChecklistDialog(iframe_document, {
          title: '排除角色卡',
          searchPlaceholder: '搜索角色名...',
          doneText: '完成',
          selectedValues: settings.excluded_character_names,
          items: getAvailableCharacterNames().map(name => ({ value: name, label: name })),
        });
        if (!selected) {
          return;
        }
        saveExcludedSettings(
          {
            excluded_character_names: [...new Set(selected.map(name => String(name).trim()).filter(Boolean))],
          },
          `已更新排除角色，共 ${selected.length} 项。`,
        );
      });

      const addExcludedTagValue = () => {
        const raw_value = String(excluded_tag_input?.value || '').trim().replace(/^<|>$/g, '');
        if (!raw_value) {
          return;
        }
        const settings = getSettings();
        const excluded_tags = [...new Set([...(settings.excluded_tags || []), raw_value.toLowerCase()])];
        if (excluded_tag_input) {
          excluded_tag_input.value = '';
        }
        saveExcludedSettings({ excluded_tags }, `已添加排除标签：${raw_value}。`);
      };

      add_excluded_tag?.addEventListener('click', () => addExcludedTagValue());
      inject_default_excluded_tags?.addEventListener('click', () => {
        const settings = getSettings();
        const excluded_tags = [...new Set([...(settings.excluded_tags || []), ...DEFAULT_EXCLUDED_TAGS])];
        saveExcludedSettings({ excluded_tags }, `已注入 ${DEFAULT_EXCLUDED_TAGS.length} 个内置排除标签。`);
      });
      excluded_tag_input?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addExcludedTagValue();
        }
      });

      launch_entry_mode_inputs.forEach(input => {
        input.addEventListener('change', () => syncLaunchEntryModes());
      });

      reset_script_settings?.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'warning',
          title: '确认脚本初始化',
          message:
            '将删除并恢复：个人提示词、已发布提示词、摘要标签预设、第二 API 设置、世界书条目选择等脚本设置。\n\n会保留：当前聊天及已生成的页面内容。',
          confirmText: '确认初始化',
        });
        if (!confirmed) {
          return;
        }
        resetPersonalSettingsToDefault();
        prompt_is_dirty = false;
        renderPromptSettings(iframe_document);
        sync_host_entry_buttons();
        collectSourceDebugSnapshot(iframe_document, '脚本初始化');
        showInlineToast(iframe_document, '脚本设置已恢复初始状态，页面内容已保留。');
      });

      format_script_all?.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'danger',
          title: '确认格式化脚本',
          message:
            '将删除并恢复：个人提示词、已发布提示词、摘要标签预设、第二 API 设置、世界书条目选择等脚本设置。\n\n还会删除：从当前版本开始登记过的所有聊天窗口页面内容、生成索引，以及浏览器本地已知旧缓存。',
          confirmText: '确认格式化',
        });
        if (!confirmed) {
          return;
        }
        resetPersonalSettingsToDefault();
        clearKnownOnlineStorage();
        prompt_is_dirty = false;
        renderPromptSettings(iframe_document);
        renderOnlineContent(iframe_document);
        collectSourceDebugSnapshot(iframe_document, '脚本格式化');
        showInlineToast(iframe_document, '已格式化脚本设置和所有已登记页面内容。');
      });

      format_current_chat?.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(iframe_document, {
          tone: 'danger',
          title: '确认格式化当前聊天窗口',
          message:
            '只会删除当前聊天窗口保存的页面内容，包括所有生成记录、备选版本、标题、收藏和页面正文记忆。\n\n不会删除提示词、第二 API、摘要标签、世界书选择等脚本设置。',
          confirmText: '删除当前聊天页面内容',
        });
        if (!confirmed) {
          return;
        }
        clearCurrentOnlineData();
        renderOnlineContent(iframe_document);
        showInlineToast(iframe_document, '已删除当前聊天窗口的页面内容。');
      });

      quick_create_theater?.addEventListener('click', async () => {
        close_toolbar_menu();
        const result = await show_quick_create_theater_dialog();
        if (!result) {
          return;
        }
        if (result.oneTime) {
          setTemporaryGenerationDetailPrompt({
            name: result.name,
            content: result.content,
            description: result.description,
            tags: result.tags,
          });
          showInlineToast(iframe_document, '一次性小剧场已加入本次生成。');
          generateOnlineForCurrentChat(iframe_document, `快速新建：${result.name}`);
          return;
        }
        const settings = getSettings();
        let next_folder_id = result.folderId || settings.detail_prompt_folders[0]?.id || 'detail-folder-default';
        let next_folders = [...settings.detail_prompt_folders];
        if (result.newFolderName) {
          const existing_folder = next_folders.find(folder => folder.name === result.newFolderName);
          if (existing_folder) {
            next_folder_id = existing_folder.id;
          } else {
            next_folder_id = createPromptId();
            next_folders = [...next_folders, { id: next_folder_id, name: result.newFolderName }];
          }
        }
        const prompt = {
          id: createPromptId(),
          name: result.name,
          description: result.description,
          content: result.content,
          folder_id: next_folder_id,
          tags: result.tags,
          created_at: new Date().toISOString(),
          source: 'personal' as const,
          is_published: false,
        };
        saveSettings({
          ...settings,
          detail_prompt_folders: next_folders,
          detail_prompt_tags: [...new Set([...(settings.detail_prompt_tags || []), ...result.tags])],
          active_detail_prompt_id: prompt.id,
          detail_prompts: [...settings.detail_prompts, prompt],
        });
        if (detail_library_root) {
          detail_library_root.dataset.folderId = next_folder_id;
          detail_library_root.dataset.selectedPromptId = prompt.id;
        }
        renderPromptSettings(iframe_document);
        showInlineToast(iframe_document, '已新建并保存小剧场。');
      });

      refresh_online?.addEventListener('click', () => {
        close_toolbar_menu();
        restore_online_preview();
        showInlineToast(iframe_document, '已刷新当前页面预览。');
      });

      regenerate_online?.addEventListener('click', async () => {
        if (regenerate_online.disabled || online_is_generating) {
          return;
        }
        close_toolbar_menu();
        regenerate_online.disabled = true;
        const options = await showGenerateOptionsDialog(iframe_document, {
          title: '手动生成',
          message: '指定目标楼层（消息编号）与生成数量。',
          confirmText: '开始生成',
        });
        if (!options) {
          regenerate_online.disabled = false;
          return;
        }
        if (online_is_generating) {
          regenerate_online.disabled = false;
          return;
        }
        host_window.clearTimeout(regenerate_cooldown_timer);
        showInlineToast(iframe_document, '已开始手动生成。');
        try {
          let floors = options.floors;
          const count = options.count;
          if (floors?.length) {
            const visible_messages = getVisibleChatMessagesSafely();
            const visible_ids = new Set(visible_messages.map(message => Number(message.message_id)));
            floors = floors.filter(floor => visible_ids.has(floor));
            if (!floors.length) {
              showInlineToast(iframe_document, '输入的楼层在当前聊天中不存在，已取消生成。');
              return;
            }
          }
          const reason_base = '手动重新生成';
          if (!floors?.length) {
            for (let index = 0; index < count; index += 1) {
              await generateOnlineForCurrentChat(
                iframe_document,
                `${reason_base}${count > 1 ? `（第 ${index + 1}/${count} 个）` : ''}`,
              );
            }
          } else {
            for (const floor of floors) {
              for (let index = 0; index < count; index += 1) {
                await generateOnlineForCurrentChat(
                  iframe_document,
                  `${reason_base} · 楼层 ${floor}${count > 1 ? `（第 ${index + 1}/${count} 个）` : ''}`,
                  floor,
                );
              }
            }
          }
        } finally {
          regenerate_online.disabled = false;
          regenerate_cooldown_timer = 0;
        }
      });

      previous_online_version?.addEventListener('click', () => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          return;
        }
        setActiveOnlineVariant(active_entry.id, 'previous');
        close_toolbar_menu();
        renderOnlineContent(iframe_document);
      });

      next_online_version?.addEventListener('click', () => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          return;
        }
        setActiveOnlineVariant(active_entry.id, 'next');
        close_toolbar_menu();
        renderOnlineContent(iframe_document);
      });

      toggle_panel_fullscreen?.addEventListener('click', () => {
        const is_fullscreen = togglePanelFullscreen(iframe, iframe_body);
        renderOnlineContent(iframe_document);
        showInlineToast(iframe_document, is_fullscreen ? '已切换为全屏显示。' : '已退出全屏显示。');
      });

      delete_online?.addEventListener('click', () => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          return;
        }
        deleteActiveOnlineVariant(active_entry.id);
        close_toolbar_menu();
        renderOnlineContent(iframe_document);
      });

      edit_online_code?.addEventListener('click', () => {
        open_online_editor();
      });

      cancel_online_code?.addEventListener('click', () => {
        code_editor_panel?.setAttribute('hidden', '');
      });

      const jump_to_source_message = (should_close_panel: boolean) => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          return;
        }
        const scrolled = scrollToSourceMessage(active_entry.message_id);
        close_toolbar_menu();
        if (should_close_panel && scrolled) {
          close_panel_and_suspend_preview();
        }
        showInlineToast(iframe_document, scrolled ? '已定位到原始酒馆楼层。' : '没有找到对应的酒馆楼层。');
      };

      scroll_source_message?.addEventListener('click', () => jump_to_source_message(false));
      scroll_source_message_mobile?.addEventListener('click', () => jump_to_source_message(isMobileViewport()));

      save_online_code?.addEventListener('click', () => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          return;
        }
        const editor_value = online_code_editor?.value || '';
        updateOnlineEntry(active_entry.id, {
          html: editor_value,
          memory_text: extractOnlineMemoryTextFromHtml(editor_value),
        });
        renderOnlineContent(iframe_document);
        showInlineToast(iframe_document, '代码已保存，并已重新提取正文记忆。');
      });

      online_title_display?.addEventListener('click', open_title_editor);
      edit_online_title?.addEventListener('click', open_title_editor);

      online_title_input?.addEventListener('blur', save_title_editor);
      online_title_input?.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          save_title_editor();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          renderOnlineContent(iframe_document);
        }
      });

      toolbar_more?.addEventListener('click', event => {
        event.stopPropagation();
        reset_edit_button_state();
        const is_open = toolbar_menu?.classList.toggle('is-open');
        toolbar_more.setAttribute('aria-expanded', String(Boolean(is_open)));
      });

      iframe_document.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target : null;
        if (toolbar_menu?.classList.contains('is-open') && !target?.closest('.online-actions')) {
          close_toolbar_menu();
        }
        if (
          edit_choice_menu?.classList.contains('is-open') &&
          !target?.closest('[data-edit-online-code], [data-edit-choice-menu]')
        ) {
          reset_edit_button_state();
        }
      });

      toggle_favorite?.addEventListener('click', () => {
        const active_entry = getCurrentOnlineData().active_entry;
        if (!active_entry) {
          return;
        }
        updateOnlineEntry(active_entry.id, {
          favorite: !active_entry.favorite,
        });
        close_toolbar_menu();
        renderOnlineContent(iframe_document);
      });

      const resize_handler = () => {
        applyViewportClass(iframe_body);
        sync_mobile_header_metrics();
        if (iframe_body.classList.contains('is-panel')) {
          iframe_body.classList.toggle('is-panel-force-fullscreen', isPanelForceFullscreenViewport());
        }
        setIframeMode(iframe, iframe_body.classList.contains('is-panel') ? 'panel' : 'bubble');
      };

      const open_entry_for_message = (message_id: string | number) => {
        const entry = findOnlineEntryForMessage(message_id, true);
        if (!entry) {
          showInlineToast(iframe_document, '没有找到这层对应的页面。');
          return;
        }
        const current_swipe_id = getCurrentMessageSwipeId(message_id);
        const current_swipe_variant = entry.variants
          ?.filter(variant => Number(variant.source_swipe_id || 0) === Number(current_swipe_id))
          .at(-1);
        if (current_swipe_variant) {
          saveOnlineData({
            ...getCurrentOnlineData(),
            entries: getCurrentOnlineData().entries.map(item =>
              item.id === entry.id ? { ...item, active_variant_id: current_swipe_variant.id } : item,
            ),
            active_entry_id: entry.id,
            selected_entry_by_message: {
              ...getCurrentOnlineData().selected_entry_by_message,
              [getOnlineEntryKey(message_id)]: entry.id,
            },
            selected_variant_by_message: {
              ...getCurrentOnlineData().selected_variant_by_message,
              [getOnlineEntryKey(message_id)]: current_swipe_variant.id,
            },
          });
        } else {
          setActiveOnlineEntry(entry.id);
        }
        open_panel_with_preview();
        switchMainView(iframe_document, 'online');
        renderOnlineContent(iframe_document);
        showInlineToast(iframe_document, '已打开这层对应的页面。');
      };

      host_window.addEventListener('resize', resize_handler);
      const host_window_runtime = host_window as unknown as Window & Record<string, unknown>;
      host_window_runtime[SCRIPT_ID] = {
        openEntryForMessage: open_entry_for_message,
        destroy() {
          host_window.removeEventListener('resize', resize_handler);
          mobile_layout_resize_observer?.disconnect();
          flushWindowState();
          host_window.clearTimeout(collect_timer);
          host_window.clearTimeout(source_collect_timer);
          host_window.clearTimeout(regenerate_cooldown_timer);
          host_window.clearTimeout(window_state_save_timer);
          host_window.clearTimeout(floating_launcher_restore_timer);
          host_window.clearInterval(theme_sync_timer);
          floating_launcher_dom_observer?.disconnect();
          monitor_stops.forEach(stop => stop());
          removeOldWindow();
          delete host_window_runtime[SCRIPT_ID];
        },
      } satisfies ScriptRuntimeUi;

      console.info('[LoreFrame] 已挂载');
    } catch (error) {
      console.error('[LoreFrame] iframe load 阶段失败', error);
      throw error;
    }
  });
}

$(window).on('pagehide', () => {
  const host_window_runtime = host_window as unknown as Window & Record<string, unknown>;
  const runtime = host_window_runtime[SCRIPT_ID] as ScriptRuntimeUi | undefined;
  runtime?.destroy?.();
});
