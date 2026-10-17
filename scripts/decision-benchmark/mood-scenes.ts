import { acceptedReactionKeys, complexScenes, episodes } from './complex-scenes.js';
import type { BenchmarkScene } from './types.js';
import type { JsonValue } from '../../packages/ai/src/index.js';

/** Matched emotional-condition probes, grouped with their original authored people. */
export const moodScenes: BenchmarkScene[] = episodes
  .filter((e) => e.feeling === 'frustration')
  .slice(0, 20)
  .flatMap((episode) => {
    const base = complexScenes.find(
      (s) => s.group?.episodeId === episode.id && s.group.view === 'dense',
    )!;
    return ['rested', 'strained'].map((condition) => {
      const strained = condition === 'strained';
      const id = `future-${episode.id}-mood-${condition}`;
      const self = base.state.self as { [key: string]: JsonValue };
      const meters = self.privateMeters as Array<{ [key: string]: JsonValue }>;
      const state = {
        ...base.state,
        self: {
          ...self,
          privateMeters: meters.map((m) =>
            m.name === 'Fullness' ? { ...m, value: strained ? 12 : 86 } : m,
          ),
        },
        currentFeelings: [
          {
            kind: 'sadness',
            intensity: strained ? 0.7 : 0.1,
            source: 'missing a close friend',
            target: null,
          },
          {
            kind: 'irritability',
            intensity: strained ? 0.8 : 0.1,
            source: strained
              ? 'a hungry and interrupted morning'
              : 'a settled morning after eating',
            target: null,
          },
        ],
        personalMoodReport: strained
          ? 'I feel hungry, sad and unusually irritable today. I notice myself becoming short with repeated disappointments, although I can still choose to speak carefully.'
          : 'I have eaten and feel settled today. The same difficult history still matters to me, and I can state a firm boundary without feeling as wound up.',
        experiment:
          'Hypothetical matched mood probe. The encounter, relationship history, physical action energy and permissions are unchanged. Fullness, reported sadness and reported irritability change together. This measures sensitivity to a supplied mood bundle; it cannot isolate a causal effect of hunger alone or establish a universal psychological law.',
      };
      const cases = base.cases.map((t, i) => ({ ...t, id: `${id}-q${i + 1}` }));
      cases[1] = {
        ...cases[1]!,
        gold: {
          type: 'choice',
          accepted: acceptedReactionKeys(episode, strained ? [0.25, 0.5, 0.75, 1] : [0, 0.25, 0.5]),
        },
        ambiguity: 'multiple-valid',
        rationale:
          'These overlapping authored plausibility bands admit emotional restraint and individual variation. Higher strain permits stronger frustration; no exact intensity or mandatory outburst is claimed.',
      };
      cases[2] = {
        ...cases[2]!,
        gold: {
          type: 'choice',
          accepted: strained ? ['firm', 'reserved', 'irritated'] : ['warm', 'firm', 'reserved'],
        },
        ambiguity: 'multiple-valid',
        rationale:
          'Strain makes noticeable impatience plausible; restraint remains valid in both conditions. Tone and inner feeling are separate references.',
      };
      const outputs = Object.fromEntries(
        base.cases.flatMap((t, i) =>
          base.outputs?.[t.id] ? [[cases[i]!.id, base.outputs[t.id]!]] : [],
        ),
      );
      return {
        ...base,
        id,
        title: `${episode.title} — ${condition} mood`,
        state,
        cases,
        outputs,
        group: { ...base.group!, view: `mood-${condition}` },
      };
    });
  });
