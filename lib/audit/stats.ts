export function clamp(x: number, lo = 0, hi = 1): number {
  return Math.min(hi, Math.max(lo, x));
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

export function ranks(xs: number[]): number[] {
  const idx = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k].i] = avg;
    i = j + 1;
  }
  return out;
}

export function spearman(xs: number[], ys: number[]): number {
  return pearson(ranks(xs), ranks(ys));
}

export function auc(scores: number[], labels: number[]): number {
  const n = Math.min(scores.length, labels.length);
  const positives: number[] = [];
  const negatives: number[] = [];
  for (let i = 0; i < n; i++) (labels[i] === 1 ? positives : negatives).push(scores[i]);
  const nPos = positives.length;
  const nNeg = negatives.length;
  if (nPos === 0 || nNeg === 0) return 0.5;

  const all = scores.slice(0, n).map((s, i) => ({ s, y: labels[i] }));
  all.sort((a, b) => a.s - b.s);
  let rank = 1;
  let i = 0;
  let sumPosRanks = 0;
  while (i < all.length) {
    let j = i;
    while (j + 1 < all.length && all[j + 1].s === all[i].s) j++;
    const avg = (rank + (rank + (j - i))) / 2;
    for (let k = i; k <= j; k++) if (all[k].y === 1) sumPosRanks += avg;
    rank += j - i + 1;
    i = j + 1;
  }
  return (sumPosRanks - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

export function r2Score(actual: number[], predicted: number[]): number {
  const m = mean(actual);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < actual.length; i++) {
    ssRes += (actual[i] - predicted[i]) ** 2;
    ssTot += (actual[i] - m) ** 2;
  }
  if (ssTot === 0) return 0;
  return 1 - ssRes / ssTot;
}

export function ksDistance(a: number[], b: number[]): number {
  if (a.length < 5 || b.length < 5) return 0;
  const xs = [...a, ...b].sort((p, q) => p - q);
  let i = 0;
  let j = 0;
  let d = 0;
  for (const x of xs) {
    while (i < a.length && a[i] <= x) i++;
    while (j < b.length && b[j] <= x) j++;
    d = Math.max(d, Math.abs(i / a.length - j / b.length));
  }
  return d;
}

export function cramersV(xs: (string | number)[], ys: (string | number)[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return 0;
  const xLevels = [...new Set(xs)];
  const yLevels = [...new Set(ys)];
  if (xLevels.length < 2 || yLevels.length < 2) return 0;
  const xi = new Map(xLevels.map((v, i) => [v, i]));
  const yi = new Map(yLevels.map((v, i) => [v, i]));
  const table = Array.from({ length: xLevels.length }, () => new Array(yLevels.length).fill(0));
  const rowTotals = new Array(xLevels.length).fill(0);
  const colTotals = new Array(yLevels.length).fill(0);
  for (let k = 0; k < n; k++) {
    const a = xi.get(xs[k])!;
    const b = yi.get(ys[k])!;
    table[a][b]++;
    rowTotals[a]++;
    colTotals[b]++;
  }
  let chi2 = 0;
  for (let a = 0; a < xLevels.length; a++) {
    for (let b = 0; b < yLevels.length; b++) {
      const expected = (rowTotals[a] * colTotals[b]) / n;
      if (expected > 0) chi2 += (table[a][b] - expected) ** 2 / expected;
    }
  }
  const phi2 = chi2 / n;
  const denom = Math.min(xLevels.length - 1, yLevels.length - 1);
  if (denom <= 0) return 0;
  return Math.sqrt(phi2 / denom);
}

export function entropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

export function mutualInformation(xs: (string | number)[], ys: (string | number)[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return 0;
  const xLevels = [...new Set(xs)];
  const yLevels = [...new Set(ys)];
  if (xLevels.length < 2 || yLevels.length < 2) return 0;
  const xi = new Map(xLevels.map((v, i) => [v, i]));
  const yi = new Map(yLevels.map((v, i) => [v, i]));
  const joint = new Map<number, number>();
  const xc = new Array(xLevels.length).fill(0);
  const yc = new Array(yLevels.length).fill(0);
  for (let k = 0; k < n; k++) {
    const a = xi.get(xs[k])!;
    const b = yi.get(ys[k])!;
    xc[a]++;
    yc[b]++;
    joint.set(a * yLevels.length + b, (joint.get(a * yLevels.length + b) ?? 0) + 1);
  }
  let mi = 0;
  for (const [key, c] of joint) {
    const a = Math.floor(key / yLevels.length);
    const b = key % yLevels.length;
    const p = c / n;
    mi += p * Math.log2(p / ((xc[a] / n) * (yc[b] / n)));
  }
  return mi;
}

export function normalizeMI(mi: number, xs: (string | number)[], ys: (string | number)[]): number {
  const hx = entropy(Object.values(countBy(xs)).map(Number));
  const hy = entropy(Object.values(countBy(ys)).map(Number));
  const denom = Math.min(hx, hy);
  if (denom <= 0) return 0;
  return clamp(mi / denom);
}

export function countBy(values: (string | number)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) {
    const k = String(v);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function binomialAuc(scores: number[], labels: number[]): number {
  return auc(scores, labels);
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function round(x: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

export function fmt(x: number, digits = 3): string {
  return Number.isFinite(x) ? x.toFixed(digits) : "n/a";
}

export function fmtPct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}
