import { z } from 'zod';
import {
  assertAssetRevisionReference,
  assetRevisionKey,
  indexedAsset,
  sameAssetRevision,
  isRepositoryAssetPath,
  type AssetIndex,
  type AssetRevisionReference,
} from '@open-legend/assets';
import { validateAppearanceFamily, type AppearanceFamilyDefinition } from '@open-legend/domain';
import type { AssetRepository } from './asset-repository.js';

const named = z.object({ id: z.string(), label: z.string() }).strict();
// This is the public metadata boundary. Domain admission below owns reference,
// namespace, defaults, choices and envelope semantics; extra source provenance
// cannot enter a creator projection by being spread into an installed definition.
const descriptorMetadata = z
  .object({
    label: z.string(),
    groups: z.array(named),
    controls: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          group: z.string(),
          kind: z.enum(['bipolar', 'frame', 'stature', 'age', 'styleLength']),
          minimum: z.number(),
          maximum: z.number(),
          defaultValue: z.number(),
          unit: z.string().optional(),
        })
        .strict(),
    ),
    selections: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          group: z.string(),
          defaultValue: z.string(),
          options: z.array(named),
        })
        .strict(),
    ),
    presets: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          group: z.string(),
          controls: z.record(z.string(), z.number()),
          selections: z.record(z.string(), z.string()),
        })
        .strict(),
    ),
    constraints: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          maximum: z.number(),
          terms: z.array(z.object({ control: z.string(), coefficient: z.number() }).strict()),
        })
        .strict(),
    ),
  })
  .strict();

const selections = z.array(
  z
    .object({
      descriptor: z.custom<AssetRevisionReference>((value) => {
        try {
          assertAssetRevisionReference(value);
          return true;
        } catch {
          return false;
        }
      }),
      compiledPath: z.string().refine(isRepositoryAssetPath),
    })
    .strict(),
);

/** Only a trusted installed runtime release can introduce appearance definitions.
 * The world-owned opening decides whether and how to consume them; saved-world
 * reopening does not apply this initial installation again.
 */
export async function installedAppearanceFamilies(
  assets: AssetRepository,
  index: AssetIndex,
): Promise<AppearanceFamilyDefinition[]> {
  const closure = await assets.permittedRevisionClosure(index.release);
  if (
    closure.record.manifest.kind !== 'release' ||
    closure.record.destination.boundary !== 'runtime'
  )
    throw new Error('Appearance installation requires a published runtime release.');
  const declared = closure.record.manifest.metadata['appearanceFamilies'];
  const entries = selections.parse(declared === undefined ? [] : declared);
  const records = new Map(
    [closure.record, ...closure.dependencies].map((record) => [
      assetRevisionKey(record.reference),
      record,
    ]),
  );
  const installed: AppearanceFamilyDefinition[] = [];
  const selected = new Set<string>();
  for (const entry of entries) {
    const key = assetRevisionKey(entry.descriptor);
    const descriptor = records.get(key);
    if (
      !descriptor ||
      !sameAssetRevision(descriptor.reference, entry.descriptor) ||
      descriptor.manifest.kind !== 'asset' ||
      descriptor.destination.boundary !== 'runtime' ||
      descriptor.destination.accessDomain !== 'public'
    )
      throw new Error('The appearance descriptor is not public metadata in the installed release.');
    const profile = descriptorMetadata.parse(descriptor.manifest.metadata['appearanceFamily']);
    const compiled = indexedAsset(index, entry.compiledPath);
    if (
      compiled.boundary !== 'runtime' ||
      compiled.accessDomain !== 'public' ||
      !/^application\/json(?:;|$)/.test(compiled.mediaType)
    )
      throw new Error('The compiled appearance file is not a public runtime representation.');
    await assets.authorizeArtifact(undefined, index.release, compiled);
    const family = {
      ...profile,
      reference: entry.descriptor,
      compiled,
      compiledPath: entry.compiledPath,
    };
    validateAppearanceFamily(family);
    if (selected.has(key)) throw new Error('The installed release repeats an appearance family.');
    selected.add(key);
    installed.push(family);
  }
  return installed;
}
