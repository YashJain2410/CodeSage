// Transport helpers are shared by the application and the protocol tests.
export function parseCitations(text) {
  const matches = text.matchAll(
    /((?:[A-Za-z0-9_@.-]+\/)*[A-Za-z0-9_@.-]+\.(?:py|tsx?|jsx?|go|rs|java|cpp|c|h|rb|swift|kt|cs|vue|svelte)):(\d+)(?:-\d+)?/g,
  );
  const seen = new Set();
  return Array.from(matches, (m) => ({ filepath: m[1], line: Number(m[2]) })).filter(
    (c) =>
      c.line > 0 && !seen.has(`${c.filepath}:${c.line}`) && seen.add(`${c.filepath}:${c.line}`),
  );
}
export function normalizeGraph(raw) {
  const edges = (raw.edges || raw.links || []).map((e) => ({
    source: String(e.source),
    target: String(e.target),
    type: e.edge_type || e.type,
    resolved: e.resolved !== false,
    frequency: e.call_frequency || 1,
  }));
  return {
    nodes: (raw.nodes || []).map((n) => ({
      id: String(n.id),
      label: n.label || n.name || String(n.id).split('::').pop(),
      file: n.filepath || n.file || '',
      type: n.node_type || n.type || 'function',
      isTest: Boolean(n.is_test || n.type === 'test'),
      external: Boolean(n.external || n.node_type === 'external' || (!n.filepath && !n.file)),
      line: n.start_line || n.line || 1,
      endLine: n.end_line,
      docstring: n.docstring,
      callersCount: n.callers_count ?? edges.filter((e) => e.target === String(n.id)).length,
      testCoverage: n.test_coverage,
    })),
    edges,
  };
}
export async function* decodeSSE(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  function parse(block) {
    const data = block
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n');
    if (!data || data.trim() === '[DONE]') return null;
    try {
      return JSON.parse(data);
    } catch {
      return { token: data };
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (block.split('\n').some((line) => line.replace(/^data:\s*/, '').trim() === '[DONE]'))
          return;
        const event = parse(block);
        if (event) yield event;
      }
      if (done) {
        const event = parse(buffer);
        if (event) yield event;
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
