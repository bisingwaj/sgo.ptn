"use client";

/**
 * L'assistant du dossier — un seul module, deux surfaces.
 *
 * Il y avait deux assistants : un bouton en ligne dans chaque champ, et un
 * panneau conversationnel en colonne. Chacun tenait son propre état, aucun
 * ne voyait ce que l'autre écrivait, et tous deux pouvaient viser le même
 * champ — le dernier écrivait, sans que rien ne le signale.
 *
 * Le fil de conversation vit désormais ici. Une génération lancée depuis un
 * champ s'y inscrit exactement comme si elle avait été demandée au panneau :
 * l'auteur qui ouvre l'assistant retrouve tout ce qui a été fait sur son
 * dossier, dans l'ordre. C'est aussi ce qui en fait un journal.
 *
 * La règle qui décide du reste : le fil est la mémoire, le panneau n'en est
 * qu'une vue. On peut le fermer sans rien perdre.
 *
 * ── CE QUI MANQUAIT, ET QUI EST ICI DÉSORMAIS ──────────────────────────
 *
 * Le fil était partagé, mais PAS le fait de travailler. Le bouton tenait
 * son `enCours` dans l'étape, le panneau son `occupe` dans le panneau, et
 * aucun des deux ne voyait l'autre : on lançait une rédaction au bouton
 * pendant que le fil écrivait dans le même champ, et le dernier arrivé
 * gagnait sans que rien ne le dise. C'était exactement le défaut que le
 * regroupement du fil prétendait avoir corrigé.
 *
 * `travail` est donc UNIQUE, et il porte tout ce dont les deux surfaces ont
 * besoin : d'où part la demande, sur quel champ, où elle en est, et de quoi
 * l'interrompre. Une seule règle en découle et elle se tient partout :
 * TANT QUE `travail` N'EST PAS NUL, RIEN D'AUTRE NE PART.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface Ecriture {
  champ: string;
  etape: string;
  valeur: unknown;
  avant: unknown;
}

/**
 * Où en est l'assistant, dit à l'auteur.
 *
 * `reflexion` n'est pas un ornement : le modèle configuré pense sept
 * secondes avant d'écrire son premier mot — mesuré — et l'écran ne le
 * disait pas. Un écran muet pendant la moitié de l'attente ne se distingue
 * pas d'une panne, et c'est ce qui poussait à relancer une génération qui
 * fonctionnait.
 */
export type Phase = "envoi" | "reflexion" | "redaction" | "outil";

export interface Travail {
  /** D'où part la demande — le bouton d'un champ, ou le fil. */
  origine: "champ" | "fil";
  /** Clé du champ visé, quand la demande en vise un. */
  champ?: string;
  /** Ce champ, tel que l'auteur le lit. */
  libelleChamp?: string;
  phase: Phase;
  /** Ce qui se passe, en clair : « Lecture de l'activité A1.1.1 ». */
  detail?: string;
  /** Signes de réflexion produits — jamais la réflexion elle-même. */
  avancement?: number;
}

export interface Bulle {
  role: "user" | "assistant";
  texte: string;
  /** Ce que l'assistant a fait pendant ce tour */
  actes: Array<{
    genre: "travail" | "ecriture" | "refus";
    libelle: string;
    champ?: string;
  }>;
  /** Écritures de ce tour, pour l'annulation */
  ecritures: Ecriture[];
  encours?: boolean;
  /** Marque une action lancée depuis un champ, non depuis le fil. */
  enLigne?: boolean;
  /**
   * La rédaction a été coupée faute de place. Le fil propose alors de la
   * poursuivre : refaire tout un paragraphe pour trois phrases manquantes
   * est ce que l'auteur reprochait à l'outil.
   */
  tronque?: boolean;
  /** Le champ visé, pour savoir quoi poursuivre. */
  champ?: string;
  /** L'auteur a interrompu de lui-même : ce n'est pas une panne. */
  interrompu?: boolean;
}

interface Assistant {
  ouvert: boolean;
  ouvrir: () => void;
  fermer: () => void;
  basculer: () => void;

  /**
   * Le panneau occupe toute la surface de travail.
   *
   * Un fil de conversation est illisible dans un rail de 380 px dès qu'il
   * porte un récapitulatif ou une liste. L'auteur peut l'étendre le temps
   * de lire, puis le rendre à sa colonne.
   */
  etendu: boolean;
  basculerEtendu: () => void;

  bulles: Bulle[];
  setBulles: React.Dispatch<React.SetStateAction<Bulle[]>>;

  /** Champ sur lequel l'auteur travaille — affiché en tête du panneau. */
  champCourant: string | null;
  setChampCourant: (c: string | null) => void;

  /* ---- L'activité, partagée par les deux surfaces ---- */

  /** Non nul dès qu'une demande est en vol, d'où qu'elle parte. */
  travail: Travail | null;
  /** Raccourci de lecture : `travail !== null`. */
  occupe: boolean;

  /**
   * Ouvre une activité et rend le signal d'interruption.
   *
   * Rend `null` si une autre activité court déjà : c'est le verrou, et il
   * est ici plutôt que dans chaque appelant pour qu'on ne puisse pas
   * l'oublier.
   */
  demarrer: (t: Travail) => AbortSignal | null;
  /** Fait avancer l'état affiché sans rouvrir l'activité. */
  majTravail: (m: Partial<Travail>) => void;
  terminer: () => void;
  /** L'auteur arrête. Les deux surfaces portent ce geste. */
  interrompre: () => void;

