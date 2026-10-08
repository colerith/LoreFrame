type ModeType = 'bubble' | 'panel';
type ThemeType = 'day' | 'night';
type WorldbookMode = 'excluded' | 'included' | 'disabled' | 'native';
type MinimalChatMessage = {
  message_id: string | number;
  name?: string;
  role?: string;
  is_hidden?: boolean;
  is_system?: boolean;
  swipe_id?: number | string;
  swipes?: unknown[];
  swipes_data?: unknown[];
  swipes_info?: unknown[];
  message?: string;
  mes?: string;
  data?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};
type ContextChatMessage = {
  name?: string;
  is_user?: boolean;
  is_hidden?: boolean;
  is_system?: boolean;
  swipe_id?: number | string;
  swipes?: unknown[];
  swipes_data?: unknown[];
  swipes_info?: unknown[];
  mes?: string;
  message?: string;
};
type CharacterDataLike = {
  name?: unknown;
  data?: { name?: unknown };
  [key: string]: unknown;
};
type SillyTavernLike = {
  ready?: boolean;
  getContext?: () => SillyTavernContextLike | null;
};
type SillyTavernContextLike = {
  name1?: string;
  name2?: string;
  characterName?: string;
  character?: CharacterDataLike | null;
  characters?: CharacterDataLike[];
  chat?: ContextChatMessage[];
  chatId?: string;
  chat_id?: string;
  chatMetadata?: Record<string, unknown>;
  eventSource?: {
    on?: (...args: unknown[]) => unknown;
    removeListener?: (event_name: string, handler: (...args: unknown[]) => void) => void;
  };
  eventTypes?: Record<string, unknown>;
  getCurrentChatId?: () => unknown;
  getChatCompletionModel?: () => unknown;
  textCompletionSettings?: {
    model?: string;
    model_name?: string;
  };
  updateChatMetadata?: (metadata: Record<string, unknown>, should_save?: boolean) => void;
  saveMetadata?: () => void;
  saveSettingsDebounced?: () => void;
};
type TavernHelperApiLike = {
  getChatMessages?: (
    range: string | number,
    options?: { hide_state?: 'all' | 'hidden' | 'unhidden'; include_swipes?: boolean },
  ) => MinimalChatMessage[];
} & Record<string, unknown>;
type WorldbookLike = {
  world?: string;
  uid?: string | number;
  id?: string | number;
  name?: string;
  comment?: string;
  content?: string;
  entry?: string;
  enabled?: boolean;
  constant?: boolean;
  selective?: boolean;
  strategy?: {
    type?: string;
    keys?: Array<string | RegExp | { source?: string }>;
    keys_secondary?: {
      keys?: Array<string | RegExp | { source?: string }>;
      logic?: string;
    };
  };
  keys?: Array<string | RegExp | { source?: string }>;
  keysecondary?: Array<string | RegExp | { source?: string }>;
  secondary_keys?: Array<string | RegExp | { source?: string }>;
  selectiveLogic?: string;
};
type ConfirmDialogOptions = {
  tone?: 'danger' | 'warning' | 'info';
  title?: string;
  message?: string;
  confirmText?: string;
};
type ChoiceDialogOption = {
  value: string;
  label: string;
  tone?: 'danger' | 'warning' | 'info';
};
type ChoiceDialogOptions = {
  tone?: 'danger' | 'warning' | 'info';
  title?: string;
  message?: string;
  cancelText?: string;
  choices?: ChoiceDialogOption[];
};

function getViewportSize() {
  const visual_viewport = host_window.visualViewport;
  return {
    width: Math.round(visual_viewport?.width || host_window.innerWidth || host_document.documentElement.clientWidth || BUBBLE_SIZE),
    height: Math.round(
      visual_viewport?.height || host_window.innerHeight || host_document.documentElement.clientHeight || BUBBLE_SIZE,
    ),
  };
}

function getViewportInsets() {
  const visual_viewport = host_window.visualViewport;
  const doc_width = Math.round(host_document.documentElement.clientWidth || host_window.innerWidth || BUBBLE_SIZE);
  const doc_height = Math.round(host_document.documentElement.clientHeight || host_window.innerHeight || BUBBLE_SIZE);
  const visible_width = Math.round(visual_viewport?.width || doc_width);
  const visible_height = Math.round(visual_viewport?.height || doc_height);
  const left = Math.max(0, Math.round(visual_viewport?.offsetLeft || 0));
  const top = Math.max(0, Math.round(visual_viewport?.offsetTop || 0));
  const right = Math.max(0, doc_width - visible_width - left);
  const bottom = Math.max(0, doc_height - visible_height - top);
  return { top, right, bottom, left };
}

function isMobileViewport() {
  return getViewportSize().width < MOBILE_BREAKPOINT;
}

