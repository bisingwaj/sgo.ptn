/**
 * PTN-RDC · L'aval du TDR, en démonstration — DÉVELOPPEMENT UNIQUEMENT.
 *
 *   npm run db:seed:marches
 *
 * POURQUOI CE FICHIER EXISTE
 *
 * Le marketplace du soumissionnaire listait cinq appels d'offres écrits en
 * dur. Pour qu'il lise de vraies données, il faut que quelque chose en
 * produise — or la chaîne s'arrête à la transmission du TDR : ni revue, ni
 * non-objection, ni dossier d'appel d'offres n'existent côté serveur.
 *
 * Ce seed FRANCHIT CES ÉTAPES À LA MAIN, sur de vrais dossiers. Il ne
 * fabrique pas de marchés de toutes pièces : il prend les TDR réellement
 * transmis — leur méthode et leur type de revue ont été déduits des seuils
 * en vigueur au moment de la transmission, leur enveloppe est bornée par
 * l'activité PTBA à laquelle ils se rattachent — et les mène jusqu'à la
 * publication.
 *
 * CE QUE CELA VEUT DIRE, ET CE QUE CELA NE VEUT PAS DIRE
 *
 * Les non-objections inscrites ici N'ONT ÉTÉ DÉLIVRÉES PAR PERSONNE. Elles
 * portent `decidedById: null` et leur motif le dit en toutes lettres. Aucun
 * écran ne doit les présenter comme l'acte d'un bailleur : ce serait la
 * faute que ce dépôt proscrit — inventer une donnée qui ressemble à une
 * donnée réelle. Quand la revue et l'ANO existeront pour de bon, ce seed
 * n'aura plus lieu d'être, et c'est le but.
 *
 * Séparé du seed de production, comme `dev-ptba.ts` et pour la même
 * raison : un marché publié est opposable.
 *
 * Identifiants déterministes : rejouable sans doublon, identique chez tous.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { deterministicUuid } from './uuid';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const id = {
  marche: (ref: string) => deterministicUuid(`marche:${ref}`),
  ao: (ref: string) => deterministicUuid(`ao:${ref}`),
  ano: (ref: string) => deterministicUuid(`ano:${ref}`),
  soumission: (ref: string) => deterministicUuid(`soumission:${ref}`),
  organisation: (code: string) => deterministicUuid(`organisation:${code}`),
};

/**
 * Le vivier de candidats.
 *
 * Une seule organisation de type ENTREPRISE existait en base. Un
 * marketplace sans candidats ne se teste pas : on ne voit ni le bornage par
 * organisation, ni l'unicité d'une offre par appel.
 *
 * Ces entreprises n'existent pas. Elles portent des noms plausibles pour la
 * RDC et des numéros RCCM de forme correcte, mais aucune n'est réelle.
 */
const CANDIDATS = [
  {
    code: 'CANDIDAT-TEK',
    name: 'Tekelec Afrique',
    fullName: 'Tekelec Afrique SARL',
    rccm: 'CD/KIN/RCCM/21-B-0338',
  },
  {
    code: 'CANDIDAT-GNI',
    name: 'Groupe Numérique Ibanda',
    fullName: 'Groupe Numérique Ibanda SA',
    rccm: 'CD/BKV/RCCM/20-B-0917',
  },
  {
    code: 'CANDIDAT-SBC',
    name: 'Sud-Kivu Bâtiment & Construction',
    fullName: 'Sud-Kivu Bâtiment & Construction SARL',
    rccm: 'CD/BKV/RCCM/18-B-0442',
  },
  {
    code: 'CANDIDAT-ACS',
    name: 'Afrique Conseil & Systèmes',
    fullName: 'Afrique Conseil & Systèmes SARL',
    rccm: 'CD/KIN/RCCM/22-B-0781',
  },
];

/** Le préfixe d'un avis suit sa méthode : c'est ainsi qu'on le classe. */
function referenceAvis(methode: string, rang: number): string {
  const consultants = ['SFQC', 'SBQ', 'SCBD', 'SMC', 'SQC', 'CI', 'SS'];
  const famille = consultants.includes(methode) ? 'AMI' : methode;
  return `${famille}-2026-${String(rang).padStart(3, '0')}`;
}

/**
 * Le délai de dépôt, compté depuis la publication.
 *
 * Les règlements imposent plus de temps à l'international : constituer un
 * dossier depuis l'étranger et le faire parvenir n'est pas l'affaire d'une
 * entreprise déjà sur place.
 */
function joursDeDepot(methode: string): number {
  if (methode === 'AOI') return 45;
  if (methode === 'AON') return 30;
  if (methode === 'DC') return 14;
  return 21;
}

