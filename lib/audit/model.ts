import { column, isMissing, numericValue } from "./csv";
import { inferKind, targetLabels } from "./profile";
import { auc, mean, r2Score, std } from "./stats";
import type { Dataset, ModelRisk } from "./types";

export interface Matrix {
  X: number[][];
  y: number[];
  names: string[];
  ids: number[];
}

function impute(values: (number | null)[]): number[] {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return new Array(values.length).fill(0);
  const sorted = [...present].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return values.map((v) => (v === null ? median : v));
}

export function buildMatrix(
  dataset: Dataset,
  target: string,
  excluded: Set<string>,
  task: "classification" | "regression",
): Matrix | null {
  const targetValues = column(dataset, target);
  const y: number[] = [];
  const ids: number[] = [];

  if (task === "classification") {
    const { labels, classes } = targetLabels(dataset, target);
    if (classes.length !== 2) return null;
    labels.forEach((v, i) => {
      if (v !== null) {
        y.push(v);
        ids.push(i);
      }
    });
  } else {
    targetValues.forEach((v, i) => {
      if (isMissing(v)) return;
      const n = numericValue(v);
      if (n === null) return;
      y.push(n);
      ids.push(i);
    });
  }

  if (y.length < 40) return null;

  const columns: { name: string; values: (number | null)[] }[] = [];

  for (const name of dataset.columns) {
    if (name === target || excluded.has(name)) continue;
    const raw = column(dataset, name);
    const values = ids.map((i) => raw[i]);
    const kind = inferKind(values);

    if (kind === "numeric" || kind === "datetime" || kind === "boolean") {
      const nums = values.map((v) => {
        if (kind === "datetime") {
          if (typeof v !== "string") return null;
          const t = Date.parse(v);
          return Number.isFinite(t) ? t : null;
        }
        if (isMissing(v)) return null;
        return numericValue(v);
      });
      const filled = impute(nums);
      const s = std(filled);
      if (s > 0) columns.push({ name, values: filled });
      continue;
    }

    if (kind === "categorical") {
      const strings = values.map((v) => (isMissing(v) ? "__missing__" : String(v)));
      const levels = [...new Set(strings)];
      if (levels.length > 1 && levels.length <= 14) {
        for (const level of levels.slice(0, 14)) {
          const indicator = strings.map((v) => (v === level ? 1 : 0));
          if (std(indicator) > 0) {
            columns.push({ name: `${name}=${level}`, values: indicator });
          }
        }
      }
    }
  }

  if (columns.length === 0) return null;

  const X = ids.map((_, r) => columns.map((c) => c.values[r] ?? 0));

  return { X, y, names: columns.map((c) => c.name), ids };
}

function standardize(train: number[][], test: number[][]) {
  const d = train[0].length;
  const mu = new Array(d).fill(0);
  const sd = new Array(d).fill(1);
  for (let j = 0; j < d; j++) {
    const vals = train.map((r) => r[j]);
    mu[j] = mean(vals);
    sd[j] = std(vals) || 1;
  }
  const scale = (rows: number[][]) => rows.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
  return { train: scale(train), test: scale(test) };
}

function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

function fitLogistic(X: number[][], y: number[], l2 = 0.02, iters = 450, lr = 0.6) {
  const n = X.length;
  const d = X[0].length;
  const w = new Array(d + 1).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array(d + 1).fill(0);
    for (let i = 0; i < n; i++) {
      let z = w[d];
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const err = sigmoid(z) - y[i];
      for (let j = 0; j < d; j++) grad[j] += (err * X[i][j]) / n;
      grad[d] += err / n;
    }
    for (let j = 0; j < d; j++) w[j] -= lr * (grad[j] + l2 * w[j]);
    w[d] -= lr * grad[d];
  }
  return (row: number[]) => {
    let z = w[d];
    for (let j = 0; j < row.length; j++) z += w[j] * row[j];
    return sigmoid(z);
  };
}

function fitLinear(X: number[][], y: number[], l2 = 0.05, iters = 500, lr = 0.08) {
  const n = X.length;
  const d = X[0].length;
  const w = new Array(d + 1).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array(d + 1).fill(0);
    for (let i = 0; i < n; i++) {
      let pred = w[d];
      for (let j = 0; j < d; j++) pred += w[j] * X[i][j];
      const err = pred - y[i];
      for (let j = 0; j < d; j++) grad[j] += (err * X[i][j]) / n;
      grad[d] += err / n;
    }
    for (let j = 0; j < d; j++) w[j] -= lr * (grad[j] + l2 * w[j]);
    w[d] -= lr * grad[d];
  }
  return (row: number[]) => {
    let pred = w[d];
    for (let j = 0; j < row.length; j++) pred += w[j] * row[j];
    return pred;
  };
}

