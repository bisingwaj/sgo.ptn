"use client";

/**
 * Panneau d'aide.
 *
 * Trois entrées seulement, et l'essentiel est la dernière : le glossaire.
 *
 * Cette plateforme est saturée de sigles — ANO, PPM, PTBA, TDR, DAO, MGP,
 * EAS/HS, SBP, PMPP, SFQC. Un agent qui prend ses fonctions n'en connaît
 * qu'une partie, et rien dans l'interface ne les explique aujourd'hui. Pour
 * un public dont la lisibilité est le premier critère, un glossaire
 * atteignable depuis n'importe quel écran vaut mieux qu'une aide générale.
 *
 * Les destinations n'existent pas encore : elles sont annoncées comme telles
 * plutôt que présentées comme actives.
 */

import Link from "next/link";
import { Book, Chat, Launch } from "@carbon/icons-react";

const ENTRIES = [
  {
    href: "/aide",
    icon: Book,
    label: "Centre d'assistance",
    hint: "Guides d'utilisation et procédures",
    ready: false,
  },
  {
    href: "/documentation",
    icon: Launch,
    label: "Documentation du projet",
    hint: "Manuel d'exécution, cadres de sauvegarde",
    ready: false,
  },
  {
    href: "/aide/glossaire",
    icon: Chat,
    label: "Glossaire des sigles",
    hint: "ANO, PPM, PTBA, TDR, DAO, MGP, EAS/HS…",
    ready: false,
  },
];

export function HelpPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="border-subtle border-b px-4 py-3">
        <h2 className="text-heading-01 text-primary">Aide et ressources</h2>
      </div>

      <ul className="flex flex-col py-1">
        {ENTRIES.map((e) => {
          const Icon = e.icon;
          return (
            <li key={e.href}>
              <Link
                href={e.href}
                onClick={onNavigate}
                className="hover:bg-layer-hover focus-visible:outline-accent flex items-start gap-3 px-4 py-2.5 focus-visible:outline-2"
              >
                <Icon size={16} aria-hidden className="text-secondary mt-0.5 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-body text-primary flex items-center gap-2">
                    {e.label}
                    {!e.ready && (
                      <span className="text-caption text-helper border-subtle border px-1">
                        bientôt
                      </span>
                    )}
                  </span>
                  <span className="text-caption text-secondary">{e.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-subtle text-caption text-secondary border-t px-4 py-3">
        Assistance UGPTN ·{" "}
        <a
          href="mailto:support@ptn-rdc.gov.cd"
          className="text-accent underline-offset-4 hover:underline"
        >
          support@ptn-rdc.gov.cd
        </a>
      </div>
    </div>
  );
}
