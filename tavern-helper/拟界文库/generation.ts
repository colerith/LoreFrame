type SecondaryApiProvider = 'openai' | 'google_ai_studio' | 'vertex_ai';

type SecondaryApiBaseConfig = {
  apiurl?: string;
  proxy_url?: string;
  key?: string;
  model?: string;
  proxy_password?: string;
  vertex_token?: string;
  vertex_location?: string;
  vertex_project_id?: string;
};

type SecondaryApiSettings = SecondaryApiBaseConfig & {
  enabled?: boolean;
  provider?: string;
  source?: string;
  providers?: Record<string, SecondaryApiBaseConfig | undefined>;
};

type SecondaryApiRuntimeConfig = {
  apiurl: string;
  key: string;
  model: string;
  source: 'openai' | 'makersuite' | 'vertexai';
  provider: SecondaryApiProvider;
  proxy_password?: string;
  reverse_proxy_password?: string;
  vertex_token?: string;
  vertex_location?: string;
  vertex_project_id?: string;
  auth_mode?: 'service_account' | 'api_key';
  location?: string;
  project_id?: string;
};

type ModelListItem = string | { id?: string; name?: string; model?: string; displayName?: string };

type ModelListResult = ModelListItem[] | { data?: ModelListItem[]; models?: ModelListItem[] };

type StreamEventSource = {
  STREAM_TOKEN_RECEIVED_FULLY?: string;
};

type GenerateRawOptions = {
  generation_id: string;
  should_stream: boolean;
  should_silence: boolean;
  ordered_prompts: unknown[];
  custom_api?: SecondaryApiRuntimeConfig;
};

type GenerationRetrySettings = {
  enabled?: boolean;
  timeout_ms?: number;
  max_retries?: number;
};

type GenerateRawFn = (options: GenerateRawOptions) => Promise<unknown>;

type GetModelListFn = (config: SecondaryApiRuntimeConfig) => Promise<ModelListResult>;

type EventApi = {
  event_on?: (eventName: string, handler: (...args: unknown[]) => void) => EventListenerHandle;
};

function normalizeSecondaryApiProvider(provider: unknown): SecondaryApiProvider {
  const normalized_provider = String(provider || '');
  return ['openai', 'google_ai_studio', 'vertex_ai'].includes(normalized_provider)
    ? (normalized_provider as SecondaryApiProvider)
    : 'openai';
}

function getSecondaryApiSource(provider: SecondaryApiProvider) {
  if (provider === 'google_ai_studio') return 'makersuite';
  if (provider === 'vertex_ai') return 'vertexai';
  return 'openai';
}

function getSecondaryApiProviderConfig(
  config: SecondaryApiSettings | null | undefined,
  provider: SecondaryApiProvider,
) {
  const providers = config?.providers && typeof config.providers === 'object' ? config.providers : {};
  if (provider === 'openai') {
    return {
      apiurl: String(providers.openai?.apiurl ?? config?.apiurl ?? '').trim(),
      key: String(providers.openai?.key ?? config?.key ?? '').trim(),
      model: String(providers.openai?.model ?? config?.model ?? '').trim(),
    };
  }
  if (provider === 'google_ai_studio') {
    return {
      apiurl: String(
        providers.google_ai_studio?.proxy_url ?? providers.google_ai_studio?.apiurl ?? config?.apiurl ?? '',
      ).trim(),
      key: String(providers.google_ai_studio?.key ?? config?.key ?? '').trim(),
      proxy_password: String(providers.google_ai_studio?.proxy_password ?? config?.proxy_password ?? '').trim(),
      model: String(providers.google_ai_studio?.model ?? config?.model ?? '').trim(),
    };
  }
  return {
    key: String(providers.vertex_ai?.key ?? config?.key ?? '').trim(),
    vertex_token: String(providers.vertex_ai?.vertex_token ?? config?.vertex_token ?? '').trim(),
    vertex_location: String(providers.vertex_ai?.vertex_location ?? config?.vertex_location ?? '').trim(),
    vertex_project_id: String(providers.vertex_ai?.vertex_project_id ?? config?.vertex_project_id ?? '').trim(),
    model: String(providers.vertex_ai?.model ?? config?.model ?? '').trim(),
  };
}

