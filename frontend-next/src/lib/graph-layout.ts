import dagre from 'dagre';
import type { GraphData } from './types';
export const nodeColors = [
  '#7C65C1',
  '#B87726',
  '#218665',
  '#C45663',
  '#487CBD',
  '#AC5B90',
  '#338E91',
  '#BB7642',
  '#8B5CF6',
  '#42899F',
];
export function fileColor(file: string) {
  return nodeColors[
    Array.from(file).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0) % nodeColors.length
  ];
}
export function layoutGraph(graph: GraphData, layout: string) {
  if (layout === 'hierarchical') {
    const g = new dagre.graphlib.Graph({ multigraph: true });
    g.setGraph({ rankdir: 'LR', nodesep: 34, ranksep: 100, marginx: 60, marginy: 60 });
    g.setDefaultEdgeLabel(() => ({}));
    graph.nodes.forEach((n) => g.setNode(n.id, { width: 185, height: 64 }));
    graph.edges.forEach((e, i) => g.setEdge(e.source, e.target, {}, String(i)));
    dagre.layout(g);
    return new Map(
      graph.nodes.map((n) => {
        const p = g.node(n.id);
        return [n.id, { x: p.x - 92, y: p.y - 32 }];
      }),
    );
  }
  const points = graph.nodes.map((n, i) => ({
    id: n.id,
    x: Math.cos(i * 2.399) * Math.sqrt(i + 1) * 100,
    y: Math.sin(i * 2.399) * Math.sqrt(i + 1) * 100,
  }));
  const lookup = new Map(points.map((p) => [p.id, p]));
  for (let k = 0; k < 70; k++) {
    const force = points.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x,
          dy = points[i].y - points[j].y,
          d = Math.max(Math.hypot(dx, dy), 1),
          repel = 15000 / (d * d);
        force[i].x += (dx / d) * repel;
        force[i].y += (dy / d) * repel;
        force[j].x -= (dx / d) * repel;
        force[j].y -= (dy / d) * repel;
      }
    for (const e of graph.edges) {
      const a = lookup.get(e.source),
        b = lookup.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.max(Math.hypot(dx, dy), 1),
        pull = (d - 260) * 0.02;
      const i = points.indexOf(a),
        j = points.indexOf(b);
      force[i].x += (dx / d) * pull;
      force[i].y += (dy / d) * pull;
      force[j].x -= (dx / d) * pull;
      force[j].y -= (dy / d) * pull;
    }
    points.forEach((p, i) => {
      p.x += Math.max(-20, Math.min(20, force[i].x));
      p.y += Math.max(-20, Math.min(20, force[i].y));
    });
  }
  return new Map(points.map((p) => [p.id, { x: p.x, y: p.y }]));
}
