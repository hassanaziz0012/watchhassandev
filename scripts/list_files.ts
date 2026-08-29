#!/usr/bin/env bun
import { spawnSync } from 'child_process';
import path from 'path';

interface R2Object {
  Path: string;
  Name: string;
  Size: number;
  MimeType?: string;
  ModTime?: string;
  IsDir?: boolean;
}

interface VideoEntry {
  path: string;
  name: string;
  slug: string;
  platformUrl: string;
  r2Url: string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadDate: string;
  modTime: string;
}

interface CliArgs {
  limit?: number;
  bucket: string;
  remote: string;
  appUrl: string;
  bucketUrl: string;
  json: boolean;
  urlsOnly: boolean;
  noColor: boolean;
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi', '.flv', '.wmv']);

function parseCliArgs(): CliArgs {
  const argv = process.argv.slice(2);
  let limit: number | undefined;
  let bucket = process.env.BUCKET_NAME || '';
  let remote = process.env.RCLONE_REMOTE || '';
  const appUrl = (process.env.APP_URL || 'https://watch.hassandev.me').replace(/\/+$/, '');
  const bucketUrl = (process.env.CLOUDFLARE_BUCKET_URL || '').replace(/\/+$/, '');
  let json = false;
  let urlsOnly = false;
  let noColor = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      console.log(`
Usage: bun scripts/list_files.ts [options]

List all video files in your Cloudflare R2 bucket with platform URLs, sizes, and upload dates (sorted newest first).

Options:
  -n, --limit <n>      Limit number of videos to display
  -b, --bucket <name>  Cloudflare R2 bucket name (default: BUCKET_NAME from .env)
  -r, --remote <name>  rclone remote name (default: RCLONE_REMOTE from .env)
  --app-url <url>      Custom platform base URL (default: APP_URL or https://watch.hassandev.me)
  --urls-only          Print only the full platform URLs (one per line)
  --json               Output video list as formatted JSON
  --no-color           Disable ANSI color formatting
  -h, --help           Show this help message

Examples:
  bun scripts/list_files.ts
  bun scripts/list_files.ts -n 5
  bun scripts/list_files.ts --urls-only
  bun scripts/list_files.ts --json
`);
      process.exit(0);
    } else if (arg === '-n' || arg === '--limit') {
      limit = parseInt(argv[++i], 10) || undefined;
    } else if (arg === '-b' || arg === '--bucket') {
      bucket = argv[++i] || bucket;
    } else if (arg === '-r' || arg === '--remote') {
      remote = argv[++i] || remote;
    } else if (arg === '--urls-only') {
      urlsOnly = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--no-color') {
      noColor = true;
    } else if (/^\d+$/.test(arg)) {
      limit = parseInt(arg, 10);
    }
  }

  return {
    limit,
    bucket,
    remote,
    appUrl,
    bucketUrl,
    json,
    urlsOnly,
    noColor,
  };
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let val = bytes;
  let unitIndex = 0;

  while (val >= 1024 && unitIndex < units.length - 1) {
    val /= 1024;
    unitIndex++;
  }

  const unit = units[unitIndex];
  if (unit === 'GB' || unit === 'TB') {
    return `${val.toFixed(2)} ${unit}`;
  } else if (unit === 'MB' || unit === 'KB') {
    return `${val.toFixed(1)} ${unit}`;
  }
  return `${Math.round(val)} B`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return 'Unknown';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(0, 19).replace('T', ' ');
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  } catch {
    return isoString.slice(0, 19).replace('T', ' ');
  }
}

function isVideoFile(file: R2Object): boolean {
  if (file.IsDir) return false;
  const ext = path.extname(file.Path).toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) return true;
  if (file.MimeType && file.MimeType.startsWith('video/')) return true;
  return false;
}

function deriveSlug(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length > 1) {
    // Inside a folder (e.g. "my-video-uuid/video.mp4") -> slug is parent folder
    return parts[0];
  }
  // Root level file (e.g. "my-video-uuid.mp4") -> strip extension
  const ext = path.extname(filePath);
  return filePath.slice(0, -ext.length);
}

