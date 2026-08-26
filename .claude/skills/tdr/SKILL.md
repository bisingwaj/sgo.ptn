---
name: tdr
description: Règles du parcours de rédaction d'un TDR (Termes de Référence) — architecture des fichiers, les 18 étapes, l'assistance IA et ses interdits, invariants du dossier, pièges rencontrés. À charger avant toute intervention sur src/app/tdr, backend/src/tdr, backend/src/ai ou backend/src/tdr-document.
---

# TDR — le parcours de rédaction

Un TDR est une **pièce contractuelle**. Il part chez un bailleur, il fonde un
marché, et il faut pouvoir établir des années plus tard qui a écrit quoi — y
compris ce qu'une machine y a écrit. Tout ce qui suit en découle.

Le rattachement à une ligne du PTBA est obligatoire : voir la compétence
`ptba`, qui porte le verrou budgétaire en amont.

---

## 1. Architecture des fichiers

`TdrCreationClient.tsx` faisait 2 389 lignes. Le découpage est en cours, écran
par écran — méthode strangler du dépôt.

```
src/app/tdr/nouveau/
  TdrCreationClient.tsx    orchestrateur : chargements, steps[], persist
  etat.ts                  State, INITIAL, composition d'intitulé, gardes de type
  referentiel-ecran.ts     constantes de présentation (pas de source en base)
  assistant-contexte.tsx   le fil de l'assistant — mémoire partagée
  AgentPanel.tsx           le fil, en panneau. Une VUE, pas la mémoire
  etapes/
    EtapeType.tsx          01
    EtapeRattachement.tsx  02
    EtapeIdentification.tsx 03
    EtapeTexte.tsx         04-07, 10-12, 14 — écran générique d'un champ de texte
    EditeurTexte.tsx       la surface de rédaction (barre d'outils + page)
    champs-texte.ts        les 8 champs : question, aide, repères, consigne IA
    EtapeObjectifs.tsx     08
    EtapeLivrables.tsx     09
    EtapeCalendrier.tsx    13 — porte aussi le sélecteur de provinces
    EtapeExpertise.tsx     14 — EtapeTexte + les profils-clés en complément
    EtapeBudget.tsx        15 — situation de l'enveloppe, parts, glossaire
    ChampMontant.tsx       saisie groupée d'un montant (curseur préservé)
    ListeEntrees.tsx       liste ordonnée + saisie en modale
    LigneSelection.tsx     sélecteur en lignes (radiogroup)
```

**Les étapes restantes (16-18) vivent encore dans l'orchestrateur.** Les sortir
au fur et à mesure, dans `etapes/`.

`EtapeTexte` accepte un `complement` — ce qu'une section demande EN PLUS de sa
rédaction, rendu SOUS l'éditeur. C'est par là que les profils-clés
accompagnent l'expertise sans qu'un second écran générique soit écrit.

---

## 2. Les 18 étapes

```
01 Type d'activité      commande tout : bibliothèques, PGES, parcours, intitulé
02 Rattachement         la ligne du PTBA — la composante s'en DÉDUIT
03 Identification       intitulé + maîtrise d'ouvrage — LE BROUILLON NAÎT ICI
04 Contexte
05 Justification
06 Bénéficiaires
07 Résultats attendus
08 Objectifs SMART
09 Livrables
10 Approche
11 Méthodologie
12 Contraintes
13 Calendrier & couverture   date, durée, jours-homme, provinces
14 Expertise                 le 8e champ rédigé + les profils-clés
15 Budget                    enveloppe, parts, méthode déduite
16 Cadre & risques           ← encore dans l'orchestrateur
17 Sauvegardes E&S           ← idem
18 Revue & transmission      ← idem
```

**13 et 14 étaient une seule étape**, « Calendrier & expertise » : sept saisies
de trois natures, dont une rédaction longue prise entre deux compteurs. La
scinder a rendu son écran au huitième champ de texte, qui avait sa consigne au
serveur depuis le début sans jamais avoir eu d'assistance.

