/**
 * PTN-RDC · Préambule institutionnel des termes de référence.
 *
 * ---------------------------------------------------------------------------
 * CE TEXTE NE S'ENGENDRE PAS. IL SE COMPOSE.
 *
 * Relevé le 28 août 2026 sur trois TDR de la composante C3 produits par
 * l'UGPTN : 18 paragraphes, 5 092 caractères, IDENTIQUES À 100,0 % d'un
 * dossier à l'autre — octet pour octet, similarité mesurée deux à deux.
 *
 * Confier ces 848 mots au modèle serait payer une génération pour un texte
 * connu d'avance, et surtout accepter qu'il DÉRIVE. Le préambule porte des
 * valeurs du PAD — « environ 15,4 % », « environ la moitié de la
 * population », « parmi les plus élevés du continent africain ». Une
 * reformulation écrira un jour 15,7 %, personne ne le verra, et le dossier
 * partira chez le bailleur. `PROHIBITIONS` interdit de calculer et
 * d'extrapoler, mais autorise à citer : reformuler un paragraphe qui
 * contient un chiffre est exactement la zone où l'interdit ne mord pas.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UNE CONSTANTE, ET NON UNE TABLE
 *
 * Une invite modifiable en base sans versionnement détruit une propriété
 * qu'un dossier contractuel ne peut pas perdre : savoir, des années plus
 * tard, quel texte a produit quelle pièce. Ici, le commit git date le
 * texte et le rend opposable, sans machinerie de publication.
 *
 * Le jour où l'atelier des invites portera versions et publication, ce
 * module deviendra une source de gabarit — pas avant.
 *
 * ---------------------------------------------------------------------------
 * LA DATE DE VALEUR N'EST PAS DÉCORATIVE
 *
 * Les chiffres du PAD vieillissent. Sans elle, ce préambule affirmera 15,4 %
 * trois ans après que le taux aura changé, et rien ne dira que la donnée est
 * ancienne. Toute mise à jour se fait ICI, en changeant les deux.
 *
 * Réserve : les TDR d'où ce texte est tiré ont été produits avec de l'IA, et
 * l'un annonce « quatre axes structurants » avant d'en énumérer cinq. Chaque
 * affirmation reste à confronter au MEP du 23 juin 2025 — en particulier les
 * composantes, que `COMPONENTS_BRIEF` porte avec sa réserve MEP/PAD.
 * ---------------------------------------------------------------------------
 */

import type { Bloc } from './document-plan';

/** Date des valeurs chiffrées portées par le préambule. */
export const PREAMBULE_DATE_VALEUR = 'PAD P180495, relevé au 28 août 2026';

/**
 * Les quatre sous-sections fixes du « Contexte et Justification ».
 *
 * Elles PRÉCÈDENT le contexte rédigé par l'auteur, qui ne traite que de la
 * mission. La consigne du champ `context` le dit explicitement, faute de
 * quoi le modèle rouvre le contexte général — le défaut le plus fréquent.
 */
