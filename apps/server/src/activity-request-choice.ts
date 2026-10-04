import {
  isSafeRecordId,
  type ActivityRequestChoice,
  type ActivityRequestDescriptor,
  type ActorResponse,
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
import { ACTION_GROUNDING_POLICY } from './jev-questions.js';

/** Prepared actor-permitted references, possibly replaced by request-local handles. */
export type ActivityRequestChoiceFact = Omit<ActivityRequestChoice, 'id'> & {
  entityId?: string;
  definitionId?: string;
};
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
// Choice permits 255 options; abstention occupies two. Eight rounds cover the full
// safe integer range while bounding dependent judgments; this is not a paid retry.
// docs/projects/parallel-batch-01-playable-week/camp-activities.md#who-chooses-the-work
const MAX_OPTIONS = 253;
const MAX_ROUNDS = 8;
const modes = {
  enqueue: 'Ask to add this activity after current work; incompatible queued work can refuse.',
  replace: 'Replace current work with this activity.',
  interrupt: 'Pause current work for this activity, with ordinary revalidation on return.',
} as const;

function compatibleChoices(
  descriptor: ActivityRequestDescriptor,
  name: string,
  field: Field,
  choices: readonly ActivityRequestChoiceFact[],
): Array<{ choice: ActivityRequestChoiceFact; reference: string }> {
  return choices.flatMap((choice) => {
    const reference = field.type === 'entity' ? choice.entityId : choice.definitionId;
    return choice.accessible &&
      choice.kind === field.type &&
      choice.roles.includes(name) &&
      (!choice.requestIds || choice.requestIds.includes(descriptor.id)) &&
      isSafeRecordId(reference)
      ? [{ choice, reference }]
      : [];
  });
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
  choices: readonly ActivityRequestChoiceFact[],
): Map<string, ActivityRequestDescriptor> {
  const routes = new Map<string, ActivityRequestDescriptor>();
  requests.forEach((descriptor, index) => {
    if (
      descriptor.fields.mode?.type === 'mode' &&
      Object.entries(descriptor.fields).every(([name, field]) =>
        field.type === 'entity' || field.type === 'definition'
          ? compatibleChoices(descriptor, name, field, choices).length > 0
          : field.type === 'integer'
            ? !!integerBounds(field)
            : field.type === 'time'
              ? !!durationBounds(field)
              : field.type === 'mode' && name === 'mode',
      )
    )
      routes.set(`request_${index}`, descriptor);
  });
  return routes;
}

function fieldSelection(
  descriptor: ActivityRequestDescriptor,
  name: string,
  field: Field,
  choices: readonly ActivityRequestChoiceFact[],
  simTime: number,
  namedDeadlines: readonly NamedActivityDeadline[],
): Selection | undefined {
  if (field.type === 'integer') {
    const bounds = integerBounds(field);
    return bounds && { kind: 'integer', minimum: bounds[0], maximum: bounds[1], offset: 0 };
  }
  let options: Option[];
  if (field.type === 'entity' || field.type === 'definition') {
    options = compatibleChoices(descriptor, name, field, choices).map(({ choice, reference }) => ({
      label: `${choice.label} (permitted ${choice.kind} reference ${reference})${choice.distance !== undefined ? `; distance ${choice.distance} metres` : ''}`,
      result: reference,
    }));
  } else if (field.type === 'mode') {
    if (name !== 'mode') return;
    options = Object.entries(modes).map(([result, label]) => ({ label, result }));
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
}: {
  descriptor: ActivityRequestDescriptor;
  choices: readonly ActivityRequestChoiceFact[];
  simTime: number;
  namedDeadlines: readonly NamedActivityDeadline[];
  state: unknown;
  judge: (request: Omit<JudgeRequest, 'requestId' | 'signal'>) => Promise<JudgeValue>;
}): Promise<ActorResponse | undefined> {
  if (
    !isSafeRecordId(descriptor.id) ||
    descriptor.fields.mode?.type !== 'mode' ||
    !Number.isFinite(simTime) ||
    simTime < 0
  )
    return;
  const family = descriptor.id;
  const parameters: Record<string, Scalar> = {};
  const pending: PendingField[] = [];
  for (const [name, field] of Object.entries(descriptor.fields)) {
    if (!isSafeRecordId(name)) return;
    const selection = fieldSelection(descriptor, name, field, choices, simTime, namedDeadlines);
    if (!selection) return;
    pending.push({ name, label: field.label, selection });
  }
  for (let round = 0; pending.length && round < MAX_ROUNDS; round++) {
    const offered = pending.map((field) => offeredOptions(field.selection));
    const questions: TypedQuestionMap = Object.fromEntries(
      pending.map((field, index) => [
        `field_${index}`,
        {
          type: 'choice',
          instructions: `${ACTION_GROUNDING_POLICY} For the optional activity ${descriptor.label}: ${descriptor.description}, independently select ${field.label}. Select decline if you do not want this activity, or unknown if no exact choice is justified. Groups and ranges only narrow alternatives; nothing is committed by answering.`,
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
      if (
        answer?.type !== 'choice' ||
        answer.choice === 'decline' ||
        answer.choice === 'unknown' ||
        (answer.probabilities[answer.choice] ?? 0) < 0.5
      )
        return;
      const option = offered[index]?.[Number(answer.choice.slice('option_'.length))];
      const field = pending[index];
      if (!option || !field) return;
      if (typeof option.result === 'object') field.selection = option.result;
      else {
        if (typeof option.result === 'number' && !Number.isFinite(option.result)) return;
        parameters[field.name] = option.result;
        pending.splice(index, 1);
      }
    }
  }
  if (pending.length) return;
  const mode = parameters.mode;
  if (mode !== 'enqueue' && mode !== 'replace' && mode !== 'interrupt') return;
  return {
    operations: [
      {
        localId: 'activity_request',
        requiresAccepted: [],
        talk: null,
        think: null,
        goal: null,
        plan: null,
        note: null,
        name: null,
        act: {
          kind: 'invoke',
          actionId: null,
          verb: null,
          targetEntityId: null,
          description: null,
          slots: null,
          mode,
          invocation: {
            family,
            parameters,
            x: null,
            z: null,
            surfaceId: null,
            frame: null,
            place: null,
            targetEntityId: null,
            distance: null,
            relation: null,
            onLost: null,
            until: null,
            itemId: null,
            quantity: null,
          },
        },
      },
    ],
  };
}
