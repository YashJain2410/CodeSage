import type { GraphData } from './types';
import { fileColor } from './graph-layout';
export function exportGraphPNG(
  graph: GraphData,
  positions: Map<string, { x: number; y: number }>,
  name: string,
) {
  if (!graph.nodes.length) return;
  const points = Array.from(positions.values());
  const minX = Math.min(...points.map((p) => p.x)) - 50,
    minY = Math.min(...points.map((p) => p.y)) - 50,
    maxX = Math.max(...points.map((p) => p.x)) + 235,
    maxY = Math.max(...points.map((p) => p.y)) + 114;
  const scale = Math.min(2, 8192 / (maxX - minX), 8192 / (maxY - minY));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((maxX - minX) * scale);
  canvas.height = Math.ceil((maxY - minY) * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#f8f7fb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);
  ctx.strokeStyle = '#aca0bf';
  ctx.lineWidth = 1.2;
  graph.edges.forEach((e) => {
    const a = positions.get(e.source),
      b = positions.get(e.target);
    if (!a || !b) return;
    ctx.beginPath();
    ctx.moveTo(a.x + 185, a.y + 32);
    ctx.bezierCurveTo(a.x + 230, a.y + 32, b.x - 50, b.y + 32, b.x, b.y + 32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + 32);
    ctx.lineTo(b.x - 6, b.y + 28);
    ctx.lineTo(b.x - 6, b.y + 36);
    ctx.closePath();
    ctx.fillStyle = '#aca0bf';
    ctx.fill();
  });
  graph.nodes.forEach((n) => {
    const p = positions.get(n.id)!;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#e1dbe9';
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, 185, 64, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fileColor(n.file);
    ctx.beginPath();
    ctx.arc(p.x + 17, p.y + 26, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#282331';
    ctx.font = '11px monospace';
    ctx.fillText(n.label.length > 23 ? n.label.slice(0, 22) + '…' : n.label, p.x + 29, p.y + 28);
    ctx.fillStyle = '#70697c';
    ctx.font = '9px monospace';
    ctx.fillText((n.file.split('/').pop() || 'External').slice(0, 26), p.x + 29, p.y + 45);
  });
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-graph.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
