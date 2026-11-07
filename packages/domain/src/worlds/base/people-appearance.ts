import {
  assetRevisionKey,
  type ArtifactReference,
  type AssetRevisionReference,
} from '@open-legend/assets';
import {
  validateAppearanceFamily,
  type AppearanceControlDefinition,
  type AppearanceFamilyDefinition,
} from '../../appearance.js';
import { validateAppearanceState } from '../../appearance-state.js';
import { BASE_BODY_PROFILES } from './spatial-definitions.js';
import type { ItemDefinition, WorldState } from '../../types.js';
import { canonicalJson } from '../../events.js';

const localControl = (id: string, label: string, group = 'body'): AppearanceControlDefinition => ({
  id,
  label,
  group,
  kind: 'bipolar',
  minimum: 0,
  maximum: 1,
  defaultValue: 0.5,
});

/** Human content has one authoring owner. The art compiler exports this metadata;
 * its geometry must implement these controls before the exact family is installed. */
export const BASE_APPEARANCE_PROFILE: Omit<
  AppearanceFamilyDefinition,
  'reference' | 'compiled' | 'compiledPath'
> = {
  label: 'Wayfarer people',
  groups: [
    { id: 'body', label: 'Body' },
    { id: 'face', label: 'Face' },
    { id: 'hair', label: 'Hair' },
    { id: 'surface', label: 'Skin and eyes' },
    { id: 'coverage', label: 'Underclothes' },
  ],
  controls: [
    {
      id: 'frame',
      label: 'Frame',
      group: 'body',
      kind: 'frame',
      minimum: 0,
      maximum: 1,
      defaultValue: 0.5,
    },
    {
      id: 'statureMetres',
      label: 'Height',
      group: 'body',
      kind: 'stature',
      minimum: 1.5,
      maximum: 2.1,
      defaultValue: 1.75,
      unit: 'm',
    },
    ...(
      [
        ['breadth', 'Build'],
        ['shoulderBreadth', 'Shoulder breadth'],
        ['hipBreadth', 'Hip breadth'],
        ['muscle', 'Muscle'],
        ['fullness', 'Fullness'],
        ['belly', 'Belly'],
        ['chestVolume', 'Chest volume'],
        ['legLength', 'Leg length'],
        ['armLength', 'Arm length'],
        ['neckLength', 'Neck length'],
        ['neckGirth', 'Neck girth'],
      ] as const
    ).map(([id, label]) => localControl(id, label)),
    ...(
      [
        ['headWidth', 'Head width'],
        ['headLength', 'Head length'],
        ['jawWidth', 'Jaw width'],
        ['chinWidth', 'Chin width'],
        ['chinProjection', 'Chin projection'],
        ['cheekboneWidth', 'Cheekbones'],
        ['browHeight', 'Brow height'],
        ['eyeAperture', 'Eye opening'],
        ['eyeSpacing', 'Eye spacing'],
        ['eyeTilt', 'Eye tilt'],
        ['noseBridge', 'Nose bridge'],
        ['noseTip', 'Nose tip'],
        ['noseWidth', 'Nose width'],
        ['lipWidth', 'Mouth width'],
        ['lipFullness', 'Lip fullness'],
        ['earSize', 'Ear size'],
        ['earPosition', 'Ear position'],
      ] as const
    ).map(([id, label]) => localControl(id, label, 'face')),
    {
      id: 'adultAgeYears',
      label: 'Age appearance',
      group: 'surface',
      kind: 'age',
      minimum: 18,
      maximum: 80,
      defaultValue: 35,
      unit: 'years',
    },
    {
      id: 'hairLength',
      label: 'Hair length',
      group: 'hair',
      kind: 'styleLength',
      minimum: 0,
      maximum: 1,
      defaultValue: 0.5,
    },
    {
      id: 'greying',
      label: 'Grey hair',
      group: 'hair',
      kind: 'bipolar',
      minimum: 0,
      maximum: 1,
      defaultValue: 0,
    },
  ] satisfies AppearanceControlDefinition[],
  selections: [
    {
      id: 'face',
      label: 'Face',
      group: 'face',
      defaultValue: 'face-a',
      options: [
        { id: 'face-a', label: 'First face' },
        { id: 'face-b', label: 'Second face' },
      ],
    },
    {
      id: 'hair',
      label: 'Hairstyle',
      group: 'hair',
      defaultValue: 'short-swept',
      options: [
        { id: 'none', label: 'No hair' },
        { id: 'short-swept', label: 'Short and swept' },
        { id: 'tied-braid', label: 'Tied braid' },
      ],
    },
    {
      id: 'coverage',
      label: 'Underclothes',
      group: 'coverage',
      defaultValue: 'bra-and-briefs',
      options: [
        { id: 'loincloth', label: 'Linen loincloth' },
        { id: 'bra-and-briefs', label: 'Linen bra and briefs' },
      ],
    },
    {
      id: 'skin',
      label: 'Skin tone',
      group: 'surface',
      defaultValue: 'warm-neutral',
      options: [
        { id: 'light-neutral', label: 'Light neutral' },
        { id: 'warm-neutral', label: 'Warm neutral' },
        { id: 'deep-neutral', label: 'Deep neutral' },
      ],
    },
    {
      id: 'iris',
      label: 'Eye colour',
      group: 'surface',
      defaultValue: 'green-umber',
      options: [
        { id: 'green-umber', label: 'Green' },
        { id: 'brown', label: 'Brown' },
        { id: 'blue-grey', label: 'Blue grey' },
      ],
    },
    {
      id: 'hairPigment',
      label: 'Hair colour',
      group: 'hair',
      defaultValue: 'dark-brown',
      options: [
        { id: 'dark-brown', label: 'Dark brown' },
        { id: 'black', label: 'Black' },
        { id: 'auburn', label: 'Auburn' },
        { id: 'fair', label: 'Fair' },
      ],
    },
  ],
  presets: [
    {
      id: 'feminine-frame',
      label: 'Feminine frame',
      group: 'body',
      controls: { frame: 0 },
      selections: {},
    },
    {
      id: 'masculine-frame',
      label: 'Masculine frame',
      group: 'body',
      controls: { frame: 1 },
      selections: {},
    },
    {
      id: 'fit',
      label: 'Fit',
      group: 'body',
      controls: { muscle: 0.76, fullness: 0.25, breadth: 0.48 },
      selections: {},
    },
  ],
  constraints: [],
} satisfies Omit<AppearanceFamilyDefinition, 'reference' | 'compiled' | 'compiledPath'>;

