/**
 * Analyse du balisage léger produit par le modèle.
 *
 * Séparé du rendu à dessein : ce qui décide où commence un gras est de la
 * logique pure, et de la logique pure se vérifie en l'exécutant. Le
 * composant qui s'en sert ne fait plus que traduire l'arbre en éléments.
 *
 * SOUS-ENSEMBLE VOLONTAIREMENT ÉTROIT — gras, italique, code, listes à
 * puces et numérotées, intitulés, paragraphes. Ni liens, ni images, ni
 * tableaux, ni citations. Ce qui n'est pas reconnu ressort tel qu'écrit :
 * aucun texte ne se perd jamais, ce qui est la seule garantie qui compte
 * quand la source est un modèle.
 */

/** Un fragment de ligne, éventuellement mis en forme. */
export type Fragment =
  | { genre: "texte"; texte: string }
  | { genre: "gras"; enfants: Fragment[] }
  | { genre: "italique"; enfants: Fragment[] }
  | { genre: "code"; texte: string };

/** Un bloc de texte. */
export type Bloc =
  | { genre: "paragraphe"; lignes: Fragment[][] }
  | { genre: "intitule"; fragments: Fragment[] }
  | { genre: "liste"; ordonnee: boolean; entrees: Fragment[][] };

/**
 * Un marqueur ouvre-t-il vraiment ?
 *
 * Sans cette règle, un texte administratif ordinaire se déforme : « (*) voir
 * annexe » passerait en italique, et « 2 * 3 » aussi. On exige donc que
 * l'ouverture suive un début de ligne ou une espace, et que le caractère
 * suivant n'en soit pas une.
 */
function ouvre(texte: string, i: number, taille: number): boolean {
  const avant = i === 0 ? " " : texte[i - 1];
  const apres = texte[i + taille];
  return /\s/.test(avant) && apres !== undefined && !/\s/.test(apres);
}

/**
 * Un marqueur ferme-t-il vraiment ?
 *
 * Symétrique : le caractère précédent n'est pas une espace, le suivant est
 * une fin de ligne, une espace ou une ponctuation. « 3**4 » ne ferme donc
 * rien et reste écrit tel quel.
 */
function ferme(texte: string, i: number, taille: number): boolean {
  const avant = texte[i - 1];
  const apres = texte[i + taille];
  return (
    avant !== undefined && !/\s/.test(avant) && (apres === undefined || /[\s.,;:!?)\]»…]/.test(apres))
  );
}

const MARQUEURS: Array<{ signe: string; genre: "gras" | "italique" | "code" }> = [
  // Le gras en premier : sinon « ** » serait lu comme deux italiques.
  { signe: "**", genre: "gras" },
  { signe: "__", genre: "gras" },
  { signe: "*", genre: "italique" },
  { signe: "_", genre: "italique" },
  { signe: "`", genre: "code" },
];

/**
 * Le balisage à l'intérieur d'une ligne.
 *
 * Un marqueur sans fermeture reste du texte. C'est ce qui rend le rendu
 * supportable PENDANT que la réponse s'écrit : le texte arrive par
 * fragments, et « **Activité » s'affiche littéralement jusqu'à ce que la
 * paire soit complète. Le mot bascule alors en gras d'un coup, sans que
 * rien n'ait jamais disparu de l'écran.
 */
export function enligne(texte: string): Fragment[] {
  const sortie: Fragment[] = [];
  let reste = texte;

  while (reste.length > 0) {
    let trouve: { debut: number; fin: number; signe: string; genre: string } | null = null;

    for (let i = 0; i < reste.length && !trouve; i += 1) {
      const marqueur = MARQUEURS.find((m) => reste.startsWith(m.signe, i));
      if (!marqueur) continue;

      // Le code littéral n'a pas de règle de flanc : ce qu'il entoure peut
      // commencer et finir par n'importe quoi.
      const litteral = marqueur.genre === "code";
      if (!litteral && !ouvre(reste, i, marqueur.signe.length)) continue;

      const depart = i + marqueur.signe.length;
      for (let j = depart; j < reste.length; j += 1) {
        if (!reste.startsWith(marqueur.signe, j)) continue;
        if (j === depart) continue; // paire vide : « **** »
        if (!litteral && !ferme(reste, j, marqueur.signe.length)) continue;
        trouve = { debut: i, fin: j, signe: marqueur.signe, genre: marqueur.genre };
        break;
      }
    }

    if (!trouve) {
      if (reste) sortie.push({ genre: "texte", texte: reste });
      break;
    }

    if (trouve.debut > 0) sortie.push({ genre: "texte", texte: reste.slice(0, trouve.debut) });

    const dedans = reste.slice(trouve.debut + trouve.signe.length, trouve.fin);
    if (trouve.genre === "code") {
      sortie.push({ genre: "code", texte: dedans });
    } else if (trouve.genre === "gras") {
      // Récursif : un gras peut porter de l'italique.
      sortie.push({ genre: "gras", enfants: enligne(dedans) });
    } else {
      sortie.push({ genre: "italique", enfants: enligne(dedans) });
    }

    reste = reste.slice(trouve.fin + trouve.signe.length);
  }

  return sortie;
}

/** Une ligne de liste : « - texte », « • texte », « 1. texte ». */
function puce(ligne: string): { ordonnee: boolean; contenu: string } | null {
  const point = /^ {0,3}[-*•]\s+(.*)$/.exec(ligne);
  if (point) return { ordonnee: false, contenu: point[1] };
  const chiffre = /^ {0,3}\d{1,2}[.)]\s+(.*)$/.exec(ligne);
  if (chiffre) return { ordonnee: true, contenu: chiffre[1] };
  return null;
}

/** Découpe le texte en blocs, chacun déjà analysé. */
export function analyser(texte: string): Bloc[] {
  const blocs: Bloc[] = [];
  let paragraphe: Fragment[][] = [];
  let liste: { ordonnee: boolean; entrees: Fragment[][] } | null = null;

  const viderParagraphe = () => {
    if (paragraphe.length === 0) return;
    blocs.push({ genre: "paragraphe", lignes: paragraphe });
    paragraphe = [];
  };

  const viderListe = () => {
    if (!liste) return;
    blocs.push({ genre: "liste", ordonnee: liste.ordonnee, entrees: liste.entrees });
    liste = null;
  };

  for (const ligne of texte.split("\n")) {
    const p = puce(ligne);

    if (p) {
      viderParagraphe();
      // Une puce numérotée ne rejoint pas une liste à puces, ni l'inverse :
      // deux listes se suivent alors, ce qui est la vérité du texte.
      if (liste && liste.ordonnee !== p.ordonnee) viderListe();
      liste ??= { ordonnee: p.ordonnee, entrees: [] };
      liste.entrees.push(enligne(p.contenu));
      continue;
    }

    viderListe();

    if (ligne.trim() === "") {
      viderParagraphe();
      continue;
    }

    // Un intitulé de section garde son texte et le poids d'un intitulé, sans
    // hiérarchie de titres : le panneau est une conversation, pas un
    // document.
    const titre = / {0,3}#{1,6}\s+(.*)$/.exec(ligne);
    if (titre) {
      viderParagraphe();
      blocs.push({ genre: "intitule", fragments: enligne(titre[1]) });
      continue;
    }

    paragraphe.push(enligne(ligne));
  }

  viderListe();
  viderParagraphe();
  return blocs;
}
