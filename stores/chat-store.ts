"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { pickSpeaker } from "@/lib/chat/speaker";
import { readSse } from "@/lib/sse";
import { randRange } from "@/lib/utils";
import type { Group, Member, Message, TurnReason } from "@/lib/types";

const MAX_MESSAGES = 400;
const IDLE_PAUSE_MS = 5 * 60_000;

type ChatState = {
  group: Group | null;
  members: Member[];
  messages: Message[];
  running: boolean;
  typingCharacterId: string | null;
  streamingMessageId: string | null;
  nextAt: number | null;
  pendingBoost: boolean;
  lastSpeakerId: string | null;
  error: string | null;
  pauseReason: "idle" | null;

  init: (data: { group: Group; members: Member[]; messages: Message[] }) => void;
  destroy: () => void;
  setRunning: (running: boolean, options?: { auto?: boolean }) => Promise<void>;
  toggleRunning: () => Promise<void>;
  checkIdle: () => void;
  speak: (characterId: string, reason?: TurnReason) => Promise<void>;
  nudge: (characterId?: string) => Promise<void>;
  retry: (messageId: string) => Promise<void>;
  sendUserMessage: (content: string) => Promise<void>;
  updateMember: (
    memberId: string,
    patch: { speakWeight?: number; cooldownMs?: number; enabled?: boolean },
  ) => Promise<void>;
  addMembers: (characterIds: string[]) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  updateGroupPatch: (
    patch: Partial<Pick<Group, "title" | "topic" | "minGapMs" | "maxGapMs">>,
  ) => Promise<void>;
  refresh: () => Promise<void>;
};

let loopToken = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let wake: (() => void) | null = null;
let activeAbort: AbortController | null = null;
let inFlight = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivityAt = Date.now();

function clearIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
}

function armIdleTimer() {
  clearIdleTimer();
  if (!useChatStore.getState().running) return;
  const remaining = lastActivityAt + IDLE_PAUSE_MS - Date.now();
  if (remaining <= 0) {
    void useChatStore.getState().setRunning(false, { auto: true });
    return;
  }
  idleTimer = setTimeout(() => {
    idleTimer = null;
    void useChatStore.getState().setRunning(false, { auto: true });
  }, remaining);
}

function markActivity() {
  lastActivityAt = Date.now();
  if (useChatStore.getState().running) armIdleTimer();
}

function idleExpired() {
  return Date.now() - lastActivityAt >= IDLE_PAUSE_MS;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    wake = resolve;
    timer = setTimeout(() => {
      timer = null;
      wake = null;
      resolve();
    }, ms);
  });
}

function cancelSleep() {
  if (timer) clearTimeout(timer);
  timer = null;
  const resolve = wake;
  wake = null;
  resolve?.();
}

