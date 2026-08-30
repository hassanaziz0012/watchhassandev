'use client';

import { useState } from 'react';
import { Copy, Check, Download, ExternalLink, Code2, Share2 } from 'lucide-react';

interface VideoActionsProps {
  videoId?: string;
  videoUrl: string;
}

export function VideoActions({ videoUrl }: VideoActionsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  const embedCode = `<iframe src="${typeof window !== 'undefined' ? window.location.href : ''}" width="100%" height="480" frameborder="0" allowfullscreen allow="autoplay; fullscreen"></iframe>`;

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (e) {
      console.error('Failed to copy embed', e);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-primary-950/70 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white shadow-lg shadow-primary-500/25"
          >
            {copiedLink ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? 'Link Copied!' : 'Share Video'}
          </button>

          <button
            onClick={() => setShowEmbed(!showEmbed)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all bg-primary-950/60 hover:bg-primary-900/60 text-primary-200 border border-primary-900/50 hover:border-primary-700/50"
          >
            <Code2 className="h-4 w-4 text-primary-400" />
            <span>Embed</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-primary-300 hover:text-white bg-primary-950/40 hover:bg-primary-900/50 border border-primary-900/40 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>R2 Source</span>
          </a>

          <a
            href={videoUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-primary-300 hover:text-white bg-primary-950/40 hover:bg-primary-900/50 border border-primary-900/40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {showEmbed && (
        <div className="p-4 rounded-xl bg-primary-1000/80 border border-primary-900/60 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">
              Embed Iframe Code
            </span>
            <button
              onClick={handleCopyEmbed}
              className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-200 font-medium"
            >
              {copiedEmbed ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedEmbed ? 'Copied' : 'Copy Code'}
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-black/70 text-primary-200 font-mono text-xs overflow-x-auto border border-primary-950">
            {embedCode}
          </pre>
        </div>
      )}
    </div>
  );
}
