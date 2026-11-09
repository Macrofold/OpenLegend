import type { ActivityView } from '../../action-experience.js';
import type { AttributeView } from '../../world-modules.js';
import type { Position } from '../../types.js';
import { formatObservedBodyHealth } from './hunting.js';
import { describeAttack, type StrikeDefinition } from '../../strikes.js';
import { FOLLOW_RULES } from './navigation.js';

type DisplayPurpose = { purpose?: string; chosenPurpose?: string };
export type OrdinaryActivityViewInput = {
  command: DisplayPurpose &
    (
      | { type: 'move'; destination: Position }
      | { type: 'say'; text: string }
      | { type: 'status-effect'; operation: 'activate' | 'deactivate' }
      | { type: 'follow'; complete?: boolean; distance?: number; until?: number }
      | { type: 'strike' }
    );
  actor?: { position: Position; heading: number };
  target?: { name: string; position: Position; health?: AttributeView };
  effect?: { label: string; activate?: string; deactivate?: string };
  strike?: Pick<
    StrikeDefinition,
    'damage' | 'workSeconds' | 'recoverySeconds' | 'range' | 'accuracy' | 'approachRange'
  >;
};

/** Facts are already selected by the physical/name/current-value owners. This
 * authored formatter reads no world and grants no target or executable action. */
export function ordinaryActivityView(input: OrdinaryActivityViewInput): ActivityView {
  const { command, actor, target, effect, strike } = input;
  const view: ActivityView = {
    name:
      command.purpose ??
      (command.type === 'move'
        ? 'Move'
        : command.type === 'say'
          ? 'Speak'
          : command.type === 'follow'
            ? 'Follow'
            : command.type === 'strike'
              ? 'Attack once'
              : 'Act'),
    facts: [],
  };
  if (command.chosenPurpose !== undefined)
    view.facts.push({ name: 'chosen purpose', value: command.chosenPurpose, critical: true });
  if (command.type === 'follow' && command.complete)
    view.facts.push({
      name: 'finite approach',
      value: `End on reaching the selected ${command.distance ?? FOLLOW_RULES.defaultDistance} m proximity, or at game time ${command.until}. This movement performs no attack.`,
      critical: true,
    });
  appendObservedActivityFacts(view, actor, target);
  if (command.type === 'strike' && strike) {
    view.facts.push({ name: 'attack', value: describeAttack(strike), critical: true });
    view.facts.push({
      name: 'approach',
      value: `Move to within ${strike.approachRange ?? strike.range} m; route length is not known`,
      critical: true,
    });
  }
  if (command.type === 'move' && actor) {
    const from = actor.position,
      to = command.destination;
    view.target = `the chosen place at ${to.x.toFixed(1)}, ${to.z.toFixed(1)}`;
    view.facts.push({
      name: 'distance',
      value: `${Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z).toFixed(1)} m directly; the route length is not known`,
      critical: true,
    });
  }
  if (command.type === 'say') {
    for (let at = 0; at < command.text.length; at += 500)
      view.facts.push({
        name: at ? 'more of my words' : 'my words',
        value: command.text.slice(at, at + 500),
        critical: true,
      });
    view.facts.push({
      name: 'reply',
      value: 'Speaking does not promise that anyone hears, answers or agrees',
      critical: true,
    });
  }
  if (command.type === 'status-effect') {
    if (effect)
      view.name =
        command.operation === 'activate'
          ? (effect.activate ?? `Begin ${effect.label}`)
          : (effect.deactivate ?? `End ${effect.label}`);
    view.facts.push({
      name: 'result',
      value: 'An attempt; the actual applied or resisted change is recorded when it happens',
      critical: true,
    });
  }
  return view;
}

export function appendObservedActivityFacts(
  view: ActivityView,
  actor: OrdinaryActivityViewInput['actor'],
  target: OrdinaryActivityViewInput['target'],
): void {
  if (!actor || !target) return;
  view.target = target.name;
  const a = actor.position,
    b = target.position;
  view.facts.push({
    name: 'distance',
    value: `${Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z).toFixed(1)} m`,
    critical: true,
  });
  // Right-handed, Y-up: facing +Z puts the right hand at -X.
  const bearing = actor.heading - Math.atan2(b.x - a.x, b.z - a.z);
  const directions = [
    'ahead',
    'ahead and to my right',
    'to my right',
    'behind and to my right',
    'behind',
    'behind and to my left',
    'to my left',
    'ahead and to my left',
  ];
  view.facts.push({
    name: 'direction',
    value: directions[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8]!,
    critical: true,
  });
  const health = formatObservedBodyHealth(target.health);
  if (health) view.facts.push({ name: 'health', value: health, critical: true });
}
