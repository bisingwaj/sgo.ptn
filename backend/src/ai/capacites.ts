/**
 * Ce que le modèle configuré sait réellement faire.
 *
 * Une fonctionnalité de l'écran ne doit jamais dépendre d'une capacité
 * SUPPOSÉE du modèle. Le bouton « Joindre une pièce » l'a montré : il
 * versait des PDF depuis des mois vers `deepseek-v4-flash-0731`, qui
 * déclare `input_modalities: ["text"]` et ne les a jamais lus. Personne
 * n'était prévenu — ni l'auteur, qui croyait son modèle pris en compte, ni
 * le journal, qui n'enregistrait aucun refus.
 *
 * Le corps du dépôt l'interdit en toutes lettres : « rien qui suggère une
 * conséquence qu'il n'a pas ».
 *
 * La capacité se LIT donc au catalogue du fournisseur, elle ne se code pas
 * en dur. Conséquence voulue : changer `OPENROUTER_MODEL` en configuration
 * suffit à rallumer le bouton, sans toucher au code ni redéployer l'écran.
 * C'est la première pierre du réglage de l'assistant.
 *
 * Le catalogue est PUBLIC — aucune clé n'est nécessaire pour le lire. La
 * clé ne sert qu'à la génération elle-même.
 */

/** Ce dont l'écran a besoin pour n'offrir que ce qui marche. */
export interface CapacitesModele {
  /** L'identifiant tel qu'il est configuré, à afficher en clair. */
  modele: string;
  /** Le nom lisible au catalogue, quand il est connu. */
  intitule?: string;
  /** Le modèle lit-il une image ? */
  image: boolean;
  /** Le modèle lit-il un fichier joint — un PDF, typiquement ? */
  fichier: boolean;
  /** Le modèle sait-il appeler un outil ? Sans cela, l'agent n'écrit rien. */
  outils: boolean;
  /** Fenêtre de contexte, en jetons. */
  contexte?: number;
  /**
   * Pourquoi les pièces ne sont pas soumises, dit à l'auteur.
   *
   * Rendu tel quel à l'écran : le motif appartient au serveur, qui seul
   * sait quel modèle est configuré. L'écran ne l'invente pas.
   */
  motifPiecesFermees?: string;
  /**
   * Vrai quand le catalogue n'a pas pu être lu. On ne prétend alors ni que
   * ça marche, ni que ça ne marche pas — et l'on ne ferme rien sur une
   * panne de réseau passagère.
   */
  indetermine: boolean;
}

const CATALOGUE = 'https://openrouter.ai/api/v1/models';

/** Une entrée du catalogue, réduite à ce qu'on en lit. */
interface EntreeCatalogue {
  id?: string;
  name?: string;
  context_length?: number;
  architecture?: { input_modalities?: string[] };
  supported_parameters?: string[];
}

/**
 * Interroge le catalogue et en déduit les capacités du modèle configuré.
 *
 * Un échec ne lève pas : le catalogue est un service tiers, et son
 * indisponibilité ne doit pas empêcher de rédiger. On rend alors
 * `indetermine`, que l'écran traduit par une réserve honnête plutôt que
 * par une promesse ou un refus.
 */
export async function lireCapacites(
  modele: string,
  timeoutMs = 8_000,
): Promise<CapacitesModele> {
  const inconnu = (raison: string): CapacitesModele => ({
    modele,
    // Sans catalogue, on ne ferme pas les outils : l'agent fonctionne, et
    // le prétendre incapable romprait l'assistance pour une panne de
    // réseau. Les pièces, elles, se ferment — verser un fichier qui ne
    // sera peut-être pas lu est le cas que l'on cherche à supprimer.
    image: false,
    fichier: false,
    outils: true,
    indetermine: true,
    motifPiecesFermees: raison,
  });

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), timeoutMs);
  try {
    const reponse = await fetch(CATALOGUE, { signal: controleur.signal });
    if (!reponse.ok) {
      return inconnu(
        'Les capacités du modèle n’ont pas pu être vérifiées auprès du fournisseur.',
      );
    }
    const charge = (await reponse.json()) as { data?: EntreeCatalogue[] };
    const entree = charge.data?.find((m) => m.id === modele);

    if (!entree) {
      return {
        ...inconnu(
          `Le modèle « ${modele} » ne figure pas au catalogue du fournisseur.`,
        ),
        indetermine: true,
      };
    }

    const entrees = entree.architecture?.input_modalities ?? ['text'];
    const image = entrees.includes('image');
    const fichier = entrees.includes('file');
    const outils = (entree.supported_parameters ?? []).includes('tools');

    return {
      modele,
      intitule: entree.name,
      image,
      fichier,
      outils,
      contexte: entree.context_length,
      indetermine: false,
      motifPiecesFermees:
        image || fichier
          ? undefined
          : // Le motif nomme le modèle : c'est ce qui permet à l'auteur de
            // comprendre que la limite tient à la configuration, et qu'elle
            // se lève en la changeant.
            `Le modèle configuré (${entree.name ?? modele}) ne lit que du texte : ` +
            `une pièce jointe ne lui serait pas soumise. Elle peut être conservée au ` +
            `dossier, mais l’assistant n’en tiendrait aucun compte.`,
    };
  } catch {
    return inconnu(
      'Les capacités du modèle n’ont pas pu être vérifiées : le catalogue du fournisseur est injoignable.',
    );
  } finally {
    clearTimeout(minuteur);
  }
}
