#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';
import readline from 'readline';

/**
 * Asks a question via readline interface and returns the trimmed response
 */
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.on('SIGINT', () => {
      rl.close();
      console.log('\nUpload aborted.');
      process.exit(130);
    });

    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

interface RawTimestampEntry {
  timestamp?: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  title?: string;
}

interface PhantomMetadata {
  title?: string;
  description?: string;
  summary?: string;
  timestamps?: RawTimestampEntry[];
  tags?: string[];
  categoryId?: string;
  privacyStatus?: string;
  madeForKids?: boolean;
  tweetTemplate?: string;
  recommendations?: any[];
  [key: string]: any;
}

/**
 * Normalizes string into URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes any timestamp string (MM:SS, HH:MM:SS, pure seconds, SRT comma)
 * into standard WebVTT HH:MM:SS.mmm format.
 */
function normalizeVttTimestamp(ts: string | undefined, fallback: string = '00:00:00.000'): string {
  if (!ts || typeof ts !== 'string') return fallback;

  let clean = ts.trim().replace(',', '.');

  // Handle seconds number if returned as pure number string e.g. "75.4"
  if (/^\d+(\.\d+)?$/.test(clean)) {
    const totalSec = parseFloat(clean);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = Math.floor(totalSec % 60);
    const ms = Math.round((totalSec % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  // Handle MM:SS or MM:SS.mmm
  const parts = clean.split(':');
  if (parts.length === 2) {
    clean = `00:${clean}`;
  }

  // Ensure HH:MM:SS.mmm format
  const match = clean.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    const seconds = match[3];
    const ms = (match[4] || '000').padEnd(3, '0').slice(0, 3);
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  return clean;
}

/**
 * Convert VTT timestamp (HH:MM:SS.mmm) to total seconds
 */
function vttToSeconds(ts: string): number {
  const parts = ts.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const secParts = parts[2].split('.');
    const seconds = parseFloat(secParts[0]);
    const ms = secParts[1] ? parseFloat(secParts[1]) / 1000 : 0;
    return hours * 3600 + minutes * 60 + seconds + ms;
  }
  return 0;
}

/**
 * Convert total seconds back to WebVTT timestamp
 */
function secondsToVtt(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  const ms = Math.round((totalSec % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Probes video duration in seconds using ffprobe
 */
function getVideoDuration(filePath: string): number | null {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf8' }
    ).trim();
    const num = parseFloat(out);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

/**
 * Convert structured chapters array to standard WebVTT string
 */
function generateVttFromTimestamps(rawTimestamps: RawTimestampEntry[], durationSec: number | null): string {
  const lines: string[] = ['WEBVTT', ''];

  if (!rawTimestamps || rawTimestamps.length === 0) {
    const end = durationSec ? secondsToVtt(durationSec) : '00:10:00.000';
    lines.push(`00:00:00.000 --> ${end}`);
    lines.push('Full Video');
    lines.push('');
    return lines.join('\n');
  }

  rawTimestamps.forEach((item, index) => {
    let start = normalizeVttTimestamp(item.timestamp || item.startTime, '00:00:00.000');
    if (index === 0) {
      start = '00:00:00.000';
    }

    let end = item.endTime ? normalizeVttTimestamp(item.endTime) : '';
    if (!end || end === '00:00:00.000') {
      if (index < rawTimestamps.length - 1) {
        end = normalizeVttTimestamp(rawTimestamps[index + 1].timestamp || rawTimestamps[index + 1].startTime);
      } else {
        if (durationSec && durationSec > vttToSeconds(start)) {
          end = secondsToVtt(durationSec);
        } else {
          end = secondsToVtt(vttToSeconds(start) + 120);
        }
      }
    }

    const title = (item.topic || item.title || `Chapter ${index + 1}`).trim().replace(/[\r\n]+/g, ' ');
    lines.push(`${start} --> ${end}`);
    lines.push(title);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Parse CLI Arguments
 */
const args = process.argv.slice(2);
let customThumbArg: string | undefined;
let customMetadataArg: string | undefined;
let dryRun = false;
const positionalArgs: string[] = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--thumb') {
    i++;
    if (i >= args.length) {
      console.error('Error: --thumb requires a file path argument.');
      process.exit(1);
    }
    customThumbArg = args[i];
  } else if (arg.startsWith('--thumb=')) {
    customThumbArg = arg.slice('--thumb='.length);
  } else if (arg === '--metadata') {
    i++;
    if (i >= args.length) {
      console.error('Error: --metadata requires a file path argument.');
      process.exit(1);
    }
    customMetadataArg = args[i];
  } else if (arg.startsWith('--metadata=')) {
    customMetadataArg = arg.slice('--metadata='.length);
  } else if (arg === '--dry-run') {
    dryRun = true;
  } else if (arg === '-h' || arg === '--help') {
    console.log(`
Usage:
  bun scripts/upload_via_phantom.ts <path-to-video> [destination-slug] [options]

Arguments:
  <path-to-video>     Path to input video file (e.g. final.mp4)
  [destination-slug]  Optional custom destination slug (defaults to slugified title from metadata.json)

Options:
  --thumb <path>      Path to custom poster image / thumbnail (auto-detects 'thumbnail.png' in video folder if present)
  --metadata <path>   Path to metadata.json (default: metadata.json in video directory)
  --dry-run           Process and generate all assets without uploading to Cloudflare R2
  -h, --help          Show this help message

Examples:
  bun scripts/upload_via_phantom.ts "/path/to/video/final.mp4"
  bun scripts/upload_via_phantom.ts "/path/to/video/final.mp4" "my-custom-slug" --thumb "/path/to/thumb.png"
`);
    process.exit(0);
  } else if (arg.startsWith('-')) {
    console.error(`Error: Unknown option '${arg}'.`);
    process.exit(1);
  } else {
    positionalArgs.push(arg);
  }
}

const inputVideo = positionalArgs[0];
const destArg = positionalArgs[1];

if (!inputVideo) {
  console.error('❌ Error: Input video file is required.');
  console.error('Usage: bun scripts/upload_via_phantom.ts <path-to-video> [destination-slug] [options]');
  console.error('Run with --help for full usage information.');
  process.exit(1);
}

const resolvedVideoPath = path.resolve(inputVideo);
if (!fs.existsSync(resolvedVideoPath)) {
  console.error(`❌ Error: Input video file '${inputVideo}' does not exist.`);
  process.exit(1);
}

const videoDir = path.dirname(resolvedVideoPath);

// Locate metadata.json
const metadataPath = customMetadataArg ? path.resolve(customMetadataArg) : path.join(videoDir, 'metadata.json');
if (!fs.existsSync(metadataPath)) {
  console.error(`❌ Error: metadata.json not found at: ${metadataPath}`);
  console.error('Please ensure metadata.json is in the video directory or specify --metadata <path>.');
  process.exit(1);
}

let metadata: PhantomMetadata = {};
try {
  const rawMeta = fs.readFileSync(metadataPath, 'utf8');
  metadata = JSON.parse(rawMeta);
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`❌ Error parsing metadata.json (${metadataPath}): ${msg}`);
  process.exit(1);
}

// Thumbnail resolution:
// Check --thumb flag first, then look for thumbnail.png or thumbnail.jpg in video directory
let effectiveThumb: string | undefined;
if (customThumbArg) {
  const resolvedThumb = path.resolve(customThumbArg);
  if (!fs.existsSync(resolvedThumb)) {
    console.error(`❌ Error: Custom thumbnail file '${customThumbArg}' does not exist.`);
    process.exit(1);
  }
  effectiveThumb = resolvedThumb;
} else {
  const folderThumbPng = path.join(videoDir, 'thumbnail.png');
  const folderThumbJpg = path.join(videoDir, 'thumbnail.jpg');
  if (fs.existsSync(folderThumbPng)) {
    effectiveThumb = folderThumbPng;
  } else if (fs.existsSync(folderThumbJpg)) {
    effectiveThumb = folderThumbJpg;
  }
}

// Environment variables
const bucketUrl = process.env.CLOUDFLARE_BUCKET_URL;
const remote = process.env.RCLONE_REMOTE;
const bucket = process.env.BUCKET_NAME;

if (!dryRun) {
  if (!bucketUrl) {
    console.error('❌ Error: CLOUDFLARE_BUCKET_URL is not set in environment or .env file.');
    process.exit(1);
  }
  if (!remote) {
    console.error('❌ Error: RCLONE_REMOTE is not set in environment or .env file.');
    process.exit(1);
  }
  if (!bucket) {
    console.error('❌ Error: BUCKET_NAME is not set in environment or .env file.');
    process.exit(1);
  }
}

const publicR2Url = (bucketUrl || 'https://r2.example.com').startsWith('http')
  ? (bucketUrl || 'https://r2.example.com').replace(/\/$/, '')
  : `https://${(bucketUrl || 'https://r2.example.com').replace(/\/$/, '')}`;
const appUrl = (process.env.APP_URL || 'https://watch.hassandev.me').replace(/\/$/, '');

// Determine slug & folder naming conventions
const uuid = crypto.randomUUID().toLowerCase();

let baseSlug = '';
if (destArg) {
  baseSlug = slugify(destArg);
} else if (metadata.title && typeof metadata.title === 'string' && metadata.title.trim()) {
  baseSlug = slugify(metadata.title);
} else {
  const parentFolder = path.basename(videoDir);
  const videoBaseName = path.basename(resolvedVideoPath).replace(/\.[^/.]+$/, '');
  baseSlug = parentFolder && !['.', '..', 'Videos', 'Downloads'].includes(parentFolder)
    ? slugify(parentFolder)
    : slugify(videoBaseName);
}

if (!baseSlug) {
  baseSlug = 'video';
}

const folderName = `${baseSlug}-${uuid}`;
const destFolder = `${remote}:${bucket}/${folderName}`;

const title = metadata.title || baseSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const summaryText = (metadata.description || metadata.summary || '').trim();

const rawTimestamps: RawTimestampEntry[] =
  Array.isArray(metadata.timestamps) && metadata.timestamps.length > 0
    ? metadata.timestamps
    : [];

const hasTimestamps =
  rawTimestamps.length > 0 &&
  rawTimestamps.some(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      Boolean((item.timestamp && String(item.timestamp).trim()) || (item.startTime && String(item.startTime).trim()))
  );

console.log('==========================================');
console.log('🚀 Phantom Video Upload Pipeline');
console.log('==========================================');
console.log(`🎬 Input Video:     ${resolvedVideoPath}`);
console.log(`📋 Metadata Source: ${metadataPath}`);
console.log(`🏷️  Video Title:     ${title}`);
if (effectiveThumb) {
  console.log(`🖼️  Poster Thumb:   ${effectiveThumb}${customThumbArg ? ' (explicit)' : ' (auto-detected from folder)'}`);
}
console.log(`🆔 Assigned UUID:   ${uuid}`);
console.log(`📁 R2 Target Folder:${folderName}`);
if (dryRun) {
  console.log(`⚠️  Mode:            DRY RUN (No cloud upload)`);
}
console.log('==========================================');

if (!hasTimestamps) {
  console.warn('\n⚠️  WARNING: Timestamps are missing from the metadata file!');
  console.warn(`   Metadata file: ${metadataPath}`);
  console.warn('   Timestamps provide chapter markers and are recommended for videos.\n');

  const answer = await askQuestion('Do you want to proceed without timestamps? (y/N): ');
  const shouldProceed = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';

  if (!shouldProceed) {
    console.log('Upload aborted.');
    process.exit(0);
  }

  console.log('Proceeding without timestamps...\n');
}

const timestamps = hasTimestamps ? rawTimestamps : [];

// Create temporary directory for staging assets
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'r2-phantom-upload-'));
const compressedFile = path.join(tmpDir, 'video.mp4');
const thumbnailFile = path.join(tmpDir, 'thumbnail.png');
const srtFile = path.join(tmpDir, 'captions.srt');
const captionsFile = path.join(tmpDir, 'captions.vtt');
const chaptersFile = path.join(tmpDir, 'chapters.vtt');
const summaryFile = path.join(tmpDir, 'summary.md');

const sh = (cmd: string, stdio: 'inherit' | 'ignore' = 'inherit') => execSync(cmd, { stdio });

try {
  // Step 1: Compress video
  console.log('🗜️  Step 1: Compressing video with FFmpeg (+faststart)...');
  console.log('==========================================');
  sh(`ffmpeg -y -i "${resolvedVideoPath}" -c:v libx264 -crf 18 -preset slow -c:a copy -movflags +faststart "${compressedFile}"`);
  console.log('✅ Video compression complete!');

  // Step 2: Thumbnail
  console.log('==========================================');
  if (effectiveThumb) {
    console.log(`🖼️  Step 2: Preparing poster thumbnail from ${effectiveThumb}...`);
    try {
      sh(`ffmpeg -y -i "${effectiveThumb}" "${thumbnailFile}"`, 'ignore');
    } catch {
      fs.copyFileSync(effectiveThumb, thumbnailFile);
    }
  } else {
    console.log('🖼️  Step 2: Extracting poster thumbnail with FFmpeg from video frame...');
    try {
      sh(`ffmpeg -y -ss 00:00:01 -i "${resolvedVideoPath}" -vframes 1 -q:v 2 "${thumbnailFile}"`, 'ignore');
    } catch {
      sh(`ffmpeg -y -ss 00:00:00 -i "${resolvedVideoPath}" -vframes 1 -q:v 2 "${thumbnailFile}"`, 'ignore');
    }
  }
  console.log('✅ Poster thumbnail prepared!');

  // Step 3: Transcribe captions with Phantom (max-words 10) & convert to WebVTT
  console.log('==========================================');
  console.log('🎙️  Step 3: Transcribing captions with phantom edit transcribe-cloud (--max-words 10)...');
  sh(`phantom edit transcribe-cloud "${resolvedVideoPath}" --max-words 10 --output "${srtFile}"`);
  sh(`ffmpeg -y -i "${srtFile}" "${captionsFile}"`, 'ignore');
  console.log('✅ Captions transcription & WebVTT conversion complete!');

  // Step 4: Generate WebVTT chapters from metadata
  console.log('==========================================');
  console.log(`📑 Step 4: Generating WebVTT chapters (${timestamps.length} timestamps in metadata)...`);
  const durationSec = getVideoDuration(resolvedVideoPath) || getVideoDuration(compressedFile);
  const vttChapters = generateVttFromTimestamps(timestamps, durationSec);
  fs.writeFileSync(chaptersFile, vttChapters, 'utf8');
  console.log('✅ Chapters WebVTT generated:');
  timestamps.forEach((item, idx) => {
    console.log(`   ${idx + 1}. [${item.timestamp || item.startTime || '00:00'}] ${item.topic || item.title || `Chapter ${idx + 1}`}`);
  });

  // Step 5: Generate Summary Markdown
  console.log('==========================================');
  console.log('📝 Step 5: Preparing summary markdown (summary.md)...');
  fs.writeFileSync(summaryFile, summaryText ? `${summaryText}\n` : `# ${title}\n`, 'utf8');
  console.log('✅ Summary markdown created!');

  // Step 6: Upload or Dry Run
  console.log('==========================================');
  if (dryRun) {
    console.log('🔍 DRY RUN COMPLETE: Assets staged successfully:');
    console.log(`   - Video:     ${compressedFile} (${(fs.statSync(compressedFile).size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   - Thumbnail: ${thumbnailFile} (${(fs.statSync(thumbnailFile).size / 1024).toFixed(2)} KB)`);
    console.log(`   - Chapters:  ${chaptersFile}`);
    console.log(`   - Captions:  ${captionsFile}`);
    console.log(`   - Summary:   ${summaryFile}`);
    console.log(`   - Target:    ${destFolder}`);
  } else {
    console.log(`☁️  Step 6: Uploading assets to Cloudflare R2 folder: ${folderName}/ ...`);
    console.log('==========================================');

    const files = [
      ['video (video.mp4)', compressedFile, 'video.mp4'],
      ['thumbnail (thumbnail.png)', thumbnailFile, 'thumbnail.png'],
      ['chapters (chapters.vtt)', chaptersFile, 'chapters.vtt'],
      ['captions (captions.vtt)', captionsFile, 'captions.vtt'],
      ['summary (summary.md)', summaryFile, 'summary.md'],
    ];

    for (const [label, src, name] of files) {
      console.log(`Uploading ${label}...`);
      sh(`rclone copyto --progress "${src}" "${destFolder}/${name}"`);
    }

    console.log('==========================================');
    console.log('🎉 Successfully uploaded to Cloudflare R2!');
    console.log(`🏷️  Title:       ${title}`);
    console.log(`🆔 Unique UUID: ${uuid}`);
    console.log(`📁 Folder:      ${publicR2Url}/${folderName}`);
    console.log(`📹 Video:       ${publicR2Url}/${folderName}/video.mp4`);
    console.log(`🖼️  Thumbnail:   ${publicR2Url}/${folderName}/thumbnail.png`);
    console.log(`📑 Chapters:    ${publicR2Url}/${folderName}/chapters.vtt`);
    console.log(`💬 Captions:    ${publicR2Url}/${folderName}/captions.vtt`);
    console.log(`📝 Summary:     ${publicR2Url}/${folderName}/summary.md`);
    console.log(`📺 Watch URL:   ${appUrl}/v/${folderName}`);
    console.log('==========================================');
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
