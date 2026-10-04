# Hearing integration handoff

Start with the [integration plan](../projects/completed/hearing-main-integration.md), [current evidence](../verification/hearing-main-integration.md) and [HE01–HE05 tracker](hearing-and-speech.md). They replace the earlier transfer/recovery instructions and checkpoint claims. Read current repository instructions before further work.

The feature source at `c4379246` is preserved locally and remotely. The working branch is `codex/hearing-ready-for-main`, rebased onto main `45210d41`, including native actions and the latest scene/cognition/persistence improvements; `codex/hearing-main-integration` preserves the earlier squash. No published history was force-pushed. Main supplies elapsed-time simulation, current authority/placement, relational history and memory, contribution state and rendering. Hearing supplies graded event-time evidence, volume, captions and perceived history. [Joint ownership](speech-time-integration.md) explains the consolidation.

Follow the [development save policy](../../AGENTS.md#development-save-policy). Current-format persistence must retain the original listener fragments; never infer historical missing words.

Use actual progressed time, admitted/offered speech counts, source privacy and tail latency to assess the combined implementation. Historical fixed-step/reference-slice benchmarks and old typing failures are not current acceptance evidence. Missing PostgreSQL, live-provider, complete graphical/accessibility and broader capacity checks remain in HE05. The original handoff's connector-only commands, five-minute commit rule and branch-status claims are historical instructions, not the current workflow.
