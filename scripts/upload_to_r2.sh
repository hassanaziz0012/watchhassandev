#!/usr/bin/env bash

set -euo pipefail

# Check for required tools
for cmd in ffmpeg rclone phantom bun; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: Required command '$cmd' is not installed or not in PATH." >&2
        exit 1
    fi
done

# Check arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <path-to-video-file> [destination-filename]"
    echo "Example: $0 input.mp4"
    echo "Example: $0 input.mp4 custom_name.mp4"
    exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' does not exist." >&2
    exit 1
fi

# Generate UUID
if command -v uuidgen &> /dev/null; then
    UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
elif [ -f /proc/sys/kernel/random/uuid ]; then
    UUID=$(cat /proc/sys/kernel/random/uuid)
elif command -v python3 &> /dev/null; then
    UUID=$(python3 -c "import uuid; print(uuid.uuid4())")
else
    UUID=$(od -x /dev/urandom | head -1 | awk '{OFS="-"; print $2$3,$4,$5,$6,$7$8$9}')
fi

RAW_NAME="${2:-$(basename "$INPUT_FILE")}"
# Strip existing extension if present
BASE_NAME="${RAW_NAME%.*}"

# Destination filenames ({filename}-{uuid}.ext)
DEST_FILENAME="${BASE_NAME}-${UUID}.mp4"
VTT_FILENAME="${BASE_NAME}-${UUID}.vtt"
SRT_FILENAME="${BASE_NAME}-${UUID}.srt"
SUMMARY_FILENAME="${BASE_NAME}-${UUID}.md"

# R2 configuration
RCLONE_REMOTE="r2-loom"
BUCKET_NAME="loom"
DEST_PATH="${RCLONE_REMOTE}:${BUCKET_NAME}/${DEST_FILENAME}"
VTT_DEST_PATH="${RCLONE_REMOTE}:${BUCKET_NAME}/${VTT_FILENAME}"
SUMMARY_DEST_PATH="${RCLONE_REMOTE}:${BUCKET_NAME}/${SUMMARY_FILENAME}"
PUBLIC_R2_URL="https://loom-worker.hassanaziz0012.workers.dev"

# Script directory reference
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Temporary directory for intermediate files
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

COMPRESSED_FILE="${TMP_DIR}/${DEST_FILENAME}"
SRT_FILE="${TMP_DIR}/${SRT_FILENAME}"
VTT_FILE="${TMP_DIR}/${VTT_FILENAME}"
SUMMARY_FILE="${TMP_DIR}/${SUMMARY_FILENAME}"

echo "=========================================="
echo "🎬 Input video:     $INPUT_FILE"
echo "🆔 Assigned UUID:   $UUID"
echo "📁 R2 Video name:   $DEST_FILENAME"
echo "📑 R2 Chapters:     $VTT_FILENAME"
echo "📝 R2 Summary:      $SUMMARY_FILENAME"
echo "🗜️  Step 1: Compressing video with FFmpeg..."
echo "=========================================="

ffmpeg -y -i "$INPUT_FILE" -c:v libx264 -crf 18 -preset slow -c:a copy "$COMPRESSED_FILE"

ORIGINAL_SIZE=$(du -h "$INPUT_FILE" | cut -f1)
COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)

echo "=========================================="
echo "✅ Compression complete!"
echo "   Original size:   $ORIGINAL_SIZE"
echo "   Compressed size: $COMPRESSED_SIZE"
echo "🎙️  Step 2: Transcribing captions with Groq Cloud Whisper..."
echo "=========================================="

phantom edit transcribe-cloud "$INPUT_FILE" --output "$SRT_FILE"

echo "=========================================="
echo "✅ Transcription complete! (Saved to temporary SRT)"
echo "🤖 Step 3: Generating chapters with Claude (via browserllm)..."
echo "=========================================="

bun "$SCRIPT_DIR/generate_chapters.ts" "$SRT_FILE" "$VTT_FILE"

echo "=========================================="
echo "📝 Step 4: Generating summary with Claude (via browserllm)..."
echo "=========================================="

bun "$SCRIPT_DIR/generate_summary.ts" "$SRT_FILE" "$SUMMARY_FILE"

echo "=========================================="
echo "☁️  Step 5: Uploading video, chapters & summary to Cloudflare R2..."
echo "=========================================="

echo "Uploading video (${DEST_FILENAME})..."
rclone copyto --progress "$COMPRESSED_FILE" "$DEST_PATH"

echo "Uploading chapters (${VTT_FILENAME})..."
rclone copyto --progress "$VTT_FILE" "$VTT_DEST_PATH"

echo "Uploading summary (${SUMMARY_FILENAME})..."
rclone copyto --progress "$SUMMARY_FILE" "$SUMMARY_DEST_PATH"

echo "=========================================="
echo "🎉 Successfully uploaded to Cloudflare R2!"
echo "🆔 Unique UUID: $UUID"
echo "📁 Video:       ${PUBLIC_R2_URL}/${DEST_FILENAME}"
echo "📑 Chapters:    ${PUBLIC_R2_URL}/${VTT_FILENAME}"
echo "📝 Summary:     ${PUBLIC_R2_URL}/${SUMMARY_FILENAME}"
echo "📺 Watch URL:   http://localhost:3000/v/${BASE_NAME}-${UUID}"
echo "=========================================="
