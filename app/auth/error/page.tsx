import { Dumbbell, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-sm text-muted-foreground">
      {params?.error
        ? `Error: ${params.error}`
        : "An unexpected error occurred. Please try again."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <Dumbbell size={28} className="text-primary" />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 w-full">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-destructive shrink-0" />
            <p className="text-sm text-destructive text-left">
              If this issue persists, please contact support.
            </p>
          </div>
        </div>
        <Link
          href="/auth/login"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
