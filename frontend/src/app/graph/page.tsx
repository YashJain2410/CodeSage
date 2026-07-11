'use client';

import { Download, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { GraphViewer } from '@/components/GraphViewer';

export default function GraphPage() {
  const [search, setSearch] = useState('');
  const [tests, setTests] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="h-screen bg-lavender-100 px-4 pb-5 pt-28 dark:bg-darkBg md:px-8">
      <button onClick={() => setToolsOpen((value) => !value)} className="fixed right-5 top-28 z-30 grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-xl md:hidden" aria-label="Toggle graph tools">
        <Settings2 />
      </button>
      <div className={`mx-auto mb-4 max-w-5xl rounded-full border border-white/70 bg-white/80 p-2 shadow-lg backdrop-blur-md dark:border-darkBorder dark:bg-darkCard/80 ${toolsOpen ? 'flex' : 'hidden'} items-center gap-2 md:flex`}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search nodes" className="min-w-0 flex-1 rounded-full bg-lavender-100 px-4 py-3 outline-none dark:bg-darkBg" />
        <button onClick={() => setTests((value) => !value)} className={`rounded-full px-4 py-3 font-bold ${tests ? 'bg-primary text-white' : 'bg-lavender-100 dark:bg-darkBg'}`}>Tests</button>
        <button className="rounded-full bg-lavender-100 px-4 py-3 font-bold dark:bg-darkBg">External</button>
        <span className="rounded-full bg-lavender-100 px-4 py-3 font-bold dark:bg-darkBg">Hierarchical</span>
        <button aria-label="Export PNG" className="grid h-12 w-12 place-items-center rounded-full bg-deep text-white dark:bg-lavender-100 dark:text-deep"><Download className="h-5 w-5" /></button>
      </div>
      <div className="mx-auto h-[calc(100vh-12rem)] max-w-7xl"><GraphViewer search={search} showTests={tests} /></div>
    </div>
  );
}
