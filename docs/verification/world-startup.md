# Development world startup verification

These are recorded observations from the original verification log, not a new run. “Current” refers to each observation’s recorded revision. [Verification index](../verification.md) · [Current acceptance owners](../maintainers/README.md).

## Development startup recovery

The normal `.env` PostgreSQL startup failed because its saved world contained the previous `sleepPolicy` but no `statusEffectPolicy`. Read-only reconstruction of the saved checkpoint/journal reproduced the validation error. Earlier status-effect verification used a fresh temporary database and did not cover this path. The initial reset-based recovery is superseded; see [documentation history](../documentation-changelog.md#in-place-development-updates).

Manual isolated SQLite execution of the in-place replacement retained the world and actor IDs, name, energy 37, simulation time 12,345, inventory and original rest action ID. The action became a current effect instance with 456 elapsed dream seconds. Raw checkpoint/journal reconstruction confirmed the new registry was durably stored and obsolete policy/rest fields removed. Accounting was byte-for-byte unchanged and a separate integration record survived. A second startup retained identity and dream progress. Manual-save reading converted the same earlier shape without changing identity or action ownership. Malformed current registry values still rejected startup without replacing the world.

Production build passed. These were zero-network native fixture executions, not automated tests or PostgreSQL migration acceptance. No paid calls were made; deferred adapter and integrity coverage remains in TODO. This change does not restore gameplay discarded by the preceding reset.

## Disposable base-world startup

The `openlegend_base` development world was initialized once with current sleep-policy defaults and current rest-state fields, retaining its world identity, energy values and revision 3454. Current domain validation, an unpersisted one-second simulation step, and the real PostgreSQL repository load all passed. Per-feature world-version rejection was removed from module validation and named-save admission; structural validation and save checksum checks remain. This was a local state adjustment, not an added legacy reader or automatic migration framework.

### Person editor needs

An isolated zero-budget browser session showed shared Health/Food/Energy meters with editable numbers in Needs and an empty Stats section. Editing player Food from 76 to 42 updated the draft meter; Save updated the main HUD and character meter to 42 and reported all changes saved. The exercise exposed and fixed a read/save eligibility mismatch: saving now accepts the same memory-capable actors as editor reads and the domain transition. Production TypeScript/Vite build passed. No automated tests or paid calls were used.
