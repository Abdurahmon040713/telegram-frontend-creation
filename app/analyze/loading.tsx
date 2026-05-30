export default function AnalyzeLoading() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
        <div className="h-8 w-72 rounded-lg bg-muted" />
        <div className="h-4 w-96 rounded-lg bg-muted" />
        <div className="h-10 w-full rounded-xl bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-xl bg-muted" />
            ))}
          </div>
          <div className="rounded-2xl bg-muted h-[480px]" />
        </div>
      </div>
    </div>
  )
}
