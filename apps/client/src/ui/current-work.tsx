import { useState } from 'react';
import { Focusable } from 'react-aria-components';
import type { GameView } from '@open-legend/protocol';
import { Button, Icon, IconButton, TextTooltip } from '../design-system/components';

export function CurrentWork({ player, review }: { player: GameView['player']; review(): void }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!player.hasWork) return null;
  const label = player.action?.label ?? player.activity?.name ?? 'Work is waiting';
  const heading = `Current work: ${label}`;
  return (
    <section className="ol-current-work" aria-label="Current work">
      <header className="ol-current-work-head">
        <TextTooltip text={heading}>
          {player.activity?.reason ? (
            <Button
              variant="quiet"
              size="sm"
              aria-label={heading}
              aria-expanded={!collapsed}
              onPress={() => setCollapsed(!collapsed)}
            >
              <span className="ol-current-work-title">{heading}</span>
              <span className="ol-work-disclosure" data-collapsed={collapsed}>
                <Icon name="ui.next" size={16} />
              </span>
            </Button>
          ) : (
            <Focusable>
              <span className="ol-current-work-title ol-current-work-label">{heading}</span>
            </Focusable>
          )}
        </TextTooltip>
        <TextTooltip text="Review current work">
          <IconButton icon="ui.inview" label="Review current work" onPress={review} />
        </TextTooltip>
      </header>
      {player.activity?.reason && (
        <div className="ol-current-work-body" hidden={collapsed}>
          <p className="ol-caption">{player.activity.reason}</p>
        </div>
      )}
    </section>
  );
}
