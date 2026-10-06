import { useState } from 'react';
import type { ActionOption, GameView } from '@open-legend/protocol';
import { Button } from '../design-system/components';
import './death-notice.css';

export function DeathNotice({
  view,
  command,
}: {
  view: GameView;
  command(action: ActionOption): Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const death = view.player.death;
  const continuation = view.player.actions.find((action) => action.command.type === 'respawn');
  if (!death || !continuation) return null;
  return (
    <aside className="ol-root ol-card ol-death-notice" aria-label="Lost life">
      <p role="status">{death.message}</p>
      <p className="ol-caption">
        {death.retainedLabel}:{' '}
        {death.retained.map((item) => `${item.quantity} ${item.name}`).join(', ') || '—'}
      </p>
      <p className="ol-caption">
        {death.lostLabel}:{' '}
        {death.left.map((item) => `${item.quantity} ${item.name}`).join(', ') || '—'}
      </p>
      <Button
        variant="primary"
        busy={busy}
        isDisabled={!continuation.enabled}
        onPress={() => {
          if (busy || !continuation.enabled) return;
          setBusy(true);
          void command(continuation).finally(() => setBusy(false));
        }}
      >
        {continuation.label}
      </Button>
      {!continuation.enabled && <p className="ol-caption">{continuation.reason}</p>}
    </aside>
  );
}
