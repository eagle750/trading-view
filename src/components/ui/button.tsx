import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 text-sm font-medium transition-app border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:opacity-90 disabled:pointer-events-none disabled:opacity-40 px-3 py-2 rounded-sm",
  {
    variants: {
      variant: {
        default: "",
        primary:
          "border-[#3b82f6] bg-[#1e3a5f] text-[var(--foreground)]",
        ghost: "border-transparent bg-transparent",
        danger: "border-[#ef4444] bg-[#3f1515]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
