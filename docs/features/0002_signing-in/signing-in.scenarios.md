# Feature: Signing in

**Goal:** Get to my own list, and leave it behind when I am done.

**Actor:** The list owner — the same single role as `managing-my-list.scenarios.md`. There is no administrator role inside Shortlist; the one administrative act, creating an account, happens outside it.

**Status:** draft.

- An account is created by an administrator by hand
- Shortlist sends no email at all, so the account is provided to the user by hand

Shortlist sees the password. The owner types a password into Shortlist, Shortlist compares it against a bcrypt digest it stores, and Shortlist issues the token that every later request carries.

A session is renewed rather than held open. Signing in returns two things: a short-lived access token, good for about fifteen minutes, which every request carries; and a longer-lived refresh token, good for thirty days, which buys a fresh pair of both. The frontend renews in the background when the access token runs out, so an owner reading their list for an hour is never interrupted. A sessions ends when the user signs out, the refresh token ages thirty days, or an administrator removes the account.

Signing out is not instant on other devices, and the scenarios below say so rather than pretending otherwise. Signing out destroys every refresh token the owner has, so no device can renew again — but a device already holding an unexpired access token keeps working until it expires. Fifteen minutes is the worst case, and that is the reason the number is small.

Background:

```gherkin
Given an administrator has created an account for "sam.reed@fastmail.com"
And I am signed out
```

## Main path

```gherkin
Scenario: Signing in to reach my list
  Given my password is "correct-horse-battery-staple"
  And "Lilia" is on my list
  When I sign in as "sam.reed@fastmail.com" with that password
  Then my list opens
  And "Lilia" is on it
```

## Alternate paths

```gherkin
Scenario: Signing out when I am done
  Given I am signed in as "sam.reed@fastmail.com"
  When I sign out
  Then I am asked to sign in
  And nothing on my list has changed
  And signing in again with the same password works
```

```gherkin
Scenario: Staying on my list longer than an access token lasts
  Given I am signed in as "sam.reed@fastmail.com"
  And "Lilia" is on my list
  When twenty minutes pass with the list open
  And I add "Bar Primi" to my list
  Then "Bar Primi" appears on my list
  And I am not asked to sign in
```

The renewal is the thing being specified here: an owner who stays longer than fifteen minutes notices nothing. A failure of this path looks like being thrown out mid-sentence, which is why it is a named scenario rather than left to the prose.

## Failure paths

```gherkin
Scenario Outline: Credentials that do not match an account
  When I try to sign in as <email> with <password>
  Then I am told that the email or password is wrong
  And I am not told which of the two it was
  And I am not told whether <email> has an account at all

  Examples:
    | email                   | password                       | why                            |
    | sam.reed@fastmail.com   | "hunter2"                      | my account, the wrong password |
    | nobody@fastmail.com     | "correct-horse-battery-staple" | no account at that address     |
    | nobody@fastmail.com     | "hunter2"                      | neither matches anything       |
```

One outcome, three causes, deliberately. Telling the three apart would turn the sign-in form into a way to ask whether an address has an account.

```gherkin
Scenario: Coming back after my refresh token has expired
  Given I signed in as "sam.reed@fastmail.com" thirty-one days ago
  And I have not used Shortlist since
  When I open my list
  Then I am asked to sign in
  And "Lilia" is still on my list once I do
```

Thirty days is a ceiling on a session, not an idle timer — each renewal issues a fresh refresh token, so an owner who uses the list weekly is never turned out. This path is what an owner who went away reaches.

## Out of scope

- **Recovering a forgotten password.** Out for now, because Shortlist sends no email. Until then an administrator sets a new password by hand.
- **Being given an account in the first place.** Out for now, because Shortlist sends no email. Until then an administrator creates new accounts by hand.
- **Changing my password while signed in.**
- Anything about the list itself
- Sharing a list, or signing in to see somebody else's

<!-- alloy: scenario -->
