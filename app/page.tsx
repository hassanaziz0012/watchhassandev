import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ResumeShowcase } from "@/components/resume-showcase";
import {
  ArrowUpRight,
  Calendar,
  Globe,
  ArrowDown,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary-500 selection:text-white font-sans">
      {/* Background ambient lighting effects */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden -z-10"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[680px] h-[380px] bg-gradient-to-b from-primary-500/15 via-primary-600/10 to-transparent blur-3xl opacity-70 dark:opacity-40" />
        <div className="absolute top-[40%] -right-40 w-[420px] h-[420px] bg-primary-500/10 blur-3xl rounded-full opacity-50 dark:opacity-25" />
      </div>

      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col">
        {/* Hero Section (Above the fold) */}
        <section className="min-h-[calc(88vh-4rem)] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full py-16 sm:py-20 space-y-8">
          <div className="space-y-5 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Private video hosting for hassandev.me
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              I built this platform to deliver client walkthroughs, project milestones, and technical demos. It's my own custom self-hosted alternative to Loom.
            </p>
          </div>

          {/* Quick CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 w-full sm:w-auto">
            <a
              href="https://hassandev.me"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 cursor-pointer"
            >
              <Globe className="h-4 w-4" />
              <span>Visit hassandev.me</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>

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

          {/* Prompt to scroll to resume */}
          <div className="pt-8 sm:pt-12">
            <a
              href="#resume"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-400 transition-colors group"
            >
              <span>Explore Resume &amp; Background</span>
              <ArrowDown className="h-3.5 w-3.5 group-hover:translate-y-0.5 transition-transform" />
            </a>
          </div>
        </section>

        {/* Resume Section (Below the fold) */}
        <section
          id="resume"
          aria-label="Resume & Background"
          className="w-full border-t border-slate-200/80 dark:border-primary-950/80 transition-colors"
        >
          <ResumeShowcase />
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
