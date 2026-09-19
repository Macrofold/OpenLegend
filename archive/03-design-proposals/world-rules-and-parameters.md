# World rules, high-level parameters, and bounded invention

Recorded September 19, 2026. **Accepted direction from M05:** each world should define what can happen in ordinary gameplay; new mechanics may be developed during play within those boundaries; impossible requests under the selected world rules should be rejected with clear, friendly feedback. A realistic world rejecting magical ignition is the user's defining example. The exact parameter schema, classifier, presets, numeric limits, and default-world selection below are proposals, not implemented settings.

Related: [complexity management](simulation-scope-and-complexity.md), [interaction protocol](interaction-protocol.md), [capability lifecycle](generative-capability-lifecycle.md), [world architecture](system-architecture.md), and [time and speed](time-and-simulation-speed.md).

## Possibility and implementation are different

A world has a versioned profile that constrains generation and execution. Its capability library can grow inside that profile. “Not implemented yet” does not mean forbidden; “forbidden by this world's rules” does not mean merely awaiting a more persuasive model response.

In a world with ordinary physical causality and no supernatural powers, a plausible new physical ignition method can become a candidate definition. An incantation that produces heat with no admitted physical source is rejected. Both requests may share the desired result—an ignited tree—but propose different causes. Classify the cause, resources, and method as well as the outcome.

A one-line premise such as “mirrors reality” is useful authoring guidance but insufficient as the only enforcement mechanism. Resolve it into explicit domain policies, constraints, declared game concessions, and compatible registered rules. The semantic decision engine interprets and proposes; the authoritative validator enforces the resulting contract. Neither fluent narration nor a script pointer changes the profile.

## Separate layers of configuration

| Layer | What it controls | Examples and proposed treatment |
|---|---|---|
| Identity and versions | Which world and rules a request belongs to | World ID, profile revision, simulation/schema version, compatible capability set |
| Causal premise | What kinds of causes and effects can exist | Grounded realism; explicitly defined fantasy; supernatural powers absent or governed by named systems |
| Domain policies | What may be added and what remains outside scope | Thermal/material/construction domains allowed; absent, deferred, and forbidden are distinct states |
| Accounting and invariants | Requirements effects cannot bypass | Resources have declared sources/sinks; no duplication; finite rates; valid lifecycle and ownership transitions |
| Simulation detail | How deeply allowed behavior is represented | Coarse material categories, part-level damage, logical coverage; specific admitted approximations |
| Initial conditions and knowledge | Where this instance starts | Primitive group, local resources, existing tools, known techniques, starting population |
| Time and life rules | How work, needs, weather, aging, and absence advance | Base clock ratio, creator speed controls, aging/recovery policies; exact rates remain open |
| Environment and ecology | Conditions and replenishment | Climate ranges, seasons if enabled, resource renewal, world boundaries; no requirement to implement every knob immediately |
| Character and social capabilities | What actors can do or know | Bodies/skills, perception, learning, claims, trade; knowledge differs from a mechanic's existence |
| Gameplay permissions | What is permitted even when physically possible | Conflict/building/demolition permissions, protected areas, ownership, actor versus creator actions |
| Invention and execution policy | Which candidates can activate and at what cost | Allowed generation tiers, automatic admission envelope, bounded attempts, local rollout, affected-area/process limits |
| Presentation and feedback | How outcomes and limits are communicated | Direct/warm/playful tone, readable reasons, factual alternatives, visibility-aware explanations |
| Operational limits | What the deployment can afford/sustain | Model spend per real-time window, runtime/storage limits, queues, concurrency; never disguised as laws of nature |

The live instance holds inventories, current weather, agent knowledge, and pending processes. The world profile governs them; it is not a replacement for live state. A scalar such as `realism = 0.8` is not a sufficient explanation of which supernatural abilities exist.

A primitive starting society is an initial condition. It should not automatically impose a permanent technology ceiling. If a world creator wants a hard ceiling or excludes an entire domain, record that separately and explain it as a world/gameplay restriction rather than a universal physical impossibility.

## Proposed grounded profile sketch

This is illustrative documentation syntax, not a ready-to-run configuration. Values such as budget amounts, conflict policy, and recovery behavior still need selection. “Grounded realism” is a proposed initial preset; the user's example does not require every possible Open Legend world to use it.

