import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type {
  ActionOption,
  ApiResult,
  CommandInput,
  EntityView,
  GameView,
  TimedReleaseInput,
  TimedReleaseProfile,
  WorldInputScope,
  WorldInputUpdate,
} from '@open-legend/protocol';
import { updateWorldInput } from '../api';
import type { CommandDispatcher, CommandRequestIdentity } from '../command-request';
import type {
  AttackPointerControls,
  PhysicalAimPoint,
  ScreenPoint,
  WorldRenderer,
} from '../world-renderer';
import { useInventoryCommand } from './use-inventory-command';
import { modalOwnsInput, uiOwnsShortcut } from './keyboard';
import {
  ATTACK_HOLD_MS,
  movementDirection,
  movementKey,
  timingPhase,
  type ActionInputPreferences,
  type MovementKey,
} from './action-input';

function aimBasis(aim: PhysicalAimPoint) {
  return {
    ...(aim.bodyReference ? { bodyReference: aim.bodyReference } : {}),
    ...(aim.surfaceId ? { surfaceId: aim.surfaceId } : {}),
    ...(aim.shapeId ? { shapeId: aim.shapeId } : {}),
  };
}
type RangedAttackSource = Extract<
  NonNullable<GameView['player']['attackSource']>,
  { kind: 'ranged' }
>;
function leadTarget(aim: PhysicalAimPoint, source: RangedAttackSource): boolean {
  return !!(
    aim.targetId &&
    aim.bodyReference &&
    aim.livingBody &&
    (source.targetRule === 'living-actor' ||
      (source.targetRule === 'living-animal' && aim.livingBody === 'animal'))
  );
}
/** Replace the entire final intent. A body uses native observed-motion leading;
 * scenery keeps its physical point and permitted basis, never an old target. */
function withAim(
  command: CommandInput,
  aim: PhysicalAimPoint,
  source: RangedAttackSource,
): CommandInput {
  const next = { ...command };
  delete next.aimPoint;
  delete next.aimBasis;
  delete next.targetId;
  delete next.bodyReference;
  if (leadTarget(aim, source)) {
    next.targetId = aim.targetId;
    next.bodyReference = aim.bodyReference;
  } else if (source.pointFire) {
    next.aimPoint = aim.position;
    next.aimBasis = aimBasis(aim);
    // Identifiable scenery can supply an entity basis without a map shape ID.
    if (aim.targetId) next.targetId = aim.targetId;
  }
  return next;
}
interface Attempt {
  ownerKey: string;
  request: CommandRequestIdentity;
  scope: WorldInputScope;
  sequence: number;
  source: NonNullable<GameView['player']['attackSource']>;
  command: CommandInput;
  downAt: number;
  profile?: TimedReleaseProfile;
  phaseOrigin?: number;
  actionId?: string;
  cancelled?: boolean;
  releaseRequested?: true;
  frozen?: { aim: PhysicalAimPoint; input: TimedReleaseInput };
}
export interface AttackPresentation {
  id: string;
  label: string;
  status: 'pending' | 'preparing' | 'release-requested';
  profile?: TimedReleaseProfile;
  phaseOrigin?: number;
}

/** One gesture coordinates existing native actions and durable receipt recovery.
 * Operational input is never reconstructed from a stored command or a new token.
 */
