import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Restaurant } from "@/api/types";

// A Restaurant as the API sends one, with every attribute at its absent value
// so a test states only what it is about.
export function aRestaurant(attributes: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 1,
    google_place_id: "ChIJrTLr-GyuEmsRBfy61i59si0",
    name: "Lilia",
    url: null,
    google_maps_url: null,
    yelp_url: null,
    address_line_1: null,
    address_line_2: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    cuisine: null,
    specialty: null,
    notes: null,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    visited: false,
    experience_count: 0,
    last_experienced_on: null,
    ...attributes,
  };
}

// Driving the two dialogs from the outside: open one, fill a field, press a
// button inside it. Shared so the Add and Edit suites read the same way.

export async function openDialog(trigger: string, heading: string): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: trigger }));
  await screen.findByRole("heading", { name: heading });
}

export async function typeInto(label: string, value: string): Promise<void> {
  await userEvent.type(screen.getByLabelText(label), value);
}

export async function clearField(label: string): Promise<void> {
  await userEvent.clear(screen.getByLabelText(label));
}

// The two forms the dialogs take: the Add and Edit forms are dialogs, the
// removal confirmation is an alertdialog.
export async function pressInDialog(name: string): Promise<void> {
  const dialog = screen.queryByRole("dialog") ?? screen.getByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name }));
}
