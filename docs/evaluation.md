# Evaluation

**Engine version:** 1.4.0  
**Generated:** 2026-11-23  
**Method:** Synthetic dataset benchmark, run via `npm run benchmark`

## Results

| Metric | Value |
|---|---|
| Overall F1 | 0.869 |
| Leak recall | 0.908 |
| Clean pass rate | 0.833 |
| Verified claims | 100% |
| Median latency | 127 ms |
| Datasets | 59 |

## Per detector

| Detector | Detected / Cases | Recall |
|---|---|---|
| Target proxy | 6/8 | 0.750 |
| Identifier | 6/6 | 1.000 |
| Temporal drift | 6/8 | 0.750 |
| Entity overlap | 6/7 | 0.857 |
| Duplicate rows | 6/6 | 1.000 |
| Class imbalance | 6/6 | 1.000 |
| Post outcome field | 6/6 | 1.000 |
| Clean control | 10/12 | 0.833 |

## Core suite (48 datasets)

One family per table, planted cleanly. All detectors achieve 1.000 recall; all clean tables pass.

## Stress suite (11 datasets)

Built to sit under thresholds so misses stay visible instead of being tuned away.

| Table | Planted | Engine result |
|---|---|---|
| stress_proxy_noisy_0 | target_proxy | Noisy signal under AUC 0.95 |
| stress_proxy_noisy_1 | target_proxy | Noisy signal under AUC 0.95 |
| stress_temporal_weak_0 | temporal | Weak drift under AUC 0.62 |
| stress_temporal_weak_1 | temporal | Weak drift under AUC 0.62 |
| stress_group_sparse | group_entity | Detected as duplicate_rows (structural near-match) |
| stress_clean_text_0 | clean | Free text note flagged as identifier (false positive) |
| stress_clean_text_1 | clean | Free text note flagged as identifier (false positive) |
| stress_clean_strong | clean | Passes |

## Methodology notes

- All 59 datasets are synthetic, generated from seeded PRNGs. Numbers are stable across machines.
- Recall is family-level: a detector scoring one means the family was raised, not that the exact column ranking matched the planting.
- The clean pass rate counts tables with no critical or high finding. Two clean tables have a medium finding (free text notes mistaken for identifiers).
- The inflation estimate is a lower bound: the honest model is a regularised linear baseline. A stronger learner usually widens the gap.
- This benchmark does not prove real-world performance. Label noise, sampling drift, annotation policy, and subgroup fairness are outside scope.

## How to regenerate

```bash
npm run benchmark
```

Writes `data/benchmark.json`. The benchmark page reads it at build time.
