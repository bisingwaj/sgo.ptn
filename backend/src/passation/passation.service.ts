import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

/**
 * Le cycle de passation, du dossier transmis au marché publié.
 *
 * Le TDR s'arrêtait à sa transmission : les statuts REVUE_UGP, VALIDE_UGP,
 * ANO_EN_COURS et ANO_OBTENU existaient dans l'énumération, étaient
 * libellés dans le document, et n'étaient atteints par aucun code. Un
 * dossier transmis restait où il était.
 *
 * Ce service porte les six actes qui manquaient. Il rend du même coup
 * `dev-marches.ts` inutile : la donnée se renouvellera par les écrans, et
 * non par un seed qui franchissait ces étapes à la main.
 *
 * TROIS PRINCIPES, TOUS TIRÉS DU CORPUS
 *
 *  1. CHAQUE ACTE A SON DÉTENTEUR, et ce n'est pas le même. Réviser,
 *     valider, soumettre à non-objection, décider, publier : cinq
 *     permissions distinctes, arbitrées depuis le MEP. La décision d'ANO
 *     n'appartient qu'aux bailleurs — l'UGPTN la demande, elle ne se la
 *     donne pas.
 *
 *  2. UN ACTE NE SE REJOUE PAS. Chaque transition vérifie l'état de départ,
 *     et le refus dit lequel était attendu. Sans cela, deux clics sur le
 *     même bouton produiraient deux marchés pour un dossier.
 *
 *  3. RIEN NE SE PUBLIE SANS SA NON-OBJECTION. Publier un DAO qui n'en a
 *     pas exposerait le projet à une annulation de procédure, et le
 *     candidat qui aurait engagé des frais de dossier n'y serait pour rien.
 */