function buildSecondaryApiConfig(
  settings: { secondary_api?: SecondaryApiSettings } | null | undefined,
): SecondaryApiRuntimeConfig | null {
  const config = settings?.secondary_api;
  if (!config?.enabled) return null;
  const provider = normalizeSecondaryApiProvider(config.provider || config.source);
  const provider_config = getSecondaryApiProviderConfig(config, provider);
  const model = String(provider_config.model || '').trim();
  if (!model) return null;
  if (provider === 'openai') {
    if (!provider_config.apiurl) return null;
    return {
      apiurl: provider_config.apiurl,
      key: provider_config.key || '',
      model,
      source: 'openai',
      provider,
    };
  }
  if (provider === 'google_ai_studio') {
    if (!provider_config.key && !provider_config.apiurl) return null;
    return {
      apiurl: provider_config.apiurl || '',
      key: provider_config.key || '',
      model,
      source: 'makersuite',
      provider,
      proxy_password: provider_config.proxy_password,
      reverse_proxy_password: provider_config.proxy_password,
    };
  }
  if (provider === 'vertex_ai') {
    const auth_key = provider_config.vertex_token || provider_config.key;
    if (!auth_key) return null;
    return {
      apiurl: '',
      key: auth_key,
      model,
      source: 'vertexai',
      provider,
      auth_mode: provider_config.vertex_token ? 'service_account' : 'api_key',
      vertex_token: provider_config.vertex_token,
      vertex_location: provider_config.vertex_location,
      vertex_project_id: provider_config.vertex_project_id,
      location: provider_config.vertex_location,
      project_id: provider_config.vertex_project_id,
    };
  }
  return null;
}

function describeGenerationApi(api_config: SecondaryApiRuntimeConfig | null | undefined) {
  if (!api_config) return '主 API 当前模型';
  if (api_config.provider === 'google_ai_studio') return '第二 API（Google AI Studio）';
  if (api_config.provider === 'vertex_ai') return '第二 API（Google Vertex AI）';
  return '第二 API（OpenAI 兼容）';
}

function getCurrentMainApiModelName() {
  const context = getSillyTavernContext();
  const host_window_with_textgen = host_window as Window & {
    textgenerationwebui_settings?: { model?: string; model_name?: string };
  };
  try {
    const current_chat_model = context?.getChatCompletionModel?.();
    if (current_chat_model) return String(current_chat_model);
  } catch {
    // 兼容旧环境取不到主模型名称时，回退到其它字段。
  }
  return String(
    context?.textCompletionSettings?.model ||
      context?.textCompletionSettings?.model_name ||
      host_window_with_textgen.textgenerationwebui_settings?.model ||
      host_window_with_textgen.textgenerationwebui_settings?.model_name ||
      '主 API 当前模型',
  );
}

function describeGenerationModel(api_config: SecondaryApiRuntimeConfig | null | undefined) {
  return api_config?.model || getCurrentMainApiModelName();
}

function maskGenerationApiConfig(api_config: SecondaryApiRuntimeConfig | null | undefined) {
  if (!api_config) return null;
  return {
    ...api_config,
    key: api_config.key ? '***' : '',
    vertex_token: api_config.vertex_token ? '***' : '',
    proxy_password: api_config.proxy_password ? '***' : '',
    reverse_proxy_password: api_config.reverse_proxy_password ? '***' : '',
  };
}

function safeStringValue(value: unknown) {
  try {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    return '';
  } catch {
    return '';
  }
}

