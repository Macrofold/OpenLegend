import {
  PersonFitError,
  assertPersonRestMatrices,
  personDirectionRotation,
  requiredPersonValue,
  rotatePersonVector,
  type CompiledPersonFamily,
  type EvaluatedPerson,
  type PersonNumbers,
  type PersonPartVariant,
  type PersonPoint,
} from './person-family';

type Quaternion = readonly [number, number, number, number];
type MutableQuaternion = [number, number, number, number];
type MutablePoint = [number, number, number];
interface Leg {
  thigh: number;
  shin: number;
  foot: number;
  toes: readonly number[];
  /** Canonical anatomical skin points; render-split weights remain the skin owner. */
  soleProbes: readonly { meshId: string; vertex: number }[];
}
export interface PersonMotionSource {
  name: string;
  times: PersonNumbers;
  /** Qualified fixed fitting keys, including every source time; no runtime search. */
  supportTimes: PersonNumbers;
  loop: boolean;
  stride: boolean;
  /** Actual local rotations, including rest orientation; frame-major, xyzw. */
  localRotations: PersonNumbers;
  /** World-space root heads, frame-major, in the same glTF metres as the rest rig. */
  rootPositions: PersonNumbers;
  groundSpeed?: number;
}
export interface PersonMotionLibrary {
  sourceRestMatrices: PersonNumbers;
  rootJoint: number;
  legs: readonly Leg[];
  clips: readonly PersonMotionSource[];
}
export interface FittedPersonMotion {
  name: string;
  times: Float32Array;
  duration: number;
  loop: boolean;
  localRotations: Float32Array;
  localTranslations: Float32Array;
  groundSpeed?: number;
}

const fail = (subject: string): never => {
  throw new PersonFitError('motion-fit', subject, `Unsupported character motion: ${subject}.`);
};
// Arrays have been admitted once. Number preserves indexed-access checking without a
// repeated exception branch at every arithmetic operation in the shared solver.
const at = (values: PersonNumbers, index: number) => Number(values[index]);
const point = (values: PersonNumbers, index: number): PersonPoint => [
  at(values, index),
  at(values, index + 1),
  at(values, index + 2),
];
const quat = (values: PersonNumbers, index: number): Quaternion => [
  at(values, index),
  at(values, index + 1),
  at(values, index + 2),
  at(values, index + 3),
];
const add = (a: PersonPoint, b: PersonPoint): PersonPoint => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const sub = (a: PersonPoint, b: PersonPoint): PersonPoint => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const scale = (a: PersonPoint, factor: number): PersonPoint => [
  a[0] * factor,
  a[1] * factor,
  a[2] * factor,
];
const dot = (a: PersonPoint, b: PersonPoint) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: PersonPoint) => Math.hypot(...a);
const inverse = (q: Quaternion): Quaternion => [-q[0], -q[1], -q[2], q[3]];
function multiply(
  a: Quaternion,
  b: Quaternion,
  result: MutableQuaternion = [0, 0, 0, 0],
): MutableQuaternion {
  const ax = a[0],
    ay = a[1],
    az = a[2],
    aw = a[3],
    bx = b[0],
    by = b[1],
    bz = b[2],
    bw = b[3];
  result[0] = aw * bx + ax * bw + ay * bz - az * by;
  result[1] = aw * by - ax * bz + ay * bw + az * bx;
  result[2] = aw * bz + ax * by - ay * bx + az * bw;
  result[3] = aw * bw - ax * bx - ay * by - az * bz;
  return result;
}
function matrixRotation(m: PersonNumbers, offset: number): Quaternion {
  const a = at(m, offset),
    b = at(m, offset + 5),
    c = at(m, offset + 10),
    trace = a + b + c;
  let q: Quaternion;
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    q = [
      (at(m, offset + 6) - at(m, offset + 9)) / s,
      (at(m, offset + 8) - at(m, offset + 2)) / s,
      (at(m, offset + 1) - at(m, offset + 4)) / s,
      s / 4,
    ];
  } else if (a > b && a > c) {
    const s = 2 * Math.sqrt(1 + a - b - c);
    q = [
      s / 4,
      (at(m, offset + 4) + at(m, offset + 1)) / s,
      (at(m, offset + 8) + at(m, offset + 2)) / s,
      (at(m, offset + 6) - at(m, offset + 9)) / s,
    ];
  } else if (b > c) {
    const s = 2 * Math.sqrt(1 + b - a - c);
    q = [
      (at(m, offset + 4) + at(m, offset + 1)) / s,
      s / 4,
      (at(m, offset + 9) + at(m, offset + 6)) / s,
      (at(m, offset + 8) - at(m, offset + 2)) / s,
    ];
  } else {
    const s = 2 * Math.sqrt(1 + c - a - b);
    q = [
      (at(m, offset + 8) + at(m, offset + 2)) / s,
      (at(m, offset + 9) + at(m, offset + 6)) / s,
      s / 4,
      (at(m, offset + 1) - at(m, offset + 4)) / s,
    ];
  }
  const norm = Math.hypot(...q);
  return [q[0] / norm, q[1] / norm, q[2] / norm, q[3] / norm];
}
function perpendicular(vector: PersonPoint, axis: PersonPoint): PersonPoint {
  const side = sub(vector, scale(axis, dot(vector, axis)));
  // Keep the maintained source-knee fix: straight-leg float32 residue is not a bend plane.
  return length(side) > length(vector) * 1e-6 ? side : [0, 0, 0];
}

