# Client and web UI

React owns the HUD; PlayCanvas owns scene presentation behind [WorldRenderer](src/world-renderer.ts). Consume public DTOs and send intentions. Never import the server-only AI package, expose credentials or infer hidden world facts for UI convenience.

For UI changes read the relevant [design-system guidance](src/design-system/README.md). Reuse React Aria controls, tokens and existing connected-panel patterns. Preserve keyboard/focus behavior, accessible names, reduced motion and text rendering for user/model content; trusted repository SVG is not permission to render arbitrary HTML. Do not add a UI/motion/state framework to solve a local interaction.

Keep one owner per state value; derive display values instead of syncing redundant state through Effects. Effects synchronize external systems and clean up resources; reject stale async results. Keep per-frame work outside React updates unless the UI actually changes. Match memoization to measured work and stable dependencies, not blanket rules.

For camera, picking, assets or scene lifecycle use the [PlayCanvas skill](../../.agents/skills/openlegend-playcanvas/SKILL.md). Browser interaction and visual verification matter for UI changes; a passing typecheck cannot demonstrate them. [Verification](../../.agents/rules/verification.md) defines the current workflow.
