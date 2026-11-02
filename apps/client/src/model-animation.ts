import * as pc from 'playcanvas';
import type { BundledModel } from './bundled-models';

/** Shared contract of the prepared study rigs: Idle and Run, plus any other named clips the
 * file carries as looping states, so the art study can review gestures. Callers advance the
 * pose only when visible and running; the engine must not also advance it automatically. */
export function installLocomotion(node: pc.Entity, resource: BundledModel): pc.AnimComponent {
  const tracks = new Map<string, pc.AnimTrack>();
  for (const asset of resource.animations)
    if (asset.resource instanceof pc.AnimTrack && !tracks.has(asset.resource.name))
      tracks.set(asset.resource.name, asset.resource);
  for (const name of ['Idle', 'Run'])
    if (!tracks.has(name)) throw new Error('Prepared actor clip missing: ' + name);
  node.addComponent('anim', { activate: true });
  const anim = node.anim!;
  anim.loadStateGraph({
    layers: [
      {
        name: 'Body',
        states: [{ name: 'START' }, ...[...tracks.keys()].map((name) => ({ name, loop: true }))],
        transitions: [{ from: 'START', to: 'Idle' }],
      },
    ],
    parameters: {},
  });
  for (const [name, track] of tracks) anim.assignAnimation(name, track);
  anim.playing = false;
  anim.baseLayer?.play('Idle');
  anim.update(0);
  return anim;
}
