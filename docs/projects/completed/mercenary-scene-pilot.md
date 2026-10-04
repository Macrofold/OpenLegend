# Mercenary in the playable scene

| Status    | Current progress                                                                                                                                | Last updated |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | The additional NPC and fixed-resolution depth rendering are delivered and locally checked; broader art and crowd qualification remain separate. | 2026-10-04   |

Authorized September 28, 2026: put the existing mercenary study character into the game scene. This is a narrow V3D01 / SW18.14 pilot, not authorization for the proposed generated-appearance infrastructure or a world-wide art conversion.

## Art sources and progress

The active source is `/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/`. The [mercenary art record](../../maintainers/art/mercenary.md) links the viewer, Blender projects, source assets, dated packages and remaining art-review work. [Technical evidence](../../verification/mercenary-default.md) remains separate from style acceptance.

## Scope and approach

Superseding the earlier player-replacement/opt-in plan, the owner explicitly requests a separate mercenary NPC beside Ada in the default bundled scene. Add an authored `mercenary-model` appearance through the existing public appearance field; do not select models by player identity or URL. Preserve identity, position/support, heading, inventory, actions, observation and save authority. The existing sprite stays available during loading, after failure, and for unsupported horizontal/dead/action states; equipment composition remains unqualified. Reuse the actual world camera, sunlight/fire shadows, reveal, selection, status and motion owners. Do not bring the isolated viewer's studio lights, plinth or low-resolution whole-scene canvas into the game.

Carry over stable pixel materials and the corrected moving cape. Package one trusted, self-contained bundled GLB containing idle/walk clips, plus body-derived cape data. No arbitrary URL importer, paid work, protocol/save migration, dependency upgrade or artwork regeneration. The asset is an art-study pilot, not a qualified production humanoid family.

Estimated affected logic: 800–1,100 lines, mostly the existing cloth/material code made typed and lifecycle-owned, plus a small model owner and renderer integration. Moderate risk: animated contact, supported-state fallback, skin/reveal duplication, stale loads, shadow membership, GPU cleanup and per-frame cost. Keep helpers renderer-local; special morphology/contact data stays with this authored asset.

## Base and existing work

This section records the September 28 implementation environment, not instructions to return to that branch or reuse another task’s edits. Later work follows the current [base-selection policy](../../../.agents/skills/openlegend-rebase/SKILL.md).

Remote `https://github.com/Macrofold/OpenLegend.git`, verified default `origin/main@c5455cf8fc9e4d4fe03034a7f069d6d6581bb8f2`, refreshed before implementation. At implementation, `codex/shadow-quality@cfa81e9d` already contained that commit; no rebase or branch change was needed. The task preserved pre-existing uncommitted shadow batching and qualification work and retained its initial affected-file snapshots outside the checkout. This historical record grants no permission to stage unrelated work.

## Implementation and verification

The sequence and follow-up below describe delivered work. The completed pilot is not permission to implement the broader proposed appearance pipeline, and its local measurements do not establish production art acceptance.

1. Produce one self-contained model with both existing clips, preserve source provenance/digests, and bound this pilot to the known bundled asset. Keep the source study intact.
2. Add typed, scene-owned model/material/cloth resources. Drive heading and movement from projected state; freeze on pause and release or hide immediately on replacement/removal. Bind contacts to the reference skeleton and ground the cloth relative to current support height.
3. Integrate model geometry with existing shadows, depth-aware selection and authorized read-through. Do not leave an effective sprite caster/picker under the model. Unsupported states restore the existing truthful sprite.
4. Inspect the actual playable scene at full HD: idle/walk/turn, camera orbit, sunlight/firelight, ground/ramp contact, picking/reveal, pause, fallback and reload/teardown. Use disposable native state and zero provider budget. Run focused static/build checks and appropriate existing camera/spatial checks where their dependencies are available; record missing coverage honestly.
5. Review the full task diff against the preserved baseline, reconcile V3D01/SW18.14, current presentation documentation and limits/evidence. Do not close the broader 3D pipeline or claim crowd/low-end qualification from one character.

Completion requires the user-accessible game scene showing the moving model with working native movement/selection and no duplicate shadow, plus verified lifetime and documented remaining pose/performance limits.

## Fixed character pixels and default NPC — authorized follow-up

The owner requests a real additional character, animated model, fixed character image resolution, and actual depth compositing. Keep Ada and the player. New base worlds include the mercenary; existing saves are not silently rewritten or reset. No save migration or provider execution is part of this work.

Plan estimate: approximately 350–600 additional logic lines over the existing 800–1,100-line model/cloth pilot. Moderate cross-layer risk: authored appearance projection, camera projection/depth conventions, shared-light shadows, skinned pose order, occlusion/reveal and cleanup. Extend the existing appearance union for the concrete bundled asset without introducing a general importer. Use one renderer-owned fixed 128×192 color/depth target per model, a cropped copy of the world camera projection, and nearest sampling in a depth-writing composite. Preserve projection Z/W so sampled depth agrees with the main scene. Model geometry remains the sole shadow caster. Main scene/HUD stay full resolution. Keep per-character allocation bounded and release passes, layers, targets and meshes with each representation.

1. Add the mercenary to authored base content with ordinary NPC state and scoped appearance projection; preserve Ada and existing identity/observation rules.
2. Replace opt-in/player selection with the authored appearance. Fix existing installation/lifecycle/cloth bugs found during integration.
3. Implement fixed-resolution color/depth rendering using the existing camera and lighting. Avoid a flat billboard depth or a full-resolution reveal copy; support pause, orbit/zoom, perspective/orthographic and near-plane handling.
4. Verify the default world through the actual client using disposable, zero-provider native state. Inspect movement/turning/cape, zoom at constant texture size, foreground/background occlusion, shadows, selection, hidden/removal/fallback and repeated scene disposal. Measure the added frame/resource cost; no physical low-end/crowd claim from one model.
5. Run focused existing checks, TypeScript/production build/changed-file formatting, review the full owned diff, and reconcile V3D01/SW18.14/current presentation/limits/evidence. Preserve concurrent server optimization work and use private verification output.

Completion requires an accessible default scene containing both Ada and the separate animated mercenary, stable fixed-resolution character pixels with depth-correct occlusion, passing selected checks and documented remaining asset limitations. This explicitly replaces the earlier opt-in restriction and player replacement decision.

### Review correction: reuse the world's shadow passes

The first full-HD comparison measured about 12 ms GPU with the independent sample camera versus 6 ms with the sprite fallback. Replace that second camera with a bounded character-color pass scheduled through the world camera's `beforePasses`, after its shadows. Reuse that camera's directional-shadow data and the existing local-light atlas, with a cropped projection only for character color/depth. The pass restores the camera projection and tone/gamma state before the ordinary world draw. A renderer-owned light cluster supplies the same admitted world lights. This removes duplicated directional shadow work; validate depth, light response, matched GPU cost and resource replacement again. No shadow caching or stale pose is permitted.

## Delivered scope

The default additional NPC and fixed-resolution, actual-depth rendering are implemented and exercised through the real client. [Verification](../../verification/mercenary-default.md) records native persistence/privacy checks, 1080p visual and failure/lifetime checks, build/static checks and the measured added cost. Removed duplicate directional-shadow rendering, retained the shared shader preparation path, bounded initial cape settling, corrected unused skin-reference retention and content-hashed the asset. The supplied source study remains intact. The broader art pipeline, equipment/pose expansion and crowd/low-end qualification remain with V3D01/V3D05/V3D11; no other task's performance result qualifies this model.
