export default function StatsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your progress and performance over time.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">
          Complete some workouts to see your stats here.
        </p>
      </div>
    </div>
  );
}