export function assertPersonMotionLibrary(
  value: unknown,
  jointCount: number,
): asserts value is PersonMotionLibrary {
  const object = (v: unknown): Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : fail('source object');
  const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : fail('source array'));
  const numbers = (v: unknown, size?: number): number[] => {
    const values = array(v);
    if (
      (size !== undefined && values.length !== size) ||
      !values.every((n): n is number => typeof n === 'number' && Number.isFinite(n))
    )
      fail('source numbers');
    return values as number[];
  };
  const joint = (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < jointCount ? v : fail('joint');
  const source = object(value),
    rest = numbers(source['sourceRestMatrices'], jointCount * 16);
  joint(source['rootJoint']);
  assertPersonRestMatrices(rest, jointCount);
  for (const item of array(source['legs'])) {
    const leg = object(item),
      chain = [joint(leg['thigh']), joint(leg['shin']), joint(leg['foot'])];
    if (new Set(chain).size !== 3) fail('leg chain');
    array(leg['toes']).forEach(joint);
    const probes = array(leg['soleProbes']);
    if (!probes.length) fail('leg sole probes');
    for (const item of probes) {
      const probe = object(item);
      if (
        typeof probe['meshId'] !== 'string' ||
        !probe['meshId'] ||
        !Number.isSafeInteger(probe['vertex']) ||
        Number(probe['vertex']) < 0
      )
        fail('leg sole probe');
    }
  }
  const names = new Set<string>();
  for (const item of array(source['clips'])) {
    const clip = object(item),
      name = clip['name'],
      times = numbers(clip['times']),
      supportTimes = numbers(clip['supportTimes']);
    if (
      typeof name !== 'string' ||
      !name ||
      names.has(name) ||
      typeof clip['loop'] !== 'boolean' ||
      typeof clip['stride'] !== 'boolean'
    )
      fail('clip identity');
    names.add(name as string);
    if (times.length < 2 || times[0] !== 0 || times.some((n, i) => i > 0 && n <= at(times, i - 1)))
      fail('clip times');
    const supportSet = new Set(supportTimes);
    if (
      supportTimes.length < 2 ||
      supportTimes[0] !== 0 ||
      supportTimes.at(-1) !== times.at(-1) ||
      supportTimes.some((time, index) => index > 0 && time <= at(supportTimes, index - 1)) ||
      times.some((time) => !supportSet.has(time))
    )
      fail('clip support times');
    const rotations = numbers(clip['localRotations'], times.length * jointCount * 4);
    for (let i = 0; i < rotations.length; i += 4)
      if (Math.abs(Math.hypot(...quat(rotations, i)) - 1) > 1e-4) fail('clip rotation');
    numbers(clip['rootPositions'], times.length * 3);
    if (
      clip['groundSpeed'] !== undefined &&
      (typeof clip['groundSpeed'] !== 'number' ||
        !Number.isFinite(clip['groundSpeed']) ||
        clip['groundSpeed'] <= 0)
    )
      fail('stride speed');
  }
}

