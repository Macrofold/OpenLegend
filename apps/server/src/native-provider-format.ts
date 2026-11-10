import {
  baseActivityChoiceLabel,
  jsonByteLength,
  type BaseActivityChoiceLabel,
} from '@open-legend/domain';
import { nativeActivityDisplay } from './native-activity.js';
import { nativeCanonicalCommand } from './native-command.js';
import {
  nativeCanonicalJsonWorkspace,
  nativeJsonEncodingWorkspace,
  nativeJsonFixedWorkspace,
} from './native-consumer.js';
import {
  nativeActivityLearningFormat,
  type NativeActivityLearningFormatRequest,
} from './native-activity-learning-format.js';
import {
  nativeConsolidationReadings,
  type NativeConsolidationFormatRequest,
} from './native-consolidation-format.js';
import {
  nativeMaintenanceFormat,
  type NativeMaintenanceFormatRequest,
} from './native-maintenance-format.js';
import {
  nativeAttemptNormalization,
  nativeCanonicalJson,
  nativeCollation,
  nativeUtterance,
  nativeWordSegments,
} from './native-language.js';
import {
  formatNativeNpcCandidateDescriptions,
  type NativeNpcDescriptionRead,
} from './native-npc-candidates.js';
import { memoryReadingAllocation } from './memory-read-allocation.js';
import {
  encodeNativeProviderAnswer,
  type NativeProviderAnswer,
  type NativeProviderCapacity,
} from './native-provider-answer.js';
import { formatFreeTypedActionPreparation } from './typed-action-syntax.js';
import {
  selectTypedNavigation,
  type TypedNavigationRead,
  type TypedNavigationSyntax,
} from './typed-navigation.js';
import { worldControlOutcome } from './world-control-outcome.js';

// The supported Node layout allowances are shared with memory-read-allocation
// and runtime/consumer.rs. Input strings/graphs already belong to the question;
// these bounds cover only this call's new containers, text and workspaces.
const WORD = 8;
const CONTAINER = 32 * WORD;
const MEMBER = 64 * WORD;
const SLOT = 8 * WORD;
const STRING = 8 * WORD;
const object = (members: number) => CONTAINER + members * MEMBER;
const array = (length: number) => CONTAINER + length * SLOT;
const text = (units: number) => STRING + 2 * units;

interface Shape {
  containers: number;
  members: number;
  slots: number;
  strings: number;
  units: number;
  depth: number;
}
function shape(
  value: unknown,
  depth = 0,
  result: Shape = {
    containers: 0,
    members: 0,
    slots: 0,
    strings: 0,
    units: 0,
    depth: 0,
  },
): Shape {
  if (typeof value === 'string') {
    result.strings++;
    result.units += value.length;
  } else if (value && typeof value === 'object') {
    result.containers++;
    result.depth = Math.max(result.depth, depth + 1);
    if (Array.isArray(value)) {
      result.slots += value.length;
      for (let index = 0; index < value.length; index++) shape(value[index], depth + 1, result);
    } else
      for (const key in value)
        if (Object.hasOwn(value, key)) {
          result.members++;
          shape((value as Record<string, unknown>)[key], depth + 1, result);
        }
  }
  return result;
}

/** Compatibility decomposition bounds composed NFKC text without constructing
 * a whole second string. Only one Unicode scalar's decomposed/default-lowercase
 * string lives in the already admitted measurement frame at a time. Combining
 * adjacent scalars can compose/remove units, not add a decomposition. */
function normalizedUnits(value: string): number {
  let units = 0;
  for (let at = 0; at < value.length; ) {
    const point = value.codePointAt(at)!;
    units += String.fromCodePoint(point).normalize('NFKD').toLowerCase().length;
    at += point > 0xffff ? 2 : 1;
  }
  return units;
}
function longestNormalized(value: unknown): number {
  if (typeof value === 'string') return Math.max(value.length, normalizedUnits(value));
  if (!value || typeof value !== 'object') return 0;
  let units = 0;
  if (Array.isArray(value)) {
    for (let at = 0; at < value.length; at++) units = Math.max(units, longestNormalized(value[at]));
  } else
    for (const key in value)
      if (Object.hasOwn(value, key))
        units = Math.max(units, longestNormalized((value as Record<string, unknown>)[key]));
  return units;
}

