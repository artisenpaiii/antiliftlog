import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CompetitionsPage } from "@/components/competitions-page";

async function CompetitionsContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;
  const tables = createTables(supabase);
  const { data: competitions } = await tables.competitions.findByUserId(userId);

  return <CompetitionsPage initialCompetitions={competitions ?? []} />;
}

function Loading() {
  return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CompetitionsContent />
    </Suspense>
  );
}
