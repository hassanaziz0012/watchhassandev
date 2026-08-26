const R2_BASE_URL = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  'https://loom-worker.hassanaziz0012.workers.dev'
).replace(/\/+$/, '');

export interface ResolvedVideo {
  filename: string;
  videoUrl: string;
  vttFilename: string;
  vttUrl: string;
  summaryFilename: string;
  summaryUrl: string;
  title: string;
  uuid: string | null;
  slug: string;
}

const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export function resolveVideo(id: string): ResolvedVideo {
  const decoded = decodeURIComponent(id).trim();

  // The id represents the filename without the file extension
  const slug = decoded;
  const filename = `${slug}.mp4`;
  const videoUrl = `${R2_BASE_URL}/${filename}`;
  const vttFilename = `${slug}.vtt`;
  const vttUrl = `${R2_BASE_URL}/${vttFilename}`;
  const summaryFilename = `${slug}.md`;
  const summaryUrl = `${R2_BASE_URL}/${summaryFilename}`;

  // Extract UUID if present in {filename}-{uuid}
  const uuidMatch = slug.match(UUID_REGEX);
  const uuid = uuidMatch ? uuidMatch[0] : null;

  // Extract human-readable title by stripping trailing -UUID and normalizing characters
  let rawTitle = slug;
  if (uuid) {
    rawTitle = rawTitle.replace(new RegExp(`[-_]?${uuid}$`, 'i'), '');
  }

  const title = (rawTitle.trim() || slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    filename,
    videoUrl,
    vttFilename,
    vttUrl,
    summaryFilename,
    summaryUrl,
    title,
    uuid,
    slug,
  };
}
