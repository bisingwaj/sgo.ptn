-- CreateEnum
CREATE TYPE "NatureDocument" AS ENUM ('MEP', 'PPSD', 'PLAN_PASSATION', 'CGES', 'CPR', 'PMPP', 'PGMO', 'PEES', 'PPA', 'REGLEMENT_BAILLEUR', 'ACCORD_FINANCEMENT', 'MANUEL', 'PROCES_VERBAL', 'AUTRE');

-- CreateTable
CREATE TABLE "documents_reference" (
    "id" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "nature" "NatureDocument" NOT NULL,
    "resume" TEXT,
    "version" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" UUID,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_reference_nature_idx" ON "documents_reference"("nature");

-- CreateIndex
CREATE INDEX "documents_reference_isActive_idx" ON "documents_reference"("isActive");
