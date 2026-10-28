import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { signOut } from "@/session/session";

// managing-my-list.wireframe.drawio.svg: the screen is headed "My list", with a
// primary Add beside the heading. The list itself arrives in the next commit.
//
// The wireframe shows no sign-out control. One has to exist — "Signing out when
// I am done" is a named scenario — so it sits in the header, which is the only
// chrome the wireframe has.
export function ListScreen() {
  const navigate = useNavigate();

  async function leave() {
    try {
      await signOut();
    } finally {
      await navigate({ to: "/sign-in" });
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My list</h1>

        <Button variant="ghost" onClick={() => void leave()}>
          Sign out
        </Button>
      </header>
    </main>
  );
}
