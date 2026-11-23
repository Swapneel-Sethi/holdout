# Demo Script

**Product:** Holdout  
**Duration:** 2–5 minutes  
**Target:** Data Sprint 2.0 Open Innovation judges

## Script

**0:00–0:30 — Open**

"Your leaderboard score is lying. I'm going to show you why, using a retail churn dataset with 540 rows and 9 columns."

Open the workspace. The retail churn case loads automatically. The audit runs in under a second.

**0:30–1:00 — The verdict**

The screen shows: Block, score 79/100. One critical finding: `cancellation_reason` — a target proxy. It has a perfect association of 1.000 with the target. Every value is unique to one class. This column was recorded after the customer left.

**1:00–1:30 — The measured damage**

The model panel shows Reported AUC 1.000 with all features. Honest estimate 0.583 once the leaked column is removed. That's 42 points of inflation — the gap between a fake leaderboard win and reality.

**1:30–2:00 — Verification**

Every finding passes the verifier. 2 of 2 claims reproduced by a second code path. The finding isn't an LLM guess — it's a statistic computed from the table, then recomputed independently.

**2:00–2:30 — The other cases**

Switch to card fraud: Review, score 85. Temporal drift detected — fraud rate climbs across the year, and a random split mixes past and future.

Switch to building energy: Block, score 82. `billed_kwh` is a target proxy — it's a copy of the target column.

Switch to support escalations: Ship, score 93. A clean control with no material leakage.

**2:30–3:00 — Upload your own**

Upload a CSV. Choose the target. Get a verdict in under a second. The file stays in the tab — nothing is uploaded.

**3:00–4:00 — How it works (optional)**

Open the Method page. Eight detectors, deterministic thresholds, a measured honesty gap, and an independent verifier. The benchmark page shows 59 synthetic datasets with published stress cases — including the ones we miss.

## Demo data

All four bundled cases are labeled as demo data. No metrics are fabricated. The benchmark numbers come from running the same engine against generated tables with known plantings.

## What to show on camera

1. Workspace load with auto-run audit on retail churn
2. Block verdict with score 79
3. Model card: 1.000 reported vs 0.583 honest, 42 pts inflated
4. Finding detail: `cancellation_reason`, association 1.000, repair step
5. Verifier badge: 2/2 claims reproduced
6. Case switcher: card fraud (review), building energy (block), support ops (ship)
7. CSV upload flow
