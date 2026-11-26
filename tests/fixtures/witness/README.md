# Witness gameplay replays

Run these checks after changing what an NPC notices, what they can decide, or what happens when a chosen action waits. They exercise signed gameplay requests and verify the resulting saved decisions, actions and witness records. The provider supplies scripted choices over loopback HTTPS. These runs check gameplay mechanics and privacy.

| Run              | What it checks                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fish             | Both helpers hear the appeal and receive separate choices. Only the first helper receives the exact acceptance. The first gift changes the player's inventory, the second is declined, and a later completed decision produces no reply. |
| Follow, visible  | A queued Follow starts once with the player's new visible position.                                                                                                                                                                      |
| Follow, occluded | The same queued step is blocked when the player moves behind a screen before it starts.                                                                                                                                                  |
| Watch            | A sighting after expiry cannot release the old walk. A freshly chosen watch can.                                                                                                                                                         |
| Coat             | A childhood association can inform a later answer. During the observed interval there is no recorded choice expressly about the coat, fear appraisal or flinch. The player hears the actual answer.                                      |

## Run locally

Use the checkout's pinned workspace dependencies and [native release setup](../../../README.md#run-the-stand-alone-rust-server). Build the Rust server and browser in the same checkout, or point the runner at compatible builds. The checks require OpenSSL on the local PATH for the controlled provider and a loopback PostgreSQL admin URL with permission to create disposable databases. Install pgvector on that PostgreSQL server.

Set `OPENLEGEND_TEST_DATABASE_URL` to the disposable database helper's explicit loopback admin URL. Set `OPENLEGEND_WITNESS_LANGUAGE` to the native language build directory. The defaults for `OPENLEGEND_WITNESS_BINARY` and `OPENLEGEND_WITNESS_BROWSER` are the checkout's `native/target/release/openlegend-game-server` and `dist/client`. Override either when using a separate build directory.

From the repository root, run each desired scenario with a fresh output subdirectory outside Git.

```sh
witness_output=$(mktemp -d)
node --import tsx tests/fixtures/witness/fish.mts "$witness_output/fish"
node --import tsx tests/fixtures/witness/follow.mts "$witness_output/follow-visible" visible
node --import tsx tests/fixtures/witness/follow.mts "$witness_output/follow-occluded" occluded
node --import tsx tests/fixtures/witness/watch.mts "$witness_output/watch"
node --import tsx tests/fixtures/witness/coat.mts "$witness_output/coat"
```

Each check creates and drops its own database and writes `result.json` and native server logs to its output directory. Preserve the result and logs together when retaining evidence. The runner records the checkout commit and executable digest. Raw output stays outside Git. For an unoptimized build that exhausts the default Rust worker stack, set `OPENLEGEND_WITNESS_RUST_MIN_STACK=33554432` for that replay.

The [witness acceptance scenarios](../../../docs/features/noticing-and-remembering/scenarios-and-acceptance.md) cover the broader journeys and their required world activities. The [maintainer tracker](../../../docs/maintainers/product-scalability.md#ps04-a--core-attention-and-recording) owns remaining feature and scale qualification.
