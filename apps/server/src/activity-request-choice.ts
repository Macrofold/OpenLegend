import {
  isSafeRecordId,
  activityRequestChoices,
  activityRequestFieldDependencies,
  activityRequestWorkModeField,
  type ActivityRequestChoice,
  type ActivityRequestDescriptor,
  type ActivityRequestObservation,
  type WorkDemand,
  type WorldState,
} from '@open-legend/domain';
import {
  decodeJudge,
  InvalidData,
  validateJudgmentSize,
  validateQuestions,
  type JudgeRequest,
  type JudgeValue,
  type TypedQuestionMap,
} from '@open-legend/ai';
import { ACTIVITY_PARAMETER_CHOICE_POLICY } from './jev-questions.js';
import type { ModelResponseOperation } from './cognition-contracts.js';

/** Prepared actor-permitted references, possibly replaced by request-local handles. */
export type ActivityRequestChoiceFact = Omit<ActivityRequestChoice, 'id'> & {
  entityId?: string;
  definitionId?: string;
  value?: string;
};

/** A dependent role must not silently lose an eligible alternative just because
 * its identity was absent from the request's frozen reference closure. */
export class ActivityRequestChoicesUnavailable extends Error {}

/** Parent associations use the same namespace as their declared parameter. Never
 * expose a native entity ID because a custom field name escaped ordinary projection. */
export function projectActivityRequestRequirements(
  descriptors: readonly ActivityRequestDescriptor[],
  choice: Pick<ActivityRequestChoice, 'requestIds' | 'requires'>,
  entityReference: (id: string) => string | undefined,
): Record<string, string | number | boolean> | undefined {
  const result: Record<string, string | number | boolean> = {};
  const applicable = descriptors.filter(
    (descriptor) => !choice.requestIds || choice.requestIds.includes(descriptor.id),
  );
  for (const [name, value] of Object.entries(choice.requires ?? {})) {
    const meanings = new Set(
      applicable.flatMap((descriptor) =>
        descriptor.fields[name] ? [descriptor.fields[name]!.type] : [],
      ),
    );
    if (!meanings.size || (meanings.has('entity') && meanings.size > 1)) return;
    if (meanings.has('entity')) {
      const reference = typeof value === 'string' ? entityReference(value) : undefined;
      if (reference === undefined) return;
      result[name] = reference;
    } else result[name] = value;
  }
  return result;
}

/** Query a dependent role through its existing native owner. The caller retains
 * source/authority guards; this projection can only reuse its captured references.
 * A newly visible object needs a fresh decision, not an ambient alias extension. */
export function activityRequestChoiceFacts(
  world: WorldState,
  actorId: string,
  descriptor: ActivityRequestDescriptor,
  field: string,
  parameters: Readonly<Record<string, string | number | boolean>>,
  entityReferences: Readonly<Record<string, string>>,
  observed?: ActivityRequestObservation,
  charge: (demand: WorkDemand) => void = () => {},
): ActivityRequestChoiceFact[] {
  charge({ candidates: Object.keys(entityReferences).length });
  const handles = new Map(Object.entries(entityReferences).map(([handle, id]) => [id, handle]));
  const arguments_: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(parameters)) {
    if (descriptor.fields[name]?.type === 'entity') {
      const id = typeof value === 'string' ? entityReferences[value] : undefined;
      if (!id)
        throw new ActivityRequestChoicesUnavailable('An activity parent reference is unavailable.');
      arguments_[name] = id;
    } else arguments_[name] = value;
  }
  charge({
    candidates:
      (observed?.visibleEntities.length ?? 0) +
      (observed?.inventory.length ?? 0) +
      (observed?.inspectedContainer?.items.length ?? 0) +
      (world.knowledge[actorId]?.length ?? 0),
    tests: Object.keys(parameters).length + 1,
  });
  const selected = activityRequestChoices(world, actorId, observed, {
    family: descriptor.id,
    field,
    arguments: arguments_,
  }).choices;
  charge({
    candidates: selected.length,
    inputBytes: selected.reduce(
      (total, choice) => total + Buffer.byteLength(choice.id) + Buffer.byteLength(choice.label),
      0,
    ),
    tests: selected.reduce(
      (total, choice) => total + Object.keys(choice.requires ?? {}).length + 1,
      0,
    ),
  });
  return selected.flatMap(({ id, requires, ...choice }) => {
    const conditions = projectActivityRequestRequirements(
      [descriptor],
      { ...choice, requires },
      (id) => handles.get(id),
    );
    if (!conditions)
      throw new ActivityRequestChoicesUnavailable(
        'An activity role requires an uncaptured parent reference.',
      );
    const reference = choice.kind === 'entity' ? handles.get(id) : id;
    if (reference === undefined)
      throw new ActivityRequestChoicesUnavailable(
        'An activity role requires an uncaptured entity reference.',
      );
    return [
      {
        ...choice,
        ...(choice.kind === 'entity'
          ? { entityId: reference }
          : choice.kind === 'definition'
            ? { definitionId: reference }
            : { value: reference }),
        ...(requires ? { requires: conditions } : {}),
      },
    ];
  });
}
type Scalar = string | number | boolean;
type Field = ActivityRequestDescriptor['fields'][string];
type Selection =
  | { kind: 'options'; options: Option[] }
  | { kind: 'integer'; minimum: number; maximum: number; offset: number };
