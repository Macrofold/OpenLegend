# Candy Crush Saga — research checkpoint (G171)

[Library](../README.md) · [Roster](../research-roster.md#october-17-mobile-successes-and-unsuccessful-services) · [Research status](../research-progress-mobile-2026-10-17.md) · [Research requirements](../research-requirements.md)

**Research status: incomplete substantive checkpoint, October 17, 2026.** This is an additive reference study of the selected mobile game and its explicitly identified platform/edition counterparts. It combines documented mechanics, concrete constructed situations, original commercial evidence, production context and independent reception. It grants no OpenLegend implementation or monetization decision. Detailed access and version limitations remain beside the claims.

## Game, mechanics and player-created content

### 1. The match-and-objective loop

The basic action is to swap adjacent candies into a horizontal or vertical line of at least three matching colors. Matched candies disappear and replacements fall into the spaces. This changes the next available moves; further matches can cascade from the same initial decision. The player monitors a move budget and completes the displayed objective before exhausting it. Selecting a move therefore means considering both its immediate clearance and the board it leaves behind. [King, Controls: how to switch and match candies; body read 17 October 2026](https://candycrush.zendesk.com/hc/en-us/articles/360000750278-Controls-how-to-switch-and-match-candies)

This is a sequence of authored puzzle layouts with variable board outcomes, not a persistent battlefield. The important choices are which local match to make, which special candy to build or preserve, which blocker constrains progress, whether to spend a consumable, and whether another attempt is worthwhile. A board with few colors, open space and accessible targets affords different plans from narrow compartments packed with blockers. The causal analysis here follows the documented mechanics; no hidden random-number distribution or adaptive-difficulty algorithm has been measured.

#### Special candies

| Construction                    | Result        | Basic use                                               |
| ------------------------------- | ------------- | ------------------------------------------------------- |
| Four matching candies in a line | Striped Candy | Clears a row or column.                                 |
| Five in a T or L                | Wrapped Candy | Blasts the surrounding area.                            |
| Five in a straight line         | Color Bomb    | Swap with a plain candy to remove that color.           |
| Four in a square                | Fish          | Current help describes a targeted obstacle/candy clear. |

These are board-created tools as well as possible booster effects. Their existence does not imply that each consumes inventory whenever created through play. Swapping specials together creates combinations, including Striped/Wrapped and Color Bomb pairs. [King, Creating and combining Special Candies; current body read](https://candycrush.zendesk.com/hc/en-us/articles/211939685-Creating-and-combining-Special-Candies)

The standard matching rule has a current cohort exception. King is testing direct tap activation of specials alongside swipe activation; combinations still use swaps. Players in that test can trigger an isolated special instead of first constructing its ordinary matching setup. The dedicated help article still says availability is limited, so this is not treated as a universal change or a launch mechanic. [King, New ways to tap and swipe Special Candies; body read](https://candycrush.zendesk.com/hc/en-us/articles/36873468198429-New-ways-to-tap-and-swipe-Special-Candies)

### 2. Objectives change what counts as a useful move

The pre-level screen states the objectives and eligible boosters. Hard, Super Hard, Nightmarishly Hard and Legendary labels warn of intended challenge. Mixed levels can combine tasks; completing one counter is not enough if another remains. The goal and remaining moves, rather than score spectacle alone, determine whether a proposed clearance actually solves the puzzle. [King, Which game modes will I find?; body read](https://candycrush.zendesk.com/hc/en-us/articles/360000754897-Which-game-modes-will-I-find)

| Mode                          | Required action                                                                  | Consequence for planning                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clear the Jelly               | Match over jelly, including its layers and any jelly hidden underneath blockers. | A large match elsewhere may leave the last necessary tile untouched. [Jelly rules](https://candycrush.zendesk.com/hc/en-us/articles/360001381585-Game-Modes-Clear-the-jelly)                                                              |
| Collect the Orders            | Produce/collect specified candies, blockers or combinations.                     | The required item can matter more than raw clearance: a request to combine Striped Candies requires that specific interaction. [Order rules](https://candycrush.zendesk.com/hc/en-us/articles/115004468849-Game-Modes-Collect-the-orders) |
| Release Sprinks/Gummi Dragons | Remove support underneath characters so they reach marked exits.                 | The correct column and fall direction matter; the exit need not be the apparent bottom of the whole board. [Dragon rules](https://candycrush.zendesk.com/hc/en-us/articles/360001374849-Game-Modes-Release-the-Sprinks-Gummi-Dragons)     |
| Rainbow Rapids                | Open a route from rainbow faucet to mold.                                        | Only blockers on the flow path need removal; clearing every obstacle wastes moves. Current help places this mode from level 7116. [Rapids rules](https://candycrush.zendesk.com/hc/en-us/articles/360008932258-Game-Modes-Rainbow-Rapids) |

All four dedicated rule bodies were read. The current Dragon terminology is retained rather than silently describing every delivery level with historical ingredient names.

### 3. Boosters and persistence — initial checkpoint

Boosters may be earned or bought with Gold Bars. Pre-game boosters alter the opening board or allowance; in-level tools intervene after seeing the situation; extra moves can extend an attempt after its original allowance. Pre-game selections can remain selected across retries, so checking the screen matters when conserving inventory. Available booster choices differ by level. [King, What are Boosters?; body read](https://candycrush.zendesk.com/hc/en-us/articles/360000750998-What-are-Boosters)

The current booster-save rule is materially different from older device-local advice. With the game backed up and logged into a King account, boosters synchronize across devices and survive reinstalling. King warns that the first migration has a per-booster transfer limit; subsequent collection is saved normally. The article does not publish that transfer cap in its body, so no numeric cap is invented. [King, Your boosters are now saved to your account; body read](https://candycrush.zendesk.com/hc/en-us/articles/38840349973277-Your-boosters-are-now-saved-to-your-account)

### 4. Constructed situations — initial checkpoint

These are analytical examples, not reports of personal play.

1. **Reach the last jelly.** The player has several moves left and one layered jelly tile beneath a blocker. An attractive large match elsewhere would create cascades but does not reach that tile. They first remove its cover, then align a match or blast over the exposed jelly. If several layers remain, the next decision is whether available moves suffice or a targeted booster is needed. The limiting factor is target access, not total score. [Jelly and hidden-layer rules](https://candycrush.zendesk.com/hc/en-us/articles/360001381585-Game-Modes-Clear-the-jelly)

2. **Open a productive rainbow route.** Two Rainbow Rapids routes remain. The player identifies a blocker shared by a narrow approach and concentrates hits there. Clearing it allows the flow to advance; unrelated blockers can remain intact. They then reassess the second route instead of continuing to clear the largest visible cluster. Success depends on connected flow, so clearing a visually impressive area can be strategically irrelevant. [Rainbow path rules](https://candycrush.zendesk.com/hc/en-us/articles/360008932258-Game-Modes-Rainbow-Rapids)

### Checkpoint access and remaining work

All citations above are current first-party King support bodies. Exact launch dates, the fuller combo/board/blocker inventory, five-life/refill rules, races and team events, event resets and four additional worked cases remain to be integrated. Current-test availability and immutable level-count claims require separate treatment. This checkpoint is not the final completed mechanics inventory.

### Fiction, seasonal authorship and bounded music creation

King frames the original Saga as an adventure with **Tiffi and Mr. Toffee** through a candy world. Its catalog separately identifies Soda's search for Tiffi and Jelly's rescue premise; those are different games, not additional campaigns inside this one. The catalog's old “hundreds of levels” copy is not used as a current level count. [King game catalog, retrieved October 17, 2026; relevant descriptions read](https://www.king.com/game).

In a September 2026 interview, lead artist Silvia Toma and principal artist Emil Sellström describe a consistent visual language: flat papercraft figures, outlines and textures beside appetizing three-dimensional sweets, joined by bright color and quick animation. Seasonal fiction can be absurd while preserving that identity. Toma's example is inventor Dr. Toffee accidentally enlarging the sun; September's music story instead asks players to help Yeti restore Candy Town's radio station through level progress. These are authored premises attached to puzzles, not a simulation of a town's working economy. The artists work across disciplines; narrative discussion informs seasonal key art, which then guides event teams. They describe roughly a week for that central illustration and around a month for the broader art/animation package, varying with scope. Those are attributed production estimates, not measured costs or a promise that any team can reproduce the process. [Aaron Astle's interview with the artists, September 23, 2026; full body read](https://www.pocketgamer.biz/the-secret-ingredients-behind-the-art-of-candy-crush-saga/).

**A concrete historical creation example:** the 2025 Music Season put Jelly Queen, Yeti and Mr. Toffee in a concert-preparation story. Players completed special expedition levels, then selected one of three choices for each musical layer: beat, harmony and melody. Three selections produced one of 27 possible soundtracks, represented by collectible cassettes. Replaying could complete the collection and earn profile decorations. A constructed session would choose a beat after the first milestone, add harmony and melody at later milestones, then decide whether another attempt should explore a different combination. The player composed from supplied alternatives; this was not an editor for uploading arbitrary music, scripting a level or publishing a new game. The five-week event and its exclusive rewards belong to **2025**; the source does not establish that this exact activity remains available in October 2026. [King's Emily Pestell, Xbox Wire, November 6, 2025; full body read](https://news.xbox.com/en-us/2025/11/06/candy-crush-saga-music-season-thundercat/).

**Interpretation:** recognizable characters and an easy-to-understand seasonal problem can give another set of boards a purpose without requiring complex plot choices. Limited music choices also show a small form of creative expression that is accessible within an existing game. For OpenLegend, the research question is whether the player's actions visibly advance an understandable situation or personal creation. Adding narrative labels to an unchanged chore would not by itself demonstrate that connection. The story evidence here comes from publisher and artist accounts; community fan fiction and another Candy title's expanded cosmology are not treated as this game's delivered story.

## Completion work remaining

The latest substantive research is preserved here while remaining mechanics, narrative, creation and source integration are completed. The assembled document still requires its final requirement coverage, factual and link review. It is not yet a completed R01–R15 dossier; the scoped ledger records the actual subject status.
