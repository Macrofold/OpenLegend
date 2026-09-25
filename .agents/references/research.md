# Research and scope of the guidance

Reviewed 2026-09-24. This is an optional source/rationale record, not an additional instruction bundle. Sources describe their own systems; the resulting OpenLegend policy is deliberately narrower than adopting every recommendation. Volatile tool-loading behavior should be rechecked when an adapter changes.

## Agent engineering

- [OpenAI: Rethinking skills and prompts (2026-09-11)](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra): prune accumulated instructions, make skill descriptions selective and specify outcomes rather than over-scripted execution. Applied as conditional routes and short reusable procedures, not a dependence on one model.
- [OpenAI: Harness engineering](https://openai.com/index/harness-engineering/): repository knowledge should be navigable, with mechanical checks for enforceable structure. Applied as a root map, existing design owners and a small guidance checker; not an excuse to generate a large parallel documentation system.
- [Anthropic: Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): high-signal context, appropriate instruction altitude and on-demand retrieval. Applied by separating permanent boundaries from task procedures and optional references.
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices) and [long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): clear outcomes, useful verification and durable progress. Existing focused trackers supply continuity; no second progress diary or mandatory planning ceremony is added.
- [Evaluating AGENTS.md (2026)](https://arxiv.org/abs/2602.11988): repository-context guidance can add overhead without improving the evaluated tasks. This is task/model-specific evidence, not proof that OpenLegend instructions are harmful or that every instruction can be removed. It motivates checking actual loading and trimming redundant context.

## Formats and discovery

[AGENTS.md](https://agents.md/) and [Agent Skills](https://agentskills.io/specification) supply the portable Markdown/frontmatter conventions. Actual loading is a harness feature, not something the Markdown standard guarantees.

- [Codex instructions](https://developers.openai.com/codex/guides/agents-md/) and [skills](https://developers.openai.com/codex/skills/): startup instruction-chain and on-demand skill discovery. Root task routing covers new files, semantic concerns and working-directory differences; the provider's default size limit is not our target size.
- [Claude memory/imports](https://code.claude.com/docs/en/memory) and [skills](https://code.claude.com/docs/en/skills): a thin root import keeps one policy body. Native `.claude/skills` discovery is not falsely attributed to `.agents/skills`; this repository deliberately uses explicit file reads for Claude topic procedures.
- [OpenCode rules](https://opencode.ai/docs/rules/) and [skills](https://opencode.ai/docs/skills/), plus [Cursor rules](https://cursor.com/docs/rules) and [skills](https://cursor.com/docs/skills): use supported repository conventions instead of duplicate tool-specific rule trees. Do not load all instructions through an OpenCode glob or turn every Cursor skill into an always-on mode.

## TypeScript, web and game implementation

- [TypeScript narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html): narrow external data and use explicit outcome variants. Applied alongside the existing strict compiler and runtime validators, not a new schema framework or type-level metaprogramming style guide.
- [React: You might not need an Effect](https://react.dev/learn/you-might-not-need-an-effect): avoid redundant state and unnecessary synchronization. External renderer/network lifecycles still require synchronization and cleanup; this is not a blanket prohibition on Effects.
- [React Aria accessibility](https://react-spectrum.adobe.com/react-aria/accessibility.html): reuse the actual library's interaction/focus semantics rather than rebuilding controls. [Rendering performance](https://web.dev/articles/rendering-performance) informs browser-path investigation and visual verification.
- [Node: Don't block the event loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop): bound expensive work and distinguish asynchronous I/O from CPU offloading. Applied to native simulation/coordination without introducing workers or queues everywhere.
- [PlayCanvas optimization](https://developer.playcanvas.com/user-manual/optimization/guidelines/): profile the real rendering bottleneck and reduce unnecessary allocations/resource work. Applied to this code-based renderer and its existing lifecycle/cache owners, not Editor-only practices or a replacement graphics stack.
- [Vercel React best practices](https://vercel.com/blog/introducing-react-best-practices): prioritize expensive work and waterfalls before micro-optimizations. Next.js/server-component/SSR-specific prescriptions are not imported into this local Vite/React application.
- Official [TypeSafe skills](https://docs.typesafe.ai/agent-skill) and [PlayCanvas skills](https://developer.playcanvas.com/user-manual/getting-started/use-playcanvas-skills/) are optional vendor references. No remote installer, scripts or unreviewed skill collection is vendored. Local authority, budget and version constraints govern any future adoption.

## Repository findings and deliberate policy choices

Inspection at `c466b63f818021a6cd65d0809b94f220cce642d4` covered the root policy/setup, all package responsibilities, representative domain transitions/drafts, server admission and Jev rubrics, typed provider outcomes, public protocol and the React/PlayCanvas boundary. This is an instruction-system audit, not an exhaustive correctness audit of every source line.

The guidance preserves the existing pinned pnpm workspace, strict TypeScript, package entrypoints, domain-local Immer drafts, explicit receipts/outcomes, server-side Zod admission, bounded provider adapters, public DTOs, React Aria design system and small WorldRenderer interface. Package/server relative `.js` imports and client extensionless imports remain context-specific. Existing ownership and actor-privacy rules outrank generic recipes; old prose does not turn target architecture into implemented capability.

The owner's lean delegated workflow intentionally defers automated test authoring/execution while retaining runtime smoke checks and risk-scoped stress work. This is a project choice, not a research claim that automated testing is obsolete. Existing CI/full-check scripts remain intact. Deferred checks belong to their focused tracker, with the general TODO as fallback. The old `pnpm tidy` instruction had no corresponding package script and is removed rather than inventing a command.

The $10 ceiling is shared across an owner-authorized task, not a public permission grant. The 8× target is workload-specific, not proof of end-to-end capacity. A conversation-specific silence-as-agreement convention is not universal consent. “Continue until complete” means finish feasible in-scope work while reporting consequential blockers, not take irreversible liberties or loop without a bound.
