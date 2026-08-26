import Image from 'next/image';
import { notFound } from 'next/navigation';
import { VideoPlayer } from '@/components/video-player';
import { VideoSummary } from '@/components/video-summary';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { PageViewTracker } from '@/components/page-view-tracker';
import { resolveVideo } from '@/lib/resolve-video';
import { Keyboard, Calendar, ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ id: string }>;
}

function hasFileExtension(id: string): boolean {
  return /\.(mp4|mov|webm|mkv|m4v|avi|flv|wmv)$/i.test(id) || id.toLowerCase().endsWith('.mp4');
}

async function fetchSummary(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (!text || text.trim().startsWith('<?xml') || text.trim().startsWith('<Error>') || text.includes('<!DOCTYPE html>')) {
      return null;
    }

    return text.trim();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!id || hasFileExtension(id)) {
    notFound();
  }

  const video = resolveVideo(id);

  return {
    title: `${video.title} | Watch Hassan Dev`,
    description: `Watch ${video.title} streamed in high definition.`,
  };
}

export default async function WatchPage({ params }: PageProps) {
  const { id } = await params;
  if (!id || hasFileExtension(id)) {
    notFound();
  }

  const video = resolveVideo(id);
  const summary = await fetchSummary(video.summaryUrl);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary-500 selection:text-white">
      <PageViewTracker />
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Video Player Section */}
        <section aria-label="Video Player Stage" className="space-y-4">
          <VideoPlayer src={video.videoUrl} title={video.title} chaptersUrl={video.vttUrl} />

          {/* Title & Channel Bar */}
          <div className="space-y-3 pt-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
              {video.title}
            </h1>

            {/* YouTube-style Channel Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-primary-950/80">
              {/* Channel Profile Info */}
              <div className="flex items-center gap-3">
                <a
                  href="https://hassandev.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative shrink-0 group block"
                >
                  <Image
                    src="/hassan.jpg"
                    alt="Hassan Aziz"
                    width={44}
                    height={44}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 dark:ring-primary-950 group-hover:ring-primary-500 transition-all duration-200 shadow-xs"
                    priority
                  />
                </a>
                <a
                  href="https://hassandev.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-base text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Hassan Aziz</span>
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <a
                  href="https://calendly.com/itshassanaziz/discuss-a-project"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 active:scale-[0.98] transition-all duration-200 shadow-md shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Book a Free Call</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Video Summary Section */}
        {summary && <VideoSummary markdown={summary} />}

        {/* Shortcuts */}
        <section aria-label="Keyboard Shortcuts" className="pt-2">
          <div className="p-6 rounded-2xl bg-white dark:bg-primary-1000/50 border border-slate-200/80 dark:border-primary-950/80 shadow-xs dark:shadow-none space-y-4">
            <div className="flex items-center gap-2 text-slate-700 dark:text-primary-300">
              <Keyboard className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Shortcuts</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-black/40 border border-slate-200/70 dark:border-primary-950">
                <span className="font-medium text-slate-700 dark:text-primary-300">Play / Pause</span>
                <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-primary-950 text-slate-800 dark:text-primary-200 font-mono text-[11px] border border-slate-300/80 dark:border-primary-900 shadow-2xs">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-black/40 border border-slate-200/70 dark:border-primary-950">
                <span className="font-medium text-slate-700 dark:text-primary-300">Fullscreen</span>
                <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-primary-950 text-slate-800 dark:text-primary-200 font-mono text-[11px] border border-slate-300/80 dark:border-primary-900 shadow-2xs">F</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-black/40 border border-slate-200/70 dark:border-primary-950">
                <span className="font-medium text-slate-700 dark:text-primary-300">Mute / Unmute</span>
                <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-primary-950 text-slate-800 dark:text-primary-200 font-mono text-[11px] border border-slate-300/80 dark:border-primary-900 shadow-2xs">M</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-black/40 border border-slate-200/70 dark:border-primary-950">
                <span className="font-medium text-slate-700 dark:text-primary-300">Seek ±5s</span>
                <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-primary-950 text-slate-800 dark:text-primary-200 font-mono text-[11px] border border-slate-300/80 dark:border-primary-900 shadow-2xs">← / →</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-black/40 border border-slate-200/70 dark:border-primary-950">
                <span className="font-medium text-slate-700 dark:text-primary-300">Volume ±5%</span>
                <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-primary-950 text-slate-800 dark:text-primary-200 font-mono text-[11px] border border-slate-300/80 dark:border-primary-900 shadow-2xs">↑ / ↓</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-black/40 border border-slate-200/70 dark:border-primary-950">
                <span className="font-medium text-slate-700 dark:text-primary-300">Picture in Picture</span>
                <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-primary-950 text-slate-800 dark:text-primary-200 font-mono text-[11px] border border-slate-300/80 dark:border-primary-900 shadow-2xs">P</kbd>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
