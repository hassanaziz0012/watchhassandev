'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('system');
    }
  };

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl border border-slate-200 dark:border-primary-900/60 bg-slate-100/80 dark:bg-primary-950/80" />
    );
  }

  const getLabel = () => {
    if (theme === 'system') {
      return `Theme: System auto (${resolvedTheme}) – Click for dark`;
    }
    if (theme === 'dark') {
      return 'Theme: Dark – Click for light';
    }
    return 'Theme: Light – Click for system auto';
  };

  return (
    <button
      onClick={cycleTheme}
      type="button"
      aria-label={getLabel()}
      title={getLabel()}
      className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 border border-slate-200 dark:border-primary-900/60 bg-slate-100/80 dark:bg-primary-950/80 hover:bg-slate-200 dark:hover:bg-primary-900 shadow-xs cursor-pointer group active:scale-95 relative"
    >
      {theme === 'system' ? (
        <Laptop className="h-4 w-4 text-slate-600 dark:text-primary-300 group-hover:text-primary-600 dark:group-hover:text-white transition-all duration-300 group-hover:scale-110" />
      ) : theme === 'dark' ? (
        <Moon className="h-4 w-4 text-primary-300 group-hover:text-white transition-all duration-300 group-hover:-rotate-12" />
      ) : (
        <Sun className="h-4 w-4 text-amber-500 group-hover:text-amber-600 transition-all duration-300 group-hover:rotate-45" />
      )}
    </button>
  );
}