export const BASE_WARDROBE = [
  {
    id: 'wayfarer-shirt',
    defaultForCreation: true,
    name: 'Wayfarer shirt',
    port: 'torso',
    partId: 'shirt',
    description: 'A green linen shirt with separate sleeves and a loose lower hem.',
    properties: ['fiber'],
  },
  {
    id: 'wayfarer-trousers',
    defaultForCreation: true,
    name: 'Wayfarer trousers',
    port: 'legs',
    partId: 'trousers',
    description: 'Fitted linen trousers.',
    properties: ['fiber'],
  },
  {
    id: 'wayfarer-gloves',
    defaultForCreation: false,
    name: 'Wayfarer gloves',
    port: 'hands',
    partId: 'gloves',
    description: 'A pair of fitted leather gloves.',
    properties: ['fiber'],
  },
  {
    id: 'wayfarer-padding',
    defaultForCreation: false,
    name: 'Wayfarer padding',
    port: 'inner-torso',
    partId: 'padding',
    description: 'Quilted linen worn beneath the outer layer.',
    properties: ['fiber'],
  },
  {
    id: 'wayfarer-plate',
    defaultForCreation: false,
    name: 'Wayfarer breastplate',
    port: 'outer-torso',
    partId: 'plate',
    description: 'A rigid breastplate held by leather straps.',
    properties: ['rigid'],
  },
  {
    id: 'wayfarer-hat',
    defaultForCreation: false,
    name: 'Wayfarer hat',
    port: 'head',
    partId: 'hat',
    description: 'A soft travelling hat.',
    properties: ['fiber'],
  },
  {
    id: 'wayfarer-boots',
    defaultForCreation: true,
    name: 'Wayfarer boots',
    port: 'feet',
    partId: 'boots',
    description: 'A pair of leather travelling boots.',
    properties: ['fiber'],
  },
  {
    id: 'wayfarer-necklace',
    defaultForCreation: true,
    name: 'Wayfarer necklace',
    port: 'neck',
    partId: 'necklace',
    description: 'A small pendant on a cord.',
    properties: ['rigid', 'fiber'],
  },
  {
    id: 'wayfarer-earrings',
    defaultForCreation: true,
    name: 'Wayfarer earrings',
    port: 'ears',
    partId: 'earrings',
    description: 'A pair of small earrings.',
    properties: ['rigid'],
  },
] satisfies Array<{
  id: string;
  name: string;
  port: string;
  partId: string;
  description: string;
  properties: ItemDefinition['properties'];
  defaultForCreation: boolean;
}>;