function shuffleIndices(n: number, seed: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function crossValidate(
  m: Matrix,
  task: "classification" | "regression",
  folds = 5,
): number | null {
  const n = m.y.length;
  if (n < folds * 10) return null;

  let groups: number[][];
  if (task === "classification") {
    const pos = shuffleIndices(n, 7).filter((i) => m.y[i] === 1);
    const neg = shuffleIndices(n, 11).filter((i) => m.y[i] === 0);
    if (pos.length < folds || neg.length < folds) return null;
    groups = Array.from({ length: folds }, () => []);
    pos.forEach((i, k) => groups[k % folds].push(i));
    neg.forEach((i, k) => groups[k % folds].push(i));
    groups = groups.map((g) => shuffleIndices(g.length, 13).map((k) => g[k]));
  } else {
    groups = Array.from({ length: folds }, () => []);
    shuffleIndices(n, 17).forEach((i, k) => groups[k % folds].push(i));
  }

  const preds = new Array<number>(n).fill(0);
  const seen = new Array<boolean>(n).fill(false);

  for (let f = 0; f < folds; f++) {
    const testIdx = groups[f];
    const testSet = new Set(testIdx);
    const trainIdx = Array.from({ length: n }, (_, i) => i).filter((i) => !testSet.has(i));
    if (trainIdx.length < 20 || testIdx.length === 0) continue;

    const { train, test } = standardize(
      trainIdx.map((i) => m.X[i]),
      testIdx.map((i) => m.X[i]),
    );
    const yTrain = trainIdx.map((i) => m.y[i]);
    const predict =
      task === "classification"
        ? fitLogistic(train, yTrain)
        : fitLinear(train, yTrain);
    testIdx.forEach((i, k) => {
      preds[i] = predict(test[k]);
      seen[i] = true;
    });
  }

  const idx = preds.map((_, i) => i).filter((i) => seen[i]);
  if (idx.length < n * 0.8) return null;
  const y = idx.map((i) => m.y[i]);
  const p = idx.map((i) => preds[i]);
  return task === "classification" ? auc(p, y) : r2Score(y, p);
}

function timeIndex(dataset: Dataset, timeColumn: string): (number | null)[] {
  return column(dataset, timeColumn).map((v) => {
    if (typeof v === "number") return v;
    if (typeof v !== "string") return null;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  });
}

export function timeHoldout(
  m: Matrix,
  dataset: Dataset,
  timeColumn: string,
  task: "classification" | "regression",
): number | null {
  const times = timeIndex(dataset, timeColumn);
  const rows = m.ids
    .map((id, i) => ({ id, i, t: times[id] }))
    .filter((r): r is { id: number; i: number; t: number } => r.t !== null)
    .sort((a, b) => a.t - b.t);
  if (rows.length < 80) return null;

  const cut = Math.floor(rows.length * 0.8);
  const trainRows = rows.slice(0, cut);
  const testRows = rows.slice(cut);
  if (testRows.length < 15) return null;

  const { train, test } = standardize(
    trainRows.map((r) => m.X[r.i]),
    testRows.map((r) => m.X[r.i]),
  );
  const yTrain = trainRows.map((r) => m.y[r.i]);
  const yTest = testRows.map((r) => m.y[r.i]);
  const predict = task === "regression" ? fitLinear(train, yTrain) : fitLogistic(train, yTrain);
  const pred = test.map(predict);
  return task === "regression" ? r2Score(yTest, pred) : auc(pred, yTest);
}

export function groupHoldout(
  m: Matrix,
  dataset: Dataset,
  entityColumn: string,
  task: "classification" | "regression",
): number | null {
  const values = column(dataset, entityColumn);
  const entities = m.ids.map((id) => String(values[id] ?? ""));
  const unique = [...new Set(entities)];
  if (unique.length < 5) return null;

  const shuffled = shuffleIndices(unique.length, 23);
  const testCount = Math.max(1, Math.floor(unique.length * 0.25));
  const testEntities = new Set(shuffled.slice(0, testCount).map((i) => unique[i]));

  const trainIdx: number[] = [];
  const testIdx: number[] = [];
  entities.forEach((e, i) => (testEntities.has(e) ? testIdx : trainIdx).push(i));
  if (trainIdx.length < 30 || testIdx.length < 10) return null;

  const { train, test } = standardize(
    trainIdx.map((i) => m.X[i]),
    testIdx.map((i) => m.X[i]),
  );
  const yTrain = trainIdx.map((i) => m.y[i]);
  const yTest = testIdx.map((i) => m.y[i]);
  const predict = task === "regression" ? fitLinear(train, yTrain) : fitLogistic(train, yTrain);
  const pred = test.map(predict);
  return task === "regression" ? r2Score(yTest, pred) : auc(pred, yTest);
}

export function measureModelRisk(
  dataset: Dataset,
  target: string,
  flagged: Set<string>,
  timeColumn: string | null,
  entityColumn: string | null,
): ModelRisk | null {
  const targetValues = column(dataset, target).filter((v) => !isMissing(v));
  const distinct = new Set(targetValues.map((v) => String(v))).size;
  const numericRatio =
    targetValues.filter((v) => numericValue(v) !== null).length / Math.max(1, targetValues.length);
  const task: "classification" | "regression" =
    distinct === 2 || (numericRatio < 0.9 && distinct <= 2) ? "classification" : "regression";

  const fullMatrix = buildMatrix(dataset, target, new Set([target]), task);
  if (!fullMatrix) return null;

  const full = crossValidate(fullMatrix, task);
  if (full === null) return null;

  const dropped = new Set([...flagged, target]);
  const cleanMatrix = buildMatrix(dataset, target, dropped, task);
  const clean = cleanMatrix ? crossValidate(cleanMatrix, task) : null;

  const temporal = cleanMatrix && timeColumn ? timeHoldout(cleanMatrix, dataset, timeColumn, task) : null;
  const grouped = cleanMatrix && entityColumn ? groupHoldout(cleanMatrix, dataset, entityColumn, task) : null;

  const honestCandidates = [clean, temporal, grouped].filter((v): v is number => v !== null);
  const honest = honestCandidates.length > 0 ? Math.min(...honestCandidates) : full;
  const inflation = Math.max(0, full - honest);

  return {
    metric: task === "classification" ? "auc" : "r2",
    task,
    rows: fullMatrix.y.length,
    folds: 5,
    features: fullMatrix.names.length,
    full,
    clean: clean ?? full,
    temporal,
    grouped,
    inflation,
    droppedColumns: [...flagged].filter((c) => c !== target),
  };
}
