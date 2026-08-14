# PTN-RDC · Mise en route locale

## Prérequis

- Node.js 20 ou supérieur
- PostgreSQL 16 ou supérieur

## 1. Base de données

PostgreSQL local, base `ptn_rdc`, rôle applicatif `ptn`, **port 5432**.

Le rôle `ptn` n'est pas superutilisateur : l'application ne se connecte jamais
avec `postgres`. Une erreur de requête reste ainsi contenue à sa propre base.

### Création (une seule fois)

Remplacer `<mdp-postgres>` par le mot de passe de votre superutilisateur local.

```bash
export PATH="/Library/PostgreSQL/18/bin:$PATH"   # adapter la version
export PGPASSWORD=<mdp-postgres>

psql -h localhost -p 5432 -U postgres -d postgres \
  -c "CREATE ROLE ptn LOGIN PASSWORD 'ptn_dev_password';"
createdb -h localhost -p 5432 -U postgres -O ptn ptn_rdc
psql -h localhost -p 5432 -U postgres -d ptn_rdc \
  -c "GRANT ALL ON SCHEMA public TO ptn; ALTER SCHEMA public OWNER TO ptn;"
```

Vérification :

```bash
PGPASSWORD=ptn_dev_password psql -h localhost -p 5432 -U ptn -d ptn_rdc \
  -tAc "select current_user, current_database();"
# → ptn|ptn_rdc
```

### Variante Docker

`docker compose up -d` (script `npm run db:up`) expose PostgreSQL sur le port
**5433**. Dans ce cas, remplacer 5432 par 5433 dans `DATABASE_URL`.

### « Can't reach database server »

Le serveur n'est pas démarré, ou `DATABASE_URL` désigne le mauvais port. Vérifier
d'abord quel port écoute :

```bash
nc -z localhost 5432 && echo "5432 ouvert"
nc -z localhost 5433 && echo "5433 ouvert"
```

## 2. Backend

```bash
cd backend
cp .env.example .env        # les valeurs par défaut conviennent en local
npm install
npm run db:generate         # REGÉNÈRE LE CLIENT PRISMA — voir ci-dessous
npm run db:deploy           # applique les migrations
npm run db:seed             # référentiel MEP + administrateur d'amorçage
npm run db:seed:dev         # comptes de démonstration (développement seulement)
npm run start:dev           # http://localhost:3001/api
```

Documentation OpenAPI : <http://localhost:3001/api/docs>

> **`Property 'tdr' does not exist on type 'PrismaService'`**
>
> Le client Prisma est généré à partir du schéma, dans `backend/generated/`, et
> ce dossier n'est pas versionné. Après tout `git pull` ajoutant des modèles, il
> est périmé : le compilateur ignore les tables nouvellement déclarées et
> signale une erreur par appel.
>
> ```bash
> cd backend && npm run db:generate
> ```
>
> Aucune base de données n'est requise pour cette commande — elle ne lit que le
> schéma. À lancer systématiquement après un `git pull` qui touche
> `prisma/schema.prisma`.

## 3. Frontend

```bash
npm install
npm run dev                 # http://localhost:3000
```

> Le frontend appelle l'API sur le port **3001**. Si Next.js démarre lui-même
> sur 3001 — ce qu'il fait quand 3000 est occupé — les appels se retournent
> contre lui-même. Vérifiez que le port 3000 est libre, ou forcez-le avec
> `next dev -p 3000`.

## Comptes de démonstration

Créés par `npm run db:seed:dev`. Mot de passe commun : **`Demo@PTN2026`**

| Adresse | Profil | Sous-rôle |
|---|---|---|
| `coordonnateur@ptn-rdc.gov.cd` | UGP | Coordonnateur |
| `rpm@ptn-rdc.gov.cd` | UGP | Responsable Passation des Marchés |
| `pointfocal@mptn.gov.cd` | MDA | Point focal projet |
| `partenaire@arptc.cd` | Partenaire | Représentant ARPTC |
| `ttl@worldbank.org` | Bailleur | TTL Banque mondiale |
| `referent@afd.fr` | Bailleur | Référent AFD |
| `contact@congofibre.cd` | Soumissionnaire | Représentant légal |
| `projet@unikin.ac.cd` | SBP | EESU bénéficiaire |
| `audit@cabinet-kin.cd` | Auditeur | Cabinet externe (mission `AUD-EXT-2026-T1`) |
| `copil@presidence.cd` | Gouvernance | Membre COPIL |
| `double@ptn-rdc.gov.cd` | UGP **+** Gouvernance | Chargé PM · Membre CTP |

`double@ptn-rdc.gov.cd` porte **deux habilitations** : c'est le compte qui sert
à éprouver la bascule d'affectation en cours de session.

### Compte d'amorçage

`admin@ptn-rdc.gov.cd` / `Admin@PTN2026` — créé par le seed de production, avec
`mustChangePassword`. Il est dérouté vers `/activation` à la connexion : c'est
le compte qui sert à éprouver le parcours de prise de fonction.

## Le profil n'est pas choisi à la connexion

`LoginDto` n'accepte que `{ email, password }`. Le profil, le sous-rôle,
l'organisation et les permissions découlent de l'**habilitation** accordée par
un administrateur, et sont renvoyés par l'API à la connexion.

L'écran de connexion ne propose donc aucun sélecteur de profil. Le seul choix
légitime concerne les comptes à plusieurs habilitations, et il intervient
**après** authentification, via `POST /auth/switch-assignment`.

## Vérification

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run lint` signale aujourd'hui une cinquantaine de manquements dans les
écrans hérités (accessibilité, effets React). Ils constituent le périmètre de
reprise et sont traités écran par écran lors de la migration.
