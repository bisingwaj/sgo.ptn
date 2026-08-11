# SITE WEB INSTITUTIONNEL DE L'UGPTN
## Cahier des charges fonctionnel — Fonctionnalités prioritaires (Vague 1)

---

**Projet de Transformation Numérique de la République Démocratique du Congo**
**PTN-RDC · P180495**

Unité de Gestion du Projet de Transformation Numérique (UGPTN)
Ministère des Postes, Télécommunications et Numérique (MPTN)

*Document de cadrage fonctionnel — Kinshasa, 2026*

> Source de vérité : Manuel d'Exécution du Projet (MEP) du 23 juin 2025. Le présent document définit les fonctionnalités **premières** (essentielles, de premier déploiement) du site web institutionnel public de l'UGPTN. Il distingue le **site institutionnel public** de la **plateforme métier authentifiée** (8 profils), vers laquelle le site sert de porte d'entrée.

---

## Sommaire

1. Objet et périmètre
2. Principes directeurs
3. Site public et plateforme métier : la frontière
4. Méthode de priorisation (MoSCoW)
5. Tableau de synthèse des fonctionnalités
6. Fiches détaillées — Vague 1 (fonctionnalités premières)
7. Fonctionnalités des vagues 2 et 3 (rappel)
8. Exigences non fonctionnelles
9. Arborescence du site
10. Feuille de route de déploiement
11. Annexes

---
\pagebreak

## 1. Objet et périmètre

### 1.1 Objet

Ce document définit les **fonctionnalités prioritaires** que doit porter le **site web institutionnel public** de l'UGPTN, dérivées des obligations et caractéristiques du PTN-RDC : transparence (Cadre Environnemental et Social de la Banque mondiale), redevabilité citoyenne (Mécanisme de Gestion des Plaintes), ouverture des marchés publics, multilinguisme et lisibilité institutionnelle.

On entend par **fonctionnalités premières** les fonctionnalités de **Vague 1** : celles qui sont soit imposées par la réglementation (divulgation, MGP), soit indispensables à la crédibilité publique de l'Unité dès la mise en ligne.

### 1.2 Périmètre couvert

- Couche **publique** du site (accessible sans authentification).
- **Porte d'entrée** authentifiée vers la plateforme métier (renvoi vers les 8 espaces profilés).

### 1.3 Hors périmètre de ce document

- Les écrans internes de la plateforme métier (cockpit UGPTN, workflows ANO, fiducie, commissions) — couverts par la spécification de la plateforme.
- Les procédures du MEP elles-mêmes, que le site **applique** sans les modifier.

---

## 2. Principes directeurs

| Principe | Implication pour le site |
|---|---|
| **Le MEP est la source de vérité** | Les montants (510 M USD, 385/55/45/25/0), dates, indicateurs et structures sont immuables et repris tels quels |
| **Transparence par défaut** | Tout document divulgable est publié ; rien de confidentiel n'est exposé |
| **Redevabilité citoyenne** | Le MGP est accessible, simple, multilingue et traçable |
| **Confidentialité non négociable** | Le canal MGP-EAS/HS est strictement cloisonné du reste du site |
| **Sobriété institutionnelle** | Design IBM Carbon v11 / IBM Plex ; pas de drapeau ni de logo bailleur en grand format |
| **Inclusion** | Multilingue (6 langues), accessible (WCAG), utilisable en faible débit et sur mobile |

---
\pagebreak

## 3. Site public et plateforme métier : la frontière

Le site institutionnel et la plateforme métier forment **un seul produit cohérent** mais deux couches distinctes.

| Couche | Public visé | Authentification | Exemples de contenus |
|---|---|---|---|
| **Site institutionnel (public)** | Citoyens, entreprises, partenaires, médias, bailleurs | Non requise | Présentation, documents, avis de marchés, MGP, actualités |
| **Plateforme métier (authentifiée)** | 8 profils (UGPTN, MDA, Partenaire, Bailleur, Soumissionnaire, SBP, Auditeur, Gouvernance) | Requise | Cockpit, ANO, fiducie, commissions, contrats |