function normalizeModelListResult(result: ModelListResult | null | undefined) {
  const raw_items = Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.models)
        ? result.models
        : [];
  const models = raw_items
    .map((item: ModelListItem) =>
      typeof item === 'string' ? item : item?.id || item?.name || item?.model || item?.displayName,
    )
    .filter((model): model is string => Boolean(model))
    .map((model: string) =>
      safeStringValue(model)
        .replace(/^models\//, '')
        .replace(/^publishers\/google\/models\//, '')
        .trim(),
    );
  return [...new Set(models)]
    .filter((model: string) => model.length <= 160)
    .sort((left: string, right: string) => left.localeCompare(right));
}

async function fetchJsonModelList(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw Error('模型列表请求失败：HTTP ' + response.status);
  }
  return response.json();
}

async function fetchSecondaryApiModelList(config: SecondaryApiSettings | null | undefined) {
  const provider = normalizeSecondaryApiProvider(config?.provider || 'openai');
  const provider_config = getSecondaryApiProviderConfig(config, provider);
  const apiurl =
    provider === 'google_ai_studio' ? provider_config.apiurl : provider === 'openai' ? provider_config.apiurl : '';
  const key = provider === 'vertex_ai' ? provider_config.key : provider_config.key || '';
  const model_config: SecondaryApiRuntimeConfig = {
    apiurl: apiurl || '',
    key,
    model: String(provider_config.model || '').trim(),
    source: getSecondaryApiSource(provider),
    provider,
    proxy_password: provider === 'google_ai_studio' ? provider_config.proxy_password : '',
    reverse_proxy_password: provider === 'google_ai_studio' ? provider_config.proxy_password : '',
    vertex_token: provider === 'vertex_ai' ? provider_config.vertex_token : '',
    vertex_location: provider === 'vertex_ai' ? provider_config.vertex_location : '',
    vertex_project_id: provider === 'vertex_ai' ? provider_config.vertex_project_id : '',
    location: provider === 'vertex_ai' ? provider_config.vertex_location : '',
    project_id: provider === 'vertex_ai' ? provider_config.vertex_project_id : '',
  };
  const get_model_list = getApiFunction('getModelList') as GetModelListFn | undefined;

  if (provider === 'openai') {
    if (!apiurl) throw Error('请先填写 OpenAI 兼容 Endpoint。');
    if (typeof get_model_list !== 'function') throw Error('当前环境没有 getModelList 接口，请手动填写模型名称。');
    return normalizeModelListResult(await get_model_list(model_config));
  }

  if (provider === 'google_ai_studio') {
    if (!key && !apiurl) throw Error('请先填写 Google AI Studio API Key，或填写可拉取模型的反向代理。');
    if (apiurl && typeof get_model_list === 'function') {
      try {
        return normalizeModelListResult(await get_model_list(model_config));
      } catch (error) {
        if (!key) throw error;
      }
    }
    if (!key) throw Error('反向代理拉取失败，且未填写 API Key。');
    const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key);
    return normalizeModelListResult(await fetchJsonModelList(url));
  }

  if (provider === 'vertex_ai') {
    const auth_key = String(provider_config.vertex_token || provider_config.key || '').trim();
    const location = String(provider_config.vertex_location || 'global').trim();
    const project_id = String(provider_config.vertex_project_id || '').trim();
    if (!auth_key) throw Error('请先填写 Vertex API Key 或 Vertex Token。');
    if (!project_id) throw Error('Vertex 默认接口拉取模型需要填写项目 ID。');
    const base = 'https://' + (location && location !== 'global' ? location + '-' : '') + 'aiplatform.googleapis.com';
    const url =
      base.replace(/\/$/, '') +
      '/v1/projects/' +
      encodeURIComponent(project_id) +
      '/locations/' +
      encodeURIComponent(location || 'global') +
      '/publishers/google/models' +
      (provider_config.vertex_token ? '' : '?key=' + encodeURIComponent(auth_key));
    const headers = provider_config.vertex_token ? { Authorization: 'Bearer ' + auth_key } : undefined;
    return normalizeModelListResult(await fetchJsonModelList(url, { headers }));
  }

  throw Error('未知第二 API 类型。');
}

