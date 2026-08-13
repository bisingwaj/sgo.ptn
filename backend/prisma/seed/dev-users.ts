/**
 * PTN-RDC · Comptes de démonstration — DÉVELOPPEMENT UNIQUEMENT.
 *
 * Séparé de `index.ts` à dessein. Le seed de production ne crée que le
 * référentiel MEP et l'administrateur d'amorçage ; ce fichier ajoute des
 * comptes dont le mot de passe est écrit en clair dans le dépôt. Il refuse
 * de s'exécuter si NODE_ENV vaut « production » — un jeu de comptes de test
 * survivant en production est une brèche, pas une commodité.
 *
 *   npm run db:seed:dev
 *
 * Tous les comptes partagent le mot de passe DEV_PASSWORD ci-dessous et sont
 * créés ACTIFS, sans changement de mot de passe imposé : l'objectif est de se
 * connecter en deux secondes pour éprouver un écran, pas de rejouer le
 * parcours d'activation (qui se teste, lui, avec l'administrateur d'amorçage).
 *
 * Identifiants déterministes (uuid.ts) : rejouable sans doublon.
 */

import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import type {
  ProfileKey,
  OrganisationType,
  ComponentCode,
} from '../../generated/prisma/enums';
import { idFor } from './uuid';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Mot de passe commun à tous les comptes de démonstration. */
const DEV_PASSWORD = 'Demo@PTN2026';

/* ------------------------------------------------------------------ */
/* Organisations absentes du référentiel                               */
/*                                                                     */
/* Le référentiel MEP ne recense que les institutions. Les entreprises, */
/* cabinets d'audit et bénéficiaires SBP sont des tiers privés : ils    */
/* sont créés ici, marqués isReference = false pour rester distincts    */
/* des organisations officielles.                                      */
/* ------------------------------------------------------------------ */

