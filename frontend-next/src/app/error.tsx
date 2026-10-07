'use client';
import { ErrorNotice, Logo } from '@/components/UI';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="fatal-error">
      <Logo />
      <h1>Let’s get you back on track.</h1>
      <ErrorNotice error={error} />
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
