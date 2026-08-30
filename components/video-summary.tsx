'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface VideoSummaryProps {
  markdown: string;
}

type AnimationStatus = 'generating' | 'streaming';

function wrapWordsWithStagger(html: string, staggerMs = 35): string {
  let wordIndex = 0;

  const tagOrTextRegex = /(<[^>]+>)|([^<]+)/g;

  return html.replace(tagOrTextRegex, (_match: string, tag?: string, text?: string) => {
    if (tag) {
      return tag;
    }

    if (!text) {
      return '';
    }

    return text.replace(/([^\s\r\n]+|\s+)/g, (segment: string) => {
      if (/^\s+$/.test(segment)) {
        return segment;
      }

      const delay = (wordIndex * staggerMs) / 1000;
      wordIndex++;
      return `<span class="token-word" style="animation-delay: ${delay.toFixed(3)}s;">${segment}</span>`;
    });
  });
}

export function VideoSummary({ markdown }: VideoSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [status, setStatus] = useState<AnimationStatus>(() => (markdown ? 'generating' : 'streaming'));
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute estimated reading time (approx. 200 words per minute)
  const readTime = useMemo(() => {
    const words = markdown.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  }, [markdown]);

  // Initial "Generating" thinking phase (random duration between 1s and 3s)
  useEffect(() => {
    if (!markdown) return;

    // Random duration between 1000ms and 3000ms
    const randomDuration = Math.floor(Math.random() * 2000) + 1000;

    const timer = setTimeout(() => {
      setStatus('streaming');
    }, randomDuration);

    timerRef.current = timer;

    return () => {
      clearTimeout(timer);
    };
  }, [markdown]);

  // Parse markdown into HTML string with staggered word opacity transitions
  const htmlContent = useMemo(() => {
    if (!markdown) return '';
    try {
      const rawHtml = marked.parse(markdown, {
        gfm: true,
        breaks: true,
      }) as string;
      return wrapWordsWithStagger(rawHtml, 35);
    } catch {
      return markdown;
    }
  }, [markdown]);

  return (
    <section aria-label="AI Video Summary" className="pt-2">
      <div className="rounded-2xl bg-white dark:bg-primary-1000/50 border border-slate-200/80 dark:border-primary-950/80 shadow-xs dark:shadow-none overflow-hidden transition-all duration-300">
        {/* Summary Card Header */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-primary-950/60 bg-slate-50/50 dark:bg-primary-1000/20">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Summary & Takeaways
            </h2>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-primary-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{readTime}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Expand / Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-primary-300 bg-white dark:bg-primary-950/60 hover:bg-slate-100 dark:hover:bg-primary-900/60 border border-slate-200 dark:border-primary-900/50 shadow-2xs hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              aria-label={isExpanded ? 'Collapse summary' : 'Expand summary'}
            >
              {isExpanded ? (
                <>
                  <span>Collapse</span>
                  <ChevronUp className="h-3.5 w-3.5 text-slate-500 dark:text-primary-400" />
                </>
              ) : (
                <>
                  <span>Expand</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-primary-400" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary Card Body */}
        {isExpanded && (
          <div className="p-6 sm:p-8 animate-in fade-in duration-200">
            {status === 'generating' ? (
              <div className="space-y-5 py-2">
                {/* AI Thinking header */}
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-primary-300">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 animate-bounce" />
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-primary-300/80">
                    Thinking...
                  </span>
                </div>

                {/* Shimmering Skeleton Lines */}
                <div className="space-y-3 pt-1">
                  <div className="h-3.5 rounded-lg bg-slate-200/80 dark:bg-primary-950/80 animate-pulse w-3/4" />
                  <div className="h-3.5 rounded-lg bg-slate-200/80 dark:bg-primary-950/80 animate-pulse w-full" />
                  <div className="h-3.5 rounded-lg bg-slate-200/80 dark:bg-primary-950/80 animate-pulse w-5/6" />
                  <div className="h-3.5 rounded-lg bg-slate-200/80 dark:bg-primary-950/80 animate-pulse w-2/3" />
                </div>
              </div>
            ) : (
              <div
                className="summary-markdown prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed text-slate-700 dark:text-primary-200/90
                  [&>h1]:text-xl [&>h1]:font-bold [&>h1]:text-slate-900 dark:[&>h1]:text-white [&>h1]:mt-6 [&>h1]:mb-3 [&>h1]:first:mt-0
                  [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-slate-900 dark:[&>h2]:text-white [&>h2]:mt-6 [&>h2]:mb-3 [&>h2]:first:mt-0 [&>h2]:flex [&>h2]:items-center [&>h2]:gap-2
                  [&>h3]:text-base [&>h3]:font-semibold [&>h3]:text-slate-800 dark:[&>h3]:text-primary-100 [&>h3]:mt-4 [&>h3]:mb-2
                  [&>p]:my-2.5 [&>p]:leading-relaxed
                  [&>ul]:my-3 [&>ul]:pl-5 [&>ul]:list-disc [&>ul]:space-y-1.5 [&>ul>li]:pl-1
                  [&>ol]:my-3 [&>ol]:pl-5 [&>ol]:list-decimal [&>ol]:space-y-1.5
                  [&_li]:marker:text-primary-500 dark:[&_li]:marker:text-primary-400
                  [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white
                  [&>blockquote]:border-l-4 [&>blockquote]:border-primary-500/50 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-3 [&>blockquote]:text-slate-600 dark:[&>blockquote]:text-primary-300
                  [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:bg-slate-100 dark:[&_code]:bg-primary-950 [&_code]:border [&_code]:border-slate-200 dark:[&_code]:border-primary-900 [&_code]:text-primary-600 dark:[&_code]:text-primary-300 [&_code]:text-xs [&_code]:font-mono
                  [&_hr]:my-6 [&_hr]:border-slate-200 dark:[&_hr]:border-primary-950
                "
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