**Le brouillon naît à l'étape 03**, pas avant : sa création exige le type,
l'activité ET l'intitulé, et l'intitulé se compose de ce qui précède.

**Le `num` d'une étape est son identifiant.** Le `Wizard` repère les étapes
franchies par lui, pas par leur position — deux étapes portant le même `num`
cassent la progression. Après toute insertion, renuméroter ce qui suit.

---

## 3. Ce qui est fermé, et pourquoi

Le registre `backend/src/ai/field-registry.ts` est la **seule autorité** sur ce
que l'assistant peut écrire. Un champ absent n'existe pas pour lui.

| Fermé | Raison |
|---|---|
| Type de TDR, activité de rattachement | Ils ne décrivent pas le dossier, ils le **constituent**. `updateDraft` n'accepte pas `tdrTypeCode` |
| Les deux attestations | Actes personnels, horodatés par le serveur — antidater serait possible sinon |
| Catégorie E&S | Se constate par screening, ne se rédige pas |
| **Montants et dates** | « mets le budget à 3 M » est une dictée, « propose un budget » est une fabrication. Le socle proscrit la seconde |

Le canal **MGP-EAS/HS n'apparaît nulle part** dans le TDR : c'est le seul
endroit où le corpus interdit formellement l'IA générative.

### Le budget — ce que l'écran doit dire

Le plafond opposable n'est **pas** l'enveloppe de l'activité, c'est ce qu'il en
reste : les autres dossiers de la même ligne l'entament déjà, brouillons
compris. `GET /tdr/:id/enveloppe` porte cette situation, et
`TdrService.engagementAutresDossiers` en est la seule autorité — le contrôle de
complétude et l'écran s'y branchent tous les deux.

**Ne jamais recalculer ce cumul côté navigateur** : `GET /tdr` est restreint à
l'organisation de l'appelant, la somme y serait sous-estimée. Un disponible
trop généreux est pire que pas de disponible du tout.

La ventilation IDA/AFD de la ligne est une **référence, pas une règle**. Aucun
bouton ne la recopie dans le dossier : la source de financement d'un marché
relève de la décision fiduciaire, pas d'une règle de trois.

Montants : `formatUsd` (groupé, au dollar près, pour saisir et vérifier) et
`formatUsdCompact` (« 22 M USD », pour situer). Jamais de décimales — la donnée
est en dollars entiers, un « ,00 » promettrait une précision qu'elle n'a pas.

---

## 4. L'assistance — un seul module, deux surfaces

Il y a eu deux assistants concurrents, chacun avec son état, aucun ne voyant
l'autre, tous deux capables de viser le même champ. **Ne pas y revenir.**

- `assistant-contexte.tsx` porte le fil. C'est la mémoire.
- `AgentPanel` n'en est qu'une vue. On peut le fermer sans rien perdre.
- Une génération lancée depuis un champ **s'inscrit au fil** via
  `consignerEnLigne`, panneau ouvert ou non. C'est ce qui en fait un journal.

**Chemins serveur — un seul endroit fabrique le texte :**

```
prepareField()   consigne + ancrage + régime rédaction/reprise
   ├── proposeField()  → POST /assistance/champ          (un bloc)
   └── streamField()   → POST /assistance/champ/flux     (SSE)
```

Ne jamais dupliquer la construction du prompt : le texte d'un champ ne doit
pas dépendre de la porte par laquelle on le demande. Les huit champs de texte
ont leur consigne dans `CONSIGNES` ; un champ sans consigne est refusé.

**Le flux est réel, pas un effet.** Le texte s'écrit dans le champ à mesure
qu'il arrive. Ne jamais recevoir un texte complet pour le révéler lentement :
cela ajoute de l'attente à de l'attente.

**L'agent sait lire.** `lire_dossier` existe et la consigne lui impose de
l'appeler avant toute reprise. Sans lui, prié d'améliorer un texte, il
demandait à l'auteur de le lui recopier.

