#!/usr/bin/env bash
# List Vuetify component names, optionally filtered.
#
# Usage:
#   vuetify-list.sh [filter] [version]
#
# Examples:
#   vuetify-list.sh                # list every component name
#   vuetify-list.sh table          # components with "table" in the name (case-insensitive)
#   vuetify-list.sh nav v2-stable  # search within Vuetify 2's API instead of the v3 default

set -euo pipefail

FILTER="${1:-}"
VERSION="${2:-v3-stable}"

CACHE_DIR="${HOME}/.cache/vuetify-skill"
CACHE_FILE="${CACHE_DIR}/web-types-${VERSION}.json"
mkdir -p "$CACHE_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed." >&2
  exit 1
fi

if [ ! -s "$CACHE_FILE" ]; then
  echo "Fetching Vuetify (${VERSION}) API definitions (first lookup this session, cached after)..." >&2
  if ! curl -fsSL "https://unpkg.com/vuetify@${VERSION}/dist/json/web-types.json" -o "$CACHE_FILE"; then
    rm -f "$CACHE_FILE"
    echo "Error: failed to download web-types.json for version '${VERSION}'. Check the version/tag is valid on https://unpkg.com/browse/vuetify/" >&2
    exit 1
  fi
fi

if [ -n "$FILTER" ]; then
  jq -r --arg f "$FILTER" '.contributions.html.tags[].name | select(test($f; "i"))' "$CACHE_FILE"
else
  jq -r '.contributions.html.tags[].name' "$CACHE_FILE"
fi
