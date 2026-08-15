-- CreateTable
CREATE TABLE "ptba_year_component_allocations" (
    "id" UUID NOT NULL,
    "ptbaYearId" UUID NOT NULL,
    "componentCode" "ComponentCode" NOT NULL,
    "allocationUsd" DECIMAL(14,2) NOT NULL,
    "idaUsd" DECIMAL(14,2),
    "afdUsd" DECIMAL(14,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ptba_year_component_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ptba_year_component_allocations_componentCode_idx" ON "ptba_year_component_allocations"("componentCode");

-- CreateIndex
CREATE UNIQUE INDEX "ptba_year_component_allocations_ptbaYearId_componentCode_key" ON "ptba_year_component_allocations"("ptbaYearId", "componentCode");

-- AddForeignKey
ALTER TABLE "ptba_year_component_allocations" ADD CONSTRAINT "ptba_year_component_allocations_ptbaYearId_fkey" FOREIGN KEY ("ptbaYearId") REFERENCES "ptba_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptba_year_component_allocations" ADD CONSTRAINT "ptba_year_component_allocations_componentCode_fkey" FOREIGN KEY ("componentCode") REFERENCES "components"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

