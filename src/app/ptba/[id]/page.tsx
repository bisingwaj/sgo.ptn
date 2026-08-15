import type { Metadata } from "next";
import { PtbaActivityClient } from "./PtbaActivityClient";

export const metadata: Metadata = {
  title: "Activité PTBA · PTN-RDC",
  description:
    "Fiche d'une activité du plan annuel : contenu, enveloppe et marchés qui s'y rattachent.",
};

export default async function ActivitePtbaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PtbaActivityClient activityId={id} />;
}
