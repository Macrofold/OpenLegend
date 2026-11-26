import { useState, useRef } from 'react';
import { post } from '../api';

export function PrepareLab({ refresh }: { refresh(): void }) {
  const [source, setSource] = useState<'opening' | 'game'>('opening');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function prepare() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await post('/api/cognition-lab/prepare', { source });
      if (!result.ok) throw new Error(result.message ?? 'The Lab could not be prepared.');
      refresh();
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : 'Preparation could not be confirmed. Refresh the Lab before trying again.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Prepare the Lab world</h2>
      <p>Choose a starting point for the empty Lab database.</p>
      <label>
        Starting point{' '}
        <select
          value={source}
          onChange={(e) => setSource(e.target.value === 'game' ? 'game' : 'opening')}
        >
          <option value="opening">Reviewed starting world</option>
          <option value="game">Copy the current paused game once</option>
        </select>
      </label>
      <button disabled={busy} onClick={() => void prepare()}>
        Prepare Lab
      </button>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
