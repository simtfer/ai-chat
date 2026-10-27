import { COLOR_PALETTE, EMOJI_POOL, type Persona } from "../types";
import { pickOne, shuffle } from "../utils";
import { ARCHETYPES, getArchetype, personaFromPreset } from "./presets";

export type CharacterDraft = {
  name: string;
  avatarEmoji: string;
  color: string;
  tagline: string;
  persona: Persona;
};

const NAME_POOL = [
  "阿哲", "小满", "老猫", "江屿", "林深", "米粒", "周末", "阿树",
  "苏打", "北岛", "鹿鸣", "望舒", "一川", "小野", "阿岚", "程野",
  "沐白", "半夏", "拾一", "南栀", "粒子", "卡卡", "阿蓝", "七喜",
  "乌鸦", "萤火", "山海", "无糖", "阿柚", "沉舟", "星野", "桃酥",
  "木可", "迟夏", "老K", "十七", "白露", "阿霈", "陈皮", "望潮",
];

const AGES = ["22 岁", "24 岁", "26 岁", "28 岁", "30 岁", "33 岁", "35 岁上下", "快 40 了"];

const EXTRA_TRAITS = [
  "有点固执", "偶尔自嘲", "嘴比脑子快", "慢热", "共情力强", "讨厌客套",
  "好奇心重", "容易上头", "记仇但也记好", "说话不过脑子", "在意细节", "不太服管",
];

const EXTRA_QUIRKS = [
  "喜欢用「说实话」开头", "爱在句尾加个「吧」", "习惯先说结论", "偶尔突然跑题",
  "喜欢用反问收尾", "会把话题扯回吃", "常发一句就停", "爱用「绝了」",
];

const EXTRA_CATCHPHRASES = [
  "不是，你听我说",
  "这就很微妙了",
  "我先观望一下",
  "行，你继续",
  "有那么点道理",
  "我持保留意见",
];

const EXTRA_OPINIONS = [
  "大多数选择到最后都是权衡",
  "人很难被说服，只能被生活教育",
  "别把个别当普遍",
  "情绪上来的时候不适合做决定",
  "认真聊比赢重要",
  "边界感比热情更重要",
];

const GENERIC_TAGLINES = [
  "一个想法很多、嘴上不闲着的人",
  "看起来随便，其实心里有数",
  "不太擅长客套，但很愿意聊",
  "习惯从奇怪的角度看事情",
];

function randomName(existing: string[]): string {
  const taken = new Set(existing);
  const free = NAME_POOL.filter((name) => !taken.has(name));
  if (free.length === 0) {
    return `${pickOne(NAME_POOL)}${Math.floor(Math.random() * 90 + 10)}`;
  }
  return pickOne(free);
}

function jitter(base: Persona): Persona {
  const persona: Persona = {
    ...base,
    traits: [...base.traits],
    quirks: [...base.quirks],
    catchphrases: [...base.catchphrases],
    opinions: [...base.opinions],
  };
  if (Math.random() < 0.75) {
    const trait = pickOne(EXTRA_TRAITS);
    if (!persona.traits.includes(trait)) persona.traits.push(trait);
  }
  if (Math.random() < 0.6) {
    const quirk = pickOne(EXTRA_QUIRKS);
    if (!persona.quirks.includes(quirk)) persona.quirks.push(quirk);
  }
  if (Math.random() < 0.5) {
    const phrase = pickOne(EXTRA_CATCHPHRASES);
    if (!persona.catchphrases.includes(phrase)) persona.catchphrases.push(phrase);
  }
  if (Math.random() < 0.5) {
    const opinion = pickOne(EXTRA_OPINIONS);
    if (!persona.opinions.includes(opinion)) persona.opinions.push(opinion);
  }
  persona.traits = shuffle(persona.traits);
  persona.quirks = shuffle(persona.quirks);
  persona.catchphrases = shuffle(persona.catchphrases);
  persona.opinions = shuffle(persona.opinions);
  return persona;
}

export function draftFromPreset(key: string, existingNames: string[] = []): CharacterDraft | null {
  const preset = getArchetype(key);
  if (!preset) return null;
  return {
    name: randomName(existingNames),
    avatarEmoji: preset.emoji,
    color: pickOne(COLOR_PALETTE),
    tagline: preset.tagline,
    persona: jitter(personaFromPreset(preset)),
  };
}

export function generatePersona(options: {
  existingNames?: string[];
  archetypeKey?: string;
  lastArchetypeKey?: string;
} = {}): CharacterDraft {
  const existing = options.existingNames ?? [];
  let preset = getArchetype(options.archetypeKey);
  if (!preset) {
    const candidates = ARCHETYPES.filter((item) => item.key !== options.lastArchetypeKey);
    preset = pickOne(candidates.length ? candidates : ARCHETYPES);
  }
  const persona = jitter(personaFromPreset(preset));
  return {
    name: randomName(existing),
    avatarEmoji: Math.random() < 0.45 ? preset.emoji : pickOne(EMOJI_POOL),
    color: pickOne(COLOR_PALETTE),
    tagline: Math.random() < 0.75 ? preset.tagline : pickOne(GENERIC_TAGLINES),
    persona: {
      ...persona,
      age: Math.random() < 0.6 ? pickOne(AGES) : undefined,
    },
  };
}

export function generateCrowd(count: number, existingNames: string[] = []): CharacterDraft[] {
  const names = [...existingNames];
  const drafts: CharacterDraft[] = [];
  let lastKey: string | undefined;
  const usedKeys = new Set<string>();
  for (let i = 0; i < count; i++) {
    let draft: CharacterDraft;
    // Prefer archetypes not already used in this batch so a group feels varied.
    let attempts = 0;
    do {
      draft = generatePersona({ existingNames: names, lastArchetypeKey: lastKey });
      attempts++;
    } while (usedKeys.has(draft.persona.archetypeKey ?? "") && attempts < 8);
    usedKeys.add(draft.persona.archetypeKey ?? "");
    lastKey = draft.persona.archetypeKey;
    names.push(draft.name);
    drafts.push(draft);
  }
  return drafts;
}
