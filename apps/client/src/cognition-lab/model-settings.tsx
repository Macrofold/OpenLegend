import { useRef, useState } from 'react';
import { getScoped, post } from '../api';

type Settings = {
  fastModel: string | null;
  complexModel: string | null;
  outputTokens: number | null;
};
type Configuration = {
  settings: Settings;
  choices: {
    fastModels: string[];
    complexModels: string[];
    judgmentModel: string | null;
    budgetMicroUsd: number;
  };
};
const path = '/api/cognition-lab/decisions/settings';
export function ModelSettings({ writable }: { writable: boolean }) {
  const [config, setConfig] = useState<Configuration>();
  const [draft, setDraft] = useState<Settings>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function read(save = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (save && draft) {
        const result = await post(path, draft);
        if (!result.ok) throw new Error(result.message || 'The settings were refused.');
      }
      const value = await getScoped<Configuration>(path);
      setConfig(value);
      setDraft(value.settings);
      if (save) setMessage('Settings applied to new decisions.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Settings unavailable.');
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open && !config) void read();
      }}
    >
      <summary>Model settings and spending</summary>
      {config && draft && (
        <>
          <p>
            Lab allowance:{' '}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 6,
            }).format(config.choices.budgetMicroUsd / 1e6)}
            . Decision model: {config.choices.judgmentModel ?? 'Unconfigured'}.
          </p>
          <fieldset disabled={busy || !writable}>
            <legend>New decisions</legend>
            {(['fastModel', 'complexModel'] as const).map((key) => (
              <label key={key}>
                {key === 'fastModel' ? 'Fast generation' : 'Complex generation'}{' '}
                <select
                  value={draft[key] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value || null })}
                >
                  <option value="">Server default</option>
                  {config.choices[key === 'fastModel' ? 'fastModels' : 'complexModels'].map(
                    (model) => (
                      <option key={model}>{model}</option>
                    ),
                  )}
                </select>
              </label>
            ))}
            <label>
              Output token limit{' '}
              <input
                type="number"
                min={1}
                placeholder="Server default"
                value={draft.outputTokens ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    outputTokens: e.target.value ? e.target.valueAsNumber : null,
                  })
                }
              />
            </label>
            <button onClick={() => void read(true)}>Apply settings</button>
          </fieldset>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
