import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { valuesToCsv } from "../lib/audit/csv";
import { rng } from "../lib/audit/stats";

const outDirs = [join(process.cwd(), "data", "cases"), join(process.cwd(), "public", "cases")];
for (const d of outDirs) mkdirSync(d, { recursive: true });

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

function iso(day: number): string {
  const d = new Date(Date.UTC(2025, 0, 1) + day * 86400000);
  return d.toISOString().slice(0, 10);
}

function writeCase(name: string, headers: string[], rows: (string | number | null)[][]) {
  const csv = valuesToCsv(headers, rows);
  for (const d of outDirs) writeFileSync(join(d, name), csv, "utf8");
  console.log(`${name}: ${rows.length} rows, ${(csv.length / 1024).toFixed(0)} kB`);
}

// 1. Retail churn with a post outcome field and a row identifier.
{
  const r = rng(101);
  const rows: (string | number | null)[][] = [];
  const plans = ["Month-to-month", "One year", "Two year"];
  const regions = ["Mysuru", "Bengaluru", "Mangaluru", "Hubballi"];
  const reasons = ["Price", "Coverage", "Support", "Moved", "Competitor offer"];
  for (let i = 0; i < 540; i++) {
    const tenure = Math.max(1, Math.round(Math.abs(gauss(r)) * 14 + 3));
    const plan = pick(r, plans);
    const spend = Math.round(420 + gauss(r) * 160 + (plan === "Two year" ? 90 : 0));
    const tickets = Math.max(0, Math.round(Math.abs(gauss(r)) * 2.1));
    const region = pick(r, regions);
    const z = -2.15 + 2.3 * (1 - Math.min(1, tenure / 42)) + 0.42 * tickets + 0.55 * (plan === "Month-to-month" ? 1 : 0) - 0.002 * (spend - 420);
    const churned = r() < sigmoid(z) ? 1 : 0;
    const reason = churned === 1 ? pick(r, reasons) : "none";
    rows.push([`C-${10020 + i}`, tenure, spend, tickets, plan, region, iso(400 - tenure * 9), churned, reason]);
  }
  writeCase(
    "retail_churn.csv",
    ["customer_id", "tenure_months", "monthly_spend", "support_tickets", "plan", "region", "signup_date", "churned", "cancellation_reason"],
    rows,
  );
}

// 2. Card fraud with a rising fraud rate over time.
{
  const r = rng(202);
  const rows: (string | number | null)[][] = [];
  const merchants = ["Grocery", "Fuel", "Electronics", "Travel", "Dining", "Digital"];
  for (let i = 0; i < 660; i++) {
    const day = Math.floor(r() * 180);
    const amount = Math.round(Math.max(40, Math.abs(gauss(r)) * 950 + 120));
    const merchant = pick(r, merchants);
    const hour = Math.floor(r() * 24);
    const deviceAge = Math.max(0, Math.round(Math.abs(gauss(r)) * 240));
    const base = 0.012 + 0.33 * (day / 179) ** 1.6;
    const z = Math.log(base / (1 - base)) + 0.0006 * (amount - 600) - 0.0025 * deviceAge + (merchant === "Digital" ? 0.5 : 0) + (hour < 6 ? 0.6 : 0);
    const fraud = r() < sigmoid(z) ? 1 : 0;
    rows.push([`TX-${900000 + i}`, iso(day), amount, merchant, hour, deviceAge, fraud]);
  }
  rows.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  writeCase("card_fraud.csv", ["txn_id", "txn_date", "amount", "merchant_category", "hour_of_day", "device_age_days", "chargeback"], rows);
}

// 3. Clean support operations data.
{
  const r = rng(303);
  const rows: (string | number | null)[][] = [];
  const channels = ["Email", "Chat", "Phone"];
  const tiers = ["Basic", "Plus", "Enterprise"];
  for (let i = 0; i < 560; i++) {
    const channel = pick(r, channels);
    const tier = pick(r, tiers);
    const response = Math.max(2, Math.round(18 + gauss(r) * 9 + (channel === "Chat" ? -6 : 0)));
    const messages = Math.max(1, Math.round(Math.abs(gauss(r)) * 3 + 1));
    const prior = Math.max(0, Math.round(Math.abs(gauss(r)) * 2.4));
    const z = -2.0 + 0.055 * (response - 18) + 0.42 * (tier === "Basic" ? 1 : 0) + 0.11 * messages + 0.06 * prior;
    const escalated = r() < sigmoid(z) ? 1 : 0;
    rows.push([response, messages, prior, channel, tier, escalated]);
  }
  writeCase("support_ops.csv", ["first_response_min", "message_count", "prior_tickets", "channel", "tier", "escalated"], rows);
}

// 4. Building energy with a derived billing column and repeated buildings.
{
  const r = rng(404);
  const rows: (string | number | null)[][] = [];
  const buildings = Array.from({ length: 40 }, (_, i) => `BLD-${100 + i}`);
  for (let i = 0; i < 720; i++) {
    const building = pick(r, buildings);
    const hour = Math.floor(r() * 24);
    const temp = Math.round(18 + gauss(r) * 6);
    const occupancy = Math.round(40 + gauss(r) * 25);
    const setpoint = 22 + Math.round(gauss(r) * 1.5);
    const energy = Math.max(4, 22 + 0.55 * (temp - 18) + 0.12 * occupancy + (hour >= 9 && hour <= 18 ? 6 : 0) + gauss(r) * 4);
    const billed = Number((energy * (1 + gauss(r) * 0.004)).toFixed(1));
    rows.push([building, iso(i % 120), hour, temp, occupancy, setpoint, Number(energy.toFixed(1)), billed]);
  }
  writeCase("building_energy.csv", ["building_id", "read_date", "hour", "outdoor_temp", "occupancy", "hvac_setpoint", "energy_kwh", "billed_kwh"], rows);
}
