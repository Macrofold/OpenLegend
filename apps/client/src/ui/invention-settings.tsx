import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult, GameView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section } from '../design-system/components';
import './lifecycle.css';

type PolicyDraft = {
  generation: string;
  revision: number;
  playerLocked: boolean;
  agentLocked: boolean;
};

export function InventionSettings({ view }: { view: GameView }) {
  const [editing, setEditing] = useState<PolicyDraft>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);
  const load = useCallback(async () => {
    const request = ++latest.current;
    setLoading(true);
    setFailed(false);
    try {
      const result = await post<
        ApiResult & { generation: string; policy: GameView['inventionPolicy'] }
      >('/api/god/invention-policy', {});
      if (request !== latest.current) return;
      if (!result.ok) throw new Error(result.message || 'Could not read invention permissions.');
      setEditing({ generation: result.generation, ...result.policy });
    } catch (error) {
      if (request === latest.current) {
        setMessage(
          error instanceof Error ? error.message : 'Could not read invention permissions.',
        );
        setFailed(true);
      }
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    setEditing(undefined);
    setMessage('');
    if (view.godMode) void load();
    return () => {
      latest.current++;
    };
  }, [load, view.godMode, view.worldId, view.saveTimeline]);
  const stale = !!editing && editing.revision !== view.inventionPolicy.revision;
  const dirty =
    !!editing &&
    (editing.playerLocked !== view.inventionPolicy.playerLocked ||
      editing.agentLocked !== view.inventionPolicy.agentLocked);
  async function save() {
    if (!editing || busy || stale) return;
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      const result = await post('/api/god/invention-policy/save', {
        expectedGeneration: editing.generation,
        expectedRevision: editing.revision,
        playerLocked: editing.playerLocked,
        agentLocked: editing.agentLocked,
      });
      if (!result.ok) throw new Error(result.message || 'Could not save invention permissions.');
      setMessage(result.message || 'Invention permissions saved for this world.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save invention permissions.');
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section title="Invention permissions">
      <p className="ol-setting-scope">Whole world · creator permission required · explicit Save</p>
      <p>
        These permissions govern proposing new techniques. Existing actions, crafts and learning
        stay available.
      </p>
      <div className="ol-setting-group">
        <label>
          <input
            type="checkbox"
            checked={editing?.playerLocked ?? view.inventionPolicy.playerLocked}
            disabled={!view.godMode || !editing || busy || loading || stale}
            onChange={(event) =>
              setEditing(editing ? { ...editing, playerLocked: event.target.checked } : undefined)
            }
          />{' '}
          Lock player invention
        </label>
        <p className="ol-caption">Applies to players proposing new techniques in this world.</p>
        <label>
          <input
            type="checkbox"
            checked={editing?.agentLocked ?? view.inventionPolicy.agentLocked}
            disabled={!view.godMode || !editing || busy || loading || stale}
            onChange={(event) =>
              setEditing(editing ? { ...editing, agentLocked: event.target.checked } : undefined)
            }
          />{' '}
          Lock autonomous character invention
        </label>
        <p className="ol-caption">
          Unlocked characters may propose supported techniques privately. Constructing something
          remains a separate decision.
        </p>
      </div>
      {!view.godMode && (
        <p className="ol-muted">You can read these world permissions. A creator can change them.</p>
      )}
      {loading && <p role="status">Reading the current world permissions…</p>}
      {stale && (
        <p role="status">
          The world permissions changed while this panel was open. Your draft is still shown. Reload
          the current permissions before editing or saving.
        </p>
      )}
      {view.godMode && (
        <div className="ol-lifecycle-actions">
          <Button
            variant="primary"
            busy={busy}
            isDisabled={!editing || loading || stale || !dirty}
            onPress={() => void save()}
          >
            Save world permissions
          </Button>
          {(stale || failed || dirty) && (
            <Button
              variant="quiet"
              isDisabled={busy || loading}
              onPress={() => {
                setMessage('');
                void load();
              }}
            >
              {dirty ? 'Discard draft and reload' : 'Reload current permissions'}
            </Button>
          )}
        </div>
      )}
      {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    </Section>
  );
}
