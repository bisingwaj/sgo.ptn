---
name: ptba
description: Règles du module PTBA (Plan de Travail et Budget Annuel) de PTN-RDC — plafonds budgétaires, cycle de l'exercice, invariants du modèle, conventions de l'assistant de saisie pas-à-pas. À charger avant toute intervention sur src/app/ptba, src/components/ptba ou backend/src/ptba.
---

# PTBA — le verrou budgétaire

Le PTBA est la **première porte du cycle**. Sans ligne au plan, pas d'enveloppe,
donc pas de TDR, pas d'ANO, pas de marché. Tout ce qui est écrit ici découle de
cette place : une erreur dans ce module se propage à toute la chaîne de
passation, et se retrouve devant un bailleur.

---

## 1. Les deux plafonds — ne jamais les confondre

C'est le piège central du module, et il a déjà coûté une reprise complète.

| | Borne | Portée |
|---|---|---|
| **Dotation de projet** | `Component.totalUsdM` | 2025-2029, tout le projet, MEP Tableau 2 |
| **Allocation annuelle** | `PtbaYearComponentAllocation.allocationUsd` | Un exercice, une composante |

**Une activité se compare à l'ALLOCATION, jamais à la dotation.** Diviser un
plan annuel par une enveloppe quinquennale produit un pourcentage qui ne veut
rien dire, et un refus serveur incompréhensible côté écran.

Trois gardes, tous dans `PtbaService` :

1. Σ activités(composante, exercice) ≤ allocation(composante, exercice)
2. Σ allocations(composante, **tous** exercices) ≤ dotation de projet
3. Une allocation ne peut descendre sous ce que le plan engage déjà

**Une composante sans allocation refuse toute activité.** Ne jamais introduire
de repli sur la dotation de projet : ce repli rend le garde-fou silencieusement
inopérant, ce qui est exactement le défaut d'origine.

La répartition annuelle est une **décision de l'UGP**. Le MEP n'en dit rien.
Elle ne se calcule pas, elle se saisit — et ne s'invente jamais dans un seed de
production.

---

## 2. Le cycle de l'exercice

```
BROUILLON  →  VALIDE (opposable)  →  CLOS
```

- **BROUILLON** : seul état où le plan s'écrit.
- **VALIDE** : opposable devant le bailleur. Aucune écriture. Une correction
  suppose une révision de l'exercice.
- **CLOS** : plus rien.

`assertContentEditable` porte cette règle **côté service**. Masquer un bouton ne
suffit pas : la règle a longtemps n'été tenue que par l'écran, et un appel direct
altérait un plan opposable sans que rien ne le distingue d'une saisie normale.

La validation ne passe **pas** par ce garde : elle change le statut, elle
n'écrit pas dans le plan. Ses refus lui sont propres.

---

## 3. Invariants du modèle

- **Le retrait n'a pas de réciproque côté produit.** `isActive: false` conserve
  la ligne — un TDR peut déjà la citer. Le motif est **exigé** et journalisé.
- **Les cinq listes de contenu sont remplacées en bloc.** L'écran renvoie l'état
  complet de chaque liste, jamais des opérations différentielles. Les lignes sans
  intitulé sont écartées par le service.
- **Ce que porte l'activité ≠ ce que porte le TDR.** L'activité dit ce qu'elle
  doit atteindre, le marché dit ce qu'il exécute pour y concourir. Le TDR
  **puise** dans l'activité ; il n'en hérite jamais automatiquement. Un marché de
  peinture ne porte pas l'objectif « doter le pays d'un SOC ».
- **Couverture géographique multiple.** `PtbaActivityProvince`, aligné sur
  `TdrProvince` : un backbone traverse trois provinces. Aucune province = couverture
  nationale, et c'est une valeur, pas une absence.
- **Les montants circulent en USD entiers.** L'API transporte des données,
  l'interface en fait la présentation — `formatUsdCompact` dans `src/lib/format.ts`.
  Jamais `"8,7 M USD"` côté serveur.

---

## 4. Règles d'écran propres au module

Au-delà des règles de la maison (voir CLAUDE.md) :

- **Les trois colonnes sans source restent visibles** — décaissé, exécution,
  période — et disent `non suivi`, pas `—`. Un tiret se lit comme une donnée
  manquante ; « non suivi » se lit comme un état voulu. Elles restent pour ne pas
  être oubliées, jusqu'au suivi d'exécution.
- **Ne jamais annoncer un plan vide pendant le chargement.** Trois états
  distincts : en cours de chargement / aucun exercice ouvert / aucune activité
  inscrite. Ce bug est apparu deux fois.
