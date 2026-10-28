# Feature: Managing experiences

**Goal:** Keep an honest record of the meals I have actually eaten — write one down while I still remember it, correct it when I got it wrong, and read the lot back the next time I am deciding where to go.

**Actor:** The list owner — the same single role as `managing-my-list.scenarios.md`. An experience is readable only by the owner who recorded it.

**Status:** draft.

An experience needs one of a rating, a note or a date, and nothing else. All three are optional individually because the three reasons to write one down are different — a score, something worth remembering, and when it happened — and an owner rarely has all three to hand. All three absent is not an experience, which is the one rule that makes the others safe to leave optional.

There is no rating of a restaurant, only of one experience, so nothing here averages anything. A restaurant with a 2 and a 5 shows a 2 and a 5.

An experience has no name, so unlike a restaurant it cannot be picked out by one. The scenarios below identify one by the rating and date the owner can see, which is the only handle the owner has.

Recording an experience is what makes a restaurant read as **visited**. Nothing else sets that, and removing the last experience takes it away again.

Background:

```gherkin
Given I am signed in as the owner of my list
And today is 2026-10-27
```

## Main path

```gherkin
Scenario: Writing down what I thought of a meal
  Given "Lilia" is on my list
  And it does not read as visited
  When I record an experience there rated 4.5, on 2026-10-18, with the note "The mafaldini is the whole reason to come"
  Then "Lilia" reads as visited
  And it shows one experience, rated 4.5, on 2026-10-18
```

## Alternate paths

```gherkin
Scenario: Recording a rating and nothing else
  Given "Joe's Pizza" is on my list
  When I record an experience there rated 3
  Then "Joe's Pizza" reads as visited
  And that experience shows no date and no note
```

```gherkin
Scenario: Recording something worth remembering without scoring it
  Given "Tacos El Bronco" is on my list
  When I record an experience there with the note "Suadero sold out by 8pm" and no rating
  Then "Tacos El Bronco" reads as visited
  And that experience shows no rating
```

A note with no rating and a rating with no note are both complete experiences, and they are the two commonest shapes. Requiring a rating would turn every meal into a judgement; requiring a note would stop an owner recording the eleven adequate dinners between the memorable ones.

```gherkin
Scenario: Going back
  Given I recorded an experience at "Joe's Pizza" rated 3, on 2026-05-02
  When I record another there rated 4, on 2026-10-20
  Then "Joe's Pizza" shows two experiences
  And they are not merged into one
  And "Joe's Pizza" shows no overall rating of its own
```

A second experience does not revise the first. They sit side by side, and the restaurant carries no score summarising them — see **Rating** in the glossary.

```gherkin
Scenario: Two experiences on the same day
  Given I recorded an experience at "Tacos El Bronco" rated 4, on 2026-10-20
  When I record another there rated 2.5, on 2026-10-20
  Then "Tacos El Bronco" shows two experiences
```

Lunch and dinner are two experiences. Nothing treats a date as something a restaurant can hold only one of.

```gherkin
Scenario: Recording a meal from long before the restaurant went on my list
  Given "Bar Primi" went on my list on 2026-10-01
  When I record an experience there rated 4, on 2019-06-14
  Then "Bar Primi" reads as visited
  And that experience shows a date of 2019-06-14
```

Putting a restaurant on the list is when the owner got round to writing it down, not when they first ate there. A date earlier than the restaurant's own is ordinary rather than suspicious.

```gherkin
Scenario: Correcting a rating I regret
  Given I recorded an experience at "Lilia" rated 4.5, with the note "The mafaldini is the whole reason to come"
  When I change its rating to 5
  Then that experience shows a rating of 5
  And its note is unchanged
  And no earlier version of it is shown anywhere
```

An edit overwrites. There is no history of the history, so a corrected rating leaves no trace of what it used to be.

```gherkin
Scenario: Clearing a date I was never sure of
  Given I recorded an experience at "Lilia" rated 4.5, on 2026-10-18
  When I clear its date
  Then that experience shows no date
  And it still shows a rating of 4.5
  And "Lilia" still reads as visited
```

```gherkin
Scenario: Removing an experience I recorded against the wrong restaurant
  Given "Joe's Pizza" has one experience
  When I remove that experience
  And I acknowledge a confirmation dialog
  Then "Joe's Pizza" shows no experiences
  And it no longer reads as visited
  And that experience is gone for good
```

