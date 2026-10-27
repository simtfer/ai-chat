import type { ChatMessage } from "../llm/types";
import type { Character, Group, Member, Message } from "../types";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeReply(text: string, name: string): string {
  let out = text.trim();
  const prefix = new RegExp(`^\\s*[【\\[]?${escapeRegExp(name)}[】\\]]?\\s*[:：]\\s*`, "u");
  out = out.replace(prefix, "");
  out = out.replace(/^["'「『]|["'」』]$/g, "");
  out = out.replace(/^\s*[-*]\s+/gm, "");
  out = out.replace(/\*\*/g, "");
  return out.trim().slice(0, 600);
}

function personaBlock(self: Character): string {
  const p = self.persona;
  const lines = [
    `性格标签：${p.traits.join("、") || "普通"}`,
    `说话风格：${p.tone || "自然随意"}`,
    p.quirks.length ? `小习惯：${p.quirks.join("；")}` : "",
    p.catchphrases.length ? `口头禅：${p.catchphrases.map((c) => `「${c}」`).join("、")}` : "",
    p.opinions.length ? `你的固有看法：${p.opinions.join("；")}` : "",
    p.background ? `背景：${p.background}` : "",
    p.taboo ? `底线：${p.taboo}` : "",
    p.mbti ? `MBTI：${p.mbti}` : "",
    p.occupation ? `职业：${p.occupation}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildChatMessages(input: {
  group: Group;
  members: Member[];
  messages: Message[];
  self: Character;
  budgetChars: number;
}): ChatMessage[] {
  const { group, members, messages, self, budgetChars } = input;
  const others = members
    .filter((m) => m.character.id !== self.id && m.enabled)
    .map((m) => `${m.character.name}（${m.character.tagline || m.character.persona.archetype}）`)
    .join("、");

  const system = [
    `你是「${self.name}」，群聊「${group.title}」里的一名普通成员。你不是助手，也不是 AI，你就是一个真实的人。`,
    group.topic ? `这个群平时聊：${group.topic}` : "",
    `你的人设：${self.tagline || self.persona.archetype}`,
    personaBlock(self),
    others ? `群里的其他人：${others}。群主显示为「我」。` : "群里暂时只有你和群主。",
    "",
    "聊天要求：",
    "1. 只输出你要说出口的话。不要旁白、动作、括号说明，不要以「名字：」开头，不要用 Markdown。",
    "2. 每次 1–3 句，30–80 字，口语化，像真人在群里随手打字。",
    "3. 必须回应上一条消息的具体内容，可以追问、反驳、接梗或自嘲；不要重复别人刚说的话，也不要总结全场。",
    "4. 保持你的人设，允许有偏见和情绪，不要突然变得像客服。",
    "5. 需要点名时用 @昵称；不要替别人发言；不要说自己是 AI 或模型。",
    "6. 不要连续输出多条消息，只说一条。",
  ]
    .filter(Boolean)
    .join("\n");

  const usable = messages.filter(
    (m) => m.status !== "streaming" && m.content.trim().length > 0 && m.senderType !== "system",
  );

  const selected: Message[] = [];
  let used = 0;
  for (let i = usable.length - 1; i >= 0; i--) {
    const message = usable[i];
    const cost = Math.min(message.content.length, 400);
    if (selected.length >= 8 && used + cost > budgetChars) break;
    selected.unshift(message);
    used += cost;
    if (used >= budgetChars && selected.length >= 8) break;
  }

  const history: ChatMessage[] = selected.map((message) => {
    const content = message.content.slice(0, 400);
    if (message.senderType === "user") {
      return { role: "user", content: `我：${content}` };
    }
    if (message.characterId === self.id) {
      return { role: "assistant", content };
    }
    const name = message.characterName || "某人";
    return { role: "user", content: `${name}：${content}` };
  });

  history.push({ role: "user", content: "（轮到你发言了。结合上面的对话，说一句自然的话。）" });

  return [{ role: "system", content: system }, ...history];
}

export function buildPersonaGenerationMessages(
  hint: string,
  existingNames: string[],
): ChatMessage[] {
  const system = [
    "你是一个角色设定师，为中文群聊设计鲜活的角色。",
    "只输出一个 JSON 对象，不要 Markdown 代码块，不要多余解释。",
    "字段：name（2-4 个汉字或昵称）, archetype（性格类型名）, tagline（一句话简介，20 字内）, emoji（单个 emoji）, color（十六进制颜色）, mbti, age, occupation,",
    "traits（3-4 个性格标签数组）, tone（说话风格描述）, quirks（2-3 个小习惯数组）, catchphrases（2 个口头禅数组）, opinions（2-3 个能引发讨论的观点数组）, background（一两句背景）, taboo（一条底线）。",
    "角色要有个性、有缺点、能和人抬杠，不要完美人设，不要客服腔。",
    existingNames.length ? `避免和这些已有角色重名：${existingNames.join("、")}。` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = hint.trim() ? `用户偏好：${hint.trim()}` : "随机给我一个有记忆点的角色。";
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
