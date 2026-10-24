#!/usr/bin/env bash
# Retag a Vhierly/Aether release so AetherDesk's built-in updater can find it.
#
# The updater only looks at releases whose tag starts with desk- (stable) or
# tdesk- (test). This fork publishes `v1.4.x` tags, so a plain rename never
# surfaces as an update. This renames the tag on both the local and remote repo
# and (when the old release carries a .zip) attaches it, because the updater
# downloads the portable ZIP, not the raw exe.
#
# Usage: scripts/tag-fork-release.sh <v1.4.31> [desk-1.4.31]
set -euo pipefail

tag="${1:?usage: tag-fork-release.sh <old-tag> [new-tag]}"
new="${2:-desk-${tag#v}}"
repo="Vhierly/Aether"

echo "[1/4] $tag -> $new (repo $repo)"
gh release view "$tag" -R "$repo" --json assets --jq '.assets[].name' | sed 's/^/      asset: /'

echo "[2/4] renaming tag locally + on GitHub"
git tag -f "$new" "$tag"
git tag -d "$tag"
git push -f "https://github.com/${repo}.git" "refs/tags/${new}"
git push "https://github.com/${repo}.git" ":refs/tags/${tag}"

echo "[3/4] renaming the GitHub release title/tag"
gh release edit "$tag" -R "$repo" --tag "$new"

zip="$(gh release view "$new" -R "$repo" --json assets --jq '.assets[].name' | grep -i '\.zip$' || true)"
if [[ -z "$zip" ]]; then
  echo "[4/4] no .zip asset on $new yet; attach AetherDesk-<version>.zip manually:"
  echo "        gh release upload $new -R $repo AetherDesk-<version>.zip"
else
  echo "[4/4] .zip asset already present: $zip"
fi

echo "done: https://github.com/${repo}/releases/tag/${new}"
