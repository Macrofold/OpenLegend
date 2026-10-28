# Working with game assets

Use this guide whenever creating, importing, capturing, inspecting, editing or linking art, models, textures, fonts, audio, video, generated scenery or study files. The [storage decisions](projects/game-asset-storage-feature-spec.md#2-agreed-product-decisions), [URL contract](projects/game-asset-storage-tech-design.md#5-url-and-repository-contract) and [limits inventory](limits/game-asset-storage.md) own the detailed contracts. The [AS tracker](maintainers/game-asset-storage.md) records migration and verification that remain unfinished; installed tooling alone does not establish that every cloud copy or viewer has been qualified.

## Where files belong

Keep all asset payloads outside every Git checkout, regardless of size. This includes standalone media and SVGs, editable Blender/source files, exported mesh or animation JSON, vector/icon bundles, captures, asset archives and study outputs. Embedded images, including base64 or percent-encoded SVG data URLs in CSS or other source files, follow the same rule. The Node asset commands, capture tool and cache check existing ancestors and symbolic-link destinations before creating output directories. Save active work in a deliberately named external directory. Publish immutable, verified copies to asset storage before recording permanent links. Temporary files and expiring download links are not durable preservation.

Git retains code, shaders, JSX, small semantic authored data and catalogs, licenses/attribution, prompts/recipes, exact asset descriptions and verified permanent links. Code that draws native presentation remains code; storing exported geometry or image/vector payloads in a source file does not make them code or metadata. There is no tiny-file or bootstrap-media exception; [AST01](limits/game-asset-storage.md#ast01--git-and-bootstrap-assets) owns the repository restriction. Each asset file description identifies its storage boundary, access domain, SHA-256, byte length and media type. Changing a file creates a new description and immutable asset revision. A display name or original filename does not identify its bytes.

Private library storage holds editable originals and preservation copies. Runtime storage serves the exact files selected for the game; study storage serves inspection exports, retained comparisons, captures and explicitly published source downloads. Intake holds unaccepted uploads. Recovery has separate credentials and restoration rules. Publication does not move gameplay rules, collision or character knowledge into art metadata.

Mike authorized public access to the migrated current art, sources and studies. Their original license, attribution and reference-only qualifications remain applicable. Public hosting of a reference image does not grant production rights. New collections still require their own recorded permission and intended use; do not infer public permission from this migration.

## Start and select a small scope

Run commands from the repository root. `pnpm assets help` lists the implemented options. The current curated collection is public: use explicit `--public` pulls through `assets.openlegend.ai` without AWS credentials or PostgreSQL. For private collections and operator work, `assets/config.json` selects the explicit `openlegend` AWS profile, project, Region, buckets, role permissions and local cache limits. Credentials stay in the AWS CLI/SDK session. Follow [AWS access guidance](../.agents/rules/aws.md) if that session needs authentication. `OPEN_LEGEND_DATABASE_URL` selects the existing PostgreSQL authority that records publication and current permissions.

Pulls, inspection and installation use `assets/locks/development.json` unless `--index FILE` selects another exact list. The local study server defaults to `assets/locks/studies.json` and passes that same selection to both its browser build and delivery handler. Inspect the intended list before pulling:

```sh
pnpm assets inspect
pnpm assets inspect --path apps/client/src/props/art-study/source-woodland-doe/woodland-doe-quiet-motion.glb
pnpm assets pull --public --prefix apps/client/src/props/art-study/source-woodland-doe
pnpm assets verify --public --prefix apps/client/src/props/art-study/source-woodland-doe
```

`pull` prepares verified immutable cache files; `verify` also hashes the selected cached bytes. Authenticated use without `--public` checks current database permission before and after preparation. Use `--path` for one file, `--prefix` for a family or explicit `--all` when the entire selected release is intended. These commands do not synchronize the whole library or populate tracked media paths.

For an explicitly public collection, add `--public` to `pull`, `verify` or `workspace`. This mode uses the canonical public HTTP origins at `assets.openlegend.ai` and requires neither an AWS session nor the local database. It admits only exact public runtime/study references, refuses redirects and still verifies complete hashes/bytes through the same bounded cache. Private library and creator/world assets require the authenticated workflow. Public downloads can be retained locally; withdrawing a hosted file cannot retract an already downloaded copy.

The shared cache has finite bytes, entries and concurrent transfers across processes. Partial transfers reserve space, active readers pin their files, and only unused entries can be evicted. A pinned or oversized selection can exhaust capacity; reduce the requested scope or deliberately increase the configured budget after checking disk capacity. Never edit, hardlink into or manually clear a live cache. Default cache location and limits are owned by [asset configuration](../apps/server/src/asset-configuration.ts).

## Edit or generate art

Create an independent editable workspace from exact selected files:

```sh
pnpm assets workspace --public --prefix apps/client/src/props/art-study/source-woodland-doe --output /private/tmp/openlegend-art-work
```

Choose a new external output directory. Authenticated workspace creation requires current offline permission; `--public` uses the public download rules above. Both modes copy files independently from the cache and refuse overwrites. For editable library originals, supply their published source-bundle index with `--index`; the default runtime list contains the game's selected exports. Changes in this workspace are unsaved authoring work until published; they cannot modify the selected immutable release or another worktree's cache files.

For new work, save directly to a deliberately named external workspace. Keep provenance beside the output: source URL/package and license, original hashes, creator, tool/version, prompt or recipe when applicable, input revisions and known verification limits. Do not include credentials, provider job records or unrelated private files in a source bundle or public study.

Follow the relevant [visual requirements](../art-direction/decisions.md#current-visual-requirements--october-16-2026), [creative brief](../art-direction/final-board/creative-brief.md) and [scene/tool workflow](../.agents/skills/openlegend-playcanvas/SKILL.md). Storage approval does not establish visual quality, geometry correctness or runtime behavior. Retain requested iterations as exact external source/export/capture references rather than overwriting their only copies.

### Run the existing offline recipes

The `scripts/prepare-*.py`, `scripts/author-voxel-mercenary.py` and `scripts/sculpt-voxel-mercenary.py` recipes read and write a workspace with the same repository-relative asset layout. Set `OPEN_LEGEND_ASSET_WORKSPACE` explicitly; they refuse the code checkout or another Git checkout as an output destination. Fetch the required files into a new independent workspace first. For example, with the published complete study selection:

```sh
export OPEN_LEGEND_ASSET_WORKSPACE=/private/tmp/openlegend-mercenary-work
pnpm assets workspace --public --index assets/locks/studies.json --prefix apps/client/src/characters/mercenary-assets --output "$OPEN_LEGEND_ASSET_WORKSPACE"
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --offline-mode --python-exit-code 1 --python scripts/prepare-mercenary-face.py
```

The model is read from that workspace and generated facial geometry is saved beside it there. Shared Blender exports likewise save GLBs, textures, editable `.blend` files and generated catalogs externally. Code and recipe hashes still refer to the checked-in scripts. Recipes that accept `--sources`, `--libraries` or `--mercenary` need the corresponding exact retained source packages in the explicitly supplied external directories. Tools with an explicit `--output`, including the generated chest and source-library exporters, validate that destination instead of choosing a repository path.

For a recipe spanning several folders, prepare a small projection of a published index containing its required files, retain that index's exact release reference, then use `workspace --all --index /absolute/selected.index.json` for that deliberately selected subset. This does not grant access beyond the published release. Keep editable inputs separate from immutable cache files. Use a fresh workspace or preserve unsaved work before rerunning a recipe that regenerates outputs inside its selected workspace.

Generated catalogs remain outside Git until explicitly reviewed. After publication, deliberately update the small tracked catalogs, provenance and selected exact asset list that consume those outputs; do not copy the workspace wholesale into the checkout. Check that exported bounds, filenames and hashes match the published files. The scripts do not automatically edit tracked catalogs or change the game's selected release.

The native starting-world replay capture also requires an explicit external destination:

```sh
pnpm exec tsx scripts/capture-starting-art-study.ts --output /private/tmp/starting-world-study.json
```

It requires the explicit disposable-test PostgreSQL configuration from [verification guidance](../.agents/rules/verification.md), uses ordinary authenticated native travel with no paid AI calls, and refuses an existing output. Publish the resulting JSON as study data before updating its selected exact reference. Never use a real player's database to refresh a visual study.

## Publish an exact revision

Prepare a small current-format manifest using the [shared asset types](../packages/assets/src/index.ts). It names an owner, asset, revision, files and exact dependencies, plus real rights-evidence references and relevant provenance. Each file includes SHA-256, bytes and media type. Calculate these from the actual exported file; do not copy an old digest after editing. New authoring work can be outside Git. The full tracked-repository audit command is `pnpm assets inventory --output /private/tmp/openlegend-assets.ndjson`; it does not inventory unrelated external workspaces.

Publication uses the existing exclusive PostgreSQL writer. Stop the local game before a publication operation, then reopen it afterward. Inspection, pulls, verification and the local viewer use read-only authority access and can coexist with the game.

The asset catalog and its current permissions have their own storage owner. A fresh game can initialize in a database containing only the exact registered asset tables, including a catalog created by the asset CLI; those rows remain unchanged. Unversioned gameplay or unknown tables still refuse before initialization. For an empty database, initializing `SqlGameRepository` first also establishes the shared schema and current game marker. Close the initializer before publication. Establish current asset permissions through the existing recovery reconciliation owner, publish the selected runtime release, and start the game normally. Do not write a schema marker manually or weaken current-format admission.

For example, given a reviewed private source manifest at `/private/tmp/doe-source.manifest.json` and its files under `/private/tmp/doe-source/`:

```sh
pnpm assets prepare --manifest /private/tmp/doe-source.manifest.json --boundary art-library --domain curated-private
pnpm assets initialize --manifest /private/tmp/doe-source.manifest.json --boundary art-library --domain curated-private
pnpm assets approve --manifest /private/tmp/doe-source.manifest.json --boundary art-library --domain curated-private --use source,private-study,offline,recovery --evidence approved-doe-source-record
pnpm assets publish --manifest /private/tmp/doe-source.manifest.json --boundary art-library --domain curated-private --operation doe-source-publication --source-root /private/tmp/doe-source
```

`prepare` computes the exact manifest reference without publishing. `initialize` establishes the explicitly selected storage domains for the authenticated operator. `approve` records permitted uses and actual evidence. `publish` verifies complete bytes, uploads immutable objects, then commits the publication. Retry an interrupted operation with the same operation ID and exact request; a new output or permission decision requires a new operation. `--expected N` supplies the current revision when changing a rights record or grant.

For public studies, select `art-studies/public`, approve `public-study` and source access as applicable, review the public projection, and pass `--public-reviewed` to publication. Runtime use has its own `private-runtime` or `public-runtime` approval. These are decisions about the intended collection, not permission to turn an arbitrary private source bundle into public game output. `grant`, `withdraw` and `authority-export` administer current access and restrictions through the same authority. Withdrawal cannot retract already downloaded files.

`withdraw` removes the selected revision's current access, removes its recorded hosted copies where they are no longer shared by an allowed revision, and waits for the exact public cache invalidation. For a file that must be prohibited across revisions, add `--prohibit-bytes`; `--path MANIFEST_PATH` narrows that prohibition to one exact file while still withdrawing the selected revision. Supply frozen `--source-config` files when its recorded copies span trusted environments. Keep the same operation ID and exact request when resuming interrupted removal. Protected historical S3 versions remain available only through the separate recovery rules; a completed removal cannot recall copies already downloaded by someone else.

### Select development or production runtime storage

Generate environment configurations from the deployed stack instead of keeping duplicate full configurations in Git:

```sh
pnpm assets environment --name development --output /private/tmp/openlegend-development-assets.json
pnpm assets environment --name production --output /private/tmp/openlegend-production-assets.json
```

Each file keeps the shared project settings and selects the verified runtime bucket, read role and public URL prefix for that environment. Development files use `https://assets.openlegend.ai/development/`; production uses `https://assets.openlegend.ai/`. Study and private-source boundaries retain their own settings. The files contain deployment addresses, not credentials, and existing files are never overwritten.

Publish the same exact reviewed runtime manifest and release to each selected environment with `publish --config /absolute/environment.json`. Use distinct operation IDs and independent `--selection` names for development and production, with `--expected N` matching each selection's current revision; a new selection starts at zero. Promotion preserves the exact asset identity and bytes, verifies the destination copy, and updates only the explicitly chosen selection. It does not install the release into a saved game.

Set `OPEN_LEGEND_ASSET_CONFIG=/private/tmp/openlegend-development-assets.json` when running `pnpm dev`, `pnpm build` or asset commands against development. The server, browser build and public downloads then use the same selected runtime environment. Choose the production configuration explicitly for production work. Keep these external configurations with the operator records needed to recover publications from both environments.

Migration preparation may supply `--sources FILE` instead of a common `--source-root`. That explicit registry maps exact references to verified local files or approved historical Git blobs. It is an operator migration input, remains outside Git and grants no rights by itself. Large collections can be partitioned into bounded child manifests and an exact parent dependency set; publish the children before their parent. The [migration tools](../scripts/assets/migration.ts) prepare plans and staging without uploading or deleting originals.

Hosted viewers additionally supply `--hosting FILE`. This reviewed input binds named immutable study-page or original-path mirror destinations to the exact files admitted by that manifest. The same publisher verifies every named copy before committing, so withdrawal and recovery retain those locations along with the content-addressed objects. Partitioned viewer publication uses the hosting input filtered to each child; its parent pins their exact complete dependencies.

`publish-plan --plan FILE --sources FILE --output /external/receipts --boundary BOUNDARY --domain DOMAIN --use USES --evidence RECORD` runs a prepared partition plan in its recorded child-before-parent order through those same operations. Add `--public-reviewed` only for the reviewed public projection. Its receipts remain external and rerunning the same frozen plan resumes the same exact publication operations.

## Inspect in a browser and use files in the game

Open the [published art-study collection](https://assets.openlegend.ai/studies/public/viewers/navigation-81bd67a16da37540aa1b9688cc22b05b5ed495c727692cab64ab5ffd5b877d36/index.html) for the current interactive model/scene tools and preserved comparison boards. These public studies require no login. Historical boards retain their own captures, source downloads and recorded limits; the current inspection tools do not reproduce an older renderer.

```sh
pnpm assets serve --page /art-study.html --index assets/locks/studies.json
pnpm assets serve --page /scene-study.html --index /private/tmp/selected-study.index.json
```

The local viewer verifies the configured AWS identity, binds only to `127.0.0.1`, and prints a one-use login URL valid for 60 seconds. Open that URL locally. Its browser cookie and current database permission protect every selected asset and source-record download, including files described as public. Do not save or publish the login URL. The viewer permits only the selected public or curated-private collection; it is not a general browser for creator or private-world files. Stop it with Ctrl-C; it closes its own listener, renderer tooling and cache readers.

Hosted public studies use the configured study origin under `https://assets.openlegend.ai/studies/public/`; production game files use exact public URLs under `https://assets.openlegend.ai/public/`, and development uses `https://assets.openlegend.ai/development/public/`. Select the matching environment configuration as described above. A preserved board may have a separate immutable viewer URL so its relative scripts, scene choices and source-record links continue to work. Record a permanent URL only after the exact page and its dependencies have been uploaded and verified. Private future collections use authenticated delivery, never a stored expiring signature.

The game's developer art-inspector link opens the verified immutable hosted viewer configured in `assets/delivery.json`. To inspect current local renderer changes, start the operator study server above; the ordinary game server carries only the runtime selection and does not provide a full source-study browser.

Game and study code ask the shared delivery helper for a repository asset path from the selected exact list. The local delivery handler checks current database permission before and after preparation. Public runtime/study cache misses use the existing verified public HTTP download, so they need no AWS credentials; private files and original-library files retain their scoped S3 access. Keep raw S3 bucket names, credentials, arbitrary external URLs and private source catalogs out of gameplay/browser authority. Small semantic presentation metadata remains ordinary code data; exported mesh, animation, recorded scenery and vector/icon payloads are fetched as assets even when encoded as small JSON files. The client reuses the existing renderer's resources and cleanup rather than creating another loader for each scene.

A newly initialized ordinary Main world selects the installed build's exact published runtime release in its first guarded commit. Create → Main requests the same selection from its trusted opening builder; the exact release becomes part of the reviewed initial world, and destination activation checks current asset permission and binds retention atomically. Custom openings retain their own presentation choice. Existing saved worlds are never silently rebound by a build or catalog update.

To replace an existing world's artwork after publication, reopen the game and use **Game → Use installed game art**. Characterless owners use **World operations → World artwork**. The control selects the exact published artwork included in the current build for everyone in that world; it does not change native bodies, behavior or progress. If the reply is lost, **Check artwork selection** reads the original saved outcome. **Retry original artwork choice** explicitly resubmits that same request when it is still eligible; a reload never silently sends another mutation.

For local authentication, `pnpm assets install --operation selected-art-release` performs the same guarded operation using the release selected by `--index` (or the default list). It checks the existing saved selection and never writes the save directly. OIDC worlds use the signed-in browser control; the command does not impersonate that account or change authentication. Stop/reopen the game around publication, then select the published release explicitly.

A clean code checkout can pull, verify and copy explicitly public files with `--public` without AWS credentials or PostgreSQL. Running a world has an additional prerequisite: its owning PostgreSQL database must contain the real records of the selected release's publication and current permissions. Downloading public bytes does not create those records or grant game installation. On a fresh machine, restore the verified publication catalog and reconcile the independently current authority through the recovery workflow below before creating the world or installing its release. An existing local world uses its existing owning database; ordinary asset installation does not require resetting it.

## Preserve and remove repository payloads

Before removal, inventory current tracked media, embedded payloads, generated geometry, historical changes and linked local sources. Freeze the approved history scope, preserve exact sources and provenance, publish the intended study/runtime copies, verify complete dependency closure, and qualify isolated recovery. Historical comparison pages must retain their original assets and the limits of their original verification. Missing original evidence must be identified explicitly; do not silently replace it with a different iteration.

The migration inventory and reference-rewrite tools make explicit plans first. Rewriting requires an exact original-path-to-verified-destination map; source-file links become stable source records/downloads, and dynamic galleries need a verified original-path mirror or complete equivalent mapping. Keep full inventories, staging and raw verification output outside Git. Only remove old tracked payloads after the owning [migration acceptance gates](maintainers/game-asset-storage.md) pass.

Removing tracked files makes the current checkout smaller. Old reachable Git objects remain until a separately authorized and coordinated history-reclamation operation; do not claim that checkout cleanup shrinks clones or rewrites other branches. Recovery and authority exports have separate permissions and current-restriction checks described in the [storage design](projects/game-asset-storage-tech-design.md).

## Create and verify recovery checkpoints

Use the configured recovery writer to preserve coherent publication metadata and every admitted physical asset location, including named viewer/mirror copies. `recovery-initialize --output /external/authority-work` establishes the independent current-permission marker for a new installation; normal operation reuses its configured marker and work directory. Access/rights changes must update that independent record, so an older backup cannot resurrect withdrawn content.

```sh
pnpm assets recovery-create --operation selected-asset-checkpoint --output /private/tmp/asset-checkpoint
pnpm assets recovery-verify --manifest /private/tmp/asset-checkpoint/locator.json --output /private/tmp/asset-verified-restore
```

Keep the returned checkpoint locator in durable operator storage. `recovery-create` captures the current owning database and its configured operational data directory; an explicitly selected `--source-root` can supply that directory. Use a new checkpoint identity and external work directory. `recovery-verify` uses the recovery reader, retains the checkpoint manifest and metadata locally, and streams every protected asset through a full hash check before reporting success. It does not retain those media streams in the verification directory, restore the application's database or publish recovered content.

The verified migration checkpoint has a small [checked-in exact locator](../assets/recovery/asset-migration-complete-20261017.json), so recovering its preserved collection does not depend on a temporary directory surviving. Supply that file to `recovery-verify --manifest`. It contains no credentials or saved-world data; the protected backup still requires the configured recovery permissions. Keep future checkpoint locators in durable operator storage too, rather than relying on terminal output or cache files.

When retained publication receipts name another trusted environment's buckets, supply its frozen configuration with `--source-config /external/frozen-environment.json` to `recovery-create`. Repeat the option for each required environment. The command verifies the recorded physical locations against these explicit configurations; it does not substitute the current bucket for an older receipt. Retain the configurations and locator in protected operator storage without embedding credentials.

For an isolated restore, explicitly configure `OPEN_LEGEND_DATABASE_URL` to a fresh empty recovery database, then run `recovery-restore-catalog --source-root /private/tmp/asset-verified-restore`. The command refuses a nonempty asset catalog and keeps restored access quarantined. `recovery-reconcile --output /private/tmp/current-recovery-authority` admits access only after verifying the independently current permission record and the operator's current authority. Missing or pending permission coverage leaves the restored catalog unavailable. Restoring the wider world/database and promoting recovered private objects retain their separate owning workflows; copying an old database alone is not authorization to serve assets.

After catalog restoration and current-authority reconciliation, `recovery-restore-objects --source-root /private/tmp/asset-verified-restore --quarantine-domain recovery-isolated-check --output /private/tmp/restored-asset-locations.json` streams the exact protected object versions into private intake quarantine, checking complete destination checksums and current permission. Its receipt identifies restored locations and unavailable files. Budget for these recovery reads as well as the earlier verification reads. It does not overwrite their original buckets, expose the quarantine publicly or install the recovered assets in a game; those operations require their normal publication and installation authority.

Object restoration requires an independently current, complete authority record matching the reconciled catalog generation before and after copying. Changed, pending or missing coverage refuses completion even if private copies were already written. Keep those copies quarantined, explicitly reconcile current authority, then retry the same exact restore. A rehearsal database does not become the publication authority: promotion uses the actual owning database or an explicitly chosen fresh recovery cutover with current authority reconciled again.

Recovery rehearsal copies are untagged and remain private after verification; no automatic expiry applies to them. Record the run's successful terminal completion in UTC beside its retained proof and receipt. Each receipt's `location` records the complete destination account, Region, bucket, key and version. Wait at least seven full days after the recorded completion before an operator with existing object-tagging permission marks its exact intake key/version pairs as disposable. The original files must have verified durable preservation. Check the receipt's `reference.boundary` is `intake`, its access domain is the completed `recovery-*` run, and `location.key` starts with that run's `runs/.../restored/` prefix. Confirm no active work, unpublished output or durable consumer depends on the copy. Read its existing tags with `s3api get-object-tagging`, preserve those tags, and use `s3api put-object-tagging` with the exact `location.bucket`, `location.key` and `location.versionId` (`--version-id`) to add `asset-run-state=terminal-disposable`. The receipt's `sourceLocation` identifies the original source, not the cleanup destination. Use the configured project profile and match the recorded account and Region. Do not tag a whole prefix indiscriminately or alter protected recovery/source versions.

The operator's waiting period preserves the terminal cleanup grace. The deployed intake rule applies only to `runs/` objects with that explicit tag: current versions become eligible after seven days of object age, and noncurrent versions after seven days as noncurrent. Tagging starts no additional grace period; an older object may become eligible immediately after tagging. S3 lifecycle processing is asynchronous. Untagged work remains retained, and durable asset/recovery prefixes have no age-based expiration. The [intake retention limit](limits/game-asset-storage.md#ast06--temporary-intake-and-previews) owns this policy.

For a complete saved-world restore into a fresh target, use the existing operational restore directly: after `recovery-verify`, select a genuinely empty target database and fresh `OPEN_LEGEND_DATA_DIR`, then run `pnpm exec tsx scripts/restore-world.ts /private/tmp/asset-verified-restore/metadata/world`. Keep the game stopped. Do not run `recovery-restore-catalog` into that same target first; this fresh-target path requires empty operational tables. A world with external assets checks independently current authority before installation and restores captured asset records under quarantine. After the slow file/database work, it fetches current authority again and activates access in a short transaction that verifies the complete saved asset dependencies. An interrupted activation remains quarantined; retry the identical backup against the unchanged target to complete it. A changed target is refused. A native-only backup needs no AWS access. The [operational save/restore contract](save-and-load.md) owns the full-world procedure and its current-format requirements.
