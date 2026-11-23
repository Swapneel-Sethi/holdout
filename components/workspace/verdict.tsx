"use client";

import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";
import { MetricBar, SeverityDot, SEVERITY_TEXT } from "@/components/ui";
import { LEAK_LABELS, type AuditResult, type Finding } from "@/lib/audit/types";

const tone = {
  block: { text: "text-red", bg: "bg-red", border: "border-red/30", soft: "bg-red/10" },
  review: { text: "text-amber", bg: "bg-amber", border: "border-amber/30", soft: "bg-amber/10" },
  ship: { text: "text-green", bg: "bg-green", border: "border-green/30", soft: "bg-green/10" },
};

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function VerdictCard({ result }: { result: AuditResult }) {
  const t = tone[result.verdict.level];
  return (
    <div className={`panel overflow-hidden border-l-2 ${t.border}`}>
      <div className="p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded border ${t.border} ${t.soft} px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${t.text}`}
              >
                <span className={`size-[5px] rounded-full ${t.bg}`} />
                {result.verdict.label}
              </span>
              <span className="mono text-[10px] text-faint">
                score {result.verdict.score}/100
              </span>
              <span className="mono text-[10px] text-faint">
                {result.rows} rows / {result.columnCount} cols
              </span>
            </div>
            <h2 className="mt-3 text-[20px] font-medium leading-snug tracking-[-0.02em] text-ink">
              {result.verdict.headline}
            </h2>
            <p className="mt-2 max-w-[620px] text-[12px] leading-relaxed text-muted">
              {result.verdict.detail}
            </p>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className={`mono text-[42px] leading-none ${t.text}`}>{result.verdict.score}</p>
            <p className="mt-1 text-[10px] text-faint">readiness</p>
          </div>
        </div>
        <div className="mt-4">
          <MetricBar
            value={result.verdict.score / 100}
            tone={result.verdict.level === "block" ? "red" : result.verdict.level === "review" ? "amber" : "green"}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line bg-raised/40 px-5 py-2.5 text-[10px] text-faint">
        <span className="mono">engine {result.engineVersion}</span>
        <span className="mono">
          verifier {result.verifiedClaims.passed}/{result.verifiedClaims.total}
        </span>
        <span className="mono">{result.findings.length} findings kept</span>
        <span className="mono ml-auto">
          {new Date(result.generatedAt).toISOString().slice(0, 19).replace("T", " ")} UTC
        </span>
      </div>
    </div>
  );
}

