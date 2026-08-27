import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Film, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary-500 selection:text-white font-sans">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md w-full space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 border border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <Film className="w-8 h-8 opacity-80" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-wide text-primary-600 dark:text-primary-400 uppercase">
              404 — Video Not Found
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Invalid Video URL
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              This video link does not exist or has an unsupported format. If you were given a link to a video, please contact me (my socials are below).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 active:scale-[0.98] transition-all duration-200 shadow-md shadow-primary-500/25"
            >
              <Home className="h-4 w-4" />
              <span>Return Home</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
