"use client";

import { Quote, Sparkles, Tag } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Textarea } from "@/components/ui/input";
import { TagEditor } from "@/components/characters/TagEditor";
import { ARCHETYPES } from "@/lib/persona/presets";
import { COLOR_PALETTE, EMOJI_POOL, type Persona } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CharacterFormValue = {
  name: string;
  avatarEmoji: string;
  color: string;
  tagline: string;
  modelOverride: string;
  persona: Persona;
};

export const EMPTY_PERSONA: Persona = {
  archetype: "自定义角色",
  traits: [],
  tone: "",
  quirks: [],
  catchphrases: [],
  opinions: [],
  background: "",
  taboo: "",
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-2">
          <span className="h-3 w-[2px] rounded-full bg-gradient-to-b from-brand to-brand-2" />
          {title}
        </h3>
        {hint ? <span className="text-[10.5px] text-muted/80">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function PersonaForm({
  value,
  onChange,
}: {
  value: CharacterFormValue;
  onChange: (next: CharacterFormValue) => void;
}) {
  const persona = value.persona;
  const patchPersona = (patch: Partial<Persona>) =>
    onChange({ ...value, persona: { ...persona, ...patch } });

  return (
    <div className="space-y-6">
      <Section title="基础信息">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-start gap-3.5">
            <Avatar
              name={value.name || "新角色"}
              emoji={value.avatarEmoji}
              color={value.color}
              size={56}
              active
            />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <Input
                  value={value.name}
                  onChange={(e) => onChange({ ...value, name: e.target.value })}
                  placeholder="角色名，例如：阿哲"
                  maxLength={24}
                  className="h-9 bg-black/20"
                  autoFocus
                />
                <span className="w-10 shrink-0 text-right font-mono text-[10px] text-muted">
                  {value.name.length}/24
                </span>
              </div>
              <Input
                value={value.tagline}
                onChange={(e) => onChange({ ...value, tagline: e.target.value })}
                placeholder="一句话简介，其他 AI 会看到它"
                maxLength={80}
                className="h-9 bg-black/20 text-[12.5px]"
              />
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            <p className="text-[11px] text-muted">头像</p>
            <div className="flex flex-wrap gap-1">
              {EMOJI_POOL.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onChange({ ...value, avatarEmoji: emoji })}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg text-[15px] transition",
                    value.avatarEmoji === emoji
                      ? "bg-white/[0.12] ring-1 ring-brand/60"
                      : "hover:bg-white/[0.07]",
                  )}
                  aria-label={`选择头像 ${emoji}`}
                  aria-pressed={value.avatarEmoji === emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-[11px] text-muted">主题色</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ ...value, color })}
                  className={cn(
                    "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                    value.color === color
                      ? "border-white/80 ring-2 ring-white/20"
                      : "border-white/15",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`选择颜色 ${color}`}
                  aria-pressed={value.color === color}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="性格原型" hint="可自由填写">
            <Input
              value={persona.archetype}
              onChange={(e) => patchPersona({ archetype: e.target.value })}
              placeholder="例如：杠精"
              maxLength={40}
              list="archetype-options"
            />
            <datalist id="archetype-options">
              {ARCHETYPES.map((preset) => (
                <option key={preset.key} value={preset.label} />
              ))}
            </datalist>
          </Field>
          <Field label="职业" hint="可选">
            <Input
              value={persona.occupation ?? ""}
              onChange={(e) => patchPersona({ occupation: e.target.value })}
              placeholder="例如：产品经理"
              maxLength={40}
            />
          </Field>
          <Field label="MBTI" hint="可选">
            <Input
              value={persona.mbti ?? ""}
              onChange={(e) => patchPersona({ mbti: e.target.value })}
              placeholder="例如：ENTP"
              maxLength={20}
            />
          </Field>
          <Field label="年龄感" hint="可选">
            <Input
              value={persona.age ?? ""}
              onChange={(e) => patchPersona({ age: e.target.value })}
              placeholder="例如：28 岁"
              maxLength={20}
            />
          </Field>
        </div>
      </Section>

      <Section title="性格内核" hint="决定 TA 怎么想">
        <Field label="性格标签" hint="最多 8 个">
          <TagEditor
            values={persona.traits}
            onChange={(traits) => patchPersona({ traits })}
            placeholder="例如：爱抬杠、嘴硬心软…"
            icon={Tag}
          />
        </Field>
        <Field label="背景故事" hint="最多 400 字">
          <Textarea
            value={persona.background}
            onChange={(e) => patchPersona({ background: e.target.value })}
            placeholder="TA 经历过什么？为什么会变成现在这样？"
            maxLength={400}
            rows={3}
            className="min-h-[76px]"
          />
        </Field>
        <Field label="禁忌 / 不会做的事" hint="可选">
          <Input
            value={persona.taboo}
            onChange={(e) => patchPersona({ taboo: e.target.value })}
            placeholder="例如：不会进行人身攻击"
            maxLength={200}
          />
        </Field>
      </Section>

      <Section title="表达习惯" hint="决定 TA 怎么说">
        <Field label="说话风格">
          <Input
            value={persona.tone}
            onChange={(e) => patchPersona({ tone: e.target.value })}
            placeholder="例如：短句、爱用反问、语速快"
            maxLength={200}
          />
        </Field>
        <Field label="小习惯 / 口头禅" hint="最多 8 个">
          <TagEditor
            values={persona.quirks}
            onChange={(quirks) => patchPersona({ quirks })}
            placeholder="例如：喜欢先下结论…"
            icon={Sparkles}
          />
        </Field>
        <Field label="常挂嘴边的话" hint="最多 8 句">
          <TagEditor
            values={persona.catchphrases}
            onChange={(catchphrases) => patchPersona({ catchphrases })}
            placeholder="例如：有没有一种可能…"
            icon={Quote}
            maxLength={60}
          />
        </Field>
        <Field label="立场 / 观点" hint="制造分歧用">
          <TagEditor
            values={persona.opinions}
            onChange={(opinions) => patchPersona({ opinions })}
            placeholder="例如：多数共识经不起推敲…"
            maxLength={80}
          />
        </Field>
      </Section>

      <Section title="模型" hint="留空使用全局设置">
        <Field label="单独指定模型" hint="可选">
          <Input
            value={value.modelOverride}
            onChange={(e) => onChange({ ...value, modelOverride: e.target.value })}
            placeholder="例如：deepseek-chat、gpt-4o-mini"
            maxLength={120}
          />
        </Field>
        <p className="text-[11px] leading-relaxed text-muted">
          用同一个群聊混搭不同模型，方便对比它们的说话风格。
        </p>
      </Section>
    </div>
  );
}
