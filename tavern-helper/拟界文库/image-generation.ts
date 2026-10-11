const active_image_jobs = new Set<string>();

async function generateOnlineImages(iframe_document: Document, automatic = false) {
  const online_data = getCurrentOnlineData();
  const active_entry = online_data.active_entry;
  const active_variant = getEntryActiveVariant(active_entry);
  if (!active_entry || !active_variant) return;
  const scope_key = getCurrentOnlineScopeInfo().scope_key;
  const chat_label = getCurrentChatStorageLabel();
  const job_key = JSON.stringify([scope_key, chat_label, active_entry.id, active_variant.id]);
  if (active_image_jobs.has(job_key)) return;
  const still_current = () => {
    if (getCurrentOnlineScopeInfo().scope_key !== scope_key || getCurrentChatStorageLabel() !== chat_label)
      return false;
    const entry = getCurrentOnlineData().entries.find(item => item.id === active_entry.id);
    return entry?.active_variant_id === active_variant.id && getEntryActiveVariant(entry)?.html === expected_html;
  };
  let expected_html = String(active_variant.html || active_entry.html || '');
  const source_html = String(active_entry?.html || active_variant?.html || online_data.html || '');
  const image_settings = normalizeImageGenerationSettings(getSettings().image_generation);
  const active_preset = image_settings.presets.find(preset => preset.id === image_settings.active_preset_id);
  const active_vibe_group = image_settings.vibe_groups.find(group => group.id === image_settings.active_vibe_group_id);
  const active_vibe_references = active_vibe_group?.references || [];
  const asset_count = (source_html.match(/data-image-asset(?:\s|=|>)/gi) || []).length;
  if (automatic && (!asset_count || !image_settings.enabled)) return;
  if (!asset_count) {
    appendImageGenerationLog('跳过', '当前页面没有可处理的生图资产');
    showInlineToast(iframe_document, '当前页面没有可处理的生图资产。');
    return;
  }
  if (!image_settings.enabled || (image_settings.mode === 'novelai' && !active_preset)) {
    appendImageGenerationLog('跳过', '生图配置未激活', {
      enabled: image_settings.enabled,
      mode: image_settings.mode,
      preset: active_preset?.name || '',
    });
    showInlineToast(iframe_document, '请先开启生图并配置当前所选接口。');
    return;
  }
  const planned_html = planImageAssetRoutes(source_html, image_settings);
  if (!still_current()) return;
  updateOnlineEntry(active_entry.id, { html: planned_html });
  expected_html = planned_html;
  const parser = new DOMParser().parseFromString(planned_html, 'text/html');
  const assets = [...parser.querySelectorAll<HTMLElement>('[data-image-asset]')].filter(
    asset =>
      asset.dataset.imageRenderMode !== 'css' &&
      asset.querySelector('img') &&
      asset.querySelector('img')?.dataset.imageGenerationComplete !== 'true',
  );
  const images = assets
    .map(asset => asset.querySelector<HTMLImageElement>('img'))
    .filter(Boolean) as HTMLImageElement[];
  if (!images.length) {
    renderOnlineContent(iframe_document);
    if (!automatic) showInlineToast(iframe_document, '没有待生成的图片（已完成或使用 CSS 绘画）。');
    return;
  }
  active_image_jobs.add(job_key);
  appendImageGenerationLog('请求', `开始生成 ${images.length} 张图片`, {
    provider: image_settings.mode,
    model: image_settings.mode === 'gpt_image' ? image_settings.gpt_image.model : active_preset!.model,
    size:
      image_settings.mode === 'gpt_image'
        ? image_settings.gpt_image.size
        : `${active_preset!.width}x${active_preset!.height}`,
  });
  let success_count = 0;
  try {
    for (let index = 0; index < images.length; index += 1) {
      if (!still_current()) return;
      const image = images[index];
      const html_prompt = String(image.dataset.imagePrompt || '').trim();
      const is_gpt = image_settings.mode === 'gpt_image';
      const prompt = is_gpt
        ? [image_settings.gpt_image.positive_prompt, html_prompt].filter(Boolean).join('\n\n')
        : [active_preset!.positive_prompt, html_prompt].map(normalizeNovelAiPrompt).filter(Boolean).join(', ');
      const negative_prompt = is_gpt ? '' : normalizeNovelAiPrompt(active_preset!.negative_prompt);
      appendImageGenerationLog('请求', `发送第 ${index + 1}/${images.length} 张图片请求`, {
        prompt: prompt.slice(0, 512),
        negative_prompt: negative_prompt.slice(0, 512),
      });
      const result = is_gpt
        ? await requestGptImage(image_settings.gpt_image, prompt)
        : await requestNovelAiImage(active_preset!, prompt, negative_prompt, active_vibe_references);
      if (!still_current()) return;
      image.src = result.image;
      image.dataset.imageGenerationComplete = 'true';
      image.removeAttribute('data-image-asset-rendered');
      const status = assets[index].querySelector<HTMLElement>('[data-image-generation-status]');
      if (status) {
        status.textContent = `已生成图片 · ${index + 1}/${images.length}`;
      }
      const next_html = `<!doctype html>\n${parser.documentElement.outerHTML}`;
      updateOnlineEntry(active_entry.id, { html: next_html });
      expected_html = next_html;
      renderOnlineContent(iframe_document);
      success_count += 1;
      appendImageGenerationLog('成功', `第 ${index + 1}/${images.length} 张图片生成完成`, {
        response: '图片已解析并写回 HTML。',
      });
    }
    appendImageGenerationLog('完成', `生图完成：${success_count}/${images.length}`);
    renderOnlineContent(iframe_document);
    showInlineToast(iframe_document, `已生成 ${success_count}/${images.length} 张图片。`);
  } catch (error) {
    appendImageGenerationLog('错误', `生图失败：已完成 ${success_count}/${images.length}`, error);
    showInlineToast(iframe_document, `生图失败：${error instanceof Error ? error.message : String(error)}`);
  } finally {
    active_image_jobs.delete(job_key);
  }
}
