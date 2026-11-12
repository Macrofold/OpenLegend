# Body reference family — design concepts

This design study supports the proposed [body reference-family workflow](../../../docs/production-workflows/art-flows/body-reference-family.md). It creates no Meshy donors, runtime targets or game selection. MHP10's anatomy/shirt acceptance remains open.

## Generated output and limits

`references/covered-build-overview.png` is a six-build, fully clothed ImageGen overview. Its top row depicts slender, athletic and broad muscular silhouettes; its bottom row depicts slender-soft, moderate-soft and fuller silhouettes. It illustrates distributed fullness and differences in overall build. Clothing obscures muscle surfaces, panel framing differs and identity is not constant. **It is not an accepted anatomy source, not a numerical slider grid, and must not be submitted as a multi-view body donor.**

The earlier anatomy edit used the approved Peacock body sheet from `2026-11-11-peacock-meshy-conform/study/references/body/sheet.png`, requesting a neutral bald head and close-fitting opaque white medieval linen coverage. ImageGen rejected that request and a second covered-adult anatomy request. The successful full-outfit illustration is a distinct fallback; the requested anatomy references remain incomplete. Do not infer model anatomy from these clothes or treat provider refusal as evidence that the pipeline works.

Exact prompts, input role, rejection request IDs, output disposition and cost limits are in `generation-record.json`. The built-in `image_gen.imagegen` tool does not expose the model ID; none is inferred from an API default. The generated PNG SHA-256 is `ba3ccb028dc6826aa3c79713b5ed1bfd76c4d2e3ddbde44f95af1579185720f3` (verify against the pinned index before use).

## Preservation

Mike authorized local preservation and private archival of this workflow's image and prompts. The exact [private selection](body-reference-family.index.json) pins collection `art-studies`, asset `body-reference-family-concepts`, revision `body-reference-design-20261112-ba3ccb028dc6`, manifest SHA-256 `de481effc0dd2922508791cf6dbb7e0de72cab59fd3dd277084c823728e3fd7c`. Payloads belong outside Git. Working copy: `/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study/`.

Private publication succeeded through the existing asset authority. Fresh temporary-workspace restores verified both files against their pinned SHA-256 and byte counts (1,920,886-byte PNG and 5,723-byte prompt record). The selection grants no public or runtime use. Preserve the source record rather than copying this image into a public study or production catalogue.

## Design-only evidence

Read-only inspection found existing support for bipolar targets, multi-driver corrections, age-conditioned mesh responses and dependency-aware shape reuse in `person-family.ts`, with shared compilation/binding helpers in `scripts/art/people.py`. Dedicated age-conditioned internal joint landmarks remain a gap where structural proportions change. No executable source was changed.

A disposable numerical calculation compared the proposed grid decomposition with direct piecewise trilinear interpolation for 27 nodes and 1,000 interior points using synthetic three-component arrays. Maximum residual was `8.881784197001252e-16`. This checks the algebra only; no actual donor, family compiler, skinning, clothing, renderer or performance pass follows from it.

No Meshy or other paid provider API jobs ran for this design. Built-in image generation billing is not exposed. AWS private archive operations have usage costs not separately itemized here; no new infrastructure or source licenses were purchased. Source production and the proposed runtime experiments require their own authorized execution within the remaining cumulative task allowance.
