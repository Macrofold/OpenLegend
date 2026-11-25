# Open Legend Unreal player

This project contains the independently authored Unreal client covered by the accompanying MIT license. Unreal Engine and its dependencies retain their own terms. The client uses the public gameplay interface of the separately operated Rust game server.

The player uses the existing Rust world and connects through the public gameplay interface. Its camera modes share one permitted scene. The client submits intentions and recovers original outcomes. Rust retains the authoritative clock, access, movement, hearing, decisions and saves.

## Build the first slice

Use an installed or built Unreal Engine 5.8.4 with its native SDK. Use the same project on Windows x64 and Apple Silicon. Keep the inputs and approved target devices recorded under [UE01](../../docs/maintainers/unreal-engine-5-migration.md). The engine source checkout is useful for reference. An unattended cook requires the built editor, Automation Tool and engine content.

Configure the trusted world origin and world ID in the external build staging configuration. For development only, use `-OpenLegendOrigin=http://127.0.0.1:PORT -OpenLegendWorld=WORLD_ID` with the Rust server's explicit local development authentication. Hosted sign-in opens the system browser. The desktop session has its own credential.

The [unattended build recipe](tools/package.py) stages the committed client in an external directory and records the build receipt. Use it with a fresh external destination.

```sh
python3 apps/unreal/tools/package.py --engine /path/to/UnrealEngine \
  --output /path/to/new/build-directory \
  --origin https://world.example.org --world my-world
```

Open the Mac app or Windows executable listed in `receipt.json`. Run the [existing Rust server](../../README.md#run-the-stand-alone-rust-server) separately for the selected world. Use camera buttons or X, WASD to move, and Escape to show the pointer for scene interaction. The [migration tracker](../../docs/maintainers/unreal-engine-5-migration.md) lists retained gameplay work and later platform qualification.

The package recipe imports the selected existing browser models and motion from exact public asset locks. It includes their notices and the build receipt records their identities. Rust must publish the matching permitted release and appearance. Other appearances use the existing geometry fallback. Use `--without-art` for a local geometry diagnostic.

The player keeps one pending command or chat receipt per recovery scope in the OS credential vault. It retains the exact original lookup before dispatch. The [receipt bound](../../docs/limits/interface.md#unreal-client-qualification) covers the original request plus metadata. Pending requests remain recoverable after the same account returns. Unreal stores neither a second world nor another copy of the server's conversation state.

## Optional local Mac smoke check

Use this disposable setup when an interactive diagnostic is useful. The code delivery does not require a hand-tested playthrough.

Build the Rust binary with `cargo build --release --locked --offline -p openlegend-game-server` from `native/`. From the repository root use `pnpm exec vite build --config apps/client/vite.config.ts` to supply `dist/client`. Supply a matching compiled language release from the linked server entry instructions. Point the disposable runner at a local PostgreSQL cluster where you can create a temporary database.

```sh
export OPENLEGEND_FIXTURE_ADMIN_URL=postgresql://127.0.0.1/postgres
pnpm exec tsx scripts/unreal-disposable-world.ts /private/tmp/openlegend-ue-world \
  /path/to/language dist/client
```

The runner prints the temporary database name and keeps it available. In another terminal, use the same PostgreSQL host, port and user with the printed database name. Start Rust with the local-only environment below.

```sh
OPEN_LEGEND_AUTH_MODE=local OPEN_LEGEND_HOST=127.0.0.1 PORT=3210 AI_BUDGET_USD=0 \
OPEN_LEGEND_DATABASE_URL="postgresql://127.0.0.1/PRINTED_DATABASE?sslmode=disable" \
OPEN_LEGEND_DATA_DIR=/private/tmp/openlegend-ue-world \
native/target/release/openlegend-game-server serve /private/tmp/openlegend-ue-world/release
```

Use Xcode 26.3 with its macOS SDK and Metal Toolchain. Check the tools, then package a Development client for world `ue-preview` into a new output directory.

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
xcodebuild -version
xcodebuild -checkFirstLaunchStatus
xcrun --sdk macosx --find metal
xcrun --sdk macosx --find metallib
python3 apps/unreal/tools/package.py --engine '/Users/Shared/Epic Games/UE_5.8' \
  --output /private/tmp/openlegend-ue-mac-build --development \
  --origin http://127.0.0.1:3210 --world ue-preview
```

Open the native app recorded in `receipt.json` under the build output. Select **Sign in**, **Take control**, then **Play / Pause** to start the paused opening. Hold W and turn the mouse in **Follow** to curve the walk. In **Elevated**, right-drag over the scene while walking. In **Shoulder**, aim while walking. Both preserve the held travel direction. X cycles angles. Escape frees the pointer. All three angles use the same permitted scene and optional sight outline.

Pick a visible NPC or select one from **In view**, then choose the offered speech action. The zero-budget server above can check ordinary speech. For a generated reply use a local HTTPS provider fixture. Drop one acknowledgement after Rust accepts the request, then use **Check result** to look up the original. Keep the app open for the loopback journey, since this development sign-in lives only in the running app. Use **Retry reply** only for a confirmed failure that offers it.

After an ordinary save, stop Rust gracefully and run the same serve command with the same directory and database. Let the app reconnect and check the accepted position and permitted speech. Then stop Rust and enter `q` in the world preparation terminal to release the disposable database.

Run a separate native Win64 build and the same journey on the Windows target. Internal Development gives early feedback. The signed release and two-device gates retain their own requirements.
