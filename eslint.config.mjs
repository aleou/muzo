import js from "@eslint/js";
import globals from "globals";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: ["node_modules", ".next", "dist", "build", "coverage", "packages/db/prisma/migrations"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    },
  },
];