/** Source word/normalization helpers keep normalized, lowercase, trim/replace
 * text and split/filter/parser arrays simultaneously. A segment/token cannot
 * outnumber UTF-16 units. This is actual text work, not an input graph clone. */
function speechWork(units: number): number {
  return 5 * text(units) + 3 * array(units + 1) + (units + 1) * object(4);
}

function normalizationWork(units: number): number {
  // NFKC/lowercase/trim/replacement strings plus split/filter/parser arrays.
  // Regex captures and lexical result objects are fixed per active clause;
  // unlike Intl.Segmenter, no four-field object exists for each code unit.
  return 7 * text(units) + 3 * array(units + 1) + (units + 1) * STRING + object(24);
}

// projectActivity constructs prose, per-node detail/child lists, path keys and
// optional JSON fallbacks; a second required-only render may overlap its first
// result. Every selected node contributes at most one rendered subtree per
// ancestor. Count those actual ancestry levels rather than a world byte floor.
export function nativeActivityDisplayWorkspace(value: unknown): number {
  const facts = shape(value);
  const units =
    jsonByteLength(value, { cache: false }) + facts.members * 80 + facts.containers * 128;
  return (
    nativeJsonEncodingWorkspace(value) +
    2 * (facts.depth + 2) * text(units) +
    facts.containers * (3 * CONTAINER + object(4)) +
    (facts.members + facts.slots) * (3 * SLOT + STRING)
  );
}

type TypedRequest = {
  readonly binding: unknown;
  readonly phase: 'name' | 'format';
  readonly input?: { readonly syntax: TypedNavigationSyntax; readonly read: TypedNavigationRead };
  readonly limits: Parameters<typeof formatFreeTypedActionPreparation>[0]['limits'];
  readonly requests: readonly Omit<
    Parameters<typeof formatFreeTypedActionPreparation>[0],
    'limits'
  >[];
};

/** Pure finite Source formatters, with capacity only. No world, mutation,
 * permission, SQL, provider spending or alternate wording owner enters here. */
export function formatNativeProvider(
  question: { readonly kind: string; readonly value: unknown },
  capacity: NativeProviderCapacity,
): NativeProviderAnswer | undefined {
  const value = question.value;
  switch (question.kind) {
    case 'activity-learning-format':
    case 'maintenance-format':
    case 'consolidation-format':
    case 'typed-actions':
    case 'choice-descriptions':
    case 'control':
    case 'utterance':
    case 'collation':
    case 'words':
    case 'display':
    case 'canonical':
    case 'normalization':
    case 'digest':
      break;
    default:
      return;
  }
  // jsonByteLength may allocate key traversal arrays; one-scalar Unicode
  // measurement also has its own bounded string/ICU frame. Neither pass emits
  // the actual formatter product or writes persistent measurement cache state.
  const measurement = capacity.reserveConsumerBytes(
    nativeJsonFixedWorkspace + nativeJsonEncodingWorkspace(value) + object(8) + 8 * text(128),
  );
  let bytes: number;
  try {
    bytes = preparationBytes(question.kind, value);
  } finally {
    measurement.release();
  }
  const preparation = capacity.reserveConsumerBytes(bytes);
  try {
    return encodeNativeProviderAnswer(capacity, prepare(question.kind, value));
  } finally {
    // The encoder owns the fully independent JSON string before any formatter
    // result, borrowed input, temporary array or text reservation ends.
    preparation.release();
  }
}

