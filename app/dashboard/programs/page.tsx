import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProgramList } from "@/components/program-list";

async function ProgramsContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const tables = createTables(supabase);
  const { data: programs } = await tables.programs.findMine();

  return <ProgramList programs={programs ?? []} />;
}

function Loading() {
  return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>;
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProgramsContent />
    </Suspense>
  );
}
