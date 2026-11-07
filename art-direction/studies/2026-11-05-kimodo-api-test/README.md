# Kimodo source proof

Mike accepted the four-second walking preview on November 5, 2026 and selected Kimodo as the
core human-motion authoring source. The [animation procedure](../../../docs/production-workflows/art-flows/animation.md)
owns source selection; [tools and defaults](../../../docs/production-workflows/art-flows/tools.md#human-motion-generation)
owns the current provider/settings and price interpretation. This record establishes source
generation and import, not a finished character animation.

## Request and result

One Replicate `sprited/kimodo` prediction, `nqpp0n38jhrmy0d1nw6bj27zkg`, succeeded using
`Kimodo-SOMA-RP-v1.1`, deployment
`17111248e89aa145d768cc1e5f7baae228f69d854b996b860becfee287379545`.
Prompt: “A person walks forward at an even relaxed pace with natural arm swings”.
Controls: four seconds, one sample, seed 42, 100 diffusion steps, postprocess enabled,
root margin 0.04, individual BVH output, auxiliary metadata and a 512-pixel preview enabled.
One submission used a 120-second cancellation deadline; no paid retry or second prediction ran.

- BVH: 278,639 bytes of text, 120 poses at 30 Hz, 240 numbers per pose; rows have the expected
  width and finite values. It contains 77 SOMA body joints plus a `Root` wrapper, while metadata
  lists only the 77 body joints. Both `Root` and `Hips` declare translation channels.
- Blender 5.2.3 imported 78 animated bones with centimetres converted to metres. Five sampled
  poses changed; the editable scene spans frames 1–120. Auxiliary/end nodes produced zero-length
  warnings. This does not establish independent finger or facial animation.
- The four-second front/side MP4 decoded all 120 frames at 30 Hz, 1024×512. Sampled views show
  upright walking and alternating steps, with bent elbows and modest arm swing. It is a skeleton
  preview. The untrusted generated HTML viewer was retained without execution.
- Provider processing: 36.164281869 seconds; total request elapsed time: 57.250022334 seconds.
  At $0.000975/processing second, estimated cost is **$0.035260174822275**. No cash invoice was
  observed. The $0.25 reservation was released; it was not the charge.

Retargeting onto our characters, clothing deformation, contact after retargeting, clean looping,
gameplay timing and broader motion quality remain untested under [AF15/AF16](../../../docs/maintainers/art-direction.md#art-flow-follow-through).
Reuse this exact source for mapping work before buying another candidate. No character, image,
world data or restricted BONES example motion was uploaded; only the original text prompt was sent.

## Exact private preservation

The verified source bundle contains 21 files, 1,475,572 bytes: raw motion, preview, metadata,
redacted receipt/schema/logs, numerical/video inspection, editable Blender source and test recipes.
All files were hash-verified after publication; credentials and expiring output URLs are excluded.
This preserves source/private-study/offline/recovery use, without public or runtime approval.

| Reference                | Value                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| Owner                    | `collection: art-studies`                                          |
| Asset                    | `kimodo-api-test`                                                  |
| Revision                 | `walk-soma-rp-v1-1-2026-11-05-verified`                            |
| Manifest SHA-256         | `7c14e1b0a00f28f012e182b9cc2a9737c82fc886cbb49c05a4cddddd30904027` |
| Boundary / access domain | `art-library` / `curated-private`                                  |

The external working directory is
`/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-05-kimodo-api-test/study/`;
`archive/source.index.json`, `publication.json` and `verification.json` identify the exact archive.
Use the [authenticated asset workflow](../../../docs/asset-workflow.md#edit-or-generate-art)
to restore an independent workspace from this index. The frozen bundle's README records the
generation test; this maintained record also records Mike's subsequent acceptance and source choice.
