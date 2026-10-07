'use client';
import { ErrorNotice } from '@/components/UI';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-content">
      <h1>This view needs a fresh start.</h1>
      <ErrorNotice error={error} retry={reset} />
    </div>
  );
}
