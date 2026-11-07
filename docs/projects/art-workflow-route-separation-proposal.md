# Art workflow: explicit routes and reliable delivery

**Status: preserved November 5, 2026 proposal; route changes remain unadopted.** This is not an operating instruction or approval to execute it. The current [workflow](../production-workflows/art-flows/README.md), [tool defaults](../production-workflows/art-flows/tools.md), skills and trackers remain authoritative. The [people design](people-from-parts-feature-spec.md) and Wayfarer pilot are already accepted; their family qualification remains open. References below describe the proposal's inspected state and do not reopen those settled decisions.

## 1. Intended outcome and evidence

A request such as “use Native for this character” should determine where generation runs, which account it uses, and what happens if a required tool is unavailable. The resulting character must meet the same concept, construction, fit, motion and export requirements as a Higgsfield result. An artist or agent should be able to follow either route without inventing missing steps or mistaking a technical demonstration for accepted artwork.

Keep one production procedure, with two explicit generation routes and independently selected rigging/motion methods. Most changes below reconcile existing instructions. Direct 3D readiness needs separate evidence; renaming a preset cannot supply it.

### Evidence inspected

This is a documentation assessment on November 5, 2026, with checkout HEAD `fe27cd3e19936135848528ddddbb4223c94d52d8` when inspection began. No new provider jobs, account checks, runtime tests or performance measurements support this proposal. Provider/model names below describe existing documented choices, not freshly verified availability or pricing.

