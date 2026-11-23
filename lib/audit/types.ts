export type RawValue = string | number | null | boolean;

export interface Dataset {
  name: string;
  columns: string[];
  rows: RawValue[][];
}

export interface AuditConfig {
  target: string;
  timeColumn?: string | null;
  entityColumn?: string | null;
  positiveLabel?: string | null;
}

export type Severity = "critical" | "high" | "medium" | "low";

export type LeakType =
  | "identifier"
  | "target_proxy"
  | "duplicate_rows"
  | "group_entity"
  | "temporal"
  | "name_signal"
  | "constant"
  | "imbalance";

export type ColumnKind = "numeric" | "datetime" | "categorical" | "boolean" | "text";

export interface ColumnProfile {
  name: string;
  kind: ColumnKind;
  missing: number;
  distinct: number;
  uniqueRatio: number;
  numeric: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
  } | null;
  topValues: { value: string; count: number }[];
}

export interface Evidence {
  label: string;
  value: string;
  note?: string;
}

export interface Finding {
  id: string;
  leakType: LeakType;
  severity: Severity;
  title: string;
  detail: string;
  columns: string[];
  evidence: Evidence[];
  metric: { name: string; value: number; display: string };
  fix: string;
}

export interface ModelRisk {
  metric: "auc" | "r2";
  task: "classification" | "regression";
  rows: number;
  folds: number;
  features: number;
  full: number;
  clean: number;
  temporal: number | null;
  grouped: number | null;
  inflation: number;
  droppedColumns: string[];
}

export interface TraceStep {
  id: string;
  role: string;
  title: string;
  summary: string;
  status: "passed" | "flagged" | "skipped";
  durationMs: number;
  artifacts: string[];
}

export interface Verdict {
  level: "block" | "review" | "ship";
  label: string;
  headline: string;
  detail: string;
  score: number;
}

export interface AuditResult {
  datasetName: string;
  config: AuditConfig;
  rows: number;
  columnCount: number;
  profiles: ColumnProfile[];
  findings: Finding[];
  model: ModelRisk | null;
  verdict: Verdict;
  trace: TraceStep[];
  verifiedClaims: { total: number; passed: number };
  generatedAt: string;
  engineVersion: string;
}

export const ENGINE_VERSION = "1.4.0";

export const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 26,
  high: 17,
  medium: 9,
  low: 4,
};

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export const LEAK_LABELS: Record<LeakType, string> = {
  identifier: "Row identifier",
  target_proxy: "Target proxy",
  duplicate_rows: "Duplicate rows",
  group_entity: "Entity leakage",
  temporal: "Temporal leakage",
  name_signal: "Post outcome field",
  constant: "Zero variance",
  imbalance: "Class imbalance",
};