@Injectable()
export class PassationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Le dossier, avec ce qu'il faut pour décider de sa suite. */
  private async charger(id: string) {
    const tdr = await this.prisma.tdr.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        title: true,
        status: true,
        procurementMethodCode: true,
        reviewType: true,
        budgetTotalUsd: true,
        context: true,
        expertise: true,
        marche: { select: { id: true, status: true, reference: true } },
      },
    });
    if (!tdr) throw new NotFoundException('TDR introuvable.');
    return tdr;
  }

  /**
   * Refuse une transition en disant d'où elle serait partie.
   *
   * « Action impossible » envoie chercher ; « ce dossier est en revue, la
   * validation part d'un dossier en revue » se comprend et se corrige.
   */
  private static exige(
    reference: string,
    actuel: string,
    attendus: string[],
    acte: string,
  ): never {
    const LISIBLE: Record<string, string> = {
      BROUILLON: 'en rédaction',
      SOUMIS_UGP: 'transmis à l’UGP',
      REVUE_UGP: 'en revue',
      RETOURNE: 'retourné à son auteur',
      VALIDE_UGP: 'validé',
      ANO_EN_COURS: 'en attente de non-objection',
      ANO_OBTENU: 'couvert par une non-objection',
      ANO_REFUSE: 'refusé par le bailleur',
      ARCHIVE: 'archivé',
    };
    throw new BadRequestException(
      `${reference} est ${LISIBLE[actuel] ?? actuel} : ${acte} suppose un dossier ` +
        `${attendus.map((a) => LISIBLE[a] ?? a).join(' ou ')}.`,
    );
  }

  /** La file des dossiers à instruire, pour l'UGP. */
  async aInstruire() {
    const lignes = await this.prisma.tdr.findMany({
      where: {
        // ANO_OBTENU y figure désormais : la non-objection obtenue n'est
        // pas la fin du chemin, c'est le moment de publier l'avis. Sans
        // cette ligne, le dossier disparaissait de la file au moment
        // précis où quelqu'un devait agir dessus.
        status: {
          in: [
            'SOUMIS_UGP',
            'REVUE_UGP',
            'VALIDE_UGP',
            'ANO_EN_COURS',
            'ANO_OBTENU',
            'ANO_REFUSE',
          ],
        },
      },
      select: {
        id: true,
        reference: true,
        title: true,
        status: true,
        submittedAt: true,
        procurementMethodCode: true,
        reviewType: true,
        budgetTotalUsd: true,
        organisation: { select: { name: true } },
        ptbaActivity: { select: { code: true, componentCode: true } },
        marche: { select: { id: true, status: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return lignes.map((t) => ({
      id: t.id,
      reference: t.reference,
      title: t.title,
      status: t.status,
      submittedAt: t.submittedAt,
      methodCode: t.procurementMethodCode,
      reviewType: t.reviewType,
      budgetTotalUsd: t.budgetTotalUsd ? Number(t.budgetTotalUsd) : null,
      organisation: t.organisation?.name ?? null,
      ptbaCode: t.ptbaActivity?.code ?? null,
      componentCode: t.ptbaActivity?.componentCode ?? null,
      marche: t.marche ? { id: t.marche.id, status: t.marche.status } : null,
    }));
  }

  /** Prend le dossier en revue. */
  async ouvrirRevue(id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const tdr = await this.charger(id);
    if (tdr.status !== 'SOUMIS_UGP') {
      PassationService.exige(
        tdr.reference,
        tdr.status,
        ['SOUMIS_UGP'],
        'ouvrir la revue',
      );
    }

    await this.prisma.tdr.update({
      where: { id },
      data: { status: 'REVUE_UGP' },
    });
    await this.trace('tdr.revue.ouverte', tdr.reference, id, actor, ctx, {});
    return { id, reference: tdr.reference, status: 'REVUE_UGP' };
  }

  /** Renvoie le dossier à son auteur, avec le motif. */
  async retourner(
    id: string,
    motif: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const tdr = await this.charger(id);
    if (!['SOUMIS_UGP', 'REVUE_UGP'].includes(tdr.status)) {
      PassationService.exige(
        tdr.reference,
        tdr.status,
        ['SOUMIS_UGP', 'REVUE_UGP'],
        'un retour à l’auteur',
      );
    }
    if (!motif.trim()) {
      // Un retour sans motif fait recommencer à l'aveugle : l'auteur ne
      // sait ni quoi corriger, ni si son dossier était loin du compte.
      throw new BadRequestException(
        'Le motif du retour est requis : il dit à l’auteur quoi reprendre.',
      );
    }

    await this.prisma.tdr.update({
      where: { id },
      data: {
        status: 'RETOURNE',
        reviewNote: motif.trim(),
        reviewedAt: new Date(),
      },
    });
    await this.trace('tdr.retourne', tdr.reference, id, actor, ctx, {
      motif: motif.slice(0, 500),
    });
    return { id, reference: tdr.reference, status: 'RETOURNE' };
  }

  /**
   * Valide le dossier, et fait naître le marché.
   *
   * C'est ici, et nulle part ailleurs, qu'un marché apparaît : il reprend la
   * référence du dossier, sa méthode et son type de revue tels qu'ils ont
   * été figés à la transmission. Les seuils bougent ; un marché en cours ne
   * change pas de méthode en chemin.
   */
  async valider(id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const tdr = await this.charger(id);
    if (!['SOUMIS_UGP', 'REVUE_UGP'].includes(tdr.status)) {
      PassationService.exige(
        tdr.reference,
        tdr.status,
        ['SOUMIS_UGP', 'REVUE_UGP'],
        'la validation',
      );
    }
    // Le refus disait « n'a ni méthode ni enveloppe » sans distinguer les
    // deux cas, dont un seul se corrige. Chacun nomme désormais sa cause,
    // et dit quoi faire.
    if (!tdr.budgetTotalUsd || Number(tdr.budgetTotalUsd) <= 0) {
      throw new BadRequestException(
        `${tdr.reference} ne porte aucune enveloppe : un marché ne peut pas en naître. ` +
          'Retournez le dossier à son auteur pour qu’il en chiffre le budget.',
      );
    }
    if (!tdr.procurementMethodCode) {
      throw new BadRequestException(
        `Aucune méthode de passation n’a pu être déduite pour ${tdr.reference}. ` +
          'Son type n’est rattaché à aucune catégorie de passation — c’est le cas des ateliers, ' +
          'des formations et des dons SBP, qui ne donnent pas lieu à un marché. ' +
          'Si celui-ci doit en produire un, il doit être repris sous un type qui porte une catégorie.',
      );
    }

    const marche = await this.prisma.$transaction(async (tx) => {
      await tx.tdr.update({
        where: { id },
        data: { status: 'VALIDE_UGP', reviewedAt: new Date() },
      });
      return tx.marche.create({
        data: {
          reference: tdr.reference,
          tdrId: id,
          methodCode: tdr.procurementMethodCode as string,
          reviewType: tdr.reviewType ?? 'PRIOR',
          status: 'PLANIFIE',
          estimatedUsd: tdr.budgetTotalUsd as never,
        },
        select: { id: true, reference: true, status: true },
      });
    });

    await this.trace('tdr.valide', tdr.reference, id, actor, ctx, {
      marcheId: marche.id,
    });
    return marche;
  }

  /**
   * Soumet le dossier d'appel d'offres à non-objection.
   *
   * L'UGPTN demande, elle ne décide pas. Le délai de service court à
   * compter d'ici : 14 jours pour la Banque mondiale, 21 pour l'AFD sur
   * les activités cofinancées.
   */
  /**
   * Quel bailleur est saisi de la non-objection.
   *
   * ELLE SE DÉDUISAIT DU TYPE DE REVUE : `reviewType === 'PRIOR'` donnait
   * la Banque mondiale, tout le reste l'AFD. Les deux notions n'ont rien
   * à voir. La revue préalable ou postérieure est une règle de SEUIL, la
   * même pour les deux bailleurs ; qui finance relève de la ventilation
   * arrêtée au plan. Un marché financé par l'IDA sous le seuil de revue
   * préalable partait ainsi à l'AFD, qui n'a rien à y dire.
   *
   * La ventilation du dossier tranche. Cofinancement : les deux sont
   * saisis, comme le veut le montage IDA 79 % / AFD 21 %.
   */
  private static bailleurSaisi(ida: unknown, afd: unknown): string {
    // Les montants arrivent en Decimal ; `Number` sur `null` vaut 0, d'où
    // la coalescence explicite plutôt qu'un transtypage.
    const partIda = Number(ida ?? 0);
    const partAfd = Number(afd ?? 0);
    if (partIda > 0 && partAfd > 0) return 'Banque mondiale et AFD';
    if (partAfd > 0) return 'AFD';
    // Sans ventilation lisible, l'IDA porte 79 % du financement : c'est
    // l'hypothèse la moins fausse, et le dépôt reste rectifiable.
    return 'Banque mondiale';
  }

  async demanderAno(
    marcheId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const marche = await this.prisma.marche.findUnique({
      where: { id: marcheId },
      select: {
        id: true,
        reference: true,
        status: true,
        reviewType: true,
        tdrId: true,
        // La ventilation du dossier désigne le bailleur à saisir.
        tdr: { select: { budgetIdaUsd: true, budgetAfdUsd: true } },
      },
    });
    if (!marche) throw new NotFoundException('Marché introuvable.');
    if (!['PLANIFIE', 'DAO_PREPARATION'].includes(marche.status)) {
      throw new BadRequestException(
        `Le marché ${marche.reference} n’est pas au stade où son dossier se soumet à non-objection.`,
      );
    }

    // Même raison qu'à la publication : le plus grand numéro attribué, non
    // le compte.
    const prefixeAno = `ANO-DAO-${new Date().getFullYear()}-`;
    const dernierAno = await this.prisma.ano.findFirst({
      where: { reference: { startsWith: prefixeAno } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });
    const rangAno = dernierAno
      ? Number(dernierAno.reference.slice(prefixeAno.length)) || 0
      : 0;
    const reference = `${prefixeAno}${String(rangAno + 1).padStart(3, '0')}`;

    const ano = await this.prisma.$transaction(async (tx) => {
      await tx.marche.update({
        where: { id: marcheId },
        data: { status: 'DAO_ANO' },
      });
      await tx.tdr.update({
        where: { id: marche.tdrId },
        data: { status: 'ANO_EN_COURS' },
      });
      return tx.ano.create({
        data: {
          reference,
          objet: 'DAO',
          objetId: marche.id,
          objetRef: marche.reference,
          donor: PassationService.bailleurSaisi(
            marche.tdr?.budgetIdaUsd,
            marche.tdr?.budgetAfdUsd,
          ),
          decision: 'EN_COURS',
          submittedById: actor.userId,
        },
        select: {
          id: true,
          reference: true,
          donor: true,
          decision: true,
          submittedAt: true,
        },
      });
    });

    await this.trace('ano.demandee', marche.reference, marche.id, actor, ctx, {
      ano: ano.reference,
      donor: ano.donor,
    });
    return ano;
  }

  /**
   * Les demandes de non-objection en attente, pour le bailleur.
   *
   * ELLE NE DISAIT QUE DES RÉFÉRENCES. Un relecteur de la Banque ou de
   * l'AFD y lisait « ANO-DAO-2026-001 · PTN-2026-014 » et rien de plus :
   * ni l'objet du marché, ni son montant, ni depuis quand il attend. On ne
   * décide pas là-dessus, on va chercher ailleurs — et l'écran ne sert
   * alors qu'à savoir qu'il y a quelque chose à faire.
   *
   * L'objet visé n'a pas de clé étrangère, à dessein : la référence doit
   * survivre à la disparition de ce qu'elle désigne. La jointure se fait
   * donc à la main, et un objet effacé laisse simplement ses champs vides.
   *
   * LE DÉLAI DE SERVICE EST CALCULÉ, NON STOCKÉ : 14 jours pour la Banque
   * mondiale, 21 pour l'AFD, comptés depuis le dépôt. Le stocker le
   * figerait au moment du dépôt, alors que la règle peut changer.
   */
  async anosEnCours() {
    const anos = await this.prisma.ano.findMany({
      where: { decision: 'EN_COURS' },
      select: {
        id: true,
        reference: true,
        objet: true,
        objetId: true,
        objetRef: true,
        donor: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'asc' },
    });
    if (anos.length === 0) return [];

    const marches = await this.prisma.marche.findMany({
      where: { id: { in: anos.map((a) => a.objetId) } },
      select: {
        id: true,
        reference: true,
        methodCode: true,
        reviewType: true,
        status: true,
        tdr: {
          select: {
            id: true,
            title: true,
            budgetTotalUsd: true,
            budgetIdaUsd: true,
            budgetAfdUsd: true,
            ptbaActivity: { select: { code: true, componentCode: true } },
            organisation: { select: { name: true } },
          },
        },
      },
    });
    const parId = new Map(marches.map((m) => [m.id, m]));

    return anos.map((a) => {
      const m = parId.get(a.objetId);
      const jours = a.donor.includes('AFD') && !a.donor.includes('mondiale') ? 21 : 14;
      const echeance = new Date(a.submittedAt.getTime() + jours * 86_400_000);
      return {
        id: a.id,
        reference: a.reference,
        objet: a.objet,
        objetRef: a.objetRef,
        donor: a.donor,
        submittedAt: a.submittedAt,
        /** Fin du délai de service. Le retard se lit de l'écran, pas d'un calcul de tête. */
        dueAt: echeance,
        delaiJours: jours,
        marcheId: m?.id ?? null,
        methodCode: m?.methodCode ?? null,
        reviewType: m?.reviewType ?? null,
        tdrId: m?.tdr?.id ?? null,
        title: m?.tdr?.title ?? null,
        budgetTotalUsd: m?.tdr?.budgetTotalUsd ? Number(m.tdr.budgetTotalUsd) : null,
        budgetIdaUsd: m?.tdr?.budgetIdaUsd ? Number(m.tdr.budgetIdaUsd) : null,
        budgetAfdUsd: m?.tdr?.budgetAfdUsd ? Number(m.tdr.budgetAfdUsd) : null,
        ptbaCode: m?.tdr?.ptbaActivity?.code ?? null,
        componentCode: m?.tdr?.ptbaActivity?.componentCode ?? null,
        organisation: m?.tdr?.organisation?.name ?? null,
      };
    });
  }

  /**
   * La décision du bailleur.
   *
   * Trois suites, et le corpus les nomme : non-objection, refus motivé,
   * demande de modification. Les deux dernières exigent un motif — une
   * décision qui bloque sans dire pourquoi ne se corrige pas.
   */
  async deciderAno(
    anoId: string,
    decision: 'NON_OBJECTION' | 'REFUS' | 'DEMANDE_MODIFICATION',
    motif: string | undefined,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const ano = await this.prisma.ano.findUnique({
      where: { id: anoId },
      select: {
        id: true,
        reference: true,
        objet: true,
        objetId: true,
        objetRef: true,
        decision: true,
      },
    });
    if (!ano)
      throw new NotFoundException('Demande de non-objection introuvable.');
    if (ano.decision !== 'EN_COURS') {
      throw new ForbiddenException(
        `${ano.reference} a déjà été décidée. Une décision de non-objection ne se reprend pas.`,
      );
    }
    if (decision !== 'NON_OBJECTION' && !motif?.trim()) {
      throw new BadRequestException(
        'Un refus et une demande de modification se motivent : sans motif, l’UGPTN ne sait pas quoi reprendre.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ano.update({
        where: { id: anoId },
        data: {
          decision,
          motif: motif?.trim() || null,
          decidedById: actor.userId,
          decidedAt: new Date(),
        },
      });

      if (ano.objet !== 'DAO') return;

      const marche = await tx.marche.findUnique({
        where: { id: ano.objetId },
        select: { id: true, tdrId: true },
      });
      if (!marche) return;

      if (decision === 'NON_OBJECTION') {
        await tx.marche.update({
          where: { id: marche.id },
          data: { status: 'DAO_PREPARATION' },
        });
        await tx.tdr.update({
          where: { id: marche.tdrId },
          data: { status: 'ANO_OBTENU' },
        });
      } else {
        // Refus comme demande de modification ramènent le dossier en
        // préparation : dans les deux cas, quelque chose est à reprendre.
        await tx.marche.update({
          where: { id: marche.id },
          data: { status: 'DAO_PREPARATION' },
        });
        await tx.tdr.update({
          where: { id: marche.tdrId },
          data: { status: decision === 'REFUS' ? 'ANO_REFUSE' : 'VALIDE_UGP' },
        });
      }
    });

    await this.trace('ano.decidee', ano.objetRef, ano.objetId, actor, ctx, {
      ano: ano.reference,
      decision,
    });
    return { id: anoId, reference: ano.reference, decision };
  }

  /**
   * Publie l'avis.
   *
   * Deux refus, et tous deux protègent un tiers : rien ne se publie sans sa
   * non-objection, et rien ne se publie deux fois. Un candidat qui verrait
   * paraître deux avis pour le même marché ne saurait auquel répondre.
   */
  async publier(
    marcheId: string,
    corps: {
      objet?: string;
      resume: string;
      qualifications?: string[];
      joursDeDepot?: number;
    },
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const marche = await this.prisma.marche.findUnique({
      where: { id: marcheId },
      select: {
        id: true,
        reference: true,
        status: true,
        methodCode: true,
        appelOffres: { select: { id: true, reference: true } },
        tdr: { select: { title: true, expertise: true } },
      },
    });
    if (!marche) throw new NotFoundException('Marché introuvable.');
    if (marche.appelOffres) {
      throw new ForbiddenException(
        `Un avis a déjà été publié pour ${marche.reference} (${marche.appelOffres.reference}). Un marché ne se publie qu'une fois.`,
      );
    }

    const ano = await this.prisma.ano.findFirst({
      where: { objet: 'DAO', objetId: marcheId, decision: 'NON_OBJECTION' },
      select: { reference: true },
    });
    if (!ano) {
      throw new BadRequestException(
        `Le dossier d’appel d’offres de ${marche.reference} n’est couvert par aucune non-objection. Publier sans elle exposerait la procédure à l’annulation.`,
      );
    }
    if (!corps.resume?.trim()) {
      throw new BadRequestException(
        'Le résumé de l’avis est requis : c’est ce qu’un candidat lit avant de décider s’il concourt.',
      );
    }

    // Le délai court à compter de la publication. Le corpus impose plus de
    // temps à l'international : constituer un dossier depuis l'étranger
    // n'est pas l'affaire d'une entreprise déjà sur place.
    const defaut =
      marche.methodCode === 'AOI' ? 45 : marche.methodCode === 'AON' ? 30 : 21;
    const jours =
      corps.joursDeDepot && corps.joursDeDepot >= 7
        ? corps.joursDeDepot
        : defaut;

    const famille = ['SFQC', 'SBQ', 'SCBD', 'SMC', 'SQC', 'CI', 'SS'].includes(
      marche.methodCode,
    )
      ? 'AMI'
      : marche.methodCode;
    const annee = new Date().getFullYear();
    // Le rang se prend sur le PLUS GRAND numéro déjà attribué, et non sur
    // le compte : compter suppose une numérotation sans trou, ce qu'aucune
    // série de références ne garantit. Trois avis numérotés 003, 004 et 005
    // donnaient un compte de 3, donc 004 — déjà pris.
    const prefixe = `${famille}-${annee}-`;
    const dernier = await this.prisma.appelOffres.findFirst({
      where: { reference: { startsWith: prefixe } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });
    const rang = dernier
      ? Number(dernier.reference.slice(prefixe.length)) || 0
      : 0;
    const reference = `${prefixe}${String(rang + 1).padStart(3, '0')}`;

    const publie = new Date();
    const cloture = new Date(publie.getTime() + jours * 86_400_000);

    const avis = await this.prisma.$transaction(async (tx) => {
      await tx.marche.update({
        where: { id: marcheId },
        data: { status: 'PUBLIE', plannedPublicationAt: publie },
      });
      return tx.appelOffres.create({
        data: {
          reference,
          marcheId,
          objet: corps.objet?.trim() || marche.tdr.title,
          resume: corps.resume.trim(),
          qualifications:
            corps.qualifications ??
            (marche.tdr.expertise ?? '')
              .split('\n')
              .map((l) => l.replace(/^[-–—•*]\s*/, '').trim())
              .filter((l) => l.length > 3)
              .slice(0, 4),
          publishedAt: publie,
          closingAt: cloture,
          openingNote:
            'Ouverture des plis en séance publique au siège de l’UGPTN, le jour de la clôture à 14 h 00.',
          publishedById: actor.userId,
        },
        select: {
          id: true,
          reference: true,
          publishedAt: true,
          closingAt: true,
        },
      });
    });

    await this.trace('marche.publie', marche.reference, marche.id, actor, ctx, {
      avis: avis.reference,
      ano: ano.reference,
      closingAt: avis.closingAt.toISOString(),
    });
    return avis;
  }

  private async trace(
    action: string,
    reference: string,
    entityId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
    payload: Record<string, unknown>,
  ) {
    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action,
      entityType: 'Passation',
      entityId,
      payload: { reference, ...payload },
      ...ctx,
    });
  }
}
