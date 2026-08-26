import { NextRequest, NextResponse } from 'next/server';
import { trackInSheet, TrackingEventType } from '@/lib/track-in-sheet';

export async function POST(request: NextRequest) {
  try {
    let body;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Handles sendBeacon text/plain or blob payloads
      const text = await request.text();
      body = JSON.parse(text);
    }

    const { url, event } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid URL' }, { status: 400 });
    }

    const validEvents: TrackingEventType[] = ['page_view', 'video_play', 'video_completion'];
    if (!validEvents.includes(event)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const result = await trackInSheet(url, event);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal tracking error' },
      { status: 500 }
    );
  }
}
