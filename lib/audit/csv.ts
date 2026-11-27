import type { Dataset, RawValue } from "./types";

const MISSING = new Set(["", "na", "n/a", "null", "nan", "-", "?"]);

export const DELIMITERS: string[] = [",", ";", "\t", "|"];
function countDelimiterOutsideQuotes(line: string, delim: string): number {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        i++; // escaped quote
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && c === delim) {
      count++;
    }
  }
  return count;
}

// Detect the most likely field delimiter from the first lines of the text.
// Comma is preferred on ties to preserve existing behavior for comma CSV files.
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return ",";

  const sample = lines.slice(0, Math.min(100, lines.length));

  let bestDelim = ",";
  let bestScore = -1;

  for (const delim of DELIMITERS) {
    const counts = sample.map((l) => countDelimiterOutsideQuotes(l, delim));
    const headerCount = counts[0];
    if (headerCount === 0) continue; // this delimiter separates no columns

    const consistent = counts.filter((c) => c === headerCount).length;
    const consistency = consistent / counts.length;

    // Score favors a high, consistent column count. Comma wins ties.
    const score = consistency * headerCount;
    if (score > bestScore || (score === bestScore && delim === ",")) {
      bestScore = score;
      bestDelim = delim;
    }
  }

  return bestDelim;
}

function buildDataset(name: string, rows: string[][]): Dataset {
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length === 0) return { name, columns: [], rows: [] };

  const columns = nonEmpty[0].map((c, i) => c.trim() || `column_${i + 1}`);
  const body = nonEmpty.slice(1).filter((r) => r.length === columns.length || r.some((v) => v !== ""));
  const values: RawValue[][] = body.map((r) =>
    columns.map((_, i) => {
      const raw = (r[i] ?? "").trim();
      if (MISSING.has(raw.toLowerCase())) return null;
      const n = Number(raw);
      if (raw !== "" && Number.isFinite(n) && !/^0\d/.test(raw)) return n;
      return raw;
    }),
  );

  return { name, columns, rows: values };
}

function parseDelimited(text: string, name: string, delim: string): Dataset {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      quoted = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return buildDataset(name, rows);
}

export function parseCsv(text: string, name = "dataset.csv"): Dataset {
  const clean = text.replace(/^\uFEFF/, "");
  const delim = detectDelimiter(clean);
  const dataset = parseDelimited(clean, name, delim);

  // Fallback: if a non-comma delimiter produced a single column, try comma.
  if (delim !== "," && dataset.columns.length <= 1 && dataset.rows.length > 0) {
    const commaDataset = parseDelimited(clean, name, ",");
    if (commaDataset.columns.length > dataset.columns.length) {
      return commaDataset;
    }
  }

  return dataset;
}

export async function parseCsvAsync(
  text: string,
  name = "dataset.csv",
  options: { chunkChars?: number; yieldEveryMs?: number } = {},
): Promise<Dataset> {
  const { chunkChars = 16384, yieldEveryMs = 50 } = options;
  const clean = text.replace(/^\uFEFF/, "");
  const delim = detectDelimiter(clean);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  let i = 0;
  let lastYield = typeof performance !== "undefined" ? performance.now() : Date.now();

  while (i < clean.length) {
    const chunkEnd = Math.min(i + chunkChars, clean.length);

    while (i < chunkEnd) {
      const c = clean[i];
      if (quoted) {
        if (c === '"') {
          if (clean[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        quoted = true;
      } else if (c === delim) {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && clean[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
      i++;
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastYield >= yieldEveryMs) {
      await new Promise((r) => setTimeout(r, 0));
      lastYield = now;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  let dataset = buildDataset(name, rows);

  // Fallback: if a non-comma delimiter produced a single column, try comma.
  if (delim !== "," && dataset.columns.length <= 1 && dataset.rows.length > 0) {
    const commaDataset = parseDelimited(clean, name, ",");
    if (commaDataset.columns.length > dataset.columns.length) {
      dataset = commaDataset;
    }
  }

  return dataset;
}

export function toRows(dataset: Dataset): Record<string, RawValue>[] {
  return dataset.rows.map((row) => {
    const rec: Record<string, RawValue> = {};
    dataset.columns.forEach((c, i) => {
      rec[c] = row[i] ?? null;
    });
    return rec;
  });
}

export function column(dataset: Dataset, name: string): RawValue[] {
  const idx = dataset.columns.indexOf(name);
  if (idx < 0) return [];
  return dataset.rows.map((r) => r[idx] ?? null);
}

export function isMissing(v: RawValue): boolean {
  return v === null || v === undefined || (typeof v === "string" && MISSING.has(v.trim().toLowerCase()));
}

export function numericValue(v: RawValue): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const t = v.trim().replace(/,/g, "");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function dateValue(v: RawValue): number | null {
  if (typeof v !== "string") return null;
  if (!/^\d{4}-\d{1,2}-\d{1,2}([ T].*)?$/.test(v.trim())) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

export function stringValue(v: RawValue): string {
  return v === null || v === undefined ? "" : String(v);
}

export function valuesToCsv(headers: string[], rows: RawValue[][]): string {
  const esc = (v: RawValue) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}
