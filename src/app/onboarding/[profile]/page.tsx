import { notFound } from "next/navigation";
import { PROFILES, type ProfileKey } from "@/lib/profiles";
import { OnboardingClient } from "./OnboardingClient";

interface PageProps {
  params: Promise<{ profile: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { profile } = await params;
  const config = PROFILES[profile as ProfileKey];
  if (!config) return { title: "Onboarding · PTN-RDC" };
  return {
    title: `Onboarding ${config.short} · PTN-RDC`,
    description: `Configuration initiale du profil ${config.label} pour la plateforme PTN-RDC.`,
  };
}

export default async function OnboardingPage({ params }: PageProps) {
  const { profile } = await params;
  if (!(profile in PROFILES)) {
    notFound();
  }
  return <OnboardingClient profile={profile as ProfileKey} />;
}
