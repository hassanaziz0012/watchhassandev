import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Play, Globe, ArrowUpRight, Calendar } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-primary-950/60 bg-white/60 dark:bg-[#06090e]/60 backdrop-blur-xl backdrop-saturate-150 shadow-xs dark:shadow-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-primary-400 flex items-center justify-center shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform">
            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-lg text-slate-900 dark:text-white">
              Watch<span className="text-primary-600 dark:text-primary-400">Hassan</span>Dev
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <a
            href="https://hassandev.me"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-primary-300 hover:text-primary-600 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-primary-950/60"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden md:inline">hassandev.me</span>
            <ArrowUpRight className="h-3 w-3 opacity-70" />
          </a>

          <a
            href="https://calendly.com/itshassanaziz/discuss-a-project"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-primary-500/25"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Book a Call</span>
          </a>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
