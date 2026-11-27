import type { Dataset, RawValue } from "./types";

const MISSING = new Set(["", "na", "n/a", "null", "nan", "-", "?"]);

export function parseCsv(text: string, name = "dataset.csv"): Dataset {
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
    } else if (c === ",") {
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

function buildDataset(
  name: string,
  rows: string[][],
): Dataset {
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

export async function parseCsvAsync(
  text: string,
  name = "dataset.csv",
  options: { chunkChars?: number; yieldEveryMs?: number } = {},
): Promise<Dataset> {
  const { chunkChars = 16384, yieldEveryMs = 50 } = options;
  const clean = text.replace(/^\uFEFF/, "");

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
      } else if (c === ",") {
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

  return buildDataset(name, rows);
}
