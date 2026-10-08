const SCRIPT_ID = 'online-content-floating-window';
const OLD_SCRIPT_ID = 'serial-forum-floating-window';
const IFRAME_ID = `${SCRIPT_ID}-iframe`;
const LAUNCHER_ID = `${SCRIPT_ID}-launcher`;
const QR_BUTTON_ENTRY_ID = `${SCRIPT_ID}-qr-entry`;
const EXTENSIONS_MENU_ENTRY_ID = `${SCRIPT_ID}-extensions-entry`;
const HOST_ENTRY_STYLE_ID = `${SCRIPT_ID}-host-entry-style`;
const SETTINGS_STORAGE_KEY = `${SCRIPT_ID}-settings-v1`;
const OLD_SETTINGS_STORAGE_KEY = `${OLD_SCRIPT_ID}-settings-v1`;
const WINDOW_STATE_STORAGE_KEY = `${SCRIPT_ID}-window-state-v1`;
const OLD_WINDOW_STATE_STORAGE_KEY = `${OLD_SCRIPT_ID}-window-state-v1`;
const DETAIL_PROMPT_HISTORY_STORAGE_KEY = `${SCRIPT_ID}-detail-prompt-history-v1`;
const OLD_DETAIL_PROMPT_HISTORY_STORAGE_KEY = `${OLD_SCRIPT_ID}-detail-prompt-history-v1`;
const VARIABLE_ROOT_KEY = SCRIPT_ID;
const OLD_VARIABLE_ROOT_KEY = OLD_SCRIPT_ID;
const PERSONAL_SETTINGS_KEY = 'personal_settings_v2';
const PUBLISHED_PROMPTS_KEY = 'published_prompts_v1';
const PUBLISHED_BASE_PROMPTS_KEY = 'published_base_prompts_v1';
const PUBLISHED_DETAIL_PROMPTS_KEY = 'published_detail_prompts_v1';
const PUBLISHED_SUMMARY_TAGS_KEY = 'published_summary_tags_v1';
const ONLINE_DATA_STORE_KEY = 'online_data_store_v1';
const OLD_ONLINE_DATA_STORE_KEY = 'forum_data_store_v1';
const ONLINE_CHAT_INDEX_KEY = 'online_chat_index_v1';
const OLD_ONLINE_CHAT_INDEX_KEY = 'forum_chat_index_v1';
const CHAT_STORAGE_PREFIX = `${SCRIPT_ID}-chat-v1:`;
const OLD_CHAT_STORAGE_PREFIX = `${OLD_SCRIPT_ID}-chat-v1:`;
const ONLINE_SCOPE_INDEX_STORAGE_PREFIX = `${SCRIPT_ID}-scope-index-v2:`;
const ONLINE_SCOPE_CHAT_STORAGE_PREFIX = `${SCRIPT_ID}-scope-chat-v2:`;
const OLD_ONLINE_SCOPE_INDEX_STORAGE_PREFIX = `${OLD_SCRIPT_ID}-scope-index-v2:`;
const OLD_ONLINE_SCOPE_CHAT_STORAGE_PREFIX = `${OLD_SCRIPT_ID}-scope-chat-v2:`;
const ONLINE_PAYLOAD_DB_NAME = `${SCRIPT_ID}-payload-db-v1`;
const ONLINE_PAYLOAD_STORE_NAME = 'online_payloads_v1';
const ONLINE_PAYLOAD_DB_VERSION = 1;
const FONT_AWESOME_CSS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
const FONT_AWESOME_METADATA_URL =
  'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.5.2/metadata/icons.json';
const BUBBLE_SIZE = 52;
const PANEL_MARGIN = 14;
const MOBILE_BREAKPOINT = 700;
const PANEL_FORCE_FULLSCREEN_BREAKPOINT = 1024;
const MOBILE_PANEL_MAX_WIDTH = 9999;
const MOBILE_PANEL_MAX_HEIGHT = 9999;
const DESKTOP_PANEL_MAX_WIDTH = 920;
const DESKTOP_PANEL_MAX_HEIGHT = 680;
const DESKTOP_PANEL_MIN_WIDTH = 560;
const DESKTOP_PANEL_MIN_HEIGHT = 420;
const MAX_ONLINE_STREAM_CHARS = 160000;
const MAX_RUN_LOGS = 120;
const MAX_DETAIL_PROMPT_HISTORY = 200;
const MAX_RECENT_DETAIL_PROMPT_LOGS = 20;
const LOG_PREVIEW_CHARS = 2200;

type WindowPosition = { x: number; y: number };
type WindowSize = { width: number; height: number };
type RunLogEntry = {
  time: string;
  category: string;
  message: string;
  detail: string;
  collapsed: boolean;
};

type DetailPromptActivationEntry = {
  time: string;
  updated_at: string;
  label: string;
  names: string[];
  prompt_name: string;
  message_id: string;
};

// 脚本运行在 iframe 中，但大部分 DOM 与事件都发生在宿主酒馆页面。
const host_window = window.parent && window.parent !== window ? window.parent : window;
const host_document = host_window.document;
// 这些变量会在其它 TS 片段里被更新；当前文件单独看不到赋值，因此要避免 `prefer-const` 误报。
/* eslint-disable prefer-const */
let current_iframe_document: Document | null = null;
let bubble_position: WindowPosition | null = null;
let panel_position: WindowPosition | null = null;
let panel_size: WindowSize | null = null;
let panel_fullscreen = false;
let panel_position_before_fullscreen: WindowPosition | null = null;
let pending_body_generation = false;
let body_generation_received = false;
let body_generation_start_snapshot: { message_id: string | number | null; message: string; length: number } | null =
  null;
let body_generation_user_message_id: string | number | null = null;
let body_generation_received_message_id: string | number | null = null;
let body_generation_finished = false;
let body_generation_check_timer = 0;
let body_generation_check_attempts = 0;
let body_generation_last_signal_at = 0;
let body_generation_started_at = 0;
let body_generation_poll_timer = 0;
let body_generation_stable_key = '';
let body_generation_stable_since = 0;
let collect_timer = 0;
let source_collect_timer = 0;
let regenerate_cooldown_timer = 0;
let window_state_save_timer = 0;
let last_chat_signature = '';
let active_view = 'online';
let latest_activated_world_info_entries: Array<Record<string, unknown>> = [];
let latest_activated_world_info_text = '';
let latest_persona_world_info_entries: Array<Record<string, unknown>> = [];
let latest_worldbook_entry_catalog: Array<Record<string, unknown>> = [];
let online_is_generating = false;
let active_online_generation_id = '';
let last_online_generation_finished_at = 0;
let run_logs: RunLogEntry[] = [];
let detail_prompt_activation_history: DetailPromptActivationEntry[] = [];
/* eslint-enable prefer-const */
