import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { composerPlan, type PlanDocument, type Section } from './document-plan';
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
        objectives: { orderBy: { position: 'asc' } },
        deliverables: { orderBy: { position: 'asc' } },
        clauses: { orderBy: { position: 'asc' } },
        indicators: { orderBy: { position: 'asc' } },
        risks: { orderBy: { position: 'asc' } },
      },
    });
    if (!tdr) throw new NotFoundException('TDR introuvable.');

    const privilegie =
      actor.permissions.includes('tdr:review') || actor.permissions.includes('ano:decide');
    if (!privilegie && tdr.organisationId !== actor.organisationId) {
      throw new ForbiddenException('Ce TDR ne relève pas de votre organisation.');
    }
    return tdr;
  }

  async plan(id: string, actor: AuthenticatedUser): Promise<PlanDocument> {
    const tdr = await this.charger(id, actor);
    return composerPlan(tdr as never);
  }

  // ============================================================
  // PDF
  // ============================================================

  async pdf(id: string, actor: AuthenticatedUser, ctx?: RequestContext): Promise<Buffer> {
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

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 64, bottom: 72, left: 64, right: 64 },
        info: {
          Title: `${plan.reference} — ${plan.titre}`,
          Author: plan.organisation,
          Subject: 'Termes de référence — PTN-RDC',
          Creator: 'SGO/PTN-RDC',
        },
        // La numérotation est posée à la fin, sur chaque page : sans cela,
        // pdfkit tamponnerait le pied avant de savoir combien de pages
        // existent.
        bufferPages: true,
      });

      const morceaux: Buffer[] = [];
      doc.on('data', (m: Buffer) => morceaux.push(m));
      doc.on('end', () => resolve(Buffer.concat(morceaux)));
      doc.on('error', reject);

      this.pageDeGarde(doc, plan);
      this.corps(doc, plan);
      this.piedsDePage(doc, plan);

      doc.end();
    });
  }

  private pageDeGarde(doc: PDFKit.PDFDocument, plan: PlanDocument): void {
    const logo = TdrDocumentService.logo();
    if (logo) {
      doc.image(logo, 64, 64, { fit: [150, 60] });
      doc.moveDown(4);
    }

    doc
      .fillColor(TdrDocumentService.GRIS)
      .fontSize(9)
      .font('Helvetica')
      .text('UNITÉ DE GESTION DU PROJET DE TRANSFORMATION NUMÉRIQUE', 64, 160, {
        characterSpacing: 1.2,
      })
      .text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', { characterSpacing: 1.2 });

    doc
      .moveDown(2)
      .fillColor(TdrDocumentService.ACCENT)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TERMES DE RÉFÉRENCE');

    doc
      .moveDown(0.6)
      .fillColor(TdrDocumentService.ENCRE)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(plan.titre, { lineGap: 4 });

    doc.moveDown(1.5);
    const y0 = doc.y;
    doc
      .moveTo(64, y0)
      .lineTo(531, y0)
      .strokeColor(TdrDocumentService.ACCENT)
      .lineWidth(2)
      .stroke();
    doc.moveDown(1.5);

    for (const { cle, valeur } of plan.entete) {
      const y = doc.y;
      doc
        .fillColor(TdrDocumentService.GRIS)
        .fontSize(9)
        .font('Helvetica')
        .text(cle.toUpperCase(), 64, y, { width: 160 });
      doc
        .fillColor(TdrDocumentService.ENCRE)
        .fontSize(10)
        .font('Helvetica')
        .text(valeur, 232, y, { width: 299 });
      doc.moveDown(0.5);
    }

    doc
      .moveDown(2)
      .fillColor(TdrDocumentService.GRIS)
      .fontSize(9)
      .text(`Document composé le ${plan.dateComposition}.`, 64, doc.y, { width: 467 });

    if (plan.champsAssistes.length > 0) {
      // Une pièce contractuelle dit ce qui a été rédigé avec une assistance
      // automatique. Le taire serait une omission, non une discrétion.
      doc.text(
        `Rédaction assistée sur : ${plan.champsAssistes.join(', ')}. Texte relu et endossé par son auteur.`,
        { width: 467 },
      );
    }
  }

  private corps(doc: PDFKit.PDFDocument, plan: PlanDocument): void {
    doc.addPage();
    for (const [i, section] of plan.sections.entries()) {
      // Les sections s'enchaînent. Une page par section produisait un
      // document de treize feuillets dont la moitié était blanche — on ne
      // rompt que si le titre n'a pas la place d'être suivi de son texte.
      const resteAvant = 770 - doc.y;
      if (i > 0 && resteAvant < 140) doc.addPage();
      else if (i > 0) doc.moveDown(1.5);
      this.section(doc, section);
    }
  }

  private section(doc: PDFKit.PDFDocument, section: Section): void {
    doc
      .fillColor(TdrDocumentService.ACCENT)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(section.numero, { continued: true })
      .fillColor(TdrDocumentService.ENCRE)
      .fontSize(15)
      .text(`   ${section.titre}`);

    doc.moveDown(0.4);
    const y = doc.y;
    doc.moveTo(64, y).lineTo(531, y).strokeColor('#e0e0e0').lineWidth(1).stroke();
    doc.moveDown(1);

    for (const bloc of section.blocs) {
      switch (bloc.genre) {
        case 'paragraphe':
          doc
            .fillColor(TdrDocumentService.ENCRE)
            .fontSize(10.5)
            .font('Helvetica')
            .text(bloc.texte, { align: 'justify', lineGap: 3 });
          doc.moveDown(0.8);
          break;

        case 'liste':
          for (const entree of bloc.entrees) {
            doc
              .fillColor(TdrDocumentService.ENCRE)
              .fontSize(10.5)
              .font('Helvetica')
              .text(entree, { indent: 14, align: 'left', lineGap: 2 });
            doc.moveDown(0.4);
          }
          doc.moveDown(0.4);
          break;

        case 'definitions':
          for (const ligne of bloc.lignes) {
            const yl = doc.y;
            doc
              .fillColor(TdrDocumentService.GRIS)
              .fontSize(9.5)
              .font('Helvetica')
              .text(ligne.cle, 64, yl, { width: 170 });
            doc
              .fillColor(TdrDocumentService.ENCRE)
              .fontSize(10.5)
              .font('Helvetica')
              .text(ligne.valeur, 242, yl, { width: 289 });
            doc.moveDown(0.4);
          }
          doc.moveDown(0.6);
          break;

        case 'absent':
          // Le vide se dit. Un relecteur doit voir ce qui manque, non
          // découvrir une section muette.
          doc
            .fillColor(TdrDocumentService.GRIS)
            .fontSize(10)
            .font('Helvetica-Oblique')
            .text(bloc.mention);
          doc.moveDown(0.8);
          break;
      }
    }
  }

  private piedsDePage(doc: PDFKit.PDFDocument, plan: PlanDocument): void {
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i += 1) {
      doc.switchToPage(i);

      // Écrire sous la marge basse fait ajouter une page à pdfkit : le pied
      // de chaque page en créait deux de plus, et un document de treize
      // feuillets en comptait trente-neuf. On efface la marge le temps du
      // pied, et on la remet.
      const marge = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      doc
        .fillColor(TdrDocumentService.GRIS)
        .fontSize(8)
        .font('Helvetica')
        .text(`${plan.reference} · ${plan.typeCode}`, 64, 790, { width: 300, lineBreak: false })
        .text(`${i - start + 1} / ${count}`, 431, 790, { width: 100, align: 'right', lineBreak: false });

      doc.page.margins.bottom = marge;
    }
  }

  // ============================================================
  // DOCX
  // ============================================================

  async docx(id: string, actor: AuthenticatedUser, ctx?: RequestContext): Promise<Buffer> {
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

    enfants.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'UNITÉ DE GESTION DU PROJET DE TRANSFORMATION NUMÉRIQUE — RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
            size: 16,
            color: '6F6F6F',
          }),
        ],
        spacing: { before: 240, after: 240 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'TERMES DE RÉFÉRENCE', bold: true, size: 22, color: '0F62FE' }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: plan.titre, bold: true, size: 44 })],
        spacing: { after: 240 },
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

    if (plan.champsAssistes.length > 0) {
      enfants.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Rédaction assistée sur : ${plan.champsAssistes.join(', ')}. Texte relu et endossé par son auteur.`,
              size: 18,
              color: '6F6F6F',
            }),
          ],
          spacing: { after: 240 },
        }),
      );
    }

    for (const section of plan.sections) {
      enfants.push(
        new Paragraph({
          text: `${section.numero}. ${section.titre}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 160 },
        }),
      );

      for (const bloc of section.blocs) {
        if (bloc.genre === 'paragraphe') {
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
                  new TextRun({ text: `${ligne.cle} : `, color: '6F6F6F', size: 19 }),
                  new TextRun({ text: ligne.valeur, size: 21 }),
                ],
                spacing: { after: 60 },
              }),
            );
          }
        } else {
          enfants.push(
            new Paragraph({
              children: [new TextRun({ text: bloc.mention, italics: true, color: '6F6F6F', size: 20 })],
              spacing: { after: 160 },
            }),
          );
        }
      }
    }

    const document = new Document({
      creator: 'SGO/PTN-RDC',
      title: `${plan.reference} — ${plan.titre}`,
      description: 'Termes de référence — PTN-RDC',
      sections: [{ children: enfants }],
    });

    return Packer.toBuffer(document) as unknown as Promise<Buffer>;
  }
}
