'use client';

import React, { useState } from 'react';
import { Play, ArrowUpRight, Film } from 'lucide-react';
import { FaYoutube } from 'react-icons/fa6';

interface VideoItem {
  id: string;
  part: number;
  title: string;
  subtitle: string;
  description: string;
  youtubeUrl: string;
  thumbnail: string;
}

const LIVE_BUILD_VIDEOS: VideoItem[] = [
  {
    id: 'wiVDszNcYG0',
    part: 1,
    title: 'Building My Own Self Hosted Loom — Part 1',
    subtitle: 'From scratch to working MVP',
    description:
      'Setting up the Next.js foundation, custom Vidstack player, video streaming pipeline, and core layout from scratch.',
    youtubeUrl: 'https://www.youtube.com/watch?v=wiVDszNcYG0',
    thumbnail: 'https://i.ytimg.com/vi/wiVDszNcYG0/maxresdefault.jpg',
  },
  {
    id: '5sW_sYlEcxg',
    part: 2,
    title: 'Building My Own Self Hosted Loom — Part 2',
    subtitle: 'Polish, chapters, AI summary & styling',
    description:
      'Implementing automated chapters, AI-generated video summaries, keyboard navigation shortcuts, and theme polish.',
    youtubeUrl: 'https://www.youtube.com/watch?v=5sW_sYlEcxg',
    thumbnail: 'https://i.ytimg.com/vi/5sW_sYlEcxg/maxresdefault.jpg',
  },
];

export function LiveBuildSection() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="w-full relative py-16 sm:py-24">
      {/* Subtle background ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden -z-10"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[340px] bg-primary-500/10 dark:bg-primary-600/15 blur-3xl rounded-full opacity-60 dark:opacity-30" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-14">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-xs select-none">
            <FaYoutube className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span>Behind The Scenes</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Watch me build this live
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            I recorded myself building this entire platform live, mistakes and all. If that&apos;s
            something you&apos;re interested in, go watch these videos.
          </p>
        </div>

        {/* Video Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {LIVE_BUILD_VIDEOS.map((video) => {
            const isPlaying = playingId === video.id;

            return (
              <div
                key={video.id}
                className="group relative flex flex-col rounded-2xl bg-white dark:bg-primary-1000/50 border border-slate-200/80 dark:border-primary-950/80 shadow-xs hover:shadow-xl hover:shadow-primary-500/10 dark:hover:border-primary-800/60 transition-all duration-300 overflow-hidden"
              >
                {/* Media stage (Player or interactive thumbnail) */}
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                  {isPlaying ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setPlayingId(video.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPlayingId(video.id);
                        }
                      }}
                      className="relative w-full h-full cursor-pointer group/thumb focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                      aria-label={`Play ${video.title}`}
                    >
                      {/* High-res thumbnail */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/thumb:scale-105"
                      />

                      {/* Vignette Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent transition-opacity duration-300" />

                      {/* Part Badge in top corner */}
                      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/75 backdrop-blur-md text-white text-xs font-semibold border border-white/15 shadow-sm">
                        <Film className="h-3 w-3 text-primary-400" />
                        <span>Part {video.part}</span>
                      </div>

                      {/* Center Glowing Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative flex items-center justify-center">
                          {/* Ambient glow behind play button */}
                          <div className="absolute -inset-3 rounded-full bg-red-600/30 blur-md group-hover/thumb:bg-red-500/50 group-hover/thumb:scale-125 transition-all duration-300" />
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 group-hover/thumb:scale-110 group-hover/thumb:bg-red-500 transition-all duration-300">
                            <Play className="h-6 w-6 sm:h-7 sm:w-7 fill-white translate-x-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Bottom duration / click prompt label */}
                      <div className="absolute bottom-3 right-3 text-[11px] font-medium text-slate-200 bg-slate-950/70 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                        Click to watch
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                        {video.subtitle}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                      {video.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {video.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-primary-950/80">
                    <button
                      type="button"
                      onClick={() => setPlayingId(video.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{isPlaying ? 'Playing inline' : 'Play inline'}</span>
                    </button>

                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group/link cursor-pointer"
                    >
                      <FaYoutube className="h-3.5 w-3.5 text-red-500 group-hover/link:scale-110 transition-transform" />
                      <span>Watch on YouTube</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover/link:text-slate-900 dark:group-hover/link:text-white group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
