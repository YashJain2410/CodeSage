'use client';
import { useEffect, useRef } from 'react';
export default function AnimatedBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0,
      h = 0,
      frame = 0,
      last = 0;
    const nodes = Array.from({ length: 18 }, (_, i) => ({
      x: (i * 0.173) % 1,
      y: (i * 0.317) % 1,
      phase: i * 1.7,
    }));
    const resize = () => {
      const d = Math.min(window.devicePixelRatio, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * d;
      canvas.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    function draw(t: number) {
      if (!ctx) return;
      if (t - last > 32) {
        last = t;
        ctx.clearRect(0, 0, w, h);
        const points = nodes.map((n) => ({
          x: n.x * w + Math.sin(t * 0.00006 + n.phase) * 16,
          y: n.y * h + Math.cos(t * 0.00004 + n.phase) * 13,
        }));
        points.forEach((p, i) => {
          points.slice(i + 1).forEach((q) => {
            const dist = Math.hypot(p.x - q.x, p.y - q.y);
            if (dist < 220) {
              ctx.strokeStyle = `rgba(184,169,224,${0.075 * (1 - dist / 220)})`;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          });
          ctx.fillStyle = 'rgba(184,169,224,.16)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      if (!reduced) frame = requestAnimationFrame(draw);
    }
    draw(0);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="ambient-graph" aria-hidden="true" />;
}
