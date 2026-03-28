#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_NAME="firecrawl-cli"
SKILL_SRC="$ROOT_DIR/skills/$SKILL_NAME"
BUILD_DIR="$ROOT_DIR/dist-skill"
STAGE_DIR="$BUILD_DIR/$SKILL_NAME"
OUTPUT_ZIP="$BUILD_DIR/$SKILL_NAME.zip"

# ─── Preflight checks ────────────────────────────────────────────────
if [ ! -f "$SKILL_SRC/SKILL.md" ]; then
  echo "❌ SKILL.md not found at $SKILL_SRC/SKILL.md"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "❌ node is required but not found"
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  echo "❌ pnpm is required but not found"
  exit 1
fi

# ─── Step 1: Build CLI bundle ────────────────────────────────────────
echo "🔨 Building CLI bundle..."
cd "$ROOT_DIR"
pnpm bundle
echo "✅ CLI bundle built: bundle/index.js ($(du -h bundle/index.js | cut -f1))"

# ─── Step 2: Assemble skill directory ────────────────────────────────
echo ""
echo "📦 Assembling skill directory..."
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/scripts"

# Copy SKILL.md
cp "$SKILL_SRC/SKILL.md" "$STAGE_DIR/SKILL.md"

# Copy any references/ or assets/ if they exist in the source
for dir in references assets; do
  if [ -d "$SKILL_SRC/$dir" ]; then
    cp -r "$SKILL_SRC/$dir" "$STAGE_DIR/$dir"
    echo "  Copied $dir/"
  fi
done

# Copy CLI bundle as scripts/index.js
cp "$ROOT_DIR/bundle/index.js" "$STAGE_DIR/scripts/index.js"
chmod +x "$STAGE_DIR/scripts/index.js"
echo "  Copied scripts/index.js ($(du -h "$STAGE_DIR/scripts/index.js" | cut -f1))"

# ─── Step 3: Package into zip ────────────────────────────────────────
echo ""
echo "🗜️  Packaging into zip..."
rm -f "$OUTPUT_ZIP"
cd "$BUILD_DIR"
zip -r "$SKILL_NAME.zip" "$SKILL_NAME/"
echo ""

# ─── Summary ──────────────────────────────────────────────────────────
ZIP_SIZE="$(du -h "$OUTPUT_ZIP" | cut -f1)"
echo "✅ Skill packaged successfully!"
echo ""
echo "   Output: $OUTPUT_ZIP ($ZIP_SIZE)"
echo ""
echo "   To install (user scope):"
echo "     unzip $SKILL_NAME.zip -d ~/.codebuddy/skills/"
echo ""
echo "   To install (project scope):"
echo "     unzip $SKILL_NAME.zip -d .codebuddy/skills/"
