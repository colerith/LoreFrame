function imageProbabilityPrompt(settings: SettingsImageGeneration): string {
  if (!settings.probability_enabled) return '';
  return `\n[概率图片] 客户端对每个图片位置独立按 ${settings.api_probability}% 概率选择 API，否则使用 CSS 绘画。每个 data-image-asset 内必须同时提供 img[data-image-prompt] 与一个 data-image-css-fallback 容器。后者用真实 HTML/CSS（渐变、几何图形、伪元素等）绘制同主题画面，不能仅写占位文字；无需外部图片。两者都要完整提供，客户端负责显示其一，不要自行随机，不要请求 API。`;
}

function planImageAssetRoutes(html: string, settings: SettingsImageGeneration, random = Math.random): string {
  if (!html || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const asset of doc.querySelectorAll<HTMLElement>('[data-image-asset]')) {
    const image = asset.querySelector<HTMLImageElement>('img');
    if (!image) continue;
    // A route is stored in the page itself: reloads and API retries never reroll it.
    if (!['api', 'css'].includes(asset.dataset.imageRenderMode || '')) {
      const has_image = Boolean(image.getAttribute('src')) && image.dataset.imageAssetRendered !== 'true';
      const probability = settings.probability_enabled ? settings.api_probability : 100;
      asset.dataset.imageRenderMode =
        has_image || (settings.enabled && probability > 0 && (probability >= 100 || random() < probability / 100))
          ? 'api'
          : 'css';
    }
    let fallback = asset.querySelector<HTMLElement>('[data-image-css-fallback]');
    if (asset.dataset.imageRenderMode === 'css' && !fallback) {
      fallback = doc.createElement('div');
      fallback.dataset.imageCssFallback = 'true';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', image.alt || 'CSS 氛围画');
      fallback.style.cssText =
        'width:100%;aspect-ratio:3/2;border-radius:16px;background:radial-gradient(circle at 72% 28%,#fc9fbb 0 12%,transparent 13%),linear-gradient(155deg,transparent 50%,#5e80be 51% 70%,#204075 71%),linear-gradient(#dbe6ff,#fde8f0);';
      asset.append(fallback);
    }
    const css = asset.dataset.imageRenderMode === 'css';
    image.style.setProperty('display', css ? 'none' : 'block', 'important');
    if (fallback) fallback.style.setProperty('display', css ? 'block' : 'none', 'important');
    if (css) asset.querySelector('[data-image-generation-status]')?.remove();
  }
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
