import { notFound } from "next/navigation";
import { INITIATIVES } from "@/lib/mock-initiatives";
import { InitiativeDetailClient } from "./InitiativeDetailClient";

interface PageProps {
  params: Promise<{ ref: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { ref } = await params;
  const init = INITIATIVES.find((i) => i.ref === ref);
  return {
    title: init ? `${init.title} · PTN-RDC` : "Initiative · PTN-RDC",
  };
}

export default async function InitiativeDetailPage({ params }: PageProps) {
  const { ref } = await params;
  const init = INITIATIVES.find((i) => i.ref === ref);
  if (!init) notFound();
  return <InitiativeDetailClient init={init} />;
}
