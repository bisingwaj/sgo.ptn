/**
 * PTN-RDC · Seed déterministe.
 *
 * Deux couches, aux règles distinctes :
 *
 *  1. RÉFÉRENTIEL MEP — composantes, provinces, organisations, permissions,
 *     sous-rôles. Identique dans TOUS les environnements, production
 *     comprise. Idempotent (upsert) : rejouable sans effet de bord.
 *
 *  2. AMORÇAGE — le tout premier administrateur. Il ne peut pas être créé
 *     par un administrateur (problème de l'œuf et de la poule), donc il
 *     vient d'ici. Sous-rôle UGP « IT », mot de passe issu de
 *     l'environnement, changement obligatoire à la première connexion.
 *
 * Les identifiants sont dérivés de manière déterministe (voir uuid.ts) :
 * les deux environnements de développement sont bit à bit identiques
 * après `npm run db:reset`.
 */

import 'dotenv/config';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import type { ProfileKey, OrganisationType, ComponentCode } from '../../generated/prisma/enums';
import { idFor } from './uuid';
import { PERMISSIONS, SUBROLES_WITH_ORDER, assertCatalogIntegrity } from './catalog';
import { COMPONENTS, PROVINCES, ORGANISATIONS } from './referentiel';
import {
  CLAUSE_CATEGORY,
  PROCUREMENT_METHODS,
  RISK_LEVEL,
  TDR_TYPE_META,
  THRESHOLDS,
  familyKeyFor,
  loadExtractedContent,
} from './tdr-referentiel';

// Prisma 7 exige un driver adapter explicite.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function log(step: string, detail: string): void {
  console.log(`  ${step.padEnd(22)} ${detail}`);
}

// ============================================================
// 1. RÉFÉRENTIEL MEP
// ============================================================

async function seedComponents(): Promise<void> {
  for (const c of COMPONENTS) {
    await prisma.component.upsert({
      where: { code: c.code as ComponentCode },
      update: {
        label: c.label,
        shortLabel: c.shortLabel,
        totalUsdM: c.totalUsdM,
        idaUsdM: c.idaUsdM,
        afdUsdM: c.afdUsdM,
        privateUsdM: c.privateUsdM,
        reconciliation: c.reconciliation ?? null,
      },
      create: {
        code: c.code as ComponentCode,
        label: c.label,
        shortLabel: c.shortLabel,
        totalUsdM: c.totalUsdM,
        idaUsdM: c.idaUsdM,
        afdUsdM: c.afdUsdM,
        privateUsdM: c.privateUsdM,
        reconciliation: c.reconciliation ?? null,
      },
    });
  }

  // Contrôle de cohérence MEP : l'enveloppe totale doit valoir 510 M USD.
  const total = COMPONENTS.reduce((sum, c) => sum + c.totalUsdM, 0);
  const ida = COMPONENTS.reduce((sum, c) => sum + c.idaUsdM, 0);
  const afd = COMPONENTS.reduce((sum, c) => sum + c.afdUsdM, 0);
  if (total !== 510) {
    throw new Error(`Enveloppe projet incohérente : ${total} M USD au lieu de 510 (MEP Tableau 2).`);
  }
  if (Math.round(ida) !== 400 || Math.round(afd) !== 110) {
    throw new Error(`Répartition bailleurs incohérente : IDA ${ida} / AFD ${afd} au lieu de 400 / 110.`);
  }

  log(
    'Composantes',
    `${COMPONENTS.length} — total ${total} M USD (IDA ${Math.round(ida)} + AFD ${Math.round(afd)})`,
  );
}

async function seedProvinces(): Promise<void> {
  for (const p of PROVINCES) {
    await prisma.province.upsert({
      where: { code: p.code },
      update: { label: p.label, isPriorityCpf: p.isPriorityCpf },
      create: p,
    });
  }
  const priority = PROVINCES.filter((p) => p.isPriorityCpf).length;
  log('Provinces', `${PROVINCES.length} dont ${priority} prioritaires CPF`);
}

async function seedOrganisations(): Promise<void> {
  for (const o of ORGANISATIONS) {
    await prisma.organisation.upsert({
      where: { code: o.code },
      update: {
        name: o.name,
        fullName: o.fullName,
        type: o.type as OrganisationType,
        provinceCode: o.provinceCode ?? null,
        isReference: true,
      },
      create: {
        id: idFor.organisation(o.code),
        code: o.code,
        name: o.name,
        fullName: o.fullName,
        type: o.type as OrganisationType,
        provinceCode: o.provinceCode ?? null,
        isReference: true,
      },
    });
  }
  log('Organisations', `${ORGANISATIONS.length} (glossaire présentation UGPTN § 13.1 + UGP + bailleurs)`);
}

