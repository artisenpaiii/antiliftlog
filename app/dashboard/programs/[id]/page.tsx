import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProgramDetail } from "@/components/program-detail";

async function ProgramDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const tables = createTables(supabase);
  const { data: program } = await tables.programs.findById(id);

  if (!program) {
    redirect("/dashboard/programs");
  }

  const { data: blocks } = await tables.blocks.findByProgramId(id);

  return <ProgramDetail program={program} initialBlocks={blocks ?? []} />;
}

export default function ProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <ProgramDetailContent params={params} />
    </Suspense>
  );
}
