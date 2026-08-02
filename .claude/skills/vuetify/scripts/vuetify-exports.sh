#!/usr/bin/env bash
# Print Vuetify's import map (what's exported from the package, incl. labs).
#
# Usage:
#   vuetify-exports.sh [version] [--labs]
#
# Examples:
#   vuetify-exports.sh
#   vuetify-exports.sh v3-stable --labs
#
# Only Vuetify 3.x/4.x publish the dist/json/importMap*.json files this
# script reads -- Vuetify 2 doesn't, so v2-stable / 2.x.y versions are
# rejected up front instead of failing on a 404.
#
# Dist-tags are mutable (they can point to a newer published version over
# time), so their cache entries expire after CACHE_TTL_SECONDS and are
# re-fetched. Exact semver versions never change, so they're cached
# indefinitely.

set -euo pipefail

VERSION="${1:-v3-stable}"
LABS_FLAG="${2:-}"

CACHE_DIR="${HOME}/.cache/vuetify-skill"
CACHE_TTL_SECONDS=$((24 * 60 * 60))
mkdir -p "$CACHE_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed." >&2
  exit 1
fi

case "$VERSION" in
  v2-stable | 2.*)
    echo "Error: Vuetify 2.x does not publish dist/json/importMap.json (that build output was introduced in Vuetify 3). Package-export lookup isn't available for '${VERSION}'." >&2
    exit 1
    ;;
esac

if [ "$LABS_FLAG" = "--labs" ]; then
  FILE_NAME="importMap-labs.json"
else
  FILE_NAME="importMap.json"
fi

CACHE_FILE="${CACHE_DIR}/${FILE_NAME%.json}-${VERSION}.json"

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
  echo "Fetching Vuetify (${VERSION}) ${FILE_NAME}..." >&2
  TMP_FILE=$(mktemp "${CACHE_FILE}.XXXXXX")
  trap 'rm -f "$TMP_FILE"' EXIT
  if ! curl -fsSL --connect-timeout 10 --max-time 30 \
      "https://unpkg.com/vuetify@${VERSION}/dist/json/${FILE_NAME}" -o "$TMP_FILE" \
      || ! jq empty "$TMP_FILE" >/dev/null 2>&1; then
    echo "Error: failed to download ${FILE_NAME} for version '${VERSION}'." >&2
    exit 1
  fi
  mv "$TMP_FILE" "$CACHE_FILE"
  trap - EXIT
fi

jq . "$CACHE_FILE"
