import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CoachPage } from "@/components/coach-page";

async function CoachContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;
  const tables = createTables(supabase);
  const [
    { data: programs, error: programsError },
    { data: competitions, error: competitionsError },
    { data: personalBests, error: pbError },
  ] = await Promise.all([
    tables.programs.findByUserId(userId),
    tables.competitions.findByUserId(userId),
    tables.personalBests.findByUserId(userId),
  ]);

  if (programsError) console.error("Failed to load programs:", programsError);
  if (competitionsError) console.error("Failed to load competitions:", competitionsError);
  if (pbError) console.error("Failed to load personal bests:", pbError);

  return (
    <CoachPage
      initialPrograms={programs ?? []}
      initialCompetitions={competitions ?? []}
      initialPersonalBests={personalBests ?? []}
    />
  );
}

function Loading() {
  return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CoachContent />
    </Suspense>
  );
}