function isPanelForceFullscreenViewport() {
  return getViewportSize().width < PANEL_FORCE_FULLSCREEN_BREAKPOINT;
}

function getModeSize(mode: ModeType): { width: number; height: number } {
  const viewport = getViewportSize();
  if (mode === 'bubble') {
    return {
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
    };
  }

  const available_width = Math.max(180, viewport.width - PANEL_MARGIN * 2);
  const available_height = Math.max(260, viewport.height - PANEL_MARGIN * 2);
  const max_width = isMobileViewport() ? MOBILE_PANEL_MAX_WIDTH : DESKTOP_PANEL_MAX_WIDTH;
  const max_height = isMobileViewport() ? MOBILE_PANEL_MAX_HEIGHT : DESKTOP_PANEL_MAX_HEIGHT;
  const default_size = {
    width: Math.min(max_width, available_width),
    height: Math.min(max_height, available_height),
  };

  if (!isMobileViewport() && panel_size) {
    return {
      width: Math.min(Math.max(panel_size.width, DESKTOP_PANEL_MIN_WIDTH), available_width),
      height: Math.min(Math.max(panel_size.height, DESKTOP_PANEL_MIN_HEIGHT), available_height),
    };
  }

  return default_size;
}

function getSavedTheme() {
  return resolveThemeFromSettings(getSettings());
}

function saveTheme(theme: ThemeType): void {
  const settings = getSettings();
  saveSettings({
    ...settings,
    theme_mode: theme,
  });
}

function getBeijingMinutes(date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find(part => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find(part => part.type === 'minute')?.value || '0');
  return hour * 60 + minute;
}

function parseThemeMinutes(value: string, fallback: string): number {
  const source = /^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? value : fallback;
  const [hour_text, minute_text] = source.split(':');
  return Number(hour_text) * 60 + Number(minute_text);
}

function resolveThemeFromSettings(settings = getSettings(), date = new Date()): ThemeType {
  const mode = normalizeThemeMode(settings?.theme_mode);
  if (mode === 'day' || mode === 'night') {
    return mode;
  }
  const schedule = normalizeThemeSchedule(settings?.theme_schedule);
  const current_minutes = getBeijingMinutes(date);
  const day_start = parseThemeMinutes(schedule.day_start, '06:00');
  const night_start = parseThemeMinutes(schedule.night_start, '18:00');
  if (day_start === night_start) {
    return current_minutes >= day_start ? 'night' : 'day';
  }
  if (day_start < night_start) {
    return current_minutes >= day_start && current_minutes < night_start ? 'day' : 'night';
  }
  return current_minutes >= day_start || current_minutes < night_start ? 'day' : 'night';
}

function applyThemePreference(iframe_body: HTMLElement, settings = getSettings()): ThemeType {
  const theme = resolveThemeFromSettings(settings);
  applyTheme(iframe_body, theme);
  return theme;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex, '#000000').slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
}

function setThemeVariable(iframe_body: HTMLElement, name: string, value: string): void {
  iframe_body.style.setProperty(name, value);
}

function applyAppearanceSettings(iframe_body: HTMLElement | null, settings = getSettings()): void {
  if (!iframe_body) {
    return;
  }
  const theme = iframe_body.dataset.theme === 'night' ? 'night' : 'day';
  const appearance = normalizeAppearanceSettings(settings?.appearance)[theme];
  setThemeVariable(iframe_body, '--panel-bg', appearance.panel_bg);
  setThemeVariable(iframe_body, '--panel-bg-soft', appearance.panel_bg_soft);
  setThemeVariable(iframe_body, '--panel-popup-bg', appearance.popup_bg);
  setThemeVariable(iframe_body, '--panel-text', appearance.panel_text);
  setThemeVariable(iframe_body, '--panel-muted', appearance.panel_muted);
  setThemeVariable(iframe_body, '--panel-accent', appearance.panel_accent);
  setThemeVariable(iframe_body, '--panel-accent-strong', appearance.panel_accent_strong);
  setThemeVariable(iframe_body, '--bubble-bg', appearance.bubble_bg);
  setThemeVariable(iframe_body, '--bubble-bg-hover', appearance.panel_accent_strong);
  setThemeVariable(iframe_body, '--bubble-text', appearance.panel_text);
  setThemeVariable(iframe_body, '--panel-border', rgbaFromHex(appearance.panel_text, theme === 'night' ? 0.2 : 0.18));
  setThemeVariable(iframe_body, '--panel-control', rgbaFromHex(appearance.panel_text, theme === 'night' ? 0.1 : 0.08));
  setThemeVariable(
    iframe_body,
    '--panel-control-hover',
    rgbaFromHex(appearance.panel_text, theme === 'night' ? 0.17 : 0.14),
  );
}

