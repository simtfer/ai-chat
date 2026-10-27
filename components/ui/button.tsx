import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-brand via-[#7c5cf6] to-brand-2 text-[#080a10] font-semibold shadow-[0_14px_34px_-16px_rgba(139,92,246,0.9)] hover:brightness-110",
  secondary:
    "bg-white/[0.06] text-ink border border-white/[0.07] hover:bg-white/[0.1] hover:border-white/[0.12]",
  ghost: "text-ink-2 hover:text-ink hover:bg-white/[0.06]",
  outline: "border border-white/[0.12] text-ink hover:bg-white/[0.06] hover:border-white/20",
  danger:
    "bg-rose-500/15 text-rose-200 border border-rose-500/25 hover:bg-rose-500/25",
  soft: "bg-brand/15 text-violet-200 border border-brand/25 hover:bg-brand/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-11 px-5 text-[15px] rounded-xl gap-2",
  icon: "h-9 w-9 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
