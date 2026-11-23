import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../lib/audit/csv";
import { runAudit } from "../lib/audit/engine";

const cases: { file: string; target: string; time?: string; entity?: string }[] = [
  { file: "retail_churn.csv", target: "churned", time: "signup_date", entity: "customer_id" },
  { file: "card_fraud.csv", target: "chargeback", time: "txn_date", entity: "txn_id" },
  { file: "support_ops.csv", target: "escalated" },
  { file: "building_energy.csv", target: "energy_kwh", time: "read_date", entity: "building_id" },
];

for (const c of cases) {
  const text = readFileSync(join(process.cwd(), "data", "cases", c.file), "utf8");
  const ds = parseCsv(text, c.file);
  const t0 = performance.now();
  const res = runAudit(ds, { target: c.target, timeColumn: c.time, entityColumn: c.entity });
  const ms = performance.now() - t0;
  console.log(`\n=== ${c.file} (${ms.toFixed(0)} ms) ===`);
  console.log("verdict", res.verdict.level, res.verdict.score, "|", res.verdict.headline);
  console.log("model", res.model ? JSON.stringify({ full: res.model.full.toFixed(3), clean: res.model.clean.toFixed(3), temporal: res.model.temporal?.toFixed(3), grouped: res.model.grouped?.toFixed(3), inflation: res.model.inflation.toFixed(3), metric: res.model.metric }) : "none");
  console.log("verified", `${res.verifiedClaims.passed}/${res.verifiedClaims.total}`);
  for (const f of res.findings) console.log(" -", f.severity, f.leakType, f.columns.join(","), f.metric.display);
}
