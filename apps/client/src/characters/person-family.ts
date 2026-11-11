import {
  assertArtifactReference,
  assertAssetRevisionReference,
  isRepositoryAssetPath,
  sameAssetRevision,
  type ArtifactReference,
  type AssetRevisionReference,
} from '@open-legend/assets';
import type { AppearanceFamilyDefinition, AppearanceRecipe } from '@open-legend/protocol';
import { assertPersonMotionLibrary, type PersonMotionLibrary } from './person-motion';

/** Compiled once from the editable family, in glTF metres (Y up, +Z forward).
 * These arrays are immutable sources, never another wearer's evaluated buffers.
 * docs/projects/people-from-parts-authoring-contract.md#geometry-evaluation
 */
export type PersonNumbers = readonly number[] | Float32Array;
export type PersonIndices = readonly number[] | Uint32Array | Uint16Array;
export type PersonPoint = readonly [number, number, number];
export type PersonTargetPair = readonly [string, string];
export interface PersonControlTargets {
  negative: PersonTargetPair;
  positive: PersonTargetPair;
}
export interface PersonControl {
  kind: 'bipolar' | 'frame' | 'stature' | 'age' | 'styleLength';
  bounds: readonly [number, number];
  default: number;
  targets: Readonly<Record<string, PersonControlTargets>>;
  handle?: {
    landmarkId: string;
    view: 'front' | 'profile';
    axis: 'horizontal' | 'vertical';
    direction?: 1 | -1;
    travelFraction: number;
  };
}
export interface PersonExcursion {
  control: string;
  side: 'negative' | 'positive';
}
export interface PersonCorrective {
  drivers: readonly PersonExcursion[];
  targets: PersonTargetPair;
  /** Age-specific corrections run only at this stage, not as an ordinary corrective too. */
  ageTargets?: Readonly<Record<string, PersonTargetPair>>;
}
export interface PersonMesh {
  positions: PersonNumbers;
  triangles: PersonIndices;
  frameDelta: PersonNumbers;
  targets: Readonly<Record<string, PersonNumbers>>;
  topology: string;
  materialId: string;
  regions: Readonly<Record<string, PersonIndices>>;
  correctives?: readonly PersonCorrective[];
  /** Render splits reference the canonical vertices. UVs and weights use render order. */
  sourceVertexIndices?: PersonIndices;
  renderTriangles?: PersonIndices;
  /** Native Blender UVs, with V=0 at the image bottom; bitmap upload flips image rows. */
  uvs?: PersonNumbers;
  jointIndices?: PersonIndices;
  jointWeights?: PersonNumbers;
}
export interface PersonLandmark {
  position: PersonPoint;
  frameDelta: PersonPoint;
  targets: Readonly<Record<string, PersonPoint>>;
  /** Surface landmarks are evaluated after sculpting, instead of moving internal joints. */
  surface?: {
    meshId: string;
    triangle: readonly [number, number, number];
    barycentric: PersonPoint;
    offset: PersonPoint;
  };
}
export interface PersonFacePreset {
  meshId: string;
  baseTarget: PersonTargetPair;
  controls?: Readonly<Record<string, PersonControlTargets>>;
  landmarkTargets?: Readonly<Record<string, PersonTargetPair>>;
  ageSamples?: Readonly<Record<string, PersonTargetPair>>;
  correctives?: readonly PersonCorrective[];
}
export interface PersonSurfaceBinding {
  kind: 'surface' | 'bridge';
  support: string;
  topology: string;
  /** Three source vertex indices and three weights/offsets per bound vertex. */
  triangles: PersonIndices;
  barycentric: PersonNumbers;
  offsets: PersonNumbers;
}
export interface PersonRigidBinding {
  kind: 'rigid';
  /** Origin, positive X and positive Y define an orthonormal attachment frame. */
  anchors: readonly [string, string, string];
  /** Authored local positions retain shape; only overall stature scales them. */
  localPositions: PersonNumbers;
}
export interface PersonMask {
  meshId: string;
  topology: string;
  regions: readonly string[];
}
export interface PersonPartVariant {
  pieces: readonly {
    meshId: string;
    fit: PersonSurfaceBinding | PersonRigidBinding;
    /** Canonical sole vertices on this piece; support changes depiction, not bare stature. */
    groundSupport?: { foot: number; vertices: readonly number[] };
  }[];
  bounds?: Readonly<Record<string, readonly [number, number]>>;
  compatibleInnerLayers: readonly string[];
  hiddenRegions: readonly PersonMask[];
}
export interface PersonPart extends PersonPartVariant {
  stage: number;
  layerClass: string;
  region: string;
  variants?: Readonly<Record<string, PersonPartVariant>>;
  variantOrder?: readonly string[];
  /** Required supporting part must be earlier in the family fit order. */
  requiredSupportPart?: string;
}
export interface PersonMaterial {
  baseColor: readonly [number, number, number, number];
  roughness: number;
  metallic: number;
  colorTexture?: PersonTexture;
  normalTexture?: PersonTexture;
  /** Cutout coverage is baseColor alpha × colorTexture alpha, independent of age paint. */
  alphaCutoff?: number;
  /** Missing/false keeps ordinary back-face culling and lighting. */
  doubleSided?: boolean;
  palettes?: Readonly<Record<string, readonly [number, number, number, number]>>;
  paletteSelectionRole?: string;
  /** Linear red-channel weight for palette tint; zero preserves authored colour. */
  tintMask?: PersonTexture;
  /** Interpolate the selected tint over this control's declared interval. */
  colorBlend?: { control: string; color: readonly [number, number, number, number] };
  ageMaps?: Readonly<Record<string, { color: PersonTexture; normal?: PersonTexture }>>;
}
export interface PersonTexture {
  path: string;
  reference: ArtifactReference;
}
export interface PersonSecondaryMotion {
  part: string;
  joint: number;
  driver: number;
  lagSeconds: number;
  maxAngleRadians: number;
}
export interface CompiledPersonFamily {
  reference: AssetRevisionReference;
  axes: 'gltf';
  referenceStatureMetres: number;
  frameControl: string;
  statureControl: string;
  ageControl: string;
  faceSelectionRole: string;
  /** Named by the authored family; exporters require a nonempty covered selection. */
  coverageSelectionRole?: string;
  crownLandmark: string;
  soleLandmark: string;
  controls: Readonly<Record<string, PersonControl>>;
  meshes: Readonly<Record<string, PersonMesh>>;
  /** Unconditional anatomical meshes and fitted surfaces. Helper surfaces are not drawn. */
  bodyMeshes: readonly string[];
  fitSurfaces: readonly string[];
  facePresets: Readonly<Record<string, PersonFacePreset>>;
  ageSamples: Readonly<Record<string, Readonly<Record<string, PersonTargetPair>>>>;
  landmarks: Readonly<Record<string, PersonLandmark>>;
  landmarkControlTargets: Readonly<Record<string, Readonly<Record<string, PersonControlTargets>>>>;
  rig: {
    joints: readonly {
      id: string;
      parent: number;
      headLandmark: string;
      tailLandmark: string;
      /** Cosmetic attachment joint; core anatomy/locomotion joints omit this. */
      secondaryPart?: string;
    }[];
    /** Column-major world matrices for the reference body, parents before children. */
    sourceRestMatrices: PersonNumbers;
  };
  seams: readonly {
    bodyMesh: string;
    headMesh: string;
    bodyVertices: PersonIndices;
    headVertices: PersonIndices;
  }[];
  parts: Readonly<Record<string, PersonPart>>;
  /** Coverage and removable hair are explicit selections, independent of the frame. */
  selectionParts: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
  materials: Readonly<Record<string, PersonMaterial>>;
  motion?: PersonMotionLibrary;
  /** Baked after target motion fitting; never evaluated by ordinary frame playback. */
  secondaryMotion?: readonly PersonSecondaryMotion[];
}
export interface EvaluatedPersonMesh {
  positions: Float32Array;
  normals: Float32Array;
  triangles: Uint32Array;
  uvs?: PersonNumbers;
  jointIndices?: PersonIndices;
  jointWeights?: PersonNumbers;
  materialId: string;
  partId?: string;
}
export interface EvaluatedPerson {
  source: CompiledPersonFamily;
  recipe: AppearanceRecipe;
  meshes: Map<string, EvaluatedPersonMesh>;
  /** Full canonical surfaces are retained for refitting; masks affect render triangles only. */
  canonicalPositions: Map<string, Float32Array>;
  canonicalNormals: Map<string, Float32Array>;
  hiddenTriangles: Map<string, Set<number>>;
  partVariants: Map<string, PersonPartVariant>;
  landmarks: Record<string, PersonPoint>;
  restMatrices: Float32Array;
  inverseBindMatrices: Float32Array;
  statureMetres: number;
  selectedParts: readonly string[];
}
export interface EvaluatePersonOptions {
  parts?: readonly string[];
  variants?: Readonly<Record<string, string>>;
  /** Presentation-only suppression while replacing parts. Cannot add a recipe/item part. */
  availableParts?: readonly string[];
  /** Private previous result from this same wearer; never pass a shared neighbour's result. */
  previous?: EvaluatedPerson;
  changedControls?: readonly string[];
}
export class PersonFitError extends Error {
  constructor(
    readonly kind: 'missing-source' | 'unsupported-shape' | 'part-fit' | 'motion-fit',
    readonly subject: string,
    detail: string,
  ) {
    super(detail);
    this.name = 'PersonFitError';
  }
}

/** Admit compiler output once, before indexed hot loops or renderer allocation.
 * File permission, maximum download size and digest belong to asset-files.ts.
 */
