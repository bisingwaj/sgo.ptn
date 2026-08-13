import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiService } from './ai.service';
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
@Injectable()
export class TdrAssistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  private static readonly SYSTEM = `Vous assistez la rédaction de Termes de Référence (TDR) pour le Projet de Transformation Numérique de la République Démocratique du Congo (PTN-RDC, code Banque mondiale P180495), financé par l'IDA et l'AFD.

Cadre à respecter :
— Manuel d'Exécution du Projet du 23 juin 2025
— Règlements de Passation des Marchés de la Banque mondiale pour Emprunteurs IPF, édition de février 2025
— Loi 18/019 de la RDC sur les marchés publics
— Cadre Environnemental et Social de la Banque mondiale (NES 1 à 10)

Exigences de rédaction :
— Français institutionnel, sobre, à la voix active. Phrases courtes.
— Aucun superlatif, aucune formule commerciale.
— Vous n'inventez JAMAIS de montant, de date, de nom d'organisation, de référence réglementaire ni de statistique. Si une information manque, vous restez général plutôt que de la fabriquer.
— Vous ne citez un article du MEP ou d'un règlement que si son numéro vous est fourni.
— Vous produisez un texte à reprendre par un rédacteur humain, pas un document final.`;

  private async loadContext(tdrId: string) {
    const tdr = await this.prisma.tdr.findUniqueOrThrow({
      where: { id: tdrId },
      include: {
        tdrType: { include: { defaultMethod: true } },
        ptbaActivity: { include: { component: true, province: true } },
        organisation: { select: { name: true, fullName: true, type: true } },
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

    lines.push(`Intitulé de l'activité : ${tdr.title}`);
    grounded.push(`Intitulé — ${tdr.title}`);

    lines.push(`Type de TDR : ${tdr.tdrType.name} (${tdr.tdrType.code}), famille « ${tdr.tdrType.familyLabel} »`);
    grounded.push(`Type — ${tdr.tdrType.name}`);

    if (tdr.tdrType.defaultMethod) {
      lines.push(`Méthode de passation usuelle pour ce type : ${tdr.tdrType.defaultMethod.label} (${tdr.tdrType.defaultMethod.code})`);
    }

    if (tdr.ptbaActivity) {
      const a = tdr.ptbaActivity;
      lines.push(
        `Activité du Plan de Travail et Budget Annuel : code ${a.code}, « ${a.title} », composante ${a.componentCode} — ${a.component.label}${a.subComponent ? `, sous-composante ${a.subComponent}` : ''}`,
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

    lines.push(`Entité qui rédige : ${tdr.organisation.fullName}`);
    grounded.push(`Organisation — ${tdr.organisation.name}`);

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
      lines.push(`Bénéficiaires déjà identifiés par le rédacteur : ${tdr.beneficiaries.trim()}`);
    }
    if (tdr.justification?.trim()) {
      lines.push(`Justification déjà rédigée : ${tdr.justification.trim()}`);
    }

    // Le montant est communiqué à titre d'ordre de grandeur, jamais
    // demandé en retour : aucune valeur fiduciaire ne se génère.
    if (tdr.budgetTotalUsd) {
      lines.push(
        `Ordre de grandeur budgétaire, pour calibrer l'ambition du texte : ${(Number(tdr.budgetTotalUsd) / 1e6).toFixed(2)} millions USD. Ne reprenez ce montant nulle part dans votre réponse.`,
      );
    }

    return { text: lines.join('\n'), grounded };
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

    const result = await this.ai.generate({
      system: TdrAssistService.SYSTEM,
      maxTokens: 700,
      user: `Rédigez la section « Contexte et justification » de ce TDR.

${text}

Attendu : deux à trois paragraphes, 180 à 260 mots au total. Exposez le besoin, son rattachement à la composante du projet, et ce que l'activité doit permettre. N'énumérez pas d'objectifs ni de livrables — ils font l'objet de sections distinctes. Ne concluez pas par une formule d'ouverture. Répondez par le texte seul, sans titre ni commentaire.`,
    });

    await this.record(tdrId, 'contexte', result.model, actor, ctx);
    return { proposal: result.text, model: result.model, groundedOn: grounded };
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

    const result = await this.ai.generate({
      system: TdrAssistService.SYSTEM,
      json: true,
      maxTokens: 900,
      user: `Proposez les objectifs de ce TDR.

${text}${contextBlock}

Attendu : trois à cinq objectifs. Chacun commence par un verbe d'action à l'infinitif et s'accompagne d'un critère de constatation vérifiable — une grandeur mesurable et un horizon. Là où une valeur cible dépendrait d'une donnée que vous n'avez pas, écrivez un repère explicite entre crochets, par exemple « [à fixer] », plutôt qu'un chiffre inventé.

Répondez par un objet JSON de la forme :
{"objectives":[{"title":"…","criteria":"…"}]}`,
    });

    let parsed: Array<{ title: string; criteria: string }> = [];
    try {
      const json = JSON.parse(result.text) as { objectives?: Array<{ title?: string; criteria?: string }> };
      parsed = (json.objectives ?? [])
        .filter((o) => o.title?.trim())
        .map((o) => ({ title: String(o.title).trim(), criteria: String(o.criteria ?? '').trim() }));
    } catch {
      throw new BadRequestException(
        'La réponse du modèle n’a pas pu être interprétée. Réessayez, ou saisissez les objectifs manuellement.',
      );
    }

    if (parsed.length === 0) {
      throw new BadRequestException('Le modèle n’a proposé aucun objectif exploitable.');
    }

    await this.record(tdrId, 'objectifs', result.model, actor, ctx);
    return { proposal: parsed, model: result.model, groundedOn: grounded };
  }
}
