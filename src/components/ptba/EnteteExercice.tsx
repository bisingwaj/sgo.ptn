"use client";

/**
 * L'en-tête d'un exercice budgétaire — le même sur ses deux sections.
 *
 * POURQUOI IL EXISTE. « PTBA 2027 » et « Exercice 2027 » désignent le MÊME
 * objet : le plan EST le contenu de l'exercice. L'interface en faisait
 * pourtant deux destinations voisines, reliées par des boutons qui ne
 * disaient pas où ils menaient — « Exercices », « Allocations 2027 », « Le
 * registre » — soit quatre noms pour deux choses. On ne pouvait pas
 * deviner que le registre et les allocations parlaient de la même année.
 *
 * CE QUE CET EN-TÊTE POSE. L'exercice est le contenant, et il a exactement
 * DEUX sections :
 *
 *   Allocations — ce que chaque composante peut engager
 *   Plan        — ce qu'on a décidé d'en faire
 *
 * Les deux sont montrées côte à côte, chacune avec son contenu chiffré, et
 * celle où l'on se trouve est marquée. La relation ne se déduit plus : elle
 * se lit, et se parcourt d'un clic dont l'intitulé annonce l'arrivée.
 *
 * Le sélecteur d'exercice garde la section : changer d'année depuis les
 * allocations mène aux allocations de l'autre année, pas ailleurs.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropdown, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import type { PtbaAllocationRowApi, PtbaYearApi } from "@/lib/api";
import { formatUsdCompact } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Ce qu'un état veut dire pour qui lit, et non pour la base. */
export const ETAT: Record<
  PtbaYearApi["status"],
  { label: string; tone: "gray" | "green" | "cool-gray"; sens: string }
> = {
  BROUILLON: {
    label: "En préparation",
    tone: "gray",
    sens: "Le plan se construit. Il n’est pas encore opposable.",
  },
  VALIDE: {
    label: "Validé — opposable",
    tone: "green",
    sens: "Le plan est arrêté et opposable devant le bailleur.",
  },
  CLOS: {
    label: "Clos",
    tone: "cool-gray",
    sens: "L’exercice est terminé. Plus rien ne s’y inscrit.",
  },
};

export type SectionExercice = "allocations" | "plan";

/** Où vit chaque section. L'année y figure toujours : rien ne se devine. */
export function hrefSection(section: SectionExercice, annee: number): string {
  return section === "allocations" ? `/ptba/exercices/${annee}` : `/ptba?annee=${annee}`;
}

interface Props {
  annee: number;
  exercice: PtbaYearApi | null;
  exercices: PtbaYearApi[];
  allocations: PtbaAllocationRowApi[];
  nbActivites: number;
  section: SectionExercice;
  /** Chargement en cours : les compteurs ne disent encore rien. */
  chargement?: boolean;
  /** La commande propre à la section — inscrire une activité, arrêter le plan. */
  actions?: ReactNode;
}

export function EnteteExercice({
  annee,
  exercice,
  exercices,
  allocations,
  nbActivites,
  section,
  chargement = false,
  actions,
}: Props) {
  const router = useRouter();
  const etat = exercice ? ETAT[exercice.status] : null;

  const alloueTotal = allocations.reduce((s, r) => s + (r.allocationUsd ?? 0), 0);
  const engageTotal = allocations.reduce((s, r) => s + r.plannedUsd, 0);
  const sansAllocation = allocations.filter((r) => r.allocationUsd === null).length;

  const sections: Array<{
    cle: SectionExercice;
    titre: string;
    detail: string;
  }> = [
    {
      cle: "allocations",
      titre: "Allocations",
      detail: chargement
        ? "…"
        : allocations.length === 0
          ? "Cadrage indisponible"
          : alloueTotal === 0
            ? "Aucune allocation arrêtée"
            : `${formatUsdCompact(alloueTotal)} alloués${sansAllocation > 0 ? ` · ${sansAllocation} composante${sansAllocation > 1 ? "s" : ""} sans allocation` : ""}`,
    },
    {
      cle: "plan",
      titre: "Plan",
      detail: chargement
        ? "…"
        : nbActivites === 0
          ? "Aucune activité inscrite"
          : `${nbActivites} activité${nbActivites > 1 ? "s" : ""} · ${formatUsdCompact(engageTotal)} engagés`,
    },
  ];

  return (
    <header className="mb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-caption text-helper mb-1 tracking-wide uppercase">
            Programmation budgétaire
          </p>
          <h1 className="text-heading-04 text-primary font-light">Exercice {annee}</h1>
          {exercice?.label && (
            <p className="text-body text-secondary mt-1">{exercice.label}</p>
          )}
          {etat && (
            // `div` et non `p` : le Tag de Carbon rend un `div`, qu'un
            // paragraphe ne peut pas contenir — le navigateur referme le
            // `p` de lui-même et l'hydratation diverge.
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <Tag type={etat.tone} size="sm">
                {etat.label}
              </Tag>
              <span className="text-body-compact text-secondary">{etat.sens}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Le sélecteur reste dans la SECTION où l'on se trouve : changer
              d'année depuis les allocations mène aux allocations. */}
          {exercices.length > 1 && (
            <div className="w-44">
              <Dropdown
                id="entete-exercice-annee"
                titleText="Exercice"
                label="Exercice"
                size="md"
                items={exercices.map((e) => e.year)}
                selectedItem={annee}
                itemToString={(y) => `Exercice ${y}`}
                onChange={({ selectedItem }) => {
                  if (selectedItem && selectedItem !== annee) {
                    router.push(hrefSection(section, selectedItem));
                  }
                }}
              />
            </div>
          )}
          {actions}
        </div>
      </div>

      {/* Les deux sections de l'exercice, montrées ensemble. C'est ce qui
          remplace les boutons dont l'intitulé n'annonçait pas l'arrivée. */}
      <nav
        aria-label={`Sections de l’exercice ${annee}`}
        className="border-subtle flex flex-wrap border-b"
      >
        {sections.map((s) => {
          const courant = s.cle === section;
          return (
            <Link
              key={s.cle}
              href={hrefSection(s.cle, annee)}
              aria-current={courant ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-4 py-3 transition-colors",
                courant
                  ? "border-accent bg-layer"
                  : "hover:bg-layer-hover border-transparent",
              )}
            >
              <span
                className={cn(
                  "text-body-compact block font-medium",
                  courant ? "text-primary" : "text-secondary",
                )}
              >
                {s.titre}
              </span>
              <span className="text-caption text-helper mt-0.5 block">{s.detail}</span>
            </Link>
          );
        })}

        <Link
          href="/ptba/exercices"
          className="text-caption text-secondary hover:text-primary hover:bg-layer-hover ml-auto inline-flex items-center gap-1.5 px-4 py-3"
        >
          Tous les exercices
          <ArrowRight size={14} aria-hidden />
        </Link>
      </nav>
    </header>
  );
}
