import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../lib/audit/csv";
import { runAudit } from "../lib/audit/engine";

const text = readFileSync(join(process.cwd(), "data", "cases", "retail_churn.csv"), "utf8");
const dataset = parseCsv(text, "retail_churn.csv");
const result = runAudit(dataset, {
  target: "churned",
  timeColumn: "signup_date",
  entityColumn: "customer_id",
});

const headline = {
  generatedAt: new Date().toISOString(),
  case: "retail_churn.csv",
  title: "Retail churn",
  rows: result.rows,
  columns: result.columnCount,
  verdict: result.verdict,
  model: result.model,
  verified: result.verifiedClaims,
  findings: result.findings.slice(0, 4).map((f) => ({
    severity: f.severity,
    leakType: f.leakType,
    title: f.title,
    columns: f.columns,
    metric: f.metric,
    fix: f.fix,
  })),
};

writeFileSync(join(process.cwd(), "data", "headline.json"), JSON.stringify(headline, null, 2));
console.log(result.verdict.level, result.verdict.score, result.model?.full, result.model?.clean);
