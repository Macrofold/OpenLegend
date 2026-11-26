#!/usr/bin/env node
/** Verify person-family.ts admission, Python/TS parity, bilinear accuracy, seam closure, and edit-order invariance. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  admitPersonFamily,
  evaluatePerson,
  type EvaluatedPerson,
  type PersonAppearanceDefinition,
} from '../../../apps/client/src/characters/person-family.js';

interface MeshPatchDoc {
  supportMode: number;
  axisControls: {
    mass: string;
    fullness: string;
  };
}

interface PythonParityReference {
  recipes: Record<string, Record<string, number[]>>;
  leanV3Body: number[];
  leanLaneShirt: number[];
}

const [kitArg, definitionArg, patchArg, pythonRefArg, outArg] = process.argv.slice(2);
if (!kitArg || !definitionArg || !patchArg || !pythonRefArg || !outArg) {
  throw new Error(
    'Usage: verify_evaluator_parity.mts <kitDir> <definitionJson> <meshPatchJson> <pythonRefJson> <outJson>',
  );
}

const kitDir = resolve(kitArg);
const compiledRaw: unknown = JSON.parse(readFileSync(join(kitDir, 'compiled.json'), 'utf8'));
const definition = JSON.parse(
  readFileSync(resolve(definitionArg), 'utf8'),
) as PersonAppearanceDefinition & {
  controls: Array<{ id: string; defaultValue: number }>;
  selections: Array<{ id: string; defaultValue: string }>;
};
const patchDoc = JSON.parse(readFileSync(resolve(patchArg), 'utf8')) as MeshPatchDoc;
const pyData = JSON.parse(readFileSync(resolve(pythonRefArg), 'utf8')) as PythonParityReference;

const family = admitPersonFamily(compiledRaw, definition.reference, definition);
const defaults = Object.fromEntries(definition.controls.map((c) => [c.id, c.defaultValue]));
const selections = Object.fromEntries(definition.selections.map((s) => [s.id, s.defaultValue]));
const massKey = patchDoc.axisControls.mass;
const fullKey = patchDoc.axisControls.fullness;
const mode = patchDoc.supportMode;

function makeRecipe(m: number, f: number) {
  return {
    family: definition.reference,
    controls: { ...defaults, [massKey]: m, [fullKey]: f },
    selections,
  };
}

function maxDiffMeters(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) throw new Error(`Array length mismatch: ${a.length} vs ${b.length}`);
  let worst = 0;
  for (let i = 0; i < a.length; i += 3) {
    const dx = Number(a[i]) - Number(b[i]);
    const dy = Number(a[i + 1]) - Number(b[i + 1]);
    const dz = Number(a[i + 2]) - Number(b[i + 2]);
    const d = Math.hypot(dx, dy, dz);
    if (d > worst) worst = d;
  }
  return worst;
}

const gridCoords: Array<[number, number]> =
  mode === 2
    ? [
        [0.5, 0.0],
        [0.5, 0.5],
        [0.5, 1.0],
      ]
    : [0.0, 0.5, 1.0].flatMap((f) => [0.0, 0.5, 1.0].map((m) => [m, f] as [number, number]));

const interiorCoords: Array<[number, number]> =
  mode === 2
    ? [
        [0.5, 0.25],
        [0.5, 0.75],
      ]
    : [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ];

const allCoords = [...gridCoords, ...interiorCoords];

let maxPythonTsDiffM = 0;
let maxSeamPosGapM = 0;
let maxSeamNormalGap = 0;
let maxEditOrderDiffM = 0;
let anyHiddenMask = false;

const perRecipe: Array<Record<string, unknown>> = [];

for (const [m, f] of allCoords) {
  const key = `${m.toFixed(2)},${f.toFixed(2)}`;
  const fresh = evaluatePerson(family, makeRecipe(m, f), { parts: ['proofShirt'] });
  for (const hiddenSet of fresh.hiddenTriangles.values()) {
    if (hiddenSet.size > 0) anyHiddenMask = true;
  }

  const pyRec = pyData.recipes[key];
  if (!pyRec) throw new Error(`Missing Python reference coordinate ${key}`);

  const meshDiffs: Record<string, number> = {};
  for (const meshId of ['bodySkin', 'headSkin', 'studioShorts', 'proofShirt']) {
    const tsPos = fresh.canonicalPositions.get(meshId);
    const pyPos = pyRec[meshId];
    if (!tsPos || !pyPos) throw new Error(`Missing evaluated mesh ${meshId} at ${key}`);
    const diff = maxDiffMeters(tsPos, pyPos);
    meshDiffs[meshId] = diff;
    if (diff > maxPythonTsDiffM) maxPythonTsDiffM = diff;
  }

  for (const seam of family.seams) {
    const bPos = fresh.canonicalPositions.get(seam.bodyMesh)!;
    const hPos = fresh.canonicalPositions.get(seam.headMesh)!;
    const bNrm = fresh.canonicalNormals.get(seam.bodyMesh)!;
    const hNrm = fresh.canonicalNormals.get(seam.headMesh)!;
    for (let k = 0; k < seam.bodyVertices.length; k++) {
      const bi = seam.bodyVertices[k]! * 3;
      const hi = seam.headVertices[k]! * 3;
      const pGap = Math.hypot(
        bPos[bi]! - hPos[hi]!,
        bPos[bi + 1]! - hPos[hi + 1]!,
        bPos[bi + 2]! - hPos[hi + 2]!,
      );
      const nGap = Math.hypot(
        bNrm[bi]! - hNrm[hi]!,
        bNrm[bi + 1]! - hNrm[hi + 1]!,
        bNrm[bi + 2]! - hNrm[hi + 2]!,
      );
      if (pGap > maxSeamPosGapM) maxSeamPosGapM = pGap;
      if (nGap > maxSeamNormalGap) maxSeamNormalGap = nGap;
    }
  }
  perRecipe.push({ coordinate: [m, f], pythonVsTsMaxMeters: meshDiffs });
}

const leanEval = evaluatePerson(family, makeRecipe(0.5, 0.0), { parts: ['proofShirt'] });
const leanBodyVsV3M = maxDiffMeters(
  leanEval.canonicalPositions.get('bodySkin')!,
  pyData.leanV3Body,
);
const leanShirtVsLaneM = maxDiffMeters(
  leanEval.canonicalPositions.get('proofShirt')!,
  pyData.leanLaneShirt,
);

let prevState: EvaluatedPerson = evaluatePerson(family, makeRecipe(0.5, 0.5), {
  parts: ['proofShirt'],
});
const sweepSteps =
  mode === 2
    ? [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0].map((f) => [0.5, f] as [number, number])
    : [
        ...[0, 0.25, 0.5, 0.75, 1, 0.5, 0].map((f) => [0.0, f] as [number, number]),
        ...[0, 0.25, 0.5, 0.75, 1, 0.5, 0].map((f) => [0.5, f] as [number, number]),
        ...[0, 0.25, 0.5, 0.75, 1, 0.5, 0].map((f) => [1.0, f] as [number, number]),
        ...[0, 0.25, 0.5, 0.75, 1, 0.5, 0].map((m) => [m, 0.0] as [number, number]),
        ...[0, 0.25, 0.5, 0.75, 1, 0.5, 0].map((m) => [m, 0.5] as [number, number]),
        ...[0, 0.25, 0.5, 0.75, 1, 0.5, 0].map((m) => [m, 1.0] as [number, number]),
      ];

for (const [m, f] of sweepSteps) {
  prevState = evaluatePerson(family, makeRecipe(m, f), {
    parts: ['proofShirt'],
    previous: prevState,
  });
  const freshState = evaluatePerson(family, makeRecipe(m, f), { parts: ['proofShirt'] });
  for (const meshId of ['bodySkin', 'studioShorts', 'proofShirt']) {
    const d = maxDiffMeters(
      prevState.canonicalPositions.get(meshId)!,
      freshState.canonicalPositions.get(meshId)!,
    );
    if (d > maxEditOrderDiffM) maxEditOrderDiffM = d;
  }
}

if (mode !== 2) {
  for (const [m, f] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [0.25, 0.75],
    [0.75, 0.25],
  ] as const) {
    let orderMF = evaluatePerson(family, makeRecipe(0.5, 0.5), { parts: ['proofShirt'] });
    orderMF = evaluatePerson(family, makeRecipe(m, 0.5), {
      parts: ['proofShirt'],
      previous: orderMF,
    });
    orderMF = evaluatePerson(family, makeRecipe(m, f), {
      parts: ['proofShirt'],
      previous: orderMF,
    });

    let orderFM = evaluatePerson(family, makeRecipe(0.5, 0.5), { parts: ['proofShirt'] });
    orderFM = evaluatePerson(family, makeRecipe(0.5, f), {
      parts: ['proofShirt'],
      previous: orderFM,
    });
    orderFM = evaluatePerson(family, makeRecipe(m, f), {
      parts: ['proofShirt'],
      previous: orderFM,
    });

    for (const meshId of ['bodySkin', 'studioShorts', 'proofShirt']) {
      const d = maxDiffMeters(
        orderMF.canonicalPositions.get(meshId)!,
        orderFM.canonicalPositions.get(meshId)!,
      );
      if (d > maxEditOrderDiffM) maxEditOrderDiffM = d;
    }
  }
}

const dressed0 = evaluatePerson(family, makeRecipe(0.5, 1.0), { parts: ['proofShirt'] });
const removed = evaluatePerson(family, makeRecipe(0.5, 1.0), { parts: [], previous: dressed0 });
const restored = evaluatePerson(family, makeRecipe(0.5, 1.0), {
  parts: ['proofShirt'],
  previous: removed,
});
const shirtRestoreDiffM = maxDiffMeters(
  dressed0.canonicalPositions.get('proofShirt')!,
  restored.canonicalPositions.get('proofShirt')!,
);
const shortsDuringRemovalDiffM = maxDiffMeters(
  dressed0.canonicalPositions.get('studioShorts')!,
  removed.canonicalPositions.get('studioShorts')!,
);

const report = {
  supportMode: mode,
  controls: Object.keys(family.controls),
  retiredDefinitionAbsent: !('definition' in family.controls),
  unmaskedProofNoHiddenFaces: !anyHiddenMask,
  maxPythonVsTypeScriptDiffMetres: maxPythonTsDiffM,
  leanBodyVsPinnedV3MaxDiffMetres: leanBodyVsV3M,
  leanShirtVsPinnedLaneMaxDiffMetres: leanShirtVsLaneM,
  maxNeckAndTorsoSeamPositionGapMetres: maxSeamPosGapM,
  maxNeckAndTorsoSeamNormalDiff: maxSeamNormalGap,
  maxIncrementalAndEditOrderDiffMetres: maxEditOrderDiffM,
  shirtRestoreMaxDiffMetres: shirtRestoreDiffM,
  shortsDuringRemovalMaxDiffMetres: shortsDuringRemovalDiffM,
  allPassed:
    !('definition' in family.controls) &&
    !anyHiddenMask &&
    maxPythonTsDiffM <= 1e-6 &&
    leanBodyVsV3M <= 1e-6 &&
    leanShirtVsLaneM <= 1e-6 &&
    maxSeamPosGapM <= 1e-6 &&
    maxSeamNormalGap <= 1e-6 &&
    maxEditOrderDiffM <= 1e-6 &&
    shirtRestoreDiffM === 0 &&
    shortsDuringRemovalDiffM === 0,
  recipes: perRecipe,
};

writeFileSync(resolve(outArg), JSON.stringify(report, null, 2) + '\n');
if (!report.allPassed) {
  throw new Error(
    'Cross-evaluator parity check failed: ' + JSON.stringify({ ...report, recipes: undefined }),
  );
}
console.log(JSON.stringify({ ...report, recipes: perRecipe.length }));
