# Divinity: Original Sin II — builds and authorship

**G57 operational supplement, September 27, 2026.** Read with the [full dossier](../dossiers/divinity-original-sin-ii.md). This addresses the [audit's remaining R02/R03/R06/R14 findings](../references/games-51-60-coverage-audit.md#g57--divinity-original-sin-ii). The original ten cases, six reviews, player samples and production history remain in that dossier. [Progress](../research-progress.md) owns task state.

The default reference is Definitive Edition without optional Gift Bag rules. PC Game Master tools, separate Arena matches and the ordinary campaign have different authority and persistence contracts. The explanations below are desk research, not gameplay, watched footage or an accepted OpenLegend design. Source limitations and contradictions are retained where consequential.

## 1. Talents change the rules a build operates under

Attributes, combat abilities, civil abilities and talents are separate investments. Combat abilities can qualify a character for learned skills; civil abilities support activities such as persuasion and theft. Talent choices are scarcer: the progression table awards them at creation and levels 3, 8, 13 and 18. A larger attribute value does not automatically grant a talent. [B1](#b1)

A talent usually supplies a persistent rule or capability rather than another skillbook attack. **Executioner** rewards a killing blow with additional action points once per turn; **The Pawn** supplies free movement instead, and the two are incompatible. **Pet Pal** buys an information channel rather than direct damage. **Elemental Affinity** reduces spell cost when the caster stands in a matching surface. These are different reasons to change one's next action, not interchangeable small stat bonuses. The 2017 talent reference is used for these stable qualitative relationships, not its obsolete balance values. [B2](#b2)

**Glass Cannon** grants maximum action points at the beginning of each round but removes armor's ordinary protection against statuses. More armor therefore does not solve the particular vulnerability the talent creates. The additional turn capacity can be wasted if the actor is disabled before exploiting it. This is a bounded trade, not an assertion that every opponent always targets that character. [B3](#b3)

**Lone Wolf** instead makes a one- or two-person party more capable through action resources, defenses and doubled eligible investment. Its benefit turns off when the current party grows beyond two. Definitive Edition stops doubled allocation at the ordinary attribute/combat-ability caps; Polymorph is excluded from the doubling, and civil abilities are not promised the same treatment. It is incompatible with Glass Cannon. The older original-game cap behavior must not be imported into this edition. [B4](#b4) [B5](#b5)

**Interpretation:** a talent is a compact amendment to the character's action contract. Good feedback identifies which assumption changed: safe status protection, useful movement, a kill's reward or how many collaborators the build can support. More choices matter only when players can understand those different costs.

## 2. Ancestry is operational, not just a dialogue tag

The four living ancestries combine passive traits with a racial action. Humans' **Encourage** supports nearby allies; dwarves' **Petrifying Touch** offers short-range control subject to magic armor; lizards' **Dragon's Blaze** creates fire, while their claws can substitute for a digging shovel. Associated bartering, sneaking, resistance and persuasion traits also influence noncombat roles. These packages do not lock the character into the starter preset's profession. [B1](#b1)

An elf's **Flesh Sacrifice** gives immediate action capacity and an offensive benefit while reducing Constitution. The reduction varies with level; it is not a fixed minus-one forever. The created blood surface is another consequence that can participate in other mechanics. One guide incorrectly labels the action itself as costing one AP; the separately retrieved game-text reference identifies a zero-AP activation that grants one AP, with excess over the maximum lost. The manuscript does not propagate the mistaken cost. [B6](#b6) [B1](#b1)

Elves also have **Corpse Eater**: particular body parts supply memories and sometimes learned skills. That is a specific additional acquisition route, not an unlimited promise that every corpse supplies a usable technique or complete personal biography. Origin-only Source skills are another category: **Fane's Time Warp** is not a universal reward for creating any undead person. [B7](#b7)

### Undead change both care and social access

Undead variants heal from poison while ordinary healing can damage them. They have **Play Dead** and a different trait package rather than simply gaining every living racial action plus extra benefits. Skeletal fingers remove the consumable-lockpick requirement, but not the skill requirement for a difficult lock. Disguising the undead body matters to ordinary social access; appearance is therefore part of a practical interaction rule. [B8](#b8) [B9](#b9) [B1](#b1)

This is not DOS1's Zombie talent renamed as a race. Likewise, “ordinary healing hurts” does not establish that every possible recovery mechanic in every optional mode is harmful. A selected Gift Bag or an exceptional ability needs its own rule rather than being inferred from the headline. [B8](#b8)

**Interpretation:** the same instruction—heal, open, speak—has different prerequisites for different bodies. A useful companion system should check the actual target and tool instead of treating benevolent intent as proof of beneficial outcome. Identity can create affordances and vulnerabilities without making all members of a group psychologically identical.

## 3. Runes separate reusable equipment from irreversible modification

Only equipment with a suitable slot accepts a rune. Runes can be acquired through finding, buying or crafting, and a rune can be removed from equipment and installed elsewhere. Its effect depends on the receiving category. A **Flame Rune** adds fire damage in a weapon, fire resistance in armor, or critical chance in an accessory. Consequently, the best destination is a build decision, not simply the first empty slot. [B10](#b10)

Combining two same-type, same-size runes with the appropriate dust produces the next size. Ordinary Pixie Dust supports earlier upgrades; **Superior Pixie Dust** is required for the final Giant upgrade. A frame is a separate operation: a **Rune Frame of Power** adds an attribute-oriented benefit, while a **Mystical Rune Frame** adds other bonuses dependent on the rune and slot. Do not mistake a framed rune for an extra equipment socket. [B11](#b11)

Removing a rune from a weapon is not the same as removing its frame. The inspected rules and firsthand frame discussions agree that framing cannot normally be undone and prevents later size upgrading. A small rune can therefore be usable now yet a poor recipient for a scarce frame. This does not justify treating every numeric wiki table as correct: the retrieved magical-items page contains an apparent Giant Flame resistance typo and an overly broad slot-count claim, neither of which is used here. [B12](#b12) [B13](#b13)

**Interpretation:** reversible placement and irreversible construction are two different freedoms. An interface should expose that boundary before combining ingredients. Otherwise “experiment with runes” can sound like permission for costless reversal at every layer when only one layer supports it.

## 4. Game Master mode is a human-run adventure, not another autonomous campaign

Larian's documented workflow separates **Prepare Campaign** from **Play Campaign**. An author creates or imports a campaign, organizes it and can publish it to Workshop. A session can then be selected through the online/LAN game list or resumed. Preparing a reusable artifact and maintaining a played save are different actions. [G1](#g1)

The author chooses scenes from available settings, decorates them with assets, adds encounter participants and loot, and paints surfaces. A scene is a location the party can visit; the overview map arranges the larger journey. The heavier Divinity Engine editor is a separate tool for new scripted behavior and assets, not a feature silently available in every live GM panel. [G2](#g2) [G4](#g4)

**Vignettes** supply authored images, text and selectable responses. They can be prepared, searched, organized and edited during play. Their function is to present a situation or conversation; they are not proof that an NPC model now has an independently generated dialogue tree. Custom image import and text authoring are also different from importing arbitrary executable behavior. [G3](#g3)

The GM's role is active. Larian's FAQ describes up to four players, rerolling the party to revisit creation or admit new participants, and players asking for actions outside the listed vignette choices. It explicitly separates editor-authored NPC scripts from live GM improvisation. A player can therefore request something the default action interface cannot express, but a human GM still decides how to adjudicate and represent it. [G4](#g4)

The user-interface documentation lists encounter management, entity control, status editing, dice requests and rewards. Several linked tutorials are marked “Coming Soon”; that incomplete documentation is not treated as proof those game features were unreleased. The main dossier's shipped-PC scope and the documented tools remain separate evidence. No console GM parity or current session compatibility is asserted. [G5](#g5)

### A broad editor creates a human attention bottleneck

Tom Marks's May 2017 hands-on session with Larian found enough control to improvise and circumvent programmed rules. He also found the world less independently responsive than the ordinary campaign because NPC conversation required the GM's attention. Other players could wander while waiting for one person's adjudication. This is a **pre-release firsthand assessment**, not a new 2026 playtest or a claim every group has the same problem. [G6](#g6)

**Interpretation:** author freedom and participant freedom are not identical. A GM may be able to invent any response yet be unable to service four simultaneous conversations. OpenLegend should not confuse a powerful authoring interface with solved autonomous social simulation. The transferable question is how an exceptional request becomes a visible, authorized state change without concealing who made the ruling.

## 5. Arena isolates tactical competition

Bandai Namco's Definitive Edition announcement describes solo play, online PvP and pass-the-controller Hot Seat. Its separate roster includes sixteen preset combatants, including Malady, Zandalor and Radeka. **Deathmatch** rewards being the last survivor; **Kill the King** instead makes protecting a designated teammate part of victory. These are match objectives, not the main campaign's quest outcomes. [A1](#a1)

Maps contain coffers supplying combat resources, so reaching a chest can compete with an immediate attack. Host-selected **Mutators** can change a round's conditions—for example, granting wings or lowering health for sudden death. Players must adapt a known tactical vocabulary to altered objectives and timing. No campaign-character export or permanent quest progression is implied by winning such a match. [A1](#a1)

**Interpretation:** the same combat can support a different game when victory, available characters and persistence change. Avoid importing Arena's symmetrical match assumptions into a long campaign, or assuming an interesting build automatically makes a fair multiplayer contest.

## 6. Gift Bag identity and source precision

The missing source identity is **Gift Bag 4: Sourceror Secrets**, dated **January 23, 2020** in Larian's Steam announcement history. Its four named features are From the Ashes, Source Meditation, Divine Talents and expanded/persistent Spirit Vision. They are selectable modifications, not the unmodified bedroll, talent pool or perception duration. The original announcement text was actually read; an API attempt did not recover a separate event identifier. [U1](#u1)

A stable additional owner is Anshar Studios' **Codename “Potato”** retrospective, whose Gift Bag 4 section enumerates the same features and identifies the studio's collaboration with Larian and Fool's Theory. This is a co-developer account, not an independent player review. It provides a named, specific corroborating source instead of relying only on an undifferentiated Steam feed. [U2](#u2)

The June 2020 **Four Relics** update remains different: new-game quest/equipment content was integrated rather than being equivalent to every optional modification. The existing dossier already preserves that distinction. The new citation clarifies the earlier source, not permission to call all Gift Bags reversible in every already-saved campaign or assume uniform achievement behavior. [U1](#u1)

## 7. Five additional constructed interactions

These supplement the original ten cases and are **not** attributed play sessions.

**B01 — abundant action points do not ensure an action.** A mage takes Glass Cannon to cast more each turn, then faces a disabling effect while armor remains. The talent removes that particular protection, so the plan now needs positioning, another defense or a different talent. The next decision is not simply to equip more armor. **Limit:** this does not predict every enemy's targeting policy. [B3](#b3)

**B02 — a recruit changes both characters already present.** Two Lone Wolf users invite a third person. Their conditional bonuses stop applying, so the group must compare an additional voice and toolkit with lost individual benefits. The next choice is to reconfigure the builds or return to a smaller party. **Limit:** respecialization and equipment still have their own access conditions. [B4](#b4)

**B03 — bodily capability removes a consumable, not expertise.** An undead thief reaches a lock with no lockpicks. The finger supplies the tool, but inadequate Thievery can still block the operation. The next choice is training, suitable equipment, another route or another character. **Limit:** a racial affordance is not universal authorization to open any object. [B9](#b9)

**B04 — a portable upgrade can contain a permanent decision.** A player moves a Flame Rune between compatible gear, then considers framing it before it reaches the desired size. Placement is reversible; the frame combination is not the same operation. The next choice is immediate benefit or saving ingredients for later. **Limit:** a familiar drag-and-drop interface should not imply every underlying change can be undone. [B12](#b12) [B13](#b13)

**B05 — words require an adjudicator.** A GM prepares a vignette with negotiation and combat options; a player proposes bribing a different guard. The GM decides whether the idea fits, adjusts the situation and presents a consequence. The next choice returns to the party. **Limit:** the engine did not autonomously infer the entire social world merely because the request was accepted. [G3](#g3) [G4](#g4)

## 8. Annotated sources and coverage

All new access September 27, 2026. The relevant text was inspected; indexed-only, historical and failed routes are identified. Table values and subjective build rankings not needed for these explanations are not copied.

- <a id="b1"></a>**B1 — chris-williams, [Character Creation](https://gamefaqs.gamespot.com/ps4/236378-divinity-original-sin-ii-definitive-edition/faqs/81674/character-creation).** Actual progression, ancestry and origin sections read. The Flesh Sacrifice AP-cost error is corrected against B6; other whole-guide claims are not certified.
- <a id="b2"></a>**B2 — Moniker85, [Talents](https://gamefaqs.gamespot.com/ps4/236378-divinity-original-sin-ii-definitive-edition/faqs/75285/talents), version 0.40, November 2, 2017.** Original-game text despite a modern platform wrapper. Qualitative talent roles only; old Lone Wolf balance is not the Definitive specification.
- <a id="b3"></a>**B3 — [Glass Cannon](https://divinitywiki.com/index.php/DOS2%3AGlass_Cannon).** Indexed game-text transcription; core benefit/cost corroborated by the later B1 talent section. No enemy-AI guarantee.
- <a id="b4"></a>**B4 — [Lone Wolf](https://divinitywiki.com/index.php/DOS2%3ALone_Wolf).** Indexed game-text transcription, conditional party size and investment caps; not a new executed build test.
- <a id="b5"></a>**B5 — [April 2021 cap clarification](https://steamcommunity.com/app/435150/discussions/0/3129415222166903790/).** Actual firsthand player question and answer distinguish the Definitive allocation caps from equipment bonuses. The linked original [Kickstarter update 47](https://www.kickstarter.com/projects/larianstudios/divinity-original-sin-2/posts/2207876) exposed only a shell, not a newly read full announcement.
- <a id="b6"></a>**B6 — [Flesh Sacrifice](https://www.divinitywiki.com/index.php/DOS2%3AFlesh_Sacrifice).** Actual game-text reference read; zero-AP activation and immediate gain. The indexed [older reference](https://divinity.fandom.com/wiki/Flesh_Sacrifice) has a static Constitution value; B1 supplies the level-dependent qualification.
- <a id="b7"></a>**B7 — [Original Sin 2 skills](https://divinity.fandom.com/wiki/Original_Sin_2_Skills).** Substantive indexed learning and special-skill categories; corpse acquisition and origin/racial distinctions. Not a complete skill catalog audit.
- <a id="b8"></a>**B8 — [Original Sin 2 talents](https://divinity.fandom.com/wiki/Original_Sin_2_Talents).** Indexed Undead rule and optional-talent boundary, corroborated by B1's actual ancestry section. No extrapolation to every healing exception.
- <a id="b9"></a>**B9 — [Lockpicking discussion](https://steamcommunity.com/app/435150/discussions/0/5717866822611228823/), July 15, 2021.** Firsthand explanation of Thievery versus lockpick consumption, not developer authorship or every scripted-lock exception.
- <a id="b10"></a>**B10 — chris-williams, [Items: Runes and Eternal Artefacts](https://gamefaqs.gamespot.com/ps4/236378-divinity-original-sin-ii-definitive-edition/faqs/81674/items).** Actual socket/type/removal and rune sections inspected. Conflicting detailed mystical-effect tables are not used.
- <a id="b11"></a>**B11 — [Runes help](https://steamcommunity.com/app/435150/discussions/0/1483232961031299515/), October 2017.** Actual community instructions and recipe hierarchy, corroborated by B10; not another professional review.
- <a id="b12"></a>**B12 — [Magical Items](https://divinity.fandom.com/wiki/Original_Sin_2_Magical_Items).** Substantive indexed frame/removal/upgrade account; direct page failed. Obvious resistance-table and generalized slot-count problems excluded.
- <a id="b13"></a>**B13 — [Frame and later upgrading discussion](https://steamcommunity.com/app/435150/discussions/0/2549465882926780590/), December 2017.** Specific player problem and replies; permanent combination distinguished from removable equipped rune.
- <a id="g1"></a>**G1 — Larian-hosted [Creating Campaign](https://docs.larian.game/Creating_Campaign).** Documented prepare/play/import/publish workflow read; no present Workshop availability test.
- <a id="g2"></a>**G2 — Larian-hosted [Scenes](https://docs.larian.game/Scenes).** Substantive indexed scene creation/decorating/encounter/surface workflow. Not inferred from an unwatched video.
- <a id="g3"></a>**G3 — Larian-hosted [Vignettes](https://docs.larian.game/Vignettes).** Actual written creation, choices, live editing and image-import instructions read.
- <a id="g4"></a>**G4 — Larian-hosted [GM FAQ](https://docs.larian.game/GM_Frequently_Asked_Questions).** Actual player-limit, reroll and scripting-versus-improvisation answers read. Documentation age and mod settings limit universal claims.
- <a id="g5"></a>**G5 — Larian-hosted [GM User Interface](https://docs.larian.game/Game_Master_User_Interface).** Indexed tool index; unfinished tutorial links explicitly not mistaken for absent shipped features. No claim to have read their nonexistent bodies.
- <a id="g6"></a>**G6 — Tom Marks, [GM hands-on with Larian](https://www.pcgamer.com/watch-larians-ceo-recreate-the-first-divinity-game-in-divinity-original-sin-2s/), May 9, 2017.** Substantive firsthand written assessment read. Embedded developer video remains an optional viewing route, not watched evidence.
- <a id="a1"></a>**A1 — Bandai Namco, [Revamped Arena Mode](https://en.bandainamcoent.eu/divinity-original-sin-2/news/revamped-arena-mode-comes-divinity-original-sin-2-definitive-edition), August 1, 2018.** Full primary description read; objectives, preset roster, coffers, mutators and access types. Not a current matchmaking census.
- <a id="u1"></a>**U1 — Larian, [official announcement history](https://steamcommunity.com/app/435150/announcements/), specifically “Gift Bag 4: Sourceror Secrets,” January 23, 2020, and “Gift Bag #5,” June 14, 2020.** Actual named bodies read. Separate event-ID recovery failed; the date/title and U2's stable article identify the relevant content precisely.
- <a id="u2"></a>**U2 — Anshar Studios, [Codename Potato](https://ansharstudios.com/codename-potato/).** Actual co-developer retrospective and Gift Bag 4 section read; partnership and selected-feature corroboration, not independent reception.

**Coverage:** R02/R03 builds and equipment §§1–3; R02/R06 author and participant actions §§4–5; R04 persistence/cost boundaries throughout; R05 five additional cases §7; R14 source identity and access §§6–8. These close the identified explanatory gaps without replacing the main dossier's broader R01–R14 research. No whole-packet preservation or all-130-subject certification is implied.