export function admitPersonFamily(
  value: unknown,
  expected: AssetRevisionReference,
  definition?: AppearanceFamilyDefinition,
): CompiledPersonFamily {
  assertPersonFamily(value);
  if (!sameAssetRevision(value.reference, expected))
    throw new PersonFitError(
      'missing-source',
      'family',
      'The compiled family does not match its selected release.',
    );
  if (definition) {
    if (Object.keys(value.controls).length !== definition.controls.length)
      throw new PersonFitError(
        'missing-source',
        'controls',
        'The compiled controls differ from their installed definition.',
      );
    for (const control of definition.controls) {
      const compiled = value.controls[control.id];
      if (
        !compiled ||
        compiled.kind !== control.kind ||
        compiled.bounds[0] !== control.minimum ||
        compiled.bounds[1] !== control.maximum ||
        compiled.default !== control.defaultValue
      )
        throw new PersonFitError(
          'missing-source',
          control.id,
          'The compiled control differs from its installed definition.',
        );
    }
    const roles = new Set(definition.selections.map((selection) => selection.id));
    const compiledRoles = new Set([
      value.faceSelectionRole,
      ...Object.keys(value.selectionParts),
      ...Object.values(value.materials).flatMap((material) =>
        material.paletteSelectionRole ? [material.paletteSelectionRole] : [],
      ),
    ]);
    if (roles.size !== compiledRoles.size || [...roles].some((role) => !compiledRoles.has(role)))
      throw new PersonFitError(
        'missing-source',
        'selections',
        'The compiled selections differ from their installed definition.',
      );
    for (const selection of definition.selections) {
      const consumers: Readonly<Record<string, unknown>>[] = [];
      if (selection.id === value.faceSelectionRole) consumers.push(value.facePresets);
      const parts = value.selectionParts[selection.id];
      if (parts) consumers.push(parts);
      for (const material of Object.values(value.materials))
        if (material.paletteSelectionRole === selection.id) consumers.push(material.palettes ?? {});
      for (const choices of consumers)
        if (selection.options.some((option) => !Object.hasOwn(choices, option.id)))
          throw new PersonFitError(
            'missing-source',
            selection.id,
            'An installed choice has no authored appearance.',
          );
      if (
        selection.id === value.coverageSelectionRole &&
        selection.options.some((option) => !parts?.[option.id]?.length)
      )
        throw new PersonFitError(
          'missing-source',
          selection.id,
          'A covered choice has no fitted coverage parts.',
        );
    }
    const plan = familyPlan(value);
    for (const control of definition.controls) {
      if (
        control.minimum === control.maximum ||
        control.kind === 'frame' ||
        control.kind === 'stature'
      )
        continue;
      const authored =
        plan.controlMeshes.has(control.id) ||
        Object.values(value.landmarkControlTargets).some((targets) =>
          Object.hasOwn(targets, control.id),
        ) ||
        Object.values(value.materials).some(
          (material) =>
            material.colorBlend?.control === control.id ||
            (control.id === value.ageControl && Object.keys(material.ageMaps ?? {}).length > 1),
        );
      if (!authored)
        throw new PersonFitError(
          'missing-source',
          control.id,
          'An installed control has no authored target or material response.',
        );
    }
  }
  return value;
}

