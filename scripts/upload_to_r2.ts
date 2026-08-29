#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
let inputFile: string | undefined;
let destArg: string | undefined;
let customThumbArg: string | undefined;

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
  } else if (arg === '-h' || arg === '--help') {
    console.log('Usage: bun scripts/upload_to_r2.ts <path-to-video-file> [destination-filename] [--thumb <path-to-image>]');
    process.exit(0);
  } else if (arg.startsWith('-')) {
    console.error(`Error: Unknown option '${arg}'.`);
    process.exit(1);
  } else {
    positionalArgs.push(arg);
  }
}

inputFile = positionalArgs[0];
destArg = positionalArgs[1];

if (!inputFile) {
  console.error('Usage: bun scripts/upload_to_r2.ts <path-to-video-file> [destination-filename] [--thumb <path-to-image>]');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file '${inputFile}' does not exist.`);
  process.exit(1);
}

if (customThumbArg && !fs.existsSync(customThumbArg)) {
  console.error(`Error: Custom thumbnail file '${customThumbArg}' does not exist.`);
  process.exit(1);
}

const bucketUrl = process.env.CLOUDFLARE_BUCKET_URL;
if (!bucketUrl) {
  console.error('Error: CLOUDFLARE_BUCKET_URL is not set in environment or .env file.');
  process.exit(1);
}

const remote = process.env.RCLONE_REMOTE;
if (!remote) {
  console.error('Error: RCLONE_REMOTE is not set in environment or .env file.');
  process.exit(1);
}

const bucket = process.env.BUCKET_NAME;
if (!bucket) {
  console.error('Error: BUCKET_NAME is not set in environment or .env file.');
  process.exit(1);
}

const publicR2Url = bucketUrl.startsWith('http') ? bucketUrl.replace(/\/$/, '') : `https://${bucketUrl.replace(/\/$/, '')}`;
const appUrl = (process.env.APP_URL || 'https://watch.hassandev.me').replace(/\/$/, '');

const uuid = crypto.randomUUID().toLowerCase();
const rawName = destArg || path.basename(inputFile);
const baseName = rawName.replace(/\.[^/.]+$/, '');
const folderName = `${baseName}-${uuid}`;
const destFolder = `${remote}:${bucket}/${folderName}`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'r2-upload-'));
const compressedFile = path.join(tmpDir, 'video.mp4');
const thumbnailFile = path.join(tmpDir, 'thumbnail.png');
const srtFile = path.join(tmpDir, 'captions.srt');
const captionsFile = path.join(tmpDir, 'captions.vtt');
const chaptersFile = path.join(tmpDir, 'chapters.vtt');
const summaryFile = path.join(tmpDir, 'summary.md');

console.log('==========================================');
console.log(`🎬 Input video:     ${inputFile}`);
if (customThumbArg) {
  console.log(`🖼️  Custom thumb:   ${customThumbArg}`);
}
console.log(`🆔 Assigned UUID:   ${uuid}`);
console.log(`📁 R2 Folder:       ${folderName}`);
console.log('📹 Video:           video.mp4');
console.log('🖼️  Thumbnail:       thumbnail.png');
console.log('📑 Chapters:        chapters.vtt');
console.log('💬 Captions:        captions.vtt');
console.log('📝 Summary:         summary.md');
console.log('🗜️  Step 1: Compressing video with FFmpeg...');
console.log('==========================================');

const sh = (cmd: string, stdio: 'inherit' | 'ignore' = 'inherit') => execSync(cmd, { stdio });

try {
  sh(`ffmpeg -y -i "${inputFile}" -c:v libx264 -crf 18 -preset slow -c:a copy -movflags +faststart "${compressedFile}"`);

  console.log('==========================================');
  console.log('✅ Compression complete!');
  if (customThumbArg) {
    console.log('🖼️  Step 2: Preparing custom poster thumbnail...');
    console.log('==========================================');
    try {
      sh(`ffmpeg -y -i "${customThumbArg}" "${thumbnailFile}"`, 'ignore');
    } catch {
      fs.copyFileSync(customThumbArg, thumbnailFile);
    }
    console.log('==========================================');
    console.log('✅ Custom thumbnail prepared!');
  } else {
    console.log('🖼️  Step 2: Extracting poster thumbnail with FFmpeg...');
    console.log('==========================================');

    try {
      sh(`ffmpeg -y -ss 00:00:01 -i "${inputFile}" -vframes 1 -q:v 2 "${thumbnailFile}"`, 'ignore');
    } catch {
      sh(`ffmpeg -y -ss 00:00:00 -i "${inputFile}" -vframes 1 -q:v 2 "${thumbnailFile}"`, 'ignore');
    }

    console.log('==========================================');
    console.log('✅ Thumbnail extraction complete!');
  }
  console.log('🎙️  Step 3: Transcribing captions with Groq Cloud Whisper...');
  console.log('==========================================');

  sh(`phantom edit transcribe-cloud "${inputFile}" --output "${srtFile}"`);
  sh(`ffmpeg -y -i "${srtFile}" "${captionsFile}"`, 'ignore');

  console.log('==========================================');
  console.log('✅ Transcription & WebVTT Captions complete!');
  console.log('🤖 Step 4: Generating chapters with Claude...');
  console.log('==========================================');

  sh(`bun scripts/generate_chapters.ts "${srtFile}" "${chaptersFile}" "${baseName}"`);

  console.log('==========================================');
  console.log('📝 Step 5: Generating summary with Claude...');
  console.log('==========================================');

  sh(`bun scripts/generate_summary.ts "${srtFile}" "${summaryFile}" "${baseName}"`);

  console.log('==========================================');
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
  console.log(`🆔 Unique UUID: ${uuid}`);
  console.log(`📁 Folder:      ${publicR2Url}/${folderName}`);
  console.log(`📹 Video:       ${publicR2Url}/${folderName}/video.mp4`);
  console.log(`🖼️  Thumbnail:   ${publicR2Url}/${folderName}/thumbnail.png`);
  console.log(`📑 Chapters:    ${publicR2Url}/${folderName}/chapters.vtt`);
  console.log(`💬 Captions:    ${publicR2Url}/${folderName}/captions.vtt`);
  console.log(`📝 Summary:     ${publicR2Url}/${folderName}/summary.md`);
  console.log(`📺 Watch URL:   ${appUrl}/v/${folderName}`);
  console.log('==========================================');
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
