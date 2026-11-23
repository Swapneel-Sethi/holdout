import { column, isMissing, numericValue } from "./csv";
import { inferKind, labelSeries, targetLabels } from "./profile";
import { auc, clamp, cramersV, fmt, mean, mutualInformation, normalizeMI, pearson } from "./stats";
import type { ColumnProfile, Dataset, Finding, LeakType, Severity } from "./types";

const POST_OUTCOME = [
  "cancel",
  "churn",
  "closed",
  "resolved",
  "refund",
  "outcome",
  "result",
  "final",
  "actual",
  "label",
  "target",
  "post",
  "after",
  "settled",
  "approved",
  "rejected",
  "converted",
  "defaulted",
  "survived",
];

const ID_PATTERN = /(^|_)(id|uuid|guid|key|hash|index|row_?num)(_|$)/i;

function align(dataset: Dataset, name: string, targetName: string, labels: (number | null)[]) {
  const values = column(dataset, name);
  const out: { v: string | number | null; y: number }[] = [];
  labels.forEach((y, i) => {
    if (y === null) return;
    out.push({ v: typeof values[i] === "boolean" ? String(values[i]) : values[i] ?? null, y });
  });
  return out;
}

export function targetNumeric(dataset: Dataset, target: string): { values: (number | null)[]; task: "classification" | "regression" } {
  const { labels, classes } = targetLabels(dataset, target);
  if (classes.length === 2) return { values: labels, task: "classification" };
  return {
    values: column(dataset, target).map((v) => (isMissing(v) ? null : numericValue(v))),
    task: "regression",
  };
}

export function association(
  dataset: Dataset,
  name: string,
  target: string,
  task: "classification" | "regression",
): { score: number; method: string } | null {
  const { values: labels } = targetNumeric(dataset, target);
  const rows = align(dataset, name, target, labels);
  if (rows.length < 30) return null;

  const present = rows.filter((r) => !isMissing(r.v));
  if (present.length < 20) return null;

  const kind = inferKind(present.map((r) => r.v));

  if (kind === "numeric" || kind === "boolean" || kind === "datetime") {
    const pairs = present
      .map((r) => {
        if (kind === "datetime") {
          const t = typeof r.v === "string" ? Date.parse(r.v) : NaN;
          return { x: t, y: r.y };
        }
        const x = numericValue(r.v);
        return x === null ? null : { x, y: r.y };
      })
      .filter((p): p is { x: number; y: number } => p !== null && Number.isFinite(p.x));
    if (pairs.length < 20) return null;

    if (task === "classification") {
      const a = auc(pairs.map((p) => p.x), pairs.map((p) => p.y));
      return { score: Math.max(a, 1 - a), method: `AUC ${fmt(Math.max(a, 1 - a))}` };
    }
    const r = Math.abs(pearson(pairs.map((p) => p.x), pairs.map((p) => p.y)));
    return { score: clamp(r), method: `|r| ${fmt(r)}` };
  }

  if (kind === "categorical" || kind === "text") {
    if (task === "classification") {
      const v = cramersV(present.map((r) => String(r.v)), present.map((r) => r.y));
      const mi = normalizeMI(
        mutualInformation(present.map((r) => String(r.v)), present.map((r) => r.y)),
        present.map((r) => String(r.v)),
        present.map((r) => r.y),
      );
      const score = Math.max(v, mi);
      return { score: clamp(score), method: `Cramer's V ${fmt(score)}` };
    }
    const groups = new Map<string, number[]>();
    for (const r of present) {
      const k = String(r.v);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r.y);
    }
    if (groups.size < 2 || groups.size > 60) return null;
    const overall = mean(present.map((r) => r.y));
    let ssBetween = 0;
    let ssTotal = 0;
    for (const r of present) ssTotal += (r.y - overall) ** 2;
    for (const g of groups.values()) {
      const m = mean(g);
      ssBetween += g.length * (m - overall) ** 2;
    }
    const eta = ssTotal === 0 ? 0 : Math.sqrt(ssBetween / ssTotal);
    return { score: clamp(eta), method: `correlation ratio ${fmt(eta)}` };
  }

  return null;
}

