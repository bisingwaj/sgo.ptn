# Actifs de marque

Les fichiers de `public/brand/` sont **générés**. Ne les modifiez pas à la main :
ils sont écrasés à la prochaine exécution du script. Les sources sont dans
`public/assets/`.

## Régénérer

```bash
S=scripts/logo-transparent.mjs

node $S public/assets/ugptn.jpeg  public/brand/ugptn-logo.png        --mode=couleur    --height=280
node $S public/assets/ugptn.jpeg  public/brand/ugptn-logo-light.png  --mode=clair      --height=280
node $S public/assets/eco-num.png public/brand/eco-num.png           --mode=couleur    --height=112
node $S public/assets/eco-num.png public/brand/eco-num-mono.png      --mode=mono-blanc --height=112
node $S public/assets/ptntic.png  public/brand/ptntic.png            --mode=couleur    --height=112
node $S public/assets/ptntic.png  public/brand/ptntic-mono.png       --mode=mono-blanc --height=112
```

## Ce que fait le script

Les trois sources arrivent sur **fond blanc opaque** (70 à 85 % de la surface).
Posées telles quelles sur le bandeau Carbon `#161616`, elles apparaîtraient dans
un rectangle blanc.

**Détourage par rampe, et non par seuil.** Un seuil unique pose un dilemme :
placé haut, il laisse passer le voile de compression du JPEG — la source UGPTN
porte une salissure de numérisation à 229 de luminosité, invisible sur blanc et
bien nette sur fond sombre ; placé bas, il ronge l'anticrénelage et découpe les
lettres en escalier. La rampe traite les deux : au-dessus de 228 le pixel est du
fond, en dessous de 195 il appartient au tracé, et entre les deux l'opacité
varie continûment — ce qu'est exactement un bord anticrénelé.

Le canal **le plus sombre** décide, et non la moyenne : un aplat coloré saturé
(le bleu de la carte, le rouge des armoiries) garde ainsi son opacité pleine.

### Les trois modes

| Mode | Effet | Usage |
|---|---|---|
| `couleur` | Fond retiré, couleurs d'origine | Fonds clairs, impression |
| `clair` | Fond retiré, pixels sombres éclaircis | Fonds sombres, en conservant le bleu de la carte |
| `mono-blanc` | Aplat blanc, opacité suivant l'obscurité | Marques secondaires sur fond sombre |

## Fichiers produits

| Fichier | Dimensions | Usage |
|---|---|---|
| `ugptn-logo.png` | 553 × 280 | Signature sur fond clair |
| `ugptn-logo-light.png` | 553 × 280 | Signature sur fond sombre (bandeau, connexion) |
| `ptntic.png` · `ptntic-mono.png` | 290 × 112 | Ministère des Postes et Télécommunications |
| `eco-num.png` · `eco-num-mono.png` | 236 × 112 | Ministère de l'Économie Numérique |

Environ 110 Ko au total. Les hauteurs visent le double de la taille d'affichage,
ce qui couvre les écrans à densité 2×, et rien de plus.

## Deux règles d'affichage

**1. Pas de ré-encodage.** `BrandLockup` et `PartnerMarks` passent `unoptimized`
à `next/image`. Par défaut, l'optimiseur sert du WebP à qualité 75 : sur un logo,
cette compression avec perte fabrique des salissures — un trait parasite
apparaissait sous le lettrage, absent du fichier source. Les actifs sont déjà
détourés, dimensionnés et compressés ici.

**2. Hiérarchie.** L'UGPTN est la marque de la plateforme ; le MPTN et
l'Économie Numérique l'accompagnent. Trois moyens y concourent : la taille (un
tiers de la hauteur), l'aplat blanc sur fond sombre — deux armoiries en couleurs
à côté de la signature produiraient trois foyers d'attention concurrents — et la
mention « Sous la tutelle de », qui énonce le rapport au lieu de le laisser
deviner.

## Couleurs

Déclarées dans [`src/styles/tokens.scss`](../../src/styles/tokens.scss).

| Rôle | Valeur | Carbon |
|---|---|---|
| Bleu du réseau cartographique | `#1192E8` | Cyan 50 — coïncidence exacte |
| Anthracite du lettrage | `#161616` | Gray 100 |
| Jaune du filet | `#F1C21B` | Yellow 30 |
| Rouge du filet | `#DA1E28` | Red 60 |

**La marque identifie, l'accent agit.** `--ptn-brand` ne colore jamais un
élément cliquable : les affordances utilisent `--ptn-accent`, qui varie selon le
profil. Si la couleur de marque et celle d'action appartiennent à la même
famille de bleu, plus rien ne distingue « ceci est notre logo » de « ceci se
clique ».

## À demander

Un **SVG** de chaque logo. Le vectoriel reste net à toute taille et à
l'impression — les usagers impriment des dossiers ANO et des procès-verbaux —
pour quelques kilo-octets, et rendrait le détourage inutile. Un `favicon.svg`
tiré du glyphe cartographique seul serait également utile.
