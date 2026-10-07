// A contract fixture for browser QA. This is not the real backend.
// Run only when port 8000 is free; stop it after testing.
import http from 'node:http';
import fs from 'node:fs';
const fixture = JSON.parse(
  fs.readFileSync(new URL('../src/data/fixture.json', import.meta.url), 'utf8'),
);
const paths = {
  '/repositories/upload': { post: {} },
  '/index': { post: {} },
  '/query': { post: {} },
  '/graph': { get: {} },
  '/metrics': { get: {} },
};
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const path = new URL(req.url, 'http://localhost').pathname;
  const respond = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (path === '/openapi.json')
    return respond(200, {
      openapi: '3.1.0',
      info: { title: 'CodeSage contract test fixture', version: 'test' },
      paths,
    });
  if (path === '/index' && req.method === 'POST') {
    const data = JSON.parse(body.toString());
    if (typeof data.repo_path !== 'string')
      return respond(422, { detail: 'repo_path is required' });
    console.log('PASS: POST /index current payload');
    return respond(200, { status: 'success', repo_path: data.repo_path, nodes: 128, edges: 211 });
  }
  if (path === '/repositories/upload' && req.method === 'POST') {
    const form = await new Response(body, {
      headers: { 'Content-Type': req.headers['content-type'] },
    }).formData();
    const file = form.get('file');
    if (!file || !file.name.endsWith('.zip'))
      return respond(400, { detail: 'Only ZIP files are currently supported.' });
    console.log('PASS: POST /repositories/upload multipart file');
    return respond(200, {
      repository_id: 'contract-test-repo',
      status: 'READY',
      nodes: 128,
      edges: 211,
    });
  }
  if (path === '/query' && req.method === 'POST') {
    const data = JSON.parse(body.toString());
    if (
      typeof data.query !== 'string' ||
      !data.repository_id ||
      !data.model_provider ||
      !data.model_name
    )
      return respond(422, { detail: 'Expected current QueryRequest fields' });
    console.log('PASS: POST /query current payload and provider fields');
    return respond(200, {
      answer:
        '## Contract test response\n\nThe browser sent the current backend request fields correctly. This response comes from the test fixture, not an LLM.',
      intent: 'EXPLAIN',
      confidence: 0.9,
      citations: ['auth/service.py:25'],
    });
  }
  if (path === '/graph')
    return respond(200, {
      nodes: fixture.graph.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        filepath: n.file,
        node_type: n.type,
        is_test: n.isTest,
        start_line: n.line,
        end_line: n.endLine,
      })),
      edges: fixture.graph.edges.map((e) => ({
        source: e.source,
        target: e.target,
        edge_type: e.type,
        resolved: e.resolved,
      })),
    });
  if (path === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end(
      'codesage_queries_total 3\ncodesage_retrieval_latency_ms_sum 600\ncodesage_retrieval_latency_ms_count 3\n',
    );
  }
  respond(404, { detail: 'Not Found' });
});
server.listen(8000, '127.0.0.1', () =>
  console.log(
    'CodeSage contract test fixture listening on 127.0.0.1:8000. No live backend services.',
  ),
);
