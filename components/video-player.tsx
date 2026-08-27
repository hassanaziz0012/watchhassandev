'use client';

import { MediaPlayer, MediaOutlet, MediaCommunitySkin } from '@vidstack/react';
import { useSyncExternalStore, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title: string;
  poster?: string;
  autoplay?: boolean;
  pageUrl?: string;
  chaptersUrl?: string;
  captionsUrl?: string;
}

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function sendTrackingEvent(url: string, event: 'page_view' | 'video_play' | 'video_completion') {
  const payload = JSON.stringify({ url, event });
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    const queued = navigator.sendBeacon('/api/track', blob);
    if (queued) return;
  }

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch((err) => {
    console.debug(`Failed to send ${event} tracking event:`, err);
  });
}

export function VideoPlayer({ src, title, poster, autoplay = false, pageUrl, chaptersUrl, captionsUrl }: VideoPlayerProps) {
  const mounted = useMounted();
  const hasTrackedPlay = useRef(false);
  const hasTrackedCompletion = useRef(false);

  const handlePlay = useCallback(() => {
    if (hasTrackedPlay.current) return;
    hasTrackedPlay.current = true;
    const currentUrl = pageUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (currentUrl) {
      sendTrackingEvent(currentUrl, 'video_play');
    }
  }, [pageUrl]);

  const handleEnded = useCallback(() => {
    if (hasTrackedCompletion.current) return;
    hasTrackedCompletion.current = true;
    const currentUrl = pageUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (currentUrl) {
      sendTrackingEvent(currentUrl, 'video_completion');
    }
  }, [pageUrl]);

  if (!mounted) {
    return (
      <div className="relative aspect-video w-full flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-primary-1000/90 border border-slate-200 dark:border-primary-950/80 shadow-lg">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-primary-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="text-sm font-medium">Initializing player...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full group rounded-2xl overflow-hidden shadow-2xl shadow-slate-300/40 dark:shadow-primary-500/15 ring-1 ring-slate-200 dark:ring-primary-800/40">
      {/* Ambient glow behind player */}
      <div 
        aria-hidden="true" 
        className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary-500/10 via-primary-400/15 to-primary-600/10 dark:from-primary-600/20 dark:via-primary-400/20 dark:to-primary-600/20 blur-xl opacity-60 dark:opacity-75 group-hover:opacity-100 transition duration-500 -z-10" 
      />

      <MediaPlayer
        title={title}
        src={src}
        poster={poster}
        autoPlay={autoplay}
        playsInline
        aspectRatio="16/9"
        crossOrigin=""
        onPlay={handlePlay}
        onStarted={handlePlay}
        onEnded={handleEnded}
        onEnd={handleEnded}
        className="w-full bg-black overflow-hidden rounded-2xl"
      >
        <MediaOutlet>
          {poster && (
            <img
              slot="poster"
              src={poster}
              alt={title || 'Video poster'}
              className="w-full h-full object-cover"
            />
          )}
          {captionsUrl && (
            <track
              src={captionsUrl}
              kind="subtitles"
              srcLang="en"
              label="English"
              default
            />
          )}
          {chaptersUrl && (
            <track
              src={chaptersUrl}
              kind="chapters"
              srcLang="en"
              label="Chapters"
              default
            />
          )}
        </MediaOutlet>
        <MediaCommunitySkin />
      </MediaPlayer>
    </div>
  );
}
