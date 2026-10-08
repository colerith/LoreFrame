type FrameMode = 'bubble' | 'panel';

type FramePosition = {
  x: number;
  y: number;
};

type FrameSize = {
  width: number;
  height: number;
};

type PointerSnapshot = {
  x: number;
  y: number;
};

function ensureFloatingLauncherStyle() {
  if (host_document.getElementById(SCRIPT_ID + '-launcher-style')) {
    return;
  }
  const style = host_document.createElement('style');
  style.id = SCRIPT_ID + '-launcher-style';
  style.textContent =
    // TauriTavern 2.2.0 会覆盖全屏浮窗尺寸；仅针对被宿主标记的文库 iframe。
    // 使用宿主视口和安全区变量，与独立面板修复补丁保持一致。
    `iframe#${IFRAME_ID}[data-tt-mobile-surface="fullscreen-window"] {
      width: calc(100vw - max(var(--tt-inset-left, 0px), 0px) - max(var(--tt-inset-right, 0px), 0px)) !important;
      height: calc(var(--tt-base-viewport-height, 100dvh) - max(var(--tt-inset-top, 0px), 0px) - max(var(--tt-viewport-bottom-inset, var(--tt-inset-bottom, 0px)), 0px)) !important;
    }` +
    '#' +
    LAUNCHER_ID +
    ' {' +
    ' --online-content-launcher-bg: #eff5f2;' +
    ' --online-content-launcher-icon: #18211d;' +
    ' --online-content-launcher-icon-size: 1em;' +
    ' --online-content-launcher-edge-shift: 0px;' +
    ' position: fixed; z-index: 99999; display: grid; width: 52px; height: 52px;' +
    ' place-items: center; border: 0; border-radius: 999px; background: transparent;' +
    ' color: var(--online-content-launcher-icon); cursor: pointer; touch-action: none;' +
    ' user-select: none; padding: 0; opacity: 0.46; appearance: none; box-sizing: border-box;' +
    ' box-shadow: none; text-decoration: none; font: inherit; line-height: 1; outline: none;' +
    ' flex: none; min-width: 52px; min-height: 52px; max-width: 52px; max-height: 52px;' +
    ' -webkit-tap-highlight-color: transparent;' +
    ' transition: opacity 160ms ease, left 180ms ease, top 180ms ease, transform 180ms ease;' +
    ' transform: translate3d(var(--online-content-launcher-edge-shift), 0, 0);' +
    '}' +
    '#' +
    LAUNCHER_ID +
    '[data-edge="left"], #' +
    LAUNCHER_ID +
    '[data-edge="right"] {' +
    ' opacity: 0.34;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    '[data-edge="left"]:hover, #' +
    LAUNCHER_ID +
    '[data-edge="left"]:focus-visible {' +
    ' --online-content-launcher-edge-shift: 12px;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    '[data-edge="right"]:hover, #' +
    LAUNCHER_ID +
    '[data-edge="right"]:focus-visible {' +
    ' --online-content-launcher-edge-shift: -12px;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ':hover, #' +
    LAUNCHER_ID +
    ':focus-visible, #' +
    LAUNCHER_ID +
    ':active {' +
    ' opacity: 1;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    '[hidden] { display: none !important; }' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher-fallback {' +
    ' display: contents;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher__inner {' +
    ' position: relative; display: grid; width: 45px; height: 45px; place-items: center;' +
    ' border-radius: 999px; background: var(--online-content-launcher-bg); pointer-events: none;' +
    ' overflow: hidden;' +
    ' transition: transform 180ms ease;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    '[data-edge="left"]:hover .online-content-launcher__inner, #' +
    LAUNCHER_ID +
    '[data-edge="left"]:focus-visible .online-content-launcher__inner, #' +
    LAUNCHER_ID +
    '[data-edge="right"]:hover .online-content-launcher__inner, #' +
    LAUNCHER_ID +
    '[data-edge="right"]:focus-visible .online-content-launcher__inner { transform: scale(1.04); }' +
    '#' +
    LAUNCHER_ID +
    ':active .online-content-launcher__inner { transform: scale(0.98); }' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher__icon { position: relative; display: grid; width: 26px; height: 26px; place-items: center; }' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher__state {' +
    ' position: absolute; inset: 0; display: grid; place-items: center; opacity: 0;' +
    ' transform: scale(0.82) rotate(-12deg); transition: opacity 220ms ease, transform 220ms ease;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher__state svg { width: 26px; height: 26px; display: block; }' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher__state i {' +
    ' font-size: calc(26px * var(--online-content-launcher-icon-size, 1)); line-height: 1;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-status-icon {' +
    ' position: relative; display: grid; width: 26px; height: 26px; place-items: center;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-status-icon--success { color: #55b48a; }' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-status-icon--error { color: #e06c75; }' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-status-icon--loading {' +
    ' color: currentColor;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-status-icon__ring {' +
    ' position: absolute; inset: 0; display: grid; place-items: center;' +
    ' animation: onlineContentLauncherSpin 0.95s linear infinite;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-status-icon__ring--back {' +
    ' opacity: 0.22; transform: scale(0.92); animation-direction: reverse; animation-duration: 1.4s;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-status-icon__spark {' +
    ' position: absolute; right: -1px; top: -2px; font-size: calc(9px * var(--online-content-launcher-icon-size, 1));' +
    ' color: #ffd36e; filter: drop-shadow(0 0 6px rgba(255, 211, 110, 0.42));' +
    ' animation: onlineContentLauncherSpark 0.9s ease-in-out infinite alternate;' +
    '}' +
    '@keyframes onlineContentLauncherSpin {' +
    ' from { transform: rotate(0deg); } to { transform: rotate(360deg); }' +
    '}' +
    '@keyframes onlineContentLauncherSpark {' +
    ' from { transform: translate3d(-1px, 1px, 0) scale(0.88); opacity: 0.56; }' +
    ' to { transform: translate3d(1px, -1px, 0) scale(1.08); opacity: 1; }' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher__state img {' +
    ' width: calc(26px * var(--online-content-launcher-icon-size, 1)); height: calc(26px * var(--online-content-launcher-icon-size, 1));' +
    ' object-fit: contain; display: block;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    '[data-bubble-state="idle"] .online-content-launcher__state.is-idle,' +
    '#' +
    LAUNCHER_ID +
    '[data-bubble-state="loading"] .online-content-launcher__state.is-loading,' +
    '#' +
    LAUNCHER_ID +
    '[data-bubble-state="success"] .online-content-launcher__state.is-success,' +
    '#' +
    LAUNCHER_ID +
    '[data-bubble-state="error"] .online-content-launcher__state.is-error {' +
    ' opacity: 1; transform: scale(1) rotate(0deg);' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher-shadow-host {' +
    ' display: contents;' +
    '}' +
    '#' +
    LAUNCHER_ID +
    ' .online-content-launcher-shadow-mount {' +
    ' display: contents;' +
    '}';
  host_document.head.appendChild(style);
}

function getFloatingLauncher() {
  return host_document.getElementById(LAUNCHER_ID) as HTMLButtonElement | null;
}

function getDefaultLauncherIdleIconHtml() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26"><g fill="currentColor"><path fill-rule="evenodd" d="M4.25 13a8.75 8.75 0 1 0 17.5 0a8.75 8.75 0 0 0-17.5 0m16 0a7.25 7.25 0 1 1-14.5 0a7.25 7.25 0 0 1 14.5 0" clip-rule="evenodd"/><path fill-rule="evenodd" d="M9.25 13c0 4.522 1.491 8.25 3.75 8.25s3.75-3.728 3.75-8.25S15.259 4.75 13 4.75S9.25 8.478 9.25 13m6 0c0 3.762-1.195 6.75-2.25 6.75s-2.25-2.988-2.25-6.75S11.945 6.25 13 6.25s2.25 2.988 2.25 6.75" clip-rule="evenodd"/><path d="M4.75 13.75v-1.5h16.5v1.5zM6.6 8.47l1-1.12c1.31 1.18 3.53 1.81 5.85 1.81c2.24 0 4.31-.58 5.75-1.73l.98 1.14c-1.68 1.44-4.15 2.09-6.73 2.09c-2.76 0-5.3-.75-6.85-2.19m0 9.08l1 1.11c1.31-1.18 3.53-1.81 5.85-1.81c2.24 0 4.31.58 5.75 1.73l.98-1.14c-1.68-1.44-4.15-2.09-6.73-2.09c-2.76 0-5.3.75-6.85 2.2"/><path fill-rule="evenodd" d="M13 24c6.075 0 11-4.925 11-11S19.075 2 13 2S2 6.925 2 13s4.925 11 11 11m0 2c7.18 0 13-5.82 13-13S20.18 0 13 0S0 5.82 0 13s5.82 13 13 13" clip-rule="evenodd"/></g></svg>';
}

function getLauncherIdleIconHtml(settings = getSettings()) {
  const bubble_style = normalizeBubbleStyleSettings(settings?.bubble_style);
  if (bubble_style.icon_source === 'fontawesome') {
    return '<i class="' + escapeHtml(bubble_style.icon_value || 'fa-solid fa-book-open') + '" aria-hidden="true"></i>';
  }
  if (bubble_style.icon_source === 'image') {
    return '<img src="' + escapeHtml(bubble_style.icon_value || '') + '" alt="" referrerpolicy="no-referrer" />';
  }
  return getDefaultLauncherIdleIconHtml();
}

function getLauncherIconHtml(settings = getSettings()) {
  const idle = getLauncherIdleIconHtml(settings);
  const loading =
    '<span class="online-content-status-icon online-content-status-icon--loading"><i class="fa-solid fa-circle-notch online-content-status-icon__ring" aria-hidden="true"></i><i class="fa-solid fa-circle-notch online-content-status-icon__ring online-content-status-icon__ring--back" aria-hidden="true"></i><i class="fa-solid fa-sparkles online-content-status-icon__spark" aria-hidden="true"></i></span>';
  const success =
    '<span class="online-content-status-icon online-content-status-icon--success"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></span>';
  const error =
    '<span class="online-content-status-icon online-content-status-icon--error"><i class="fa-solid fa-circle-xmark" aria-hidden="true"></i></span>';
  return (
    '<span class="online-content-launcher__inner"><span class="online-content-launcher__icon"><span class="online-content-launcher__state is-idle">' +
    idle +
    '</span><span class="online-content-launcher__state is-loading">' +
    loading +
    '</span><span class="online-content-launcher__state is-success">' +
    success +
    '</span><span class="online-content-launcher__state is-error">' +
    error +
    '</span></span></span>'
  );
}

function getLauncherShadowCss() {
  return (
    '.online-content-launcher-shadow-host { display: contents; }' +
    '.online-content-launcher__inner {' +
    ' position: relative; display: grid; width: 45px; height: 45px; place-items: center;' +
    ' border-radius: 999px; background: var(--online-content-launcher-bg); pointer-events: none;' +
    ' overflow: hidden; transition: transform 180ms ease;' +
    '}' +
    ':host(:hover) .online-content-launcher__inner { transform: scale(1.04); }' +
    ':host(:active) .online-content-launcher__inner { transform: scale(0.98); }' +
    '.online-content-launcher__icon {' +
    ' position: relative; display: grid; width: 26px; height: 26px; place-items: center;' +
    '}' +
    '.online-content-launcher__state {' +
    ' position: absolute; inset: 0; display: grid; place-items: center; opacity: 0;' +
    ' transform: scale(0.82) rotate(-12deg); transition: opacity 220ms ease, transform 220ms ease;' +
    '}' +
    '.online-content-launcher__state svg { width: 26px; height: 26px; display: block; }' +
    '.online-content-launcher__state i {' +
    ' font-size: calc(26px * var(--online-content-launcher-icon-size, 1)); line-height: 1;' +
    '}' +
    '.online-content-status-icon {' +
    ' position: relative; display: grid; width: 26px; height: 26px; place-items: center;' +
    '}' +
    '.online-content-status-icon--success { color: #55b48a; }' +
    '.online-content-status-icon--error { color: #e06c75; }' +
    '.online-content-status-icon--loading { color: currentColor; }' +
    '.online-content-status-icon__ring {' +
    ' position: absolute; inset: 0; display: grid; place-items: center;' +
    ' animation: onlineContentLauncherSpin 0.95s linear infinite;' +
    '}' +
    '.online-content-status-icon__ring--back {' +
    ' opacity: 0.22; transform: scale(0.92); animation-direction: reverse; animation-duration: 1.4s;' +
    '}' +
    '.online-content-status-icon__spark {' +
    ' position: absolute; right: -1px; top: -2px; font-size: calc(9px * var(--online-content-launcher-icon-size, 1));' +
    ' color: #ffd36e; filter: drop-shadow(0 0 6px rgba(255, 211, 110, 0.42));' +
    ' animation: onlineContentLauncherSpark 0.9s ease-in-out infinite alternate;' +
    '}' +
    '@keyframes onlineContentLauncherSpin {' +
    ' from { transform: rotate(0deg); } to { transform: rotate(360deg); }' +
    '}' +
    '@keyframes onlineContentLauncherSpark {' +
    ' from { transform: translate3d(-1px, 1px, 0) scale(0.88); opacity: 0.56; }' +
    ' to { transform: translate3d(1px, -1px, 0) scale(1.08); opacity: 1; }' +
    '}' +
    '.online-content-launcher__state img {' +
    ' width: calc(26px * var(--online-content-launcher-icon-size, 1)); height: calc(26px * var(--online-content-launcher-icon-size, 1));' +
    ' object-fit: contain; display: block;' +
    '}' +
    ':host([data-bubble-state="idle"]) .online-content-launcher__state.is-idle,' +
    ':host([data-bubble-state="loading"]) .online-content-launcher__state.is-loading,' +
    ':host([data-bubble-state="success"]) .online-content-launcher__state.is-success,' +
    ':host([data-bubble-state="error"]) .online-content-launcher__state.is-error {' +
    ' opacity: 1; transform: scale(1) rotate(0deg);' +
    '}'
  );
}

function getFloatingLauncherShadowMount(launcher: HTMLButtonElement) {
  return launcher.querySelector('.online-content-launcher-shadow-mount') as HTMLSpanElement | null;
}

function setFloatingLauncherVisualState(launcher: HTMLButtonElement, state: string) {
  const normalized_state = ['idle', 'loading', 'success', 'error'].includes(state) ? state : 'idle';
  launcher.dataset.bubbleState = normalized_state;
  const shadow_mount = getFloatingLauncherShadowMount(launcher);
  if (shadow_mount) {
    shadow_mount.dataset.bubbleState = normalized_state;
  }
}

function supportsFloatingLauncherShadow(launcher: HTMLButtonElement) {
  const shadow_mount = getFloatingLauncherShadowMount(launcher);
  return Boolean(shadow_mount && typeof shadow_mount.attachShadow === 'function');
}

function ensureFloatingLauncherShadowRoot(launcher: HTMLButtonElement) {
  const shadow_mount = getFloatingLauncherShadowMount(launcher);
  if (!shadow_mount || !supportsFloatingLauncherShadow(launcher)) {
    return null;
  }
  let shadow_root = shadow_mount.shadowRoot;
  if (!shadow_root) {
    try {
      shadow_root = shadow_mount.attachShadow({ mode: 'open' });
    } catch (error) {
      console.warn('[LoreFrame] 当前环境不支持悬浮球 Shadow DOM，已回退普通模式', error);
      return null;
    }
  }
  const existing_style = shadow_root.getElementById(SCRIPT_ID + '-launcher-shadow-style');
  if (!existing_style) {
    const fontawesome_link = host_document.createElement('link');
    fontawesome_link.rel = 'stylesheet';
    fontawesome_link.href = FONT_AWESOME_CSS_URL;
    shadow_root.appendChild(fontawesome_link);

    const style = host_document.createElement('style');
    style.id = SCRIPT_ID + '-launcher-shadow-style';
    style.textContent = getLauncherShadowCss();
    shadow_root.appendChild(style);
  }
  return shadow_root;
}

function renderFloatingLauncherContent(launcher: HTMLButtonElement, settings = getSettings()) {
  const shadow_root = ensureFloatingLauncherShadowRoot(launcher);
  if (!shadow_root) {
    const shadow_mount = getFloatingLauncherShadowMount(launcher);
    if (shadow_mount) {
      shadow_mount.innerHTML = '';
    }
    let fallback_root = launcher.querySelector<HTMLElement>('.online-content-launcher-fallback');
    if (!fallback_root) {
      fallback_root = host_document.createElement('span');
      fallback_root.className = 'online-content-launcher-fallback';
      launcher.appendChild(fallback_root);
    }
    fallback_root.innerHTML = getLauncherIconHtml(settings);
    return;
  }
  launcher.querySelector<HTMLElement>('.online-content-launcher-fallback')?.remove();
  let root = shadow_root.querySelector<HTMLElement>('.online-content-launcher-shadow-host');
  if (!root) {
    root = host_document.createElement('span');
    root.className = 'online-content-launcher-shadow-host';
    shadow_root.appendChild(root);
  }
  root.innerHTML = getLauncherIconHtml(settings);
}

function applyFloatingLauncherAppearance(launcher = getFloatingLauncher()) {
  if (!launcher) {
    return;
  }
  const settings = getSettings();
  const theme = getSavedTheme();
  const appearance = normalizeAppearanceSettings(settings?.appearance)[theme];
  const bubble_style = normalizeBubbleStyleSettings(settings?.bubble_style);
  launcher.style.setProperty(
    '--online-content-launcher-bg',
    bubble_style.background_mode === 'hidden'
      ? 'transparent'
      : bubble_style.background_mode === 'custom'
        ? bubble_style.background_color
        : appearance.bubble_bg,
  );
  launcher.style.setProperty(
    '--online-content-launcher-icon',
    bubble_style.icon_color_mode === 'custom' ? bubble_style.icon_color : appearance.panel_text,
  );
  launcher.style.setProperty(
    '--online-content-launcher-icon-size',
    bubble_style.icon_size_mode === 'custom' ? String(bubble_style.icon_size_em) : '1',
  );
  const state = launcher.dataset.bubbleState || 'idle';
  renderFloatingLauncherContent(launcher, settings);
  setFloatingLauncherVisualState(launcher, state);
}

function setFloatingLauncherState(state: string) {
  const launcher = getFloatingLauncher();
  if (!launcher) {
    return;
  }
  setFloatingLauncherVisualState(launcher, state);
}

function createFloatingLauncher(on_open?: (() => void) | null) {
  ensureFloatingLauncherStyle();
  let launcher = getFloatingLauncher();
  if (!launcher) {
    launcher = host_document.createElement('button') as HTMLButtonElement;
    launcher.id = LAUNCHER_ID;
    launcher.type = 'button';
    launcher.className = 'online-content-floating-ball';
    launcher.title = APP_TITLE + '悬浮球';
    launcher.setAttribute('script_id', SCRIPT_ID);
    launcher.setAttribute('data-script-id', SCRIPT_ID);
    launcher.setAttribute('data-floating-ball', 'true');
    launcher.setAttribute('aria-label', APP_TITLE + '悬浮球');
    const shadow_mount = host_document.createElement('span');
    shadow_mount.className = 'online-content-launcher-shadow-mount';
    shadow_mount.dataset.bubbleState = 'idle';
    launcher.appendChild(shadow_mount);
    renderFloatingLauncherContent(launcher);
    (host_document.body || host_document.documentElement).appendChild(launcher);
  } else if (launcher.parentElement !== host_document.body && host_document.body) {
    host_document.body.appendChild(launcher);
  }
  launcher.onclick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const suppress_until = Number(launcher?.dataset.suppressClickUntil || 0);
    if (suppress_until > Date.now()) {
      return;
    }
    on_open?.();
  };
  launcher.hidden = false;
  setFloatingLauncherState(launcher.dataset.bubbleState || 'idle');
  applyFloatingLauncherAppearance(launcher);
  return launcher;
}

function ensureFloatingLauncherMounted(on_open?: (() => void) | null) {
  ensureFloatingLauncherStyle();
  const launcher = createFloatingLauncher(on_open);
  if (!launcher) {
    return null;
  }
  if (launcher.parentElement !== host_document.body && host_document.body) {
    host_document.body.appendChild(launcher);
  }
  applyFloatingLauncherAppearance(launcher);
  return launcher;
}

function setFloatingLauncherVisible(is_visible: boolean) {
  const launcher = getFloatingLauncher();
  if (!launcher) {
    return;
  }
  const launch_entry_modes = normalizeLaunchEntryModes(getSettings()?.launch_entry_modes);
  const should_show = is_visible && launch_entry_modes.includes('floating_ball');
  launcher.hidden = !should_show;
  launcher.style.display = should_show ? 'grid' : 'none';
}

function getBubbleDockHiddenWidth() {
  return Math.round(BUBBLE_SIZE * 0.5);
}

function clampBubbleVisiblePosition(position: FramePosition): FramePosition {
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  const size = getModeSize('bubble');
  return {
    x: Math.min(Math.max(position.x, insets.left), Math.max(insets.left, insets.left + viewport.width - size.width)),
    y: Math.min(
      Math.max(position.y, insets.top + 6),
      Math.max(insets.top + 6, insets.top + viewport.height - size.height - 6),
    ),
  };
}

function clampBubbleDockablePosition(position: FramePosition): FramePosition {
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  const size = getModeSize('bubble');
  const hidden_width = getBubbleDockHiddenWidth();
  return {
    x: Math.min(
      Math.max(position.x, insets.left - hidden_width),
      Math.max(insets.left - hidden_width, insets.left + viewport.width - size.width + hidden_width),
    ),
    y: Math.min(
      Math.max(position.y, insets.top + 6),
      Math.max(insets.top + 6, insets.top + viewport.height - size.height - 6),
    ),
  };
}

function shouldDockBubbleToEdge(position: FramePosition) {
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  const size = getModeSize('bubble');
  const snap_threshold = Math.max(18, Math.round(BUBBLE_SIZE * 0.45));
  const distance_left = position.x - insets.left;
  const distance_right = insets.left + viewport.width - (position.x + size.width);
  return distance_left <= snap_threshold || distance_right <= snap_threshold;
}

function getDockedBubblePosition(position: FramePosition): FramePosition {
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  const size = getModeSize('bubble');
  const hidden_width = getBubbleDockHiddenWidth();
  const safe_y = Math.min(
    Math.max(position.y, insets.top + 6),
    Math.max(insets.top + 6, insets.top + viewport.height - size.height - 6),
  );
  const center_x = position.x + size.width / 2;
  const dock_left = center_x < insets.left + viewport.width / 2;
  return {
    x: dock_left ? insets.left - hidden_width : insets.left + viewport.width - size.width + hidden_width,
    y: safe_y,
  };
}

function dockFloatingLauncherToNearestEdge(iframe: HTMLIFrameElement, preferred_position?: FramePosition | null) {
  const current_position = clampBubbleVisiblePosition(
    preferred_position || bubble_position || getDefaultBubblePosition(),
  );
  const docked_position = getDockedBubblePosition(current_position);
  setIframeMode(iframe, 'bubble', docked_position);
}

function clampPosition(position: FramePosition, size: FrameSize, margin: number): FramePosition {
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  const min_x = insets.left + margin;
  const min_y = insets.top + margin;
  const max_x = Math.max(min_x, insets.left + viewport.width - size.width - margin);
  const max_y = Math.max(min_y, insets.top + viewport.height - size.height - margin);

  return {
    x: Math.min(Math.max(position.x, min_x), max_x),
    y: Math.min(Math.max(position.y, min_y), max_y),
  };
}

function getDefaultBubblePosition() {
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  const size = getModeSize('bubble');

  return getDockedBubblePosition({
    x: Math.max(insets.left, insets.left + viewport.width - size.width),
    y: Math.max(insets.top, insets.top + (viewport.height - size.height) / 2),
  });
}

function getDefaultPanelPosition() {
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  const size = getModeSize('panel');

  return clampPosition(
    {
      x: insets.left + viewport.width - size.width - PANEL_MARGIN,
      y: insets.top + PANEL_MARGIN,
    },
    size,
    PANEL_MARGIN,
  );
}

function positionFloatingLauncher(position: FramePosition) {
  const launcher = getFloatingLauncher();
  if (!launcher || launcher.parentElement !== host_document.body) {
    return;
  }
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  if (position.x <= insets.left) {
    launcher.dataset.edge = 'left';
  } else if (position.x + BUBBLE_SIZE >= insets.left + viewport.width) {
    launcher.dataset.edge = 'right';
  } else {
    delete launcher.dataset.edge;
  }
  Object.assign(launcher.style, {
    position: 'fixed',
    zIndex: '99999',
    width: BUBBLE_SIZE + 'px',
    height: BUBBLE_SIZE + 'px',
    left: position.x + 'px',
    top: position.y + 'px',
    right: 'auto',
    bottom: 'auto',
    margin: '0',
  });
}

function hideIframe(iframe: HTMLIFrameElement) {
  Object.assign(iframe.style, {
    position: 'fixed',
    zIndex: '99998',
    border: '0',
    background: 'transparent',
    colorScheme: 'normal',
    pointerEvents: 'none',
    width: '0px',
    height: '0px',
    left: '-9999px',
    top: '-9999px',
    right: 'auto',
    bottom: 'auto',
    transform: 'none',
    borderRadius: '0',
    overflow: 'hidden',
    opacity: '0',
    display: 'block',
  });
}

function setIframeMode(iframe: HTMLIFrameElement, mode: FrameMode, next_position?: FramePosition) {
  const is_force_fullscreen_panel = mode === 'panel' && isPanelForceFullscreenViewport();
  const is_fullscreen = (mode === 'panel' && panel_fullscreen) || is_force_fullscreen_panel;
  const viewport = getViewportSize();
  const insets = getViewportInsets();
  const size = is_fullscreen
    ? {
        width: Math.max(320, viewport.width),
        height: Math.max(220, viewport.height),
      }
    : getModeSize(mode);
  const margin = mode === 'bubble' || is_fullscreen ? 0 : PANEL_MARGIN;
  const fallback_position = mode === 'bubble' ? getDefaultBubblePosition() : getDefaultPanelPosition();
  const saved_position = mode === 'bubble' ? bubble_position : panel_position;
  const base_position = next_position || saved_position || fallback_position;
  const position =
    mode === 'bubble'
      ? clampBubbleDockablePosition(base_position)
      : is_fullscreen
        ? { x: insets.left, y: insets.top }
        : clampPosition(base_position, size, margin);

  if (mode === 'bubble') {
    bubble_position = position;
    positionFloatingLauncher(position);
    setFloatingLauncherVisible(true);
    hideIframe(iframe);
    saveWindowState();
    return;
  }

  if (!is_force_fullscreen_panel) {
    panel_position = position;
  }
  setFloatingLauncherVisible(false);
  const common_styles = {
    position: 'fixed',
    zIndex: '99999',
    border: '0',
    background: 'transparent',
    colorScheme: 'normal',
    pointerEvents: 'auto',
    borderRadius: is_fullscreen ? '0' : '28px',
    overflow: 'hidden',
    opacity: '1',
    display: 'block',
  };

  Object.assign(iframe.style, common_styles);
  Object.assign(iframe.style, {
    width: size.width + 'px',
    height: size.height + 'px',
    left: position.x + 'px',
    top: position.y + 'px',
    right: 'auto',
    bottom: 'auto',
    transform: 'none',
  });
  saveWindowState();
}

function setPanelSize(
  iframe: HTMLIFrameElement,
  next_size: FrameSize,
  anchor_position: FramePosition = panel_position || getDefaultPanelPosition(),
) {
  if (isMobileViewport() || isPanelForceFullscreenViewport()) {
    return;
  }
  const viewport = getViewportSize();
  const available_width = Math.max(DESKTOP_PANEL_MIN_WIDTH, viewport.width - PANEL_MARGIN * 2);
  const available_height = Math.max(DESKTOP_PANEL_MIN_HEIGHT, viewport.height - PANEL_MARGIN * 2);
  panel_size = {
    width: Math.min(Math.max(next_size.width, DESKTOP_PANEL_MIN_WIDTH), available_width),
    height: Math.min(Math.max(next_size.height, DESKTOP_PANEL_MIN_HEIGHT), available_height),
  };
  saveWindowState();
  setIframeMode(iframe, 'panel', anchor_position);
}

function openPanel(iframe: HTMLIFrameElement, iframe_body: HTMLElement) {
  iframe_body.classList.add('is-panel');
  iframe_body.classList.toggle('is-panel-fullscreen', panel_fullscreen);
  iframe_body.classList.toggle('is-panel-force-fullscreen', isPanelForceFullscreenViewport());
  if (!online_is_generating) {
    iframe_body.dataset.bubbleState = 'idle';
    setFloatingLauncherState('idle');
  }
  setIframeMode(iframe, 'panel', panel_position || bubble_position || getDefaultPanelPosition());
}

function closePanel(iframe: HTMLIFrameElement, iframe_body: HTMLElement) {
  iframe_body.classList.remove('is-panel');
  iframe_body.classList.remove('is-panel-fullscreen');
  iframe_body.classList.remove('is-panel-force-fullscreen');
  setIframeMode(iframe, 'bubble');
}

function togglePanelFullscreen(iframe: HTMLIFrameElement, iframe_body: HTMLElement) {
  if (isPanelForceFullscreenViewport()) {
    const fullscreen_iframe_document = iframe.contentDocument;
    if (fullscreen_iframe_document) {
      showInlineToast(fullscreen_iframe_document, '当前窗口宽度较小，面板已强制全屏。');
    }
    return panel_fullscreen;
  }
  if (!panel_fullscreen) {
    panel_position_before_fullscreen = panel_position || getDefaultPanelPosition();
  } else {
    const viewport = getViewportSize();
    const size = getModeSize('panel');
    panel_position = clampPosition(
      {
        x: Math.round((viewport.width - size.width) / 2),
        y: Math.max(PANEL_MARGIN, Math.round((viewport.height - size.height) / 2)),
      },
      size,
      PANEL_MARGIN,
    );
  }
  panel_fullscreen = !panel_fullscreen;
  iframe_body.classList.toggle('is-panel-fullscreen', panel_fullscreen);
  if (iframe_body.classList.contains('is-panel')) {
    setIframeMode(iframe, 'panel', panel_position || getDefaultPanelPosition());
  }
  return panel_fullscreen;
}

function makeDraggable(handle: HTMLElement, iframe: HTMLIFrameElement, mode: FrameMode, onTap?: (() => void) | null) {
  let start_pointer: PointerSnapshot | null = null;
  let start_position: FramePosition | null = null;
  let dragged = false;

  handle.addEventListener('pointerdown', (event: PointerEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (mode === 'panel' && target?.closest('button, input, label, select, textarea, a')) {
      return;
    }

    const current_position =
      mode === 'bubble' ? bubble_position || getDefaultBubblePosition() : panel_position || getDefaultPanelPosition();

    start_pointer = {
      x: event.screenX,
      y: event.screenY,
    };
    start_position =
      mode === 'bubble'
        ? clampBubbleDockablePosition(current_position)
        : clampPosition(current_position, getModeSize(mode), PANEL_MARGIN);
    dragged = false;

    handle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  handle.addEventListener('pointermove', (event: PointerEvent) => {
    if (!start_pointer || !start_position) {
      return;
    }

    const delta_x = event.screenX - start_pointer.x;
    const delta_y = event.screenY - start_pointer.y;
    if (Math.hypot(delta_x, delta_y) > 8) {
      dragged = true;
    }

    setIframeMode(iframe, mode, {
      x: start_position.x + delta_x,
      y: start_position.y + delta_y,
    });
  });

  handle.addEventListener('pointerup', (event: PointerEvent) => {
    handle.releasePointerCapture?.(event.pointerId);
    start_pointer = null;
    start_position = null;

    if (dragged && mode === 'bubble') {
      handle.dataset.suppressClickUntil = String(Date.now() + 300);
      const current_position = clampBubbleVisiblePosition(bubble_position || getDefaultBubblePosition());
      if (shouldDockBubbleToEdge(current_position)) {
        dockFloatingLauncherToNearestEdge(iframe, current_position);
      } else {
        setIframeMode(iframe, 'bubble', current_position);
      }
    }
    if (!dragged) {
      onTap?.();
    }
  });

  handle.addEventListener('pointercancel', (event: PointerEvent) => {
    handle.releasePointerCapture?.(event.pointerId);
    if (dragged && mode === 'bubble') {
      const current_position = clampBubbleVisiblePosition(bubble_position || getDefaultBubblePosition());
      if (shouldDockBubbleToEdge(current_position)) {
        dockFloatingLauncherToNearestEdge(iframe, current_position);
      } else {
        setIframeMode(iframe, 'bubble', current_position);
      }
    }
    start_pointer = null;
    start_position = null;
  });
}

function makeResizable(handle: HTMLElement, iframe: HTMLIFrameElement) {
  let start_pointer: PointerSnapshot | null = null;
  let start_size: FrameSize | null = null;
  let start_position: FramePosition | null = null;

  handle.addEventListener('pointerdown', (event: PointerEvent) => {
    if (isMobileViewport()) {
      return;
    }
    start_pointer = {
      x: event.screenX,
      y: event.screenY,
    };
    start_size = getModeSize('panel');
    start_position = panel_position || getDefaultPanelPosition();
    handle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  });

  handle.addEventListener('pointermove', (event: PointerEvent) => {
    if (!start_pointer || !start_size || !start_position) {
      return;
    }
    setPanelSize(
      iframe,
      {
        width: start_size.width + event.screenX - start_pointer.x,
        height: start_size.height + event.screenY - start_pointer.y,
      },
      start_position,
    );
  });

  const finish_resize = (event: PointerEvent) => {
    handle.releasePointerCapture?.(event.pointerId);
    start_pointer = null;
    start_size = null;
    start_position = null;
  };

  handle.addEventListener('pointerup', finish_resize);
  handle.addEventListener('pointercancel', finish_resize);
}
