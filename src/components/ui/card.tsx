import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-sm border border-[var(--border)] bg-[var(--surface)] p-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardLabel({
  className,
  children,
  hint,
}: {
  className?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className={cn("mb-2", className)}>
      <div className="text-sm text-[var(--foreground)]">{children}</div>
      {hint ? (
        <div className="text-xs text-[var(--muted)] mt-0.5">{hint}</div>
      ) : null}
    </div>
  );
}
