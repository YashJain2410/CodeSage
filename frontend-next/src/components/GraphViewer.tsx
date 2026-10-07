'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowUpRight,
  Download,
  FileCode2,
  GitBranch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { demoGraph } from '@/lib/demo';
import { fileColor, layoutGraph } from '@/lib/graph-layout';
import { exportGraphPNG } from '@/lib/graph-export';
import type { GraphNode } from '@/lib/types';
import { useCodeSageStore, useWorkspace } from '@/store/useCodeSageStore';
import { Badge, ConnectAction, EmptyState, ErrorNotice, Skeleton, download } from './UI';
function SymbolNode({ data }: { data: NodeProps['data'] }) {
  const n = data.symbol as GraphNode;
  return (
    <div
      className={`symbol-node ${data.dim ? 'dim' : ''} ${data.match ? 'match' : ''} ${n.isTest ? 'test-symbol' : ''}`}
      style={{ borderLeftColor: fileColor(n.file) }}
    >
      <Handle type="target" position={Position.Left} />
      <span
        className={`symbol-dot ${n.isTest ? 'diamond' : n.type === 'class' ? 'square' : ''}`}
        style={{ background: fileColor(n.file) }}
      />
      <div>
        <b title={n.label}>{n.label}</b>
        <small title={n.file}>{n.file.split('/').pop() || 'External call'}</small>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { symbol: SymbolNode };
function Explorer() {
  const w = useWorkspace(),
    store = useCodeSageStore(),
    repo = w.repositories.find((r) => r.id === w.activeRepoId),
    router = useRouter(),
    flow = useReactFlow();
  const [search, setSearch] = useState(''),
    [tests, setTests] = useState(true),
    [external, setExternal] = useState(false),
    [layout, setLayout] = useState('hierarchical'),
    [selected, setSelected] = useState<GraphNode | null>(null),
    [module, setModule] = useState(''),
    [focus, setFocus] = useState<string | null>(null),
    [toolbar, setToolbar] = useState(false);
  const graph = useQuery({
    queryKey: ['graph', store.mode, repo?.id],
    queryFn: ({ signal }) => (store.mode === 'demo' ? demoGraph : api.graph(repo!.id, signal)),
    enabled: repo?.status === 'ready',
  });
  useEffect(() => {
    setSelected(null);
    setModule('');
    setFocus(store.mode === 'demo' ? 'auth/service.py::authenticate_user' : null);
    setSearch('');
  }, [repo?.id, store.mode]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const filtered = useMemo(() => {
    const neighbors = new Set<string>(focus ? [focus] : []);
    if (focus)
      graph.data?.edges.forEach((e) => {
        if (e.source === focus) neighbors.add(e.target);
        if (e.target === focus) neighbors.add(e.source);
      });
    const all =
      graph.data?.nodes.filter(
        (n) =>
          (tests || !n.isTest) &&
          (external || !n.external) &&
          (!module || n.file.startsWith(module)) &&
          (!focus || neighbors.has(n.id)),
      ) || [];
    const matches =
      all.length > 350 && search
        ? all.filter((n) => (n.label + ' ' + n.file).toLowerCase().includes(search.toLowerCase()))
        : all;
    const nodes = matches.slice(0, 350),
      ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      edges:
        graph.data?.edges.filter(
          (e) => ids.has(e.source) && ids.has(e.target) && (external || e.resolved),
        ) || [],
      total: matches.length,
    };
  }, [graph.data, tests, external, module, search, focus]);
  const elements = useMemo(() => {
    const positions = layoutGraph(filtered, layout),
      q = search.toLowerCase();
    return {
      nodes: filtered.nodes.map((n) => ({
        id: n.id,
        type: 'symbol',
        position: positions.get(n.id) || { x: 0, y: 0 },
        data: {
          symbol: n,
          dim: !!q && !(n.label + ' ' + n.file).toLowerCase().includes(q),
          match: !!q && (n.label + ' ' + n.file).toLowerCase().includes(q),
        },
        selected: selected?.id === n.id,
      })),
      edges: filtered.edges.map((e, i) => ({
        id: `${e.source}-${e.target}-${i}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        style: {
          stroke: '#9c93b5',
          strokeWidth: Math.min(1 + e.frequency / 10, 4),
          opacity: search?.length ? 0.5 : 0.7,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9c93b5' },
        animated: false,
      })),
    };
  }, [filtered, layout, search, selected?.id]);
  useEffect(() => {
    const t = setTimeout(() => flow.fitView({ padding: 0.2, duration: 300, maxZoom: 1 }), 80);
    return () => clearTimeout(t);
  }, [filtered.nodes.length, layout, module, flow]);
  const modules = Array.from(
    new Set(
      graph.data?.nodes.map((n) => (n.file.includes('/') ? n.file.split('/')[0] + '/' : '')) || [],
    ),
  )
    .filter(Boolean)
    .sort();
  const choose = useCallback(
    (_event: unknown, node: { id: string }) =>
      setSelected(graph.data?.nodes.find((n) => n.id === node.id) || null),
    [graph.data],
  );
  if (!repo || repo.status !== 'ready')
    return (
      <div className="page-content">
        <EmptyState
          icon={<GitBranch size={34} />}
          title="See how your code connects."
          description="Index a repository to explore functions, callers, dependencies, and tests."
          action={<ConnectAction />}
        />
      </div>
    );
  return (
    <div className="graph-page">
      <header className="graph-heading">
        <div>
          <span className="eyebrow">THE CONNECTED CODEBASE</span>
          <h1>
            Call graph <Badge>{graph.data?.nodes.length ?? '—'} symbols</Badge>
          </h1>
        </div>
        <div>
          <button
            className="icon-button"
            aria-label="Refresh graph"
            onClick={() => graph.refetch()}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="button secondary small"
            disabled={!filtered.nodes.length}
            onClick={() => exportGraphPNG(filtered, layoutGraph(filtered, layout), repo.name)}
          >
            <Download size={15} />
            Export PNG
          </button>
          <button
            className="button secondary small"
            disabled={!graph.data}
            onClick={() => download(`${repo.name}-graph.json`, JSON.stringify(graph.data, null, 2))}
          >
            <Download size={15} />
            Export JSON
          </button>
          <button
            className="icon-button mobile-only"
            aria-label="Toggle graph controls"
            aria-expanded={toolbar}
            onClick={() => setToolbar(!toolbar)}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </header>
      <div className={`graph-toolbar ${toolbar ? 'open' : ''}`}>
        <label className="search-field">
          <Search size={15} />
          <input
            aria-label="Search graph symbols"
            placeholder="Find a function or file…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="input"
          aria-label="Filter graph by module"
          value={module}
          onChange={(e) => {
            setModule(e.target.value);
            setFocus(null);
          }}
        >
          <option value="">All modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {focus && (
          <button
            className="button secondary small"
            onClick={() => setFocus(null)}
            aria-label="Show full graph"
          >
            Focused <X size={12} />
          </button>
        )}
        <div className="toggle-group">
          <button
            aria-pressed={tests}
            className={tests ? 'active' : ''}
            onClick={() => setTests(!tests)}
          >
            Tests
          </button>
          <button
            aria-pressed={external}
            className={external ? 'active' : ''}
            onClick={() => setExternal(!external)}
          >
            External
          </button>
        </div>
        <select
          className="input"
          aria-label="Graph layout"
          value={layout}
          onChange={(e) => setLayout(e.target.value)}
        >
          <option value="hierarchical">Hierarchical</option>
          <option value="network">Force layout</option>
        </select>
      </div>
      <div className="graph-canvas">
        {graph.isLoading ? (
          <div className="graph-loading">
            <Skeleton rows={8} />
          </div>
        ) : graph.error ? (
          <ErrorNotice error={graph.error} retry={() => graph.refetch()} />
        ) : !filtered.nodes.length ? (
          <EmptyState
            icon={<Search size={25} />}
            title="No symbols in this view."
            description="Try another module or enable tests and external symbols."
          />
        ) : (
          <ReactFlow
            nodes={elements.nodes}
            edges={elements.edges}
            nodeTypes={nodeTypes}
            onNodeClick={choose}
            onSelectionChange={({ nodes }) => {
              if (nodes[0])
                setSelected(graph.data?.nodes.find((n) => n.id === nodes[0].id) || null);
            }}
            fitView
            minZoom={0.08}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={22}
              size={1}
              color="var(--graph-dot)"
            />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => fileColor((n.data.symbol as GraphNode).file)}
              maskColor="var(--graph-mask)"
              zoomable
              pannable
            />
          </ReactFlow>
        )}
        {selected && (
          <aside className="node-inspector">
            <div className="section-row">
              <Badge tone={selected.isTest ? 'green' : 'purple'}>
                {selected.isTest ? 'Test' : selected.type}
              </Badge>
              <button
                className="icon-button"
                aria-label="Close symbol details"
                onClick={() => setSelected(null)}
              >
                <X size={17} />
              </button>
            </div>
            <h2>{selected.label}</h2>
            <span className="mono node-location">
              {selected.file || 'External symbol'}:{selected.line}
            </span>
            <p>{selected.docstring || 'No docstring is available for this symbol.'}</p>
            <div className="node-stats">
              <div>
                <strong>{selected.callersCount}</strong>
                <span>Callers</span>
              </div>
              <div>
                <strong>
                  {graph.data?.edges.filter((e) => e.source === selected.id).length ?? 0}
                </strong>
                <span>Callees</span>
              </div>
              <div>
                <strong>{selected.testCoverage != null ? `${selected.testCoverage}%` : '—'}</strong>
                <span>Test coverage</span>
              </div>
            </div>
            <button
              className="button primary"
              onClick={() => {
                store.newConversation();
                store.setPendingPrompt(
                  `Explain the ${selected.label} function in ${selected.file}`,
                );
                router.push('/chat');
              }}
            >
              Ask about this symbol <ArrowUpRight size={15} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                setModule('');
                setFocus(selected.id);
                setSelected(null);
              }}
            >
              <GitBranch size={14} />
              Focus connections
            </button>
            {selected.file && (
              <button
                className="text-button"
                onClick={() => {
                  store.setCitation({ filepath: selected.file, line: selected.line });
                  router.push('/chat');
                }}
              >
                <FileCode2 size={14} />
                Inspect source
              </button>
            )}
          </aside>
        )}
      </div>
      <footer className="graph-footer">
        <div>
          <span className="symbol-dot" />
          Function <span className="symbol-dot square" />
          Class <span className="symbol-dot diamond" />
          Test
        </div>
        <span>
          {filtered.nodes.length} symbols · {filtered.edges.length} connections
          {filtered.total > 350 ? ' · Use search or module filters to explore more' : ''}
        </span>
        <span>Scroll to zoom · Drag to pan</span>
      </footer>
    </div>
  );
}
export default function GraphViewer() {
  return (
    <ReactFlowProvider>
      <Explorer />
    </ReactFlowProvider>
  );
}