- **Le plan et les allocations se demandent en `allSettled`.** Le plan est le
  contenu de l'écran, les allocations son cadrage. Les lier fait disparaître
  l'exercice entier dès que le cadrage échoue.
- **Une composante non allouée n'est pas proposée à la saisie**, et celles qui
  manquent sont nommées. Le refus se lit avant, pas après.
- **Teintes de composante : jetons `--ptn-composante-c1..c5` uniquement.**
  Universelles, jamais repeintes par le profil. Le violet appartient à l'IA, le
  cyan à la marque, le vert/jaune/rouge aux statuts — aucun des trois n'entre
  dans cette échelle.

---

## 5. L'assistant de saisie — un écran, une question

L'inscription d'une activité se fait **pas à pas**, jamais d'un bloc. Le public
visé — agents publics seniors, à 125–150 % de zoom — décroche sur un formulaire
dense, et une erreur de saisie budgétaire coûte cher.

Ordre des étapes, et pourquoi :

1. **Composante** — en premier, car elle fixe le plafond de tout ce qui suit.
   Choix visuel : une carte par composante, sa teinte, son solde restant.
2. **Identification** — code, intitulé, sous-composante.
3. **Couverture géographique** — une ou plusieurs provinces.
4. **Enveloppe** — le solde de la composante reste affiché pendant la saisie.
5. **Porte du contenu** — « avez-vous du contenu à proposer ? ». Répondre non est
   légitime : une ligne peut rejoindre le plan avant que son contenu soit arrêté.
6-10. **Objectifs, livrables, indicateurs, risques, normes** — un écran chacun.
11. **Récapitulatif** — rien ne part avant qu'il ait été vu.

Conventions :

- Une seule question visible à la fois, mesure de lecture ≤ 68 caractères.
- Le bouton d'avancement dit ce qu'il fait, jamais « Suivant » seul quand
  l'étape engage quelque chose.
- **Aucune étape sautée en silence** : si le contenu est refusé, le
  récapitulatif le dit.
- La validation d'une étape n'empêche pas d'y revenir. Rien n'est écrit avant
  le récapitulatif — l'assistant tient un état, pas un brouillon serveur.

---

## 6. Mouvement

Les jetons `--ptn-motion-*` de `src/styles/tokens.scss` sont **remis à 0 ms sous
`prefers-reduced-motion`**. Les utiliser, c'est obtenir l'accessibilité sans y
penser. N'écrire aucune durée en dur.

- **Transition d'étape** : `--ptn-motion-moderate-01` (150 ms), easing
  `entrance`, sur l'**opacité seule**. Jamais de translation : à 150 % de zoom,
  un glissement fait recalculer la mise en page et se perçoit comme un à-coup.
  Ne jamais animer `height` ni `grid-template-rows` — un reflow animé est un
  reflow lent, même raison que la règle anti-`100vh` du lint.
- **Apparition d'une ligne de liste** : `--ptn-motion-moderate-01`, easing
  `entrance`, sur `opacity` + `translateY(-4px)`. Au retrait,
  `--ptn-motion-fast-02` et easing `exit` — plus vif, l'attention est déjà
  passée à autre chose.
- **Changement d'état d'un marqueur d'étape** : `--ptn-motion-fast-02`, easing
  `productive`.
- **Retour au focus : ne rien animer.** Un anneau de focus qui s'anime retarde
  sa perception (WCAG 2.4.7 / 2.4.11), et aucun composant Carbon n'applique de
  jeton de mouvement à `:focus-visible`. Carbon s'en charge, ne pas le doubler.

**`--ptn-motion-easing-expressive` et `slow-01` / `slow-02` n'ont pas leur place
dans ce module.** « Expressive » est réservé par Carbon aux contextes à charge
émotionnelle — marketing, onboarding grand public. Ce produit est *productif* au
sens Carbon : dense, répétitif, public senior. Poser `slow-*` sur un geste
répété onze fois donne un produit qui paraît lent.

Ne jamais animer un montant qui change, ni un état de refus : sur un écran
budgétaire, le mouvement se lit comme une confirmation.

---

## 7. Commandes utiles

```bash
cd backend
npm run start:dev              # --watch ; sinon le backend sert du code périmé
npm run db:seed:ptba           # 11 activités + allocations de démonstration
npx prisma migrate dev --name <nom>
```

Le rôle Postgres `ptn` a désormais `CREATEDB` : `migrate dev` fonctionne
normalement. En production, les migrations passent par `migrate deploy`, qui ne
construit aucune base fantôme.

**Toujours examiner un écran livré une fois base vide.** Une base peuplée en
permanence rend les états vides invisibles — et ce sont eux qui échouent en
premier.
