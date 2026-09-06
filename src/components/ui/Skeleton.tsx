export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`ff-skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="ff-card space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-1.5 w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
