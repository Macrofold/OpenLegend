import { useEffect, useId, useRef, useState } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type {
  ActivityChoice,
  ActivityChoicePage,
  ActivityRequestsView,
  ApiResult,
  CommandInput,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button } from '../design-system/components';
import { InventoryDestinations } from './inventory-destinations';
import './camp-activity.css';

type Field = ActivityRequestsView['requests'][number]['fields'][string];
export function ActivityObjectField({
  family,
  fieldId,
  field,
  value,
  witnessId,
  sourceId,
  scope,
  readKey,
  page,
  visible,
  connected,
  working,
  busy,
  readOnly = false,
  onRead,
  onChange,
  onAction,
}: {
  family: string;
  fieldId: string;
  field: Field;
  value: string;
  witnessId?: string;
  sourceId?: string;
  scope: string;
  readKey: string;
  page?: ActivityChoicePage;
  visible: boolean;
  connected: boolean;
  working: boolean;
  busy: boolean;
  /** The initiating world object supplies this role; reading it must not ask for it again. */
  readOnly?: boolean;
  onRead(key: string, page: ActivityChoicePage): void;
  onChange(choice: ActivityChoice): void;
  onAction(input: CommandInput, label: string): Promise<ApiResult | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const errorKey = JSON.stringify([scope, family, fieldId, value, witnessId, sourceId]);
  const [error, setError] = useState<{ key: string; message: string }>();
  const [acting, setActing] = useState(false);
  const alive = useRef(true);
  const latestRead = useRef(readKey);
  latestRead.current = readKey;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const body = { family, field: fieldId, sourceId, selectedId: value, witnessId };
  useEffect(() => {
    if (!visible || !connected || !value) return;
    const abort = new AbortController();
    void post<ActivityChoicePage>('/api/activity-choices', body, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted)
          onRead(
            readKey,
            result.ok && result.scope === scope
              ? result
              : {
                  ok: false,
                  scope,
                  status: 'unavailable',
                  choices: [],
                  evidence: '',
                  message: result.message ?? 'Selection is unavailable. Refresh this field.',
                },
          );
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          onRead(readKey, {
            ok: false,
            scope,
            status: 'unavailable',
            choices: [],
            evidence: '',
            message: reason instanceof Error ? reason.message : 'Selection is unavailable.',
          });
      });
    return () => abort.abort();
  }, [readKey, visible, connected]);
  const selected = page?.selected;
  const close = () => {
    setOpen(false);
  };
  const choose = (choice: ActivityChoice) => {
    onChange(choice);
    close();
  };
  async function act(approach = false, next = false) {
    if (!connected || busy || acting || !selected) return;
    const actionRead = readKey;
    setActing(true);
    setError(undefined);
    try {
      let input: CommandInput;
      if (approach) {
        const current = await post<ActivityChoicePage>('/api/activity-choices', {
          ...body,
          approach: true,
        });
        if (!alive.current) return;
        if (latestRead.current !== actionRead)
          throw new Error(
            'Conditions changed while checking the approach. Recheck this supply and try again.',
          );
        if (!current.ok || current.scope !== scope || !current.selected || !current.stance)
          throw new Error(current.message ?? 'Refresh this target before approaching.');
        input = { type: 'move', position: current.stance };
      } else {
        const inspection = next ? page?.inspection : undefined;
        input = {
          type: 'inspect-inventory',
          containerId: value,
          ...(inspection
            ? {
                after: inspection.after,
                expectedRevision: inspection.revision,
                expectedScope: inspection.scope,
              }
            : {}),
        };
      }
      const result = await onAction(
        input,
        approach ? 'Approach selected storage' : 'Inspect selected contents',
      );
      if (!alive.current) return;
      if (!result?.ok)
        setError({
          key: errorKey,
          message: result?.message ?? 'Delivery is uncertain. Refresh before repeating the action.',
        });
    } catch (reason) {
      if (alive.current)
        setError({
          key: errorKey,
          message: reason instanceof Error ? reason.message : 'This action is unavailable.',
        });
    } finally {
      if (alive.current) setActing(false);
    }
  }
  if (readOnly)
    return (
      <p className="ol-task-bound-target">
        {field.label}: <strong>{selected?.label ?? 'Selected object'}</strong>
        {selected?.location && <> · {selected.location}</>}
        {value && !page && <> · Rechecking…</>}
        {value && page && !selected && <> · {page.message ?? 'No longer available.'}</>}
      </p>
    );
  return (
    <div className="ol-camp-object">
      <span>{field.label}</span>
      <div>
        <Button variant="secondary" disabled={!connected || busy} onPress={() => setOpen(true)}>
          {selected
            ? `Change ${field.label.toLowerCase()}: ${selected.label}`
            : `Choose ${field.label.toLowerCase()}…`}
        </Button>
      </div>
      {value && !page && (
        <p role="status" className="ol-caption">
          Rechecking the selected object…
        </p>
      )}
      {value && page && !selected && (
        <p role="status">
          {page.message ??
            'The earlier selection is no longer evidenced or permitted. Refresh or inspect the selected supply; your draft is retained.'}
        </p>
      )}
      {selected && (
        <>
          <p className="ol-caption">{selected.location}</p>
          {selected.reason && <p className="ol-caption">{selected.reason}</p>}
          {(selected.needsApproach || selected.canInspect) && (
            <div className="ol-actions">
              {selected.needsApproach && (
                <Button
                  size="sm"
                  disabled={busy || acting || !connected}
                  onPress={() => void act(true)}
                >
                  {working ? 'Replace current action and approach' : 'Approach'}
                </Button>
              )}
              {selected.canInspect && (
                <Button
                  size="sm"
                  disabled={busy || acting || !connected}
                  onPress={() => void act()}
                >
                  Inspect contents
                </Button>
              )}
            </div>
          )}
          {selected.needsApproach && (
            <p className="ol-caption">
              Ordinary movement replaces current physical work and keeps completed effects. Arrival
              does not inspect or start the task. Recheck access after arrival.
            </p>
          )}
          {page?.inspection && (
            <div aria-label="Selected contents inspection">
              <p>Character inspected this page of {selected.label}:</p>
              <ul>
                {page.inspection.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.name}
                  </li>
                ))}
              </ul>
              {!page.inspection.items.length && <p>This inspected page is empty.</p>}
              {page.inspection.more && (
                <>
                  <p className="ol-caption">
                    Further contents remain. This page is not a complete stock count.
                  </p>
                  <Button
                    size="sm"
                    disabled={busy || acting || !connected}
                    onPress={() => void act(false, true)}
                  >
                    Inspect next contents page
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}
      {error?.key === errorKey && <p role="alert">{error.message}</p>}
      <ModalOverlay
        className="ol-root ol-modal-overlay"
        isOpen={open && visible && connected && !readOnly}
        isDismissable
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <Modal className="ol-modal">
          <Dialog
            className="ol-person-dialog ol-camp-picker"
            aria-label={`Choose ${field.label.toLowerCase()}`}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div onKeyDown={(event) => event.stopPropagation()}>
              {field.discovery?.source === 'storage' ? (
                <InventoryDestinations
                  scope={scope}
                  activity={{ family, field: fieldId }}
                  connected={connected}
                  onCancel={close}
                  onSelect={(entry) =>
                    choose({
                      id: entry.id,
                      label: entry.name,
                      kind: 'entity',
                      roles: [fieldId],
                      accessible: entry.accessible === true,
                      location: entry.location,
                      reason: entry.reason,
                      needsApproach: entry.needsApproach,
                      needsInspection: entry.needsInspection,
                      canInspect: entry.canInspect,
                    })
                  }
                />
              ) : (
                <RoleSearch
                  key={JSON.stringify([scope, family, fieldId, sourceId])}
                  body={{ family, field: fieldId, sourceId }}
                  scope={scope}
                  label={field.label}
                  connected={connected}
                  onCancel={close}
                  onSelect={choose}
                />
              )}
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
function RoleSearch({
  body,
  scope,
  label,
  connected,
  onCancel,
  onSelect,
}: {
  body: { family: string; field: string; sourceId?: string };
  scope: string;
  label: string;
  connected: boolean;
  onCancel(): void;
  onSelect(choice: ActivityChoice): void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    page?: ActivityChoicePage;
    error?: string;
  }>();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const key = JSON.stringify([body, query, cursor, refresh, connected]);
  const current = result?.key === key ? result : undefined;
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    if (!connected) return;
    const abort = new AbortController();
    const timer = setTimeout(
      () => {
        void post<ActivityChoicePage>(
          '/api/activity-choices',
          { ...body, query, cursor },
          abort.signal,
        )
          .then((page) => {
            if (!abort.signal.aborted)
              setResult(
                page.ok && page.scope === scope
                  ? { key, page }
                  : { key, error: page.message ?? 'Search unavailable. Refresh the search.' },
              );
          })
          .catch((reason: unknown) => {
            if (!abort.signal.aborted)
              setResult({
                key,
                error: reason instanceof Error ? reason.message : 'Search unavailable.',
              });
          });
      },
      query ? 150 : 0,
    );
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [key]);
  const page = current?.page;
  const usable = connected && !!page?.ok && ['complete', 'partial'].includes(page.status);
  return (
    <section
      className="ol-inventory-destinations"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="ol-inventory-toolbar">
        <h3>Choose {label.toLowerCase()}</h3>
        <Button size="sm" variant="quiet" onPress={onCancel}>
          Cancel
        </Button>
      </div>
      <label htmlFor={id}>Search {label.toLowerCase()}</label>
      <div className="ol-actions">
        <input
          id={id}
          ref={input}
          type="text"
          value={query}
          maxLength={160}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(undefined);
          }}
        />
        {query && (
          <Button
            size="sm"
            variant="quiet"
            onPress={() => {
              setQuery('');
              setCursor(undefined);
              input.current?.focus();
            }}
          >
            Clear
          </Button>
        )}
      </div>
      {!current && <p role="status">Finding permitted choices…</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {page?.message && <p role="status">{page.message}</p>}
      <ul className="ol-camp-results">
        {page?.choices.map((choice) => (
          <li key={choice.id}>
            <strong>{choice.label}</strong>
            <p id={`${id}-${choice.id}`} className="ol-caption">
              {choice.location}
            </p>
            {choice.reason && <p className="ol-caption">{choice.reason}</p>}
            <Button
              size="sm"
              aria-describedby={`${id}-${choice.id}`}
              disabled={!usable}
              onPress={() => onSelect(choice)}
            >
              Choose {choice.label}
            </Button>
          </li>
        ))}
      </ul>
      {usable && !page?.choices.length && (
        <p role="status">
          {page?.next
            ? 'No match in this part of the search. More objects remain to check.'
            : query
              ? 'No matching permitted object. Clear the search to try again.'
              : 'No eligible objects in this scope.'}
        </p>
      )}
      <div className="ol-actions">
        {usable && page?.next && (
          <Button size="sm" variant="quiet" onPress={() => setCursor(page.next)}>
            Search more choices
          </Button>
        )}
        <Button
          size="sm"
          variant="quiet"
          disabled={!connected}
          onPress={() => {
            setCursor(undefined);
            setRefresh((value) => value + 1);
          }}
        >
          Refresh search
        </Button>
      </div>
      <p className="ol-caption">
        Searching and choosing change only your draft. Starting rechecks current conditions.
      </p>
    </section>
  );
}