interface Rig {
  parents: readonly number[];
  heads: PersonPoint[];
  rotations: Quaternion[];
  localHeads: PersonPoint[];
  root: number;
}
function rig(rest: PersonNumbers, parents: readonly number[], root: number): Rig {
  const heads = parents.map((_, index) => point(rest, index * 16 + 12));
  const rotations = parents.map((_, index) => matrixRotation(rest, index * 16));
  const localHeads = parents.map((parent, index) =>
    parent < 0
      ? (heads[index] as PersonPoint)
      : rotatePersonVector(
          inverse(rotations[parent] as Quaternion),
          sub(heads[index] as PersonPoint, heads[parent] as PersonPoint),
        ),
  );
  return { parents, heads, rotations, localHeads, root };
}
function heads(
  rig: Rig,
  rotations: readonly Quaternion[],
  rootPosition: PersonPoint,
  result: MutablePoint[] = [],
): MutablePoint[] {
  rig.parents.forEach((parent, index) => {
    const output = result[index] ?? (result[index] = [0, 0, 0]);
    if (index === rig.root || parent < 0) {
      const input = index === rig.root ? rootPosition : (rig.heads[index] as PersonPoint);
      output[0] = input[0];
      output[1] = input[1];
      output[2] = input[2];
    } else {
      rotatePersonVector(
        rotations[parent] as Quaternion,
        rig.localHeads[index] as PersonPoint,
        output,
      );
      const origin = result[parent] as PersonPoint;
      output[0] = origin[0] + output[0];
      output[1] = origin[1] + output[1];
      output[2] = origin[2] + output[2];
    }
  });
  return result;
}
interface Step {
  rotations: Quaternion[];
  root: PersonPoint;
  goals: PersonPoint[];
  sides: PersonPoint[];
}
function bendLeg(
  rig: Rig,
  rotations: Quaternion[],
  points: readonly PersonPoint[],
  leg: Leg,
  goal: PersonPoint,
  sourceSide: PersonPoint,
): void {
  const hip = points[leg.thigh] as PersonPoint,
    knee = points[leg.shin] as PersonPoint,
    ankle = points[leg.foot] as PersonPoint;
  const target = sub(goal, hip),
    distance = length(target);
  if (distance < 1e-9) return;
  const upper = length(sub(knee, hip)),
    lower = length(sub(ankle, knee)),
    along = scale(target, 1 / distance);
  const reach = Math.min(
    distance,
    length(sub(rig.heads[leg.foot] as PersonPoint, rig.heads[leg.thigh] as PersonPoint)),
    upper + lower - 1e-6,
  );
  if (reach <= 1e-9 || upper <= 1e-9 || lower <= 1e-9) fail('degenerate leg');
  let side = perpendicular(sourceSide, along);
  if (length(side) === 0) side = perpendicular(sub(knee, hip), along);
  if (length(side) > 0) side = scale(side, 1 / length(side));
  const out = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const nextKnee = add(
    add(hip, scale(along, out)),
    scale(side, Math.sqrt(Math.max(upper * upper - out * out, 0))),
  );
  rotations[leg.thigh] = multiply(
    personDirectionRotation(sub(knee, hip), sub(nextKnee, hip)),
    rotations[leg.thigh] as Quaternion,
  );
  rotations[leg.shin] = multiply(
    personDirectionRotation(sub(ankle, knee), sub(add(hip, scale(along, reach)), nextKnee)),
    rotations[leg.shin] as Quaternion,
  );
}
function solve(
  rig: Rig,
  legs: readonly Leg[],
  step: Step,
): { rotations: Quaternion[]; points: PersonPoint[] } {
  const rotations = [...step.rotations];
  const points = heads(rig, rotations, step.root);
  legs.forEach((leg, index) =>
    bendLeg(
      rig,
      rotations,
      points,
      leg,
      step.goals[index] as PersonPoint,
      step.sides[index] as PersonPoint,
    ),
  );
  return { rotations, points: heads(rig, rotations, step.root) };
}
function toeMeans(rig: Rig, legs: readonly Leg[], step: Step): (PersonPoint | undefined)[] {
  const points = solve(rig, legs, step).points;
  return legs.map((leg) =>
    leg.toes.length
      ? scale(
          leg.toes.reduce<PersonPoint>(
            (sum, toe) => add(sum, points[toe] as PersonPoint),
            [0, 0, 0],
          ),
          1 / leg.toes.length,
        )
      : undefined,
  );
}
function plant(
  rig: Rig,
  legs: readonly Leg[],
  steps: Step[],
  times: PersonNumbers,
): number | undefined {
  let toes = steps.map((step) => toeMeans(rig, legs, step));
  const paths: { leg: number; frame: number; wanted: PersonPoint }[] = [];
  let distance = 0,
    seconds = 0;
  for (let leg = 0; leg < legs.length; leg++) {
    if (!toes[0]?.[leg]) continue;
    const relative = steps.map((step, frame) => sub(toes[frame]?.[leg] as PersonPoint, step.root));
    const closed = length(sub(relative[0] as PersonPoint, relative.at(-1) as PersonPoint)) < 0.005;
    const span = closed ? steps.length - 1 : steps.length;
    const low = Math.min(
      ...toes.slice(0, span).map((positions) => (positions[leg] as PersonPoint)[1]),
    );
    const down = relative.slice(0, span).map((_, index) => {
      const before = closed ? (index - 1 + span) % span : Math.max(index - 1, 0),
        after = closed ? (index + 1) % span : Math.min(index + 1, span - 1);
      // glTF faces +Z: planted toes move toward -Z under travelling hips.
      return (
        (toes[index]?.[leg] as PersonPoint)[1] <= low + 0.04 &&
        (relative[after] as PersonPoint)[2] < (relative[before] as PersonPoint)[2]
      );
    });
    const runs: number[][] = [];
    for (let index = 0; index < span; index++) {
      if (!down[index]) continue;
      const run = [index];
      while (index + 1 < span && down[index + 1]) run.push(++index);
      runs.push(run);
    }
    if (closed && runs.length > 1 && runs[0]?.[0] === 0 && runs.at(-1)?.at(-1) === span - 1)
      runs[0] = [...(runs.pop() as number[]), ...(runs[0] as number[])];
    for (const run of runs.filter((r) => r.length >= 3)) {
      const start = relative[Number(run[0])] as PersonPoint,
        end = relative[Number(run.at(-1))] as PersonPoint;
      distance += Math.hypot(end[0] - start[0], end[2] - start[2]);
      for (let i = 1; i < run.length; i++) {
        const before = Number(run[i - 1]),
          after = Number(run[i]);
        seconds +=
          after > before
            ? at(times, after) - at(times, before)
            : at(times, steps.length - 1) - at(times, before) + at(times, after);
      }
      for (let k = 1; k < run.length - 1; k++) {
        const frame = Number(run[k]),
          wanted = add(start, scale(sub(end, start), k / (run.length - 1)));
        paths.push({ leg, frame, wanted });
        if (closed && frame === 0) paths.push({ leg, frame: steps.length - 1, wanted });
      }
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const changed = new Set<number>();
    for (const path of paths) {
      const step = steps[path.frame] as Step,
        current = sub(toes[path.frame]?.[path.leg] as PersonPoint, step.root),
        goal = step.goals[path.leg] as PersonPoint;
      step.goals[path.leg] = [
        goal[0] + path.wanted[0] - current[0],
        goal[1],
        goal[2] + path.wanted[2] - current[2],
      ];
      changed.add(path.frame);
    }
    for (const frame of changed) toes[frame] = toeMeans(rig, legs, steps[frame] as Step);
  }
  return seconds > 0 ? distance / seconds : undefined;
}

function normalize(q: Quaternion): Quaternion {
  const size = Math.hypot(...q);
  return [q[0] / size, q[1] / size, q[2] / size, q[3] / size];
}

function slerp(from: Quaternion, to: Quaternion, amount: number): Quaternion {
  const a = normalize(from);
  let b = normalize(to),
    cosine = a.reduce((sum, value, axis) => sum + value * Number(b[axis]), 0);
  if (cosine < 0) {
    b = [-b[0], -b[1], -b[2], -b[3]];
    cosine = -cosine;
  }
  cosine = Math.min(1, cosine);
  if (cosine > 0.9995)
    return normalize([
      a[0] + amount * (b[0] - a[0]),
      a[1] + amount * (b[1] - a[1]),
      a[2] + amount * (b[2] - a[2]),
      a[3] + amount * (b[3] - a[3]),
    ]);
  const angle = Math.acos(cosine),
    divisor = Math.sin(angle);
  const first = Math.sin((1 - amount) * angle) / divisor,
    second = Math.sin(amount * angle) / divisor;
  return normalize([
    first * a[0] + second * b[0],
    first * a[1] + second * b[1],
    first * a[2] + second * b[2],
    first * a[3] + second * b[3],
  ]);
}

interface ProbeBinding {
  meshId: string;
  vertex: number;
  influences: readonly { joint: number; weight: number }[];
}
interface GroundSupport {
  foot: number;
  meshId: string;
  vertices: readonly number[];
  piece: PersonPartVariant['pieces'][number];
}
function groundSupports(person: EvaluatedPerson): GroundSupport[] {
  if (!person.selectedParts.length) return [];
  return [...person.partVariants.values()].flatMap((variant) =>
    variant.pieces.flatMap((piece) =>
      piece.groundSupport ? [{ meshId: piece.meshId, ...piece.groundSupport, piece }] : [],
    ),
  );
}
function supportOffset(person: EvaluatedPerson, supports: readonly GroundSupport[]): number {
  let minimum = 0;
  for (const support of supports) {
    const positions = requiredPersonValue(
      person.canonicalPositions.get(support.meshId),
      support.meshId,
    );
    for (const vertex of support.vertices)
      minimum = Math.min(minimum, at(positions, vertex * 3 + 1));
  }
  return minimum < 0 ? -minimum : 0;
}
/** One constant visual support datum, derived from the fitted sole geometry.
 * Rest/bind anatomy and bare stature stay unchanged; scene owners apply it once
 * for both Rest and playback. No wardrobe name or thickness guess belongs here.
 */
export function personSupportOffset(person: EvaluatedPerson): number {
  return supportOffset(person, groundSupports(person));
}
const probeBindings = new WeakMap<
  CompiledPersonFamily,
  {
    library: PersonMotionLibrary;
    legs: readonly (readonly ProbeBinding[])[];
  }
>();
function bindSkinProbes(
  family: CompiledPersonFamily,
  probes: readonly { meshId: string; vertex: number }[],
): ProbeBinding[][] {
  // Immutable family skin weights serve both input identity and fitting. Only
  // canonical coordinates are wearer-dependent; never reinterpret them in an actor.
  const wanted = new Map<string, Set<number>>();
  for (const probe of probes) {
    const vertices = wanted.get(probe.meshId) ?? new Set<number>();
    vertices.add(probe.vertex);
    wanted.set(probe.meshId, vertices);
  }
  const rows = new Map<string, Map<number, number[]>>();
  for (const [meshId, vertices] of wanted) {
    const mesh = requiredPersonValue(family.meshes[meshId], meshId);
    const mapped = new Map<number, number[]>();
    if (mesh.sourceVertexIndices)
      mesh.sourceVertexIndices.forEach((vertex, row) => {
        if (vertices.has(vertex)) {
          const existing = mapped.get(vertex) ?? [];
          existing.push(row);
          mapped.set(vertex, existing);
        }
      });
    else for (const vertex of vertices) mapped.set(vertex, [vertex]);
    rows.set(meshId, mapped);
  }
  return probes.map((probe) => {
    const mesh = requiredPersonValue(family.meshes[probe.meshId], probe.meshId);
    const variants = new Map<string, ProbeBinding>();
    for (const row of requiredPersonValue(rows.get(probe.meshId)?.get(probe.vertex), 'sole skin')) {
      const influences = [];
      for (let axis = 0; axis < 4; axis++) {
        const weight = at(requiredPersonValue(mesh.jointWeights, 'sole weights'), row * 4 + axis);
        if (weight > 0)
          influences.push({
            joint: Number(requiredPersonValue(mesh.jointIndices, 'sole joints')[row * 4 + axis]),
            weight: Math.fround(weight),
          });
      }
      // Render splits normally repeat weights, but a visible split with distinct
      // skinning also owns contact. Do not assume UV splits share a deformation.
      const key = JSON.stringify(influences);
      if (!variants.has(key)) variants.set(key, { ...probe, influences });
    }
    return [...variants.values()];
  });
}
function motionProbeBindings(person: EvaluatedPerson, library: PersonMotionLibrary) {
  const cached = probeBindings.get(person.source);
  if (cached?.library === library) return cached.legs;
  const bindings = bindSkinProbes(
    person.source,
    library.legs.flatMap((leg) => leg.soleProbes),
  );
  let offset = 0;
  const legs = library.legs.map((leg) => {
    const rows = bindings.slice(offset, offset + leg.soleProbes.length).flat();
    offset += leg.soleProbes.length;
    return rows;
  });
  probeBindings.set(person.source, { library, legs });
  return legs;
}
const groundBindings = new WeakMap<
  CompiledPersonFamily,
  WeakMap<PersonPartVariant['pieces'][number], readonly ProbeBinding[]>
>();
function groundProbeBindings(person: EvaluatedPerson, support: GroundSupport) {
  let family = groundBindings.get(person.source);
  if (!family) {
    family = new WeakMap();
    groundBindings.set(person.source, family);
  }
  const cached = family.get(support.piece);
  if (cached) return cached;
  const probes = bindSkinProbes(
    person.source,
    support.vertices.map((vertex) => ({ meshId: support.meshId, vertex })),
  ).flat();
  family.set(support.piece, probes);
  return probes;
}
/** Actual geometry dependencies, alongside the separately owned rest-matrix identity.
 * Pigment or protected-foot muscle edits retain the fitted clip when these values agree.
 */
export function personMotionInputKey(person: EvaluatedPerson): string {
  const selected = new Set(person.selectedParts);
  const parts = [
    ...new Set(
      (person.source.secondaryMotion ?? [])
        .filter((rule) => selected.has(rule.part))
        .map((rule) => rule.part),
    ),
  ].sort();
  const library = person.source.motion;
  const coordinates = library
    ? motionProbeBindings(person, library).flatMap((leg) =>
        leg.flatMap((probe) =>
          point(
            requiredPersonValue(person.canonicalPositions.get(probe.meshId), probe.meshId),
            probe.vertex * 3,
          ),
        ),
      )
    : [];
  const supports = groundSupports(person);
  if (!supports.length) return JSON.stringify([parts, coordinates]);
  return JSON.stringify([
    parts,
    coordinates,
    supports.map((support) => [
      support.foot,
      support.meshId,
      support.vertices.map((vertex) => [
        vertex,
        ...point(
          requiredPersonValue(person.canonicalPositions.get(support.meshId), support.meshId),
          vertex * 3,
        ),
      ]),
    ]),
  ]);
}
interface SkinProbe {
  influences: readonly { joint: number; weight: number; offset: PersonPoint }[];
}
function prepareSoles(
  person: EvaluatedPerson,
  library: PersonMotionLibrary,
  target: Rig,
): SkinProbe[][] {
  const bindings = motionProbeBindings(person, library).map((leg) => [...leg]);
  for (const support of groundSupports(person)) {
    const leg = library.legs.findIndex((leg) => leg.foot === support.foot);
    if (leg < 0) fail('ground support foot');
    requiredPersonValue(bindings[leg], 'ground support leg').push(
      ...groundProbeBindings(person, support),
    );
  }
  return bindings.map((leg) =>
    leg.map((probe) => {
      const position = point(
        requiredPersonValue(person.canonicalPositions.get(probe.meshId), probe.meshId),
        probe.vertex * 3,
      );
      return {
        influences: probe.influences.map(({ joint, weight }) => ({
          joint,
          weight,
          offset: rotatePersonVector(
            inverse(target.rotations[joint] as Quaternion),
            sub(position, target.heads[joint] as PersonPoint),
          ),
        })),
      };
    }),
  );
}
function soleHeight(
  probes: readonly SkinProbe[],
  rotations: readonly Quaternion[],
  points: readonly PersonPoint[],
  rotated: MutablePoint = [0, 0, 0],
) {
  let minimum = Infinity;
  for (const probe of probes) {
    let height = 0;
    for (const influence of probe.influences) {
      rotatePersonVector(rotations[influence.joint] as Quaternion, influence.offset, rotated);
      height += influence.weight * ((points[influence.joint] as PersonPoint)[1] + rotated[1]);
    }
    minimum = Math.min(minimum, height);
  }
  return minimum;
}

function legSides(
  legs: readonly Leg[],
  points: readonly PersonPoint[],
  result: MutablePoint[] = [],
): MutablePoint[] {
  legs.forEach((leg, index) => {
    const axis = sub(points[leg.foot] as PersonPoint, points[leg.thigh] as PersonPoint);
    const side =
      length(axis) > 1e-9
        ? perpendicular(
            sub(points[leg.shin] as PersonPoint, points[leg.thigh] as PersonPoint),
            scale(axis, 1 / length(axis)),
          )
        : ([0, 0, 0] as PersonPoint);
    const output = result[index] ?? (result[index] = [0, 0, 0]);
    output[0] = side[0];
    output[1] = side[1];
    output[2] = side[2];
  });
  return result;
}

export type PersonContactResult = 'unchanged' | 'corrected' | 'unresolved';

/** Both setup keys and the final blended pose use the same source-plane solve.
 * The visual root and ankle XZ stay fixed; only the existing leg rotations change.
 * docs/projects/people-from-parts-tech-design.md#assembly-storage-and-the-renderer
 */
function correctSolePose(
  target: Rig,
  legs: readonly Leg[],
  probes: readonly (readonly SkinProbe[])[],
  root: PersonPoint,
  rotations: Quaternion[],
  points: MutablePoint[],
  sides: readonly PersonPoint[],
  offset: number,
  rotated: MutablePoint = [0, 0, 0],
): PersonContactResult {
  let changed = false;
  for (let iteration = 0; iteration < 4; iteration++) {
    let corrected = false;
    legs.forEach((leg, index) => {
      const minimum =
        soleHeight(probes[index] as readonly SkinProbe[], rotations, points, rotated) + offset;
      if (minimum >= -1e-6) return;
      const ankle = points[leg.foot] as PersonPoint;
      bendLeg(
        target,
        rotations,
        points,
        leg,
        [ankle[0], ankle[1] - minimum, ankle[2]],
        sides[index] as PersonPoint,
      );
      heads(target, rotations, root, points);
      corrected = changed = true;
    });
    if (!corrected) break;
  }
  if (!changed) return 'unchanged';
  // Ten micrometres permit float32 roundoff, not visibly sinking geometry.
  return probes.some((leg) => soleHeight(leg, rotations, points, rotated) + offset < -1e-5)
    ? 'unresolved'
    : 'corrected';
}
interface PoseKeys {
  times: PersonNumbers;
  rotations: PersonNumbers;
  roots: readonly PersonPoint[];
}
function samplePose(
  keys: PoseKeys,
  time: number,
  count: number,
): { local: Quaternion[]; root: PersonPoint } {
  let low = 0,
    high = keys.times.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (at(keys.times, middle) <= time) low = middle + 1;
    else high = middle;
  }
  const before = Math.max(0, low - 1),
    after = Math.min(before + 1, keys.times.length - 1);
  const amount =
    before === after
      ? 0
      : (time - at(keys.times, before)) / (at(keys.times, after) - at(keys.times, before));
  const local = Array.from({ length: count }, (_, joint) => {
    const first = quat(keys.rotations, (before * count + joint) * 4);
    return amount === 0
      ? first
      : slerp(first, quat(keys.rotations, (after * count + joint) * 4), amount);
  });
  const first = keys.roots[before] as PersonPoint;
  return {
    local,
    root:
      amount === 0
        ? first
        : add(first, scale(sub(keys.roots[after] as PersonPoint, first), amount)),
  };
}
function worldRotations(
  local: readonly Quaternion[],
  parents: readonly number[],
  world: MutableQuaternion[] = [],
) {
  parents.forEach((parent, joint) => {
    const output = world[joint] ?? (world[joint] = [0, 0, 0, 1]);
    const input = local[joint] as Quaternion;
    if (parent < 0) {
      output[0] = input[0];
      output[1] = input[1];
      output[2] = input[2];
      output[3] = input[3];
    } else multiply(world[parent] as Quaternion, input, output);
  });
  return world;
}
/** The original uniform grid owns XZ planting. The authored support schedule samples
 * that immutable fitted curve afterward; the same source knee plane handles each
 * bounded ankle raise. No whole-person lift, toe-joint floor or runtime search.
 */
