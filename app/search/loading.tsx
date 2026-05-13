import { Skeleton } from "@/components/ui/skeleton"

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Search form */}
        <div className="rounded-2xl border border-border/40 bg-card p-6 mb-6 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>

        {/* Result skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
