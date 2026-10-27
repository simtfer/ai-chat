"use client";

import { ARCHETYPES } from "@/lib/persona/presets";
import { cn } from "@/lib/utils";

export function PresetPicker({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="max-h-[220px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ARCHETYPES.map((preset) => {
          const active = selected === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onSelect(preset.key)}
              className={cn(
                "group rounded-xl border p-2.5 text-left transition-all duration-200",
                active
                  ? "border-brand/45 bg-brand/[0.12]"
                  : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.13] hover:bg-white/[0.045]",
              )}
            >
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                <span className="text-[15px]">{preset.emoji}</span>
                {preset.label}
                {active ? (
                  <span className="ml-auto rounded bg-brand/25 px-1.5 py-0.5 text-[9px] text-violet-100">
                    已选
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block truncate text-[10.5px] text-muted">
                {preset.tagline}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
