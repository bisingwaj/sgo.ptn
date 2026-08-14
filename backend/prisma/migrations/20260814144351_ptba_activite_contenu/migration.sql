-- CreateTable
CREATE TABLE "ptba_activity_objectives" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "criteria" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ptba_activity_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptba_activity_deliverables" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT,
    "deadline" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ptba_activity_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptba_activity_indicators" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "measure" TEXT,
    "target" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ptba_activity_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptba_activity_risks" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "mitigation" TEXT,
    "level" "EsCategory",
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ptba_activity_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptba_activity_clauses" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ptba_activity_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ptba_activity_objectives_activityId_idx" ON "ptba_activity_objectives"("activityId");

-- CreateIndex
CREATE INDEX "ptba_activity_deliverables_activityId_idx" ON "ptba_activity_deliverables"("activityId");

-- CreateIndex
CREATE INDEX "ptba_activity_indicators_activityId_idx" ON "ptba_activity_indicators"("activityId");

-- CreateIndex
CREATE INDEX "ptba_activity_risks_activityId_idx" ON "ptba_activity_risks"("activityId");

-- CreateIndex
CREATE INDEX "ptba_activity_clauses_activityId_idx" ON "ptba_activity_clauses"("activityId");

-- AddForeignKey
ALTER TABLE "ptba_activity_objectives" ADD CONSTRAINT "ptba_activity_objectives_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ptba_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptba_activity_deliverables" ADD CONSTRAINT "ptba_activity_deliverables_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ptba_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptba_activity_indicators" ADD CONSTRAINT "ptba_activity_indicators_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ptba_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptba_activity_risks" ADD CONSTRAINT "ptba_activity_risks_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ptba_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptba_activity_clauses" ADD CONSTRAINT "ptba_activity_clauses_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ptba_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
