import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

/** Ce que voit le rédacteur : tout sauf les octets. */
export interface PieceResume {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
  /** L'assistant sait-il lire cette pièce, ou la garde-t-on pour l'archive ? */
  lisibleParAssistant: boolean;
}

/**
 * Les pièces apportées au dossier.
 *
 * Un rédacteur arrive rarement d'une page blanche : il a le TDR de l'an
 * dernier, le modèle du bailleur, une note de cadrage. Ces pièces valent
 * comme MODÈLE DE FORME — structure, ton, niveau de détail — et jamais
 * comme source de fait. Un montant, une date ou une institution lus dans
 * une pièce se rapportent à une autre opération ; les recopier
 * fabriquerait un TDR qui décrit un marché qui n'existe pas.
 *
 * Cette règle n'est pas une consigne d'usage : elle est appliquée dans le
 * message que reçoit le modèle, et les valeurs continuent de passer par la
 * validation du registre des champs.
 */
@Injectable()
export class TdrAttachmentService {
  /**
   * Plafond par pièce.
   *
   * Les octets vivent dans la base : le dossier doit se reconstituer entier
   * depuis une sauvegarde, ce qu'un chemin de fichier ne garantit pas. Le
   * plafond est ce qui rend ce choix soutenable — un TDR modèle pèse
   * quelques centaines de kilo-octets, pas dix méga.
   */
  static readonly TAILLE_MAX = 10 * 1024 * 1024;

  /** Nombre de pièces par dossier : au-delà, ce n'est plus un modèle. */
  static readonly PIECES_MAX = 10;

  /**
   * Formats acceptés.
   *
   * Le PDF et les images se lisent nativement par le modèle. Le DOCX et le
   * texte sont acceptés à l'archive mais ne lui sont pas soumis : ils
   * demanderaient une extraction qui déforme, et un rédacteur qui veut
   * faire lire un modèle Word l'exporte en PDF sans difficulté.
   */
  private static readonly FORMATS: Record<
    string,
    { lisible: boolean; libelle: string }
  > = {
    'application/pdf': { lisible: true, libelle: 'PDF' },
    'image/png': { lisible: true, libelle: 'image PNG' },
    'image/jpeg': { lisible: true, libelle: 'image JPEG' },
    'image/webp': { lisible: true, libelle: 'image WebP' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      lisible: false,
      libelle: 'document Word',
    },
    'text/plain': { lisible: false, libelle: 'texte brut' },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  static estLisible(mimeType: string): boolean {
    return TdrAttachmentService.FORMATS[mimeType]?.lisible ?? false;
  }

  /**
   * Le dossier existe et relève de l'appelant.
   *
   * `pourEcrire` distingue la consultation du versement : on télécharge la
   * pièce d'un TDR transmis, on n'en ajoute plus.
   */
  private async garantirAcces(
    tdrId: string,
    actor: AuthenticatedUser,
    pourEcrire: boolean,
  ) {
    const tdr = await this.prisma.tdr.findUnique({
      where: { id: tdrId },
      select: {
        id: true,
        reference: true,
        status: true,
        organisationId: true,
        authorId: true,
      },
    });
    if (!tdr) throw new NotFoundException('TDR introuvable.');

    const privilegie =
      actor.permissions.includes('tdr:review') ||
      actor.permissions.includes('ano:decide');
    if (!privilegie && tdr.organisationId !== actor.organisationId) {
      throw new ForbiddenException(
        'Ce TDR ne relève pas de votre organisation.',
      );
    }

    if (pourEcrire && tdr.status !== 'BROUILLON' && tdr.status !== 'RETOURNE') {
      throw new BadRequestException(
        `${tdr.reference} n’est plus en rédaction : les pièces d’un dossier transmis ne se modifient plus.`,
      );
    }
    return tdr;
  }

  async lister(
    tdrId: string,
    actor: AuthenticatedUser,
  ): Promise<PieceResume[]> {
    await this.garantirAcces(tdrId, actor, false);
    const pieces = await this.prisma.tdrAttachment.findMany({
      where: { tdrId },
      // Les octets restent en base : une liste ne doit pas rapatrier
      // dix méga pour afficher dix noms de fichier.
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: 'asc' },
    });
    return pieces.map((p) => ({
      ...p,
      lisibleParAssistant: TdrAttachmentService.estLisible(p.mimeType),
    }));
  }

