# Among Us — full research dossier

**G02 · Full research pass completed September 25, 2026.** This dossier covers the major systems and R01–R14 research dimensions. It is not a claim of personal gameplay, a complete source-code audit, or a representative player survey. Specific releases and source limitations are identified below.

This supplements the [preserved Among Us/Lethal Company chapter](../games/among-us-and-lethal-company.md). It does not substitute Lethal Company's mechanics or treat Among Us 3D, a television adaptation, community mods or an announced spin-off as the classic game's rules. [Requirements](../research-requirements.md) · [Resume ledger](../research-progress.md).

## 1. The player promise and main action vocabulary

The official game describes a party experience for **4–15 players**, online or over local Wi-Fi. Crewmates work toward completing the group task bar or ejecting the Impostors. Impostors kill, disguise intent by pretending to work, sabotage systems, exploit vents and doors, and try to remain accepted as crew. Reporting bodies and calling meetings turn events into discussion and a possible vote. Admin and Security provide information but do not make every player omniscient. [AU01](#au01)

The standard elimination pressure includes an Impostor victory when surviving Impostors reach parity with the other living crew, and a successful critical sabotage can also end a game. Kill and meeting cooldowns mean neither team can use its strongest interruption continuously. Dead players can communicate with other dead players rather than revealing everything directly to the living group. [AU23](#au23)

**Interpretation:** there are two connected activities: moving through a space with incomplete evidence, and persuading other people about what that evidence means. Neither is merely an intermission before the other. Doing an ordinary task creates an alibi, an absence, a witness or a vulnerable moment; the meeting gives those details stakes.

A long weapon or loot catalog is not needed for this particular game. Its consequential resources include time, position, limited observations, role abilities, opportunities to call a meeting, and other players' willingness to believe a claim. Cosmetics are a separate object family, not equipment that is assumed to change combat power.

## 2. Tasks give innocent behavior a reason to exist

The 2020 GameGrin critic describes tasks such as rewiring, transferring data, a reactor sequence and a card swipe. Players can instead spend attention on surveillance, while dead Crewmates still have tasks to complete as ghosts. The critic values the approachable visual and control vocabulary but warns about explaining the after-death obligation to newcomers. [AU02](#au02)

**Interpretation:** the tasks are not primarily interesting because each minigame is strategically deep. They give a person a legitimate reason to be somewhere while drawing attention away from the surrounding world. A task that briefly occupies vision creates an opportunity for deception; an excessively demanding task could make observation impossible. The useful balance is between something meaningful to do and enough attention left to notice others.

In a January 2021 interview, Forest Willard explains that an early version kept the ship continually in crisis and allowed Impostors to perform tasks incorrectly. The team found it too stressful for detective work and informed conversation. Their solution changed the distribution of attention, not simply the amount of content. [AU03](#au03)

### Sabotage changes the decision space

Sabotage is not only another route to a victory screen. The published actions let an Impostor create diversions, divide the crew and obstruct routes. [AU01](#au01) **Worked interpretation:** forcing a group to choose between continuing its ordinary objectives, repairing a danger and investigating a suspicious absence changes what an innocent person will look like. A character leaving a room is not necessarily fleeing a crime; the situation may have supplied a legitimate reason.

This makes explanation itself part of play. A world with only one reasonable response to a hazard would leave less room for meaningful disagreement. Conversely, a task system so busy that nobody can observe anything would undermine deduction, as the developers found in their prototype.

## 3. Native roles form a vocabulary of evidence, access and protection

The 2021 role release added **Scientist**, whose portable Vitals use a task-recharged battery; **Engineer**, who can vent; **Guardian Angel**, who can protect surviving crew; and **Shapeshifter**, who can assume another Crewmate's appearance. Hosts can configure role inclusion and probability. [AU07](#au07)

The June 2024 update added **Tracker**, who follows a selected player's location for a limited time; **Noisemaker**, whose death sends an audible and visual alert; and **Phantom**, who can disappear temporarily. The update also supplied a plain Core Settings preset and a role-heavy alternative. More roles are therefore not an unavoidable definition of the game. [AU08](#au08)

**Interpretation:** the important differences are not damage or character classes. A role can alter what its player knows, what others can infer, which route is available, or how a mistake can be survived. Adding Engineer, for example, makes the sight of vent use mean something different in a role-enabled lobby from a lobby with only the basic roles. A sound inference must know the active rules.

### Disguise changes evidence, not all identity

The documented Shapeshifter copies another living player's name, color and cosmetics for a limited period. The transformation is visible to witnesses, and an optional setting controls physical evidence left behind. Meetings restore the original appearance. [AU09](#au09)

**Worked situation:** a witness reports seeing a familiar appearance near a killing. Another witness saw that apparent person elsewhere. The disagreement may concern two observations that are both honest, not one person lying. Seeing the transformation or learning that disguise is enabled changes how the testimony should be interpreted. The ability does not make every accusation automatically false or supply proof of which person transformed.

### Low-input and high-attention participation can coexist

In a developer retrospective, Dave explains that Noisemaker intentionally serves people who do not want another active task. Some internal feedback found its passivity disappointing, but the team retained the low-input role. Tracker instead rewards deliberately combining movement evidence with later testimony. The developer describes these as different participation styles, not a hierarchy of worthwhile players. [AU10](#au10)

**Interpretation:** giving every inhabitant another button is not the only way to make them consequential. A passive consequence can matter greatly to the group. Equally, an information tool can offer depth because its output gains meaning when combined with another person's account rather than because its interface is complicated.

## 4. Detective and Viper change the life of evidence

The September 2025 update added **Detective** and **Viper**. Detective's Notes organize a case, while Interrogate helps investigate whereabouts; only one case is active at a time and the host can adjust interrogation availability. Viper kills leave a corpse that visibly dissolves through stages, with configurable speed. The update also expanded role-learning and Practice interfaces. [AU04](#au04)

**Worked interaction:** a Viper uses a diversion to buy time before a body is found. Another player's suspicion may remain, but the opportunity to report that corpse can disappear. This is not the same as erasing everyone's memory or proving that no emergency meeting can ever occur. The difference between missing physical evidence and absence of suspicion is the mechanic's useful tension.

**Interpretation:** an information tool and an evidence-removal tool need not cancel each other numerically. They change which questions are worth asking and how quickly the group must act. The source establishes native rules, not the success rate of a particular tactic.

## 5. Judge: authority with a personal consequence

**Version boundary:** Judge arrived in **v18.0.0 on August 18, 2026**. Completing a configured number of tasks enables **Overrule**, a once-per-game ability to override the meeting's normal result. Choosing an innocent target ejects the Judge instead. When several Judges act, the first ability takes precedence and the others are refunded. A new Match Info Guide exposes the selected roles/settings, not every person's hidden role assignment; Detective gained a post-meeting cooldown. [AU05](#au05)

**Worked choice:** a player holds strong but incomplete evidence and the rest of the group plans to skip. Overrule creates a way to act on that belief without persuading a majority. Its cost is not an arbitrary resource token: a wrong judgment removes the decision-maker. Delaying can permit more evidence, but also another killing. The source's rules do not establish an optimal timing policy.

### An unusually useful rejected-design account

The September 9, 2026 developer interview describes prototyping many roles and rejecting **Captain**, whose extra vote offered weak situational interest and could prove role identity, and **Skip Stopper**, which had a similar easy-innocence problem. An earlier Judge implementation ended discussion immediately when activated; the team changed it because it undermined conversation. They also identify resolving multiple simultaneous Judges as a concrete programming challenge. [AU06](#au06)

**Interpretation:** an ability can be mechanically functional yet damage the activity the game exists to support. More power is not automatically more interesting, and a role that can conclusively advertise innocence may weaken deduction. A meeting ability is useful here when it adds responsibility and tension without making discussion pointless.

## 6. Maps change opportunities to observe, travel and disappear

The principal documented map set is **The Skeld, MIRA HQ, Polus, The Airship and The Fungle**. The March 2025 matchmaking release presents five map choices; this is a dated interface reference, not a promise that no later map could ever be added. [AU21](#au21)

| Map / feature | Concrete distinction | Design interpretation |
| --- | --- | --- |
| The Skeld | The original ship provides the familiar task, corridor, vent and surveillance frame. [AU01](#au01) | A reusable place lets knowledge of timing and ordinary behavior accumulate. |
| MIRA HQ | Doorlog records passage through Hallway sensors; unlike several other maps, it does not supply the same sabotageable-door system. [AU18](#au18) [AU20](#au20) | Route history and direct visual witnessing are different kinds of evidence. |
| Polus | Specimen Room sits beyond decontamination spaces and connecting corridors; surveillance and Vitals are in other locations. [AU19](#au19) | A journey can create both practical exposure and difficulty explaining where someone was. |
| The Airship | New tasks, ladders, moving platforms and selectable starting rooms; its setting draws from The Henry Stickmin Collection. [AU17](#au17) | A meeting need not always return every participant to one identical subsequent route. |
| The Fungle | Beach, jungle and highlands; elevation changes vision, ziplines change movement, and Mushroom Mixup temporarily changes everybody's color/cosmetics. [AU16](#au16) | Terrain and temporary identity confusion alter the reliability of a familiar observation. |

### A sensor is not an omniscient narrator

MIRA's Doorlog registers living players passing three Hallway sensors. Its documented behavior records the original identity of a transformed Shapeshifter. [AU20](#au20) **Worked situation:** an appearance-based witness and a location log can disagree in a way that becomes explainable under the active role rules. The player must understand which property each evidence channel actually observes. A record of crossing a sensor still does not narrate every action between sensors.

Admin, camera observation, Vitals and role-specific tracking should likewise not be collapsed into one all-knowing map. The practical questions differ: where activity was detected, what someone looked like, whether somebody is alive, or where a chosen subject traveled. The official tools and map references establish these distinctions; this dossier does not invent a proprietary perception architecture.

**Interpretation:** a compelling mystery can be assembled from individually limited but reliable channels. The danger is giving a tool a visual presentation that implies more certainty than its actual rule provides. A player should not have to learn whether the interface is misleading before reasoning about whether a character is misleading.

## 7. Hide n Seek reuses the space but changes the game

The official mode asks Crewmates to survive a timer and shorten it by completing tasks. Crew have limited vent escapes; the Impostor cannot use vents. In **Final Hide**, tasks disappear, the hunter gains speed and receives a Seek map and periodic location pings. Only one Impostor is used. [AU11](#au11)

The danger meter and increasing music communicate proximity. Optional Flashlight Mode replaces circular sight with a controlled cone, and hiding names can improve concealment behind scenery. The developers explicitly trace the native mode to a community-created convention. [AU12](#au12)

**Worked decision:** spend one of the limited vent escapes now or risk a longer ordinary route. During Final Hide, moving after a revealing ping can be preferable to remaining in an otherwise good hiding spot. That is a spatial-survival problem rather than the Classic meeting's problem of proving identity.

**Interpretation:** the same world objects can support another finished activity when the objective, information and permissions change together. Merely adding a different label to the same rules would not provide this variation. It is also important not to import Classic vent logic into the alternate mode: the threat and the escape tool have deliberately changed sides.

The mode is a useful precedent for community invention becoming a supported product, not evidence that every mod or informal rule should become official. Clear entry points and tutorials protect players from assuming that the old rules still apply.

## 8. Items and progression: expression rather than combat accumulation

The item families include hats, outfits/skins, visor cosmetics, nameplates and pets. The developer explicitly separates these from gameplay advantage. [AU07](#au07) **Interpretation:** a recognizable favorite outfit can support identity without making an experienced purchaser more powerful than a newcomer. It can still influence how humans describe a person, so “cosmetic” does not mean culturally meaningless.

### The four resource roles are distinct

**Beans** are earned through ordinary online play and purchase selected cosmetics or Cosmicubes. **Stars** are premium currency. A **Cosmicube** is a themed branching unlock collection; its contents require **Pods**, earned only while that particular cube is active. Pods are cube-specific. **XP** raises account level and supplies currency multipliers on leveling rather than improving killing or detective abilities. A cube's purchase window may expire, while an owned cube can be completed at the owner's pace. [AU13](#au13)

**Worked choice:** owning several cubes does not progress all of them simultaneously. Activating one selects which collection receives the play-earned currency. This is a lasting account goal around rounds that otherwise reset their roles and outcomes; it is not persistent growth of the same fictional Crewmate's abilities.

**Interpretation:** acquisition and completion can be separated. Removing a completion deadline respects a different kind of time commitment from removing a purchase deadline. The remaining limited availability can still create urgency. A research reference should describe both rather than declaring the entire system either harmless expression or compulsory grinding.

### Named examples and a changing monetization model

The **Stardew Valley Cosmicube**, offered November 18, 2025–February 18, 2026 for earned Beans, included **Junimo** and **Krobus** pets, **Abigail's Outfit**, and a **Dance of the Moonlight Jellies** nameplate. Those are a historical cross-promotion and expressive item examples, not currently available products or imported farming mechanics. [AU14](#au14)

In December 2025, the mobile game added an optional rewarded-ad route to Stars, subject to account/region eligibility and a daily cap. The announcement says ordinary mobile play need not involve watching ads. This qualifies the older simple description of Stars as only a cash purchase; it does not make the rewarded option available identically on every device. [AU15](#au15)

The documented broader model combines paid PC/console access, mobile access and optional cosmetics, with ongoing server, support and development costs. The 2021 account explicitly connected cosmetic revenue with those obligations. [AU07](#au07) Neither the visual simplicity of the game nor a historical viral spike reveals title profit, current revenue or the cost of every future update.

## 9. Communication and finding an appropriate group are gameplay concerns

Classic's meeting discussion and task phase have different information permissions. The external voice calls used by some groups are not evidence of native proximity voice in this edition. The 2020 GameGrin account treats voice setup and finding a suitable group as practical parts of its experience, while preferring known players to arbitrary public lobbies. [AU02](#au02)

The current help documentation distinguishes **Free or Quick Chat** from **Quick Chat Only**, with Free Chat depending on an eligible logged-in account or appropriate parental permission. Temporary accounts cannot use it. This is product access documentation, not advice on bypassing restrictions. [AU22](#au22)

### Matchmaking can reveal the rules before commitment

The March 2025 overhaul exposes player speed and role inclusion in listings and filters for cooldowns, voting time, visual tasks, anonymous votes and confirmed ejections. Room-code entry allows checking host/capacity/region/chat details, and compatible region/chat settings adjust on entry when permitted. The team attributes the changes to feedback. [AU21](#au21)

**Interpretation:** an activity with configurable rules needs a way to find people expecting those rules. A player seeking deliberate deduction and one seeking chaotic quick rounds can each enjoy the same game while disliking the other's lobby. Matchmaking quality therefore cannot be reduced to whether a connection succeeded.

A fresh round resets a verdict, but a friend group remembers how people behaved. That social continuity is supplied by humans; it is not evidence of a native relationship model or generated NPC memory. Similarly, practice tools help learn controls but do not reproduce the unpredictability of human accusation, trust or persuasion.

## 10. Art, audio and narrative framing

GameGrin's critic connects the stylized appearance with the accessibility of older browser cartoons. [AU02](#au02) GamingTrend notes the contrast between simple task interactions and exaggerated killing animations. [AU23](#au23) **Interpretation:** the presentation makes a serious fictional act usable inside a playful social ritual. It does not follow that actual harassment between players becomes part of that ritual.

The April 2026 **Nostalgia Mode** temporarily restored older Crewmate, kill and meeting sprites where historical assets existed; it was optional and ended April 8. The developer identifies the original crooked visor and differing leg shape as recognizable details. [AU30](#au30) **Interpretation:** a very simple character still has a specific silhouette and visual history. “Low fidelity” does not mean arbitrary appearance or no accumulated identity.

Sound also does concrete work: Noisemaker's audiovisual alert gives others a location opportunity, while Hide n Seek's music grows more urgent with proximity. [AU08](#au08) [AU12](#au12) These are distinct uses of sound as evidence and pressure. An audio cue should be considered part of the action contract, not merely an atmospheric track beneath it.

### A story premise can leave the episode to the players

Classic supplies a small social premise—crew work amid hidden betrayal—rather than a branching authored campaign about a fixed cast. Map details such as the Airship's recognizable setting and the Fungle's crash-landed crew provide additional framing. [AU01](#au01) [AU16](#au16) [AU17](#au17)

**Interpretation:** a convincing accusation, a mistaken ejection or a successful rescue from a sabotage becomes the story because people participated in the causal chain. A narrator announcing that a betrayal occurred would not reproduce the choices that gave it meaning. The role's secret, the evidence and the listeners' judgment are all necessary parts.

The developer interview also values fans redrawing the simple characters in different styles. [AU26](#au26) That is evidence of expressive reuse, not permission to copy the game's distinctive designs into OpenLegend. Community fiction can be richer than the game's literal backstory without proving that its simulation generated all of that fiction.

## 11. Production: a small prototype acquired large obligations

Willard's Nintendo interview traces the idea to a Mafia-like activity and The Thing, with development beginning in late 2017 and a mobile local-play release in 2018. Online play was added when players could not reliably gather locally. The failed crisis-heavy prototype described in §2 shows that the team had to discover the right attention rhythm, not merely translate a board-game rulebook. [AU03](#au03)

In the September 2020 Escapist interview, Willard and Marcus Bromander describe repeatedly considering development finished, then returning because an existing audience wanted more. Willard recounts online redevelopment and intense server work during early waves of attention. The account describes a three-person team at that historical moment, not the studio's current headcount. [AU26](#au26)

### Supporting existing investment versus starting again

The September 23, 2020 developer announcement canceled **Among Us 2** to concentrate on the original. It identifies an old codebase, server load consuming programming time and the difficult need to rework core systems while serving the growing audience. Accessibility and account/friend features were future priorities in that announcement, not all already delivered then. [AU25](#au25)

The March 2021 Airship development explanation adds platform approvals, cross-device testing and moderation/account priorities. It explicitly warns that releasing an official cross-platform update is not equivalent to distributing a PC-only modification. [AU28](#au28)

**Interpretation:** a simple consumer interaction can sit on top of substantial coordination and service work. Growth may create revenue opportunities and simultaneously make delivery harder. “Just hire more people” or “it is only a small map” would miss the kind of integration the sources describe. These accounts do not identify the entire engine or justify inventing an internal architecture.

The 2024–2026 role-design accounts show continued prototyping, feedback and interface work, while the new Match Info and Practice views help players learn the resulting vocabulary. The important production pattern is connecting new rules with discoverability, not assuming that a patch note alone teaches everyone how evidence has changed.

## 12. Discovery, marketing and the difference between a clip and a customer

YouTube's October 14, 2020 report records **over four billion Among Us-related video views during September 2020**, about two years after release. It describes gameplay alongside animation, songs, memes, sketches and other formats, with creators of different sizes and substantial international viewing. These are video views, not unique players or attributed purchases. [AU27](#au27)

**Interpretation:** the game provides a compact situation a viewer can understand—someone lied, someone believed them, somebody noticed a contradiction. The character design also supports media beyond literal recorded play. Together these give a plausible mechanism for repeated cultural variation, but the public record does not allocate a percentage of growth to one streamer or one feature.

### Concrete promotion beyond the famous 2020 spike

The Fungle campaign scattered image pieces across social channels so the community could discover a zipline reveal. [AU16](#au16) Later collaborations supplied recognizable cosmetic collections; the Stardew example used earned currency rather than assuming every collaboration must be a cash-only purchase. [AU14](#au14)

The developer's May 2021 mobile update added Twitch-stream initiation and Discord room-code invitations, including PC/mobile invitation paths subject to account permissions. [AU31](#au31) **Interpretation:** these tools help convert an existing intention to show or join a game into an action. They do not create that intention or establish a measured conversion rate.

Cosmetic events, new roles, maps and supported modes offer different return occasions. A returning player can find new decisions without carrying an ever-stronger combat avatar between matches. But the same individual may still prefer moving to another game after satisfying their curiosity; that is not disproved by a large historical audience.

## 13. Reception: group quality and desired repetition matter

| Account | What it values | What it resists / what it cannot establish |
| --- | --- | --- |
| Danielle Winter, GameGrin, November 30, 2020 | Accessible controls, social deduction and a readable playful presentation. | Explaining ghost tasks and arranging suitable communication/groups can be friction. Historical feature state, not a current defect list. [AU02](#au02) |
| Elisha Deogracias, GamingTrend, November 11, 2020 | Short social rounds, cross-platform participation and the tension between work and watching others. | Some tasks feel like waiting; public behavior and historical disconnections interfere with the experience. [AU23](#au23) |
| Richiu, Metacritic, October 16, 2025 | Enjoys strategy and repeated fun with the right group; values device access. | Mentions occasional cheating. Their frequency and technical-quality judgments are personal reports, not an independent current audit. [AU24](#au24) |
| pikolano, Metacritic, April 18, 2026 | Acknowledges that more content was added. | Still finds the activity boring, especially without friends; explicitly allows uncertainty about that judgment. [AU24](#au24) |
| Will33, Metacritic, March 4, 2026 | Describes the game as genuinely fun. | Feels its appeal has run its course for them. This is not proof of business decline or a maximum possible design scope. [AU24](#au24) |

**Interpretation:** content breadth, social access and renewed desire are different variables. An additional role cannot guarantee a welcoming lobby; a perfect connection cannot supply friends; friends can enjoy an intentionally simple activity without needing an endless progression system. A useful inspiration library keeps those conditions visible.

The developer's Tracker/Noisemaker retrospective provides an instructive counterpoint to demanding a more active ability for everyone. Some people value another reasoning task; some value contributing without one. [AU10](#au10) The account of positive reception is the designer's assessment, not a representative audience result.

This full pass does not infer private sales attribution, verified age profiles, game profit or current total active users. Those gaps do not erase the documented mechanics, production decisions and reception disagreements.

## 14. Worked comparisons and transferable inspiration

**Task versus investigation.** A player can complete work or watch a corridor, but not devote equal attention to both simultaneously. The group benefits from progress and evidence in different ways. [AU01](#au01) **Interpretation:** delegation can be interesting when people contribute complementary outcomes, not merely identical resource production.

**A truthful witness can still support a wrong conclusion.** Shapeshifting separates seen appearance from actual actor. [AU09](#au09) **Interpretation:** an AI inhabitant should be allowed to draw a plausible mistaken inference from limited evidence without the world narrator canonizing that inference.

**A low-input participant creates a consequential signal.** Noisemaker's death can alert others without another active control. [AU10](#au10) **Interpretation:** a distinct role can arise from what happens around a character as well as what they manually initiate. More buttons are not the only measure of agency.

**The missing body does not remove the event.** Viper changes the reportable evidence, while memories and suspicions remain. [AU04](#au04) **Interpretation:** evidence decay can be a playable rule if the disappearance itself has intelligible timing and limits. It must not become permission for a generated narrator to rewrite history.

**A forceful decision can preserve responsibility.** Judge permits acting against the majority while attaching a direct consequence to error. [AU05](#au05) **Interpretation:** power becomes a decision when the user bears a legible cost; the developer's rejected instant-discussion cutoff shows why stronger control alone may damage the activity.

**A familiar route becomes a different problem.** The Airship changes starting position and vertical transit; the Fungle adds an identity-disrupting event. [AU16](#au16) [AU17](#au17) **Interpretation:** variation can change the practical meaning of existing rules instead of generating a wholly unrelated world.

**A reused map supports another emotional contract.** Hide n Seek trades deduction for survival under a known hunt, reversing vent access. [AU11](#au11) **Interpretation:** a reusable mechanic pack needs a clear finished activity and mode boundary, not merely a list of configurable permissions.

**Lasting expression need not mean lasting power.** A cosmetic collection persists while rounds reset. [AU13](#au13) **Interpretation:** continuity can attach to identity, memories or shared rituals rather than accumulating an advantage that makes new participation unattractive.

For OpenLegend, the strongest transferable principle is a **small understandable predicament plus genuinely different evidence and responsibilities**. The strongest caution is that a funny short-round betrayal is not automatically acceptable in a world containing weeks of personal construction. Consent, recovery and the player's expected role must match the loss policy. Human social improvisation is also not evidence that an autonomous character system already exists.

## 15. Reading routes, completion and preservation

Start with the official game overview, the two independent reviews and the March 2025 matchmaking explanation to distinguish the core activity from its social access conditions. The **Behind the Beans** articles on Judge and Tracker/Noisemaker give unusually concrete accounts of design alternatives. The official Hide n Seek release includes a linked trailer and a complete written how-to guide; the Shapeshifter announcement includes an illustrative capture. These are viewing pointers, not claims to have watched full footage or checked particular timestamps.

| Requirement | Coverage |
| --- | --- |
| R01 identity and scope | §1 and §7; classic/alternate-mode/other-product boundaries |
| R02 actions and mechanics | §§1–7; work, sabotage, observation, voting, roles and movement |
| R03 items and composition | §§3–8; ability families, counters, cosmetics and currency relationships |
| R04 progression, economy and time | §§1–2, §7–8; match outcomes, cooldowns, ghost participation, account progression and commercial separation |
| R05 concrete situations | Worked examples in §§2–7 and §14; limits and source/interpretation labels |
| R06 social/AI/multiplayer | §§3–7 and §9; human participants, communication, groups, solo practice limits |
| R07 art/audio/interface | §10; silhouette history, alerts, danger audio and readable configuration |
| R08 narrative | §10 and §14; authored premise, named places and participant-created episodes |
| R09 production | §11; prototype changes, small-team history, reinvestment and platform obligations |
| R10 promotion/distribution | §12 and §8; documented amplification, reveals, collaborations and invitations |
| R11 commercial context | §8, §11–13; historical business model and correctly defined reach, without invented profit |
| R12 reception | §13 with two original critics and three dated direct player accounts |
| R13 inspiration and limitations | §14 and labeled interpretations throughout |
| R14 evidence/navigation/preservation | This section and annotated references below |

**Per-game preservation:** the supplied master’s Among Us/Lethal Company comparison and the full repository chapter were inspected. The earlier account of tasks/roles, September 2020 sequel cancellation, server pressure, four-billion-view YouTube milestone, social-complexity interpretation, sharing hypothesis and persistent-loss caution remains in `games/among-us-and-lethal-company.md`, unchanged. Its Lethal Company field-guide insertion and video remain untouched and are not counted as Among Us research. The original source/metric ledgers were not overwritten. This dossier adds the missing independent Among Us coverage, not a replacement summary.

**Evidence limits:** primary and criticism bodies were read where marked; some community map references were only available through substantive indexed text. No gameplay was personally performed, no full video was claimed watched, and no current representative review or commercial-attribution dataset is supplied. Public current policy/feature statements are dated, not permanent guarantees. The packet-wide reconciliation remains a separate ledger gate.

## Annotated sources

<a id="au01"></a>**AU01 — [Official game page](https://www.innersloth.com/games/among-us/).** Primary premise and actions inspected September 25, 2026; older ten-player descriptions are not current limits.

<a id="au02"></a>**AU02 — [GameGrin review](https://www.gamegrin.com/reviews/among-us-review/), Danielle Winter, November 30, 2020.** Original full written criticism; historical tasks, presentation and group/ghost onboarding. Future feature wishes are not live features.

<a id="au03"></a>**AU03 — [Nintendo interview with Forest Willard](https://www.nintendo.com/en-ca/whatsnew/among-us-dev-recounts-how-the-game-took-flight/), January 12, 2021.** Direct developer account, full body inspected. Its retrospective PC month is not used as an exact storefront release date.

<a id="au04"></a>**AU04 — [Detective and Viper release](https://www.innersloth.com/new-roles-are-on-the-scene-of-17-0-0-emergency-meeting-41/), September 9, 2025.** Primary delivered rules and Practice changes. Historical bug notes do not establish today's defect prevalence.

<a id="au05"></a>**AU05 — [Judge release](https://www.innersloth.com/new-crewmate-role-the-judge-emergency-meeting-43/), August 18, 2026.** Primary Overrule, concurrent-use and interface rules. Wrong target ejects the Judge instead; no invented double-ejection rule.

<a id="au06"></a>**AU06 — [Behind the Beans: Judge](https://www.innersloth.com/behind-the-beans-judge/), September 9, 2026.** Direct design/programming interview. Rejected roles remain rejected prototypes, not shipped options.

<a id="au07"></a>**AU07 — [Roles and Cosmicubes release](https://www.innersloth.com/new-roles-cosmicubes-out-now-emergency-meeting-33/), November 9, 2021.** Primary roles, cosmetic-only power boundary and business rationale. Historical prices/account restrictions are not used as current guarantees.

<a id="au08"></a>**AU08 — [June 2024 roles update](https://www.innersloth.com/new-roles-enter-the-fray-v2024-6-18-emergency-meeting-38/).** Primary Tracker/Noisemaker/Phantom and configuration overview; exact article title and URL numbering differ on the site.

<a id="au09"></a>**AU09 — [Shapeshifter preview](https://www.innersloth.com/role-peek-the-shapeshifter/), October 27, 2021.** Primary behavior subsequently released in AU07. Visible transformation, configurable evidence and identity scope; no independent playthrough claim.

<a id="au10"></a>**AU10 — [Behind the Beans: Tracker and Noisemaker](https://www.innersloth.com/behind-the-beans-tracker-noisemaker/), October 3, 2025.** Primary design retrospective; feedback and reception statements are the designer's account.

<a id="au11"></a>**AU11 — [Official Hide n Seek how-to](https://innersloth.zendesk.com/hc/en-us/articles/10435021136788-How-to-Play-Hide-n-Seek).** Full mode guide; permissions differ from Classic. Exact settings can be configured by host.

<a id="au12"></a>**AU12 — [Hide n Seek release](https://www.innersloth.com/new-game-mode-hide-n-seek-is-here-emergency-meeting-35/), December 9, 2022.** Primary origin and audiovisual/vision rules; original matchmaking labels have later successors.

<a id="au13"></a>**AU13 — [Currencies and items help](https://innersloth.zendesk.com/hc/en-us/articles/7094991564820-Currencies-Items-Stars-Beans-Cosmicubes-Explanation), updated November 18, 2025.** Primary unlock/currency distinction. AU15 adds a later alternative route to Stars.

<a id="au14"></a>**AU14 — [Stardew Valley collaboration](https://www.innersloth.com/announcing-among-us-x-stardew-valley/), November 18, 2025.** Primary dated promotion and item list. The historical acquisition window has ended; no current shopping recommendation.

<a id="au15"></a>**AU15 — [Optional mobile ad rewards](https://www.innersloth.com/ad-rewards-v17-1-1/), December 3, 2025.** Primary phased release/account boundaries. No claim of uniform availability or current ad effectiveness.

<a id="au16"></a>**AU16 — [The Fungle release](https://www.innersloth.com/new-map-the-fungle-out-now-emergency-meeting-38/), October 24, 2023.** Primary map, sabotage and reveal-campaign details. Listed launch bugs are not carried forward as current defects.

<a id="au17"></a>**AU17 — [Airship live announcement](https://www.innersloth.com/airship-map-is-now-live-2/).** Primary features; the site's June 25, 2021 posting date is not used as the map's original March launch date.

<a id="au18"></a>**AU18 — [MIRA HQ, community wiki](https://among-us.fandom.com/wiki/MIRA_HQ).** Substantive indexed map text; direct access blocked. Native map, not a mod or 3D counterpart.

<a id="au19"></a>**AU19 — [Polus, community wiki](https://among-us.fandom.com/wiki/Polus).** Indexed location/observation text. Precise door counts on the page are not needed or adopted where inconsistent.

<a id="au20"></a>**AU20 — [Doorlog, community wiki](https://among-us.fandom.com/wiki/Doorlog).** Indexed sensor and disguise behavior. A limited record is not a full causal account of an entire route.

<a id="au21"></a>**AU21 — [Matchmaking 16.0.0 release](https://www.innersloth.com/a-match-made-in-update-16-0-0-emergency-meeting-40/), March 25, 2025.** Primary shipped filters and entry flow. Supersedes old roadmap intentions; not proof filters guarantee compatible people.

<a id="au22"></a>**AU22 — [Free Chat help](https://innersloth.zendesk.com/hc/en-us/articles/6711536647060-How-do-I-turn-on-Free-Chat), updated January 12, 2026.** Primary access requirements; not a legal analysis or permission-bypass instruction.

<a id="au23"></a>**AU23 — [GamingTrend review](https://gamingtrend.com/reviews/thats-suspicious-thats-weird-among-us-review/), Elisha Deogracias, November 11, 2020.** Full original criticism. Old ten-player/three-map counts and old ad/price statements are not current facts.

<a id="au24"></a>**AU24 — [Metacritic direct user posts](https://www.metacritic.com/game/among-us/).** Richiu (October 16, 2025), pikolano (April 18, 2026) and Will33 (March 4, 2026) inspected. Small self-selected sample; unrelated allegations and aggregate scores are not adopted.

<a id="au25"></a>**AU25 — [The Future of Among Us](https://www.innersloth.com/the-future-of-among-us/), September 23, 2020.** Primary sequel-cancellation and workload account; future features remain plans as of that post.

<a id="au26"></a>**AU26 — [Escapist developer interview](https://www.escapistmagazine.com/among-us-devs-have-created-a-gaming-phenomenon-albeit-two-years-after-it-launched/), Amy Campbell, September 22, 2020.** Full written interview with Willard/Bromander. Historical team, repeated reinvestment and fan-art response; its sequel plans were superseded the next day.

<a id="au27"></a>**AU27 — [YouTube Culture and Trends](https://www.youtube.com/trends/articles/among-us-september/), October 14, 2020.** Primary platform viewership report. Views are not purchases, people or revenue; the report's cultural explanation is not controlled attribution.

<a id="au28"></a>**AU28 — [Airship release preparation](https://www.innersloth.com/%F0%9F%93%A3-march-31-the-airship-releases/), March 18, 2021.** Primary explanation of cross-platform, approval and account/moderation work. Production constraints, not proof any particular staffing plan was optimal.

<a id="au29"></a>**AU29 — [Among Us mod policy](https://www.innersloth.com/among-us-mod-policy/), updated July 30, 2026.** Primary distinction between community modifications and officially supported behavior. Reference only; this dossier makes no legal interpretation or claims every mod remains compatible.

<a id="au30"></a>**AU30 — [Nostalgia Mode](https://www.innersloth.com/nostalgia-mode-arrives-for-april-fools/), April 1, 2026.** Primary temporary presentation event. Ended April 8; not represented as an always-available mode.

<a id="au31"></a>**AU31 — [Twitch and Discord mobile integrations](https://www.innersloth.com/twitch-discord-mobile-integrations/), May 10, 2021.** Primary distribution/social-entry work. Account eligibility applies; no independently measured conversion claim.
