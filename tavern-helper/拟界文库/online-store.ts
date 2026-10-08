type OnlineMessageId = string | number;

type OnlineScopeInfo = {
  scope_key: string;
  character_name: string;
  character_avatar: string;
  scope_aliases?: string[];
};

type OnlineVariant = {
  id: string;
  source_swipe_id: number;
  swipe_id?: number;
  source_message_signature: string;
  html: string;
  title: string;
  memory_text: string;
  raw_result: string;
  updated_at: string;
  prompt_name: string;
  detail_prompt_name: string;
};

type OnlineEntry = {
  id: string;
  entry_key: string;
  message_key: string;
  message_id: OnlineMessageId | 'legacy' | 'unknown';
  swipe_id: number;
  source_swipe_id?: number;
  source_message_signature: string;
  message_count: number;
  title: string;
  favorite: boolean;
  variants: OnlineVariant[];
  active_variant_id: string;
  html?: string;
  memory_text?: string;
  raw_result?: string;
  updated_at?: string;
  prompt_name?: string;
  detail_prompt_name?: string;
  variant_id?: string;
};

type OnlineData = {
  html: string;
  memory_text: string;
  raw_result: string;
  updated_at: string;
  prompt_name: string;
  detail_prompt_name: string;
  entries: OnlineEntry[];
  active_entry_id: string;
  selected_entry_by_message: Record<string, string>;
  selected_variant_by_message: Record<string, string>;
  scope?: OnlineScopeInfo | null;
  active_entry?: OnlineEntry | null;
  inherit_disabled?: boolean;
  inherited_from_chat_id?: string;
  chat_identity_key?: string;
  chat_aliases?: string[];
  payload_key?: string;
  payload_storage?: 'inline' | 'indexeddb';
};

type OnlineDataInput = Partial<OnlineData> & {
  entries?: Array<Partial<OnlineEntry> | OnlineEntry>;
};

type OnlineChatIndexItem = {
  chat_id: string;
  title: string;
  scope: OnlineScopeInfo;
  updated_at: string;
};

type OnlineDataStore = Record<string, OnlineData | OnlineDataInput | undefined>;

type OnlineMessage = {
  message_id: OnlineMessageId;
  role?: string;
  message?: string;
  mes?: string;
  swipe_id?: number | string;
  swipeId?: number | string;
  swipes?: Array<string | { mes?: string; message?: string; text?: string } | undefined>;
  swipes_data?: Array<{ mes?: string; message?: string; text?: string } | undefined>;
  extra?: { swipe_id?: number | string };
  data?: { swipe_id?: number | string };
  [key: string]: unknown;
};

type OnlinePruneOptions = {
  strict_signatures?: boolean;
};

type OnlinePruneResult = {
  data: OnlineData;
  changed: boolean;
  removed_count: number;
};

type OnlineInheritedCandidate = {
  source_chat_id: string;
  data: OnlineData;
  match_count: number;
  latest_updated_at: string;
};

type OnlineStorageUsageSummary = {
  total_bytes: number;
  favorite_bytes: number;
  non_favorite_bytes: number;
  total_entries: number;
  favorite_entries: number;
  non_favorite_entries: number;
  chat_count: number;
};

type BrowserStorageUsageSummary = {
  total_bytes: number;
  loreframe_bytes: number;
  other_bytes: number;
  total_keys: number;
  loreframe_keys: number;
};

type OnlineStoragePruneResult = {
  removed_entries: number;
  removed_chats: number;
  freed_bytes: number;
  usage: OnlineStorageUsageSummary;
};

type OnlineIndexedPayloadRecord = {
  id: string;
  scope_key: string;
  chat_id: string;
  saved_at: string;
  data: OnlineData;
};

type OnlineSwipeValue = string | { mes?: string; message?: string; text?: string } | undefined;
type OnlineSwipeDataValue = { mes?: string; message?: string; text?: string } | undefined;

let online_payload_db_promise: Promise<IDBDatabase | null> | null = null;
const online_payload_cache = new Map<string, OnlineData>();
const online_payload_load_promises = new Map<string, Promise<OnlineData | null>>();
const online_payload_migration_keys = new Set<string>();

function normalizeOnlineSwipeValue(value: unknown): OnlineSwipeValue {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'object') {
    const candidate = value as { mes?: unknown; message?: unknown; text?: unknown };
    return {
      mes: candidate.mes == null ? undefined : String(candidate.mes),
      message: candidate.message == null ? undefined : String(candidate.message),
      text: candidate.text == null ? undefined : String(candidate.text),
    };
  }
  return String(value);
}

function normalizeOnlineSwipeDataValue(value: unknown): OnlineSwipeDataValue {
  const normalized = normalizeOnlineSwipeValue(value);
  if (normalized == null || typeof normalized === 'string') {
    return normalized == null ? undefined : { message: normalized };
  }
  return normalized;
}

function normalizeOnlineMessage(value: unknown): OnlineMessage {
  const candidate = value && typeof value === 'object' ? (value as Partial<OnlineMessage & MinimalChatMessage>) : {};
  return {
    ...(candidate as OnlineMessage),
    message_id: candidate.message_id ?? 0,
    swipes: Array.isArray(candidate.swipes) ? candidate.swipes.map(normalizeOnlineSwipeValue) : undefined,
    swipes_data: Array.isArray(candidate.swipes_data)
      ? candidate.swipes_data.map(normalizeOnlineSwipeDataValue)
      : undefined,
  };
}

function getVisibleOnlineMessagesSafely(): OnlineMessage[] {
  return getVisibleChatMessagesSafely().map(normalizeOnlineMessage);
}

function getChatMessagesWithSwipesOnlineSafely(): OnlineMessage[] {
  return getChatMessagesWithSwipesSafely().map(normalizeOnlineMessage);
}

function getCurrentRawChatStorageId(): string {
  const context = getSillyTavernContext();
  const chat_id =
    context?.getCurrentChatId?.() ||
    context?.chatId ||
    context?.chat_id ||
    host_window.location?.pathname ||
    'unknown-chat';
  return String(chat_id || 'unknown-chat');
}

