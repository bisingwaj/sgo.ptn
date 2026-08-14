#!/usr/bin/env node
/**
 * Détoure les logos institutionnels : fond blanc → transparent.
 *
 *   node scripts/logo-transparent.mjs <source> <destination> [--mode=MODE]
 *
 * Modes :
 *
 *   couleur     Retire le fond blanc, conserve les couleurs d'origine.
 *               → fonds clairs (impression, thème clair)
 *
 *   clair       Retire le fond blanc et éclaircit les pixels sombres.
 *               → fonds sombres, quand les couleurs de la marque comptent
 *                 (cas du logo UGPTN : le bleu de la carte est conservé)
 *
 *   mono-blanc  Aplat blanc dont l'opacité suit l'obscurité du pixel source.
 *               → marques secondaires sur fond sombre. Une image en aplat se
 *                 lit comme un signe, pas comme une illustration : c'est ce
 *                 qui permet à un logo partenaire d'accompagner la marque
 *                 principale sans lui disputer l'attention.
 *
 * Le script part du principe que le fond est blanc et opaque — c'est le cas
 * des trois fichiers fournis, blancs à 70–85 %.
 */

import path from "node:path";
import sharp from "sharp";

/**
 * Détourage par RAMPE plutôt que par seuil unique.
 *
 * Un seuil binaire pose un dilemme insoluble : placé haut, il laisse passer le
 * voile de compression des JPEG — la source UGPTN porte ainsi une salissure de
 * numérisation à 230 de luminosité, invisible sur blanc mais bien nette une
 * fois posée sur le bandeau sombre. Placé bas, il ronge l'anticrénelage et
 * découpe les lettres en escalier.
 *
 * La rampe résout les deux : au-dessus de BG_OPAQUE le pixel est du fond et
 * disparaît, en dessous de BG_SOLID il appartient au tracé, et entre les deux
 * l'opacité varie continûment — ce qui est exactement ce qu'est un bord
 * anticrénelé.
 */
const BG_OPAQUE = 228;
const BG_SOLID = 195;
/** En deçà, le pixel appartient au tracé sombre. */
const DARK_THRESHOLD = 120;

const [source, destination, ...flags] = process.argv.slice(2);
const mode = flags.find((f) => f.startsWith("--mode="))?.split("=")[1] ?? "couleur";
/**
 * Hauteur de sortie, en pixels.
 *
 * Les sources font 384 à 644 px de haut pour un affichage de 32 à 104 px :
 * livrer l'original reviendrait à faire télécharger un demi-mégaoctet pour
 * une vignette. On vise le double de la taille d'affichage, ce qui couvre les
 * écrans à densité 2×, et rien de plus.
 */
const targetHeight = Number(flags.find((f) => f.startsWith("--height="))?.split("=")[1] ?? 0);

if (!source || !destination) {
  console.error(
    "Usage : node scripts/logo-transparent.mjs <source> <destination> [--mode=couleur|clair|mono-blanc]",
  );
  process.exit(1);
}

if (!["couleur", "clair", "mono-blanc"].includes(mode)) {
  console.error(`Mode inconnu : ${mode}`);
  process.exit(1);
}

/** Luminance perçue — pondération ITU-R BT.601. */
function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function build() {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.from(data);
  let cleared = 0;

  for (let i = 0; i < data.length; i += channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    // Le canal le plus sombre décide : un aplat coloré saturé (le bleu de la
    // carte, le rouge des armoiries) garde ainsi une opacité pleine, alors
    // qu'une moyenne l'aurait rendu partiellement transparent.
    const darkest = Math.min(r, g, b);
    const isBackground = darkest >= BG_OPAQUE;

    if (mode === "mono-blanc") {
      // L'opacité suit l'obscurité : un trait noir devient blanc opaque, le
      // fond blanc devient transparent, et les bords restent lissés — c'est
      // ce qui évite l'escalier disgracieux d'un simple seuillage.
      const alpha = Math.round(
        Math.max(0, Math.min(1, (BG_OPAQUE - luminance(r, g, b)) / (BG_OPAQUE - BG_SOLID))) * 255,
      );
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = Math.max(0, Math.min(255, alpha));
      if (alpha < 16) cleared += 1;
      continue;
    }

    if (isBackground) {
      out[i + 3] = 0;
      cleared += 1;
      continue;
    }

    // Zone de transition : opacité proportionnelle, bords conservés.
    if (darkest > BG_SOLID) {
      out[i + 3] = Math.round(((BG_OPAQUE - darkest) / (BG_OPAQUE - BG_SOLID)) * 255);
    }

    if (mode === "clair" && r <= DARK_THRESHOLD && g <= DARK_THRESHOLD && b <= DARK_THRESHOLD) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
    }
  }

  const pipeline = sharp(out, { raw: { width, height, channels } });
  if (targetHeight > 0 && targetHeight < height) {
    pipeline.resize({ height: targetHeight, fit: "inside", withoutEnlargement: true });
  }
  const { size } = await pipeline.png({ compressionLevel: 9, palette: true }).toFile(destination);

  const total = width * height;
  console.log(
    `  ${path.basename(source).padEnd(16)} → ${path.basename(destination).padEnd(26)} ` +
      `${String(mode).padEnd(11)} ${width}×${height} · fond retiré ${((cleared / total) * 100).toFixed(0)} % · ${(size / 1024).toFixed(0)} Ko`,
  );

  if (mode !== "mono-blanc" && cleared / total < 0.1) {
    console.warn(
      "  ⚠  Moins de 10 % détouré : le fond n'est peut-être pas blanc, ou déjà transparent.",
    );
  }
}

build().catch((error) => {
  console.error("Échec du détourage :", error.message);
  process.exit(1);
});
