-- AlterTable
ALTER TABLE "tdrs" ADD COLUMN     "beneficiaryOrganisationId" UUID;

-- AddForeignKey
ALTER TABLE "tdrs" ADD CONSTRAINT "tdrs_beneficiaryOrganisationId_fkey" FOREIGN KEY ("beneficiaryOrganisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
