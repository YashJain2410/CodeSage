export type Intent = 'BUG' | 'IMPACT' | 'EXPLAIN' | 'TEST' | 'ONBOARD' | 'GENERAL';
export type RepositoryStatus = 'pending' | 'indexing' | 'building_graph' | 'ready' | 'failed';
export interface Repository {
  id: string;
  name: string;
  source: string;
  sourceType: string;
  status: RepositoryStatus;
  nodes?: number;
  edges?: number;
  files?: number;
  createdAt: string;
  jobId?: string;
}
export interface Citation {
  filepath: string;
  line: number;
  snippet?: string;
}
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  intent?: string;
  confidence?: number;
  timestamp: string;
  error?: string;
  stopped?: boolean;
}
export interface Conversation {
  id: string;
  repoId: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}
export interface GraphNode {
  id: string;
  label: string;
  file: string;
  type: string;
  isTest: boolean;
  external: boolean;
  line: number;
  endLine?: number;
  docstring?: string;
  callersCount: number;
  testCoverage?: number;
}
export interface GraphEdge {
  source: string;
  target: string;
  type?: string;
  resolved: boolean;
  frequency: number;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
export interface IndexResponse {
  repository_id?: string;
  repo_id?: string;
  job_id?: string;
  status: string;
  nodes?: number;
  edges?: number;
  message?: string;
}
export interface IndexProgress {
  status: string;
  progress_percent?: number;
  files_indexed?: number;
  total_files?: number;
  current_phase?: string;
  message?: string;
  repository_id?: string;
  repo_id?: string;
  nodes?: number;
  edges?: number;
}
export interface QueryEvent {
  token?: string;
  text?: string;
  answer?: string;
  intent?: string;
  confidence?: number;
  citations?: (string | Citation)[];
  error?: string;
  type?: string;
  message?: string;
}
export interface EvalMetrics {
  faithfulness: number;
  topology_recall: number;
  intent_accuracy: number;
  citation_precision: number;
  context_recall?: number;
  context_precision?: number;
  test_coverage_mention_rate?: number;
}
export interface TestCase {
  id: string;
  query: string;
  intent: string;
  retrieval_pass: boolean;
  answer_quality_pass: boolean;
  latency_ms: number;
  answer?: string;
  retrieved_chunks?: string[];
}
export interface EvalRun {
  id: string;
  timestamp: string;
  metrics: EvalMetrics;
  test_cases: TestCase[];
  passed?: boolean;
}
export interface EvalResults {
  runs: EvalRun[];
  latest?: EvalMetrics;
  thresholds: EvalMetrics;
}
export interface Capabilities {
  online: boolean;
  paths: Record<string, Record<string, unknown>>;
  error?: string;
}
