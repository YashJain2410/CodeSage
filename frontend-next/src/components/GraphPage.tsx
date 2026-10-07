'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from './UI';
const GraphViewer = dynamic(() => import('./GraphViewer'), {
  ssr: false,
  loading: () => (
    <div className="page-content">
      <Skeleton rows={8} />
    </div>
  ),
});
export default function GraphPage() {
  return <GraphViewer />;
}
