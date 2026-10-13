import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "docs/**",
      "src/catalogs.generated.ts",
      "src/names-2525d.generated.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs", "examples/**/*.mjs"],
    languageOptions: {
      globals: {
        URL: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
      },
    },
  },
  eslintConfigPrettier,
);
