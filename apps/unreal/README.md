# Develop Open Legend in Unreal

## On this Windows PC

1. Open `C:\dev\OpenLegend` in Codex, your IDE, or File Explorer. This is the Git checkout. Edit the Rust server under `native/` and the Unreal client under `apps/unreal/Source/`. Both changes appear in the same `git status`.
2. Double-click **OpenLegend.cmd** at the top of the checkout. It prepares the Unreal project, builds this checkout's editor module and Rust server, starts the local world in Ubuntu, then opens Unreal Editor. Let the command window finish. For an already open editor, finish or save the current session and close it before rebuilding native code.
3. Press **Play** in Unreal Editor. The client uses the Rust server on this computer. Click inside the Play window. Press **Enter** to control your character, **P** to resume a paused world, **W/A/S/D** or the arrow keys to step, and **L** to leave the character. On-screen prompts show when each action is available. Use the Unreal editor to change maps, Blueprints and other game content.
4. Save your work. Use normal Git commits and pushes for source code, project settings and published asset indexes. When you edit binary content, publish the saved revision through the asset workflow below before handing it to the other computer.

The checkout points the editor's `Source` directory directly at your versioned C++ files. The launcher keeps the editable `.uproject`, `Content`, editor saves and build products under `%LOCALAPPDATA%\OpenLegend` on Windows or `~/Library/Application Support/OpenLegend` on macOS. It prints the full project path. You can open an existing project there. If you intentionally change a shared setting in the editor, review that setting and copy it into `apps/unreal/Config/`. Preparation reports conflicting local settings so you can preserve them. Personal settings and saved credentials belong on the individual computer.

## On another computer

Use the same GitHub repository. In your existing clean checkout run:

```sh
git fetch origin
git switch codex/unreal-development
git pull --ff-only
```

For a first checkout:

```sh
git clone --branch codex/unreal-development https://github.com/Macrofold/OpenLegend.git OpenLegend
cd OpenLegend
```

