type PromptViewerRole = 'system' | 'assistant' | 'user';

type PromptViewerMessage = {
  role: PromptViewerRole;
  content: string;
};

type PromptViewerMaterial = {
  world_info?: string;
  chat_history?: string;
  last_chat?: string;
  message_count?: number;
  total_message_count?: number;
};

type PromptViewerConfig = {
  name?: string;
  base_content?: string;
  detail_content?: string;
  random_detail_prompt_name?: string;
  detail_prompt_debug?: {
    mode?: string;
    bypass_trigger_probability?: boolean;
    trigger_probability?: number;
    selected_count?: number;
    requested_count?: number;
  } | null;
};

function buildImageGenerationThinkingPrompt() {
  const settings = getSettings();
  const image_generation = settings.image_generation || getDefaultImageGenerationSettings();
  if (image_generation.enabled && image_generation.mode === 'gpt_image') {
    const config = normalizeGptImageSettings(image_generation.gpt_image);
    return `<ImageGenerationThinking mode="gpt_image">
按页面需要规划图片资产；用完整自然语言描述主体、构图、环境、光线与风格，不使用 NovelAI 标签权重。
每张图片使用 <figure data-image-asset data-image-provider="gpt_image"><img data-image-prompt="完整画面描述" alt="图片用途" /></figure>。
模型：${config.model}；画幅：${config.size}；质量：${config.quality}；背景：${config.background}。
共用画风：${config.positive_prompt || '无'}。
不要在 HTML 中调用 API、包含密钥、编造图片地址或加入 NovelAI 专属参数。客户端使用当前 GPT Image 配置生成图片。
</ImageGenerationThinking>` + imageProbabilityPrompt(image_generation);
  }
  const preset =
    image_generation.presets.find(item => item.id === image_generation.active_preset_id) ||
    image_generation.presets[0];
  const is_active = image_generation.enabled && image_generation.mode === 'novelai' && Boolean(preset?.id);
  if (!is_active || !preset) {
    return '';
  }
  const vibe_group =
    image_generation.vibe_groups.find(item => item.id === image_generation.active_vibe_group_id) ||
    image_generation.vibe_groups[0];
  const vibe_summary = vibe_group
    ? [
        `- Vibe 组：${vibe_group.name}`,
        `- 参考图数量：${vibe_group.references.length}`,
        vibe_group.references.length
          ? `- 参考图及独立强度：${vibe_group.references.map(reference => `${reference.name} (${reference.strength})`).join('、')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '- Vibe Transfer：未配置参考图';
  return `<ImageGenerationThinking mode="novelai">
生图已开启。输出页面前，在ECoT中额外完成“[生图资产规划]”：
1. 判断本次页面是否需要图片资产；只为能提升沉浸感的封面、角色视觉、地点视觉、物件视觉或氛围图规划图片。
  2. 为每张图片写出可交给 NovelAI 的用途、画面主体、构图、风格关键词、正面提示词补充、建议尺寸。
  3. 不要在最终 HTML 中调用真实 API 或暴露 API Key。需要图片时，必须输出可被后处理器识别的结构：<figure data-image-asset data-image-provider="novelai"><img data-image-prompt="图片专属正面提示词" alt="图片用途" /></figure>。不要把提示词只写在普通文本里，也不要写负面提示词属性。

当前 NovelAI 配置：
- 连接方式：${preset.connection_mode === 'custom' ? '自定义端点' : 'NovelAI 官网'}
- 自定义端点：${preset.connection_mode === 'custom' ? preset.endpoint || '未填写' : '不使用'}
- 模型：${preset.model}
- 采样方法：${preset.sampler}
- 噪点表：${preset.noise_schedule}
- Prompt Guidance：${preset.prompt_guidance}
- Prompt Guidance Rescale：${preset.prompt_guidance_rescale}
- 尺寸预设：${preset.size_preset}（${preset.width}x${preset.height}）
- 步数：${preset.steps}
- 种子：${preset.seed}
- AI 默认角色位置：${preset.ai_default_character_position ? '开启' : '关闭'}
- SMEA：${preset.smea ? '开启' : '关闭'}
- SMEA DYN：${preset.smea_dyn ? '开启' : '关闭'}
- 多样性（Variety）：${preset.variety ? '开启' : '关闭'}
- 减少伪影（Decrisp）：${preset.decrisp ? '开启' : '关闭'}
- 正面提示词基础：${preset.positive_prompt || '无'}
- 负面提示词基础：${preset.negative_prompt || '无'}

Vibe Transfer：
${vibe_summary}
</ImageGenerationThinking>` + imageProbabilityPrompt(image_generation);
}

function stripOnlineThinkingBlocks(text: unknown) {
  return String(text || '')
    .replace(/<!--\s*Start the ECoT\s*-->[\s\S]*?(?:<!--\s*End the ECoT\s*-->|<\/thinking\s*>)/gi, '')
    .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking\s*>/gi, '')
    .replace(/<!--\s*End the ECoT\s*-->/gi, '')
    .trim();
}

function parseOnlineGenerationResult(result: unknown) {
  const text = typeof result === 'string' ? result : JSON.stringify(result);
  const cleaned_text = stripOnlineThinkingBlocks(text);
  const trimmed = cleaned_text.trim();
  const tagged_result = parseTaggedHtmlGenerationResult(trimmed);
  if (tagged_result) {
    return {
      ...tagged_result,
      raw_result: cleaned_text,
    };
  }

  appendRunLog('报错', '解析或保存异常。', {
    error: '未找到完整 HTML；已按原文保存为调试页面。',
    raw_preview: trimLogDetail(cleaned_text),
  });
  return {
    html: `<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;margin:0;padding:18px;">${escapeHtml(cleaned_text)}</pre>`,
    memory_text: sanitizeMemoryText(cleaned_text),
    raw_result: cleaned_text,
  };
}