**UN SEUL ÉTAT DE TRAVAIL.** `assistant-contexte` porte `travail` — origine,
champ visé, phase, et le contrôleur d'interruption. Les deux surfaces le
lisent et s'y désactivent. Le fil était partagé, l'ACTIVITÉ ne l'était pas :
on lançait une rédaction au bouton pendant que le fil écrivait dans le même
champ. `demarrer()` rend `null` si une demande court déjà — c'est le verrou,
et il est dans le contexte pour qu'on ne puisse pas l'oublier.

**Ce que l'assistant écrit part au serveur SANS ATTENDRE.** Le `commit` d'une
étape ne se déclenche qu'au bouton « Suivant » ; le rail n'enregistre rien.
Une écriture de l'agent déclenche `alignerSurLaBase`, qui relit la base — et
effaçait le texte engendré resté en mémoire. La relecture ne porte plus que
sur **les champs réellement écrits**.

**Rédiger n'est pas délibérer.** `raisonnement: 'aucun'` sur les chemins de
rédaction : chez ce fournisseur `max_tokens` couvre la réflexion, qui dévorait
le plafond et coupait le texte. L'agent la garde — il choisit des outils.

**Une liste s'AJOUTE.** `ecrire_champ` prend `mode: 'ajouter' | 'remplacer'`,
et le défaut est l'ajout. Il effaçait tout et réécrivait : « ajoute deux
livrables » supprimait ceux que l'auteur avait saisis. Le bouton de l'étape,
lui, ajoutait — deux portes, deux comportements opposés sur la même donnée.

**Une capacité de modèle se LIT.** `GET /ai/capacites`, depuis le catalogue du
fournisseur. Ne jamais coder en dur qu'une fonctionnalité marche : le modèle
configuré ne lit pas les pièces jointes, et les lui envoyer faisait échouer
l'appel ENTIER par un 404.

**Toute contribution laisse une marque.** `aiAssistedFields`, en union, jamais
en retrait — l'auteur peut réécrire par-dessus, la contribution a eu lieu, et
le document produit la rend.

---

## 5. Ce que le document rend

`GET /tdr/:id/document/apercu` rend le PLAN ; `GET /tdr/:id/document` rend le
fichier (PDF par défaut, `?format=docx`). Trois rendus, un seul plan — le PDF,
le DOCX et l'écran `/tdr/[id]/document` doivent dire la même chose. Ne jamais
recomposer côté navigateur : deux versions d'une pièce contractuelle
circuleraient en se contredisant.

Le plan est un DOCUMENT COMPOSÉ, non une charge utile d'API : il porte sa date
en toutes lettres, ses titres en français, son statut et ses champs assistés en
clair. La règle « l'API transporte des données » vaut pour les ressources, pas
pour la pièce elle-même.

Un fichier se récupère en `fetch` puis par URL d'objet (`enregistrerFichier`,
`src/lib/telechargement.ts`) : un `<a href>` nu ne porte pas d'en-tête
`Authorization`, et le document est derrière une permission.

L'impression passe par `/tdr/[id]/document`, jamais par la fiche : la fiche est
un écran de travail, le document est la pièce. `[data-document]` lève la règle
« ne pas couper une section » de `globals.scss`, faite pour des cartes — sans
quoi un document de sept feuillets refuse de se paginer.



`backend/src/tdr-document/document-plan.ts` connaît quatre genres de bloc :
`paragraphe`, `liste`, `definitions`, `absent`. **Aucun balisage** — ni gras,
ni italique, ni titre.

Conséquence tenue : la barre d'outils de l'éditeur ne porte **aucun bouton de
mise en forme**. Des boutons B / I seraient des boutons sans effet.

Quatre champs s'écrivent une entrée par ligne et sortent en `liste` :
`expectedResults`, `methodology`, `constraints`, `expertise`. Les marqueurs de
tête sont retirés à la composition — le document porte sa propre puce.
`approach` reste de la prose : elle expose une voie, elle ne s'énumère pas.

---

## 6. Règles d'écran

