import type { CognitionLabSettings, CognitionLabSettingsPatch } from '@open-legend/protocol';
import { MACROFOLD_DECISION_MODELS } from '@open-legend/ai';
import type { AppConfig } from './config.js';
import { labSettingsSchema } from './cognition-lab-contracts.js';
import {
  macrofoldJudgmentModel,
  npcGenerationModel,
  NPC_GENERATION_PURPOSES,
  readModelTargetsConfig,
} from './generation-config.js';

export function labModelDefaults(config: AppConfig): CognitionLabSettings['models'] {
  return {
    judgment:
      config.macrofoldKey || (config.macrofoldModelKey && config.modelTargets?.purposes.judgment)
        ? macrofoldJudgmentModel(config)
        : config.jevModel,
    higherDecision: config.higherDecisionModel,
    responseFast: npcGenerationModel(config, 'npc_response_fast'),
    responseComplex: npcGenerationModel(config, 'npc_response_complex'),
    summary: config.macrofoldKey ? config.macrofoldSummaryModel : config.summaryModel,
    reflection: config.macrofoldModel,
  };
}
export function labModelChoices(config: AppConfig): Record<string, string[]> {
  const defaults = labModelDefaults(config);
  const direct = config.macrofoldKey
    ? [
        config.macrofoldMiniModel,
        config.macrofoldComplexModel,
        config.macrofoldSummaryModel,
        config.macrofoldModel,
      ]
    : [
        config.miniModel,
        config.complexModel,
        config.summaryModel,
        ...config.llmModelPrices
          .map((entry) => entry.model)
          .filter((model) => !model.includes('/')),
      ];
  const catalogue = config.llmModelPrices.map((entry) => entry.model);
  const catalogueGeneration = catalogue.filter((model) =>
    config.macrofoldKey ? model.includes('/') : !model.includes('/'),
  );
  const generation = [
    ...new Set([
      ...direct,
      ...catalogueGeneration,
      defaults['responseFast']!,
      defaults['responseComplex']!,
    ]),
  ];
  return {
    judgment: config.macrofoldKey
      ? [...new Set([defaults['judgment']!, ...MACROFOLD_DECISION_MODELS])]
      : [defaults['judgment']!],
    higherDecision: [
      ...new Set([
        defaults['higherDecision']!,
        ...(config.configuredHigherDecisionTarget
          ? [
              `deployment:${config.configuredHigherDecisionTarget.target.model_binding.deployment_id.toLowerCase()}`,
            ]
          : []),
        ...catalogue.filter((model) => !model.includes('/') || config.macrofoldKey),
        ...(config.macrofoldKey ? direct.filter((model) => model.includes('/')) : []),
      ]),
    ],
    responseFast: generation,
    responseComplex: generation,
    summary: [...new Set([defaults['summary']!, ...direct])],
    reflection: config.macrofoldKey
      ? [...new Set([defaults['reflection']!, ...direct])]
      : [defaults['reflection']!],
  };
}
export function resolveLabSettings(
  config: AppConfig,
  current: CognitionLabSettings,
  patch: CognitionLabSettingsPatch,
): CognitionLabSettings {
  return validateLabSettings(config, {
    ...current,
    ...patch,
    effort: patch.effort === null ? undefined : (patch.effort ?? current.effort),
    maxOutputTokens:
      patch.maxOutputTokens === null
        ? undefined
        : (patch.maxOutputTokens ?? current.maxOutputTokens),
    models: { ...current.models, ...patch.models },
  });
}

/** Saved settings are complete inputs, unlike an editor patch. Missing purposes
 * must refuse restoration rather than silently acquire today's host defaults. */
export function validateLabSettings(config: AppConfig, value: unknown): CognitionLabSettings {
  const settings = labSettingsSchema.parse(value);
  const choices = labModelChoices(config);
  for (const [purpose, model] of Object.entries(settings.models))
    if (!choices[purpose]?.includes(model))
      throw new Error('Choose an installed configured model for this purpose.');
  if (Object.keys(settings.models).length !== Object.keys(choices).length)
    throw new Error('Retain every configured model purpose.');
  if (settings.effort && !['none', 'low', 'medium', 'high'].includes(settings.effort))
    throw new Error('Choose a reasoning effort supported by the configured provider route.');
  return settings;
}
/** Rebuild only the lab's effective configuration from trusted installed targets.
 * A deployment is selected by its existing binding, never by a browser endpoint. */
export function applyLabModelSettings(
  effective: AppConfig,
  configured: AppConfig,
  settings: CognitionLabSettings,
): void {
  const models = settings.models;
  effective.higherDecisionModel = models['higherDecision']!;
  effective.configuredHigherDecisionTarget = configured.configuredHigherDecisionTarget;
  effective.jevModel = models['judgment']!;
  const judgmentTarget = configured.modelTargets?.purposes.judgment;
  // A native deployment is available only for its configured purpose. Selecting
  // a catalogue model must remove that binding so native judgment uses the choice.
  const useJudgmentTarget =
    judgmentTarget && models['judgment'] === macrofoldJudgmentModel(configured);
  effective.macrofoldJevModel =
    configured.macrofoldKey && !useJudgmentTarget
      ? models['judgment']!
      : configured.macrofoldJevModel;
  effective.miniModel = effective.macrofoldMiniModel = models['responseFast']!;
  effective.complexModel = effective.macrofoldComplexModel = models['responseComplex']!;
  effective.summaryModel = effective.macrofoldSummaryModel = models['summary']!;
  effective.macrofoldModel = models['reflection']!;
  const targets = configured.modelTargets;
  if (targets) {
    const purposes: Record<string, unknown> = {};
    if (useJudgmentTarget) purposes['judgment'] = judgmentTarget;
    for (const [purpose, model] of [
      ['npc_response_fast', models['responseFast']],
      ['npc_response_complex', models['responseComplex']],
    ] as const) {
      const target = NPC_GENERATION_PURPOSES.map((name) => targets.purposes[name]).find(
        (value) =>
          value && `deployment:${value.model_binding.deployment_id.toLowerCase()}` === model,
      );
      if (target) purposes[purpose] = target;
    }
    effective.modelTargets = Object.keys(purposes).length
      ? readModelTargetsConfig(
          JSON.stringify({
            schema_version: 1,
            workspace_id: targets.workspace_id,
            purposes,
          }),
        )
      : undefined;
  }
}