async function seedPermissions(): Promise<void> {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {
        label: p.label,
        category: p.category,
        isWrite: p.isWrite ?? false,
        isSensitive: p.isSensitive ?? false,
      },
      create: {
        code: p.code,
        label: p.label,
        category: p.category,
        isWrite: p.isWrite ?? false,
        isSensitive: p.isSensitive ?? false,
      },
    });
  }
  const sensitive = PERMISSIONS.filter((p) => p.isSensitive).length;
  log('Permissions', `${PERMISSIONS.length} dont ${sensitive} sensibles`);
}

async function seedSubroles(): Promise<void> {
  for (const s of SUBROLES_WITH_ORDER) {
    const id = idFor.subrole(s.code);

    await prisma.subrole.upsert({
      where: { code: s.code },
      update: {
        label: s.label,
        profile: s.profile as ProfileKey,
        isUnique: s.isUnique ?? false,
        isSensitive: s.isSensitive ?? false,
        incompatibleWith: s.incompatibleWith ?? [],
        requiresComponent: s.requiresComponent ?? false,
        requiresMission: s.requiresMission ?? false,
        displayOrder: s.displayOrder,
      },
      create: {
        id,
        code: s.code,
        label: s.label,
        profile: s.profile as ProfileKey,
        isUnique: s.isUnique ?? false,
        isSensitive: s.isSensitive ?? false,
        incompatibleWith: s.incompatibleWith ?? [],
        requiresComponent: s.requiresComponent ?? false,
        requiresMission: s.requiresMission ?? false,
        displayOrder: s.displayOrder,
      },
    });

    // Le sous-rôle est la source de vérité de ses permissions par défaut :
    // on remplace intégralement plutôt que de fusionner, sinon une
    // permission retirée du catalogue survivrait en base.
    await prisma.subrolePermission.deleteMany({ where: { subroleId: id } });
    await prisma.subrolePermission.createMany({
      data: s.permissions.map((permissionCode) => ({ subroleId: id, permissionCode })),
      skipDuplicates: true,
    });
  }

  const byProfile = SUBROLES_WITH_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s.profile] = (acc[s.profile] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(byProfile)
    .map(([p, n]) => `${p} ${n}`)
    .join(' · ');
  log('Sous-rôles', `${SUBROLES_WITH_ORDER.length} — ${summary}`);
}

// ============================================================
// 1 bis. RÉFÉRENTIEL DE PASSATION ET BIBLIOTHÈQUES TDR
// ============================================================

async function seedProcurementReferentiel(): Promise<void> {
  for (const m of PROCUREMENT_METHODS) {
    await prisma.procurementMethod.upsert({
      where: { code: m.code },
      update: { label: m.label, category: m.category, description: m.description, isException: m.isException ?? false },
      create: {
        code: m.code,
        label: m.label,
        category: m.category,
        description: m.description,
        isException: m.isException ?? false,
        displayOrder: PROCUREMENT_METHODS.indexOf(m),
      },
    });
  }

  // Les seuils n'ont pas de clé naturelle : on les remplace intégralement
  // plutôt que de les fusionner, sinon un seuil retiré du catalogue
  // survivrait en base.
  await prisma.procurementThreshold.deleteMany({});
  await prisma.procurementThreshold.createMany({
    data: THRESHOLDS.map((t) => ({
      methodCode: t.methodCode,
      category: t.category,
      minUsd: t.minUsd ?? null,
      maxUsd: t.maxUsd ?? null,
      reviewType: t.reviewType,
      note: t.note ?? null,
    })),
  });

  log('Méthodes de passation', `${PROCUREMENT_METHODS.length} · ${THRESHOLDS.length} seuils`);
}

