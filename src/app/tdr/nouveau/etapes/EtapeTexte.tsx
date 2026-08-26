"use client";

/**
 * Écran d'une section rédigée du dossier.
 *
 * Une seule colonne. L'écran en comptait quatre — rail des étapes, texte,
 * panneau d'assistance, panneau conversationnel — et l'œil ne savait plus
 * où se poser. Ce qu'il faut avoir lu AVANT d'écrire se lit maintenant
 * au-dessus de la zone de saisie, dans l'ordre où l'on en a besoin :
 * la question, ce qu'on attend, puis la page blanche.
 *
 * L'assistance n'a plus de panneau propre. Elle est dans la barre d'outils
 * de l'éditeur, là où l'on écrit — et ouvre le fil quand il faut la guider.
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { poursuivreChamp, redigerChamp } from "@/lib/agent-stream";
import type { State } from "../etat";
import { messageDEchec, useAssistant } from "../assistant-contexte";
import { EditeurTexte } from "./EditeurTexte";

export interface ChampTexte {
  cle: keyof State & string;
  question: string;
  aide: ReactNode;
  annonceIa: string;
  placeholder?: string;
  lignes?: number;
  reperes?: string[];
  /** Le champ attend une entrée par ligne. */
  parLigne?: boolean;
}

export function EtapeTexte({
  champ,
  state,
  set,
  gabarit,
  complement,
  persist,
}: {
  champ: ChampTexte;
  state: State;
  set: (s: State) => void;
  /**
   * Gabarit du référentiel, propre au type de marché. Ce n'est PAS de
   * l'assistance : une substitution de marqueurs, sans modèle.
   */
  gabarit?: string;
  /**
   * Ce que la section demande EN PLUS de sa rédaction — l'expertise a des
   * profils à désigner, qui se cochent et ne se rédigent pas.
   *
   * Rendu sous l'éditeur, jamais au-dessus : un bloc interactif placé avant
   * la surface d'écriture repousse la page blanche hors du premier écran,
   * et c'est elle qu'on vient chercher.
   */
  complement?: ReactNode;
  /**
   * Enregistre au serveur, sans attendre le changement d'étape.
   *
   * SANS CELA, LE TEXTE ENGENDRÉ SE PERDAIT. La valeur ne partait qu'au
   * `commit` de l'étape, c'est-à-dire au bouton « Suivant » — le rail des
   * étapes, lui, n'enregistre rien. Il suffisait donc d'engendrer un
   * contexte puis de demander autre chose au fil : l'écriture de l'agent
   * déclenchait une relecture du dossier, la relecture rapportait la valeur
   * de la BASE — c'est-à-dire vide — et le texte fraîchement rédigé
   * disparaissait sous les yeux de l'auteur, sans un mot.
   *
   * Ce qui vient de l'assistant part donc immédiatement.
   */
  persist?: (s: State, patch: Record<string, unknown>) => Promise<void>;
}) {
  const assistant = useAssistant();
  const [erreur, setErreur] = useState<string | null>(null);
  /**
   * La dernière rédaction s'est arrêtée faute de place.
   *
   * Tenu à part de l'erreur, et pour une raison de fond : une erreur est un
   * message qui a vocation à s'effacer, une coupure est un ÉTAT du texte
   * qui appelle un geste — poursuivre — et qui doit rester offert tant que
   * l'auteur ne l'a pas fait.
   */
  const [tronque, setTronque] = useState(false);
  // Valeur d'avant la dernière reprise. Un état, non une ref : le bouton
  // « rétablir » doit apparaître au moment même où la reprise a lieu.
  const [avant, setAvant] = useState<string | null>(null);

  const valeur = String(state[champ.cle] ?? "");

  /**
   * L'échec s'efface de lui-même.
   *
   * Un message d'erreur qui s'installe devient un ornement : on cesse de
   * le lire dès la deuxième minute, et il finit par décrire un incident
   * résolu depuis longtemps. Il s'efface donc — au bout de douze secondes,
   * à la première frappe, et au changement de champ.
   *
   * La coupure, elle, ne s'efface pas : ce n'est pas un message mais un
   * état du texte, et son remède est un bouton.
   */
  useEffect(() => {
    if (!erreur) return;
    const t = setTimeout(() => setErreur(null), 12_000);
    return () => clearTimeout(t);
  }, [erreur]);

  // NOTE — remettre ces trois états à zéro quand le champ change se fait
  // par la CLÉ de l'élément, posée à l'appel (`key={cle}`), et non par un
  // effet. Le wizard rend `EtapeTexte` à la même position d'une étape à
  // l'autre : sans clé, React réutilise l'instance et un échec sur
  // « Contexte » restait affiché sur « Justification ». Avec elle, le
  // composant est neuf, ce qui est exactement ce qu'on veut dire.

  // Le travail est-il CELUI-CI, ou un autre ailleurs ? Les deux ferment le
  // bouton, mais ils ne disent pas la même chose et ne s'arrêtent pas de la
  // même façon.
  const travail = assistant.travail;
  const nôtre = travail?.origine === "champ" && travail.champ === champ.cle;
  const ailleurs = Boolean(travail) && !nôtre;

  const ecrire = (texte: string, parAssistant: boolean) =>
    set({
      ...state,
      [champ.cle]: texte,
      aiAssistedFields:
        parAssistant && !state.aiAssistedFields.includes(champ.cle)
          ? [...state.aiAssistedFields, champ.cle]
          : state.aiAssistedFields,
    });

  /**
   * Ce que dit le repère, selon la phase réelle.
   *
   * « L'assistant rédige » s'affichait dès le clic et ne bougeait plus,
   * alors que le modèle passe ses premières secondes à lire le dossier
   * puis à réfléchir sans écrire un mot. Un repère qui ment sur ce qui se
   * passe est pire qu'un repère absent : il fait croire à un blocage.
   */
  const etat = !nôtre
    ? undefined
    : travail?.detail
      ? travail.detail
      : travail?.phase === "envoi"
        ? "Lecture du dossier…"
        : travail?.phase === "reflexion"
          ? "L’assistant réfléchit…"
          : "L’assistant rédige — veuillez patienter";

  /**
   * Lance une rédaction, ou la poursuit là où elle s'est arrêtée.
   *
   * Tout passe par ici, et tout s'inscrit au fil AU FUR ET À MESURE. La
   * consignation avait lieu à la fin, d'un bloc : on ne pouvait donc pas
   * savoir à quel moment une génération avait échoué, ce qui est
   * exactement ce qu'on demande à un journal.
   */
  const lancer = async (suite: boolean) => {
    if (!state.tdrId) return;

    const libelle = suite
      ? `Poursuivre « ${champ.question} »`
      : valeur.trim()
        ? `Améliorer « ${champ.question} »`
        : `Rédiger « ${champ.question} »`;

    // Le verrou est dans le contexte : s'il refuse, une autre demande court
    // déjà et il ne faut surtout pas en lancer une seconde.
    const signal = assistant.demarrer({
      origine: "champ",
      champ: champ.cle,
      libelleChamp: champ.question,
      phase: "envoi",
    });
    if (!signal) return;

    setErreur(null);
    setTronque(false);
    if (!suite) setAvant(valeur);
    assistant.ouvrirEnLigne(libelle, champ.cle);

    // Le texte de départ : vide en rédaction, l'existant en poursuite.
    const depart = suite ? valeur : "";
    let accumule = depart;
    let echec: string | null = null;
    let coupe = false;
    let recu = false;

    try {
      const flux = suite
        ? poursuivreChamp(state.tdrId, champ.cle, valeur, signal)
        : redigerChamp(state.tdrId, champ.cle, signal);

      for await (const ev of flux) {
        if (ev.type === "ancrage") {
          assistant.majTravail({
            phase: "envoi",
            detail: `Dossier lu — ${ev.groundedOn.length} élément${
              ev.groundedOn.length > 1 ? "s" : ""
            } pris en compte`,
          });
          assistant.majDerniere((b) => ({
            ...b,
            actes: [
              ...b.actes,
              {
                genre: "travail",
                libelle:
                  ev.mode === "reprise"
                    ? "Relecture de votre texte"
                    : "Lecture du dossier et de l’activité du plan",
              },
            ],
          }));
        } else if (ev.type === "phase") {
          assistant.majTravail({
            phase: ev.phase,
            detail: undefined,
            avancement: ev.avancement,
          });
        } else if (ev.type === "texte") {
          if (!recu) {
            recu = true;
            assistant.majTravail({ phase: "redaction", detail: undefined });
          }
          accumule += ev.delta;
          // Le texte s'écrit dans le champ à mesure qu'il arrive. Il n'est
          // pas révélé après coup : chaque fragment vient du serveur.
          ecrire(accumule, true);
          assistant.majDerniere((b) => ({ ...b, texte: accumule }));
        } else if (ev.type === "fin") {
          // Le texte définitif remplace ce qui a défilé : les fragments
          // montrent la rédaction en cours, mais ce qui RESTE dans le champ
          // ne doit porter aucun balisage — le document n'en rend aucun, et
          // « **Contexte** » y sortirait avec ses astérisques.
          //
          // GARDE : une fin VIDE n'écrase rien. Mesuré le 25 août 2026, le
          // modèle a consommé tout son plafond en réflexion et rendu zéro
          // caractère ; le champ était alors effacé et l'assistant
          // annonçait une réussite. Un texte de l'auteur ne se perd pas
          // sur une génération qui n'a rien produit.
          if (ev.texte.trim()) {
            accumule = ev.texte;
            ecrire(accumule, true);
          } else if (!accumule.trim()) {
            echec =
              "L’assistant n’a rien produit cette fois. Votre texte est intact — relancez.";
          }
          coupe = Boolean(ev.tronque);
        } else if (ev.type === "erreur") {
          echec = ev.message;
          break;
        }
      }
    } catch (e) {
      // Une interruption voulue n'est PAS un échec : ne rien dire de rouge
      // à quelqu'un qui vient d'appuyer sur « Arrêter ».
      if ((e as Error)?.name !== "AbortError") {
        echec = e instanceof Error ? e.message : "La proposition n’a pas abouti.";
      }
    } finally {
      assistant.terminer();
    }

    const interrompu = signal.aborted;

    if (echec && !interrompu) {
      // Le champ retrouve son état d'avant : une rédaction interrompue ne
      // doit pas laisser un demi-paragraphe à la place du texte de l'auteur.
      ecrire(depart || valeur, false);
      setAvant(null);
      // Formulé comme un geste : le message se lit contre le bouton qui le
      // lève, et « Service injoignable » n'indique aucune conduite à tenir.
      echec = messageDEchec(echec);
      setErreur(echec);
      assistant.majDerniere((b) => ({
        ...b,
        encours: false,
        actes: [...b.actes, { genre: "refus", libelle: echec! }],
      }));
      return;
    }

    if (interrompu) {
      // Ce qui est arrivé avant l'arrêt reste : l'auteur a vu le texte
      // s'écrire, le lui retirer serait incompréhensible. Il le garde, le
      // poursuit ou le rétablit — les trois gestes sont à sa portée.
      assistant.majDerniere((b) => ({
        ...b,
        encours: false,
        interrompu: true,
        tronque: accumule.trim().length > 0,
        champ: champ.cle,
        texte: accumule,
      }));
      if (accumule.trim()) {
        setTronque(true);
        void enregistrer(accumule);
      }
      return;
    }

    assistant.majDerniere((b) => ({
      ...b,
      encours: false,
      texte: accumule,
      tronque: coupe,
      champ: champ.cle,
      actes: [
        ...b.actes,
        { genre: "ecriture", libelle: `${champ.question} — rédigé`, champ: champ.cle },
      ],
    }));

    setTronque(coupe);

    void enregistrer(accumule);
  };

  /** Enregistre au serveur ce que l'assistant vient d'écrire. Voir `persist`. */
  const enregistrer = async (texte: string) => {
    if (!persist || !state.tdrId || !texte.trim()) return;
    try {
      await persist(
        { ...state, [champ.cle]: texte },
        {
          [champ.cle]: texte,
          aiAssisted: state.aiAssistedFields.includes(champ.cle)
            ? state.aiAssistedFields
            : [...state.aiAssistedFields, champ.cle],
        },
      );
    } catch {
      // L'échec d'enregistrement ne doit pas effacer le texte à l'écran :
      // il partira au changement d'étape, qui enregistre lui aussi.
      setErreur(
        "Le texte est à l’écran mais n’a pas pu être enregistré. Il le sera en passant à l’étape suivante.",
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[60rem] flex-col gap-6">
      <header className="max-w-[68ch]">
        <h3 className="text-heading-03 text-primary">{champ.question}</h3>
        <p className="text-body-lg text-secondary mt-3">{champ.aide}</p>
      </header>

      {/* Ce qu'on attend, juste avant d'écrire. C'était en colonne de
          droite, donc lu après coup — ou pas lu du tout. */}
      {champ.reperes && champ.reperes.length > 0 && (
        // Un filet coloré et des séparateurs : sans eux, ces repères se
        // lisaient comme du texte d'ambiance qu'on saute.
        <ul className="border-accent bg-accent-surface flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 px-4 py-2.5">
          {champ.reperes.map((r, i) => (
            <li key={r} className="text-caption text-secondary flex items-center gap-3">
              {i > 0 && (
                <span aria-hidden className="bg-border-subtle inline-block h-3 w-px" />
              )}
              {r}
            </li>
          ))}
        </ul>
      )}

      {gabarit && !valeur.trim() && (
        <div className="border-subtle bg-layer flex flex-wrap items-center gap-3 border p-3">
          <span className="text-caption text-secondary flex-1">
            Une trame existe pour ce type de marché, au référentiel. Aucun modèle
            n’intervient : c’est un point de départ à reprendre.
          </span>
          <button
            type="button"
            className="ptn-carte-liste border-strong text-caption text-primary hover:bg-layer-hover border px-3 py-1.5"
            onClick={() => ecrire(gabarit, false)}
          >
            Partir du gabarit
          </button>
        </div>
      )}

      <EditeurTexte
        valeur={valeur}
        onChange={(t) => {
          // Taper est déjà une réponse à l'échec : le message n'a plus lieu
          // d'être, et le garder reviendrait à commenter le travail en cours.
          if (erreur) setErreur(null);
          ecrire(t, false);
        }}
        placeholder={champ.placeholder}
        ariaLabel={champ.question}
        parLigne={champ.parLigne}
        enCours={nôtre}
        etat={etat}
        onArreter={assistant.interrompre}
        occupeAilleurs={ailleurs}
        desactive={!state.tdrId}
        desactiveRaison="Disponible une fois le brouillon ouvert, à l’étape Identification."
        onGenerer={() => void lancer(false)}
        erreur={erreur}
        onOuvrirAssistant={() => {
          assistant.setChampCourant(champ.question);
          assistant.ouvrir();
        }}
        onAnnuler={
          avant !== null
            ? () => {
                const v = avant;
                setAvant(null);
                setErreur(null);
                setTronque(false);
                // La marque de contribution reste : l'assistant a bien écrit
                // ici, et un relecteur doit continuer de le savoir.
                ecrire(v, false);
                void enregistrer(v);
              }
            : undefined
        }
      />

      {/* La rédaction s'est arrêtée en chemin : on propose de la POURSUIVRE.
          Tout refaire pour trois phrases manquantes était le reproche fait
          à l'outil, et c'était le seul geste offert. Le bouton se tient
          sous le texte, là où le regard arrive en constatant la coupure. */}
      {tronque && valeur.trim() && !ailleurs && !nôtre && (
        <div className="border-ai bg-ai-surface flex flex-wrap items-center gap-3 border p-3">
          <span className="text-caption text-ai-text flex-1">
            Le texte s’arrête avant sa fin. L’assistant peut le reprendre à
            l’endroit exact où il s’est interrompu, sans rien réécrire.
          </span>
          <button
            type="button"
            onClick={() => void lancer(true)}
            className="bg-ai hover:bg-ai-hover text-on-color ptn-carte-liste text-caption inline-flex items-center gap-2 px-3 py-1.5 font-medium transition-colors"
          >
            Poursuivre la rédaction
          </button>
        </div>
      )}

      {complement}
    </div>
  );
}