- **Une colonne.** L'écran en a compté quatre ; l'œil ne savait plus où se
  poser. Le panneau de l'assistant est la seule seconde colonne, repliée par
  défaut, et sa gouttière vaut **0 px** quand elle l'est.
- **Une question, pas un libellé.** « Contexte » n'apprend rien à qui hésite.
- **Les repères disent surtout ce qu'il ne faut PAS mettre là.** C'est ce qui
  empêche les sections de se recopier — défaut le plus fréquent.
- **Une liste se lit, elle ne se remplit pas.** Une ligne par entrée, saisie en
  modale. La modale refuse un énoncé vide : une entrée existe ou n'existe pas.
  Sinon on ouvre trois entrées vides et le compteur les compte.
- **Sélecteurs en lignes, pas en tuiles.** Onze tuiles obligent à défiler pour
  comparer, ce qui est l'inverse d'un choix éclairé. `LigneSelection` porte la
  sémantique `radiogroup` que des boutons côte à côte n'ont pas.
- **Pendant une génération lancée d'un champ**, la saisie se ferme et un repère
  discret le dit. Le fil, lui, ne bloque rien — on peut poser une question sans
  cesser d'écrire.

---

## 7. Pièges rencontrés — chacun a coûté du temps

| Piège | Ce qui se passe |
|---|---|
| **Découper par appariement d'accolades** | S'arrête sur la déstructuration des paramètres, pas sur le corps. A cassé le fichier trois fois. **Repérer les bornes par lecture, supprimer par plages de lignes** |
| **`git checkout --` pour annuler une erreur** | Efface aussi tout le travail non commité du même fichier. Commiter avant d'expérimenter |
| **`nest build` pendant que `start:dev` tourne** | Les deux se disputent `dist/`, le serveur meurt sur un module introuvable. Utiliser `npx tsc --noEmit` pour vérifier sans toucher à `dist/` |
| **Règle CSS hors couche** | `:focus-visible` de `globals.scss` bat toute utilitaire Tailwind. Neutraliser par une règle de même nature |
| **Enfant flex sans `min-h-0`** | Grandit avec son contenu au lieu de défiler, et pousse ses voisins hors du cadre |
| **Carbon `min-block-size`** | L'emporte sur `h-8` : un carré s'étire en rectangle. Neutraliser explicitement |
| **Jetons de raisonnement** | `max_tokens` les COMPTE chez OpenRouter. Un plafond « suffisant » ne l'est pas : le modèle peut tout consommer en réflexion et rendre zéro caractère |
| **Une fin vide écrasait le champ** | `fin` avec un texte vide était écrit tel quel : le texte de l'auteur disparaissait et l'assistant annonçait une réussite. Ne jamais écrire une proposition vide |
| **Contrôle négatif sans témoin** | Un jeton expiré rend un 401 dont le corps se lit comme un dossier vide. Toute lecture d'API doit vérifier un champ TÉMOIN — la référence, par exemple — avant de conclure à l'absence |
| **Panneau démonté = flux tué** | Le contrôleur vivait dans `AgentPanel`, que `if (!ouvert) return null` démonte. Fermer l'assistant interrompait la génération, à rebours de ce que le module promet. Il vit dans le contexte |
| **Largeur d'un panneau** | Elle appartient à la grille du `Wizard`, pas au panneau : celui-ci ne peut pas s'élargir seul, et le bouton ne changeait que son pictogramme |

---

## 8. Vérifier

```bash
npx tsc --noEmit                    # front
npx eslint src/app/tdr/nouveau      # ligne de base : 5 problèmes, tous hérités
npm run build

cd backend
npx tsc --noEmit -p tsconfig.json   # sans toucher à dist/
npm run start:dev                   # --watch, sinon le serveur sert du périmé
```

**Le code nouvellement écrit passe sans erreur.** Comparer au besoin avec
`git stash` pour distinguer l'hérité de ce qu'on vient d'introduire.

Une route froide met 30 à 60 s en `dev` : la chauffer avant tout test
navigateur, sinon les échecs sont des faux positifs.
