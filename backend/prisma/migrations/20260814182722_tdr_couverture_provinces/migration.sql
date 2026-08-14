-- Couverture géographique d'un TDR : de une province à plusieurs.
--
-- Un marché porte souvent sur plusieurs provinces — un backbone en traverse
-- trois, une formation en dessert dix. La clé unique obligeait à n'en retenir
-- qu'une, ou à écrire « national » pour un marché qui ne l'est pas.
--
-- La table de liaison est créée et REMPLIE avant que la colonne ne parte :
-- cinq dossiers portent déjà une province, et les perdre pour un changement
-- de forme serait inacceptable.

CREATE TABLE "tdr_provinces" (
    "tdrId" UUID NOT NULL,
    "provinceCode" TEXT NOT NULL,
    CONSTRAINT "tdr_provinces_pkey" PRIMARY KEY ("tdrId", "provinceCode")
);

CREATE INDEX "tdr_provinces_provinceCode_idx" ON "tdr_provinces"("provinceCode");

ALTER TABLE "tdr_provinces"
    ADD CONSTRAINT "tdr_provinces_tdrId_fkey"
    FOREIGN KEY ("tdrId") REFERENCES "tdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tdr_provinces"
    ADD CONSTRAINT "tdr_provinces_provinceCode_fkey"
    FOREIGN KEY ("provinceCode") REFERENCES "provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reprise des couvertures existantes, avant toute suppression.
INSERT INTO "tdr_provinces" ("tdrId", "provinceCode")
SELECT "id", "provinceCode" FROM "tdrs" WHERE "provinceCode" IS NOT NULL;

ALTER TABLE "tdrs" DROP CONSTRAINT IF EXISTS "tdrs_provinceCode_fkey";
ALTER TABLE "tdrs" DROP COLUMN "provinceCode";
