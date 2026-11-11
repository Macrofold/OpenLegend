import * as pc from 'playcanvas';
import type { BundledModel } from './bundled-models';

function animationTracks(resource: BundledModel): Map<string, pc.AnimTrack> {
  const tracks = new Map<string, pc.AnimTrack>();
  for (const asset of resource.animations)
    if (asset.resource instanceof pc.AnimTrack && !tracks.has(asset.resource.name))
      tracks.set(asset.resource.name, asset.resource);
  return tracks;
}

/** Callers advance poses explicitly; the engine must not also advance them automatically. */
function bindAnimations(
  node: pc.Entity,
  tracks: ReadonlyMap<string, pc.AnimTrack>,
  initialState: string,
): pc.AnimComponent {
  node.addComponent('anim', { activate: true });
  const anim = node.anim!;
  anim.loadStateGraph({
    layers: [
      {
        name: 'Body',
        states: [{ name: 'START' }, ...[...tracks.keys()].map((name) => ({ name, loop: true }))],
        transitions: [{ from: 'START', to: initialState }],
      },
    ],
    parameters: {},
  });
  for (const [name, track] of tracks) anim.assignAnimation(name, track);
  anim.playing = false;
  anim.baseLayer?.play(initialState);
  anim.update(0);
  return anim;
}

/** Prepared game actors require both Idle and Run; other named motions remain available. */
export function installLocomotion(node: pc.Entity, resource: BundledModel): pc.AnimComponent {
  const tracks = animationTracks(resource);
  for (const name of ['Idle', 'Run'])
    if (!tracks.has(name)) throw new Error('Prepared actor clip missing: ' + name);
  return bindAnimations(node, tracks, 'Idle');
}

export interface StudyAnimationBinding {
  anim: pc.AnimComponent;
  /** Original clip names to flat graph states, including names reserved by the engine. */
  states: ReadonlyMap<string, string>;
}

/** Inspection can play a diagnostic without claiming it is a complete game actor. */
export function installStudyAnimations(
  node: pc.Entity,
  resource: BundledModel,
): StudyAnimationBinding | undefined {
  const source = animationTracks(resource);
  if (!source.size) return;
  const states = new Map<string, string>();
  const tracks = new Map<string, pc.AnimTrack>();
  for (const [name, track] of source) {
    // Imported names can contain dots (graph paths) or START/END control names.
    const state = 'Clip' + states.size;
    states.set(name, state);
    tracks.set(state, track);
  }
  return { anim: bindAnimations(node, tracks, states.get('Idle') ?? 'Clip0'), states };
}
