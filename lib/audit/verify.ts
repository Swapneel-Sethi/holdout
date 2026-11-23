import { column, isMissing, numericValue } from "./csv";
import { association } from "./detectors";
import type { ColumnProfile, Dataset, Finding } from "./types";

export interface Verification {
  findingId: string;
  supported: boolean;
  check: string;
}

function uniqueRatio(values: (string | number | boolean | null)[]): number {
  const present = values.filter((v) => !isMissing(v));
  if (present.length === 0) return 0;
  return new Set(present.map((v) => String(v))).size / present.length;
}

export function verifyFindings(
  dataset: Dataset,
  target: string,
  profiles: ColumnProfile[],
  findings: Finding[],
): Verification[] {
  const profileMap = new Map(profiles.map((p) => [p.name, p]));
  const targetLabels = column(dataset, target);

  return findings.map((f) => {
    if (f.leakType === "identifier") {
      const r = uniqueRatio(column(dataset, f.columns[0]));
      return { findingId: f.id, supported: r === 1, check: `unique ratio recomputed at ${r.toFixed(3)}` };
    }
    if (f.leakType === "target_proxy" || f.leakType === "name_signal" || f.leakType === "temporal") {
      const task = new Set(targetLabels.filter((v) => !isMissing(v)).map((v) => String(v))).size === 2 ? "classification" : "regression";
      const a = association(dataset, f.columns[0], target, task);
      const diff = a ? Math.abs(a.score - f.metric.value) : 1;
      return {
        findingId: f.id,
        supported: a !== null && diff < 0.03,
        check: a ? `association recomputed at ${a.score.toFixed(3)}` : "association could not be recomputed",
      };
    }
    if (f.leakType === "duplicate_rows") {
      const idx = new Set([dataset.columns.indexOf(target)]);
      const sigs = new Map<string, number>();
      dataset.rows.forEach((row) => {
        const s = row
          .map((v, i) => (idx.has(i) ? "" : String(v ?? "").trim().toLowerCase()))
          .join("|");
        sigs.set(s, (sigs.get(s) ?? 0) + 1);
      });
      let dupes = 0;
      for (const c of sigs.values()) if (c > 1) dupes += c - 1;
      return { findingId: f.id, supported: dupes > 0, check: `${dupes} duplicate rows recomputed` };
    }
    if (f.leakType === "constant") {
      const ok = f.columns.every((c) => (profileMap.get(c)?.distinct ?? 0) === 1);
      return { findingId: f.id, supported: ok, check: "distinct count recomputed per column" };
    }
    if (f.leakType === "imbalance") {
      const present = targetLabels.filter((v) => !isMissing(v));
      const positives = present.filter((v) => numericValue(v) === 1).length;
      const minority = Math.min(positives, present.length - positives) / Math.max(1, present.length);
      return {
        findingId: f.id,
        supported: Math.abs(minority - f.metric.value) < 0.005,
        check: `minority share recomputed at ${(minority * 100).toFixed(2)}%`,
      };
    }
    if (f.leakType === "group_entity") {
      const values = column(dataset, f.columns[0]).filter((v) => !isMissing(v));
      const counts = new Map<string, number>();
      for (const v of values) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
      const repeated = [...counts.values()].filter((c) => c > 1).length;
      return { findingId: f.id, supported: repeated >= 3, check: `${repeated} repeating entities recomputed` };
    }
    return { findingId: f.id, supported: false, check: "no independent check available" };
  });
}