/** Trusted current-world installation after asset compilation/permission checks.
 * It adds the pilot to the existing opening; it neither changes existing people nor
 * resets world content. Generic spawn/edit consumes the installed exact definitions. */
export function installBaseAppearanceKit(
  world: WorldState,
  family: AppearanceFamilyDefinition,
): void {
  validateAppearanceFamily(family);
  if (!family.compiled || !family.compiledPath) throw new Error('A compiled family is required.');
  const key = assetRevisionKey(family.reference);
  // Preflight the complete installed set before publishing any definition. A
  // conflicting current item or exact release must not partially install a kit.
  const previous = world.appearanceDefinitions;
  if (previous?.families[key] && canonicalJson(previous.families[key]) !== canonicalJson(family))
    throw new Error('An installed appearance release cannot be replaced in place.');
  const definitions = {
    families: { ...previous?.families },
    wearables: { ...previous?.wearables },
    stature: { ...previous?.stature },
  };
  const itemDefinitions = { ...world.itemDefinitions };
  definitions.families[key] = family;
  definitions.stature[key] = {
    controlId: 'statureMetres',
    referenceBody: { ...BASE_BODY_PROFILES.person },
  };
  for (const {
    id,
    name,
    port,
    partId,
    description,
    properties,
    defaultForCreation,
  } of BASE_WARDROBE) {
    const definition: ItemDefinition = {
      id,
      version: 1,
      name,
      description,
      portable: true,
      packingLoad: 1,
      properties: [...properties],
      equipment: { ports: [port], uses: [] },
    };
    if (itemDefinitions[id] && canonicalJson(itemDefinitions[id]) !== canonicalJson(definition))
      throw new Error('An existing item definition conflicts with the wardrobe.');
    const part = { family: family.reference, partId, defaultForCreation };
    if (
      definitions.wearables[id] &&
      canonicalJson(definitions.wearables[id]) !== canonicalJson(part)
    )
      throw new Error('An installed wardrobe item belongs to a different appearance release.');
    itemDefinitions[id] = definition;
    definitions.wearables[id] = part;
  }
  validateAppearanceState({ ...world, itemDefinitions, appearanceDefinitions: definitions });
  world.itemDefinitions = itemDefinitions;
  world.appearanceDefinitions = definitions;
}

/** Public descriptor identity selected by this world's authored Main opening. */
export const BASE_APPEARANCE_ASSET = {
  owner: { kind: 'world', id: 'base' },
  assetId: 'wayfarer-adult-people',
} as const;

export function installBaseOpeningAppearances(
  world: WorldState,
  families: readonly AppearanceFamilyDefinition[],
): void {
  const selected = families.filter(
    (family) =>
      family.reference.owner.kind === BASE_APPEARANCE_ASSET.owner.kind &&
      family.reference.owner.id === BASE_APPEARANCE_ASSET.owner.id &&
      family.reference.assetId === BASE_APPEARANCE_ASSET.assetId,
  );
  if (selected.length > 1)
    throw new Error('The opening selects more than one adult family revision.');
  const family = selected[0];
  if (!family) return;
  // Human choices are authored here, rather than inferred from a matching file name.
  const {
    reference: _reference,
    compiled: _compiled,
    compiledPath: _compiledPath,
    ...profile
  } = family;
  if (canonicalJson(profile) !== canonicalJson(BASE_APPEARANCE_PROFILE))
    throw new Error("The installed adult family does not match this world's appearance profile.");
  installBaseAppearanceKit(world, family);
}

export function baseAppearanceFamily(
  reference: AssetRevisionReference,
  compiledPath: string,
  compiled: ArtifactReference,
): AppearanceFamilyDefinition {
  const family = { ...structuredClone(BASE_APPEARANCE_PROFILE), reference, compiledPath, compiled };
  validateAppearanceFamily(family);
  return family;
}
