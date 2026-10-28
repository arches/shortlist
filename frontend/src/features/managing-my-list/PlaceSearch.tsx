import { useEffect, useState } from "react";

import type { PlaceSuggestion } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { usePlaceSuggestions } from "./queries";

interface PlaceSearchProps {
  onPick: (suggestion: PlaceSuggestion) => void;
  disabled?: boolean;
}

// managing-my-list.wireframe.drawio draws one field and a list of results under
// it: "Google Places Autocomplete Input" over "Google Places Autocomplete
// Results". The owner types, sees suggestions, and picks one.
//
// The debounce and the two-character minimum are assumptions — the wireframe
// draws neither. See ASSUMPTIONS.md, "When autocomplete asks Google".
const DEBOUNCE_MS = 250;

export function PlaceSearch({ onPick, disabled = false }: PlaceSearchProps) {
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed), DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [typed]);

  const { data: suggestions, isFetching, error } = usePlaceSuggestions(query);

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
        onChange={(event) => setTyped(event.target.value)}
      />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      {isFetching && (
        <p className="text-muted-foreground text-sm">Looking…</p>
      )}

      {suggestions && suggestions.length === 0 && !isFetching && (
        <p className="text-muted-foreground text-sm">No matches.</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <ul className="flex max-h-64 flex-col overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li key={suggestion.google_place_id}>
              <button
                type="button"
                disabled={disabled}
                className="hover:bg-accent w-full rounded px-2 py-2 text-left text-sm"
                onClick={() => onPick(suggestion)}
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
