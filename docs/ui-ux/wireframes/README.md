# Open Legend interaction layout proposals

[Feature specification](../../projects/game-interaction-redesign-feature-spec.md) · [Technical design](../../projects/game-interaction-redesign-tech-design.md) · [Actual game screenshot gallery](../screenshots/gallery.md)

These nine original diagrams make the proposed interaction concrete. They are static design illustrations, not a running game, new game artwork or screenshots of implemented behavior. They contribute **zero** to the reference-game screenshot count. Item initials and schematic figures stand in for eventual semantic artwork, while readable names demonstrate the fallback requirement. Illustrative objects, amounts and times do not define world mechanics. The five whole-interface proposals below use the [58-surface inventory](../interface-coverage.md) to distinguish current capabilities from proposed organization; they do not claim to illustrate every state of every surface.

## Desktop: keep both collections visible

![Proposed desktop inventory with belongings and the opened Camp chest side by side](https://assets.openlegend.ai/studies/public/blobs/sha256/e9/e9e49e03b2fbc63b64dbdc6e9e9a9f9dfbd5ee0fbd30b442c1aadc27dcf86a56)

Opening the object identifies the right-hand collection. Both grids remain while a selected stack exposes an explicit Move action. Dragging and quick-move are equivalent conveniences, not the only routes. A requested split remains local; routine transfer has no destination dropdown or second review. Sorting and search are per collection. Grid cells are display organization, not a new capacity model. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/28/2883dfa61f48517d7f19080fe27ef8bc353c4f3955d7aac3a5b1ee14e5fb337d)

## Narrow: preserve the same two endpoints

![Proposed narrow inventory with vertically stacked source and chest collections](https://assets.openlegend.ai/studies/public/blobs/sha256/6c/6c07e10c1ee939a3f464c71ce836c7227f340d60674224685faee4a4245b4b04)

The layout stacks two readable collections instead of squeezing columns or restoring the picker. The selected item and named destination stay clear, with an explicit non-drag action. This illustration is not a fixed minimum screen height: the implementation must manage actual available space, scrolling, enlarged text and short-window adaptation under the feature specification. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/2d/2d6ac480112d9d52798229fc1121c0360a706c34fcaa69f3ade6645de51e8543)

## Activity: selected object and consequential choices

![Proposed fire-care interaction showing selected fire, fuel source, stopping condition, maximum consumption and reserve](https://assets.openlegend.ai/studies/public/blobs/sha256/20/2048758c6110f1b30daaeae95cc1e05357de836aa9804a5acc4e82ad4049fdca)

The chosen fire is already bound. Ordinary Add fuel is a short item/amount action; the illustrated longer care task presents a readable plan with change controls for meaningful limits. Starting explains replacement of current work. The bottom strip illustrates later ongoing status rather than a second simultaneous state. Change requires a supported native amendment or deliberate replacement; editing the plan does not restart work. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/32/3290c4f6948ab912afe13072c661b4e89277759f7368e2a761e151632aadd9b2)

## Conversation: person, audience and readable history

