import type {
  CognitionLabEdit,
  CognitionLabField,
  CognitionLabJson,
  CognitionLabOperation,
  CognitionLabReceipt,
} from '@open-legend/protocol';

type WithoutCommand<T> = T extends { commandId: string } ? Omit<T, 'commandId'> : never;
export type LabIntention = WithoutCommand<CognitionLabOperation>;
export type LabExecute = (operation: LabIntention) => Promise<CognitionLabReceipt | undefined>;

export interface LabDraft {
  id: string;
  scope: string;
  actorId: string;
  actorName: string;
  field: CognitionLabField;
  value: string | boolean;
  hold?: boolean;
}

export function draftEdit(draft: LabDraft): CognitionLabEdit {
  const field = draft.field;
  const value = fieldDraftValue(field, draft.value);
  if (!field.owner) throw new Error(`${field.label} does not expose an editor.`);
  return {
    actorId: draft.actorId,
    fieldId: field.id,
    owner: field.owner,
    value,
    baseValue: field.value,
    token: field.token,
    hold: draft.hold,
  };
}

export function fieldDraftValue(field: CognitionLabField, raw: string | boolean): CognitionLabJson {
  let value: CognitionLabJson;
  if (field.datatype === 'boolean') value = raw === true;
  else if (field.datatype === 'number' || field.datatype === 'meter') {
    const input = String(raw).trim();
    if (!input) throw new Error(`${field.label} needs a number.`);
    value = Number(input);
    if (!Number.isFinite(value)) throw new Error(`${field.label} needs a finite number.`);
  } else if (field.datatype === 'json') {
    try {
      value = JSON.parse(String(raw)) as CognitionLabJson;
    } catch {
      throw new Error(`${field.label} needs valid JSON. Your draft is unchanged.`);
    }
  } else value = String(raw);
  return value;
}

export function draftValue(field: CognitionLabField): string | boolean {
  return field.datatype === 'boolean'
    ? field.value === true
    : field.datatype === 'json'
      ? JSON.stringify(field.value, null, 2)
      : field.value === null
        ? ''
        : typeof field.value === 'string' || typeof field.value === 'number'
          ? String(field.value)
          : JSON.stringify(field.value);
}

export function draftGroup(draft: LabDraft): string {
  return JSON.stringify([draft.scope, draft.actorId, draft.field.owner, draft.field.applyGroup]);
}

export function readableStatus(status: string): string {
  return status.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replaceAll(/[_-]/g, ' ');
}

export function bytesLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
}

export function instantLabel(time: number): string {
  return new Date(time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}
