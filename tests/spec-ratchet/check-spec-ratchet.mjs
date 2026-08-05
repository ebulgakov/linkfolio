#!/usr/bin/env node
// Spec ratchet. Every file in SCOPE must have a colocated *.test.ts.
// Existing gaps are grandfathered in spec-ratchet-baseline.json; that baseline
// can only shrink (via --write after adding a test), never grow.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASELINE_PATH = fileURLToPath(new URL("./spec-ratchet-baseline.json", import.meta.url));
const SKIP_DIRS = new Set(["__tests__", "node_modules"]);

function walkTsFiles(absDir) {
  const out = [];
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...walkTsFiles(join(absDir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      out.push(join(absDir, entry.name));
    }
  }
  return out;
}

function toRel(absPath) {
  return relative(ROOT, absPath).split("\\").join("/");
}

function collectScope() {
  const files = [];

  const appDir = join(ROOT, "app");
  for (const abs of walkTsFiles(appDir)) {
    if (basename(dirname(abs)) === "model") files.push(abs);
  }

  const serverApiDir = join(ROOT, "server", "api");
  files.push(...walkTsFiles(serverApiDir));

  const serverUtilsDir = join(ROOT, "server", "utils");
  for (const entry of readdirSync(serverUtilsDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(join(serverUtilsDir, entry.name));
    }
  }

  return files.map(toRel).sort();
}

function testPathFor(sourceRelPath) {
  const dir = dirname(sourceRelPath);
  const testName = basename(sourceRelPath).replace(/\.ts$/, ".test.ts");
  return join(dir, "__tests__", testName).split("\\").join("/");
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return [];
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
}

function main() {
  const write = process.argv.includes("--write");

  const scope = collectScope();
  const missing = scope.filter(f => !existsSync(join(ROOT, testPathFor(f)))).sort();

  if (write) {
    writeFileSync(BASELINE_PATH, JSON.stringify(missing, null, 2) + "\n");
    console.log(`spec-ratchet: baseline written, ${missing.length} file(s) without a test.`);
    return;
  }

  const baseline = loadBaseline();
  const baselineSet = new Set(baseline);
  const missingSet = new Set(missing);

  const newUntested = missing.filter(f => !baselineSet.has(f));
  const staleBaseline = baseline.filter(f => !missingSet.has(f));

  if (newUntested.length === 0 && staleBaseline.length === 0) {
    console.log(`spec-ratchet: OK (${baseline.length} file(s) grandfathered, no new gaps).`);
    return;
  }

  if (newUntested.length > 0) {
    console.error("spec-ratchet: new file(s) missing a test (not in baseline):");
    for (const f of newUntested) console.error(`  - ${f}  (expected ${testPathFor(f)})`);
  }

  if (staleBaseline.length > 0) {
    console.error(
      "spec-ratchet: baseline entry no longer missing a test — remove it from spec-ratchet-baseline.json (run `pnpm spec-ratchet:write` after confirming):"
    );
    for (const f of staleBaseline) console.error(`  - ${f}`);
  }

  process.exit(1);
}

main();
