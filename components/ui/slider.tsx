"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled,
}: {
  value: number;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex h-5 w-full touch-none select-none items-center disabled:opacity-50",
        className,
      )}
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next[0] ?? value)}
      onValueCommit={
        onValueCommit ? (next) => onValueCommit(next[0] ?? value) : undefined
      }
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/[0.08]">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-brand to-brand-2" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-4 w-4 rounded-full border border-white/25 bg-white shadow-[0_0_0_5px_rgba(139,92,246,0.16)] outline-none transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-brand/30"
        aria-label="调整数值"
      />
    </SliderPrimitive.Root>
  );
}
