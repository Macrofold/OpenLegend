#!/usr/bin/env python3
"""Shared geometry, connectivity, manifold quality, rig LBS, and fidelity metric utilities."""
from __future__ import annotations

from collections import deque
import hashlib
import json
from pathlib import Path

from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def smoothstep(t: np.ndarray | float) -> np.ndarray:
    c = np.clip(t, 0.0, 1.0)
    return np.clip(c * c * (3.0 - 2.0 * c), 0.0, 1.0)


def gltf_to_blender(pts: np.ndarray) -> np.ndarray:
    arr = np.asarray(pts, dtype=np.float64).reshape(-1, 3)
    return arr[:, [0, 2, 1]] * np.array([1.0, -1.0, 1.0], dtype=np.float64)


def blender_to_gltf(pts: np.ndarray) -> np.ndarray:
    arr = np.asarray(pts, dtype=np.float64).reshape(-1, 3)
    return arr[:, [0, 2, 1]] * np.array([1.0, 1.0, -1.0], dtype=np.float64)


def section_loops(xyz: np.ndarray, faces: np.ndarray, z: float, min_pts: int = 10) -> list[dict]:
    """Slice mesh horizontally at Blender Z = z and return connected contour summaries."""
    v = xyz[faces]
    mask = (v[:, :, 2].min(axis=1) <= z) & (v[:, :, 2].max(axis=1) > z)
    v = v[mask]
    if not len(v):
        return []
    hits = np.full((len(v), 2, 3), np.nan)
    n = np.zeros(len(v), dtype=np.int64)
    for i in range(3):
        p, q = v[:, i], v[:, (i + 1) % 3]
        ids = np.flatnonzero((p[:, 2] > z) != (q[:, 2] > z))
        if not len(ids):
            continue
        p_s, q_s = p[ids], q[ids]
        t = ((z - p_s[:, 2]) / (q_s[:, 2] - p_s[:, 2]))[:, None]
        hits[ids, n[ids]] = p_s + (q_s - p_s) * t
        n[ids] += 1
    valid = n == 2
    if not np.any(valid):
        return []
    rows = np.round(hits[valid].reshape(-1, 3), 5)
    unique, ix = np.unique(rows, axis=0, return_inverse=True)
    neighbours: dict[int, set[int]] = {}
    for a, b in ix.reshape(-1, 2):
        if a != b:
            neighbours.setdefault(int(a), set()).add(int(b))
            neighbours.setdefault(int(b), set()).add(int(a))
    remaining = set(neighbours)
    out = []
    while remaining:
        first = remaining.pop()
        seen, stack = {first}, [first]
        while stack:
            cur = stack.pop()
            for nb in neighbours.get(cur, set()) & remaining:
                remaining.remove(nb)
                seen.add(nb)
                stack.append(nb)
        if len(seen) > min_pts:
            q = unique[list(seen)]
            lo, hi = q.min(axis=0), q.max(axis=0)
            out.append(
                {
                    "center": ((hi + lo) * 0.5).tolist(),
                    "centroid": q.mean(axis=0).tolist(),
                    "w": float(hi[0] - lo[0]),
                    "depth": float(hi[1] - lo[1]),
                    "minX": float(lo[0]),
                    "maxX": float(hi[0]),
                    "minY": float(lo[1]),
                    "maxY": float(hi[1]),
                    "n": len(q),
                }
            )
    return sorted(out, key=lambda item: item["center"][0])


def weld_connectivity(points: np.ndarray, triangles: np.ndarray, decimals: int = 4):
    _, weld = np.unique(np.round(points, decimals), axis=0, return_inverse=True)
    ids = weld[triangles]
    edges = np.concatenate((ids[:, [0, 1]], ids[:, [1, 2]], ids[:, [2, 0]]))
    edges = np.unique(np.concatenate((edges, edges[:, ::-1])), axis=0)
    edges = edges[edges[:, 0] != edges[:, 1]]
    count = np.bincount(weld)
    degree = np.maximum(np.bincount(edges[:, 0], minlength=len(count)), 1)
    return weld, edges.T, count, degree


def vertex_normals(points: np.ndarray, triangles: np.ndarray, weld: np.ndarray) -> np.ndarray:
    xyz = points[triangles]
    area = np.cross(xyz[:, 1] - xyz[:, 0], xyz[:, 2] - xyz[:, 0])
    v = weld[triangles].reshape(-1)
    nrm = np.column_stack(
        [np.bincount(v, weights=np.repeat(col, 3), minlength=int(weld.max()) + 1) for col in area.T]
    )[weld]
    return nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)


def smooth_vertex_vectors(vecs: np.ndarray, connectivity, rings: int) -> np.ndarray:
    if rings <= 0:
        return vecs
    weld, (e_src, e_dst), v_mult, degree = connectivity
    n_unique = len(v_mult)
    u = np.column_stack([np.bincount(weld, weights=vecs[:, ax], minlength=n_unique) / v_mult for ax in range(3)])
    for _ in range(rings):
        nbr = np.column_stack([np.bincount(e_src, weights=u[e_dst, ax], minlength=n_unique) / degree for ax in range(3)])
        u = 0.45 * u + 0.55 * nbr
    out = u[weld]
    return out / np.maximum(np.linalg.norm(out, axis=1, keepdims=True), 1e-12)


def smootherstep(t: np.ndarray | float) -> np.ndarray:
    c = np.clip(t, 0.0, 1.0)
    return np.clip(c * c * c * (10.0 + c * (-15.0 + 6.0 * c)), 0.0, 1.0)