function getR2Objects(remote: string, bucket: string): R2Object[] {
  const target = `${remote}:${bucket}`;
  const result = spawnSync('rclone', ['lsjson', '-R', '--files-only', target], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.error) {
    if ('code' in result.error && (result.error as { code?: string }).code === 'ENOENT') {
      console.error("Error: 'rclone' is not installed or not found in PATH.");
    } else {
      console.error(`Error running rclone: ${result.error.message}`);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Error: Failed to query rclone target '${target}'.`);
    if (result.stderr) {
      console.error(`Details: ${result.stderr.trim()}`);
    }
    process.exit(1);
  }

  const output = result.stdout.trim();
  if (!output) return [];

  try {
    return JSON.parse(output) as R2Object[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error parsing rclone output: ${msg}`);
    process.exit(1);
  }
}

function main() {
  const args = parseCliArgs();

  if (!args.remote) {
    console.error('Error: RCLONE_REMOTE is not set in environment or provided via -r/--remote.');
    process.exit(1);
  }

  if (!args.bucket) {
    console.error('Error: BUCKET_NAME is not set in environment or provided via -b/--bucket.');
    process.exit(1);
  }

  const normalizedBucketUrl = args.bucketUrl && !/^https?:\/\//i.test(args.bucketUrl)
    ? `https://${args.bucketUrl}`
    : args.bucketUrl;

  const rawObjects = getR2Objects(args.remote, args.bucket);
  const videoFiles = rawObjects.filter(isVideoFile);

  // Sort by latest upload/modification date descending
  videoFiles.sort((a, b) => {
    const timeA = a.ModTime ? new Date(a.ModTime).getTime() : 0;
    const timeB = b.ModTime ? new Date(b.ModTime).getTime() : 0;
    return timeB - timeA;
  });

  const selectedFiles = args.limit ? videoFiles.slice(0, args.limit) : videoFiles;

  const videoEntries: VideoEntry[] = selectedFiles.map((file) => {
    const slug = deriveSlug(file.Path);
    const platformUrl = `${args.appUrl}/v/${slug}`;
    const r2Url = normalizedBucketUrl ? `${normalizedBucketUrl}/${file.Path}` : '';

    return {
      path: file.Path,
      name: file.Name,
      slug,
      platformUrl,
      r2Url,
      sizeBytes: file.Size || 0,
      sizeFormatted: formatSize(file.Size || 0),
      uploadDate: formatDate(file.ModTime),
      modTime: file.ModTime || '',
    };
  });

  if (args.urlsOnly) {
    for (const entry of videoEntries) {
      console.log(entry.platformUrl);
    }
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(videoEntries, null, 2));
    return;
  }

  const useColor = Boolean(process.stdout.isTTY) && !args.noColor && !process.env.NO_COLOR;
  const c = (text: string, code: string) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

  const divider = '─'.repeat(100);
  const target = `${args.remote}:${args.bucket}`;

  console.log(`${c('🎬 Cloudflare R2 Video Catalog', '1;36')}${c(` (${target})`, '2')}`);
  console.log(divider);

  if (videoEntries.length === 0) {
    console.log(c('No video files found in bucket.', '33'));
    console.log(divider);
    return;
  }

  console.log(
    c(' #  UPLOAD DATE          SIZE       PLATFORM URL', '1;33')
  );
  console.log(divider);

  videoEntries.forEach((entry, idx) => {
    const num = String(idx + 1).padStart(2, ' ');
    const date = entry.uploadDate.padEnd(19, ' ');
    const size = entry.sizeFormatted.padStart(9, ' ');
    const url = c(entry.platformUrl, '1;34');

    console.log(` ${c(num, '2')} ${c(date, '32')}  ${c(size, '1')}  ${url}`);
    console.log(`    ${c('↳ File:', '2')} ${c(entry.path, '90')}`);
  });

  console.log(divider);
  const totalBytes = videoEntries.reduce((sum, v) => sum + v.sizeBytes, 0);
  console.log(
    ` ${c('Total Videos:', '1')} ${videoEntries.length} ${
      args.limit && videoFiles.length > args.limit ? `(showing top ${args.limit} of ${videoFiles.length})` : ''
    }  │  ${c('Total Size:', '1')} ${formatSize(totalBytes)}`
  );
  console.log(divider);
}

main();
