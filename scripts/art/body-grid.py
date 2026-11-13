#!/usr/bin/env python3
"""Offline two-slider body-support grid decomposition and family-kit rebase helper.

Consumes corresponding canonical body positions across Muscle Mass x Fullness
supports (modes 2, 6 or 9) and emits immutable data for scripts/art/people.py
and apps/client/src/characters/person-family.ts without a parallel evaluator.
Contract: docs/production-workflows/art-flows/body-reference-family.md#8-compile-supports-into-the-existing-evaluator
"""
import argparse
import copy
import hashlib
import importlib.util
import itertools
import json
import math
from pathlib import Path
import sys

import numpy as np

sys.dont_write_bytecode = True
AXES = ('mass', 'fullness')
NODES = (0.0, 0.5, 1.0)


class GridInputError(ValueError):
    pass


def require(ok, message):
    if not ok:
        raise GridInputError(message)


def sha256_file(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def stable_json(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False)


def object_digest(value):
    return hashlib.sha256(stable_json(value).encode('utf-8')).hexdigest()


def read_json(path):
    return json.loads(
        Path(path).read_text(),
        parse_constant=lambda x: (_ for _ in ()).throw(GridInputError('Nonfinite JSON: ' + x)),
    )


def resolve_record(record, base):
    p = Path(record['path'])
    if not p.is_absolute():
        p = base / p
    require(p.is_file(), f'Missing input: {p}')
    require(sha256_file(p) == record['sha256'], f'Input hash mismatch: {p}')
    return p


def expected_coords(mode):
    if mode == 2:
        return {(0.5, 0.0), (0.5, 1.0)}
    if mode == 6:
        return {(m, f) for m in NODES for f in (0.0, 1.0)}
    if mode == 9:
        return set(itertools.product(NODES, repeat=2))
    raise GridInputError(f'Unsupported supportMode: {mode}')


def physical_space(family, manifest, mapping, retired):
    excluded = set(mapping.values()) | set(retired)
    return {
        'units': 'metres',
        'axes': family['axes'],
        'referenceStatureMetres': family['referenceStatureMetres'],
        'poseId': manifest['referencePoseId'],
        'rigSha256': object_digest(family['rig']),
        'neutralControls': {
            k: v['default'] for k, v in family['controls'].items() if k not in excluded
        },
    }


def schema_arrays(mesh):
    result = {}
    int_keys = ('triangles', 'sourceVertexIndices', 'renderTriangles', 'jointIndices')
    for name in (*int_keys, 'uvs', 'jointWeights'):
        if name in mesh:
            dtype = np.uint32 if name in int_keys else np.float32
            arr = np.asarray(mesh[name], dtype=dtype).reshape(-1)
            require(np.all(np.isfinite(arr)), f'Nonfinite family {name}')
            result[name] = arr
    require('uvs' in result and result['uvs'].size > 0, 'A UV-corresponding body source is required')
    return result


def load_people_owner(repo):
    owner_path = Path(repo) / 'scripts/art/people.py'
    spec = importlib.util.spec_from_file_location('existing_people_owner', owner_path)
    owner = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(owner)
    return owner, owner_path


def admit(manifest_path, repo):
    manifest = read_json(manifest_path)
    require(manifest.get('kind') == 'body-support-grid-input', 'Unsupported manifest kind')
    mode = manifest.get('supportMode')
    require(type(mode) is int and mode in (2, 6, 9), 'supportMode must be 2, 6 or 9')
    mapping = manifest.get('axisControls', {})
    require(
        set(mapping) == set(AXES) and len(set(mapping.values())) == 2,
        'axisControls must map mass and fullness once to two distinct family control IDs',
    )
    retired = manifest.get('retiredControls', [])
    require(
        isinstance(retired, list) and all(isinstance(c, str) and c not in mapping.values() for c in retired),
        'Invalid retiredControls list',
    )
    family_path = resolve_record(manifest['family'], manifest_path.parent)
    family = read_json(family_path)
    mesh_id = manifest['meshId']
    require(mesh_id in family['meshes'], f'Unknown selected family mesh: {mesh_id}')
    require(
        isinstance(manifest.get('referencePoseId'), str) and bool(manifest['referencePoseId']),
        'referencePoseId is required',
    )
    require(
        family['axes'] == {'up': 'Y', 'forward': '+Z', 'units': 'metres'} or family['axes'] == 'gltf',
        'Unsupported physical axis/unit declaration',
    )
    require(
        math.isfinite(family['referenceStatureMetres']) and family['referenceStatureMetres'] > 0,
        'Invalid reference stature',
    )
    for key in mapping.values():
        control = family['controls'].get(key)
        require(
            control is not None and control['kind'] == 'bipolar' and control['bounds'] == [0, 1],
            f'Mapped controls must be existing normalized bipolar IDs: {key}',
        )
    mesh = family['meshes'][mesh_id]
    base = np.asarray(mesh['positions'], dtype=np.float32).reshape(-1)
    require(base.size > 0 and base.size % 3 == 0 and np.all(np.isfinite(base)), 'Invalid canonical body positions')
    require(
        np.all(np.asarray(mesh['frameDelta']) == 0),
        'Single-base conversion requires zero frameDelta; qualify separate bases independently',
    )
    arrays = schema_arrays(mesh)
    space = physical_space(family, manifest, mapping, retired)
    anchors = manifest.get('protectedAnchorVertices', [])
    require(
        isinstance(anchors, list)
        and len(anchors) >= 3
        and all(type(i) is int and 0 <= i < base.size // 3 for i in anchors),
        'At least three valid protected anchor vertices required',
    )
    require(len(set(anchors)) == len(anchors), 'Duplicate protected anchor vertex')
    tolerance = manifest.get('toleranceMetres')
    require(
        type(tolerance) in (int, float) and math.isfinite(tolerance) and 0 < tolerance <= 0.0001,
        'Explicit reconstruction tolerance must be in (0, 0.0001] metres',
    )

    supports = {}
    sources = []
    anchor_ref = None
    for item in manifest.get('supports', []):
        coordinate = item.get('coordinate')
        require(
            isinstance(coordinate, list)
            and len(coordinate) == 2
            and all(type(v) in (int, float) and float(v) in NODES for v in coordinate),
            f'Support coordinate must contain two grid fractions in {NODES}: {coordinate}',
        )
        c = (float(coordinate[0]), float(coordinate[1]))
        require(c not in supports, f'Duplicate coordinate: {c}')
        p = resolve_record(item, manifest_path.parent)
        with np.load(p, allow_pickle=False) as data:
            require(
                'positions' in data and 'physicalSpaceJson' in data and 'topology' in data,
                f'Support missing geometry/physical-space metadata: {p}',
            )
            require(
                json.loads(str(data['physicalSpaceJson'].item())) == space,
                f'Physical space, pose, rig or neutral control mismatch: {p}',
            )
            require(str(data['topology'].item()) == mesh['topology'], f'Topology identity mismatch: {p}')
            for name, expected in arrays.items():
                require(name in data, f'Missing correspondence array {name}: {p}')
                raw_arr = np.asarray(data[name])
                if name in ('triangles', 'sourceVertexIndices', 'renderTriangles', 'jointIndices'):
                    require(
                        raw_arr.dtype.kind in 'iu'
                        and np.all(raw_arr >= 0)
                        and np.all(raw_arr <= np.iinfo(expected.dtype).max),
                        f'Invalid or overflowing topology/skin index array: {name}',
                    )
                actual = raw_arr.astype(expected.dtype).reshape(-1)
                require(
                    actual.shape == expected.shape and np.array_equal(actual, expected),
                    f'Correspondence mismatch {name}: {p}',
                )
            extra = (
                set(data.files)
                & {'uvs', 'sourceVertexIndices', 'renderTriangles', 'jointIndices', 'jointWeights'}
                - set(arrays)
            )
            require(not extra, f'Unexpected correspondence arrays: {sorted(extra)}')
            raw_pos = np.asarray(data['positions'])
            require(
                raw_pos.dtype.kind in 'fiu' and raw_pos.size == base.size and np.all(np.isfinite(raw_pos)),
                f'Invalid or nonfinite support positions: {p}',
            )
            positions = raw_pos.astype(np.float32).reshape(-1)
            require(np.all(np.isfinite(positions)), f'Positions overflow float32: {p}')
            pts_anchor = positions.reshape(-1, 3)[anchors].astype(np.float64)
            if anchor_ref is None:
                require(
                    np.linalg.matrix_rank(pts_anchor - pts_anchor[0], tol=1e-7) >= 2,
                    'Protected anchors must be noncollinear',
                )
                anchor_ref = pts_anchor
            anchor_error = float(np.max(np.linalg.norm(pts_anchor - anchor_ref, axis=1)))
            require(anchor_error <= tolerance, f'Protected physical anchors moved {anchor_error} m: {p}')
            supports[c] = positions.copy()
            sources.append(
                {
                    'coordinate': list(c),
                    'path': str(p),
                    'sha256': item['sha256'],
                    'protectedAnchorMaxErrorMetres': anchor_error,
                    'status': item.get('sourceStatus', 'unspecified'),
                }
            )
    wanted = expected_coords(mode)
    require(
        set(supports) == wanted,
        f'Expected exact {mode}-support coordinate set; missing={sorted(wanted - set(supports))}; extra={sorted(set(supports) - wanted)}',
    )
    return manifest, family, mesh, supports, sources, space


def fill_grid(supports, mode):
    grid = dict(supports)
    derived = []
    if mode == 2:
        # Stage A: mass locked at 0.5; derive (0.5, 0.5) linearly between (0.5, 0.0) and (0.5, 1.0)
        mid = (0.5 * supports[0.5, 0.0].astype(np.float64) + 0.5 * supports[0.5, 1.0].astype(np.float64)).astype(
            np.float32
        )
        grid[0.5, 0.5] = mid
        derived.append([0.5, 0.5])
        # Populate m in {0.0, 1.0} identical to m=0.5 so neutral B=S(0.5,0.5) has exact-zero mass targets
        for m in (0.0, 1.0):
            for f in NODES:
                grid[m, f] = grid[0.5, f].copy()
                derived.append([m, f])
        return grid, derived
    for m, f in itertools.product(NODES, repeat=2):
        if (m, f) in grid:
            continue
        # Mode 6: fill F=0.5 linearly in fullness at each fixed mass
        val = (0.5 * supports[m, 0.0].astype(np.float64) + 0.5 * supports[m, 1.0].astype(np.float64)).astype(
            np.float32
        )
        grid[m, f] = val
        derived.append([m, f])
    return grid, derived


def decompose_two_slider(grid, mapping, control_order):
    """Decompose 3x3 grid around B = S(0.5, 0.5) matching float32 rounding order in people.evaluate_mesh."""
    neutral = grid[0.5, 0.5].copy()
    targets = {'grid_zero': np.zeros_like(neutral, dtype=np.float32)}
    bindings = {}
    correctives = []

    def store(name, delta_f32):
        if not np.any(delta_f32):
            return ['grid_zero', 'grid_zero']
        targets[name] = delta_f32
        return [name, name]

    # Single-axis excursions from B = S(0.5, 0.5)
    single_f32 = {}
    for axis_idx, axis_name in enumerate(AXES):
        ctrl_id = mapping[axis_name]
        bindings[ctrl_id] = {}
        for side_val, side_name in ((0.0, 'negative'), (1.0, 'positive')):
            pt = [0.5, 0.5]
            pt[axis_idx] = side_val
            target_pos = grid[tuple(pt)]
            delta = (target_pos.astype(np.float64) - neutral.astype(np.float64)).astype(np.float32)
            name = f'grid_{ctrl_id}_{side_name}'
            bindings[ctrl_id][side_name] = store(name, delta)
            single_f32[axis_idx, side_val] = delta
            # Sub-micrometre float32 ULP cancellation guard for single-axis endpoints (e.g. M050-F000 Peacock lean)
            reconstructed = (neutral.astype(np.float64) + delta.astype(np.float64)).astype(np.float32)
            precision = (target_pos.astype(np.float64) - reconstructed.astype(np.float64)).astype(np.float32)
            if np.any(precision):
                prec_name = f'grid_{ctrl_id}_{side_name}_ulp'
                correctives.append(
                    {
                        'drivers': [{'control': ctrl_id, 'side': side_name}],
                        'targets': store(prec_name, precision),
                    }
                )

    # Pair interaction correctives at the four corners (s_m, s_f) in {0.0, 1.0}^2
    mass_ctrl = mapping['mass']
    full_ctrl = mapping['fullness']
    # Apply single-axis controls in exact family control iteration order
    ordered_axes = sorted((0, 1), key=lambda idx: control_order.index(mapping[AXES[idx]]))
    for s_m, s_f in itertools.product((0.0, 1.0), repeat=2):
        sides = (s_m, s_f)
        acc = neutral.copy()
        for idx in ordered_axes:
            d = single_f32[idx, sides[idx]]
            if np.any(d):
                acc = (acc.astype(np.float64) + d.astype(np.float64)).astype(np.float32)
        # Account for any single-driver ULP corrective active on this corner
        for corr in correctives:
            if len(corr['drivers']) == 1:
                drv = corr['drivers'][0]
                active = (drv['control'] == mass_ctrl and drv['side'] == ('negative' if s_m == 0.0 else 'positive')) or (
                    drv['control'] == full_ctrl and drv['side'] == ('negative' if s_f == 0.0 else 'positive')
                )
                if active:
                    u = targets[corr['targets'][0]]
                    acc = (acc.astype(np.float64) + u.astype(np.float64)).astype(np.float32)
        corner_pos = grid[s_m, s_f]
        pair_delta = (corner_pos.astype(np.float64) - acc.astype(np.float64)).astype(np.float32)
        if np.any(pair_delta):
            m_side = 'negative' if s_m == 0.0 else 'positive'
            f_side = 'negative' if s_f == 0.0 else 'positive'
            name = f'grid_{mass_ctrl}_{m_side}_{full_ctrl}_{f_side}'
            correctives.append(
                {
                    'drivers': [
                        {'control': mass_ctrl, 'side': m_side},
                        {'control': full_ctrl, 'side': f_side},
                    ],
                    'targets': store(name, pair_delta),
                }
            )
    # Drop unused grid_zero if never referenced
    used = {t for c in bindings.values() for pair in c.values() for t in pair} | {
        t for corr in correctives for t in corr['targets']
    }
    targets = {k: v for k, v in targets.items() if k in used}
    return neutral, targets, bindings, correctives


def piecewise_bilinear(grid, coordinate):
    brackets = []
    for value in coordinate:
        lo, hi = (0.0, 0.5) if value <= 0.5 else (0.5, 1.0)
        t = (value - lo) / (hi - lo)
        brackets.append(((lo, 1.0 - t), (hi, t)))
    result = np.zeros_like(next(iter(grid.values())), dtype=np.float64)
    for corner in itertools.product(*brackets):
        weight = corner[0][1] * corner[1][1]
        result += weight * grid[corner[0][0], corner[1][0]].astype(np.float64)
    return result.astype(np.float32)


def run_compile(manifest_path, output, repo):
    manifest, family, mesh, supports, sources, space = admit(manifest_path, repo)
    owner, owner_path = load_people_owner(repo)
    output = owner.external_output(str(output))
    require(not output.exists(), f'Output already exists; choose a fresh directory: {output}')
    mode = manifest['supportMode']
    mapping = manifest['axisControls']
    control_order = [c for c in family['controls'] if c in mapping.values()]
    grid, derived = fill_grid(supports, mode)
    neutral, targets, bindings, correctives = decompose_two_slider(grid, mapping, control_order)

    mesh_id = manifest['meshId']
    patch = {
        'positions': neutral.tolist(),
        'frameDelta': np.zeros_like(neutral).tolist(),
        'targets': {k: v.tolist() for k, v in targets.items()},
        'correctives': correctives,
    }
    evaluation_family = {'meshes': {mesh_id: patch}, 'controls': {}, 'ageSamples': {}}
    for control in control_order:
        evaluation_family['controls'][control] = {'kind': 'bipolar', 'targets': {mesh_id: bindings[control]}}

    if mode == 2:
        grid_points = [(0.5, 0.0), (0.5, 0.5), (0.5, 1.0)]
        interior_points = [(0.5, 0.25), (0.5, 0.75)]
    else:
        grid_points = sorted(grid)
        interior_points = list(itertools.product((0.25, 0.75), repeat=2))

    cases = []
    for label, pts in [('support', sorted(supports)), ('grid', grid_points), ('interior', interior_points)]:
        for point in pts:
            recipe = {'controls': {mapping['mass']: point[0], mapping['fullness']: point[1]}}
            actual = owner.evaluate_mesh(evaluation_family, mesh_id, recipe, 0.0, 30.0, {'meshId': '__none__'})
            expected = supports[point] if label == 'support' else piecewise_bilinear(grid, point)
            error = float(
                np.max(np.linalg.norm((actual.astype(np.float64) - expected.astype(np.float64)).reshape(-1, 3), axis=1))
            )
            cases.append(
                {
                    'kind': label,
                    'coordinate': list(point),
                    'maxPositionErrorMetres': error,
                    'pass': error <= manifest['toleranceMetres'],
                }
            )

    report = {
        'scope': 'Two-slider corresponding-grid decomposition and native people.evaluate_mesh algebraic check; visual, garment, motion and renderer qualification remain separate.',
        'manifestSha256': sha256_file(manifest_path),
        'family': manifest['family'],
        'ownerPath': str(owner_path),
        'ownerSha256': sha256_file(owner_path),
        'supportMode': mode,
        'axisControls': mapping,
        'retiredControls': manifest.get('retiredControls', []),
        'vertexCount': neutral.size // 3,
        'neutralCoordinate': [0.5, 0.5],
        'derivedGridCoordinates': derived,
        'targetArrays': len(targets),
        'targetNames': sorted(targets),
        'correctiveRecords': len(correctives),
        'singleBaseFramePairs': 'Each pair aliases the same target ID at both frame endpoints.',
        'operationOrder': control_order,
        'floatStorage': 'float32; sequential float32 rounding matched to people.evaluate_mesh and person-family.ts',
        'physicalSpace': space,
        'sources': sources,
        'checks': cases,
        'maximumErrorMetres': max(c['maxPositionErrorMetres'] for c in cases),
        'allPassed': all(c['pass'] for c in cases),
        'toleranceMetres': manifest['toleranceMetres'],
    }
    require(report['allPassed'], f'Reconstruction tolerance failed; maximum {report["maximumErrorMetres"]} m')
    output.mkdir(parents=True)
    payload = {
        'kind': 'body-support-grid-mesh-patch',
        'supportMode': mode,
        'meshId': mesh_id,
        'axisControls': mapping,
        'retiredControls': manifest.get('retiredControls', []),
        'leanAnchorPositions': supports[0.5, 0.0].tolist(),
        'mesh': patch,
        'controlTargets': {c: {mesh_id: b} for c, b in bindings.items()},
    }
    (output / 'mesh-patch.json').write_text(json.dumps(payload, separators=(',', ':'), allow_nan=False) + '\n')
    (output / 'reconstruction.json').write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(
        json.dumps(
            {
                'output': str(output),
                'supportMode': mode,
                'vertices': report['vertexCount'],
                'targetArrays': report['targetArrays'],
                'correctives': report['correctiveRecords'],
                'checks': len(cases),
                'maximumErrorMetres': report['maximumErrorMetres'],
                'allPassed': report['allPassed'],
            }
        )
    )


def gltf_to_blender(pts):
    arr = np.asarray(pts, dtype=np.float32).reshape(-1, 3)
    return arr[:, [0, 2, 1]] * np.array([1.0, -1.0, 1.0], dtype=np.float32)


def rebase_surface_binding(owner, binding, old_lean_support, expected_lean_garment):
    triangles = np.asarray(binding['triangles'], dtype=np.int64).reshape(-1, 3)
    axis = np.stack(owner.triangle_basis(old_lean_support, triangles), axis=1)
    anchor = owner.surface_points(
        old_lean_support, triangles, binding['barycentric'], np.zeros_like(expected_lean_garment)
    ).reshape(-1, 3)
    delta_offsets = np.einsum('nij,nj->ni', axis, expected_lean_garment - anchor)
    updated = copy.deepcopy(binding)
    updated['offsets'] = delta_offsets.astype(np.float32).reshape(-1).tolist()
    return updated


def run_assemble_kit(args):
    """Run inside Blender (--python body-grid.py -- assemble-kit ...) to rebase bodySkin, shirt support, and garments."""
    import bpy
    from mathutils import Matrix

    owner, _ = load_people_owner(args.repository)
    out = owner.external_output(str(args.output))
    require(not out.exists(), f'Output kit directory already exists: {out}')

    patch_doc = read_json(args.mesh_patch)
    require(patch_doc.get('kind') == 'body-support-grid-mesh-patch', 'Expected body-support-grid-mesh-patch JSON')
    mode = patch_doc['supportMode']
    mapping = patch_doc['axisControls']
    retired = set(patch_doc.get('retiredControls', []))
    body_id = patch_doc['meshId']
    lean_body = np.asarray(patch_doc['leanAnchorPositions'], dtype=np.float32).reshape(-1, 3)
    neutral_body = np.asarray(patch_doc['mesh']['positions'], dtype=np.float32).reshape(-1, 3)
    target_arrays = {
        k: np.asarray(v, dtype=np.float32).reshape(-1, 3) for k, v in patch_doc['mesh']['targets'].items()
    }

    source_kit = args.source_kit.resolve()
    lean_kit = args.lean_kit.resolve()
    source_compiled = read_json(source_kit / 'compiled.json')
    source_desc = read_json(source_kit / 'descriptor.json')
    source_profile = read_json(source_kit / 'profile.json')
    lean_compiled = read_json(lean_kit / 'compiled.json')
    require(source_compiled['rig'] == lean_compiled['rig'], 'Source kit and lean V3 kit have different rigs')

    # Evaluate exact lean garment geometry at M=0.5, F=0.0 (and pre-retirement definition=1 if present in source)
    lean_controls = {mapping['mass']: 0.5, mapping['fullness']: 0.0}
    if 'definition' in source_compiled['controls']:
        lean_controls['definition'] = 1.0
    src_sel = {r['id']: r['defaultValue'] for r in source_profile['selections']}
    src_recipe = owner.resolve_recipe(
        source_compiled,
        {'family': source_compiled['reference'], 'controls': lean_controls, 'selections': src_sel},
        source_profile,
    )
    src_state = owner.evaluate_body(source_compiled, src_recipe)
    owner.fit_parts(source_compiled, src_state, ['proofShirt'])
    expected_lean_shirt = owner.points(src_state['canonicalPositions']['proofShirt']).copy()
    old_lean_shirt_support = owner.points(
        src_state['canonicalPositions']['PeacockBodyLOD1HeadLOD2Support']
    ).copy()

    # Verify M050-F000 body matches pinned V3 lean body within 1e-6 m
    lean_sel = {r['id']: r['defaultValue'] for r in read_json(lean_kit / 'profile.json')['selections']}
    v3_controls = {mapping['mass']: 0.5, mapping['fullness']: 0.0}
    if 'definition' in lean_compiled['controls']:
        v3_controls['definition'] = 1.0
    v3_recipe = owner.resolve_recipe(
        lean_compiled,
        {'family': lean_compiled['reference'], 'controls': v3_controls, 'selections': lean_sel},
        read_json(lean_kit / 'profile.json'),
    )
    v3_body = owner.points(owner.evaluate_body(lean_compiled, v3_recipe)['canonicalPositions'][body_id])
    v3_diff = float(np.max(np.linalg.norm(lean_body.astype(np.float64) - v3_body.astype(np.float64), axis=1)))
    require(v3_diff <= 1e-6, f'M050-F000 support differs from pinned V3 lean body by {v3_diff} m')

    # Read optional R4 coverage kit for studioShorts
    coverage_weights = None
    if args.coverage_kit is not None:
        cov_kit = args.coverage_kit.resolve()
        cov_desc = read_json(cov_kit / 'descriptor.json')
        shorts_fit_src = cov_desc['family']['parts']['studioShorts']['pieces'][0]['fit']
        # Evaluate expected lean shorts from R4 witness binding on lean_body
        expected_lean_shorts = owner.surface_points(
            lean_body,
            shorts_fit_src['triangles'],
            shorts_fit_src['barycentric'],
            shorts_fit_src['offsets'],
        ).reshape(-1, 3)
        bpy.ops.wm.open_mainfile(filepath=str(cov_kit / 'family.blend'), load_ui=False)
        cov_obj = bpy.data.objects[cov_desc['objects']['studioShorts']['object']]
        g_names = [g.name for g in cov_obj.vertex_groups]
        coverage_weights = [
            {g_names[g.group]: g.weight for g in v.groups if g.weight > 0} for v in cov_obj.data.vertices
        ]
    else:
        shorts_fit_src = source_desc['family']['parts']['studioShorts']['pieces'][0]['fit']
        expected_lean_shorts = owner.points(src_state['canonicalPositions']['studioShorts']).copy()

    # Build new neutral shirt support (first len(lean_body) rows = neutral_body, remainder = unchanged head support rows)
    neutral_shirt_support = old_lean_shirt_support.copy()
    neutral_shirt_support[: len(lean_body)] = neutral_body
    lean_shirt_support = old_lean_shirt_support.copy()
    lean_shirt_support[: len(lean_body)] = lean_body

    new_desc = copy.deepcopy(source_desc)
    new_family = new_desc['family']
    new_profile = copy.deepcopy(source_profile)
    new_family['seams'] = copy.deepcopy(lean_compiled['seams'])
    for part in new_family['parts'].values():
        require(not part.get('hiddenRegions'), 'Unmasked fit proof requires empty hiddenRegions on all parts')

    # Remove retired controls cleanly (no legacy compatibility shims)
    for ctrl in retired:
        new_family['controls'].pop(ctrl, None)
        for lm_bindings in new_family.get('landmarkControlTargets', {}).values():
            lm_bindings.pop(ctrl, None)
    new_profile['controls'] = [c for c in new_profile['controls'] if c['id'] not in retired]

    mass_id, full_id = mapping['mass'], mapping['fullness']
    mass_bounds = [0.5, 0.5] if mode == 2 else [0.0, 1.0]
    new_family['controls'][mass_id]['bounds'] = mass_bounds
    new_family['controls'][mass_id]['default'] = 0.5
    new_family['controls'][full_id]['bounds'] = [0.0, 1.0]
    new_family['controls'][full_id]['default'] = 0.5 if mode != 2 else 0.0
    for row in new_profile['controls']:
        if row['id'] == mass_id:
            row.update(minimum=mass_bounds[0], maximum=mass_bounds[1], defaultValue=0.5)
        elif row['id'] == full_id:
            row.update(minimum=0.0, maximum=1.0, defaultValue=0.5 if mode != 2 else 0.0)

    support_id = 'PeacockBodyLOD1HeadLOD2Support'
    for ctrl_id, mesh_map in patch_doc['controlTargets'].items():
        pair = mesh_map[body_id]
        new_family['controls'][ctrl_id]['targets'] = {
            body_id: copy.deepcopy(pair),
            support_id: copy.deepcopy(pair),
        }

    # Rebase studioShorts and proofShirt bindings so M050-F000 reproduces exact lean garments and neutral Basis matches
    new_shorts_fit = rebase_surface_binding(owner, shorts_fit_src, lean_body, expected_lean_shorts)
    new_desc['family']['parts']['studioShorts']['pieces'][0]['fit'] = new_shorts_fit
    rebased_neutral_shorts = owner.surface_points(
        neutral_body, new_shorts_fit['triangles'], new_shorts_fit['barycentric'], new_shorts_fit['offsets']
    ).reshape(-1, 3)

    shirt_fit_src = new_desc['family']['parts']['proofShirt']['pieces'][0]['fit']
    new_shirt_fit = rebase_surface_binding(owner, shirt_fit_src, lean_shirt_support, expected_lean_shirt)
    new_desc['family']['parts']['proofShirt']['pieces'][0]['fit'] = new_shirt_fit
    rebased_neutral_shirt = owner.surface_points(
        neutral_shirt_support, new_shirt_fit['triangles'], new_shirt_fit['barycentric'], new_shirt_fit['offsets']
    ).reshape(-1, 3)

    # Set presets for Stage A (3 presets) or Stage B/C (9 grid presets)
    if mode == 2:
        new_profile['label'] = 'Adult masculine body family · Stage A pair'
        new_profile['presets'] = [
            {'id': 'M050-F000', 'label': 'M050-F000 (Lean anchor)', 'group': 'body', 'selections': {}, 'controls': {full_id: 0.0}},
            {'id': 'M050-F050', 'label': 'M050-F050 (Midpoint)', 'group': 'body', 'selections': {}, 'controls': {full_id: 0.5}},
            {'id': 'M050-F100', 'label': 'M050-F100 (Fuller)', 'group': 'body', 'selections': {}, 'controls': {full_id: 1.0}},
        ]
    else:
        new_profile['label'] = f'Adult masculine body family · {mode}-support two-slider grid'
        new_profile['presets'] = [
            {
                'id': f'M{int(round(m * 100)):03d}-F{int(round(f * 100)):03d}',
                'label': f'M{int(round(m * 100)):03d}-F{int(round(f * 100)):03d}',
                'group': 'body',
                'selections': {},
                'controls': {mass_id: m, full_id: f},
            }
            for f in NODES
            for m in NODES
        ]

    # Open source family.blend and rewrite shape keys cleanly on bodySkin and PeacockBodyLOD1HeadLOD2Support
    bpy.ops.wm.open_mainfile(filepath=str(source_kit / 'family.blend'), load_ui=False)
    for asset_id, base_pts in ((body_id, neutral_body), (support_id, neutral_shirt_support)):
        obj_spec = new_desc['objects'][asset_id]
        obj = bpy.data.objects[obj_spec['object']]
        require(obj.matrix_world == Matrix.Identity(4), f'{asset_id} non-identity matrix_world')
        vcount = len(obj.data.vertices)
        if obj.data.shape_keys:
            obj.shape_key_clear()
        basis_key = obj.shape_key_add(name='Basis', from_mix=False)
        native_base = gltf_to_blender(base_pts).reshape(-1)
        basis_key.data.foreach_set('co', native_base)
        obj.data.vertices.foreach_set('co', native_base)

        zero_key = obj.shape_key_add(name='GridZeroOrigin', from_mix=False)
        zero_key.data.foreach_set('co', np.zeros(vcount * 3, dtype=np.float32))

        new_targets_map = {'zero': None}
        for t_name, delta_gltf in sorted(target_arrays.items()):
            sk = obj.shape_key_add(name=t_name, from_mix=False)
            sk.relative_key = zero_key
            full_delta = np.zeros((vcount, 3), dtype=np.float32)
            full_delta[: len(lean_body)] = gltf_to_blender(delta_gltf)
            sk.data.foreach_set('co', full_delta.reshape(-1))
            new_targets_map[t_name] = t_name
        obj_spec['targets'] = new_targets_map
        obj_spec.setdefault('metadata', {})['correctives'] = copy.deepcopy(patch_doc['mesh']['correctives'])
        obj.data.update()

    # Update studioShorts Basis and optional R4 weights; prune any retired-control correctives on garments
    shorts_obj = bpy.data.objects[new_desc['objects']['studioShorts']['object']]
    native_shorts = gltf_to_blender(rebased_neutral_shorts).reshape(-1)
    shorts_obj.data.vertices.foreach_set('co', native_shorts)
    if shorts_obj.data.shape_keys:
        shorts_obj.data.shape_keys.key_blocks[0].data.foreach_set('co', native_shorts)
    if coverage_weights is not None:
        require(len(shorts_obj.data.vertices) == len(coverage_weights), 'Shorts vertex count mismatch')
        groups = {g.name: g for g in shorts_obj.vertex_groups}
        all_v = list(range(len(shorts_obj.data.vertices)))
        for g in groups.values():
            g.remove(all_v)
        for idx, row in enumerate(coverage_weights):
            for g_name, w_val in row.items():
                if g_name not in groups:
                    groups[g_name] = shorts_obj.vertex_groups.new(name=g_name)
                groups[g_name].add([idx], float(w_val), 'REPLACE')
    shorts_obj.data.update()

    # Update proofShirt Basis to match rebased neutral while preserving its relative shape-key deltas
    shirt_spec = new_desc['objects']['proofShirt']
    shirt_obj = bpy.data.objects[shirt_spec['object']]
    old_shirt_base = np.zeros(len(shirt_obj.data.vertices) * 3, dtype=np.float32)
    if shirt_obj.data.shape_keys:
        shirt_obj.data.shape_keys.key_blocks[0].data.foreach_get('co', old_shirt_base)
    else:
        shirt_obj.data.vertices.foreach_get('co', old_shirt_base)
    native_shirt = gltf_to_blender(rebased_neutral_shirt).reshape(-1)
    shirt_shift = native_shirt - old_shirt_base
    shirt_obj.data.vertices.foreach_set('co', native_shirt)
    if shirt_obj.data.shape_keys:
        for kb in shirt_obj.data.shape_keys.key_blocks:
            if kb.relative_key == shirt_obj.data.shape_keys.key_blocks[0] or kb == shirt_obj.data.shape_keys.key_blocks[0]:
                arr = np.zeros(len(shirt_obj.data.vertices) * 3, dtype=np.float32)
                kb.data.foreach_get('co', arr)
                kb.data.foreach_set('co', arr + shirt_shift)
    if shirt_spec.get('metadata', {}).get('correctives'):
        shirt_spec['metadata']['correctives'] = [
            c
            for c in shirt_spec['metadata']['correctives']
            if all(d['control'] not in retired for d in c['drivers'])
        ]
    shirt_obj.data.update()

    out.mkdir(parents=True, exist_ok=False)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'family.blend'))
    (out / 'descriptor.json').write_text(json.dumps(new_desc, separators=(',', ':'), allow_nan=False) + '\n')
    (out / 'profile.json').write_text(json.dumps(new_profile, indent=2, allow_nan=False) + '\n')
    receipt = {
        'supportMode': mode,
        'meshPatchSha256': sha256_file(args.mesh_patch),
        'sourceKit': str(source_kit),
        'leanKit': str(lean_kit),
        'coverageKit': str(args.coverage_kit.resolve()) if args.coverage_kit else None,
        'retiredControlsRemoved': sorted(retired),
        'leanV3MaxDiffMetres': v3_diff,
        'presets': [p['id'] for p in new_profile['presets']],
    }
    (out / 'assembly-receipt.json').write_text(json.dumps(receipt, indent=2, allow_nan=False) + '\n')
    print(json.dumps({'kit': str(out), 'supportMode': mode, 'presets': receipt['presets']}))


