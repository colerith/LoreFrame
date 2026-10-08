type ApiFunctionName = string;

type PromptRegexRole = 'user' | 'assistant' | 'system';

type MacroNames = {
  user_name?: string;
  character_name?: string;
};

type MinimalContext = {
  name1?: string;
  name2?: string;
  persona_description?: string;
  powerUserSettings?: Record<string, unknown>;
  power_user?: Record<string, unknown>;
};

function serializeLogDetail(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  const seen = new WeakSet();
  try {
    const normalized =
      value instanceof Error
        ? {
            name: value.name,
            message: value.message,
            stack: value.stack,
            ...Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item !== 'function')),
          }
        : value;
    const text = JSON.stringify(
      normalized,
      (_key, item) => {
        if (typeof item === 'function') {
          return `[Function ${item.name || 'anonymous'}]`;
        }
        if (typeof item === 'bigint') {
          return String(item);
        }
        if (item && typeof item === 'object') {
          if (seen.has(item)) {
            return '[Circular]';
          }
          seen.add(item);
        }
        return item;
      },
      2,
    );
    return text && text !== '{}' ? text : String(value);
  } catch {
    return String(value);
  }
}

function formatErrorForDisplay(error: unknown): string {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (!(error instanceof Error)) {
    return serializeLogDetail(error);
  }
  const parts = [];
  const name = error.name;
  const message = error.message;
  if (name && name !== 'Error') {
    parts.push(name);
  }
  if (message) {
    parts.push(message);
  }
  const detail = serializeLogDetail(error);
  if (!parts.length && detail) {
    return detail;
  }
  if (detail && detail !== '{}' && !detail.includes(message)) {
    parts.push(detail);
  }
  return parts.join('\n') || String(error);
}

function trimLogDetail(detail: unknown): string {
  const text = serializeLogDetail(detail);
  if (!text) {
    return '';
  }
  return text.length > LOG_PREVIEW_CHARS ? `${text.slice(0, LOG_PREVIEW_CHARS)}\n...（已截断）` : text;
}

function getRunLogTone(category: string, message: string) {
  const text = `${category} ${message}`.toLowerCase();
  if (text.includes('报错') || text.includes('错误') || text.includes('失败') || text.includes('error')) {
    return 'error';
  }
  if (text.includes('警告') || text.includes('跳过') || text.includes('warn')) {
    return 'warn';
  }
  if (text.includes('成功') || text.includes('完成')) {
    return 'success';
  }
  if (text.includes('监听') || text.includes('请求') || text.includes('读取')) {
    return 'info';
  }
  return 'neutral';
}

function renderRunLog(iframe_document: Document | null = current_iframe_document) {
  const list = iframe_document?.querySelector?.('[data-run-log-list]');
  if (!iframe_document || !list) {
    return;
  }
  const count = iframe_document.querySelector<HTMLElement>('[data-run-log-count]');
  const summary = iframe_document.querySelector<HTMLElement>('[data-run-log-summary]');
  if (count) {
    count.textContent = `${run_logs.length} 条`;
  }
  if (summary) {
    const latest = run_logs[0];
    const category_counts = new Map<string, number>();
    run_logs.forEach(log => {
      category_counts.set(log.category, (category_counts.get(log.category) || 0) + 1);
    });
    const top_categories = [...category_counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3);
    const chips = [
      `<span class="run-log-summary__chip"><strong>${run_logs.length}</strong> 条日志</span>`,
      latest ? `<span class="run-log-summary__chip"><strong>${escapeHtml(latest.time)}</strong> 最近更新</span>` : '',
      ...top_categories.map(
        ([category, total]) =>
          `<span class="run-log-summary__chip"><strong>${total}</strong> ${escapeHtml(category)}</span>`,
      ),
    ].filter(Boolean);
    summary.innerHTML = chips.join('');
  }

  list.innerHTML = run_logs.length
    ? run_logs
        .map(
          log => `
              <article class="run-log-card">
                <header class="run-log-card__head">
                  <div class="run-log-card__meta">
                    <span class="run-log-card__badge" data-tone="${escapeHtml(getRunLogTone(log.category, log.message))}">${escapeHtml(log.category)}</span>
                    <div class="run-log-card__title">
                      <strong>${escapeHtml(log.message)}</strong>
                      <span>${log.detail ? '附带详情' : '无附加详情'}</span>
                    </div>
                  </div>
                  <span>${escapeHtml(log.time)}</span>
                </header>
                ${
                  log.detail
                    ? log.collapsed
                      ? `<details><summary>查看详情</summary><pre>${escapeHtml(log.detail)}</pre></details>`
                      : `<pre>${escapeHtml(log.detail)}</pre>`
                    : ''
                }
              </article>
            `,
        )
        .join('')
    : '<p class="debug-row__value">暂无日志。发送正文或手动生成后会显示监听与请求过程。</p>';
}

