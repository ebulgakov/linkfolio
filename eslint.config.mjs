// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import eslintConfigPrettier from "eslint-config-prettier/flat";
import storybook from "eslint-plugin-storybook";

import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  ...storybook.configs["flat/recommended"],
  {
    rules: {
      "no-multiple-empty-lines": ["error", { max: 1 }],
      // Ensures all imports are at the top of the file
      "import/first": "error",
      // Enforce a convention in the order of imports
      "import/order": [
        "error",
        {
          groups: [
            "builtin", // Node.js built-in modules (fs, path, etc.)
            "external", // External packages (react, lodash, etc.)
            "internal", // Internal project modules
            "parent", // Imports from parent directories (../)
            "sibling", // Imports from sibling directories (./)
            "index", // Imports from current directory index (./)
            "object", // Object imports (TypeScript only)
            "type" // Type imports (Flow/TypeScript only)
          ],
          "newlines-between": "always", // Add a newline between groups
          alphabetize: {
            order: "asc",
            caseInsensitive: true
          }
        }
      ],
      // Guardrail against sprawling functions; test files are exempt below
      // since arrange-act-assert blocks legitimately run long.
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true }
      ]
    }
  },
  {
    // Tests exempt: assertion-heavy blocks aren't a function-length smell.
    files: ["**/__tests__/**", "**/*.stories.ts"],
    rules: {
      "max-lines-per-function": "off"
    }
  },
  {
    // Grandfathered: all-in-one form/upload composables predate this rule
    // and intentionally keep related logic together (see CLAUDE.md's
    // features/ FSD section). Shrink this list rather than growing it.
    files: [
      "app/features/collection-form/model/use-collection-form.ts",
      "app/features/link-form/model/use-link-form.ts",
      "app/shared/lib/use-image-upload.ts"
    ],
    rules: {
      "max-lines-per-function": "off"
    }
  },
  eslintConfigPrettier // must stay last so it can override stylistic rules
);
