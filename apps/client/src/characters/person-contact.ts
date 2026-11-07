import * as pc from 'playcanvas';
import {
  requiredPersonValue,
  type CompiledPersonFamily,
  type EvaluatedPerson,
} from './person-family';
import {
  PersonPoseContact,
  type PersonContactResult,
  type PersonMotionLibrary,
} from './person-motion';

interface SourceGuides {
  library: PersonMotionLibrary;
  tracks: ReadonlyMap<string, pc.AnimTrack>;
  curves: number;
}

// Source curves are immutable family data; snapshots, clocks and target buffers
// belong to each wearer. A wearer never destroys another wearer's shared tracks.
const sourceGuides = new WeakMap<CompiledPersonFamily, SourceGuides>();
const rotationPath = (joint: number) => `rotation:${joint}`;
const ROOT_PATH = 'root-position';

function guides(family: CompiledPersonFamily, pose: PersonPoseContact): SourceGuides {
  const library = requiredPersonValue(family.motion, 'contact source motion');
  const cached = sourceGuides.get(family);
  if (cached?.library === library) return cached;
  const count = family.rig.joints.length;
  const tracks = library.clips.map((clip) => {
    const outputs = [new pc.AnimData(3, Float32Array.from(clip.rootPositions))];
    const curves = [new pc.AnimCurve([ROOT_PATH], 0, 0, pc.INTERPOLATION_LINEAR)];
    for (const joint of pose.sourceJointIndices) {
      const samples = new Float32Array(clip.times.length * 4);
      for (let frame = 0; frame < clip.times.length; frame++)
        for (let axis = 0; axis < 4; axis++)
          samples[frame * 4 + axis] = Number(
            clip.localRotations[(frame * count + joint) * 4 + axis],
          );
      curves.push(
        new pc.AnimCurve([rotationPath(joint)], 0, outputs.length, pc.INTERPOLATION_LINEAR),
      );
      outputs.push(new pc.AnimData(4, samples));
    }
    return new pc.AnimTrack(
      clip.name,
      Number(clip.times[clip.times.length - 1]),
      [new pc.AnimData(1, Float32Array.from(clip.times))],
      outputs,
      curves,
    );
  });
  const prepared = {
    library,
    tracks: new Map(tracks.map((track) => [track.name, track])),
    curves: tracks.reduce((sum, track) => sum + track.curves.length, 0),
  };
  sourceGuides.set(family, prepared);
  return prepared;
}

/** Use the pinned engine's quaternion sampling/blending without another scene
 * skeleton. These numeric paths are private derived targets, not world facts.
 */
class ContactBinder extends pc.AnimBinder {
  private readonly targets = new Map<string, pc.AnimTarget>();

  constructor(pose: PersonPoseContact) {
    super();
    this.targets.set(
      ROOT_PATH,
      new pc.AnimTarget((value) => pose.sourceRootPosition.set(value), 'vector', 3, ROOT_PATH),
    );
    for (const joint of pose.sourceJointIndices) {
      const path = rotationPath(joint);
      this.targets.set(
        path,
        new pc.AnimTarget(
          (value) => pose.sourceLocalRotations.set(value, joint * 4),
          'quaternion',
          4,
          path,
        ),
      );
    }
  }

  override resolve(path: string): pc.AnimTarget | null {
    return this.targets.get(path) ?? null;
  }
}

interface GuideInstance {
  actual: pc.AnimClip;
  guide: pc.AnimClip;
}

/** Correct only a modular wearer's final blended articulation. This has no
 * world movement, terrain-query or animation-clock authority.
 * docs/projects/people-from-parts-tech-design.md#assembly-storage-and-the-renderer
 */
export class PersonContact {
  private readonly pose: PersonPoseContact;
  private readonly sources: SourceGuides;
  private readonly evaluator: pc.AnimEvaluator;
  private readonly rotations: Float32Array;
  private readonly root: [number, number, number] = [0, 0, 0];
  private readonly instances: GuideInstance[] = [];
  private readonly byActual = new Map<pc.AnimClip, pc.AnimClip>();
  private readonly order: number[] = [];
  private active: readonly pc.AnimClip[] = [];
  private result: PersonContactResult = 'unchanged';

