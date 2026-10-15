import { useEffect, useRef, useState } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type { ApiResult, GameView } from '@open-legend/protocol';
import { post, privateDraftScope } from '../api';
import { Button, IconButton, Tag } from '../design-system/components';
import { validatePerson } from './god-tools';

type Kind = 'item' | 'person' | 'environment';
export type CreationDraft = {
  kind: Kind;
  body: Record<string, unknown>;
  label: string;
  destinationLabel: string;
};
type Request = CreationDraft & {
  body: Record<string, unknown> & { id: string };
  outcome?: ApiResult;
};
type State = {
  key: string | null;
  request?: Request;
  blocked: boolean;
  busy: boolean;
  visible: boolean;
  message: string;
};
const paths = { item: '/api/god/items', person: '/api/god/person', environment: '/api/god/spawn' };
const spawnRefusals = new Set([
  'identity',
  'unsupported',
  'blocked',
  'occupied',
  'invalid-person',
  'invalid-object',
  'work-unavailable',
]);
const refused = (kind: Kind, code: string) =>
  kind === 'item' ? ['invalid-item', 'unavailable'].includes(code) : spawnRefusals.has(code);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;
// Match the native JSON-record ID boundary without restricting authored IDs to one alphabet.
const id = (value: unknown): value is string =>
  text(value, 180) &&
  value.trim().length > 0 &&
  value !== 'prototype' &&
  !Object.hasOwn(Object.prototype, value);
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, required: string[], optional: string[] = []) =>
  required.every((key) => Object.hasOwn(value, key)) &&
  Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
const strings = (value: unknown, count: number, size: number): value is string[] =>
  Array.isArray(value) && value.length <= count && value.every((entry) => text(entry, size));
function position(value: unknown): boolean {
  return (
    object(value) &&
    keys(value, ['x', 'y', 'z', 'surfaceId']) &&
    id(value.surfaceId) &&
    ['x', 'y', 'z'].every((axis) => typeof value[axis] === 'number' && Number.isFinite(value[axis]))
  );
}
function validResult(value: unknown, kind: Kind): value is ApiResult {
  if (
    !object(value) ||
    !keys(value, ['ok', 'code', 'message'], ['itemId', 'entityId']) ||
    typeof value.ok !== 'boolean' ||
    !text(value.code, 200) ||
    !text(value.message, 4000)
  )
    return false;
  return (
    !value.ok ||
    (kind === 'item'
      ? value.code === 'item-created' && id(value.itemId)
      : value.code === 'spawned' && id(value.entityId))
  );
}
function validRequest(value: unknown): value is Request {
  if (
    !object(value) ||
    !keys(value, ['kind', 'body', 'label', 'destinationLabel'], ['outcome']) ||
    (value.kind !== 'item' && value.kind !== 'person' && value.kind !== 'environment') ||
    !text(value.label, 400) ||
    !text(value.destinationLabel, 400) ||
    !object(value.body) ||
    !id(value.body.id)
  )
    return false;
  const body = value.body,
    kind = value.kind;
  if (
    value.outcome !== undefined &&
    (!validResult(value.outcome, kind) || (!value.outcome.ok && !refused(kind, value.outcome.code)))
  )
    return false;
  if (kind === 'item')
    return (
      keys(body, ['id', 'definitionId', 'quantity', 'destination']) &&
      id(body.definitionId) &&
      Number.isSafeInteger(body.quantity) &&
      Number(body.quantity) > 0 &&
      object(body.destination) &&
      (keys(body.destination, ['actorId'])
        ? id(body.destination.actorId)
        : keys(body.destination, ['position']) && position(body.destination.position))
    );
  if (kind === 'environment')
    return keys(body, ['id', 'type', 'position']) && id(body.type) && position(body.position);
  if (
    !keys(body, [
      'id',
      'position',
      'name',
      'personality',
      'backstory',
      'traitIds',
      'initialGoals',
    ]) ||
    !position(body.position) ||
    !text(body.name, 80) ||
    !text(body.personality, 1000) ||
    !text(body.backstory, 4000) ||
    !strings(body.traitIds, 8, 200) ||
    !body.traitIds.every(id) ||
    !strings(body.initialGoals, 8, 500)
  )
    return false;
  return !validatePerson({
    name: body.name,
    personality: body.personality,
    backstory: body.backstory,
    traitIds: body.traitIds,
    initialGoals: body.initialGoals,
  });
}
function read(key: string): Request | undefined {
  const raw = sessionStorage.getItem(key);
  if (raw === null) return;
  if (raw.length > 32768)
    throw new Error('The retained creation is too large to read safely. No new creation was sent.');
  const value: unknown = JSON.parse(raw);
  if (!validRequest(value))
    throw new Error('The retained creation could not be read safely. No new creation was sent.');
  return value;
}
function initial(key: string | null): State {
  try {
    return {
      key,
      request: key ? read(key) : undefined,
      blocked: !key,
      busy: false,
      visible: false,
      message: key ? '' : 'Refresh character access before creating.',
    };
  } catch {
    return {
      key,
      blocked: true,
      busy: false,
      visible: false,
      message: 'This browser could not read the retained creation. No new creation was sent.',
    };
  }
}
const same = (a: Request, b?: Request) =>
  !!b && a.kind === b.kind && JSON.stringify(a.body) === JSON.stringify(b.body);