async function seedTdrTypes(content: ReturnType<typeof loadExtractedContent>): Promise<void> {
  let count = 0;
  for (const type of content.types) {
    const meta = TDR_TYPE_META[type.slug];
    // `generic` n'est pas un type du MEP : il sert de repli côté frontend.
    if (!meta) continue;

    await prisma.tdrType.upsert({
      where: { code: type.code },
      update: {
        slug: type.slug,
        name: type.name,
        family: type.family,
        familyLabel: meta.familyLabel,
        defaultMethodCode: type.defaultMethod,
        allowedOrigins: meta.allowedOrigins,
        stepCount: meta.stepCount,
        contextTemplate: type.contextTemplate,
        titleTemplate: meta.titleTemplate,
        procurementCategory: meta.procurementCategory ?? null,
        requiresPges: meta.requiresPges ?? false,
        displayOrder: meta.displayOrder,
      },
      create: {
        code: type.code,
        slug: type.slug,
        name: type.name,
        family: type.family,
        familyLabel: meta.familyLabel,
        defaultMethodCode: type.defaultMethod,
        allowedOrigins: meta.allowedOrigins,
        stepCount: meta.stepCount,
        contextTemplate: type.contextTemplate,
        titleTemplate: meta.titleTemplate,
        procurementCategory: meta.procurementCategory ?? null,
        requiresPges: meta.requiresPges ?? false,
        displayOrder: meta.displayOrder,
      },
    });
    count += 1;
  }

  // Garde-fou présentation UGPTN § 15.4 : le bailleur ne rédige jamais.
  const offending = await prisma.tdrType.findFirst({ where: { allowedOrigins: { has: 'BAILLEUR' } } });
  if (offending) {
    throw new Error(
      `Le type « ${offending.name} » autorise l'origine BAILLEUR : un bailleur ne rédige jamais de TDR (présentation UGPTN § 15.4).`,
    );
  }

  log('Types de TDR', `${count} sur 3 familles`);
}

/**
 * Bibliothèques versionnées. Le seed pose la version 1 en PUBLIE ; les
 * éditions ultérieures passeront par le panneau d'administration, qui
 * créera des versions successives sans écraser celles déjà citées par des
 * TDR soumis.
 */
async function seedLibraries(content: ReturnType<typeof loadExtractedContent>): Promise<void> {
  const now = new Date();
  let clauses = 0;
  let indicators = 0;
  let risks = 0;

  const upsertClause = async (
    scope: string,
    typeCode: string | null,
    c: { label: string; text: string; cat: keyof typeof CLAUSE_CATEGORY },
  ) => {
    const familyKey = familyKeyFor(scope, c.label);
    await prisma.clauseTemplate.upsert({
      where: { familyKey_version: { familyKey, version: 1 } },
      update: { label: c.label, text: c.text, category: CLAUSE_CATEGORY[c.cat], tdrTypeCode: typeCode },
      create: {
        familyKey,
        version: 1,
        tdrTypeCode: typeCode,
        category: CLAUSE_CATEGORY[c.cat],
        label: c.label,
        text: c.text,
        status: 'PUBLIE',
        effectiveFrom: now,
      },
    });
    clauses += 1;
  };

  const upsertIndicator = async (
    scope: string,
    typeCode: string | null,
    i: { label: string; measure: string; target: string },
  ) => {
    const familyKey = familyKeyFor(scope, i.label);
    await prisma.indicatorTemplate.upsert({
      where: { familyKey_version: { familyKey, version: 1 } },
      update: { label: i.label, measure: i.measure, target: i.target, tdrTypeCode: typeCode },
      create: {
        familyKey,
        version: 1,
        tdrTypeCode: typeCode,
        label: i.label,
        measure: i.measure,
        target: i.target,
        status: 'PUBLIE',
        effectiveFrom: now,
      },
    });
    indicators += 1;
  };

  const upsertRisk = async (
    scope: string,
    typeCode: string | null,
    r: { label: string; description: string; mitigation: string; level: keyof typeof RISK_LEVEL },
  ) => {
    const familyKey = familyKeyFor(scope, r.label);
    await prisma.riskTemplate.upsert({
      where: { familyKey_version: { familyKey, version: 1 } },
      update: {
        label: r.label,
        description: r.description,
        mitigation: r.mitigation,
        level: RISK_LEVEL[r.level],
        tdrTypeCode: typeCode,
      },
      create: {
        familyKey,
        version: 1,
        tdrTypeCode: typeCode,
        label: r.label,
        description: r.description,
        mitigation: r.mitigation,
        level: RISK_LEVEL[r.level],
        status: 'PUBLIE',
        effectiveFrom: now,
      },
    });
    risks += 1;
  };

  for (const type of content.types) {
    if (!TDR_TYPE_META[type.slug]) continue;
    for (const c of type.clauses) await upsertClause(type.slug, type.code, c);
    for (const i of type.indicators) await upsertIndicator(type.slug, type.code, i);
    for (const r of type.risks) await upsertRisk(type.slug, type.code, r);
  }

  // Transversaux : applicables à tous les types, donc rattachés à aucun.
  for (const i of content.crossIndicators) await upsertIndicator('transversal', null, i);
  for (const r of content.crossRisks) await upsertRisk('transversal', null, r);

  log('Bibliothèques TDR', `${clauses} clauses · ${indicators} indicateurs · ${risks} risques`);
}

