#!/usr/bin/env bun
import { spawnSync } from 'child_process';

interface R2Object {
  Path: string;
  Name: string;
  Size: number;
  MimeType?: string;
  ModTime?: string;
  IsDir?: boolean;
}

interface CliArgs {
  uuid: string;
  bucket: string;
  remote: string;
  dryRun: boolean;
  yes: boolean;
  noColor: boolean;
}

function parseCliArgs(): CliArgs {
  const argv = process.argv.slice(2);
  let uuid = '';
  let bucket = process.env.BUCKET_NAME || '';
  let remote = process.env.RCLONE_REMOTE || '';
  let dryRun = false;
  let yes = false;
  let noColor = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      console.log(`
Usage: bun scripts/delete_video.ts <uuid> [options]

Delete all files belonging to a video from the Cloudflare R2 bucket.
The script finds every object whose path begins with a folder containing
the given UUID and deletes them all via rclone.

Arguments:
  <uuid>               The UUID portion of the video's R2 folder name
                       (e.g. "a1b2c3d4-..." or the full folder like "my-video-a1b2c3d4-...")

Options:
  -b, --bucket <name>  Cloudflare R2 bucket name (default: BUCKET_NAME from .env)
  -r, --remote <name>  rclone remote name (default: RCLONE_REMOTE from .env)
  --dry-run            List files that would be deleted without actually deleting them
  -y, --yes            Skip confirmation prompt
  --no-color           Disable ANSI color formatting
  -h, --help           Show this help message

Examples:
  bun scripts/delete_video.ts a1b2c3d4-e5f6-7890-abcd-ef1234567890
  bun scripts/delete_video.ts a1b2c3d4-e5f6-7890-abcd-ef1234567890 --dry-run
  bun scripts/delete_video.ts a1b2c3d4-e5f6-7890-abcd-ef1234567890 -y
`);
      process.exit(0);
    } else if (arg === '-b' || arg === '--bucket') {
      bucket = argv[++i] || bucket;
    } else if (arg === '-r' || arg === '--remote') {
      remote = argv[++i] || remote;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '-y' || arg === '--yes') {
      yes = true;
    } else if (arg === '--no-color') {
      noColor = true;
    } else if (!arg.startsWith('-')) {
      uuid = arg;
    } else {
      console.error(`Error: Unknown option '${arg}'.`);
      process.exit(1);
    }
  }

  return { uuid, bucket, remote, dryRun, yes, noColor };
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

function deleteObject(remote: string, bucket: string, filePath: string): void {
  const target = `${remote}:${bucket}/${filePath}`;
  const result = spawnSync('rclone', ['deletefile', target], { encoding: 'utf8' });

  if (result.error || result.status !== 0) {
    const detail = result.stderr?.trim() || result.error?.message || 'unknown error';
    throw new Error(`Failed to delete '${filePath}': ${detail}`);
  }
}

async function promptConfirm(message: string): Promise<boolean> {
  process.stdout.write(`${message} [y/N] `);

  return new Promise((resolve) => {
    const onData = (chunk: Buffer) => {
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      const answer = chunk.toString().trim().toLowerCase();
      resolve(answer === 'y' || answer === 'yes');
    };
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', onData);
  });
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
  if (unit === 'GB' || unit === 'TB') return `${val.toFixed(2)} ${unit}`;
  if (unit === 'MB' || unit === 'KB') return `${val.toFixed(1)} ${unit}`;
  return `${Math.round(val)} B`;
}

async function main() {
  const args = parseCliArgs();

  const useColor = Boolean(process.stdout.isTTY) && !args.noColor && !process.env.NO_COLOR;
  const c = (text: string, code: string) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

  if (!args.uuid) {
    console.error('Error: A video UUID is required.');
    console.error('Usage: bun scripts/delete_video.ts <uuid> [options]');
    process.exit(1);
  }

  if (!args.remote) {
    console.error('Error: RCLONE_REMOTE is not set in environment or provided via -r/--remote.');
    process.exit(1);
  }

  if (!args.bucket) {
    console.error('Error: BUCKET_NAME is not set in environment or provided via -b/--bucket.');
    process.exit(1);
  }

  console.log(`${c('🔍 Scanning bucket for files matching UUID:', '1;36')} ${c(args.uuid, '1;33')}`);

  const allObjects = getR2Objects(args.remote, args.bucket);

  // Match any file whose path contains the UUID (handles both root-level and folder-based layouts)
  const matches = allObjects.filter((obj) => obj.Path.includes(args.uuid));

  if (matches.length === 0) {
    console.log(c(`\n⚠️  No files found in bucket containing UUID '${args.uuid}'.`, '33'));
    process.exit(0);
  }

  // Derive the folder name from the first match for display purposes
  const folderName = matches[0].Path.split('/')[0];
  const totalBytes = matches.reduce((sum, obj) => sum + (obj.Size || 0), 0);
  const target = `${args.remote}:${args.bucket}`;

  const divider = '─'.repeat(64);
  console.log(`\n${c('📁 Video folder:', '1')} ${c(folderName, '1;34')}${c(` (${target})`, '2')}`);
  console.log(divider);
  console.log(c('  FILES TO DELETE:', '1;31'));

  for (const obj of matches) {
    const size = formatSize(obj.Size || 0).padStart(9);
    console.log(`  ${c('✗', '31')} ${c(size, '2')}  ${obj.Path}`);
  }

  console.log(divider);
  console.log(
    ` ${c('Total:', '1')} ${matches.length} file${matches.length === 1 ? '' : 's'}  │  ${c(formatSize(totalBytes), '1;31')}`
  );
  console.log(divider);

  if (args.dryRun) {
    console.log(c('\n🔎 Dry run — no files were deleted.', '33'));
    process.exit(0);
  }

  if (!args.yes) {
    const confirmed = await promptConfirm(
      c(`\n⚠️  Permanently delete these ${matches.length} file(s) from R2?`, '1;31')
    );
    if (!confirmed) {
      console.log(c('\nAborted. No files were deleted.', '33'));
      process.exit(0);
    }
  }

  console.log(`\n${c('🗑️  Deleting files...', '1')}`);

  let deleted = 0;
  let failed = 0;

  for (const obj of matches) {
    try {
      deleteObject(args.remote, args.bucket, obj.Path);
      console.log(`  ${c('✓', '32')} Deleted: ${obj.Path}`);
      deleted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ${c('✗', '31')} ${msg}`);
      failed++;
    }
  }

  console.log(divider);

  if (failed === 0) {
    console.log(
      `${c('✅ Done!', '1;32')} Deleted ${deleted} file${deleted === 1 ? '' : 's'} (${formatSize(totalBytes)} freed).`
    );
  } else {
    console.log(
      `${c('⚠️  Completed with errors.', '1;33')} Deleted: ${deleted}, Failed: ${failed}.`
    );
    process.exit(1);
  }
}

main();
