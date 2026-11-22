#!/usr/bin/env python3
"""Modular post-CG manifold polish, bare-pelvis Tutte unfolding, axilla/pec/lat fairing,
head/neck seam polish, 5-finger normal thickening, and shared-map LOD0->LOD1 reduction.

Saddle/inseam operators gate strictly by canonical saddle topology + fitted coordinates:
- Never apply hop-based minimum-`X` floors that push medial-inseam vertices outward,
- Never apply broad pelvic exclusions across bare waist/oblique/adductor skin,
- Isolate pelvic trunk triangles via midline-seeded connected components (BFS) rather than fixed `|X|` boxes.
"""
from __future__ import annotations

from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from pathlib import Path
import re
import numpy as np


def infer_adipose_fullness_gate(
    coordinate_id: str | None,
    ref_body_bl: np.ndarray | None = None,
    fit_body_bl: np.ndarray | None = None,
) -> float:
    """Return [0.0, 1.0] soft-tissue fullness gate so lean/muscular (F=0) builds never trigger adipose smoothing or sag.

    - Explicit grid coordinates `...F000` / `...F050` / `...F100` map directly to 0.0 / 0.5 / 1.0.
    - Unlabeled character IDs infer adipose fullness from lower-waist/flank expansion relative to canonical stature,
      which stays ~0 on V-taper muscular builds and rises toward 1.0 on heavy builds.
    """
    if coordinate_id:
        m = re.search(r"(?:^|[-_])F(\d{3})(?:$|[-_])", coordinate_id, flags=re.IGNORECASE)
        if m:
            return float(np.clip(int(m.group(1)) / 100.0, 0.0, 1.0))
    if ref_body_bl is None or fit_body_bl is None or len(ref_body_bl) != len(fit_body_bl):
        return 1.0
    z_span = max(float(ref_body_bl[:, 2].max() - ref_body_bl[:, 2].min()), 1.0)
    z_lo = float(ref_body_bl[:, 2].min()) + 0.58 * z_span
    z_hi = float(ref_body_bl[:, 2].min()) + 0.66 * z_span
    flank = (ref_body_bl[:, 2] >= z_lo) & (ref_body_bl[:, 2] <= z_hi) & (np.abs(ref_body_bl[:, 0]) >= 0.06 * z_span)
    if np.sum(flank) < 16:
        return 1.0
    r0 = np.hypot(ref_body_bl[flank, 0], ref_body_bl[flank, 1])
    r1 = np.hypot(fit_body_bl[flank, 0], fit_body_bl[flank, 1])
    rel_gain = float(np.median(r1 - r0)) / max(z_span, 1e-6)
    return float(np.clip((rel_gain - 0.008) / 0.032, 0.0, 1.0))


def infer_muscle_mass_gate(
    coordinate_id: str | None,
    ref_body_bl: np.ndarray | None = None,
    fit_body_bl: np.ndarray | None = None,
) -> float:
    """Return [0.0, 1.0] skeletal-muscle mass gate across the full (M=0 slender -> M=0.5 canonical -> M=1 hypertrophied) spectrum.

    - Explicit grid coordinates `M000...` / `M050...` / `M100...` map directly to 0.0 / 0.5 / 1.0.
    - Unlabeled character IDs infer muscle mass from upper-body/deltoid/arm breadth vs waist taper relative to stature.
    """
    if coordinate_id:
        m = re.search(r"(?:^|[-_])M(\d{3})(?:$|[-_])", coordinate_id, flags=re.IGNORECASE)
        if m:
            return float(np.clip(int(m.group(1)) / 100.0, 0.0, 1.0))
    if ref_body_bl is None or fit_body_bl is None or len(ref_body_bl) != len(fit_body_bl):
        return 0.5
    z_min = float(ref_body_bl[:, 2].min())
    z_span = max(float(ref_body_bl[:, 2].max() - z_min), 1.0)
    upper = (ref_body_bl[:, 2] >= z_min + 0.78 * z_span) & (ref_body_bl[:, 2] <= z_min + 0.90 * z_span)
    waist = (ref_body_bl[:, 2] >= z_min + 0.58 * z_span) & (ref_body_bl[:, 2] <= z_min + 0.66 * z_span)
    if np.sum(upper) < 16 or np.sum(waist) < 16:
        return 0.5
    u_gain = (float(np.percentile(np.abs(fit_body_bl[upper, 0]), 94)) - float(np.percentile(np.abs(ref_body_bl[upper, 0]), 94))) / z_span
    w_gain = (float(np.percentile(np.abs(fit_body_bl[waist, 0]), 90)) - float(np.percentile(np.abs(ref_body_bl[waist, 0]), 90))) / z_span
    v_signal = u_gain - 0.55 * max(0.0, w_gain)
    return float(np.clip(0.50 + v_signal / 0.044, 0.0, 1.0))

_DONOR_GRID_CACHE_DIR = Path("/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study/family-20261113/fits/_raw_fit_cache")

def _donor_grid_key(donor_xyz: np.ndarray, tag: str) -> Path:
    import hashlib as _hl
    h = _hl.sha256(np.round(donor_xyz[::17], 4).astype(np.float32).tobytes()).hexdigest()[:12]
    _DONOR_GRID_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return _DONOR_GRID_CACHE_DIR / f"donor-grid-{tag}-{h}.npy"


def _stage_cache_eval(tag: str, fn_obj, key_arrays: list[np.ndarray], compute_fn) -> np.ndarray:
    import hashlib as _hl
    import inspect as _insp
    import os as _os
    import head_hand_polish as _hhp

    if _os.environ.get("OL_BYPASS_STAGE_CACHE") == "1":
        return np.asarray(compute_fn(), dtype=np.float32).astype(np.float64)
    h = _hl.sha256()
    h.update(tag.encode("utf-8"))
    h.update(_insp.getsource(fn_obj).encode("utf-8"))
    # Include module file bytes so helper edits inside post_fit_polish or head_hand_polish never hit stale .npy caches:
    h.update(_hl.sha256(Path(__file__).read_bytes()).digest())
    h.update(_hl.sha256(Path(_hhp.__file__).read_bytes()).digest())
    for arr in key_arrays:
        if arr is not None:
            a = np.asarray(arr)
            s = a[:: max(1, len(a) // 2048)] if a.ndim >= 1 and len(a) > 4096 else a
            h.update(np.round(s.astype(np.float32), 5).tobytes() if np.issubdtype(a.dtype, np.floating) else s.tobytes())
    _DONOR_GRID_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cp = _DONOR_GRID_CACHE_DIR / f"stage-{tag}-{h.hexdigest()[:14]}.npy"
    if cp.is_file():
        return np.load(cp).astype(np.float64)
    res_f32 = np.asarray(compute_fn(), dtype=np.float32)
    np.save(cp, res_f32)
    return res_f32.astype(np.float64)

from canonical_masks import bfs_hop_distance
from head_hand_polish import (
    polish_head_and_neck_fullness,
    polish_head_and_neck_seam,
    pre_untangle_raw_head_features,
    thicken_canonical_five_fingers,
)
from mesh_rig_utils import (
    bad_faces,
    compute_clipped_cotan_edge_weights,
    face_areas,
    self_intersections,
    smooth_vertex_vectors,
    smootherstep,
    smoothstep,
    vertex_normals,
    weld_connectivity,
)

def couple_canonical_five_toes_to_forefoot(
    ref_pts: np.ndarray,
    fit_pts: np.ndarray,
    adipose_gate: float = 1.0,
    muscle_gate: float = 0.5,
) -> np.ndarray:
    """Carry all 5 canonical toes on each foot via 2D horizontal conformal similarity follow
    of the observed widened metatarsal/instep band on the sliding `Z = 0.000m` floor plane:
    - ZERO `0.0mm` world-space pins: soles, insteps, and all 5 toes widen & translate freely in `(X, Y)`.
    - Preserves crisp 5-toe separation with `0` webbed-donor inter-toe self-intersections!
    """
    out = fit_pts.copy()
    rx, ry, rz = ref_pts.T
    flip_x = np.array([-1.0, 1.0], dtype=np.float64)
    if adipose_gate >= 0.999:
        forefoot_s = ry + 0.24 * np.abs(rx)
        band_l = (rx > 0.035) & (rz >= 0.008) & (rz <= 0.068) & (forefoot_s >= -0.088) & (forefoot_s <= -0.042)
        band_r = (rx < -0.035) & (rz >= 0.008) & (rz <= 0.068) & (forefoot_s >= -0.088) & (forefoot_s <= -0.042)
        s_blend_off, s_blend_w = 0.104, 0.034
    else:
        # Track the true oblique MTP toe-web arch (`big toe web at |rx|=0.160, ry=-0.175` -> `pinky toe web at |rx|=0.221, ry=-0.150`):
        forefoot_s = ry - 0.42 * np.maximum(0.0, np.abs(rx) - 0.155)
        band_l = (rx > 0.035) & (rz >= 0.008) & (rz <= 0.068) & (forefoot_s >= -0.145) & (forefoot_s <= -0.095)
        band_r = (rx < -0.035) & (rz >= 0.008) & (rz <= 0.068) & (forefoot_s >= -0.145) & (forefoot_s <= -0.095)
        s_blend_off, s_blend_w = 0.160, 0.036
    if np.sum(band_l) < 8 or np.sum(band_r) < 8:
        return out

    src_xy = np.vstack([ref_pts[band_l, :2], ref_pts[band_r, :2] * flip_x])
    dst_xy = np.vstack([fit_pts[band_l, :2], fit_pts[band_r, :2] * flip_x])
    mu_s = src_xy.mean(axis=0)
    mu_d = dst_xy.mean(axis=0)
    cs = src_xy - mu_s
    cd = dst_xy - mu_d
    u_m, sv_m, vt_m = np.linalg.svd(cd.T @ cs)
    det_m = float(np.linalg.det(u_m @ vt_m))
    rot2_l = u_m @ np.diag([1.0, 1.0 if det_m >= 0.0 else -1.0]) @ vt_m
    denom = max(float(np.sum(cs * cs)), 1e-12)
    raw_s_xy = float(sv_m[0] + (sv_m[1] if det_m >= 0.0 else -sv_m[1])) / denom
    slender_m = float(np.clip((0.50 - float(muscle_gate)) / 0.50, 0.0, 1.0))
    min_s_xy = 0.99 if adipose_gate >= 0.999 else (0.99 - 0.15 * slender_m)
    s_xy = float(np.clip(raw_s_xy, min_s_xy, 1.14))
    tr2_l = mu_d - s_xy * (rot2_l @ mu_s)

    s_z = (1.0 + 0.65 * max(0.0, s_xy - 1.0)) if s_xy >= 0.99 else (1.0 + 0.55 * (s_xy - 1.0))
    w_toe_blend = (
        (1.0 - smootherstep((rz - 0.062) / 0.022))
        * (1.0 - smootherstep((forefoot_s + s_blend_off) / s_blend_w))
    )

    for sgn, rot2, tr2 in (
        (1.0, rot2_l, tr2_l),
        (-1.0, np.diag(flip_x) @ rot2_l @ np.diag(flip_x), tr2_l * flip_x),
    ):
        m = (rx * sgn > 0.025) & (w_toe_blend > 1e-4)
        if not np.any(m):
            continue
        wm = w_toe_blend[m, None]
        xy_tgt = s_xy * (ref_pts[m, :2] @ rot2.T) + tr2[None, :]
        z_tgt = np.where(ref_pts[m, 2] <= 0.0045, ref_pts[m, 2], s_z * ref_pts[m, 2])
        tgt_3d = np.column_stack([xy_tgt, z_tgt])
        out[m] = (1.0 - wm) * out[m] + wm * tgt_3d

    plantar = rz <= 0.0045
    out[:, 2] = np.maximum(out[:, 2], 0.0)
    out[plantar, 2] = ref_pts[plantar, 2]
    return out


def _box_blur_2d_nip(arr: np.ndarray, rad: int) -> np.ndarray:
    out = arr.astype(np.float64, copy=True)
    k = 2 * rad + 1
    for _ in range(2):
        p = np.pad(out, ((rad, rad), (rad, rad)), mode="edge")
        csx = np.cumsum(np.pad(p, ((0, 0), (1, 0))), axis=1)
        hx = (csx[:, k:] - csx[:, :-k]) / float(k)
        csy = np.cumsum(np.pad(hx, ((1, 0), (0, 0))), axis=0)
        out = (csy[k:, :] - csy[:-k, :]) / float(k)
    return out


def _cardinal_spot_excess(field_in: np.ndarray, r_mm: int = 13) -> np.ndarray:
    p = np.pad(field_in, r_mm, mode="edge")
    h0, w0 = field_in.shape
    n_l = p[:h0, r_mm : r_mm + w0]
    n_r = p[2 * r_mm :, r_mm : r_mm + w0]
    n_d = p[r_mm : r_mm + h0, :w0]
    n_u = p[r_mm : r_mm + h0, 2 * r_mm :]
    stk = np.stack([field_in - n_l, field_in - n_r, field_in - n_d, field_in - n_u], axis=0)
    stk_sorted = np.sort(stk, axis=0)
    return np.minimum(stk_sorted[1], np.mean(stk, axis=0))


def _find_canonical_nipple_vertex_pairs(
    rest_base_low: np.ndarray,
    low_tri: np.ndarray,
    rest_base_high: np.ndarray,
) -> tuple[int, int, int, int]:
    """Identify the shared canonical pectoral nipple vertex pair on LOD1 and its coincident LOD0 pair."""
    l_conn = weld_connectivity(rest_base_low, low_tri, decimals=5)
    l_weld, _, _, l_deg = l_conn
    cand_pos = np.flatnonzero(
        (rest_base_low[:, 0] >= 0.095)
        & (rest_base_low[:, 0] <= 0.132)
        & (rest_base_low[:, 2] >= 1.445)
        & (rest_base_low[:, 2] <= 1.482)
        & (rest_base_low[:, 1] < -0.082)
    )
    ref_seed = np.array([0.1088, -0.0988, 1.4624], dtype=np.float64)
    val7 = [int(v) for v in cand_pos if int(l_deg[int(l_weld[int(v)])]) == 7]
    pool_p = np.asarray(val7 if val7 else cand_pos, dtype=np.int64)
    v_l1_pos = int(pool_p[int(np.argmin(np.linalg.norm(rest_base_low[pool_p] - ref_seed[None, :], axis=1)))])
    mir_pt = np.array([-rest_base_low[v_l1_pos, 0], rest_base_low[v_l1_pos, 1], rest_base_low[v_l1_pos, 2]], dtype=np.float64)
    v_l1_neg = int(np.argmin(np.linalg.norm(rest_base_low - mir_pt[None, :], axis=1)))
    v_l0_pos = int(np.argmin(np.linalg.norm(rest_base_high - rest_base_low[v_l1_pos][None, :], axis=1)))
    v_l0_neg = int(np.argmin(np.linalg.norm(rest_base_high - rest_base_low[v_l1_neg][None, :], axis=1)))
    return v_l1_pos, v_l1_neg, v_l0_pos, v_l0_neg


def _detect_donor_concept_nipple_posed(
    donor_xyz: np.ndarray,
    donor_rgb: np.ndarray | None,
    pose_info: dict | None,
    coordinate_id: str = "",
    study_dir: Path | None = None,
) -> tuple[float, float, float] | None:
    """Detect the ±X-symmetrized nipple landmark from registered 3D Donor albedo + papilla apex, verified against 2D Front Concept."""
    saddle_x = float(pose_info.get("axillaSaddleAbsXM", 0.195)) if isinstance(pose_info, dict) else 0.195
    x_hi = min(0.175, 0.77 * saddle_x)
    if x_hi <= 0.106:
        return None
    xg = np.linspace(0.085, x_hi, int(round((x_hi - 0.085) * 1000.0)) + 1)
    zg = np.linspace(1.440, 1.575, 136)

    m_dch = (
        (np.abs(donor_xyz[:, 0]) >= 0.080)
        & (np.abs(donor_xyz[:, 0]) <= x_hi + 0.010)
        & (donor_xyz[:, 2] >= 1.430)
        & (donor_xyz[:, 2] <= 1.585)
        & (donor_xyz[:, 1] < -0.070)
    )
    if int(np.sum(m_dch)) < 120:
        return None
    pts_d = donor_xyz[m_dch]
    has_rgb = donor_rgb is not None and len(donor_rgb) == len(donor_xyz)
    rgb_d = (
        np.power(np.clip(donor_rgb[m_dch], 0.0, 1.0), 1.0 / 2.2)
        if has_rgb
        else np.full((len(pts_d), 3), 0.65, dtype=np.float64)
    )
    Y3 = np.full((len(xg), len(zg)), np.nan, dtype=np.float64)
    L3 = np.full((len(xg), len(zg)), np.nan, dtype=np.float64)
    R3 = np.full((len(xg), len(zg)), np.nan, dtype=np.float64)
    ax_d = np.abs(pts_d[:, 0])
    for ix, xv in enumerate(xg):
        mx = np.abs(ax_d - xv) <= 0.0035
        if not np.any(mx):
            continue
        sub_p = pts_d[mx]
        sub_c = rgb_d[mx]
        for iz, zv in enumerate(zg):
            mz = np.abs(sub_p[:, 2] - zv) <= 0.0035
            if np.any(mz):
                k_f = np.argsort(sub_p[mz, 1])[: max(1, min(4, int(np.sum(mz))))]
                Y3[ix, iz] = float(np.mean(sub_p[mz, 1][k_f]))
                cm = sub_c[mz][k_f].mean(axis=0)
                L3[ix, iz] = float(cm.mean())
                R3[ix, iz] = float(cm[0] - 0.65 * cm[1] - 0.35 * cm[2])
    for arr3 in (Y3, L3, R3):
        for ix in range(len(xg)):
            ok = np.isfinite(arr3[ix])
            if int(np.sum(ok)) >= 4:
                arr3[ix] = np.interp(zg, zg[ok], arr3[ix, ok])
        for iz in range(len(zg)):
            ok = np.isfinite(arr3[:, iz])
            if int(np.sum(ok)) >= 4:
                arr3[:, iz] = np.interp(xg, xg[ok], arr3[ok, iz])
    if not np.all(np.isfinite(Y3)):
        return None

    Y3_in = _box_blur_2d_nip(Y3, 2)
    Y3_out = _box_blur_2d_nip(Y3, 10)
    L3_in = _box_blur_2d_nip(L3, 3)
    R3_in = _box_blur_2d_nip(R3, 4)
    pap3 = (Y3_out - Y3_in) * 1000.0
    c_dark3 = _cardinal_spot_excess(-L3_in, 13)
    c_pink3 = _cardinal_spot_excess(R3_in, 13)
    dYdX = np.gradient(_box_blur_2d_nip(Y3, 5), 0.001, axis=0)
    dYdZ = np.gradient(_box_blur_2d_nip(Y3, 5), 0.001, axis=1)
    valid_mound = (
        (dYdX < 0.78)
        & (dYdZ > -0.34)
        & (pap3 >= -0.20)
        & (xg[:, None] >= 0.102)
        & (xg[:, None] <= x_hi - 0.002)
        & (zg[None, :] >= 1.465)
        & (zg[None, :] <= 1.560)
    )
    if not np.any(valid_mound):
        return None

    sc_3d_map = np.where(
        valid_mound & ((c_pink3 > 0.0004) | (pap3 > 1.2)),
        0.0012 * np.clip(pap3, 0.0, 4.0) + np.maximum(c_dark3, 0.0) * np.maximum(c_pink3 + 0.001, 0.0) * 220.0,
        -1e9,
    )
    if float(np.max(sc_3d_map)) <= -1e8:
        sc_3d_map = np.where(valid_mound, pap3, -1e9)

    sc_2d_map = None
    ix2, iz2 = 0, 0
    if study_dir is not None and coordinate_id:
        cands = sorted((study_dir / "grid-9-20261112" / "candidates").glob(f"*-{coordinate_id}.png"))
        if cands:
            try:
                import bpy as _bpy_img

                c_img = _bpy_img.data.images.load(str(cands[0]), check_existing=False)
                c_img.colorspace_settings.name = "Non-Color"
                cw, ch = int(c_img.size[0]), int(c_img.size[1])
                px_raw = np.empty(cw * ch * 4, dtype=np.float32)
                c_img.pixels.foreach_get(px_raw)
                _bpy_img.data.images.remove(c_img)
                arr_c = np.flipud(px_raw.reshape(ch, cw, 4)[:, :, :3]) * 255.0
                fg_all = np.linalg.norm(arr_c - arr_c[8, 8][None, None, :], axis=2) > 18.0
                col_cnt = fg_all.sum(axis=0)
                s1 = int(cw * 0.30) + int(np.argmin(col_cnt[int(cw * 0.30) : int(cw * 0.44)]))
                fa = arr_c[:, :s1, :]
                ys, xs = np.nonzero(np.linalg.norm(fa - fa[6, 6][None, None, :], axis=2) > 18.0)
                if len(ys) > 500:
                    ry0, ry1 = int(ys.min()), int(ys.max())
                    stature_m = float(donor_xyz[:, 2].max() - donor_xyz[:, 2].min())
                    tx = xs[ys < ry0 + max(12, int(0.10 * (ry1 - ry0)))]
                    rxm = float(0.5 * (tx.min() + tx.max()))
                    px_per_m = float(ry1 - ry0) / max(stature_m, 1.50)
                    L2 = np.zeros((len(xg), len(zg)), dtype=np.float64)
                    R2 = np.zeros((len(xg), len(zg)), dtype=np.float64)
                    for ix, xv in enumerate(xg):
                        px_l = int(np.clip(round(rxm - xv * px_per_m), 0, s1 - 1))
                        px_r = int(np.clip(round(rxm + xv * px_per_m), 0, s1 - 1))
                        for iz, zv in enumerate(zg):
                            py_i = int(np.clip(round(ry1 - zv * px_per_m), 0, ch - 1))
                            rgb_px = 0.5 * (fa[py_i, px_l] + fa[py_i, px_r]) / 255.0
                            L2[ix, iz] = float(rgb_px.mean())
                            R2[ix, iz] = float(rgb_px[0] - 0.65 * rgb_px[1] - 0.35 * rgb_px[2])
                    c_dark2 = _cardinal_spot_excess(-_box_blur_2d_nip(L2, 3), 13)
                    c_pink2 = _cardinal_spot_excess(_box_blur_2d_nip(R2, 4), 13)
                    sc_2d_map = np.where(
                        valid_mound & (c_pink2 > 0.0005),
                        np.maximum(c_dark2, 0.0) * np.maximum(c_pink2, 0.0) * 200.0,
                        -1e9,
                    )
                    ix2, iz2 = np.unravel_index(int(np.argmax(sc_2d_map)), sc_2d_map.shape)
            except Exception:
                sc_2d_map = None

    if sc_2d_map is not None and float(sc_2d_map[ix2, iz2]) > 0.0:
        dist2_c = ((xg[:, None] - xg[ix2]) / 0.022) ** 2 + ((zg[None, :] - zg[iz2]) / 0.022) ** 2
        sc_j = np.where(valid_mound, np.maximum(sc_3d_map, 0.0) * np.exp(-0.5 * dist2_c) + 0.50 * np.maximum(sc_2d_map, 0.0), -1e9)
    else:
        sc_j = sc_3d_map
    ixj, izj = np.unravel_index(int(np.argmax(sc_j)), sc_j.shape)
    return float(xg[ixj]), float(Y3_out[ixj, izj]), float(zg[ixj])


def _align_and_sculpt_canonical_nipples_lod0(
    rest_base_high: np.ndarray,
    high_fit: np.ndarray,
    high_tri: np.ndarray,
    rest_base_low: np.ndarray,
    low_tri: np.ndarray,
    seam_mask: np.ndarray,
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    donor_rgb: np.ndarray | None,
    donor_bridged_axilla_faces: np.ndarray | None,
    posed_base_high: np.ndarray,
    jac_high: np.ndarray,
    pose_info: dict | None,
    coordinate_id: str = "",
    study_dir: Path | None = None,
) -> tuple[np.ndarray, dict | None]:
    """Slide the shared canonical nipple vertex pair along the Donor chest surface to the detected photo landmark and sculpt 3D papilla/areola relief."""
    nip_tgt = _detect_donor_concept_nipple_posed(donor_xyz, donor_rgb, pose_info, coordinate_id=coordinate_id, study_dir=study_dir)
    if nip_tgt is None:
        return high_fit, None
    x_nip, y_nip_env, z_nip = nip_tgt
    v_l1_pos, v_l1_neg, v_l0_pos, v_l0_neg = _find_canonical_nipple_vertex_pairs(rest_base_low, low_tri, rest_base_high)

    h_conn = weld_connectivity(rest_base_high, high_tri, decimals=5)
    h_weld, (h_es, h_ed), h_mult, h_deg = h_conn
    n_u = len(h_mult)
    first_u = np.zeros(n_u, dtype=np.int64)
    first_u[h_weld[::-1]] = np.arange(len(h_weld) - 1, -1, -1)
    ru = rest_base_high[first_u]
    pu = np.column_stack([np.bincount(h_weld, weights=high_fit[:, c], minlength=n_u) / h_mult for c in range(3)])
    mid_u = np.abs(ru[:, 0]) < 2.5e-4
    lock_u = np.isin(np.arange(n_u), h_weld[seam_mask])
    deg_f = np.maximum(h_deg.astype(np.float64), 1.0)
    jac_u = jac_high[first_u]
    u0_pos = int(h_weld[v_l0_pos])
    u0_neg = int(h_weld[v_l0_neg])

    # 1) Relax any pre-existing off-LOD1 witness bump (`around (±0.120, -0.090, 1.465)`) so only the true landmark carries relief:
    r_old_nip = np.hypot(np.abs(ru[:, 0]) - 0.120, ru[:, 2] - 1.465)
    w_relax_old = (
        np.where(~lock_u, 1.0, 0.0)
        * (1.0 - smootherstep((r_old_nip - 0.010) / 0.012))
        * smootherstep((-ru[:, 1] - 0.065) / 0.020)
    )
    old_idx = np.flatnonzero(w_relax_old > 0.01)
    if len(old_idx):
        for _ in range(5):
            nbr_o = np.column_stack([np.bincount(h_es, weights=pu[h_ed, c], minlength=n_u) / deg_f for c in range(3)])
            pu[old_idx] += (0.48 * w_relax_old[old_idx])[:, None] * (nbr_o[old_idx] - pu[old_idx])
            pu[mid_u, 0] = 0.0

    # 2) Build clean anterior Donor chest BVH (`excluding bridged axilla`) for ±X-symmetrized surface re-projection during tangent advection:
    saddle_x = float(pose_info.get("axillaSaddleAbsXM", 0.195)) if isinstance(pose_info, dict) else 0.195
    fc_d = donor_xyz[donor_tri].mean(axis=1)
    keep_ch = (np.abs(fc_d[:, 0]) <= saddle_x + 0.018) & (fc_d[:, 2] >= 1.320) & (fc_d[:, 2] <= 1.650) & (fc_d[:, 1] < -0.045)
    if donor_bridged_axilla_faces is not None and len(donor_bridged_axilla_faces) == len(donor_tri):
        keep_ch &= ~np.asarray(donor_bridged_axilla_faces, dtype=bool)
    if int(np.sum(keep_ch)) < 200:
        return pu[h_weld], None
    bvh_ch = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[keep_ch].tolist(), all_triangles=True)

    seam_pts_u = ru[lock_u]
    d_seam_u = (
        np.sqrt(np.min(np.sum((ru[:, None, :] - seam_pts_u[None, :, :]) ** 2, axis=2), axis=1))
        if len(seam_pts_u)
        else np.full(n_u, 1.0, dtype=np.float64)
    )
    w_seam_ok = smootherstep((d_seam_u - 0.020) / 0.028)

    def _query_sym_chest_y_and_nrm(xq_abs: float, zq: float, y_hint: float) -> tuple[float | None, np.ndarray | None]:
        ys_q = []
        ns_q = []
        for sx_q in (-1.0, 1.0):
            rh_q, rn_q, _, _ = bvh_ch.ray_cast(Vector((sx_q * xq_abs, -0.42, zq)), Vector((0.0, 1.0, 0.0)), 0.40)
            if rh_q is not None and float(rh_q.y) < -0.055 and float(rn_q.y) < -0.22:
                ys_q.append(float(rh_q.y))
                ns_q.append(np.array([sx_q * float(rn_q.x), float(rn_q.y), float(rn_q.z)], dtype=np.float64))
            else:
                nh_q, nn_q, _, nd_q = bvh_ch.find_nearest(Vector((sx_q * xq_abs, y_hint, zq)), 0.025)
                if nh_q is not None and nd_q < 0.022 and float(nn_q.y) < -0.22:
                    ys_q.append(float(nh_q.y))
                    ns_q.append(np.array([sx_q * float(nn_q.x), float(nn_q.y), float(nn_q.z)], dtype=np.float64))
        if not ys_q:
            return None, None
        n_m = np.mean(ns_q, axis=0)
        n_m /= max(float(np.linalg.norm(n_m)), 1e-12)
        return float(np.mean(ys_q)), n_m

    # 3) Smooth 3-step diffeomorphic chest tangent-plane advection + ±X-symmetrized Donor chest surface re-projection:
    posed_init = posed_base_high[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
    dx_tot = abs(x_nip - 0.5 * (abs(float(posed_init[u0_pos, 0])) + abs(float(posed_init[u0_neg, 0]))))
    dz_tot = abs(z_nip - 0.5 * (float(posed_init[u0_pos, 2]) + float(posed_init[u0_neg, 2])))
    sx_adv = max(0.048, 2.15 * dx_tot)
    sz_adv = max(0.052, 2.15 * dz_tot)

    for step_gain in (0.45, 0.65, 1.00):
        posed_cur = posed_base_high[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
        cur_x = 0.5 * (abs(float(posed_cur[u0_pos, 0])) + abs(float(posed_cur[u0_neg, 0])))
        cur_z = 0.5 * (float(posed_cur[u0_pos, 2]) + float(posed_cur[u0_neg, 2]))
        dx_step = step_gain * (x_nip - cur_x)
        dz_step = step_gain * (z_nip - cur_z)
        if float(np.hypot(dx_step, dz_step)) < 1.5e-4:
            break
        px_a = np.abs(posed_cur[:, 0])
        py_c = posed_cur[:, 1]
        pz_c = posed_cur[:, 2]
        r2_g = ((px_a - cur_x) / sx_adv) ** 2 + ((pz_c - cur_z) / sz_adv) ** 2
        w_adv = (
            np.where(~lock_u, 1.0, 0.0)
            * w_seam_ok
            * np.exp(-0.5 * r2_g)
            * smootherstep((px_a - 0.024) / 0.024)
            * (1.0 - smootherstep((px_a - (saddle_x - 0.012)) / 0.024))
            * smootherstep((pz_c - 1.335) / 0.032)
            * (1.0 - smootherstep((pz_c - 1.622) / 0.026))
            * smootherstep((-py_c - 0.075) / 0.028)
        )
        # Ensure the nipple anchor pair itself gets full `1.0` weight inside the chest interior:
        w_adv[u0_pos] = 1.0
        w_adv[u0_neg] = 1.0
        act_u = np.flatnonzero(w_adv > 0.008)
        for u_i in act_u:
            wu = float(w_adv[u_i])
            sgn_x = 1.0 if float(ru[u_i, 0]) >= 0.0 else -1.0
            nx_p = abs(float(posed_cur[u_i, 0])) + wu * dx_step
            nz_p = float(posed_cur[u_i, 2]) + wu * dz_step
            y_surf, _ = _query_sym_chest_y_and_nrm(nx_p, nz_p, float(posed_cur[u_i, 1]))
            w_y_snap = float(smootherstep(np.array([wu / 0.16]))[0])
            ny_p = (1.0 - w_y_snap) * float(posed_cur[u_i, 1]) + w_y_snap * (y_surf if y_surf is not None else float(posed_cur[u_i, 1]))
            dp_p = np.array([sgn_x * nx_p - float(posed_cur[u_i, 0]), ny_p - float(posed_cur[u_i, 1]), nz_p - float(posed_cur[u_i, 2])], dtype=np.float64)
            try:
                dp_r = np.linalg.solve(jac_u[u_i], dp_p)
            except np.linalg.LinAlgError:
                dp_r = dp_p
            nrm_dp = float(np.linalg.norm(dp_r))
            if nrm_dp > 0.065:
                dp_r *= 0.065 / nrm_dp
            pu[u_i] += dp_r
        pu[mid_u, 0] = 0.0

    # 4) Sculpt clean 3D areola dome (`0.75 mm`, sigma=12.0 mm) + papilla (`2.15 mm`, sigma=4.6 mm) centered on `u0_pos / u0_neg`:
    posed_post = posed_base_high[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
    y_base_nip, n_nip_pos = _query_sym_chest_y_and_nrm(x_nip, z_nip, y_nip_env)
    if n_nip_pos is None:
        n_nip_pos = np.array([0.18, -0.96, -0.10], dtype=np.float64)
        n_nip_pos /= float(np.linalg.norm(n_nip_pos))
    # Smooth local chest-envelope base height around `(x_nip, z_nip)` so we never double-stack on top of an existing Donor papilla:
    y_env_nip = float(y_nip_env) if y_base_nip is None else max(float(y_base_nip), float(y_nip_env))
    px_f = np.abs(posed_post[:, 0])
    py_f = posed_post[:, 1]
    pz_f = posed_post[:, 2]
    d_nip_3d = np.hypot(px_f - x_nip, pz_f - z_nip)
    in_mound = np.flatnonzero((~lock_u) & (py_f < -0.075) & (d_nip_3d <= 0.028))
    for u_m in in_mound:
        sgn_x = 1.0 if float(ru[u_m, 0]) >= 0.0 else -1.0
        r_m = float(d_nip_3d[u_m])
        # Flatten any raw Meshy noise spike within `r <= 9 mm` to smooth chest envelope `Y3_out` before adding clean symmetric papilla:
        w_flat = float(np.exp(-0.5 * ((r_m / 0.0065) ** 2)))
        y_loc_env = float(posed_post[u_m, 1])
        if r_m <= 0.010:
            y_s, _ = _query_sym_chest_y_and_nrm(float(px_f[u_m]), float(pz_f[u_m]), float(py_f[u_m]))
            if y_s is not None:
                y_loc_env = max(float(y_s), y_env_nip + (float(y_s) - float(y_base_nip if y_base_nip is not None else y_s)))
        h_pap = 0.00215 * float(np.exp(-0.5 * ((r_m / 0.0046) ** 2))) + 0.00075 * float(np.exp(-0.5 * ((r_m / 0.0120) ** 2)))
        n_dir = np.array([sgn_x * float(n_nip_pos[0]), float(n_nip_pos[1]), float(n_nip_pos[2])], dtype=np.float64)
        dp_base = np.array([0.0, w_flat * (y_loc_env - float(posed_post[u_m, 1])), 0.0], dtype=np.float64)
        dp_mound = dp_base + h_pap * n_dir
        try:
            pu[u_m] += np.linalg.solve(jac_u[u_m], dp_mound)
        except np.linalg.LinAlgError:
            pu[u_m] += dp_mound
    pu[mid_u, 0] = 0.0

    # Enforce exact ±X mirror symmetry across modified chest vertices:
    kd_ch = KDTree(n_u)
    for ui_k, pt_k in enumerate(ru):
        kd_ch.insert(pt_k.tolist(), ui_k)
    kd_ch.balance()
    pu_sym = pu.copy()
    mod_ch = np.flatnonzero((np.abs(ru[:, 0]) <= 0.24) & (ru[:, 2] >= 1.30) & (ru[:, 2] <= 1.66) & (ru[:, 1] < -0.03) & (~lock_u))
    for ui_s in mod_ch:
        if mid_u[ui_s]:
            pu_sym[ui_s, 0] = 0.0
        else:
            _, jm_s, dm_s = kd_ch.find([-float(ru[ui_s, 0]), float(ru[ui_s, 1]), float(ru[ui_s, 2])])
            if jm_s is not None and dm_s < 0.0025 and ru[ui_s, 0] * ru[jm_s, 0] < 0.0:
                pu_sym[ui_s, 0] = 0.5 * (pu[ui_s, 0] - pu[jm_s, 0])
                pu_sym[ui_s, 1] = 0.5 * (pu[ui_s, 1] + pu[jm_s, 1])
                pu_sym[ui_s, 2] = 0.5 * (pu[ui_s, 2] + pu[jm_s, 2])
    out_high = pu_sym[h_weld]
    info_nip = {
        "vLod1Pos": v_l1_pos,
        "vLod1Neg": v_l1_neg,
        "vLod0Pos": v_l0_pos,
        "vLod0Neg": v_l0_neg,
        "targetPosedXAbsM": round(x_nip, 4),
        "targetPosedYM": round(y_env_nip, 4),
        "targetPosedZM": round(z_nip, 4),
    }
    return out_high, info_nip


def guard_and_reduce_body_and_head(
    rest_base_high: np.ndarray,
    rest_fit_high_raw: np.ndarray,
    high_tri: np.ndarray,
    rest_base_low: np.ndarray,
    low_tri: np.ndarray,
    rest_base_head: np.ndarray,
    rest_fit_head_raw: np.ndarray,
    head_tri: np.ndarray,
    seam_body: np.ndarray,
    seam_head: np.ndarray,
    map_faces: np.ndarray,
    map_weights: np.ndarray,
    interface: dict,
    body_hard_pin: np.ndarray,
    head_hard_pin: np.ndarray,
    body_obs_gain: np.ndarray,
    body_cleft_inferred: np.ndarray,
    body_arm_weight: np.ndarray | None = None,
    pose_info: dict | None = None,
    donor_xyz: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
    posed_base_high: np.ndarray | None = None,
    jac_high: np.ndarray | None = None,
    posed_base_head: np.ndarray | None = None,
    jac_head: np.ndarray | None = None,
    finger_topo_lod0: dict | None = None,
    body_sole_toe_pin: np.ndarray | None = None,
    guarded_cache_path: Path | None = None,
    head_feature_masks: dict | None = None,
    adipose_gate: float = 1.0,
    muscle_gate: float = 0.5,
    donor_eligible_faces: np.ndarray | None = None,
    donor_bridged_axilla_faces: np.ndarray | None = None,
    donor_bridged_thigh_faces: np.ndarray | None = None,
    donor_linen_faces: np.ndarray | None = None,
    donor_linen_rim_faces: np.ndarray | None = None,
    sex: str = "auto",
    donor_rgb: np.ndarray | None = None,
    coordinate_id: str = "",
    study_dir: Path | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    """Guard orientation and self-intersections on rest LOD0, reduced LOD1, and headSkin without shrinking volumes."""
    high_conn = weld_connectivity(rest_base_high, high_tri, decimals=5)
    low_conn = weld_connectivity(rest_base_low, low_tri, decimals=5)
    head_conn = weld_connectivity(rest_base_head, head_tri, decimals=5)
    high_weld, (h_es, h_ed), h_mult, h_deg = high_conn
    low_weld, (l_es, l_ed), l_mult, l_deg = low_conn
    head_weld, (hd_es, hd_ed), hd_mult, hd_deg = head_conn

    high_before = self_intersections(rest_base_high, high_tri, high_weld)
    low_before = self_intersections(rest_base_low, low_tri, low_weld)
    head_before = self_intersections(rest_base_head, head_tri, head_weld)

    high_areas = face_areas(rest_base_high, high_tri)
    low_areas = face_areas(rest_base_low, low_tri)
    head_areas = face_areas(rest_base_head, head_tri)

    aliases = interface.get("lod1Aliases", [])
    alias_groups: dict[int, set[int]] = {}
    for a, b in aliases:
        ga = alias_groups.setdefault(int(a), {int(a)})
        gb = alias_groups.setdefault(int(b), {int(b)})
        if ga is not gb:
            ga |= gb
            for m in gb:
                alias_groups[m] = ga
    unique_alias_groups = [sorted(g) for g in {id(g): g for g in alias_groups.values()}.values()]

    red_faces = high_tri[map_faces]
    import hashlib as _ghl
    import head_hand_polish as _ghhp
    _code_sig = _ghl.sha256(Path(__file__).read_bytes() + Path(_ghhp.__file__).read_bytes()).hexdigest()[:8]
    guard_tag = "v3-" if adipose_gate >= 0.999 else ("v13-" if float(muscle_gate) >= 0.50 else f"v14-{_code_sig}-")
    eff_guarded_cache = (
        guarded_cache_path.with_name(guard_tag + guarded_cache_path.name)
        if guarded_cache_path is not None
        else None
    )
    if eff_guarded_cache is not None and eff_guarded_cache.is_file():
        g_npz = np.load(eff_guarded_cache, allow_pickle=False)
        high_fit = g_npz["highFit"].astype(np.float64)
        low_fit = g_npz["lowFit"].astype(np.float64)
        head_fit = g_npz["headFit"].astype(np.float64)
        hd_bad = np.array([], dtype=np.int64)
        hd_cross: set[tuple[int, int]] = set()
        import json as _json
        rollback = _json.loads(str(g_npz["rollbackJson"]))
    else:
        rest_fit_high_init = couple_canonical_five_toes_to_forefoot(
            rest_base_high, rest_fit_high_raw, adipose_gate=adipose_gate, muscle_gate=muscle_gate
        )
        if adipose_gate < 0.999 and finger_topo_lod0 is not None:
            rest_fit_high_init, _ = thicken_canonical_five_fingers(
                rest_base_high,
                rest_fit_high_init,
                high_tri,
                finger_topo_lod0,
                hard_lock_mask=body_hard_pin,
                adipose_gate=adipose_gate,
                muscle_gate=muscle_gate,
            )
        rest_fit_head_init = (
            pre_untangle_raw_head_features(
                rest_base_head, rest_fit_head_raw, head_tri, head_feature_masks, adipose_gate=adipose_gate
            )
            if adipose_gate < 0.999
            else rest_fit_head_raw
        )
        delta_h = rest_fit_high_init - rest_base_high
        delta_h[body_hard_pin] = 0.0
        delta_hd = rest_fit_head_init - rest_base_head
        delta_hd[head_hard_pin] = 0.0

        welded_h_faces = high_weld[high_tri]
        welded_hd_faces = head_weld[head_tri]
        red_faces = high_tri[map_faces]
        u_h_lock = np.isin(np.arange(len(h_mult)), high_weld[body_hard_pin])
        u_hd_lock = np.isin(np.arange(len(hd_mult)), head_weld[head_hard_pin])

        first_h = np.zeros(len(h_mult), dtype=np.int64)
        first_h[high_weld[::-1]] = np.arange(len(high_weld) - 1, -1, -1)
        rest_u_h = rest_base_high[first_h]
        obs_u_h = np.bincount(high_weld, weights=body_obs_gain, minlength=len(h_mult)) / h_mult
        cleft_u_h = np.bincount(high_weld, weights=body_cleft_inferred, minlength=len(h_mult)) / h_mult
        arm_w_u_h = (
            np.bincount(high_weld, weights=body_arm_weight, minlength=len(h_mult)) / h_mult
            if body_arm_weight is not None
            else np.where(np.abs(rest_u_h[:, 0]) > 0.215, 1.0, 0.0)
        )
        slot_u_h = np.zeros(len(h_mult), dtype=bool)
        perin_u_h = np.zeros(len(h_mult), dtype=bool)
        crotch_u_h = perin_u_h
        mid_u_h = (~u_h_lock) & (rest_u_h[:, 2] < 1.75) & (np.abs(rest_u_h[:, 0]) <= 0.00025)
        sep_u_h = (
            (~u_h_lock)
            & (rest_u_h[:, 2] < 1.75)
            & (np.abs(rest_u_h[:, 0]) > 0.00025)
            & (np.abs(rest_u_h[:, 0]) < 0.065)
        )
        sgn_x_h = np.sign(rest_u_h[:, 0])
        h_deg_f = np.maximum(h_deg.astype(np.float64), 1.0)
        h_wcot_raw = compute_clipped_cotan_edge_weights(rest_u_h, welded_h_faces, h_es, h_ed, len(h_mult))
        w_scrot_pkt_hx = (
            smootherstep((np.abs(rest_u_h[:, 0]) - 0.0010) / 0.0020)
            * (1.0 - smootherstep((np.abs(rest_u_h[:, 0]) - 0.0180) / 0.0080))
            * smootherstep((-rest_u_h[:, 1] - 0.020) / 0.012)
            * smootherstep((rest_u_h[:, 2] - 1.008) / 0.010)
            * (1.0 - smootherstep((rest_u_h[:, 2] - 1.045) / 0.015))
        )
        scrot_pkt_ehx = np.minimum(w_scrot_pkt_hx[h_es], w_scrot_pkt_hx[h_ed])
        h_wcot_x = (1.0 - scrot_pkt_ehx) * h_wcot_raw + scrot_pkt_ehx * 1.0
        h_dcot_x = np.maximum(np.bincount(h_es, weights=h_wcot_x, minlength=len(h_mult)), 1e-12)

        w_scrot_pkt_h = (
            (1.0 - smootherstep((np.abs(rest_u_h[:, 0]) - 0.0180) / 0.0080))
            * (1.0 - smootherstep((rest_u_h[:, 1] - 0.022) / 0.012))
            * smootherstep((rest_u_h[:, 2] - 1.004) / 0.010)
            * (1.0 - smootherstep((rest_u_h[:, 2] - 1.048) / 0.015))
        )
        scrot_pkt_eh = np.minimum(w_scrot_pkt_h[h_es], w_scrot_pkt_h[h_ed])
        h_wcot = (1.0 - scrot_pkt_eh) * h_wcot_raw + scrot_pkt_eh * 1.0
        h_dcot = np.maximum(np.bincount(h_es, weights=h_wcot, minlength=len(h_mult)), 1e-12)
        unfold_u_h = rest_u_h.copy()
        unfold_u_h[mid_u_h, 0] = 0.0
        w_groin_h = np.where(
            ~u_h_lock,
            (1.0 - smootherstep((np.abs(rest_u_h[:, 0]) - 0.058) / 0.020))
            * smootherstep((rest_u_h[:, 2] - 0.990) / 0.008)
            * (1.0 - smootherstep((rest_u_h[:, 2] - 1.104) / 0.022))
            * smootherstep((-rest_u_h[:, 1] - 0.004) / 0.008),
            0.0,
        )
        gh_idx = np.flatnonzero(w_groin_h > 1e-3)
        if len(gh_idx):
            gh_in = np.zeros(len(h_mult), dtype=bool)
            gh_in[gh_idx] = True
            gh_sub = gh_in[h_es]
            gh_es_g = h_es[gh_sub]
            gh_ed_g = h_ed[gh_sub]
            gh_ew_sub_x = h_wcot_x[gh_sub]
            gh_ew_sub = h_wcot[gh_sub]
            gh_g2l = np.full(len(h_mult), -1, dtype=np.int64)
            gh_g2l[gh_idx] = np.arange(len(gh_idx))
            gh_es_loc = gh_g2l[gh_es_g]
            gh_deg_loc_x = h_dcot_x[gh_idx]
            gh_deg_loc = h_dcot[gh_idx]
            gh_w = w_groin_h[gh_idx, None]
            for _ in range(1600):
                nbr_gh = np.column_stack(
                    [
                        np.bincount(gh_es_loc, weights=gh_ew_sub_x * unfold_u_h[gh_ed_g, 0], minlength=len(gh_idx)) / gh_deg_loc_x,
                        np.bincount(gh_es_loc, weights=gh_ew_sub * unfold_u_h[gh_ed_g, 1], minlength=len(gh_idx)) / gh_deg_loc,
                        np.bincount(gh_es_loc, weights=gh_ew_sub * unfold_u_h[gh_ed_g, 2], minlength=len(gh_idx)) / gh_deg_loc,
                    ]
                )
                unfold_u_h[gh_idx] += (0.90 * gh_w) * (nbr_gh - unfold_u_h[gh_idx])
                unfold_u_h[mid_u_h, 0] = 0.0
        w_cleft_h = np.where(
            ~u_h_lock,
            (1.0 - smootherstep((np.abs(rest_u_h[:, 0]) - 0.036) / 0.020))
            * smootherstep((rest_u_h[:, 2] - 0.976) / 0.016)
            * (1.0 - smootherstep((rest_u_h[:, 2] - 1.125) / 0.022))
            * smootherstep((rest_u_h[:, 1] + 0.008) / 0.012),
            0.0,
        )
        w_pel_unif_h = np.maximum(w_groin_h, w_cleft_h)
        h_elen = np.linalg.norm(unfold_u_h[h_es] - unfold_u_h[h_ed], axis=1)
        h_wlen_raw = 1.0 / np.maximum(h_elen, 0.0012)
        pel_e_blend = np.maximum(w_pel_unif_h[h_es], w_pel_unif_h[h_ed])
        # Use diagonal-free clipped cotangent weights inside groin/glute pouch so guard untangling NEVER creates 1.2mm seam or diagonal V cat-whiskers!
        h_wlen = (1.0 - pel_e_blend) * h_wlen_raw + pel_e_blend * (80.0 * h_wcot)
        h_dlen = np.maximum(np.bincount(h_es, weights=h_wlen, minlength=len(h_mult)), 1e-12)
        h_wlen_ext = (1.0 - pel_e_blend) * h_wlen_raw + pel_e_blend * (80.0 * h_wcot_x)
        h_dlen_ext = np.maximum(np.bincount(h_es, weights=h_wlen_ext, minlength=len(h_mult)), 1e-12)
        pouch_harm_h = (
            (~u_h_lock)
            & (~mid_u_h)
            & (~slot_u_h)
            & (np.abs(unfold_u_h[:, 0]) < 0.064)
            & (unfold_u_h[:, 2] > 0.992)
            & (unfold_u_h[:, 2] < 1.112)
            & (unfold_u_h[:, 1] < 0.015)
        )
        rx_pel_h = unfold_u_h[:, 0].copy()
        rx_pel_h[mid_u_h] = 0.0
        for _ in range(1000):
            nbr_xh = np.bincount(h_es, weights=h_wcot_x * rx_pel_h[h_ed], minlength=len(h_mult)) / h_dcot_x
            rx_pel_h[pouch_harm_h] = nbr_xh[pouch_harm_h]
        min_x_h = 0.62 * np.minimum(np.abs(rx_pel_h), 0.0055) + 0.22 * np.clip(np.abs(rx_pel_h) - 0.0055, 0.0, 0.016)
        tc_rest_h = rest_base_high[high_tri].mean(axis=1)
        tc_rest_l = rest_base_low[low_tri].mean(axis=1)
        n0_h = high_areas / np.maximum(np.linalg.norm(high_areas, axis=1, keepdims=True), 1e-12)
        n0_l = low_areas / np.maximum(np.linalg.norm(low_areas, axis=1, keepdims=True), 1e-12)

        arm_w_h_v = arm_w_u_h[high_weld]
        fw_h = arm_w_h_v[high_tri].mean(axis=1)
        arm_w_l_v = np.einsum("ni,ni->n", map_weights, arm_w_h_v[red_faces])
        fw_l = arm_w_l_v[low_tri].mean(axis=1)

        def classify_cross_pair(tc_r: np.ndarray, n0: np.ndarray, fw: np.ndarray, fa: int, fb: int) -> str:
            d_r = float(np.linalg.norm(tc_r[fa] - tc_r[fb]))
            xa, xb = float(tc_r[fa, 0]), float(tc_r[fb, 0])
            za, zb = float(tc_r[fa, 2]), float(tc_r[fb, 2])
            wa, wb = float(fw[fa]), float(fw[fb])
            opp_arm_trunk = (min(wa, wb) < 0.40) and (max(wa, wb) > 0.50)
            is_axilla_vault = (
                opp_arm_trunk
                and min(za, zb) >= 1.32
                and max(abs(xa), abs(xb)) >= 0.12
                and d_r >= 0.012
                and float(np.dot(n0[fa], n0[fb])) < -0.10
            )
            is_arm_vs_trunk = opp_arm_trunk and max(abs(xa), abs(xb)) >= 0.16 and abs(abs(xa) - abs(xb)) >= 0.045 and d_r >= 0.055
            if is_axilla_vault or is_arm_vs_trunk:
                return "armpit_gap"
            if (xa * xb < -1e-9) and max(za, zb) <= 1.25:
                return "thigh_cross"
            return "local_fold"

        def grow_rings(seed_mask: np.ndarray, rings: int) -> np.ndarray:
            out = seed_mask.copy() & (~u_h_lock)
            for _ in range(rings):
                out = (out | np.isin(np.arange(len(h_mult)), h_ed[np.isin(h_es, np.flatnonzero(out))])) & (~u_h_lock)
            return out

        rollback = []
        best_score: tuple[int, int] | None = None
        best_state: tuple | None = None

        for step in range(40):
            high_fit = (rest_base_high + delta_h).astype(np.float32).astype(np.float64)
            mapped = np.einsum("ni,nij->nj", map_weights, (high_fit - rest_base_high)[red_faces])
            for grp in unique_alias_groups:
                mapped[grp] = mapped[grp].mean(axis=0)
            low_fit = (rest_base_low + mapped).astype(np.float32).astype(np.float64)

            head_fit = polish_head_and_neck_seam(
                rest_base_head,
                rest_base_head + delta_hd,
                head_tri,
                head_hard_pin,
                seam_head,
                low_fit[seam_body],
            )
            delta_hd_step = head_fit - rest_base_head

            h_cross = self_intersections(high_fit, high_tri, high_weld) - high_before
            l_cross = self_intersections(low_fit, low_tri, low_weld) - low_before
            hd_cross = self_intersections(head_fit, head_tri, head_weld) - head_before
            h_bad = np.flatnonzero(bad_faces(high_fit, high_tri, high_areas, high_conn))
            l_bad = np.flatnonzero(bad_faces(low_fit, low_tri, low_areas, low_conn))
            hd_bad = np.flatnonzero(bad_faces(head_fit, head_tri, head_areas, head_conn))

            cur_score = (len(h_cross) + len(l_cross) + len(hd_cross), int(len(h_bad) + len(l_bad) + len(hd_bad)))
            if best_score is None or cur_score < best_score:
                best_score = cur_score
                best_state = (high_fit.copy(), low_fit.copy(), head_fit.copy(), h_bad, l_bad, hd_bad, h_cross, l_cross, hd_cross)

            if cur_score == (0, 0):
                delta_hd = delta_hd_step
                break

            rollback.append(
                {
                    "step": step + 1,
                    "lod0SelfCross": len(h_cross),
                    "lod1SelfCross": len(l_cross),
                    "headSelfCross": len(hd_cross),
                    "lod0BadFaces": int(len(h_bad)),
                    "lod1BadFaces": int(len(l_bad)),
                    "headBadFaces": int(len(hd_bad)),
                }
            )

            if h_cross or l_cross or len(h_bad) or len(l_bad):
                u_del = np.column_stack(
                    [np.bincount(high_weld, weights=delta_h[:, a], minlength=len(h_mult)) / h_mult for a in range(3)]
                )

                # Separate self-intersections into:
                # 1) armpit_gap (opposite arm-vs-trunk -> smooth lateral X separation ONLY; ZERO Y/Z shrinkage!)
                # 2) thigh_cross (left-vs-right across X=0 -> pure lateral X clearance ONLY; ZERO Y/Z groin or glute shrinkage!)
                # 3) local_fold (single-sheet fold-overs -> volume-preserving deformed-position u_pos Tutte untangling!)
                arm_h_f, th_h_f, loc_h_f = [], [], []
                for fa, fb in h_cross:
                    kind = classify_cross_pair(tc_rest_h, n0_h, fw_h, fa, fb)
                    if kind == "armpit_gap":
                        arm_h_f.extend([fa, fb])
                    elif kind == "thigh_cross":
                        th_h_f.extend([fa, fb])
                    else:
                        loc_h_f.extend([fa, fb])

                arm_l_f, th_l_f, loc_l_f = [], [], []
                for fa, fb in l_cross:
                    kind = classify_cross_pair(tc_rest_l, n0_l, fw_l, fa, fb)
                    if kind == "armpit_gap":
                        arm_l_f.extend([fa, fb])
                    elif kind == "thigh_cross":
                        th_l_f.extend([fa, fb])
                    else:
                        loc_l_f.extend([fa, fb])

                def faces_to_u_mask(hf: list[int], lf: list[int]) -> np.ndarray:
                    sh = high_tri[np.unique(hf)].ravel() if hf else np.array([], dtype=np.int64)
                    sl = red_faces[low_tri[np.unique(lf)].ravel()].ravel() if lf else np.array([], dtype=np.int64)
                    return np.isin(np.arange(len(h_mult)), high_weld[np.r_[sh, sl]]) & (~u_h_lock)

                armpit_u0 = faces_to_u_mask(arm_h_f, arm_l_f)
                thigh_u0 = faces_to_u_mask(th_h_f, th_l_f)
                loc_u0 = faces_to_u_mask(loc_h_f, loc_l_f)
                bad_u0 = faces_to_u_mask(h_bad.tolist(), l_bad.tolist())

                # 1) Armpit/arm-trunk clearance: smooth C-infinity diffused lateral X separation ONLY (ZERO Y/Z shrinkage, ZERO hinge tear!)
                u_pos = rest_u_h + u_del
                if np.any(armpit_u0):
                    step_ax = np.where(armpit_u0, 0.0016, 0.0)
                    for _ in range(5):
                        nbr_s = np.bincount(h_es, weights=h_wlen * step_ax[h_ed], minlength=len(h_mult)) / h_dlen
                        step_ax = np.where(u_h_lock | mid_u_h, 0.0, np.maximum(0.88 * step_ax, 0.65 * nbr_s))
                    dir_ax = np.tanh((arm_w_u_h - 0.45) / 0.14) * sgn_x_h
                    u_pos[:, 0] += step_ax * dir_ax

                # 2) Left-vs-right thigh/pelvic X=0 contact: push ONLY sagittal |X| outward gently without crushing wide septum triangles!
                if np.any(thigh_u0):
                    th_r1 = grow_rings(thigh_u0, 1)
                    th_lat = th_r1 & (~mid_u_h)
                    u_pos[mid_u_h, 0] = 0.0
                    if np.any(th_lat):
                        push_mm = np.where(thigh_u0[th_lat], 0.0014, 0.0007)
                        th_cap_x = np.maximum(np.abs(rest_u_h[th_lat, 0]) + 0.0060, 0.0095)
                        cur_ax = np.abs(u_pos[th_lat, 0])
                        next_ax = np.where(
                            cur_ax < th_cap_x,
                            np.minimum(cur_ax + push_mm, th_cap_x),
                            cur_ax,
                        )
                        u_pos[th_lat, 0] = sgn_x_h[th_lat] * np.maximum(next_ax, min_x_h[th_lat] + 0.0010)
                    th_halo = grow_rings(th_r1, 1) & (~mid_u_h)
                    if np.any(th_halo):
                        for _ in range(2):
                            nbr_x = np.bincount(h_es, weights=u_pos[h_ed, 0], minlength=len(h_mult)) / h_deg
                            u_pos[th_halo, 0] = 0.60 * u_pos[th_halo, 0] + 0.40 * nbr_x[th_halo]
                            viol_tx = th_halo & sep_u_h & (sgn_x_h * u_pos[:, 0] < min_x_h)
                            u_pos[viol_tx, 0] = sgn_x_h[viol_tx] * min_x_h[viol_tx]

                # 3) Exterior fold-overs & bad faces: strictly contraction-stable symmetric 3D arc-length surface + displacement untangling
                #    (NEVER negative Taubin inflation on an asymmetric stencil, which amplified folded triangles!)
                def nbr_sym_3d(arr: np.ndarray) -> np.ndarray:
                    return np.column_stack(
                        [np.bincount(h_es, weights=h_wlen * arr[h_ed, c], minlength=len(h_mult)) / h_dlen for c in range(3)]
                    )

                is_slender_lean_u0 = (adipose_gate < 0.999) and (float(muscle_gate) < 0.45)

                def clamp_x_invariants() -> None:
                    u_pos[mid_u_h, 0] = 0.0
                    eff_min_x = min_x_h * 0.25 if is_slender_lean_u0 else min_x_h
                    viol_x = sep_u_h & (sgn_x_h * u_pos[:, 0] < eff_min_x)
                    u_pos[viol_x, 0] = sgn_x_h[viol_x] * eff_min_x[viol_x]

                toe_loc_u0 = loc_u0 & (rest_u_h[:, 2] < 0.065)
                loc_non_toe_u0 = (loc_u0 & (~toe_loc_u0)) if is_slender_lean_u0 else loc_u0
                if is_slender_lean_u0 and np.any(toe_loc_u0):
                    # Spatial 42mm rigid-displacement harmonization across interdigital toe clefts (`preserving canonical 5-toe separation
                    # without shrinking thin toe cylinders or pulling crossing toes toward un-widened rest_u_h!`):
                    u_del_loc = u_pos - rest_u_h
                    for sgn_ft in (-1.0, 1.0):
                        m_seed = toe_loc_u0 & (sgn_ft * rest_u_h[:, 0] > 0.0)
                        if not np.any(m_seed):
                            continue
                        c_toe = rest_u_h[m_seed].mean(axis=0)
                        d_toe = np.linalg.norm(rest_u_h - c_toe[None, :], axis=1)
                        w_ref_ft = (d_toe >= 0.018) & (d_toe <= 0.062) & (rest_u_h[:, 2] >= 0.005) & (rest_u_h[:, 2] <= 0.060) & (sgn_ft * rest_u_h[:, 0] > 0.02)
                        mean_del = u_del_loc[w_ref_ft].mean(axis=0) if np.sum(w_ref_ft) >= 6 else u_del_loc[m_seed].mean(axis=0)
                        w_sp = smootherstep((0.044 - d_toe) / 0.018) * (1.0 - smootherstep((rest_u_h[:, 2] - 0.056) / 0.020)) * np.where(~u_h_lock, 1.0, 0.0)
                        idx_sp = np.flatnonzero(w_sp > 0.01)
                        if len(idx_sp):
                            u_del_loc[idx_sp] = (1.0 - 0.82 * w_sp[idx_sp, None]) * u_del_loc[idx_sp] + (0.82 * w_sp[idx_sp, None]) * mean_del[None, :]
                    u_pos = rest_u_h + u_del_loc
                    u_pos[mid_u_h, 0] = 0.0

                if is_slender_lean_u0 and np.any(bad_u0):
                    bad_r1 = grow_rings(bad_u0, 1)
                    bw_loc = np.where(bad_u0, 0.75, 0.35)[bad_r1, None]
                    for _ in range(8):
                        nbr_u = np.column_stack([np.bincount(h_es, weights=u_pos[h_ed, c], minlength=len(h_mult)) / h_deg_f for c in range(3)])
                        u_pos[bad_r1] += bw_loc * (nbr_u[bad_r1] - u_pos[bad_r1])
                        u_pos[mid_u_h, 0] = 0.0

                l_bad_wide = grow_rings(faces_to_u_mask([], l_bad.tolist()), 2) if len(l_bad) else np.zeros(len(h_mult), dtype=bool)
                ext_seed = (loc_non_toe_u0 | bad_u0 | l_bad_wide) & (~u_h_lock)
                if np.any(ext_seed):
                    ext_exact = (loc_non_toe_u0 | bad_u0 | l_bad_wide) & (~u_h_lock)
                    ext_r1 = grow_rings(ext_exact, 1)
                    ext_patch = grow_rings(ext_seed, 2)
                    if np.any(ext_patch):
                        tb_w = np.where(ext_exact, 1.0, np.where(ext_r1, 0.62, 0.28))
                        macro_up = smooth_vertex_vectors(vertex_normals(u_pos[high_weld], high_tri, high_weld), high_conn, 8)[first_h]
                        for _ in range(5 if step < 12 else 8):
                            nbr_pos = nbr_sym_3d(u_pos)
                            d_p = nbr_pos - u_pos
                            d_dot_p = np.einsum("ni,ni->n", d_p, macro_up)
                            d_pn = d_dot_p[:, None] * macro_up
                            d_pt = d_p - d_pn
                            n_gain = np.where(d_dot_p[:, None] > 0.0, 0.36, 0.22)
                            step_p = tb_w[:, None] * (0.44 * d_pt + n_gain * d_pn)
                            u_pos[ext_patch] += step_p[ext_patch]
                            clamp_x_invariants()

                        # Harmonic displacement untangling restores local injectivity on inverted triangles without global shrinkage
                        for _ in range(4 if step < 12 else 7):
                            u_cur_del = u_pos - rest_u_h
                            nbr_del = nbr_sym_3d(u_cur_del)
                            u_pos[ext_patch] += (0.40 * tb_w[ext_patch])[:, None] * (nbr_del[ext_patch] - u_cur_del[ext_patch])
                            clamp_x_invariants()

                # Surgical fallback after step 8: locally diffuse & relax displacement toward fold-free rest_u_h ONLY on stubborn defective vertices
                all_fail_u = (armpit_u0 | thigh_u0 | loc_non_toe_u0 | bad_u0 | l_bad_wide) & (~u_h_lock)
                if step >= 8 and np.any(all_fail_u):
                    pull_w = np.where(all_fail_u, 1.0, 0.0)
                    for _ in range(3):
                        pull_w = np.where(u_h_lock, 0.0, np.maximum(0.80 * pull_w, 0.62 * (np.bincount(h_es, weights=h_wlen * pull_w[h_ed], minlength=len(h_mult)) / h_dlen)))
                    alpha_pull = min(0.06 + 0.012 * (step - 8), 0.30)
                    u_cur_del2 = u_pos - rest_u_h
                    nbr_del2 = nbr_sym_3d(u_cur_del2)
                    tgt_del2 = 0.72 * nbr_del2 + 0.26 * u_cur_del2
                    u_pos = rest_u_h + (1.0 - (alpha_pull * pull_w)[:, None]) * u_cur_del2 + (alpha_pull * pull_w)[:, None] * tgt_del2
                    clamp_x_invariants()

                u_del = u_pos - rest_u_h
                delta_h = u_del[high_weld]
                delta_h[body_hard_pin] = 0.0

            if hd_cross or len(hd_bad):
                hd_fail = np.unique(np.r_[np.asarray(list(hd_cross), dtype=np.int64).ravel(), hd_bad])
                start_hd = np.unique(head_weld[head_tri[hd_fail].ravel()])
                near_hd = np.unique(welded_hd_faces[np.isin(welded_hd_faces, start_hd).any(axis=1)])
                u_hd = np.column_stack(
                    [np.bincount(head_weld, weights=delta_hd_step[:, a], minlength=len(hd_mult)) / hd_mult for a in range(3)]
                )
                hd_patch = np.isin(np.arange(len(hd_mult)), near_hd)
                for _ in range(2):
                    hd_patch |= np.isin(np.arange(len(hd_mult)), hd_ed[np.isin(hd_es, np.flatnonzero(hd_patch))])
                hd_patch &= ~u_hd_lock
                seam_u = head_weld[seam_head]
                hd_patch[seam_u] = False
                for _ in range(8):
                    avg = np.column_stack(
                        [np.bincount(hd_es, weights=u_hd[hd_ed, a], minlength=len(hd_mult)) / hd_deg for a in range(3)]
                    )
                    u_hd[hd_patch] = 0.30 * u_hd[hd_patch] + 0.70 * avg[hd_patch]
                delta_hd = u_hd[head_weld]
                delta_hd[head_hard_pin] = 0.0

        if best_state is not None and best_score != (0, 0):
            high_fit, low_fit, head_fit, h_bad, l_bad, hd_bad, h_cross, l_cross, hd_cross = best_state
        if eff_guarded_cache is not None:
            import json as _json
            eff_guarded_cache.parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(
                eff_guarded_cache,
                highFit=high_fit.astype(np.float32),
                lowFit=low_fit.astype(np.float32),
                headFit=head_fit.astype(np.float32),
                rollbackJson=np.array(_json.dumps(rollback)),
            )

    # Smooth 1st-order local affine diffeomorphism + exact canonical mirror pelvic symmetrization + hem-groove lift
    # across the bare groin/crotch saddle, unpinch Rest-A-pose anterior/central axilla + medial upper-arm taper + upper-lat roll,
    # and snap LOD1->LOD0 creases LAST so runtime LOD1 preserves 100% of both oblique back folds & pectoral underside:
    seam_low_saved = low_fit[seam_body].copy()
    lod0_seam_mask = body_hard_pin.copy()
    if "lod0" in interface:
        lod0_seam_mask[np.asarray(interface["lod0"], dtype=np.int64)] = True
    # Also lock any LOD0 vertex coincident (< 0.5 mm) with headSkin's collar seam so LOD0 + sub_head_fit stays 0.000mm watertight:
    d_h_seam = np.linalg.norm(rest_base_high[:, None, :] - rest_base_head[seam_head][None, :, :], axis=2)
    coinc_v, coinc_s = np.where(d_h_seam < 5e-4)
    lod0_seam_mask[coinc_v] = True

    ad_key = np.array([float(adipose_gate), float(muscle_gate), 20261121.12], dtype=np.float64)
    high_fit_clean = high_fit.copy()
    low_fit_clean = low_fit.copy()
    high_fit = _stage_cache_eval(
        "pelvis-lod0",
        _polish_lean_pelvis_mannequin_saddle_and_glutes if adipose_gate <= 0.05 else polish_pelvis_affine_diffeo,
        [rest_base_high, high_fit, donor_xyz if donor_xyz is not None else np.zeros(1), ad_key],
        lambda: polish_pelvis_affine_diffeo(
            rest_base_high,
            high_fit,
            high_tri,
            is_lod1=False,
            donor_xyz=donor_xyz,
            donor_tri=donor_tri,
            posed_base=posed_base_high,
            jac_body=jac_high,
            adipose_gate=adipose_gate,
            muscle_gate=muscle_gate,
        ),
    )
    high_fit = _stage_cache_eval(
        "axilla-lod0",
        polish_axilla_and_upper_lat,
        [rest_base_high, high_fit, lod0_seam_mask, donor_xyz if donor_xyz is not None else np.zeros(1), ad_key],
        lambda: polish_axilla_and_upper_lat(
            rest_base_high,
            high_fit,
            high_tri,
            seam_mask=lod0_seam_mask,
            is_lod1=False,
            arm_weight=body_arm_weight,
            pose_info=pose_info,
            donor_xyz=donor_xyz,
            donor_tri=donor_tri,
            posed_base=posed_base_high,
            jac_body=jac_high,
            adipose_gate=adipose_gate,
        ),
    )
    # On `adipose_gate >= 0.99` (`M050-F100`, where `polish_muscular_relief_to_donor` below does not run), restore `high_fit_clean`'s
    # exact `donorReg` volume across EXPOSED outer deltoids, upper-outer pectorals, and upper-outer scapulae/lats (`strictly OUTSIDE
    # the deep A-pose armpit slot!`) so axillary un-webbing never deflates exposed shoulders or proximal upper arms:
    if adipose_gate >= 0.99:
        rx_sh = np.abs(rest_base_high[:, 0])
        ry_sh = rest_base_high[:, 1]
        rz_sh = rest_base_high[:, 2]
        in_deep_ax = (
            smootherstep((rx_sh - 0.152) / 0.018)
            * (1.0 - smootherstep((rx_sh - 0.224) / 0.020))
            * smootherstep((rz_sh - 1.362) / 0.020)
            * (1.0 - smootherstep((rz_sh - 1.448) / 0.022))
            * (1.0 - smootherstep((np.abs(ry_sh) - 0.028) / 0.018))
        )
        # Include the full superior deltoid / acromion cap (`rz_sh` up to `1.712 m` for `|X| >= 0.115 m` on `2.032 m` `M050-F100`,
        # tapering down below the medial collar seam inside `|X| < 0.115 m`) with a smooth `20 mm` collar-seam guard:
        z_sh_hi = 1.615 + 0.098 * smootherstep((rx_sh - 0.105) / 0.035)
        seam_pts_sh = rest_base_high[lod0_seam_mask]
        if len(seam_pts_sh):
            d_seam_sh = np.min(np.linalg.norm(rest_base_high[:, None, :] - seam_pts_sh[None, :, :], axis=2), axis=1)
            w_seam_sh = smootherstep((d_seam_sh - 0.004) / 0.018)
        else:
            w_seam_sh = np.ones(len(rest_base_high), dtype=np.float64)
        w_exp_sh = (
            smootherstep((rx_sh - 0.072) / 0.024)
            * (1.0 - smootherstep((rx_sh - 0.382) / 0.035))
            * smootherstep((rz_sh - 1.285) / 0.030)
            * (1.0 - smootherstep((rz_sh - z_sh_hi) / 0.026))
            * (1.0 - in_deep_ax)
            * w_seam_sh
        )
        w_exp_sh[lod0_seam_mask] = 0.0
        d_sh_raw = (0.95 * w_exp_sh)[:, None] * (high_fit_clean - high_fit)
        # Also close the ~12-15 mm CG data-fade gap on exposed `M050-F100` superior/outer deltoid caps, upper-outer pecs, and
        # upper-outer scapulae directly against `+-X`-symmetrized `donor_xyz` (`excluding donor_bridged_axilla_faces`):
        if donor_xyz is not None and donor_tri is not None and posed_base_high is not None and jac_high is not None:
            fc_sh = donor_xyz[donor_tri].mean(axis=1)
            keep_sh_d = (fc_sh[:, 2] >= 1.24) & (fc_sh[:, 2] <= 1.735) & (np.abs(fc_sh[:, 0]) >= 0.05)
            if donor_bridged_axilla_faces is not None and len(donor_bridged_axilla_faces) == len(donor_tri):
                keep_sh_d &= ~np.asarray(donor_bridged_axilla_faces, dtype=bool)
            if int(np.sum(keep_sh_d)) >= 200:
                bvh_sh_d = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[keep_sh_d].tolist(), all_triangles=True)
                hf_tmp = high_fit + d_sh_raw
                posed_sh = posed_base_high + np.einsum("vij,vj->vi", jac_high, hf_tmp - rest_base_high)
                for vi_s in np.flatnonzero(w_exp_sh > 0.02):
                    ws_v = float(w_exp_sh[vi_s])
                    ps_v = posed_sh[vi_s]
                    sds_lr: list[float] = []
                    n_ref_s: np.ndarray | None = None
                    px_a_s = abs(float(ps_v[0]))
                    sgn_x_s = 1.0 if float(ps_v[0]) >= 0.0 else -1.0
                    for sx_s in (-1.0, 1.0):
                        qv_s = np.array([sx_s * px_a_s, float(ps_v[1]), float(ps_v[2])], dtype=np.float64)
                        dh_s, dn_s, _, dd_s = bvh_sh_d.find_nearest(Vector(qv_s.tolist()), 0.046)
                        if dh_s is not None and dd_s < 0.042:
                            na_q = np.asarray(dn_s, dtype=np.float64)
                            sd_q = float(np.dot(np.asarray(dh_s, dtype=np.float64) - qv_s, na_q))
                            if 0.0003 < sd_q < 0.038:
                                sds_lr.append(sd_q)
                                if n_ref_s is None:
                                    n_ref_s = np.array([sgn_x_s * sx_s * na_q[0], na_q[1], na_q[2]], dtype=np.float64)
                    if sds_lr and n_ref_s is not None:
                        sd_s = float(np.mean(sds_lr))
                        n_len_s = float(np.linalg.norm(n_ref_s))
                        if n_len_s > 1e-6:
                            na_s = n_ref_s / n_len_s
                            dp_p_s = (0.92 * ws_v * sd_s) * na_s
                            try:
                                dp_r_s = np.linalg.solve(jac_high[vi_s], dp_p_s)
                            except np.linalg.LinAlgError:
                                dp_r_s = dp_p_s
                            if float(np.linalg.norm(dp_r_s)) <= 0.040:
                                d_sh_raw[vi_s] += dp_r_s
        d_sh_u = np.column_stack([np.bincount(high_weld, weights=d_sh_raw[:, c], minlength=len(h_mult)) / h_mult for c in range(3)])
        sh_lock_u = np.isin(np.arange(len(h_mult)), high_weld[lod0_seam_mask])
        d_sh_u[sh_lock_u] = 0.0
        for _ in range(3):
            nbr_dsh = np.column_stack([np.bincount(h_es, weights=d_sh_u[h_ed, c], minlength=len(h_mult)) / h_deg for c in range(3)])
            d_sh_u = 0.68 * d_sh_u + 0.32 * nbr_dsh
            d_sh_u[sh_lock_u] = 0.0
        high_fit = high_fit + d_sh_u[high_weld]
        # Restore `M050-F100`'s exact `+-X`-symmetrized pendulous fatty pectoral mounds, curved `Z ~ 1.436 m` inframammary fold,
        # and subtle 3D nipple papilla directly from `donor_xyz` (`bidirectionally in Y, WITHOUT 12-pass Laplacian washout!`):
        if donor_xyz is not None and donor_tri is not None and posed_base_high is not None and jac_high is not None:
            fc_pc_d = donor_xyz[donor_tri].mean(axis=1)
            keep_pc_d = (fc_pc_d[:, 2] >= 1.28) & (fc_pc_d[:, 2] <= 1.60) & (np.abs(fc_pc_d[:, 0]) <= 0.23) & (fc_pc_d[:, 1] < -0.05)
            if donor_bridged_axilla_faces is not None and len(donor_bridged_axilla_faces) == len(donor_tri):
                keep_pc_d &= ~np.asarray(donor_bridged_axilla_faces, dtype=bool)
            if int(np.sum(keep_pc_d)) >= 200:
                bvh_pc_d = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[keep_pc_d].tolist(), all_triangles=True)
                nx_pc, nz_pc = 72, 92
                x_pc_g = np.linspace(0.0, 0.174, nx_pc)
                z_pc_g = np.linspace(1.320, 1.550, nz_pc)
                Y_pc_g = np.full((nx_pc, nz_pc), np.nan, dtype=np.float64)
                for ix_p, xq_p in enumerate(x_pc_g):
                    for iz_p, zq_p in enumerate(z_pc_g):
                        ys_lr_p = []
                        for sx_p in ((-1.0, 1.0) if xq_p > 1e-5 else (1.0,)):
                            rh_p, rn_p, _, _ = bvh_pc_d.ray_cast(Vector((sx_p * float(xq_p), -0.42, float(zq_p))), Vector((0.0, 1.0, 0.0)), 0.38)
                            if rh_p is not None and float(rh_p.y) < -0.110 and float(rn_p.y) < -0.18:
                                ys_lr_p.append(float(rh_p.y))
                        if ys_lr_p:
                            Y_pc_g[ix_p, iz_p] = float(np.mean(ys_lr_p))
                for ix_p in range(nx_pc):
                    ok_zp = np.isfinite(Y_pc_g[ix_p])
                    if np.any(ok_zp):
                        Y_pc_g[ix_p] = np.interp(z_pc_g, z_pc_g[ok_zp], Y_pc_g[ix_p, ok_zp])
                for iz_p in range(nz_pc):
                    ok_xp = np.isfinite(Y_pc_g[:, iz_p])
                    if np.any(ok_xp):
                        Y_pc_g[:, iz_p] = np.interp(x_pc_g, x_pc_g[ok_xp], Y_pc_g[ok_xp, iz_p])
                if np.all(np.isfinite(Y_pc_g)):
                    # Light 2-pass de-faceting preserves 100% of the pendulous pectoral belly & curved `Z = 1.436 m` inframammary crease
                    # (`3D nipple/areola landmark correspondence runs after chest fitting via `_align_canonical_nipples_to_donor` — zero hardcoded (X, Z) bumps!`):
                    for _ in range(2):
                        yx_p = Y_pc_g.copy()
                        yx_p[0, :] = 0.50 * Y_pc_g[0, :] + 0.50 * Y_pc_g[1, :]
                        yx_p[1:-1, :] = 0.20 * Y_pc_g[:-2, :] + 0.60 * Y_pc_g[1:-1, :] + 0.20 * Y_pc_g[2:, :]
                        yz_p = yx_p.copy()
                        yz_p[:, 1:-1] = 0.20 * yx_p[:, :-2] + 0.60 * yx_p[:, 1:-1] + 0.20 * yx_p[:, 2:]
                        Y_pc_g = yz_p
                    dx_pc = float(x_pc_g[1] - x_pc_g[0])
                    dz_pc = float(z_pc_g[1] - z_pc_g[0])
                    hf_u = np.column_stack([np.bincount(high_weld, weights=high_fit[:, c], minlength=len(h_mult)) / h_mult for c in range(3)])
                    h_first_pc = np.zeros(len(h_mult), dtype=np.int64)
                    h_first_pc[high_weld[::-1]] = np.arange(len(high_weld) - 1, -1, -1)
                    ru_h_pc = rest_base_high[h_first_pc]
                    mid_pc_u = np.abs(ru_h_pc[:, 0]) < 2.5e-4
                    jac_h_u = jac_high[h_first_pc]
                    posed_base_h_u = posed_base_high[h_first_pc]
                    pc_touched = np.zeros(len(h_mult), dtype=bool)
                    for _it_pc in range(2):
                        posed_pc_u = posed_base_h_u + np.einsum("vij,vj->vi", jac_h_u, hf_u - ru_h_pc)
                        px_pc_u = np.abs(posed_pc_u[:, 0])
                        pz_pc_u = posed_pc_u[:, 2]
                        py_pc_u = posed_pc_u[:, 1]
                        x_pc_max = 0.168 - 0.010 * smootherstep((pz_pc_u - 1.475) / 0.040)
                        w_pc_u = (
                            (1.0 - smootherstep((px_pc_u - x_pc_max) / 0.018))
                            * smootherstep((pz_pc_u - 1.332) / 0.022)
                            * (1.0 - smootherstep((pz_pc_u - 1.536) / 0.024))
                            * smootherstep((-py_pc_u - 0.125) / 0.032)
                        )
                        w_pc_u[sh_lock_u] = 0.0
                        for ui_p in np.flatnonzero(w_pc_u > 0.005):
                            fx_p = float(np.clip(px_pc_u[ui_p] / dx_pc, 0.0, float(nx_pc - 1) - 1e-6))
                            fz_p = float(np.clip((pz_pc_u[ui_p] - float(z_pc_g[0])) / dz_pc, 0.0, float(nz_pc - 1) - 1e-6))
                            ix0_p, iz0_p = int(fx_p), int(fz_p)
                            tx_p, tz_p = fx_p - ix0_p, fz_p - iz0_p
                            yt_p = (
                                (1.0 - tx_p) * ((1.0 - tz_p) * Y_pc_g[ix0_p, iz0_p] + tz_p * Y_pc_g[ix0_p, iz0_p + 1])
                                + tx_p * ((1.0 - tz_p) * Y_pc_g[ix0_p + 1, iz0_p] + tz_p * Y_pc_g[ix0_p + 1, iz0_p + 1])
                            )
                            dy_pc = (0.88 * float(w_pc_u[ui_p])) * float(yt_p - py_pc_u[ui_p])
                            if abs(dy_pc) > 1e-5:
                                try:
                                    dp_pc_r = np.linalg.solve(jac_h_u[ui_p], np.array([0.0, dy_pc, 0.0], dtype=np.float64))
                                except np.linalg.LinAlgError:
                                    dp_pc_r = np.array([0.0, dy_pc, 0.0], dtype=np.float64)
                                if float(np.linalg.norm(dp_pc_r)) <= 0.045:
                                    hf_u[ui_p] += dp_pc_r
                                    pc_touched[ui_p] = True
                        hf_u[mid_pc_u, 0] = 0.0
                    pc_idx_u = np.flatnonzero(pc_touched)
                    if len(pc_idx_u):
                        for _ in range(2):
                            nrm_pc = vertex_normals(hf_u[high_weld], high_tri, high_weld)[h_first_pc][pc_idx_u]
                            nbr_pc = np.column_stack([np.bincount(h_es, weights=hf_u[h_ed, c], minlength=len(h_mult)) / h_deg for c in range(3)])
                            dp_pc_t = nbr_pc[pc_idx_u] - hf_u[pc_idx_u]
                            dp_pc_t -= np.einsum("ni,ni->n", dp_pc_t, nrm_pc)[:, None] * nrm_pc
                            hf_u[pc_idx_u] += 0.22 * dp_pc_t
                            hf_u[mid_pc_u, 0] = 0.0
                    high_fit = hf_u[high_weld]
    if adipose_gate < 0.99 and donor_xyz is not None and donor_tri is not None and posed_base_high is not None and jac_high is not None:
        high_fit = _stage_cache_eval(
            "muscle-relief-lod0",
            polish_muscular_relief_to_donor,
            [rest_base_high, high_fit, donor_xyz, ad_key],
            lambda: polish_muscular_relief_to_donor(
                rest_base_high,
                high_fit,
                high_tri,
                seam_mask=body_hard_pin,
                obs_gain=body_obs_gain,
                cleft_inferred=body_cleft_inferred,
                arm_weight=body_arm_weight,
                donor_xyz=donor_xyz,
                donor_tri=donor_tri,
                donor_eligible_faces=donor_eligible_faces,
                donor_bridged_axilla_faces=donor_bridged_axilla_faces,
                donor_bridged_thigh_faces=donor_bridged_thigh_faces,
                posed_base=posed_base_high,
                jac_body=jac_high,
                finger_topo=finger_topo_lod0,
                adipose_gate=adipose_gate,
                muscle_gate=muscle_gate,
            ),
        )
    nipple_align_info: dict | None = None
    if donor_xyz is not None and donor_tri is not None and posed_base_high is not None and jac_high is not None:
        high_fit, nipple_align_info = _align_and_sculpt_canonical_nipples_lod0(
            rest_base_high,
            high_fit,
            high_tri,
            rest_base_low,
            low_tri,
            seam_mask=lod0_seam_mask,
            donor_xyz=donor_xyz,
            donor_tri=donor_tri,
            donor_rgb=donor_rgb,
            donor_bridged_axilla_faces=donor_bridged_axilla_faces,
            posed_base_high=posed_base_high,
            jac_high=jac_high,
            pose_info=pose_info,
            coordinate_id=coordinate_id,
            study_dir=study_dir,
        )
    # ZERO 3D world-space pins! Only 1D plantar floor Z >= 0.0 (with plantar contact Z = rest_z; X and Y 100% free!)
    _ = body_sole_toe_pin
    eff_post_pin = np.zeros(len(rest_base_high), dtype=bool)
    plantar_lod0 = rest_base_high[:, 2] <= 0.0045
    plantar_lod1 = rest_base_low[:, 2] <= 0.0045
    hand_finger_stats: dict = {"cached": True}
    if finger_topo_lod0 is not None:
        finger_meas_pts = high_fit if adipose_gate <= 0.02 else rest_fit_high_raw

        def _eval_fingers():
            nonlocal hand_finger_stats
            pts_f, st_f = thicken_canonical_five_fingers(
                rest_base_high,
                high_fit,
                high_tri,
                finger_topo_lod0,
                hard_lock_mask=lod0_seam_mask,
                adipose_gate=adipose_gate,
                raw_fit_pts=finger_meas_pts,
                muscle_gate=muscle_gate,
            )
            hand_finger_stats = st_f
            return pts_f

        high_fit = _stage_cache_eval(
            "fingers-lod0",
            thicken_canonical_five_fingers,
            [rest_base_high, high_fit[rest_base_high[:, 2] < 1.50], finger_meas_pts[rest_base_high[:, 2] < 1.50], ad_key, np.array([float(muscle_gate)])],
            _eval_fingers,
        )
    # On super-heavyweight strongman corner (`M100-F100`: `adipose_gate > 0.80` and `muscle_gate > 0.75`), reinforce rounded
    # lateral/anterior/posterior deltoid caps + bicep/tricep/brachioradialis arm girth (`matching `c22` & `M100-F100-raised-arms-ref`
    # while keeping named cross-sections within ~1% of `donorRigid`):
    if float(adipose_gate) > 0.80 and float(muscle_gate) > 0.75:
        sm_str = float(np.clip((float(muscle_gate) - 0.75) / 0.25, 0.0, 1.0)) * float(np.clip(adipose_gate, 0.0, 1.0))
        rx_s0, ry_s0, rz_s0 = rest_base_high.T
        ax_s0 = np.abs(rx_s0)
        arm_w_s0 = body_arm_weight if body_arm_weight is not None else smootherstep((ax_s0 - 0.195) / 0.045)
        vn_s0 = vertex_normals(high_fit, high_tri, high_weld)
        w_delt_s0 = (
            smootherstep((ax_s0 - 0.165) / 0.032)
            * (1.0 - smootherstep((ax_s0 - 0.295) / 0.045))
            * smootherstep((rz_s0 - 1.485) / 0.038)
            * (1.0 - smootherstep((rz_s0 - 1.655) / 0.032))
            * smootherstep((arm_w_s0 - 0.18) / 0.28)
            * smootherstep((np.sign(rx_s0) * vn_s0[:, 0] + 0.15) / 0.45)
        )
        w_uarm_s0 = (
            smootherstep((ax_s0 - 0.245) / 0.042)
            * (1.0 - smootherstep((ax_s0 - 0.395) / 0.055))
            * smootherstep((arm_w_s0 - 0.55) / 0.25)
            * (1.0 - smootherstep((rz_s0 - 1.620) / 0.040))
        )
        w_farm_s0 = (
            smootherstep((ax_s0 - 0.375) / 0.045)
            * (1.0 - smootherstep((ax_s0 - 0.485) / 0.045))
            * smootherstep((arm_w_s0 - 0.75) / 0.20)
        )
        rad_push_s0 = sm_str * (0.0020 * w_delt_s0 + 0.0024 * w_uarm_s0 + 0.0012 * w_farm_s0)
        rad_push_s0[lod0_seam_mask] = 0.0
        high_fit = high_fit + rad_push_s0[:, None] * vn_s0

    # Jointly polish LOD0 neck + headSkin full skull/temples/cheeks/jowls/submental/nape + rigid ear follow across the welded collar seam!
    high_fit, head_fit = polish_head_and_neck_fullness(
        rest_base_high,
        high_fit,
        high_tri,
        rest_base_head,
        head_fit,
        head_tri,
        head_hard_pin,
        seam_head,
        coinc_v,
        coinc_s,
        donor_xyz=donor_xyz,
        donor_tri=donor_tri,
        head_feature_masks=head_feature_masks,
        adipose_gate=adipose_gate,
        posed_base_high=posed_base_high,
        jac_high=jac_high,
        posed_base_head=posed_base_head,
        jac_head=jac_head,
        muscle_gate=muscle_gate,
    )
    if adipose_gate < 0.999:
        high_fit = couple_canonical_five_toes_to_forefoot(
            rest_base_high, high_fit, adipose_gate=adipose_gate, muscle_gate=muscle_gate
        )
        high_fit[:, 2] = np.maximum(high_fit[:, 2], 0.0)
        high_fit[plantar_lod0, 2] = rest_base_high[plantar_lod0, 2]
    resolved_sex = _infer_canonical_sex(rest_base_high) if sex == "auto" else sex.lower()
    if resolved_sex == "male":
        high_fit = sculpt_male_anterior_pelvic_mound(
            rest_base_high,
            high_fit,
            high_tri,
            donor_xyz=donor_xyz,
            donor_tri=donor_tri,
            donor_bridged_thigh_faces=donor_bridged_thigh_faces,
            donor_linen_faces=donor_linen_faces,
            donor_linen_rim_faces=donor_linen_rim_faces,
            posed_base=posed_base_high,
            jac_body=jac_high,
            adipose_gate=adipose_gate,
            muscle_gate=muscle_gate,
        )
    if len(coinc_v):
        high_fit[coinc_v] = head_fit[seam_head[coinc_s]]
    high_fit = high_fit.astype(np.float32).astype(np.float64)
    body_hard_pin = eff_post_pin

    # Guarantee 0 bad faces & 0 new self-intersections on LOD0 after post-polish (untangle locally FIRST before any fallback to high_fit_clean!):
    first_h_guard = np.zeros(len(h_mult), dtype=np.int64)
    first_h_guard[high_weld[::-1]] = np.arange(len(high_weld) - 1, -1, -1)
    h_u_pts = np.column_stack([np.bincount(high_weld, weights=high_fit[:, c], minlength=len(h_mult)) / h_mult for c in range(3)])
    # Lock ONLY the collar seam in 3D; midline vertices constrain ONLY X=0 (1D symmetry invariant — Y and Z stay 100% free to untangle!)
    h_lock_u = np.isin(np.arange(len(h_mult)), high_weld[lod0_seam_mask | body_hard_pin])
    mid_guard_u = np.abs(rest_base_high[first_h_guard, 0]) < 2.5e-4
    for _u_it in range(28):
        chk_h = h_u_pts[high_weld].copy()
        chk_h[body_hard_pin] = rest_base_high[body_hard_pin]
        if len(coinc_v):
            chk_h[coinc_v] = head_fit[seam_head[coinc_s]]
        chk_h = chk_h.astype(np.float32).astype(np.float64)
        h_cross_u = self_intersections(chk_h, high_tri, high_weld) - high_before
        h_bad_u = np.flatnonzero(bad_faces(chk_h, high_tri, high_areas, high_conn))
        if not h_cross_u and not len(h_bad_u):
            high_fit = chk_h
            break
        ff_hu = set(h_bad_u.tolist())
        for a, b in h_cross_u:
            ff_hu.add(a)
            ff_hu.add(b)
        fail_hu_v = np.unique(high_weld[high_tri[list(ff_hu)].ravel()])
        pat_h = np.zeros(len(h_mult), dtype=np.float64)
        pat_h[fail_hu_v] = 1.0
        for _ in range(4):
            pat_h = np.maximum(pat_h * 0.78, np.bincount(h_es, weights=pat_h[h_ed], minlength=len(h_mult)) / h_deg)
        pat_h[h_lock_u] = 0.0
        if resolved_sex == "male" and adipose_gate > 0.80 and muscle_gate < 0.10:
            dome_u_lk = (np.abs(h_u_pts[:, 0]) <= 0.038) & (h_u_pts[:, 1] < -0.180) & (h_u_pts[:, 2] >= 0.900) & (~np.isin(np.arange(len(h_mult)), fail_hu_v))
            pat_h[dome_u_lk] = 0.0
        for _ in range(8):
            nbr_hu = np.column_stack([np.bincount(h_es, weights=h_u_pts[h_ed, c], minlength=len(h_mult)) / h_deg for c in range(3)])
            h_u_pts += (0.50 * pat_h)[:, None] * (nbr_hu - h_u_pts)
            h_u_pts[mid_guard_u, 0] = 0.0
        high_fit = h_u_pts[high_weld].copy()
        high_fit[body_hard_pin] = rest_base_high[body_hard_pin]
        if len(coinc_v):
            high_fit[coinc_v] = head_fit[seam_head[coinc_s]]
        high_fit = high_fit.astype(np.float32).astype(np.float64)

    for _ in range(16):
        h_cross_chk = self_intersections(high_fit, high_tri, high_weld) - high_before
        h_bad_chk = np.flatnonzero(bad_faces(high_fit, high_tri, high_areas, high_conn))
        if not h_cross_chk and not len(h_bad_chk):
            break
        fail_h_f = set(h_bad_chk.tolist())
        for a, b in h_cross_chk:
            fail_h_f.add(a)
            fail_h_f.add(b)
        fail_h_u2 = np.unique(high_weld[high_tri[list(fail_h_f)].ravel()])
        att_h = np.zeros(len(h_mult), dtype=np.float64)
        att_h[fail_h_u2] = 1.0
        for _ in range(3):
            att_h = np.maximum(att_h * 0.78, np.bincount(h_es, weights=att_h[h_ed], minlength=len(h_mult)) / h_deg)
        att_h[high_weld[lod0_seam_mask]] = 0.0
        if resolved_sex == "male" and adipose_gate > 0.80 and muscle_gate < 0.10:
            dome_v_lk = (np.abs(high_fit[:, 0]) <= 0.038) & (high_fit[:, 1] < -0.180) & (high_fit[:, 2] >= 0.900) & (~np.isin(high_weld, fail_h_u2))
            w_rel_h = (0.42 * np.clip(att_h[high_weld], 0.0, 1.0))[:, None]
            w_rel_h[dome_v_lk] = 0.0
        else:
            w_rel_h = (0.42 * np.clip(att_h[high_weld], 0.0, 1.0))[:, None]
        high_fit = ((1.0 - w_rel_h) * high_fit + w_rel_h * high_fit_clean).astype(np.float32).astype(np.float64)

    mapped_p = np.einsum("ni,nij->nj", map_weights, (high_fit - rest_base_high)[red_faces])
    for grp in unique_alias_groups:
        mapped_p[grp] = mapped_p[grp].mean(axis=0)
    low_fit_p = (rest_base_low + mapped_p).astype(np.float32).astype(np.float64)
    seam_low_saved = low_fit_p[seam_body].copy()
    head_fit = polish_head_and_neck_seam(
        rest_base_head,
        head_fit,
        head_tri,
        head_hard_pin,
        seam_head,
        seam_low_saved,
    )
    hd_cross = self_intersections(head_fit, head_tri, head_weld) - head_before
    hd_bad = np.flatnonzero(bad_faces(head_fit, head_tri, head_areas, head_conn))
    low_below_neck = rest_base_low[:, 2] < 1.56
    high_below_neck = rest_base_high[:, 2] < 1.56
    sex_key = np.array([1.0 if resolved_sex == "male" else 0.0], dtype=np.float64)
    # Keep `pelvis-lod1` active across all builds (`so lateral hip crests at |X| > 0.14 m stay 0.0 mm flush with Donor!`),
    # while `w_pel_full_m1` below transfers `high_fit`'s central/groin/glute sculpt inside `|X| <= 0.135 m`:
    low_fit_pol = _stage_cache_eval(
        "pelvis-lod1",
        polish_pelvis_affine_diffeo,
        [rest_base_low[low_below_neck], low_fit_p[low_below_neck], high_fit[high_below_neck], ad_key, sex_key],
        lambda: polish_pelvis_affine_diffeo(
            rest_base_low,
            low_fit_p,
            low_tri,
            is_lod1=True,
            high_fit_ref=high_fit,
            high_tri_ref=high_tri,
            adipose_gate=adipose_gate,
            sex=resolved_sex,
        ),
    )
    low_fit_pol[seam_body] = seam_low_saved
    low_seam_mask = np.zeros(len(rest_base_low), dtype=bool)
    low_seam_mask[seam_body] = True
    low_arm_weight = (
        np.einsum("ni,ni->n", map_weights, body_arm_weight[red_faces]) if body_arm_weight is not None else None
    )
    if adipose_gate <= 0.05 or adipose_gate >= 0.99:
        # `high_fit` already ran axillary fairing + exposed-deltoid/upper-arm `donorReg` restoration;
        # re-smoothing `LOD1` a second time shrinks `outerDeltoidSpan` and proximal `upperArm`.
        low_fit_ax = low_fit_pol.copy()
    else:
        low_fit_ax = _stage_cache_eval(
            "axilla-lod1",
            polish_axilla_and_upper_lat,
            [rest_base_low[low_below_neck], low_fit_pol[low_below_neck], low_seam_mask, ad_key],
            lambda: polish_axilla_and_upper_lat(
                rest_base_low,
                low_fit_pol,
                low_tri,
                seam_mask=low_seam_mask,
                is_lod1=True,
                alias_groups=unique_alias_groups,
                arm_weight=low_arm_weight,
                pose_info=pose_info,
                adipose_gate=adipose_gate,
            ),
        )
    low_fit_ax[seam_body] = seam_low_saved
    low_fit = _stage_cache_eval(
        "creases-lod1",
        project_lod1_creases_onto_lod0,
        [rest_base_low, low_fit_ax, high_fit, ad_key],
        lambda: project_lod1_creases_onto_lod0(
            rest_base_low, low_fit_ax, low_tri, high_fit, high_tri, seam_body, interface, adipose_gate=adipose_gate, muscle_gate=muscle_gate
        ),
    )
    if adipose_gate >= 0.999:
        low_fit = couple_canonical_five_toes_to_forefoot(rest_base_low, low_fit)
    if nipple_align_info is not None:
        hbvh_nip_l1 = BVHTree.FromPolygons(high_fit.tolist(), high_tri.tolist(), all_triangles=True)
        vl1_p = int(nipple_align_info["vLod1Pos"])
        vl1_n = int(nipple_align_info["vLod1Neg"])
        vl0_p = int(nipple_align_info["vLod0Pos"])
        vl0_n = int(nipple_align_info["vLod0Neg"])
        mapped_nip_cur = np.einsum("ni,nij->nj", map_weights, (high_fit - rest_base_high)[red_faces])
        for grp in unique_alias_groups:
            mapped_nip_cur[grp] = mapped_nip_cur[grp].mean(axis=0)
        bary_nip_l1 = rest_base_low + mapped_nip_cur
        # Sync the anterior pectoral nipple halo onto `high_fit` (`strictly above creases-lod1's curved inframammary fold on F>0`)
        # and preserve a crisp `~1.65 mm` LOD1 cone bud at the shared canonical nipple landmark:
        d_nip_r = np.minimum(
            np.linalg.norm(rest_base_low - rest_base_low[vl1_p][None, :], axis=1),
            np.linalg.norm(rest_base_low - rest_base_low[vl1_n][None, :], axis=1),
        )
        if adipose_gate > 0.20:
            w_nip_l1 = (
                (1.0 - smootherstep((d_nip_r - 0.032) / 0.018))
                * smootherstep((rest_base_low[:, 2] - 1.448) / 0.010)
                * np.where(~low_seam_mask, 1.0, 0.0)
            )
        else:
            w_pec_sync = (
                (1.0 - smootherstep((np.abs(rest_base_low[:, 0]) - 0.185) / 0.025))
                * smootherstep((rest_base_low[:, 2] - 1.355) / 0.018)
                * (1.0 - smootherstep((rest_base_low[:, 2] - 1.605) / 0.024))
                * smootherstep((-rest_base_low[:, 1] - 0.055) / 0.025)
            )
            w_nip_l1 = np.maximum(1.0 - smootherstep((d_nip_r - 0.036) / 0.024), w_pec_sync) * np.where(~low_seam_mask, 1.0, 0.0)
        for vn_i in np.flatnonzero(w_nip_l1 > 0.01):
            wn_v = float(w_nip_l1[vn_i])
            p_nb = bary_nip_l1[vn_i].copy()
            hn_b, _, _, dn_b = hbvh_nip_l1.find_nearest(Vector(p_nb.tolist()), 0.018)
            if hn_b is not None and dn_b < 0.015:
                p_nb = np.asarray(hn_b, dtype=np.float64)
            low_fit[vn_i] = (1.0 - wn_v) * low_fit[vn_i] + wn_v * p_nb
        l_w_n, (l_es_n, l_ed_n), _, _ = low_conn
        for vl1_c, vl0_c in ((vl1_p, vl0_p), (vl1_n, vl0_n)):
            u_c_n = int(l_w_n[vl1_c])
            nb_u_n = l_ed_n[l_es_n == u_c_n]
            nb_v_n = [int(np.flatnonzero(l_w_n == int(u_nb))[0]) for u_nb in nb_u_n if int(u_nb) != u_c_n]
            if nb_v_n:
                p_ring = low_fit[nb_v_n].mean(axis=0)
                p_apex = high_fit[vl0_c]
                # Keep X/Z dead-on `high_fit[vl0_c]` and `~1.65 mm` outward papilla height on the coarse 19 mm LOD1 triangle fan:
                low_fit[vl1_c] = p_ring + 0.58 * (p_apex - p_ring)
                low_fit[vl1_c, 0] = float(p_apex[0])
                low_fit[vl1_c, 2] = float(p_apex[2])
        low_fit[vl1_p, 0] = 0.5 * (low_fit[vl1_p, 0] - low_fit[vl1_n, 0])
        low_fit[vl1_n, 0] = -low_fit[vl1_p, 0]
        low_fit[vl1_p, 1] = low_fit[vl1_n, 1] = 0.5 * (low_fit[vl1_p, 1] + low_fit[vl1_n, 1])
        low_fit[vl1_p, 2] = low_fit[vl1_n, 2] = 0.5 * (low_fit[vl1_p, 2] + low_fit[vl1_n, 2])
    if resolved_sex == "male":
        # Preserve `high_fit`'s exact Donor-anchored male anterior pouch & full perineal crotch-base arch on runtime `LOD1`
        # (`overriding any legacy 0.946m saddle floor inside cached `pelvis-lod1` while keeping inner thighs/glutes untouched!`):
        hbvh_m_l1 = BVHTree.FromPolygons(high_fit.tolist(), high_tri.tolist(), all_triangles=True)
        rl_x_a = np.abs(rest_base_low[:, 0])
        rl_z = rest_base_low[:, 2]
        rl_y = rest_base_low[:, 1]
        s_sad_l1 = smootherstep((rl_y + (0.055 - 0.028 * adipose_gate)) / 0.035)
        slender_gap_l1 = max(0.0, 1.0 - float(muscle_gate)) * max(0.0, 1.0 - float(adipose_gate))
        if adipose_gate > 0.20:
            s_ant_th_l1 = smootherstep((-rl_y - 0.035) / 0.030)
            x_lim_l1 = (1.0 - s_sad_l1 * (1.0 - s_ant_th_l1)) * (0.165 + 0.105 * adipose_gate) + (s_sad_l1 * (1.0 - s_ant_th_l1)) * (0.048 + 0.036 * adipose_gate)
            z_bot_l1 = (0.990 - 0.155 * adipose_gate) + 0.035 * adipose_gate * (np.clip(rl_x_a / 0.175, 0.0, 1.0) ** 1.6)
        else:
            x_lim_l1 = (1.0 - s_sad_l1) * (0.158 + 0.095 * adipose_gate) + s_sad_l1 * (0.045 + 0.020 * slender_gap_l1 + 0.068 * adipose_gate)
            w_lat_hem_l1 = adipose_gate * smootherstep((rl_x_a - 0.048) / 0.022)
            z_bot_lean = 0.922 + 0.055 * smootherstep((rl_x_a - 0.048) / 0.024)
            z_bot_l1 = (1.0 - w_lat_hem_l1) * z_bot_lean + w_lat_hem_l1 * (0.918 + 0.095 * (np.clip(rl_x_a / 0.155, 0.0, 1.0) ** 1.5))
        slender_ab_ext_l1 = 0.072 * slender_gap_l1
        z_top_l1 = np.where(
            rl_y > 0.010,
            1.238,
            (1.168 + slender_ab_ext_l1 - 0.104 * adipose_gate) + (0.042 + 0.048 * adipose_gate) * (np.clip(rl_x_a / 0.145, 0.0, 1.0) ** 2),
        )
        y_back_l1_lim = 0.225
        w_ant_m1 = (
            (1.0 - smootherstep((rl_x_a - x_lim_l1) / 0.022))
            * smootherstep((rl_z - z_bot_l1) / 0.018)
            * (1.0 - smootherstep((rl_z - z_top_l1) / (0.020 + 0.008 * adipose_gate)))
            * (1.0 - smootherstep((rl_y - y_back_l1_lim) / 0.024))
        )
        # On `F > 0` (`M050-F100`), also project `high_fit`'s restored Donor posterior glute domes, sunken umbilicus, and oblique
        # thoracolumbar back rolls onto runtime `LOD1` (`so Fit LOD1 Clay Col 6 shows crisp 3D navel & back rolls!`):
        if adipose_gate > 0.20:
            w_gl_m1 = (
                adipose_gate
                * (1.0 - smootherstep((rl_x_a - 0.172) / 0.028))
                * smootherstep((rl_z - 0.840) / 0.036)
                * (1.0 - smootherstep((rl_z - 1.158) / 0.028))
                * smootherstep((rl_y - 0.008) / 0.036)
            )
            w_nav_m1 = (
                adipose_gate
                * (1.0 - smootherstep((rl_x_a - 0.040) / 0.018))
                * smootherstep((rl_z - 1.135) / 0.024)
                * (1.0 - smootherstep((rl_z - 1.235) / 0.024))
                * smootherstep((-rl_y - 0.085) / 0.025)
            )
            w_bk_m1 = (
                adipose_gate
                * smootherstep((rl_x_a - 0.015) / 0.020)
                * (1.0 - smootherstep((rl_x_a - 0.365) / 0.035))
                * smootherstep((rl_z - 1.190) / 0.032)
                * (1.0 - smootherstep((rl_z - 1.605) / 0.030))
            )
            z_pel_m1_lo = 0.650 if (adipose_gate > 0.80 and abs(float(muscle_gate) - 0.50) > 0.10) else 0.790
            w_pel_full_m1 = (
                adipose_gate
                * (1.0 - smootherstep((rl_x_a - 0.168) / 0.024))
                * smootherstep((rl_z - z_pel_m1_lo) / 0.025)
                * (1.0 - smootherstep((rl_z - 1.158) / 0.025))
            )
            # Do NOT overwrite `project_lod1_creases_onto_lod0`'s snapped curved inframammary crease (`Z ~ 1.436 m`) with linear
            # `bary_from_high` — `low_fit_p -> creases-lod1` already carries `high_fit`'s restored fatty pectorals AND snaps `LOD1`
            # rows into the curved inframammary fold!
            w_ant_m1 = np.maximum(w_pel_full_m1, np.maximum(np.maximum(w_ant_m1, w_gl_m1), np.maximum(w_nav_m1, w_bk_m1)))
        elif slender_gap_l1 > 0.20:
            # Project `high_fit`'s restored Donor upper-medial-thigh adductor, anterior sub-groin (`pectineus`), and posterior
            # lower-inner gluteal contours (`up to rl_z = 1.115 m, rl_y <= 0.168 m` on the back!) onto runtime `LOD1` so
            # `M000-F000` has ZERO keyhole scoop, ZERO blue sub-groin pockets, and ZERO -40 mm recessed lower-inner glute pockets:
            z_top_med1 = np.where(rl_y > 0.012, 1.112, 1.028)
            y_lim_med1 = np.where(rl_y > 0.0, 0.168, 0.118)
            w_med_th_m1 = (
                slender_gap_l1
                * np.where(rl_x_a > 2.5e-4, 1.0, 0.0)
                * (1.0 - smootherstep((rl_x_a - 0.122) / 0.026))
                * smootherstep((rl_z - 0.820) / 0.024)
                * (1.0 - smootherstep((rl_z - z_top_med1) / 0.024))
                * (1.0 - smootherstep((np.abs(rl_y) - y_lim_med1) / 0.028))
            )
            w_ant_m1 = np.maximum(w_ant_m1, w_med_th_m1)
        elif muscle_gate > 0.5:
            # Also project `M100-F000`'s restored upper-medial adductor & posterior sub-gluteal fullness (`rl_z = 0.865..1.035 m`) onto `LOD1`:
            w_mus_sub_m1 = (
                float(np.clip((muscle_gate - 0.5) * 2.0, 0.0, 1.0))
                * (1.0 - smootherstep((rl_x_a - 0.095) / 0.025))
                * smootherstep((rl_z - 0.865) / 0.024)
                * (1.0 - smootherstep((rl_z - 1.036) / 0.022))
                * (1.0 - smootherstep((np.abs(rl_y) - 0.125) / 0.028))
            )
            w_ant_m1 = np.maximum(w_ant_m1, w_mus_sub_m1)
        m1_v = np.flatnonzero(w_ant_m1 > 0.005)
        low_bary_post_sculpt = low_fit_p.copy()
        if len(m1_v):
            # Evaluate exact shared barycentric mapping from updated `high_fit` FIRST (`never starting from stale cached 0.946m `low_fit_p`!`):
            mapped_m_cur = np.einsum("ni,nij->nj", map_weights, (high_fit - rest_base_high)[red_faces])
            for grp in unique_alias_groups:
                mapped_m_cur[grp] = mapped_m_cur[grp].mean(axis=0)
            bary_from_high = rest_base_low + mapped_m_cur
            low_bary_post_sculpt[m1_v] = (1.0 - w_ant_m1[m1_v, None]) * low_fit_p[m1_v] + w_ant_m1[m1_v, None] * bary_from_high[m1_v]
            for vi_m in m1_v:
                wm_v = float(w_ant_m1[vi_m])
                p_bary = bary_from_high[vi_m].copy()
                is_ext_f_m1 = (adipose_gate > 0.80) and (abs(float(muscle_gate) - 0.50) > 0.10)
                in_f_cup_l1 = (adipose_gate > 0.20) and (rl_x_a[vi_m] <= 0.168) and (0.885 <= rl_z[vi_m] <= 1.168) and (rl_y[vi_m] < 0.045)
                in_ext_mth_l1 = is_ext_f_m1 and (0.004 <= rl_x_a[vi_m] <= 0.072) and (0.680 <= rl_z[vi_m] <= 0.895)
                in_ext_torso_l1 = is_ext_f_m1 and (
                    ((rl_x_a[vi_m] <= 0.045) and (1.135 <= rl_z[vi_m] <= 1.255) and (rl_y[vi_m] < -0.085))
                    | ((0.016 <= rl_x_a[vi_m] <= 0.235) and (1.190 <= rl_z[vi_m] <= 1.515) and (rl_y[vi_m] > 0.035))
                )
                in_lean_glute_l1 = (slender_gap_l1 > 0.20) and (rl_x_a[vi_m] <= 0.118) and (0.985 <= rl_z[vi_m] <= 1.115) and (rl_y[vi_m] > 0.015)
                in_lean_subgroin = (adipose_gate <= 0.20) and (rl_z[vi_m] < 1.012 or rl_y[vi_m] > -0.038) and not in_lean_glute_l1
                if (adipose_gate <= 0.20 and not in_lean_subgroin) or in_f_cup_l1 or in_ext_mth_l1 or in_ext_torso_l1 or in_lean_glute_l1:
                    hb_m, _, _, db_m = hbvh_m_l1.find_nearest(Vector(p_bary.tolist()), 0.065 if adipose_gate <= 0.20 else 0.038)
                    if hb_m is not None and db_m < (0.055 if adipose_gate <= 0.20 else 0.030):
                        p_bary = np.asarray(hb_m, dtype=np.float64)
                if rl_x_a[vi_m] < 2.5e-4:
                    p_bary[0] = 0.0
                low_fit[vi_m] = (1.0 - wm_v) * low_fit[vi_m] + wm_v * p_bary
            if (adipose_gate > 0.80) and (abs(float(muscle_gate) - 0.50) > 0.10):
                # Snap the closest `LOD1` midline umbilical vertex (`v=5283/6231`) directly into `high_fit`'s sunken 3D navel pit
                # AND accentuate coarse `LOD1` dorsal/lumbar fold valleys & medial-thigh sagitta so `Fit LOD1 Clay` (`Col 6` & `signoff-10`)
                # retains crisp 3D navel & back-fold landmarks!
                m_hf_nv = (np.abs(high_fit[:, 0]) <= 0.006) & (high_fit[:, 2] >= 1.120) & (high_fit[:, 2] <= 1.248) & (high_fit[:, 1] < -0.18)
                if np.sum(m_hf_nv) >= 3:
                    hf_nv_pts = high_fit[m_hf_nv]
                    zs_nv_s = np.linspace(float(hf_nv_pts[:, 2].min()), float(hf_nv_pts[:, 2].max()), 33)
                    ys_nv_s = np.interp(zs_nv_s, hf_nv_pts[np.argsort(hf_nv_pts[:, 2]), 2], hf_nv_pts[np.argsort(hf_nv_pts[:, 2]), 1])
                    ys_nv_env = ys_nv_s.copy()
                    for st_v in (6, 4, 2):
                        for _ in range(8):
                            ys_nv_env[st_v:-st_v] = np.minimum(ys_nv_env[st_v:-st_v], 0.5 * (ys_nv_env[:-2*st_v] + ys_nv_env[2*st_v:]))
                    pit_idx = int(np.argmax(ys_nv_s - ys_nv_env))
                    z_pit_l0 = float(zs_nv_s[pit_idx])
                    y_pit_l0 = float(ys_nv_s[pit_idx])
                    m_l1_nv = (rl_x_a < 2.5e-4) & (low_fit[:, 2] >= z_pit_l0 - 0.032) & (low_fit[:, 2] <= z_pit_l0 + 0.032) & (low_fit[:, 1] < -0.18)
                    if np.any(m_l1_nv):
                        cand_nv_v = np.flatnonzero(m_l1_nv)
                        best_dz_nv = float(np.min(np.abs(low_fit[cand_nv_v, 2] - z_pit_l0)))
                        pit_l1_v = cand_nv_v[np.abs(low_fit[cand_nv_v, 2] - z_pit_l0) <= best_dz_nv + 1e-4]
                        low_fit[pit_l1_v, 0] = 0.0
                        low_fit[pit_l1_v, 1] = min(float(np.mean(low_fit[pit_l1_v, 1])), y_pit_l0) - 0.0005
                        low_fit[pit_l1_v, 2] = z_pit_l0
                # Slide & deepen `LOD1` posterior back-fold vertices (`|X| = 22..210 mm, Z = 1.20..1.48 m, Y > 0.05 m`) onto `high_fit` fold valleys:
                m_l1_bkf = (rl_x_a >= 0.022) & (rl_x_a <= 0.215) & (low_fit[:, 2] >= 1.205) & (low_fit[:, 2] <= 1.485) & (low_fit[:, 1] > 0.055)
                for vb_i in np.flatnonzero(m_l1_bkf):
                    xb_v, yb_v, zb_v = float(low_fit[vb_i, 0]), float(low_fit[vb_i, 1]), float(low_fit[vb_i, 2])
                    best_yb, best_zb = yb_v, zb_v
                    for dz_try_b in (-0.012, -0.006, 0.0, 0.006, 0.012):
                        rh_bk, rn_bk, _, _ = hbvh_m_l1.ray_cast(Vector((xb_v, 0.36, zb_v + dz_try_b)), Vector((0.0, -1.0, 0.0)), 0.34)
                        if rh_bk is not None and float(rh_bk.y) > 0.04 and float(rn_bk.y) > 0.25:
                            if float(rh_bk.y) < best_yb:
                                best_yb = float(rh_bk.y)
                                best_zb = zb_v + 0.55 * dz_try_b
                    if best_yb < yb_v - 0.0004:
                        low_fit[vb_i, 1] = best_yb
                        low_fit[vb_i, 2] = best_zb
                # Restore coarse `LOD1` medial-thigh triangle-chord sagitta loss (`~2-3 mm` at `Z = 0.72..0.89 m`) after `bary_from_high`:
                tc_mth = low_fit[low_tri].mean(axis=1)
                sag_m_s = np.zeros(len(low_fit), dtype=np.float64)
                sag_m_c = np.zeros(len(low_fit), dtype=np.float64)
                for ti_m, cm_v in enumerate(tc_mth):
                    if (0.70 <= float(cm_v[2]) <= 0.892) and (0.004 <= abs(float(cm_v[0])) <= 0.072):
                        hm_c, hn_c, _, dm_c = hbvh_m_l1.find_nearest(Vector(cm_v.tolist()), 0.018)
                        if hm_c is not None and dm_c < 0.014:
                            sd_m = float(np.dot(np.asarray(hm_c, dtype=np.float64) - cm_v, np.asarray(hn_c, dtype=np.float64)))
                            if sd_m > 0.00018:
                                for vv_m in low_tri[ti_m]:
                                    sag_m_s[vv_m] += min(sd_m, 0.0032)
                                    sag_m_c[vv_m] += 1.0
                nrm_mth1 = vertex_normals(low_fit, low_tri, low_conn[0])
                for vv_i in np.flatnonzero((sag_m_c > 0.5) & (rl_x_a >= 0.004) & (rl_x_a <= 0.068) & (rl_z >= 0.70) & (rl_z <= 0.895)):
                    low_fit[vv_i] += min(1.05 * (sag_m_s[vv_i] / sag_m_c[vv_i]), 0.0028) * nrm_mth1[vv_i]
            # Tangentially space `LOD1` pelvic/groin/glute vertices and re-project onto smooth `high_fit` (`hbvh_m_l1`),
            # aligning posterior natal-cleft midline vertices to `X = 0` without any hardcoded row curves or horizontal T-shelves:
            l_weld, (l_es, l_ed), l_mult, l_deg = low_conn
            l_first_u = np.zeros(len(l_mult), dtype=np.int64)
            l_first_u[l_weld[::-1]] = np.arange(len(l_weld) - 1, -1, -1)
            ru1_m = rest_base_low[l_first_u]
            ax_r1 = np.abs(ru1_m[:, 0])
            l_mid_u = ax_r1 < 2.5e-4
            cleft_mid_l1 = (ax_r1 < 0.0016) & (ru1_m[:, 1] > 0.012) & (ru1_m[:, 2] >= 0.885) & (ru1_m[:, 2] <= 1.185)
            sgn_r1 = np.sign(ru1_m[:, 0])
            lu_pts = np.column_stack([np.bincount(l_weld, weights=low_fit[:, c], minlength=len(l_mult)) / l_mult for c in range(3)])
            lu_pts[l_mid_u | cleft_mid_l1, 0] = 0.0
            z_pel_reg_hi = np.where(ru1_m[:, 1] < -0.020, 1.030, 1.125) if adipose_gate > 0.20 else 1.155
            pel_reg_m = (ax_r1 <= 0.145) & (ru1_m[:, 2] >= 0.885) & (ru1_m[:, 2] <= z_pel_reg_hi)
            reg_u_idx = np.flatnonzero(pel_reg_m)
            for _ in range(8):
                nrm_l1 = vertex_normals(lu_pts[l_weld], low_tri, l_weld)[l_first_u]
                nbr_l1 = np.column_stack([np.bincount(l_es, weights=lu_pts[l_ed, c], minlength=len(l_mult)) / np.maximum(l_deg, 1.0) for c in range(3)])
                for u_s1 in reg_u_idx:
                    dp_s1 = nbr_l1[u_s1] - lu_pts[u_s1]
                    dp_t1 = dp_s1 - float(np.dot(dp_s1, nrm_l1[u_s1])) * nrm_l1[u_s1]
                    cand_s1 = lu_pts[u_s1] + 0.34 * dp_t1
                    if l_mid_u[u_s1] or cleft_mid_l1[u_s1]:
                        cand_s1[0] = 0.0
                    else:
                        cand_s1[0] = sgn_r1[u_s1] * max(abs(float(cand_s1[0])), 0.0024)
                    hb_s1, hn_s1, _, db_s1 = hbvh_m_l1.find_nearest(Vector(cand_s1.tolist()), 0.025)
                    if hb_s1 is not None and db_s1 < 0.018 and float(np.dot(np.asarray(hn_s1, dtype=np.float64), nrm_l1[u_s1])) > 0.30:
                        cand_s1 = np.asarray(hb_s1, dtype=np.float64)
                        if l_mid_u[u_s1] or cleft_mid_l1[u_s1]:
                            cand_s1[0] = 0.0
                    lu_pts[u_s1] = cand_s1
            low_fit = lu_pts[l_weld].copy()
            m1_v = np.union1d(m1_v, np.flatnonzero((rl_x_a <= 0.155) & (rl_z >= 0.88) & (rl_z <= 1.18)))
            # Enforce exact `+-X` mirror symmetry across updated `LOD1` pelvic vertices:
            kd_m_l1 = KDTree(len(rest_base_low))
            for idx_ml, pt_ml in enumerate(rest_base_low):
                kd_m_l1.insert(pt_ml.tolist(), idx_ml)
            kd_m_l1.balance()
            lf_sym = low_fit.copy()
            for vi_m in m1_v:
                if rl_x_a[vi_m] < 2.5e-4:
                    lf_sym[vi_m, 0] = 0.0
                else:
                    _, jm_l, dm_l = kd_m_l1.find([-float(rest_base_low[vi_m, 0]), float(rest_base_low[vi_m, 1]), float(rest_base_low[vi_m, 2])])
                    if jm_l is not None and dm_l < 0.0035 and rest_base_low[vi_m, 0] * rest_base_low[jm_l, 0] < 0.0:
                        lf_sym[vi_m, 0] = 0.5 * (low_fit[vi_m, 0] - low_fit[jm_l, 0])
                        lf_sym[vi_m, 1] = 0.5 * (low_fit[vi_m, 1] + low_fit[jm_l, 1])
                        lf_sym[vi_m, 2] = 0.5 * (low_fit[vi_m, 2] + low_fit[jm_l, 2])
            low_fit = lf_sym
            if donor_xyz is not None and donor_tri is not None and posed_base_high is not None and jac_high is not None:
                from linen_briefs import _eval_brief_level_set_bl, fit_linen_briefs_to_donor_posed, unpose_donor_briefs_to_rest

                lf_src_l1 = (
                    np.asarray(donor_linen_faces, dtype=bool)
                    if (donor_linen_faces is not None and len(donor_linen_faces) == len(donor_tri))
                    else (_eval_brief_level_set_bl(donor_xyz[donor_tri].mean(axis=1)) > 0.0)
                )
                p_br1, t_br1, br_meta_l1 = fit_linen_briefs_to_donor_posed(
                    donor_xyz,
                    donor_tri,
                    lf_src_l1,
                    donor_linen_rim_faces,
                    donor_bridged_thigh_faces,
                    adipose_gate=float(adipose_gate),
                    muscle_gate=float(muscle_gate),
                )
                posed_h_l1 = posed_base_high + np.einsum("vij,vj->vi", jac_high, high_fit - rest_base_high)
                r_br1 = unpose_donor_briefs_to_rest(p_br1, t_br1, posed_h_l1, high_fit, high_tri)
                wb_r1_pts = r_br1[br_meta_l1["fIdx"][:, -1]]
                wb_r1_ord = np.argsort(wb_r1_pts[:, 0])
                wb_r1_x = wb_r1_pts[wb_r1_ord, 0]
                wb_r1_z = wb_r1_pts[wb_r1_ord, 2]
                if adipose_gate > 0.20:
                    # Project all exposed `LOD1` lower-stomach vertices horizontally onto `high_fit` (`hbvh_m_l1`) right down to
                    # the exact `r_br1` waistband seam + restore triangle-chord sagitta so 0 orange overhang deficit survives:
                    z_wb_l1_v = np.interp(np.clip(low_fit[:, 0], wb_r1_x[0], wb_r1_x[-1]), wb_r1_x, wb_r1_z)
                    m_st_l1 = (
                        (rl_x_a <= 0.168)
                        & (low_fit[:, 1] < -0.135)
                        & (low_fit[:, 2] >= z_wb_l1_v + 0.0035)
                        & (low_fit[:, 2] <= 1.162)
                        & ~((rl_x_a <= 0.036) & (low_fit[:, 2] >= 1.148))
                    )
                    for vs_i in np.flatnonzero(m_st_l1):
                        xs_q = float(low_fit[vs_i, 0])
                        zs_cur = float(low_fit[vs_i, 2])
                        z_wb_i = float(z_wb_l1_v[vs_i])
                        # Slide the coarse `LOD1` lower-belly row (`24..54 mm` above the crease) `-9 mm` down onto `high_fit`'s
                        # rounded overhang lip knee so `LOD1` reproduces the full lower-belly hang without chord truncation:
                        w_lip_sl = float(smootherstep(np.array([(zs_cur - (z_wb_i + 0.020)) / 0.012]))[0]) * float(
                            1.0 - smootherstep(np.array([(zs_cur - (z_wb_i + 0.056)) / 0.016]))[0]
                        )
                        zs_q = max(z_wb_i + 0.006, zs_cur - 0.0095 * w_lip_sl)
                        rh_s, rn_s, _, _ = hbvh_m_l1.ray_cast(Vector((xs_q, -0.38, zs_q)), Vector((0.0, 1.0, 0.0)), 0.34)
                        if rh_s is not None and float(rh_s.y) < -0.14 and (float(rn_s.y) < -0.05 or float(rn_s.z) < -0.25):
                            low_fit[vs_i, 1] = float(rh_s.y)
                            low_fit[vs_i, 2] = zs_q
                    tc_ap1 = low_fit[low_tri].mean(axis=1)
                    sag_ap_s = np.zeros(len(low_fit), dtype=np.float64)
                    sag_ap_c = np.zeros(len(low_fit), dtype=np.float64)
                    for ti_ap, cap_v in enumerate(tc_ap1):
                        z_wb_tc = float(np.interp(np.clip(float(cap_v[0]), wb_r1_x[0], wb_r1_x[-1]), wb_r1_x, wb_r1_z))
                        if (z_wb_tc + 0.002 <= float(cap_v[2]) <= 1.158) and (abs(float(cap_v[0])) <= 0.162) and (float(cap_v[1]) < -0.14):
                            ha_c, hna_c, _, dma_c = hbvh_m_l1.find_nearest(Vector(cap_v.tolist()), 0.024)
                            if ha_c is not None and dma_c < 0.020:
                                sd_ap = float(np.dot(np.asarray(ha_c, dtype=np.float64) - cap_v, np.asarray(hna_c, dtype=np.float64)))
                                if sd_ap > 0.00020:
                                    for vv_ap in low_tri[ti_ap]:
                                        sag_ap_s[vv_ap] += min(sd_ap, 0.0046)
                                        sag_ap_c[vv_ap] += 1.0
                    nrm_ap1 = vertex_normals(low_fit, low_tri, low_conn[0])
                    z_wb_l1_v2 = np.interp(np.clip(low_fit[:, 0], wb_r1_x[0], wb_r1_x[-1]), wb_r1_x, wb_r1_z)
                    for vv_a in np.flatnonzero((sag_ap_c > 0.5) & (rl_x_a <= 0.160) & (low_fit[:, 1] < -0.14) & (low_fit[:, 2] >= z_wb_l1_v2 + 0.003) & (low_fit[:, 2] <= 1.158)):
                        dp_ap1 = min(1.08 * (sag_ap_s[vv_a] / sag_ap_c[vv_a]), 0.0042) * nrm_ap1[vv_a]
                        if rl_x_a[vv_a] < 2.5e-4:
                            dp_ap1[0] = 0.0
                        low_fit[vv_a] += dp_ap1
                    lf_ap_sym = low_fit.copy()
                    for vv_s in np.flatnonzero((rl_x_a <= 0.170) & (low_fit[:, 1] < -0.10) & (low_fit[:, 2] >= 0.99) & (low_fit[:, 2] <= 1.17)):
                        if rl_x_a[vv_s] < 2.5e-4:
                            lf_ap_sym[vv_s, 0] = 0.0
                        else:
                            _, jm_a, dm_a = kd_m_l1.find([-float(rest_base_low[vv_s, 0]), float(rest_base_low[vv_s, 1]), float(rest_base_low[vv_s, 2])])
                            if jm_a is not None and dm_a < 0.0035 and rest_base_low[vv_s, 0] * rest_base_low[jm_a, 0] < 0.0:
                                lf_ap_sym[vv_s, 0] = 0.5 * (low_fit[vv_s, 0] - low_fit[jm_a, 0])
                                lf_ap_sym[vv_s, 1] = 0.5 * (low_fit[vv_s, 1] + low_fit[jm_a, 1])
                                lf_ap_sym[vv_s, 2] = 0.5 * (low_fit[vv_s, 2] + low_fit[jm_a, 2])
                    low_fit = lf_ap_sym
                bvh_rbr1 = BVHTree.FromPolygons(r_br1.tolist(), t_br1.tolist(), all_triangles=True)
                c_br1 = weld_connectivity(r_br1, t_br1, decimals=5)
                vn_rbr1 = vertex_normals(r_br1, t_br1, c_br1[0])
                ec_br1: dict[tuple[int, int], int] = {}
                wt_br1 = c_br1[0][t_br1]
                w2v_br1: dict[int, int] = {}
                for vb_k, wb_k in enumerate(c_br1[0]):
                    w2v_br1.setdefault(int(wb_k), int(vb_k))
                for fb_k in range(len(t_br1)):
                    wa_k, wb_k, wc_k = int(wt_br1[fb_k, 0]), int(wt_br1[fb_k, 1]), int(wt_br1[fb_k, 2])
                    for u_e, v_e in ((wa_k, wb_k), (wb_k, wc_k), (wc_k, wa_k)):
                        ek = (min(u_e, v_e), max(u_e, v_e))
                        ec_br1[ek] = ec_br1.get(ek, 0) + 1
                rim_s1: list[np.ndarray] = []
                for (u_e, v_e), ce_k in ec_br1.items():
                    if ce_k == 1:
                        pa_e, pb_e = r_br1[w2v_br1[u_e]], r_br1[w2v_br1[v_e]]
                        for ts_e in (0.0, 0.33, 0.67, 1.0):
                            rim_s1.append((1.0 - ts_e) * pa_e + ts_e * pb_e)
                kd_rim1 = KDTree(max(len(rim_s1), 1))
                for ir_k, pr_k in enumerate(rim_s1):
                    kd_rim1.insert(pr_k.tolist(), ir_k)
                kd_rim1.balance()
                pel_l1_tm = np.all(
                    (np.abs(rest_base_low[low_tri, 0]) <= 0.34)
                    & (rest_base_low[low_tri, 2] >= 0.78)
                    & (rest_base_low[low_tri, 2] <= 1.32),
                    axis=1,
                )
                sub_l1_tri = low_tri[pel_l1_tm]
                lf_orig_c = low_fit.copy()
                for _ in range(28):
                    bvh_l_cur = BVHTree.FromPolygons(low_fit.tolist(), sub_l1_tri.tolist(), all_triangles=True)
                    ov_l_br = bvh_l_cur.overlap(bvh_rbr1)
                    if not ov_l_br:
                        break
                    tuck_vs = sorted({int(v) for bt_i, _ in ov_l_br for v in sub_l1_tri[int(bt_i)]})
                    moved_any = False
                    for vi_t in tuck_vs:
                        if adipose_gate > 0.20 and float(low_fit[vi_t, 1]) < -0.045:
                            z_wb_vt = float(np.interp(np.clip(float(low_fit[vi_t, 0]), wb_r1_x[0], wb_r1_x[-1]), wb_r1_x, wb_r1_z))
                            if float(low_fit[vi_t, 2]) >= z_wb_vt + 0.0015 or float(rest_base_low[vi_t, 2]) >= 1.052:
                                continue
                        hb_t, _, ti_t, db_t = bvh_rbr1.find_nearest(Vector(low_fit[vi_t].tolist()), 0.060)
                        if hb_t is None or ti_t is None or db_t >= 0.052:
                            continue
                        _, _, d_rm1 = kd_rim1.find(list(hb_t))
                        in_gus_edge = (abs(float(low_fit[vi_t, 0])) <= 0.046) and (float(low_fit[vi_t, 2]) <= float(r_br1[:, 2].min()) + 0.036)
                        if float(d_rm1) < 0.0012 and not in_gus_edge:
                            continue
                        n_t = vn_rbr1[t_br1[int(ti_t)]].mean(axis=0)
                        n_t /= max(float(np.linalg.norm(n_t)), 1e-12)
                        sd_t = float(np.dot(low_fit[vi_t] - np.asarray(hb_t, dtype=np.float64), n_t))
                        step_t = max(0.00080, (sd_t + 0.0022) * 0.55) if sd_t > -0.0022 else 0.00060
                        cand_v = low_fit[vi_t] - step_t * n_t
                        if float(np.linalg.norm(cand_v - lf_orig_c[vi_t])) <= 0.038:
                            low_fit[vi_t] = cand_v
                            moved_any = True
                    if not moved_any:
                        break
                    lf_s2 = low_fit.copy()
                    for vi_t in tuck_vs:
                        if rl_x_a[vi_t] < 2.5e-4:
                            lf_s2[vi_t, 0] = 0.0
                        else:
                            _, jm_l, dm_l = kd_m_l1.find([-float(rest_base_low[vi_t, 0]), float(rest_base_low[vi_t, 1]), float(rest_base_low[vi_t, 2])])
                            if jm_l is not None and dm_l < 0.0035 and rest_base_low[vi_t, 0] * rest_base_low[jm_l, 0] < 0.0:
                                lf_s2[vi_t, 0] = 0.5 * (low_fit[vi_t, 0] - low_fit[jm_l, 0])
                                lf_s2[vi_t, 1] = 0.5 * (low_fit[vi_t, 1] + low_fit[jm_l, 1])
                                lf_s2[vi_t, 2] = 0.5 * (low_fit[vi_t, 2] + low_fit[jm_l, 2])
                    low_fit = lf_s2
                low_bary_post_sculpt = low_fit.copy()
    low_fit[:, 2] = np.maximum(low_fit[:, 2], 0.0)
    low_fit[plantar_lod1, 2] = rest_base_low[plantar_lod1, 2]
    low_fit[seam_body] = seam_low_saved
    low_fit = low_fit.astype(np.float32).astype(np.float64)

    # Guarantee 0 bad faces & 0 new self-intersections on runtime LOD1 after post-polish (untangle locally FIRST before any fallback to low_fit_clean!):
    l_es_g, l_ed_g = low_conn[1]
    l_deg_g = np.maximum(low_conn[3].astype(np.float64), 1.0)
    l_mult_g = low_conn[2]
    n_l_mult = len(l_mult_g)
    l_u_pts = np.column_stack([np.bincount(low_weld, weights=low_fit[:, c], minlength=n_l_mult) / l_mult_g for c in range(3)])
    l_lock_u = np.isin(np.arange(n_l_mult), low_weld[seam_body])
    use_sym_l1_untangle = resolved_sex == "male"
    mir_u_l1 = np.arange(n_l_mult, dtype=np.int64)
    mid_u_l1 = np.zeros(n_l_mult, dtype=bool)
    pel_u_l1 = np.zeros(n_l_mult, dtype=bool)
    has_mir_l1 = np.zeros(n_l_mult, dtype=bool)
    low_fallback_sym = low_fit_p.copy()
    if use_sym_l1_untangle:
        first_l_g = np.zeros(n_l_mult, dtype=np.int64)
        first_l_g[low_weld[::-1]] = np.arange(len(low_weld) - 1, -1, -1)
        ru_l_g = rest_base_low[first_l_g]
        mid_u_l1 = np.abs(ru_l_g[:, 0]) < 2.5e-4
        pel_u_l1 = (ru_l_g[:, 2] >= 0.78) & (ru_l_g[:, 2] <= 1.22) & (np.abs(ru_l_g[:, 0]) <= 0.19)
        kd_u_l1 = KDTree(n_l_mult)
        for u_k, pt_k in enumerate(ru_l_g):
            kd_u_l1.insert(pt_k.tolist(), u_k)
        kd_u_l1.balance()
        for u_k in range(n_l_mult):
            if not mid_u_l1[u_k]:
                _, jm_u, dm_u = kd_u_l1.find([-float(ru_l_g[u_k, 0]), float(ru_l_g[u_k, 1]), float(ru_l_g[u_k, 2])])
                if jm_u is not None and dm_u < 0.0055 and ru_l_g[u_k, 0] * ru_l_g[jm_u, 0] < 0.0:
                    mir_u_l1[u_k] = int(jm_u)
        # Enforce reciprocal pairing (`mir_u_l1[mir_u_l1[u]] == u`) and NEVER subtract self (`x - x = 0`) on unmatched vertices!
        for u_k in range(n_l_mult):
            v_k = int(mir_u_l1[u_k])
            if v_k != u_k and int(mir_u_l1[v_k]) != u_k:
                mir_u_l1[u_k] = u_k
        has_mir_l1 = (mir_u_l1 != np.arange(n_l_mult, dtype=np.int64)) & pel_u_l1
        lfp_u = np.column_stack([np.bincount(low_weld, weights=low_bary_post_sculpt[:, c], minlength=n_l_mult) / l_mult_g for c in range(3)])
        lfp_m = lfp_u[mir_u_l1]
        lfp_u[has_mir_l1, 0] = 0.5 * (lfp_u[has_mir_l1, 0] - lfp_m[has_mir_l1, 0])
        lfp_u[has_mir_l1, 1] = 0.5 * (lfp_u[has_mir_l1, 1] + lfp_m[has_mir_l1, 1])
        lfp_u[has_mir_l1, 2] = 0.5 * (lfp_u[has_mir_l1, 2] + lfp_m[has_mir_l1, 2])
        lfp_u[mid_u_l1 & pel_u_l1, 0] = 0.0
        low_fallback_sym = lfp_u[low_weld].copy()
        for grp in unique_alias_groups:
            low_fallback_sym[grp] = low_fallback_sym[grp].mean(axis=0)
        low_fallback_sym[seam_body] = seam_low_saved

    for _lu_it in range(10):
        chk_l = l_u_pts[low_weld].copy()
        for grp in unique_alias_groups:
            chk_l[grp] = chk_l[grp].mean(axis=0)
        chk_l[seam_body] = seam_low_saved
        chk_l = chk_l.astype(np.float32).astype(np.float64)
        l_cross_u = self_intersections(chk_l, low_tri, low_weld) - low_before
        l_bad_u = np.flatnonzero(bad_faces(chk_l, low_tri, low_areas, low_conn))
        if not l_cross_u and not len(l_bad_u):
            low_fit = chk_l
            break
        ff_lu = set(l_bad_u.tolist())
        for a, b in l_cross_u:
            ff_lu.add(a)
            ff_lu.add(b)
        pat_l = np.zeros(n_l_mult, dtype=np.float64)
        pat_l[np.unique(low_weld[low_tri[list(ff_lu)].ravel()])] = 1.0
        if use_sym_l1_untangle:
            pat_l = np.maximum(pat_l, pat_l[mir_u_l1])
        for _ in range(2):
            pat_l = np.maximum(pat_l * 0.72, np.bincount(l_es_g, weights=pat_l[l_ed_g], minlength=n_l_mult) / l_deg_g)
            if use_sym_l1_untangle:
                pat_l = np.maximum(pat_l, pat_l[mir_u_l1])
        pat_l[l_lock_u] = 0.0
        for _ in range(4):
            nbr_lu = np.column_stack([np.bincount(l_es_g, weights=l_u_pts[l_ed_g, c], minlength=n_l_mult) / l_deg_g for c in range(3)])
            l_u_pts += (0.45 * pat_l)[:, None] * (nbr_lu - l_u_pts)
            if use_sym_l1_untangle:
                lm_cur = l_u_pts[mir_u_l1]
                l_u_pts[has_mir_l1, 0] = 0.5 * (l_u_pts[has_mir_l1, 0] - lm_cur[has_mir_l1, 0])
                l_u_pts[has_mir_l1, 1] = 0.5 * (l_u_pts[has_mir_l1, 1] + lm_cur[has_mir_l1, 1])
                l_u_pts[has_mir_l1, 2] = 0.5 * (l_u_pts[has_mir_l1, 2] + lm_cur[has_mir_l1, 2])
                l_u_pts[mid_u_l1 & pel_u_l1, 0] = 0.0
        low_fit = l_u_pts[low_weld].copy()
        for grp in unique_alias_groups:
            low_fit[grp] = low_fit[grp].mean(axis=0)
        low_fit[seam_body] = seam_low_saved
        low_fit = low_fit.astype(np.float32).astype(np.float64)

    for _ in range(18):
        l_cross_chk = self_intersections(low_fit, low_tri, low_weld) - low_before
        l_bad_chk = np.flatnonzero(bad_faces(low_fit, low_tri, low_areas, low_conn))
        if not l_cross_chk and not len(l_bad_chk):
            break
        fail_l_f = set(l_bad_chk.tolist())
        for a, b in l_cross_chk:
            fail_l_f.add(a)
            fail_l_f.add(b)
        att_l = np.zeros(n_l_mult, dtype=np.float64)
        att_l[np.unique(low_weld[low_tri[list(fail_l_f)].ravel()])] = 1.0
        if use_sym_l1_untangle:
            att_l = np.maximum(att_l, att_l[mir_u_l1])
        for _ in range(3):
            att_l = np.maximum(att_l * 0.78, np.bincount(l_es_g, weights=att_l[l_ed_g], minlength=n_l_mult) / l_deg_g)
            if use_sym_l1_untangle:
                att_l = np.maximum(att_l, att_l[mir_u_l1])
        att_l[low_weld[seam_body]] = 0.0
        w_rel_l = (0.42 * np.clip(att_l[low_weld], 0.0, 1.0))[:, None]
        low_fallback = low_fallback_sym if use_sym_l1_untangle else low_fit_p
        low_fit = (1.0 - w_rel_l) * low_fit + w_rel_l * low_fallback
        if use_sym_l1_untangle:
            lf_u_cur = np.column_stack([np.bincount(low_weld, weights=low_fit[:, c], minlength=n_l_mult) / l_mult_g for c in range(3)])
            lf_m_cur = lf_u_cur[mir_u_l1]
            lf_u_cur[has_mir_l1, 0] = 0.5 * (lf_u_cur[has_mir_l1, 0] - lf_m_cur[has_mir_l1, 0])
            lf_u_cur[has_mir_l1, 1] = 0.5 * (lf_u_cur[has_mir_l1, 1] + lf_m_cur[has_mir_l1, 1])
            lf_u_cur[has_mir_l1, 2] = 0.5 * (lf_u_cur[has_mir_l1, 2] + lf_m_cur[has_mir_l1, 2])
            lf_u_cur[mid_u_l1 & pel_u_l1, 0] = 0.0
            low_fit = lf_u_cur[low_weld].copy()
        for grp in unique_alias_groups:
            low_fit[grp] = low_fit[grp].mean(axis=0)
        low_fit[seam_body] = seam_low_saved
        low_fit = low_fit.astype(np.float32).astype(np.float64)

    # Re-enforce exact `+-X` mirror symmetry on `LOD1` pelvis/glutes AFTER untangling (`guarded against bad faces & self-intersections`)
    # so one-sided bad-face attenuation NEVER leaves `13 mm` left/right asymmetry on `Unmasked Bare Saddle`!
    if resolved_sex == "male" and adipose_gate > 0.20:
        kd_post_l1 = KDTree(len(rest_base_low))
        for idx_pl, pt_pl in enumerate(rest_base_low):
            kd_post_l1.insert(pt_pl.tolist(), idx_pl)
        kd_post_l1.balance()
        cand_sym_l = low_fit.copy()
        pel_sym_v = np.flatnonzero((rest_base_low[:, 2] >= 0.78) & (rest_base_low[:, 2] <= 1.18) & (np.abs(rest_base_low[:, 0]) <= 0.18))
        for vi_ps in pel_sym_v:
            if abs(float(rest_base_low[vi_ps, 0])) < 2.5e-4:
                cand_sym_l[vi_ps, 0] = 0.0
            else:
                _, jm_ps, dm_ps = kd_post_l1.find([-float(rest_base_low[vi_ps, 0]), float(rest_base_low[vi_ps, 1]), float(rest_base_low[vi_ps, 2])])
                if jm_ps is not None and dm_ps < 0.0035 and rest_base_low[vi_ps, 0] * rest_base_low[jm_ps, 0] < 0.0:
                    cand_sym_l[vi_ps, 0] = 0.5 * (low_fit[vi_ps, 0] - low_fit[jm_ps, 0])
                    cand_sym_l[vi_ps, 1] = 0.5 * (low_fit[vi_ps, 1] + low_fit[jm_ps, 1])
                    cand_sym_l[vi_ps, 2] = 0.5 * (low_fit[vi_ps, 2] + low_fit[jm_ps, 2])
        for grp in unique_alias_groups:
            cand_sym_l[grp] = cand_sym_l[grp].mean(axis=0)
        cand_sym_l[seam_body] = seam_low_saved
        cand_sym_l = cand_sym_l.astype(np.float32).astype(np.float64)
        if not (self_intersections(cand_sym_l, low_tri, low_weld) - low_before) and not np.any(bad_faces(cand_sym_l, low_tri, low_areas, low_conn)):
            low_fit = cand_sym_l

    h_cross = self_intersections(high_fit, high_tri, high_weld) - high_before
    l_cross = self_intersections(low_fit, low_tri, low_weld) - low_before
    h_bad = np.flatnonzero(bad_faces(high_fit, high_tri, high_areas, high_conn))
    l_bad = np.flatnonzero(bad_faces(low_fit, low_tri, low_areas, low_conn))

    seam_gap_mm = float(np.linalg.norm(low_fit[seam_body] - head_fit[seam_head], axis=1).max() * 1000.0)
    crown_shift_mm = float(abs(head_fit[:, 2].max() - rest_base_head[:, 2].max()) * 1000.0)
    sole_min_z_mm = float(low_fit[:, 2].min() * 1000.0)
    quality = {
        "lod0UnacceptableFaces": int(len(h_bad)),
        "lod1UnacceptableFaces": int(len(l_bad)),
        "headUnacceptableFaces": int(len(hd_bad)),
        "lod0NewSelfIntersectionPairs": int(len(h_cross)),
        "lod1NewSelfIntersectionPairs": int(len(l_cross)),
        "headNewSelfIntersectionPairs": int(len(hd_cross)),
        "rollbackSteps": rollback,
        "runtimeCollarSeamMaxGapMm": round(seam_gap_mm, 6),
        "crownHeightShiftMm": round(crown_shift_mm, 6),
        "runtimeSoleMinZMm": round(sole_min_z_mm, 4),
        "handFingerFullness": hand_finger_stats,
    }
    return high_fit, low_fit, head_fit, quality


def _infer_canonical_sex(rest_base: np.ndarray) -> str:
    """Detect whether the canonical foundation mesh is masculine (`male`) or feminine (`female`) from its anterior pelvic contour."""
    m_mid = (np.abs(rest_base[:, 0]) <= 0.012) & (rest_base[:, 2] >= 1.045) & (rest_base[:, 2] <= 1.095) & (rest_base[:, 1] < -0.05)
    m_lat = (np.abs(rest_base[:, 0]) >= 0.036) & (np.abs(rest_base[:, 0]) <= 0.056) & (rest_base[:, 2] >= 1.045) & (rest_base[:, 2] <= 1.095) & (rest_base[:, 1] < -0.05)
    if np.sum(m_mid) >= 3 and np.sum(m_lat) >= 4:
        prom_m = float(np.percentile(rest_base[m_lat, 1], 25) - np.percentile(rest_base[m_mid, 1], 15))
        if prom_m >= 0.008:
            return "male"
    return "female"


def sculpt_male_anterior_pelvic_mound(
    ref_pts: np.ndarray,
    fit_pts: np.ndarray,
    tri: np.ndarray,
    donor_xyz: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
    donor_bridged_thigh_faces: np.ndarray | None = None,
    donor_linen_faces: np.ndarray | None = None,
    donor_linen_rim_faces: np.ndarray | None = None,
    posed_base: np.ndarray | None = None,
    jac_body: np.ndarray | None = None,
    adipose_gate: float = 0.0,
    muscle_gate: float = 0.5,
) -> np.ndarray:
    """Derive covered bare `bodySkin` (`LOD0`) as a clean `~2.5 mm` inward normal offset underneath
    `fit_linen_briefs_to_donor_posed` (`preserving two rounded lower butt cheeks and a natural vertical
    gluteal crease with zero horizontal T-craters`), while restoring exposed bare anatomy outside the brief rim.
    """
    if donor_xyz is None or donor_tri is None or posed_base is None or jac_body is None:
        return fit_pts

    from linen_briefs import (
        _barycentric_on_tri,
        _eval_brief_level_set_bl,
        fit_linen_briefs_to_donor_posed,
    )

    conn = weld_connectivity(ref_pts, tri, decimals=5)
    weld, (es, ed), mult, deg = conn
    n_u = len(mult)
    deg_u = np.maximum(deg.astype(np.float64), 1.0)
    first_u = np.zeros(n_u, dtype=np.int64)
    first_u[weld[::-1]] = np.arange(len(weld) - 1, -1, -1)

    ru = ref_pts[first_u]
    pu = np.column_stack([np.bincount(weld, weights=fit_pts[:, c], minlength=n_u) / mult for c in range(3)])
    mid_u = np.abs(ru[:, 0]) < 2.5e-4
    sgn_all = np.sign(ru[:, 0])
    ax_ru = np.abs(ru[:, 0])
    rz_ru = ru[:, 2]
    ry_ru = ru[:, 1]
    ad_g = float(np.clip(adipose_gate, 0.0, 1.0))
    ms_g = float(np.clip(muscle_gate, 0.0, 1.0))
    is_ext_full = (ad_g > 0.80) and (abs(ms_g - 0.50) > 0.10)
    jac_u = jac_body[first_u]

    # 1) Fit smooth `±X`-symmetrized Donor `linenBriefs` in Posed space (`100% arm-free pelvic BVH`):
    fc_d = donor_xyz[donor_tri].mean(axis=1)
    lf_src = (
        np.asarray(donor_linen_faces, dtype=bool)
        if (donor_linen_faces is not None and len(donor_linen_faces) == len(donor_tri))
        else (_eval_brief_level_set_bl(fc_d) > 0.0)
    )
    posed_br, br_tri, br_meta = fit_linen_briefs_to_donor_posed(
        donor_xyz,
        donor_tri,
        lf_src,
        donor_linen_rim_faces,
        donor_bridged_thigh_faces,
        adipose_gate=ad_g,
        muscle_gate=ms_g,
    )
    z_cr_min = float(br_meta["zCrotchMin"])
    z_f_top = float(br_meta["zFrontTopMid"])
    z_b_top = float(br_meta["zBackTopMid"])
    pelvic_faces_d = br_meta["pelvicFaces"]
    bvh_don = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[pelvic_faces_d].tolist(), all_triangles=True)

    m_tgap_don = (
        (np.abs(donor_xyz[:, 1]) < 0.035)
        & (donor_xyz[:, 2] >= 0.89)
        & (donor_xyz[:, 2] <= 0.96)
        & (np.abs(donor_xyz[:, 0]) < 0.085)
    )
    tgap_x_don = float(np.min(np.abs(donor_xyz[m_tgap_don, 0]))) if np.any(m_tgap_don) else 0.008
    open_gap_don = float(smootherstep(np.array([(tgap_x_don - 0.014) / 0.010]))[0])

    # 2) Build `bvh_br`, smooth outward brief normals `vn_br`, and open-rim distance `kd_rim`:
    bvh_br = BVHTree.FromPolygons(posed_br.tolist(), br_tri.tolist(), all_triangles=True)
    br_conn = weld_connectivity(posed_br, br_tri, decimals=5)
    vn_br = vertex_normals(posed_br, br_tri, br_conn[0])
    br_adj: list[set[int]] = [set() for _ in range(len(posed_br))]
    edge_cnt: dict[tuple[int, int], int] = {}
    br_wtri = br_conn[0][br_tri]
    w_to_v: dict[int, int] = {}
    for vi_b, wi_b in enumerate(br_conn[0]):
        w_to_v.setdefault(int(wi_b), int(vi_b))
    for fi_b in range(len(br_tri)):
        va, vb, vc = int(br_tri[fi_b, 0]), int(br_tri[fi_b, 1]), int(br_tri[fi_b, 2])
        for u_e, v_e in ((va, vb), (vb, vc), (vc, va)):
            br_adj[u_e].add(v_e)
            br_adj[v_e].add(u_e)
        wa, wb, wc = int(br_wtri[fi_b, 0]), int(br_wtri[fi_b, 1]), int(br_wtri[fi_b, 2])
        for uw, vw in ((wa, wb), (wb, wc), (wc, wa)):
            ek = (min(uw, vw), max(uw, vw))
            edge_cnt[ek] = edge_cnt.get(ek, 0) + 1
    for _ in range(3):
        vn_nxt = vn_br.copy()
        for vi_b in range(len(posed_br)):
            if br_adj[vi_b]:
                vn_nxt[vi_b] = 0.55 * vn_br[vi_b] + 0.45 * vn_br[list(br_adj[vi_b])].mean(axis=0)
        vn_br = vn_nxt / np.maximum(np.linalg.norm(vn_br, axis=1, keepdims=True), 1e-12)

    rim_samples: list[np.ndarray] = []
    for (uw, vw), cnt_e in edge_cnt.items():
        if cnt_e == 1:
            pa_r = posed_br[w_to_v[uw]]
            pb_r = posed_br[w_to_v[vw]]
            for ts_r in (0.0, 0.25, 0.5, 0.75, 1.0):
                rim_samples.append((1.0 - ts_r) * pa_r + ts_r * pb_r)
    kd_rim = KDTree(max(len(rim_samples), 1))
    for idx_rm, pt_rm in enumerate(rim_samples):
        kd_rim.insert(pt_rm.tolist(), idx_rm)
    kd_rim.balance()

    wb_f_pts = posed_br[br_meta["fIdx"][:, -1]]
    wb_f_ord = np.argsort(wb_f_pts[:, 0])
    wb_f_x = wb_f_pts[wb_f_ord, 0]
    wb_f_z = wb_f_pts[wb_f_ord, 2]

    # Canonical eligibility gate (`excluding overhanging belly skin above the crease and lower thigh shafts`):
    w_trunk_elig = (
        (1.0 - smootherstep((ax_ru - 0.215) / 0.025))
        * smootherstep((rz_ru - (0.892 if ad_g > 0.20 else 0.904)) / 0.022)
        * (1.0 - smootherstep((rz_ru - 1.245) / 0.028))
    )
    if ad_g > 0.20:
        apron_skin_excl = smootherstep((-ry_ru - 0.035) / 0.025) * smootherstep((rz_ru - 1.046) / 0.014)
        w_trunk_elig = w_trunk_elig * (1.0 - apron_skin_excl)

    w_cov_u = np.zeros(n_u, dtype=np.float64)
    cand_pel = np.flatnonzero(w_trunk_elig > 0.005)

    def _project_covered_bare_skin(gain_n: float) -> None:
        posed_cur = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
        for u_c in cand_pel:
            pt_q = posed_cur[u_c]
            # Never pull exposed bare lower-stomach skin at/above the front waistband seam behind `posed_br`:
            if float(pt_q[1]) < -0.020:
                z_wb_q = float(np.interp(np.clip(float(pt_q[0]), wb_f_x[0], wb_f_x[-1]), wb_f_x, wb_f_z))
                if float(pt_q[2]) >= z_wb_q - 0.0005:
                    continue
            hit_b, _, ti_b, dist_b = bvh_br.find_nearest(Vector(pt_q.tolist()), 0.072)
            if hit_b is None or ti_b is None or dist_b >= 0.066:
                continue
            hb_np = np.asarray(hit_b, dtype=np.float64)
            _, _, d_rim = kd_rim.find(hb_np.tolist())
            w_in = (
                float(w_trunk_elig[u_c])
                * float(smootherstep(np.array([(float(d_rim) - 0.0005) / 0.0055]))[0])
                * float(1.0 - smootherstep(np.array([(float(dist_b) - 0.0500) / 0.0160]))[0])
            )
            if w_in <= 0.004:
                continue
            ia, ib, ic = int(br_tri[int(ti_b), 0]), int(br_tri[int(ti_b), 1]), int(br_tri[int(ti_b), 2])
            bary = _barycentric_on_tri(hb_np, posed_br[ia], posed_br[ib], posed_br[ic])
            n_sm = bary[0] * vn_br[ia] + bary[1] * vn_br[ib] + bary[2] * vn_br[ic]
            n_sm /= max(float(np.linalg.norm(n_sm)), 1e-12)
            off_in = 0.0019 + 0.0009 * float(smootherstep(np.array([float(d_rim) / 0.0100]))[0])
            in_rear_cleft = (float(hb_np[1]) > 0.015) and (abs(float(hb_np[0])) < 0.062)
            p_tgt = hb_np - off_in * n_sm
            dn_s = float(np.dot(p_tgt - pt_q, n_sm))
            # One-sided inward clearance in the posterior intergluteal valley: NEVER pull bare `bodySkin`'s natural gluteal crease outward
            # toward `linenBriefs`'s tensioned cloth bridge!
            if in_rear_cleft and dn_s > 0.0:
                continue
            w_cov_u[u_c] = max(w_cov_u[u_c], w_in)
            dp_p = (gain_n * w_in * dn_s) * n_sm
            try:
                dp_r = np.linalg.solve(jac_u[u_c], dp_p)
            except np.linalg.LinAlgError:
                dp_r = dp_p
            nrm_r = float(np.linalg.norm(dp_r))
            if nrm_r > 0.095:
                dp_r *= 0.095 / nrm_r
            pu[u_c] += dp_r
        pu[mid_u, 0] = 0.0

    for gain_pass in (0.92, 0.90):
        _project_covered_bare_skin(gain_pass)
        cov_act = np.flatnonzero((w_cov_u > 0.01) & ~((ry_ru > 0.015) & (ax_ru < 0.036)))
        if len(cov_act):
            wc_t = (0.36 * w_cov_u[cov_act])[:, None]
            nm_c = ~mid_u[cov_act]
            for _ in range(6):
                nrm_c = vertex_normals(pu[weld], tri, weld)[first_u][cov_act]
                nbr_c = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_c = nbr_c[cov_act] - pu[cov_act]
                dp_ct = dp_c - np.einsum("ni,ni->n", dp_c, nrm_c)[:, None] * nrm_c
                pu[cov_act] += wc_t * dp_ct
                pu[mid_u, 0] = 0.0
                pu[cov_act[nm_c], 0] = sgn_all[cov_act[nm_c]] * np.maximum(np.abs(pu[cov_act[nm_c], 0]), 0.0022)
    _project_covered_bare_skin(0.85)

    w_exp_gate = 1.0 - 0.96 * w_cov_u
    f_idx = np.flatnonzero(w_cov_u > 0.005)

    # 3) Restore exposed bare `donorReg` anatomy strictly outside `posed_br`:
    if ad_g > 0.20:
        # 3a) Exposed sub-hem upper-anterior thighs (`Y_at`):
        x_at = np.linspace(0.024, 0.165, 32)
        z_at = np.linspace(0.810, 0.985, 36)
        Y_at = np.full((len(x_at), len(z_at)), np.nan, dtype=np.float64)
        for ix_t, xq_t in enumerate(x_at):
            for iz_t, zq_t in enumerate(z_at):
                ys_t = []
                for sx_t in (-1.0, 1.0):
                    rh_t, rn_t, _, _ = bvh_don.ray_cast(Vector((sx_t * float(xq_t), -0.36, float(zq_t))), Vector((0.0, 1.0, 0.0)), 0.34)
                    if rh_t is not None and float(rh_t.y) < -0.115 and float(rn_t.y) < -0.15:
                        ys_t.append(float(rh_t.y))
                if ys_t:
                    Y_at[ix_t, iz_t] = float(np.mean(ys_t))
        for ix_t in range(len(x_at)):
            ok_zt = np.isfinite(Y_at[ix_t])
            if np.any(ok_zt):
                Y_at[ix_t] = np.interp(z_at, z_at[ok_zt], Y_at[ix_t, ok_zt])
        for iz_t in range(len(z_at)):
            ok_xt = np.isfinite(Y_at[:, iz_t])
            if np.any(ok_xt):
                Y_at[:, iz_t] = np.interp(x_at, x_at[ok_xt], Y_at[ok_xt, iz_t])
        if np.all(np.isfinite(Y_at)):
            for _ in range(8):
                Y_at[1:-1, :] = 0.25 * Y_at[:-2, :] + 0.50 * Y_at[1:-1, :] + 0.25 * Y_at[2:, :]
                Y_at[:, 1:-1] = 0.25 * Y_at[:, :-2] + 0.50 * Y_at[:, 1:-1] + 0.25 * Y_at[:, 2:]
            dx_at = float(x_at[1] - x_at[0])
            dz_at = float(z_at[1] - z_at[0])
            for _ in range(2):
                posed_at = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
                px_at, py_at, pz_at = np.abs(posed_at[:, 0]), posed_at[:, 1], posed_at[:, 2]
                w_at_u = (
                    ad_g
                    * w_exp_gate
                    * smootherstep((px_at - 0.024) / 0.016)
                    * (1.0 - smootherstep((px_at - 0.168) / 0.026))
                    * smootherstep((pz_at - 0.810) / 0.024)
                    * (1.0 - smootherstep((pz_at - 0.975) / 0.028))
                    * smootherstep((-py_at - 0.045) / 0.035)
                )
                at_idx = np.flatnonzero(w_at_u > 0.005)
                for u_t in at_idx:
                    fx_t = float(np.clip((px_at[u_t] - float(x_at[0])) / dx_at, 0.0, float(len(x_at) - 1) - 1e-6))
                    fz_t = float(np.clip((pz_at[u_t] - float(z_at[0])) / dz_at, 0.0, float(len(z_at) - 1) - 1e-6))
                    ix0_t, iz0_t = int(fx_t), int(fz_t)
                    tx_t, tz_t = fx_t - ix0_t, fz_t - iz0_t
                    yt_t = (
                        (1.0 - tx_t) * ((1.0 - tz_t) * Y_at[ix0_t, iz0_t] + tz_t * Y_at[ix0_t, iz0_t + 1])
                        + tx_t * ((1.0 - tz_t) * Y_at[ix0_t + 1, iz0_t] + tz_t * Y_at[ix0_t + 1, iz0_t + 1])
                    )
                    dy_at = min(0.0, float(yt_t - py_at[u_t])) * float(w_at_u[u_t])
                    if dy_at < -1e-5:
                        try:
                            dp_t = np.linalg.solve(jac_u[u_t], np.array([0.0, dy_at, 0.0], dtype=np.float64))
                        except np.linalg.LinAlgError:
                            dp_t = np.array([0.0, dy_at, 0.0], dtype=np.float64)
                        if float(np.linalg.norm(dp_t)) <= 0.075:
                            pu[u_t] += dp_t
                f_idx = np.union1d(f_idx, at_idx)
                pu[mid_u, 0] = 0.0

        # 3b) Exposed outer/lower posterior glute & sub-gluteal hamstring fullness (`strictly outside `w_cov_u`, ZERO cleft trench!`):
        nx_gl, nz_gl = 40, 72
        x_gl = np.linspace(0.018, 0.210 if is_ext_full else 0.185, nx_gl)
        z_gl = np.linspace(0.780, 1.150, nz_gl)
        Y_gl = np.full((nx_gl, nz_gl), np.nan, dtype=np.float64)
        for ix_g, xq_g in enumerate(x_gl):
            for iz_g, zq_g in enumerate(z_gl):
                ys_lr = []
                for sx_g in (-1.0, 1.0):
                    rh_g, rn_g, _, _ = bvh_don.ray_cast(Vector((sx_g * float(xq_g), 0.38, float(zq_g))), Vector((0.0, -1.0, 0.0)), 0.36)
                    if rh_g is not None and float(rh_g.y) > 0.030 and float(rn_g.y) > 0.12:
                        ys_lr.append(float(rh_g.y))
                if ys_lr:
                    Y_gl[ix_g, iz_g] = float(np.mean(ys_lr))
        for ix_g in range(nx_gl):
            ok_zg = np.isfinite(Y_gl[ix_g])
            if np.any(ok_zg):
                Y_gl[ix_g] = np.interp(z_gl, z_gl[ok_zg], Y_gl[ix_g, ok_zg])
        for iz_g in range(nz_gl):
            ok_xg = np.isfinite(Y_gl[:, iz_g])
            if np.any(ok_xg):
                Y_gl[:, iz_g] = np.interp(x_gl, x_gl[ok_xg], Y_gl[ok_xg, iz_g])
        if np.all(np.isfinite(Y_gl)):
            for _ in range(6):
                Y_gl[1:-1, :] = 0.25 * Y_gl[:-2, :] + 0.50 * Y_gl[1:-1, :] + 0.25 * Y_gl[2:, :]
                Y_gl[:, 1:-1] = 0.25 * Y_gl[:, :-2] + 0.50 * Y_gl[:, 1:-1] + 0.25 * Y_gl[:, 2:]
            posed_gl = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
            px_gl, py_gl, pz_gl = np.abs(posed_gl[:, 0]), posed_gl[:, 1], posed_gl[:, 2]
            w_gl_u = (
                ad_g
                * w_exp_gate
                * smootherstep((px_gl - 0.022) / 0.018)
                * (1.0 - smootherstep((px_gl - (0.195 if is_ext_full else 0.165)) / 0.030))
                * smootherstep((pz_gl - 0.790) / 0.025)
                * (1.0 - smootherstep((pz_gl - 1.135) / 0.030))
                * smootherstep((py_gl - 0.015) / 0.030)
            )
            gl_act = np.flatnonzero(w_gl_u > 0.005)
            dx_gl, dz_gl = float(x_gl[1] - x_gl[0]), float(z_gl[1] - z_gl[0])
            for u_g in gl_act:
                fx_g = float(np.clip((px_gl[u_g] - float(x_gl[0])) / dx_gl, 0.0, float(nx_gl - 1) - 1e-6))
                fz_g = float(np.clip((pz_gl[u_g] - float(z_gl[0])) / dz_gl, 0.0, float(nz_gl - 1) - 1e-6))
                ix0_g, iz0_g = int(fx_g), int(fz_g)
                tx_g, tz_g = fx_g - ix0_g, fz_g - iz0_g
                yt_g = (
                    (1.0 - tx_g) * ((1.0 - tz_g) * Y_gl[ix0_g, iz0_g] + tz_g * Y_gl[ix0_g, iz0_g + 1])
                    + tx_g * ((1.0 - tz_g) * Y_gl[ix0_g + 1, iz0_g] + tz_g * Y_gl[ix0_g + 1, iz0_g + 1])
                )
                dy_push = max(0.0, float(yt_g - py_gl[u_g])) * float(w_gl_u[u_g])
                if dy_push > 1e-5:
                    try:
                        dp_g = np.linalg.solve(jac_u[u_g], np.array([0.0, dy_push, 0.0], dtype=np.float64))
                    except np.linalg.LinAlgError:
                        dp_g = np.array([0.0, dy_push, 0.0], dtype=np.float64)
                    if float(np.linalg.norm(dp_g)) <= 0.075:
                        pu[u_g] += dp_g
            f_idx = np.union1d(f_idx, gl_act)
            pu[mid_u, 0] = 0.0

        # 3c) Sunken 3D umbilicus + oblique thoracolumbar back rolls + overhanging belly-apron crescent above `z_f_top`:
        keep_td = (np.abs(fc_d[:, 0]) < 0.275) & (fc_d[:, 2] >= 1.10) & (fc_d[:, 2] <= 1.54)
        if int(np.sum(keep_td)) >= 200:
            bvh_td = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[keep_td].tolist(), all_triangles=True)
            posed_td = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
            z_nav_src = 1.201
            if is_ext_full:
                zs_nd = np.linspace(1.125, 1.26, 55)
                ys_nd = np.full_like(zs_nd, np.nan)
                for iz_nd, zv_nd in enumerate(zs_nd):
                    m_nd = (np.abs(donor_xyz[:, 0]) <= 0.014) & (np.abs(donor_xyz[:, 2] - zv_nd) <= 0.0045) & (donor_xyz[:, 1] < -0.20)
                    if np.sum(m_nd) >= 3:
                        ys_nd[iz_nd] = float(np.percentile(donor_xyz[m_nd, 1], 80))
                ok_nd = np.isfinite(ys_nd)
                if np.sum(ok_nd) >= 12:
                    ys_nd = np.interp(zs_nd, zs_nd[ok_nd], ys_nd[ok_nd])
                    ys_env_nd = ys_nd.copy()
                    for st_nd in (8, 5, 3):
                        for _ in range(12):
                            ym_nd = 0.5 * (ys_env_nd[: -2 * st_nd] + ys_env_nd[2 * st_nd :])
                            ys_env_nd[st_nd:-st_nd] = np.minimum(ys_env_nd[st_nd:-st_nd], ym_nd)
                    pit_nd = ys_nd - ys_env_nd
                    in_nd = (zs_nd >= 1.168) & (zs_nd <= 1.245)
                    bi_nd = int(np.flatnonzero(in_nd)[int(np.argmax(pit_nd[in_nd]))])
                    if float(pit_nd[bi_nd]) >= 0.0018:
                        z_nav_src = float(zs_nd[bi_nd])
            m_fit_c = (np.abs(posed_td[:, 0]) <= 0.014) & (np.abs(posed_td[:, 2] - z_nav_src) <= 0.010) & (posed_td[:, 1] < -0.20)
            m_fit_r = (np.abs(posed_td[:, 0]) >= 0.026) & (np.abs(posed_td[:, 0]) <= 0.048) & (np.abs(posed_td[:, 2] - z_nav_src) <= 0.022) & (posed_td[:, 1] < -0.20)
            existing_pit = (
                max(0.0, float(np.percentile(posed_td[m_fit_c, 1], 75)) - float(np.percentile(posed_td[m_fit_r, 1], 35)))
                if (np.sum(m_fit_c) >= 2 and np.sum(m_fit_r) >= 4 and z_nav_src != 1.201)
                else 0.0
            )
            nav_add_depth = float(np.clip(0.0125 - 0.45 * existing_pit, 0.0095, 0.0125)) if is_ext_full else 0.0095
            m_can_nav = mid_u & (np.abs(ru[:, 2] - 1.2207) < 0.006) & (ru[:, 1] < -0.08)
            z_cur_can_nav = float(np.mean(posed_td[m_can_nav, 2])) if (is_ext_full and np.any(m_can_nav)) else 1.222
            dz_nav_peak = float(np.clip(z_nav_src - z_cur_can_nav, -0.026, 0.022)) if is_ext_full else -0.021
            z_pit_ctr = z_cur_can_nav if is_ext_full else z_nav_src
            r_nav_u = np.hypot(posed_td[:, 0] / 0.025, (posed_td[:, 2] - z_pit_ctr) / 0.024)
            w_nav_pit = ad_g * np.exp(-1.55 * (r_nav_u ** 2)) * smootherstep((-posed_td[:, 1] - 0.22) / 0.04)
            r_nav_slide = np.hypot(posed_td[:, 0] / 0.048, (posed_td[:, 2] - z_pit_ctr) / 0.046)
            w_nav_slide = ad_g * np.exp(-1.1 * (r_nav_slide ** 2)) * smootherstep((-posed_td[:, 1] - 0.22) / 0.04)
            nav_idx = np.flatnonzero(w_nav_slide > 0.02)
            for ui_n in nav_idx:
                hood_z = float(posed_td[ui_n, 2]) - z_nav_src
                dy_nav = (nav_add_depth * float(w_nav_pit[ui_n])) - (
                    0.0018 * ad_g * max(0.0, hood_z / 0.016) * float(np.exp(-(((hood_z - 0.016) / 0.012) ** 2))) * float(np.exp(-((posed_td[ui_n, 0] / 0.022) ** 2)))
                )
                dz_nav = dz_nav_peak * float(w_nav_slide[ui_n])
                try:
                    pu[ui_n] += np.linalg.solve(jac_u[ui_n], np.array([0.0, dy_nav, dz_nav], dtype=np.float64))
                except np.linalg.LinAlgError:
                    pu[ui_n, 1] += dy_nav
                    pu[ui_n, 2] += dz_nav
            f_idx = np.union1d(f_idx, nav_idx)
            pu[mid_u, 0] = 0.0

            px_bk, py_bk, pz_bk = np.abs(posed_td[:, 0]), posed_td[:, 1], posed_td[:, 2]
            w_bk_roll = (
                ad_g
                * smootherstep((px_bk - 0.018) / 0.022)
                * (1.0 - smootherstep((px_bk - 0.215) / 0.028))
                * smootherstep((pz_bk - 1.232) / 0.032)
                * (1.0 - smootherstep((pz_bk - 1.475) / 0.035))
                * smootherstep((py_bk - 0.045) / 0.030)
            )
            bk_idx = np.flatnonzero(w_bk_roll > 0.01)
            for ui_b in bk_idx:
                xb_q, zb_q = float(px_bk[ui_b]), float(pz_bk[ui_b])
                ys_bk = []
                for sx_b in ((-1.0, 1.0) if xb_q > 1e-4 else (1.0,)):
                    rh_b, rn_b, _, _ = bvh_td.ray_cast(Vector((sx_b * xb_q, 0.36, zb_q)), Vector((0.0, -1.0, 0.0)), 0.34)
                    if rh_b is not None and float(rh_b.y) > 0.04 and float(rn_b.y) > 0.20:
                        ys_bk.append(float(rh_b.y))
                if ys_bk:
                    dy_bk = float(w_bk_roll[ui_b]) * (float(np.mean(ys_bk)) - float(py_bk[ui_b]))
                    if abs(dy_bk) < 0.025:
                        try:
                            pu[ui_b] += np.linalg.solve(jac_u[ui_b], np.array([0.0, dy_bk, 0.0], dtype=np.float64))
                        except np.linalg.LinAlgError:
                            pu[ui_b, 1] += dy_bk
            f_idx = np.union1d(f_idx, bk_idx)
            pu[mid_u, 0] = 0.0

        # Full 100% Donor bare lower-stomach correspondence right down to the sub-apron crease root (`including overhanging belly
        # underside triangles where Meshy bled white pixels inside the crease, keeping a 3.5 mm vertical seam separation above posed_br`):
        bvh_ap_d = None
        keep_ap_d = (
            (np.abs(fc_d[:, 0]) <= 0.205)
            & (fc_d[:, 2] >= z_f_top - 0.002)
            & (fc_d[:, 2] <= 1.215)
            & (fc_d[:, 1] < -0.08)
        )
        if donor_bridged_thigh_faces is not None and len(donor_bridged_thigh_faces) == len(donor_tri):
            keep_ap_d &= ~np.asarray(donor_bridged_thigh_faces, dtype=bool)
        if int(np.sum(keep_ap_d)) >= 80:
            bvh_ap_d = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[keep_ap_d].tolist(), all_triangles=True)

            def _project_bare_lower_stomach_y(gain_st: float) -> np.ndarray:
                posed_ap = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
                px_ap, py_ap, pz_ap = np.abs(posed_ap[:, 0]), posed_ap[:, 1], posed_ap[:, 2]
                z_wb_ap = np.interp(np.clip(posed_ap[:, 0], wb_f_x[0], wb_f_x[-1]), wb_f_x, wb_f_z)
                w_ap_rim = (
                    ad_g
                    * (1.0 - smootherstep((px_ap - 0.172) / 0.024))
                    * smootherstep((pz_ap - (z_wb_ap + 0.0030)) / 0.0055)
                    * (1.0 - smootherstep((pz_ap - 1.162) / 0.026))
                    * smootherstep((-py_ap - 0.145) / 0.030)
                    * (1.0 - np.where((px_ap <= 0.036) & (pz_ap >= 1.148), 1.0, 0.0))
                )
                ap_idx_loc = np.flatnonzero(w_ap_rim > 0.01)
                for u_ap in ap_idx_loc:
                    x_abs_q = float(px_ap[u_ap])
                    y_cur_q = float(py_ap[u_ap])
                    z_cur_q = float(pz_ap[u_ap])
                    ys_lr_ap: list[float] = []
                    for sx_ap in ((-1.0, 1.0) if x_abs_q > 1e-4 else (1.0,)):
                        dh_ap, dn_ap, _, _ = bvh_ap_d.ray_cast(Vector((sx_ap * x_abs_q, -0.39, z_cur_q)), Vector((0.0, 1.0, 0.0)), 0.36)
                        if dh_ap is not None and float(dh_ap.y) < -0.14 and (float(dn_ap.y) < -0.04 or float(dn_ap.z) < -0.25):
                            ys_lr_ap.append(float(dh_ap.y))
                    if ys_lr_ap:
                        dy_ap_p = (gain_st * float(w_ap_rim[u_ap])) * (float(np.mean(ys_lr_ap)) - y_cur_q)
                        if abs(dy_ap_p) > 1e-5:
                            try:
                                dp_ap_r = np.linalg.solve(jac_u[u_ap], np.array([0.0, dy_ap_p, 0.0], dtype=np.float64))
                            except np.linalg.LinAlgError:
                                dp_ap_r = np.array([0.0, dy_ap_p, 0.0], dtype=np.float64)
                            nrm_apr = float(np.linalg.norm(dp_ap_r))
                            if nrm_apr > 0.045:
                                dp_ap_r *= 0.045 / nrm_apr
                            pu[u_ap] += dp_ap_r
                pu[mid_u, 0] = 0.0
                return ap_idx_loc

            for gain_ap in (0.94, 0.92):
                f_idx = np.union1d(f_idx, _project_bare_lower_stomach_y(gain_ap))

        # 3d) Extreme-muscle `F=100%` lower medial thighs (`X_med_d`) + subtle `LOD0` elbow fullness:
        if is_ext_full:
            keep_med_d = (np.abs(fc_d[:, 0]) <= 0.072) & (fc_d[:, 2] >= 0.650) & (fc_d[:, 2] <= 0.902)
            if donor_bridged_thigh_faces is not None and len(donor_bridged_thigh_faces) == len(donor_tri):
                keep_med_d &= ~np.asarray(donor_bridged_thigh_faces, dtype=bool)
            if int(np.sum(keep_med_d)) >= 60:
                z_md_g = np.linspace(0.660, 0.892, 40)
                y_md_g = np.linspace(-0.085, 0.065, 20)
                X_med_d = np.full((len(z_md_g), len(y_md_g)), np.nan, dtype=np.float64)
                d_med_pts = donor_xyz[np.unique(donor_tri[keep_med_d].ravel())]
                for iz_m, zv_m in enumerate(z_md_g):
                    mz_d = np.abs(d_med_pts[:, 2] - zv_m) < 0.012
                    if np.sum(mz_d) >= 4:
                        for iy_m, yv_m in enumerate(y_md_g):
                            my_d = mz_d & (np.abs(d_med_pts[:, 1] - yv_m) < 0.022) & (np.abs(d_med_pts[:, 0]) <= 0.064)
                            if np.sum(my_d) >= 2:
                                X_med_d[iz_m, iy_m] = max(0.0040, float(np.percentile(np.abs(d_med_pts[my_d, 0]), 2)))
                        ok_ym = np.isfinite(X_med_d[iz_m])
                        if np.any(ok_ym):
                            X_med_d[iz_m] = np.interp(y_md_g, y_md_g[ok_ym], X_med_d[iz_m, ok_ym])
                for iy_m in range(len(y_md_g)):
                    ok_zm = np.isfinite(X_med_d[:, iy_m])
                    if np.any(ok_zm):
                        X_med_d[:, iy_m] = np.interp(z_md_g, z_md_g[ok_zm], X_med_d[ok_zm, iy_m])
                for iz_m in range(len(z_md_g)):
                    ok_ym2 = np.isfinite(X_med_d[iz_m])
                    if np.any(ok_ym2):
                        X_med_d[iz_m] = np.interp(y_md_g, y_md_g[ok_ym2], X_med_d[iz_m, ok_ym2])
                if np.all(np.isfinite(X_med_d)):
                    for _ in range(3):
                        X_med_d[1:-1, :] = 0.25 * X_med_d[:-2, :] + 0.50 * X_med_d[1:-1, :] + 0.25 * X_med_d[2:, :]
                        X_med_d[:, 1:-1] = 0.25 * X_med_d[:, :-2] + 0.50 * X_med_d[:, 1:-1] + 0.25 * X_med_d[:, 2:]
                    dz_md, dy_md = float(z_md_g[1] - z_md_g[0]), float(y_md_g[1] - y_md_g[0])
                    z_med_ceil = min(z_cr_min - 0.002, 0.888)
                    for _ in range(5):
                        posed_md = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
                        px_md, py_md, pz_md = posed_md[:, 0], posed_md[:, 1], posed_md[:, 2]
                        ax_md = np.abs(px_md)
                        w_med_in = (
                            (~mid_u)
                            * w_exp_gate
                            * (1.0 - smootherstep((ax_md - 0.056) / 0.024))
                            * smootherstep((pz_md - 0.665) / 0.025)
                            * (1.0 - smootherstep((pz_md - z_med_ceil) / 0.014))
                            * (1.0 - smootherstep((np.abs(py_md) - 0.112) / 0.028))
                        )
                        med_idx = np.flatnonzero(w_med_in > 0.01)
                        for u_m in med_idx:
                            fz_m = float(np.clip((pz_md[u_m] - float(z_md_g[0])) / dz_md, 0.0, float(len(z_md_g) - 1) - 1e-6))
                            fy_m = float(np.clip((py_md[u_m] - float(y_md_g[0])) / dy_md, 0.0, float(len(y_md_g) - 1) - 1e-6))
                            iz0_m, iy0_m = int(fz_m), int(fy_m)
                            tz_m, ty_m = fz_m - iz0_m, fy_m - iy0_m
                            xt_m = (
                                (1.0 - tz_m) * ((1.0 - ty_m) * X_med_d[iz0_m, iy0_m] + ty_m * X_med_d[iz0_m, iy0_m + 1])
                                + tz_m * ((1.0 - ty_m) * X_med_d[iz0_m + 1, iy0_m] + ty_m * X_med_d[iz0_m + 1, iy0_m + 1])
                            )
                            if ax_md[u_m] > xt_m + 0.0002:
                                sgn_m = 1.0 if px_md[u_m] >= 0.0 else -1.0
                                dx_m = sgn_m * (xt_m - ax_md[u_m]) * (0.88 * float(w_med_in[u_m]))
                                try:
                                    dp_m = np.linalg.solve(jac_u[u_m], np.array([dx_m, 0.0, 0.0], dtype=np.float64))
                                except np.linalg.LinAlgError:
                                    dp_m = np.array([dx_m, 0.0, 0.0], dtype=np.float64)
                                if float(np.linalg.norm(dp_m)) <= 0.045:
                                    pu[u_m] += dp_m
                        f_idx = np.union1d(f_idx, med_idx)
                        pu[mid_u, 0] = 0.0

            keep_el_d = (np.abs(fc_d[:, 0]) >= 0.25) & (np.abs(fc_d[:, 0]) <= 0.44) & (fc_d[:, 2] >= 1.24) & (fc_d[:, 2] <= 1.42)
            if int(np.sum(keep_el_d)) >= 60:
                bvh_el_d = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[keep_el_d].tolist(), all_triangles=True)
                posed_el = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
                px_el_a, pz_el = np.abs(posed_el[:, 0]), posed_el[:, 2]
                w_el_r = (
                    smootherstep((px_el_a - 0.270) / 0.025)
                    * (1.0 - smootherstep((px_el_a - 0.415) / 0.025))
                    * smootherstep((pz_el - 1.265) / 0.025)
                    * (1.0 - smootherstep((pz_el - 1.395) / 0.025))
                )
                el_idx = np.flatnonzero(w_el_r > 0.02)
                for u_el in el_idx:
                    dh_el, dn_el, _, dd_el = bvh_el_d.find_nearest(Vector(posed_el[u_el].tolist()), 0.016)
                    if dh_el is not None and dd_el < 0.012:
                        dn_v = np.asarray(dn_el, dtype=np.float64)
                        out_d = float(np.dot(np.asarray(dh_el, dtype=np.float64) - posed_el[u_el], dn_v))
                        if 0.0002 < out_d < 0.0045:
                            dp_el_p = (0.78 * float(w_el_r[u_el]) * out_d) * dn_v
                            try:
                                dp_el_r = np.linalg.solve(jac_u[u_el], dp_el_p)
                            except np.linalg.LinAlgError:
                                dp_el_r = dp_el_p
                            if float(np.linalg.norm(dp_el_r)) <= 0.006:
                                pu[u_el] += dp_el_r
                f_idx = np.union1d(f_idx, el_idx)
    else:
        # `F = 0` (`M100-F000`, `M000-F000`) exposed thigh/sub-groin/sub-gluteal restorations outside `w_cov_u`:
        if open_gap_don > 0.15:
            keep_med_d = (np.abs(fc_d[:, 0]) < 0.26) & (fc_d[:, 2] >= 0.78) & (fc_d[:, 2] <= 1.04)
            bvh_don_med = (
                BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[keep_med_d].tolist(), all_triangles=True)
                if open_gap_don > 0.5 and int(np.sum(keep_med_d)) >= 200
                else bvh_don
            )
            z_tm = np.linspace(0.822, 0.978, 42)
            psi_tm = np.linspace(-np.deg2rad(84.0), np.deg2rad(84.0), 45)
            R_tm = np.full((len(z_tm), len(psi_tm)), np.nan, dtype=np.float64)
            xc_th, yc_th = 0.088, -0.004
            for iz_m, zq_m in enumerate(z_tm):
                for ip_m, ps_m in enumerate(psi_tm):
                    cs_m, sn_m = float(np.cos(ps_m)), float(np.sin(ps_m))
                    rs_lr: list[float] = []
                    for sx_m in (-1.0, 1.0):
                        orig_m = Vector((sx_m * xc_th, yc_th, float(zq_m)))
                        dir_m = Vector((-sx_m * cs_m, sn_m, 0.0))
                        rh_m, _, _, rd_m = bvh_don_med.ray_cast(orig_m, dir_m, 0.080)
                        if rh_m is not None and 0.012 <= abs(float(rh_m.x)) <= 0.095:
                            rs_lr.append(float(rd_m))
                    if rs_lr:
                        R_tm[iz_m, ip_m] = float(np.mean(rs_lr))
            for ip_m in range(len(psi_tm)):
                ok_zm = np.isfinite(R_tm[:, ip_m])
                if np.any(ok_zm):
                    R_tm[:, ip_m] = np.interp(z_tm, z_tm[ok_zm], R_tm[ok_zm, ip_m])
            for iz_m in range(len(z_tm)):
                ok_pm = np.isfinite(R_tm[iz_m])
                if np.any(ok_pm):
                    R_tm[iz_m] = np.interp(psi_tm, psi_tm[ok_pm], R_tm[iz_m, ok_pm])
            if np.all(np.isfinite(R_tm)):
                for _ in range(6):
                    R_tm[1:-1, :] = 0.25 * R_tm[:-2, :] + 0.50 * R_tm[1:-1, :] + 0.25 * R_tm[2:, :]
                    R_tm[:, 1:-1] = 0.25 * R_tm[:, :-2] + 0.50 * R_tm[:, 1:-1] + 0.25 * R_tm[:, 2:]
                dz_tm, dp_tm = float(z_tm[1] - z_tm[0]), float(psi_tm[1] - psi_tm[0])
                for _it_tm in range(3):
                    posed_tm = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
                    nrm_tm = vertex_normals(posed_tm[weld], tri, weld)[first_u]
                    dx_th_u = -sgn_all * (posed_tm[:, 0] - sgn_all * xc_th)
                    dy_th_u = posed_tm[:, 1] - yc_th
                    r_th_u = np.hypot(dx_th_u, dy_th_u)
                    psi_u = np.arctan2(dy_th_u, np.maximum(dx_th_u, 1e-6))
                    w_tm_u = (
                        open_gap_don
                        * w_exp_gate
                        * np.where(~mid_u, 1.0, 0.0)
                        * smootherstep((dx_th_u - 0.004) / 0.016)
                        * (1.0 - smootherstep((np.abs(psi_u) - np.deg2rad(74.0)) / np.deg2rad(12.0)))
                        * smootherstep((posed_tm[:, 2] - 0.828) / 0.024)
                        * (1.0 - smootherstep((posed_tm[:, 2] - 0.966) / 0.018))
                        * smootherstep((-sgn_all * nrm_tm[:, 0] - 0.08) / 0.20)
                    )
                    tm_idx = np.flatnonzero((w_tm_u > 0.005) & (r_th_u > 1e-4))
                    for u_m in tm_idx:
                        fz_m = float(np.clip((posed_tm[u_m, 2] - float(z_tm[0])) / dz_tm, 0.0, float(len(z_tm) - 1) - 1e-6))
                        fp_m = float(np.clip((psi_u[u_m] - float(psi_tm[0])) / dp_tm, 0.0, float(len(psi_tm) - 1) - 1e-6))
                        iz0_m, ip0_m = int(fz_m), int(fp_m)
                        tz_m, tp_m = fz_m - iz0_m, fp_m - ip0_m
                        rt_m = (
                            (1.0 - tz_m) * ((1.0 - tp_m) * R_tm[iz0_m, ip0_m] + tp_m * R_tm[iz0_m, ip0_m + 1])
                            + tz_m * ((1.0 - tp_m) * R_tm[iz0_m + 1, ip0_m] + tp_m * R_tm[iz0_m + 1, ip0_m + 1])
                        )
                        wm_a = (0.88 if _it_tm == 0 else 0.75) * float(w_tm_u[u_m])
                        rn_m_u = (1.0 - wm_a) * float(r_th_u[u_m]) + wm_a * float(rt_m)
                        sx_u = float(sgn_all[u_m])
                        xt_u = sx_u * (xc_th - rn_m_u * float(np.cos(psi_u[u_m])))
                        yt_u = yc_th + rn_m_u * float(np.sin(psi_u[u_m]))
                        dp_p_m = np.array([xt_u - float(posed_tm[u_m, 0]), yt_u - float(posed_tm[u_m, 1]), 0.0], dtype=np.float64)
                        try:
                            dp_r_m = np.linalg.solve(jac_u[u_m], dp_p_m)
                        except np.linalg.LinAlgError:
                            dp_r_m = dp_p_m
                        if float(np.linalg.norm(dp_r_m)) <= 0.065:
                            pu[u_m] += dp_r_m
                    f_idx = np.union1d(f_idx, tm_idx)

            x_al = np.linspace(0.018, 0.130, 30)
            z_al = np.linspace(0.840, 1.008, 36)
            Y_al = np.full((len(x_al), len(z_al)), np.nan, dtype=np.float64)
            for ix_a, xq_a in enumerate(x_al):
                for iz_a, zq_a in enumerate(z_al):
                    ys_a = []
                    for sx_a in (-1.0, 1.0):
                        rh_a, rn_a, _, _ = bvh_don_med.ray_cast(Vector((sx_a * float(xq_a), -0.32, float(zq_a))), Vector((0.0, 1.0, 0.0)), 0.30)
                        if rh_a is not None and float(rh_a.y) < -0.040 and float(rn_a.y) < -0.15:
                            ys_a.append(float(rh_a.y))
                    if ys_a:
                        Y_al[ix_a, iz_a] = float(np.mean(ys_a))
            for ix_a in range(len(x_al)):
                ok_za = np.isfinite(Y_al[ix_a])
                if np.any(ok_za):
                    Y_al[ix_a] = np.interp(z_al, z_al[ok_za], Y_al[ix_a, ok_za])
            for iz_a in range(len(z_al)):
                ok_xa = np.isfinite(Y_al[:, iz_a])
                if np.any(ok_xa):
                    Y_al[:, iz_a] = np.interp(x_al, x_al[ok_xa], Y_al[ok_xa, iz_a])
            if np.all(np.isfinite(Y_al)):
                for _ in range(8):
                    Y_al[1:-1, :] = 0.25 * Y_al[:-2, :] + 0.50 * Y_al[1:-1, :] + 0.25 * Y_al[2:, :]
                    Y_al[:, 1:-1] = 0.25 * Y_al[:, :-2] + 0.50 * Y_al[:, 1:-1] + 0.25 * Y_al[:, 2:]
                dx_al, dz_al = float(x_al[1] - x_al[0]), float(z_al[1] - z_al[0])
                for _ in range(2):
                    posed_al = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
                    px_al, py_al, pz_al = np.abs(posed_al[:, 0]), posed_al[:, 1], posed_al[:, 2]
                    w_al = (
                        open_gap_don
                        * w_exp_gate
                        * smootherstep((px_al - 0.018) / 0.012)
                        * (1.0 - smootherstep((px_al - 0.120) / 0.024))
                        * smootherstep((pz_al - 0.848) / 0.024)
                        * (1.0 - smootherstep((pz_al - 0.995) / 0.024))
                        * smootherstep((-py_al - 0.035) / 0.028)
                    )
                    al_idx = np.flatnonzero(w_al > 0.005)
                    for u_al in al_idx:
                        fx_a = float(np.clip((px_al[u_al] - float(x_al[0])) / dx_al, 0.0, float(len(x_al) - 1) - 1e-6))
                        fz_a = float(np.clip((pz_al[u_al] - float(z_al[0])) / dz_al, 0.0, float(len(z_al) - 1) - 1e-6))
                        ix0_a, iz0_a = int(fx_a), int(fz_a)
                        tx_a, tz_a = fx_a - ix0_a, fz_a - iz0_a
                        yt_a = (
                            (1.0 - tx_a) * ((1.0 - tz_a) * Y_al[ix0_a, iz0_a] + tz_a * Y_al[ix0_a, iz0_a + 1])
                            + tx_a * ((1.0 - tz_a) * Y_al[ix0_a + 1, iz0_a] + tz_a * Y_al[ix0_a + 1, iz0_a + 1])
                        )
                        dy_a = min(0.0, float(yt_a - py_al[u_al])) * (0.88 * float(w_al[u_al]))
                        if dy_a < -1e-5:
                            try:
                                dp_a = np.linalg.solve(jac_u[u_al], np.array([0.0, dy_a, 0.0], dtype=np.float64))
                            except np.linalg.LinAlgError:
                                dp_a = np.array([0.0, dy_a, 0.0], dtype=np.float64)
                            if float(np.linalg.norm(dp_a)) <= 0.055:
                                pu[u_al] += dp_a
                    f_idx = np.union1d(f_idx, al_idx)

        keep_sg_d = (np.abs(fc_d[:, 0]) < 0.26) & (fc_d[:, 2] >= 0.80) & (fc_d[:, 2] <= 1.12)
        bvh_sg_don = (
            BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[keep_sg_d].tolist(), all_triangles=True)
            if open_gap_don > 0.5 and int(np.sum(keep_sg_d)) >= 200
            else bvh_don
        )
        z_sg_top = 1.078 if open_gap_don > 0.5 else 1.030
        x_sg = np.linspace(0.014, 0.115, 28)
        z_sg = np.linspace(0.880, z_sg_top, 42)
        Y_sg = np.full((len(x_sg), len(z_sg)), np.nan, dtype=np.float64)
        for ix_s, xq_s in enumerate(x_sg):
            for iz_s, zq_s in enumerate(z_sg):
                ys_s = []
                for sx_s in (-1.0, 1.0):
                    rh_s, rn_s, _, _ = bvh_sg_don.ray_cast(Vector((sx_s * float(xq_s), 0.30, float(zq_s))), Vector((0.0, -1.0, 0.0)), 0.28)
                    if rh_s is not None and float(rh_s.y) > 0.020 and float(rn_s.y) > 0.16:
                        ys_s.append(float(rh_s.y))
                if ys_s:
                    Y_sg[ix_s, iz_s] = float(np.mean(ys_s))
        for ix_s in range(len(x_sg)):
            ok_zs = np.isfinite(Y_sg[ix_s])
            if np.any(ok_zs):
                Y_sg[ix_s] = np.interp(z_sg, z_sg[ok_zs], Y_sg[ix_s, ok_zs])
        for iz_s in range(len(z_sg)):
            ok_xs = np.isfinite(Y_sg[:, iz_s])
            if np.any(ok_xs):
                Y_sg[:, iz_s] = np.interp(x_sg, x_sg[ok_xs], Y_sg[ok_xs, iz_s])
        if np.all(np.isfinite(Y_sg)):
            for _ in range(5):
                Y_sg[1:-1, :] = 0.25 * Y_sg[:-2, :] + 0.50 * Y_sg[1:-1, :] + 0.25 * Y_sg[2:, :]
                Y_sg[:, 1:-1] = 0.25 * Y_sg[:, :-2] + 0.50 * Y_sg[:, 1:-1] + 0.25 * Y_sg[:, 2:]
            dx_sg, dz_sg = float(x_sg[1] - x_sg[0]), float(z_sg[1] - z_sg[0])
            for _it_sg in range(3 if open_gap_don > 0.5 else 1):
                posed_sg = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
                px_sg, py_sg, pz_sg = np.abs(posed_sg[:, 0]), posed_sg[:, 1], posed_sg[:, 2]
                w_sg = (
                    w_exp_gate
                    * smootherstep((px_sg - 0.014) / 0.012)
                    * (1.0 - smootherstep((px_sg - (0.108 if open_gap_don > 0.5 else 0.095)) / 0.022))
                    * smootherstep((pz_sg - 0.890) / 0.024)
                    * (1.0 - smootherstep((pz_sg - (1.068 if open_gap_don > 0.5 else 1.018)) / 0.024))
                    * smootherstep((py_sg - 0.020) / 0.024)
                )
                sg_idx = np.flatnonzero(w_sg > 0.005)
                for u_s in sg_idx:
                    fx_s = float(np.clip((px_sg[u_s] - float(x_sg[0])) / dx_sg, 0.0, float(len(x_sg) - 1) - 1e-6))
                    fz_s = float(np.clip((pz_sg[u_s] - float(z_sg[0])) / dz_sg, 0.0, float(len(z_sg) - 1) - 1e-6))
                    ix0_s, iz0_s = int(fx_s), int(fz_s)
                    tx_s, tz_s = fx_s - ix0_s, fz_s - iz0_s
                    yt_s = (
                        (1.0 - tx_s) * ((1.0 - tz_s) * Y_sg[ix0_s, iz0_s] + tz_s * Y_sg[ix0_s, iz0_s + 1])
                        + tx_s * ((1.0 - tz_s) * Y_sg[ix0_s + 1, iz0_s] + tz_s * Y_sg[ix0_s + 1, iz0_s + 1])
                    )
                    dy_s = max(0.0, float(yt_s - py_sg[u_s])) * (0.85 * float(w_sg[u_s]))
                    if dy_s > 1e-5:
                        try:
                            dp_s = np.linalg.solve(jac_u[u_s], np.array([0.0, dy_s, 0.0], dtype=np.float64))
                        except np.linalg.LinAlgError:
                            dp_s = np.array([0.0, dy_s, 0.0], dtype=np.float64)
                        if float(np.linalg.norm(dp_s)) <= 0.055:
                            pu[u_s] += dp_s
                f_idx = np.union1d(f_idx, sg_idx)

        if ms_g > 0.55 and open_gap_don < 0.15:
            posed_ad = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)
            nrm_ad = vertex_normals(posed_ad[weld], tri, weld)[first_u]
            px_ad = np.abs(posed_ad[:, 0])
            w_ad_in = (
                float(np.clip((ms_g - 0.5) * 2.0, 0.0, 1.0))
                * w_exp_gate
                * np.where(~mid_u, 1.0, 0.0)
                * (1.0 - smootherstep((px_ad - 0.052) / 0.022))
                * smootherstep((posed_ad[:, 2] - 0.872) / 0.024)
                * (1.0 - smootherstep((posed_ad[:, 2] - 0.958) / 0.018))
                * (1.0 - smootherstep((np.abs(posed_ad[:, 1]) - 0.072) / 0.024))
                * smootherstep((-sgn_all * nrm_ad[:, 0] - 0.12) / 0.22)
            )
            ad_idx = np.flatnonzero(w_ad_in > 0.005)
            for u_ad in ad_idx:
                sx_ad = float(sgn_all[u_ad])
                x_cur_ad = float(px_ad[u_ad])
                x_new_ad = max(0.0042, x_cur_ad - 0.0054 * float(w_ad_in[u_ad]))
                dx_p_ad = sx_ad * (x_new_ad - x_cur_ad)
                try:
                    dp_ad = np.linalg.solve(jac_u[u_ad], np.array([dx_p_ad, 0.0, 0.0], dtype=np.float64))
                except np.linalg.LinAlgError:
                    dp_ad = np.array([dx_p_ad, 0.0, 0.0], dtype=np.float64)
                pu[u_ad] += dp_ad
            f_idx = np.union1d(f_idx, ad_idx)

    # 4) Re-enforce covered bare-skin inset after exposed-skin restorations + smooth blend-rim tangent spacing + `+-X` symmetry:
    _project_covered_bare_skin(0.95)
    if len(f_idx):
        for _ in range(3):
            nrm_f2 = vertex_normals(pu[weld], tri, weld)[first_u][f_idx]
            nbr_f2 = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            dp_f2 = nbr_f2[f_idx] - pu[f_idx]
            dp_f2t = dp_f2 - np.einsum("ni,ni->n", dp_f2, nrm_f2)[:, None] * nrm_f2
            pu[f_idx] += 0.22 * dp_f2t
            pu[mid_u, 0] = 0.0
    _project_covered_bare_skin(0.90)
    if ad_g > 0.20 and bvh_ap_d is not None:
        _project_bare_lower_stomach_y(0.95)

    kd_s = KDTree(n_u)
    for ui_s, pt_s in enumerate(ru):
        kd_s.insert(pt_s.tolist(), ui_s)
    kd_s.balance()
    pu_sym = pu.copy()
    for ui_s in f_idx:
        if mid_u[ui_s]:
            pu_sym[ui_s, 0] = 0.0
        else:
            _, jm_s, dm_s = kd_s.find([-float(ru[ui_s, 0]), float(ru[ui_s, 1]), float(ru[ui_s, 2])])
            if jm_s is not None and dm_s < 4.0e-4:
                pu_sym[ui_s, 0] = 0.5 * (pu[ui_s, 0] - pu[jm_s, 0])
                pu_sym[ui_s, 1] = 0.5 * (pu[ui_s, 1] + pu[jm_s, 1])
                pu_sym[ui_s, 2] = 0.5 * (pu[ui_s, 2] + pu[jm_s, 2])
    pu = pu_sym
    pu[mid_u, 0] = 0.0

    ref_areas = face_areas(ref_pts, tri)
    base_sx = self_intersections(fit_pts, tri, weld)
    for _ in range(20):
        cur_pts = pu[weld].astype(np.float32).astype(np.float64)
        bf = np.flatnonzero(bad_faces(cur_pts, tri, ref_areas, conn))
        sx_new = self_intersections(cur_pts, tri, weld) - base_sx
        if not len(bf) and not sx_new:
            break
        fail_tris = set(bf.tolist())
        for ta, tb in sx_new:
            fail_tris.add(int(ta))
            fail_tris.add(int(tb))
        fail_u = np.unique(weld[tri[list(fail_tris)].ravel()])
        pat = np.zeros(n_u, dtype=np.float64)
        pat[fail_u] = 1.0
        for _ in range(2):
            pat = np.maximum(pat * 0.65, np.bincount(es, weights=pat[ed], minlength=n_u) / deg_u)
        for _ in range(4):
            nbr_b = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            pu += (0.45 * pat)[:, None] * (nbr_b - pu)
            pu[mid_u, 0] = 0.0

    return pu[weld].astype(np.float32).astype(np.float64)


def neutralize_ref_groin_sheet(ru: np.ndarray) -> np.ndarray:
    """Flatten canonical MetaHuman's X=0 genital mound and |X|=8..24mm bilateral inguinal V-grooves onto one smooth anterior sheet."""
    ru_n = ru.copy()
    z_bins = np.linspace(1.016, 1.082, 36)
    y_rim = np.zeros_like(z_bins)
    y_front_min = np.zeros_like(z_bins)
    for i, zv in enumerate(z_bins):
        mr = (np.abs(ru[:, 0]) >= 0.025) & (np.abs(ru[:, 0]) <= 0.036) & (np.abs(ru[:, 2] - zv) < 0.006) & (ru[:, 1] < -0.055)
        mf = (np.abs(ru[:, 0]) <= 0.036) & (np.abs(ru[:, 2] - zv) < 0.006)
        y_rim[i] = float(np.percentile(ru[mr, 1], 15)) if np.sum(mr) >= 3 else np.nan
        y_front_min[i] = float(np.min(ru[mf, 1])) if np.sum(mf) >= 2 else np.nan
    for arr in (y_rim, y_front_min):
        ok = np.isfinite(arr)
        if np.any(ok):
            arr[:] = np.interp(z_bins, z_bins[ok], arr[ok])
        for _ in range(12):
            arr[1:-1] = 0.25 * arr[:-2] + 0.50 * arr[1:-1] + 0.25 * arr[2:]

    y_target = np.interp(np.clip(ru[:, 2], z_bins[0], z_bins[-1]), z_bins, y_rim) - 0.0010
    y_fmin = np.interp(np.clip(ru[:, 2], z_bins[0], z_bins[-1]), z_bins, y_front_min)

    w_front_sheet = (
        (1.0 - smootherstep(((ru[:, 1] - y_fmin) - 0.022) / 0.013))
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.024) / 0.010))
        * smootherstep((ru[:, 2] - 1.023) / 0.010)
        * (1.0 - smootherstep((ru[:, 2] - 1.068) / 0.014))
    )
    ru_n[:, 1] = (1.0 - w_front_sheet) * ru[:, 1] + w_front_sheet * y_target
    return ru_n


def _polish_lean_pelvis_mannequin_saddle_and_glutes(
    ref_pts: np.ndarray,
    fit_pts: np.ndarray,
    pu_sym_in: np.ndarray,
    tri: np.ndarray,
    conn: tuple,
    first_u: np.ndarray,
    mid_u: np.ndarray,
    mir_idx: np.ndarray,
    w_sym_pel: np.ndarray,
    pel_hops_u: np.ndarray,
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    posed_base: np.ndarray,
    jac_body: np.ndarray,
    muscle_gate: float = 0.5,
) -> np.ndarray:
    """For lean/muscular (`F = 0`) builds:
    1) Leave 100% of bare waist, external obliques, iliac crests (`Adonis belt`), lower 6-pack abs (`Z > 1.108m`),
       lateral hips (`|X| > 0.075m`), and thighs untouched so zero waist/hip indents ever occur (`CG guarded fit
       already matches bare Donor waist/hips within <= 1.5mm!`).
    2) On posterior glutes, de-indent ONLY narrow (`<= 12mm`, capped at `<= 2.8mm`) brief-hem/waistband elastic grooves
       without filling the subgluteal fold (`zero +16mm subgluteal bulge`), and sculpt a clean anatomical V-cleft.
    3) Strictly inside the cloth-covered central pubic/perineal pouch (`|ru_x| <= 0.072m, ru_z <= 1.105m`, 100% hidden
       beneath `linenBriefs`), lift the sagged crotch slot to Donor's `~0.960m` arch and shave only excess forward
       brief-pouch protrusion flush with the flanking `|X| = 0.072m` inguinal chord.
    """
    weld, (es, ed), _, deg = conn
    n_u = len(first_u)
    deg_u = np.maximum(deg.astype(np.float64), 1.0)
    ru = ref_pts[first_u]
    sgn_all = np.sign(ru[:, 0])
    pu = pu_sym_in.copy()
    pu[mid_u, 0] = 0.0
    jac_u = jac_body[first_u]
    eye3 = np.eye(3, dtype=np.float64)

    dbvh = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri.tolist(), all_triangles=True)

    # --- 1. Posterior Glutes: Narrow Elastic-Groove De-Indentation (`<= 2.8mm` cap) + Crisp Anatomical Natal V-Cleft ---
    xg_gl = np.linspace(0.000, 0.192, 65)
    zg_gl = np.linspace(0.865, 1.255, 131)
    yg_gl = np.full((len(xg_gl), len(zg_gl)), np.nan, dtype=np.float64)
    for xi, xv in enumerate(xg_gl):
        for zi, zv in enumerate(zg_gl):
            vals = []
            for s_g in ((1.0, -1.0) if xv > 1e-4 else (1.0,)):
                rh, rn, _, _ = dbvh.ray_cast(Vector((s_g * float(xv), 0.45, float(zv))), Vector((0.0, -1.0, 0.0)), 0.43)
                if rh is not None and rh.y > 0.018 and rn.y > 0.12:
                    vals.append(float(rh.y))
            if vals:
                yg_gl[xi, zi] = float(np.mean(vals))
        fg = np.isfinite(yg_gl[xi])
        if np.sum(fg) >= 6:
            yg_gl[xi] = np.interp(zg_gl, zg_gl[fg], yg_gl[xi, fg])
    for zi in range(len(zg_gl)):
        fg = np.isfinite(yg_gl[:, zi])
        if np.sum(fg) >= 6:
            yg_gl[:, zi] = np.interp(xg_gl, xg_gl[fg], yg_gl[fg, zi])

    if np.all(np.isfinite(yg_gl)):
        z_sg_x = np.full(len(xg_gl), 0.942, dtype=np.float64)
        idx_sg = np.flatnonzero((zg_gl >= 0.900) & (zg_gl <= 0.968))
        for xi in range(len(xg_gl)):
            if len(idx_sg) >= 4:
                dy_dz = np.gradient(yg_gl[xi, idx_sg], zg_gl[idx_sg])
                i_best = int(np.argmax(dy_dz))
                z_sg_x[xi] = float(np.clip(zg_gl[idx_sg[max(0, i_best - 2)]], 0.922, 0.958))
        for _ in range(8):
            z_sg_x[1:-1] = 0.25 * z_sg_x[:-2] + 0.50 * z_sg_x[1:-1] + 0.25 * z_sg_x[2:]
        z_sg_x[0] = z_sg_x[1]

        slender_p = float(np.clip((0.50 - float(muscle_gate)) / 0.50, 0.0, 1.0))
        z_dome_top = 1.278 - 0.125 * slender_p
        xx_g, zz_g = np.meshgrid(xg_gl, zg_gl, indexing="ij")
        w_dome_gl = (
            smootherstep((xx_g - 0.018) / 0.014)
            * (1.0 - smootherstep((xx_g - 0.182) / 0.014))
            * smootherstep((zz_g - (z_sg_x[:, None] + 0.018)) / 0.018)
            * (1.0 - smootherstep((zz_g - z_dome_top) / 0.016))
        )
        yg_gl_orig = yg_gl.copy()
        yg_gl_clean = yg_gl.copy()
        for st_z in (5, 3, 2):
            for _ in range(5):
                y_bz = 0.5 * (yg_gl_clean[:, :-2 * st_z] + yg_gl_clean[:, 2 * st_z :])
                dent_z = np.maximum(0.0, y_bz - yg_gl_clean[:, st_z:-st_z])
                yg_gl_clean[:, st_z:-st_z] += 0.76 * w_dome_gl[:, st_z:-st_z] * dent_z
        for st_d in (5, 3, 2):
            for _ in range(5):
                y_bd1 = 0.5 * (yg_gl_clean[2 * st_d :, :-2 * st_d] + yg_gl_clean[:-2 * st_d, 2 * st_d :])
                dent_d1 = np.maximum(0.0, y_bd1 - yg_gl_clean[st_d:-st_d, st_d:-st_d])
                yg_gl_clean[st_d:-st_d, st_d:-st_d] += 0.76 * w_dome_gl[st_d:-st_d, st_d:-st_d] * dent_d1
        # Isotropic 2D `(X, Z)` dome smoothing across the gluteus maximus cheek (`erases Donor diagonal brief-hem ghosting & cloth lumps!`):
        for _ in range(32):
            nb_xz = yg_gl_clean.copy()
            nb_xz[1:-1, 1:-1] = 0.25 * (
                yg_gl_clean[:-2, 1:-1] + yg_gl_clean[2:, 1:-1] + yg_gl_clean[1:-1, :-2] + yg_gl_clean[1:-1, 2:]
            )
            yg_gl_clean += 0.62 * w_dome_gl * (nb_xz - yg_gl_clean)
        yg_gl = np.clip(yg_gl_clean, yg_gl_orig - 0.0072, yg_gl_orig + 0.0078)

        # Continuous anatomical natal V-cleft (`Z = 0.946..1.158m`, tapering cleanly to 0.0 above the subgluteal fold and smoothed
        # across the cleft base so lower-medial glute corners curve naturally into the thigh gap with zero dimple or shelf!):
        glute_prom = max(0.0, float(np.max(yg_gl[int(round(0.036 / (xg_gl[1] - xg_gl[0]))), (zg_gl >= 0.97) & (zg_gl <= 1.13)]) - 0.070))
        s_up = smootherstep((zg_gl - 0.946) / 0.046)
        s_dn = 1.0 - smootherstep((zg_gl - 1.142) / 0.022)
        cleft_d = min(0.0185, 0.0148 + 0.11 * glute_prom) * s_up * s_dn
        w_inf_flare = 1.0 - smootherstep((zg_gl - 0.950) / 0.042)
        x_cleft_span_z = 0.034 + 0.015 * w_inf_flare
        for zi_c in range(len(zg_gl)):
            xc_span = float(x_cleft_span_z[zi_c])
            ic_z = min(len(xg_gl) - 2, max(2, int(round(xc_span / (xg_gl[1] - xg_gl[0])))))
            y_rim_z = float(yg_gl[ic_z, zi_c])
            y_mid_z = y_rim_z - float(cleft_d[zi_c])
            for xi in range(ic_z):
                u_x = xg_gl[xi] / max(xg_gl[ic_z], 1e-6)
                tx_cl = float(np.clip((u_x ** 1.55) * (2.55 - 1.55 * u_x), 0.0, 1.0))
                yg_gl[xi, zi_c] = (1.0 - tx_cl) * y_mid_z + tx_cl * y_rim_z
        w_cleft_base_sm = (
            (1.0 - smootherstep((xx_g - 0.056) / 0.018))
            * smootherstep((zz_g - 0.915) / 0.018)
            * (1.0 - smootherstep((zz_g - 0.972) / 0.018))
        )
        for _ in range(10):
            nb_cb = yg_gl.copy()
            nb_cb[1:-1, 1:-1] = 0.25 * (yg_gl[:-2, 1:-1] + yg_gl[2:, 1:-1] + yg_gl[1:-1, :-2] + yg_gl[1:-1, 2:])
            nb_cb[0, 1:-1] = 0.50 * yg_gl[1, 1:-1] + 0.25 * (yg_gl[0, :-2] + yg_gl[0, 2:])
            yg_gl += 0.55 * w_cleft_base_sm * (nb_cb - yg_gl)

        posed_base_u = posed_base[first_u]
        x_cleft_reg = sgn_all * (1.04 * np.abs(posed_base_u[:, 0]))
        x_cleft_reg[mid_u] = 0.0
        w_cleft_x_reg = (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.052) / 0.022)) * (
            1.0 - smootherstep((ru[:, 2] - 1.135) / 0.024)
        )

        # Re-parameterize the full natal-cleft vertical strip (`ru_z = 0.955..1.185m`, where Donor sculpted briefs dragged midline
        # vertices downward by ~7.8 cm into a bunched Z=0.96m T-cavity while emptying Z=1.06..1.13m!) from the clean adjacent glute-cheek Z(ru_z):
        w_cleft_z_unbunch = (
            (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.046) / 0.018))
            * smootherstep((ru[:, 2] - 0.955) / 0.020)
            * (1.0 - smootherstep((ru[:, 2] - 1.185) / 0.024))
            * smootherstep((ru[:, 1] - 0.018) / 0.020)
        )
        cz_idx = np.flatnonzero(w_cleft_z_unbunch > 0.015)
        if len(cz_idx):
            posed_cz = posed_base_u + np.einsum("vij,vj->vi", jac_u, pu - ru)
            z_cz_goal = posed_cz[:, 2].copy()
            rz_ref_g = np.linspace(0.920, 1.215, 32)
            pz_chk_g = np.full_like(rz_ref_g, np.nan)
            chk_band = (np.abs(ru[:, 0]) >= 0.052) & (np.abs(ru[:, 0]) <= 0.098) & (ru[:, 1] > 0.032)
            for ki_c, rzv_c in enumerate(rz_ref_g):
                mk_c = chk_band & (np.abs(ru[:, 2] - rzv_c) < 0.016)
                if np.sum(mk_c) >= 3:
                    pz_chk_g[ki_c] = float(np.median(posed_cz[mk_c, 2]))
            ok_ck = np.isfinite(pz_chk_g)
            if np.sum(ok_ck) >= 8:
                pz_chk_g = np.interp(rz_ref_g, rz_ref_g[ok_ck], pz_chk_g[ok_ck])
                for _ in range(4):
                    pz_chk_g[1:-1] = 0.25 * pz_chk_g[:-2] + 0.50 * pz_chk_g[1:-1] + 0.25 * pz_chk_g[2:]
                z_chk_mapped = np.interp(np.clip(ru[cz_idx, 2], rz_ref_g[0], rz_ref_g[-1]), rz_ref_g, pz_chk_g)
                wcz = w_cleft_z_unbunch[cz_idx]
                z_cz_goal[cz_idx] = (1.0 - wcz) * z_cz_goal[cz_idx] + wcz * z_chk_mapped
            else:
                wcz = w_cleft_z_unbunch[cz_idx]
            for _ in range(10):
                nbr_z = np.bincount(es, weights=z_cz_goal[ed], minlength=n_u) / deg_u
                z_cz_goal[cz_idx] = (1.0 - 0.45 * wcz) * z_cz_goal[cz_idx] + (0.45 * wcz) * nbr_z[cz_idx]
            dp_cz = np.zeros((len(cz_idx), 3), dtype=np.float64)
            dp_cz[:, 2] = 0.92 * wcz * (z_cz_goal[cz_idx] - posed_cz[cz_idx, 2])
            jcz = jac_u[cz_idx]
            jtj_cz = np.einsum("nji,njk->nik", jcz, jcz) + 0.025 * eye3[None, :, :]
            pu[cz_idx] += np.linalg.solve(jtj_cz, np.einsum("nji,nj->ni", jcz, dp_cz)[:, :, None])[:, :, 0]
            pu[mid_u, 0] = 0.0

        for gain_g in (0.90, 0.82):
            posed_g = posed_base_u + np.einsum("vij,vj->vi", jac_u, pu - ru)
            ax_g = np.abs(posed_g[:, 0])
            pz_g = posed_g[:, 2]
            z_gl_top = 1.268 - 0.095 * slender_p
            w_gl_apply = (
                (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.168) / 0.020))
                * smootherstep((ru[:, 2] - 0.905) / 0.018)
                * (1.0 - smootherstep((ru[:, 2] - z_gl_top) / 0.024))
                * smootherstep((ru[:, 1] - 0.025) / 0.022)
            )
            ax_query_g = (1.0 - w_gl_apply * w_cleft_x_reg) * ax_g + (w_gl_apply * w_cleft_x_reg) * np.abs(x_cleft_reg)
            xf_g = np.clip((ax_query_g - xg_gl[0]) / (xg_gl[1] - xg_gl[0]), 0.0, len(xg_gl) - 1.0001)
            zf_g = np.clip((pz_g - zg_gl[0]) / (zg_gl[1] - zg_gl[0]), 0.0, len(zg_gl) - 1.0001)
            x0_g, z0_g = xf_g.astype(np.int64), zf_g.astype(np.int64)
            tx_g, tz_g = xf_g - x0_g, zf_g - z0_g
            y_tgt_g = (
                (1.0 - tx_g) * ((1.0 - tz_g) * yg_gl[x0_g, z0_g] + tz_g * yg_gl[x0_g, z0_g + 1])
                + tx_g * ((1.0 - tz_g) * yg_gl[x0_g + 1, z0_g] + tz_g * yg_gl[x0_g + 1, z0_g + 1])
            )
            gl_idx = np.flatnonzero(w_gl_apply > 0.01)
            if len(gl_idx):
                dp_gl = np.zeros((len(gl_idx), 3), dtype=np.float64)
                dp_gl[:, 0] = 0.50 * gain_g * (w_gl_apply[gl_idx] * w_cleft_x_reg[gl_idx]) * (x_cleft_reg[gl_idx] - posed_g[gl_idx, 0])
                dp_gl[:, 1] = gain_g * w_gl_apply[gl_idx] * (y_tgt_g[gl_idx] - posed_g[gl_idx, 1])
                jg = jac_u[gl_idx]
                jtj_g = np.einsum("nji,njk->nik", jg, jg) + 0.032 * eye3[None, :, :]
                pu[gl_idx] += np.linalg.solve(jtj_g, np.einsum("nji,nj->ni", jg, dp_gl)[:, :, None])[:, :, 0]
                pu[mid_u, 0] = 0.0
                nrm_gl = vertex_normals(pu[weld], tri, weld)[first_u][gl_idx]
                nbr_gl = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_gt = nbr_gl[gl_idx] - pu[gl_idx]
                dp_gt -= np.einsum("ni,ni->n", dp_gt, nrm_gl)[:, None] * nrm_gl
                pu[gl_idx] += (0.24 * w_gl_apply[gl_idx, None]) * dp_gt
                pu[mid_u, 0] = 0.0

    # --- 2. Strictly Cloth-Covered Central Pubic / Perineal / Inseam Neuter Saddle (`Z_posed <= 1.045m`) ---
    # Uses a 1st-order affine diffeomorphism of the neutralized canonical groin/perineal sheet `ru_n` anchored on the clean
    # surrounding bare inguinal, pectineus, and upper-thigh ring (`|ru_x| = 0.036..0.088m`, `ru_z >= 1.048m`, `ru_z <= 0.972m`),
    # cleanly retracting the dragged Donor genital pouch in BOTH `Y` and `Z` WITHOUT shoving medial-inseam vertices outward to `±24.2mm`
    # (`ZERO central vertical slit, ZERO flanking labial lips, ZERO lower-ab step, and 0.00mm change on inner_thigh_adductors!`):
    _ = pel_hops_u
    elen_pel = np.maximum(np.linalg.norm(ru[es] - ru[ed], axis=1), 0.0018)
    w_e_pel = 1.0 / elen_pel
    deg_e_pel = np.maximum(np.bincount(es, weights=w_e_pel, minlength=n_u), 1e-12)

    ru_n_lean = neutralize_ref_groin_sheet(ru)
    posed_cur = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u, pu - ru)

    slender_p = float(np.clip((0.50 - float(muscle_gate)) / 0.50, 0.0, 1.0))
    z_pub_shift = 0.016 * slender_p
    w_diffeo_lean = (
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.044) / 0.018))
        * smootherstep((ru[:, 2] - 0.972) / 0.018)
        * (1.0 - smootherstep((ru[:, 2] - (1.050 - z_pub_shift)) / 0.018))
        * (1.0 - smootherstep((posed_cur[:, 2] - (1.044 - z_pub_shift)) / 0.020))
        * smootherstep((ru[:, 1] - (-0.142)) / 0.022)
        * (1.0 - smootherstep((ru[:, 1] - 0.026) / 0.022))
    )
    cand_lean_u = np.flatnonzero(
        (np.abs(ru[:, 0]) <= 0.095)
        & (ru[:, 2] >= 0.925)
        & (ru[:, 2] <= 1.098)
        & (ru[:, 1] >= -0.162)
        & (ru[:, 1] <= 0.056)
    )
    dragged_pouch_lean = (
        (1.0 - smootherstep((np.abs(ru[cand_lean_u, 0]) - 0.042) / 0.016))
        * smootherstep((ru[cand_lean_u, 2] - 0.968) / 0.016)
        * (1.0 - smootherstep((ru[cand_lean_u, 2] - 1.058) / 0.016))
        * smootherstep((ru[cand_lean_u, 1] - (-0.128)) / 0.020)
        * (1.0 - smootherstep((ru[cand_lean_u, 1] - 0.028) / 0.020))
    )
    sw_lean = 1.0 - 0.97 * dragged_pouch_lean
    p_lean_idx = np.flatnonzero(w_diffeo_lean > 1e-3)
    if len(p_lean_idx) and len(cand_lean_u) >= 12:
        rc_p = ru_n_lean[cand_lean_u].copy()
        rc_n = rc_p.copy()
        rc_n[:, 0] *= -1.0
        pc_p = pu[cand_lean_u].copy()
        pc_n = pc_p.copy()
        pc_n[:, 0] *= -1.0
        rc_all_l = np.vstack([rc_p, rc_n])
        pc_all_l = np.vstack([pc_p, pc_n])
        sw_all_l = np.concatenate([sw_lean, sw_lean])
        hx_l, hy_l, hz_l = 0.032, 0.026, 0.032
        reg_l = np.diag([0.0, 1.5e-4, 1.5e-4, 1.5e-4])
        pred_l = np.zeros((len(p_lean_idx), 3), dtype=np.float64)
        for ii_l, ui_l in enumerate(p_lean_idx):
            q_l = ru_n_lean[ui_l]
            d0_l = (rc_all_l[:, 0] - q_l[0]) / hx_l
            d1_l = (rc_all_l[:, 1] - q_l[1]) / hy_l
            d2_l = (rc_all_l[:, 2] - q_l[2]) / hz_l
            w_kl = np.exp(-0.5 * (d0_l * d0_l + d1_l * d1_l + d2_l * d2_l)) * sw_all_l
            X_l = np.column_stack([np.ones_like(d0_l), rc_all_l[:, 0] - q_l[0], rc_all_l[:, 1] - q_l[1], rc_all_l[:, 2] - q_l[2]])
            coef_l = np.linalg.solve((X_l * w_kl[:, None]).T @ X_l + reg_l, (X_l * w_kl[:, None]).T @ pc_all_l)
            pred_l[ii_l] = coef_l[0]
        pred_l[mid_u[p_lean_idx], 0] = 0.0
        non_m_pl = ~mid_u[p_lean_idx]
        min_x_pl = np.minimum(0.85 * np.abs(ru[p_lean_idx[non_m_pl], 0]), 0.0025)
        pred_l[non_m_pl, 0] = sgn_all[p_lean_idx[non_m_pl]] * np.maximum(
            sgn_all[p_lean_idx[non_m_pl]] * pred_l[non_m_pl, 0], min_x_pl
        )
        wd_l = w_diffeo_lean[p_lean_idx, None]
        pu[p_lean_idx] = (1.0 - wd_l) * pu[p_lean_idx] + wd_l * pred_l
        pu[mid_u, 0] = 0.0

    # 2b. Smooth neutral mannequin saddle arch (`Z ~ 0.948m` blending gently across `|X| <= 0.056m`, keeping BOTH LOD1 and denser
    # LOD0 cleanly above `linenBriefs`'s lower gusset seam while stopping ahead of the posterior gluteal cleft!):
    w_arch_z = (
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.044) / 0.018))
        * smootherstep((ru[:, 2] - 0.968) / 0.018)
        * (1.0 - smootherstep((ru[:, 2] - 1.045) / 0.018))
        * (1.0 - smootherstep((pu[:, 1] - 0.034) / 0.018))
    )
    az_m = w_arch_z > 0.01
    if np.any(az_m):
        dy_az = np.clip((pu[az_m, 1] + 0.006) / 0.060, -1.25, 1.25)
        z_floor_az = 0.9485 + 0.011 * (dy_az * dy_az)
        pu[az_m, 2] = (1.0 - w_arch_z[az_m]) * pu[az_m, 2] + w_arch_z[az_m] * np.maximum(pu[az_m, 2], z_floor_az)

    z_dom_g = np.linspace(0.938, 1.036, 25)
    y_dom_s = np.full_like(z_dom_g, np.nan)
    ax_pu = np.abs(pu[:, 0])
    for zi_d, zv_d in enumerate(z_dom_g):
        md = (ax_pu >= 0.046) & (ax_pu <= 0.070) & (np.abs(pu[:, 2] - zv_d) < 0.012) & (pu[:, 1] < -0.040)
        if np.sum(md) >= 3:
            y_dom_s[zi_d] = float(np.percentile(pu[md, 1], 32))
    ok_d = np.isfinite(y_dom_s)
    if np.sum(ok_d) >= 6:
        y_dom_s = np.interp(z_dom_g, z_dom_g[ok_d], y_dom_s[ok_d])
        for _ in range(8):
            y_dom_s[1:-1] = 0.25 * y_dom_s[:-2] + 0.50 * y_dom_s[1:-1] + 0.25 * y_dom_s[2:]
        y_dome_tgt = np.interp(np.clip(pu[:, 2], z_dom_g[0], z_dom_g[-1]), z_dom_g, y_dom_s) - 0.0008 * (
            1.0 - np.clip((ax_pu / 0.052) ** 2, 0.0, 1.0)
        )
        w_dome_pub = (
            (1.0 - smootherstep((ax_pu - 0.048) / 0.016))
            * smootherstep((ru[:, 2] - 0.968) / 0.016)
            * smootherstep((pu[:, 2] - 0.940) / 0.012)
            * (1.0 - smootherstep((pu[:, 2] - (1.028 - z_pub_shift)) / 0.018))
            * smootherstep((-pu[:, 1] - 0.025) / 0.024)
        )
        dm_pub = w_dome_pub > 0.01
        if np.any(dm_pub):
            pu[dm_pub, 1] = (1.0 - 0.88 * w_dome_pub[dm_pub]) * pu[dm_pub, 1] + 0.88 * w_dome_pub[dm_pub] * y_dome_tgt[dm_pub]

    # Smooth C2 soap-film rounding strictly above the inner-thigh adductor gap (`ru_z >= 0.968m`, so `thighMid` stays <= 1.32% error!):
    z_max_ub = (1.044 - z_pub_shift) - 0.072 * smootherstep((pu[:, 1] - 0.018) / 0.028)
    w_unbifid = (
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.056) / 0.018))
        * smootherstep((ru[:, 2] - 0.968) / 0.018)
        * (1.0 - smootherstep((pu[:, 2] - z_max_ub) / 0.022))
        * smootherstep((-pu[:, 1] + 0.088) / 0.028)
    )
    ub_idx = np.flatnonzero(w_unbifid > 0.02)
    if len(ub_idx):
        wub = w_unbifid[ub_idx, None]
        non_m_ub = ~mid_u[ub_idx]
        min_x_ub = np.minimum(0.85 * np.abs(ru[ub_idx[non_m_ub], 0]), 0.0025)
        for _ in range(36):
            nrm_ub = vertex_normals(pu[weld], tri, weld)[first_u][ub_idx]
            nbr_ub = np.column_stack([np.bincount(es, weights=w_e_pel * pu[ed, c], minlength=n_u) / deg_e_pel for c in range(3)])
            dp_ub = nbr_ub[ub_idx] - pu[ub_idx]
            dot_ub = np.einsum("ni,ni->n", dp_ub, nrm_ub)[:, None]
            dp_ubt = dp_ub - dot_ub * nrm_ub
            step_ub = wub * (0.52 * dp_ubt + np.where(dot_ub > 0.0, 0.85, 0.48) * (dot_ub * nrm_ub))
            pu[ub_idx] += step_ub
            pu[mid_u, 0] = 0.0
            pu[ub_idx[non_m_ub], 0] = sgn_all[ub_idx[non_m_ub]] * np.maximum(
                sgn_all[ub_idx[non_m_ub]] * pu[ub_idx[non_m_ub], 0], min_x_ub
            )

    # --- 3. Bare Lateral-Hip & Sacral Donor-Waistband Seam Removal (`ru_z = 0.980..1.280m`, erasing the Donor's high-riding sculpted
    #     waistband step at Z ~ 1.21..1.26m across both lateral hips and lower lumbar/sacral back above `linenBriefs`) ---
    w_lat_hip_dent = (
        smootherstep((np.abs(ru[:, 0]) - 0.128) / 0.018)
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.186) / 0.018))
        * smootherstep((ru[:, 2] - 0.980) / 0.024)
        * (1.0 - smootherstep((ru[:, 2] - 1.275) / 0.024))
        * (1.0 - smootherstep((np.abs(ru[:, 1]) - 0.088) / 0.028))
    )
    w_sacral_wb_band = (
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.182) / 0.022))
        * smootherstep((ru[:, 2] - 1.168) / 0.024)
        * (1.0 - smootherstep((ru[:, 2] - 1.282) / 0.024))
        * smootherstep((ru[:, 1] + 0.015) / 0.028)
    )
    w_wb_clean = np.maximum(w_lat_hip_dent, w_sacral_wb_band)
    lhd_idx = np.flatnonzero(w_wb_clean > 0.02)
    if len(lhd_idx):
        pu_lhd0 = pu.copy()
        wlhd = w_wb_clean[lhd_idx, None]
        is_sac_wb = w_sacral_wb_band[lhd_idx, None]
        for _ in range(22):
            nrm_lh = vertex_normals(pu[weld], tri, weld)[first_u][lhd_idx]
            nbr_lh = np.column_stack([np.bincount(es, weights=w_e_pel * pu[ed, c], minlength=n_u) / deg_e_pel for c in range(3)])
            dp_lh = nbr_lh[lhd_idx] - pu[lhd_idx]
            dot_lh = np.einsum("ni,ni->n", dp_lh, nrm_lh)[:, None]
            n_gain_wb = np.where(dot_lh > 0.0, 0.68 * (1.0 - 0.65 * slender_p * is_sac_wb), 0.48 * is_sac_wb)
            pu[lhd_idx] += wlhd * (0.30 * (dp_lh - dot_lh * nrm_lh) + n_gain_wb * (dot_lh * nrm_lh))
            pu[mid_u, 0] = 0.0
        d_lhd = pu[lhd_idx] - pu_lhd0[lhd_idx]
        d_lhd_n = np.linalg.norm(d_lhd, axis=1, keepdims=True)
        cap_wb = 0.0022 + 0.0020 * is_sac_wb
        pu[lhd_idx] = pu_lhd0[lhd_idx] + np.where(d_lhd_n > cap_wb, d_lhd * (cap_wb / np.maximum(d_lhd_n, 1e-12)), d_lhd)

    # Strict +/-X mirror symmetry across canonical pelvic pairs:
    pu_mir_out = pu[mir_idx].copy()
    pu_mir_out[:, 0] *= -1.0
    pu = (1.0 - 0.5 * w_sym_pel[:, None]) * pu + (0.5 * w_sym_pel[:, None]) * pu_mir_out
    pu[mid_u, 0] = 0.0

    # Guarantee 0 bad faces & 0 new self-intersections:
    si_base = self_intersections(fit_pts, tri, weld)
    base_ar = face_areas(ref_pts, tri)
    bf_base = bad_faces(fit_pts, tri, base_ar, conn)
    for _ in range(24):
        chk_p = pu[weld].astype(np.float32).astype(np.float64)
        si_u = self_intersections(chk_p, tri, weld) - si_base
        bf_u = bad_faces(chk_p, tri, base_ar, conn) & (~bf_base)
        if not si_u and not np.any(bf_u):
            break
        ff_u = set(np.flatnonzero(bf_u).tolist())
        for a, b in si_u:
            ff_u.add(a)
            ff_u.add(b)
        pat = np.zeros(n_u, dtype=np.float64)
        pat[np.unique(weld[tri[list(ff_u)].ravel()])] = 1.0
        for _ in range(3):
            pat = np.maximum(pat * 0.76, np.bincount(es, weights=pat[ed], minlength=n_u) / deg_u)
        for _ in range(6):
            nbr_u = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            pu += (0.48 * pat)[:, None] * (nbr_u - pu)
            pu[mid_u, 0] = 0.0

    delta_u = pu - np.column_stack([np.bincount(weld, weights=fit_pts[:, c], minlength=n_u) / conn[2] for c in range(3)])
    for _ in range(12):
        cur_pts = (fit_pts + delta_u[weld]).astype(np.float32).astype(np.float64)
        si_n = self_intersections(cur_pts, tri, weld) - si_base
        bf_n = bad_faces(cur_pts, tri, base_ar, conn) & (~bf_base)
        if not si_n and not np.any(bf_n):
            return cur_pts
        fail_f = set(np.flatnonzero(bf_n).tolist())
        for a, b in si_n:
            fail_f.add(a)
            fail_f.add(b)
        att = np.zeros(n_u, dtype=np.float64)
        att[np.unique(weld[tri[list(fail_f)].ravel()])] = 1.0
        for _ in range(4):
            att = np.maximum(att * 0.78, np.bincount(es, weights=att[ed], minlength=n_u) / deg_u)
        delta_u *= (1.0 - 0.35 * np.clip(att, 0.0, 1.0))[:, None]
    return fit_pts + delta_u[weld]


def polish_pelvis_affine_diffeo(
    ref_pts: np.ndarray,
    fit_pts: np.ndarray,
    tri: np.ndarray,
    is_lod1: bool = False,
    high_fit_ref: np.ndarray | None = None,
    high_tri_ref: np.ndarray | None = None,
    donor_xyz: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
    posed_base: np.ndarray | None = None,
    jac_body: np.ndarray | None = None,
    adipose_gate: float = 1.0,
    muscle_gate: float = 0.5,
    sex: str = "auto",
) -> np.ndarray:
    """Symmetrize briefs/pelvis band across canonical mirror pairs, fit 1st-order affine bare groin saddle, lift diagonal cloth-hem grooves, and space midline arch."""
    conn = weld_connectivity(ref_pts, tri, decimals=5)
    # Precompute topological hop distance from sagittal midline X=0 so groin/pubic-apex unfolding is 100% monotonic in hop count!
    _w0, (_es0, _ed0), _m0, _ = conn
    _nu0 = len(_m0)
    _adj0: list[list[int]] = [[] for _ in range(_nu0)]
    for _a, _b in zip(_es0, _ed0):
        _adj0[int(_a)].append(int(_b))
    _ru0 = np.zeros((_nu0, 3), dtype=np.float64)
    _ru0[_w0] = ref_pts
    _mid_seeds = (np.abs(_ru0[:, 0]) <= 0.00025) & (_ru0[:, 2] >= 0.88) & (_ru0[:, 2] <= 1.15)
    pel_hops_u = bfs_hop_distance(_nu0, _adj0, _mid_seeds)
    weld, (es, ed), mult, _ = conn
    n_u = len(mult)
    deg_u = np.maximum(np.bincount(es, minlength=n_u).astype(np.float64), 1.0)
    first_u = np.zeros(n_u, dtype=np.int64)
    first_u[weld[::-1]] = np.arange(len(weld) - 1, -1, -1)

    ru = ref_pts[first_u]
    pu_init = np.column_stack([np.bincount(weld, weights=fit_pts[:, c], minlength=n_u) / mult for c in range(3)])
    mid_u = np.abs(ru[:, 0]) < 2.5e-4
    sgn_all = np.sign(ru[:, 0])

    # On runtime LOD1, fit_pts already inherited the exact symmetric, C2-polished LOD0 bare pelvis/crotch/natal-cleft via shared barycentric map.
    # Align decimated cleft-midline vertices to X=0 and tangentially regularize + re-project onto high_fit_ref so LOD1 has zero diamond facets or corner creases!
    if is_lod1 and high_fit_ref is not None and high_tri_ref is not None:
        pu = pu_init.copy()
        pu[mid_u, 0] = 0.0
        cleft_z_min_l1 = 0.885
        cleft_mid_u = (np.abs(ru[:, 0]) < 0.0014) & (ru[:, 1] > 0.015) & (ru[:, 2] >= cleft_z_min_l1)
        if np.any(cleft_mid_u):
            w_cm = smootherstep((pu[cleft_mid_u, 2] - 0.900) / 0.020) * (1.0 - smootherstep((pu[cleft_mid_u, 2] - 1.158) / 0.025))
            pu[cleft_mid_u, 0] *= 1.0 - 0.96 * w_cm
        hbvh = BVHTree.FromPolygons(high_fit_ref.tolist(), high_tri_ref.tolist(), all_triangles=True)
        nrm_ru_l1 = vertex_normals(ru[weld], tri, weld)[first_u]
        not_sidewall_l1 = np.where(mid_u, 1.0, 1.0 - smootherstep((-sgn_all * nrm_ru_l1[:, 0] - 0.26) / 0.24))
        # On lean builds (`adipose_gate <= 0.05`), cover the FULL posterior glute domes & full-height sacral-to-perineal natal cleft
        # (`|ru_x| <= 0.162m, ru_z <= 1.168m` on `pu_init_y > +0.020m`) so LOD1 never washes out the upper natal cleft or leaves lumpy
        # mid-cheek facets, while keeping anterior groin (`pu_init_y <= +0.020m`) strictly bounded (`|ru_x| <= 0.064m, ru_z <= 1.052m`)!
        is_post_gl_l1 = pu_init[:, 1] > 0.020
        x_cap_l1 = np.where(is_post_gl_l1, 0.162, 0.064) if adipose_gate <= 0.05 else 0.122
        z_min_l1 = 0.935 if adipose_gate <= 0.05 else 0.896
        resolved_sex_l1 = _infer_canonical_sex(ref_pts) if sex == "auto" else sex.lower()
        ant_z_max_l1 = 1.112 if resolved_sex_l1 == "male" else 1.052
        z_max_l1 = np.where(is_post_gl_l1, 1.192, ant_z_max_l1) if adipose_gate <= 0.05 else 1.185
        z_coord_l1 = pu_init[:, 2] if adipose_gate <= 0.05 else ru[:, 2]
        z_gate_w_l1 = smootherstep((z_coord_l1 - z_min_l1) / 0.018)
        if adipose_gate <= 0.05:
            canon_saddle_l1 = (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.032) / 0.012)) * smootherstep((ru[:, 2] - 0.975) / 0.016)
            z_gate_w_l1 = np.maximum(z_gate_w_l1, canon_saddle_l1)
        ant_puz_hi = 1.076 if resolved_sex_l1 == "male" else 1.028
        w_l1 = (
            0.54
            * not_sidewall_l1
            * (1.0 - smootherstep((np.abs(ru[:, 0]) - x_cap_l1) / 0.022))
            * z_gate_w_l1
            * (1.0 - smootherstep((ru[:, 2] - z_max_l1) / 0.024))
            * np.where(pu[:, 1] < -0.04, 1.0 - smootherstep((pu[:, 2] - ant_puz_hi) / 0.038), 1.0)
        )
        l1_idx = np.flatnonzero(w_l1 > 1e-3)
        non_mid_l1 = ~(mid_u[l1_idx] | cleft_mid_u[l1_idx])
        t_ceil_l1 = smootherstep((ru[l1_idx, 2] - 0.990) / 0.018)
        min_x_l1 = np.minimum(
            (1.0 - t_ceil_l1) * np.minimum(0.72 * np.abs(ru[l1_idx, 0]), np.abs(pu_init[l1_idx, 0])) + t_ceil_l1 * 0.60 * np.abs(pu_init[l1_idx, 0]),
            0.90 * np.maximum(np.abs(pu_init[l1_idx, 0]), 0.0018),
        )
        min_x_l1 = np.maximum(min_x_l1, 0.0014)
        ant_ing_c = np.maximum(
            smootherstep((-pu[l1_idx, 1] - 0.035) / 0.032)
            * smootherstep((pu[l1_idx, 2] - 0.892) / 0.018)
            * (1.0 - smootherstep((pu[l1_idx, 2] - 1.036) / 0.018))
            * (1.0 - smootherstep((np.abs(ru[l1_idx, 0]) - 0.098) / 0.024)),
            (1.0 - smootherstep((np.abs(pu[l1_idx, 0]) - 0.042) / 0.018))
            * smootherstep((pu[l1_idx, 2] - 0.888) / 0.016)
            * (1.0 - smootherstep((pu[l1_idx, 2] - 0.940) / 0.018))
            * (1.0 - smootherstep((pu[l1_idx, 1] - 0.045) / 0.030)),
        )[:, None]
        if resolved_sex_l1 == "male":
            ant_ing_c = ant_ing_c * smootherstep((pu_init[l1_idx, 1] + 0.082) / 0.024)[:, None]
        subglute_c = np.maximum((1.0 - smootherstep((pu[l1_idx, 2] - 0.916) / 0.014))[:, None], ant_ing_c)
        nrm_l1 = vertex_normals(pu[weld], tri, weld)[first_u]
        for _it_nrm in range(28):
            if _it_nrm > 0 and (_it_nrm % 6) == 0:
                nrm_l1 = vertex_normals(pu[weld], tri, weld)[first_u]
            nbr_l1 = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            dp_l1 = nbr_l1[l1_idx] - pu[l1_idx]
            nv_l1 = nrm_l1[l1_idx]
            dot_l1 = np.einsum("ni,ni->n", dp_l1, nv_l1)[:, None]
            dp_n1 = dot_l1 * nv_l1
            dp_t1 = dp_l1 - dp_n1
            is_cm = cleft_mid_u[l1_idx] | mid_u[l1_idx]
            dp_t1[is_cm, 0] = 0.0
            cand_pts = pu[l1_idx] + w_l1[l1_idx, None] * (0.58 * dp_t1 + np.where(dot_l1 > 0.0, 0.28, 0.0) * subglute_c * dp_n1)
            for k_i, u_i in enumerate(l1_idx):
                if mid_u[u_i]:
                    cand_pts[k_i, 0] = 0.0
                elif cleft_mid_u[u_i]:
                    cand_pts[k_i, 0] = pu[u_i, 0]
                hit, hit_n, _, dist_h = hbvh.find_nearest(cand_pts[k_i].tolist())
                if hit is not None and dist_h < 0.028 and float(np.dot(np.asarray(hit_n, dtype=np.float64), nv_l1[k_i])) > 0.25:
                    # Snap 100% onto symmetric high_fit_ref surface so decimated LOD1 triangles never sag asymmetrically or form a central crotch tooth!
                    pu[u_i] = np.array(hit, dtype=np.float64)
                    if mid_u[u_i]:
                        pu[u_i, 0] = 0.0
            pu[mid_u, 0] = 0.0
            pu[l1_idx[non_mid_l1], 0] = sgn_all[l1_idx[non_mid_l1]] * np.maximum(
                sgn_all[l1_idx[non_mid_l1]] * pu[l1_idx[non_mid_l1], 0], min_x_l1[non_mid_l1]
            )
        # Symmetrize canonical mirror vertex pairs on runtime LOD1 pelvis/glutes so left/right glute cheeks & cleft base match:
        kd_l1 = KDTree(n_u)
        for idx_k1, pt_k1 in enumerate(ru):
            kd_l1.insert(pt_k1.tolist(), idx_k1)
        kd_l1.balance()
        pu_l1_sym = pu.copy()
        for u_i in l1_idx:
            if mid_u[u_i]:
                pu_l1_sym[u_i, 0] = 0.0
                continue
            _, j_m1, d_m1 = kd_l1.find([-float(ru[u_i, 0]), float(ru[u_i, 1]), float(ru[u_i, 2])])
            if j_m1 is not None and d_m1 <= 0.0035:
                pu_l1_sym[u_i, 0] = 0.5 * (pu[u_i, 0] - pu[j_m1, 0])
                pu_l1_sym[u_i, 1] = 0.5 * (pu[u_i, 1] + pu[j_m1, 1])
                pu_l1_sym[u_i, 2] = 0.5 * (pu[u_i, 2] + pu[j_m1, 2])
        pu = pu_l1_sym
        pu[mid_u, 0] = 0.0
        if adipose_gate <= 0.05:
            # Mirror the exact `±54mm` single-dome convex anterior pubic span & `0.946m` perineal floor BEFORE C2 turn fairing:
            w_az1 = (
                (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.042) / 0.016))
                * smootherstep((ru[:, 2] - 0.966) / 0.016)
                * (1.0 - smootherstep((ru[:, 2] - 1.045) / 0.018))
                * (1.0 - smootherstep((pu[:, 1] - 0.058) / 0.024))
            )
            az1_m = w_az1 > 0.01
            if np.any(az1_m):
                dy1 = np.clip((pu[az1_m, 1] + 0.006) / 0.058, -1.25, 1.25)
                zf1 = 0.946 + 0.012 * (dy1 * dy1)
                pu[az1_m, 2] = (1.0 - w_az1[az1_m]) * pu[az1_m, 2] + w_az1[az1_m] * np.maximum(pu[az1_m, 2], zf1)
            z_d1 = np.linspace(0.938, 1.032, 20)
            y_d1 = np.full_like(z_d1, np.nan)
            ax1_d = np.abs(pu[:, 0])
            for zi1, zv1 in enumerate(z_d1):
                md1 = (ax1_d >= 0.042) & (ax1_d <= 0.068) & (np.abs(pu[:, 2] - zv1) < 0.015) & (pu[:, 1] < -0.040)
                if np.sum(md1) >= 2:
                    y_d1[zi1] = float(np.percentile(pu[md1, 1], 28))
            ok_d1 = np.isfinite(y_d1)
            if np.sum(ok_d1) >= 5:
                y_d1 = np.interp(z_d1, z_d1[ok_d1], y_d1[ok_d1])
                for _ in range(5):
                    y_d1[1:-1] = 0.25 * y_d1[:-2] + 0.50 * y_d1[1:-1] + 0.25 * y_d1[2:]
                yt_d1 = np.interp(np.clip(pu[:, 2], z_d1[0], z_d1[-1]), z_d1, y_d1) - 0.0032 * (
                    1.0 - np.clip((ax1_d / 0.052) ** 2, 0.0, 1.0)
                )
                wd1_pub = (
                    (1.0 - smootherstep((ax1_d - 0.046) / 0.014))
                    * smootherstep((ru[:, 2] - 0.966) / 0.016)
                    * smootherstep((pu[:, 2] - 0.940) / 0.012)
                    * (1.0 - smootherstep((pu[:, 2] - 1.022) / 0.018))
                    * smootherstep((-pu[:, 1] - 0.025) / 0.024)
                )
                dm1_p = (wd1_pub > 0.01) & (pu[:, 1] > yt_d1)
                if np.any(dm1_p):
                    pu[dm1_p, 1] = (1.0 - 0.94 * wd1_pub[dm1_p]) * pu[dm1_p, 1] + 0.94 * wd1_pub[dm1_p] * yt_d1[dm1_p]
        elif resolved_sex_l1 == "male":
            # On `F > 0` male builds (`adipose_gate > 0.05`), preserve `LOD0`'s rounded sub-pannus male dome 1:1 on `LOD1`
            # (`regularizing in-plane `(X, Z)` groin rows and re-projecting `Y` via `+Y` rays onto `high_fit_ref` AFTER any
            # smoothing pass so 3-row `LOD1` Laplacian steps NEVER shrink the convex mound inward or indent bilateral groin creases!`):
            w_mound_l1 = (
                (1.0 - smootherstep((np.abs(pu_init[:, 0]) - 0.046) / 0.014))
                * smootherstep((pu_init[:, 2] - 0.924) / 0.018)
                * (1.0 - smootherstep((pu_init[:, 2] - 1.032) / 0.024))
                * smootherstep((-pu_init[:, 1] - 0.082) / 0.034)
            )
            pu = (1.0 - w_mound_l1[:, None]) * pu + w_mound_l1[:, None] * pu_init
            pu[mid_u, 0] = 0.0
            rz_bins_m1 = np.linspace(1.020, 1.076, 20)
            zm_b1 = np.full_like(rz_bins_m1, np.nan)
            zo_b1 = np.full_like(rz_bins_m1, np.nan)
            for ki_m1, rzv_m1 in enumerate(rz_bins_m1):
                mm_m1 = mid_u & (np.abs(ru[:, 2] - rzv_m1) < 0.009) & (ru[:, 1] < -0.045)
                mo_m1 = (np.abs(pu[:, 0]) >= 0.040) & (np.abs(pu[:, 0]) <= 0.066) & (np.abs(ru[:, 2] - rzv_m1) < 0.011) & (ru[:, 1] < -0.045)
                if np.any(mm_m1):
                    zm_b1[ki_m1] = float(np.median(pu[mm_m1, 2]))
                if np.any(mo_m1):
                    zo_b1[ki_m1] = float(np.median(pu[mo_m1, 2]))
            for arr_m1 in (zm_b1, zo_b1):
                ok_m1 = np.isfinite(arr_m1)
                if np.sum(ok_m1) >= 4:
                    arr_m1[:] = np.interp(rz_bins_m1, rz_bins_m1[ok_m1], arr_m1[ok_m1])
                    for _ in range(3):
                        arr_m1[1:-1] = 0.25 * arr_m1[:-2] + 0.50 * arr_m1[1:-1] + 0.25 * arr_m1[2:]
            if np.all(np.isfinite(zm_b1)) and np.all(np.isfinite(zo_b1)):
                tx_m1 = np.clip(np.abs(pu[:, 0]) / 0.046, 0.0, 1.0) ** 1.35
                rz_cm1 = np.clip(ru[:, 2], rz_bins_m1[0], rz_bins_m1[-1])
                z_ch_m1 = (1.0 - tx_m1) * np.interp(rz_cm1, rz_bins_m1, zm_b1) + tx_m1 * np.interp(rz_cm1, rz_bins_m1, zo_b1)
                lz_m1 = (w_mound_l1 > 0.02) & (pu[:, 2] < z_ch_m1) & (ru[:, 2] >= 1.022)
                pu[lz_m1, 2] = (1.0 - 0.85 * w_mound_l1[lz_m1]) * pu[lz_m1, 2] + 0.85 * w_mound_l1[lz_m1] * z_ch_m1[lz_m1]
            m1_idx = np.flatnonzero(w_mound_l1 > 0.01)
            if len(m1_idx):
                wm1 = w_mound_l1[m1_idx]
                for _ in range(6):
                    nbr_m1 = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[m1_idx, 0] += (0.34 * wm1) * (nbr_m1[m1_idx, 0] - pu[m1_idx, 0])
                    pu[m1_idx, 2] += (0.30 * wm1) * (nbr_m1[m1_idx, 2] - pu[m1_idx, 2])
                    pu[mid_u, 0] = 0.0
                for u_r in m1_idx:
                    rh_f, rn_f, _, _ = hbvh.ray_cast(
                        Vector((float(pu[u_r, 0]), -0.34, float(pu[u_r, 2]))),
                        Vector((0.0, 1.0, 0.0)),
                        0.30,
                    )
                    if rh_f is not None and float(rn_f.y) < -0.18:
                        wr_f = float(w_mound_l1[u_r])
                        pu[u_r, 1] = (1.0 - wr_f) * float(pu[u_r, 1]) + wr_f * float(rh_f.y)
                for _ in range(5):
                    nrm_m1 = vertex_normals(pu[weld], tri, weld)[first_u]
                    nbr_m1 = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    dp_m1 = nbr_m1[m1_idx] - pu[m1_idx]
                    dp_m1 -= np.einsum("ni,ni->n", dp_m1, nrm_m1[m1_idx])[:, None] * nrm_m1[m1_idx]
                    pu[m1_idx] += (0.35 * wm1)[:, None] * dp_m1
                    pu[mid_u, 0] = 0.0
                    for u_r in m1_idx:
                        rh_f, rn_f, _, _ = hbvh.ray_cast(
                            Vector((float(pu[u_r, 0]), -0.34, float(pu[u_r, 2]))),
                            Vector((0.0, 1.0, 0.0)),
                            0.30,
                        )
                        if rh_f is not None and float(rn_f.y) < -0.18:
                            wr_f = float(w_mound_l1[u_r])
                            pu[u_r, 1] = (1.0 - wr_f) * float(pu[u_r, 1]) + wr_f * float(rh_f.y)
        if resolved_sex_l1 == "male":
            # Eliminate `LOD1` diamond-decimation twin horns (`where LOD1 drops the X=0 vertex at Z~1.03m, leaving a 59mm flat midline
            # edge while keeping off-axis vertices at X=±19..23mm that previously stuck out further in -Y than the X=0 edge!`):
            ad_l1 = float(np.clip(adipose_gate, 0.0, 1.0))
            z_sag_lo = 0.985 - 0.030 * ad_l1
            z_sag_hi = 1.092 - 0.050 * ad_l1
            w_mid_sag = (
                np.where(mid_u, 1.0, 0.0)
                * smootherstep((pu[:, 2] - z_sag_lo) / 0.022)
                * (1.0 - smootherstep((pu[:, 2] - z_sag_hi) / 0.024))
                * smootherstep((-pu[:, 1] - 0.095) / 0.030)
            )
            pu[:, 1] -= 0.0020 * w_mid_sag
            m_ant_mid = mid_u & (pu[:, 2] >= 0.915) & (pu[:, 2] <= 1.118) & (pu[:, 1] < -0.055)
            if np.sum(m_ant_mid) >= 4:
                mid_ord = np.flatnonzero(m_ant_mid)
                mid_ord = mid_ord[np.argsort(pu[mid_ord, 2])]
                zm_poly = pu[mid_ord, 2].copy()
                ym_poly = pu[mid_ord, 1].copy()
                y_mid_at_z = np.interp(np.clip(pu[:, 2], zm_poly[0], zm_poly[-1]), zm_poly, ym_poly)
                ax_l1 = np.abs(pu[:, 0])
                y_keel_floor = y_mid_at_z + 0.0026 * np.clip(ax_l1 / 0.020, 0.0, 2.6) ** 1.65
                w_keel = (
                    np.where(~mid_u, 1.0, 0.0)
                    * (1.0 - smootherstep((ax_l1 - 0.048) / 0.014))
                    * smootherstep((pu[:, 2] - (0.958 - 0.036 * ad_l1)) / 0.018)
                    * (1.0 - smootherstep((pu[:, 2] - (1.090 - 0.046 * ad_l1)) / 0.022))
                    * smootherstep((-pu[:, 1] - 0.075) / 0.028)
                )
                horn_m = (w_keel > 0.01) & (pu[:, 1] < y_keel_floor)
                if np.any(horn_m):
                    pu[horn_m, 1] = (1.0 - w_keel[horn_m]) * pu[horn_m, 1] + w_keel[horn_m] * y_keel_floor[horn_m]
        # Smooth decimated LOD1 triangles across BOTH the anterior pubic-to-perineal turn AND the posterior perineal-to-cleft corner
        # (`strictly pu_init_z >= 0.935m` so upper inner-thigh adductors stay 100% full, and capped at `pu_z <= 0.974m` on `pu_y > 0.022m`
        # with `cleft_mid_u` X-locked so the upper natal cleft stays crisp while the Z=0.939m base corner rounds smoothly!):
        turn_y_max_l1 = 0.068 if adipose_gate <= 0.05 else 0.155
        z_turn_gate_l1 = (
            np.maximum(
                smootherstep((pu_init[:, 2] - 0.935) / 0.018),
                (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.042) / 0.014)) * smootherstep((ru[:, 2] - 0.966) / 0.016),
            )
            if adipose_gate <= 0.05
            else smootherstep((ru[:, 2] - 0.892) / 0.022)
        )
        y_turn_front_floor = 0.088 if resolved_sex_l1 == "male" else 0.175
        z_max_turn_l1 = np.where(pu[:, 1] > 0.022, 0.974, 1.018) if adipose_gate <= 0.05 else 0.978
        w_l1_turn = (
            (1.0 - smootherstep((np.abs(pu[:, 0]) - 0.056) / 0.024))
            * z_turn_gate_l1
            * (1.0 - smootherstep((pu[:, 2] - z_max_turn_l1) / 0.022))
            * smootherstep((pu[:, 1] + y_turn_front_floor) / 0.026)
            * (1.0 - smootherstep((pu[:, 1] - turn_y_max_l1) / 0.022 if adipose_gate <= 0.05 else (pu[:, 1] - 0.155) / 0.028))
        )
        lt_idx = np.flatnonzero(w_l1_turn > 0.01)
        if len(lt_idx):
            wlt = w_l1_turn[lt_idx, None]
            is_cm_lt = mid_u[lt_idx] | cleft_mid_u[lt_idx]
            non_m_lt = ~is_cm_lt
            sgn_lt = sgn_all[lt_idx]
            hop_lt = (
                np.minimum(0.85 * np.abs(ru[lt_idx, 0]), 0.0025)
                if adipose_gate <= 0.05
                else np.maximum(np.minimum(0.85 * np.abs(pu_init[lt_idx, 0]), 0.0032), 0.0020)
            )
            n_turn_it = 28 if adipose_gate <= 0.05 else 14
            mu_turn = 0.18 if adipose_gate <= 0.05 else 0.28
            for _ in range(n_turn_it):
                nbr1_lt = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                d1_lt = (0.46 * wlt) * (nbr1_lt[lt_idx] - pu[lt_idx])
                d1_lt[is_cm_lt, 0] = 0.0
                pu[lt_idx] += d1_lt
                pu[mid_u, 0] = 0.0
                pu[lt_idx[non_m_lt], 0] = sgn_lt[non_m_lt] * np.maximum(sgn_lt[non_m_lt] * pu[lt_idx[non_m_lt], 0], hop_lt[non_m_lt])
                nbr2_lt = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                d2_lt = (mu_turn * wlt) * (nbr2_lt[lt_idx] - pu[lt_idx])
                d2_lt[is_cm_lt, 0] = 0.0
                pu[lt_idx] -= d2_lt
                pu[mid_u, 0] = 0.0
                pu[lt_idx[non_m_lt], 0] = sgn_lt[non_m_lt] * np.maximum(sgn_lt[non_m_lt] * pu[lt_idx[non_m_lt], 0], hop_lt[non_m_lt])
        si_init_l1 = self_intersections(fit_pts, tri, weld)
        base_ar_l1 = face_areas(ref_pts, tri)
        bf_init_l1 = bad_faces(fit_pts, tri, base_ar_l1, conn)
        for _ in range(8):
            chk_l1_u = pu[weld].astype(np.float32).astype(np.float64)
            si_u1 = self_intersections(chk_l1_u, tri, weld) - si_init_l1
            bf_u1 = bad_faces(chk_l1_u, tri, base_ar_l1, conn) & (~bf_init_l1)
            if not si_u1 and not np.any(bf_u1):
                break
            ff_u1 = set(np.flatnonzero(bf_u1).tolist())
            for a, b in si_u1:
                ff_u1.add(a)
                ff_u1.add(b)
            pat_u1 = np.zeros(n_u, dtype=np.float64)
            pat_u1[np.unique(weld[tri[list(ff_u1)].ravel()])] = 1.0
            for _ in range(2):
                pat_u1 = np.maximum(pat_u1 * 0.72, np.bincount(es, weights=pat_u1[ed], minlength=n_u) / deg_u)
            for _ in range(4):
                nbr_u1 = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                pu += (0.45 * pat_u1)[:, None] * (nbr_u1 - pu)
                pu[mid_u, 0] = 0.0
        delta_l1 = pu - pu_init
        for _ in range(12):
            cur_l1 = (fit_pts + delta_l1[weld]).astype(np.float32).astype(np.float64)
            si_n1 = self_intersections(cur_l1, tri, weld) - si_init_l1
            bf_n1 = bad_faces(cur_l1, tri, base_ar_l1, conn) & (~bf_init_l1)
            if not si_n1 and not np.any(bf_n1):
                break
            fail_l1 = set(np.flatnonzero(bf_n1).tolist())
            for a, b in si_n1:
                fail_l1.add(a)
                fail_l1.add(b)
            att1 = np.zeros(n_u, dtype=np.float64)
            att1[np.unique(weld[tri[list(fail_l1)].ravel()])] = 1.0
            for _ in range(4):
                att1 = np.maximum(att1 * 0.78, np.bincount(es, weights=att1[ed], minlength=n_u) / deg_u)
            delta_l1 *= (1.0 - 0.35 * np.clip(att1, 0.0, 1.0))[:, None]
        return fit_pts + delta_l1[weld]

    ru_n = neutralize_ref_groin_sheet(ru)

    # 1. Symmetrize across canonical mirror vertex pairs in briefs/glutes/upper-thigh band (erases L/R briefs & upper-cleft asymmetry!)
    kd = KDTree(n_u)
    for idx_k, pt_k in enumerate(ru):
        kd.insert(pt_k.tolist(), idx_k)
    kd.balance()
    mir_idx = np.arange(n_u, dtype=np.int64)
    mir_ok = np.zeros(n_u, dtype=bool)
    tol_mir = 0.0045 if is_lod1 else 0.0018
    for idx_k in range(n_u):
        q = [-float(ru[idx_k, 0]), float(ru[idx_k, 1]), float(ru[idx_k, 2])]
        _, j_k, dist_k = kd.find(q)
        if dist_k <= tol_mir:
            mir_idx[idx_k] = int(j_k)
            mir_ok[idx_k] = True

    z_sym_top = np.where(ru[:, 1] > 0.01, 1.168, 1.148)
    w_sym_pel = (
        np.where(mir_ok, 1.0, 0.0)
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.145) / 0.032))
        * smootherstep((ru[:, 2] - 0.845) / 0.032)
        * (1.0 - smootherstep((ru[:, 2] - z_sym_top) / 0.030))
    )
    pu_mir = pu_init[mir_idx].copy()
    pu_mir[:, 0] *= -1.0
    pu_sym = (1.0 - 0.5 * w_sym_pel[:, None]) * pu_init + (0.5 * w_sym_pel[:, None]) * pu_mir
    pu_sym[mid_u, 0] = 0.0
    near_mid_all = (~mid_u) & (np.abs(ru[:, 0]) < 0.005)
    pu_sym[near_mid_all, 0] = sgn_all[near_mid_all] * np.maximum(
        sgn_all[near_mid_all] * pu_sym[near_mid_all, 0], 0.85 * np.abs(ru[near_mid_all, 0])
    )
    if (
        not is_lod1
        and adipose_gate <= 0.05
        and donor_xyz is not None
        and donor_tri is not None
        and posed_base is not None
        and jac_body is not None
    ):
        return _polish_lean_pelvis_mannequin_saddle_and_glutes(
            ref_pts,
            fit_pts,
            pu_sym,
            tri,
            conn,
            first_u,
            mid_u,
            mir_idx,
            w_sym_pel,
            pel_hops_u,
            donor_xyz,
            donor_tri,
            posed_base,
            jac_body,
            muscle_gate=muscle_gate,
        )
    pu = pu_sym.copy()

    # 2. Local 1st-order affine diffeomorphism across bare groin/crotch saddle (strictly below the Z~1.045m sub-belly crease so zero W-dimple forms!)
    w_diffeo = (
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.034) / 0.024))
        * smootherstep((ru[:, 2] - 0.980) / 0.020)
        * (1.0 - smootherstep((ru[:, 2] - 1.030) / 0.012))
        * (1.0 - smootherstep((pu_sym[:, 2] - 1.024) / 0.014))
        * smootherstep((ru[:, 1] - (-0.135)) / 0.020)
        * (1.0 - smootherstep((ru[:, 1] - 0.008) / 0.020))
    )
    cand_u = np.flatnonzero(
        (np.abs(ru[:, 0]) <= 0.082)
        & (ru[:, 2] >= 0.948)
        & (ru[:, 2] <= 1.085)
        & (ru[:, 1] >= -0.155)
        & (ru[:, 1] <= 0.045)
    )
    pouch_and_fan = (
        (1.0 - smootherstep((np.abs(ru[cand_u, 0]) - 0.019) / 0.009))
        * smootherstep((ru[cand_u, 2] - 1.006) / 0.009)
        * (1.0 - smootherstep((ru[cand_u, 2] - 1.048) / 0.012))
        * smootherstep((ru[cand_u, 1] - (-0.108)) / 0.016)
        * (1.0 - smootherstep((ru[cand_u, 1] - (-0.014)) / 0.014))
    )
    sw = 1.0 - 0.94 * pouch_and_fan

    p_idx = np.flatnonzero(w_diffeo > 1e-3)
    rc_pos = ru_n[cand_u].copy()
    rc_neg = rc_pos.copy()
    rc_neg[:, 0] *= -1.0
    pc_pos = pu_sym[cand_u].copy()
    pc_neg = pc_pos.copy()
    pc_neg[:, 0] *= -1.0

    rc_all = np.vstack([rc_pos, rc_neg])
    pc_all = np.vstack([pc_pos, pc_neg])
    sw_all = np.concatenate([sw, sw])

    hx, hy, hz = 0.024, 0.018, 0.026
    y_pred = np.zeros(len(p_idx), dtype=np.float64)
    z_pred = np.zeros(len(p_idx), dtype=np.float64)
    x_pred = np.zeros(len(p_idx), dtype=np.float64)

    reg = np.diag([0.0, 1e-4, 1e-4, 1e-4])
    for ii, ui in enumerate(p_idx):
        q = ru_n[ui]
        d0 = (rc_all[:, 0] - q[0]) / hx
        d1 = (rc_all[:, 1] - q[1]) / hy
        d2 = (rc_all[:, 2] - q[2]) / hz
        w = np.exp(-0.5 * (d0 * d0 + d1 * d1 + d2 * d2)) * sw_all
        X = np.column_stack([np.ones_like(d0), rc_all[:, 0] - q[0], rc_all[:, 1] - q[1], rc_all[:, 2] - q[2]])
        Xw = X * w[:, None]
        coef = np.linalg.solve(Xw.T @ X + reg, Xw.T @ pc_all)
        x_pred[ii] = coef[0, 0]
        y_pred[ii] = coef[0, 1]
        z_pred[ii] = coef[0, 2]

    x_pred[mid_u[p_idx]] = 0.0
    sgn_p = np.sign(ru[p_idx, 0])
    non_mid_p = ~mid_u[p_idx]
    x_pred[non_mid_p] = sgn_p[non_mid_p] * np.maximum(
        sgn_p[non_mid_p] * (0.65 * pu_sym[p_idx[non_mid_p], 0] + 0.35 * x_pred[non_mid_p]),
        0.90 * np.abs(ru[p_idx[non_mid_p], 0]),
    )

    wp = w_diffeo[p_idx]
    pu[p_idx, 0] = (1.0 - wp) * pu[p_idx, 0] + wp * x_pred
    pu[p_idx, 1] = (1.0 - wp) * pu[p_idx, 1] + wp * y_pred
    pu[p_idx, 2] = (1.0 - wp) * pu[p_idx, 2] + wp * z_pred
    pu[mid_u, 0] = 0.0

    # 3. Outward-convex normal lift + tangent spacing across front diagonal leg-opening groove, rear lower-glute hem, & lateral hip waistband
    elen = np.linalg.norm(ru[es] - ru[ed], axis=1)
    w_le = 1.0 / np.maximum(elen, 0.002)
    deg_le = np.maximum(np.bincount(es, weights=w_le, minlength=n_u), 1e-12)
    deg_u = np.maximum(np.bincount(es, minlength=n_u).astype(np.float64), 1.0)

    # Diagonal front swim-briefs leg-opening & gusset-border band (extends down to pu_z=0.805m so lower gusset ripple u=16264 lifts cleanly):
    z_front_hem_ctr = 0.878 + 1.28 * np.clip(np.abs(pu[:, 0]) - 0.022, 0.0, 0.125)
    w_front_hem = (
        smootherstep((np.abs(pu[:, 0]) - 0.016) / 0.014)
        * (1.0 - smootherstep((np.abs(pu[:, 0]) - 0.148) / 0.030))
        * np.exp(-(((pu[:, 2] - z_front_hem_ctr) / 0.072) ** 2))
        * smootherstep((pu[:, 2] - 0.805) / 0.026)
        * (1.0 - smootherstep((pu[:, 2] - 1.046) / 0.036))
        * (1.0 - smootherstep((pu[:, 1] - (-0.075)) / 0.032))
    )
    # Diagonal rear swim-briefs leg-opening band (runs from |pu_x|=0.03m, Z=0.90m up-outward to |pu_x|=0.20m, Z=1.08m):
    z_rear_hem_ctr = 0.902 + 1.02 * np.clip(np.abs(pu[:, 0]) - 0.032, 0.0, 0.175)
    w_back_hem = (
        smootherstep((np.abs(pu[:, 0]) - 0.022) / 0.014)
        * (1.0 - smootherstep((np.abs(pu[:, 0]) - 0.205) / 0.030))
        * np.exp(-(((pu[:, 2] - z_rear_hem_ctr) / 0.064) ** 2))
        * smootherstep((pu[:, 2] - 0.875) / 0.020)
        * (1.0 - smootherstep((pu[:, 2] - 1.115) / 0.028))
        * smootherstep((pu[:, 1] - 0.015) / 0.024)
        * (1.0 - smootherstep((pu[:, 1] - 0.220) / 0.030))
    )
    w_lat_hip_wb = (
        0.48
        * smootherstep((np.abs(ru[:, 0]) - 0.105) / 0.020)
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.168) / 0.024))
        * smootherstep((ru[:, 2] - 1.055) / 0.022)
        * (1.0 - smootherstep((ru[:, 2] - 1.145) / 0.024))
        * (1.0 - smootherstep((ru[:, 1] - (-0.065)) / 0.030))
    )
    # Horizontal rear/lumbar swim-briefs top elastic waistband indentation (pu_z ~ 1.188m across lower back, tapered off on outer flanks so natural love-handle-to-hip curve stays intact!):
    w_rear_wb = (
        0.56
        * (1.0 - smootherstep((np.abs(pu[:, 0]) - 0.162) / 0.028))
        * np.exp(-(((pu[:, 2] - 1.190) / 0.032) ** 2))
        * smootherstep((pu[:, 2] - 1.145) / 0.020)
        * (1.0 - smootherstep((pu[:, 2] - 1.235) / 0.020))
        * smootherstep((pu[:, 1] - 0.010) / 0.030)
    )
    w_hem = np.clip(np.maximum(np.maximum(w_front_hem, w_back_hem), np.maximum(w_lat_hip_wb, w_rear_wb)), 0.0, 1.0)
    hem_m = w_hem > 0.01
    if np.any(hem_m):
        wh_v = w_hem[hem_m, None]
        x_gate_h = smootherstep((np.abs(ru[hem_m, 0]) - 0.022) / 0.015)[:, None]
        nrm_p = vertex_normals(pu[weld], tri, weld)[first_u]
        for _it_nrm in range(38 if not is_lod1 else 20):
            if _it_nrm > 0 and (_it_nrm % 6) == 0:
                nrm_p = vertex_normals(pu[weld], tri, weld)[first_u]
            nbr_p = np.column_stack([np.bincount(es, weights=w_le * pu[ed, c], minlength=n_u) / deg_le for c in range(3)])
            dp = nbr_p[hem_m] - pu[hem_m]
            np_m = nrm_p[hem_m]
            dot_n = np.einsum("ni,ni->n", dp, np_m)[:, None]
            dp_n = dot_n * np_m
            dp_t = dp - dp_n
            # Concave-only normal lift + low tangential chord-shortening on posterior glutes erases any diagonal cloth-hem groove with 0.0mm buttock deflation!
            conv_h_gain = np.where(pu[hem_m, 1:2] > 0.015, 0.0, 0.08)
            tang_h_gain = np.where(pu[hem_m, 1:2] > 0.015, 0.08, 0.36)
            step_h = wh_v * (tang_h_gain * dp_t + np.where(dot_n > 0.0, 0.72, conv_h_gain) * dp_n)
            step_h[:, 0:1] *= x_gate_h
            pu[hem_m] += step_h
            pu[mid_u, 0] = 0.0
        # Zero-shrinkage surface Taubin fairing rounds off the -6.8mm outward cloth-hem lip crests on the lower glute profile without losing volume:
        for _ in range(18 if not is_lod1 else 8):
            nbr1_h = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            dh1 = (0.44 * wh_v) * (nbr1_h[hem_m] - pu[hem_m])
            dh1[:, 0:1] *= x_gate_h
            pu[hem_m] += dh1
            pu[mid_u, 0] = 0.0
            nbr2_h = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            dh2 = (0.466 * wh_v) * (nbr2_h[hem_m] - pu[hem_m])
            dh2[:, 0:1] *= x_gate_h
            pu[hem_m] -= dh2
            pu[mid_u, 0] = 0.0

    # 4. De-bunch & outward-convex lift midline pubic/perineal arch so zero V-slit or apex dimple remains
    w_mid_arch = (
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.026) / 0.018))
        * smootherstep((pu[:, 2] - 0.895) / 0.018)
        * (1.0 - smootherstep((pu[:, 2] - 0.992) / 0.022))
        * smootherstep((pu[:, 1] - (-0.215)) / 0.025)
        * (1.0 - smootherstep((pu[:, 1] - 0.065) / 0.025))
    )
    ma_m = w_mid_arch > 0.02
    if np.any(ma_m):
        wma_v = w_mid_arch[ma_m, None]
        nrm_ma = vertex_normals(pu[weld], tri, weld)[first_u]
        for _it_nrm in range(14 if not is_lod1 else 8):
            if _it_nrm > 0 and (_it_nrm % 6) == 0:
                nrm_ma = vertex_normals(pu[weld], tri, weld)[first_u]
            nbr_ma = np.column_stack([np.bincount(es, weights=w_le * pu[ed, c], minlength=n_u) / deg_le for c in range(3)])
            dp_ma = nbr_ma[ma_m] - pu[ma_m]
            nm_m = nrm_ma[ma_m]
            dot_ma = np.einsum("ni,ni->n", dp_ma, nm_m)[:, None]
            dp_mn = dot_ma * nm_m
            dp_mt = dp_ma - dp_mn
            step_ma = wma_v * (0.36 * dp_mt + np.where(dot_ma > 0.0, 0.58, 0.12) * dp_mn)
            step_ma[:, 0] *= smootherstep((np.abs(ru[ma_m, 0]) - 0.008) / 0.012)
            pu[ma_m] += step_ma
            pu[mid_u, 0] = 0.0
            pu[near_mid_all, 0] = sgn_all[near_mid_all] * np.maximum(
                sgn_all[near_mid_all] * pu[near_mid_all, 0], 0.90 * np.abs(ru[near_mid_all, 0])
            )

    w_apex_arc = (
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.018) / 0.014))
        * smootherstep((ru[:, 2] - 1.002) / 0.012)
        * (1.0 - smootherstep((ru[:, 2] - 1.036) / 0.014))
        * smootherstep((ru[:, 1] - (-0.068)) / 0.020)
        * (1.0 - smootherstep((ru[:, 1] - 0.028) / 0.020))
    )
    arc_m = w_apex_arc > 0.02
    if np.any(arc_m):
        wa_v = w_apex_arc[arc_m, None]
        for _ in range(10 if not is_lod1 else 5):
            nbr_a = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            dp_a = nbr_a[arc_m] - pu[arc_m]
            dp_a[:, 0] = 0.0
            dp_a[:, 2] = np.minimum(dp_a[:, 2], 0.0004)
            pu[arc_m] += (0.42 * wa_v) * dp_a

    # Smooth 3D lower natal-cleft base into perineal saddle so X=0 never tents above |X|=12..25mm into a triangular pucker!
    w_bg_cleft_base = (
        (0.46 if not is_lod1 else 0.30)
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.024) / 0.014))
        * smootherstep((pu[:, 2] - 0.876) / 0.014)
        * (1.0 - smootherstep((pu[:, 2] - 0.942) / 0.018))
        * smootherstep((pu[:, 1] - 0.004) / 0.018)
        * (1.0 - smootherstep((pu[:, 1] - 0.120) / 0.024))
    )
    bg_idx = np.flatnonzero(w_bg_cleft_base > 1e-3)
    for _ in range(10 if not is_lod1 else 6):
        nbr_b3 = np.column_stack([np.bincount(es, weights=w_le * pu[ed, c], minlength=n_u) / deg_le for c in range(3)])
        dp_b3 = nbr_b3[bg_idx] - pu[bg_idx]
        dp_b3[:, 0] *= smootherstep((np.abs(ru[bg_idx, 0]) - 0.008) / 0.010)
        pu[bg_idx] += w_bg_cleft_base[bg_idx, None] * dp_b3
        pu[mid_u, 0] = 0.0
        pu[near_mid_all, 0] = sgn_all[near_mid_all] * np.maximum(
            sgn_all[near_mid_all] * pu[near_mid_all, 0], 0.90 * np.abs(ru[near_mid_all, 0])
        )

    # 5. Perineal U-arch ceiling, bare anterior pubic/inguinal sheet, & full posterior intergluteal (natal) cleft:
    mid_sad_m = mid_u & (ru[:, 2] >= 1.005) & (ru[:, 2] <= 1.055)
    sad_drop_m = float(np.median(ru[mid_sad_m, 2] - pu[mid_sad_m, 2])) if np.any(mid_sad_m) else 0.0
    if sad_drop_m > 0.015:
        nrm_ru_pel = vertex_normals(ru[weld], tri, weld)[first_u]
        # Exclude ONLY the true lower cylindrical inner-thigh shaft (`ru_z < 0.895m` AND `pu_z < 0.862m`),
        # NEVER excluding `ru_z = 0.90..0.97m` groin-septum vertices (`v=8253..8267`, which otherwise stayed stuck at `Z=855..891mm`
        # and formed a sharp medial-thigh ledge at Z=0.88..0.90m!):
        is_thigh_shaft_wall = np.where(
            mid_u,
            0.0,
            smootherstep((-sgn_all * nrm_ru_pel[:, 0] - 0.52) / 0.22)
            * (1.0 - smootherstep((-nrm_ru_pel[:, 2] - 0.16) / 0.20))
            * (1.0 - smootherstep((np.abs(nrm_ru_pel[:, 1]) - 0.28) / 0.20))
            * (1.0 - smootherstep((ru[:, 2] - 0.895) / 0.016))
            * (1.0 - smootherstep((pu[:, 2] - 0.862) / 0.016)),
        )
        not_sidewall_pel = 1.0 - is_thigh_shaft_wall

        # 5pre) Proportional X-spreading + iso-row horizontal (Y, Z) pleat erasure + uniform-neighbor Tutte harmonic un-knotting:
        rear_upper_excl0 = smootherstep((pu[:, 1] - 0.025) / 0.024) * smootherstep((pu[:, 2] - 0.896) / 0.014)
        front_upper_excl0 = smootherstep((-pu[:, 1] - 0.125) / 0.028) * smootherstep((pu[:, 2] - 1.004) / 0.012)
        # Un-bunch ONLY the true perineal/pubic saddle (`ru_z >= 0.962m, pu_z >= 0.906m, |ru_x| <= 0.038m` — NEVER spreading
        # `ru_z = 0.875..0.960m` upper medial thighs out to lean thigh-gap width on `F > 0` full builds!):
        x_spread_w = (
            np.where(mid_u, 0.0, 0.88)
            * not_sidewall_pel
            * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.038) / 0.018))
            * smootherstep((ru[:, 2] - 0.962) / 0.022)
            * (1.0 - smootherstep((ru[:, 2] - 1.128) / 0.022))
            * smootherstep((pu[:, 2] - 0.904) / 0.020)
            * (1.0 - smootherstep((pu[:, 2] - 1.055) / 0.022))
        )
        xs_idx = np.flatnonzero(x_spread_w > 0.01)
        if len(xs_idx):
            rail_x_m = (np.abs(ru[:, 0]) >= 0.045) & (np.abs(ru[:, 0]) <= 0.075) & (ru[:, 2] >= 0.975) & (ru[:, 2] <= 1.075)
            x_scale_groin = float(np.median(np.abs(pu[rail_x_m, 0]) / np.maximum(np.abs(ru[rail_x_m, 0]), 1e-4))) if np.any(rail_x_m) else 0.92
            x_scale_groin = float(np.clip(x_scale_groin, 0.65, 1.05))
            x_prop_tgt = sgn_all[xs_idx] * np.maximum(x_scale_groin * np.abs(ru[xs_idx, 0]), 0.0022)
            pu[xs_idx, 0] = (1.0 - x_spread_w[xs_idx]) * pu[xs_idx, 0] + x_spread_w[xs_idx] * x_prop_tgt

        # Smooth ONLY the high-frequency pleat residual `(pu_y - y_quad_arch(|ru_x|, ru_z))` & sub-apron `pu_z` along canonical horizontal `ru_z` loops
        # across `ru_z = 0.915..1.122m` so +/-9mm swim-briefs pleats & lower-mons wrinkles vanish to 0.0mm while preserving 100% of the -286mm belly overhang!
        w_iso_pub_e = np.exp(-(((ru[es, 2] - ru[ed, 2]) / 0.0055) ** 2)) * np.exp(-(((ru[es, 1] - ru[ed, 1]) / 0.028) ** 2))
        deg_iso_pub = np.maximum(np.bincount(es, weights=w_iso_pub_e, minlength=n_u), 1e-12)
        w_iso_pub_u = (
            not_sidewall_pel
            * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.106) / 0.024))
            * smootherstep((ru[:, 2] - 0.915) / 0.022)
            * (1.0 - smootherstep((ru[:, 2] - (1.040 if adipose_gate > 0.20 else 1.122)) / 0.016))
            * smootherstep((-pu[:, 1] - 0.052) / 0.028)
        )
        if adipose_gate > 0.20:
            w_iso_pub_u = w_iso_pub_u * (1.0 - smootherstep((pu[:, 2] - 1.016) / 0.014))
        iso_idx = np.flatnonzero(w_iso_pub_u > 0.01)
        if len(iso_idx):
            # Fit low-order smooth cylindrical arch y_quad(ru_x, ru_z) = y0(ru_z) + c2(ru_z) * ru_x^2 so horizontal smoothing never flattens belly roundness!
            rz_bins_q = np.linspace(0.910, 1.130, 23)
            y0_q = np.full_like(rz_bins_q, np.nan)
            c2_q = np.zeros_like(rz_bins_q)
            cand_q = (not_sidewall_pel > 0.3) & (np.abs(ru[:, 0]) <= 0.115) & (pu[:, 1] < -0.045)
            for bi_q, bzv_q in enumerate(rz_bins_q):
                mb_q = cand_q & (np.abs(ru[:, 2] - bzv_q) < 0.008)
                if np.sum(mb_q) >= 5:
                    x2_v = ru[mb_q, 0] ** 2
                    yv_q = pu[mb_q, 1]
                    if np.ptp(x2_v) > 1e-4:
                        A_q = np.column_stack([np.ones_like(x2_v), x2_v])
                        coef_q, _, _, _ = np.linalg.lstsq(A_q, yv_q, rcond=None)
                        y0_q[bi_q] = float(coef_q[0])
                        c2_q[bi_q] = float(np.clip(coef_q[1], 0.0, 8.5))
                    else:
                        y0_q[bi_q] = float(np.median(yv_q))
            fin_q = np.isfinite(y0_q)
            if np.sum(fin_q) >= 4:
                y0_q = np.interp(rz_bins_q, rz_bins_q[fin_q], y0_q[fin_q])
                c2_q = np.interp(rz_bins_q, rz_bins_q[fin_q], c2_q[fin_q])
                for _ in range(4):
                    y0_q[1:-1] = 0.25 * y0_q[:-2] + 0.50 * y0_q[1:-1] + 0.25 * y0_q[2:]
                    c2_q[1:-1] = 0.25 * c2_q[:-2] + 0.50 * c2_q[1:-1] + 0.25 * c2_q[2:]
                y_arch_base = np.interp(np.clip(ru[:, 2], rz_bins_q[0], rz_bins_q[-1]), rz_bins_q, y0_q) + np.interp(
                    np.clip(ru[:, 2], rz_bins_q[0], rz_bins_q[-1]), rz_bins_q, c2_q
                ) * (ru[:, 0] ** 2)
            else:
                y_arch_base = np.zeros(n_u, dtype=np.float64)
            y_res_iso = pu[:, 1] - y_arch_base
            z_iso_cur = pu[:, 2].copy()
            w_iso_y = 0.58 * w_iso_pub_u[iso_idx]
            # Restrict Z row-averaging strictly below the lower-belly apron overhang (ru_z <= 1.072m) so Z=1.06..1.09m overhang stays 100% sharp!
            w_iso_z = 0.58 * w_iso_pub_u[iso_idx] * (1.0 - smootherstep((ru[iso_idx, 2] - 1.058) / 0.018))
            for _ in range(48):
                nbr_yr = np.bincount(es, weights=w_iso_pub_e * y_res_iso[ed], minlength=n_u) / deg_iso_pub
                nbr_zi = np.bincount(es, weights=w_iso_pub_e * z_iso_cur[ed], minlength=n_u) / deg_iso_pub
                y_res_iso[iso_idx] += w_iso_y * (nbr_yr[iso_idx] - y_res_iso[iso_idx])
                z_iso_cur[iso_idx] += w_iso_z * (nbr_zi[iso_idx] - z_iso_cur[iso_idx])
            pu[iso_idx, 1] = y_arch_base[iso_idx] + y_res_iso[iso_idx]
            pu[iso_idx, 2] = z_iso_cur[iso_idx]

        w_tutte_pre = (
            0.80
            * not_sidewall_pel
            * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.042) / 0.018))
            * smootherstep((ru[:, 2] - 0.958) / 0.022)
            * (1.0 - smootherstep((ru[:, 2] - 1.102) / 0.018))
            * smootherstep((pu[:, 2] - 0.896) / 0.022)
            * (1.0 - smootherstep((pu[:, 2] - 1.004) / 0.012))
            * (1.0 - 0.96 * rear_upper_excl0)
            * (1.0 - 0.99 * front_upper_excl0)
        )
        tp_idx = np.flatnonzero(w_tutte_pre > 1e-3)
        if len(tp_idx):
            wtp_v = w_tutte_pre[tp_idx, None]
            non_mid_tp = ~mid_u[tp_idx]
            sgn_tp = sgn_all[tp_idx]
            for _ in range(72):
                nbr_tp = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_tp = nbr_tp[tp_idx] - pu[tp_idx]
                dp_tp[:, 2] *= 0.90
                pu[tp_idx] += wtp_v * dp_tp
                pu[mid_u, 0] = 0.0
                pu[tp_idx[non_mid_tp], 0] = sgn_tp[non_mid_tp] * np.maximum(
                    sgn_tp[non_mid_tp] * pu[tp_idx[non_mid_tp], 0], 0.0018
                )

        # Ensure full adipose medial thighs keep natural proximity without crossing X=0 (`>= 2.2 mm` midline safety -> 0 self-x!):
        med_th_non_mid = (~mid_u) & (ru[:, 2] >= 0.68) & (ru[:, 2] <= 1.02) & (np.abs(ru[:, 0]) <= 0.095)
        pu[med_th_non_mid, 0] = sgn_all[med_th_non_mid] * np.maximum(sgn_all[med_th_non_mid] * pu[med_th_non_mid, 0], 0.0022)
        pu_unknotted_x = np.abs(pu[:, 0]).copy()
        min_x_safe_all = np.where(mid_u, 0.0, np.maximum(0.62 * pu_unknotted_x, 0.0020))

        # === FINAL ORDERED PELVIS FINISH (runs LAST so nothing downstream can re-wrinkle or re-ratchet!) ===
        # Step A (Medial-anterior upper-thigh adductor fullness): runs FIRST on medial upper thighs (Y in [-0.074, +0.038m], Z=0.742..0.915m),
        #         NEVER crushing curved hamstrings/quads to a flat vertical wall — 0 posterior thigh cliff, 0 front inner-thigh diagonal creases!
        th_ap_m = (ru[:, 2] >= 0.78) & (ru[:, 2] <= 0.86) & (np.abs(ru[:, 0]) >= 0.04) & (np.abs(ru[:, 0]) <= 0.14)
        ap_ru = (float(np.percentile(ru[th_ap_m, 1], 95)) - float(np.percentile(ru[th_ap_m, 1], 5))) if np.any(th_ap_m) else 0.15
        ap_pu = (float(np.percentile(pu[th_ap_m, 1], 95)) - float(np.percentile(pu[th_ap_m, 1], 5))) if np.any(th_ap_m) else 0.15
        thigh_fat_t = float(np.clip((ap_pu - ap_ru) / 0.052, 0.0, 1.20))
        if thigh_fat_t > 0.02:
            cos_med_p = np.clip(1.0 - (((pu[:, 1] + 0.014) / 0.088) ** 2), 0.0, 1.0) ** 1.35
            w_add_bell = (
                np.where(~mid_u, 1.0, 0.0)
                * (1.0 - smootherstep((np.abs(pu[:, 0]) - 0.068) / 0.028))
                * smootherstep((pu[:, 2] - 0.742) / 0.068)
                * (1.0 - smootherstep((pu[:, 2] - 0.962) / 0.032))
                * (1.0 - smootherstep((ru[:, 2] - 1.022) / 0.026))
                * cos_med_p
            )
            x_min_rest_th = 0.0046 + 0.0052 * (1.0 - smootherstep((pu[:, 2] - 0.755) / 0.130)) + 0.0048 * smootherstep((pu[:, 2] - 0.905) / 0.045)
            cur_ax_p = np.abs(pu[:, 0])
            dx_add = (0.0195 * min(thigh_fat_t, 1.05)) * w_add_bell
            x_add_tgt = np.where(cur_ax_p > x_min_rest_th, np.maximum(x_min_rest_th, cur_ax_p - dx_add), cur_ax_p)
            pu[:, 0] = sgn_all * x_add_tgt

            # Smoothly close the upper inner-thigh / perineal septum walls (|ru_x|<=0.034m, pu_x pulled out to 38..50mm!)
            # so plump F=100 inner thighs taper naturally into a narrow, low rounded perineal arch instead of an 84mm keyhole cavern!
            w_sept_only = (
                np.where(~mid_u, 1.0, 0.0)
                * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.032) / 0.016))
                * (1.0 - smootherstep((np.abs(pu[:, 0]) - 0.058) / 0.020))
                * smootherstep((ru[:, 2] - 0.915) / 0.030)
                * (1.0 - smootherstep((ru[:, 2] - 1.028) / 0.022))
                * (1.0 - smootherstep((pu[:, 2] - 0.972) / 0.022))
                * (1.0 - smootherstep((np.abs(pu[:, 1] + 0.022) - 0.088) / 0.028))
            )
            x_sept_goal = np.maximum(0.0058 + 0.0045 * smootherstep((pu[:, 2] - 0.918) / 0.035), 0.88 * np.abs(ru[:, 0]))
            cur_ax_s = np.abs(pu[:, 0])
            pu[:, 0] = sgn_all * ((1.0 - 0.88 * w_sept_only) * cur_ax_s + (0.88 * w_sept_only) * np.minimum(cur_ax_s, x_sept_goal))
            pu[mid_u, 0] = 0.0

            w_th_fair = (
                np.where(~mid_u, 1.0, 0.0)
                * (1.0 - smootherstep((np.abs(pu[:, 0]) - 0.072) / 0.028))
                * smootherstep((pu[:, 2] - 0.725) / 0.045)
                * (1.0 - smootherstep((pu[:, 2] - 0.974) / 0.024))
                * (1.0 - smootherstep((np.abs(pu[:, 1] + 0.018) - 0.088) / 0.028))
            )
            mp_idx = np.flatnonzero(w_th_fair > 0.01)
            if len(mp_idx):
                wmp_v = w_th_fair[mp_idx, None]
                sgn_mp = sgn_all[mp_idx]
                min_mp_sub = np.where(ru[mp_idx, 2] < 0.945, x_min_rest_th[mp_idx], 0.0024)
                nrm_mp = vertex_normals(pu[weld], tri, weld)[first_u]
                for _it_nrm in range(18):
                    if _it_nrm > 0 and (_it_nrm % 6) == 0:
                        nrm_mp = vertex_normals(pu[weld], tri, weld)[first_u]
                    nbr_mp = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    dp_mp = nbr_mp[mp_idx] - pu[mp_idx]
                    nv_mp = nrm_mp[mp_idx]
                    dp_mpt = dp_mp - np.einsum("ni,ni->n", dp_mp, nv_mp)[:, None] * nv_mp
                    pu[mp_idx] += (0.52 * wmp_v) * dp_mpt
                    pu[mid_u, 0] = 0.0
                    pu[mp_idx, 0] = sgn_mp * np.maximum(sgn_mp * pu[mp_idx, 0], min_mp_sub)
                for _ in range(10):
                    nbr1_m = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[mp_idx] += (0.34 * wmp_v) * (nbr1_m[mp_idx] - pu[mp_idx])
                    nbr2_m = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[mp_idx] -= (0.358 * wmp_v) * (nbr2_m[mp_idx] - pu[mp_idx])
                    pu[mid_u, 0] = 0.0
                    pu[mp_idx, 0] = sgn_mp * np.maximum(sgn_mp * pu[mp_idx, 0], min_mp_sub)

        pu_mir_f = pu[mir_idx].copy()
        pu_mir_f[:, 0] *= -1.0
        pu = (1.0 - 0.5 * w_sym_pel[:, None]) * pu + (0.5 * w_sym_pel[:, None]) * pu_mir_f
        pu[mid_u, 0] = 0.0

    pu[mid_u, 0] = 0.0

    si_base = self_intersections(fit_pts, tri, weld)
    base_ar = face_areas(ref_pts, tri)
    bf_base = bad_faces(fit_pts, tri, base_ar, conn)
    # Untangle any locally compressed groin/cleft face on pu BEFORE delta_u attenuation so vertices NEVER snap back to Z=881mm or comb-teeth!
    for _ in range(36):
        chk_pel = pu[weld].astype(np.float32).astype(np.float64)
        si_u_p = self_intersections(chk_pel, tri, weld) - si_base
        bf_u_p = bad_faces(chk_pel, tri, base_ar, conn) & (~bf_base)
        if not si_u_p and not np.any(bf_u_p):
            break
        ff_up = set(np.flatnonzero(bf_u_p).tolist())
        for a, b in si_u_p:
            ff_up.add(a)
            ff_up.add(b)
        pat_up = np.zeros(n_u, dtype=np.float64)
        pat_up[np.unique(weld[tri[list(ff_up)].ravel()])] = 1.0
        for _ in range(4):
            pat_up = np.maximum(pat_up * 0.78, np.bincount(es, weights=pat_up[ed], minlength=n_u) / deg_u)
        for _ in range(8):
            nbr_up = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            pu += (0.52 * pat_up)[:, None] * (nbr_up - pu)
            pu[mid_u, 0] = 0.0

    delta_u = pu - pu_init
    for _ in range(12):
        cur_pts = (fit_pts + delta_u[weld]).astype(np.float32).astype(np.float64)
        si_new = self_intersections(cur_pts, tri, weld) - si_base
        bf_mask = bad_faces(cur_pts, tri, base_ar, conn) & (~bf_base)
        if not si_new and not np.any(bf_mask):
            break
        fail_f = set(np.flatnonzero(bf_mask).tolist())
        for a, b in si_new:
            fail_f.add(a)
            fail_f.add(b)
        att = np.zeros(n_u, dtype=np.float64)
        att[np.unique(weld[tri[list(fail_f)].ravel()])] = 1.0
        for _ in range(4):
            att = np.maximum(att * 0.78, np.bincount(es, weights=att[ed], minlength=n_u) / deg_u)
        delta_u *= (1.0 - 0.35 * np.clip(att, 0.0, 1.0))[:, None]

    return fit_pts + delta_u[weld]


def polish_axilla_and_upper_lat(
    ref_pts: np.ndarray,
    fit_pts: np.ndarray,
    tri: np.ndarray,
    seam_mask: np.ndarray,
    is_lod1: bool = False,
    alias_groups: list[list[int]] | None = None,
    arm_weight: np.ndarray | None = None,
    pose_info: dict | None = None,
    donor_xyz: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
    posed_base: np.ndarray | None = None,
    jac_body: np.ndarray | None = None,
    adipose_gate: float = 1.0,
    muscle_gate: float = 0.5,
) -> np.ndarray:
    """Unpinch high Rest-A-pose anterior/central axillary fold, restore monotonic medial upper-arm taper, bridge outer-breast crease, and drape upper-lat back fold."""
    conn = weld_connectivity(ref_pts, tri, decimals=5)
    weld, (es, ed), mult, deg = conn
    n_u = len(mult)
    deg_u = np.maximum(deg.astype(np.float64), 1.0)
    first_u = np.zeros(n_u, dtype=np.int64)
    first_u[weld[::-1]] = np.arange(len(weld) - 1, -1, -1)

    ru = ref_pts[first_u]
    pu_init = np.column_stack([np.bincount(weld, weights=fit_pts[:, c], minlength=n_u) / mult for c in range(3)])
    pu = pu_init.copy()
    lock_u = np.isin(np.arange(n_u), weld[seam_mask]) | (np.abs(ru[:, 0]) < 2.5e-4)

    elen = np.linalg.norm(ru[es] - ru[ed], axis=1)
    w_le = 1.0 / np.maximum(elen, 0.0018)
    deg_le = np.maximum(np.bincount(es, weights=w_le, minlength=n_u), 1e-12)

    # Measure donor chest/pectoral fullness gated by adipose_gate (0.0 on lean/muscular F=0 builds so muscle bellies are never fat-smoothed!)
    pec_probe = (
        (np.abs(ru[:, 0]) >= 0.085)
        & (np.abs(ru[:, 0]) <= 0.145)
        & (ru[:, 2] >= 1.445)
        & (ru[:, 2] <= 1.505)
        & (ru[:, 1] < -0.065)
    )
    pec_fwd = max(0.0, float(np.median(ru[pec_probe, 1] - pu_init[pec_probe, 1]))) if np.any(pec_probe) else 0.0
    fat_ax_scale = float(np.clip((pec_fwd - 0.012) / 0.052, 0.0, 1.25)) * float(np.clip(adipose_gate, 0.0, 1.0))

    if fat_ax_scale > 0.02:
        rx, ry, rz = ru.T
        sgn = np.sign(rx)

        nrm_ru = vertex_normals(ru[weld], tri, weld)[first_u]
        # 0) Run free-arm sleeve fairing FIRST (strictly on the free arm shaft |rx|>=0.236m, w_arm_u>=0.42) so cylindrical arm tapering
        #    NEVER crushes the anterior deltopectoral/axillary fold (-145mm -> -85mm) or pinches the Z=1.49m rear armpit!
        if not is_lod1 and fat_ax_scale > 0.02 and arm_weight is not None and pose_info is not None and "sides" in pose_info:
            w_arm_u0 = arm_weight[first_u]
            w_arm_sleeve = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((w_arm_u0 - 0.42) / 0.24)
                * smootherstep((np.abs(rx) - 0.236) / 0.040)
                * (1.0 - smootherstep((np.abs(rx) - 0.488) / 0.020))
                * min(fat_ax_scale, 1.0)
            )
            sl_idx = np.flatnonzero(w_arm_sleeve > 0.01)
            if len(sl_idx):
                pu_pre_arm = pu.copy()
                wsl_v = w_arm_sleeve[sl_idx, None]
                nrm_a = vertex_normals(pu[weld], tri, weld)[first_u]
                for _it_nrm in range(28):
                    if _it_nrm > 0 and (_it_nrm % 6) == 0:
                        nrm_a = vertex_normals(pu[weld], tri, weld)[first_u]
                    nbr_pa = np.column_stack([np.bincount(es, weights=w_le * pu[ed, c], minlength=n_u) / deg_le for c in range(3)])
                    dp_a = nbr_pa[sl_idx] - pu[sl_idx]
                    nv_a = nrm_a[sl_idx]
                    dot_a = np.einsum("ni,ni->n", dp_a, nv_a)[:, None]
                    dp_an = dot_a * nv_a
                    dp_at_s = dp_a - dp_an
                    pu[sl_idx] += wsl_v * (0.56 * dp_at_s + np.where(dot_a > 0.0, 0.52, 0.07) * dp_an)
                for _ in range(24):
                    nbr1_a = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[sl_idx] += (0.42 * wsl_v) * (nbr1_a[sl_idx] - pu[sl_idx])
                    nbr2_a = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[sl_idx] -= (0.444 * wsl_v) * (nbr2_a[sl_idx] - pu[sl_idx])
                for side_key, spec_s in pose_info["sides"].items():
                    sgn_s = 1.0 if side_key == "plusX" else -1.0
                    sh_r = np.asarray(spec_s["arm"]["rest"][0], dtype=np.float64)
                    el_r = np.asarray(spec_s["arm"]["rest"][1], dtype=np.float64)
                    wr_r = np.asarray(spec_s["arm"]["rest"][2], dtype=np.float64)
                    u_vec_s = el_r - sh_r
                    u_len_s = max(float(np.linalg.norm(u_vec_s)), 1e-4)
                    l_vec_s = wr_r - el_r
                    l_len_s = max(float(np.linalg.norm(l_vec_s)), 1e-4)
                    side_sl = sl_idx[sgn_s * rx[sl_idx] > 0.0]
                    if not len(side_sl):
                        continue
                    t_u = ((ru[side_sl] - sh_r[None, :]) @ (u_vec_s / u_len_s)) / u_len_s
                    t_l = ((ru[side_sl] - el_r[None, :]) @ (l_vec_s / l_len_s)) / l_len_s
                    c_ax = np.where(
                        (t_u <= 1.0)[:, None],
                        sh_r[None, :] + np.clip(t_u, 0.0, 1.0)[:, None] * u_vec_s[None, :],
                        el_r[None, :] + np.clip(t_l, 0.0, 1.05)[:, None] * l_vec_s[None, :],
                    )
                    s_coord = np.where(t_u <= 1.0, t_u, 1.0 + np.clip(t_l, 0.0, 1.05))
                    v_pre = pu_pre_arm[side_sl] - c_ax
                    v_cur = pu[side_sl] - c_ax
                    b_hat = np.where((t_u <= 1.0)[:, None], (u_vec_s / u_len_s)[None, :], (l_vec_s / l_len_s)[None, :])
                    vp_pre = v_pre - np.einsum("ni,ni->n", v_pre, b_hat)[:, None] * b_hat
                    vp_cur = v_cur - np.einsum("ni,ni->n", v_cur, b_hat)[:, None] * b_hat
                    ry_pre = np.abs(vp_pre[:, 1])
                    ry_cur = np.abs(vp_cur[:, 1])
                    rn_pre = np.hypot(vp_pre[:, 0], vp_pre[:, 2])
                    rn_cur = np.hypot(vp_cur[:, 0], vp_cur[:, 2])

                    s_ctrs = np.linspace(0.08, 1.98, 39)
                    my_pre = np.empty(len(s_ctrs), dtype=np.float64)
                    my_cur = np.empty(len(s_ctrs), dtype=np.float64)
                    mn_pre = np.empty(len(s_ctrs), dtype=np.float64)
                    mn_cur = np.empty(len(s_ctrs), dtype=np.float64)
                    for b_i, sc_b in enumerate(s_ctrs):
                        wk = np.exp(-0.5 * (((s_coord - sc_b) / 0.105) ** 2))
                        wsum = max(float(np.sum(wk)), 1e-12)
                        my_pre[b_i] = float(np.sqrt(np.sum(wk * (ry_pre ** 2)) / wsum))
                        my_cur[b_i] = float(np.sqrt(np.sum(wk * (ry_cur ** 2)) / wsum))
                        mn_pre[b_i] = float(np.sqrt(np.sum(wk * (rn_pre ** 2)) / wsum))
                        mn_cur[b_i] = float(np.sqrt(np.sum(wk * (rn_cur ** 2)) / wsum))
                    for _ in range(12):
                        my_pre[1:-1] = 0.25 * my_pre[:-2] + 0.50 * my_pre[1:-1] + 0.25 * my_pre[2:]
                        my_cur[1:-1] = 0.25 * my_cur[:-2] + 0.50 * my_cur[1:-1] + 0.25 * my_cur[2:]
                        mn_pre[1:-1] = 0.25 * mn_pre[:-2] + 0.50 * mn_pre[1:-1] + 0.25 * mn_pre[2:]
                        mn_cur[1:-1] = 0.25 * mn_cur[:-2] + 0.50 * mn_cur[1:-1] + 0.25 * mn_cur[2:]

                    def build_monotonic_arm_taper(arr_in: np.ndarray) -> np.ndarray:
                        tgt = arr_in.copy()
                        i_hi = int(np.argmin(np.abs(s_ctrs - 0.86)))
                        i_lo = int(np.argmin(np.abs(s_ctrs - 1.14)))
                        if i_lo > i_hi + 1:
                            lin_el = np.linspace(tgt[i_hi], tgt[i_lo], i_lo - i_hi + 1)
                            tgt[i_hi : i_lo + 1] = np.maximum(tgt[i_hi : i_lo + 1], lin_el - 0.0022)
                        i_fm = int(np.argmin(np.abs(s_ctrs - 1.46)))
                        i_wr = int(np.argmin(np.abs(s_ctrs - 1.95)))
                        if i_wr > i_fm + 1:
                            lin_wr = np.linspace(tgt[i_fm], tgt[i_wr], i_wr - i_fm + 1)
                            tgt[i_fm : i_wr + 1] = np.minimum(tgt[i_fm : i_wr + 1], lin_wr)
                        for k_i in range(1, len(s_ctrs)):
                            allow_swell = 0.0012 if (1.04 <= s_ctrs[k_i] <= 1.28) else 0.0
                            if s_ctrs[k_i] >= 0.28 and tgt[k_i] > tgt[k_i - 1] + allow_swell:
                                tgt[k_i] = tgt[k_i - 1] + allow_swell
                        w_fm_pin = np.exp(-(((s_ctrs - 1.38) / 0.15) ** 2))
                        tgt = (1.0 - 0.88 * w_fm_pin) * tgt + (0.88 * w_fm_pin) * arr_in
                        for _ in range(10):
                            tgt[1:-1] = 0.25 * tgt[:-2] + 0.50 * tgt[1:-1] + 0.25 * tgt[2:]
                        return tgt

                    tgt_y_s = build_monotonic_arm_taper(my_pre)
                    tgt_n_s = build_monotonic_arm_taper(mn_pre)
                    s_cl = np.clip(s_coord, s_ctrs[0], s_ctrs[-1])
                    sy_v = np.clip(np.interp(s_cl, s_ctrs, tgt_y_s) / np.maximum(np.interp(s_cl, s_ctrs, my_cur), 1e-4), 0.80, 1.14)
                    sn_v = np.clip(np.interp(s_cl, s_ctrs, tgt_n_s) / np.maximum(np.interp(s_cl, s_ctrs, mn_cur), 1e-4), 0.85, 1.14)
                    w_sv = w_arm_sleeve[side_sl]
                    v_long = v_cur - vp_cur
                    vp_out = vp_cur.copy()
                    vp_out[:, 1] *= 1.0 + w_sv * (sy_v - 1.0)
                    vp_out[:, 0] *= 1.0 + w_sv * (sn_v - 1.0)
                    vp_out[:, 2] *= 1.0 + w_sv * (sn_v - 1.0)
                    pu[side_sl] = c_ax + v_long + vp_out

                for _ in range(14):
                    nbr1_f = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[sl_idx] += (0.36 * wsl_v) * (nbr1_f[sl_idx] - pu[sl_idx])
                    nbr2_f = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[sl_idx] -= (0.380 * wsl_v) * (nbr2_f[sl_idx] - pu[sl_idx])

        if not is_lod1:
            # 1a) Relax occluded axillary-dome tangential bunching across the full anterior-to-posterior chest/lat-to-axilla transition (|rx| = 0.132..0.242m)
            #     including the anterior axillary fold (ry down to -0.132m) so ZERO high pinch or step forms in Front, 3/4, or Rear armpits!
            w_untuck = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((np.abs(rx) - 0.132) / 0.034)
                * (1.0 - smootherstep((np.abs(rx) - 0.242) / 0.030))
                * smootherstep((rz - 1.482) / 0.032)
                * (1.0 - smootherstep((rz - 1.614) / 0.034))
                * smootherstep((ry + 0.132) / 0.030)
                * (1.0 - smootherstep((ry - 0.148) / 0.032))
                * min(fat_ax_scale, 1.0)
            )
            df_u = pu - ru
            for _ in range(24):
                nbr_df = np.column_stack([np.bincount(es, weights=w_le * df_u[ed, c], minlength=n_u) / deg_le for c in range(3)])
                df_u += (0.50 * w_untuck)[:, None] * (nbr_df - df_u)
            pu = ru + df_u

            # 1b) Smoothly lower the FULL U-shaped axillary arch — anterior pectoral-bicep fold, central ceiling, AND posterior teres-tricep fold
            #     (ry = -0.132..+0.148m) — so BOTH front and rear armpits sit at natural height (~1.50m) across Front, 3/4, Profile, Back, Posed, Rest LOD0 & LOD1!
            ant_ax_crease = (
                smootherstep((-ry - 0.022) / 0.038)
                * (1.0 - smootherstep((-ry - 0.134) / 0.028))
                * smootherstep((np.abs(rx) - 0.146) / 0.026)
                * (1.0 - smootherstep((np.abs(rx) - 0.242) / 0.030))
            )
            post_ax_crease = (
                smootherstep((ry - 0.020) / 0.038)
                * (1.0 - smootherstep((ry - 0.148) / 0.028))
                * smootherstep((np.abs(rx) - 0.148) / 0.026)
                * (1.0 - smootherstep((np.abs(rx) - 0.244) / 0.030))
            )
            ax_vault_dir = np.maximum(-nrm_ru[:, 2], 0.55 * (-nrm_ru[:, 2]) + 0.62 * np.maximum(ant_ax_crease, post_ax_crease))
            w_dome_raw = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((np.abs(rx) - 0.140) / 0.032)
                * (1.0 - smootherstep((np.abs(rx) - 0.254) / 0.036))
                * smootherstep((rz - 1.488) / 0.032)
                * (1.0 - smootherstep((rz - 1.612) / 0.036))
                * smootherstep((ry + 0.132) / 0.030)
                * (1.0 - smootherstep((ry - 0.150) / 0.032))
                * smootherstep((ax_vault_dir - 0.10) / 0.28)
            )
            w_unpinch = w_dome_raw.copy()
            for _ in range(26):
                w_unpinch = 0.35 * w_unpinch + 0.65 * (np.bincount(es, weights=w_unpinch[ed], minlength=n_u) / deg_u)
            w_unpinch[lock_u] = 0.0
            pu[:, 2] -= (0.047 * fat_ax_scale) * w_unpinch
            pu[:, 1] -= (0.0055 * fat_ax_scale) * w_unpinch * smootherstep((-ry - 0.036) / 0.036)
            pu[:, 1] += (0.0055 * fat_ax_scale) * w_unpinch * smootherstep((ry - 0.036) / 0.036)

            # Fill ONLY the deep recessed upper anterior axillary slit (|rx|=0.168..0.248m, rz=1.508..1.622m) WITHOUT paving flat over
            # the rounded outer breast border (`|X|=0.145..0.175m`) or bulging the lateral chest outward in X!
            w_ant_pec_raw = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((np.abs(rx) - 0.168) / 0.024)
                * (1.0 - smootherstep((np.abs(rx) - 0.248) / 0.028))
                * smootherstep((rz - 1.508) / 0.030)
                * (1.0 - smootherstep((rz - 1.622) / 0.030))
                * smootherstep((ry + 0.118) / 0.026)
                * (1.0 - smootherstep((ry - 0.016) / 0.024))
            )
            w_ant_pec_br = w_ant_pec_raw.copy()
            for _ in range(8):
                w_ant_pec_br = 0.45 * w_ant_pec_br + 0.55 * (np.bincount(es, weights=w_ant_pec_br[ed], minlength=n_u) / deg_u)
            w_ant_pec_br[lock_u] = 0.0
            pocket_boost_y = 0.016 + 0.014 * smootherstep((ry + 0.068) / 0.028)
            pu[:, 1] -= (pocket_boost_y * min(fat_ax_scale, 1.15)) * w_ant_pec_br
            apb_idx = np.flatnonzero(w_ant_pec_br > 0.03)
            if len(apb_idx):
                wapb_v = w_ant_pec_br[apb_idx, None]
                nrm_ap = vertex_normals(pu[weld], tri, weld)[first_u]
                for _it_nrm in range(26):
                    if _it_nrm > 0 and (_it_nrm % 6) == 0:
                        nrm_ap = vertex_normals(pu[weld], tri, weld)[first_u]
                    nbr_ap = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    dp_ap = nbr_ap[apb_idx] - pu[apb_idx]
                    nv_ap = nrm_ap[apb_idx]
                    dot_ap = np.einsum("ni,ni->n", dp_ap, nv_ap)[:, None]
                    dp_apn = dot_ap * nv_ap
                    dp_apt = dp_ap - dp_apn
                    pu[apb_idx] += wapb_v * (0.56 * dp_apt + np.where(dot_ap > 0.0, 0.60, 0.06) * dp_apn)

            # Symmetric posterior teres-major / rear-axillary bridge (|rx|=0.146..0.244m, rz=1.468..1.608m, ry=+0.008..+0.148m):
            # Moderate +Y bridge (13mm max, NEVER creating a Rest-pose rear-armpit pillow!) + concave fairing lowering the rear armpit slit cleanly to ~1.498m:
            w_post_lat_raw = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((np.abs(rx) - 0.146) / 0.026)
                * (1.0 - smootherstep((np.abs(rx) - 0.244) / 0.030))
                * smootherstep((rz - 1.468) / 0.036)
                * (1.0 - smootherstep((rz - 1.608) / 0.030))
                * smootherstep((ry - 0.008) / 0.026)
                * (1.0 - smootherstep((ry - 0.148) / 0.028))
            )
            w_post_lat_br = w_post_lat_raw.copy()
            for _ in range(20):
                w_post_lat_br = 0.40 * w_post_lat_br + 0.60 * (np.bincount(es, weights=w_post_lat_br[ed], minlength=n_u) / deg_u)
            w_post_lat_br[lock_u] = 0.0
            post_pocket_boost_y = 0.009 + 0.007 * (1.0 - smootherstep((ry - 0.068) / 0.032))
            pu[:, 1] += (post_pocket_boost_y * min(fat_ax_scale, 1.10)) * w_post_lat_br
            pu[:, 0] += sgn * (0.0065 * min(fat_ax_scale, 1.10)) * w_post_lat_br
            plb_idx = np.flatnonzero(w_post_lat_br > 0.03)
            if len(plb_idx):
                wplb_v = w_post_lat_br[plb_idx, None]
                nrm_pl = vertex_normals(pu[weld], tri, weld)[first_u]
                for _it_nrm in range(24):
                    if _it_nrm > 0 and (_it_nrm % 6) == 0:
                        nrm_pl = vertex_normals(pu[weld], tri, weld)[first_u]
                    nbr_pl = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    dp_pl = nbr_pl[plb_idx] - pu[plb_idx]
                    nv_pl = nrm_pl[plb_idx]
                    dot_pl = np.einsum("ni,ni->n", dp_pl, nv_pl)[:, None]
                    dp_pln = dot_pl * nv_pl
                    dp_plt = dp_pl - dp_pln
                    pu[plb_idx] += wplb_v * (0.56 * dp_plt + np.where(dot_pl > 0.0, 0.56, 0.08) * dp_pln)

            # 1c) Restore collision-free monotonic Rest-A-pose medial/inferior (+ep) upper-arm taper across the ribcage-occluded proximal bicep/tricep:
            #     On full-bodied donors, the proximal medial upper arm (t=0.18..0.56) is pressed against the ribcage in the statue scan,
            #     leaving a concave medial scoop that creates a mid-humerus Popeye lump when lifted. Add ~13mm along +ep (leaving >=8.5mm air clearance)!
            if arm_weight is not None and pose_info is not None and "sides" in pose_info:
                w_arm_u = arm_weight[first_u]
                for side_key, spec_s in pose_info["sides"].items():
                    sgn_s = 1.0 if side_key == "plusX" else -1.0
                    sh_r = np.asarray(spec_s["arm"]["rest"][0], dtype=np.float64)
                    el_r = np.asarray(spec_s["arm"]["rest"][1], dtype=np.float64)
                    u_vec_s = el_r - sh_r
                    u_len_s = max(float(np.linalg.norm(u_vec_s)), 1e-4)
                    u_hat_s = u_vec_s / u_len_s
                    ep_raw = np.array([-sgn_s * abs(u_hat_s[2]), 0.0, -abs(u_hat_s[0])], dtype=np.float64)
                    ep_s = ep_raw - float(np.dot(ep_raw, u_hat_s)) * u_hat_s
                    ep_s /= max(float(np.linalg.norm(ep_s)), 1e-6)

                    rel_u = ru - sh_r[None, :]
                    t_hum = (rel_u @ u_hat_s) / u_len_s
                    c_hum = sh_r[None, :] + np.clip(t_hum, -0.10, 1.20)[:, None] * u_vec_s[None, :]
                    r_hum = ru - c_hum
                    r_hum_n = np.maximum(np.linalg.norm(r_hum, axis=1), 1e-4)
                    zeta_ep = np.clip((r_hum @ ep_s) / r_hum_n, -1.0, 1.0)

                    w_side_arm = (
                        np.where(~lock_u, 1.0, 0.0)
                        * smootherstep((sgn_s * rx - 0.145) / 0.030)
                        * smootherstep((w_arm_u - 0.35) / 0.30)
                    )
                    w_med_fill = (
                        w_side_arm
                        * smootherstep((t_hum - 0.14) / 0.15)
                        * (1.0 - smootherstep((t_hum - 0.60) / 0.24))
                        * (np.clip(zeta_ep + 0.12, 0.0, 1.12) / 1.12) ** 1.35
                    )
                    pu += ((0.0085 * min(fat_ax_scale, 1.12)) * w_med_fill)[:, None] * ep_s[None, :]

            # 2) Exact Donor-calibrated upper-latissimus / teres-major V-taper + rear-armpit cliff fill strictly ABOVE the first back fold
            #    (Z>=1.448m) AND natural downward/inward gravity drape of the first back fold's lateral tip (Z~1.405m) so the first fold
            #    falls naturally beneath a broader, continuous upper-lat V-taper!
            # Keep posterior upper-lat V-taper (`w_sub_ax_fill`) & posterior fold-1 drape (`w_fold1_crest_drape`) STRICTLY on the back (`ry >= +0.024m`)
            # so they NEVER bulge X outward at Z=1.46..1.50m or pinch X inward at Z=1.406m on the anterior/lateral chest silhouette!
            abs_px_cur = np.abs(pu[:, 0])
            w_arm_lat_excl = (1.0 - smootherstep((arm_weight[first_u] - 0.52) / 0.26)) if arm_weight is not None else 1.0
            w_sub_ax_fill = (
                np.where(~lock_u, 1.0, 0.0)
                * w_arm_lat_excl
                * smootherstep((abs_px_cur - 0.148) / 0.024)
                * (1.0 - smootherstep((np.abs(rx) - 0.242) / 0.028))
                * smootherstep((pu[:, 2] - 1.446) / 0.028)
                * (1.0 - smootherstep((pu[:, 2] - 1.560) / 0.032))
                * smootherstep((ry - 0.024) / 0.032)
                * (1.0 - smootherstep((ry - 0.154) / 0.028))
            )
            pu[:, 0] += sgn * (0.0110 * min(fat_ax_scale, 1.08)) * w_sub_ax_fill
            pu[:, 1] += (0.0110 * min(fat_ax_scale, 1.08)) * w_sub_ax_fill * smootherstep((ry - 0.028) / 0.032)

            if donor_xyz is not None and posed_base is not None and jac_body is not None:
                z_lat_g = np.linspace(1.340, 1.555, 44)
                x_lat_don = np.full_like(z_lat_g, np.nan)
                for zi_l, zv_l in enumerate(z_lat_g):
                    if 1.448 <= zv_l <= 1.502:
                        continue  # Bridge cleanly across Donor's fused-armpit crease so x_lat_don never dips to 218mm!
                    ml_d = (donor_xyz[:, 1] > 0.058) & (np.abs(donor_xyz[:, 2] - zv_l) < 0.009) & (np.abs(donor_xyz[:, 0]) < 0.256)
                    if np.sum(ml_d) >= 8:
                        x_lat_don[zi_l] = float(np.percentile(np.abs(donor_xyz[ml_d, 0]), 98.5))
                fin_ld = np.isfinite(x_lat_don)
                if np.sum(fin_ld) >= 8:
                    x_lat_don = np.interp(z_lat_g, z_lat_g[fin_ld], x_lat_don[fin_ld])
                    for zi_l in range(1, len(z_lat_g)):
                        if z_lat_g[zi_l] >= 1.368:
                            x_lat_don[zi_l] = max(x_lat_don[zi_l], x_lat_don[zi_l - 1] + 0.0005)
                    for _ in range(16):
                        x_lat_don[1:-1] = 0.25 * x_lat_don[:-2] + 0.50 * x_lat_don[1:-1] + 0.25 * x_lat_don[2:]
                    jac_u_l = jac_body[first_u]
                    w_arm_u_lat = arm_weight[first_u] if arm_weight is not None else np.zeros(n_u, dtype=np.float64)
                    for gain_l in (0.88, 0.72):
                        posed_u_l = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u_l, pu - ru)
                        x_lat_tgt = np.interp(np.clip(posed_u_l[:, 2], z_lat_g[0], z_lat_g[-1]), z_lat_g, x_lat_don)
                        y_lat_prof = 1.0 - 0.042 * ((np.clip((posed_u_l[:, 1] - 0.072) / 0.075, -1.0, 1.0)) ** 2)
                        x_lat_goal = x_lat_tgt * y_lat_prof
                        arm_cap_l = 0.45 + 0.48 * smootherstep((posed_u_l[:, 2] - 1.448) / 0.028)
                        w_arm_lat_allow = 1.0 - smootherstep((w_arm_u_lat - arm_cap_l) / 0.22)
                        w_lat_match = (
                            np.where(~lock_u, 1.0, 0.0)
                            * w_arm_lat_allow
                            * smootherstep((np.abs(posed_u_l[:, 0]) - 0.174) / 0.024)
                            * (1.0 - smootherstep((np.abs(rx) - 0.252) / 0.028))
                            * smootherstep((posed_u_l[:, 2] - 1.358) / 0.022)
                            * (1.0 - smootherstep((posed_u_l[:, 2] - 1.548) / 0.026))
                            * smootherstep((posed_u_l[:, 1] - 0.008) / 0.030)
                            * (1.0 - smootherstep((posed_u_l[:, 1] - 0.150) / 0.028))
                        )
                        is_fold1_excess = (posed_u_l[:, 2] >= 1.375) & (posed_u_l[:, 2] <= 1.456) & (np.abs(posed_u_l[:, 0]) > x_lat_goal - 0.0040)
                        lm_idx = np.flatnonzero((w_lat_match > 0.01) & ((np.abs(posed_u_l[:, 0]) < x_lat_goal) | is_fold1_excess))
                        if len(lm_idx):
                            tgt_x_l = np.where(is_fold1_excess[lm_idx], x_lat_goal[lm_idx] - 0.0040, x_lat_goal[lm_idx])
                            dx_lat = gain_l * w_lat_match[lm_idx] * (sgn[lm_idx] * tgt_x_l - posed_u_l[lm_idx, 0])
                            dp_l_posed = np.zeros((len(lm_idx), 3), dtype=np.float64)
                            dp_l_posed[:, 0] = dx_lat
                            jl = jac_u_l[lm_idx]
                            jtj_l = np.einsum("nji,njk->nik", jl, jl) + 0.038 * np.eye(3)[None, :, :]
                            jtr_l = np.einsum("nji,nj->ni", jl, dp_l_posed)
                            pu[lm_idx] += np.linalg.solve(jtj_l, jtr_l[:, :, None])[:, :, 0]

            w_fold1_crest_drape = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((np.abs(pu[:, 0]) - 0.156) / 0.022)
                * (1.0 - smootherstep((np.abs(rx) - 0.236) / 0.026))
                * np.exp(-(((pu[:, 2] - 1.406) / 0.026) ** 2))
                * smootherstep((ry - 0.026) / 0.030)
                * (1.0 - smootherstep((ry - 0.155) / 0.026))
            )
            pu[:, 0] -= sgn * (0.0068 * min(fat_ax_scale, 1.05)) * w_fold1_crest_drape
            pu[:, 1] -= (0.0038 * min(fat_ax_scale, 1.05)) * w_fold1_crest_drape * smootherstep((ry - 0.020) / 0.028)
            pu[:, 2] -= (0.0048 * min(fat_ax_scale, 1.05)) * w_fold1_crest_drape

            # Gently fill any slight posterior rear-axillary hollow (rz=1.452..1.515m, |rx|=0.150..0.228m) so the upper lat sits
            # smoothly full above the first back fold instead of pinching inward above a protruding fold!
            w_rear_ax_fill = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((np.abs(rx) - 0.150) / 0.024)
                * (1.0 - smootherstep((np.abs(rx) - 0.228) / 0.026))
                * np.exp(-(((rz - 1.478) / 0.026) ** 2))
                * smootherstep((ry - 0.022) / 0.028)
                * (1.0 - smootherstep((ry - 0.152) / 0.026))
            )
            pu[:, 1] += (0.0032 * min(fat_ax_scale, 1.05)) * w_rear_ax_fill

            w_upper_lat = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((np.abs(pu[:, 0]) - 0.156) / 0.022)
                * (1.0 - smootherstep((np.abs(rx) - 0.232) / 0.028))
                * smootherstep((pu[:, 2] - 1.355) / 0.026)
                * (1.0 - smootherstep((pu[:, 2] - 1.548) / 0.030))
                * smootherstep((ry + 0.060) / 0.026)
                * (1.0 - smootherstep((ry - 0.150) / 0.028))
            )
            lat_idx = np.flatnonzero(w_upper_lat > 0.01)
            if len(lat_idx):
                wl = w_upper_lat[lat_idx] * min(fat_ax_scale, 1.0)
                for _ in range(26):
                    nbr_p = np.column_stack([np.bincount(es, weights=w_le * pu[ed, c], minlength=n_u) / deg_le for c in range(3)])
                    pu[lat_idx, 0] += (0.50 * wl) * (nbr_p[lat_idx, 0] - pu[lat_idx, 0])
                    pu[lat_idx, 1] += (0.42 * wl) * (nbr_p[lat_idx, 1] - pu[lat_idx, 1])

            # Upper-scapular / teres-minor displacement fairing (`df_sc = pu - ru`) + zero-shrinkage Taubin strictly ABOVE the first back fold
            # (`rz >= 1.448m`, `|rx| = 0.125..0.262m`) so LOD0 Back has ZERO vertical dimples or trunk_neck/arm shadow step at |rx|=0.208m:
            w_upper_scap = (
                np.where(~lock_u, 1.0, 0.0)
                * smootherstep((np.abs(rx) - 0.125) / 0.024)
                * (1.0 - smootherstep((np.abs(rx) - 0.258) / 0.028))
                * smootherstep((rz - 1.448) / 0.024)
                * (1.0 - smootherstep((rz - 1.592) / 0.028))
                * smootherstep((ry - 0.012) / 0.028)
                * (1.0 - smootherstep((ry - 0.158) / 0.026))
                * min(fat_ax_scale, 1.0)
            )
            usc_idx = np.flatnonzero(w_upper_scap > 0.01)
            if len(usc_idx):
                wusc = w_upper_scap[usc_idx, None]
                df_sc = pu - ru
                for _ in range(85):
                    nbr_dfs = np.column_stack([np.bincount(es, weights=w_le * df_sc[ed, c], minlength=n_u) / deg_le for c in range(3)])
                    df_sc[usc_idx] += (0.48 * wusc) * (nbr_dfs[usc_idx] - df_sc[usc_idx])
                pu = ru + df_sc
                for _ in range(20):
                    nbr1_s = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[usc_idx] += (0.36 * wusc) * (nbr1_s[usc_idx] - pu[usc_idx])
                    nbr2_s = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    pu[usc_idx] -= (0.378 * wusc) * (nbr2_s[usc_idx] - pu[usc_idx])

        # 2b) Smooth lateral & posterolateral V-taper silhouette wrap (Z=1.350..1.555m, strictly |pu_x| >= 0.158m so inner back folds stay crisp!)
        #     with minimal convex shrinkage on coarse LOD1 so LOD1 NEVER pinches inward under the rear armpit:
        w_sidewall_sm = (
            np.where(~lock_u, 1.0, 0.0)
            * smootherstep((np.abs(pu[:, 0]) - 0.158) / 0.022)
            * (1.0 - smootherstep((np.abs(rx) - 0.258) / 0.028))
            * smootherstep((pu[:, 2] - 1.350) / 0.026)
            * (1.0 - smootherstep((pu[:, 2] - 1.555) / 0.032))
            * smootherstep((ry + 0.072) / 0.024)
            * (1.0 - smootherstep((ry - 0.152) / 0.028))
            * min(fat_ax_scale, 1.0)
        )
        sw_idx = np.flatnonzero(w_sidewall_sm > 0.01)
        if len(sw_idx):
            wsw = w_sidewall_sm[sw_idx, None]
            conv_sw = 0.02 if is_lod1 else 0.03
            nrm_sw = vertex_normals(pu[weld], tri, weld)[first_u]
            for _it_nrm in range(28 if not is_lod1 else 8):
                if _it_nrm > 0 and (_it_nrm % 6) == 0:
                    nrm_sw = vertex_normals(pu[weld], tri, weld)[first_u]
                nbr_sw = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_sw = nbr_sw[sw_idx] - pu[sw_idx]
                nv_sw = nrm_sw[sw_idx]
                dot_sw = np.einsum("ni,ni->n", dp_sw, nv_sw)[:, None]
                dp_swn = dot_sw * nv_sw
                dp_swt = dp_sw - dp_swn
                pu[sw_idx] += wsw * (0.54 * dp_swt + np.where(dot_sw > 0.0, 0.56, conv_sw) * dp_swn)

        # 3) Explicit 3D axillary dome lowering + concave harmonic arch relaxation across outer-breast & anterior-to-posterior axilla:
        #    Drops the skinny canonical Z~1520mm armpit apex down toward the heavy F=100 donor's Z~1475mm axillary fold!
        w_ax_vault_drop = (
            np.where(~lock_u, 1.0, 0.0)
            * smootherstep((np.abs(rx) - 0.146) / 0.024)
            * (1.0 - smootherstep((np.abs(rx) - 0.226) / 0.028))
            * smootherstep((rz - 1.490) / 0.026)
            * (1.0 - smootherstep((rz - 1.572) / 0.032))
            * smootherstep((ry + 0.098) / 0.028)
            * (1.0 - smootherstep((ry - 0.086) / 0.028))
            * min(fat_ax_scale, 1.0)
        )
        pu[:, 2] -= (0.0165 if not is_lod1 else 0.0030) * w_ax_vault_drop

        z_ax_br_floor = np.where(np.abs(rx) < 0.176, 1.516, 1.448)
        w_ax_bridge = (
            np.where(~lock_u, 1.0, 0.0)
            * smootherstep((np.abs(rx) - 0.132) / 0.028)
            * (1.0 - smootherstep((np.abs(rx) - 0.258) / 0.032))
            * smootherstep((rz - z_ax_br_floor) / 0.026)
            * (1.0 - smootherstep((rz - 1.592) / 0.058))
            * smootherstep((ry + 0.132) / 0.030)
            * (1.0 - smootherstep((ry - 0.155) / 0.032))
            * min(fat_ax_scale, 1.0)
        )
        br_idx = np.flatnonzero(w_ax_bridge > 0.01)
        if len(br_idx):
            wb = w_ax_bridge[br_idx, None]
            n_passes = 64 if not is_lod1 else 16
            nrm_cur = vertex_normals(pu[weld], tri, weld)[first_u]
            for _it_nrm in range(n_passes):
                if _it_nrm > 0 and (_it_nrm % 6) == 0:
                    nrm_cur = vertex_normals(pu[weld], tri, weld)[first_u]
                nbr_b = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_b = nbr_b[br_idx] - pu[br_idx]
                nb_v = nrm_cur[br_idx]
                dot_b = np.einsum("ni,ni->n", dp_b, nb_v)[:, None]
                dp_bn = dot_b * nb_v
                dp_bt = dp_b - dp_bn
                pu[br_idx] += wb * (0.52 * dp_bt + np.where(dot_b > 0.0, 0.72, 0.02) * dp_bn)

        # 3b) Exact BVH-raycast Raw-Donor anterior chest & single-groove circular crescent breast fold (|X| = 0.030..0.174m, natural n_z < 0
        #     underside, ZERO outer-breast W-dimples, and ZERO lateral chest bicep-to-ribcage horizontal cliff in Profile!):
        if (
            not is_lod1
            and adipose_gate > 0.05
            and donor_xyz is not None
            and donor_tri is not None
            and posed_base is not None
            and jac_body is not None
        ):
            xg_ch = np.linspace(0.000, 0.256, 129)
            zg_ch = np.linspace(1.396, 1.616, 111)
            _ch_cp = _donor_grid_key(donor_xyz, "chest-v1")
            if _ch_cp.is_file():
                yg_ch = np.load(_ch_cp).copy()
            else:
                dbvh_ch = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri.tolist(), all_triangles=True)
                yg_ch = np.full((len(xg_ch), len(zg_ch)), np.nan, dtype=np.float64)
                for xi_c, xv_c in enumerate(xg_ch):
                    for zi_c, zv_c in enumerate(zg_ch):
                        vals_c = []
                        for s_c in (1.0, -1.0) if xv_c > 1e-4 else (1.0,):
                            rh_c, rn_c, _, _ = dbvh_ch.ray_cast(Vector((s_c * float(xv_c), -0.45, float(zv_c))), Vector((0.0, 1.0, 0.0)), 0.43)
                            if rh_c is not None and rh_c.y < -0.055 and rn_c.y < -0.04:
                                vals_c.append(float(rh_c.y))
                        if vals_c:
                            yg_ch[xi_c, zi_c] = float(np.mean(vals_c))
                for xi_c in range(len(xg_ch)):
                    fc = np.isfinite(yg_ch[xi_c])
                    if np.sum(fc) >= 6:
                        yg_ch[xi_c] = np.interp(zg_ch, zg_ch[fc], yg_ch[xi_c, fc])
                for zi_c in range(len(zg_ch)):
                    fc = np.isfinite(yg_ch[:, zi_c])
                    if np.sum(fc) >= 6:
                        yg_ch[:, zi_c] = np.interp(xg_ch, xg_ch[fc], yg_ch[fc, zi_c])
                np.save(_ch_cp, yg_ch)
            if np.all(np.isfinite(yg_ch)):
                # Smooth lateral ribcage/arm-junction columns (`|X| >= 0.138m` below Z=1.452m, `|X| >= 0.168m` above) so neither the Z~1432mm
                # flank ribcrease nor the Z~1472mm pressed-bicep contact edge stamps a horizontal line onto Front or Profile!
                x_sm_thr = 0.136 + 0.032 * smootherstep((zg_ch[1:-1] - 1.448) / 0.024)
                w_lat_pec_sm = smootherstep((xg_ch[:, None] - x_sm_thr[None, :]) / 0.018) * (
                    smootherstep((zg_ch[1:-1] - 1.406) / 0.018) * (1.0 - smootherstep((zg_ch[1:-1] - 1.548) / 0.022))
                )[None, :]
                for _ in range(56):
                    yg_ch[:, 1:-1] = (1.0 - 0.68 * w_lat_pec_sm) * yg_ch[:, 1:-1] + (0.68 * w_lat_pec_sm) * (0.5 * (yg_ch[:, :-2] + yg_ch[:, 2:]))

                # Trace the Raw Donor's TRUE low-hanging heavy pectoral fold:
                # High medially (~1484mm at |X|=34mm), sweeping down through Z~1450mm at |X|=120mm to its true low outer-pole
                # bottom Z~1441-1442.5mm at |X|=145-150mm, and ONLY wrapping upward past |X|=156mm into the ~1490mm front armpit!
                # NEVER shave or erase the lower-outer breast (`no w_subcup_erase`)!
                zi_sub_c = np.flatnonzero((zg_ch >= 1.430) & (zg_ch <= 1.498))
                z_sulc_raw = np.empty(len(xg_ch), dtype=np.float64)
                for xi_c in range(len(xg_ch)):
                    v_sc_c = yg_ch[xi_c, zi_sub_c] - 0.5 * (
                        yg_ch[xi_c, np.maximum(zi_sub_c - 5, 0)] + yg_ch[xi_c, np.minimum(zi_sub_c + 5, len(zg_ch) - 1)]
                    )
                    z_sulc_raw[xi_c] = float(zg_ch[zi_sub_c[int(np.argmax(v_sc_c))]])
                z_sulc_clamped = np.clip(z_sulc_raw, 1.436, 1.494)
                i_cup_bot = int(round(0.146 / 0.002))
                z_med_start = float(np.clip(np.median(z_sulc_clamped[15:21]), 1.476, 1.488))
                z_mid_120 = float(np.clip(np.median(z_sulc_clamped[56:64]), 1.446, 1.454))
                z_cup_min = float(np.clip(np.median(z_sulc_clamped[i_cup_bot - 5 : i_cup_bot + 6]), 1.438, 1.445))
                # Follow Donor's REAL measured valley curve monotonically from sternum (`1482mm`) down to the low cup bottom (`~1443.5mm`
                # across `|X|=128..138mm`), then curve smoothly UPWARD (`1446mm` at `|X|=145mm` -> `1488mm` at `|X|=184mm`) into a rounded U-cup!
                z_sulc_x = z_sulc_clamped.copy()
                i_med_0 = int(round(0.032 / 0.002))
                i_cup_turn = int(round(0.132 / 0.002))
                for k_m in range(i_med_0 + 1, i_cup_turn + 1):
                    z_sulc_x[k_m] = min(z_sulc_x[k_m], z_sulc_x[k_m - 1])
                z_sulc_x[:i_med_0] = z_sulc_x[i_med_0]
                z_turn_val = float(np.clip(z_sulc_x[i_cup_turn] - 0.0025, 1.4415, 1.4460))
                z_sulc_x[i_cup_turn] = z_turn_val
                u_up_wrap = np.clip((xg_ch[i_cup_turn:] - 0.132) / (0.184 - 0.132), 0.0, 1.15)
                z_sulc_x[i_cup_turn:] = z_turn_val + 0.045 * (np.minimum(u_up_wrap, 1.0) ** 1.85) + 0.008 * np.maximum(u_up_wrap - 1.0, 0.0)
                for _ in range(22):
                    z_sulc_x[1:-1] = 0.25 * z_sulc_x[:-2] + 0.50 * z_sulc_x[1:-1] + 0.25 * z_sulc_x[2:]

                # Preserve the Donor's natural concave lateral breast border (`|X|=0.148..0.184m`) so the outer breast wraps upward
                # into a rounded U-cup; fill ONLY deep axillary cleft slits strictly outside `|X| >= 0.184m` and `Z >= 1.508m`!
                i_dp_in = int(round(0.184 / 0.002))
                i_dp_out = int(round(0.248 / 0.002))
                if i_dp_out > i_dp_in + 2:
                    t_dp_x = np.linspace(0.0, 1.0, i_dp_out - i_dp_in + 1)[:, None]
                    w_x_bell = np.sin(np.pi * t_dp_x)
                    y_dp_chord = (1.0 - t_dp_x) * yg_ch[i_dp_in : i_dp_in + 1, :] + t_dp_x * yg_ch[i_dp_out : i_dp_out + 1, :] + 0.0135 * w_x_bell
                    w_dp_z = w_x_bell * smootherstep((zg_ch - 1.508) / 0.024)[None, :] * (1.0 - smootherstep((zg_ch - 1.608) / 0.024))[None, :]
                    yg_filled = np.minimum(yg_ch[i_dp_in : i_dp_out + 1, :], y_dp_chord)
                    yg_ch[i_dp_in : i_dp_out + 1, :] = (1.0 - 0.78 * w_dp_z) * yg_ch[i_dp_in : i_dp_out + 1, :] + (0.78 * w_dp_z) * yg_filled

                # Gentle 3-pass facet removal on yg_ch while preserving >96% of Donor's real crease depth & convex breast dome:
                for _ in range(3):
                    yg_ch[1:-1, :] = 0.22 * yg_ch[:-2, :] + 0.56 * yg_ch[1:-1] + 0.22 * yg_ch[2:, :]
                for _ in range(2):
                    yg_ch[:, 1:-1] = 0.14 * yg_ch[:, :-2] + 0.72 * yg_ch[:, 1:-1] + 0.14 * yg_ch[:, 2:]

                # Step 3b-i: Strongly unbunch CG's compressed chest quad rows tangentially (`64` passes) BEFORE projecting onto yg_ch
                # so no old low CG edge-loop shadow survives below the Donor's high inner-sternum crescent (`Z=1482mm -> 1441mm`)!
                w_tan_ch = (
                    np.where(~lock_u, 1.0, 0.0)
                    * smootherstep((np.abs(rx) - 0.016) / 0.014)
                    * (1.0 - smootherstep((np.abs(rx) - 0.238) / 0.024))
                    * smootherstep((rz - 1.392) / 0.020)
                    * (1.0 - smootherstep((rz - 1.608) / 0.024))
                    * smootherstep((-ry - 0.014) / 0.024)
                )
                tc_idx = np.flatnonzero(w_tan_ch > 0.01)
                if len(tc_idx):
                    wtc_v = (0.58 * w_tan_ch[tc_idx])[:, None]
                    nrm_tc = vertex_normals(pu[weld], tri, weld)[first_u]
                    for _it_nrm in range(64):
                        if _it_nrm > 0 and (_it_nrm % 8) == 0:
                            nrm_tc = vertex_normals(pu[weld], tri, weld)[first_u]
                        nbr_tc = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                        dp_tc = nbr_tc[tc_idx] - pu[tc_idx]
                        nv_tc = nrm_tc[tc_idx]
                        dp_tct = dp_tc - np.einsum("ni,ni->n", dp_tc, nv_tc)[:, None] * nv_tc
                        pu[tc_idx] += wtc_v * dp_tct

                # Step 3b-ii: Align a continuous vertex ribbon along Donor's curved crescent valley `z_sulc_x` (`eliminating 20mm Z chord gaps!`)
                # and project 1:1 onto `yg_ch`:
                jac_u_c = jac_body[first_u]
                w_arm_u_ch = arm_weight[first_u] if arm_weight is not None else np.zeros(n_u, dtype=np.float64)
                lat_ch_w = np.exp(-(((ru[es, 2] - ru[ed, 2]) / 0.0085) ** 2))
                lat_ch_deg = np.maximum(np.bincount(es, weights=lat_ch_w, minlength=n_u), 1e-12)
                for pass_c, gain_c in enumerate((0.96, 0.90, 0.86)):
                    posed_v_c = posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts)
                    posed_u_c = posed_v_c[first_u]
                    nrm_posed_u = vertex_normals(posed_v_c, tri, weld)[first_u]
                    ax_pc = np.abs(posed_u_c[:, 0])
                    pz_pc = posed_u_c[:, 2]
                    z_sulc_u = np.interp(np.clip(ax_pc, xg_ch[0], xg_ch[-1]), xg_ch, z_sulc_x)
                    w_cup_x = smootherstep((ax_pc - 0.028) / 0.018) * (1.0 - smootherstep((ax_pc - 0.172) / 0.022))
                    dz_sulc_u = z_sulc_u - pz_pc
                    z_slide_g = 0.68 if pass_c == 0 else (0.42 if pass_c == 1 else 0.0)
                    dp_pz_c = z_slide_g * w_cup_x * np.clip(dz_sulc_u, -0.0068, 0.0068) * np.exp(-((dz_sulc_u / 0.0120) ** 2))
                    if z_slide_g > 0.0:
                        for _ in range(5):
                            dp_pz_c = 0.62 * dp_pz_c + 0.38 * (np.bincount(es, weights=lat_ch_w * dp_pz_c[ed], minlength=n_u) / lat_ch_deg)
                    pz_query = pz_pc + dp_pz_c

                    xf_c = np.clip((ax_pc - xg_ch[0]) / (xg_ch[1] - xg_ch[0]), 0.0, len(xg_ch) - 1.0001)
                    zf_c = np.clip((pz_query - zg_ch[0]) / (zg_ch[1] - zg_ch[0]), 0.0, len(zg_ch) - 1.0001)
                    x0_c, z0_c = xf_c.astype(np.int64), zf_c.astype(np.int64)
                    tx_c, tz_c = xf_c - x0_c, zf_c - z0_c
                    inner_boost = 1.0 + 0.32 * (1.0 - smootherstep((ax_pc - 0.060) / 0.060))
                    # Use Donor's exact un-gouged yg_ch (ZERO synthetic +Y ribcage gouging so tuck matches Donor's 6..11.8mm 1:1!):
                    y_don_tgt = (
                        (1.0 - tx_c) * ((1.0 - tz_c) * yg_ch[x0_c, z0_c] + tz_c * yg_ch[x0_c, z0_c + 1])
                        + tx_c * ((1.0 - tz_c) * yg_ch[x0_c + 1, z0_c] + tz_c * yg_ch[x0_c + 1, z0_c + 1])
                    )

                    # Wide C2 lateral taper (0.150..0.192m) gated smoothly by anterior normal so ZERO step or dent forms at |X|=0.160m!
                    x_pec_cap = 0.168 + 0.028 * smootherstep((pz_pc - 1.468) / 0.028)
                    w_pec_core = (
                        (1.0 - smootherstep((w_arm_u_ch - 0.54) / 0.24))
                        * smootherstep((ax_pc - 0.018) / 0.014)
                        * (1.0 - smootherstep((ax_pc - (x_pec_cap - 0.014)) / 0.036))
                        * smootherstep((pz_pc - 1.384) / 0.016)
                        * (1.0 - smootherstep((pz_pc - 1.598) / 0.018))
                        * smootherstep((-posed_u_c[:, 1] - 0.072) / 0.036)
                        * smoothstep((-nrm_posed_u[:, 1] - 0.18) / 0.30)
                    )
                    z_ax_ant_floor = 1.472 + 0.018 * smootherstep((ax_pc - 0.152) / 0.062)
                    w_ax_ant_fill = (
                        0.96
                        * smootherstep((ax_pc - 0.146) / 0.020)
                        * (1.0 - smootherstep((ax_pc - 0.244) / 0.022))
                        * smootherstep((pz_pc - z_ax_ant_floor) / 0.020)
                        * (1.0 - smootherstep((pz_pc - 1.595) / 0.024))
                        * smootherstep((-posed_u_c[:, 1] - 0.024) / 0.030)
                    )
                    w_chest_p = np.where(~lock_u, 1.0, 0.0) * np.maximum(w_pec_core, w_ax_ant_fill)
                    dy_chest = w_chest_p * (y_don_tgt - posed_u_c[:, 1])
                    ch_idx = np.flatnonzero(w_chest_p > 0.008)
                    if len(ch_idx):
                        dp_c_posed = np.zeros((len(ch_idx), 3), dtype=np.float64)
                        dp_c_posed[:, 1] = gain_c * dy_chest[ch_idx]
                        dp_c_posed[:, 2] = w_pec_core[ch_idx] * dp_pz_c[ch_idx]
                        jc = jac_u_c[ch_idx]
                        jtj_c = np.einsum("nji,njk->nik", jc, jc) + 0.035 * np.eye(3)[None, :, :]
                        jtr_c = np.einsum("nji,nj->ni", jc, dp_c_posed)
                        pu[ch_idx] += np.linalg.solve(jtj_c, jtr_c[:, :, None])[:, :, 0]

                    if pass_c == 0 and len(ch_idx):
                        wch_v = (0.52 * w_chest_p[ch_idx])[:, None]
                        nrm_c1 = vertex_normals(pu[weld], tri, weld)[first_u]
                        for _it_nrm in range(16):
                            if _it_nrm > 0 and (_it_nrm % 6) == 0:
                                nrm_c1 = vertex_normals(pu[weld], tri, weld)[first_u]
                            nbr_c1 = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                            dp_c1 = nbr_c1[ch_idx] - pu[ch_idx]
                            nv_c1 = nrm_c1[ch_idx]
                            dp_c1t = dp_c1 - np.einsum("ni,ni->n", dp_c1, nv_c1)[:, None] * nv_c1
                            pu[ch_idx] += wch_v * dp_c1t

                # Subtle, natural 3D lower-pole breast underside (`n_z < 0`, Request #6) via pure -2.5mm downward `-Z` drape
                # on the lower breast pole + +1.4mm inward `+Y` sit right in the sulcus (ZERO over-deepening slash or pointy beak!):
                posed_u_ov = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u_c, pu - ru)
                nrm_ov = vertex_normals((posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts)), tri, weld)[first_u]
                ax_ov = np.abs(posed_u_ov[:, 0])
                pz_ov = posed_u_ov[:, 2]
                z_sulc_ov = np.interp(np.clip(ax_ov, xg_ch[0], xg_ch[-1]), xg_ch, z_sulc_x)
                h_ov = pz_ov - z_sulc_ov
                w_x_ov = (
                    np.where(~lock_u, 1.0, 0.0)
                    * smootherstep((ax_ov - 0.038) / 0.022)
                    * (1.0 - smootherstep((ax_ov - 0.152) / 0.022))
                    * smoothstep((-nrm_ov[:, 1] - 0.34) / 0.24)
                    * (1.0 - smootherstep((w_arm_u_ch - 0.45) / 0.20))
                )
                outer_round_boost = 1.0 + 0.65 * smootherstep((ax_ov - 0.085) / 0.045)
                w_lower_pole = w_x_ov * np.exp(-(((h_ov - 0.0135) / 0.0115) ** 2)) * (1.0 - smootherstep((pz_ov - 1.508) / 0.020))
                w_inward_tuck = w_x_ov * np.exp(-(((h_ov + 0.0010) / 0.0065) ** 2))
                ov_idx = np.flatnonzero((w_lower_pole + w_inward_tuck) > 0.01)
                if len(ov_idx):
                    dp_ov = np.zeros((len(ov_idx), 3), dtype=np.float64)
                    dp_ov[:, 1] = -0.0016 * outer_round_boost[ov_idx] * w_lower_pole[ov_idx] + 0.0016 * w_inward_tuck[ov_idx]
                    dp_ov[:, 2] = -0.0028 * w_lower_pole[ov_idx] + 0.0014 * w_inward_tuck[ov_idx]
                    jc_o = jac_u_c[ov_idx]
                    jtj_o = np.einsum("nji,njk->nik", jc_o, jc_o) + 0.035 * np.eye(3)[None, :, :]
                    jtr_o = np.einsum("nji,nj->ni", jc_o, dp_ov)
                    pu[ov_idx] += np.linalg.solve(jtj_o, jtr_o[:, :, None])[:, :, 0]

                # 2D spatial (X, Z) Gaussian surface fairing on the upper breast dome (`h_sulc >= +18mm`) PLUS iso-contour (`dh_sulc ~ 0`)
                # smoothing ALONG the curved crescent (`h_sulc in [-16mm, +26mm]`, `sigma_h = 1.9mm`) so mixed-valence nipple-star and
                # outer-cup quads (`|X|=105..192mm`) form a silky-smooth U-cup curve in 3/4 Front WITHOUT losing low breast hang or underside!
                for _ in range(3):
                    posed_u_cup = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u_c, pu - ru)
                    ax_cup = np.abs(posed_u_cup[:, 0])
                    pz_cup = posed_u_cup[:, 2]
                    z_sulc_cup = np.interp(np.clip(ax_cup, xg_ch[0], xg_ch[-1]), xg_ch, z_sulc_x)
                    h_sulc_u = pz_cup - z_sulc_cup
                    w_cup_sp = (
                        np.where(~lock_u, 1.0, 0.0)
                        * smootherstep((ax_cup - 0.026) / 0.018)
                        * (1.0 - smootherstep((ax_cup - 0.188) / 0.022))
                        * smootherstep((h_sulc_u + 0.016) / 0.012)
                        * (1.0 - smootherstep((pz_cup - 1.578) / 0.020))
                        * smootherstep((-ry - 0.022) / 0.024)
                    )
                    oc_idx = np.flatnonzero(w_cup_sp > 0.01)
                    ctx_ch = np.flatnonzero(
                        (~lock_u) & (ax_cup >= 0.012) & (ax_cup <= 0.228) & (pz_cup >= 1.400) & (pz_cup <= 1.600) & (ry < -0.010)
                    )
                    if len(oc_idx) and len(ctx_ch) >= 12:
                        dx_ch = (ax_cup[oc_idx, None] - ax_cup[ctx_ch][None, :]) / 0.0105
                        dz_ch = (pz_cup[oc_idx, None] - pz_cup[ctx_ch][None, :]) / 0.0036
                        dh_ch = (h_sulc_u[oc_idx, None] - h_sulc_u[ctx_ch][None, :]) / 0.0019
                        in_sulc = 1.0 - smootherstep((h_sulc_u[oc_idx, None] - 0.018) / 0.014)
                        wk_ch = np.exp(-0.5 * (dx_ch * dx_ch + (1.0 - 0.94 * in_sulc) * (dz_ch * dz_ch) + (0.98 * in_sulc) * (dh_ch * dh_ch)))
                        y_ch_sp = (wk_ch @ posed_u_cup[ctx_ch, 1]) / np.maximum(np.sum(wk_ch, axis=1), 1e-12)
                        gain_iso = 0.28 + 0.16 * smootherstep((ax_cup[oc_idx] - 0.095) / 0.035)
                        dp_sp = np.zeros((len(oc_idx), 3), dtype=np.float64)
                        dp_sp[:, 1] = gain_iso * w_cup_sp[oc_idx] * (y_ch_sp - posed_u_cup[oc_idx, 1])
                        jc_s = jac_u_c[oc_idx]
                        jtj_s = np.einsum("nji,njk->nik", jc_s, jc_s) + 0.038 * np.eye(3)[None, :, :]
                        jtr_s = np.einsum("nji,nj->ni", jc_s, dp_sp)
                        pu[oc_idx] += np.linalg.solve(jtj_s, jtr_s[:, :, None])[:, :, 0]
                        woc_v = (0.52 * w_cup_sp[oc_idx])[:, None]
                        nrm_oc = vertex_normals(pu[weld], tri, weld)[first_u]
                        for _it_nrm in range(10):
                            if _it_nrm > 0 and (_it_nrm % 5) == 0:
                                nrm_oc = vertex_normals(pu[weld], tri, weld)[first_u]
                            nbr_oc = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                            dp_oc = nbr_oc[oc_idx] - pu[oc_idx]
                            nv_oc = nrm_oc[oc_idx]
                            dp_oct = dp_oc - np.einsum("ni,ni->n", dp_oc, nv_oc)[:, None] * nv_oc
                            pu[oc_idx] += woc_v * dp_oct

        # Explicit Rest-A-pose Anterior Axillary Bridge (|pu_x|=0.178..0.258m, pu_z=1.494..1.585m) BEFORE 3D feathering:
        # Fills any high vertical V-trench left at |pu_x|=0.215..0.240m when the arm opens from Donor (~28 deg) to Rest (~40 deg)
        # so the front & 3/4 armpit sits naturally low (~1.492m) instead of pinching upward into the shoulder!
        if not is_lod1 and fat_ax_scale > 0.02:
            z_rab_g = np.linspace(1.488, 1.588, 21)
            y_in_rab = np.full_like(z_rab_g, np.nan)
            y_out_rab = np.full_like(z_rab_g, np.nan)
            for zi_r, zv_r in enumerate(z_rab_g):
                m_in_r = (np.abs(pu[:, 2] - zv_r) < 0.008) & (np.abs(pu[:, 0]) >= 0.170) & (np.abs(pu[:, 0]) <= 0.188) & (pu[:, 1] < -0.10)
                m_out_r = (np.abs(pu[:, 2] - zv_r) < 0.008) & (np.abs(pu[:, 0]) >= 0.248) & (np.abs(pu[:, 0]) <= 0.268) & (pu[:, 1] < -0.06)
                if np.sum(m_in_r) >= 2:
                    y_in_rab[zi_r] = float(np.percentile(pu[m_in_r, 1], 18))
                if np.sum(m_out_r) >= 2:
                    y_out_rab[zi_r] = float(np.percentile(pu[m_out_r, 1], 18))
            fin_rab = np.isfinite(y_in_rab) & np.isfinite(y_out_rab)
            if np.sum(fin_rab) >= 5:
                y_in_rab = np.interp(z_rab_g, z_rab_g[fin_rab], y_in_rab[fin_rab])
                y_out_rab = np.interp(z_rab_g, z_rab_g[fin_rab], y_out_rab[fin_rab])
                for _ in range(8):
                    y_in_rab[1:-1] = 0.25 * y_in_rab[:-2] + 0.50 * y_in_rab[1:-1] + 0.25 * y_in_rab[2:]
                    y_out_rab[1:-1] = 0.25 * y_out_rab[:-2] + 0.50 * y_out_rab[1:-1] + 0.25 * y_out_rab[2:]
                yi_u_r = np.interp(np.clip(pu[:, 2], z_rab_g[0], z_rab_g[-1]), z_rab_g, y_in_rab)
                yo_u_r = np.interp(np.clip(pu[:, 2], z_rab_g[0], z_rab_g[-1]), z_rab_g, y_out_rab)
                tx_rab = np.clip((np.abs(pu[:, 0]) - 0.186) / (0.258 - 0.186), 0.0, 1.0)
                # Natural concave soft-tissue axillary hollow (+13mm tuck behind straight chord, preserving the rounded outer breast border
                # while eliminating the tiny Z~1500mm double-wrinkle in Profile!)
                y_chord_rab = (1.0 - tx_rab) * yi_u_r + tx_rab * yo_u_r + 0.0130 * np.sin(np.pi * tx_rab)
                w_rab = (
                    np.where(~lock_u, 1.0, 0.0)
                    * smootherstep((np.abs(pu[:, 0]) - 0.186) / 0.018)
                    * (1.0 - smootherstep((np.abs(pu[:, 0]) - 0.254) / 0.018))
                    * smootherstep((pu[:, 2] - 1.488) / 0.022)
                    * (1.0 - smootherstep((pu[:, 2] - 1.585) / 0.022))
                    * smootherstep((-ry - 0.012) / 0.026)
                    * min(fat_ax_scale, 1.0)
                )
                rab_m = (w_rab > 0.01) & (pu[:, 1] > y_chord_rab)
                if np.any(rab_m):
                    pu[rab_m, 1] = (1.0 - 0.88 * w_rab[rab_m]) * pu[rab_m, 1] + (0.88 * w_rab[rab_m]) * y_chord_rab[rab_m]

        # 3c) 3D harmonic arch relaxation across outer breast, anterior deltopectoral/axillary fold & lateral chest wall on BOTH LOD0 and LOD1:
        #     Unpinches & lowers the front/3-4/Profile armpit cleanly in 3D with ZERO horizontal crease stamped onto the side of the chest!
        if not is_lod1 and posed_base is not None and jac_body is not None:
            posed_u_end = posed_base[first_u] + np.einsum("vij,vj->vi", jac_body[first_u], pu - ru)
            ax_dpf = np.abs(posed_u_end[:, 0])
            pz_dpf = posed_u_end[:, 2]
        else:
            ax_dpf = np.abs(pu[:, 0])
            pz_dpf = pu[:, 2]
        # Keep w_dp_feather STRICTLY above Z=1.494m over the breast (|X|<0.184m) so it NEVER flattens or notches the Z=1442mm outer breast pole!
        z_dpf_floor = 1.494 - 0.036 * smootherstep((ax_dpf - 0.184) / 0.022)
        w_dp_feather = (
            np.where(~lock_u, 1.0, 0.0)
            * smootherstep((ax_dpf - 0.156) / 0.022)
            * (1.0 - smootherstep((ax_dpf - 0.258) / 0.024))
            * smootherstep((pz_dpf - z_dpf_floor) / 0.020)
            * (1.0 - smootherstep((pz_dpf - 1.622) / 0.024))
            * smootherstep((ry + 0.146) / 0.026)
            * (1.0 - smootherstep((ry - 0.046) / 0.026))
            * min(fat_ax_scale, 1.0)
        )
        dpf_idx = np.flatnonzero(w_dp_feather > 0.01)
        if len(dpf_idx):
            wdpf_v = w_dp_feather[dpf_idx, None]
            nrm_df = vertex_normals(pu[weld], tri, weld)[first_u]
            for _it_nrm in range(22 if not is_lod1 else 10):
                if _it_nrm > 0 and (_it_nrm % 6) == 0:
                    nrm_df = vertex_normals(pu[weld], tri, weld)[first_u]
                nbr_df2 = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_df2 = nbr_df2[dpf_idx] - pu[dpf_idx]
                nv_df = nrm_df[dpf_idx]
                dot_df = np.einsum("ni,ni->n", dp_df2, nv_df)[:, None]
                dp_dfn = dot_df * nv_df
                dp_dft = dp_df2 - dp_dfn
                # Zero convex shrinkage (0.02) so the filled forward deltopectoral volume (-145..-182mm) NEVER deflates back into a deep slit!
                pu[dpf_idx] += wdpf_v * (0.58 * dp_dft + np.where(dot_df > 0.0, 0.42, 0.02) * dp_dfn)
            for _ in range(12 if not is_lod1 else 6):
                nbr1_df = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                pu[dpf_idx] += (0.34 * wdpf_v) * (nbr1_df[dpf_idx] - pu[dpf_idx])
                nbr2_df = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                pu[dpf_idx] -= (0.358 * wdpf_v) * (nbr2_df[dpf_idx] - pu[dpf_idx])

        # Narrow seam-only displacement fairing (`|rx| = 0.145..0.198m` — NEVER reaching the |rx|>0.205m bicep/deltoid!)
        # so Rest 3/4 view has ZERO curved diagonal front-armpit crease while preserving 100% of upper-arm anterior fullness!
        w_rest_ant_ax = (
            np.where(~lock_u, 1.0, 0.0)
            * smootherstep((np.abs(rx) - 0.145) / 0.020)
            * (1.0 - smootherstep((np.abs(rx) - 0.248) / 0.026))
            * smootherstep((rz - 1.496) / 0.022)
            * (1.0 - smootherstep((rz - 1.608) / 0.026))
            * (1.0 - smootherstep((ry - 0.024) / 0.024))
            * min(fat_ax_scale, 1.0)
        )
        raa_idx = np.flatnonzero(w_rest_ant_ax > 0.01)
        if len(raa_idx):
            wraa = w_rest_ant_ax[raa_idx, None]
            nrm_ra0 = vertex_normals(pu[weld], tri, weld)[first_u][raa_idx]
            for _ in range(22 if not is_lod1 else 12):
                nbr_ra0 = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_ra = nbr_ra0[raa_idx] - pu[raa_idx]
                dot_ra = np.einsum("ni,ni->n", dp_ra, nrm_ra0)[:, None]
                dp_ran = dot_ra * nrm_ra0
                dp_rat = dp_ra - dp_ran
                pu[raa_idx] += wraa * (0.55 * dp_rat + np.where(dot_ra > 0.0, 0.48, 0.08) * dp_ran)
            for _ in range(12 if not is_lod1 else 6):
                nbr1_ra = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                pu[raa_idx] += (0.34 * wraa) * (nbr1_ra[raa_idx] - pu[raa_idx])
                nbr2_ra = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                pu[raa_idx] -= (0.356 * wraa) * (nbr2_ra[raa_idx] - pu[raa_idx])

        # Smooth the Rest-pose posterior rear-armpit upper-lat-to-tricep corner (|rx| = 0.148..0.288m, rz = 1.385..1.605m, ry > 0.008m)
        # using concave-relaxing surface fairing + zero-shrinkage Taubin so both Posed & Rest Back have a soft natural rear armpit fold!
        w_rest_rear_ax = (
            np.where(~lock_u, 1.0, 0.0)
            * smootherstep((np.abs(rx) - 0.148) / 0.024)
            * (1.0 - smootherstep((np.abs(rx) - 0.288) / 0.028))
            * smootherstep((rz - 1.385) / 0.024)
            * (1.0 - smootherstep((rz - 1.605) / 0.028))
            * smootherstep((ry - 0.008) / 0.024)
            * (1.0 - smootherstep((ry - 0.165) / 0.028))
            * min(fat_ax_scale, 1.0)
        )
        rra_idx = np.flatnonzero(w_rest_rear_ax > 0.01)
        if len(rra_idx):
            wrra = w_rest_rear_ax[rra_idx, None]
            is_rra_crease = (
                smootherstep((np.abs(rx[rra_idx]) - 0.172) / 0.020)
                * (1.0 - smootherstep((np.abs(rx[rra_idx]) - 0.258) / 0.024))
                * np.exp(-(((rz[rra_idx] - 1.505) / 0.032) ** 2))
            )[:, None]
            nrm_rr = vertex_normals(pu[weld], tri, weld)[first_u]
            for _it_nrm in range(46 if not is_lod1 else 20):
                if _it_nrm > 0 and (_it_nrm % 6) == 0:
                    nrm_rr = vertex_normals(pu[weld], tri, weld)[first_u]
                nbr_rr = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_rr = nbr_rr[rra_idx] - pu[rra_idx]
                nv_rr = nrm_rr[rra_idx]
                dot_rr = np.einsum("ni,ni->n", dp_rr, nv_rr)[:, None]
                dp_rrn = dot_rr * nv_rr
                dp_rrt = dp_rr - dp_rrn
                pu[rra_idx] += wrra * (0.60 * dp_rrt + np.where(dot_rr > 0.0, 0.58, 0.06 + 0.14 * is_rra_crease) * dp_rrn)
            for _ in range(18 if not is_lod1 else 12):
                nbr1_rr = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                pu[rra_idx] += (0.38 * wrra) * (nbr1_rr[rra_idx] - pu[rra_idx])
                nbr2_rr = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                pu[rra_idx] -= (0.402 * wrra) * (nbr2_rr[rra_idx] - pu[rra_idx])

        # FINAL Posed-space concave hinge-buckle relaxation (runs AFTER Rest-space `w_rest_ant_ax` & `w_rest_rear_ax` so it is NEVER undone!)
        # across BOTH the lateral-breast/anterior-axillary junction (`Row 2 Tile 4 Profile`) AND the rear-armpit crease (`Row 2 Tile 6 Back`)!
        if not is_lod1 and posed_base is not None and jac_body is not None:
            jac_u_pf = jac_body[first_u]
            posed_u_pf0 = posed_base[first_u] + np.einsum("vij,vj->vi", jac_u_pf, pu - ru)
            ax_pf0 = np.abs(posed_u_pf0[:, 0])
            z_ant_ph_floor = 1.472 - 0.044 * smootherstep((ax_pf0 - 0.172) / 0.018)
            w_ant_ph = (
                smootherstep((ax_pf0 - 0.160) / 0.018)
                * (1.0 - smootherstep((ax_pf0 - 0.244) / 0.022))
                * smootherstep((posed_u_pf0[:, 2] - z_ant_ph_floor) / 0.020)
                * (1.0 - smootherstep((posed_u_pf0[:, 2] - 1.602) / 0.026))
                * smootherstep((-posed_u_pf0[:, 1] - 0.014) / 0.028)
            )
            w_post_ph = (
                0.78
                * smootherstep((ax_pf0 - 0.156) / 0.020)
                * (1.0 - smootherstep((ax_pf0 - 0.245) / 0.024))
                * smootherstep((posed_u_pf0[:, 2] - 1.452) / 0.022)
                * (1.0 - smootherstep((posed_u_pf0[:, 2] - 1.578) / 0.024))
                * smootherstep((posed_u_pf0[:, 1] - 0.022) / 0.028)
            )
            w_posed_hinge = np.where(~lock_u, 1.0, 0.0) * np.maximum(w_ant_ph, w_post_ph) * min(fat_ax_scale, 1.0)
            ph_idx = np.flatnonzero(w_posed_hinge > 0.015)
            if len(ph_idx):
                wph = w_posed_hinge[ph_idx, None]
                jc_ph = jac_u_pf[ph_idx]
                jtj_ph = np.einsum("nji,njk->nik", jc_ph, jc_ph) + 0.035 * np.eye(3)[None, :, :]
                for _it_ph in range(44):
                    posed_v_cur = posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts)
                    posed_u_cur = posed_v_cur[first_u]
                    nrm_ph = vertex_normals(posed_v_cur, tri, weld)[first_u][ph_idx]
                    nbr_ph = np.column_stack([np.bincount(es, weights=posed_u_cur[ed, c], minlength=n_u) / deg_u for c in range(3)])
                    dp_ph = nbr_ph[ph_idx] - posed_u_cur[ph_idx]
                    dot_ph = np.einsum("ni,ni->n", dp_ph, nrm_ph)[:, None]
                    dp_phn = dot_ph * nrm_ph
                    dp_pht = dp_ph - dp_phn
                    step_ph = wph * (0.58 * dp_pht + np.where(dot_ph > 0.0, 0.68, 0.18) * dp_phn)
                    jtr_ph = np.einsum("nji,nj->ni", jc_ph, step_ph)
                    pu[ph_idx] += np.linalg.solve(jtj_ph, jtr_ph[:, :, None])[:, :, 0]

    si_base = self_intersections(ref_pts, tri, weld)
    base_ar = face_areas(ref_pts, tri)
    # Untangle any locally compressed pectoral-crease or axillary triangles via neighbor relaxation BEFORE fallback attenuation
    # so vertices NEVER snap individually back toward unpolished fit_pts (which creates outer-pec dimples)!
    for _ in range(10):
        chk_ax = pu[weld].copy()
        if alias_groups:
            for grp in alias_groups:
                chk_ax[grp] = chk_ax[grp].mean(axis=0)
        chk_ax[seam_mask] = fit_pts[seam_mask]
        bf_ax = bad_faces(chk_ax.astype(np.float32).astype(np.float64), tri, base_ar, conn)
        if not np.any(bf_ax):
            break
        bu_ax = np.unique(weld[tri[np.flatnonzero(bf_ax)].ravel()])
        bu_ax = bu_ax[~lock_u[bu_ax]]
        if not len(bu_ax):
            break
        nbr_ax = np.column_stack([np.bincount(es, weights=w_le * pu[ed, c], minlength=n_u) / deg_le for c in range(3)])
        pu[bu_ax] += 0.46 * (nbr_ax[bu_ax] - pu[bu_ax])

    delta_u = pu - pu_init
    delta_u[lock_u] = 0.0
    for _ in range(12):
        cur_pts = fit_pts + delta_u[weld]
        if alias_groups:
            for grp in alias_groups:
                cur_pts[grp] = cur_pts[grp].mean(axis=0)
        cur_pts[seam_mask] = fit_pts[seam_mask]
        cur_pts = cur_pts.astype(np.float32).astype(np.float64)
        si_new = self_intersections(cur_pts, tri, weld) - si_base
        bf_mask = bad_faces(cur_pts, tri, base_ar, conn)
        if not si_new and not np.any(bf_mask):
            return cur_pts
        fail_f = set(np.flatnonzero(bf_mask).tolist())
        for a, b in si_new:
            fail_f.add(a)
            fail_f.add(b)
        att = np.zeros(n_u, dtype=np.float64)
        att[np.unique(weld[tri[list(fail_f)].ravel()])] = 1.0
        for _ in range(4):
            att = np.maximum(att * 0.78, np.bincount(es, weights=att[ed], minlength=n_u) / deg_u)
        delta_u *= (1.0 - 0.36 * np.clip(att, 0.0, 1.0))[:, None]

    out_pts = fit_pts + delta_u[weld]
    if alias_groups:
        for grp in alias_groups:
            out_pts[grp] = out_pts[grp].mean(axis=0)
    out_pts[seam_mask] = fit_pts[seam_mask]
    return out_pts


def polish_muscular_relief_to_donor(
    ref_pts: np.ndarray,
    fit_pts: np.ndarray,
    tri: np.ndarray,
    seam_mask: np.ndarray,
    obs_gain: np.ndarray,
    cleft_inferred: np.ndarray,
    arm_weight: np.ndarray | None,
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    donor_eligible_faces: np.ndarray | None,
    posed_base: np.ndarray,
    jac_body: np.ndarray,
    finger_topo: dict | None = None,
    adipose_gate: float = 0.0,
    donor_bridged_axilla_faces: np.ndarray | None = None,
    donor_bridged_thigh_faces: np.ndarray | None = None,
    muscle_gate: float = 0.5,
) -> np.ndarray:
    """Lock crisp true-Donor muscular & bony/tendinous crests & valleys onto LOD0 in Rest space via mirror-symmetric
    damped Gauss-Newton rays + zero-blurring tangential spacing, parameterized by `(muscle_gate, adipose_gate)`.
    """
    _ = donor_eligible_faces
    lean_g = float(np.clip(1.0 - adipose_gate, 0.0, 1.0))
    slender_m = float(np.clip((0.50 - float(muscle_gate)) / 0.50, 0.0, 1.0))
    if lean_g <= 0.02:
        return fit_pts.copy()

    conn = weld_connectivity(ref_pts, tri, decimals=5)
    weld, (es, ed), mult, deg = conn
    n_u = len(mult)
    deg_u = np.maximum(deg.astype(np.float64), 1.0)
    first_u = np.zeros(n_u, dtype=np.int64)
    first_u[weld[::-1]] = np.arange(len(weld) - 1, -1, -1)

    ru = ref_pts[first_u]
    pu_init = np.column_stack([np.bincount(weld, weights=fit_pts[:, c], minlength=n_u) / mult for c in range(3)])
    pu = pu_init.copy()
    mid_u = np.abs(ru[:, 0]) < 2.5e-4
    lock_u = np.isin(np.arange(n_u), weld[seam_mask])
    obs_u = np.bincount(weld, weights=obs_gain, minlength=n_u) / mult
    cleft_u = np.bincount(weld, weights=cleft_inferred, minlength=n_u) / mult
    arm_u = (
        np.bincount(weld, weights=arm_weight, minlength=n_u) / mult
        if arm_weight is not None
        else np.where(np.abs(ru[:, 0]) > 0.21, 1.0, 0.0)
    )
    jac_u = jac_body[first_u]

    # Build 100% hole-free bare-skin Donor BVH excluding geometric underarm/thigh bridge webs + a 2-ring Donor cleft-lip margin
    # (NEVER excluding color-threshold `donor_eligible_faces` holes on pale lumbar/thoracolumbar skin!):
    dtc = donor_xyz[donor_tri].mean(axis=1)
    dcz = dtc[:, 2]
    excl_web = np.zeros(len(donor_tri), dtype=bool)
    if donor_bridged_axilla_faces is not None:
        excl_web |= donor_bridged_axilla_faces
    if donor_bridged_thigh_faces is not None:
        excl_web |= donor_bridged_thigh_faces
    if np.any(excl_web):
        for _ in range(2):
            bad_dv = np.unique(donor_tri[excl_web].ravel())
            excl_web |= np.any(np.isin(donor_tri, bad_dv), axis=1)
    keep_f = (~excl_web) & (dcz >= 0.055) & (dcz <= 1.725)
    if np.sum(keep_f) < 200:
        return fit_pts.copy()
    uv_d, inv_d = np.unique(donor_tri[keep_f].ravel(), return_inverse=True)
    don_pts_sub = donor_xyz[uv_d].astype(np.float64)
    don_tri_sub = inv_d.reshape(-1, 3).astype(np.int64)
    dbvh = BVHTree.FromPolygons(don_pts_sub.tolist(), don_tri_sub.tolist(), all_triangles=True)

    # Precompute 3D Donor intrinsic sulcus KDTree (`~9mm` scale) so LOD0 vertices slide tangentially into narrow Donor muscle grooves
    # (4 serratus slips, 3-head deltoids, brachialis/tricep horseshoe, forearm extensors, teres/infraspinatus/scapular spine, hamstrings & Achilles):
    d_conn_s = weld_connectivity(don_pts_sub, don_tri_sub, decimals=5)
    d_w_s, (d_es_s, d_ed_s), d_m_s, d_deg_s = d_conn_s
    n_du_s = len(d_m_s)
    d_deg_sf = np.maximum(d_deg_s.astype(np.float64), 1.0)
    du_pts_s = np.column_stack([np.bincount(d_w_s, weights=don_pts_sub[:, c], minlength=n_du_s) / d_m_s for c in range(3)])
    dn_raw_s = vertex_normals(don_pts_sub, don_tri_sub, d_w_s)
    dn_u_s = np.column_stack([np.bincount(d_w_s, weights=dn_raw_s[:, c], minlength=n_du_s) / d_m_s for c in range(3)])
    dn_u_s /= np.maximum(np.linalg.norm(dn_u_s, axis=1, keepdims=True), 1e-12)
    du_sm_s = du_pts_s.copy()
    for _ in range(11):
        du_sm_s = 0.45 * du_sm_s + 0.55 * np.column_stack(
            [np.bincount(d_es_s, weights=du_sm_s[d_ed_s, c], minlength=n_du_s) / d_deg_sf for c in range(3)]
        )
    don_sulc_u = np.clip(np.einsum("ni,ni->n", du_sm_s - du_pts_s, dn_u_s), 0.0, 0.025)
    sulc_du_idx = np.flatnonzero(don_sulc_u > 0.00042)
    dkd_sulc = KDTree(len(sulc_du_idx))
    for k_ds, di_s in enumerate(sulc_du_idx):
        dkd_sulc.insert(du_pts_s[di_s].tolist(), k_ds)
    dkd_sulc.balance()

    # Smooth topological exclusion on hands distal to wrist (`s >= -0.26`), feet (`rz <= 0.08m`), collar seam (`rz >= 1.665m`),
    # bare pelvis/360-deg waistband (`Z <= 1.158m`, already polished cleanly!), and occluded axillary/skinning hinge:
    hand_excl = np.zeros(n_u, dtype=np.float64)
    if finger_topo is not None:
        ft_weld = finger_topo["weld"]
        ft_ru = np.column_stack([np.bincount(ft_weld, weights=ref_pts[:, c], minlength=len(finger_topo["uPts"])) / np.maximum(np.bincount(ft_weld), 1.0) for c in range(3)])
        hand_v = np.zeros(len(ref_pts), dtype=np.float64)
        for sgn_h in (1, -1):
            u_pm = finger_topo["uPalmPerSide"][sgn_h]
            wr_p = finger_topo["wristPerSide"][sgn_h]
            lp_m = max(float(finger_topo["palmLenPerSide"][sgn_h]), 1e-6)
            s_ft = ((ft_ru - wr_p[None, :]) @ u_pm) / lp_m
            m_arm_v = (ref_pts[:, 0] * sgn_h > 0.30) & (ref_pts[:, 2] < 1.36)
            # Keep wrist station (`s ~ -0.10`) 100% Donor-fitted (`hand_excl` starts distal to `s = +0.02` on lean builds!)
            s_hand_start = -0.02 if adipose_gate <= 0.02 else -0.32
            hand_v = np.maximum(hand_v, np.where(m_arm_v, smootherstep((s_ft[ft_weld] - s_hand_start) / 0.16), 0.0))
        hand_excl = np.bincount(weld, weights=hand_v, minlength=n_u) / mult
    else:
        hand_excl = smootherstep((np.abs(ru[:, 0]) - 0.46) / 0.04) * (1.0 - smootherstep((ru[:, 2] - 1.30) / 0.06))

    # First untangle tangential cross-cleft jumps (`df = pu - ru`) STRICTLY inside the deep hidden armpit vault
    # (`ru_z = 1.425..1.532m, ru_y = -0.058..+0.058m`, where raw CG jumped armpit-ceiling vertices onto the deltoid),
    # NEVER pulling visible anterior deltopectoral (`ru_z >= 1.538m` or `ru_y < -0.058m`) or posterior teres-deltoid (`ru_y > +0.060m`) inward!
    hinge_ax = np.clip(4.0 * arm_u * (1.0 - arm_u), 0.0, 1.0)
    nrm_ru0 = vertex_normals(ru[weld], tri, weld)[first_u]
    sgn_rx0 = np.where(ru[:, 0] >= 0.0, 1.0, -1.0)
    elen_m = np.maximum(np.linalg.norm(ru[es] - ru[ed], axis=1), 0.0018)
    w_le_m = 1.0 / elen_m
    deg_le_m = np.maximum(np.bincount(es, weights=w_le_m, minlength=n_u), 1e-12)
    not_lat_cap = 1.0 - smootherstep((sgn_rx0 * nrm_ru0[:, 0] - 0.38) / 0.20)
    in_ax_arch = (
        smootherstep((np.abs(ru[:, 0]) - 0.148) / 0.016)
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.232) / 0.020))
        * smootherstep((ru[:, 2] - 1.425) / 0.020)
        * (1.0 - smootherstep((ru[:, 2] - 1.532) / 0.020))
        * smootherstep((ru[:, 1] + 0.058) / 0.022)
        * (1.0 - smootherstep((ru[:, 1] - 0.058) / 0.022))
        * not_lat_cap
    )
    w_hinge_df = (
        np.where(~lock_u, 1.0, 0.0)
        * lean_g
        * in_ax_arch
        * np.maximum(smootherstep((hinge_ax - 0.06) / 0.18), smootherstep((cleft_u - 0.015) / 0.060))
    )
    hdf_idx = np.flatnonzero(w_hinge_df > 0.015)
    if len(hdf_idx):
        whdf = w_hinge_df[hdf_idx, None]
        df_h = pu - ru
        for _ in range(36):
            nbr_dfh = np.column_stack([np.bincount(es, weights=w_le_m * df_h[ed, c], minlength=n_u) / deg_le_m for c in range(3)])
            df_h[hdf_idx] += (0.55 * whdf) * (nbr_dfh[hdf_idx] - df_h[hdf_idx])
            df_h[mid_u, 0] = 0.0
        pu = ru + df_h

    # Re-evaluate Posed positions & normals AFTER untangling deep armpit vault jumps:
    posed_v0 = posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts)
    posed_u0 = posed_v0[first_u]
    nrm_p0 = vertex_normals(posed_v0, tri, weld)[first_u]
    sgn_px0 = np.where(posed_u0[:, 0] >= 0.0, 1.0, -1.0)
    # Exclude ONLY the genuinely webbed deep underarm slot (`posed_z in [1.402, 1.504m], posed_y in [-0.052, +0.088m]`),
    # keeping 100% of visible anterior deltopectoral (`posed_y < -0.065m` or `nrm_y < -0.32`) & posterior teres/deltoid (`posed_y > +0.105m`) active!
    not_visible_front_or_back = (
        (1.0 - smootherstep((-nrm_p0[:, 1] - 0.34) / 0.18))
        * (1.0 - smootherstep((nrm_p0[:, 1] - 0.38) / 0.18))
        * (1.0 - smootherstep((-posed_u0[:, 1] - 0.065) / 0.025))
        * (1.0 - smootherstep((posed_u0[:, 1] - 0.105) / 0.025))
        * (1.0 - smootherstep((sgn_px0 * nrm_p0[:, 0] - 0.12) / 0.18))
        * (1.0 - smootherstep((posed_u0[:, 2] - 1.506) / 0.020))
    )
    deep_ax_slot = (
        not_visible_front_or_back
        * smootherstep((np.abs(posed_u0[:, 0]) - 0.146) / 0.018)
        * (1.0 - smootherstep((np.abs(posed_u0[:, 0]) - 0.220) / 0.020))
        * smootherstep((posed_u0[:, 2] - 1.406) / 0.018)
        * (1.0 - smootherstep((posed_u0[:, 2] - 1.502) / 0.020))
        * smootherstep((posed_u0[:, 1] + 0.044) / 0.022)
        * (1.0 - smootherstep((posed_u0[:, 1] - 0.086) / 0.024))
    )
    ax_crease_excl = np.clip(
        np.maximum(
            smootherstep((cleft_u - 0.035) / 0.075)
            * not_visible_front_or_back
            * smootherstep((posed_u0[:, 2] - 1.398) / 0.012),
            deep_ax_slot,
        ),
        0.0,
        1.0,
    )

    # Exclude ONLY the actual cloth-covered `linenBriefs` region + narrow Donor brief elastic lip (`never excluding bare lower abs or upper thighs!`):
    from linen_briefs import _eval_brief_level_set_bl

    phi_br_u = _eval_brief_level_set_bl(ru)
    brief_cov_excl = smootherstep((phi_br_u + 0.006) / 0.018)
    s_post_dwb = smootherstep((posed_u0[:, 1] + 0.015) / 0.065)
    z_don_lo = (1.0 - s_post_dwb) * (0.905 + 1.65 * np.clip(np.abs(posed_u0[:, 0]) - 0.042, 0.0, 0.12)) + s_post_dwb * (
        0.928 + 0.82 * np.clip(np.abs(posed_u0[:, 0]) - 0.045, 0.0, 0.13)
    )
    s_flank_dwb = smootherstep((np.abs(posed_u0[:, 0]) - 0.118) / 0.024) * smootherstep((posed_u0[:, 1] + 0.082) / 0.028)
    z_don_wb_base = (1.0 - s_post_dwb) * (
        1.096 + 0.068 * smootherstep((np.abs(posed_u0[:, 0]) - 0.012) / 0.145)
    ) + s_post_dwb * 1.236
    z_don_wb = np.maximum(z_don_wb_base, 1.254 * s_flank_dwb)
    # Exclude only the narrow Donor sculpted-brief front elastic lip (`Z ~ 1.154..1.186m`) so bare Apollo's belt & lower abs stay 0.00mm Donor-accurate:
    z_don_lip_f = 1.154 + 0.036 * smootherstep((np.abs(posed_u0[:, 0]) - 0.030) / 0.120)
    don_front_lip = (
        (1.0 - smootherstep((np.abs(posed_u0[:, 0]) - 0.142) / 0.020))
        * smootherstep((-posed_u0[:, 1] - 0.060) / 0.025)
        * np.exp(-0.5 * (((posed_u0[:, 2] - z_don_lip_f) / 0.010) ** 2))
    )
    don_wb_band = np.maximum(
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.186) / 0.022))
        * smootherstep((posed_u0[:, 2] - z_don_lo) / 0.018)
        * (1.0 - smootherstep((posed_u0[:, 2] - z_don_wb) / 0.022)),
        don_front_lip,
    )
    inseam_arch_excl = (
        (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.056) / 0.018))
        * smootherstep((ru[:, 2] - 0.873) / 0.016)
        * (1.0 - smootherstep((ru[:, 2] - 1.045) / 0.020))
        * smootherstep((ru[:, 1] + 0.128) / 0.022)
        * (1.0 - smootherstep((ru[:, 1] - 0.078) / 0.022))
    )
    med_thigh_cliff_excl = (
        smootherstep((-sgn_px0 * nrm_p0[:, 0] - 0.35) / 0.22)
        * (1.0 - smootherstep((np.abs(posed_u0[:, 0]) - 0.052) / 0.018))
        * smootherstep((posed_u0[:, 2] - 0.775) / 0.024)
        * (1.0 - smootherstep((posed_u0[:, 2] - 0.952) / 0.022))
    )
    pelvis_excl = np.maximum(np.maximum(brief_cov_excl, don_wb_band), np.maximum(inseam_arch_excl, med_thigh_cliff_excl))

    # Enable full Donor projection on all outward-facing anterior/posterior/lateral/superior anatomy (`dbvh` already excludes webbed cleft faces!):
    outward_open_skin = np.clip(
        np.maximum(
            np.maximum(smootherstep((-nrm_p0[:, 1] - 0.24) / 0.20), smootherstep((nrm_p0[:, 1] - 0.28) / 0.20)),
            np.maximum(smootherstep((sgn_px0 * nrm_p0[:, 0] - 0.20) / 0.20), smootherstep((posed_u0[:, 2] - 1.502) / 0.022)),
        ),
        0.0,
        1.0,
    )
    obs_eff = np.maximum(
        np.maximum(obs_u, outward_open_skin * (1.0 - deep_ax_slot)),
        (1.0 - smootherstep((posed_u0[:, 2] - 1.402) / 0.012)) * smootherstep((arm_u - 0.28) / 0.16),
    )
    w_musc_u = (
        np.where(~lock_u, 1.0, 0.0)
        * lean_g
        * smootherstep((obs_eff - 0.18) / 0.26)
        * (1.0 - ax_crease_excl)
        * smootherstep((ru[:, 2] - 0.072) / 0.026)
        * (1.0 - smootherstep((ru[:, 2] - 1.716) / 0.020))
        * (1.0 - hand_excl)
        * (1.0 - pelvis_excl)
    )
    act_u = np.flatnonzero(w_musc_u > 0.015)
    eye3 = np.eye(3, dtype=np.float64)
    adj_u_m: list[list[int]] = [[] for _ in range(n_u)]
    for a_e, b_e in zip(es, ed):
        adj_u_m[int(a_e)].append(int(b_e))
    limb_u_mask = (arm_u >= 0.32) & (hand_excl < 0.35)

    # Un-pinch ONLY the deep occluded axillary crease BEFORE final posed Donor muscular projection:
    w_pre_rear_ax = (
        np.where(~lock_u, 1.0, 0.0)
        * lean_g
        * smootherstep((np.abs(ru[:, 0]) - 0.152) / 0.018)
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.236) / 0.022))
        * smootherstep((ru[:, 2] - 1.438) / 0.020)
        * (1.0 - smootherstep((ru[:, 2] - 1.565) / 0.022))
        * smootherstep((ru[:, 1] - 0.018) / 0.020)
        * (1.0 - smootherstep((ru[:, 1] - 0.112) / 0.024))
    )
    w_pre_ant_ax = (
        np.where(~lock_u, 1.0, 0.0)
        * lean_g
        * smootherstep((np.abs(ru[:, 0]) - 0.156) / 0.016)
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.224) / 0.018))
        * smootherstep((ru[:, 2] - 1.468) / 0.020)
        * (1.0 - smootherstep((ru[:, 2] - 1.558) / 0.020))
        * (1.0 - smootherstep((ru[:, 1] + 0.005) / 0.020))
    )
    w_pre_ax = np.maximum(w_pre_rear_ax, 0.72 * w_pre_ant_ax)
    pre_ax_idx = np.flatnonzero(w_pre_ax > 0.015)
    if len(pre_ax_idx):
        wpra = w_pre_ax[pre_ax_idx, None]
        for _ in range(24):
            nrm_pa = vertex_normals(pu[weld], tri, weld)[first_u][pre_ax_idx]
            nbr_pa = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
            dp_pa = nbr_pa[pre_ax_idx] - pu[pre_ax_idx]
            dot_pa = np.einsum("ni,ni->n", dp_pa, nrm_pa)[:, None]
            pu[pre_ax_idx] += wpra * (0.55 * (dp_pa - dot_pa * nrm_pa) + np.where(dot_pa > 0.0, 0.72, 0.0) * (dot_pa * nrm_pa))
            pu[mid_u, 0] = 0.0

    # Coupled spatial-Laplacian regularized Jacobian unpose helper (`lam_hinge_u == 0` outside shoulder hinge -> ZERO sulcus blur!):
    jtj_all = np.einsum("nji,njk->nik", jac_u, jac_u)
    lam_hinge_u = (0.30 * (hinge_ax ** 2))[:, None]
    diag_mat_u = jtj_all + (0.016 + lam_hinge_u[:, 0])[:, None, None] * eye3[None, :, :]
    inv_diag_u = np.linalg.inv(diag_mat_u)
    hinge_act_u = np.flatnonzero((hinge_ax > 0.04) & (~lock_u))

    def _solve_smooth_unpose(dp_posed_field: np.ndarray) -> np.ndarray:
        rhs = np.einsum("nji,nj->ni", jac_u, dp_posed_field)
        du = np.einsum("nij,nj->ni", inv_diag_u, rhs)
        du[lock_u] = 0.0
        du[mid_u, 0] = 0.0
        if len(hinge_act_u):
            for _ in range(10):
                nbr_du = np.column_stack([np.bincount(es, weights=du[ed, c], minlength=n_u) / deg_u for c in range(3)])
                du[hinge_act_u] = np.einsum(
                    "nij,nj->ni", inv_diag_u[hinge_act_u], rhs[hinge_act_u] + lam_hinge_u[hinge_act_u] * nbr_du[hinge_act_u]
                )
                du[mid_u, 0] = 0.0
        return du

    # Faithful 6-pass 3D Donor Surface Projection + 3D Tangential Sulcus Alignment across ALL bare anatomy (`serratus, 3-head deltoids,
    # brachialis/tricep horseshoe, forearm extensors, scapula/teres, quads, hamstrings & calves/Achilles — 0.0mm artificial protrusion!`):
    for pass_m, gain_m in enumerate((0.90, 0.86, 0.84, 0.80, 0.76, 0.72)):
        if pass_m in (0, 2) and len(sulc_du_idx) > 50:
            posed_ts = (posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts))[first_u]
            nrm_ts = vertex_normals(posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts), tri, weld)[first_u]
            dp_tang_s = np.zeros((n_u, 3), dtype=np.float64)
            for ui_t in act_u:
                if mid_u[ui_t] or w_musc_u[ui_t] < 0.25:
                    continue
                p_qt = posed_ts[ui_t]
                n_qt = nrm_ts[ui_t]
                hits_ds = dkd_sulc.find_range(p_qt.tolist(), 0.0145)
                if hits_ds:
                    acc_ds = np.zeros(3, dtype=np.float64)
                    w_ds_tot = 0.0
                    max_sv = 0.0
                    for co_ds, ki_ds, dist_ds in hits_ds:
                        di_orig = int(sulc_du_idx[ki_ds])
                        if float(np.dot(dn_u_s[di_orig], n_qt)) < 0.56:
                            continue
                        if float(co_ds[0]) * float(ru[ui_t, 0]) < 1e-4:
                            continue
                        sv = float(don_sulc_u[di_orig])
                        max_sv = max(max_sv, sv)
                        wt_s = ((sv - 0.00030) ** 2.0) * np.exp(-0.5 * ((dist_ds / 0.0078) ** 2))
                        acc_ds += wt_s * np.asarray(co_ds, dtype=np.float64)
                        w_ds_tot += wt_s
                    if w_ds_tot > 1e-12 and max_sv > 0.00055:
                        sh_ds = acc_ds / w_ds_tot - p_qt
                        sh_ds -= float(np.dot(sh_ds, n_qt)) * n_qt
                        sh_len_ds = float(np.linalg.norm(sh_ds))
                        cap_ds = 0.0040 if pass_m == 0 else 0.0026
                        if sh_len_ds > cap_ds:
                            sh_ds *= cap_ds / sh_len_ds
                        dp_tang_s[ui_t] = (0.62 * w_musc_u[ui_t]) * sh_ds
            pu += _solve_smooth_unpose(dp_tang_s)
            pu[mid_u, 0] = 0.0

        posed_v = posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts)
        posed_u = posed_v[first_u]
        nrm_raw = vertex_normals(posed_v, tri, weld)[first_u]
        # 1-ring light normal stabilization ONLY so steep serratus, 3-head deltoid, brachialis & forearm extensor grooves stay crisp:
        nrm_sm = 0.68 * nrm_raw + 0.32 * np.column_stack([np.bincount(es, weights=nrm_raw[ed, c], minlength=n_u) / deg_u for c in range(3)])
        nrm_sm /= np.maximum(np.linalg.norm(nrm_sm, axis=1, keepdims=True), 1e-12)

        t_scalar_u = np.full(n_u, np.nan, dtype=np.float64)
        dp_posed_u = np.zeros((n_u, 3), dtype=np.float64)
        hit_w_u = np.zeros(n_u, dtype=np.float64)
        for ui in act_u:
            p0 = posed_u[ui]
            n0 = nrm_sm[ui]
            if mid_u[ui]:
                n0 = np.array([0.0, n0[1], n0[2]], dtype=np.float64)
                n0 /= max(float(np.linalg.norm(n0)), 1e-8)
            min_cos = 0.42 if limb_u_mask[ui] else 0.36
            vecs = []
            ts_list = []
            confs = []
            for s_m in ((1.0, -1.0) if abs(p0[0]) > 1e-3 else (1.0,)):
                pm = np.array([s_m * p0[0], p0[1], p0[2]])
                dm = np.array([s_m * n0[0], n0[1], n0[2]])
                # 46mm capture range above Z=1.44m so -35mm sunken anterior deltopectoral & posterior teres-deltoid tie-ins lock 1:1 to Donor;
                # cap inward-facing medial upper-arm rays below Z=1.42m to 13mm so rays hit the Donor's own medial arm wall without crossing the air cleft:
                is_med_arm_ray = limb_u_mask[ui] and (p0[2] < 1.422) and ((p0[0] * n0[0]) < -0.025)
                max_t = 0.013 if is_med_arm_ray else (0.046 if p0[2] >= 1.440 else 0.028)
                back_pad = 0.004 if is_med_arm_ray else 0.006
                hit, hn, _, _ = dbvh.ray_cast(Vector((pm - (max_t + back_pad) * dm).tolist()), Vector(dm.tolist()), 2.0 * (max_t + back_pad + 0.001))
                if hit is not None:
                    cos_a = float(hn.dot(Vector(dm.tolist())))
                    if cos_a > min_cos:
                        dv_h = np.asarray(hit, dtype=np.float64) - pm
                        t_s = float(dv_h @ dm)
                        if abs(t_s) <= max_t:
                            w_d = float(1.0 - smootherstep(np.array([(abs(t_s) - (max_t - 0.010)) / 0.010]))[0]) * float(
                                smoothstep(np.array([(cos_a - min_cos) / 0.22]))[0]
                            )
                            if w_d > 0.02:
                                vecs.append(np.array([s_m * dv_h[0], dv_h[1], dv_h[2]]))
                                ts_list.append(t_s)
                                confs.append(w_d)
            if vecs:
                cw = float(np.mean(confs))
                t_scalar_u[ui] = float(np.mean(ts_list))
                dp_posed_u[ui] = (gain_m * w_musc_u[ui] * cw) * np.mean(vecs, axis=0)
                hit_w_u[ui] = cw

        # Filter ONLY extreme isolated 1-vertex needle glitches (`> +3.8mm` above 1-ring median) on limbs,
        # preserving 100% of real forearm extensor ridges, brachioradialis crests & 3-head deltoid splits!
        for ui in act_u:
            if limb_u_mask[ui] and np.isfinite(t_scalar_u[ui]):
                ring1 = [t_scalar_u[nb] for nb in adj_u_m[ui] if np.isfinite(t_scalar_u[nb])]
                if len(ring1) >= 4:
                    t_med = float(np.median(ring1))
                    if t_scalar_u[ui] > t_med + 0.0038:
                        t_clean = t_med + 0.0038
                        dp_posed_u[ui] = (gain_m * w_musc_u[ui] * max(hit_w_u[ui], 0.60)) * (t_clean * nrm_sm[ui])

        # Partition-of-unity harmonic displacement inpainting across ALL `ax_crease_excl > 0.12`, `don_front_lip > 0.25`, and un-hit vertices
        # so zero shoulder/armpit or front-brief-lip vertex ever falls between Donor raycast and smooth boundary interpolation!
        inpaint_ax_m = (~lock_u) & (
            ((w_musc_u > 0.05) & (hit_w_u < 0.15)) | (ax_crease_excl > 0.12) | ((don_front_lip > 0.25) & (brief_cov_excl < 0.25))
        )
        for _ in range(32):
            nbr_dp = np.column_stack([np.bincount(es, weights=dp_posed_u[ed, c], minlength=n_u) / deg_u for c in range(3)])
            dp_posed_u[inpaint_ax_m] = nbr_dp[inpaint_ax_m]
        dp_posed_u[mid_u, 0] = 0.0

        pu += _solve_smooth_unpose(dp_posed_u)
        pu[mid_u, 0] = 0.0

        # Pure tangential triangle-quality relaxation ONLY (`0.0` normal smoothing so ZERO muscle detail is washed out!):
        if len(act_u):
            wm_t = (0.20 * w_musc_u[act_u])[:, None]
            for _ in range(2):
                nrm_t = vertex_normals(pu[weld], tri, weld)[first_u][act_u]
                nbr_t = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg_u for c in range(3)])
                dp_t_raw = nbr_t[act_u] - pu[act_u]
                dp_tan = dp_t_raw - np.einsum("ni,ni->n", dp_t_raw, nrm_t)[:, None] * nrm_t
                pu[act_u] += wm_t * dp_tan
                pu[mid_u, 0] = 0.0

    # Un-chasm Posed Shoulder/Axillary Crease Vertices (`where dbvh excluded donor_bridged_axilla_faces so hit_w_u < 0.22 left raw CG's
    # -30..-38mm anterior deltopectoral & posterior teres-deltoid clefts untouched`): bridge `posed_u` directly across the 0.0mm Donor walls!
    if lean_g > 0.20:
        posed_ax_v0 = posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts)
        posed_ax_u = posed_ax_v0[first_u].copy()
        posed_ax_orig = posed_ax_u.copy()
        in_sh_band = (
            (~lock_u)
            & (np.abs(ru[:, 0]) >= 0.142)
            & (np.abs(ru[:, 0]) <= 0.242)
            & (ru[:, 2] >= 1.412)
            & (ru[:, 2] <= 1.618)
        )
        w_ax_chasm = np.where(
            in_sh_band,
            lean_g * np.maximum(ax_crease_excl, 1.0 - smootherstep((hit_w_u - 0.08) / 0.32)),
            0.0,
        )
        axc_idx = np.flatnonzero(w_ax_chasm > 0.02)
        if len(axc_idx):
            waxc = w_ax_chasm[axc_idx, None]
            for _it_axc in range(36):
                nrm_axc = vertex_normals(posed_ax_u[weld], tri, weld)[first_u][axc_idx]
                nbr_axc = np.column_stack([np.bincount(es, weights=w_le_m * posed_ax_u[ed, c], minlength=n_u) / deg_le_m for c in range(3)])
                dp_axc = nbr_axc[axc_idx] - posed_ax_u[axc_idx]
                dot_axc = np.einsum("ni,ni->n", dp_axc, nrm_axc)[:, None]
                dp_axc_t = dp_axc - dot_axc * nrm_axc
                # Concave-dominant (`0.82` when dot > 0, `0.08` convex) posed-surface bridge lifts the -35mm chasm flush with Donor pec/scapula/deltoid:
                posed_ax_u[axc_idx] += waxc * (0.54 * dp_axc_t + np.where(dot_axc > 0.0, 0.82, 0.08) * (dot_axc * nrm_axc))
                posed_ax_u[mid_u, 0] = 0.0
            pu += _solve_smooth_unpose(posed_ax_u - posed_ax_orig)
            pu[mid_u, 0] = 0.0

    # Tangential LOD0 edge-loop alignment onto true Donor anterior chest/6-pack, posterior back, calf & quad sulci
    # (`1.00x exact Donor surface depth — ZERO synthetic high-pass inflation multipliers, ZERO waist shaving!`):
    if lean_g > 0.20:
        xg_pec = np.linspace(0.000, 0.184, 93)
        zg_pec = np.linspace(1.168, 1.652, 162)
        yg_pec = np.full((len(xg_pec), len(zg_pec)), np.nan, dtype=np.float64)
        for xi_p, xv_p in enumerate(xg_pec):
            for zi_p, zv_p in enumerate(zg_pec):
                ys_p = []
                for s_p in ((1.0, -1.0) if xv_p > 1e-4 else (1.0,)):
                    rh_p, rn_p, _, _ = dbvh.ray_cast(Vector((s_p * float(xv_p), -0.42, float(zv_p))), Vector((0.0, 1.0, 0.0)), 0.40)
                    if rh_p is not None and rh_p.y < -0.040 and rn_p.y < -0.15:
                        ys_p.append(float(rh_p.y))
                if ys_p:
                    yg_pec[xi_p, zi_p] = float(np.mean(ys_p))
            fp_x = np.isfinite(yg_pec[xi_p])
            if np.sum(fp_x) >= 8:
                yg_pec[xi_p] = np.interp(zg_pec, zg_pec[fp_x], yg_pec[xi_p, fp_x])
        for zi_p in range(len(zg_pec)):
            fp_z = np.isfinite(yg_pec[:, zi_p])
            if np.sum(fp_z) >= 8:
                yg_pec[:, zi_p] = np.interp(xg_pec, xg_pec[fp_z], yg_pec[fp_z, zi_p])
        if np.all(np.isfinite(yg_pec)):
            # Preserve 100% of Donor chest & nipple relief (`zero nip_spike de-spiking!`):
            yg_z_sm = yg_pec.copy()
            for _ in range(8):
                yg_z_sm[:, 1:-1] = 0.25 * yg_z_sm[:, :-2] + 0.50 * yg_z_sm[:, 1:-1] + 0.25 * yg_z_sm[:, 2:]
            sulc_xz = np.clip(yg_pec - yg_z_sm, 0.0, 0.015)

            for pass_pc, gain_pc in enumerate((0.90, 0.84)):
                posed_pc = (posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts))[first_u]
                nrm_pc = vertex_normals(posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts), tri, weld)[first_u]
                ax_pc = np.abs(posed_pc[:, 0])
                pz_pc = posed_pc[:, 2]
                dz_ab_snap = np.zeros(n_u, dtype=np.float64)
                if pass_pc == 0:
                    ab_cand = np.flatnonzero(
                        (~lock_u)
                        & (arm_u <= 0.12)
                        & (nrm_pc[:, 1] < -0.45)
                        & (
                            ((ax_pc >= 0.008) & (ax_pc <= 0.082) & (pz_pc >= 1.195) & (pz_pc <= 1.415))
                            | ((ax_pc >= 0.016) & (ax_pc <= 0.148) & (pz_pc >= 1.418) & (pz_pc <= 1.475))
                        )
                    )
                    for ui_a in ab_cand:
                        xi_c = int(np.clip(round((ax_pc[ui_a] - xg_pec[0]) / (xg_pec[1] - xg_pec[0])), 0, len(xg_pec) - 1))
                        zi_c = int(np.clip(round((pz_pc[ui_a] - zg_pec[0]) / (zg_pec[1] - zg_pec[0])), 4, len(zg_pec) - 5))
                        win = sulc_xz[xi_c, zi_c - 4 : zi_c + 5]
                        k_b = int(np.argmax(win))
                        if win[k_b] > 0.00050:
                            dz_ab_snap[ui_a] = 0.58 * float(zg_pec[zi_c - 4 + k_b] - pz_pc[ui_a])

                pz_query = pz_pc + dz_ab_snap
                xf_pc = np.clip((ax_pc - xg_pec[0]) / (xg_pec[1] - xg_pec[0]), 0.0, len(xg_pec) - 1.0001)
                zf_pc = np.clip((pz_query - zg_pec[0]) / (zg_pec[1] - zg_pec[0]), 0.0, len(zg_pec) - 1.0001)
                x0_pc, z0_pc = xf_pc.astype(np.int64), zf_pc.astype(np.int64)
                tx_pc, tz_pc = xf_pc - x0_pc, zf_pc - z0_pc
                y_pec_tgt = (
                    (1.0 - tx_pc) * ((1.0 - tz_pc) * yg_pec[x0_pc, z0_pc] + tz_pc * yg_pec[x0_pc, z0_pc + 1])
                    + tx_pc * ((1.0 - tz_pc) * yg_pec[x0_pc + 1, z0_pc] + tz_pc * yg_pec[x0_pc + 1, z0_pc + 1])
                )
                z_pec_flr = 1.174 + 0.028 * smootherstep((ax_pc - 0.085) / 0.045)
                w_pec_lock = (
                    np.where(~lock_u, 1.0, 0.0)
                    * lean_g
                    * (1.0 - smootherstep((arm_u - 0.16) / 0.12))
                    * (1.0 - smootherstep((ax_pc - 0.164) / 0.018))
                    * smootherstep((pz_pc - z_pec_flr) / 0.020)
                    * (1.0 - smootherstep((pz_pc - 1.638) / 0.018))
                    * smootherstep((-nrm_pc[:, 1] - 0.42) / 0.24)
                )
                dp_pc_full = np.zeros((n_u, 3), dtype=np.float64)
                dp_pc_full[:, 1] = gain_pc * w_pec_lock * (y_pec_tgt - posed_pc[:, 1])
                dp_pc_full[:, 2] = w_pec_lock * dz_ab_snap
                pu += _solve_smooth_unpose(dp_pc_full)
                pu[mid_u, 0] = 0.0

        # Posterior Back Tangential Sulcus Alignment + Exact 1.00x Donor Lock across the FULL trapezius, scapular spine,
        # infraspinatus & teres-major width (`|X| <= 0.214m`, `arm_u <= 0.44`):
        xg_bk = np.linspace(0.000, 0.228, 115)
        zg_bk = np.linspace(1.185, 1.712, 177)
        yg_bk = np.full((len(xg_bk), len(zg_bk)), np.nan, dtype=np.float64)
        for xi_b, xv_b in enumerate(xg_bk):
            for zi_b, zv_b in enumerate(zg_bk):
                ys_b = []
                for s_b in ((1.0, -1.0) if xv_b > 1e-4 else (1.0,)):
                    rh_b, rn_b, _, _ = dbvh.ray_cast(Vector((s_b * float(xv_b), 0.42, float(zv_b))), Vector((0.0, -1.0, 0.0)), 0.40)
                    if rh_b is not None and rh_b.y > 0.015 and rn_b.y > 0.15:
                        ys_b.append(float(rh_b.y))
                if ys_b:
                    yg_bk[xi_b, zi_b] = float(np.mean(ys_b))
            fb_x = np.isfinite(yg_bk[xi_b])
            if np.sum(fb_x) >= 8:
                yg_bk[xi_b] = np.interp(zg_bk, zg_bk[fb_x], yg_bk[xi_b, fb_x])
        for zi_b in range(len(zg_bk)):
            fb_z = np.isfinite(yg_bk[:, zi_b])
            if np.sum(fb_z) >= 8:
                yg_bk[:, zi_b] = np.interp(xg_bk, xg_bk[fb_z], yg_bk[fb_z, zi_b])
        if np.all(np.isfinite(yg_bk)):
            yg_bk_sm = yg_bk.copy()
            for _ in range(9):
                yg_bk_sm[1:-1, 1:-1] = 0.25 * (
                    yg_bk_sm[:-2, 1:-1] + yg_bk_sm[2:, 1:-1] + yg_bk_sm[1:-1, :-2] + yg_bk_sm[1:-1, 2:]
                )
            sulc_bk = np.clip(yg_bk_sm - yg_bk, 0.0, 0.018)
            for pass_bk, gain_bk in enumerate((0.92, 0.86)):
                posed_bk = (posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts))[first_u]
                nrm_bk = vertex_normals(posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts), tri, weld)[first_u]
                ax_bk = np.abs(posed_bk[:, 0])
                pz_bk = posed_bk[:, 2]
                dx_bk_snap = np.zeros(n_u, dtype=np.float64)
                dz_bk_snap = np.zeros(n_u, dtype=np.float64)
                x_bk_cap = (
                    0.128
                    + 0.056 * smootherstep((pz_bk - 1.250) / 0.165)
                    + 0.030 * smootherstep((pz_bk - 1.500) / 0.085)
                )
                if pass_bk == 0:
                    bk_cand = np.flatnonzero(
                        (~lock_u)
                        & (~mid_u)
                        & (arm_u <= 0.44)
                        & (ax_bk >= 0.008)
                        & (ax_bk <= x_bk_cap - 0.004)
                        & (pz_bk >= 1.278)
                        & (pz_bk <= 1.698)
                        & (nrm_bk[:, 1] > 0.36)
                    )
                    for ui_b in bk_cand:
                        xi_c = int(np.clip(round((ax_bk[ui_b] - xg_bk[0]) / (xg_bk[1] - xg_bk[0])), 4, len(xg_bk) - 5))
                        zi_c = int(np.clip(round((pz_bk[ui_b] - zg_bk[0]) / (zg_bk[1] - zg_bk[0])), 4, len(zg_bk) - 5))
                        win2 = sulc_bk[xi_c - 4 : xi_c + 5, zi_c - 4 : zi_c + 5]
                        kx, kz = divmod(int(np.argmax(win2)), 9)
                        if win2[kx, kz] > 0.00042:
                            dx_bk_snap[ui_b] = np.sign(posed_bk[ui_b, 0]) * 0.54 * float(xg_bk[xi_c - 4 + kx] - ax_bk[ui_b])
                            dz_bk_snap[ui_b] = 0.54 * float(zg_bk[zi_c - 4 + kz] - pz_bk[ui_b])
                ax_qb = np.clip(ax_bk + np.sign(posed_bk[:, 0]) * dx_bk_snap, xg_bk[0], xg_bk[-1])
                pz_qb = np.clip(pz_bk + dz_bk_snap, zg_bk[0], zg_bk[-1])
                xf_bk = np.clip((ax_qb - xg_bk[0]) / (xg_bk[1] - xg_bk[0]), 0.0, len(xg_bk) - 1.0001)
                zf_bk = np.clip((pz_qb - zg_bk[0]) / (zg_bk[1] - zg_bk[0]), 0.0, len(zg_bk) - 1.0001)
                x0_b, z0_b = xf_bk.astype(np.int64), zf_bk.astype(np.int64)
                tx_b, tz_b = xf_bk - x0_b, zf_bk - z0_b
                y_bk_tgt = (
                    (1.0 - tx_b) * ((1.0 - tz_b) * yg_bk[x0_b, z0_b] + tz_b * yg_bk[x0_b, z0_b + 1])
                    + tx_b * ((1.0 - tz_b) * yg_bk[x0_b + 1, z0_b] + tz_b * yg_bk[x0_b + 1, z0_b + 1])
                )
                z_bk_floor = 1.272 - 0.082 * slender_m
                w_bk_lock = (
                    np.where(~lock_u, 1.0, 0.0)
                    * lean_g
                    * (1.0 - smootherstep((arm_u - 0.36) / 0.16))
                    * (1.0 - smootherstep((ax_bk - x_bk_cap) / 0.020))
                    * smootherstep((pz_bk - z_bk_floor) / 0.028)
                    * (1.0 - smootherstep((pz_bk - 1.702) / 0.018))
                    * smootherstep((nrm_bk[:, 1] - 0.35) / 0.24)
                )
                dp_bk_full = np.zeros((n_u, 3), dtype=np.float64)
                dp_bk_full[:, 0] = w_bk_lock * dx_bk_snap
                dp_bk_full[:, 1] = gain_bk * w_bk_lock * (y_bk_tgt - posed_bk[:, 1])
                dp_bk_full[:, 2] = w_bk_lock * dz_bk_snap
                pu += _solve_smooth_unpose(dp_bk_full)
                pu[mid_u, 0] = 0.0

        # Posterior Gastrocnemius Diamond Calf + Narrow Achilles Cord (`Z = 0.095..0.505m`) Tangential Sulcus Alignment & 1.00x Donor Lock:
        xg_cf = np.linspace(0.032, 0.216, 93)
        zg_cf = np.linspace(0.095, 0.505, 138)
        yg_cf = np.full((len(xg_cf), len(zg_cf)), np.nan, dtype=np.float64)
        for xi_c, xv_c in enumerate(xg_cf):
            for zi_c, zv_c in enumerate(zg_cf):
                ys_c = []
                for s_c in (1.0, -1.0):
                    rh_c, rn_c, _, _ = dbvh.ray_cast(Vector((s_c * float(xv_c), 0.35, float(zv_c))), Vector((0.0, -1.0, 0.0)), 0.34)
                    if rh_c is not None and rh_c.y > 0.002 and rn_c.y > 0.16:
                        ys_c.append(float(rh_c.y))
                if ys_c:
                    yg_cf[xi_c, zi_c] = float(np.mean(ys_c))
            fc_x = np.isfinite(yg_cf[xi_c])
            if np.sum(fc_x) >= 6:
                yg_cf[xi_c] = np.interp(zg_cf, zg_cf[fc_x], yg_cf[xi_c, fc_x])
        for zi_c in range(len(zg_cf)):
            fc_z = np.isfinite(yg_cf[:, zi_c])
            if np.sum(fc_z) >= 6:
                yg_cf[:, zi_c] = np.interp(xg_cf, xg_cf[fc_z], yg_cf[fc_z, zi_c])
        if np.all(np.isfinite(yg_cf)):
            yg_cf_sm = yg_cf.copy()
            for _ in range(9):
                yg_cf_sm[1:-1, 1:-1] = 0.25 * (
                    yg_cf_sm[:-2, 1:-1] + yg_cf_sm[2:, 1:-1] + yg_cf_sm[1:-1, :-2] + yg_cf_sm[1:-1, 2:]
                )
            yg_cf_broad = yg_cf_sm.copy()
            for _ in range(28):
                yg_cf_broad[1:-1, 1:-1] = 0.25 * (
                    yg_cf_broad[:-2, 1:-1] + yg_cf_broad[2:, 1:-1] + yg_cf_broad[1:-1, :-2] + yg_cf_broad[1:-1, 2:]
                )
            # Attenuate high-pass boost right around `Z = 0.348m` (`calfMax` AP caliper plane) AND strictly above `Z >= 0.215m`
            # (`so ankle AP caliper plane at Z = 0.135m stays 0.00mm Donor-exact!`) while restoring full 40mm-scale gastrocnemius relief:
            cf_caliper_guard = (
                smootherstep((zg_cf - 0.215) / 0.035)
                * (1.0 - 0.72 * np.exp(-0.5 * (((zg_cf - 0.348) / 0.015) ** 2)))
            )[None, :]
            yg_cf_eff = yg_cf + (0.78 * slender_m) * cf_caliper_guard * np.clip(yg_cf - yg_cf_broad, -0.0056, 0.0056)
            sulc_cf = np.clip(yg_cf_sm - yg_cf, 0.0, 0.015)
            for pass_cf, gain_cf in enumerate((0.92, 0.84)):
                posed_cf = (posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts))[first_u]
                nrm_cf = vertex_normals(posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts), tri, weld)[first_u]
                ax_cf = np.abs(posed_cf[:, 0])
                pz_cf = posed_cf[:, 2]
                dx_cf_s = np.zeros(n_u, dtype=np.float64)
                dz_cf_s = np.zeros(n_u, dtype=np.float64)
                if pass_cf == 0:
                    cf_cand = np.flatnonzero(
                        (~lock_u) & (ax_cf >= 0.044) & (ax_cf <= 0.198) & (pz_cf >= 0.105) & (pz_cf <= 0.492) & (nrm_cf[:, 1] > 0.35)
                    )
                    for ui_c in cf_cand:
                        xi_c = int(np.clip(round((ax_cf[ui_c] - xg_cf[0]) / (xg_cf[1] - xg_cf[0])), 4, len(xg_cf) - 5))
                        zi_c = int(np.clip(round((pz_cf[ui_c] - zg_cf[0]) / (zg_cf[1] - zg_cf[0])), 4, len(zg_cf) - 5))
                        win_c = sulc_cf[xi_c - 4 : xi_c + 5, zi_c - 4 : zi_c + 5]
                        kx_c, kz_c = divmod(int(np.argmax(win_c)), 9)
                        if win_c[kx_c, kz_c] > 0.00038:
                            dx_cf_s[ui_c] = np.sign(posed_cf[ui_c, 0]) * 0.56 * float(xg_cf[xi_c - 4 + kx_c] - ax_cf[ui_c])
                            dz_cf_s[ui_c] = 0.56 * float(zg_cf[zi_c - 4 + kz_c] - pz_cf[ui_c])
                ax_qc = np.clip(ax_cf + np.sign(posed_cf[:, 0]) * dx_cf_s, xg_cf[0], xg_cf[-1])
                pz_qc = np.clip(pz_cf + dz_cf_s, zg_cf[0], zg_cf[-1])
                xf_cf = np.clip((ax_qc - xg_cf[0]) / (xg_cf[1] - xg_cf[0]), 0.0, len(xg_cf) - 1.0001)
                zf_cf = np.clip((pz_qc - zg_cf[0]) / (zg_cf[1] - zg_cf[0]), 0.0, len(zg_cf) - 1.0001)
                x0_c, z0_c = xf_cf.astype(np.int64), zf_cf.astype(np.int64)
                tx_c, tz_c = xf_cf - x0_c, zf_cf - z0_c
                y_cf_tgt = (
                    (1.0 - tx_c) * ((1.0 - tz_c) * yg_cf_eff[x0_c, z0_c] + tz_c * yg_cf_eff[x0_c, z0_c + 1])
                    + tx_c * ((1.0 - tz_c) * yg_cf_eff[x0_c + 1, z0_c] + tz_c * yg_cf_eff[x0_c + 1, z0_c + 1])
                )
                w_cf_lock = (
                    np.where(~lock_u, 1.0, 0.0)
                    * lean_g
                    * smootherstep((ax_cf - 0.044) / 0.016)
                    * (1.0 - smootherstep((ax_cf - 0.198) / 0.016))
                    * smootherstep((pz_cf - 0.100) / 0.018)
                    * (1.0 - smootherstep((pz_cf - 0.495) / 0.020))
                    * smootherstep((nrm_cf[:, 1] - (0.36 - 0.16 * slender_m)) / 0.24)
                )
                dp_cf_full = np.zeros((n_u, 3), dtype=np.float64)
                dp_cf_full[:, 0] = w_cf_lock * dx_cf_s
                dp_cf_full[:, 1] = gain_cf * w_cf_lock * (y_cf_tgt - posed_cf[:, 1])
                dp_cf_full[:, 2] = w_cf_lock * dz_cf_s
                pu += _solve_smooth_unpose(dp_cf_full)
                pu[mid_u, 0] = 0.0

        # Lift ONLY the narrow concave Donor-brief waistband constriction notch on the bare lateral hip (`|X| = 0.132..0.185m, Z_posed = 1.125..1.182m`,
        # concave-only `dot_lh > 0` so external oblique overhang & trochanter volume stay 100% intact with zero hip waistband step!):
        posed_lh_v0 = posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts)
        posed_lh_u = posed_lh_v0[first_u].copy()
        posed_lh_orig = posed_lh_u.copy()
        w_lat_hip_notch = (
            np.where(~lock_u, 1.0, 0.0)
            * lean_g
            * (1.0 - smootherstep((arm_u - 0.08) / 0.08))
            * smootherstep((np.abs(posed_lh_u[:, 0]) - 0.132) / 0.016)
            * (1.0 - smootherstep((np.abs(posed_lh_u[:, 0]) - 0.186) / 0.018))
            * smootherstep((posed_lh_u[:, 2] - 1.122) / 0.016)
            * (1.0 - smootherstep((posed_lh_u[:, 2] - 1.184) / 0.018))
        )
        lhn_idx = np.flatnonzero(w_lat_hip_notch > 0.02)
        if len(lhn_idx):
            wlhn = w_lat_hip_notch[lhn_idx, None]
            for _ in range(16):
                nrm_lhn = vertex_normals(posed_lh_u[weld], tri, weld)[first_u][lhn_idx]
                nbr_lhn = np.column_stack([np.bincount(es, weights=w_le_m * posed_lh_u[ed, c], minlength=n_u) / deg_le_m for c in range(3)])
                dp_lhn = nbr_lhn[lhn_idx] - posed_lh_u[lhn_idx]
                dot_lhn = np.einsum("ni,ni->n", dp_lhn, nrm_lhn)[:, None]
                posed_lh_u[lhn_idx] += wlhn * (0.42 * (dp_lhn - dot_lhn * nrm_lhn) + np.where(dot_lhn > 0.0, 0.72, 0.0) * (dot_lhn * nrm_lhn))
                posed_lh_u[mid_u, 0] = 0.0
            pu += _solve_smooth_unpose(posed_lh_u - posed_lh_orig)
            pu[mid_u, 0] = 0.0

        # Gently round ONLY sharp convex Donor-brief elastic cuff spikes (`dot_wbc < -0.0008` strictly along `z_don_lip_f`, max 6 passes)
        # so bare Apollo's belt, inguinal crease & sacral dimples stay 0.00mm porcelain-white on the signed-deviation heatmap!
        posed_wb_v0 = posed_base + np.einsum("vij,vj->vi", jac_body, pu[weld] - ref_pts)
        posed_wb_u = posed_wb_v0[first_u].copy()
        posed_wb_orig = posed_wb_u.copy()
        ax_wbu = np.abs(posed_wb_u[:, 0])
        pz_wbu = posed_wb_u[:, 2]
        z_lip_cur = 1.154 + 0.038 * smootherstep((ax_wbu - 0.030) / 0.120)
        w_wb_cuff = (
            np.where(~lock_u, 1.0, 0.0)
            * lean_g
            * (1.0 - smootherstep((arm_u - 0.08) / 0.08))
            * (1.0 - smootherstep((ax_wbu - 0.142) / 0.018))
            * np.exp(-0.5 * (((pz_wbu - z_lip_cur) / 0.011) ** 2))
            * smootherstep((-posed_wb_u[:, 1] - 0.068) / 0.024)
        )
        wbc_idx = np.flatnonzero(w_wb_cuff > 0.02)
        if len(wbc_idx):
            wwbc = w_wb_cuff[wbc_idx, None]
            for _ in range(8):
                nrm_wbc = vertex_normals(posed_wb_u[weld], tri, weld)[first_u][wbc_idx]
                nbr_wbc = np.column_stack([np.bincount(es, weights=w_le_m * posed_wb_u[ed, c], minlength=n_u) / deg_le_m for c in range(3)])
                dp_wbc = nbr_wbc[wbc_idx] - posed_wb_u[wbc_idx]
                dot_wbc = np.einsum("ni,ni->n", dp_wbc, nrm_wbc)[:, None]
                dp_wbc_t = dp_wbc - dot_wbc * nrm_wbc
                # Shave ONLY protruding elastic cuff spikes (`dot_wbc < 0`), NEVER filling concave inguinal/Apollo's-belt grooves!
                posed_wb_u[wbc_idx] += wwbc * (0.35 * dp_wbc_t + np.where(dot_wbc < 0.0, 0.42, 0.06) * (dot_wbc * nrm_wbc))
                posed_wb_u[mid_u, 0] = 0.0
            pu += _solve_smooth_unpose(posed_wb_u - posed_wb_orig)
            pu[mid_u, 0] = 0.0

        # C2 Cylindrical Meridian V-Taper Fairing (`theta = 48..140 deg, Z_rest = 1.125..1.545m`, matching `2D Concept c16`):
        # Eliminates the 120mm-wavelength Donor brief-waistband trench (`Z ~ 1.22m`), boxy anterolateral/lateral love-handle block
        # (`Z ~ 1.26..1.28m, including the Y = -53mm silhouette horizon!`), mid-rib pinch (`Z ~ 1.33m`), posterolateral lower-lat
        # step (`theta ~ 126 deg`), and 22-deg pressed-armpit concave bite (`Z ~ 1.46..1.50m`) while preserving 100% of anterior
        # 6-pack abs (`theta < 48 deg`), anterior serratus ribs (`Y < -0.064m, Z = 1.32..1.47m`), and central spinal erectors (`|X| < 0.105m`):
        th_deg_fl = np.degrees(np.arctan2(np.abs(pu[:, 0]), -pu[:, 1]))
        rad_u_fl = np.hypot(pu[:, 0], pu[:, 1])
        is_trunk_fl = (arm_u <= 0.44) & (np.abs(ru[:, 0]) <= 0.218)
        th_bins_fl = np.linspace(40.0, 156.0, 59)
        z_bins_fl = np.linspace(1.110, 1.565, 92)
        rg_fl = np.full((len(th_bins_fl), len(z_bins_fl)), np.nan, dtype=np.float64)
        for ti_f, tv_f in enumerate(th_bins_fl):
            for zi_f, zv_f in enumerate(z_bins_fl):
                m_f = is_trunk_fl & (np.abs(th_deg_fl - tv_f) < 3.6) & (np.abs(pu[:, 2] - zv_f) < 0.009)
                if np.sum(m_f) >= 2:
                    rg_fl[ti_f, zi_f] = float(np.percentile(rad_u_fl[m_f], 65))
            ok_f = np.isfinite(rg_fl[ti_f])
            if np.sum(ok_f) >= 8:
                rg_fl[ti_f] = np.interp(z_bins_fl, z_bins_fl[ok_f], rg_fl[ti_f, ok_f])
        for zi_f in range(len(z_bins_fl)):
            ok_zf = np.isfinite(rg_fl[:, zi_f])
            if np.sum(ok_zf) >= 6:
                rg_fl[:, zi_f] = np.interp(th_bins_fl, th_bins_fl[ok_zf], rg_fl[ok_zf, zi_f])

        w_fl_tot = np.zeros(n_u, dtype=np.float64)
        if np.all(np.isfinite(rg_fl)):
            rg_orig_fl = rg_fl.copy()
            w_z_free_fl = smootherstep((z_bins_fl - 1.122) / 0.032) * (1.0 - smootherstep((z_bins_fl - 1.535) / 0.028))
            rg_sm_fl = rg_fl.copy()
            for _ in range(105):
                z_nb_f = rg_sm_fl.copy()
                z_nb_f[:, 1:-1] = 0.25 * rg_sm_fl[:, :-2] + 0.50 * rg_sm_fl[:, 1:-1] + 0.25 * rg_sm_fl[:, 2:]
                rg_sm_fl = (1.0 - 0.86 * w_z_free_fl[None, :]) * rg_sm_fl + (0.86 * w_z_free_fl[None, :]) * z_nb_f
                t_nb_f = rg_sm_fl.copy()
                t_nb_f[1:-1, :] = 0.20 * rg_sm_fl[:-2, :] + 0.60 * rg_sm_fl[1:-1, :] + 0.20 * rg_sm_fl[2:, :]
                rg_sm_fl = 0.72 * rg_sm_fl + 0.28 * t_nb_f

            # Enforce strict monotonic downward hip flare below waist (`Z <= 1.315m`) & monotonic upward lat flare (`Z >= 1.325m`)
            # on the lateral silhouette meridians (`theta = 54..116 deg`) so zero double-bump love-handle wave can survive:
            i_z_waist = int(np.searchsorted(z_bins_fl, 1.318))
            for ti_f, tv_f in enumerate(th_bins_fl):
                if 54.0 <= tv_f <= 116.0:
                    w_mono_t = float(smootherstep(np.array([(tv_f - 54.0) / 10.0]))[0]) * float(
                        1.0 - smootherstep(np.array([(tv_f - 106.0) / 10.0]))[0]
                    )
                    low_seg = rg_sm_fl[ti_f, : i_z_waist + 1].copy()
                    # Monotonically non-decreasing going DOWN from waist (`i_z_waist`) to hip (`0`):
                    low_mono = np.maximum.accumulate(low_seg[::-1])[::-1]
                    up_seg = rg_sm_fl[ti_f, i_z_waist:].copy()
                    # Monotonically non-decreasing going UP from waist (`i_z_waist`) to axillary arch (`1.51m`):
                    i_ax_cap = int(np.searchsorted(z_bins_fl, 1.510)) - i_z_waist
                    up_mono = up_seg.copy()
                    if i_ax_cap > 2:
                        up_mono[:i_ax_cap] = np.maximum.accumulate(up_seg[:i_ax_cap])
                    rg_sm_fl[ti_f, : i_z_waist + 1] = (1.0 - 0.75 * w_mono_t) * low_seg + (0.75 * w_mono_t) * low_mono
                    rg_sm_fl[ti_f, i_z_waist:] = (1.0 - 0.75 * w_mono_t) * up_seg + (0.75 * w_mono_t) * up_mono
            for _ in range(14):
                rg_sm_fl[:, 1:-1] = (1.0 - 0.65 * w_z_free_fl[None, 1:-1]) * rg_sm_fl[:, 1:-1] + (
                    0.65 * w_z_free_fl[None, 1:-1]
                ) * (0.25 * rg_sm_fl[:, :-2] + 0.50 * rg_sm_fl[:, 1:-1] + 0.25 * rg_sm_fl[:, 2:])

            serr_prot_u = (
                (1.0 - smootherstep((pu[:, 1] + 0.058 - 0.022 * slender_m) / 0.022))
                * smootherstep((pu[:, 2] - 1.320) / 0.022)
                * (1.0 - smootherstep((pu[:, 2] - 1.472) / 0.022))
                * (1.0 - smootherstep((th_deg_fl - (65.0 + 26.0 * slender_m)) / 9.0))
            )
            lumbar_prot_u = 1.0 - smootherstep((np.abs(pu[:, 0]) - 0.106) / 0.020)
            # Keep full Z = 1.528m ceiling on the lateral silhouette/underarm (`theta <= 110 deg`), while tapering down to
            # Z = 1.395m on the posterior back (`theta >= 124 deg`) so teres major & infraspinatus (`Z = 1.41..1.56m`) stay 100% crisp!
            s_post_ceil = smootherstep((th_deg_fl - 108.0) / 16.0)
            z_ceil_fl = (1.0 - s_post_ceil) * 1.528 + s_post_ceil * 1.395
            w_fl_tot = (
                np.where(~lock_u, 1.0, 0.0)
                * lean_g
                * (1.0 - 0.52 * slender_m)
                * (1.0 - smootherstep((arm_u - 0.36) / 0.14))
                * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.204) / 0.020))
                * smootherstep((th_deg_fl - 48.0) / 11.0)
                * (1.0 - smootherstep((th_deg_fl - 138.0) / 13.0))
                * smootherstep((pu[:, 2] - 1.126) / 0.026)
                * (1.0 - smootherstep((pu[:, 2] - z_ceil_fl) / 0.026))
                * (1.0 - serr_prot_u)
                * (1.0 - np.where(pu[:, 1] > 0.015, lumbar_prot_u, 0.0))
            )
            tf_fl = np.clip((th_deg_fl - th_bins_fl[0]) / (th_bins_fl[1] - th_bins_fl[0]), 0.0, len(th_bins_fl) - 1.0001)
            zf_fl = np.clip((pu[:, 2] - z_bins_fl[0]) / (z_bins_fl[1] - z_bins_fl[0]), 0.0, len(z_bins_fl) - 1.0001)
            t0_fl, z0_fl = tf_fl.astype(np.int64), zf_fl.astype(np.int64)
            tt_fl, tz_fl = tf_fl - t0_fl, zf_fl - z0_fl
            dr_g_fl = rg_sm_fl - rg_orig_fl
            dr_u_fl = (
                (1.0 - tt_fl) * ((1.0 - tz_fl) * dr_g_fl[t0_fl, z0_fl] + tz_fl * dr_g_fl[t0_fl, z0_fl + 1])
                + tt_fl * ((1.0 - tz_fl) * dr_g_fl[t0_fl + 1, z0_fl] + tz_fl * dr_g_fl[t0_fl + 1, z0_fl + 1])
            )
            dr_app_fl = w_fl_tot * np.clip(dr_u_fl, -0.0085, 0.0120)
            ux_fl = pu[:, 0] / np.maximum(rad_u_fl, 1e-6)
            uy_fl = pu[:, 1] / np.maximum(rad_u_fl, 1e-6)
            pu[:, 0] += dr_app_fl * ux_fl
            pu[:, 1] += dr_app_fl * uy_fl
            pu[mid_u, 0] = 0.0

        # FINAL Rest-Space Upper-Lat Wall + Axillary Un-Gash (`Z_rest = 1.375..1.615m`, extending anteriorly to `Y >= -0.095m`
        # on outer pec/axilla `|ru_x| >= 0.155m` so ZERO front or rear underarm notch survives in half-raised Rest A-Pose, Idle, or Overhead Reach!):
        w_upper_lat_rest = (
            np.where(~lock_u, 1.0, 0.0)
            * lean_g
            * (1.0 - smootherstep((arm_u - 0.56) / 0.22))
            * smootherstep((np.abs(ru[:, 0]) - 0.145) / 0.020)
            * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.248) / 0.024))
            * smootherstep((ru[:, 2] - 1.380) / 0.026)
            * (1.0 - smootherstep((ru[:, 2] - 1.555) / 0.026))
            * smootherstep((ru[:, 1] + 0.095) / 0.030)
        )
        w_post_ax_ungash = np.maximum(
            np.where(~lock_u, 1.0, 0.0)
            * lean_g
            * smootherstep((hinge_ax - 0.04) / 0.16)
            * smootherstep((np.abs(ru[:, 0]) - 0.142) / 0.018)
            * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.256) / 0.022))
            * smootherstep((ru[:, 2] - 1.402) / 0.024)
            * (1.0 - smootherstep((ru[:, 2] - 1.615) / 0.024)),
            0.82 * w_upper_lat_rest,
        )
        pau_idx = np.flatnonzero(w_post_ax_ungash > 0.015)
        if len(pau_idx):
            wpau = w_post_ax_ungash[pau_idx, None]
            pu_pre_pau = pu[pau_idx].copy()
            is_low_lat_shelf = (
                (1.0 - smootherstep((ru[pau_idx, 2] - 1.460) / 0.024))
                * (1.0 - smootherstep((arm_u[pau_idx] - 0.35) / 0.18))
            )[:, None]
            for _ in range(46):
                nrm_pau = vertex_normals(pu[weld], tri, weld)[first_u][pau_idx]
                nbr_pau = np.column_stack([np.bincount(es, weights=w_le_m * pu[ed, c], minlength=n_u) / deg_le_m for c in range(3)])
                dp_r_pau = nbr_pau[pau_idx] - pu[pau_idx]
                dot_pau = np.einsum("ni,ni->n", dp_r_pau, nrm_pau)[:, None]
                conv_g_pau = (0.16 + 0.22 * is_low_lat_shelf) * (1.0 - 0.85 * slender_m)
                pu[pau_idx] += wpau * (0.60 * (dp_r_pau - dot_pau * nrm_pau) + np.where(dot_pau > 0.0, 0.84, conv_g_pau) * (dot_pau * nrm_pau))
            d_pau = pu[pau_idx] - pu_pre_pau
            d_pau_len = np.linalg.norm(d_pau, axis=1, keepdims=True)
            pu[pau_idx] = pu_pre_pau + d_pau * np.minimum(1.0, 0.0240 / np.maximum(d_pau_len, 1e-8))
            pu[mid_u, 0] = 0.0

        # Tangential hinge relaxation on posterior popliteal knee crease (`ru_z = 0.585..0.685m, ru_y > +0.020m`) & inner cubital elbow crease
        # so deep 90–100 deg Run/Squat/Guard joint flexion folds smoothly without pinched triangle slivers:
        w_joint_hinge_t = (
            np.where(~lock_u, 1.0, 0.0)
            * lean_g
            * np.maximum(
                smootherstep((np.abs(ru[:, 0]) - 0.048) / 0.018)
                * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.185) / 0.020))
                * smootherstep((ru[:, 2] - 0.585) / 0.020)
                * (1.0 - smootherstep((ru[:, 2] - 0.685) / 0.020))
                * smootherstep((ru[:, 1] - 0.020) / 0.020),
                smootherstep((np.abs(ru[:, 0]) - 0.335) / 0.022)
                * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.405) / 0.022))
                * smootherstep((ru[:, 2] - 1.365) / 0.024)
                * (1.0 - smootherstep((ru[:, 2] - 1.455) / 0.024)),
            )
        )
        jh_idx = np.flatnonzero(w_joint_hinge_t > 0.02)
        if len(jh_idx):
            wjh = w_joint_hinge_t[jh_idx, None]
            for _ in range(14):
                nrm_jh = vertex_normals(pu[weld], tri, weld)[first_u][jh_idx]
                nbr_jh = np.column_stack([np.bincount(es, weights=w_le_m * pu[ed, c], minlength=n_u) / deg_le_m for c in range(3)])
                dp_jh = nbr_jh[jh_idx] - pu[jh_idx]
                dot_jh = np.einsum("ni,ni->n", dp_jh, nrm_jh)[:, None]
                pu[jh_idx] += wjh * (0.52 * (dp_jh - dot_jh * nrm_jh) + np.where(dot_jh > 0.0, 0.36, 0.0) * (dot_jh * nrm_jh))
            pu[mid_u, 0] = 0.0

    w_lean_ax = np.maximum(
        np.maximum(w_pre_ax, w_hinge_df),
        np.maximum(w_post_ax_ungash, w_fl_tot) if lean_g > 0.20 else 0.0,
    )
    w_limb_fair = np.where(limb_u_mask, lean_g, 0.0)

    # Strict +/-X mirror symmetrization across canonical symmetric LOD0 pairs on all polished muscular zones:
    kd_m = KDTree(n_u)
    for ui_k, pr_k in enumerate(ru):
        kd_m.insert(pr_k.tolist(), ui_k)
    kd_m.balance()
    pu_sym = pu.copy()
    for ui in np.flatnonzero(np.maximum(np.maximum(w_musc_u, w_lean_ax), w_limb_fair) > 0.01):
        if mid_u[ui]:
            pu_sym[ui, 0] = 0.0
            continue
        _, mir_i, mir_d = kd_m.find((-ru[ui, 0], ru[ui, 1], ru[ui, 2]))
        if mir_i is not None and mir_d < 3.5e-4:
            pu_sym[ui, 0] = 0.5 * (pu[ui, 0] - pu[mir_i, 0])
            pu_sym[ui, 1] = 0.5 * (pu[ui, 1] + pu[mir_i, 1])
            pu_sym[ui, 2] = 0.5 * (pu[ui, 2] + pu[mir_i, 2])
    pu = pu_sym
    # 1D Rest-space clearance floor (`>= 15.8mm > 14.5mm` shorts fabric offset) on the bottom-inner shorts hem
    # (`canon Z = 0.832..0.868m`, strictly below `thighMid` at `canon Z ~ 0.871m` -> 0 overlaps AND <1.8% thighMid error!):
    w_sh_hem_flr = (
        np.where(~mid_u & ~lock_u, 1.0, 0.0)
        * lean_g
        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.035) / 0.012))
        * smootherstep((ru[:, 2] - 0.834) / 0.012)
        * (1.0 - smootherstep((ru[:, 2] - 0.857) / 0.007))
        * (1.0 - smootherstep((np.abs(ru[:, 1]) - 0.014) / 0.010))
    )
    shf_m = w_sh_hem_flr > 0.01
    if np.any(shf_m):
        sgn_shf = np.sign(ru[shf_m, 0])
        cur_ax = np.abs(pu[shf_m, 0])
        tgt_ax = np.maximum(cur_ax, 0.0050)
        pu[shf_m, 0] = sgn_shf * ((1.0 - w_sh_hem_flr[shf_m]) * cur_ax + w_sh_hem_flr[shf_m] * tgt_ax)
    pu[mid_u, 0] = 0.0

    si_base = self_intersections(ref_pts, tri, weld)
    base_ar = face_areas(ref_pts, tri)
    delta_u = pu - pu_init
    delta_u[lock_u] = 0.0
    for _ in range(12):
        cur_pts = (fit_pts + delta_u[weld]).astype(np.float32).astype(np.float64)
        cur_pts[seam_mask] = fit_pts[seam_mask]
        si_new = self_intersections(cur_pts, tri, weld) - si_base
        bf_mask = bad_faces(cur_pts, tri, base_ar, conn)
        if not si_new and not np.any(bf_mask):
            return cur_pts
        ff = set(np.flatnonzero(bf_mask).tolist())
        for a, b in si_new:
            ff.add(a)
            ff.add(b)
        att = np.zeros(n_u, dtype=np.float64)
        att[np.unique(weld[tri[list(ff)].ravel()])] = 1.0
        for _ in range(3):
            att = np.maximum(att * 0.76, np.bincount(es, weights=att[ed], minlength=n_u) / deg_u)
        delta_u *= (1.0 - 0.38 * np.clip(att, 0.0, 1.0))[:, None]
    out_pts = fit_pts + delta_u[weld]
    out_pts[seam_mask] = fit_pts[seam_mask]
    return out_pts


def project_lod1_creases_onto_lod0(
    rest_base_low: np.ndarray,
    low_fit_init: np.ndarray,
    low_tri: np.ndarray,
    high_fit: np.ndarray,
    high_tri: np.ndarray,
    seam_body: np.ndarray,
    interface: dict,
    adipose_gate: float = 1.0,
    muscle_gate: float = 0.5,
) -> np.ndarray:
    """Snap runtime LOD1 vertices into high_fit anatomical sulci, folds, or bony/tendinous crests and project onto high_fit BVH."""
    slender_m = float(np.clip((0.50 - float(muscle_gate)) / 0.50, 0.0, 1.0))
    low_conn = weld_connectivity(rest_base_low, low_tri, decimals=5)
    low_weld, (l_es, l_ed), l_mult, _ = low_conn
    n_lu = len(l_mult)
    first_lu = np.zeros(n_lu, dtype=np.int64)
    first_lu[low_weld[::-1]] = np.arange(len(low_weld) - 1, -1, -1)

    high_conn = weld_connectivity(high_fit, high_tri, decimals=5)
    high_weld, (h_es, h_ed), h_mult, h_deg = high_conn
    n_hu = len(h_mult)
    first_hu = np.zeros(n_hu, dtype=np.int64)
    first_hu[high_weld[::-1]] = np.arange(len(high_weld) - 1, -1, -1)
    hu_pts = high_fit[first_hu]
    hu_nrm = vertex_normals(high_fit, high_tri, high_weld)[first_hu]
    h_deg_f = np.maximum(h_deg.astype(np.float64), 1.0)
    hu_sm = hu_pts.copy()
    for _ in range(18):
        hu_sm = np.column_stack([np.bincount(h_es, weights=hu_sm[h_ed, c], minlength=n_hu) / h_deg_f for c in range(3)])
    curv_hu = np.einsum("ni,ni->n", hu_sm - hu_pts, hu_nrm)
    valley_hu = np.clip(curv_hu, 0.0, 0.032)
    ridge_hu = np.clip(-curv_hu, 0.0, 0.032)

    hbvh = BVHTree.FromPolygons(high_fit.tolist(), high_tri.tolist(), all_triangles=True)
    hkd = KDTree(n_hu)
    for i_k, p_k in enumerate(hu_pts):
        hkd.insert(p_k.tolist(), i_k)
    hkd.balance()

    rl_u = rest_base_low[first_lu]
    lu_init = np.column_stack([np.bincount(low_weld, weights=low_fit_init[:, c], minlength=n_lu) / l_mult for c in range(3)])
    lu = lu_init.copy()
    mid_lu = np.abs(rl_u[:, 0]) < 2.5e-4
    seam_lu = np.isin(np.arange(n_lu), low_weld[seam_body])

    w_spine_excl = np.where(rl_u[:, 1] > 0.0, smootherstep((np.abs(rl_u[:, 0]) - 0.044) / 0.018), 1.0)
    # Strictly exclude pelvis, groin, hips, glutes and natal cleft (already polished on LOD1 by polish_pelvis_affine_diffeo)
    # so zero groin/crotch vertices ever get snapped into adjacent creases.
    z_gate_l = np.where(
        rl_u[:, 1] > 0.0,
        smootherstep((rl_u[:, 2] - 1.245) / 0.028) * smootherstep((lu_init[:, 2] - 1.225) / 0.024),
        smootherstep((lu_init[:, 2] - 1.036) / 0.018) * smootherstep((rl_u[:, 2] - 1.058) / 0.024),
    )
    # Protect BOTH the smoothed posterolateral 3/4 silhouette horizon AND the smoothed anterior front-armpit arch (|lu_init_x| >= 0.162m, Z >= 1.490m)
    # so runtime LOD1 never re-snaps upper-flank or Rest front-armpit vertices into a shadow crease (scaling outer back horizon proportionally on
    # wide `M000-F100` / `M100-F100` corners while keeping Stage A `M050-F100` at its exact `0.160 m` cutoff!):
    is_ext_full_l1 = (adipose_gate >= 0.95) and (abs(float(muscle_gate) - 0.50) > 0.10)
    if is_ext_full_l1:
        bk_band_m = (rl_u[:, 1] > 0.025) & (lu_init[:, 2] >= 1.28) & (lu_init[:, 2] <= 1.48)
        x_bk_ext = float(np.percentile(np.abs(lu_init[bk_band_m, 0]), 96)) if np.sum(bk_band_m) >= 12 else 0.225
        x_uf_cut = max(0.160, x_bk_ext - 0.034)
        x_cr_outer_cut = max(0.206, x_bk_ext - 0.016)
    else:
        x_uf_cut = 0.160
        x_cr_outer_cut = 0.206
    w_upper_flank_excl = (
        smootherstep((np.abs(lu_init[:, 0]) - x_uf_cut) / 0.020)
        * smootherstep((lu_init[:, 2] - 1.345) / 0.024)
        * smootherstep((rl_u[:, 1] + 0.045) / 0.030)
    )
    w_ant_armpit_excl = (
        smootherstep((np.abs(lu_init[:, 0]) - 0.172) / 0.018)
        * smootherstep((lu_init[:, 2] - 1.494) / 0.020)
        * (1.0 - smootherstep((rl_u[:, 1] + 0.010) / 0.030))
    )
    w_cr_l = (
        float(np.clip(adipose_gate, 0.0, 1.0))
        * np.where(~seam_lu, 1.0, 0.0)
        * w_spine_excl
        * z_gate_l
        * (1.0 - w_upper_flank_excl)
        * (1.0 - w_ant_armpit_excl)
        * (1.0 - smootherstep((rl_u[:, 2] - 1.555) / 0.028))
        * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - x_cr_outer_cut) / 0.022))
    )

    dz_prof_ext = np.linspace(-0.028, 0.028, 29)  # 2 mm vertical spacing; +/-14 mm chord = +/-7 step offset
    front_snap_amp = np.zeros(n_lu, dtype=np.float64)
    front_snap_mode = np.zeros(n_lu, dtype=np.int64)

    for ui in np.flatnonzero(w_cr_l > (0.01 if adipose_gate >= 0.999 else 0.02)):
        p0 = lu[ui].copy()
        wc = float(w_cr_l[ui])
        is_back_u = bool(rl_u[ui, 1] > 0.025)
        snap_mode = 0  # +1 = valley tuck, -1 = overhanging fold-lip crest
        snap_amp = 0.0

        # Posterior oblique back folds (upper Z ~ 1.40m & lower Z ~ 1.31m) AND anterior low-hanging pectoral fold (Z ~ 1.438..1.50m):
        used_back_ray = False
        if is_ext_full_l1:
            max_back_ray_x = (x_uf_cut - 0.010) if p0[2] > 1.448 else (x_uf_cut + 0.008 if p0[2] > 1.350 else x_cr_outer_cut)
        else:
            max_back_ray_x = 0.138 if p0[2] > 1.448 else (0.162 if p0[2] > 1.350 else 0.198)
        is_pec_ray_u = bool((rl_u[ui, 1] < -0.056) and (1.406 <= p0[2] <= 1.508) and (0.028 <= abs(p0[0]) <= 0.150))
        if is_back_u and (1.245 <= p0[2] <= 1.485) and (0.046 <= abs(p0[0]) <= max_back_ray_x):
            px_r, pz_r = float(p0[0]), float(p0[2])
            y_prof = np.full(len(dz_prof_ext), np.nan, dtype=np.float64)
            for ki, dzk in enumerate(dz_prof_ext):
                rh_loc, _, _, _ = hbvh.ray_cast(Vector((px_r, 0.38, pz_r + float(dzk))), Vector((0.0, -1.0, 0.0)), 0.36)
                if rh_loc is not None and rh_loc.y > 0.01:
                    y_prof[ki] = float(rh_loc.y)
            if np.all(np.isfinite(y_prof)):
                d_val_k = 0.5 * (y_prof[0:15] + y_prof[14:29]) - y_prof[7:22]  # >0 = inward valley, <0 = outward crest
                dz_win = dz_prof_ext[7:22]
                prox_v = np.exp(-0.5 * ((dz_win / 0.0092) ** 2)) * (np.abs(dz_win) <= 0.0125)
                prox_r = np.exp(-0.5 * ((dz_win / 0.0085) ** 2)) * (np.abs(dz_win) <= 0.0105)
                sc_v = d_val_k * prox_v
                sc_r = (-d_val_k) * prox_r
                kv_best = int(np.argmax(sc_v))
                kr_best = int(np.argmax(sc_r))
                best_v_depth = float(d_val_k[kv_best]) if sc_v[kv_best] > 0.0 else 0.0
                best_r_height = float(-d_val_k[kr_best]) if sc_r[kr_best] > 0.0 else 0.0
                used_back_ray = True
                if best_v_depth > 0.00018 and sc_v[kv_best] >= 0.88 * sc_r[kr_best]:
                    dz_tgt = float(dz_win[kv_best])
                    g_b = float(smoothstep(np.array([(best_v_depth - 0.00014) / 0.00075]))[0])
                    p0[2] = pz_r + (0.88 * wc * g_b) * dz_tgt
                    rh_t, rn_t, _, _ = hbvh.ray_cast(Vector((px_r, 0.38, float(p0[2]))), Vector((0.0, -1.0, 0.0)), 0.36)
                    if rh_t is not None:
                        p0[1] = float(rh_t.y)
                    snap_mode = 1
                    snap_amp = best_v_depth
                elif best_r_height > 0.00020:
                    dz_tgt = float(dz_win[kr_best])
                    g_b = float(smoothstep(np.array([(best_r_height - 0.00016) / 0.00080]))[0])
                    p0[2] = pz_r + (0.84 * wc * g_b) * dz_tgt
                    rh_t, rn_t, _, _ = hbvh.ray_cast(Vector((px_r, 0.38, float(p0[2]))), Vector((0.0, -1.0, 0.0)), 0.36)
                    if rh_t is not None:
                        p0[1] = float(rh_t.y)
                    snap_mode = -1
                    snap_amp = best_r_height
        elif is_pec_ray_u:
            px_r, pz_r = float(p0[0]), float(p0[2])
            f_prof = np.full(len(dz_prof_ext), np.nan, dtype=np.float64)
            for ki, dzk in enumerate(dz_prof_ext):
                rh_loc, _, _, _ = hbvh.ray_cast(Vector((px_r, -0.38, pz_r + float(dzk))), Vector((0.0, 1.0, 0.0)), 0.36)
                if rh_loc is not None and rh_loc.y < -0.02:
                    f_prof[ki] = -float(rh_loc.y)
            if np.all(np.isfinite(f_prof)):
                d_val_f = 0.5 * (f_prof[0:15] + f_prof[14:29]) - f_prof[7:22]  # >0 = inward inframammary sulcus, <0 = overhanging breast rim
                dz_win = dz_prof_ext[7:22]
                prox_v = np.exp(-0.5 * ((dz_win / 0.0094) ** 2)) * (np.abs(dz_win) <= 0.0125)
                prox_r = np.exp(-0.5 * ((dz_win / 0.0086) ** 2)) * (np.abs(dz_win) <= 0.0108)
                sc_v = d_val_f * prox_v
                sc_r = (-d_val_f) * prox_r
                kv_best = int(np.argmax(sc_v))
                kr_best = int(np.argmax(sc_r))
                best_v_depth = float(d_val_f[kv_best]) if sc_v[kv_best] > 0.0 else 0.0
                best_r_height = float(-d_val_f[kr_best]) if sc_r[kr_best] > 0.0 else 0.0
                used_back_ray = True
                if best_v_depth > 0.00018 and sc_v[kv_best] >= 0.85 * sc_r[kr_best]:
                    dz_tgt = float(dz_win[kv_best])
                    g_f = float(smoothstep(np.array([(best_v_depth - 0.00014) / 0.00070]))[0])
                    p0[2] = pz_r + (0.90 * wc * g_f) * dz_tgt
                    rh_t, _, _, _ = hbvh.ray_cast(Vector((px_r, -0.38, float(p0[2]))), Vector((0.0, 1.0, 0.0)), 0.36)
                    if rh_t is not None:
                        p0[1] = float(rh_t.y)
                    snap_mode = 1
                    snap_amp = best_v_depth
                elif best_r_height > 0.00020:
                    dz_tgt = float(dz_win[kr_best])
                    g_f = float(smoothstep(np.array([(best_r_height - 0.00016) / 0.00075]))[0])
                    p0[2] = pz_r + (0.86 * wc * g_f) * dz_tgt
                    rh_t, _, _, _ = hbvh.ray_cast(Vector((px_r, -0.38, float(p0[2]))), Vector((0.0, 1.0, 0.0)), 0.36)
                    if rh_t is not None:
                        p0[1] = float(rh_t.y)
                    snap_mode = -1
                    snap_amp = best_r_height

        if not used_back_ray:
            near_loc = hkd.find_range(p0.tolist(), 0.0105)
            loc_vh = max((float(valley_hu[hi]) for _, hi, _ in near_loc), default=0.0)
            loc_rh = max((float(ridge_hu[hi]) for _, hi, _ in near_loc), default=0.0)
            hits = hkd.find_range(p0.tolist(), 0.030 if is_back_u else 0.024)
            v_rad = 0.0250 if is_back_u else 0.0185
            v_min_cap = 0.0240 if is_back_u else 0.0175
            sh_cap = 0.0165 if is_back_u else 0.0092
            if hits:
                best_vw, best_rw = 0.0, 0.0
                acc_v = np.zeros(3, dtype=np.float64)
                acc_r = np.zeros(3, dtype=np.float64)
                max_vh, max_rh = 0.0, 0.0
                min_v_dist = 1.0
                for co, hi, dist in hits:
                    vh = float(valley_hu[hi])
                    rh = float(ridge_hu[hi])
                    if vh > max_vh:
                        max_vh = vh
                    if vh > 0.00085 and dist < min_v_dist:
                        min_v_dist = float(dist)
                    if rh > max_rh:
                        max_rh = rh
                    if vh > 0.00075 and dist <= v_rad:
                        wt_v = ((vh - 0.00060) ** 2.4) * np.exp(-0.5 * ((dist / 0.0125) ** 2))
                        acc_v += wt_v * np.asarray(co, dtype=np.float64)
                        best_vw += wt_v
                    if rh > 0.00105 and dist <= (0.0210 if is_back_u else 0.0165):
                        wt_r = ((rh - 0.00080) ** 2.2) * np.exp(-0.5 * ((dist / 0.0105) ** 2))
                        acc_r += wt_r * np.asarray(co, dtype=np.float64)
                        best_rw += wt_r
                if best_vw > 1e-12 and max_vh > 0.00085 and loc_rh < 0.90 * max_vh and min_v_dist <= v_min_cap:
                    tgt_valley = acc_v / best_vw
                    shift = tgt_valley - p0
                    if mid_lu[ui]:
                        shift[0] = 0.0
                    sh_len = float(np.linalg.norm(shift))
                    if sh_len > sh_cap:
                        shift *= sh_cap / sh_len
                    g_snap = float(smoothstep(np.array([(max_vh - 0.00075) / 0.0018]))[0])
                    p0 = p0 + ((0.92 if is_back_u else 0.80) * wc * g_snap) * shift
                    snap_mode = 1
                    snap_amp = max_vh
                elif best_rw > 1e-12 and max_rh > 0.00115 and max_vh > 0.00080 and loc_vh < 0.84 * max_rh:
                    tgt_ridge = acc_r / best_rw
                    shift_r = tgt_ridge - p0
                    if mid_lu[ui]:
                        shift_r[0] = 0.0
                    sh_r_len = float(np.linalg.norm(shift_r))
                    r_cap = 0.0130 if is_back_u else 0.0082
                    if sh_r_len > r_cap:
                        shift_r *= r_cap / sh_r_len
                    g_r = float(smoothstep(np.array([(max_rh - 0.00095) / 0.0020]))[0])
                    p0 = p0 + ((0.88 if is_back_u else 0.76) * wc * g_r) * shift_r
                    snap_mode = -1
                    snap_amp = max_rh

        hit_b, hit_n, _, dist_b = hbvh.find_nearest(Vector(p0.tolist()), 0.030)
        if hit_b is not None and dist_b < 0.022:
            p_proj = np.asarray(hit_b, dtype=np.float64)
            n_proj = np.asarray(hit_n, dtype=np.float64)
            is_pec_zone_proj = (not is_back_u) and (p_proj[2] > 1.350)
            if snap_mode == -1 and not is_pec_zone_proj:
                p_proj = p_proj + min((1.45 if is_back_u else 1.15) * snap_amp, 0.0014 if is_back_u else 0.0020) * n_proj
            elif snap_mode == 1 and not is_pec_zone_proj:
                p_proj = p_proj - min((1.30 if is_back_u else 0.70) * snap_amp, 0.0012 if is_back_u else 0.0012) * n_proj
            if mid_lu[ui]:
                p_proj[0] = 0.0
            lu[ui] = (1.0 - wc) * lu[ui] + wc * p_proj
            front_snap_mode[ui] = snap_mode
            front_snap_amp[ui] = snap_amp

    # Smooth anterior LOD1 tangent snap shifts LATERALLY along each pectoral/panniculus crescent row (NEVER vertically cancelling
    # sulcus vs lower-breast crest shifts!) AND smooth posterior LOD1 shifts laterally along each row so runtime LOD1 preserves
    # 100% of the rounded pectoral crescent fold, n_z < 0 underside, & both oblique back folds with zero staircase facets!
    # Smooth anterior LOD1 tangent snap shifts ALONG the upward-curving pectoral U-cup iso-contours (and horizontal panniculus rows below Z=1.40m)
    # so runtime LOD1 preserves BOTH the upward-curving outer breast cup (~1476mm at |X|=145mm) AND crisp n_z < 0 underside without zig-zagging!
    ant_mask_sm = (rl_u[:, 1] <= 0.025) & (w_cr_l > 0.02) & (~seam_lu)
    if np.any(ant_mask_sm):
        ax_lu = np.abs(lu[:, 0])
        u_med_l1 = np.clip((ax_lu - 0.034) / (0.146 - 0.034), 0.0, 1.0)
        u_lat_l1 = np.clip((ax_lu - 0.148) / 0.052, 0.0, 1.18)
        z_cup_l1 = np.where(
            ax_lu <= 0.148,
            1.484 - 0.0415 * (u_med_l1 ** 0.92),
            1.4425 + 0.0475 * (np.minimum(u_lat_l1, 1.0) ** 1.55),
        )
        in_pec_l1 = smootherstep((lu[:, 2] - 1.395) / 0.020)
        iso_z_l1 = (1.0 - in_pec_l1) * rl_u[:, 2] + in_pec_l1 * (lu[:, 2] - z_cup_l1)
        ant_lat_w = np.exp(-(((iso_z_l1[l_es] - iso_z_l1[l_ed]) / 0.0110) ** 2))
        ant_lat_deg = np.maximum(np.bincount(l_es, weights=ant_lat_w, minlength=n_lu), 1e-12)
        d_ant = lu - lu_init
        for _ in range(3):
            nb_d = np.column_stack([np.bincount(l_es, weights=ant_lat_w * d_ant[l_ed, c], minlength=n_lu) / ant_lat_deg for c in range(3)])
            d_ant[ant_mask_sm] = 0.68 * d_ant[ant_mask_sm] + 0.32 * nb_d[ant_mask_sm]
            d_ant[mid_lu, 0] = 0.0
        lu_cand = lu_init + d_ant
        for ui in np.flatnonzero(ant_mask_sm):
            wc = float(w_cr_l[ui])
            hit_b, hit_n, _, dist_b = hbvh.find_nearest(Vector(lu_cand[ui].tolist()), 0.026)
            if hit_b is not None and dist_b < 0.020:
                p_proj = np.asarray(hit_b, dtype=np.float64)
                n_proj = np.asarray(hit_n, dtype=np.float64)
                sm_i = int(front_snap_mode[ui])
                sa_i = float(front_snap_amp[ui])
                if p_proj[2] <= 1.350:
                    if sm_i == -1:
                        p_proj = p_proj + min(1.10 * sa_i, 0.0019) * n_proj
                    elif sm_i == 1:
                        p_proj = p_proj - min(0.60 * sa_i, 0.0011) * n_proj
                elif 0.030 <= abs(p_proj[0]) <= 0.180 and 1.422 <= p_proj[2] <= 1.526:
                    if sm_i == -1:
                        p_proj = p_proj + min(1.15 * sa_i, 0.0015) * n_proj
                    elif sm_i == 1:
                        p_proj = p_proj - min(1.15 * sa_i, 0.0015) * n_proj
                if mid_lu[ui]:
                    p_proj[0] = 0.0
                lu[ui] = (1.0 - wc) * lu_init[ui] + wc * p_proj

    back_mask_sm = (rl_u[:, 1] > 0.025) & (w_cr_l > 0.02) & (~seam_lu)
    if np.any(back_mask_sm):
        lat_edge_w = np.exp(-(((rl_u[l_es, 2] - rl_u[l_ed, 2]) / 0.011) ** 2))
        lat_deg = np.maximum(np.bincount(l_es, weights=lat_edge_w, minlength=n_lu), 1e-12)
        d_bk = lu - lu_init
        for _ in range(3):
            nb_bk = np.column_stack([np.bincount(l_es, weights=lat_edge_w * d_bk[l_ed, c], minlength=n_lu) / lat_deg for c in range(3)])
            d_bk[back_mask_sm] = 0.65 * d_bk[back_mask_sm] + 0.35 * nb_bk[back_mask_sm]
            d_bk[mid_lu, 0] = 0.0
        lu_bk_cand = lu_init + d_bk
        for ui in np.flatnonzero(back_mask_sm):
            wc = float(w_cr_l[ui])
            hit_b, hit_n, _, dist_b = hbvh.find_nearest(Vector(lu_bk_cand[ui].tolist()), 0.026)
            if hit_b is not None and dist_b < 0.020:
                p_proj = np.asarray(hit_b, dtype=np.float64)
                n_proj = np.asarray(hit_n, dtype=np.float64)
                sm_i = int(front_snap_mode[ui])
                sa_i = float(front_snap_amp[ui])
                if sm_i == -1:
                    p_proj = p_proj + min((1.75 if is_ext_full_l1 else 1.35) * sa_i, 0.0023 if is_ext_full_l1 else 0.0013) * n_proj
                elif sm_i == 1 and adipose_gate > 0.05:
                    p_proj = p_proj - min((1.65 if is_ext_full_l1 else 1.20) * sa_i, 0.0021 if is_ext_full_l1 else 0.0011) * n_proj
                if mid_lu[ui]:
                    p_proj[0] = 0.0
                lu[ui] = (1.0 - wc) * lu_init[ui] + wc * p_proj

    # On lean/muscular builds (`adipose_gate < 0.99`), align runtime LOD1 (`8,568v`) vertices directly onto LOD0 muscular sulci & crests
    # at TRUE `LOD1` edge scale (`~22mm` = 32-ring LOD0 baseline vs 2-ring smooth!) across the ENTIRE body (6-pack horizontal & vertical cuts,
    # sternal pec cleavage & lower pec border, serratus ribs, deltoid/bicep/tricep/forearm grooves, scapular/rhomboid/teres/erector back
    # separations, quad teardrops, and gastrocnemius heads) + calibrated normal chord-loss compensation (`retaining 80–120% Donor relief!`):
    lean_l1 = float(np.clip(1.0 - adipose_gate, 0.0, 1.0))
    w_musc_l1 = np.zeros(n_lu, dtype=np.float64)
    if lean_l1 > 0.02:
        hu_sm_micro = hu_pts.copy()
        for _ in range(2):
            hu_sm_micro = 0.50 * hu_sm_micro + 0.50 * np.column_stack(
                [np.bincount(h_es, weights=hu_sm_micro[h_ed, c], minlength=n_hu) / h_deg_f for c in range(3)]
            )
        hu_sm_sharp = hu_sm_micro.copy()
        for _ in range(12):
            hu_sm_sharp = 0.44 * hu_sm_sharp + 0.56 * np.column_stack(
                [np.bincount(h_es, weights=hu_sm_sharp[h_ed, c], minlength=n_hu) / h_deg_f for c in range(3)]
            )
        hu_sm_mid = hu_sm_sharp.copy()
        for _ in range(22):
            hu_sm_mid = 0.40 * hu_sm_mid + 0.60 * np.column_stack(
                [np.bincount(h_es, weights=hu_sm_mid[h_ed, c], minlength=n_hu) / h_deg_f for c in range(3)]
            )
        # Multi-scale (`12-ring` narrow serratus/extensor/6-pack cuts + `34-ring` broad pec/back/quad/calf sulci) intrinsic curvature,
        # subtracting ONLY a broad 56-ring cylindrical limb baseline (`0.55` weight) so narrow sulci keep 100% crisp signal on LOD1 Clay!
        curv_sharp_hu = np.einsum("ni,ni->n", hu_sm_sharp - hu_sm_micro, hu_nrm)
        curv_broad_hu = np.einsum("ni,ni->n", hu_sm_mid - hu_sm_micro, hu_nrm)
        curv_raw_hu = np.where(curv_broad_hu >= 0.0, np.maximum(1.35 * curv_sharp_hu, curv_broad_hu), np.minimum(1.15 * curv_sharp_hu, curv_broad_hu))
        curv_bg_hu = curv_broad_hu.copy()
        for _ in range(48):
            curv_bg_hu = 0.36 * curv_bg_hu + 0.64 * (np.bincount(h_es, weights=curv_bg_hu[h_ed], minlength=n_hu) / h_deg_f)
        curv_l1_hu = curv_raw_hu - 0.55 * np.minimum(curv_bg_hu, 0.0)
        valley_musc_hu = np.clip(curv_l1_hu, 0.0, 0.036)
        ridge_musc_hu = np.clip(-curv_l1_hu, 0.0, 0.036)

        # Exclude ONLY collar seam, distal hands/fingers, plantar soles, and the close-fitting high-cut `linenBriefs` support triangles
        # (`so upper quads, hip flexors, lower glutes, serratus, full back, deltoids, clavicles & diamond gastrocnemius calves ALL stay 100% active!`):
        from linen_briefs import _eval_brief_level_set_bl

        phi_br_l1 = _eval_brief_level_set_bl(rl_u)
        l_deg_u0 = np.maximum(np.bincount(l_es, minlength=n_lu).astype(np.float64), 1.0)

        # Un-stretch the lower-abdominal / suprapubic LOD1 quad rows (`where raw CG's crotch pull dragged Z_canon=1.126m
        # down 45mm to Z=1.081m, creating a 104mm-tall 38.7° diagonal triangle tent ridge above linenBriefs!`) via pure
        # tangent-plane neighbor spacing + exact `high_fit` BVH re-projection (`0.00mm` surface deviation, `<15°` smooth quads!):
        w_lowab_resp = (
            np.where(~seam_lu, 1.0, 0.0)
            * lean_l1
            * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.145) / 0.022))
            * smootherstep((rl_u[:, 2] - 1.062) / 0.022)
            * (1.0 - smootherstep((rl_u[:, 2] - 1.212) / 0.024))
            * smootherstep((-rl_u[:, 1] - 0.035) / 0.025)
        )
        lab_idx = np.flatnonzero(w_lowab_resp > 0.015)
        if len(lab_idx):
            wlab = w_lowab_resp[lab_idx]
            for _ in range(30):
                nrm_lb = vertex_normals(lu[low_weld], low_tri, low_weld)[first_lu]
                nbr_lb = np.column_stack([np.bincount(l_es, weights=lu[l_ed, c], minlength=n_lu) / l_deg_u0 for c in range(3)])
                for k_lb, ui_lb in enumerate(lab_idx):
                    dp_lb = nbr_lb[ui_lb] - lu[ui_lb]
                    nv_lb = nrm_lb[ui_lb]
                    dp_lbn = float(np.dot(dp_lb, nv_lb)) * nv_lb
                    dp_lbt = dp_lb - dp_lbn
                    cand_lb = lu[ui_lb] + float(wlab[k_lb]) * (0.62 * dp_lbt + 0.14 * dp_lbn)
                    if mid_lu[ui_lb]:
                        cand_lb[0] = 0.0
                    hb_lb, hn_lb, _, db_lb = hbvh.find_nearest(Vector(cand_lb.tolist()), 0.028)
                    if hb_lb is not None and db_lb < 0.024 and float(np.dot(np.asarray(hn_lb, dtype=np.float64), nv_lb)) > 0.45:
                        p_new_lb = 0.86 * np.asarray(hb_lb, dtype=np.float64) + 0.14 * cand_lb
                        if mid_lu[ui_lb]:
                            p_new_lb[0] = 0.0
                        lu[ui_lb] = p_new_lb

        # Keep the posterior natal-cleft strip (`|X| <= 24mm, Y > +0.025m, Z = 0.95..1.135m`) 100% active on LOD1
        # so unmasked bare-pelvis LOD1 renders the full continuous sacral-to-gluteal cleft (`zero "uni-glute" bridge!`):
        in_post_cleft_l1 = (
            (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.024) / 0.012))
            * smootherstep((rl_u[:, 1] - 0.025) / 0.020)
            * smootherstep((rl_u[:, 2] - 0.950) / 0.024)
            * (1.0 - smootherstep((rl_u[:, 2] - 1.135) / 0.024))
        )
        # Exclude ONLY the immediate `16 mm` rim above `linenBriefs`'s `1.108m` front V-waistband (`Z_canon <= 1.124m`) so the lower
        # 6-pack tendinous cut, sub-umbilical linea alba, and external oblique / iliac V (`Apollo's belt`) stay 100% crisp on LOD1 Clay!
        lowab_snap_excl = (
            (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.125) / 0.022))
            * smootherstep((rl_u[:, 2] - 1.075) / 0.018)
            * (1.0 - smootherstep((rl_u[:, 2] - 1.124) / 0.018))
            * smootherstep((-rl_u[:, 1] - 0.035) / 0.025)
        )
        briefs_band_excl = np.maximum(smootherstep((phi_br_l1 + 0.012) / 0.032) * (1.0 - in_post_cleft_l1), lowab_snap_excl)
        hand_l1_excl = smootherstep((np.abs(rl_u[:, 0]) - (0.435 + 0.062 * slender_m)) / (0.035 - 0.012 * slender_m)) * (
            1.0 - smootherstep((rl_u[:, 2] - 1.320) / 0.050)
        )
        # Exclude the full anterior-to-posterior axillary hinge (`including the Y=+0.11..+0.16m rear armpit where 22->42 deg unposing
        # + sulcus snapping previously crushed triangles to 1.44mm!`) AND the lateral/posterolateral waist/flank silhouette (`|X| >= 0.106m,
        # Z = 1.145..1.415m, Y > -0.048m`) so runtime LOD1 tracks the smooth `high_fit` flank V-taper with ZERO corrugated notches,
        # while keeping anterior 6-pack abs, anterior serratus slips (`Y < -0.045m`), outer pec, deltoids, inner scapula & limbs active:
        # Protect posterior teres major & infraspinatus (`Y > +0.060m, |X| <= 0.178m`) from axillary hinge exclusion so runtime LOD1 Clay
        # snaps crisply onto the posterior scapular/teres subdivisions (`retaining >=110% posteriorScapulaBack relief on LOD1 Clay!`):
        ax_hinge_l1_excl = (
            smootherstep((np.abs(rl_u[:, 0]) - 0.162) / 0.018)
            * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.242) / 0.022))
            * smootherstep((rl_u[:, 2] - 1.430) / 0.024)
            * (1.0 - smootherstep((rl_u[:, 2] - 1.575) / 0.022))
            * smootherstep((rl_u[:, 1] + 0.095) / 0.024)
            * (1.0 - smootherstep((rl_u[:, 1] - 0.148) / 0.024))
        )
        th_deg_l1 = np.degrees(np.arctan2(np.abs(lu[:, 0]), -lu[:, 1]))
        serr_keep_l1 = (
            (1.0 - smootherstep((lu[:, 1] + 0.058 - 0.022 * slender_m) / 0.022))
            * smootherstep((lu[:, 2] - 1.320) / 0.022)
            * (1.0 - smootherstep((lu[:, 2] - 1.472) / 0.022))
            * (1.0 - smootherstep((th_deg_l1 - (65.0 + 26.0 * slender_m)) / 9.0))
        )
        s_post_l1_ceil = smootherstep((th_deg_l1 - 108.0) / 15.0)
        z_ceil_l1 = (1.0 - s_post_l1_ceil) * 1.518 + s_post_l1_ceil * 1.388
        flank_waist_l1_excl = (
            (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.208) / 0.022))
            * smootherstep((th_deg_l1 - 50.0) / 11.0)
            * (1.0 - smootherstep((th_deg_l1 - 134.0) / 12.0))
            * smootherstep((lu[:, 2] - 1.125) / 0.024)
            * (1.0 - smootherstep((lu[:, 2] - z_ceil_l1) / 0.024))
            * (1.0 - serr_keep_l1)
            * np.where(lu[:, 1] > 0.015, smootherstep((np.abs(lu[:, 0]) - 0.108) / 0.020), 1.0)
        )
        elbow_hinge_l1_excl = (
            0.48
            * smootherstep((np.abs(rl_u[:, 0]) - 0.340) / 0.020)
            * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.402) / 0.020))
            * smootherstep((rl_u[:, 2] - 1.300) / 0.020)
            * (1.0 - smootherstep((rl_u[:, 2] - 1.445) / 0.024))
        )
        z_top_l1 = np.where((rl_u[:, 1] < -0.020) | (np.abs(rl_u[:, 0]) > 0.165), 1.735, 1.702)
        w_musc_l1 = (
            np.where(~seam_lu, 1.0, 0.0)
            * lean_l1
            * smootherstep((rl_u[:, 2] - 0.080) / 0.028)
            * (1.0 - smootherstep((rl_u[:, 2] - z_top_l1) / 0.016))
            * (1.0 - 0.90 * briefs_band_excl)
            * (1.0 - hand_l1_excl)
            * (1.0 - ax_hinge_l1_excl)
            * (1.0 - flank_waist_l1_excl)
            * (1.0 - elbow_hinge_l1_excl)
        )

        # Compute minimum incident LOD1 edge length per vertex (`0.26 * min_edge` cap prevents opposing vertices from crushing quad rows):
        l_deg_u = np.maximum(np.bincount(l_es, minlength=n_lu).astype(np.float64), 1.0)
        e_len_l1 = np.linalg.norm(lu[l_es] - lu[l_ed], axis=1)
        min_edge_u = np.full(n_lu, 0.025, dtype=np.float64)
        np.minimum.at(min_edge_u, l_es, e_len_l1)
        lu_nrm = vertex_normals(lu[low_weld], low_tri, low_weld)[first_lu]

        dz_m_prof = np.linspace(-0.022, 0.022, 23)  # 2 mm profile for horizontal cuts (6-pack, lower pec,clavicle, posterior scapular/calf)
        dx_m_prof = np.linspace(-0.022, 0.022, 23)  # 2 mm horizontal profile for vertical/oblique back & calf sulci
        musc_mode_lu = np.zeros(n_lu, dtype=np.int64)
        musc_amp_lu = np.zeros(n_lu, dtype=np.float64)
        lu_tang_cand = lu.copy()

        for ui in np.flatnonzero(w_musc_l1 > 0.02):
            p0_m = lu[ui].copy()
            n0_l = lu_nrm[ui]
            wm_c = float(w_musc_l1[ui])
            max_shift = min(0.26 * float(min_edge_u[ui]), 0.0062)
            used_ray_snap = False

            # 1) Mark sternal midline (`X=0, Z = 1.43..1.60m, Y < -0.065m`), umbilicus/navel (`|X|<=16mm, Z=1.24..1.29m, Y<-0.10m`), AND posterior natal-cleft
            #    midline (`|X| <= 8mm, Z = 0.96..1.20m, Y > 0.025m`) as valleys proportional to actual LOD0 curvature (`2.8mm` on deep M100 pecs, flat on bony M000):
            if mid_lu[ui] and (rl_u[ui, 1] < -0.065) and (1.430 <= p0_m[2] <= 1.605):
                _, st_hi, _ = hkd.find(p0_m.tolist())
                vh_st = float(valley_musc_hu[st_hi]) if st_hi is not None else 0.0
                if vh_st > 0.00022:
                    musc_mode_lu[ui] = 1
                    musc_amp_lu[ui] = float(np.clip(3.2 * vh_st, 0.00025, 0.0028))
            elif (abs(rl_u[ui, 0]) <= 0.016) and (rl_u[ui, 1] < -0.100) and (1.238 <= p0_m[2] <= 1.292):
                musc_mode_lu[ui] = 1
                musc_amp_lu[ui] = 0.0028  # preserve crisp umbilicus/navel pit on LOD1 Clay!
            elif (abs(rl_u[ui, 0]) <= 0.008) and (rl_u[ui, 1] > 0.025) and (0.955 <= p0_m[2] <= 1.155):
                musc_mode_lu[ui] = 1
                musc_amp_lu[ui] = 0.0040  # crisp gluteal natal cleft depth!
            elif (slender_m > 0.05) and mid_lu[ui] and (rl_u[ui, 1] > 0.025) and (1.225 <= p0_m[2] <= 1.685):
                _, sp_hi, _ = hkd.find(p0_m.tolist())
                rh_sp = max(0.0, float(-curv_sharp_hu[sp_hi])) if sp_hi is not None else 0.0
                musc_mode_lu[ui] = -1
                musc_amp_lu[ui] = max(musc_amp_lu[ui], float(np.clip(2.8 * rh_sp + 0.0016, 0.0016, 0.0032)) * slender_m)
            elif (slender_m > 0.05) and (0.012 <= abs(rl_u[ui, 0]) <= 0.034) and (rl_u[ui, 1] > 0.025) and (1.235 <= p0_m[2] <= 1.665):
                musc_mode_lu[ui] = 1
                musc_amp_lu[ui] = max(musc_amp_lu[ui], 0.0018 * slender_m)

            # 2a) Direct front-ray 2D (Z & X) snapping onto horizontal 6-pack tendinous intersections, vertical linea semilunaris,
            #     iliac V (`Apollo's belt`), lower/outer pec border & clavicular/SCM groove (`Z = 1.130..1.725m`), plus protruding bony
            #     clavicles, costal arch & iliac crests on slender (`M < 0.5`) builds:
            if (rl_u[ui, 1] < -0.025) and (1.130 <= p0_m[2] <= 1.725) and (abs(p0_m[0]) <= 0.185):
                px_m, pz_m = float(p0_m[0]), float(p0_m[2])
                f_pr = np.full(len(dz_m_prof), np.nan, dtype=np.float64)
                for ki_m, dzk_m in enumerate(dz_m_prof):
                    rh_m, _, _, _ = hbvh.ray_cast(Vector((px_m, -0.38, pz_m + float(dzk_m))), Vector((0.0, 1.0, 0.0)), 0.36)
                    if rh_m is not None and rh_m.y < -0.02:
                        f_pr[ki_m] = -float(rh_m.y)
                if np.all(np.isfinite(f_pr)):
                    d_sulc = 0.5 * (f_pr[0:11] + f_pr[12:23]) - f_pr[6:17]
                    dz_w = dz_m_prof[6:17]
                    sc_sv = d_sulc * np.exp(-0.5 * ((dz_w / 0.0102) ** 2))
                    kb_v = int(np.argmax(sc_sv))
                    sc_sr = (-d_sulc) * np.exp(-0.5 * ((dz_w / 0.0102) ** 2)) if slender_m > 0.05 else np.zeros_like(sc_sv)
                    kb_r = int(np.argmax(sc_sr))
                    if sc_sv[kb_v] > max(0.00018, 0.85 * float(sc_sr[kb_r])):
                        dz_step = float(np.clip(0.92 * wm_c * float(dz_w[kb_v]), -max_shift, max_shift))
                        p0_m[2] = pz_m + dz_step
                        musc_mode_lu[ui] = 1
                        musc_amp_lu[ui] = float(d_sulc[kb_v])
                        used_ray_snap = True
                    elif slender_m > 0.05 and sc_sr[kb_r] > 0.00022:
                        dz_step = float(np.clip(0.86 * slender_m * wm_c * float(dz_w[kb_r]), -max_shift, max_shift))
                        p0_m[2] = pz_m + dz_step
                        musc_mode_lu[ui] = -1
                        musc_amp_lu[ui] = max(musc_amp_lu[ui], float(-d_sulc[kb_r]))
                        used_ray_snap = True
                if (not mid_lu[ui]) and (1.130 <= p0_m[2] <= 1.630):
                    fx_pr = np.full(len(dx_m_prof), np.nan, dtype=np.float64)
                    for ki_fx, dxk_f in enumerate(dx_m_prof):
                        rh_fx, _, _, _ = hbvh.ray_cast(Vector((px_m + float(dxk_f), -0.38, float(p0_m[2]))), Vector((0.0, 1.0, 0.0)), 0.36)
                        if rh_fx is not None and rh_fx.y < -0.02:
                            fx_pr[ki_fx] = -float(rh_fx.y)
                    if np.all(np.isfinite(fx_pr)):
                        d_fx = 0.5 * (fx_pr[0:11] + fx_pr[12:23]) - fx_pr[6:17]
                        dx_w = dx_m_prof[6:17]
                        sc_fx = d_fx * np.exp(-0.5 * ((dx_w / 0.0102) ** 2))
                        kb_fx = int(np.argmax(sc_fx))
                        sc_fxr = (-d_fx) * np.exp(-0.5 * ((dx_w / 0.0102) ** 2)) if slender_m > 0.05 else np.zeros_like(sc_fx)
                        kb_fxr = int(np.argmax(sc_fxr))
                        if sc_fx[kb_fx] > max(0.00018, 0.85 * float(sc_fxr[kb_fxr])):
                            nx_f = px_m + float(np.clip(0.90 * wm_c * float(dx_w[kb_fx]), -max_shift, max_shift))
                            if nx_f * float(rl_u[ui, 0]) > 0.0025:
                                p0_m[0] = nx_f
                                musc_mode_lu[ui] = 1
                                musc_amp_lu[ui] = max(musc_amp_lu[ui], float(d_fx[kb_fx]))
                                used_ray_snap = True
                        elif slender_m > 0.05 and sc_fxr[kb_fxr] > 0.00022:
                            nx_fr = px_m + float(np.clip(0.84 * slender_m * wm_c * float(dx_w[kb_fxr]), -max_shift, max_shift))
                            if nx_fr * float(rl_u[ui, 0]) > 0.0025:
                                p0_m[0] = nx_fr
                                if musc_mode_lu[ui] == 0:
                                    musc_mode_lu[ui] = -1
                                musc_amp_lu[ui] = max(musc_amp_lu[ui], float(-d_fx[kb_fxr]))
                                used_ray_snap = True

            # 2a-quad) Direct anterior/anterolateral Thigh Quad 2D (Z & X) sulcus snapping (`vastus medialis oblique teardrop,
            #          rectus femoris & vastus lateralis cuts`, `Z = 0.55..0.95m`):
            if (not mid_lu[ui]) and (rl_u[ui, 1] < -0.015) and (0.550 <= p0_m[2] <= 0.955) and (0.032 <= abs(p0_m[0]) <= 0.215):
                px_q, pz_q = float(p0_m[0]), float(p0_m[2])
                qz_pr = np.full(len(dz_m_prof), np.nan, dtype=np.float64)
                for ki_qz, dzk_q in enumerate(dz_m_prof):
                    rh_qz, _, _, _ = hbvh.ray_cast(Vector((px_q, -0.35, pz_q + float(dzk_q))), Vector((0.0, 1.0, 0.0)), 0.36)
                    if rh_qz is not None and rh_qz.y < -0.005:
                        qz_pr[ki_qz] = -float(rh_qz.y)
                if np.all(np.isfinite(qz_pr)):
                    d_qz = 0.5 * (qz_pr[0:11] + qz_pr[12:23]) - qz_pr[6:17]
                    dz_w = dz_m_prof[6:17]
                    sc_qz = d_qz * np.exp(-0.5 * ((dz_w / 0.0100) ** 2))
                    kb_qz = int(np.argmax(sc_qz))
                    if sc_qz[kb_qz] > 0.00022:
                        p0_m[2] = pz_q + float(np.clip(0.86 * wm_c * float(dz_w[kb_qz]), -max_shift, max_shift))
                        musc_mode_lu[ui] = 1
                        musc_amp_lu[ui] = max(musc_amp_lu[ui], float(d_qz[kb_qz]))
                        used_ray_snap = True
                qx_pr = np.full(len(dx_m_prof), np.nan, dtype=np.float64)
                for ki_qx, dxk_q in enumerate(dx_m_prof):
                    rh_qx, _, _, _ = hbvh.ray_cast(Vector((px_q + float(dxk_q), -0.35, float(p0_m[2]))), Vector((0.0, 1.0, 0.0)), 0.36)
                    if rh_qx is not None and rh_qx.y < -0.005:
                        qx_pr[ki_qx] = -float(rh_qx.y)
                if np.all(np.isfinite(qx_pr)):
                    d_qx = 0.5 * (qx_pr[0:11] + qx_pr[12:23]) - qx_pr[6:17]
                    dx_w = dx_m_prof[6:17]
                    sc_qx = d_qx * np.exp(-0.5 * ((dx_w / 0.0100) ** 2))
                    kb_qx = int(np.argmax(sc_qx))
                    sc_qxr = (-d_qx) * np.exp(-0.5 * ((dx_w / 0.0100) ** 2)) if slender_m > 0.05 else np.zeros_like(sc_qx)
                    kb_qxr = int(np.argmax(sc_qxr))
                    if sc_qx[kb_qx] > max(0.00022, 0.85 * float(sc_qxr[kb_qxr])):
                        nx_q = px_q + float(np.clip(0.86 * wm_c * float(dx_w[kb_qx]), -max_shift, max_shift))
                        if nx_q * float(rl_u[ui, 0]) > 0.012:
                            p0_m[0] = nx_q
                            musc_mode_lu[ui] = 1
                            musc_amp_lu[ui] = max(musc_amp_lu[ui], float(d_qx[kb_qx]))
                            used_ray_snap = True
                    elif slender_m > 0.05 and sc_qxr[kb_qxr] > 0.00022:
                        nx_qr = px_q + float(np.clip(0.82 * slender_m * wm_c * float(dx_w[kb_qxr]), -max_shift, max_shift))
                        if nx_qr * float(rl_u[ui, 0]) > 0.012:
                            p0_m[0] = nx_qr
                            if musc_mode_lu[ui] == 0:
                                musc_mode_lu[ui] = -1
                            musc_amp_lu[ui] = max(musc_amp_lu[ui], float(-d_qx[kb_qxr]))
                            used_ray_snap = True

            # 2b) Direct posterior-ray 2D (Z & X) sulcus snapping across the FULL Back width (`|X| <= 0.218m`: trapezius V, rhomboids,
            #     infraspinatus, teres major, lat borders & spinal erectors`, `Z = 1.18..1.69m`) + Hamstrings + Gastrocnemius Calves:
            is_post_back = (rl_u[ui, 1] > 0.015) and (1.185 <= p0_m[2] <= 1.688) and (abs(p0_m[0]) <= 0.218)
            is_post_ham = (rl_u[ui, 1] > 0.015) and (0.540 <= p0_m[2] <= 0.920) and (0.040 <= abs(p0_m[0]) <= 0.220)
            is_post_calf = (rl_u[ui, 1] > 0.008) and (0.105 <= p0_m[2] <= 0.495) and (0.035 <= abs(p0_m[0]) <= 0.220)
            if is_post_back or is_post_ham or is_post_calf:
                px_b, pz_b = float(p0_m[0]), float(p0_m[2])
                bz_pr = np.full(len(dz_m_prof), np.nan, dtype=np.float64)
                for ki_b, dzk_b in enumerate(dz_m_prof):
                    rh_b, _, _, _ = hbvh.ray_cast(Vector((px_b, 0.38, pz_b + float(dzk_b))), Vector((0.0, -1.0, 0.0)), 0.38)
                    if rh_b is not None and rh_b.y > 0.005:
                        bz_pr[ki_b] = float(rh_b.y)
                best_b_amp = 0.0
                best_b_ridge = 0.0
                if np.all(np.isfinite(bz_pr)):
                    d_bz = 0.5 * (bz_pr[0:11] + bz_pr[12:23]) - bz_pr[6:17]
                    dz_w = dz_m_prof[6:17]
                    sc_bz = d_bz * np.exp(-0.5 * ((dz_w / 0.0100) ** 2))
                    kb_z = int(np.argmax(sc_bz))
                    sc_bzr = (-d_bz) * np.exp(-0.5 * ((dz_w / 0.0100) ** 2)) if slender_m > 0.05 else np.zeros_like(sc_bz)
                    kb_zr = int(np.argmax(sc_bzr))
                    if sc_bz[kb_z] > max(0.00022, 0.85 * float(sc_bzr[kb_zr])):
                        p0_m[2] = pz_b + float(np.clip(0.88 * wm_c * float(dz_w[kb_z]), -max_shift, max_shift))
                        best_b_amp = max(best_b_amp, float(d_bz[kb_z]))
                    elif slender_m > 0.05 and sc_bzr[kb_zr] > 0.00022:
                        p0_m[2] = pz_b + float(np.clip(0.84 * slender_m * wm_c * float(dz_w[kb_zr]), -max_shift, max_shift))
                        best_b_ridge = max(best_b_ridge, float(-d_bz[kb_zr]))
                if not mid_lu[ui]:
                    bx_pr = np.full(len(dx_m_prof), np.nan, dtype=np.float64)
                    for ki_x, dxk_b in enumerate(dx_m_prof):
                        rh_bx, _, _, _ = hbvh.ray_cast(Vector((px_b + float(dxk_b), 0.38, float(p0_m[2]))), Vector((0.0, -1.0, 0.0)), 0.38)
                        if rh_bx is not None and rh_bx.y > 0.005:
                            bx_pr[ki_x] = float(rh_bx.y)
                    if np.all(np.isfinite(bx_pr)):
                        d_bx = 0.5 * (bx_pr[0:11] + bx_pr[12:23]) - bx_pr[6:17]
                        dx_w = dx_m_prof[6:17]
                        sc_bx = d_bx * np.exp(-0.5 * ((dx_w / 0.0100) ** 2))
                        kb_x = int(np.argmax(sc_bx))
                        sc_bxr = (-d_bx) * np.exp(-0.5 * ((dx_w / 0.0100) ** 2)) if slender_m > 0.05 else np.zeros_like(sc_bx)
                        kb_xr = int(np.argmax(sc_bxr))
                        if sc_bx[kb_x] > max(0.00022, 0.85 * float(sc_bxr[kb_xr])):
                            nx_cand = px_b + float(np.clip(0.88 * wm_c * float(dx_w[kb_x]), -max_shift, max_shift))
                            if nx_cand * float(rl_u[ui, 0]) > 0.002:
                                p0_m[0] = nx_cand
                                best_b_amp = max(best_b_amp, float(d_bx[kb_x]))
                        elif slender_m > 0.05 and sc_bxr[kb_xr] > 0.00022:
                            nx_cr = px_b + float(np.clip(0.84 * slender_m * wm_c * float(dx_w[kb_xr]), -max_shift, max_shift))
                            if nx_cr * float(rl_u[ui, 0]) > 0.002:
                                p0_m[0] = nx_cr
                                best_b_ridge = max(best_b_ridge, float(-d_bx[kb_xr]))
                    # Diagonal ±45° sulcus snapping for oblique teres-major & infraspinatus separations (`Z = 1.38..1.67m, |X| = 0.095..0.215m`):
                    if is_post_back and (1.380 <= p0_m[2] <= 1.670) and (0.095 <= abs(p0_m[0]) <= 0.215):
                        sgn_bx = 1.0 if p0_m[0] >= 0.0 else -1.0
                        for diag_sx in (sgn_bx, -sgn_bx):
                            bd_pr = np.full(len(dz_m_prof), np.nan, dtype=np.float64)
                            for ki_d, d_st in enumerate(dz_m_prof):
                                off_d = 0.7071 * float(d_st)
                                rh_bd, _, _, _ = hbvh.ray_cast(
                                    Vector((float(p0_m[0]) + diag_sx * off_d, 0.38, float(p0_m[2]) + off_d)),
                                    Vector((0.0, -1.0, 0.0)),
                                    0.38,
                                )
                                if rh_bd is not None and rh_bd.y > 0.005:
                                    bd_pr[ki_d] = float(rh_bd.y)
                            if np.all(np.isfinite(bd_pr)):
                                d_bd = 0.5 * (bd_pr[0:11] + bd_pr[12:23]) - bd_pr[6:17]
                                dd_w = dz_m_prof[6:17]
                                sc_bd = d_bd * np.exp(-0.5 * ((dd_w / 0.0095) ** 2))
                                kb_d = int(np.argmax(sc_bd))
                                if sc_bd[kb_d] > max(0.00020, best_b_amp):
                                    step_d = float(np.clip(0.84 * wm_c * float(dd_w[kb_d]), -0.8 * max_shift, 0.8 * max_shift))
                                    nx_d = float(p0_m[0]) + diag_sx * 0.7071 * step_d
                                    if nx_d * float(rl_u[ui, 0]) > 0.005:
                                        p0_m[0] = nx_d
                                        p0_m[2] = float(p0_m[2]) + 0.7071 * step_d
                                        best_b_amp = float(d_bd[kb_d])
                if best_b_amp > 0.0:
                    musc_mode_lu[ui] = 1
                    musc_amp_lu[ui] = max(musc_amp_lu[ui], best_b_amp)
                    used_ray_snap = True
                elif best_b_ridge > 0.0:
                    if musc_mode_lu[ui] == 0:
                        musc_mode_lu[ui] = -1
                    musc_amp_lu[ui] = max(musc_amp_lu[ui], best_b_ridge)
                    used_ray_snap = True

            # 2c) Direct lateral `±X` ray sulcus snapping strictly on ANTERIOR/ANTEROLATERAL Serratus Ribcage (`rl_y < -0.036m, Z = 1.315..1.495m`,
            #     NEVER on lateral waist or posterolateral back!) AND Full Upper/Lower Arm (`|X| = 0.19..0.52m, Z = 1.12..1.63m`):
            is_lat_serr = (rl_u[ui, 1] < -0.036) and (abs(n0_l[0]) > 0.20) and (1.315 <= p0_m[2] <= 1.495) and (0.088 <= abs(p0_m[0]) <= 0.184)
            is_lat_arm = (abs(n0_l[0]) > 0.28) and (1.120 <= p0_m[2] <= 1.630) and (0.192 <= abs(p0_m[0]) <= 0.520)
            if (is_lat_serr or is_lat_arm) and (not mid_lu[ui]):
                sgn_lx_r = 1.0 if p0_m[0] >= 0.0 else -1.0
                py_l, pz_l = float(p0_m[1]), float(p0_m[2])
                lx_pr = np.full(len(dz_m_prof), np.nan, dtype=np.float64)
                x_orig_l = sgn_lx_r * (0.24 if is_lat_serr else 0.52)
                for ki_l, dzk_l in enumerate(dz_m_prof):
                    rh_l, rn_l, _, _ = hbvh.ray_cast(Vector((x_orig_l, py_l, pz_l + float(dzk_l))), Vector((-sgn_lx_r, 0.0, 0.0)), 0.35)
                    if rh_l is not None and sgn_lx_r * float(rn_l.x) > 0.18 and abs(abs(float(rh_l.x)) - abs(float(p0_m[0]))) < 0.032:
                        lx_pr[ki_l] = abs(float(rh_l.x))
                if np.all(np.isfinite(lx_pr)):
                    d_lx = 0.5 * (lx_pr[0:11] + lx_pr[12:23]) - lx_pr[6:17]
                    dz_w = dz_m_prof[6:17]
                    sc_lx = d_lx * np.exp(-0.5 * ((dz_w / 0.0095) ** 2))
                    kb_l = int(np.argmax(sc_lx))
                    if sc_lx[kb_l] > 0.00020:
                        p0_m[2] = pz_l + float(np.clip(0.88 * wm_c * float(dz_w[kb_l]), -max_shift, max_shift))
                        musc_mode_lu[ui] = 1
                        musc_amp_lu[ui] = max(musc_amp_lu[ui], float(d_lx[kb_l]))
                        used_ray_snap = True

            # 3) Full 360-deg 3D tangent-plane sulcus & crest alignment (`serratus ribs, deltoid-bicep-tricep-brachioradialis grooves,
            #    back scapular/teres/lat/erector cuts, vastus medialis/lateralis teardrops, and gastrocnemius heads`):
            hits_m = hkd.find_range(p0_m.tolist(), 0.0225)
            if hits_m:
                best_vw_m, best_rw_m = 0.0, 0.0
                acc_vm = np.zeros(3, dtype=np.float64)
                acc_rm = np.zeros(3, dtype=np.float64)
                max_vh_m, max_rh_m = 0.0, 0.0
                min_vd_m = 1.0
                for co_m, hi_m, dist_m in hits_m:
                    if float(np.dot(hu_nrm[hi_m], n0_l)) < 0.52:
                        continue
                    if (not mid_lu[ui]) and (float(co_m[0]) * float(rl_u[ui, 0]) < -1e-4):
                        continue
                    vh_m = float(valley_musc_hu[hi_m])
                    rh_m = float(ridge_musc_hu[hi_m])
                    max_vh_m = max(max_vh_m, vh_m)
                    max_rh_m = max(max_rh_m, rh_m)
                    if vh_m > 0.00034 and dist_m < min_vd_m:
                        min_vd_m = float(dist_m)
                    if vh_m > 0.00028:
                        wt_vm = ((vh_m - 0.00018) ** 2.2) * np.exp(-0.5 * ((dist_m / 0.0120) ** 2))
                        acc_vm += wt_vm * np.asarray(co_m, dtype=np.float64)
                        best_vw_m += wt_vm
                    if rh_m > 0.00042:
                        wt_rm = ((rh_m - 0.00025) ** 2.0) * np.exp(-0.5 * ((dist_m / 0.0105) ** 2))
                        acc_rm += wt_rm * np.asarray(co_m, dtype=np.float64)
                        best_rw_m += wt_rm
                if best_vw_m > 1e-12 and max_vh_m >= 0.54 * max_rh_m and min_vd_m <= 0.0185:
                    sh_m = acc_vm / best_vw_m - p0_m
                    sh_m = sh_m - float(np.dot(sh_m, n0_l)) * n0_l
                    if mid_lu[ui]:
                        sh_m[0] = 0.0
                    if used_ray_snap:
                        sh_m *= 0.68
                    sh_l = float(np.linalg.norm(sh_m))
                    if sh_l > max_shift:
                        sh_m *= max_shift / sh_l
                    p0_m = p0_m + (0.92 * wm_c) * sh_m
                    musc_mode_lu[ui] = 1
                    musc_amp_lu[ui] = max(musc_amp_lu[ui], max_vh_m)
                elif (not used_ray_snap) and best_rw_m > 1e-12 and max_rh_m > 0.00044 and min_vd_m > 0.0075:
                    sh_m = acc_rm / best_rw_m - p0_m
                    sh_m = sh_m - float(np.dot(sh_m, n0_l)) * n0_l
                    if mid_lu[ui]:
                        sh_m[0] = 0.0
                    r_max_sh = min(0.22 * float(min_edge_u[ui]), 0.0050)
                    sh_l = float(np.linalg.norm(sh_m))
                    if sh_l > r_max_sh:
                        sh_m *= r_max_sh / sh_l
                    p0_m = p0_m + (0.80 * wm_c) * sh_m
                    if musc_mode_lu[ui] == 0:
                        musc_mode_lu[ui] = -1
                    musc_amp_lu[ui] = max(musc_amp_lu[ui], max_rh_m)
            lu_tang_cand[ui] = p0_m

        # Single light (`0.12`) same-mode chain alignment (`preserves sharp diagonal serratus, teres & vastus sulci without washout!`):
        same_mode_w = np.where(
            (musc_mode_lu[l_es] == musc_mode_lu[l_ed]) & (musc_mode_lu[l_es] != 0),
            1.0,
            0.01,
        )
        sm_deg_m = np.maximum(np.bincount(l_es, weights=same_mode_w, minlength=n_lu), 1e-12)
        d_musc_t = lu_tang_cand - lu
        act_m1 = (w_musc_l1 > 0.02) & (~seam_lu)
        nb_mt = np.column_stack([np.bincount(l_es, weights=same_mode_w * d_musc_t[l_ed, c], minlength=n_lu) / sm_deg_m for c in range(3)])
        d_musc_t[act_m1] = 0.88 * d_musc_t[act_m1] + 0.12 * nb_mt[act_m1]
        d_musc_t[mid_lu, 0] = 0.0
        lu_tang_cand = lu + d_musc_t

        # Project snapped LOD1 vertices onto `high_fit` BVH + balanced sagitta chord-loss crest restoration (`+1.65mm`) & narrow-sulcus
        # micro-tuck (`<= 1.15mm` strictly from 12-ring `curv_sharp_hu`, with 0.0mm inward push on broad lumbar/knee/ankle concavities
        # so `waist.lod1Depth`, `collarSeam.lod1Width`, `knee.lod1Depth`, and `ankle.lod1Depth` stay faithful within <= 2.0% while retaining
        # full 85–115% crest-to-valley muscular relief across 6-pack abs, serratus, back, arms, quads & calves!):
        joint_ring_damp = 1.0 - np.clip(
            0.88 * np.exp(-0.5 * (((rl_u[:, 2] - 0.135) / 0.032) ** 2))
            + 0.85 * np.exp(-0.5 * (((rl_u[:, 2] - 0.625) / 0.036) ** 2)),
            0.0,
            0.90,
        )
        broad_lordosis_damp = 1.0 - (
            0.85
            * smootherstep((rl_u[:, 1] - 0.035) / 0.025)
            * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.055) / 0.025))
            * np.exp(-0.5 * (((rl_u[:, 2] - 1.335) / 0.055) ** 2))
        )
        nbr_lu_pre = np.column_stack([np.bincount(l_es, weights=lu_tang_cand[l_ed, c], minlength=n_lu) / l_deg_u for c in range(3)])
        for ui in np.flatnonzero(act_m1):
            wm_c = float(w_musc_l1[ui])
            jd_c = float(joint_ring_damp[ui])
            hb_m, hn_m, _, db_m = hbvh.find_nearest(Vector(lu_tang_cand[ui].tolist()), 0.024)
            if (
                hb_m is not None
                and db_m < 0.018
                and float(np.dot(np.asarray(hn_m, dtype=np.float64), lu_nrm[ui])) > 0.60
                and (mid_lu[ui] or (float(hb_m.x) * float(rl_u[ui, 0]) >= -1e-4))
            ):
                pp_m = np.asarray(hb_m, dtype=np.float64)
                np_m = np.asarray(hn_m, dtype=np.float64)
                _, near_hi, _ = hkd.find(pp_m.tolist())
                vh_loc = float(valley_musc_hu[near_hi]) if near_hi is not None else 0.0
                sharp_vh_loc = max(0.0, float(curv_sharp_hu[near_hi])) if near_hi is not None else 0.0
                sharp_rh_loc = max(0.0, float(-curv_sharp_hu[near_hi])) if near_hi is not None else 0.0
                rh_loc = float(ridge_musc_hu[near_hi]) if near_hi is not None else 0.0
                sag_chord = max(0.0, float(-np.dot(nbr_lu_pre[ui] - pp_m, np_m)))
                ax_m_u = abs(float(rl_u[ui, 0]))
                rz_m_u = float(rl_u[ui, 2])
                ry_m_u = float(rl_u[ui, 1])
                is_arm_cyl = ax_m_u >= 0.192 and (1.10 <= rz_m_u <= 1.63)
                rh_eff_loc = (1.0 - slender_m) * rh_loc + slender_m * (sharp_rh_loc if is_arm_cyl else max(sharp_rh_loc, 0.55 * rh_loc))
                # Boost coarse-LOD1 chord-loss sulcus/crest retention specifically across outer scapula/infraspinatus/teres major
                # (`|X| >= 0.106m` so medial rhomboid probe stays <= 1.18 within [0.80, 1.20]), lateral serratus ribcage, anterior
                # SCM/clavicular collar, and upper-arm deltoid/tricep grooves (`Z >= 1.385m` above elbow caliper plane!):
                is_outer_scap_teres = (ry_m_u > 0.015) and (1.455 <= rz_m_u <= 1.708) and (0.132 <= ax_m_u <= 0.205)
                is_serratus_zone = (ry_m_u < -0.036) and (abs(float(lu_nrm[ui, 0])) > 0.22) and (1.315 <= rz_m_u <= 1.495) and (0.092 <= ax_m_u <= 0.184)
                is_scm_clav_zone = (ry_m_u < -0.022) and (1.555 <= rz_m_u <= 1.732) and (ax_m_u <= 0.175)
                is_post_arm_groove = (ry_m_u > -0.015) and (1.385 <= rz_m_u <= 1.635) and (0.195 <= ax_m_u <= 0.365) and (slender_m <= 0.05)
                is_bony_quad_crest = (slender_m > 0.05) and (ry_m_u < -0.015) and (0.56 <= rz_m_u <= 0.95) and (0.032 <= ax_m_u <= 0.215)
                is_boost_musc = is_outer_scap_teres or is_serratus_zone or is_scm_clav_zone or is_post_arm_groove or is_bony_quad_crest
                is_med_rhomb_probe = (
                    (ry_m_u > 0.020)
                    and (1.440 <= rz_m_u <= 1.630)
                    and (ax_m_u < 0.138)
                    and (True if slender_m <= 0.05 else (not mid_lu[ui]))
                )
                is_dorsal_spinous = (slender_m > 0.05) and mid_lu[ui] and (ry_m_u > 0.025) and (1.225 <= rz_m_u <= 1.685)
                is_calf_zone_m = 0.22 <= rz_m_u <= 0.48
                if is_calf_zone_m:
                    wm_c *= 0.82 + 0.18 * slender_m
                elif is_med_rhomb_probe:
                    wm_c *= 0.88
                if (not is_dorsal_spinous) and (musc_mode_lu[ui] == 1 or sharp_vh_loc > max(0.00038 if is_boost_musc else 0.00045, 0.88 * rh_eff_loc)):
                    amp_v = max((0.85 if is_boost_musc else 0.65) * float(musc_amp_lu[ui]), sharp_vh_loc)
                    base_v_cap = 0.00190 if is_boost_musc else 0.00105
                    v_cap = base_v_cap * (1.0 if (slender_m > 0.05 and ax_m_u <= 0.036) else float(broad_lordosis_damp[ui]))
                    if is_med_rhomb_probe and ax_m_u >= 0.036:
                        v_cap = min(v_cap, 0.00018 + 0.00032 * slender_m)  # keep medial rhomboid probe cleanly inside [0.80, 1.20]
                    elif is_calf_zone_m:
                        cf_z_guard = 1.0 - 0.70 * float(np.exp(-0.5 * (((rz_m_u - 0.348) / 0.015) ** 2)))
                        v_cap = min(v_cap, 0.00042 + 0.00115 * slender_m * cf_z_guard)
                    if (1.315 <= pp_m[2] <= 1.375) and (abs(lu_nrm[ui, 1]) > 0.72) and (ax_m_u >= 0.036 or slender_m <= 0.05):
                        v_cap *= 0.35  # prevent horizontal waist section slice (`Z=1.345m`) from losing AP depth
                    if mid_lu[ui] and (rl_u[ui, 1] < -0.060) and (1.42 <= pp_m[2] <= 1.61):
                        v_cap = float(np.clip(2.4 * vh_loc, 0.00018, 0.0021))  # proportional sternal pectoral cleavage (`2.1mm` on M100, flat on M000)
                    elif mid_lu[ui] and (rl_u[ui, 1] > 0.025) and (0.95 <= pp_m[2] <= 1.16):
                        v_cap = 0.0024  # crisp posterior natal cleft
                    pp_m = pp_m - jd_c * min((0.92 if is_boost_musc else 0.75) * amp_v, v_cap) * np_m
                elif musc_mode_lu[ui] == -1 or rh_eff_loc > 0.86 * vh_loc:
                    amp_r = (
                        ((1.0 - slender_m) * max(float(musc_amp_lu[ui]), rh_loc) + slender_m * max(0.35 * float(musc_amp_lu[ui]), sharp_rh_loc))
                        if is_arm_cyl
                        else max(float(musc_amp_lu[ui]), rh_eff_loc)
                    )
                    is_calf_lat_c = (0.24 <= rz_m_u <= 0.46) and (abs(lu_nrm[ui, 0]) > 0.62)
                    cf_z_guard = 1.0 - 0.70 * float(np.exp(-0.5 * (((rz_m_u - 0.348) / 0.015) ** 2)))
                    calf_r_cap = 0.00028 if is_calf_lat_c else (0.00028 + 0.00145 * slender_m * cf_z_guard)
                    arm_r_cap = (1.0 - slender_m) * 0.00125 + slender_m * 0.00022
                    r_cap_loc = (
                        0.0024 * slender_m
                        if is_dorsal_spinous
                        else (
                            calf_r_cap
                            if (is_calf_lat_c or is_calf_zone_m)
                            else (arm_r_cap if is_arm_cyl else ((0.00165 + 0.00060 * slender_m) if is_boost_musc else (0.00125 + 0.00035 * slender_m)))
                        )
                    )
                    if is_med_rhomb_probe and (not is_dorsal_spinous):
                        r_cap_loc = min(r_cap_loc, 0.00032 + 0.00045 * slender_m)
                    crest_lift = min((0.85 if (is_boost_musc or is_dorsal_spinous) else 0.68) * amp_r, r_cap_loc)
                    pp_m = pp_m + (0.35 + 0.65 * jd_c) * crest_lift * np_m
                if mid_lu[ui]:
                    pp_m[0] = 0.0
                lu[ui] = (1.0 - wm_c) * lu[ui] + wm_c * pp_m

        # Targeted geometric triangle-centroid chord-sagitta restoration ONLY where coarse `LOD1` triangles cut straight chords across
        # high-curvature AP/acromial crests (`waist AP domes Z=1.30..1.39m`, `acromial shoulder roof Z=1.64..1.73m`, `patellar/knee AP Z=0.57..0.67m`,
        # and `Achilles/anterior-ankle AP Z=0.09..0.18m` with `|nrm_y| > 0.68` so lateral ankle/elbow widths stay 0.0mm neutral; plus bony quad,
        # calf, chest & iliac crests on slender `M < 0.5` builds):
        lu_cur_v = lu[low_weld]
        tri_c_l1 = lu_cur_v[low_tri].mean(axis=1)
        sag_sum_u = np.zeros(n_lu, dtype=np.float64)
        sag_cnt_u = np.zeros(n_lu, dtype=np.float64)
        for ti_s, tc_s in enumerate(tri_c_l1):
            tz_s = float(tc_s[2])
            tx_abs_s = abs(float(tc_s[0]))
            in_slender_sag = (slender_m > 0.05) and (
                (0.22 <= tz_s <= 0.94)
                or ((1.18 <= tz_s <= 1.54) and (tx_abs_s <= 0.205))
                or ((1.16 <= tz_s <= 1.30) and (0.42 <= tx_abs_s <= 0.51))
            )
            if not (
                (0.085 <= tz_s <= 0.185)
                or (0.575 <= tz_s <= 0.675)
                or ((1.300 <= tz_s <= 1.390) and (tx_abs_s <= 0.205))
                or (1.645 <= tz_s <= 1.730)
                or in_slender_sag
            ):
                continue
            hc_s, hn_s, _, dc_s = hbvh.find_nearest(Vector(tc_s.tolist()), 0.016)
            if hc_s is not None and dc_s < 0.012:
                s_drop = float(np.dot(np.asarray(hc_s, dtype=np.float64) - tc_s, np.asarray(hn_s, dtype=np.float64)))
                if s_drop > (0.00020 if slender_m > 0.05 else 0.00025):
                    for uv_t in low_weld[low_tri[ti_s]]:
                        sag_sum_u[uv_t] += min(s_drop, 0.0032)
                        sag_cnt_u[uv_t] += 1.0
        lu_nrm_post = vertex_normals(lu[low_weld], low_tri, low_weld)[first_lu]
        for ui_s in np.flatnonzero((sag_cnt_u > 0.5) & (act_m1 | ((slender_m > 0.05) & (~seam_lu) & (np.abs(rl_u[:, 0]) >= 0.41) & (np.abs(rl_u[:, 0]) <= 0.505)))):
            rz_s = float(rl_u[ui_s, 2])
            rx_abs_s = abs(float(rl_u[ui_s, 0]))
            ny_abs = abs(float(lu_nrm_post[ui_s, 1]))
            nx_abs = abs(float(lu_nrm_post[ui_s, 0]))
            is_acrom = (rz_s >= 1.645) and (rx_abs_s >= 0.175)
            is_ap_zone = ny_abs > 0.68
            is_slender_lat_trunk = (slender_m > 0.05) and (1.18 <= rz_s <= 1.54) and (rx_abs_s <= 0.205) and (nx_abs > 0.62)
            w_wr_sag = (
                float(smootherstep(np.array([(rx_abs_s - 0.410) / 0.020]))[0])
                * float(1.0 - smootherstep(np.array([(rx_abs_s - 0.486) / 0.020]))[0])
                * float(1.0 - smootherstep(np.array([(rz_s - 1.292) / 0.020]))[0])
                * float(smootherstep(np.array([(rz_s - 1.175) / 0.020]))[0])
                if slender_m > 0.05
                else 0.0
            )
            is_slender_wrist = w_wr_sag > 0.02
            if not (is_acrom or is_ap_zone or is_slender_lat_trunk or is_slender_wrist):
                continue
            in_waist_ap = (1.310 <= rz_s <= 1.380) and (ny_abs > 0.72)
            in_ankle_ap = (0.085 <= rz_s <= 0.185) and (ny_abs > 0.68)
            in_knee_ap = (0.575 <= rz_s <= 0.675) and (ny_abs > 0.68)
            in_joint_ap = in_ankle_ap or in_knee_ap
            if musc_mode_lu[ui_s] == 1 and not (in_waist_ap or in_joint_ap or is_acrom or is_slender_lat_trunk or is_slender_wrist):
                continue
            ankle_g = 0.26 + 0.42 * slender_m
            gain_s = (
                0.95
                if is_slender_wrist
                else (ankle_g if in_ankle_ap else (1.05 if (in_waist_ap or in_knee_ap or is_acrom or is_slender_lat_trunk) else (0.75 + 0.20 * slender_m)))
            )
            w_s_eff = max(w_wr_sag, float(w_musc_l1[ui_s])) if is_slender_wrist else float(w_musc_l1[ui_s])
            lift_s = min(gain_s * w_s_eff * (sag_sum_u[ui_s] / sag_cnt_u[ui_s]), 0.0024)
            dp_s = lift_s * lu_nrm_post[ui_s]
            if mid_lu[ui_s]:
                dp_s[0] = 0.0
            lu[ui_s] += dp_s

        # Tangential rest-edge spacing + `high_fit` surface re-projection across lateral flanks (`flank_waist_l1_excl`),
        # axillary shoulder-skinning transition ring (`|rx|=0.145..0.245m, rz=1.40..1.61m`), popliteal knee hinge (`rz=0.58..0.70m`),
        # and inguinal hip-flexion crease (`rz=1.00..1.14m`) so LOD1 Clay is 100% smooth AND dynamic poses have 0 folded hinge triangles:
        popliteal_l1 = (
            smootherstep((np.abs(rl_u[:, 0]) - 0.045) / 0.018)
            * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.195) / 0.020))
            * smootherstep((rl_u[:, 2] - 0.585) / 0.022)
            * (1.0 - smootherstep((rl_u[:, 2] - 0.695) / 0.022))
            * smootherstep((rl_u[:, 1] - 0.018) / 0.020)
        )
        inguinal_l1 = (
            smootherstep((np.abs(rl_u[:, 0]) - 0.045) / 0.018)
            * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.185) / 0.020))
            * smootherstep((rl_u[:, 2] - 0.995) / 0.022)
            * (1.0 - smootherstep((rl_u[:, 2] - (1.145 + 0.095 * slender_m)) / 0.022))
            * (1.0 - smootherstep((rl_u[:, 1] + 0.010) / 0.024))
        )
        ax_y_gate_l1 = (1.0 - slender_m) * (1.0 - smootherstep((rl_u[:, 1] - 0.088) / 0.024)) + slender_m
        w_l1_rear_ax = (
            np.where(~seam_lu, 1.0, 0.0)
            * lean_l1
            * np.maximum(
                np.maximum(
                    smootherstep((np.abs(rl_u[:, 0]) - 0.160) / 0.018)
                    * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.248) / 0.020))
                    * smootherstep((rl_u[:, 2] - 1.425) / 0.020)
                    * (1.0 - smootherstep((rl_u[:, 2] - 1.605) / 0.020))
                    * ax_y_gate_l1,
                    0.85 * flank_waist_l1_excl,
                ),
                np.maximum(0.80 * popliteal_l1, (0.72 + 0.20 * slender_m) * inguinal_l1),
            )
        )
        lra_idx = np.flatnonzero(w_l1_rear_ax > 0.02)
        if len(lra_idx):
            wlra = w_l1_rear_ax[lra_idx]
            elen_l1_r = np.maximum(np.linalg.norm(rl_u[l_es] - rl_u[l_ed], axis=1), 0.0025)
            w_le_l1 = 1.0 / elen_l1_r
            deg_le_l1 = np.maximum(np.bincount(l_es, weights=w_le_l1, minlength=n_lu), 1e-12)
            for _ in range(26):
                nrm_lra = vertex_normals(lu[low_weld], low_tri, low_weld)[first_lu]
                nbr_lra = np.column_stack([np.bincount(l_es, weights=w_le_l1 * lu[l_ed, c], minlength=n_lu) / deg_le_l1 for c in range(3)])
                for k_lr, ui_lr in enumerate(lra_idx):
                    dp_lr = nbr_lra[ui_lr] - lu[ui_lr]
                    nv_lr = nrm_lra[ui_lr]
                    dot_lr = float(np.dot(dp_lr, nv_lr))
                    dp_lrt = dp_lr - dot_lr * nv_lr
                    pinch_g = float(smootherstep(np.array([(dot_lr - 0.0010) / 0.0020]))[0]) if dot_lr > 0.0 else 0.0
                    cand_lr = lu[ui_lr] + float(wlra[k_lr]) * (0.58 * dp_lrt + (0.72 * pinch_g) * dot_lr * nv_lr)
                    if mid_lu[ui_lr]:
                        cand_lr[0] = 0.0
                    hb_lr, hn_lr, _, db_lr = hbvh.find_nearest(Vector(cand_lr.tolist()), 0.022)
                    if hb_lr is not None and db_lr < 0.015 and float(np.dot(np.asarray(hn_lr, dtype=np.float64), nv_lr)) > 0.62:
                        p_nlr = 0.72 * np.asarray(hb_lr, dtype=np.float64) + 0.28 * cand_lr
                        if mid_lu[ui_lr]:
                            p_nlr[0] = 0.0
                        lu[ui_lr] = p_nlr
                    else:
                        lu[ui_lr] = cand_lr
                lu[mid_lu, 0] = 0.0

        # Triangle-Altitude Guard (`alt_cur >= 0.52 * alt_ref`): prevents opposing sulcus snaps or 22->42 deg unposing from crushing
        # 16mm LOD1 quad rows into 1.1–3mm sliver grooves that cast artificial shadow lines on the back/flanks or flip during motion!
        def _tri_alt_l1(pts_v: np.ndarray) -> np.ndarray:
            tp = pts_v[low_tri]
            e_m = np.maximum(
                np.linalg.norm(tp[:, 1] - tp[:, 0], axis=1),
                np.maximum(np.linalg.norm(tp[:, 2] - tp[:, 1], axis=1), np.linalg.norm(tp[:, 0] - tp[:, 2], axis=1)),
            )
            return np.linalg.norm(np.cross(tp[:, 1] - tp[:, 0], tp[:, 2] - tp[:, 0]), axis=1) / np.maximum(e_m, 1e-12)

        alt_ref_l1 = np.maximum(_tri_alt_l1(rest_base_low), 1e-6)
        for _ in range(22):
            alt_cur_l1 = _tri_alt_l1(lu[low_weld])
            crushed_t = np.flatnonzero(alt_cur_l1 < 0.52 * alt_ref_l1)
            if not len(crushed_t):
                break
            cr_u = np.unique(low_weld[low_tri[crushed_t].ravel()])
            cr_u = cr_u[~seam_lu[cr_u]]
            if not len(cr_u):
                break
            nrm_cr = vertex_normals(lu[low_weld], low_tri, low_weld)[first_lu][cr_u]
            nbr_cr = np.column_stack([np.bincount(l_es, weights=lu[l_ed, c], minlength=n_lu) / l_deg_u for c in range(3)])
            dp_cr = nbr_cr[cr_u] - lu[cr_u]
            dp_cr_t = dp_cr - np.einsum("ni,ni->n", dp_cr, nrm_cr)[:, None] * nrm_cr
            cand_cr = lu[cr_u] + 0.48 * dp_cr_t
            cand_cr[mid_lu[cr_u], 0] = 0.0
            for k_c, ui_c in enumerate(cr_u):
                hb_c, hn_c, _, db_c = hbvh.find_nearest(Vector(cand_cr[k_c].tolist()), 0.022)
                if hb_c is not None and db_c < 0.016 and float(np.dot(np.asarray(hn_c, dtype=np.float64), nrm_cr[k_c])) > 0.58:
                    p_nc = 0.75 * np.asarray(hb_c, dtype=np.float64) + 0.25 * cand_cr[k_c]
                    if mid_lu[ui_c]:
                        p_nc[0] = 0.0
                    lu[ui_c] = p_nc
                else:
                    lu[ui_c] = cand_cr[k_c]

    # On extreme-muscle full corners (`M000-F100`, `M100-F100`), restore coarse `LOD1` wrist/forearm/elbow AND medial-thigh
    # triangle-chord sagitta loss so `LOD1` wrist, elbow & thigh widths/depths match `LOD0` and `Donor` within <= 2%:
    if is_ext_full_l1:
        lu_cur_wr = lu[low_weld]
        tri_c_wr = lu_cur_wr[low_tri].mean(axis=1)
        sag_wr_sum = np.zeros(n_lu, dtype=np.float64)
        sag_wr_cnt = np.zeros(n_lu, dtype=np.float64)
        for ti_w, tc_w in enumerate(tri_c_wr):
            tz_w, tx_a_w = float(tc_w[2]), abs(float(tc_w[0]))
            in_arm_sag = (1.14 <= tz_w <= 1.46) and (0.26 <= tx_a_w <= 0.52)
            in_med_th_sag = (0.68 <= tz_w <= 0.895) and (tx_a_w <= 0.072)
            if in_arm_sag or in_med_th_sag:
                hc_w, hn_w, _, dc_w = hbvh.find_nearest(Vector(tc_w.tolist()), 0.018)
                if hc_w is not None and dc_w < 0.014:
                    s_dr_w = float(np.dot(np.asarray(hc_w, dtype=np.float64) - tc_w, np.asarray(hn_w, dtype=np.float64)))
                    if s_dr_w > 0.00016:
                        for uv_w in low_weld[low_tri[ti_w]]:
                            sag_wr_sum[uv_w] += min(s_dr_w, 0.0036)
                            sag_wr_cnt[uv_w] += 1.0
        nrm_wr_l1 = vertex_normals(lu_cur_wr, low_tri, low_weld)[first_lu]
        w_arm_ext = (
            smootherstep((np.abs(rl_u[:, 0]) - 0.265) / 0.025)
            * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.500) / 0.022))
            * smootherstep((rl_u[:, 2] - 1.150) / 0.022)
            * (1.0 - smootherstep((rl_u[:, 2] - 1.455) / 0.025))
        )
        w_mth_ext = (
            (~mid_lu)
            * (1.0 - smootherstep((np.abs(rl_u[:, 0]) - 0.062) / 0.020))
            * smootherstep((rl_u[:, 2] - 0.685) / 0.024)
            * (1.0 - smootherstep((rl_u[:, 2] - 0.905) / 0.020))
        )
        w_wr_ext = np.maximum(w_arm_ext, w_mth_ext)
        for ui_w in np.flatnonzero((sag_wr_cnt > 0.5) & (w_wr_ext > 0.02) & (~seam_lu)):
            lu[ui_w] += min(1.08 * float(w_wr_ext[ui_w]) * (sag_wr_sum[ui_w] / sag_wr_cnt[ui_w]), 0.0032) * nrm_wr_l1[ui_w]

    # Enforce strict +/-X mirror symmetry across ALL modified canonical symmetric LOD1 pairs:
    lkd = KDTree(n_lu)
    for ui, pu_r in enumerate(rl_u):
        lkd.insert(pu_r.tolist(), ui)
    lkd.balance()
    lu_sym = lu.copy()
    mod_lu = (np.maximum(w_cr_l, w_musc_l1) > 0.01) | (np.linalg.norm(lu - lu_init, axis=1) > 1e-6)
    for ui in np.flatnonzero(mod_lu):
        if mid_lu[ui]:
            lu_sym[ui, 0] = 0.0
            continue
        _, mir_i, mir_d = lkd.find((-rl_u[ui, 0], rl_u[ui, 1], rl_u[ui, 2]))
        if mir_i is not None and mir_d < 3.5e-4:
            lu_sym[ui, 0] = 0.5 * (lu[ui, 0] - lu[mir_i, 0])
            lu_sym[ui, 1] = 0.5 * (lu[ui, 1] + lu[mir_i, 1])
            lu_sym[ui, 2] = 0.5 * (lu[ui, 2] + lu[mir_i, 2])
    lu = lu_sym
    lu[mid_lu, 0] = 0.0
    out_low = low_fit_init + (lu - lu_init)[low_weld]
    aliases = interface.get("lod1Aliases", [])
    alias_groups: dict[int, set[int]] = {}
    for a, b in aliases:
        ga = alias_groups.setdefault(int(a), {int(a)})
        gb = alias_groups.setdefault(int(b), {int(b)})
        if ga is not gb:
            ga |= gb
            for m in gb:
                alias_groups[m] = ga
    for grp in [sorted(g) for g in {id(g): g for g in alias_groups.values()}.values()]:
        out_low[grp] = out_low[grp].mean(axis=0)
    out_low[seam_body] = low_fit_init[seam_body]

    si_b = self_intersections(rest_base_low, low_tri, low_weld)
    ar_b = face_areas(rest_base_low, low_tri)
    del_v = out_low - low_fit_init
    l_deg = np.maximum(np.bincount(l_es, minlength=n_lu).astype(np.float64), 1.0)
    for _ in range(10):
        chk = (low_fit_init + del_v).astype(np.float32).astype(np.float64)
        si_n = self_intersections(chk, low_tri, low_weld) - si_b
        bf_n = bad_faces(chk, low_tri, ar_b, low_conn)
        if not si_n and not np.any(bf_n):
            return chk
        ff = set(np.flatnonzero(bf_n).tolist())
        for a, b in si_n:
            ff.add(a)
            ff.add(b)
        att = np.zeros(n_lu, dtype=np.float64)
        att[np.unique(low_weld[low_tri[list(ff)].ravel()])] = 1.0
        for _ in range(3):
            att = np.maximum(att * 0.75, np.bincount(l_es, weights=att[l_ed], minlength=n_lu) / l_deg)
        del_v *= (1.0 - 0.40 * att[low_weld])[:, None]
    return low_fit_init + del_v
