import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DETECTOR_DOCS } from "@/lib/cases";
import { MetricBar } from "@/components/ui";

export const metadata: Metadata = {
  title: "Method",
  description:
    "How Holdout works: deterministic detectors, a measured honesty gap, and an independent verifier that removes claims it cannot reproduce.",
};

const passes = [
  {
    id: "profile",
    role: "Input agent",
    body: "Parses the CSV in the browser, infers a type per column, and records missing values, cardinality, unique ratio, quantiles and top values.",
    out: "Column profiles",
  },
  {
    id: "detect",
    role: "Leakage agent",
    body: "Runs eight deterministic detectors against the declared target, time column and entity column. No model, no prompt.",
    out: "Findings with statistics",
  },
  {
    id: "quantify",
    role: "Model agent",
    body: "Fits a regularised linear baseline twice: once with every feature, once after the flagged columns are removed. Reports the gap, plus the out of time and group holdout scores where the schema supports them.",
    out: "Measured inflation",
  },
  {
    id: "explain",
    role: "Analyst agent",
    body: "Attaches the triggering statistic, the affected columns and one repair step to each finding.",
    out: "Operator ready text",
  },
  {
    id: "verify",
    role: "Verifier agent",
    body: "Recomputes each claim from the raw table through a separate code path. A finding that cannot be reproduced is dropped before it reaches the screen.",
    out: "Kept findings only",
  },
  {
    id: "decide",
    role: "Decision agent",
    body: "Applies published severity weights to a 100 point readiness score, then maps the result to ship, review or block.",
    out: "One verdict",
  },
];

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-[980px] px-4 py-12 sm:px-6">
      <p className="label">Method</p>
      <h1 className="mt-3 max-w-[760px] text-[36px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[46px]">
        Deterministic checks, then a number for the damage.
      </h1>
      <p className="mt-4 max-w-[660px] text-[14px] leading-relaxed text-muted">
        Leakage detection is easy to fake with a language model. Holdout does not use one for any
        verdict. Every finding is a statistic computed from the table, and every statistic is
        recomputed by a second path before it is displayed.
      </p>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { k: "Runtime", v: "Browser", s: "The CSV never leaves the tab" },
          { k: "Engine", v: "TypeScript", s: "Same code in Node and the browser" },
          { k: "Determinism", v: "Fixed seed", s: "Same file, same result" },
        ].map((x) => (
          <div key={x.k} className="rounded-lg border border-line bg-panel px-4 py-3">
            <p className="label">{x.k}</p>
            <p className="mt-1.5 text-[15px] font-medium text-ink">{x.v}</p>
            <p className="mt-1 text-[11px] leading-snug text-faint">{x.s}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Six passes</h2>
        <p className="mt-2 max-w-[620px] text-[12px] leading-relaxed text-muted">
          The word agent is used for the role each pass plays, not for an autonomous model. Every pass
          is a function with a typed input and a typed output. The panel in the workspace shows the
          real duration of each one.
        </p>
        <ol className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {passes.map((p, i) => (
            <li key={p.id} className="grid gap-2 bg-panel px-4 py-4 sm:grid-cols-[28px_150px_1fr_130px] sm:items-start sm:gap-4">
              <span className="mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[12px] font-medium text-blue">{p.role}</span>
              <p className="text-[12px] leading-relaxed text-muted">{p.body}</p>
              <span className="mono text-[10px] text-faint">{p.out}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">The honesty gap</h2>
        <p className="mt-2 max-w-[660px] text-[12px] leading-relaxed text-muted">
          Naming the leak is half the job. The other half is telling you what it cost. Holdout builds
          a design matrix with one hot encoding and median imputation, fits a regularised linear model
          with fixed iteration and learning rate, and reports the same metric twice.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <div className="grid gap-4 bg-raised px-5 py-3 sm:grid-cols-2">
            <div>
              <p className="label">Reported</p>
              <p className="mono mt-1.5 text-[22px] text-red">1.000</p>
              <div className="mt-2">
                <MetricBar value={1} tone="red" />
              </div>
              <p className="mt-1.5 text-[11px] text-faint">
                Five stratified folds, every column in the matrix.
              </p>
            </div>
            <div>
              <p className="label">Honest</p>
              <p className="mono mt-1.5 text-[22px] text-green">0.699</p>
              <div className="mt-2">
                <MetricBar value={0.699} tone="green" />
              </div>
              <p className="mt-1.5 text-[11px] text-faint">
                Flagged columns dropped. Last time window held out where a time column exists.
              </p>
            </div>
          </div>
          <div className="border-t border-line bg-panel px-5 py-4">
            <p className="text-[12px] leading-relaxed text-muted">
              The number on the right is a baseline, not a promise. It uses a linear model on purpose:
              the gap has to be attributable to the columns, not to tuning. A stronger learner usually
              widens the gap, so the reported inflation is a floor.
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Example above: the bundled retail churn case, 540 rows, 9 columns, logged at AUC 1.000 with{" "}
          <span className="mono text-muted">cancellation_reason</span> present and 0.699 once it is
          removed.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Detector thresholds</h2>
        <p className="mt-2 max-w-[620px] text-[12px] leading-relaxed text-muted">
          Every threshold is a constant in the source. They are intentionally conservative: a missed
          leak is worse than a warning a human dismisses after reading the evidence.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <div className="hidden grid-cols-[170px_1fr_150px] gap-4 border-b border-line bg-raised px-4 py-2.5 sm:grid">
            <p className="label">Detector</p>
            <p className="label">Rule</p>
            <p className="label">Known limit</p>
          </div>
          {DETECTOR_DOCS.map((d, i) => (
            <div
              key={d.type}
              className={`grid gap-1.5 px-4 py-3 sm:grid-cols-[170px_1fr_150px] sm:gap-4 ${
                i % 2 === 0 ? "bg-panel" : "bg-raised/40"
              }`}
            >
              <p className="text-[12px] font-medium text-ink">{d.name}</p>
              <p className="text-[11px] leading-relaxed text-muted">{d.signal}</p>
              <p className="text-[11px] leading-relaxed text-faint">{d.limit}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Two more rules are structural rather than threshold based: duplicate rows are counted by
          exact feature signature, and constant columns by a distinct count of one.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Scoring</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_260px]">
          <div className="rounded-lg border border-line bg-panel px-4 py-4">
            <p className="mono text-[12px] text-muted">score = clamp(100 - sum(weight / 2), 6, 100)</p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Severity weights run from 26 for a target proxy to 3 for a zero variance column. A run
              holding any critical finding is blocked regardless of score, so a single post outcome
              column cannot be averaged away by a clean rest of the table.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel px-4 py-4">
            <div className="space-y-2 text-[11px]">
              <p className="flex justify-between gap-3">
                <span className="text-faint">85 and above</span>
                <span className="mono text-green">Ship</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-faint">60 to 84</span>
                <span className="mono text-amber">Review</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-faint">Under 60</span>
                <span className="mono text-red">Block</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-faint">Any critical finding</span>
                <span className="mono text-red">Block</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">What Holdout does not do</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              t: "It does not prove a dataset clean",
              b: "Eight detectors cover the leaks that show up as a column or a split failure. Label noise, sampling bias, annotation policy and subgroup fairness sit outside this scope.",
            },
            {
              t: "It does not detect near duplicates",
              b: "Exact duplicates are counted. Fuzzy copies need a similarity model and a domain aware key, which this version does not ship.",
            },
            {
              t: "It does not replace a holdout",
              b: "The inflation estimate is a strong signal, not a substitute for the split your deployment actually needs.",
            },
            {
              t: "It does not score your model",
              b: "The baseline exists to price the leak. It is not a leaderboard entry, and it is not tuned.",
            },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-line bg-panel px-4 py-3">
              <p className="text-[12px] font-medium text-ink">{x.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{x.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Reproduce it</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-panel">
          <div className="border-b border-line px-4 py-2">
            <p className="mono text-[10px] text-faint">terminal</p>
          </div>
          <pre className="mono overflow-x-auto px-4 py-3 text-[11px] leading-relaxed text-muted">
{`git clone https://github.com/Swapneel-Sethi/holdout
cd holdout
npm install
npm run benchmark   # regenerate data/benchmark.json
npm run dev`}
          </pre>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          The benchmark tables are generated from seeded PRNGs, so the reported numbers are stable
          across machines. The workspace audits the same engine in the browser, so no server has to
          see the file.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-panel px-5 py-4">
        <p className="max-w-[520px] text-[12px] leading-relaxed text-muted">
          The benchmark page reports the stress suite misses rather than hiding them.
        </p>
        <Link href="/benchmark" className="btn btn-ghost focus-ring shrink-0">
          Read the benchmark <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