interface Option {
  label: string;
  result: Scalar | Selection;
}
interface PendingField {
  name: string;
  label: string;
  selection: Selection;
}
export interface NamedActivityDeadline {
  name: string;
  at: number;
}
export type ActivityRequestChoiceReader = (
  field: string,
  parameters: Readonly<Record<string, Scalar>>,
) => readonly ActivityRequestChoiceFact[];
// Choice permits 255 options; abstention occupies two. Eight rounds cover the full
// safe integer range while bounding dependent judgments; this is not a paid retry.
// docs/projects/parallel-batch-01-playable-week/camp-activities.md#who-chooses-the-work
const MAX_OPTIONS = 253;
const MAX_ROUNDS = 8;
export const ACTIVITY_WORK_MODES = {
  enqueue: {
    label: 'After current work',
    description:
      'Ask to add this activity after current work; incompatible queued work can refuse.',
  },
  replace: {
    label: 'Replace current work',
    description: 'Replace current work with this activity.',
  },
  interrupt: {
    label: 'Pause current work, then resume',
    description: 'Pause current work for this activity, with ordinary revalidation on return.',
  },
} as const;
const modes = Object.fromEntries(
  Object.entries(ACTIVITY_WORK_MODES).map(([key, value]) => [key, value.description]),
);

function compatibleChoices(
  descriptor: ActivityRequestDescriptor,
  name: string,
  field: Field,
  choices: readonly ActivityRequestChoiceFact[],
  parameters: Readonly<Record<string, Scalar>> = {},
): Array<{ choice: ActivityRequestChoiceFact; reference: string }> {
  return choices.flatMap((choice) => {
    const reference =
      field.type === 'entity'
        ? choice.entityId
        : field.type === 'choice'
          ? choice.value
          : choice.definitionId;
    if (typeof reference !== 'string') return [];
    return choice.accessible &&
      choice.kind === field.type &&
      choice.roles.includes(name) &&
      (!choice.requestIds || choice.requestIds.includes(descriptor.id)) &&
      Object.entries(choice.requires ?? {}).every(([key, value]) => parameters[key] === value) &&
      (field.type === 'choice'
        ? typeof reference === 'string' &&
          field.choices.some((option) => option.value === reference)
        : isSafeRecordId(reference))
      ? [{ choice, reference }]
      : [];
  });
}
function usesChoiceFacts(field: Field): boolean {
  return (
    field.type === 'entity' ||
    field.type === 'definition' ||
    (field.type === 'choice' &&
      (!!field.discovery || !!activityRequestFieldDependencies(field).length))
  );
}
function integerBounds(field: Field): [number, number] | undefined {
  const minimum = field.minimum ?? Number.MIN_SAFE_INTEGER;
  const maximum = field.maximum ?? Number.MAX_SAFE_INTEGER;
  return Number.isSafeInteger(minimum) && Number.isSafeInteger(maximum) && minimum <= maximum
    ? [minimum, maximum]
    : undefined;
}
function durationBounds(field: Field): [number, number] | undefined {
  const minimum = field.minimumDuration;
  const maximum = field.maximumDuration;
  return minimum !== undefined &&
    maximum !== undefined &&
    Number.isSafeInteger(minimum) &&
    Number.isSafeInteger(maximum) &&
    minimum > 0 &&
    minimum <= maximum
    ? [minimum, maximum]
    : undefined;
}

