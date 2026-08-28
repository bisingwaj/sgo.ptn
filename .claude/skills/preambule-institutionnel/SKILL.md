---
name: preambule-institutionnel
description: Le préambule fixe des TDR de l'UGPTN — 848 mots identiques d'un dossier à l'autre, à composer verbatim et jamais à engendrer. Où il vit, comment il se met à jour, ce qui arrive si on le laisse au modèle. À charger avant toute intervention sur la composition du document (backend/src/tdr-document) ou sur la consigne du champ context.
---

# Le préambule institutionnel — composé, jamais rédigé

**À traiter EN PREMIER.** Tant que ces 848 mots ne sont pas composés depuis le
corpus, enrichir la consigne du contexte revient à demander au modèle de
réécrire un texte qui existe déjà — le pire des deux mondes : le coût de la
génération et le risque de la dérive, pour un résultat connu d'avance.

---

## 1. Le fait mesuré

Relevé le 28 août 2026 sur trois TDR de la composante C3 (`~/Downloads/tdr`).

```
Contexte Général                              ─┐
Description du Projet de Transformation …      │  18 §  ·  5 092 caractères
Composantes du Projet                          │  ~848 mots
Portée Géographique du Projet                 ─┘  IDENTIQUES À 100,0 %

Contexte et Justification Spécifique de …        3 §  ·  192 à 382 mots
```

Similarité deux à deux, sur les trois documents : **100,0 %**, octet pour
octet. Ce n'est pas « très proche ». C'est le même texte.

Le texte relevé vit dans
[`documents/preambule-institutionnel-tdr.md`](../../../documents/preambule-institutionnel-tdr.md).

---

## 2. Pourquoi il ne s'engendre pas

Trois raisons, par ordre de gravité.

### La dérive silencieuse — la seule qui compte vraiment

Le préambule porte des valeurs chiffrées issues du PAD :

> « Le taux de pénétration du haut débit est actuellement estimé à environ
> **15,4 %**, sur la base des abonnements uniques, et les réseaux mobiles à
> large bande ne couvrent qu'**environ la moitié** de la population, tandis
> que les prix de détail du haut débit figurent **parmi les plus élevés du
> continent africain**. »

Un modèle qui reformule écrira un jour 15,7 %, ou « moins de la moitié », ou
« les plus élevés d'Afrique ». Chacune de ces variantes est plausible, aucune
n'est signalée, et le dossier part chez le bailleur. **Ces valeurs se citent,
elles ne se reformulent pas.**

`PROHIBITIONS` interdit déjà de « calculer, arrondir, extrapoler » — mais
autorise à « citer tels quels les chiffres qui vous sont communiqués ».
Reformuler un paragraphe qui les contient est précisément la zone grise où
l'interdit ne mord pas.

### La divergence entre dossiers

Deux TDR partis chez le même bailleur, la même semaine, avec deux descriptions
différentes du même projet. C'est visible en revue, et c'est imputable à
l'outil, pas au rédacteur.

### Le coût

848 mots engendrés par dossier, pour un texte connu. À ~1 200 jetons de sortie
et une génération par TDR, c'est de la dépense pure.

---

## 2 bis. FAIT — où il vit réellement

Implémenté le 28 août 2026 dans
[`backend/src/tdr-document/preambule-institutionnel.ts`](../../../backend/src/tdr-document/preambule-institutionnel.ts) :
18 blocs (`sousTitre` × 4, `paragraphe` × 14), 5 106 caractères, aucun
balisage résiduel. Composé en tête de la section 1 par `document-plan.ts`.

**Une CONSTANTE, et non la table de gabarits décrite plus bas.** Ce choix
s'écarte de ce que cette compétence préconisait, pour une raison qui la
corrige : une invite modifiable en base SANS versionnement détruit la
propriété d'audit — savoir des années plus tard quel texte a produit quelle
pièce. Le commit git date le texte et le rend opposable, sans exiger la
machinerie de publication. La table viendra avec l'atelier des invites, qui
apporte versions et publication ; pas avant.

La section 1 s'appelle désormais **« Contexte et Justification »**, comme dans
les dossiers réels, et la justification y est devenue une sous-section au lieu
d'une section propre — elle invitait à se lire comme un second contexte, ce
que sa consigne combat depuis toujours. Les sections suivantes ont été
renumérotées de 2 à 11.

