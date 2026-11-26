#!/usr/bin/env python3
"""Donor-correspondence high-cut linen briefs (`linenBriefs`) bound to canonical `bodySkin` (`LOD1`).

Fits the structured `(nx=49, nv=19, ng=7, chc=4)` `1,869`-vertex `linenBriefs` mesh directly to
`donorLinenRimFaces` and `donorLinenFaces` (`±X`-symmetrized, excluding inner-thigh fusion webbing
and lowered A-pose arms/hands), using volume-preserving Taubin (`lambda/mu`) wrinkle relaxation so
both rear butt cheeks and the front brief cup retain smooth woven-linen form without procedural
waistband/diaper curve overrides. Also provides a clean canonical fallback on `bodySkin` (`LOD1`)
for canonical family registration and novel-pose checks via `scripts/art/people.py`.
"""
from __future__ import annotations

from collections import deque
import copy
import hashlib
import json
import os
from pathlib import Path
import sys

sys.dont_write_bytecode = True

from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np

from mesh_rig_utils import (
    blender_to_gltf,
    gltf_to_blender,
    self_intersections,
    smootherstep,
    vertex_normals,
    weld_connectivity,
)

PACKAGE_DIR = Path(__file__).resolve().parent
if str(PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PACKAGE_DIR))

from runtime_env import ART_SCRIPTS_DIR as REPO_ART_SCRIPTS, get_transfer_cache_dir, load_foundation_manifest  # noqa: E402

import people as ol_people  # noqa: E402


def _eval_brief_level_set_bl(pts_bl: np.ndarray) -> np.ndarray:
    """Signed level-set `phi(v)` (`> 0` inside canonical baseline briefs) in Blender Z-up metres."""
    x, y, z = pts_bl.T
    ax = np.abs(x)
    s_back = smootherstep((y + 0.035) / 0.070)

    z_waist_front = 1.135 + 0.040 * smootherstep((ax - 0.010) / 0.152)
    z_waist_back = 1.205 - 0.018 * smootherstep((ax - 0.115) / 0.055)
    z_waist = (1.0 - s_back) * z_waist_front + s_back * z_waist_back

    t_f1 = np.clip((ax - 0.024) / 0.140, 0.0, 1.0)
    z_leg_front = 0.968 + 0.178 * (0.55 * t_f1 + 0.45 * smootherstep(t_f1))

    t_b1 = np.clip((ax - 0.026) / 0.140, 0.0, 1.0)
    z_leg_back = 0.970 + 0.176 * (t_b1 ** 1.05)

    z_leg = (1.0 - s_back) * z_leg_front + s_back * z_leg_back
    d_top = z_waist - z
    d_bot = z - z_leg
    k_sm = 0.006
    phi_pelvis = 0.5 * (d_top + d_bot - np.sqrt((d_top - d_bot) ** 2 + k_sm * k_sm))
    return np.where(ax <= 0.235, phi_pelvis, -0.25)


