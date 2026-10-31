import { hasRecordFields, isSafeRecordId } from './records.js';

/** Selected-world vocabulary for the finite native expression family. Contact is
 * one checked occurrence, never an injury, continued activity or social verdict. */
export interface ExpressionDefinition {
  id: string;
  label: string;
  verb: string;
  description: string;
  target: 'optional' | 'required';
  targetJoiner: string;
  possessiveSuffix?: string;
  reach?: number;
  contact?: { kind: string; felt: string };
}

export function validateExpressions(value: ExpressionDefinition[]): void {
  if (!Array.isArray(value)) throw new Error('Invalid expressions.');
  const ids = new Set<string>();
  const text = (s: unknown, max: number) => typeof s === 'string' && !!s.trim() && s.length <= max;
  for (const d of value) {
    if (
      !hasRecordFields(
        d,
        ['id', 'label', 'verb', 'description', 'target', 'targetJoiner'],
        ['possessiveSuffix', 'reach', 'contact'],
      ) ||
      !isSafeRecordId(d.id) ||
      // Every installed ID must fit the ordinary command and response wire contract.
      d.id.length > 120 ||
      !/^[a-zA-Z0-9_.:-]+$/.test(d.id) ||
      ids.has(d.id) ||
      !text(d.label, 80) ||
      !text(d.verb, 40) ||
      !text(d.description, 500) ||
      !['optional', 'required'].includes(d.target) ||
      typeof d.targetJoiner !== 'string' ||
      d.targetJoiner.length > 40 ||
      (d.possessiveSuffix !== undefined && !text(d.possessiveSuffix, 80)) ||
      (d.reach !== undefined && (!Number.isFinite(d.reach) || d.reach <= 0)) ||
      (d.contact !== undefined &&
        (!hasRecordFields(d.contact, ['felt', 'kind']) ||
          !isSafeRecordId(d.contact.kind) ||
          !text(d.contact.felt, 160) ||
          d.target !== 'required' ||
          d.reach === undefined))
    )
      throw new Error('Invalid expression definition.');
    ids.add(d.id);
  }
}
