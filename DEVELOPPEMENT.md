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

### Les variables de l'interface

Deux, et pas une de plus — ce sont les seules que le code lit :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_URL` | Adresse de l'API. Barre oblique finale exclue, suffixe `/api` compris |
| `NEXT_PUBLIC_SESSION_IDLE_MINUTES` | Minutes d'inactivité avant fermeture de la session |

Le préfixe `NEXT_PUBLIC_` les **inscrit dans le code envoyé au navigateur**, à
la compilation. Elles sont publiques par construction : aucune clé, aucun mot
de passe n'y a sa place. Tous les secrets vivent dans `backend/.env`.

**Rien à faire pour démarrer.** Trois fichiers se relaient selon la commande :

| Fichier | Lu par | Versionné |
|---|---|---|
| `.env.local` | `next dev` | non — c'est le vôtre |
| `.env.production` | `next build`, `next start` | **oui**, et à dessein |
| `.env.example` | personne — c'est le modèle de `.env.local` | oui |

`.env.production` porte l'API réelle
(`https://ugpt-api.urgences-rdc.com/api`). Il est versionné parce qu'il ne
contient que des valeurs publiques, et qu'une construction ne devrait pas
dépendre d'une configuration posée hors du dépôt. Conséquence à connaître :
**`npm run build` puis `npm run start` visent la production**, pas votre
backend local. Le développement, lui, n'est pas concerné — `next dev` ne lit
jamais ce fichier.

Une variable réellement présente dans l'environnement l'emporte sur ces
fichiers. L'ordre est donc : réglages Vercel › arguments Docker ›
`.env.local` › `.env.production`.

Pour viser autre chose en développement — un backend sur un autre port, un
serveur distant, ou un délai d'inactivité court pour éprouver le préavis de
déconnexion :

```bash
cp .env.example .env.local     # puis ajuster
```

### Se connecter avec un compte réel, depuis le local

Les comptes vivent **dans la base**. Un compte du site en ligne n'existe donc
pas dans la base locale, et la base locale ne contient que les comptes de
démonstration. Pour utiliser ses identifiants réels, il faut viser l'API de
production — ce que le CORS interdit à un navigateur ouvert sur `localhost` :

```
Origin: http://localhost:3000       → 404, aucun Access-Control-Allow-Origin
Origin: https://sgo-ptn.vercel.app  → 204, en-tête présent
```

**Le CORS ne s'applique qu'aux appels partant d'une page.** Quand le serveur
Next relaie lui-même, l'appel devient serveur-à-serveur et sort du domaine du
mécanisme. Le navigateur n'appelle plus que sa propre origine.

```bash
# dans .env.local
NEXT_PUBLIC_API_URL=/api-distant
API_PROXY_TARGET=https://ugpt-api.urgences-rdc.com/api
```

Le relais est déclaré dans `next.config.ts` et **n'existe que si
`API_PROXY_TARGET` est posée**. Sans préfixe `NEXT_PUBLIC_`, elle reste au
serveur : le navigateur ne connaît jamais l'adresse réelle. Vercel et l'image
Docker n'ayant pas de `.env.local`, leur comportement est intact.

**Rien n'a été ouvert en production.** Ajouter `http://localhost:3000` à
`CORS_ORIGIN` aurait exposé la production à toute machine de développement ;
le contournement vit du côté de qui en a besoin.

> ⚠️ **Vous travaillez alors sur les données réelles.** Un TDR créé en local
> est un TDR créé en production, une validation de PTBA y est définitive.
> Pour revenir à la base locale : `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
> et retirer `API_PROXY_TARGET`.

> **Une variable vide n'est pas une variable absente.** `??` ne rattrape que
> l'absence : une chaîne vide traverse. Une adresse d'API vide envoie les
> appels en relatif contre le serveur de l'interface, et `Number("")` vaut
> `0`, donc un délai d'inactivité vide fermerait la session sur-le-champ.
> `src/lib/env.ts` ferme les deux cas ; les valeurs se lisent par
> `texteEnv` et `nombreEnv`, jamais par `process.env` en direct.

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
