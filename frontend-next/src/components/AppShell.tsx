'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Command,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCodeSageStore, useWorkspace } from '@/store/useCodeSageStore';
import { Badge, Logo, ThemeToggle } from './UI';
import IndexProgress from './IndexProgress';
const links = [
  { href: '/workspace', label: 'Overview', icon: LayoutDashboard },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2 },
  { href: '/chat', label: 'Ask CodeSage', icon: MessageSquare },
  { href: '/graph', label: 'Call graph', icon: GitBranch },
  { href: '/eval', label: 'Evaluations', icon: ShieldCheck },
  { href: '/observability', label: 'Observability', icon: Activity },
];
export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter(),
    workspace = useWorkspace(),
    store = useCodeSageStore();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [term, setTerm] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const caps = useQuery({
    queryKey: ['capabilities'],
    queryFn: api.capabilities,
    refetchInterval: 30_000,
  });
  const repo = workspace.repositories.find((r) => r.id === workspace.activeRepoId);
  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [path]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (e.key === 'Escape') {
        setSearch(false);
        setMenu(false);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!search) return;
    const prev = document.activeElement as HTMLElement;
    dialog.current?.querySelector('input')?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const els = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input,button,a') || []);
      const first = els[0],
        last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      prev?.focus();
    };
  }, [search]);
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`app-sidebar ${menu ? 'open' : ''}`}>
        <Link className="sidebar-brand" href="/">
          <Logo />
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">C</span>
          <div>
            <b>Personal workspace</b>
            <small>{store.mode === 'demo' ? 'Sample environment' : 'Local environment'}</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <button className="sidebar-search" onClick={() => setSearch(true)}>
          <Search size={15} /> Search workspace <kbd>⌘ K</kbd>
        </button>
        <span className="sidebar-label">WORKSPACE</span>
        <nav aria-label="Workspace navigation">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={path === l.href ? 'active' : ''}
              aria-current={path === l.href ? 'page' : undefined}
            >
              <l.icon size={17} />
              {l.label}
              {l.href === '/repositories' && <small>{workspace.repositories.length}</small>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-conversations">
          <div className="sidebar-label">
            RECENT CONVERSATIONS
            <button
              aria-label="New conversation"
              className="icon-button"
              onClick={() => {
                store.newConversation();
                router.push('/chat');
              }}
            >
              <Plus size={13} />
            </button>
          </div>
          {workspace.conversations.slice(0, 4).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                store.selectConversation(c.id);
                router.push('/chat');
              }}
              className={
                c.id === workspace.activeConversationId && path === '/chat' ? 'active' : ''
              }
            >
              <MessageSquare size={13} />
              <span>{c.title}</span>
            </button>
          ))}
          {!workspace.conversations.length && <p>Your questions will live here.</p>}
        </div>
        <div className="sidebar-bottom">
          <Link href="/docs">
            <BookOpen size={16} />
            Documentation <ArrowUpRight size={13} />
          </Link>
          <Link href="/settings" className={path === '/settings' ? 'active' : ''}>
            <Settings2 size={16} />
            Settings
          </Link>
          <div className="connection-summary">
            <span className={`status-dot ${caps.data?.online ? 'online' : ''}`} />
            <span>
              {caps.isLoading
                ? 'Checking connection'
                : caps.data?.online
                  ? 'Backend connected'
                  : 'Backend disconnected'}
            </span>
            <button
              className="icon-button"
              aria-label="Recheck backend connection"
              onClick={() => caps.refetch()}
            >
              <Activity size={13} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <FolderGit2 size={16} />
            <select
              aria-label="Active repository"
              value={workspace.activeRepoId || ''}
              onChange={(e) => store.selectRepo(e.target.value)}
            >
              <option value="" disabled>
                Select a repository
              </option>
              {workspace.repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className="topbar-divider">/</span>
            <span>{links.find((l) => l.href === path)?.label || 'Workspace'}</span>
          </div>
          <div className="topbar-right">
            {store.mode === 'demo' ? (
              <Badge tone="purple">Demo workspace</Badge>
            ) : (
              repo && (
                <Badge tone={repo.status === 'ready' ? 'green' : 'muted'}>{repo.status}</Badge>
              )
            )}
            <ThemeToggle />
            <button
              className="workspace-user"
              onClick={() => router.push('/settings')}
              aria-label="Open workspace settings"
            >
              C
            </button>
          </div>
        </header>
        {store.mode === 'demo' && (
          <div className="demo-banner">
            <span>
              <span className="status-dot" /> You’re exploring the sample workspace. Answers and
              metrics are illustrative.
            </span>
            <button onClick={() => store.setMode('live')}>
              Switch to live <ArrowUpRight size={13} />
            </button>
          </div>
        )}
        <IndexProgress />
        <main id="main" className="workspace-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={path}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AnimatePresence>
        {search && (
          <motion.div
            className="command-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearch(false)}
          >
            <div
              ref={dialog}
              className="command-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Search workspace"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <Search size={20} />
                <input
                  aria-label="Search pages and conversations"
                  placeholder="Where would you like to go?"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
                <button
                  className="icon-button"
                  onClick={() => setSearch(false)}
                  aria-label="Close search"
                >
                  <X size={18} />
                </button>
              </div>
              <span className="sidebar-label">PAGES & CONVERSATIONS</span>
              {links
                .filter((l) => l.label.toLowerCase().includes(term.toLowerCase()))
                .map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setSearch(false)}>
                    <l.icon size={17} />
                    {l.label}
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
              {workspace.conversations
                .filter((c) => c.title.toLowerCase().includes(term.toLowerCase()))
                .slice(0, 5)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      store.selectConversation(c.id);
                      router.push('/chat');
                      setSearch(false);
                    }}
                  >
                    <MessageSquare size={17} />
                    {c.title}
                  </button>
                ))}
              <footer>
                <Command size={12} /> K to open <span>ESC to close</span>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
