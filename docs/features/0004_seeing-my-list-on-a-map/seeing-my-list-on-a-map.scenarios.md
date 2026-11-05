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
  Then I see a map centered around my location at zoom level 13
  And I see a pin for Bacari on the map
  And I see a blue dot showing my location
  And the sheet rests at half
  And I see Bacari in the sheet
```

## Alternate paths

```gherkin
Scenario Outline: Changing how much map I can see
  Given the sheet rests at <before>
  When I drag the sheet <direction>
  Then the sheet rests at <after>
  And the map has not panned or changed zoom

  Examples:
    | before | direction | after |
    | half   | down      | peek  |
    | half   | up        | full  |
    | peek   | up        | half  |
    | full   | down      | half  |
    | peek   | down      | peek  |
```

```gherkin
Scenario: Scrolling the list
  Given the sheet rests at full
  When I scroll the list
  Then the restaurants move within the sheet
  And no restaurant appears outside the sheet
  And the page itself does not scroll
  And the map does not pan or change zoom
```

```gherkin
Scenario: Selecting a restaurant on the list
  Given the sheet rests at full
  When I click on Bacari in the sheet
  Then the sheet drops to peek
  And the map pans to show Bacari in the center
  And the Bacari pin is highlighted
  And Bacari is the restaurant showing in the sheet
```

```gherkin
Scenario: Selecting a restaurant on the map
  Given the sheet rests at half
  When I click on the Bacari pin in the map
  Then Bacari is the restaurant showing in the sheet
  And I see Bacari highlighted in the sheet
  And the sheet stays at half
```

```gherkin
Scenario: Recentering on the user location
  When I click on the "locate me" button
  Then I see a map centered around my location at zoom level 13
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
