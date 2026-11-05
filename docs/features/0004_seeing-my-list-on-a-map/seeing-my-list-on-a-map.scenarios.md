# Feature: Map View

Goal: I want to see restaurants from my list on a map
Actor: List owner
Status: draft

## Background

```gherkin
Given I am signed in as the owner of my list
And I have been asked to share my browser location
And Bacari is on my list at 3626 Sunset Blvd, Los Angeles, CA 90026
```

This is an extension of the Managing My List view; map and list together comprise a single page.

Managing My List focuses on the list itself, whereas this feature focuses on the map and map/list interactions.

`list-screen.states.md` holds what each gesture on this screen does to the sheet, the selection, the menu and the map. The scenarios below name those states rather than restating them, so what is left here is what that table cannot say.

## Main path

```gherkin
Scenario: See restaurants from my list
  Given I shared my location in Silverlake
  When I view the main page
  Then the list screen opens in its initial state
  And I see a pin for Bacari on the map
  And I see a blue dot showing my location
  And I see Bacari in the sheet
```

## Alternate paths

```gherkin
Scenario: Scrolling the list
  Given the sheet rests at full
  When I scroll the list
  Then the restaurants move within the sheet
  And no restaurant appears outside the sheet
  And the page itself does not scroll
```

The sheet scrolls and the page does not. There is nothing below the sheet to reach by scrolling past it.

## Failure paths

```gherkin
Scenario: Location not shared
  Given I declined to share my location
  When I view the main page
  Then the list screen opens in its initial state
  And there is no blue dot showing my location
```

<!-- alloy: scenario -->
