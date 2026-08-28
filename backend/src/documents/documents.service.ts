import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';
import type { NatureDocument } from '../../generated/prisma/enums';

/**
 * Le corpus documentaire de l'UGPTN.
 *
 * CE QUI MANQUAIT. La plateforme portait la connaissance du projet dans un
 * fichier de code — dix-huit mille caractères écrits à la main, résumant le
 * MEP, les Règlements de passation et le cadre E&S. Ce résumé tient pour les
 * faits fermés : la composante C2 vaut 55 M USD, l'ANO de la Banque mondiale
 * court sur quatorze jours. Il ne tient pas dès qu'on demande CE QUE DIT le
 * MEP sur une procédure — le modèle n'avait alors que le résumé, et comblait.
 *
 * Le MEP lui-même n'était nulle part. La seule table de documents,
 * `tdr_attachments`, lie chaque pièce à UN dossier : versée sur le TDR n°14,
 * elle n'existe pas pour le n°15.
 *
 * LE MODÈLE LIT LES PDF NATIVEMENT — vérifié, `fichier: true` au catalogue du
 * fournisseur. Aucune extraction, donc aucune déformation : la pièce part
 * telle qu'elle a été déposée.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  /**
   * Formats acceptés.
   *
   * Le PDF seul est soumis au modèle. Le reste est conservé — un document de
   * référence a sa valeur d'archive même si l'assistant ne le lit pas — mais
   * l'écran doit le dire, et ne rien promettre qui n'ait lieu.
   */
  private static readonly FORMATS: Record<
    string,
    { lisible: boolean; libelle: string }
  > = {
    'application/pdf': { lisible: true, libelle: 'PDF' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      lisible: false,
      libelle: 'document Word',
    },
    'application/msword': { lisible: false, libelle: 'document Word' },
    'text/plain': { lisible: false, libelle: 'texte brut' },
  };

  /**
   * Vingt mégaoctets.
   *
   * Un MEP fait deux à cinq mégaoctets, un CGES peut atteindre quinze. Au-delà,
   * c'est un scan d'images qu'aucune lecture ne tirera au clair, et qui
   * saturerait la fenêtre du modèle sans rien lui apprendre.
   */
  private static readonly TAILLE_MAX = 20 * 1024 * 1024;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  static estLisible(mimeType: string): boolean {
    return DocumentsService.FORMATS[mimeType]?.lisible ?? false;
  }

  /**
   * Le catalogue, sans le contenu.
   *
   * Jamais le `content` : une liste de vingt documents en base64 pèserait
   * des dizaines de mégaoctets pour afficher vingt titres.
   */
  async lister(options: { inactifs?: boolean } = {}) {
    const lignes = await this.prisma.documentReference.findMany({
      where: options.inactifs ? {} : { isActive: true },
      select: {
        id: true,
        titre: true,
        nature: true,
        resume: true,
        version: true,
        effectiveFrom: true,
        supersededAt: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        isActive: true,
        uploadedAt: true,
      },
      orderBy: [{ nature: 'asc' }, { effectiveFrom: 'desc' }],
    });

    return lignes.map((d) => ({
      ...d,
      lisibleParAssistant: DocumentsService.estLisible(d.mimeType),
      formatLisible:
        DocumentsService.FORMATS[d.mimeType]?.libelle ?? d.mimeType,
      /** En vigueur aujourd'hui : ni futur, ni remplacé. */
      enVigueur:
        d.isActive &&
        d.supersededAt === null &&
        (d.effectiveFrom === null || d.effectiveFrom <= new Date()),
    }));
  }

  /**
   * Ce que l'assistant voit du corpus, en une ligne par document.
   *
   * Il choisit sur cette liste ce qu'il consultera, et ne consulte qu'à la
   * demande : soumettre tout le corpus à chaque question coûterait, au tarif
   * du fournisseur, plusieurs dizaines de centimes par échange.
   *
   * Les documents remplacés n'y figurent pas. L'assistant citerait sinon une
   * règle abrogée avec le même aplomb que la règle en vigueur.
   */
  async catalogueAssistant(): Promise<string> {
    const docs = await this.lister();
    const utiles = docs.filter((d) => d.enVigueur && d.lisibleParAssistant);
    if (utiles.length === 0) return '';

    const lignes = utiles.map((d) => {
      const millesime = d.version ? ` (${d.version})` : '';
      const date = d.effectiveFrom
        ? ` — en vigueur depuis le ${d.effectiveFrom.toISOString().slice(0, 10)}`
        : '';
      const quoi = d.resume ? ` : ${d.resume}` : '';
      return `• ${d.titre}${millesime}${date}${quoi}`;
    });

    return [
      'DOCUMENTS DE RÉFÉRENCE DU PROJET, consultables par `lire_document_ugptn` :',
      ...lignes,
      '',
      "Ces pièces font autorité sur la procédure du projet — davantage que ce que vous croyez savoir, et davantage qu'une page trouvée sur internet. Consultez-les dès qu'une question porte sur ce que le projet PRESCRIT.",
    ].join('\n');
  }

  /** Le document entier, contenu compris — pour la lecture par le modèle. */
  async lireContenu(id: string) {
    const doc = await this.prisma.documentReference.findUnique({
      where: { id },
      select: {
        id: true,
        titre: true,
        nature: true,
        version: true,
        filename: true,
        mimeType: true,
        content: true,
        isActive: true,
        supersededAt: true,
      },
    });
    if (!doc) throw new NotFoundException('Document introuvable.');
    return doc;
  }

  /**
   * Trouve un document par son intitulé, pour l'assistant.
   *
   * Il désigne ce qu'il veut lire par le titre qu'il a vu au catalogue, non
   * par un identifiant qu'il n'a aucun moyen de connaître. La comparaison
   * est insensible à la casse et aux accents — un modèle écrit « execution »
   * là où le titre porte « exécution ».
   */
  async parIntitule(recherche: string) {
    const docs = await this.prisma.documentReference.findMany({
      where: { isActive: true, supersededAt: null },
      select: { id: true, titre: true, nature: true, mimeType: true },
    });
    const plat = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();

    const cible = plat(recherche);
    return (
      docs.find((d) => plat(d.titre) === cible) ??
      docs.find((d) => plat(d.titre).includes(cible)) ??
      docs.find((d) => cible.includes(plat(d.titre))) ??
      null
    );
  }

  /**
   * Dépose un document au corpus.
   *
   * L'empreinte refuse le doublon : déposer deux fois le même MEP en
   * donnerait deux au choix de l'assistant, qui n'aurait aucune raison de
   * préférer l'un.
   */
  async deposer(
    fichier: { originalname: string; mimetype: string; buffer: Buffer },
    dto: {
      titre: string;
      nature: NatureDocument;
      resume?: string;
      version?: string;
      effectiveFrom?: string;
    },
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    if (!DocumentsService.FORMATS[fichier.mimetype]) {
      const acceptes = Object.values(DocumentsService.FORMATS)
        .map((f) => f.libelle)
        .join(', ');
      throw new BadRequestException(
        `Format non accepté au corpus. Formats retenus : ${acceptes}.`,
      );
    }
    if (fichier.buffer.length > DocumentsService.TAILLE_MAX) {
      throw new BadRequestException(
        `Ce fichier pèse ${Math.round(fichier.buffer.length / 1024 / 1024)} Mo, au-delà des ${DocumentsService.TAILLE_MAX / 1024 / 1024} Mo admis. Un document plus lourd est un scan d'images : aucune lecture n'en tirera un texte.`,
      );
    }

    const sha256 = createHash('sha256').update(fichier.buffer).digest('hex');
    const jumeau = await this.prisma.documentReference.findFirst({
      where: { sha256, isActive: true },
      select: { titre: true },
    });
    if (jumeau) {
      throw new ConflictException(
        `Ce fichier est déjà au corpus, sous l'intitulé « ${jumeau.titre} ».`,
      );
    }

    const cree = await this.prisma.documentReference.create({
      data: {
        titre: dto.titre.trim(),
        nature: dto.nature,
        resume: dto.resume?.trim() || null,
        version: dto.version?.trim() || null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        filename: fichier.originalname,
        mimeType: fichier.mimetype,
        sizeBytes: fichier.buffer.length,
        sha256,
        // Prisma attend un Uint8Array adossé à un ArrayBuffer ; le Buffer
        // de multer peut l'être à une mémoire partagée. La copie lève
        // l'ambiguïté sans changer les octets.
        content: new Uint8Array(fichier.buffer),
        uploadedById: actor.userId,
      },
      select: { id: true, titre: true, nature: true, mimeType: true },
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'referentiel.document_depose',
      entityType: 'DocumentReference',
      entityId: cree.id,
      payload: {
        titre: cree.titre,
        nature: cree.nature,
        octets: fichier.buffer.length,
      },
      ...ctx,
    });

    return {
      ...cree,
      lisibleParAssistant: DocumentsService.estLisible(cree.mimeType),
    };
  }

  /**
   * Retire un document du corpus — sans l'effacer.
   *
   * Ce que l'assistant a cité un jour doit rester retrouvable : un TDR rédigé
   * en s'appuyant sur une version du plan de passation se relit des années
   * plus tard, et « le document a été supprimé » n'est pas une réponse
   * acceptable devant un auditeur.
   */
  async retirer(id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const doc = await this.prisma.documentReference.findUnique({
      where: { id },
      select: { id: true, titre: true, isActive: true },
    });
    if (!doc) throw new NotFoundException('Document introuvable.');
    if (!doc.isActive) {
      throw new ConflictException(
        `« ${doc.titre} » est déjà retiré du corpus.`,
      );
    }

    await this.prisma.documentReference.update({
      where: { id },
      data: { isActive: false, supersededAt: new Date() },
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'referentiel.document_retire',
      entityType: 'DocumentReference',
      entityId: id,
      payload: { titre: doc.titre },
      ...ctx,
    });

    return { id, titre: doc.titre, retire: true };
  }

}
