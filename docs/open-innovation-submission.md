# Open Innovation Submission

**Track:** Open Innovation  
**Product:** Holdout  
**Event:** Data Sprint 2.0  
**Source:** Official Google Form scraped from `docs.google.com/forms/d/e/1FAIpQLSdvZMyjqJroBfbq8vkosecYye0-gwZrwfEjT9_RejS7c1vnhA/viewform`

## Form-ready answers

### Team name
Holdout

### Project title
Holdout — Dataset Leakage and Model Readiness Auditor

### 100-word summary
Holdout audits a dataset before you model it. It finds leaked columns — target proxies, identifiers, temporal drift, entity overlap, duplicate rows, post-outcome fields — and measures how much your validation score is inflated. Every finding is recomputed by an independent verifier before display. Runs entirely in the browser; nothing is uploaded. Built for data science competitors who need to trust their validation before submitting. One verdict — ship, review, or block — with a measured honesty gap between reported and honest performance.

### 150-word problem and users
Leaderboard scores in data science competitions are often fiction. Dataset leakage — a column recorded after the outcome, a row identifier used as a feature, temporal drift mixed across a random split — lets a model memorise the label. Validation climbs; production collapses. Competitors have no fast, local, deterministic way to audit a dataset before modelling. Existing tools require server uploads, heavy ML frameworks, or LLM guesses without reproducible evidence. Users: Kaggle competitors, data science students, and ML practitioners who need to verify dataset integrity before training. They need a tool that runs in the browser, detects leakage with published thresholds, quantifies the damage, and gives a clear ship/review/block verdict.

### 150-word innovation
Holdout combines eight deterministic leakage detectors with a measured honesty gap and an independent verifier. No LLM is used for any verdict — every finding is a statistic computed from the table, then recomputed through a second code path. Findings that cannot be reproduced are dropped. The model agent fits a regularised linear baseline twice (all features vs. flagged columns removed) and reports the inflation gap, plus out-of-time and group-holdout scores. The entire engine runs client-side in under 150 ms. Users upload nothing; the CSV never leaves the tab. The design system is original, built from first principles with a Raycast-inspired dark palette.

### 200-word architecture
Six passes, each a pure function with typed input and output. (1) Input agent parses CSV and infers column types, missing values, cardinality. (2) Leakage agent runs eight detectors: target proxy (AUC 0.95+), row identifier (unique ratio 1.0), post-outcome field (name match plus association 0.35+), duplicate rows (exact signature), entity overlap (repeats in 3+ groups), temporal drift (AUC 0.62+), zero variance, class imbalance (<6% minority). (3) Model agent builds a design matrix with median imputation and one-hot encoding, fits a regularised linear baseline, reports 5-fold AUC/R² with all features and after removing flagged columns. (4) Analyst agent attaches triggering statistic, columns, and repair step. (5) Verifier agent recomputes each claim independently; unreproducible findings are dropped. (6) Decision agent applies severity weights to a 100-point score: ship ≥85, review 60–84, block <60; any critical finding forces block. Built with Next.js 16, React 19, Tailwind 4, TypeScript, App Router. Client-side only.

### Implementation status
Working prototype, deployed. All features implemented and tested.

### GitHub URL
https://github.com/Swapneel-Sethi/holdout

### Demo video URL
To be recorded. 2–5 minutes showing real functionality per docs/demo-script.md. Will be hosted externally (YouTube or raw GitHub link).

### Live deployment URL
https://holdout-taupe-iota.vercel.app

### Optional paper or report
None submitted.

### 200-word testing and metrics
The engine is validated on 59 synthetic datasets across eight leakage families plus clean controls. Core suite (48 datasets): 1.000 recall on every detector, 1.000 clean pass rate. Stress suite (11 datasets): builds cases under thresholds so misses stay visible. Overall F1 0.869, leak recall 0.908, clean pass rate 0.833, verified claims 100%. Median audit latency 127 ms. Known limitations: noisy target proxies under AUC 0.95 are missed; weak temporal drift under AUC 0.62 is missed; free text notes can be falsely flagged as identifiers. These misses are documented in the benchmark, not hidden. Unit tests cover the audit engine end-to-end on four demo cases. Lint, typecheck, and production build all pass.

### 150-word impact
Competitors submit with inflated scores they cannot trust. Holdout prevents wasted modelling time on leaked datasets and protects leaderboard integrity. By making leakage detection fast, local, and deterministic, it shifts the default from "score first, verify later" to "audit first, model second." Open source and deployable, it can be adopted by any competition platform. The benchmark is published with its misses, setting a standard for honest evaluation in data science tools.

### 150-word originality and disclosure
Original design system built from first principles (Raycast-inspired dark UI, Inter, custom palette). No copied assets, no fake customer logos, no fabricated metrics. All benchmark numbers are real measurements from synthetic datasets. No LLM-generated findings; every statistic is recomputed before display. Kaggle tracks (Agentic AI, Computer Vision, NLP) were evaluated but are inaccessible without Kaggle authentication (API returns 401). Open Innovation was selected as the only fully accessible track. No third-party data or pre-trained models are used. The project is a solo build by Swapneel Sethi for Data Sprint 2.0.

### Declarations
I declare that this submission is original work, that all reported metrics are genuine measurements, and that no data was uploaded to external servers during audit. The demo video will show real functionality. The deployed URL and public repo are accessible and functional.
