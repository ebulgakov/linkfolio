#!/usr/bin/env bash
# Fetch props/events/slots for a single Vuetify component.
#
# Usage:
#   vuetify-component.sh <ComponentName> [version]
#
# Examples:
#   vuetify-component.sh VBtn
#   vuetify-component.sh VDataTable v2-stable
#   vuetify-component.sh VDataTable 3.7.19
#
# <version> can be a dist-tag (v3-stable, v2-stable, latest, next) or an
# exact semver published to npm. Defaults to v3-stable.
#
# Dist-tags are mutable (they can point to a newer published version over
# time), so their cache entries expire after CACHE_TTL_SECONDS and are
# re-fetched. Exact semver versions never change, so they're cached
# indefinitely.

set -euo pipefail

COMPONENT="${1:?Usage: vuetify-component.sh <ComponentName> [version]}"
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

RESULT=$(jq --arg name "$COMPONENT" '
  .contributions.html.tags[]
  | select(.name == $name)
  | {
      name,
      description,
      "doc-url": .["doc-url"],
      props: [ .attributes[]? | {
        name,
        type: .value.type,
        default: (.default // null),
        description
      } ],
      events: [ .events[]? | { name, description } ],
      slots: [ .slots[]? | { name, description } ]
    }
' "$CACHE_FILE")

if [ -z "$RESULT" ]; then
  echo "Component '${COMPONENT}' not found in Vuetify ${VERSION}." >&2
  echo "Component names are PascalCase (e.g. VBtn, VDataTable). Try: bash scripts/vuetify-list.sh <partial-name> ${VERSION}" >&2
  exit 1
fi

echo "$RESULT" | jq .