function fitSoleSupport(
  source: Rig,
  target: Rig,
  legs: readonly Leg[],
  probes: readonly (readonly SkinProbe[])[],
  sourceClip: PersonMotionSource,
  baseline: FittedPersonMotion,
  supportOffsetMetres: number,
): FittedPersonMotion {
  const count = target.parents.length;
  const fittedKeys: PoseKeys = {
    times: sourceClip.times,
    rotations: baseline.localRotations,
    roots: Array.from(baseline.times, (_, frame) =>
      point(baseline.localTranslations, (frame * count + target.root) * 3),
    ),
  };
  const sourceKeys: PoseKeys = {
    times: sourceClip.times,
    rotations: sourceClip.localRotations,
    roots: Array.from(sourceClip.times, (_, frame) => point(sourceClip.rootPositions, frame * 3)),
  };
  const affected = new Set<number>();
  legs.forEach((leg) =>
    target.parents.forEach((parent, joint) => {
      if (joint === leg.thigh || joint === leg.shin || parent === leg.thigh || parent === leg.shin)
        affected.add(joint);
    }),
  );
  const times = Float32Array.from(sourceClip.supportTimes);
  const localRotations = new Float32Array(times.length * count * 4);
  const localTranslations = new Float32Array(times.length * count * 3);
  sourceClip.supportTimes.forEach((time, frame) => {
    const sampled = samplePose(fittedKeys, time, count),
      rotations = worldRotations(sampled.local, target.parents);
    const points = heads(target, rotations, sampled.root);
    const sourceSample = samplePose(sourceKeys, time, count);
    const sourcePoints = heads(
      source,
      worldRotations(sourceSample.local, source.parents),
      sourceSample.root,
    );
    const result = correctSolePose(
      target,
      legs,
      probes,
      sampled.root,
      rotations,
      points,
      legSides(legs, sourcePoints),
      supportOffsetMetres,
    );
    if (result === 'unresolved') fail('unresolved sole guides');
    const changed = result === 'corrected';
    target.parents.forEach((parent, joint) => {
      let rotation =
        changed && affected.has(joint)
          ? normalize(
              parent < 0
                ? (rotations[joint] as Quaternion)
                : multiply(
                    inverse(rotations[parent] as Quaternion),
                    rotations[joint] as Quaternion,
                  ),
            )
          : (sampled.local[joint] as Quaternion);
      if (frame > 0) {
        const before = quat(localRotations, ((frame - 1) * count + joint) * 4);
        if (before.reduce((sum, value, axis) => sum + value * Number(rotation[axis]), 0) < 0)
          rotation = [-rotation[0], -rotation[1], -rotation[2], -rotation[3]];
      }
      localRotations.set(rotation, (frame * count + joint) * 4);
      localTranslations.set(
        joint === target.root ? sampled.root : (target.localHeads[joint] as PersonPoint),
        (frame * count + joint) * 3,
      );
    });
  });
  return { ...baseline, times, localRotations, localTranslations };
}

