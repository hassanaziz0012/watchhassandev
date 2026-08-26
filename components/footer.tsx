import React from "react";
import {
  FaGithub,
  FaLinkedinIn,
  FaXTwitter,
  FaYoutube,
  FaDiscord,
  FaEnvelope,
  FaGlobe,
} from "react-icons/fa6";

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com/hassanaziz0012",
    icon: FaGithub,
    external: true,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/hassan-aziz-web",
    icon: FaLinkedinIn,
    external: true,
  },
  {
    name: "X (Twitter)",
    href: "https://x.com/intent/user?screen_name=nothassanaziz",
    icon: FaXTwitter,
    external: true,
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@itshassanaziz?sub_confirmation=1",
    icon: FaYoutube,
    external: true,
  },
  {
    name: "Discord (@itshassanaziz)",
    href: "https://discord.gg/rj6kb2AhCM",
    icon: FaDiscord,
    external: true,
  },
  {
    name: "Email (hassanaziz0012@gmail.com)",
    href: "mailto:hassanaziz0012@gmail.com",
    icon: FaEnvelope,
    external: false,
  },
  {
    name: "Website (hassandev.me)",
    href: "https://www.hassandev.me/",
    icon: FaGlobe,
    external: true,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-primary-950/80 mt-auto py-8 bg-slate-50/80 dark:bg-[#06090e]/90 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} WatchHassanDev</p>
        <div className="flex flex-wrap items-center justify-center gap-1">
          {socialLinks.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                aria-label={item.name}
                title={item.name}
                {...(item.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="p-2 rounded-xl text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300 hover:bg-slate-200/60 dark:hover:bg-primary-950/70 transition-all duration-150 active:scale-95 flex items-center justify-center"
              >
                <Icon className="h-4 w-4" />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
