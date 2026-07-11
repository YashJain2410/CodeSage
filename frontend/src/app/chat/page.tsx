'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ChatPanel } from '@/components/ChatPanel';
import { CodeViewer } from '@/components/CodeViewer';
import { useCodeSageStore } from '@/store/useCodeSageStore';

export default function ChatPage() {
  const { indexStatus, indexProgress } = useCodeSageStore();
  const [showBanner, setShowBanner] = useState(true);
  const [tab, setTab] = useState<'chat' | 'code'>('chat');

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

      <div className="mx-auto mb-4 flex w-fit rounded-full bg-white p-1 shadow-sm dark:bg-darkCard lg:hidden">
        {(['chat', 'code'] as const).map((value) => (
          <button key={value} onClick={() => setTab(value)} className={`rounded-full px-6 py-2 font-bold capitalize ${tab === value ? 'bg-primary text-white' : 'text-deep dark:text-white'}`}>{value}</button>
        ))}
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[55%_45%]">
        <div className={tab === 'chat' ? 'block' : 'hidden lg:block'}><ChatPanel /></div>
        <div className={tab === 'code' ? 'block' : 'hidden lg:block'}><CodeViewer /></div>
      </div>
    </div>
  );
}
