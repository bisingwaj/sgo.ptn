---
name: structure-document
description: Le plan du TDR produit par la plateforme confronté à celui des TDR réels de l'UGPTN — les six sections manquantes, toutes du côté passation, et la structure du tableau budgétaire relevée sur le classeur réel. À charger avant d'intervenir sur backend/src/tdr-document/document-plan.ts, sur les 18 étapes du parcours, ou sur le budget du dossier.
---

# La structure du document

Le parcours compte 18 étapes et compose 12 sections. Les TDR réels de l'UGPTN
en comptent 13, dont **six que la plateforme ne produit pas du tout**.

---

## 1. La confrontation

| Plateforme (`document-plan.ts`) | TDR réel (Hackathons, 9 499 mots) |
|---|---|
| Contexte | **Contexte et Justification** — 5 sous-sections |
| Justification | *(fondue dans la précédente)* |
| Bénéficiaires visés | — |
| Objectifs et résultats attendus | Objectif de la Mission + Objectifs Spécifiques |
| — | **Thématiques** |
| — | Résultats Attendus *(section propre)* |
| — | **Critères d'Éligibilité des Propositions** |
| Livrables attendus | Livrables |
| — | **Partenariats et Financement** |
| — | **Confidentialité, Protection des Données et Propriété Intellectuelle** |
| — | **Contenu de la Proposition** |
| Approche et méthodologie | — |
| Indicateurs de performance | Suivi-Évaluation et Indicateurs de Performance |
| Calendrier et expertise | Délais d'Exécution |
| Budget | *(annexe : classeur séparé)* |
| — | **Critères d'Évaluation des Propositions** |
| — | **Grille d'Évaluation des Projets** |
| Dispositions contractuelles | — |
| Risques et atténuation | — |
| Sauvegardes E&S | — |

### Ce que la comparaison dit

**Les six manques sont tous du même côté : la passation.** Critères
d'éligibilité, contenu de la proposition, critères d'évaluation, grille de
notation, confidentialité et propriété intellectuelle, partenariats et
financement. Ce sont les sections qui disent au soumissionnaire **ce qu'il doit
remettre et comment il sera noté**.

Ce n'est pas un oubli de rédaction : c'est que le parcours a été conçu autour
du *besoin* (ce que l'UGPTN veut) et non de la *consultation* (ce que le marché
demande). Un TDR sans critères d'évaluation n'est pas un TDR incomplet, c'est
un document d'une autre nature.

**À l'inverse**, la plateforme produit trois sections que les TDR d'exemple
n'ont pas : dispositions contractuelles, risques et atténuation, sauvegardes
E&S. Elles viennent du MEP et de la bibliothèque de clauses. Elles sont un
apport, pas un écart à corriger.

### Ce qu'il faut trancher avant de coder

Le plan des TDR réels varie selon la nature du marché — un atelier n'a pas de
grille d'évaluation de projets. **Les sections nouvelles doivent donc dépendre
du `tdrTypeCode`**, comme les consignes (voir `consignes-champs` § 2). Ajouter
six sections à tous les types produirait des sections vides sur la moitié des
dossiers, et `document-plan.ts` a déjà le genre `absent` pour cela.

---

## 2. Le tableau budgétaire

Aujourd'hui : **quatre montants scalaires**.

```prisma
budgetTotalUsd Decimal? @db.Decimal(14, 2)
budgetIdaUsd   Decimal? @db.Decimal(14, 2)
budgetAfdUsd   Decimal? @db.Decimal(14, 2)
budgetGovUsd   Decimal? @db.Decimal(14, 2)
```

Le classeur réel (`UGPTN-C3_Budget_Organisation-Cérémonie…xlsx`) porte une
structure à lignes, sur deux formes voisines :

```
N° │ Description │ Nbre/Qté │ jours │ Coût unitaire (USD) │ Total (USD)
Désignation / Poste budgétaire │ Unité │ Qté │ Fréq. │ C.U. ($) │ C.T. ($)
```

Groupée par rubrique, avec sous-totaux :

