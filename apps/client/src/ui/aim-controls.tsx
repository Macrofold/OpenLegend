import type { ActionOption, GameView } from '@open-legend/protocol';
import { Button } from '../design-system/components';

/** The same exact controls move into a covering sheet's reserved footer.
 * A conversation never hides the player's way to end a prepared attack. */
export function AimControls({
  action,
  connected,
  controlling,
  command,
}: {
  action: NonNullable<GameView['player']['action']>;
  connected: boolean;
  controlling: boolean;
  command(choice: ActionOption): void;
}) {
  return (
    <div className="ol-combat-controls" role="region" aria-label={action.label}>
      <p className="ol-caption">{action.label}</p>
      <div className="ol-combat-buttons">
        {action.controls?.map((choice) => (
          <Button
            key={choice.id}
            size="sm"
            variant={choice.command.type === 'release-shot' ? 'primary' : 'secondary'}
            disabled={!connected || !choice.enabled || !controlling}
            onPress={() => command(choice)}
          >
            {choice.label}
          </Button>
        ))}
      </div>
      {action.controls
        ?.filter((choice) => !choice.enabled && choice.reason)
        .map((choice) => (
          <p key={choice.id} className="ol-caption">
            {choice.reason}
          </p>
        ))}
      <details>
        <summary>Details</summary>
        <p className="ol-caption">{action.detail}</p>
      </details>
    </div>
  );
}