/** Route choices describe possibilities, never manufacture a plan or its parameters. */
export function requestRoutes(
  requests: readonly ActivityRequestDescriptor[],
): Map<string, ActivityRequestDescriptor> {
  const routes = new Map<string, ActivityRequestDescriptor>();
  requests.forEach((descriptor, index) => {
    if (
      Object.values(descriptor.fields).every((field) =>
        field.type === 'entity' || field.type === 'definition'
          ? true
          : field.type === 'choice'
            ? field.choices.length > 0
            : field.type === 'integer'
              ? !!integerBounds(field)
              : field.type === 'time'
                ? !!durationBounds(field)
                : field.type === 'mode',
      )
    )
      routes.set(`request_${index}`, descriptor);
  });
  return routes;
}

/** Generation can supply continuous parameters that the Jev frontier chooser
 * cannot enumerate. Discover every actor-supported definition, not that subset. */
export function activityRequestDirectory(
  requests: readonly ActivityRequestDescriptor[],
  includedForms: readonly ActivityRequestDescriptor[] = [],
) {
  // Complete forms already carry their meaning. Keep the additional directory
  // aligned with the actual omitted-family preparation choices, without losing
  // the all-family view used by closed routing and action judgment.
  const included = new Set(includedForms.map((form) => form.id));
  return requests
    .filter((request) => !included.has(request.id))
    .map(({ id, label, description }) => ({ id, label, description }));
}

function fieldSelection(
  descriptor: ActivityRequestDescriptor,
  name: string,
  field: Field,
  choices: readonly ActivityRequestChoiceFact[],
  simTime: number,
  namedDeadlines: readonly NamedActivityDeadline[],
  parameters: Readonly<Record<string, Scalar>>,
): Selection | undefined {
  if (field.type === 'integer') {
    const bounds = integerBounds(field);
    return bounds && { kind: 'integer', minimum: bounds[0], maximum: bounds[1], offset: 0 };
  }
  let options: Option[];
  if (field.type === 'choice' && !usesChoiceFacts(field))
    options = field.choices.map((choice) => ({ label: choice.label, result: choice.value }));
  else if (field.type === 'entity' || field.type === 'definition' || field.type === 'choice') {
    options = compatibleChoices(descriptor, name, field, choices, parameters).map(
      ({ choice, reference }) => ({
        label: `${choice.label} (permitted ${choice.kind} reference ${reference})${choice.distance !== undefined ? `; distance ${choice.distance} metres` : ''}`,
        result: reference,
      }),
    );
  } else if (field.type === 'mode') {
    options = Object.entries(field.modeLabels ?? modes).map(([result, label]) => ({
      label,
      result,
    }));
  } else {
    const bounds = durationBounds(field);
    if (!bounds || !Number.isFinite(simTime) || simTime < 0) return;
    // Freeze absolute deadlines before asking: provider latency cannot silently extend
    // the chosen session. Native admission still checks the resulting current request.
    const valid = (at: number) =>
      Number.isFinite(at) &&
      at > simTime &&
      at - simTime <= bounds[1] &&
      (field.minimum === undefined || at >= field.minimum) &&
      (field.maximum === undefined || at <= field.maximum);
    const minimum = Math.max(bounds[0], Math.ceil((field.minimum ?? simTime) - simTime));
    const maximum = Math.min(
      bounds[1],
      Math.floor((field.maximum ?? simTime + bounds[1]) - simTime),
    );
    options = namedDeadlines
      .filter((deadline) => valid(deadline.at))
      .map((deadline) => ({
        label: `${deadline.name}: absolute simulation deadline ${deadline.at}, ${deadline.at - simTime} simulation seconds from the supplied instant`,
        result: deadline.at,
      }));
    if (Number.isSafeInteger(minimum) && Number.isSafeInteger(maximum) && minimum <= maximum)
      options.push({
        label: `Choose an exact duration of ${minimum} through ${maximum} whole simulation seconds from the supplied instant`,
        result: { kind: 'integer', minimum, maximum, offset: simTime },
      });
  }
  return options.length ? { kind: 'options', options } : undefined;
}

