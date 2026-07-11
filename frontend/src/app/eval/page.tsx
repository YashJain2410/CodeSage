'use client';

import { useState } from 'react';
import { EvalDashboard } from '@/components/EvalDashboard';
import api, { type EvalResponse } from '@/lib/api';

export default function EvalPage() {
  const [goldenSetPath, setGoldenSetPath] = useState('');
  const [result, setResult] = useState<EvalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const run = async () => { setRunning(true); setError(null); try { setResult(await api.runEvaluation(goldenSetPath)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Evaluation failed'); } finally { setRunning(false); } };
  return <main className="min-h-screen bg-lavender-100 px-6 pb-12 pt-32 dark:bg-darkBg"><div className="mx-auto max-w-5xl"><h1 className="text-5xl font-black">Evaluation</h1><p className="mt-2 text-[var(--muted)]">Run the backend evaluation harness against a golden-set file.</p><div className="mt-8 flex flex-col gap-3 rounded-4xl bg-offwhite p-5 shadow-xl dark:bg-darkCard sm:flex-row"><input value={goldenSetPath} onChange={(event) => setGoldenSetPath(event.target.value)} placeholder="Absolute path to golden_set.json" className="min-w-0 flex-1 rounded-full bg-lavender-100 px-5 py-3 outline-none dark:bg-darkBg" /><button disabled={!goldenSetPath || running} onClick={() => void run()} className="rounded-full bg-primary px-6 py-3 font-bold text-white disabled:opacity-50">{running ? 'Running…' : 'Run evaluation'}</button></div>{error ? <p className="mt-4 rounded-2xl bg-rose-100 p-4 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</p> : null}{result ? <EvalDashboard data={result} /> : null}</div></main>;
}
