"use client";

import { cn } from "@/lib/utils";

type Opt = readonly string[];

export function SelectField({
  label,
  hint,
  unitHint,
  value,
  onChange,
  options,
  showCustom,
  customValue,
  onCustomChange,
  customPlaceholder = "Value",
}: {
  label: string;
  hint?: string;
  unitHint?: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt;
  showCustom?: boolean;
  customValue?: string;
  onCustomChange?: (v: string) => void;
  customPlaceholder?: string;
}) {
  const isCustom = value === "custom";
  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="text-sm text-[var(--foreground)]">{label}</div>
        {hint ? (
          <div className="text-xs text-[var(--muted)] mt-0.5">{hint}</div>
        ) : null}
        {unitHint ? (
          <div className="text-xs text-[var(--muted)]">{unitHint}</div>
        ) : null}
      </div>
      <select
        className={cn(
          "h-9 w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]",
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {showCustom && isCustom && onCustomChange ? (
        <InputInline
          placeholder={customPlaceholder}
          value={customValue ?? ""}
          onChange={onCustomChange}
        />
      ) : null}
    </div>
  );
}

function InputInline({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="h-9 w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 text-sm font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
