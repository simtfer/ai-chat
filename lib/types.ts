export type Provider = "demo" | "openai";

export type MessageStatus = "streaming" | "complete" | "error" | "interrupted";
export type SenderType = "user" | "ai" | "system";

export type TurnReason = "auto" | "user" | "mention" | "nudge";

export type Persona = {
  archetype: string;
  archetypeKey?: string;
  mbti?: string;
  age?: string;
  occupation?: string;
  traits: string[];
  tone: string;
  quirks: string[];
  catchphrases: string[];
  opinions: string[];
  background: string;
  taboo: string;
};

export type Character = {
  id: string;
  name: string;
  avatarEmoji: string;
  color: string;
  tagline: string;
  persona: Persona;
  modelOverride: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Member = {
  id: string;
  groupId: string;
  characterId: string;
  speakWeight: number;
  cooldownMs: number;
  enabled: boolean;
  lastSpokeAt: number | null;
  joinedAt: number;
  character: Character;
};

export type Group = {
  id: string;
  title: string;
  topic: string;
  minGapMs: number;
  maxGapMs: number;
  isRunning: boolean;
  lastAiAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type GroupSummary = Group & {
  memberCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: number | null;
};

export type Message = {
  id: string;
  groupId: string;
  senderType: SenderType;
  characterId: string | null;
  content: string;
  status: MessageStatus;
  model: string | null;
  error: string | null;
  createdAt: number;
  characterName?: string | null;
  characterEmoji?: string | null;
  characterColor?: string | null;
};

export type SettingsPublic = {
  provider: Provider;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextCharBudget: number;
  hasApiKey: boolean;
  apiKeyHint: string;
};

export type SettingsRaw = {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextCharBudget: number;
};

export type PacePreset = {
  key: string;
  label: string;
  hint: string;
  minGapMs: number;
  maxGapMs: number;
};

export const PACE_PRESETS: PacePreset[] = [
  { key: "slow", label: "悠闲", hint: "12–30 秒", minGapMs: 12000, maxGapMs: 30000 },
  { key: "normal", label: "自然", hint: "6–18 秒", minGapMs: 6000, maxGapMs: 18000 },
  { key: "fast", label: "热闹", hint: "2.5–7 秒", minGapMs: 2500, maxGapMs: 7000 },
  { key: "turbo", label: "极速", hint: "0.8–2.2 秒", minGapMs: 800, maxGapMs: 2200 },
];

export const COLOR_PALETTE = [
  "#8b5cf6",
  "#22d3ee",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
  "#a78bfa",
  "#2dd4bf",
  "#f97316",
  "#e879f9",
  "#94a3b8",
];

export const EMOJI_POOL = [
  "🦊", "🐼", "🐧", "🐨", "🦉", "🐙", "🦝", "🐺",
  "🐰", "🐯", "🦁", "🐸", "🐳", "🦄", "🐝", "🌵",
  "🍊", "🍑", "🥑", "🍜", "☕", "🎧", "🎨", "🧊",
  "🌙", "⚡", "🔥", "🪐", "🧩", "🎲", "🫧", "🪁",
];

export const DEFAULT_PACE = { minGapMs: 6000, maxGapMs: 18000 };
