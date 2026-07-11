'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
