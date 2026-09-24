# Recast completion observations

This supplements [implementation evidence](recast-integration.md), not the [SW delivery tracker](../maintainers/spatial-world.md). The implemented movement, collision and presentation source was committed at `c1919b8310cf400ca23c64953fe9fe2668a276ca`. Final continuation recovered that source at `a6f1a6a96ce9bee0664307e708307bac84fe2f36`; the latter changed only its temporary export workflow. The same runtime was reviewed and run again without replacing its dependencies or adding automated tests. No unit, integration or browser suites were run and no paid provider calls were made.

## Recovered browser evidence

GitHub Actions run [35949147319](https://github.com/Macrofold/OpenLegend/actions/runs/35949147319) built and committed the completed source, then ran an ad-hoc Playwright browser observation against that working tree. It used the normal production entrypoint, isolated SQLite storage, zero AI budget and headless Chromium with software rendering. Artifact `recast-completion-observation` contains screenshots, logs and `observations.json`. This is a recorded application exercise, not a reusable automated assertion suite or physical-GPU benchmark.

The page returned HTTP 200 and the canvas reached `data-ready=true`. Right-button dragging changed yaw from 0 to approximately -0.945 radians and pitch from 0.88 to 1.15, without snapping. A normal admitted move reached approximately `{x:23.99963,y:3,z:6.00394}` on `lookout-deck` and completed. The screenshots show mixed sprites/meshes, lit ground, the fire-light pool, and actual projected shadows on the deck/terrain. The captured console/page error list was empty.

The preferences API changed reveal Off then Nearby, radius 8 and strength 0.9; reload preserved those values and the deck position. This does **not** independently qualify revealing an occluded target: the off/on screenshots did not deliberately place the player behind an obstruction. The script also looked for the controls under Game and did not find them. Source inspection confirmed that World visibility is in **Settings and help**, not Game; README now points there. UI selection/accessibility and the full occlusion/shadow/art matrix remain SR18–SR19 and SW18.6, not checked off from this record. Commercial-art parity, night/backlighting quality and GPU performance are not established by these screenshots.

## Final running-application continuation

Production TypeScript (`tsc --noEmit -p tsconfig.build.json`) and Vite builds passed again. The pre-existing large client bundle warning remains. The full repository check was not run or claimed green.

The production server ran on loopback port 3246 against a new `/mnt/data/ol-final-live` SQLite directory, with a minimal explicit environment, zero AI budget and no provider credentials. Normal authenticated presence/control/profile/command calls saved Nearby/8 m/0.9 preferences, moved from the clearing onto the deck, rejected the same elevated coordinates with `terrain` support, then completed the descent to `{x:20,y:0,z:5}` on terrain underneath. A clean pause/shutdown/restart retained that exact lower position/support and the preferences and reopened paused. Both server processes were stopped; no prior user save was modified.

## Final bounded worker stress observation

A disposable script outside the repository invoked the actual navigation worker, shared collision runtime and native segment predicate. Node 22.16.0 ran on an AMD EPYC 9V74 container. The actual 28-by-24 seed-1086 map received 24 additional stacked 22-by-19-metre support patches, 2.5 metres apart, for 27 authored surfaces. No admission limit was raised. One cold request was followed by 32 requests in four batches of eight, all using the same prepared geometry and person profile.

The cold worker startup/build/query round trip was 2332.16 ms, including 2020.17 ms reported build time and 11.20 ms query time. All 33 requests returned reached. The accepted route had five points and every returned segment passed the native movement predicate. Warm queue/IPC-inclusive median/p95 round trips were 11.04/21.47 ms. A 5 ms main-thread heartbeat had a maximum observed gap of 7.60 ms while this work ran. Reported process RSS afterward was 172.1 MiB, including more than the worker; it is not isolated WASM use or a leak result.

These are one cold sample and small warm batches, not a throughput, FPS, tail-latency or many-world capacity guarantee. The result demonstrates off-thread work with real adapter validation; it does not remove the player's cold preparation wait. Generation/profile-cache reuse, bounded scheduling, sampled narrow passages and previous resource/bird stress are described in the companion record. Sustained memory, dynamic crowds, tiled rebuilds and the full visual matrix remain explicit SW/SR work.

## Final repository state

Temporary source/export/publication workflows and payload files were removed, and the original normal CI definitions restored. Final documentation/cleanup commits use `[skip ci]` for this request only; future normal changes are not permanently exempted. The README's fresh-save example now uses `.data-recast` rather than reusing the earlier schema-9 `.data-spatial-3d` directory. First-party code, the pinned lockfile, generated assets and the existing acceptance TODOs remain on the feature branch; nothing was merged into main.
