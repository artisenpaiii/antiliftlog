"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (invitationCode !== process.env.NEXT_PUBLIC_INV_CODE) {
      setError("Wrong invitation code");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            displayName: username,
            invitation_code: invitationCode,
          },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <div className="flex flex-col items-center gap-3">
        <Dumbbell size={28} className="text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start tracking your training today</p>
      </div>
      <form onSubmit={handleSignUp} className="flex flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="invitation-code">Invitation code</Label>
          <Input
            id="invitation-code"
            type="text"
            placeholder="Enter your invite code"
            required
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" type="text" placeholder="Choose a username" required value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="repeat-password">Confirm password</Label>
          <Input id="repeat-password" type="password" required value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
