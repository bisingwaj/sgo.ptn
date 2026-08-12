# PTN-RDC · Backend

API de gouvernance du Projet de Transformation Numérique de la RDC (P180495).
NestJS 11 · Prisma 7 · PostgreSQL 17.

Source de vérité institutionnelle : **Manuel d'Exécution du Projet (MEP) du 23 juin 2025**.

---

## Démarrage

```bash
npm install
cp .env.example .env       # adapter si nécessaire
npm run db:up              # PostgreSQL dans Docker (port hôte 5433)
npm run db:migrate         # applique les migrations
npm run db:seed            # référentiel MEP + admin d'amorçage
npm run start:dev          # API sur http://localhost:3001/api
```

Documentation OpenAPI : <http://localhost:3001/api/docs>

### Compte d'amorçage

Sur une base fraîchement semée : `admin@ptn-rdc.gov.cd` / `Admin@PTN2026`
(sous-rôle UGP « IT », permission `admin:users`).

Ces valeurs viennent de `BOOTSTRAP_ADMIN_EMAIL` et `BOOTSTRAP_ADMIN_PASSWORD`
dans le `.env`. Le compte est créé avec `mustChangePassword` : à la première
connexion, l'API redirige vers `/activation` et refuse toute autre route tant
que le mot de passe n'a pas été remplacé.

**Le seed ne réinitialise pas un mot de passe déjà changé** — il est
idempotent et ne touche pas un compte existant. Si vous avez perdu le mot de
passe d'un environnement local, deux options : `npm run db:reset` (destructif),
ou la réémission d'un mot de passe temporaire depuis `/admin/comptes` par un
autre compte administrateur.

### Parcours de première connexion

```
Admin crée le compte          → statut INVITE, mot de passe temporaire (72 h)
La personne se connecte       → session ouverte, mais routes métier verrouillées
Elle définit son mot de passe → statut ACTIF, verrou levé
```

Le statut `INVITE` est un état de connexion légitime : le refuser enfermerait
dehors toute personne venant d'être habilitée. Le verrou effectif est porté par
`PermissionsGuard`, qui n'ouvre alors que les routes marquées
`@AllowTempPassword()` — `/auth/me`, `/auth/change-password`, `/auth/logout`.

---

## Travailler à deux sur la même base

Nous ne partageons **pas** une base de données. Nous partageons **ce qui la produit** :
les migrations et le seed, tous deux versionnés dans git. Chacun garde une base
locale, qu'il peut réinitialiser sans jamais gêner l'autre.

### La règle unique

> Après tout `git pull` qui touche `prisma/`, lancer `npm run db:reset`.

Les deux bases redeviennent alors bit à bit identiques — mêmes tables, mêmes
lignes, **mêmes identifiants**.

### Pourquoi les identifiants sont identiques

Les UUID du seed ne sont pas aléatoires : ils sont dérivés du code métier par
UUID v5 (voir [`prisma/seed/uuid.ts`](prisma/seed/uuid.ts)). `UGP_COORDONNATEUR`
produit toujours le même identifiant, sur toutes les machines.

C'est ce qui permet de partager une capture d'écran, un lien
`/admin/comptes/<id>` ou un test référençant un identifiant sans que rien ne se
désynchronise.

### Ce qui est interdit

| Interdit | Pourquoi | À faire à la place |
|---|---|---|
| `prisma db push` | Contourne l'historique : la base de l'autre dev diverge en silence | `npm run db:migrate` |
| Modifier une migration déjà poussée | Elle est peut-être déjà appliquée en face | Créer une migration corrective |
| Créer des données de référence à la main | Elles n'existeront pas chez l'autre | Les ajouter au seed |

### Commandes

| Commande | Effet |
|---|---|
| `npm run db:up` / `db:down` | Démarrer / arrêter PostgreSQL |
| `npm run db:migrate` | Créer et appliquer une migration (développement) |
| `npm run db:deploy` | Appliquer les migrations sans en créer (CI, staging) |
| `npm run db:seed` | Rejouer le seed — idempotent |
| `npm run db:reset` | Vider, remigrer, resemer |
| `npm run db:studio` | Explorateur graphique Prisma |