def linen_briefs_mirror_map(n_v: int, ref_pts: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Return exact topological `(mid_v, mir_v)` for the structured `(nx=49, nv=19, ng=7, chc=4)` `1,869`-vertex
    `linenBriefs` mesh (`guarantees narrow hourglass gusset boundary vertices NEVER snap to X=0 midline`).
    """
    if n_v == 1869:
        mid_v = np.zeros(n_v, dtype=bool)
        mir_v = np.arange(n_v, dtype=np.int64)
        for iv in range(19):
            mir_v[2 * iv] = 2 * iv + 1
            mir_v[2 * iv + 1] = 2 * iv
        for base in (38, 931):
            for ix in range(1, 48):
                ix_m = 48 - ix
                for iv in range(19):
                    u = base + (ix - 1) * 19 + iv
                    v = base + (ix_m - 1) * 19 + iv
                    mir_v[u] = v
                    if ix == 24:
                        mid_v[u] = True
        for ci in range(9):
            ci_m = 8 - ci
            for k in range(5):
                u = 1824 + ci * 5 + k
                v = 1824 + ci_m * 5 + k
                mir_v[u] = v
                if ci == 4:
                    mid_v[u] = True
        return mid_v, mir_v

    mid_v = np.abs(ref_pts[:, 0]) <= 3.0e-4
    mir_v = np.arange(n_v, dtype=np.int64)
    non_mid = np.flatnonzero(~mid_v)
    if len(non_mid):
        nm_pts = ref_pts[non_mid]
        for i in non_mid:
            p_m = np.array([-ref_pts[i, 0], ref_pts[i, 1], ref_pts[i, 2]])
            d2 = np.sum((nm_pts - p_m[None, :]) ** 2, axis=1)
            jb = int(np.argmin(d2))
            if d2[jb] < 2.5e-4:
                mir_v[int(i)] = int(non_mid[jb])
    return mid_v, mir_v


def _symmetrize_brief_pts(
    pts: np.ndarray,
    mid_v: np.ndarray,
    mir_v: np.ndarray,
    sgn_v: np.ndarray,
    min_x: float = 0.0022,
) -> np.ndarray:
    """Enforce exact `+-X` mirror symmetry and midline `X = 0` on `linenBriefs` vertices."""
    pm = pts[mir_v].copy()
    pm[:, 0] *= -1.0
    out = 0.5 * (pts + pm)
    out[mid_v, 0] = 0.0
    out[~mid_v, 0] = sgn_v[~mid_v] * np.maximum(min_x, np.abs(out[~mid_v, 0]))
    return out


def extract_clean_donor_linen_masks(
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    donor_linen_raw: np.ndarray,
    donor_bridged_thigh: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return `(main_linen_faces, rim_faces, pelvic_skin_and_linen_faces)` on `donor_tri`.

    - `main_linen_faces`: largest welded connected component of `donor_linen_raw & (~bridged_thigh)`,
      excluding downward-facing overhanging-belly roof bleed (`Z > 1.015 m`) and filling tiny enclosed
      shadow-pocket holes (`<= 450` faces).
    - `rim_faces`: triangles in `main_linen_faces` sharing a welded edge with bare skin.
    - `pelvic_skin_and_linen_faces`: 28-ring topological dilation of `main_linen_faces` within
      `Z in [0.76, 1.30] m` (`100%` free of lowered A-pose arms, wrists, and hands).
    """
    n_f = len(donor_tri)
    br = (
        np.asarray(donor_bridged_thigh, dtype=bool)
        if (donor_bridged_thigh is not None and len(donor_bridged_thigh) == n_f)
        else np.zeros(n_f, dtype=bool)
    )
    lf_in = np.asarray(donor_linen_raw, dtype=bool) & (~br)
    fc = donor_xyz[donor_tri].mean(axis=1)
    v_tri = donor_xyz[donor_tri]
    fn = np.cross(v_tri[:, 1] - v_tri[:, 0], v_tri[:, 2] - v_tri[:, 0])
    fn_len = np.linalg.norm(fn, axis=1)
    fn /= np.maximum(fn_len[:, None], 1e-12)

    f_mid_seed = lf_in & (np.abs(fc[:, 0]) <= 0.045) & (fc[:, 1] < -0.05)
    z_crease_cut = 1.022
    if np.sum(f_mid_seed) >= 20:
        # Locate the deepest inward (`max Y`) geometric sub-apron crease root so the front waistband tucks cleanly
        # into the crease underneath the overhanging stomach (`eliminating +12 mm waistband flare over the belly lip`):
        m_cr_scan = (np.abs(fc[:, 0]) <= 0.038) & (fc[:, 1] < -0.130) & (fc[:, 2] >= 0.998) & (fc[:, 2] <= 1.058) & (~br)
        if np.sum(m_cr_scan) >= 20:
            zs_cr = np.linspace(1.002, 1.054, 27)
            ys_cr = np.full_like(zs_cr, -1e9)
            for iz_c, zv_c in enumerate(zs_cr):
                mb_c = m_cr_scan & (np.abs(fc[:, 2] - zv_c) <= 0.004)
                if np.sum(mb_c) >= 4:
                    ys_cr[iz_c] = float(np.percentile(fc[mb_c, 1], 88))
            if np.max(ys_cr) > -0.50:
                z_crease_cut = float(zs_cr[int(np.argmax(ys_cr))]) + 0.003
        else:
            z_crease_cut = max(1.018, float(np.percentile(fc[f_mid_seed, 2], 78.0)) - 0.004)
        z_cut_x = z_crease_cut + 0.060 * np.clip((np.abs(fc[:, 0]) / 0.145) ** 1.75, 0.0, 1.5)
        belly_roof_bleed = (fc[:, 1] < -0.125) & (fc[:, 2] > z_cut_x) & (fn[:, 2] < -0.18)
        lf_in = lf_in & (~belly_roof_bleed)

    d_weld, _, _, _ = weld_connectivity(donor_xyz, donor_tri, decimals=5)
    wtri = d_weld[donor_tri]

    v_to_lf: dict[int, list[int]] = {}
    for fi in np.flatnonzero(lf_in):
        for v in wtri[fi]:
            v_to_lf.setdefault(int(v), []).append(int(fi))
    seen = np.zeros(n_f, dtype=bool)
    best_comp: list[int] = []
    for fi in np.flatnonzero(lf_in):
        if seen[fi]:
            continue
        comp: list[int] = []
        q = deque([int(fi)])
        seen[fi] = True
        while q:
            u = q.popleft()
            comp.append(u)
            for v in wtri[u]:
                for nb in v_to_lf.get(int(v), ()):
                    if not seen[nb]:
                        seen[nb] = True
                        q.append(nb)
        if len(comp) > len(best_comp):
            best_comp = comp

    main_lf = np.zeros(n_f, dtype=bool)
    if best_comp:
        main_lf[best_comp] = True
    else:
        main_lf[:] = lf_in

    if np.any(main_lf):
        z_lo_m = float(fc[main_lf, 2].min()) - 0.01
        z_hi_m = float(fc[main_lf, 2].max()) + 0.01
        x_hi_m = float(np.abs(fc[main_lf, 0]).max()) + 0.01
        cand_hole = (~main_lf) & (~br) & (fc[:, 2] >= z_lo_m) & (fc[:, 2] <= z_hi_m) & (np.abs(fc[:, 0]) <= x_hi_m)
        v_to_ch: dict[int, list[int]] = {}
        for fi in np.flatnonzero(cand_hole):
            for v in wtri[fi]:
                v_to_ch.setdefault(int(v), []).append(int(fi))
        seen_h = np.zeros(n_f, dtype=bool)
        for fi in np.flatnonzero(cand_hole):
            if seen_h[fi]:
                continue
            comp_h: list[int] = []
            q_h = deque([int(fi)])
            seen_h[fi] = True
            too_big = False
            while q_h:
                u = q_h.popleft()
                comp_h.append(u)
                if len(comp_h) > 450:
                    too_big = True
                for v in wtri[u]:
                    for nb in v_to_ch.get(int(v), ()):
                        if not seen_h[nb]:
                            seen_h[nb] = True
                            q_h.append(nb)
            if not too_big and len(comp_h) <= 450:
                z_cut_h = z_crease_cut + 0.060 * np.clip((np.abs(fc[comp_h, 0]) / 0.145) ** 1.75, 0.0, 1.5)
                if not np.any((fc[comp_h, 1] < -0.125) & (fc[comp_h, 2] > z_cut_h) & (fn[comp_h, 2] < -0.18)):
                    main_lf[comp_h] = True

    edge_lf: dict[tuple[int, int], list[int]] = {}
    edge_skin: set[tuple[int, int]] = set()
    for fi in range(n_f):
        if br[fi] or fn_len[fi] <= 1e-12:
            continue
        a, b, c_i = int(wtri[fi, 0]), int(wtri[fi, 1]), int(wtri[fi, 2])
        for u, v in ((a, b), (b, c_i), (c_i, a)):
            ek = (min(u, v), max(u, v))
            if main_lf[fi]:
                edge_lf.setdefault(ek, []).append(fi)
            else:
                edge_skin.add(ek)
    rim_faces = np.zeros(n_f, dtype=bool)
    for ek, fis in edge_lf.items():
        if ek in edge_skin:
            for fi in fis:
                rim_faces[fi] = True

    in_z_band = (~br) & (fn_len > 1e-12) & (fc[:, 2] >= 0.76) & (fc[:, 2] <= 1.30)
    pelvic_faces = main_lf.copy()
    active_v = np.zeros(int(d_weld.max()) + 1, dtype=bool)
    if np.any(pelvic_faces):
        active_v[wtri[pelvic_faces].ravel()] = True
        for _ in range(28):
            grow = in_z_band & (~pelvic_faces) & np.any(active_v[wtri], axis=1)
            if not np.any(grow):
                break
            pelvic_faces |= grow
            active_v[wtri[grow].ravel()] = True
    else:
        pelvic_faces = in_z_band & (np.abs(fc[:, 0]) <= 0.24)

    return main_lf, rim_faces, pelvic_faces


def _taubin_relax_grid(
    G_in: np.ndarray,
    n_iters: int,
    lam: float,
    mu: float,
    mid_ix: int,
    clip_m: float,
) -> np.ndarray:
    """Volume-preserving Taubin (`lambda / mu`) wrinkle relaxation on a `(nx, nv, 3)` panel grid
    so convex butt cheeks and the convex front cup NEVER shrink inward under smoothing.
    """
    G = G_in.copy()
    G_ref = G_in.copy()
    for _ in range(n_iters):
        for step_w in (lam, mu):
            nxt = G.copy()
            lap = 0.25 * (G[:-2, 1:-1] + G[2:, 1:-1] + G[1:-1, :-2] + G[1:-1, 2:]) - G[1:-1, 1:-1]
            nxt[1:-1, 1:-1] = G[1:-1, 1:-1] + step_w * lap
            lap_b = 0.5 * (G[:-2, 0] + G[2:, 0]) - G[1:-1, 0]
            lap_t = 0.5 * (G[:-2, -1] + G[2:, -1]) - G[1:-1, -1]
            nxt[1:-1, 0] = G[1:-1, 0] + (0.65 * step_w) * lap_b
            nxt[1:-1, -1] = G[1:-1, -1] + (0.65 * step_w) * lap_t
            nxt[0] = G_ref[0]
            nxt[-1] = G_ref[-1]
            nxt[mid_ix, :, 0] = 0.0
            for ks in range(1, mid_ix):
                xm = 0.5 * (nxt[mid_ix + ks, :, 0] - nxt[mid_ix - ks, :, 0])
                ym = 0.5 * (nxt[mid_ix + ks, :, 1] + nxt[mid_ix - ks, :, 1])
                zm = 0.5 * (nxt[mid_ix + ks, :, 2] + nxt[mid_ix - ks, :, 2])
                nxt[mid_ix + ks, :, 0], nxt[mid_ix - ks, :, 0] = xm, -xm
                nxt[mid_ix + ks, :, 1], nxt[mid_ix - ks, :, 1] = ym, ym
                nxt[mid_ix + ks, :, 2], nxt[mid_ix - ks, :, 2] = zm, zm
            G = nxt
        dG = G - G_ref
        dG_n = np.linalg.norm(dG, axis=2, keepdims=True)
        G = G_ref + np.where(dG_n > clip_m, dG * (clip_m / np.maximum(dG_n, 1e-12)), dG)
    return G


def fit_linen_briefs_to_donor_posed(
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    donor_linen_faces: np.ndarray,
    donor_linen_rim_faces: np.ndarray | None = None,
    donor_bridged_thigh_faces: np.ndarray | None = None,
    adipose_gate: float = 0.0,
    muscle_gate: float = 0.5,
) -> tuple[np.ndarray, np.ndarray, dict]:
    """Fit canonical `1,869`-vertex `linenBriefs` directly to `donorLinenRimFaces` + `donorLinenFaces`
    in Posed Donor space (`100% arm-free pelvic BVH, ±X-symmetrized, volume-preserving Taubin wrinkle relaxation`).
    """
    n_f = len(donor_tri)
    br = (
        np.asarray(donor_bridged_thigh_faces, dtype=bool)
        if (donor_bridged_thigh_faces is not None and len(donor_bridged_thigh_faces) == n_f)
        else np.zeros(n_f, dtype=bool)
    )
    main_lf, rim_lf, pelvic_faces = extract_clean_donor_linen_masks(donor_xyz, donor_tri, donor_linen_faces, br)
    _ = (donor_linen_rim_faces, muscle_gate)

    bvh_pel = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[pelvic_faces].tolist(), all_triangles=True)
    bvh_lf_only = BVHTree.FromPolygons(donor_xyz.tolist(), donor_tri[main_lf].tolist(), all_triangles=True)
    fc_lf = donor_xyz[donor_tri[main_lf]].mean(axis=1)
    ad_g = float(np.clip(adipose_gate, 0.0, 1.0))

    # 1) Measure bridge-free `±X`-symmetrized Donor perineal crotch saddle `z_crotch_don(y)`:
    y_sad = np.linspace(-0.220, 0.100, 49)
    z_sad = np.full_like(y_sad, np.nan)
    for yi, y_p in enumerate(y_sad):
        zh_list = []
        for x_p in (-0.012, -0.006, 0.0, 0.006, 0.012):
            rh, rn, _, _ = bvh_pel.ray_cast(Vector((float(x_p), float(y_p), 0.76)), Vector((0.0, 0.0, 1.0)), 0.38)
            if rh is not None and 0.845 <= float(rh.z) <= 1.06 and float(rn.z) < -0.15:
                zh_list.append(float(rh.z))
        if zh_list:
            z_sad[yi] = float(np.median(zh_list))
    ok_zs = np.isfinite(z_sad)
    for yi in np.flatnonzero(ok_zs):
        lo_w, hi_w = max(0, int(yi) - 5), min(len(y_sad), int(yi) + 6)
        loc_v = z_sad[lo_w:hi_w][np.isfinite(z_sad[lo_w:hi_w])]
        if len(loc_v) >= 3 and z_sad[yi] < float(np.percentile(loc_v, 75)) - 0.022:
            ok_zs[yi] = False
    if int(np.sum(ok_zs)) < 4:
        ok_zs = np.isfinite(z_sad)
    z_crotch_don = np.interp(y_sad, y_sad[ok_zs], z_sad[ok_zs])
    for _ in range(5):
        z_crotch_don[1:-1] = 0.25 * z_crotch_don[:-2] + 0.50 * z_crotch_don[1:-1] + 0.25 * z_crotch_don[2:]
    z_cr_min = float(np.min(z_crotch_don[(y_sad >= -0.145) & (y_sad <= 0.045)]))

    m_tgap = (
        (np.abs(donor_xyz[:, 1]) < 0.035)
        & (donor_xyz[:, 2] >= 0.89)
        & (donor_xyz[:, 2] <= 0.96)
        & (np.abs(donor_xyz[:, 0]) < 0.085)
    )
    tgap_x = float(np.min(np.abs(donor_xyz[m_tgap, 0]))) if np.any(m_tgap) else 0.008

    # 2) Cylindrical `(phi, z)` rim curves around internal torso axis `(0, y_cyl, z)` from `donorLinenFaces`:
    y_cyl = float(np.median(fc_lf[:, 1]))
    dx_lf = np.abs(fc_lf[:, 0])
    dy_lf = fc_lf[:, 1] - y_cyl
    phi_lf = np.arctan2(dx_lf, -dy_lf)
    r_cyl_lf = np.hypot(dx_lf, dy_lf)
    r_p75 = float(np.percentile(r_cyl_lf, 75))

    n_phi = 73
    phi_grid = np.linspace(0.0, np.pi, n_phi)
    z_top_phi = np.full(n_phi, np.nan)
    z_bot_phi = np.full(n_phi, np.nan)
    for ip, ph_q in enumerate(phi_grid):
        win_p = 0.085
        mp_top = np.abs(phi_lf - ph_q) <= win_p
        if np.sum(mp_top) >= 8:
            # `main_lf` already stops cleanly at the true cloth-to-skin crease seam (`excluding fn_z < -0.22`
            # overhanging belly underside), so `q_top = 98.0%` seats the front waistband right in the true crease root!
            z_top_phi[ip] = float(np.percentile(fc_lf[mp_top, 2], 98.0 if ad_g > 0.20 else 98.5))
        mp_bot = mp_top & (r_cyl_lf >= 0.48 * r_p75) if (0.42 <= ph_q <= (np.pi - 0.42)) else mp_top
        if np.sum(mp_bot) >= 8:
            z_bot_phi[ip] = float(np.percentile(fc_lf[mp_bot, 2], 1.8))
    for arr_p in (z_top_phi, z_bot_phi):
        ok_p = np.isfinite(arr_p)
        arr_p[:] = np.interp(phi_grid, phi_grid[ok_p], arr_p[ok_p])
    # Enforce monotonic sub-apron/anterior waistband rise from `phi = 0` (midline) to `phi = pi/2` (lateral hip)
    # so overhanging-belly skin albedo bleed (`e.g. M000-F100`) NEVER humps the front waistband upward at `X = 0`:
    ip_hip = n_phi // 2
    for ip in range(ip_hip - 1, -1, -1):
        z_top_phi[ip] = min(float(z_top_phi[ip]), float(z_top_phi[ip + 1]))
    for arr_p in (z_top_phi, z_bot_phi):
        for _ in range(8):
            nxt_p = arr_p.copy()
            nxt_p[0] = 0.50 * arr_p[0] + 0.50 * arr_p[1]
            nxt_p[-1] = 0.50 * arr_p[-1] + 0.50 * arr_p[-2]
            nxt_p[1:-1] = 0.25 * arr_p[:-2] + 0.50 * arr_p[1:-1] + 0.25 * arr_p[2:]
            arr_p[:] = nxt_p

    nx, nv, ng, chc = 49, 19, 7, 4
    mid_ix = nx // 2
    phi_hip = 0.5 * np.pi
    z_hip_bot = float(np.interp(phi_hip, phi_grid, z_bot_phi))
    z_hip_top = float(np.interp(phi_hip, phi_grid, z_top_phi))

    def _probe_cyl_pelvis(phi_signed: float, zq_val: float, pad_m: float = 0.0016) -> np.ndarray:
        """Cast orthogonally inward toward `(0, y_cyl, zq_val)` onto arm-free `bvh_pel` (`±X`-symmetrized)."""
        aphi = abs(phi_signed)
        sgn = 1.0 if phi_signed >= 0.0 else -1.0
        ux = float(np.sin(aphi))
        uy = -float(np.cos(aphi))
        rs = []
        z_top_loc = float(np.interp(aphi, phi_grid, z_top_phi))
        for sx in ((-1.0, 1.0) if ux > 1e-4 else (1.0,)):
            orig = Vector((sx * 0.44 * ux, y_cyl + 0.44 * uy, zq_val))
            dvec = Vector((-sx * ux, -uy, 0.0))
            if ad_g > 0.20 and aphi < 1.05 and zq_val >= z_top_loc - 0.018:
                rh_l, rn_l, _, rd_l = bvh_lf_only.ray_cast(orig, dvec, 0.43)
                # Require anterior outward-facing hit (`rh_l.y < -0.14` and `dot > 0.18`) so dark inguinal shadow holes in
                # `bvh_lf_only` never hit interior/rear triangles (`preventing any front-panel split on M000-F100`):
                if rh_l is not None and rd_l is not None and float(rh_l.y) < -0.14 and (float(rn_l.x) * sx * ux + float(rn_l.y) * uy > 0.18):
                    rs.append((0.44 - float(rd_l)) + pad_m)
                    continue
            rh, _, _, rd = bvh_pel.ray_cast(orig, dvec, 0.43)
            if rh is not None and rd is not None:
                rs.append((0.44 - float(rd)) + pad_m)
        r_hit = float(np.mean(rs)) if rs else 0.14
        return np.array([sgn * r_hit * ux, y_cyl + r_hit * uy, zq_val], dtype=np.float64)

    # 3) Smooth `±X`-symmetrized polar Donor cup `R_brief(x, deg)` for central front & under-cup perineal turn:
    y_hub = -0.035
    z_hub = z_cr_min + 0.092
    x_max_approx = float(_probe_cyl_pelvis(phi_hip, 0.5 * (z_hip_bot + z_hip_top), pad_m=0.0)[0])
    nx_p, nth_p = 36, 108
    x_pg = np.linspace(0.0, min(0.145, 0.85 * x_max_approx), nx_p)
    deg_pg = np.linspace(-58.0, 135.0, nth_p)
    th_pg = np.radians(deg_pg)
    R_don = np.full((nx_p, nth_p), np.nan, dtype=np.float64)
    r_scan = np.linspace(0.035, 0.280, 72)

    for ith, (deg_v, th_v) in enumerate(zip(deg_pg, th_pg)):
        dy = -float(np.cos(th_v))
        dz = -float(np.sin(th_v))
        for ix_p, xq in enumerate(x_pg):
            phi_x = float(np.arcsin(np.clip(xq / max(x_max_approx, 0.12), 0.0, 1.0)))
            z_ceil_f = float(np.interp(phi_x, phi_grid, z_top_phi)) + (0.004 if ad_g > 0.20 else 0.022)
            if deg_v <= 76.0:
                rs_lr = []
                for sx in ((-1.0, 1.0) if xq > 1e-5 else (1.0,)):
                    orig = Vector((sx * float(xq), y_hub + 0.40 * dy, z_hub + 0.40 * dz))
                    dvec = Vector((0.0, -dy, -dz))
                    rh, rn, _, _ = bvh_pel.ray_cast(orig, dvec, 0.38)
                    if rh is not None and float(rh.z) >= z_cr_min - 0.003 and float(rh.z) <= z_ceil_f:
                        if ad_g > 0.20 and float(rh.z) > z_ceil_f - 0.016 and float(rn.z) < -0.35:
                            rh_l, rn_l, _, _ = bvh_lf_only.ray_cast(orig, dvec, 0.38)
                            if rh_l is not None and (float(rn_l.y) * dy + float(rn_l.z) * dz > 0.10):
                                rh, rn = rh_l, rn_l
                            else:
                                continue
                        if deg_v <= 60.0 and xq <= 0.060 and float(rh.y) > -0.065:
                            continue
                        if float(rn.y) * dy + float(rn.z) * dz > 0.10:
                            r_hit = (float(rh.y) - y_hub) * dy + (float(rh.z) - z_hub) * dz
                            if 0.035 <= r_hit <= 0.330:
                                rs_lr.append(r_hit)
                if rs_lr:
                    R_don[ix_p, ith] = float(np.mean(rs_lr))
            if np.isnan(R_don[ix_p, ith]) and deg_v >= 40.0 and xq <= 0.058:
                y_ray = y_hub + r_scan * dy
                z_ray = z_hub + r_scan * dz
                arch_k = 0.0025 if (tgap_x > 0.016 or ad_g > 0.20) else 0.0055
                z_arch = np.interp(y_ray, y_sad, z_crotch_don) + arch_k * ((xq / 0.045) ** 2)
                diff_z = z_ray - z_arch
                cross = np.flatnonzero((diff_z[:-1] >= 0.0) & (diff_z[1:] <= 0.0))
                if len(cross):
                    k0 = int(cross[0])
                    tc = float(diff_z[k0]) / max(float(diff_z[k0] - diff_z[k0 + 1]), 1e-8)
                    R_don[ix_p, ith] = float((1.0 - tc) * r_scan[k0] + tc * r_scan[k0 + 1])

    for ix_p in range(nx_p):
        ok_t = np.flatnonzero(np.isfinite(R_don[ix_p]))
        if len(ok_t):
            R_don[ix_p] = np.interp(deg_pg, deg_pg[ok_t], R_don[ix_p, ok_t])
    for ith in range(nth_p):
        ok_x = np.isfinite(R_don[:, ith])
        if np.any(ok_x):
            R_don[:, ith] = np.interp(x_pg, x_pg[ok_x], R_don[ok_x, ith])

    R_sm = R_don.copy()
    it_ant = np.flatnonzero((deg_pg >= -55.0) & (deg_pg <= 66.0))
    it_ant = it_ant[(it_ant >= 1) & (it_ant <= nth_p - 2)]
    for _ in range(7 if ad_g > 0.20 else 6):
        for step_w in (0.34, -0.35):
            rx = R_sm.copy()
            rx[0, :] = R_sm[0, :] + step_w * (R_sm[1, :] - R_sm[0, :])
            rx[1:-1, :] = R_sm[1:-1, :] + step_w * (0.5 * (R_sm[:-2, :] + R_sm[2:, :]) - R_sm[1:-1, :])
            rz = rx.copy()
            rz[:, it_ant] = rx[:, it_ant] + step_w * (0.5 * (rx[:, it_ant - 1] + rx[:, it_ant + 1]) - rx[:, it_ant])
            R_sm = rz

    cup_boost = 0.0020 if ad_g > 0.20 else (0.0024 if tgap_x > 0.016 else 0.0020)
    w_th_cup = smootherstep((deg_pg + 8.0) / 18.0) * (1.0 - smootherstep((deg_pg - 36.0) / 16.0))
    r_cup_w = 0.055 if ad_g > 0.20 else 0.048
    w_x_cup = smootherstep(np.clip(1.0 - (x_pg / r_cup_w) ** 2, 0.0, 1.0) / 0.75)
    R_brief = R_sm + cup_boost * (w_x_cup[:, None] * w_th_cup[None, :]) + 0.0015

    def _eval_front_polar(xq_val: float, deg_val: float) -> tuple[float, float]:
        fx = float(np.clip(abs(xq_val) / float(x_pg[1] - x_pg[0]), 0.0, float(nx_p - 1) - 1e-6))
        ft = float(np.clip((deg_val - float(deg_pg[0])) / float(deg_pg[1] - deg_pg[0]), 0.0, float(nth_p - 1) - 1e-6))
        i0, j0 = int(fx), int(ft)
        tx, tt = fx - i0, ft - j0
        rv = (1.0 - tx) * ((1.0 - tt) * R_brief[i0, j0] + tt * R_brief[i0, j0 + 1]) + tx * (
            (1.0 - tt) * R_brief[i0 + 1, j0] + tt * R_brief[i0 + 1, j0 + 1]
        )
        th_r = float(np.radians(deg_val))
        return y_hub - rv * float(np.cos(th_r)), z_hub - rv * float(np.sin(th_r))

    def _z_to_deg_front(xq_val: float, z_target: float, is_bottom: bool = False) -> float:
        degs_s = np.linspace(-56.0, 82.0 if is_bottom else 25.0, 96)
        zs_s = np.array([_eval_front_polar(xq_val, d)[1] for d in degs_s])
        order = np.argsort(zs_s)
        return float(np.interp(z_target, zs_s[order], degs_s[order]))

    # Symmetric posterior polar Donor profile `R_back(x, deg_b)` so the lower-central rear panel curves cleanly
    # underneath overhanging `F=100%` glutes into the perineal saddle (`zero horizontal sub-gluteal tail tab!`):
    y_hub_b = 0.005
    z_hub_b = z_cr_min + 0.095
    nth_b = 96
    deg_bg = np.linspace(-76.0, 92.0, nth_b)
    th_bg = np.radians(deg_bg)
    R_don_b = np.full((nx_p, nth_b), np.nan, dtype=np.float64)
    for ith_b, (deg_vb, th_vb) in enumerate(zip(deg_bg, th_bg)):
        dy_b = float(np.cos(th_vb))
        dz_b = -float(np.sin(th_vb))
        for ix_p, xq in enumerate(x_pg):
            z_ceil_b = float(z_top_phi[-1]) + 0.015
            if deg_vb <= 76.0:
                rs_b = []
                for sx in ((-1.0, 1.0) if xq > 1e-5 else (1.0,)):
                    orig_b = Vector((sx * float(xq), y_hub_b + 0.40 * dy_b, z_hub_b + 0.40 * dz_b))
                    dvec_b = Vector((0.0, -dy_b, -dz_b))
                    rh_b, rn_b, _, _ = bvh_pel.ray_cast(orig_b, dvec_b, 0.38)
                    if rh_b is not None and float(rh_b.z) >= z_cr_min - 0.003 and float(rh_b.z) <= z_ceil_b:
                        if deg_vb <= 52.0 and xq <= 0.060 and float(rh_b.y) < 0.025:
                            continue
                        if float(rn_b.y) * dy_b + float(rn_b.z) * dz_b > 0.10:
                            r_hb = (float(rh_b.y) - y_hub_b) * dy_b + (float(rh_b.z) - z_hub_b) * dz_b
                            if 0.035 <= r_hb <= 0.330:
                                rs_b.append(r_hb)
                if rs_b:
                    R_don_b[ix_p, ith_b] = float(np.mean(rs_b))
            if np.isnan(R_don_b[ix_p, ith_b]) and deg_vb >= 42.0 and xq <= 0.058:
                y_rb = y_hub_b + r_scan * dy_b
                z_rb = z_hub_b + r_scan * dz_b
                arch_kb = 0.0025 if (tgap_x > 0.016 or ad_g > 0.20) else 0.0050
                z_ab = np.interp(y_rb, y_sad, z_crotch_don) + arch_kb * ((xq / 0.045) ** 2)
                dz_df = z_rb - z_ab
                cr_b = np.flatnonzero((dz_df[:-1] >= 0.0) & (dz_df[1:] <= 0.0))
                if len(cr_b):
                    kb0 = int(cr_b[0])
                    tcb = float(dz_df[kb0]) / max(float(dz_df[kb0] - dz_df[kb0 + 1]), 1e-8)
                    R_don_b[ix_p, ith_b] = float((1.0 - tcb) * r_scan[kb0] + tcb * r_scan[kb0 + 1])
    for ix_p in range(nx_p):
        ok_tb = np.flatnonzero(np.isfinite(R_don_b[ix_p]))
        if len(ok_tb):
            R_don_b[ix_p] = np.interp(deg_bg, deg_bg[ok_tb], R_don_b[ix_p, ok_tb])
    for ith_b in range(nth_b):
        ok_xb = np.isfinite(R_don_b[:, ith_b])
        if np.any(ok_xb):
            R_don_b[:, ith_b] = np.interp(x_pg, x_pg[ok_xb], R_don_b[ok_xb, ith_b])
    R_sm_b = R_don_b.copy()
    for _ in range(5):
        for step_w in (0.33, -0.34):
            rxb = R_sm_b.copy()
            rxb[0, :] = R_sm_b[0, :] + step_w * (R_sm_b[1, :] - R_sm_b[0, :])
            rxb[1:-1, :] = R_sm_b[1:-1, :] + step_w * (0.5 * (R_sm_b[:-2, :] + R_sm_b[2:, :]) - R_sm_b[1:-1, :])
            rzb = rxb.copy()
            rzb[:, 1:-1] = rxb[:, 1:-1] + step_w * (0.5 * (rxb[:, :-2] + rxb[:, 2:]) - rxb[:, 1:-1])
            R_sm_b = rzb
    R_back_p = R_sm_b + 0.0016

    def _eval_back_polar(xq_val: float, deg_val: float) -> tuple[float, float]:
        fx = float(np.clip(abs(xq_val) / float(x_pg[1] - x_pg[0]), 0.0, float(nx_p - 1) - 1e-6))
        ft = float(np.clip((deg_val - float(deg_bg[0])) / float(deg_bg[1] - deg_bg[0]), 0.0, float(nth_b - 1) - 1e-6))
        i0, j0 = int(fx), int(ft)
        tx, tt = fx - i0, ft - j0
        rv = (1.0 - tx) * ((1.0 - tt) * R_back_p[i0, j0] + tt * R_back_p[i0, j0 + 1]) + tx * (
            (1.0 - tt) * R_back_p[i0 + 1, j0] + tt * R_back_p[i0 + 1, j0 + 1]
        )
        th_r = float(np.radians(deg_val))
        return y_hub_b + rv * float(np.cos(th_r)), z_hub_b - rv * float(np.sin(th_r))

    def _z_to_deg_back(xq_val: float, z_target: float, is_bottom: bool = False) -> float:
        degs_s = np.linspace(-74.0, 82.0 if is_bottom else 30.0, 96)
        zs_s = np.array([_eval_back_polar(xq_val, d)[1] for d in degs_s])
        order = np.argsort(zs_s)
        return float(np.interp(z_target, zs_s[order], degs_s[order]))

    pts_list: list[np.ndarray] = []
    f_idx = np.zeros((nx, nv), dtype=np.int64)
    b_idx = np.zeros((nx, nv), dtype=np.int64)
    g_idx = np.zeros((2 * chc + 1, ng), dtype=np.int64)

    for iv in range(nv):
        vv = float(iv) / float(nv - 1)
        zh = (1.0 - vv) * z_hip_bot + vv * z_hip_top
        p_l = _probe_cyl_pelvis(+phi_hip, zh, pad_m=0.0016)
        p_r = np.array([-p_l[0], p_l[1], p_l[2]], dtype=np.float64)
        idx_r = len(pts_list)
        pts_list.append(p_r)
        idx_l = len(pts_list)
        pts_list.append(p_l)
        f_idx[0, iv] = b_idx[0, iv] = idx_r
        f_idx[nx - 1, iv] = b_idx[nx - 1, iv] = idx_l

    x_gus = 0.026 if tgap_x > 0.016 else (0.031 if ad_g > 0.20 else 0.028)
    r_front_ref = abs(float(_probe_cyl_pelvis(0.0, 0.5 * (float(z_bot_phi[0]) + float(z_top_phi[0])))[1] - y_cyl))
    r_back_ref = abs(float(_probe_cyl_pelvis(np.pi, 0.5 * (float(z_bot_phi[-1]) + float(z_top_phi[-1])))[1] - y_cyl))
    phi_gus_f = float(np.arcsin(np.clip(x_gus / max(r_front_ref, 0.08), 0.08, 0.35)))
    phi_gus_b = float(np.arcsin(np.clip(x_gus / max(r_back_ref, 0.08), 0.08, 0.35)))

    def _front_phi(ix: int) -> float:
        k = ix - mid_ix
        if k == 0:
            return 0.0
        sgn = 1.0 if k > 0 else -1.0
        ak = abs(k)
        if ak <= chc:
            return sgn * (float(ak) / float(chc)) * phi_gus_f
        t = float(ak - chc) / float(mid_ix - chc)
        return sgn * (phi_gus_f + (phi_hip - phi_gus_f) * t)

    def _back_phi_abs(ix: int) -> float:
        ak = abs(ix - mid_ix)
        if ak == 0:
            return np.pi
        if ak <= chc:
            return np.pi - (float(ak) / float(chc)) * phi_gus_b
        t = float(ak - chc) / float(mid_ix - chc)
        return (np.pi - phi_gus_b) - ((np.pi - phi_gus_b) - phi_hip) * t

    deg_gus_f0 = _z_to_deg_front(x_gus, float(np.interp(phi_gus_f, phi_grid, z_bot_phi)), is_bottom=True)
    deg_ctr_f0 = float(np.clip(_z_to_deg_front(0.0, z_cr_min + 0.0018, is_bottom=True), max(deg_gus_f0 + 4.5, 63.0), 75.0))

    for ix in range(1, nx - 1):
        phi_s = _front_phi(ix)
        aphi = abs(phi_s)
        sgn = 1.0 if phi_s >= 0.0 else (-1.0 if phi_s < 0.0 else 0.0)
        ak = abs(ix - mid_ix)
        z_top_c = float(np.interp(aphi, phi_grid, z_top_phi))
        z_bot_c = float(np.interp(aphi, phi_grid, z_bot_phi))
        w_polar = 1.0 - float(smootherstep(np.array([(float(ak) - 6.0) / 5.0]))[0])
        for iv in range(nv):
            vv = float(iv) / float(nv - 1)
            zq_c = (1.0 - vv) * z_bot_c + vv * z_top_c
            p_cyl = _probe_cyl_pelvis(phi_s, zq_c, pad_m=0.0016)
            if w_polar > 0.005:
                xq_pol = float(p_cyl[0]) if ak > chc else (sgn * (float(ak) / float(chc)) * x_gus)
                ax_pol = min(abs(xq_pol), float(x_pg[-1]) - 1e-4)
                deg_top_p = _z_to_deg_front(ax_pol, z_top_c, is_bottom=False)
                if ak <= chc:
                    tg_k = float(ak) / float(chc)
                    deg_bot_p = (1.0 - tg_k * tg_k) * deg_ctr_f0 + (tg_k * tg_k) * deg_gus_f0
                else:
                    deg_bot_p = _z_to_deg_front(ax_pol, z_bot_c, is_bottom=True)
                yf_p, zf_p = _eval_front_polar(ax_pol, (1.0 - vv) * deg_bot_p + vv * deg_top_p)
                p_pol = np.array([sgn * ax_pol, yf_p, zf_p], dtype=np.float64)
                p_pt = (1.0 - w_polar) * p_cyl + w_polar * p_pol
                if 0.02 < w_polar < 0.98 and iv >= 1:
                    phi_bl = sgn * float(np.arctan2(abs(p_pt[0]), -(p_pt[1] - y_cyl)))
                    p_re = _probe_cyl_pelvis(phi_bl, float(p_pt[2]), pad_m=0.0016)
                    if float(np.hypot(p_pt[0], p_pt[1] - y_cyl)) < float(np.hypot(p_re[0], p_re[1] - y_cyl)):
                        p_pt = p_re
            else:
                p_pt = p_cyl
            if ix == mid_ix:
                p_pt[0] = 0.0
            idx_v = len(pts_list)
            pts_list.append(p_pt)
            f_idx[ix, iv] = idx_v

    deg_gus_b0 = _z_to_deg_back(x_gus, float(np.interp(np.pi - phi_gus_b, phi_grid, z_bot_phi)), is_bottom=True)
    deg_ctr_b0 = float(np.clip(_z_to_deg_back(0.0, z_cr_min + 0.0018, is_bottom=True), max(deg_gus_b0 + 4.5, 62.0), 76.0))

    for ix in range(1, nx - 1):
        phi_b = _back_phi_abs(ix)
        sgn = 1.0 if ix >= mid_ix else -1.0
        ak = abs(ix - mid_ix)
        z_top_b = float(np.interp(phi_b, phi_grid, z_top_phi))
        z_bot_b = float(np.interp(phi_b, phi_grid, z_bot_phi))
        w_pol_bx = 1.0 - float(smootherstep(np.array([(float(ak) - 5.5) / 4.0]))[0])
        for iv in range(nv):
            vv = float(iv) / float(nv - 1)
            zq_b = (1.0 - vv) * z_bot_b + vv * z_top_b
            p_cyl_b = _probe_cyl_pelvis(sgn * phi_b, zq_b, pad_m=0.0016)
            w_pol_b = w_pol_bx * (1.0 - float(smootherstep(np.array([(vv - 0.28) / 0.22]))[0]))
            if w_pol_b > 0.005:
                xq_pb = float(p_cyl_b[0]) if ak > chc else (sgn * (float(ak) / float(chc)) * x_gus)
                ax_pb = min(abs(xq_pb), float(x_pg[-1]) - 1e-4)
                deg_top_b = _z_to_deg_back(ax_pb, z_top_b, is_bottom=False)
                if ak <= chc:
                    tg_kb = float(ak) / float(chc)
                    deg_bot_b = (1.0 - tg_kb * tg_kb) * deg_ctr_b0 + (tg_kb * tg_kb) * deg_gus_b0
                else:
                    deg_bot_b = _z_to_deg_back(ax_pb, z_bot_b, is_bottom=True)
                yb_p, zb_p = _eval_back_polar(ax_pb, (1.0 - vv) * deg_bot_b + vv * deg_top_b)
                p_pol_b = np.array([sgn * ax_pb, yb_p, zb_p], dtype=np.float64)
                p_bk = (1.0 - w_pol_b) * p_cyl_b + w_pol_b * p_pol_b
            else:
                p_bk = p_cyl_b
            if ix == mid_ix:
                p_bk[0] = 0.0
            idx_v = len(pts_list)
            pts_list.append(p_bk)
            b_idx[ix, iv] = idx_v

    pts_arr = np.asarray(pts_list, dtype=np.float64)
    pts_arr[f_idx] = _taubin_relax_grid(pts_arr[f_idx], n_iters=6, lam=0.33, mu=-0.34, mid_ix=mid_ix, clip_m=0.0028)
    pts_arr[b_idx] = _taubin_relax_grid(pts_arr[b_idx], n_iters=6, lam=0.33, mu=-0.34, mid_ix=mid_ix, clip_m=0.0026)

    # One-sided outward (`+Y`) tensioned cloth bridge across Meshy's carved intergluteal butt-crack wedgie,
    # evaluated strictly along HORIZONTAL constant-world-Z slices (`including bottom rows iv=0..4 against same-Z
    # leg-hem edges so 0 W-pinch pleats survive at |X|=28mm AND 0 backward profile hook ever forms at the bottom!`):
    B_grid = pts_arr[b_idx].copy()
    leg_half_x = B_grid[mid_ix:, 0, 0].copy()
    leg_half_z = B_grid[mid_ix:, 0, 2].copy()
    leg_z_ord = np.argsort(leg_half_z)
    all_bx = np.abs(B_grid[:, :, 0]).ravel()
    all_by = B_grid[:, :, 1].ravel()
    all_bz = B_grid[:, :, 2].ravel()

    B_bridged = B_grid.copy()
    k_bridge_max = 6
    for iv in range(nv):
        vv_b = float(iv) / float(nv - 1)
        dip_env = float(np.sin(np.pi * np.clip(vv_b, 0.0, 1.0))) ** 0.75
        for ks in range(0, mid_ix - 2):
            xv = abs(float(B_grid[mid_ix + ks, iv, 0]))
            yv = float(B_grid[mid_ix + ks, iv, 1])
            zv = float(B_grid[mid_ix + ks, iv, 2])
            if xv > 0.092:
                continue
            x_edge_z = float(np.interp(zv, leg_half_z[leg_z_ord], leg_half_x[leg_z_ord])) if zv <= float(leg_half_z.max()) else float(leg_half_x[-1])
            if x_edge_z <= 0.028:
                continue
            # Sample flanking covered buttock / leg-hem chord AT THE EXACT SAME WORLD HEIGHT `zv` (`±9 mm`):
            x_lo_pk = min(0.026, 0.62 * x_edge_z)
            x_hi_pk = min(0.110, max(x_lo_pk + 0.008, x_edge_z - 0.003))
            m_same_z = (np.abs(all_bz - zv) <= 0.0095) & (all_bx >= x_lo_pk) & (all_bx <= x_hi_pk)
            if int(np.sum(m_same_z)) < 3:
                continue
            idx_pk_z = int(np.argmax(all_by[m_same_z]))
            y_pk_z = float(all_by[m_same_z][idx_pk_z])
            x_pk_z = max(float(all_bx[m_same_z][idx_pk_z]), 0.028)
            if xv >= x_pk_z:
                continue
            m_mid_z = (np.abs(all_bz - zv) <= 0.010) & (all_bx <= 0.006)
            y_mid_z = float(np.mean(all_by[m_mid_z])) if np.any(m_mid_z) else yv
            wedgie_d = max(0.0, y_pk_z - y_mid_z)
            dip_c = min(0.0020, 0.12 * wedgie_d) * dip_env
            u_sp = xv / x_pk_z
            y_span = y_pk_z - dip_c * ((1.0 - u_sp * u_sp) ** 1.35)
            if y_span > yv:
                k_bridge_max = max(k_bridge_max, ks + 2)
                B_bridged[mid_ix + ks, iv, 1] = y_span
                B_bridged[mid_ix - ks, iv, 1] = y_span
            elif iv <= 4 and yv > y_pk_z + 0.0012:
                # Flatten any central `_eval_back_polar` bottom bump onto the smooth same-Z leg-hem arch:
                y_trim = 0.35 * yv + 0.65 * y_pk_z
                B_bridged[mid_ix + ks, iv, 1] = y_trim
                B_bridged[mid_ix - ks, iv, 1] = y_trim

    k_fair = min(max(k_bridge_max + 2, 9), mid_ix - 2)
    B_floor_y = B_bridged[:, :, 1].copy()
    B_grid = B_bridged
    for _ in range(6):
        nxt_B = B_grid.copy()
        sl_x = slice(mid_ix - k_fair, mid_ix + k_fair + 1)
        w_in_x = (1.0 - smootherstep((np.abs(np.arange(-k_fair, k_fair + 1, dtype=np.float64)) - float(k_fair - 2.5)) / 3.0))[:, None]
        lap_y = (
            0.35 * (B_grid[mid_ix - k_fair - 1 : mid_ix + k_fair, 1:-1, 1] + B_grid[mid_ix - k_fair + 1 : mid_ix + k_fair + 2, 1:-1, 1])
            + 0.15 * (B_grid[sl_x, :-2, 1] + B_grid[sl_x, 2:, 1])
            - B_grid[sl_x, 1:-1, 1]
        )
        nxt_B[sl_x, 1:-1, 1] = B_grid[sl_x, 1:-1, 1] + (0.42 * w_in_x) * lap_y
        # Smooth lateral X/Y/Z along bottom rows `iv=0..3` across the `ak=chc=4` gusset seam (`eliminating bottom W-fangs`):
        for iv_b0 in (0, 1, 2, 3):
            w_b0 = (0.42 if iv_b0 == 0 else (0.34 if iv_b0 == 1 else 0.24)) * w_in_x[:, 0]
            lap_row = 0.5 * (B_grid[mid_ix - k_fair - 1 : mid_ix + k_fair, iv_b0] + B_grid[mid_ix - k_fair + 1 : mid_ix + k_fair + 2, iv_b0]) - B_grid[sl_x, iv_b0]
            nxt_B[sl_x, iv_b0] = B_grid[sl_x, iv_b0] + w_b0[:, None] * lap_row
        lap_t_y = 0.5 * (B_grid[mid_ix - k_fair - 1 : mid_ix + k_fair, -1, 1] + B_grid[mid_ix - k_fair + 1 : mid_ix + k_fair + 2, -1, 1]) - B_grid[sl_x, -1, 1]
        nxt_B[sl_x, -1, 1] = B_grid[sl_x, -1, 1] + (0.35 * w_in_x[:, 0]) * lap_t_y
        mid_hold = (1.0 - smootherstep(np.abs(np.arange(nx, dtype=np.float64) - float(mid_ix)) / float(max(k_bridge_max, 4))))[:, None]
        nxt_B[:, 2:, 1] = np.maximum(nxt_B[:, 2:, 1], B_floor_y[:, 2:] - 0.0005 - 0.0018 * (1.0 - mid_hold))
        nxt_B[mid_ix, :, 0] = 0.0
        for ks in range(1, k_fair + 1):
            xm = 0.5 * (nxt_B[mid_ix + ks, :, 0] - nxt_B[mid_ix - ks, :, 0])
            ym = 0.5 * (nxt_B[mid_ix + ks, :, 1] + nxt_B[mid_ix - ks, :, 1])
            zm = 0.5 * (nxt_B[mid_ix + ks, :, 2] + nxt_B[mid_ix - ks, :, 2])
            nxt_B[mid_ix + ks, :, 0], nxt_B[mid_ix - ks, :, 0] = xm, -xm
            nxt_B[mid_ix + ks, :, 1], nxt_B[mid_ix - ks, :, 1] = ym, ym
            nxt_B[mid_ix + ks, :, 2], nxt_B[mid_ix - ks, :, 2] = zm, zm
        B_grid = nxt_B
    pts_arr[b_idx] = B_grid

    pts_list = pts_arr.tolist()

    for ci, ix in enumerate(range(mid_ix - chc, mid_ix + chc + 1)):
        g_idx[ci, 0] = f_idx[ix, 0]
        g_idx[ci, ng - 1] = b_idx[ix, 0]
        p_f0 = pts_arr[int(f_idx[ix, 0])]
        p_b0 = pts_arr[int(b_idx[ix, 0])]
        ux_c = float(ix - mid_ix) / float(chc)
        for ig in range(1, ng - 1):
            tg = float(ig) / float(ng - 1)
            yg = (1.0 - tg) * float(p_f0[1]) + tg * float(p_b0[1])
            hourglass = 1.0 - (0.26 if tgap_x > 0.016 else 0.14) * float(np.sin(np.pi * tg))
            xg = ((1.0 - tg) * float(p_f0[0]) + tg * float(p_b0[0])) * hourglass
            # `-0.0014 m` outward downward cloth clearance below `z_crotch_don(y)` so crotch saddle reads ivory `+1..+2 mm`:
            z_don_g = float(np.interp(yg, y_sad, z_crotch_don)) - 0.0014 + 0.0018 * (ux_c * ux_c)
            z_end_blend = (1.0 - tg) * float(p_f0[2]) + tg * float(p_b0[2])
            w_mid_g = float(np.sin(np.pi * tg))
            zg = (1.0 - 0.80 * w_mid_g) * z_end_blend + (0.80 * w_mid_g) * min(z_don_g, z_end_blend + 0.0015)
            if ix == mid_ix:
                xg = 0.0
            idx_g = len(pts_list)
            pts_list.append([xg, yg, zg])
            g_idx[ci, ig] = idx_g

    pts = np.asarray(pts_list, dtype=np.float64)

    tris: list[list[int]] = []
    for ix in range(nx - 1):
        for iv in range(nv - 1):
            f00, f10, f01, f11 = (
                int(f_idx[ix, iv]),
                int(f_idx[ix + 1, iv]),
                int(f_idx[ix, iv + 1]),
                int(f_idx[ix + 1, iv + 1]),
            )
            if ix < mid_ix:
                tris.append([f00, f10, f11])
                tris.append([f00, f11, f01])
            else:
                tris.append([f00, f10, f01])
                tris.append([f10, f11, f01])
            b00, b10, b01, b11 = (
                int(b_idx[ix, iv]),
                int(b_idx[ix + 1, iv]),
                int(b_idx[ix, iv + 1]),
                int(b_idx[ix + 1, iv + 1]),
            )
            if ix < mid_ix:
                tris.append([b00, b11, b10])
                tris.append([b00, b01, b11])
            else:
                tris.append([b00, b01, b10])
                tris.append([b10, b01, b11])
    for ci in range(2 * chc):
        for ig in range(ng - 1):
            g00, g10, g01, g11 = (
                int(g_idx[ci, ig]),
                int(g_idx[ci + 1, ig]),
                int(g_idx[ci, ig + 1]),
                int(g_idx[ci + 1, ig + 1]),
            )
            if ci < chc:
                tris.append([g00, g11, g10])
                tris.append([g00, g01, g11])
            else:
                tris.append([g00, g01, g10])
                tris.append([g10, g01, g11])
    tri_arr = np.asarray(tris, dtype=np.int64)

    mid_v, mir_v = linen_briefs_mirror_map(len(pts), pts)
    sgn_v = np.where(mid_v, 0.0, np.where(pts[:, 0] >= 0.0, 1.0, -1.0))
    rib_idx = np.zeros((2 * chc + 1, 11), dtype=np.int64)
    for ci, ix in enumerate(range(mid_ix - chc, mid_ix + chc + 1)):
        rib_idx[ci, 0] = f_idx[ix, 2]
        rib_idx[ci, 1] = f_idx[ix, 1]
        rib_idx[ci, 2] = f_idx[ix, 0]
        for kg in range(ng - 2):
            rib_idx[ci, 3 + kg] = g_idx[ci, 1 + kg]
        rib_idx[ci, 8] = b_idx[ix, 0]
        rib_idx[ci, 9] = b_idx[ix, 1]
        rib_idx[ci, 10] = b_idx[ix, 2]
    # Smooth ONLY the perineal gusset interior (`rows 2..8`, tapering to 0 at `ci = 0, 2*chc` so `ix = mid_ix ± chc`
    # never creates a step groove against `ix = mid_ix ± (chc + 1)` at the bottom of the rear seat!):
    w_ci_in = np.sin(np.pi * np.linspace(0.0, 1.0, 2 * chc + 1))[1:-1, None, None]
    for _ in range(4):
        for step_w in (0.32, -0.33):
            R_rib = pts[rib_idx].copy()
            nxt_R = R_rib.copy()
            lap_R = 0.25 * (R_rib[:-2, 2:8] + R_rib[2:, 2:8] + R_rib[1:-1, 1:7] + R_rib[1:-1, 3:9]) - R_rib[1:-1, 2:8]
            nxt_R[1:-1, 2:8] = R_rib[1:-1, 2:8] + (step_w * w_ci_in) * lap_R
            pts[rib_idx] = nxt_R
            pts = _symmetrize_brief_pts(pts, mid_v, mir_v, sgn_v, min_x=0.0025)

    sh_conn = weld_connectivity(pts, tri_arr, decimals=5)
    all_adj: list[set[int]] = [set() for _ in range(len(pts))]
    for a, b, c_i in tri_arr:
        ia, ib, ic = int(a), int(b), int(c_i)
        for u, v in ((ia, ib), (ib, ic), (ic, ia)):
            all_adj[u].add(v)
            all_adj[v].add(u)
    for _ in range(24):
        sx = self_intersections(pts, tri_arr, sh_conn[0])
        if not sx:
            break
        sx_vs = {int(vi) for ta, tb in sx for vi in (*tri_arr[int(ta)], *tri_arr[int(tb)])}
        halo = set(sx_vs)
        for vi in list(sx_vs):
            halo.update(all_adj[vi])
        nxt = pts.copy()
        for vi in halo:
            if all_adj[vi]:
                nxt[vi] = 0.55 * pts[vi] + 0.45 * pts[list(all_adj[vi])].mean(axis=0)
        pts = _symmetrize_brief_pts(nxt, mid_v, mir_v, sgn_v, min_x=0.0026)

    meta = {
        "xMax": x_max_approx,
        "zHipBot": z_hip_bot,
        "zHipTop": z_hip_top,
        "zFrontTopMid": float(z_top_phi[0]),
        "zBackTopMid": float(z_top_phi[-1]),
        "zCrotchMin": z_cr_min,
        "yCyl": y_cyl,
        "mainLinenFaces": main_lf,
        "rimLinenFaces": rim_lf,
        "pelvicFaces": pelvic_faces,
        "fIdx": f_idx,
        "bIdx": b_idx,
        "gIdx": g_idx,
    }
    return pts, tri_arr, meta