const DEV_ORGANISATIONS = [
  {
    code: 'CONGO-FIBRE',
    name: 'Congo Fibre SARL',
    fullName: 'Congo Fibre SARL — travaux de génie civil et réseaux',
    type: 'ENTREPRISE',
  },
  {
    code: 'AUDIT-KIN',
    name: 'Cabinet Audit Kinshasa',
    fullName: 'Cabinet Audit Kinshasa — expertise comptable et audit',
    type: 'CABINET_AUDIT',
  },
  {
    code: 'UNIKIN',
    name: 'Université de Kinshasa',
    fullName: 'Université de Kinshasa — établissement bénéficiaire SBP',
    type: 'EESU',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Comptes                                                             */
/* ------------------------------------------------------------------ */

interface DevAssignment {
  subroleCode: string;
  organisationCode: string;
  profile: ProfileKey;
  isPrimary?: boolean;
  /** Obligatoire pour les sous-rôles RC1/RC2/RC3. */
  componentCode?: ComponentCode;
  /** Obligatoire pour les sous-rôles d'audit — un accès non borné est une
   *  non-conformité que tout contrôleur relèvera. */
  missionRef?: string;
}

interface DevUser {
  email: string;
  firstName: string;
  lastName: string;
  assignments: DevAssignment[];
}

const DEV_USERS: DevUser[] = [
  {
    email: 'coordonnateur@ptn-rdc.gov.cd',
    firstName: 'Sylvie',
    lastName: 'Mbuyi',
    assignments: [
      {
        subroleCode: 'UGP_COORDONNATEUR',
        organisationCode: 'UGP-PTN',
        profile: 'UGP',
        isPrimary: true,
      },
    ],
  },
  {
    email: 'rpm@ptn-rdc.gov.cd',
    firstName: 'Patrick',
    lastName: 'Kabongo',
    assignments: [
      { subroleCode: 'UGP_RPM', organisationCode: 'UGP-PTN', profile: 'UGP', isPrimary: true },
    ],
  },
  {
    // Responsable de composante — le seul profil UGP habilité à rédiger.
    // Sans lui, aucun compte de démonstration ne peut ouvrir un TDR de
    // travaux ou de fournitures, types fermés aux autres origines.
    email: 'rc2@ptn-rdc.gov.cd',
    firstName: 'Emmanuel',
    lastName: 'Bofenda',
    assignments: [
      {
        subroleCode: 'UGP_RC2',
        organisationCode: 'UGP-PTN',
        profile: 'UGP',
        isPrimary: true,
        componentCode: 'C2',
      },
    ],
  },
  {
    email: 'pointfocal@mptn.gov.cd',
    firstName: 'Thérèse',
    lastName: 'Kalala',
    assignments: [
      {
        subroleCode: 'MDA_POINT_FOCAL',
        organisationCode: 'MPTN',
        profile: 'MDA',
        isPrimary: true,
      },
    ],
  },
  {
    email: 'partenaire@arptc.cd',
    firstName: 'Bernard',
    lastName: 'Mwamba',
    assignments: [
      {
        subroleCode: 'PART_REP_ARPTC',
        organisationCode: 'ARPTC',
        profile: 'PARTENAIRE',
        isPrimary: true,
      },
    ],
  },
  {
    email: 'ttl@worldbank.org',
    firstName: 'Laura',
    lastName: 'Walker',
    assignments: [
      {
        subroleCode: 'BAILLEUR_TTL_BM',
        organisationCode: 'BM',
        profile: 'BAILLEUR',
        isPrimary: true,
      },
    ],
  },
  {
    email: 'referent@afd.fr',
    firstName: 'Claire',
    lastName: 'Lefèvre',
    assignments: [
      {
        subroleCode: 'BAILLEUR_REFERENT_AFD',
        organisationCode: 'AFD',
        profile: 'BAILLEUR',
        isPrimary: true,
      },
    ],
  },
  {
    email: 'contact@congofibre.cd',
    firstName: 'Joseph',
    lastName: 'Ilunga',
    assignments: [
      {
        subroleCode: 'SOUM_REPRESENTANT_LEGAL',
        organisationCode: 'CONGO-FIBRE',
        profile: 'SOUMISSIONNAIRE',
        isPrimary: true,
      },
    ],
  },
  {
    email: 'projet@unikin.ac.cd',
    firstName: 'Marie',
    lastName: 'Tshibangu',
    assignments: [
      { subroleCode: 'SBP_EESU', organisationCode: 'UNIKIN', profile: 'SBP', isPrimary: true },
    ],
  },
  {
    email: 'audit@cabinet-kin.cd',
    firstName: 'André',
    lastName: 'Mukasa',
    assignments: [
      {
        subroleCode: 'AUD_CABINET_EXTERNE',
        organisationCode: 'AUDIT-KIN',
        profile: 'AUDITEUR',
        isPrimary: true,
        missionRef: 'AUD-EXT-2026-T1',
      },
    ],
  },
  {
    email: 'copil@presidence.cd',
    firstName: 'Denis',
    lastName: 'Lukusa',
    assignments: [
      {
        subroleCode: 'GOUV_MEMBRE_COPIL',
        organisationCode: 'PRESIDENCE',
        profile: 'GOUVERNANCE',
        isPrimary: true,
      },
    ],
  },
  {
    // Compte à DEUX habilitations — indispensable pour éprouver la bascule
    // d'affectation, et le seul cas où le sélecteur d'habilitation de la
    // connexion a une raison d'exister.
    email: 'double@ptn-rdc.gov.cd',
    firstName: 'Grâce',
    lastName: 'Nkemba',
    assignments: [
      {
        subroleCode: 'UGP_CHARGE_PM',
        organisationCode: 'UGP-PTN',
        profile: 'UGP',
        isPrimary: true,
      },
      {
        subroleCode: 'GOUV_MEMBRE_CTP',
        organisationCode: 'MPTN',
        profile: 'GOUVERNANCE',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      "Refus d'exécution : ce seed crée des comptes dont le mot de passe est public.",
    );
  }

  console.log('\n┌─ PTN-RDC · Comptes de démonstration');
  console.log('│');

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, rounds);

  for (const o of DEV_ORGANISATIONS) {
    await prisma.organisation.upsert({
      where: { code: o.code },
      update: {},
      create: {
        id: idFor.organisation(o.code),
        code: o.code,
        name: o.name,
        fullName: o.fullName,
        type: o.type as OrganisationType,
        isReference: false,
      },
    });
  }
  console.log(`  Organisations tierces  ${DEV_ORGANISATIONS.length} (entreprise, cabinet, EESU)`);

  for (const u of DEV_USERS) {
    const email = u.email.toLowerCase();
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, status: 'ACTIF', mustChangePassword: false },
      create: {
        id: idFor.user(email),
        email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        preferredLanguage: 'FR',
        status: 'ACTIF',
        // Ni changement de mot de passe imposé, ni engagements à signer :
        // ces comptes servent à atteindre un écran, pas à rejouer
        // l'activation.
        mustChangePassword: false,
        onboardingCompletedAt: new Date(),
        codeOfConductSignedAt: new Date(),
        coiDeclaredAt: new Date(),
        dataPrivacyAckAt: new Date(),
      },
    });

    for (const a of u.assignments) {
      const subrole = await prisma.subrole.findUniqueOrThrow({
        where: { code: a.subroleCode },
      });
      const organisation = await prisma.organisation.findUniqueOrThrow({
        where: { code: a.organisationCode },
      });

      await prisma.assignment.upsert({
        where: { id: idFor.assignment(email, a.subroleCode) },
        update: { status: 'ACTIVE' },
        create: {
          id: idFor.assignment(email, a.subroleCode),
          userId: user.id,
          organisationId: organisation.id,
          profile: a.profile,
          subroleId: subrole.id,
          isPrimary: a.isPrimary ?? false,
          componentCode: a.componentCode ?? null,
          missionRef: a.missionRef ?? null,
          status: 'ACTIVE',
          justification: 'Compte de démonstration créé par le seed de développement.',
        },
      });
    }

    const roles = u.assignments.map((a) => a.subroleCode).join(' + ');
    console.log(`  ${email.padEnd(30)} ${roles}`);
  }

  console.log('│');
  console.log(`└─ ${DEV_USERS.length} comptes · mot de passe commun : ${DEV_PASSWORD}\n`);
}

main()
  .catch((error: unknown) => {
    console.error('\n✗ Échec du seed de démonstration :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
