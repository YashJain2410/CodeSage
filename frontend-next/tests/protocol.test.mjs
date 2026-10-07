import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSSE, normalizeGraph, parseCitations } from '../src/lib/protocol.mjs';
import { parseMetrics, meanMetric, histogramQuantile } from '../src/lib/metrics.mjs';
function stream(chunks) {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((c) =>
        controller.enqueue(typeof c === 'string' ? new TextEncoder().encode(c) : c),
      );
      controller.close();
    },
  });
}
test('SSE reconstructs frames split across CRLF boundaries', async () => {
  const events = [];
  for await (const e of decodeSSE(
    stream([
      'data: {"token":"hel',
      'lo"}\r',
      '\n\r\n',
      'data: {"intent":"EXPLAIN"}\n\n',
      'data: [DONE]\n\n',
    ]),
  ))
    events.push(e);
  assert.deepEqual(events, [{ token: 'hello' }, { intent: 'EXPLAIN' }]);
});
test('SSE reconstructs a UTF-8 character split between byte chunks', async () => {
  const bytes = new TextEncoder().encode('data: {"token":"✓"}\n\n');
  const pos = bytes.indexOf(226);
  const events = [];
  for await (const e of decodeSSE(stream([bytes.slice(0, pos + 1), bytes.slice(pos + 1)])))
    events.push(e);
  assert.equal(events[0].token, '✓');
});
test('SSE handles comments, empty frames, multiline JSON and final unterminated data', async () => {
  const events = [];
  for await (const e of decodeSSE(
    stream([': heartbeat\n\nevent: message\ndata: {\ndata: "token": "a"}\n\ndata: {"token":"b"}']),
  ))
    events.push(e);
  assert.deepEqual(events, [{ token: 'a' }, { token: 'b' }]);
});
test('citation extraction keeps repo paths, ranges and unique locations', () => {
  assert.deepEqual(
    parseCitations(
      '`auth/service.py:25` src/main.tsx:12-18 auth/service.py:25 tests/test_auth.py:0',
    ),
    [
      { filepath: 'auth/service.py', line: 25 },
      { filepath: 'src/main.tsx', line: 12 },
    ],
  );
});
test('current graph shape preserves test symbols, external nodes and unresolved calls', () => {
  const g = normalizeGraph({
    nodes: [
      { id: 'a', label: 'foo', filepath: 'src/foo.py', start_line: 7, is_test: true },
      { id: 'b', label: 'external' },
    ],
    edges: [{ source: 'a', target: 'b', resolved: false }],
  });
  assert.equal(g.nodes[0].line, 7);
  assert.equal(g.nodes[0].isTest, true);
  assert.equal(g.nodes[1].external, true);
  assert.equal(g.nodes[1].callersCount, 1);
  assert.equal(g.edges[0].resolved, false);
});
test('planned graph shape normalizes function metadata', () => {
  const g = normalizeGraph({
    nodes: [
      {
        id: 'a',
        label: 'Foo',
        file: 'src/a.ts',
        type: 'class',
        callers_count: 3,
        test_coverage: 82,
      },
    ],
    edges: [],
  });
  assert.equal(g.nodes[0].type, 'class');
  assert.equal(g.nodes[0].testCoverage, 82);
  assert.equal(g.nodes[0].callersCount, 3);
});
test('histogram means are unavailable for zero observations', () => {
  const rows = parseMetrics('latency_sum 0\nlatency_count 0\n');
  assert.equal(meanMetric(rows, 'latency'), undefined);
});
test('Prometheus parser retains labels and scientific notation', () => {
  const rows = parseMetrics(
    '# HELP ignored\nrequest_count_total{method="POST",endpoint="/query",status="500"} 1e2\nlatency_sum 250\nlatency_count 2',
  );
  assert.equal(rows[0].labels.endpoint, '/query');
  assert.equal(rows[0].value, 100);
  assert.equal(meanMetric(rows, 'latency'), 125);
});
test('histogram p95 is estimated from cumulative buckets', () => {
  const rows = parseMetrics(
    'latency_bucket{le="1"} 50\nlatency_bucket{le="2"} 100\nlatency_bucket{le="+Inf"} 100',
  );
  assert.equal(histogramQuantile(rows, 'latency', 0.95), 1.9);
});
