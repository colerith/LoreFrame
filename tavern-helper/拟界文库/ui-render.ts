type AppearanceThemeKey = keyof SettingsAppearance;
type AppearanceColorKey = keyof SettingsAppearanceTheme;
type WorldbookCatalogItem = {
  key: string;
  world: string;
  entry: Record<string, unknown>;
};
type OnlinePreviewRuntime = {
  mutation_observer?: MutationObserver | null;
  resize_observer?: ResizeObserver | null;
  sync?: (() => void) | null;
};

function getVibePreviewSource(image_data: unknown) {
  const source = String(image_data || '').trim();
  return /^(data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,|https?:\/\/|blob:)/i.test(source) ? source : '';
}

function normalizeImageAssetMarkup(html: string) {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll<HTMLElement>('[data-image-asset]').forEach((asset, index) => {
    let image = asset.querySelector<HTMLImageElement>('img');
    const prompt = String(image?.dataset.imagePrompt || asset.dataset.imagePrompt || '').trim();
    const negative_prompt = String(image?.dataset.imageNegativePrompt || asset.dataset.imageNegativePrompt || '').trim();
    if (!image) {
      image = document.createElement('img');
      asset.insertBefore(image, asset.firstChild);
    }
    image.dataset.imageAssetRendered = 'true';
    image.dataset.imagePrompt = prompt;
    image.dataset.imageNegativePrompt = negative_prompt;
    image.alt = image.alt || `剧场生图 ${index + 1}`;
    if (!image.getAttribute('src')) {
      const label = prompt ? '生图提示词已识别' : '生图占位图';
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#edf2ef"/><text x="48" y="300" fill="#567064" font-size="34" font-family="system-ui,sans-serif">${label}</text></svg>`)}`;
    }
    if (!asset.querySelector('[data-image-generation-status]')) {
      const status = document.createElement('figcaption');
      status.dataset.imageGenerationStatus = 'true';
      status.style.cssText = 'padding:8px 10px;color:#567064;font:12px/1.5 system-ui,sans-serif;background:rgba(237,242,239,.92);';
      status.textContent = prompt ? `生图提示词已识别：${prompt.slice(0, 96)}${prompt.length > 96 ? '…' : ''}` : '生图资源已识别';
      asset.appendChild(status);
    }
  });
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

function getOnlinePreviewRuntime(preview: HTMLIFrameElement): OnlinePreviewRuntime {
  const runtime = preview as HTMLIFrameElement & { __onlinePreviewRuntime__?: OnlinePreviewRuntime };
  if (!runtime.__onlinePreviewRuntime__) {
    runtime.__onlinePreviewRuntime__ = {};
  }
  return runtime.__onlinePreviewRuntime__;
}

function cleanupOnlinePreviewRuntime(preview: HTMLIFrameElement) {
  const runtime = getOnlinePreviewRuntime(preview);
  runtime.mutation_observer?.disconnect?.();
  runtime.resize_observer?.disconnect?.();
  runtime.mutation_observer = null;
  runtime.resize_observer = null;
  runtime.sync = null;
}

function syncOnlinePreviewShell(preview: HTMLIFrameElement) {
  const shell = preview.closest<HTMLElement>('.online-preview-shell');
  const preview_document = preview.contentDocument;
  if (!shell || !preview_document?.documentElement || !preview_document.body) {
    return;
  }
  const doc = preview_document.documentElement;
  const body = preview_document.body;
  const content_height = Math.max(
    doc.scrollHeight,
    body.scrollHeight,
    doc.offsetHeight,
    body.offsetHeight,
    shell.clientHeight || 0,
    120,
  );
  const shell_width = Math.max(shell.clientWidth || preview.clientWidth || 0, 1);
  preview.style.width = `${shell_width}px`;
  preview.style.minWidth = '100%';
  preview.style.maxWidth = '100%';
  preview.style.height = `${content_height}px`;
}

function bindOnlinePreviewShell(preview: HTMLIFrameElement) {
  cleanupOnlinePreviewRuntime(preview);
  const runtime = getOnlinePreviewRuntime(preview);
  const sync = () => syncOnlinePreviewShell(preview);
  runtime.sync = sync;
  preview.addEventListener(
    'load',
    () => {
      sync();
      const preview_document = preview.contentDocument;
      if (!preview_document?.documentElement) {
        return;
      }
      if (typeof ResizeObserver !== 'undefined') {
        runtime.resize_observer = new ResizeObserver(() => sync());
        runtime.resize_observer.observe(preview_document.documentElement);
        if (preview_document.body) {
          runtime.resize_observer.observe(preview_document.body);
        }
      }
      if (typeof MutationObserver !== 'undefined') {
        runtime.mutation_observer = new MutationObserver(() => sync());
        runtime.mutation_observer.observe(preview_document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }
      preview.contentWindow?.addEventListener?.('resize', sync);
      host_window.setTimeout(sync, 0);
      host_window.setTimeout(sync, 120);
      host_window.setTimeout(sync, 360);
    },
    { once: true },
  );
}

function renderAppearanceSettings(iframe_document: Document) {
  const settings = getSettings();
  const labels: Record<AppearanceColorKey, string> = {
    panel_bg: '主背景',
    panel_bg_soft: '分区背景',
    popup_bg: '弹窗颜色',
    panel_text: '主文字',
    panel_muted: '辅助文字',
    panel_accent: '强调色',
    panel_accent_strong: '强调文字',
    bubble_bg: '悬浮球',
  };
  const hints: Record<AppearanceColorKey, string> = {
    panel_bg: '面板底色',
    panel_bg_soft: '标题栏/侧栏',
    popup_bg: 'Toast / 确认弹窗',
    panel_text: '正文与按钮',
    panel_muted: '说明文字',
    panel_accent: '开关/高亮',
    panel_accent_strong: '重要数字',
    bubble_bg: '小球颜色',
  };
  (['day', 'night'] as AppearanceThemeKey[]).forEach(theme => {
    const list = iframe_document.querySelector<HTMLElement>(`[data-appearance-color-list="${theme}"]`);
    if (!list) {
      return;
    }
    const colors = normalizeAppearanceSettings(settings.appearance)[theme];
    list.innerHTML = (Object.entries(labels) as Array<[AppearanceColorKey, string]>)
      .map(
        ([key, label]) => `
          <label class="appearance-color-field">
            <input type="color" data-appearance-color data-appearance-theme="${theme}" data-appearance-key="${key}" value="${escapeHtml(colors[key])}" />
            <span>
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(hints[key] || key)}</span>
            </span>
          </label>
        `,
      )
      .join('');
  });
}
function renderPromptSettings(iframe_document: Document) {
  renderAppearanceSettings(iframe_document);
  const settings = getSettings();
  const published_prompt_ids = new Set(getPublishedPromptPresets().map(prompt => prompt.id));
  const published_base_prompt_ids = new Set(getPublishedBasePromptItems().map(prompt => prompt.id));
  const published_detail_prompt_ids = new Set(getPublishedDetailPromptItems().map(prompt => prompt.id));
  const published_summary_tag_ids = new Set(getPublishedSummaryTagPresets().map(tag => tag.id));
  const builtin_prompt_ids = new Set(['preset-rich-content-modern', 'preset-mobile-private-space']);
  const builtin_base_prompt_ids = new Set([
    'base-light-page',
    'base-rich-content-page',
    'base-strong-interactive-page',
    'base-mobile-app-page',
  ]);
  const builtin_detail_prompt_ids = new Set([
    'detail-modern-digital-media',
    'detail-mobile-private-space',
    'detail-paper-physical-media',
    'detail-private-handwriting',
    'detail-video-visual-media',
    'detail-classical-oriental',
    'detail-western-fantasy',
  ]);
  const builtin_summary_tag_ids = new Set(['summary-meow-fm', 'summary-sodom']);
  const get_prompt_prefix = (prompt: SettingsPromptPresetRuntime) =>
    published_prompt_ids.has(prompt.id) || prompt.source === 'published'
      ? '[已发布] '
      : !builtin_prompt_ids.has(prompt.id) && prompt.source === 'personal'
        ? '[本地] '
        : '';
  const select = iframe_document.querySelector<HTMLSelectElement>('[data-prompt-select]');
  if (select) {
    select.innerHTML = settings.prompts
      .map(
        prompt =>
          `<option value="${escapeHtml(prompt.id)}">${get_prompt_prefix(prompt)}${escapeHtml(prompt.name)}</option>`,
      )
      .join('');
    select.value = settings.active_prompt_id;
  }
  const prompt_menu = iframe_document.querySelector<HTMLElement>('[data-prompt-menu]');
  if (prompt_menu) {
    prompt_menu.innerHTML = settings.prompts
      .map(
        prompt =>
          '<button class="model-combobox__option ' +
          (prompt.id === settings.active_prompt_id ? 'is-active' : '') +
          '" type="button" data-prompt-option="' +
          escapeHtml(prompt.id) +
          '">' +
          get_prompt_prefix(prompt) +
          escapeHtml(prompt.name) +
          '</button>',
      )
      .join('');
    prompt_menu.hidden = true;
  }

  const active_base_prompt =
    settings.base_prompts.find(prompt => prompt.id === settings.active_base_prompt_id) || settings.base_prompts[0];
  const active_detail_prompt =
    settings.detail_prompts.find(prompt => prompt.id === settings.active_detail_prompt_id) ||
    settings.detail_prompts[0];
  const active_summary_tag =
    settings.summary_tags.find(tag => tag.id === settings.active_summary_tag_id) || settings.summary_tags[0];
  const mobile_view_scale = iframe_document.querySelector<HTMLInputElement>('[data-mobile-view-scale]');
  if (mobile_view_scale) {
    mobile_view_scale.value = String(settings.mobile_view_scale || 0.9);
  }
  const theme_mode = iframe_document.querySelector<HTMLSelectElement>('[data-theme-mode]');
  if (theme_mode) {
    theme_mode.value = normalizeThemeMode(settings.theme_mode);
  }
  const theme_day_start = iframe_document.querySelector<HTMLInputElement>('[data-theme-day-start]');
  if (theme_day_start) {
    theme_day_start.value = normalizeThemeSchedule(settings.theme_schedule).day_start;
  }
  const theme_night_start = iframe_document.querySelector<HTMLInputElement>('[data-theme-night-start]');
  if (theme_night_start) {
    theme_night_start.value = normalizeThemeSchedule(settings.theme_schedule).night_start;
  }
  const bubble_style = normalizeBubbleStyleSettings(settings.bubble_style);
  const bubble_background_mode = iframe_document.querySelector<HTMLSelectElement>('[data-bubble-background-mode]');
  if (bubble_background_mode) {
    bubble_background_mode.value = bubble_style.background_mode;
  }
  const bubble_background_color = iframe_document.querySelector<HTMLInputElement>('[data-bubble-background-color]');
  if (bubble_background_color) {
    bubble_background_color.value = bubble_style.background_color;
  }
  const bubble_icon_color_mode = iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-color-mode]');
  if (bubble_icon_color_mode) {
    bubble_icon_color_mode.value = bubble_style.icon_color_mode;
  }
  const bubble_icon_color = iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-color]');
  if (bubble_icon_color) {
    bubble_icon_color.value = bubble_style.icon_color;
  }
  const bubble_icon_source = iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-source]');
  if (bubble_icon_source) {
    bubble_icon_source.value = bubble_style.icon_source;
  }
  const bubble_icon_value = iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-value]');
  if (bubble_icon_value) {
    bubble_icon_value.value = bubble_style.icon_value;
  }
  const bubble_icon_size_mode = iframe_document.querySelector<HTMLSelectElement>('[data-bubble-icon-size-mode]');
  if (bubble_icon_size_mode) {
    bubble_icon_size_mode.value = bubble_style.icon_size_mode;
  }
  const bubble_icon_size_em = iframe_document.querySelector<HTMLInputElement>('[data-bubble-icon-size-em]');
  if (bubble_icon_size_em) {
    bubble_icon_size_em.value = String(bubble_style.icon_size_em);
  }
  updateValue(
    iframe_document,
    '[data-chat-history-depth]',
    settings.chat_history_depth === '' ? '' : String(settings.chat_history_depth ?? 20),
  );
  updateValue(iframe_document, '[data-online-storage-limit-mb]', String(settings.online_storage.limit_mb));
  updateText(
    iframe_document,
    '[data-online-storage-summary]',
    getOnlineStorageSummaryText(settings.online_storage.limit_mb),
  );
  const base_select = iframe_document.querySelector<HTMLSelectElement>('[data-base-prompt-select]');
  if (base_select) {
    base_select.innerHTML = settings.base_prompts
      .map(prompt => {
        const prefix =
          published_base_prompt_ids.has(prompt.id) || prompt.source === 'published'
            ? '[已发布] '
            : !builtin_base_prompt_ids.has(prompt.id) && prompt.source === 'personal'
              ? '[本地] '
              : '';
        return `<option value="${escapeHtml(prompt.id)}">${prefix}${escapeHtml(prompt.name)}</option>`;
      })
      .join('');
    base_select.value = active_base_prompt?.id || '';
  }
  const detail_select = iframe_document.querySelector<HTMLSelectElement>('[data-detail-prompt-select]');
  const detail_library_root = iframe_document.querySelector<HTMLElement>('[data-detail-library-root]');
  const detail_folder_id =
    detail_library_root?.dataset.folderId === '__all__'
      ? '__all__'
      : detail_library_root?.dataset.folderId &&
          settings.detail_prompt_folders.some(folder => folder.id === detail_library_root.dataset.folderId)
        ? String(detail_library_root.dataset.folderId)
        : settings.detail_prompt_folders[0]?.id || '';
  console.info('[LoreFrame] renderPromptSettings 小剧场文件夹状态', {
    dataset_folder_id: detail_library_root?.dataset.folderId || '',
    resolved_folder_id: detail_folder_id,
    folder_names: settings.detail_prompt_folders.map(folder => ({ id: folder.id, name: folder.name })),
  });
  if (detail_library_root) {
    detail_library_root.dataset.folderId = detail_folder_id;
  }
  if (detail_select) {
    detail_select.innerHTML = settings.detail_prompts
      .map(prompt => {
        const prefix =
          published_detail_prompt_ids.has(prompt.id) || prompt.source === 'published'
            ? '[已发布] '
            : !builtin_detail_prompt_ids.has(prompt.id) && prompt.source === 'personal'
              ? '[本地] '
              : '';
        return `<option value="${escapeHtml(prompt.id)}">${prefix}${escapeHtml(prompt.name)}</option>`;
      })
      .join('');
  }
  const selected_prompt_in_folder = settings.detail_prompts.find(
    prompt =>
      prompt.id === detail_library_root?.dataset.selectedPromptId &&
      (detail_folder_id === '__all__' || prompt.folder_id === detail_folder_id),
  );
  const active_prompt_in_folder = settings.detail_prompts.find(
    prompt =>
      prompt.id === active_detail_prompt?.id &&
      (detail_folder_id === '__all__' || prompt.folder_id === detail_folder_id),
  );
  const first_prompt_in_folder = settings.detail_prompts.find(prompt =>
    detail_folder_id === '__all__' ? true : prompt.folder_id === detail_folder_id,
  );
  const selected_detail_prompt_id =
    selected_prompt_in_folder?.id ||
    active_prompt_in_folder?.id ||
    first_prompt_in_folder?.id ||
    '';
  if (detail_library_root) {
    detail_library_root.dataset.selectedPromptId = selected_detail_prompt_id;
  }
  const current_detail_prompt =
    settings.detail_prompts.find(prompt => prompt.id === selected_detail_prompt_id) ||
    active_prompt_in_folder ||
    active_detail_prompt ||
    settings.detail_prompts[0];
  if (detail_select) {
    detail_select.value = current_detail_prompt?.id || active_detail_prompt?.id || '';
  }
  const random_detail_list = iframe_document.querySelector<HTMLElement>('[data-random-detail-list]');
  if (random_detail_list) {
    const selected_random_ids = new Set(settings.random_detail_prompt?.prompt_ids || []);
    random_detail_list.innerHTML = settings.detail_prompts.length
      ? settings.detail_prompts
          .map(
            prompt => `
              <label class="random-prompt-option">
                <input type="checkbox" data-random-detail-id="${escapeHtml(prompt.id)}" ${selected_random_ids.has(prompt.id) ? 'checked' : ''} />
                <span>${escapeHtml(prompt.name)}</span>
              </label>
            `,
          )
          .join('')
      : '<p class="settings-card__note">还没有可选的小剧场。</p>';
  }
  updateText(iframe_document, '[data-detail-prompt-total]', String(settings.detail_prompts.length));
  updateText(
    iframe_document,
    '[data-detail-prompt-active]',
    String(settings.random_detail_prompt?.prompt_ids?.length || 0),
  );
  renderDetailPromptActivationHistory(iframe_document);
  const detail_selection_mode = detail_library_root?.dataset.selectionMode === 'true';
  const detail_search = String(detail_library_root?.dataset.search || '')
    .trim()
    .toLowerCase();
  const detail_sort = String(detail_library_root?.dataset.sort || 'created_desc');
  const detail_source_filter = String(detail_library_root?.dataset.sourceFilter || 'all');
  const detail_active_filter = String(detail_library_root?.dataset.activeFilter || 'all');
  const detail_tag_filter = String(detail_library_root?.dataset.tagFilter || 'all');
  const detail_selected_ids = new Set(
    String(detail_library_root?.dataset.selectedPromptIds || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean),
  );
  const manager_folder_list = iframe_document.querySelector<HTMLElement>('[data-detail-manager-folder-list]');
  iframe_document
    .querySelector<HTMLElement>('[data-detail-manager-folder-id="__all__"]')
    ?.classList.toggle('is-active', detail_folder_id === '__all__');
  if (manager_folder_list) {
    manager_folder_list.innerHTML = settings.detail_prompt_folders
      .map(folder => {
        const count = settings.detail_prompts.filter(prompt => prompt.folder_id === folder.id).length;
        return `<button class="detail-library-folder ${folder.id === detail_folder_id ? 'is-active' : ''}" type="button" data-detail-manager-folder-id="${escapeHtml(folder.id)}"><span class="detail-library-folder__label"><span>${escapeHtml(folder.name)}</span></span><small>${count}</small></button>`;
      })
      .join('');
  }
  updateText(iframe_document, '[data-detail-manager-folder-count]', `${settings.detail_prompt_folders.length} 项`);
  const manager_search = iframe_document.querySelector<HTMLInputElement>('[data-detail-manager-search]');
  if (manager_search) {
    manager_search.value = String(detail_library_root?.dataset.search || '');
  }
  const manager_sort = iframe_document.querySelector<HTMLSelectElement>('[data-detail-manager-sort]');
  if (manager_sort) {
    manager_sort.value = detail_sort;
  }
  const manager_source_filter = iframe_document.querySelector<HTMLSelectElement>('[data-detail-manager-source-filter]');
  if (manager_source_filter) {
    manager_source_filter.value = detail_source_filter;
  }
  const manager_active_filter = iframe_document.querySelector<HTMLSelectElement>('[data-detail-manager-active-filter]');
  if (manager_active_filter) {
    manager_active_filter.value = detail_active_filter;
  }
  const manager_tag_filter = iframe_document.querySelector<HTMLSelectElement>('[data-detail-manager-tag-filter]');
  if (manager_tag_filter) {
    manager_tag_filter.innerHTML =
      '<option value="all">全部标签</option>' +
      settings.detail_prompt_tags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
    manager_tag_filter.value = settings.detail_prompt_tags.includes(detail_tag_filter) ? detail_tag_filter : 'all';
  }
  const manager_folder =
    detail_folder_id === '__all__'
      ? null
      : settings.detail_prompt_folders.find(folder => folder.id === detail_folder_id) ||
        settings.detail_prompt_folders[0];
  const active_prompt_ids = new Set(settings.random_detail_prompt?.prompt_ids || []);
  const manager_prompts = settings.detail_prompts
    .filter(prompt => (detail_folder_id === '__all__' ? true : prompt.folder_id === detail_folder_id))
    .filter(prompt => (detail_source_filter === 'all' ? true : prompt.source === detail_source_filter))
    .filter(prompt =>
      detail_active_filter === 'all'
        ? true
        : detail_active_filter === 'active'
          ? active_prompt_ids.has(prompt.id)
          : !active_prompt_ids.has(prompt.id),
    )
    .filter(prompt => (detail_tag_filter === 'all' ? true : (prompt.tags || []).includes(detail_tag_filter)))
    .filter(prompt => {
      if (!detail_search) {
        return true;
      }
      const haystack = [prompt.name, prompt.description || '', ...(prompt.tags || [])].join(' ').toLowerCase();
      return haystack.includes(detail_search);
    })
    .sort((left, right) => {
      if (detail_sort === 'name_asc') {
        return String(left.name || '').localeCompare(String(right.name || ''), 'zh-CN');
      }
      const left_time = String(left.created_at || '');
      const right_time = String(right.created_at || '');
      return detail_sort === 'created_asc' ? left_time.localeCompare(right_time) : right_time.localeCompare(left_time);
    });
  console.info('[LoreFrame] renderPromptSettings 小剧场列表结果', {
    detail_folder_id,
    manager_prompt_count: manager_prompts.length,
    manager_prompt_names: manager_prompts.slice(0, 10).map(prompt => prompt.name),
  });
  updateText(iframe_document, '[data-detail-manager-folder-title]', manager_folder?.name || '全部小剧场');
  updateText(
    iframe_document,
    '[data-detail-manager-folder-summary]',
    manager_prompts.length ? `当前条件下显示 ${manager_prompts.length} 个小剧场。` : '当前条件下没有符合的小剧场。',
  );
  const tag_summary = iframe_document.querySelector<HTMLElement>('[data-detail-manager-tag-summary]');
  if (tag_summary) {
    const visible_tags = [...new Set(manager_prompts.flatMap(prompt => prompt.tags || []))];
    tag_summary.innerHTML = visible_tags.length
      ? visible_tags.map(tag => `<span class="detail-library-tag-chip">${escapeHtml(tag)}</span>`).join('')
      : '<span class="settings-card__note">当前筛选下没有可显示的标签。</span>';
  }
  const edit_prompt_id = String(detail_library_root?.dataset.editPromptId || selected_detail_prompt_id || '');
  const edit_prompt =
    settings.detail_prompts.find(prompt => prompt.id === edit_prompt_id) ||
    current_detail_prompt ||
    settings.detail_prompts[0];
  updateText(iframe_document, '[data-detail-edit-title]', edit_prompt?.name || '编辑小剧场');
  updateValue(iframe_document, '[data-detail-edit-name]', edit_prompt?.name || '');
  updateValue(iframe_document, '[data-detail-edit-description]', edit_prompt?.description || '');
  updateValue(iframe_document, '[data-detail-edit-tags]', (edit_prompt?.tags || []).join(', '));
  updateValue(iframe_document, '[data-detail-edit-content]', edit_prompt?.content || '');
  const edit_tag_suggestions = iframe_document.querySelector<HTMLElement>('[data-detail-edit-tag-suggestions]');
  if (edit_tag_suggestions) {
    const selected_tags = new Set(edit_prompt?.tags || []);
    edit_tag_suggestions.innerHTML = settings.detail_prompt_tags.length
      ? settings.detail_prompt_tags
          .map(
            tag =>
              `<button class="detail-library-tag-chip ${selected_tags.has(tag) ? 'is-active' : ''}" type="button" data-detail-edit-tag-preset="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`,
          )
          .join('')
      : '<span class="settings-card__note">还没有创建标签。</span>';
  }
  const manager_grid = iframe_document.querySelector<HTMLElement>('[data-detail-manager-card-grid]');
  if (manager_grid) {
    manager_grid.innerHTML = manager_prompts.length
      ? manager_prompts
          .map(
            prompt => `
              <article class="detail-library-card ${prompt.id === current_detail_prompt?.id ? 'is-active' : ''}">
                <div class="detail-library-card__head">
                  <button class="detail-library-card__title-button" type="button" data-detail-manager-open-prompt="${escapeHtml(prompt.id)}">
                    <strong>${escapeHtml(prompt.name)}</strong>
                    <p>${escapeHtml(prompt.description || '暂无描述')}</p>
                  </button>
                  <div class="detail-library-card__meta-actions">
                    <span class="detail-library-activation ${active_prompt_ids.has(prompt.id) ? 'is-active' : ''}">
                      ${active_prompt_ids.has(prompt.id) ? '已激活' : '未激活'}
                    </span>
                    <button class="detail-library-card__action" type="button" data-detail-manager-edit-prompt="${escapeHtml(prompt.id)}" aria-label="编辑小剧场" title="编辑小剧场">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                    <button class="detail-library-card__action is-danger" type="button" data-detail-manager-delete-prompt="${escapeHtml(prompt.id)}" aria-label="删除小剧场" title="删除小剧场">
                      <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </button>
                    <input ${detail_selection_mode ? '' : 'hidden'} type="checkbox" data-detail-manager-select-prompt="${escapeHtml(prompt.id)}" ${detail_selected_ids.has(prompt.id) ? 'checked' : ''} />
                  </div>
                </div>
                <div class="detail-library-card__meta">
                  <span>${escapeHtml(prompt.source === 'default' ? '内置' : prompt.source === 'published' ? '已上传' : '本地')}</span>
                  <span>${String((prompt.content || '').trim().length)} 字</span>
                </div>
                ${(prompt.tags || []).length ? `<div class="detail-library-filter-tags">${(prompt.tags || []).map(tag => `<span class="detail-library-tag-chip">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
              </article>
            `,
          )
          .join('')
      : `<div class="detail-library-empty">${detail_folder_id === '__all__' ? '当前筛选下还没有可显示的小剧场。' : '当前文件夹还没有小剧场。可以新建、导入，或把已有内容移动到这里。'}</div>`;
  }
  const selection_toggle = iframe_document.querySelector<HTMLElement>('[data-detail-manager-toggle-selection]');
  if (selection_toggle) {
    selection_toggle.classList.toggle('is-active', detail_selection_mode);
    selection_toggle.setAttribute('title', detail_selection_mode ? '退出选择' : '选择状态');
    selection_toggle.setAttribute('aria-label', detail_selection_mode ? '退出选择' : '选择状态');
  }
  iframe_document
    .querySelector<HTMLElement>('[data-detail-manager-bulk-actions]')
    ?.toggleAttribute('hidden', !detail_selection_mode);
  const summary_tag_select = iframe_document.querySelector<HTMLSelectElement>('[data-summary-tag-select]');
  if (summary_tag_select) {
    summary_tag_select.innerHTML = settings.summary_tags
      .map(tag => {
        const prefix =
          published_summary_tag_ids.has(tag.id) || tag.source === 'published'
            ? '[已发布] '
            : !builtin_summary_tag_ids.has(tag.id) && tag.source === 'personal'
              ? '[本地] '
              : '';
        return `<option value="${escapeHtml(tag.id)}">${prefix}${escapeHtml(tag.name)}</option>`;
      })
      .join('');
    summary_tag_select.value = active_summary_tag?.id || '';
  }
  updateValue(iframe_document, '[data-base-prompt-name]', active_base_prompt?.name || '');
  updateValue(
    iframe_document,
    '[data-detail-prompt-name]',
    current_detail_prompt?.name || active_detail_prompt?.name || '',
  );
  updateValue(iframe_document, '[data-detail-prompt-name-display]', current_detail_prompt?.name || '');
  updateValue(iframe_document, '[data-detail-prompt-description]', current_detail_prompt?.description || '');
  updateValue(iframe_document, '[data-summary-tag-name]', active_summary_tag?.name || '');
  updateValue(iframe_document, '[data-summary-open-tag]', active_summary_tag?.open_tag || '');
  updateValue(iframe_document, '[data-summary-close-tag]', active_summary_tag?.close_tag || '');
  updateValue(iframe_document, '[data-base-prompt-content]', active_base_prompt?.content || '');
  updateValue(
    iframe_document,
    '[data-detail-prompt-content]',
    current_detail_prompt?.content || active_detail_prompt?.content || '',
  );
  iframe_document.querySelector('[data-base-prompt-name]')?.setAttribute('hidden', '');
  iframe_document.querySelector('[data-detail-prompt-name]')?.setAttribute('hidden', '');
  iframe_document.querySelector('[data-detail-prompt-name-display]')?.setAttribute('readonly', '');
  iframe_document.querySelector('[data-detail-prompt-description]')?.setAttribute('readonly', '');
  iframe_document.querySelector('[data-base-prompt-content]')?.setAttribute('readonly', '');
  iframe_document.querySelector('[data-detail-prompt-content]')?.setAttribute('readonly', '');
  iframe_document.querySelector('[data-base-prompt-actions]')?.setAttribute('hidden', '');
  iframe_document.querySelector('[data-detail-prompt-actions]')?.setAttribute('hidden', '');
  iframe_document.querySelector('[data-edit-base-prompt]')?.removeAttribute('hidden');
  iframe_document.querySelector('[data-edit-detail-prompt]')?.removeAttribute('hidden');
  iframe_document.querySelector('[data-summary-tag-name]')?.setAttribute('hidden', '');
  iframe_document.querySelector('[data-summary-open-tag]')?.setAttribute('readonly', '');
  iframe_document.querySelector('[data-summary-close-tag]')?.setAttribute('readonly', '');
  iframe_document.querySelector('[data-summary-tag-actions]')?.setAttribute('hidden', '');
  iframe_document.querySelector('[data-edit-summary-tag]')?.removeAttribute('hidden');
  const secondary_provider = ['openai', 'google_ai_studio', 'vertex_ai'].includes(settings.secondary_api.provider)
    ? settings.secondary_api.provider
    : 'openai';
  const secondary_providers = settings.secondary_api.providers || {};
  const openai_api = secondary_providers.openai || {};
  const google_api = secondary_providers.google_ai_studio || {};
  const vertex_api = secondary_providers.vertex_ai || {};
  const secondary_provider_select = iframe_document.querySelector<HTMLSelectElement>('[data-secondary-api-provider]');
  if (secondary_provider_select) {
    secondary_provider_select.value = secondary_provider;
  }
  iframe_document.querySelectorAll<HTMLElement>('[data-secondary-api-provider-panel]').forEach(panel => {
    panel.hidden = panel.dataset.secondaryApiProviderPanel !== secondary_provider;
  });
  const openai_panel = iframe_document.querySelector<HTMLElement>('[data-secondary-api-provider-panel="openai"]');
  const google_panel = iframe_document.querySelector<HTMLElement>(
    '[data-secondary-api-provider-panel="google_ai_studio"]',
  );
  const vertex_panel = iframe_document.querySelector<HTMLElement>('[data-secondary-api-provider-panel="vertex_ai"]');
  if (openai_panel) {
    const url_input = openai_panel.querySelector<HTMLInputElement>('[data-secondary-api-url]');
    const key_input = openai_panel.querySelector<HTMLInputElement>('[data-secondary-api-key]');
    if (url_input) url_input.value = openai_api.apiurl || '';
    if (key_input) key_input.value = openai_api.key || '';
  }
  if (google_panel) {
    const key_input = google_panel.querySelector<HTMLInputElement>('[data-secondary-api-key]');
    const proxy_input = google_panel.querySelector<HTMLInputElement>('[data-secondary-api-url]');
    if (key_input) key_input.value = google_api.key || '';
    if (proxy_input) proxy_input.value = google_api.proxy_url || '';
  }
  if (vertex_panel) {
    const key_input = vertex_panel.querySelector<HTMLInputElement>('[data-secondary-api-key]');
    if (key_input) key_input.value = vertex_api.key || '';
  }
  updateValue(iframe_document, '[data-secondary-api-proxy-password]', google_api.proxy_password || '');
  updateValue(iframe_document, '[data-secondary-api-vertex-token]', vertex_api.vertex_token || '');
  updateValue(iframe_document, '[data-secondary-api-vertex-location]', vertex_api.vertex_location || '');
  updateValue(iframe_document, '[data-secondary-api-vertex-project-id]', vertex_api.vertex_project_id || '');
  const active_provider_config =
    secondary_provider === 'openai' ? openai_api : secondary_provider === 'google_ai_studio' ? google_api : vertex_api;
  const active_model = active_provider_config.model || settings.secondary_api.model || '';
  updateValue(iframe_document, '[data-secondary-api-model]', active_model);
  const secondary_model_menu = iframe_document.querySelector<HTMLElement>('[data-secondary-api-model-menu]');
  if (secondary_model_menu) {
    const models = [...new Set([active_model].map(model => String(model || '').trim()).filter(Boolean))];
    secondary_model_menu.innerHTML = models
      .map(
        model =>
          '<button class="model-combobox__option ' +
          (model === active_model ? 'is-active' : '') +
          '" type="button" data-secondary-api-model-option="' +
          escapeHtml(model) +
          '">' +
          escapeHtml(model) +
          '</button>',
      )
      .join('');
    secondary_model_menu.hidden = true;
  }
  setChecked(iframe_document, '[data-auto-generate]', settings.auto_generate);
  setChecked(iframe_document, '[data-random-detail-enabled]', settings.random_detail_prompt?.enabled);
  updateValue(iframe_document, '[data-random-detail-count]', String(settings.random_detail_prompt?.count || 1));
  updateValue(
    iframe_document,
    '[data-random-detail-probability]',
    String(settings.random_detail_prompt?.trigger_probability ?? 100),
  );
  setChecked(iframe_document, '[data-secondary-api-enabled]', settings.secondary_api.enabled);
  setChecked(iframe_document, '[data-generation-retry-enabled]', settings.generation_retry?.enabled);
  updateValue(
    iframe_document,
    '[data-generation-retry-timeout-ms]',
    String(settings.generation_retry?.timeout_ms ?? 360000),
  );
  updateValue(
    iframe_document,
    '[data-generation-retry-count]',
    String(settings.generation_retry?.max_retries ?? 3),
  );
  iframe_document.querySelectorAll<HTMLInputElement>('[data-launch-entry-mode]').forEach(input => {
    input.checked = settings.launch_entry_modes.includes(input.dataset.launchEntryMode as SettingsLaunchEntryMode);
  });
  updateText(
    iframe_document,
    '[data-excluded-characters-summary]',
    `已排除 ${settings.excluded_character_names.length} 个角色。`,
  );
  const excluded_character_chips = iframe_document.querySelector<HTMLElement>('[data-excluded-characters-chips]');
  if (excluded_character_chips) {
    excluded_character_chips.innerHTML = settings.excluded_character_names.length
      ? settings.excluded_character_names
          .map(name => `<span class="detail-library-tag-chip">${escapeHtml(name)}</span>`)
          .join('')
      : '<p class="settings-card__note">当前没有排除角色。</p>';
  }
  const excluded_tag_chips = iframe_document.querySelector<HTMLElement>('[data-excluded-tags-chips]');
  if (excluded_tag_chips) {
    excluded_tag_chips.innerHTML = settings.excluded_tags.length
      ? settings.excluded_tags
          .map(
            tag =>
              `<button class="detail-library-tag-chip detail-library-tag-chip--removable" type="button" data-remove-excluded-tag="${escapeHtml(tag)}" aria-label="删除排除标签 ${escapeHtml(tag)}">
                <span>&lt;${escapeHtml(tag)}&gt;</span>
                <span class="detail-library-tag-chip__remove" aria-hidden="true">×</span>
              </button>`,
          )
          .join('')
      : '<p class="settings-card__note">当前没有排除标签。</p>';
  }
  const secondary_api_profile_select = iframe_document.querySelector<HTMLSelectElement>(
    '[data-secondary-api-profile-select]',
  );
  if (secondary_api_profile_select) {
    secondary_api_profile_select.innerHTML = settings.secondary_api_profiles
      .map(
        profile =>
          '<option value="' +
          escapeHtml(profile.id) +
          '"' +
          (profile.id === settings.active_secondary_api_profile_id ? ' selected' : '') +
          '>' +
          escapeHtml(profile.name) +
          '</option>',
      )
      .join('');
  }
  updateText(
    iframe_document,
    '[data-secondary-api-profile-summary]',
    settings.secondary_api_profiles.length > 1
      ? `当前已保存 ${settings.secondary_api_profiles.length} 套第二 API 配置。`
      : '当前仅保存 1 套第二 API 配置。',
  );
  const image_generation = settings.image_generation || getDefaultImageGenerationSettings();
  const image_presets = image_generation.presets.length
    ? image_generation.presets
    : getDefaultImageGenerationSettings().presets;
  const active_image_preset =
    image_presets.find(preset => preset.id === image_generation.active_preset_id) || image_presets[0];
  const image_preset_select = iframe_document.querySelector<HTMLSelectElement>('[data-image-preset-select]');
  if (image_preset_select) {
    image_preset_select.innerHTML = image_presets
      .map(
        preset =>
          '<option value="' +
          escapeHtml(preset.id) +
          '"' +
          (preset.id === active_image_preset.id ? ' selected' : '') +
          '>' +
          escapeHtml(preset.name) +
          '</option>',
      )
      .join('');
  }
  setChecked(iframe_document, '[data-image-generation-enabled]', image_generation.enabled);
  updateValue(iframe_document, '[data-image-generation-mode]', image_generation.mode);
  updateValue(iframe_document, '[data-image-connection-mode]', active_image_preset.connection_mode);
  updateValue(iframe_document, '[data-image-endpoint]', active_image_preset.endpoint);
  updateValue(iframe_document, '[data-image-api-key]', active_image_preset.api_key);
  updateValue(iframe_document, '[data-image-positive-prompt]', active_image_preset.positive_prompt);
  updateValue(iframe_document, '[data-image-negative-prompt]', active_image_preset.negative_prompt);
  const prompt_reference_list = iframe_document.querySelector<HTMLElement>('[data-image-prompt-reference-list]');
  if (prompt_reference_list) {
    prompt_reference_list.innerHTML = active_image_preset.prompt_references.length
      ? active_image_preset.prompt_references.slice(-1)
          .map(reference => {
            const preview_source = getVibePreviewSource(reference.image_data);
            return `<article class="prompt-reference-card">
              ${preview_source ? `<img src="${escapeHtml(preview_source)}" alt="${escapeHtml(reference.name)}" loading="lazy" />` : '<div class="vibe-reference-card__preview">无法预览</div>'}
              <div class="prompt-reference-card__meta" title="${escapeHtml(reference.name)}">${escapeHtml(reference.name)}${reference.metadata_prompt || reference.metadata_negative_prompt ? ' · 已解析' : ''}</div>
            </article>`;
          })
          .join('')
      : '<p class="settings-card__note">还没有导入提示词参考图。</p>';
  }
  for (const [selector, value] of [
    ['[data-image-model-select]', active_image_preset.model],
    ['[data-image-sampler]', active_image_preset.sampler],
    ['[data-image-noise-schedule]', active_image_preset.noise_schedule],
    ['[data-image-size-preset]', active_image_preset.size_preset],
  ]) {
    const select = iframe_document.querySelector<HTMLSelectElement>(selector);
    if (select && !Array.from(select.options).some(option => option.value === value)) {
      const option = iframe_document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    }
  }
  updateValue(iframe_document, '[data-image-model]', active_image_preset.model);
  updateValue(iframe_document, '[data-image-model-select]', active_image_preset.model);
  updateValue(iframe_document, '[data-image-sampler]', active_image_preset.sampler);
  updateValue(iframe_document, '[data-image-noise-schedule]', active_image_preset.noise_schedule);
  updateValue(iframe_document, '[data-image-guidance]', String(active_image_preset.prompt_guidance));
  updateValue(iframe_document, '[data-image-guidance-rescale]', String(active_image_preset.prompt_guidance_rescale));
  updateValue(iframe_document, '[data-image-size-preset]', active_image_preset.size_preset);
  updateValue(iframe_document, '[data-image-steps]', String(active_image_preset.steps));
  updateValue(iframe_document, '[data-image-seed]', String(active_image_preset.seed));
  setChecked(
    iframe_document,
    '[data-image-ai-default-character-position]',
    active_image_preset.ai_default_character_position,
  );
  setChecked(iframe_document, '[data-image-smea]', active_image_preset.smea);
  setChecked(iframe_document, '[data-image-smea-dyn]', active_image_preset.smea_dyn);
  setChecked(iframe_document, '[data-image-variety]', active_image_preset.variety);
  setChecked(iframe_document, '[data-image-decrisp]', active_image_preset.decrisp);
  const image_endpoint_field = iframe_document.querySelector<HTMLElement>('[data-image-custom-endpoint-field]');
  if (image_endpoint_field) {
    image_endpoint_field.hidden = active_image_preset.connection_mode !== 'custom';
  }

  const vibe_groups = image_generation.vibe_groups.length
    ? image_generation.vibe_groups
    : getDefaultImageGenerationSettings().vibe_groups;
  const active_vibe_group =
    vibe_groups.find(group => group.id === image_generation.active_vibe_group_id) || vibe_groups[0];
  const vibe_group_select = iframe_document.querySelector<HTMLSelectElement>('[data-vibe-group-select]');
  if (vibe_group_select) {
    vibe_group_select.innerHTML = vibe_groups
      .map(
        group =>
          '<option value="' +
          escapeHtml(group.id) +
          '"' +
          (group.id === active_vibe_group.id ? ' selected' : '') +
          '>' +
          escapeHtml(group.name) +
          '</option>',
      )
      .join('');
  }
  const vibe_reference_list = iframe_document.querySelector<HTMLElement>('[data-vibe-reference-list]');
  if (vibe_reference_list) {
    vibe_reference_list.innerHTML = active_vibe_group.references.length
      ? active_vibe_group.references
          .map(
            reference => {
              const preview_source = getVibePreviewSource(reference.image_data);
              const preview = preview_source
                ? `<img src="${escapeHtml(preview_source)}" alt="${escapeHtml(reference.name)}" loading="lazy" />`
                : `<span>${reference.source === 'naiv4vibe' ? 'Vibe 编码<br />不含原图' : '暂无预览'}</span>`;
              return `<article class="vibe-reference-card" data-vibe-reference-id="${escapeHtml(reference.id)}">
                <div class="vibe-reference-card__preview">${preview}</div>
                <div class="vibe-reference-card__meta">
                  <div class="vibe-reference-card__name-row">
                    <strong class="vibe-reference-card__name" title="${escapeHtml(reference.name)}">${escapeHtml(reference.name)}</strong>
                    <button class="vibe-reference-card__rename" type="button" data-rename-vibe-reference="${escapeHtml(reference.id)}" aria-label="重命名 ${escapeHtml(reference.name)}" title="重命名备注"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                  </div>
                  <span class="vibe-reference-card__source">${reference.source === 'naiv4vibe' ? 'naiv4vibe 编码' : '上传参考图'}</span>
                  ${reference.metadata_prompt || reference.metadata_negative_prompt ? '<span class="vibe-reference-card__source">已解析提示词元数据</span>' : ''}
                  <label class="vibe-reference-card__strength">
                    <span>强度</span>
                    <input type="range" min="0" max="1" step="0.01" value="${String(reference.strength)}" data-vibe-strength-reference="${escapeHtml(reference.id)}" aria-label="${escapeHtml(reference.name)}画风强度" />
                    <input class="input" type="number" min="0" max="1" step="0.01" value="${String(reference.strength)}" data-vibe-strength-number="${escapeHtml(reference.id)}" aria-label="${escapeHtml(reference.name)}画风强度数值" />
                  </label>
                </div>
                <button class="vibe-reference-card__remove" type="button" data-remove-vibe-reference="${escapeHtml(reference.id)}" aria-label="删除参考图 ${escapeHtml(reference.name)}" title="删除参考图">×</button>
              </article>`;
            },
          )
          .join('')
      : '<p class="settings-card__note">当前 Vibe 组没有参考图。</p>';
  }
  const vibe_library = image_generation.vibe_library || [];
  const vibe_library_list = iframe_document.querySelector<HTMLElement>('[data-vibe-library-list]');
  const vibe_library_summary = iframe_document.querySelector<HTMLElement>('[data-vibe-library-summary]');
  const vibe_library_page_label = iframe_document.querySelector<HTMLElement>('[data-vibe-library-page]');
  const vibe_library_prev = iframe_document.querySelector<HTMLButtonElement>('[data-vibe-library-prev]');
  const vibe_library_next = iframe_document.querySelector<HTMLButtonElement>('[data-vibe-library-next]');
  if (vibe_library_list) {
    const page_size = 8;
    const page_count = Math.max(1, Math.ceil(vibe_library.length / page_size));
    const requested_page = Number(vibe_library_list.dataset.page || 0);
    const page = Math.min(page_count - 1, Math.max(0, Number.isFinite(requested_page) ? requested_page : 0));
    vibe_library_list.dataset.page = String(page);
    const visible_vibes = vibe_library.slice(page * page_size, (page + 1) * page_size);
    const active_ids = new Set(active_vibe_group.references.map(reference => reference.id));
    vibe_library_list.innerHTML = visible_vibes.length
      ? visible_vibes.map(reference => {
          const preview_source = getVibePreviewSource(reference.image_data);
          return `<article class="vibe-library-card">
            <div class="vibe-reference-card__preview">${preview_source ? `<img src="${escapeHtml(preview_source)}" alt="${escapeHtml(reference.name)}" loading="lazy" />` : `<span>${reference.source === 'naiv4vibe' ? 'Vibe 编码<br />不含原图' : '暂无预览'}</span>`}</div>
            <strong class="vibe-library-card__name" title="${escapeHtml(reference.name)}">${escapeHtml(reference.name)}</strong>
            <button class="plain-button" type="button" data-add-vibe-to-group="${escapeHtml(reference.id)}" ${active_ids.has(reference.id) ? 'disabled' : ''}>${active_ids.has(reference.id) ? '已在当前组' : '加入当前组'}</button>
          </article>`;
        }).join('')
      : '<p class="settings-card__note">Vibe 库还是空的，请先上传 Vibe 文件或参考图。</p>';
    if (vibe_library_summary) vibe_library_summary.textContent = `共 ${vibe_library.length} 个 Vibe`;
    if (vibe_library_page_label) vibe_library_page_label.textContent = `第 ${page + 1} / ${page_count} 页`;
    if (vibe_library_prev) vibe_library_prev.disabled = page <= 0;
    if (vibe_library_next) vibe_library_next.disabled = page >= page_count - 1;
  }
  const image_generation_active =
    image_generation.enabled && image_generation.mode === 'novelai' && Boolean(active_image_preset?.id);
  updateText(
    iframe_document,
    '[data-image-generation-detail]',
    image_generation_active
      ? `已激活 NovelAI；当前预设：${active_image_preset.name}；Vibe 组：${active_vibe_group.name}。`
      : image_generation.enabled
        ? '生图开关已打开，但尚未满足“生图方法 + 有效配置”激活条件。'
        : '生图思考注入已关闭。',
  );
  updateText(iframe_document, '[data-dirty-status]', '');
  const publish_toggle = iframe_document.querySelector<HTMLElement>('[data-toggle-publish-prompt]');
  if (publish_toggle) {
    const is_published = false;
    publish_toggle.title = is_published ? '取消发布此预设' : '发布此预设';
    publish_toggle.setAttribute('aria-label', publish_toggle.title);
    publish_toggle.classList.toggle('is-active', is_published);
  }
  const base_publish_toggle = iframe_document.querySelector<HTMLElement>('[data-toggle-publish-base-prompt]');
  if (base_publish_toggle) {
    const is_published = published_base_prompt_ids.has(active_base_prompt?.id);
    base_publish_toggle.title = is_published ? '取消发布基础提示词' : '发布基础提示词';
    base_publish_toggle.setAttribute('aria-label', base_publish_toggle.title);
    base_publish_toggle.classList.toggle('is-active', is_published);
  }
  const detail_publish_toggle = iframe_document.querySelector<HTMLElement>('[data-toggle-publish-detail-prompt]');
  if (detail_publish_toggle) {
    const is_published = published_detail_prompt_ids.has(active_detail_prompt?.id);
    detail_publish_toggle.title = is_published ? '取消发布小剧场' : '发布小剧场';
    detail_publish_toggle.setAttribute('aria-label', detail_publish_toggle.title);
    detail_publish_toggle.classList.toggle('is-active', is_published);
  }
  const summary_publish_toggle = iframe_document.querySelector<HTMLElement>('[data-toggle-publish-summary-tag]');
  if (summary_publish_toggle) {
    const is_published = published_summary_tag_ids.has(active_summary_tag?.id);
    summary_publish_toggle.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>';
    summary_publish_toggle.title = is_published ? '取消发布摘要标签' : '发布摘要标签';
    summary_publish_toggle.setAttribute('aria-label', summary_publish_toggle.title);
    summary_publish_toggle.classList.toggle('is-active', is_published);
  }
  updateText(
    iframe_document,
    '[data-runtime-settings-detail]',
    '用于调整阅读器显示、本地缓存、摘要标签、第二 API 与脚本操作。',
  );
  updateText(iframe_document, '[data-prompt-settings-detail]', '用于管理基础提示词、小剧场内容与生成设置。');
}

function renderOnlineContent(iframe_document: Document) {
  const online_data = getCurrentOnlineData();
  const chat_id = getCurrentChatStorageLabel();
  const active_entry = online_data.active_entry;
  const active_variant = getEntryActiveVariant(active_entry);
  const resolved_html = String(active_entry?.html || active_variant?.html || online_data.html || '');
  const resolved_memory_text = String(
    active_entry?.memory_text || active_variant?.memory_text || online_data.memory_text || '',
  );
  const resolved_prompt_name = String(active_entry?.prompt_name || active_variant?.prompt_name || online_data.prompt_name || '');
  const resolved_detail_prompt_name = String(
    active_entry?.detail_prompt_name || active_variant?.detail_prompt_name || online_data.detail_prompt_name || '',
  );
  const resolved_updated_at =
    active_entry?.updated_at || active_variant?.updated_at || online_data.updated_at || '';
  const resolved_title = String(
    active_entry?.title ||
      active_variant?.title ||
      extractOnlineTitle({ html: resolved_html }) ||
      online_data.active_entry?.title ||
      online_data.active_entry?.id ||
      '当前聊天还没有页面',
  );
  const current_scope = getCurrentOnlineScopeInfo();
  updateText(iframe_document, '[data-current-chat-id]', chat_id);
  updateText(iframe_document, '[data-current-character-title]', current_scope.character_name || '当前角色');
  updateText(
    iframe_document,
    '[data-online-updated-at]',
    resolved_updated_at ? formatTime(new Date(resolved_updated_at)) : '尚未生成',
  );
  updateText(iframe_document, '[data-online-prompt-name]', resolved_prompt_name || '尚未生成');
  updateText(
    iframe_document,
    '[data-online-memory-preview]',
    resolved_memory_text ? trimPreview(resolved_memory_text) : '当前聊天还没有页面正文记忆。',
  );
  const online_title = resolved_title;
  updateText(iframe_document, '[data-online-title-display]', online_title);
  const detail_badge = iframe_document.querySelector<HTMLElement>('[data-online-detail-badge]');
  if (detail_badge) {
    const detail_prompt_name = resolved_detail_prompt_name.trim();
    detail_badge.textContent = detail_prompt_name ? `本回合小剧场：${detail_prompt_name}` : '';
    detail_badge.hidden = !detail_prompt_name;
  }
  updateValue(iframe_document, '[data-online-title-input]', online_title);
  iframe_document.querySelector('[data-online-title-display]')?.removeAttribute('hidden');
  iframe_document.querySelector('[data-online-title-input]')?.setAttribute('hidden', '');
  iframe_document.querySelector('[data-toolbar-menu]')?.classList.remove('is-open');
  iframe_document.querySelector('[data-toolbar-more]')?.setAttribute('aria-expanded', 'false');
  iframe_document.querySelector('[data-edit-online-code]')?.setAttribute('aria-expanded', 'false');
  const favorite_button = iframe_document.querySelector<HTMLElement>('[data-toggle-favorite]');
  if (favorite_button) {
    favorite_button.classList.toggle('is-active', Boolean(active_entry?.favorite));
    favorite_button.title = active_entry?.favorite ? '取消收藏' : '收藏';
    favorite_button.setAttribute('aria-label', active_entry?.favorite ? '取消收藏' : '收藏');
  }
  const fullscreen_button = iframe_document.querySelector<HTMLElement>('[data-toggle-panel-fullscreen]');
  if (fullscreen_button) {
    const is_force_fullscreen = isPanelForceFullscreenViewport();
    const is_fullscreen_active = panel_fullscreen || is_force_fullscreen;
    fullscreen_button.classList.toggle('is-active', is_fullscreen_active);
    fullscreen_button.title = is_force_fullscreen ? '当前宽度已强制全屏' : panel_fullscreen ? '退出全屏' : '全屏显示';
    fullscreen_button.setAttribute(
      'aria-label',
      is_force_fullscreen ? '当前宽度已强制全屏' : panel_fullscreen ? '退出全屏' : '全屏显示',
    );
    fullscreen_button.innerHTML = is_fullscreen_active
      ? '<i class="fa-solid fa-compress" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-expand" aria-hidden="true"></i>';
  }
  const source_swipe_matches =
    active_entry &&
    active_variant &&
    Number(active_variant.source_swipe_id || 0) === Number(getCurrentMessageSwipeId(active_entry.message_id));
  const source_button = iframe_document.querySelector<HTMLElement>('[data-scroll-source-message]');
  const mobile_source_button = iframe_document.querySelector<HTMLElement>('[data-scroll-source-message-mobile]');
  [source_button, mobile_source_button].forEach(button => {
    if (!button) {
      return;
    }
    button.hidden = !active_entry;
    button.title = source_swipe_matches ? '当前页面对应正在使用的酒馆楼层' : '跳转到原始酒馆楼层';
    button.setAttribute('aria-label', source_swipe_matches ? '当前页面对应正在使用的酒馆楼层' : '跳转到原始酒馆楼层');
  });
  const active_variant_index = active_entry?.variants?.findIndex(
    variant => variant.id === active_entry.active_variant_id,
  );
  updateHtml(
    iframe_document,
    '[data-online-version-label]',
    active_entry?.variants?.length
      ? `${source_swipe_matches ? '<i class="fa-solid fa-map-pin" aria-hidden="true"></i> ' : ''}${Math.max(0, active_variant_index ?? 0) + 1}/${active_entry.variants.length}`
      : '0/0',
  );
  updateValue(iframe_document, '[data-online-code-editor]', resolved_html);
  const editor_panel = iframe_document.querySelector('[data-code-editor-panel]');
  editor_panel?.setAttribute('hidden', '');
  editor_panel?.setAttribute('data-editor-mode', 'html');
  updateText(iframe_document, '[data-code-editor-title]', '编辑代码');
  updateText(iframe_document, '[data-code-editor-hint]', '修改 HTML 后保存，会自动重新提取正文记忆。');

  const sorted_entries = [...online_data.entries].sort((left, right) =>
    String(right.updated_at || '').localeCompare(String(left.updated_at || '')),
  );
  const render_record_button = (entry: OnlineEntry) => `
      <button class="online-nav__item ${entry.id === online_data.active_entry_id ? 'is-active' : ''}" type="button" data-online-entry-id="${escapeHtml(entry.id)}">
        <span>${escapeHtml(entry.title || `页面 @ 楼层 ${entry.message_id}`)}</span>
        <small>楼层 ${escapeHtml(entry.message_id ?? '?')} · ${Math.max(0, entry.variants?.findIndex(variant => variant.id === entry.active_variant_id) ?? 0) + 1}/${entry.variants?.length || 1}</small>
      </button>
    `;
  const bind_record_buttons = (list: Element) => {
    list.querySelectorAll<HTMLElement>('[data-online-entry-id]').forEach(button => {
      button.addEventListener('click', () => {
        setActiveOnlineEntry(button.dataset.onlineEntryId || '');
        renderOnlineContent(iframe_document);
        switchMainView(iframe_document, 'online');
      });
    });
  };

  const favorite_list = iframe_document.querySelector<HTMLElement>('[data-online-favorite-list]');
  if (favorite_list) {
    const favorite_entries = sorted_entries.filter(entry => entry.favorite);
    favorite_list.innerHTML = favorite_entries.length
      ? favorite_entries.map(render_record_button).join('')
      : '<p class="online-sidebar__label">还没有收藏页面。</p>';
    bind_record_buttons(favorite_list);
  }

  const record_list = iframe_document.querySelector<HTMLElement>('[data-online-record-list]');
  if (record_list) {
    record_list.innerHTML = sorted_entries.length
      ? sorted_entries.map(render_record_button).join('')
      : '<p class="online-sidebar__label">当前聊天还没有生成记录。</p>';
    bind_record_buttons(record_list);
  }

  const preview = iframe_document.querySelector<HTMLIFrameElement>('[data-online-preview]');
  if (preview) {
    bindOnlinePreviewShell(preview);
    const image_generation_trigger = iframe_document.querySelector<HTMLElement>('[data-trigger-image-generation]');
    if (image_generation_trigger) {
      image_generation_trigger.hidden = !resolved_html.includes('data-image-asset');
    }
    if (resolved_html) {
      const normalized_html = normalizeImageAssetMarkup(resolved_html);
      preview.srcdoc = applyMobileViewScaleToHtml(normalized_html, getSettings().mobile_view_scale);
    } else {
      const empty_theme =
        normalizeAppearanceSettings(getSettings().appearance)[getSavedTheme() as AppearanceThemeKey] || {};
      const empty_bg = empty_theme.panel_bg || '#f7f8f5';
      const empty_text = empty_theme.panel_text || '#18211d';
      const empty_muted = empty_theme.panel_muted || 'rgba(24,33,29,.68)';
      preview.srcdoc = `
          <!doctype html>
          <html lang="zh-CN">
            <meta charset="utf-8">
            <body style="margin:0;font-family:system-ui,sans-serif;background:${escapeHtml(empty_bg)};color:${escapeHtml(empty_text)};display:grid;place-items:center;min-height:100vh;">
              <main style="max-width:520px;padding:24px;text-align:center;">
                <h1 style="font-size:20px;margin:0 0 10px;">当前聊天还没有页面</h1>
                <p style="font-size:14px;line-height:1.7;margin:0;color:${escapeHtml(empty_muted)};">在“基础设置”里确认提示词后，正文回复结束会自动生成页面；也可以对已有记录重新生成候选页。</p>
              </main>
            </body>
          </html>
        `;
    }
  }
  renderSourceJumpButtons();
}

function renderWorldbookEntryControls(iframe_document: Document | null = current_iframe_document) {
  const list = iframe_document?.querySelector?.('[data-worldbook-entry-controls]');
  if (!list) {
    return;
  }
  const settings = getSettings();
  const catalog = latest_worldbook_entry_catalog as WorldbookCatalogItem[];
  list.innerHTML = catalog.length
    ? catalog
        .map(item => {
          const mode = getWorldbookEntryScriptMode(settings, item.world, item.entry);
          const strategy = isConstantWorldbookEntry(item.entry)
            ? '蓝灯'
            : isSelectiveWorldbookEntry(item.entry)
              ? `绿灯 · ${summarizeWorldbookEntryKeys(item.entry)}`
              : '其他';
          const included = mode === 'native' || mode === 'included';
          const state_label =
            mode === 'excluded'
              ? '已排除'
              : mode === 'included'
                ? '额外纳入'
                : mode === 'native'
                  ? '跟随酒馆'
                  : '酒馆未启用';
          return `
              <article class="worldbook-entry-row">
                <div class="worldbook-entry-main">
                  <strong>${escapeHtml(getWorldbookEntryName(item.entry))}</strong>
                  <p>${escapeHtml(item.world)} · ${escapeHtml(strategy)} · ${escapeHtml(state_label)}</p>
                </div>
                <label class="worldbook-switch" title="${included ? '点击后排除该条目' : '点击后纳入该条目'}">
                  <input type="checkbox" data-worldbook-entry-toggle="${escapeHtml(item.key)}" ${included ? 'checked' : ''} />
                  <span aria-hidden="true"></span>
                </label>
              </article>
            `;
        })
        .join('')
    : '<p class="debug-row__value">尚未读取到绑定世界书条目。</p>';

  list.querySelectorAll<HTMLInputElement>('[data-worldbook-entry-toggle]').forEach(input => {
    input.addEventListener('change', () => {
      updateWorldbookEntryOverride(
        input.dataset.worldbookEntryToggle || '',
        input.checked ? 'include' : 'exclude',
        iframe_document,
      );
    });
  });
}
function updateWorldbookEntryOverride(
  entry_key: string,
  override: SettingsWorldbookOverrideValue | undefined,
  iframe_document: Document | null = current_iframe_document,
) {
  if (!entry_key) {
    return;
  }
  const settings = getSettings();
  const next_overrides = { ...(settings.worldbook_entry_overrides || {}) };
  if (override) {
    next_overrides[entry_key] = override;
  } else {
    delete next_overrides[entry_key];
  }
  saveSettings({
    ...settings,
    worldbook_entry_overrides: next_overrides,
  });
  if (iframe_document) {
    renderWorldbookEntryControls(iframe_document);
  }
  if (iframe_document) {
    collectSourceDebugSnapshot(iframe_document, '世界书条目选择变更');
  }
  if (iframe_document) {
    showInlineToast(
      iframe_document,
      override === 'exclude'
        ? '已排除该世界书条目。'
        : override === 'include'
          ? '已额外纳入该世界书条目。'
          : '已恢复默认。',
    );
  }
}
