"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function TagEditor({
  values,
  onChange,
  placeholder = "输入后按回车添加",
  max = 8,
  icon: Icon,
  maxLength = 40,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
  icon?: LucideIcon;
  maxLength?: number;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const text = input.trim().slice(0, maxLength);
    if (!text || values.includes(text) || values.length >= max) {
      setInput("");
      return;
    }
    onChange([...values, text]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="group inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.05] py-1 pl-2.5 pr-1.5 text-[12px] text-ink-2 transition hover:border-white/[0.14]"
          >
            {Icon ? <Icon size={11} className="text-muted" /> : null}
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((item) => item !== value))}
              className="grid h-4 w-4 place-items-center rounded text-muted transition hover:bg-white/10 hover:text-rose-300"
              aria-label={`移除 ${value}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {values.length === 0 ? (
          <span className="text-[11.5px] text-muted/70">还没有内容</span>
        ) : null}
      </div>
      {values.length < max ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  add();
                }
                if (e.key === "Backspace" && !input && values.length) {
                  onChange(values.slice(0, -1));
                }
              }}
              onBlur={add}
              placeholder={placeholder}
              maxLength={maxLength}
              className="h-8 w-full rounded-lg border border-white/[0.08] bg-black/20 px-2.5 text-[12px] text-ink placeholder:text-muted/70 focus:border-brand/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={add}
              disabled={!input.trim()}
              className={cn(
                "absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md text-muted transition",
                input.trim()
                  ? "hover:bg-white/[0.08] hover:text-ink"
                  : "opacity-40",
              )}
              aria-label="添加"
            >
              <Plus size={12} />
            </button>
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted/70">
            {values.length}/{max}
          </span>
        </div>
      ) : (
        <p className="text-[10.5px] text-muted/70">已达上限 {max} 个</p>
      )}
    </div>
  );
}