function assertPersonFamily(value: unknown): asserts value is CompiledPersonFamily {
  const fail = (subject: string): never => {
    throw new PersonFitError(
      'missing-source',
      subject,
      `Invalid compiled family data: ${subject}.`,
    );
  };
  const object = (v: unknown, name: string): Record<string, unknown> => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return fail(name);
    return v as Record<string, unknown>;
  };
  const text = (v: unknown, name: string): string =>
    typeof v === 'string' && v.length > 0 ? v : fail(name);
  const numeric = (v: unknown, name: string): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fail(name);
  const numbers = (v: unknown, name: string, length?: number): number[] => {
    if (
      !Array.isArray(v) ||
      (length !== undefined && v.length !== length) ||
      !v.every((n) => typeof n === 'number' && Number.isFinite(n))
    )
      return fail(name);
    return v;
  };
  const strings = (v: unknown, name: string): string[] => {
    if (!Array.isArray(v) || !v.every((n) => typeof n === 'string' && n.length > 0))
      return fail(name);
    return v;
  };
  const list = (v: unknown, name: string): unknown[] => (Array.isArray(v) ? v : fail(name));
  const root = object(value, 'family');
  assertAssetRevisionReference(root['reference']);
  if (root['axes'] !== 'gltf' || numeric(root['referenceStatureMetres'], 'reference stature') <= 0)
    fail('coordinate system');
  const controls = object(root['controls'], 'controls');
  const meshes = object(root['meshes'], 'meshes');
  const landmarks = object(root['landmarks'], 'landmarks');
  const materials = object(root['materials'], 'materials');
  const faces = object(root['facePresets'], 'faces');
  const parts = object(root['parts'], 'parts');
  const known = (map: Record<string, unknown>, id: unknown, name: string) => {
    const key = text(id, name);
    if (!Object.hasOwn(map, key)) return fail(name);
    return key;
  };
  const mesh = (id: unknown) => object(meshes[known(meshes, id, 'mesh reference')], 'mesh');
  const pair = (v: unknown, targets: Record<string, unknown>, name: string) => {
    const names = strings(v, name);
    if (names.length !== 2) fail(name);
    names.forEach((id) => known(targets, id, name));
  };
  const targetBinding = (v: unknown, targets: Record<string, unknown>) => {
    const b = object(v, 'control targets');
    pair(b['negative'], targets, 'negative targets');
    pair(b['positive'], targets, 'positive targets');
  };
  const vertexCounts = new Map<string, number>();
  for (const [id, raw] of Object.entries(meshes)) {
    const m = object(raw, id),
      positions = numbers(m['positions'], id);
    if (!positions.length || positions.length % 3) fail(id);
    vertexCounts.set(id, positions.length / 3);
    numbers(m['frameDelta'], 'frame delta', positions.length);
    text(m['topology'], 'topology');
    known(materials, m['materialId'], 'material');
    for (const delta of Object.values(object(m['targets'], 'targets')))
      numbers(delta, 'target delta', positions.length);
    const triangles = numbers(m['triangles'], 'triangles');
    if (
      triangles.length % 3 ||
      triangles.some((i) => !Number.isInteger(i) || i < 0 || i >= positions.length / 3)
    )
      fail('triangles');
    const split =
      m['sourceVertexIndices'] === undefined
        ? undefined
        : numbers(m['sourceVertexIndices'], 'render vertices');
    if (split?.some((i) => !Number.isInteger(i) || i < 0 || i >= positions.length / 3))
      fail('render vertex mapping');
    const renderCount = split?.length ?? positions.length / 3;
    if (split) {
      const rt = numbers(m['renderTriangles'], 'render triangles', triangles.length);
      if (rt.some((i) => !Number.isInteger(i) || i < 0 || i >= renderCount))
        fail('render triangles');
      // Masks address canonical face ordinals, including after UV vertex splits.
      if (rt.some((vertex, index) => split[vertex] !== triangles[index]))
        fail('render and canonical face correspondence');
    } else if (m['renderTriangles'] !== undefined) fail('render triangles without mapping');
    if (m['uvs'] !== undefined) numbers(m['uvs'], 'UVs', renderCount * 2);
    if (m['jointIndices'] !== undefined || m['jointWeights'] !== undefined) {
      numbers(m['jointIndices'], 'joint indices', renderCount * 4);
      const weights = numbers(m['jointWeights'], 'joint weights', renderCount * 4);
      if (weights.some((w) => w < 0)) fail('joint weights');
      for (let i = 0; i < weights.length; i += 4)
        if (
          Math.abs(
            Number(weights[i]) +
              Number(weights[i + 1]) +
              Number(weights[i + 2]) +
              Number(weights[i + 3]) -
              1,
          ) > 1e-4
        )
          fail('joint weight total');
    }
    for (const region of Object.values(object(m['regions'], 'regions')))
      if (
        numbers(region, 'region faces').some(
          (i) => !Number.isInteger(i) || i < 0 || i >= triangles.length / 3,
        )
      )
        fail('region faces');
  }
  for (const [id, raw] of Object.entries(controls)) {
    const control = object(raw, id),
      bounds = numbers(control['bounds'], 'bounds', 2);
    if (
      !['frame', 'stature', 'age', 'bipolar', 'styleLength'].includes(
        text(control['kind'], 'kind'),
      ) ||
      Number(bounds[0]) > Number(bounds[1])
    )
      fail(id);
    const neutral = numeric(control['default'], 'default');
    if (neutral < Number(bounds[0]) || neutral > Number(bounds[1])) fail(id);
    for (const [meshId, binding] of Object.entries(
      object(control['targets'], 'control target meshes'),
    ))
      targetBinding(binding, object(mesh(meshId)['targets'], 'targets'));
    if (control['handle'] !== undefined) {
      const handle = object(control['handle'], 'handle');
      known(landmarks, handle['landmarkId'], 'handle landmark');
      if (
        !['front', 'profile'].includes(text(handle['view'], 'handle view')) ||
        !['horizontal', 'vertical'].includes(text(handle['axis'], 'handle axis')) ||
        numeric(handle['travelFraction'], 'handle travel') <= 0 ||
        (handle['direction'] !== undefined &&
          handle['direction'] !== 1 &&
          handle['direction'] !== -1)
      )
        fail('handle');
    }
  }
  for (const [field, kind] of [
    ['frameControl', 'frame'],
    ['statureControl', 'stature'],
    ['ageControl', 'age'],
  ] as const)
    if (object(controls[known(controls, root[field], field)], field)['kind'] !== kind) fail(field);
  text(root['faceSelectionRole'], 'face role');
  known(landmarks, root['crownLandmark'], 'crown');
  known(landmarks, root['soleLandmark'], 'sole');
  const surface = (v: unknown) => {
    const s = object(v, 'surface landmark'),
      count = requiredPersonValue(
        vertexCounts.get(known(meshes, s['meshId'], 'surface mesh')),
        'vertex count',
      );
    const triangle = numbers(s['triangle'], 'surface triangle', 3);
    if (triangle.some((i) => !Number.isInteger(i) || i < 0 || i >= count)) fail('surface triangle');
    numbers(s['barycentric'], 'surface weights', 3);
    numbers(s['offset'], 'surface offset', 3);
  };
  for (const raw of Object.values(landmarks)) {
    const landmark = object(raw, 'landmark');
    numbers(landmark['position'], 'landmark point', 3);
    numbers(landmark['frameDelta'], 'landmark frame delta', 3);
    for (const delta of Object.values(object(landmark['targets'], 'landmark targets')))
      numbers(delta, 'landmark delta', 3);
    if (landmark['surface'] !== undefined) surface(landmark['surface']);
  }
  for (const [id, raw] of Object.entries(
    object(root['landmarkControlTargets'], 'landmark control targets'),
  )) {
    const landmark = object(landmarks[known(landmarks, id, 'landmark binding')], 'landmark');
    for (const [control, binding] of Object.entries(object(raw, 'landmark bindings'))) {
      known(controls, control, 'landmark control');
      targetBinding(binding, object(landmark['targets'], 'landmark targets'));
    }
  }
  const checkAgePairs = (raw: unknown, targets: Record<string, unknown>) => {
    const samples = object(raw, 'age targets');
    const years = Object.keys(samples)
      .map(Number)
      .sort((a, b) => a - b);
    if (
      !years.length ||
      years.some((year, i) => !Number.isFinite(year) || (i > 0 && year <= Number(years[i - 1])))
    )
      fail('age knots');
    for (const sample of Object.values(samples)) pair(sample, targets, 'age target pair');
  };
  const corrections = (raw: unknown, targets: Record<string, unknown>) => {
    if (raw === undefined) return;
    for (const item of list(raw, 'correctives')) {
      const c = object(item, 'corrective');
      pair(c['targets'], targets, 'corrective targets');
      for (const driver of list(c['drivers'], 'drivers')) {
        const d = object(driver, 'driver');
        known(controls, d['control'], 'driver control');
        if (d['side'] !== 'negative' && d['side'] !== 'positive') fail('driver side');
      }
      if (c['ageTargets'] !== undefined) checkAgePairs(c['ageTargets'], targets);
    }
  };
  for (const raw of Object.values(meshes)) {
    const m = object(raw, 'mesh');
    corrections(m['correctives'], object(m['targets'], 'targets'));
  }
  for (const raw of Object.values(faces)) {
    const face = object(raw, 'face'),
      targets = object(mesh(face['meshId'])['targets'], 'face targets');
    pair(face['baseTarget'], targets, 'face base');
    for (const [id, binding] of Object.entries(object(face['controls'] ?? {}, 'face controls'))) {
      known(controls, id, 'face control');
      targetBinding(binding, targets);
    }
    for (const [id, binding] of Object.entries(
      object(face['landmarkTargets'] ?? {}, 'face landmarks'),
    ))
      pair(
        binding,
        object(
          object(landmarks[known(landmarks, id, 'face landmark')], 'landmark')['targets'],
          'landmark targets',
        ),
        'face landmark targets',
      );
    if (face['ageSamples'] !== undefined) checkAgePairs(face['ageSamples'], targets);
    corrections(face['correctives'], targets);
  }
  const ages = object(root['ageSamples'], 'age samples');
  if (!Object.keys(ages).length || Object.keys(ages).some((year) => !Number.isFinite(Number(year))))
    fail('age samples');
  for (const raw of Object.values(ages))
    for (const [id, binding] of Object.entries(object(raw, 'age meshes')))
      pair(binding, object(mesh(id)['targets'], 'mesh targets'), 'age targets');
  const rig = object(root['rig'], 'rig'),
    joints = list(rig['joints'], 'joints');
  const matrices = numbers(rig['sourceRestMatrices'], 'rest matrices', joints.length * 16);
  if (!joints.length || joints.length > 64) fail('joint budget');
  assertPersonRestMatrices(matrices, joints.length);
  const jointIds = new Set<string>();
  joints.forEach((raw, index) => {
    const joint = object(raw, 'joint'),
      id = text(joint['id'], 'joint id'),
      parent = numeric(joint['parent'], 'joint parent');
    if (jointIds.has(id) || !Number.isInteger(parent) || parent < -1 || parent >= index)
      fail('joint hierarchy');
    jointIds.add(id);
    known(landmarks, joint['headLandmark'], 'joint head');
    known(landmarks, joint['tailLandmark'], 'joint tail');
  });
  for (const raw of Object.values(meshes)) {
    const m = object(raw, 'mesh');
    if (
      m['jointIndices'] !== undefined &&
      numbers(m['jointIndices'], 'joint indices').some(
        (i) => !Number.isInteger(i) || i < 0 || i >= joints.length,
      )
    )
      fail('joint palette');
  }
  if (root['motion'] !== undefined) assertPersonMotionLibrary(root['motion'], joints.length);
  const body = strings(root['bodyMeshes'], 'body meshes'),
    helpers = strings(root['fitSurfaces'], 'fit surfaces');
  for (const id of [...body, ...helpers]) known(meshes, id, 'body or helper mesh');
  if (new Set([...body, ...helpers]).size !== body.length + helpers.length)
    fail('duplicate anatomy/helper mesh');
  if (root['motion'] !== undefined) {
    const motion = root['motion'] as PersonMotionLibrary;
    for (const leg of motion.legs) {
      // The two-segment solve changes these direct parents; intervening bones
      // would leave the posed foot somewhere other than its admitted goal.
      if (
        object(joints[leg.shin], 'shin joint')['parent'] !== leg.thigh ||
        object(joints[leg.foot], 'foot joint')['parent'] !== leg.shin
      )
        fail('motion requires a direct thigh/shin/foot chain');
      for (const probe of leg.soleProbes) {
        if (!body.includes(probe.meshId)) fail('sole probe requires an anatomical body mesh');
        const source = mesh(probe.meshId);
        if (probe.vertex >= requiredPersonValue(vertexCounts.get(probe.meshId), 'probe vertices'))
          fail('sole probe vertex');
        const mapping = source['sourceVertexIndices'] as PersonIndices | undefined;
        if (mapping && mapping.indexOf(probe.vertex) < 0)
          fail('sole probe requires a rendered skin vertex');
      }
    }
  }
  for (const raw of list(root['seams'], 'seams')) {
    const seam = object(raw, 'seam'),
      a = known(meshes, seam['bodyMesh'], 'body seam mesh'),
      b = known(meshes, seam['headMesh'], 'head seam mesh');
    const av = numbers(seam['bodyVertices'], 'body seam vertices'),
      bv = numbers(seam['headVertices'], 'head seam vertices', av.length);
    if (
      av.some((i) => !Number.isInteger(i) || i < 0 || i >= Number(vertexCounts.get(a))) ||
      bv.some((i) => !Number.isInteger(i) || i < 0 || i >= Number(vertexCounts.get(b)))
    )
      fail('seam vertex');
  }
  const checkVariant = (raw: unknown) => {
    const variant = object(raw, 'part variant');
    strings(variant['compatibleInnerLayers'], 'inner layers');
    for (const [id, bounds] of Object.entries(object(variant['bounds'] ?? {}, 'variant bounds'))) {
      known(controls, id, 'variant control');
      const span = numbers(bounds, 'variant interval', 2);
      if (Number(span[0]) > Number(span[1])) fail('variant interval');
    }
    for (const rawPiece of list(variant['pieces'], 'pieces')) {
      const piece = object(rawPiece, 'piece'),
        id = known(meshes, piece['meshId'], 'piece mesh'),
        fit = object(piece['fit'], 'fit');
      const count = Number(vertexCounts.get(id));
      if (piece['groundSupport'] !== undefined) {
        const support = object(piece['groundSupport'], 'ground support'),
          foot = numeric(support['foot'], 'support foot'),
          vertices = numbers(support['vertices'], 'support vertices'),
          source = mesh(id);
        if (
          !Number.isInteger(foot) ||
          foot < 0 ||
          foot >= joints.length ||
          object(joints[foot], 'support foot')['secondaryPart'] !== undefined ||
          (root['motion'] !== undefined &&
            !(root['motion'] as PersonMotionLibrary).legs.some((leg) => leg.foot === foot))
        )
          fail('ground support requires an anatomical foot');
        if (
          !vertices.length ||
          vertices.some((index) => !Number.isInteger(index) || index < 0 || index >= count)
        )
          fail('ground support vertex');
        const mapping = source['sourceVertexIndices'] as PersonIndices | undefined;
        let skinRows = vertices;
        if (mapping) {
          const wanted = new Set(vertices),
            found = new Set<number>();
          skinRows = [];
          mapping.forEach((vertex, row) => {
            if (wanted.has(vertex)) {
              skinRows.push(row);
              found.add(vertex);
            }
          });
          if (found.size !== wanted.size) fail('ground support requires a rendered sole vertex');
        }
        // Drawable admission below requires complete skin data. Here the contact
        // solve additionally needs probes unaffected by the later cosmetic bake.
        const indices = source['jointIndices'] as PersonIndices | undefined,
          weights = source['jointWeights'] as PersonNumbers | undefined;
        if (indices && weights)
          for (const row of skinRows)
            for (let influence = 0; influence < 4; influence++) {
              const offset = row * 4 + influence;
              if (
                Number(weights[offset]) > 0 &&
                object(joints[Number(indices[offset])], 'support skin joint')['secondaryPart'] !==
                  undefined
              )
                fail('secondary part joints cannot drive ground support');
            }
      }
      if (fit['kind'] === 'rigid') {
        const anchors = strings(fit['anchors'], 'rigid anchors');
        if (anchors.length !== 3) fail('rigid anchors');
        anchors.forEach((a) => known(landmarks, a, 'rigid anchor'));
        numbers(fit['localPositions'], 'rigid local points', count * 3);
      } else if (fit['kind'] === 'surface' || fit['kind'] === 'bridge') {
        const support = known(meshes, fit['support'], 'fit support');
        if (text(fit['topology'], 'fit topology') !== mesh(support)['topology'])
          fail('fit topology');
        const indices = numbers(fit['triangles'], 'fit triangle indices', count * 3);
        if (
          indices.some(
            (i) => !Number.isInteger(i) || i < 0 || i >= Number(vertexCounts.get(support)),
          )
        )
          fail('fit triangle indices');
        numbers(fit['barycentric'], 'fit weights', count * 3);
        numbers(fit['offsets'], 'fit offsets', count * 3);
      } else fail('fit kind');
    }
    for (const rawMask of list(variant['hiddenRegions'], 'hidden regions')) {
      const mask = object(rawMask, 'mask');
      text(mask['meshId'], 'mask mesh');
      text(mask['topology'], 'mask topology');
      strings(mask['regions'], 'mask regions');
    }
  };
  for (const raw of Object.values(parts)) {
    const part = object(raw, 'part');
    checkVariant(part);
    if (!Number.isInteger(numeric(part['stage'], 'fit stage'))) fail('fit stage');
    text(part['layerClass'], 'layer');
    text(part['region'], 'region');
    if (part['requiredSupportPart'] !== undefined)
      known(parts, part['requiredSupportPart'], 'supporting part');
    if (part['variants'] !== undefined) {
      const variants = object(part['variants'], 'variants'),
        order = strings(part['variantOrder'], 'variant order');
      if (!order.length || new Set(order).size !== order.length) fail('variant order');
      order.forEach((id) => known(variants, id, 'variant'));
      Object.values(variants).forEach(checkVariant);
    }
  }
  for (const raw of joints) {
    const joint = object(raw, 'joint');
    if (joint['secondaryPart'] !== undefined)
      known(parts, joint['secondaryPart'], 'secondary joint part');
    const parent = Number(joint['parent']);
    if (parent >= 0) {
      const inheritedPart = object(joints[parent], 'parent joint')['secondaryPart'];
      if (inheritedPart !== undefined && inheritedPart !== joint['secondaryPart'])
        fail('secondary joints may not parent core or unrelated part joints');
    }
  }
  const secondaryJoints = new Set<number>();
  for (const raw of list(root['secondaryMotion'] ?? [], 'secondary motion')) {
    const rule = object(raw, 'secondary motion'),
      part = known(parts, rule['part'], 'secondary part');
    const joint = numeric(rule['joint'], 'secondary joint'),
      driver = numeric(rule['driver'], 'secondary driver');
    if (
      !Number.isInteger(joint) ||
      !Number.isInteger(driver) ||
      driver < 0 ||
      joint >= joints.length ||
      driver >= joint ||
      secondaryJoints.has(joint)
    )
      fail('secondary motion hierarchy');
    const target = object(joints[joint], 'secondary joint');
    if (target['secondaryPart'] !== part || Number(target['parent']) < 0)
      fail('secondary motion may not drive core joints');
    if (
      numeric(rule['lagSeconds'], 'secondary lag') <= 0 ||
      numeric(rule['maxAngleRadians'], 'secondary angle') < 0 ||
      Number(rule['maxAngleRadians']) > Math.PI
    )
      fail('secondary motion response');
    secondaryJoints.add(joint);
  }
  const drawable = new Set(body);
  for (const raw of Object.values(parts)) {
    const part = object(raw, 'part');
    for (const variant of [part, ...Object.values(object(part['variants'] ?? {}, 'variants'))])
      for (const rawPiece of list(object(variant, 'variant')['pieces'], 'pieces'))
        drawable.add(text(object(rawPiece, 'piece')['meshId'], 'drawable mesh'));
  }
  // Rest fitting does not attach an unweighted rigid piece to an animated joint.
  // Rigid plates/studs use one joint; soft pieces use the admitted shared weights.
  for (const id of drawable) {
    const source = mesh(id);
    if (source['jointIndices'] === undefined || source['jointWeights'] === undefined)
      fail('drawable mesh requires skin weights');
    if (body.includes(id)) {
      const indices = source['jointIndices'] as PersonIndices,
        weights = source['jointWeights'] as PersonNumbers;
      for (let index = 0; index < indices.length; index++)
        if (
          Number(weights[index]) > 0 &&
          object(joints[Number(indices[index])], 'skin joint')['secondaryPart'] !== undefined
        )
          fail('secondary part joints cannot drive anatomical skin');
    }
  }
  for (const raw of Object.values(object(root['selectionParts'], 'selected parts')))
    for (const ids of Object.values(object(raw, 'part options')))
      strings(ids, 'selected parts').forEach((id) => known(parts, id, 'selected part'));
  if (root['coverageSelectionRole'] !== undefined)
    known(
      object(root['selectionParts'], 'selected parts'),
      root['coverageSelectionRole'],
      'coverage role',
    );
  const texture = (raw: unknown) => {
    const t = object(raw, 'texture');
    if (!isRepositoryAssetPath(t['path'])) fail('texture path');
    assertArtifactReference(t['reference']);
  };
  for (const raw of Object.values(materials)) {
    const material = object(raw, 'material');
    numbers(material['baseColor'], 'base color', 4);
    numeric(material['roughness'], 'roughness');
    numeric(material['metallic'], 'metallic');
    if (material['alphaCutoff'] !== undefined) {
      const cutoff = numeric(material['alphaCutoff'], 'alpha cutoff');
      if (cutoff < 0 || cutoff > 1) fail('alpha cutoff');
    }
    if (material['doubleSided'] !== undefined && typeof material['doubleSided'] !== 'boolean')
      fail('double-sided material');
    if (material['colorTexture'] !== undefined) texture(material['colorTexture']);
    if (material['normalTexture'] !== undefined) texture(material['normalTexture']);
    if (material['tintMask'] !== undefined) {
      texture(material['tintMask']);
      if (
        material['colorTexture'] === undefined &&
        Object.keys(object(material['ageMaps'] ?? {}, 'age maps')).length === 0
      )
        fail('tint mask requires a colour map UV binding');
    }
    if (material['colorBlend'] !== undefined) {
      const blend = object(material['colorBlend'], 'color blend');
      known(controls, blend['control'], 'color control');
      numbers(blend['color'], 'blend color', 4);
    }
    if (material['paletteSelectionRole'] !== undefined)
      text(material['paletteSelectionRole'], 'palette role');
    for (const palette of Object.values(object(material['palettes'] ?? {}, 'palettes')))
      numbers(palette, 'palette color', 4);
    const ageMaps = object(material['ageMaps'] ?? {}, 'age maps');
    if (Object.keys(ageMaps).some((year) => !Number.isFinite(Number(year))))
      fail('material age samples');
    const years = Object.keys(ageMaps)
      .map(Number)
      .sort((a, b) => a - b);
    if (years.length) {
      const ageBounds = numbers(
        object(controls[String(root['ageControl'])], 'age control')['bounds'],
        'age bounds',
        2,
      );
      if (Number(years[0]) > Number(ageBounds[0]) || Number(years.at(-1)) < Number(ageBounds[1]))
        fail('material age coverage');
      const roles = Object.values(ageMaps).map(
        (maps) =>
          object(maps, 'age maps')['normal'] !== undefined ||
          material['normalTexture'] !== undefined,
      );
      if (roles.some(Boolean) && !roles.every(Boolean)) fail('inconsistent age normal maps');
    }
    for (const rawMaps of Object.values(ageMaps)) {
      const maps = object(rawMaps, 'age maps');
      texture(maps['color']);
      if (maps['normal'] !== undefined) texture(maps['normal']);
    }
  }
  for (const raw of Object.values(meshes)) {
    const m = object(raw, 'mesh'),
      material = object(materials[String(m['materialId'])], 'material');
    if (
      m['uvs'] === undefined &&
      (material['colorTexture'] !== undefined ||
        material['normalTexture'] !== undefined ||
        material['tintMask'] !== undefined ||
        Object.keys(object(material['ageMaps'] ?? {}, 'age maps')).length > 0)
    )
      fail('textured mesh requires UV coordinates');
  }
}