export const PREAMBULE_INSTITUTIONNEL: readonly Bloc[] = [
  { genre: 'sousTitre', texte: 'Contexte Général' },
  {
    genre: 'paragraphe',
    texte:
      'Le Gouvernement de la République Démocratique du Congo met en œuvre, avec ' +
      'l’appui financier de la Banque mondiale et de l’Agence Française de ' +
      'Développement (AFD), le Projet d’Appui à la Transformation Numérique de la ' +
      'RDC, conçu pour être mis en œuvre sur une période de cinq ans. Ce ' +
      'financement vise à soutenir la préparation, le déploiement et ' +
      'l’opérationnalisation des réformes, investissements et activités ' +
      'nécessaires à la transformation numérique du pays.',
  },
  {
    genre: 'paragraphe',
    texte:
      'La République Démocratique du Congo dispose d’un potentiel important dans ' +
      'le secteur numérique, susceptible de contribuer de manière significative à ' +
      'la croissance économique, à la création d’emplois qualifiés, au ' +
      'développement de l’innovation et de l’entrepreneuriat, ainsi qu’à ' +
      'l’amélioration de la prestation des services publics et privés. Toutefois, ' +
      'ce potentiel demeure encore largement sous-exploité.',
  },
  {
    genre: 'paragraphe',
    texte:
      'Le taux de pénétration du haut débit est actuellement estimé à environ ' +
      '15,4 %, sur la base des abonnements uniques, et les réseaux mobiles à ' +
      'large bande ne couvrent qu’environ la moitié de la population, tandis que ' +
      'les prix de détail du haut débit figurent parmi les plus élevés du ' +
      'continent africain. Par ailleurs, la fourniture de services numériques ' +
      'reste limitée, avec un faible niveau de numérisation des plateformes et ' +
      'systèmes publics, ce qui entrave l’efficacité de l’action publique, ' +
      'l’émergence de services numériques locaux et l’accès équitable des ' +
      'citoyens aux services.',
  },
  {
    genre: 'paragraphe',
    texte:
      'Dans ce contexte, le développement structuré du numérique, combinant ' +
      'amélioration de la connectivité, déploiement de services numériques, ' +
      'renforcement des compétences, innovation et entrepreneuriat, constitue un ' +
      'levier majeur de transformation économique et sociale, susceptible de ' +
      'générer des opportunités durables de création d’emplois, en particulier ' +
      'pour les jeunes, et de stimuler l’émergence d’un écosystème ' +
      'entrepreneurial numérique local.',
  },
  {
    genre: 'sousTitre',
    texte: 'Description du Projet de Transformation Numérique (PTN)',
  },
  {
    genre: 'paragraphe',
    texte:
      'Le Gouvernement de la République Démocratique du Congo met en œuvre le ' +
      'Projet de Transformation Numérique (PTN), qui vise à renforcer l’accès à ' +
      'une connectivité haut débit abordable et de qualité, à promouvoir le ' +
      'développement de services et de solutions numériques à fort impact, et à ' +
      'soutenir la montée en compétences numériques, l’innovation et ' +
      'l’entrepreneuriat en numérique avancé, en adéquation avec les besoins de ' +
      'l’économie nationale.',
  },
  {
    genre: 'paragraphe',
    texte:
      'L’objectif de développement du projet est d’améliorer l’accès à l’internet ' +
      'et aux services numériques et d’en favoriser une utilisation inclusive, ' +
      'productive et créatrice de valeur, tant dans le secteur public que dans le ' +
      'secteur privé, en soutenant l’émergence d’un tissu de startups et de PME ' +
      'numériques compétitives.',
  },
  {
    genre: 'paragraphe',
    texte:
      'Le projet est conçu pour soutenir la transformation numérique du pays à ' +
      'travers quatre axes structurants.',
  },
  { genre: 'sousTitre', texte: 'Composantes du Projet' },
  {
    genre: 'paragraphe',
    texte:
      'Le Projet de Transformation Numérique est structuré autour de cinq ' +
      'composantes complémentaires :',
  },
  {
    genre: 'paragraphe',
    texte:
      'La Composante 1 vise à élargir l’accès et l’inclusion numériques, en ' +
      'soutenant le développement de cadres réglementaires favorables et en ' +
      'catalysant les investissements privés dans les infrastructures de réseaux ' +
      'à large bande, notamment à travers l’extension du backbone national en ' +
      'fibre optique et la connectivité des zones rurales.',
  },
  {
    genre: 'paragraphe',
    texte:
      'La Composante 2 est consacrée à l’introduction de bases numériques pour la ' +
      'prestation de services, à travers le déploiement d’infrastructures ' +
      'numériques transversales partagées permettant au Gouvernement d’étendre ' +
      'l’utilisation des outils numériques dans les secteurs prioritaires et ' +
      'd’améliorer l’efficacité des services publics.',
  },
  {
    genre: 'paragraphe',
    texte:
      'La Composante 3 porte sur le développement d’une main-d’œuvre compétente ' +
      'en matière de numérique et sur la stimulation de l’innovation dans les ' +
      'services numériques. Elle soutient le renforcement des compétences des ' +
      'fonctionnaires, des étudiants et des entrepreneurs, la structuration du ' +
      'système national d’innovation, ainsi que la création de solutions ' +
      'numériques locales.',
  },
  {
    genre: 'paragraphe',
    texte:
      'La Composante 4 concerne la coordination institutionnelle et la gestion du ' +
      'projet, incluant les fonctions de passation des marchés, de gestion ' +
      'financière, de suivi-évaluation et de gestion des sauvegardes ' +
      'environnementales et sociales.',
  },
  {
    genre: 'paragraphe',
    texte:
      'La Composante 5 correspond au mécanisme de réponse d’urgence (CERC), ' +
      'permettant de réallouer rapidement des ressources en cas de crise majeure.',
  },
  { genre: 'sousTitre', texte: 'Portée Géographique du Projet' },
  {
    genre: 'paragraphe',
    texte:
      'Les activités du Projet de Transformation Numérique sont mises en œuvre à ' +
      'l’échelle nationale, avec une attention particulière portée aux provinces ' +
      'identifiées comme prioritaires dans le Cadre de Partenariat Pays entre la ' +
      'Banque mondiale et le Gouvernement de la République Démocratique du Congo, ' +
      'notamment Kinshasa, Kwilu, Kongo Central, Kasaï, Kasaï Central, Kasaï ' +
      'Oriental, Lomami, Nord-Kivu, Sud-Kivu et Ituri. Dans ce cadre, le Projet ' +
      'prévoit également la mise en œuvre d’actions pilotes dans d’autres ' +
      'provinces stratégiques, en fonction des objectifs spécifiques des ' +
      'activités et des besoins identifiés, afin de tester des approches ' +
      'innovantes et préparer leur déploiement à plus grande échelle.',
  },
];
