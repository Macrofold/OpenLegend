import type { PlayerInteractionAvailability } from '@open-legend/protocol';
import type { NativeWorld } from '@open-legend/native-simulation';
import type { RequestScope } from './authority.js';
import { interactiveAllowance } from './cognition-budget.js';
import type { AppConfig } from './config.js';
import {
  copyNativeProduct,
  decodeNativeProduct,
  encodeNativeJson,
  releaseNativeProduct,
  withNativeJsonInput,
} from './native-consumer.js';
import {
  matchesNativePlayerContact,
  matchesNativePlayerPerson,
  type NativeContactSubject,
} from './native-player-command.js';
import {
  fundedPlayerInteractionAvailability,
  playerInteractionRefusal,
  type PlayerInteractionFacts,
} from './player-interaction.js';
import { ViewChangedError } from './player-view-async.js';
import { ContactReferenceError } from './public-contact-references.js';

type Operational = Pick<PlayerInteractionFacts, 'controlling' | 'paused' | 'pauseReason'>;
type NativeFacts = Omit<PlayerInteractionFacts, keyof Operational>;
type Role =
  | { kind: 'absent' }
  | { kind: 'self' }
  | { kind: 'body'; id: string; leaseId: string; life: number }
  | { kind: 'person'; id: string };

async function selectRole<T>(
  world: NativeWorld,
  scope: RequestScope,
  target: string | undefined,
  use: (role: Role) => Promise<T>,
): Promise<T> {
  if (!target) return use({ kind: 'absent' });
  if (target === scope.actorId) return use({ kind: 'self' });
  const kind = target.startsWith('contact-')
    ? 'body'
    : target.startsWith('person-')
      ? 'person'
      : null;
  if (!kind) throw new ContactReferenceError();
  const { accountId, actorId } = scope;
  const selected = await withNativeJsonInput(world, { accountId, actorId, kind }, (bytes) =>
    world.playerAvailabilitySubjects(bytes),
  );
  if (kind === 'body') {
    const bodies = decodeNativeProduct<readonly NativeContactSubject[]>(selected);
    try {
      const body = bodies.find((body) => matchesNativePlayerContact(scope, target, body));
      if (!body) throw new ContactReferenceError();
      return await use({
        kind,
        id: body.sourceId,
        leaseId: body.leaseId,
        life: body.physicalLife ?? 0,
      });
    } finally {
      releaseNativeProduct(bodies);
    }
  }
  const people = decodeNativeProduct<readonly string[]>(selected);
  try {
    const id = people.find((id) => matchesNativePlayerPerson(scope, target, id));
    if (!id) throw new ContactReferenceError();
    return await use({ kind, id });
  } finally {
    releaseNativeProduct(people);
  }
}

/** Read the player's accepted facts twice around the allowance query. Each read
 * uses one service turn and the deciding turn hands off independently owned
 * bytes synchronously. The HTTP send reports whether it took custody through
 * drain or close. See native-runtime-foundations-tech-design.md §9.2. */
export async function publishNativePlayerInteractionAvailability(request: {
  mode: 'speak' | 'act';
  targetId: string | undefined;
  scope: RequestScope;
  signal: AbortSignal;
  config: AppConfig;
  turn: <T>(operation: () => Promise<T>) => Promise<T>;
  world: () => NativeWorld;
  operational: () => Operational & { generation: string };
  budgetAvailable: (actor: string, allowance: number, ceiling: number) => Promise<boolean>;
  admit: (payer: string) => boolean;
  send: (bytes: Buffer) => boolean;
}): Promise<void> {
  const { scope, signal, mode, config } = request;
  const { accountId, actorId } = scope;
  const read = async (world: NativeWorld, role: Role) => {
    signal.throwIfAborted();
    const result = await withNativeJsonInput(world, { accountId, actorId, mode, role }, (bytes) =>
      world.playerAvailability(bytes),
    );
    if (!result) {
      signal.throwIfAborted();
      throw new ContactReferenceError();
    }
    return decodeNativeProduct<NativeFacts>(result);
  };
  const current = (world: NativeWorld, generation: string): Operational => {
    signal.throwIfAborted();
    const operational = request.operational();
    if (world !== request.world() || generation !== operational.generation)
      throw new ViewChangedError();
    return operational;
  };
  const publish = (
    world: NativeWorld,
    generation: string,
    facts: PlayerInteractionFacts,
    result: PlayerInteractionAvailability,
  ) => {
    const send = (value: PlayerInteractionAvailability, controlling: boolean) => {
      const bytes = encodeNativeJson(world, value);
      let transferred = false;
      try {
        const latest = current(world, generation);
        if (controlling && !latest.controlling) return false;
        transferred = request.send(bytes);
        return true;
      } finally {
        if (!transferred) releaseNativeProduct(bytes);
      }
    };
    if (!send(result, facts.controlling)) {
      const refusal = playerInteractionRefusal(mode, config, { ...facts, controlling: false });
      if (refusal) send(refusal, false);
    }
  };

  const initial = await request.turn(async () => {
    signal.throwIfAborted();
    const { generation } = request.operational();
    const world = request.world();
    return selectRole(world, scope, request.targetId, async (role) => {
      current(world, generation);
      const facts = await read(world, role);
      try {
        const scoped = { ...facts, ...current(world, generation) };
        const refusal = playerInteractionRefusal(mode, config, scoped);
        if (refusal) {
          publish(world, generation, scoped, refusal);
          return null;
        }
        const binding = copyNativeProduct(world, { role, payer: facts.fundingActorId });
        return { world, generation, binding };
      } finally {
        releaseNativeProduct(facts);
      }
    });
  });
  if (!initial) return;
  const { world, generation, binding } = initial;
  try {
    current(world, generation);
    const funded = await request.budgetAvailable(
      binding.payer,
      interactiveAllowance(config),
      config.budgetUsd,
    );
    signal.throwIfAborted();
    await request.turn(async () => {
      current(world, generation);
      const facts = await read(world, binding.role);
      try {
        const scoped = { ...facts, ...current(world, generation) };
        publish(
          world,
          generation,
          scoped,
          fundedPlayerInteractionAvailability(
            mode,
            config,
            scoped,
            binding.payer,
            funded,
            request.admit,
          ),
        );
      } finally {
        releaseNativeProduct(facts);
      }
    });
  } finally {
    releaseNativeProduct(binding);
  }
}
