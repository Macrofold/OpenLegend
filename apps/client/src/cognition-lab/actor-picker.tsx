import { useEffect, useState } from 'react';
import type { CognitionLabActor, CognitionLabPage } from '@open-legend/protocol';
import { SelectField } from '../design-system/components';
import { labRead } from './api';
import { useLabPage, useLabRead } from './use-lab-read';

/** Resolve only the selected person, using the same scope and privacy clearing as the picker. */
export function useLabActor(scope: string, id: string | undefined, revision = 0) {
  const key = id ? JSON.stringify([scope, id]) : undefined;
  const [unavailableKey, setUnavailableKey] = useState<string>();
  const selected = useLabRead(
    key,
    (signal) => labRead<CognitionLabPage<CognitionLabActor>>('/actors', { id }, signal),
    revision,
  );
  const actor = selected.value?.items[0];
  const missing =
    !!key &&
    !actor &&
    !selected.pending &&
    (selected.value !== undefined || selected.error !== undefined);
  // A known missing/refused person cannot return from a stale option page while
  // an exact refresh is pending. A successful exact result wins immediately.
  const unavailable = !!key && !actor && (missing || unavailableKey === key);
  useEffect(() => {
    if (!key || actor) setUnavailableKey(undefined);
    else if (missing) setUnavailableKey(key);
    else setUnavailableKey((previous) => (previous === key ? previous : undefined));
  }, [key, actor, missing]);
  return { ...selected, actor, unavailable };
}

export function ActorPicker({
  label,
  scope,
  value,
  onChange,
  optional = false,
  disabled = false,
  onActor,
  revision = 0,
}: {
  label: string;
  scope: string;
  value?: string;
  onChange(value: string | undefined): void;
  optional?: boolean;
  disabled?: boolean;
  onActor?(actor: CognitionLabActor): void;
  revision?: number;
}) {
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<{ scope: string; id: string; name: string }>();
  const selected = useLabActor(scope, value, revision);
  const page = useLabPage(
    open ? JSON.stringify([scope, query ?? '']) : undefined,
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabActor>>('/actors', { query, cursor, limit: 50 }, signal),
    0,
    query ? 150 : 0,
  );
  const chosen = selected.actor;
  const unavailable = selected.unavailable;
  useEffect(() => {
    if (chosen) onActor?.(chosen);
    // A picked label bridges only its first exact read. Missing/refused results
    // must revoke it permanently, including before a later refresh starts.
    if (selected.value !== undefined || selected.error || selectedLabel?.scope !== scope)
      setSelectedLabel(undefined);
  }, [chosen, scope, selected.value, selected.error]);
  const options = (page.value?.items ?? [])
    .filter((actor) => !unavailable || actor.id !== value)
    .map((actor) => ({
      id: actor.id,
      label: actor.name,
      description: actor.description,
    }));
  if (chosen && !options.some((item) => item.id === chosen.id))
    options.unshift({ id: chosen.id, label: chosen.name, description: chosen.description });
  if (optional) options.unshift({ id: '', label: 'No addressee', description: undefined });
  return (
    <SelectField
      label={label}
      value={value ?? ''}
      options={options}
      disabled={disabled}
      inputValue={
        query ??
        chosen?.name ??
        (selectedLabel?.scope === scope &&
        selectedLabel.id === value &&
        selected.value === undefined &&
        !unavailable &&
        !selected.error
          ? selectedLabel.name
          : undefined) ??
        (unavailable ? 'Unavailable person' : undefined) ??
        (optional && !value ? 'No addressee' : '')
      }
      onInputChange={setQuery}
      onChange={(id) => {
        const actor = page.value?.items.find((item) => item.id === id) ?? chosen;
        if (actor?.id === id && !(unavailable && id === value)) {
          setSelectedLabel({ scope, id: actor.id, name: actor.name });
          onActor?.(actor);
        }
        onChange(id || undefined);
        setQuery(undefined);
        setOpen(false);
      }}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery(undefined);
      }}
      loading={selected.pending || page.pending}
      onLoadMore={page.value?.nextCursor ? page.loadMore : undefined}
      placeholder={`Find ${label.toLocaleLowerCase()}…`}
      toggleLabel={`Choose ${label.toLocaleLowerCase()}`}
      placement="bottom start"
    />
  );
}
