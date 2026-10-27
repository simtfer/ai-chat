"use client";

import { Cpu, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { hexAlpha } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Character } from "@/lib/types";

export function CharacterCard({
  character,
  onEdit,
}: {
  character: Character;
  onEdit: () => void;
}) {
  const persona = character.persona;
  const meta = [persona.mbti, persona.occupation, persona.age].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-left transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_24px_50px_-30px_rgba(0,0,0,0.9)]",
      )}
    >
      <span
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
        style={{ background: hexAlpha(character.color, 0.35) }}
      />
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${hexAlpha(character.color, 0.7)}, transparent)`,
        }}
      />

      <div className="relative flex items-start gap-3">
        <Avatar
          name={character.name}
          emoji={character.avatarEmoji}
          color={character.color}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14.5px] font-semibold text-ink">{character.name}</p>
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-medium"
              style={{
                color: character.color,
                background: hexAlpha(character.color, 0.13),
              }}
            >
              {persona.archetype}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
            {character.tagline || persona.tone || "还没有简介"}
          </p>
        </div>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition group-hover:bg-white/[0.07] group-hover:text-ink group-hover:opacity-100">
          <Pencil size={13} />
        </span>
      </div>

      {persona.traits.length ? (
        <div className="relative mt-3 flex flex-wrap gap-1">
          {persona.traits.slice(0, 3).map((trait) => (
            <span
              key={trait}
              className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-ink-2"
            >
              {trait}
            </span>
          ))}
          {persona.traits.length > 3 ? (
            <span className="rounded-md bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-muted">
              +{persona.traits.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="relative mt-3 flex items-center gap-2 border-t border-white/[0.05] pt-2.5 text-[10px] text-muted/80">
        <span className="truncate">{meta || persona.tone || "自由生长"}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {character.modelOverride ? (
            <>
              <Cpu size={10} />
              <span className="max-w-[100px] truncate font-mono text-[9.5px]">
                {character.modelOverride}
              </span>
            </>
          ) : (
            <span className="text-muted/50">全局模型</span>
          )}
        </span>
      </div>
    </button>
  );
}
