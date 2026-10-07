'use client';
import Link from 'next/link';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo, ThemeToggle } from './UI';
export default function Navbar() {
  const [open, setOpen] = useState(false),
    [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const cb = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', cb, { passive: true });
    return () => window.removeEventListener('scroll', cb);
  }, []);
  return (
    <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
      <Link href="/" aria-label="CodeSage home">
        <Logo />
      </Link>
      <nav className={`landing-links ${open ? 'open' : ''}`} aria-label="Main navigation">
        <a href="#product" onClick={() => setOpen(false)}>
          The product
        </a>
        <a href="#how-it-works" onClick={() => setOpen(false)}>
          How it works
        </a>
        <Link href="/docs">
          Documentation <ArrowUpRight size={13} />
        </Link>
      </nav>
      <div className="nav-actions">
        <ThemeToggle />
        <Link className="button small primary" href="/workspace">
          Open workspace <ArrowUpRight size={15} />
        </Link>
        <button
          className="icon-button mobile-only"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
