'use client';

import { useSyncExternalStore, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });
  const mounted = useMounted();

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  };

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl border border-slate-200 dark:border-primary-900/60 bg-slate-100/80 dark:bg-primary-950/80" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors duration-200 border border-slate-200 dark:border-primary-900/60 bg-slate-100/80 dark:bg-primary-950/80 hover:bg-slate-200 dark:hover:bg-primary-900 shadow-xs cursor-pointer group"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-slate-300 group-hover:text-white transition-all duration-300 group-hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 group-hover:text-slate-900 transition-all duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}
