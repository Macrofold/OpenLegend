import { useEffect, useRef, useState } from 'react';
import type { GodPersonMemoryEditorCut } from '@open-legend/protocol';
import { post, postPrivateRead } from '../api';
import { PastEventEditor, type PastEvent } from './past-event';
import { InventoryEditor } from './inventory-editor';

type Profile = {
  name: string;
  description: string | null;
  personality: string | null;
  backstory: string | null;
};
type Goal = {
  id: string;
  revision: number;
  objective: string;
  status: string;
  parentId: string | null;
};
type GoalSelection = { expected: number; goal?: Goal; text: string };
type Attribute = {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  revision: number;
  held: boolean;
};
type Trait = { id: string; name: string; description: string };
type Group = 'traits' | 'read' | 'event' | 'identity' | 'memory' | 'goal' | 'attribute';
type Person = GodPersonMemoryEditorCut & {
  ok: boolean;
  message?: string;
  profile: Profile;
  profileHash: string;
  traits: Trait[];
  traitOptions: Trait[] | null;
  traitsHash: string;
  nextMemory: number;
  memorySources: string[];
  goals: Goal[];
  agencyRevision: number;
  historyOrdinal: number;
  simTime: number;
  attributes: Attribute[];
};

export function ScenarioEditor({
  actorId,
  people,
  control,
  onDirtyChange,
}: {
  actorId: string;
  people: { id: string; name: string }[];
  control: boolean;
  onDirtyChange(dirty: boolean): void;
}) {
  const [person, setPerson] = useState<Person>();
  const [draft, setDraft] = useState<Profile>();
  const [summary, setSummary] = useState('');
  const [importance, setImportance] = useState(5);
  const [source, setSource] = useState('internal');
  const [profileBase, setProfileBase] = useState('');
  const [memoryBase, setMemoryBase] = useState(0);
  const [attribute, setAttribute] = useState<{ original: Attribute; draft: string }>();
  const [goal, setGoal] = useState<GoalSelection>();
  const [inventoryDirty, setInventoryDirty] = useState(false);
  const [traits, setTraits] = useState<{ expectedHash: string; ids: string[] }>();
  const [pastEvent, setPastEvent] = useState<PastEvent>();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState('');
  const identityDirty =
    !!person && !!draft && JSON.stringify(person.profile) !== JSON.stringify(draft);
  const attributeDirty =
    !!attribute &&
    (attribute.draft.trim() === '' || Number(attribute.draft) !== attribute.original.value);
  const goalDirty = !!goal && goal.text !== (goal.goal?.objective ?? '');
  const editorDirty =
    !!traits || !!pastEvent || attributeDirty || identityDirty || !!summary.trim() || goalDirty;
  const dirty = inventoryDirty || editorDirty;
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  async function load(applied: Group) {
    const current = await postPrivateRead<Person>('/api/god/editor/person', { actorId });
    if (!current.ok || !current.profile)
      throw new Error(current.message || 'The current character record is unavailable.');
    setPerson(current);
    if (applied === 'read' || applied === 'identity' || !identityDirty) {
      setDraft(current.profile);
      setProfileBase(current.profileHash);
    }
    if (applied === 'read' || applied === 'memory' || !summary.trim())
      setMemoryBase(current.nextMemory);
  }
  async function holdValue() {
    if (pending.current || !attribute || !person || attributeDirty) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const current = attribute.original;
      const reply = await post('/api/cognition-lab/holds', {
        actor: actorId,
        life: person.life,
        attribute: {
          id: current.id,
          expectedValue: current.value,
          expectedRevision: current.revision,
          value: current.value,
        },
        held: !current.held,
      });
      if (!reply.ok) throw new Error(reply.message || 'The value changed. Reload the character.');
      setAttribute(undefined);
      await load('attribute');
      setMessage(current.held ? 'Value released.' : 'Value held.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The value could not be held.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function edit(kind: Group, abandon = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (kind !== 'read' && person && draft) {
        const { generation, manifestRevision, bodyPolicyPin, life } = person;
        let change;
        switch (kind) {
          case 'traits':
            if (!traits) return;
            change = { traits };
            break;
          case 'identity':
            change = { identity: { expectedHash: profileBase, profile: draft } };
            break;
          case 'attribute':
            if (!attribute) return;
            change = {
              attribute: {
                id: attribute.original.id,
                expectedRevision: attribute.original.revision,
                expectedValue: attribute.original.value,
                value: Number(attribute.draft),
              },
            };
            break;
          case 'event':
            if (!pastEvent) return;
            change = { event: pastEvent };
            break;
          case 'goal':
            if (!goal) return;
            change = {
              goal: {
                expectedAgencyRevision: goal.expected,
                change: {
                  operation: abandon ? 'abandon' : goal.goal ? 'revise' : 'create',
                  goalId: goal.goal?.id ?? null,
                  expectedRevision: goal.goal?.revision ?? null,
                  objective: abandon ? null : goal.text.trim(),
                  parentId: abandon ? null : (goal.goal?.parentId ?? null),
                },
              },
            };
            break;
          case 'memory':
            change = {
              memory: { expectedNext: memoryBase, summary: summary.trim(), importance, source },
            };
            break;
        }
        const result = await post('/api/god/editor/person/author', {
          actorId,
          cut: { generation, manifestRevision, bodyPolicyPin, life },
          change,
        });
        if (!result.ok)
          throw new Error(
            result.message ||
              'The character changed. Reload their record before applying this edit.',
          );
        if (kind === 'traits') setTraits(undefined);
        if (kind === 'event') setPastEvent(undefined);
        if (kind === 'memory') setSummary('');
        if (kind === 'goal') setGoal(undefined);
        if (kind === 'attribute') setAttribute(undefined);
        setMessage(result.message || 'The Lab character was updated.');
      }
      if (kind === 'read' && editorDirty) {
        if (!window.confirm('Discard unapplied character edits and reload this record?')) return;
        setTraits(undefined);
        setPastEvent(undefined);
        setGoal(undefined);
        setAttribute(undefined);
        setSummary('');
      }
      await load(kind);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The record could not be read.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open && !person) void edit('read');
      }}
    >
      <summary>Edit character, needs, goals and memories</summary>
      {draft && person && (
        <>
          <fieldset disabled={busy || !control}>
            <legend>Character</legend>
            {(['name', 'description', 'personality', 'backstory'] as const).map((key) => (
              <label key={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}{' '}
                <textarea
                  rows={key === 'name' ? 1 : 3}
                  value={draft[key] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </label>
            ))}
            <button disabled={!identityDirty} onClick={() => void edit('identity')}>
              Apply character edits
            </button>
          </fieldset>
          {person.traitOptions && (
            <fieldset disabled={busy || !control}>
              <legend>Character traits</legend>
              {Array.from(
                new Map([...person.traitOptions, ...person.traits].map((t) => [t.id, t])).values(),
              ).map((t) => {
                const saved = person.traits.map((row) => row.id);
                const chosen = traits?.ids ?? saved;
                return (
                  <label key={t.id} title={t.description}>
                    <input
                      type="checkbox"
                      checked={chosen.includes(t.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...chosen, t.id]
                          : chosen.filter((id) => id !== t.id);
                        setTraits(
                          ids.length === saved.length && ids.every((id, i) => id === saved[i])
                            ? undefined
                            : { expectedHash: traits?.expectedHash ?? person.traitsHash, ids },
                        );
                      }}
                    />
                    {t.name}
                  </label>
                );
              })}
              <button disabled={!traits} onClick={() => void edit('traits')}>
                Apply traits
              </button>
            </fieldset>
          )}
          {person.attributes.length > 0 && (
            <fieldset disabled={busy || !control}>
              <legend>Character attributes and needs</legend>
              <label>
                Value{' '}
                <select
                  disabled={attributeDirty}
                  value={attribute?.original.id ?? ''}
                  onChange={(event) => {
                    const selected = person.attributes.find((row) => row.id === event.target.value);
                    setAttribute(
                      selected ? { original: selected, draft: String(selected.value) } : undefined,
                    );
                  }}
                >
                  <option value="">Choose a value</option>
                  {person.attributes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} ({row.value}
                      {row.unit ? ' ' + row.unit : ''})
                    </option>
                  ))}
                </select>
              </label>
              {attribute && (
                <>
                  <label>
                    {attribute.original.name}{' '}
                    <input
                      type="number"
                      disabled={attribute.original.held}
                      step="any"
                      min={attribute.original.min}
                      max={attribute.original.max}
                      value={attribute.draft}
                      onChange={(event) =>
                        setAttribute({ ...attribute, draft: event.target.value })
                      }
                    />
                  </label>
                  <button
                    disabled={
                      !attribute.draft.trim() ||
                      !Number.isFinite(Number(attribute.draft)) ||
                      Number(attribute.draft) < attribute.original.min ||
                      Number(attribute.draft) > attribute.original.max ||
                      Number(attribute.draft) === attribute.original.value
                    }
                    onClick={() => void edit('attribute')}
                  >
                    Apply value
                  </button>
                  <button disabled={attributeDirty} onClick={() => void holdValue()}>
                    {attribute.original.held ? 'Release value' : 'Hold current value'}
                  </button>
                </>
              )}
            </fieldset>
          )}
          <fieldset disabled={busy || !control}>
            <legend>Goals</legend>
            <label>
              Goal{' '}
              <select
                disabled={goalDirty}
                value={goal?.goal?.id ?? ''}
                onChange={(e) => {
                  const selected = person.goals.find((row) => row.id === e.target.value);
                  setGoal({
                    expected: person.agencyRevision,
                    goal: selected,
                    text: selected?.objective ?? '',
                  });
                }}
              >
                <option value="">New goal</option>
                {person.goals
                  .filter((row) => row.status === 'active' || row.status === 'paused')
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.objective}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Objective{' '}
              <textarea
                maxLength={500}
                value={goal?.text ?? ''}
                onChange={(e) =>
                  setGoal({
                    ...(goal ?? { expected: person.agencyRevision }),
                    text: e.target.value,
                  })
                }
              />
            </label>
            <button
              disabled={!goal?.text.trim() || goal.text === goal.goal?.objective}
              onClick={() => void edit('goal')}
            >
              {goal?.goal ? 'Apply objective' : 'Add goal'}
            </button>
            {goal?.goal && (
              <button disabled={goalDirty} onClick={() => void edit('goal', true)}>
                Abandon this goal
              </button>
            )}
          </fieldset>
          <InventoryEditor
            key={actorId}
            actorId={actorId}
            control={control}
            onDirtyChange={setInventoryDirty}
          />
          <PastEventEditor
            people={people}
            now={person.simTime}
            ordinal={person.historyOrdinal}
            disabled={busy || !control}
            draft={pastEvent}
            change={setPastEvent}
            apply={() => void edit('event')}
          />
          <fieldset disabled={busy || !control}>
            <legend>Personal memory</legend>
            <label>
              Source{' '}
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                {person.memorySources.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              What this person remembers{' '}
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
            </label>
            <label>
              Importance{' '}
              <input
                type="number"
                min={0}
                max={10}
                value={importance}
                onChange={(e) => setImportance(e.target.valueAsNumber)}
              />
            </label>
            <button
              disabled={!summary.trim() || !Number.isFinite(importance)}
              onClick={() => void edit('memory')}
            >
              Add memory
            </button>
          </fieldset>
        </>
      )}
      <button disabled={busy} onClick={() => void edit('read')}>
        Reload character
      </button>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
