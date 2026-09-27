# Narration failure and merge-status cleanup

## Scope and baseline

Implement the requested player-facing failure behavior on `codex/narration-failure-cleanup`,
from freshly fetched `origin/main` at `45210d41075dc1db09dbd48f562b76b8b39bcc10`
in `Macrofold/OpenLegend`. Main contains the action merge `75ee15f7`.
Conversation compaction is explicitly excluded. AC01.2 already owns detailed action
parameters; CR12/NC12 already own broad cognition/narration qualification.

Approximately 60–100 changed logic lines affect the server history owner, Narrator
worker, public transcript status and React history controls. The main risks are
mislabeling deterministic conversation notices, showing old fallback prose, and
redispatching interrupted paid jobs. Source evidence, privacy, impacts, accounting
and timeline anchors must remain intact; this changes presentation, not world laws.

## Implementation and verification

1. Persist explicit failed narration with the exact text “Narration failed.” for
   unavailable/rejected generation and interrupted claimed jobs. Keep detailed
   causes in diagnostics and preserve existing no-automatic-retry fences.
2. Project older generated fallback entries as failures without replacing the saved
   source evidence or treating native conversation merge notices as failed generation.
3. Remove the player regeneration button and its unused handler. Preserve successful
   narration, voice controls, history refresh/paging and dismissal.
4. Reconcile the narration contract, NC tracker, implementation snapshot and limits;
   correct the remaining action-merge wording while retaining incomplete qualification.
5. Run pinned formatting, TypeScript and production build checks. Exercise the real
   history/Narrator path in disposable storage with zero AI budget and injected results;
   inspect the React UI in a browser. No automated suites or paid calls are authorized
   by this plan. Review the complete diff, record evidence, commit and push the branch.

## Completion criteria

Failures display only the requested message in place of narration; success and native
notices still display correctly. Restart and later wakeups do not retry failed jobs.
The player UI has no regeneration control. Documentation reports the actual merge
without claiming qualification passed. Checks and limitations are recorded, the full
diff is reviewed, and the requested branch is pushed.

## Progress

Implementation, native/runtime and browser verification are complete; see
[evidence](../verification.md#explicit-narration-failure). TypeScript and production
build passed. Original source evidence and failure causes remain stored, while older
fallback entries are normalized only in the public projection. The existing explicit
regeneration API remains; the requested removal is from the player UI. Full-diff review,
pinned formatting and the affected local-link checks are complete. No actionable in-scope
findings remain; broad NC12/CR12 and action-integration qualification stay open in their
existing trackers. The final delivery is the requested commit and push.

## Rebase onto hearing integration

The September 27 follow-up rebases this branch onto freshly fetched `origin/main` at
`614376087ed5f9c61f37c934a563b53cc9c2763b` in `Macrofold/OpenLegend`. The original
implementation baseline above remains historical. Main's perceived-event evidence and
actor-scoped transcript queries remain authoritative; the failure display is applied only
after those queries authorize the current-format records. No old-save reader, migration
or compatibility fixture is added; the protected [development save policy](../../AGENTS.md#development-save-policy)
remains unchanged. Existing current-format fallback status is a presentation input, not
permission to load an incompatible save.

Resolved the two additive conflicts by retaining both history helpers and both sets of
changelog entries. Full branch/range-diff inspection found no additional semantic conflict.
TypeScript, production build and the focused disposable narration scenario passed against
the combined code; [rebase evidence](../verification.md#explicit-narration-failure) records
the exercised boundaries. No runtime logic changed beyond reconciliation. The published
branch update uses a lease pinned to the original remote commit
`a4f8dd1fea345adf53e4b27685b0d988382e603a`.
