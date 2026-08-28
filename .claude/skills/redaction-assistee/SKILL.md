---
name: redaction-assistee
description: Doctrine d'enrichissement de la rédaction assistée des TDR — densité attendue par champ, préambule institutionnel à ne jamais engendrer, registre d'écriture, susceptibilités politiques et diplomatiques, et ce qui ne se règle pas par une consigne. Mesures prises sur quatre TDR réels de l'UGPTN. À charger avant toute intervention sur les CONSIGNES de backend/src/ai/tdr-assist.service.ts, sur project-knowledge.ts, ou sur la composition du document.
---

# Rédaction assistée — la doctrine d'enrichissement

Les textes produits sont trop minces et sentent la machine. Ce document dit
pourquoi, ce qui se corrige par une consigne, et ce qui ne s'y corrige pas.

**Tout ce qui suit est mesuré** sur quatre TDR réels de l'UGPTN, composante C3
(`~/Downloads/tdr`, août 2026). Aucune cible n'est estimée à vue.

---

## 1. La découverte qui commande tout

Le « Contexte et Justification » d'un TDR de l'UGPTN compte cinq sous-sections.
Les quatre premières sont **rigoureusement identiques d'un dossier à l'autre** :

```
Contexte Général                              ─┐
Description du Projet de Transformation …      │  18 §, 5 092 caractères
Composantes du Projet                          │  ~848 mots
Portée Géographique du Projet                 ─┘  IDENTIQUES À 100,0 %

Contexte et Justification Spécifique de …        3 §, 192 à 382 mots
                                                 ← la seule part rédigée
```

Similarité mesurée deux à deux sur les trois TDR disponibles : **100,0 %**,
octet pour octet.

### Ce qu'il faut en conclure

**LE PRÉAMBULE INSTITUTIONNEL NE S'ENGENDRE PAS.** Il se compose, verbatim,
depuis le corpus. Trois raisons, dans l'ordre de gravité :

1. **La dérive silencieuse.** Le préambule porte des chiffres — « taux de
   pénétration du haut débit estimé à environ 15,4 % », « les réseaux mobiles
   ne couvrent qu'environ la moitié de la population ». Un modèle qui le
   reformule écrira un jour 15,7 %, et personne ne le verra. Ces valeurs
   viennent du PAD ; elles se citent, elles ne se reformulent pas.
2. **La divergence entre dossiers.** Deux TDR partis chez le même bailleur
   avec deux descriptions différentes du même projet est un défaut visible en
   revue, et il est imputable à l'outil.
3. **Le coût.** 848 mots engendrés à chaque dossier, pour un texte connu
   d'avance.

Le sentiment de minceur vient de là : la plateforme **ne produit pas du tout
ces 848 mots**. La consigne actuelle (« deux à trois paragraphes, 180 à 260
mots ») n'est pas absurde — elle décrit correctement la part spécifique. Le
manque est ailleurs, dans la composition du document.

### Conséquence de travail

| Élément | Où il doit vivre |
|---|---|
| Contexte Général, Description du PTN, Composantes, Portée géographique | **Bloc de corpus**, inséré tel quel à la composition |
| Contexte et Justification Spécifique de la mission | **Engendré**, sous consigne |

Le bloc de préambule est un candidat naturel à `DocumentReference` ou à une
table de gabarits. Il porte sa **date de valeur** : les chiffres du PAD
vieillissent, et un préambule non daté finira par mentir.

---

## 2. Densité attendue, par champ

Mesures sur les documents réels, puis cible retenue. La colonne « actuel »
donne ce que la consigne demande aujourd'hui.

| Champ | Actuel | Réel mesuré | Cible |
|---|---|---|---|
| `context` (part spécifique) | 2–3 §, 180–260 mots | 3 §, 192–382 mots | **3–4 § denses, 320–450 mots** |
| `justification` | 1–2 §, 120–180 mots | fondu dans le contexte | **2–3 §, 220–320 mots** |
| `objectives` | « deux à trois » | **7 à 12 entrées** | **6–10 entrées** |
| `expectedResults` | 3 à 6 résultats | **21 à 60 §, 832–1 652 mots** | **8–15 résultats structurés** |
| `deliverables` | — | 2 à 58 § (selon nature) | **selon le type d'activité** |
| `methodology` | étapes, une par ligne | — | **6–10 étapes, chacune avec son produit** |