### En cas de conflit de migrations

Si vous créez tous deux une migration en parallèle, git signalera un conflit sur
le dossier `prisma/migrations/`. La résolution :

1. Celui qui fusionne en second supprime **sa** migration locale.
2. `git pull` pour récupérer celle de l'autre.
3. `npm run db:reset` puis recréer sa migration par-dessus.

Ne jamais renommer ni réordonner les migrations de l'autre : Prisma suit leur
horodatage.

---

## Architecture

```
src/
  prisma/          PrismaService (driver adapter @prisma/adapter-pg)
  audit/           Piste d'audit chaînée, en ajout seul
  auth/            Connexion, rotation de jetons, bascule d'affectation
  accounts/        Administration des comptes et garde-fous MEP
  referentiel/     Composantes, provinces, organisations, sous-rôles
  common/          Décorateurs, gardes, types partagés
prisma/
  schema.prisma    Modèle de données
  migrations/      Historique — versionné, jamais réécrit
  seed/            Référentiel MEP + amorçage, à identifiants déterministes
```

### Modèle d'habilitation

Un compte n'est pas « un utilisateur avec un rôle ». C'est une personne (`User`),
rattachée à une organisation (`Organisation`), exerçant un sous-rôle (`Subrole`)
sur un périmètre et pendant une durée — ce triplet est porté par `Assignment`.

Le multi-affectation est assumé : un cadre UGP peut aussi siéger au CTP. Créer
deux comptes pour la même personne brouillerait la piste d'audit.

### Contrôle d'accès

L'authentification est le défaut : une route n'est ouverte que si elle porte
`@Public()`. Les droits s'expriment au grain de la permission, pas du profil :

```typescript
@RequirePermissions('admin:users')
```

Les permissions ne sont pas embarquées dans le jeton — elles sont résolues en
base à chaque requête. Le coût est négligeable à l'échelle d'une UGP, et la
révocation d'une habilitation prend effet immédiatement. Pour un canal comme le
MGP-EAS/HS, quinze minutes de permission périmée seraient quinze minutes de trop.

### Garde-fous institutionnels

`POST /api/admin/comptes/verifier` évalue les règles du MEP sans rien créer, ce
qui permet au formulaire d'afficher les conflits en temps réel :

- **Unicité des postes** — un Coordonnateur, un RAF, un Auditeur Interne, un RPM
- **Séparation des tâches** — RAF / Comptable / Caissier incompatibles ;
  l'Auditeur Interne ne cumule aucune fonction opérationnelle
- **Habilitation sensible** — justification écrite obligatoire (Spé VBG/EAS, IT)
- **Périmètre requis** — composante pour RC1/RC2/RC3
- **Mission bornée** — référence et échéance obligatoires pour les auditeurs
- **Domaine institutionnel** — avertissement hors `@ptn-rdc.gov.cd` pour l'UGP

Le catalogue des permissions est lui-même vérifié au seed
([`prisma/seed/catalog.ts`](prisma/seed/catalog.ts)) : un bailleur qui recevrait
`tdr:author`, ou un sous-rôle autre que le Spé VBG/EAS qui recevrait `easHs:read`,
fait échouer le seed.

### Piste d'audit

Chaque entrée scelle le hachage de la précédente. Toute modification a posteriori
rompt la chaîne et devient détectable par `AuditService.verifyChain()`. Aucune
méthode de mise à jour ni de suppression n'est exposée, par conception.

Les comptes ne sont jamais supprimés : `INVITE → ACTIF → SUSPENDU → EXPIRE → ARCHIVE`.
Il faut pouvoir répondre à « qui avait accès à quoi, et quand » plusieurs années
après les faits.

---

## Tests

```bash
npm run test       # unitaires
npm run test:e2e   # bout en bout
npm run lint
```
