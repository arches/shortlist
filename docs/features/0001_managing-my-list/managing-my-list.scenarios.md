# Feature: Managing my list

**Goal:** Keep my list accurate — put a restaurant on it when I hear about one and take one off when I am no longer interested.

**Actor:** The list owner — the signed-in owner of a private list. There is no other role; lists are not shared.

**Status:** draft.

A restaurant needs a Google Places ID and nothing else. Every other detail is derived or optional.

A **note** is one of those optional details. It says why the restaurant is on the list — "Famous for their bibimbap" — and the owner writes it as they add the restaurant, or afterwards, or not at all. It is theirs alone: two owners with the same restaurant on their lists have unrelated notes.

Background:

```gherkin
Given I am signed in as the owner of my list
```

## Main path

```gherkin
Scenario Outline: Adding a restaurant
  Given nothing named "Soban" is on my list
  When I type "Soban"
  Then I see autocomplete suggestions from the Google Places API
  And I select the appropriate Google Places result
  And I add it to my list with the note "Famous for their bibimbap"
  Then "Soban" appears on my list with its address and cuisine
  And it reads "Famous for their bibimbap"
  And it does not read as visited
  And it has no experiences
```

```gherkin
Scenario: Taking a restaurant off my list
  Given "Joe's Pizza" is on my list with the note "Go for the plain slice"
  And I have recorded 2 experiences there
  When I take "Joe's Pizza" off my list
  And I acknowledge a confirmation dialog
  Then "Joe's Pizza" is off my list
  And its note is gone with it
  And both experiences are gone with it
  And the restaurant itself stays in the system
```

## Alternate paths

```gherkin
Scenario: Adding a restaurant that exists in the system but not on my list
  Given nothing named "Tacos El Bronco" is on my list
  Given a restaurant named "Tacos El Bronco" is in the system
  When I type "Tacos El Bronco"
  Then I see autocomplete suggestions from the Google Places API
  And I select the appropriate Google Places result
  Then "Tacos El Bronco" appears on my list
  And it does not read as visited
  And it has no experiences
  And no new restaurant was created in the system
```

```gherkin
Scenario Outline: Changing the note on a restaurant on my list
  Given "Soban" is on my list <before>
  When I set the note to <typed>
  Then "Soban" <after>
  And "Soban" is still on my list
  And the day it went on my list has not changed

  Examples:
    | before                                    | typed                       | after                             |
    | and carries no note                       | "Famous for their bibimbap" | reads "Famous for their bibimbap" |
    | with the note "Famous for their bibimbap" | "Go before 7pm"             | reads "Go before 7pm"             |
    | with the note "Famous for their bibimbap" | nothing                     | carries no note                   |
    | with the note "Famous for their bibimbap" | nothing but spaces          | carries no note                   |
```

## Failure paths

```gherkin
Scenario: Adding a restaurant that is already on my list
  Given "Joe's Pizza" is on my list with the note "Go for the plain slice"
  When I try to add "Joe's Pizza" again with the note "Ask for it well done"
  Then it is rejected as already on my list
  And my list still shows one "Joe's Pizza"
  And it still reads "Go for the plain slice"
```

```gherkin
Scenario: Managing my list while signed out
  Given my session has ended
  When I try to add, change or remove a restaurant, or write a note
  Then I am asked to sign in
  And nothing changes
```

## Out of scope

- Recording, changing or removing an experience, and the notes an experience carries
- A note on a restaurant that is not on my list. A note lives on the list item, so taking the restaurant off the list takes the note with it.
- Sharing a list, or seeing anybody else's.
- Photos or attachments.

<!-- alloy: scenario -->
