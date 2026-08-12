# Assets de marque UGPTN

## À faire — déposer le fichier source

Le logo officiel **n'est pas encore dans le dépôt**. Il a été transmis par
conversation, sous forme d'image ; il doit être enregistré ici pour être utilisé.

En attendant, `BrandLockup` affiche une **reconstitution vectorielle** : elle
reprend la structure de la marque (lettrage, carte en réseau, barre aux couleurs
du drapeau, développé du sigle) mais le tracé de la carte est approximatif. Ce
n'est pas le logo officiel et cela ne doit pas être présenté comme tel.

### Marche à suivre

1. Enregistrer le fichier sous `public/brand/ugptn-logo-source.png`
   (ou `.jpg` — le format d'origine convient).

2. Détourer le fond blanc :

   ```bash
   npm run logo -- public/brand/ugptn-logo-source.png
   ```

   Deux fichiers sont produits :

   | Fichier | Usage |
   |---|---|
   | `ugptn-logo.png` | Fonds clairs — connexion en thème clair, impression |
   | `ugptn-logo-light.png` | Fonds sombres — bandeau Carbon `#161616`, thème g100 |

   Deux variantes sont nécessaires parce que le lettrage est anthracite :
   détouré mais inchangé, il disparaît sur le bandeau sombre. Le script
   n'éclaircit que les pixels sombres et conserve le bleu de la carte.

3. Prévenir : `BrandLockup` sera basculé sur ces fichiers.

### Le format qui compte vraiment

Un **SVG** vaut mieux que n'importe quel PNG : net à toute taille, net à
l'impression — et les usagers de cette plateforme impriment des dossiers ANO et
des procès-verbaux — pour quelques kilo-octets. Si le studio qui a produit le
logo peut fournir le fichier vectoriel d'origine (`.svg`, `.ai` ou `.eps`), c'est
lui qu'il faut, et le script de détourage devient inutile.

Idéalement, à terme :

| Fichier | Usage | Contrainte |
|---|---|---|
| `ugptn-logo.svg` | Référence | Fond transparent, tracés vectoriels (pas de bitmap embarqué) |
| `favicon.svg` + `icon-512.png` | Onglet, PWA | Glyphe cartographique seul, lisible à 16 px |

## Couleurs relevées sur le logo

Déclarées dans [`src/styles/tokens.scss`](../../src/styles/tokens.scss).

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
affordances interactives utilisent `--ptn-accent`, qui varie selon le profil.

Raison : si la couleur de marque et la couleur d'action appartiennent à la même
famille de bleu, plus rien ne distingue « ceci est notre logo » de « ceci se
clique ». Pour un public d'agents publics souvent seniors, dont la lisibilité des
affordances est le premier critère d'utilisabilité, cette ambiguïté est
disqualifiante.

En pratique :

- `--ptn-brand` → signature, page de connexion, en-têtes imprimés.
- `--ptn-accent` → boutons, liens, onglet actif, focus, sélection.

## Tailles minimales

`BrandLockup` propose trois variantes. Le choix n'est pas cosmétique :

| Variante | À partir de | Contenu |
|---|---|---|
| `wordmark` | 16 px | Lettrage seul — bandeau applicatif de 48 px |
| `mark` | ~40 px | Lettrage + carte |
| `full` | ~72 px | Signature complète avec le développé du sigle |

Sous environ 40 px, les nœuds de la carte tombent sous le pixel et se réduisent
à une tache : mieux vaut un lettrage parfaitement lisible que la marque entière
illisible.
