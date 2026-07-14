'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CircleCheck, GitBranch, X } from 'lucide-react';
import { ChatPanel } from '@/components/ChatPanel';
import { useCodeSageStore } from '@/store/useCodeSageStore';

export default function ChatPage() {
  const { indexStatus, indexProgress, currentRepo } = useCodeSageStore();
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowBanner(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-lavender-100 px-4 pb-8 pt-28 dark:bg-darkBg md:px-8">
      {showBanner && indexStatus !== 'done' && indexStatus !== 'idle' ? (
        <div className="mx-auto mb-5 max-w-7xl rounded-4xl bg-gradient-to-r from-primary to-lavender-300 p-5 text-white shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="font-bold">{indexProgress?.message || 'Indexing repository...'}</div>
            <button aria-label="Dismiss progress banner" onClick={() => setShowBanner(false)} className="rounded-full p-2 hover:bg-white/15"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${indexProgress?.progress_percent || 18}%` }} /></div>
        </div>
      ) : null}

      {indexStatus === 'idle' ? (
        <div className="mx-auto mb-6 max-w-7xl rounded-4xl border border-white/70 bg-offwhite p-6 text-center shadow-lg dark:border-darkBorder dark:bg-darkCard">
          <p className="font-semibold">No repository indexed yet. <Link href="/" className="text-primary underline">Go back to index a repo.</Link></p>
        </div>
      ) : null}

      {indexStatus === 'done' ? (
        <section className="mx-auto mb-5 flex max-w-7xl flex-col gap-3 rounded-3xl border border-white/70 bg-offwhite p-5 shadow-lg dark:border-darkBorder dark:bg-darkCard sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Repository dashboard</p><h1 className="truncate text-2xl font-black">{currentRepo || 'Indexed repository'}</h1></div>
          <div className="flex flex-wrap gap-2 text-sm font-bold"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300"><CircleCheck className="h-4 w-4" />Ready</span><span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-2 text-primary"><GitBranch className="h-4 w-4" />{indexProgress?.files_indexed ?? 0} nodes</span></div>
        </section>
      ) : null}

      <div className="mx-auto max-w-5xl"><ChatPanel /></div>
    </div>
  );
}
