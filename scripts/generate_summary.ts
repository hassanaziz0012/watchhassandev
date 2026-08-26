import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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
 * Clean SRT / VTT artifacts if necessary to provide high-signal transcript text
 */
function cleanTranscript(rawTranscript: string): string {
  // If it looks like an SRT file, extract text lines
  if (/^\d+\r?\n\d{2}:\d{2}:\d{2}/m.test(rawTranscript)) {
    const lines = rawTranscript.split(/\r?\n/);
    const cleanedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip numeric index lines
      if (/^\d+$/.test(line)) continue;
      // Skip timestamp lines (00:00:01,000 --> 00:00:04,000)
      if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) continue;
      if (line) {
        cleanedLines.push(line);
      }
    }
    return cleanedLines.join(' ');
  }

  // If it looks like WebVTT
  if (rawTranscript.startsWith('WEBVTT')) {
    const lines = rawTranscript.split(/\r?\n/);
    const cleanedLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'WEBVTT' || /^\d{2}:\d{2}/.test(trimmed) || trimmed.includes('-->')) continue;
      cleanedLines.push(trimmed);
    }
    return cleanedLines.join(' ');
  }

  return rawTranscript;
}

/**
 * Call browserllm with Claude provider using the prompt template
 */
async function fetchSummaryWithClaude(transcript: string, videoTitle: string): Promise<string> {
  const projectRoot = path.resolve(__dirname, '..');
  const promptTemplatePath = path.resolve(projectRoot, 'prompts', 'generate_summary.md');

  if (!fs.existsSync(promptTemplatePath)) {
    throw new Error(`Prompt template not found at: ${promptTemplatePath}`);
  }

  const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8');
  const filledPrompt = promptTemplate
    .replace('{title}', videoTitle)
    .replace('{transcript}', transcript);

  // Create temporary files for prompt and output
  const tmpDir = os.tmpdir();
  const tmpPromptFile = path.join(tmpDir, `browserllm_summary_prompt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.md`);
  const tmpOutputFile = path.join(tmpDir, `browserllm_summary_output_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.md`);

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
      // Fallback to stdout if output file is empty
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
    let summaryMd = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strip outer markdown code fences if wrapped in ```markdown ... ```
    if (summaryMd.startsWith('```markdown') && summaryMd.endsWith('```')) {
      summaryMd = summaryMd.slice('```markdown'.length, -3).trim();
    } else if (summaryMd.startsWith('```md') && summaryMd.endsWith('```')) {
      summaryMd = summaryMd.slice('```md'.length, -3).trim();
    } else if (summaryMd.startsWith('```') && summaryMd.endsWith('```')) {
      summaryMd = summaryMd.slice(3, -3).trim();
    }

    return summaryMd;
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
    console.error('Usage: bun scripts/generate_summary.ts <input-transcript-path> [output-md-path] [video-title]');
    console.error('Example: bun scripts/generate_summary.ts input.srt output.md "Client Demo Walkthrough"');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), args[0]);
  const outputPath = args[1]
    ? path.resolve(process.cwd(), args[1])
    : inputPath.replace(/\.[^/.]+$/, '') + '.md';

  const videoTitle = args[2] || deriveTitleFromPath(inputPath);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input transcript file not found at: ${inputPath}`);
    process.exit(1);
  }

  const rawTranscript = fs.readFileSync(inputPath, 'utf8').trim();
  if (!rawTranscript) {
    console.error(`❌ Error: Input transcript file is empty: ${inputPath}`);
    process.exit(1);
  }

  const transcript = cleanTranscript(rawTranscript);

  console.log('==========================================');
  console.log(`📄 Input transcript: ${inputPath}`);
  console.log(`🏷️  Video Title:      ${videoTitle}`);
  console.log(`🎯 Output MD file:   ${outputPath}`);
  console.log('==========================================');

  try {
    const summary = await fetchSummaryWithClaude(transcript, videoTitle);

    // Ensure parent directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, summary, 'utf8');

    console.log('\n==========================================');
    console.log(`🎉 Summary successfully generated and saved to: ${outputPath}`);
    console.log('==========================================\n');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error generating summary: ${msg}`);
    process.exit(1);
  }
}

main();
