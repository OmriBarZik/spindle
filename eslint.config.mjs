import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import jsxA11y from "eslint-plugin-jsx-a11y";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  // Next.js: React, React Hooks (incl. React Compiler rules), Core Web Vitals, jsx-a11y basics.
  ...nextVitals,
  ...nextTs,

  // Accessibility: the full strict jsx-a11y set (Next only turns on a handful of rules).
  {
    files: ["**/*.{jsx,tsx}"],
    rules: jsxA11y.flatConfigs.strict.rules,
  },

  // Type-aware TypeScript rules for app code.
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      // `type` for object shapes is the house style.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },

  // General best practices.
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "simple-import-sort/imports": [
        "error",
        // One block: side effects, packages, then `@/` aliases, then relative imports.
        { groups: [["^\\u0000", "^node:", "^@?\\w", "^@/", "^\\."]] },
      ],
      "simple-import-sort/exports": "error",
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-implicit-coercion": "error",
      "no-param-reassign": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "react/jsx-no-useless-fragment": "error",
      "react/self-closing-comp": "error",
      "react/jsx-boolean-value": "error",
      "react/no-array-index-key": "error",
    },
  },

  // Tests may use non-null assertions and reassign the save they're playing through.
  {
    files: ["**/__tests__/**", "src/test/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-param-reassign": "off",
    },
  },

  // Node scripts print their results.
  {
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },

  // Formatting is Prettier's job: turn off every rule that would fight it. Keep last.
  prettier,

  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
