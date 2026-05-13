import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Avatar */}
        <div className="text-center space-y-3">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-7 w-24 mx-auto" />
          <Skeleton className="h-4 w-28 mx-auto" />
        </div>

        {/* Account card */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="px-5 py-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <Skeleton className="h-4 w-32" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/40 last:border-0">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Session cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card p-5 flex gap-3">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>

        {/* Logout button */}
        <Skeleton className="h-10 w-full rounded-lg" />

      </div>
    </div>
  )
}
