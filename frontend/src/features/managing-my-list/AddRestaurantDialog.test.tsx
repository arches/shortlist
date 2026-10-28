import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetSession, rememberSession } from "@/session/store";
import { invalid, requestAt, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import { aRestaurant, openDialog, pressInDialog, typeInto } from "./testing";

import type { Mock } from "vitest";

// Derived from managing-my-list.scenarios.md and the Add dialog in
// managing-my-list.wireframe.drawio.svg.
async function openTheDialog() {
  renderApp("/");
  await screen.findByRole("heading", { name: "My list" });
  await openDialog("Add", "Add a restaurant");
}

const type = typeInto;
const submit = () => pressInDialog("Add");

describe("adding a restaurant", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
    rememberSession({ access_token: "access-one", refresh_token: "refresh-one", expires_in: 900 });
    fetchMock.mockResolvedValue(respond(200, []));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: Adding a restaurant I have only heard the name of
  it("puts a restaurant on the list with only a name", async () => {
    await openTheDialog();
    await type("Name *", "Lilia");

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Lilia" })));
    await submit();

    await waitFor(() => {
      expect(requestAt(fetchMock, 1).path).toBe("/api/restaurants");
    });
    expect(requestAt(fetchMock, 1).body).toMatchObject({ restaurant: { name: "Lilia" } });
  });

  // Scenario: Adding a restaurant with everything I know about it. The wireframe
  // draws four fields; this scenario needs an address and a specialty, so the
  // form carries the whole attribute table.
  it("accepts everything an owner knows about it", async () => {
    await openTheDialog();
    await type("Name *", "Tacos El Bronco");
    await type("Cuisine", "Mexican");
    await type("Specialty", "Suadero tacos");
    await type("Address line 1", "4324 4th Ave");
    await type("City", "Brooklyn");
    await type("State", "NY");
    await type("Postal code", "11232");
    await type("Website", "https://tacoselbronco.com");
    await type("Notes", "Cash only, closes early");

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Tacos El Bronco" })));
    await submit();

    await waitFor(() => {
      expect(requestAt(fetchMock, 1).body).toMatchObject({
        restaurant: {
          name: "Tacos El Bronco",
          cuisine: "Mexican",
          specialty: "Suadero tacos",
          address_line_1: "4324 4th Ave",
          city: "Brooklyn",
          state: "NY",
          postal_code: "11232",
          url: "https://tacoselbronco.com",
          notes: "Cash only, closes early",
        },
      });
    });
  });

  it("sends nothing for the fields left empty", async () => {
    await openTheDialog();
    await type("Name *", "Lilia");

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Lilia" })));
    await submit();

    await waitFor(() => {
      const sent = requestAt(fetchMock, 1).body as { restaurant: Record<string, unknown> };
      expect(sent.restaurant.cuisine).toBeNull();
      expect(sent.restaurant.city).toBeNull();
    });
  });

  // Scenario: Adding a restaurant that is already on my list — "Then it is
  // rejected as already on my list".
  it("reports a name already on the list, and says nothing about the one there", async () => {
    await openTheDialog();
    await type("Name *", "Joe's Pizza");

    fetchMock.mockResolvedValueOnce(invalid({ name: ["Name is already on your list"] }));
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is already on your list");
    expect(screen.getByRole("heading", { name: "Add a restaurant" })).toBeInTheDocument();
  });

  // Scenario: Adding a restaurant with no name
  it("reports a name that is only whitespace", async () => {
    await openTheDialog();
    await type("Name *", "   ");

    fetchMock.mockResolvedValueOnce(invalid({ name: ["Name can't be blank"] }));
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Name can't be blank");
  });

  // Scenario Outline: Giving a restaurant a link that is not a web address
  it.each([
    ["javascript:alert(1)"],
    ["data:text/html,<h1>hi</h1>"],
    ["mailto:hi@lilianewyork.com"],
  ])("reports %s as not a web address", async (link) => {
    await openTheDialog();
    await type("Name *", "Lilia");
    await type("Website", link);

    fetchMock.mockResolvedValueOnce(
      invalid({ url: ["Url must be a web address beginning http:// or https://"] }),
    );
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("must be a web address");
  });

  it("closes once the restaurant is on the list", async () => {
    await openTheDialog();
    await type("Name *", "Lilia");

    fetchMock.mockResolvedValueOnce(respond(201, aRestaurant({ name: "Lilia" })));
    await submit();

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add a restaurant" })).not.toBeInTheDocument();
    });
  });

  it("adds nothing when cancelled", async () => {
    await openTheDialog();
    await type("Name *", "Lilia");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add a restaurant" })).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls).toHaveLength(1);
  });
});