/** Per-wearer contact preparation for the final animation pose. Source samples
 * remain separate from fitted motion: their bend plane must survive blending.
 * Preparation and scratch storage change only with the admitted rig/sole inputs.
 */
export class PersonPoseContact {
  readonly sourceJointIndices: readonly number[];
  readonly sourceLocalRotations: Float32Array;
  readonly sourceRootPosition: Float32Array;
  readonly affectedJoints: readonly number[];
  readonly rootJoint: number;
  private readonly source: Rig;
  private readonly target: Rig;
  private readonly probes: readonly (readonly SkinProbe[])[];
  private readonly offset: number;
  private readonly local: MutableQuaternion[];
  private readonly sourceLocal: MutableQuaternion[];
  private readonly turns: MutableQuaternion[] = [];
  private readonly sourceTurns: MutableQuaternion[] = [];
  private readonly points: MutablePoint[] = [];
  private readonly sourcePoints: MutablePoint[] = [];
  private readonly sides: MutablePoint[] = [];
  private readonly root: MutablePoint = [0, 0, 0];
  private readonly sourceRoot: MutablePoint = [0, 0, 0];
  private readonly rotated: MutablePoint = [0, 0, 0];

  constructor(
    person: EvaluatedPerson,
    private readonly library: PersonMotionLibrary,
  ) {
    const parents = person.source.rig.joints.map((joint) => joint.parent);
    this.rootJoint = library.rootJoint;
    this.source = rig(library.sourceRestMatrices, parents, library.rootJoint);
    this.target = rig(person.restMatrices, parents, library.rootJoint);
    this.probes = prepareSoles(person, library, this.target);
    this.offset = personSupportOffset(person);
    this.local = parents.map(() => [0, 0, 0, 1]);
    this.sourceLocal = parents.map((parent, joint) =>
      parent < 0
        ? [...(this.source.rotations[joint] as Quaternion)]
        : multiply(
            inverse(this.source.rotations[parent] as Quaternion),
            this.source.rotations[joint] as Quaternion,
          ),
    );
    this.sourceLocalRotations = Float32Array.from(this.sourceLocal.flat());
    this.sourceRootPosition = Float32Array.from(
      this.source.heads[library.rootJoint] as PersonPoint,
    );
    const needed = new Set<number>(),
      affected = new Set<number>();
    for (const leg of library.legs) {
      // A foot's position needs its ancestors' turns, not its own orientation,
      // toes, arms or head. Source guide curves are shared only for these rows.
      for (let joint = Number(parents[leg.foot]); joint >= 0; joint = Number(parents[joint]))
        needed.add(joint);
      parents.forEach((parent, joint) => {
        if (
          joint === leg.thigh ||
          joint === leg.shin ||
          parent === leg.thigh ||
          parent === leg.shin
        )
          affected.add(joint);
      });
    }
    this.sourceJointIndices = [...needed].sort((a, b) => a - b);
    this.affectedJoints = [...affected];
    // Allocate the numerical workspaces once, not in each visible pose.
    worldRotations(this.local, parents, this.turns);
    worldRotations(this.sourceLocal, parents, this.sourceTurns);
    heads(this.target, this.turns, this.root, this.points);
    heads(this.source, this.sourceTurns, this.sourceRoot, this.sourcePoints);
    legSides(library.legs, this.sourcePoints, this.sides);
  }

