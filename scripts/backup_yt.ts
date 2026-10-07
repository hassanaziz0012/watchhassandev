#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import readline from 'readline';
import { exec } from 'child_process';
import { OAuth2Client } from 'google-auth-library';
import { youtube } from 'googleapis/build/src/apis/youtube';
import { resolveVideo } from '../lib/resolve-video';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const DEFAULT_BACKUP_DIR = path.join(os.homedir(), 'Videos/loom-backup');
const CLIENT_SECRET_FILE = path.join(process.cwd(), 'tokens/client_secret.json');
const YOUTUBE_TOKEN_FILE = path.join(process.cwd(), 'tokens/youtube_token.json');
const UPLOADS_TRACKING_FILE = path.join(process.cwd(), 'tokens/youtube_uploads.json');

/**
 * Searches for a file in dir with exact name, falling back to matching extension.
 */
function findFile(dir: string, preferred: string, ext: string): string | null {
  const preferredPath = path.join(dir, preferred);
  if (fs.existsSync(preferredPath)) return preferredPath;
  const match = fs.readdirSync(dir).find((f) => f.endsWith(ext) && !f.includes('captions'));
  return match ? path.join(dir, match) : null;
}

/**
 * Parses chapters from WebVTT file and returns YouTube-formatted timestamps.
 */
function parseChaptersFromVtt(vttPath: string): string {
  if (!fs.existsSync(vttPath)) return '';
  const lines = fs.readFileSync(vttPath, 'utf8').split(/\r?\n/);
  const chapters: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const timeMatch = line.match(/^(\d{1,2}:)?(\d{2}):(\d{2})(?:\.\d+)?\s*-->/);
    if (timeMatch) {
      let title = '';
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (!next) continue;
        if (next.includes('-->')) break;
        title = next;
        break;
      }
      if (title && title.toLowerCase() !== 'full video') {
        const rawTime = line.split('-->')[0].trim().split('.')[0];
        const parts = rawTime.split(':');
        const formattedTime = parts.length === 3 && parts[0] === '00'
          ? `${parts[1]}:${parts[2]}`
          : parts.join(':');
        chapters.push(`${formattedTime} ${title}`);
      }
    }
  }

  if (chapters.length >= 3) {
    if (!chapters[0].startsWith('00:00') && !chapters[0].startsWith('0:00')) {
      chapters[0] = chapters[0].replace(/^[\d:]+/, '00:00');
    }
    return `\n\nChapters:\n${chapters.join('\n')}`;
  }
  return '';
}

/**
 * Obtains an authenticated OAuth2 client. If no valid token exists, starts
 * a local loopback server to handle the consent flow.
 */
