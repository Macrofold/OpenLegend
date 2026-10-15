# Library hare art

The unchanged source file `cdmir-rabbit-source.blend` is **Rabbit**, by **CDmir** with collaborator **TinyWorlds**, published November 14, 2015 for Kelgar.

- Creator's source and explicit CC0 release: <https://opengameart.org/content/rabbit-0>
- Exact download: <https://opengameart.org/sites/default/files/rabbit.blend>
- License: **CC0 1.0 Universal**, retained in `CC0-1.0.txt`.
- Downloaded October 15, 2026. Original SHA-256: `bb6deef1ee91b21380355138374cae87946451ce864502b1af68eb60f4750843`.

OpenLegend retains the source animal's solid geometry, weighted skeleton and actual Sitting/Running motions. The preparation removes the separate alpha fur shell and whisker cards, authors a new fixed 64×64 coat atlas, preserves separate eye geometry, normalizes skin weights to the runtime's four-weight format and fits the neutral pose to 0.45 metres. Field has a slender body and longer ears; russet has a broader body and swept ears; winter has a fuller body/cheeks and shorter ears. Each also has distinct back, belly, muzzle, ear and tip paint. These are presentation alternatives, not new species, native bodies or gameplay actions.

`Idle` is the creator's Sitting motion; `Run` is the creator's Running motion. Source constraints are sampled into the exported skeleton. No artificial attack, feeding or death action is claimed. Unsupported native body/action states keep the existing sprite through the scene's ordinary admission rules.

Reproduce with Blender 5.2.2 LTS, without executing scripts from the source:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python scripts/prepare-library-animals.py -- --source apps/client/src/props/library-animals/cdmir-rabbit-source.blend --output apps/client/src/props/library-animals
```

`preparation.json` records each output's exact digest, size, texture dimensions and neutral-pose fit. The original photographic textures and normal maps remain preserved only inside the unchanged source; they are absent from the prepared runtime assets. No provider generation or paid asset purchase was used.
