import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/session/session";

interface SignInScreenProps {
  onSignedIn: () => void;
}

// signing-in.scenarios.md has no wireframe, so this is the plainest form that
// serves its scenarios: an address, a password, and one refusal that says
// nothing about which of the two was wrong.
//
// Recovering a forgotten password is deliberately absent. Shortlist sends no
// email, so there is nothing to send — an administrator sets a new one by hand.
export function SignInScreen({ onSignedIn }: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [refusal, setRefusal] = useState<string | undefined>();
  const [signingIn, setSigningIn] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setRefusal(undefined);
    setSigningIn(true);

    try {
      await signIn(email, password);
      onSignedIn();
    } catch (thrown) {
      // Whatever the cause, the owner is told the same thing. The API produces
      // one wording for all three; this shows it rather than interpreting it.
      setRefusal(thrown instanceof Error ? thrown.message : "The email or password is wrong.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Shortlist</h1>

      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {refusal !== undefined && (
          <p role="alert" className="text-destructive text-sm">
            {refusal}
          </p>
        )}

        <Button type="submit" disabled={signingIn}>
          {signingIn ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
