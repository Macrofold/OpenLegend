import { useEffect, useRef, useState } from 'react';
import type {
  CommandReceiptResult,
  EntityView,
  GameView,
  InventoryAccessView,
  SurfacePoint,
} from '@open-legend/protocol';
import { getState, post } from '../api';
import type { CommandDispatcher, CommandRequestIdentity } from '../command-request';
import { Button } from '../design-system/components';
import './container-opening.css';

export interface OpenContainerRequest {
  requestId: string;
  containerId: string | null;
  name: string;
}
type Movement = CommandRequestIdentity & { stance: SurfacePoint; actionId?: string; seen: boolean };
type Attempt = {
  token: number;
  scope: string;
  entityId: string;
  containerId: string;
  name: string;
  geometry: string;
  placementRevision: number;
  geometryRevision: number;
  phase: 'checking' | 'out-of-reach' | 'walking' | 'unknown' | 'blocked';
  message: string;
  movement?: Movement;
  cancelRequested?: boolean;
};
function geometry(entity: EntityView): string {
  return JSON.stringify([entity.position, entity.supportSurfaceId, entity.radius]);
}
function atStance(view: GameView, stance: SurfacePoint): boolean {
  const { position, supportSurfaceId } = view.player;
  return (
    supportSurfaceId === stance.surfaceId &&
    position.x === stance.x &&
    position.y === stance.y &&
    position.z === stance.z
  );
}