```yaml
world_id: example_world
profile_revision: 1
premise:
  causal_model: grounded_realism
  supernatural_effects: disallowed
  consequences_require_admitted_causes: true

invention:
  enabled: true
  plausible_missing_mechanics: evaluate_as_candidates
  contradictions_with_world_rules: reject
  uncertain_requests: bounded_resolution_or_defer
  automatic_admission: within_validated_world_envelope
  scripted_algorithms: require_registered_compatible_artifact

simulation:
  default_detail: coarse_consistent
  refinement: demonstrated_gameplay_need
  rule_versions: pinned

starting_state:
  society: primitive_wilderness_group
  initial_knowledge: seeded_survival
  technology_ceiling: not_implied_by_starting_society

feedback:
  tone: warm
  light_humor: optional
  alternatives: only_supported_relevant_actions

game_concessions:
  creator_controls: separate_authorized_operations
  player_recovery: explicit_policy_required
  time_and_aging: explicit_policy_required

operational_limits:
  budget_profile: required_before_live_generation
  on_novelty_budget_exhausted: defer_new_generation
```

Normalize a profile into concrete effective values and validated references before enabling dependent features. Missing required budgets must not mean unlimited execution. Unknown domain policy does not silently enable that domain. Initial defaults and inherited presets should resolve to an inspectable immutable revision; later preset edits must not silently mutate running worlds.

Grounded realism can coexist with declared game concessions. The archive already requests creator time controls and forgiving player recovery. Those require explicit policies, not accidental dismissal or silently granting equivalent powers to ordinary actors. Clarify any exceptional resurrection/recovery fiction when chosen. A creator spawning an object through an authorized control is a distinct administrative operation, not proof that an NPC can conjure it by speaking.

## Admission and decision flow

The following outcomes describe different situations and should remain distinguishable in records and player explanations:

| Decision | Meaning | Next action |
|---|---|---|
| Allowed, supported | Existing compatible rule applies | Validate current prerequisites, then execute |
| Allowed in principle, missing mechanic | Consistent with the profile but implementation/definition is absent | Evaluate or generate a bounded candidate; success is not yet promised |
| Allowed, unavailable here | Legal action lacks materials, reach, skill, conditions, or permission | Explain the relevant observable limitation; do not invent resources |
| Forbidden by world rules | Proposed causality violates an explicit profile rule | Reject the forbidden effect; skip mechanism generation for it |
| Ambiguous or uncertain | Intended action, relevant property, or plausibility is unresolved | Bounded clarification/retrieval/judgment or an honest unresolved result |
| Deferred for scope or capacity | Plausible proposal exceeds current admission/complexity/operating envelope | Record or queue it as policy permits; explain that this is support/availability, not impossibility |

Resolve the actor's request and target, then perform cheap authoritative checks and scoped semantic classification where needed. Retrieve compatible existing mechanisms; decide whether a missing definition is allowed to enter generation. Check a generated candidate again before admission and revalidate actor permissions, live dependencies, and the current profile revision before committing an action. A generator's own assurance of compliance is not sufficient evidence.

This is not a mandatory model call for every action. Known menus and supported rule families can use deterministic checks. Obvious disallowed capability classes can be rejected without expensive generation. Unfamiliar language or causal ambiguity can use a small classifier or general model behind a provider-neutral interface. Jev remains an optional candidate for suitable bounded judgments, not a selected or infallible arbiter.

A decision record should identify world/profile revision, intent and referenced entities, proposed method/cause, candidate capability and its dependencies, decision/reason code, evidence references, uncertainty, permitted next action, expiration, and public explanation facts. Exact schemas and confidence thresholds remain open. Record admitted model decisions for replay rather than asking a model to decide past events again.

## Realistic world: fire, magic, and roleplay

