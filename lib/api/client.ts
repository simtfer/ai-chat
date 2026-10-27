import type {
  Character,
  Group,
  GroupSummary,
  Member,
  Message,
  Persona,
  SettingsPublic,
} from "@/lib/types";
import type { CharacterDraft } from "@/lib/persona/generator";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `请求失败 (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export type GroupDetail = { group: Group; members: Member[] };

export const api = {
  listGroups: () => request<{ groups: GroupSummary[] }>("/api/groups").then((r) => r.groups),
  getGroup: (id: string) => request<GroupDetail>(`/api/groups/${id}`),
  createGroup: (body: {
    title: string;
    topic?: string;
    minGapMs?: number;
    maxGapMs?: number;
    isRunning?: boolean;
    characterIds?: string[];
  }) => request<GroupDetail>("/api/groups", { method: "POST", body: JSON.stringify(body) }),
  updateGroup: (
    id: string,
    patch: Partial<Pick<Group, "title" | "topic" | "minGapMs" | "maxGapMs" | "isRunning">>,
  ) =>
    request<{ group: Group }>(`/api/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteGroup: (id: string) =>
    request<{ deleted: boolean }>(`/api/groups/${id}`, { method: "DELETE" }),

  listMembers: (groupId: string) =>
    request<{ members: Member[] }>(`/api/groups/${groupId}/members`).then((r) => r.members),
  addMembers: (groupId: string, characterIds: string[]) =>
    request<{ members: Member[] }>(`/api/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ characterIds }),
    }).then((r) => r.members),
  updateMember: (
    groupId: string,
    memberId: string,
    patch: { speakWeight?: number; cooldownMs?: number; enabled?: boolean },
  ) =>
    request<{ member: Member }>(`/api/groups/${groupId}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }).then((r) => r.member),
  removeMember: (groupId: string, memberId: string) =>
    request<{ deleted: boolean }>(`/api/groups/${groupId}/members/${memberId}`, {
      method: "DELETE",
    }),

  listMessages: (groupId: string, options?: { limit?: number; before?: number }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.before) params.set("before", String(options.before));
    const query = params.toString();
    return request<{ messages: Message[] }>(
      `/api/groups/${groupId}/messages${query ? `?${query}` : ""}`,
    ).then((r) => r.messages);
  },
  sendMessage: (groupId: string, content: string) =>
    request<{ message: Message }>(`/api/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }).then((r) => r.message),

  listCharacters: () =>
    request<{ characters: Character[] }>("/api/characters").then((r) => r.characters),
  createCharacter: (body: {
    name: string;
    avatarEmoji: string;
    color: string;
    tagline: string;
    persona: Persona;
    modelOverride?: string | null;
  }) =>
    request<{ character: Character }>("/api/characters", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.character),
  updateCharacter: (
    id: string,
    body: Partial<{
      name: string;
      avatarEmoji: string;
      color: string;
      tagline: string;
      persona: Persona;
      modelOverride: string | null;
    }>,
  ) =>
    request<{ character: Character }>(`/api/characters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => r.character),
  deleteCharacter: (id: string) =>
    request<{ deleted: boolean }>(`/api/characters/${id}`, { method: "DELETE" }),

  generatePersona: (body: { hint?: string; existingNames?: string[] }) =>
    request<{ draft: CharacterDraft; source: "llm" | "local"; warning?: string }>(
      "/api/persona/generate",
      { method: "POST", body: JSON.stringify(body) },
    ),

  getSettings: () =>
    request<{ settings: SettingsPublic }>("/api/settings").then((r) => r.settings),
  saveSettings: (body: Record<string, unknown>) =>
    request<{ settings: SettingsPublic }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }).then((r) => r.settings),
  testSettings: (body: Record<string, unknown>) =>
    request<{ ok: boolean; message: string; models: string[] }>("/api/settings/test", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  seed: () => request<GroupDetail>("/api/dev/seed", { method: "POST", body: "{}" }),
};
