import { google } from 'googleapis';

export type TrackingEventType = 'page_view' | 'video_play' | 'video_completion';

export interface TrackingPayload {
  url: string;
  event: TrackingEventType;
}

let authClientInstance: InstanceType<typeof google.auth.JWT> | null = null;

/**
 * Resolves Google Service Account credentials from environment variables.
 * Designed for serverless environments like Vercel with zero file dependency.
 */
function getServiceAccountCredentials(): { clientEmail: string; privateKey: string } | null {
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  // Support single JSON environment variable (raw JSON or base64 encoded)
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
      } catch (e) {
        console.error('[Google Sheets Tracking] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e);
      }
    }
  }

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Clean and ensure newlines in private key are properly formatted
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

  return {
    clientEmail: clientEmail.trim(),
    privateKey: formattedKey,
  };
}

function getGoogleAuthClient() {
  if (authClientInstance) {
    return authClientInstance;
  }

  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    console.warn(
      '[Google Sheets Tracking] Missing Google Service Account credentials. ' +
      'Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY (or GOOGLE_SERVICE_ACCOUNT_KEY) in environment variables.'
    );
    return null;
  }

  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  authClientInstance = auth;
  return auth;
}

// Concurrency queue to serialize sheet operations and prevent race conditions
let queuePromise = Promise.resolve();

export async function trackInSheet(url: string, event: TrackingEventType): Promise<{ success: boolean; error?: string }> {
  // Chain calls onto queue
  return new Promise((resolve) => {
    queuePromise = queuePromise
      .then(async () => {
        try {
          const result = await executeTrackInSheet(url, event);
          resolve(result);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('[Google Sheets Tracking] Error updating sheet:', errorMsg);
          resolve({ success: false, error: errorMsg });
        }
      })
      .catch((err) => {
        console.error('[Google Sheets Tracking] Queue error:', err);
        resolve({ success: false, error: String(err) });
      });
  });
}

async function executeTrackInSheet(rawUrl: string, event: TrackingEventType): Promise<{ success: boolean; error?: string }> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    console.warn('[Google Sheets Tracking] GOOGLE_SHEET_ID is not configured in .env. Event tracking skipped.');
    return { success: false, error: 'GOOGLE_SHEET_ID is not configured' };
  }

  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';
  const auth = getGoogleAuthClient();
  if (!auth) {
    return { success: false, error: 'Google Service Account credentials not configured' };
  }

  const sheets = google.sheets({ version: 'v4', auth });
  const cleanUrl = rawUrl.trim();

  // 1. Fetch current rows in Columns A:D
  let getRes;
  try {
    getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:D`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('403') || errorMsg.includes('The caller does not have permission') || errorMsg.includes('404')) {
      console.error(
        `[Google Sheets Tracking] Permission denied or sheet not found. ` +
        `Make sure you have shared the Google Sheet (${spreadsheetId}) with your service account email as "Editor".`
      );
    }
    throw err;
  }

  const rows = getRes.data.values || [];

  // 2. If the sheet is empty, ensure header row exists
  if (rows.length === 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1:D1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['URL', 'Page views', 'Video plays', 'Video completions']],
      },
    });
    rows.push(['URL', 'Page views', 'Video plays', 'Video completions']);
  }

  // 3. Search for matching URL (Row 0 is header, so search from row 1)
  let foundRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rowUrl = (rows[i][0] || '').trim();
    if (rowUrl === cleanUrl) {
      foundRowIndex = i;
      break;
    }
  }

  if (foundRowIndex !== -1) {
    // Existing row: Increment the corresponding cell
    const rowNumber = foundRowIndex + 1; // 1-based index in Google Sheets
    const currentRow = rows[foundRowIndex];

    const currentViews = parseInt(currentRow[1] || '0', 10) || 0;
    const currentPlays = parseInt(currentRow[2] || '0', 10) || 0;
    const currentCompletions = parseInt(currentRow[3] || '0', 10) || 0;

    let targetColumn = 'B';
    let newValue = currentViews;

    if (event === 'page_view') {
      targetColumn = 'B';
      newValue = currentViews + 1;
      currentRow[1] = String(newValue);
    } else if (event === 'video_play') {
      targetColumn = 'C';
      newValue = currentPlays + 1;
      currentRow[2] = String(newValue);
    } else if (event === 'video_completion') {
      targetColumn = 'D';
      newValue = currentCompletions + 1;
      currentRow[3] = String(newValue);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${targetColumn}${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newValue]],
      },
    });

    return { success: true };
  } else {
    // New row: Append new row [URL, page_views, video_plays, video_completions]
    const initialViews = event === 'page_view' ? 1 : 0;
    const initialPlays = event === 'video_play' ? 1 : 0;
    const initialCompletions = event === 'video_completion' ? 1 : 0;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[cleanUrl, initialViews, initialPlays, initialCompletions]],
      },
    });

    rows.push([cleanUrl, String(initialViews), String(initialPlays), String(initialCompletions)]);
    return { success: true };
  }
}
