# Architecture

**Product:** Holdout  
**Engine version:** 1.4.0  
**Stack:** Next.js 16, React 19, Tailwind 4, TypeScript, App Router

## Overview

Holdout is a client-side dataset leakage auditor. The entire audit engine runs in the browser. No file is uploaded. No server sees the data.

## High-level data flow

```
CSV file → parse → profile → detect → quantify → explain → verify → decide → verdict
```

Six passes, each a pure function with typed input and output:

1. **Input agent (profile)** — Parses CSV (RFC4180-ish), infers column type (numeric/datetime/categorical/boolean/text), records missing values, cardinality, unique ratio, quantiles, top values.
2. **Leakage agent (detect)** — Runs eight deterministic detectors against the declared target, time column, and entity column. No model, no prompt.
3. **Model agent (quantify)** — Builds a design matrix (median imputation, one-hot encoding), fits a regularised linear baseline with fixed seed, reports 5-fold AUC/R² with all features and after removing flagged columns. Also reports out-of-time and group-holdout scores where the schema supports them.
4. **Analyst agent (explain)** — Attaches the triggering statistic, affected columns, and one repair step to each finding.
5. **Verifier agent (verify)** — Recomputes each claim from the raw table through a separate code path. Findings that cannot be reproduced are dropped before display.
6. **Decision agent (decide)** — Applies severity weights to a 100-point readiness score. Maps to ship (≥85), review (60–84), or block (<60). Any critical finding forces block regardless of score.

## Core modules

| Module | Responsibility |
|---|---|
| `lib/audit/csv.ts` | RFC4180-ish CSV parse, column extraction, numeric/date coercion, CSV export |
| `lib/audit/stats.ts` | mean/std/quantile/pearson/ranks/spearman/auc/r²/KS/Cramér's V/entropy/MI/normalized MI/PRNG |
| `lib/audit/profile.ts` | Type inference, column profiling, target label encoding, binary/numeric target checks |
| `lib/audit/detectors.ts` | Eight leakage detectors plus association helper |
| `lib/audit/model.ts` | Design matrix, logistic/linear GD, stratified 5-fold CV, time holdout, group holdout, `measureModelRisk` |
| `lib/audit/engine.ts` | Orchestration, verdict, trace, `runAudit`, `auditSummaryLine` |
| `lib/audit/verify.ts` | Independent claim verification, `verifyFindings` |
| `lib/cases.ts` | Demo case definitions, detector docs, verdict copy |

## Detector thresholds

| Detector | Threshold | Known limit |
|---|---|---|
| Target proxy | AUC ≥ 0.95 (classification) \| \|r\| ≥ 0.93 (regression) | Heavy label noise stays under threshold |
| Row identifier | Unique ratio 1.0, distinct ≥ 30, ID-like name or short text | Free text notes can look like identifiers |
| Post outcome field | Name matches post-outcome list, association ≥ 0.35 | Names are a hint, never the only evidence |
| Duplicate rows | Exact feature signature match | Near copies with small numeric differences not matched |
| Entity overlap | Entity repeats in ≥ 3 groups | Two row entities do not trigger |
| Temporal drift | AUC ≥ 0.62 between time and target | Weak drift under 0.62 not flagged |
| Zero variance | Distinct count = 1 | Rare but non-constant columns not flagged |
| Class imbalance | Minority share < 6% | Multiclass targets not scored |

## Scoring

`score = clamp(100 - sum(weight / 2), 6, 100)`

Severity weights: target_proxy 26, identifier 16, duplicate_rows 14, temporal 14, group_entity 9, name_signal 8, imbalance 8, constant 3.

Any critical finding forces block regardless of score.

## Runtime

- Browser only; same TypeScript code in Node (scripts) and the browser (workspace)
- Deterministic: fixed PRNG seeds, same file same result
- Median run: ~127 ms on 59 synthetic datasets
- File size limit: 8 MB upload, 20,000 row cap

## Design system

Raycast-derived dark UI. Palette: `#070809` (bg), `#57C1FF` (blue), `#FF6161` (red), `#59D499` (green), `#F3B562` (amber). Inter font, JetBrains Mono for data. Rounded corners, gradient accents, no em/en dashes in copy.
