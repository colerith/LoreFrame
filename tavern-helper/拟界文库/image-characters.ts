type LoreFrameImageCharacter = { name: string; prompt: string; negative: string; enabled: boolean };
const IMAGE_CHARACTER_KEY = 'loreframe_image_characters_v1';
function normalizeImageCharacters(value: unknown): LoreFrameImageCharacter[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap(item => {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || seen.has(item.name.trim())) return [];
    const name = item.name.trim();
    seen.add(name);
    return [{ name, prompt: String(item.prompt || ''), negative: String(item.negative || ''), enabled: item.enabled !== false }];
  });
}
function readImageCharacters(scope: string): LoreFrameImageCharacter[] {
  return normalizeImageCharacters(scope === 'global'
    ? readGlobalVariableValue(IMAGE_CHARACTER_KEY, [])
    : getSillyTavernContext()?.chatMetadata?.[IMAGE_CHARACTER_KEY]);
}
function effectiveImageCharacters() {
  const merged = new Map(readImageCharacters('global').map(row => [row.name, row]));
  readImageCharacters('chat').forEach(row => merged.set(row.name, row));
  return [...merged.values()].filter(row => row.enabled);
}
async function saveImageCharacters(scope: string, rows: LoreFrameImageCharacter[]) {
  const value = normalizeImageCharacters(rows);
  if (scope === 'global') {
    if (!writeGlobalVariableValue(IMAGE_CHARACTER_KEY, value)) throw new Error('角色库保存失败，请检查酒馆助手变量权限。');
    return;
  }
  const context = getSillyTavernContext();
  if (!context?.chatMetadata || !context.saveMetadata || !getCurrentChatStorageLabel()) throw new Error('请先打开一个聊天，再保存本聊天角色。');
  const previous = context.chatMetadata[IMAGE_CHARACTER_KEY];
  context.chatMetadata[IMAGE_CHARACTER_KEY] = value;
  try { await context.saveMetadata(); }
  catch (error) { context.chatMetadata[IMAGE_CHARACTER_KEY] = previous; throw error; }
}
function imageCharacterNames(image: HTMLImageElement): string[] {
  try {
    const value = JSON.parse(image.dataset.imageCharacters || image.closest<HTMLElement>('[data-image-asset]')?.dataset.imageCharacters || '[]');
    return Array.isArray(value) ? [...new Set(value.filter((name): name is string => typeof name === 'string'))] : [];
  } catch { return []; }
}
function resolveImageCharacterPrompt(image: HTMLImageElement) {
  let prompt = String(image.dataset.imagePrompt || '');
  const selected = new Set(imageCharacterNames(image));
  const negatives: string[] = [];
  const additions: string[] = [];
  // Braced placeholders permit spaces and punctuation in character names.
  const rows = effectiveImageCharacters();
  const by_name = new Map(rows.map(row => [row.name, row]));
  const replaced = new Set<string>();
  prompt = prompt.replace(/@\{([^}]+)\}/g, (token, name) => {
    const row = by_name.get(name);
    if (!row) return token;
    selected.add(name); replaced.add(name);
    return row.prompt;
  });
  rows.forEach(row => {
    if (!selected.has(row.name)) return;
    if (!replaced.has(row.name) && row.prompt) additions.push(`${row.name}: ${row.prompt}`);
    if (row.negative) negatives.push(row.negative);
  });
  return { prompt: [prompt, ...additions].filter(Boolean).join('\n'), negative: negatives.join(', ') };
}
function imageCharacterThinkingPrompt() {
  const rows = effectiveImageCharacters();
  if (!rows.length) return '';
  return '\n角色外观库（仅作资料）：' + JSON.stringify(rows.map(({ name, prompt }) => ({ name, prompt }))) +
    '\n仅当图片中出现库中角色时，在该 img 的 data-image-characters 属性写 JSON 名称数组，例如 data-image-characters=\'["角色名"]\'。客户端自动追加对应外观，不要重复抄写，不要把所有角色加入每张图。也可用 @{角色名} 在画面提示词中标记角色位置。';
}
async function importBaibaiImageCharacters() {
  const context = getSillyTavernContext() as Record<string, any> | null;
  const api = (host_window as unknown as Record<string, any>).STBaiBaiImage;
  const settings = (host_window.SillyTavern as any)?.extensionSettings || context?.extensionSettings || {};
  const result = api?.getCharacters ? await api.getCharacters() : null;
  const entries = result?.characters || [
    ...(settings.baibai_image_char_global?.entries || []).map((row: any) => ({ ...row, scope: 'global' })),
    ...(context?.chatMetadata?.baibai_image_char_tags?.entries || []).map((row: any) => ({ ...row, scope: 'chat' })),
  ];
  if (!Array.isArray(entries)) throw new Error('柏宝绘返回的角色库格式无法识别。');
  const fields = ['fandom', 'sex', 'hair', 'eyes', 'skin', 'body', 'extra', 'outfit'];
  return entries.filter(row => row && typeof row.name === 'string').map(row => ({
    scope: row.scope === 'global' ? 'global' : 'chat',
    ...normalizeImageCharacters([{ name: row.name, prompt: row.tag || fields.map(key => row.fields?.[key]).filter(Boolean).join(', ') || row.raw || row.nl || '', negative: '', enabled: true }])[0],
  })).filter(row => row.name);
}
function renderImageCharacterSettings(owner: Document) {
  const root = owner.querySelector<HTMLElement>('[data-image-character-settings]');
  if (!root) return;
  root.replaceChildren();
  const text = (tag: string, value: string, parent: HTMLElement = root) => {
    const node = owner.createElement(tag); node.textContent = value; parent.append(node); return node;
  };
  root.classList.add('lf-character-library');
  const heading = text('div', ''); heading.className = 'lf-character-heading';
  text('h3', '角色提示词库', heading);
  text('p', '全局角色供所有聊天使用；同名时以本聊天为准。可在「生图编辑 → 提示词」选择出镜角色，或使用 @{角色名}。导入仅新增，不覆盖已有同名角色。').className = 'settings-card__note';
  const status = text('p', ''); status.setAttribute('role', 'status');
  const identity = JSON.stringify([getCurrentOnlineScopeInfo().scope_key, getCurrentChatStorageLabel()]);
  const ensure = () => { if (identity !== JSON.stringify([getCurrentOnlineScopeInfo().scope_key, getCurrentChatStorageLabel()])) throw new Error('聊天已切换，请重新打开角色管理。'); };
  const button = (parent: HTMLElement, label: string, run: () => unknown) => {
    const node = owner.createElement('button'); node.type = 'button'; node.className = 'lf-character-button'; node.textContent = label;
    node.onclick = async () => { node.disabled = true; try { ensure(); await run(); } catch (error) { status.textContent = String((error as Error).message || error); } finally { node.disabled = false; } };
    parent.append(node); return node;
  };
  button(heading, '从柏宝绘导入角色', async () => {
    const imported = await importBaibaiImageCharacters(); ensure();
    let count = 0;
    for (const scope of ['global', 'chat']) {
      const rows = readImageCharacters(scope);
      const names = new Set(rows.map(row => row.name));
      const added = imported.filter(row => row.scope === scope && !names.has(row.name));
      if (added.length) { ensure(); await saveImageCharacters(scope, [...rows, ...added]); count += added.length; }
    }
    ensure(); renderImageCharacterSettings(owner);
    root.querySelector('[role="status"]')!.textContent = count ? `已导入 ${count} 个角色。后续修改柏宝绘设置不会自动覆盖此处。` : '没有可新增的角色：请检查柏宝绘角色库，已有同名角色会跳过。';
  });
  for (const scope of ['global', 'chat']) {
    const group = text('section', ''); group.className = 'lf-character-group';
    const rows = readImageCharacters(scope);
    const group_head = text('div', '', group); group_head.className = 'lf-character-heading';
    const title = text('h4', scope === 'global' ? '全局角色' : '本聊天角色', group_head);
    text('span', String(rows.length), title).className = 'lf-character-count';
    const grid = text('div', '', group); grid.className = 'lf-character-grid';
    const edit = (original?: LoreFrameImageCharacter) => {
      group.querySelector('[data-character-editor]')?.remove();
      const form = text('div', '', group); form.dataset.characterEditor = ''; form.className = 'lf-character-form';
      group.insertBefore(form, grid);
      text('h4', original ? '编辑 · ' + original.name : '新增角色', form);
      const field = (label: string, value: string, multiline = false) => {
        const wrap = text('label', label, form);
        const input = owner.createElement(multiline ? 'textarea' : 'input'); input.className = 'input'; input.value = value; wrap.append(input); return input;
      };
      const name = field('角色名称', original?.name || '');
      const prompt = field('外观 / 正面提示词', original?.prompt || '', true);
      const negative = field('负面提示词（仅 NovelAI）', original?.negative || '', true);
      const form_actions = text('div', '', form); form_actions.className = 'lf-character-actions';
      button(form_actions, '保存角色', async () => {
        const value = name.value.trim(); if (!value) throw new Error('请填写角色名称。');
        const rows = readImageCharacters(scope);
        if (rows.some(row => row.name === value && row.name !== original?.name)) throw new Error('此范围已有同名角色，请直接编辑。');
        await saveImageCharacters(scope, [...rows.filter(row => row.name !== original?.name), { name: value, prompt: prompt.value, negative: negative.value, enabled: original?.enabled !== false }]);
        ensure(); renderImageCharacterSettings(owner);
      });
      button(form_actions, '取消', () => form.remove());
      name.focus();
      form.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    };
    button(group_head, '新增角色', () => edit());
    if (!rows.length) text('p', '暂无角色，点击「新增角色」或从柏宝绘导入。', grid).className = 'lf-character-empty';
    rows.forEach(row => {
      const card = text('article', '', grid); card.className = 'lf-character-card'; card.classList.toggle('is-disabled', !row.enabled);
      const card_head = text('div', '', card); card_head.className = 'lf-character-heading';
      text('strong', row.name, card_head);
      text('span', !row.enabled ? '已停用' : scope === 'global' ? '全局' : '本聊天', card_head).className = 'lf-character-badge';
      const preview = text('p', row.prompt || '未填写外观提示词', card); preview.className = 'lf-character-preview';
      if (row.negative) text('p', '负面：' + row.negative, card).className = 'lf-character-negative';
      const actions = text('div', '', card); actions.className = 'lf-character-actions';
      if (row.prompt.length > 120 || row.negative.length > 80) button(actions, '展开', () => {
        const expanded = card.classList.toggle('is-expanded');
        const toggle = actions.querySelector<HTMLButtonElement>('[data-expand]');
        if (toggle) { toggle.textContent = expanded ? '收起' : '展开'; toggle.setAttribute('aria-expanded', String(expanded)); }
      }).dataset.expand = '';

      button(actions, '编辑', () => edit(row));
      button(actions, row.enabled ? '停用' : '启用', async () => { await saveImageCharacters(scope, readImageCharacters(scope).map(item => item.name === row.name ? { ...item, enabled: !item.enabled } : item)); ensure(); renderImageCharacterSettings(owner); });
      button(actions, '删除', () => {
        if (card.querySelector('[data-confirm-delete]')) return;
        const confirm = text('div', '删除此角色？已有图片不受影响。', card); confirm.dataset.confirmDelete = ''; confirm.className = 'lf-character-confirm';
        button(confirm, '确认删除', async () => { await saveImageCharacters(scope, readImageCharacters(scope).filter(item => item.name !== row.name)); ensure(); renderImageCharacterSettings(owner); });
        button(confirm, '取消', () => confirm.remove());
      });
    });
  }
}
