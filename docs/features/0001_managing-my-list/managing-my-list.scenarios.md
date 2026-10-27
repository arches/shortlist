# Feature: Managing my list

**Goal:** Keep my list accurate — put a restaurant on it when I hear about one, fill in or correct what I know about it, and take one off when I am no longer interested.

**Actor:** The list owner — the signed-in owner of a private list. There is no other role; lists are not shared.

**Status:** draft.

A restaurant needs a name and nothing else. Every other detail is optional, because the usual way a restaurant arrives is as a name somebody mentioned.

Names are unique per user, which is what lets `recording-an-experience.scenarios.md` treat a name as a way to identify a restaurant. So the paths that end differently here are mostly the ones where a name collides, and the one where a restaurant with history is taken off the list.

Background:

```gherkin
Given I am signed in as the owner of my list
```

## Main path

```gherkin
Scenario: Adding a restaurant I have only heard the name of
  Given nothing named "Lilia" is on my list
  When I add "Lilia" to my list
  Then "Lilia" appears on my list
  And it does not read as visited
  And it has no experiences
```

## Alternate paths

```gherkin
Scenario: Adding a restaurant with everything I know about it
  Given nothing named "Tacos El Bronco" is on my list
  When I add "Tacos El Bronco" with cuisine "Mexican", specialty "Suadero tacos", address "4324 4th Ave, Brooklyn, NY 11232", site "https://tacoselbronco.com" and the note "Cash only, closes early"
  Then "Tacos El Bronco" appears on my list with all of those details
  And it does not read as visited
```

```gherkin
Scenario: Filling in a detail later
  Given "Lilia" is on my list with no cuisine and no address
  When I set its cuisine to "Italian"
  Then "Lilia" shows a cuisine of "Italian"
  And it still has no address
```

Changing one detail leaves the others alone. This is the path that rules out having to restate a whole restaurant to correct one field of it.

```gherkin
Scenario: Clearing a detail
  Given "Lilia" is on my list with the note "Book a month ahead"
  When I clear its note
  Then "Lilia" shows no note
```

Clearing is a distinct act from leaving a field alone, and both have to be sayable — otherwise a note written by mistake can never be taken back.

```gherkin
Scenario: Correcting a restaurant's name
  Given "Bar Primi" is on my list
  And nothing named "Bar Primi Soho" is on my list
  When I rename it to "Bar Primi Soho"
  Then "Bar Primi Soho" appears on my list
  And nothing named "Bar Primi" is on my list
  And its experiences are unchanged
```

A rename moves the restaurant and its history together; it does not create a second entry.

```gherkin
Scenario: Taking a restaurant off my list that I have visited
  Given "Joe's Pizza" is on my list
  And I have recorded two experiences there
  When I take "Joe's Pizza" off my list
  Then nothing named "Joe's Pizza" is on my list
  And I can no longer reach those experiences
```

Those experiences are retained rather than erased, and nothing in the application reads them back — see the restore question under **Out of scope**. The distinction matters because taking a restaurant off the list is a tidying action, and nobody doing it intends to destroy years of their own notes.

```gherkin
Scenario: Adding a restaurant I previously took off my list
  Given "Joe's Pizza" was on my list and I took it off
  When I add "Joe's Pizza" to my list
  Then "Joe's Pizza" appears on my list
  And it does not read as visited
  And it has no experiences
```

The name is free again once the restaurant carrying it is off the list, so this succeeds rather than colliding. What comes back is a new restaurant that happens to share a name — the old experiences do not return with it.

```gherkin
Scenario: Two owners keeping the same restaurant
  Given another user has "Joe's Pizza" on their list
  And nothing named "Joe's Pizza" is on my list
  When I add "Joe's Pizza" to my list
  Then "Joe's Pizza" appears on my list
  And it does not read as visited
```

Uniqueness is per user, not global. Nothing connects the two entries, and nothing in the system can tell that they are the same real restaurant.

## Failure paths

```gherkin
Scenario: Adding a restaurant that is already on my list
  Given "Joe's Pizza" is on my list
  When I try to add "Joe's Pizza" again
  Then it is rejected as already on my list
  And my list still shows one "Joe's Pizza"
```

> TBD: when a name collides, is the owner just told, or shown the restaurant already there? Being told is enough to be correct, and the difference decides whether this path dead-ends.

```gherkin
Scenario: Renaming a restaurant to one already on my list
  Given "Joe's Pizza" and "Bar Primi" are both on my list
  When I try to rename "Bar Primi" to "Joe's Pizza"
  Then it is rejected as already on my list
  And both restaurants keep their names
```

```gherkin
Scenario: Adding a restaurant with no name
  When I try to add a restaurant whose name is "   "
  Then it is rejected
  And nothing is added to my list
```

```gherkin
Scenario Outline: Giving a restaurant a link that is not a web address
  Given nothing named "Lilia" is on my list
  When I try to add "Lilia" with a site of <link>
  Then it is rejected
  And nothing is added to my list

  Examples:
    | link                        | why                                     |
    | javascript:alert(1)         | not a web address, and it gets rendered |
    | data:text/html,<h1>hi</h1>  | same                                    |
    | mailto:hi@lilianewyork.com  | a web address is what this field means  |
```

Links on a restaurant are rendered as links, so what counts as one is a decision rather than a formality.

```gherkin
Scenario Outline: Changing a restaurant I cannot reach
  Given <situation>
  When I try to change or remove it
  Then it is reported as not found
  And nothing changes

  Examples:
    | situation                                       |
    | the restaurant belongs to another owner              |
    | the restaurant is already off my list           |
    | the restaurant was never on my list at all      |
```

A restaurant belonging to someone else is reported the same way as one that does not exist. Saying "not allowed" instead would confirm that another owner's restaurant exists, which is the same reasoning behind the deliberately generic sign-in failure and the matching rule in `recording-an-experience.scenarios.md`.

```gherkin
Scenario: Managing my list while signed out
  Given my session has ended
  When I try to add, change or remove a restaurant
  Then I am asked to sign in
  And nothing changes
```

## Out of scope

- **Restoring a restaurant taken off the list.** The data is retained, so this is buildable, but nothing exposes it and `shortlist.data.md` carries that as an open question.
- Recording, editing or removing an experience — `recording-an-experience.scenarios.md` and its follow-ons.
- Sharing a list, or seeing anybody else's.
- Photos or attachments.
- Geocoding an address, map display, and importing from Google Maps or anywhere else.

<!-- alloy: scenario -->
