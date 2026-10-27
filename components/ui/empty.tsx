import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-brand/25 blur-2xl" />
        <div className="relative grid h-16 w-16 place-items-center rounded-3xl border border-white/[0.08] bg-white/[0.04] text-violet-200">
          <Icon size={26} strokeWidth={1.6} />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