export function rowSignature(row: (string | number | boolean | null)[], cols: number[]): string {
  return cols
    .map((i) => {
      const v = row[i];
      if (v === null || v === undefined) return "~";
      if (typeof v === "number") return `n${Math.round(v * 1000)}`;
      return String(v).trim().toLowerCase().slice(0, 24);
    })
    .join("|");
}

function severityRank(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}

export function detect(dataset: Dataset, target: string, config: { timeColumn?: string | null; entityColumn?: string | null }, profiles: ColumnProfile[]): Finding[] {
  const findings: Finding[] = [];
  const n = dataset.rows.length;
  const { values: targetValues, task } = targetNumeric(dataset, target);
  const featureNames = dataset.columns.filter((c) => c !== target);
  const profileMap = new Map(profiles.map((p) => [p.name, p]));

  const timeColumn =
    config.timeColumn && dataset.columns.includes(config.timeColumn)
      ? config.timeColumn
      : profiles.find((p) => p.kind === "datetime" && p.name !== target)?.name ?? null;

  // 1. Unique identifiers
  for (const p of profiles) {
    if (p.name === target) continue;
    const shortText = p.kind === "text" && p.topValues.every((t) => t.value.length <= 24);
    if (p.distinct >= 30 && p.uniqueRatio === 1 && (ID_PATTERN.test(p.name) || shortText)) {
      findings.push({
        id: `identifier:${p.name}`,
        leakType: "identifier",
        severity: "high",
        title: `Row identifier used as a feature: ${p.name}`,
        detail:
          "Every value in this column is unique. A model can memorise rows through it, so training and validation performance stop describing anything about new rows.",
        columns: [p.name],
        evidence: [
          { label: "Distinct values", value: `${p.distinct}`, note: `${n} rows` },
          { label: "Unique ratio", value: "1.000" },
          { label: "First values", value: p.topValues.slice(0, 3).map((t) => t.value).join(", ") },
        ],
        metric: { name: "unique ratio", value: 1, display: "1.000" },
        fix: `Drop ${p.name} before building the design matrix. Keep it only as a join key outside the model.`,
      });
    }
  }

  // 2. Target proxies
  for (const name of featureNames) {
    const p = profileMap.get(name);
    if (!p || p.kind === "text") continue;
    const assoc = association(dataset, name, target, task);
    if (!assoc) continue;

    const threshold = task === "classification" ? 0.95 : 0.93;
    if (assoc.score >= threshold) {
      const rows = align(dataset, name, target, targetValues);
      const numericKind = p.kind === "numeric" || p.kind === "boolean" || p.kind === "datetime";
      let note = "Near perfect association with the target.";
      if (numericKind) {
        const positives = rows.filter((r) => r.y === 1).map((r) => numericValue(r.v)).filter((v): v is number => v !== null);
        const negatives = rows.filter((r) => r.y === 0).map((r) => numericValue(r.v)).filter((v): v is number => v !== null);
        if (task === "classification" && positives.length > 0 && negatives.length > 0) {
          note = `Mean ${fmt(mean(negatives), 2)} when label is 0, mean ${fmt(mean(positives), 2)} when label is 1.`;
        }
      }
      findings.push({
        id: `target_proxy:${name}`,
        leakType: "target_proxy",
        severity: "critical",
        title: `Target proxy detected: ${name}`,
        detail:
          "This column separates the classes almost perfectly. Real world signals rarely do that unless the column was recorded after the outcome, derived from the label, or is a duplicate of it.",
        columns: [name],
        evidence: [
          { label: "Association", value: assoc.method },
          { label: "Threshold", value: fmt(threshold) },
          { label: "Class split", value: note },
        ],
        metric: { name: "association", value: assoc.score, display: fmt(assoc.score) },
        fix: `Remove ${name} from training. If it is genuinely available at prediction time, prove it with an out of time evaluation.`,
      });
    }
  }

  // 3. Post outcome naming
  for (const name of featureNames) {
    const lower = name.toLowerCase();
    if (!POST_OUTCOME.some((t) => lower.includes(t))) continue;
    if (findings.some((f) => f.columns.includes(name) && f.leakType === "target_proxy")) continue;
    const assoc = association(dataset, name, target, task);
    if (!assoc || assoc.score < 0.35) continue;
    findings.push({
      id: `name_signal:${name}`,
      leakType: "name_signal",
      severity: "medium",
      title: `Field name suggests the outcome: ${name}`,
      detail:
        "The column name reads like something recorded after the event. It also carries signal. Fields like this are usually safe to use only when they are known before the label exists.",
      columns: [name],
      evidence: [
        { label: "Association", value: assoc.method },
        { label: "Name match", value: POST_OUTCOME.find((t) => lower.includes(t)) ?? "" },
      ],
      metric: { name: "association", value: assoc.score, display: fmt(assoc.score) },
      fix: `Confirm when ${name} is captured. If it is written after the outcome, drop it.`,
    });
  }

  // 4. Duplicate rows
  const featureIdx = dataset.columns.map((c, i) => (c === target ? -1 : i)).filter((i) => i >= 0);
  const buckets = new Map<string, number[]>();
  dataset.rows.forEach((row, i) => {
    const sig = rowSignature(row, featureIdx);
    if (!buckets.has(sig)) buckets.set(sig, []);
    buckets.get(sig)!.push(i);
  });
  let duplicateRows = 0;
  let conflicting = 0;
  for (const idx of buckets.values()) {
    if (idx.length < 2) continue;
    duplicateRows += idx.length - 1;
    const labels = new Set(idx.map((i) => String(targetValues[i] ?? "missing")));
    if (labels.size > 1) conflicting += idx.length - 1;
  }
  if (duplicateRows > 0) {
    const ratio = duplicateRows / n;
    const severity: Severity = ratio > 0.05 ? "high" : ratio >= 0.03 ? "medium" : "low";
    findings.push({
      id: "duplicate_rows:all",
      leakType: "duplicate_rows",
      severity,
      title: `${duplicateRows} duplicated rows across ${featureIdx.length} features`,
      detail:
        "Identical feature rows can land on both sides of a random split. The model then scores rows it has already memorised.",
      columns: [],
      evidence: [
        { label: "Duplicate rows", value: String(duplicateRows), note: `${(ratio * 100).toFixed(1)}% of rows` },
        { label: "Conflicting labels", value: String(conflicting), note: conflicting > 0 ? "Same features, different target" : "Labels agree" },
      ],
      metric: { name: "duplicate ratio", value: ratio, display: `${(ratio * 100).toFixed(1)}%` },
      fix: "Deduplicate before splitting. When duplicates carry different labels, resolve the label first.",
    });
  }

  // 5. Entity leakage
  const entityCandidate =
    (config.entityColumn && dataset.columns.includes(config.entityColumn) ? config.entityColumn : null) ??
    profiles.find((p) => {
      if (p.name === target) return false;
      if (!ID_PATTERN.test(p.name)) return false;
      return p.distinct >= 5 && p.distinct < n * 0.8;
    })?.name ??
    null;

  if (entityCandidate) {
    const p = profileMap.get(entityCandidate)!;
    const counts = new Map<string, number>();
    for (const v of labelSeries(dataset, entityCandidate)) {
      if (v === null) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const repeated = [...counts.values()].filter((c) => c > 1).length;
    const maxGroup = Math.max(...counts.values());
    if (repeated >= 3) {
      const exposure = Math.min(1, repeated / counts.size);
      findings.push({
        id: `group_entity:${entityCandidate}`,
        leakType: "group_entity",
        severity: "medium",
        title: `Grouped records: ${entityCandidate} repeats across rows`,
        detail:
          "The same entity appears in several rows. A random row split puts the same entity on both sides, so the model learns the entity rather than the pattern.",
        columns: [entityCandidate],
        evidence: [
          { label: "Distinct entities", value: String(p.distinct) },
          { label: "Entities with repeats", value: String(repeated) },
          { label: "Largest group", value: `${maxGroup} rows` },
        ],
        metric: { name: "entity overlap", value: exposure, display: `${(exposure * 100).toFixed(0)}%` },
        fix: `Split by ${entityCandidate} with a group holdout. Never let one entity appear on both sides.`,
      });
    }
  }

  // 7. Temporal leakage
  if (timeColumn) {
    const assoc = association(dataset, timeColumn, target, task);
    if (assoc && assoc.score >= 0.62) {
      const times = column(dataset, timeColumn)
        .map((v) => (typeof v === "string" ? Date.parse(v) : typeof v === "number" ? v : NaN))
        .filter((t) => Number.isFinite(t)) as number[];
      const sorted = [...times].sort((a, b) => a - b);
      findings.push({
        id: `temporal:${timeColumn}`,
        leakType: "temporal",
        severity: "high",
        title: `Outcome drifts over ${timeColumn}`,
        detail:
          "The target changes across time and this column carries that drift. A random split mixes past and future, so the score includes information a deployed model would not have.",
        columns: [timeColumn],
        evidence: [
          { label: "Drift strength", value: assoc.method },
          { label: "Window", value: `${new Date(sorted[0]).toISOString().slice(0, 10)} to ${new Date(sorted[sorted.length - 1]).toISOString().slice(0, 10)}` },
          { label: "Rows with time", value: String(times.length) },
        ],
        metric: { name: "temporal drift", value: assoc.score, display: fmt(assoc.score) },
        fix: `Evaluate with an out of time holdout on ${timeColumn}. Keep the last window untouched.`,
      });
    }
  }

  // 8. Zero variance
  const constantCols = profiles
    .filter((p) => p.name !== target && p.distinct === 1 && p.missing < n)
    .map((p) => p.name);
  if (constantCols.length > 0) {
    findings.push({
      id: "constant:all",
      leakType: "constant",
      severity: "low",
      title: `${constantCols.length} column${constantCols.length === 1 ? "" : "s"} carry no signal`,
      detail: "A single value across every row. These columns add noise to the schema and nothing to the model.",
      columns: constantCols,
      evidence: constantCols.slice(0, 4).map((c) => ({ label: c, value: "1 distinct value" })),
      metric: { name: "constant columns", value: constantCols.length, display: String(constantCols.length) },
      fix: "Drop them during preprocessing.",
    });
  }

  // 9. Imbalance
  if (task === "classification") {
    const present = targetValues.filter((v): v is number => v !== null);
    const positive = present.filter((v) => v === 1).length;
    const minority = Math.min(positive, present.length - positive) / Math.max(1, present.length);
    if (minority < 0.06) {
      findings.push({
        id: "imbalance:target",
        leakType: "imbalance",
        severity: minority < 0.02 ? "high" : "medium",
        title: `Rare class: ${(minority * 100).toFixed(1)}% of rows`,
        detail:
          "With a class this small, a random split can land all positives in one fold. Metrics swing by several points between seeds.",
        columns: [target],
        evidence: [
          { label: "Minority share", value: `${(minority * 100).toFixed(2)}%` },
          { label: "Minority rows", value: String(Math.min(positive, present.length - positive)) },
          { label: "Total labelled rows", value: String(present.length) },
        ],
        metric: { name: "minority share", value: minority, display: `${(minority * 100).toFixed(1)}%` },
        fix: "Use stratified folds and report a confidence interval, not a single score.",
      });
    }
  }

  return findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

export function associationsFor(dataset: Dataset, target: string, profiles: ColumnProfile[]) {
  const { task } = targetNumeric(dataset, target);
  return profiles
    .filter((p) => p.name !== target)
    .map((p) => {
      const a = association(dataset, p.name, target, task);
      return { name: p.name, kind: p.kind, score: a?.score ?? 0, method: a?.method ?? "no measurable association" };
    })
    .sort((a, b) => b.score - a.score);
}

export const SEVERITY_WEIGHT: Record<LeakType, number> = {
  target_proxy: 26,
  identifier: 16,
  duplicate_rows: 14,
  temporal: 14,
  group_entity: 9,
  name_signal: 8,
  constant: 3,
  imbalance: 8,
};