function applyTheme(iframe_body: HTMLElement, theme: ThemeType): void {
  iframe_body.classList.toggle('theme-night', theme === 'night');
  iframe_body.classList.toggle('theme-day', theme !== 'night');
  iframe_body.dataset.theme = theme === 'night' ? 'night' : 'day';
  applyAppearanceSettings(iframe_body);
}

function applyViewportClass(iframe_body: HTMLElement): void {
  iframe_body.classList.toggle('is-mobile', isMobileViewport());
  iframe_body.classList.toggle('is-desktop', !isMobileViewport());
}

function getSillyTavernContext(): SillyTavernContextLike | null {
  const host_silly = host_window.SillyTavern as SillyTavernLike | undefined;
  const silly = window.SillyTavern as SillyTavernLike | undefined;
  return (
    host_silly?.getContext?.() ||
    (host_silly as SillyTavernContextLike | undefined) ||
    silly?.getContext?.() ||
    (silly as SillyTavernContextLike | undefined) ||
    null
  );
}

function normalizeTagValueList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .flatMap(item =>
            typeof item === 'string'
              ? [item]
              : item && typeof item === 'object'
                ? [
                    (item as { name?: unknown }).name,
                    (item as { tag?: unknown }).tag,
                    (item as { id?: unknown }).id,
                  ]
                : [],
          )
          .map(item => String(item || '').trim())
          .filter(Boolean),
      ),
    ];
  }
  if (typeof value === 'string') {
    return [
      ...new Set(
        value
          .split(/[,\n，|]/)
          .map(item => item.trim())
          .filter(Boolean),
      ),
    ];
  }
  return [];
}

function getCurrentCharacterFilterMeta() {
  const context = getSillyTavernContext();
  const get_current_character_name = getApiFunction('getCurrentCharacterName') as (() => string) | undefined;
  const get_char_data = getApiFunction('getCharData') as ((scope?: string) => unknown) | undefined;
  const current_name =
    String(get_current_character_name?.() || context?.name2 || context?.characterName || '').trim() || '{{char}}';
  const current_character =
    get_char_data?.('current') ||
    context?.character ||
    (Array.isArray(context?.characters)
      ? context.characters.find(character => {
          const name = String(character?.name || character?.data?.name || '').trim();
          return name && name === current_name;
        })
      : null) ||
    null;
  const tags = [
    ...normalizeTagValueList((current_character as { tags?: unknown } | null | undefined)?.tags),
    ...normalizeTagValueList((current_character as { tag_list?: unknown } | null | undefined)?.tag_list),
    ...normalizeTagValueList((current_character as { data?: { tags?: unknown; tag_list?: unknown } } | null | undefined)?.data?.tags),
    ...normalizeTagValueList(
      (current_character as { data?: { tags?: unknown; tag_list?: unknown } } | null | undefined)?.data?.tag_list,
    ),
    ...normalizeTagValueList(
      (current_character as { extensions?: { tags?: unknown; tag_list?: unknown } } | null | undefined)?.extensions?.tags,
    ),
    ...normalizeTagValueList(
      (current_character as { extensions?: { tags?: unknown; tag_list?: unknown } } | null | undefined)?.extensions?.tag_list,
    ),
  ]
    .map(tag => tag.toLowerCase())
    .filter(Boolean);
  return {
    name: current_name,
    tags: [...new Set(tags)],
  };
}

function getOnlineFeatureExclusionState(settings: SettingsState = getSettings()) {
  const current = getCurrentCharacterFilterMeta();
  const matched_character = settings.excluded_character_names.find(name => String(name || '').trim() === current.name);
  const excluded = Boolean(matched_character);
  return {
    excluded,
    current_character_name: current.name,
    current_character_tags: current.tags,
    matched_character_name: matched_character || '',
    reason: matched_character
      ? `当前角色“${current.name}”命中排除角色名单。`
      : '',
  };
}

function getTavernHelperApi(): TavernHelperApiLike | null {
  return (
    (host_window.TavernHelper as TavernHelperApiLike | undefined) ||
    (window.TavernHelper as TavernHelperApiLike | undefined) ||
    null
  );
}

