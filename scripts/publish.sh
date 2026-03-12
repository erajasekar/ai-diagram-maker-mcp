#!/usr/bin/env bash
set -e

# Publish ai-diagram-maker-mcp to npm
# Usage: ./scripts/publish.sh [patch|minor|major]
# Default: patch (e.g. 1.1.1 -> 1.1.2)

BUMP="${1:-patch}"

case "$BUMP" in
  patch|minor|major) ;;
  *)
    echo "Usage: $0 [patch|minor|major]"
    echo "  patch - 1.1.1 -> 1.1.2 (default)"
    echo "  minor - 1.1.1 -> 1.2.0"
    echo "  major - 1.1.1 -> 2.0.0"
    exit 1
    ;;
esac

echo "Bumping version: $BUMP"
npm version "$BUMP" --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"

echo "Building..."
npm run build

echo "Publishing to npm..."
npm publish

echo "Creating git tag and commit..."
git add package.json
git add package-lock.json 2>/dev/null || true
git commit -m "chore: release v$NEW_VERSION" || true
git tag "v$NEW_VERSION"

echo "Done. v$NEW_VERSION published to npm."
echo "Push with: git push && git push --tags"