/**
 * Exercice PTBA courant, sans activités : celles-ci sont saisies depuis
 * l'écran /ptba. Les inventer ici les rendrait opposables alors qu'aucun
 * PTBA officiel n'a encore été chargé.
 */
async function seedPtbaYear(): Promise<void> {
  const year = 2026;
  await prisma.ptbaYear.upsert({
    where: { year },
    update: {},
    create: { year, label: `PTBA ${year}`, status: 'BROUILLON' },
  });
  const activities = await prisma.ptbaActivity.count();
  log('Exercice PTBA', `${year} · ${activities} activité(s) — à saisir depuis /ptba`);
}

// ============================================================
// 2. AMORÇAGE — premier administrateur
// ============================================================

/** Hachage chaîné : chaque entrée scelle la précédente. */
function chainHash(previousHash: string | null, payload: unknown): string {
  return createHash('sha256')
    .update(`${previousHash ?? 'GENESIS'}|${JSON.stringify(payload)}`)
    .digest('hex');
}

async function seedBootstrapAdmin(): Promise<void> {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@ptn-rdc.gov.cd').toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@PTN2026';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

  const ugp = await prisma.organisation.findUniqueOrThrow({ where: { code: 'UGP-PTN' } });
  const itSubrole = await prisma.subrole.findUniqueOrThrow({ where: { code: 'UGP_IT' } });

  const userId = idFor.user(email);
  const passwordHash = await bcrypt.hash(password, rounds);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: userId,
      email,
      passwordHash,
      firstName: 'Administrateur',
      lastName: 'Plateforme',
      preferredLanguage: 'FR',
      status: 'ACTIF',
      // Compte d'amorçage : le mot de passe est connu de quiconque lit
      // le dépôt. Il doit être changé à la première connexion.
      mustChangePassword: true,
      // Les engagements restent à signer par la personne elle-même.
      onboardingCompletedAt: null,
    },
  });

  await prisma.assignment.upsert({
    where: { id: idFor.assignment(email, 'UGP_IT') },
    update: {},
    create: {
      id: idFor.assignment(email, 'UGP_IT'),
      userId: user.id,
      organisationId: ugp.id,
      profile: 'UGP',
      subroleId: itSubrole.id,
      isPrimary: true,
      status: 'ACTIVE',
      justification:
        "Compte d'amorçage de la plateforme. Créé par le seed en l'absence d'administrateur préexistant.",
    },
  });

  // Entrée de genèse de la piste d'audit.
  const existing = await prisma.auditLog.findFirst({ where: { action: 'system.bootstrap' } });
  if (!existing) {
    const payload = { email, subrole: 'UGP_IT', organisation: 'UGP-PTN' };
    await prisma.auditLog.create({
      data: {
        actorId: null,
        actorEmail: 'system@seed',
        action: 'system.bootstrap',
        entityType: 'User',
        entityId: user.id,
        payload,
        previousHash: null,
        hash: chainHash(null, payload),
      },
    });
  }

  log('Admin d’amorçage', `${email} · sous-rôle UGP « IT » · mot de passe à changer`);
}

// ============================================================
// ORCHESTRATION
// ============================================================

async function main(): Promise<void> {
  console.log('\n┌─ PTN-RDC · Seed de la base de données');
  console.log('│');

  // Les règles du MEP sont vérifiées avant toute écriture : mieux vaut
  // échouer ici qu'introduire une habilitation non conforme en base.
  assertCatalogIntegrity();
  log('Intégrité catalogue', 'aucune violation MEP détectée');

  await seedComponents();
  await seedProvinces();
  await seedOrganisations();
  await seedPermissions();
  await seedSubroles();

  const tdrContent = loadExtractedContent();
  await seedProcurementReferentiel();
  await seedTdrTypes(tdrContent);
  await seedLibraries(tdrContent);
  await seedPtbaYear();

  await seedBootstrapAdmin();

  console.log('│');
  console.log('└─ Seed terminé.\n');
}

main()
  .catch((error: unknown) => {
    console.error('\n✗ Échec du seed :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
