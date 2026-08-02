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

set -euo pipefail

COMPONENT="${1:?Usage: vuetify-component.sh <ComponentName> [version]}"
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
