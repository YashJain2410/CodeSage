import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { Badge, PageHeader } from '@/components/UI';
export default function Page() {
  return (
    <article className="page-content docs-page">
      <PageHeader
        eyebrow="A LITTLE GUIDANCE"
        title="Use CodeSage."
        description="Import code, ask questions, and explore how functions connect."
      />
      <div className="docs-layout">
        <aside className="docs-toc">
          <BookOpen size={20} />
          {[
            ['connect', 'Import code'],
            ['ask', 'Ask questions'],
            ['graph', 'Explore the graph'],
            ['quality', 'Check quality'],
            ['connection', 'Check the connection'],
            ['future', 'Features still being built'],
          ].map(([id, title]) => (
            <a href={`#${id}`} key={id}>
              {title}
            </a>
          ))}
        </aside>
        <div className="docs-content">
          <section id="connect">
            <Badge tone="purple">01 / CONNECT</Badge>
            <h2>Import code.</h2>
            <p>
              Switch to live mode, then import a public GitHub repository or upload a ZIP. Wait for
              the repository to show ready before asking questions.
            </p>
            <pre aria-label="How CodeSage works">
              <code>
                {
                  'GitHub or ZIP\n      ↓\nPython API\n      ↓\nCode graph + search\n      ↓\nAnswers'
                }
              </code>
            </pre>
            <p>
              Only one repository is active at a time. Import an older repository again to use it.
              Import again after the backend restarts.
            </p>
            <p>
              Demo mode uses sample data and needs no backend. Private GitHub repositories are not
              supported.
            </p>
            <Link className="text-link" href="/repositories">
              Connect repository <ArrowUpRight size={14} />
            </Link>
          </section>
          <section id="ask">
            <Badge tone="purple">02 / ASK</Badge>
            <h2>Ask questions.</h2>
            <p>
              Ask what a function does, what might cause a bug, or what a change could affect. Check
              the source before acting on an answer.
            </p>
            <p>
              When a citation is available, select it to open the source. Current live answers have
              no citations and use a fixed confidence score. That score does not measure accuracy.
            </p>
            <p>
              Chats stay in this browser. Each live question is separate, so include any needed
              context. ZIP source previews disappear on refresh; open a matching local file to view
              the source again.
            </p>
          </section>
          <section id="graph">
            <Badge tone="purple">03 / EXPLORE</Badge>
            <h2>Explore the graph.</h2>
            <p>
              Search for a function or file. Select a function to see what calls it and what it
              calls. Use module and test filters to narrow the view.
            </p>
            <p>The graph shows up to 350 symbols at once. Export JSON for the complete graph.</p>
            <p>A code connection does not prove that a test ran. Missing coverage means unknown.</p>
          </section>
          <section id="quality">
            <Badge tone="purple">04 / EVALUATE</Badge>
            <h2>Check quality.</h2>
            <p>
              Live evaluation is still being built. Demo scores are examples, not measurements of
              your repository.
            </p>
            <p>
              Observability shows recorded backend metrics. No data means a measurement is not
              available yet.
            </p>
          </section>
          <section id="connection">
            <Badge tone="purple">05 / CONNECT THE BACKEND</Badge>
            <h2>Check the connection.</h2>
            <p>
              Open Settings to check the backend connection. The default API address is{' '}
              <code>http://127.0.0.1:8000</code>. The backend needs PostgreSQL, Qdrant, and model
              credentials.
            </p>
            <p>
              Set <code>CODESAGE_BACKEND_URL</code> and restart the frontend to change the API
              address. Keep <code>NEXT_PUBLIC_API_MODE=current</code> for this backend.
            </p>
          </section>
          <section id="future">
            <Badge tone="purple">06 / READY FOR WHAT’S NEXT</Badge>
            <h2>Features still being built.</h2>
            <p>
              File and pasted-code imports, live evaluation, streamed answers, import progress,
              saved graphs for each repository, source-file retrieval, and service health need more
              backend work. Settings shows which routes are available.
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
