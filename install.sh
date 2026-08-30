#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${HOME}/.local/bin"
TARGET_FILE="${BIN_DIR}/watchhassandev"
SOURCE_FILE="${SCRIPT_DIR}/watchhassandev"

echo "==========================================="
echo " Installing watchhassandev CLI..."
echo "==========================================="

if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Error: Source CLI script '$SOURCE_FILE' not found." >&2
    exit 1
fi

# Ensure ~/.local/bin exists
mkdir -p "$BIN_DIR"

# Ensure source file is executable
chmod +x "$SOURCE_FILE"

# Copy CLI script to ~/.local/bin and configure the project directory
sed "s|DEFAULT_PROJECT_DIR=\".*\"|DEFAULT_PROJECT_DIR=\"$SCRIPT_DIR\"|" "$SOURCE_FILE" > "$TARGET_FILE"
chmod +x "$TARGET_FILE"

echo "✅ Successfully installed watchhassandev to:"
echo "   $TARGET_FILE"
echo "   (Configured project directory: $SCRIPT_DIR)"

# Verify PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo "⚠️  Note: '$BIN_DIR' is not in your current PATH."
    echo "   Add it to your shell configuration (e.g. ~/.bashrc or ~/.zshrc):"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
else
    echo "✅ Verified: '$BIN_DIR' is in your PATH."
fi

echo ""
echo "Test the installation with:"
echo "  watchhassandev --help"
echo "==========================================="
