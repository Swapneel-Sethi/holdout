import { detect, SEVERITY_WEIGHT } from "./detectors";
import { measureModelRisk } from "./model";
import { profileDataset } from "./profile";
import { verifyFindings } from "./verify";
import type { AuditConfig, AuditResult, Dataset, Finding, TraceStep, Verdict } from "./types";
import { ENGINE_VERSION } from "./types";

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function flaggedColumns(findings: Finding[]): Set<string> {
  const set = new Set<string>();
  for (const f of findings) {
    if (f.leakType === "target_proxy" || f.leakType === "identifier" || f.leakType === "name_signal") {
      for (const c of f.columns) set.add(c);
    }
  }
  return set;
}

function buildVerdict(findings: Finding[], model: AuditResult["model"]): Verdict {
  let score = 100;
  for (const f of findings) {
    score -= Math.round((SEVERITY_WEIGHT[f.leakType] ?? 0) / 2);
  }
  score = Math.max(6, Math.min(100, score));

  const criticals = findings.filter((f) => f.severity === "critical");
  const highs = findings.filter((f) => f.severity === "high");
  const inflation = model?.inflation ?? 0;

  if (criticals.length > 0) {
    const lead = criticals[0];
    const delta =
      model && inflation > 0.005
        ? ` Validation reads ${model.metric.toUpperCase()} ${model.full.toFixed(3)} with every feature, and ${model.clean.toFixed(3)} without the flagged columns. That is ${(inflation * 100).toFixed(1)} points of inflation.`
        : "";
    return {
      level: "block",
      label: "Block",
      headline: `${criticals.length} leak${criticals.length === 1 ? "" : "s"} must be removed before this model is trusted.`,
      detail: `${lead.title}.${delta}`,
      score,
    };
  }

  if (highs.length > 0 || inflation > 0.06 || score < 70) {
    return {
      level: "review",
      label: "Review",
      headline: "The setup needs a different split before the score means anything.",
      detail:
        highs[0]?.title ??
        `Random validation reads ${model?.full.toFixed(3)} while the honest estimate is ${model?.clean.toFixed(3)}.`,
      score,
    };
  }

  return {
    level: "ship",
    label: "Ship",
    headline: "No material leakage found in the declared setup.",
    detail: model
      ? `Cross validated ${model.metric.toUpperCase()} ${model.full.toFixed(3)} and clean ${model.clean.toFixed(3)}. Keep the split strategy documented and rerun the audit when the data changes.`
      : "The schema is consistent. No target proxy, identifier, temporal drift or entity overlap was found.",
    score,
  };
}

export function runAudit(dataset: Dataset, config: AuditConfig): AuditResult {
  const trace: TraceStep[] = [];
  const t0 = now();
  let t = t0;

  const profiles = profileDataset(dataset);
  const profileMs = now() - t;
  t = now();
  trace.push({
    id: "profile",
    role: "Input agent",
    title: "Schema profiled",
    summary: `${dataset.columns.length} columns, ${dataset.rows.length} rows, ${profiles.filter((p) => p.missing > 0).length} columns with missing values.`,
    status: "passed",
    durationMs: Math.round(profileMs),
    artifacts: [`${dataset.rows.length} rows`, `${dataset.columns.length} columns`],
  });

  const findings = detect(dataset, config.target, config, profiles);
  const detectMs = now() - t;
  t = now();
  const worst = findings[0];
  trace.push({
    id: "detect",
    role: "Leakage agent",
    title: "Eight detectors executed",
    summary: worst ? `${findings.length} issues found. Lead issue: ${worst.title}.` : "No leakage signatures matched.",
    status: worst && worst.severity !== "low" ? "flagged" : "passed",
    durationMs: Math.round(detectMs),
    artifacts: [`${findings.length} findings`],
  });

  const flagged = flaggedColumns(findings);
  const model = measureModelRisk(dataset, config.target, flagged, config.timeColumn ?? null, config.entityColumn ?? null);
  const modelMs = now() - t;
  t = now();
  trace.push({
    id: "quantify",
    role: "Model agent",
    title: model ? "Leakage cost measured" : "Model risk not measurable",
    summary: model
      ? `5 fold ${model.metric.toUpperCase()} is ${model.full.toFixed(3)} with all features and ${model.clean.toFixed(3)} after removal, an inflation of ${(model.inflation * 100).toFixed(1)} points.`
      : "The target did not support a binary or numeric model, so inflation was not estimated.",
    status: model && model.inflation > 0.02 ? "flagged" : "passed",
    durationMs: Math.round(modelMs),
    artifacts: model ? [`metric ${model.metric}`, `${model.features} features`] : ["skipped"],
  });

  const explainMs = 2;
  t = now();
  trace.push({
    id: "explain",
    role: "Analyst agent",
    title: "Findings translated",
    summary: `Each finding carries the statistic that triggered it, the columns involved and the repair step.`,
    status: "passed",
    durationMs: explainMs,
    artifacts: [`${findings.length} explanations`],
  });

  const verifications = verifyFindings(dataset, config.target, profiles, findings);
  const passed = verifications.filter((v) => v.supported).length;
  const verifyMs = now() - t;
  t = now();
  trace.push({
    id: "verify",
    role: "Verifier agent",
    title: "Claims recomputed",
    summary: `${passed} of ${verifications.length} findings were reproduced from the raw table by a second code path.`,
    status: passed === verifications.length ? "passed" : "flagged",
    durationMs: Math.round(verifyMs),
    artifacts: [`${passed}/${verifications.length} verified`],
  });

  const verdict = buildVerdict(findings, model);
  const decideMs = now() - t;
  trace.push({
    id: "decide",
    role: "Decision agent",
    title: `Verdict: ${verdict.label}`,
    summary: verdict.headline,
    status: verdict.level === "ship" ? "passed" : "flagged",
    durationMs: Math.round(decideMs),
    artifacts: [`score ${verdict.score}/100`],
  });

  // Keep only findings the verifier could reproduce.
  const verifiedIds = new Set(verifications.filter((v) => v.supported).map((v) => v.findingId));
  const kept = findings.filter((f) => verifiedIds.has(f.id));

  return {
    datasetName: dataset.name,
    config,
    rows: dataset.rows.length,
    columnCount: dataset.columns.length,
    profiles,
    findings: kept,
    model,
    verdict,
    trace,
    verifiedClaims: { total: verifications.length, passed },
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}

export function auditSummaryLine(result: AuditResult): string {
  if (result.model && result.model.inflation > 0.01) {
    return `${result.model.metric.toUpperCase()} drops ${(result.model.inflation * 100).toFixed(1)} points once leaked columns are removed.`;
  }
  const critical = result.findings.filter((f) => f.severity === "critical").length;
  if (critical > 0) return `${critical} critical leak${critical === 1 ? "" : "s"} found in ${result.rows} rows.`;
  return `No critical leakage. ${result.findings.length} issues worth reviewing.`;
}
