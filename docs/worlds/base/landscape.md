# Starting wilderness

New bundled worlds begin in a larger wilderness around the established camp and lookout. Its size is about five times the former area, keeping a useful local view while leaving places to explore beyond it. The conspicuous rectangular clearing plate is replaced by matching surrounding soil and an uneven forest margin. The native map remains finite; walking beyond supported ground is refused. Existing saved worlds are neither reseeded nor reset.

## Places and inhabitants

The original camp, ford, lookout, supplies and bird flight corridor retain their working space. Beyond them are connected low rises, a bending river, more rock formations, scattered berry/wood/stone/fiber patches, and more hares and deer. Wolves and bears start farther east and south. They use existing wandering, perceived-threat escape, injury, harvest and body decay; this introduces no aggression, hunting other animals, packs or new animal intelligence. Their physical clearance currently reuses the existing quadruped profile, while their authored anatomy and harvest quantities belong to `bodies.ts`.

Broadleaf, birch and conifer silhouettes vary in height and width. Sparse trees and shrubs appear inland, with denser irregular woodland toward and beyond the perimeter. This static artwork is decorative: trees do not add collision, sight barriers, harvestable wood or new actions. Resources and rock formations remain separate native objects/geometry. Future interactive trees need that physical/action owner rather than deriving mechanics from pixels.

## Composition and presentation

`landscape.ts` owns seeded placement, density, material patches and wildlife; `spatial.ts` owns the connected supported rises. Placement noise does not consume the world's shared action randomness. Rock speckling leaves clearance around authored animals and supplies. Rendered hills use the exact supported heights and rocks derive their elevation from that ground.

Static scenery travels as public saved artwork records with stable identities, trusted appearance keys, seeds, positions and sizes. It cannot disclose actors or private contents. The client resolves keys through finite original Canvas generators; no supplied JavaScript, URLs, external artwork or new model-generation service is involved. Ground detail shares instanced draws and tree artwork/materials are shared by inputs. Existing scene and shadow owners release their resources when rebuilding or disposing the view. See [the reusable spatial contract](../../spatial-world.md#static-scenery) and [presentation](../../world-presentation.md#static-landscape).

## Maintained records

- Implementation: [BW24](../../maintainers/base-world.md#bw24--fuller-starting-wilderness).
- Limits and tuning: [BW13](../../limits/base-world.md#bw13--starting-wilderness); shared artwork bounds: [SP07](../../limits/spatial.md#sp07--public-static-scenery).
- Evidence: [native, persistence and browser checks](../../verification/wilderness-expansion.md).
