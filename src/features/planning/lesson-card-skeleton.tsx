import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Same footprint as a LessonCard (with or without a footer button), to avoid layout shift. */
export function LessonCardSkeleton({ withAction = false, className }: { withAction?: boolean; className?: string }) {
  return (
    <div className={cn("flex gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5", className)}>
      <Skeleton className="h-18.5 w-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        {/* On mobile the real badge wraps under the title and the address takes two lines. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="h-5 w-40 max-w-full" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="mt-3.5 space-y-2.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-52 max-w-full" />
          <Skeleton className="h-4 w-60 max-w-full" />
          <Skeleton className="h-4 w-28 sm:hidden" />
        </div>
        {withAction && <Skeleton className="mt-4 h-11 w-28 rounded-xl" />}
      </div>
    </div>
  );
}
