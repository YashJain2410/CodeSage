import fixture from '@/data/fixture.json';
import type { EvalResults, GraphData, Message, QueryEvent, Repository } from './types';
export const demoGraph = fixture.graph as GraphData;
export const demoFiles: Record<string, string> = fixture.files;
export const demoRepo: Repository = {
  id: 'demo-sample',
  name: 'sample-app',
  source: 'CodeSage fixture repository',
  sourceType: 'demo',
  status: 'ready',
  nodes: demoGraph.nodes.length,
  edges: demoGraph.edges.length,
  files: Object.keys(demoFiles).length,
  createdAt: '2026-10-01T10:00:00Z',
};
export const examplePrompts = [
  {
    intent: 'EXPLAIN',
    title: 'Follow the authentication flow',
    query: 'How does authentication work in this repository?',
  },
  {
    intent: 'IMPACT',
    title: 'Understand a change',
    query: 'What would be affected if create_access_token changed?',
  },
  {
    intent: 'BUG',
    title: 'Find the source of an error',
    query: 'Why does an expired access token raise an error?',
  },
  { intent: 'TEST', title: 'Explore test coverage', query: 'Which tests cover authentication?' },
];
const authentication = `## From login to an authenticated request\n\nThe login workflow starts in **authenticate_user**. It validates the payload, looks up the user, compares the password hash, and creates access and refresh tokens.\n\n1. **Validate credentials** — validate_login_payload checks and normalizes the incoming values.\n2. **Resolve the user** — lookup_user_for_auth finds the account. A mismatched password raises AuthenticationError.\n3. **Issue tokens** — create_access_token and create_refresh_token sign tokens with an expiry and subject.\n4. **Authorize a request** — require_authentication extracts the bearer token, decodes it, and rejects it if it has expired.\n\n### The important connection\n\nToken creation and request validation share the same signature format. If you change the format, review both the token helpers and the middleware.\n\nThis is a prepared walkthrough of the bundled fixture, not an AI-generated response.`;
export const demoMessage: Message = {
  id: 'demo-answer',
  role: 'assistant',
  content: authentication,
  citations: [
    { filepath: 'auth/service.py', line: 25 },
    { filepath: 'auth/tokens.py', line: 23 },
    { filepath: 'auth/middleware.py', line: 25 },
  ],
  intent: 'EXPLAIN',
  confidence: 0.94,
  timestamp: '2026-10-01T10:00:00Z',
};
export function demoAnswer(query: string): QueryEvent {
  const q = query.toLowerCase();
  if (/expired|error|bug/.test(q))
    return {
      answer:
        '## Where the error originates\n\n**require_authentication** decodes the bearer token, then calls **is_token_expired**. If the current time is past expires_at, it raises AuthenticationError with the message “access token expired”.\n\nCheck the token expiry and refresh the session before retrying the request.\n\nThis is a prepared example using the bundled source.',
      intent: 'BUG',
      confidence: 0.93,
      citations: [
        { filepath: 'auth/middleware.py', line: 25 },
        { filepath: 'auth/tokens.py', line: 68 },
      ],
    };
  if (/affected|impact|changed/.test(q))
    return {
      answer:
        '## Follow the callers before changing the token format\n\n**create_access_token** is called by authenticate_user and refresh_session. Its token string is then parsed by decode_token and checked by require_authentication.\n\nA format change should be reviewed across token creation, token decoding, and middleware validation. The graph view shows those relationships.\n\nThis is a prepared example using the bundled source.',
      intent: 'IMPACT',
      confidence: 0.9,
      citations: [
        { filepath: 'auth/service.py', line: 25 },
        { filepath: 'auth/service.py', line: 42 },
        { filepath: 'auth/tokens.py', line: 43 },
      ],
    };
  if (/test|coverage/.test(q))
    return {
      answer:
        '## Start with the authentication tests\n\nThe fixture includes **tests/test_auth.py**. Open that file to inspect the scenarios, then follow its function calls in the graph.\n\nA call relationship establishes that a test reaches a function; it does not establish a runtime coverage percentage. CodeSage displays a coverage score only when the backend supplies one.\n\nThis is a prepared example using the bundled source.',
      intent: 'TEST',
      confidence: 0.88,
      citations: [{ filepath: 'tests/test_auth.py', line: 1 }],
    };
  const mentioned = demoGraph.nodes.find((n) => !n.isTest && q.includes(n.label.toLowerCase()));
  if (mentioned)
    return {
      answer: `## ${mentioned.label}\n\n${mentioned.docstring || 'This symbol is present in the fixture repository.'}\n\nOpen the source citation to inspect its implementation, or explore its callers and callees in the graph.\n\nThis is a prepared fixture example. Live mode sends your question to the backend.`,
      intent: 'EXPLAIN',
      confidence: 0.9,
      citations: [{ filepath: mentioned.file, line: mentioned.line }],
    };
  if (/authentication|login|auth/.test(q))
    return {
      answer: authentication,
      intent: 'EXPLAIN',
      confidence: 0.94,
      citations: demoMessage.citations,
    };
  return {
    answer:
      '## You’re exploring the sample workspace\n\nDemo mode includes prepared examples for authentication, token changes, expiry errors, and test coverage. Try one of those prompts, or switch to live mode and connect your repository to ask an arbitrary question.',
    intent: 'GENERAL',
    citations: [],
  };
}
export const demoEvaluations: EvalResults = {
  thresholds: {
    faithfulness: 0.8,
    topology_recall: 0.7,
    intent_accuracy: 0.85,
    citation_precision: 0.85,
  },
  latest: {
    faithfulness: 0.92,
    topology_recall: 0.86,
    intent_accuracy: 0.95,
    citation_precision: 0.96,
  },
  runs: Array.from({ length: 12 }, (_, i) => ({
    id: `sample-${i + 1}`,
    timestamp: `2026-09-${String(i + 10).padStart(2, '0')}T10:00:00Z`,
    passed: i > 2,
    metrics: {
      faithfulness: 0.79 + i * 0.0118,
      topology_recall: 0.7 + i * 0.0145,
      intent_accuracy: 0.84 + i * 0.01,
      citation_precision: 0.85 + i * 0.01,
    },
    test_cases: examplePrompts.map((p, j) => ({
      id: `case-${j}`,
      query: p.query,
      intent: p.intent,
      retrieval_pass: j !== 2 || i > 3,
      answer_quality_pass: i > 2 || j !== 1,
      latency_ms: 680 + j * 275,
      answer: demoAnswer(p.query).answer,
      retrieved_chunks: [demoFiles['auth/service.py'].split('\n').slice(23, 37).join('\n')],
    })),
  })),
};
