import { cn } from '@/shared/utils/cn.js';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('shimmer rounded-md bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function PostSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      {/* Author row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      {/* Media placeholder */}
      <Skeleton className="h-48 w-full rounded-xl" />
      {/* Actions */}
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function StoryRingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-2.5 w-10" />
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="flex items-end gap-4 -mt-12 px-4">
        <Skeleton className="h-24 w-24 rounded-full ring-4 ring-background" />
        <div className="flex-1 space-y-2 mb-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