def _barycentric_on_tri(p: np.ndarray, a: np.ndarray, b: np.ndarray, c: np.ndarray) -> np.ndarray:
    v0 = b - a
    v1 = c - a
    v2 = p - a
    d00 = float(np.dot(v0, v0))
    d01 = float(np.dot(v0, v1))
    d11 = float(np.dot(v1, v1))
    d20 = float(np.dot(v2, v0))
    d21 = float(np.dot(v2, v1))
    denom = d00 * d11 - d01 * d01
    if abs(denom) < 1e-14:
        return np.array([1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0], dtype=np.float64)
    v = (d11 * d20 - d01 * d21) / denom
    w = (d00 * d21 - d01 * d20) / denom
    u = 1.0 - v - w
    bary = np.clip(np.array([u, v, w], dtype=np.float64), 0.0, 1.0)
    return bary / max(float(bary.sum()), 1e-12)


def _tri_frame(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> np.ndarray:
    e1 = b - a
    e1_n = float(np.linalg.norm(e1))
    t1 = e1 / max(e1_n, 1e-12)
    n_raw = np.cross(b - a, c - a)
    n_n = float(np.linalg.norm(n_raw))
    n_u = n_raw / max(n_n, 1e-12)
    t2 = np.cross(n_u, t1)
    return np.column_stack([t1, t2, n_u])


def unpose_donor_briefs_to_rest(
    posed_briefs_bl: np.ndarray,
    briefs_tri: np.ndarray,
    posed_low_fit: np.ndarray,
    rest_low_fit: np.ndarray,
    low_tri: np.ndarray,
    rest_high_fit: np.ndarray | None = None,
    high_tri: np.ndarray | None = None,
) -> np.ndarray:
    """Map `posed_briefs_bl` (`fit to donorReg`) into Rest space without `LOD1` facet distortion.

    Decomposes the pose-to-rest map into exact Kabsch rigid pelvic alignment plus a smoothed
    non-rigid thigh-articulation residual, so `100%` of the smooth Donor brief curvature is preserved.
    """
    n_v = len(posed_briefs_bl)
    mid_v, mir_v = linen_briefs_mirror_map(n_v, posed_briefs_bl)
    sgn_v = np.where(mid_v, 0.0, np.where(posed_briefs_bl[:, 0] >= 0.0, 1.0, -1.0))

    # 1) Exact rigid pelvic transform `posed -> rest` via Kabsch SVD on pelvic trunk vertices:
    pel_v = (
        (np.abs(rest_low_fit[:, 0]) <= 0.16)
        & (rest_low_fit[:, 2] >= 1.02)
        & (rest_low_fit[:, 2] <= 1.24)
    )
    if np.sum(pel_v) < 12:
        pel_v = (rest_low_fit[:, 2] >= 0.96) & (rest_low_fit[:, 2] <= 1.26)
    P_c = posed_low_fit[pel_v].mean(axis=0)
    R_c = rest_low_fit[pel_v].mean(axis=0)
    H = (posed_low_fit[pel_v] - P_c).T @ (rest_low_fit[pel_v] - R_c)
    U_s, _, Vt_s = np.linalg.svd(H)
    R_pel = Vt_s.T @ U_s.T
    if np.linalg.det(R_pel) < 0.0:
        Vt_s[-1, :] *= -1.0
        R_pel = Vt_s.T @ U_s.T
    p_rigid = ((posed_briefs_bl - P_c[None, :]) @ R_pel.T) + R_c[None, :]

    # 2) Same-side triangle frame map on `posed_low_fit -> rest_low_fit` to capture slight thigh-pose delta:
    fc_r = rest_low_fit[low_tri].mean(axis=1)
    pel_tm = (np.abs(fc_r[:, 0]) <= 0.34) & (fc_r[:, 2] >= 0.76) & (fc_r[:, 2] <= 1.32)
    pos_tm = np.flatnonzero(pel_tm & (fc_r[:, 0] >= -1e-4))
    neg_tm = np.flatnonzero(pel_tm & (fc_r[:, 0] <= +1e-4))
    all_tm = np.flatnonzero(pel_tm)
    bvh_pos = BVHTree.FromPolygons(posed_low_fit.tolist(), low_tri[pos_tm].tolist(), all_triangles=True)
    bvh_neg = BVHTree.FromPolygons(posed_low_fit.tolist(), low_tri[neg_tm].tolist(), all_triangles=True)
    bvh_all = BVHTree.FromPolygons(posed_low_fit.tolist(), low_tri[all_tm].tolist(), all_triangles=True)

    p_raw = p_rigid.copy()
    for i in range(n_v):
        pt = posed_briefs_bl[i]
        if mid_v[i]:
            _, _, ti_loc, _ = bvh_all.find_nearest(tuple(pt), 0.15)
            ti = int(all_tm[int(ti_loc)]) if ti_loc is not None else -1
        elif pt[0] >= 0.0:
            _, _, ti_loc, _ = bvh_pos.find_nearest(tuple(pt), 0.15)
            ti = int(pos_tm[int(ti_loc)]) if ti_loc is not None else -1
        else:
            _, _, ti_loc, _ = bvh_neg.find_nearest(tuple(pt), 0.15)
            ti = int(neg_tm[int(ti_loc)]) if ti_loc is not None else -1
        if ti < 0:
            continue
        ia, ib, ic = int(low_tri[ti, 0]), int(low_tri[ti, 1]), int(low_tri[ti, 2])
        pa, pb, pc = posed_low_fit[ia], posed_low_fit[ib], posed_low_fit[ic]
        ra, rb, rc = rest_low_fit[ia], rest_low_fit[ib], rest_low_fit[ic]
        bary = _barycentric_on_tri(pt, pa, pb, pc)
        q_p = bary[0] * pa + bary[1] * pb + bary[2] * pc
        q_r = bary[0] * ra + bary[1] * rb + bary[2] * rc
        Fp = _tri_frame(pa, pb, pc)
        Fr = _tri_frame(ra, rb, rc)
        p_raw[i] = q_r + (Fr @ (Fp.T @ (pt - q_p)))

    # Smooth ONLY the non-rigid thigh residual `res = p_raw - p_rigid` so zero `LOD1` facets enter:
    res = p_raw - p_rigid
    all_adj: list[set[int]] = [set() for _ in range(n_v)]
    for a, b, c_i in briefs_tri:
        ia, ib, ic = int(a), int(b), int(c_i)
        for u, v in ((ia, ib), (ib, ic), (ic, ia)):
            all_adj[u].add(v)
            all_adj[v].add(u)
    for _ in range(8):
        nxt_r = res.copy()
        for i in range(n_v):
            if all_adj[i]:
                nxt_r[i] = 0.55 * res[i] + 0.45 * res[list(all_adj[i])].mean(axis=0)
        res = nxt_r

    pts_rest = _symmetrize_brief_pts(p_rigid + res, mid_v, mir_v, sgn_v, min_x=0.0026)
    _ = (rest_high_fit, high_tri)
    return pts_rest


def _build_canonical_briefs_over_body(
    body_bl: np.ndarray,
    low_tri: np.ndarray,
    dense_body_bl: np.ndarray | None = None,
    dense_tri: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Build canonical `1,869`-vertex `linenBriefs` over `body_bl` when no Donor mask is supplied
    (used for canonical family initialization and novel-pose `eval_linen_briefs_bl` checks).
    """
    probe_pts = dense_body_bl if (dense_body_bl is not None and dense_tri is not None) else body_bl
    probe_tri = dense_tri if (dense_body_bl is not None and dense_tri is not None) else low_tri

    # Isolate trunk/pelvis component (`arm-free`) and derive level-set mask `_eval_brief_level_set_bl > 0`:
    b_weld, (b_es, b_ed), b_mult, _ = weld_connectivity(probe_pts, probe_tri, decimals=5)
    n_bu = len(b_mult)
    u_z = np.bincount(b_weld, weights=probe_pts[:, 2], minlength=n_bu) / b_mult
    u_x = np.bincount(b_weld, weights=probe_pts[:, 0], minlength=n_bu) / b_mult
    band_u = (u_z >= 0.78) & (u_z <= 1.32)
    trunk_u = band_u & (np.abs(u_x) <= 0.035)
    b_adj: list[list[int]] = [[] for _ in range(n_bu)]
    for ua, ub in zip(b_es, b_ed):
        if band_u[int(ua)] and band_u[int(ub)]:
            b_adj[int(ua)].append(int(ub))
    q_tr = list(np.flatnonzero(trunk_u))
    qi = 0
    while qi < len(q_tr):
        cur_u = q_tr[qi]
        qi += 1
        for nb_u in b_adj[cur_u]:
            if not trunk_u[nb_u]:
                trunk_u[nb_u] = True
                q_tr.append(nb_u)
    trunk_v = trunk_u[b_weld]
    fc = probe_pts[probe_tri].mean(axis=1)
    lf_synth = np.all(trunk_v[probe_tri], axis=1) & (_eval_brief_level_set_bl(fc) > 0.0)
    pts, tri, _ = fit_linen_briefs_to_donor_posed(probe_pts, probe_tri, lf_synth, None, ~np.all(trunk_v[probe_tri], axis=1))
    pts = clear_briefs_against_dense_body(pts, tri, probe_pts, probe_tri)
    return pts, tri


def _build_canonical_linen_briefs_data(compiled_family: dict) -> dict:
    """Build canonical `linenBriefs` definition + `people.bind_surface` binding on canonical `bodySkin` (`LOD1`)."""
    body_mesh = compiled_family["meshes"]["bodySkin"]
    body_bl = gltf_to_blender(body_mesh["positions"]).astype(np.float64)
    low_tri = np.asarray(body_mesh["triangles"], dtype=np.int64).reshape(-1, 3)

    full_pts_bl, full_tri = _build_canonical_briefs_over_body(body_bl, low_tri)
    n_verts = len(full_pts_bl)

    nx_u, nv_u, ng_u, chc_u = 49, 19, 7, 4
    uv_rows: list[tuple[float, float]] = []
    for iv in range(nv_u):
        vv = float(iv) / float(nv_u - 1)
        uv_rows.append((0.0, vv))
        uv_rows.append((14.0, vv))
    for _is_bk in (False, True):
        for ix in range(1, nx_u - 1):
            u_t = (float(ix) / float(nx_u - 1)) * 14.0
            for iv in range(nv_u):
                uv_rows.append((u_t, float(iv) / float(nv_u - 1)))
    mid_ix_u = nx_u // 2
    for _ci, ix in enumerate(range(mid_ix_u - chc_u, mid_ix_u + chc_u + 1)):
        u_t = (float(ix) / float(nx_u - 1)) * 14.0
        ux_c = abs(float(ix - mid_ix_u) / float(chc_u))
        for _ig in range(1, ng_u - 1):
            uv_rows.append((u_t, 0.075 * (1.0 - ux_c)))
    uvs = np.asarray(uv_rows, dtype=np.float32)
    assert len(uvs) == n_verts, f"UV count mismatch: {len(uvs)} vs {n_verts}"

    briefs_gltf_pos = blender_to_gltf(full_pts_bl).astype(np.float32).reshape(-1)
    binding = ol_people.bind_surface(body_mesh, "bodySkin", briefs_gltf_pos)

    n_body_src = len(body_mesh["positions"]) // 3
    src_v_idx = np.asarray(body_mesh["sourceVertexIndices"], dtype=np.int64)
    r_j_idx = np.asarray(body_mesh["jointIndices"], dtype=np.int64).reshape(-1, 4)
    r_j_wt = np.asarray(body_mesh["jointWeights"], dtype=np.float64).reshape(-1, 4)
    body_src_weights: list[dict[int, float]] = [{} for _ in range(n_body_src)]
    seen_src = np.zeros(n_body_src, dtype=bool)
    for r_row, sv in enumerate(src_v_idx):
        if not seen_src[sv]:
            seen_src[sv] = True
            body_src_weights[sv] = {
                int(j): float(w) for j, w in zip(r_j_idx[r_row], r_j_wt[r_row]) if w > 0.0
            }
    raw_sw = ol_people.surface_skin_weights(binding, body_src_weights)
    j_indices: list[int] = []
    j_weights: list[float] = []
    for w_map in raw_sw:
        weighted = sorted(w_map.items(), key=lambda kv: -kv[1])[:4]
        tot = sum(w for _, w in weighted)
        weighted += [(0, 0.0)] * (4 - len(weighted))
        j_indices.extend(int(j) for j, _ in weighted)
        j_weights.extend((float(w) / tot) if tot > 0.0 else 0.0 for _, w in weighted)

    flat_tri = full_tri.astype(np.uint32).reshape(-1).tolist()
    topo_sha = hashlib.sha256(np.asarray(flat_tri, dtype="<u4").tobytes()).hexdigest()

    mesh_entry = {
        "materialId": "undyedLinen",
        "positions": briefs_gltf_pos.tolist(),
        "triangles": flat_tri,
        "topology": topo_sha,
        "frameDelta": [0.0] * (n_verts * 3),
        "targets": {},
        "regions": {},
        "sourceVertexIndices": list(range(n_verts)),
        "renderTriangles": flat_tri,
        "jointIndices": j_indices,
        "jointWeights": j_weights,
        "uvs": uvs.reshape(-1).tolist(),
    }
    part_entry = {
        "stage": 0,
        "layerClass": "coverage",
        "region": "pelvis",
        "compatibleInnerLayers": [],
        "hiddenRegions": [],
        "pieces": [{"meshId": "linenBriefs", "fit": binding}],
    }
    material_entry = {
        "baseColor": [0.54, 0.45, 0.34, 1.0],
        "roughness": 0.93,
        "metallic": 0.0,
        "doubleSided": True,
    }
    return {
        "mesh": mesh_entry,
        "part": part_entry,
        "material": material_entry,
        "outerShellTriMask": [True] * len(full_tri),
    }


def get_cached_linen_briefs_data(compiled_family: dict, cache_dir: Path | None = None) -> dict:
    """Return cached canonical `linenBriefs` definition + `bind_surface` weights (<0.01s on cache hit)."""
    h = hashlib.sha256()
    h.update(Path(__file__).read_bytes())
    h.update(str(compiled_family["meshes"]["bodySkin"]["topology"]).encode("utf-8"))
    key = h.hexdigest()[:14]
    c_dir = get_transfer_cache_dir(cache_dir)
    c_path = c_dir / f"canonical-linen-briefs-{key}.json"
    if c_path.is_file():
        return json.loads(c_path.read_text())
    data = _build_canonical_linen_briefs_data(compiled_family)
    tmp_p = c_dir / f".tmp-linen-briefs-{key}-{os.getpid()}.json"
    tmp_p.write_text(json.dumps(data, separators=(",", ":"), allow_nan=False) + "\n")
    os.replace(tmp_p, c_path)
    return data


def get_baseline_coverage_ids(profile_path: Path | None = None) -> tuple[str, str, str]:
    cov = load_foundation_manifest(profile_path).get("baselineCoverage", {})
    return (
        str(cov.get("partId", "linenBriefs")),
        str(cov.get("materialId", "undyedLinen")),
        str(cov.get("slot", "legs")),
    )


def inject_linen_briefs_into_family(compiled_family: dict, cache_dir: Path | None = None) -> dict:
    """Return a shallow-copied family dict with profile-selected baseline coverage registered."""
    part_id, mat_id, slot_id = get_baseline_coverage_ids()
    data = get_cached_linen_briefs_data(compiled_family, cache_dir=cache_dir)
    mesh_entry = copy.deepcopy(data["mesh"])
    mesh_entry["materialId"] = mat_id
    part_entry = copy.deepcopy(data["part"])
    part_entry["slot"] = slot_id
    part_entry["pieces"][0]["meshId"] = part_id
    fam = dict(compiled_family)
    fam["meshes"] = {**compiled_family["meshes"], part_id: mesh_entry}
    fam["parts"] = {**compiled_family["parts"], part_id: part_entry}
    fam["materials"] = {**compiled_family["materials"], mat_id: copy.deepcopy(data["material"])}
    sel = copy.deepcopy(compiled_family["selectionParts"])
    sel.setdefault("coverage", {})[part_id] = [part_id]
    fam["selectionParts"] = sel
    fam["_linenBriefsOuterMask"] = data["outerShellTriMask"]
    return fam


def eval_linen_briefs_bl(
    body_lod1_bl: np.ndarray,
    compiled_family: dict,
    low_tri: np.ndarray | None = None,
    dense_body_bl: np.ndarray | None = None,
    dense_tri: np.ndarray | None = None,
    is_ext_full: bool = False,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Evaluate `linenBriefs` on `body_lod1_bl` via `people.surface_points` + outward body clearance."""
    _ = is_ext_full
    part_id = get_baseline_coverage_ids()[0]
    fam = (
        compiled_family
        if part_id in compiled_family.get("parts", {})
        else inject_linen_briefs_into_family(compiled_family)
    )
    fit = fam["parts"][part_id]["pieces"][0]["fit"]
    sh_mesh = fam["meshes"][part_id]
    support_g = blender_to_gltf(body_lod1_bl).astype(np.float32).reshape(-1)
    briefs_g = ol_people.surface_points(support_g, fit["triangles"], fit["barycentric"], fit["offsets"]).reshape(-1, 3)
    briefs_bl = gltf_to_blender(briefs_g).astype(np.float64)
    sh_tri = np.asarray(sh_mesh["triangles"], dtype=np.int64).reshape(-1, 3)
    b_tri = (
        low_tri
        if low_tri is not None
        else np.asarray(fam["meshes"]["bodySkin"]["triangles"], dtype=np.int64).reshape(-1, 3)
    )
    if dense_body_bl is not None and dense_tri is not None:
        briefs_bl = clear_briefs_against_dense_body(briefs_bl, sh_tri, dense_body_bl, dense_tri)
    else:
        briefs_bl = clear_briefs_against_dense_body(briefs_bl, sh_tri, body_lod1_bl, b_tri)
    outer_mask = np.ones(len(sh_tri), dtype=bool)
    return briefs_bl, sh_tri, outer_mask


def clear_briefs_against_dense_body(
    briefs_pts: np.ndarray,
    briefs_tri: np.ndarray,
    body_pts: np.ndarray,
    body_tri: np.ndarray,
) -> np.ndarray:
    """Outward-only clearance of `linenBriefs` against `body_pts` (`0` overlaps, `0` self-intersections)."""
    n_v = len(briefs_pts)
    mid_v, mir_v = linen_briefs_mirror_map(n_v, briefs_pts)
    sgn_v = np.where(mid_v, 0.0, np.where(briefs_pts[:, 0] >= 0.0, 1.0, -1.0))
    pts = _symmetrize_brief_pts(briefs_pts.copy(), mid_v, mir_v, sgn_v, min_x=0.0026)
    pts_orig = pts.copy()

    all_adj: list[set[int]] = [set() for _ in range(n_v)]
    for a, b, c in briefs_tri:
        ia, ib, ic = int(a), int(b), int(c)
        for u, v in ((ia, ib), (ib, ic), (ic, ia)):
            all_adj[u].add(v)
            all_adj[v].add(u)

    pel_m = np.all(
        (np.abs(body_pts[body_tri, 0]) <= 0.36)
        & (body_pts[body_tri, 2] >= 0.78)
        & (body_pts[body_tri, 2] <= 1.32),
        axis=1,
    )
    sub_tri = body_tri[pel_m]
    bvh_b = BVHTree.FromPolygons(body_pts.tolist(), sub_tri.tolist(), all_triangles=True)
    vb = body_pts[sub_tri]
    b_fn = np.cross(vb[:, 1] - vb[:, 0], vb[:, 2] - vb[:, 0])
    b_fn /= np.maximum(np.linalg.norm(b_fn, axis=1, keepdims=True), 1e-12)

    m_ab_cl = (
        (np.abs(body_pts[:, 0]) <= 0.055)
        & (body_pts[:, 2] >= 1.100)
        & (body_pts[:, 2] <= 1.175)
        & (body_pts[:, 1] < -0.05)
    )
    m_pb_cl = (
        (np.abs(body_pts[:, 0]) <= 0.055)
        & (body_pts[:, 2] >= 0.975)
        & (body_pts[:, 2] <= 1.042)
        & (body_pts[:, 1] < -0.05)
    )
    is_apron_cl = (np.sum(m_ab_cl) >= 3 and np.sum(m_pb_cl) >= 3) and (
        float(np.percentile(body_pts[m_pb_cl, 1], 25) - np.percentile(body_pts[m_ab_cl, 1], 15)) > 0.045
    )

    def _cl_safe_dir(pt_v: np.ndarray, n_in: np.ndarray) -> np.ndarray:
        if is_apron_cl and pt_v[1] < -0.045 and pt_v[2] > 0.996 and n_in[2] > -0.05:
            nv_p = np.array([n_in[0], min(float(n_in[1]), -0.65), min(float(n_in[2]), -0.08)], dtype=np.float64)
            return nv_p / max(float(np.linalg.norm(nv_p)), 1e-8)
        return n_in

    # Compute smooth outward garment normal field `vn_br` ONCE from `pts_orig` (`never along sideways cleft/thigh-gap body walls!`):
    sh_conn = weld_connectivity(pts_orig, briefs_tri, decimals=5)
    vn_br = vertex_normals(pts_orig, briefs_tri, sh_conn[0])
    for _ in range(5):
        vn_nxt = vn_br.copy()
        for i in range(n_v):
            if all_adj[i]:
                vn_nxt[i] = 0.55 * vn_br[i] + 0.45 * vn_br[list(all_adj[i])].mean(axis=0)
        vn_m = vn_nxt[mir_v].copy()
        vn_m[:, 0] *= -1.0
        vn_br = 0.5 * (vn_nxt + vn_m)
        vn_br[mid_v, 0] = 0.0
        vn_br /= np.maximum(np.linalg.norm(vn_br, axis=1, keepdims=True), 1e-12)
    for i in range(n_v):
        vn_br[i] = _cl_safe_dir(pts_orig[i], vn_br[i])
    vn_m0 = vn_br[mir_v].copy()
    vn_m0[:, 0] *= -1.0
    vn_br = 0.5 * (vn_br + vn_m0)
    vn_br[mid_v, 0] = 0.0
    vn_br /= np.maximum(np.linalg.norm(vn_br, axis=1, keepdims=True), 1e-12)

    d_out = np.zeros(n_v, dtype=np.float64)
    pts = pts_orig.copy()

    for _ in range(48):
        bvh_br = BVHTree.FromPolygons(pts.tolist(), briefs_tri.tolist(), all_triangles=True)
        ov = bvh_b.overlap(bvh_br)
        if not ov:
            break
        hit_v = np.zeros(n_v, dtype=bool)
        for _b_ti, g_ti in ov:
            for vi in briefs_tri[int(g_ti)]:
                hit_v[int(vi)] = True
        hit_v = hit_v | hit_v[mir_v]
        add_d = np.where(hit_v, 0.00045, 0.0)
        for vi in np.flatnonzero(hit_v):
            for nb in all_adj[int(vi)]:
                add_d[nb] = max(add_d[nb], 0.00022)
        d_out = np.minimum(0.0075, d_out + add_d)
        d_sm = d_out.copy()
        for i in range(n_v):
            if all_adj[i]:
                d_sm[i] = max(0.90 * d_out[i], 0.62 * d_out[i] + 0.38 * float(np.mean(d_out[list(all_adj[i])])))
        d_out = 0.5 * (d_sm + d_sm[mir_v])
        pts = _symmetrize_brief_pts(pts_orig + d_out[:, None] * vn_br, mid_v, mir_v, sgn_v, min_x=0.0026)

    for _ in range(24):
        sx_cur = self_intersections(pts, briefs_tri, sh_conn[0])
        if not sx_cur:
            break
        sx_vs = {int(vi) for ta, tb in sx_cur for vi in (*briefs_tri[int(ta)], *tri_arr_v(briefs_tri, int(tb)))}
        sx_halo = set(sx_vs)
        for vi in list(sx_vs):
            sx_halo.update(all_adj[vi])
        cand_sx = pts.copy()
        for vi in sx_halo:
            if all_adj[vi]:
                cand_sx[vi] = 0.54 * pts[vi] + 0.46 * pts[list(all_adj[vi])].mean(axis=0)
        cand_sx = _symmetrize_brief_pts(cand_sx, mid_v, mir_v, sgn_v, min_x=0.0026)
        bvh_sx = BVHTree.FromPolygons(cand_sx.tolist(), briefs_tri.tolist(), all_triangles=True)
        if not bvh_b.overlap(bvh_sx):
            pts = cand_sx
        else:
            d_sm = d_out.copy()
            for vi in sx_halo:
                if all_adj[vi]:
                    d_sm[vi] = float(np.mean(d_out[list(all_adj[vi])]))
            d_out = 0.5 * (d_sm + d_sm[mir_v])
            pts = _symmetrize_brief_pts(pts_orig + d_out[:, None] * vn_br, mid_v, mir_v, sgn_v, min_x=0.0026)
    for _ in range(2):
        vn_g = vertex_normals(pts, briefs_tri, sh_conn[0])
        cand = pts.copy()
        for i in range(n_v):
            if all_adj[i]:
                dp_t = pts[list(all_adj[i])].mean(axis=0) - pts[i]
                dp_t -= float(np.dot(dp_t, vn_g[i])) * vn_g[i]
                cand[i] = pts[i] + 0.35 * dp_t
        cand = _symmetrize_brief_pts(cand, mid_v, mir_v, sgn_v, min_x=0.0026)
        bvh_c = BVHTree.FromPolygons(cand.tolist(), briefs_tri.tolist(), all_triangles=True)
        if not bvh_b.overlap(bvh_c) and not self_intersections(cand, briefs_tri, sh_conn[0]):
            pts = cand
    return pts


def tri_arr_v(tri_arr: np.ndarray, idx: int) -> tuple[int, int, int]:
    return int(tri_arr[idx, 0]), int(tri_arr[idx, 1]), int(tri_arr[idx, 2])


def measure_linen_briefs_clearance(
    body_lod1_bl: np.ndarray,
    low_tri: np.ndarray,
    briefs_bl: np.ndarray,
    briefs_tri: np.ndarray,
    outer_shell_tri_mask: np.ndarray,
) -> dict:
    """Check BVH triangle intersections between unmasked `bodySkin` (`LOD1`) and visible `linenBriefs`."""
    outer_tri = briefs_tri[outer_shell_tri_mask]
    bvh_body = BVHTree.FromPolygons(body_lod1_bl.tolist(), low_tri.tolist(), all_triangles=True)
    bvh_br = BVHTree.FromPolygons(briefs_bl.tolist(), outer_tri.tolist(), all_triangles=True)
    overlaps = bvh_body.overlap(bvh_br)
    sh_conn = weld_connectivity(briefs_bl, outer_tri, decimals=5)
    self_x = self_intersections(briefs_bl, outer_tri, sh_conn[0])
    return {
        "garmentId": get_baseline_coverage_ids()[0],
        "outerShellTriangles": int(len(outer_tri)),
        "totalTriangles": int(len(briefs_tri)),
        "outerShellOverlapPairs": int(len(overlaps)),
        "garmentSelfIntersections": int(len(self_x)),
        "pokeThroughFree": len(overlaps) == 0 and len(self_x) == 0,
    }
