import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#f0b167]/20 bg-[#f0b167]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffdcae]",
        className
      )}
      {...props}
    />
  );
}
