import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files: ["src/**/*.{ts,tsx}"],
    // NB : `eslint-config-next/core-web-vitals` enregistre déjà le plugin
    // jsx-a11y. Le réenregistrer ici ferait échouer toute la configuration
    // (« Cannot redefine plugin »). On se contente donc d'en durcir les règles.
    rules: {
      // ----- Accessibilité -----
      // Le public visé (agents publics, souvent seniors, contexte
      // gouvernemental soumis au WCAG via le MEP) rend ces règles
      // bloquantes et non indicatives.
      ...jsxA11y.configs.recommended.rules,
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",

      // ----- Garde-fous de l'échelle typographique -----
      // L'ancienne version comptait 265 déclarations en 11px, 87 en 10px
      // et 10 en 9px. On empêche leur réapparition sous forme de valeurs
      // Tailwind arbitraires. Utiliser text-caption (12px) au minimum.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='className'] > Literal[value=/text-\\[(?:[0-9]|1[0-1])px\\]/]",
          message:
            "Taille de police sous le plancher de 12px. Utiliser text-caption / text-body / text-body-lg (voir src/styles/tailwind.css).",
        },
        {
          selector:
            "JSXAttribute[name.name='className'] > Literal[value=/\\b(?:h|max-h|min-h)-\\[calc\\(100vh/]",
          message:
            "Hauteur figée sur la fenêtre : s'effondre à 150 % de zoom navigateur. Utiliser la classe utilitaire `scroll-region` dans un parent flex/grid.",
        },
      ],
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "backend/**",
    "_archive_v1/**",
    "_design_prep/**",
  ]),
]);

export default eslintConfig;
