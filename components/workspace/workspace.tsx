"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileUp,
  Loader2,
  Play,
  ShieldAlert,
} from "lucide-react";
import { parseCsvAsync } from "@/lib/audit/csv";
import { runAuditAsync } from "@/lib/audit/engine";
import { associationsFor } from "@/lib/audit/detectors";
import type { AuditConfig, AuditResult, Dataset } from "@/lib/audit/types";
import { DEMO_CASES } from "@/lib/cases";
import { VerdictCard, ModelCard, Findings } from "@/components/workspace/verdict";
import { TracePanel, ColumnsPanel, VerificationCard } from "@/components/workspace/trace";

type Phase = "idle" | "loading" | "running" | "done" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function guessTarget(dataset: Dataset): string {
  const columns = dataset.columns;
  for (let i = columns.length - 1; i >= 0; i--) {
    const idx = i;
    const values = dataset.rows.map((r) => r[idx]).filter((v) => v !== null && v !== "");
    const distinct = new Set(values.map((v) => String(v)));
    if (distinct.size === 2 && values.length > 20) return columns[i];
  }
  return columns[columns.length - 1] ?? "";
}

export function Workspace() {
  const [caseId, setCaseId] = useState<string>("retail_churn");
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [config, setConfig] = useState<AuditConfig>({ target: "churned", timeColumn: "signup_date", entityColumn: "customer_id" });
  const [result, setResult] = useState<AuditResult | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [revealed, setRevealed] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<"trace" | "columns">("trace");
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const compute = useCallback(async (ds: Dataset, cfg: AuditConfig) => {
    const id = ++runId.current;
    setPhase("running");
    setResult(null);
    setRevealed(0);
    setOpenId(null);
    await sleep(60);
    try {
      const res = await runAuditAsync(ds, cfg);
      if (id !== runId.current) return;
      setResult(res);
      for (let i = 1; i <= res.trace.length; i++) {
        await sleep(110);
        if (id !== runId.current) return;
        setRevealed(i);
      }
      setOpenId(res.findings[0]?.id ?? null);
      setPhase("done");
    } catch {
      if (id !== runId.current) return;
      setError("The audit could not finish on this table. Check the target column and try again.");
      setPhase("error");
    }
  }, []);

  const loadCase = useCallback(
    async (id: string) => {
      const meta = DEMO_CASES.find((c) => c.id === id);
      if (!meta) return;
      setCaseId(meta.id);
      setError(null);
      setPhase("loading");
      setResult(null);
      try {
        const res = await fetch(`/cases/${meta.file}`);
        if (!res.ok) throw new Error("missing");
        const ds = await parseCsvAsync(await res.text(), meta.file);
        setDataset(ds);
        const cfg: AuditConfig = {
          target: meta.target,
          timeColumn: meta.timeColumn,
          entityColumn: meta.entityColumn,
        };
        setConfig(cfg);
        await compute(ds, cfg);
      } catch {
        setError("The demo file did not load. Check your connection and retry.");
        setPhase("error");
      }
    },
    [compute],
  );

  useEffect(() => {
    const timer = setTimeout(() => void loadCase("retail_churn"), 0);
    return () => clearTimeout(timer);
  }, [loadCase]);

  const runCurrent = useCallback(() => {
    if (!dataset || !config.target) return;
    const cfg: AuditConfig = {
      target: config.target,
      timeColumn: config.timeColumn ?? null,
      entityColumn: config.entityColumn ?? null,
    };
    setConfig(cfg);
    void compute(dataset, cfg);
  }, [dataset, config, compute]);

  const onUpload = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const text = await file.text();
        const ds = await parseCsvAsync(text, file.name);
        if (ds.columns.length < 2 || ds.rows.length < 40) {
          setError("A table needs at least two columns and forty rows for a useful audit.");
          return;
        }
        const target = guessTarget(ds);
        const cfg: AuditConfig = { target, timeColumn: null, entityColumn: null };
        setDataset(ds);
        setCaseId("custom");
        setConfig(cfg);
        await compute(ds, cfg);
      } catch {
        setError("That file could not be parsed as CSV.");
      }
    },
    [compute],
  );

  const associations = useMemo(() => {
    if (!dataset || !result) return [];
    return associationsFor(dataset, result.config.target, result.profiles).slice(0, 6);
  }, [dataset, result]);

  const onExport = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `holdout-${result.datasetName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const columns = dataset?.columns ?? [];
  const busy = phase === "loading" || phase === "running";
  const isSampled = result?.analysisMode === "sampled";

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold tracking-tight">Audit workspace</h1>
            <span className="chip border-blue/25 bg-blue/10 text-blue">demo data</span>
          </div>
          <p className="mt-1 text-[12px] text-faint">
            Four bundled cases. Every number is computed when the page loads, not stored.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="btn btn-ghost focus-ring h-8 px-3 text-[12px]"
          >
            <FileUp size={13} />
            Upload CSV
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!result}
            className="btn btn-ghost focus-ring h-8 px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={13} />
            Export report
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red/30 bg-red/8 px-4 py-3">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-ink">Something in the run blocked.</p>
            <p className="mt-0.5 text-[12px] text-muted">{error}</p>
          </div>
          {dataset ? (
            <button
              type="button"
              onClick={runCurrent}
              className="btn btn-ghost focus-ring ml-auto h-7 shrink-0 px-2 text-[11px]"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[232px_minmax(0,1fr)_344px]">
        <aside className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="label">Case library</p>
          </div>
          <div className="p-2">
            {DEMO_CASES.map((c) => {
              const active = caseId === c.id;
              const tone =
                c.expectation === "Blocks" ? "bg-red" : c.expectation === "Review" ? "bg-amber" : "bg-green";
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void loadCase(c.id)}
                  aria-current={active ? "true" : undefined}
                  className={`focus-ring flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                    active ? "bg-raised" : "hover:bg-raised/60"
                  }`}
                >
                  <span className={`mt-[6px] size-[6px] shrink-0 rounded-full ${tone}`} />
                  <span className="min-w-0">
                    <span className={`block text-[12px] ${active ? "text-ink" : "text-muted"}`}>{c.title}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-faint">{c.blurb}</span>
                    <span className="mono mt-1 block text-[9px] uppercase tracking-wider text-faint">
                      {c.rows} rows / {c.expectation.toLowerCase()}
                    </span>
                  </span>
                </button>
              );
            })}
            {caseId === "custom" && dataset ? (
              <div className="flex items-start gap-2.5 rounded-lg bg-raised px-2.5 py-2.5">
                <span className={`mt-[6px] size-[6px] shrink-0 rounded-full ${isSampled ? "bg-amber" : "bg-blue"}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] text-ink">{dataset.name}</span>
                  <span className="mono mt-1 block text-[9px] uppercase tracking-wider text-faint">
                    {dataset.rows.length} rows / uploaded
                  </span>
                  {isSampled ? (
                    <span className="mono mt-1 block text-[9px] text-amber">
                      sampled analysis ({result?.sampleSize} analysis rows)
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
          </div>

          <div className="border-t border-line px-4 py-3">
            <p className="label">Column roles</p>
            <div className="mt-3 space-y-2.5">
              <RoleSelect
                label="Target"
                value={config.target}
                columns={columns}
                onChange={(v) =>
                  setConfig((c) => ({
                    ...c,
                    target: v,
                    timeColumn: c.timeColumn === v ? null : c.timeColumn,
                    entityColumn: c.entityColumn === v ? null : c.entityColumn,
                  }))
                }
              />
              <RoleSelect
                label="Time column"
                value={config.timeColumn ?? ""}
                columns={columns}
                optional
                onChange={(v) => setConfig((c) => ({ ...c, timeColumn: v || null }))}
              />
              <RoleSelect
                label="Entity column"
                value={config.entityColumn ?? ""}
                columns={columns}
                optional
                onChange={(v) => setConfig((c) => ({ ...c, entityColumn: v || null }))}
              />
            </div>
            <button
              type="button"
              onClick={runCurrent}
              disabled={busy || !dataset}
              className="btn btn-primary focus-ring mt-3 w-full text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {busy ? "Auditing" : "Run audit"}
            </button>
            <p className="mt-2 text-[10px] leading-relaxed text-faint">
              The file stays in this tab. Only the bundled demos are fetched. Large tables are analyzed
              on a deterministic sample; the full row count is always reported.
            </p>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="mono truncate text-[11px] text-faint">
                {dataset?.name ?? "loading"}
              </span>
              {dataset ? (
                <span className="mono text-[10px] text-faint">
                  {dataset.rows.length} rows / {dataset.columns.length} cols
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {phase === "done" && result ? (
                <span className="mono flex items-center gap-1.5 text-[10px] text-green">
                  <span className="size-[5px] rounded-full bg-green" />
                  verified {result.verifiedClaims.passed}/{result.verifiedClaims.total}
                </span>
              ) : null}
              {busy ? (
                <span className="mono flex items-center gap-1.5 text-[10px] text-blue">
                  <span className="size-[5px] animate-pulse rounded-full bg-blue" />
                  running
                </span>
              ) : null}
            </div>
          </div>

          {result ? (
            <>
              <VerdictCard result={result} />
              <ModelCard result={result} />
              <Findings result={result} openId={openId} setOpenId={setOpenId} />
            </>
          ) : (
            <Skeleton phase={phase} />
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-[72px]">
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-1 border-b border-line p-1.5">
              <button
                type="button"
                onClick={() => setTab("trace")}
                aria-pressed={tab === "trace"}
                className={`focus-ring flex-1 rounded-md px-3 py-1.5 text-[11px] transition-colors ${
                  tab === "trace" ? "bg-raised text-ink" : "text-muted hover:text-ink"
                }`}
              >
                Agent trace
              </button>
              <button
                type="button"
                onClick={() => setTab("columns")}
                aria-pressed={tab === "columns"}
                className={`focus-ring flex-1 rounded-md px-3 py-1.5 text-[11px] transition-colors ${
                  tab === "columns" ? "bg-raised text-ink" : "text-muted hover:text-ink"
                }`}
              >
                Columns
              </button>
            </div>
            <div className="p-4">
              {tab === "trace" ? (
                <TracePanel
                  steps={result?.trace ?? []}
                  revealed={result ? revealed : 0}
                  running={busy}
                />
              ) : (
                <ColumnsPanel profiles={result?.profiles ?? []} associations={associations} />
              )}
            </div>
          </div>

          {result ? <VerificationCard result={result} /> : null}

          <div className="panel px-4 py-3">
            <p className="label">Engine</p>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-faint">Version</dt>
                <dd className="mono text-muted">{result?.engineVersion ?? "1.4.0"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-faint">Runtime</dt>
                <dd className="text-muted">Browser, local</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-faint">Model</dt>
                <dd className="mono text-muted">logistic / ridge</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-faint">Analysis</dt>
                <dd className={`mono text-muted ${isSampled ? "text-amber" : ""}`}>
                  {isSampled ? "sampled" : "full"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RoleSelect({
  label,
  value,
  columns,
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  columns: string[];
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  const id = `role-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-faint">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="focus-ring h-8 w-full appearance-none rounded-md border border-line bg-raised px-2 pr-6 text-[12px] text-ink"
        >
          {optional ? <option value="">Not set</option> : null}
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint"
        />
      </div>
    </div>
  );
}

function Skeleton({ phase }: { phase: Phase }) {
  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="w-full space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-raised" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-raised" />
            <div className="h-3 w-full animate-pulse rounded bg-raised" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-raised" />
          </div>
          <div className="h-12 w-14 animate-pulse rounded bg-raised" />
        </div>
      </div>
      <div className="panel p-5">
        <div className="h-3 w-28 animate-pulse rounded bg-raised" />
        <div className="mt-6 space-y-4">
          <div className="h-2 w-full animate-pulse rounded bg-raised" />
          <div className="h-2 w-2/3 animate-pulse rounded bg-raised" />
        </div>
      </div>
      <p className="mono text-center text-[11px] text-faint">
        {phase === "loading" ? "loading case" : "profiling, detecting, quantifying"}
      </p>
    </div>
  );
}
