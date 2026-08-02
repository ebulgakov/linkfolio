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
#
# Dist-tags are mutable (they can point to a newer published version over
# time), so their cache entries expire after CACHE_TTL_SECONDS and are
# re-fetched. Exact semver versions never change, so they're cached
# indefinitely.

set -euo pipefail

FILTER="${1:-}"
VERSION="${2:-v3-stable}"

CACHE_DIR="${HOME}/.cache/vuetify-skill"
CACHE_FILE="${CACHE_DIR}/web-types-${VERSION}.json"
CACHE_TTL_SECONDS=$((24 * 60 * 60))
mkdir -p "$CACHE_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed." >&2
  exit 1
fi

cache_is_fresh() {
  local file="$1"
  [ -s "$file" ] || return 1
  case "$VERSION" in
    # Exact semver (e.g. 3.7.19) is immutable once published -- cache forever.
    [0-9]*.[0-9]*.[0-9]*) return 0 ;;
  esac
  local mtime now
  mtime=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null) || return 1
  now=$(date +%s)
  [ $((now - mtime)) -lt "$CACHE_TTL_SECONDS" ]
}

if ! cache_is_fresh "$CACHE_FILE"; then
  echo "Fetching Vuetify (${VERSION}) API definitions (first lookup this session, cached after)..." >&2
  TMP_FILE=$(mktemp "${CACHE_FILE}.XXXXXX")
  trap 'rm -f "$TMP_FILE"' EXIT
  if ! curl -fsSL --connect-timeout 10 --max-time 30 \
      "https://unpkg.com/vuetify@${VERSION}/dist/json/web-types.json" -o "$TMP_FILE" \
      || ! jq empty "$TMP_FILE" >/dev/null 2>&1; then
    echo "Error: failed to download web-types.json for version '${VERSION}'. Check the version/tag is valid on https://unpkg.com/browse/vuetify/" >&2
    exit 1
  fi
  mv "$TMP_FILE" "$CACHE_FILE"
  trap - EXIT
fi

if [ -n "$FILTER" ]; then
  jq -r --arg f "$FILTER" '.contributions.html.tags[].name | select(test($f; "i"))' "$CACHE_FILE"
else
  jq -r '.contributions.html.tags[].name' "$CACHE_FILE"
fi
