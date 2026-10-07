import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Providers from '@/components/Providers';
import './globals.css';
const inter = localFont({
  src: [
    { path: '../../public/fonts/inter-400.ttf', weight: '400' },
    { path: '../../public/fonts/inter-500.ttf', weight: '500' },
    { path: '../../public/fonts/inter-600.ttf', weight: '600' },
    { path: '../../public/fonts/inter-700.ttf', weight: '700' },
    { path: '../../public/fonts/inter-800.ttf', weight: '800' },
  ],
  variable: '--font-inter',
  display: 'swap',
});
const mono = localFont({
  src: [
    { path: '../../public/fonts/jetbrains-mono-400.ttf', weight: '400' },
    { path: '../../public/fonts/jetbrains-mono-500.ttf', weight: '500' },
  ],
  variable: '--font-mono',
  display: 'swap',
});
export const metadata: Metadata = {
  title: { default: 'CodeSage — Know your code.', template: '%s · CodeSage' },
  icons: { icon: '/icon.svg' },
  description:
    'Explore your codebase through cited answers, call relationships, and measurable answer quality.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
