import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-9 w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] font-[family-name:var(--font-jetbrains)]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
