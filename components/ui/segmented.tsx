"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: Array<{ value: T; label: string; hint?: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-black/25 p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-lg font-medium transition-all duration-200",
              size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
              active
                ? "bg-white/[0.10] text-ink shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                : "text-muted hover:text-ink-2",
            )}
            title={option.hint}
          >
            {option.label}
            {option.hint && size !== "sm" ? (
              <span className={cn("ml-1.5 text-[10px]", active ? "text-muted" : "text-muted/70")}>
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
