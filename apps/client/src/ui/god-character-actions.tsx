import { useState } from 'react';
import type { EntityView } from '@open-legend/protocol';
import { Button, Section } from '../design-system/components';

/** Shared visibility for character panels and context menus; the server still authorizes effects. */
export function godCharacterAvailability(entity: EntityView) {
  return {
    revive: entity.bodyRevision !== undefined && entity.status === 'Dead',
    enableCognition: entity.kind === 'animal' && !entity.speechCapable && entity.status !== 'Dead',
  };
}
export interface GodCharacterControls {
  revive(entity: EntityView): Promise<void>;
  enableCognition(entity: EntityView): Promise<void>;
  editPerson?(): void;
  inspectMind?(): void;
  editFamily?(): void;
  familyLabel?: string;
}
export function GodCharacterActions({
  entity,
  connected,
  controls,
}: {
  entity: EntityView;
  connected: boolean;
  controls: GodCharacterControls;
}) {
  const [busy, setBusy] = useState(false);
  const available = godCharacterAvailability(entity);
  if (
    !available.revive &&
    !available.enableCognition &&
    !controls.editPerson &&
    !controls.editFamily &&
    !controls.inspectMind
  )
    return null;
  const run = async (action: (entity: EntityView) => Promise<void>) => {
    setBusy(true);
    try {
      await action(entity);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title="God mode">
      <p className="ol-caption">
        Creator tools for {entity.name}. Direct changes here are separate from your character’s
        actions and knowledge.
      </p>
      {!connected && (
        <p className="ol-caption" role="status">
          Reconnect to use these creator tools.
        </p>
      )}
      <div className="ol-actions">
        {available.revive && (
          <Button
            icon="ui.star"
            disabled={!connected || busy}
            onPress={() => void run(controls.revive)}
          >
            Revive
          </Button>
        )}
        {available.enableCognition && (
          <Button
            icon="ui.star"
            disabled={!connected || busy}
            onPress={() => void run(controls.enableCognition)}
          >
            Grant cognition and speech
          </Button>
        )}
        {controls.editPerson && (
          <Button
            variant="quiet"
            size="sm"
            disabled={!connected || busy}
            onPress={controls.editPerson}
          >
            Edit Person
          </Button>
        )}
        {controls.editFamily && (
          <Button
            variant="quiet"
            size="sm"
            disabled={!connected || busy}
            onPress={controls.editFamily}
          >
            {controls.familyLabel}
          </Button>
        )}
        {controls.inspectMind && (
          <Button
            variant="quiet"
            size="sm"
            disabled={!connected || busy}
            onPress={controls.inspectMind}
          >
            Inspect private mind
          </Button>
        )}
      </div>
    </Section>
  );
}
