# PEAK — full research dossier

**G47 · Research and identified audit remedies completed September 26, 2026.** Scope: the shipped PC game, including March 2026's Custom/Mini Runs and campfire saves, August's **Final Ascent**, and identified September maintenance/access changes. The August update completed planned major content; it was not the last modification ever. Console crossplay remains a stated future plan in the inspected support material, not a currently tested feature. [PK-B](#pk-b) [PK-C](#pk-c) [PK-P](#pk-p) [PK-Q](#pk-q)

[Preserved overview](../games/peak.md) · [Detailed mechanics study](../mechanics/peak-shared-burdens-rescue-and-spatial-tools.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

PEAK demonstrates how a small shared predicament can produce memorable social stories when position, information, limited supplies and physical help are real. A rescue need not be separately narrated into existence: separation changes what people know, communication helps locate someone, and a tool or another climber changes what can happen. This is research and conditional inspiration, not an accepted OpenLegend feature specification. No firsthand play, watched footage, soundtrack audition or current network test is claimed.

## 1. Identity, scope and current boundary

PEAK is a first-person cooperative climbing game made by Aggro Crab and Landfall collaborators under **Landcrab**. It released on Steam June 16, 2025. Stranded nature scouts climb an island's mountain, forage, manage their condition and help one another reach an escape. Solo and groups of up to four are supported. A compact premise makes the purpose immediately understandable without making the route easy. [PK-A](#pk-a)

Friend invitations are not public matchmaking. The September 2 update added **room codes** and a streamer option to hide them; it explicitly described this as preparation for ports. Thus older statements that access relies only on the Steam friends list are incomplete, but the update does not establish a public lobby browser or already released universal console crossplay. [PK-Q](#pk-q)

### Final major content versus maintenance

**The Final Ascent**, released August 11, 2026, introduced **Gloom** and **The Citadel**, another Ascent and additional tools. Landfall explains that the small joint team wants to return to its own studios' projects rather than turn PEAK into a perpetual service. Bug fixes continue. September's restoration of biome rotation and room-code work illustrate the distinction between completing major content and abandoning the product. [PK-B](#pk-b) [PK-C](#pk-c) [PK-Q](#pk-q)

## 2. The goal is simple; the decisions are not

The objective is climbing, not building an economic empire. Route, bodily position, stamina, afflictions, food, equipment, weather and other people determine how that objective is pursued. A rest point can be more valuable than another meter of elevation.

**Interpretation:** an activity can support emergence through interdependence rather than a large quest catalog. The relevant design question is whether another person changes the available decisions, not how many nominal systems exist.

## 3. Climbing and the stamina budget

Climbing spends stamina; stopping on a usable surface allows recovery. The visible bar also represents capacity lost to burdens and conditions. Running out of immediately available climbing energy and having the bar filled by incapacitating afflictions must not be treated as the same event. The latter can produce the downed state described in §13. [PK-D](#pk-d) [PK-R](#pk-r)

A player chooses the starting point, the next secure surface, a feasible length, a tool and whether help is needed. **Height gained** and **safety reached** are different outcomes. A strong temporary boost can leave the player stranded if it expires before a resting place.

**Interpretation:** this makes trajectory and aftermath part of an action's value. A planner that optimizes immediate distance while ignoring its end state has not solved the climbing problem.

## 4. Afflictions have related but nonidentical consequences

Injury, poison, hunger, cold, heat, spores and carrying burden can reduce useful capacity. Some subside or respond to particular remedies; others require more deliberate treatment. **Curse** can follow revival or certain powerful actions and does not simply disappear through ordinary waiting. **Petrify** instead constrains the bonus-stamina bar and can eventually crystallize the scout. The two bars and their failure rules should not be collapsed into one generic health meter. [PK-S](#pk-s)

**Interpretation:** several setbacks can share a practical consequence while retaining separate causes. That can simplify decisions, but only if the interface explains what is occupying the capacity and which response fits. More bars would not automatically be clearer; less explanation would not automatically be more immersive.

## 5. Carrying and inventory are route decisions

Food, healing supplies and climbing equipment improve future options while burdening the carrier. Dropping or consuming an object can change whether the next wall is feasible. The question is contextual: a rope that is invaluable at a later obstacle can make the present climb harder. Weight is not established here as a universal multiplier of running speed or fall damage; loose review language about being slower is not a substitute for the capacity rules. [PK-D](#pk-d)

**Interpretation:** a small inventory matters when its objects change reachable states. Unlimited abstract storage would remove both the individual tradeoff and some of the reasons to distribute responsibility across a group.

## 6. Backpack: shared access without global storage

A backpack supplies extra spaces. Its owner can put it down to manage it, while another scout can access it when worn. Contents still carry a burden. Possession, physical location, access and responsibility are therefore separate concepts. [PK-D](#pk-d)

**Interpretation:** a shared inventory need not become a magical group stash. A partner carrying the rope is a practical social relationship, but being unable to reach that partner can also be friction. The system needs understandable controls rather than treating laborious transfer as inherently realistic.

## 7. Pitons create intermediate safe states

A placed piton is a handhold for recovering stamina, not merely a percentage improvement to climbing. It divides one infeasible wall into shorter feasible stages and can help later teammates. Occupancy matters: one handhold is not a platform on which the whole group can recover simultaneously. Naturally occurring rusty variants also have different durability. [PK-D](#pk-d)

**Interpretation:** a small tool can change a problem's topology. It creates an intermediate state, which is richer than simply making the same action cheaper. The player should be able to distinguish an invalid placement from an inadequately prepared route.

## 8. Ropes, Anti-Rope and other traversal tools

An anchored Rope Spool creates a climbable route. **Anti-Rope** rises rather than hangs downward and can float away; its unusual carrying behavior and placement make it a different opportunity, not just better ordinary rope. The preserved study retains exact version cautions rather than assuming unlimited physical simulation. [PK-D](#pk-d)

The final update adds a **Jetpack**, which occupies the backpack role and consumes suitable fuel items, and a **Glider**, which enables horizontal travel but still spends stamina. Those are different exchanges: storage versus powered ascent, and altitude/stamina versus lateral reach. The announcement also identifies Warp Fungus as a new tool, without this dossier inventing a complete interaction table from its teasing description. [PK-C](#pk-c)

**Interpretation:** altering a familiar object's consequential property can create new routes while remaining understandable. Costs and failure states should follow that property, not be arbitrary punishments added after a clever use.

## 9. Food identification and cooking

Foraged food and packaged luggage supplies are not equivalent guarantees. Food can reduce hunger, supply bonus stamina, relieve a condition or impose another one. Its immediate benefit competes with the value of carrying it for later, and groups can allocate a scarce remedy to the person whose recovery changes the whole route. [PK-T](#pk-t)

Identification has actual cues. The documented poisonous **Button Shroom** has a spotted cap rather than the ordinary split-X marking; the poisonous **Cluster Shroom** has skirted stalks. These are concrete distinctions, not a verified claim that every mushroom's meaning is randomized each day. [PK-U](#pk-u)

Cooking usually improves a food's benefit, but is not universal purification. Further exposure moves through cooked, well-done, burnt and incinerated states; the middle stages do not imply an endlessly stacking upgrade. Heat can come from ordinary cooking sources or environmental interactions, with item-specific exceptions. [PK-V](#pk-v)

A **Red Prickleberry** illustrates cross-system preparation: it helps hunger/heat but in its raw form can create head thorns the eater cannot remove alone. Cooking removes that particular drawback. Eating, carrying, preparing and asking another scout for help are different solutions to the same resource problem. [PK-W](#pk-w)

**Interpretation:** uncertain consumption is interesting when observation and learning improve future choices. It is weaker when the only sensible approach is an external exhaustive food chart. Cooking should change a recognizable risk rather than award an unexplained universal safety flag.

## 10. Temporary power needs an exit plan

The preserved **Big Lollipop** example grants a temporary unlimited-stamina interval followed by Drowsy in its ordinary form. Later cooked variants have their own rules. The useful plan is reaching a stable post-effect state, not climbing as high as possible before the advantage ends. [PK-D](#pk-d)

**Interpretation:** a power can be extremely strong and still be bounded through timing, aftermath, position or dependence. An understood drawback creates risk; an undiscoverable one feels like a trap. Neither high power nor severe consequence is sufficient by itself.

## 11. Assistance and conflict are physical

Scouts help each other onto ledges, place route tools, carry supplies, locate separated players and take risks to recover someone. The same spatial and item rules also enable accidental or deliberate interference. Helping is meaningful because a particular person's position or resource changes another's outcome, not because the game merely announces cooperation. [PK-D](#pk-d)

The later **Cannibalism** mechanic is a deliberately macabre example of conflicting interests: sufficient hunger enables sacrificing another scout as food, with a Curse cost. A setting lets a player opt out of participating as either eater or victim. That narrow control is not blanket protection from every form of cooperative griefing. This is a fictional gameplay permission, not an endorsement of harm. [PK-X](#pk-x)

**Interpretation:** shared agency requires a contract about destructive actions, not only friendly invitations. The most important question for an AI companion is whether it notices, communicates, acts usefully, incurs a cost or needs help—not whether it can produce fluent rescue dialogue.

## 12. Proximity voice and partial information

Distance changes the communication channel. PC Gamer's reviewer describes a group separating in a snowstorm and using proximity communication to find and help a stranded member. The playable causal chain is separation → different knowledge → a limited signal → movement and coordination → changed outcome. [PK-E](#pk-e)

**Interpretation:** incomplete information can produce cooperation when there is a way to share it and a reason it matters. Simply hiding facts is not enough. A faint voice, visible gesture and dropped pack can communicate different kinds of information; no omniscient group narrator is required.

## 13. Downed, dead and recovered are different states

When afflictions leave no usable main capacity, a scout can become downed: ordinary movement, item use and speech are unavailable. The group has a limited opportunity to help before death. Carrying normally suspends that countdown, but the documented heavy-Spores exception prevents treating carrying as universally safe preservation. Appropriate recovery or decaying temporary conditions can restore participation. [PK-R](#pk-r)

Death changes the person to a ghost/spectator role. **Ancient Statues** and suitable revival items such as a **Scout Effigy** provide restoration opportunities; a campfire's saving function is not itself the same mechanic as the nearby statue's revival. Resurrection can impose Curse. The inherited parent/child Steam anecdote shows a dead player still guiding a survivor, not proof that death has no cost. [PK-R](#pk-r) [PK-S](#pk-s) [PK-F](#pk-f)

**Interpretation:** failure can change social participation rather than remove it entirely. A timed rescue, later resurrection and useful ghost guidance are three different responses, each with different dependencies. An inaccessible body or missing revival resource can still make a loss consequential.

## 14. Daily maps, custom runs and interruption recovery

The ordinary island changes on a daily cadence while allowing retries of the day's layout. General mechanical knowledge persists as local route knowledge refreshes. A new map does not require forgetting what a rope or food item does. [PK-A](#pk-a)

**March 30, 2026 — Play It Your Way:** the airport kiosk gained **Custom Runs**, with adjustable hazards, item availability and difficulty components, and **Mini Runs**, which isolate one biome of the day's map. Custom play disables achievements. Campfire autosaves allow leaving an expedition and continuing later; starting another expedition or completing/losing the run ends that save. Map-removing updates can invalidate it. **Chill Campfires** pause hunger and advancing fog while the group stays there. [PK-P](#pk-p)

August's update changed loading so the autosave is not consumed merely by loading it. September's patch additionally remembers items lying around the campfire, not only carried ones. Launch reviews saying there is no save were correct about their tested version, not the September 2026 contract. [PK-C](#pk-c) [PK-Q](#pk-q)

**Interpretation:** interruption recovery and fictional resurrection solve different problems. A game can preserve risk while letting players go to dinner. Custom modes also separate desired difficulty from compulsory exposure to a particular hazard; they should make the associated reward contract explicit.

## 15. Biomes change the operation, not only the scenery

The original Shore → Tropics → Alpine → Caldera → Kiln route and later variants must be distinguished. The first four include a lead-in and a climb; the volcanic finale changes the geometry again. The table explains the decision introduced, not an exhaustive spawn table. [PK-Y](#pk-y)

| Region or variant | Concrete pressure and resulting decision |
| --- | --- |
| Shore | Teaches route choice, luggage/food acquisition and manageable climbing before the later specialized environments. [PK-A](#pk-a) |
| Tropics | Poisonous plants and adverse weather complicate an otherwise plausible route; readable cover and timing become valuable. [PK-Y](#pk-y) |
| Roots, alternative second region | Wind affects movement and gripping; spores, pursuing creatures and limited bridges make position and group spacing important. Fungi and vines also supply traversal opportunities. Not every mechanic is a penalty. [PK-Z](#pk-z) |
| Alpine | Cold and storms make shelter or heat sources part of ascent planning. A geyser can warm a scout but also launch them; a helpful location carries a distinct risk. [PK-Y](#pk-y) [PK-AA](#pk-aa) |
| Mesa, alternative third region | Direct sun encourages shade, cooling supplies or another departure time; cacti, dynamite and moving hazards complicate travel. The canyon requires descending and climbing again rather than maximizing altitude monotonically. [PK-AB](#pk-ab) |
| Caldera and Kiln | Volcanic exposure and a climbing interior impose different safe intervals; rising lava supplies the finale's advancing pressure. [PK-Y](#pk-y) [PK-AC](#pk-ac) |
| Gloom and The Citadel, paired alternatives | Sleep-inducing fog and a wet, obstructed lower region make safe islands, trees and light useful. The tower replaces that traversal with a vertical route threatened by rising gloom. A light that improves visibility need not prevent Drowsy; those effects require separate checking. [PK-AD](#pk-ad) [PK-AC](#pk-ac) |

The announced two-week exclusive Gloom/Citadel period was extended; September 2 restored Caldera/Kiln to rotation and added smaller changes there. Do not repeat the planned duration as the complete realized schedule. The developers also revised Roots difficulty, so initial complaints are not automatically current balance. [PK-Q](#pk-q)

**Interpretation:** useful variation changes which familiar plan is sensible. A heat-resistant route, a rest-point chain and a shared narrow bridge test different aspects of the same compact vocabulary. Purely cosmetic terrain would not create those decisions.

## 16. Ascents: cumulative constraints and a different final objective

Tenderfoot and Peak are initial options; completing the standard route opens the Ascent ladder, with subsequent completions unlocking further cumulative constraints. One eligible participant can start a group's harder run, and group success can grant progression to others; this is not a requirement that every participant independently cleared every preceding tier. [PK-AE](#pk-ae)

The constraints change practical preparation. Higher tiers can make carrying a flare necessary, reduce environmental safety and raise the cost of mistakes. **Ascent 7 changed in August 2026:** it no longer forbids revival; it begins with Curse and makes revival add more. The stated reason was preserving participation rather than locking a dead friend out for the whole run. [PK-C](#pk-c)

**Ending-route spoilers:** Ascent 8 adds four Amulets associated with Scout Statues and a Nadir objective. The objects take inventory space and pull the party toward particular locations, but also have useful abilities whose use brings Petrify. Unlike the ordinary flare-dependent escape, this route's end interaction supplies its own completion. The objective changes what a successful expedition must carry and where it must go; it is not merely a larger stamina penalty. [PK-AE](#pk-ae)

**Interpretation:** a difficulty ladder can change logistics, recovery and purpose rather than only numerical severity. Version-qualified rules are essential when a formerly forbidden action—reviving—becomes possible but costly.

## 17. Badges, cosmetics and the value of repetition

Badges recognize particular actions and unlock visible cosmetics. They provide goals beyond one summit, but some depend on other people or favorable items/locations. An achievement that cannot currently be attempted is a different challenge from one that is difficult to execute. Custom Run restrictions also prevent assuming every configuration supplies identical progress. [PK-R](#pk-r) [PK-P](#pk-p) [PK-H](#pk-h)

**Interpretation:** mastery, luck and time-gated opportunity should not be confused. A badge can celebrate a memorable cooperative event without making every player repeat a low-probability setup solely to finish a list.

## 18. Solo and cooperation are different experiences

Solo is supported; friend-based cooperation is central to much of the criticism's enthusiasm. PC Gamer and Vandal find solitary play harsher or less appealing, whereas Games.cz finds it enjoyable in its own right. Helpful player accounts also describe solo mastery and finding new friends through community group-finding. These are different audience responses, not a rule that the game cannot be completed alone. [PK-E](#pk-e) [PK-AF](#pk-af) [PK-AG](#pk-ag) [PK-F](#pk-f)

A product asking players to bring their own group carries an access cost. Room codes reduce invitation friction without being equivalent to matchmaking or moderation. **Interpretation:** population, group availability and a good cooperative activity are separate conditions for social enjoyment.

## 19. What the game intentionally does not become

There is no large industrial crafting tree, settlement construction, permanent loot economy, conventional class tree, romance/faction simulation or native AI companion society established here. Cooking, deployable tools, a customizable scout and a configurable run do not secretly imply those broader systems. [PK-A](#pk-a) [PK-P](#pk-p)

**Interpretation:** emergence can come from a few objects with physical consequences. It need not be justified by an enormous item catalog. This makes PEAK a useful complement to, not a miniature substitute for, a persistent civilization game.

## 20. Authored framing and discovered mystery

The scout organization, crash, guidebook attributed to **Scoutmaster Myres**, island and escape supply a compact authored frame. GameSpot's December 2025 essay compares the growing mystery to Lost. Later statues and the final route add another layer without converting ordinary expeditions into a dialogue-heavy campaign. [PK-D](#pk-d) [PK-J](#pk-j) [PK-C](#pk-c)

Memorable stories can still concern a fall, rescue, shared meal, mistake or betrayal rather than the central mystery. **Interpretation:** authored lore gives actions a setting; the players supply a particular history through what actually happens. Neither layer replaces the other.

## 21. Art, sound and tactile feedback

Stylized scouts, cartoon-like surfaces, exaggerated bodies and environmental contrasts make failure readable and often funny. PC Gamer values the tactile climbing and sounds; Games.cz emphasizes animation and the voice channel's changing acoustics. These are attributed experiences, not a fresh sensory test. [PK-E](#pk-e) [PK-AG](#pk-ag)

A falling body, fading scream, visible ledge or inaccessible pack can explain an event more directly than a status paragraph. Weather and sound can also reveal danger before a player sees its source. **Interpretation:** an agent's success or failure should have observable causes; an eloquent explanation after the event is not always an adequate replacement.

Accessibility and reliability are distinct. March's alternative mushroom-enemy presentation and Custom hazard controls address different preferences, while later patches address item disappearance and input faults. A player who cannot tolerate an image and a player whose backpack falls through geometry have different problems. [PK-P](#pk-p) [PK-Q](#pk-q)

## 22. Production: narrowing an idea, not making everything in four weeks

The preserved creator interview describes an earlier broader pitch, a Seoul collaboration, three Aggro Crab and four Landfall contributors, and an intensive roughly four-week jam. It explicitly warns that the released game was not created entirely from scratch during that period. Prior work, experience, tools and later finishing effort matter. [PK-D](#pk-d)

**Interpretation:** the transferable production lesson is concentrating experienced collaborators on one worthwhile activity. A memorable travel story is not an audited labor budget or a reliable recipe for reproducing the outcome.

## 23. Finishing a product and continuing to care for it

The developers describe unexpected attention and support burdens and a wish to return to their separate projects. The final-update explanation rejects endlessly adding bloat or chasing engagement. Its continuing bug fixes and port preparation are consistent with that decision. [PK-B](#pk-b)

The same FAQ says the team deliberately did not adopt Steam Workshop after discussion with modders, including cross-platform limitations. An unofficial modding community and selective support are not a native Workshop feature or a promise of unrestricted official authoring tools. [PK-B](#pk-b)

**Interpretation:** a finished premium cooperative activity and an always-hosted persistent world inherit different obligations. An eventual OpenLegend business model should align expectations with actual ongoing work, not treat either perpetual expansion or abandonment as the only choices.

## 24. Marketing and the shareable incident

The pitch—climb with friends, where one mistake affects the group—is easy to demonstrate. Falls, rescue attempts, fading proximity voice, risky food and unusual equipment yield short understandable clips. WIRED's reporting discusses streamer-friendly comedy and the copycat problem following the breakout. [PK-K](#pk-k)

**Interpretation:** the useful sharing unit is an intelligible causal episode, not “streamers” as a universal explanation. A clip can convey interdependence, but does not reveal how often ordinary sessions produce it, whether the loss was enjoyable to its victim, or how many viewers bought the game. No channel-attribution percentage is invented.

## 25. Commercial context

The preserved research records **100,000 copies in 24 hours**, **one million in six days**, and a later **two-million-in-nine-days** milestone. It also retains the reported **ten-million-plus August 2025** context and Game File's January 2026 introduction describing **more than ten million copies sold during 2025**. These are attributed historical sales statements, not synchronized active-player totals or audited profit. [PK-K](#pk-k) [PK-L](#pk-l) [PK-M](#pk-m) [PK-AH](#pk-ah)

Historical reporting identifies a low standard price around $7.99 after the launch promotion. That is a dated pricing structure, not a current regional purchase quote. The hypothesis that inexpensive group gifting reduces friction is plausible; precise conversion, margins and marketing return are not established. PEAK's exceptional outcome is not a reasonable default revenue forecast for another game. [PK-M](#pk-m)

## 26. Five substantive written assessments

Five independent publications' actual substantive texts are now available, rather than five critic-index blurbs. The PC Gamer reading is retained from the original pass; four further texts were inspected in remediation. Game8's substantive indexed body was readable although its direct page failed. Czech and Spanish original texts were read and paraphrased in English. None assesses every subsequent update.

### 1. Elie Gould — PC Gamer, June 26, 2025

Gould values tactile climbing, group improvisation, daily layouts and proximity-driven rescue. Solo feels harsher and lonelier, and the tested graphics/API configuration produced instability. The snowstorm rescue is a concrete player account, not a generic claim that proximity chat always creates cooperation. [PK-E](#pk-e)

### 2. Allisandra Reyes — Game8, June 19, 2025; page updated July 11

Reyes values the group's equipment burden and mutual dependence, along with attractive presentation and environmental sound. Failed voice/network behavior and a camp-related bug interrupted play and forced an unwelcome restart. Her limited early progress and difficult solo attempt are not all-biome or high-Ascent testing. The earlier June 20 aggregate date is replaced by the article's actual publication/update metadata; later native autosaving materially changes the general restart context. [PK-AI](#pk-ai)

### 3. Michal Krupička — Games.cz, July 11, 2025

Krupička enjoys climbing movement, animation and sound, and finds solo worthwhile as well as cooperative sessions. He wants more dependable/deeper access to climbing tools and regards the game as a particularly good short social outing rather than an indefinitely absorbing multiplayer staple. That conflicts usefully with blanket dismissal of solo. The old July 15 index date is not the original article date. [PK-AG](#pk-ag)

### 4. Alex Van Aken — Game Informer, July 10, 2025, PC

Van Aken praises discovering item interactions and adapting routes to weather, then describes playful retaliation and races among friends. Rare items or people clipping through terrain become especially frustrating because the group depends on them. His explanation of virality is a critic's hypothesis, not measured acquisition data. His original biome inventory and broad zero-stamina language are not current-version rules authority. [PK-Y](#pk-y)

### 5. William van Dijk — Vandal, July 2, 2025; updated July 7, PC

Van Dijk values simple controls, joint route-finding and absurd group incidents. He criticizes communication/server failures, uneven biomes and a less compelling solo experience. His no-save statement describes the launch period and is superseded by the March 2026 feature. The review used a supplied code. Its opening discussion of local co-op and inconsistent metadata do not establish a native shared-screen PEAK mode, and anticipated community tools are not delivered features. [PK-AF](#pk-af)

### Preserved indexed leads, not additional full reads

The earlier **Checkpoint Gaming, June 24, 2025** excerpt appreciates tactile climbing, challenge and cooperative recovery. **Final Weapon, July 28, 2025** emphasizes friends-first chaos while criticizing bugs and weaker solo appeal. **IGN Benelux** praises strategic cooperation developing from simple climbing. Full original bodies were not recovered in this remediation; these observations remain index-attributed and are not used to satisfy the five-text minimum. The old Games.cz index route remains as provenance, now superseded for reading by the actual article. [PK-N](#pk-n) [PK-O](#pk-o)

**Synthesis:** appreciation for interdependence is widespread in this small set, but expected longevity, acceptable repetition and solo value differ. Treating all criticism as a single demand for more content would lose those distinctions.

## 27. Helpful Steam testimony and limits

The original pass's helpful-positive sample values friends helping and screaming, proximity voice, changing routes, rescues, ghost guidance, community group-finding and later biome additions. One previously inspected account was updated to praise Gloom/Citadel. These are the earlier recorded readings, not a newly extracted ranked sample. [PK-F](#pk-f)

The original negative sample objects to group dependence without public lobby search, solo pressure, limited long-run convenience and some cosmetic changes. Recent/default posts also contain ordinary frustration with hazards. Jokes and protest language are not adopted as mechanical evidence. Room codes, save changes and later biome work must be considered before converting older complaints into current absence claims. [PK-G](#pk-g) [PK-H](#pk-h) [PK-I](#pk-i)

Helpful votes, present playtime and publication date answer different questions. No representative satisfaction percentage, personal demographic inference or independent verification of every technical allegation is supplied.

## 28. Concrete situations

The five original cases are preserved and made more explicit. Cases A, B, D and F–H are constructed rules-based illustrations; C is based on the attributed PC Gamer rescue and E on inherited player testimony. They are not this researcher's play sessions.

### A. Place a rest point and change the wall

A scout faces a wall longer than current capacity, deploys a valid piton and divides the climb into two recoverable stages. The next climber can reuse it after occupancy clears. **Next decision:** advance or place another route aid. **Limit:** a piton is not a whole-group platform, and a failed placement does not grant imaginary support. [PK-D](#pk-d)

### B. Carrying help makes the helper less capable

A scout brings the group's food and rope in a backpack. The group gains options, while that person's burden reduces their own climbing margin. **Next decision:** transfer, consume, deploy or abandon supplies before the wall. **Limit:** calling goods communal does not remove their physical location or carrying cost. [PK-D](#pk-d)

### C. Locate a missing friend through incomplete information

A storm separates the group. A faint voice guides movement until the stranded partner is found and helped. **Result:** communication and physical intervention create a rescue rather than merely describing one. **Next question:** how much signal permits coordination without eliminating uncertainty? **Limit:** this was one critic's incident, not every expedition's outcome. [PK-E](#pk-e)

### D. Invert a material property

Anti-Rope rises from a position where ordinary hanging rope would solve a different problem. The scout uses that altered direction for access, then must prevent the tool floating away. **Next decision:** recover it or leave the route for another person. **Limit:** reversing one property does not imply unrestricted flight or perfect simulated rope physics. [PK-D](#pk-d)

### E. Die but remain useful

The inherited parent/child account has a ghost guiding a living climber. **Result:** embodied failure changes contribution rather than ending the social session. **Next decision:** continue guiding or pursue an available revival. **Limit:** useful observation does not restore the lost physical actions, and one account is not a population claim. [PK-F](#pk-f)

### F. Prepare food to avoid requiring a rescue interaction

A scout has a Red Prickleberry and needs relief before crossing hot terrain. Cooking removes its particular thorn drawback before consumption. Eating it raw might instead require another person to help remove the head thorns. **Next decision:** spend the cooking opportunity or accept that dependency. **Limit:** this recipe does not prove cooking purifies every risky food. [PK-W](#pk-w)

### G. A save solves an interruption, not a fictional injury

A group reaches camp but cannot finish the expedition tonight. It leaves and resumes through the campfire save rather than restarting all solved terrain. **Next decision:** continue the plan with the saved resources. **Limit:** a new expedition, run completion/loss or relevant map update can end that save; the feature is not a guarantee of eternal world persistence. [PK-P](#pk-p) [PK-Q](#pk-q)

### H. Route around objects that are both keys and tools

On Ascent 8, the group plans visits to Scout Statues and divides the Amulets among carriers. Each item occupies space but can help its holder; using it adds a different risk. **Next decision:** preserve it as a required key or spend its power to keep the expedition viable. **Limit:** losing an essential carried object can invalidate the route even when the climb itself remains possible. [PK-AE](#pk-ae)

## 29. Transferable inspiration and counterexamples

**Prototype one shared predicament before an entire society.** A modest crisis can test perception, communication, useful action, trust and rescue together. Complexity is justified by the decisions it produces, not by a large system count.

**Make help spatial and costly.** Travel, carrying, consumption and risk make another actor's contribution visible. An agent's narration should not substitute for those causes.

**Let tools create reachable states.** A rope, bridge, handhold, permission or introduction can open a route that a larger numerical bonus does not. Clear preconditions and ownership keep that freedom coherent.

**Use partial information where cooperation can address it.** A limited channel needs a reason to communicate and a consequential response. Opaque state with no possible inference is a different problem.

**Refresh situations while keeping their laws learnable.** Daily geography and evolving constraints need not randomly change every object's meaning. When a real patch changes a learned law, expose it.

**Separate ordinary interruption from fictional failure.** Campfire saves illustrate a way to respect players' lives without claiming every setback should disappear. Their limited persistence differs from a continuing shared world.

**Treat access and consent as social mechanics.** Invitations, codes, norms around harm and recovery permissions shape the experience. They are not merely networking details or a solved problem because friends joined successfully.

**Allow a successful product to have an endpoint.** Repeated play, mod interest and maintenance can coexist with completed major content. That is a different support contract from an indefinitely expanding world and should be priced and communicated accordingly.

## 30. Requirements, preservation and study routes

| Requirement | Substantive coverage |
| --- | --- |
| R01 identity and scope | §§1–2, 14–16; released modes, planned ports and update boundaries |
| R02 actions and principal mechanics | §§3–19; operational climbing, food, recovery, regions and modes |
| R03 objects and composition | §§5–10, 16; burden, transformation, fuel and key/tool dual use |
| R04 progress, time and loss | §§3–4, 13–17; daily maps, saves, Ascents and badges |
| R05 concrete situations | §28, eight preserved/extended cases with next decisions and limits |
| R06 people and social/AI boundaries | §§6, 11–13, 18–19; group entry, roles, conflict and absent systems |
| R07 presentation | §21 and distinct reviewer observations |
| R08 narrative | §20, named framing and spoiler-qualified final objective |
| R09 production | §§22–23; creator account, prior work and support decisions |
| R10 distribution and discovery | §§1, 23–24; observed routes versus causal hypotheses |
| R11 commercial evidence | §25, dated unit measures and explicit private-data limits |
| R12 reception | §§26–27; five substantive texts and inherited helpful-player evidence |
| R13 transfer and limits | §29 and case-specific counterexamples |
| R14 sources/preservation/navigation | this section and annotated register |

**Preservation:** the [original chapter](../games/peak.md) and [shared-burdens mechanics study](../mechanics/peak-shared-burdens-rescue-and-spatial-tools.md) remain intact. Their backpack, piton, rope, lollipop, voice-rescue and production arguments are preserved and linked. The earlier five situations remain. Index-only critical observations have not been erased or promoted into full reads; actual originals or independent alternatives now supply the required bodies. Dated launch absence claims are explicitly distinguished from later delivered features.

**Remediation boundary:** identified rules, review-evidence and source-locator gaps are addressed. Some mechanics pages were readable only through substantive indexed text; exact spawn, timing and edge-case tables were not independently played. This is not a new exhaustive fact-check of every inherited statement or a passed seven-input packet reconciliation. The ledger owns the branch's remaining games.

**Study route:** begin with the ordinary climb and capacity model, then compare one route tool and one food preparation. Read the five critics before interpreting a spectacular clip as a typical session. Next compare March's interruption/customization changes with August's recovery and final-objective changes. The preserved video links, Game Informer media and official update trailers are viewing routes, not footage represented as watched here. Major ending details begin in §16.

## Annotated sources

All new retrievals September 26, 2026. Publisher statements establish release and stated scope, community references describe observed rules, critics and players supply attributed experiences. Interpretations remain this dossier's analysis.

<a id="pk-a"></a>**PK-A — [PEAK Steam product](https://store.steampowered.com/app/3527290/PEAK/).** Landcrab/Aggro Crab/Landfall. Core scope, daily map and native play; not a current profit or compatibility test.

<a id="pk-b"></a>**PK-B — [Landfall PEAK FAQ](https://landfall.se/peak-faq).** Current support explanation; completed major content, mod-support limits and future console plans. Ending expansion is not a shutdown.

<a id="pk-c"></a>**PK-C — Landcrab, August 11, 2026.** [The Final Ascent, exact original](https://steamcommunity.com/games/3527290/announcements/detail/676254354515165310); [version-specific developer-text mirror](https://peak.wiki.gg/wiki/2.0.a). Original shell plus substantive official-feed/mirrored body inspected. Supersedes the generic all-games August 6 preview locator. Final content, changed revival and save rules; no footage viewing claimed.

<a id="pk-d"></a>**PK-D — [Preserved shared-burdens study](../mechanics/peak-shared-burdens-rescue-and-spatial-tools.md).** Earlier item, capacity, communication and creator interview evidence, with its own dates and limits.

<a id="pk-e"></a>**PK-E — Elie Gould, PC Gamer, June 26, 2025.** [Review](https://www.pcgamer.com/games/adventure/peak-review/). Inherited substantive body and specific group incident; launch-version experience.

<a id="pk-f"></a>**PK-F — [Most helpful Steam reviews](https://steamcommunity.com/app/3527290/reviews/?browsefilter=toprated).** Original September 26 sample retained; self-selected accounts and edited reviews, not a fresh sample in remediation.

<a id="pk-g"></a>**PK-G — [Steam review feed](https://steamcommunity.com/app/3527290/reviews/).** Inherited current-at-capture individual accounts; not authoritative current Ascent rules.

<a id="pk-h"></a>**PK-H — [English review surface](https://steamcommunity.com/app/3527290/reviews/?filterLanguage=english).** Inherited testimony about badges, randomness, value and group play.

<a id="pk-i"></a>**PK-I — [Helpful negative Steam reviews](https://steamcommunity.com/app/3527290/negativereviews/?browsefilter=toprated&l=english).** Inherited group-access, solo and convenience criticism; date and later changes must qualify absence claims.

<a id="pk-j"></a>**PK-J — Aron Garst, GameSpot, December 19, 2025.** [Lost-like lore essay](https://www.gamespot.com/articles/the-magic-of-peak-is-its-lost-like-lore/1100-6537069/). Earlier authored-mystery analysis retained.

<a id="pk-k"></a>**PK-K — Megan Farokhmanesh, WIRED, August 14, 2025.** [Copycat and discovery reporting](https://www.wired.com/story/ai-slop-is-ripping-off-one-of-summers-best-games-fighting-back-is-harder-than-you-think/). Inherited sharing and reported commercial context, not a source for legal conclusions or causal attribution percentages.

<a id="pk-l"></a>**PK-L — PC Gamer, June 24, 2025.** [One-million-copy report](https://www.pcgamer.com/games/im-gonna-crash-out-new-climbing-game-peak-has-sold-1-million-copies-in-less-than-a-week-outperforming-its-developers-most-popular-game/). Historical attributed milestone, not a live count.

<a id="pk-m"></a>**PK-M — Stephen Totilo/Nick Kaman, Game File, January 7, 2026.** [Interview](https://www.gamefile.news/p/peak-interview). Inherited accessible introduction for 2025 sales/pricing; paywalled remainder not represented as read.

<a id="pk-n"></a>**PK-N — [Metacritic critic index](https://www.metacritic.com/game/peak/critic-reviews/?platform=pc).** Preserved Checkpoint/Final Weapon/IGN Benelux excerpts and discovery routes. Not a substitute for full bodies or independent criticism itself.

<a id="pk-o"></a>**PK-O — [Earlier review index](https://videogamescritic.com/game/peak-3527290).** Preserved provenance for Games.cz's longevity/tool-depth summary; PK-AG now supplies the actual original and correct date.

<a id="pk-p"></a>**PK-P — Landcrab, March 30, 2026.** [Play It Your Way original](https://store.steampowered.com/news/app/3527290/view/526495718648578104); [full developer-text reproduction](https://www.gematsu.com/2026/03/peak-play-it-your-way-update-now-available). Reproduction read; original shell. Custom/Mini Runs, campfire saves, pause and accessibility changes.

<a id="pk-q"></a>**PK-Q — Landcrab, September 2, 2026.** [Official announcements](https://steamcommunity.com/app/3527290/announcements/), named entry **Patch 2.04.a THE KILN IS BACK**. Substantive body read: rotation, room codes, port preparation and campfire item persistence. This is a mutable title-specific feed; use the date/title, not an imagined standalone identifier. Later 2.4.C maintenance is separately dated September 14.

<a id="pk-r"></a>**PK-R — Community wiki, [How to play](https://peak.wiki.gg/wiki/Controls).** Substantive indexed downed/recovery, group and badge sections read; direct page blocked. The heavy-Spores carrying exception prevents universalizing the rescue rule.

<a id="pk-s"></a>**PK-S — Community wiki, [Stamina bar](https://peak.wiki.gg/wiki/Stamina_bar).** Indexed condition and Curse/Petrify distinctions, also surfaced through its Thorns alias. No numerical full-table or source-code validation claimed.

<a id="pk-t"></a>**PK-T — Community wiki, [Food](https://peak.wiki.gg/wiki/Food).** Indexed acquisition and effect categories; not an optimal recipe ranking.

<a id="pk-u"></a>**PK-U — Community wiki, [Button Shroom](https://peak.wiki.gg/wiki/Button_Shroom) and [Cluster Shroom](https://peak.wiki.gg/wiki/Cluster_Shroom).** Indexed visible identification cues. Their documented distinctions are preferred over unsupported claims of universally randomized mushroom appearance.

<a id="pk-v"></a>**PK-V — Community wiki, [Cooking](https://peak.wiki.gg/wiki/Cooking).** Substantive indexed stages and item-specific changes; no universal purification rule inferred.

<a id="pk-w"></a>**PK-W — Community wiki, [Red Prickleberry](https://peak.wiki.gg/wiki/Red_Prickleberry).** Indexed raw/cooked effects and head-thorn dependency; named example, not personally reproduced.

<a id="pk-x"></a>**PK-X — Community wiki, [Cannibalism](https://peak.wiki.gg/wiki/Cannibalism).** Indexed fictional action, Curse cost and opt-out scope. Not a general consent or safety guarantee for all multiplayer actions.

<a id="pk-y"></a>**PK-Y — Alex Van Aken, Game Informer, July 10, 2025.** [Full PC review](https://gameinformer.com/review/peak/a-brilliant-co-op-climbing-adventure). Complete substantive body read. Original biome/weather account, item dependence and specific frustration; broad shorthand is not current rules authority.

<a id="pk-z"></a>**PK-Z — Community wiki, [Roots](https://peak.wiki.gg/wiki/Roots).** Indexed route features, wind, bridge capacity and creature/spore hazards. Some fine-grained exceptions are marked unconfirmed by the source and are not repeated as validated facts.

<a id="pk-aa"></a>**PK-AA — Community wiki, [Geyser](https://peak.wiki.gg/wiki/Geyser).** Indexed warming/launching behavior; exact probability and radius not needed for the design example.

<a id="pk-ab"></a>**PK-AB — Community wiki, [Mesa](https://peak.wiki.gg/wiki/Mesa).** Substantive indexed sun, shade, canyon and hazard descriptions, also surfaced through Sun alias. Exact rotation probabilities and exploit advice are not promoted into a universal contract.

<a id="pk-ac"></a>**PK-AC — Community wiki, [Fog](https://peak.wiki.gg/wiki/Fog).** Indexed advancing pressure, lava and rising-gloom distinctions. Exact timers and boundary exploits excluded.

<a id="pk-ad"></a>**PK-AD — Community wiki, [Gloom](https://peak.wiki.gg/wiki/Gloom) and [The Citadel](https://peak.wiki.gg/wiki/Citadel).** Substantive indexed environment and paired-route descriptions, including the Belltower alias. Visibility versus Drowsy prevention retained as distinct effects.

<a id="pk-ae"></a>**PK-AE — Community wiki, [Ascents](https://peak.wiki.gg/wiki/Ascents).** Indexed progression and Ascent 8 details, surfaced through the Acent alias; direct body blocked. Spoiler-qualified keys, group progression and altered ending, not a personally tested optimal route.

<a id="pk-af"></a>**PK-AF — William van Dijk, Vandal, July 2, 2025; updated July 7.** [Spanish PC review](https://vandal.elespanol.com/analisis/pc/peak/207417). Full original body read. Actual cooperative experience and technical objections; unrelated local-coop framing and inaccurate metadata are not native-mode evidence.

<a id="pk-ag"></a>**PK-AG — Michal Krupička, Games.cz, July 11, 2025.** [Czech original review](https://games.tiscali.cz/recenze/peak-recenze-kooperacniho-horolezectvi-599500). Substantive original body read; positive solo response and limited-long-term-value criticism retained.

<a id="pk-ah"></a>**PK-AH — [Preserved original chapter](../games/peak.md).** Owns earlier attributed 100k/one-million growth evidence and its source register. Historical milestones are not remeasured in remediation.

<a id="pk-ai"></a>**PK-AI — Allisandra Reyes, Game8, June 19, 2025; updated July 11.** [Review](https://game8.co/articles/reviews/peak-game-review). Full substantive indexed text, including body and conclusion, read; direct open failed. Metadata, limited progress and historical saving/network problems distinguished.