  constructor(person: EvaluatedPerson) {
    this.pose = new PersonPoseContact(
      person,
      requiredPersonValue(person.source.motion, 'contact motion'),
    );
    this.sources = guides(person.source, this.pose);
    this.evaluator = new pc.AnimEvaluator(new ContactBinder(this.pose));
    this.rotations = new Float32Array(person.source.rig.joints.length * 4);
  }

  private readonly sampleSource = (): void => {
    const clips = this.active;
    this.order.length = clips.length;
    for (let i = 0; i < clips.length; i++) this.order[i] = i;
    // Match 2.22.2's actual comparison order, including ties/history. Merely
    // grouping by track name loses independent reentrant instances and clocks.
    for (let i = 0; i < this.order.length - 1; i++)
      for (let j = i + 1; j < this.order.length; j++)
        if (
          (clips[Number(this.order[j])] as pc.AnimClip).blendOrder <
          (clips[Number(this.order[i])] as pc.AnimClip).blendOrder
        ) {
          const first = Number(this.order[i]);
          this.order[i] = Number(this.order[j]);
          this.order[j] = first;
        }
    for (const instance of this.instances) instance.guide.blendWeight = 0;
    for (let rank = 0; rank < this.order.length; rank++) {
      const actual = clips[Number(this.order[rank])] as pc.AnimClip;
      if (actual.blendWeight <= 0) continue;
      let guide = this.byActual.get(actual);
      if (!guide) {
        guide = new pc.AnimClip(
          requiredPersonValue(this.sources.tracks.get(actual.track.name), 'source contact clip'),
          0,
          0,
          true,
          actual.loop,
        );
        this.byActual.set(actual, guide);
        this.instances.push({ actual, guide });
        this.evaluator.addClip(guide);
      }
      guide.time = (actual.time / actual.track.duration) * guide.track.duration;
      guide.loop = actual.loop;
      guide.blendWeight = actual.blendWeight;
      guide.blendOrder = rank;
    }
    this.evaluator.update(0);
  };

  update(anim: pc.AnimComponent, joints: readonly pc.GraphNode[]): PersonContactResult {
    // This is the same manually evaluated component that owns the visible pose.
    // Read its actual instances only after update(), never infer blends from gait.
    // 2.22.2's public state summary omits reentrant fading instances. Keep this
    // pinned-engine read at the adapter boundary, not in the numerical solver.
    this.active = anim.baseLayer?.['_controller'].animEvaluator.clips ?? [];
    for (let i = this.instances.length - 1; i >= 0; i--) {
      const instance = this.instances[i] as GuideInstance;
      if (this.active.includes(instance.actual)) continue;
      this.evaluator.removeClip(this.evaluator.clips.indexOf(instance.guide));
      this.byActual.delete(instance.actual);
      this.instances.splice(i, 1);
    }
    if (!this.active.length) return (this.result = 'unchanged');
    for (let joint = 0; joint < joints.length; joint++) {
      const q = (joints[joint] as pc.GraphNode).getLocalRotation();
      const offset = joint * 4;
      this.rotations[offset] = q.x;
      this.rotations[offset + 1] = q.y;
      this.rotations[offset + 2] = q.z;
      this.rotations[offset + 3] = q.w;
    }
    const root = (joints[this.pose.rootJoint] as pc.GraphNode).getLocalPosition();
    this.root[0] = root.x;
    this.root[1] = root.y;
    this.root[2] = root.z;
    this.result = this.pose.apply(this.rotations, this.root, this.sampleSource);
    if (this.result !== 'unchanged')
      for (const joint of this.pose.affectedJoints) {
        const offset = joint * 4;
        (joints[joint] as pc.GraphNode).setLocalRotation(
          Number(this.rotations[offset]),
          Number(this.rotations[offset + 1]),
          Number(this.rotations[offset + 2]),
          Number(this.rotations[offset + 3]),
        );
      }
    return this.result;
  }

  reset(): void {
    this.evaluator.removeClips();
    this.byActual.clear();
    this.instances.length = this.order.length = 0;
    this.active = [];
    this.result = 'unchanged';
  }

  diagnostics() {
    return {
      result: this.result,
      guideInstances: this.instances.length,
      sourceGuideCurves: this.sources.curves,
      sourceGuideJoints: this.pose.sourceJointIndices.length,
      poseTypedBytes:
        this.rotations.byteLength +
        this.pose.sourceLocalRotations.byteLength +
        this.pose.sourceRootPosition.byteLength,
    };
  }

  destroy(): void {
    this.reset();
  }
}
