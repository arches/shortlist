import { useEffect, useState } from "react";

import type { PlaceSuggestion } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { usePlaceSuggestions } from "./queries";

interface PlaceSearchProps {
  onPick: (suggestion: PlaceSuggestion | undefined) => void;
  disabled?: boolean;
}

// managing-my-list.wireframe.drawio draws one field and a list of results under
// it: "Google Places Autocomplete Input" over "Google Places Autocomplete
// Results". The owner types, sees suggestions, and picks one.
//
// One field, which is what makes the chosen suggestion belong in it: the
// wireframe draws the field, the results, the note and "Add to list" on one
// form, so picking is no longer the add and the field has to show what was
// picked until the owner presses the button. Typing again starts a fresh
// search, which is the only way back from a wrong pick the wireframe leaves
// room for.
//
// The debounce and the two-character minimum are assumptions — the wireframe
// draws neither. See ASSUMPTIONS.md, "When autocomplete asks Google".
const DEBOUNCE_MS = 250;

export function PlaceSearch({ onPick, disabled = false }: PlaceSearchProps) {
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<PlaceSuggestion | undefined>();

  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed), DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [typed]);

  // Nothing is asked of Google while a suggestion stands chosen. The field now
  // holds the description that was picked, and searching for it again would be
  // a Place Details call ADR 0001 says we pay for, to re-offer what the owner
  // has already settled on.
  const { data: suggestions, isFetching, error } = usePlaceSuggestions(chosen ? "" : query);

  function choose(suggestion: PlaceSuggestion) {
    setChosen(suggestion);
    setTyped(suggestion.description);
    onPick(suggestion);
  }

  // Retyping unpicks. The owner is searching again, so there is nothing chosen
  // for "Add to list" to add until they pick once more.
  function retype(text: string) {
    setChosen(undefined);
    setTyped(text);
    onPick(undefined);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="place-search">Name *</Label>

      <Input
        id="place-search"
        name="place-search"
        autoComplete="off"
        placeholder="Start typing a restaurant's name"
        value={typed}
        disabled={disabled}
        onChange={(event) => retype(event.target.value)}
      />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      {isFetching && !chosen && (
        <p className="text-muted-foreground text-sm">Looking…</p>
      )}

      {suggestions && suggestions.length === 0 && !isFetching && !chosen && (
        <p className="text-muted-foreground text-sm">No matches.</p>
      )}

      {!chosen && suggestions && suggestions.length > 0 && (
        <ul className="flex max-h-64 flex-col overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li key={suggestion.google_place_id}>
              <button
                type="button"
                disabled={disabled}
                className="hover:bg-accent w-full rounded px-2 py-2 text-left text-sm"
                onClick={() => choose(suggestion)}
              >
                {suggestion.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
