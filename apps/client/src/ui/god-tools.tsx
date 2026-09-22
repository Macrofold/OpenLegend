import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type {
  ApiResult,
  GodMemoryEditorEntry,
  GodPersonEditorView,
  GodPersonFields,
  GodWorldEventEditorEntry,
  GodWorldEventsEditorView,
  Position,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, IconButton, SelectField, Tag } from '../design-system/components';
import { EditorPanel } from './editor';

type TraitOption = { id: string; name: string; description: string };

export const spawnIcons: Record<string, string> = {
  person: 'ui.character',
  'banked-campfire': 'action.fire',
  'berry-bush': 'resource.berry',
  'berry-thicket': 'resource.berry',
  deer: 'creature.deer',
  'dry-grass-fibers': 'resource.fiber',
  'fallen-branches': 'resource.branch',
  hare: 'creature.hare',
  'river-reeds': 'resource.reed',
  'river-stones': 'resource.stone',
};

type PersonCreationDraft = {
  name: string;
  personality: string;
  backstory: string;
  traitIds: string[];
  initialGoals: string[];
};

export type PersonDraft = PersonCreationDraft;

function normalizedPerson(person: PersonDraft): PersonDraft {
  return {
    name: person.name.trim(),
    personality: person.personality.trim(),
    backstory: person.backstory.trim(),
    traitIds: [...new Set(person.traitIds)],
    initialGoals: person.initialGoals.map((goal) => goal.trim()).filter(Boolean),
  };
}

function validatePerson(person: PersonDraft): string {
  const value = normalizedPerson(person);
  if (!value.name) return 'Name is required.';
  if (value.name.length > 80) return 'Name must be 80 characters or fewer.';
  if (value.personality.length > 1000) return 'Personality must be 1,000 characters or fewer.';
  if (value.backstory.length > 4000) return 'Backstory must be 4,000 characters or fewer.';
  if (value.traitIds.length > 8) return 'Choose no more than eight traits.';
  if (value.initialGoals.length > 8) return 'Add no more than eight initial goals.';
  if (value.initialGoals.some((goal) => goal.length > 500))
    return 'Each initial goal must be 500 characters or fewer.';
  return '';
}

function normalizedEditorPerson(person: GodPersonFields): GodPersonFields {
  return {
    name: person.name.trim(),
    description: person.description.trim(),
    personality: person.personality.trim(),
    backstory: person.backstory.trim(),
    traitIds: [...new Set(person.traitIds)],
    goals: person.goals.map((goal) => goal.trim()).filter(Boolean),
    stats: { ...person.stats },
  };
}

function validateEditorPerson(person: GodPersonFields): string {
  const value = normalizedEditorPerson(person);
  if (!value.name) return 'Name is required.';
  if (value.name.length > 80) return 'Name must be 80 characters or fewer.';
  if (value.description.length > 2000) return 'Description must be 2,000 characters or fewer.';
  if (value.personality.length > 1000) return 'Personality must be 1,000 characters or fewer.';
  if (value.backstory.length > 4000) return 'Backstory must be 4,000 characters or fewer.';
  if (value.traitIds.length > 8) return 'Choose no more than eight traits.';
  if (value.goals.length > 8) return 'Add no more than eight goals.';
  if (value.goals.some((goal) => goal.length > 500))
    return 'Each goal must be 500 characters or fewer.';
  if (Object.values(value.stats).some((stat) => !Number.isFinite(stat) || stat < 0 || stat > 100))
    return 'Health, fullness, and energy must each be between 0 and 100.';
  return '';
}

function TraitFields({
  selected,
  traits,
  onChange,
  creation,
}: {
  selected: string[];
  traits: TraitOption[];
  onChange(ids: string[]): void;
  creation?: boolean;
}) {
  return (
    <>
      <SelectField
        key={selected.join(',')}
        label="Traits"
        placeholder="Search traits…"
        placement="bottom start"
        value={null}
        options={traits
          .filter((trait) => !selected.includes(trait.id))
          .map((trait) => ({ id: trait.id, label: trait.name, description: trait.description }))}
        onChange={(id) => onChange([...selected, id])}
      />
      <div className="ol-person-trait-tags" aria-label="Selected traits">
        {selected.map((id) => {
          const trait = traits.find((option) => option.id === id);
          if (!trait) return null;
          return (
            <span className="ol-tag ol-person-trait-tag" key={id} title={trait.description}>
              {trait.name}
              <button
                type="button"
                aria-label={`Remove ${trait.name}`}
                onClick={() => onChange(selected.filter((value) => value !== id))}
              >
                ×
              </button>
            </span>
          );
        })}
        {creation && !selected.length && (
          <span className="ol-caption">Leave empty to assign three random traits.</span>
        )}
      </div>
    </>
  );
}

