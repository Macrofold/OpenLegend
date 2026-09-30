# Readable promises — feature specification

**Status:** approved read-only first slice of [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management), delivered under the [player clarity plan](player-clarity-ui.md). [Technical design](readable-promises-tech-design.md) defines the read contract. Current promise rules are in [base-world social behavior](../worlds/base/social.md#spoken-promises). Amending, cancelling and negotiated agreements stay out of scope until [D64](../../archive/05-project/open-decisions.md#social-exposure-decisions) is decided.

## 1. Purpose

A player who says “I promise to gather stone” currently changes native state without any way to see it. The world records an obligation, may later mark it kept when the character gathers stone, can mark it overdue after an amended deadline and refuses new promises once 16 are unresolved. None of this is visible outside God diagnostics. This slice lets a player read their own promises truthfully: what they said, to whom, what the world actually checks and what happened.

## 2. Supported behavior

The Journal gains a **Promises** section for the player's own character only.

- **Open promises** (active or overdue) come first, with the count against the admission limit (“3 of 16 open”). Admission counts every unresolved commitment, including forgotten ones and commitments that were not spoken promises; when those exist the count says how many are unlisted. At the limit the section says new promises will not be recorded until one is kept.
- **Past promises** (kept or cancelled) follow, newest spoken first, with a “Show earlier promises” control that pages through every retained record.
- Each promise shows its exact words, the recipient as the player's character knows them (a learned name or “a person”; none when spoken to no one), when it was made, and a status shown as text.
- **Terms** explain what the world tracks, in server-written words: “Kept automatically when you gather Small stone.” A promise without a supported automatic check says so plainly: the world does not check it automatically and it stays open. A completion rule this slice cannot describe is labelled as such instead of exposing internal strings.
- **Evidence** for a kept promise names the actual gathering event and its time. Overdue shows the deadline. Cancelled says it was cancelled and does not claim anyone else agreed to release the promise.
- A short “What this world tracks” explanation states the current parser boundary: only speech beginning “I promise to …” is recorded, and only “I promise to gather <one item name>” is checked automatically.

## 3. Journeys

1. **Kept promise.** The player says “I promise to gather stone” (to someone or aloud). The Promises section shows it open with the automatic-check terms. The player gathers river stones. After refresh the promise is kept, with evidence naming the gathering and its time.
2. **Unsupported wording.** “I promise to gather 2 stones” or “I promise to help you” is listed as open with no automatic check; gathering does not change it.
3. **At the limit.** With 16 unresolved promises, a 17th spoken promise is not recorded; the section shows 16 of 16 and the limit explanation.
4. **Older history.** After many kept promises, earlier ones remain reachable through “Show earlier promises”, including promises already released from resident world memory.
5. **Privacy.** Another player never sees these promises; there is no actor selector. The recipient's name appears only if the viewer's character has learned it.

## 4. Scope and non-goals

In scope: owner-only reading of open and past obligations, paged past history, honest terms and evidence, refresh after play.

Not in scope: amending deadlines, cancelling, changing completion rules, promises by other characters, NPC promises in God tools (existing diagnostics remain), reciprocal agreements, broader language recognition, rewards, a new promise store, a new launcher button, automatic live updates of the list while it is open.

## 5. Meaningful failures

- Save load, world change or access change while paging: the list asks the player to reload it; no mixed pages.
- History storage unavailable: open promises still show from the live world; past promises show only those still resident, labelled as partial.
- A promise whose item definition was later removed: terms say the item is no longer defined rather than failing.
- Stale scope or another account: request rejected; nothing is disclosed.

## 6. Acceptance

- The kept/unsupported/limit/older-history journeys above work in the running app at desktop and narrow widths using only the keyboard.
- No other account can read the list; no internal event types, event IDs or global names of unlearned characters appear.
- Past-promise paging returns every retained record exactly once in a stable order for a fixed save.
- Evidence is recorded in the [player clarity verification](../verification/player-clarity-ui.md); automated coverage remains deferred in [TODO](../maintainers/TODO.md#social-playable-slices--future-validation).

## 7. Stages

1. This read-only slice.
2. After D64: permitted amendment/cancellation with revision checks and understandable consequences, reusing `/api/commitment` and the same record identity/revision fields this slice already returns.
3. Separately approved: broader promise language, agreements and rewards.

## Maintained records

- Implementation: [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management).
- Limits and constraints: [base-world BW04](../limits/base-world.md#bw04).
- Related contract/design: [technical design](readable-promises-tech-design.md), [spoken promises](../worlds/base/social.md#spoken-promises).
