# Track Selection

**Event:** Data Sprint 2.0  
**Organizer:** Anveshan, The National Institute of Engineering, Mysuru  
**Decision:** Open Innovation  
**Date:** 2026-11-23

## Scoring matrix

Criteria weighted by realism of placing first within the competition window.

| Criterion | Weight | Agentic AI | Computer Vision | NLP | Open Innovation |
|---|---|---|---|---|---|
| Accessible without Kaggle login | 25% | 0 | 3 | 0 | 5 |
| Data size / compute feasible | 20% | 2 | 1 | 2 | 5 |
| End-to-end deployable product | 20% | 2 | 2 | 2 | 5 |
| Official problem statement readable | 15% | 0 | 4 | 0 | 5 |
| Submission window open | 10% | 1 | 3 | 1 | 5 |
| Demo video feasible autonomously | 10% | 1 | 1 | 1 | 3 |
| **Weighted total** | **100%** | **1.05** | **2.15** | **0.90** | **4.70** |

Scale: 0–5 per criterion. Weighted total = sum(score × weight).

## Rejection reasons

### Agentic AI

- Competition slug could not be resolved; all guessed slugs returned 404
- Linktree `/t/` links redirect to Kaggle login
- Kaggle API returns `401 Unauthenticated` — no credentials available
- No official problem statement extractable without login

### Computer Vision

- Competition page is public: `datasprint-2-road-damage-detection`
- But data requires accepting rules and Kaggle login; no credentials
- Dataset is 2.81 GB
- No CUDA available (only Intel Arc 130V iGPU; torch not installed)
- Competition window: 23–25 Nov 2026; 3 days remaining at decision time
- Top 10 must submit a public repo with pinned commit and 2-page write-up; rerun must reproduce within 2 points in 30 minutes — infeasible without GPU

### NLP

- Competition slug could not be resolved; all guessed slugs returned 404
- Linktree `/t/` links redirect to Kaggle login
- Kaggle API returns `401 Unauthenticated` — no credentials available
- No official problem statement extractable without login

### Open Innovation (chosen)

- Fully accessible via public Google Form (`docs.google.com/forms/d/e/1FAIpQLSdvZMyjqJroBfbq8vkosecYye0-gwZrwfEjT9_RejS7c1vnhA/viewform`)
- Form fields scraped and documented
- Allows an end-to-end deployable product with public repo and live URL
- Demo video required (2–5 min) — can be recorded and hosted externally
- Top 15 present; one winner, no 2nd or 3rd place
- Required deliverables match what Holdout provides: working deployed URL, public repo, real functionality, metrics with evidence

## Strategy

Build Holdout — a dataset leakage and model readiness auditor. Positioning: "Your leaderboard score is lying." The product detects leakage, measures validation score inflation, and recomputes every finding through an independent verifier. Target audience: data science competitors who need to trust their validation before submitting.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Kaggle auth unavailable for CV track | High | High | Chose Open Innovation instead |
| Demo video cannot be produced autonomously | Medium | Medium | Record via Playwright, host as raw GitHub link or YouTube |
| Google Form sign-in required for submission | High | High | Document all form answers; manual submission is the only unavoidable step |
| Engine misses a leak type | Low | Medium | Published thresholds; stress suite documents known limits |

## Fallback

If Open Innovation submission is blocked, the repository and deployed URL stand as a complete product. The Kaggle tracks remain inaccessible without credentials, so no pivot is possible within the window.