![Proposed person entry and conversation with fixed composer and vertical speech volume](https://assets.openlegend.ai/studies/public/blobs/sha256/2e/2eb0dca487278c6a8952ee2977c6a6bc9f7db142d0be40e6e4ced7870ee7284f)

Talk starts from Ada and keeps that identity beside the transcript. History, volume and input have separate stable regions. The current growing composer, dots-only reply treatment and vertical volume direction are retained. Recipient/world/control draft transitions were implementation work when this proposal was drawn; the [current implementation evidence](../../verification/game-interaction-redesign.md#conversation-and-item-mention) records delivered scope and remaining gameplay qualification. Nothing in this picture proves a listener cannot overhear or that another character's thoughts are available. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/c9/c92521b8d2e41cd344d53e03d3218c86d77669989039685e7c8d4c579f6bb5cb)

## World HUD: inspect an object while keeping work visible

![World HUD proposal with authored condition meters, simulation clock, selected River camp bag, visible actions and a separate current-work strip](https://assets.openlegend.ai/studies/public/blobs/sha256/aa/aa358264dd0c0ba6c7a58c0b22d9f58a3b678c3f95c118dd2bda40e8eaaca4e2)

The scene remains the primary workspace. The selected bag has a readable identity and **Open** action, while ongoing fire-care work has a separate inspection route and **Stop all work** control. The adjacent consequence states its current native scope: it ends the current action, active plan and suspended work. This proposal does not imply task-only cancellation for queued or waiting plans, which lack a projected stable task identifier. Looking at the bag or opening its permitted contents does not silently replace that work. A small persistent set of named destinations makes menus discoverable; the three quick-action positions remain distinct from contextual suggestions. The schematic clearing is the main scene, not a proposed minimap. Camera bindings, permission-safe sight/hearing guides and simulation-time controls retain their existing meanings. The human example uses Health, Food and Energy only because those labels belong to that authored body. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/d8/d8320ae6555cd90bd0b1932f3cd279688a019c2ad47fe13ee6241f988256d59b)

**Coverage:** HUD-01–HUD-09 and PLAY-01/PLAY-05. This is a proposed arrangement of existing capabilities. It does not assert that the illustrated compact work strip or entire HUD is implemented, and it does not change the gesture contract in [World interaction](../world-interaction.md).

## Character: choose an action, then its missing target

![Targeting proposal with a substantially visible scene, highlighted Copper cup, compact character summary, optional candidate list and a short action strip](https://assets.openlegend.ai/studies/public/blobs/sha256/72/725f0ab41c938b19be421c14e099041aa646da281cd204dd6ca2b402218f8b98)

Targeting collapses the character sheet to a small summary and leaves the scene substantially visible and selectable. The already chosen **Pick up** action, exact selected object, Cancel and named commit stay together in a compact bottom strip. The selected portable object is highlighted in the world; the optional readable list offers alternate accessible selection of those same permitted candidates. The reservoir preset's Charged capacitor is explicitly unavailable for Pick up because it is a charge supply, not a portable item; it receives no eligible-target highlight. Hiding the list preserves the current selection. Neither route starts the action before **Pick up Copper cup**. The summary uses the existing construct preset's Integrity and Charge units; it adds no universal hunger, class, skill tree or action-point economy. Opening the full character sheet or choosing a different action remains a separate deliberate step. Describing another action can still require the existing clarification or configured-AI path. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/f4/f49c27275b843cf782acbc5e8b17a27c091daa61dae80eeb063f3dcf9263df86)

**Coverage:** PLAY-07–PLAY-08, HUD-06–HUD-08 and SHARED-02. This is a replacement presentation proposal for the current general action-intention form, not a delivered replacement. The target list must use permitted visible projections; it cannot infer reach, remote contents or success. [Existing action owner](../../targeted-actions.md) · [Construct preset](../../../packages/domain/src/world-presets.ts)

## Journal: distinct records, readable context

![Journal proposal with Story, Promises, Memories and Perceived events views; a selected spoken promise and known-person context](https://assets.openlegend.ai/studies/public/blobs/sha256/4f/4f799a6955b4fa434819c831a83fdaa0af14a32fe476882ea6be1c927e9a5a58)

Personal story, spoken promises, memories and perceived events are named views within a common reading workspace. A promise is shown as recorded terms, status and evidence; there is no invented quest checkbox, edit command, movement instruction or map marker. The related person is known to this character, which does not disclose their current location or private thoughts. Cross-links to a relationship or conversation are proposed navigation and appear only when the existing permitted record is available. Refresh and older-history controls retain the current selection and reading position. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/b8/b8c72419fda1fbe5a3bc712566a3914574786f162d50a35677cdbbd44cfb770f)

**Coverage:** READ-03–READ-06 and the ordinary private-knowledge route within CREATE-13. Combining navigation does not merge their authorities, imply one universal search endpoint, make promise status editable or expose the creator's objective family data. [Knowledge owner](../../knowledge.md) · [Memory architecture](../../memory-architecture.md)

## Settings and recovery: explain what a load replaces

![Settings and saved-world proposal with separate preference navigation, current session, named checkpoints and deliberate protected-load confirmation](https://assets.openlegend.ai/studies/public/blobs/sha256/e1/e147134169b5c36412f8b2e1a1931b5f11d6707f70cdebd89948b9384caca69a)

Readability, controls and session navigation stay separate from replacing saved gameplay. The save workspace identifies the selected checkpoint, simulation time, real capture time and compatibility, then explains the existing **Before last load** protection and paused restart before committing. A failed protection write refuses the load. Deleting a checkpoint requires its own separate confirmation; it is not a second meaning for Load. Forms remain appropriate for a checkpoint name and deliberate settings. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/88/88d4919cab6b3205a1533597ad1b733b8fece5f89a5070761d1f0fa2c08ec2b7)

**Coverage:** LIFE-03–LIFE-10 and SHARED-03–SHARED-04. This is an inline confirmation composition proposal, not a change to save authority or guarantees. Save controls are capability-gated. The separate blocking tab state retains the exact **Game Paused** / **OpenLegend is open in another tab.** / **Resume Here** / **Log Out** contract; no screenshot here claims to qualify that dialog. Durable save failure stays visible until acknowledged, and an unknown result requires original-request recovery. [Save/load owner](../../save-and-load.md) · [Feedback and recovery](../system-feedback.md)

## Creator Work: compare before opening exact review

![Creator Work proposal showing one saved recipe revision, a field comparison with the previous revision and a separate Open exact review action](https://assets.openlegend.ai/studies/public/blobs/sha256/6e/6e8dd7ec0c5c9648250e3c84598fcdb05285dd10f6600dfea2e5c8f882dcf1ed)

The authorized creator chooses saved Work, keeps its exact revision visible and compares meaningful fields with retained history. This illustration does not allow approval directly from a short comparison. **Open exact review** leads to the existing review owner, where candidate, affected records, checks and required versions are inspected before separate Approve and Apply actions. No world change is implied by saving, comparing or approving a proposal. [Editable vector](https://assets.openlegend.ai/studies/public/blobs/sha256/77/770ede56f64553cab45cff6dd216d2644bbc7c180b494dfef071dda4c299d35a)

**Coverage:** CREATE-01–CREATE-05 and SHARED-03. Deliberate recipe editing may use installed text/choice/numeric fields, Preview and Save a new revision. Other saved-work kinds retain their Conversation route. The three displayed fields are illustrative; this is not a universal dependency-cascade preview or a claim that every kind supports inline editing. Original Save/Prepare/Apply receipt recovery and changed-source review remain required. [Creator work owner](../../world-agent-inspection-and-edits.md) · [Workshop tools](../../invention-workshop-tools.md)

## Review scope

PNG versions were rendered and visually inspected individually for fit, readable labels, control placement and correspondence to the written proposal. SVG versions retain the same original layout for further design work. The five whole-interface additions are 1400 × 1020 desktop illustrations with design notes clearly outside the proposed game interface; Inkscape rendered their code-native SVG sources to PNG without external assets. These dimensions are drawing space, not production size or a minimum viewport.

These diagrams establish neither real input behavior nor accessibility. Keyboard/focus behavior, local child dismissal, narrow/short layouts, enlarged text, uncertainty, concurrent changes and native authority need implementation-specific verification. The actual-game J01–J16 journeys remain required for the prior runtime slice, and broader design acceptance must follow the full interface inventory. The drawings intentionally defer texture, item artwork, animation, exact production dimensions and implementation to the existing theme/component owners. No runtime source or test was changed to produce them.
