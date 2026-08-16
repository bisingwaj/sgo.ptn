-- CreateTable
CREATE TABLE "tdr_attachments" (
    "id" UUID NOT NULL,
    "tdrId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "uploadedById" UUID,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tdr_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tdr_attachments_tdrId_idx" ON "tdr_attachments"("tdrId");

-- AddForeignKey
ALTER TABLE "tdr_attachments" ADD CONSTRAINT "tdr_attachments_tdrId_fkey" FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
