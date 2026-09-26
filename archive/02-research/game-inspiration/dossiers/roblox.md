# Roblox — full platform research dossier

**G04 · In progress, September 25, 2026.** This checkpoint covers the platform/player/creator distinction, concrete creation and reuse, persistence, social access and monetization families. Remaining: deeper art/audio and narrative examples, production and distribution history, current creator-reward details, contrasting creator/player reception, worked comparisons and R01–R14 review.

Read with the [preserved Roblox chapter](../games/roblox.md), [requirements](../research-requirements.md) and [resume ledger](../research-progress.md). Grow a Garden and Steal a Brainrot have their own required passes; their existence does not make their rules universal Roblox rules. Examples of other experiences below illustrate platform differences, not newly declared full case studies. This is inspiration/reference, not an OpenLegend architecture plan.

## 1. A platform supplies continuity around games with different promises

The official learning material distinguishes making **games**, **avatar characters**, and **avatar items**. A creator can specialize in one rather than build all three. Its basic game example is a platformer where collected coins buy jump power and enable reaching higher platforms. [RB01](#rb01)

**Interpretation:** the player's recognizable platform identity, the character's present abilities and the creator's reusable assets occupy different layers. A person can want to play an experience without wanting to learn Studio. An accessory maker can contribute without designing a complete progression system. Treating every participant as the same kind of “creator” would obscure what each needs.

The platform does not impose one combat, crafting, quest or death system on all games. Those belong to particular experiences. For the same reason, Roblox-wide participation is not a population estimate for one genre, camera or activity. The existing chapter's platform economics and individual experience examples remain separate evidence.

## 2. From a manipulable scene to a playable activity

Roblox's core curriculum moves from a greyboxed environment through coin collection, displayed player data, hazards and a jump-upgrade interface, then lighting, effects and polished assets. It supplies staged place files rather than only a completed showcase. Its current Assistant guidance explicitly leaves gameplay decisions, visual choices and playtesting with the creator even when routine objects or scripts are generated. [RB02](#rb02)

**Worked construction:** place an obstacle the starting character cannot clear; make a resource collectable; convert it into a movement improvement; let the new capability reach a previously inaccessible place. The official tutorial's point is an actual relationship between a resource and an action, not merely a leaderboard with a larger score. The creator must still decide whether collecting the resource is enjoyable and whether the route communicates the next opportunity.

**Interpretation:** a template is useful when it exposes a complete small activity and its modifiable relationships. A polished model with no purpose is a different artifact. Assistance that removes boilerplate can make iteration cheaper, but cannot establish that a player cares about the resulting goal.

Publishing also has meaningful stages. Current documentation distinguishes Private, Limited audiences such as playtesters, and Public. Public/limited publishing has account and content requirements, with additional conditions for reaching the Kids/Select audience. A game may contain more than one place. [RB03](#rb03)

**Interpretation:** testing, releasing and finding an audience are different milestones. A working artifact inside Studio is not already a discoverable product. Nor does an additional place automatically create a coherent journey; travel and continuity must connect it to the activity.

## 3. An avatar is portable identity, not guaranteed portable power

The appearance documentation describes games that use a player's platform avatar, modify parts of it or provide their own customization. Character appearance includes body proportions, accessories, clothing and animation. The Humanoid-based model supplies basic capabilities such as walking, jumping and equipping items, while appearance can also be applied to non-player characters. [RB04](#rb04)

**Interpretation:** a player may remain recognizable across different experiences without carrying the same inventory, permissions or power curve. A hat's portability does not establish that a sword from another game deals damage here. A world can preserve identity while controlling which abilities make sense in its rules.

The **R6/R15** distinction also demonstrates a compatibility boundary: the standard rigs differ in part structure and motion range. [RB05](#rb05) That does not make every custom character impossible, but it means an asset's intended body and behavior matter. “Supports avatars” is not a sufficient description of how all accessories and animations combine.

For inspiration, record what a reusable identity retains: appearance, animation, social recognition, achievements, possessions or capability. These can be deliberately different. Unlimited cross-world power would undermine many locally meaningful challenges, while refusing all recognizable identity would lose a different platform advantage.

## 4. Persistent progress is a promise implemented by each game

The documented DataStoreService stores things such as inventory and skill points across sessions and shares data across places of the same game, including different servers. It is server-side, and the documentation warns that Studio access can touch the live data unless a separate test version is used. [RB06](#rb06)

**Worked distinction:** leaving a server need not mean losing an earned item when the experience saves it appropriately. But platform support for persistence does not prove that every experience saves every state, or that an independent game can read and adopt the same inventory. A player returning to a project cares about the particular promise that experience made.

**Interpretation:** persistence is not only storing more state. It is deciding what continuity is meaningful, showing it correctly and protecting it during change. A reusable world platform should not imply that all downloaded mechanics automatically preserve every old achievement. The supported service and a well-designed continuity policy are different contributions.

## 5. Reusable packages preserve relationships, with update limits

Studio packages can be shared with permissions and retain a PackageLink. They support version updates and configuration, while removing the link turns a copy back into an ordinary object. Automatic updates occur when a place is opened in Studio, not indiscriminately in every live session. Modified copies are excluded from automatic updating, and a package can still depend on restricted assets its recipient lacks permission to use. [RB07](#rb07)

**Worked failure:** a creator adopts a working-looking package, but a dependent sound or image is unavailable to the destination. The outer artifact has transferred; the whole experience has not. Another creator locally modifies a copy, then expects a publisher's change to appear automatically; the modification intentionally changes that update relationship.

**Interpretation:** sharing has at least three contracts: what the artifact contains, what dependencies it needs, and how it changes afterward. A beautiful preview cannot substitute for all three. Protecting a local customization can be desirable even when it means an automatic fix does not arrive.

A package is also distinct from a finished game. A reusable door, vehicle or interface can lower production effort, while the receiving creator still needs a reason for the player to use it. The existence of a marketplace therefore cannot be counted as evidence that every artifact creates consumer value.

## 6. Collaboration and communication have separate permissions

Studio supports both simultaneous and asynchronous collaboration, with Owner, Edit and Play permissions. Its current Team Create rules include age-check and compatibility requirements; permission to edit is not always identical to eligibility to enter a particular collaborative session. [RB08](#rb08)

The June 2026 account release introduces **Roblox Kids** and **Roblox Select**, additional review for their game catalogs, and chat access conditioned on age checks and settings. A person without a completed age check cannot simply use chat because they typed an older birth date. Regions and parental controls qualify the defaults. [RB09](#rb09)

**Interpretation:** “my friend can join” has several meanings: joining the same game, reaching the same instance, chatting, collaborating on its files or altering shared progress. Product design must not promise all of these when it provides only one. Safety controls are documented mechanisms and goals, not independent proof that unwanted contact or harmful behavior never occurs.

These boundaries also shape creative practice. A team can have the skills to build something and still need to resolve legitimate access and coordination conditions. That friction is different from an editor bug or a lack of imagination; it belongs in production and community research rather than being ignored as outside the game.

## 7. Object value and monetization are not one universal economy

Roblox documents several product families: a **pass** grants a one-time purchased privilege; a **developer product** can be bought repeatedly, such as ammunition, a potion or in-game currency; subscriptions supply recurring benefits; private servers offer controlled group access; and the Creator Store distributes models/plugins to other creators. Avatar Marketplace items are another distinct supply. [RB10](#rb10)

**Worked contrast:** a cosmetic purchase, repeatable healing purchase and private session each change a different part of participation. Calling all three “items” hides whether the user is buying expression, immediate power or access to a preferred group. The experience designer must decide which benefits fit the intended activity.

**Interpretation:** a commercial interface can alter the emotional meaning of a problem. A difficult obstacle may be mastery, an invitation to cooperate or an irritation designed to sell relief. The same transaction mechanism supports different practices; its existence does not prove any one game is fair or unfair.

The current **Roblox Plus** announcement also separates subscriber discounts from creator proceeds: Roblox says it covers the discount and provides additional mechanisms around private-server engagement and subscription acquisition. It stopped new Premium sign-ups while existing memberships could continue. These are 2026 platform rules, not the older assumption that every subscriber program is unchanged. [RB11](#rb11)

## Sources inspected for this checkpoint

<a id="rb01"></a>**RB01 — [Learning tutorials](https://create.roblox.com/docs/tutorials).** Primary division between games, avatars and avatar items. Promotional accessibility is not a measured beginner success rate.

<a id="rb02"></a>**RB02 — [Core curriculum](https://create.roblox.com/docs/tutorials/curriculums/core).** Primary written tutorial structure and example, inspected September 25, 2026. The linked video/place files were identified, not played or fully watched.

<a id="rb03"></a>**RB03 — [Publish games and places](https://create.roblox.com/docs/production/publishing/publish-games-and-places).** Primary current audience/release documentation. Detailed private/limited definitions govern where introductory text is less precise.

<a id="rb04"></a>**RB04 — [Character appearance](https://create.roblox.com/docs/characters/appearance).** Primary capability/appearance distinction. Not a claim every game accepts every avatar unchanged.

<a id="rb05"></a>**RB05 — [Rig Generator](https://create.roblox.com/docs/studio/rig-builder).** Primary standard rig overview. Custom-rig possibilities and item-specific compatibility remain separate.

<a id="rb06"></a>**RB06 — [Data stores](https://create.roblox.com/docs/cloud-services/data-stores).** Primary service boundaries. Capability is not proof every game implements reliable saving.

<a id="rb07"></a>**RB07 — [Packages](https://create.roblox.com/docs/projects/assets/packages).** Primary reuse/update/asset-permission rules. No proprietary code or arbitrary live-update mechanism inferred.

<a id="rb08"></a>**RB08 — [Collaboration](https://create.roblox.com/docs/projects/collaboration).** Primary Studio access and workflow documentation. Current requirements, not a timeless description of every prior team experience.

<a id="rb09"></a>**RB09 — [Kids and Select global release](https://about.roblox.com/newsroom/2026/06/age-based-roblox-kids-and-select-accounts-now-globally-available), June 16, 2026.** Primary account/content/chat policy. Stated protections and intent are not an independently validated safety outcome.

<a id="rb10"></a>**RB10 — [Monetization documentation](https://create.roblox.com/docs/production/monetization).** Primary transaction families. Platform recommendations about cadence or player preferences are not universal design laws.

<a id="rb11"></a>**RB11 — [Introducing Roblox Plus](https://about.roblox.com/newsroom/2026/04/introducing-roblox-plus-subscription), April 10, 2026.** Primary subscription-transition and subsidy account. Exact current pricing is not required for this design comparison.