function getChatMessagesByHideState(
  hide_state: 'all' | 'hidden' | 'unhidden' = 'all',
  include_swipes = false,
): MinimalChatMessage[] {
  const tavern_helper = getTavernHelperApi();
  const host_runtime = host_window as unknown as Window & Record<string, unknown>;
  const runtime = window as unknown as Window & Record<string, unknown>;
  const get_chat_messages =
    tavern_helper?.getChatMessages ||
    (host_runtime.getChatMessages as TavernHelperApiLike['getChatMessages'] | undefined) ||
    (runtime.getChatMessages as TavernHelperApiLike['getChatMessages'] | undefined);

  if (typeof get_chat_messages === 'function') {
    return get_chat_messages('0-{{lastMessageId}}', { hide_state, include_swipes }) || [];
  }

  const context = getSillyTavernContext();
  if (Array.isArray(context?.chat)) {
    const mapped_messages = context.chat.map(
      (message: ContextChatMessage, index: number): MinimalChatMessage => ({
        message_id: index,
        name: message.name || '',
        role: message.is_user ? 'user' : 'assistant',
        is_hidden: Boolean(message.is_hidden || message.is_system),
        swipe_id: Number(message.swipe_id || 0),
        swipes: include_swipes ? message.swipes || [message.mes || message.message || ''] : undefined,
        swipes_data: include_swipes ? message.swipes_data || [] : undefined,
        swipes_info: include_swipes ? message.swipes_info || [] : undefined,
        message: message.mes || message.message || '',
        data: {},
        extra: {},
      }),
    );
    if (hide_state === 'hidden') {
      return mapped_messages.filter(message => message.is_hidden);
    }
    if (hide_state === 'unhidden') {
      return mapped_messages.filter(message => !message.is_hidden);
    }
    return mapped_messages;
  }

  throw Error('没有找到 getChatMessages 接口');
}

function getChatMessagesSafely(): MinimalChatMessage[] {
  return getChatMessagesByHideState('all');
}

function getChatMessagesWithSwipesSafely(): MinimalChatMessage[] {
  return getChatMessagesByHideState('all', true);
}

function isChatMessageHidden(message: MinimalChatMessage | null | undefined): boolean {
  return Boolean(message?.is_hidden || message?.is_system || message?.data?.is_hidden || message?.extra?.is_hidden);
}

function getVisibleChatMessagesSafely(): MinimalChatMessage[] {
  return getChatMessagesSafely().filter(message => !isChatMessageHidden(message));
}

