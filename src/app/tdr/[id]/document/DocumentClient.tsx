"use client";

/**
 * Le document de termes de référence, à l'écran et sur papier.
 *
 * UN SEUL PLAN, TROIS RENDUS. `GET /document/apercu` rend le contenu exact
 * du fichier ; cette page ne décide que de son apparence, comme le font les
 * deux composeurs. Rien n'est recomposé ici : reformuler une section dans
 * le navigateur ferait circuler deux versions d'une pièce contractuelle.
 *
 * L'ÉCRAN SUIT LE PDF, PAS L'INVERSE. Auparavant les deux divergeaient — le
 * fichier ouvrait sur une page de garde, l'écran commençait au titre, et
 * imprimer depuis le navigateur donnait une pièce différente de celle qu'on
 * téléchargeait. Même page de garde, même sommaire, mêmes intitulés de
 * partie, même bloc de clôture : ce qui sort de l'imprimante et ce qui sort
 * du serveur doivent se ressembler assez pour se classer ensemble.
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
import Image from "next/image";
import { Shell } from "@/components/shell/Shell";
import { useAuth } from "@/components/auth/AuthContext";
import {
  tdrApi,
  ApiError,
  EN_TETE_INSTITUTIONNEL,
  PROJET_DOCUMENT,
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

        <button type="button" className="demoBtnSecondary" onClick={() => window.print()}>
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
        className="bg-background border-subtle mx-auto w-full max-w-[48rem] border px-10 py-12 print:max-w-none print:border-0 print:px-0 print:py-0"
      >
        <PageDeGarde plan={plan} />
        <Sommaire plan={plan} />

        {plan.sections.map((s) => (
          <section key={s.numero} id={`section-${s.numero}`} className="mt-10 first:mt-0">
            {/* `break-after-avoid` : un titre seul en bas de page renvoie
                son texte au feuillet suivant, et le lecteur tourne pour rien. */}
            <h2 className="flex items-baseline gap-3 break-after-avoid">
              <span className="ptn-mono text-caption text-accent shrink-0">
                {s.numero.padStart(2, "0")}
              </span>
              <span className="text-heading-03 text-primary">{s.titre}</span>
            </h2>
            <div className="border-accent mt-1 border-b-2" />
            <div className="mt-4 flex flex-col gap-3 pl-[2.1rem]">
              {s.blocs.map((b, i) => (
                <BlocRendu key={i} bloc={b} />
              ))}
            </div>
          </section>
        ))}

        <Cloture plan={plan} />
      </article>
    </Shell>
  );
}

/**
 * La page de garde, calquée sur celle du PDF.
 *
 * L'ordonnance suit celle des pièces publiques congolaises : la puissance
 * émettrice d'abord, le programme ensuite, la nature de l'acte, son objet,
 * puis les mentions d'identification. On lit du plus général au plus
 * particulier, et c'est ce qui permet de classer sans ouvrir.
 */
function PageDeGarde({ plan }: { plan: PlanDocumentApi }) {
  return (
    <header className="break-after-page">
      <div className="bg-accent -mx-10 -mt-12 mb-10 h-1.5 print:mx-0 print:mt-0" />

      <div className="flex flex-col items-center text-center">
        {/* `unoptimized` : next/image sert du WebP à qualité 75 et salit les
            aplats du logo. Voir public/brand/README.md. */}
        <Image
          src="/brand/ugptn-logo.png"
          alt=""
          width={132}
          height={56}
          unoptimized
          className="mb-6 h-14 w-auto"
        />

        <p className="text-body text-primary font-semibold tracking-wide">
          {EN_TETE_INSTITUTIONNEL[0]}
        </p>
        {EN_TETE_INSTITUTIONNEL.slice(1).map((l) => (
          <p key={l} className="text-body text-secondary mt-0.5">
            {l}
          </p>
        ))}

        <div className="border-subtle my-5 w-20 border-t" />

        <p className="text-caption text-secondary">{PROJET_DOCUMENT.intitule}</p>
        <p className="ptn-mono text-caption text-accent mt-1">
          {PROJET_DOCUMENT.sigle} · {PROJET_DOCUMENT.code}
        </p>

        <p className="text-caption text-accent mt-16 font-semibold tracking-[0.22em]">
          TERMES DE RÉFÉRENCE
        </p>
        <h1 className="text-heading-05 text-primary mt-5 max-w-[34rem] text-balance">
          {plan.titre}
        </h1>
        <p className="text-body text-secondary mt-4">
          {plan.typeCode} — {plan.typeNom}
        </p>
      </div>

      {/* Le cartouche d'identification. Encadré parce qu'il se consulte sans
          se lire : on y vient chercher une référence. */}
      <dl className="border-subtle mt-16 grid grid-cols-[minmax(0,11rem)_1fr] gap-x-6 gap-y-3 border p-5">
        {plan.entete.map((l) => (
          <div key={l.cle} className="contents">
            <dt className="text-caption text-secondary uppercase">{l.cle}</dt>
            <dd className="text-body text-primary">{l.valeur}</dd>
          </div>
        ))}
      </dl>

      <div className="border-subtle text-caption text-secondary mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t pt-3">
        <span>Document composé le {plan.dateComposition}</span>
        {/* Le statut figure ici parce qu'un brouillon imprimé doit se
            reconnaître comme tel, sans qu'on ait à l'ouvrir. */}
        <span className="text-primary font-semibold">{plan.statut}</span>
      </div>
    </header>
  );
}

