'use client';

import { motion } from 'framer-motion';
import { FileCode2 } from 'lucide-react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCodeSageStore } from '@/store/useCodeSageStore';

export function CodeCitation({ filepath, line }: { filepath: string; line: number }) {
  const setSelectedCitation = useCodeSageStore((state) => state.setSelectedCitation);
  const router = useRouter();
  const filename = useMemo(() => filepath.split(/[\\/]/).pop() || filepath, [filepath]);

  return (
    <motion.button
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
      onClick={() => { setSelectedCitation({ filepath, line }); router.push('/graph'); }}
      className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-lavender-300"
      aria-label={`Open ${filepath} line ${line}`}
    >
      <FileCode2 className="h-3 w-3" />
      {filename}:{line}
    </motion.button>
  );
}

export function parseCitations(text: string) {
  const regex = /([\w./\\-]+\.(?:py|ts|tsx|js|jsx|go|rs|java|cpp|c|h)):(\d+)/g;
  return Array.from(text.matchAll(regex), (match) => ({
    filepath: match[1],
    line: Number(match[2]),
    match: match[0]
  }));
}