export function ModelCard({ result }: { result: AuditResult }) {
  const m = result.model;
  if (!m) {
    return (
      <div className="panel p-5">
        <p className="label">Model risk</p>
        <p className="mt-3 text-[13px] text-muted">
          The target does not support a binary or numeric model on this table, so the inflation
          estimate was skipped. The detector findings above still stand.
        </p>
      </div>
    );
  }

  const candidates = [m.clean, m.temporal, m.grouped].filter((v): v is number => typeof v === "number");
  const honest = candidates.length ? Math.min(...candidates) : m.clean;
  const inflationPts = m.inflation * 100;
  const label = m.metric === "auc" ? "AUC" : "R squared";

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <p className="label">Model risk</p>
          <p className="mt-1 text-[11px] text-faint">
            {m.folds} fold {label}, {m.rows} labelled rows, {m.features} features
          </p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="mono text-[22px] text-ink">{m.inflation.toFixed(3)}</span>
          <span className="text-[10px] text-faint">inflation</span>
        </div>
      </div>

      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] text-muted">Reported, all features</p>
            <p className="mono text-[16px] text-red">{m.full.toFixed(3)}</p>
          </div>
          <div className="mt-2">
            <MetricBar value={Math.max(0, m.full)} tone="red" />
          </div>
          <p className="mt-2 text-[10px] leading-snug text-faint">Random split, every column in the matrix.</p>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] text-muted">Honest estimate</p>
            <p className="mono text-[16px] text-green">{honest.toFixed(3)}</p>
          </div>
          <div className="mt-2">
            <MetricBar value={Math.max(0, honest)} tone="green" />
          </div>
          <p className="mt-2 text-[10px] leading-snug text-faint">
            Flagged columns removed, strongest holdout applied.
          </p>
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-2 border-t border-line px-5 py-3 sm:grid-cols-3">
        <Row label="Clean features" value={m.clean.toFixed(3)} />
        <Row label="Out of time" value={m.temporal === null ? "not available" : m.temporal.toFixed(3)} />
        <Row label="Group holdout" value={m.grouped === null ? "not available" : m.grouped.toFixed(3)} />
      </div>

      {m.droppedColumns.length > 0 ? (
        <div className="border-t border-line px-5 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-faint">Removed from the honest model</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.droppedColumns.map((c) => (
              <span key={c} className="chip mono text-[10px] text-red/90">
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="border-t border-line bg-raised/40 px-5 py-2.5 text-[10px] leading-relaxed text-faint">
        The honest model is a regularised linear baseline. Read the gap as a lower bound on the leak,
        not as a leaderboard prediction. {inflationPts > 0 ? `${pct(m.inflation)} of the reported metric does not survive.` : "No measurable inflation on this table."}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-faint">{label}</span>
      <span className="mono text-muted">{value}</span>
    </div>
  );
}

export function Findings({
  result,
  openId,
  setOpenId,
}: {
  result: AuditResult;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const counts = result.findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div className="flex items-center gap-3">
          <p className="label">Findings</p>
          <span className="mono text-[10px] text-faint">{result.findings.length}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-faint">
          {(["critical", "high", "medium", "low"] as const).map((s) =>
            counts[s] ? (
              <span key={s} className="flex items-center gap-1.5">
                <SeverityDot severity={s} />
                <span className={`mono ${SEVERITY_TEXT[s]}`}>{counts[s]}</span>
              </span>
            ) : null,
          )}
        </div>
      </div>

      {result.findings.length === 0 ? (
        <div className="flex items-start gap-3 px-5 py-8">
          <CircleCheck size={18} className="mt-0.5 text-green" />
          <div>
            <p className="text-[13px] font-medium text-ink">No findings survived verification.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Eight detectors ran, and the verifier reproduced every claim. Keep the split strategy
              documented and rerun the audit when the data changes.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {result.findings.map((f) => (
            <FindingRow
              key={f.id}
              finding={f}
              open={openId === f.id}
              onToggle={() => setOpenId(openId === f.id ? null : f.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

const BORDER: Record<string, string> = {
  critical: "border-l-red/70",
  high: "border-l-amber/70",
  medium: "border-l-blue/60",
  low: "border-l-line2",
};

function FindingRow({
  finding,
  open,
  onToggle,
}: {
  finding: Finding;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={`border-l-2 ${BORDER[finding.severity]} bg-panel`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`finding-${finding.id}`}
        className="focus-ring flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-raised/50"
      >
        <span className="mt-[6px]">
          <SeverityDot severity={finding.severity} pulse={finding.severity === "critical"} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-snug text-ink">{finding.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="mono text-[9px] uppercase tracking-[0.12em] text-faint">
              {LEAK_LABELS[finding.leakType]}
            </span>
            {finding.columns.map((c) => (
              <span key={c} className="chip mono text-[9px]">{c}</span>
            ))}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <span className={`mono hidden text-[10px] sm:block ${SEVERITY_TEXT[finding.severity]}`}>
            {finding.metric.display}
          </span>
          <ChevronDown
            size={14}
            className={`text-faint transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div id={`finding-${finding.id}`} className="px-4 pb-4 pl-[34px]">
          <p className="max-w-[640px] text-[12px] leading-relaxed text-muted">{finding.detail}</p>

          <div className="mt-3 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
            {finding.evidence.map((e) => (
              <div key={e.label} className="bg-panel px-3 py-2">
                <p className="text-[9px] uppercase tracking-[0.1em] text-faint">{e.label}</p>
                <p className="mono mt-1 text-[12px] text-ink">{e.value}</p>
                {e.note ? <p className="mt-0.5 text-[10px] leading-snug text-faint">{e.note}</p> : null}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-blue/20 bg-blue/5 px-3 py-2.5">
            <CircleAlert size={13} className="mt-0.5 shrink-0 text-blue" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.12em] text-blue">Repair</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{finding.fix}</p>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
