"use client";

/**
 * L'assistant du dossier — panneau du parcours de rédaction.
 *
 * Il ne propose plus des textes à recopier : il écrit dans les champs. Ce
 * qu'il écrit est marqué, et chaque écriture reste annulable tant que la
 * conversation est ouverte — c'est ce qui remplace le geste de reprise que
 * l'ancien parcours exigeait.
 *
 * Trois choses arrivent au fil de l'eau, et c'est délibéré : l'outil qu'il
 * mobilise, le texte à mesure qu'il s'écrit, puis ce qu'il en dit. Sans
 * cela, l'auteur regardait un écran immobile pendant vingt secondes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parlerAgent, type AgentEvent, type TourDeParole } from "@/lib/agent-stream";
import { TexteEnrichi } from "@/components/ui/TexteEnrichi";
import { apercuDePiece, tdrApi, type PieceJointeApi } from "@/lib/api";
import {
  AiGenerate,
  Attachment,
  Close,
  Document,
  DocumentPdf,
  SendAlt,
  Undo,
  WarningAltFilled,
} from "@carbon/icons-react";
import { IconButton, InlineLoading } from "@carbon/react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAssistant, type Bulle, type Ecriture } from "./assistant-contexte";

/** Une écriture faite par l'assistant, et de quoi la défaire. */
export type { Ecriture } from "./assistant-contexte";

const SUGGESTIONS = [
  "Rédige le contexte à partir de l’activité du plan.",
  "Propose trois objectifs SMART et leurs critères.",
  "Raccourcis la justification de moitié.",
];

/**
 * Le nom d'un champ, tel que l'auteur le lit dans le formulaire.
 *
 * ALIGNÉ SUR LE REGISTRE SERVEUR, qui fait autorité depuis qu'il porte
 * `libelle`. Six champs sur dix-huit avaient divergé : l'assistant
 * annonçait « Méthodes et outils écrit », l'étape s'intitulait
 * « Méthodologie », et la pièce imprimait « Méthodologie ». Cette table
 * reste ici faute d'un point d'entrée qui la serve — elle doit être tenue
 * à jour depuis backend/src/ai/field-registry.ts, et non pour elle-même.
 *
 * Le registre du serveur ne connaît que des clés de colonne —
 * « budgetIdaUsd », « expectedResults » — qui ne disent rien à un agent. Le
 * bandeau d'annulation, l'aperçu et les refus doivent désigner le champ avec
 * les mots déjà sous ses yeux. Miroir de FIELDS
 * (backend/src/ai/field-registry.ts) : une entrée ajoutée là-bas doit l'être
 * ici.
 */
const LIBELLES_CHAMPS: Record<string, string> = {
  context: "Contexte",
  justification: "Justification",
  beneficiaries: "Bénéficiaires visés",
  expectedResults: "Résultats attendus",
  objectives: "Objectifs",
  deliverables: "Livrables attendus",
  approach: "Approche",
  methodology: "Méthodologie",
  constraints: "Contraintes",
  expertise: "Expertise requise",
  startDate: "Démarrage souhaité",
  durationMonths: "Durée du marché",
  effortDays: "Volume d’effort",
  budgetTotalUsd: "Budget total",
  budgetIdaUsd: "Part IDA",
  budgetAfdUsd: "Part AFD",
  budgetGovUsd: "Part Gouvernement",
  beneficiaryOrganisation: "Maîtrise d’ouvrage bénéficiaire",
};

/** Un champ inconnu reste annulable : on reste vague plutôt que technique. */
const libelleChamp = (cle: string) => LIBELLES_CHAMPS[cle] ?? "Un champ du dossier";

/**
 * Un refus, dit à l'auteur.
 *
 * Les motifs du serveur s'ouvrent sur la clé du champ (« budgetTotalUsd
 * attend un montant… ») : on la retire, sinon elle reparaît derrière le
 * libellé traduit.
 */
