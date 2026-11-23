"use client";

import { Check, CircleSlash, Flag, Loader2 } from "lucide-react";
import type { AuditResult, ColumnKind, ColumnProfile, TraceStep } from "@/lib/audit/types";
import { KindBadge } from "@/components/ui";

const STATUS = {
  passed: { icon: Check, color: "text-green", ring: "border-green/30 bg-green/10" },
  flagged: { icon: Flag, color: "text-amber", ring: "border-amber/30 bg-amber/10" },
  skipped: { icon: CircleSlash, color: "text-faint", ring: "border-line2 bg-raised" },
};

export function TracePanel({
  steps,
  revealed,
  running,
}: {
  steps: TraceStep[];
  revealed: number;
  running: boolean;
}) {
  if (steps.length === 0) {
    return (
      <div className="space-y-3" aria-busy={running}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-2.5">
            <div className="mt-1 size-3.5 shrink-0 animate-pulse rounded-full bg-raised" />
            <div className="w-full space-y-1.5">
              <div className="h-2.5 w-2/3 animate-pulse rounded bg-raised" />
              <div className="h-2 w-full animate-pulse rounded bg-raised/70" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const visible = i < revealed;
        const done = i < revealed - 1 || revealed === steps.length;
        const active = running && i === revealed;
        const s = STATUS[step.status];
        const Icon = s.icon;
        return (
          <li key={step.id} className="relative flex gap-2.5 pb-3.5 last:pb-0">
            {i < steps.length - 1 ? (
              <span
                className="absolute left-[6px] top-4 h-full w-px bg-line"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={`relative z-10 mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border ${
                visible ? s.ring : "border-line bg-panel"
              }`}
            >
              {visible ? (
                <Icon size={8} className={s.color} strokeWidth={3} />
              ) : active ? (
                <Loader2 size={8} className="animate-spin text-blue" />
              ) : null}
            </span>
            <div className={`min-w-0 flex-1 transition-opacity ${visible ? "opacity-100" : "opacity-35"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-medium leading-snug text-ink">{step.title}</p>
                {visible ? (
                  <span className="mono shrink-0 text-[9px] text-faint">
                    {done ? `${step.durationMs} ms` : "run"}
                  </span>
                ) : null}
              </div>
              <p className="text-[9px] uppercase tracking-[0.12em] text-faint">{step.role}</p>
              {visible ? (
                <>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">{step.summary}</p>
                  {step.artifacts.length > 0 ? (
                    <p className="mono mt-1 text-[9px] text-faint">{step.artifacts.join(" · ")}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const KIND_ORDER: Record<ColumnKind, number> = {
  numeric: 0,
  boolean: 1,
  categorical: 2,
  datetime: 3,
  text: 4,
};

export function ColumnsPanel({
  profiles,
  associations,
}: {
  profiles: ColumnProfile[];
  associations: { name: string; kind: ColumnKind; score: number; method: string }[];
}) {
  if (profiles.length === 0) {
    return <p className="text-[11px] text-faint">Columns appear once the table is parsed.</p>;
  }
  const assoc = new Map(associations.map((a) => [a.name, a]));
  const sorted = [...profiles].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-faint">
        <span>Column</span>
        <span>Association</span>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((p) => {
          const a = assoc.get(p.name);
          return (
            <li key={p.name} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-ink">{p.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <KindBadge kind={p.kind} />
                  <span className="mono text-[9px] text-faint">{p.distinct} distinct</span>
                  {p.missing > 0 ? (
                    <span className="mono text-[9px] text-amber">{p.missing} missing</span>
                  ) : null}
                </div>
              </div>
              {a ? (
                <div className="w-14 shrink-0 text-right">
                  <p className="mono text-[10px] text-muted">{a.score.toFixed(2)}</p>
                  <div className="mt-1 h-[3px] w-full rounded-sm bg-white/8" aria-hidden="true">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${Math.min(100, a.score * 100)}%`,
                        background: a.score > 0.92 ? "#ff6161" : a.score > 0.6 ? "#f3b562" : "#57c1ff",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <span className="mono w-14 shrink-0 text-right text-[10px] text-faint">target</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line pt-2 text-[9px] leading-relaxed text-faint">
        Association is measured against the target. It is a hint, not a verdict.
      </p>
    </div>
  );
}

export function VerificationCard({ result }: { result: AuditResult }) {
  const { total, passed } = result.verifiedClaims;
  return (
    <div className="panel px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="label">Verification</p>
        <span className={`mono text-[10px] ${passed === total ? "text-green" : "text-amber"}`}>
          {passed}/{total}
        </span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        {total === 0
          ? "No findings were raised, so there was nothing to recompute. The clean result stands on the detectors."
          : passed === total
            ? "Every finding was reproduced from the raw table by a second code path before it appeared."
            : "Some findings could not be reproduced and were removed. Only verified findings are shown."}
      </p>
      <div className="mt-2.5 flex gap-1" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-sm ${i < passed ? "bg-green" : "bg-line2"}`}
          />
        ))}
      </div>
    </div>
  );
}
