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
  titleUrl: string;
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
  const titleUrl = `${folderUrl}/title.txt`;

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
    titleUrl,
    title,
    uuid,
    slug,
  };
}

async function probeUrl(url: string, method: 'HEAD' | 'GET'): Promise<number | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
      redirect: 'follow',
      next: { revalidate: 60 },
    });
    return res.status;
  } catch {
    return null;
  }
}

function isPresentStatus(status: number | null): boolean {
  return status !== null && (status === 200 || status === 206);
}

function isMissingStatus(status: number | null): boolean {
  return status === 404 || status === 410;
}

/**
 * Returns true when the playable video file exists in storage.
 * Optional sidecars (title, summary, captions) may be missing without failing the page.
 * Network failures fail open so a storage blip does not hide a real video.
 */
export async function videoAssetsExist(video: ResolvedVideo): Promise<boolean> {
  if (!R2_BASE_URL || !video.videoUrl) return false;

  let status = await probeUrl(video.videoUrl, 'HEAD');
  if (status === 405 || status === 501 || status === 400) {
    status = await probeUrl(video.videoUrl, 'GET');
  }

  if (isPresentStatus(status)) return true;
  if (isMissingStatus(status)) return false;
  if (status === null) return true;

  const getStatus = await probeUrl(video.videoUrl, 'GET');
  if (isPresentStatus(getStatus)) return true;
  if (isMissingStatus(getStatus)) return false;
  return getStatus === null;
}
