import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 text-sm text-ink placeholder:text-muted/80 transition-all duration-200 hover:border-white/[0.14] focus:border-brand/60 focus:bg-white/[0.05] focus:outline-none focus:ring-4 focus:ring-brand/12 disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(base, "min-h-[84px] resize-none py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