function PersonFields({
  person,
  traits,
  onChange,
  autoFocus,
}: {
  person: PersonDraft;
  traits: TraitOption[];
  onChange(person: PersonDraft): void;
  autoFocus?: boolean;
}) {
  const update = <K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) =>
    onChange({ ...person, [key]: value });
  return (
    <div className="ol-person-form">
      <label>
        Name
        <input
          autoFocus={autoFocus}
          required
          maxLength={80}
          value={person.name}
          onChange={(event) => update('name', event.target.value)}
        />
      </label>
      <label>
        Personality
        <textarea
          rows={3}
          maxLength={1000}
          value={person.personality}
          onChange={(event) => update('personality', event.target.value)}
          placeholder="How do they tend to think, feel, and relate to others?"
        />
      </label>
      <label>
        Backstory
        <textarea
          rows={5}
          maxLength={4000}
          value={person.backstory}
          onChange={(event) => update('backstory', event.target.value)}
          placeholder="What shaped them before they arrived here?"
        />
      </label>
      <TraitFields
        creation
        selected={person.traitIds}
        traits={traits}
        onChange={(ids) => update('traitIds', ids)}
      />
      <label>
        Initial goals
        <textarea
          rows={3}
          maxLength={4000}
          value={person.initialGoals.join('\n')}
          onChange={(event) => update('initialGoals', event.target.value.split('\n'))}
          placeholder="One goal per line"
        />
      </label>
    </div>
  );
}

