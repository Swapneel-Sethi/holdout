import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runAudit } from "../lib/audit/engine";
import { rng } from "../lib/audit/stats";
import type { Dataset, LeakType, RawValue } from "../lib/audit/types";
import { ENGINE_VERSION } from "../lib/audit/types";

function gauss(r: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick<T>(r: () => number, xs: T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function make(name: string, columns: string[], rows: RawValue[][]): Dataset {
  return { name, columns, rows };
}

const CHANNELS = ["web", "app", "phone", "partner"];
const REGIONS = ["north", "south", "east", "west"];

interface Case {
  name: string;
  expected: LeakType | "clean";
  dataset: Dataset;
  target: string;
  time?: string;
  entity?: string;
  hard?: boolean;
}

function baseRows(r: () => number, n: number): RawValue[][] {
  return Array.from({ length: n }, () => {
    const a = Math.abs(gauss(r)) * 40 + 5;
    const b = Math.max(1, Math.round(Math.abs(gauss(r)) * 3) + 1);
    return [Number(a.toFixed(2)), b, pick(r, CHANNELS), pick(r, REGIONS)];
  });
}

function buildCases(): Case[] {
  const cases: Case[] = [];

  // 1. Post outcome proxy
  for (let k = 0; k < 6; k++) {
    const r = rng(1000 + k);
    const n = 300 + k * 7;
    const rows = baseRows(r, n).map((row) => [...row]) as RawValue[][];
    const y = rows.map((row) => {
      const z = -0.4 + 0.02 * Number(row[0]) + 0.2 * Number(row[1]) + (row[2] === "app" ? 0.4 : 0);
      return r() < sigmoid(z) ? 1 : 0;
    });
    rows.forEach((row, i) => {
      const yv = y[i];
      row.push(Number((yv * 5 + gauss(r) * 0.35).toFixed(3)));
      row.push(yv);
    });
    cases.push({
      name: `proxy_${k}`,
      expected: "target_proxy",
      dataset: make(`proxy_${k}`, ["amount", "visits", "channel", "region", "settlement_score", "converted"], rows),
      target: "converted",
    });
  }

  // 2. Row identifier
  for (let k = 0; k < 6; k++) {
    const r = rng(2000 + k);
    const n = 310 + k * 5;
    const rows = baseRows(r, n).map((row) => [...row]) as RawValue[][];
    rows.forEach((row, i) => {
      row.unshift(`ACC-${String(700000 + k * 1000 + i)}`);
      const z = -0.3 + 0.015 * Number(row[1]) + 0.25 * Number(row[2]);
      row.push(r() < sigmoid(z) ? 1 : 0);
    });
    cases.push({
      name: `identifier_${k}`,
      expected: "identifier",
      dataset: make(`identifier_${k}`, ["account_ref", "amount", "visits", "channel", "region", "renewed"], rows),
      target: "renewed",
    });
  }

  // 3. Temporal drift
  for (let k = 0; k < 6; k++) {
    const r = rng(3000 + k);
    const n = 340 + k * 4;
    const rows: RawValue[][] = [];
    for (let i = 0; i < n; i++) {
      const day = Math.floor(r() * 260);
      const base = 0.015 + 0.34 * (day / 259) ** 1.5;
      const amount = Number((Math.abs(gauss(r)) * 60 + 10).toFixed(2));
      const z = Math.log(base / (1 - base)) + 0.002 * (amount - 60);
      const y = r() < sigmoid(z) ? 1 : 0;
      const date = new Date(Date.UTC(2025, 0, 1) + day * 86400000).toISOString().slice(0, 10);
      rows.push([date, amount, Math.max(1, Math.round(Math.abs(gauss(r)) * 2) + 1), pick(r, CHANNELS), y]);
    }
    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    cases.push({
      name: `temporal_${k}`,
      expected: "temporal",
      dataset: make(`temporal_${k}`, ["event_date", "amount", "sessions", "channel", "renewed"], rows),
      target: "renewed",
      time: "event_date",
    });
  }

  // 4. Repeated entities
  for (let k = 0; k < 6; k++) {
    const r = rng(4000 + k);
    const stores = Array.from({ length: 26 + k }, (_, i) => `ST-${200 + i}`);
    const effect = new Map(stores.map((s) => [s, gauss(r) * 0.9]));
    const rows: RawValue[][] = [];
    for (let i = 0; i < 320 + k * 6; i++) {
      const store = pick(r, stores);
      const footfall = Number((Math.abs(gauss(r)) * 180 + 40).toFixed(2));
      const z = -0.5 + (effect.get(store) ?? 0) + 0.004 * footfall;
      rows.push([store, footfall, pick(r, REGIONS), r() < sigmoid(z) ? 1 : 0]);
    }
    cases.push({
      name: `group_${k}`,
      expected: "group_entity",
      dataset: make(`group_${k}`, ["store_id", "footfall", "region", "upsold"], rows),
      target: "upsold",
      entity: "store_id",
    });
  }

  // 5. Exact duplicate rows
  for (let k = 0; k < 6; k++) {
    const r = rng(5000 + k);
    const base = baseRows(r, 300).map((row) => [...row]) as RawValue[][];
    base.forEach((row) => {
      const z = -0.6 + 0.02 * Number(row[0]) + 0.3 * Number(row[1]);
      row.push(r() < sigmoid(z) ? 1 : 0);
    });
    const copies = 28 + k;
    const rows = [...base];
    for (let i = 0; i < copies; i++) rows.push([...base[Math.floor(r() * base.length)]]);
    cases.push({
      name: `duplicates_${k}`,
      expected: "duplicate_rows",
      dataset: make(`duplicates_${k}`, ["amount", "visits", "channel", "region", "upgraded"], rows),
      target: "upgraded",
    });
  }

  // 6. Rare class
  for (let k = 0; k < 6; k++) {
    const r = rng(6000 + k);
    const n = 330 + k * 3;
    const rows = baseRows(r, n).map((row) => [...row]) as RawValue[][];
    const positiveCount = 4 + (k % 2);
    const positives = new Set<number>();
    while (positives.size < positiveCount) positives.add(Math.floor(r() * n));
    rows.forEach((row, i) => row.push(positives.has(i) ? 1 : 0));
    cases.push({
      name: `imbalance_${k}`,
      expected: "imbalance",
      dataset: make(`imbalance_${k}`, ["amount", "visits", "channel", "region", "fraud"], rows),
      target: "fraud",
    });
  }

  // 7. Post outcome naming with moderate signal
  for (let k = 0; k < 6; k++) {
    const r = rng(7000 + k);
    const n = 320 + k * 4;
    const rows = baseRows(r, n).map((row) => [...row]) as RawValue[][];
    rows.forEach((row) => {
      const z = -0.5 + 0.02 * Number(row[0]) + 0.3 * Number(row[1]);
      const y = r() < sigmoid(z) ? 1 : 0;
      const resolved = r() < 0.5 + 0.35 * (y === 1 ? 1 : 0) ? 1 : 0;
      row.push(resolved);
      row.push(y);
    });
    cases.push({
      name: `name_signal_${k}`,
      expected: "name_signal",
      dataset: make(`name_signal_${k}`, ["amount", "visits", "channel", "region", "case_resolved", "churned"], rows),
      target: "churned",
    });
  }

  // 8. Clean datasets
  for (let k = 0; k < 9; k++) {
    const r = rng(8000 + k);
    const n = 300 + k * 8;
    const rows: RawValue[][] = [];
    for (let i = 0; i < n; i++) {
      const a = Number((Math.abs(gauss(r)) * 55 + 12).toFixed(3));
      const b = Math.max(0, Math.round(Math.abs(gauss(r)) * 5));
      const c = pick(r, CHANNELS);
      const d = pick(r, REGIONS);
      const z = -0.35 + 0.018 * a + 0.22 * b + (c === "partner" ? 0.35 : 0);
      rows.push([a, b, c, d, r() < sigmoid(z) ? 1 : 0]);
    }
    cases.push({
      name: `clean_${k}`,
      expected: "clean",
      dataset: make(`clean_${k}`, ["amount", "visits", "channel", "region", "converted"], rows),
      target: "converted",
    });
  }

  // 9. Stress cases: weak signals, near misses and specificity traps.
  for (let k = 0; k < 2; k++) {
    const r = rng(9000 + k);
    const n = 320;
    const rows = baseRows(r, n).map((row) => [...row]) as RawValue[][];
    const y = rows.map((row) => {
      const z = -0.4 + 0.02 * Number(row[0]) + 0.2 * Number(row[1]);
      return r() < sigmoid(z) ? 1 : 0;
    });
    rows.forEach((row, i) => {
      row.push(Number((y[i] * 5 + gauss(r) * 3.6).toFixed(3)));
      row.push(y[i]);
    });
    cases.push({
      name: `stress_proxy_noisy_${k}`,
      expected: "target_proxy",
      hard: true,
      dataset: make(`stress_proxy_noisy_${k}`, ["amount", "visits", "channel", "region", "settlement_score", "converted"], rows),
      target: "converted",
    });
  }

  for (let k = 0; k < 2; k++) {
    const r = rng(9100 + k);
    const n = 340;
    const rows: RawValue[][] = [];
    for (let i = 0; i < n; i++) {
      const day = Math.floor(r() * 260);
      const base = 0.09 + 0.05 * (day / 259);
      const y = r() < base ? 1 : 0;
      const date = new Date(Date.UTC(2025, 0, 1) + day * 86400000).toISOString().slice(0, 10);
      rows.push([date, Number((Math.abs(gauss(r)) * 40 + 8).toFixed(2)), y]);
    }
    cases.push({
      name: `stress_temporal_weak_${k}`,
      expected: "temporal",
      hard: true,
      dataset: make(`stress_temporal_weak_${k}`, ["event_date", "amount", "renewed"], rows),
      target: "renewed",
      time: "event_date",
    });
  }

  {
    const r = rng(9200);
    const rows: RawValue[][] = [];
    const entities = Array.from({ length: 150 }, (_, i) => `E-${i}`);
    for (let i = 0; i < 300; i++) {
      const e = i < 298 ? entities[i] : entities[0];
      rows.push([e, Number((Math.abs(gauss(r)) * 20).toFixed(2)), r() < 0.3 ? 1 : 0]);
    }
    cases.push({
      name: "stress_group_sparse",
      expected: "group_entity",
      hard: true,
      dataset: make("stress_group_sparse", ["ref_id", "amount", "converted"], rows),
      target: "converted",
      entity: "ref_id",
    });
  }

  for (let k = 0; k < 2; k++) {
    const r = rng(9300 + k);
    const n = 310;
    const rows: RawValue[][] = [];
    for (let i = 0; i < n; i++) {
      rows.push([
        Number((Math.abs(gauss(r)) * 50 + 5).toFixed(3)),
        pick(r, CHANNELS),
        `note ${k} ${i} ${Math.floor(r() * 1e6)}`,
        r() < 0.4 ? 1 : 0,
      ]);
    }
    cases.push({
      name: `stress_clean_text_${k}`,
      expected: "clean",
      hard: true,
      dataset: make(`stress_clean_text_${k}`, ["amount", "channel", "case_note", "converted"], rows),
      target: "converted",
    });
  }

  {
    const r = rng(9400);
    const rows: RawValue[][] = [];
    for (let i = 0; i < 320; i++) {
      const a = Number((Math.abs(gauss(r)) * 40 + 10).toFixed(2));
      const z = -1.2 + 0.075 * a;
      rows.push([a, Math.max(0, Math.round(Math.abs(gauss(r)) * 4)), r() < sigmoid(z) ? 1 : 0]);
    }
    cases.push({
      name: "stress_clean_strong",
      expected: "clean",
      hard: true,
      dataset: make("stress_clean_strong", ["amount", "visits", "converted"], rows),
      target: "converted",
    });
  }

  return cases;
}

const cases = buildCases();
const runs = cases.map((c) => {
  const t0 = performance.now();
  const result = runAudit(c.dataset, { target: c.target, timeColumn: c.time ?? null, entityColumn: c.entity ?? null });
  const latency = performance.now() - t0;
  const matched = c.expected === "clean"
    ? result.findings.every((f) => f.severity === "low" || f.severity === "medium")
    : result.findings.some((f) => f.leakType === c.expected);
  return {
    name: c.name,
    suite: c.hard ? "stress" : "core",
    expected: c.expected,
    matched,
    latencyMs: Math.round(latency),
    findings: result.findings.map((f) => f.leakType),
    verified: result.verifiedClaims,
    modelInflation: result.model?.inflation ?? null,
  };
});

const types: (LeakType | "clean")[] = [
  "target_proxy",
  "identifier",
  "temporal",
  "group_entity",
  "duplicate_rows",
  "imbalance",
  "name_signal",
  "clean",
];

function summarise(subset: typeof runs) {
  const perType = types.map((type) => {
    const group = subset.filter((r) => r.expected === type);
    const detected = group.filter((r) => r.matched).length;
    return {
      type,
      label: type === "clean" ? "Clean control" : type.replace(/_/g, " "),
      cases: group.length,
      detected,
      recall: group.length === 0 ? 0 : detected / group.length,
    };
  });
  const leakTypes = perType.filter((p) => p.type !== "clean" && p.cases > 0);
  const recall = leakTypes.reduce((s, p) => s + p.recall, 0) / Math.max(1, leakTypes.length);
  const clean = perType.find((p) => p.type === "clean");
  const cleanPassRate = clean && clean.cases > 0 ? clean.recall : 0;
  const f1 = recall + cleanPassRate === 0 ? 0 : (2 * recall * cleanPassRate) / (recall + cleanPassRate);
  const latencies = subset.map((r) => r.latencyMs).sort((a, b) => a - b);
  const verified = subset.reduce((s, r) => s + r.verified.passed, 0);
  const totalClaims = subset.reduce((s, r) => s + r.verified.total, 0);
  return {
    datasets: subset.length,
    recall: Number(recall.toFixed(3)),
    cleanPassRate: Number(cleanPassRate.toFixed(3)),
    f1: Number(f1.toFixed(3)),
    medianLatencyMs: latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0,
    verifiedRate: Number((verified / Math.max(1, totalClaims)).toFixed(3)),
    perType: perType.filter((p) => p.cases > 0),
  };
}

const overall = summarise(runs);
const core = summarise(runs.filter((r) => r.suite === "core"));
const stress = summarise(runs.filter((r) => r.suite === "stress"));

const payload = {
  generatedAt: new Date().toISOString(),
  engineVersion: ENGINE_VERSION,
  datasets: runs.length,
  overall,
  core,
  stress,
  runs,
};

mkdirSync(join(process.cwd(), "data"), { recursive: true });
writeFileSync(join(process.cwd(), "data", "benchmark.json"), JSON.stringify(payload, null, 2));

console.log(`datasets ${payload.datasets}`);
console.log(`overall recall ${overall.recall} clean ${overall.cleanPassRate} f1 ${overall.f1}`);
console.log(`core    recall ${core.recall} clean ${core.cleanPassRate} f1 ${core.f1}`);
console.log(`stress  recall ${stress.recall} clean ${stress.cleanPassRate} f1 ${stress.f1}`);
console.log(`median ${overall.medianLatencyMs} ms verified ${overall.verifiedRate}`);
for (const p of overall.perType) console.log(` ${p.type.padEnd(16)} ${p.detected}/${p.cases}`);
for (const r of runs.filter((x) => !x.matched)) console.log(" miss", r.suite, r.name, r.findings.join(","));