async function main(): Promise<void> {
  console.log('\n┌─ Aval du TDR — marchés, avis, offres (démonstration)');

  for (const c of CANDIDATS) {
    await prisma.organisation.upsert({
      where: { code: c.code },
      update: { name: c.name, fullName: c.fullName, rccm: c.rccm },
      create: {
        id: id.organisation(c.code),
        code: c.code,
        name: c.name,
        fullName: c.fullName,
        type: 'ENTREPRISE',
        rccm: c.rccm,
        kycLevel: 2,
        isActive: true,
      },
    });
  }
  console.log(`│  ${CANDIDATS.length} entreprises candidates`);

  // On ne prend QUE des dossiers arrêtés : un marché naît d'un TDR transmis,
  // et faire publier un brouillon donnerait à voir une chaîne qui n'est pas
  // celle du projet.
  const dossiers = await prisma.tdr.findMany({
    where: {
      status: { in: ['SOUMIS_UGP', 'VALIDE_UGP', 'ANO_OBTENU'] },
      procurementMethodCode: { not: null },
      budgetTotalUsd: { not: null },
    },
    select: {
      id: true,
      reference: true,
      title: true,
      procurementMethodCode: true,
      reviewType: true,
      budgetTotalUsd: true,
      context: true,
      expertise: true,
    },
    orderBy: { reference: 'asc' },
  });

  if (dossiers.length === 0) {
    console.log('│');
    console.log('└─ Aucun TDR transmis : rien à faire cheminer.');
    console.log('   Transmettez un dossier depuis /tdr/nouveau, puis relancez.\n');
    return;
  }

  const candidats = await prisma.organisation.findMany({
    where: { type: 'ENTREPRISE', isActive: true },
    select: { id: true, name: true },
    orderBy: { code: 'asc' },
  });

  // Une date fixe, et non `new Date()` : deux exécutions doivent donner la
  // même base, sinon les captures d'écran et les essais divergent.
  const REPERE = new Date('2026-08-10T09:00:00.000Z');
  const jours = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

  let rang = 0;
  for (const t of dossiers) {
    rang += 1;
    const methode = t.procurementMethodCode as string;
    const revue = t.reviewType ?? 'PRIOR';

    await prisma.tdr.update({
      where: { id: t.id },
      data: { status: 'ANO_OBTENU', reviewedAt: jours(REPERE, -30) },
    });

    // Le corpus soumet le TDR ET le DAO chacun à sa non-objection : les deux
    // sont inscrites, sinon la chaîne mentirait par omission.
    const etapes: Array<['TDR' | 'DAO', number]> = [
      ['TDR', -28],
      ['DAO', -14],
    ];
    for (const [objet, decalage] of etapes) {
      const ref = `ANO-2026-${String(rang).padStart(3, '0')}-${objet}`;
      await prisma.ano.upsert({
        where: { id: id.ano(ref) },
        update: {},
        create: {
          id: id.ano(ref),
          reference: ref,
          objet,
          objetId: t.id,
          objetRef: t.reference,
          donor: revue === 'PRIOR' ? 'Banque mondiale' : 'AFD',
          decision: 'NON_OBJECTION',
          motif:
            'Donnée de démonstration : aucune non-objection n’a été délivrée. Cet ' +
            'enregistrement existe pour éprouver la chaîne tant que la revue et l’ANO ' +
            'ne sont pas construites.',
          submittedAt: jours(REPERE, decalage - 2),
          decidedAt: jours(REPERE, decalage),
        },
      });
    }

    await prisma.marche.upsert({
      where: { id: id.marche(t.reference) },
      update: { status: 'PUBLIE' },
      create: {
        id: id.marche(t.reference),
        reference: t.reference,
        tdrId: t.id,
        methodCode: methode,
        reviewType: revue,
        status: 'PUBLIE',
        estimatedUsd: t.budgetTotalUsd as never,
        plannedPublicationAt: jours(REPERE, -12),
        plannedAwardAt: jours(REPERE, joursDeDepot(methode) + 30),
      },
    });

    const refAvis = referenceAvis(methode, rang);
    const publie = jours(REPERE, -12);
    const cloture = jours(publie, joursDeDepot(methode));

    // Le résumé vient du dossier : le premier paragraphe du contexte dit
    // l'objet mieux qu'un texte réécrit pour l'occasion.
    const lignes = (t.context ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const resume = lignes[0] ?? 'Consulter le dossier d’appel d’offres.';

    await prisma.appelOffres.upsert({
      where: { id: id.ao(refAvis) },
      update: { closingAt: cloture },
      create: {
        id: id.ao(refAvis),
        reference: refAvis,
        marcheId: id.marche(t.reference),
        objet: t.title,
        resume: resume.slice(0, 600),
        qualifications: (t.expertise ?? '')
          .split('\n')
          .map((l) => l.replace(/^[-–—•*]\s*/, '').trim())
          .filter((l) => l.length > 3)
          .slice(0, 4),
        publishedAt: publie,
        closingAt: cloture,
        openingNote:
          'Ouverture des plis en séance publique au siège de l’UGPTN, le jour de la clôture à 14 h 00.',
      },
    });

    // Quelques offres, pour que « mes soumissions » ait un contenu. Jamais
    // deux du même candidat sur un avis : la contrainte l'interdit, et c'est
    // une irrégularité, pas un cas d'usage.
    const deposants = candidats.filter((_, i) => (i + rang) % 2 === 0).slice(0, 2);
    for (const [n, org] of deposants.entries()) {
      const ref = `OFF-${refAvis}-${n + 1}`;
      await prisma.soumission.upsert({
        where: {
          appelOffresId_organisationId: {
            appelOffresId: id.ao(refAvis),
            organisationId: org.id,
          },
        },
        update: {},
        create: {
          id: id.soumission(ref),
          reference: ref,
          appelOffresId: id.ao(refAvis),
          organisationId: org.id,
          status: 'DEPOSEE',
          // Une offre se situe autour de l'estimation sans la copier : un
          // montant identique à l'enveloppe se remarquerait.
          montantUsd: (Number(t.budgetTotalUsd) * (n === 0 ? 0.94 : 1.06)) as never,
          note: 'Offre de démonstration.',
          submittedAt: jours(publie, 3 + n),
        },
      });
    }

    console.log(
      `│  ${t.reference}  ${methode.padEnd(5)} ${refAvis.padEnd(13)} ` +
        `clôture ${cloture.toISOString().slice(0, 10)}  ${deposants.length} offre(s)`,
    );
  }

  console.log('│');
  console.log(`└─ ${dossiers.length} marchés publiés depuis de vrais TDR`);
  console.log('   Les non-objections inscrites sont des données de démonstration.\n');
}

main()
  .catch((error: unknown) => {
    console.error('\n✗ Échec du seed de l’aval :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
