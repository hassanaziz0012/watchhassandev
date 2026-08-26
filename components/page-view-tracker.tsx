'use client';

import { useEffect, useRef } from 'react';

export function PageViewTracker({ videoUrl }: { videoUrl?: string }) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    const currentUrl = videoUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (!currentUrl) return;

    const payload = JSON.stringify({ url: currentUrl, event: 'page_view' });

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
      console.debug('Failed to send page_view tracking event:', err);
    });
  }, [videoUrl]);

  return null;
}
