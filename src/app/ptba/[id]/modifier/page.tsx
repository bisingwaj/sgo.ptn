import type { Metadata } from "next";
import { PtbaCreationClient } from "../../nouveau/PtbaCreationClient";

export const metadata: Metadata = {
  title: "Modifier une activité · PTBA · PTN-RDC",
};

export default async function ModifierActivitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PtbaCreationClient activityId={id} />;
}
