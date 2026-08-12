# PTN-RDC · Mise en route locale

## Prérequis

- Node.js 20 ou supérieur
- PostgreSQL 16 ou supérieur

## 1. Base de données

Le projet attend PostgreSQL sur le **port 5433**, base `ptn_rdc`, rôle `ptn`.
Le port 5433 — et non 5432 — évite tout conflit avec une instance PostgreSQL
déjà installée sur le poste.

### Option A — Docker (non disponible sur tous les postes)

```bash
cd backend && npm run db:up
```

### Option B — Grappe dédiée, sans Docker

Crée une instance PostgreSQL isolée, indépendante de celle éventuellement déjà
installée. Aucun mot de passe à connaître, aucune base existante touchée.

```bash
export PATH="/Library/PostgreSQL/18/bin:$PATH"   # adapter la version

initdb -D "$HOME/.ptn-rdc-pg" -U ptn --auth=trust --encoding=UTF8 --locale=C
pg_ctl -D "$HOME/.ptn-rdc-pg" -o "-p 5433 -k /tmp" -l "$HOME/.ptn-rdc-pg/server.log" start
psql -h localhost -p 5433 -U ptn -d postgres -c "ALTER ROLE ptn WITH PASSWORD 'ptn_dev_password';"
createdb -h localhost -p 5433 -U ptn ptn_rdc
```

Commandes de service :

```bash
pg_ctl -D "$HOME/.ptn-rdc-pg" stop      # arrêter
pg_ctl -D "$HOME/.ptn-rdc-pg" -o "-p 5433 -k /tmp" -l "$HOME/.ptn-rdc-pg/server.log" start
rm -rf "$HOME/.ptn-rdc-pg"              # supprimer entièrement
```

## 2. Backend

```bash
cd backend
cp .env.example .env        # les valeurs par défaut conviennent en local
npm install
npm run db:deploy           # applique les migrations
npm run db:seed             # référentiel MEP + administrateur d'amorçage
npm run db:seed:dev         # comptes de démonstration (développement seulement)
npm run start:dev           # http://localhost:3001/api
```

Documentation OpenAPI : <http://localhost:3001/api/docs>

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
