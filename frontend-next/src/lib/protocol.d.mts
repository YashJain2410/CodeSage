import type { Citation, GraphData, QueryEvent } from './types';
export function parseCitations(text: string): Citation[];
export function normalizeGraph(raw: unknown): GraphData;
export function decodeSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<QueryEvent>;
