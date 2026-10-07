import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { Badge, PageHeader } from '@/components/UI';
export default function Page() {
  return (
    <article className="page-content docs-page">
      <PageHeader
        eyebrow="A LITTLE GUIDANCE"
        title="From source to understanding."
        description="A guide to your CodeSage workspace and its connection to the backend."
      />
      <div className="docs-layout">
        <aside className="docs-toc">
          <BookOpen size={20} />
          {[
            ['connect', 'Connect your repository'],
            ['ask', 'Ask with source context'],
            ['graph', 'Follow the relationships'],
            ['quality', 'Measure answer quality'],
            ['connection', 'Connect the backend'],
            ['future', 'Planned capabilities'],
          ].map(([id, title]) => (
            <a href={`#${id}`} key={id}>
              {title}
            </a>
          ))}
        </aside>
        <div className="docs-content">
          <section id="connect">
            <Badge tone="purple">01 / CONNECT</Badge>
            <h2>Start with the source.</h2>
            <p>
              Upload a ZIP archive or provide a folder path accessible to the Python backend.
              CodeSage indexes the repository before you can ask questions.
            </p>
            <p>
              The current backend holds one active graph. When you index another repository,
              previous entries remain in your browser history and need to be indexed again to become
              active.
            </p>
            <p>
              GitHub, single-file, and pasted-code import screens are implemented. They become
              available when the backend exposes the corresponding routes.
            </p>
            <Link className="text-link" href="/repositories">
              Connect repository <ArrowUpRight size={14} />
            </Link>
          </section>
          <section id="ask">
            <Badge tone="purple">02 / ASK</Badge>
            <h2>Follow an answer back to the code.</h2>
            <p>
              Ask about a function, a failure, the impact of a change, or test coverage. The
              assistant shows intent and confidence when they are returned by the backend.
            </p>
            <p>
              Select a citation to open the source viewer at its line. ZIP and source-file uploads
              keep a temporary source copy in browser memory. Refreshing clears this copy; use the
              file endpoint or open a matching file locally to restore it.
            </p>
            <p>
              Conversations are saved in this browser, with separate histories for live and demo
              modes. The current query endpoint does not receive conversation history, so each live
              question is independent unless you include prior context yourself.
            </p>
          </section>
          <section id="graph">
            <Badge tone="purple">03 / EXPLORE</Badge>
            <h2>Code has a shape.</h2>
            <p>
              Explore symbols and call relationships. Filter by module, toggle test and external
              nodes, switch layouts, and select a symbol to inspect its callers and callees.
            </p>
            <p>
              Graph search highlights matching function names and file paths. Large graphs display
              up to 350 symbols at a time; use module filters and search to focus the view. Export
              JSON to preserve the complete graph.
            </p>
            <p>
              A missing coverage percentage means the backend has not reported it. Call graph
              relationships do not imply runtime test coverage.
            </p>
          </section>
          <section id="quality">
            <Badge tone="purple">04 / EVALUATE</Badge>
            <h2>Inspect quality, one question at a time.</h2>
            <p>
              Run the golden question set using its path on the backend machine. Review
              faithfulness, topology recall, intent accuracy, and citation precision. Expand test
              cases to inspect answers and retrieved context.
            </p>
            <p>
              Aggregate-only reports still show metric cards. If no server history exists, completed
              runs are saved in this browser. Frontend display thresholds are distinguished from the
              backend’s CI gate result.
            </p>
            <p>
              Observability reads Prometheus counters and histograms. It shows no-data states when a
              metric has not been recorded.
            </p>
          </section>
          <section id="connection">
            <Badge tone="purple">05 / CONNECT THE BACKEND</Badge>
            <h2>Your API, behind one origin.</h2>
            <pre>
              <code>
                cd frontend-next{'\n'}cp .env.example .env.local{'\n'}npm install{'\n'}npm run dev
              </code>
            </pre>
            <p>
              By default, <code>/api/backend/*</code> proxies to <code>http://127.0.0.1:8000</code>.
              Set <code>CODESAGE_BACKEND_URL</code> and restart the frontend for a different
              backend. The backend must be running with its configured databases, vector store, and
              model credentials.
            </p>
            <p>
              Keep <code>NEXT_PUBLIC_API_MODE=current</code> for the checked-in backend. Use{' '}
              <code>planned</code> after implementing the versioned contracts documented in{' '}
              <code>API-CONTRACT.md</code>. Settings checks <code>/openapi.json</code> to show
              feature availability.
            </p>
          </section>
          <section id="future">
            <Badge tone="purple">06 / READY FOR WHAT’S NEXT</Badge>
            <h2>The next workflows have a home.</h2>
            <p>
              The interface supports progress streams for background indexing, streamed answer
              tokens, repository-scoped graphs, source content, evaluation jobs and history,
              detailed test cases, and service health.
            </p>
            <p>
              Those workflows use explicit adapters. Their route shapes and activation steps are
              documented alongside the frontend code. Features stay visibly unavailable until the
              connected backend exposes them.
            </p>
            <Link className="text-link" href="/settings">
              Inspect available capabilities <ArrowUpRight size={14} />
            </Link>
          </section>
        </div>
      </div>
    </article>
  );
}
