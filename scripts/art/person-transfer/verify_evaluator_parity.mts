#!/usr/bin/env node
/** Verify person-family.ts admission, Python/TS parity, bilinear accuracy, seam closure, and edit-order invariance. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, kitArg, definitionArg, patchArg, v3CompiledArg, laneCompiledArg, outArg] = process.argv.slice(2);
if (!repoArg || !kitArg || !definitionArg || !patchArg || !v3CompiledArg || !laneCompiledArg || !outArg) {
  throw new Error(
    'Usage: verify_evaluator_parity.mts <repo> <kitDir> <definitionJson> <meshPatchJson> <v3CompiledJson> <laneCompiledJson> <outJson>',
  );
}

const repo = resolve(repoArg);
const kitDir = resolve(kitArg);
const compiledRaw = JSON.parse(readFileSync(join(kitDir, 'compiled.json'), 'utf8'));
const definition = JSON.parse(readFileSync(resolve(definitionArg), 'utf8'));
const patchDoc = JSON.parse(readFileSync(resolve(patchArg), 'utf8'));

const { admitPersonFamily, evaluatePerson } = await import(
  pathToFileURL(join(repo, 'apps/client/src/characters/person-family.ts')).href
);

const family = admitPersonFamily(compiledRaw, definition.reference, definition);
const defaults = Object.fromEntries(definition.controls.map((c: any) => [c.id, c.defaultValue]));
const selections = Object.fromEntries(definition.selections.map((s: any) => [s.id, s.defaultValue]));
const massKey: string = patchDoc.axisControls.mass;
const fullKey: string = patchDoc.axisControls.fullness;
const mode: number = patchDoc.supportMode;

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

// Run Python people.py on the exact same coordinate list and compare every mesh + pinned lean V3/lane witnesses
const pyScript = `
import json, sys, numpy as np
from pathlib import Path
repo, kit, v3_path, lane_path, coords_json = sys.argv[1:]
sys.path.insert(0, str(Path(repo) / 'scripts/art'))
import people
comp = json.loads((Path(kit) / 'compiled.json').read_text())
prof = json.loads((Path(kit) / 'profile.json').read_text())
sel = {r['id']: r['defaultValue'] for r in prof['selections']}
coords = json.loads(coords_json)
out = {'recipes': {}}
for m, f in coords:
    rec = people.resolve_recipe(comp, {'family': comp['reference'], 'controls': {'${massKey}': m, '${fullKey}': f}, 'selections': sel}, prof)
    st = people.evaluate_body(comp, rec)
    people.fit_parts(comp, st, ['proofShirt'])
    key = f'{m:.2f},{f:.2f}'
    out['recipes'][key] = {
        k: np.asarray(st['canonicalPositions'][k], dtype=np.float32).tolist()
        for k in ('bodySkin', 'headSkin', 'studioShorts', 'proofShirt')
    }
v3 = json.loads(Path(v3_path).read_text())
v3_prof = json.loads((Path(v3_path).parent / 'profile.json').read_text())
v3_sel = {r['id']: r['defaultValue'] for r in v3_prof['selections']}
v3_ctrl = {'${massKey}': 0.5, '${fullKey}': 0.0}
if 'definition' in v3['controls']: v3_ctrl['definition'] = 1.0
v3_rec = people.resolve_recipe(v3, {'family': v3['reference'], 'controls': v3_ctrl, 'selections': v3_sel}, v3_prof)
v3_body = people.evaluate_body(v3, v3_rec)['canonicalPositions']['bodySkin']

lane = json.loads(Path(lane_path).read_text())
lane_prof = json.loads((Path(lane_path).parent / 'profile.json').read_text())
lane_sel = {r['id']: r['defaultValue'] for r in lane_prof['selections']}
lane_ctrl = {'${massKey}': 0.5, '${fullKey}': 0.0}
if 'definition' in lane['controls']: lane_ctrl['definition'] = 1.0
lane_rec = people.resolve_recipe(lane, {'family': lane['reference'], 'controls': lane_ctrl, 'selections': lane_sel}, lane_prof)
lane_st = people.evaluate_body(lane, lane_rec)
people.fit_parts(lane, lane_st, ['proofShirt'])
out['leanV3Body'] = np.asarray(v3_body, dtype=np.float32).tolist()
out['leanLaneShirt'] = np.asarray(lane_st['canonicalPositions']['proofShirt'], dtype=np.float32).tolist()
print(json.dumps(out))
`;

const pyRaw = execFileSync(
  '/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python',
  ['-c', pyScript, repo, kitDir, resolve(v3CompiledArg), resolve(laneCompiledArg), JSON.stringify(allCoords)],
  { maxBuffer: 256 * 1024 * 1024 },
).toString('utf8');
const pyData = JSON.parse(pyRaw);

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

  const meshDiffs: Record<string, number> = {};
  for (const meshId of ['bodySkin', 'headSkin', 'studioShorts', 'proofShirt']) {
    const tsPos = fresh.canonicalPositions.get(meshId);
    if (!tsPos) throw new Error(`Missing evaluated mesh ${meshId}`);
    const diff = maxDiffMeters(tsPos, pyData.recipes[key][meshId]);
    meshDiffs[meshId] = diff;
    if (diff > maxPythonTsDiffM) maxPythonTsDiffM = diff;
  }

  // Check all 92 paired neck/torso seam positions and shared normals
  for (const seam of family.seams) {
    const bPos = fresh.canonicalPositions.get(seam.bodyMesh)!;
    const hPos = fresh.canonicalPositions.get(seam.headMesh)!;
    const bNrm = fresh.canonicalNormals.get(seam.bodyMesh)!;
    const hNrm = fresh.canonicalNormals.get(seam.headMesh)!;
    for (let k = 0; k < seam.bodyVertices.length; k++) {
      const bi = seam.bodyVertices[k]! * 3;
      const hi = seam.headVertices[k]! * 3;
      const pGap = Math.hypot(bPos[bi]! - hPos[hi]!, bPos[bi + 1]! - hPos[hi + 1]!, bPos[bi + 2]! - hPos[hi + 2]!);
      const nGap = Math.hypot(bNrm[bi]! - hNrm[hi]!, bNrm[bi + 1]! - hNrm[hi + 1]!, bNrm[bi + 2]! - hNrm[hi + 2]!);
      if (pGap > maxSeamPosGapM) maxSeamPosGapM = pGap;
      if (nGap > maxSeamNormalGap) maxSeamNormalGap = nGap;
    }
  }
  perRecipe.push({ coordinate: [m, f], pythonVsTsMaxMeters: meshDiffs });
}

// Check pinned M050-F000 preservation against V3 body and lane shirt
const leanEval = evaluatePerson(family, makeRecipe(0.5, 0.0), { parts: ['proofShirt'] });
const leanBodyVsV3M = maxDiffMeters(leanEval.canonicalPositions.get('bodySkin')!, pyData.leanV3Body);
const leanShirtVsLaneM = maxDiffMeters(leanEval.canonicalPositions.get('proofShirt')!, pyData.leanLaneShirt);

// Check incremental sweep & edit-order equivalence (M->F vs F->M vs fresh)
let prevState: any = evaluatePerson(family, makeRecipe(0.5, 0.5), { parts: ['proofShirt'] });
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
  prevState = evaluatePerson(family, makeRecipe(m, f), { parts: ['proofShirt'], previous: prevState });
  const freshState = evaluatePerson(family, makeRecipe(m, f), { parts: ['proofShirt'] });
  for (const meshId of ['bodySkin', 'studioShorts', 'proofShirt']) {
    const d = maxDiffMeters(prevState.canonicalPositions.get(meshId)!, freshState.canonicalPositions.get(meshId)!);
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
    orderMF = evaluatePerson(family, makeRecipe(m, 0.5), { parts: ['proofShirt'], previous: orderMF });
    orderMF = evaluatePerson(family, makeRecipe(m, f), { parts: ['proofShirt'], previous: orderMF });

    let orderFM = evaluatePerson(family, makeRecipe(0.5, 0.5), { parts: ['proofShirt'] });
    orderFM = evaluatePerson(family, makeRecipe(0.5, f), { parts: ['proofShirt'], previous: orderFM });
    orderFM = evaluatePerson(family, makeRecipe(m, f), { parts: ['proofShirt'], previous: orderFM });

    for (const meshId of ['bodySkin', 'studioShorts', 'proofShirt']) {
      const d = maxDiffMeters(orderMF.canonicalPositions.get(meshId)!, orderFM.canonicalPositions.get(meshId)!);
      if (d > maxEditOrderDiffM) maxEditOrderDiffM = d;
    }
  }
}

// Also verify removal -> restoration equivalence
const dressed0 = evaluatePerson(family, makeRecipe(0.5, 1.0), { parts: ['proofShirt'] });
const removed = evaluatePerson(family, makeRecipe(0.5, 1.0), { parts: [], previous: dressed0 });
const restored = evaluatePerson(family, makeRecipe(0.5, 1.0), { parts: ['proofShirt'], previous: removed });
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
  throw new Error('Cross-evaluator parity check failed: ' + JSON.stringify({ ...report, recipes: undefined }));
}
console.log(JSON.stringify({ ...report, recipes: perRecipe.length }));
