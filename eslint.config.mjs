// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import eslintConfigPrettier from "eslint-config-prettier/flat";
import boundaries from "eslint-plugin-boundaries";
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
      ],
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // Tests exempt: assertion-heavy blocks aren't a function-length smell.
    files: ["**/__tests__/**", "**/*.stories.ts"],
    rules: {
      "max-lines-per-function": "off",
      "max-lines": "off"
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
  {
    // FSD layer boundaries (app/ only) — see CLAUDE.md's FSD layer section.
    // boundaries/dependencies policies evaluate sequentially with the LAST
    // matching policy winning, so the test-file escape hatch must stay last.
    files: ["app/**/*.ts", "app/**/*.vue"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app-ui", pattern: "app/ui/**" },
        { type: "pages", pattern: "app/pages/**" },
        { type: "middleware", pattern: "app/middleware/**" },
        { type: "plugins", pattern: "app/plugins/**" },
        { type: "feature", pattern: "app/features/*", capture: ["slice"] },
        // Reserved, no matches yet — widgets/ was removed (see CLAUDE.md)
        // but may return if a future case genuinely needs it.
        { type: "widget", pattern: "app/widgets/*", capture: ["slice"] },
        { type: "shared-api", pattern: "app/shared/api/**" },
        { type: "shared-lib", pattern: "app/shared/lib/**" },
        { type: "shared-ui", pattern: "app/shared/ui/**" },
        { type: "shared-testing", pattern: "app/shared/testing/**" }
      ],
      "boundaries/files": [{ pattern: "app/app.vue", category: "app-root" }],
      "import/resolver": {
        typescript: {
          // Explicit path: the repo's own tsconfig.json only has project
          // references, not `paths` — auto-discovery could resolve the
          // wrong tsconfig and make every `~/` import look unresolvable.
          project: "./.nuxt/tsconfig.app.json",
          alwaysTryTypes: true
        }
      }
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { file: { categories: "app-root" } },
              allow: { to: { element: { type: "app-ui" } } }
            },

            {
              from: { element: { type: "pages" } },
              allow: { to: { element: { type: "app-ui" } } }
            },
            {
              from: { element: { type: "pages" } },
              allow: {
                to: {
                  element: {
                    type: ["feature", "shared-api", "shared-lib", "shared-ui"],
                    fileInternalPath: "index.ts"
                  }
                }
              }
            },

            {
              from: { element: { type: "app-ui" } },
              allow: {
                to: {
                  element: {
                    type: ["feature", "shared-api", "shared-lib", "shared-ui"],
                    fileInternalPath: "index.ts"
                  }
                }
              }
            },

            // features: shared only, never another feature — enforced by omission
            {
              from: { element: { type: "feature" } },
              allow: {
                to: {
                  element: {
                    type: ["shared-api", "shared-lib", "shared-ui"],
                    fileInternalPath: "index.ts"
                  }
                }
              }
            },

            {
              from: { element: { type: "widget" } },
              allow: {
                to: {
                  element: {
                    type: ["feature", "shared-api", "shared-lib", "shared-ui"],
                    fileInternalPath: "index.ts"
                  }
                }
              }
            },

            {
              from: { element: { type: "shared-ui" } },
              allow: { to: { element: { type: "shared-lib", fileInternalPath: "index.ts" } } }
            },
            {
              from: { element: { type: "shared-lib" } },
              allow: { to: { element: { type: "shared-api", fileInternalPath: "index.ts" } } }
            },

            {
              from: { element: { type: "middleware" } },
              allow: { to: { element: { type: "shared-api", fileInternalPath: "index.ts" } } }
            }

            // plugins: no policy — closed by default, zero observed need today
          ]
        }
      ]
    }
  },
  {
    // Test files: broad escape hatch (need e.g. ~/shared/testing/mocks/*).
    // A separate, later config object so its "boundaries/dependencies"
    // value fully overrides the stricter block above for matching files —
    // flat config's per-key merge takes the last matching object's value,
    // it doesn't concatenate policies arrays across objects. `settings`
    // and `plugins` are inherited from the block above (flat config unions
    // those across all matching objects), so no need to redeclare them.
    files: ["app/**/__tests__/**/*.ts"],
    rules: {
      // `files` above already scopes this rule instance to test files, so
      // `default: "allow"` alone covers them (e.g. real imports from
      // ~/shared/testing/mocks/*) — no policies needed on top of it.
      "boundaries/dependencies": ["error", { default: "allow" }]
    }
  },
  eslintConfigPrettier // must stay last so it can override stylistic rules
);
