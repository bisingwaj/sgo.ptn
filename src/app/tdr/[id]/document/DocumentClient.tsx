"use client";

/**
 * Le document de termes de référence, à l'écran et sur papier.
 *
 * Le composeur existait depuis le début côté serveur — PDF et DOCX, douze
 * sections, journalisation à chaque génération — sans qu'aucun écran n'y
 * mène. On le déclenchait depuis Swagger. Cette page est le chemin qui
 * manquait.
 *
 * UN SEUL PLAN, TROIS RENDUS. `GET /document/apercu` rend le contenu exact
 * du fichier ; cette page ne décide que de son apparence, comme le font les
 * deux composeurs. Rien n'est recomposé ici : reformuler une section dans
 * le navigateur ferait circuler deux versions d'une pièce contractuelle.
 *
 * POURQUOI IMPRIMER D'ICI, ET PAS DE LA FICHE. La fiche de consultation est
 * un écran de travail — statut, actions, rappels. Le document est la pièce
 * elle-même. Imprimer la première donnerait une capture d'application ;
 * c'est la seconde qu'on classe et qu'on porte en réunion.
 *
 * Le vide est dit, jamais masqué : une section sans contenu porte sa
 * mention. C'est ce qu'un relecteur doit voir avant de transmettre.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { useAuth } from "@/components/auth/AuthContext";
import {
  tdrApi,
  ApiError,
  type BlocDocumentApi,
  type PlanDocumentApi,
} from "@/lib/api";
import { enregistrerFichier } from "@/lib/telechargement";
import {
  ArrowLeft,
  DocumentPdf,
  DocumentWordProcessor,
  Printer,
  WarningAltFilled,
} from "@carbon/icons-react";

export function DocumentClient({ id }: { id: string }) {
  const { loading: authLoading } = useAuth();

  const [plan, setPlan] = useState<PlanDocumentApi | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  /** Format en cours de fabrication — le serveur compose, cela prend un instant. */
  const [enCours, setEnCours] = useState<"pdf" | "docx" | null>(null);
  const [echecFichier, setEchecFichier] = useState<string | null>(null);

  // L'état s'écrit dans les rappels de la promesse, jamais dans le corps de
  // l'effet : c'est ce que la règle attend d'une synchronisation avec un
  // système extérieur, et le drapeau d'annulation évite d'afficher un plan
  // dont on a quitté l'écran entre-temps.
  useEffect(() => {
    if (authLoading) return;
    let annule = false;
    tdrApi
      .planDocument(id)
      .then((p) => {
        if (!annule) setPlan(p);
      })
      .catch((e: unknown) => {
        if (!annule) {
          setErreur(e instanceof ApiError ? e.message : "Document indisponible.");
        }
      });
    return () => {
      annule = true;
    };
  }, [authLoading, id]);

  const telecharger = async (format: "pdf" | "docx") => {
    if (!plan || enCours) return;
    setEnCours(format);
    setEchecFichier(null);
    try {
      const contenu = await tdrApi.fichierDocument(id, format);
      // Le nom porte la référence : un fichier téléchargé se retrouve dans
      // un dossier de téléchargements parmi cent autres.
      enregistrerFichier(contenu, `${plan.reference}.${format}`);
    } catch (e) {
      setEchecFichier(
        e instanceof ApiError ? e.message : "La composition du fichier n’a pas abouti.",
      );
    } finally {
      setEnCours(null);
    }
  };

  const fil = [
    { label: "TDR", href: "/tdr" },
    { label: plan?.reference ?? "Dossier", href: `/tdr/${id}` },
    { label: "Document" },
  ];

  if (erreur) {
    return (
      <Shell crumbs={fil}>
        <div className="mx-auto flex max-w-[40rem] flex-col items-start gap-4 py-12">
          <WarningAltFilled size={32} className="text-danger-text" aria-hidden />
          <p className="text-body-lg text-primary">{erreur}</p>
          <Link href={`/tdr/${id}`} className="demoBtnSecondary">
            <ArrowLeft size={14} aria-hidden />
            <span>Retour au dossier</span>
          </Link>
        </div>
      </Shell>
    );
  }

  if (!plan) {
    return (
      <Shell crumbs={fil}>
        <p className="text-body text-secondary py-12">Composition du document…</p>
      </Shell>
    );
  }

  return (
    <Shell crumbs={fil}>
      {/* Barre d'actions — écran seulement. Elle n'a rien à faire sur une
          pièce qu'on classe : `print:hidden` la retire du papier. */}
      <div className="border-subtle mb-6 flex flex-wrap items-center gap-3 border-b pb-4 print:hidden">
        <Link href={`/tdr/${id}`} className="demoBtnSecondary">
          <ArrowLeft size={14} aria-hidden />
          <span>Retour au dossier</span>
        </Link>

        <span className="flex-1" />

        <button
          type="button"
          className="demoBtnSecondary"
          onClick={() => window.print()}
        >
          <Printer size={14} aria-hidden />
          <span>Imprimer</span>
        </button>
        <button
          type="button"
          className="demoBtnSecondary"
          onClick={() => void telecharger("docx")}
          disabled={enCours !== null}
        >
          <DocumentWordProcessor size={14} aria-hidden />
          <span>{enCours === "docx" ? "Composition…" : "DOCX"}</span>
        </button>
        <button
          type="button"
          className="demoBtnPrimary"
          onClick={() => void telecharger("pdf")}
          disabled={enCours !== null}
        >
          <DocumentPdf size={14} aria-hidden />
          <span>{enCours === "pdf" ? "Composition…" : "Télécharger le PDF"}</span>
        </button>
      </div>

      {echecFichier && (
        <p className="text-caption text-danger-text mb-4 flex items-start gap-2 print:hidden">
          <WarningAltFilled size={16} className="mt-0.5 shrink-0" aria-hidden />
          {echecFichier}
        </p>
      )}

      {/* Le document. `data-document` porte les règles de pagination —
          format de page et sauts — que les utilitaires ne peuvent pas dire. */}
      <article
        data-document
        className="bg-background border-subtle mx-auto w-full max-w-[46rem] border p-8 print:max-w-none print:border-0 print:p-0"
      >
        <header className="border-strong border-b pb-4">
          <div className="text-caption text-secondary flex flex-wrap items-baseline justify-between gap-2">
            <span className="ptn-mono">{plan.reference}</span>
            <span>{plan.statut}</span>
          </div>
          <h1 className="text-heading-04 text-primary mt-3">{plan.titre}</h1>
          <p className="text-body text-secondary mt-2">
            {plan.typeCode} · {plan.typeNom} — {plan.organisation}
          </p>
        </header>

        {plan.entete.length > 0 && (
          <dl className="border-subtle grid gap-x-8 gap-y-2 border-b py-4 sm:grid-cols-2">
            {plan.entete.map((l) => (
              <div key={l.cle} className="flex flex-col">
                <dt className="text-caption text-secondary">{l.cle}</dt>
                <dd className="text-body text-primary">{l.valeur}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Déclarée, jamais tue. Une pièce contractuelle dit ce qui a été
            écrit avec une assistance automatique ; le taire serait une
            omission, non une discrétion. */}
        {plan.champsAssistes.length > 0 && (
          <p className="border-ai bg-ai-surface text-caption text-primary mt-4 border-l-2 px-4 py-3">
            Rédaction assistée par un modèle de langage sur{" "}
            {plan.champsAssistes.length === 1 ? "la section" : "les sections"} :{" "}
            {plan.champsAssistes.join(", ")}. Le contenu a été relu et repris par l’auteur,
            qui en porte la responsabilité.
          </p>
        )}

        {plan.sections.map((s) => (
          <section key={s.numero} className="mt-8">
            {/* `break-after-avoid` : un titre seul en bas de page renvoie
                son texte au feuillet suivant, et le lecteur tourne pour rien. */}
            <h2 className="text-heading-02 text-primary break-after-avoid">
              <span className="ptn-mono text-secondary mr-2">{s.numero}</span>
              {s.titre}
            </h2>
            <div className="mt-2 flex flex-col gap-3">
              {s.blocs.map((b, i) => (
                <BlocRendu key={i} bloc={b} />
              ))}
            </div>
          </section>
        ))}

        <footer className="border-subtle text-caption text-secondary mt-10 border-t pt-4">
          {plan.reference} · composé le {plan.dateComposition}
        </footer>
      </article>
    </Shell>
  );
}

/**
 * Les quatre genres de bloc du plan, et rien d'autre.
 *
 * Aucun balisage n'est interprété — ni gras, ni italique, ni titre. C'est
 * la contrepartie de l'éditeur du parcours, dont la barre d'outils ne porte
 * aucun bouton de mise en forme : ce qui n'entre pas ne doit pas sortir.
 */
function BlocRendu({ bloc }: { bloc: BlocDocumentApi }) {
  switch (bloc.genre) {
    case "paragraphe":
      return (
        <p className="text-body text-primary whitespace-pre-wrap">{bloc.texte}</p>
      );

    case "liste":
      return (
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {bloc.entrees.map((e, i) => (
            <li key={i} className="text-body text-primary">
              {e}
            </li>
          ))}
        </ul>
      );

    case "definitions":
      return (
        <dl className="flex flex-col gap-1">
          {bloc.lignes.map((l) => (
            <div key={l.cle} className="flex flex-wrap gap-x-2">
              <dt className="text-body text-secondary">{l.cle} :</dt>
              <dd className="text-body text-primary">{l.valeur}</dd>
            </div>
          ))}
        </dl>
      );

    case "absent":
      // Le vide se dit. Une section muette se lit comme une section oubliée
      // par la mise en page, pas comme un champ resté vide.
      return <p className="text-body text-helper italic">{bloc.mention}</p>;
  }
}
