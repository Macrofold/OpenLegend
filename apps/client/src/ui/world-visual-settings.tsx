import { useState } from 'react';
import type { ApiResult, GameView, PlayerPreferencePatch } from '@open-legend/protocol';
import { post } from '../api';
import { Section } from '../design-system/components';

/** Presentation preferences are player-owned, not mutable world laws. */
export function WorldVisualSettings({ view }: { view: GameView }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const prefs = view.profile.preferences;
  async function update(patch: PlayerPreferencePatch) {
    setBusy(true);
    setError('');
    try {
      const result = await post<ApiResult>('/api/profile/preferences', patch);
      if (!result.ok) setError(result.message ?? 'Could not save the preference.');
    } catch {
      setError('Could not save the preference.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section title="World visibility">
      <label>
        See-through reveal
        <select
          aria-label="See-through reveal"
          disabled={busy}
          value={prefs.revealMode ?? 'nearby'}
          onChange={(e) =>
            void update({ revealMode: e.target.value as 'off' | 'player' | 'nearby' })
          }
        >
          <option value="off">Off</option>
          <option value="player">Player only</option>
          <option value="nearby">Nearby visible objects</option>
        </select>
      </label>
      <label>
        Reveal radius
        <select
          aria-label="Reveal radius"
          disabled={busy}
          value={prefs.revealRadius ?? 6}
          onChange={(e) => void update({ revealRadius: Number(e.target.value) })}
        >
          {[2, 4, 6, 8, 10, 12].map((n) => (
            <option key={n} value={n}>
              {n} metres
            </option>
          ))}
        </select>
      </label>
      <label>
        Reveal strength
        <select
          aria-label="Reveal strength"
          disabled={busy}
          value={prefs.revealStrength ?? 0.7}
          onChange={(e) => void update({ revealStrength: Number(e.target.value) })}
        >
          <option value={0.35}>Subtle</option>
          <option value={0.7}>Balanced</option>
          <option value={0.9}>Strong</option>
        </select>
      </label>
      <p>
        Only current character-visible objects qualify. Camera movement never grants sight through
        walls.
      </p>
      {error && <p role="alert">{error}</p>}
    </Section>
  );
}
