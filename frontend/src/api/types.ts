// The shape the API sends back, from shortlist.data.md's Restaurant attribute
// table plus its three derived values. removed_at is absent on purpose: it never
// leaves the system in any response.
export interface Restaurant {
  id: number;
  user_id: number;
  name: string;
  url: string | null;
  google_maps_url: string | null;
  yelp_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  cuisine: string | null;
  specialty: string | null;
  notes: string | null;
  added_at: string;
  updated_at: string;

  // Derived, not stored. Visited is the experience count being above zero.
  visited: boolean;
  experience_count: number;
  last_experienced_on: string | null;
}

// Everything an owner can set. The six address fields are separate, as the data
// model has them — the one-line address in the scenario is shorthand.
export type RestaurantDraft = Partial<
  Pick<
    Restaurant,
    | "name"
    | "url"
    | "google_maps_url"
    | "yelp_url"
    | "address_line_1"
    | "address_line_2"
    | "city"
    | "state"
    | "postal_code"
    | "country"
    | "cuisine"
    | "specialty"
    | "notes"
  >
>;

// signing-in.scenarios.md: signing in returns two things, and renewal returns a
// fresh pair of both.
export interface IssuedSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Re-exported so callers that only ever go through the session wrapper do not
// have to reach into the client module.
export type { RequestOptions } from "./client";
