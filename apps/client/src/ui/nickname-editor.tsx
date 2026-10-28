import { useEffect, useState } from 'react';
import type { EntityView, GameView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Icon } from '../design-system/components';

function OwnedNicknameEditor({
  entity,
  view,
  connected,
  onChanged,
  compact = false,
}: {
  entity: EntityView;
  view: GameView;
  connected: boolean;
  onChanged?: () => void | Promise<void>;
  compact?: boolean;
}) {
  const current = {
    nickname: entity.identity?.nickname ?? '',
    revision: entity.identity?.revision ?? 0,
  };
  const [base, setBase] = useState(current);
  const [draft, setDraft] = useState(current.nickname);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const changed = current.revision !== base.revision;
  useEffect(() => {
    if (changed && (draft === base.nickname || draft === current.nickname)) {
      setBase(current);
      setDraft(current.nickname);
    }
  }, [current.revision, current.nickname, base.nickname, draft, changed]);
  const form = (
    <form
      className="ol-nickname-editor"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && draft !== base.nickname) {
          event.stopPropagation();
          setDraft(current.nickname);
          setBase(current);
          setMessage('Nickname edit discarded.');
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (busy || !connected || changed || draft.trim() === base.nickname) return;
        setBusy(true);
        setMessage('');
        void post('/api/nickname', {
          worldId: view.worldId,
          generation: view.historyEpoch?.split(':')[0] ?? '',
          subjectId: entity.id,
          expectedRevision: base.revision,
          nickname: draft.trim(),
        })
          .then(async (result) => {
            setMessage(
              result.message ??
                (result.ok ? 'Your nickname was saved.' : 'Your nickname was not saved.'),
            );
            if (result.ok) await onChanged?.();
          })
          .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
          .finally(() => setBusy(false));
      }}
    >
      <p className="ol-caption">Known name: {entity.identity?.knownName || 'Not known'}</p>
      <label>
        Your nickname
        <input
          value={draft}
          disabled={busy || !connected}
          maxLength={80}
          onChange={(event) => setDraft(event.target.value)}
          aria-describedby={`nickname-help-${entity.id}`}
        />
      </label>
      <p id={`nickname-help-${entity.id}`} className="ol-caption">
        Only you see this name. Leave it empty to use the known name.
      </p>
      {changed && (
        <p role="status">
          The saved name changed. Your edit is retained; read the latest name before saving.
        </p>
      )}
      <div className="ol-button-row">
        <Button
          type="submit"
          disabled={
            busy ||
            !connected ||
            changed ||
            draft.trim() === base.nickname ||
            Array.from(draft.trim()).length > 40
          }
        >
          Save nickname
        </Button>
        <Button
          variant="quiet"
          disabled={busy}
          onPress={() => {
            setDraft(current.nickname);
            setBase(current);
            setMessage('');
          }}
        >
          Discard edit
        </Button>
      </div>
      {message && <p role="status">{message}</p>}
    </form>
  );
  return compact ? (
    <details
      className="ol-nickname-compact"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !event.currentTarget.open) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }}
    >
      <summary>
        <span>Your nickname{current.nickname ? `: ${current.nickname}` : ''}</span>
        <Icon name="ui.edit" size={14} />
      </summary>
      {form}
    </details>
  ) : (
    form
  );
}
export function NicknameEditor(props: Parameters<typeof OwnedNicknameEditor>[0]) {
  const { view, entity } = props;
  return (
    <OwnedNicknameEditor
      key={`${view.worldId}:${view.saveTimeline}:${view.historyEpoch}:${view.access?.scope}:${entity.id}`}
      {...props}
    />
  );
}
