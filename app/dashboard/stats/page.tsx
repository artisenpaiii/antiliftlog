import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StatsPage } from "@/components/stats-page";

async function StatsContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;
  const tables = createTables(supabase);
  const [{ data: programs, error: programsError }, { data: competitions, error: competitionsError }] = await Promise.all([
    tables.programs.findByUserId(userId),
    tables.competitions.findByUserId(userId),
  ]);

  if (programsError) console.error("Failed to load programs:", programsError);
  if (competitionsError) console.error("Failed to load competitions:", competitionsError);

  return (
    <StatsPage
      initialPrograms={programs ?? []}
      initialCompetitions={competitions ?? []}
    />
  );
}

function Loading() {
  return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <StatsContent />
    </Suspense>
  );
}
