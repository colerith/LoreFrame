type ScriptRuntime = {
  destroy?: () => void;
};

type WindowState = {
  bubble_position?: unknown;
  panel_position?: unknown;
  panel_size?: unknown;
};

const host_window_with_runtime = host_window as Window & Record<string, unknown>;

function removeOldWindow() {
  host_document.getElementById(IFRAME_ID)?.remove();
  host_document.getElementById(LAUNCHER_ID)?.remove();
  host_document.getElementById(QR_BUTTON_ENTRY_ID)?.remove();
  host_document.getElementById(EXTENSIONS_MENU_ENTRY_ID)?.remove();
  host_document.getElementById(HOST_ENTRY_STYLE_ID)?.remove();
  host_document.getElementById(`${SCRIPT_ID}-host-style`)?.remove();
  host_document.getElementById(`${SCRIPT_ID}-launcher-style`)?.remove();
  host_document.querySelectorAll(`[data-${SCRIPT_ID}-source-button]`).forEach(button => button.remove());
}

function cleanupPreviousWindow() {
  const script_runtime = host_window_with_runtime[SCRIPT_ID] as ScriptRuntime | undefined;
  if (script_runtime?.destroy) {
    script_runtime.destroy();
    return;
  }

  removeOldWindow();
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = host_window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.warn('[LoreFrame] 读取存储失败', key, error);
    return fallback;
  }
}

function writeJsonStorage(key: string, value: unknown) {
  try {
    host_window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('[LoreFrame] 写入存储失败', key, error);
    return false;
  }
}

function isFinitePoint(position: unknown): position is WindowPosition {
  if (!position || typeof position !== 'object') {
    return false;
  }

  const point = position as Record<string, unknown>;
  return Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

function isFiniteSize(size: unknown): size is WindowSize {
  if (!size || typeof size !== 'object') {
    return false;
  }

  const rect = size as Record<string, unknown>;
  return Number.isFinite(Number(rect.width)) && Number.isFinite(Number(rect.height));
}

function normalizePoint(position: WindowPosition): WindowPosition {
  return {
    x: Number(position.x),
    y: Number(position.y),
  };
}

function normalizeSize(size: WindowSize): WindowSize {
  return {
    width: Number(size.width),
    height: Number(size.height),
  };
}

function loadWindowState() {
  const state =
    readJsonStorage<WindowState | null>(WINDOW_STATE_STORAGE_KEY, null) ||
    readJsonStorage<WindowState>(OLD_WINDOW_STATE_STORAGE_KEY, {});
  bubble_position = isFinitePoint(state.bubble_position) ? normalizePoint(state.bubble_position) : null;
  panel_position = isFinitePoint(state.panel_position) ? normalizePoint(state.panel_position) : null;
  panel_size = isFiniteSize(state.panel_size) ? normalizeSize(state.panel_size) : null;
}

function saveWindowState() {
  host_window.clearTimeout(window_state_save_timer);
  window_state_save_timer = host_window.setTimeout(() => {
    flushWindowState();
  }, 160);
}

function flushWindowState() {
  host_window.clearTimeout(window_state_save_timer);
  window_state_save_timer = 0;
  writeJsonStorage(WINDOW_STATE_STORAGE_KEY, {
    bubble_position,
    panel_position,
    panel_size,
  });
}
