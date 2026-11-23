import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/workspace";

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Audit a table for target proxies, identifiers, temporal drift and entity leakage, then see how much validation score does not survive.",
};

export default function WorkspacePage() {
  return <Workspace />;
}
