# Reprise — l'assistance rédactionnelle du TDR

Note de travail, écrite pour ouvrir un fil dédié à la **génération qui
s'interrompt**. Elle porte ce qui a été établi, ce qui reste à faire, et
l'outillage à ne pas refabriquer.

Dernière mise à jour : 25 août 2026 — diagnostic mesuré, non plus présumé.

---

## 1. Le défaut à traiter

> « La génération s'arrête en milieu de phrase et ne reprend pas. Elle ne se
> rétablit pas d'elle-même. Il faut tout recommencer. »

### Diagnostic ÉTABLI — mesuré sur le fournisseur, le 25 août 2026

La présomption consignée plus bas visait le bon suspect — `maxTokens: 900` —
mais pour la mauvaise raison. Ce ne sont pas les sections qui sont longues.

**`deepseek/deepseek-v4-flash-0731` est un modèle à raisonnement, et
`max_tokens` compte les jetons de raisonnement.** Le plafond n'est donc pas
un budget de texte : c'est un budget de réflexion PUIS de texte, et la
réflexion se sert la première.

Reproduit sur la vraie route du fournisseur, avec une consigne de « Contexte »
réaliste :

| `max_tokens` | raisonnement | texte visible | `finish_reason` | résultat |
|---|---|---|---|---|
| **900** (valeur en place) | 586 | 314 | **`length`** | coupé sur « …la nécessité de poser » |
| **3000** | 426 | 645 | `stop` | 384 mots, phrase achevée |

Une section de « Contexte » demande donc environ **1 100 à 1 250 jetons au
total**. À 900, la coupure n'est pas un risque : elle est certaine.

Le coût ne s'y oppose pas — 0,04 / 0,08 USD par million de jetons, soit
environ **0,0006 USD la génération**. Le plafond de 900 n'économisait rien.

### Le second défaut, mesuré au passage : la moitié de l'attente est muette

Le modèle émet **383 fragments portant `reasoning` avec `content: ""`**.
`AiService.stream` filtre sur `if (delta?.content)` — la chaîne vide est
fausse — et ne transmet donc **rien du tout** pendant toute cette phase.

Mesuré, chronomètre en main, sur une génération de 15,9 s :

```
1er signe de raisonnement   :  4,3 s   (invisible : rien n'est transmis)
1er mot visible à l'écran   :  7,4 s   <-- silence total jusque-là
fin du flux                 : 15,9 s
```

**Près de la moitié de l'attente se passe devant un écran qui ne dit rien**,
alors que le fournisseur, lui, parle sans interruption. C'est ce que l'auteur
décrit comme un manque de fluidité et d'indication de l'étape en cours.

### Le troisième : les pièces jointes ne peuvent pas fonctionner

Relevé au catalogue OpenRouter : `deepseek/deepseek-v4-flash-0731` déclare
`input_modalities: ["text"]`. Ni image, ni fichier. `messagePieces`
(`tdr-agent.service.ts`) compose pourtant des blocs `image_url` et `file`.
Des trois modèles examinés, seul `anthropic/claude-sonnet-4.5` accepte un
PDF ; `deepseek-v4-flash-vision-exp` lit les images mais pas les fichiers.

**Décision de l'auteur** : garder DeepSeek, et DÉSACTIVER le bouton en
disant le motif réel plutôt que de le masquer. La capacité se lira au
catalogue du fournisseur et non en dur, de sorte qu'un changement de modèle
en configuration rallume le bouton sans toucher au code.

### Comment le vérifier à nouveau

```bash
curl -s https://openrouter.ai/api/v1/models \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; \
      m=[x for x in d if x['id']=='deepseek/deepseek-v4-flash-0731'][0]; \
      print(m['architecture']['input_modalities'], m['context_length'])"
```

Le catalogue est public : aucune clé n'est nécessaire pour lire les
capacités. La clé ne sert qu'à l'appel de génération lui-même.

---

## 1 ter. Ce qui a été livré le 25 août 2026

### Le remède, et pourquoi il n'était pas celui qu'on croyait

