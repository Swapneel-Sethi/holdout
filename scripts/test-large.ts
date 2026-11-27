import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsvAsync } from "../lib/audit/csv";
import { runAudit, runAuditAsync } from "../lib/audit/engine";
import type { Dataset } from "../lib/audit/types";

function gauss(r: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function iso(day: number): string {
  const d = new Date(Date.UTC(2025, 0, 1) + day * 86400000);
  return d.toISOString().slice(0, 10);
}

function parseCsvSync(text: string, name = "dataset.csv"): Dataset {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const columns = lines[0].split(",").map((c) => c.trim());
  const rows: string[][] = lines.slice(1).map((l) => l.split(","));
  const values = rows.map((row) =>
    columns.map((_, i) => {
      const raw = (row[i] ?? "").trim();
      if (raw === "") return null;
      const n = Number(raw);
      if (Number.isFinite(n) && !/^0\d/.test(raw)) return n;
      return raw;
    }),
  );
  return { name, columns, rows: values };
}

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    failures++;
  } else {
    console.log("ok:", msg);
  }
}

function approx(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

async function main() {
  // ---------- Test 1: 100K+ row CSV produces sampled result ----------
  {
    const r = (() => { let s = 12345; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const n = 120000;
    const rows: string[][] = [];
    for (let i = 0; i < n; i++) {
      const amount = Number((Math.abs(gauss(r)) * 100 + 10).toFixed(2));
      const y = r() < 0.3 ? 1 : 0;
      rows.push([iso(i % 365), String(amount), String(y)]);
    }
    const header = "date,amount,flag";
    const body = rows.map((row) => row.join(",")).join("\n");
    const text = header + "\n" + body;
    const sizeMB = (new TextEncoder().encode(text).length / (1024 * 1024)).toFixed(2);
    console.log(`100K file: ${sizeMB} MB`);

    const ds = await parseCsvAsync(text, "large_100k.csv");
    assert(ds.rows.length === 120000, `full row count preserved: ${ds.rows.length}`);
    assert(ds.columns.length === 3, `columns: ${ds.columns.length}`);

    const result = await runAuditAsync(ds, { target: "flag", timeColumn: "date", entityColumn: null });
    assert(result.analysisMode === "sampled", `analysisMode sampled: ${result.analysisMode}`);
    assert(result.sampleSize !== null && result.sampleSize! <= 25000, `sampleSize <= 25000: ${result.sampleSize}`);
    assert(result.rows === 120000, `rows field is full count: ${result.rows}`);
    assert(result.columnCount === 3, `columnCount: ${result.columnCount}`);
    console.log(`  sampled analysis: ${result.sampleSize} rows of ${result.rows} total`);
  }

  // ---------- Test 2: File above 8 MB parses correctly ----------
  {
    const r = (() => { let s = 999; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    // ~10 MB: 80K rows x 10 cols with padded text values
    const nCols = 10;
    const nRows = 80000;
    const header = Array.from({ length: nCols }, (_, i) => `feature_${i}`).join(",");
    const lines: string[] = [header];
    for (let i = 0; i < nRows; i++) {
      const vals: string[] = [];
      for (let j = 0; j < nCols - 1; j++) {
        vals.push(`v_${Number((Math.abs(gauss(r)) * 1000).toFixed(2))}_pad_${"x".repeat(12)}`);
      }
      const amount = Math.abs(gauss(r)) * 1000;
      const y = amount > 500 ? 1 : 0;
      vals.push(String(y));
      lines.push(vals.join(","));
    }
    const text = lines.join("\n");
    const sizeMB = (new TextEncoder().encode(text).length / (1024 * 1024)).toFixed(2);
    console.log(`8MB+ file: ${sizeMB} MB, ${nRows} rows x ${nCols} cols`);
    assert(parseFloat(sizeMB) > 8, `file is above 8 MB: ${sizeMB} MB`);

    const ds = await parseCsvAsync(text, "large_wide.csv");
    assert(ds.rows.length === 80000, `row count: ${ds.rows.length}`);
    assert(ds.columns.length === 10, `column count: ${ds.columns.length}`);

    const result = await runAuditAsync(ds, { target: "feature_9", timeColumn: null, entityColumn: null });
    assert(result.rows === 80000, `full row count on 8MB+ file: ${result.rows}`);
    assert(result.analysisMode === "sampled" || result.analysisMode === "full", `valid analysisMode: ${result.analysisMode}`);
    console.log(`  mode: ${result.analysisMode}, sampleSize: ${result.sampleSize}`);
  }

  // ---------- Test 3: Small cases still produce identical full results ----------
  {
    const ds = parseCsvSync(readFileSync(join(process.cwd(), "data/cases/retail_churn.csv"), "utf8"), "retail_churn.csv");
    const result = runAudit(ds, { target: "churned", timeColumn: "signup_date", entityColumn: "customer_id" });
    assert(result.analysisMode === "full", `small case full mode: ${result.analysisMode}`);
    assert(result.sampleSize === null, `small case no sample: ${result.sampleSize}`);
    assert(result.rows === 540, `small case row count: ${result.rows}`);
    assert(result.verdict.level === "block", `small case block: ${result.verdict.level}`);
    assert(approx(result.model!.full, 1.0, 0.001), `small case full AUC: ${result.model!.full}`);
    assert(approx(result.model!.clean, 0.699, 0.01), `small case clean AUC: ${result.model!.clean}`);
  }

  console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : failures + " FAILURES"}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
