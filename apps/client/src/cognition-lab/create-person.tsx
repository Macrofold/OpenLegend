import { useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { postPrivateRead } from '../api';
import { PersonCreationModal } from '../ui/god-tools';
import { CreationRecoveryModal, useCreationRequest } from '../ui/creation-request';

type Trait = { id: string; name: string; description: string };

export function CreatePerson({
  view,
  current,
  refresh,
}: {
  view: GameView;
  current: boolean;
  refresh(): void;
}) {
  const [traits, setTraits] = useState<Trait[]>();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [point, setPoint] = useState({
    ...view.player.position,
    surfaceId: view.player.supportSurfaceId ?? '',
  });
  const creator = !!view.access?.canEditPersonMemory;
  const control = creator && current && !!view.access?.controlling;
  const creation = useCreationRequest(view, current, { enabled: creator, traits });
  async function open() {
    setMessage('');
    try {
      const options = await postPrivateRead<{
        ok: boolean;
        canCreatePerson: boolean;
        traitOptions: Trait[];
        message?: string;
      }>('/api/god/editor/person', { actorId: view.player.id });
      if (!options.ok || !options.canCreatePerson)
        throw new Error(options.message || 'This world has no character creation template.');
      setTraits(options.traitOptions);
      if (creation.openEntry()) {
        setPoint({
          ...view.player.position,
          x: view.player.position.x + 2,
          surfaceId: view.player.supportSurfaceId ?? '',
        });
        setEditing(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Character creation is unavailable.');
    }
  }
  if (!creator) return null;
  return (
    <div>
      <button disabled={!control} onClick={() => void open()}>
        Add character
      </button>
      {message && <span role="status">{message}</span>}
      {editing && traits && (
        <PersonCreationModal
          position={point}
          positionEditor={
            <fieldset>
              <legend>Starting position</legend>
              {(['x', 'y', 'z'] as const).map((axis) => (
                <label key={axis}>
                  {axis.toUpperCase()}{' '}
                  <input
                    required
                    type="number"
                    step="any"
                    value={Number.isFinite(point[axis]) ? point[axis] : ''}
                    onChange={(e) => setPoint({ ...point, [axis]: e.target.valueAsNumber })}
                  />
                </label>
              ))}
              <label>
                Surface{' '}
                <input
                  required
                  value={point.surfaceId}
                  onChange={(e) => setPoint({ ...point, surfaceId: e.target.value })}
                />
              </label>
            </fieldset>
          }
          traits={traits}
          appearanceFamilies={view.godTools?.appearanceFamilies ?? []}
          outfitOptions={view.godTools?.outfitOptions}
          enabled={control && creation.enabled}
          close={() => {
            setEditing(false);
          }}
          create={async (person) => {
            const result = await creation.create({
              kind: 'person',
              body: { position: point, ...person },
              label: `Create ${person.name}`,
              destinationLabel: `At ${point.x}, ${point.y}, ${point.z}.`,
            });
            if (result?.ok) {
              setMessage(result.message);
              refresh();
            }
            return result;
          }}
        />
      )}
      {traits && creation.visible && (
        <CreationRecoveryModal
          recovery={creation}
          close={creation.hide}
          resolved={(result) => {
            setMessage(result.message);
            creation.hide();
            refresh();
          }}
        />
      )}
    </div>
  );
}
