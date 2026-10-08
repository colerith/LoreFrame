const host_window_with_registry = host_window as Window & { [key: string]: unknown };

$(function initLoreFrame() {
  console.info('[LoreFrame] 开始初始化');
  try {
    mount();
  } catch (error) {
    console.error('[LoreFrame] 初始化失败', error);
    throw error;
  }
});

$(window).one('pagehide', () => {
  const script_runtime = host_window_with_registry[SCRIPT_ID] as { destroy?: () => void } | undefined;
  script_runtime?.destroy?.();
});
