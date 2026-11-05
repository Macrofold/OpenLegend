import { recipeCandidateEnvelopeSchema } from '@open-legend/domain';
import type { JsonSchema } from '@open-legend/ai';
import { z } from 'zod';

/** Reuse exact request-bound schemas without repeating every permitted handle.
 * The AI boundary admits only acyclic references inside these captured definitions.
 * docs/technical/situation-aware-cognition-context.md#95-ref-is-a-separate-gated-refinement */
export function modelJsonSchema(schema: z.ZodType): JsonSchema {
  const options = { target: 'draft-7', cycles: 'throw', unrepresentable: 'throw' } as const;
  const factored = z.toJSONSchema(schema, { ...options, reused: 'ref' });
  // Zod chooses the draft7 map name. Normalize only generated schema metadata;
  // enum/constant/default/example values (including objects named "$ref") are data.
  function normalize(node: unknown): void {
    if (Array.isArray(node)) {
      for (const child of node) normalize(child);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const value = node as Record<string, unknown>;
    // Zod omits required for an empty strict object; providers still require
    // every object to declare its (empty) complete property set explicitly.
    if (
      value.type === 'object' &&
      value.additionalProperties === false &&
      value.required === undefined &&
      value.properties &&
      typeof value.properties === 'object' &&
      !Array.isArray(value.properties) &&
      !Object.keys(value.properties).length
    )
      value.required = [];
    if (typeof value.$ref === 'string' && value.$ref.startsWith('#/definitions/'))
      value.$ref = `#/$defs/${value.$ref.slice('#/definitions/'.length)}`;
    for (const [key, child] of Object.entries(value)) {
      if (
        ['properties', 'patternProperties', 'definitions', '$defs', 'dependentSchemas'].includes(
          key,
        ) &&
        child &&
        typeof child === 'object' &&
        !Array.isArray(child)
      )
        for (const schema of Object.values(child)) normalize(schema);
      else if (!['const', 'enum', 'default', 'examples', '$ref'].includes(key)) normalize(child);
    }
  }
  normalize(factored);
  const { definitions, ...root } = factored;
  if (!definitions) return factored;
  const shared = { ...root, $defs: definitions };
  const inline = z.toJSONSchema(schema, { ...options, reused: 'inline' });
  normalize(inline);
  return Buffer.byteLength(JSON.stringify(shared)) < Buffer.byteLength(JSON.stringify(inline))
    ? shared
    : inline;
}

/** Transport envelope only. Native admission and generation use the installed selected family. */
export const declarationSchema: JsonSchema = recipeCandidateEnvelopeSchema;
