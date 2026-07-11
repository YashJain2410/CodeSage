'use client';

import { useEffect, useRef } from 'react';

const palette = ['#7C65C1', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4'];
const labels = ['parseRepo', 'rankFiles', 'embedCode', 'findCaller', 'traceAuth', 'loadGraph', 'scoreHit', 'runEval', 'streamAnswer', 'readAst'];

interface NodePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animation = 0;
    let nodes: NodePoint[] = [];

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      nodes = Array.from({ length: 18 }, (_, index) => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: 4 + Math.random() * 6,
        color: palette[index % palette.length],
        label: labels[index % labels.length]
      }));
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);

      nodes.forEach((node, index) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 20 || node.x > width - 20) node.vx *= -1;
        if (node.y < 20 || node.y > height - 20) node.vy *= -1;

        for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
          const other = nodes[otherIndex];
          const distance = Math.hypot(node.x - other.x, node.y - other.y);
          if (distance < 200) {
            ctx.strokeStyle = `rgba(184, 169, 224, ${0.17 - distance / 1600})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }

        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 5);
        glow.addColorStop(0, `${node.color}88`);
        glow.addColorStop(1, `${node.color}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(248,247,255,0.58)';
        ctx.fillText(node.label, node.x + node.radius + 8, node.y + 4);
      });

      animation = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