/** Opening is a read. The only movement starts with the player's explicit Walk action. */
export function useContainerOpening(
  view: GameView | null,
  connected: boolean,
  dispatch: CommandDispatcher,
) {
  const [opening, setOpening] = useState<Attempt | null>(null);
  const [openContainer, setOpenContainer] = useState<OpenContainerRequest | null>();
  const current = useRef<Attempt | null>(null);
  const sequence = useRef(0);
  const read = useRef<AbortController | null>(null);
  const latest = useRef({ view, connected, dispatch });
  latest.current = { view, connected, dispatch };

  function retain(value: Attempt | null) {
    current.current = value;
    setOpening(value);
  }
  function sameScope(value: Attempt): boolean {
    const now = latest.current;
    return (
      current.current?.token === value.token &&
      now.connected &&
      now.view?.access?.scope === value.scope
    );
  }
  function active(value: Attempt): boolean {
    const now = latest.current;
    const target = now.view?.entities.find((entity) => entity.id === value.entityId);
    return (
      sameScope(value) &&
      !!target &&
      target.storage?.containerId === value.containerId &&
      target.storage.placementRevision === value.placementRevision &&
      now.view?.map.spatial.revision === value.geometryRevision &&
      geometry(target) === value.geometry
    );
  }
  function stopFollowing() {
    sequence.current++;
    read.current?.abort();
    retain(null);
  }
  function blocked(value: Attempt, message: string) {
    if (current.current?.token !== value.token) return;
    read.current?.abort();
    retain({ ...value, ...current.current, phase: 'blocked', message });
  }
  async function inspectAccess(value: Attempt, approach: boolean) {
    read.current?.abort();
    const abort = new AbortController();
    read.current = abort;
    retain({
      ...value,
      phase: 'checking',
      message: approach ? 'Finding a place to stand…' : 'Checking access…',
    });
    try {
      const access = await post<InventoryAccessView>(
        '/api/inventory/access',
        {
          containerId: value.containerId,
          ...(approach ? { approach: true } : {}),
        },
        abort.signal,
      );
      if (abort.signal.aborted || !active(value) || current.current?.cancelRequested) return;
      if (access.scope !== value.scope || access.container?.id !== value.containerId) {
        blocked(value, access.message ?? 'This container is no longer available.');
        return;
      }
      if (
        access.container.rootId !== value.entityId ||
        access.container.placementRevision !== value.placementRevision ||
        access.container.geometryRevision !== value.geometryRevision
      ) {
        blocked(value, 'The container or its surroundings changed. Open it again.');
        return;
      }
      if (access.status === 'ready' && access.ok) {
        setOpenContainer({
          requestId: crypto.randomUUID(),
          containerId: value.containerId,
          name: access.container.name,
        });
        retain(null);
      } else if (access.status === 'out-of-reach' && approach && access.stance) {
        await walk(value, access.stance);
      } else {
        retain({
          ...value,
          phase: access.status === 'out-of-reach' ? 'out-of-reach' : 'blocked',
          message: access.message ?? 'This container is unavailable.',
        });
      }
    } catch (reason) {
      if (!abort.signal.aborted && active(value)) blocked(value, String(reason));
    }
  }
  function examineMovement(value: Attempt, snapshot: GameView, freshRead = false) {
    const movement = value.movement;
    if (!movement?.actionId || !active(value) || snapshot.access?.scope !== value.scope) return;
    const action = snapshot.player.action;
    if (action?.id === movement.actionId) {
      if (!movement.seen) retain({ ...value, movement: { ...movement, seen: true } });
      return;
    }
    // A fresh post-admission read also covers walks that finish between stream frames.
    if (!movement.seen && !freshRead && !atStance(snapshot, movement.stance)) return;
    if (action || !atStance(snapshot, movement.stance)) {
      blocked(
        value,
        'The walk ended before this container could be opened. Open it again when ready.',
      );
      return;
    }
    void inspectAccess(value, false);
  }
  async function followAdmitted(value: Attempt, actionId: string) {
    if (!value.movement || !sameScope(value)) return;
    const pending = current.current;
    if (!pending) return;
    const following: Attempt = {
      ...pending,
      phase: 'walking',
      message: 'Walking to this container…',
      movement: { ...value.movement, actionId },
    };
    if (pending.cancelRequested) return stopMovement(following);
    if (!active(value) || pending.phase === 'blocked') {
      retain({ ...following, phase: 'blocked', message: pending.message });
      return;
    }
    retain(following);
    try {
      const snapshot = await getState();
      const streamed = latest.current.view;
      const newest =
        streamed &&
        streamed.access?.scope === snapshot.access?.scope &&
        streamed.revision > snapshot.revision
          ? streamed
          : snapshot;
      if (active(following) && current.current?.phase === 'walking')
        examineMovement(current.current, newest, true);
    } catch {
      if (active(following))
        blocked(following, 'The walk could not be checked. Reopen the container when connected.');
    }
  }
  async function walk(value: Attempt, stance: SurfacePoint) {
    const now = latest.current;
    if (!active(value) || !now.view?.commandEpoch || now.view.clock.paused) {
      if (active(value))
        blocked(value, 'Press Play to resume the world, then open this container again.');
      return;
    }
    const movement: Movement = {
      stance,
      seen: false,
      commandId: crypto.randomUUID(),
      commandEpoch: now.view.commandEpoch,
    };
    const moving: Attempt = {
      ...value,
      phase: 'checking',
      message: 'Starting the walk…',
      movement,
    };
    retain(moving);
    const result = await now.dispatch(
      {
        id: 'walk-to-container',
        label: `Walk to ${value.name}`,
        enabled: true,
        command: { type: 'move', position: stance },
      },
      movement,
    );
    if (!sameScope(moving)) return;
    if (result.ok && result.actionId) await followAdmitted(moving, result.actionId);
    else if (result.code === 'unconfirmed' && current.current)
      retain({
        ...current.current,
        phase: 'unknown',
        message: 'The walk response was lost. Check its result before trying again.',
      });
    else if (current.current?.cancelRequested) stopFollowing();
    else blocked(moving, result.message);
  }
  async function checkResult() {
    const value = current.current;
    if (!value?.movement || !sameScope(value)) return;
    const movement = value.movement;
    retain({ ...value, phase: 'checking', message: 'Checking the original walk…' });
    try {
      const receipt = await post<CommandReceiptResult>('/api/command/receipt', {
        commandId: movement.commandId,
        commandEpoch: movement.commandEpoch,
        command: { type: 'move', position: movement.stance },
      });
      if (!sameScope(value)) return;
      if (receipt.scope !== value.scope)
        return blocked(value, 'Refresh your access and reopen this container.');
      if (receipt.status === 'resolved') {
        if (receipt.result.ok && receipt.result.actionId)
          await followAdmitted(value, receipt.result.actionId);
        else blocked(value, receipt.result.message);
      } else if (current.current)
        retain({ ...current.current, phase: 'unknown', message: receipt.message });
    } catch (reason) {
      if (sameScope(value) && current.current)
        retain({ ...current.current, phase: 'unknown', message: String(reason) });
    }
  }
  function open(entity: EntityView) {
    stopFollowing();
    setOpenContainer({ requestId: crypto.randomUUID(), containerId: null, name: entity.name });
    const now = latest.current;
    if (!entity.storage || !now.view?.access?.scope || !now.connected) return;
    const value: Attempt = {
      token: ++sequence.current,
      scope: now.view.access.scope,
      entityId: entity.id,
      containerId: entity.storage.containerId,
      name: entity.name,
      geometry: geometry(entity),
      placementRevision: entity.storage.placementRevision,
      geometryRevision: now.view.map.spatial.revision,
      phase: 'checking',
      message: 'Checking access…',
    };
    retain(value);
    void inspectAccess(value, false);
  }
  function retry() {
    const entity = latest.current.view?.entities.find(
      (entry) => entry.id === current.current?.entityId,
    );
    if (entity) open(entity);
  }
  async function stopMovement(value: Attempt) {
    if (!value.movement?.actionId || !sameScope(value)) return;
    read.current?.abort();
    const cancelled: Attempt = {
      ...value,
      cancelRequested: true,
      phase: 'checking',
      message: 'Stopping this walk…',
    };
    retain(cancelled);
    const result = await latest.current.dispatch({
      id: 'stop-container-walk',
      label: 'Stop walking',
      enabled: true,
      command: { type: 'cancel', expectedActionId: value.movement.actionId },
    });
    if (!sameScope(value)) return;
    if (result.code === 'unconfirmed')
      retain({
        ...cancelled,
        phase: 'unknown',
        message: 'The stop could not be confirmed. Check the original walk before continuing.',
      });
    else stopFollowing();
  }
  function cancel() {
    const value = current.current;
    if (!value?.movement) return stopFollowing();
    if (value.cancelRequested && value.phase === 'checking') return;
    read.current?.abort();
    const cancelled: Attempt = {
      ...value,
      cancelRequested: true,
      message: 'Cancelling the opening. Waiting for the original walk result…',
    };
    retain(cancelled);
    if (value.movement.actionId) void stopMovement(cancelled);
    else if (value.phase === 'unknown') void checkResult();
  }
  useEffect(() => {
    const value = current.current;
    if (!value) return;
    if (!connected || view?.access?.scope !== value.scope) return stopFollowing();
    const target = view.entities.find((entity) => entity.id === value.entityId);
    if (
      !target ||
      target.storage?.containerId !== value.containerId ||
      target.storage.placementRevision !== value.placementRevision ||
      view.map.spatial.revision !== value.geometryRevision ||
      geometry(target) !== value.geometry
    ) {
      if (value.phase !== 'blocked')
        blocked(value, 'The container moved or is no longer visible. Open it again.');
      return;
    }
    if (value.phase === 'walking') examineMovement(value, view);
  }, [view, connected]);
  useEffect(
    () => () => {
      read.current?.abort();
      current.current = null;
    },
    [],
  );
  return {
    opening,
    openContainer,
    open,
    stopFollowing,
    cancel,
    retry,
    checkResult,
    walk: () => {
      if (current.current?.phase === 'out-of-reach') void inspectAccess(current.current, true);
    },
  };
}

export function ContainerOpening({
  state,
  paused,
}: {
  state: ReturnType<typeof useContainerOpening>;
  paused: boolean;
}) {
  const value = state.opening;
  if (!value) return null;
  return (
    <section className="ol-container-opening" aria-label={`Opening ${value.name}`}>
      <h3 className="ol-heading">{value.name}</h3>
      <p role="status">{value.message}</p>
      <div className="ol-actions">
        {value.phase === 'out-of-reach' && (
          <Button variant="primary" disabled={paused} onPress={state.walk}>
            Walk to and open
          </Button>
        )}
        {value.phase === 'unknown' && (
          <Button onPress={() => void state.checkResult()}>Check walking result</Button>
        )}
        {value.phase === 'blocked' && <Button onPress={state.retry}>Check access again</Button>}
        <Button
          variant="quiet"
          disabled={value.cancelRequested && value.phase === 'checking'}
          onPress={state.cancel}
        >
          {value.movement ? 'Stop walking' : 'Dismiss'}
        </Button>
      </div>
      {value.phase === 'out-of-reach' && paused && (
        <p className="ol-caption">Press Play to walk to this container.</p>
      )}
    </section>
  );
}
