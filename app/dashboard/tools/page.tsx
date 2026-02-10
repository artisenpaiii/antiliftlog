import { createClient } from "@/lib/supabase/server";
import { ToolsPage } from "@/components/tools-page";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { UserMetadata } from "@/lib/types/database";

async function ToolsContent() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const meta = user.user_metadata ?? {};
  const initialMetadata: UserMetadata = {
    display_name: typeof meta.display_name === "string" ? meta.display_name : "",
    pb_squat_gym: typeof meta.pb_squat_gym === "number" ? meta.pb_squat_gym : null,
    pb_bench_gym: typeof meta.pb_bench_gym === "number" ? meta.pb_bench_gym : null,
    pb_deadlift_gym: typeof meta.pb_deadlift_gym === "number" ? meta.pb_deadlift_gym : null,
    pb_squat_comp: typeof meta.pb_squat_comp === "number" ? meta.pb_squat_comp : null,
    pb_bench_comp: typeof meta.pb_bench_comp === "number" ? meta.pb_bench_comp : null,
    pb_deadlift_comp: typeof meta.pb_deadlift_comp === "number" ? meta.pb_deadlift_comp : null,
  };

  return <ToolsPage initialMetadata={initialMetadata} />;
}

export default function ToolsPageRoute() {
  return (
    <Suspense>
      <ToolsContent />
    </Suspense>
  );
}
