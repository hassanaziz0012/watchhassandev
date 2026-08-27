const rawBucketUrl = process.env.CLOUDFLARE_BUCKET_URL || '';
const normalizedBucketUrl = rawBucketUrl && !/^https?:\/\//i.test(rawBucketUrl)
  ? `https://${rawBucketUrl}`
  : rawBucketUrl;
const R2_BASE_URL = normalizedBucketUrl.replace(/\/+$/, '');

export interface ResolvedVideo {
  folder: string;
  videoUrl: string;
  thumbnailUrl: string;
  vttUrl: string;
  captionsUrl: string;
  summaryUrl: string;
  title: string;
  uuid: string | null;
  slug: string;
}

const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export function resolveVideo(id: string): ResolvedVideo {
  const decoded = decodeURIComponent(id).trim();

  // The id represents the folder name (e.g. {filename}-{uuid})
  const slug = decoded;
  const folderUrl = `${R2_BASE_URL}/${slug}`;
  const videoUrl = `${folderUrl}/video.mp4`;
  const thumbnailUrl = `${folderUrl}/thumbnail.png`;
  const vttUrl = `${folderUrl}/chapters.vtt`;
  const captionsUrl = `${folderUrl}/captions.vtt`;
  const summaryUrl = `${folderUrl}/summary.md`;

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
    folder: slug,
    videoUrl,
    thumbnailUrl,
    vttUrl,
    captionsUrl,
    summaryUrl,
    title,
    uuid,
    slug,
  };
}