Le site institutionnel **présente** et **donne accès** ; la plateforme **opère**. La passerelle de connexion (F9) est la jonction entre les deux.

---

## 4. Méthode de priorisation (MoSCoW)

Les fonctionnalités sont classées selon quatre niveaux :

- **MUST (Vague 1)** — fonctionnalités premières : réglementaires ou indispensables à la mise en ligne.
- **SHOULD (Vague 2)** — fonctionnalités à forte valeur, déployées dans un second temps.
- **COULD (Vague 3)** — fonctionnalités d'enrichissement.
- **WON'T (pour l'instant)** — explicitement hors champ à ce stade.

**Critères de classement en Vague 1 :**
1. Obligation réglementaire (Cadre E&S / NES 10 — divulgation ; MGP — indicateur ODP).
2. Crédibilité publique minimale de l'Unité.
3. Indépendance technique (peut être livré sans dépendre de la plateforme métier complète).

---
\pagebreak

## 5. Tableau de synthèse des fonctionnalités

| Réf | Fonctionnalité | Priorité | Vague | Fondement |
|---|---|---|---|---|
| **F1** | Vitrine institutionnelle (projet + UGPTN + gouvernance) | MUST | 1 | Crédibilité, MEP |
| **F2** | Centre de transparence documentaire | MUST | 1 | Divulgation NES 10 / ESF |
| **F3** | MGP — canal général (formulaire + suivi) | MUST | 1 | Indicateur ODP (100 % ≤ 30 j) |
| **F4** | MGP-EAS/HS — canal confidentiel | MUST | 1 | Risque EAS/HS Substantiel |
| **F5** | Avis de marchés publics | MUST | 1 | Concurrence ouverte (Règl. BM 2025) |
| **F6** | Socle multilingue + accessibilité | MUST | 1 | Inclusion, MEP (6 langues) |
| **F7** | Actualités & communiqués | MUST | 1 | Mobilisation des parties prenantes |
| **F8** | Contact & points focaux provinciaux + carte | MUST | 1 | Ancrage territorial (26 provinces) |
| **F9** | Passerelle de connexion (vers la plateforme) | MUST | 1 | Accès aux 8 espaces métiers |
| F10 | Tableau de bord de résultats public | SHOULD | 2 | Indicateurs ODP / intermédiaires |
| F11 | Espace partenaires & consultations PMPP | SHOULD | 2 | NES 10 / engagement |
| F12 | Espace soumissionnaire (marketplace, KYC) | SHOULD | 2 | Passation, secteur privé |
| F13 | Recrutements & avis à consultants | SHOULD | 2 | Personnel UGPTN, CI/firmes |
| F14 | Espace investisseurs / PPP | SHOULD | 2 | Cible 165 M USD capitaux privés |
| F15 | Newsletter & abonnements | COULD | 3 | Engagement continu |
| F16 | Open data / API de résultats | COULD | 3 | Transparence avancée |

---
\pagebreak

## 6. Fiches détaillées — Vague 1 (fonctionnalités premières)

### F1 — Vitrine institutionnelle

**Objectif.** Présenter le projet PTN-RDC et l'UGPTN au grand public, établir la légitimité et la lisibilité du mandat.

**Contenus.**
- **Page d'accueil** : accroche sobre, chiffres clés (510 M USD ; IDA 79 % / AFD 21 % ; entrée en vigueur 31 octobre 2025 ; achèvement 31 décembre 2029), accès rapides (Marchés, MGP, Documents, Se connecter).
- **Page « Le Projet »** : objectif de développement, approche programmatique IDEA, les 5 composantes et sous-composantes avec enveloppes.
- **Page « L'UGPTN »** : mandat (coordination, exécution, supervision technique et fiduciaire), arrêté de création du 15 avril 2025, organigramme des 21 sous-rôles regroupés en 5 pôles.
- **Page « Gouvernance »** : COPIL (8 membres, semestriel) et CTP (12 représentants, trimestriel), distinction stratégique / technique.

