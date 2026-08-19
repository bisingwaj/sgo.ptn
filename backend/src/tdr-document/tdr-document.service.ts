import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  composerPlan,
  EN_TETE_INSTITUTIONNEL,
  PROJET,
  type PlanDocument,
  type Section,
} from './document-plan';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

/**
 * Fabrique du document de termes de référence.
 *
 * Le document est COMPOSÉ, jamais rédigé : chaque valeur vient du dossier
 * saisi par l'auteur, mot pour mot. Aucun modèle n'est appelé ici, et c'est
 * délibéré — l'auteur signe son attestation de conformité sur le texte
 * qu'il a écrit, et une réécriture postérieure porterait sur un texte qu'il
 * n'aurait pas relu.
 *
 * Deux formats, un seul plan. Le PDF est la pièce à transmettre ; le DOCX
 * sert quand l'UGP doit annoter.
 */
@Injectable()
export class TdrDocumentService {
  /** Bleu institutionnel de la plateforme. */
  private static readonly ACCENT = '#0f62fe';
  private static readonly ENCRE = '#161616';
  private static readonly GRIS = '#6f6f6f';
  private static readonly FILET = '#c6c6c6';

  /**
   * Géométrie de la page, en points PostScript. A4 vaut 595,28 × 841,89.
   *
   * La marge de gauche est plus large que celle de droite : ces dossiers se
   * perforent et se classent, et une reliure mange le bord intérieur. C'est
   * la raison d'être de l'écart, non un effet d'optique.
   */
  private static readonly PAGE = {
    largeur: 595.28,
    hauteur: 841.89,
    gauche: 70,
    droite: 62,
    haut: 64,
    bas: 78,
  };

  private static get COLONNE(): number {
    const { largeur, gauche, droite } = TdrDocumentService.PAGE;
    return largeur - gauche - droite;
  }

  /** Dernière ordonnée où l'on peut encore écrire. */
  private static get BAS_UTILE(): number {
    return TdrDocumentService.PAGE.hauteur - TdrDocumentService.PAGE.bas;
  }

  /**
   * Rompt la page si `hauteur` ne tient pas sous le point courant.
   *
   * Indispensable dès qu'un bloc se DESSINE avant d'être écrit : la puce
   * d'une liste était posée au trait, puis son texte débordait sur le
   * feuillet suivant — la puce restait seule en bas de page et l'entrée
   * commençait sans elle. Laisser pdfkit rompre tout seul ne suffit pas,
   * puisqu'il ignore ce qu'on a déjà tracé.
   */
  private static placer(doc: PDFKit.PDFDocument, hauteur: number): void {
    if (doc.y + hauteur > TdrDocumentService.BAS_UTILE) doc.addPage();
  }

  /**
   * Les deux voix du document.
   *
   * IBM Plex Sans porte la STRUCTURE — titres, intitulés, chiffres, tout ce
   * qui se repère sans se lire. IBM Plex Serif porte la PROSE : sur une page
   * imprimée, une empattée se suit mieux à travers un paragraphe justifié,
   * et c'est ce qui distingue un document d'une capture d'écran.
   *
   * Les fichiers sont versionnés dans `backend/assets/fonts` : le paquet npm
   * `@ibm/plex` ne livre que du woff2, que pdfkit ne sait pas lire.
   */
  private static readonly POLICES: Record<string, string> = {
    sans: 'IBMPlexSans-Regular.ttf',
    sansSemi: 'IBMPlexSans-SemiBold.ttf',
    sansGras: 'IBMPlexSans-Bold.ttf',
    serif: 'IBMPlexSerif-Regular.ttf',
    serifItalique: 'IBMPlexSerif-Italic.ttf',
    serifSemi: 'IBMPlexSerif-SemiBold.ttf',
    mono: 'IBMPlexMono-Regular.ttf',
  };

  /**
   * Branche les polices de marque sur le document.
   *
   * Renvoie `false` si les fichiers manquent — le document se compose alors
   * avec les polices intégrées de pdfkit, comme il se composait sans logo :
   * un TDR moins beau reste un TDR, un TDR qui ne se génère pas n'est rien.
   */
  private static polices(doc: PDFKit.PDFDocument): boolean {
    const racine = TdrDocumentService.dossierPolices();
    if (!racine) return false;
    for (const [nom, fichier] of Object.entries(TdrDocumentService.POLICES)) {
      doc.registerFont(nom, join(racine, fichier));
    }
    return true;
  }

