#!/usr/bin/env bash
# Print Vuetify's import map (what's exported from the package, incl. labs).
#
# Usage:
#   vuetify-exports.sh [version] [--labs]
#
# Examples:
#   vuetify-exports.sh
#   vuetify-exports.sh v3-stable --labs

set -euo pipefail

VERSION="${1:-v3-stable}"
LABS_FLAG="${2:-}"

CACHE_DIR="${HOME}/.cache/vuetify-skill"
mkdir -p "$CACHE_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed." >&2
  exit 1
fi

if [ "$LABS_FLAG" = "--labs" ]; then
  FILE_NAME="importMap-labs.json"
else
  FILE_NAME="importMap.json"
fi

CACHE_FILE="${CACHE_DIR}/${FILE_NAME%.json}-${VERSION}.json"

if [ ! -s "$CACHE_FILE" ]; then
  echo "Fetching Vuetify (${VERSION}) ${FILE_NAME}..." >&2
  if ! curl -fsSL "https://unpkg.com/vuetify@${VERSION}/dist/json/${FILE_NAME}" -o "$CACHE_FILE"; then
    rm -f "$CACHE_FILE"
    echo "Error: failed to download ${FILE_NAME} for version '${VERSION}'." >&2
    exit 1
  fi
fi

jq . "$CACHE_FILE"