Relever le plafond ne suffisait pas : à 3000, une REPRISE consommait
l'intégralité du budget en réflexion et rendait **zéro caractère**, avec
`tronque: true`. Le champ était alors effacé et l'assistant annonçait une
réussite — c'est le défaut « il dit qu'il a écrit et je ne vois rien ».

La réflexion est donc **coupée** sur les chemins de rédaction
(`ChatRequest.raisonnement: 'aucun'`). Rédiger n'est pas délibérer : la
consigne, l'ancrage et les repères sont déjà dans l'invite. Mesuré à
consigne identique :

| réglage | durée | raisonnement | texte |
|---|---|---|---|
| défaut | 50,7 s | 1531 | 1959 car |
| `effort: low` | 42,8 s | 127 | 2233 car |
| **`enabled: false`** | **20,2 s** | **0** | 1659 car |

Le cas qui rendait zéro caractère rend désormais 1791 caractères,
`tronque: false`, en 16,6 s. **L'agent garde sa réflexion** : lui choisit
des outils et enchaîne des tours, ce qui est une vraie délibération.

### Les six défauts traités

| Défaut | Remède | Vérifié |
|---|---|---|
| Coupure en milieu de phrase | `finishReason` propagé jusqu'à `fin.tronque`, plafond à 3000, réflexion coupée | 0 → 1791 car |
| Perte du texte engendré | `persist` immédiat + `alignerSurLaBase(id, [champ])` ciblé | survit au rechargement |
| Deux surfaces qui s'ignorent | `travail` UNIQUE dans `assistant-contexte` | bouton désactivé pendant que le fil écrit |
| Impossible d'arrêter | `AbortController` dans le contexte, deux boutons | texte partiel conservé |
| Le fil muet pendant l'action | `ouvrirEnLigne` + mises à jour au fil de l'eau | actes visibles à 900 ms |
| Listes écrasées par l'agent | `mode: 'ajouter'` par défaut sur `ecrire_champ` | 10 → 11, les dix intacts |

### Ce qui reste ouvert

1. **La poursuite après coupure** (`POST /assistance/champ/suite`) est
   écrite et branchée, mais elle n'a **pas encore été déclenchée en vrai** :
   depuis que la réflexion est coupée, `tronque` ne se produit plus sur les
   cas d'essai. À provoquer en abaissant `PLAFOND_REDACTION` le temps d'un
   test.
2. **Le raccord de la poursuite** — la règle de recollage
   (`continueField`) n'a pas été éprouvée sur un vrai texte coupé.
3. **`ListeEntrees` n'a pas de bouton d'arrêt effectif** : les routes de
   liste sont des POST bloquants, non des flux. `assistant.interrompre`
   coupe l'affichage, pas la requête.
4. **Les autres écrans** (`/assistant`, hors parcours TDR) n'ont reçu
   aucune de ces corrections.

---

---

## 1 bis. La présomption d'origine, conservée pour mémoire

### Diagnostic établi — forte présomption, non encore prouvée

`TdrAssistService.streamField` — `backend/src/ai/tdr-assist.service.ts`,
autour de la ligne 736 :

```ts
for await (const ev of this.ai.stream({ …, maxTokens: 900 })) {
  if (ev.type === 'texte') { accumule += ev.delta; yield …; }
}
…
yield { type: 'fin', texte: sansBalisage(accumule) };
```

Deux constats :

1. **`maxTokens: 900`**, là où le défaut du service est 1200
   (`ai.service.ts:263`). Les huit champs de texte du TDR — contexte,
   justification, méthodologie… — sont des sections longues.
2. **La boucle ne consomme QUE `ev.type === 'texte'`.** Le motif d'arrêt
   renvoyé par le fournisseur est capté par `AiService` (`finishReason`,
   `ai.service.ts:389-392`) mais **`streamField` l'ignore**. Quand le modèle
   s'arrête parce qu'il a atteint la limite, le flux se termine simplement,
   `fin` part avec un texte tronqué, et **rien ne dit que c'était une coupure**.

C'est exactement le symptôme décrit : ça s'arrête, ça ne reprend pas, et
personne n'est prévenu.

