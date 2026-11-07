import * as pc from 'playcanvas';
import { requiredPersonValue, type CompiledPersonFamily } from './person-family';
import type { FittedPersonMotion } from './person-motion';

/** Convert already-fitted local samples to the pinned engine's ordinary tracks.
 * No retargeting or garment fit runs in the animation frame loop. */
export function personAnimationTracks(
  family: CompiledPersonFamily,
  clips: readonly FittedPersonMotion[],
): pc.AnimTrack[] {
  const paths: string[][] = [];
  for (const joint of family.rig.joints)
    paths.push(
      joint.parent < 0
        ? [joint.id]
        : [...requiredPersonValue(paths[joint.parent], 'joint path'), joint.id],
    );
  const count = family.rig.joints.length;
  return clips.map((clip) => {
    const outputs: pc.AnimData[] = [],
      curves: pc.AnimCurve[] = [];
    for (let joint = 0; joint < count; joint++) {
      for (const [property, size, source] of [
        ['localRotation', 4, clip.localRotations],
        ['localPosition', 3, clip.localTranslations],
      ] as const) {
        const samples = new Float32Array(clip.times.length * size);
        for (let frame = 0; frame < clip.times.length; frame++)
          samples.set(
            source.subarray((frame * count + joint) * size, (frame * count + joint + 1) * size),
            frame * size,
          );
        const output = outputs.length;
        outputs.push(new pc.AnimData(size, samples));
        // glb-parser and DefaultAnimBinder use structured paths in 2.22.2;
        // AnimCurve's public declaration still describes the obsolete string form.
        const binding = [
          {
            entityPath: requiredPersonValue(paths[joint], 'joint path'),
            component: 'graph',
            propertyPath: [property],
          },
        ];
        curves.push(
          new pc.AnimCurve(binding as unknown as string[], 0, output, pc.INTERPOLATION_LINEAR),
        );
      }
    }
    return new pc.AnimTrack(
      clip.name,
      clip.duration,
      [new pc.AnimData(1, clip.times)],
      outputs,
      curves,
    );
  });
}
