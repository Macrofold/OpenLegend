import { useEffect, useState } from 'react';
import type { ApiResult, GameView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section } from '../design-system/components';

export function InventionSettings({ view }: { view: GameView }) {
  const [editing, setEditing] = useState<{
    generation: string;
    revision: number;
    playerLocked: boolean;
    agentLocked: boolean;
  }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!view.godMode) return;
    let active = true;
    setEditing(undefined);
    void post<ApiResult & { generation: string; policy: GameView['inventionPolicy'] }>(
      '/api/god/invention-policy',
      {},
    )
      .then((result) => {
        if (active && result.ok)
          setEditing({
            generation: result.generation,
            revision: result.policy.revision,
            playerLocked: result.policy.playerLocked,
            agentLocked: result.policy.agentLocked,
          });
      })
      .catch((error) => {
        if (active) setMessage(String(error));
      });
    return () => {
      active = false;
    };
  }, [view.godMode, view.worldId, view.saveTimeline, view.inventionPolicy.revision]);
  async function save() {
    if (!editing || busy) return;
    setBusy(true);
    try {
      const result = await post('/api/god/invention-policy/save', {
        expectedGeneration: editing.generation,
        expectedRevision: editing.revision,
        playerLocked: editing.playerLocked,
        agentLocked: editing.agentLocked,
      });
      setMessage(result.message);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section title="Invention permissions">
      <p>Existing actions, crafts and learning remain available when invention is locked.</p>
      <label>
        <input
          type="checkbox"
          checked={editing?.playerLocked ?? view.inventionPolicy.playerLocked}
          disabled={!view.godMode || !editing || busy}
          onChange={(event) =>
            setEditing(editing ? { ...editing, playerLocked: event.target.checked } : undefined)
          }
        />{' '}
        Player invention lock
      </label>
      <label>
        <input
          type="checkbox"
          checked={editing?.agentLocked ?? view.inventionPolicy.agentLocked}
          disabled={!view.godMode || !editing || busy}
          onChange={(event) =>
            setEditing(editing ? { ...editing, agentLocked: event.target.checked } : undefined)
          }
        />{' '}
        Agent invention lock
      </label>
      <p className="ol-caption">
        Unlocked agents may propose supported techniques privately. Construction remains a separate
        decision.
      </p>
      {view.godMode && (
        <Button
          onPress={() => void save()}
          isDisabled={
            !editing ||
            busy ||
            (editing.playerLocked === view.inventionPolicy.playerLocked &&
              editing.agentLocked === view.inventionPolicy.agentLocked)
          }
        >
          Save invention settings
        </Button>
      )}
      {message && <p role="status">{message}</p>}
    </Section>
  );
}
