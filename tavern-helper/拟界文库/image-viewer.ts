type LoreFrameImageVersion = { id: string; src: string; prompt: string; caption: string; created_at: string };
function getLoreFrameImageVersions(image: HTMLImageElement): LoreFrameImageVersion[] {
  let versions: LoreFrameImageVersion[] = [];
  try {
    const parsed = JSON.parse(image.dataset.imageVersions || '[]');
    if (Array.isArray(parsed))
      versions = parsed.filter(
        item =>
          item &&
          typeof item.id === 'string' &&
          typeof item.src === 'string' &&
          /^(data:image\/(png|jpeg|webp|avif);base64,|https?:\/\/)/i.test(item.src),
      );
  } catch {
    /* Legacy pages have no history. */
  }
  const src = image.getAttribute('src') || '';
  if (
    /^(data:image\/(png|jpeg|webp|avif);base64,|https?:\/\/)/i.test(src) &&
    !versions.some(item => item.src === src)
  ) {
    versions.push({
      id: image.dataset.imageVersionId || 'original',
      src,
      prompt: image.dataset.imagePrompt || '',
      caption: image.dataset.imageCaption || '',
      created_at: '',
    });
  }
  return versions;
}
function recordLoreFrameImageVersion(image: HTMLImageElement, src: string) {
  const versions = getLoreFrameImageVersions(image);
  const version = {
    id: `image-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    src,
    prompt: image.dataset.imagePrompt || '',
    caption: image.dataset.imageCaption || '',
    created_at: new Date().toISOString(),
  };
  versions.push(version);
  image.dataset.imageVersions = JSON.stringify(versions);
  image.dataset.imageVersionId = version.id;
}
function openLoreFrameImageViewer(owner: Document, asset_index: number) {
  owner.querySelector('[data-loreframe-image-viewer]')?.remove();
  const entry = getCurrentOnlineData().active_entry;
  const variant = getEntryActiveVariant(entry);
  if (!entry || !variant) return;
  const scope = getCurrentOnlineScopeInfo().scope_key;
  const chat = getCurrentChatStorageLabel();
  const job_key = JSON.stringify([scope, chat, entry.id, variant.id]);
  let expected_html = variant.html;
  let parsed = new DOMParser().parseFromString(expected_html, 'text/html');
  let asset = parsed.querySelectorAll<HTMLElement>('[data-image-asset]')[asset_index];
  if (!asset) return;
  let picture = asset.querySelector<HTMLImageElement>('img');
  if (!picture) {
    picture = parsed.createElement('img');
    picture.dataset.imagePrompt = asset.dataset.imagePrompt || '';
    asset.prepend(picture);
  }
  const dialog = owner.createElement('dialog');
  dialog.dataset.loreframeImageViewer = 'true';
  dialog.setAttribute('aria-label', '图片查看与编辑');
  dialog.style.cssText =
    'padding:0;border:1px solid #526078;border-radius:20px;width:min(940px,94vw);max-width:94vw;height:90vh;max-height:90vh;background:#10151e;color:#eef2f8;overflow:hidden;';
  dialog.innerHTML = `<style>[data-loreframe-image-viewer]::backdrop{background:#000a}[data-loreframe-image-viewer] button,[data-loreframe-image-viewer] select{font:inherit;color:inherit;background:#263143;border:1px solid #53627a;border-radius:10px;padding:10px;cursor:pointer;min-width:40px;min-height:40px}[data-loreframe-image-viewer] button:disabled{opacity:.45;cursor:wait}[data-loreframe-image-viewer] select{max-width:100%}[data-loreframe-image-viewer] textarea{box-sizing:border-box;width:100%;color:inherit;background:#172130;border:1px solid #53627a;border-radius:8px;padding:10px;font:inherit}[data-loreframe-image-viewer] [data-toolbar]{display:flex;gap:6px;flex-wrap:wrap;padding:10px}[data-loreframe-image-viewer] [data-stage]{flex:1;min-height:0;overflow:auto;text-align:center;touch-action:pan-x pan-y}[data-loreframe-image-viewer] [data-stage] img{max-width:100%;height:100%;object-fit:contain}[data-loreframe-image-viewer] [data-stage].zoomed img{max-width:none;height:auto;min-width:100%}[data-loreframe-image-viewer] [data-panel]{overflow:auto;padding:16px;max-height:50vh}[data-loreframe-image-viewer] [data-panel] label{display:block;margin:8px 0}[data-loreframe-image-viewer] [data-status]{padding:6px 14px;color:#b5c9e6}</style><div style="height:100%;display:flex;flex-direction:column"><div data-toolbar role="toolbar" aria-label="图片操作"></div><div data-stage><p data-empty style="padding:40px;color:#a5b5cd">▧<br>暂无图片，可编辑提示词后生成</p><img alt="图片预览" draggable="false"></div><div data-caption style="padding:10px 16px;white-space:pre-wrap"></div><div data-status role="status" aria-live="polite"></div><div data-panel hidden></div></div>`;
  owner.body.append(dialog);
  const toolbar = dialog.querySelector<HTMLElement>('[data-toolbar]')!;
  const stage = dialog.querySelector<HTMLElement>('[data-stage]')!;
  const preview = stage.querySelector('img')!;
  const panel = dialog.querySelector<HTMLElement>('[data-panel]')!;
  const status = dialog.querySelector<HTMLElement>('[data-status]')!;
  let busy = false;
  const valid = () => {
    const current = getCurrentOnlineData().active_entry;
    return (
      getCurrentOnlineScopeInfo().scope_key === scope &&
      getCurrentChatStorageLabel() === chat &&
      current?.id === entry.id &&
      getEntryActiveVariant(current)?.id === variant.id &&
      getEntryActiveVariant(current)?.html === expected_html
    );
  };
  const ensure = () => {
    if (!valid()) throw Error('页面已切换或内容已更新，请关闭后重新打开图片。');
    if (active_image_jobs.has(job_key)) throw Error('当前页面正在生图，请等待完成后编辑。');
  };
  const refresh = () => {
    const src = picture!.getAttribute('src') || '';
    stage.querySelector<HTMLElement>('[data-empty]')!.hidden = Boolean(src && !src.startsWith('data:image/svg+xml'));
    if (src && !src.startsWith('data:image/svg+xml')) {
      preview.src = src;
      preview.hidden = false;
    } else {
      preview.removeAttribute('src');
      preview.hidden = true;
    }
    dialog.querySelector<HTMLElement>('[data-caption]')!.textContent = picture!.dataset.imageCaption || '';
  };
  const save = () => {
    ensure();
    const html = `<!doctype html>\n${parsed.documentElement.outerHTML}`;
    updateOnlineEntry(entry.id, { html });
    expected_html = html;
    renderOnlineContent(owner);
    refresh();
    status.textContent = '修改已保存。';
  };
  const close = () => {
    dialog.close();
    dialog.remove();
  };
  dialog.addEventListener('close', () => dialog.remove());
  const action = (label: string, icon: string, run: () => void | Promise<void>, mutable = false) => {
    const button = owner.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    const paths: Record<string, string> = {
      expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
      'rotate-right': '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
      download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
      'trash-can': '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
      pen: '<path d="m4 16-1 5 5-1L21 7l-4-4L4 16Zm10-10 4 4"/>',
      'align-left': '<path d="M4 5h16M4 10h10M4 15h16M4 20h10"/>',
      'layer-group': '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 10 10 5 10-5M2 18l10 5 10-5"/>',
      xmark: '<path d="m6 6 12 12M18 6 6 18"/>',
    };
    button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[icon] || paths.pen}</svg>`;
    button.addEventListener('click', async () => {
      if (busy && mutable) return;
      try {
        if (mutable) ensure();
        await run();
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : String(error);
      }
    });
    if (mutable) button.dataset.mutable = 'true';
    toolbar.append(button);
    return button;
  };
  const panelButton = (label: string, run: () => void | Promise<void>) => {
    const button = owner.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', async () => {
      try {
        await run();
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : String(error);
      }
    });
    panel.append(button);
    return button;
  };
  const showPanel = (title: string) => {
    panel.replaceChildren();
    panel.hidden = false;
    const heading = owner.createElement('h3');
    heading.textContent = title;
    panel.append(heading);
    panelButton('返回大图', () => { panel.hidden = true; });
  };
  const regenerate = async () => {
    ensure();
    panel.hidden = true;
    busy = true;
    status.textContent = '正在生成，请稍候；旧图片会保留。';
    toolbar.querySelectorAll<HTMLButtonElement>('[data-mutable]').forEach(button => (button.disabled = true));
    try {
      await generateOnlineImages(owner, false, { asset_index, force: true });
      const current = getCurrentOnlineData().active_entry;
      if (
        getCurrentOnlineScopeInfo().scope_key !== scope ||
        getCurrentChatStorageLabel() !== chat ||
        current?.id !== entry.id ||
        getEntryActiveVariant(current)?.id !== variant.id
      )
        throw Error('页面已切换，请重新打开图片。');
      expected_html = getEntryActiveVariant(current)!.html;
      parsed = new DOMParser().parseFromString(expected_html, 'text/html');
      asset = parsed.querySelectorAll<HTMLElement>('[data-image-asset]')[asset_index];
      picture = asset.querySelector('img');
      refresh();
      status.textContent = image_job_feedback.get(job_key)?.detail || '处理完成。';
    } finally {
      busy = false;
      toolbar.querySelectorAll<HTMLButtonElement>('[data-mutable]').forEach(button => (button.disabled = false));
    }
  };
  action('放大 / 适应窗口', 'expand', () => {
    stage.classList.toggle('zoomed');
  });
  stage.addEventListener('dblclick', () => stage.classList.toggle('zoomed'));
  action(
    '重新生成图片',
    'rotate-right',
    () => {
      showPanel('重新生成图片');
      const hint = owner.createElement('p');
      hint.textContent = '只生成这一张，使用已保存的接口与提示词；会调用生图 API，旧版本保留。';
      panel.append(hint);
      panelButton('确认生成', regenerate);
      panelButton('取消', () => {
        panel.hidden = true;
      });
    },
    true,
  );
  action('下载图片', 'download', () => {
    const src = picture!.getAttribute('src');
    if (!src || src.startsWith('data:image/svg+xml')) throw Error('暂无可下载图片。');
    const link = owner.createElement('a');
    link.href = src;
    link.download = `loreframe-${Date.now()}.${src.startsWith('data:image/webp') ? 'webp' : src.startsWith('data:image/jpeg') ? 'jpg' : 'png'}`;
    link.click();
  });
  action(
    '删除当前图片版本',
    'trash-can',
    () => {
      showPanel('删除当前版本');
      panelButton('确认删除', () => {
        ensure();
        const versions = getLoreFrameImageVersions(picture!).filter(v => v.src !== picture!.getAttribute('src'));
        picture!.dataset.imageVersions = JSON.stringify(versions);
        const previous = versions.at(-1);
        if (previous) {
          picture!.src = previous.src;
          picture!.dataset.imageVersionId = previous.id;
        } else {
          picture!.removeAttribute('src');
          delete picture!.dataset.imageGenerationComplete;
          delete picture!.dataset.imageVersionId;
        }
        save();
        panel.hidden = true;
      });
      panelButton('取消', () => {
        panel.hidden = true;
      });
    },
    true,
  );
  action(
    '编辑提示词',
    'pen',
    () => {
      showPanel('提示词与生图接口');
      const select = owner.createElement('select');
      select.setAttribute('aria-label', '生图接口');
      const settings = normalizeImageGenerationSettings(getSettings().image_generation);
      const choices = [
        ['', '使用全局设置'],
        ['gpt_image', 'GPT Image'],
        ...settings.presets.map(p => [`novelai:${p.id}`, `NovelAI · ${p.name}`]),
      ];
      choices.forEach(([value, label]) => {
        const option = owner.createElement('option');
        option.value = value;
        option.textContent = label;
        select.append(option);
      });
      select.value = picture!.dataset.imageProvider || '';
      panel.append(select);
      const input = (label: string, value: string, max: number) => {
        const wrap = owner.createElement('label');
        wrap.textContent = label;
        const field = owner.createElement('textarea');
        field.rows = 4;
        field.maxLength = max;
        field.value = value;
        wrap.append(field);
        panel.append(wrap);
        return field;
      };
      const prompt = input('画面提示词', picture!.dataset.imagePrompt || '', 12000);
      const negative = input('负面提示词（NovelAI）', picture!.dataset.imageNegativePrompt || '', 12000);
      panelButton('保存修改', () => {
        ensure();
        picture!.dataset.imagePrompt = prompt.value.trim();
        picture!.dataset.imageNegativePrompt = negative.value.trim();
        picture!.dataset.imageProvider = select.value;
        save();
        panel.hidden = true;
      });
    },
    true,
  );
  action(
    '编辑配文',
    'align-left',
    () => {
      showPanel('图片配文');
      const field = owner.createElement('textarea');
      field.setAttribute('aria-label', '图片配文');
      field.rows = 4;
      field.maxLength = 1000;
      field.value = picture!.dataset.imageCaption || '';
      panel.append(field);
      panelButton('保存配文', () => {
        ensure();
        picture!.dataset.imageCaption = field.value;
        save();
        panel.hidden = true;
      });
    },
    true,
  );
  action(
    '历史版本',
    'layer-group',
    () => {
      showPanel('历史版本');
      const versions = getLoreFrameImageVersions(picture!);
      if (!versions.length) {
        panel.textContent = '暂无历史版本';
        return;
      }
      versions.forEach((version, index) =>
        panelButton(
          `版本 ${index + 1}${version.created_at ? ' · ' + new Date(version.created_at).toLocaleString() : ''}`,
          () => {
            ensure();
            picture!.src = version.src;
            picture!.dataset.imageVersionId = version.id;
            picture!.dataset.imageGenerationComplete = 'true';
            picture!.dataset.imageVersions = JSON.stringify(versions);
            save();
            panel.hidden = true;
          },
        ),
      );
    },
    true,
  );
  action('关闭大图', 'xmark', close);
  refresh();
  dialog.showModal();
}