/** Both bind inversion and quaternion motion require proper unit-scale rest bases.
 * Numeric array admission belongs to their callers; run once per source, not per edit.
 */
export function assertPersonRestMatrices(matrices: PersonNumbers, count: number): void {
  const fail = (): never => {
    throw new PersonFitError(
      'missing-source',
      'joint rest',
      'Joint rest matrices must be proper rigid transforms.',
    );
  };
  for (let joint = 0; joint < count; joint++) {
    const off = joint * 16;
    if (
      [3, 7, 11].some((i) => Math.abs(Number(matrices[off + i])) > 1e-6) ||
      Math.abs(Number(matrices[off + 15]) - 1) > 1e-6
    )
      fail();
    for (let a = 0; a < 3; a++)
      for (let b = a; b < 3; b++) {
        let dot = 0;
        for (let row = 0; row < 3; row++)
          dot += Number(matrices[off + a * 4 + row]) * Number(matrices[off + b * 4 + row]);
        if (Math.abs(dot - (a === b ? 1 : 0)) > 1e-4) fail();
      }
    const determinant =
      Number(matrices[off]) *
        (Number(matrices[off + 5]) * Number(matrices[off + 10]) -
          Number(matrices[off + 6]) * Number(matrices[off + 9])) -
      Number(matrices[off + 4]) *
        (Number(matrices[off + 1]) * Number(matrices[off + 10]) -
          Number(matrices[off + 2]) * Number(matrices[off + 9])) +
      Number(matrices[off + 8]) *
        (Number(matrices[off + 1]) * Number(matrices[off + 6]) -
          Number(matrices[off + 2]) * Number(matrices[off + 5]));
    if (determinant <= 0) fail();
  }
}