function clearHostTypingIndicator() {
  const clear_once = () => {
    const indicator = host_document.getElementById('typing_indicator');
    if (indicator) {
      indicator.remove();
    }
  };
  clear_once();
  host_window.setTimeout(clear_once, 80);
  host_window.setTimeout(clear_once, 450);
}

function previewStreamingText(iframe_document: Document, text: string) {
  const preview = iframe_document.querySelector('[data-online-preview]') as HTMLIFrameElement | null;
  if (!preview) return;
  preview.srcdoc =
    '<pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;padding:18px;line-height:1.6;">' +
    escapeHtml(text) +
    '</pre>';
}

async function generateOnlineForCurrentChat(
  iframe_document: Document,
  reason: string,
  target_message_id?: string | number | null,
) {
  if (online_is_generating) return;
  const generate_raw = getApiFunction('generateRaw') as GenerateRawFn | undefined;
  if (typeof generate_raw !== 'function') {
    setOnlineStatus(iframe_document, '生成失败', '没有找到 generateRaw 接口；请确认由酒馆助手加载。');
    markGenerationFinished(iframe_document, 'error', '生成失败', '没有找到 generateRaw 接口');
    appendRunLog('报错', '没有找到 generateRaw 接口。');
    return;
  }
  const settings = getSettings();
  const exclusion_state = getOnlineFeatureExclusionState(settings);
  if (exclusion_state.excluded) {
    setOnlineStatus(iframe_document, '当前角色已排除', exclusion_state.reason || '当前角色已被排除。');
    markGenerationFinished(iframe_document, 'idle', '当前角色已排除', exclusion_state.reason || '当前角色已被排除。');
    appendRunLog('监听', '当前角色命中排除设置，已跳过生成。', exclusion_state);
    return;
  }
  const temporary_detail_prompt = consumeTemporaryGenerationDetailPrompt();
  const bypass_detail_probability = reason === '重新生成' || reason.startsWith('手动重新生成');
  const active_prompt = getGenerationPrompt(
    settings,
    temporary_detail_prompt
      ? {
          name: temporary_detail_prompt.name,
          content: temporary_detail_prompt.content,
        }
      : null,
    { bypass_trigger_probability: bypass_detail_probability },
  );
  const detail_prompt_debug = active_prompt.detail_prompt_debug || null;
  let should_notify_completion = true;
  if (
    detail_prompt_debug?.mode === 'random' &&
    detail_prompt_debug.reason === 'random-probability-miss' &&
    !bypass_detail_probability
  ) {
    const skip_message = `本次未命中小剧场生成概率（${detail_prompt_debug.trigger_probability}%），已跳过整次生成。`;
    setOnlineStatus(iframe_document, '本次未触发', skip_message);
    setBubbleGenerationState(iframe_document, 'idle');
    should_notify_completion = false;
    appendRunLog('监听', skip_message, {
      reason,
      detail_prompt_debug,
      prompt_name: active_prompt.name,
    });
    return;
  }
  if (
    detail_prompt_debug?.mode === 'random' &&
    !active_prompt.detail_content?.trim() &&
    ['random-no-active-prompts', 'random-configured-prompts-not-found'].includes(
      String(detail_prompt_debug.reason || ''),
    )
  ) {
    const error_message =
      detail_prompt_debug.reason === 'random-no-active-prompts'
        ? '随机小剧场已开启，但当前没有激活的小剧场，已取消生成。'
        : '随机小剧场已开启，但激活列表中的小剧场在当前库中找不到，已取消生成。';
    setOnlineStatus(iframe_document, '生成失败', error_message);
    appendRunLog('报错', error_message, {
      reason,
      detail_prompt_debug,
      prompt_name: active_prompt.name,
    });
    return;
  }
  if (!active_prompt?.base_content?.trim() && !active_prompt?.detail_content?.trim()) {
    setOnlineStatus(iframe_document, '生成失败', '当前提示词为空，请先到提示词管理里填写并保存。');
    markGenerationFinished(iframe_document, 'error', '生成失败', '当前提示词为空');
    appendRunLog('报错', '当前提示词为空，未发送 API 请求。');
    return;
  }

  online_is_generating = true;
  clearHostTypingIndicator();
  markGenerationStarted(iframe_document);
  const generation_id = createGenerationId();
  const active_detail_prompt_name = String(active_prompt.random_detail_prompt_name || '').trim();
  active_online_generation_id = generation_id;
  const secondary_api_config = buildSecondaryApiConfig(settings);
  const retry_settings = normalizeGenerationRetrySettings(
    (settings as { generation_retry?: GenerationRetrySettings } | null | undefined)?.generation_retry,
  );
  setOnlineStatus(
    iframe_document,
    '生成中',
    '触发原因：' +
      reason +
      '。使用 ' +
      describeGenerationApi(secondary_api_config) +
      ' 的 generateRaw，不读取预设提示词。',
  );
  let stream_stop: EventListenerHandle = null;
  let parse_or_save_error_logged = false;
  try {
    const material = await collectOnlineSourceMaterial(target_message_id);
    setOnlineStatus(
      iframe_document,
      '生成中',
      '触发原因：' +
        reason +
        '。本次使用 ' +
        describeGenerationApi(secondary_api_config) +
        '；发送可见楼层 ' +
        material.message_count +
        ' / 全部楼层 ' +
        material.total_message_count +
        (target_message_id != null ? '；指定楼层 ' + target_message_id : '') +
        '，隐藏楼层及其历史页面不会发送。',
    );
    const ordered_prompts = buildOnlineOrderedPrompts(material, active_prompt);
    let streaming_text = '';
    let active_attempt_generation_id = generation_id;
    let cancel_attempt_timeout = () => {};
    const event_api = getEventApi() as EventApi | null;
    const iframe_events_source =
      (host_window as Window & { iframe_events?: StreamEventSource }).iframe_events ||
      (window as Window & { iframe_events?: StreamEventSource }).iframe_events;
    stream_stop =
      event_api?.event_on && iframe_events_source?.STREAM_TOKEN_RECEIVED_FULLY
        ? event_api.event_on(
            iframe_events_source.STREAM_TOKEN_RECEIVED_FULLY,
            (text: unknown, event_generation_id: unknown) => {
              const normalized_event_generation_id = String(event_generation_id || '').trim();
              if (
                normalized_event_generation_id &&
                ![generation_id, active_attempt_generation_id].includes(normalized_event_generation_id)
              ) {
                return;
              }
              streaming_text = String(text || '');
              if (streaming_text.length > 0) {
                cancel_attempt_timeout();
              }
              setOnlineStatus(iframe_document, '流式生成中', '已接收 ' + streaming_text.length + ' 字。');
              if (streaming_text.length > MAX_ONLINE_STREAM_CHARS) {
                const stop_generation_by_id = getApiFunction('stopGenerationById');
                if (typeof stop_generation_by_id === 'function') stop_generation_by_id(active_attempt_generation_id);
              }
            },
          )
        : null;
    appendRunLog('API', '开始发送 generateRaw 请求。', {
      generation_id,
      stream: true,
      api: describeGenerationApi(secondary_api_config),
      model: describeGenerationModel(secondary_api_config),
      prompt_name: active_prompt.name,
      random_detail_prompt: active_detail_prompt_name || null,
      detail_prompt_debug,
      visible_messages: material.message_count,
      total_messages: material.total_message_count,
      custom_api: maskGenerationApiConfig(secondary_api_config),
    });
    const run_generate_attempt = async (attempt: number) => {
      const attempt_generation_id = attempt === 0 ? generation_id : `${generation_id}-retry-${attempt + 1}`;
      active_attempt_generation_id = attempt_generation_id;
      const timeout_ms = retry_settings.enabled ? retry_settings.timeout_ms : 0;
      const stop_generation_by_id = getApiFunction('stopGenerationById') as ((id: string) => void) | undefined;
      const request = generate_raw({
        generation_id: attempt_generation_id,
        should_stream: true,
        should_silence: true,
        ordered_prompts,
        custom_api: secondary_api_config || undefined,
      });
      if (!timeout_ms) {
        cancel_attempt_timeout = () => {};
        return request;
      }
      let timeout_timer = 0;
      const clear_timeout = () => {
        if (timeout_timer) {
          host_window.clearTimeout(timeout_timer);
          timeout_timer = 0;
        }
      };
      const timeout_request = new Promise((_, reject) => {
        timeout_timer = host_window.setTimeout(() => {
          if (streaming_text.trim().length > 0) {
            return;
          }
          if (typeof stop_generation_by_id === 'function') {
            stop_generation_by_id(attempt_generation_id);
          }
          reject(Error(`生成请求超时（${timeout_ms}ms 内仍为 0 token）`));
        }, timeout_ms);
      });
      cancel_attempt_timeout = clear_timeout;
      try {
        return await Promise.race([request, timeout_request]);
      } finally {
        cancel_attempt_timeout = () => {};
        clear_timeout();
      }
    };
    let result: unknown = '';
    let last_error: unknown = null;
    const total_attempts = retry_settings.enabled ? retry_settings.max_retries + 1 : 1;
    for (let attempt = 0; attempt < total_attempts; attempt += 1) {
      try {
        if (attempt > 0) {
          setOnlineStatus(
            iframe_document,
            '自动重试中',
            `第 ${attempt + 1}/${total_attempts} 次尝试，原因：${formatErrorForDisplay(last_error) || '上次请求失败'}。`,
          );
          appendRunLog('API', '开始自动重试。', {
            attempt: attempt + 1,
            total_attempts,
            error: formatErrorForDisplay(last_error),
          });
        }
        result = await run_generate_attempt(attempt);
        last_error = null;
        break;
      } catch (error) {
        last_error = error;
        if (attempt >= total_attempts - 1) {
          throw error;
        }
      }
    }
    appendRunLog(
      'API',
      '返回内容预览（原始回复）。',
      typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      { collapsed: true, full_detail: true },
    );
    if (!String(result || '').trim()) {
      parse_or_save_error_logged = true;
      appendRunLog('报错', 'API 返回为空，未生成页面。');
      throw Error('API 返回为空，未生成页面。');
    }
    const parsed = parseOnlineGenerationResult(result);
    let saved;
    try {
      saved = saveCurrentOnlineData({
        ...parsed,
        message_id: material.latest_message_id,
        swipe_id: material.latest_swipe_id,
        source_message_signature: material.latest_message_signature,
        entry_key: material.latest_message_key,
        message_count: material.message_count,
        prompt_name: active_prompt.name,
        detail_prompt_name: active_detail_prompt_name,
      });
    } catch (error) {
      parse_or_save_error_logged = true;
      appendRunLog('报错', '解析或保存异常。', formatErrorForDisplay(error));
      throw error;
    }
    setOnlineStatus(iframe_document, '生成完成', '已保存到当前聊天：' + formatTime(new Date(saved.updated_at)));
    markGenerationFinished(iframe_document, 'success', '生成完成');
    recordDetailPromptActivation(active_detail_prompt_name, active_prompt.name, material.latest_message_id);
    if (should_notify_completion) {
      showHostEchoToast('小剧场生成完成，已写入当前聊天。', 'success');
    }
    renderOnlineContent(iframe_document);
    switchMainView(iframe_document, 'online');
  } catch (error) {
    setOnlineStatus(iframe_document, '生成失败', formatErrorForDisplay(error));
    markGenerationFinished(iframe_document, 'error', '生成失败', formatErrorForDisplay(error));
    if (!parse_or_save_error_logged) appendRunLog('报错', 'API 抛错。', formatErrorForDisplay(error));
    console.error('[LoreFrame] 页面生成失败', error);
  } finally {
    stopEventListener(stream_stop);
    clearHostTypingIndicator();
    if (active_online_generation_id === generation_id) active_online_generation_id = '';
    online_is_generating = false;
    last_online_generation_finished_at = Date.now();
  }
}
