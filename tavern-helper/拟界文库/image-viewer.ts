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
function openLoreFrameImageControls(owner: Document, asset_index = 0) {
  owner.querySelector('[data-loreframe-image-controls]')?.remove();
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
  const dialog = owner.createElement('section');
  dialog.dataset.loreframeImageControls = 'true';
  dialog.setAttribute('aria-label', '图片生成与编辑');
  dialog.dataset.jobKey = job_key;
  dialog.style.cssText = 'box-sizing:border-box;width:100%;min-width:0;flex:none;border:1px solid var(--panel-border,#526078);border-radius:14px;background:var(--panel-bg,#18212e);color:var(--panel-text,#eef2f8);padding:12px 14px;margin-bottom:10px;container-type:inline-size;';
  dialog.innerHTML = `<style>
[data-loreframe-image-controls]{font:13px/1.45 system-ui,sans-serif}
[data-loreframe-image-controls] *{box-sizing:border-box}
[data-loreframe-image-controls] [data-controls-header]{display:flex;align-items:center;gap:12px;min-width:0}
[data-loreframe-image-controls] strong{font-size:14px;letter-spacing:.04em;white-space:nowrap}
[data-loreframe-image-controls] [data-image-select]{width:auto;min-width:90px;max-width:180px}
[data-loreframe-image-controls] button,[data-loreframe-image-controls] select{font:inherit;color:inherit;background:var(--panel-bg-soft,#263143);border:1px solid var(--panel-border,#53627a);border-radius:8px;padding:6px 10px;min-height:32px;cursor:pointer;max-width:100%;transition:background .15s,border-color .15s}
[data-loreframe-image-controls] button{display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
[data-loreframe-image-controls] button svg{width:15px;height:15px;flex:none}
[data-loreframe-image-controls] button:hover{background:color-mix(in srgb,var(--panel-accent,#8ca9da) 20%,var(--panel-bg-soft,#263143));border-color:var(--panel-accent,#8ca9da)}
[data-loreframe-image-controls] button:focus-visible,[data-loreframe-image-controls] select:focus-visible{outline:2px solid var(--panel-accent,#8ca9da);outline-offset:2px}
[data-loreframe-image-controls] button:disabled{opacity:.45;cursor:wait}
[data-loreframe-image-controls] [data-primary]{background:var(--panel-accent,#8ca9da);color:var(--panel-bg,#172130);border-color:transparent;font-weight:650}
[data-loreframe-image-controls] [data-danger]{color:#d78c91;background:transparent}
[data-loreframe-image-controls] [data-close]{margin-left:auto;width:30px;min-height:30px;padding:5px;border-color:transparent;background:transparent}
[data-loreframe-image-controls] [data-toolbar]{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}
[data-loreframe-image-controls] [data-action-group]{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
[data-loreframe-image-controls] [data-action-group]+[data-action-group]{padding-left:10px;border-left:1px solid var(--panel-border,#53627a)}
[data-loreframe-image-controls] textarea{width:100%;color:inherit;background:var(--panel-bg-soft,#172130);border:1px solid var(--panel-border,#53627a);border-radius:8px;padding:10px;font:inherit;resize:vertical}
[data-loreframe-image-controls] [data-panel]{max-height:40vh;overflow:auto;padding-top:12px;margin-top:10px;border-top:1px solid var(--panel-border,#53627a)}
[data-loreframe-image-controls] [data-panel] h3{font-size:14px;margin:0 0 10px}
[data-loreframe-image-controls] [data-panel] label{display:block;margin:10px 0}
[data-loreframe-image-controls] [data-panel]>button{margin:4px 6px 0 0}
[data-loreframe-image-controls] [data-status]:not(:empty),[data-loreframe-image-controls] [data-caption]:not(:empty){margin-top:8px;overflow-wrap:anywhere;font-size:12px;opacity:.8}
@container (max-width:420px){[data-loreframe-image-controls] [data-toolbar]{gap:8px}[data-loreframe-image-controls] [data-action-group]{width:100%;display:flex}[data-loreframe-image-controls] [data-action-group]+[data-action-group]{padding-left:0;border:0}[data-loreframe-image-controls] [data-action-group] button{flex:1;padding:6px 8px}[data-loreframe-image-controls] [data-controls-header]{gap:8px}}
</style><div data-controls-header><strong>生图编辑</strong><select data-image-select aria-label="选择图片"></select></div><div data-toolbar role="toolbar" aria-label="图片操作"><div data-action-group="generate"></div><div data-action-group="edit"></div><div data-action-group="manage"></div></div><div data-caption></div><div data-status role="status" aria-live="polite"></div><div data-panel hidden></div>`;
  const shell = owner.querySelector('.online-preview-shell');
  if (!shell) return;
  shell.before(dialog);
  const select = dialog.querySelector<HTMLSelectElement>('[data-image-select]')!;
  parsed.querySelectorAll<HTMLElement>('[data-image-asset]').forEach((item, index) => {
    const option = owner.createElement('option'); option.value = String(index);
    option.textContent = `图片 ${index + 1}${item.dataset.imageRenderMode === 'css' ? ' · CSS 绘画' : ''}`;
    select.append(option);
  });
  select.value = String(asset_index);
  select.addEventListener('change', () => openLoreFrameImageControls(owner, Number(select.value)));
  const toolbar = dialog.querySelector<HTMLElement>('[data-toolbar]')!;
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
    dialog.remove();
  };
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
    const short_labels: Record<string, string> = {
      '生成本页未完成图片': '补全本页', '生成 / 重生成此图': '生成此图',
      '下载图片': '下载', '删除当前图片版本': '删除', '编辑提示词': '提示词', '编辑配文': '配文', '历史版本': '历史',
    };
    if (label !== '收起图片操作') button.append(owner.createTextNode(short_labels[label] || label));
    if (label === '生成 / 重生成此图') button.dataset.primary = 'true';
    if (label === '删除当前图片版本') button.dataset.danger = 'true';
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
    if (label === '收起图片操作') {
      button.dataset.close = 'true'; dialog.querySelector('[data-controls-header]')!.append(button);
    } else {
      const group = label.includes('生成') ? 'generate' : ['编辑提示词', '编辑配文'].includes(label) ? 'edit' : 'manage';
      const target_group = toolbar.querySelector(`[data-action-group="${group}"]`)!;
      if (label === '生成 / 重生成此图') target_group.prepend(button); else target_group.append(button);
    }
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
    panelButton('返回操作', () => { panel.hidden = true; });
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
  action('生成本页未完成图片', 'rotate-right', async () => { close(); await generateOnlineImages(owner); }, true);
  action(
    '生成 / 重生成此图',
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
  action('收起图片操作', 'xmark', close);
  refresh();
  dialog.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}