function motifLisible(cle: string, motif: string): string {
  const reste = motif.startsWith(cle) ? motif.slice(cle.length).replace(/^\s*:?\s*/, "") : motif;
  return reste ? `${libelleChamp(cle)} : ${reste}` : libelleChamp(cle);
}

export function AgentPanel({
  tdrId,
  onEcriture,
  onAnnuler,
  etapeCourante,
}: {
  tdrId: string | null;
  /** Le parcours recharge le champ écrit depuis la base */
  onEcriture: (e: Ecriture) => void;
  /** Restaure la valeur précédente */
  onAnnuler: (e: Ecriture) => void;
  etapeCourante: string;
}) {
  // Le fil vit dans le contexte : une génération lancée depuis un champ s'y
  // inscrit aussi, et le panneau n'en est qu'une vue.
  const { ouvert, fermer, bulles, setBulles, champCourant } = useAssistant();
  const [saisie, setSaisie] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [apercu, setApercu] = useState<{ champ: string; texte: string } | null>(null);

  const filRef = useRef<HTMLDivElement>(null);
  const saisieRef = useRef<HTMLTextAreaElement>(null);
  const abandonRef = useRef<AbortController | null>(null);

  // Le fil suit la génération : un texte qui s'écrit hors de vue ne sert
  // à rien.
  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight, behavior: "smooth" });
  }, [bulles, apercu]);

  useEffect(() => () => abandonRef.current?.abort(), []);

  // La saisie grandit avec son contenu jusqu'à un plafond, comme dans une
  // interface de conversation. Une seule ligne avec ascenseur dès le
  // deuxième mot ne laissait pas relire ce qu'on venait d'écrire.
  useEffect(() => {
    const el = saisieRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [saisie]);

  const envoyer = useCallback(
    async (instruction: string) => {
      if (!tdrId || occupe || !instruction.trim()) return;

      const historique: TourDeParole[] = bulles
        .filter((b) => b.texte.trim())
        .map((b) => ({ role: b.role, content: b.texte }));

      setSaisie("");
      setOccupe(true);
      setApercu(null);
      setBulles((b) => [
        ...b,
        { role: "user", texte: instruction, actes: [], ecritures: [] },
        { role: "assistant", texte: "", actes: [], ecritures: [], encours: true },
      ]);

      const controleur = new AbortController();
      abandonRef.current = controleur;

      const majDerniere = (f: (b: Bulle) => Bulle) =>
        setBulles((tout) => tout.map((b, i) => (i === tout.length - 1 ? f(b) : b)));

      try {
        for await (const ev of parlerAgent(tdrId, instruction, historique, controleur.signal)) {
          appliquer(ev, majDerniere, setApercu, onEcriture);
        }
      } finally {
        majDerniere((b) => ({ ...b, encours: false }));
        setApercu(null);
        setOccupe(false);
        abandonRef.current = null;
      }
    },
    [tdrId, occupe, bulles, onEcriture, setBulles],
  );

  // Fermé, il n'occupe rien : plus de poignée flottante en permanence.
  // L'assistance s'ouvre depuis la barre d'outils du champ, là où l'on
  // écrit — c'est le seul endroit où l'on en a besoin.
  if (!ouvert) return null;

  const vide = bulles.length === 0;

  return (
    <aside
      className="border-subtle bg-background flex h-full max-h-full w-full min-h-0 flex-col border-l"
      aria-label="Assistant du dossier"
    >
      {/* ---------- En-tête ---------- */}
      <header className="border-subtle flex items-center gap-3 border-b px-4 py-3">
        <span className="bg-ai-surface text-ai flex h-8 w-8 shrink-0 items-center justify-center">
          <AiGenerate size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-body text-primary block font-medium">Assistant du dossier</span>
          <span className="text-caption text-helper block truncate">
            {champCourant ?? etapeCourante}
          </span>
        </span>
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer l’assistant"
          className="ptn-carte-liste text-secondary hover:bg-layer hover:text-primary flex h-8 w-8 items-center justify-center"
        >
          <Close size={16} aria-hidden />
        </button>
      </header>

      {/* ---------- Fil ---------- */}
      <div
        ref={filRef}
        // `min-h-0` : sans lui, un enfant flex grandit avec son contenu au
        // lieu de defiler, et pousse la zone de saisie hors du cadre.
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4"
      >
        {vide && (
          <div className="flex flex-col gap-4 py-6">
            <p className="text-body text-secondary">
              Dites-lui ce que vous attendez. Il écrit directement dans les champs du dossier
              et signale ce qu’il a touché.
            </p>
            <p className="text-caption text-helper border-subtle border-l-2 pl-3">
              Il transcrit ce que vous dictez, montants et dates compris, mais n’en propose
              aucun de lui-même. Le type d’activité, le rattachement au plan et les
              attestations de conformité restent à vous : ils se décident, ils ne se
              rédigent pas.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => void envoyer(sug)}
                  disabled={!tdrId}
                  className="ptn-carte-liste border-subtle text-body text-primary hover:border-ai hover:bg-ai-surface border px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {bulles.map((b, i) =>
          b.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="bg-layer text-body text-primary ptn-entree-ligne max-w-[85%] px-3 py-2">
                {b.texte}
              </p>
            </div>
          ) : (
            <div key={i} className="ptn-entree-ligne flex flex-col gap-2">
              {/* Ce que l'assistant fait, à mesure : sans cela l'auteur
                  regardait un écran immobile pendant vingt secondes. */}
              {b.actes.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {b.actes.map((a, j) => (
                    <li
                      key={j}
                      className={`text-caption flex items-center gap-2 ${
                        a.genre === "refus" ? "text-danger-text" : "text-helper"
                      }`}
                    >
                      <i
                        aria-hidden
                        className={`inline-block h-1.5 w-1.5 shrink-0 ${
                          a.genre === "refus" ? "bg-danger" : "bg-ai"
                        }`}
                      />
                      {a.libelle}
                    </li>
                  ))}
                </ul>
              )}

              {/* Le balisage du modèle est RENDU, non montré : un récapitulatif
                  se parcourt mieux avec des puces et des intitulés en gras.
                  Ne vaut que pour la conversation — une valeur de champ n'en
                  porte aucun, le document n'en rendant pas. */}
              {b.texte && <TexteEnrichi>{b.texte}</TexteEnrichi>}

              {b.encours && !b.texte && b.actes.length === 0 && (
                <span className="text-caption text-helper" aria-label="L’assistant travaille">
                  L’assistant travaille…
                </span>
              )}

              {b.ecritures.map((e) => (
                <div
                  key={e.champ}
                  className="border-ai bg-ai-surface flex flex-wrap items-center gap-2 border px-3 py-2"
                >
                  <span className="text-caption text-ai-text flex-1">
                    Écrit dans <strong>{libelleChamp(e.champ)}</strong> · étape {e.etape}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAnnuler(e)}
                    className="ptn-carte-liste border-ai text-ai-text text-caption inline-flex items-center gap-1.5 border px-2 py-1"
                  >
                    <Undo size={13} aria-hidden /> Annuler
                  </button>
                </div>
              ))}
            </div>
          ),
        )}

        {/* Le texte tel qu'il s'écrit dans le champ, avant même d'y être
            enregistré. C'est ce qui remplace l'écran immobile. */}
        {apercu && (
          <div className="border-ai bg-ai-surface border p-3">
            <span className="text-caption text-ai-text block">
              Écriture dans <strong>{libelleChamp(apercu.champ)}</strong>
            </span>
            <p className="text-body text-primary mt-1 whitespace-pre-wrap">{apercu.texte}</p>
          </div>
        )}
      </div>

      {/* ---------- Saisie ----------
          Un seul contenant : le bouton vit DANS le champ. Deux rectangles
          côte à côte se désolidarisaient dès que le texte grandissait. */}
      <form
        className="border-subtle p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void envoyer(saisie);
        }}
      >
        <div className="border-strong bg-field focus-within:border-ai flex flex-col gap-2 border px-3 py-2">
          {/* Les pièces AU-DESSUS de la saisie, dans le même cadre : elles
              accompagnent la conversation entière, pas le message qu'on est
              en train d'écrire. Une vignette plutôt qu'un nom de fichier —
              on reconnaît un document d'un coup d'œil, jamais à son
              extension. */}
          <PiecesJointes tdrId={tdrId} />

          <div className="flex items-end gap-2">
          <textarea
            ref={saisieRef}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={tdrId ? "Que voulez-vous ?" : "Ouvrez d’abord le brouillon."}
            rows={1}
            disabled={!tdrId || occupe}
            onKeyDown={(e) => {
              // Entrée envoie, Maj+Entrée passe à la ligne : c'est l'usage
              // dans une zone de conversation.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void envoyer(saisie);
              }
            }}
            className="ptn-zone-redaction text-body text-primary placeholder:text-placeholder max-h-48 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-1 outline-none"
          />
          {/* Infobulle alignée au-dessus : le bouton est au bas de l'écran,
              une bulle posée dessous serait hors du cadre. Elle porte le
              raccourci, qui ne se devine pas. */}
          <IconButton
            type="submit"
            align="top-right"
            size="sm"
            label={
              occupe
                ? "L’assistant répond…"
                : "Envoyer — Entrée pour envoyer, Maj+Entrée pour aller à la ligne"
            }
            disabled={!tdrId || occupe || !saisie.trim()}
            className="bg-ai hover:bg-ai-hover text-on-color ptn-carte-liste mb-0.5 flex !h-8 !max-h-8 !min-h-8 !w-8 !max-w-8 !min-w-8 shrink-0 items-center justify-center !p-0 disabled:hover:bg-ai disabled:opacity-30"
          >
            {occupe ? (
              <span className="ptn-points" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : (
              <SendAlt size={16} aria-hidden />
            )}
          </IconButton>
          </div>
        </div>
        <p className="text-caption text-helper mt-2">
          L’assistant peut se tromper. Tout ce qu’il écrit reste à relire.
        </p>
      </form>
    </aside>
  );
}

