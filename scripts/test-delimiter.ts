import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, parseCsvAsync, detectDelimiter } from "../lib/audit/csv";
import { runAudit, runAuditAsync } from "../lib/audit/engine";

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
  // ---------- Test 1: Comma CSV behavior preserved ----------
  {
    const text = readFileSync(join(process.cwd(), "data/cases/retail_churn.csv"), "utf8");
    const ds = parseCsv(text, "retail_churn.csv");
    assert(ds.columns.length === 9, `comma columns: ${ds.columns.length}`);
    assert(ds.rows.length === 540, `comma rows: ${ds.rows.length}`);
    assert(detectDelimiter(text) === ",", `detect comma delimiter`);

    const result = runAudit(ds, { target: "churned", timeColumn: "signup_date", entityColumn: "customer_id" });
    assert(result.verdict.level === "block", `comma audit block: ${result.verdict.level}`);
    assert(approx(result.model!.full, 1.0, 0.001), `comma full AUC: ${result.model!.full}`);
    assert(approx(result.model!.clean, 0.699, 0.01), `comma clean AUC: ${result.model!.clean}`);
  }

  // ---------- Test 2: Semicolon CSV (UCI Bank Marketing style) ----------
  {
    // UCI bank-additional.csv uses semicolons. Model a small version with real field names.
    const header = "age;job;marital;education;default;housing;loan;contact;month;day;duration;campaign;pdays;previous;poutcome;emp_var_rate;cons_price_idx;cons_conf_idx;euribor3m;nr_employed;y";
    const rows = [
      "58;management;married;tertiary;no;yes;no;cellular;may;mon;261;1;-1;0;unknown;1.1;93.2;-39.8;4.9;5196;no",
      "44;technician;single;secondary;no;no;no;cellular;may;mon;151;1;-1;0;unknown;1.1;93.2;-39.8;4.9;5196;no",
      "33;entrepreneur;married;secondary;no;yes;yes;cellular;may;mon;76;1;-1;0;unknown;1.1;93.2;-39.8;4.9;5196;no",
      "47;blue-collar;married;unknown;no;yes;no;cellular;may;mon;92;1;-1;0;unknown;1.1;93.2;-39.8;4.9;5196;no",
      "33;unknown;single;unknown;no;no;yes;cellular;may;mon;198;1;-1;0;unknown;1.1;93.2;-39.8;4.9;5196;yes",
      "35;management;married;tertiary;no;no;no;cellular;apr;thu;138;1;-1;0;unknown;1.1;93.2;-39.8;4.9;5196;no",
      "28;services;single;secondary;no;yes;yes;cellular;apr;thu;218;1;-1;0;unknown;1.1;93.2;-39.8;4.9;5196;no",
      "42;retired;married;tertiary;no;yes;no;cellular;apr;thu;199;1;-1;0;unknown;1.1;93.2;-39.8;4.9;5196;no",
    ];
    const text = header + "\n" + rows.join("\n");
    assert(detectDelimiter(text) === ";", `detect semicolon delimiter`);

    const ds = parseCsv(text, "bank_marketing.csv");
    assert(ds.columns.length === 21, `semicolon columns: ${ds.columns.length}`);
    assert(ds.columns[0] === "age", `first col: ${ds.columns[0]}`);
    assert(ds.columns[20] === "y", `last col: ${ds.columns[20]}`);
    assert(ds.rows.length === 8, `semicolon rows: ${ds.rows.length}`);
    assert(ds.rows[0][0] === 58, `first cell numeric: ${ds.rows[0][0]}`);
    assert(ds.rows[0][20] === "no", `last cell string: ${ds.rows[0][20]}`);

    // Run audit on semicolon data
    const result = runAudit(ds, { target: "y" });
    assert(result.analysisMode === "full", `semicolon full mode: ${result.analysisMode}`);
    assert(result.rows === 8, `semicolon audit rows: ${result.rows}`);
    console.log(`  semicolon audit verdict: ${result.verdict.level} (${result.verdict.score})`);
  }

  // ---------- Test 3: Tab-delimited ----------
  {
    const header = "id\tamount\tflag";
    const rows = ["1\t100.5\t1", "2\t200.0\t0", "3\t50.25\t1", "4\t75.0\t0", "5\t300.0\t1"];
    const text = header + "\n" + rows.join("\n");
    assert(detectDelimiter(text) === "\t", `detect tab delimiter`);

    const ds = parseCsv(text, "tab_data.csv");
    assert(ds.columns.length === 3, `tab columns: ${ds.columns.length}`);
    assert(ds.rows.length === 5, `tab rows: ${ds.rows.length}`);
    assert(ds.rows[0][0] === 1, `tab first cell: ${ds.rows[0][0]}`);
    assert(ds.rows[0][1] === 100.5, `tab second cell: ${ds.rows[0][1]}`);
  }

  // ---------- Test 4: Pipe-delimited ----------
  {
    const header = "id|name|active";
    const rows = ["1|Alice|yes", "2|Bob|no", "3|Carol|yes", "4|Dave|no", "5|Eve|yes"];
    const text = header + "\n" + rows.join("\n");
    assert(detectDelimiter(text) === "|", `detect pipe delimiter`);

    const ds = parseCsv(text, "pipe_data.csv");
    assert(ds.columns.length === 3, `pipe columns: ${ds.columns.length}`);
    assert(ds.rows.length === 5, `pipe rows: ${ds.rows.length}`);
    assert(ds.rows[0][1] === "Alice", `pipe string cell: ${ds.rows[0][1]}`);
  }

  // ---------- Test 5: Quoted fields containing delimiter ----------
  {
    const header = 'name;city;note';
    const rows = ['"Smith, John";New York;"Likes hiking, swimming"', '"Doe, Jane";Boston;"Works late; prefers quiet"'];
    const text = header + "\n" + rows.join("\n");
    assert(detectDelimiter(text) === ";", `detect semicolon with quoted commas`);

    const ds = parseCsv(text, "quoted.csv");
    assert(ds.columns.length === 3, `quoted columns: ${ds.columns.length}`);
    assert(ds.rows.length === 2, `quoted rows: ${ds.rows.length}`);
    assert(ds.rows[0][0] === "Smith, John", `quoted comma in name: ${ds.rows[0][0]}`);
    assert(ds.rows[0][2] === "Likes hiking, swimming", `quoted comma in note: ${ds.rows[0][2]}`);
    assert(ds.rows[1][2] === "Works late; prefers quiet", `quoted semicolon in note: ${ds.rows[1][2]}`);
  }

  // ---------- Test 6: Fallback to comma for ambiguous single-column ----------
  {
    // A file with commas in values but no real delimiter structure should fall back to comma
    const text = "just one column with, commas inside\nsecond line, with comma too";
    const delim = detectDelimiter(text);
    console.log(`  ambiguous text detected delimiter: "${delim}"`);
    const ds = parseCsv(text, "ambiguous.csv");
    assert(ds.columns.length >= 1, `ambiguous has columns: ${ds.columns.length}`);
  }

  // ---------- Test 7: Async parsing with semicolon ----------
  {
    const header = "id;amount;flag";
    const rows = Array.from({ length: 50 }, (_, i) => `${i + 1};${(i * 10.5).toFixed(2)};${i % 2 === 0 ? 1 : 0}`);
    const text = header + "\n" + rows.join("\n");

    const ds = await parseCsvAsync(text, "async_semicolon.csv");
    assert(ds.columns.length === 3, `async semicolon columns: ${ds.columns.length}`);
    assert(ds.rows.length === 50, `async semicolon rows: ${ds.rows.length}`);
    assert(ds.rows[0][0] === 1, `async first cell: ${ds.rows[0][0]}`);

    const result = await runAuditAsync(ds, { target: "flag" });
    assert(result.analysisMode === "full", `async semicolon full mode: ${result.analysisMode}`);
    assert(result.rows === 50, `async semicolon audit rows: ${result.rows}`);
  }

  // ---------- Test 8: Single column (no delimiter) ----------
  {
    const text = "justonecolumn\nvalue1\nvalue2\nvalue3";
    const ds = parseCsv(text, "single.csv");
    assert(ds.columns.length === 1, `single column count: ${ds.columns.length}`);
    assert(ds.rows.length === 3, `single column rows: ${ds.rows.length}`);
  }

  console.log(`\n${failures === 0 ? "ALL DELIMITER TESTS PASSED" : failures + " FAILURES"}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
