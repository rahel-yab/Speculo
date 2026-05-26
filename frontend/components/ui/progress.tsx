"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-3 w-full overflow-hidden rounded-full bg-white/8", className)} value={value}>
      <ProgressPrimitive.Indicator
        className="h-full bg-gradient-to-r from-accent via-[#d89a42] to-[#f5d3a0] transition-all duration-500"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