type ImageGenerationLogEntry = {
  time: string;
  stage: string;
  message: string;
  detail?: string;
};

let image_generation_logs: ImageGenerationLogEntry[] = [];

function renderImageGenerationLog(iframe_document: Document | null = current_iframe_document) {
  const list = iframe_document?.querySelector<HTMLElement>('[data-image-generation-log-list]');
  const count = iframe_document?.querySelector<HTMLElement>('[data-image-generation-log-count]');
  if (count) {
    count.textContent = `${image_generation_logs.length} 条`;
  }
  if (!list) {
    return;
  }
  list.innerHTML = image_generation_logs.length
    ? image_generation_logs
        .map(log => `<article class="run-log-card"><header class="run-log-card__head"><div class="run-log-card__meta"><span class="run-log-card__badge" data-tone="${escapeHtml(getRunLogTone(log.stage, log.message))}">${escapeHtml(log.stage)}</span><div class="run-log-card__title"><strong>${escapeHtml(log.message)}</strong><span>${log.detail ? '附带详情' : '无附加详情'}</span></div></div><span>${escapeHtml(log.time)}</span></header>${log.detail ? `<pre>${escapeHtml(log.detail)}</pre>` : ''}</article>`)
        .join('')
    : '<p class="debug-row__value">暂无生图请求日志。</p>';
}

function appendImageGenerationLog(stage: string, message: string, detail: unknown = '') {
  image_generation_logs = [
    { time: formatTime(new Date()), stage, message, detail: trimLogDetail(detail) },
    ...image_generation_logs,
  ].slice(0, MAX_RUN_LOGS);
  renderImageGenerationLog();
  appendRunLog('生图', message, detail);
}

function appendRunLog(
  category: string,
  message: string,
  detail: unknown = '',
  options: { full_detail?: boolean; collapsed?: boolean } = {},
) {
  run_logs = [
    {
      time: formatTime(new Date()),
      category,
      message,
      detail:
        options.full_detail || message === '返回内容预览（原始回复）。'
          ? serializeLogDetail(detail)
          : trimLogDetail(detail),
      collapsed: Boolean(options.collapsed),
    },
    ...run_logs,
  ].slice(0, MAX_RUN_LOGS);
  renderRunLog();
}

function normalizeDetailPromptActivationNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))];
  }
  return [...new Set(String(value || '').split('/').map(item => item.trim()).filter(Boolean))];
}

function normalizeDetailPromptActivationEntry(value: unknown): DetailPromptActivationEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<DetailPromptActivationEntry>;
  const names = normalizeDetailPromptActivationNames(candidate.names || candidate.label || '');
  const label = String(candidate.label || names.join(' / ')).trim();
  if (!label) {
    return null;
  }
  return {
    time: String(candidate.time || ''),
    updated_at: String(candidate.updated_at || ''),
    label,
    names,
    prompt_name: String(candidate.prompt_name || ''),
    message_id: String(candidate.message_id || ''),
  };
}

function loadDetailPromptActivationHistory() {
  const stored =
    readJsonStorage<unknown[]>(DETAIL_PROMPT_HISTORY_STORAGE_KEY, []) ||
    readJsonStorage<unknown[]>(OLD_DETAIL_PROMPT_HISTORY_STORAGE_KEY, []);
  detail_prompt_activation_history = Array.isArray(stored)
    ? stored
        .map(normalizeDetailPromptActivationEntry)
        .filter((entry): entry is DetailPromptActivationEntry => Boolean(entry))
        .slice(0, MAX_DETAIL_PROMPT_HISTORY)
    : [];
}

function saveDetailPromptActivationHistory() {
  writeJsonStorage(DETAIL_PROMPT_HISTORY_STORAGE_KEY, detail_prompt_activation_history);
}

function getDetailPromptActivationHistory(limit = MAX_DETAIL_PROMPT_HISTORY) {
  if (!detail_prompt_activation_history.length) {
    loadDetailPromptActivationHistory();
  }
  return detail_prompt_activation_history.slice(0, Math.max(0, limit));
}

function recordDetailPromptActivation(detail_prompt_name: unknown, prompt_name: unknown = '', message_id: unknown = '') {
  const names = normalizeDetailPromptActivationNames(detail_prompt_name);
  const label = names.join(' / ');
  if (!label) {
    return;
  }
  const now = new Date();
  detail_prompt_activation_history = [
    {
      time: formatTime(now),
      updated_at: now.toISOString(),
      label,
      names,
      prompt_name: String(prompt_name || ''),
      message_id: String(message_id || ''),
    },
    ...getDetailPromptActivationHistory(),
  ].slice(0, MAX_DETAIL_PROMPT_HISTORY);
  saveDetailPromptActivationHistory();
  renderDetailPromptActivationHistory();
}