  async verser(
    tdrId: string,
    fichier: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PieceResume> {
    const tdr = await this.garantirAcces(tdrId, actor, true);

    const format = TdrAttachmentService.FORMATS[fichier.mimetype];
    if (!format) {
      const acceptes = Object.values(TdrAttachmentService.FORMATS)
        .map((f) => f.libelle)
        .join(', ');
      throw new UnsupportedMediaTypeException(
        `Format non accepté. Formats reconnus : ${acceptes}.`,
      );
    }
    if (fichier.size > TdrAttachmentService.TAILLE_MAX) {
      throw new PayloadTooLargeException(
        `La pièce dépasse ${Math.round(TdrAttachmentService.TAILLE_MAX / 1024 / 1024)} Mo.`,
      );
    }

    const compte = await this.prisma.tdrAttachment.count({ where: { tdrId } });
    if (compte >= TdrAttachmentService.PIECES_MAX) {
      throw new BadRequestException(
        `${TdrAttachmentService.PIECES_MAX} pièces au maximum : au-delà, ce n’est plus un modèle mais une documentation.`,
      );
    }

    const sha256 = createHash('sha256').update(fichier.buffer).digest('hex');

    // Le même fichier versé deux fois est presque toujours un double-clic,
    // pas une intention. On rend la pièce déjà présente.
    const existante = await this.prisma.tdrAttachment.findFirst({
      where: { tdrId, sha256 },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
      },
    });
    if (existante) {
      return { ...existante, lisibleParAssistant: format.lisible };
    }

    const piece = await this.prisma.tdrAttachment.create({
      data: {
        tdrId,
        // Le nom vient du poste du rédacteur : il peut porter un chemin,
        // et il finira dans un en-tête HTTP au téléchargement.
        filename: TdrAttachmentService.nomSur(fichier.originalname),
        mimeType: fichier.mimetype,
        sizeBytes: fichier.size,
        sha256,
        // Prisma attend un Uint8Array adossé à un ArrayBuffer ; le Buffer
        // de multer peut l'être à une mémoire partagée. La copie lève
        // l'ambiguïté sans changer les octets.
        content: new Uint8Array(fichier.buffer),
        uploadedById: actor.userId,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
      },
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'tdr.attachment.added',
      entityType: 'Tdr',
      entityId: tdrId,
      payload: {
        reference: tdr.reference,
        filename: piece.filename,
        mimeType: piece.mimeType,
        sizeBytes: piece.sizeBytes,
        sha256,
      },
      ...ctx,
    });

    return { ...piece, lisibleParAssistant: format.lisible };
  }

  /** Le contenu, pour le téléchargement et pour la lecture par l'assistant. */
  async contenu(tdrId: string, pieceId: string, actor: AuthenticatedUser) {
    await this.garantirAcces(tdrId, actor, false);
    const piece = await this.prisma.tdrAttachment.findFirst({
      where: { id: pieceId, tdrId },
    });
    if (!piece) throw new NotFoundException('Pièce introuvable.');
    return piece;
  }

  async supprimer(
    tdrId: string,
    pieceId: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ id: string }> {
    const tdr = await this.garantirAcces(tdrId, actor, true);
    const piece = await this.prisma.tdrAttachment.findFirst({
      where: { id: pieceId, tdrId },
      select: { id: true, filename: true, sha256: true },
    });
    if (!piece) throw new NotFoundException('Pièce introuvable.');

    await this.prisma.tdrAttachment.delete({ where: { id: pieceId } });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'tdr.attachment.removed',
      entityType: 'Tdr',
      entityId: tdrId,
      payload: {
        reference: tdr.reference,
        filename: piece.filename,
        sha256: piece.sha256,
      },
      ...ctx,
    });

    return { id: pieceId };
  }

  /**
   * Un nom de fichier sûr.
   *
   * Le navigateur envoie ce que porte le poste du rédacteur — parfois un
   * chemin entier, parfois des guillemets qui casseraient l'en-tête
   * `Content-Disposition` au téléchargement.
   */
  private static nomSur(brut: string): string {
    const base = brut.split(/[\\/]/).pop() ?? 'piece';
    // Guillemets et caractères de contrôle seulement : les espaces et les
    // accents font partie du nom que le rédacteur reconnaîtra.
    const propre = Array.from(base)
      .filter((c) => c !== '"' && c.charCodeAt(0) >= 32)
      .join('')
      .trim();
    return (propre || 'piece').slice(0, 180);
  }
}
