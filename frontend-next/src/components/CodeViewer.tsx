'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, FileCode2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { demoFiles } from '@/lib/demo';
import { useCodeSageStore, useWorkspace } from '@/store/useCodeSageStore';
import { Badge, EmptyState, ErrorNotice, Skeleton } from './UI';
import { useToast } from './Providers';
function Syntax({ line }: { line: string }) {
  return (
    <>
      {line
        .split(
          /("[^"]*"|'[^']*'|\b(?:def|class|return|if|else|elif|raise|import|from|as|const|let|export|function|async|await|try|except|None|True|False)\b|#.*$)/g,
        )
        .map((part, i) => (
          <span
            key={i}
            className={
              /^#/.test(part)
                ? 'code-comment'
                : /^['"]/.test(part)
                  ? 'code-string'
                  : /^(def|class|return|if|else|elif|raise|import|from|as|const|let|export|function|async|await|try|except|None|True|False)$/.test(
                        part,
                      )
                    ? 'code-keyword'
                    : ''
            }
          >
            {part}
          </span>
        ))}
    </>
  );
}
export default function CodeViewer() {
  const w = useWorkspace(),
    store = useCodeSageStore(),
    citation = store.selectedCitation,
    repo = w.repositories.find((r) => r.id === w.activeRepoId),
    lineRef = useRef<HTMLDivElement>(null),
    fileInput = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState<Record<string, string>>({});
  const toast = useToast();
  const cached = citation
    ? store.mode === 'demo'
      ? demoFiles[citation.filepath]
      : (store.sourceFiles[repo?.id || '']?.[citation.filepath] ?? local[citation.filepath])
    : undefined;
  const source = useQuery({
    queryKey: ['file', store.mode, repo?.id, citation?.filepath],
    queryFn: ({ signal }) => api.file(citation!.filepath, repo!.id, signal),
    enabled: !!citation && !!repo && cached === undefined && store.mode === 'live',
    retry: false,
  });
  const text = cached ?? source.data;
  useEffect(() => {
    lineRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'center',
    });
  }, [text, citation?.line]);
  useEffect(() => {
    setLocal({});
  }, [repo?.id]);
  if (!citation)
    return (
      <aside className="code-viewer" aria-label="Source viewer" id="source-viewer" tabIndex={-1}>
        <div className="code-viewer-header">
          <FileCode2 size={15} />
          <span>Source context</span>
          <Badge>Read only</Badge>
        </div>
        <EmptyState
          icon={<FileCode2 size={30} />}
          title="Follow the evidence."
          description="Select a source citation to inspect the code behind an answer."
        />
        <div className="code-empty-decoration" aria-hidden="true">
          <span>01</span>
          <i />
          <span>02</span>
          <i />
          <span>03</span>
          <i />
        </div>
      </aside>
    );
  const lines = text?.split('\n') || [],
    ext = citation.filepath.split('.').pop(),
    language =
      ext === 'py'
        ? 'Python'
        : ext?.startsWith('ts')
          ? 'TypeScript'
          : ext?.startsWith('js')
            ? 'JavaScript'
            : ext || 'Source';
  return (
    <aside className="code-viewer" aria-label="Source viewer" id="source-viewer" tabIndex={-1}>
      <div className="code-viewer-header">
        <FileCode2 size={15} />
        <span title={citation.filepath}>{citation.filepath}</span>
        <button
          className="icon-button"
          aria-label="Copy source code"
          disabled={!text}
          onClick={() =>
            navigator.clipboard
              .writeText(text!)
              .then(() => toast('Source copied.'))
              .catch(() => toast('Clipboard is unavailable.'))
          }
        >
          <Copy size={15} />
        </button>
        <button
          className="icon-button"
          aria-label="Close source file"
          onClick={() => store.setCitation(null)}
        >
          <X size={15} />
        </button>
      </div>
      <div className="code-meta">
        <Badge tone="purple">{language}</Badge>
        <span>
          Line {citation.line}
          {text != null ? ` of ${lines.length}` : ''}
        </span>
        <span className="muted">{cached !== undefined ? 'Local source' : 'Backend source'}</span>
      </div>
      {source.isFetching && cached === undefined ? (
        <Skeleton rows={12} />
      ) : text != null ? (
        <div className="source-scroll">
          <pre>
            {lines.map((l, i) => (
              <div
                key={i}
                ref={i + 1 === citation.line ? lineRef : null}
                className={`source-line ${i + 1 === citation.line ? 'highlighted' : ''}`}
              >
                <span className="line-number">{i + 1}</span>
                <code>
                  <Syntax line={l || ' '} />
                </code>
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="source-unavailable">
          {source.error && <ErrorNotice error={source.error} />}
          <EmptyState
            icon={<FileCode2 size={25} />}
            title="The citation is ready."
            description="Source content needs the planned file endpoint, or a matching local file."
            action={
              <button className="button secondary" onClick={() => fileInput.current?.click()}>
                <Upload size={16} />
                Open matching file
              </button>
            }
          />
          <input
            type="file"
            ref={fileInput}
            hidden
            aria-label="Open cited source file locally"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 1_000_000) {
                toast('Choose a source file under 1 MB.');
                return;
              }
              if (f.name !== citation.filepath.split('/').pop()) {
                toast('Choose the file named in this citation.');
                return;
              }
              const content = await f.text();
              setLocal((s) => ({ ...s, [citation.filepath]: content }));
            }}
          />
        </div>
      )}
      <div className="code-statusbar">
        <span>{text != null ? `${lines.length} lines` : 'Source not loaded'}</span>
        <span>UTF-8 · Read only</span>
      </div>
    </aside>
  );
}
