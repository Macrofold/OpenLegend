import { useEffect, useRef, useState } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type {
  ApiResult,
  FamilyEdit,
  FamilyPeoplePage,
  FamilyPerson,
  FamilyView,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, SelectField, Tag } from '../design-system/components';

type Failure = { ok: false; message?: string };
function FamilyPersonPicker({
  label,
  value,
  disabled,
  onOpenChange,
  onSelect,
}: {
  label: string;
  value: FamilyPerson | null;
  disabled: boolean;
  onOpenChange(open: boolean): void;
  onSelect(person: FamilyPerson | null): void;
}) {
  const [text, setText] = useState(value?.label ?? '');
  const [rows, setRows] = useState<FamilyPerson[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const query = text === value?.label ? '' : text;
  useEffect(() => setText(value?.label ?? ''), [value?.id, value?.label]);
  function load(after?: string) {
    const serial = ++request.current;
    setLoading(true);
    void post<FamilyPeoplePage | Failure>('/api/god/family/people', {
      query: query.slice(0, 120),
      ...(after ? { after } : {}),
    })
      .then((result) => {
        if (serial !== request.current) return;
        if (!result.ok) {
          setError(result.message ?? 'Search unavailable.');
          return;
        }
        setError('');
        setRows((current) =>
          after
            ? [...current, ...result.people.filter((p) => !current.some((c) => c.id === p.id))]
            : result.people,
        );
        setNext(result.next);
      })
      .catch((error) => {
        if (serial === request.current) setError(String(error));
      })
      .finally(() => {
        if (serial === request.current) setLoading(false);
      });
  }
  useEffect(() => {
    setRows([]);
    setNext(null);
    setLoading(true);
    const timer = setTimeout(() => load(), 150);
    return () => {
      clearTimeout(timer);
      request.current++;
    };
  }, [query]);
  const choices = value ? [value, ...rows.filter((p) => p.id !== value.id)] : rows;
  return (
    <div inert={disabled || undefined}>
      <SelectField
        onOpenChange={onOpenChange}
        placement="bottom start"
        label={label}
        value={value?.id ?? ''}
        inputValue={text}
        onInputChange={setText}
        loading={loading}
        placeholder="Search characters…"
        toggleLabel={`Show ${label.toLowerCase()} choices`}
        options={[
          { id: '', label: 'Choose a character' },
          ...choices.map((p) => ({ id: p.id, label: p.label, description: p.detail })),
        ]}
        onLoadMore={next && !loading ? () => load(next) : undefined}
        onChange={(id) => {
          const chosen = choices.find((p) => p.id === id) ?? null;
          setText(chosen?.label ?? '');
          onOpenChange(false);
          onSelect(chosen);
        }}
      />
      <p className="ol-meta" role="status">
        {error || (!loading && query && !rows.length ? 'No matching characters.' : '')}
      </p>
    </div>
  );
}

export function FamilyEditor({
  actorId,
  title,
  close,
}: {
  actorId: string;
  title: string;
  close(): void;
}) {
  const [focus, setFocus] = useState(actorId);
  const [parent, setParent] = useState<FamilyPerson | null>(null);
  const [view, setView] = useState<FamilyView | null>(null);
  const [after, setAfter] = useState<string | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deletion, setDeletion] = useState<
    (FamilyView['relations'][number] & { revision: number; generation: string }) | null
  >(null);
  const [pending, setPending] = useState<FamilyEdit | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void post<FamilyView | Failure>('/api/god/family', {
      actorId: focus,
      ...(after ? { after } : {}),
      ...(parent ? { parentId: parent.id } : {}),
    })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError(result.message ?? 'Family unavailable.');
          setView(null);
          return;
        }
        setView(result);
      })
      .catch((error) => {
        if (active) {
          setError(String(error));
          setView(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [focus, parent?.id, after, refresh]);
  function navigate(id: string) {
    setFocus(id);
    setParent(null);
    setDeletion(null);
    setAfter(undefined);
    setView(null);
    setNotice('');
  }
  async function submit(change?: FamilyEdit['change']) {
    if (!view || busy || loading) return;
    const request =
      pending ??
      (change
        ? {
            id: crypto.randomUUID(),
            generation:
              change.kind === 'remove' && deletion ? deletion.generation : view.generation,
            revision: change.kind === 'remove' && deletion ? deletion.revision : view.revision,
            change,
          }
        : null);
    if (!request) return;
    setPending(request);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await post<ApiResult>('/api/god/family/edit', request);
      setPending(null);
      if (!result.ok) {
        setError(result.message ?? 'Edit rejected. Refresh and try again.');
        return;
      }
      setNotice(result.message ?? 'Saved.');
      setDeletion(null);
      setParent(null);
      setAfter(undefined);
      setRefresh((n) => n + 1);
    } catch (failure) {
      setError(`${String(failure)} Retry the same edit to recover its result.`);
    } finally {
      setBusy(false);
    }
  }
  const locked = busy || !!pending;
  return (
    <ModalOverlay
      className="ol-root ol-modal-overlay"
      isOpen
      isDismissable={false}
      isKeyboardDismissDisabled={busy || pickerOpen}
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <Modal className="ol-modal">
        <Dialog className="ol-person-dialog ol-family-dialog" aria-label={title}>
          <header className="ol-modal-head">
            <div>
              <Tag tone="highlight">God mode</Tag>
              <h2 className="ol-heading">{view?.policy.title ?? title}</h2>
            </div>
            <Button variant="quiet" disabled={busy} onPress={close}>
              Close
            </Button>
          </header>
          <div className="ol-family-body">
            {view && (
              <>
                <p>{view.policy.guidance}</p>
                <FamilyPersonPicker
                  onOpenChange={setPickerOpen}
                  label={view.policy.childLabel}
                  value={view.actor}
                  disabled={locked}
                  onSelect={(person) => {
                    if (person) navigate(person.id);
                  }}
                />
                <FamilyPersonPicker
                  onOpenChange={setPickerOpen}
                  label={view.policy.parentLabel}
                  value={parent}
                  disabled={locked}
                  onSelect={(person) => {
                    setParent(person);
                    setDeletion(null);
                  }}
                />
                {parent && (
                  <div className="ol-family-confirm">
                    <p>{view.preview ?? 'Loading preview…'}</p>
                    <Button
                      variant="primary"
                      disabled={locked || loading || !view.preview}
                      onPress={() =>
                        void submit({
                          kind: 'add',
                          link: { id: crypto.randomUUID(), parentId: parent.id, childId: focus },
                        })
                      }
                    >
                      {view.policy.recordLabel}
                    </Button>
                  </div>
                )}
                <h3>Recorded family of {view.actor.label}</h3>
                <p className="ol-meta">
                  Descriptions are calculated from recorded ancestry. This view does not establish
                  what characters know.
                </p>
                {!view.relations.length && !loading && (
                  <p>No relationships in this part of the recorded tree.</p>
                )}
                <ul className="ol-family-list">
                  {view.relations.map((row) => (
                    <li key={`${row.actorId}:${row.description}`}>
                      <div>
                        <Button
                          variant="quiet"
                          disabled={locked || loading}
                          onPress={() => navigate(row.actorId)}
                        >
                          {row.label}
                        </Button>
                        <span>{row.description}</span>
                      </div>
                      {row.link && (
                        <Button
                          variant="quiet"
                          size="sm"
                          disabled={locked || loading}
                          onPress={() => {
                            setDeletion({
                              ...row,
                              revision: view.revision,
                              generation: view.generation,
                            });
                            setParent(null);
                          }}
                        >
                          Delete link
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="ol-actions">
                  {after && (
                    <Button
                      variant="quiet"
                      disabled={locked || loading}
                      onPress={() => setAfter(undefined)}
                    >
                      First page
                    </Button>
                  )}
                  {view.next && (
                    <Button
                      variant="quiet"
                      disabled={locked || loading}
                      onPress={() => setAfter(view.next ?? undefined)}
                    >
                      Next page
                    </Button>
                  )}
                </div>
                {deletion?.link && (
                  <div className="ol-family-confirm">
                    <p>Delete this recorded link? {deletion.deletion}</p>
                    <p>Computed relationships will update. Memories will stay unchanged.</p>
                    <Button
                      disabled={locked || loading}
                      onPress={() => void submit({ kind: 'remove', link: deletion.link! })}
                    >
                      Confirm deletion
                    </Button>
                    <Button variant="quiet" disabled={locked} onPress={() => setDeletion(null)}>
                      Cancel deletion
                    </Button>
                  </div>
                )}
              </>
            )}
            {loading && <p role="status">Loading family…</p>}
            {error && <p role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
          </div>
          <footer className="ol-modal-actions">
            {pending ? (
              <Button disabled={busy || loading} onPress={() => void submit()}>
                Retry same edit
              </Button>
            ) : (
              <Button
                variant="quiet"
                disabled={busy || loading}
                onPress={() => {
                  setAfter(undefined);
                  setDeletion(null);
                  setRefresh((n) => n + 1);
                }}
              >
                Refresh family
              </Button>
            )}
          </footer>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