### Ce qui est déjà traité ailleurs — à reprendre comme modèle

Le cas `length` EST géré sur deux autres chemins, ce qui donne le ton à
suivre :

| Endroit | Comportement |
|---|---|
| `tdr-agent.service.ts:909` | `yield { type: 'erreur', message: 'La réponse a été coupée. Reformulez plus court.' }` |
| `tdr-assist.service.ts:118` | `'La proposition a été coupée avant sa fin. Relancez : le texte sera plus court.'` |

Seul le chemin **en flux** — celui que l'auteur utilise le plus — n'a rien.

### Pistes, par ordre de coût

1. **Dire la coupure.** Propager `finishReason` jusqu'à l'événement `fin`, et
   l'afficher. Le moins cher, et cela supprime déjà le « on ne sait pas ce qui
   s'est passé ».
2. **Relever le plafond** de 900 à la valeur du service, ou par champ selon la
   longueur attendue. À mesurer avant : combien de jetons font réellement une
   section ?
3. **Poursuivre.** Relancer avec le texte déjà produit et une consigne de
   continuation. C'est la seule qui « se rétablit d'elle-même », et la plus
   délicate : il faut éviter la répétition de la charnière.

**À vérifier avant de coder** : le motif d'arrêt réel. Le fournisseur est
OpenRouter, le modèle courant `deepseek/deepseek-v4-flash-0731`
(`backend/.env`). Un `finish_reason` autre que `length` — coupure réseau,
délai — changerait entièrement le remède. `AiService.TIMEOUT_DEFAUT` et
l'`AbortController` de `ai.service.ts:199-207` sont l'autre suspect.

### Le reste du lot annoncé

L'auteur a dit « un peu plus d'un problème à examiner » sur l'assistant.
Les autres n'ont pas été énoncés — les lui demander avant de commencer.

---

## 2. Architecture de l'assistance, en bref

Détail complet dans la compétence `tdr` (`.claude/skills/tdr/`), à charger
avant toute intervention. L'essentiel :

```
prepareField()   consigne + ancrage + régime rédaction/reprise
   ├── proposeField()  → POST /assistance/champ       (un bloc)
   └── streamField()   → POST /assistance/champ/flux  (SSE)   ← le défaut est ici
```

- `backend/src/ai/field-registry.ts` est la **seule autorité** sur ce qu'un
  modèle peut écrire. Un champ absent n'existe pas pour lui.
- Ne jamais dupliquer la construction du prompt : le texte d'un champ ne doit
  pas dépendre de la porte par laquelle on le demande.
- Le flux est **réel**. Ne jamais recevoir un texte complet pour le révéler
  lentement.
- Côté écran : `src/lib/agent-stream.ts`, `src/app/tdr/nouveau/AgentPanel.tsx`
  (une vue), `assistant-contexte.tsx` (la mémoire).

---

## 3. Ce qui a été livré, et qui sert de base

Tout est sur `main`, poussé. Huit commits, de `d36d56d` à `6c8086b`.

### PTBA — l'exercice devient le contenant

`EnteteExercice` partagé par `/ptba` et `/ptba/exercices/[year]` : deux
sections nommées, **Allocations** et **Plan**, avec leurs chiffres. L'année
voyage dans l'URL partout — `/ptba?annee=`, `/ptba/nouveau?annee=`.

### TDR — parcours de rédaction

| | |
|---|---|
| Listes déroulantes | Carbon `Dropdown`/`ComboBox`, plus aucun `<select>` natif |
| Rail des étapes | numéro conservé, coche à droite, numéro neutre |
| Reprise | ouvre sur la première étape **incomplète**, déduite de l'état |
| Modale | rendue par **portail** — voir les pièges ci-dessous |
| Gabarits | amorces de saisie pour objectifs et livrables |
| Saisie libre | postes, clauses, indicateurs, risques, risques E&S |
| Provinces | « Retenir toute la RDC » ; l'absence ne vaut plus national |
| Hors plan | case à l'étape 02, budget sans plafond, IA prévenue |
| Manques | chaque avertissement porte « Corriger à l'étape NN · Nom » |
| Document | mention de rédaction assistée et section « Engagements » retirées |