function getEventApi(): { event_on: (...args: unknown[]) => unknown; events: Record<string, unknown> } | null {
  const context = getSillyTavernContext();
  const host_runtime = host_window as unknown as Window & Record<string, unknown>;
  const runtime = window as unknown as Window & Record<string, unknown>;
  const event_on =
    (host_runtime.eventOn as ((...args: unknown[]) => unknown) | undefined) ||
    (runtime.eventOn as ((...args: unknown[]) => unknown) | undefined) ||
    context?.eventSource?.on?.bind(context.eventSource);
  const events =
    (host_runtime.tavern_events as Record<string, unknown> | undefined) ||
    (runtime.tavern_events as Record<string, unknown> | undefined) ||
    context?.eventTypes;

  if (typeof event_on !== 'function' || !events) {
    return null;
  }

  return { event_on, events };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function trimPreview(text: unknown): string {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized || '未读取到内容';
}

function getEntryKey(entry: WorldbookLike, fallback_world = ''): string {
  return `${entry.world || fallback_world || ''}.${entry.uid ?? entry.id ?? entry.name ?? entry.comment ?? ''}`;
}

function getEntryLooseKeys(entry: WorldbookLike, fallback_world = ''): string[] {
  const id = entry?.uid ?? entry?.id ?? entry?.name ?? entry?.comment ?? '';
  return [
    `${entry?.world || fallback_world || ''}.${id}`,
    String(id),
    String(entry?.uid ?? ''),
    String(entry?.id ?? ''),
    String(entry?.name ?? ''),
    String(entry?.comment ?? ''),
  ].filter(Boolean);
}

function isConstantWorldbookEntry(entry: WorldbookLike): boolean {
  return entry?.strategy?.type === 'constant' || entry?.constant === true;
}

function isSelectiveWorldbookEntry(entry: WorldbookLike): boolean {
  return entry?.strategy?.type === 'selective' || entry?.selective === true;
}

function getWorldbookEntryName(entry: WorldbookLike): string {
  return entry?.name || entry?.comment || `#${entry?.uid ?? entry?.id ?? '?'}`;
}

function getWorldbookEntryContent(entry: WorldbookLike): string {
  return String(entry?.content || entry?.entry || '');
}

function getWorldbookEntryStableKey(worldbook_name: string, entry: WorldbookLike): string {
  return `${worldbook_name || '未知世界书'}::${entry?.uid ?? entry?.id ?? getWorldbookEntryName(entry)}`;
}

function getWorldbookEntryOverride(settings: SettingsState, worldbook_name: string, entry: WorldbookLike): string {
  return settings?.worldbook_entry_overrides?.[getWorldbookEntryStableKey(worldbook_name, entry)] || '';
}

function getWorldbookEntryScriptMode(
  settings: SettingsState,
  worldbook_name: string,
  entry: WorldbookLike,
): WorldbookMode {
  const override = getWorldbookEntryOverride(settings, worldbook_name, entry);
  if (override === 'exclude') {
    return 'excluded';
  }
  if (override === 'include') {
    return 'included';
  }
  return entry?.enabled === false ? 'disabled' : 'native';
}

function isWorldbookEntryCandidate(settings: SettingsState, worldbook_name: string, entry: WorldbookLike): boolean {
  const mode = getWorldbookEntryScriptMode(settings, worldbook_name, entry);
  return mode === 'native' || mode === 'included';
}

function getWorldbookScanText(messages: MinimalChatMessage[] = getVisibleChatMessagesSafely()): string {
  return messages.map(message => String(message?.message || '')).join('\n\n');
}

function doesWorldbookKeyMatch(text: string, key: string | RegExp | { source?: string }): boolean {
  if (key instanceof RegExp) {
    try {
      key.lastIndex = 0;
      return key.test(text);
    } catch {
      return false;
    }
  }
  const source =
    typeof key === 'object' && !(key instanceof RegExp) ? String(key.source || '').trim() : String(key || '').trim();
  if (!source) {
    return false;
  }
  return text.toLocaleLowerCase().includes(source.toLocaleLowerCase());
}

function doesWorldbookEntryMatchScan(entry: WorldbookLike, scan_text: string): boolean {
  const text = String(scan_text || '');
  const primary_keys = entry?.strategy?.keys || entry?.keys || [];
  const secondary = entry?.strategy?.keys_secondary || {};
  const secondary_keys = secondary.keys || entry?.keysecondary || entry?.secondary_keys || [];
  const primary_matched = primary_keys.length > 0 && primary_keys.some(key => doesWorldbookKeyMatch(text, key));
  if (!primary_matched) {
    return false;
  }
  if (!secondary_keys.length) {
    return true;
  }
  const matched_count = secondary_keys.filter(key => doesWorldbookKeyMatch(text, key)).length;
  const logic = secondary.logic || entry?.selectiveLogic || 'and_any';
  if (logic === 'and_all') {
    return matched_count === secondary_keys.length;
  }
  if (logic === 'not_all') {
    return matched_count < secondary_keys.length;
  }
  if (logic === 'not_any') {
    return matched_count === 0;
  }
  return matched_count > 0;
}

function shouldIncludeWorldbookEntry(
  settings: SettingsState,
  worldbook_name: string,
  entry: WorldbookLike,
  activated_keys: Set<string>,
  scan_text: string,
): boolean {
  if (!isWorldbookEntryCandidate(settings, worldbook_name, entry)) {
    return false;
  }
  if (isConstantWorldbookEntry(entry)) {
    return true;
  }
  if (isSelectiveWorldbookEntry(entry)) {
    return (
      getEntryLooseKeys(entry, worldbook_name).some(key => activated_keys.has(key)) ||
      doesWorldbookEntryMatchScan(entry, scan_text)
    );
  }
  return false;
}

function summarizeWorldbookEntryKeys(entry: WorldbookLike): string {
  const primary_keys = entry?.strategy?.keys || entry?.keys || [];
  const secondary_keys = entry?.strategy?.keys_secondary?.keys || entry?.keysecondary || entry?.secondary_keys || [];
  const normalize_key = (key: string | RegExp | { source?: string }) =>
    typeof key === 'object' && !(key instanceof RegExp) ? String(key.source || '').trim() : String(key || '').trim();
  const keys = [...primary_keys, ...secondary_keys].map(normalize_key).filter(Boolean);
  return keys.length ? keys.slice(0, 6).join('、') : '无关键词';
}

function findLatestMessage<T extends { role?: string }>(messages: T[], role: string): T | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === role) {
      return messages[index];
    }
  }
  return null;
}

function updateText(iframe_document: Document, selector: string, text: unknown): void {
  iframe_document.querySelectorAll<HTMLElement>(selector).forEach(element => {
    element.textContent = text == null ? '' : String(text);
  });
}

function updateHtml(iframe_document: Document, selector: string, html: string): void {
  const element = iframe_document.querySelector<HTMLElement>(selector);
  if (element) {
    element.innerHTML = html;
  }
}

function updateValue(iframe_document: Document, selector: string, value: string): void {
  const element = iframe_document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);
  if (element) {
    element.value = value;
  }
}