function offeredOptions(selection: Selection): Option[] {
  if (selection.kind === 'options') {
    if (selection.options.length <= MAX_OPTIONS) return selection.options;
    const width = Math.ceil(selection.options.length / MAX_OPTIONS);
    const groups: Option[] = [];
    for (let start = 0; start < selection.options.length; start += width) {
      const options = selection.options.slice(start, start + width);
      groups.push({
        label: `Options ${start + 1}–${start + options.length} of ${selection.options.length}: ${options[0]!.label} through ${options.at(-1)!.label}. Selecting this group shows its entries; it chooses no value yet.`,
        result: { kind: 'options', options },
      });
    }
    return groups;
  }
  const minimum = BigInt(selection.minimum);
  const maximum = BigInt(selection.maximum);
  const count = maximum - minimum + 1n;
  const width = (count + BigInt(MAX_OPTIONS) - 1n) / BigInt(MAX_OPTIONS);
  const options: Option[] = [];
  for (let first = minimum; first <= maximum; first += width) {
    const last = first + width - 1n < maximum ? first + width - 1n : maximum;
    const low = Number(first);
    const high = Number(last);
    options.push({
      label:
        low === high
          ? `Exactly ${low}${selection.offset ? ` simulation seconds; absolute deadline ${selection.offset + low}` : ''}`
          : `An exact integer from ${low} through ${high}, inclusive; narrow this range next`,
      result: low === high ? selection.offset + low : { ...selection, minimum: low, maximum: high },
    });
  }
  return options;
}

/** Jev supplies every selected value through the existing metered judge port.
 * No binding, preview, execution, provider call or repair retry belongs here. */
