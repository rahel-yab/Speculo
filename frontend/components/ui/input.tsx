import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-2xl border border-white/10 bg-[#363530] px-4 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-slate-500 focus:border-accent/70 focus:ring-2 focus:ring-accent/20",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
