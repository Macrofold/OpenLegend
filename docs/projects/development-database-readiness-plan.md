# Development database readiness

| Status      | Current progress                                                                                                                    | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The configured format-14 development database is incompatible with format-16 main; protected records and startup need verification. | 2026-10-18   |

## Scope and decisions

Restore normal development startup under the existing [development save policy](../../AGENTS.md#development-save-policy). Runtime admission continues to reject incompatible data; no legacy reader, migration, marker bypass or automatic deletion is added. The original database and checkpoint directory remain intact.

The working base is local `main` at `3bbb1ba5bd5ac5186746d7547196d8b86359600b` in `https://github.com/Macrofold/OpenLegend.git`, matching the freshly queried `origin/main`. Changes stay in the existing checkout. Expected executable changes are fewer than 15 logic lines, limited to startup diagnostics; the operational repair has higher preservation risk and is staged below.

## Recovery and verification

1. Inspect the incompatible database read-only: format, writer ownership, reusable starting content, operational table shapes and protected accounting. Compare content with the current standard initializer under [starting-world reconciliation](../save-and-load.md#starting-world-content-reconciliation).
2. Prepare a distinct current-format database and checkpoint directory. Preserve compatible operational records exactly, including spending/uncertainty, access, asset authority and external-operation receipts. Refuse a mismatched operational table shape rather than converting it. Keep all original gameplay/checkpoints in their original locations. Use a distinct world identity to fence old commands and provider work.
3. Verify protected rows against the source, construct the standard current world, persist and reopen it, and compare its useful content inventory. Switch only the local database/directory/seed settings after this succeeds; preserve all other configuration.
4. Verify normal server initialization and a native HTTP readiness request with paid work disabled, then stop only the verification process. Verify protected accounting again and report the fresh development progress separately from the preserved original.
5. Correct misleading startup diagnostics/comments and require configured-database readiness when a merge changes storage formats. Keep this conditional check in the existing verification owner; do not add unrelated browser/playtest gates.
6. Review the complete diff; run changed-file formatting, type checking and guidance validation. Commit task-owned changes under AGENTS.md.

Startup-only work grows with the existing initialization/schema work, not each game tick or player command. No new query, polling loop, cache or repeated runtime work is planned. Recovery copies exact selected tables once, retains the original as rollback, and qualifies the complete startup/reopen path rather than a helper alone.

## Completion

Development startup and same-format reopening succeed against the configured target; protected operational data is preserved and checked; the original database/checkpoints remain available; useful starting content is retained through the current initializer; merge guidance requires this readiness check for relevant changes. Actual results and any limits belong in the final handoff.
