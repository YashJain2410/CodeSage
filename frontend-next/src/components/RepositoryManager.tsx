'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Check,
  FileCode2,
  FolderGit2,
  Github,
  HardDrive,
  Upload,
  Trash2,
  X,
} from 'lucide-react';
import { api, planned, supports } from '@/lib/api';
import { readSourceFiles } from '@/lib/source-files';
import { useCodeSageStore, useWorkspace } from '@/store/useCodeSageStore';
import { Badge, ErrorNotice, PageHeader, Spinner } from './UI';
import { useToast } from './Providers';
const sources = [
  { id: 'zip', label: 'ZIP archive', icon: Upload },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'local', label: 'Local path', icon: HardDrive },
  { id: 'file', label: 'Source file', icon: FileCode2 },
  { id: 'text', label: 'Paste code', icon: FileCode2 },
];
export default function RepositoryManager() {
  const [kind, setKind] = useState('zip'),
    [value, setValue] = useState(''),
    [filename, setFilename] = useState('snippet.py'),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [dragging, setDragging] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null),
    input = useRef<HTMLInputElement>(null);
  const store = useCodeSageStore(),
    w = useWorkspace(),
    router = useRouter(),
    toast = useToast(),
    client = useQueryClient();
  const caps = useQuery({ queryKey: ['capabilities'], queryFn: api.capabilities });
  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get('source');
    if (source) {
      setValue(source);
      setKind(/^https?:/.test(source) ? 'github' : 'local');
    }
    return () => controller.current?.abort();
  }, []);
  const endpoint =
    kind === 'zip'
      ? planned
        ? '/repositories/zip'
        : '/repositories/upload'
      : kind === 'local'
        ? '/index'
        : `/repositories/${kind}`;
  const unavailable =
    store.mode === 'live' && caps.data?.online && !supports(caps.data, endpoint, 'post');
  function choose(f?: File) {
    if (!f) return;
    setError(null);
    if (kind === 'zip' && !f.name.toLowerCase().endsWith('.zip')) {
      setError(new Error('Choose a .zip archive containing your repository.'));
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError(new Error('Choose a file smaller than 100 MB.'));
      return;
    }
    setFile(f);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (store.mode === 'demo') {
      setError(new Error('Switch to live mode to connect your own repository.'));
      return;
    }
    if (kind === 'zip' || kind === 'file') {
      if (!file) {
        setError(new Error('Choose a file first.'));
        return;
      }
    } else if (!value.trim()) {
      setError(new Error('Enter a repository source.'));
      return;
    }
    if (
      kind === 'github' &&
      !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?(?:\.git)?$/.test(value.trim())
    ) {
      setError(new Error('Use a GitHub repository URL, such as https://github.com/owner/repo.'));
      return;
    }
    if (kind === 'text' && !/\.(py|js|jsx|ts|tsx)$/.test(filename)) {
      setError(new Error('Use a supported filename ending in .py, .js, .jsx, .ts, or .tsx.'));
      return;
    }
    setBusy(true);
    controller.current = new AbortController();
    try {
      const result = await api.ingest(
        kind,
        file && ['zip', 'file'].includes(kind) ? file : value.trim(),
        filename,
        controller.current.signal,
      );
      const complete = ['ready', 'done', 'success', 'indexed'].includes(
        result.status.toLowerCase(),
      );
      if (!complete && !result.job_id)
        throw new Error(
          result.message || 'The backend did not return a completed index or a trackable job.',
        );
      const id = String(
        result.repository_id ||
          result.repo_id ||
          (kind === 'local' && !planned ? 'local-runtime' : result.job_id || crypto.randomUUID()),
      );
      const name = (
        file?.name ||
        value.trim().split('/').filter(Boolean).pop() ||
        filename
      ).replace(/\.(zip|git)$/, '');
      if (!planned)
        w.repositories
          .filter((r) => r.status === 'ready')
          .forEach((r) => store.upsertRepo({ ...r, status: 'pending' }));
      store.upsertRepo({
        id,
        name,
        source: file?.name || value.trim(),
        sourceType: kind,
        status: complete ? 'ready' : 'indexing',
        nodes: result.nodes,
        edges: result.edges,
        createdAt: new Date().toISOString(),
        jobId: result.job_id,
      });
      if (file)
        readSourceFiles(file)
          .then((files) => store.setSourceFiles(id, files))
          .catch(() => toast('Indexed successfully. Local source preview could not be loaded.'));
      if (kind === 'text') store.setSourceFiles(id, { [filename]: value });
      client.invalidateQueries({ queryKey: ['graph'] });
      toast(
        complete
          ? 'Repository indexed. You’re ready to explore.'
          : 'Indexing started. Follow the progress in your workspace.',
      );
      if (complete) router.push('/chat');
    } catch (err) {
      if (controller.current.signal.aborted)
        toast('Request cancelled. The backend may still be indexing.');
      else setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-content">
      <PageHeader
        eyebrow="START WITH YOUR SOURCE"
        title="Bring your code into focus."
        description="Connect a repository and turn its relationships into useful context."
      />
      <div className="repository-layout">
        <section className="surface ingest-panel">
          <div className="section-row">
            <h2>Connect a repository</h2>
            <Badge tone="purple">Python · JS · TS</Badge>
          </div>
          <div className="source-tabs" role="tablist" aria-label="Repository source">
            {sources.map((s) => (
              <button
                role="tab"
                aria-selected={kind === s.id}
                aria-controls="source-form"
                key={s.id}
                disabled={busy}
                onClick={() => {
                  setKind(s.id);
                  setFile(null);
                  setValue('');
                  setError(null);
                }}
                className={kind === s.id ? 'active' : ''}
              >
                <s.icon size={15} />
                {s.label}
              </button>
            ))}
          </div>
          <form id="source-form" onSubmit={submit}>
            {kind === 'zip' || kind === 'file' ? (
              <>
                <div
                  className={`upload-zone ${dragging ? 'dragging' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (!busy) choose(e.dataTransfer.files[0]);
                  }}
                >
                  <Upload size={31} />
                  <h3>
                    {file
                      ? file.name
                      : kind === 'zip'
                        ? 'Drop your repository here.'
                        : 'Drop a source file here.'}
                  </h3>
                  <p>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ready to upload`
                      : kind === 'zip'
                        ? 'ZIP archive · up to 100 MB'
                        : 'Python, JavaScript, or TypeScript · up to 100 MB'}
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => input.current?.click()}
                  >
                    {file ? 'Choose another file' : 'Browse files'} <ArrowUpRight size={15} />
                  </button>
                  <input
                    ref={input}
                    type="file"
                    aria-label="Select repository file"
                    accept={kind === 'zip' ? '.zip' : '.py,.js,.jsx,.ts,.tsx'}
                    hidden
                    onChange={(e) => choose(e.target.files?.[0])}
                  />
                </div>
                {kind === 'zip' && (
                  <p className="fine-print">
                    Upload source code without dependencies, build outputs, or credentials.
                  </p>
                )}
              </>
            ) : kind === 'text' ? (
              <>
                <label className="field-label" htmlFor="snippet-name">
                  Filename
                </label>
                <input
                  id="snippet-name"
                  className="input mono"
                  value={filename}
                  disabled={busy}
                  onChange={(e) => setFilename(e.target.value)}
                />
                <label className="field-label" htmlFor="snippet-code">
                  Source code
                </label>
                <textarea
                  id="snippet-code"
                  className="input mono snippet-input"
                  value={value}
                  disabled={busy}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Paste a function, module, or class…"
                />
              </>
            ) : (
              <>
                <label className="field-label" htmlFor="repository-source">
                  {kind === 'github' ? 'Repository URL' : 'Path on the backend machine'}
                </label>
                <input
                  id="repository-source"
                  className="input mono"
                  value={value}
                  disabled={busy}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={
                    kind === 'github'
                      ? 'https://github.com/owner/repository'
                      : '/absolute/path/to/repository'
                  }
                  required
                />
                <p className="fine-print">
                  {kind === 'github'
                    ? 'Import a public repository. Private repository authorization depends on your backend configuration.'
                    : 'This is a folder accessible to the Python backend, not a folder picker on your browser.'}
                </p>
              </>
            )}
            {unavailable && (
              <div className="availability-note">
                <b>This import option is ready for the planned backend.</b>
                <p>
                  The connected API does not expose this route yet. You can use ZIP upload or local
                  indexing today.
                </p>
                <Link href="/docs">
                  View integration guide <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
            {error != null && <ErrorNotice error={error} />}
            <div className="ingest-actions">
              <span>
                <Check size={14} /> Source stays on your configured backend
              </span>
              {busy ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => controller.current?.abort()}
                >
                  <X size={15} />
                  Cancel request
                </button>
              ) : null}
              <button
                type="submit"
                className="button primary"
                disabled={busy || unavailable || store.mode === 'demo'}
              >
                {busy ? (
                  <>
                    <Spinner />
                    Indexing…
                  </>
                ) : (
                  <>
                    Index repository <ArrowUpRight size={16} />
                  </>
                )}
              </button>
            </div>
            {store.mode === 'demo' && (
              <button type="button" className="text-button" onClick={() => store.setMode('live')}>
                Switch to live mode to add your code <ArrowUpRight size={14} />
              </button>
            )}
          </form>
        </section>
        <aside className="repository-guide">
          <span className="eyebrow">WHAT HAPPENS NEXT</span>
          <h2>
            One source.
            <br />A connected picture.
          </h2>
          {[
            ['01', 'Parse the source', 'Functions, classes, and tests become structured symbols.'],
            [
              '02',
              'Map the relationships',
              'Calls and imports connect each symbol to its wider context.',
            ],
            ['03', 'Ask with evidence', 'Answers bring the relevant source into the conversation.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <section>
                <h3>{t}</h3>
                <p>{d}</p>
              </section>
            </div>
          ))}
        </aside>
      </div>
      <section className="surface repository-list">
        <div className="section-row">
          <h2>Indexed in this browser</h2>
          <span className="muted">{w.repositories.length} repositories</span>
        </div>
        {!w.repositories.length ? (
          <div className="inline-empty">
            <FolderGit2 size={24} />
            <p>Your repositories will appear here after indexing.</p>
            <button className="text-button" onClick={() => store.setMode('demo')}>
              Explore the sample repository <ArrowUpRight size={14} />
            </button>
          </div>
        ) : (
          w.repositories.map((r) => (
            <div className="repository-row" key={r.id}>
              <span className="repo-icon">
                <FolderGit2 size={21} />
              </span>
              <div>
                <b>{r.name}</b>
                <small title={r.source}>{r.source}</small>
              </div>
              <div className="repo-numbers">
                <span>{r.nodes ?? '—'} symbols</span>
                <span>{r.edges ?? '—'} connections</span>
              </div>
              <Badge
                tone={r.status === 'ready' ? 'green' : r.status === 'failed' ? 'red' : 'muted'}
              >
                {r.status === 'pending' ? 'Re-index to activate' : r.status}
              </Badge>
              <button
                className="button secondary small"
                disabled={r.status !== 'ready'}
                onClick={() => {
                  store.selectRepo(r.id);
                  router.push('/chat');
                }}
              >
                Explore <ArrowUpRight size={14} />
              </button>
              {removingId === r.id ? (
                <div className="row-actions">
                  <button
                    className="button secondary small"
                    onClick={() => {
                      store.removeRepo(r.id);
                      setRemovingId(null);
                      toast('Repository and its conversations removed from this browser.');
                    }}
                  >
                    Remove entry
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Cancel removal"
                    onClick={() => setRemovingId(null)}
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <button
                  className="icon-button"
                  disabled={r.status === 'indexing'}
                  aria-label={`Remove ${r.name} from browser history`}
                  title="Remove this entry and its chats from this browser"
                  onClick={() => setRemovingId(r.id)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))
        )}
        {!planned && store.mode === 'live' && w.repositories.length > 0 && (
          <p className="fine-print">
            The current backend keeps one active graph. Indexing another repository replaces it;
            earlier entries need to be indexed again.
          </p>
        )}
      </section>
    </div>
  );
}
