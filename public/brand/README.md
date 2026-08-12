# Assets de marque UGPTN

## Manquant — à fournir

Le logo transmis est en basse définition, sur **fond blanc opaque**. Il est donc
inutilisable tel quel : sur le header Carbon (fond `#161616`) il apparaîtrait
dans un rectangle blanc, et sur le thème sombre g100 également.

Fichiers attendus dans ce dossier :

| Fichier | Usage | Contrainte |
|---|---|---|
| `ugptn-logo.svg` | Référence vectorielle | Fond **transparent**, tracés vectoriels (pas d'image bitmap embarquée) |
| `ugptn-logo-mono-light.svg` | Header sombre, g100 | Aplat blanc unique |
| `ugptn-logo-mono-dark.svg` | Impression, fond clair | Aplat `#161616` unique |
| `favicon.svg` + `icon-512.png` | Onglet, PWA | Glyphe cartographique seul, lisible à 16 px |

Le SVG est le format qui compte : il reste net à l'impression (les usagers de
cette plateforme impriment des dossiers ANO et des PV) et pèse quelques kilo-octets.

## Couleurs relevées sur le logo

Elles sont déclarées dans [`src/styles/tokens.scss`](../../src/styles/tokens.scss).

| Rôle | Valeur | Correspondance Carbon |
|---|---|---|
| Bleu du réseau cartographique | `#1192E8` | Cyan 50 — coïncidence exacte |
| Anthracite du lettrage | `#161616` | Gray 100 |
| Jaune de la barre d'accent | `#F1C21B` | Yellow 30 |
| Rouge de la barre d'accent | `#DA1E28` | Red 60 |

Le bleu de la marque tombe sur Carbon Cyan 50 : l'identité visuelle et le design
system sont compatibles sans compromis.

## Règle d'usage

**La marque identifie, l'accent agit.**

`--ptn-brand` (le cyan du logo) ne colore **jamais** un élément cliquable. Les
affordances interactives utilisent `--ptn-accent`, qui varie selon le profil actif.

Raison : si la couleur de marque et la couleur d'action sont la même famille de
bleu, plus rien ne distingue « ceci est notre logo » de « ceci se clique ». Pour
un public d'agents publics souvent seniors, dont la lisibilité des affordances est
le premier critère d'utilisabilité, cette ambiguïté est disqualifiante.

En pratique :

- `--ptn-brand` → signature, page de connexion, en-têtes imprimés, onboarding.
- `--ptn-accent` → boutons, liens, onglet actif, focus, sélection.
