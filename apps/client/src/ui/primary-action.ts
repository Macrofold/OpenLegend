import { useEffect, useRef } from 'react';
import type { ActionCatalogue, CatalogueAction, EntityView, GameView } from '@open-legend/protocol';
import { post } from '../api';

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

/** Resolve once per intentional click, through the same world-owned catalogue as
 * the menu. A changed reader, target or newer click invalidates the pending choice. */
export function usePrimaryAction(
  view: GameView | null,
  connected: boolean,
  run: (action: CatalogueAction) => void,
  notify: (message: string) => void,
) {
  const pending = useRef<AbortController | null>(null);
  const current = useRef({ view, connected, run, notify });
  current.current = { view, connected, run, notify };
  const scope = actionScope(view);
  useEffect(() => () => pending.current?.abort(), [scope, connected]);
  return async (entity: EntityView) => {
    pending.current?.abort();
    if (!view || !connected) return;
    if (view.access?.controlling === false) {
      notify('Resume control here to act.');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    try {
      const result = await post<{ ok: boolean; message?: string; catalogue: ActionCatalogue }>(
        '/api/actions',
        { targetId: entity.id },
        controller.signal,
      );
      const latest = current.current;
      if (
        controller.signal.aborted ||
        !latest.connected ||
        actionScope(latest.view) !== scope ||
        latest.view?.access?.controlling === false
      )
        return;
      const target = latest.view?.entities.find((candidate) => candidate.id === entity.id);
      if (!latest.view || !target) return;
      // A body can die and return under the same entity ID during this read.
      // Ordinary injury or healing must not invalidate the intended recipient.
      if (entity.bodyReference !== undefined && target.bodyReference !== entity.bodyReference)
        return latest.notify('That character changed while checking actions. Choose it again.');
      if (!result.ok)
        return current.current.notify(result.message ?? 'Unable to read these actions.');
      const action = result.catalogue.actions.find(
        (entry) => entry.id === result.catalogue.defaultActionId,
      );
      if (!action) return current.current.notify('There is no primary action for this object.');
      if (!action.enabled)
        return current.current.notify(action.reason ?? 'This action is unavailable now.');
      // The catalogue owns pause eligibility. Only reject a mutation selected
      // before a new pause; opening a composer is still a read-only interaction.
      if (action.intent.kind !== 'compose' && !view.clock.paused && latest.view.clock.paused)
        return current.current.notify('The world paused before this action could start.');
      current.current.run(
        action.intent.kind === 'command'
          ? {
              ...action,
              intent: {
                ...action.intent,
                command: {
                  ...action.intent.command,
                  primaryAction: { targetId: entity.id, actionId: action.id },
                },
              },
            }
          : action,
      );
    } catch (error) {
      if (
        !controller.signal.aborted &&
        current.current.connected &&
        actionScope(current.current.view) === scope
      )
        current.current.notify(String(error));
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  };
}
