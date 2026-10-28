# Feature: Signing in

**Goal:** Get to my own list, and leave it behind when I am done.

**Actor:** The list owner — the same single role as `managing-my-list.scenarios.md`. There is no administrator role inside Shortlist; the one administrative act, creating an account, happens outside it.

**Status:** draft.

Shortlist sends no email at all. An account is created by an administrator by hand — `shortlist.data.md` has a User made with a name, an address and a password that is then handed to the owner — so there is no invitation to expire, no link to use twice, and nothing in the system that mails anybody. Recovering a forgotten password is out of scope for the same reason: with no mail there is nothing to send, and an administrator setting a new one by hand is the whole story.

Shortlist sees the password. The owner types a password into Shortlist, Shortlist compares it against a bcrypt digest it stores, and Shortlist issues the token that every later request carries. There is no third party to hand the credential to and no third party to ask whether a token is good. Everything observable below is therefore Shortlist's own doing, including the refusals.

A session is renewed rather than held open. Signing in returns two things: a short-lived access token, good for about fifteen minutes, which every request carries; and a longer-lived refresh token, good for thirty days, which buys a fresh pair of both. The frontend renews in the background when the access token runs out, so an owner reading their list for an hour is never interrupted. What ends a session is signing out, the refresh token reaching thirty days, or an administrator removing the account.

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

The renewal is the thing being specified here, and the only way to see it is from the outside: an owner who stays longer than fifteen minutes notices nothing. A failure of this path looks like being thrown out mid-sentence, which is why it is a named scenario rather than left to the prose.

```gherkin
Scenario: Signing out on one device while signed in on another
  Given I am signed in as "sam.reed@fastmail.com" on my laptop and on my phone
  When I sign out on my laptop
  Then my phone can no longer renew its session
  And my phone is asked to sign in once its access token expires
  And nothing on my list has changed
```

This is the scenario that pays for holding the credential ourselves. Issuing our own tokens means a token cannot be withdrawn once issued, so "signed out everywhere" is true of renewals immediately and of requests within fifteen minutes. An owner who signs out because they are worried about the other device is not fully served by this, and the honest reading is that the access token's lifetime is the real exposure.

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

One outcome, three causes, deliberately. Telling the three apart would turn the sign-in form into a way to ask whether an address has an account, and a private list whose membership can be probed is not private. This is the rule `managing-my-list.scenarios.md` borrows when it reports another owner's restaurant as not found rather than not permitted, and `managing-experiences.scenarios.md` is said to match it.

Nothing else enforces this now that the wording is ours: there is no provider reporting success either way on our behalf, so the refusal for an unknown address and the refusal for a wrong password have to be the same string, produced by the same path, taking the same time.

```gherkin
Scenario: Coming back after my refresh token has expired
  Given I signed in as "sam.reed@fastmail.com" thirty-one days ago
  And I have not used Shortlist since
  When I open my list
  Then I am asked to sign in
  And "Lilia" is still on my list once I do
```

Thirty days is a ceiling on a session, not an idle timer — each renewal issues a fresh refresh token, so an owner who uses the list weekly is never turned out. This path is what an owner who went away reaches.

```gherkin
Scenario: My session ends in the middle of what I am doing
  Given I am signed in as "sam.reed@fastmail.com"
  And my session ends
  When I try to add "Bar Primi" to my list
  Then I am asked to sign in
  And nothing is added to my list
```

The same event as _Managing my list while signed out_ in `managing-my-list.scenarios.md`, seen from this side. Both halves have to agree that nothing changes, because a half-applied change made by somebody whose session had already ended is the worst of the available outcomes.

Reaching it takes two refusals rather than one: the request is refused, renewal is attempted because an expired access token is the ordinary reason for a refusal, and only when the renewal is also refused has the session actually ended. A single refusal is not evidence of anything, which is why the attempt has to come first.

## Out of scope

- **Recovering a forgotten password.** Out for now, and out because of a missing dependency rather than a missing decision: Shortlist sends no email, `shortlist.stack.md` carries transactional email as an unanswered slot, and a recovery link is the thing that will fill it. Until then an administrator sets a new password by hand. Everything the earlier version of this feature specified — the deliberately ambiguous "a link is on its way if that address has an account", the single-use link, whose words a rejected password is refused in — comes back with it, so this is the first thing to reopen.
- **Being given an account in the first place.** A different capability, and with no invitation email in the picture it has fewer paths than it would otherwise: nothing expires and nothing gets used twice, because there is no link to follow. What is left is deciding what the owner is told the first time they sign in with a password somebody handed them, and whether they are made to change it. Administered by hand at this size, so nothing in Shortlist drives it yet.
- **Changing my password while signed in.** No scenario needs it. It is the one place the hand-rolled design has a question the managed one answered: changing a password should arguably destroy the owner's other refresh tokens, and nothing here says whether it does.
- Anything about the list itself — adding, changing and removing restaurants are `managing-my-list.scenarios.md`.
- Sharing a list, or signing in to see somebody else's. Lists are not shared, so there is no second role to sign in as.

<!-- alloy: scenario -->
