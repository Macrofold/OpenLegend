import { useRef, useState } from 'react';
import { post } from '../api';

export function NpcStimulus({
  actorId,
  people,
  mode,
  control,
  accepted,
}: {
  actorId: string;
  people: { id: string; name: string }[];
  mode: 'speak' | 'act';
  control: boolean;
  accepted(jobId?: string): void;
}) {
  const [targetId, setTarget] = useState('');
  const [text, setText] = useState('');
  const [volume, setVolume] = useState('normal');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<{ body: string; id: string } | undefined>(undefined);
  const pending = useRef(false);
  const speech = mode === 'speak';
  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const input = {
        actorId,
        ...(targetId ? { targetId } : {}),
        kind: speech ? 'say' : 'act',
        text: text.trim(),
        ...(speech ? { volume } : {}),
      };
      const body = JSON.stringify(input);
      if (request.current?.body !== body) request.current = { body, id: crypto.randomUUID() };
      const result = await post<{ ok: boolean; message?: string; jobId?: string }>(
        '/api/cognition-lab/decisions/stimuli',
        { ...input, requestId: request.current.id },
      );
      if (!result.ok) throw new Error(result.message || 'The server did not accept the stimulus.');
      request.current = undefined;
      setText('');
      setMessage(result.message || 'The server recorded the stimulus.');
      accepted(result.jobId);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'The server did not confirm this stimulus.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset disabled={!control || busy}>
        <legend>{speech ? 'Directed speech' : 'Observable action'}</legend>
        <label>
          {speech ? 'Speak to' : 'Action target'}{' '}
          <select required={speech} value={targetId} onChange={(e) => setTarget(e.target.value)}>
            <option value="">{speech ? 'Choose a person' : 'No target'}</option>
            {people
              .filter((p) => p.id !== actorId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        {speech && (
          <label>
            Volume{' '}
            <select value={volume} onChange={(e) => setVolume(e.target.value)}>
              <option value="whisper">Whisper</option>
              <option value="normal">Normal</option>
              <option value="shout">Shout</option>
            </select>
          </label>
        )}
        <label>
          {speech
            ? 'Words spoken'
            : targetId
              ? 'Visible action (use {target} for the selected person)'
              : 'Visible action'}{' '}
          <textarea
            value={text}
            maxLength={speech ? undefined : 240}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </label>
        <button disabled={!text.trim()}>{speech ? 'Submit speech' : 'Submit action'}</button>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