function getDetailPromptActivationChartState() {
  const MAX_VISIBLE_ITEMS = 15;
  const history = getDetailPromptActivationHistory();
  const counts = new Map<string, number>();
  history.forEach(entry => {
    entry.names.forEach(name => {
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const sorted_items = [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'));
  const visible_items = sorted_items.slice(0, MAX_VISIBLE_ITEMS);
  const other_count = sorted_items.slice(MAX_VISIBLE_ITEMS).reduce((sum, item) => sum + item.count, 0);
  const merged_items = other_count
    ? [...visible_items, { name: '其他', count: other_count }]
    : visible_items;
  const items = merged_items.map((item, index) => ({
    ...item,
    ratio: total ? (item.count / total) * 100 : 0,
    percent: total ? Math.round((item.count / total) * 1000) / 10 : 0,
    color: item.name === '其他' ? 'hsl(210 10% 64%)' : `hsl(${(index * 57) % 360} 68% 62%)`,
  }));
  return {
    total,
    items,
    unique_count: sorted_items.length,
    hidden_count: Math.max(0, sorted_items.length - visible_items.length),
  };
}

function renderDetailPromptActivationHistory(iframe_document: Document | null = current_iframe_document) {
  const history = getDetailPromptActivationHistory();
  const recent_list = iframe_document?.querySelector?.('[data-detail-activation-recent-list]');
  if (recent_list) {
    const recent_history = history.slice(0, MAX_RECENT_DETAIL_PROMPT_LOGS);
    recent_list.innerHTML = recent_history.length
      ? recent_history
          .map(
            entry => `
              <article class="detail-activation-log">
                <header>
                  <strong>${escapeHtml(entry.label)}</strong>
                  <span>${escapeHtml(entry.time || '')}</span>
                </header>
                <p>${escapeHtml(entry.prompt_name || '已用于本回合生成')}</p>
              </article>
            `,
          )
          .join('')
      : '<p class="debug-row__value">最近还没有激活记录。</p>';
  }
  const recent_count = iframe_document?.querySelector?.('[data-detail-activation-recent-count]');
  if (recent_count) {
    recent_count.textContent = `最近 ${MAX_RECENT_DETAIL_PROMPT_LOGS} 次`;
  }
  const chart = iframe_document?.querySelector?.('[data-detail-activation-chart]') as HTMLElement | null;
  const total = iframe_document?.querySelector?.('[data-detail-activation-total]');
  const summary = iframe_document?.querySelector?.('[data-detail-activation-summary]');
  if (chart) {
    const chart_state = getDetailPromptActivationChartState();
    if (total) {
      total.textContent = `${chart_state.total} 次`;
    }
    if (summary) {
      summary.textContent = chart_state.unique_count
        ? chart_state.hidden_count > 0
          ? `按小剧场标题统计累计激活分布，当前共记录 ${chart_state.unique_count} 个小剧场，仅展示前 15 个高占比项，其余合并为“其他”。`
          : `按小剧场标题统计累计激活分布，当前共记录 ${chart_state.unique_count} 个小剧场。`
        : '生成过页面后，这里会按小剧场标题统计激活次数。';
    }
    chart.innerHTML = chart_state.items.length
      ? (() => {
          let offset = 0;
          const gradient = chart_state.items
            .map(item => {
              const start = offset;
              offset += item.ratio;
              return `${item.color} ${start}% ${offset}%`;
            })
            .join(', ');
          return `
            <div class="detail-activation-chart__pie">
              <div class="detail-activation-chart__pie-surface" style="background: conic-gradient(from -90deg, ${gradient});"></div>
              <div class="detail-activation-chart__pie-center">
                <strong>${chart_state.total}</strong>
                <small>总激活</small>
              </div>
            </div>
            <div class="detail-activation-chart__legend">
              ${chart_state.items
                .map(
                  item => `
                    <div class="detail-activation-chart__legend-item">
                      <span class="detail-activation-chart__swatch" style="background:${escapeHtml(item.color)};"></span>
                      <strong>${escapeHtml(item.name)}</strong>
                      <small>${item.count} 次 · ${item.percent}%</small>
                    </div>
                  `,
                )
                .join('')}
            </div>
          `;
        })()
      : '<p class="settings-card__note">暂无激活分布数据。</p>';
  }
}

function sanitizeMemoryText(text: unknown): string {
  return String(text || '')
    .replace(/```(?:html|css|js|javascript)?\s*[\s\S]*?```/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*(?:html|css|javascript|js)\s*$/gim, '')
    .trim();
}

function cleanExtractedOnlineTitle(text: unknown): string {
  return String(text || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function extractOnlineTitle(data: { html?: unknown } | null | undefined): string {
  const html = String(data?.html || '');
  if (!html.trim()) {
    return '';
  }
  try {
    if (typeof DOMParser !== 'undefined') {
      const document = new DOMParser().parseFromString(html, 'text/html');
      const head_title = cleanExtractedOnlineTitle(document.querySelector('head title')?.textContent || '');
      if (head_title) {
        return head_title;
      }
      const memory_title = cleanExtractedOnlineTitle(
        document.querySelector('[data-online-memory] h1')?.textContent || '',
      );
      if (memory_title) {
        return memory_title;
      }
      const first_h1 = cleanExtractedOnlineTitle(document.querySelector('h1')?.textContent || '');
      if (first_h1) {
        return first_h1;
      }
    }
  } catch (error) {
    console.warn('[LoreFrame] 提取页面标题失败，使用正则兜底。', error);
  }
  return (
    cleanExtractedOnlineTitle(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') ||
    cleanExtractedOnlineTitle(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '') ||
    ''
  );
}

function getApiFunction(name: ApiFunctionName): unknown {
  const tavern_helper = getTavernHelperApi() as Record<string, unknown> | null;
  const host_runtime = host_window as unknown as Window & Record<string, unknown>;
  const runtime = window as unknown as Window & Record<string, unknown>;
  return tavern_helper?.[name] || host_runtime[name] || runtime[name] || null;
}

function applyPromptRegex(text: unknown, role: PromptRegexRole, depth: number): string {
  const format_regexed = getApiFunction('formatAsTavernRegexedString');
  if (typeof format_regexed !== 'function') {
    return String(text || '');
  }

  const source = role === 'user' ? 'user_input' : role === 'assistant' ? 'ai_output' : 'slash_command';
  try {
    return format_regexed(String(text || ''), source, 'prompt', { depth });
  } catch (error) {
    console.warn('[LoreFrame] 正则替换失败，使用原文', error);
    return String(text || '');
  }
}

function applyWorldInfoMacros(text: unknown, names: MacroNames = {}): string {
  const raw_text = String(text || '');
  const substitude_macros = getApiFunction('substitudeMacros');
  const user_name = names.user_name || getSillyTavernContext()?.name1 || 'user';
  const character_name = names.character_name || getSillyTavernContext()?.name2 || 'char';
  let replaced_text = raw_text;

  if (typeof substitude_macros === 'function') {
    try {
      replaced_text = substitude_macros(replaced_text);
    } catch (error) {
      console.warn('[LoreFrame] 酒馆宏替换失败，使用兜底替换', error);
    }
  }

  return replaced_text
    .replaceAll('{{user}}', user_name)
    .replaceAll('{{char}}', character_name)
    .replaceAll('<user>', user_name)
    .replaceAll('<char>', character_name);
}

function extractTextBetweenTags(text: unknown, open_tag: unknown, close_tag: unknown): string {
  const source = String(text || '');
  const open = String(open_tag || '');
  const close = String(close_tag || '');
  if (!source || !open || !close) {
    return '';
  }
  const lower_source = source.toLocaleLowerCase();
  const lower_open = open.toLocaleLowerCase();
  const lower_close = close.toLocaleLowerCase();
  const start = lower_source.indexOf(lower_open);
  if (start < 0) {
    return '';
  }
  const content_start = start + open.length;
  const end = lower_source.indexOf(lower_close, content_start);
  if (end < 0) {
    return '';
  }
  return source.slice(content_start, end).trim();
}

function getUserPersonaDescription() {
  const context = getSillyTavernContext() as MinimalContext | null;
  const power_user = (context?.powerUserSettings || context?.power_user || {}) as Record<string, unknown>;
  return (
    String(power_user.persona_description || '') ||
    String(power_user.personaDescription || '') ||
    String(power_user.user_description || '') ||
    String(power_user.userDescription || '') ||
    context?.persona_description ||
    ''
  );
}

async function getPersonaWorldbookName() {
  const trigger_slash = getApiFunction('triggerSlash');
  if (typeof trigger_slash !== 'function') {
    return '';
  }

  try {
    return String(await trigger_slash('/getpersonabook')).trim();
  } catch (error) {
    console.warn('[LoreFrame] /getpersonabook 读取失败', error);
    return '';
  }
}
