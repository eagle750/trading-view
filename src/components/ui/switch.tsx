"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-sm border border-[var(--border)] bg-[var(--background)] transition-app data-[state=checked]:bg-[#1e3a5f] data-[state=checked]:border-[#3b82f6]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 translate-x-0.5 rounded-sm bg-[var(--muted)] transition-app data-[state=checked]:translate-x-4 data-[state=checked]:bg-[var(--foreground)]",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
