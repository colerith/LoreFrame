type MonitorStopHandle = { stop?: () => void } | (() => void) | null | undefined;

type MonitorEventApi = {
  event_on: (eventName: string, handler: (...args: unknown[]) => void) => MonitorStopHandle;
  events: Record<string, string>;
};

type GenerationCheckOptions = {
  delay?: number;
  finished?: boolean;
};

type MonitorLorePayload = {
  personaLore?: unknown[];
};

type MonitorWorldInfoScanPayload = {
  activated?: { entries?: Iterable<unknown> } | null;
};

function normalizeMonitorWorldbookEntries(value: unknown): SourceCollectorWorldbookEntry[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is SourceCollectorWorldbookEntry => Boolean(entry) && typeof entry === 'object')
    : [];
}

function normalizeMonitorMessageId(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return null;
}

function scheduleChatDebugSnapshot(iframe_document: Document, reason: string) {
  host_window.clearTimeout(collect_timer);
  collect_timer = host_window.setTimeout(() => {
    collectChatDebugSnapshot(iframe_document, reason);
  }, 800);
}

function scheduleSourceDebugSnapshot(iframe_document: Document, reason: string) {
  host_window.clearTimeout(source_collect_timer);
  source_collect_timer = host_window.setTimeout(() => {
    collectSourceDebugSnapshot(iframe_document, reason);
  }, 900);
}

