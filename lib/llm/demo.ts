import type { Character, Group, Member, Message } from "../types";
import { pickOne } from "../utils";
import type { StreamChunk } from "./types";

const TEMPLATES: Record<string, string[]> = {
  contrarian: [
    "「{topic}」这话我保留意见，真没这么绝对。",
    "先别急着统一意见，我就想问一句：凭什么？",
    "反过来想，要是{other}说的才对呢？",
    "我倒不是抬杠，但你这句话里有个漏洞。",
    "你们都觉得没问题？那我偏要唱个反调。",
  ],
  analyst: [
    "先把变量拆开看，{topic}至少涉及两件事。",
    "如果按这个说法，前提其实站不住。",
    "短期看是情绪，长期还得看结构。",
    "我建议先定义清楚：你说的{topic}到底指什么？",
    "结论先放一边，我们缺的是数据。",
  ],
  snarker: [
    "{topic}，嗯，很有想法。",
    "行吧，你开心就好。",
    "我没什么意见，就是觉得有点费劲。",
    "这么一说，好像更麻烦了。",
    "可以，但没必要。",
  ],
  cheerleader: [
    "这个我懂！{topic}确实挺有意思的。",
    "你这句话我先记下了，真的可以。",
    "别急着否定，说不定真能成。",
    "我站{other}这边，先试了再说！",
    "听完这句我反而更期待了。",
  ],
  conspiracist: [
    "你们不觉得{topic}出现得太巧了吗……",
    "你细品，谁最受益。",
    "公开的说法听听就好，水面下还有东西。",
    "这事没那么简单，我总觉得少了一环。",
    "先别下结论，等一个反转。",
  ],
  academic: [
    "严格说，{topic}得看具体语境。",
    "这里有个前提没交代清楚，我先补充一下。",
    "我提醒一句，相关不等于因果。",
    "这个问题学界其实争了很多年，没有定论。",
    "如果从定义出发，{topic}本身就有点含糊。",
  ],
  comedian: [
    "这题我会，{topic}属于典型的自己吓自己。",
    "笑死，但确实有点道理。",
    "别急，等这事再发展两天就能写进段子了。",
    "我宣布，今天的群聊 KPI 已经完成了。",
    "你们继续，我在旁边记素材。",
  ],
  pessimist: [
    "最坏的情况是，{topic}根本不是偶然。",
    "但愿我想多了，不过听着不太妙。",
    "先想想止损方案吧，别到时候手忙脚乱。",
    "我总觉得，后面还有更麻烦的。",
    "乐观可以，但别把退路堵死。",
  ],
  chunibyo: [
    "哼，{topic}这种程度，还不足以撼动局面。",
    "命运的齿轮已经开始转动了，你们没感觉到吗。",
    "凡人只看表面，我看到的是裂缝。",
    "别被表象骗了，真正的战场不在这里。",
    "有意思，终于有人碰到那个关键点了。",
  ],
  peacemaker: [
    "其实两边都有道理，{topic}没必要争这么细。",
    "先别急，{other}可能不是那个意思。",
    "都不容易，先把话说开。",
    "我觉得可以各退一步，没必要上纲上线。",
    "先确认一下，我们说的是同一件事吗？",
  ],
  zen: [
    "都行吧，{topic}这事急也没用。",
    "随缘，听着也没那么严重。",
    "缓一缓再看，可能就没这回事了。",
    "你们先聊，我负责点头。",
    "想那么多干嘛，先喝口茶。",
  ],
  ranter: [
    "这合理吗？{topic}这种事居然还要讨论。",
    "说到底就是没人愿意负责。",
    "别粉饰了，问题摆在那儿。",
    "我就直说了，这操作挺离谱的。",
    "每次都是这样，最后认真的人吃亏。",
  ],
  pedant: [
    "严格来说，{topic}这个说法不准确。",
    "等一下，这里的时间对不上。",
    "我查过类似的，细节上有出入。",
    "先纠正一个概念，别把两件事混在一起。",
    "这个结论下早了，还缺关键一步。",
  ],
  poet: [
    "{topic}啊，像一场没下完的雨。",
    "你这句话，让我想起很旧的一件事。",
    "有时候慢一点，才看得见。",
    "热闹是他们的，我只觉得安静。",
    "有些话不必说透，留一点余地。",
  ],
  introvert: [
    "那个……{topic}我其实也想过。",
    "我可能想多了，但听着有点怪。",
    "嗯，我先听着。",
    "我不太会接话，但你们说的我都在听。",
    "要不……先说说你们怎么想的？",
  ],
  tsundere: [
    "谁管{topic}啊，不过你们别搞砸就行。",
    "行吧，算你有点道理。",
    "随便你们，反正我提醒过了。",
    "我才不是关心，只是顺口问一句。",
    "别误会，我只是觉得这样更省事。",
  ],
  caretaker: [
    "先别说{topic}了，你们吃饭了吗。",
    "可以慢慢想，别熬夜。",
    "喝口水再聊，急什么。",
    "这事不急，先把情绪放平。",
    "你们谁还没睡？早点休息。",
  ],
  doer: [
    "所以下一步是什么，先做起来。",
    "别分析了，{topic}先试一版。",
    "给我个时间点，什么时候能落地。",
    "讨论十分钟，不如动手十分钟。",
    "谁负责？什么时候交？说清楚。",
  ],
  mystic: [
    "{topic}啊……最近的磁场确实有点乱。",
    "我感觉到这事背后还有情绪没说出来。",
    "先别急着下判断，能量还没落定。",
    "有些答案不用找，等它自己来。",
    "你们有没有发现，最近总在同一类事上打转。",
  ],
  pragmatist: [
    "所以{topic}能解决什么问题，具体点。",
    "听着挺好，成本呢。",
    "够用就行，别整那么复杂。",
    "先算投入产出，再谈值不值。",
    "我只看结果，过程你们定。",
  ],
  dataphile: [
    "先给个数，{topic}到底影响几个点。",
    "这个样本太小了，说明不了趋势。",
    "我估个区间，大概率在一到两成之间。",
    "有没有数据支撑？没有的话先别下结论。",
    "按我的经验，异常值要先剔掉。",
  ],
  nostalgic: [
    "以前{topic}可不是这样的。",
    "这话让我想起十几年前。",
    "变化太快了，有些东西回不去了。",
    "我们那时候遇到这种事，处理方式完全不一样。",
    "现在热闹，过几年可能就没人记得了。",
  ],
  antiwork: [
    "{topic}这事，先问一句，非做不可吗。",
    "卷赢了你也是耗材。",
    "我的建议是，能躺就躺。",
    "多干又不加钱，图什么。",
    "先把边界划清楚，别什么都接。",
  ],
  pacifist: [
    "我理解你的意思，{topic}这块我们先对齐一下。",
    "可能我们说的不是一回事。",
    "先别上升到立场，聊聊具体需求。",
    "我建议先假设对方是好意。",
    "争对错没意义，看看怎么往下走。",
  ],
};

