-- CreateEnum
CREATE TYPE "TdrStatus" AS ENUM ('BROUILLON', 'SOUMIS_UGP', 'REVUE_UGP', 'RETOURNE', 'VALIDE_UGP', 'ANO_EN_COURS', 'ANO_OBTENU', 'ANO_REFUSE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "EsCategory" AS ENUM ('FAIBLE', 'MODERE', 'SUBSTANTIEL', 'ELEVE');

-- CreateTable
CREATE TABLE "tdrs" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "ptbaActivityId" UUID,
    "tdrTypeCode" TEXT NOT NULL,
    "origin" "TdrOrigin" NOT NULL,
    "authorId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TdrStatus" NOT NULL DEFAULT 'BROUILLON',
    "context" TEXT,
    "justification" TEXT,
    "beneficiaries" TEXT,
    "approach" TEXT,
    "methodology" TEXT,
    "constraints" TEXT,
    "startDate" TIMESTAMP(3),
    "durationMonths" INTEGER,
    "provinceCode" TEXT,
    "expertise" TEXT,
    "keyProfiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budgetTotalUsd" DECIMAL(14,2),
    "budgetIdaUsd" DECIMAL(14,2),
    "budgetAfdUsd" DECIMAL(14,2),
    "budgetGovUsd" DECIMAL(14,2),
    "procurementMethodCode" TEXT,
    "reviewType" "ReviewType",
    "esCategory" "EsCategory",
    "esRisks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consentMepAt" TIMESTAMP(3),
    "consentRgpdAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tdrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tdr_objectives" (
    "id" UUID NOT NULL,
    "tdrId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tdr_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tdr_deliverables" (
    "id" UUID NOT NULL,
    "tdrId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT,
    "deadline" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tdr_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tdr_clauses" (
    "id" UUID NOT NULL,
    "tdrId" UUID NOT NULL,
    "sourceFamilyKey" TEXT,
    "sourceVersion" INTEGER,
    "category" "ClauseCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tdr_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tdr_indicators" (
    "id" UUID NOT NULL,
    "tdrId" UUID NOT NULL,
    "sourceFamilyKey" TEXT,
    "sourceVersion" INTEGER,
    "label" TEXT NOT NULL,
    "measure" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tdr_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tdr_risks" (
    "id" UUID NOT NULL,
    "tdrId" UUID NOT NULL,
    "sourceFamilyKey" TEXT,
    "sourceVersion" INTEGER,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mitigation" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tdr_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tdr_versions" (
    "id" UUID NOT NULL,
    "tdrId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "submittedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tdr_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tdr_sequences" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tdr_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "tdrs_reference_key" ON "tdrs"("reference");

-- CreateIndex
CREATE INDEX "tdrs_status_idx" ON "tdrs"("status");

-- CreateIndex
CREATE INDEX "tdrs_authorId_idx" ON "tdrs"("authorId");

-- CreateIndex
CREATE INDEX "tdrs_organisationId_idx" ON "tdrs"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "tdr_versions_tdrId_version_key" ON "tdr_versions"("tdrId", "version");

-- AddForeignKey
ALTER TABLE "tdrs" ADD CONSTRAINT "tdrs_ptbaActivityId_fkey" FOREIGN KEY ("ptbaActivityId") REFERENCES "ptba_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdrs" ADD CONSTRAINT "tdrs_tdrTypeCode_fkey" FOREIGN KEY ("tdrTypeCode") REFERENCES "tdr_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdrs" ADD CONSTRAINT "tdrs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdrs" ADD CONSTRAINT "tdrs_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdrs" ADD CONSTRAINT "tdrs_provinceCode_fkey" FOREIGN KEY ("provinceCode") REFERENCES "provinces"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdrs" ADD CONSTRAINT "tdrs_procurementMethodCode_fkey" FOREIGN KEY ("procurementMethodCode") REFERENCES "procurement_methods"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdr_objectives" ADD CONSTRAINT "tdr_objectives_tdrId_fkey" FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdr_deliverables" ADD CONSTRAINT "tdr_deliverables_tdrId_fkey" FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdr_clauses" ADD CONSTRAINT "tdr_clauses_tdrId_fkey" FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdr_indicators" ADD CONSTRAINT "tdr_indicators_tdrId_fkey" FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdr_risks" ADD CONSTRAINT "tdr_risks_tdrId_fkey" FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdr_versions" ADD CONSTRAINT "tdr_versions_tdrId_fkey" FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