function preparationBytes(kind: string, value: unknown): number {
  const fixed = object(4);
  switch (kind) {
    case 'canonical':
    case 'digest': {
      const input = value as Parameters<typeof nativeCanonicalCommand>[0] &
        Parameters<typeof nativeCanonicalJson>[0];
      const body = kind === 'canonical' ? input.command : input.value;
      const bytes = jsonByteLength(body, { cache: false });
      return fixed + text(bytes) + nativeCanonicalJsonWorkspace(body, bytes);
    }
    case 'maintenance-format': {
      const { publication } = value as NativeMaintenanceFormatRequest;
      const bytes = jsonByteLength(publication, { cache: false });
      let words = 0;
      for (const file of publication.files)
        words = Math.max(
          words,
          normalizationWork(normalizedUnits(file.path) + 1 + normalizedUnits(file.text)) +
            text(file.path.length + 1 + file.text.length),
        );
      for (const thought of publication.thoughts)
        words = Math.max(words, normalizationWork(normalizedUnits(thought)));
      return (
        fixed +
        text(bytes) +
        nativeCanonicalJsonWorkspace(publication, bytes) +
        words +
        2 * array(publication.files.length) +
        array(publication.thoughts.length)
      );
    }
    case 'consolidation-format': {
      const { sources } = value as NativeConsolidationFormatRequest;
      let retained = 0,
        workspace = 0;
      for (const source of sources) {
        const reading = memoryReadingAllocation(source);
        retained += reading.retained;
        workspace = Math.max(workspace, reading.workspace);
      }
      return fixed + array(sources.length) + retained + workspace;
    }
    case 'utterance': {
      const { text: input } = value as { text: string };
      // ICU emits at most one segment per code unit. Its full and word-only
      // segment arrays overlap the mapped {start,end} result and lowercase.
      return (
        fixed + speechWork(input.length) + text(Math.max(input.length, normalizedUnits(input)))
      );
    }
    case 'words': {
      const { strings } = value as { strings: readonly string[] };
      let retained = array(strings.length),
        workspace = 0;
      for (const input of strings) {
        retained += array(input.length) + input.length * STRING + text(input.length);
        workspace = Math.max(workspace, speechWork(input.length));
      }
      return fixed + retained + workspace;
    }
    case 'collation': {
      const { strings } = value as { strings: readonly string[] };
      // One tuple array + stable-sort work array + two returned numeric arrays;
      // strings borrow the input. The fixed sort run stack is independent of N.
      return fixed + strings.length * object(2) + 4 * array(strings.length) + (85 + 32 + 32) * WORD;
    }
    case 'normalization': {
      const { descriptions } = value as Parameters<typeof nativeAttemptNormalization>[0];
      let retained = 2 * array(descriptions.length),
        workspace = 0;
      for (const input of descriptions) {
        const units = normalizedUnits(input);
        retained += text(units) + object(4) + 2 * text(units);
        workspace = Math.max(workspace, normalizationWork(units));
      }
      return fixed + retained + workspace;
    }
    case 'typed-actions': {
      const request = value as TypedRequest;
      if (request.phase === 'name') {
        const input = request.input;
        if (!input) return fixed; // The original formatter owns this refusal.
        const facts = shape(input),
          units = longestNormalized(input);
        // Name matching holds two six-form sets and rank/filter/result arrays;
        // all labels are considered sequentially, while ranked candidates live.
        return (
          fixed +
          3 * normalizationWork(units) +
          18 * text(units) +
          facts.containers * CONTAINER +
          (facts.slots + facts.members) * 8 * SLOT
        );
      }
      if (request.phase !== 'format') return fixed;
      let retained = array(request.requests.length),
        workspace = 0;
      for (const item of request.requests) {
        const facts = shape(item);
        // The shared fulfillment emits one description, its 1000/500 slices,
        // at most eight omitted-detail objects, and one resolution wrapper.
        retained +=
          object(4) +
          object(7) +
          array(8) +
          8 * object(2) +
          4 * text(facts.units + 512) +
          array(item.unmet.length);
        workspace = Math.max(
          workspace,
          array(item.unmet.length) + item.unmet.length * object(2) + 4 * text(facts.units + 512),
        );
      }
      return fixed + retained + workspace;
    }
    case 'choice-descriptions': {
      const input = value as NativeNpcDescriptionRead & {
        activityLabels: readonly BaseActivityChoiceLabel[];
      };
      let retained = array(input.offers.length) + array(input.activityLabels.length),
        longest = input.self.name.name.length + (input.self.health?.name.length ?? 0);
      for (const body of input.bodies)
        longest = Math.max(longest, body.name.name.length + (body.health?.name.length ?? 0));
      const strikes = Object.values(input.definitions.nativeStrikes ?? {});
      for (const offer of input.offers) {
        // At most two named phrases, the actual blocker and fixed choice,
        // work-handling, target/health/distance/recovery sentences (<512 units).
        const meaning = offer.meaning;
        const selected =
          meaning.kind === 'status'
            ? input.definitions.statusEffectPolicy.definitions[meaning.definition]
            : meaning.kind === 'strike'
              ? strikes[meaning.definition]
              : undefined;
        const units =
          2 * longest + shape(selected).units + (offer.temporary?.message.length ?? 0) + 512;
        retained += object(8) + array(1) + 3 * text(units);
      }
      for (const label of input.activityLabels) retained += 4 * text(shape(label).units + 16);
      return (
        fixed +
        retained +
        array(input.bodies.length) +
        array(strikes.length) +
        input.bodies.length * (MEMBER + array(2))
      );
    }
    case 'activity-learning-format':
      return (
        fixed + nativeActivityDisplayWorkspace((value as NativeActivityLearningFormatRequest).input)
      );
    case 'display': {
      const input = (value as Parameters<typeof nativeActivityDisplay>[0]).input;
      // ordinaryActivityView creates at most eight fixed facts plus one fact
      // per 500-unit speech slice. Other labels borrow the question. Fixed
      // sentences and bounded numeric spellings fit 256 units per new fact.
      const facts =
        8 + (input.command.type === 'say' ? Math.ceil(input.command.text.length / 500) : 0);
      return (
        fixed +
        object(8) +
        array(facts) +
        facts * object(3) +
        4 * text(shape(input).units + facts * 256)
      );
    }
    case 'control':
      return fixed + text(64);
    default:
      return fixed;
  }
}

