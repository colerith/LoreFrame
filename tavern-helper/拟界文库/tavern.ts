type StatusText = string | number | boolean | null | undefined;
type BubbleGenerationState = 'idle' | 'loading' | 'success' | 'error';
type MainViewName =
  | 'online'
  | 'settings'
  | 'theater'
  | 'theater-edit'
  | 'prompt-management'
  | 'sources'
  | 'appearance'
  | 'debug-tools'
  | 'prompt-viewer'
  | 'run-log'
  | 'monitor';
type EventListenerHandle = { stop?: () => void } | (() => void) | null | undefined;

function setMonitorStatus(iframe_document: Document | null, status: StatusText, detail: StatusText) {
  if (!iframe_document) {
    return;
  }
  updateText(iframe_document, '[data-online-status]', status);
  updateText(iframe_document, '[data-online-detail]', detail);
}

function setSourceStatus(iframe_document: Document | null, status: StatusText, detail: StatusText) {
  if (!iframe_document) {
    return;
  }
  updateText(iframe_document, '[data-source-status]', status);
  updateText(iframe_document, '[data-source-detail]', detail);
}

function setOnlineStatus(iframe_document: Document | null, status: StatusText, detail: StatusText) {
  if (!iframe_document) {
    return;
  }
  updateText(iframe_document, '[data-generate-status]', status);
  updateText(iframe_document, '[data-generate-detail]', detail);
}

function setBubbleGenerationState(iframe_document: Document | null, state: string): void {
  const normalized_state: BubbleGenerationState = ['idle', 'loading', 'success', 'error'].includes(state)
    ? (state as BubbleGenerationState)
    : 'idle';
  setFloatingLauncherState(normalized_state);
  const iframe_body = iframe_document?.body;
  if (!iframe_body) {
    return;
  }
  iframe_body.dataset.bubbleState = normalized_state;
}

function markGenerationStarted(iframe_document: Document | null): void {
  setBubbleGenerationState(iframe_document, 'loading');
}

function markGenerationFinished(
  iframe_document: Document | null,
  state: string,
  message: string,
  detail: string = '',
): void {
  const iframe_body = iframe_document?.body;
  if (!iframe_body) {
    return;
  }
  setBubbleGenerationState(iframe_document, state);
  if (iframe_body.classList.contains('is-panel')) {
    showInlineToast(iframe_document, detail ? `${message}：${detail}` : message);
  }
}

function stopEventListener(listener_handle: EventListenerHandle): void {
  try {
    if (
      listener_handle &&
      typeof listener_handle === 'object' &&
      typeof listener_handle.stop === 'function'
    ) {
      listener_handle.stop();
      return;
    }
    if (typeof listener_handle === 'function') {
      listener_handle();
    }
  } catch (error) {
    console.warn('[LoreFrame] 取消事件监听失败', error);
  }
}

function switchMainView(iframe_document: Document, view_name: MainViewName): void {
  const normalized_view: MainViewName =
    view_name === 'prompt-viewer' || view_name === 'run-log' || view_name === 'monitor' ? 'debug-tools' : view_name;
  active_view = normalized_view;
  const root_view: 'online' | 'settings' | 'theater' | 'theater-edit' =
    normalized_view === 'online'
      ? 'online'
      : normalized_view === 'theater' || normalized_view === 'theater-edit'
        ? normalized_view
        : 'settings';
  const iframe_body = iframe_document.body;
  iframe_body.classList.toggle('is-settings-root', root_view !== 'online');
  if (root_view !== 'online') {
    iframe_body.classList.remove('sidebar-open');
  }
  iframe_document.querySelectorAll<HTMLElement>('[data-view]').forEach(element => {
    element.hidden = element.dataset.view !== root_view;
  });
  iframe_document.querySelectorAll<HTMLElement>('[data-nav-view]').forEach(button => {
    const nav_target = root_view === 'theater' || root_view === 'theater-edit' ? 'settings' : root_view;
    const is_active = button.dataset.navView === nav_target;
    button.classList.toggle('is-active', is_active);
    button.setAttribute('aria-current', is_active ? 'page' : 'false');
  });
  iframe_document.querySelectorAll<HTMLElement>('[data-settings-view]').forEach(element => {
    element.hidden = element.dataset.settingsView !== normalized_view;
  });
  iframe_document.querySelectorAll<HTMLElement>('[data-settings-nav-view]').forEach(button => {
    const is_active = button.dataset.settingsNavView === normalized_view;
    button.classList.toggle('is-active', is_active);
    button.setAttribute('aria-current', is_active ? 'page' : 'false');
  });
}

function setSidebarOpen(iframe_body: HTMLElement, is_open: boolean): void {
  if (iframe_body.classList.contains('is-settings-root') && !iframe_body.classList.contains('is-mobile')) {
    is_open = false;
  }
  iframe_body.classList.toggle('sidebar-open', is_open);
  const toggle = iframe_body.ownerDocument.querySelector<HTMLElement>('.sidebar-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(is_open));
    toggle.textContent = is_open ? '‹' : '›';
  }
}
