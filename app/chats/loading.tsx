import { Skeleton } from "@/components/ui/skeleton"

export default function ChatsLoading() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header row */}
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        {/* Search bar */}
        <Skeleton className="h-10 w-full rounded-lg mb-6" />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat list */}
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-border/40 bg-card p-4">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Analysis panel placeholder */}
          <div className="rounded-2xl border border-border/40 bg-card p-8 text-center space-y-3">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-5 w-32 mx-auto" />
            <Skeleton className="h-4 w-52 mx-auto" />
          </div>
        </div>

      </div>
    </div>
  )
}