function PersonEditorFields({
  person,
  traits,
  onChange,
}: {
  person: GodPersonFields;
  traits: TraitOption[];
  onChange(person: GodPersonFields): void;
}) {
  const update = <K extends keyof GodPersonFields>(key: K, value: GodPersonFields[K]) =>
    onChange({ ...person, [key]: value });
  return (
    <div className="ol-person-form">
      <label>
        Name
        <input
          required
          maxLength={80}
          value={person.name}
          onChange={(event) => update('name', event.target.value)}
        />
      </label>
      <label>
        Description
        <textarea
          rows={3}
          maxLength={2000}
          value={person.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="How this person is described in the world"
        />
      </label>
      <label>
        Personality
        <textarea
          rows={3}
          maxLength={1000}
          value={person.personality}
          onChange={(event) => update('personality', event.target.value)}
          placeholder="How they tend to think, feel, and relate to others"
        />
      </label>
      <label>
        Backstory
        <textarea
          rows={5}
          maxLength={4000}
          value={person.backstory}
          onChange={(event) => update('backstory', event.target.value)}
          placeholder="The history that shaped them"
        />
      </label>
      <TraitFields
        selected={person.traitIds}
        traits={traits}
        onChange={(ids) => update('traitIds', ids)}
      />
      <label>
        Goals
        <textarea
          rows={4}
          maxLength={4000}
          value={person.goals.join('\n')}
          onChange={(event) => update('goals', event.target.value.split('\n'))}
          placeholder="One current goal per line; the first drives immediate planning"
        />
      </label>
      <fieldset className="ol-person-stats">
        <legend>Stats</legend>
        <div>
          {(
            [
              ['health', 'Health'],
              ['fullness', 'Fullness'],
              ['energy', 'Energy'],
            ] as const
          )
            .filter(([key]) => person.stats[key] !== undefined)
            .map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={person.stats[key]}
                  onChange={(event) =>
                    update('stats', { ...person.stats, [key]: Number(event.target.value) })
                  }
                />
              </label>
            ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          onPress={() =>
            update('stats', {
              health: 100,
              ...(person.stats.fullness === undefined ? {} : { fullness: 100 }),
              ...(person.stats.energy === undefined ? {} : { energy: 100 }),
            })
          }
        >
          Fill stats to 100
        </Button>
      </fieldset>
    </div>
  );
}

export function PersonCreationModal({
  position,
  traits,
  create,
  close,
}: {
  position: Position;
  traits: TraitOption[];
  create(draft: PersonDraft): Promise<ApiResult>;
  close(): void;
}) {
  const [person, setPerson] = useState<PersonDraft>({
    name: '',
    personality: '',
    backstory: '',
    traitIds: [],
    initialGoals: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    const invalid = validatePerson(person);
    if (invalid || saving) return setError(invalid);
    setSaving(true);
    setError('');
    try {
      const result = await create(normalizedPerson(person));
      if (result.ok) close();
      else setError(result.message);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSaving(false);
    }
  }
  return (
    <ModalOverlay
      className="ol-root ol-modal-overlay"
      isOpen
      isDismissable
      onOpenChange={(open) => !open && close()}
    >
      <Modal className="ol-modal">
        <Dialog className="ol-person-dialog" aria-label="Create person">
          <form onSubmit={(event) => void submit(event)}>
            <header className="ol-modal-head">
              <div>
                <Tag tone="highlight">God mode</Tag>
                <h2 className="ol-heading">Create a person</h2>
              </div>
              <IconButton icon="ui.close" label="Close person creation" onPress={close} />
            </header>
            <PersonFields person={person} traits={traits} onChange={setPerson} autoFocus />
            <p className="ol-caption ol-person-position">
              They will appear at {position.x.toFixed(1)}, {position.z.toFixed(1)} with basic food
              and a cutting stone.
            </p>
            {error && (
              <p className="ol-form-error ol-person-error" role="alert">
                {error}
              </p>
            )}
            <footer className="ol-modal-actions">
              <Button type="button" variant="quiet" onPress={close}>
                Cancel
              </Button>
              <Button type="submit" busy={saving} disabled={!person.name.trim()}>
                Create person
              </Button>
            </footer>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function gameDate(time: number) {
  const day = Math.floor(time / 86400) + 1;
  const hours = Math.floor((time % 86400) / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  return `Day ${day}, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function RefreshHead({
  refreshedAt,
  refresh,
  title = 'Latest saved entries',
}: {
  refreshedAt: Date | null;
  refresh(): void;
  title?: string;
}) {
  return (
    <div className="ol-editor-section-head">
      <div>
        <strong>{title}</strong>
        <small>{refreshedAt ? `Queried ${refreshedAt.toLocaleString()}` : 'Not queried yet'}</small>
      </div>
      <IconButton icon="ui.refresh" label={`Refresh ${title.toLowerCase()}`} onPress={refresh} />
    </div>
  );
}

// Keep keystrokes local: only the first edit changes the parent dirty state.
function JsonDraft({
  initial,
  label,
  update,
}: {
  initial: string;
  label: string;
  update(value: string): void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <textarea
      spellCheck={false}
      aria-label={label}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        update(event.target.value);
      }}
    />
  );
}

function MemoryEditor({
  entries,
  selected,
  select,
  update,
  remove,
  drafts,
}: {
  drafts: Map<string, string>;
  entries: GodMemoryEditorEntry[];
  selected: string | null;
  select(id: string): void;
  update(id: string, json: string): void;
  remove(id: string): void;
}) {
  const current = entries.find((entry) => entry.id === selected);
  return (
    <div className="ol-entry-editor" data-detail={!!current || undefined}>
      <div className="ol-entry-list">
        {entries.map((entry) => (
          <article key={entry.id} className="ol-editor-entry" data-selected={entry.id === selected}>
            <button type="button" onClick={() => select(entry.id)}>
              <span>
                <Tag tone={entry.label === 'Consolidated' ? 'highlight' : undefined}>
                  {entry.label}
                </Tag>
                <time>{gameDate(entry.time)}</time>
              </span>
              <strong>{entry.text}</strong>
              <small>{entry.tags.join(' · ')}</small>
            </button>
            <IconButton icon="ui.close" label="Delete memory" onPress={() => remove(entry.id)} />
          </article>
        ))}
        {!entries.length && <p className="ol-caption">No memory entries.</p>}
      </div>
      {current && (
        <div className="ol-json-detail">
          <div>
            <strong>Memory JSON</strong>
            <IconButton icon="ui.close" label="Close JSON editor" onPress={() => select('')} />
          </div>
          {current.json === undefined ? (
            <p className="ol-json-loading">Loading JSON…</p>
          ) : (
            <JsonDraft
              key={current.id}
              initial={drafts.get(current.id) ?? current.json}
              label="Memory JSON"
              update={(json) => update(current.id, json)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function PersonEditor({
  actorId,
  traits,
  close,
  openWorldEvents,
}: {
  actorId: string;
  traits: TraitOption[];
  close(): void;
  openWorldEvents(): void;
}) {
  const drafts = useRef(new Map<string, string>());
  const generation = useRef(0);
  const [loading, setLoading] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [loaded, setLoaded] = useState<GodPersonEditorView | null>(null);
  const [person, setPerson] = useState<GodPersonFields | null>(null);
  const [memories, setMemories] = useState<GodMemoryEditorEntry[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [dirtyMemoryIds, setDirtyMemoryIds] = useState<Set<string>>(() => new Set());
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const personDirty =
    !!loaded && !!person && JSON.stringify(person) !== JSON.stringify(loaded.person);
  const dirty = personDirty || dirtyMemoryIds.size > 0;
  async function older() {
    if (!loaded?.before || loading) return;
    setLoading(true);
    try {
      const next = await post<GodPersonEditorView>('/api/god/editor/person', {
        actorId,
        before: loaded.before,
      });
      setLoaded((current) =>
        current
          ? {
              ...current,
              before: next.before,
              memories: [
                ...current.memories,
                ...next.memories.filter((m) => !current.memories.some((c) => c.id === m.id)),
              ],
            }
          : current,
      );
      setMemories((current) => [
        ...current,
        ...next.memories.filter((m) => !current.some((c) => c.id === m.id)),
      ]);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }
  const load = useCallback(async () => {
    const requestGeneration = ++generation.current;
    setLoading(true);
    try {
      const result = await post<GodPersonEditorView | ApiResult>('/api/god/editor/person', {
        actorId,
      });
      if (!result.ok || !('person' in result))
        throw new Error(result.message ?? 'Person not found.');
      if (requestGeneration !== generation.current) return;
      setNeedsReload(false);
      setLoaded(result);
      setPerson(result.person);
      setMemories(result.memories);
      setSelectedMemory(null);
      drafts.current.clear();
      setDirtyMemoryIds(new Set());
      setRefreshedAt(new Date());
      setError('');
    } catch (reason) {
      if (requestGeneration === generation.current) setError(String(reason));
    } finally {
      if (requestGeneration === generation.current) setLoading(false);
    }
  }, [actorId]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const refresh = () => {
    if (dirty) setError('Save or discard your changes before refreshing.');
    else void load();
  };
  const save = async () => {
    if (!loaded || !person || loading || saving || needsReload) return false;
    const invalid = validateEditorPerson(person);
    if (invalid) {
      setError(invalid);
      return false;
    }
    const memoryChanges = [];
    try {
      const originalById = new Map(loaded.memories.map((memory) => [memory.id, memory]));
      const currentById = new Map(memories.map((memory) => [memory.id, memory]));
      for (const entryId of dirtyMemoryIds) {
        const original = originalById.get(entryId);
        if (!original) throw new Error('A changed memory is no longer in the loaded editor.');
        const memory = currentById.get(entryId);
        let replacement = null;
        if (memory) {
          if (memory.json === undefined) throw new Error('Open the memory JSON before editing it.');
          const value: unknown = JSON.parse(drafts.current.get(entryId) ?? memory.json);
          if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error(`${memory.label} memory must contain a JSON object.`);
          replacement = { source: memory.source, value };
        }
        memoryChanges.push({ entryId, expectedHash: original.hash, replacement });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'A memory contains invalid JSON.');
      return false;
    }
    setSaving(true);
    setError('');
    try {
      const result = await post<ApiResult>('/api/god/editor/person/save', {
        actorId,
        basePerson: loaded.person,
        person: normalizedEditorPerson(person),
        memoryChanges,
      });
      if (!result.ok) throw new Error(result.message);
      setNeedsReload(true);
      await load();
      return true;
    } catch (reason) {
      setError(String(reason));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const awareEvents = useMemo(() => {
    return memories.filter((entry) => entry.source === 'awareness');
  }, [memories]);
  const openMemory = async (id: string) => {
    setSelectedMemory(id);
    const entry = memories.find((memory) => memory.id === id);
    if (!entry || entry.json !== undefined || loading) return;
    const requestGeneration = generation.current;
    try {
      const result = await post<{ ok: boolean; message?: string; hash?: string; json?: string }>(
        '/api/god/editor/person/memory',
        { actorId, entryId: id },
      );
      if (requestGeneration !== generation.current) return;
      if (!result.ok || !result.json || result.hash !== entry.hash)
        throw new Error(result.message ?? 'This memory changed. Refresh and try again.');
      setMemories((current) =>
        current.map((memory) =>
          memory.id === id && memory.hash === result.hash
            ? { ...memory, json: result.json }
            : memory,
        ),
      );
    } catch (reason) {
      if (requestGeneration === generation.current) setError(String(reason));
    }
  };
  if (!loaded || !person || needsReload)
    return (
      <EditorReload
        title="Edit Person"
        saved={needsReload}
        loading={loading}
        error={error}
        reload={load}
        close={close}
      />
    );
  return (
    <EditorPanel
      title={`Edit ${loaded.person.name}`}
      dirty={dirty}
      saving={saving || loading}
      error={error}
      onSave={save}
      onDiscard={() => {
        generation.current++;
        setPerson(structuredClone(loaded.person));
        setMemories(structuredClone(loaded.memories));
        setSelectedMemory(null);
        drafts.current.clear();
        setDirtyMemoryIds(new Set());
        setError('');
      }}
      onClose={close}
      tabs={[
        {
          id: 'person',
          label: 'Person',
          icon: 'ui.character',
          content: (
            <div className="ol-person-editor-tab">
              <RefreshHead
                refreshedAt={refreshedAt}
                refresh={refresh}
                title="Latest character state"
              />
              <PersonEditorFields person={person} traits={traits} onChange={setPerson} />
            </div>
          ),
        },
        {
          id: 'memories',
          label: 'Memories',
          icon: 'ui.journal',
          content: (
            <div className="ol-editor-fixed-tab">
              <RefreshHead refreshedAt={refreshedAt} refresh={refresh} />
              {loaded?.before && (
                <Button disabled={loading} onPress={() => void older()}>
                  Older memories
                </Button>
              )}
              <MemoryEditor
                drafts={drafts.current}
                entries={memories}
                selected={selectedMemory}
                select={(id) => (id ? void openMemory(id) : setSelectedMemory(null))}
                update={(id, json) => {
                  const first = !drafts.current.has(id);
                  drafts.current.set(id, json);
                  if (first) setDirtyMemoryIds((current) => new Set(current).add(id));
                }}
                remove={(id) => {
                  setMemories((current) => current.filter((entry) => entry.id !== id));
                  setDirtyMemoryIds((current) => new Set(current).add(id));
                  if (selectedMemory === id) setSelectedMemory(null);
                }}
              />
            </div>
          ),
        },
        {
          id: 'events',
          label: 'World Events',
          icon: 'ui.inview',
          content: (
            <>
              <RefreshHead refreshedAt={refreshedAt} refresh={refresh} />
              <Button variant="secondary" icon="ui.next" onPress={openWorldEvents}>
                Open World Events editor · God mode
              </Button>
              <div className="ol-entry-list ol-aware-events">
                {awareEvents.map((event) => (
                  <article className="ol-editor-entry" key={event.id}>
                    <button type="button" disabled>
                      <span>
                        <Tag>{event.eventType ?? 'Observed event'}</Tag>
                        <time>{gameDate(event.time)}</time>
                      </span>
                      <strong>{event.text}</strong>
                    </button>
                    <IconButton
                      icon="ui.close"
                      label="Remove awareness of world event"
                      onPress={() => {
                        setMemories((current) => current.filter((entry) => entry.id !== event.id));
                        setDirtyMemoryIds((current) => new Set(current).add(event.id));
                      }}
                    />
                  </article>
                ))}
                {!awareEvents.length && <p className="ol-caption">No retained world events.</p>}
              </div>
            </>
          ),
        },
      ]}
    />
  );
}

function StoryMechanismEditor() {
  const [draft, setDraft] = useState('');
  const [fields, setFields] = useState('[]');
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const result = await post<{ ok: boolean; policy: unknown; revision: number }>(
        '/api/god/editor/story',
        {},
      );
      setDraft(JSON.stringify(result.policy, null, 2));
      setRevision(result.revision);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      const result = await post<ApiResult>('/api/god/editor/story/save', {
        revision,
        policy: JSON.parse(draft),
        changes: JSON.parse(fields),
      });
      setMessage(result.message);
      if (result.ok) {
        setFields('[]');
        await load();
      }
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <p>Story selection changes future narration. Actor and object fields default to zero.</p>
      <Button onPress={() => void load()} disabled={busy}>
        Load story mechanism
      </Button>
      {draft && (
        <>
          <label>
            Mechanism configuration JSON
            <textarea
              aria-label="Story mechanism configuration"
              value={draft}
              rows={20}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <label>
            Entity field changes JSON
            <textarea
              aria-label="Story entity field changes"
              value={fields}
              rows={6}
              onChange={(event) => setFields(event.target.value)}
            />
          </label>
          <p>
            Each change contains entityId and values (field names to numbers). Use null values to
            remove the active namespace.
          </p>
          <Button onPress={() => void save()} disabled={busy}>
            Save story mechanism
          </Button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export function WorldEventsEditor({ close }: { close(): void }) {
  const drafts = useRef(new Map<string, string>());
  const generation = useRef(0);
  const [loading, setLoading] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [loaded, setLoaded] = useState<GodWorldEventsEditorView | null>(null);
  const [events, setEvents] = useState<GodWorldEventEditorEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirtyEventIds, setDirtyEventIds] = useState<Set<string>>(() => new Set());
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = dirtyEventIds.size > 0;
  async function older() {
    if (loaded?.before === undefined || loading) return;
    setLoading(true);
    try {
      const next = await post<GodWorldEventsEditorView>('/api/god/editor/world-events', {
        before: loaded.before,
      });
      setLoaded((current) =>
        current
          ? {
              ...current,
              before: next.before,
              events: [
                ...current.events,
                ...next.events.filter((e) => !current.events.some((c) => c.id === e.id)),
              ],
            }
          : current,
      );
      setEvents((current) => [
        ...current,
        ...next.events.filter((e) => !current.some((c) => c.id === e.id)),
      ]);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }
  const load = useCallback(async () => {
    const requestGeneration = ++generation.current;
    setLoading(true);
    try {
      const result = await post<GodWorldEventsEditorView>('/api/god/editor/world-events', {});
      if (requestGeneration !== generation.current) return;
      setNeedsReload(false);
      setLoaded(result);
      setEvents(result.events);
      setSelected(null);
      drafts.current.clear();
      setDirtyEventIds(new Set());
      setRefreshedAt(new Date());
      setError('');
    } catch (reason) {
      if (requestGeneration === generation.current) setError(String(reason));
    } finally {
      if (requestGeneration === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const save = async () => {
    if (!loaded || loading || saving || needsReload) return false;
    const changes = [];
    try {
      const originalById = new Map(loaded.events.map((event) => [event.id, event]));
      const currentById = new Map(events.map((event) => [event.id, event]));
      for (const id of dirtyEventIds) {
        const original = originalById.get(id);
        if (!original) throw new Error('A changed world event is no longer in the loaded editor.');
        const event = currentById.get(id);
        let replacement = null;
        if (event) {
          if (event.json === undefined)
            throw new Error('Open the world event JSON before editing it.');
          const value: unknown = JSON.parse(drafts.current.get(id) ?? event.json);
          if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('Every world event must contain a JSON object.');
          replacement = value;
        }
        changes.push({ id, expectedHash: original.hash, replacement });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'A world event contains invalid JSON.');
      return false;
    }
    setSaving(true);
    setError('');
    try {
      const result = await post<ApiResult>('/api/god/editor/world-events/save', {
        changes,
      });
      if (!result.ok) throw new Error(result.message);
      setNeedsReload(true);
      await load();
      return true;
    } catch (reason) {
      setError(String(reason));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const current = events.find((event) => event.id === selected);
  const openEvent = async (id: string) => {
    setSelected(id);
    const entry = events.find((event) => event.id === id);
    if (!entry || entry.json !== undefined || loading) return;
    const requestGeneration = generation.current;
    try {
      const result = await post<{ ok: boolean; message?: string; hash?: string; json?: string }>(
        '/api/god/editor/world-event',
        { id },
      );
      if (requestGeneration !== generation.current) return;
      if (!result.ok || !result.json || result.hash !== entry.hash)
        throw new Error(result.message ?? 'This world event changed. Refresh and try again.');
      setEvents((entries) =>
        entries.map((event) =>
          event.id === id && event.hash === result.hash ? { ...event, json: result.json } : event,
        ),
      );
    } catch (reason) {
      if (requestGeneration === generation.current) setError(String(reason));
    }
  };
  if (!loaded || needsReload)
    return (
      <EditorReload
        title="World Events"
        saved={needsReload}
        loading={loading}
        error={error}
        reload={load}
        close={close}
      />
    );
  return (
    <EditorPanel
      title="World Events"
      dirty={dirty}
      saving={saving || loading}
      error={error}
      onSave={save}
      onDiscard={() => {
        generation.current++;
        setEvents(structuredClone(loaded?.events ?? []));
        setSelected(null);
        drafts.current.clear();
        setDirtyEventIds(new Set());
        setError('');
      }}
      onClose={close}
      tabs={[
        {
          id: 'story',
          label: 'Story mechanism',
          icon: 'ui.inview',
          content: <StoryMechanismEditor />,
        },
        {
          id: 'events',
          label: 'World Events',
          icon: 'ui.inview',
          content: (
            <div className="ol-editor-fixed-tab">
              <RefreshHead
                refreshedAt={refreshedAt}
                refresh={() =>
                  dirty ? setError('Save or discard your changes before refreshing.') : void load()
                }
              />
              {loaded?.before !== undefined && (
                <Button disabled={loading} onPress={() => void older()}>
                  Older events
                </Button>
              )}
              <div className="ol-entry-editor" data-detail={!!current || undefined}>
                <div className="ol-entry-list">
                  {events.map((event) => (
                    <article
                      key={event.id}
                      className="ol-editor-entry"
                      data-selected={event.id === selected}
                    >
                      <button type="button" onClick={() => void openEvent(event.id)}>
                        <span>
                          <Tag>{event.type}</Tag>
                          <time>{gameDate(event.time)}</time>
                        </span>
                        <strong>{event.text}</strong>
                        <small>{event.actors.join(' · ')}</small>
                      </button>
                      <IconButton
                        icon="ui.close"
                        label="Delete world event"
                        onPress={() => {
                          setEvents((currentEvents) =>
                            currentEvents.filter((entry) => entry.id !== event.id),
                          );
                          setDirtyEventIds((currentIds) => new Set(currentIds).add(event.id));
                          if (selected === event.id) setSelected(null);
                        }}
                      />
                    </article>
                  ))}
                </div>
                {current && (
                  <div className="ol-json-detail">
                    <div>
                      <strong>World event JSON</strong>
                      <IconButton
                        icon="ui.close"
                        label="Close JSON editor"
                        onPress={() => setSelected(null)}
                      />
                    </div>
                    {current.json === undefined ? (
                      <p className="ol-json-loading">Loading JSON…</p>
                    ) : (
                      <JsonDraft
                        key={current.id}
                        label="World event JSON"
                        initial={drafts.current.get(current.id) ?? current.json}
                        update={(json) => {
                          const first = !drafts.current.has(current.id);
                          drafts.current.set(current.id, json);
                          if (first) setDirtyEventIds((ids) => new Set(ids).add(current.id));
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}

function EditorReload({
  title,
  saved,
  loading,
  error,
  reload,
  close,
}: {
  title: string;
  saved: boolean;
  loading: boolean;
  error: string;
  reload(): Promise<void>;
  close(): void;
}) {
  return (
    <EditorPanel
      title={title}
      dirty={false}
      saving={loading}
      error={error}
      onSave={async () => false}
      onClose={close}
      tabs={[
        {
          id: 'reload',
          label: title,
          icon: 'ui.refresh',
          content: (
            <>
              <p>
                {saved
                  ? 'Changes saved. Reload the latest entries to continue editing.'
                  : 'Load the latest entries to begin editing.'}
              </p>
              <Button busy={loading} onPress={() => void reload()}>
                Refresh entries
              </Button>
            </>
          ),
        },
      ]}
    />
  );
}