function applyMobileViewScaleToHtml(html: string, scale: number): string {
  const normalized_scale = normalizeMobileViewScale(scale);
  const viewport_meta = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  const mobile_scale_css =
    normalized_scale === 1
      ? ''
      : `
@media (max-width: 768px) {
  html { font-size: ${Math.round(normalized_scale * 100)}% !important; overflow-x: hidden !important; }
  body { --online-mobile-view-scale: ${normalized_scale}; min-height: 100vh !important; overflow-x: hidden !important; }
  @supports (zoom: 1) {
    body { zoom: ${normalized_scale}; }
  }
  @supports not (zoom: 1) {
    body {
      width: calc(100% / ${normalized_scale});
      min-height: calc(100vh / ${normalized_scale});
      transform: scale(${normalized_scale});
      transform-origin: top left;
    }
  }
}`;
  const css = `
<style data-online-mobile-view-scale>
html,
body {
  width: 100%;
  min-height: 100%;
  max-width: 100%;
}
html {
  overflow-x: hidden;
}
body {
  margin: 0;
  overflow-x: hidden;
}
*,
*::before,
*::after {
  box-sizing: border-box;
}
img,
video,
canvas,
svg,
iframe,
table {
  max-width: 100% !important;
}
pre,
code {
  max-width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
${mobile_scale_css}
</style>`;
  const source = String(html || '');
  const head_close_pattern = new RegExp('</head>', 'i');
  const html_open_pattern = new RegExp('<html\\b[^>]*>', 'i');
  const viewport_pattern = /<meta[^>]+name=["']viewport["'][^>]*>/i;
  if (head_close_pattern.test(source)) {
    return source.replace(
      head_close_pattern,
      `${viewport_pattern.test(source) ? '' : `${viewport_meta}\n`}${css}
</head>`,
    );
  }
  if (html_open_pattern.test(source)) {
    return source.replace(
      html_open_pattern,
      match => `${match}
${viewport_pattern.test(source) ? '' : `${viewport_meta}\n`}
${css}`,
    );
  }
  return `${viewport_meta}
${css}
${source}`;
}

function showInlineToast(iframe_document: Document, message: string) {
  if (!iframe_document?.body) {
    return;
  }
  iframe_document.querySelectorAll<HTMLElement>('.inline-toast').forEach(element => element.remove());
  const toast = iframe_document.createElement('div');
  toast.className = 'inline-toast';
  toast.textContent = message;
  iframe_document.body.appendChild(toast);
  host_window.setTimeout(() => toast.remove(), 2200);
}

function showHostEchoToast(message: string, tone: 'success' | 'info' | 'warning' | 'error' = 'success') {
  const host_window_with_toast = host_window as Window & {
    toastr?: {
      success?: (message: string, title?: string, options?: Record<string, unknown>) => void;
      info?: (message: string, title?: string, options?: Record<string, unknown>) => void;
      warning?: (message: string, title?: string, options?: Record<string, unknown>) => void;
      error?: (message: string, title?: string, options?: Record<string, unknown>) => void;
    };
  };
  try {
    const toastr = host_window_with_toast.toastr;
    const notify =
      tone === 'error'
        ? toastr?.error
        : tone === 'warning'
          ? toastr?.warning
          : tone === 'info'
            ? toastr?.info
            : toastr?.success;
    if (typeof notify === 'function') {
      notify(message, APP_TITLE);
      return;
    }
  } catch (error) {
    console.warn('[LoreFrame] 酒馆通知调用失败', error);
  }
  console.info('[LoreFrame] 酒馆通知回退', { tone, message });
}

function showConfirmDialog(iframe_document: Document, options: ConfirmDialogOptions = {}) {
  return new Promise<boolean>(resolve => {
    if (!iframe_document?.body) {
      resolve(false);
      return;
    }
    iframe_document.querySelectorAll<HTMLElement>('.confirm-backdrop').forEach(element => element.remove());
    const backdrop = iframe_document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    backdrop.innerHTML = `
        <section class="confirm-dialog ${options.tone === 'danger' ? 'is-danger' : options.tone === 'warning' ? 'is-warning' : ''}" role="dialog" aria-modal="true">
          <h3>${escapeHtml(options.title || '确认操作')}</h3>
          <p>${escapeHtml(options.message || '确定继续吗？')}</p>
          <div class="button-row">
            <button class="plain-button" type="button" data-confirm-cancel>取消</button>
            <button class="plain-button danger-button ${options.tone === 'danger' ? 'is-danger' : 'is-warning'}" type="button" data-confirm-ok>${escapeHtml(options.confirmText || '确认')}</button>
          </div>
        </section>
      `;
    iframe_document.body.appendChild(backdrop);
    const close = (value: boolean) => {
      backdrop.remove();
      resolve(value);
    };
    backdrop.querySelector('[data-confirm-cancel]')?.addEventListener('click', () => close(false));
    backdrop.querySelector('[data-confirm-ok]')?.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (event: MouseEvent) => {
      if (event.target === backdrop) {
        close(false);
      }
    });
  });
}