### Décisions prises avec l'auteur — ne pas rouvrir

- Une entrée libre appartient **au dossier**, jamais à la bibliothèque.
- Un TDR hors plan se déclare par une **simple case**, sans motif.
- « Générer le document » et « Transmettre » sont **deux actions** distinctes.
- L'absence de province ne vaut plus couverture nationale, **TDR et PTBA**.

---

## 4. Pièges rencontrés — chacun a coûté du temps

| Piège | Ce qui se passe |
|---|---|
| **Contexte d'empilement** | `.bodyContent` anime l'opacité, donc crée un contexte : le `z-index: 9000` d'une modale Carbon n'y a plus cours. Toute boîte de dialogue d'une étape doit passer par un **portail** |
| **Ancre d'infobulle en `block`** | `Tooltip` s'ancre sur son enveloppe, large comme le conteneur : la bulle part au bord de l'écran. Poser `inline-flex` autour d'un pictogramme |
| **Chaîne vide vs `null`** | Un champ de formulaire porte `""` ; `@IsUUID()` le refuse et le serveur rend **500**, sans message. Normaliser à `null` avant l'envoi |
| **`npm run build` pendant `npm run dev`** | Les deux se disputent `.next/`, le serveur sert du vide. Arrêter `dev` avant de builder — même piège que `nest build` face à `start:dev` |
| **Champ Carbon dans une rangée** | Étiquette et texte d'aide font partie du bloc : aligner des boutons dessus les décale. Sortir l'étiquette et l'aide de la rangée |
| **Route froide** | 30 à 60 s en `dev`. La chauffer avant tout test navigateur, sinon les échecs sont des faux positifs |

---

## 5. Outillage de vérification

Pilotage d'un Chrome sans interface par CDP, sans dépendance à installer.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 --no-first-run \
  --user-data-dir=<dossier> about:blank &
```

Un socle `ouvrir({ largeur, hauteur, email })` ouvre une session — connexion
par l'API, jeton posé dans `localStorage` sous `ptn-rdc.refreshToken` — puis
rend `{ cmd, ev, pause, capture, journal, fermer }`.

Points à connaître :

- **`/auth/login` est limité à 10 par minute** (`auth.controller.ts:50`). Une
  rafale rend des 429 qui ressemblent trait pour trait à de mauvais mots de
  passe. Espacer.
- Le thème se force par `localStorage.setItem('ptn-rdc.theme','g10'|'g100')`,
  et il faut **recharger** : basculer en direct laisse des valeurs calculées
  périmées.
- Les transitions faussent les mesures en mode sans interface. Injecter
  `*{transition:none!important;animation:none!important}` avant de mesurer.
- `pointerenter` ne remonte pas : émettre `pointerover` pour déclencher une
  infobulle.
- **Tout contrôle négatif exige un contrôle positif.** Une extraction qui ne
  trouve rien de ce qui DOIT être là ne prouve rien.

### Brouillons d'essai

| Référence | Auteur | Utilité |
|---|---|---|
| `PTN-2026-014` | `coordonnateur@ptn-rdc.gov.cd` | complet sauf la catégorie E&S — atteint l'étape 18 |
| `PTN-2026-008` | `rcomp1@ptn-rdc.gov.cd` | reprend à *Budget* |
| `PTN-2026-007` | `rcomp1@ptn-rdc.gov.cd` | reprend à *Objectifs SMART* |

Comptes et mots de passe : `COMPTES-LOCAUX.md` (non versionné).

---

## 6. À signaler au backend

- **Un identifiant malformé rend 500, sans message.** `PUT /tdr/:id` avec
  `ptbaActivityId: ""` → `500 Internal server error`. Un 400 disant quel champ
  est en cause aurait fait gagner l'essentiel du temps de diagnostic.
- **`/auth/login` divulgue trop** — déjà consigné dans `CLAUDE.md`.
- **Deux couches d'API coexistent** côté frontend : `src/lib/api/client.ts` et
  `src/lib/api.ts`. PTBA et TDR passent par la seconde. Dette identifiée.
