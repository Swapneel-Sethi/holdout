# Holdout

Dataset leakage audit. Built by Swapneel Sethi.

**Track: Open Innovation**

Your leaderboard score is lying. Holdout audits a dataset before you spend a night modelling it. It finds the leaked column, reproduces the evidence, and measures how many points of your score will not survive a real deployment.

## Live

- **App:** https://holdout-taupe-iota.vercel.app
- **Repo:** https://github.com/Swapneel-Sethi/holdout
- **Benchmark:** https://holdout-taupe-iota.vercel.app/benchmark
- **Method:** https://holdout-taupe-iota.vercel.app/method

## What it does

Holdout runs eight deterministic leakage detectors on a CSV you drop into the browser:

| Detector | What it catches |
|---|---|
| Target proxy | A feature that separates the label almost perfectly (AUC 0.95+ or Cramer's V 0.95+) |
| Row identifier | A key-like column with one value per row |
| Post outcome field | A column name that reads like it was written after the outcome, plus signal |
| Duplicate rows | Identical feature rows that can land on both sides of a split |
| Entity overlap | The same entity appearing across rows (group leakage) |
| Temporal drift | Time predicting the label (AUC 0.62+) |
| Zero variance | A column with a single distinct value |
| Class imbalance | Minority class below 6% of labelled rows |

Then it quantifies the damage: a regularised linear model scores every feature, then the same model scores what remains after the flagged columns are removed. The gap is the inflation - how much of your reported score is fiction.

Every finding is recomputed by an independent verifier before it reaches the screen. Claims that can't be reproduced are dropped.

## Stack

Next.js 16, React 19, Tailwind 4, TypeScript, App Router. Zero server components for the audit - it runs entirely in the browser. Your CSV never leaves the tab.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Audit engine tests |
| `npm run benchmark` | Regenerate synthetic benchmark (writes data/benchmark.json) |
| `npm run cases` | Regenerate demo CSV cases |

## Project structure

```
app/               Next.js App Router pages
components/        React components (nav, footer, ui, workspace)
lib/audit/         Deterministic audit engine (csv, stats, profile, detectors, model, engine, verify)
lib/cases.ts       Demo case definitions and detector docs
scripts/           Case generation, benchmark, headline, tests
data/              Bundled demo CSVs and benchmark results
public/cases/      Demo CSVs served to the browser
```

## Data Sprint 2.0 submission

This project was built for the Open Innovation track of Data Sprint 2.0. See `docs/` for:

- `docs/track-selection.md` - weighted scoring across Agentic AI, CV, NLP, Open Innovation
- `docs/problem-statement.md` - extracted official problem statement
- `docs/architecture.md` - system design
- `docs/evaluation.md` - benchmark methodology and results
- `docs/demo-script.md` - 2-5 minute demo video script
- `docs/submission-checklist.md` - pre-submission verification
- `docs/open-innovation-submission.md` - form-ready answers for the Google Form

## Kaggle status

Kaggle tracks (Agentic AI, Computer Vision, NLP) require authentication. No Kaggle credentials are available in this environment, and the competition API returns 401 Unauthenticated. Open Innovation was selected because it is fully accessible via public Google Form and supports an end-to-end deployable product.

**The only manual steps remaining for submission are:** record a 2-5 minute demo video (host it, e.g., on YouTube or as a raw GitHub link), sign into Google, and submit the Open Innovation form. All other deliverables - repo, deployed URL, benchmark, docs - are complete.