function hashOnlineStorageText(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeChatAliasList(values: unknown[]) {
  return values
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function buildCurrentChatIdentityFingerprint() {
  const messages = getChatMessagesWithSwipesOnlineSafely();
  if (!messages.length) {
    return '';
  }
  const slices = [...messages.slice(0, 3), ...messages.slice(-3)];
  return slices
    .map(message => {
      const text = getMessageSwipeText(message, getMessageSwipeId(message));
      return [
        String(message.role || ''),
        String(message.message_id ?? ''),
        String(text.length),
        text.slice(0, 80),
        text.slice(-80),
      ].join('\u241f');
    })
    .join('\u241e');
}

function getCurrentChatStorageIdentity() {
  const raw_chat_id = getCurrentRawChatStorageId();
  const fingerprint = buildCurrentChatIdentityFingerprint();
  const storage_id = fingerprint
    ? `chat:${hashOnlineStorageText([String(getChatMessagesWithSwipesOnlineSafely().length), fingerprint].join('\u241d'))}`
    : `legacy:${raw_chat_id}`;
  return {
    raw_chat_id,
    storage_id,
    aliases: normalizeChatAliasList([raw_chat_id, `legacy:${raw_chat_id}`]),
  };
}

function getCurrentChatStorageId(): string {
  return getCurrentChatStorageIdentity().storage_id;
}

function getCurrentChatStorageLabel(): string {
  return getCurrentChatStorageIdentity().raw_chat_id;
}

function getCurrentOnlineScopeInfo(): OnlineScopeInfo {
  const context = getSillyTavernContext();
  const get_current_character_name = getApiFunction('getCurrentCharacterName');
  const get_character = getApiFunction('getCharacter');
  const get_char_data = getApiFunction('getCharData');
  let character_name = '';
  try {
    character_name = String(
      (typeof get_current_character_name === 'function' && get_current_character_name()) || context?.name2 || '',
    ).trim();
  } catch {
    character_name = String(context?.name2 || '').trim();
  }
  let character_avatar = '';
  let character_id = '';
  try {
    const character =
      (typeof get_character === 'function' && get_character('current')) ||
      (typeof get_char_data === 'function' && get_char_data('current')) ||
      null;
    character_avatar = String(character?.avatar || character?.data?.avatar || character?.filename || '').trim();
    character_id = String(character?.id || character?.data?.id || character?.name || '').trim();
    if (!character_name) {
      character_name = String(character?.name || character?.data?.name || '').trim();
    }
  } catch {
    // 兼容部分酒馆版本没有角色 API 的情况，回退到上下文名称即可。
  }
  const legacy_scope_key = [character_avatar, character_id, character_name].filter(Boolean).join('::') || character_name;
  const scope_key = character_avatar
    ? `avatar:${character_avatar}`
    : character_id
      ? `id:${character_id}`
      : character_name
        ? `name:${character_name}`
        : 'default';
  const scope_aliases = [
    legacy_scope_key,
    character_id ? `id:${character_id}` : '',
    character_name ? `name:${character_name}` : '',
  ]
    .map(key => String(key || '').trim())
    .filter(Boolean)
    .filter((key, index, list) => list.indexOf(key) === index && key !== scope_key);
  return {
    scope_key,
    character_name,
    character_avatar,
    scope_aliases,
  };
}

function attachCurrentOnlineScope(data: OnlineDataInput | OnlineData | null | undefined): OnlineDataInput {
  return {
    ...(data || {}),
    scope: getCurrentOnlineScopeInfo(),
  };
}

function encodeOnlineStorageSegment(value: unknown) {
  return encodeURIComponent(String(value || 'unknown'));
}

function getOnlineScopeStorageKey(scope_key: string) {
  return `${ONLINE_SCOPE_INDEX_STORAGE_PREFIX}${encodeOnlineStorageSegment(scope_key || 'default')}`;
}

function getOnlineChatStorageKey(scope_key: string, chat_id: string) {
  return `${ONLINE_SCOPE_CHAT_STORAGE_PREFIX}${encodeOnlineStorageSegment(scope_key || 'default')}:${encodeOnlineStorageSegment(chat_id)}`;
}

function supportsOnlinePayloadIndexedDb() {
  return typeof host_window.indexedDB !== 'undefined';
}

function getOnlinePayloadStorageKey(scope_key: string, chat_id: string) {
  return `${encodeOnlineStorageSegment(scope_key || 'default')}:${encodeOnlineStorageSegment(chat_id)}`;
}

function openOnlinePayloadDatabase(): Promise<IDBDatabase | null> {
  if (online_payload_db_promise) {
    return online_payload_db_promise;
  }
  online_payload_db_promise = new Promise(resolve => {
    if (!supportsOnlinePayloadIndexedDb()) {
      resolve(null);
      return;
    }
    try {
      const request = host_window.indexedDB.open(ONLINE_PAYLOAD_DB_NAME, ONLINE_PAYLOAD_DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(ONLINE_PAYLOAD_STORE_NAME)) {
          database.createObjectStore(ONLINE_PAYLOAD_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[LoreFrame] IndexedDB 打开失败，回退轻量 localStorage。', request.error);
        resolve(null);
      };
      request.onblocked = () => {
        console.warn('[LoreFrame] IndexedDB 正在被旧连接占用，暂时无法写入正文缓存。');
        resolve(null);
      };
    } catch (error) {
      console.warn('[LoreFrame] IndexedDB 初始化异常，回退轻量 localStorage。', error);
      resolve(null);
    }
  });
  return online_payload_db_promise;
}

function readOnlinePayloadRecord(payload_key: string): Promise<OnlineIndexedPayloadRecord | null> {
  return openOnlinePayloadDatabase().then(
    database =>
      new Promise(resolve => {
        if (!database) {
          resolve(null);
          return;
        }
        try {
          const transaction = database.transaction(ONLINE_PAYLOAD_STORE_NAME, 'readonly');
          const store = transaction.objectStore(ONLINE_PAYLOAD_STORE_NAME);
          const request = store.get(payload_key);
          request.onsuccess = () => resolve((request.result as OnlineIndexedPayloadRecord | undefined) || null);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

function writeOnlinePayloadRecord(
  payload_key: string,
  scope_key: string,
  chat_id: string,
  data: OnlineData,
): Promise<boolean> {
  online_payload_cache.set(payload_key, normalizeOnlineData(data));
  return openOnlinePayloadDatabase().then(
    database =>
      new Promise(resolve => {
        if (!database) {
          resolve(false);
          return;
        }
        try {
          const transaction = database.transaction(ONLINE_PAYLOAD_STORE_NAME, 'readwrite');
          const store = transaction.objectStore(ONLINE_PAYLOAD_STORE_NAME);
          const request = store.put({
            id: payload_key,
            scope_key,
            chat_id,
            saved_at: new Date().toISOString(),
            data: normalizeOnlineData(data),
          } satisfies OnlineIndexedPayloadRecord);
          request.onsuccess = () => resolve(true);
          request.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      }),
  );
}

function deleteOnlinePayloadRecord(payload_key: string): Promise<void> {
  online_payload_cache.delete(payload_key);
  return openOnlinePayloadDatabase().then(
    database =>
      new Promise(resolve => {
        if (!database) {
          resolve();
          return;
        }
        try {
          const transaction = database.transaction(ONLINE_PAYLOAD_STORE_NAME, 'readwrite');
          const store = transaction.objectStore(ONLINE_PAYLOAD_STORE_NAME);
          const request = store.delete(payload_key);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        } catch {
          resolve();
        }
      }),
  );
}

function clearAllOnlinePayloadRecords(): Promise<void> {
  online_payload_cache.clear();
  return openOnlinePayloadDatabase().then(
    database =>
      new Promise(resolve => {
        if (!database) {
          resolve();
          return;
        }
        try {
          const transaction = database.transaction(ONLINE_PAYLOAD_STORE_NAME, 'readwrite');
          const store = transaction.objectStore(ONLINE_PAYLOAD_STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        } catch {
          resolve();
        }
      }),
  );
}

function hasInlineOnlinePayload(data: OnlineDataInput | OnlineData | null | undefined) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (String(data.html || '').trim() || String(data.memory_text || '').trim() || String(data.raw_result || '').trim()) {
    return true;
  }
  return Array.isArray(data.entries)
    ? data.entries.some(
        entry =>
          String(entry?.html || '').trim() ||
          String(entry?.memory_text || '').trim() ||
          String(entry?.raw_result || '').trim() ||
          (Array.isArray(entry?.variants)
            ? entry.variants.some(
                variant =>
                  String(variant?.html || '').trim() ||
                  String(variant?.memory_text || '').trim() ||
                  String(variant?.raw_result || '').trim(),
              )
            : false),
      )
    : false;
}

function mergeOnlineDataPayload(
  base: OnlineDataInput | OnlineData | null | undefined,
  payload: OnlineDataInput | OnlineData | null | undefined,
) {
  const normalized_base = normalizeOnlineData(base);
  const normalized_payload = normalizeOnlineData(payload);
  return normalizeOnlineData({
    ...normalized_base,
    ...normalized_payload,
    scope: normalized_base.scope || normalized_payload.scope,
    chat_identity_key: normalized_base.chat_identity_key || normalized_payload.chat_identity_key,
    chat_aliases: normalized_base.chat_aliases?.length ? normalized_base.chat_aliases : normalized_payload.chat_aliases,
    payload_key: normalized_base.payload_key || normalized_payload.payload_key,
    payload_storage: normalized_base.payload_storage || normalized_payload.payload_storage,
  });
}

function queueOnlinePayloadHydration(
  scope_key: string,
  chat_id: string,
  payload_key = getOnlinePayloadStorageKey(scope_key, chat_id),
) {
  if (!payload_key || online_payload_cache.has(payload_key)) {
    return online_payload_cache.get(payload_key) || null;
  }
  if (!supportsOnlinePayloadIndexedDb()) {
    return null;
  }
  const existing_promise = online_payload_load_promises.get(payload_key);
  if (existing_promise) {
    return null;
  }
  const next_promise = readOnlinePayloadRecord(payload_key)
    .then(record => {
      if (!record?.data) {
        return null;
      }
      const normalized = normalizeOnlineData({
        ...record.data,
        payload_key,
        payload_storage: 'indexeddb',
      });
      online_payload_cache.set(payload_key, normalized);
      if (current_iframe_document) {
        renderOnlineContent(current_iframe_document);
      }
      return normalized;
    })
    .finally(() => {
      online_payload_load_promises.delete(payload_key);
    });
  online_payload_load_promises.set(payload_key, next_promise);
  return null;
}

function queueOnlinePayloadMigration(
  scope_key: string,
  chat_id: string,
  data: OnlineDataInput | OnlineData | null | undefined,
) {
  const payload_key = getOnlinePayloadStorageKey(scope_key, chat_id);
  if (
    !supportsOnlinePayloadIndexedDb() ||
    !payload_key ||
    !data ||
    typeof data !== 'object' ||
    String(data.payload_storage || '') === 'indexeddb' ||
    !hasInlineOnlinePayload(data) ||
    online_payload_migration_keys.has(payload_key)
  ) {
    return;
  }
  online_payload_migration_keys.add(payload_key);
  const normalized = normalizeOnlineData({
    ...data,
    payload_key,
    payload_storage: 'indexeddb',
  });
  void writeOnlinePayloadRecord(payload_key, scope_key, chat_id, normalized)
    .then(saved => {
      if (!saved) {
        return;
      }
      const compact = createOnlineDataStorageSnapshot(normalized);
      writeJsonStorage(getOnlineChatStorageKey(scope_key, chat_id), compact);
      if (current_iframe_document) {
        updateText(
          current_iframe_document,
          '[data-online-storage-summary]',
          getOnlineStorageSummaryText(getSettings().online_storage.limit_mb),
        );
      }
    })
    .finally(() => {
      online_payload_migration_keys.delete(payload_key);
    });
}

function getOnlineScopeReadKeys(scope_info = getCurrentOnlineScopeInfo()) {
  return [scope_info.scope_key, ...(scope_info.scope_aliases || [])]
    .map(key => String(key || '').trim())
    .filter(Boolean)
    .filter((key, index, list) => list.indexOf(key) === index);
}

function readLegacyOnlineDataStore(): OnlineDataStore {
  const global_store = readGlobalVariableValue(ONLINE_DATA_STORE_KEY, null);
  const local_store = readJsonStorage(`${SCRIPT_ID}-${ONLINE_DATA_STORE_KEY}`, null);
  const old_global_store = readGlobalVariableValueFromRoot(OLD_VARIABLE_ROOT_KEY, OLD_ONLINE_DATA_STORE_KEY, null);
  const old_local_store = readJsonStorage(`${OLD_SCRIPT_ID}-${OLD_ONLINE_DATA_STORE_KEY}`, null);
  return (
    global_store && typeof global_store === 'object'
      ? global_store
      : local_store && typeof local_store === 'object'
        ? local_store
        : old_global_store && typeof old_global_store === 'object'
          ? old_global_store
          : old_local_store && typeof old_local_store === 'object'
            ? old_local_store
            : {}
  ) as OnlineDataStore;
}

function readLegacyOnlineChatIndex(): OnlineChatIndexItem[] {
  const global_index = readGlobalVariableValue(ONLINE_CHAT_INDEX_KEY, null);
  const local_index = readJsonStorage(`${SCRIPT_ID}-${ONLINE_CHAT_INDEX_KEY}`, null);
  const old_global_index = readGlobalVariableValueFromRoot(OLD_VARIABLE_ROOT_KEY, OLD_ONLINE_CHAT_INDEX_KEY, null);
  const old_local_index = readJsonStorage(`${OLD_SCRIPT_ID}-${OLD_ONLINE_CHAT_INDEX_KEY}`, null);
  return (
    Array.isArray(global_index)
      ? global_index
      : Array.isArray(local_index)
        ? local_index
        : Array.isArray(old_global_index)
          ? old_global_index
          : Array.isArray(old_local_index)
            ? old_local_index
            : []
  ) as OnlineChatIndexItem[];
}

function clearLegacyOnlineDataStore() {
  writeGlobalVariableValue(ONLINE_DATA_STORE_KEY, {});
  writeGlobalVariableValue(ONLINE_CHAT_INDEX_KEY, []);
  const global_variables = getVariableTable({ type: 'global' });
  if (global_variables) {
    const old_root =
      global_variables[OLD_VARIABLE_ROOT_KEY] && typeof global_variables[OLD_VARIABLE_ROOT_KEY] === 'object'
        ? { ...(global_variables[OLD_VARIABLE_ROOT_KEY] as Record<string, unknown>) }
        : null;
    if (old_root) {
      delete old_root[OLD_ONLINE_DATA_STORE_KEY];
      delete old_root[OLD_ONLINE_CHAT_INDEX_KEY];
      replaceVariableTable(
        {
          ...global_variables,
          [OLD_VARIABLE_ROOT_KEY]: old_root,
        },
        { type: 'global' },
      );
    }
  }
  writeJsonStorage(`${SCRIPT_ID}-${ONLINE_DATA_STORE_KEY}`, {});
  writeJsonStorage(`${SCRIPT_ID}-${ONLINE_CHAT_INDEX_KEY}`, []);
  writeJsonStorage(`${OLD_SCRIPT_ID}-${OLD_ONLINE_DATA_STORE_KEY}`, {});
  writeJsonStorage(`${OLD_SCRIPT_ID}-${OLD_ONLINE_CHAT_INDEX_KEY}`, []);
}

function readOnlineChatIndexForScopeKey(scope_key: string): OnlineChatIndexItem[] {
  return readJsonStorage<OnlineChatIndexItem[]>(getOnlineScopeStorageKey(scope_key), []);
}

function readOnlineChatIndex(scope_info = getCurrentOnlineScopeInfo()): OnlineChatIndexItem[] {
  const merged = new Map<string, OnlineChatIndexItem>();
  getOnlineScopeReadKeys(scope_info).forEach(scope_key => {
    readOnlineChatIndexForScopeKey(scope_key).forEach(item => {
      const chat_id = String(item?.chat_id || '').trim();
      if (!chat_id) {
        return;
      }
      const existing = merged.get(chat_id);
      if (!existing || String(item?.updated_at || '').localeCompare(String(existing.updated_at || '')) > 0) {
        merged.set(chat_id, {
          ...item,
          chat_id,
          scope: scope_info,
        });
      }
    });
  });
  return [...merged.values()];
}

function writeOnlineChatIndex(index: OnlineChatIndexItem[], scope_info = getCurrentOnlineScopeInfo()) {
  const next_index = Array.isArray(index) ? index : [];
  writeJsonStorage(getOnlineScopeStorageKey(scope_info.scope_key), next_index);
  (scope_info.scope_aliases || []).forEach(alias_key => {
    host_window.localStorage.removeItem(getOnlineScopeStorageKey(alias_key));
  });
}

function migrateLegacyOnlineStoreIfNeeded() {
  const legacy_store = readLegacyOnlineDataStore();
  const legacy_index = readLegacyOnlineChatIndex();
  const legacy_chat_ids = new Set([
    ...Object.keys(legacy_store || {}),
    ...legacy_index.map(item => String(item?.chat_id || '')).filter(Boolean),
  ]);
  if (!legacy_chat_ids.size) {
    return;
  }
  const grouped_by_scope = new Map<string, { scope: OnlineScopeInfo; items: OnlineChatIndexItem[] }>();
  legacy_chat_ids.forEach(chat_id => {
    const raw_data = legacy_store?.[chat_id];
    if (!raw_data || typeof raw_data !== 'object') {
      return;
    }
    const normalized = normalizeOnlineData(raw_data);
    const scope = (normalized.scope || legacy_index.find(item => item?.chat_id === chat_id)?.scope) as
      | OnlineScopeInfo
      | undefined;
    if (!scope) {
      return;
    }
    const scope_key = String(scope?.scope_key || '').trim();
    if (!scope_key) {
      return;
    }
    writeJsonStorage(getOnlineChatStorageKey(scope_key, chat_id), normalized);
    const current_group: { scope: OnlineScopeInfo; items: OnlineChatIndexItem[] } = grouped_by_scope.get(scope_key) || {
      scope,
      items: [] as OnlineChatIndexItem[],
    };
    current_group.items.push({
      chat_id,
      title: normalized.active_entry?.title || normalized.entries.at(-1)?.title || chat_id,
      scope,
      updated_at:
        normalized.entries.map(entry => entry.updated_at || '').sort().at(-1) ||
        legacy_index.find(item => item?.chat_id === chat_id)?.updated_at ||
        new Date().toISOString(),
    });
    grouped_by_scope.set(scope_key, current_group);
  });
  grouped_by_scope.forEach(group => {
    writeOnlineChatIndex(group.items, group.scope);
  });
  clearLegacyOnlineDataStore();
}

function readOnlineDataStore(scope_info = getCurrentOnlineScopeInfo()): OnlineDataStore {
  migrateLegacyOnlineStoreIfNeeded();
  const store: OnlineDataStore = {};
  getOnlineScopeReadKeys(scope_info).forEach(scope_key => {
    readOnlineChatIndexForScopeKey(scope_key).forEach(item => {
      const chat_id = String(item?.chat_id || '').trim();
      if (!chat_id) {
        return;
      }
      const data = readJsonStorage<OnlineData | OnlineDataInput | null>(getOnlineChatStorageKey(scope_key, chat_id), null);
      if (!data || typeof data !== 'object') {
        return;
      }
      const payload_key = String(data.payload_key || getOnlinePayloadStorageKey(scope_key, chat_id));
      const cached_payload = payload_key ? online_payload_cache.get(payload_key) : null;
      const resolved =
        cached_payload && String(data.payload_storage || '') === 'indexeddb'
          ? mergeOnlineDataPayload(data, cached_payload)
          : data;
      if (String(data.payload_storage || '') === 'indexeddb' && !cached_payload) {
        queueOnlinePayloadHydration(scope_key, chat_id, payload_key);
      } else if (String(data.payload_storage || '') !== 'indexeddb' && hasInlineOnlinePayload(data)) {
        queueOnlinePayloadMigration(scope_key, chat_id, data);
      }
      const existing = store[chat_id];
      if (!existing) {
        store[chat_id] = resolved;
        return;
      }
      const existing_normalized = normalizeOnlineData(existing);
      const data_normalized = normalizeOnlineData(resolved);
      const existing_updated_at =
        existing_normalized.entries.map(entry => entry.updated_at || '').sort().at(-1) || existing_normalized.updated_at || '';
      const data_updated_at =
        data_normalized.entries.map(entry => entry.updated_at || '').sort().at(-1) || data_normalized.updated_at || '';
      if (String(data_updated_at).localeCompare(String(existing_updated_at)) > 0) {
        store[chat_id] = resolved;
      }
    });
  });
  return store;
}

function createOnlineVariantStorageSnapshot(variant: OnlineVariant | Partial<OnlineVariant> | null | undefined) {
  const normalized = createOnlineVariant(variant || {});
  return {
    ...normalized,
    raw_result: '',
  };
}

function createOnlineVariantMetaSnapshot(variant: OnlineVariant | Partial<OnlineVariant> | null | undefined) {
  const normalized = createOnlineVariant(variant || {});
  return {
    ...normalized,
    html: '',
    memory_text: '',
    raw_result: '',
  };
}

function createOnlineEntryStorageSnapshot(
  entry: OnlineEntry | Partial<OnlineEntry> | null | undefined,
  options: { preserve_payload?: boolean } = {},
): OnlineEntry {
  const source = entry || {};
  const preserve_payload = Boolean(options.preserve_payload);
  const variants = Array.isArray(source.variants) && source.variants.length
    ? source.variants.map(variant =>
        preserve_payload ? createOnlineVariantStorageSnapshot(variant) : createOnlineVariantMetaSnapshot(variant),
      )
    : [
        (preserve_payload ? createOnlineVariantStorageSnapshot : createOnlineVariantMetaSnapshot)({
          id: source.variant_id || 'variant-1',
          source_swipe_id: source.source_swipe_id ?? source.swipe_id ?? 0,
          source_message_signature: source.source_message_signature || '',
          html: source.html || '',
          memory_text: source.memory_text || '',
          raw_result: '',
          updated_at: source.updated_at || '',
          prompt_name: source.prompt_name || '',
          detail_prompt_name: source.detail_prompt_name || '',
          title: source.title || '',
        }),
      ];
  const active_variant =
    variants.find(variant => variant.id === source.active_variant_id) || variants.at(-1) || createOnlineVariant();
  return {
    id: String(source.id || source.entry_key || getOnlineEntryKey(source.message_id)),
    entry_key: String(source.entry_key || getOnlineEntryKey(source.message_id)),
    message_key: String(source.message_key || source.entry_key || getOnlineEntryKey(source.message_id)),
    message_id: source.message_id ?? 'unknown',
    swipe_id: Number.isFinite(Number(source.swipe_id)) ? Number(source.swipe_id) : 0,
    source_swipe_id: Number.isFinite(Number(source.source_swipe_id)) ? Number(source.source_swipe_id) : undefined,
    source_message_signature: String(source.source_message_signature || active_variant.source_message_signature || ''),
    message_count: Number(source.message_count || 0),
    title: String(source.title || active_variant.title || `页面 @ 楼层 ${source.message_id ?? 'unknown'}`),
    favorite: Boolean(source.favorite),
    variants,
    active_variant_id: String(active_variant.id || source.active_variant_id || 'variant-1'),
    html: preserve_payload ? String(active_variant.html || '') : '',
    memory_text: preserve_payload ? String(active_variant.memory_text || '') : '',
    raw_result: '',
    updated_at: String(active_variant.updated_at || source.updated_at || ''),
    prompt_name: String(active_variant.prompt_name || source.prompt_name || ''),
    detail_prompt_name: String(active_variant.detail_prompt_name || source.detail_prompt_name || ''),
  };
}

function createOnlineDataStorageSnapshot(data: OnlineData | OnlineDataInput | null | undefined): OnlineData {
  const normalized = normalizeOnlineData(data);
  const should_use_indexeddb = supportsOnlinePayloadIndexedDb();
  const normalized_active_entry_id = normalized.entries.some(entry => entry.id === normalized.active_entry_id)
    ? normalized.active_entry_id
    : normalized.entries.at(-1)?.id || '';
  const payload_key =
    normalized.payload_key ||
    getOnlinePayloadStorageKey(
      normalized.scope?.scope_key || getCurrentOnlineScopeInfo().scope_key,
      normalized.chat_identity_key || getCurrentChatStorageId(),
    );
  const active_entry_id = normalized_active_entry_id;
  const entries = normalized.entries.map(entry =>
    createOnlineEntryStorageSnapshot(entry, {
      preserve_payload: !should_use_indexeddb || entry.id === normalized_active_entry_id,
    }),
  );
  const active_entry = entries.find(entry => entry.id === active_entry_id) || entries.at(-1) || null;
  return normalizeOnlineSelectionMaps(
    normalizeOnlineData({
      ...normalized,
      html: should_use_indexeddb ? String(active_entry?.html || normalized.html || '') : normalized.html,
      memory_text: should_use_indexeddb
        ? String(active_entry?.memory_text || normalized.memory_text || '')
        : normalized.memory_text,
      raw_result: '',
      entries,
      active_entry_id,
      active_entry,
      payload_key,
      payload_storage: should_use_indexeddb ? 'indexeddb' : 'inline',
    }),
  );
}

function writeOnlineDataStore(store: OnlineDataStore, scope_info = getCurrentOnlineScopeInfo()) {
  const next_store = store && typeof store === 'object' ? store : {};
  const previous_chat_locations = new Map<string, Set<string>>();
  getOnlineScopeReadKeys(scope_info).forEach(scope_key => {
    readOnlineChatIndexForScopeKey(scope_key).forEach(item => {
      const chat_id = String(item?.chat_id || '').trim();
      if (!chat_id) {
        return;
      }
      const locations = previous_chat_locations.get(chat_id) || new Set<string>();
      locations.add(scope_key);
      previous_chat_locations.set(chat_id, locations);
    });
  });
  const next_index: OnlineChatIndexItem[] = [];
  let succeeded = true;
  Object.entries(next_store).forEach(([chat_id, data]) => {
    if (!data || typeof data !== 'object') {
      return;
    }
    const payload_key = getOnlinePayloadStorageKey(scope_info.scope_key, chat_id);
    const normalized = normalizeOnlineData(
      attachCurrentOnlineScope({
        ...data,
        scope: data.scope || scope_info,
        payload_key,
        payload_storage: supportsOnlinePayloadIndexedDb() ? 'indexeddb' : 'inline',
      }),
    );
    const persisted = createOnlineDataStorageSnapshot(normalized);
    const write_ok = writeJsonStorage(getOnlineChatStorageKey(scope_info.scope_key, chat_id), persisted);
    succeeded = succeeded && write_ok;
    if (supportsOnlinePayloadIndexedDb()) {
      void writeOnlinePayloadRecord(payload_key, scope_info.scope_key, chat_id, normalized).then(payload_saved => {
        if (!payload_saved) {
          appendRunLog('缓存', 'IndexedDB 写入失败，已保留轻量快照，建议稍后手动清理并重试。', {
            chat_id,
            payload_key,
          });
        }
      });
    }
    next_index.push({
      chat_id,
      title: normalized.active_entry?.title || normalized.entries.at(-1)?.title || chat_id,
      scope: normalized.scope || scope_info,
      updated_at: normalized.entries.map(entry => entry.updated_at || '').sort().at(-1) || normalized.updated_at || '',
    });
    previous_chat_locations.delete(chat_id);
  });
  previous_chat_locations.forEach((scope_keys, chat_id) => {
    scope_keys.forEach(scope_key => {
      host_window.localStorage.removeItem(getOnlineChatStorageKey(scope_key, chat_id));
      void deleteOnlinePayloadRecord(getOnlinePayloadStorageKey(scope_key, chat_id));
    });
  });
  succeeded = writeJsonStorage(getOnlineScopeStorageKey(scope_info.scope_key), next_index) && succeeded;
  (scope_info.scope_aliases || []).forEach(alias_key => {
    host_window.localStorage.removeItem(getOnlineScopeStorageKey(alias_key));
  });
  return succeeded;
}

function registerOnlineChatIndex(chat_id: string, data: OnlineData) {
  const scope_info = data?.scope || getCurrentOnlineScopeInfo();
  const index = readOnlineChatIndex(scope_info);
  const title = data?.active_entry?.title || data?.entries?.at(-1)?.title || chat_id;
  const next_item = {
    chat_id,
    title: String(title || chat_id),
    scope: scope_info,
    updated_at: new Date().toISOString(),
  };
  writeOnlineChatIndex([...index.filter(item => item?.chat_id !== chat_id), next_item], scope_info);
}

function unregisterOnlineChatIndex(chat_id: string) {
  const scope_info = getCurrentOnlineScopeInfo();
  writeOnlineChatIndex(
    readOnlineChatIndex(scope_info).filter(item => item?.chat_id !== chat_id),
    scope_info,
  );
}

function getEmptyOnlineData(): OnlineData {
  return {
    html: '',
    memory_text: '',
    raw_result: '',
    updated_at: '',
    prompt_name: '',
    detail_prompt_name: '',
    entries: [],
    active_entry_id: '',
    selected_entry_by_message: {},
    selected_variant_by_message: {},
    payload_key: '',
    payload_storage: supportsOnlinePayloadIndexedDb() ? 'indexeddb' : 'inline',
  };
}

function getMessageSwipeId(message: OnlineMessage | Partial<OnlineEntry> | null | undefined) {
  const online_message = message as OnlineMessage | null | undefined;
  const swipe_id =
    message?.swipe_id ?? online_message?.swipeId ?? online_message?.extra?.swipe_id ?? online_message?.data?.swipe_id;
  return Number.isFinite(Number(swipe_id)) ? Number(swipe_id) : 0;
}

function getOnlineEntryKey(
  message_or_id: Pick<OnlineMessage, 'message_id'> | OnlineMessageId | null | undefined,
  _swipe_id?: unknown,
) {
  const message_id =
    typeof message_or_id === 'object' && message_or_id !== null ? message_or_id.message_id : message_or_id;
  return String(message_id ?? 'unknown');
}

function getOnlineEntryFallbackKey(message_id: OnlineMessageId | null | undefined) {
  return getOnlineEntryKey(message_id);
}

function getNextOnlineVariantId(entry: Pick<OnlineEntry, 'variants'> | null | undefined) {
  const next_index = Array.isArray(entry?.variants) ? entry.variants.length + 1 : 1;
  return `variant-${next_index}`;
}

function createOnlineVariant(data: Partial<OnlineVariant> & { swipe_id?: unknown } = {}): OnlineVariant {
  return {
    id: data.id || 'variant-1',
    source_swipe_id: Number.isFinite(Number(data.source_swipe_id ?? data.swipe_id))
      ? Number(data.source_swipe_id ?? data.swipe_id)
      : 0,
    source_message_signature: String(data.source_message_signature || ''),
    html: String(data.html || ''),
    title: String(data.title || extractOnlineTitle(data) || ''),
    memory_text: sanitizeMemoryText(data.memory_text || ''),
    raw_result: String(data.raw_result || ''),
    updated_at: data.updated_at || new Date().toISOString(),
    prompt_name: String(data.prompt_name || ''),
    detail_prompt_name: String(data.detail_prompt_name || ''),
  };
}

function getEntryActiveVariant(entry: OnlineEntry | null | undefined): OnlineVariant | null {
  if (!entry?.variants?.length) {
    return null;
  }
  return entry.variants.find(variant => variant.id === entry.active_variant_id) || entry.variants.at(-1) || null;
}

function getChatMetadataStore(): OnlineData | null {
  const context = getSillyTavernContext();
  const metadata = context?.chatMetadata as Record<string, OnlineData | undefined> | undefined;
  if (!metadata) {
    return null;
  }

  if (!metadata[SCRIPT_ID]) {
    metadata[SCRIPT_ID] = getEmptyOnlineData();
  }
  return metadata[SCRIPT_ID];
}

function persistChatMetadata() {
  const context = getSillyTavernContext();
  try {
    if (typeof context?.updateChatMetadata === 'function') {
      context.updateChatMetadata({ [SCRIPT_ID]: getChatMetadataStore() }, false);
    }
    if (typeof context?.saveMetadata === 'function') {
      context.saveMetadata();
    } else if (typeof context?.saveSettingsDebounced === 'function') {
      context.saveSettingsDebounced();
    }
  } catch (error) {
    console.warn('[LoreFrame] 保存聊天 metadata 失败', error);
  }
}

function normalizeOnlineData(data: OnlineDataInput | OnlineData | null | undefined): OnlineData {
  const fallback = getEmptyOnlineData();
  const payload_storage: OnlineData['payload_storage'] =
    data?.payload_storage === 'indexeddb' ? 'indexeddb' : 'inline';
  const normalized = {
    ...fallback,
    ...(data || {}),
    scope: data?.scope && typeof data.scope === 'object' ? data.scope : null,
    entries: Array.isArray(data?.entries) ? data.entries : [],
    chat_identity_key: String(data?.chat_identity_key || ''),
    chat_aliases: Array.isArray(data?.chat_aliases) ? normalizeChatAliasList(data.chat_aliases) : [],
    payload_key: String(data?.payload_key || ''),
    payload_storage,
  };
  const grouped_entries = new Map<string, OnlineEntry>();
  normalized.entries.forEach((entry: Partial<OnlineEntry> | OnlineEntry) => {
    const message_id = entry.message_id ?? 'unknown';
    const swipe_id = getMessageSwipeId(entry);
    const entry_key = getOnlineEntryKey(message_id);
    const variants =
      Array.isArray(entry.variants) && entry.variants.length
        ? entry.variants.map((variant, index) =>
            createOnlineVariant({
              ...variant,
              id: variant.id || `variant-${index + 1}`,
              source_swipe_id: variant.source_swipe_id ?? variant.swipe_id ?? swipe_id,
              source_message_signature: variant.source_message_signature || entry.source_message_signature || '',
            }),
          )
        : [
            createOnlineVariant({
              id: entry.variant_id || 'variant-1',
              source_swipe_id: entry.source_swipe_id ?? entry.swipe_id ?? swipe_id,
              source_message_signature: entry.source_message_signature || '',
              html: entry.html || '',
              memory_text: entry.memory_text || '',
              raw_result: entry.raw_result || '',
              updated_at: entry.updated_at || '',
              prompt_name: entry.prompt_name || '',
              detail_prompt_name: entry.detail_prompt_name || '',
            }),
          ];
    const active_variant_id = variants.some(variant => variant.id === entry.active_variant_id)
      ? String(entry.active_variant_id || '')
      : variants.at(-1)?.id || '';
    const active_variant =
      variants.find((variant: OnlineVariant) => variant.id === active_variant_id) || variants.at(-1) || null;
    const normalized_entry: OnlineEntry = {
      id: entry_key,
      entry_key,
      message_key: entry_key,
      message_id,
      swipe_id,
      source_message_signature: String(entry.source_message_signature || active_variant?.source_message_signature || ''),
      message_count: Number(entry.message_count || 0),
      title: String(
        active_variant?.title || extractOnlineTitle(active_variant) || entry.title || `页面 @ 楼层 ${message_id}`,
      ),
      favorite: Boolean(entry.favorite),
      variants,
      active_variant_id,
      html: String(active_variant?.html || ''),
      memory_text: String(active_variant?.memory_text || ''),
      raw_result: String(active_variant?.raw_result || ''),
      updated_at: active_variant?.updated_at || '',
      prompt_name: String(active_variant?.prompt_name || ''),
      detail_prompt_name: String(active_variant?.detail_prompt_name || ''),
    };
    const existing = grouped_entries.get(entry_key);
    if (!existing) {
      grouped_entries.set(entry_key, normalized_entry);
      return;
    }
    const existing_variant_ids = new Set(existing.variants.map((variant: OnlineVariant) => variant.id));
    const merged_variants = [
      ...existing.variants,
      ...variants.map((variant, index) =>
        existing_variant_ids.has(variant.id)
          ? { ...variant, id: `variant-${existing.variants.length + index + 1}` }
          : variant,
      ),
    ];
    const merged_active_variant: OnlineVariant | null =
      variants.find(variant => variant.id === active_variant_id) || merged_variants.at(-1) || active_variant;
    grouped_entries.set(entry_key, {
      ...existing,
      title:
        merged_active_variant?.title ||
        extractOnlineTitle(merged_active_variant) ||
        existing.title ||
        normalized_entry.title,
      favorite: existing.favorite || normalized_entry.favorite,
      variants: merged_variants,
      active_variant_id: merged_active_variant?.id || existing.active_variant_id,
      html: String(merged_active_variant?.html || existing.html || ''),
      memory_text: String(merged_active_variant?.memory_text || existing.memory_text || ''),
      raw_result: String(merged_active_variant?.raw_result || existing.raw_result || ''),
      updated_at: merged_active_variant?.updated_at || existing.updated_at || '',
      prompt_name: String(merged_active_variant?.prompt_name || existing.prompt_name || ''),
      detail_prompt_name: String(merged_active_variant?.detail_prompt_name || existing.detail_prompt_name || ''),
    });
  });
  normalized.entries = [...grouped_entries.values()];
  normalized.selected_entry_by_message =
    normalized.selected_entry_by_message && typeof normalized.selected_entry_by_message === 'object'
      ? normalized.selected_entry_by_message
      : {};
  normalized.selected_variant_by_message =
    normalized.selected_variant_by_message && typeof normalized.selected_variant_by_message === 'object'
      ? normalized.selected_variant_by_message
      : {};
  normalized.entries.forEach((entry: OnlineEntry) => {
    const entry_key = entry.entry_key || getOnlineEntryKey(entry.message_id);
    const legacy_key = entry.message_id;
    const legacy_entry_id = normalized.selected_entry_by_message[legacy_key];
    const legacy_variant_id = normalized.selected_variant_by_message[legacy_key];
    if (!normalized.selected_entry_by_message[entry_key]) {
      normalized.selected_entry_by_message[entry_key] = legacy_entry_id || entry.id;
    }
    if (!normalized.selected_variant_by_message[entry_key]) {
      normalized.selected_variant_by_message[entry_key] = legacy_variant_id || entry.active_variant_id;
    }
  });
  normalized.active_entry_id = normalized.entries.some(entry => entry.id === normalized.active_entry_id)
    ? normalized.active_entry_id
    : normalized.entries[normalized.entries.length - 1]?.id || '';
  return normalized;
}

function saveOnlineData(data: OnlineDataInput | OnlineData): OnlineData {
  const identity = getCurrentChatStorageIdentity();
  const scope = getCurrentOnlineScopeInfo();
  const payload_key = getOnlinePayloadStorageKey(scope.scope_key, identity.storage_id);
  const normalized = normalizeOnlineData({
    ...attachCurrentOnlineScope(data),
    chat_identity_key: identity.storage_id,
    chat_aliases: identity.aliases,
    payload_key,
    payload_storage: supportsOnlinePayloadIndexedDb() ? 'indexeddb' : 'inline',
  });
  const chat_id = identity.storage_id;
  const scope_info = normalized.scope || scope;
  const store = readOnlineDataStore(scope_info);
  const existing_chat_id = findStoredChatKeyForCurrentChat(store, identity);
  if (existing_chat_id && existing_chat_id !== chat_id) {
    delete store[existing_chat_id];
  }
  store[chat_id] = normalized;
  let write_succeeded = writeOnlineDataStore(store, scope_info);
  if (!write_succeeded) {
    const prune_result = pruneOnlineStorageForCurrentScope(Math.min(1, normalizeOnlineStorageLimitMb(getSettings().online_storage.limit_mb)));
    store[chat_id] = normalized;
    write_succeeded = writeOnlineDataStore(store, scope_info);
    if (prune_result.removed_entries > 0) {
      appendRunLog('缓存', '检测到浏览器存储配额不足，已尝试自动瘦身并清理旧页面。', {
        removed_entries: prune_result.removed_entries,
        removed_chats: prune_result.removed_chats,
        freed_bytes: prune_result.freed_bytes,
        usage: prune_result.usage,
      });
    }
  }
  if (!write_succeeded) {
    throw Error('浏览器本地存储空间不足，页面已生成但暂时无法落盘。请先清理未收藏小剧场或降低缓存上限后重试。');
  }
  registerOnlineChatIndex(chat_id, normalized);

  const metadata_store = getChatMetadataStore();
  if (metadata_store && (metadata_store.entries?.length || metadata_store.html || metadata_store.memory_text)) {
    Object.keys(metadata_store).forEach(key => delete metadata_store[key as keyof OnlineData]);
    Object.assign(metadata_store, getEmptyOnlineData());
    persistChatMetadata();
  }
  host_window.localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${chat_id}`);
  const prune_result = pruneOnlineStorageForCurrentScope(getSettings().online_storage.limit_mb);
  if (prune_result.removed_entries > 0) {
    const message = `当前角色缓存已超上限，已自动清理 ${prune_result.removed_entries} 条未收藏小剧场。`;
    appendRunLog('缓存', message, {
      removed_entries: prune_result.removed_entries,
      removed_chats: prune_result.removed_chats,
      freed_bytes: prune_result.freed_bytes,
      usage: prune_result.usage,
    });
    if (current_iframe_document) {
      updateText(current_iframe_document, '[data-runtime-settings-detail]', message);
      updateText(
        current_iframe_document,
        '[data-online-storage-summary]',
        getOnlineStorageSummaryText(getSettings().online_storage.limit_mb, scope_info),
      );
      showInlineToast(current_iframe_document, message);
    }
  } else if (current_iframe_document) {
    updateText(
      current_iframe_document,
      '[data-online-storage-summary]',
      getOnlineStorageSummaryText(getSettings().online_storage.limit_mb, scope_info),
    );
  }
  return normalizeOnlineData(readOnlineDataStore(scope_info)[chat_id] || normalized);
}

function clearCurrentOnlineData(): OnlineData {
  const empty = getEmptyOnlineData();
  const identity = getCurrentChatStorageIdentity();
  const chat_id = identity.storage_id;
  const scope_info = getCurrentOnlineScopeInfo();
  const payload_key = getOnlinePayloadStorageKey(scope_info.scope_key, chat_id);
  const store = readOnlineDataStore(scope_info);
  const existing_chat_id = findStoredChatKeyForCurrentChat(store, identity);
  if (existing_chat_id && existing_chat_id !== chat_id) {
    void deleteOnlinePayloadRecord(getOnlinePayloadStorageKey(scope_info.scope_key, existing_chat_id));
    delete store[existing_chat_id];
  }
  store[chat_id] = {
    ...empty,
    inherit_disabled: true,
    chat_identity_key: chat_id,
    chat_aliases: identity.aliases,
    payload_key,
    payload_storage: supportsOnlinePayloadIndexedDb() ? 'indexeddb' : 'inline',
  };
  writeOnlineDataStore(store, scope_info);
  unregisterOnlineChatIndex(chat_id);
  void deleteOnlinePayloadRecord(payload_key);

  const metadata_store = getChatMetadataStore();
  if (metadata_store) {
    Object.keys(metadata_store).forEach(key => delete metadata_store[key as keyof OnlineData]);
    Object.assign(metadata_store, empty);
    persistChatMetadata();
  }
  host_window.localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${chat_id}`);
  if (current_iframe_document) {
    updateText(
      current_iframe_document,
      '[data-online-storage-summary]',
      getOnlineStorageSummaryText(getSettings().online_storage.limit_mb, scope_info),
    );
  }
  return empty;
}

function clearKnownOnlineStorage() {
  const keys = [];
  for (let index = 0; index < host_window.localStorage.length; index += 1) {
    const key = host_window.localStorage.key(index);
    if (
      key?.startsWith(CHAT_STORAGE_PREFIX) ||
      key?.startsWith(OLD_CHAT_STORAGE_PREFIX) ||
      key?.startsWith(ONLINE_SCOPE_INDEX_STORAGE_PREFIX) ||
      key?.startsWith(ONLINE_SCOPE_CHAT_STORAGE_PREFIX) ||
      key?.startsWith(OLD_ONLINE_SCOPE_INDEX_STORAGE_PREFIX) ||
      key?.startsWith(OLD_ONLINE_SCOPE_CHAT_STORAGE_PREFIX)
    ) {
      keys.push(key);
    }
  }
  keys.forEach(key => host_window.localStorage.removeItem(key));
  void clearAllOnlinePayloadRecords();
  clearLegacyOnlineDataStore();
  writeOnlineDataStore({});
  writeOnlineChatIndex([]);
  clearCurrentOnlineData();
}

function measureStorageStringBytes(text: string) {
  return String(text || '').length * 2;
}

function measureOnlineStorageBytes(value: unknown) {
  return measureStorageStringBytes(JSON.stringify(value ?? null));
}

function measureLocalStorageEntryBytes(key: string, value: string) {
  return measureStorageStringBytes(String(key || '')) + measureStorageStringBytes(String(value || ''));
}

function isLoreFrameStorageKey(key: string) {
  return [
    CHAT_STORAGE_PREFIX,
    OLD_CHAT_STORAGE_PREFIX,
    ONLINE_SCOPE_INDEX_STORAGE_PREFIX,
    ONLINE_SCOPE_CHAT_STORAGE_PREFIX,
    OLD_ONLINE_SCOPE_INDEX_STORAGE_PREFIX,
    OLD_ONLINE_SCOPE_CHAT_STORAGE_PREFIX,
    `${SCRIPT_ID}-`,
    `${OLD_SCRIPT_ID}-`,
  ].some(prefix => key.startsWith(prefix));
}

function getBrowserStorageUsageSummary(): BrowserStorageUsageSummary {
  let total_bytes = 0;
  let loreframe_bytes = 0;
  let total_keys = 0;
  let loreframe_keys = 0;
  for (let index = 0; index < host_window.localStorage.length; index += 1) {
    const key = String(host_window.localStorage.key(index) || '');
    if (!key) {
      continue;
    }
    total_keys += 1;
    const value = String(host_window.localStorage.getItem(key) || '');
    const entry_bytes = measureLocalStorageEntryBytes(key, value);
    total_bytes += entry_bytes;
    if (isLoreFrameStorageKey(key)) {
      loreframe_bytes += entry_bytes;
      loreframe_keys += 1;
    }
  }
  return {
    total_bytes,
    loreframe_bytes,
    other_bytes: Math.max(0, total_bytes - loreframe_bytes),
    total_keys,
    loreframe_keys,
  };
}

function getOnlineStorageUsageSummary(scope_info = getCurrentOnlineScopeInfo()): OnlineStorageUsageSummary {
  const store = readOnlineDataStore(scope_info);
  let total_bytes = 0;
  let favorite_bytes = 0;
  let non_favorite_bytes = 0;
  let total_entries = 0;
  let favorite_entries = 0;
  let non_favorite_entries = 0;
  Object.values(store).forEach(data => {
    const normalized = normalizeOnlineData(data || getEmptyOnlineData());
    total_entries += normalized.entries.length;
    normalized.entries.forEach(entry => {
      const entry_bytes = measureOnlineStorageBytes(entry);
      total_bytes += entry_bytes;
      if (entry.favorite) {
        favorite_entries += 1;
        favorite_bytes += entry_bytes;
      } else {
        non_favorite_entries += 1;
        non_favorite_bytes += entry_bytes;
      }
    });
  });
  return {
    total_bytes,
    favorite_bytes,
    non_favorite_bytes,
    total_entries,
    favorite_entries,
    non_favorite_entries,
    chat_count: Object.keys(store).length,
  };
}

function formatOnlineStorageMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
}

function getOnlineStorageSummaryText(limit_mb = getSettings().online_storage.limit_mb, scope_info = getCurrentOnlineScopeInfo()) {
  const summary = getOnlineStorageUsageSummary(scope_info);
  const browser_summary = getBrowserStorageUsageSummary();
  return `当前角色共 ${summary.chat_count} 个聊天、${summary.total_entries} 条小剧场；未收藏 ${summary.non_favorite_entries} 条，占 ${formatOnlineStorageMegabytes(summary.non_favorite_bytes)} / ${limit_mb} MB。已收藏 ${summary.favorite_entries} 条，占 ${formatOnlineStorageMegabytes(summary.favorite_bytes)}，默认不参与自动清理。当前站点 localStorage 总占用约 ${formatOnlineStorageMegabytes(browser_summary.total_bytes)}，其中 LoreFrame 外壳索引约 ${formatOnlineStorageMegabytes(browser_summary.loreframe_bytes)}，其他脚本/页面约 ${formatOnlineStorageMegabytes(browser_summary.other_bytes)}；小剧场正文主体现优先写入 IndexedDB，以减少 localStorage 配额压力。`;
}

function pruneOnlineStorageForCurrentScope(limit_mb = getSettings().online_storage.limit_mb): OnlineStoragePruneResult {
  const scope_info = getCurrentOnlineScopeInfo();
  const store = readOnlineDataStore(scope_info);
  const limit_bytes = Math.max(1, normalizeOnlineStorageLimitMb(limit_mb)) * 1024 * 1024;
  const usage_before = getOnlineStorageUsageSummary(scope_info);
  if (usage_before.non_favorite_bytes <= limit_bytes) {
    return {
      removed_entries: 0,
      removed_chats: 0,
      freed_bytes: 0,
      usage: usage_before,
    };
  }

  const removable_entries = Object.entries(store).flatMap(([chat_id, data]) =>
    normalizeOnlineData(data || getEmptyOnlineData()).entries
      .filter(entry => !entry.favorite)
      .map(entry => ({
        chat_id,
        entry_id: entry.id,
        updated_at: String(entry.updated_at || '').trim() || '1970-01-01T00:00:00.000Z',
        bytes: measureOnlineStorageBytes(entry),
      })),
  );
  removable_entries.sort(
    (left, right) => left.updated_at.localeCompare(right.updated_at) || left.chat_id.localeCompare(right.chat_id),
  );

  let projected_non_favorite_bytes = usage_before.non_favorite_bytes;
  let removed_entries = 0;
  const touched_chats = new Set<string>();
  for (const target of removable_entries) {
    if (projected_non_favorite_bytes <= limit_bytes) {
      break;
    }
    const current_data = store[target.chat_id];
    if (!current_data || typeof current_data !== 'object') {
      continue;
    }
    const normalized = normalizeOnlineData(current_data);
    const next_entries = normalized.entries.filter(entry => entry.id !== target.entry_id);
    if (next_entries.length === normalized.entries.length) {
      continue;
    }
    removed_entries += 1;
    projected_non_favorite_bytes = Math.max(0, projected_non_favorite_bytes - target.bytes);
    touched_chats.add(target.chat_id);
    if (!next_entries.length) {
      delete store[target.chat_id];
      continue;
    }
    const active_entry_id = next_entries.some(entry => entry.id === normalized.active_entry_id)
      ? normalized.active_entry_id
      : next_entries.at(-1)?.id || '';
    store[target.chat_id] = normalizeOnlineSelectionMaps(
      normalizeOnlineData({
        ...normalized,
        entries: next_entries,
        active_entry_id,
      }),
    );
  }

  writeOnlineDataStore(store, scope_info);
  const next_index = readOnlineChatIndex(scope_info);
  const removed_chats = usage_before.chat_count - next_index.length;
  const usage = getOnlineStorageUsageSummary(scope_info);
  return {
    removed_entries,
    removed_chats,
    freed_bytes: Math.max(0, usage_before.non_favorite_bytes - usage.non_favorite_bytes),
    usage,
  };
}

function resetPersonalSettingsToDefault() {
  const defaults = getDefaultSettings();
  writeScriptVariableValue(PUBLISHED_PROMPTS_KEY, []);
  writeScriptVariableValue(PUBLISHED_SUMMARY_TAGS_KEY, []);
  writeGlobalVariableValue(PERSONAL_SETTINGS_KEY, defaults);
  writeJsonStorage(SETTINGS_STORAGE_KEY, defaults);
  return normalizeSettings(defaults as SettingsInput);
}

function getCurrentOnlineData(): OnlineData & { active_entry: OnlineEntry | null } {
  const data = syncOnlineDataWithCurrentChat('读取当前页面');
  if (String(data.payload_storage || '') === 'indexeddb') {
    const scope_key = data.scope?.scope_key || getCurrentOnlineScopeInfo().scope_key;
    const chat_id = data.chat_identity_key || getCurrentChatStorageId();
    const payload_key = data.payload_key || getOnlinePayloadStorageKey(scope_key, chat_id);
    const cached_payload = online_payload_cache.get(payload_key);
    if (cached_payload) {
      return getCurrentOnlineDataFromResolvedPayload(mergeOnlineDataPayload(data, cached_payload));
    }
    queueOnlinePayloadHydration(scope_key, chat_id, payload_key);
  }
  return getCurrentOnlineDataFromResolvedPayload(data);
}

function getCurrentOnlineDataFromResolvedPayload(data: OnlineData): OnlineData & { active_entry: OnlineEntry | null } {
  const entries = data.entries;
  const active_entry_id = entries.some(entry => entry.id === data.active_entry_id)
    ? data.active_entry_id
    : entries[entries.length - 1]?.id || '';
  const active_entry = entries.find(entry => entry.id === active_entry_id) || entries[entries.length - 1] || null;
  return {
    ...data,
    entries,
    active_entry_id,
    active_entry,
    html: active_entry?.html || data.html || '',
    memory_text: active_entry?.memory_text || data.memory_text || '',
    raw_result: active_entry?.raw_result || data.raw_result || '',
    updated_at: active_entry?.updated_at || data.updated_at || '',
    prompt_name: active_entry?.prompt_name || data.prompt_name || '',
  };
}

function getLatestAssistantMessage(fallback: OnlineMessage | null = null): OnlineMessage | null {
  const latest_assistant = findLatestMessage(getVisibleOnlineMessagesSafely(), 'assistant');
  return latest_assistant || fallback;
}

function getLatestAssistantMessageId(fallback: OnlineMessageId = Date.now()): OnlineMessageId {
  return getLatestAssistantMessage()?.message_id ?? fallback;
}

function attachSwipeIdentityToMessage(
  message: OnlineMessage | null,
  swipe_map: Map<string, OnlineMessage> | null = null,
) {
  if (!message) {
    return message;
  }
  const swipe_message = swipe_map?.get?.(String(message.message_id));
  return {
    ...message,
    swipe_id: getMessageSwipeId(swipe_message || message),
  };
}

function buildSwipeMessageMap(messages: OnlineMessage[] | null = null): Map<string, OnlineMessage> {
  const swiped_messages = messages || getChatMessagesWithSwipesOnlineSafely();
  return new Map((swiped_messages || []).map(message => [String(message.message_id), message] as const));
}

function getMessageWithSwipeById(message_id: OnlineMessageId): OnlineMessage | null {
  return (
    getChatMessagesWithSwipesOnlineSafely().find(message => String(message.message_id) === String(message_id)) ||
    null
  );
}

function getCurrentMessageSwipeId(message_id: OnlineMessageId) {
  return getMessageSwipeId(getMessageWithSwipeById(message_id));
}

function getOnlineSourceMessageSignatureFromText(role: unknown, swipe_id: unknown, text: unknown) {
  const content = String(text || '');
  return [
    String(role || ''),
    String(Number.isFinite(Number(swipe_id)) ? Number(swipe_id) : 0),
    String(content.length),
    content.slice(0, 600),
    content.slice(-600),
  ].join('\u241f');
}

function getMessageSwipeText(message: OnlineMessage | null | undefined, swipe_id = getMessageSwipeId(message)) {
  const index = Number.isFinite(Number(swipe_id)) ? Number(swipe_id) : 0;
  const swipes = Array.isArray(message?.swipes) ? message.swipes : [];
  const swipe_value = swipes[index];
  if (typeof swipe_value === 'string') {
    return swipe_value;
  }
  if (swipe_value && typeof swipe_value === 'object') {
    return String(swipe_value.mes || swipe_value.message || swipe_value.text || '');
  }
  const swipe_data = Array.isArray(message?.swipes_data) ? message.swipes_data[index] : null;
  if (swipe_data && typeof swipe_data === 'object') {
    return String(swipe_data.mes || swipe_data.message || swipe_data.text || '');
  }
  return String(message?.message || '');
}

function getOnlineSourceMessageSignature(
  message: OnlineMessage | null | undefined,
  swipe_id = getMessageSwipeId(message),
) {
  if (!message) {
    return '';
  }
  return getOnlineSourceMessageSignatureFromText(message.role, swipe_id, getMessageSwipeText(message, swipe_id));
}

function getOnlineSourceMessageSignatureSet(message: OnlineMessage | null | undefined) {
  if (!message) {
    return new Set();
  }
  const signatures = new Set([getOnlineSourceMessageSignature(message, getMessageSwipeId(message))]);
  const swipes = Array.isArray(message.swipes) ? message.swipes : [];
  swipes.forEach((_, index) => signatures.add(getOnlineSourceMessageSignature(message, index)));
  return signatures;
}

function buildCurrentMessageIdentityMap(): Map<string, OnlineMessage> {
  const messages = getChatMessagesWithSwipesOnlineSafely();
  return new Map(messages.map(message => [String(message.message_id), message] as const));
}

function normalizeOnlineSelectionMaps(data: OnlineData): OnlineData {
  const valid_entry_ids = new Set(data.entries.map(entry => entry.id));
  const valid_variant_ids = new Set(data.entries.flatMap(entry => (entry.variants || []).map(variant => variant.id)));
  const selected_entry_by_message = Object.fromEntries(
    Object.entries(data.selected_entry_by_message || {}).filter(([, entry_id]) => valid_entry_ids.has(entry_id)),
  );
  const selected_variant_by_message = Object.fromEntries(
    Object.entries(data.selected_variant_by_message || {}).filter(([, variant_id]) =>
      valid_variant_ids.has(variant_id),
    ),
  );
  return {
    ...data,
    selected_entry_by_message,
    selected_variant_by_message,
  };
}

function findStoredChatKeyForCurrentChat(
  store: OnlineDataStore,
  identity = getCurrentChatStorageIdentity(),
): string {
  const alias_set = new Set([identity.storage_id, ...identity.aliases]);
  const direct_match = [...alias_set].find(key => key && store[key]);
  if (direct_match) {
    return direct_match;
  }
  const matched_entry = Object.entries(store).find(([stored_chat_id, data]) => {
    if (!data || typeof data !== 'object') {
      return false;
    }
    const normalized = normalizeOnlineData(data);
    const stored_aliases = new Set([
      stored_chat_id,
      String(normalized.chat_identity_key || ''),
      ...normalizeChatAliasList(normalized.chat_aliases || []),
    ]);
    return [...stored_aliases].some(alias => alias && alias_set.has(alias));
  });
  return matched_entry?.[0] || '';
}

function pruneOnlineDataAgainstCurrentMessages(
  data: OnlineDataInput | OnlineData,
  options: OnlinePruneOptions = {},
): OnlinePruneResult {
  const normalized = normalizeOnlineData(data);
  const strict_signatures = Boolean(options.strict_signatures);
  let message_map: Map<string, OnlineMessage>;
  try {
    message_map = buildCurrentMessageIdentityMap();
  } catch (error) {
    console.warn('[LoreFrame] 同步酒馆楼层失败，暂不清理页面', error);
    return { data: normalized, changed: false, removed_count: 0 };
  }

  let removed_count = 0;
  const entries = normalized.entries
    .map(entry => {
      if (entry.message_id === 'legacy' || entry.message_id === 'unknown') {
        return entry;
      }
      const source_message = message_map.get(String(entry.message_id));
      if (!source_message) {
        removed_count += 1;
        return null;
      }
      const variants = strict_signatures
        ? (entry.variants || []).filter(variant => {
            if (!variant.source_message_signature) {
              return true;
            }
            const keep = getOnlineSourceMessageSignatureSet(source_message).has(variant.source_message_signature);
            if (!keep) {
              removed_count += 1;
            }
            return keep;
          })
        : entry.variants || [];
      if (!variants.length) {
        return null;
      }
      const active_variant = variants.find(variant => variant.id === entry.active_variant_id) || variants.at(-1);
      if (!active_variant) {
        return null;
      }
      return {
        ...entry,
        variants,
        active_variant_id: active_variant.id,
        html: active_variant.html,
        memory_text: active_variant.memory_text,
        raw_result: active_variant.raw_result,
        updated_at: active_variant.updated_at,
        prompt_name: active_variant.prompt_name,
        source_message_signature: active_variant.source_message_signature || entry.source_message_signature || '',
      };
    })
    .filter((entry): entry is OnlineEntry => Boolean(entry));

  const active_entry_id = entries.some(entry => entry.id === normalized.active_entry_id)
    ? normalized.active_entry_id
    : entries.at(-1)?.id || '';
  const next_data = normalizeOnlineSelectionMaps({
    ...normalized,
    entries,
    active_entry_id,
  });
  return {
    data: next_data,
    changed: removed_count > 0 || entries.length !== normalized.entries.length,
    removed_count,
  };
}

function findInheritableOnlineDataForCurrentChat(
  chat_id: string,
  store: OnlineDataStore,
): OnlineInheritedCandidate | null {
  const current_scope = getCurrentOnlineScopeInfo();
  if (!current_scope.scope_key) {
    appendRunLog('监听', '跳过分支继承：无法确认当前角色身份。');
    return null;
  }
  const candidates = Object.entries(store || {})
    .filter(([source_chat_id, data]) => {
      if (source_chat_id === chat_id || !data || typeof data !== 'object') {
        return false;
      }
      const source_scope_key = normalizeOnlineData(data).scope?.scope_key || '';
      return Boolean(source_scope_key) && source_scope_key === current_scope.scope_key;
    })
    .map(([source_chat_id, data]) => {
      const pruned = pruneOnlineDataAgainstCurrentMessages(data || getEmptyOnlineData(), { strict_signatures: true });
      const latest_updated_at =
        pruned.data.entries
          .map(entry => entry.updated_at || '')
          .sort()
          .at(-1) || '';
      return {
        source_chat_id,
        data: normalizeOnlineData({ ...pruned.data, scope: current_scope }),
        match_count: pruned.data.entries.length,
        latest_updated_at,
      };
    })
    .filter(candidate => candidate.match_count > 0)
    .sort(
      (left, right) =>
        right.match_count - left.match_count ||
        String(right.latest_updated_at).localeCompare(String(left.latest_updated_at)),
    );
  return candidates[0] || null;
}

function shouldPruneOnlineDataForReason(reason: unknown) {
  return ['chat_changed', 'message_deleted', 'message_edited', 'message_swipe_deleted'].includes(String(reason || ''));
}

function syncOnlineDataWithCurrentChat(reason = ''): OnlineData {
  const identity = getCurrentChatStorageIdentity();
  const chat_id = identity.storage_id;
  const store = readOnlineDataStore();
  const existing_chat_id = findStoredChatKeyForCurrentChat(store, identity) || chat_id;
  const inherit_disabled = Boolean(store[existing_chat_id]?.inherit_disabled);
  const has_current_store = Boolean(
    store[existing_chat_id]?.entries?.length || store[existing_chat_id]?.html || store[existing_chat_id]?.memory_text,
  );
  let current = normalizeOnlineData(store[existing_chat_id] || getEmptyOnlineData());

  if (existing_chat_id !== chat_id && store[existing_chat_id]) {
    delete store[existing_chat_id];
    store[chat_id] = normalizeOnlineData({
      ...current,
      chat_identity_key: identity.storage_id,
      chat_aliases: identity.aliases,
    });
    current = normalizeOnlineData(store[chat_id]);
    writeOnlineDataStore(store);
  }

  if (!has_current_store && !inherit_disabled) {
    const inherited = findInheritableOnlineDataForCurrentChat(chat_id, store);
    if (inherited?.data?.entries?.length) {
      current = normalizeOnlineData(
        attachCurrentOnlineScope({
          ...inherited.data,
          inherited_from_chat_id: inherited.source_chat_id,
          chat_identity_key: identity.storage_id,
          chat_aliases: identity.aliases,
        }),
      );
      store[chat_id] = current;
      writeOnlineDataStore(store);
      registerOnlineChatIndex(chat_id, current);
      appendRunLog('监听', '已从原聊天窗口同步页面。', {
        reason,
        source_chat_id: inherited.source_chat_id,
        copied_count: current.entries.length,
      });
    }
  }

  if (has_current_store && !current.scope?.scope_key) {
    current = normalizeOnlineData(
      attachCurrentOnlineScope({
        ...current,
        chat_identity_key: identity.storage_id,
        chat_aliases: identity.aliases,
      }),
    );
    store[chat_id] = current;
    writeOnlineDataStore(store);
    registerOnlineChatIndex(chat_id, current);
  }

  if (!shouldPruneOnlineDataForReason(reason)) {
    return current;
  }

  const pruned = pruneOnlineDataAgainstCurrentMessages(current);
  if (!pruned.changed) {
    return pruned.data;
  }
  if (pruned.data.entries.length) {
    store[chat_id] = pruned.data;
    writeOnlineDataStore(store);
    registerOnlineChatIndex(chat_id, pruned.data);
  } else if (inherit_disabled) {
    store[chat_id] = { ...getEmptyOnlineData(), inherit_disabled: true };
    writeOnlineDataStore(store);
    unregisterOnlineChatIndex(chat_id);
  } else {
    delete store[chat_id];
    writeOnlineDataStore(store);
    unregisterOnlineChatIndex(chat_id);
  }
  appendRunLog('监听', '已同步当前酒馆楼层，清理失效页面。', {
    reason,
    removed_count: pruned.removed_count,
  });
  renderSourceJumpButtons();
  return pruned.data.entries.length ? pruned.data : getEmptyOnlineData();
}

function cssEscape(value: unknown) {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(value))
    : String(value).replaceAll('"', '\\"');
}

function findOnlineEntryForMessage(message_id: OnlineMessageId, prefer_current_swipe = true): OnlineEntry | null {
  const data = getCurrentOnlineData();
  const current_swipe_id = getCurrentMessageSwipeId(message_id);
  const entry_key = getOnlineEntryKey(message_id);
  const entry =
    data.entries.find(item => (item.entry_key || getOnlineEntryKey(item.message_id)) === entry_key) ||
    data.entries.filter(item => String(item.message_id) === String(message_id)).at(-1) ||
    null;
  if (
    prefer_current_swipe &&
    entry?.variants?.some(variant => Number(variant.source_swipe_id || 0) === current_swipe_id)
  ) {
    return entry;
  }
  return entry;
}

function scrollToSourceMessage(message_id: OnlineMessageId) {
  const message_element =
    host_document.querySelector(`.mes[mesid="${cssEscape(message_id)}"]`) ||
    host_document.querySelector(`[data-message-id="${cssEscape(message_id)}"]`);
  if (!message_element) {
    return false;
  }
  message_element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  message_element.classList.add(`${SCRIPT_ID}-source-highlight`);
  host_window.setTimeout(() => message_element.classList.remove(`${SCRIPT_ID}-source-highlight`), 1600);
  return true;
}

function ensureHostStyle() {
  if (host_document.getElementById(`${SCRIPT_ID}-host-style`)) {
    return;
  }
  const style = host_document.createElement('style');
  style.id = `${SCRIPT_ID}-host-style`;
  style.textContent = `
      .${SCRIPT_ID}-source-highlight {
        outline: 2px solid #4f7968;
        outline-offset: 3px;
      }
    `;
  host_document.head.appendChild(style);
}

function renderSourceJumpButtons() {
  const host_window_with_runtime = host_window as Window & {
    [key: string]: { openEntryForMessage?: (message_id: OnlineMessageId) => void } | undefined;
  };
  ensureHostStyle();
  host_document.querySelectorAll(`[data-${SCRIPT_ID}-source-button]`).forEach(button => button.remove());
  const data = getCurrentOnlineData();
  const message_ids = [...new Set(data.entries.map(entry => entry.message_id))].filter(id => id !== 'unknown');
  message_ids.forEach(message_id => {
    const entry = findOnlineEntryForMessage(message_id, false);
    const message_element =
      host_document.querySelector(`.mes[mesid="${cssEscape(message_id)}"]`) ||
      host_document.querySelector(`[data-message-id="${cssEscape(message_id)}"]`);
    if (!entry || !message_element || message_element.querySelector(`[data-${SCRIPT_ID}-source-button]`)) {
      return;
    }
    const button = host_document.createElement('div');
    button.setAttribute(`data-${SCRIPT_ID}-source-button`, '1');
    button.className = 'mes_button fa-solid fa-map-location-dot interactable';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.title = '打开这层对应的页面';
    button.setAttribute('aria-label', '打开这层对应的页面');
    const open_linked_entry = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      host_window_with_runtime[SCRIPT_ID]?.openEntryForMessage?.(message_id);
    };
    button.addEventListener('click', open_linked_entry);
    button.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        open_linked_entry(event);
      }
    });
    const target = message_element.querySelector('.mes_buttons .extraMesButtons, .extraMesButtons');
    if (!target) {
      return;
    }
    target.appendChild(button);
  });
}

function getLatestAssistantSnapshot() {
  const latest_assistant = getLatestAssistantMessage();
  if (!latest_assistant) {
    return {
      message_id: null,
      message: '',
      length: 0,
    };
  }
  const message = String(latest_assistant.message || '');
  return {
    message_id: latest_assistant.message_id,
    message,
    length: message.length,
  };
}

function getVisibleMessageById(message_id: OnlineMessageId): OnlineMessage | null {
  return (
    getVisibleOnlineMessagesSafely().find(message => String(message.message_id) === String(message_id)) ||
    null
  );
}

function getAssistantGenerationTargetMessage() {
  const received_message =
    body_generation_received_message_id != null ? getVisibleMessageById(body_generation_received_message_id) : null;
  if (received_message?.role === 'assistant') {
    return received_message;
  }
  return getLatestAssistantMessage();
}

function getLatestUserMessageId() {
  return findLatestMessage(getVisibleOnlineMessagesSafely(), 'user')?.message_id ?? null;
}

function resetBodyGenerationState() {
  host_window.clearTimeout(body_generation_check_timer);
  host_window.clearInterval(body_generation_poll_timer);
  body_generation_check_timer = 0;
  body_generation_poll_timer = 0;
  pending_body_generation = false;
  body_generation_received = false;
  body_generation_start_snapshot = null;
  body_generation_user_message_id = null;
  body_generation_received_message_id = null;
  body_generation_finished = false;
  body_generation_check_attempts = 0;
  body_generation_last_signal_at = 0;
  body_generation_started_at = 0;
  body_generation_stable_key = '';
  body_generation_stable_since = 0;
}

function markBodyGenerationPending(user_message_id: OnlineMessageId | null = null) {
  if (pending_body_generation) {
    body_generation_last_signal_at = Date.now();
    if (user_message_id != null) {
      body_generation_user_message_id = user_message_id;
    }
    return;
  }
  pending_body_generation = true;
  body_generation_received = false;
  body_generation_start_snapshot = getLatestAssistantSnapshot();
  body_generation_user_message_id = user_message_id ?? getLatestUserMessageId();
  body_generation_received_message_id = null;
  body_generation_finished = false;
  body_generation_check_attempts = 0;
  body_generation_last_signal_at = Date.now();
  body_generation_started_at = Date.now();
  body_generation_stable_key = '';
  body_generation_stable_since = 0;
}

function hasSuccessfulBodyGeneration() {
  const target_message = getAssistantGenerationTargetMessage();
  const latest_snapshot = target_message
    ? {
        message_id: target_message.message_id,
        message: String(target_message.message || ''),
        length: String(target_message.message || '').length,
      }
    : getLatestAssistantSnapshot();
  if (latest_snapshot.message_id == null || !latest_snapshot.message.trim()) {
    return false;
  }
  if (
    body_generation_user_message_id != null &&
    Number(latest_snapshot.message_id) <= Number(body_generation_user_message_id)
  ) {
    return false;
  }
  if (!body_generation_start_snapshot || body_generation_start_snapshot.message_id == null) {
    return latest_snapshot.message.trim().length > 0;
  }
  if (
    body_generation_finished &&
    body_generation_received &&
    body_generation_received_message_id != null &&
    String(body_generation_received_message_id) === String(latest_snapshot.message_id)
  ) {
    return true;
  }
  return (
    Number(latest_snapshot.message_id) > Number(body_generation_start_snapshot.message_id) ||
    (String(latest_snapshot.message_id) === String(body_generation_start_snapshot.message_id) &&
      latest_snapshot.message !== body_generation_start_snapshot.message &&
      latest_snapshot.length > body_generation_start_snapshot.length)
  );
}

function saveOnlineEntryForCurrentChat(
  data: Partial<OnlineEntry> & Partial<OnlineVariant> & { message_id?: OnlineMessageId; swipe_id?: unknown },
): OnlineData {
  const current = getCurrentOnlineData();
  const message_id = data.message_id ?? getLatestAssistantMessageId();
  const swipe_id = Number.isFinite(Number(data.swipe_id)) ? Number(data.swipe_id) : 0;
  const entry_key = getOnlineEntryKey(message_id);
  const message_count = Number(data.message_count || 0);
  const existing_entry = current.entries.find(
    entry => String(entry.entry_key || getOnlineEntryKey(entry.message_id)) === String(entry_key),
  );
  const variant_id = getNextOnlineVariantId(existing_entry);
  const variant = createOnlineVariant({
    id: variant_id,
    source_swipe_id: swipe_id,
    source_message_signature: data.source_message_signature || '',
    html: data.html || '',
    memory_text: data.memory_text || '',
    raw_result: data.raw_result || '',
    updated_at: new Date().toISOString(),
    prompt_name: data.prompt_name || '',
    detail_prompt_name: data.detail_prompt_name || '',
    title: data.title || extractOnlineTitle(data) || '',
  });
  const entry = existing_entry || {
    id: entry_key,
    entry_key,
    message_key: entry_key,
    message_id,
    swipe_id,
    source_message_signature: data.source_message_signature || '',
    message_count,
    title: variant.title || data.title || extractOnlineTitle(data) || `页面 @ 楼层 ${message_id}`,
    favorite: false,
    variants: [],
    active_variant_id: '',
  };
  const next_entry: OnlineEntry = {
    ...entry,
    id: entry_key,
    entry_key,
    message_key: entry_key,
    message_id,
    swipe_id,
    source_message_signature: variant.source_message_signature || entry.source_message_signature || '',
    message_count: entry.message_count || message_count,
    title: variant.title || data.title || extractOnlineTitle(data) || entry.title || `页面 @ 楼层 ${message_id}`,
    variants: [...(entry.variants || []), variant],
    active_variant_id: variant.id,
    html: variant.html,
    memory_text: variant.memory_text,
    raw_result: variant.raw_result,
    updated_at: variant.updated_at,
    prompt_name: variant.prompt_name,
    detail_prompt_name: variant.detail_prompt_name,
  };
  const entries = existing_entry
    ? current.entries.map(old_entry => (old_entry.id === existing_entry.id ? next_entry : old_entry))
    : [...current.entries.filter(old_entry => old_entry.id !== 'legacy'), next_entry];
  const next = {
    ...current,
    html: next_entry.html,
    memory_text: next_entry.memory_text,
    raw_result: next_entry.raw_result,
    updated_at: next_entry.updated_at,
    prompt_name: next_entry.prompt_name,
    detail_prompt_name: next_entry.detail_prompt_name,
    active_entry_id: next_entry.id,
    selected_entry_by_message: {
      ...current.selected_entry_by_message,
      [entry_key]: next_entry.id,
    },
    selected_variant_by_message: {
      ...current.selected_variant_by_message,
      [entry_key]: variant.id,
    },
    entries,
  };
  return saveOnlineData(next);
}

function setActiveOnlineEntry(entry_id: string) {
  const current = getCurrentOnlineData();
  const selected_entry = current.entries.find(entry => entry.id === entry_id);
  const next = {
    ...current,
    active_entry_id: entry_id,
    selected_entry_by_message: selected_entry
      ? {
          ...current.selected_entry_by_message,
          [selected_entry.entry_key || getOnlineEntryKey(selected_entry.message_id, selected_entry.swipe_id)]: entry_id,
        }
      : current.selected_entry_by_message,
    selected_variant_by_message: selected_entry
      ? {
          ...current.selected_variant_by_message,
          [selected_entry.entry_key || getOnlineEntryKey(selected_entry.message_id, selected_entry.swipe_id)]:
            selected_entry.active_variant_id,
        }
      : current.selected_variant_by_message,
  };
  saveOnlineData(next);
  return getCurrentOnlineData();
}

function setActiveOnlineVariant(entry_id: string, direction: 'previous' | 'next') {
  const current = getCurrentOnlineData();
  const selected_entry = current.entries.find(entry => entry.id === entry_id);
  if (!selected_entry?.variants?.length) {
    return current;
  }
  const current_index = Math.max(
    0,
    selected_entry.variants.findIndex(variant => variant.id === selected_entry.active_variant_id),
  );
  const next_index =
    direction === 'previous'
      ? (current_index - 1 + selected_entry.variants.length) % selected_entry.variants.length
      : (current_index + 1) % selected_entry.variants.length;
  const next_variant = selected_entry.variants[next_index];
  if (!next_variant) {
    return current;
  }
  const entries = current.entries.map(entry =>
    entry.id === entry_id
      ? {
          ...entry,
          active_variant_id: next_variant.id,
          title: next_variant.title || extractOnlineTitle(next_variant) || entry.title,
          html: next_variant.html,
          memory_text: next_variant.memory_text,
          raw_result: next_variant.raw_result,
          updated_at: next_variant.updated_at,
          prompt_name: next_variant.prompt_name,
          detail_prompt_name: next_variant.detail_prompt_name,
        }
      : entry,
  );
  saveOnlineData({
    ...current,
    entries,
    active_entry_id: entry_id,
    selected_entry_by_message: {
      ...current.selected_entry_by_message,
      [selected_entry.entry_key || getOnlineEntryKey(selected_entry.message_id, selected_entry.swipe_id)]: entry_id,
    },
    selected_variant_by_message: {
      ...current.selected_variant_by_message,
      [selected_entry.entry_key || getOnlineEntryKey(selected_entry.message_id, selected_entry.swipe_id)]:
        next_variant.id,
    },
  });
  return getCurrentOnlineData();
}

function updateOnlineEntry(entry_id: string, patch: Partial<OnlineEntry> & Partial<OnlineVariant>) {
  const current = getCurrentOnlineData();
  const variant_keys: Array<keyof OnlineVariant> = [
    'html',
    'memory_text',
    'raw_result',
    'updated_at',
    'prompt_name',
    'detail_prompt_name',
    'title',
  ];
  const has_patch_key = (key: string) => Object.prototype.hasOwnProperty.call(patch, key);
  const should_patch_variant = variant_keys.some(key => has_patch_key(key));
  const entries: OnlineEntry[] = current.entries.map(entry => {
    if (entry.id !== entry_id) {
      return entry;
    }
    const active_variant = getEntryActiveVariant(entry);
    const variant_patch: Partial<OnlineVariant> = Object.fromEntries(
      variant_keys.filter(key => has_patch_key(key)).map(key => [key, patch[key as keyof typeof patch]]),
    );
    if (has_patch_key('html') && !has_patch_key('title')) {
      variant_patch.title = extractOnlineTitle({ html: patch.html }) || active_variant?.title || entry.title || '';
    }
    const patched_variants =
      should_patch_variant && active_variant
        ? entry.variants.map(variant =>
            variant.id === active_variant.id
              ? {
                  ...variant,
                  ...variant_patch,
                  updated_at: patch.updated_at || new Date().toISOString(),
                }
              : variant,
          )
        : entry.variants;
    const next_active_variant =
      patched_variants.find(variant => variant.id === entry.active_variant_id) ||
      patched_variants.at(-1) ||
      active_variant;
    const entry_patch = Object.fromEntries(
      Object.entries(patch).filter(([key]) => !variant_keys.includes(key as keyof OnlineVariant)),
    ) as Partial<OnlineEntry>;
    return {
      ...entry,
      ...entry_patch,
      variants: patched_variants,
      title: next_active_variant?.title || extractOnlineTitle(next_active_variant) || entry_patch.title || entry.title,
      html: next_active_variant?.html || entry.html || '',
      memory_text: next_active_variant?.memory_text || entry.memory_text || '',
      raw_result: next_active_variant?.raw_result || entry.raw_result || '',
      updated_at: next_active_variant?.updated_at || entry.updated_at || '',
      prompt_name: next_active_variant?.prompt_name || entry.prompt_name || '',
      detail_prompt_name: next_active_variant?.detail_prompt_name || entry.detail_prompt_name || '',
    };
  });
  return saveOnlineData({
    ...current,
    entries,
  });
}

function deleteOnlineEntry(entry_id: string) {
  const current = getCurrentOnlineData();
  const deleted_entry = current.entries.find(entry => entry.id === entry_id);
  const entries = current.entries.filter(entry => entry.id !== entry_id);
  const selected_entry_by_message = { ...current.selected_entry_by_message };
  const selected_variant_by_message = { ...current.selected_variant_by_message };
  const deleted_key = deleted_entry
    ? deleted_entry.entry_key || getOnlineEntryKey(deleted_entry.message_id, deleted_entry.swipe_id)
    : '';
  if (deleted_entry && selected_entry_by_message[deleted_key] === entry_id) {
    const fallback = entries
      .filter(entry => String(entry.entry_key || getOnlineEntryKey(entry.message_id, entry.swipe_id)) === deleted_key)
      .at(-1);
    if (fallback) {
      selected_entry_by_message[deleted_key] = fallback.id;
      selected_variant_by_message[deleted_key] = fallback.active_variant_id;
    } else {
      delete selected_entry_by_message[deleted_key];
      delete selected_variant_by_message[deleted_key];
    }
  }
  const active_entry_id = entries.some(entry => entry.id === current.active_entry_id)
    ? current.active_entry_id
    : entries.at(-1)?.id || '';
  if (!entries.length) {
    return clearCurrentOnlineData();
  }
  return saveOnlineData({
    ...current,
    html: '',
    memory_text: '',
    raw_result: '',
    updated_at: '',
    prompt_name: '',
    entries,
    active_entry_id,
    selected_entry_by_message,
    selected_variant_by_message,
  });
}

function deleteActiveOnlineVariant(entry_id: string) {
  const current = getCurrentOnlineData();
  const entry = current.entries.find(item => item.id === entry_id);
  if (!entry) {
    return current;
  }
  if ((entry.variants || []).length <= 1) {
    return deleteOnlineEntry(entry_id);
  }
  const active_variant = getEntryActiveVariant(entry);
  const variants = entry.variants.filter(variant => variant.id !== active_variant?.id);
  const next_variant = variants.at(-1);
  if (!next_variant) {
    return current;
  }
  const entries = current.entries.map(item =>
    item.id === entry_id
      ? {
          ...item,
          variants,
          active_variant_id: next_variant.id,
          title: next_variant.title || extractOnlineTitle(next_variant) || item.title,
          html: next_variant.html,
          memory_text: next_variant.memory_text,
          raw_result: next_variant.raw_result,
          updated_at: next_variant.updated_at,
          prompt_name: next_variant.prompt_name,
          detail_prompt_name: next_variant.detail_prompt_name,
        }
      : item,
  );
  return saveOnlineData({
    ...current,
    entries,
    selected_variant_by_message: {
      ...current.selected_variant_by_message,
      [entry.entry_key || getOnlineEntryKey(entry.message_id, entry.swipe_id)]: next_variant.id,
    },
  });
}

function getOnlineMemoryBeforeMessage(message_id: OnlineMessageId) {
  const data = getCurrentOnlineData();
  return data.entries
    .filter(entry => entry.message_id !== 'legacy' && Number(entry.message_id) < Number(message_id))
    .sort(
      (left, right) =>
        Number(left.message_id) - Number(right.message_id) || Number(left.swipe_id) - Number(right.swipe_id),
    )
    .map(entry => getOnlineMemoryForMessage(entry))
    .filter(Boolean)
    .join('\n\n');
}

function getOnlineMemoryForMessage(
  message_or_id: Pick<OnlineMessage, 'message_id'> | OnlineMessageId | null | undefined,
) {
  const data = getCurrentOnlineData();
  const message_id =
    typeof message_or_id === 'object' && message_or_id !== null ? message_or_id.message_id : message_or_id;
  const entry_key =
    typeof message_or_id === 'object' && message_or_id !== null
      ? getOnlineEntryKey(message_or_id)
      : getOnlineEntryFallbackKey(message_id);
  const legacy_message_key = message_id == null ? '' : String(message_id);
  const selected_entry_id =
    data.selected_entry_by_message?.[entry_key] || data.selected_entry_by_message?.[legacy_message_key];
  const selected_entry =
    data.entries.find(entry => entry.id === selected_entry_id) ||
    data.entries
      .filter(
        entry =>
          String(entry.entry_key || getOnlineEntryKey(entry.message_id, entry.swipe_id)) === entry_key ||
          (!entry.swipe_id && Number(entry.message_id) === Number(message_id)),
      )
      .at(-1);
  if (selected_entry) {
    const selected_variant_id =
      data.selected_variant_by_message?.[entry_key] ||
      data.selected_variant_by_message?.[legacy_message_key] ||
      selected_entry.active_variant_id;
    const selected_variant = selected_entry.variants?.find(variant => variant.id === selected_variant_id);
    return selected_variant?.memory_text || getEntryActiveVariant(selected_entry)?.memory_text || '';
  }
  return '';
}

function getAllOnlineMemory() {
  const data = getCurrentOnlineData();
  return data.entries
    .filter(entry => entry.message_id !== 'legacy')
    .sort(
      (left, right) =>
        Number(left.message_id) - Number(right.message_id) || Number(left.swipe_id) - Number(right.swipe_id),
    )
    .map(entry => getOnlineMemoryForMessage(entry))
    .filter(Boolean)
    .join('\n\n');
}

function saveCurrentOnlineData(
  data: Partial<OnlineEntry> & Partial<OnlineVariant> & { message_id?: OnlineMessageId; swipe_id?: unknown },
) {
  return saveOnlineEntryForCurrentChat(data);
}
