import * as pc from 'playcanvas';
import type { BundledModel } from './bundled-models';

/** Shared contract of the prepared study rigs. Callers advance the pose only
 * when visible and running; the engine must not also advance it automatically. */
export function installLocomotion(node: pc.Entity, resource: BundledModel): pc.AnimComponent {
  node.addComponent('anim', { activate: true });
  const anim = node.anim!;
  anim.loadStateGraph({
    layers: [
      {
        name: 'Body',
        states: [{ name: 'START' }, { name: 'Idle', loop: true }, { name: 'Run', loop: true }],
        transitions: [{ from: 'START', to: 'Idle' }],
      },
    ],
    parameters: {},
  });
  for (const name of ['Idle', 'Run']) {
    const track = resource.animations
      .map((asset) => asset.resource)
      .find((value): value is pc.AnimTrack => value instanceof pc.AnimTrack && value.name === name);
    if (!track) throw new Error('Prepared actor clip missing: ' + name);
    anim.assignAnimation(name, track);
  }
  anim.playing = false;
  anim.baseLayer?.play('Idle');
  anim.update(0);
  return anim;
}