function sleepAbortable(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(handle);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const handle = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function stopTimers() {
  cancelSleep();
}

function startLoop() {
  const state = useChatStore.getState();
  if (!state.group || !state.running) return;
  loopToken += 1;
  cancelSleep();
  void runLoop(loopToken);
}

async function runLoop(token: number) {
  const state = useChatStore.getState();
  if (!state.group || !state.running || token !== loopToken) return;

  const delay = state.pendingBoost
    ? randRange(700, 1600)
    : randRange(state.group.minGapMs, state.group.maxGapMs);
  useChatStore.setState({ nextAt: Date.now() + delay });
  await sleep(delay);
  if (token !== loopToken) return;

  const current = useChatStore.getState();
  if (!current.group || !current.running) return;
  if (idleExpired()) {
    void current.setRunning(false, { auto: true });
    return;
  }
  if (inFlight) {
    await sleep(700);
    if (token === loopToken) void runLoop(token);
    return;
  }

  const pick = pickSpeaker({
    members: current.members,
    messages: current.messages,
    now: Date.now(),
    boost: current.pendingBoost,
  });

  if (!pick.characterId) {
    const wait = Math.max(800, Math.min(pick.waitMs ?? 4000, 15_000));
    useChatStore.setState({ nextAt: Date.now() + wait });
    await sleep(wait);
    if (token === loopToken) void runLoop(token);
    return;
  }

  useChatStore.setState({ pendingBoost: false, nextAt: null });
  await current.speak(pick.characterId, "auto");
  if (token === loopToken) void runLoop(token);
}

export const useChatStore = create<ChatState>((set, get) => ({
  group: null,
  members: [],
  messages: [],
  running: false,
  typingCharacterId: null,
  streamingMessageId: null,
  nextAt: null,
  pendingBoost: false,
  lastSpeakerId: null,
  error: null,
  pauseReason: null,

  init: ({ group, members, messages }) => {
    loopToken += 1;
    stopTimers();
    clearIdleTimer();
    lastActivityAt = Date.now();
    set({
      group,
      members,
      messages: messages.slice(-MAX_MESSAGES),
      running: group.isRunning,
      typingCharacterId: null,
      streamingMessageId: null,
      nextAt: null,
      pendingBoost: false,
      lastSpeakerId: null,
      error: null,
      pauseReason: null,
    });
    if (group.isRunning) {
      startLoop();
      armIdleTimer();
    }
  },

  destroy: () => {
    loopToken += 1;
    stopTimers();
    clearIdleTimer();
    activeAbort?.abort();
    activeAbort = null;
    inFlight = false;
    set({
      typingCharacterId: null,
      streamingMessageId: null,
      nextAt: null,
    });
  },

  setRunning: async (running, options) => {
    const group = get().group;
    if (!group) return;
    const auto = options?.auto === true;
    if (running) {
      lastActivityAt = Date.now();
      set({ running: true, pauseReason: null });
    } else {
      loopToken += 1;
      stopTimers();
      clearIdleTimer();
      activeAbort?.abort();
      activeAbort = null;
      set({ running: false, nextAt: null, pendingBoost: false, pauseReason: auto ? "idle" : null });
      if (auto) toast.message("5 分钟没有操作，已自动暂停");
    }
    try {
      const updated = await api.updateGroup(group.id, { isRunning: running });
      set({ group: updated.group, running: updated.group.isRunning });
      if (updated.group.isRunning) {
        startLoop();
        armIdleTimer();
      } else {
        clearIdleTimer();
      }
    } catch (error) {
      set({ running: group.isRunning, pauseReason: null });
      if (group.isRunning) {
        lastActivityAt = Date.now();
        startLoop();
        armIdleTimer();
      }
      toast.error((error as Error).message);
    }
  },

  toggleRunning: async () => {
    await get().setRunning(!get().running);
  },

  checkIdle: () => {
    if (!get().running) return;
    if (idleExpired()) {
      void get().setRunning(false, { auto: true });
      return;
    }
    armIdleTimer();
  },

  speak: async (characterId, reason = "nudge") => {
    const state = get();
    if (!state.group) return;
    if (inFlight) return;

    const member = state.members.find((m) => m.characterId === characterId);
    if (!member) {
      toast.error("这个角色不在群里");
      return;
    }

    inFlight = true;
    let speakerId = characterId;
    const groupId = state.group.id;
    const abort = new AbortController();
    activeAbort = abort;
    set({ typingCharacterId: characterId, error: null });

    try {
      await sleepAbortable(randRange(500, 1400), abort.signal);
      const response = await fetch(`/api/groups/${groupId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, reason }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          waitMs?: number;
        } | null;
        if (reason === "auto" && response.status === 429) {
          set({ nextAt: Date.now() + Math.min(15_000, data?.waitMs ?? 4000) });
          return;
        }
        throw new Error(data?.error ?? `生成失败 (${response.status})`);
      }

      await readSse(response, (event, raw) => {
        const data = raw as Record<string, unknown>;
        if (event === "meta") {
          speakerId = String(data.characterId ?? characterId);
          const speaker =
            get().members.find((m) => m.characterId === speakerId) ?? member;
          const message: Message = {
            id: String(data.messageId),
            groupId,
            senderType: "ai",
            characterId: speakerId,
            content: "",
            status: "streaming",
            model: (data.model as string) ?? null,
            error: null,
            createdAt: Date.now(),
            characterName: speaker.character.name,
            characterEmoji: speaker.character.avatarEmoji,
            characterColor: speaker.character.color,
          };
          set((s) => ({
            messages: [...s.messages, message].slice(-MAX_MESSAGES),
            streamingMessageId: message.id,
            typingCharacterId: null,
          }));
        } else if (event === "delta") {
          const text = String(data.text ?? "");
          if (!text) return;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === s.streamingMessageId && m.status === "streaming"
                ? { ...m, content: m.content + text }
                : m,
            ),
          }));
        } else if (event === "done") {
          const saved = data.message as Message;
          set((s) => ({
            messages: s.messages.map((m) => (m.id === saved.id ? saved : m)),
            streamingMessageId: null,
            lastSpeakerId: speakerId,
            members: s.members.map((m) =>
              m.characterId === speakerId ? { ...m, lastSpokeAt: saved.createdAt } : m,
            ),
          }));
        } else if (event === "error") {
          const record = (data.messageRecord ?? null) as Message | null;
          const description = String(data.message ?? "生成失败");
          set((s) => ({
            streamingMessageId: null,
            error: description,
            members: s.members.map((m) =>
              m.characterId === speakerId
                ? { ...m, lastSpokeAt: record?.createdAt ?? Date.now() }
                : m,
            ),
            messages: record
              ? s.messages.map((m) => (m.id === record.id ? record : m))
              : s.messages.map((m) =>
                  m.id === s.streamingMessageId
                    ? { ...m, status: "error", error: description }
                    : m,
                ),
          }));
          toast.error(description);
        }
      });
    } catch (error) {
      const description = (error as Error)?.message ?? "生成失败";
      if (abort.signal.aborted) {
        set((s) => ({
          streamingMessageId: null,
          messages: s.messages.flatMap((m): Message[] => {
            if (m.id !== s.streamingMessageId) return [m];
            if (!m.content.trim()) return [];
            return [{ ...m, status: "interrupted", error: "已暂停" }];
          }),
        }));
      } else {
        set((s) => ({
          streamingMessageId: null,
          error: description,
          members: s.members.map((m) =>
            m.characterId === speakerId ? { ...m, lastSpokeAt: Date.now() } : m,
          ),
          messages: s.messages.flatMap((m): Message[] => {
            if (m.id !== s.streamingMessageId) return [m];
            if (!m.content.trim()) return [];
            return [{ ...m, status: "error", error: description }];
          }),
        }));
        toast.error(description);
      }
    } finally {
      inFlight = false;
      if (activeAbort === abort) activeAbort = null;
      set({ typingCharacterId: null });
    }
  },

  nudge: async (characterId) => {
    const state = get();
    if (!state.group) return;
    markActivity();
    if (inFlight) {
      toast.message("还在生成中，稍等一下");
      return;
    }
    let target = characterId;
    if (!target) {
      const pick = pickSpeaker({
        members: state.members,
        messages: state.messages,
        now: Date.now(),
        allowSameSpeaker: true,
      });
      target = pick.characterId ?? undefined;
    }
    if (!target) {
      toast.error("还没有可以发言的 AI");
      return;
    }
    if (get().running) {
      loopToken += 1;
      cancelSleep();
    }
    await get().speak(target, "nudge");
    if (get().running) startLoop();
  },

  retry: async (messageId) => {
    const message = get().messages.find((m) => m.id === messageId);
    if (!message?.characterId) return;
    await get().nudge(message.characterId);
  },

  sendUserMessage: async (content) => {
    const state = get();
    const text = content.trim();
    if (!state.group || !text) return;
    markActivity();
    const groupId = state.group.id;
    const optimisticId = `local-${crypto.randomUUID()}`;
    const optimistic: Message = {
      id: optimisticId,
      groupId,
      senderType: "user",
      characterId: null,
      content: text,
      status: "complete",
      model: null,
      error: null,
      createdAt: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, optimistic].slice(-MAX_MESSAGES) }));

    try {
      const saved = await api.sendMessage(groupId, text);
      set((s) => ({ messages: s.messages.map((m) => (m.id === optimisticId ? saved : m)) }));
      set({ pendingBoost: true });
      if (get().running) startLoop();
    } catch (error) {
      set((s) => ({ messages: s.messages.filter((m) => m.id !== optimisticId) }));
      toast.error((error as Error).message);
    }
  },

  updateMember: async (memberId, patch) => {
    const previous = get().members;
    markActivity();
    set({ members: previous.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) });
    const group = get().group;
    if (!group) return;
    try {
      const member = await api.updateMember(group.id, memberId, patch);
      set((s) => ({ members: s.members.map((m) => (m.id === member.id ? member : m)) }));
    } catch (error) {
      set({ members: previous });
      toast.error((error as Error).message);
    }
  },

  addMembers: async (characterIds) => {
    const group = get().group;
    if (!group || !characterIds.length) return;
    markActivity();
    try {
      const members = await api.addMembers(group.id, characterIds);
      set({ members });
      toast.success(`已添加 ${characterIds.length} 个角色`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  },

  removeMember: async (memberId) => {
    const group = get().group;
    if (!group) return;
    markActivity();
    const member = get().members.find((m) => m.id === memberId);
    try {
      await api.removeMember(group.id, memberId);
      set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }));
      toast.success(`${member?.character.name ?? "角色"} 已离开群聊`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  },

  updateGroupPatch: async (patch) => {
    const group = get().group;
    if (!group) return;
    markActivity();
    const previous = group;
    set({ group: { ...group, ...patch } });
    try {
      const updated = await api.updateGroup(group.id, patch);
      set({ group: updated.group });
    } catch (error) {
      set({ group: previous });
      throw error;
    }
  },

  refresh: async () => {
    const group = get().group;
    if (!group || inFlight) return;
    try {
      const [detail, messages] = await Promise.all([
        api.getGroup(group.id),
        api.listMessages(group.id),
      ]);
      set({
        group: detail.group,
        members: detail.members,
        messages: messages.slice(-MAX_MESSAGES),
      });
    } catch {
      // ignore transient refresh failures
    }
  },
}));
