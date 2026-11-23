import { column, dateValue, isMissing, numericValue, stringValue } from "./csv";
import { mean, quantile, std } from "./stats";
import type { ColumnKind, ColumnProfile, Dataset } from "./types";

export function inferKind(values: (string | number | boolean | null)[]): ColumnKind {
  const present = values.filter((v) => !isMissing(v));
  if (present.length === 0) return "text";

  const boolish = present.every((v) => {
    const s = String(v).toLowerCase();
    return ["true", "false", "yes", "no", "0", "1"].includes(s);
  });
  const distinct = new Set(present.map((v) => String(v))).size;
  if (boolish && distinct <= 2) return "boolean";

  let dates = 0;
  for (const v of present.slice(0, 400)) if (dateValue(v) !== null) dates++;
  if (dates / Math.min(400, present.length) >= 0.9) return "datetime";

  let nums = 0;
  for (const v of present) if (numericValue(v) !== null) nums++;
  const numericRatio = nums / present.length;
  if (numericRatio >= 0.9) {
    if (distinct <= 2) return "boolean";
    return distinct <= 6 ? "categorical" : "numeric";
  }
  if (distinct <= 40 || distinct / present.length <= 0.2) return "categorical";
  return "text";
}

export function profileColumn(dataset: Dataset, name: string): ColumnProfile {
  const values = column(dataset, name);
  const present = values.filter((v) => !isMissing(v));
  const kind = inferKind(present);
  const counts = new Map<string, number>();
  for (const v of present) {
    const k = String(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const topValues = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([value, count]) => ({ value, count }));

  let numeric: ColumnProfile["numeric"] = null;
  if (kind === "numeric" || kind === "boolean") {
    const nums = present.map((v) => numericValue(v)).filter((n): n is number => n !== null);
    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b);
      numeric = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: mean(nums),
        median: quantile(sorted, 0.5),
        std: std(nums),
      };
    }
  }

  return {
    name,
    kind,
    missing: values.length - present.length,
    distinct: counts.size,
    uniqueRatio: present.length === 0 ? 0 : counts.size / present.length,
    numeric,
    topValues,
  };
}

export function profileDataset(dataset: Dataset): ColumnProfile[] {
  return dataset.columns.map((c) => profileColumn(dataset, c));
}

export function numericSeries(dataset: Dataset, name: string): (number | null)[] {
  return column(dataset, name).map((v) => (isMissing(v) ? null : numericValue(v)));
}

export function labelSeries(dataset: Dataset, name: string): (string | null)[] {
  return column(dataset, name).map((v) => (isMissing(v) ? null : stringValue(v)));
}

export function targetLabels(dataset: Dataset, target: string): { labels: (number | null)[]; classes: string[] } {
  const raw = column(dataset, target);
  const strings = raw.map((v) => (isMissing(v) ? null : String(v)));
  const classes = [...new Set(strings.filter((v): v is string => v !== null))].sort();
  if (classes.length === 2 && classes.every((c) => numericValue(c) !== null)) {
    const sorted = [...classes].sort((a, b) => Number(a) - Number(b));
    const labels = strings.map((v) => (v === null ? null : v === sorted[0] ? 0 : 1));
    return { labels, classes: sorted };
  }
  const index = new Map(classes.map((c, i) => [c, i]));
  const labels = strings.map((v) => (v === null ? null : index.get(v)!));
  return { labels, classes };
}

export function isBinaryTarget(dataset: Dataset, target: string): boolean {
  const { classes } = targetLabels(dataset, target);
  if (classes.length !== 2) return false;
  return classes.length === 2;
}

export function isNumericTarget(dataset: Dataset, target: string): boolean {
  const values = column(dataset, target).filter((v) => !isMissing(v));
  if (values.length < 10) return false;
  const nums = values.filter((v) => numericValue(v) !== null).length;
  const distinct = new Set(values.map((v) => String(v))).size;
  return nums / values.length >= 0.95 && distinct > 6;
}
