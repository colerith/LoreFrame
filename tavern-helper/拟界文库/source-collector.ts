type SourceCollectorMessage = MinimalChatMessage &
  OnlineMessage & {
    message_id: string | number;
    role?: string;
    message?: string;
  };

type SourceCollectorCharacter = {
  worldbook?: string | null;
  description?: string | null;
  personality?: string | null;
  scenario?: string | null;
  creator_notes?: string | null;
  [key: string]: unknown;
};

type SourceCollectorMessageKey =
  | string
  | RegExp
  | {
      source?: string;
      [key: string]: unknown;
    };

type SourceCollectorWorldbookEntry = WorldbookLike & {
  world?: string;
  worldbook?: string;
  worldbook_name?: string;
  book?: string;
  source?: string;
  disable?: boolean;
  position?: unknown;
  insertion_position?: unknown;
  insertionPosition?: unknown;
  role?: unknown;
  placement?: unknown;
  position_type?: unknown;
  order?: unknown;
  sort_order?: unknown;
  sortOrder?: unknown;
  displayIndex?: unknown;
  strategy?: {
    type?: string;
    keys?: SourceCollectorMessageKey[];
    keys_secondary?: {
      keys?: SourceCollectorMessageKey[];
      logic?: string;
    };
  };
  keys?: SourceCollectorMessageKey[];
  keysecondary?: SourceCollectorMessageKey[];
  secondary_keys?: SourceCollectorMessageKey[];
  extra?: {
    world?: string;
    worldbook?: string;
    [key: string]: unknown;
  };
  extensions?: {
    position?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type SourceCollectorWorldbookCatalogItem = {
  key: string;
  world: string;
  entry: SourceCollectorWorldbookEntry;
};

type SourceCollectorWorldbookSummary = {
  name: string;
  count: number;
  enabled_count: number;
  candidate_count: number;
  excluded_count: number;
  extra_included_count: number;
  constant_count: number;
  selective_count: number;
  activated_selective_count: number;
  other_count: number;
  included_content_length: number;
  selective_key_preview?: string;
  error?: string;
};

type SourceCollectorWorldbookPart = {
  content: string;
  order: number;
  sequence: number;
};

type SourceCollectorSummaryTag = {
  id: string;
  open_tag?: string;
  close_tag?: string;
};

type SourceCollectorSettings = SettingsState & {
  summary_tags: SourceCollectorSummaryTag[];
  active_summary_tag_id?: string;
  chat_history_depth?: number | string;
};

type SourceCollectorOnlineSourceMaterial = {
  message_count: number;
  total_message_count: number;
  hidden_message_count: number;
  latest_message_id: string | number;
  latest_swipe_id: number;
  latest_message_signature: string;
  latest_message_key: string;
  world_info: string;
  chat_history: string;
  last_chat: string;
  online_memory: string;
};

type SourceCollectorWorldbookNames = {
  primary: string | null;
  additional: string[];
};

function isStringValue(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyStringValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getSourceCollectorErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeSourceCollectorCharacter(value: unknown): SourceCollectorCharacter | null {
  return value && typeof value === 'object' ? (value as SourceCollectorCharacter) : null;
}

function normalizeSourceCollectorWorldbookNames(
  value: unknown,
  fallback_worldbook = '',
): SourceCollectorWorldbookNames {
  const candidate = value && typeof value === 'object' ? (value as Partial<SourceCollectorWorldbookNames>) : null;
  return {
    primary: isStringValue(candidate?.primary) ? candidate.primary : fallback_worldbook || null,
    additional: Array.isArray(candidate?.additional) ? candidate.additional.filter(isStringValue) : [],
  };
}

function stripExcludedTaggedContent(text: string, excluded_tags: string[]) {
  let result = String(text || '');
  const unique_tags = [...new Set((excluded_tags || []).map(tag => String(tag || '').trim().toLowerCase()).filter(Boolean))];
  unique_tags.forEach(tag => {
    const escaped_tag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block_pattern = new RegExp(`<${escaped_tag}\\b[^>]*>[\\s\\S]*?<\\/${escaped_tag}>`, 'gi');
    const self_closing_pattern = new RegExp(`<${escaped_tag}\\b[^>]*\\/?>`, 'gi');
    result = result.replace(block_pattern, '').replace(self_closing_pattern, '');
  });
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeSourceCollectorWorldbookEntries(value: unknown): SourceCollectorWorldbookEntry[] {
  return Array.isArray(value) ? (value as SourceCollectorWorldbookEntry[]) : [];
}

function normalizeSourceCollectorMessage(value: unknown): SourceCollectorMessage {
  const candidate = value && typeof value === 'object' ? (value as Partial<SourceCollectorMessage>) : {};
  return {
    ...(candidate as SourceCollectorMessage),
    message_id: candidate.message_id ?? 0,
  };
}

function collectChatDebugSnapshot(iframe_document: Document, reason: string) {
  try {
    const all_messages = getChatMessagesSafely();
    const messages = getVisibleChatMessagesSafely();
    const latest_user = findLatestMessage(messages, 'user');
    const latest_assistant = findLatestMessage(messages, 'assistant');
    const latest_message = messages[messages.length - 1];
    const signature = `${messages.length}/${all_messages.length}:${latest_message?.message_id ?? 'none'}:${latest_message?.message?.length ?? 0}`;
    const now_text = formatTime(new Date());

    last_chat_signature = signature;

    setMonitorStatus(iframe_document, '已读取正文聊天', `触发原因：${reason}，时间：${now_text}`);
    updateText(iframe_document, '[data-chat-count]', `可见 ${messages.length} / 全部 ${all_messages.length}`);
    updateText(iframe_document, '[data-latest-user]', trimPreview(latest_user?.message));
    updateText(iframe_document, '[data-latest-assistant]', trimPreview(latest_assistant?.message));
    updateText(iframe_document, '[data-last-signature]', last_chat_signature);
  } catch (error) {
    setMonitorStatus(iframe_document, '读取失败', getSourceCollectorErrorMessage(error));
    console.error('[LoreFrame] 读取聊天失败', error);
  }
}

async function collectSourceDebugSnapshot(iframe_document: Document, reason: string) {
  try {
    setSourceStatus(iframe_document, '读取中', '正在读取角色卡和世界书；不会读取预设提示词。');

    const get_current_character_name = getApiFunction('getCurrentCharacterName');
    const get_character = getApiFunction('getCharacter');
    const get_char_data = getApiFunction('getCharData');
    const get_char_worldbook_names = getApiFunction('getCharWorldbookNames');
    const get_chat_worldbook_name = getApiFunction('getChatWorldbookName');
    const get_worldbook = getApiFunction('getWorldbook');
    const settings = getSettings();
    const scan_text = getWorldbookScanText();
    const user_name = getSillyTavernContext()?.name1 || '未读取到用户名称';
    const user_persona_description = getUserPersonaDescription();
    const persona_worldbook = await getPersonaWorldbookName();

    const current_character_name =
      (typeof get_current_character_name === 'function' && get_current_character_name()) ||
      getSillyTavernContext()?.name2 ||
      '未读取到当前角色';

    let character: SourceCollectorCharacter | null = null;
    if (typeof get_character === 'function') {
      try {
        character = normalizeSourceCollectorCharacter(await get_character('current'));
      } catch (error) {
        console.warn('[LoreFrame] getCharacter 读取失败，尝试 getCharData', error);
      }
    }
    if (!character && typeof get_char_data === 'function') {
      character = normalizeSourceCollectorCharacter(get_char_data('current'));
    }

    const char_worldbooks =
      typeof get_char_worldbook_names === 'function'
        ? normalizeSourceCollectorWorldbookNames(get_char_worldbook_names('current'), character?.worldbook || '')
        : { primary: character?.worldbook || null, additional: [] };
    const chat_worldbook =
      typeof get_chat_worldbook_name === 'function' && isStringValue(get_chat_worldbook_name('current'))
        ? get_chat_worldbook_name('current')
        : null;

    const worldbook_names = [
      char_worldbooks.primary,
      ...(char_worldbooks.additional || []),
      chat_worldbook,
      persona_worldbook,
    ].filter(isNonEmptyStringValue);
    const unique_worldbook_names = [...new Set(worldbook_names.map(name => name.trim()))];

    const activated_world_info_entries = latest_activated_world_info_entries as SourceCollectorWorldbookEntry[];
    const activated_keys = new Set(activated_world_info_entries.flatMap(entry => getEntryLooseKeys(entry)));
    const worldbook_summaries: SourceCollectorWorldbookSummary[] = [];
    const worldbook_catalog: SourceCollectorWorldbookCatalogItem[] = [];
    let constant_entry_count = 0;
    let selective_entry_count = 0;
    let activated_selective_count = 0;
    let included_worldbook_content_length = 0;
    let excluded_entry_count = 0;
    let extra_included_entry_count = 0;
    if (typeof get_worldbook === 'function') {
      for (const worldbook_name of unique_worldbook_names) {
        try {
          const entries = normalizeSourceCollectorWorldbookEntries(await get_worldbook(worldbook_name));
          entries.forEach((entry: SourceCollectorWorldbookEntry) => {
            worldbook_catalog.push({
              key: getWorldbookEntryStableKey(worldbook_name, entry),
              world: worldbook_name,
              entry,
            });
          });
          const candidate_entries = entries.filter((entry: SourceCollectorWorldbookEntry) =>
            isWorldbookEntryCandidate(settings, worldbook_name, entry),
          );
          const excluded_entries = entries.filter(
            (entry: SourceCollectorWorldbookEntry) =>
              getWorldbookEntryOverride(settings, worldbook_name, entry) === 'exclude',
          );
          const extra_included_entries = entries.filter(
            (entry: SourceCollectorWorldbookEntry) =>
              getWorldbookEntryOverride(settings, worldbook_name, entry) === 'include' && entry.enabled === false,
          );
          const constant_entries = candidate_entries.filter(isConstantWorldbookEntry);
          const selective_entries = candidate_entries.filter(isSelectiveWorldbookEntry);
          const activated_selective_entries = selective_entries.filter((entry: SourceCollectorWorldbookEntry) =>
            shouldIncludeWorldbookEntry(settings, worldbook_name, entry, activated_keys, scan_text),
          );
          const other_enabled_entries = candidate_entries.filter(
            (entry: SourceCollectorWorldbookEntry) =>
              !isConstantWorldbookEntry(entry) && !isSelectiveWorldbookEntry(entry),
          );

          constant_entry_count += constant_entries.length;
          selective_entry_count += selective_entries.length;
          activated_selective_count += activated_selective_entries.length;
          excluded_entry_count += excluded_entries.length;
          extra_included_entry_count += extra_included_entries.length;
          included_worldbook_content_length += constant_entries.reduce(
            (sum: number, entry: SourceCollectorWorldbookEntry) => sum + getWorldbookEntryContent(entry).length,
            0,
          );
          included_worldbook_content_length += activated_selective_entries.reduce(
            (sum: number, entry: SourceCollectorWorldbookEntry) => sum + getWorldbookEntryContent(entry).length,
            0,
          );

          worldbook_summaries.push({
            name: worldbook_name,
            count: entries.length,
            enabled_count: entries.filter((entry: SourceCollectorWorldbookEntry) => entry.enabled !== false).length,
            candidate_count: candidate_entries.length,
            excluded_count: excluded_entries.length,
            extra_included_count: extra_included_entries.length,
            constant_count: constant_entries.length,
            selective_count: selective_entries.length,
            activated_selective_count: activated_selective_entries.length,
            other_count: other_enabled_entries.length,
            included_content_length:
              constant_entries.reduce(
                (sum: number, entry: SourceCollectorWorldbookEntry) => sum + getWorldbookEntryContent(entry).length,
                0,
              ) +
              activated_selective_entries.reduce(
                (sum: number, entry: SourceCollectorWorldbookEntry) => sum + getWorldbookEntryContent(entry).length,
                0,
              ),
            selective_key_preview: selective_entries
              .slice(0, 3)
              .map(
                (entry: SourceCollectorWorldbookEntry) =>
                  `${getWorldbookEntryName(entry)}[${summarizeWorldbookEntryKeys(entry)}]`,
              )
              .join('；'),
          });
        } catch (error) {
          worldbook_summaries.push({
            name: worldbook_name,
            count: 0,
            enabled_count: 0,
            candidate_count: 0,
            excluded_count: 0,
            extra_included_count: 0,
            constant_count: 0,
            selective_count: 0,
            activated_selective_count: 0,
            other_count: 0,
            included_content_length: 0,
            error: getSourceCollectorErrorMessage(error),
          });
        }
      }
    }
    latest_worldbook_entry_catalog = worldbook_catalog as Array<Record<string, unknown>>;

    const character_text_length = [character?.description, character?.creator_notes].reduce(
      (sum, text) => sum + String(text || '').length,
      0,
    );
    const now_text = formatTime(new Date());

    setSourceStatus(iframe_document, '已读取资料', `触发原因：${reason}，时间：${now_text}。没有读取预设。`);
    updateText(iframe_document, '[data-character-name]', current_character_name);
    updateText(iframe_document, '[data-user-name]', user_name);
    updateText(iframe_document, '[data-user-description-length]', String(user_persona_description.length));
    updateText(iframe_document, '[data-user-worldbook]', persona_worldbook || '无');
    updateText(iframe_document, '[data-character-length]', String(character_text_length));
    updateText(
      iframe_document,
      '[data-character-worldbooks]',
      [char_worldbooks.primary, ...(char_worldbooks.additional || [])].filter(Boolean).join('、') || '无',
    );
    updateText(iframe_document, '[data-chat-worldbook]', chat_worldbook || '无');
    updateText(iframe_document, '[data-worldbook-count]', String(unique_worldbook_names.length));
    updateText(iframe_document, '[data-worldbook-constant-count]', String(constant_entry_count));
    updateText(iframe_document, '[data-worldbook-selective-count]', String(selective_entry_count));
    updateText(iframe_document, '[data-worldbook-activated-count]', String(activated_selective_count));
    updateText(iframe_document, '[data-worldbook-included-length]', String(included_worldbook_content_length));
    updateText(
      iframe_document,
      '[data-worldbook-activated-list]',
      activated_world_info_entries.length
        ? activated_world_info_entries
            .map(
              (entry: SourceCollectorWorldbookEntry) =>
                `${entry.world || '未知世界书'} / ${getWorldbookEntryName(entry)}`,
            )
            .join('\n')
        : '本次尚未捕获到关键词条目激活',
    );
    updateText(
      iframe_document,
      '[data-worldbook-summary]',
      worldbook_summaries.length
        ? worldbook_summaries
            .map(summary =>
              summary.error
                ? `${summary.name}: 读取失败(${summary.error})`
                : `${summary.name}: 酒馆启用 ${summary.enabled_count}/${summary.count}；脚本候选 ${summary.candidate_count}；已排除 ${summary.excluded_count}；额外纳入 ${summary.extra_included_count}；蓝灯 ${summary.constant_count}；绿灯 ${summary.activated_selective_count}/${summary.selective_count} 已激活；其他 ${summary.other_count}；本次可纳入约 ${summary.included_content_length} 字${summary.selective_key_preview ? `\n  绿灯关键词预览: ${summary.selective_key_preview}` : ''}`,
            )
            .join('\n')
        : '无已绑定世界书',
    );
    renderWorldbookEntryControls(iframe_document);
  } catch (error) {
    setSourceStatus(iframe_document, '读取失败', getSourceCollectorErrorMessage(error));
    console.error('[LoreFrame] 读取角色卡/世界书失败', error);
  }
}

function getActivatedEntryWorldbookName(entry: SourceCollectorWorldbookEntry | null | undefined) {
  return (
    entry?.world ||
    entry?.worldbook ||
    entry?.worldbook_name ||
    entry?.book ||
    entry?.source ||
    entry?.extra?.world ||
    entry?.extra?.worldbook ||
    ''
  );
}

async function getBoundWorldbookNameSet(): Promise<Set<string>> {
  const get_character = getApiFunction('getCharacter');
  const get_char_data = getApiFunction('getCharData');
  const get_char_worldbook_names = getApiFunction('getCharWorldbookNames');
  const get_chat_worldbook_name = getApiFunction('getChatWorldbookName');

  let character: SourceCollectorCharacter | null = null;
  if (typeof get_character === 'function') {
    try {
      character = normalizeSourceCollectorCharacter(await get_character('current'));
    } catch (error) {
      console.warn('[LoreFrame] getCharacter 读取失败，尝试 getCharData', error);
    }
  }
  if (!character && typeof get_char_data === 'function') {
    character = normalizeSourceCollectorCharacter(get_char_data('current'));
  }

  const char_worldbooks =
    typeof get_char_worldbook_names === 'function'
      ? normalizeSourceCollectorWorldbookNames(get_char_worldbook_names('current'), character?.worldbook || '')
      : { primary: character?.worldbook || null, additional: [] };
  const chat_worldbook =
    typeof get_chat_worldbook_name === 'function' && isStringValue(get_chat_worldbook_name('current'))
      ? get_chat_worldbook_name('current')
      : null;
  const persona_worldbook = await getPersonaWorldbookName();

  return new Set(
    [char_worldbooks.primary, ...(char_worldbooks.additional || []), chat_worldbook, persona_worldbook].filter(
      isNonEmptyStringValue,
    ),
  );
}

async function filterBoundActivatedWorldInfoEntries(
  entries: SourceCollectorWorldbookEntry[] | Iterable<SourceCollectorWorldbookEntry> | null | undefined,
) {
  const entry_list = Array.isArray(entries) ? entries : Array.from(entries || []);
  if (!entry_list.length) {
    return [];
  }
  const allowed_worldbooks = await getBoundWorldbookNameSet();
  return entry_list.filter((entry: SourceCollectorWorldbookEntry) => {
    const worldbook_name = getActivatedEntryWorldbookName(entry);
    return !worldbook_name || allowed_worldbooks.has(worldbook_name);
  });
}

async function collectOnlineSourceMaterial(
  target_message_id?: string | number | null,
): Promise<SourceCollectorOnlineSourceMaterial> {
  const get_current_character_name = getApiFunction('getCurrentCharacterName');
  const get_character = getApiFunction('getCharacter');
  const get_char_data = getApiFunction('getCharData');
  const get_char_worldbook_names = getApiFunction('getCharWorldbookNames');
  const get_chat_worldbook_name = getApiFunction('getChatWorldbookName');
  const get_worldbook = getApiFunction('getWorldbook');
  const all_messages = getChatMessagesSafely();
  const swipe_map = buildSwipeMessageMap();
  const messages = getVisibleChatMessagesSafely().map((message: MinimalChatMessage) => {
    const normalized_message = normalizeSourceCollectorMessage(message);
    return normalizeSourceCollectorMessage(
      attachSwipeIdentityToMessage(
        normalized_message as { message_id: string | number; [key: string]: unknown },
        swipe_map as Map<string, { message_id: string | number; [key: string]: unknown }> | null,
      ),
    );
  });
  let latest_assistant =
    [...messages].reverse().find((message: SourceCollectorMessage) => message.role === 'assistant') || null;
  if (target_message_id != null) {
    const target_id = String(target_message_id);
    const target_message = messages.find((message: SourceCollectorMessage) => String(message.message_id) === target_id);
    if (target_message) {
      latest_assistant = target_message;
    } else {
      console.warn('[LoreFrame] 指定的目标楼层不存在，仍使用最新 AI 楼层：', target_message_id);
    }
  }
  const latest_message_id = latest_assistant?.message_id ?? messages[messages.length - 1]?.message_id ?? 0;
  const latest_swipe_id = getMessageSwipeId(latest_assistant);
  const latest_message_signature = getOnlineSourceMessageSignature(latest_assistant, latest_swipe_id);
  const latest_message_key = getOnlineEntryKey(latest_message_id, latest_swipe_id);
  const user_name = getSillyTavernContext()?.name1 || '<user>';
  const user_persona_description = getUserPersonaDescription();
  const persona_worldbook = await getPersonaWorldbookName();
  const settings = getSettings() as SourceCollectorSettings;
  const active_summary_tag =
    settings.summary_tags.find(tag => tag.id === settings.active_summary_tag_id) || settings.summary_tags[0];
  const current_character_name =
    (typeof get_current_character_name === 'function' && get_current_character_name()) ||
    getSillyTavernContext()?.name2 ||
    '未读取到当前角色';

  let character: SourceCollectorCharacter | null = null;
  if (typeof get_character === 'function') {
    try {
      character = normalizeSourceCollectorCharacter(await get_character('current'));
    } catch (error) {
      console.warn('[LoreFrame] getCharacter 读取失败，尝试 getCharData', error);
    }
  }
  if (!character && typeof get_char_data === 'function') {
    character = normalizeSourceCollectorCharacter(get_char_data('current'));
  }

  const char_worldbooks =
    typeof get_char_worldbook_names === 'function'
      ? normalizeSourceCollectorWorldbookNames(get_char_worldbook_names('current'), character?.worldbook || '')
      : { primary: character?.worldbook || null, additional: [] };
  const chat_worldbook =
    typeof get_chat_worldbook_name === 'function' && isStringValue(get_chat_worldbook_name('current'))
      ? get_chat_worldbook_name('current')
      : null;
  const unique_worldbook_names = [
    ...new Set(
      [char_worldbooks.primary, ...(char_worldbooks.additional || []), chat_worldbook, persona_worldbook].filter(
        isNonEmptyStringValue,
      ),
    ),
  ];

  const activated_world_info_entries = latest_activated_world_info_entries as SourceCollectorWorldbookEntry[];
  const persona_world_info_entries = latest_persona_world_info_entries as SourceCollectorWorldbookEntry[];
  const activated_keys = new Set(activated_world_info_entries.flatMap(entry => getEntryLooseKeys(entry)));
  const scan_text = getWorldbookScanText(messages);
  const before_worldbook_parts: SourceCollectorWorldbookPart[] = [];
  const after_worldbook_parts: SourceCollectorWorldbookPart[] = [];
  let worldbook_sequence = 0;

  const get_worldbook_entry_position = (entry: SourceCollectorWorldbookEntry) => {
    const raw_position =
      entry?.position ??
      entry?.insertion_position ??
      entry?.insertionPosition ??
      entry?.role ??
      entry?.placement ??
      entry?.position_type ??
      entry?.extensions?.position;
    const text = String(raw_position ?? '').toLowerCase();
    const numeric_position = Number(raw_position);
    if (
      numeric_position === 0 ||
      text.includes('before') ||
      text.includes('角色前') ||
      text.includes('char_before') ||
      text.includes('before_char') ||
      text.includes('before character')
    ) {
      return 'before';
    }
    return 'after';
  };

  const get_worldbook_entry_order = (entry: SourceCollectorWorldbookEntry) => {
    const raw_order = entry?.order ?? entry?.sort_order ?? entry?.sortOrder ?? entry?.displayIndex ?? entry?.uid ?? 0;
    const order = Number(raw_order);
    return Number.isFinite(order) ? order : 0;
  };

  const push_worldbook_part = (entry: SourceCollectorWorldbookEntry) => {
    const content = applyWorldInfoMacros(getWorldbookEntryContent(entry), {
      user_name,
      character_name: current_character_name,
    }).trim();
    if (!content) {
      return;
    }
    const item = {
      content,
      order: get_worldbook_entry_order(entry),
      sequence: worldbook_sequence,
    };
    worldbook_sequence += 1;
    if (get_worldbook_entry_position(entry) === 'before') {
      before_worldbook_parts.push(item);
    } else {
      after_worldbook_parts.push(item);
    }
  };

  if (typeof get_worldbook === 'function') {
    for (const worldbook_name of unique_worldbook_names) {
      const entries = await get_worldbook(worldbook_name);
      const included_entries = normalizeSourceCollectorWorldbookEntries(entries).filter(
        (entry: SourceCollectorWorldbookEntry) =>
          shouldIncludeWorldbookEntry(settings, worldbook_name, entry, activated_keys, scan_text),
      );
      included_entries.forEach((entry: SourceCollectorWorldbookEntry) => push_worldbook_part(entry));
    }
  }

  persona_world_info_entries.forEach((entry: SourceCollectorWorldbookEntry) => {
    const persona_world = getActivatedEntryWorldbookName(entry) || persona_worldbook || '<user>绑定世界书';
    if (getWorldbookEntryOverride(settings, persona_world, entry) === 'exclude') {
      return;
    }
    const persona_candidate =
      entry?.disable !== true &&
      (entry?.enabled !== false || getWorldbookEntryOverride(settings, persona_world, entry) === 'include');
    if (!persona_candidate) {
      return;
    }
    if (
      isConstantWorldbookEntry(entry) ||
      activated_world_info_entries.some(
        (active: SourceCollectorWorldbookEntry) => getEntryKey(active) === getEntryKey(entry),
      ) ||
      doesWorldbookEntryMatchScan(entry, scan_text)
    ) {
      push_worldbook_part(entry);
    }
  });

  const sort_worldbook_parts = (parts: SourceCollectorWorldbookPart[]) =>
    parts
      .sort(
        (left: SourceCollectorWorldbookPart, right: SourceCollectorWorldbookPart) =>
          left.order - right.order || left.sequence - right.sequence,
      )
      .map((item: SourceCollectorWorldbookPart) => item.content);

  const user_context = user_persona_description
    ? applyWorldInfoMacros(user_persona_description, { user_name, character_name: current_character_name }).trim()
    : '';
  const character_context = [
    character?.description,
    character?.personality,
    character?.scenario,
    character?.creator_notes,
  ]
    .map(text => applyWorldInfoMacros(text || '', { user_name, character_name: current_character_name }).trim())
    .filter(Boolean)
    .join('\n\n');
  const world_info_before_parts = sort_worldbook_parts(before_worldbook_parts);
  const world_info_after_parts = sort_worldbook_parts(after_worldbook_parts);
  const world_info_parts = [
    ...world_info_before_parts,
    user_context,
    character_context,
    ...world_info_after_parts,
  ].filter(Boolean);

  const format_message = (message: SourceCollectorMessage, index: number) => {
    const regex_role: PromptRegexRole =
      message.role === 'user' ? 'user' : message.role === 'assistant' ? 'assistant' : 'system';
    const role = regex_role === 'user' ? '用户' : regex_role === 'assistant' ? 'AI' : '系统';
    const depth = Math.max(0, messages.length - 1 - index);
    const content = applyPromptRegex(message.message || '', regex_role, depth).trim();
    return content ? role + '\n' + content : '';
  };
  const format_historical_message = (message: SourceCollectorMessage, index: number) => {
    const regex_role: PromptRegexRole =
      message.role === 'user' ? 'user' : message.role === 'assistant' ? 'assistant' : 'system';
    const depth = Math.max(0, messages.length - 1 - index);
    const summary = extractTextBetweenTags(
      message.message || '',
      active_summary_tag?.open_tag,
      active_summary_tag?.close_tag,
    );
    const content = summary ? summary : applyPromptRegex(message.message || '', regex_role, depth);
    return stripExcludedTaggedContent(content, settings.excluded_tags).trim();
  };
  const latest_assistant_index = messages.findIndex((message: SourceCollectorMessage) => message === latest_assistant);
  const latest_user_index =
    latest_assistant_index > -1
      ? messages
          .slice(0, latest_assistant_index)
          .map((message: SourceCollectorMessage, index: number) => ({ message, index }))
          .reverse()
          .find((item: { message: SourceCollectorMessage; index: number }) => item.message.role === 'user')?.index
      : -1;
  const latest_indexes = new Set(
    [latest_user_index, latest_assistant_index].filter((index): index is number => index != null && index > -1),
  );
  const all_historical_messages = messages.filter(
    (_: SourceCollectorMessage, index: number) => !latest_indexes.has(index),
  );
  const history_depth = settings.chat_history_depth;
  const getHistoricalMessagesByAssistantDepth = (depth: number | string | undefined) => {
    if (depth === '') {
      return all_historical_messages;
    }
    const count = Number(depth);
    if (!Number.isFinite(count) || count <= 0) {
      return [];
    }
    const assistant_indexes = all_historical_messages
      .map((message: SourceCollectorMessage, index: number) => (message.role === 'assistant' ? index : -1))
      .filter((index: number) => index > -1);
    if (!assistant_indexes.length) {
      return [];
    }
    const cutoff_index = assistant_indexes[Math.max(0, assistant_indexes.length - count)];
    const previous_assistant_index = assistant_indexes.filter((index: number) => index < cutoff_index).at(-1);
    const start_index = previous_assistant_index == null ? 0 : previous_assistant_index + 1;
    return all_historical_messages.slice(start_index);
  };
  const historical_messages = getHistoricalMessagesByAssistantDepth(history_depth);
  const history_parts = historical_messages.flatMap((message: SourceCollectorMessage) => {
    const index = messages.indexOf(message);
    const formatted_chat = format_historical_message(message, index);
    const online_memory =
      message.role === 'assistant' && message.message_id != null
        ? getOnlineMemoryForMessage(message as { message_id: string | number })
        : '';
    return online_memory ? [formatted_chat, `<历史页面>\n${online_memory}\n</历史页面>`] : [formatted_chat];
  });
  const chat_history = history_parts.length ? `<ChatHistory>\n${history_parts.join('\n\n')}\n</ChatHistory>` : '';
  const last_chat = [...latest_indexes]
    .sort((left, right) => left - right)
    .map(index => format_message(messages[index] || normalizeSourceCollectorMessage(null), index))
    .join('\n\n');
  const all_online_memory = getAllOnlineMemory() || '暂无过去页面正文。';

  return {
    message_count: messages.length,
    total_message_count: all_messages.length,
    hidden_message_count: Math.max(0, all_messages.length - messages.length),
    latest_message_id,
    latest_swipe_id,
    latest_message_signature,
    latest_message_key,
    world_info: `<WorldInfo>\n${world_info_parts.join('\n\n') || '本次没有可纳入的角色卡、用户设定或世界书内容。'}\n</WorldInfo>`,
    chat_history,
    last_chat: `<LastChat>\n${last_chat}\n</LastChat>`,
    online_memory: all_online_memory,
  };
}