| Current evidence                                                                                                                                                                                                                                                                   | Consequence                                                                                             | Proposed correction                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Tools: presets](../production-workflows/art-flows/tools.md#presets-and-overrides) defines both `standard` and `higgsfield` around Higgsfield; there is no `native` preset.                                                                                                        | “Use our pipeline” does not distinguish the routes Mike remembers.                                      | Name Native and Higgsfield explicitly; keep the default as a separate choice.                                         |
| The same section routes a named model through an already-connected platform.                                                                                                                                                                                                       | “Native, with Tripo” can be interpreted as Tripo through Higgsfield.                                    | Resolve the route before the model; require an explicit override to cross routes.                                     |
| [OD1](art-workflow-feature-spec.md#od1--default-generation-platform) records Higgsfield as the selected default, but retains an older “Today's default” paragraph. The [comparison scenario](art-workflow-feature-spec.md#4-scenarios) still describes Standard versus Higgsfield. | Current instructions and historical descriptions are easy to confuse.                                   | Keep the accepted default; make historical context explicit and update current examples.                              |
| [Technical design](art-workflow-tech-design.md#1-pages-and-owners) intentionally consolidated the former Standard and Higgsfield pages.                                                                                                                                            | Shared stages have one useful owner.                                                                    | Preserve consolidation; do not recreate two full runbooks.                                                            |
| [Direct-method UI study](../../art-direction/studies/2026-10-18-interface-direct-method/README.md) demonstrates direct 2D work; [direct 3D options](../production-workflows/art-flows/tools.md#other-platforms-opt-in) are listed as needing access.                               | Two equally proven end-to-end 3D routes are not established.                                            | Report readiness per stage, tool and tested output.                                                                   |
| [3D preparation and cleanup](../production-workflows/art-flows/3d-models.md) embeds model-specific view counts, credit estimates, orientation recipes and Higgsfield rigging constraints.                                                                                          | A provider limitation can be mistaken for a requirement of all art production.                          | Move execution details to tool sections; retain short conditional links at the relevant stage.                        |
| [Rejected family proof](../../art-direction/studies/2026-11-05-adjustable-people-proof/README.md#state) passed loading/pose checks while failing concept likeness and complete-body construction.                                                                                  | Technical success did not establish the requested result.                                               | Apply the existing visual and construction checks before dependent production, with explicit evidence for each claim. |
| [People procedure](../production-workflows/art-flows/people.md) accepts the pilot, while the feature spec's character scenario still says to await design acceptance.                                                                                                              | An agent can ask again for a settled decision or confuse design approval with production qualification. | Separate accepted design, authorized pilot and qualified reusable kit.                                                |

## 2. Terms and ownership

Use these terms consistently in the entry skill, settings table, plan line and study record.

| Term          | Exact meaning and owner                                                                                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow      | Shared stages: brief, explore, prepare, make, finish, check, preserve. Owned by the workflow README.                                                                                                                                                                              |
| Route         | How new image and geometry generation and eligible automatic rigging are accessed: `native` or `higgsfield`. Defined in `tools.md`. It does not select the art style, quality or body family. Motion keeps its shared selection policy subject to explicit provider restrictions. |
| Tool/model    | The actual generator or local authoring tool used for a stage. For hosted generation record the access platform as well as the underlying model.                                                                                                                                  |
| Access method | CLI, supported connector/API, website or local application. Changing access method on the same service is distinct from changing provider/account.                                                                                                                                |
| Quality       | Existing simple/full path: candidate and finishing depth. Neither path permits broken anatomy, missing requested parts or undisclosed source substitutions.                                                                                                                       |
| Finish        | Existing study/production/integrate scope. Production means usable files for the named consumer; integration includes the authorized game change.                                                                                                                                 |
| Fidelity      | Existing exact/faithful/interpretive setting, including the selected source and locked features. Independent of route and quality.                                                                                                                                                |
| Readiness     | What has actually been demonstrated for a stage and target. A documented preference or previous login is not proof of current access or successful export.                                                                                                                        |

The shared workflow owns required results and review points. Tool sections own access, parameters, input limits, costs, recovery and provider-specific preparation. The people procedure owns shared body construction and wearables; the animation procedure owns motion reuse and qualification. The selected world owns appearance rules and content. Asset storage retains its existing authority.

No runtime provider router, plugin framework, new package, database table or parallel artifact schema is needed. This remains an agent-operated workflow using existing tools and files.

## 3. Define the two routes precisely

### Native

Use the host's applicable image capability, local authoring tools, or authorized direct provider accounts. Native makes no new Higgsfield generation, rigging or motion calls without an explicit per-stage override. “Native” does not promise offline execution, free generation or an end-to-end local 3D model generator.

| Stage                                        | Proposed Native resolution                                                                                                                                                                                                              | Readiness limit                                                                                                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concepts, construction views and image edits | Use the host's applicable image tool when available and capable of the needed references/export; otherwise use the authorized direct image API already documented. Honor an explicitly selected model/provider first.                   | Host capability varies. Record the actual model/settings exposed; never invent unreported controls or billing.                                                                      |
| Image to 3D                                  | Use an explicitly selected authorized direct provider. If none is named, establish one qualified direct default in the roster. Direct Meshy is the first proposed qualification candidate because it already appears in the tools page. | There is currently no demonstrated direct default in the reviewed record. Until qualified, report the missing step; do not substitute procedural placeholder anatomy or Higgsfield. |
| Local construction and fitting               | Use the existing Blender methods and selected qualified family/parts. A request specifically requiring generated source geometry still requires that generation step.                                                                   | The adjustable family remains subject to its own pilot. A generic generated mesh is not automatically a compatible family member.                                                   |
| Rig and motion                               | Use the shared rig/motion procedures described below, with eligible direct/local tools and compatible existing clips.                                                                                                                   | The shared procedure must respect the Native provider restriction; it cannot silently acquire rigging or motion through Higgsfield.                                                 |

Direct Meshy is a proposed candidate for a small qualification, not a claimed best provider or an account-setup instruction. If a suitable authorized direct route already exists when work begins, evaluate its evidence before opening another account. A non-Higgsfield aggregator such as fal.ai must be named as the access platform when selected; “direct” must not hide the actual intermediary or billing account.

### Higgsfield

Acquire new images and geometry through Higgsfield's supported tools. Use its automatic rigging only for eligible individual-model work when the actual input and downstream edit requirements permit it. Blender finishing, family fitting, motion reuse, inspection and storage remain shared.

The route name does not promise that Higgsfield can generate a complete adjustable person, export a reusable garment, accept an edited model for rigging or supply the selected motion. Inspect the actual output and apply the relevant construction contract.

### Shared work, mixed requests and existing assets

- Reusing an approved, rights-compatible asset is allowed on either route regardless of its original provider. Record its provenance. A request forbidding even previously Higgsfield-derived inputs is an additional explicit constraint.
- A new family person uses its qualified shared skeleton. Selecting Higgsfield does not replace that skeleton with a fresh automatic rig for every garment or wearer.
- Existing compatible clips come first. Missing human motion follows the separately qualified motion route; selecting Higgsfield does not silently override it, and selecting Native does not mean self-hosted NVIDIA inference. If a selected motion service conflicts with an explicit provider restriction, resolve that conflict before acquisition.
- A request such as “Native concepts, Higgsfield geometry” is a supported mixed route. Record the stage choices directly; do not add a third full pipeline.
- Provider qualification and artistic acceptance are separate. A working API can return unusable art; an accepted image does not qualify a rig or wearable.

## 4. Resolve a request without hidden choices

Use the following order, once at the brief and again only when a relevant dependency changes:

1. Apply the user's current constraints, selected assets and decisions. Preserve settled selections on resume. An explicit new instruction overrides the previous route only for the scope it names.
2. Resolve any explicit per-stage provider/route choices. If they contradict a global restriction, ask about that conflict before dependent spending; do not invent which instruction wins.
3. Apply the explicit overall Native or Higgsfield route to unassigned generation stages.
4. Otherwise use the existing study's resolved choices for resumed work.
5. For a new unqualified request, use the separately recorded default route.
6. Within that route, choose the applicable tool from the current roster and verify the needed access, input/output capabilities and cost before spending.

**Recommendation: retain Higgsfield as the unspecified-request default for now.** That preserves the recorded OD1 decision. The proposal adds an unambiguous Native choice; it does not silently reverse the default. Mike can choose a Native default separately, with its direct 3D readiness gap visible.

“Standard,” “regular” and “default” should mean the current default route, and the plan line should expand that to its concrete name. They should not be stored as an additional provider preset. Treat “manual” as an interaction preference, rather than automatically mapping it to a provider; resolve from context or ask only when the distinction affects the work. Treat `both` as a request to compare Native and Higgsfield, not a third execution route.

**Model-only requests inherit the resolved route.** “Tripo” under Native means the authorized direct Tripo route; under Higgsfield it means a supported Tripo model there. If the required combination is unavailable, state that specific mismatch. Never treat availability on another platform as implied permission to change the chosen route.

Record a compact stage table only for applicable stages:

| Stage                | Selected tool and access platform       | Evidence/access needed                                      | Required output                        |
| -------------------- | --------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| Construction views   | Host image tool, Native                 | Reference editing available; selected source retained       | Matching covered-body views            |
| Body source geometry | Direct provider to be qualified, Native | Authorized account, usable multi-view output, bounded quote | Separate anatomical source mesh        |
| Family and outfit    | Blender, shared                         | Family pilot and selected garment sources                   | Editable body/parts and fitted exports |
| Motion               | Existing compatible clips, shared       | Target-rig compatibility                                    | Named clips on all proof bodies        |

This example intentionally exposes a blocked geometry stage. It is not a ready-to-run plan. A plan line for it would say: “Native route; selected Wayfarer concept; construction views first. Direct 3D access/qualification remains unresolved before body generation. The existing family proof requirements remain the acceptance target.”

## 5. Access, substitutions and recovery

These changes refine the existing access and spending rules; they do not grant new permissions.

| Situation                                                                                              | Required response                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same service/account is usable through another supported access method                                 | Continue through that method when it supports the required job and existing permissions. Preserve job identity and actual settings. A website login is not evidence of CLI authentication.                                                         |
| Browser upload or CLI sign-in needs a user/security action                                             | Ask once with the exact action and current blocker. After the reply, verify the specific capability. Avoid repeating an expired approval request or sending a sequence of speculative setup steps.                                                 |
| A chosen provider/model is explicitly locked                                                           | Stop that dependent stage if unavailable. Prepare a concrete alternative for Mike's decision; keep useful independent work moving.                                                                                                                 |
| No model is locked and the roster offers an authorized same-route alternative                          | State the alternative, its cost and material differences before dispatch; use it only if it meets the required inputs, outputs and fidelity within existing authority. This permits initial selection, not automatic paid retries after a failure. |
| A substitute changes route/account, source restrictions, promised output or a consequential art choice | Obtain the missing decision before executing the dependent work. A general art request is not permission to erase an explicit route choice.                                                                                                        |
| Submission times out or job status is uncertain                                                        | Recover the existing job before another submission. Keep uncertain spending reserved. A new access method must not create a duplicate paid job.                                                                                                    |
| A provider cannot export what the next stage needs                                                     | Report that exact limitation and the suitable available alternatives. Do not advertise a video/scene workspace as a mesh generator or a preview as an editable source.                                                                             |

Keep the task's shared spending ceiling across all routes and stages. Do not equate missing billing with zero cost. Apply the existing policy's distinction between task-launched provider charges and the coding assistant's own subscription billing; clarify ambiguous built-in image accounting rather than inventing either free usage or an unlimited liability. Do not buy access or raise the ceiling through a workflow fallback.

## 6. Give shared stages stable inputs and outputs

Use the existing study record, file layout and asset catalogs. Add no new serialized envelope. At each handoff, record only information the next stage actually needs:

| Handoff                            | Required information                                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selected concept → construction    | Exact selected image, reference roles/rights, locked features, dimensions, removable parts, selected-world appearance rules and unresolved views.                                                                           |
| Construction → generation          | Consistent views of one body or one wearable, physical scale, part identity, required format and geometry requirements. Adapt view count/order to the selected provider without weakening coverage.                         |
| Generated source → Blender         | Preserved original file, actual format, orientation/units, material maps, embedded body/garment parts, rig status, provider/job/settings and source limitations. A job URL is a recovery locator, not the durable artifact. |
| Family/garment authoring → motion  | Exact topology/rig/fit revisions, complete anatomical body, separate garments, weights, supported shape range and known failed combinations.                                                                                |
| Final export → review/preservation | Exact export, editable sources and assembly recipe, consumer checks, source comparison and acceptance status. Reference the existing storage inventory rather than copy it.                                                 |

Move provider-specific view limits, view ordering, named-model failure rates, polycount parameter conversions, credit figures and CLI examples into `tools.md`. Shared pages should say what must be true and link to the applicable execution recipe. Keep useful failure evidence in the tool recipe or original study; do not delete it.

For rigging, keep one shared dependency rule: **finish topology-changing work before binding, or explicitly rebuild/transfer and recheck the binding afterward.** Document Higgsfield's raw-candidate input restriction under its rigging recipe. If that restriction conflicts with canonical body topology or necessary repairs, select suitable family/Blender work or a separately authorized rig route. Do not force the family design to fit the provider's limitation.

## 7. Make delivery claims match the proof

The current simple/full paths, fidelity rules and review points already cover most of this. Tighten their application instead of adding a second acceptance system.

### Define what a proof must demonstrate

At the brief, list the requested outcomes and required visible evidence. “Proof” alone is not permission to reduce a request to loading a mesh or interpolating coordinates. A mechanics-only experiment must be explicitly scoped as such.

For the accepted three-body example, the evidence must show:

1. The selected concept beside the result at comparable scale and views, with any accepted deviations stated.
2. Two visibly contrasting complete bodies and the intermediate shape, with anatomical measurements. Changing overall scale alone cannot establish different builds.
3. Separate fitted baseline garments following the world-owned coverage rules. An intact body remains available beneath them; temporary review visibility and final occlusion masks must not be confused with missing anatomy.
4. The same identified outfit components fitted to all three bodies, including editable source and fitting recipe. Three unrelated generated outfits do not demonstrate shared fitting.
5. Required motion on each final wearer, showing difficult frames and relevant seams/clearances. A still image or a pose-validation count does not establish acceptable movement.

Use the existing early body/face approval before dependent wardrobe work. For the family pilot, put that review at the existing candidate-selection boundary; do not add a mandatory owner review for every ordinary garment or every reuse of an approved family. Technical export checks and artistic fidelity both need to pass their own criteria. Continue independent preparation while a real owner selection is pending; do not finish unselected dependent assets.

### Keep status factual and compact

Reuse the study record's separate facts: created, technically checked for the named consumer, owner-selected/accepted, archived and integrated. Distinguish selecting a concept from accepting its derived body and clothing. An output can be technically checked and rejected as art. These are statements in the record, not a new runtime state machine.

Consolidate obsolete design-approval wording in the feature spec against the existing people tracker. Preserve the distinct outstanding family qualification, source decisions and game integration requirements. Workflow cleanup does not close them.

### Candidate counts and economics — proposed experiment

Generic “three model candidates” can multiply over every boot, sleeve and accessory. The people procedure already permits reuse and review only where needed; clarify this precedence:

- Honor explicit candidate counts and requests to compare.
- Reuse the selected concept and qualified matching parts without another selection round.
- Apply whole-character direction choices once. For separate new parts, start with one candidate unless a real design/provider comparison is needed; add alternatives for a demonstrated mismatch or requested choice.
- Estimate the complete missing-source plan, including bodies, wardrobe, repairs, rigging and known outstanding charges, before committing to a paid batch. If it exceeds the budget, propose a concrete smaller authorized phase or request the extra budget; do not silently omit required parts.

The one-first part rule changes expected sampling effort and may reduce quality. Treat it as an experiment under §10 before adopting it as a general default. Keep the existing candidate defaults for unrelated props/creatures until evidence or an explicit decision changes them.

## 8. Readiness, world ownership and minimal loading

In the tool roster, distinguish **preferred**, **demonstrated for a stated input/output**, and **available in this session**. Record dated evidence and limitations beside the tool; do not infer access from an old machine's setup. Recheck volatile facts only for the stages about to run, not every provider on every request.

Native 2D evidence does not qualify Native 3D. A generated humanoid does not qualify the shared adjustable family. Kimodo remains conditional on its existing source/target qualification; do not turn it into an operational default by changing wording. Evidence remains reusable for compatible requests without a new qualification ritual per asset.

An explicitly authorized, bounded pilot can produce the missing qualification evidence. It must identify what it is testing and keep its results provisional until checked; lack of prior qualification does not make building the first qualified asset impossible.

Keep gender/frame choices, undergarment designs, outfit vocabulary and style in the selected world's owners. Shared instructions should refer to those choices without restating them as universal laws. Replace the shared 3D page's fixed 6.6 m/s travel check with testing at the named consumer's actual selected-world movement speeds; preserve the old numeric measurement in its evidence record. Do not change gameplay speed to match the art.

Load only the selected route's tool sections, subject procedure and actually needed motion/production sections. The entry skill should route to the default/selection table and short shared rules, then to the relevant details. Keep `/ol-design` a thin alias. No new root instruction or extra skill is needed.

This proposal adds no world state, appearance mutation, cognition prompt, AI context or runtime fitting work. Any future executable change must retain its own performance and correctness checks; the provider/documentation cleanup cannot qualify it.

## 9. Exact file changes after approval

Paths below are proposed edit targets, not files changed by this document.

| File/owner                                                                                              | Exact change                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Workflow README](../production-workflows/art-flows/README.md)                                          | Replace the Tools preset wording with explicit route selection and default semantics. Add the resolution order and concise per-stage plan requirement. Make `both` a comparison option. Preserve quality/finish/fidelity as independent settings. Update examples to show Native, Higgsfield and mixed routes without copying vendor commands.                                                                  |
| [Tools](../production-workflows/art-flows/tools.md)                                                     | Own the route table, actual default, tool selection rules, stage readiness and all provider-specific execution constraints. Separate model from access platform. Add the Native 3D qualification gap and selected candidate without claiming a configured account. Consolidate recovery/access rules, replacing permissive “connected platform wins” wording. Move the provider details from shared pages here. |
| [Art skill](../../.agents/skills/openlegend-art/SKILL.md)                                               | Replace duplicated default/synonym prose with a short link to the selection owner. Recognize explicit Native/Higgsfield and per-stage overrides. Require reading only the selected tool sections. Keep subject/people routing and scope rules.                                                                                                                                                                  |
| [Alias skill](../../.agents/skills/ol-design/SKILL.md)                                                  | Change only routing/examples if they conflict; keep it an alias, not another policy owner. Inspect the Claude adapter for the same issue without duplicating the skill.                                                                                                                                                                                                                                         |
| [3D procedure](../production-workflows/art-flows/3d-models.md)                                          | Retain neutral construction/export requirements. Relocate provider-specific view order/count, orientation settings, costs and raw-candidate rigging details. Add conditional links where those constraints matter. Use consumer/world-owned movement speeds in motion review.                                                                                                                                   |
| [People procedure](../production-workflows/art-flows/people.md)                                         | Clarify the early fidelity/complete-body check, reuse of identical garment sources across proof bodies and priority of part-specific candidate planning. Preserve the accepted design, pilot and qualification distinction. Add no duplicate slider/fitting specification.                                                                                                                                      |
| [Animation procedure](../production-workflows/art-flows/animation.md)                                   | State that image/geometry route selection does not replace motion policy or the target skeleton. Reuse existing source/target qualification rules and fallback behavior; do not expand the NVIDIA project.                                                                                                                                                                                                      |
| [Production procedure](../production-workflows/art-flows/production.md)                                 | Reconcile only conflicting provider assumptions or delivery claims. Keep existing finishing recipes and adequate shared checks.                                                                                                                                                                                                                                                                                 |
| [Study record](../production-workflows/art-flows/study-record.md)                                       | Extend the existing Settings/Construction fields with requested route, resolved per-stage tool/platform/access method and concrete substitutions. Reuse current cost/status/candidate fields and external inventories. Keep the table optional for single-step work.                                                                                                                                            |
| [Feature spec](art-workflow-feature-spec.md)                                                            | Make OD1's older default explicitly historical; state the current default once by reference. Update comparisons and tool-override examples; resolve stale people-design approval wording. Record any approved change to default/candidate policy as a real decision.                                                                                                                                            |
| [Technical design](art-workflow-tech-design.md)                                                         | Clarify shared workflow versus tool execution ownership and ordinary file handoffs. Keep existing helper architecture; no new provider service. Link any newly qualified direct recipe/evidence.                                                                                                                                                                                                                |
| [Art tracker](../maintainers/art-direction.md#art-flow-follow-through)                                  | Extend AF08's default/evidence reconciliation for this scope, with a link to the accepted proposal and explicit remaining Native 3D qualification. Preserve AF07/AF10/AF15–AF17 obligations. Use a new focused entry only if Native qualification is independently scheduled.                                                                                                                                   |
| [People tracker](../maintainers/art/people.md) and [guidance tracker](../maintainers/agent-guidance.md) | Reconcile PPL03 dispatch/qualification and CG05 installed-agent evidence only where affected. Do not mark production or agent compliance complete from formatting/link checks.                                                                                                                                                                                                                                  |
| Project navigation and decision history                                                                 | Add this proposal to the existing art-workflow project navigation when implementation/reconciliation is authorized; record accepted policy changes once in the existing history owner. Preserve historical studies and their original route labels.                                                                                                                                                             |

Search current instructions and examples for `standard`, `regular`, `manual`, `native`, `higgsfield`, `both` and “connected.” Review their meaning in context; do not globally replace words in archives, code or unrelated prose. Update current owners together; do not add compatibility preset versions or a parallel old workflow.

## 10. Verification and isolated experiments

### Documentation acceptance

After approved edits, run changed-file formatting and `pnpm guidance:check`, inspect links and anchors, and review the affected diff for lost constraints. These checks establish document structure only. Do not run game stress tests for prose changes or claim that these checks establish provider/art quality.

Walk the following scenarios against the actual revised instructions. For installed-agent qualification, use read-only, no-generation sessions and inspect selected instructions/tools rather than relying on the agent's claim that it complied. The cases below are a review checklist, not a request to add automated tests.

| Request/condition                                                         | Required result                                                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| New “make a character” request, no route                                  | Expand the recorded default to Higgsfield in the plan; still apply the people gate.                                                              |
| “Use Native,” host image tool available                                   | Select that applicable tool for 2D and an authorized direct choice for 3D; identify any missing stage before spending.                           |
| “Native with Tripo,” only Higgsfield Tripo available                      | Report missing direct access; no silent Higgsfield submission.                                                                                   |
| “Use Higgsfield,” CLI unavailable, signed-in website supports the job     | Continue via the website within existing permissions and cost limits; record the actual access method.                                           |
| “Native concepts, Higgsfield geometry”                                    | Preserve the mixed per-stage choices; common quality checks still apply.                                                                         |
| Resume selected views/candidate after a default change                    | Reuse the existing selection and route unless explicitly changed; recover outstanding jobs first.                                                |
| “Both,” Native 3D unavailable                                             | Report that the requested 3D comparison is blocked. Offer a concrete narrower comparison; do not silently declare a 2D-only comparison complete. |
| Motion-only request on an existing model                                  | Keep its body/rig; reuse or acquire missing motion through the animation procedure.                                                              |
| Image/model generator succeeds but fails source likeness                  | Record the visual failure and repair/reject before dependent finishing; technical success is insufficient.                                       |
| Garment request with qualified reusable part                              | Fit/reuse that exact part; do not generate three replacements solely because the full path is selected.                                          |
| Request starts in a package directory or mentions Higgsfield incidentally | Load the same applicable workflow for actual art work; incidental prose alone does not launch art execution.                                     |
| Estimate exceeds the shared task ceiling or prior charge is unknown       | Preserve existing work and accounting; resolve the bounded spend before dispatch.                                                                |

### Experiments with uncertain benefits

Do not claim that routing clarity automatically improves output quality, latency or cost. Measure uncertain changes independently, and keep failures from being hidden inside a combined before/after.

| Experiment                                   | Before/after with other factors fixed                                                                                                                                                                                              | Evidence and adoption condition                                                                                                                                                                                                                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route-selection instructions                 | Same frozen requests, host/model and available-tool description; old versus proposed route wording only. No paid generation.                                                                                                       | Record wrong-route choices, missing consequential questions, unnecessary questions, required context loaded and time to a usable plan. Required cases must resolve correctly; any substantial context/interaction increase needs a concrete benefit or simplification. Agent variability limits conclusions.   |
| Native direct 3D qualification               | Same approved views, output target, candidate count and finishing checks; established Higgsfield route versus the candidate direct route. Treat differing model versions as a workflow comparison, not a pure transport benchmark. | Record fidelity, topology/editability, source-to-export time, repairs, actual cost and manual actions. A single passing source establishes only its tested scope. Failure leaves the route unqualified; it does not justify a placeholder body. Current access, rights and bounded spending are prerequisites. |
| One-first candidate policy for modular parts | Same garment brief, provider/model/settings and finishing target; existing requested/default sample count versus one candidate plus explicitly needed revisions. Preserve all outcomes.                                            | Compare accepted fidelity, cost, elapsed/artist time, number of reruns and owner decisions. Adopt only if it meets the same deliverable without hiding added correction work. No blanket efficiency claim from one easy garment.                                                                               |

Use existing retained evidence where it truly matches the control. Record results once with the existing art/verification owner. No paid experiment is authorized by this proposal, and no plan/credit figures from older studies are a current quote. If a requested performance claim cannot be tested within access/budget, leave that claim unaccepted while completing independent documentation work.

Game performance and cognition responses are outside these prose experiments: no runtime/context change is proposed. If implementation later expands into live assembly, appearance storage, provider execution or gameplay prompts, isolate that executable change and use its owning performance/correctness evidence rather than citing this workflow proposal.

## 11. Recommended adoption order and decisions

1. **Reconcile route semantics and examples.** Approve the Native/Higgsfield definitions, explicit override rules and default behavior; update the existing owners together. Exit when the documentation scenarios are unambiguous and static checks pass.
2. **Reconcile delivery gates and provider details.** Apply existing fidelity/body/garment checks consistently, correct stale approval wording, consolidate tool-specific limitations and record per-stage readiness. Reuse existing acceptance owners; do not reopen settled design decisions.
3. **Qualify the Native stages actually needed.** Run only the smallest authorized missing-route check. Native 2D can be usable while Native 3D remains blocked; say so. Keep current paid work and job recovery coordinated with the active art task.
4. **Evaluate optional efficiency changes.** Try the part candidate policy separately. Adopt a changed default only with its measured limits or Mike's explicit choice.

Decisions for Mike when considering implementation:

| Decision                         | Recommendation                                                                                                                           | Tradeoff                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Default route when none is named | Keep Higgsfield until explicitly changed.                                                                                                | Preserves OD1; Native becomes explicit without implying current direct 3D readiness.                      |
| Meaning of Native                | Host/local tools and authorized non-Higgsfield generation, with exact access platforms disclosed.                                        | Clear provider separation; does not promise offline or free operation.                                    |
| Cross-route substitutions        | Require a decision when they change an explicit route constraint; allow supported same-service access changes within existing authority. | Protects intent while avoiding repeated permission for routine execution choices.                         |
| Native 3D first qualification    | Evaluate direct Meshy or an already-authorized suitable direct route before expanding providers.                                         | Adds concrete missing evidence; may require access and paid work separately scoped under the task budget. |
| Modular-part candidate counts    | Run the isolated one-first experiment before changing the generic rule.                                                                  | Potentially fewer jobs, with a real risk of more repair work or poorer alternatives.                      |

Everything needed to propose these changes is contained here. Implementing them, changing the default, authenticating providers, generating assets and qualifying tools remain separate from delivery of this proposal. Existing trackers are referenced for the eventual reconciliation; they have not been edited by this task.