export function requiredPersonValue<T>(value: T | undefined, subject: string): T {
  if (value === undefined)
    throw new PersonFitError('missing-source', subject, `Missing ${subject}.`);
  return value;
}

function excursion(value: number, side: PersonExcursion['side']) {
  return Math.max(side === 'positive' ? 2 * value - 1 : 1 - 2 * value, 0);
}

export function personAgeInterval(samples: readonly number[], age: number) {
  if (
    !samples.length ||
    age < requiredPersonValue(samples[0], 'first age') ||
    age > requiredPersonValue(samples.at(-1), 'last age')
  )
    throw new PersonFitError(
      'unsupported-shape',
      'age',
      'The requested age has no authored samples.',
    );
  for (let i = 1; i < samples.length; i++) {
    const b = requiredPersonValue(samples[i], 'age sample');
    const a = requiredPersonValue(samples[i - 1], 'age sample');
    if (age <= b) return { a, b, t: (age - a) / (b - a) };
  }
  const a = requiredPersonValue(samples[0], 'age sample');
  return { a, b: a, t: 0 };
}

function addPair(
  output: Float32Array,
  targets: Readonly<Record<string, PersonNumbers>>,
  pair: PersonTargetPair,
  frame: number,
  amount: number,
) {
  if (amount === 0) return;
  const female = requiredPersonValue(targets[pair[0]], pair[0]);
  const male = requiredPersonValue(targets[pair[1]], pair[1]);
  for (let i = 0; i < output.length; i++)
    output[i] =
      requiredPersonValue(output[i], 'position') +
      amount *
        ((1 - frame) * requiredPersonValue(female[i], pair[0]) +
          frame * requiredPersonValue(male[i], pair[1]));
}

function applyControl(
  output: Float32Array,
  targets: Readonly<Record<string, PersonNumbers>>,
  binding: PersonControlTargets,
  frame: number,
  value: number,
) {
  addPair(output, targets, binding.negative, frame, excursion(value, 'negative'));
  addPair(output, targets, binding.positive, frame, excursion(value, 'positive'));
}

function applyCorrectives(
  output: Float32Array,
  targets: Readonly<Record<string, PersonNumbers>>,
  corrections: readonly PersonCorrective[],
  recipe: AppearanceRecipe,
  frame: number,
  age: number,
) {
  for (const correction of corrections) {
    let weight = 1;
    for (const driver of correction.drivers)
      weight *= excursion(
        requiredPersonValue(recipe.controls[driver.control], driver.control),
        driver.side,
      );
    if (!weight) continue;
    if (correction.ageTargets) {
      const { a, b, t } = personAgeInterval(
        Object.keys(correction.ageTargets)
          .map(Number)
          .sort((x, y) => x - y),
        age,
      );
      addPair(
        output,
        targets,
        requiredPersonValue(correction.ageTargets[String(a)], 'age corrective'),
        frame,
        weight * (1 - t),
      );
      addPair(
        output,
        targets,
        requiredPersonValue(correction.ageTargets[String(b)], 'age corrective'),
        frame,
        weight * t,
      );
    } else addPair(output, targets, correction.targets, frame, weight);
  }
}

type ControlBindings = readonly (readonly [string, PersonControlTargets])[];
type SeamNormalVertex = readonly [meshId: string, vertex: number];
interface FamilyPlan {
  meshControls: Map<string, ControlBindings>;
  faceControls: Map<PersonFacePreset, ControlBindings>;
  controlMeshes: Map<string, Set<string>>;
  ageYears: number[];
  seamNormalGroups: SeamNormalVertex[][];
  normalMeshDependencies: Map<string, Set<string>>;
}
// A compiled family is immutable and shared. Build its dependency lists once,
// without retaining any wearer's float-valued recipe or evaluated buffers.
const familyPlans = new WeakMap<CompiledPersonFamily, FamilyPlan>();
function familyPlan(family: CompiledPersonFamily): FamilyPlan {
  const previous = familyPlans.get(family);
  if (previous) return previous;
  const plan: FamilyPlan = {
    meshControls: new Map(),
    faceControls: new Map(),
    controlMeshes: new Map(),
    seamNormalGroups: [],
    normalMeshDependencies: new Map(),
    ageYears: Object.keys(family.ageSamples)
      .map(Number)
      .sort((a, b) => a - b),
  };
  const depends = (control: string, mesh: string) => {
    let meshes = plan.controlMeshes.get(control);
    if (!meshes) {
      meshes = new Set();
      plan.controlMeshes.set(control, meshes);
    }
    meshes.add(mesh);
  };
  const corrections = (mesh: string, entries: readonly PersonCorrective[] | undefined) => {
    for (const correction of entries ?? []) {
      for (const driver of correction.drivers) depends(driver.control, mesh);
      if (correction.ageTargets) depends(family.ageControl, mesh);
    }
  };
  for (const [id, mesh] of Object.entries(family.meshes)) {
    const bindings: Array<readonly [string, PersonControlTargets]> = [];
    for (const [controlId, control] of Object.entries(family.controls)) {
      const binding = control.targets[id];
      if (binding && (control.kind === 'bipolar' || control.kind === 'styleLength')) {
        bindings.push([controlId, binding]);
        depends(controlId, id);
      }
    }
    plan.meshControls.set(id, bindings);
    corrections(id, mesh.correctives);
  }
  for (const samples of Object.values(family.ageSamples))
    for (const id of Object.keys(samples)) depends(family.ageControl, id);
  for (const face of Object.values(family.facePresets)) {
    const bindings: Array<readonly [string, PersonControlTargets]> = [];
    for (const [id, control] of Object.entries(family.controls)) {
      const binding = face.controls?.[id] ?? control.targets[face.meshId];
      if (binding && (control.kind === 'bipolar' || control.kind === 'styleLength')) {
        bindings.push([id, binding]);
        depends(id, face.meshId);
      }
    }
    plan.faceControls.set(face, bindings);
    if (face.ageSamples) depends(family.ageControl, face.meshId);
    corrections(face.meshId, face.correctives);
  }
  const seamVertices = new Map<string, Map<number, Set<SeamNormalVertex>>>();
  const vertexGroup = (meshId: string, vertex: number) => {
    let vertices = seamVertices.get(meshId);
    if (!vertices) {
      vertices = new Map();
      seamVertices.set(meshId, vertices);
    }
    let group = vertices.get(vertex);
    if (!group) {
      group = new Set<SeamNormalVertex>([[meshId, vertex]]);
      vertices.set(vertex, group);
    }
    return group;
  };
  for (const seam of family.seams) {
    let meshes = plan.normalMeshDependencies.get(seam.bodyMesh) ?? new Set([seam.bodyMesh]);
    let otherMeshes = plan.normalMeshDependencies.get(seam.headMesh) ?? new Set([seam.headMesh]);
    if (meshes.size < otherMeshes.size) [meshes, otherMeshes] = [otherMeshes, meshes];
    for (const id of otherMeshes) meshes.add(id);
    for (const id of meshes) plan.normalMeshDependencies.set(id, meshes);
    for (let i = 0; i < seam.bodyVertices.length; i++) {
      let group = vertexGroup(
        seam.bodyMesh,
        requiredPersonValue(seam.bodyVertices[i], 'body seam'),
      );
      let other = vertexGroup(
        seam.headMesh,
        requiredPersonValue(seam.headVertices[i], 'head seam'),
      );
      if (group === other) continue;
      if (group.size < other.size) [group, other] = [other, group];
      for (const member of other) {
        group.add(member);
        requiredPersonValue(seamVertices.get(member[0]), member[0]).set(member[1], group);
      }
    }
  }
  const groups = new Set<Set<SeamNormalVertex>>();
  for (const vertices of seamVertices.values())
    for (const group of vertices.values()) groups.add(group);
  plan.seamNormalGroups = [...groups].map((group) => [...group]);
  familyPlans.set(family, plan);
  return plan;
}

