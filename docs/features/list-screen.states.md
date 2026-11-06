# States: The List Screen

## Subject

The list screen holds multiple things that are each in exactly one state at a time, concurrently. One gesture lands on all of them, and each responds by its own rules.

Nothing here is a lifecycle. They all run for as long as the screen is open, so none of them has a terminal state.

## Events

| Event                  | Sheet                              | Selection               | Search    | Filter    | Menu   | Map                                            |
| ---------------------- | ---------------------------------- | ----------------------- | --------- | --------- | ------ | ---------------------------------------------- |
| Initial state          | Half                               | None                    | Empty     | All       | Closed | Center on my location, zoom 13                 |
| Drag the sheet         | → Peek/Half/Full                   | Unchanged               | Unchanged | Unchanged | Close  | Unchanged                                      |
| Tap an unselected row  | → Peek, scrolled to show selection | One restaurant selected | Unchanged | Unchanged | Close  | Center on selection, zoom 13, pin highlighted. |
| Tap a pin              | → Peek, scrolled to show selection | One restaurant selected | Unchanged | Unchanged | Close  | Center on selection, zoom 13, pin highlighted. |
| Type in search         | → Half                             | None                    | → Query   | Unchanged | Close  | Unchanged                                      |
| Clear the search       | Unchanged                          | Unchanged               | → Empty   | Unchanged | Close  | Unchanged                                      |
| Change the filter      | Unchanged                          | None                    | Unchanged | → Chosen  | Close  | Unchanged                                      |
| Tap the hamburger      | Unchanged                          | Unchanged               | Unchanged | Unchanged | Open   | Unchanged                                      |
| Scroll the list up     | Peek → Half, otherwise Unchanged   | Unchanged               | Unchanged | Unchanged | Close  | Unchanged                                      |
| Scroll the list down   | Unchanged                          | Unchanged               | Unchanged | Unchanged | Close  | Unchanged                                      |
| Pan/Zoom the map       | Unchanged                          | Unchanged               | Unchanged | Unchanged | Close  | Unchanged                                      |
| Open the "Add" dialog  | Unchanged                          | Unchanged               | Unchanged | Unchanged | Close  | Unchanged                                      |
| Close the "Add" dialog | Unchanged                          | Unchanged               | Unchanged | Unchanged | Close  | Unchanged                                      |
| Add a restaurant       | → Peek, scrolled to show selection | New restaurant selected | → Empty   | All       | Close  | Center on selection, zoom 13, pin highlighted. |
| Locate-me              | Unchanged                          | None                    | Unchanged | Unchanged | Close  | Center on my location, zoom 13                 |
| Tap a row's name       | n/a                                | n/a                     | n/a       | n/a       | n/a    | n/a                                            |
| Tap a selected row     | n/a                                | n/a                     | n/a       | n/a       | n/a    | n/a                                            |

Tapping the name on a row opens the restaurant's own screen.
Tapping the selected row opens the restaurant's own screen.

### Special Case: User Declines Location Sharing

If the user has not shared their location, we adopt the following transitions in lieu of the above:

| Event         | Sheet | Selection | Search | Filter | Menu   | Map                                |
| ------------- | ----- | --------- | ------ | ------ | ------ | ---------------------------------- |
| Initial state | Half  | None      | Empty  | All    | Closed | Center on first retaurant, zoom 13 |
| Locate-me     | n/a   | n/a       | n/a    | n/a    | n/a    | n/a                                |

### Detail: Sheet States

This table shows the effect of moving the drag handle on the map/sheet boundary

| Initial | Direction | Final |
| ------- | --------- | ----- |
| Peek    | Up        | Half  |
| Half    | Up        | Full  |
| Full    | Down      | Half  |
| Half    | Down      | Peek  |
| Peek    | Down      | Peek  |

<!-- alloy: state-machine -->