| Request or circumstance | Proposed result |
|---|---|
| Use a supported physical heat source on a suitable target | Start the valid attempt; success depends on the existing ignition rules |
| Describe a plausible physical method whose recipe is missing | Evaluate a new definition inside permitted domains and budgets |
| Cast a spell that creates fire without an admitted physical cause | Reject the supernatural effect under the grounded profile |
| Say an incantation as roleplay | Speech/gesture may occur if actually requested; no magical heat is produced |
| Call a normal tool “my magic wand” while using its real capabilities | Evaluate the actual tool/method; do not reject merely because of a word |
| Use a physical source while theatrically pretending to cast a spell | Apply the supported physical action; observers may interpret it differently |
| Try the same spell in a fantasy world | Consult that world's actual magic rules, costs, and actor abilities; enabling fantasy does not make every wish succeed |
| Attempt to forbid/enable magic through an ordinary chat message | No profile change; world administration is a separate permission |

Reject based on meaning and causal claims, not a banned-word list. Residents may believe myths, perform rituals, or misunderstand events in a world without actual magic. Their beliefs do not rewrite the laws. Repeated reformulations or an invented property such as `natural_spell_heat` cannot bypass the same causal restriction.

The authority should require references to real source state and admitted source processes for consequential physical effects. A generic `adjust_temperature` operation cannot be used to disguise forbidden conjuring. Likewise, a material description supplied by a player cannot simply assert that it generates limitless heat. Generated definitions and script outputs must satisfy the same resource/cause constraints.

## Friendly rejection and truthful feedback

Give a short explanation of the world constraint and, when useful, one supported alternative. A profile can allow light humor, but never require ridicule. Repeated rejection should remain calm and concise. Technical classifier labels, prompt details, and internal implementation names are not player-facing text.

Suggested responses for the grounded spell example:

- Direct: “Magic cannot light a fire in this world. You need a physical source of heat.”
- Warm: “A spell won't do it here, but a physical source of heat might.”
- Lightly playful: “Trees here are unmoved by incantations. You'll need a physical source of heat.”

Alternatives must be relevant and supported; do not claim the actor owns a particular tool, knows a method, or can certainly ignite this target. A protected-area rejection must not pretend that wood cannot burn. A generation limit must not pretend that an otherwise plausible method violates physics. “I can't resolve that action yet” is preferable to a false impossibility claim.

Distinguish a preflight refusal from an executed failed attempt. A preflight rejection must not narrate speech/gestures, consume items, or record the tree burning. If the player actually performs a ritual, the observable speech/gesture and ordinary costs can be recorded, with no supernatural effect. If a physical ignition attempt runs and fails, report its actual resource use and observed result. NPC memory and public events derive from committed events, not the classifier's imagined outcome.

Filter explanations through permitted knowledge. The server can enforce hidden constraints without revealing a private ownership record, secret property, or another person's thoughts. Friendly narrative is generated from a structured reason and safe facts, with a short deterministic fallback if language generation is unavailable. Humorous phrasing has no authority to change the result.

## Versioning and ordinary play boundaries

Every action and generated capability binds to a world/profile revision. Recheck after asynchronous work: a decision made before a profile change may no longer be admissible. Cached interpretations and reusable mechanisms require compatible profile, material, rule, and relevant live-state dependencies. A cached fantasy-world success cannot authorize the same action in a realistic world.

Ordinary gameplay may add compatible capabilities; it cannot edit the governing premise. An authorized creator can propose a new profile revision through separate controls. Validate compatibility with saved objects, existing capabilities, and active processes; migrate, quarantine, or finish them under an explicit transition policy. A fundamental premise change may be better expressed as a new world, but that is a creator choice rather than a universal rule. Preserve prior decisions/history for replay.

The precise automatic-versus-reviewed admission boundary, parameter UI, magic-system schema, numeric resource ceilings, and transition policies remain open. Start with one small profile and readable rule checks. Do not build an elaborate multi-world configuration platform before the first world is playable.

## Evidence required before relying on the classifier

Test equivalent paraphrases; spells versus ordinary tools with magical names; real physical causes versus invented labels; roleplay without effects; missing recipes versus explicitly forbidden domains; unavailable resources versus impossible causes; other-world cache reuse; profile changes during generation; script outputs that omit causal inputs; finite retries; unavailable models/budgets; and hidden facts in rejection text.

Check both false acceptance and false rejection. The classifier should preserve valid novelty as well as reject contradictions. Test selected causal/resource invariants deterministically, use creator-authored and held-out judgment cases, and inspect uncertainty/abstention. A realism label or model score is not a proof of scientific plausibility. These are proposed acceptance scenarios; no classifier or runtime has been implemented or evaluated.