function evaluateMesh(
  family: CompiledPersonFamily,
  meshId: string,
  recipe: AppearanceRecipe,
  frame: number,
  age: number,
  face: PersonFacePreset,
) {
  const mesh = requiredPersonValue(family.meshes[meshId], meshId),
    plan = familyPlan(family);
  const output = new Float32Array(mesh.positions);
  for (let i = 0; i < output.length; i++)
    output[i] =
      requiredPersonValue(output[i], meshId) +
      frame * requiredPersonValue(mesh.frameDelta[i], meshId);
  if (face.meshId === meshId) addPair(output, mesh.targets, face.baseTarget, frame, 1);
  for (const [id, binding] of requiredPersonValue(
    face.meshId === meshId ? plan.faceControls.get(face) : plan.meshControls.get(meshId),
    meshId,
  ))
    applyControl(
      output,
      mesh.targets,
      binding,
      frame,
      requiredPersonValue(recipe.controls[id], id),
    );
  applyCorrectives(output, mesh.targets, mesh.correctives ?? [], recipe, frame, age);
  if (face.meshId === meshId)
    applyCorrectives(output, mesh.targets, face.correctives ?? [], recipe, frame, age);
  const ages = plan.ageYears;
  if (ages.length) {
    const { a, b, t } = personAgeInterval(ages, age);
    for (const [year, weight] of [
      [a, 1 - t],
      [b, t],
    ] as const) {
      const pair =
        (face.meshId === meshId ? face.ageSamples?.[String(year)] : undefined) ??
        family.ageSamples[String(year)]?.[meshId];
      if (pair) addPair(output, mesh.targets, pair, frame, weight);
    }
  }
  return output;
}

/** One triangle frame, shared by surface landmarks and every soft/bridge binding.
 * Keeping offsets in this basis retains authored ease without nearest-face searches.
 */
function surfacePoint(
  positions: PersonNumbers,
  a: number,
  b: number,
  c: number,
  wa: number,
  wb: number,
  wc: number,
  ox: number,
  oy: number,
  oz: number,
): PersonPoint {
  const ax = requiredPersonValue(positions[a * 3], 'support vertex');
  const ay = requiredPersonValue(positions[a * 3 + 1], 'support vertex');
  const az = requiredPersonValue(positions[a * 3 + 2], 'support vertex');
  const bx = requiredPersonValue(positions[b * 3], 'support vertex');
  const by = requiredPersonValue(positions[b * 3 + 1], 'support vertex');
  const bz = requiredPersonValue(positions[b * 3 + 2], 'support vertex');
  const cx = requiredPersonValue(positions[c * 3], 'support vertex');
  const cy = requiredPersonValue(positions[c * 3 + 1], 'support vertex');
  const cz = requiredPersonValue(positions[c * 3 + 2], 'support vertex');
  let ex = bx - ax,
    ey = by - ay,
    ez = bz - az;
  const el = Math.hypot(ex, ey, ez);
  let nx = ey * (cz - az) - ez * (cy - ay);
  let ny = ez * (cx - ax) - ex * (cz - az);
  let nz = ex * (cy - ay) - ey * (cx - ax);
  const nl = Math.hypot(nx, ny, nz);
  if (el < 1e-9 || nl < 1e-12)
    throw new PersonFitError(
      'part-fit',
      'support triangle',
      'The fitted support triangle collapsed.',
    );
  ex /= el;
  ey /= el;
  ez /= el;
  nx /= nl;
  ny /= nl;
  nz /= nl;
  const fx = ny * ez - nz * ey,
    fy = nz * ex - nx * ez,
    fz = nx * ey - ny * ex;
  return [
    wa * ax + wb * bx + wc * cx + ox * ex + oy * fx + oz * nx,
    wa * ay + wb * by + wc * cy + ox * ey + oy * fy + oz * ny,
    wa * az + wb * bz + wc * cz + ox * ez + oy * fz + oz * nz,
  ];
}

function evaluateLandmarks(
  family: CompiledPersonFamily,
  recipe: AppearanceRecipe,
  frame: number,
  scale: number,
  face: PersonFacePreset,
  positions: ReadonlyMap<string, Float32Array>,
) {
  const result: Record<string, PersonPoint> = {};
  for (const [id, landmark] of Object.entries(family.landmarks)) {
    if (landmark.surface) {
      const source = landmark.surface;
      result[id] = surfacePoint(
        requiredPersonValue(positions.get(source.meshId), source.meshId),
        ...source.triangle,
        ...source.barycentric,
        source.offset[0] * scale,
        source.offset[1] * scale,
        source.offset[2] * scale,
      );
      continue;
    }
    const point = new Float32Array(landmark.position);
    for (let i = 0; i < 3; i++)
      point[i] =
        requiredPersonValue(point[i], id) + frame * requiredPersonValue(landmark.frameDelta[i], id);
    const selected = face.landmarkTargets?.[id];
    if (selected) addPair(point, landmark.targets, selected, frame, 1);
    for (const [control, targets] of Object.entries(family.landmarkControlTargets[id] ?? {}))
      applyControl(
        point,
        landmark.targets,
        targets,
        frame,
        requiredPersonValue(recipe.controls[control], control),
      );
    result[id] = [
      requiredPersonValue(point[0], id) * scale,
      requiredPersonValue(point[1], id) * scale,
      requiredPersonValue(point[2], id) * scale,
    ];
  }
  return result;
}

