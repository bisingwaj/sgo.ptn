import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiService, type GenerationResult } from './ai.service';
import { buildSystemPrompt } from './project-knowledge';
import { FIELDS } from './field-registry';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

export interface Proposal<T> {
  proposal: T;
  model: string;
  /** Éléments du dossier réellement transmis au modèle */
  groundedOn: string[];
}

/**
 * Assistance rédactionnelle sur les TDR.
 *
 * Trois règles tiennent tout le reste :
 *
 *  1. Le modèle ne voit que des données de projet — activité PTBA,
 *     composante, type, montant. Jamais de contenu du canal MGP-EAS/HS,
 *     sur lequel le MEP interdit formellement l'IA générative, ni de
 *     données personnelles.
 *  2. Il produit une PROPOSITION. Rien n'entre dans le document sans un
 *     geste explicite de l'auteur : le service ne persiste pas.
 *  3. Chaque génération est journalisée — qui, quel modèle, quel TDR.
 *     Un TDR est une pièce contractuelle ; il faut pouvoir établir ce qui
 *     a été rédigé par une machine.
 *
 * Aucun montant n'est jamais demandé au modèle : les valeurs fiduciaires
 * ne se génèrent pas.
 */
/**
 * Ce sur quoi porte réellement chaque type de TDR.
 *
 * Sans cette précision, le modèle traite l'activité PTBA qui englobe le
 * dossier plutôt que le dossier lui-même : un TDR de mission rattaché à
 * une activité de plateforme se met à décrire la plateforme.
 */
const TYPE_NATURE: Record<string, string> = {
  'TDR-TX': "des travaux à réaliser : ouvrages, aménagements, normes techniques et modalités de réception",
  'TDR-FN': "l'acquisition de biens et d'équipements : spécifications techniques, normes, garantie et service après-vente",
  'TDR-CS': "une mission de conseil confiée à une firme : expertise attendue, méthodologie, profils-clés et livrables d'étude",
  'TDR-SN': "une prestation de services non-consultants : niveaux de service attendus, indicateurs de qualité et modalités de facturation",
  'TDR-AT': "l'organisation d'un atelier ou d'un séminaire : objectifs de la rencontre, public visé, programme, logistique",
  'TDR-FO': "un cycle de formation : curriculum, public cible, modalités pédagogiques, évaluation des acquis",
  'TDR-MI': "le déplacement d'une délégation à un événement international ou en voyage d'études : ce que la délégation va observer, auprès de qui, et ce qu'elle en rapportera. Ce n'est PAS la réalisation du projet auquel la mission se rattache",
  'TDR-ET': "une étude, un diagnostic ou une évaluation : question posée, méthodologie, échantillonnage, livrable analytique",
  'TDR-CO': "une action de communication ou de sensibilisation : messages, publics, canaux, plan média",
  'TDR-SB': "une subvention basée sur la performance à un sous-projet : jalons, critères de décaissement, vérification",
  'TDR-AU': "une mission d'audit ou de contrôle : périmètre, référentiel, échantillonnage, forme du rapport",
};

@Injectable()
export class TdrAssistService {
  private readonly logger = new Logger(TdrAssistService.name);

  /**
   * Isole l'objet JSON d'une réponse.
   *
   * `response_format: json_object` n'est pas honoré par tous les modèles
   * servis par OpenRouter : ceux d'Anthropic ne connaissent pas ce paramètre
   * et répondent volontiers par une phrase d'introduction, ou par un bloc
   * encadré de triples accents graves. Le texte reste bon ; seul son
   * emballage change. On découpe donc du premier { à la dernière } plutôt
   * que d'échouer sur une différence de forme.
   */
  static extractJson(raw: string): string {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return raw;
    return raw.slice(start, end + 1);
  }

