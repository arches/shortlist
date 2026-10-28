import { useState, type FormEvent } from "react";

import type { Restaurant, RestaurantDraft } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// managing-my-list.wireframe.drawio.svg draws Name, Cuisine, Website and Notes.
// It is read as illustrative rather than exhaustive, because "Adding a
// restaurant with everything I know about it" requires an address and a
// specialty to be settable and that scenario would otherwise be unreachable.
// The six address fields are separate, as shortlist.data.md has them — the
// one-line address in the scenario is shorthand and nothing parses it.
const FIELDS = [
  { name: "name", label: "Name", required: true },
  { name: "cuisine", label: "Cuisine" },
  { name: "specialty", label: "Specialty" },
  { name: "url", label: "Website", placeholder: "https://…" },
  { name: "google_maps_url", label: "Google Maps", placeholder: "https://…" },
  { name: "yelp_url", label: "Yelp", placeholder: "https://…" },
  { name: "address_line_1", label: "Address line 1" },
  { name: "address_line_2", label: "Address line 2" },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "postal_code", label: "Postal code" },
  { name: "country", label: "Country" },
] as const satisfies readonly {
  name: keyof RestaurantDraft;
  label: string;
  required?: boolean;
  placeholder?: string;
}[];

type FieldName = (typeof FIELDS)[number]["name"];

export interface RestaurantFormProps {
  restaurant?: Restaurant | undefined;
  submitLabel: string;
  attributeErrors?: Record<string, string[]>;
  pending?: boolean;
  onSubmit: (draft: RestaurantDraft) => void;
  onCancel: () => void;
}

function initialValues(restaurant: Restaurant | undefined): Record<string, string> {
  const values: Record<string, string> = { notes: restaurant?.notes ?? "" };

  for (const field of FIELDS) {
    values[field.name] = restaurant?.[field.name] ?? "";
  }

  return values;
}

// Clearing a detail is a distinct act from leaving it alone, and both have to be
// sayable — otherwise a note written by mistake can never be taken back. An
// emptied field is sent as null, which is how the API hears "clear this".
function draftFrom(values: Record<string, string>): RestaurantDraft {
  const draft: Record<string, string | null> = {};

  for (const key of [...FIELDS.map((field) => field.name), "notes" as const]) {
    const value = (values[key] ?? "").trim();
    draft[key] = value.length > 0 ? value : null;
  }

  return draft as RestaurantDraft;
}

export function RestaurantForm({
  restaurant,
  submitLabel,
  attributeErrors = {},
  pending = false,
  onSubmit,
  onCancel,
}: RestaurantFormProps) {
  const [values, setValues] = useState(() => initialValues(restaurant));

  function set(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(draftFrom(values));
  }

  // The wireframe puts a small clear affordance on a filled field. Clearing has
  // to be reachable, and emptying the input is what says it.
  function clearButtonFor(name: FieldName | "notes") {
    if ((values[name] ?? "").length === 0) return null;

    return (
      <button
        type="button"
        aria-label={`Clear ${name.replace(/_/g, " ")}`}
        className="text-muted-foreground hover:text-foreground absolute top-1 right-2 text-sm"
        onClick={() => set(name, "")}
      >
        ×
      </button>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {FIELDS.map((field) => (
          <div key={field.name} className="relative flex flex-col gap-2">
            <Label htmlFor={field.name}>
              {field.label}
              {"required" in field && field.required ? " *" : ""}
            </Label>

            <Input
              id={field.name}
              name={field.name}
              placeholder={"placeholder" in field ? field.placeholder : undefined}
              value={values[field.name] ?? ""}
              onChange={(event) => set(field.name, event.target.value)}
            />

            {clearButtonFor(field.name)}

            {attributeErrors[field.name]?.map((message) => (
              <p key={message} role="alert" className="text-destructive text-sm">
                {message}
              </p>
            ))}
          </div>
        ))}

        <div className="relative flex flex-col gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            value={values.notes ?? ""}
            onChange={(event) => set("notes", event.target.value)}
          />
          {clearButtonFor("notes")}
          {attributeErrors.notes?.map((message) => (
            <p key={message} role="alert" className="text-destructive text-sm">
              {message}
            </p>
          ))}
        </div>
      </div>

      {attributeErrors.base?.map((message) => (
        <p key={message} role="alert" className="text-destructive text-sm">
          {message}
        </p>
      ))}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
