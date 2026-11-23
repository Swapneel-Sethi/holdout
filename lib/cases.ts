import type { LeakType } from "./audit/types";

export interface DemoCase {
  id: string;
  file: string;
  title: string;
  blurb: string;
  target: string;
  timeColumn: string | null;
  entityColumn: string | null;
  expectation: "Blocks" | "Review" | "Clean";
  rows: number;
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: "retail_churn",
    file: "retail_churn.csv",
    title: "Retail churn",
    blurb: "A cancellation reason recorded after the customer left.",
    target: "churned",
    timeColumn: "signup_date",
    entityColumn: "customer_id",
    expectation: "Blocks",
    rows: 540,
  },
  {
    id: "card_fraud",
    file: "card_fraud.csv",
    title: "Card fraud",
    blurb: "Fraud rate climbs across the year. Random splits hide it.",
    target: "chargeback",
    timeColumn: "txn_date",
    entityColumn: "txn_id",
    expectation: "Review",
    rows: 660,
  },
  {
    id: "building_energy",
    file: "building_energy.csv",
    title: "Building energy",
    blurb: "A billing column that is a copy of the target.",
    target: "energy_kwh",
    timeColumn: "read_date",
    entityColumn: "building_id",
    expectation: "Blocks",
    rows: 720,
  },
  {
    id: "support_ops",
    file: "support_ops.csv",
    title: "Support escalations",
    blurb: "A clean control. The audit should let it through.",
    target: "escalated",
    timeColumn: null,
    entityColumn: null,
    expectation: "Clean",
    rows: 560,
  },
];

export const DETECTOR_DOCS: { type: LeakType; name: string; signal: string; limit: string }[] = [
  {
    type: "target_proxy",
    name: "Target proxy",
    signal: "A feature separates the label at AUC 0.95 or above, or at Cramer's V 0.95 or above.",
    limit: "A proxy with heavy label noise stays under the threshold.",
  },
  {
    type: "identifier",
    name: "Row identifier",
    signal: "A key like column, or a short unique string column, has one distinct value per row.",
    limit: "Free text notes can look like identifiers.",
  },
  {
    type: "temporal",
    name: "Temporal drift",
    signal: "Time predicts the label at AUC 0.62 or above, so a random split mixes past and future.",
    limit: "Weak drift under 0.62 is not flagged.",
  },
  {
    type: "group_entity",
    name: "Entity overlap",
    signal: "An entity appears in three or more entity groups, so random rows leak the same entity across the split.",
    limit: "Two row entities do not trigger the check.",
  },
  {
    type: "duplicate_rows",
    name: "Duplicate rows",
    signal: "Identical feature rows exist. Conflicting labels are counted separately.",
    limit: "Near copies with small numeric differences are not matched.",
  },
  {
    type: "name_signal",
    name: "Post outcome field",
    signal: "A column name reads like a post event field and the column carries association 0.35 or above.",
    limit: "Names are a hint, never the only evidence.",
  },
  {
    type: "imbalance",
    name: "Rare class",
    signal: "The minority class is below six percent of labelled rows.",
    limit: "Multiclass targets are not scored for imbalance.",
  },
  {
    type: "constant",
    name: "Zero variance",
    signal: "A column has a single distinct value.",
    limit: "Rare but non constant columns are not flagged.",
  },
];

export const VERDICT_COPY: Record<string, { tone: string; text: string }> = {
  block: { tone: "red", text: "Do not trust this score yet." },
  review: { tone: "amber", text: "Change the split before you model." },
  ship: { tone: "green", text: "The setup survived the audit." },
};
