import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../lib/audit/csv";
import { runAudit } from "../lib/audit/engine";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const ds = parseCsv(
  readFileSync(join(process.cwd(), "data/cases/retail_churn.csv"), "utf8"),
  "retail_churn.csv",
);
const res = runAudit(ds, {
  target: "churned",
  timeColumn: "signup_date",
  entityColumn: "customer_id",
});

assert(res.verdict.level === "block", `retail_churn should block, got ${res.verdict.level}`);
assert(
  res.findings.some((f) => f.leakType === "target_proxy"),
  "retail_churn should detect target_proxy",
);
assert(res.verifiedClaims.passed === res.verifiedClaims.total, "all claims verified");

const clean = parseCsv(
  readFileSync(join(process.cwd(), "data/cases/support_ops.csv"), "utf8"),
  "support_ops.csv",
);
const cleanRes = runAudit(clean, { target: "escalated" });
assert(
  cleanRes.verdict.level === "ship",
  `support_ops should ship, got ${cleanRes.verdict.level}`,
);

console.log("tests done");
