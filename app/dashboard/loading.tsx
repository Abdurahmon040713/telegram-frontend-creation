import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card p-5 border-l-4 border-l-border/40 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent analyses */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
