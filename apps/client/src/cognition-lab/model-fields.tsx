import { useEffect, useRef, useState } from 'react';
import { post, postPrivateRead } from '../api';

type Option = { id: string; name: string };
type Ref = { reference: string; label: string };
type Subject =
  | { kind: 'person'; person: Ref }
  | { kind: 'object'; object: Ref }
  | { kind: 'relation'; from: Ref; to: Ref }
  | { kind: 'scene' };
type Value =
  | { kind: 'text'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | {
      kind: 'meter';
      value: number;
      minimum: number | null;
      maximum: number | null;
      unit: string | null;
    };
type Field = {
  id: string;
  label: string;
  description: string;
  subject: Subject;
  value: Value;
  recipients: Ref[];
  enabled: boolean;
};
type Revision = { scenario: string; revision: number };
type Page = {
  ok: boolean;
  message?: string;
  revision: Revision;
  fields: { id: string; label: string; enabled: boolean }[];
  next: string | null;
};
const contact = (option?: Option): Ref => ({
  reference: option?.id ?? '',
  label: option?.name ?? '',
});
const matches = (a: Ref, b: Option) => a.reference === b.id;

export function ModelFields({
  actor,
  people,
  objects,
  control,
  onDirtyChange,
}: {
  actor: Option;
  people: Option[];
  objects: Option[];
  control: boolean;
  onDirtyChange(dirty: boolean): void;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page>();
  const [draft, setDraft] = useState<Field>();
  const [original, setOriginal] = useState<Field>();
  const [revision, setRevision] = useState<Revision>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const epoch = useRef(0);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  async function perform(run: () => Promise<void>) {
    if (pending.current) return;
    const cut = epoch.current;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      await run();
    } catch (e) {
      if (epoch.current === cut)
        setMessage(e instanceof Error ? e.message : 'The Lab did not confirm this operation.');
    } finally {
      if (epoch.current === cut) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function list(after?: string) {
    const result = await postPrivateRead<Page>('/api/cognition-lab/fields', {
      actor: actor.id,
      ...(after ? { after } : {}),
    });
    if (!result.ok) throw new Error(result.message || 'The field list is unavailable.');
    setPage((old) =>
      after &&
      old &&
      old.revision.scenario === result.revision.scenario &&
      old.revision.revision === result.revision.revision
        ? { ...result, fields: [...old.fields, ...result.fields] }
        : result,
    );
    setRevision(result.revision);
  }
  async function select(id: string) {
    const result = await postPrivateRead<{
      ok: boolean;
      message?: string;
      field: Field;
      revision: Revision;
    }>('/api/cognition-lab/fields/detail', { id });
    if (!result.ok) throw new Error(result.message || 'The field is unavailable.');
    setDraft(result.field);
    setOriginal(result.field);
    setRevision(result.revision);
  }
  async function save(remove = false) {
    if (!draft || !revision) return;
    const response = await post('/api/cognition-lab/fields/edit', {
      id: draft.id,
      expected: revision,
      field: remove ? null : draft,
    });
    if (!response.ok) throw new Error(response.message || 'The field could not be updated.');
    onDirtyChange(false);
    setDraft(undefined);
    setOriginal(undefined);
    await list();
    setMessage(remove ? 'Field removed.' : 'Field saved.');
  }
  function newField() {
    onDirtyChange(true);
    setOriginal(undefined);
    setRevision(page?.revision);
    setDraft({
      id: crypto.randomUUID(),
      label: '',
      description: '',
      enabled: true,
      subject: { kind: 'person', person: contact(actor) },
      value: { kind: 'text', value: '' },
      recipients: [contact(actor)],
    });
  }
  function choose(label: string, options: Option[], value: Ref, set: (ref: Ref) => void) {
    return (
      <label>
        {label}{' '}
        <select
          value={value.reference}
          onChange={(e) => set(contact(options.find((o) => o.id === e.target.value)))}
        >
          <option value="">Choose subject</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function change(edit: Partial<Field>) {
    if (draft) {
      onDirtyChange(true);
      setDraft({ ...draft, ...edit });
    }
  }
  const value = draft?.value;
  const subject = draft?.subject;
  return (
    <details
      onToggle={(e) => {
        setOpen(e.currentTarget.open);
        if (e.currentTarget.open && !page) void perform(() => list());
      }}
    >
      <summary>Model-only fields</summary>
      {open && (
        <>
          <p>
            These values enter the selected recipients’ decision inputs. Each field records its
            subject and source description.
          </p>
          {page?.fields.map((f) => (
            <button
              key={f.id}
              disabled={busy || !!draft}
              onClick={() => void perform(() => select(f.id))}
            >
              {f.label}
              {f.enabled ? '' : ' (disabled)'}
            </button>
          ))}
          {page?.next && (
            <button disabled={busy || !!draft} onClick={() => void perform(() => list(page.next!))}>
              More fields
            </button>
          )}
          {page && !draft && (
            <button disabled={busy || !control} onClick={newField}>
              Add field
            </button>
          )}
          {!draft && (
            <button disabled={busy} onClick={() => void perform(() => list())}>
              Reload fields
            </button>
          )}
          {draft && value && subject && (
            <fieldset disabled={busy || !control}>
              <legend>{original ? 'Edit model-only field' : 'New model-only field'}</legend>
              <label>
                Label{' '}
                <input value={draft.label} onChange={(e) => change({ label: e.target.value })} />
              </label>
              <label>
                Meaning and source{' '}
                <textarea
                  value={draft.description}
                  onChange={(e) => change({ description: e.target.value })}
                />
              </label>
              <label>
                Subject{' '}
                <select
                  value={subject.kind}
                  onChange={(e) => {
                    let next: Subject;
                    switch (e.target.value) {
                      case 'person':
                        next = { kind: 'person', person: contact(actor) };
                        break;
                      case 'object':
                        next = { kind: 'object', object: contact(objects[0]) };
                        break;
                      case 'relation':
                        next = {
                          kind: 'relation',
                          from: contact(actor),
                          to: contact(people.find((p) => p.id !== actor.id)),
                        };
                        break;
                      default:
                        next = { kind: 'scene' };
                    }
                    change({ subject: next });
                  }}
                >
                  <option value="person">Person</option>
                  <option value="relation">Directed relation</option>
                  <option value="object">Object</option>
                  <option value="scene">Scene</option>
                </select>
              </label>
              {subject.kind === 'person' &&
                choose('Person', people, subject.person, (person) =>
                  change({ subject: { kind: 'person', person } }),
                )}
              {subject.kind === 'object' &&
                choose('Object', objects, subject.object, (object) =>
                  change({ subject: { kind: 'object', object } }),
                )}
              {subject.kind === 'relation' && (
                <>
                  {choose('From', people, subject.from, (from) =>
                    change({ subject: { ...subject, from } }),
                  )}
                  {choose('Toward', people, subject.to, (to) =>
                    change({ subject: { ...subject, to } }),
                  )}
                </>
              )}
              <label>
                Type{' '}
                <select
                  value={value.kind}
                  onChange={(e) => {
                    const kind = e.target.value;
                    change({
                      value:
                        kind === 'text'
                          ? { kind, value: '' }
                          : kind === 'boolean'
                            ? { kind, value: false }
                            : kind === 'number'
                              ? { kind, value: 0 }
                              : {
                                  kind: 'meter',
                                  value: 0,
                                  minimum: null,
                                  maximum: null,
                                  unit: null,
                                },
                    });
                  }}
                >
                  <option value="text">Text</option>
                  <option value="boolean">True or false</option>
                  <option value="number">Number</option>
                  <option value="meter">Meter</option>
                </select>
              </label>
              <label>
                Value{' '}
                {value.kind === 'text' ? (
                  <textarea
                    value={value.value}
                    onChange={(e) => change({ value: { ...value, value: e.target.value } })}
                  />
                ) : value.kind === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={value.value}
                    onChange={(e) => change({ value: { ...value, value: e.target.checked } })}
                  />
                ) : (
                  <input
                    type="number"
                    step="any"
                    value={Number.isFinite(value.value) ? value.value : ''}
                    onChange={(e) => change({ value: { ...value, value: e.target.valueAsNumber } })}
                  />
                )}
              </label>
              {value.kind === 'meter' && (
                <>
                  {(['minimum', 'maximum'] as const).map((k) => (
                    <label key={k}>
                      {k}{' '}
                      <input
                        type="number"
                        step="any"
                        value={value[k] ?? ''}
                        onChange={(e) =>
                          change({
                            value: {
                              ...value,
                              [k]: e.target.value === '' ? null : e.target.valueAsNumber,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Unit{' '}
                    <input
                      value={value.unit ?? ''}
                      onChange={(e) =>
                        change({ value: { ...value, unit: e.target.value || null } })
                      }
                    />
                  </label>
                </>
              )}
              <fieldset>
                <legend>Who receives this context</legend>
                {people.map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={draft.recipients.some((r) => matches(r, p))}
                      onChange={(e) =>
                        change({
                          recipients: e.target.checked
                            ? [...draft.recipients, contact(p)]
                            : draft.recipients.filter((r) => !matches(r, p)),
                        })
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </fieldset>
              <label>
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => change({ enabled: e.target.checked })}
                />
                Enabled
              </label>
              <button
                disabled={!draft.label.trim() || !draft.recipients.length}
                onClick={() => void perform(() => save())}
              >
                Apply field
              </button>
              {original && (
                <button onClick={() => void perform(() => save(true))}>Remove field</button>
              )}
            </fieldset>
          )}
          {draft && (
            <button
              disabled={busy}
              onClick={() => {
                onDirtyChange(false);
                setDraft(undefined);
                setOriginal(undefined);
              }}
            >
              Close field
            </button>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