**L'écart le plus grave est sur les résultats attendus** : la consigne en
demande trois à six, les dossiers réels en portent de vingt à soixante
paragraphes. Un facteur dix.

**Les livrables ne se cadrent pas uniformément** : 58 paragraphes pour un appui
au lancement de masters, 2 pour un atelier. La consigne doit donc dépendre du
`tdrTypeCode`, ce qu'elle ne fait pas aujourd'hui.

---

## 3. Le registre — écrire comme l'expert, pas comme la machine

L'exigence n'est pas « écrire mieux », elle est **« qu'on ne puisse pas dire
que c'est une machine »**. Ce sont deux choses différentes, et la seconde se
décrit par ses marques.

### Les marques à proscrire, nommément

Une consigne qui dit « écrivez naturellement » ne produit rien. Une consigne
qui nomme le défaut le corrige.

- **La triade.** « structuré, inclusif et durable » — trois adjectifs coordonnés
  là où un suffit. C'est la signature la plus reconnaissable.
- **L'ouverture en surplomb.** « Dans un monde de plus en plus numérique… ».
  Un TDR ouvre sur un fait, pas sur une époque.
- **La clôture en promesse.** « … contribuant ainsi à un avenir numérique
  inclusif pour tous les Congolais. » Un paragraphe de TDR se termine sur sa
  dernière information.
- **Le connecteur d'affichage.** « Il convient de souligner que », « force est
  de constater ». Ils annoncent une importance au lieu de l'établir.
- **Le parallélisme mécanique.** Trois paragraphes de même longueur ouvrant sur
  la même construction. La prose experte a un rythme inégal.
- **L'énumération sans hiérarchie.** Six éléments de même poids, dans l'ordre
  où ils sont venus.

### Ce qui signe l'expert, à l'inverse

- **La subordination longue.** Une phrase experte porte sa condition, sa
  restriction et sa conséquence dans la même période. Les phrases courtes en
  série sont une marque de machine autant que les phrases interminables.
- **Le fait daté et sourcé.** « Le taux de pénétration du haut débit est estimé
  à environ 15,4 % » vaut mieux que « la connectivité reste limitée ». Le
  modèle ne peut pas inventer ces faits — il doit les recevoir.
- **La réserve.** « susceptible de », « demeure encore largement
  sous-exploité ». L'expert borne ce qu'il affirme ; la machine affirme plat.
- **L'articulation causale explicite.** Non pas « et », mais « faute de quoi »,
  « dès lors que », « à défaut ». C'est ce que veut dire « connecteur logique ».

---

## 4. Les susceptibilités — ce qui n'est pas technique

Un TDR du PTN-RDC est lu par le Gouvernement, par deux bailleurs et par des
soumissionnaires. Chaque phrase engage.

### Ne jamais écrire

- **Le constat de carence institutionnelle.** « Face aux défaillances de
  l'administration », « en raison du manque de capacités de l'ARPTC ». Le
  registre est celui du RENFORCEMENT, jamais du diagnostic accusatoire. Le
  besoin s'énonce par ce qu'il faut atteindre, pas par ce qui manque à
  quelqu'un.
- **La situation sécuritaire d'une province.** Le projet couvre le Nord-Kivu,
  le Sud-Kivu et l'Ituri. Toute caractérisation — « zones instables »,
  « provinces affectées par le conflit » — est une prise de position que
  l'outil n'a pas qualité pour écrire. Nommer la province suffit.
- **Le classement d'institutions.** Aucune formulation qui place un ministère,
  une agence ou un bailleur au-dessus d'un autre. **L'ordre IDA puis AFD est
  un ordre de quotité (79 % / 21 %), jamais de préséance**, et il ne s'assortit
  d'aucun qualificatif.
- **L'attribution d'un mandat non communiqué.** Déjà dans `PROHIBITIONS`, et
  c'est la règle la plus violée : qu'un centre de cybersécurité relève
  *vraisemblablement* de l'ANCY n'autorise pas à l'écrire.
- **La comparaison avec un pays tiers.** « contrairement au Rwanda », « à
  l'instar du Kenya ». Un TDR n'est pas une note de benchmark.

### Formulations tenues

| Au lieu de | Écrire |
|---|---|
| « pallier les défaillances de X » | « appuyer X dans l'exercice de sa mission » |
| « les provinces en conflit » | « les provinces prioritaires du Cadre de Partenariat-Pays » |
| « imposer aux universités » | « accompagner les établissements dans » |
| « le retard numérique de la RDC » | « le potentiel numérique encore largement sous-exploité » |

