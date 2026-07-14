'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Code2, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { href: '/chat', label: 'Chat' },
  { href: '/graph', label: 'Graph' },
  { href: '/eval', label: 'Eval' }
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const isLandingTop = pathname === '/' && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed left-0 right-0 top-0 z-50 px-4 py-5 md:px-8"
      aria-label="Main navigation"
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-3 py-2 backdrop-blur-xl ${
          isLandingTop
            ? 'border-white/10 bg-[#1A1625]/18 shadow-none'
            : scrolled
            ? 'border-white/80 bg-offwhite/90 shadow-xl shadow-deep/10 dark:border-lavender-300/10 dark:!bg-[#241B3B] dark:shadow-black/20'
            : 'border-white/55 bg-lavender-50/78 shadow-lg shadow-deep/5 dark:border-lavender-300/10 dark:!bg-[#241B3B]'
        }`}
      >
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-full pr-3 font-bold">
          <span className={`grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg shadow-primary/25 ${isLandingTop ? 'bg-white/14 ring-1 ring-white/15' : 'bg-deep dark:bg-primary'}`}>
            <Code2 className="h-5 w-5" />
          </span>
          <span className={`text-2xl tracking-tight ${isLandingTop ? 'text-white' : 'text-deep dark:text-lavender-50'}`}>CodeSage</span>
        </Link>

        <div className={`hidden rounded-full border p-1 shadow-sm backdrop-blur-md md:flex ${isLandingTop ? 'border-white/10 bg-white/10' : 'border-white/80 bg-white/82 dark:border-lavender-300/10 dark:bg-[#2A2147]/90'}`}>
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`focus-ring rounded-full px-7 py-3 text-sm font-semibold ${
                  isLandingTop
                    ? 'text-lavender-100 hover:bg-white/12'
                    : active
                    ? 'bg-deep text-white shadow-lg shadow-primary/20 dark:bg-lavender-100 dark:text-deep'
                    : 'text-deep hover:bg-lavender-100 dark:text-lavender-100 dark:hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link
            href="/chat"
            className={`focus-ring rounded-full px-7 py-3 text-sm font-bold shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${
              isLandingTop
                ? 'bg-lavender-100 text-deep shadow-black/10 hover:shadow-white/10'
                : 'bg-primary text-white shadow-primary/25 hover:shadow-primary/35 dark:bg-lavender-100 dark:text-deep'
            }`}
          >
            Open App
          </Link>
        </div>

        <button
          aria-label="Open mobile menu"
          onClick={() => setOpen((value) => !value)}
          className={`focus-ring grid h-11 w-11 place-items-center rounded-full md:hidden ${isLandingTop ? 'bg-white/12 text-white' : 'bg-white/85 text-deep dark:bg-[#2A2147] dark:text-white'}`}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-4 mt-3 rounded-4xl border border-white/70 bg-offwhite/95 p-3 shadow-xl backdrop-blur-md dark:border-lavender-300/10 dark:bg-[#241B3B]/95 md:hidden"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-full px-5 py-3 font-semibold text-deep hover:bg-lavender-100 dark:text-white dark:hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between px-2">
              <ThemeToggle />
              <Link href="/chat" className="rounded-full bg-primary px-6 py-3 font-bold text-white dark:bg-lavender-100 dark:text-deep">
                Open App
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.nav>
  );
}
