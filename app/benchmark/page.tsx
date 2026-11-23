import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import benchmark from "@/data/benchmark.json";
import { MetricBar } from "@/components/ui";

export const metadata: Metadata = {
  title: "Benchmark",
  description:
    "The Holdout detector benchmark: 59 synthetic datasets across eight leakage families, including a stress suite built to sit under the thresholds.",
};

const runs = benchmark.runs as {
  name: string;
  suite: string;
  expected: string;
  matched: boolean;
  latencyMs: number;
  findings: string[];
  modelInflation: number | null;
}[];

export default function BenchmarkPage() {
  const misses = runs.filter((r) => !r.matched);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
      <p className="label">Benchmark</p>
      <h1 className="mt-3 max-w-[720px] text-[36px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[46px]">
        We publish the cases we miss.
      </h1>
      <p className="mt-4 max-w-[640px] text-[14px] leading-relaxed text-muted">
        Every number below comes from running the same engine the workspace uses against generated
        tables with a known planting. The core suite checks that each detector fires. The stress suite
        is built under the thresholds, so the misses stay visible instead of being tuned away.
      </p>

      <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Overall F1", v: benchmark.overall.f1.toFixed(3), s: "leak recall against clean pass" },
          { k: "Leak recall", v: benchmark.overall.recall.toFixed(3), s: `${benchmark.overall.datasets} datasets` },
          { k: "Clean pass", v: benchmark.overall.cleanPassRate.toFixed(3), s: "no false block on clean tables" },
          { k: "Verified claims", v: `${Math.round(benchmark.overall.verifiedRate * 100)}%`, s: "recomputed by a second path" },
        ].map((x) => (
          <div key={x.k} className="bg-panel px-5 py-5">
            <p className="label">{x.k}</p>
            <p className="mono mt-2 text-[30px] leading-none text-ink">{x.v}</p>
            <p className="mt-2 text-[11px] leading-snug text-faint">{x.s}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-faint">
        <span className="mono">engine {benchmark.engineVersion}</span>
        <span className="mono">median {benchmark.overall.medianLatencyMs} ms</span>
        <span className="mono">generated {benchmark.generatedAt.slice(0, 10)}</span>
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Suites</h2>
          <p className="text-[11px] text-faint">
            Recall is reported against the planted family. Clean pass is the share of clean tables
            with no critical or high finding.
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <div className="hidden grid-cols-[1fr_90px_90px_90px_90px] gap-4 border-b border-line bg-raised px-4 py-2.5 md:grid">
            <p className="label">Suite</p>
            <p className="label text-right">Sets</p>
            <p className="label text-right">Recall</p>
            <p className="label text-right">Clean</p>
            <p className="label text-right">F1</p>
          </div>
          {[
            { name: "Core", data: benchmark.core, note: "one family per table, planted cleanly" },
            { name: "Stress", data: benchmark.stress, note: "weak or ambiguous signals under the threshold" },
            { name: "Overall", data: benchmark.overall, note: "all generated tables" },
          ].map((s) => (
            <div
              key={s.name}
              className="grid gap-1 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[1fr_90px_90px_90px_90px] md:gap-4"
            >
              <div>
                <p className="text-[13px] font-medium text-ink">{s.name}</p>
                <p className="mt-0.5 text-[11px] text-faint">{s.note}</p>
              </div>
              <p className="mono text-[12px] text-muted md:text-right">{s.data.datasets}</p>
              <p className="mono text-[12px] text-muted md:text-right">{s.data.recall.toFixed(3)}</p>
              <p className="mono text-[12px] text-muted md:text-right">{s.data.cleanPassRate.toFixed(3)}</p>
              <p className="mono text-[12px] text-ink md:text-right">{s.data.f1.toFixed(3)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Per detector</h2>
        <p className="mt-2 max-w-[620px] text-[12px] leading-relaxed text-muted">
          Recovery per planted family across all 59 tables. The two family scores below one are the
          stress cases, by design.
        </p>
        <div className="mt-4 space-y-3">
          {benchmark.overall.perType.map((p) => (
            <div key={p.type} className="panel px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] text-ink">
                    {p.type === "clean" ? "Clean control" : p.label.replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                  <span className="mono text-[10px] text-faint">
                    {p.detected}/{p.cases}
                  </span>
                </div>
                <span
                  className={`mono text-[12px] ${p.recall === 1 ? "text-green" : p.recall >= 0.7 ? "text-amber" : "text-red"}`}
                >
                  {p.recall.toFixed(3)}
                </span>
              </div>
              <div className="mt-2">
                <MetricBar
                  value={p.recall}
                  tone={p.recall === 1 ? "green" : p.recall >= 0.7 ? "amber" : "red"}
                  height={4}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-2">
          <CircleAlert size={15} className="text-amber" />
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
            {misses.length} tables were not recovered
          </h2>
        </div>
        <p className="mt-2 max-w-[640px] text-[12px] leading-relaxed text-muted">
          Every miss is from the stress suite. The table names describe what was planted, and the
          finding list is what the engine actually returned.
        </p>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {misses.map((m) => (
            <li key={m.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-panel px-4 py-2.5">
              <span className="mono text-[11px] text-ink">{m.name}</span>
              <span className="chip mono text-[9px]">expected {m.expected.replace(/_/g, " ")}</span>
              <span className="mono ml-auto text-[10px] text-faint">
                {m.findings.length > 0 ? m.findings.join(", ") : "no findings"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">What this benchmark does not prove</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              t: "The tables are synthetic",
              b: "Leaks are planted with known generators. Real datasets carry label noise, schema drift and mixed leak types that this suite does not model.",
            },
            {
              t: "Recall is family level",
              b: "A detector scoring one means the family was raised, not that the exact column ranking matched the planting.",
            },
            {
              t: "Thresholds are fixed",
              b: "The thresholds are published constants. A leak sitting under a threshold stays undetected, and the stress suite is there to show which ones.",
            },
            {
              t: "Inflation is a lower bound",
              b: "The honest model is a regularised linear baseline. A stronger learner can widen the gap, so read the measured inflation as a floor.",
            },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-line bg-panel px-4 py-3">
              <p className="text-[12px] font-medium text-ink">{x.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{x.b}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-panel px-5 py-4">
        <div className="flex items-start gap-3">
          <CircleCheck size={16} className="mt-0.5 text-green" />
          <p className="max-w-[520px] text-[12px] leading-relaxed text-muted">
            Regenerate every number with <span className="mono text-ink">npm run evaluate</span>. The
            script writes <span className="mono text-ink">data/benchmark.json</span>, and this page
            reads it at build time.
          </p>
        </div>
        <Link href="/workspace" className="btn btn-primary focus-ring shrink-0">
          Run it on a table <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