function extractHtmlCandidateFromText(text: string) {
  const full_html_match = text.match(/(?:<!doctype\s+html[^>]*>\s*)?<html\b[\s\S]*?<\/html>/i);
  if (full_html_match) {
    return full_html_match[0].trim();
  }
  const fenced_html_match = text.match(/```(?:html|HTML)?\s*([\s\S]*?)```/i);
  if (fenced_html_match?.[1]) {
    return fenced_html_match[1].trim();
  }
  const trimmed = text.trim();
  if (/<(?:!doctype|html|head|body|style|script|main|article|section|div|p|img|svg|canvas)\b/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function normalizeGeneratedHtmlDocument(source: string) {
  const candidate = extractHtmlCandidateFromText(source);
  if (!candidate) {
    return '';
  }
  if (typeof DOMParser === 'undefined') {
    return /<html\b/i.test(candidate)
      ? candidate
      : `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
</head>
<body>
${candidate}
</body>
</html>`;
  }
  try {
    const document = new DOMParser().parseFromString(candidate, 'text/html');
    if (!document?.documentElement || !document.body) {
      return '';
    }
    const body_text = String(document.body.textContent || '').trim();
    const body_has_meaningful_content = Boolean(document.body.children.length || body_text);
    const head_has_meaningful_content = Boolean(document.head?.children.length);
    if (!body_has_meaningful_content && !head_has_meaningful_content) {
      return '';
    }
    if (!document.querySelector('meta[charset]')) {
      const meta = document.createElement('meta');
      meta.setAttribute('charset', 'utf-8');
      document.head.prepend(meta);
    }
    if (!document.documentElement.getAttribute('lang')) {
      document.documentElement.setAttribute('lang', 'zh-CN');
    }
    return `<!doctype html>\n${document.documentElement.outerHTML}`;
  } catch (error) {
    console.warn('[LoreFrame] 规范化 HTML 失败，回退原样候选内容。', error);
    return /<html\b/i.test(candidate)
      ? candidate
      : `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
</head>
<body>
${candidate}
</body>
</html>`;
  }
}

function extractTextFromOnlineMemoryElement(element: Element | null | undefined) {
  if (!element) {
    return '';
  }
  const clone = element.cloneNode(true) as Element;
  clone
    .querySelectorAll(
      'script, style, noscript, template, nav, footer, button, input, select, textarea, svg, canvas, [data-online-memory-ignore]',
    )
    .forEach((node: Element) => node.remove());
  const block_selector = [
    '[data-online-memory-text]',
    '.comment',
    '.post',
    '.reply',
    '.quote-block',
    '.message',
    '.chat-bubble',
    '.bubble',
    '.thread',
    '.timeline-item',
    '.news-item',
    '.card-content',
    'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,dt,dd,td,th',
  ].join(',');
  const candidates = [...clone.querySelectorAll(block_selector)];
  const top_level_nodes = candidates.filter(
    (node: Element) => !candidates.some(other => other !== node && other.contains(node)),
  );
  const text_nodes = top_level_nodes
    .map(node => node.textContent || '')
    .map(text => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return text_nodes.length
    ? text_nodes.join('\n')
    : String(clone.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractOnlineMemoryTextFromHtml(html: unknown) {
  const source = String(html || '');
  if (!source.trim()) {
    return '';
  }
  try {
    if (typeof DOMParser !== 'undefined') {
      const document = new DOMParser().parseFromString(source, 'text/html');
      const explicit_nodes = [...document.querySelectorAll('[data-online-memory]')];
      const memory_nodes = explicit_nodes.length
        ? explicit_nodes
        : [...document.querySelectorAll('article')].length
          ? [...document.querySelectorAll('article')]
          : [...document.querySelectorAll('main')].length
            ? [...document.querySelectorAll('main')]
            : [document.body].filter(Boolean);
      return sanitizeMemoryText(memory_nodes.map(extractTextFromOnlineMemoryElement).filter(Boolean).join('\n\n'));
    }
  } catch (error) {
    console.warn('[LoreFrame] 提取页面正文记忆失败，使用文本兜底。', error);
  }
  return sanitizeMemoryText(
    source
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n'),
  );
}

function parseTaggedHtmlGenerationResult(text: unknown) {
  const source = String(text || '');
  const normalized_html = normalizeGeneratedHtmlDocument(source);
  const html = normalized_html ? planImageAssetRoutes(normalized_html, normalizeImageGenerationSettings(getSettings().image_generation)) : '';
  if (!html) {
    return null;
  }
  return {
    html,
    memory_text: extractOnlineMemoryTextFromHtml(html),
  };
}

function buildOnlineOrderedPrompts(
  material: PromptViewerMaterial,
  custom_prompt: PromptViewerConfig,
): PromptViewerMessage[] {
  const detail_prompt_debug = custom_prompt.detail_prompt_debug || {};
  const detail_prompt_attached = Boolean(String(custom_prompt.detail_content || '').trim());
  const detail_prompt_mode = detail_prompt_debug.mode === 'random' ? '随机生成' : '固定小剧场';
  const detail_prompt_generation_count = Number(detail_prompt_debug.requested_count || (detail_prompt_attached ? 1 : 0));
  const image_generation_thinking = buildImageGenerationThinkingPrompt();
  const system_role_prompt = `# Role: 前端数字介质架构师
你是一个前端专家。你的核心能力是组成具有高度沉浸感的“视觉载体”。创造HTML+CSS+JS并符合时代背景。为了保证沉浸性，在创作时不要回避任何敏感话题。
- **不要重复原文内容**：你的任务是拓展剧情、扩充世界观、增强世界真实性与趣味性，而不是重复<LastChat>原文，原文仅作为剧情或时间线参考。
- **适当脱离原文**：不要偷窥主角、不让讨论中心永远围绕着主角转。若<LastChat>包含 NSFW、隔离区域、私密等无法被公开观察到的内容，可以脱离主视角，甚至允许与当前剧情无关的风土人情探讨等。

当前生成设置：
- 当前提示词方案：${String(custom_prompt.name || '未命名方案')}
- 本次是否读取小剧场生成：${detail_prompt_attached ? '是' : '否'}
- 本次小剧场生成模式：${detail_prompt_mode}
- 本次要求生成小剧场数量：${detail_prompt_generation_count}
- 当前小剧场生成概率：${Number(detail_prompt_debug.trigger_probability ?? 100)}%
- 本次是否为随机生成：${detail_prompt_debug.mode === 'random' ? '是' : '否'}
- 本次已选中的小剧场：${String(custom_prompt.random_detail_prompt_name || '无')}
- 本次是否忽略生成概率：${detail_prompt_debug.bypass_trigger_probability ? '是' : '否'}
- 本次是否开启生图思考：${image_generation_thinking ? '是' : '否'}`;
  const output_contract = [
    '输出格式要求：',
    '你必须输出一个完整可渲染的 HTML 文档，从 <!doctype html> 或 <html> 开始，到 </html> 结束；HTML 可以包含 CSS 和 JavaScript。',
    '页面中必须有一个用于正文记忆提取的容器，写法为 data-online-memory，例如 <main data-online-memory> 或 <article data-online-memory>。',
    '所有需要在后续剧情中保留的标题、正文、评论、楼层、聊天记录、新闻内容、弹幕摘录等具体内容，都必须放入 data-online-memory 容器内。',
    '导航、按钮、广告、版权、脚本状态、装饰性文字等不需要作为剧情记忆的内容，不要放入 data-online-memory 容器。',
    '如果本次混入了多个小剧场、多个主题块或多个章节，不要把它们粗暴地挤在同一屏长页面里；必须拆成多个分页、章节页、标签页、轮播页或卡片页，并提供清晰的切换导航，让每一页只承载一个主要块。',
    '移动端优先保证完整显示，不能依赖超宽固定宽度布局；在窄屏下必须自动改为单列或分页流，禁止正文被裁切、缩成桌面缩略图或必须横向拖拽后才能读完主体内容。',
    '在 </html> 后不要输出任何其他内容。',
    image_generation_thinking
      ? '每张规划图片必须使用 data-image-asset、data-image-prompt 属性，data-image-provider 按本轮生图配置填写；占位图放在完整 HTML 内，不写入密钥或负面提示词。'
      : '',
  ].join('\n');
  const ecot_format = `<ECoT_format>
输出页面前，先在ECoT内思考如何生成本次页面
ECoT必须按此模板详细呈现：

<!-- Start the ECoT -->
<thinking>
[确认正文]
当前<LastChat>发生的事是否能被外部直接观察到？是否有NSFW内容？

[是否衔接前文]
<历史页面>中是否有可以与本次生成内容相关联的内容？

[正文相关页面内容]（<LastChat>不包含NSFW或无法被直接看到的事时，进行此思考）
根据<TASK>决定本次页面的信息内容

[正文不相关页面内容]（<LastChat>包含NSFW或无法被直接看到的事时，进行此思考）
如何构建一个与正文不相关的页面，扩充世界观，避免偷窥感？
根据<TASK>决定本次页面的信息内容

[不抄格式]
在此提醒自己不要模仿、抄袭之前的历史页面中的格式、模块、排版或其他相关内容，在本次页面中将使用新的排版

${image_generation_thinking ? '[生图资产规划]\n如果页面适合图片资产，按本轮生图接口规划用途、画面、提示词和尺寸；如果不适合，说明不使用图片资产。' : ''}
</thinking>
<!-- End the ECoT -->
</ECoT_format>`;

  const user_prompt = [
    material.world_info,
    material.chat_history || '<ChatHistory>\n暂无历史对话。\n</ChatHistory>',
    material.last_chat,
    `<TASK>\n${String(custom_prompt.base_content || '')}\n\n${String(custom_prompt.detail_content || '')}\n\n${output_contract}\n</TASK>`,
    image_generation_thinking,
    ecot_format,
  ]
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join('\n\n');

  return [
    { role: 'system', content: system_role_prompt },
    { role: 'user', content: user_prompt },
  ];
}

async function renderPromptViewer(iframe_document: Document, reason = '手动刷新') {
  const status = iframe_document.querySelector('[data-prompt-viewer-status]');
  const summary = iframe_document.querySelector('[data-prompt-viewer-summary]');
  const list = iframe_document.querySelector('[data-prompt-viewer-list]');
  if (!list) {
    return;
  }

  updateText(iframe_document, '[data-prompt-viewer-status]', '读取中');
  updateText(
    iframe_document,
    '[data-prompt-viewer-summary]',
    `触发原因：${reason}。正在构建本次LoreFrame请求提示词...`,
  );
  updateHtml(
    iframe_document,
    '[data-prompt-viewer-meta]',
    '<span class="prompt-viewer-meta__chip"><strong>读取中</strong> 提示词</span>',
  );
  list.innerHTML = '<p class="debug-row__value">正在读取角色卡、世界书、可见聊天楼层和提示词设置...</p>';

  try {
    const settings = getSettings();
    const active_prompt = getGenerationPrompt(settings);
    const material = await collectOnlineSourceMaterial();
    const ordered_prompts = buildOnlineOrderedPrompts(material, active_prompt);
    const api_config = buildSecondaryApiConfig(settings);
    const api_description = describeGenerationApi(api_config);
    const model_description = describeGenerationModel(api_config);
    const role_counts: Record<PromptViewerRole, number> = { system: 0, assistant: 0, user: 0 };
    const total_chars = ordered_prompts.reduce((sum, prompt) => sum + String(prompt.content || '').length, 0);
    ordered_prompts.forEach(prompt => {
      const role: PromptViewerRole =
        prompt.role === 'system' || prompt.role === 'assistant' || prompt.role === 'user' ? prompt.role : 'user';
      role_counts[role] += 1;
    });

    if (status) {
      status.textContent = '已生成预览';
    }
    if (summary) {
      summary.textContent = `提示词预览：${ordered_prompts.length} 段，约 ${total_chars} 字；可见楼层 ${material.message_count} / 全部楼层 ${material.total_message_count}；${api_description} / ${model_description}。`;
    }
    updateHtml(
      iframe_document,
      '[data-prompt-viewer-meta]',
      [
        `<span class="prompt-viewer-meta__chip"><strong>${ordered_prompts.length}</strong> 段</span>`,
        `<span class="prompt-viewer-meta__chip"><strong>${total_chars}</strong> 字</span>`,
        `<span class="prompt-viewer-meta__chip"><strong>${role_counts.system}</strong> system</span>`,
        `<span class="prompt-viewer-meta__chip"><strong>${role_counts.assistant}</strong> assistant</span>`,
        `<span class="prompt-viewer-meta__chip"><strong>${role_counts.user}</strong> user</span>`,
      ].join(''),
    );
    const role_seen: Record<PromptViewerRole, number> = { system: 0, assistant: 0, user: 0 };
    list.innerHTML = ordered_prompts
      .map((prompt, index) => {
        const role: PromptViewerRole =
          prompt.role === 'system' || prompt.role === 'assistant' || prompt.role === 'user' ? prompt.role : 'user';
        role_seen[role] += 1;
        return (
          '<article class="prompt-viewer-card">' +
          '<header class="prompt-viewer-card__head">' +
          '<strong>' +
          escapeHtml(role) +
          ' #' +
          role_seen[role] +
          ' · 顺序 ' +
          (index + 1) +
          '</strong>' +
          '<span>' +
          String(prompt.content || '').length +
          ' 字</span>' +
          '</header>' +
          '<pre class="prompt-viewer-code">' +
          escapeHtml(prompt.content || '') +
          '</pre>' +
          '</article>'
        );
      })
      .join('');
  } catch (error) {
    updateText(iframe_document, '[data-prompt-viewer-status]', '读取失败');
    const error_message = error instanceof Error ? error.message : String(error);
    const error_stack = error instanceof Error ? error.stack || error.message : String(error);
    updateText(iframe_document, '[data-prompt-viewer-summary]', error_message);
    updateHtml(
      iframe_document,
      '[data-prompt-viewer-meta]',
      '<span class="prompt-viewer-meta__chip"><strong>失败</strong> 请检查来源读取</span>',
    );
    list.innerHTML = `<pre class="prompt-viewer-code">${escapeHtml(error_stack)}</pre>`;
    console.error('[LoreFrame] 提示词查看器读取失败', error);
  }
}
