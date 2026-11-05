import { useEffect, useState } from 'react';
import type { CognitionLabPage } from '@open-legend/protocol';
import { SelectField } from '../design-system/components';
import { labRead } from './api';
import { LabError } from './controls';
import { useLabPage, useLabRead } from './use-lab-read';

interface NamedRecord {
  id: string;
  name: string;
  reason?: string;
  description?: string;
  compatible?: boolean;
  withheld?: boolean;
}

/** Selected identity and paged search have separate reads; late search results
 * cannot replace the operator's typed query or require walking earlier pages. */
export function RecordPicker<T extends NamedRecord>({
  label,
  path,
  scope,
  value,
  onChange,
  onRecord,
  filter = '',
  kind,
  emptyLabel,
}: {
  label: string;
  path: '/scenarios' | '/recipes';
  scope: string;
  value?: string;
  onChange(value: string | undefined): void;
  onRecord?(record: T): void;
  filter?: string;
  kind?: 'checkpoint' | 'origin';
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState<string>();
  const [open, setOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ scope: string; record: T }>();
  const selected = useLabRead(value ? JSON.stringify([scope, path, value]) : undefined, (signal) =>
    labRead<CognitionLabPage<T>>(path, { id: value, kind }, signal),
  );
  const search = query ?? filter;
  const page = useLabPage(
    open ? JSON.stringify([scope, path, kind, search]) : undefined,
    (cursor, signal) =>
      labRead<CognitionLabPage<T>>(path, { query: search, kind, cursor, limit: 50 }, signal),
    0,
    search ? 150 : 0,
  );
  const chosen =
    selected.value?.items.find((item) => item.id === value) ??
    (selectedRecord?.scope === scope && selectedRecord.record.id === value
      ? selectedRecord.record
      : undefined);
  useEffect(() => {
    if (chosen) onRecord?.(chosen);
  }, [chosen]);
  const items = [...(page.value?.items ?? [])];
  if (chosen && !items.some((item) => item.id === chosen.id)) items.unshift(chosen);
  const options = items.map((item) => ({
    id: item.id,
    label: item.name,
    description: item.reason ?? item.description,
  }));
  if (emptyLabel) options.unshift({ id: '', label: emptyLabel, description: undefined });
  return (
    <div className="cl-stack">
      <SelectField
        label={label}
        value={value ?? ''}
        options={options}
        inputValue={query ?? chosen?.name ?? (!value ? emptyLabel : '') ?? ''}
        onInputChange={setQuery}
        onChange={(id) => {
          const record = items.find((item) => item.id === id);
          if (record) {
            setSelectedRecord({ scope, record });
            onRecord?.(record);
          }
          onChange(id || undefined);
          setQuery(undefined);
          setOpen(false);
        }}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery(undefined);
        }}
        onLoadMore={page.value?.nextCursor ? page.loadMore : undefined}
        loading={selected.pending || page.pending}
        disabledKeys={items
          .filter((item) => item.withheld || item.compatible === false)
          .map((item) => item.id)}
        placeholder={`Find ${label.toLocaleLowerCase()}…`}
        placement="bottom start"
      />
      <LabError message={selected.error || page.error} />
    </div>
  );
}
