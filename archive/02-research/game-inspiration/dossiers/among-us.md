# Among Us — full research dossier

**G02 · In progress, September 25, 2026.** This checkpoint records core rules and current role-design evidence. Remaining: the complete native role families, map/task/observation detail, Hide n Seek, cosmetic progression and monetization, art/audio/social access, full production/distribution/reception analysis, worked situations, and R01–R14 completion review.

This supplements the [preserved Among Us/Lethal Company chapter](../games/among-us-and-lethal-company.md). It does not substitute Lethal Company's mechanics or treat Among Us 3D, a television adaptation, community mods or an announced spin-off as the classic game's rules. [Requirements](../research-requirements.md) · [Resume ledger](../research-progress.md).

## 1. The player promise and main action vocabulary

The official game describes a party experience for **4–15 players**, online or over local Wi-Fi. Crewmates work toward completing the group task bar or ejecting the Impostors. Impostors kill, disguise intent by pretending to work, sabotage systems, exploit vents and doors, and try to remain accepted as crew. Reporting bodies and calling meetings turn events into discussion and a possible vote. Admin and Security provide information but do not make every player omniscient. [AU01](#au01)

**Interpretation:** there are two connected activities: moving through a space with incomplete evidence, and persuading other people about what that evidence means. Neither is merely an intermission before the other. Doing an ordinary task creates an alibi, an absence, a witness or a vulnerable moment; the meeting gives those details stakes.

A long weapon or loot catalog is not needed for this particular game. Its consequential resources include time, position, limited observations, role abilities, opportunities to call a meeting, and other players' willingness to believe a claim. Cosmetics are a separate object family, not equipment that is assumed to change combat power.

## 2. Tasks give innocent behavior a reason to exist

The 2020 GameGrin critic describes tasks such as rewiring, transferring data, a reactor sequence and a card swipe. Players can instead spend attention on surveillance, while dead Crewmates still have tasks to complete as ghosts. The critic values the approachable visual and control vocabulary but warns about explaining the after-death obligation to newcomers. [AU02](#au02)

**Interpretation:** the tasks are not primarily interesting because each minigame is strategically deep. They give a person a legitimate reason to be somewhere while drawing attention away from the surrounding world. A task that briefly occupies vision creates an opportunity for deception; an excessively demanding task could make observation impossible. The useful balance is between something meaningful to do and enough attention left to notice others.

In a January 2021 interview, Forest Willard explains that an early version kept the ship continually in crisis and allowed Impostors to perform tasks incorrectly. The team found it too stressful for detective work and informed conversation. Their solution changed the distribution of attention, not simply the amount of content. [AU03](#au03)

## 3. New roles change what evidence means

The September 2025 update added **Detective** and **Viper**. Detective's Notes organize a case, while Interrogate helps investigate whereabouts; only one case is active at a time and the host can adjust interrogation availability. Viper kills leave a corpse that visibly dissolves through stages, with configurable speed. The update also expanded role-learning and Practice interfaces. [AU04](#au04)

**Worked interaction:** a Viper uses a diversion to buy time before a body is found. Another player's suspicion may remain, but the opportunity to report that corpse can disappear. This is not the same as erasing everyone's memory or proving that no emergency meeting can ever occur. The difference between missing physical evidence and absence of suspicion is the mechanic's useful tension.

**Interpretation:** an information tool and an evidence-removal tool need not cancel each other numerically. They change which questions are worth asking and how quickly the group must act. The source establishes native rules, not the success rate of a particular tactic.

## 4. Judge: authority with a personal consequence

**Version boundary:** Judge arrived in **v18.0.0 on August 18, 2026**. Completing a configured number of tasks enables **Overrule**, a once-per-game ability to override the meeting's normal result. Choosing an innocent target ejects the Judge instead. When several Judges act, the first ability takes precedence and the others are refunded. A new Match Info Guide exposes the selected roles/settings, and Detective gained a post-meeting cooldown. [AU05](#au05)

**Worked choice:** a player holds strong but incomplete evidence and the rest of the group plans to skip. Overrule creates a way to act on that belief without persuading a majority. Its cost is not an arbitrary resource token: a wrong judgment removes the decision-maker. Delaying can permit more evidence, but also another killing. The source's particular rules do not establish an optimal timing policy.

### An unusually useful rejected-design account

The September 9, 2026 developer interview describes prototyping many roles and rejecting **Captain**, whose extra vote offered weak situational interest and could prove role identity, and **Skip Stopper**, which had a similar easy-innocence problem. An earlier Judge implementation ended discussion immediately when activated; the team changed it because it undermined conversation. They also identify resolving multiple simultaneous Judges as a concrete programming challenge. [AU06](#au06)

**Interpretation:** an ability can be mechanically functional yet damage the activity the game exists to support. More power is not automatically more interesting, and a role that can conclusively advertise innocence may weaken deduction. A meeting ability is useful here when it adds responsibility and tension without making discussion pointless.

## Sources inspected for this checkpoint

<a id="au01"></a>**AU01 — [Among Us official game page](https://www.innersloth.com/games/among-us/).** Primary premise/actions/current player-count description. Older ten-player review text is not treated as the current limit.

<a id="au02"></a>**AU02 — [Among Us review, GameGrin](https://www.gamegrin.com/reviews/among-us-review/), November 30, 2020.** Danielle Winter's original criticism, full written body inspected. Historical task examples, presentation and onboarding; future-role suggestions in the review are not shipped features.

<a id="au03"></a>**AU03 — [Forest Willard interview, Nintendo](https://www.nintendo.com/en-ca/whatsnew/among-us-dev-recounts-how-the-game-took-flight/), January 12, 2021.** Primary developer interview. Origins and rejected crisis-heavy prototype; the source's retrospective PC date is not silently substituted for a platform's exact storefront release date.

<a id="au04"></a>**AU04 — [Detective and Viper update](https://www.innersloth.com/new-roles-are-on-the-scene-of-17-0-0-emergency-meeting-41/), September 9, 2025.** Primary mechanics and learning-interface changes. Promotional claims and historical bug notes are not current representative reception.

<a id="au05"></a>**AU05 — [Judge release](https://www.innersloth.com/new-crewmate-role-the-judge-emergency-meeting-43/), August 18, 2026.** Primary Overrule behavior, competition handling and Match Info changes. Wrong target removes Judge; this is not assumed to mean both players are ejected.

<a id="au06"></a>**AU06 — [Behind the Beans: Judge](https://www.innersloth.com/behind-the-beans-judge/), September 9, 2026.** Original developer interview with design and programming staff. Rejected prototypes are not live role options; cited implementation challenge does not establish the full internal architecture.
