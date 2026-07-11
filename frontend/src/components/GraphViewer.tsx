'use client';

import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, useEdgesState, useNodesState, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { Braces, Box, ChevronRight, Database, FileCode2, Folder, Globe2, Package, Pin, Search, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import api, { type GraphData, type GraphNode } from '@/lib/api';
import { useCodeSageStore } from '@/store/useCodeSageStore';

type ViewKind = 'repository' | 'folder' | 'file' | 'class' | 'function' | 'test' | 'external' | 'database' | 'api';
type ViewNode = Node<{ label: string; kind: ViewKind; file?: string; source?: GraphNode; dimmed?: boolean; pinned?: boolean }>;

const kindStyle: Record<ViewKind, string> = {
  repository: 'border-primary/60 bg-primary text-white', folder: 'border-amber-400/50 bg-amber-50 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100',
  file: 'border-sky-400/50 bg-sky-50 text-sky-950 dark:bg-sky-400/15 dark:text-sky-100', class: 'border-violet-400/50 bg-violet-50 text-violet-950 dark:bg-violet-400/15 dark:text-violet-100',
  function: 'border-emerald-400/50 bg-emerald-50 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100', test: 'border-rose-400/50 bg-rose-50 text-rose-950 dark:bg-rose-400/15 dark:text-rose-100',
  external: 'border-slate-400/50 bg-slate-50 text-slate-950 dark:bg-slate-400/15 dark:text-slate-100', database: 'border-cyan-400/50 bg-cyan-50 text-cyan-950 dark:bg-cyan-400/15 dark:text-cyan-100', api: 'border-orange-400/50 bg-orange-50 text-orange-950 dark:bg-orange-400/15 dark:text-orange-100'
};
const icons: Record<ViewKind, typeof Package> = { repository: Package, folder: Folder, file: FileCode2, class: Box, function: Braces, test: Search, external: Globe2, database: Database, api: Globe2 };

const ArchitectureNode = memo(({ data, selected }: NodeProps<ViewNode>) => {
  const Icon = icons[data.kind];
  return <div className={`min-w-[150px] rounded-2xl border px-3 py-2 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${kindStyle[data.kind]} ${selected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-darkBg' : ''} ${data.dimmed ? 'opacity-20' : ''}`}>
    <Handle type="target" position={Position.Top} className="!border-0 !bg-transparent" />
    <div className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span className="max-w-[165px] truncate text-sm font-black">{data.label}</span>{data.pinned ? <Pin className="ml-auto h-3 w-3" /> : null}</div>
    {data.file ? <p className="mt-1 max-w-[175px] truncate font-mono text-[10px] opacity-70">{data.file}</p> : null}
    <Handle type="source" position={Position.Bottom} className="!border-0 !bg-transparent" />
  </div>;
});
ArchitectureNode.displayName = 'ArchitectureNode';
const nodeTypes = { architecture: ArchitectureNode };

function typeFor(node: GraphNode): ViewKind {
  if (node.is_test) return 'test';
  const type = node.node_type?.toLowerCase() || 'function';
  return type.includes('class') ? 'class' : type.includes('database') ? 'database' : type.includes('api') ? 'api' : type.includes('external') ? 'external' : 'function';
}
function layout(nodes: ViewNode[], edges: Edge[]) {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 36, marginx: 30, marginy: 30 });
  nodes.forEach((node) => graph.setNode(node.id, { width: 190, height: 64 }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);
  return nodes.map((node) => ({ ...node, position: graph.node(node.id) ? { x: graph.node(node.id).x - 95, y: graph.node(node.id).y - 32 } : node.position }));
}

function createGraph(data: GraphData, expanded: Set<string>, search: string, showTests: boolean): { nodes: ViewNode[]; edges: Edge[] } {
  const repoId = '__repository'; const repository: ViewNode = { id: repoId, type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'Repository', kind: 'repository' } };
  const folders = new Map<string, GraphNode[]>();
  data.nodes.filter((n) => showTests || !n.is_test).forEach((node) => { const file = node.filepath || 'Unresolved'; const folder = file.includes('/') ? file.split('/').slice(0, -1).join('/') || 'root' : 'root'; folders.set(folder, [...(folders.get(folder) || []), node]); });
  const nodes: ViewNode[] = [repository]; const edges: Edge[] = []; const visibleSymbols = new Set<string>();
  folders.forEach((items, folder) => {
    const folderId = `folder:${folder}`; nodes.push({ id: folderId, type: 'architecture', position: { x: 0, y: 0 }, data: { label: folder, kind: 'folder' } }); edges.push({ id: `${repoId}-${folderId}`, source: repoId, target: folderId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } });
    if (!expanded.has(folderId)) return;
    const files = new Map<string, GraphNode[]>();
    items.forEach((node) => { const file = node.filepath || 'Unresolved'; files.set(file, [...(files.get(file) || []), node]); });
    files.forEach((symbols, file) => {
      const fileId = `file:${file}`; nodes.push({ id: fileId, type: 'architecture', position: { x: 0, y: 0 }, data: { label: file.split('/').pop() || file, kind: 'file', file } }); edges.push({ id: `${folderId}-${fileId}`, source: folderId, target: fileId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } });
      if (!expanded.has(fileId)) return;
      symbols.forEach((symbol) => { visibleSymbols.add(symbol.id); nodes.push({ id: symbol.id, type: 'architecture', position: { x: 0, y: 0 }, data: { label: symbol.label || symbol.id, kind: typeFor(symbol), file, source: symbol } }); edges.push({ id: `${fileId}-${symbol.id}`, source: fileId, target: symbol.id, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }); });
    });
  });
  data.edges.filter((edge) => visibleSymbols.has(edge.source) && visibleSymbols.has(edge.target)).forEach((edge, index) => edges.push({ id: `relation:${edge.source}:${edge.target}:${index}`, source: edge.source, target: edge.target, animated: edge.edge_type === 'call', label: edge.edge_type || 'relation', style: { stroke: edge.edge_type === 'import' ? '#38bdf8' : '#8b5cf6', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } }));
  const needle = search.trim().toLowerCase();
  if (needle) nodes.forEach((node) => { node.data.dimmed = !`${node.data.label} ${node.data.file || ''}`.toLowerCase().includes(needle); });
  return { nodes, edges };
}

