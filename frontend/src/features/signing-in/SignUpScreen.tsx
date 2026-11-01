import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/session/session";

interface SignUpScreenProps {
  onSignedUp: () => void;
}

// signing-in.scenarios.md, "Signing up": a name, an address and a password, and
// the list opens without the new owner being asked to sign in. There is no
// wireframe, so this is the sign-in form with one more field, deliberately —
// the two sit next to each other and an owner moves between them by a link.
//
// Verifying an email address is out of scope: Shortlist sends no email, and the
// address is a sign-in identifier it never has to trust.
export function SignUpScreen({ onSignedUp }: SignUpScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [refusals, setRefusals] = useState<string[]>([]);
  const [signingUp, setSigningUp] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setRefusals([]);
    setSigningUp(true);

    try {
      await signUp(name, email, password);
      onSignedUp();
    } catch (thrown) {
      setRefusals(refusalsFrom(thrown));
    } finally {
      setSigningUp(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Shortlist</h1>

      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {/*
          "Then I am told what to fix" — every message, not the first one, so a
          form with three things wrong is not corrected three submissions at a
          time. "I am told that address already has an account" arrives through
          the same list, because what the owner does about either is retype a
          field.
        */}
        {refusals.length > 0 && (
          <div role="alert" className="text-destructive flex flex-col gap-1 text-sm">
            {refusals.map((refusal) => (
              <p key={refusal}>{refusal}</p>
            ))}
          </div>
        )}

        <Button type="submit" disabled={signingUp}>
          {signingUp ? "Signing up…" : "Sign up"}
        </Button>
      </form>

      {/*
        "And I am invited to sign in instead." The invitation is here rather
        than in the refusal: an owner whose address already has an account needs
        somewhere to go, and this is where they go.
      */}
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link to="/sign-in" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}

// A refusal that has something to say per attribute is read out in full. One
// that does not — a network failure, say — has only its message.
function refusalsFrom(thrown: unknown): string[] {
  if (thrown instanceof ApiError) {
    const perAttribute = Object.values(thrown.attributeErrors).flat();
    if (perAttribute.length > 0) return perAttribute;
  }

  return [thrown instanceof Error ? thrown.message : "That did not work."];
}