function meshNormals(positions: Float32Array, triangles: PersonIndices) {
  const normals = new Float32Array(positions.length);
  for (let t = 0; t < triangles.length; t += 3) {
    const a = requiredPersonValue(triangles[t], 'triangle') * 3;
    const b = requiredPersonValue(triangles[t + 1], 'triangle') * 3;
    const c = requiredPersonValue(triangles[t + 2], 'triangle') * 3;
    const abx =
      requiredPersonValue(positions[b], 'vertex') - requiredPersonValue(positions[a], 'vertex');
    const aby =
      requiredPersonValue(positions[b + 1], 'vertex') -
      requiredPersonValue(positions[a + 1], 'vertex');
    const abz =
      requiredPersonValue(positions[b + 2], 'vertex') -
      requiredPersonValue(positions[a + 2], 'vertex');
    const acx =
      requiredPersonValue(positions[c], 'vertex') - requiredPersonValue(positions[a], 'vertex');
    const acy =
      requiredPersonValue(positions[c + 1], 'vertex') -
      requiredPersonValue(positions[a + 1], 'vertex');
    const acz =
      requiredPersonValue(positions[c + 2], 'vertex') -
      requiredPersonValue(positions[a + 2], 'vertex');
    const nx = aby * acz - abz * acy,
      ny = abz * acx - abx * acz,
      nz = abx * acy - aby * acx;
    for (const v of [a, b, c]) {
      normals[v] = requiredPersonValue(normals[v], 'normal') + nx;
      normals[v + 1] = requiredPersonValue(normals[v + 1], 'normal') + ny;
      normals[v + 2] = requiredPersonValue(normals[v + 2], 'normal') + nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const x = requiredPersonValue(normals[i], 'normal'),
      y = requiredPersonValue(normals[i + 1], 'normal'),
      z = requiredPersonValue(normals[i + 2], 'normal');
    const length = Math.hypot(x, y, z);
    if (length > 1e-12) {
      normals[i] = x / length;
      normals[i + 1] = y / length;
      normals[i + 2] = z / length;
    }
  }
  return normals;
}

function attachmentBasis(a: PersonPoint, b: PersonPoint, c: PersonPoint) {
  const x = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
  const y = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const;
  const xl = Math.hypot(...x);
  const z = [
    x[1] * y[2] - x[2] * y[1],
    x[2] * y[0] - x[0] * y[2],
    x[0] * y[1] - x[1] * y[0],
  ] as const;
  const zl = Math.hypot(...z);
  if (xl < 1e-9 || zl < 1e-12)
    throw new PersonFitError('part-fit', 'attachment', 'The attachment landmarks collapsed.');
  const ex = [x[0] / xl, x[1] / xl, x[2] / xl] as const;
  const ez = [z[0] / zl, z[1] / zl, z[2] / zl] as const;
  const ey = [
    ez[1] * ex[2] - ez[2] * ex[1],
    ez[2] * ex[0] - ez[0] * ex[2],
    ez[0] * ex[1] - ez[1] * ex[0],
  ] as const;
  return { ex, ey, ez };
}

function fitPiece(
  family: CompiledPersonFamily,
  meshId: string,
  binding: PersonSurfaceBinding | PersonRigidBinding,
  shaped: Float32Array,
  positions: ReadonlyMap<string, Float32Array>,
  landmarks: Readonly<Record<string, PersonPoint>>,
  scale: number,
) {
  const output = new Float32Array(shaped.length);
  if (binding.kind === 'rigid') {
    const [a, b, c] = binding.anchors.map((id) => requiredPersonValue(landmarks[id], id));
    const origin = requiredPersonValue(a, 'attachment origin');
    const { ex, ey, ez } = attachmentBasis(
      origin,
      requiredPersonValue(b, 'attachment X'),
      requiredPersonValue(c, 'attachment Y'),
    );
    for (let i = 0; i < output.length; i += 3) {
      const x = requiredPersonValue(binding.localPositions[i], meshId) * scale;
      const y = requiredPersonValue(binding.localPositions[i + 1], meshId) * scale;
      const z = requiredPersonValue(binding.localPositions[i + 2], meshId) * scale;
      for (let axis = 0; axis < 3; axis++)
        output[i + axis] =
          requiredPersonValue(origin[axis], meshId) +
          x * requiredPersonValue(ex[axis], meshId) +
          y * requiredPersonValue(ey[axis], meshId) +
          z * requiredPersonValue(ez[axis], meshId);
    }
    return output;
  }
  const support = requiredPersonValue(positions.get(binding.support), binding.support);
  const source = requiredPersonValue(family.meshes[binding.support], binding.support);
  const mesh = requiredPersonValue(family.meshes[meshId], meshId);
  if (binding.topology !== source.topology)
    throw new PersonFitError(
      'part-fit',
      meshId,
      'The garment binding names a different support topology.',
    );
  for (let i = 0; i < output.length; i += 3) {
    const a = requiredPersonValue(binding.triangles[i], meshId),
      b = requiredPersonValue(binding.triangles[i + 1], meshId),
      c = requiredPersonValue(binding.triangles[i + 2], meshId);
    let ox = requiredPersonValue(binding.offsets[i], meshId),
      oy = requiredPersonValue(binding.offsets[i + 1], meshId),
      oz = requiredPersonValue(binding.offsets[i + 2], meshId);
    // Style-length and authored part corrections deform the pattern before its binding.
    const dx =
      requiredPersonValue(shaped[i], meshId) - requiredPersonValue(mesh.positions[i], meshId);
    const dy =
      requiredPersonValue(shaped[i + 1], meshId) -
      requiredPersonValue(mesh.positions[i + 1], meshId);
    const dz =
      requiredPersonValue(shaped[i + 2], meshId) -
      requiredPersonValue(mesh.positions[i + 2], meshId);
    if (dx || dy || dz) {
      const at = (vertex: number): PersonPoint => [
        requiredPersonValue(source.positions[vertex * 3], meshId),
        requiredPersonValue(source.positions[vertex * 3 + 1], meshId),
        requiredPersonValue(source.positions[vertex * 3 + 2], meshId),
      ];
      const basis = attachmentBasis(at(a), at(b), at(c));
      ox += dx * basis.ex[0] + dy * basis.ex[1] + dz * basis.ex[2];
      oy += dx * basis.ey[0] + dy * basis.ey[1] + dz * basis.ey[2];
      oz += dx * basis.ez[0] + dy * basis.ez[1] + dz * basis.ez[2];
    }
    const point = surfacePoint(
      support,
      a,
      b,
      c,
      requiredPersonValue(binding.barycentric[i], meshId),
      requiredPersonValue(binding.barycentric[i + 1], meshId),
      requiredPersonValue(binding.barycentric[i + 2], meshId),
      ox * scale,
      oy * scale,
      oz * scale,
    );
    output.set(point, i);
  }
  return output;
}

function resolveParts(
  family: CompiledPersonFamily,
  recipe: AppearanceRecipe,
  options: EvaluatePersonOptions,
) {
  const ids = new Set(options.parts ?? []);
  for (const [role, choices] of Object.entries(family.selectionParts)) {
    const selected = requiredPersonValue(recipe.selections[role], role);
    for (const part of requiredPersonValue(choices[selected], selected)) ids.add(part);
  }
  for (const [part, cut] of Object.entries(options.variants ?? {})) {
    if (!ids.has(part))
      throw new PersonFitError(
        'part-fit',
        part,
        'The requested cut does not name a selected part.',
      );
    const variants = family.parts[part]?.variants;
    if (!variants || !Object.hasOwn(variants, cut))
      throw new PersonFitError('part-fit', part, 'The requested garment cut is unavailable.');
  }
  if (options.availableParts) {
    const available = new Set(options.availableParts);
    for (const id of ids) if (!available.has(id)) ids.delete(id);
  }
  const ordered = [...ids].sort(
    (a, b) =>
      requiredPersonValue(family.parts[a], a).stage -
        requiredPersonValue(family.parts[b], b).stage || a.localeCompare(b),
  );
  const result: Array<{ id: string; definition: PersonPart; variant: PersonPartVariant }> = [];
  for (const id of ordered) {
    const definition = requiredPersonValue(family.parts[id], id);
    if (
      definition.requiredSupportPart &&
      !result.some(
        (part) =>
          part.id === definition.requiredSupportPart && part.definition.stage < definition.stage,
      )
    ) {
      if (options.availableParts) continue;
      throw new PersonFitError('part-fit', id, 'The required inner garment is missing.');
    }
    const compatible = (variant: PersonPartVariant) =>
      Object.entries(variant.bounds ?? {}).every(([control, [min, max]]) => {
        const value = requiredPersonValue(recipe.controls[control], control);
        return value >= min && value <= max;
      }) &&
      result.every(
        (part) =>
          part.definition.region !== definition.region ||
          variant.compatibleInnerLayers.includes(part.definition.layerClass),
      );
    const explicit = options.variants?.[id];
    let variant: PersonPartVariant | undefined;
    if (definition.variants) {
      const candidates =
        explicit === undefined ? requiredPersonValue(definition.variantOrder, id) : [explicit];
      for (const candidate of candidates) {
        const cut = requiredPersonValue(definition.variants[candidate], candidate);
        if (compatible(cut)) {
          variant = cut;
          break;
        }
      }
    } else if (explicit === undefined && compatible(definition)) variant = definition;
    if (!variant)
      throw new PersonFitError(
        'part-fit',
        id,
        'No garment cut fits these proportions and inner layers.',
      );
    result.push({ id, definition, variant });
  }
  return result;
}

/** Rotation taking one bone direction to another, preserving its authored roll. */
export function personDirectionRotation(
  from: PersonPoint,
  to: PersonPoint,
): readonly [number, number, number, number] {
  const fl = Math.hypot(...from),
    tl = Math.hypot(...to);
  if (fl < 1e-9 || tl < 1e-9)
    throw new PersonFitError(
      'unsupported-shape',
      'joint',
      'The requested proportions collapse a joint.',
    );
  const a = [from[0] / fl, from[1] / fl, from[2] / fl] as const;
  const b = [to[0] / tl, to[1] / tl, to[2] / tl] as const;
  let x = a[1] * b[2] - a[2] * b[1],
    y = a[2] * b[0] - a[0] * b[2],
    z = a[0] * b[1] - a[1] * b[0];
  let w = 1 + a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (w < 1e-8) {
    const perpendicular = Math.abs(a[0]) < Math.abs(a[2]) ? [0, -a[2], a[1]] : [-a[1], a[0], 0];
    x = requiredPersonValue(perpendicular[0], 'axis');
    y = requiredPersonValue(perpendicular[1], 'axis');
    z = requiredPersonValue(perpendicular[2], 'axis');
    w = 0;
  }
  const length = Math.hypot(x, y, z, w);
  return [x / length, y / length, z / length, w / length];
}

export function rotatePersonVector(
  q: readonly [number, number, number, number],
  v: PersonPoint,
  result: [number, number, number] = [0, 0, 0],
): PersonPoint {
  const x = q[0],
    y = q[1],
    z = q[2],
    w = q[3],
    vx = v[0],
    vy = v[1],
    vz = v[2];
  const tx = 2 * (y * vz - z * vy),
    ty = 2 * (z * vx - x * vz),
    tz = 2 * (x * vy - y * vx);
  result[0] = vx + w * tx + y * tz - z * ty;
  result[1] = vy + w * ty + z * tx - x * tz;
  result[2] = vz + w * tz + x * ty - y * tx;
  return result;
}

function restHierarchy(
  family: CompiledPersonFamily,
  landmarks: Readonly<Record<string, PersonPoint>>,
) {
  const rest = new Float32Array(family.rig.sourceRestMatrices.length);
  const inverse = new Float32Array(rest.length);
  family.rig.joints.forEach((joint, index) => {
    const head = requiredPersonValue(landmarks[joint.headLandmark], joint.headLandmark);
    const tail = requiredPersonValue(landmarks[joint.tailLandmark], joint.tailLandmark);
    const oldHead = requiredPersonValue(
      family.landmarks[joint.headLandmark],
      joint.headLandmark,
    ).position;
    const oldTail = requiredPersonValue(
      family.landmarks[joint.tailLandmark],
      joint.tailLandmark,
    ).position;
    const rotation = personDirectionRotation(
      [oldTail[0] - oldHead[0], oldTail[1] - oldHead[1], oldTail[2] - oldHead[2]],
      [tail[0] - head[0], tail[1] - head[1], tail[2] - head[2]],
    );
    const offset = index * 16;
    for (let axis = 0; axis < 3; axis++) {
      const i = offset + axis * 4;
      const column = rotatePersonVector(rotation, [
        requiredPersonValue(family.rig.sourceRestMatrices[i], joint.id),
        requiredPersonValue(family.rig.sourceRestMatrices[i + 1], joint.id),
        requiredPersonValue(family.rig.sourceRestMatrices[i + 2], joint.id),
      ]);
      rest.set(column, i);
      for (let row = 0; row < 3; row++)
        inverse[offset + row * 4 + axis] = requiredPersonValue(column[row], joint.id);
      inverse[offset + 12 + axis] = -(
        column[0] * head[0] +
        column[1] * head[1] +
        column[2] * head[2]
      );
    }
    rest.set(head, offset + 12);
    rest[offset + 15] = 1;
    inverse[offset + 15] = 1;
  });
  return { rest, inverse };
}

function renderMesh(
  mesh: PersonMesh,
  positions: Float32Array,
  normals: Float32Array,
  hidden: ReadonlySet<number>,
  partId?: string,
): EvaluatedPersonMesh {
  const sourceIndices = mesh.sourceVertexIndices;
  let rendered = positions,
    renderedNormals = normals;
  if (sourceIndices) {
    rendered = new Float32Array(sourceIndices.length * 3);
    renderedNormals = new Float32Array(rendered.length);
    for (let i = 0; i < sourceIndices.length; i++) {
      const from = requiredPersonValue(sourceIndices[i], 'render vertex') * 3;
      rendered.set(positions.subarray(from, from + 3), i * 3);
      renderedNormals.set(normals.subarray(from, from + 3), i * 3);
    }
  }
  const triangles = mesh.renderTriangles ?? mesh.triangles;
  const kept = new Uint32Array(triangles.length - hidden.size * 3);
  let offset = 0;
  for (let i = 0; i < triangles.length; i += 3) {
    if (hidden.has(i / 3)) continue;
    kept[offset++] = requiredPersonValue(triangles[i], 'triangle');
    kept[offset++] = requiredPersonValue(triangles[i + 1], 'triangle');
    kept[offset++] = requiredPersonValue(triangles[i + 2], 'triangle');
  }
  return {
    positions: rendered,
    normals: renderedNormals,
    triangles: kept,
    uvs: mesh.uvs,
    jointIndices: mesh.jointIndices,
    jointWeights: mesh.jointWeights,
    materialId: mesh.materialId,
    partId,
  };
}

export function evaluatePerson(
  family: CompiledPersonFamily,
  recipe: AppearanceRecipe,
  options: EvaluatePersonOptions = {},
): EvaluatedPerson {
  if (!sameAssetRevision(family.reference, recipe.family))
    throw new PersonFitError(
      'missing-source',
      'family',
      'The recipe names a different family release.',
    );
  const frame = requiredPersonValue(recipe.controls[family.frameControl], family.frameControl);
  const stature = requiredPersonValue(
    recipe.controls[family.statureControl],
    family.statureControl,
  );
  const age = requiredPersonValue(recipe.controls[family.ageControl], family.ageControl);
  const scale = stature / family.referenceStatureMetres;
  const face = requiredPersonValue(
    family.facePresets[
      requiredPersonValue(recipe.selections[family.faceSelectionRole], family.faceSelectionRole)
    ],
    'face',
  );
  const parts = resolveParts(family, recipe, options);
  const previous = options.previous?.source === family ? options.previous : undefined;
  const changed = new Set(
    Object.keys(recipe.controls).filter(
      (id) => previous?.recipe.controls[id] !== recipe.controls[id],
    ),
  );
  const faceChanged =
    previous?.recipe.selections[family.faceSelectionRole] !==
    recipe.selections[family.faceSelectionRole];
  const sameParts =
    previous &&
    parts.length === previous.partVariants.size &&
    parts.every((part) => previous.partVariants.get(part.id) === part.variant);
  // Pigment-only edits update the wearer's material parameters, not anatomy or motion.
  if (previous && !changed.size && !faceChanged && sameParts) return { ...previous, recipe };
  const positions = new Map<string, Float32Array>();
  const changedMeshes = new Set<string>();
  const plan = familyPlan(family);
  const dependenciesChanged = new Set<string>();
  for (const control of changed)
    for (const mesh of plan.controlMeshes.get(control) ?? []) dependenciesChanged.add(mesh);
  const intrinsic = [...family.bodyMeshes, ...family.fitSurfaces];
  for (const id of intrinsic) {
    const affected =
      !previous ||
      changed.has(family.frameControl) ||
      changed.has(family.statureControl) ||
      (faceChanged && id === face.meshId) ||
      dependenciesChanged.has(id);
    if (affected) {
      const shaped = evaluateMesh(family, id, recipe, frame, age, face);
      for (let i = 0; i < shaped.length; i++)
        shaped[i] = requiredPersonValue(shaped[i], id) * scale;
      positions.set(id, shaped);
      changedMeshes.add(id);
    } else positions.set(id, requiredPersonValue(previous.canonicalPositions.get(id), id));
  }
  for (const seam of family.seams) {
    if (!changedMeshes.has(seam.bodyMesh) && !changedMeshes.has(seam.headMesh)) continue;
    const body = requiredPersonValue(positions.get(seam.bodyMesh), seam.bodyMesh);
    let head = requiredPersonValue(positions.get(seam.headMesh), seam.headMesh);
    if (!changedMeshes.has(seam.headMesh)) {
      head = new Float32Array(head);
      positions.set(seam.headMesh, head);
    }
    changedMeshes.add(seam.headMesh);
    for (let i = 0; i < seam.bodyVertices.length; i++) {
      const b = requiredPersonValue(seam.bodyVertices[i], 'body seam') * 3,
        h = requiredPersonValue(seam.headVertices[i], 'head seam') * 3;
      head.set(body.subarray(b, b + 3), h);
    }
  }
  const landmarks = evaluateLandmarks(family, recipe, frame, scale, face, positions);
  const actualHeight =
    requiredPersonValue(landmarks[family.crownLandmark], 'crown')[1] -
    requiredPersonValue(landmarks[family.soleLandmark], 'sole')[1];
  if (Math.abs(actualHeight - stature) > 0.01)
    throw new PersonFitError(
      'unsupported-shape',
      family.statureControl,
      'The anatomical landmarks do not preserve the requested stature.',
    );
  const sameLandmark = (id: string) => {
    const a = landmarks[id],
      b = previous?.landmarks[id];
    return a !== undefined && b !== undefined && a.every((value, index) => value === b[index]);
  };
  const hierarchy =
    previous &&
    family.rig.joints.every(
      (joint) => sameLandmark(joint.headLandmark) && sameLandmark(joint.tailLandmark),
    )
      ? { rest: previous.restMatrices, inverse: previous.inverseBindMatrices }
      : restHierarchy(family, landmarks);
  const masks = new Map<string, Set<number>>();
  const partForMesh = new Map<string, string>();
  for (const part of parts) {
    for (const piece of part.variant.pieces) {
      if (partForMesh.has(piece.meshId))
        throw new PersonFitError('part-fit', part.id, 'Two parts request the same component mesh.');
      partForMesh.set(piece.meshId, part.id);
      const geometryAffected =
        !previous ||
        previous.partVariants.get(part.id) !== part.variant ||
        changed.has(family.statureControl) ||
        dependenciesChanged.has(piece.meshId) ||
        (piece.fit.kind === 'rigid'
          ? piece.fit.anchors.some((id) => !sameLandmark(id))
          : changedMeshes.has(piece.fit.support));
      if (geometryAffected) {
        const shaped = evaluateMesh(family, piece.meshId, recipe, frame, age, face);
        positions.set(
          piece.meshId,
          fitPiece(family, piece.meshId, piece.fit, shaped, positions, landmarks, scale),
        );
        changedMeshes.add(piece.meshId);
      } else
        positions.set(
          piece.meshId,
          requiredPersonValue(previous.canonicalPositions.get(piece.meshId), piece.meshId),
        );
    }
    for (const mask of part.variant.hiddenRegions) {
      const target = family.meshes[mask.meshId];
      if (!target || target.topology !== mask.topology) continue;
      let hidden = masks.get(mask.meshId);
      if (!hidden) {
        hidden = new Set();
        masks.set(mask.meshId, hidden);
      }
      for (const region of mask.regions)
        for (const triangle of requiredPersonValue(target.regions[region], region))
          hidden.add(triangle);
    }
  }
  const normals = new Map<string, Float32Array>();
  const changedNormals = new Set(changedMeshes);
  // Recompute the whole connected mesh component before sharing seam normals;
  // otherwise a write could mutate the previous evaluation's reused normal buffer.
  for (const id of changedMeshes)
    for (const dependency of plan.normalMeshDependencies.get(id) ?? [])
      changedNormals.add(dependency);
  for (const [id, points] of positions)
    normals.set(
      id,
      previous && !changedNormals.has(id)
        ? requiredPersonValue(previous.canonicalNormals.get(id), id)
        : meshNormals(points, requiredPersonValue(family.meshes[id], id).triangles),
    );
  // A canonical vertex can occur in several declared pairs. Average its original
  // normal once across the connected group, before writing any member.
  for (const group of plan.seamNormalGroups) {
    if (!changedNormals.has(requiredPersonValue(group[0], 'seam normal group')[0])) continue;
    let x = 0,
      y = 0,
      z = 0;
    for (const [meshId, vertex] of group) {
      const values = requiredPersonValue(normals.get(meshId), meshId),
        offset = vertex * 3;
      x += requiredPersonValue(values[offset], 'normal');
      y += requiredPersonValue(values[offset + 1], 'normal');
      z += requiredPersonValue(values[offset + 2], 'normal');
    }
    const length = Math.hypot(x, y, z);
    if (length > 1e-12) {
      const value = [x / length, y / length, z / length];
      for (const [meshId, vertex] of group)
        requiredPersonValue(normals.get(meshId), meshId).set(value, vertex * 3);
    }
  }
  const meshes = new Map<string, EvaluatedPersonMesh>();
  for (const id of [...family.bodyMeshes, ...partForMesh.keys()]) {
    const hidden = masks.get(id),
      oldHidden = previous?.hiddenTriangles.get(id);
    const sameMask =
      (hidden?.size ?? 0) === (oldHidden?.size ?? 0) &&
      (!hidden || [...hidden].every((triangle) => oldHidden?.has(triangle)));
    const oldMesh = previous?.meshes.get(id);
    meshes.set(
      id,
      oldMesh && sameMask && !changedNormals.has(id)
        ? oldMesh
        : renderMesh(
            requiredPersonValue(family.meshes[id], id),
            requiredPersonValue(positions.get(id), id),
            requiredPersonValue(normals.get(id), id),
            hidden ?? new Set(),
            partForMesh.get(id),
          ),
    );
  }
  return {
    source: family,
    recipe,
    meshes,
    canonicalPositions: positions,
    canonicalNormals: normals,
    hiddenTriangles: masks,
    partVariants: new Map(parts.map((part) => [part.id, part.variant])),
    landmarks,
    restMatrices: hierarchy.rest,
    inverseBindMatrices: hierarchy.inverse,
    statureMetres: stature,
    selectedParts: parts.map((part) => part.id),
  };
}
