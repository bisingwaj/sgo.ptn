#!/usr/bin/env node
/**
 * Détoure le logo UGPTN : fond blanc → transparent.
 *
 *   node scripts/logo-transparent.mjs public/brand/ugptn-logo-source.png
 *
 * Produit deux fichiers dans public/brand/ :
 *
 *   ugptn-logo.png        fond transparent, couleurs d'origine
 *                         → fonds clairs (page de connexion en thème clair,
 *                           impression, documents)
 *
 *   ugptn-logo-light.png  fond transparent, lettrage éclairci
 *                         → fonds sombres (bandeau Carbon #161616, thème g100)
 *
 * Pourquoi deux fichiers : le lettrage « ugptn » est anthracite. Détouré mais
 * laissé tel quel, il devient illisible sur le bandeau sombre. La seconde
 * variante n'éclaircit que les pixels sombres et préserve le bleu de la carte,
 * qui reste lisible sur les deux fonds.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** Au-delà de ce seuil sur les trois canaux, le pixel est considéré comme fond. */
const WHITE_THRESHOLD = 238;
/** En deçà, le pixel appartient au lettrage sombre. */
const DARK_THRESHOLD = 110;

const source = process.argv[2];
if (!source) {
  console.error("Usage : node scripts/logo-transparent.mjs <fichier-source>");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "public", "brand");

async function build() {
  const input = await readFile(source);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const colour = Buffer.from(data);
  const light = Buffer.from(data);

  let cleared = 0;
  for (let i = 0; i < data.length; i += channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];

    // Fond : blanc ou quasi blanc → totalement transparent.
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      colour[i + 3] = 0;
      light[i + 3] = 0;
      cleared += 1;
      continue;
    }

    // Variante claire : le lettrage sombre passe en blanc, le bleu est conservé.
    if (r <= DARK_THRESHOLD && g <= DARK_THRESHOLD && b <= DARK_THRESHOLD) {
      light[i] = 255;
      light[i + 1] = 255;
      light[i + 2] = 255;
    }
  }

  const raw = { raw: { width, height, channels } };

  await sharp(colour, raw).png().toFile(path.join(outDir, "ugptn-logo.png"));
  await sharp(light, raw).png().toFile(path.join(outDir, "ugptn-logo-light.png"));

  const total = width * height;
  console.log(`Source        ${source} (${width}×${height})`);
  console.log(`Fond retiré   ${cleared} pixels sur ${total} (${((cleared / total) * 100).toFixed(1)} %)`);
  console.log(`Écrit         public/brand/ugptn-logo.png`);
  console.log(`Écrit         public/brand/ugptn-logo-light.png`);

  if (cleared / total < 0.1) {
    console.warn(
      "\n⚠  Moins de 10 % du fichier a été détouré. La source a peut-être déjà un fond\n" +
        "   transparent, ou son fond n'est pas blanc. Vérifiez le rendu avant de commiter.",
    );
  }
}

build().catch((error) => {
  console.error("Échec du détourage :", error.message);
  process.exit(1);
});
