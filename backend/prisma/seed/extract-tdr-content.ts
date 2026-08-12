/**
 * Extracteur du registre de contenu TDR.
 *
 * Le contenu réglementaire — clauses, indicateurs, risques — a été rédigé
 * côté frontend dans `tdr-content.ts`. Le transcrire à la main dans le
 * seed exposerait à des erreurs de recopie sur des textes qui partent
 * dans des documents contractuels. On l'importe donc et on en produit du
 * JSON, que le seed consomme.
 *
 * Les amorces de contexte sont des fonctions : on les appelle avec des
 * marqueurs pour obtenir un gabarit substituable côté serveur.
 *
 *   npm run db:extract-tdr
 *
 * À rejouer si le registre frontend évolue — après quoi le référentiel
 * en base devient la source de vérité et le fichier frontend pourra
 * disparaître.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  TYPE_CONTENT,
  CROSS_INDICATORS,
  CROSS_RISKS,
} from '../../../src/app/dashboard/initiatives/nouveau/tdr-content';

const OUT_DIR = join(__dirname, 'data');
const OUT_FILE = join(OUT_DIR, 'tdr-referentiel.json');

const payload = {
  extractedFrom: 'src/app/dashboard/initiatives/nouveau/tdr-content.ts',
  types: Object.entries(TYPE_CONTENT).map(([slug, content]) => ({
    slug,
    code: content.code,
    name: content.name,
    family: content.family,
    defaultMethod: content.defaultMethod ?? null,
    // Gabarit substituable : le serveur remplacera les marqueurs.
    contextTemplate: content.contextHook('{{ptbaTitle}}', '{{ptbaCode}}'),
    clauses: content.clauses,
    indicators: content.indicators,
    risks: content.risks,
  })),
  crossIndicators: CROSS_INDICATORS,
  crossRisks: CROSS_RISKS,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');

const clauseCount = payload.types.reduce((n, t) => n + t.clauses.length, 0);
const indicatorCount = payload.types.reduce((n, t) => n + t.indicators.length, 0);
const riskCount = payload.types.reduce((n, t) => n + t.risks.length, 0);

console.log(`\nExtraction du registre TDR`);
console.log(`  types            ${payload.types.length}`);
console.log(`  clauses          ${clauseCount}`);
console.log(`  indicateurs      ${indicatorCount} (+ ${CROSS_INDICATORS.length} transversaux)`);
console.log(`  risques          ${riskCount} (+ ${CROSS_RISKS.length} transversaux)`);
console.log(`  → ${OUT_FILE}\n`);
