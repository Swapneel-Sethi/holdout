# Problem Statement

**Track:** Open Innovation  
**Event:** Data Sprint 2.0  
**Organizer:** Anveshan, The National Institute of Engineering, Mysuru  
**Source:** Official Linktree hub `https://linktr.ee/anveshan_nie`

## The problem

Data science competitors report leaderboard scores that do not survive contact with real data. The root cause is dataset leakage: a column recorded after the outcome, a row identifier used as a feature, temporal drift mixed across a random split, entity overlap, duplicate rows, or a post-outcome field. The model memorises the leak, validation climbs, and production collapses.

Competitors have no fast, local, deterministic way to audit a dataset before they model it. Existing tools either require uploading data to a server, depend on a large ML framework, or give an LLM-generated guess with no reproducible evidence.

## What a solution must do

- Run entirely in the browser; no file upload, no server-side data processing
- Detect target proxies, identifiers, temporal drift, entity overlap, duplicate rows, post-outcome fields, zero-variance columns, and class imbalance
- Measure how much the reported validation score is inflated by the leak
- Reproduce every finding through an independent code path before display
- Produce one verdict (ship / review / block) with a 0–100 readiness score
- Work on demo data out of the box and on user-uploaded CSVs

## Why Open Innovation

The Kaggle tracks (Agentic AI, Computer Vision, NLP) require Kaggle authentication. No Kaggle credentials exist in this environment; the Kaggle API returns `401 Unauthenticated`. The CV competition data is 2.81 GB and requires GPU training. Agentic and NLP competition slugs could not be resolved; their Linktree links redirect to Kaggle login. Open Innovation is fully accessible via a public Google Form and supports an end-to-end deployable product.

## Deliverables

- Working deployed URL
- Public GitHub repository
- 2–5 minute demo video showing real functionality
- Metrics with evidence
- Documentation: README, problem statement, track selection, architecture, evaluation, demo script, submission checklist, Open Innovation form answers