export function GraphViewer({ search = '', showTests = true }: { search?: string; showTests?: boolean }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['repository-graph'], queryFn: api.getGraph, staleTime: 5 * 60_000 });
  const [expanded, setExpanded] = useState(new Set<string>()); const [selected, setSelected] = useState<ViewNode | null>(null); const [pinned, setPinned] = useState(new Set<string>());
  const selectedCitation = useCodeSageStore((state) => state.selectedCitation);
  const model = useMemo(() => data ? createGraph(data, expanded, search, showTests) : { nodes: [], edges: [] }, [data, expanded, search, showTests]);
  const [nodes, setNodes, onNodesChange] = useNodesState<ViewNode>([]); const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  useEffect(() => { setNodes(layout(model.nodes.map((node) => ({ ...node, data: { ...node.data, pinned: pinned.has(node.id) } })), model.edges)); setEdges(model.edges); }, [model, pinned, setEdges, setNodes]);
  useEffect(() => { if (!selectedCitation || !data) return; const match = data.nodes.find((node) => node.filepath === selectedCitation.filepath); if (!match) return; const folder = (match.filepath || '').split('/').slice(0, -1).join('/') || 'root'; setExpanded((current) => new Set([...current, `folder:${folder}`, `file:${match.filepath}`])); }, [data, selectedCitation]);
  useEffect(() => { if (!selectedCitation) return; const node = nodes.find((candidate) => candidate.data.source?.filepath === selectedCitation.filepath); if (node) setSelected(node); }, [nodes, selectedCitation]);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, []);
  const onNodeClick = useCallback((_: React.MouseEvent, node: ViewNode) => { setSelected(node); if (['folder', 'file'].includes(node.data.kind)) setExpanded((current) => { const next = new Set(current); next.has(node.id) ? next.delete(node.id) : next.add(node.id); return next; }); }, []);
  if (isLoading) return <div className="grid h-full place-items-center rounded-4xl bg-offwhite text-sm font-bold dark:bg-darkCard">Loading repository architecture…</div>;
  if (error) return <div className="grid h-full place-items-center rounded-4xl bg-offwhite p-8 text-center dark:bg-darkCard"><p>Unable to load the repository graph: {error.message}</p></div>;
  return <div className="relative h-full overflow-hidden rounded-4xl border border-white/70 bg-offwhite shadow-xl dark:border-darkBorder dark:bg-darkCard">
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView minZoom={0.1} maxZoom={2} proOptions={{ hideAttribution: true }}>
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} className="opacity-50" /><Controls /><MiniMap zoomable pannable className="!bg-white/80 dark:!bg-darkBg/80" />
    </ReactFlow>
    <div className="absolute left-4 top-4 z-10 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-xs font-semibold shadow-md backdrop-blur dark:border-darkBorder dark:bg-darkBg/85"><ChevronRight className="mr-1 inline h-3 w-3" />Click folders and files to reveal deeper architecture</div>
    {selected ? <aside className="absolute bottom-4 right-4 z-20 w-[min(340px,calc(100%-2rem))] rounded-3xl border border-white/70 bg-white/90 p-5 shadow-2xl backdrop-blur dark:border-darkBorder dark:bg-darkBg/90"><button onClick={() => setSelected(null)} className="absolute right-3 top-3 rounded-full p-2 hover:bg-primary/10" aria-label="Close inspector"><X className="h-4 w-4" /></button><h2 className="pr-8 text-xl font-black">{selected.data.label}</h2><p className="mt-1 font-mono text-xs text-primary">{selected.data.file || selected.data.kind}</p>{selected.data.source?.start_line ? <p className="mt-3 text-sm text-[var(--muted)]">Lines {selected.data.source.start_line}–{selected.data.source.end_line || selected.data.source.start_line}</p> : null}<button onClick={() => setPinned((current) => { const next = new Set(current); next.has(selected.id) ? next.delete(selected.id) : next.add(selected.id); return next; })} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary"><Pin className="h-3 w-3" />{pinned.has(selected.id) ? 'Unpin node' : 'Pin node'}</button></aside> : null}
  </div>;
}