function prepare(kind: string, value: unknown): unknown {
  switch (kind) {
    case 'activity-learning-format':
      return nativeActivityLearningFormat(value as NativeActivityLearningFormatRequest);
    case 'maintenance-format':
      return nativeMaintenanceFormat(value as NativeMaintenanceFormatRequest);
    case 'consolidation-format':
      return nativeConsolidationReadings(value as NativeConsolidationFormatRequest);
    case 'typed-actions': {
      const request = value as TypedRequest;
      if (request.phase === 'name') {
        if (!request.input) throw new Error('Native typed name selection has no captured roster.');
        return {
          binding: request.binding,
          output: {
            kind: 'name',
            selection: selectTypedNavigation(request.input.syntax, request.input.read),
          },
        };
      }
      if (request.phase !== 'format')
        throw new Error('Native typed preparation has no valid phase.');
      return {
        binding: request.binding,
        output: {
          kind: 'format',
          results: request.requests.map((item) =>
            formatFreeTypedActionPreparation({ ...item, limits: request.limits }),
          ),
        },
      };
    }
    case 'choice-descriptions': {
      const request = value as NativeNpcDescriptionRead & {
        binding: unknown;
        activityLabels: readonly BaseActivityChoiceLabel[];
      };
      return {
        binding: request.binding,
        descriptions: formatNativeNpcCandidateDescriptions(request).map(
          (offer) => offer.description,
        ),
        activityLabels: request.activityLabels.map(baseActivityChoiceLabel),
      };
    }
    case 'control': {
      const request = value as { binding: unknown; paused: boolean; speed: number };
      return {
        binding: request.binding,
        message: worldControlOutcome(request.paused, request.speed).message,
      };
    }
    case 'utterance': {
      const request = value as { binding: unknown; text: string };
      return { binding: request.binding, ...nativeUtterance(request.text) };
    }
    case 'collation': {
      const request = value as { binding: unknown; strings: readonly string[] };
      return { binding: request.binding, ...nativeCollation(request.strings) };
    }
    case 'words': {
      const request = value as { binding: unknown; strings: readonly string[] };
      return { binding: request.binding, words: nativeWordSegments(request.strings) };
    }
    case 'display':
      return nativeActivityDisplay(value as Parameters<typeof nativeActivityDisplay>[0]);
    case 'canonical':
      return nativeCanonicalCommand(value as Parameters<typeof nativeCanonicalCommand>[0]);
    case 'normalization':
      return nativeAttemptNormalization(value as Parameters<typeof nativeAttemptNormalization>[0]);
    case 'digest':
      return nativeCanonicalJson(value as Parameters<typeof nativeCanonicalJson>[0]);
  }
}
