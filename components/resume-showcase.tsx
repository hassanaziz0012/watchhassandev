import React from "react";
import { ChevronRight } from "lucide-react";

export function ResumeShowcase() {
  return (
    <div className="w-full">
      {/* Resume Header Area */}
      <div className="w-full pt-12 sm:pt-16 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Hassan Aziz
            </h2>
            <ChevronRight
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500 shrink-0 select-none"
              aria-hidden="true"
            />
            <span className="text-slate-500 dark:text-slate-400">
              Full-Stack Developer
            </span>
          </div>
        </div>
      </div>

      {/* Main Resume Content in Max-Width Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12 sm:space-y-14">
        {/* Bio Section */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 md:gap-14">
          <div className="w-full sm:w-32 md:w-40 shrink-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs text-slate-400 dark:text-slate-500 sm:text-sm sm:normal-case sm:font-semibold sm:text-slate-900 sm:dark:text-white">
              Bio
            </h3>
          </div>
          <div className="flex-1 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              Full-stack developer building agentic systems, RAG, full-stack web apps, cross-platform mobile apps, and high-performance automation pipelines. Specialized in E2E product development, autonomous AI, and cloud architecture.
            </p>
          </div>
        </div>

        {/* Client & Contract Work Section */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 md:gap-14 pt-8 border-t border-slate-200/80 dark:border-primary-950/80">
          <div className="w-full sm:w-32 md:w-40 shrink-0">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-sm sm:normal-case sm:font-semibold sm:text-slate-900 sm:dark:text-white">
              Experience
            </h3>
          </div>
          <div className="flex-1 space-y-5 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Full Stack Developer
                </h4>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  2020 – Present
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Client &amp; Contract Work
              </p>
            </div>

            <ul className="space-y-3 list-disc list-outside pl-4 text-slate-600 dark:text-slate-300">
              <li>
                Fixing <strong className="font-semibold text-slate-900 dark:text-white">CRM issues</strong> for companies, generating <strong className="font-semibold text-slate-900 dark:text-white">$430k CAD</strong> in quotations in just 90 days (estimated <strong className="font-semibold text-slate-900 dark:text-white">$300-400k increase</strong> in quarterly revenue).
              </li>
              <li>
                Engineered custom automation workflows for SMBs, saving <strong className="font-semibold text-slate-900 dark:text-white">10+ manual work hours weekly</strong>.
              </li>
              <li>
                Architected &amp; scaled Python backends (AWS) to <strong className="font-semibold text-slate-900 dark:text-white">100k daily users</strong> worldwide, deploying <strong className="font-semibold text-slate-900 dark:text-white">load balancers</strong> and <strong className="font-semibold text-slate-900 dark:text-white">read replicas</strong>, and optimizing every layer (app, database, cache, servers).
              </li>
              <li>
                Developed Discord bots managing communities with <strong className="font-semibold text-slate-900 dark:text-white">35,000+ members</strong>.
              </li>
              <li>
                Built custom <strong className="font-semibold text-slate-900 dark:text-white">LMS solutions</strong> for teachers &amp; learning institutions, featuring better course management and progress tracking for <strong className="font-semibold text-slate-900 dark:text-white">100s of students</strong>.
              </li>
              <li>
                Designed several unique websites and brand materials for small companies and solo founders.
              </li>
            </ul>
          </div>
        </div>

        {/* Projects Section */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 md:gap-14 pt-8 border-t border-slate-200/80 dark:border-primary-950/80">
          <div className="w-full sm:w-32 md:w-40 shrink-0">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-sm sm:normal-case sm:font-semibold sm:text-slate-900 sm:dark:text-white">
              Projects
            </h3>
          </div>
          <div className="flex-1 space-y-8 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {/* Phantom */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Phantom
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Saves 20+ hrs per week for content creators
                </p>
              </div>

              <ul className="space-y-2.5 list-disc list-outside pl-4 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                <li>
                  <strong className="font-semibold text-slate-900 dark:text-white">AI-Driven Video Clipping:</strong> Programmed script-to-video alignment using local <strong className="font-semibold text-slate-900 dark:text-white">Faster Whisper</strong> (int8 quantized) and the <strong className="font-semibold text-slate-900 dark:text-white">Hungarian Algorithm</strong> (scipy) to automatically slice raw footage.
                </li>
                <li>
                  <strong className="font-semibold text-slate-900 dark:text-white">End-to-End CLI Pipeline:</strong> Built a Python/Bash CLI orchestrator automating the content lifecycle, saving creators <strong className="font-semibold text-slate-900 dark:text-white">20+ hours per week</strong>.
                </li>
                <li>
                  <strong className="font-semibold text-slate-900 dark:text-white">Advanced Media Rendering:</strong> Orchestrated <strong className="font-semibold text-slate-900 dark:text-white">FFmpeg</strong> filter graphs for <strong className="font-semibold text-slate-900 dark:text-white">DeepFilterNet</strong> noise reduction, broadcast normalization (-16 LUFS), and rounded corner overlays.
                </li>
                <li>
                  <strong className="font-semibold text-slate-900 dark:text-white">Automated Publishing:</strong> Automated publishing across 4 platforms (YT, IG, TikTok, X) using <strong className="font-semibold text-slate-900 dark:text-white">OAuth 2.0 APIs</strong>, cached login sessions, and <strong className="font-semibold text-slate-900 dark:text-white">Playwright</strong> browser scripts.
                </li>
              </ul>
            </div>

            {/* Jumprope Tracker */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Jumprope Tracker
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  AI-enabled cardio tracker and coach
                </p>
              </div>

              <ul className="space-y-2.5 list-disc list-outside pl-4 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                <li>
                  Built an <strong className="font-semibold text-slate-900 dark:text-white">agentic AI coach</strong>, with function calling, real-time data retrieval, long-term user memory, persistent conversation history, and proactive ML-generated notifications.
                </li>
                <li>
                  Eliminated cloud latency and external backend dependencies by engineering an <strong className="font-semibold text-slate-900 dark:text-white">offline-first</strong> mobile app using <strong className="font-semibold text-slate-900 dark:text-white">React Native</strong> and <strong className="font-semibold text-slate-900 dark:text-white">Expo SQLite</strong>.
                </li>
                <li>
                  Developed <strong className="font-semibold text-slate-900 dark:text-white">real-time</strong> analytics tracking <strong className="font-semibold text-slate-900 dark:text-white">9 distinct metrics</strong>, allowing visualizations across <strong className="font-semibold text-slate-900 dark:text-white">3 temporal aggregations</strong>.
                </li>
                <li>
                  Built a <strong className="font-semibold text-slate-900 dark:text-white">&quot;Share to social&quot;</strong> feature generating branded image cards, to drive app engagement and retention.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 md:gap-14 pt-8 border-t border-slate-200/80 dark:border-primary-950/80">
          <div className="w-full sm:w-32 md:w-40 shrink-0">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-sm sm:normal-case sm:font-semibold sm:text-slate-900 sm:dark:text-white">
              Skills
            </h3>
          </div>
          <div className="flex-1 space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">LLMs &amp; AI: </span>
              <span>RAG, AI Agents, Gemini, LangChain, n8n</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Languages: </span>
              <span>Python, GoLang, Rust, Javascript, TypeScript, Bash, HTML5, CSS3, Sass</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Technologies: </span>
              <span>Docker, Kubernetes, React, Redux, NextJS, BetterAuth, Supabase, Django, Prisma, JWTs, OAuth, Websockets, BunJS, RabbitMQ, Redis, Git, Github, discord.py</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Databases: </span>
              <span>PostgreSQL, ChromaDB, MySQL, MongoDB, Redis</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Deployment: </span>
              <span>Linux, Apache, Nginx, AWS, Heroku, Vercel, Linode, DigitalOcean, Google Cloud, Azure, Contabo, cPanel</span>
            </div>
          </div>
        </div>

        {/* Education Section */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 md:gap-14 pt-8 border-t border-slate-200/80 dark:border-primary-950/80">
          <div className="w-full sm:w-32 md:w-40 shrink-0">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-sm sm:normal-case sm:font-semibold sm:text-slate-900 sm:dark:text-white">
              Education
            </h3>
          </div>
          <div className="flex-1 space-y-1 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                VU University
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                October 2025 – Present
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bachelors in Computer Science (BScS)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
