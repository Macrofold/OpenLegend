import type { ActivityView } from '../../action-experience.js';
import type { AttributeView } from '../../world-modules.js';
import type { Position } from '../../types.js';
import { formatObservedBodyHealth } from './hunting.js';
import { describeAttack, type StrikeDefinition } from '../../strikes.js';
import { FOLLOW_RULES } from './navigation.js';
import display from './config/ordinary-activity-display.json' with { type: 'json' };

type DisplayPurpose = { purpose?: string; chosenPurpose?: string };
export type OrdinaryActivityNameInput = {
  command: DisplayPurpose & {
    type: 'move' | 'say' | 'status-effect' | 'follow' | 'strike' | 'cook' | 'eat';
    operation?: 'activate' | 'deactivate';
  };
  effect?: { label: string; activate?: string; deactivate?: string };
  preparationName?: string;
};
/** The name is independent of target sight and result facts. Keep the same
 * authored name factory for ordinary displays and shared learned templates. */
export function ordinaryActivityName({
  command,
  effect,
  preparationName,
}: OrdinaryActivityNameInput): string {
  if (command.type === 'cook') return command.purpose ?? preparationName ?? display.cookName;
  if (command.type === 'eat') return command.purpose ?? display.eatName;
  if (command.type === 'status-effect' && effect)
    return command.operation === 'activate'
      ? (effect.activate ?? `${display.status.activatePrefix}${effect.label}`)
      : (effect.deactivate ?? `${display.status.deactivatePrefix}${effect.label}`);
  return (
    command.purpose ??
    (command.type === 'move'
      ? display.move.name
      : command.type === 'say'
        ? display.say.name
        : command.type === 'follow'
          ? display.followName
          : command.type === 'strike'
            ? display.strike.name
            : display.status.name)
  );
}
export function sharedOrdinaryActivityName(input: OrdinaryActivityNameInput): string {
  return ordinaryActivityName({
    ...input,
    command: {
      ...input.command,
      purpose:
        input.command.purpose === display.stableLearnedPurpose
          ? display.stableLearnedPurpose
          : undefined,
    },
  });
}
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
    name: ordinaryActivityName(input),
    facts: [],
  };
  if (command.chosenPurpose !== undefined)
    view.facts.push({ name: display.chosenPurpose, value: command.chosenPurpose, critical: true });
  if (command.type === 'follow' && command.complete)
    view.facts.push({
      name: 'finite approach',
      value: `End on reaching the selected ${command.distance ?? FOLLOW_RULES.defaultDistance} m proximity, or at game time ${command.until}. This movement performs no attack.`,
      critical: true,
    });
  appendObservedActivityFacts(view, actor, target);
  if (command.type === 'strike' && strike) {
    view.facts.push({
      name: display.strike.attackName,
      value: describeAttack(strike),
      critical: true,
    });
    view.facts.push({
      name: display.strike.approachName,
      value: `${display.strike.approachPrefix}${strike.approachRange ?? strike.range}${display.strike.approachSuffix}`,
      critical: true,
    });
  }
  if (command.type === 'move' && actor) {
    const from = actor.position,
      to = command.destination,
      move = display.move;
    view.target = `${move.targetPrefix}${to.x.toFixed(1)}${move.coordinateSeparator}${to.z.toFixed(1)}`;
    view.facts.push({
      name: move.distanceName,
      value: `${Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z).toFixed(1)}${move.distanceSuffix}`,
      critical: true,
    });
  }
  if (command.type === 'say') {
    for (let at = 0; at < command.text.length; at += display.say.chunkUnits)
      view.facts.push({
        name: at ? display.say.moreWordsName : display.say.wordsName,
        value: command.text.slice(at, at + display.say.chunkUnits),
        critical: true,
      });
    view.facts.push({
      name: display.say.replyName,
      value: display.say.reply,
      critical: true,
    });
  }
  if (command.type === 'status-effect') {
    view.facts.push({
      name: display.status.resultName,
      value: display.status.result,
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
    name: display.observed.distanceName,
    value: `${Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z).toFixed(1)}${display.observed.distanceSuffix}`,
    critical: true,
  });
  // Right-handed, Y-up: facing +Z puts the right hand at -X.
  const bearing = actor.heading - Math.atan2(b.x - a.x, b.z - a.z);
  view.facts.push({
    name: display.observed.directionName,
    value: display.observed.directions[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8]!,
    critical: true,
  });
  const health = formatObservedBodyHealth(target.health);
  if (health) view.facts.push({ name: display.observed.healthName, value: health, critical: true });
}
