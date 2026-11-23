import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../lib/audit/csv";
import { profileDataset } from "../lib/audit/profile";
import { association } from "../lib/audit/detectors";

const ds = parseCsv(readFileSync(join(process.cwd(), "data/cases/retail_churn.csv"), "utf8"), "retail");
const profiles = profileDataset(ds);
for (const p of profiles) {
  const a = association(ds, p.name, "churned", "classification");
  console.log(p.name.padEnd(20), p.kind.padEnd(12), "distinct", String(p.distinct).padEnd(5), "assoc", a ? a.score.toFixed(4) : "null", a?.method ?? "");
}
