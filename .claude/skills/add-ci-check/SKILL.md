---
name: add-ci-check
description: >-
  Generates GitHub Actions workflow files for Linkfolio's quality-gate checks —
  test, lint, format, type-check, build, and similar package.json scripts —
  one workflow per check, running on pull requests and pushes to main. Use
  when the user asks to add, update, or scaffold a GitHub Actions / CI
  workflow, names a specific check (test, lint, format, type-check) that
  should run in CI, or asks to "set up CI" / "add checks on PR". Do not use
  for deploy or preview-deployment workflows (Vercel config, hosting,
  secrets provisioning) — that belongs to the devops-ci agent — or for
  non-GitHub CI providers.
---

Scaffolds one `.github/workflows/<check>.yml` file per requested quality check, using this repo's actual `package.json` scripts and pnpm conventions.

## Repo facts

- Package manager is pnpm; no `packageManager`, `engines`, or `.nvmrc` pins Node/pnpm versions anywhere in the repo.
- `postinstall` already runs `nuxt prepare` after every `pnpm install` — this generates the Nuxt types `type-check` needs, so never add a separate `nuxt prepare` step.
- No workflow needs secrets or env vars: `lint`, `format`, `type-check`, and `test` never touch Neon or real auth (Vitest tests mock `authClient` and Nuxt auto-imports).
- Only long-lived branch is `main` — every workflow triggers on `pull_request` and `push` to `main`, nothing else.
- Deploy/preview workflows are out of scope for this skill — see `.claude/agents/devops-ci.md` for that domain.

## Workflow

1. Read `package.json` fresh (don't assume from memory) and list its `scripts`. Map the user's request to exact script names — e.g. "type-check" → `type-check` (`nuxt typecheck`), "format" → `format` (`prettier --check .`, not `format:fix`). If the user asked for "set up CI" with no specifics, default to `test`, `lint`, `format`, `type-check`.
2. If a requested check has no matching script in `package.json`, stop and ask rather than inventing a command.
3. Use the `find-docs` skill to confirm the current recommended versions/syntax for `actions/checkout`, `pnpm/action-setup`, and `actions/setup-node` with pnpm caching — this repo pins nothing, so don't reuse remembered version numbers from a previous run without rechecking.
4. For each check, copy [assets/workflow-template.yml](assets/workflow-template.yml) to `.github/workflows/<check>.yml` and fill in: `<Check Name>` (e.g. "Type Check"), `<job-name>` (kebab-case, e.g. `type-check`), the three action `<version>` placeholders, `<pnpm-version>`/`<node-version>` from step 3, and `<script>` (the exact `pnpm <script-name>` from step 1). Keep every generated file structurally identical except for these substitutions — they should read as one family.
5. Validate what's checkable locally: each YAML file parses, and every `pnpm <script>` referenced exists in `package.json`. State explicitly in the report that true end-to-end validation only happens once GitHub Actions runs the workflow — don't claim it's confirmed working.
6. Report the file paths created, the Node/pnpm versions used and where they were sourced from, and which checks (if any) were skipped for lacking a matching script.

## Abort Conditions

Stop and report instead of generating a workflow if:

- The request is for a deploy, preview-deployment, or Vercel-config workflow — point to the devops-ci agent instead.
- The request names a check with no corresponding `package.json` script.
- The target isn't this repo's pnpm + Nuxt setup (e.g. a different project without these conventions) — don't reuse the template blindly elsewhere.
