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

interface TypeStat {
  count: number;
  size: number;
}

interface CliArgs {
  top: number;
  bucket: string;
  remote: string;
  limit: number;
  all: boolean;
  json: boolean;
  noColor: boolean;
}

function parseCliArgs(): CliArgs {
  const argv = process.argv.slice(2);
  let top = 5;
  let bucket = process.env.BUCKET_NAME || '';
  let remote = process.env.RCLONE_REMOTE || '';
  let limit = parseFloat(process.env.LIMIT_GB || '10') || 10;
  let all = false;
  let json = false;
  let noColor = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      console.log(`
Usage: bun scripts/storage_overview.ts [options] [top_n]

Super concise Cloudflare R2 bucket storage overview.

Options:
  -n, --top <n>        Number of largest files to display (default: 5)
  -b, --bucket <name>  Cloudflare R2 bucket name (from BUCKET_NAME env var)
  -r, --remote <name>  rclone remote name (from RCLONE_REMOTE env var)
  -l, --limit <gb>     Free tier storage limit in GB (default: \${process.env.LIMIT_GB || '10'})
  -a, --all            Display all files instead of just the top N
  --json               Output overview as JSON
  --no-color           Disable ANSI color output
  -h, --help           Show this help message

Examples:
  bun run storage:overview
  bun scripts/storage_overview.ts 10
  bun scripts/storage_overview.ts --bucket my-bucket --all
`);
      process.exit(0);
    } else if (arg === '-n' || arg === '--top') {
      top = parseInt(argv[++i], 10) || 5;
    } else if (arg === '-b' || arg === '--bucket') {
      bucket = argv[++i] || bucket;
    } else if (arg === '-r' || arg === '--remote') {
      remote = argv[++i] || remote;
    } else if (arg === '-l' || arg === '--limit') {
      limit = parseFloat(argv[++i]) || limit;
    } else if (arg === '-a' || arg === '--all') {
      all = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--no-color') {
      noColor = true;
    } else if (/^\d+$/.test(arg)) {
      top = parseInt(arg, 10) || 5;
    }
  }

  return {
    top,
    bucket,
    remote,
    limit,
    all,
    json,
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
  } else if (unit === 'MB') {
    return `${val.toFixed(1)} ${unit}`;
  } else if (unit === 'KB') {
    return `${val.toFixed(1)} ${unit}`;
  }
  return `${Math.round(val)} B`;
}

function truncateMiddle(str: string, maxLength: number = 36): string {
  if (str.length <= maxLength) return str;
  const side = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, side)}...${str.slice(-side)}`;
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

  const useColor = Boolean(process.stdout.isTTY) && !args.noColor && !process.env.NO_COLOR;

  const c = (text: string, code: string) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

  const rawObjects = getR2Objects(args.remote, args.bucket);
  const files = rawObjects.filter((f) => !f.IsDir);

  const limitBytes = args.limit * 1024 * 1024 * 1024;
  const totalBytes = files.reduce((acc, f) => acc + (f.Size || 0), 0);
  const fileCount = files.length;
  const pctUsed = limitBytes > 0 ? (totalBytes / limitBytes) * 100 : 0;
  const remainingBytes = Math.max(0, limitBytes - totalBytes);

  // Group by extension
  const byExt = new Map<string, TypeStat>();
  for (const f of files) {
    const ext = path.extname(f.Path).toLowerCase() || '[no ext]';
    const stat = byExt.get(ext) || { count: 0, size: 0 };
    stat.count += 1;
    stat.size += f.Size || 0;
    byExt.set(ext, stat);
  }

  const sortedExts = Array.from(byExt.entries()).sort((a, b) => b[1].size - a[1].size);
  const sortedFiles = [...files].sort((a, b) => (b.Size || 0) - (a.Size || 0));
  const displayFiles = args.all ? sortedFiles : sortedFiles.slice(0, args.top);

  if (args.json) {
    const byExtObj: Record<string, TypeStat> = {};
    for (const [ext, stat] of sortedExts) {
      byExtObj[ext] = stat;
    }

    const jsonOutput = {
      remote: args.remote,
      bucket: args.bucket,
      totalBytes,
      totalSize: formatSize(totalBytes),
      limitBytes,
      limitSize: `${args.limit.toFixed(2)} GB`,
      percentUsed: Number(pctUsed.toFixed(2)),
      remainingBytes,
      remainingSize: formatSize(remainingBytes),
      totalFiles: fileCount,
      byExtension: byExtObj,
      largestFiles: displayFiles.map((f) => ({
        path: f.Path,
        sizeBytes: f.Size,
        size: formatSize(f.Size),
        modified: f.ModTime,
      })),
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }

  // Color coding threshold
  let usageColor = '1;32'; // Green
  if (pctUsed > 90) {
    usageColor = '1;31'; // Red
  } else if (pctUsed > 70) {
    usageColor = '1;33'; // Yellow
  }

  // Progress Bar (30 chars)
  const barWidth = 30;
  const filled = Math.min(barWidth, Math.round((pctUsed / 100) * barWidth));
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  const target = `${args.remote}:${args.bucket}`;
  const divider = '─'.repeat(64);

  // Render Overview
  console.log(`${c('☁️  Cloudflare R2 Storage Overview', '1;36')}${c(` (${target})`, '2')}`);
  console.log(divider);
  console.log(
    ` ${c('Used Storage:', '1').padEnd(useColor ? 25 : 16)} ${c(formatSize(totalBytes), usageColor)} / ${args.limit.toFixed(2)} GB (${pctUsed.toFixed(2)}%)`
  );
  console.log(` ${c('Usage Bar:', '1').padEnd(useColor ? 25 : 16)} [${c(bar, usageColor)}]`);
  console.log(` ${c('Free Remaining:', '1').padEnd(useColor ? 25 : 16)} ${formatSize(remainingBytes)}`);
  console.log(` ${c('Total Objects:', '1').padEnd(useColor ? 25 : 16)} ${fileCount} file${fileCount === 1 ? '' : 's'}`);

  if (sortedExts.length > 0) {
    const typeParts = sortedExts.slice(0, 4).map(([ext, stat]) => `${ext}: ${formatSize(stat.size)} (${stat.count})`);
    console.log(` ${c('By Type:', '1').padEnd(useColor ? 25 : 16)} ${typeParts.join('  │  ')}`);
  }

  console.log(divider);

  if (files.length === 0) {
    console.log(c(' 📦 Largest Files: (Bucket is currently empty)', '2'));
  } else {
    const title = args.all ? 'All Files' : `Largest Files (Top ${displayFiles.length})`;
    console.log(c(` 📦 ${title}`, '1;33'));
    console.log(c('  #   SIZE        SHARE    DATE        NAME', '2'));

    displayFiles.forEach((f, idx) => {
      const sizeStr = formatSize(f.Size || 0).padStart(9);
      const sharePct = totalBytes > 0 ? ((f.Size || 0) / totalBytes) * 100 : 0;
      const shareStr = `${sharePct.toFixed(1).padStart(5)}%`;
      const dateStr = f.ModTime ? f.ModTime.slice(0, 10) : '          ';
      const nameStr = truncateMiddle(f.Path, 34);

      console.log(`  ${String(idx + 1).padEnd(2)}  ${sizeStr}   ${shareStr}  ${dateStr}  ${nameStr}`);
    });
  }

  console.log(divider);
}

main();
