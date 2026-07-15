import axios, { AxiosError } from 'axios';

let rawBaseURL = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || '';
if (rawBaseURL && !rawBaseURL.startsWith('http://') && !rawBaseURL.startsWith('https://')) {
  rawBaseURL = `https://${rawBaseURL}`;
}
const baseURL = rawBaseURL;

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function errorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  const response = error.response?.data as { detail?: string } | undefined;
  if (!error.response) return 'CodeSage cannot reach the backend. Check the backend URL and try again.';
  if (error.response.status === 422) return response?.detail || 'The request could not be processed.';
  if (error.response.status >= 500) return 'The backend could not complete that request. Please try again.';
  return response?.detail || `Request failed (${error.response.status}).`;
}

const client = axios.create({
  baseURL,
  timeout: 120_000,
});

client.interceptors.request.use((config) => {
  if (!baseURL) return Promise.reject(new ApiError('Backend URL is not configured. Set NEXT_PUBLIC_API_URL before using CodeSage.'));
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(new ApiError(errorMessage(error), error.response?.status)),
);

export type GraphNode = { id: string; label?: string; filepath?: string; node_type?: string; is_test?: boolean; start_line?: number; end_line?: number };
export type GraphEdge = { source: string; target: string; edge_type?: string; resolved?: boolean };
export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };
export type UploadResponse = { repository_id: string; status: string; nodes: number; edges: number };
export type QueryResponse = { answer: string; intent: string; confidence: number; citations: string[] };
export type IndexProgressEvent = { status: string; files_indexed: number; total_files: number; current_phase: string; progress_percent: number; message: string };
export type Message = { id: string; role: 'user' | 'assistant'; content: string; citations: { filepath: string; line: number }[]; intent?: 'BUG_ANALYSIS' | 'IMPACT_ANALYSIS' | 'EXPLANATION' | 'GENERAL'; timestamp: Date };
export type EvalResponse = { faithfulness: number; context_recall: number; context_precision: number; intent_accuracy: number; topology_recall: number; citation_precision: number; test_coverage_mention_rate: number; passed: boolean };

const api = {
  uploadRepository: async (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return (await client.post<UploadResponse>('/repositories/upload', body)).data;
  },
  getGraph: async () => (await client.get<GraphData>('/graph')).data,
  query: async (repositoryId: string, query: string, modelProvider = 'gemini', modelName = 'gemini-3.5-flash') => (await client.post<QueryResponse>('/query', { repository_id: repositoryId, query, model_provider: modelProvider, model_name: modelName })).data,
  runEvaluation: async (golden_set_path: string) => (await client.post<EvalResponse>('/eval', { golden_set_path })).data,
  getHealth: async () => (await client.get<{ status: string; qdrant: boolean; redis: boolean; postgres: boolean }>('/health')).data,
};

export default api;