/**
 * Le sommaire.
 *
 * Sans numéros de page : à l'écran ils n'existent pas, et sur papier le
 * navigateur ne les expose pas au CSS. Les entrées sont donc des liens —
 * ce que le PDF ne peut pas offrir et que l'écran, lui, doit.
 */
function Sommaire({ plan }: { plan: PlanDocumentApi }) {
  return (
    <nav aria-label="Sommaire" className="break-after-page">
      <h2 className="text-heading-03 text-primary">Sommaire</h2>
      <div className="border-accent mt-1 border-b-2" />
      <ol className="mt-5 flex flex-col">
        {plan.sections.map((s) => (
          <li key={s.numero}>
            <a
              href={`#section-${s.numero}`}
              className="border-subtle text-body text-primary hover:bg-layer flex items-baseline gap-3 border-b py-2.5 no-underline print:border-0 print:py-1.5"
            >
              <span className="ptn-mono text-caption text-accent shrink-0">
                {s.numero.padStart(2, "0")}
              </span>
              <span>{s.titre}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Ce qui ferme le document : les engagements de l'auteur, ses annexes, la
 * déclaration d'assistance et sa signature.
 *
 * Les attestations sont horodatées par le serveur — c'est la seule marque du
 * dossier qu'on ne puisse pas antidater, et elle n'apparaissait nulle part.
 */
function Cloture({ plan }: { plan: PlanDocumentApi }) {
  // Pas de `break-inside-avoid` ici : `[data-document] section` est écrit
  // hors couche dans globals.scss et l'emporterait sur l'utilitaire. Le bloc
  // se tient par ses titres, qui ne se détachent pas de leur suite.
  return (
    <section className="mt-10">
      {/* « Engagements et pièces jointes » a été retiré du document, à la
          demande : attestations et liste des annexes ne s'impriment plus.
          Elles restent tenues par le dossier — les consentements sont
          horodatés côté serveur et le contrôle de complétude les exige
          toujours avant transmission. Seule la signature demeure ici. */}
      <h2 className="text-heading-03 text-primary pl-[2.1rem]">Signature</h2>
      <div className="border-accent mt-1 border-b-2" />

      <div className="mt-5 flex flex-col gap-6 pl-[2.1rem]">
        {plan.auteur && (
          <div>
            <p className="text-caption text-secondary uppercase">Établi par</p>
            <p className="text-body-lg text-primary mt-1 font-semibold">{plan.auteur.nom}</p>
            <p className="text-body text-secondary">{plan.auteur.entite}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SousTitre({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-caption text-accent break-after-avoid font-semibold tracking-wider uppercase">
      {children}
    </h3>
  );
}

/**
 * Les cinq genres de bloc du plan, et rien d'autre.
 *
 * Aucun balisage n'est interprété — ni gras, ni italique, ni titre. C'est
 * la contrepartie de l'éditeur du parcours, dont la barre d'outils ne porte
 * aucun bouton de mise en forme : ce qui n'entre pas ne doit pas sortir.
 */
function BlocRendu({ bloc }: { bloc: BlocDocumentApi }) {
  switch (bloc.genre) {
    case "sousTitre":
      // Nomme une partie DANS la section. Sans lui, trois champs rédigés
      // séparément se lisaient comme un seul bloc muet.
      return (
        <div className="mt-2 first:mt-0">
          <SousTitre>{bloc.texte}</SousTitre>
        </div>
      );

    case "paragraphe":
      return (
        <p className="text-body text-primary text-justify whitespace-pre-wrap">{bloc.texte}</p>
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
        <dl className="flex flex-col">
          {bloc.lignes.map((l) => (
            <div
              key={l.cle}
              className="border-subtle grid grid-cols-[minmax(0,11rem)_1fr] gap-x-4 border-b py-1.5 last:border-0"
            >
              <dt className="text-caption text-secondary uppercase">{l.cle}</dt>
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
