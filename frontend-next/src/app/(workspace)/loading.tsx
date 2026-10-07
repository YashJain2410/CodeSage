import { Skeleton } from '@/components/UI';
export default function Loading() {
  return (
    <div className="page-content">
      <Skeleton rows={5} />
    </div>
  );
}
