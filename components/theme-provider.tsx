'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Fallback if localStorage is inaccessible
  }
  return 'system';
}

function applyThemeToDocument(theme: Theme): ResolvedTheme {
  if (typeof document === 'undefined') return 'dark';

  const systemTheme = getSystemTheme();
  const resolved: ResolvedTheme = theme === 'system' ? systemTheme : theme;
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = getInitialTheme();
    return initial === 'system' ? getSystemTheme() : initial;
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch {
      // Ignore storage errors
    }
    const resolved = applyThemeToDocument(newTheme);
    setResolvedTheme(resolved);
  }, []);

  // Listen to OS prefers-color-scheme changes and cross-tab storage changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = () => {
      const currentStored = (localStorage.getItem('theme') as Theme | null) || 'system';
      if (currentStored === 'system') {
        const resolved = applyThemeToDocument('system');
        setResolvedTheme(resolved);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const updatedTheme = (e.newValue as Theme | null) || 'system';
        if (updatedTheme === 'light' || updatedTheme === 'dark' || updatedTheme === 'system') {
          setThemeState(updatedTheme);
          const resolved = applyThemeToDocument(updatedTheme);
          setResolvedTheme(resolved);
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const mounted = useMounted();

  if (!context) {
    return {
      theme: 'system',
      resolvedTheme: mounted && typeof window !== 'undefined' ? getSystemTheme() : 'dark',
      setTheme: () => {},
    };
  }

  return context;
}