---

## 3. Où il devra vivre plus tard

Deux options, et la seconde est préférable.

| Option | Pour | Contre |
|---|---|---|
| `DocumentReference` du corpus | Réutilise l'écran `/admin/documents`, le versionnement et la mise hors vigueur existants | Le corpus est fait pour être **consulté par l'assistant**, pas inséré dans une pièce |
| **Table de gabarits** (`GabaritSection`) | Sémantique juste : c'est un fragment de document, pas une source | Une table de plus |

**Retenir la seconde.** Un gabarit et une source documentaire ne se gouvernent
pas pareil : le premier est inséré tel quel dans une pièce contractuelle, la
seconde est lue pour informer. Les confondre finirait par faire insérer un
extrait de MEP dans un TDR.

```
GabaritSection
  cle             'preambule_institutionnel'
  titre           'Contexte et Justification'
  contenu         les 18 paragraphes, en blocs `paragraphe` et `titre`
  dateValeur      la date des chiffres qu'il porte      ← non négociable
  source          'PAD P180495' — d'où viennent les valeurs
  version, actif, remplaceLe
```

### La date de valeur n'est pas décorative

Les chiffres du PAD vieillissent. Un préambule sans date de valeur finira par
affirmer 15,4 % trois ans après que le taux ait changé, et **rien dans le
document ne dira que la donnée est ancienne**. La date de valeur permet à
l'écran d'admin de signaler un gabarit périmé, et au document de porter sa
réserve.

---

## 4. La composition

Le préambule s'insère dans `backend/src/tdr-document/document-plan.ts`, en tête
de la section `Contexte`, **avant** le texte engendré.

```
§ Contexte et Justification
    ├── Contexte Général                    ─┐
    ├── Description du PTN                   │  gabarit, verbatim
    ├── Composantes du Projet                │
    ├── Portée Géographique                 ─┘
    └── Contexte et Justification Spécifique   ← tdr.context, engendré
```

`document-plan.ts` connaît quatre genres de bloc — `paragraphe`, `liste`,
`definitions`, `absent` — et **aucun balisage**. Le gabarit doit donc être
stocké dans cette forme, non en Markdown : sinon les `##` sortiraient en clair
sur une pièce signée.

**Le préambule ne compte pas dans `aiAssistedFields`.** Aucune machine ne l'a
écrit ; le marquer comme assisté serait un faux aveu, et brouillerait la seule
information que ce champ porte.

---

## 5. Ce que devient la consigne du contexte

Une fois le préambule composé, `CONSIGNES.context` ne gouverne plus que la
part spécifique — trois paragraphes, 192 à 382 mots dans les documents réels.

Elle doit alors dire explicitement ce qu'elle **ne** couvre plus :

> « Le contexte général du projet, la description du PTN, ses composantes et sa
> portée géographique PRÉCÈDENT votre texte dans le document et sont déjà
> rédigés. Ne les répétez pas, ne les résumez pas, n'y renvoyez pas. Vous
> commencez à : *Dans le cadre de la Composante N du Projet de Transformation
> Numérique…* »

Sans cette phrase, le modèle rouvrira le contexte général — c'est le défaut le
plus fréquent, et la consigne actuelle le combat déjà pour la justification.

---

## 6. Vérifier

Le contrôle qui vaut : composer un TDR de test et **comparer son préambule au
gabarit, octet pour octet**. Une différence d'un caractère est un défaut, pas
une variante.

```bash
cd backend && npx tsc --noEmit -p tsconfig.json
```

Puis, sur un dossier réel, `GET /tdr/:id/document/apercu` : le préambule doit
apparaître entier, avant le texte engendré, sans balisage.

---

## 7. Réserve sur la source

Les TDR d'où ce préambule est tiré ont été produits avec de l'IA. L'un annonce
« quatre axes structurants » puis énumère **cinq** composantes.

Le préambule sert donc de point de départ, **pas de vérité**. Avant de le figer
en gabarit, chaque affirmation doit être confrontée au MEP du 23 juin 2025 —
en particulier la description des composantes, que `COMPONENTS_BRIEF` porte
déjà avec ses dotations et sa réserve de réconciliation MEP/PAD.
