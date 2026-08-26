import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface RawTimestampEntry {
  timestamp?: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  title?: string;
}

interface Chapter {
  startTime: string;
  endTime: string;
  title: string;
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
 * Convert VTT timestamp (HH:MM:SS.mmm) to total seconds for comparison / math
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
 * Extracts approximate maximum timestamp from an SRT/VTT transcript to set the last chapter end time accurately.
 */
function estimateMaxTranscriptTime(transcript: string): string | null {
  const timestampRegex = /(\d{1,2}:\d{2}:\d{2}(?:[.,]\d{1,3})?|\d{1,2}:\d{2}(?:[.,]\d{1,3})?)/g;
  let maxSec = 0;
  let match: RegExpExecArray | null;

  while ((match = timestampRegex.exec(transcript)) !== null) {
    const norm = normalizeVttTimestamp(match[1]);
    const sec = vttToSeconds(norm);
    if (sec > maxSec) {
      maxSec = sec;
    }
  }

  return maxSec > 0 ? secondsToVtt(maxSec + 5) : null;
}

/**
 * Convert structured chapters array to standard WebVTT string
 */
function generateVttContent(chapters: Chapter[], maxEstimatedTime: string | null): string {
  const lines: string[] = ['WEBVTT', ''];

  chapters.forEach((chapter, index) => {
    let start = normalizeVttTimestamp(chapter.startTime, '00:00:00.000');
    let end = chapter.endTime ? normalizeVttTimestamp(chapter.endTime) : '';

    // Ensure the very first chapter starts at 00:00:00.000
    if (index === 0) {
      start = '00:00:00.000';
    }

    // Determine end timestamp if missing or if this is the last chapter
    if (!end || end === '00:00:00.000') {
      if (index < chapters.length - 1) {
        end = normalizeVttTimestamp(chapters[index + 1].startTime);
      } else {
        end = maxEstimatedTime || normalizeVttTimestamp(secondsToVtt(vttToSeconds(start) + 120));
      }
    }

    const title = chapter.title.trim().replace(/[\r\n]+/g, ' ') || `Chapter ${index + 1}`;

    lines.push(`${start} --> ${end}`);
    lines.push(title);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Derive clean human-readable title from file path
 */
function deriveTitleFromPath(filePath: string): string {
  const base = path.basename(filePath).replace(/\.[^/.]+$/, '');
  const clean = base
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return clean ? clean.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Video Walkthrough';
}

/**
 * Call browserllm with Claude provider using the prompt template
 */
async function fetchTimestampsWithClaude(transcript: string, videoTitle: string): Promise<RawTimestampEntry[]> {
  const projectRoot = path.resolve(__dirname, '..');
  const promptTemplatePath = path.resolve(projectRoot, 'prompts', 'generate_timestamps.md');

  if (!fs.existsSync(promptTemplatePath)) {
    throw new Error(`Prompt template not found at: ${promptTemplatePath}`);
  }

  let promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8');
  const filledPrompt = promptTemplate
    .replace('{title}', videoTitle)
    .replace('{transcript}', transcript);

  // Create temporary files for prompt and output
  const tmpDir = os.tmpdir();
  const tmpPromptFile = path.join(tmpDir, `browserllm_prompt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.md`);
  const tmpOutputFile = path.join(tmpDir, `browserllm_output_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.json`);

  fs.writeFileSync(tmpPromptFile, filledPrompt, 'utf8');

  console.log(`🤖 Invoking browserllm with Claude provider (-P claude)...`);

  try {
    const { stdout, stderr } = await execFileAsync('browserllm', [
      '-p', tmpPromptFile,
      '-P', 'claude',
      '-o', tmpOutputFile,
    ], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180000, // 3 minute timeout
    });

    let rawContent = '';
    if (fs.existsSync(tmpOutputFile)) {
      rawContent = fs.readFileSync(tmpOutputFile, 'utf8').trim();
    }

    if (!rawContent && stdout) {
      // If output file was not written, fallback to parsing stdout
      const responseMarker = '============================================================\nRESPONSE:\n============================================================';
      const endMarker = '============================================================';
      const startIdx = stdout.indexOf(responseMarker);
      if (startIdx !== -1) {
        const contentAfter = stdout.slice(startIdx + responseMarker.length);
        const endIdx = contentAfter.indexOf(endMarker);
        rawContent = (endIdx !== -1 ? contentAfter.slice(0, endIdx) : contentAfter).trim();
      } else {
        rawContent = stdout.trim();
      }
    }

    if (!rawContent) {
      throw new Error(`browserllm returned empty response. Stderr: ${stderr}`);
    }

    // Strip reasoning tags (<think>...</think>) if present
    let jsonStr = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strip markdown code fences if wrapped
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    // Extract JSON array or object if surrounded by extra text
    const firstBracket = jsonStr.indexOf('[');
    const firstBrace = jsonStr.indexOf('{');

    let parsed: any;
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      const lastBracket = jsonStr.lastIndexOf(']');
      if (lastBracket !== -1) {
        jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
      }
      parsed = JSON.parse(jsonStr);
    } else if (firstBrace !== -1) {
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace !== -1) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }
      const obj = JSON.parse(jsonStr);
      parsed = obj.timestamps || obj.chapters || obj.data || obj;
    } else {
      parsed = JSON.parse(jsonStr);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error(`LLM output did not contain a valid timestamps/chapters array:\n${rawContent}`);
    }

    return parsed;
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(tmpPromptFile)) fs.unlinkSync(tmpPromptFile);
      if (fs.existsSync(tmpOutputFile)) fs.unlinkSync(tmpOutputFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: bun scripts/generate_chapters.ts <input-transcript-path> [output-vtt-path] [video-title]');
    console.error('Example: bun scripts/generate_chapters.ts input.srt output.vtt "Client Demo Walkthrough"');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), args[0]);
  const outputPath = args[1]
    ? path.resolve(process.cwd(), args[1])
    : inputPath.replace(/\.[^/.]+$/, '') + '.vtt';

  const videoTitle = args[2] || deriveTitleFromPath(inputPath);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input transcript file not found at: ${inputPath}`);
    process.exit(1);
  }

  const transcript = fs.readFileSync(inputPath, 'utf8').trim();
  if (!transcript) {
    console.error(`❌ Error: Input transcript file is empty: ${inputPath}`);
    process.exit(1);
  }

  console.log('==========================================');
  console.log(`📄 Input transcript: ${inputPath}`);
  console.log(`🏷️  Video Title:      ${videoTitle}`);
  console.log(`🎯 Output VTT file:  ${outputPath}`);
  console.log('==========================================');

  try {
    const rawEntries = await fetchTimestampsWithClaude(transcript, videoTitle);

    // Convert raw timestamp entries to standardized Chapter objects
    const chapters: Chapter[] = rawEntries.map((item, idx) => {
      const startTime = item.timestamp || item.startTime || '00:00';
      const endTime = item.endTime || '';
      const title = item.topic || item.title || `Chapter ${idx + 1}`;
      return { startTime, endTime, title };
    });

    // Estimate total video duration from transcript to anchor the last chapter end time
    const maxEstimatedTime = estimateMaxTranscriptTime(transcript);

    console.log(`\n✅ Successfully generated ${chapters.length} chapters with Claude:`);
    chapters.forEach((ch, idx) => {
      const nextStart = chapters[idx + 1]?.startTime;
      const end = ch.endTime || nextStart || maxEstimatedTime || 'End';
      console.log(`   ${idx + 1}. [${ch.startTime} -> ${end}] ${ch.title}`);
    });

    const vttContent = generateVttContent(chapters, maxEstimatedTime);

    // Ensure parent directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, vttContent, 'utf8');

    console.log('\n==========================================');
    console.log(`🎉 WebVTT chapters saved to: ${outputPath}`);
    console.log('==========================================\n');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error generating chapters: ${msg}`);
    process.exit(1);
  }
}

main();
