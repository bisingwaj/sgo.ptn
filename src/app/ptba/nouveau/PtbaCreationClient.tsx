"use client";

/**
 * Inscription d'une activité au plan.
 *
 * Sa propre route, comme la rédaction d'un TDR. Le panneau qui s'ouvrait
 * au-dessus du tableau n'avait ni URL ni reprise : vingt lignes
 * d'objectifs saisies, un clic sur « Annuler », et tout était perdu sans
 * qu'aucun retour arrière ne le rattrape.
 *
 * Sert aussi la modification : le formulaire ne change pas, seuls le
 * chargement initial et le verbe diffèrent.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, InlineNotification, Loading } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import {
  ActivityForm,
  ACTIVITY_FORM_VIDE,
  activityFormComplet,
  activityFormPayload,
  type ActivityFormState,
} from "@/components/ptba/ActivityForm";
import { usePtbaExercice, useProvinces } from "@/components/ptba/use-ptba-exercice";
import { ptbaApi, ApiError, type PtbaActivityApi } from "@/lib/api";

/** Une activité chargée depuis l'API redevient un état de formulaire. */
function hydrate(a: PtbaActivityApi): ActivityFormState {
  return {
    code: a.code,
    title: a.title,
    componentCode: a.componentCode,
    subComponent: a.subComponent ?? "",
    envelopeUsd: String(Number(a.envelopeUsd)),
    idaUsd: a.idaUsd ? String(Number(a.idaUsd)) : "",
    afdUsd: a.afdUsd ? String(Number(a.afdUsd)) : "",
    provinceCodes: (a.provinces ?? []).map((c) => c.province.code),
    objectives: (a.objectives ?? []).map((o) => ({ title: o.title, criteria: o.criteria ?? "" })),
    deliverables: (a.deliverables ?? []).map((d) => ({
      title: d.title,
      format: d.format ?? "",
      deadline: d.deadline ?? "",
    })),
    indicators: (a.indicators ?? []).map((n) => ({
      label: n.label,
      measure: n.measure ?? "",
      target: n.target ?? "",
    })),
    risks: (a.risks ?? []).map((r) => ({
      label: r.label,
      description: r.description ?? "",
      mitigation: r.mitigation ?? "",
      level: r.level ?? "",
    })),
    clauses: (a.clauses ?? []).map((c) => ({ label: c.label, text: c.text ?? "" })),
  };
}

interface Props {
  /** Renseigné en modification. */
  activityId?: string;
}

export function PtbaCreationClient({ activityId }: Props) {
  const router = useRouter();
  const { can, loading: authLoading } = useAuth();
  const modification = Boolean(activityId);

  const { year, allocations, chargement, avertissement } = usePtbaExercice();
  const provinces = useProvinces();

  const [form, setForm] = useState<ActivityFormState>(ACTIVITY_FORM_VIDE);
  const [origine, setOrigine] = useState<string | undefined>(undefined);
  const [reprise, setReprise] = useState(modification);
  const [repriseError, setRepriseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  // Reprise d'une activité existante. Le service refuse déjà l'écriture sur
  // un exercice validé ; l'écran ne fait que l'annoncer plus tôt.
  useEffect(() => {
    if (!activityId || authLoading) return;
    let annule = false;

    void (async () => {
      try {
        const a = await ptbaApi.activity(activityId);
        if (annule) return;
        setForm(hydrate(a));
        setOrigine(a.componentCode);
      } catch (e) {
        if (!annule) {
          setRepriseError(e instanceof Error ? e.message : "Activité introuvable.");
        }
      } finally {
        if (!annule) setReprise(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, [activityId, authLoading]);

  const peutEcrire = can("ptba:write");
  const editable = year?.status === "BROUILLON";
  const complet = activityFormComplet(form);

  const soumettre = async () => {
    if (!year) return;
    setEnregistrement(true);
    setError(null);
    try {
      const payload = activityFormPayload(form);
      const enregistre = activityId
        ? await ptbaApi.updateActivity(activityId, payload)
        : await ptbaApi.createActivity(year.year, payload);
      router.push(`/ptba/${enregistre.id}`);
    } catch (e) {
      setError(
        e instanceof ApiError || e instanceof Error ? e.message : "Enregistrement impossible.",
      );
      setEnregistrement(false);
    }
  };

  const crumbs = [
    { label: "Cockpit UGP", href: "/cockpit" },
    { label: "PTBA", href: "/ptba" },
    { label: modification ? "Modifier" : "Nouvelle activité" },
  ];

  if (!authLoading && !peutEcrire) {
    return (
      <Shell crumbs={crumbs}>
        <PageHeader eyebrow="UGP · PTBA" title="Inscription au plan" />
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Lecture seule"
          subtitle="Votre habilitation ne permet pas d’écrire au plan annuel. La consultation reste ouverte."
          className="max-w-none"
        />
      </Shell>
    );
  }

  return (
    <Shell crumbs={crumbs}>
      <PageHeader
        eyebrow={`UGP · PTBA ${year?.year ?? ""}`}
        title={modification ? `Modifier ${form.code || "l’activité"}` : "Inscrire une activité au plan"}
        subtitle={
          modification
            ? "Les listes sont remplacées en bloc : ce que l’écran affiche est ce qui sera enregistré."
            : "Une ligne du plan ouvre une enveloppe. Elle devient aussitôt un rattachement possible pour un TDR."
        }
        actions={
          <Button as={Link} href="/ptba" kind="ghost" renderIcon={ArrowLeft} size="md">
            Retour au registre
          </Button>
        }
      />

      {repriseError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Reprise impossible"
          subtitle={repriseError}
          className="mb-6 max-w-none"
        />
      )}

      {avertissement && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Cadrage budgétaire indisponible"
          subtitle={avertissement}
          className="mb-6 max-w-none"
        />
      )}

      {!chargement && year && !editable && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={`L’exercice ${year.year} n’est plus ouvert à l’écriture`}
          subtitle="Un plan validé est opposable : il ne se modifie plus. Une correction suppose une révision de l’exercice."
          className="mb-6 max-w-none"
        />
      )}

      {chargement || reprise ? (
        <div className="flex items-center gap-3 py-12">
          <Loading small withOverlay={false} />
          <span className="text-body text-secondary">
            {reprise ? "Reprise de l’activité…" : "Chargement de l’exercice…"}
          </span>
        </div>
      ) : (
        <>
          <ActivityForm
            value={form}
            onChange={setForm}
            allocations={allocations}
            provinces={provinces}
            error={error}
            componentCodeInitial={origine}
          />

          <div className="border-subtle mt-8 flex flex-wrap items-center justify-end gap-3 border-t pt-6">
            <Button as={Link} href="/ptba" kind="secondary">
              Annuler
            </Button>
            <Button
              renderIcon={Save}
              disabled={!complet || enregistrement || !editable}
              onClick={() => void soumettre()}
            >
              {enregistrement
                ? "Enregistrement…"
                : modification
                  ? "Enregistrer les modifications"
                  : "Inscrire au plan"}
            </Button>
          </div>
        </>
      )}
    </Shell>
  );
}
