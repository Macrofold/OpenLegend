# Character visibility and target feedback

| Status    | Current progress                                                                                       | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------ | ------------ |
| Completed | Rendering, selection refusal and delayed outlines are implemented and checked in an isolated checkout. | 2026-10-03   |

## Agreed experience

An unselected campfire behind a person must stay behind that person. Read-through may reveal currently perceived targets through walls, floors and decorative trees, but never through another person or ordinary object. A selected, currently perceived thing is drawn in front, independently of read-through preferences. Selection does not change what the controlled character knows.

Clicking a remembered image or an image hidden by the character's sight-focus mask must refuse selection with the controlled character's name and “can't see this.” It must not issue a movement command or reveal the remembered thing's identity. Completely undisclosed things have no image or click target. Losing current perception clears selection and all visual emphasis immediately.

Holding the pointer over one selectable thing for more than one real second fades in a glowing silhouette outline. Moving within the same silhouette retains the timer. Leaving, dragging, window blur, cancellation, target replacement and permission loss reset it. Reduced motion preserves the delay and uses immediate onset instead of a fade. Hover adds no perception or selection authority.

## Owners and implementation

The server's existing scoped entity projection remains the authority for current perception. No world rules, save format, provider calls or protocol disclosures change. React validates list/menu inspection against its latest projection; the renderer validates canvas selection against its current projection and existing sight-focus restriction. One renderer callback reports refusal through the existing notice surface.

The existing presentation owner marks camera-obstructing scenery in the world stencil buffer. Ordinary read-through checks that mark before drawing hidden fragments. People and ordinary objects clear it when their normally visible fragments win depth testing. A preliminary color-free pass protects the full alpha silhouette of eligible characters, including faded edges; object read-through then precedes character read-through. This preserves character readability where both are hidden by scenery. A separate final layer draws only the permitted selected target. Sprite fronts and the pixel-rendered model use their existing alpha/depth representations.

A renderer-owned outline helper reuses PlayCanvas's pinned outline renderer, borrowed mesh transforms and alpha textures, with isolated material copies. Only one hovered target is processed, after the delay; materials, meshes, layers, cameras and targets have explicit replacement/destruction. Character pixel composites supply their existing silhouette rather than a rectangular box. The outline blend excludes foreground people for any unselected target.

Estimated implementation: roughly 400–650 changed logic lines across presentation, scene, character composite and React selection entrypoints. Moderate rendering/lifecycle risk; no data migration or paid execution. Main has concurrent work and is not modified by this checkout.

## Delivery and verification

1. Restrict scenery read-through and add selected foreground presentation across sprites, crates and the live pixel character.
2. Unify perception checks at selection entrypoints, refusal feedback and immediate revocation; preserve drag/context-menu behavior.
3. Add delayed, fading hover silhouettes and lifecycle cleanup.
4. Reconcile the presentation contract, UI guidance, limits and spatial tracker with actual delivered behavior.
5. Run pinned formatting, TypeScript and production build checks. Use a separate no-cost browser fixture to inspect the reported fire/person overlap, selected exception, scenery occlusion, denied clicks, hover timing/reset, model/sprite/crate silhouettes, camera changes and teardown. Run the relevant existing camera checks.

Completion requires all agreed behavior, scoped review fixes, documentation and selected checks. Browser evidence must distinguish fixture rendering from live-server/perception qualification. No raw logs or screenshots enter Git. All scoped completion checks passed; [verification](../../verification/character-visibility.md) records actual results and existing broader limits. The change remains isolated from the concurrent main checkout; integration into main was not requested in this side conversation.

## Maintained records

- Implementation: [SW18](../../maintainers/spatial-world.md#sw18--world-presentation-delivery).
- Current contract: [World presentation](../../world-presentation.md#local-read-through).
- Limits: [VP01 and HV01](../../limits/interface.md#vp01).
