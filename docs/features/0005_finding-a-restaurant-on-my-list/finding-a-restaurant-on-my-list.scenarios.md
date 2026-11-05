# Feature: Finding a restaurant on my list

Goal: I want to narrow my list to the restaurants I am actually choosing between
Actor: List owner
Status: draft

## Background

```gherkin
Given I am signed in as the owner of my list
And my list holds:
  | Restaurant      | Note                      | Visited |
  | Bacari          | Go before 7pm             | yes     |
  | Soban           | Famous for their bibimbap | no      |
  | Tacos El Bronco |                           | yes     |
```

## Main path

```gherkin
Scenario Outline: Narrowing my list
  When I <narrow>
  Then I see only <match> in the list
  And <match> is all that is pinned on the map
  And the map moves to fit it

  Examples:
    | narrow                | match  | narrowed by |
    | search for "soban"    | Soban  | the name    |
    | search for "7pm"      | Bacari | my note     |
    | filter to not visited | Soban  | the filter  |
```

## Alternate paths

```gherkin
Scenario: Searching within a filter
  Given I filtered to visited
  When I search for "ba"
  Then I see only Bacari
  And Soban is gone, though its name matches too
  And I see that both a search and a filter are narrowing my list
```

## Failure paths

```gherkin
Scenario: Nothing matches
  When I search for "sushi"
  Then I see that nothing on my list matches "sushi"
  And I see no pins on the map
  And the map stays where it was
  And clearing the search brings all three back
```

## Out of scope

- Searching by address. The field reads names and notes, and nothing else.
- Finding a restaurant that is not on my list. Typing a name here never reaches Google Places; that is how a restaurant is added, not how one is found.
- Filtering by cuisine, by rating or by distance, and sorting the list.

<!-- alloy: scenario -->
