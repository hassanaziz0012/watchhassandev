#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const remote = process.env.RCLONE_REMOTE;
const bucket = process.env.BUCKET_NAME;

if (!remote || !bucket) {
  console.error('Error: RCLONE_REMOTE and BUCKET_NAME must be set in your environment or .env file.');
  process.exit(1);
}

const backupDir = path.join(process.env.HOME || '', 'Videos/loom-backup');
fs.mkdirSync(backupDir, { recursive: true });

console.log(`⬇️  Backing up videos and assets from ${remote}:${bucket} into ${backupDir}...`);
execSync(`rclone copy "${remote}:${bucket}" "${backupDir}" --progress`, { stdio: 'inherit' });

// Ensure any root-level assets are organized in their own video folder
for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
  if (entry.isFile()) {
    const slug = path.parse(entry.name).name;
    const targetFolder = path.join(backupDir, slug);
    fs.mkdirSync(targetFolder, { recursive: true });
    fs.renameSync(path.join(backupDir, entry.name), path.join(targetFolder, entry.name));
  }
}

console.log(`\n🎉 Backup complete! Videos saved to: ${backupDir}`);