export function useActionExecution({
  view,
  connected,
  scene,
  preferences,
  blocked,
  ownReview,
  command,
  onReview,
  notify,
}: {
  view: GameView | null;
  connected: boolean;
  scene: RefObject<WorldRenderer | null>;
  preferences: ActionInputPreferences;
  blocked: boolean;
  ownReview: boolean;
  command: CommandDispatcher;
  onReview(action: ActionOption, review: NonNullable<ApiResult['lethalReview']>): void;
  notify(message: string): void;
}) {
  const [mode, setMode] = useState(false);
  const [presentation, setPresentation] = useState<AttackPresentation>();
  const [hasLiveAttempt, setHasLiveAttempt] = useState(false);
  const [message, setMessage] = useState('');
  const [reticle, setReticle] = useState<ScreenPoint>();
  const point = useRef<{ screen?: ScreenPoint; aim: PhysicalAimPoint | null }>({ aim: null });
  const attempt = useRef<Attempt | undefined>(undefined);
  const reviewAttempt = useRef<Attempt | undefined>(undefined);
  const inputPending = useRef(0);
  const sequence = useRef(0);
  const renewal = useRef(0);
  const keys = useRef(new Set<MovementKey>());
  // Capture the camera basis only when movement keys change; orbit never steers held movement.
  const movementYaw = useRef(0);
  const movement = useRef<
    { sequence: number; scope: WorldInputScope; direction: { x: number; z: number } } | undefined
  >(undefined);
  const movementSequence = useRef(0);
  const pendingRelease = useRef<
    | { scope: WorldInputScope; sequence: number; beginCommandId: string; actionId: string }
    | undefined
  >(undefined);
  const liveScope = useRef<WorldInputScope | undefined>(undefined);
  const priorScope = useRef('');
  const notice = useRef<{ scope: string; sequence: number } | undefined>(undefined);
  const current = useRef({
    view,
    connected,
    scene,
    preferences,
    blocked,
    ownReview,
    command,
    onReview,
    notify,
  });
  current.current = {
    view,
    connected,
    scene,
    preferences,
    blocked,
    ownReview,
    command,
    onReview,
    notify,
  };
  const scopeKey = JSON.stringify([
    view?.worldId,
    view?.saveTimeline,
    view?.historyEpoch?.split(':')[0],
    view?.player.id,
    view?.player.life,
    view?.access?.scope,
    view?.access?.controlGeneration,
  ]);
  const receipt = useInventoryCommand({
    worldId: view?.worldId ?? '',
    actorId: view?.player.id ?? '',
    timeline: view?.saveTimeline,
    scope: view?.access?.scope ?? '',
    recoveryScope: view?.access?.commandRecoveryScope,
    epoch: view?.commandEpoch,
    connected,
    task: 'attack',
    command,
    onResolved: () => setMessage(''),
  });
  const receiptRef = useRef(receipt);
  receiptRef.current = receipt;
  function endAttempt() {
    attempt.current = undefined;
    setHasLiveAttempt(false);
    setPresentation(undefined);
  }
  function publish(value: Attempt, status: AttackPresentation['status']) {
    if (attempt.current !== value || value.cancelled) return;
    setPresentation({
      id: value.request.commandId,
      label: value.source.label,
      status,
      profile: value.profile,
      phaseOrigin: value.phaseOrigin,
    });
  }
  function acceptScope(next: WorldInputScope | undefined) {
    if (!next) return;
    const previous = liveScope.current;
    if (previous && next.revision < previous.revision) return;
    if (previous && previous.inputEpoch !== next.inputEpoch) {
      cancel();
      keys.current.clear();
      movement.current = undefined;
      pendingRelease.current = undefined;
      movementSequence.current = 0;
      sequence.current = 0;
    } else {
      if (previous?.movementInputToken !== next.movementInputToken) {
        keys.current.clear();
        movement.current = undefined;
        movementSequence.current = 0;
      }
      if (previous?.attackInputToken !== next.attackInputToken) {
        const value = attempt.current;
        if (value) value.cancelled = true;
        endAttempt();
        pendingRelease.current = undefined;
        sequence.current = 0;
      }
    }
    liveScope.current = next;
  }
  async function input(update: WorldInputUpdate) {
    const owner = scopeKey;
    if (
      inputPending.current &&
      (update.kind === 'renew' || update.direction.x !== 0 || update.direction.z !== 0)
    )
      return;
    inputPending.current++;
    try {
      const result = await updateWorldInput(update);
      if (priorScope.current !== owner) return;
      acceptScope(result.inputScope);
      if (
        update.kind === 'steer' &&
        !result.ok &&
        movement.current?.sequence === update.movementSequence &&
        movement.current.scope.movementInputToken === update.movementInputToken
      ) {
        keys.current.clear();
        movement.current = undefined;
        setMessage(result.message);
      }
      if (
        update.kind === 'renew' &&
        update.pendingRelease &&
        result.releaseAccepted === false &&
        pendingRelease.current?.sequence === update.pendingRelease.gestureSequence &&
        pendingRelease.current.scope.attackInputToken === update.pendingRelease.attackInputToken
      ) {
        pendingRelease.current = undefined;
        endAttempt();
      }
    } catch {
      if (priorScope.current !== owner) return;
      // An uncertain input update is never resent under replacement authority.
      if (attempt.current) attempt.current.cancelled = true;
      endAttempt();
      keys.current.clear();
      movement.current = undefined;
      pendingRelease.current = undefined;
    } finally {
      inputPending.current--;
    }
  }
  function stopMovement() {
    keys.current.clear();
    const active = movement.current;
    movement.current = undefined;
    if (active)
      void input({
        kind: 'steer',
        inputEpoch: active.scope.inputEpoch,
        movementInputToken: active.scope.movementInputToken,
        movementSequence: ++movementSequence.current,
        direction: { x: 0, z: 0 },
      });
  }
  function cancel(deliberate = false) {
    const value = attempt.current;
    const waiting = pendingRelease.current;
    endAttempt();
    pendingRelease.current = undefined;
    if (!value) {
      const action = current.current.view?.player.action;
      // Review confirmation can arm an exact early release without restoring a
      // pointer gesture. Every cancellation still withdraws that native release.
      const actionId =
        waiting?.actionId ?? (deliberate && action?.execution ? action.id : undefined);
      if (actionId)
        void current.current.command({
          id: `cancel:${actionId}`,
          label: 'Cancel attack',
          enabled: true,
          command: { type: 'cancel', expectedActionId: actionId },
        });
      return;
    }
    if (value.cancelled) return;
    value.cancelled = true;
    if (!value.source.profile) return;
    const native: CommandInput = {
      type: 'cancel',
      ...(value.actionId ? { expectedActionId: value.actionId } : {}),
      ...(!value.actionId
        ? {
            execution: {
              operation: 'cancel',
              inputEpoch: value.scope.inputEpoch,
              attackInputToken: value.scope.attackInputToken,
              gestureSequence: value.sequence,
              beginCommandId: value.request.commandId,
            },
          }
        : {}),
    };
    void current.current.command({
      id: `cancel:${value.request.commandId}`,
      label: 'Cancel attack',
      enabled: true,
      command: native,
    });
  }
  function disarm(cancelNative = true) {
    stopMovement();
    if (cancelNative) cancel();
    else {
      endAttempt();
      pendingRelease.current = undefined;
    }
  }
  function eligible(ignorePending = false) {
    const latest = current.current;
    return (
      !!latest.view &&
      latest.connected &&
      !latest.blocked &&
      !latest.view.clock.paused &&
      !!latest.view.access?.controlling &&
      latest.view.player.alive &&
      (ignorePending || !receiptRef.current.pending)
    );
  }
  async function commitRelease(value: Attempt) {
    if (
      attempt.current !== value ||
      value.cancelled ||
      !value.frozen ||
      !value.actionId ||
      !eligible(true)
    )
      return;
    const scope = liveScope.current;
    if (
      !scope ||
      scope.inputEpoch !== value.scope.inputEpoch ||
      scope.attackInputToken !== value.scope.attackInputToken
    ) {
      cancel();
      return;
    }
    const frozen = value.frozen;
    value.frozen = undefined;
    const native: CommandInput = {
      ...(value.source.kind === 'ranged'
        ? withAim({ type: 'release-shot', aimId: value.actionId }, frozen.aim, value.source)
        : { type: 'release-strike', expectedActionId: value.actionId }),
      execution: {
        operation: 'release',
        inputEpoch: scope.inputEpoch,
        attackInputToken: scope.attackInputToken,
        gestureSequence: value.sequence,
        beginCommandId: value.request.commandId,
        input: frozen.input,
      },
    };
    value.releaseRequested = true;
    publish(value, 'release-requested');
    const action: ActionOption = {
      id: `release:${value.actionId}`,
      label: 'Release attack',
      enabled: true,
      command: native,
    };
    const result = await receiptRef.current.dispatch(action);
    if (priorScope.current !== value.ownerKey) return;
    if (result.lethalReview && attempt.current === value && !value.cancelled) {
      reviewAttempt.current = value;
      disarm(false);
      acceptScope(result.inputScope);
      current.current.onReview(action, result.lethalReview);
      return;
    }
    acceptScope(result.inputScope);
    if (attempt.current !== value || value.cancelled) return;
    if (result.execution?.releaseRequested && result.ok) {
      pendingRelease.current = {
        scope,
        sequence: value.sequence,
        beginCommandId: value.request.commandId,
        actionId: value.actionId,
      };
    } else {
      endAttempt();
      if (!result.ok) setMessage(result.message);
    }
  }
  function showChallenge(value: Attempt) {
    const show = () => {
      if (attempt.current !== value || value.cancelled || value.frozen || !value.profile) return;
      const remaining = value.downAt + ATTACK_HOLD_MS - performance.now();
      // Browser timers may wake just before a fractional deadline. Recheck the
      // threshold so an early wake cannot leave the admitted control originless.
      if (remaining > 0) {
        window.setTimeout(show, Math.ceil(remaining));
        return;
      }
      publish(value, 'preparing');
    };
    window.setTimeout(
      show,
      Math.max(0, Math.ceil(value.downAt + ATTACK_HOLD_MS - performance.now())),
    );
  }
  function begin(aim: PhysicalAimPoint | null, screen: ScreenPoint, normal = false) {
    const latest = current.current;
    const source = latest.view?.player.attackSource,
      scope = liveScope.current;
    if (!eligible() || attempt.current || !source || !scope || !latest.view?.commandEpoch) return;
    if (!source.enabled) {
      setMessage(source.reason ?? 'This attack is unavailable.');
      return;
    }
    if (
      !aim ||
      aim.targetId === latest.view.player.id ||
      (source.kind === 'melee' ? !aim.targetId : !source.pointFire && !leadTarget(aim, source))
    ) {
      setMessage(
        source.kind === 'melee' || !source.pointFire
          ? 'Choose an opponent in view.'
          : 'Choose a visible place to aim.',
      );
      return;
    }
    point.current = { screen, aim };
    setReticle(screen);
    setMessage('');
    const request = { commandId: crypto.randomUUID(), commandEpoch: latest.view.commandEpoch };
    const native: CommandInput =
      source.kind === 'ranged'
        ? withAim(source.command, aim, source)
        : { ...source.command, targetId: aim.targetId, bodyReference: aim.bodyReference };
    const value: Attempt = {
      ownerKey: scopeKey,
      request,
      scope,
      sequence: ++sequence.current,
      source,
      command: native,
      downAt: performance.now(),
    };
    attempt.current = value;
    setHasLiveAttempt(true);
    if (!source.profile) {
      if (normal) release(aim, screen, true);
      return;
    }
    publish(value, 'pending');
    native.execution = {
      operation: 'begin',
      inputEpoch: scope.inputEpoch,
      attackInputToken: scope.attackInputToken,
      gestureSequence: value.sequence,
    };
    const action: ActionOption = {
      id: `prepare:${request.commandId}`,
      label: 'Prepare attack',
      enabled: true,
      command: native,
    };
    void receiptRef.current.dispatch(action, undefined, request).then((result) => {
      if (priorScope.current !== value.ownerKey) return;
      if (result.lethalReview && attempt.current === value && !value.cancelled) {
        reviewAttempt.current = value;
        disarm(false);
        acceptScope(result.inputScope);
        current.current.onReview(action, result.lethalReview);
        return;
      }
      acceptScope(result.inputScope);
      if (attempt.current !== value || value.cancelled) {
        if (
          result.ok &&
          result.actionId &&
          current.current.view?.player.id === latest.view?.player.id
        )
          void current.current.command({
            id: `cancel:${result.actionId}`,
            label: 'Cancel attack',
            enabled: true,
            command: { type: 'cancel', expectedActionId: result.actionId },
          });
        return;
      }
      if (!result.ok || !result.actionId) {
        endAttempt();
        setMessage(result.message);
        return;
      }
      value.actionId = result.actionId;
      value.profile = result.execution?.profile;
      if (value.frozen) void commitRelease(value);
      else showChallenge(value);
    });
    if (normal) release(aim, screen, true);
  }
  function release(aim: PhysicalAimPoint | null, screen: ScreenPoint, ordinary = false) {
    const value = attempt.current;
    if (!value || value.cancelled) return;
    if (!aim || aim.targetId === current.current.view?.player.id) {
      cancel();
      setMessage('No visible aim point.');
      return;
    }
    // The strike was prepared against one opponent. A different release point
    // must not silently attack that earlier subject.
    if (value.source.kind === 'melee' && aim.targetId !== value.command.targetId) {
      if (!value.source.profile) endAttempt();
      return;
    }
    if (
      value.source.kind === 'ranged' &&
      !value.source.pointFire &&
      !leadTarget(aim, value.source)
    ) {
      cancel();
      setMessage('Choose an opponent in view.');
      return;
    }
    point.current = { screen, aim };
    setReticle(screen);
    if (!value.source.profile) {
      endAttempt();
      void receiptRef.current.dispatch(
        {
          id: `attack:${value.request.commandId}`,
          label: value.source.label,
          enabled: true,
          command:
            value.source.kind === 'ranged'
              ? withAim(value.command, aim, value.source)
              : value.command,
        },
        undefined,
        value.request,
      );
      return;
    }
    const timed =
      !ordinary &&
      value.phaseOrigin !== undefined &&
      value.profile !== undefined &&
      performance.now() - value.downAt >= ATTACK_HOLD_MS;
    const input: TimedReleaseInput =
      timed && value.profile
        ? {
            kind: 'timed-release',
            phase: timingPhase(value.phaseOrigin!, performance.now(), value.profile.periodSeconds),
          }
        : { kind: 'ordinary' };
    value.frozen = { aim, input };
    if (value.actionId) void commitRelease(value);
  }
  useLayoutEffect(() => {
    const value = attempt.current;
    if (
      value &&
      presentation?.id === value.request.commandId &&
      presentation.profile &&
      value.phaseOrigin === undefined &&
      performance.now() - value.downAt >= ATTACK_HOLD_MS
    ) {
      value.phaseOrigin = performance.now();
      publish(value, 'preparing');
    }
  }, [presentation]);
  useEffect(() => {
    if (priorScope.current !== scopeKey) {
      disarm();
      sequence.current = 0;
      renewal.current = 0;
      liveScope.current = view?.player.inputScope;
      setMode(false);
      setReticle(undefined);
      point.current = { aim: null };
      priorScope.current = scopeKey;
    } else acceptScope(view?.player.inputScope);
  }, [scopeKey, view?.player.inputScope]);
  useEffect(() => {
    if (!connected || blocked || view?.clock.paused || !view?.access?.controlling)
      disarm(!ownReview);
  }, [connected, blocked, view?.clock.paused, view?.access?.controlling, ownReview]);
  useEffect(() => {
    if (!connected) {
      notice.current = undefined;
      return;
    }
    const event = view?.player.attackModeNotice;
    const noticeScope = JSON.stringify([scopeKey, view?.player.inputScope?.inputEpoch]);
    if (notice.current?.scope !== noticeScope) {
      notice.current = { scope: noticeScope, sequence: event?.noticeSequence ?? 0 };
      return;
    }
    if (event && event.noticeSequence > notice.current.sequence) {
      notice.current.sequence = event.noticeSequence;
      setMode(true);
    }
  }, [scopeKey, connected, view?.player.inputScope?.inputEpoch, view?.player.attackModeNotice]);
  const functions = useRef({ cancel, disarm, begin, release, input, stopMovement });
  functions.current = { cancel, disarm, begin, release, input, stopMovement };
  useEffect(() => {
    const steer = () => {
      const latest = current.current,
        scope = liveScope.current;
      if (
        inputPending.current ||
        !keys.current.size ||
        !scope ||
        !latest.connected ||
        latest.blocked ||
        latest.view?.clock.paused ||
        !latest.view?.access?.controlling ||
        !latest.view?.player.alive
      )
        return;
      const direction = movementDirection(keys.current, movementYaw.current);
      const previous = movement.current;
      if (
        previous &&
        Math.abs(previous.direction.x - direction.x) < 1e-10 &&
        Math.abs(previous.direction.z - direction.z) < 1e-10
      )
        return;
      const next = { sequence: ++movementSequence.current, scope, direction };
      movement.current = next;
      void functions.current.input({
        kind: 'steer',
        inputEpoch: scope.inputEpoch,
        movementInputToken: scope.movementInputToken,
        movementSequence: next.sequence,
        direction,
      });
    };
    const down = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !uiOwnsShortcut(event) &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (attempt.current || pendingRelease.current)
      ) {
        event.preventDefault();
        functions.current.disarm();
        return;
      }
      const latest = current.current;
      if (
        uiOwnsShortcut(event) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        latest.blocked ||
        !latest.connected ||
        latest.view?.clock.paused ||
        !latest.view?.access?.controlling ||
        !latest.view?.player.alive
      ) {
        if (keys.current.size) functions.current.stopMovement();
        return;
      }
      const key = movementKey(event.code, latest.preferences);
      if (!key) return;
      event.preventDefault();
      if (event.repeat) return;
      keys.current.add(key);
      movementYaw.current = latest.scene.current?.cameraState().yaw ?? 0;
      steer();
    };
    const up = (event: KeyboardEvent) => {
      const key = movementKey(event.code, current.current.preferences);
      if (!key || !keys.current.delete(key)) return;
      if (!keys.current.size) functions.current.stopMovement();
      else {
        movement.current = undefined;
        movementYaw.current = current.current.scene.current?.cameraState().yaw ?? 0;
        steer();
      }
    };
    const blur = () => functions.current.disarm();
    const focus = (event: FocusEvent) => {
      // These controls belong to this gesture. Focus stops walking while
      // preserving preparation for an explicit Release or Cancel.
      if (event.target instanceof Element && event.target.closest('.ol-attack-controls')) {
        functions.current.stopMovement();
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="listbox"],[role="menu"]',
        )
      )
        functions.current.disarm(!current.current.ownReview);
    };
    const observer = new MutationObserver(() => {
      if (modalOwnsInput()) functions.current.disarm(!current.current.ownReview);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    let timer: number;
    const pulse = () => {
      steer();
      const scope = liveScope.current;
      if (scope) {
        const moving = movement.current,
          releasing = pendingRelease.current;
        if (moving || releasing)
          void functions.current.input({
            kind: 'renew',
            inputEpoch: scope.inputEpoch,
            renewalSequence: ++renewal.current,
            ...(moving
              ? {
                  movement: {
                    movementInputToken: moving.scope.movementInputToken,
                    movementSequence: moving.sequence,
                  },
                }
              : {}),
            ...(releasing
              ? {
                  pendingRelease: {
                    attackInputToken: releasing.scope.attackInputToken,
                    gestureSequence: releasing.sequence,
                    beginCommandId: releasing.beginCommandId,
                    actionId: releasing.actionId,
                  },
                }
              : {}),
          });
      }
      timer = window.setTimeout(pulse, scope?.renewalIntervalMs ?? 100);
    };
    timer = window.setTimeout(pulse, 100);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('focusin', focus);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('focusin', focus);
      blur();
    };
  }, []);
  const pointer: AttackPointerControls = {
    begin: (aim, screen) => {
      const prepared = attempt.current;
      if (prepared) {
        if (!eligible() || !prepared.actionId || prepared.cancelled || releaseFrozen())
          return false;
        const self = aim?.targetId === current.current.view?.player.id;
        // Reuse the preparation; this press chooses its final aim only on up.
        pointer.move(aim, screen, self);
        return true;
      }
      begin(aim, screen);
      return !!attempt.current;
    },
    move: (aim, screen, self) => {
      point.current = { aim, screen };
      if (self) cancel();
    },
    release: (aim, screen) => release(aim, screen),
    cancel,
  };
  useEffect(() => {
    scene.current?.setAttackInput(mode && connected && !blocked ? pointer : null);
    return () => scene.current?.setAttackInput(null);
  }, [mode, connected, blocked, scene.current]);
  function releaseFrozen() {
    return !!(
      pendingRelease.current ||
      attempt.current?.frozen ||
      attempt.current?.releaseRequested
    );
  }
  function selectSubject(entity: EntityView) {
    if (releaseFrozen()) return;
    const screen = scene.current?.aimScreenPosition(entity.id);
    if (!screen) return;
    point.current = { screen, aim: scene.current?.aimAt(screen) ?? null };
    setReticle(screen);
  }
  function aimAtCursor() {
    const screen = point.current.screen;
    if (!screen) return;
    const sampled = { screen, aim: scene.current?.aimAt(screen) ?? null };
    point.current = sampled;
    return sampled;
  }
  function recoveredRelease() {
    const latest = current.current,
      action = latest.view?.player.action,
      p = aimAtCursor();
    if (!action?.execution || receiptRef.current.pending || !p) return;
    const release = action.controls?.find((choice) =>
      ['release-shot', 'release-strike'].includes(choice.command.type),
    );
    if (!release) return;
    const aim = p.aim;
    if (release.command.type === 'release-shot' && !aim) {
      setMessage('Choose a visible place to aim.');
      return;
    }
    void receiptRef.current.dispatch({
      ...release,
      command:
        release.command.type === 'release-shot' &&
        aim &&
        latest.view?.player.attackSource?.kind === 'ranged'
          ? withAim(release.command, aim, latest.view.player.attackSource)
          : release.command,
    });
  }
  const profile = presentation?.profile ?? view?.player.action?.execution?.profile;
  return {
    mode,
    presentation,
    message: receipt.pending ? receipt.message : message || receipt.message,
    point,
    reticle,
    pending: receipt.pending,
    hasLiveAttempt,
    liveReleaseRequested: !!pendingRelease.current || presentation?.status === 'release-requested',
    check: receipt.check,
    profile,
    toggle() {
      if (mode) {
        disarm();
        if (notice.current)
          notice.current.sequence = Math.max(
            notice.current.sequence,
            current.current.view?.player.attackModeNotice?.noticeSequence ?? 0,
          );
      }
      setMode(!mode);
    },
    cancel: () => cancel(true),
    disarm,
    selectSubject,
    prepare() {
      const p = point.current;
      if (p.screen) begin(p.aim, p.screen);
      else setMessage('Choose a subject from In view, or aim in the world.');
    },
    attackNormally() {
      if (!attempt.current && current.current.view?.player.action?.execution) {
        recoveredRelease();
        return;
      }
      const p = aimAtCursor();
      if (!p) return;
      const aim = p.aim;
      if (attempt.current) release(aim, p.screen, true);
      else begin(aim, p.screen, true);
    },
    release() {
      if (!attempt.current) recoveredRelease();
      else {
        const p = aimAtCursor();
        if (p) release(p.aim, p.screen);
      }
    },
    cancelReview(reviewId: string) {
      const original = reviewAttempt.current;
      if (original) original.cancelled = true;
      reviewAttempt.current = undefined;
      disarm(false);
      void current.current.command({
        id: `cancel-review:${reviewId}`,
        label: 'Cancel attack',
        enabled: true,
        command: {
          type: 'cancel',
          lethalReviewId: reviewId,
          ...(original?.actionId ? { expectedActionId: original.actionId } : {}),
        },
      });
    },
    async confirmReview(action: ActionOption, reviewId: string): Promise<ApiResult> {
      const scope = liveScope.current;
      if (!scope)
        return {
          ok: false,
          code: 'unavailable',
          message: 'Resume current control before confirming.',
        };
      const original = reviewAttempt.current;
      const confirmedSequence = ++sequence.current;
      if (original) original.sequence = confirmedSequence;
      const result = await receiptRef.current.dispatch({
        ...action,
        command: {
          ...action.command,
          lethalReviewId: reviewId,
          execution: {
            operation: 'confirm-review',
            inputEpoch: scope.inputEpoch,
            attackInputToken: scope.attackInputToken,
            gestureSequence: confirmedSequence,
          },
        },
      });
      if (priorScope.current !== scopeKey) return result;
      acceptScope(result.inputScope);
      if (result.lethalReview && original && !original.cancelled)
        current.current.onReview(action, result.lethalReview);
      if (
        result.ok &&
        original &&
        !original.cancelled &&
        current.current.view?.player.id === view?.player.id
      ) {
        const actionId = result.actionId ?? original.actionId;
        if (action.command.execution?.operation === 'begin' && actionId && result.execution) {
          const fresh: Attempt = {
            ...original,
            ownerKey: scopeKey,
            scope: liveScope.current ?? scope,
            sequence: confirmedSequence,
            downAt: performance.now() - ATTACK_HOLD_MS,
            phaseOrigin: undefined,
            frozen: undefined,
            releaseRequested: undefined,
            actionId,
            profile: result.execution.profile,
          };
          attempt.current = fresh;
          setHasLiveAttempt(true);
          showChallenge(fresh);
        } else if (result.execution?.releaseRequested && actionId) {
          pendingRelease.current = {
            scope: liveScope.current ?? scope,
            sequence: confirmedSequence,
            beginCommandId: original.request.commandId,
            actionId,
          };
        }
      }
      if (!result.lethalReview) reviewAttempt.current = undefined;
      return result;
    },
  };
}