La dernière ligne est reprise **du corpus réel** : c'est exactement la tournure
que l'UGPTN emploie. Elle dit le même fait sans porter de jugement sur le pays.

---

## 5. Ce qui NE se règle PAS par une consigne

Cinq constats mesurés. Les confondre avec un problème de rédaction ferait
perdre du temps.

| Constat | Vérifié | Ce qu'il faut faire |
|---|---|---|
| **Aucun outil sur le chemin champ** | `tdr-assist.service.ts` ne passe jamais `tools:` | Une génération en un coup ne peut ni chercher, ni lire l'activité PTBA, ni consulter le corpus. Un contenu « recherché et argumenté » exige que ce chemin devienne agentique, ou reçoive un ancrage préalable élargi |
| **Le budget est scalaire** | `budgetTotalUsd`, `budgetIdaUsd`, `budgetAfdUsd`, `budgetGovUsd` | Un tableau budgétaire détaillé est une **table nouvelle** (`TdrBudgetLine` : rubrique, unité, quantité, prix unitaire, source). Aucune consigne ne peut le produire — et les montants restent hors IA |
| **Objectifs plafonnés à 1 600 jetons** | `tdr-assist.service.ts:508` | 6 à 10 objectifs argumentés n'y tiennent pas. Relever, ou scinder |
| **Deux routes mortes** | `assistContext` et `assistJustification` : **0 usage** hors `api.ts` | Plafonds de 700 et 600 jetons. À supprimer, sinon quelqu'un les rebranchera et retrouvera la coupure |
| **Consignes indépendantes du type** | `CONSIGNES` est un `Record<string, string>` | Les livrables d'un atelier et d'un appui au lancement de masters n'ont pas le même volume. La clé doit devenir `champ × tdrTypeCode` |

---

## 5 bis. Vérifier — le contrôle mécanique

**Aucune faute d'orthographe ni de grammaire n'est tolérée.** Une pièce
contractuelle qui part chez un bailleur avec une coquille discrédite le
dossier entier, et l'outil qui l'a produite.

Mais **le dire dans une consigne ne produit rien** : le modèle essaie déjà.
Ce qui produit un résultat, c'est de mesurer et de refuser.

```bash
python3 .claude/skills/redaction-assistee/scripts/verifier-texte.py fichier.txt
python3 …/verifier-texte.py --corriger fichier.txt    # réécrit la typographie
python3 …/verifier-texte.py --seuil 8 fichier.txt     # refuse sous 8/10
pip install pyspellchecker                            # active la passe orthographe
```

Trois passes, de la plus sûre à la plus faillible.

| Passe | Nature | Effet |
|---|---|---|
| **Typographie** | Déterministe, zéro faux positif | Apostrophe `’`, guillemets `« »`, espaces. **Corrigeable automatiquement** |
| **Orthographe** | Dictionnaire français + lexique projet | Un mot inconnu des deux est une faute. **Refus** |
| **Registre** | Indices, pas verdicts | Note sur 10 : triades, surplomb, promesse, anglicismes, interdits politiques |

### La convention typographique est mesurée, pas choisie

Relevée sur 121 652 caractères de TDR réels : apostrophe `’` à **96,6 %**,
**espace simple** avant les deux-points et points-virgules — jamais
d'insécable — et guillemets `« »`. Le corpus lui-même porte 29 apostrophes
droites et 8 guillemets droits : le vérificateur corrigerait aussi vos
documents existants.

### L'anglicisme n'est pas une faute d'orthographe

`branding`, `coaching`, `feedback`, `outputs`, `templates` sont correctement
écrits — dans la mauvaise langue. Les compter comme coquilles ferait passer
un défaut de registre pour une inattention. Ils sortent au **registre**, et
`references/anglicismes.txt` en porte 50, relevés dans le corpus réel.

### Étalonnage

| Texte | Typo | Ortho | Registre | Verdict |
|---|---|---|---|---|
| Préambule réel de l'UGPTN (718 mots) | 0 | 0 | **10,0/10** | ACCEPTÉ |
| Texte de contrôle fautif (79 mots) | 3 | 1 | **6,0/10** | REFUSÉ |

**Le témoin.** Sous 20 mots, le script refuse au lieu d'approuver : un contrôle
qui valide un texte vide ne contrôle rien, et c'est ainsi qu'une extraction
ratée passe pour une réussite. Ce piège est arrivé pendant la mise au point.