// ====================================================================
// Les pièces apportées au dossier
// ====================================================================

const estImage = (mime: string) => mime.startsWith("image/");

/**
 * L'adresse locale d'une pièce image.
 *
 * Trois faits interdisent une balise `<img src>` pointée sur la route : le
 * jeton d'accès vit en mémoire, le serveur ne lit que l'en-tête Bearer, et
 * la route est fermée par défaut. Il faut donc récupérer les octets, puis en
 * faire une adresse locale.
 *
 * Le cas courant est gratuit : d'une pièce que l'auteur vient de verser on
 * tient déjà le fichier, et l'affichage ne coûte aucun aller-retour. Le
 * réseau ne sert qu'aux pièces d'une session antérieure.
 */
function useVignette(piece: PieceJointeApi & { fichier?: File }, tdrId: string | null) {
  const [distante, setDistante] = useState<string | null>(null);

  const locale = useMemo(
    () => (piece.fichier && estImage(piece.mimeType) ? URL.createObjectURL(piece.fichier) : null),
    [piece.fichier, piece.mimeType],
  );

  useEffect(
    () => () => {
      if (locale) URL.revokeObjectURL(locale);
    },
    [locale],
  );

  useEffect(() => {
    if (locale || !estImage(piece.mimeType) || !tdrId) return;

    let vivante = true;
    let creee: string | null = null;
    apercuDePiece(tdrId, piece.id)
      .then((u) => {
        creee = u;
        // Sans cette garde, une adresse créée après le démontage fuit : cela
        // ne se voit pas, mais se mesure sur un onglet resté ouvert.
        if (vivante) setDistante(u);
        else URL.revokeObjectURL(u);
      })
      .catch(() => undefined);

    return () => {
      vivante = false;
      if (creee) URL.revokeObjectURL(creee);
    };
  }, [piece.id, piece.mimeType, tdrId, locale]);

  return locale ?? distante;
}

