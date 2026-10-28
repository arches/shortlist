# 0001. Use Google Place ID as Unique Identifier

## Status: Accepted

## Date: 2026-10-28

## Context

There's a variety of information about a restaurant. A user probably learns about it starting with its name, but details like address, cuisine, and price quickly follow.

Those details are all helpful in selecting a restaurant to try next, but collecting those details is potentially difficult (or at least requires a number of steps).

At the same time, restaurants need to be uniquely identified within a list, and ultimately we'll want some collaboration features that require deduping across lists.

## Decision

We will use Google Place ID as the unique identifier of a restaurant.

## Options considered

The other option was internal definitions: storing our own information as canonical.

The downsides of this approach are that we have to manage all the details ourselves, both in terms of the systems we build and the user experience.
We and the users both end up having to do a fair bit more work.

## Consequences

Using the Google Place ID will help us retrieve relevant details about the restaurant, and gives us a clear deduplication within and across lists.

We lose the ability to record a restaurant that isn't on Google.
We may make it somewhat more difficult to enter our own data on top of Google's data, e.g. perhaps we have a different idea of the cuisine.
We gain convenience and certainty at the expense of flexibility.
In short, we lose canonical control.

We also have to pay eventually. The API has a 10k-query free tier, but autocomplete will probably eat up a bunch of it.

<!-- alloy: adr -->