### Ce que la grille NE juge pas

**Elle est calibrée sur de la prose de TDR, pas sur des instructions.**
Passée sur les consignes elles-mêmes, elle rend 8,5/10 et reproche une
« affirmation plate » : une consigne ne doit justement PAS être nuancée, elle
prescrit. Ne pas appliquer la passe registre à un texte qui n'est pas destiné
au document.

Elle est par ailleurs étalonnée sur **deux textes**. Elle les discrimine bien —
10/10 contre 6/10 — mais son taux de faux refus sur des dossiers réels reste
inconnu. C'est pourquoi le § suivant ne propose pas de refuser en ligne.

### Où le brancher

L'audit hors ligne est la première étape. La seconde est le chemin de
génération : `tdr-assist.service.ts` doit passer la sortie par la
**correction typographique** avant d'écrire dans le champ — elle est
déterministe, donc sans risque — et **journaliser la note de registre** à côté
du modèle, dans `record()`. Refuser en ligne demande d'abord de mesurer le
taux de faux refus sur des dossiers réels.

---

## 6. Les compétences à dériver

Cette compétence-ci porte la doctrine. Le travail d'enrichissement se découpe
en compétences filles, une par nature de bloc — parce qu'un fait, une liste
fermée et une consigne de rédaction ne se travaillent pas de la même manière.

| Compétence | Porte | Source de vérité |
|---|---|---|
| `preambule-institutionnel` | Les 848 mots fixes, leur date de valeur, la procédure de mise à jour quand le PAD change | Corpus UGPTN, PAD |
| `consignes-champs` | Les 8 consignes, leur densité cible, leur variation par `tdrTypeCode` | Mesures § 2 |
| `registre-institutionnel` | Les marques de machine, les tournures tenues, le lexique | § 3 et § 4 |
| `structure-document` | Le plan à 13 sections des TDR réels, comparé aux 18 étapes du parcours | Les quatre TDR d'exemple |

**Ordre imposé.** `preambule-institutionnel` d'abord : tant que les 848 mots ne
sont pas composés depuis le corpus, enrichir les consignes revient à demander
au modèle de réécrire un texte qui existe déjà — le pire des deux mondes.

---

## 7. Méthode d'enrichissement d'une consigne

Une consigne ne se juge pas à la lecture. Procédure tenue :

1. **Mesurer d'abord.** Le champ correspondant dans les TDR réels : nombre de
   paragraphes, de mots, présence d'une sous-structure.
2. **Séparer le fixe du variable.** Ce qui se répète d'un dossier à l'autre
   part au corpus, jamais à la consigne.
3. **Nommer ce qu'il ne faut PAS écrire.** C'est la partie qui porte la
   consigne actuelle — « les POPULATIONS servies, jamais l'institution maître
   d'ouvrage » — et c'est la partie qui fonctionne.
4. **Éprouver sur un dossier réel**, pas sur une lecture. Comparer la sortie au
   TDR d'exemple de même type.
5. **Compter les jetons.** Une consigne qui double coûte à chaque génération.

**Ne jamais enrichir une consigne en y ajoutant des faits.** Les faits vont
dans `project-knowledge.ts` ou dans l'ancrage vivant. Une consigne dit COMMENT
écrire, jamais QUOI savoir — sans quoi les deux dérivent séparément et se
contredisent.

---

## 8. Les exemples de référence

`~/Downloads/tdr` — quatre dossiers, composante C3, produits par l'UGPTN.

| Dossier | Mots | Ce qu'il éclaire |
|---|---|---|
| Recrutement Consultant-Firme · Hackathons | 9 499 | Le plan complet à 13 sections, la grille d'évaluation, le schéma de financement |
| Appui Lancement Masters | 4 342 | 58 § de livrables — le haut de la fourchette |
| Atelier Harmonisation Curricula | 3 178 | Le format atelier : livrables courts, résultats développés |
| Cérémonie Lancement Portail (PDF + budget XLSX) | — | **Le classeur budgétaire** : la structure que `TdrBudgetLine` doit porter |

**Réserve.** Ces documents ont eux-mêmes été produits avec de l'IA, et l'un
d'eux annonce « quatre axes structurants » avant d'énumérer cinq composantes.
Ils servent de référence pour la STRUCTURE et le REGISTRE, jamais pour les
faits — ceux-ci viennent du MEP.
