import Link from "next/link";
import { ArrowRight, CheckCircle2, FileSearch, ScanLine, ShieldCheck } from "lucide-react";
import headline from "@/data/headline.json";
import benchmark from "@/data/benchmark.json";
import { DETECTOR_DOCS } from "@/lib/cases";
import { MetricBar, SeverityDot } from "@/components/ui";

const model = headline.model;
const reported = model.full;
const honest = Math.min(...[model.clean, model.temporal, model.grouped].filter((v): v is number => typeof v === "number"));
const gap = model.inflation;

const steps = [
  {
    n: "01",
    role: "Input agent",
    title: "Profile the table",
    body: "Column types, missing values, cardinality and duplicate rows, computed on the raw file.",
  },
  {
    n: "02",
    role: "Leakage agent",
    title: "Run eight checks",
    body: "Target proxies, identifiers, temporal drift, entity overlap, duplicates, post outcome names, rare classes and zero variance.",
  },
  {
    n: "03",
    role: "Model agent",
    title: "Measure the damage",
    body: "A five fold model scores every feature, then the same model scores what remains after the flagged columns are removed.",
  },
  {
    n: "04",
    role: "Analyst agent",
    title: "Write the finding",
    body: "Each finding carries the statistic that triggered it, the columns involved and the exact repair.",
  },
  {
    n: "05",
    role: "Verifier agent",
    title: "Recompute the claim",
    body: "A second code path reads the table again. Findings that cannot be reproduced are dropped before display.",
  },
  {
    n: "06",
    role: "Decision agent",
    title: "Ship, review or block",
    body: "One verdict, one score, and the split strategy the dataset actually needs.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" aria-hidden="true" />
        <div
          className="pointer-events-none absolute left-1/2 top-[-320px] h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
          style={{ background: "radial-gradient(circle, #57c1ff 0%, transparent 65%)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
          <div className="fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip border-blue/30 bg-blue/10 text-blue">Data Sprint 2.0</span>
              <span className="chip">Open Innovation</span>
              <span className="chip">engine 1.4.0</span>
            </div>
            <h1 className="mt-6 max-w-[560px] text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[54px]">
              Your leaderboard score is lying.
            </h1>
            <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-muted">
              Holdout audits a dataset before you spend a night modelling it. It finds the leaked
              column, reproduces the evidence, and measures how many points of your score will not
              survive a real deployment.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/workspace" className="btn btn-primary focus-ring">
                Open the workspace
                <ArrowRight size={14} />
              </Link>
              <Link href="/benchmark" className="btn btn-ghost focus-ring">
                Read the benchmark
              </Link>
            </div>
            <dl className="mt-10 grid max-w-[520px] grid-cols-3 gap-4 border-t border-line pt-5">
              <div>
                <dt className="label">Execution</dt>
                <dd className="mt-1 text-[12px] text-muted">In the browser</dd>
              </div>
              <div>
                <dt className="label">Detectors</dt>
                <dd className="mt-1 text-[12px] text-muted">Eight checks</dd>
              </div>
              <div>
                <dt className="label">Evidence</dt>
                <dd className="mt-1 text-[12px] text-muted">Recomputed</dd>
              </div>
            </dl>
          </div>

          <div className="fade-up [animation-delay:120ms]">
            <AuditPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1240px] gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <Fact icon={<FileSearch size={14} />} title="Real statistic" body="No LLM guess at the root cause" />
          <Fact icon={<ScanLine size={14} />} title="Node and browser" body="Same engine in both runtimes" />
          <Fact icon={<ShieldCheck size={14} />} title="Local by default" body="Your CSV is not uploaded" />
          <Fact icon={<CheckCircle2 size={14} />} title="Verifier pass" body="Claims recomputed before display" />
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <p className="label">The failure mode</p>
            <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.03em]">
              A leak looks exactly like progress.
            </h2>
            <p className="mt-4 max-w-[440px] text-[14px] leading-relaxed text-muted">
              A column recorded after the outcome carries the label. Validation climbs. The model
              ships. The metric collapses in production. The gap between those two numbers is not a
              modelling problem, it is a dataset problem.
            </p>
            <p className="mt-4 max-w-[440px] text-[14px] leading-relaxed text-muted">
              Holdout names the column, shows the statistic, and puts a number on the fiction.
            </p>
            <Link href="/method" className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-blue hover:text-ink">
              Read the method <ArrowRight size={13} />
            </Link>
          </div>

          <div className="panel-raised overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <p className="label">Retail churn, out of time holdout</p>
              <span className="mono text-[10px] text-faint">540 rows</span>
            </div>
            <div className="grid gap-6 px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-5">
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[12px] text-muted">Reported cross validation</p>
                    <p className="mono text-[22px] text-red">{reported.toFixed(3)}</p>
                  </div>
                  <div className="mt-2">
                    <MetricBar value={reported} tone="red" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-faint">
                    Five folds, every feature including the leak.
                  </p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[12px] text-muted">Honest estimate</p>
                    <p className="mono text-[22px] text-green">{honest.toFixed(3)}</p>
                  </div>
                  <div className="mt-2">
                    <MetricBar value={honest} tone="green" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-faint">
                    Clean features, last window held out.
                  </p>
                </div>
              </div>
              <div className="border-line sm:border-l sm:pl-6">
                <p className="label">Inflation</p>
                <p className="mono mt-1 text-[34px] leading-none text-ink">{Math.round(gap * 100)}</p>
                <p className="mt-1 text-[11px] text-faint">points</p>
              </div>
            </div>
            <div className="border-t border-line px-5 py-4">
              <p className="text-[12px] leading-relaxed text-muted">
                <span className="text-ink">cancellation_reason</span> is written only after a customer
                leaves. The model reads it as a perfect predictor.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label">What the audit checks</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em]">Eight ways a dataset lies.</h2>
            </div>
            <p className="max-w-[380px] text-[12px] leading-relaxed text-faint">
              Every check is deterministic. Thresholds are published, and the stress suite shows where
              each one stops working.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-line">
            <div className="hidden grid-cols-[190px_1fr_300px] gap-4 border-b border-line bg-raised px-4 py-2.5 md:grid">
              <p className="label">Detector</p>
              <p className="label">Signal</p>
              <p className="label">Known limit</p>
            </div>
            {DETECTOR_DOCS.map((d, i) => (
              <div
                key={d.type}
                className={`grid gap-2 px-4 py-3.5 md:grid-cols-[190px_1fr_300px] md:gap-4 ${
                  i % 2 === 0 ? "bg-panel" : "bg-raised/40"
                }`}
              >
                <p className="text-[13px] font-medium text-ink">{d.name}</p>
                <p className="text-[12px] leading-relaxed text-muted">{d.signal}</p>
                <p className="text-[12px] leading-relaxed text-faint">{d.limit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="label">How a run works</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em]">
              Six passes, each with a job.
            </h2>
            <p className="mt-4 max-w-[400px] text-[13px] leading-relaxed text-muted">
              The agents are not a prompt with six names. Each pass has its own function, its own input
              and its own artifact. The verifier is the only one allowed to delete a finding.
            </p>
            <div className="mt-6 rounded-lg border border-line bg-panel px-4 py-3">
              <p className="label">Median run</p>
              <p className="mono mt-1 text-[24px] text-blue">{benchmark.overall.medianLatencyMs} ms</p>
              <p className="mt-1 text-[11px] text-faint">59 synthetic datasets, one process.</p>
            </div>
          </div>

          <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.n} className="bg-panel p-5">
                <div className="flex items-center justify-between">
                  <span className="mono text-[11px] text-faint">{s.n}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-blue">{s.role}</span>
                </div>
                <p className="mt-3 text-[14px] font-medium text-ink">{s.title}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label">Measured, not claimed</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em]">
                A benchmark you can fail.
              </h2>
            </div>
            <Link href="/benchmark" className="inline-flex items-center gap-1.5 text-[13px] text-blue hover:text-ink">
              Full results <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Overall F1", v: benchmark.overall.f1.toFixed(3), s: "Core and stress suites" },
              { k: "Leak recall", v: benchmark.overall.recall.toFixed(3), s: "7 leak families" },
              { k: "Clean pass", v: benchmark.overall.cleanPassRate.toFixed(3), s: "No false block" },
              { k: "Verified", v: `${Math.round(benchmark.overall.verifiedRate * 100)}%`, s: "Claims reproduced" },
            ].map((x) => (
              <div key={x.k} className="bg-panel p-5">
                <p className="label">{x.k}</p>
                <p className="mono mt-2 text-[26px] leading-none text-ink">{x.v}</p>
                <p className="mt-2 text-[11px] text-faint">{x.s}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            {benchmark.datasets} synthetic datasets. The core suite checks that each detector fires.
            The stress suite is built to sit under the thresholds so the misses stay visible.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
          <div className="panel-raised relative overflow-hidden px-6 py-10 sm:px-10">
            <div
              className="pointer-events-none absolute right-[-120px] top-[-140px] h-[320px] w-[320px] rounded-full opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, #57c1ff, transparent 65%)" }}
              aria-hidden="true"
            />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="label">Run it on your own table</p>
                <h2 className="mt-3 max-w-[520px] text-[30px] font-semibold leading-tight tracking-[-0.03em]">
                  Find the leak before the leaderboard does.
                </h2>
                <p className="mt-3 max-w-[480px] text-[13px] leading-relaxed text-muted">
                  Drop a CSV, choose the target, and get a verdict with evidence in under a second.
                </p>
              </div>
              <Link href="/workspace" className="btn btn-primary focus-ring shrink-0">
                Open the workspace <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Fact({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-blue">{icon}</span>
      <div>
        <p className="text-[12px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-faint">{body}</p>
      </div>
    </div>
  );
}

function AuditPreview() {
  const findings = headline.findings.slice(0, 3);
  return (
    <div className="glow-blue overflow-hidden rounded-2xl border border-line2 bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden="true">
            <span className="size-[6px] rounded-full bg-line2" />
            <span className="size-[6px] rounded-full bg-line2" />
            <span className="size-[6px] rounded-full bg-line2" />
          </span>
          <span className="mono text-[10px] text-faint">audit / retail_churn.csv</span>
        </div>
        <span className="mono text-[10px] text-faint">v1.4.0</span>
      </div>

      <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-red/35 bg-red/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-red">
              <span className="size-[5px] rounded-full bg-red" />
              Block
            </span>
            <span className="mono text-[10px] text-faint">9 columns / 540 rows</span>
          </div>
          <p className="mt-2.5 max-w-[300px] text-[13px] font-medium leading-snug text-ink">
            {headline.verdict.headline}
          </p>
        </div>
        <div className="text-right">
          <p className="mono text-[30px] leading-none text-ink">{headline.verdict.score}</p>
          <p className="mt-1 text-[10px] text-faint">of 100</p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {findings.map((f) => (
          <div key={f.title} className="flex items-start gap-2.5">
            <span className="mt-1.5">
              <SeverityDot severity={f.severity as "critical" | "high" | "medium" | "low"} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-ink">{f.title}</p>
              <p className="mt-0.5 text-[10px] text-faint">{f.metric.name} {f.metric.display}</p>
            </div>
            <span className="mono text-[10px] text-faint">{f.severity}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">Reported AUC {reported.toFixed(3)}</span>
          <span className="mono text-[11px] text-red">{Math.round(gap * 100)} pts inflated</span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          <div className="h-1.5 rounded-sm bg-red" style={{ width: `${reported * 100}%` }} />
          <div className="h-1.5 rounded-sm bg-green/40" style={{ width: `${Math.max(0, 100 - reported * 100)}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-raised/60 px-4 py-2.5">
        <span className="mono text-[10px] text-faint">
          verifier {headline.verified.passed}/{headline.verified.total}
        </span>
        <span className="mono text-[10px] text-green">claims reproduced</span>
      </div>
    </div>
  );
}