  /**
   * Ouvre un tour au fil pour une action lancée DEPUIS UN CHAMP.
   *
   * La consignation avait lieu à la FIN, d'un bloc : le fil restait
   * immobile pendant toute la rédaction puis tout apparaissait d'un coup.
   * On ne pouvait donc pas savoir où une génération avait échoué — ce qui
   * est précisément ce qu'on demande à un journal.
   */
  ouvrirEnLigne: (demande: string, champ: string) => void;
  /** Met à jour la dernière bulle de l'assistant. */
  majDerniere: (f: (b: Bulle) => Bulle) => void;
}

const Ctx = createContext<Assistant | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const [etendu, setEtendu] = useState(false);
  const [bulles, setBulles] = useState<Bulle[]>([]);
  const [champCourant, setChampCourant] = useState<string | null>(null);
  const [travail, setTravail] = useState<Travail | null>(null);

  // Le contrôleur vit dans une ref et non dans l'état : l'interrompre ne
  // doit pas dépendre d'un rendu, et une ref reste jointe même si la
  // surface qui a lancé la demande a été démontée entre-temps. C'est ce
  // qui permet de fermer le panneau sans tuer la génération en cours.
  const abandon = useRef<AbortController | null>(null);

  const majDerniere = useCallback((f: (b: Bulle) => Bulle) => {
    setBulles((tout) => tout.map((b, i) => (i === tout.length - 1 ? f(b) : b)));
  }, []);

  const demarrer = useCallback((t: Travail): AbortSignal | null => {
    // Le verrou. Deux demandes concurrentes sur le même dossier écrivaient
    // dans le même champ sans se voir.
    if (abandon.current) return null;
    const controleur = new AbortController();
    abandon.current = controleur;
    setTravail(t);
    return controleur.signal;
  }, []);

  const majTravail = useCallback((m: Partial<Travail>) => {
    setTravail((t) => (t ? { ...t, ...m } : t));
  }, []);

  const terminer = useCallback(() => {
    abandon.current = null;
    setTravail(null);
  }, []);

  const interrompre = useCallback(() => {
    // On n'efface pas l'état ici : la boucle qui lit le flux verra son
    // signal coupé, fera son ménage et appellera `terminer`. Le faire des
    // deux côtés laisserait passer une seconde demande dans l'intervalle.
    abandon.current?.abort();
  }, []);

  const ouvrirEnLigne = useCallback((demande: string, champ: string) => {
    setBulles((b) => [
      ...b,
      { role: "user", texte: demande, actes: [], ecritures: [], enLigne: true },
      {
        role: "assistant",
        texte: "",
        actes: [],
        ecritures: [],
        encours: true,
        enLigne: true,
        champ,
      },
    ]);
  }, []);

  const valeur = useMemo<Assistant>(
    () => ({
      ouvert,
      ouvrir: () => setOuvert(true),
      fermer: () => setOuvert(false),
      basculer: () => setOuvert((v) => !v),
      etendu,
      basculerEtendu: () => setEtendu((v) => !v),
      bulles,
      setBulles,
      champCourant,
      setChampCourant,
      travail,
      occupe: travail !== null,
      demarrer,
      majTravail,
      terminer,
      interrompre,
      ouvrirEnLigne,
      majDerniere,
    }),
    [
      ouvert,
      etendu,
      bulles,
      champCourant,
      travail,
      demarrer,
      majTravail,
      terminer,
      interrompre,
      ouvrirEnLigne,
      majDerniere,
    ],
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

/**
 * Un échec, formulé comme une CONSIGNE et non comme un constat.
 *
 * Les messages du serveur décrivent une panne — « Service de génération
 * injoignable. » — ce qui est exact et parfaitement inutile : l'auteur
 * apprend qu'il y a un problème, pas ce qu'il doit faire. Or ce message
 * s'affiche à côté du bouton qui le lève, et c'est là toute son utilité.
 *
 * On n'invente rien et on ne masque rien : le motif du serveur est
 * conservé mot pour mot, on lui ajoute le geste. Sauf s'il en porte déjà
 * un — inutile de dire deux fois de réessayer.
 *
 * Deux cas ne prennent PAS d'invitation à relancer : ce qui ne marchera
 * pas mieux au second essai. Proposer de recommencer y serait une fausse
 * promesse, et c'est ce que le corps du dépôt appelle une conséquence
 * suggérée qu'on n'a pas.
 */
export function messageDEchec(brut: string): string {
  const m = brut.trim();
  if (!m) return "La proposition n’a pas abouti. Relancez.";

  // Déjà porteur d'une consigne : on n'en rajoute pas.
  if (/relanc|réessay|reformul|poursuiv|à la main|saisir/i.test(m)) return m;

  // Panne de configuration : relancer n'y changera rien, c'est au serveur
  // d'être corrigé. Le dire franchement vaut mieux qu'un espoir.
  if (/configur|clé|non configurée/i.test(m)) return m;

  return `${m.replace(/\.$/, "")}. Relancez : le dossier n’a pas bougé.`;
}

export function useAssistant(): Assistant {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAssistant hors de AssistantProvider");
  return v;
}
