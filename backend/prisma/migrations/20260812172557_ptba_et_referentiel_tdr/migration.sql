-- CreateEnum
CREATE TYPE "PtbaStatus" AS ENUM ('BROUILLON', 'VALIDE', 'CLOS');

-- CreateEnum
CREATE TYPE "ProcurementCategory" AS ENUM ('TRAVAUX', 'FOURNITURES', 'SERVICES_NON_CONSULTANTS', 'SERVICES_CONSULTANTS');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('PRIOR', 'POST');

-- CreateEnum
CREATE TYPE "TdrOrigin" AS ENUM ('UGP', 'PARTENAIRE', 'BAILLEUR', 'SBP');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('BROUILLON', 'PUBLIE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "ClauseCategory" AS ENUM ('REG', 'TECH', 'CONF', 'SAFE', 'GOV');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('FAIBLE', 'MODERE', 'SUBSTANTIEL', 'ELEVE');

-- CreateTable
CREATE TABLE "ptba_years" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "PtbaStatus" NOT NULL DEFAULT 'BROUILLON',
    "validatedAt" TIMESTAMP(3),
    "validatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ptba_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptba_activities" (
    "id" UUID NOT NULL,
    "ptbaYearId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "componentCode" "ComponentCode" NOT NULL,
    "subComponent" TEXT,
    "envelopeUsd" DECIMAL(14,2) NOT NULL,
    "idaUsd" DECIMAL(14,2),
    "afdUsd" DECIMAL(14,2),
    "provinceCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ptba_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_methods" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "ProcurementCategory" NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_methods_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "procurement_thresholds" (
    "id" UUID NOT NULL,
    "methodCode" TEXT NOT NULL,
    "category" "ProcurementCategory" NOT NULL,
    "minUsd" DECIMAL(14,2),
    "maxUsd" DECIMAL(14,2),
    "reviewType" "ReviewType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tdr_types" (
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" INTEGER NOT NULL,
    "familyLabel" TEXT NOT NULL,
    "defaultMethodCode" TEXT,
    "allowedOrigins" "TdrOrigin"[],
    "stepCount" INTEGER NOT NULL DEFAULT 5,
    "contextTemplate" TEXT,
    "requiresPges" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tdr_types_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "clause_templates" (
    "id" UUID NOT NULL,
    "familyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tdrTypeCode" TEXT,
    "category" "ClauseCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'BROUILLON',
    "effectiveFrom" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clause_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_templates" (
    "id" UUID NOT NULL,
    "familyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tdrTypeCode" TEXT,
    "label" TEXT NOT NULL,
    "measure" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'BROUILLON',
    "effectiveFrom" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicator_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_templates" (
    "id" UUID NOT NULL,
    "familyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tdrTypeCode" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mitigation" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'BROUILLON',
    "effectiveFrom" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ptba_years_year_key" ON "ptba_years"("year");

-- CreateIndex
CREATE INDEX "ptba_activities_componentCode_idx" ON "ptba_activities"("componentCode");

-- CreateIndex
CREATE UNIQUE INDEX "ptba_activities_ptbaYearId_code_key" ON "ptba_activities"("ptbaYearId", "code");

-- CreateIndex
CREATE INDEX "procurement_methods_category_idx" ON "procurement_methods"("category");

-- CreateIndex
CREATE INDEX "procurement_thresholds_category_idx" ON "procurement_thresholds"("category");

-- CreateIndex
CREATE UNIQUE INDEX "tdr_types_slug_key" ON "tdr_types"("slug");

-- CreateIndex
CREATE INDEX "tdr_types_family_idx" ON "tdr_types"("family");

-- CreateIndex
CREATE INDEX "clause_templates_tdrTypeCode_status_idx" ON "clause_templates"("tdrTypeCode", "status");

-- CreateIndex
CREATE INDEX "clause_templates_category_idx" ON "clause_templates"("category");

-- CreateIndex
CREATE UNIQUE INDEX "clause_templates_familyKey_version_key" ON "clause_templates"("familyKey", "version");

-- CreateIndex
CREATE INDEX "indicator_templates_tdrTypeCode_status_idx" ON "indicator_templates"("tdrTypeCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "indicator_templates_familyKey_version_key" ON "indicator_templates"("familyKey", "version");

-- CreateIndex
CREATE INDEX "risk_templates_tdrTypeCode_status_idx" ON "risk_templates"("tdrTypeCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "risk_templates_familyKey_version_key" ON "risk_templates"("familyKey", "version");

-- AddForeignKey
ALTER TABLE "ptba_activities" ADD CONSTRAINT "ptba_activities_ptbaYearId_fkey" FOREIGN KEY ("ptbaYearId") REFERENCES "ptba_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptba_activities" ADD CONSTRAINT "ptba_activities_componentCode_fkey" FOREIGN KEY ("componentCode") REFERENCES "components"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptba_activities" ADD CONSTRAINT "ptba_activities_provinceCode_fkey" FOREIGN KEY ("provinceCode") REFERENCES "provinces"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_thresholds" ADD CONSTRAINT "procurement_thresholds_methodCode_fkey" FOREIGN KEY ("methodCode") REFERENCES "procurement_methods"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tdr_types" ADD CONSTRAINT "tdr_types_defaultMethodCode_fkey" FOREIGN KEY ("defaultMethodCode") REFERENCES "procurement_methods"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_templates" ADD CONSTRAINT "clause_templates_tdrTypeCode_fkey" FOREIGN KEY ("tdrTypeCode") REFERENCES "tdr_types"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_templates" ADD CONSTRAINT "indicator_templates_tdrTypeCode_fkey" FOREIGN KEY ("tdrTypeCode") REFERENCES "tdr_types"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_templates" ADD CONSTRAINT "risk_templates_tdrTypeCode_fkey" FOREIGN KEY ("tdrTypeCode") REFERENCES "tdr_types"("code") ON DELETE SET NULL ON UPDATE CASCADE;
