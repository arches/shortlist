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

## Main path

```gherkin
Scenario: See restaurants from my list
  Given I shared my location in Silverlake
  When I view the main page
  Then I see a map centered around my location at zoom level 10
  And I see a pin for Bacari on the map
  And I see Bacari in the list
  And I see a blue dot showing my location
```

```gherkin
Scenario: Scrolling the list
  When I scroll the list
  Then the map stays pinned to the top of the screen so it's always visible
```

```gherkin
Scenario: Selecting a restaurant on the list
  When I click on Bacari in the list
  Then the map pans to show Bacari in the center
  And the Bacari pin is highlighted
```

```gherkin
Scenario: Selecting a restaurant on the map
  When I click on the Bacari pin in the map
  Then the list scrolls so Bacari is in view
  And I see Bacari highlighted on the list
```

## Failure Paths

```gherkin
Scenario: Location not shared
  Given I declined to share my location
  When I view the main page
  Then the map is centered on the first restaurant in the list
  And there is no blue dot showing my location
```

<!-- alloy: scenario -->
