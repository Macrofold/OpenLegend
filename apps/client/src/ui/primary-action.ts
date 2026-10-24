import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  ActionCatalogue,
  CatalogueAction,
  EntityView,
  GameView,
  PrimaryActionSelection,
} from '@open-legend/protocol';
import { post } from '../api';
import { useLoadingStatus } from '../design-system/loading';
import { actionSubjectKey, playerActionStatusKey } from '../action-browser';

function actionScope(view: GameView | null): string {
  return view
    ? JSON.stringify([
        view.worldId,
        view.saveTimeline,
        view.player.id,
        view.player.life,
        view.player.alive,
        view.access?.scope,
      ])
    : '';
}
function meaningKey(view: GameView | null, target: EntityView | null): string {
  return view && target
    ? JSON.stringify([
        actionScope(view),
        target.id,
        target.bodyReference,
        target.contextActionRevision,
        actionSubjectKey(target),
        target.canTalk,
        target.bodyState,
        target.status,
        view.player.inventoryRevision,
        view.player.equippedTargetItem?.id,
        view.player.action?.id,
        playerActionStatusKey(view.player),
        view.clock.paused,
        view.access?.controlling,
      ])
    : '';
}
type Preview = {
  key: string;
  targetId: string;
  status: 'pending' | 'ready' | 'failed';
  action?: CatalogueAction;
  selection?: PrimaryActionSelection;
  message?: string;
};
type Gesture = {
  id: string;
  key: string;
  scope: string;
  targetId: string;
  bodyReference?: string;
  action: CatalogueAction;
  selection: PrimaryActionSelection;
};

/** One deliberate hovered target owns one read. Moving frames never prepare an
 * action catalogue; current native preference/possession changes invalidate it.
 * A pending read cannot become a delayed click. */
export function usePrimaryAction(
  view: GameView | null,
  connected: boolean,
  target: EntityView | null,
  run: (action: CatalogueAction) => void,
  notify: (message: string) => void,
) {
  const current = useRef({ view, connected, run, notify });
  current.current = { view, connected, run, notify };
  const [preview, setPreview] = useState<Preview | null>(null),
    [refresh, setRefresh] = useState(0);
  const ready = useRef<Preview | null>(null),
    gesture = useRef<Gesture | null>(null);
  const scope = actionScope(view),
    key = connected ? meaningKey(view, target) : '';
  useEffect(() => {
    gesture.current = null;
    return () => {
      gesture.current = null;
    };
  }, [scope, connected]);
  useEffect(() => {
    ready.current = null;
    if (!key || !target) {
      setPreview(null);
      return;
    }
    const controller = new AbortController(),
      targetId = target.id;
    setPreview({ key, targetId, status: 'pending' });
    void post<{ ok: boolean; message?: string; catalogue: ActionCatalogue }>(
      '/api/actions',
      { targetId },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        const latest = current.current,
          actual = latest.view?.entities.find((entity) => entity.id === targetId);
        if (!latest.connected || !actual || meaningKey(latest.view, actual) !== key) return;
        const action = result.catalogue?.actions.find(
            (entry) => entry.id === result.catalogue.defaultActionId,
          ),
          selection = result.catalogue?.primaryAction;
        const next: Preview =
          result.ok && action && selection
            ? { key, targetId, status: 'ready', action, selection }
            : {
                key,
                targetId,
                status: 'failed',
                message: result.message ?? 'There is no primary action for this object.',
              };
        setPreview(next);
      })
      .catch((error) => {
        if (controller.signal.aborted || actionScope(current.current.view) !== scope) return;
        const next: Preview = { key, targetId, status: 'failed', message: String(error) };
        setPreview(next);
      });
    return () => controller.abort();
  }, [key, refresh]);
  const displayed = preview?.key === key ? preview : null;
  // Capture only the choice committed to the rendered preview, not a response
  // which arrived just before React published its label and consequence facts.
  useLayoutEffect(() => {
    ready.current = displayed;
  }, [displayed]);
  const showLoading = useLoadingStatus(
    displayed?.status === 'pending',
    'Checking contextual action',
  );
  return {
    preview: displayed
      ? {
          targetId: displayed.targetId,
          label: displayed.action?.label ?? (showLoading ? 'Checking action…' : ''),
          facts: displayed.action?.facts,
          reason: displayed.action?.reason ?? displayed.message,
          enabled: displayed.status === 'ready' && !!displayed.action?.enabled,
        }
      : null,
    begin(entity: EntityView): string | null {
      gesture.current = null;
      const latest = current.current,
        actual = latest.view?.entities.find((entry) => entry.id === entity.id),
        prepared = ready.current;
      if (!latest.connected || latest.view?.access?.controlling === false) {
        latest.notify('Resume control here to act.');
        return null;
      }
      if (!actual || actual.bodyReference !== entity.bodyReference) {
        latest.notify('That object changed. Choose it again.');
        return null;
      }
      if (
        !prepared ||
        prepared.key !== meaningKey(latest.view, actual) ||
        prepared.status !== 'ready' ||
        !prepared.action ||
        !prepared.selection
      ) {
        latest.notify(prepared?.message ?? 'Wait for the displayed action before clicking.');
        setRefresh((value) => value + 1);
        return null;
      }
      if (!prepared.action.enabled) {
        latest.notify(prepared.action.reason ?? 'This action is unavailable now.');
        return null;
      }
      const id = crypto.randomUUID();
      gesture.current = {
        id,
        key: prepared.key,
        scope: actionScope(latest.view),
        targetId: actual.id,
        bodyReference: actual.bodyReference,
        action: structuredClone(prepared.action),
        selection: { ...prepared.selection },
      };
      return id;
    },
    commit(id: string, entity: EntityView): void {
      const captured = gesture.current;
      gesture.current = null;
      const latest = current.current,
        actual = latest.view?.entities.find((entry) => entry.id === captured?.targetId);
      if (!captured || captured.id !== id) return;
      setRefresh((value) => value + 1);
      if (
        !latest.connected ||
        latest.view?.access?.controlling === false ||
        actionScope(latest.view) !== captured.scope ||
        !actual ||
        entity.id !== captured.targetId ||
        actual.bodyReference !== captured.bodyReference ||
        entity.bodyReference !== captured.bodyReference ||
        meaningKey(latest.view, actual) !== captured.key
      ) {
        latest.notify('That displayed action changed. Choose it again.');
        return;
      }
      const action = captured.action;
      if (action.intent.kind === 'command')
        latest.run({
          ...action,
          intent: {
            ...action.intent,
            command: { ...action.intent.command, primaryAction: captured.selection },
          },
        });
      else if (action.intent.kind === 'compose')
        latest.run({
          ...action,
          intent: {
            ...action.intent,
            ...(action.intent.preference
              ? { preference: { ...action.intent.preference, primaryAction: captured.selection } }
              : {}),
          },
        });
      else latest.run(action);
    },
    cancel(): void {
      gesture.current = null;
    },
  };
}
