import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeSage - AI Codebase Intelligence',
  description: 'RAG-powered code chat for indexing repositories, exploring call graphs, and evaluating answers.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
