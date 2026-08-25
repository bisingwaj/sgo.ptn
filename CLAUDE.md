# PTN-RDC · Contexte de travail

Document chargé automatiquement à chaque session. Il porte ce qu'il faut savoir
avant de toucher au code : les décisions déjà tranchées, les règles qui tiennent,
et les pièges déjà rencontrés — pour ne pas les redécouvrir.

Compléments : [DEVELOPPEMENT.md](DEVELOPPEMENT.md) pour la mise en route,
[public/brand/README.md](public/brand/README.md) pour les actifs de marque.

---

## 1. Le produit

**PTN-RDC (P180495)** — programme de transformation numérique de la République
Démocratique du Congo. 510 M USD, cofinancé IDA/Banque mondiale (400 M, 79 %) et
AFD (110 M, 21 %), jusqu'en 2029.

**L'UGPTN** est l'unité d'exécution, sous tutelle du **MPTN**. Ce dépôt porte sa
**plateforme de gouvernance interne** : passation des marchés, avis de
non-objection (ANO), sauvegardes environnementales et sociales, reporting.

Trois contraintes structurent chaque écran :

1. **Le MEP du 23 juin 2025 est la source de vérité.** Montants, dates,
   indicateurs et structures sont repris tels quels. L'interface *applique* la
   procédure, elle ne l'invente pas.
2. **L'outil ne décide jamais.** Il exécute, propose, trace. Les bailleurs
   gardent l'ANO, les auditeurs restent en lecture seule.
3. **Huit profils, un seul produit.** UGP · MDA · Partenaire · Bailleur ·
   Soumissionnaire · SBP · Auditeur · Gouvernance.

Les règles d'habilitation ne sont pas des préférences, ce sont des obligations :
les bailleurs ne rédigent pas de TDR, les auditeurs n'ont aucun bouton
d'édition, le canal **MGP-EAS/HS** (signalement de violences sexuelles) est
cloisonné.

### Le public

Agents publics, souvent seniors, peu familiers des interfaces denses. **La
clarté est la première devise du produit**, avant la densité et avant
l'esthétique. Beaucoup impriment (dossiers ANO, procès-verbaux) et travaillent à
125–150 % de zoom.

---

## 2. Répartition des rôles

| | |
|---|---|
| **Ce dépôt, notre périmètre** | Frontend Next.js (`src/`) |
| **Backend NestJS** (`backend/`) | Écrit par une autre équipe |
| **Site institutionnel public** | Hors périmètre |

Le backend n'est pas à modifier sans demande explicite. Trois exceptions déjà
faites, à la demande : le seed de développement, le délai de grâce sur la
rotation des jetons, et `GET /tdr/:id/enveloppe` — un écran de budget ne peut
pas dire ce qu'il reste sur une ligne du plan sans le serveur, la liste des TDR
étant restreinte à l'organisation de l'appelant.

---

## 3. Décisions tranchées — ne pas rouvrir sans raison

| Sujet | Décision |
|---|---|
| Design system | **Carbon v11**, définitif |
| Composants | `@carbon/react` pour tout ce qui est interactif ou complexe (DataTable, ComposedModal, ComboBox, DatePicker…) |
| Mise en page | **Tailwind v4**, branché sur les tokens Carbon |
| SCSS | En voie de suppression. Aucun nouveau `.module.scss` |
| Migration | **Strangler** : écran par écran, toujours livrable |
| Langues | **FR + EN** pour la plateforme. Les 6 langues concernent le site public, hors périmètre |
| Cible | **Bureau**. Le seul espace demandant un peu de souplesse est Partenaire |
| IA | Fonctionnalité **réelle** (rédaction de TDR, évaluations), pas une vitrine |
| Comptes | Créés par un administrateur. Inscription publique plus tard |
| Design | Pas de designer ni de Figma — les décisions visuelles se prennent ici |

---

## 4. Architecture

### 4.1 Le pont Carbon → Tailwind

`src/styles/tailwind.css` déclare chaque utilitaire en pointant vers une
variable `--cds-*` (Carbon) ou `--ptn-*` (projet), via `@theme inline`.
Conséquence : `bg-layer`, `text-secondary`, `bg-accent` suivent le thème g10/g100
**et** le profil actif, sans une ligne de JavaScript.

**L'ordre des couches est vital** et déclaré dans `globals.scss` :

```
theme → base → carbon → components → utilities
```

Le CSS sans couche l'emporte sur tout CSS en couche. Carbon s'écrivant sans
couche, son reset (`div { padding: 0 }`) battait auparavant **toutes** les
utilitaires Tailwind, `px-6` compris.

### 4.2 Couche de données

- **Contrats** : `src/lib/schemas/` (Zod). Ils *sont* la spécification remise au
  backend pour les domaines qu'il n'expose pas encore.
