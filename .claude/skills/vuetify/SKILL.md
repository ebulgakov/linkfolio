---
name: vuetify
description: Look up Vuetify component APIs (props, events, slots), built-in directives (v-ripple, v-scroll, etc.), package exports, and installation/setup steps for Vite, Nuxt, and manual projects. Use this whenever writing, editing, or reviewing code that uses Vuetify components (anything starting with v-, e.g. v-btn, v-data-table, v-navigation-drawer), whenever unsure about a prop name, type, or default value, or whenever setting up Vuetify in a new or existing project. Supports Vuetify 2.x, 3.x, and 4.x.
---

# Vuetify

Reference and lookup workflows for the Vuetify component library, replacing the need for a live `vuetify-mcp` connection. Data comes straight from Vuetify's own published API files (the same source the official docs and IDE tooling use), fetched on demand and cached locally.

## When to use which script

| Need                                                                                                   | Script                                                |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Props / events / slots for one component (e.g. `VBtn`, `VDataTable`)                                   | `scripts/vuetify-component.sh`                        |
| Find the exact component name, or browse what exists                                                   | `scripts/vuetify-list.sh`                             |
| What a package import resolves to (`import { VBtn } from 'vuetify/components'`, labs components, etc.) | `scripts/vuetify-exports.sh`                          |
| Built-in directives (`v-ripple`, `v-scroll`, `v-tooltip`, ...)                                         | `reference/directives.md` (static, no fetch needed)   |
| Setting up Vuetify in a project (Vite, Nuxt, manual)                                                   | `reference/installation.md` (static, no fetch needed) |

All scripts are bash, require `curl` and `jq`, and cache downloaded data under `~/.cache/vuetify-skill/` so repeat lookups in the same session (or across sessions) don't re-download.

## Component lookup workflow

1. If you don't already know the exact component name, run:

   ```bash
   bash scripts/vuetify-list.sh <partial-name>
   ```

   Component names are PascalCase (`VDataTable`, not `v-data-table` or `data-table`). The filter is a case-insensitive regex, so `bash scripts/vuetify-list.sh "data-table"` won't match — use `bash scripts/vuetify-list.sh datatable` or just `table`.

2. Fetch the API for a specific component:

   ```bash
   bash scripts/vuetify-component.sh VDataTable
   ```

   This prints JSON with `description`, `doc-url`, `props` (name/type/default/description), `events`, and `slots`. Read only what the task needs — for a simple prop check, skim the `props` array rather than dumping the whole thing into your response.

3. By default this targets the latest Vuetify **3.x** release (tag `v3-stable`). If the project uses a different major version, pass it explicitly as the second argument:

   ```bash
   bash scripts/vuetify-component.sh VDataTable v2-stable   # Vuetify 2
   bash scripts/vuetify-component.sh VDataTable latest      # newest published (currently 4.x)
   bash scripts/vuetify-component.sh VDataTable 3.7.19      # exact version, if you need to pin
   ```

   Check the project's `package.json` for its installed `vuetify` version before assuming — Vuetify 2 and 3/4 have different prop sets for many components.

4. If a component isn't found, double-check the name with `vuetify-list.sh` first — Vuetify renames and merges components between major versions (e.g. some v2 components split into multiple v3 components).

## Directives

Vuetify's built-in directives aren't part of the component API file, so they're documented statically in `reference/directives.md` — read that file directly rather than fetching anything. It covers `v-ripple`, `v-scroll`, `v-resize`, `v-intersect`, `v-touch`, `v-click-outside`, and `v-tooltip` with import syntax and basic usage. For exhaustive option lists, the file links to each directive's doc page.

## Installation / setup

For "how do I add Vuetify to this project" questions, read `reference/installation.md` directly (no fetch needed) — it covers the scaffolding tool, manual Vite setup, and the Nuxt module. Tooling commands can shift over time; if something in there seems to fail or looks outdated, cross-check against https://vuetifyjs.com/en/getting-started/installation/.

## Package exports

To check what's importable from the `vuetify` package (useful for tree-shaken imports like `import { VBtn } from 'vuetify/components'`, or checking labs/experimental components):

```bash
bash scripts/vuetify-exports.sh v3-stable
```

## Related skill

This skill only does lookups (exact props/events/slots/directives/install steps) -- it has no opinion on how to structure Vuetify code well. If a `web-ui-vuetify` skill is also installed, use it for idiomatic patterns, the `defaults`/`v-defaults-provider` system, anti-patterns, and decision frameworks (data table variant, input component choice, etc.), and use this skill to confirm the exact API for whatever component that guidance points you to.

## Notes

- These scripts need network access. In Claude Code this works out of the box. In other environments, check that outbound requests to `unpkg.com` are allowed.
- The full component API file is a few MB; scripts cache it in `~/.cache/vuetify-skill/` and only print the filtered result for the component you asked about, so this stays cheap regardless of file size.
- This skill only covers lookups (read-only). It doesn't run a dev server, scaffold a project, or modify files — for that, use your normal file/bash tools alongside what you learn here.
