# Development database readiness

| Status    | Current progress                                                                                                                                     | Last updated |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | A fresh format-16 world preserves protected operational records and passes startup, persistence and reopening; merge readiness guidance is in place. | 2026-10-18   |

## Scope and decisions

Restore normal development startup under the existing [development save policy](../../../AGENTS.md#development-save-policy). Runtime admission continues to reject incompatible data; no legacy reader, migration, marker bypass or automatic deletion is added. The original database remains intact.

The working base is local `main` at `3bbb1ba5bd5ac5186746d7547196d8b86359600b` in `https://github.com/Macrofold/OpenLegend.git`, matching the freshly queried `origin/main`. Changes stay in the existing checkout. Expected executable changes are fewer than 15 logic lines, limited to startup diagnostics; the operational repair has higher preservation risk and is staged below.

## Recovery and verification

1. Inspect the incompatible database read-only: format, writer ownership, reusable starting content, operational table shapes and protected accounting. Compare content with the current standard initializer under [starting-world reconciliation](../../save-and-load.md#starting-world-content-reconciliation).
2. Prepare a distinct current-format database and checkpoint directory. Preserve compatible operational records exactly, including spending/uncertainty, access, asset authority and external-operation receipts. Refuse a mismatched operational table shape rather than converting it. Keep all original gameplay/checkpoints in their original locations. Use a distinct world identity to fence old commands and provider work.
3. Verify protected rows against the source, construct the standard current world, persist and reopen it, and compare its useful content inventory. Switch only the local database/directory/seed settings after this succeeds; preserve all other configuration.
4. Verify normal server initialization and a native HTTP readiness request with paid work disabled, then stop only the verification process. Verify protected accounting again and report the fresh development progress separately from the preserved original.
5. Correct misleading startup diagnostics/comments and require configured-database readiness when a merge changes storage formats. Keep this conditional check in the existing verification owner; do not add unrelated browser/playtest gates.
6. Review the complete diff; run changed-file formatting, type checking and guidance validation. Commit task-owned changes under AGENTS.md.

Startup-only work grows with the existing initialization/schema work, not each game tick or player command. No new query, polling loop, cache or repeated runtime work is planned. Recovery copies exact selected tables once, retains the original as rollback, and qualifies the complete startup/reopen path rather than a helper alone.

## Completion

Development startup and same-format reopening succeed against the configured target; protected operational data is preserved and checked; the original database and any retained checkpoints remain available; useful starting content is retained through the current initializer; merge guidance requires this readiness check for relevant changes. Actual results and any limits belong in the final handoff.

## Verified recovery

The original loopback database `openlegend_dev_20261016_repaired` remains at format 14; its checkpoint catalog was empty. The configured target is `openlegend_dev_20261018_schema16_99ce`, with checkpoint directory `.data/dev-20261018-schema16` and seed `20261018`; its distinct world identity fences previous commands and pending work. Only the local database URL, checkpoint directory and seed changed. Development play progress remains in the original database rather than being converted.

All 49 source operational tables with matching current layouts were copied and fingerprint-compared before activation, together with retained metadata excluding the old schema marker and checkpoint-directory ownership. The new database's current initializer owns those two values. All 1,957 paid attempts, including 567 uncertain attempts, and their existing scope/budget records remain exact after startup and reopening. Current-only operational tables start empty. Existing access, asset authority and external-operation records are retained; no credentials or permission settings were replaced.

The saved current world contains the original reusable cast and wildlife (27 actors, excluding four prior player corpses), six recipe identities and seven place identities. Native server initialization, persistence and reopening passed twice; HTTP checks returned the expected unauthenticated 401 under the existing OIDC configuration. The normal `pnpm dev` command also completed generation and served PostgreSQL-backed OpenLegend at `http://127.0.0.1:3211` with paid work disabled. No browser sign-in, gameplay, live-provider or performance qualification is claimed. The old database still refuses with its stored/required versions clearly reported. Type checking and structural guidance validation pass; wider installed-agent compliance remains CG05. Additional and cumulative provider cost are $0.