/** One retained creator request across the three real creation entries. Reading never dispatches.
 * docs/projects/game-interaction-redesign-tech-design.md#recover-item-person-and-environment-creation
 */
export function useCreationRequest(view: GameView | null, connected: boolean) {
  const namespace = view?.access?.privateDraftScope;
  const key =
    namespace && view?.saveTimeline
      ? `open-legend:creation-request:${JSON.stringify([namespace, view.worldId, view.saveTimeline, view.player.id])}`
      : null;
  const [stored, setStored] = useState(() => initial(key));
  const current = stored.key === key ? stored : initial(key);
  if (current !== stored) setStored(current);
  const latest = useRef(current),
    alive = useRef(true);
  latest.current = current;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  function live() {
    try {
      return (
        alive.current && !!key && latest.current.key === key && privateDraftScope() === namespace
      );
    } catch {
      return false;
    }
  }
  function update(change: Partial<State>) {
    if (!alive.current || latest.current.key !== key) return;
    latest.current = { ...latest.current, ...change };
    setStored(latest.current);
  }
  function available() {
    return live() && connected && view?.godMode && view.access?.controlling;
  }
  function refresh() {
    if (latest.current.busy) return;
    const found = initial(key),
      retained = latest.current.request;
    if (retained && found.request && !same(retained, found.request)) {
      update({
        blocked: true,
        message: 'The retained creation changed. No request was sent.',
        visible: true,
      });
      return;
    }
    update({
      request: retained?.outcome ? retained : (found.request ?? retained),
      blocked: found.blocked,
      message: found.message,
      visible: !!(found.blocked || found.request || retained),
    });
  }
  function openEntry() {
    refresh();
    return (
      !latest.current.busy && !latest.current.blocked && !latest.current.request && available()
    );
  }
  function persist(request: Request) {
    if (!key || !live())
      throw new Error('Character access changed. Reopen creation after reconnecting.');
    const existing = read(key);
    if (existing && !same(request, existing))
      throw new Error('Another creation remains unresolved. Nothing new was sent.');
    const serialized = JSON.stringify(request);
    sessionStorage.setItem(key, serialized);
    if (sessionStorage.getItem(key) !== serialized)
      throw new Error('This browser could not retain the exact creation. Nothing was sent.');
  }
  function finish(request: Request, outcome: ApiResult): ApiResult | undefined {
    if (!live() || !same(request, latest.current.request)) return;
    const resolved = { ...request, outcome };
    // Keep the confirmed native result in memory even if saving/removing its local record fails.
    update({ request: resolved, busy: false, message: outcome.message });
    try {
      const existing = read(key!);
      if (existing && !same(request, existing)) throw new Error('The retained creation changed.');
      try {
        sessionStorage.setItem(key!, JSON.stringify(resolved));
      } catch {
        // A full store may reject the larger confirmed result but still allow deletion.
        // Memory keeps the result; matching removal and its read-back remain mandatory.
      }
      const retained = read(key!);
      if (retained && !same(request, retained)) throw new Error('The retained creation changed.');
      sessionStorage.removeItem(key!);
      if (sessionStorage.getItem(key!) !== null) throw new Error('The retained record remains.');
    } catch {
      update({
        blocked: true,
        visible: true,
        message:
          'This browser could not clear the retained request. Retry local cleanup before creating again.',
      });
      return;
    }
    update({
      request: undefined,
      blocked: false,
      busy: false,
      visible: false,
      message: outcome.message,
    });
    return outcome;
  }
  function supported(request: Request): boolean {
    const tools = view?.godTools;
    if (request.kind === 'item')
      return !!tools?.itemOptions.some((entry) => entry.id === request.body.definitionId);
    if (request.kind === 'environment')
      return (
        request.body.type !== 'person' &&
        !!tools?.spawnOptions.some((entry) => entry.id === request.body.type)
      );
    return (
      !!tools?.spawnOptions.some((entry) => entry.id === 'person') &&
      (request.body.traitIds as string[]).every((trait) =>
        tools.traits.some((entry) => entry.id === trait),
      )
    );
  }
  async function dispatch(request: Request, fresh: boolean): Promise<ApiResult | undefined> {
    if (latest.current.busy || !available()) return;
    if (!supported(request)) {
      if (fresh)
        return {
          ok: false,
          code: 'unsupported',
          message: 'These creation options changed. Review them before creating. Nothing was sent.',
        };
      update({
        request,
        blocked: true,
        visible: true,
        message:
          'The original creation options are unavailable in the current world. Nothing was sent.',
      });
      return;
    }
    update({ request, busy: true, blocked: false, message: '' });
    try {
      persist(request);
    } catch (reason) {
      update({
        busy: false,
        blocked: true,
        visible: true,
        message: `${reason instanceof Error ? reason.message : 'This browser could not retain the creation.'} Nothing was sent.`,
      });
      return;
    }
    try {
      const result: unknown = await post(paths[request.kind], request.body);
      if (!live() || !same(request, latest.current.request)) return;
      if (validResult(result, request.kind)) {
        if (result.ok || (fresh && refused(request.kind, result.code)))
          return finish(request, result);
        update({ message: result.message });
      } else update({ message: 'The server did not return a confirmed creation result.' });
    } catch (reason) {
      if (!live() || !same(request, latest.current.request)) return;
      update({
        message: reason instanceof Error ? reason.message : 'The creation result is unknown.',
      });
    }
    if (live() && same(request, latest.current.request)) update({ busy: false, visible: true });
  }
  async function create(draft: CreationDraft) {
    if (!openEntry()) {
      if (!latest.current.request && !latest.current.blocked && !available())
        return {
          ok: false,
          code: 'offline',
          message:
            'Reconnect with control of this character and God mode to create. Nothing was sent.',
        };
      return;
    }
    const request = { ...draft, body: { ...draft.body, id: crypto.randomUUID() } };
    if (!validRequest(request)) {
      return {
        ok: false,
        code: 'invalid',
        message: 'Check the creation details before sending. Nothing was sent.',
      };
    }
    return dispatch(request, true);
  }
  async function retry() {
    const request = latest.current.request;
    if (!request || request.outcome || latest.current.busy) return;
    try {
      const stored = key ? read(key) : undefined;
      if (same(request, stored) && stored?.outcome) return finish(stored, stored.outcome);
    } catch {
      update({
        blocked: true,
        message: 'This browser could not read the original creation. Nothing was sent.',
      });
      return;
    }
    return dispatch(request, false);
  }
  function cleanup() {
    const request = latest.current.request;
    if (!request?.outcome || latest.current.busy || !live()) return;
    return finish(request, request.outcome);
  }
  return {
    ...current,
    enabled: !!available(),
    openEntry,
    create,
    retry,
    cleanup,
    refresh,
    hide: () => update({ visible: false }),
  };
}