def compute_clipped_cotan_edge_weights(
    pts_u: np.ndarray,
    w_faces: np.ndarray,
    es: np.ndarray,
    ed: np.ndarray,
    n_verts: int,
    diag_weight: float = 0.02,
) -> np.ndarray:
    """Aspect-ratio-invariant intrinsic quad-grid weights via leaf-peeled 4-corner quad diagonal recovery:
    assigns 1.0 to all four true quad edges (even on 1.2mm x 11mm perineal strips or 4mm x 1.2mm pouch creases,
    preventing longitudinal Y drift!) and diag_weight (0.02) to triangulated quad-splitting diagonals (preventing
    3:1 V-shearing at X=0 and valence-5 poles!)."""
    from collections import deque

    keep_f = (w_faces[:, 0] != w_faces[:, 1]) & (w_faces[:, 1] != w_faces[:, 2]) & (w_faces[:, 0] != w_faces[:, 2])
    wf = w_faces[keep_f]
    p0, p1, p2 = pts_u[wf[:, 0]], pts_u[wf[:, 1]], pts_u[wf[:, 2]]

    def tri_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> np.ndarray:
        u = b - a
        v = c - a
        u /= np.maximum(np.linalg.norm(u, axis=1, keepdims=True), 1e-12)
        v /= np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-12)
        return np.arccos(np.clip(np.einsum("fi,fi->f", u, v), -1.0, 1.0))

    angs = np.column_stack([tri_angle(p0, p1, p2), tri_angle(p1, p2, p0), tri_angle(p2, p0, p1)])
    fn = np.cross(p1 - p0, p2 - p0)
    fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
    mid_v = np.abs(pts_u[:, 0]) <= 0.00025
    rx_clean = np.where(mid_v, 0.0, pts_u[:, 0])

    emap: dict[tuple[int, int], list[tuple[int, float, float, float]]] = {}
    for fi in range(len(wf)):
        vs = (int(wf[fi, 0]), int(wf[fi, 1]), int(wf[fi, 2]))
        as_ = (float(angs[fi, 0]), float(angs[fi, 1]), float(angs[fi, 2]))
        for s_opp in range(3):
            s_a, s_b = (s_opp + 1) % 3, (s_opp + 2) % 3
            va, vb = vs[s_a], vs[s_b]
            aa, ab = as_[s_a], as_[s_b]
            k, ak0, ak1 = ((va, vb), aa, ab) if va < vb else ((vb, va), ab, aa)
            emap.setdefault(k, []).append((fi, as_[s_opp], ak0, ak1))

    half_pi = 0.5 * np.pi
    max_dev_lim = np.radians(52.0)
    adj: list[list[int]] = [[] for _ in range(len(wf))]
    cands: list[tuple[float, int, int, tuple[int, int]]] = []
    for k, lst in emap.items():
        if len(lst) == 2 and not (mid_v[k[0]] and mid_v[k[1]]):
            if rx_clean[k[0]] * rx_clean[k[1]] < 0.0:
                continue
            (f0, ao0, ak0_0, ak1_0), (f1, ao1, ak0_1, ak1_1) = lst
            if float(np.dot(fn[f0], fn[f1])) < 0.5:
                continue
            corners = (ao0, ao1, ak0_0 + ak0_1, ak1_0 + ak1_1)
            if max(abs(c - half_pi) for c in corners) < max_dev_lim:
                score = sum(abs(c - half_pi) for c in corners)
                cid = len(cands)
                cands.append((score, f0, f1, k))
                adj[f0].append(cid)
                adj[f1].append(cid)

    used_f = np.zeros(len(wf), dtype=bool)
    diag_keys: list[int] = []
    deg_f = np.array([len(a) for a in adj], dtype=np.int32)
    leaf_q = deque(fi for fi in range(len(wf)) if deg_f[fi] == 1)

    def accept_cand(cid: int) -> None:
        _, f0, f1, (ka, kb) = cands[cid]
        used_f[f0] = True
        used_f[f1] = True
        diag_keys.append(ka * n_verts + kb)
        diag_keys.append(kb * n_verts + ka)
        for fx in (f0, f1):
            for oc in adj[fx]:
                _, a, b, _ = cands[oc]
                other = b if a == fx else a
                if not used_f[other]:
                    deg_f[other] -= 1
                    if deg_f[other] == 1:
                        leaf_q.append(other)

    order = sorted(range(len(cands)), key=lambda cid: cands[cid][0])
    ptr = 0
    while True:
        while leaf_q:
            fi = leaf_q.popleft()
            if used_f[fi]:
                continue
            avail = [cid for cid in adj[fi] if not used_f[cands[cid][1]] and not used_f[cands[cid][2]]]
            if len(avail) == 1:
                accept_cand(avail[0])
        while ptr < len(order) and (used_f[cands[order[ptr]][1]] or used_f[cands[order[ptr]][2]]):
            ptr += 1
        if ptr >= len(order):
            break
        accept_cand(order[ptr])
        ptr += 1

    w_out = np.ones(len(es), dtype=np.float64)
    if diag_keys:
        key_e = es.astype(np.int64) * n_verts + ed.astype(np.int64)
        dk_arr = np.unique(np.asarray(diag_keys, dtype=np.int64))
        pos = np.clip(np.searchsorted(dk_arr, key_e), 0, len(dk_arr) - 1)
        is_diag = dk_arr[pos] == key_e
        w_out[is_diag] = diag_weight
    return w_out