/** Une pièce, reconnaissable : sa vignette si c'en est une, son genre sinon. */
function Piece({
  piece,
  tdrId,
  onRetirer,
}: {
  piece: PieceJointeApi & { fichier?: File };
  tdrId: string | null;
  onRetirer: (id: string) => void;
}) {
  const vignette = useVignette(piece, tdrId);

  return (
    <span
      className="border-subtle bg-layer ptn-carte-liste flex items-center gap-2 border py-1 pr-1 pl-1.5"
      title={
        piece.lisibleParAssistant
          ? piece.filename
          : `${piece.filename} — conservée au dossier, non soumise à l’assistant`
      }
    >
      {vignette ? (
        /* eslint-disable-next-line @next/next/no-img-element -- source blob: locale, next/image n'y apporterait rien */
        <img src={vignette} alt="" className="h-6 w-6 shrink-0 object-cover" />
      ) : (
        <span className="bg-field text-helper flex h-6 w-6 shrink-0 items-center justify-center">
          {piece.mimeType === "application/pdf" ? (
            <DocumentPdf size={14} aria-hidden />
          ) : (
            <Document size={14} aria-hidden />
          )}
        </span>
      )}
      <span className="text-caption text-secondary max-w-32 truncate">{piece.filename}</span>
      {/* Une pièce que l'assistant ne lit pas doit le dire : sinon l'auteur
          croit qu'il en tient compte. */}
      {!piece.lisibleParAssistant && (
        <span className="text-caption text-helper border-subtle border px-1">archive</span>
      )}
      <button
        type="button"
        onClick={() => onRetirer(piece.id)}
        aria-label={`Retirer ${piece.filename}`}
        className="text-helper hover:text-danger-text flex h-5 w-5 shrink-0 items-center justify-center"
      >
        <Close size={12} aria-hidden />
      </button>
    </span>
  );
}

