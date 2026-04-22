import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AthletesView } from "@/components/athletes-view";

async function AthletesContent() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const tables = createTables(supabase);
  const { data: athletes } = await tables.coachAthletes.findAthletes(user.id);

  if (!athletes?.length) {
    redirect("/dashboard/profile");
  }

  return <AthletesView initialAthletes={athletes} />;
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      Loading…
    </div>
  );
}

export default function AthletesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AthletesContent />
    </Suspense>
  );
}
