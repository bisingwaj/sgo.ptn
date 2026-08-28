---
name: consignes-champs
description: Les consignes de rédaction des huit champs de texte du TDR — densités cibles mesurées sur les documents réels de l'UGPTN, variation par type d'activité, méthode d'enrichissement et plafonds techniques à relever. À charger avant toute modification de CONSIGNES dans backend/src/ai/tdr-assist.service.ts.
---

# Les consignes de champ — densité et cadrage

`CONSIGNES` (`backend/src/ai/tdr-assist.service.ts:623`) porte l'attendu des
huit champs de texte. Un champ sans consigne est refusé — c'est voulu.

**Charger d'abord `preambule-institutionnel`.** Une partie de la minceur
constatée ne vient pas des consignes mais de 848 mots que la plateforme ne
compose pas.

---

## 1. L'écart mesuré

Relevé sur quatre TDR de l'UGPTN, composante C3.

| Champ | Consigne actuelle | Documents réels | Cible |
|---|---|---|---|
| `context` | 2–3 §, 180–260 mots | 3 §, 192–382 mots *(part spécifique)* | **3–4 § denses, 320–450 mots** |
| `justification` | 1–2 §, 120–180 mots | fondue dans le contexte | **2–3 §, 220–320 mots** |
| `beneficiaries` | 1 §, 60–110 mots | — | **1–2 §, 120–180 mots** |
| `expectedResults` | **3 à 6 résultats** | **21 à 60 §** · 832–1 652 mots | **8–15 résultats structurés** |
| `approach` | 2 §, 120–200 mots | — | **2–3 §, 200–300 mots** |
| `methodology` | étapes, une par ligne | — | **6–10 étapes, chacune avec son produit** |
| `constraints` | une par ligne | — | **4–8, chacune avec son effet** |
| `expertise` | profils-clés | — | **3–6 profils, domaine + expérience minimale** |

**L'écart critique est sur `expectedResults` : un facteur dix.** La consigne
en demande trois à six ; les dossiers réels en portent de vingt à soixante
paragraphes. C'est le premier champ à reprendre.

Les tirets marquent les champs que les TDR d'exemple ne séparent pas — leur
plan diffère de celui de la plateforme. Les cibles y sont extrapolées de la
densité générale, et doivent être confirmées sur d'autres dossiers.

---

## 2. La variation par type — ce que la structure actuelle ne sait pas dire

`CONSIGNES` est un `Record<string, string>` : une consigne par champ, la même
pour tous les types d'activité. Les mesures l'invalident.

| Document | Livrables |
|---|---|
| Atelier Harmonisation Curricula | **3 §** · 57 mots |
| Recrutement Consultant-Firme Hackathons | 2 § · 132 mots |
| Appui Lancement Masters | **58 §** · 1 575 mots |

Un rapport de vingt entre un atelier et un appui au lancement. Une consigne
unique produira toujours l'un ou l'autre à contretemps.

**La clé doit devenir `champ × tdrTypeCode`**, avec repli sur une consigne
générique quand le couple n'est pas déclaré :

```ts
CONSIGNES[`${champ}:${tdrTypeCode}`] ?? CONSIGNES[champ]
```

Le repli est important : onze types de TDR × huit champs feraient 88 consignes
à écrire avant que quoi que ce soit fonctionne. On spécialise là où la mesure
le justifie, et nulle part ailleurs.

---

## 3. Ce qui fait qu'une consigne fonctionne

Les consignes actuelles ne sont pas mauvaises — leur défaut est le volume, pas
la méthode. **Ce qu'elles font bien, à conserver :**

- **Elles disent ce qu'il ne faut PAS mettre là.** « Les POPULATIONS servies,
  jamais l'institution maître d'ouvrage — c'est la confusion la plus fréquente
  sur ce champ. » C'est la partie qui porte le résultat.
- **Elles situent la section dans le document.** « La section Contexte précède
  celle-ci et a déjà exposé la situation. » C'est ce qui empêche les sections
  de se recopier, défaut le plus fréquent des dossiers reçus.
- **Elles donnent un contre-exemple.** « "le centre traite les incidents
  24 h/24" est un résultat, "installer les serveurs" n'en est pas un. » Un
  contre-exemple vaut trois lignes d'explication.

**Ce qu'elles ne doivent jamais faire :**

- **Porter un fait.** Les faits vont dans `project-knowledge.ts` ou dans
  l'ancrage vivant (`liveGrounding`). Une consigne dit COMMENT écrire, jamais
  QUOI savoir — sans quoi les deux dérivent séparément et finissent par se
  contredire.
