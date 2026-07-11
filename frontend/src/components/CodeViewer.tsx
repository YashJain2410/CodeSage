'use client';

import { FileCode } from 'lucide-react';
import { useCodeSageStore } from '@/store/useCodeSageStore';

const languages: Record<string, string> = { py: 'Python', ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', go: 'Go', rs: 'Rust', java: 'Java', cpp: 'C++', c: 'C', h: 'C/C++' };

export function CodeViewer() {
  const selected = useCodeSageStore((state) => state.selectedCitation);
  if (!selected) {
    return (
      <section className="grid h-full min-h-[640px] place-items-center rounded-4xl border border-white/70 bg-offwhite p-8 text-center shadow-xl dark:border-darkBorder dark:bg-darkCard">
        <div>
          <FileCode className="mx-auto h-16 w-16 text-primary/60" />
          <h2 className="mt-5 text-3xl font-black">No file selected</h2>
          <p className="mt-3 max-w-sm text-[var(--muted)]">Click a citation chip in the chat to view source code here.</p>
        </div>
      </section>
    );
  }

  const crumbs = selected.filepath.split(/[\\/]/);

  return (
    <section className="flex h-full min-h-[640px] flex-col overflow-hidden rounded-4xl border border-white/70 bg-offwhite shadow-xl dark:border-darkBorder dark:bg-darkCard">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lavender-200 p-4 dark:border-darkBorder">
        <div className="min-w-0">
          <div className="truncate font-mono text-sm">
            {crumbs.map((crumb, index) => <span key={`${crumb}-${index}`} className={index === crumbs.length - 1 ? 'font-bold text-primary' : 'text-[var(--muted)]'}>{crumb}{index < crumbs.length - 1 ? ' / ' : ''}</span>)}
          </div>
          <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Source reference</span>
        </div>
      </div>
      <div className="grid flex-1 place-items-center bg-darkBg p-8 text-center text-lavender-100"><div><FileCode className="mx-auto h-12 w-12 text-primary" /><p className="mt-4 font-bold">{selected.filepath}:{selected.line}</p><p className="mt-2 max-w-sm text-sm text-lavender-200">This backend does not expose source-file content yet. The citation remains available for graph navigation.</p></div></div>
    </section>
  );
}
