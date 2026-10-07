'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { useCodeSageStore, useWorkspace } from '@/store/useCodeSageStore';
import { ErrorNotice, Spinner } from './UI';
export default function IndexProgress() {
  const w = useWorkspace(),
    progress = useCodeSageStore((s) => s.progress);
  const repo = w.repositories.find(
    (r) => r.jobId && ['indexing', 'building_graph', 'pending'].includes(r.status),
  );
  const jobId = repo?.jobId;
  const [error, setError] = useState<string | null>(null),
    [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!jobId) return;
    const currentRepo = useCodeSageStore
      .getState()
      [useCodeSageStore.getState().mode].repositories.find((r) => r.jobId === jobId)!;
    const controller = new AbortController();
    setDismissed(false);
    setError(null);
    (async () => {
      try {
        let finished = false;
        for await (const event of api.indexProgress(jobId, controller.signal)) {
          useCodeSageStore.getState().setProgress(event);
          const status = event.status.toLowerCase();
          if (['done', 'ready', 'success', 'indexed'].includes(status)) {
            const s = useCodeSageStore.getState();
            s.replaceRepo(currentRepo.id, {
              ...currentRepo,
              id: event.repository_id || event.repo_id || currentRepo.id,
              status: 'ready',
              nodes: event.nodes ?? currentRepo.nodes,
              edges: event.edges ?? currentRepo.edges,
              jobId: undefined,
            });
            finished = true;
            break;
          }
          if (['error', 'failed'].includes(status))
            throw new Error(event.message || 'Indexing failed.');
        }
        if (!finished && !controller.signal.aborted)
          throw new Error('The progress stream ended before indexing completed.');
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Indexing failed');
        useCodeSageStore.getState().upsertRepo({ ...currentRepo, status: 'failed' });
      }
    })();
    return () => controller.abort();
  }, [jobId]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  if (dismissed || (!repo && !error)) return null;
  return (
    <div className="index-banner" aria-live="polite">
      {error ? (
        <ErrorNotice error={error} />
      ) : (
        <>
          <Spinner />
          <div>
            <b>{progress?.message || 'Indexing your repository'}</b>
            <small>
              {progress?.current_phase || 'Waiting for progress'}
              {progress?.total_files
                ? ` · ${progress.files_indexed || 0}/${progress.total_files} files`
                : ''}
            </small>
            {progress?.progress_percent != null && (
              <progress
                aria-label="Indexing progress"
                value={progress.progress_percent}
                max={100}
              />
            )}
          </div>
        </>
      )}
      <button
        className="icon-button"
        aria-label="Dismiss indexing banner"
        onClick={() => setDismissed(true)}
      >
        <X size={16} />
      </button>
    </div>
  );
}