  /** Mutates only affected local rotations. The callback samples the actual
   * source blend only if this pose needs a correction; clear poses stay cheap.
   */
  apply(
    localRotations: Float32Array,
    root: PersonPoint,
    sampleSource: () => void,
  ): PersonContactResult {
    const parents = this.target.parents;
    for (let joint = 0; joint < parents.length; joint++) {
      const output = this.local[joint] as MutableQuaternion;
      for (let axis = 0; axis < 4; axis++) output[axis] = Number(localRotations[joint * 4 + axis]);
    }
    this.root[0] = root[0];
    this.root[1] = root[1];
    this.root[2] = root[2];
    worldRotations(this.local, parents, this.turns);
    heads(this.target, this.turns, this.root, this.points);
    if (
      this.probes.every(
        (leg) => soleHeight(leg, this.turns, this.points, this.rotated) + this.offset >= -1e-6,
      )
    )
      return 'unchanged';

    sampleSource();
    for (const joint of this.sourceJointIndices) {
      const output = this.sourceLocal[joint] as MutableQuaternion;
      for (let axis = 0; axis < 4; axis++)
        output[axis] = Number(this.sourceLocalRotations[joint * 4 + axis]);
    }
    for (let axis = 0; axis < 3; axis++)
      this.sourceRoot[axis] = Number(this.sourceRootPosition[axis]);
    worldRotations(this.sourceLocal, parents, this.sourceTurns);
    heads(this.source, this.sourceTurns, this.sourceRoot, this.sourcePoints);
    legSides(this.library.legs, this.sourcePoints, this.sides);
    const result = correctSolePose(
      this.target,
      this.library.legs,
      this.probes,
      this.root,
      this.turns,
      this.points,
      this.sides,
      this.offset,
      this.rotated,
    );
    for (const joint of this.affectedJoints) {
      const parent = Number(parents[joint]);
      localRotations.set(
        normalize(
          parent < 0
            ? (this.turns[joint] as Quaternion)
            : multiply(inverse(this.turns[parent] as Quaternion), this.turns[joint] as Quaternion),
        ),
        joint * 4,
      );
    }
    return result;
  }
}