def main(argv=None):
    raw = list(sys.argv[1:] if argv is None else argv)
    if '--' in raw:
        raw = raw[raw.index('--') + 1 :]
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)

    p_comp = sub.add_parser('compile', help='Validate supports, decompose 2-slider targets and verify reconstruction')
    p_comp.add_argument('--manifest', required=True, type=Path)
    p_comp.add_argument('--output', required=True, type=Path)
    p_comp.add_argument('--repository', required=True, type=Path)

    p_asm = sub.add_parser('assemble-kit', help='Rebase canonical Blender family kit onto compiled 2-slider patch')
    p_asm.add_argument('--mesh-patch', required=True, type=Path)
    p_asm.add_argument('--source-kit', required=True, type=Path)
    p_asm.add_argument('--lean-kit', required=True, type=Path)
    p_asm.add_argument('--coverage-kit', type=Path)
    p_asm.add_argument('--output', required=True, type=Path)
    p_asm.add_argument('--repository', required=True, type=Path)

    args = parser.parse_args(raw)
    try:
        if args.command == 'compile':
            run_compile(args.manifest.resolve(), args.output.resolve(), args.repository.resolve())
        else:
            run_assemble_kit(args)
    except (GridInputError, KeyError, ValueError, OSError) as err:
        print(json.dumps({'error': type(err).__name__, 'detail': str(err)}), file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
