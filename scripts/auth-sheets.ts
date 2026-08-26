import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Helper to load .env or .env.local if running standalone in Node without Bun preloading
function loadEnvFiles() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          // Remove surrounding quotes if present
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnvFiles();

async function main() {
  console.log('\n=============================================');
  console.log('🔍 Google Sheets Service Account Verifier');
  console.log('=============================================\n');

  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (rawKey) {
      try {
        const trimmed = rawKey.trim();
        const parsed = trimmed.startsWith('{')
          ? JSON.parse(trimmed)
          : JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
        if (parsed.client_email && parsed.private_key) {
          clientEmail = parsed.client_email;
          privateKey = parsed.private_key;
        }
      } catch {
        console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON string.');
      }
    }
  }

  if (!clientEmail || !privateKey) {
    console.error('❌ Missing Service Account credentials in environment variables!\n');
    console.error('Please configure the following in your .env or Vercel Environment Variables:');
    console.error('  - GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@your-project.iam.gserviceaccount.com');
    console.error('  - GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    console.error('  - GOOGLE_SHEET_ID=your_spreadsheet_id\n');
    process.exit(1);
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    console.error('❌ Missing GOOGLE_SHEET_ID in environment variables.');
    process.exit(1);
  }

  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';
  let formattedKey = privateKey.trim();
  if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
    formattedKey = formattedKey.slice(1, -1);
  }
  if (formattedKey.endsWith(',')) {
    formattedKey = formattedKey.slice(0, -1).trim();
  }
  if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
    formattedKey = formattedKey.slice(1, -1);
  }
  formattedKey = formattedKey.replace(/\\n/g, '\n').replace(/\r/g, '');

  console.log(`👤 Service Account Email: ${clientEmail}`);
  console.log(`📊 Target Spreadsheet ID: ${spreadsheetId}`);
  console.log(`📑 Target Sheet Name:    ${sheetName}\n`);
  console.log('Connecting to Google Sheets API...');

  try {
    const auth = new google.auth.JWT({
      email: clientEmail.trim(),
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Test 1: Get spreadsheet metadata
    const metaRes = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const title = metaRes.data.properties?.title || 'Untitled';
    console.log(`✅ Connection successful! Spreadsheet Title: "${title}"`);

    // Test 2: Check rows in specified sheet
    const valuesRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:D`,
    });

    const rows = valuesRes.data.values || [];
    console.log(`✅ Successfully read sheet "${sheetName}". Current row count: ${rows.length}`);

    if (rows.length > 0) {
      console.log(`   Header row: [${rows[0].join(', ')}]`);
    } else {
      console.log('   Sheet is currently empty (headers will be automatically created on first event).');
    }

    console.log('\n🎉 Everything is configured properly for production on Vercel!\n');
    console.log('Vercel Setup Reminder:');
    console.log('Add the following variables to your Vercel Project Settings > Environment Variables:');
    console.log(`  1. GOOGLE_SERVICE_ACCOUNT_EMAIL = ${clientEmail}`);
    console.log(`  2. GOOGLE_PRIVATE_KEY           = (your full private key)`);
    console.log(`  3. GOOGLE_SHEET_ID              = ${spreadsheetId}`);
    if (process.env.GOOGLE_SHEET_NAME) {
      console.log(`  4. GOOGLE_SHEET_NAME            = ${process.env.GOOGLE_SHEET_NAME}`);
    }
    console.log('\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Error communicating with Google Sheets:\n${msg}\n`);

    if (msg.includes('403') || msg.includes('The caller does not have permission') || msg.includes('404')) {
      console.error('👉 ACTION REQUIRED:');
      console.error(`1. Open your Google Sheet in a browser: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
      console.error(`2. Click the "Share" button (top right).`);
      console.error(`3. Paste the Service Account email:`);
      console.error(`   👉 ${clientEmail}`);
      console.error(`4. Grant it "Editor" access and click Send.`);
      console.error(`5. Re-run this script to verify access.\n`);
    }
    process.exit(1);
  }
}

main();