function showChoiceDialog(iframe_document: Document, options: ChoiceDialogOptions = {}) {
  return new Promise<string | null>(resolve => {
    if (!iframe_document?.body) {
      resolve(null);
      return;
    }
    iframe_document.querySelectorAll<HTMLElement>('.confirm-backdrop').forEach(element => element.remove());
    const choices =
      Array.isArray(options.choices) && options.choices.length ? options.choices : [{ value: 'ok', label: '确认' }];
    const backdrop = iframe_document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    const choice_buttons = choices
      .map(
        (choice: ChoiceDialogOption, index: number) =>
          '<button class="plain-button ' +
          (choice.tone === 'danger'
            ? 'danger-button is-danger'
            : choice.tone === 'warning'
              ? 'danger-button is-warning'
              : '') +
          '" type="button" data-choice-index="' +
          index +
          '">' +
          escapeHtml(choice.label || choice.value || '确认') +
          '</button>',
      )
      .join('');
    backdrop.innerHTML =
      '<section class="confirm-dialog ' +
      (options.tone === 'danger' ? 'is-danger' : options.tone === 'warning' ? 'is-warning' : '') +
      '" role="dialog" aria-modal="true">' +
      '<h3>' +
      escapeHtml(options.title || '请选择') +
      '</h3>' +
      '<p>' +
      escapeHtml(options.message || '') +
      '</p>' +
      '<div class="button-row">' +
      '<button class="plain-button" type="button" data-choice-cancel>' +
      escapeHtml(options.cancelText || '取消') +
      '</button>' +
      choice_buttons +
      '</div>' +
      '</section>';
    iframe_document.body.appendChild(backdrop);
    const close = (value: string | null) => {
      backdrop.remove();
      resolve(value);
    };
    backdrop.querySelector('[data-choice-cancel]')?.addEventListener('click', () => close(null));
    backdrop.querySelectorAll<HTMLElement>('[data-choice-index]').forEach(button => {
      button.addEventListener('click', () => {
        const choice = choices[Number(button.dataset.choiceIndex)];
        close(choice?.value ?? null);
      });
    });
    backdrop.addEventListener('click', (event: MouseEvent) => {
      if (event.target === backdrop) {
        close(null);
      }
    });
  });
}

type GenerateOptionsDialogOptions = {
  title?: string;
  message?: string;
  floorLabel?: string;
  countLabel?: string;
  confirmText?: string;
  cancelText?: string;
  maxCount?: number;
};

type GenerateOptionsDialogResult = {
  floors: number[] | null;
  count: number;
};

function showGenerateOptionsDialog(
  iframe_document: Document,
  options: GenerateOptionsDialogOptions = {},
): Promise<GenerateOptionsDialogResult | null> {
  return new Promise(resolve => {
    if (!iframe_document?.body) {
      resolve(null);
      return;
    }
    iframe_document.querySelectorAll<HTMLElement>('.confirm-backdrop').forEach(element => element.remove());
    const backdrop = iframe_document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    backdrop.innerHTML =
      '<section class="confirm-dialog" role="dialog" aria-modal="true">' +
      '<h3>' +
      escapeHtml(options.title || '手动生成设置') +
      '</h3>' +
      '<p>' +
      escapeHtml(options.message || '指定要生成的目标楼层与生成数量。') +
      '</p>' +
      '<div class="field" style="margin-top:12px;">' +
      '<label>' +
      escapeHtml(options.floorLabel || '目标楼层（留空=当前 AI 楼层）') +
      '</label>' +
      '<input class="input" type="text" data-generate-floors placeholder="如 5，或 1,3,5，或 1-3" />' +
      '</div>' +
      '<div class="field">' +
      '<label>' +
      escapeHtml(options.countLabel || '生成数量') +
      '</label>' +
      '<input class="input" type="number" data-generate-count min="1" max="10" value="1" />' +
      '</div>' +
      '<div class="button-row" style="margin-top:16px;">' +
      '<button class="plain-button" type="button" data-generate-cancel>' +
      escapeHtml(options.cancelText || '取消') +
      '</button>' +
      '<button class="plain-button" type="button" data-generate-ok>' +
      escapeHtml(options.confirmText || '开始生成') +
      '</button>' +
      '</div>' +
      '</section>';
    iframe_document.body.appendChild(backdrop);

    const parseFloors = (raw: string): number[] | null => {
      const text = String(raw || '').trim();
      if (!text) {
        return null;
      }
      const ids = new Set<number>();
      text.split(',').forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) {
          return;
        }
        if (trimmed.includes('-')) {
          const [start_text, end_text] = trimmed.split('-');
          const start = Number(start_text);
          const end = Number(end_text);
          if (Number.isFinite(start) && Number.isFinite(end)) {
            const low = Math.min(start, end);
            const high = Math.max(start, end);
            for (let index = low; index <= high; index += 1) {
              ids.add(index);
            }
          }
        } else {
          const value = Number(trimmed);
          if (Number.isFinite(value)) {
            ids.add(value);
          }
        }
      });
      return ids.size ? [...ids].sort((left, right) => left - right) : null;
    };

    const floors_input = backdrop.querySelector<HTMLInputElement>('[data-generate-floors]');
    const count_input = backdrop.querySelector<HTMLInputElement>('[data-generate-count]');
    const close = (result: GenerateOptionsDialogResult | null) => {
      backdrop.remove();
      resolve(result);
    };
    const submit = () => {
      const floors = parseFloors(floors_input?.value || '');
      let count = Math.floor(Number(count_input?.value || '1'));
      const max_count = options.maxCount ?? 5;
      if (!Number.isFinite(count) || count < 1) {
        count = 1;
      }
      if (count > max_count) {
        count = max_count;
      }
      close({ floors, count });
    };
    backdrop.querySelector('[data-generate-ok]')?.addEventListener('click', submit);
    backdrop.querySelector('[data-generate-cancel]')?.addEventListener('click', () => close(null));
    backdrop.addEventListener('click', (event: MouseEvent) => {
      if (event.target === backdrop) {
        close(null);
      }
    });
    floors_input?.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    });
    count_input?.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    });
  });
}

