"use client";

import { useOrganisation } from "./OrganisationContext";

interface OrgEyebrowProps {
  /** Suffixe collé après le sigle (ex. "PARTENAIRE INSTITUTIONNEL") */
  suffix?: string;
}

export function OrgEyebrow({ suffix }: OrgEyebrowProps) {
  const { org } = useOrganisation();
  return (
    <>
      {org.sigle.toUpperCase()}
      {suffix ? ` · ${suffix}` : ""}
    </>
  );
}

export function OrgName() {
  const { org } = useOrganisation();
  return <>{org.fullName}</>;
}

export function OrgShort() {
  const { org } = useOrganisation();
  return <>{org.sigle}</>;
}
