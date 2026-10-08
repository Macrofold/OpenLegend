import type { ActionOption, GameView } from '@open-legend/protocol';
import { Button, Section, Tag } from '../design-system/components';

/** The participant's current agreement, alongside ordinary work; never a party tracker. */
export function OutingStatus({
  view,
  connected,
  command,
}: {
  view: GameView;
  connected: boolean;
  command(action: ActionOption): void;
}) {
  if (!view.player.outings.length) return null;
  return (
    <Section title="Outings">
      {view.player.outings.map((trip) => (
        <div key={trip.id} className="ol-camp-activities">
          <p>
            <Tag>{trip.status}</Tag> <strong>{trip.destination}</strong> ·{' '}
            {trip.distance.toFixed(1)} m away
          </p>
          <p>
            With {trip.companion}. {trip.company}.
          </p>
          {trip.purpose && <p>Stated purpose: “{trip.purpose}”</p>}
          <p className="ol-caption">{trip.description}</p>
          {trip.choices.map((choice) => (
            <Button
              key={choice.id}
              disabled={!connected || view.access?.controlling === false}
              onPress={() =>
                command({
                  id: choice.id,
                  label: choice.label,
                  command: choice.command,
                  enabled: true,
                })
              }
            >
              {choice.label}
            </Button>
          ))}
        </div>
      ))}
    </Section>
  );
}
