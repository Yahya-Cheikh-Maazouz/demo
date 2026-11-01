import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

/** Stand-in for an auth form: optional heading, `fields` labelled inputs and the submit button. */
export function FormSkeleton({ fields = 2, heading = false }: { fields?: number; heading?: boolean }) {
  return (
    <div>
      <LoadingLabel />
      {heading && (
        <div className="mb-6 space-y-2.5 sm:mb-8">
          <Skeleton className="h-8 w-52 sm:h-9" />
          <Skeleton className="h-5 w-full max-w-80" />
        </div>
      )}
      <div className="space-y-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="mt-2 h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