- **Aiguillage** : `DOMAIN_ROUTING` dans `src/lib/api/client.ts` désigne, par
  domaine, le backend NestJS ou les gestionnaires de route locaux. Migrer un
  domaine = une ligne.
- **Démonstration** : `src/server/` (fixtures, magasin en mémoire, garde-fous).
- **Consommation** : hooks TanStack Query dans `src/lib/api/hooks.ts`. Les
  composants n'appellent jamais `fetch` directement.

**Règle fondatrice : l'API transporte des DONNÉES, l'interface en fait la
PRÉSENTATION.** Montants en entiers (unités mineures), dates ISO 8601,
énumérations en codes. Jamais `"8,7 M USD"` ni `"il y a 2h"` : intraduisible,
incalculable, et faux dès le lendemain.

### 4.3 Authentification

- Session côté navigateur : jeton de rafraîchissement en `localStorage`, jeton
  d'accès en mémoire. Migration prévue vers des cookies `httpOnly`.
- `/auth/login` attend `{ email, password, family }` — la **famille**
  (`UGP_GOUV` | `BAILLEURS` | `BENEFICIAIRES` | `CONTROLE`), pas le profil ni le
  sous-rôle. Elle tranche l'habilitation activée.
- `AuthGate` (dans `Shell`) garde les écrans authentifiés. Les parcours plein
  écran qui ne passent pas par `Shell` le portent explicitement.
- Restent publics à dessein : `/login`, `/activation`, `/design-system`,
  `/demo`, et **`/mgp`** — le dépôt de plainte citoyen doit rester atteignable
  sans compte.

---

## 5. Règles qui tiennent

### Tenues par le lint (elles échouent)

- **Aucune police sous 12 px.** L'ancienne version comptait 265 déclarations en
  11 px et 87 en 10 px.
- **Aucune hauteur figée sur la fenêtre.** `calc(100vh − 320px)` s'effondre à
  150 % de zoom. Utiliser `scroll-region`.
- Règles `jsx-a11y` durcies en erreurs.

### Tenues par la revue

- **Aucune couleur écrite en dur.** Toujours un token.
- **Rayon de bordure à 0.** Carbon est carré. Exceptions : avatars, pastilles.
- **Le violet est réservé à l'IA.** Tout ce qu'un modèle génère le porte, rien
  d'autre.
- **Les couleurs de statut sont universelles.** Jamais repeintes par le profil.
- **La marque identifie, l'accent agit.** `--ptn-brand` (cyan du logo) ne colore
  jamais un élément cliquable.
- **Un nom ne figure jamais à la fois dans `--text-*` et `--color-*`.**
- **Ne jamais inventer de données qui ressemblent à des données réelles.** Un
  état vide explicite vaut mieux qu'un faux « ANO délivré ». Vaut aussi pour les
  métadonnées d'environnement et les notifications.
- **Rien qui suggère une conséquence qu'il n'a pas.** Un sélecteur décoratif ou
  un bouton sans effet use la confiance à chaque usage.

---

## 6. Pièges déjà rencontrés

Chacun a coûté du temps. Aucun n'était visible au typecheck.

| Piège | Ce qui se passe |
|---|---|
| **Ordre des couches CSS** | Carbon sans couche battait toutes les utilitaires Tailwind. Voir 4.1 |
| **`tailwind-merge`** | Supprimait silencieusement les tailles de police : `text-heading-06` et `text-primary` partagent l'espace `text-`. Groupes déclarés dans `src/lib/cn.ts` |
| **Import Carbon partiel** | `components/data-table` n'entraîne pas `data-table/sort` — les libellés de tri s'affichaient en clair. Carbon est importé en entier |
| **`next/image` sur un logo** | Sert du WebP à qualité 75 et fabrique des salissures. `unoptimized` sur les actifs de marque |
| **Tokens de composants Carbon** | `@include theme($g100)` ne les émet pas. Les classes de zone `.cds--g100` sont indispensables, sinon les notifications sont illisibles en thème sombre |
| **`localStorage` dans un effet** | Impose un `setState` en cascade ; dans un initialiseur d'état, il fait diverger l'hydratation. Utiliser `createPersistentStore` (`src/lib/persistent-store.ts`) |
| **Rotation des jetons** | Une rotation interrompue ressemble à un vol. Résolu côté serveur par un délai de grâce fondé sur l'état du successeur |
| **Latence de compilation** | En mode `dev`, une route froide met 30–60 s. Chauffer les routes avant tout test navigateur, sinon les échecs sont des faux positifs |

---

## 7. État au 25 août 2026

### Acquis

- Socle Tailwind v4 + Carbon, tokens, échelle typographique en rem
- Référence vivante sur `/design-system` et `/design-system/donnees`
- Base locale, migrations, seed, **12 comptes de démonstration**
  (mot de passe commun `Demo@PTN2026` — voir DEVELOPPEMENT.md)
