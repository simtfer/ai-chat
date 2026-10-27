import type { Member, Message } from "../types";

export type SpeakerPick = {
  characterId: string | null;
  waitMs?: number;
};

function readyAt(member: Member) {
  if (member.lastSpokeAt == null) return 0;
  return member.lastSpokeAt + member.cooldownMs;
}

function isQuestion(text: string) {
  return /[?？]\s*$/.test(text.trim()) || /(吗|呢|怎么|为什么|如何|能不能|是不是)\s*[?？]?/.test(text);
}

/**
 * Weighted random speaker selection with cooldown, anti-repeat, mention boost
 * and a cold-room compensation term. Deterministic when `seed` is provided.
 */
export function pickSpeaker(params: {
  members: Member[];
  messages: Message[];
  now: number;
  seed?: number;
  boost?: boolean;
  allowSameSpeaker?: boolean;
}): SpeakerPick {
  const { members, messages, now, allowSameSpeaker } = params;
  const enabled = members.filter((m) => m.enabled);
  if (!enabled.length) return { characterId: null, waitMs: 4000 };

  const ready = enabled.filter((m) => now >= readyAt(m));
  if (!ready.length) {
    const next = Math.min(...enabled.map(readyAt));
    return { characterId: null, waitMs: Math.max(600, next - now) };
  }

  const last = messages[messages.length - 1] ?? null;
  const lastAi = [...messages].reverse().find((m) => m.senderType === "ai" && m.characterId);
  const lastSpeakerId = lastAi?.characterId ?? null;
  const recentAi = messages.slice(-4).filter((m) => m.senderType === "ai" && m.characterId);

  let pool = ready;
  if (!allowSameSpeaker && ready.length > 1 && lastSpeakerId) {
    pool = ready.filter((m) => m.character.id !== lastSpeakerId);
  }
  if (!pool.length) pool = ready;

  // A user message that names someone should reliably get that AI's reply.
  if (last?.senderType === "user" && last.content) {
    const mentioned = ready.filter((m) =>
      last.content.includes(`@${m.character.name}`),
    );
    if (mentioned.length) pool = mentioned;
  }

  const weights = pool.map((member) => {
    let weight = Math.max(1, member.speakWeight);
    const idle = now - (member.lastSpokeAt ?? member.joinedAt);
    weight *= 1 + Math.min(2, idle / Math.max(1000, member.cooldownMs));

    const recentCount = recentAi.filter((m) => m.characterId === member.character.id).length;
    weight *= Math.pow(0.55, recentCount);

    if (last?.content) {
      const text = last.content;
      if (text.includes(`@${member.character.name}`)) weight *= 6;
      else if (text.includes(member.character.name)) weight *= 4;
      if (last.senderType === "user" && isQuestion(text)) weight *= 1.5;
    }
    if (params.boost) weight *= 1.2;
    return weight;
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = (params.seed === undefined ? Math.random() : mulberry32(params.seed)()) * total;
  const order = pool
    .map((member, i) => ({ member, weight: weights[i] }))
    .sort((a, b) => a.member.id.localeCompare(b.member.id));

  for (const item of order) {
    random -= item.weight;
    if (random <= 0) return { characterId: item.member.character.id };
  }
  return { characterId: order[order.length - 1].member.character.id };
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cooldownRemaining(member: Member, now: number) {
  return Math.max(0, readyAt(member) - now);
}

export function groupMentionedNames(text: string, members: Member[]): string[] {
  return members
    .filter((m) => text.includes(`@${m.character.name}`))
    .map((m) => m.character.name);
}