/**
 * Les pièces du dossier, dans le composeur.
 *
 * Un rédacteur part rarement d'une page blanche : il a le TDR de l'an
 * dernier, le modèle du bailleur. Ces pièces valent comme MODÈLE DE FORME —
 * structure, ton, niveau de détail — et jamais comme source de fait : leurs
 * montants et leurs dates se rapportent à une autre opération, et les
 * recopier décrirait un marché qui n'existe pas.
 *
 * Elles vivent dans le composeur et non dans une bulle : elles accompagnent
 * la conversation entière, et les rendre dans un message laisserait croire
 * qu'elles ne valent que pour lui.
 */
function PiecesJointes({ tdrId }: { tdrId: string | null }) {
  const [pieces, setPieces] = useState<Array<PieceJointeApi & { fichier?: File }>>([]);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const champRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tdrId) return;
    tdrApi
      .pieces(tdrId)
      .then(setPieces)
      .catch(() => undefined);
  }, [tdrId]);

  const verser = async (fichiers: FileList | null) => {
    if (!tdrId || !fichiers?.length) return;
    setOccupe(true);
    setErreur(null);
    try {
      for (const fichier of Array.from(fichiers)) {
        const piece = await tdrApi.verserPiece(tdrId, fichier);
        // Le fichier est gardé : la vignette se dessine alors sans
        // aller-retour. Et le serveur rend la pièce déjà présente quand
        // l'empreinte est la même — on évite de l'afficher deux fois.
        setPieces((p) => (p.some((x) => x.id === piece.id) ? p : [...p, { ...piece, fichier }]));
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Pièce refusée.");
    } finally {
      setOccupe(false);
      if (champRef.current) champRef.current.value = "";
    }
  };

  const retirer = async (pieceId: string) => {
    if (!tdrId) return;
    try {
      await tdrApi.retirerPiece(tdrId, pieceId);
      setPieces((p) => p.filter((x) => x.id !== pieceId));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Retrait impossible.");
    }
  };

  return (
    <>
      <input
        ref={champRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt"
        onChange={(e) => void verser(e.target.files)}
      />

      {(pieces.length > 0 || erreur) && (
        <div className="flex flex-col gap-1.5">
          {pieces.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pieces.map((p) => (
                <Piece key={p.id} piece={p} tdrId={tdrId} onRetirer={(id) => void retirer(id)} />
              ))}
            </div>
          )}
          {erreur && <p className="text-caption text-danger-text">{erreur}</p>}
        </div>
      )}

      {/* Un pictogramme, non une phrase. Le texte occupait une ligne entière
          au-dessus d'un champ de saisie déjà court, pour une commande
          secondaire. L'intitulé revient au survol ET au focus — jamais au
          seul survol, sans quoi il n'existe pas au clavier. */}
      <Tooltip
        label={occupe ? "Lecture de la pièce en cours…" : "Joindre une pièce au dossier"}
        hint={tdrId ? undefined : "Disponible une fois le brouillon ouvert"}
        side="right"
      >
        <button
          type="button"
          onClick={() => champRef.current?.click()}
          disabled={!tdrId || occupe}
          aria-label={occupe ? "Lecture de la pièce en cours" : "Joindre une pièce"}
          className="border-subtle text-secondary hover:bg-layer-hover hover:text-primary disabled:text-disabled ptn-carte-liste inline-flex h-8 w-8 shrink-0 items-center justify-center self-start border disabled:cursor-not-allowed"
        >
          {occupe ? (
            <InlineLoading status="active" className="scale-75" />
          ) : (
            <Attachment size={16} aria-hidden />
          )}
        </button>
      </Tooltip>
    </>
  );
}

