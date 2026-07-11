'use client';

import type { EvalResponse } from '@/lib/api';

const metrics: Array<[keyof EvalResponse, string]> = [['faithfulness', 'Faithfulness'], ['context_recall', 'Context recall'], ['context_precision', 'Context precision'], ['intent_accuracy', 'Intent accuracy'], ['topology_recall', 'Topology recall'], ['citation_precision', 'Citation precision'], ['test_coverage_mention_rate', 'Test coverage mentions']];

export function EvalDashboard({ data }: { data: EvalResponse }) {
  return <section className="mt-8"><div className="mb-5 flex items-center gap-3"><h2 className="text-2xl font-black">Latest result</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${data.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{data.passed ? 'Passed' : 'Failed'}</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([key, label]) => <article key={key} className="rounded-3xl border border-white/70 bg-offwhite p-6 shadow-lg dark:border-darkBorder dark:bg-darkCard"><p className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">{label}</p><p className="mt-3 text-4xl font-black">{(Number(data[key]) * 100).toFixed(1)}%</p></article>)}</div></section>;
}