type ChecklistDialogOption = {
  value: string;
  label: string;
};

function showChecklistDialog(
  iframe_document: Document,
  options: {
    title?: string;
    searchPlaceholder?: string;
    doneText?: string;
    selectedValues?: string[];
    items?: ChecklistDialogOption[];
  } = {},
) {
  return new Promise<string[] | null>(resolve => {
    if (!iframe_document?.body) {
      resolve(null);
      return;
    }
    iframe_document.querySelectorAll<HTMLElement>('.confirm-backdrop').forEach(element => element.remove());
    const items = Array.isArray(options.items) ? options.items : [];
    const selected = new Set((options.selectedValues || []).map(value => String(value)));
    const backdrop = iframe_document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    backdrop.innerHTML = `
      <section class="confirm-dialog excluded-character-dialog" role="dialog" aria-modal="true">
        <div class="detail-import-dialog__toolbar excluded-character-dialog__toolbar">
          <h3>${escapeHtml(options.title || '选择项目')}</h3>
          <button class="icon-button" type="button" data-checklist-close aria-label="关闭"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="field">
          <input class="input" type="search" data-checklist-search placeholder="${escapeHtml(options.searchPlaceholder || '搜索...')}" />
        </div>
        <div class="detail-import-dialog__body excluded-character-dialog__body" data-checklist-list></div>
        <div class="button-row excluded-character-dialog__footer">
          <span class="settings-card__note excluded-character-dialog__count" data-checklist-count></span>
          <button class="plain-button excluded-character-dialog__done" type="button" data-checklist-done>${escapeHtml(options.doneText || '完成')}</button>
        </div>
      </section>
    `;
    iframe_document.body.appendChild(backdrop);
    const list = backdrop.querySelector<HTMLElement>('[data-checklist-list]');
    const search = backdrop.querySelector<HTMLInputElement>('[data-checklist-search]');
    const count = backdrop.querySelector<HTMLElement>('[data-checklist-count]');
    const close = (value: string[] | null) => {
      backdrop.remove();
      resolve(value);
    };
    const render = () => {
      const keyword = String(search?.value || '').trim().toLowerCase();
      const filtered = items.filter(item => !keyword || item.label.toLowerCase().includes(keyword));
      if (list) {
        list.innerHTML = filtered.length
          ? filtered
              .map(
                item => `
                  <label class="checkbox-row">
                    <input type="checkbox" data-checklist-item="${escapeHtml(item.value)}" ${selected.has(item.value) ? 'checked' : ''} />
                    <span>${escapeHtml(item.label)}</span>
                  </label>`,
              )
              .join('')
          : '<p class="settings-card__note">没有匹配结果。</p>';
      }
      if (count) {
        count.textContent = `共 ${items.length} 项，已选择 ${selected.size} 项`;
      }
      list?.querySelectorAll<HTMLInputElement>('[data-checklist-item]').forEach(input => {
        input.addEventListener('change', () => {
          const value = String(input.dataset.checklistItem || '');
          if (!value) return;
          if (input.checked) {
            selected.add(value);
          } else {
            selected.delete(value);
          }
          if (count) {
            count.textContent = `共 ${items.length} 项，已选择 ${selected.size} 项`;
          }
        });
      });
    };
    render();
    search?.addEventListener('input', render);
    backdrop.querySelector('[data-checklist-close]')?.addEventListener('click', () => close(null));
    backdrop.querySelector('[data-checklist-done]')?.addEventListener('click', () => close([...selected]));
    backdrop.addEventListener('click', (event: MouseEvent) => {
      if (event.target === backdrop) {
        close(null);
      }
    });
  });
}

function setChecked(iframe_document: Document, selector: string, checked: boolean) {
  const element = iframe_document.querySelector<HTMLInputElement>(selector);
  if (element) {
    element.checked = checked;
  }
}

function escapeHtml(text: unknown): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