export async function chooseActivityRequest({
  descriptor,
  choices,
  simTime,
  namedDeadlines,
  state,
  judge,
  prepareChoices,
}: {
  descriptor: ActivityRequestDescriptor;
  choices: readonly ActivityRequestChoiceFact[];
  simTime: number;
  namedDeadlines: readonly NamedActivityDeadline[];
  state: unknown;
  judge: (request: Omit<JudgeRequest, 'requestId' | 'signal'>) => Promise<JudgeValue>;
  /** Validate once after each judgment, then capture a synchronous native reader
   * for the whole dependency frontier. References and time anchors remain bound
   * to the original decision; this scope never grants later execution. */
  prepareChoices?: (
    parameters: Readonly<Record<string, Scalar>>,
  ) => Promise<ActivityRequestChoiceReader>;
}): Promise<{ operations: ModelResponseOperation[] } | undefined> {
  if (!isSafeRecordId(descriptor.id) || !Number.isFinite(simTime) || simTime < 0) return;
  const family = descriptor.id;
  const parameters: Record<string, Scalar> = {};
  const pending: PendingField[] = [];
  const unresolved = new Set(Object.keys(descriptor.fields));
  for (let round = 0; unresolved.size && round < MAX_ROUNDS; round++) {
    const readChoices = prepareChoices && (await prepareChoices(parameters));
    // A selected parent can disappear while a dependent judgment is running.
    // Recheck its exact reference, rather than silently choosing a replacement.
    if (readChoices)
      for (const [name, value] of Object.entries(parameters)) {
        const field = descriptor.fields[name]!;
        if (
          usesChoiceFacts(field) &&
          !compatibleChoices(
            descriptor,
            name,
            field,
            readChoices(name, parameters),
            parameters,
          ).some(({ reference }) => reference === value)
        )
          return;
      }
    for (const name of unresolved) {
      const field = descriptor.fields[name]!;
      const retained = pending.find((entry) => entry.name === name);
      if (retained) {
        if (readChoices && usesChoiceFacts(field)) {
          const fresh = fieldSelection(
            descriptor,
            name,
            field,
            readChoices(name, parameters),
            simTime,
            namedDeadlines,
            parameters,
          );
          if (fresh?.kind !== 'options' || retained.selection.kind !== 'options') return;
          const current = new Map(fresh.options.map((option) => [option.result, option]));
          // Narrowing retains the same candidates, but cannot offer a reference
          // that disappeared during the last judgment or repeat stale facts.
          const refreshed: Option[] = [];
          for (const option of retained.selection.options) {
            const available = current.get(option.result);
            if (!available) return;
            refreshed.push(available);
          }
          retained.selection = { kind: 'options', options: refreshed };
        }
        continue;
      }
      if (!isSafeRecordId(name)) return;
      if (
        activityRequestFieldDependencies(field).some(
          (dependency) => !Object.hasOwn(parameters, dependency),
        )
      )
        continue;
      const available =
        readChoices && usesChoiceFacts(field) ? readChoices(name, parameters) : choices;
      const selection = fieldSelection(
        descriptor,
        name,
        field,
        available,
        simTime,
        namedDeadlines,
        parameters,
      );
      if (!selection) return;
      pending.push({ name, label: field.label, selection });
    }
    if (!pending.length) return;
    const offered = pending.map((field) => offeredOptions(field.selection));
    const questions: TypedQuestionMap = Object.fromEntries(
      pending.map((field, index) => [
        `field_${index}`,
        {
          type: 'choice',
          instructions: `${ACTIVITY_PARAMETER_CHOICE_POLICY} For the optional activity ${descriptor.label}: ${descriptor.description}, independently select ${field.label}. Groups and ranges only narrow alternatives; nothing is committed by answering.`,
          criteria: {
            ...Object.fromEntries(
              offered[index]!.map((option, optionIndex) => [`option_${optionIndex}`, option.label]),
            ),
            decline: 'I choose not to start this activity.',
            unknown: 'The permitted evidence is insufficient to select this field.',
          },
        },
      ]),
    );
    const requestState = { context: state, simTime, selectedParameters: { ...parameters } };
    try {
      validateQuestions(questions);
      validateJudgmentSize(requestState, questions);
    } catch (error) {
      if (error instanceof InvalidData) return;
      throw error;
    }
    // Ledger/provider failures propagate to their existing owner, preserving distinct
    // failure and uncertain-charge outcomes. Malformed semantic answers only abstain.
    const supplied = await judge({ state: requestState, questions });
    let answers: JudgeValue['answers'];
    try {
      answers = decodeJudge(supplied, questions).answers;
    } catch (error) {
      if (error instanceof InvalidData) return;
      throw error;
    }
    for (let index = pending.length - 1; index >= 0; index--) {
      const answer = answers[`field_${index}`];
      // The actor chooses between permitted values, not whether a fact is true.
      // Several useful alternatives can divide the scores below a majority.
      if (answer?.type !== 'choice' || answer.choice === 'decline' || answer.choice === 'unknown')
        return;
      const option = offered[index]?.[Number(answer.choice.slice('option_'.length))];
      const field = pending[index];
      if (!option || !field) return;
      if (typeof option.result === 'object') field.selection = option.result;
      else {
        if (typeof option.result === 'number' && !Number.isFinite(option.result)) return;
        parameters[field.name] = option.result;
        unresolved.delete(field.name);
        pending.splice(index, 1);
      }
    }
  }
  if (unresolved.size) return;
  // A family without an inner work choice defaults to enqueue. Native admission
  // proves whether it can continue immediately or must queue behind current work.
  const modeField = activityRequestWorkModeField(descriptor);
  const mode = modeField ? parameters[modeField] : 'enqueue';
  if (mode !== 'enqueue' && mode !== 'replace' && mode !== 'interrupt') return;
  return {
    operations: [
      {
        localId: 'activity_request',
        requiresAccepted: [],
        act: {
          kind: 'invoke',
          mode,
          invocation: {
            family,
            parameters,
          },
        },
      },
    ],
  };
}
