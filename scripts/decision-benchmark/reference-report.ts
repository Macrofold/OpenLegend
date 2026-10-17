import { episodes } from './complex-scenes.js';
import { sha256 } from './corpus.js';
import { summarize, type RunRecord } from './evaluate.js';
import {
  gradeGeneratedReviewed,
  reviewedGenerationReferences,
  reviewedReferenceScenes,
} from './reference-review.js';
import type { BenchmarkScene } from './types.js';
import { compileQualityPolicy, summarizeQuality } from './quality.js';

/** Prepare before paid admission, then retain through reporting. A new offered
 * choice without a reviewed points policy must fail before any model is called.
 */
export function prepareReferenceReport(scenes: BenchmarkScene[]) {
  const review = reviewedReferenceScenes(scenes);
  return {
    review,
    qualityPolicy: compileQualityPolicy(review.scenes, new Set(review.excludedIds)),
  };
}

/** Disclosed post-run interpretation, alongside (never replacing) frozen-label scores. */
export function reviewedReferenceReport(
  scenes: BenchmarkScene[],
  records: RunRecord[],
  models: string[],
  prepared = prepareReferenceReport(scenes),
) {
  const { review, qualityPolicy } = prepared;
  const generationRecords = records.filter((record) => record.sceneId.startsWith('generate-'));
  // Generation always uses an episode's dense context, including when the native
  // selection contains only its compound view. Review that actual supplied context.
  const generationReview = reviewedGenerationReferences(
    new Set(generationRecords.map((record) => record.sceneId.slice(9))),
  );
  const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
  const generationRows = generationRecords.map((record) => ({
    caseId: record.sceneId,
    model: record.model,
    outcome: record.result.outcome,
    ...(record.result.outcome === 'value'
      ? gradeGeneratedReviewed(
          episodeById.get(record.sceneId.slice(9))!,
          record.generation,
          generationReview.denseByEpisode.get(record.sceneId.slice(9))!,
        )
      : {}),
  }));
  const generationAmendments = generationReview.amendments;
  const comparison = summarize(
    [...review.scenes],
    records.filter((record) => !record.sceneId.startsWith('generate-')),
    models,
    new Set(review.excludedIds),
  );
  return {
    postRunReview: true,
    policyDigest: sha256(review.amendments),
    amendments: review.amendments,
    excludedQuestionIds: review.excludedIds,
    ...comparison,
    answerPoints: summarizeQuality(qualityPolicy, comparison.models, records),
    generation: {
      policyDigest: sha256(generationAmendments),
      referenceAmendments: generationAmendments,
      rows: generationRows,
      models: models.map((model) => {
        const rows = generationRows.filter((row) => row.model === model);
        return {
          model,
          submitted: rows.length,
          answered: rows.filter((row) => row.outcome === 'value').length,
          strictFieldsPass: rows.filter(
            (row) => row.schemaValid && row.planValid && row.reactionLegal,
          ).length,
          referenceFeeling: rows.filter((row) => row.referenceFeeling).length,
          referenceExpression: rows.filter((row) => row.referenceExpression).length,
          allReferencesPass: rows.filter(
            (row) =>
              row.schemaValid &&
              row.planValid &&
              row.reactionLegal &&
              row.referenceFeeling &&
              row.referenceExpression,
          ).length,
        };
      }),
    },
  };
}
