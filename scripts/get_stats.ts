#!/usr/bin/env bun
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Read .env / .env.local from project directory so project variables take precedence over shell environment
function loadEnv(): Record<string, string> {
  const projectDir = process.env.WATCHHASSANDEV_DIR || path.resolve(import.meta.dir, '..');
  const env: Record<string, string> = {};
  for (const file of ['.env', '.env.local']) {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
      for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq !== -1) {
          let val = trimmed.slice(eq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          env[trimmed.slice(0, eq).trim()] = val;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const spreadsheetId = env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEET_ID;
const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
const sheetName = env.GOOGLE_SHEET_NAME || 'Sheet1';

if (!spreadsheetId || !clientEmail || !privateKey) {
  console.error('Missing Google Sheets credentials in .env');
  process.exit(1);
}

const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
const response = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: `${sheetName}!A:D`,
});

const [, ...rows] = response.data.values || [];

const stats = rows.map(([url, pageViews, videoViews, videoCompletions]) => ({
  'URL': url,
  'Page views': Number(pageViews) || 0,
  'Video views': Number(videoViews) || 0,
  'Video completions': Number(videoCompletions) || 0,
}));

console.table(stats);