const GENERIC = [
  "{topic}，有点意思。",
  "我倒没这么想过。",
  "等等，先别急，我想想。",
  "那你怎么看，说说看。",
  "这句话信息量有点大。",
  "先别急着下结论，再聊聊。",
];

const TAILS = ["你们怎么看？", "先这样吧。", "我可能说多了。", "别急着喷我。"];

const LEADING =
  /^(?:行吧|好吧|嗯+|啊+|哦+|诶+|话说|说真的|说实话|我倒觉得|我觉得吧|我觉得|等一下|先别急着|先别急|别急着|别急|其实|那个|就是|然后|所以|你们觉得|大家觉得|你觉得|你们|大家|你)[，,。.！!？?…~\s]*/;

function shorten(text: string, max: number) {
  const cleaned = text
    .replace(/@[^\s，。！？,.!?]+/g, "")
    .replace(/[`*_>#「」“”]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[，,：:；;。.！!？?…~]+$/, "")
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

function extractTopic(text: string) {
  const cleaned = text
    .replace(/@[^\s，。！？,.!?]+/g, " ")
    .replace(/[「」“”"'（）()【】\[\]`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = cleaned
    .split(/[。！？!?~…]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  let candidate = sentences.find((part) => part.length >= 6) ?? sentences[0] ?? cleaned;
  for (let i = 0; i < 3; i++) candidate = candidate.replace(LEADING, "");
  const clauses = candidate
    .split(/[，,：:；;]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  candidate = (clauses[0] ?? candidate).replace(LEADING, "");
  candidate = candidate.replace(/[，,：:；;。.！!？?…~]+$/, "").trim();
  if (!candidate) return "这件事";
  return candidate.length > 16 ? candidate.slice(0, 16) : candidate;
}

function endSentence(text: string) {
  return /[。！？!?…]$/.test(text) ? text : `${text}。`;
}

export function demoReply(input: {
  self: Character;
  group: Group;
  members: Member[];
  recent: Message[];
}): string {
  const { self, group, members, recent } = input;
  const key = self.persona.archetypeKey ?? "";
  const lines = TEMPLATES[key] ?? GENERIC;
  const last = [...recent].reverse().find((m) => m.content.trim());
  const lastText = last?.content ?? group.topic ?? "这个群";
  const groupTopic = group.topic ? extractTopic(group.topic) : "";
  const lastTopic = extractTopic(lastText);
  const topic =
    groupTopic && groupTopic !== lastTopic && Math.random() < 0.22 ? groupTopic : lastTopic;
  const other =
    members.find((m) => m.characterId !== self.id)?.character.name ?? "大家";

  const fill = (template: string) =>
    template.replaceAll("{topic}", topic).replaceAll("{other}", other);

  const recentTexts = recent
    .slice(-5)
    .map((message) => message.content.trim())
    .filter(Boolean);

  let attempt = "";
  for (let i = 0; i < 7; i++) {
    let text = fill(pickOne(lines));
    if (
      text.length < 34 &&
      self.persona.opinions.length &&
      Math.random() < 0.45
    ) {
      const opinion = endSentence(pickOne(self.persona.opinions));
      if (!text.includes(opinion)) text = `${text}${opinion}`;
    }
    if (
      text.length < 42 &&
      self.persona.catchphrases.length &&
      Math.random() < 0.22
    ) {
      const phrase = endSentence(pickOne(self.persona.catchphrases));
      if (!text.includes(phrase)) text = `${phrase}${text}`;
    }
    if (!/[？?]$/.test(text) && Math.random() < 0.12) {
      text = `${text}${pickOne(TAILS)}`;
    }
    attempt = text.replace(/\s+/g, " ").trim();
    const repeated = recentTexts.some(
      (existing) =>
        existing === attempt ||
        (existing.length > 7 &&
          attempt.length > 7 &&
          existing.slice(0, 7) === attempt.slice(0, 7)),
    );
    if (!repeated) break;
  }
  return attempt.slice(0, 120);
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function* streamDemo(
  text: string,
  options: { signal?: AbortSignal; minDelay?: number; maxDelay?: number } = {},
): AsyncGenerator<StreamChunk> {
  const { signal, minDelay = 22, maxDelay = 52 } = options;
  let index = 0;
  while (index < text.length) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const step = Math.floor(Math.random() * 3) + 1;
    const piece = text.slice(index, index + step);
    index += step;
    yield { text: piece };
    await sleep(minDelay + Math.random() * (maxDelay - minDelay), signal);
  }
}

export function mockEcho(lastUserText: string): string {
  const topic = extractTopic(lastUserText || "今天聊点什么");
  const options = [
    `「${topic}」这个点挺值得聊的，你们先说。`,
    `${shorten(lastUserText, 12)}——我大概明白你的意思，不过还有别的可能。`,
    `先别急着下结论，${topic}得看具体情况。`,
    `行，那我来接一句：${topic}其实没那么简单。`,
  ];
  return pickOne(options);
}