/** Freeze authored follow-through into the actual fitted clip. Eight bounded warm-up
 * cycles settle looping responses without introducing a simulation in ordinary playback.
 * Always read the unmodified fitted keys, so warm-up never compounds an earlier bake.
 */
function bakeSecondaryMotion(
  person: EvaluatedPerson,
  target: Rig,
  clip: FittedPersonMotion,
): FittedPersonMotion {
  const selected = new Set(person.selectedParts);
  const rules = (person.source.secondaryMotion ?? []).filter((rule) => selected.has(rule.part));
  if (!rules.length) return clip;
  const count = target.parents.length,
    baseline = new Float32Array(clip.localRotations);
  const byJoint = new Map(
    rules.map((rule) => [
      rule.joint,
      {
        ...rule,
        restOffset: multiply(
          inverse(requiredPersonValue(target.rotations[rule.driver], 'secondary driver')),
          requiredPersonValue(target.rotations[rule.joint], 'secondary joint'),
        ),
      },
    ]),
  );
  const states = new Map<number, Quaternion>();
  const frames = clip.loop ? clip.times.length - 1 : clip.times.length;
  const cycles = clip.loop ? 8 : 1;
  const influenced: boolean[] = [],
    affected: number[] = [];
  for (let joint = 0; joint < count; joint++) {
    const parent = Number(target.parents[joint]);
    influenced[joint] = byJoint.has(joint) || (parent >= 0 && influenced[parent] === true);
    if (influenced[joint]) affected.push(joint);
  }
  const external = new Map<number, Quaternion[]>();
  for (const joint of affected) {
    const parent = Number(target.parents[joint]),
      driver = byJoint.get(joint)?.driver;
    if (parent >= 0 && !influenced[parent]) external.set(parent, []);
    if (driver !== undefined && !influenced[driver]) external.set(driver, []);
  }
  const ancestors = new Set<number>();
  for (const externalJoint of external.keys()) {
    let joint = externalJoint;
    while (joint >= 0 && !ancestors.has(joint)) {
      ancestors.add(joint);
      joint = Number(target.parents[joint]);
    }
  }
  const preparedJoints = [...ancestors].sort((a, b) => a - b);
  // Core poses are immutable across warm-up. Prepare only the external drivers,
  // parents and their ancestors once, instead of rebuilding the whole body eight times.
  for (let frame = 0; frame < frames; frame++) {
    const worlds: Quaternion[] = [];
    for (const joint of preparedJoints) {
      const parent = Number(target.parents[joint]),
        local = quat(baseline, (frame * count + joint) * 4);
      worlds[joint] =
        parent < 0
          ? local
          : multiply(requiredPersonValue(worlds[parent], 'secondary parent'), local);
    }
    for (const [joint, values] of external)
      values.push(requiredPersonValue(worlds[joint], 'secondary external driver'));
  }
  const worlds: Quaternion[] = [];
  for (let cycle = 0; cycle < cycles; cycle++) {
    for (let frame = 0; frame < frames; frame++) {
      const dt =
        frame > 0
          ? at(clip.times, frame) - at(clip.times, frame - 1)
          : clip.loop
            ? clip.duration - at(clip.times, frames - 1)
            : 0;
      for (const [joint, values] of external)
        worlds[joint] = requiredPersonValue(values[frame], 'secondary external driver');
      for (const joint of affected) {
        const parent = Number(target.parents[joint]),
          rule = byJoint.get(joint);
        if (!rule) {
          const local = quat(baseline, (frame * count + joint) * 4);
          worlds[joint] =
            parent < 0
              ? local
              : multiply(requiredPersonValue(worlds[parent], 'secondary parent'), local);
          continue;
        }
        const desired = normalize(
          multiply(requiredPersonValue(worlds[rule.driver], 'secondary driver'), rule.restOffset),
        );
        const previous = states.get(joint) ?? desired;
        let filtered = slerp(previous, desired, 1 - Math.exp(-dt / rule.lagSeconds));
        const distance =
          2 *
          Math.acos(
            Math.min(
              1,
              Math.abs(
                filtered.reduce((sum, value, axis) => sum + value * Number(desired[axis]), 0),
              ),
            ),
          );
        if (distance > rule.maxAngleRadians)
          filtered = slerp(desired, filtered, rule.maxAngleRadians / distance);
        states.set(joint, filtered);
        worlds[joint] = filtered;
        if (cycle === cycles - 1) {
          let local = normalize(
            multiply(inverse(requiredPersonValue(worlds[parent], 'secondary parent')), filtered),
          );
          if (frame > 0) {
            const before = quat(clip.localRotations, ((frame - 1) * count + joint) * 4);
            if (before.reduce((sum, value, axis) => sum + value * Number(local[axis]), 0) < 0)
              local = [-local[0], -local[1], -local[2], -local[3]];
          }
          clip.localRotations.set(local, (frame * count + joint) * 4);
        }
      }
    }
  }
  if (clip.loop)
    for (const rule of rules) {
      const first = quat(clip.localRotations, rule.joint * 4);
      const before = quat(clip.localRotations, ((clip.times.length - 2) * count + rule.joint) * 4);
      const sign =
        before.reduce((sum, value, axis) => sum + value * Number(first[axis]), 0) < 0 ? -1 : 1;
      clip.localRotations.set(
        first.map((value) => value * sign),
        ((clip.times.length - 1) * count + rule.joint) * 4,
      );
    }
  return clip;
}

