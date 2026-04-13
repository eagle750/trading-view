"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { computeStrategyStableId } from "@/lib/strategy-stable-id";
import type { StrategyRuleModel } from "@/lib/schemas";
import { useScreenerStore, type StrategyCard } from "@/stores/screener-store";
import { cn } from "@/lib/utils";

type StrategyUploadZoneProps = {
  /** Called after at least one file parsed and added (store already updated). */
  onAfterSuccessfulUpload?: () => void;
};

export function StrategyUploadZone({
  onAfterSuccessfulUpload,
}: StrategyUploadZoneProps) {
  const { strategies, addStrategy, removeStrategy, toggleStrategySignals } =
    useScreenerStore();
  const [drag, setDrag] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [detailStrategyId, setDetailStrategyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const detailStrategy = strategies.find((s) => s.id === detailStrategyId) ?? null;

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploadError(null);
      setParsing(true);
      let addedOk = 0;
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/strategy/parse", {
            method: "POST",
            body: fd,
          });
          let data: {
            bullets?: string[];
            tags?: string[];
            ruleModel?: StrategyRuleModel;
            extractedPreview?: string;
            error?: string;
          };
          try {
            data = (await res.json()) as typeof data;
          } catch {
            setUploadError(
              `Could not read server response (HTTP ${res.status}). If the app is opened as file://, use http://localhost instead.`,
            );
            return;
          }
          if (!res.ok) {
            setUploadError(
              data.error ??
                `Upload failed (HTTP ${res.status}). Try a smaller file or a .txt sample.`,
            );
            return;
          }
          const stableId = await computeStrategyStableId(file);
          const card: StrategyCard = {
            id: stableId,
            filename: file.name,
            summaryBullets: data.bullets ?? [],
            tags: data.tags ?? [],
            ruleModel: data.ruleModel,
            extractedPreview: data.extractedPreview,
            useForSignals: true,
          };
          addStrategy(card);
          addedOk += 1;
        }
      } catch (e) {
        setUploadError(
          e instanceof Error
            ? e.message
            : "Network error while uploading — check that the dev server is running.",
        );
      } finally {
        setParsing(false);
        if (inputRef.current) inputRef.current.value = "";
        if (addedOk > 0) onAfterSuccessfulUpload?.();
      }
    },
    [addStrategy, onAfterSuccessfulUpload],
  );

  const compareOn = strategies.filter((s) => s.useForSignals).length >= 2;

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--muted)] rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2 leading-relaxed">
        <span className="text-[var(--foreground)] font-medium">How this demo works:</span>{" "}
        The screener runs over a bundled NSE-listed equity universe (thousands of symbols,
        synthetic demo data). Card summaries come from the file name and a small sample — not
        a full read of every rule. Rankings use the parsed rule model from your uploaded file when you{" "}
        <span className="text-[var(--foreground)]">Run</span>. Uploaded files stay in this
        browser until you remove them;         turning &quot;Use for signals&quot; off only excludes
        them from the next run. Click a card&apos;s filename to open extracted text and the
        parsed rule model.
      </p>

      {compareOn ? (
        <div
          className="rounded-sm border border-[#f59e0b]/40 bg-[#3a2f15]/50 px-4 py-2 text-sm text-[var(--foreground)]"
          role="status"
        >
          Compare mode: {strategies.filter((s) => s.useForSignals).length}{" "}
          strategies selected for signals. Run to compare panes.
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-sm border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center transition-app",
          drag && "border-[#3b82f6] bg-[#141416]",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm text-[var(--muted)] mb-3">
          Drop strategy files here (PDF, TXT, DOCX, XLSX) — multiple files
          supported. New strategies are enabled for signals by default; click{" "}
          <span className="text-[var(--foreground)]">Run</span> to refresh the
          table.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.docx,.xlsx,.doc,.xls"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="primary"
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
        {parsing ? (
          <p className="text-xs text-[var(--muted)] mt-3">Parsing…</p>
        ) : null}
        {uploadError ? (
          <p
            role="alert"
            className="text-xs text-[#fecaca] mt-3 max-w-md mx-auto text-left"
          >
            {uploadError}
          </p>
        ) : null}
      </div>

      <Dialog
        open={detailStrategyId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailStrategyId(null);
        }}
      >
        <DialogContent>
          {detailStrategy ? (
            <>
              <DialogTitle className="pr-8">{detailStrategy.filename}</DialogTitle>
              <DialogDescription>
                Sanitized text excerpt from your file and a numeric profile computed by fixed
                rules (not an AI quote of your document).
              </DialogDescription>
              <div className="space-y-4 text-sm">
                {detailStrategy.tags.length > 0 ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1.5">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {detailStrategy.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1.5">
                    Summary
                  </div>
                  <ul className="text-xs text-[var(--muted)] space-y-1 list-disc pl-4">
                    {detailStrategy.summaryBullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1.5">
                    Derived score weights (heuristic)
                  </div>
                  <pre className="text-[11px] font-[family-name:var(--font-jetbrains)] overflow-x-auto rounded-sm border border-[var(--border)] bg-[var(--background)] p-2 text-[var(--foreground)]">
                    {detailStrategy.ruleModel
                      ? JSON.stringify(detailStrategy.ruleModel, null, 2)
                      : "—"}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1.5">
                    Extracted text (used for parsing)
                  </div>
                  {detailStrategy.extractedPreview ? (
                    <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[11px] font-[family-name:var(--font-jetbrains)] rounded-sm border border-[var(--border)] bg-[var(--background)] p-2 text-[var(--muted)]">
                      {detailStrategy.extractedPreview}
                    </pre>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">
                      No preview stored for this card. Remove it and upload again to capture
                      extracted text.
                    </p>
                  )}
                </div>
                <DialogClose asChild>
                  <Button type="button" variant="default" className="w-full sm:w-auto">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2">
        {strategies.map((s) => (
          <article
            key={s.id}
            className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setDetailStrategyId(s.id)}
                  className="font-[family-name:var(--font-jetbrains)] text-sm text-[#93c5fd] hover:underline text-left truncate w-full"
                >
                  {s.filename}
                </button>
              </div>
              <button
                type="button"
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg leading-none px-1"
                aria-label="Remove"
                onClick={() => removeStrategy(s.id)}
              >
                ×
              </button>
            </div>
            <ul className="text-xs text-[var(--muted)] space-y-1 mb-3 list-disc pl-4">
              {s.summaryBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1 mb-4">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--foreground)]"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <label
                htmlFor={`strategy-signals-${s.id}`}
                className="text-xs text-[var(--muted)] cursor-pointer"
              >
                Use for signals
              </label>
              <Switch
                id={`strategy-signals-${s.id}`}
                checked={s.useForSignals}
                onCheckedChange={() => toggleStrategySignals(s.id)}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
