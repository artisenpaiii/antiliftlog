import { Dumbbell, Mail } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <Dumbbell size={28} className="text-primary" />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent you a confirmation link. Please check your inbox to
            verify your account.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/50 p-4 w-full">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground text-left">
              Didn&apos;t receive an email? Check your spam folder or try signing
              up again.
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
