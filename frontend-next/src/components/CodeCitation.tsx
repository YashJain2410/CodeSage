'use client';
import { FileCode2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCodeSageStore } from '@/store/useCodeSageStore';
import type { Citation } from '@/lib/types';
export default function CodeCitation({
  citation,
  onSelect,
}: {
  citation: Citation;
  onSelect?: () => void;
}) {
  const setCitation = useCodeSageStore((s) => s.setCitation);
  return (
    <motion.button
      className="citation"
      title={`${citation.filepath}:${citation.line}`}
      onClick={() => {
        setCitation(citation);
        onSelect?.();
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <FileCode2 size={13} />
      {citation.filepath.split('/').pop()}
      <span>:{citation.line}</span>
    </motion.button>
  );
}
