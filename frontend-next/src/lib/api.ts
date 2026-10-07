import { decodeSSE, normalizeGraph } from './protocol.mjs';
import type {
  Capabilities,
  Citation,
  EvalResults,
  EvalRun,
  GraphData,
  IndexProgress,
  IndexResponse,
  QueryEvent,
} from './types';

export const planned = process.env.NEXT_PUBLIC_API_MODE === 'planned';
const base = (process.env.NEXT_PUBLIC_API_URL || '/api/backend').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
async function request(path: string, init: RequestInit = {}) {
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      cache: 'no-store',
      signal: init.signal || AbortSignal.timeout(180_000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail =
        typeof body.detail === 'string'
          ? body.detail
          : Array.isArray(body.detail)
            ? body.detail.map((d: { msg: string }) => d.msg).join('; ')
            : '';
      throw new ApiError(
        response.status === 404
          ? `This feature is not available on the connected backend (${path}).`
          : detail || `The backend returned ${response.status}. Please retry.`,
        response.status,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError || (error instanceof DOMException && error.name === 'AbortError'))
      throw error;
    throw new ApiError('Cannot reach the backend. Check the connection in Settings, then retry.');
  }
}
function json(data: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
export const thresholds = {
  faithfulness: 0.8,
  topology_recall: 0.7,
  intent_accuracy: 0.85,
  citation_precision: 0.85,
};
export const supports = (caps: Capabilities | undefined, path: string, method = 'get') =>
  Boolean(caps?.paths[path]?.[method]);
export const api = {
  async capabilities(): Promise<Capabilities> {
    try {
      const data = await (
        await request('/openapi.json', { signal: AbortSignal.timeout(5000) })
      ).json();
      return { online: true, paths: data.paths || {} };
    } catch (error) {
      return {
        online: false,
        paths: {},
        error: error instanceof Error ? error.message : 'Backend unavailable',
      };
    }
  },
  async ingest(
    kind: string,
    value: string | File,
    filename?: string,
    signal?: AbortSignal,
  ): Promise<IndexResponse> {
    if (kind === 'local')
      return (
        await request('/index', {
          ...json(planned ? { repo_url: value } : { repo_path: value }),
          signal,
        })
      ).json();
    const form = new FormData();
    if (value instanceof File) form.append('file', value);
    else if (kind === 'github') form.append('github_url', value);
    else {
      form.append('filename', filename || 'snippet.py');
      form.append('content', value);
    }
    const path =
      kind === 'zip'
        ? planned
          ? '/repositories/zip'
          : '/repositories/upload'
        : `/repositories/${kind}`;
    return (await request(path, { method: 'POST', body: form, signal })).json();
  },
  async *indexProgress(jobId: string, signal: AbortSignal): AsyncGenerator<IndexProgress> {
    const response = await request(`/index/progress/${encodeURIComponent(jobId)}`, { signal });
    if (!response.body) throw new ApiError('The backend did not return a progress stream.');
    for await (const event of decodeSSE(response.body)) yield event as IndexProgress;
  },
  async *query(
    query: string,
    repositoryId: string,
    provider: string,
    model: string,
    signal: AbortSignal,
  ): AsyncGenerator<QueryEvent> {
    const body = planned
      ? { text: query, repo_id: repositoryId, model_provider: provider, model_name: model }
      : { query, repository_id: repositoryId, model_provider: provider, model_name: model };
    const response = await request('/query', { ...json(body), signal });
    if ((response.headers.get('content-type') || '').includes('text/event-stream')) {
      if (!response.body) throw new ApiError('The backend returned an empty answer stream.');
      yield* decodeSSE(response.body);
    } else yield (await response.json()) as QueryEvent;
  },
  async graph(repoId: string, signal?: AbortSignal): Promise<GraphData> {
    const raw = await (
      await request(planned ? `/graph/${encodeURIComponent(repoId)}` : '/graph', { signal })
    ).json();
    return normalizeGraph(raw);
  },
  async file(filepath: string, repoId: string, signal?: AbortSignal): Promise<string> {
    const response = await request(
      `/file?path=${encodeURIComponent(filepath)}&repository_id=${encodeURIComponent(repoId)}`,
      { signal },
    );
    if ((response.headers.get('content-type') || '').includes('application/json')) {
      const data = await response.json();
      return typeof data === 'string' ? data : data.content;
    }
    return response.text();
  },
  async evaluations(signal?: AbortSignal): Promise<EvalResults> {
    return (await request('/eval', { signal })).json();
  },
  async runEvaluation(path: string, signal?: AbortSignal): Promise<EvalRun | { job_id: string }> {
    const result = await (
      await request('/eval', { ...json({ golden_set_path: path }), signal })
    ).json();
    if (result.job_id) return result;
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      metrics: result.metrics || result,
      test_cases: result.test_cases || [],
      passed: result.passed,
    };
  },
  async evalStatus(jobId: string, signal?: AbortSignal) {
    return (await request(`/eval/status/${encodeURIComponent(jobId)}`, { signal })).json();
  },
  async metrics(signal?: AbortSignal) {
    return (await request('/metrics', { signal })).text();
  },
  async health(signal?: AbortSignal) {
    return (await request('/health', { signal })).json();
  },
};
export function normalizeCitations(citations: (string | Citation)[] = []): Citation[] {
  return citations.flatMap((c) => {
    if (typeof c !== 'string') return [c];
    const m = c.match(/^(.*):(\d+)(?:-\d+)?$/);
    return m ? [{ filepath: m[1], line: Number(m[2]) }] : [];
  });
}