  /**
   * Lit une liste d'objets depuis une réponse JSON du modèle.
   *
   * Mutualise ce qui, sinon, se recopie à chaque champ structuré : la
   * tolérance à l'emballage, le rejet des lignes vides, et surtout la
   * distinction entre une réponse coupée au plafond de jetons et une
   * réponse mal formée. Les deux se présentaient comme « illisible », ce
   * qui envoyait l'auteur relancer une génération qui échouerait pareil.
   */
  private readList<T>(
    result: GenerationResult,
    key: string,
    noun: string,
    map: (row: Record<string, unknown>) => T | null,
  ): T[] {
    let rows: Array<Record<string, unknown>>;
    try {
      const json = JSON.parse(TdrAssistService.extractJson(result.text)) as Record<string, unknown>;
      rows = (json[key] as Array<Record<string, unknown>>) ?? [];
      if (!Array.isArray(rows)) throw new Error('forme inattendue');
    } catch {
      // Sans trace, un échec de lecture est indiagnosticable : le texte du
      // modèle n'est vu par personne.
      this.logger.warn(
        `Réponse illisible pour « ${noun} » — finish_reason=${result.finishReason ?? 'inconnu'}, ` +
          `${result.text.length} caractères, fin du texte : ${JSON.stringify(result.text.slice(-160))}`,
      );
      throw new BadRequestException(
        result.finishReason === 'length'
          ? 'La proposition a été coupée avant sa fin. Relancez : le texte sera plus court.'
          : `La réponse du modèle n’a pas pu être interprétée. Réessayez, ou saisissez les ${noun} manuellement.`,
      );
    }

    const parsed = rows.map(map).filter((r): r is T => r !== null);
    if (parsed.length === 0) {
      throw new BadRequestException(`Le modèle n’a proposé aucun élément exploitable pour les ${noun}.`);
    }
    return parsed;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  /**
   * L'invite système est composée depuis le socle de connaissance
   * institutionnelle : identité du projet, dotations exactes des
   * composantes, cadre de résultats, gouvernance, règles de passation,
   * vocabulaire fermé et interdits. Un modèle qui ignore ces faits les
   * comblera — la connaissance est la première défense contre la
   * fabulation, les interdits ne sont que la seconde.
   */
  private static system(requiresPges: boolean): string {
    return buildSystemPrompt({ includeSafeguards: requiresPges });
  }

  private async loadContext(tdrId: string) {
    const tdr = await this.prisma.tdr.findUniqueOrThrow({
      where: { id: tdrId },
      include: {
        tdrType: { include: { defaultMethod: true } },
        ptbaActivity: {
          include: { component: true, provinces: { include: { province: true } } },
        },
        organisation: { select: { name: true, fullName: true, type: true } },
        beneficiaryOrganisation: { select: { name: true, fullName: true } },
        provinces: { include: { province: true } },
        objectives: { orderBy: { position: 'asc' } },
      },
    });

    if (!['BROUILLON', 'RETOURNE'].includes(tdr.status)) {
      throw new BadRequestException(
        'L’assistance n’est proposée que sur un TDR en cours de rédaction.',
      );
    }
    return tdr;
  }

  /** Décrit le dossier au modèle, sans rien inventer de ce qui manque. */
  private static describe(tdr: Awaited<ReturnType<TdrAssistService['loadContext']>>): {
    text: string;
    grounded: string[];
  } {
    const grounded: string[] = [];
    const lines: string[] = [];

    const nature = TYPE_NATURE[tdr.tdrTypeCode];
    lines.push(
      `OBJET DU PRÉSENT TDR — c'est de cela, et de cela seulement, que votre texte doit traiter.`,
    );
    lines.push(`Intitulé : ${tdr.title}`);
    lines.push(`Type : ${tdr.tdrType.name} (${tdr.tdrType.code}), famille « ${tdr.tdrType.familyLabel} »`);
    if (nature) {
      lines.push(`Un TDR de ce type porte sur ${nature}.`);
    }
    grounded.push(`Intitulé — ${tdr.title}`);
    grounded.push(`Type — ${tdr.tdrType.name}`);

    lines.push('');
    lines.push(
      `CADRE DE RATTACHEMENT — éléments de situation. Ils situent le dossier, ils n'en sont pas l'objet.`,
    );

    if (tdr.ptbaActivity) {
      const a = tdr.ptbaActivity;
      lines.push(
        `Activité du Plan de Travail et Budget Annuel à laquelle ce TDR se rattache : code ${a.code}, « ${a.title} », composante ${a.componentCode} — ${a.component.label}${a.subComponent ? `, sous-composante ${a.subComponent}` : ''}. Cette activité est le cadre budgétaire du dossier.`,
      );
      grounded.push(`Activité PTBA — ${a.code} · ${a.title}`);
      grounded.push(`Composante — ${a.componentCode}`);
    }

    // La couverture peut porter sur plusieurs provinces ; à défaut, celle de
    // l'activité du plan sert de repère — devenue elle aussi multiple.
    const provinces = tdr.provinces.length
      ? tdr.provinces.map((c) => c.province)
      : (tdr.ptbaActivity?.provinces ?? []).map((c) => c.province);
    if (provinces.length > 0) {
      const prioritaires = provinces.filter((p) => p.isPriorityCpf).length;
      lines.push(
        `Couverture géographique : ${provinces.map((p) => p.label).join(', ')}` +
          (prioritaires
            ? ` — dont ${prioritaires} province${prioritaires > 1 ? 's' : ''} prioritaire${prioritaires > 1 ? 's' : ''} du Cadre de Partenariat-Pays`
            : ''),
      );
      grounded.push(`Couverture — ${provinces.map((p) => p.label).join(', ')}`);
    } else {
      lines.push('Couverture géographique : nationale.');
    }

    lines.push(`Entité qui rédige le dossier : ${tdr.organisation.fullName}`);
    grounded.push(`Rédacteur — ${tdr.organisation.name}`);

    // La maîtrise d'ouvrage bénéficiaire, quand elle est désignée, donne au
    // modèle un nom vérifié. À défaut, il faut lui dire explicitement qu'il
    // n'y en a pas : c'est ce vide qu'il comblait en devinant.
    if (tdr.beneficiaryOrganisation) {
      lines.push(
        `Maîtrise d'ouvrage bénéficiaire, pour laquelle l'activité est conduite : ${tdr.beneficiaryOrganisation.fullName}. Vous pouvez la nommer.`,
      );
      grounded.push(`Bénéficiaire — ${tdr.beneficiaryOrganisation.name}`);
    } else {
      lines.push(
        `AUCUNE maîtrise d'ouvrage bénéficiaire n'est désignée dans ce dossier. N'en devinez pas : désignez l'acteur par sa fonction — « l'entité bénéficiaire », « l'exploitant », « l'administration destinataire » — et laissez le rédacteur y substituer le nom qu'il aura vérifié.`,
      );
    }

    lines.push(
      `Hors ces entités, aucune autre institution n'est connue de ce dossier ; n'en impliquez aucune.`,
    );

    if (tdr.durationMonths) {
      lines.push(`Durée prévisionnelle : ${tdr.durationMonths} mois`);
      grounded.push(`Durée — ${tdr.durationMonths} mois`);
    }
    if (tdr.tdrType.requiresPges) {
      lines.push(
        "Ce type d'activité exige un Plan de Gestion Environnementale et Sociale : les enjeux de sauvegardes doivent apparaître.",
      );
    }
    if (tdr.beneficiaries?.trim()) {
      lines.push(
        `Bénéficiaires visés, tels qu'identifiés par le rédacteur — il s'agit des populations servies, non de l'institution maître d'ouvrage : ${tdr.beneficiaries.trim()}`,
      );
      grounded.push('Bénéficiaires visés');
    }
    if (tdr.justification?.trim()) {
      lines.push(`Justification déjà rédigée : ${tdr.justification.trim()}`);
    }

    // Chiffre vérifié : le citer est légitime, le recalculer ne l'est pas.
    if (tdr.budgetTotalUsd) {
      lines.push(
        `Budget envisagé pour ce TDR : ${(Number(tdr.budgetTotalUsd) / 1e6).toFixed(2)} millions USD. Vous pouvez citer ce chiffre tel quel ; vous ne le décomposez ni ne l'extrapolez.`,
      );
    }

    return { text: lines.join('\n'), grounded };
  }

  /**
   * Ancrage complémentaire tiré de la base : dotation réelle de la
   * composante et intitulés des clauses déjà disponibles pour ce type.
   * Le modèle sait ainsi ce qui existe en bibliothèque et n'a pas à
   * réinventer un dispositif contractuel qui y figure déjà.
   */
  private async liveGrounding(
    tdr: Awaited<ReturnType<TdrAssistService['loadContext']>>,
  ): Promise<string> {
    const lines: string[] = [];

    if (tdr.ptbaActivity?.component) {
      const c = tdr.ptbaActivity.component;
      lines.push(
        `Dotation de la composante ${c.code} — ${c.label} : ${Number(c.totalUsdM)} M USD ` +
          `(IDA ${Number(c.idaUsdM)} / AFD ${Number(c.afdUsdM)}). ` +
          `Enveloppe de l'activité au PTBA : ${(Number(tdr.ptbaActivity.envelopeUsd) / 1e6).toFixed(2)} M USD.`,
      );
      // Le MEP et le PAD divergent sur plusieurs dotations, et le corpus
      // impose que tout affichage du montant signale la réconciliation. Le
      // socle statique la portait ; ce chemin-ci la perdait, et poussait le
      // chiffre nu sous une consigne autorisant à le citer tel quel.
      if (c.reconciliation) {
        lines.push(
          `Réserve attachée à ce montant : ${c.reconciliation} Si vous citez cette dotation, mentionnez la réserve.`,
        );
      }
    }

    const clauses = await this.prisma.clauseTemplate.findMany({
      where: { tdrTypeCode: tdr.tdrTypeCode, status: 'PUBLIE' },
      select: { label: true },
      orderBy: { label: 'asc' },
    });
    if (clauses.length > 0) {
      lines.push(
        `Dispositions contractuelles déjà disponibles en bibliothèque pour ce type, que le rédacteur ` +
          `retiendra à une étape ultérieure — ne les reprenez pas dans votre texte : ` +
          `${clauses.map((c) => c.label).join(' · ')}.`,
      );
    }

    return lines.length > 0 ? `\n\n${lines.join('\n')}` : '';
  }

  private async record(
    tdrId: string,
    kind: string,
    model: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'tdr.assist.generated',
      entityType: 'Tdr',
      entityId: tdrId,
      payload: { kind, model },
      ...ctx,
    });
  }

  /** Proposition de contexte — un paragraphe suivi, prêt à reprendre. */
  async proposeContext(
    tdrId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Proposal<string>> {
    const tdr = await this.loadContext(tdrId);
    const { text, grounded } = TdrAssistService.describe(tdr);

    const live = await this.liveGrounding(tdr);

    const result = await this.ai.generate({
      system: TdrAssistService.system(tdr.tdrType.requiresPges),
      maxTokens: 700,
      user: `Rédigez la section « Contexte et justification » de ce TDR.

${text}${live}

Attendu : deux à trois paragraphes, 180 à 260 mots au total.

Le premier paragraphe situe le besoin dans le cadre du projet. Les suivants traitent de l'objet du présent TDR tel que défini plus haut — pas de l'activité PTBA dans son ensemble, qui le dépasse.

N'énumérez ni objectifs ni livrables : ils font l'objet de sections distinctes. Ne concluez pas par une formule d'ouverture. Répondez par le texte seul, sans titre ni commentaire.`,
    });

    await this.record(tdrId, 'contexte', result.model, actor, ctx);
    return { proposal: result.text, model: result.model, groundedOn: grounded };
  }

  /**
   * Proposition de justification.
   *
   * Deux régimes selon l'état du champ. À vide, le modèle rédige. Sur un
   * texte existant, il le reprend sans y introduire de fait nouveau :
   * améliorer ne doit pas devenir un moyen détourné d'ajouter des
   * affirmations que l'auteur n'a pas écrites et ne relira pas.
   */
  async proposeJustification(
    tdrId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Proposal<string> & { mode: 'redaction' | 'reprise' }> {
    const tdr = await this.loadContext(tdrId);
    const { text, grounded } = TdrAssistService.describe(tdr);
    const live = await this.liveGrounding(tdr);

    const existing = tdr.justification?.trim() ?? '';
    const mode = existing.length >= 40 ? 'reprise' : 'redaction';

    const contextBlock = tdr.context?.trim()
      ? `\n\nContexte déjà rédigé pour ce TDR :\n${tdr.context.trim()}`
      : '';

    const instruction =
      mode === 'reprise'
        ? `Reprenez la justification ci-dessous rédigée par l'auteur.

Justification actuelle :
${existing}

Vous en améliorez la structure, la clarté et le registre. Vous n'ajoutez AUCUN fait, chiffre, référence ou affirmation qui n'y figure pas déjà : votre rôle est de mieux dire ce qui est écrit, pas d'en dire davantage. Si un passage vous paraît appeler une donnée manquante, signalez-le par un repère entre crochets plutôt que de la combler. Conservez la longueur à 20 % près.`
        : `Rédigez la section « Justification » de ce TDR : pourquoi cette action, et pourquoi maintenant. Un à deux paragraphes, 120 à 180 mots.

La section « Contexte » précède celle-ci dans le document et a déjà exposé la situation, le rattachement à la composante et les enjeux. Ne les redites pas. Vous répondez à une autre question : qu'est-ce qui rend cette action nécessaire maintenant, et que coûterait son report ? Ne recitez ni le code de l'activité, ni les montants, ni les indicateurs déjà mentionnés au contexte — le lecteur vient de les lire.`;

    const result = await this.ai.generate({
      system: TdrAssistService.system(tdr.tdrType.requiresPges),
      maxTokens: 600,
      user: `${instruction}

Éléments du dossier :
${text}${live}${contextBlock}

Répondez par le texte seul, sans titre ni commentaire.`,
    });

    await this.record(tdrId, `justification:${mode}`, result.model, actor, ctx);
    return { proposal: result.text, model: result.model, groundedOn: grounded, mode };
  }

  /**
   * Proposition d'objectifs assortis de leur critère de constatation.
   * Le critère est ce qui rend l'objectif vérifiable — sans lui, un TDR
   * ne permet pas de constater l'atteinte du résultat.
   */
  async proposeObjectives(
    tdrId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Proposal<Array<{ title: string; criteria: string }>>> {
    const tdr = await this.loadContext(tdrId);
    const { text, grounded } = TdrAssistService.describe(tdr);

    const contextBlock = tdr.context?.trim()
      ? `\n\nContexte déjà rédigé, sur lequel vous devez vous appuyer :\n${tdr.context.trim()}`
      : '';

    const live = await this.liveGrounding(tdr);

    const result = await this.ai.generate({
      system: TdrAssistService.system(tdr.tdrType.requiresPges),
      json: true,
      maxTokens: 1600,
      user: `Proposez les objectifs de ce TDR.

${text}${live}${contextBlock}

Attendu : trois à cinq objectifs. Chacun commence par un verbe d'action à l'infinitif et s'accompagne d'un critère de constatation vérifiable — une grandeur mesurable et un horizon. Là où une valeur cible dépendrait d'une donnée que vous n'avez pas, écrivez un repère explicite entre crochets, par exemple « [à fixer] », plutôt qu'un chiffre inventé.

Répondez par un objet JSON de la forme :
{"objectives":[{"title":"…","criteria":"…"}]}`,
    });

    const parsed = this.readList(result, 'objectives', 'objectifs', (row) => {
      const title = String(row.title ?? '').trim();
      if (!title) return null;
      return { title, criteria: String(row.criteria ?? '').trim() };
    });

    await this.record(tdrId, 'objectifs', result.model, actor, ctx);
    return { proposal: parsed, model: result.model, groundedOn: grounded };
  }
  /**
   * Propose les livrables du marché.
   *
   * Ils découlent des objectifs, et non du contexte : un objectif sans
   * livrable qui l'atteste n'est pas vérifiable, un livrable qui ne sert
   * aucun objectif n'a pas à être commandé. La génération est donc refusée
   * tant qu'aucun objectif n'est posé — proposer des pièces à remettre sans
   * savoir ce qu'elles doivent établir reviendrait à inventer le marché.
   *
   * L'échéancier est le point sensible. Une date engage contractuellement,
   * et les prohibitions du socle interdisent d'en inventer. On n'autorise
   * donc que des délais relatifs au démarrage, bornés par la durée du
   * marché lorsqu'elle est déjà saisie ; à défaut, le modèle doit écrire
   * un repère explicite plutôt qu'un chiffre.
   */
  async proposeDeliverables(
    tdrId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Proposal<Array<{ title: string; format: string; deadline: string }>>> {
    const tdr = await this.loadContext(tdrId);

    if (tdr.objectives.length === 0) {
      throw new BadRequestException(
        'Définissez d’abord au moins un objectif : les livrables sont les pièces qui en attestent l’atteinte.',
      );
    }

    const { text, grounded } = TdrAssistService.describe(tdr);
    const live = await this.liveGrounding(tdr);

    const objectivesBlock = [
      '',
      '',
      'Objectifs déjà arrêtés, que les livrables doivent servir :',
      ...tdr.objectives.map(
        (o, i) => `${i + 1}. ${o.title}${o.criteria ? ` — constaté par : ${o.criteria}` : ''}`,
      ),
    ].join('\n');
    grounded.push('objectifs du dossier');

    const durationBlock = tdr.durationMonths
      ? `\n\nDurée du marché : ${tdr.durationMonths} mois. Aucune échéance ne peut la dépasser.`
      : '\n\nLa durée du marché n’est PAS fixée dans ce dossier. Toutes les échéances doivent donc valoir « [à fixer] » : vous n’avez aucun élément pour les situer.';

    const result = await this.ai.generate({
      system: TdrAssistService.system(tdr.tdrType.requiresPges),
      json: true,
      maxTokens: 1600,
      user: `Proposez les livrables de ce TDR.

${text}${live}${objectivesBlock}${durationBlock}

Attendu : trois à six livrables, dans l’ordre où ils sont remis. Chacun porte trois éléments :
— un intitulé, qui nomme la pièce remise et non l’activité qui la produit ;
— un format, en QUELQUES MOTS : « PDF, 30 à 40 pages », « procès-verbal contradictoire », « plans tous corps d’état », « code source et guide d’exploitation ». C’est une forme et un volume, pas un sommaire — le contenu attendu se dit dans l’intitulé, jamais ici. Une phrase entière à cet endroit est une erreur ;
— une échéance.

L’échéance s’exprime UNIQUEMENT en délai relatif au démarrage du contrat : « J+15 » pour le quinzième jour, « S+4 » pour la quatrième semaine, « M+6 » pour le sixième mois. Choisissez l’unité qui convient à la durée du marché. N’écrivez jamais de date, de trimestre, de semestre ni de nom de mois : un échéancier inventé engage contractuellement le projet.

Répondez par un objet JSON de la forme :
{"deliverables":[{"title":"…","format":"…","deadline":"…"}]}`,
    });

    const parsed = this.readList(result, 'deliverables', 'livrables', (row) => {
      const title = String(row.title ?? '').trim();
      if (!title) return null;
      return {
        title,
        format: String(row.format ?? '').trim(),
        // Dernier filet : la durée n'est pas connue, donc aucune échéance
        // ne peut l'être. Le modèle a beau être instruit, c'est ici que la
        // règle est tenue.
        deadline: tdr.durationMonths ? String(row.deadline ?? '').trim() : '[à fixer]',
      };
    });

    await this.record(tdrId, 'livrables', result.model, actor, ctx);
    return { proposal: parsed, model: result.model, groundedOn: grounded };
  }
  /**
   * Consignes de rédaction, une par champ de texte.
   *
   * Elles portent ce que le registre ne dit pas : la longueur attendue, et
   * surtout ce qu'il ne faut PAS écrire là. Sans elles, le modèle traite
   * chaque champ comme une invitation à tout redire, et les six sections
   * finissent par se répéter.
   */
  private static readonly CONSIGNES: Record<string, string> = {
    context: `Attendu : deux à trois paragraphes, 180 à 260 mots au total.

Le premier paragraphe situe le besoin dans le cadre du projet. Les suivants traitent de l'objet du PRÉSENT TDR tel que défini plus haut — pas de l'activité du plan dans son ensemble, qui le dépasse.

N'énumérez ni objectifs ni livrables : ils font l'objet de sections distinctes. Ne concluez pas par une formule d'ouverture.`,

    justification: `Attendu : un à deux paragraphes, 120 à 180 mots.

La section « Contexte » précède celle-ci dans le document et a déjà exposé la situation, le rattachement à la composante et les enjeux. Ne les redites pas. Vous répondez à une autre question : qu'est-ce qui rend cette action nécessaire MAINTENANT, et que coûterait son report ?

Ne recitez ni le code de l'activité, ni les montants, ni les indicateurs déjà mentionnés au contexte — le lecteur vient de les lire.`,

    beneficiaries: `Attendu : un paragraphe, 60 à 110 mots.

Les POPULATIONS servies, jamais l'institution maître d'ouvrage — c'est la confusion la plus fréquente sur ce champ. Quantifiez lorsque le dossier porte un chiffre ; à défaut, laissez « [nombre à préciser] » plutôt que d'avancer une estimation. Distinguez les bénéficiaires directs des bénéficiaires indirects si la distinction a un sens ici.`,

    expectedResults: `Attendu : trois à six résultats, un par ligne, sans numérotation ni puce.

Chaque ligne énonce ce qui SERA CONSTATÉ à l'issue, avec son horizon. Un résultat n'est ni une action ni un livrable : « le centre de supervision traite les incidents 24 h/24 » est un résultat, « installer les serveurs » n'en est pas un. Les valeurs cibles absentes du dossier restent entre crochets.`,

    approach: `Attendu : deux paragraphes, 120 à 200 mots.

L'approche générale attendue du prestataire : par quelle voie il s'y prend, et pourquoi elle convient à cet objet. Ne détaillez pas les étapes — la méthodologie les porte, dans une section distincte. N'imposez pas d'outil ni de fournisseur nommé.`,

    methodology: `Attendu : les étapes attendues, une par ligne, dans l'ordre.

Chaque ligne nomme une phase et ce qu'elle produit. Restez sur ce que le prestataire doit faire, non sur ce que l'administration fera de son côté. Ne fixez pas de dates : le calendrier fait l'objet d'une section propre.`,

    constraints: `Attendu : les contraintes réelles, une par ligne.

Ce qui borne l'exécution : accès aux sites, disponibilité des données, saisonnalité, interopérabilité avec l'existant, sécurité. N'inventez aucune contrainte réglementaire ni aucun texte de loi que le dossier ne mentionne pas. Une contrainte qui n'en est pas une affaiblit celles qui en sont.`,

    expertise: `Attendu : les profils-clés, un par ligne, avec pour chacun le domaine et l'expérience minimale attendue.

Restez sur des qualifications vérifiables. Ne nommez aucune personne, aucun cabinet, aucune certification propriétaire qui restreindrait la concurrence — la mise en concurrence ouverte est la règle du projet.`,
  };

  /**
   * Assistance sur un champ de texte quelconque du dossier.
   *
   * Un seul point d'entrée plutôt qu'un endpoint par champ : le registre
   * `FIELDS` porte déjà la description et la nature de chacun, et huit
   * routes qui ne diffèrent que par leur consigne auraient divergé à la
   * première correction.
   *
   * Les champs de MONTANT et de DATE en sont exclus, et ce n'est pas un
   * oubli : le socle distingue la dictée de la fabrication, et proscrit la
   * seconde. Un budget ne se propose pas.
   */
  /**
   * Prépare la demande d'un champ de texte : consigne, ancrage, régime.
   *
   * Isolé parce que deux chemins l'empruntent — la réponse d'un bloc et le
   * flux. Deux copies auraient divergé à la première correction de consigne,
   * et le texte produit aurait dépendu du chemin emprunté.
   */
  private async prepareField(tdrId: string, champ: string) {
    const spec = FIELDS.find((f) => f.cle === champ);
    if (!spec) throw new BadRequestException(`Champ inconnu du dossier : ${champ}.`);

    if (spec.kind === 'liste_objectifs' || spec.kind === 'liste_livrables') {
      throw new BadRequestException(
        `Le champ ${champ} est une liste : il a sa propre route d’assistance.`,
      );
    }
    if (spec.kind !== 'texte') {
      throw new BadRequestException(
        `Le champ ${champ} porte une valeur chiffrée ou une date. Ces valeurs ne se génèrent ` +
          `pas : l’assistant les transcrit lorsqu’on les lui dicte, il ne les propose jamais.`,
      );
    }

    const consigne = TdrAssistService.CONSIGNES[champ];
    if (!consigne) {
      throw new BadRequestException(`Aucune consigne de rédaction n’est définie pour ${champ}.`);
    }

    const tdr = await this.loadContext(tdrId);
    const { text, grounded } = TdrAssistService.describe(tdr);
    const live = await this.liveGrounding(tdr);

    const existant = (tdr as unknown as Record<string, unknown>)[champ];
    const dejaEcrit = typeof existant === 'string' && existant.trim().length > 0;

    // Le contexte précède toutes les autres sections dans le document : le
    // donner évite qu'elles le redisent, ce qui est le défaut le plus
    // fréquent des dossiers reçus.
    const contexteDeja =
      champ !== 'context' && tdr.context?.trim()
        ? `\n\nCONTEXTE DÉJÀ RÉDIGÉ, que le lecteur aura lu avant votre texte — ne le répétez pas :\n${tdr.context.trim()}`
        : '';

    const user = `${dejaEcrit ? 'Reprenez' : 'Rédigez'} la section « ${spec.description.split(' :')[0]} » de ce TDR.

${text}${live}${contexteDeja}

${consigne}

${
  dejaEcrit
    ? `TEXTE EXISTANT, à reprendre dans sa forme sans y introduire aucun fait nouveau :\n${String(existant).trim()}`
    : ''
}

Répondez par le texte seul, sans titre ni commentaire.`;

    return {
      system: TdrAssistService.system(tdr.tdrType.requiresPges),
      user,
      grounded,
      mode: (dejaEcrit ? 'reprise' : 'redaction') as 'reprise' | 'redaction',
    };
  }

  /**
   * Même proposition, au fil de l'eau.
   *
   * Le texte arrive par fragments plutôt qu'en bloc. Ce n'est pas un effet :
   * une rédaction met dix à vingt secondes, et l'auteur regardait jusqu'ici
   * un écran immobile pendant tout ce temps. Les premiers mots paraissent
   * maintenant en une seconde, et il peut juger tôt s'il garde ou relance.
   */
  async *streamField(
    tdrId: string,
    champ: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): AsyncGenerator<
    | { type: 'ancrage'; groundedOn: string[]; mode: 'reprise' | 'redaction' }
    | { type: 'texte'; delta: string }
    | { type: 'fin' }
    | { type: 'erreur'; message: string }
  > {
    const prep = await this.prepareField(tdrId, champ);
    yield { type: 'ancrage', groundedOn: prep.grounded, mode: prep.mode };

    let modele = 'inconnu';
    try {
      for await (const ev of this.ai.stream({
        messages: [
          { role: 'system', content: prep.system },
          { role: 'user', content: prep.user },
        ],
        maxTokens: 900,
      })) {
        if (ev.type === 'texte') yield { type: 'texte', delta: ev.delta };
      }
    } catch (e) {
      yield {
        type: 'erreur',
        message: e instanceof Error ? e.message : 'La proposition n’a pas abouti.',
      };
      return;
    }

    await this.record(tdrId, `champ:${champ}`, modele, actor, ctx);
    yield { type: 'fin' };
  }

  async proposeField(
    tdrId: string,
    champ: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<Proposal<string> & { mode: 'redaction' | 'reprise' }> {
    // La demande est préparée par `prepareField`, partagée avec le flux :
    // le texte produit ne doit pas dépendre du chemin emprunté.
    const prep = await this.prepareField(tdrId, champ);

    const result = await this.ai.generate({
      system: prep.system,
      maxTokens: 900,
      user: prep.user,
    });

    await this.record(tdrId, `champ:${champ}`, result.model, actor, ctx);
    return {
      proposal: result.text.trim(),
      model: result.model,
      groundedOn: prep.grounded,
      mode: prep.mode,
    };
  }
}