async function getOAuth2Client(): Promise<OAuth2Client> {
  if (!fs.existsSync(CLIENT_SECRET_FILE)) {
    console.error(`\n❌ Missing OAuth client secret at: ${CLIENT_SECRET_FILE}`);
    console.error('Please ensure tokens/client_secret.json (Desktop App OAuth 2.0 Client) is present.');
    process.exit(1);
  }

  const secretJson = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, 'utf8'));
  const config = secretJson.installed || secretJson.web;
  if (!config) {
    console.error('\n❌ Invalid client_secret.json format. Expected "installed" or "web" credentials.');
    process.exit(1);
  }

  const port = 8085;
  const redirectUri = `http://localhost:${port}`;
  const oauth2Client = new OAuth2Client(config.client_id, config.client_secret, redirectUri);

  oauth2Client.on('tokens', (newTokens) => {
    const existing = fs.existsSync(YOUTUBE_TOKEN_FILE)
      ? JSON.parse(fs.readFileSync(YOUTUBE_TOKEN_FILE, 'utf8'))
      : {};
    fs.writeFileSync(YOUTUBE_TOKEN_FILE, JSON.stringify({ ...existing, ...newTokens }, null, 2));
  });

  // Check if we have an existing token
  let tokenData: any = null;
  if (fs.existsSync(YOUTUBE_TOKEN_FILE)) {
    tokenData = JSON.parse(fs.readFileSync(YOUTUBE_TOKEN_FILE, 'utf8'));
  } else if (fs.existsSync(path.join(process.cwd(), 'tokens/token.json'))) {
    const fallback = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tokens/token.json'), 'utf8'));
    const scopes = fallback.scopes || (typeof fallback.scope === 'string' ? fallback.scope.split(' ') : []);
    if (scopes.some((s: string) => s.includes('youtube'))) {
      tokenData = fallback;
    }
  }

  if (tokenData && (tokenData.access_token || tokenData.token || tokenData.refresh_token)) {
    oauth2Client.setCredentials({
      access_token: tokenData.access_token || tokenData.token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date || tokenData.expiry,
      token_type: tokenData.token_type || 'Bearer',
      scope: Array.isArray(tokenData.scopes) ? tokenData.scopes.join(' ') : tokenData.scope,
    });
    return oauth2Client;
  }

  // Interactive OAuth authorization
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n=============================================');
  console.log('🔑 YouTube OAuth Authorization Required');
  console.log('=============================================\n');
  console.log(`Opening browser for authentication...\n`);
  console.log(`If the browser does not open automatically, visit this URL:\n\n${authUrl}\n`);

  const code = await new Promise<string>((resolve) => {
    let resolved = false;

    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || '', `http://localhost:${port}`);
        const authCode = reqUrl.searchParams.get('code');
        if (authCode) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h2>Authentication successful!</h2><p>You can close this tab and return to your terminal.</p>');
          if (!resolved) {
            resolved = true;
            server.close();
            resolve(authCode);
          }
        } else {
          res.writeHead(400);
          res.end('Missing code parameter.');
        }
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });

    server.listen(port, () => {
      const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${openCmd} "${authUrl}"`, () => {});
    });

    // Also support manual code entry in terminal
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Paste authorization code here (or wait for browser redirect): ', (answer) => {
      rl.close();
      if (!resolved && answer.trim()) {
        resolved = true;
        server.close();
        resolve(answer.trim());
      }
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync(YOUTUBE_TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log(`\n✅ Authorization successful! Token saved to ${YOUTUBE_TOKEN_FILE}\n`);

  return oauth2Client;
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  let limit: number | undefined;
  let backupDir = DEFAULT_BACKUP_DIR;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit' && argv[i + 1]) {
      limit = parseInt(argv[++i], 10);
    } else if (argv[i] === '--dir' && argv[i + 1]) {
      backupDir = argv[++i];
    } else if (argv[i] === '-h' || argv[i] === '--help') {
      console.log(`
Usage: bun scripts/backup_yt.ts [options]

Uploads local Loom backup videos to YouTube as PRIVATE videos.
Automatically reads summary.md for descriptions and chapters.vtt for timestamps.

Options:
  --dry-run       Preview videos, descriptions, and chapters without uploading
  --force         Re-upload videos even if already recorded as uploaded
  --limit <n>     Process at most <n> videos
  --dir <path>    Specify custom backup directory (default: ~/Videos/loom-backup)
  -h, --help      Show this help message
`);
      process.exit(0);
    }
  }

  if (!fs.existsSync(backupDir)) {
    console.error(`\n❌ Backup directory does not exist: ${backupDir}`);
    process.exit(1);
  }

  // Load upload history
  const uploads: Record<string, string> = fs.existsSync(UPLOADS_TRACKING_FILE)
    ? JSON.parse(fs.readFileSync(UPLOADS_TRACKING_FILE, 'utf8'))
    : {};

  const entries = fs.readdirSync(backupDir).filter((folder) => {
    const full = path.join(backupDir, folder);
    return fs.statSync(full).isDirectory();
  });

  console.log(`\n📂 Found ${entries.length} video folder(s) in: ${backupDir}`);
  if (dryRun) console.log('🔍 Running in DRY-RUN mode (no uploads will be performed)\n');

  let oauth2Client: OAuth2Client | null = null;
  let yt: ReturnType<typeof youtube> | null = null;

  if (!dryRun) {
    oauth2Client = await getOAuth2Client();
    yt = youtube({ version: 'v3', auth: oauth2Client });
  }

  let processedCount = 0;

  for (const folder of entries) {
    if (limit && processedCount >= limit) {
      console.log(`\nReached limit of ${limit}. Stopping.`);
      break;
    }

    const folderPath = path.join(backupDir, folder);
    const localTrackingPath = path.join(folderPath, 'youtube_upload.json');

    let existingId = uploads[folder];
    if (!existingId && fs.existsSync(localTrackingPath)) {
      try {
        existingId = JSON.parse(fs.readFileSync(localTrackingPath, 'utf8')).id;
      } catch {}
    }

    if (existingId && !force) {
      console.log(`⏩ Skipping "${folder}" (already uploaded: https://youtu.be/${existingId})`);
      continue;
    }

    const videoPath = findFile(folderPath, 'video.mp4', '.mp4');
    if (!videoPath) {
      console.warn(`⚠️  No video file found in ${folder}, skipping.`);
      continue;
    }

    const summaryPath = findFile(folderPath, 'summary.md', '.md');
    const thumbPath = findFile(folderPath, 'thumbnail.png', '.png');
    const chaptersPath = findFile(folderPath, 'chapters.vtt', '.vtt');

    const videoInfo = resolveVideo(folder);
    const title = videoInfo.title.slice(0, 100);

    let summaryText = summaryPath && fs.existsSync(summaryPath)
      ? fs.readFileSync(summaryPath, 'utf8').trim()
      : '';
    const chaptersText = chaptersPath ? parseChaptersFromVtt(chaptersPath) : '';
    const fullDescription = (summaryText + chaptersText).slice(0, 5000);

    console.log(`\n--------------------------------------------------`);
    console.log(`🎬 Video:       ${title}`);
    console.log(`📁 Folder:      ${folder}`);
    console.log(`📹 File:        ${path.basename(videoPath)} (${(fs.statSync(videoPath).size / (1024 * 1024)).toFixed(1)} MB)`);
    console.log(`🖼️  Thumbnail:   ${thumbPath ? path.basename(thumbPath) : 'None'}`);
    console.log(`⏱️  Chapters:    ${chaptersText ? 'Yes' : 'No'}`);
    console.log(`🔒 Privacy:     private`);

    if (dryRun) {
      console.log(`\n[DRY RUN Description Preview]:\n${fullDescription}\n`);
      processedCount++;
      continue;
    }

    try {
      console.log(`\n⏳ Uploading video to YouTube...`);
      const insertRes = await yt!.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description: fullDescription,
            categoryId: '28',
          },
          status: {
            privacyStatus: 'private',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(videoPath),
        },
      });

      const videoId = insertRes.data.id;
      console.log(`✅ Upload complete! Video ID: ${videoId}`);
      console.log(`🔗 Link: https://youtu.be/${videoId}`);

      // Set thumbnail if available
      if (thumbPath && fs.existsSync(thumbPath)) {
        try {
          await new Promise((r) => setTimeout(r, 2000));
          await yt!.thumbnails.set({
            videoId: videoId!,
            media: {
              body: fs.createReadStream(thumbPath),
            },
          });
          console.log(`🖼️  Thumbnail uploaded successfully.`);
        } catch (thumbErr: any) {
          console.warn(`⚠️  Thumbnail upload skipped/failed: ${thumbErr.message}`);
        }
      }

      // Record successful upload
      uploads[folder] = videoId!;
      fs.writeFileSync(UPLOADS_TRACKING_FILE, JSON.stringify(uploads, null, 2));
      fs.writeFileSync(
        localTrackingPath,
        JSON.stringify({ id: videoId, title, uploadedAt: new Date().toISOString() }, null, 2)
      );

      processedCount++;
    } catch (err: any) {
      console.error(`❌ Failed to upload "${folder}": ${err.message}`);
    }
  }

  console.log(`\n🎉 Finished processing. Total uploaded in this session: ${processedCount}\n`);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
