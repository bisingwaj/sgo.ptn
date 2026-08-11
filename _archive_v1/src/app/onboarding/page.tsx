import type { Metadata } from "next";
import { OnboardingClient } from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Onboarding · PTN-RDC",
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