/** Traduit un évènement du flux en effet visible. */
function appliquer(
  ev: AgentEvent,
  majDerniere: (f: (b: Bulle) => Bulle) => void,
  setApercu: React.Dispatch<React.SetStateAction<{ champ: string; texte: string } | null>>,
  onEcriture: (e: Ecriture) => void,
): void {
  switch (ev.type) {
    case "travail":
      majDerniere((b) => ({ ...b, actes: [...b.actes, { genre: "travail", libelle: ev.libelle }] }));
      break;

    case "apercu":
      // Remplacement et non accumulation : le serveur envoie le texte entier,
      // déjà débarrassé de son balisage, pour que cet aperçu montre
      // exactement ce qui sera enregistré. Un nettoyage raccourcit le texte
      // quand une paire se referme — un fragment à ajouter serait devenu
      // négatif et aurait laissé des astérisques orphelines.
      setApercu({ champ: ev.champ, texte: ev.texte });
      break;

    case "ecriture": {
      const e: Ecriture = { champ: ev.champ, etape: ev.etape, valeur: ev.valeur, avant: ev.avant };
      setApercu(null);
      onEcriture(e);
      majDerniere((b) => ({
        ...b,
        actes: [...b.actes, { genre: "ecriture", libelle: `${libelleChamp(ev.champ)} écrit`, champ: ev.champ }],
        ecritures: [...b.ecritures.filter((x) => x.champ !== e.champ), e],
      }));
      break;
    }

    case "refus":
      majDerniere((b) => ({
        ...b,
        actes: [...b.actes, { genre: "refus", libelle: motifLisible(ev.champ, ev.motif) }],
      }));
      break;

    case "texte":
      majDerniere((b) => ({ ...b, texte: b.texte + ev.delta }));
      break;

    case "erreur":
      majDerniere((b) => ({
        ...b,
        actes: [...b.actes, { genre: "refus", libelle: ev.message }],
        encours: false,
      }));
      break;

    default:
      break;
  }
}


export { WarningAltFilled };
