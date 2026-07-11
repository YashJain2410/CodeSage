'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="h-10 w-10 rounded-full bg-white/70 dark:bg-[#2A2147]" />;
  }

  const dark = theme === 'dark';

  return (
    <button
      aria-label="Toggle color theme"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-deep shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 active:translate-y-0 dark:bg-[#2A2147] dark:text-lavender-100"
    >
      {dark ? <Sun className="h-5 w-5 rotate-0 text-amber-300" /> : <Moon className="h-5 w-5 text-primary" />}
    </button>
  );
}