Install the Unreal build in [engine.json](engine.json) through Epic Games Launcher. This branch uses **Unreal Engine 5.9 Preview 2**, changelist 60738873. Install the C++ development tools for the platform (Visual Studio's Game development with C++ workload and a Windows SDK, or Xcode on macOS). Set `OPENLEGEND_UNREAL_ENGINE` to the engine installation root if it is outside the Launcher's usual location.

On Mac, install Xcode's command-line tools as well. The first language-data build uses the native compiler, make, curl, tar, bzip2 and shasum. The database setup uses psql and createdb from your PostgreSQL installation.

For the Rust world use Ubuntu in WSL on Windows and a native terminal on Mac. Install Rust/Cargo, Node and pnpm as specified in the root [setup](../../README.md#run-locally), Python 3.9+, and PostgreSQL with pgvector. Run `pnpm install --frozen-lockfile` at the root of this checkout. On Windows open Ubuntu in the same directory, for example `cd /mnt/c/dev/OpenLegend`. The project uses the Ubuntu distribution registered as `Ubuntu`.

Prepare and select a local development world on the new computer using the instructions in the next section. On Windows launch **OpenLegend.cmd**. On Mac launch:

```sh
python3 apps/unreal/prepare_workspace.py play
```

Later, use Git pull/push between computers. The default game server is local to each computer, so each has its own save. Git carries code and asset selections. It does not transfer private world saves.

## Local Rust world

On this PC the launcher uses the configured local development world. On a **new computer**, run the following at the checkout root in Ubuntu or macOS after installing dependencies:

1. Create an empty local PostgreSQL database for the game. For example, if your existing local PostgreSQL role has permission to create databases, run `createdb openlegend_unreal_dev`. The game role must own the new database or have schema creation rights. Install the matching pgvector extension on this PostgreSQL installation and enable `vector` in the game database and the template used for newly created local build databases. A local database administrator can run `psql -d openlegend_unreal_dev -c 'CREATE EXTENSION IF NOT EXISTS vector'` and, for a dedicated development cluster, the same command with `-d template1`.
2. Set two local-only connection URLs in your terminal. `OPEN_LEGEND_DATABASE_URL` selects that new game database. `OPENLEGEND_BUILD_DATABASE_ADMIN_URL` selects a separate maintenance database such as `postgres` through a role with `CREATEDB`. Use numeric loopback. For example:

   ```sh
   export OPEN_LEGEND_DATABASE_URL='postgresql://YOUR_GAME_ROLE@127.0.0.1:5432/openlegend_unreal_dev?sslmode=disable'
   export OPENLEGEND_BUILD_DATABASE_ADMIN_URL='postgresql://YOUR_BUILD_ROLE@127.0.0.1:5432/postgres'
   ```

   These local examples omit passwords. Supply the authentication your local PostgreSQL installation requires and keep credentials outside Git. The release builder requires an admin URL with no query parameters.

3. Run `python3 bin/prepare_unreal_world.py review`. Inspect the supplied Solo opening and copy the displayed `compiledWorldDigest`.
4. Run `python3 bin/prepare_unreal_world.py activate YOUR_REVIEWED_DIGEST`. The command stages a matching release, activates the reviewed opening and saves the local server configuration. It builds the platform's language data on first use. The existing Rust release format includes a browser bundle alongside its other inputs. Ordinary desktop play opens Unreal.
5. Launch the game from the checkout as described above. The local server binds to loopback with AI spending disabled. If you already have an activated local world, select it using `python3 bin/unreal_dev_server.py configure --release PATH --data-dir PATH` with its own `OPEN_LEGEND_DATABASE_URL`.

If a future branch changes the storage format or reviewed world, create a new local game database and use a fresh external `OPENLEGEND_DEV_WORLD_DIR` for review and activation. To retain both world selections, choose a separate private `OPENLEGEND_DEV_CONFIG` for the new world. The previous database, checkpoints and activation receipt remain available.

To check or stop the configured server, run:

```sh
python3 bin/unreal_dev_server.py status
python3 bin/unreal_dev_server.py stop
```

A launch builds from your checkout, keeps Cargo output in the user's cache and uses a local operator configuration outside Git. Stop the server when finished if you want to free its memory. On Windows `OpenLegend.cmd build` compiles only the editor module. On Mac use `python3 apps/unreal/prepare_workspace.py build`. See the [Rust server setup](../../README.md#run-locally) for its release inputs.

## Share a map, Blueprint or other source asset

The [project asset service](../../docs/asset-workflow.md) stores binary files privately in S3 and records their ownership, permissions and revisions. Git carries `assets/locks/unreal-content.json`, the exact list of the project's published editor files and hashes. A project using only built-in engine shapes needs no content index or AWS access.

On each computer, authenticate the project AWS profile before using private content. In Ubuntu or macOS run `aws login --profile openlegend --region us-east-2`. Check the project identity using `aws sts get-caller-identity --profile openlegend --region us-east-2 --query Account --output text`. The expected account is `027677879749`. Use the [shared asset authority setup](../../docs/asset-workflow.md#shared-asset-authority) for the project's RDS CA certificate, catalog access and network permissions.

1. Coordinate who is editing each binary map or Blueprint. Save in the editor and close it before publishing. Review the contents of the workspace's `Content` folder, since a revision captures the whole folder.
2. Ask your agent to share the saved Unreal content. Give it the actual asset collection owner, revision name and evidence establishing the rights for these files. An agent can run the following from the checkout, replacing the three example values. On Mac replace `OpenLegend.cmd` with `python3 apps/unreal/prepare_workspace.py`.

   ```powershell
   .\OpenLegend.cmd share-content --owner-id COLLECTION --revision-id REVISION --rights-evidence EVIDENCE --dry-run
   .\OpenLegend.cmd share-content --owner-id COLLECTION --revision-id REVISION --rights-evidence EVIDENCE
   ```

   The first command hashes the local files and checks the draft. The second publishes using the project's existing rights approval and writes the index after verifying the receipt. An authorized rights owner can add `--approve-rights` to explicitly record the source, offline and recovery grant with the supplied evidence. Add `--dependency-index PATH` for each separately published dependency. Keep the same revision, inputs and evidence on a retry.

3. Review the index and commit it alongside matching source edits. Push the branch. On the other computer, pull and launch normally. The launcher retrieves and verifies a newly selected revision in a fresh local workspace, keeping earlier workspaces and edits available. A failed download leaves the current project intact. To recover edits in an earlier workspace, pass its explicit `--workspace` path and reconcile the content before publishing.

The editor opens a local copy of the binary content. Work in progress stays on that computer until you publish it. Cooked builds, shader caches and temporary editor output stay local. For rights and redistribution, see the [component licenses](../../LICENSING.md#native-unreal-client) and the [Unreal migration tracker](../../docs/maintainers/unreal-engine-5-migration.md).
