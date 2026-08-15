-- Couverture géographique multiple d'une activité PTBA.
--
-- Le champ unique obligeait à choisir une province au détriment des autres :
-- un backbone Goma–Bukavu en traverse trois. Aligné sur `tdr_provinces`, qui
-- porte déjà cette forme depuis la couverture géographique des TDR.
--
-- L'ORDRE COMPTE : la table est créée et la donnée existante reprise AVANT
-- que la colonne ne disparaisse. Deux activités portent aujourd'hui une
-- province ; les perdre ferait passer un backbone provincial pour une
-- couverture nationale, ce qui est faux et invisible.

-- 1. La table de liaison
CREATE TABLE "ptba_activity_provinces" (
    "activityId" UUID NOT NULL,
    "provinceCode" TEXT NOT NULL,

    CONSTRAINT "ptba_activity_provinces_pkey" PRIMARY KEY ("activityId","provinceCode")
);

CREATE INDEX "ptba_activity_provinces_provinceCode_idx" ON "ptba_activity_provinces"("provinceCode");

ALTER TABLE "ptba_activity_provinces" ADD CONSTRAINT "ptba_activity_provinces_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "ptba_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ptba_activity_provinces" ADD CONSTRAINT "ptba_activity_provinces_provinceCode_fkey"
    FOREIGN KEY ("provinceCode") REFERENCES "provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Reprise de la donnée existante
INSERT INTO "ptba_activity_provinces" ("activityId", "provinceCode")
SELECT "id", "provinceCode"
FROM "ptba_activities"
WHERE "provinceCode" IS NOT NULL;

-- 3. Le champ unique disparaît seulement maintenant
ALTER TABLE "ptba_activities" DROP CONSTRAINT "ptba_activities_provinceCode_fkey";
ALTER TABLE "ptba_activities" DROP COLUMN "provinceCode";