**Règles et contraintes.**
- Montants et dates immuables, conformes au MEP.
- Pas de drapeau RDC en élément graphique principal, pas de logo bailleur surdimensionné.
- Style Carbon v11 / IBM Plex, chiffres en IBM Plex Mono.

**Fondement.** MEP ; données projet officielles. **Dépendances.** Aucune. **Priorité.** MUST.

---

### F2 — Centre de transparence documentaire

**Objectif.** Être le dépôt officiel public des documents du projet, en application de l'obligation de divulgation du Cadre Environnemental et Social (NES 10) et de la politique d'accès à l'information de la Banque mondiale.

**Contenus.**
- Bibliothèque téléchargeable : MEP, PPSD, **CGES, CPR, PPA, PMPP, PGMO, PEES**, rapports d'audit rendus publics, synthèses des Rapports Financiers Intermédiaires (RFI).
- Filtres : par type de document, par composante, par date, par langue.
- Métadonnées : titre, version, **date de publication horodatée**, langue, taille.

**Règles et contraintes.**
- Seuls les documents divulgables sont publiés ; aucun contenu confidentiel ou nominatif.
- Versionnage explicite (afficher la version en vigueur et l'historique).
- Conformité à la politique d'accès à l'information de la Banque mondiale.

**Fondement.** ESF / NES 10 ; instruments de sauvegarde du projet. **Dépendances.** F6 (multilingue). **Priorité.** MUST.

---
\pagebreak

### F3 — MGP : canal général

**Objectif.** Recueillir, classer, tracer et clôturer les plaintes citoyennes, en garantissant l'indicateur ODP : **100 % des griefs traités en 30 jours ou moins**.

**Contenus.**
- **Formulaire de dépôt** en ligne avec catégories : technique, fiduciaire, environnementale et sociale, conduite du personnel, autre.
- **Les 4 modes de dépôt** clairement présentés : formulaire web, **SMS / numéro vert**, e-mail, **point focal physique** (renvoi vers l'annuaire provincial — voir F8).
- **Numéro de référence horodaté** attribué à chaque plainte.
- **Suivi de l'état** par le plaignant (saisie du numéro de référence) : Réception → Classification → Instruction → Décision → Clôture.
- **SLA de 30 jours affiché publiquement.**

**Règles et contraintes.**
- Accusé de réception immédiat.
- Multilingue (FR + langues locales).
- Retour systématique au plaignant à la clôture.
- Aucune donnée du canal EAS/HS ne transite par ce formulaire (voir F4).

**Fondement.** Indicateur ODP ; PMPP / MGP. **Dépendances.** F6, F8. **Priorité.** MUST.

---

### F4 — MGP-EAS/HS : canal confidentiel

**Objectif.** Offrir un canal de signalement des violences basées sur le genre / exploitation et abus sexuels / harcèlement sexuel, **strictement séparé** du MGP général, centré sur la survivante.

**Contenus.**
- Point d'entrée **distinct et discret**, accessible depuis le site mais cloisonné.
- Formulaire minimal, **identité optionnelle**, consentement éclairé pour tout partage.
- Information claire sur les options et les services (médical, psychosocial, juridique).
- Vue publique limitée à des **statistiques agrégées non identifiantes**.

**Règles inviolables.**
- **Aucune donnée du MGP-EAS/HS visible sur le MGP général ni ailleurs sur le site.**
- Accès aux contenus strictement limité au **Spécialiste VBG/EAS** de l'UGPTN et aux prestataires habilités.
- **Pas d'intelligence artificielle générative** sur ces contenus.
- **Pas d'export, pas de copie, pas d'impression** — visualisation à l'écran uniquement.
- Double piste d'audit (qui consulte, quand, combien de temps).
- Référencement vers les services sous **24 heures** ; notification UGPTN-MPTN sous 24 heures.

**Fondement.** Risque EAS/HS Substantiel ; règles confidentielles du projet. **Dépendances.** F6. **Priorité.** MUST.

---
\pagebreak

### F5 — Avis de marchés publics

**Objectif.** Garantir la concurrence ouverte et la transparence de la passation, conformément aux Règlements de Passation des Marchés de la Banque mondiale (février 2025).

**Contenus.**
- Publication des **avis** : avis à manifestation d'intérêt (AMI), appels d'offres (AOI / AON), demandes de cotation, marchés de gré à gré justifiés.
- **Calendrier prévisionnel** issu du Plan de Passation des Marchés (PPM, glissant sur 18 mois).
- **Résultats d'attribution** publiés (transparence post-attribution).
- Documents téléchargeables (DAO/RFP) le cas échéant.

**Règles et contraintes.**
- Cohérence avec STEP (l'outil de suivi de la Banque mondiale reste la référence des statuts et des seuils).
- Affichage de la méthode (AOI/AON/SFQC/SBQ/etc.) et du type de revue.
- Le dépôt d'offres lui-même relève de l'**espace soumissionnaire authentifié** (Vague 2, F12).

**Fondement.** Règlements BM 2025 ; PPSD ; PPM. **Dépendances.** F9 (renvoi soumissionnaire). **Priorité.** MUST.

---

### F6 — Socle multilingue et accessibilité

**Objectif.** Rendre le site utilisable par l'ensemble de la population, sur tout terminal et dans des conditions de connectivité contraintes.

**Contenus et exigences.**
- **6 langues** : Français (par défaut), Anglais, Lingala, Swahili, Tshiluba, Kikongo — sélecteur visible.
- **Accessibilité WCAG 2.1 niveau AA** : navigation clavier, contrastes, compatibilité lecteurs d'écran, textes alternatifs.
- **Responsive** et **version allégée faible débit** (images optimisées, mode économe).

**Règles et contraintes.**
- Le contenu réglementaire (MGP, sécurité) doit être disponible au minimum en FR + langues locales.
- Pas de dépendance bloquante à des polices ou scripts externes pour les fonctions critiques (MGP).

**Fondement.** MEP (langues) ; standard administration. **Dépendances.** Transverse (sous-tend F1–F9). **Priorité.** MUST.

---
\pagebreak

### F7 — Actualités & communiqués

**Objectif.** Informer en continu les parties prenantes de l'avancement du projet et des décisions publiques.

**Contenus.**
- Fil d'actualités, communiqués officiels, comptes rendus publics d'événements (ateliers, missions de supervision, sessions COPIL/CTP dans leur version non confidentielle).
- Agenda des événements et consultations publiques à venir.

**Règles et contraintes.**
- Ton institutionnel, factuel ; pas de contenu nominatif sensible.
- Chaque communiqué horodaté et archivé.

**Fondement.** Mobilisation des parties prenantes (PMPP). **Dépendances.** F6. **Priorité.** MUST.

---

### F8 — Contact & points focaux provinciaux + carte

**Objectif.** Permettre à tout usager d'identifier le bon interlocuteur, y compris en province, et de localiser l'action du projet.

**Contenus.**
- Page contact (UGPTN, adresses, numéro vert MGP, e-mail).
- **Annuaire des points focaux provinciaux** et des comités territoriaux/locaux du MGP.
- **Carte interactive des 26 provinces**, avec mise en avant des **10 provinces prioritaires CPF** (Kinshasa, Kwilu, Kongo Central, Kasaï, Kasaï Central, Kasaï Oriental, Nord-Kivu, Sud-Kivu, Ituri, Lomami).

**Règles et contraintes.**
- Le numéro vert MGP doit être visible et fonctionnel (lien avec F3).
- La carte doit rester utilisable en faible débit (fallback liste).

**Fondement.** Ancrage territorial ; MGP ; couverture géographique. **Dépendances.** F3, F6. **Priorité.** MUST.

---

### F9 — Passerelle de connexion vers la plateforme

**Objectif.** Offrir un point d'entrée unique et sécurisé vers les espaces métiers authentifiés.

**Contenus.**
- Bouton **« Se connecter »** présent sur tout le site.
- Authentification puis **onboarding** redirigeant chaque profil vers sa page d'accueil : UGPTN → cockpit ; MDA → tableau de bord ; Partenaire → espace partenaire ; Bailleur → portefeuille ; Soumissionnaire → marketplace ; SBP → mon programme ; Auditeur → lecture seule ; Gouvernance → sessions.

**Règles et contraintes.**
- **RBAC dès l'entrée** : un bailleur ne rédige jamais de TDR ; un auditeur est en lecture seule ; les espaces COPIL et CTP sont cloisonnés ; un bénéficiaire SBP ne voit pas les données d'un autre.
- Aucune donnée métier sensible exposée avant authentification.

**Fondement.** Architecture multi-profils ; règles RBAC. **Dépendances.** Plateforme métier. **Priorité.** MUST.

---
\pagebreak

## 7. Fonctionnalités des vagues 2 et 3 (rappel)

Pour mémoire, hors fonctionnalités premières :

**Vague 2 (SHOULD).**
- **F10** — Tableau de bord de résultats public interactif (indicateurs ODP et intermédiaires, désagrégation genre).
- **F11** — Espace partenaires et consultations PMPP (co-construction, dépôt de commentaires).
- **F12** — Espace soumissionnaire authentifié (marketplace, dépôt d'offres, contrats, paiements, KYC).
- **F13** — Recrutements et avis à consultants (personnel UGPTN, CI, firmes).
- **F14** — Espace investisseurs / PPP (mobilisation des 165 M USD de capitaux privés).

**Vague 3 (COULD).**
- **F15** — Newsletter et abonnements thématiques.
- **F16** — Open data / API de résultats.

---

## 8. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| **Sécurité** | HTTPS systématique ; protection des données conforme au PMPP ; compartimentage strict du canal EAS/HS ; pistes d'audit |
| **Confidentialité** | Cloisonnement absolu MGP général / MGP-EAS/HS ; pas d'IA générative sur EAS/HS ; pas d'export des contenus confidentiels |
| **Performance** | Temps de chargement maîtrisé ; version allégée faible débit ; haute disponibilité du formulaire MGP et du numéro vert |
| **Accessibilité** | WCAG 2.1 AA ; navigation clavier ; lecteurs d'écran |
| **Compatibilité** | Responsive (mobile prioritaire) ; navigateurs courants |
| **Design** | IBM Carbon v11, IBM Plex, radius 0, échelle d'espacement 8 px, sobriété institutionnelle |
| **Référencement / recherche** | Moteur de recherche interne ; SEO de base ; FAQ |
| **Hébergement** | Infrastructure résiliente ; sauvegardes ; plan de continuité |
| **Conformité** | Politique d'accès à l'information de la Banque mondiale ; alignement MEP |

---
\pagebreak

## 9. Arborescence du site

```
Accueil
├── Le Projet
│   ├── Objectif & approche IDEA
│   ├── Les 5 composantes
│   └── Financement (IDA / AFD / capitaux privés)
├── L'UGPTN
│   ├── Mandat & arrêté de création
│   ├── Organisation (21 sous-rôles / 5 pôles)
│   └── Gouvernance (COPIL / CTP)
├── Transparence
│   ├── Documents (MEP, PPSD, CGES, CPR, PPA, PMPP, PGMO, PEES)
│   ├── Audits publics
│   └── Synthèses financières (RFI)
├── Marchés
│   ├── Avis (AMI / AOI / AON / cotation)
│   ├── Calendrier (PPM)
│   └── Attributions
├── Actualités & Événements
├── Plaintes & MGP
│   ├── Canal général (formulaire · numéro vert · suivi)
│   └── Canal confidentiel EAS/HS  ← cloisonné
├── Provinces (carte · points focaux)
├── Contact
└── [Se connecter] → Plateforme (8 espaces authentifiés)
```

---

## 10. Feuille de route de déploiement

| Étape | Période indicative | Contenu |
|---|---|---|
| **Vague 1 — Fonctionnalités premières** | 2026 — 1er semestre | F1 à F9 : vitrine, transparence, MGP (2 canaux), avis de marchés, multilingue/accessibilité, actualités, contact/carte, passerelle |
| **Vague 2 — Valeur ajoutée** | 2026 — 2nd semestre | F10 à F14 : résultats publics, partenaires/consultations, soumissionnaire, recrutements, investisseurs |
| **Vague 3 — Enrichissement** | 2027 et au-delà | F15 à F16 : newsletter, open data/API |

**Priorité d'exécution au sein de la Vague 1.** Les briques les plus contraintes réglementairement sont à livrer en premier : **F2 (transparence documentaire)**, **F3 (MGP général)** et **F4 (MGP-EAS/HS)**. Le **socle F6 (multilingue/accessibilité)** est transverse et conditionne les autres.

---
\pagebreak

## 11. Annexes

### Annexe A — Correspondance fonctionnalité / fondement

| Réf | Fonctionnalité | Fondement principal |
|---|---|---|
| F1 | Vitrine institutionnelle | MEP, données projet |
| F2 | Transparence documentaire | ESF / NES 10 (divulgation) |
| F3 | MGP général | Indicateur ODP (100 % ≤ 30 j) |
| F4 | MGP-EAS/HS | Risque EAS/HS Substantiel |
| F5 | Avis de marchés | Règlements BM février 2025 / PPSD |
| F6 | Multilingue & accessibilité | MEP (6 langues), standard administration |
| F7 | Actualités | PMPP (mobilisation parties prenantes) |
| F8 | Contact & provinces | Couverture 26 provinces, MGP territorial |
| F9 | Passerelle de connexion | Architecture 8 profils, RBAC |

### Annexe B — Glossaire des sigles utilisés

- **AMI** — Avis à Manifestation d'Intérêt
- **AOI / AON** — Appel d'Offres International / National
- **CGES** — Cadre de Gestion Environnementale et Sociale
- **CPF** — Cadre de Partenariat-Pays
- **CPR** — Cadre de Politique de Réinstallation
- **EAS/HS** — Exploitation et Abus Sexuels / Harcèlement Sexuel
- **ESF** — Environmental and Social Framework (Cadre E&S de la Banque mondiale)
- **MGP** — Mécanisme de Gestion des Plaintes
- **NES** — Normes Environnementales et Sociales
- **ODP** — Objectif de Développement du Projet
- **PEES** — Plan d'Engagement Environnemental et Social
- **PGMO** — Procédures de Gestion de la Main d'Œuvre
- **PMPP** — Plan de Mobilisation des Parties Prenantes
- **PPA** — Plan en Faveur des Populations Autochtones
- **PPM** — Plan de Passation des Marchés
- **PPSD** — Stratégie de Passation des Marchés pour le Développement du Projet
- **RBAC** — Contrôle d'accès basé sur les rôles
- **RFI** — Rapport Financier Intermédiaire
- **SBP** — Subvention Basée sur la Performance
- **STEP** — Systematic Tracking of Exchanges in Procurement
- **UGPTN** — Unité de Gestion du Projet de Transformation Numérique
- **VBG** — Violences Basées sur le Genre
- **WCAG** — Web Content Accessibility Guidelines

---

*Document de cadrage fonctionnel établi à partir des données institutionnelles officielles du PTN-RDC et alignées sur le Manuel d'Exécution du Projet du 23 juin 2025.*

*Kinshasa — 2026*