/** Fit immutable source clips once when rest joints change. Ordinary animation playback
 * consumes the returned keys; no leg solving, refitting or cloth simulation runs per frame.
 * Preserves source-plane leg solving and planting; skin probes own the sole floor.
 */
export function fitPersonMotion(
  person: EvaluatedPerson,
  library: PersonMotionLibrary,
  clipNames?: readonly string[],
): FittedPersonMotion[] {
  const parents = person.source.rig.joints.map((joint) => joint.parent),
    count = parents.length;
  const source = rig(library.sourceRestMatrices, parents, library.rootJoint),
    target = rig(person.restMatrices, parents, library.rootJoint);
  if (parents[library.rootJoint] !== -1) fail('motion root must be the rig root');
  const sourceRoot = source.heads[source.root] as PersonPoint,
    targetRoot = target.heads[target.root] as PersonPoint;
  if (sourceRoot[1] <= 0 || targetRoot[1] <= 0) fail('standing hip height');
  const ratio = targetRoot[1] / sourceRoot[1];
  const soles = prepareSoles(person, library, target),
    supportOffsetMetres = personSupportOffset(person);
  if (clipNames?.some((name) => !library.clips.some((clip) => clip.name === name)))
    fail('requested clip is absent');
  return library.clips
    .filter((clip) => !clipNames || clipNames.includes(clip.name))
    .map((clip) => {
      const steps: Step[] = [];
      for (let frame = 0; frame < clip.times.length; frame++) {
        const sourceRotations: Quaternion[] = [];
        for (let joint = 0; joint < count; joint++) {
          const local = quat(clip.localRotations, (frame * count + joint) * 4),
            parent = Number(parents[joint]);
          sourceRotations.push(
            parent < 0 ? local : multiply(sourceRotations[parent] as Quaternion, local),
          );
        }
        const sourcePosition = point(clip.rootPositions, frame * 3),
          sourceHeads = heads(source, sourceRotations, sourcePosition);
        const rotations = sourceRotations.map((rotation, joint) =>
          multiply(
            multiply(rotation, inverse(source.rotations[joint] as Quaternion)),
            target.rotations[joint] as Quaternion,
          ),
        );
        const root = add(targetRoot, scale(sub(sourcePosition, sourceRoot), ratio)),
          targetHeads = heads(target, rotations, root);
        const goals: PersonPoint[] = [],
          sides: PersonPoint[] = [];
        for (const leg of library.legs) {
          const now = sub(
              sourceHeads[leg.foot] as PersonPoint,
              sourceHeads[leg.thigh] as PersonPoint,
            ),
            reach = sub(
              source.heads[leg.foot] as PersonPoint,
              source.heads[leg.thigh] as PersonPoint,
            );
          const restReach = sub(
            target.heads[leg.foot] as PersonPoint,
            target.heads[leg.thigh] as PersonPoint,
          );
          const goal = add(
            add(targetHeads[leg.thigh] as PersonPoint, restReach),
            scale(sub(now, reach), ratio),
          );
          goals.push([
            goal[0],
            Math.max(goal[1], (target.heads[leg.foot] as PersonPoint)[1]),
            goal[2],
          ]);
          sides.push(
            length(now) > 1e-9
              ? perpendicular(
                  sub(sourceHeads[leg.shin] as PersonPoint, sourceHeads[leg.thigh] as PersonPoint),
                  scale(now, 1 / length(now)),
                )
              : [0, 0, 0],
          );
        }
        steps.push({ rotations, root, goals, sides });
      }
      const plantedSpeed = clip.stride ? plant(target, library.legs, steps, clip.times) : undefined;
      // The native source planter measures travel on a uniform grid. Preserve
      // authored speed for nonuniform sources in both consumers; fitting still
      // uses their original poses/times and the fixed support schedule.
      const firstStep = at(clip.times, 1) - at(clip.times, 0);
      const speed =
        plantedSpeed !== undefined &&
        clip.times.every(
          (time, index) =>
            index === 0 ||
            Math.abs(time - at(clip.times, index - 1) - firstStep) <=
              1e-6 + 1e-5 * Math.abs(firstStep),
        )
          ? plantedSpeed
          : undefined;
      const localRotations = new Float32Array(steps.length * count * 4),
        localTranslations = new Float32Array(steps.length * count * 3);
      steps.forEach((step, frame) => {
        const solved = solve(target, library.legs, step);
        parents.forEach((parent, joint) => {
          let rotation =
            parent < 0
              ? (solved.rotations[joint] as Quaternion)
              : multiply(
                  inverse(solved.rotations[parent] as Quaternion),
                  solved.rotations[joint] as Quaternion,
                );
          // Same quaternion hemisphere prevents interpolation taking a long turn at a key.
          if (frame > 0) {
            const before = quat(localRotations, ((frame - 1) * count + joint) * 4);
            if (before.reduce((sum, n, axis) => sum + n * Number(rotation[axis]), 0) < 0)
              rotation = [-rotation[0], -rotation[1], -rotation[2], -rotation[3]];
          }
          localRotations.set(rotation, (frame * count + joint) * 4);
          localTranslations.set(
            joint === target.root ? step.root : (target.localHeads[joint] as PersonPoint),
            (frame * count + joint) * 3,
          );
        });
      });
      const groundSpeed =
        speed ?? (clip.groundSpeed === undefined ? undefined : clip.groundSpeed * ratio);
      const fitted: FittedPersonMotion = {
        name: clip.name,
        times: Float32Array.from(clip.times),
        duration: at(clip.times, clip.times.length - 1),
        loop: clip.loop,
        localRotations,
        localTranslations,
        ...(groundSpeed === undefined ? {} : { groundSpeed }),
      };
      return bakeSecondaryMotion(
        person,
        target,
        fitSoleSupport(source, target, library.legs, soles, clip, fitted, supportOffsetMetres),
      );
    });
}