  private static dossierPolices(): string | null {
    for (const chemin of [
      join(process.cwd(), 'assets', 'fonts'),
      join(process.cwd(), 'backend', 'assets', 'fonts'),
      join(__dirname, '..', '..', 'assets', 'fonts'),
    ]) {
      if (existsSync(join(chemin, TdrDocumentService.POLICES.serif)))
        return chemin;
    }
    return null;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Le logo, cherché dans le dossier public du frontend.
   *
   * Absent en production si les deux applications sont déployées
   * séparément : le document se compose alors sans lui plutôt que
   * d'échouer. Un TDR sans logo reste un TDR ; un TDR qui ne se génère pas
   * n'est rien.
   */
  private static logo(): Buffer | null {
    for (const chemin of [
      join(process.cwd(), '..', 'public', 'brand', 'ugptn-logo.png'),
      join(process.cwd(), 'public', 'brand', 'ugptn-logo.png'),
      join(process.cwd(), 'assets', 'ugptn-logo.png'),
    ]) {
      if (existsSync(chemin)) return readFileSync(chemin);
    }
    return null;
  }

  private async charger(id: string, actor: AuthenticatedUser) {
    const tdr = await this.prisma.tdr.findUnique({
      where: { id },
      include: {
        tdrType: true,
        ptbaActivity: { include: { component: true } },
        organisation: true,
        beneficiaryOrganisation: true,
        provinces: { include: { province: true } },
        // Le document porte son auteur et annonce ses pièces : ni l'un ni
        // l'autre n'étaient chargés, et le composeur ne pouvait donc pas les
        // rendre.
        author: { select: { firstName: true, lastName: true } },
        attachments: {
          select: { filename: true },
          orderBy: { uploadedAt: 'asc' },
        },
        objectives: { orderBy: { position: 'asc' } },
        deliverables: { orderBy: { position: 'asc' } },
        clauses: { orderBy: { position: 'asc' } },
        indicators: { orderBy: { position: 'asc' } },
        risks: { orderBy: { position: 'asc' } },
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
    return tdr;
  }

  async plan(id: string, actor: AuthenticatedUser): Promise<PlanDocument> {
    const tdr = await this.charger(id, actor);
    return composerPlan(tdr);
  }

  // ============================================================
  // PDF
  // ============================================================

  async pdf(
    id: string,
    actor: AuthenticatedUser,
    ctx?: RequestContext,
  ): Promise<Buffer> {
    const plan = await this.plan(id, actor);

    if (ctx) {
      await this.audit.record({
        actorId: actor.userId,
        actorEmail: actor.email,
        action: 'tdr.document_generated',
        entityType: 'Tdr',
        entityId: id,
        payload: { format: 'pdf', reference: plan.reference },
        ...ctx,
      });
    }

    return this.composerPdf(plan);
  }

  /**
   * La composition seule, sans base ni journal.
   *
   * Séparée de `pdf()` à dessein : une mise en page se juge en la regardant,
   * et l'ouvrir depuis un dossier réel demanderait une base, une session et
   * un serveur chaud. Ici un plan suffit.
   */
  composerPdf(plan: PlanDocument): Promise<Buffer> {
    const P = TdrDocumentService.PAGE;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: P.haut,
          bottom: P.bas,
          left: P.gauche,
          right: P.droite,
        },
        info: {
          Title: `${plan.reference} — ${plan.titre}`,
          Author: plan.auteur?.nom ?? plan.organisation,
          Subject: `Termes de référence — ${PROJET.sigle} (${PROJET.code})`,
          Creator: 'SGO/PTN-RDC',
          Keywords: `${plan.typeCode}, termes de référence, ${plan.reference}`,
        },
        // La numérotation est posée à la fin, sur chaque page : sans cela,
        // pdfkit tamponnerait le pied avant de savoir combien de pages
        // existent. C'est aussi ce qui permet de revenir écrire le sommaire
        // une fois les pages du corps connues.
        bufferPages: true,
      });

      const morceaux: Buffer[] = [];
      doc.on('data', (m: Buffer) => morceaux.push(m));
      doc.on('end', () => resolve(Buffer.concat(morceaux)));
      doc.on('error', reject);

      const f = TdrDocumentService.plume(TdrDocumentService.polices(doc));

      this.pageDeGarde(doc, plan, f);

      // Le sommaire est réservé maintenant et rempli à la fin : ses numéros
      // de page n'existent qu'une fois le corps composé. Réserver la page
      // plutôt que l'insérer après coup évite de décaler tout le document.
      doc.addPage();
      const pageSommaire = doc.bufferedPageRange().count - 1;

      const positions = this.corps(doc, plan, f);
      this.pagesDeFin(doc, plan, f);

      doc.switchToPage(pageSommaire);
      this.sommaire(doc, plan, f, positions);

      this.entetesEtPieds(doc, plan, f, pageSommaire);

      doc.end();
    });
  }

  /**
   * Les noms de police effectivement utilisables.
   *
   * Quand les fichiers de marque manquent, on retombe sur les polices
   * intégrées de pdfkit — en gardant la même distinction structure/prose,
   * puisque c'est elle qui porte la lisibilité, non la fonderie.
   */
  private static plume(avecPlex: boolean): Record<string, string> {
    if (avecPlex) {
      return {
        sans: 'sans',
        sansSemi: 'sansSemi',
        sansGras: 'sansGras',
        serif: 'serif',
        serifItalique: 'serifItalique',
        serifSemi: 'serifSemi',
        mono: 'mono',
      };
    }
    return {
      sans: 'Helvetica',
      sansSemi: 'Helvetica-Bold',
      sansGras: 'Helvetica-Bold',
      serif: 'Times-Roman',
      serifItalique: 'Times-Italic',
      serifSemi: 'Times-Bold',
      mono: 'Courier',
    };
  }

  /**
   * La page de garde.
   *
   * Elle occupe une page ENTIÈRE, et c'est le point. L'ancienne version
   * tassait l'identification en haut d'un feuillet puis appelait `addPage()`
   * — ce qui donnait une demi-page, pas une couverture.
   *
   * L'ordonnance suit celle des pièces publiques congolaises : la puissance
   * émettrice d'abord (État, ministère de tutelle, unité), le programme
   * ensuite, la nature de l'acte, son objet, puis les mentions
   * d'identification. On lit de haut en bas du plus général au plus
   * particulier, et c'est ce qui permet de classer sans ouvrir.
   */
  private pageDeGarde(
    doc: PDFKit.PDFDocument,
    plan: PlanDocument,
    f: Record<string, string>,
  ): void {
    const P = TdrDocumentService.PAGE;
    const col = TdrDocumentService.COLONNE;
    const centre = P.gauche + col / 2;

    // Bandeau d'accent en tête de couverture : il n'a pas de sens à lui
    // seul, il donne le bord. Sans lui la page flotte.
    doc.rect(0, 0, P.largeur, 6).fill(TdrDocumentService.ACCENT);

    const logo = TdrDocumentService.logo();
    if (logo) {
      // Centré : sur une couverture, un logo aligné à gauche déséquilibre un
      // bloc institutionnel qui, lui, est centré.
      doc.image(logo, centre - 60, 58, { fit: [120, 52], align: 'center' });
    }

    let y = logo ? 132 : 84;

    doc.font(f.sansSemi).fontSize(10.5).fillColor(TdrDocumentService.ENCRE);
    doc.text(EN_TETE_INSTITUTIONNEL[0], P.gauche, y, {
      width: col,
      align: 'center',
      characterSpacing: 0.8,
    });

    y = doc.y + 6;
    doc.font(f.sans).fontSize(9.5).fillColor(TdrDocumentService.GRIS);
    for (const ligne of EN_TETE_INSTITUTIONNEL.slice(1)) {
      doc.text(ligne, P.gauche, y, { width: col, align: 'center' });
      y = doc.y + 2;
    }

    // Filet court et centré — une séparation, pas une barre.
    y += 16;
    doc
      .moveTo(centre - 40, y)
      .lineTo(centre + 40, y)
      .strokeColor(TdrDocumentService.FILET)
      .lineWidth(0.75)
      .stroke();

    // Le programme sous lequel la pièce est émise.
    y += 22;
    doc.font(f.sans).fontSize(9).fillColor(TdrDocumentService.GRIS);
    doc.text(PROJET.intitule, P.gauche, y, { width: col, align: 'center' });
    y = doc.y + 4;
    doc.font(f.mono).fontSize(9).fillColor(TdrDocumentService.ACCENT);
    doc.text(`${PROJET.sigle} · ${PROJET.code}`, P.gauche, y, {
      width: col,
      align: 'center',
    });

    // La nature de l'acte, puis son objet. C'est le cœur de la couverture :
    // on lui laisse l'espace qu'on a repris au reste.
    y = 356;
    doc.font(f.sansSemi).fontSize(11).fillColor(TdrDocumentService.ACCENT);
    doc.text('TERMES DE RÉFÉRENCE', P.gauche, y, {
      width: col,
      align: 'center',
      characterSpacing: 2.6,
    });

    y = doc.y + 20;
    doc.font(f.sansGras).fontSize(21).fillColor(TdrDocumentService.ENCRE);
    doc.text(plan.titre, P.gauche, y, {
      width: col,
      align: 'center',
      lineGap: 5,
    });

    y = doc.y + 18;
    doc.font(f.sans).fontSize(10).fillColor(TdrDocumentService.GRIS);
    doc.text(`${plan.typeCode} — ${plan.typeNom}`, P.gauche, y, {
      width: col,
      align: 'center',
    });

    // Le cartouche d'identification, en bas de couverture. Encadré parce
    // qu'il se consulte sans se lire : on y vient chercher une référence.
    //
    // Les hauteurs se mesurent avant de tracer le cadre : « Maîtrise
    // d'ouvrage bénéficiaire » se replie sur deux lignes, et une hauteur
    // supposée constante faisait sortir la dernière ligne du cadre.
    const largeurCle = 138;
    const xValeur = P.gauche + 14 + largeurCle;
    const largeurValeur = col - 28 - largeurCle;

    const lignes = plan.entete.map(({ cle, valeur }) => {
      doc.font(f.sans).fontSize(7.5);
      const hCle = doc.heightOfString(cle.toUpperCase(), {
        width: largeurCle - 10,
        characterSpacing: 0.5,
      });
      doc.font(f.sans).fontSize(9);
      const hValeur = doc.heightOfString(valeur, { width: largeurValeur });
      return { cle, valeur, hauteur: Math.max(hCle, hValeur) + 8 };
    });

    const hauteurCartouche = 14 + lignes.reduce((t, l) => t + l.hauteur, 0);
    const yCartouche = P.hauteur - P.bas - hauteurCartouche - 46;

    doc
      .rect(P.gauche, yCartouche, col, hauteurCartouche)
      .strokeColor(TdrDocumentService.FILET)
      .lineWidth(0.75)
      .stroke();

    let yl = yCartouche + 9;
    for (const { cle, valeur, hauteur } of lignes) {
      doc.font(f.sans).fontSize(7.5).fillColor(TdrDocumentService.GRIS);
      doc.text(cle.toUpperCase(), P.gauche + 14, yl + 1.5, {
        width: largeurCle - 10,
        characterSpacing: 0.5,
      });
      doc.font(f.sans).fontSize(9).fillColor(TdrDocumentService.ENCRE);
      doc.text(valeur, xValeur, yl, { width: largeurValeur });
      yl += hauteur;
    }

    // Pied de couverture : la date de composition et le statut. Le statut
    // figure ici parce qu'un brouillon imprimé doit se reconnaître comme
    // tel, sans qu'on ait à l'ouvrir.
    const yPied = P.hauteur - P.bas - 26;
    doc
      .moveTo(P.gauche, yPied - 12)
      .lineTo(P.largeur - P.droite, yPied - 12)
      .strokeColor(TdrDocumentService.FILET)
      .lineWidth(0.75)
      .stroke();

    doc.font(f.sans).fontSize(8.5).fillColor(TdrDocumentService.GRIS);
    doc.text(`Document composé le ${plan.dateComposition}`, P.gauche, yPied, {
      width: col / 2,
      lineBreak: false,
    });
    doc.font(f.sansSemi).fontSize(8.5).fillColor(TdrDocumentService.ENCRE);
    doc.text(plan.statut, P.gauche + col / 2, yPied, {
      width: col / 2,
      align: 'right',
      lineBreak: false,
    });
  }

  /**
   * Le sommaire, écrit après coup sur une page réservée d'avance.
   *
   * Douze sections sans table oblige à feuilleter pour trouver le budget ou
   * les sauvegardes — ce que fait précisément un relecteur pressé.
   */
  private sommaire(
    doc: PDFKit.PDFDocument,
    plan: PlanDocument,
    f: Record<string, string>,
    positions: Map<string, number>,
  ): void {
    const P = TdrDocumentService.PAGE;
    const col = TdrDocumentService.COLONNE;

    doc.font(f.sansSemi).fontSize(15).fillColor(TdrDocumentService.ENCRE);
    doc.text('Sommaire', P.gauche, P.haut, { width: col });

    let y = doc.y + 6;
    doc
      .moveTo(P.gauche, y)
      .lineTo(P.largeur - P.droite, y)
      .strokeColor(TdrDocumentService.ACCENT)
      .lineWidth(1.5)
      .stroke();

    y += 20;
    for (const section of plan.sections) {
      const page = positions.get(section.numero);

      doc.font(f.mono).fontSize(9).fillColor(TdrDocumentService.ACCENT);
      doc.text(section.numero.padStart(2, '0'), P.gauche, y, {
        width: 24,
        lineBreak: false,
      });

      doc.font(f.sans).fontSize(10).fillColor(TdrDocumentService.ENCRE);
      const largeurTitre = col - 24 - 34;
      doc.text(section.titre, P.gauche + 24, y, {
        width: largeurTitre,
        lineBreak: false,
      });

      // Points de conduite : l'œil suit la ligne jusqu'au numéro sans se
      // perdre entre deux entrées.
      const finTitre = P.gauche + 24 + doc.widthOfString(section.titre) + 6;
      const debutNum = P.largeur - P.droite - 30;
      if (debutNum > finTitre) {
        doc.font(f.sans).fontSize(9).fillColor(TdrDocumentService.FILET);
        const pas = doc.widthOfString(' .');
        const points = Math.max(0, Math.floor((debutNum - finTitre) / pas));
        doc.text(' .'.repeat(points), finTitre, y + 0.5, { lineBreak: false });
      }

      if (page !== undefined) {
        doc.font(f.mono).fontSize(9).fillColor(TdrDocumentService.GRIS);
        doc.text(String(page), P.largeur - P.droite - 30, y, {
          width: 30,
          align: 'right',
          lineBreak: false,
        });
      }

      y += 21;
    }
  }

  /**
   * Le corps, et le relevé des pages où chaque section commence.
   *
   * Ce relevé est ce qui rend le sommaire possible : il se constitue en
   * composant, puisqu'une section ne sait sur quelle page elle tombe
   * qu'une fois la précédente écrite.
   */
  private corps(
    doc: PDFKit.PDFDocument,
    plan: PlanDocument,
    f: Record<string, string>,
  ): Map<string, number> {
    const P = TdrDocumentService.PAGE;
    const positions = new Map<string, number>();
    const premiere = doc.bufferedPageRange().count;

    doc.addPage();

    for (const [i, section] of plan.sections.entries()) {
      // Les sections s'enchaînent. Une page par section produisait un
      // document dont la moitié était blanche — on ne rompt que si le titre
      // n'a pas la place d'être suivi d'un début de texte.
      const reste = P.hauteur - P.bas - doc.y;
      if (i > 0 && reste < 150) doc.addPage();
      else if (i > 0) doc.moveDown(1.6);

      // Numéro de page tel que le lecteur le voit : la couverture porte le
      // numéro 1, et le pied de page compte de même.
      positions.set(section.numero, doc.bufferedPageRange().count);
      this.section(doc, section, f);
    }

    void premiere;
    return positions;
  }

  private section(
    doc: PDFKit.PDFDocument,
    section: Section,
    f: Record<string, string>,
  ): void {
    const P = TdrDocumentService.PAGE;
    const col = TdrDocumentService.COLONNE;

    // Le numéro dans la marge, le titre dans la colonne : la numérotation se
    // repère en descendant le bord de page, sans être lue.
    const yTitre = doc.y;
    doc.font(f.mono).fontSize(9).fillColor(TdrDocumentService.ACCENT);
    doc.text(section.numero.padStart(2, '0'), P.gauche, yTitre + 4, {
      width: 26,
      lineBreak: false,
    });

    doc.font(f.sansSemi).fontSize(14).fillColor(TdrDocumentService.ENCRE);
    doc.text(section.titre, P.gauche + 26, yTitre, { width: col - 26 });

    doc.moveDown(0.35);
    const y = doc.y;
    doc
      .moveTo(P.gauche, y)
      .lineTo(P.largeur - P.droite, y)
      .strokeColor(TdrDocumentService.ACCENT)
      .lineWidth(1.2)
      .stroke();
    doc.moveDown(0.9);

    // La colonne de texte est retraite de la largeur du numéro : le corps
    // s'aligne sur le titre, non sur le bord de page.
    const x = P.gauche + 26;
    const largeur = col - 26;

    for (const bloc of section.blocs) {
      switch (bloc.genre) {
        case 'sousTitre':
          // Une partie nommée DANS la section. Sans elle, trois champs
          // rédigés séparément se lisaient comme un seul bloc.
          doc.moveDown(0.5);
          // Un intitulé seul en bas de page renvoie sa matière au feuillet
          // suivant : on exige de quoi le suivre de deux lignes.
          TdrDocumentService.placer(doc, 58);
          doc
            .font(f.sansSemi)
            .fontSize(9.5)
            .fillColor(TdrDocumentService.ACCENT);
          doc.text(bloc.texte.toUpperCase(), x, doc.y, {
            width: largeur,
            characterSpacing: 0.9,
          });
          doc.moveDown(0.45);
          break;

        case 'paragraphe':
          doc.font(f.serif).fontSize(10.5).fillColor(TdrDocumentService.ENCRE);
          doc.text(bloc.texte, x, doc.y, {
            width: largeur,
            align: 'justify',
            lineGap: 3.2,
            paragraphGap: 4,
          });
          doc.moveDown(0.75);
          break;

        case 'liste':
          for (const entree of bloc.entrees) {
            doc
              .font(f.serif)
              .fontSize(10.5)
              .fillColor(TdrDocumentService.ENCRE);
            // Mesurer avant de tracer : la puce se dessine, et une puce
            // tracée avant une rupture de page reste seule en bas du
            // feuillet précédent.
            TdrDocumentService.placer(
              doc,
              doc.heightOfString(entree, { width: largeur - 14, lineGap: 2.4 }),
            );

            const yl = doc.y;
            // Puce dessinée, non écrite : un caractère de puce dépend de la
            // fonte et se décale d'une police à l'autre.
            doc
              .circle(x + 3.5, yl + 5.4, 1.5)
              .fillColor(TdrDocumentService.ACCENT)
              .fill();
            doc
              .font(f.serif)
              .fontSize(10.5)
              .fillColor(TdrDocumentService.ENCRE);
            doc.text(entree, x + 14, yl, { width: largeur - 14, lineGap: 2.4 });
            doc.moveDown(0.42);
          }
          doc.moveDown(0.4);
          break;

        case 'definitions': {
          // Deux colonnes : l'intitulé se lit en descendant, la valeur se
          // lit en regard. Un filet léger sépare les lignes.
          const largeurCle = 168;
          for (const ligne of bloc.lignes) {
            doc.font(f.sans).fontSize(8.5);
            const hCle = doc.heightOfString(ligne.cle.toUpperCase(), {
              width: largeurCle - 12,
              characterSpacing: 0.4,
            });
            doc.font(f.serif).fontSize(10.5);
            const hValeur = doc.heightOfString(ligne.valeur, {
              width: largeur - largeurCle,
              lineGap: 2,
            });
            // Le filet se trace sous la ligne : la mesurer d'abord évite de
            // le poser sur une page dont le texte est parti.
            TdrDocumentService.placer(doc, Math.max(hCle, hValeur) + 7);

            const yl = doc.y;
            doc.font(f.sans).fontSize(8.5).fillColor(TdrDocumentService.GRIS);
            doc.text(ligne.cle.toUpperCase(), x, yl + 1.5, {
              width: largeurCle - 12,
              characterSpacing: 0.4,
            });
            const basCle = doc.y;

            doc
              .font(f.serif)
              .fontSize(10.5)
              .fillColor(TdrDocumentService.ENCRE);
            doc.text(ligne.valeur, x + largeurCle, yl, {
              width: largeur - largeurCle,
              lineGap: 2,
            });

            doc.y = Math.max(basCle, doc.y) + 5;
            doc
              .moveTo(x, doc.y - 2.5)
              .lineTo(P.largeur - P.droite, doc.y - 2.5)
              .strokeColor('#e8e8e8')
              .lineWidth(0.5)
              .stroke();
          }
          doc.moveDown(0.6);
          break;
        }

        case 'absent':
          // Le vide se dit. Un relecteur doit voir ce qui manque, non
          // découvrir une section muette.
          doc
            .font(f.serifItalique)
            .fontSize(10)
            .fillColor(TdrDocumentService.GRIS);
          TdrDocumentService.placer(
            doc,
            doc.heightOfString(bloc.mention, { width: largeur }),
          );
          doc.text(bloc.mention, x, doc.y, { width: largeur });
          doc.moveDown(0.75);
          break;
      }
    }
  }

  /**
   * Ce qui ferme le document : les engagements de l'auteur, ses annexes, et
   * la déclaration d'assistance.
   *
   * Ces trois blocs existaient dans le dossier sans jamais atteindre la
   * pièce. Les attestations en particulier sont horodatées par le serveur —
   * c'est la seule marque du dossier qu'on ne puisse pas antidater.
   */
  private pagesDeFin(
    doc: PDFKit.PDFDocument,
    plan: PlanDocument,
    f: Record<string, string>,
  ): void {
    const P = TdrDocumentService.PAGE;
    const col = TdrDocumentService.COLONNE;

    // Le bloc de clôture se place d'un seul tenant.
    //
    // Rompre au fil de l'eau laissait « Établi par » seul sur un feuillet
    // supplémentaire : une page entière pour trois lignes. On mesure donc le
    // groupe avant de l'entamer, et on ouvre la page une fois pour toutes.
    const hauteurGroupe =
      58 +
      22 +
      plan.attestations.length * 46 +
      26 +
      (plan.annexes.length === 0 ? 20 : plan.annexes.length * 18) +
      (plan.champsAssistes.length > 0 ? 74 : 0) +
      (plan.auteur ? 62 : 0);

    const reste = P.hauteur - P.bas - doc.y;
    if (reste < Math.min(hauteurGroupe, P.hauteur - P.haut - P.bas))
      doc.addPage();
    else doc.moveDown(2.2);

    doc.font(f.sansSemi).fontSize(14).fillColor(TdrDocumentService.ENCRE);
    // Aligné sur les titres numérotés : la partie n'a pas de numéro, ce
    // n'est pas une raison pour qu'elle sorte de la colonne.
    doc.text('Engagements et pièces jointes', P.gauche + 26, doc.y, {
      width: col - 26,
    });
    doc.moveDown(0.35);
    let y = doc.y;
    doc
      .moveTo(P.gauche, y)
      .lineTo(P.largeur - P.droite, y)
      .strokeColor(TdrDocumentService.ACCENT)
      .lineWidth(1.2)
      .stroke();
    doc.moveDown(1);

    const x = P.gauche + 26;
    const largeur = col - 26;

    doc.font(f.sansSemi).fontSize(9.5).fillColor(TdrDocumentService.ACCENT);
    doc.text('ATTESTATIONS PORTÉES PAR L’AUTEUR', x, doc.y, {
      width: largeur,
      characterSpacing: 0.9,
    });
    doc.moveDown(0.55);

    for (const attestation of plan.attestations) {
      const yl = doc.y;
      // La coche n'est dessinée que si l'attestation a été portée : une case
      // cochée d'avance vaudrait signature de quelque chose qui n'a pas eu
      // lieu.
      doc
        .rect(x, yl + 1.5, 9, 9)
        .strokeColor(
          attestation.date
            ? TdrDocumentService.ACCENT
            : TdrDocumentService.FILET,
        )
        .lineWidth(1)
        .stroke();
      if (attestation.date) {
        doc
          .moveTo(x + 2, yl + 6)
          .lineTo(x + 3.8, yl + 8.2)
          .lineTo(x + 7, yl + 3.6)
          .strokeColor(TdrDocumentService.ACCENT)
          .lineWidth(1.4)
          .stroke();
      }

      doc.font(f.serif).fontSize(10).fillColor(TdrDocumentService.ENCRE);
      doc.text(attestation.intitule, x + 18, yl, {
        width: largeur - 18,
        lineGap: 2,
      });

      doc.font(f.sans).fontSize(8.5).fillColor(TdrDocumentService.GRIS);
      doc.text(
        attestation.date
          ? `Portée le ${attestation.date}`
          : 'Non portée à la date de composition',
        x + 18,
        doc.y + 1,
        { width: largeur - 18 },
      );
      doc.moveDown(0.7);
    }

    doc.moveDown(0.5);
    doc.font(f.sansSemi).fontSize(9.5).fillColor(TdrDocumentService.ACCENT);
    doc.text('PIÈCES JOINTES AU DOSSIER', x, doc.y, {
      width: largeur,
      characterSpacing: 0.9,
    });
    doc.moveDown(0.5);

    if (plan.annexes.length === 0) {
      doc.font(f.serifItalique).fontSize(10).fillColor(TdrDocumentService.GRIS);
      doc.text('Aucune pièce jointe au dossier.', x, doc.y, { width: largeur });
    } else {
      for (const [i, nom] of plan.annexes.entries()) {
        const yl = doc.y;
        doc.font(f.mono).fontSize(8.5).fillColor(TdrDocumentService.GRIS);
        doc.text(`A${i + 1}`, x, yl + 1, { width: 22, lineBreak: false });
        doc.font(f.serif).fontSize(10).fillColor(TdrDocumentService.ENCRE);
        doc.text(nom, x + 26, yl, { width: largeur - 26 });
        doc.moveDown(0.3);
      }
    }

    // La déclaration d'assistance ferme le document. Une pièce contractuelle
    // dit ce qui a été rédigé avec une assistance automatique ; le taire
    // serait une omission, non une discrétion.
    if (plan.champsAssistes.length > 0) {
      doc.moveDown(1.2);
      y = doc.y;
      const hauteur = 54;
      doc
        .rect(P.gauche, y, 2.5, hauteur)
        .fillColor(TdrDocumentService.ACCENT)
        .fill();

      doc.font(f.sansSemi).fontSize(8.5).fillColor(TdrDocumentService.ACCENT);
      doc.text('RÉDACTION ASSISTÉE', P.gauche + 14, y + 2, {
        width: col - 14,
        characterSpacing: 0.9,
      });
      doc.font(f.serif).fontSize(9.5).fillColor(TdrDocumentService.ENCRE);
      doc.text(
        `Un modèle de langage a contribué à la rédaction ${
          plan.champsAssistes.length === 1 ? 'de la section' : 'des sections'
        } : ${plan.champsAssistes.join(', ')}. Le texte a été relu et repris par son auteur, qui en porte la responsabilité.`,
        P.gauche + 14,
        doc.y + 3,
        { width: col - 20, lineGap: 2 },
      );
    }

    // Établi par — l'auteur et son entité. Une pièce contractuelle porte son
    // auteur : c'est ce qui permet d'y revenir des années plus tard.
    if (plan.auteur) {
      doc.moveDown(1.6);
      y = doc.y;
      doc.font(f.sans).fontSize(8.5).fillColor(TdrDocumentService.GRIS);
      doc.text('ÉTABLI PAR', x, y, { width: largeur, characterSpacing: 0.5 });
      doc.font(f.serifSemi).fontSize(11).fillColor(TdrDocumentService.ENCRE);
      doc.text(plan.auteur.nom, x, doc.y + 3, { width: largeur });
      doc.font(f.serif).fontSize(9.5).fillColor(TdrDocumentService.GRIS);
      doc.text(plan.auteur.entite, x, doc.y + 1, { width: largeur });
    }
  }

  /**
   * En-têtes et pieds, posés à la fin sur toutes les pages sauf la garde.
   *
   * La couverture ne les porte pas : un en-tête courant sur une page de
   * garde la ferait passer pour une page intérieure.
   */
  private entetesEtPieds(
    doc: PDFKit.PDFDocument,
    plan: PlanDocument,
    f: Record<string, string>,
    pageSommaire: number,
  ): void {
    const P = TdrDocumentService.PAGE;
    const col = TdrDocumentService.COLONNE;
    const { start, count } = doc.bufferedPageRange();

    for (let i = start; i < start + count; i += 1) {
      const rang = i - start;
      doc.switchToPage(i);

      // Écrire hors des marges fait ajouter une page à pdfkit : le pied de
      // chaque page en créait deux de plus, et un document de treize
      // feuillets en comptait trente-neuf. On efface les marges le temps de
      // l'écriture, et on les remet.
      const hautes = doc.page.margins.top;
      const basses = doc.page.margins.bottom;
      doc.page.margins.top = 0;
      doc.page.margins.bottom = 0;

      if (rang > 0) {
        // En-tête courant : où l'on est, dans quel dossier.
        doc.font(f.sans).fontSize(7.5).fillColor(TdrDocumentService.GRIS);
        doc.text(`${PROJET.sigle} · ${PROJET.code}`, P.gauche, P.haut - 30, {
          width: col / 2,
          lineBreak: false,
        });
        doc.font(f.mono).fontSize(7.5);
        doc.text(plan.reference, P.gauche + col / 2, P.haut - 30, {
          width: col / 2,
          align: 'right',
          lineBreak: false,
        });
        doc
          .moveTo(P.gauche, P.haut - 18)
          .lineTo(P.largeur - P.droite, P.haut - 18)
          .strokeColor(TdrDocumentService.FILET)
          .lineWidth(0.5)
          .stroke();
      }

      const yPied = P.hauteur - P.bas + 30;
      if (rang > 0) {
        doc
          .moveTo(P.gauche, yPied - 12)
          .lineTo(P.largeur - P.droite, yPied - 12)
          .strokeColor(TdrDocumentService.FILET)
          .lineWidth(0.5)
          .stroke();

        doc.font(f.sans).fontSize(7.5).fillColor(TdrDocumentService.GRIS);
        doc.text(
          rang === pageSommaire
            ? 'Sommaire'
            : `Termes de référence · ${plan.typeCode}`,
          P.gauche,
          yPied,
          { width: col / 2, lineBreak: false },
        );
        doc.font(f.mono).fontSize(7.5);
        doc.text(`${rang + 1} / ${count}`, P.gauche + col / 2, yPied, {
          width: col / 2,
          align: 'right',
          lineBreak: false,
        });
      }

      doc.page.margins.top = hautes;
      doc.page.margins.bottom = basses;
    }
  }

  // ============================================================
  // DOCX
  // ============================================================

  async docx(
    id: string,
    actor: AuthenticatedUser,
    ctx?: RequestContext,
  ): Promise<Buffer> {
    const plan = await this.plan(id, actor);

    if (ctx) {
      await this.audit.record({
        actorId: actor.userId,
        actorEmail: actor.email,
        action: 'tdr.document_generated',
        entityType: 'Tdr',
        entityId: id,
        payload: { format: 'docx', reference: plan.reference },
        ...ctx,
      });
    }

    return this.composerDocx(plan);
  }

  /**
   * La composition seule, sans base ni journal — même partage que pour le
   * PDF, et pour la même raison : une mise en page se juge en l'ouvrant.
   */
  composerDocx(plan: PlanDocument): Promise<Buffer> {
    const logo = TdrDocumentService.logo();
    const enfants: Paragraph[] = [];

    if (logo) {
      enfants.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logo,
              transformation: { width: 150, height: 60 },
              type: 'png',
            }),
          ],
        }),
      );
    }

    // Même en-tête institutionnel que le PDF et l'écran : l'État, la
    // tutelle, l'unité. Une pièce qui part chez un bailleur ne change pas
    // d'émetteur selon le format dans lequel on la lui remet.
    for (const [i, ligne] of EN_TETE_INSTITUTIONNEL.entries()) {
      enfants.push(
        new Paragraph({
          children: [
            new TextRun({
              text: ligne,
              bold: i === 0,
              size: i === 0 ? 20 : 18,
              color: i === 0 ? '161616' : '6F6F6F',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: i === 0 ? 240 : 0, after: 40 },
        }),
      );
    }

    enfants.push(
      new Paragraph({
        children: [
          new TextRun({ text: PROJET.intitule, size: 17, color: '6F6F6F' }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 40 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${PROJET.sigle} · ${PROJET.code}`,
            size: 17,
            color: '0F62FE',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'TERMES DE RÉFÉRENCE',
            bold: true,
            size: 22,
            color: '0F62FE',
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: plan.titre, bold: true, size: 40 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${plan.typeCode} — ${plan.typeNom}`,
            size: 19,
            color: '6F6F6F',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      }),
    );

    for (const { cle, valeur } of plan.entete) {
      enfants.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${cle} : `, color: '6F6F6F', size: 19 }),
            new TextRun({ text: valeur, size: 21 }),
          ],
          spacing: { after: 60 },
        }),
      );
    }

    enfants.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Document composé le ${plan.dateComposition}.`,
            size: 18,
            color: '6F6F6F',
          }),
        ],
        spacing: { before: 240, after: 120 },
      }),
    );

    // La déclaration d'assistance a rejoint le bloc de clôture, avec les
    // attestations et les annexes : les trois disent ce qui engage l'auteur,
    // et se lisent ensemble. Elle figurait ici, séparée d'elles.

    for (const section of plan.sections) {
      enfants.push(
        new Paragraph({
          text: `${section.numero}. ${section.titre}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 160 },
        }),
      );

      for (const bloc of section.blocs) {
        if (bloc.genre === 'sousTitre') {
          enfants.push(
            new Paragraph({
              text: bloc.texte,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 100 },
            }),
          );
        } else if (bloc.genre === 'paragraphe') {
          enfants.push(
            new Paragraph({
              children: [new TextRun({ text: bloc.texte, size: 21 })],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 160 },
            }),
          );
        } else if (bloc.genre === 'liste') {
          for (const entree of bloc.entrees) {
            enfants.push(
              new Paragraph({
                children: [new TextRun({ text: entree, size: 21 })],
                bullet: { level: 0 },
                spacing: { after: 80 },
              }),
            );
          }
        } else if (bloc.genre === 'definitions') {
          for (const ligne of bloc.lignes) {
            enfants.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${ligne.cle} : `,
                    color: '6F6F6F',
                    size: 19,
                  }),
                  new TextRun({ text: ligne.valeur, size: 21 }),
                ],
                spacing: { after: 60 },
              }),
            );
          }
        } else if (bloc.genre === 'absent') {
          enfants.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: bloc.mention,
                  italics: true,
                  color: '6F6F6F',
                  size: 20,
                }),
              ],
              spacing: { after: 160 },
            }),
          );
        }
      }
    }

    // Le bloc de clôture, comme dans le PDF et à l'écran : engagements,
    // pièces, déclaration d'assistance, signature. Ces quatre blocs
    // existaient dans le dossier sans jamais atteindre le fichier.
    enfants.push(
      new Paragraph({
        text: 'Engagements et pièces jointes',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 160 },
      }),
      new Paragraph({
        text: 'Attestations portées par l’auteur',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 100 },
      }),
    );

    for (const attestation of plan.attestations) {
      enfants.push(
        new Paragraph({
          children: [
            // La case n'est cochée que si l'attestation a été portée : une
            // coche d'avance vaudrait signature de ce qui n'a pas eu lieu.
            new TextRun({
              text: `${attestation.date ? '☒' : '☐'}  `,
              size: 21,
              color: attestation.date ? '0F62FE' : '8D8D8D',
            }),
            new TextRun({ text: attestation.intitule, size: 21 }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: attestation.date
                ? `Portée le ${attestation.date}`
                : 'Non portée à la date de composition',
              size: 17,
              color: '6F6F6F',
            }),
          ],
          spacing: { after: 140 },
        }),
      );
    }

    enfants.push(
      new Paragraph({
        text: 'Pièces jointes au dossier',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    );

    if (plan.annexes.length === 0) {
      enfants.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Aucune pièce jointe au dossier.',
              italics: true,
              size: 20,
              color: '6F6F6F',
            }),
          ],
          spacing: { after: 160 },
        }),
      );
    } else {
      for (const [i, nom] of plan.annexes.entries()) {
        enfants.push(
          new Paragraph({
            children: [
              new TextRun({ text: `A${i + 1}  `, size: 17, color: '6F6F6F' }),
              new TextRun({ text: nom, size: 21 }),
            ],
            spacing: { after: 60 },
          }),
        );
      }
    }

    if (plan.champsAssistes.length > 0) {
      enfants.push(
        new Paragraph({
          text: 'Rédaction assistée',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text:
                `Un modèle de langage a contribué à la rédaction ${
                  plan.champsAssistes.length === 1
                    ? 'de la section'
                    : 'des sections'
                } : ${plan.champsAssistes.join(', ')}. ` +
                'Le texte a été relu et repris par son auteur, qui en porte la responsabilité.',
              size: 20,
            }),
          ],
          spacing: { after: 240 },
        }),
      );
    }

    if (plan.auteur) {
      enfants.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'ÉTABLI PAR', size: 17, color: '6F6F6F' }),
          ],
          spacing: { before: 320, after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: plan.auteur.nom, bold: true, size: 23 }),
          ],
          spacing: { after: 20 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: plan.auteur.entite,
              size: 19,
              color: '6F6F6F',
            }),
          ],
        }),
      );
    }

    const document = new Document({
      creator: 'SGO/PTN-RDC',
      title: `${plan.reference} — ${plan.titre}`,
      description: `Termes de référence — ${PROJET.sigle} (${PROJET.code})`,
      sections: [{ children: enfants }],
    });

    return Packer.toBuffer(document);
  }
}
