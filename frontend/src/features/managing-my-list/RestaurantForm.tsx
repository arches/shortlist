import { useState, type FormEvent } from "react";

import type { Restaurant, RestaurantDraft } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface RestaurantField {
  name: keyof RestaurantDraft;
  label: string;
  required?: boolean;
  placeholder?: string;
  multiline?: boolean;
}

// Everything an owner can set, from shortlist.data.md's Restaurant attribute
// table. The six address fields are separate, as the data model has them — the
// one-line address in the scenario is shorthand and nothing parses it.
//
// Which of these a dialog shows is the dialog's own decision, because
// managing-my-list.wireframe.drawio.svg draws one field set for adding and
// another for editing. So the set arrives as a prop rather than being fixed
// here, and this constant is only the widest one.
export const ALL_FIELDS = [
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
  { name: "notes", label: "Notes", multiline: true },
] as const satisfies readonly RestaurantField[];

export interface RestaurantFormProps {
  fields: readonly RestaurantField[];
  restaurant?: Restaurant | undefined;
  submitLabel: string;
  attributeErrors?: Record<string, string[]>;
  pending?: boolean;
  onSubmit: (draft: RestaurantDraft) => void;
  onCancel: () => void;
}

function initialValues(
  fields: readonly RestaurantField[],
  restaurant: Restaurant | undefined,
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const field of fields) {
    values[field.name] = restaurant?.[field.name] ?? "";
  }

  return values;
}

// Clearing a detail is a distinct act from leaving it alone, and both have to be
// sayable — otherwise a note written by mistake can never be taken back. An
// emptied field is sent as null, which is how the API hears "clear this".
function draftFrom(
  fields: readonly RestaurantField[],
  values: Record<string, string>,
): RestaurantDraft {
  const draft: Record<string, string | null> = {};

  for (const field of fields) {
    const value = (values[field.name] ?? "").trim();
    draft[field.name] = value.length > 0 ? value : null;
  }

  return draft as RestaurantDraft;
}

export function RestaurantForm({
  fields,
  restaurant,
  submitLabel,
  attributeErrors = {},
  pending = false,
  onSubmit,
  onCancel,
}: RestaurantFormProps) {
  const [values, setValues] = useState(() => initialValues(fields, restaurant));

  function set(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(draftFrom(fields, values));
  }

  // The wireframe puts a small clear affordance on a filled field. Clearing has
  // to be reachable, and emptying the input is what says it.
  function clearButtonFor(name: keyof RestaurantDraft) {
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
        {fields.map((field) => (
          <div key={field.name} className="relative flex flex-col gap-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required ? " *" : ""}
            </Label>

            {field.multiline ? (
              <Textarea
                id={field.name}
                name={field.name}
                value={values[field.name] ?? ""}
                onChange={(event) => set(field.name, event.target.value)}
              />
            ) : (
              <Input
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                value={values[field.name] ?? ""}
                onChange={(event) => set(field.name, event.target.value)}
              />
            )}

            {clearButtonFor(field.name)}

            {attributeErrors[field.name]?.map((message) => (
              <p key={message} role="alert" className="text-destructive text-sm">
                {message}
              </p>
            ))}
          </div>
        ))}
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