```
I. Formation Kinshasa
   Frais généraux              Location salle et sonorisation
   Restauration                Pause café · Déjeuner buffet standard
   Transport et déplacements   Transport local participants : Gouvernement
   Média                       RTNC, Télé 50, B One · ACP · TOP CONGO · en ligne
   Fournitures diverses        Blocs notes A5 (paquet) · Stylos (boîte) · Fardes (pce)
   Frais logistique            Interprète · Modérateur · Photographe · Protocoles
   ─────────────────────────────────────────────
   Total atelier
   Imprévus 2 %
   Total général
```

### Le modèle à écrire

```prisma
model TdrBudgetLine {
  id          String   @id @default(uuid()) @db.Uuid
  tdrId       String   @db.Uuid
  rubrique    String            // « Frais généraux », « Média »…
  designation String            // le poste
  unite       String?           // paquet, boîte, pce, jour, forfait
  quantite    Decimal? @db.Decimal(12, 2)
  frequence   Decimal? @db.Decimal(12, 2)   // « jours » / « Fréq. »
  coutUnitaireUsd Decimal? @db.Decimal(14, 2)
  position    Int      @default(0)
  @@map("tdr_budget_lines")
}
```

**Le total ne se stocke pas** : il se calcule (`quantite × frequence ×
coutUnitaireUsd`). Deux sources pour un même nombre finissent par diverger, et
c'est un montant.

Le taux d'imprévus (2 % dans le classeur) est un champ du dossier, pas une
ligne — sinon il entre dans sa propre assiette.

### Les montants restent hors IA

`field-registry.ts` ferme déjà les montants : *« mets le budget à 3 millions »
est une dictée, "propose un budget" est une fabrication »*. **Le tableau
budgétaire ne change rien à cette règle.** L'assistant peut proposer la
*structure* — les rubriques et les postes attendus pour un type d'activité,
qui sont du savoir procédural — jamais un prix unitaire, jamais une quantité.

Concrètement : un outil `proposer_rubriques_budget` qui rend une liste de
désignations et d'unités, avec quantités et coûts **vides**. Le rédacteur
chiffre.

### Le plafond de l'enveloppe reste opposable

`GET /tdr/:id/enveloppe` porte ce qui reste sur la ligne du PTBA, engagements
des autres dossiers déduits. La somme des lignes budgétaires doit s'y
confronter, et `TdrService.engagementAutresDossiers` demeure la seule autorité
— **ne jamais recalculer ce cumul côté navigateur** (voir la compétence `tdr`).

---

## 3. Ce que le document rend

Rappels qui contraignent toute évolution du plan :

- **`document-plan.ts` connaît quatre genres de bloc** : `paragraphe`, `liste`,
  `definitions`, `absent`. **Aucun balisage** — ni gras, ni italique, ni titre
  interne. Un tableau budgétaire devra donc être un genre **nouveau**
  (`tableau`), rendu par les trois sorties.
- **Trois rendus, un seul plan.** Le PDF, le DOCX et l'écran
  `/tdr/[id]/document` doivent dire la même chose. Un tableau ajouté au plan
  doit être rendu dans les trois, sinon deux versions d'une pièce
  contractuelle circulent en se contredisant.
- **Ne jamais recomposer côté navigateur.**

---

## 4. Ordre de travail

1. **Le genre `tableau`** dans `document-plan.ts` et ses trois rendus. Sans
   lui, le modèle de données ne sert à rien.
2. **`TdrBudgetLine`** et l'écran de saisie (étape 15 du parcours).
3. **Les sections de passation**, par `tdrTypeCode`, en commençant par
   « Contenu de la proposition » et « Critères d'évaluation » — ce sont les
   deux qu'un soumissionnaire ne peut pas deviner.
4. **Renuméroter les étapes.** Le `num` d'une étape est son identifiant : le
   `Wizard` repère les étapes franchies par lui, et deux étapes portant le même
   `num` cassent la progression (voir la compétence `tdr`).

---

## 5. Réserve

Les TDR d'exemple ont été produits avec de l'IA et ne valent que comme
référence de **structure**. Avant d'inscrire une section au plan, la
confronter au MEP du 23 juin 2025 et au PPSD : c'est le corpus qui dit quelles
sections un TDR du projet doit porter, pas quatre dossiers de la composante C3.
