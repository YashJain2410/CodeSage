'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  FileCode2,
  FolderGit2,
  GitBranch,
  MessageSquare,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { demoGraph, examplePrompts } from '@/lib/demo';
import { useCodeSageStore, useWorkspace } from '@/store/useCodeSageStore';
import { Badge, ConnectAction, PageHeader } from './UI';
export default function Overview() {
  const w = useWorkspace(),
    store = useCodeSageStore(),
    router = useRouter(),
    repo = w.repositories.find((r) => r.id === w.activeRepoId);
  const graph = useQuery({
    queryKey: ['graph', store.mode, repo?.id],
    queryFn: () => (store.mode === 'demo' ? demoGraph : api.graph(repo!.id)),
    enabled: repo?.status === 'ready',
  });
  const stats = [
    [
      'Functions',
      graph.data?.nodes.filter((n) => !n.isTest && n.type !== 'class').length,
      FileCode2,
    ],
    ['Call relationships', graph.data?.edges.length, GitBranch],
    ['Test symbols', graph.data?.nodes.filter((n) => n.isTest).length, ShieldCheck],
  ] as const;
  function ask(query: string) {
    store.newConversation();
    store.setPendingPrompt(query);
    router.push('/chat');
  }
  return (
    <div className="page-content overview">
      <PageHeader
        eyebrow="YOUR CODE, IN CONTEXT"
        title="A clearer starting point."
        description="Pick up where you left off, or follow a new connection."
        action={<ConnectAction />}
      />
      <section className="overview-spotlight">
        <div>
          <Badge tone="purple">CODEBASE INTELLIGENCE</Badge>
          <h2>
            A little context.
            <br />A lot more clarity.
          </h2>
          <p>
            {repo
              ? `Explore ${repo.name} through its source, relationships, and tests.`
              : 'Bring in a repository. Get to know the code, one good question at a time.'}
          </p>
          <div className="button-row">
            {repo ? (
              <Link className="button primary" href="/chat">
                Ask your first question <ArrowUpRight size={16} />
              </Link>
            ) : (
              <ConnectAction />
            )}
            <button
              className="button secondary"
              onClick={() => store.setMode(store.mode === 'demo' ? 'live' : 'demo')}
            >
              {store.mode === 'demo' ? 'Use my backend' : 'Explore a sample'}{' '}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="spotlight-graphic" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="orbit-symbol main-symbol">
            <GitBranch size={38} />
          </span>
          <span className="orbit-symbol symbol-code">
            <FileCode2 size={23} />
          </span>
          <span className="orbit-symbol symbol-test">
            <ShieldCheck size={23} />
          </span>
          <span className="orbit-symbol symbol-chat">
            <MessageSquare size={23} />
          </span>
          <span className="orbit-label">everything is connected.</span>
        </div>
      </section>
      <div className="overview-stats">
        {stats.map(([label, value, Icon]) => (
          <div key={label}>
            <Icon size={19} />
            <span>{label}</span>
            <strong>{value ?? '—'}</strong>
            <small>
              {store.mode === 'demo'
                ? 'Sample repository'
                : repo
                  ? 'Active repository'
                  : 'Connect to discover'}
            </small>
          </div>
        ))}
      </div>
      <section className="quick-start">
        <div className="section-row">
          <h2>Good questions open doors.</h2>
          <span className="muted">A few places to start</span>
        </div>
        <div className="prompt-grid">
          {examplePrompts.map((p) => (
            <button
              key={p.intent}
              className="prompt-card"
              disabled={!repo || repo.status !== 'ready'}
              onClick={() => ask(p.query)}
            >
              <Badge tone={p.intent === 'BUG' ? 'red' : p.intent === 'TEST' ? 'green' : 'purple'}>
                {p.intent}
              </Badge>
              <h3>{p.title}</h3>
              <p>{p.query}</p>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      </section>
      <div className="overview-bottom">
        <section className="surface">
          <div className="section-row">
            <h2>Recent conversations</h2>
            <Link className="text-link" href="/chat">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {w.conversations.length ? (
            w.conversations.slice(0, 4).map((c) => (
              <button
                className="conversation-row"
                key={c.id}
                onClick={() => {
                  store.selectConversation(c.id);
                  router.push('/chat');
                }}
              >
                <MessageSquare size={17} />
                <div>
                  <b>{c.title}</b>
                  <small>
                    {w.repositories.find((r) => r.id === c.repoId)?.name || 'Repository'} ·{' '}
                    {c.messages.length} messages
                  </small>
                </div>
                <Clock size={13} />
                <ArrowUpRight size={15} />
              </button>
            ))
          ) : (
            <div className="inline-empty">
              <MessageSquare size={22} />
              <p>Your first question starts a conversation.</p>
            </div>
          )}
        </section>
        <section className="surface">
          <div className="section-row">
            <h2>Your repositories</h2>
            <Link className="icon-button" aria-label="Add a repository" href="/repositories">
              <Plus size={16} />
            </Link>
          </div>
          {w.repositories.length ? (
            w.repositories.slice(0, 3).map((r) => (
              <button
                className="conversation-row"
                key={r.id}
                onClick={() => {
                  store.selectRepo(r.id);
                  router.push('/repositories');
                }}
              >
                <FolderGit2 size={20} />
                <div>
                  <b>{r.name}</b>
                  <small>
                    {r.nodes ?? '—'} symbols · {r.edges ?? '—'} relationships
                  </small>
                </div>
                <Badge tone={r.status === 'ready' ? 'green' : 'muted'}>{r.status}</Badge>
              </button>
            ))
          ) : (
            <div className="inline-empty">
              <FolderGit2 size={22} />
              <p>Connect your code to see it here.</p>
            </div>
          )}
          <p className="fine-print">Workspace history is stored in this browser.</p>
        </section>
      </div>
    </div>
  );
}
