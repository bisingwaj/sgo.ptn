-- CreateEnum
CREATE TYPE "MarcheStatus" AS ENUM ('PLANIFIE', 'DAO_PREPARATION', 'DAO_ANO', 'PUBLIE', 'CLOTURE', 'EVALUATION', 'ATTRIBUE', 'CONTRACTUALISE', 'INFRUCTUEUX');

-- CreateEnum
CREATE TYPE "SoumissionStatus" AS ENUM ('BROUILLON', 'DEPOSEE', 'IRRECEVABLE', 'RECEVABLE', 'ATTRIBUTAIRE', 'ECARTEE');

-- CreateEnum
CREATE TYPE "AnoObjet" AS ENUM ('TDR', 'LISTE_RESTREINTE', 'DAO', 'RAPPORT_EVALUATION', 'PROJET_CONTRAT', 'AVENANT');

-- CreateEnum
CREATE TYPE "AnoDecision" AS ENUM ('EN_COURS', 'NON_OBJECTION', 'REFUS', 'DEMANDE_MODIFICATION');

-- CreateTable
CREATE TABLE "marches" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "tdrId" UUID NOT NULL,
    "methodCode" TEXT NOT NULL,
    "reviewType" "ReviewType" NOT NULL,
    "status" "MarcheStatus" NOT NULL DEFAULT 'PLANIFIE',
    "estimatedUsd" DECIMAL(14,2) NOT NULL,
    "plannedPublicationAt" TIMESTAMP(3),
    "plannedAwardAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appels_offres" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "marcheId" UUID NOT NULL,
    "objet" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "closingAt" TIMESTAMP(3) NOT NULL,
    "openingNote" TEXT,
    "publishedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appels_offres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soumissions" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "appelOffresId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "status" "SoumissionStatus" NOT NULL DEFAULT 'BROUILLON',
    "montantUsd" DECIMAL(14,2),
    "note" TEXT,
    "submittedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soumissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anos" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "objet" "AnoObjet" NOT NULL,
    "objetId" UUID NOT NULL,
    "objetRef" TEXT NOT NULL,
    "donor" TEXT NOT NULL,
    "decision" "AnoDecision" NOT NULL DEFAULT 'EN_COURS',
    "motif" TEXT,
    "submittedById" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "anos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marches_reference_key" ON "marches"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "marches_tdrId_key" ON "marches"("tdrId");

-- CreateIndex
CREATE INDEX "marches_status_idx" ON "marches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "appels_offres_reference_key" ON "appels_offres"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "appels_offres_marcheId_key" ON "appels_offres"("marcheId");

-- CreateIndex
CREATE INDEX "appels_offres_closingAt_idx" ON "appels_offres"("closingAt");

-- CreateIndex
CREATE UNIQUE INDEX "soumissions_reference_key" ON "soumissions"("reference");

-- CreateIndex
CREATE INDEX "soumissions_organisationId_idx" ON "soumissions"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "soumissions_appelOffresId_organisationId_key" ON "soumissions"("appelOffresId", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "anos_reference_key" ON "anos"("reference");

-- CreateIndex
CREATE INDEX "anos_objet_objetId_idx" ON "anos"("objet", "objetId");

-- CreateIndex
CREATE INDEX "anos_decision_idx" ON "anos"("decision");

-- AddForeignKey
ALTER TABLE "marches" ADD CONSTRAINT "marches_tdrId_fkey" FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marches" ADD CONSTRAINT "marches_methodCode_fkey" FOREIGN KEY ("methodCode") REFERENCES "procurement_methods"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appels_offres" ADD CONSTRAINT "appels_offres_marcheId_fkey" FOREIGN KEY ("marcheId") REFERENCES "marches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soumissions" ADD CONSTRAINT "soumissions_appelOffresId_fkey" FOREIGN KEY ("appelOffresId") REFERENCES "appels_offres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soumissions" ADD CONSTRAINT "soumissions_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
