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
    companion_ids = manifest.get('companionMeshIds', [])
    require(
        isinstance(companion_ids, list)
        and len(set(companion_ids)) == len(companion_ids)
        and all(isinstance(cid, str) and cid != mesh_id and cid in family['meshes'] for cid in companion_ids),
        'Invalid companionMeshIds list',
    )
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
    all_mesh_ids = [mesh_id, *companion_ids]
    meshes_meta = {}
    arrays_by_mesh = {}
    for mid in all_mesh_ids:
        me = family['meshes'][mid]
        m_base = np.asarray(me['positions'], dtype=np.float32).reshape(-1)
        require(m_base.size > 0 and m_base.size % 3 == 0 and np.all(np.isfinite(m_base)), f'Invalid canonical positions: {mid}')
        require(
            np.all(np.asarray(me['frameDelta']) == 0),
            f'Single-base conversion requires zero frameDelta on {mid}; qualify separate bases independently',
        )
        meshes_meta[mid] = (me, m_base)
        arrays_by_mesh[mid] = schema_arrays(me)
    mesh, base = meshes_meta[mesh_id]
    space = physical_space(family, manifest, mapping, retired)
    anchors = manifest.get('protectedAnchorVertices', [])
    require(isinstance(anchors, list), 'protectedAnchorVertices must be a list when provided')
    if anchors:
        require(
            len(anchors) >= 3 and all(type(i) is int and 0 <= i < base.size // 3 for i in anchors),
            'Explicit protectedAnchorVertices requires at least three valid vertex indices',
        )
        require(len(set(anchors)) == len(anchors), 'Duplicate protected anchor vertex')
    tolerance = manifest.get('toleranceMetres')
    require(
        type(tolerance) in (int, float) and math.isfinite(tolerance) and 0 < tolerance <= 0.0001,
        'Explicit reconstruction tolerance must be in (0, 0.0001] metres',
    )

    def load_verified_mesh_npz(rec_path, mid):
        me, m_base = meshes_meta[mid]
        expected_arrays = arrays_by_mesh[mid]
        with np.load(rec_path, allow_pickle=False) as data:
            require(
                'positions' in data and 'physicalSpaceJson' in data and 'topology' in data,
                f'Support missing geometry/physical-space metadata ({mid}): {rec_path}',
            )
            ps_doc = dict(json.loads(str(data['physicalSpaceJson'].item())))
            if 'meshId' in ps_doc:
                require(ps_doc.pop('meshId') == mid, f'Support meshId mismatch ({mid}): {rec_path}')
            require(
                ps_doc == space,
                f'Physical space, pose, rig or neutral control mismatch ({mid}): {rec_path}',
            )
            require(str(data['topology'].item()) == me['topology'], f'Topology identity mismatch ({mid}): {rec_path}')
            for name, expected in expected_arrays.items():
                require(name in data, f'Missing correspondence array {name} ({mid}): {rec_path}')
                raw_arr = np.asarray(data[name])
                if name in ('triangles', 'sourceVertexIndices', 'renderTriangles', 'jointIndices'):
                    require(
                        raw_arr.dtype.kind in 'iu'
                        and np.all(raw_arr >= 0)
                        and np.all(raw_arr <= np.iinfo(expected.dtype).max),
                        f'Invalid or overflowing topology/skin index array ({mid}): {name}',
                    )
                actual = raw_arr.astype(expected.dtype).reshape(-1)
                require(
                    actual.shape == expected.shape and np.array_equal(actual, expected),
                    f'Correspondence mismatch {name} ({mid}): {rec_path}',
                )
            extra = (
                set(data.files)
                & {'uvs', 'sourceVertexIndices', 'renderTriangles', 'jointIndices', 'jointWeights'}
                - set(expected_arrays)
            )
            require(not extra, f'Unexpected correspondence arrays ({mid}): {sorted(extra)}')
            raw_pos = np.asarray(data['positions'])
            require(
                raw_pos.dtype.kind in 'fiu' and raw_pos.size == m_base.size and np.all(np.isfinite(raw_pos)),
                f'Invalid or nonfinite support positions ({mid}): {rec_path}',
            )
            pos_f32 = raw_pos.astype(np.float32).reshape(-1)
            require(np.all(np.isfinite(pos_f32)), f'Positions overflow float32 ({mid}): {rec_path}')
            return pos_f32.copy()

    supports_by_mesh = {mid: {} for mid in all_mesh_ids}
    sources = []
    anchor_ref = None
    raw_items = {}
    for item in manifest.get('supports', []):
        coordinate = item.get('coordinate')
        require(
            isinstance(coordinate, list)
            and len(coordinate) == 2
            and all(type(v) in (int, float) and float(v) in NODES for v in coordinate),
            f'Support coordinate must contain two grid fractions in {NODES}: {coordinate}',
        )
        c = (float(coordinate[0]), float(coordinate[1]))
        require(c not in supports_by_mesh[mesh_id], f'Duplicate coordinate: {c}')
        p = resolve_record(item, manifest_path.parent)
        positions = load_verified_mesh_npz(p, mesh_id)
        supports_by_mesh[mesh_id][c] = positions

        comp_records = item.get('companionMeshes', {})
        require(isinstance(comp_records, dict), f'companionMeshes must be an object at {c}')
        require(
            set(comp_records) == set(companion_ids),
            f'Coordinate {c} companionMeshes keys {sorted(comp_records)} must match companionMeshIds {sorted(companion_ids)}',
        )
        comp_hashes = {}
        for cid in companion_ids:
            crec = comp_records[cid]
            if crec.get('canonicalMesh') is True:
                supports_by_mesh[cid][c] = meshes_meta[cid][1].copy()
                comp_hashes[cid] = 'canonical-family-positions'
            else:
                cp = resolve_record(crec, manifest_path.parent)
                supports_by_mesh[cid][c] = load_verified_mesh_npz(cp, cid)
                comp_hashes[cid] = crec['sha256']
        raw_items[c] = (item, p, comp_hashes)

    wanted = expected_coords(mode)
    require(
        set(supports_by_mesh[mesh_id]) == wanted,
        f'Expected exact {mode}-support coordinate set; missing={sorted(wanted - set(supports_by_mesh[mesh_id]))}; extra={sorted(set(supports_by_mesh[mesh_id]) - wanted)}',
    )

    # Validate coupled 1D physical invariants (sole floor minY, crown stature maxY, welded collar seam) across all supports
    ref_coord = (0.5, 0.0) if (0.5, 0.0) in supports_by_mesh[mesh_id] else sorted(supports_by_mesh[mesh_id])[0]
    ref_body_pts = supports_by_mesh[mesh_id][ref_coord].reshape(-1, 3).astype(np.float64)
    ref_sole_y = float(ref_body_pts[:, 1].min())
    static_head_pts = (
        np.asarray(family['meshes']['headSkin']['positions'], dtype=np.float64).reshape(-1, 3)
        if 'headSkin' in family['meshes'] and 'headSkin' not in companion_ids
        else None
    )

    def crown_y_for(coord):
        b_y = float(supports_by_mesh[mesh_id][coord].reshape(-1, 3)[:, 1].max())
        if 'headSkin' in companion_ids:
            h_y = float(supports_by_mesh['headSkin'][coord].reshape(-1, 3)[:, 1].max())
            return max(b_y, h_y)
        if static_head_pts is not None:
            return max(b_y, float(static_head_pts[:, 1].max()))
        return b_y

    ref_crown_y = crown_y_for(ref_coord)
    stature_tol = max(float(tolerance), 1e-4)
    require(
        abs((ref_crown_y - ref_sole_y) - float(family['referenceStatureMetres'])) <= stature_tol,
        f'Reference support crown-to-sole span {ref_crown_y - ref_sole_y} m != referenceStatureMetres {family["referenceStatureMetres"]} m',
    )

    for c in sorted(supports_by_mesh[mesh_id]):
        item, p, comp_hashes = raw_items[c]
        b_pts = supports_by_mesh[mesh_id][c].reshape(-1, 3).astype(np.float64)
        sole_err = abs(float(b_pts[:, 1].min()) - ref_sole_y)
        crown_err = abs(crown_y_for(c) - ref_crown_y)
        require(sole_err <= tolerance, f'Sole plane Y drifted {sole_err} m at {c}: {p}')
        require(crown_err <= tolerance, f'Crown stature Y drifted {crown_err} m at {c}: {p}')

        seam_err = 0.0
        for seam in family.get('seams', []):
            bm, hm = seam.get('bodyMesh', mesh_id), seam.get('headMesh', 'headSkin')
            if bm in supports_by_mesh and hm in supports_by_mesh:
                p_bm = supports_by_mesh[bm][c].reshape(-1, 3).astype(np.float64)
                p_hm = supports_by_mesh[hm][c].reshape(-1, 3).astype(np.float64)
                sb = np.asarray(seam['bodyVertices'], dtype=np.int64)
                sh = np.asarray(seam['headVertices'], dtype=np.int64)
                seam_err = max(seam_err, float(np.max(np.linalg.norm(p_bm[sb] - p_hm[sh], axis=1))))
        require(seam_err <= tolerance, f'Seam gap {seam_err} m exceeds tolerance at {c}')

        anchor_error = 0.0
        if anchors:
            pts_anchor = b_pts[anchors]
            if anchor_ref is None:
                require(
                    np.linalg.matrix_rank(pts_anchor - pts_anchor[0], tol=1e-7) >= 2,
                    'Protected anchors must be noncollinear',
                )
                anchor_ref = pts_anchor
            anchor_error = float(np.max(np.linalg.norm(pts_anchor - anchor_ref, axis=1)))
            require(anchor_error <= tolerance, f'Protected physical anchors moved {anchor_error} m: {p}')

        src_entry = {
            'coordinate': list(c),
            'path': str(p),
            'sha256': item['sha256'],
            'solePlaneDriftMetres': sole_err,
            'crownStatureDriftMetres': crown_err,
            'collarSeamMaxGapMetres': seam_err,
            'status': item.get('sourceStatus', 'unspecified'),
        }
        if anchors:
            src_entry['protectedAnchorMaxErrorMetres'] = anchor_error
        if comp_hashes:
            src_entry['companionMeshes'] = comp_hashes
        sources.append(src_entry)

    return manifest, family, meshes_meta, supports_by_mesh, sources, space


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
    manifest, family, meshes_meta, supports_by_mesh, sources, space = admit(manifest_path, repo)
    owner, owner_path = load_people_owner(repo)
    output = owner.external_output(str(output))
    require(not output.exists(), f'Output already exists; choose a fresh directory: {output}')
    mode = manifest['supportMode']
    mapping = manifest['axisControls']
    mesh_id = manifest['meshId']
    companion_ids = manifest.get('companionMeshIds', [])
    all_mesh_ids = [mesh_id, *companion_ids]
    control_order = [c for c in family['controls'] if c in mapping.values()]

    grids_by_mesh = {}
    patches_by_mesh = {}
    control_targets = {c: {} for c in control_order}
    derived = []
    for idx_m, mid in enumerate(all_mesh_ids):
        grid_m, derived_m = fill_grid(supports_by_mesh[mid], mode)
        if idx_m == 0:
            derived = derived_m
        neutral_m, targets_m, bindings_m, correctives_m = decompose_two_slider(grid_m, mapping, control_order)
        grids_by_mesh[mid] = grid_m
        patches_by_mesh[mid] = {
            'positions': neutral_m.tolist(),
            'frameDelta': np.zeros_like(neutral_m).tolist(),
            'targets': {k: v.tolist() for k, v in targets_m.items()},
            'correctives': correctives_m,
        }
        for c, b in bindings_m.items():
            control_targets[c][mid] = b

    evaluation_family = {
        'meshes': copy.deepcopy(patches_by_mesh),
        'controls': {c: {'kind': 'bipolar', 'targets': copy.deepcopy(control_targets[c])} for c in control_order},
        'ageSamples': {},
    }

    supports_primary = supports_by_mesh[mesh_id]
    grid_primary = grids_by_mesh[mesh_id]
    if mode == 2:
        grid_points = [(0.5, 0.0), (0.5, 0.5), (0.5, 1.0)]
        interior_points = [(0.5, 0.25), (0.5, 0.75)]
    else:
        grid_points = sorted(grid_primary)
        interior_points = list(itertools.product((0.25, 0.75), repeat=2))

    cases = []
    max_eval_seam_gap = 0.0
    for label, pts in [('support', sorted(supports_primary)), ('grid', grid_points), ('interior', interior_points)]:
        for point in pts:
            recipe = {'controls': {mapping['mass']: point[0], mapping['fullness']: point[1]}}
            eval_pts = {}
            max_err_point = 0.0
            err_by_mesh = {}
            for mid in all_mesh_ids:
                actual = owner.evaluate_mesh(evaluation_family, mid, recipe, 0.0, 30.0, {'meshId': '__none__'})
                expected = supports_by_mesh[mid][point] if label == 'support' else piecewise_bilinear(grids_by_mesh[mid], point)
                err_m = float(
                    np.max(np.linalg.norm((actual.astype(np.float64) - expected.astype(np.float64)).reshape(-1, 3), axis=1))
                )
                eval_pts[mid] = actual.reshape(-1, 3).astype(np.float64)
                err_by_mesh[mid] = err_m
                max_err_point = max(max_err_point, err_m)

            seam_gap_pt = 0.0
            for seam in family.get('seams', []):
                bm, hm = seam.get('bodyMesh', mesh_id), seam.get('headMesh', 'headSkin')
                if bm in eval_pts and hm in eval_pts:
                    sb = np.asarray(seam['bodyVertices'], dtype=np.int64)
                    sh = np.asarray(seam['headVertices'], dtype=np.int64)
                    seam_gap_pt = max(
                        seam_gap_pt,
                        float(np.max(np.linalg.norm(eval_pts[bm][sb] - eval_pts[hm][sh], axis=1))),
                    )
            max_eval_seam_gap = max(max_eval_seam_gap, seam_gap_pt)

            case_rec = {
                'kind': label,
                'coordinate': list(point),
                'maxPositionErrorMetres': max_err_point,
                'pass': max_err_point <= manifest['toleranceMetres'] and seam_gap_pt <= manifest['toleranceMetres'],
            }
            if companion_ids:
                case_rec['meshErrorsMetres'] = err_by_mesh
                case_rec['collarSeamMaxGapMetres'] = seam_gap_pt
            cases.append(case_rec)

    primary_patch = patches_by_mesh[mesh_id]
    companion_patches = {
        cid: {
            'leanAnchorPositions': supports_by_mesh[cid][0.5, 0.0].tolist(),
            'mesh': patches_by_mesh[cid],
        }
        for cid in companion_ids
    }
    report = {
        'scope': 'Two-slider corresponding-grid decomposition and native people.evaluate_mesh algebraic check; visual, garment, motion and renderer qualification remain separate.',
        'manifestSha256': sha256_file(manifest_path),
        'family': manifest['family'],
        'ownerPath': str(owner_path),
        'ownerSha256': sha256_file(owner_path),
        'supportMode': mode,
        'meshId': mesh_id,
        'companionMeshIds': companion_ids,
        'axisControls': mapping,
        'retiredControls': manifest.get('retiredControls', []),
        'vertexCount': len(primary_patch['positions']) // 3,
        'companionVertexCounts': {cid: len(patches_by_mesh[cid]['positions']) // 3 for cid in companion_ids},
        'neutralCoordinate': [0.5, 0.5],
        'derivedGridCoordinates': derived,
        'targetArrays': len(primary_patch['targets']),
        'targetNames': sorted(primary_patch['targets']),
        'correctiveRecords': len(primary_patch['correctives']),
        'singleBaseFramePairs': 'Each pair aliases the same target ID at both frame endpoints.',
        'operationOrder': control_order,
        'floatStorage': 'float32; sequential float32 rounding matched to people.evaluate_mesh and person-family.ts',
        'physicalSpace': space,
        'sources': sources,
        'checks': cases,
        'maximumErrorMetres': max(c['maxPositionErrorMetres'] for c in cases),
        'maximumCollarSeamGapMetres': max_eval_seam_gap,
        'allPassed': all(c['pass'] for c in cases),
        'toleranceMetres': manifest['toleranceMetres'],
    }
    require(report['allPassed'], f'Reconstruction/seam tolerance failed; maxError={report["maximumErrorMetres"]} m, seam={max_eval_seam_gap} m')
    output.mkdir(parents=True)
    payload = {
        'kind': 'body-support-grid-mesh-patch',
        'supportMode': mode,
        'meshId': mesh_id,
        'companionMeshIds': companion_ids,
        'axisControls': mapping,
        'retiredControls': manifest.get('retiredControls', []),
        'leanAnchorPositions': supports_primary[0.5, 0.0].tolist(),
        'mesh': primary_patch,
        'companionPatches': companion_patches,
        'controlTargets': control_targets,
    }
    (output / 'mesh-patch.json').write_text(json.dumps(payload, separators=(',', ':'), allow_nan=False) + '\n')
    (output / 'reconstruction.json').write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(
        json.dumps(
            {
                'output': str(output),
                'supportMode': mode,
                'meshes': all_mesh_ids,
                'vertices': report['vertexCount'],
                'targetArrays': report['targetArrays'],
                'correctives': report['correctiveRecords'],
                'checks': len(cases),
                'maximumErrorMetres': report['maximumErrorMetres'],
                'maximumCollarSeamGapMetres': max_eval_seam_gap,
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


def build_head_to_support_transfer(lean_head_pts, head_triangles, lean_body_pts, support_head_pts):
    """Map HeadLOD2 rows of PeacockBodyLOD1HeadLOD2Support onto headSkin triangles (pinning collar-seam vertices to bodySkin)."""
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree

    n_sup = len(support_head_pts)
    tris = np.asarray(head_triangles, dtype=np.int64).reshape(-1, 3)
    bvh = BVHTree.FromPolygons(lean_head_pts.tolist(), tris.tolist(), all_triangles=True)
    tri_idx = np.zeros(n_sup, dtype=np.int64)
    bary = np.zeros((n_sup, 3), dtype=np.float64)
    for i, pt in enumerate(support_head_pts):
        loc, _, f_idx, _ = bvh.find_nearest(Vector(pt.tolist()))
        require(f_idx is not None and loc is not None, f'Failed to project support head vertex {i}')
        tri_idx[i] = int(f_idx)
        a, b, c = lean_head_pts[tris[int(f_idx)]]
        v0, v1, v2 = b - a, c - a, np.asarray(loc, dtype=np.float64) - a
        d00, d01, d11 = float(v0 @ v0), float(v0 @ v1), float(v1 @ v1)
        d20, d21 = float(v2 @ v0), float(v2 @ v1)
        denom = d00 * d11 - d01 * d01
        if abs(denom) > 1e-14:
            v = float(np.clip((d11 * d20 - d01 * d21) / denom, 0.0, 1.0))
            w = float(np.clip((d00 * d21 - d01 * d20) / denom, 0.0, 1.0 - v))
            bary[i] = (1.0 - v - w, v, w)
        else:
            bary[i] = (1.0, 0.0, 0.0)

    d_body = np.linalg.norm(support_head_pts[:, None, :] - lean_body_pts[None, :, :], axis=2)
    body_near = np.argmin(d_body, axis=1)
    is_seam = d_body[np.arange(n_sup), body_near] < 1e-4

    def transfer_delta(head_delta_pts, body_delta_pts):
        tri_corners = head_delta_pts[tris[tri_idx]].astype(np.float64)
        out_d = np.einsum('ni,nij->nj', bary, tri_corners)
        if np.any(is_seam):
            out_d[is_seam] = body_delta_pts[body_near[is_seam]].astype(np.float64)
        return out_d.astype(np.float32)

    return transfer_delta


def rewrite_mesh_grid_shape_keys(bpy_obj, obj_spec, base_pts_gltf, target_arrays_gltf, correctives, retired_controls):
    """Update Basis and grid_* shape keys while rebasing and preserving any unrelated existing shape keys (e.g. face presets)."""
    vcount = len(bpy_obj.data.vertices)
    native_base = gltf_to_blender(base_pts_gltf).reshape(-1)
    old_base = np.zeros(vcount * 3, dtype=np.float32)
    preserved = []
    old_targets_map = dict(obj_spec.get('targets', {}))
    drop_keys = {'Basis', 'GridZeroOrigin'} | {k for k in old_targets_map if k.startswith('grid_')}
    for k in ('definitionSoft', 'definitionToned', 'fullnessLow', 'fullnessHigh', 'massLow', 'massHigh', 'corrective_fullnessDefinition'):
        drop_keys.add(k)

    if bpy_obj.data.shape_keys:
        bpy_obj.data.shape_keys.key_blocks[0].data.foreach_get('co', old_base)
        for kb in bpy_obj.data.shape_keys.key_blocks[1:]:
            if kb.name not in drop_keys:
                arr = np.zeros(vcount * 3, dtype=np.float32)
                kb.data.foreach_get('co', arr)
                preserved.append((kb.name, arr - old_base))
        bpy_obj.shape_key_clear()

    basis_key = bpy_obj.shape_key_add(name='Basis', from_mix=False)
    basis_key.data.foreach_set('co', native_base)
    bpy_obj.data.vertices.foreach_set('co', native_base)

    new_targets_map = {'zero': None}
    for pres_name, pres_delta in preserved:
        sk = bpy_obj.shape_key_add(name=pres_name, from_mix=False)
        sk.relative_key = basis_key
        sk.data.foreach_set('co', (native_base + pres_delta).astype(np.float32))
        new_targets_map[pres_name] = pres_name

    if target_arrays_gltf:
        zero_key = bpy_obj.shape_key_add(name='GridZeroOrigin', from_mix=False)
        zero_key.data.foreach_set('co', np.zeros(vcount * 3, dtype=np.float32))
        for t_name, delta_gltf in sorted(target_arrays_gltf.items()):
            sk = bpy_obj.shape_key_add(name=t_name, from_mix=False)
            sk.relative_key = zero_key
            sk.data.foreach_set('co', gltf_to_blender(delta_gltf).reshape(-1))
            new_targets_map[t_name] = t_name

    obj_spec['targets'] = new_targets_map
    existing_corr = [
        c
        for c in obj_spec.get('metadata', {}).get('correctives', [])
        if all(d['control'] not in retired_controls for d in c['drivers'])
        and not any(str(t).startswith('grid_') or t == 'corrective_fullnessDefinition' for t in c.get('targets', []))
    ]
    obj_spec.setdefault('metadata', {})['correctives'] = [*existing_corr, *copy.deepcopy(correctives)]
    bpy_obj.data.update()


def run_assemble_kit(args):
    """Run inside Blender (--python body-grid.py -- assemble-kit ...) to rebase bodySkin, head/submeshes, shirt support, and garments."""
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
    companion_ids = patch_doc.get('companionMeshIds', [])
    companion_patches = patch_doc.get('companionPatches', {})
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

    # Build new neutral & target arrays for PeacockBodyLOD1HeadLOD2Support (both body rows AND HeadLOD2 collar/head rows!)
    neutral_shirt_support = old_lean_shirt_support.copy()
    neutral_shirt_support[: len(lean_body)] = neutral_body
    lean_shirt_support = old_lean_shirt_support.copy()
    lean_shirt_support[: len(lean_body)] = lean_body

    head_target_arrays = {}
    transfer_head_to_sup = None
    if 'headSkin' in companion_patches:
        hp_entry = companion_patches['headSkin']
        lean_head = np.asarray(hp_entry['leanAnchorPositions'], dtype=np.float32).reshape(-1, 3)
        neutral_head = np.asarray(hp_entry['mesh']['positions'], dtype=np.float32).reshape(-1, 3)
        head_target_arrays = {
            k: np.asarray(v, dtype=np.float32).reshape(-1, 3) for k, v in hp_entry['mesh']['targets'].items()
        }
        head_tris = np.asarray(source_compiled['meshes']['headSkin']['triangles'], dtype=np.int64).reshape(-1, 3)
        transfer_head_to_sup = build_head_to_support_transfer(
            lean_head.astype(np.float64),
            head_tris,
            lean_body.astype(np.float64),
            old_lean_shirt_support[len(lean_body) :].astype(np.float64),
        )
        neutral_shirt_support[len(lean_body) :] = (
            old_lean_shirt_support[len(lean_body) :]
            + transfer_head_to_sup(neutral_head - lean_head, neutral_body - lean_body)
        )

    all_sup_target_names = sorted(set(target_arrays) | set(head_target_arrays))
    support_target_arrays = {}
    for t_name in all_sup_target_names:
        sup_d = np.zeros_like(old_lean_shirt_support, dtype=np.float32)
        b_d = target_arrays.get(t_name, np.zeros_like(lean_body, dtype=np.float32))
        sup_d[: len(lean_body)] = b_d
        if transfer_head_to_sup is not None:
            h_d = head_target_arrays.get(t_name, np.zeros_like(lean_head, dtype=np.float32))
            sup_d[len(lean_body) :] = transfer_head_to_sup(h_d, b_d)
        support_target_arrays[t_name] = sup_d

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
        targets_entry = {
            body_id: copy.deepcopy(mesh_map[body_id]),
            support_id: copy.deepcopy(mesh_map[body_id]),
        }
        for cid in companion_ids:
            if cid in mesh_map:
                targets_entry[cid] = copy.deepcopy(mesh_map[cid])
                # Ensure support_id binds non-zero target names if headSkin has non-zero targets where bodySkin was zero
                for side_name, pair in mesh_map[cid].items():
                    if targets_entry[support_id][side_name] == ['grid_zero', 'grid_zero'] and pair != ['grid_zero', 'grid_zero']:
                        targets_entry[support_id][side_name] = copy.deepcopy(pair)
        new_family['controls'][ctrl_id]['targets'] = targets_entry

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

    # Open source family.blend and rewrite shape keys cleanly on bodySkin, shirt support, and companion meshes
    bpy.ops.wm.open_mainfile(filepath=str(source_kit / 'family.blend'), load_ui=False)
    support_correctives = copy.deepcopy(patch_doc['mesh']['correctives'])
    if 'headSkin' in companion_patches:
        seen_corr = {
            (tuple((d['control'], d['side']) for d in c['drivers']), tuple(c['targets'])) for c in support_correctives
        }
        for hc in companion_patches['headSkin']['mesh']['correctives']:
            sig = (tuple((d['control'], d['side']) for d in hc['drivers']), tuple(hc['targets']))
            if sig not in seen_corr:
                support_correctives.append(copy.deepcopy(hc))
                seen_corr.add(sig)
    mesh_updates = [
        (body_id, neutral_body, target_arrays, patch_doc['mesh']['correctives']),
        (support_id, neutral_shirt_support, support_target_arrays, support_correctives),
    ]
    for cid in companion_ids:
        cp_entry = companion_patches[cid]
        cp_neutral = np.asarray(cp_entry['mesh']['positions'], dtype=np.float32).reshape(-1, 3)
        cp_targets = {
            k: np.asarray(v, dtype=np.float32).reshape(-1, 3) for k, v in cp_entry['mesh']['targets'].items()
        }
        mesh_updates.append((cid, cp_neutral, cp_targets, cp_entry['mesh']['correctives']))

    for asset_id, base_pts, t_arrays, corr_list in mesh_updates:
        obj_spec = new_desc['objects'][asset_id]
        obj = bpy.data.objects[obj_spec['object']]
        require(obj.matrix_world == Matrix.Identity(4), f'{asset_id} non-identity matrix_world')
        rewrite_mesh_grid_shape_keys(obj, obj_spec, base_pts, t_arrays, corr_list, retired)

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