function registerGenerationMonitor(iframe_document: Document) {
  const event_api = getEventApi() as MonitorEventApi | null;
  const stops: Array<() => void> = [];

  if (!event_api) {
    setMonitorStatus(iframe_document, '监听未启动', '没有找到酒馆事件接口；请确认脚本由酒馆助手加载。');
    collectChatDebugSnapshot(iframe_document, '初始化读取');
    return stops;
  }

  const { event_on, events } = event_api;
  const listen = (event_name: string | undefined, handler: (...args: unknown[]) => void) => {
    if (!event_name) {
      return;
    }
    const result = event_on(event_name, handler);
    if ((result as { stop?: () => void } | null | undefined)?.stop || typeof result === 'function') {
      stops.push(() => stopEventListener(result));
    } else if (getSillyTavernContext()?.eventSource?.removeListener) {
      stops.push(() => {
        const event_source = getSillyTavernContext()?.eventSource;
        event_source?.removeListener?.(event_name, handler);
      });
    }
  };
  const schedule_auto_generation_check = (reason: string, options: GenerationCheckOptions = {}) => {
    if (online_is_generating || active_online_generation_id) {
      return;
    }
    if (!pending_body_generation) {
      return;
    }
    if (!options.finished) {
      return;
    }
    body_generation_finished = true;
    host_window.clearTimeout(body_generation_check_timer);
    body_generation_check_timer = host_window.setTimeout(() => {
      if (
        online_is_generating ||
        active_online_generation_id ||
        Date.now() - last_online_generation_finished_at < 1500
      ) {
        return;
      }
      if (!pending_body_generation) {
        return;
      }

      body_generation_check_attempts += 1;
      scheduleChatDebugSnapshot(iframe_document, reason);

      const settings = getSettings();
      if (!settings.auto_generate) {
        resetBodyGenerationState();
        setMonitorStatus(iframe_document, '自动生成已关闭', '标题栏开关当前关闭，已跳过页面生成。');
        return;
      }

      if (hasSuccessfulBodyGeneration() && body_generation_finished) {
        appendRunLog('监听', '自动生成判定成功。', {
          reason,
          user_message_id: body_generation_user_message_id,
          received_message_id: body_generation_received_message_id,
        });
        collectSourceDebugSnapshot(iframe_document, reason);
        resetBodyGenerationState();
        generateOnlineForCurrentChat(iframe_document, '正文生成结束自动触发');
        return;
      }

      if (body_generation_check_attempts < 3) {
        schedule_auto_generation_check(reason, { delay: 1200, finished: true });
        return;
      }

      appendRunLog('监听', '自动生成判定失败。', {
        reason,
        user_message_id: body_generation_user_message_id,
        received_message_id: body_generation_received_message_id,
      });
      resetBodyGenerationState();
      setMonitorStatus(iframe_document, '正文未成功生成', '本次主 API 没有写入新的 AI 正文，已跳过页面生成。');
    }, options.delay ?? 1200);
  };
  listen(events.MESSAGE_SENT, (message_id: unknown) => {
    markBodyGenerationPending(normalizeMonitorMessageId(message_id) ?? getLatestUserMessageId());
    scheduleChatDebugSnapshot(iframe_document, 'message_sent');
    setMonitorStatus(iframe_document, '正文生成中', '检测到你发送了正文消息，等待本次 AI 回复完成。');
  });

  listen(events.GENERATION_STARTED, () => {
    if (online_is_generating || active_online_generation_id) {
      return;
    }
    markBodyGenerationPending();
    scheduleChatDebugSnapshot(iframe_document, 'generation_started');
    latest_activated_world_info_entries = [];
    latest_activated_world_info_text = '';
    setMonitorStatus(iframe_document, '正文生成中', '检测到 SillyTavern 开始生成正文。');
  });

  listen(events.MESSAGE_RECEIVED, (message_id: unknown) => {
    const normalized_message_id = normalizeMonitorMessageId(message_id);
    if (pending_body_generation) {
      body_generation_received = true;
      body_generation_received_message_id = normalized_message_id;
      scheduleChatDebugSnapshot(iframe_document, 'message_received');
    }
  });

  listen(events.MESSAGE_UPDATED, (message_id: unknown) => {
    const normalized_message_id = normalizeMonitorMessageId(message_id);
    if (pending_body_generation) {
      body_generation_received = true;
      body_generation_received_message_id = normalized_message_id;
      scheduleChatDebugSnapshot(iframe_document, 'message_updated');
    }
  });

  listen(events.CHARACTER_MESSAGE_RENDERED, (message_id: unknown) => {
    const normalized_message_id = normalizeMonitorMessageId(message_id);
    if (pending_body_generation) {
      body_generation_received = true;
      body_generation_received_message_id = normalized_message_id;
      scheduleChatDebugSnapshot(iframe_document, 'character_message_rendered');
    }
    host_window.setTimeout(() => renderSourceJumpButtons(), 300);
  });

  listen(events.STREAM_TOKEN_RECEIVED, () => {
    if (pending_body_generation) {
      body_generation_received = true;
      scheduleChatDebugSnapshot(iframe_document, 'stream_token_received');
    }
  });

  listen(events.GENERATION_ENDED, (message_id: unknown) => {
    const normalized_message_id = normalizeMonitorMessageId(message_id);
    if (pending_body_generation && normalized_message_id != null) {
      if (getVisibleMessageById(normalized_message_id)?.role === 'assistant') {
        body_generation_received_message_id = normalized_message_id;
        body_generation_received = true;
      } else if (body_generation_received_message_id == null) {
        body_generation_received_message_id = normalized_message_id;
      }
    }
    appendRunLog(
      '监听',
      '捕获 GENERATION_ENDED。',
      { message_id: normalized_message_id },
      { full_detail: true, collapsed: true },
    );
    scheduleChatDebugSnapshot(iframe_document, 'generation_ended');
    schedule_auto_generation_check('generation_ended', { delay: 1200, finished: true });
  });

  listen(events.GENERATION_STOPPED, () => {
    appendRunLog('监听', '捕获 GENERATION_STOPPED，跳过页面生成。');
    scheduleChatDebugSnapshot(iframe_document, 'generation_stopped');
    resetBodyGenerationState();
    setMonitorStatus(iframe_document, '正文生成已停止', '没有收到正文完成事件，已跳过页面生成。');
  });

  listen(events.CHAT_CHANGED, () => {
    resetBodyGenerationState();
    latest_activated_world_info_entries = [];
    latest_activated_world_info_text = '';
    latest_persona_world_info_entries = [];
    syncOnlineDataWithCurrentChat('chat_changed');
    scheduleChatDebugSnapshot(iframe_document, 'chat_changed');
    renderOnlineContent(iframe_document);
    collectSourceDebugSnapshot(iframe_document, 'chat_changed');
  });

  listen(events.MESSAGE_SWIPED, () => {
    scheduleChatDebugSnapshot(iframe_document, 'message_swiped');
    renderOnlineContent(iframe_document);
  });

  const sync_after_message_structure_change = (reason: string) => {
    host_window.setTimeout(() => {
      syncOnlineDataWithCurrentChat(reason);
      scheduleChatDebugSnapshot(iframe_document, reason);
      renderOnlineContent(iframe_document);
      renderSourceJumpButtons();
    }, 300);
  };

  listen(events.MESSAGE_DELETED, () => {
    resetBodyGenerationState();
    sync_after_message_structure_change('message_deleted');
  });

  listen(events.MESSAGE_EDITED, () => {
    sync_after_message_structure_change('message_edited');
  });

  listen(events.MESSAGE_SWIPE_DELETED, () => {
    sync_after_message_structure_change('message_swipe_deleted');
  });

  listen(events.WORLDINFO_ENTRIES_LOADED, (lores: unknown) => {
    const lore_payload = lores as MonitorLorePayload | null | undefined;
    latest_persona_world_info_entries = normalizeMonitorWorldbookEntries(lore_payload?.personaLore);
    updateText(
      iframe_document,
      '[data-user-worldbook]',
      latest_persona_world_info_entries.length ? '已捕获 Persona 世界书条目' : '无',
    );
    scheduleSourceDebugSnapshot(iframe_document, 'worldinfo_entries_loaded');
  });

  listen(events.WORLD_INFO_ACTIVATED, async (entries: unknown) => {
    latest_activated_world_info_entries = await filterBoundActivatedWorldInfoEntries(
      normalizeMonitorWorldbookEntries(entries),
    );
    latest_activated_world_info_text = latest_activated_world_info_entries.map(getWorldbookEntryContent).join('\n\n');
    updateText(iframe_document, '[data-worldbook-activated-count]', String(latest_activated_world_info_entries.length));
    updateText(
      iframe_document,
      '[data-worldbook-activated-list]',
      latest_activated_world_info_entries.length
        ? latest_activated_world_info_entries
            .map(entry => `${entry.world || '未知世界书'} / ${getWorldbookEntryName(entry)}`)
            .join('\n')
        : '本次尚未捕获到关键词条目激活',
    );
    scheduleSourceDebugSnapshot(iframe_document, 'world_info_activated');
  });

  listen(events.WORLDINFO_SCAN_DONE, async (event_data: unknown) => {
    const scan_payload = event_data as MonitorWorldInfoScanPayload | null | undefined;
    const activated_source = scan_payload?.activated?.entries;
    const activated_entries = await filterBoundActivatedWorldInfoEntries(
      activated_source ? normalizeMonitorWorldbookEntries(Array.from(activated_source)) : [],
    );
    if (activated_entries.length) {
      latest_activated_world_info_entries = activated_entries;
      latest_activated_world_info_text = activated_entries.map(getWorldbookEntryContent).join('\n\n');
      updateText(
        iframe_document,
        '[data-worldbook-activated-count]',
        String(latest_activated_world_info_entries.length),
      );
      updateText(
        iframe_document,
        '[data-worldbook-activated-list]',
        latest_activated_world_info_entries
          .map(entry => `${entry.world || '未知世界书'} / ${getWorldbookEntryName(entry)}`)
          .join('\n'),
      );
    } else {
      latest_activated_world_info_entries = [];
      latest_activated_world_info_text = '';
      updateText(iframe_document, '[data-worldbook-activated-count]', '0');
      updateText(iframe_document, '[data-worldbook-activated-list]', '本次尚未捕获到关键词条目激活');
    }
    scheduleSourceDebugSnapshot(iframe_document, 'worldinfo_scan_done');
  });

  listen(events.WORLDINFO_UPDATED, () => {
    scheduleSourceDebugSnapshot(iframe_document, 'worldinfo_updated');
  });

  listen(events.WORLDINFO_SETTINGS_UPDATED, () => {
    scheduleSourceDebugSnapshot(iframe_document, 'worldinfo_settings_updated');
  });

  setMonitorStatus(iframe_document, '监听中', '发送正文消息后，我会在正文回复结束时读取聊天历史。');
  collectChatDebugSnapshot(iframe_document, '初始化读取');
  return stops;
}
