"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
} as const;

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof sizes;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={cn("dialog-content w-[calc(100vw-2rem)]", sizes[size])}
        >
          <div className="glass-strong flex max-h-[86dvh] flex-col overflow-hidden rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-[17px] font-semibold tracking-tight text-ink">
                  {title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  className={cn("mt-1 text-[13px] leading-relaxed text-muted", !description && "sr-only")}
                >
                  {description ?? title}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/[0.07] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  aria-label="关闭"
                >
                  <X size={16} />
                </button>
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer ? (
              <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-6 py-4">
                {footer}
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