def map_lod0_to_lod1(high: np.ndarray, high_tri: np.ndarray, low: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    bvh = BVHTree.FromPolygons(high.tolist(), high_tri.tolist(), all_triangles=True)
    faces = np.empty(len(low), dtype=np.int64)
    weights = np.empty((len(low), 3), dtype=np.float64)
    gaps = np.empty(len(low), dtype=np.float64)
    for idx, pt in enumerate(low):
        hit, _, f_id, dist = bvh.find_nearest(Vector(pt.tolist()))
        a, b, c = high[high_tri[f_id]]
        e, f, q = b - a, c - a, np.asarray(hit, dtype=np.float64) - a
        ee, ff, ef = float(e @ e), float(f @ f), float(e @ f)
        det = max(ee * ff - ef * ef, 1e-24)
        u = ((q @ e) * ff - (q @ f) * ef) / det
        v = ((q @ f) * ee - (q @ e) * ef) / det
        faces[idx] = f_id
        weights[idx] = [1.0 - u - v, u, v]
        gaps[idx] = float(dist)
    return faces, weights, gaps


def face_areas(pts: np.ndarray, tri: np.ndarray) -> np.ndarray:
    v = pts[tri]
    return np.cross(v[:, 1] - v[:, 0], v[:, 2] - v[:, 0])


def bad_faces(pts: np.ndarray, tri: np.ndarray, base_areas: np.ndarray, connectivity: tuple | None = None) -> np.ndarray:
    nrm = face_areas(pts, tri)
    a0 = np.linalg.norm(base_areas, axis=1)
    a1 = np.linalg.norm(nrm, axis=1)
    degen = a1 < a0 * 0.035
    cos_base = np.einsum("ij,ij->i", base_areas, nrm) / np.maximum(a0 * a1, 1e-24)
    if connectivity is None:
        return (a0 > 1e-10) & (degen | (cos_base <= 0.0))
    # Smooth adipose overhangs (e.g. under-belly panniculus & convex groin/subgluteal dome) can rotate >90 deg from
    # the lean F000 reference while remaining 100% outward-coherent with BOTH their 1-ring and 4-ring surface sheets.
    weld = connectivity[0]
    v_nrm = vertex_normals(pts, tri, weld)
    s1_nrm = smooth_vertex_vectors(v_nrm, connectivity, rings=1)
    s4_nrm = smooth_vertex_vectors(v_nrm, connectivity, rings=4)
    f_s1 = s1_nrm[tri].mean(axis=1)
    f_s1 /= np.maximum(np.linalg.norm(f_s1, axis=1, keepdims=True), 1e-12)
    f_s4 = s4_nrm[tri].mean(axis=1)
    f_s4 /= np.maximum(np.linalg.norm(f_s4, axis=1, keepdims=True), 1e-12)
    n1 = nrm / np.maximum(a1[:, None], 1e-12)
    cos_s1 = np.einsum("ij,ij->i", n1, f_s1)
    cos_s4 = np.einsum("ij,ij->i", n1, f_s4)
    inverted = (cos_base <= 0.0) & ((cos_s4 <= 0.28) | (cos_s1 <= 0.15))
    return (a0 > 1e-10) & (degen | inverted)


def self_intersections(pts: np.ndarray, tri: np.ndarray, weld: np.ndarray) -> set[tuple[int, int]]:
    u_v, inv = np.unique(tri.ravel(), return_inverse=True)
    bvh = BVHTree.FromPolygons(pts[u_v].tolist(), inv.reshape(-1, 3).tolist(), all_triangles=True)
    ids = weld[tri]
    return {
        (a, b)
        for a, b in bvh.overlap(bvh)
        if a < b and not (ids[a, :, None] == ids[b, None, :]).any()
    }


def signed_distances(bvh: BVHTree, samples: np.ndarray) -> np.ndarray:
    vals = np.empty(len(samples), dtype=np.float64)
    for i, s in enumerate(samples):
        hit, nrm, _, dist = bvh.find_nearest(Vector(s.tolist()))
        sign = -1.0 if np.dot(s - np.asarray(hit), np.asarray(nrm)) < 0 else 1.0
        vals[i] = sign * float(dist)
    return vals


def metrics_summary(values: np.ndarray) -> dict:
    ab = np.abs(values)
    return {
        "samples": int(len(values)),
        "medianMm": round(float(np.median(ab) * 1000.0), 3),
        "p90Mm": round(float(np.quantile(ab, 0.90) * 1000.0), 3),
        "p95Mm": round(float(np.quantile(ab, 0.95) * 1000.0), 3),
        "maximumMm": round(float(ab.max() * 1000.0), 3),
        "signedMeanMm": round(float(values.mean() * 1000.0), 3),
    }


def eval_studio_shorts_bl(
    body_lod1_bl: np.ndarray,
    compiled_family: dict,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Evaluate surface-bound `studioShorts` on `bodySkin` (`LOD1`, `8,568v`) using the exact runtime
    `surfacePoint` basis (`person-family.ts`), returning `(shorts_pts_bl, shorts_tri, outer_shell_tri_mask)`.
    """
    support_g = blender_to_gltf(body_lod1_bl).astype(np.float64)
    piece = compiled_family["parts"]["studioShorts"]["pieces"][0]
    fit = piece["fit"]
    sh_mesh = compiled_family["meshes"][piece["meshId"]]
    tri_v = np.asarray(fit["triangles"], dtype=np.int64).reshape(-1, 3)
    bary = np.asarray(fit["barycentric"], dtype=np.float64).reshape(-1, 3)
    offs = np.asarray(fit["offsets"], dtype=np.float64).reshape(-1, 3)
    sh_tri = np.asarray(sh_mesh["triangles"], dtype=np.int64).reshape(-1, 3)

    a_g = support_g[tri_v[:, 0]]
    b_g = support_g[tri_v[:, 1]]
    c_g = support_g[tri_v[:, 2]]
    e1 = b_g - a_g
    e1 /= np.maximum(np.linalg.norm(e1, axis=1, keepdims=True), 1e-12)
    nrm = np.cross(b_g - a_g, c_g - a_g)
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
    e2 = np.cross(nrm, e1)

    shorts_g = (
        bary[:, 0:1] * a_g
        + bary[:, 1:2] * b_g
        + bary[:, 2:3] * c_g
        + offs[:, 0:1] * e1
        + offs[:, 1:2] * e2
        + offs[:, 2:3] * nrm
    )
    shorts_bl = gltf_to_blender(shorts_g)
    # Authored leg-hem closing cap has 2 interior vertices with oz = -71mm tucked inside the thigh;
    # all visible outer-shell triangles have oz >= 0 on all 3 vertices.
    outer_shell_tri_mask = np.all(offs[sh_tri, 2] >= 0.0, axis=1)
    return shorts_bl, sh_tri, outer_shell_tri_mask


def measure_studio_shorts_clearance(
    body_lod1_bl: np.ndarray,
    low_tri: np.ndarray,
    shorts_bl: np.ndarray,
    shorts_tri: np.ndarray,
    outer_shell_tri_mask: np.ndarray,
) -> dict:
    """Check BVH triangle intersections between unmasked `bodySkin` (`LOD1`) and visible outer `studioShorts`."""
    outer_tri = shorts_tri[outer_shell_tri_mask]
    bvh_body = BVHTree.FromPolygons(body_lod1_bl.tolist(), low_tri.tolist(), all_triangles=True)
    bvh_sh = BVHTree.FromPolygons(shorts_bl.tolist(), outer_tri.tolist(), all_triangles=True)
    overlaps = bvh_body.overlap(bvh_sh)
    return {
        "outerShellTriangles": int(len(outer_tri)),
        "outerShellOverlapPairs": int(len(overlaps)),
        "pokeThroughFree": len(overlaps) == 0,
    }


def _measure_surface_relief_benchmarks(
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    posed_lod0: np.ndarray,
    lod0_tri: np.ndarray,
    posed_lod1: np.ndarray,
    lod1_tri: np.ndarray,
) -> dict:
    """Measure crest-to-valley local relief amplitude (mm) on Donor, Master LOD0, and Runtime LOD1
    across 5 representative muscular relief zones (`target LOD1/Donor ratio: 0.80..1.20`).
    """
    def make_bvh(pts: np.ndarray, tr: np.ndarray) -> BVHTree:
        uv, inv = np.unique(tr.ravel(), return_inverse=True)
        return BVHTree.FromPolygons(pts[uv].tolist(), inv.reshape(-1, 3).tolist(), all_triangles=True)

    bvh_d = make_bvh(donor_xyz, donor_tri)
    bvh_0 = make_bvh(posed_lod0, lod0_tri)
    bvh_1 = make_bvh(posed_lod1, lod1_tri)

    def grid_highpass_p90_mm(
        bvh: BVHTree,
        xs: np.ndarray,
        zs: np.ndarray,
        from_front: bool,
        smooth_passes: int = 8,
    ) -> float:
        y_orig = -0.42 if from_front else 0.42
        r_dir = Vector((0.0, 1.0 if from_front else -1.0, 0.0))
        surf = np.full((len(xs), len(zs)), np.nan, dtype=np.float64)
        for xi, xv in enumerate(xs):
            for zi, zv in enumerate(zs):
                vals = []
                for sgn in ((1.0, -1.0) if abs(xv) > 1e-4 else (1.0,)):
                    h, _, _, _ = bvh.ray_cast(Vector((sgn * float(xv), y_orig, float(zv))), r_dir, 0.44)
                    if h is not None:
                        vals.append(-float(h.y) if from_front else float(h.y))
                if vals:
                    surf[xi, zi] = float(np.mean(vals))
        fin = np.isfinite(surf)
        if np.sum(fin) < 20:
            return 0.0
        for xi in range(len(xs)):
            f = np.isfinite(surf[xi])
            if np.sum(f) >= 3:
                surf[xi] = np.interp(zs, zs[f], surf[xi, f])
        for zi in range(len(zs)):
            f = np.isfinite(surf[:, zi])
            if np.sum(f) >= 3:
                surf[:, zi] = np.interp(xs, xs[f], surf[f, zi])
        if not np.all(np.isfinite(surf)):
            return 0.0
        base = surf.copy()
        for _ in range(smooth_passes):
            base[1:-1, :] = 0.25 * base[:-2, :] + 0.50 * base[1:-1, :] + 0.25 * base[2:, :]
            base[:, 1:-1] = 0.25 * base[:, :-2] + 0.50 * base[:, 1:-1] + 0.25 * base[:, 2:]
        hp = np.abs(surf[2:-2, 2:-2] - base[2:-2, 2:-2]) * 1000.0
        return float(np.percentile(hp, 92) * 2.0) if hp.size else 0.0

    zones = {
        "abdomensSixPack": (np.linspace(0.00, 0.095, 25), np.linspace(1.19, 1.42, 47), True, 10),
        "serratusAnterior": (np.linspace(0.095, 0.165, 19), np.linspace(1.30, 1.44, 29), True, 8),
        "posteriorScapulaBack": (np.linspace(0.020, 0.165, 30), np.linspace(1.30, 1.55, 51), False, 10),
        "quadricepsTeardrop": (np.linspace(0.065, 0.175, 23), np.linspace(0.64, 0.85, 43), True, 9),
        "calfGastrocnemius": (np.linspace(0.095, 0.190, 20), np.linspace(0.28, 0.44, 33), False, 8),
    }
    out = {}
    ratios = []
    for zname, (xs, zs, front, sp) in zones.items():
        d_mm = grid_highpass_p90_mm(bvh_d, xs, zs, front, sp)
        l0_mm = grid_highpass_p90_mm(bvh_0, xs, zs, front, sp)
        l1_mm = grid_highpass_p90_mm(bvh_1, xs, zs, front, sp)
        rat_1 = round(l1_mm / max(d_mm, 0.25), 3) if d_mm > 0.25 else 1.0
        rat_0 = round(l0_mm / max(d_mm, 0.25), 3) if d_mm > 0.25 else 1.0
        ratios.append(rat_1)
        out[zname] = {
            "donorCrestToValleyMm": round(d_mm, 3),
            "lod0CrestToValleyMm": round(l0_mm, 3),
            "lod1CrestToValleyMm": round(l1_mm, 3),
            "lod0ToDonorRatio": rat_0,
            "lod1ToDonorRatio": rat_1,
        }
    out["meanLod1ToDonorRatio"] = round(float(np.mean(ratios)), 3) if ratios else 1.0
    out["minLod1ToDonorRatio"] = round(float(np.min(ratios)), 3) if ratios else 1.0
    return out


def measure_unfiltered_and_section_fidelity(
    posed_base_all: np.ndarray,
    posed_fit_all: np.ndarray,
    rest_fit_all: np.ndarray,
    all_tri: np.ndarray,
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    masks: dict,
    pose_info: dict,
    stature_m: float,
    posed_lod1_all: np.ndarray | None = None,
    rest_lod1_all: np.ndarray | None = None,
    lod1_all_tri: np.ndarray | None = None,
) -> dict:
    """Measure UNFILTERED bidirectional surface distances across every anatomical part plus trunk/neck/limb sections."""
    obs_gain = masks["canonicalObsGain"]
    c_part = masks["canonicalPart"]
    c_tri_part = c_part[all_tri[:, 0]]
    c_tri_rel = obs_gain[all_tri].min(axis=1) >= 0.85

    def make_bvh(pts, tr):
        uv, inv = np.unique(tr.ravel(), return_inverse=True)
        return BVHTree.FromPolygons(pts[uv].tolist(), inv.reshape(-1, 3).tolist(), all_triangles=True)

    full_fit_bvh = make_bvh(posed_fit_all, all_tri)
    full_don_bvh = make_bvh(donor_xyz, donor_tri[masks["donorEligibleFaces"]])

    d_areas = 0.5 * np.linalg.norm(face_areas(donor_xyz, donor_tri), axis=1)
    c_areas = 0.5 * np.linalg.norm(face_areas(posed_fit_all, all_tri), axis=1)

    regional = {}
    for pname in ("trunk_neck", "arm_l", "arm_r", "leg_l", "leg_r"):
        cf = all_tri[c_tri_rel & (c_tri_part == pname)]
        df_mask = masks["donorPartMasks"][pname]
        # Restrict donor part strictly to non-overlapping primary region for sampling so overlap margins aren't double-sampled
        if pname == "trunk_neck":
            tc_z = donor_xyz[donor_tri].mean(axis=1)[:, 2]
            df_sample_mask = df_mask & (tc_z >= 1.12)
        elif pname in ("leg_l", "leg_r"):
            tc_z = donor_xyz[donor_tri].mean(axis=1)[:, 2]
            df_sample_mask = df_mask & (tc_z < 1.12)
        else:
            tc_x = np.abs(donor_xyz[donor_tri].mean(axis=1)[:, 0])
            df_sample_mask = df_mask & (tc_x >= float(pose_info["axillaSaddleAbsXM"]) - 0.01)

        df = donor_tri[df_sample_mask]
        if not len(cf) or not len(df):
            continue
        s_base, _, _, _ = sample_surface_with_normals(posed_base_all, cf, 2500)
        s_fit, _, _, f_area = sample_surface_with_normals(posed_fit_all, cf, 2500)
        s_don, _, _, d_area = sample_surface_with_normals(donor_xyz, df, 2500)

        d_part_bvh = make_bvh(donor_xyz, donor_tri[df_mask])
        regional[pname] = {
            "canonicalReliableAreaM2": round(f_area, 5),
            "canonicalInferredOrPinnedAreaM2": round(float(c_areas[(~c_tri_rel) & (c_tri_part == pname)].sum()), 5),
            "donorEligibleAreaM2": round(d_area, 5),
            "baseToDonor": metrics_summary(signed_distances(d_part_bvh, s_base)),
            "fitToDonor": metrics_summary(signed_distances(d_part_bvh, s_fit)),
            "donorToFitUnfiltered": metrics_summary(signed_distances(full_fit_bvh, s_don)),
        }

    z_bridge = float(pose_info["donorLastSeparateArmTrunkZ"])
    free_arm = masks["donorFreeArmSide"] != 0
    donor_no_free_arm_tri = donor_tri[~free_arm]

    levels = {
        "headTemple": 1.925,
        "headCheekJowl": 1.855,
        "midNeck": 1.755,
        "collarSeam": 1.680,
        "upperSeparateChest": round(min(1.488, z_bridge - 0.030), 4),
        "chestPectoral": 1.488,
        "lowerRib": 1.384,
        "waist": 1.345,
        "navel": 1.265,
        "pelvis": 1.205,
        "seat": 1.124,
    }
    sections = {}
    all_named_errors: list[tuple[str, float]] = []
    lod1_named_errors: list[tuple[str, float]] = []
    has_lod1 = (posed_lod1_all is not None) and (rest_lod1_all is not None) and (lod1_all_tri is not None)
    # Exclude brief-covered pelvis/seat planes (Z in [1.02, 1.22] when cloth present, or head above neck when F=0 keeps canonical face)
    # ONLY if genuinely covered; report raw section values on ALL planes and track every bare exposed section error!
    brief_faces = masks.get("donorLinenFaces")
    brief_z_hi = 1.155
    brief_z_lo = 0.895
    if brief_faces is not None and np.any(brief_faces):
        bz_pts = donor_xyz[donor_tri[brief_faces]].reshape(-1, 3)[:, 2]
        brief_z_hi = float(np.percentile(bz_pts, 98)) + 0.018
        brief_z_lo = float(np.percentile(bz_pts, 2)) - 0.015

    for name, z in levels.items():
        row: dict = {"planeHeightM": z}
        above_bridge = (z > z_bridge) and (z < 1.64)
        in_brief_band = (brief_faces is not None and np.any(brief_faces)) and (brief_z_lo <= z <= brief_z_hi)
        in_upper_face = z > 1.810
        mesh_list = [
            ("leanCanonical", (posed_base_all, all_tri)),
            ("donorRigid", (donor_xyz, donor_no_free_arm_tri)),
            ("fittedPosed", (posed_fit_all, all_tri)),
            ("fittedRest", (rest_fit_all, all_tri)),
        ]
        if has_lod1:
            mesh_list.extend(
                [
                    ("fittedPosedLod1", (posed_lod1_all, lod1_all_tri)),
                    ("fittedRestLod1", (rest_lod1_all, lod1_all_tri)),
                ]
            )
        for label, (pts, tr) in mesh_list:
            min_w = 0.08 if z > 1.64 else 0.14
            lps = [c for c in section_loops(pts, tr, z) if abs(c["center"][0]) < 0.06 and c["w"] > min_w]
            if lps:
                c = max(lps, key=lambda item: item["n"])
                row[label] = {"widthCm": round(c["w"] * 100.0, 2), "depthCm": round(c["depth"] * 100.0, 2)}
        if "donorRigid" in row and "fittedPosed" in row:
            dw, dd = row["donorRigid"]["widthCm"], row["donorRigid"]["depthCm"]
            fw, fd = row["fittedPosed"]["widthCm"], row["fittedPosed"]["depthCm"]
            if not above_bridge:
                w_err = round(100.0 * abs(fw - dw) / max(dw, 1e-6), 3)
                row["widthErrorPct"] = w_err
                if (not in_brief_band) and (not in_upper_face):
                    all_named_errors.append((f"{name}.width", w_err))
            d_err = round(100.0 * abs(fd - dd) / max(dd, 1e-6), 3)
            row["depthErrorPct"] = d_err
            if (not in_brief_band) and (not in_upper_face):
                all_named_errors.append((f"{name}.depth", d_err))
        if has_lod1 and "donorRigid" in row and "fittedPosedLod1" in row:
            dw, dd = row["donorRigid"]["widthCm"], row["donorRigid"]["depthCm"]
            fw1, fd1 = row["fittedPosedLod1"]["widthCm"], row["fittedPosedLod1"]["depthCm"]
            if not above_bridge:
                w1_err = round(100.0 * abs(fw1 - dw) / max(dw, 1e-6), 3)
                row["lod1WidthErrorPct"] = w1_err
                if (not in_brief_band) and (not in_upper_face):
                    lod1_named_errors.append((f"{name}.lod1Width", w1_err))
            d1_err = round(100.0 * abs(fd1 - dd) / max(dd, 1e-6), 3)
            row["lod1DepthErrorPct"] = d1_err
            if (not in_brief_band) and (not in_upper_face):
                lod1_named_errors.append((f"{name}.lod1Depth", d1_err))
        sections[name] = row

    # Outer shoulder/deltoid span at Z = 1.56 m
    d_sh = section_loops(donor_xyz, donor_tri, 1.56)
    f_sh = section_loops(posed_fit_all, all_tri, 1.56)
    if d_sh and f_sh:
        dw_sh = (max(c["maxX"] for c in d_sh) - min(c["minX"] for c in d_sh)) * 100.0
        fw_sh = (max(c["maxX"] for c in f_sh) - min(c["minX"] for c in f_sh)) * 100.0
        sp_err = round(100.0 * abs(fw_sh - dw_sh) / dw_sh, 3)
        sp_entry = {
            "planeHeightM": 1.56,
            "donorSpanCm": round(dw_sh, 2),
            "fittedPosedSpanCm": round(fw_sh, 2),
            "spanErrorPct": sp_err,
        }
        all_named_errors.append(("outerDeltoidSpan", sp_err))
        if has_lod1:
            f1_sh = section_loops(posed_lod1_all, lod1_all_tri, 1.56)
            if f1_sh:
                fw1_sh = (max(c["maxX"] for c in f1_sh) - min(c["minX"] for c in f1_sh)) * 100.0
                sp1_err = round(100.0 * abs(fw1_sh - dw_sh) / dw_sh, 3)
                sp_entry["fittedPosedLod1SpanCm"] = round(fw1_sh, 2)
                sp_entry["lod1SpanErrorPct"] = sp1_err
                lod1_named_errors.append(("outerDeltoidSpan.lod1", sp1_err))
        sections["outerDeltoidSpan"] = sp_entry

    # Comprehensive limb cross-sections: upper arm, elbow, mid forearm, wrist, upper thigh, mid thigh, knee, max calf, ankle
    limb_sections = {}
    for side_tag, spec in pose_info["sides"].items():
        sgn = spec["sign"]
        sh_p, el_p, wr_p, _ = [np.array(p, dtype=np.float64) for p in spec["arm"]["posed"]]
        hip_p, kn_p, an_p, _ = [np.array(p, dtype=np.float64) for p in spec["leg"]["posed"]]

        # Upper arm & elbow stations cleanly below z_bridge:
        # - When heavy lats/biceps lower z_bridge close to the elbow (`0.028 <= z_bridge - el_p[2] < 0.095`),
        #   use a horizontal Z-plane at `z_bridge - 0.022m` so the medial arm side never clips above `z_bridge`.
        # - When `F = 100%` wide flanks fuse with the medial elbow down to `z_bridge <= el_p[2] + 0.028m`,
        #   `upperArm` is above `z_bridge` (no freestanding donor loop) and `elbow` evaluates on the highest
        #   closed freestanding horizontal station below `z_bridge` (`z_bridge - 0.032m` along `el_p -> wr_p`).
        ua_above_bridge = (z_bridge - el_p[2]) < 0.028
        if ua_above_bridge:
            t_ua = 0.68
            ua_axis = el_p - sh_p
            z_el_free = z_bridge - 0.032
            t_el_free = float(np.clip((z_el_free - el_p[2]) / min(wr_p[2] - el_p[2], -1e-4), 0.0, 0.35))
            el_station_pt = (1.0 - t_el_free) * el_p + t_el_free * wr_p
            el_axis = np.array([0.0, 0.0, -1.0], dtype=np.float64)
        elif (z_bridge - el_p[2]) < 0.095:
            z_ua = max(el_p[2] + 0.024, z_bridge - 0.022)
            t_ua = float(np.clip((z_ua - sh_p[2]) / (el_p[2] - sh_p[2]), 0.50, 0.94))
            ua_axis = np.array([0.0, 0.0, -1.0], dtype=np.float64)
            el_station_pt = el_p
            el_axis = wr_p - sh_p
        else:
            t_ua = float(np.clip((z_bridge - 0.055 - sh_p[2]) / (el_p[2] - sh_p[2]), 0.48, 0.88))
            ua_axis = el_p - sh_p
            el_station_pt = el_p
            el_axis = wr_p - sh_p
        arm_stations = [
            ("upperArm", (1.0 - t_ua) * sh_p + t_ua * el_p, ua_axis),
            ("elbow", el_station_pt, el_axis),
            ("forearmMid", 0.50 * el_p + 0.50 * wr_p, wr_p - el_p),
            ("wrist", 0.08 * el_p + 0.92 * wr_p, wr_p - el_p),
        ]
        leg_stations = [
            ("thighUpper", 0.36 * hip_p + 0.64 * kn_p, kn_p - hip_p),
            ("thighMid", 0.46 * hip_p + 0.54 * kn_p, kn_p - hip_p),
            ("knee", kn_p, an_p - hip_p),
            ("calfMax", 0.46 * kn_p + 0.54 * an_p, an_p - kn_p),
            ("ankle", 0.05 * kn_p + 0.95 * an_p, an_p - kn_p),
        ]
        d_arm_tri = donor_tri[masks["donorFreeArmSide"] == sgn]
        d_leg_tri = donor_tri[(~free_arm) & (donor_xyz[donor_tri].mean(axis=1)[:, 0] * sgn >= -0.002)]
        sfx_arm = spec["jointSuffix"]
        c_arm_tri = all_tri[c_tri_part == f"arm_{sfx_arm}"]
        c_leg_tri = all_tri[(c_tri_part != "arm_l") & (c_tri_part != "arm_r")]
        if has_lod1:
            l1_rc = rest_lod1_all[lod1_all_tri].mean(axis=1)
            l1_is_arm = (l1_rc[:, 0] * sgn > 0.195) & (l1_rc[:, 2] > 1.05)
            l1_arm_tri = lod1_all_tri[l1_is_arm]
            l1_leg_tri = lod1_all_tri[~((np.abs(l1_rc[:, 0]) > 0.195) & (l1_rc[:, 2] > 1.05))]
        else:
            l1_arm_tri = lod1_all_tri
            l1_leg_tri = lod1_all_tri

        for st_list, d_sub_tri, c_sub_tri, l1_sub_tri, is_arm_grp in (
            (arm_stations, d_arm_tri, c_arm_tri, l1_arm_tri, True),
            (leg_stations, d_leg_tri, c_leg_tri, l1_leg_tri, False),
        ):
            for s_name, mid, axis_vec in st_list:
                ax = axis_vec / np.linalg.norm(axis_vec)
                lat = np.array([1.0, 0.0, 0.0])
                lat -= np.dot(lat, ax) * ax
                lat /= np.linalg.norm(lat)
                frame = np.column_stack((lat, np.cross(ax, lat), ax))
                entry: dict = {"stationCenterM": [round(float(x), 4) for x in mid]}
                limb_meshes = [
                    ("leanPosed", (posed_base_all, c_sub_tri)),
                    ("fittedPosed", (posed_fit_all, c_sub_tri)),
                ]
                if not (is_arm_grp and s_name == "upperArm" and ua_above_bridge):
                    limb_meshes.insert(1, ("donorRigid", (donor_xyz, d_sub_tri)))
                if has_lod1:
                    limb_meshes.append(("fittedPosedLod1", (posed_lod1_all, l1_sub_tri)))
                for label, (pts, tr) in limb_meshes:
                    loc = (pts - mid) @ frame
                    near = np.linalg.norm(loc[tr].mean(axis=1)[:, :2], axis=1) < 0.18
                    lps = [
                        c
                        for c in section_loops(loc, tr[near], 0.0, min_pts=6)
                        if np.linalg.norm(c["center"][:2]) < 0.075 and c["w"] < 0.30
                    ]
                    if lps:
                        c = max(lps, key=lambda item: item["n"])
                        entry[label] = {"widthCm": round(c["w"] * 100.0, 2), "depthCm": round(c["depth"] * 100.0, 2)}
                key_full = f"{side_tag}_{s_name}"
                if "donorRigid" in entry and "fittedPosed" in entry:
                    dw, dd = entry["donorRigid"]["widthCm"], entry["donorRigid"]["depthCm"]
                    fw, fd = entry["fittedPosed"]["widthCm"], entry["fittedPosed"]["depthCm"]
                    we = round(100.0 * abs(fw - dw) / max(dw, 1e-6), 3)
                    de = round(100.0 * abs(fd - dd) / max(dd, 1e-6), 3)
                    entry["widthErrorPct"] = we
                    entry["depthErrorPct"] = de
                    all_named_errors.append((f"{key_full}.width", we))
                    all_named_errors.append((f"{key_full}.depth", de))
                if has_lod1 and "donorRigid" in entry and "fittedPosedLod1" in entry:
                    dw, dd = entry["donorRigid"]["widthCm"], entry["donorRigid"]["depthCm"]
                    fw1, fd1 = entry["fittedPosedLod1"]["widthCm"], entry["fittedPosedLod1"]["depthCm"]
                    we1 = round(100.0 * abs(fw1 - dw) / max(dw, 1e-6), 3)
                    de1 = round(100.0 * abs(fd1 - dd) / max(dd, 1e-6), 3)
                    entry["lod1WidthErrorPct"] = we1
                    entry["lod1DepthErrorPct"] = de1
                    lod1_named_errors.append((f"{key_full}.lod1Width", we1))
                    lod1_named_errors.append((f"{key_full}.lod1Depth", de1))
                limb_sections[key_full] = entry

    worst_l0 = max(all_named_errors, key=lambda it: it[1]) if all_named_errors else ("none", 0.0)
    worst_l1 = max(lod1_named_errors, key=lambda it: it[1]) if lod1_named_errors else ("none", 0.0)
    relief_summary = (
        _measure_surface_relief_benchmarks(
            donor_xyz,
            donor_tri,
            posed_fit_all,
            all_tri,
            posed_lod1_all,
            lod1_all_tri,
        )
        if has_lod1
        else {}
    )

    return {
        "experimentalP95GateMm": round(stature_m * 0.002 * 1000.0, 3),
        "experimentalPatchGateMm": round(stature_m * 0.005 * 1000.0, 3),
        "donorTotalExcludedAreaM2": round(float(d_areas[~masks["donorEligibleFaces"]].sum()), 5),
        "worstNamedSectionError": {"section": worst_l0[0], "errorPct": worst_l0[1]},
        "worstLod1NamedSectionError": {"section": worst_l1[0], "errorPct": worst_l1[1]},
        "muscleReliefRetention": relief_summary,
        "regionalBidirectional": regional,
        "trunkAndNeckSections": sections,
        "limbSections": limb_sections,
    }


def write_support_npz(
    out_npz: Path,
    fit_blender: np.ndarray,
    mesh_key: str,
    compiled_family: dict,
    pose_id: str,
    retired_controls: list[str],
) -> None:
    """Emit support NPZ in exact glTF physical coordinates for bodySkin or headSkin."""
    me = compiled_family["meshes"][mesh_key]
    fit_gltf = blender_to_gltf(fit_blender).astype(np.float32)
    excluded = {"muscleMass", "fullness", *retired_controls}
    phys = {
        "units": "metres",
        "axes": compiled_family["axes"],
        "referenceStatureMetres": compiled_family["referenceStatureMetres"],
        "poseId": pose_id,
        "meshId": mesh_key,
        "rigSha256": hashlib.sha256(
            json.dumps(compiled_family["rig"], sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
        ).hexdigest(),
        "neutralControls": {k: v["default"] for k, v in compiled_family["controls"].items() if k not in excluded},
    }
    np.savez_compressed(
        out_npz,
        positions=fit_gltf.reshape(-1),
        topology=np.array(me["topology"]),
        physicalSpaceJson=np.array(json.dumps(phys, sort_keys=True)),
        triangles=np.asarray(me["triangles"], dtype=np.uint32),
        uvs=np.asarray(me["uvs"], dtype=np.float32),
        sourceVertexIndices=np.asarray(me["sourceVertexIndices"], dtype=np.uint32),
        renderTriangles=np.asarray(me["renderTriangles"], dtype=np.uint32),
        jointIndices=np.asarray(me["jointIndices"], dtype=np.uint32),
        jointWeights=np.asarray(me["jointWeights"], dtype=np.float32),
    )


def eval_arm_pose_lbs(
    pts_bl: np.ndarray,
    mesh_key: str,
    compiled_family: dict,
    raise_scale: float = 1.0,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, list[str]]:
    """Evaluate OpenLegend's retargeted 'Raised arms' clip at fractional raise_scale (0.772 = horizontal T-pose, 1.0 = +68.2 deg)."""
    joints = compiled_family["rig"]["joints"]
    n_j = len(joints)
    parents = [int(j["parent"]) for j in joints]

    def quat_to_mat3(q: np.ndarray) -> np.ndarray:
        x, y, z, w = float(q[0]), float(q[1]), float(q[2]), float(q[3])
        return np.array(
            [
                [1.0 - 2.0 * (y * y + z * z), 2.0 * (x * y - w * z), 2.0 * (x * z + w * y)],
                [2.0 * (x * y + w * z), 1.0 - 2.0 * (x * x + z * z), 2.0 * (y * z - w * x)],
                [2.0 * (x * z - w * y), 2.0 * (y * z + w * x), 1.0 - 2.0 * (x * x + y * y)],
            ],
            dtype=np.float64,
        )

    tgt_flat = np.asarray(compiled_family["rig"]["sourceRestMatrices"], dtype=np.float64)
    mot = compiled_family["motion"]
    src_flat = np.asarray(mot["sourceRestMatrices"], dtype=np.float64)

    r_tgt = np.array([tgt_flat[i * 16 : (i + 1) * 16].reshape(4, 4)[:3, :3].T for i in range(n_j)])
    h_tgt = np.array([tgt_flat[i * 16 : (i + 1) * 16].reshape(4, 4)[3, :3] for i in range(n_j)])
    r_src = np.array([src_flat[i * 16 : (i + 1) * 16].reshape(4, 4)[:3, :3].T for i in range(n_j)])
    h_src = np.array([src_flat[i * 16 : (i + 1) * 16].reshape(4, 4)[3, :3] for i in range(n_j)])

    ra_clip = next(c for c in mot["clips"] if c["name"] == "Raised arms")
    local_q_ra = np.asarray(ra_clip["localRotations"][: n_j * 4], dtype=np.float64).reshape(n_j, 4)

    r_local_src0 = np.empty((n_j, 3, 3), dtype=np.float64)
    for j_i in range(n_j):
        p_i = parents[j_i]
        r_local_src0[j_i] = r_src[j_i] if p_i < 0 else (r_src[p_i].T @ r_src[j_i])

    r_world_src = np.empty((n_j, 3, 3), dtype=np.float64)
    for j_i in range(n_j):
        r_ra = quat_to_mat3(local_q_ra[j_i])
        r_del = r_local_src0[j_i].T @ r_ra
        tr = float(np.clip((np.trace(r_del) - 1.0) * 0.5, -1.0, 1.0))
        ang = np.arccos(tr)
        if ang > 1e-6:
            ax = np.array([r_del[2, 1] - r_del[1, 2], r_del[0, 2] - r_del[2, 0], r_del[1, 0] - r_del[0, 1]]) / (2.0 * np.sin(ang))
            ang_s = ang * raise_scale
            q_s = np.array([ax[0] * np.sin(0.5 * ang_s), ax[1] * np.sin(0.5 * ang_s), ax[2] * np.sin(0.5 * ang_s), np.cos(0.5 * ang_s)])
            rl = r_local_src0[j_i] @ quat_to_mat3(q_s)
        else:
            rl = r_local_src0[j_i]
        p_i = parents[j_i]
        r_world_src[j_i] = rl if p_i < 0 else (r_world_src[p_i] @ rl)

    s_rot = np.einsum("jik,jlk->jil", r_world_src, r_src)
    r_world_tgt = np.einsum("jik,jkl->jil", s_rot, r_tgt)

    root_j = int(mot["rootJoint"])
    src_root = np.asarray(ra_clip["rootPositions"][:3], dtype=np.float64)
    ratio = float(h_tgt[root_j, 1] / h_src[root_j, 1])
    tgt_root = h_tgt[root_j] + raise_scale * (src_root - h_src[root_j]) * ratio

    h_world = np.empty((n_j, 3), dtype=np.float64)
    for j_i in range(n_j):
        p_i = parents[j_i]
        if p_i < 0:
            h_world[j_i] = tgt_root
        else:
            off_loc = r_tgt[p_i].T @ (h_tgt[j_i] - h_tgt[p_i])
            h_world[j_i] = h_world[p_i] + r_world_tgt[p_i] @ off_loc

    s_trans = h_world - np.einsum("jik,jk->ji", s_rot, h_tgt)
    pts_g = blender_to_gltf(pts_bl).astype(np.float64)
    me = compiled_family["meshes"][mesh_key]
    j_idx = np.asarray(me["jointIndices"], dtype=np.int64).reshape(len(pts_g), 4)
    j_wt = np.asarray(me["jointWeights"], dtype=np.float64).reshape(len(pts_g), 4)
    j_wt = j_wt / np.maximum(j_wt.sum(axis=1, keepdims=True), 1e-12)

    m_g = np.zeros((len(pts_g), 3, 3), dtype=np.float64)
    out_g = np.zeros_like(pts_g)
    for k in range(4):
        ji = j_idx[:, k]
        wk = j_wt[:, k, None]
        m_g += j_wt[:, k, None, None] * s_rot[ji]
        out_g += wk * (np.einsum("vij,vj->vi", s_rot[ji], pts_g) + s_trans[ji])

    return gltf_to_blender(out_g), m_g, gltf_to_blender(h_world), [j["id"] for j in joints]


def sample_surface_with_normals(
    points: np.ndarray, triangles: np.ndarray, count: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """Quasi-random area-weighted surface sampling returning (samples, unit_face_normals, face_indices, area_m2)."""
    faces = points[triangles]
    area_vec = np.cross(faces[:, 1] - faces[:, 0], faces[:, 2] - faces[:, 0])
    area2 = np.linalg.norm(area_vec, axis=1)
    valid = area2 > 1e-12
    f_nrm = np.zeros_like(area_vec)
    f_nrm[valid] = area_vec[valid] / area2[valid, None]
    cum = np.cumsum(area2)
    ids = np.clip(np.searchsorted(cum, (np.arange(count) + 0.5) * cum[-1] / count), 0, len(triangles) - 1)
    seq = np.arange(count) + 0.5
    u, v = np.sqrt(np.mod(seq * 0.754877666, 1.0)), np.mod(seq * 0.569840296, 1.0)
    w = np.column_stack((1.0 - u, u * (1.0 - v), u * v))
    pts = np.einsum("ni,nij->nj", w, faces[ids])
    return pts, f_nrm[ids], ids, float(cum[-1] * 0.5)