- **Fixer une longueur sans structure.** « 400 mots » produit du délayage.
  « Quatre paragraphes : le premier situe X, le deuxième établit Y… » produit
  de la structure. **Toujours cadrer le PLAN, la longueur suit.**

---

## 4. Le plan imposé — la forme que doit prendre l'enrichissement

Exemple sur `context`, une fois le préambule composé en amont :

```
Attendu : trois à quatre paragraphes denses, 320 à 450 mots.

Le contexte général du projet, la description du PTN, ses composantes et sa
portée géographique PRÉCÈDENT votre texte et sont déjà rédigés. Ne les
répétez pas. Vous commencez au rattachement à la composante.

§1 — Le rattachement. Ce que la composante N poursuit, et la place de
     l'activité du plan annuel dans cet ensemble.
§2 — Le besoin précis auquel CE marché répond. Ce qui existe aujourd'hui,
     ce qui manque, et à quoi cela se constate.
§3 — Ce que le marché doit produire, et pourquoi cette voie plutôt qu'une
     autre.
§4 (si l'objet le justifie) — L'articulation avec les autres activités du
     projet, sans en inventer aucune.

N'énumérez ni objectifs ni livrables : ils ont leurs sections. Ne concluez
pas par une formule d'ouverture — le paragraphe s'arrête sur sa dernière
information.
```

La numérotation des paragraphes est ce qui produit la densité. Sans elle, un
modèle prié d'écrire 400 mots écrit 250 mots dilués.

---

## 5. Les plafonds à relever

Trois contraintes techniques bloquent les cibles ci-dessus.

| Plafond | Où | Effet | À faire |
|---|---|---|---|
| `maxTokens: 1600` | `tdr-assist.service.ts:508` (objectifs) | 6 à 10 objectifs argumentés n'y tiennent pas | Relever, ou scinder l'appel |
| `maxTokens: 1600` | `:580` (livrables) | 58 livrables encore moins | Idem |
| `PLAFOND_REDACTION = 3000` | `:110` | Suffisant pour 450 mots — **ne pas y toucher sans mesurer** | Rien |

`PLAFOND_REDACTION` couvre déjà largement les cibles de texte : 450 mots
français valent ~700 jetons. Le relever sans raison rouvrirait le risque
documenté dans `reprise-assistant-ia.md` — chez ce fournisseur, `max_tokens`
compte aussi la réflexion.

### Deux routes mortes à supprimer

`assistContext` (`maxTokens: 700`) et `assistJustification` (`600`) :
**zéro usage** hors `src/lib/api.ts`. Les huit champs passent par
`assistance/champ/flux`. Laisser ces routes, c'est laisser à quelqu'un
l'occasion de les rebrancher et de retrouver la coupure à 250 mots.

---

## 6. Le mur qu'aucune consigne ne franchit

`prepareField` ne passe **jamais** `tools:`. La génération d'un champ est un
appel unique, sans outil : le modèle ne peut ni chercher sur internet, ni lire
l'activité PTBA, ni consulter le corpus documentaire.

Un contenu « recherché, argumenté, contextualisé » a donc un plafond
structurel. Deux voies, à trancher avant d'écrire les consignes définitives :

| Voie | Coût | Effet |
|---|---|---|
| **Élargir l'ancrage préalable** — `liveGrounding` charge l'activité PTBA complète (objectifs, livrables, indicateurs) avant l'appel | ~300 jetons, cachables mal car variables par dossier | Le modèle écrit sur du matériau réel sans délibérer |
| **Rendre le chemin agentique** — outils sur la rédaction de champ | Coût par tour, latence multipliée | Le modèle va chercher ce qui manque |

**Recommandation : la première.** La seconde transforme une rédaction de dix
secondes en une délibération d'une minute, et `reprise-assistant-ia.md` a déjà
établi que rédiger n'est pas délibérer.

---

## 7. Méthode — enrichir une consigne

1. **Mesurer** le champ dans les TDR réels : paragraphes, mots, sous-structure.
2. **Séparer le fixe du variable.** Ce qui se répète part au gabarit.
3. **Écrire le PLAN**, paragraphe par paragraphe, pas une longueur.
4. **Nommer ce qu'il ne faut pas écrire** — la partie qui porte.
5. **Éprouver sur un dossier réel**, et comparer au TDR d'exemple du même type.
6. **Compter les jetons.** Une consigne qui double coûte à chaque génération —
   elle est après la césure de cache, donc jamais amortie.

Une consigne ne se juge pas à la lecture. La cinquième étape n'est pas
facultative.
