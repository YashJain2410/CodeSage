'use client';

import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="grid min-h-screen place-items-center bg-lavender-100 px-6 pt-28 dark:bg-darkBg">
      <div className="max-w-xl rounded-4xl bg-gradient-to-br from-rose-100 to-pink-200 p-8 text-deep shadow-2xl dark:from-rose-950 dark:to-darkCard dark:text-white">
        <AlertTriangle className="mb-4 h-10 w-10 text-rose-500" />
        <h1 className="text-4xl font-black">Something went wrong</h1>
        <p className="mt-4 rounded-2xl bg-white/45 p-4 font-mono text-sm dark:bg-black/20">{error.message}</p>
        <button onClick={reset} className="mt-6 rounded-full bg-deep px-7 py-3 font-bold text-white hover:-translate-y-0.5 hover:shadow-lg">
          Try Again
        </button>
      </div>
    </section>
  );
}