```gherkin
Scenario: Removing one experience of several
  Given "Joe's Pizza" has an experience rated 3, on 2026-05-02
  And an experience rated 4, on 2026-10-20
  When I remove the one on 2026-05-02
  Then "Joe's Pizza" shows one experience, rated 4, on 2026-10-20
  And it still reads as visited
```

```gherkin
Scenario: Reading a restaurant's experiences back
  Given "Joe's Pizza" has experiences dated 2019-06-14, 2026-05-02 and 2026-10-20
  When I open "Joe's Pizza"
  Then its experiences read 2026-10-20 first, then 2026-05-02, then 2019-06-14
```

Most recent first.

```gherkin
Scenario: Where an undated experience sits
  Given "Joe's Pizza" has an experience dated 2026-10-24
  And an undated experience I recorded on 2026-10-20
  And an experience dated 2026-05-02
  When I open "Joe's Pizza"
  Then its experiences read 2026-10-24 first, then 2026-05-02, then the undated one
```

Undated experiences are shown at the end.

```gherkin
Scenario: Two experiences on one day, read back
  Given I recorded an experience at "Tacos El Bronco" rated 4, on 2026-10-20
  And then recorded another there rated 2.5, also on 2026-10-20
  When I open "Tacos El Bronco"
  Then the one rated 2.5 reads first
```

Same day, so the tie breaks on which was written down later. This exists to settle the order rather than because anybody cares which dinner comes first.

## Failure paths

```gherkin
Scenario: Recording an experience with nothing in it
  Given "Lilia" is on my list
  When I try to record an experience with no rating, no note and no date
  Then it is rejected as empty
  And "Lilia" still does not read as visited
```

```gherkin
Scenario: Clearing the last thing an experience says
  Given I recorded an experience at "Lilia" rated 4.5 and nothing else
  When I try to clear its rating
  Then it is rejected as empty
  And that experience still shows a rating of 4.5
```

The emptiness rule holds on a change as well as on a recording. Checked only at the moment of recording, it is reachable in two steps by anybody who writes a rating and then deletes it.

```gherkin
Scenario: Recording an experience dated in the future
  When I try to record an experience at "Lilia" dated 2026-10-28
  Then it is rejected as not yet happened
  And nothing is recorded against "Lilia"
```

A future date is a typo. Shortlist holds no reservations, so there is nothing a date after today could legitimately mean.

```gherkin
Scenario Outline: Giving an experience a rating that is not one of the nine
  Given "Lilia" is on my list
  When I try to record an experience there rated <rating>
  Then it is rejected
  And nothing is recorded against "Lilia"

  Examples:
    | rating | why                                    |
    | 0      | there is no nought-star experience     |
    | 5.5    | five is the top                        |
    | 3.7    | ratings move in half-stars             |
    | -2     | the scale has no negative end          |
```

A rating is one of nine values, not a number between one and five — see **Enumerations** in `shortlist.data.md`. Note the difference between a rating of 0, which is rejected, and no rating at all, which is fine.

```gherkin
Scenario Outline: Recording an experience at a restaurant I cannot reach
  Given <situation>
  When I try to record an experience there
  Then it is reported as not found
  And nothing is recorded

  Examples:
    | situation                                       |
    | the restaurant belongs to another user          |
    | the restaurant is off my list                   |
    | no restaurant by that name was ever on my list  |
```

Three situations, one outcome, for the reason given in `managing-my-list.scenarios.md` and in the sign-in refusal: telling them apart would let somebody probe another owner's list for what is on it.

```gherkin
Scenario: Changing an experience that is not mine
  Given another user recorded an experience at their own "Joe's Pizza"
  When I try to change or remove it
  Then it is reported as not found
  And their experience is unchanged
```

```gherkin
Scenario: Managing experiences while signed out
  Given my session has ended
  When I try to record, change or remove an experience
  Then I am asked to sign in
  And nothing changes
```

## Out of scope

- **Moving an experience to a different restaurant.** An experience recorded against the wrong place is removed and recorded again; its restaurant never changes.
- **Recovering a removed experience.** It is destroyed, so there is nothing to restore — unlike a restaurant taken off the list, where the open question lives in `shortlist.data.md`.
- **Reaching the experiences of a restaurant that is off my list.** `managing-my-list.scenarios.md` covers that, and it is the same open question.
- An overall rating, average or ranking across a restaurant's experiences, or across the list.
- Photos or attachments on an experience.
- Anybody else seeing an experience, or an owner sharing one. Lists are not shared.

<!-- alloy: scenario -->