- Connexion : familles, messages d'échec neutralisés, validation par champ
- Garde d'accès sur tous les écrans authentifiés, retour à la page demandée
- Coque : bandeau thémable, menus réels, navigation repliable, panneau
  contextuel en tiroir
- Actifs de marque détourés (`npm run logo`)
- **PTBA** refait de bout en bout : allocation annuelle par composante,
  gardes d'exercice côté serveur, couverture multi-provinces, registre
  Carbon, routes séparées, assistant de saisie pas à pas.
  L'**exercice est le contenant** : `EnteteExercice` porte ses deux sections
  — Allocations et Plan — sur `/ptba` comme sur `/ptba/exercices/[year]`,
  et l'année voyage dans l'URL partout
- **TDR** — parcours de rédaction en 18 étapes, une question par écran,
  assistance IA en flux sur les huit champs de texte. Étapes 16 à 18 encore
  dans l'ancien moule. Lot d'ergonomie livré : reprise à la première étape
  incomplète, saisie libre dans les cinq listes de catalogue, dossier
  possible hors plan annuel, chaque manque de l'étape finale renvoyant à
  l'étape qui le corrige

### Compétences chargées automatiquement

Deux modules portent leurs propres règles, dans `.claude/skills/` :
`ptba` (plafonds, cycle de l'exercice, invariants) et `tdr` (architecture du
parcours, assistance IA et ses interdits, pièges de refactorisation). Les
charger avant d'intervenir sur ces domaines.

### Chantier ouvert — l'assistance rédactionnelle

La génération **s'interrompt en milieu de phrase et ne reprend pas**. Le
diagnostic est posé et l'outillage de vérification consigné dans
[documents/reprise-assistant-ia.md](documents/reprise-assistant-ia.md) :
`streamField` ignore le motif d'arrêt du fournisseur, si bien qu'une coupure
sur limite de jetons ne se distingue pas d'une fin normale. À lire avant de
toucher à `backend/src/ai/`.

### Non fait

- **Internationalisation.** Toutes les chaînes sont en français, en dur. À faire
  avant que la surface ne grossisse — c'est l'arbitrage le plus coûteux à
  reporter.
- **Tests.** Aucun. Vitest + Playwright + axe restent à mettre en place.
- **Écrans hérités.** Sur 69 routes, 72 modules SCSS subsistent — la plupart
  des écrans gardent leurs données d'exemple, sans état de chargement ni
  d'erreur.
- **Impression.** Le TDR s'imprime et se télécharge depuis
  `/tdr/[id]/document`. Les autres écrans n'ont que la feuille `@media print`
  générique, sans bouton ni mise en page propre — alors que ces usagers
  impriment.
- **Glossaire des sigles.** Annoncé dans le menu d'aide, pas encore écrit.

### À signaler au backend

- **`/auth/login` divulgue trop.** Le message précis (« ce compte relève de… »)
  transite toujours sur le réseau ; le frontend ne fait que le masquer. Un 401
  uniforme est nécessaire.
- `TdrCreationClient.tsx` : 1 erreur de lint (`setState` dans un effet, rendus
  en cascade) et 4 avertissements, dans du code amont. C'est la ligne de base
  du fichier — y comparer toute intervention.
- **Le rôle Postgres `ptn` a reçu `CREATEDB`** : `prisma migrate dev` fonctionne
  désormais. En production, `migrate deploy` n'a pas besoin de ce droit.
- **Deux couches d'API coexistent** côté frontend : `src/lib/api/client.ts`
  (Zod, TanStack, port 3001 par défaut) et `src/lib/api.ts` (appels directs,
  port 3333). Les domaines PTBA et TDR passent par la seconde. Dette
  identifiée ; la refermer est un chantier à part.

---

## 8. Commandes

```bash
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm run build
npm run logo -- <fichier>   # détourage d'un logo

cd backend
npm run start:dev    # port défini par PORT dans backend/.env
npm run db:seed      # référentiel MEP + administrateur d'amorçage
npm run db:seed:dev  # comptes de démonstration
```

`npm run lint` signale une cinquantaine de manquements dans les écrans hérités.
C'est le périmètre de reprise, traité écran par écran. **Le code nouvellement
écrit doit passer sans erreur.**

---

## 9. Méthode attendue

- **Vérifier, ne pas supposer.** Les bugs listés en 6 ont tous été trouvés en
  regardant le rendu ou en mesurant, jamais en lisant le code.
- **Signaler ce qui est cassé**, même hors du périmètre demandé.
- **Nommer les compromis** plutôt que les taire.
- Les commentaires expliquent **pourquoi**, pas quoi.
- Commentaires, messages de commit et interface **en français**.