export function CreationRecoveryModal({
  recovery,
  close,
  resolved,
}: {
  recovery: ReturnType<typeof useCreationRequest>;
  close(): void;
  resolved(result: ApiResult): void;
}) {
  const request = recovery.request;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <ModalOverlay
      className="ol-root ol-modal-overlay"
      isOpen
      isDismissable={!recovery.busy}
      isKeyboardDismissDisabled={recovery.busy}
      onOpenChange={(open) => !open && close()}
    >
      <Modal className="ol-modal">
        <Dialog className="ol-person-dialog" aria-label="Original creation">
          <header className="ol-modal-head">
            <div>
              <Tag tone="highlight">God mode</Tag>
              <h2 className="ol-heading">Original creation</h2>
            </div>
            <IconButton
              icon="ui.close"
              label="Close creation recovery"
              disabled={recovery.busy}
              onPress={close}
            />
          </header>
          <div className="ol-person-form">
            {request && (
              <>
                <h3>{request.label}</h3>
                <p>{request.destinationLabel}</p>
                <p>
                  {request.outcome
                    ? request.outcome.message
                    : 'The original result is not confirmed. Retry may recover a completed creation or perform this original creation if it was never received.'}
                </p>
              </>
            )}
            <p>
              Resolve this retained creation before creating something else. Closing keeps it
              available from any creation entry.
            </p>
            {recovery.message && <p role="status">{recovery.message}</p>}
            {!request?.outcome && !recovery.enabled && (
              <p>Reconnect with control of this character and God mode to retry creation.</p>
            )}
          </div>
          <footer className="ol-modal-actions">
            <Button variant="quiet" disabled={recovery.busy} onPress={close}>
              Close
            </Button>
            {request?.outcome ? (
              <Button
                disabled={recovery.busy}
                onPress={() => {
                  const result = recovery.cleanup();
                  if (result) resolved(result);
                }}
              >
                Retry local cleanup
              </Button>
            ) : request ? (
              <Button
                busy={recovery.busy}
                disabled={!recovery.enabled}
                onPress={() =>
                  void recovery.retry().then((result) => {
                    if (alive.current && result) resolved(result);
                  })
                }
              >
                Retry original creation
              </Button>
            ) : (
              <Button disabled={recovery.busy} onPress={recovery.refresh}>
                Read retained creation again
              </Button>
            )}
          </footer>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
