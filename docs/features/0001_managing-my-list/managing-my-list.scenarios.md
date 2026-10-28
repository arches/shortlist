# Feature: Managing my list

**Goal:** Keep my list accurate — put a restaurant on it when I hear about one and take one off when I am no longer interested.

**Actor:** The list owner — the signed-in owner of a private list. There is no other role; lists are not shared.

**Status:** draft.

A restaurant needs a Google Places ID and nothing else. Every other detail is derived or optional.

Background:

```gherkin
Given I am signed in as the owner of my list
```

## Main path

```gherkin
Scenario: Adding new restaurant
  Given nothing named "Tacos El Bronco" is on my list
  When I type "Tacos El Bronco"
  Then I see autocomplete suggestions from the Google Places API
  And I select the appropriate Google Places result
  Then "Tacos El Bronco" appears on my list with its address and cuisine
  And it does not read as visited
  And it has no experiences
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

## Failure paths

```gherkin
Scenario: Adding a restaurant that is already on my list
  Given "Joe's Pizza" is on my list
  When I try to add "Joe's Pizza" again
  Then it is rejected as already on my list
  And my list still shows one "Joe's Pizza"
```

```gherkin
Scenario: Managing my list while signed out
  Given my session has ended
  When I try to add, change or remove a restaurant
  Then I am asked to sign in
  And nothing changes
```

## Out of scope

- Recording, changing or removing an experience — `managing-experiences.scenarios.md`.
- Sharing a list, or seeing anybody else's.
- Photos or attachments.

<!-- alloy: scenario -->
