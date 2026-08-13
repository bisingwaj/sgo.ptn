import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiService } from './ai.service';
import { buildSystemPrompt } from './project-knowledge';
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
  'TDR-SN': "une prestation de services non intellectuels : niveaux de service attendus, indicateurs de qualité et modalités de facturation",
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
   * Isole l'objet JSON d'une reponse.
   *
   * `response_format: json_object` n'est pas honore par tous les modeles
   * servis par OpenRouter : ceux d'Anthropic ne connaissent pas ce parametre
   * et repondent volontiers par une phrase d'introduction, ou par un bloc
   * encadre de triples accents graves. Le texte reste bon ; seul son
   * emballage change. On decoupe donc du premier { a la derniere } plutot
   * que d'echouer sur une difference de forme.
   */
  static extractJson(raw: string): string {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return raw;
    return raw.slice(start, end + 1);
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
        ptbaActivity: { include: { component: true, province: true } },
        organisation: { select: { name: true, fullName: true, type: true } },
        beneficiaryOrganisation: { select: { name: true, fullName: true } },
        province: true,
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

    if (tdr.tdrType.defaultMethod) {
      lines.push(`Méthode de passation usuelle pour ce type : ${tdr.tdrType.defaultMethod.label} (${tdr.tdrType.defaultMethod.code})`);
    }

    if (tdr.ptbaActivity) {
      const a = tdr.ptbaActivity;
      lines.push(
        `Activité du Plan de Travail et Budget Annuel à laquelle ce TDR se rattache : code ${a.code}, « ${a.title} », composante ${a.componentCode} — ${a.component.label}${a.subComponent ? `, sous-composante ${a.subComponent}` : ''}. Cette activité est le cadre budgétaire du dossier ; le TDR n'en couvre qu'une part.`,
      );
      grounded.push(`Activité PTBA — ${a.code} · ${a.title}`);
      grounded.push(`Composante — ${a.componentCode}`);
    }

    const province = tdr.province ?? tdr.ptbaActivity?.province;
    if (province) {
      lines.push(`Couverture géographique : province du ${province.label}${province.isPriorityCpf ? ' (province prioritaire du Cadre de Partenariat-Pays)' : ''}`);
      grounded.push(`Province — ${province.label}`);
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

    let parsed: Array<{ title: string; criteria: string }> = [];
    try {
      const json = JSON.parse(TdrAssistService.extractJson(result.text)) as {
        objectives?: Array<{ title?: string; criteria?: string }>;
      };
      parsed = (json.objectives ?? [])
        .filter((o) => o.title?.trim())
        .map((o) => ({ title: String(o.title).trim(), criteria: String(o.criteria ?? '').trim() }));
    } catch {
      // Sans trace, un échec de lecture est indiagnosticable : le texte du
      // modèle n'est vu par personne. On journalise de quoi trancher entre
      // une réponse coupée et une réponse mal formée.
      this.logger.warn(
        `Objectifs illisibles — finish_reason=${result.finishReason ?? 'inconnu'}, ` +
          `${result.text.length} caractères, fin du texte : ${JSON.stringify(result.text.slice(-160))}`,
      );
      throw new BadRequestException(
        result.finishReason === 'length'
          ? 'La proposition a été coupée avant sa fin. Relancez : le texte sera plus court.'
          : 'La réponse du modèle n’a pas pu être interprétée. Réessayez, ou saisissez les objectifs manuellement.',
      );
    }

    if (parsed.length === 0) {
      throw new BadRequestException('Le modèle n’a proposé aucun objectif exploitable.');
    }

    await this.record(tdrId, 'objectifs', result.model, actor, ctx);
    return { proposal: parsed, model: result.model, groundedOn: grounded };
  }
}
