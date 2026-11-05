import type {
  CognitionLabJson,
  CognitionLabPolicy,
  CognitionLabAction,
  CognitionLabReceipt,
} from '@open-legend/protocol';
import type { EpisodeSpec, NativeStep } from './contracts.js';
import { LabCampaignClient } from './client.js';

export const object = (
  value: CognitionLabJson | undefined,
): value is { [key: string]: CognitionLabJson } =>
  !!value && typeof value === 'object' && !Array.isArray(value);
export class EpisodeBlocked extends Error {}
export interface Point {
  x: number;
  y: number;
  z: number;
  surfaceId?: string;
}
export interface NativeMovement {
  actorId: string;
  destination: Point;
  startedSim: number;
  priorHistoryIds: Set<string>;
}

/** Native intentions, selection and completion all stay with ordinary Lab owners.
 * A selected world's declared bindings supply action vocabulary. */
export class NativeSteps {
  readonly points = new Map<string, Point>();
  constructor(
    readonly api: LabCampaignClient,
    readonly spec: EpisodeSpec,
  ) {}
  actor(role = 'visitor'): string {
    const id = this.spec.origin.actorIds[role];
    if (!id) throw new EpisodeBlocked(`Unknown declared actor role ${role}.`);
    return id;
  }
  type(kind: string): string {
    const type = this.spec.protocol.nativeActionTypes?.[kind];
    if (!type)
      throw new EpisodeBlocked(`No selected-world action binding was declared for ${kind}.`);
    return type;
  }
  passive(actorId: string): CognitionLabPolicy {
    return {
      mode: 'oneResponse',
      focalActorId: actorId,
      autonomousActorIds: [],
      durationSeconds: 1,
      maximumCalls: 1,
      activeWallSeconds: 30,
    };
  }
  async position(actorId: string): Promise<Point> {
    const viewer = actorId === this.actor('focal') ? this.actor() : this.actor('focal');
    const query = new URLSearchParams({
      category: 'surroundings',
      fieldIds: JSON.stringify([actorId]),
      limit: '10',
    });
    const current = await this.api.json<import('@open-legend/protocol').CognitionLabCurrent>(
      `/current/${encodeURIComponent(viewer)}?${query}`,
    );
    const value = current.fields.items.find((field) => field.id === actorId)?.value;
    const placement = object(value) ? value['placement'] : undefined;
    const p = object(placement) ? placement['position'] : undefined;
    if (
      !object(placement) ||
      placement['mode'] !== 'world' ||
      !object(p) ||
      typeof p['x'] !== 'number' ||
      typeof p['y'] !== 'number' ||
      typeof p['z'] !== 'number'
    )
      throw new EpisodeBlocked('Movement needs an actual supported world position.');
    return {
      x: p['x'],
      y: p['y'],
      z: p['z'],
      ...(typeof placement['supportSurfaceId'] === 'string'
        ? { surfaceId: placement['supportSurfaceId'] }
        : {}),
    };
  }
  async work(actorId: string) {
    return (await this.api.fields(actorId, 'work')).find((field) => field.id === 'currentAction')
      ?.value;
  }
  async choose(
    actorId: string,
    type: string,
    query = '',
    match: Record<string, CognitionLabJson> = {},
  ): Promise<CognitionLabAction> {
    const target = typeof match['targetId'] === 'string' ? match['targetId'] : undefined;
    const choices = (await this.api.actions(actorId, type, target)).filter((choice) => {
      const command = choice.command;
      return (
        object(command) &&
        command['type'] === type &&
        Object.entries(match).every(
          ([key, value]) => JSON.stringify(command[key]) === JSON.stringify(value),
        )
      );
    });
    const itemIds = [
      ...new Set(
        choices.flatMap((choice) =>
          object(choice.command) && typeof choice.command['itemId'] === 'string'
            ? [choice.command['itemId']]
            : [],
        ),
      ),
    ];
    const names = new Map<string, string>();
    for (let i = 0; i < itemIds.length; i += 100) {
      const params = new URLSearchParams({
        category: 'surroundings',
        fieldIds: JSON.stringify(itemIds.slice(i, i + 100)),
        limit: '100',
      });
      const page = await this.api.json<import('@open-legend/protocol').CognitionLabCurrent>(
        `/current/${encodeURIComponent(actorId)}?${params}`,
      );
      for (const field of page.fields.items) names.set(field.id, field.label);
    }
    const selected = choices.filter(
      (choice) =>
        !query ||
        `${choice.label} ${object(choice.command) ? (names.get(String(choice.command['itemId'])) ?? '') : ''} ${JSON.stringify(choice.command)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    if (selected.length !== 1)
      throw new EpisodeBlocked(
        `Native ${type} selection needs one offered binding; found ${selected.length}.`,
      );
    return selected[0]!;
  }
  async submit(actorId: string, command: CognitionLabJson, policy: CognitionLabPolicy) {
    return this.api.operation({
      kind: 'submitStimulus',
      stimulus: { kind: 'act', actorId, text: '', command },
      policy,
    });
  }
  async advance(seconds: number) {
    return this.api.operation({
      kind: 'controlRun',
      action: 'advanceTime',
      durationSeconds: seconds,
    });
  }
  selectionRequest(step: NativeStep) {
    if (
      step.kind !== 'action' &&
      step.kind !== 'contact' &&
      step.kind !== 'attack' &&
      step.kind !== 'drop' &&
      step.kind !== 'pickup'
    )
      return undefined;
    const type =
      step.kind === 'action'
        ? step.type
        : step.kind === 'contact' && step.type
          ? step.type
          : this.type(step.kind);
    const match: Record<string, CognitionLabJson> = {
      ...('match' in step ? step.match : {}),
      ...(['attack', 'contact'].includes(step.kind)
        ? { targetId: this.actor('target' in step ? (step.target ?? 'focal') : 'focal') }
        : {}),
    };
    return {
      actorId: this.actor(step.actor),
      type,
      match,
      query: 'query' in step ? step.query : undefined,
    };
  }
  async perform(
    step: NativeStep,
    policy: CognitionLabPolicy,
  ): Promise<{
    movement?: NativeMovement;
    receipt?: CognitionLabReceipt;
  }> {
    if (step.kind === 'wait') {
      return step.seconds === 0 ? {} : { receipt: await this.advance(step.seconds) };
    }
    const actorId = this.actor(step.actor);
    if (step.kind === 'command')
      return { receipt: await this.submit(actorId, step.command, policy) };
    const targetId = this.actor(step.target ?? 'focal');
    if (step.kind === 'say') {
      const current = await this.api.refresh();
      return {
        receipt: await this.api.operation({
          kind: 'submitStimulus',
          stimulus: {
            kind: 'say',
            actorId,
            targetId,
            text: step.text,
            volume: current.defaults.volume,
          },
          policy,
        }),
      };
    }
    if (step.kind === 'move' || step.kind === 'moveAway' || step.kind === 'moveToward') {
      const start = await this.position(actorId);
      if (step.captureStartAs) this.points.set(step.captureStartAs, start);
      let destination: Point;
      if (step.kind === 'move') {
        if ('savedPoint' in step.position) {
          const captured = this.points.get(step.position.savedPoint);
          if (!captured)
            throw new EpisodeBlocked('The declared saved movement point was not captured.');
          destination = captured;
        } else destination = step.position;
      } else {
        const other = await this.position(targetId);
        let dx = start.x - other.x,
          dz = start.z - other.z;
        let distance = Math.hypot(dx, dz);
        if (distance < 0.01) {
          dx = 1;
          dz = 0;
          distance = 1;
        }
        const scale = ((step.kind === 'moveAway' ? 1 : -1) * step.metres) / distance;
        destination = { ...start, x: start.x + dx * scale, z: start.z + dz * scale };
      }
      const startedSim = (await this.api.refresh()).gameTime;
      const priorHistoryIds = new Set(
        (await this.api.fields(actorId, 'history')).map((field) => field.id),
      );
      const receipt = await this.submit(
        actorId,
        { type: this.type('move'), position: { ...destination } },
        policy,
      );
      return { receipt, movement: { actorId, destination, startedSim, priorHistoryIds } };
    }
    const { type, match, query } = this.selectionRequest(step)!;
    if (type === this.spec.protocol.nativeActionTypes?.['inspect'])
      return { receipt: await this.submit(actorId, { type }, policy) };
    const choice = await this.choose(actorId, type, query, match);
    return { receipt: await this.submit(actorId, choice.command, policy) };
  }
}
