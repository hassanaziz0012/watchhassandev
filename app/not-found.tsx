import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  ArrowUpRight,
  Calendar,
  Globe,
  Home,
  Play,
} from "lucide-react";

export const metadata: Metadata = {
  title: "404 | Watch Hassan Dev",
  description: "This video could not be found on WatchHassanDev.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary-500 selection:text-white font-sans">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden -z-10"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[680px] h-[380px] bg-gradient-to-b from-primary-500/15 via-primary-600/10 to-transparent blur-3xl opacity-70 dark:opacity-40" />
        <div className="absolute top-[45%] -right-40 w-[420px] h-[420px] bg-primary-500/10 blur-3xl rounded-full opacity-50 dark:opacity-25" />
      </div>

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="w-full max-w-3xl space-y-8 text-center">
          <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-primary-1000/90 border border-slate-200/80 dark:border-primary-950/80 shadow-2xl shadow-slate-300/40 dark:shadow-primary-500/15 ring-1 ring-slate-200 dark:ring-primary-800/40">
            <div className="aspect-video w-full flex flex-col items-center justify-center gap-4 px-6">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary-600 via-primary-500 to-primary-400 flex items-center justify-center shadow-md shadow-primary-500/25">
                  <Play className="h-7 w-7 text-white fill-white ml-0.5" />
                </div>
                <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-primary-1000 border border-slate-200 dark:border-primary-800 text-[10px] font-bold text-slate-700 dark:text-primary-200 flex items-center justify-center">
                  ?
                </span>
              </div>
              <p className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-300 dark:text-primary-900/90 select-none">
                404
              </p>
            </div>
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <p className="text-xs sm:text-sm font-semibold tracking-wide text-primary-600 dark:text-primary-400 uppercase">
              Video not found
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              This recording isn&apos;t on WatchHassanDev
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              The link may be mistyped, expired, or was never uploaded. If someone sent you this URL, reach out and I&apos;ll get you the right video.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-1 w-full sm:w-auto">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 cursor-pointer"
            >
              <Home className="h-4 w-4" />
              <span>Return home</span>
            </Link>

            <a
              href="https://calendly.com/itshassanaziz/discuss-a-project"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-950/60 hover:bg-slate-50 dark:hover:bg-primary-900/60 border border-slate-200 dark:border-primary-900/60 transition-all duration-200 shadow-xs hover:-translate-y-0.5 cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span>Book a meeting</span>
            </a>
          </div>

          <a
            href="https://hassandev.me"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-400 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>hassandev.me</span>
            <ArrowUpRight className="h-3 w-3 opacity-70" />
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
