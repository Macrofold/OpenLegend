#!/usr/bin/env python3
"""Unlocked full-scale head/face/neck polish, rigid/affine ear & eye/oral submesh follow, and 5-finger polish."""
from __future__ import annotations

from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np

from canonical_masks import bfs_hop_distance, gltf_to_blender, smootherstep, smoothstep, weld_graph
from mesh_rig_utils import bad_faces, face_areas, self_intersections, weld_connectivity


def _kabsch_similarity(
    src_pts: np.ndarray,
    dst_pts: np.ndarray,
    scale_bounds: tuple[float, float] = (0.98, 1.06),
) -> tuple[float, np.ndarray, np.ndarray]:
    """Fit exact 3D similarity transform (s, R, t) mapping src_pts -> s * (src_pts @ R.T) + t."""
    if len(src_pts) < 3:
        t = (dst_pts.mean(axis=0) - src_pts.mean(axis=0)) if len(src_pts) else np.zeros(3)
        return 1.0, np.eye(3), t
    c_src = src_pts.mean(axis=0)
    c_dst = dst_pts.mean(axis=0)
    x = src_pts - c_src
    y = dst_pts - c_dst
    cov = (y.T @ x) / max(len(src_pts), 1)
    u, s_vals, vt = np.linalg.svd(cov)
    d = np.sign(np.linalg.det(u @ vt))
    s_mat = np.diag([1.0, 1.0, float(d) if d != 0 else 1.0])
    rot = u @ s_mat @ vt
    var_x = float(np.sum(x * x)) / max(len(src_pts), 1)
    raw_scale = float(np.sum(s_vals * np.array([1.0, 1.0, float(d) if d != 0 else 1.0])) / max(var_x, 1e-12))
    s_clamped = float(np.clip(raw_scale, scale_bounds[0], scale_bounds[1]))
    trans = c_dst - s_clamped * (c_src @ rot.T)
    return s_clamped, rot, trans


def align_donor_head_to_canonical_skull(
    d_u_pos: np.ndarray,
    rest_all: np.ndarray,
    n_body_verts: int,
) -> tuple[np.ndarray, dict]:
    """Keep 100% of Donor's true full-scale head, temples, cheekbones, brow, face, double-chin & occiput unwarped."""
    _ = (rest_all, n_body_verts)
    return d_u_pos.copy(), {
        "applied": False,
        "mode": "unlocked-full-head-no-world-pins",
        "rigidLipShiftYM": 0.0,
    }


def polish_head_and_neck_fullness(
    rest_base_high: np.ndarray,
    high_fit_in: np.ndarray,
    high_tri: np.ndarray,
    rest_base_head: np.ndarray,
    head_fit_in: np.ndarray,
    head_tri: np.ndarray,
    head_hard_pin: np.ndarray,
    seam_head: np.ndarray,
    coinc_body_v: np.ndarray,
    coinc_seam_s: np.ndarray,
    donor_xyz: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
    head_feature_masks: dict | None = None,
    adipose_gate: float = 1.0,
    posed_base_high: np.ndarray | None = None,
    jac_high: np.ndarray | None = None,
    posed_base_head: np.ndarray | None = None,
    jac_head: np.ndarray | None = None,
    muscle_gate: float = 0.5,
) -> tuple[np.ndarray, np.ndarray]:
    """Polish the 100% unlocked headSkin + bodySkin collar directly onto the full-scale Donor:
    - ZERO 0.0mm world-space pins on cranium, temples, cheekbones, brow, eyes, nose, lips, or jaw!
    - Entire cranium, temples, cheekbones, mid-cheeks, jowls, submental double-chin collar, neck & occiput
      match the Donor's full ~200-204mm proportions cleanly.
    - Canonical crisp eyelid margins, nostril openings & lip fissure keep their local differential shape
      without sunken world-space trenches; orbital & oral submesh rings stay Kabsch-rigid (<0.2mm gap).
    - Canonical crisp left & right ear pinnae ride smoothly outward/backward on the widening head via
      Kabsch similarity follow of their 3-ring temporal/mastoid attachment border (`zero buried ears!`).
    - Only crown `max(Z) = 2.0319m` (1D vertical stature invariant; X/Y free) is enforced.
    """
    _ = head_hard_pin
    high_out = high_fit_in.copy()
    head_out = head_fit_in.copy()

    body_band_v = np.flatnonzero(rest_base_high[:, 2] >= 1.550)
    b_map = np.full(len(rest_base_high), -1, dtype=np.int64)
    b_map[body_band_v] = np.arange(len(body_band_v))
    b_tri_keep = np.all(b_map[high_tri] >= 0, axis=1)
    b_tri_loc = b_map[high_tri[b_tri_keep]]

    n_b_loc = len(body_band_v)
    comb_ref = np.vstack([rest_base_high[body_band_v], rest_base_head])
    comb_fit = np.vstack([high_out[body_band_v], head_out])
    for bv, ss in zip(coinc_body_v, coinc_seam_s):
        bl = b_map[bv]
        if bl >= 0:
            mid_p = 0.5 * (comb_fit[bl] + comb_fit[n_b_loc + seam_head[ss]])
            comb_fit[bl] = mid_p
            comb_fit[n_b_loc + seam_head[ss]] = mid_p
    comb_tri = np.vstack([b_tri_loc, head_tri + n_b_loc])

    weld, wtri, edges, adj, ru = weld_graph(comb_ref, comb_tri, decimals=4)
    n_u = len(ru)
    es, ed = edges[:, 0], edges[:, 1]
    deg = np.maximum(np.bincount(es, minlength=n_u).astype(np.float64), 1.0)
    mult = np.maximum(np.bincount(weld, minlength=n_u).astype(np.float64), 1.0)
    pu = np.column_stack([np.bincount(weld, weights=comb_fit[:, c], minlength=n_u) / mult for c in range(3)])

    # Lock the bottom & lateral-deltoid border of the local body_band submesh so it stitches C2 into the chest/deltoid/back
    # WITHOUT touching the lateral deltoid cap (`|X| >= 0.198m`) or flattening the upper clavicular pec (`Z <= 1.608m` anteriorly)!
    lean_hd = float(np.clip(1.0 - adipose_gate, 0.0, 1.0))
    low_border_comb = np.zeros(len(comb_ref), dtype=bool)
    bx_loc, by_loc, bz_loc = rest_base_high[body_band_v].T
    if lean_hd > 0.02:
        # Place anterior border BELOW the clavicles (`bz_loc <= 1.564m`) so clavicular heads, sternal notch & supraclavicular
        # fossae (`Z = 1.575..1.665m`) are sculpted cleanly in posed space without touching lateral deltoid caps (`|X| >= 0.206m`):
        lat_delt_keep = np.abs(bx_loc) >= 0.206
        low_border_comb[:n_b_loc] = (bz_loc <= 1.564) | lat_delt_keep
    else:
        # Also lock lateral/superior deltoid caps (`|X| >= 0.202m`) on `F > 0` (`M050-F100`, `2.032 m` tall) so neck fairing
        # NEVER flattens the restored superior deltoid / acromion caps (`Z = 1.575..1.71 m`)!
        lat_delt_keep = np.abs(bx_loc) >= 0.202
        low_border_comb[:n_b_loc] = (bz_loc <= 1.575) | lat_delt_keep
    border_u = np.isin(np.arange(n_u), weld[low_border_comb])
    border_target = pu[border_u].copy()
    if lean_hd > 0.02:
        w_lat_taper_u = 1.0 - smootherstep((np.abs(ru[:, 0]) - 0.176) / 0.030)
        w_band_u = np.where(border_u, 0.0, smootherstep((ru[:, 2] - 1.564) / 0.026) * np.where(ru[:, 2] < 1.72, w_lat_taper_u, 1.0))
    else:
        w_lat_taper_u = 1.0 - smootherstep((np.abs(ru[:, 0]) - 0.170) / 0.032)
        w_band_u = np.where(border_u, 0.0, smootherstep((ru[:, 2] - 1.575) / 0.035) * np.where(ru[:, 2] < 1.73, w_lat_taper_u, 1.0))

    # Extract coupled head feature masks (ears, micro-apertures, crown 1D Z)
    hm = head_feature_masks or {}
    n_hd = len(rest_base_head)
    ear_l_hd = hm.get("earCompLeftHead", np.zeros(n_hd, dtype=bool))
    ear_r_hd = hm.get("earCompRightHead", np.zeros(n_hd, dtype=bool))
    detail_hd = hm.get("detailPreserveHead", np.zeros(n_hd, dtype=bool))
    inward_oral_hd = hm.get("inwardOralHead", np.zeros(n_hd, dtype=bool))
    orb_l_hd = hm.get("orbRingLeftHead", np.zeros(n_hd, dtype=bool))
    orb_r_hd = hm.get("orbRingRightHead", np.zeros(n_hd, dtype=bool))
    oral_att_hd = hm.get("oralAttachHead", np.zeros(n_hd, dtype=bool))

    # F = 0 Coherent Cranial/Facial Breadth + Canonical Local Feature Identity (`body-reference-family.md §6 & §7 item 3`):
    # Never clamp the upper skull/temples/cheekbones to `1.00x` lean width above a `50cm` hypertrophied neck (`which created a
    # gaunt sunken pinhead and vertical mouth-to-chin creases!`). Instead, carry overall cranial, temple, zygomatic, cheek &
    # mandibular breadth/depth smoothly in proportion to Donor's head/neck scale while locking 100% of local facial feature
    # contours (brow, orbital sockets, nose, philtrum, lips, chin) to canonical (`0` prompt-drift morphing!).
    w_canon_face_u = np.zeros(n_u, dtype=np.float64)
    if lean_hd > 0.02:
        rx_f, ry_f, rz_f = ru.T
        ax_f = np.abs(rx_f)
        gonial_band = (
            smootherstep((ax_f - 0.046) / 0.028)
            * smootherstep((ry_f + 0.058) / 0.032)
            * (1.0 - smootherstep((ry_f - 0.018) / 0.032))
        )
        ant_chin_shelf = (
            smootherstep((-ry_f - 0.048) / 0.026)
            * (1.0 - smootherstep((ax_f - 0.056) / 0.026))
        )
        z_face_floor = (
            1.794
            - 0.026 * ant_chin_shelf
            + 0.022 * gonial_band
            + 0.080 * smootherstep((ry_f - 0.018) / 0.040)
        )
        w_cf_raw = lean_hd * smootherstep((rz_f - z_face_floor) / 0.040)
        for _ in range(18):
            w_cf_raw = 0.52 * w_cf_raw + 0.48 * (np.bincount(es, weights=w_cf_raw[ed], minlength=n_u) / deg)
        upper_skull_u = (rz_f >= 1.882) | ((rz_f >= 1.832) & (ry_f <= -0.055))
        w_canon_face_u = np.where(upper_skull_u, lean_hd, np.clip(w_cf_raw, 0.0, lean_hd))
        for _ in range(14):
            nbr_cf = np.bincount(es, weights=w_canon_face_u[ed], minlength=n_u) / deg
            w_canon_face_u = np.where(upper_skull_u, lean_hd, 0.55 * w_canon_face_u + 0.45 * nbr_cf)
        w_canon_face_u[border_u] = 0.0

        # Measure Donor vs Canonical cranial/zygomatic/neck horizontal breadth & sagittal depth ratios so the head scales
        # coherently across the FULL muscle spectrum (`~0.94-0.97x` on slender M000, `1.00x` on M050, `~1.085x` cranial & `~1.12x` jaw on M100!):
        s_cran_x, s_jaw_x, s_head_y, dy_head_shift = 1.0, 1.0, 1.0, 0.0
        if donor_xyz is not None:
            m_dc = (donor_xyz[:, 2] >= 1.885) & (donor_xyz[:, 2] <= 1.965) & (np.abs(donor_xyz[:, 0]) <= 0.12)
            m_rc = (rz_f >= 1.885) & (rz_f <= 1.965)
            if np.sum(m_dc) >= 20 and np.sum(m_rc) >= 20:
                w_d_cran = float(np.percentile(np.abs(donor_xyz[m_dc, 0]), 96))
                w_r_cran = max(float(np.percentile(ax_f[m_rc], 96)), 1e-4)
                d_d_cran = float(np.percentile(donor_xyz[m_dc, 1], 97) - np.percentile(donor_xyz[m_dc, 1], 3))
                d_r_cran = max(float(np.percentile(ry_f[m_rc], 97) - np.percentile(ry_f[m_rc], 3)), 1e-4)
                # Blend 85% toward Donor's overall skull breadth/depth envelope (clamped safely to [0.94, 1.125]):
                s_cran_x = float(np.clip(1.0 + 0.85 * (w_d_cran / w_r_cran - 1.0), 0.94, 1.125))
                s_head_y = float(np.clip(1.0 + 0.42 * (d_d_cran / d_r_cran - 1.0), 0.95, 1.045))
                yc_d = float(np.percentile(donor_xyz[m_dc, 1], 96))
                yc_r = float(np.percentile(ry_f[m_rc], 96))
                dy_head_shift = float(np.clip(0.75 * (yc_d - yc_r), -0.009, 0.004))
            m_dnk = (donor_xyz[:, 2] >= 1.755) & (donor_xyz[:, 2] <= 1.795) & (np.abs(donor_xyz[:, 0]) <= 0.14)
            m_rnk = (rz_f >= 1.755) & (rz_f <= 1.795) & (ax_f <= 0.12)
            if np.sum(m_dnk) >= 15 and np.sum(m_rnk) >= 15:
                neck_ratio = float(np.percentile(np.abs(donor_xyz[m_dnk, 0]), 94)) / max(float(np.percentile(ax_f[m_rnk], 94)), 1e-4)
                if neck_ratio >= 1.0:
                    # Muscular neck (`M >= 0.5`): carry cranial & athletic gonial jaw breadth upward with neck thickness (`zero gaunt pinhead`):
                    musc_neck = float(np.clip((neck_ratio - 1.02) / 0.16, 0.0, 1.0))
                    s_cran_x = max(s_cran_x, float(np.clip(1.0 + 0.42 * max(0.0, neck_ratio - 1.0), 1.0, 1.135)))
                    jaw_boost = 1.0 + 0.092 * musc_neck
                    s_jaw_x = float(np.clip(max(s_cran_x * jaw_boost, 1.0 + 0.74 * max(0.0, neck_ratio - 1.0)), 0.97, 1.215))
                else:
                    # Slender neck (`M < 0.5`, e.g. M000-F000): slim jaw & temples gently with neck breadth (`zero wide square jaw on a thin neck`):
                    s_cran_x = float(np.clip(0.72 * s_cran_x + 0.28 * (1.0 + 0.35 * (neck_ratio - 1.0)), 0.94, 1.01))
                    s_jaw_x = float(np.clip(0.52 * s_cran_x + 0.48 * (1.0 + 0.55 * (neck_ratio - 1.0)), 0.92, 1.00))
            else:
                s_jaw_x = s_cran_x

        # Smooth global horizontal carrier across the ENTIRE head (`ZERO central_face_lock cliff -> ZERO vertical mouth creases,
        # ZERO gaunt sunken cheeks, and coherent temple/cheekbone/jaw breadth!`):
        y_piv = -0.012
        t_jaw = 1.0 - smootherstep((rz_f - 1.828) / 0.088)  # 1 at jaw/lower cheek -> 0 at upper cranium
        # Keep central nose/mouth feature proportions natural (`gentle 62% carrier at X=0 -> 100% carrier across cheeks/temples/jaw`,
        # varying smoothly over a wide >52mm ramp so zero crease can ever form!):
        lat_carrier = 0.62 + 0.38 * smootherstep(ax_f / 0.052)
        sx_eff = 1.0 + lat_carrier * ((1.0 - t_jaw) * (s_cran_x - 1.0) + t_jaw * (s_jaw_x - 1.0))
        sy_eff = 1.0 + (0.78 + 0.22 * (1.0 - t_jaw)) * (s_head_y - 1.0)

        canon_coupled_pu = ru.copy()
        canon_coupled_pu[:, 0] = rx_f * sx_eff
        canon_coupled_pu[:, 1] = y_piv + (ry_f - y_piv) * sy_eff + dy_head_shift

        # Smooth 65-iteration harmonic neck-to-jaw coupling residual (`unclipped in X/Y so the wider muscular neck meets the
        # carried jaw/cheek smoothly without a shelf!`):
        neck_seed_u = (~border_u) & (w_canon_face_u < 0.16)
        harm_disp_u = np.where(neck_seed_u[:, None], pu - canon_coupled_pu, 0.0)
        free_harm_u = (~border_u) & (~neck_seed_u) & (rz_f < 1.908)
        for _ in range(65):
            nbr_hd = np.column_stack([np.bincount(es, weights=harm_disp_u[ed, c], minlength=n_u) / deg for c in range(3)])
            harm_disp_u[free_harm_u] = 0.97 * nbr_hd[free_harm_u]
        harm_disp_u[rz_f >= 1.908] = 0.0
        harm_taper = (1.0 - smootherstep((rz_f - 1.852) / 0.054))[:, None]
        harm_disp_u[:, 2] = np.where(
            (ry_f < -0.052) & (rz_f > 1.776),
            np.clip(harm_disp_u[:, 2], -0.0008, 0.0035),
            np.clip(harm_disp_u[:, 2], -0.0040, 0.0040),
        )
        canon_coupled_pu += harm_taper * np.clip(harm_disp_u, -0.018, 0.018)
        canon_coupled_pu[np.abs(rx_f) <= 2.5e-4, 0] = 0.0
        pu = (1.0 - w_canon_face_u[:, None]) * pu + w_canon_face_u[:, None] * canon_coupled_pu

    excl_hd = ear_l_hd | ear_r_hd | detail_hd | inward_oral_hd
    excl_u = np.isin(np.arange(n_u), weld[n_b_loc + np.flatnonzero(excl_hd)])
    hops_excl_u = bfs_hop_distance(n_u, adj, excl_u)
    w_obs_polish_u = w_band_u * (1.0 - w_canon_face_u) * smootherstep(np.clip(hops_excl_u.astype(np.float64) / 1.5, 0.0, 1.0))

    # Capture crisp canonical high-frequency local detail (eyelid crease, nostril rim, philtrum, lip vermilion, chin button)
    ru_smooth = ru.copy()
    for _ in range(10):
        ru_smooth = 0.50 * ru_smooth + 0.50 * np.column_stack([np.bincount(es, weights=ru_smooth[ed, c], minlength=n_u) / deg for c in range(3)])
    canon_local_detail_u = ru - ru_smooth

    if donor_xyz is not None and donor_tri is not None:
        # Build clean full-scale Donor head/neck BVH excluding ONLY Meshy's fused ear-blobs & fused eye/nostril/lip slits!
        dtc = donor_xyz[donor_tri].mean(axis=1)
        dcx, dcy, dcz = dtc.T
        dv = donor_xyz[donor_tri]
        dn_raw = np.cross(dv[:, 1] - dv[:, 0], dv[:, 2] - dv[:, 0])
        dn = dn_raw / np.maximum(np.linalg.norm(dn_raw, axis=1, keepdims=True), 1e-12)
        is_ext_full_hd = (float(adipose_gate) > 0.80) and (abs(float(muscle_gate) - 0.50) > 0.10)
        z_np_min = 1.849 if is_ext_full_hd else 1.860
        don_ear_blob = (dcz >= 1.860) & (dcz <= 1.948) & (dcy >= -0.028) & (dcy <= 0.048) & (np.abs(dcx) >= 0.085)
        don_eye_slit = (dcz >= 1.905) & (dcz <= 1.9185) & (np.abs(dcx) >= 0.016) & (np.abs(dcx) <= 0.048) & (dcy <= -0.095)
        don_nostril_plug = (dcz >= z_np_min) & (dcz <= 1.878) & (np.abs(dcx) <= 0.023) & (dcy <= -0.114) & (dn[:, 2] < -0.28 if is_ext_full_hd else dn[:, 2] < -0.32)
        don_lip_slit = (dcz >= 1.843) & (dcz <= 1.855) & (np.abs(dcx) <= 0.032) & (dcy <= -0.112)
        dcx_cap = 0.23 if lean_hd > 0.02 else 0.28
        dcz_min = 1.54 if lean_hd > 0.02 else 1.55
        don_keep_f = (dcz >= dcz_min) & (np.abs(dcx) <= dcx_cap) & (~don_ear_blob) & (~don_eye_slit) & (~don_nostril_plug) & (~don_lip_slit)
        uv_d, inv_d = np.unique(donor_tri[don_keep_f].ravel(), return_inverse=True)
        pts_d = donor_xyz[uv_d].copy()
        dbvh = BVHTree.FromPolygons(pts_d.tolist(), inv_d.reshape(-1, 3).tolist(), all_triangles=True)

        # Unfold canonical horizontal under-jaw rings (ru_z ~ 1.793m, ru_y in -0.102..-0.020m) smoothly downward in Z
        # BEFORE 3D ray refinement so headSkin's quad rows cover Z=1.748..1.806m without leaving stretched gaps over the double-chin!
        rx_u, ry_u, rz_u = ru.T
        ax_u = np.abs(rx_u)
        w_uj_unfold = (
            (1.0 - border_u.astype(np.float64))
            * smootherstep((rz_u - 1.766) / 0.016)
            * (1.0 - smootherstep((rz_u - 1.805) / 0.012))
            * smootherstep((ry_u + 0.102) / 0.048)
            * (1.0 - smootherstep((ry_u + 0.012) / 0.024))
            * (1.0 - smootherstep((ax_u - 0.068) / 0.022))
        )
        pu[:, 2] -= (0.0135 * float(np.clip(adipose_gate, 0.0, 1.0))) * w_uj_unfold

        in_subm_zone = (rz_u >= 1.738) & (rz_u <= 1.836) & (ry_u <= -0.022) & (ax_u <= 0.088)
        z_cand_min = 1.635 - 0.052 * lean_hd

        # On lean/muscular builds (`lean_hd > 0.02`), evaluate neck/clavicle/upper-trap rays in TRUE POSED SPACE (`42.8mm` A-pose->Donor offset!)
        # so raycasting NEVER shrinks the 50.45cm collar/upper-trap breadth or erases clavicles & sternocleidomastoid V-tendons!
        use_posed_frame = (
            lean_hd > 0.02
            and posed_base_high is not None
            and jac_high is not None
            and posed_base_head is not None
            and jac_head is not None
        )
        comb_p0_u = None
        comb_jac_u = None
        if use_posed_frame:
            comb_p0_raw = np.vstack([posed_base_high[body_band_v], posed_base_head])
            comb_jac_raw = np.concatenate([jac_high[body_band_v], jac_head], axis=0)
            comb_p0_u = np.column_stack([np.bincount(weld, weights=comb_p0_raw[:, c], minlength=n_u) / mult for c in range(3)])
            comb_jac_u = np.zeros((n_u, 3, 3), dtype=np.float64)
            for r_i in range(3):
                for c_i in range(3):
                    comb_jac_u[:, r_i, c_i] = np.bincount(weld, weights=comb_jac_raw[:, r_i, c_i], minlength=n_u) / mult

        for gain_proj in ((0.88, 0.80, 0.72) if use_posed_frame else (0.82, 0.76, 0.68)):
            eval_pu = comb_p0_u + np.einsum("uij,uj->ui", comb_jac_u, pu - ru) if use_posed_frame else pu
            v_t = eval_pu[wtri]
            fn = np.cross(v_t[:, 1] - v_t[:, 0], v_t[:, 2] - v_t[:, 0])
            vn = np.zeros((n_u, 3), dtype=np.float64)
            for k in range(3):
                for c in range(3):
                    np.add.at(vn[:, c], wtri[:, k], fn[:, c])
            vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)
            vn_sharp = vn.copy()
            for _ in range(2):
                vn = 0.55 * vn + 0.45 * np.column_stack([np.bincount(es, weights=vn[ed, c], minlength=n_u) / deg for c in range(3)])
                vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)

            cand_u = np.flatnonzero((w_obs_polish_u > 0.03) & (ru[:, 2] >= z_cand_min))
            disp_u = np.zeros((n_u, 3), dtype=np.float64)
            skull_ctr = np.array([0.0, -0.008, 1.925], dtype=np.float64)
            sharp_mix = 0.45 + 0.30 * lean_hd
            for ui in cand_u:
                p0 = eval_pu[ui]
                n0 = (1.0 - sharp_mix) * vn[ui] + sharp_mix * vn_sharp[ui]
                if abs(ru[ui, 0]) <= 2.5e-4:
                    n0[0] = 0.0
                n0 /= max(float(np.linalg.norm(n0)), 1e-8)
                if ru[ui, 2] >= 1.875:
                    rad_v = p0 - skull_ctr
                    rad_v /= max(float(np.linalg.norm(rad_v)), 1e-8)
                    rdir = (0.65 + 0.17 * lean_hd) * n0 + (0.35 - 0.17 * lean_hd) * rad_v
                elif in_subm_zone[ui]:
                    jaw_hub = np.array([0.0, -0.035, 1.832], dtype=np.float64)
                    rad_v = p0 - jaw_hub
                    rad_v /= max(float(np.linalg.norm(rad_v)), 1e-8)
                    rdir = 0.78 * n0 + 0.22 * rad_v
                elif use_posed_frame:
                    # True 3D surface normal (`full n_z` on upward traps & clavicles + sharp SCM V-tendon normals!)
                    rdir = n0.copy()
                else:
                    cy_c = -0.025 * float(smoothstep((ru[ui, 2] - 1.73) / 0.06))
                    rad_v = np.array([p0[0], p0[1] - cy_c, 0.55 * n0[2]], dtype=np.float64)
                    rad_v /= max(float(np.linalg.norm(rad_v)), 1e-8)
                    rdir = 0.65 * n0 + 0.35 * rad_v
                rdir /= max(float(np.linalg.norm(rdir)), 1e-8)

                vecs = []
                cos_min_h = 0.45 if use_posed_frame else 0.20
                for s_m in ((1.0, -1.0) if abs(p0[0]) > 1e-3 else (1.0,)):
                    pm = np.array([s_m * p0[0], p0[1], p0[2]])
                    dm = np.array([s_m * rdir[0], rdir[1], rdir[2]])
                    orig_back = 0.034 if use_posed_frame else 0.032
                    t_min_h = -0.030 if use_posed_frame else -0.028
                    orig = Vector((pm - orig_back * dm).tolist())
                    dvec = Vector(dm.tolist())
                    hit, hn, _, _ = dbvh.ray_cast(orig, dvec, 0.095)
                    if hit is not None and float(hn.dot(dvec)) > cos_min_h:
                        dv_hit = np.asarray(hit, dtype=np.float64) - pm
                        t_signed = float(dv_hit @ dm)
                        if t_min_h <= t_signed <= 0.048:
                            vecs.append(np.array([s_m * dv_hit[0], dv_hit[1], dv_hit[2]]))
                    elif in_subm_zone[ui] and lean_hd <= 0.50:
                        nh, nhn, _, ndist = dbvh.find_nearest(Vector(pm.tolist()), 0.024)
                        if nh is not None and float(ndist) < 0.024 and float(np.dot(np.asarray(nhn, dtype=np.float64), dm)) > 0.28:
                            dv_n = np.asarray(nh, dtype=np.float64) - pm
                            vecs.append(np.array([s_m * dv_n[0], dv_n[1], dv_n[2]]))
                if vecs:
                    disp_u[ui] = (gain_proj * w_obs_polish_u[ui]) * np.mean(vecs, axis=0)

            sm_d_w = 0.06 if use_posed_frame else 0.28
            disp_u = np.where(
                border_u[:, None],
                0.0,
                (1.0 - sm_d_w) * disp_u + sm_d_w * np.column_stack([np.bincount(es, weights=disp_u[ed, c], minlength=n_u) / deg for c in range(3)]),
            )
            if use_posed_frame:
                nz_c = np.flatnonzero(np.linalg.norm(disp_u, axis=1) > 1e-5)
                if len(nz_c):
                    jc_u = comb_jac_u[nz_c]
                    jtj_u = np.einsum("nji,njk->nik", jc_u, jc_u) + 0.030 * np.eye(3)[None, :, :]
                    pu[nz_c] += np.linalg.solve(jtj_u, np.einsum("nji,nj->ni", jc_u, disp_u[nz_c])[:, :, None])[:, :, 0]
            else:
                pu += disp_u
            pu[border_u] = border_target
            pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

            # Tangential quad-spacing relaxation + crease-preserving fairing (protects submental sulcus, jawline, brow, cheeks & SCM neck cords!):
            fair_w = w_obs_polish_u
            fz_idx = np.flatnonzero(fair_w > 0.02)
            if len(fz_idx):
                wfz = fair_w[fz_idx, None]
                subm_f = in_subm_zone[fz_idx, None]
                base_conc = 0.015 if use_posed_frame else 0.22
                base_conv = 0.010 if use_posed_frame else 0.12
                for _ in range(4 if use_posed_frame else 5):
                    v_t2 = pu[wtri]
                    fn2 = np.cross(v_t2[:, 1] - v_t2[:, 0], v_t2[:, 2] - v_t2[:, 0])
                    vn2 = np.zeros((n_u, 3), dtype=np.float64)
                    for k in range(3):
                        for c in range(3):
                            np.add.at(vn2[:, c], wtri[:, k], fn2[:, c])
                    vn2 /= np.maximum(np.linalg.norm(vn2, axis=1, keepdims=True), 1e-12)
                    nbr_p = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg for c in range(3)])
                    dp = nbr_p[fz_idx] - pu[fz_idx]
                    nv = vn2[fz_idx]
                    dot_n = np.einsum("ni,ni->n", dp, nv)[:, None]
                    dp_n = dot_n * nv
                    dp_t = dp - dp_n
                    conc_g = np.where(subm_f, 0.04, base_conc)
                    conv_g = np.where(subm_f, 0.04, base_conv)
                    tan_g = 0.38 if use_posed_frame else 0.42
                    pu[fz_idx] += wfz * (tan_g * dp_t + np.where(dot_n > 0.0, conc_g, conv_g) * dp_n)
                    pu[border_u] = border_target
                    pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

        # Direct 3D horizontal/submental ray lock on double-chin roll (`F > 0` builds ONLY! On `F = 0` lean builds, Donor's lower-set
        # chin button at Z~1.785m sits at the height of canonical submental throat skin, so horizontal +Y rays falsely pulled throat skin
        # forward into a fleshy double-chin pad!):
        ant_subm_u = (
            np.flatnonzero(
                (w_obs_polish_u > 0.15)
                & (~border_u)
                & (pu[:, 2] >= 1.732)
                & (pu[:, 2] <= 1.838)
                & (pu[:, 1] <= -0.032)
                & (np.abs(pu[:, 0]) <= 0.078)
            )
            if lean_hd <= 0.50
            else np.array([], dtype=np.int64)
        )
        if len(ant_subm_u):
            ray_py_h = Vector((0.0, 1.0, 0.0))
            dy_subm = np.zeros(n_u, dtype=np.float64)
            eval_subm = (comb_p0_u + np.einsum("uij,uj->ui", comb_jac_u, pu - ru)) if use_posed_frame else pu
            for ui in ant_subm_u:
                px_h, py_h, pz_h = float(eval_subm[ui, 0]), float(eval_subm[ui, 1]), float(eval_subm[ui, 2])
                ys_hit = []
                for s_m in ((1.0, -1.0) if abs(px_h) > 1e-3 else (1.0,)):
                    hh, hnh, _, _ = dbvh.ray_cast(Vector((s_m * px_h, -0.22, pz_h)), ray_py_h, 0.20)
                    if hh is not None and float(hnh.y) < -0.22 and abs(float(hh.y) - py_h) < 0.018:
                        ys_hit.append(float(hh.y))
                if ys_hit:
                    z_taper_subm = 1.0 if lean_hd <= 0.02 else float(
                        smootherstep(np.array([(pz_h - 1.742) / 0.032]))[0] * (1.0 - w_canon_face_u[ui])
                    )
                    dy_subm[ui] = (0.52 * z_taper_subm) * (float(np.mean(ys_hit)) - py_h)
            for _ in range(3 if lean_hd > 0.02 else 4):
                dy_subm = np.where(border_u, 0.0, (1.0 - w_canon_face_u) * (0.55 * dy_subm + 0.45 * (np.bincount(es, weights=dy_subm[ed], minlength=n_u) / deg)))
            pu[:, 1] += dy_subm
            pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

        # Tangential-only C1 collar-seam spacing + final crisp posed-space SCM V-tendon & posterior nuchal/occipital relief lock:
        if True:
            seam_comb_u = np.isin(np.arange(n_u), weld[n_b_loc + seam_head])
            hops_collar_u = bfs_hop_distance(n_u, adj, seam_comb_u)
            w_collar_c1 = (
                lean_hd
                * (1.0 - border_u.astype(np.float64))
                * (1.0 - w_canon_face_u)
                * (1.0 - smootherstep(np.clip(hops_collar_u.astype(np.float64) / 2.2, 0.0, 1.0)))
                * (1.0 - smootherstep((ru[:, 2] - 1.755) / 0.020))
            )
            cc_idx = np.flatnonzero(w_collar_c1 > 0.02)
            if len(cc_idx):
                wcc = w_collar_c1[cc_idx, None]
                for _ in range(5):
                    v_tc = pu[wtri]
                    fnc = np.cross(v_tc[:, 1] - v_tc[:, 0], v_tc[:, 2] - v_tc[:, 0])
                    vnc = np.zeros((n_u, 3), dtype=np.float64)
                    for k in range(3):
                        for c in range(3):
                            np.add.at(vnc[:, c], wtri[:, k], fnc[:, c])
                    vnc /= np.maximum(np.linalg.norm(vnc, axis=1, keepdims=True), 1e-12)
                    nbr_cc = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg for c in range(3)])
                    dp_cc = nbr_cc[cc_idx] - pu[cc_idx]
                    nvc = vnc[cc_idx]
                    dp_ccn = np.einsum("ni,ni->n", dp_cc, nvc)[:, None] * nvc
                    pu[cc_idx] += wcc * (0.42 * (dp_cc - dp_ccn))
                    pu[border_u] = border_target
                    pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

            # Orthogonal 2-mm Anterior Neck / SCM Tendon / Suprasternal Notch / Supraclavicular Hollow / S-Clavicle Heightfield Lock
            # across the unified welded `bodySkin + headSkin` mesh (`eliminates puffy medial clavicle blobs & wavy collarbones!`):
            if use_posed_frame and comb_p0_u is not None and comb_jac_u is not None:
                xg_nk = np.linspace(0.000, 0.188, 95)  # 2 mm X spacing
                zg_nk = np.linspace(1.558, 1.778, 111)  # 2 mm Z spacing across clavicles, sternal notch, supraclavicular fossae & SCMs
                yg_nk = np.full((len(xg_nk), len(zg_nk)), np.nan, dtype=np.float64)
                for xi_n, xv_n in enumerate(xg_nk):
                    for zi_n, zv_n in enumerate(zg_nk):
                        ys_n = []
                        for s_n in ((1.0, -1.0) if xv_n > 1e-4 else (1.0,)):
                            rh_n, rn_n, _, _ = dbvh.ray_cast(
                                Vector((s_n * float(xv_n), -0.35, float(zv_n))), Vector((0.0, 1.0, 0.0)), 0.34
                            )
                            if rh_n is not None and rh_n.y < -0.015 and rn_n.y < -0.10:
                                ys_n.append(float(rh_n.y))
                        if ys_n:
                            yg_nk[xi_n, zi_n] = float(np.mean(ys_n))
                    fn_x = np.isfinite(yg_nk[xi_n])
                    if np.sum(fn_x) >= 6:
                        yg_nk[xi_n] = np.interp(zg_nk, zg_nk[fn_x], yg_nk[xi_n, fn_x])
                for zi_n in range(len(zg_nk)):
                    fn_z = np.isfinite(yg_nk[:, zi_n])
                    if np.sum(fn_z) >= 6:
                        yg_nk[:, zi_n] = np.interp(xg_nk, xg_nk[fn_z], yg_nk[fn_z, zi_n])

                if np.all(np.isfinite(yg_nk)):
                    yg_nk_bg = yg_nk.copy()
                    for _ in range(12):
                        yg_nk_bg[1:-1, 1:-1] = 0.25 * (
                            yg_nk_bg[:-2, 1:-1] + yg_nk_bg[2:, 1:-1] + yg_nk_bg[1:-1, :-2] + yg_nk_bg[1:-1, 2:]
                        )
                    # +105% anatomical high-pass contrast on suprasternal jugular notch, supraclavicular hollows, SCM V-tendons & clavicular ridge:
                    yg_nk_sharp = yg_nk + 1.05 * np.clip(yg_nk - yg_nk_bg, -0.0062, 0.0068)
                    sulc_nk = np.clip(yg_nk - yg_nk_bg, 0.0, 0.012)

                    for pass_scm, gain_scm in enumerate((0.96, 0.90)):
                        eval_scm = comb_p0_u + np.einsum("uij,uj->ui", comb_jac_u, pu - ru)
                        ax_s = np.abs(eval_scm[:, 0])
                        pz_s = eval_scm[:, 2]
                        dx_scm_s = np.zeros(n_u, dtype=np.float64)
                        if pass_scm == 0:
                            scm_cand = np.flatnonzero(
                                (~border_u)
                                & (w_canon_face_u < 0.25)
                                & (ax_s >= 0.006)
                                & (ax_s <= 0.145)
                                & (pz_s >= 1.595)
                                & (pz_s <= 1.755)
                                & (eval_scm[:, 1] < -0.035)
                            )
                            for ui_s in scm_cand:
                                xi_s = int(np.clip(round((ax_s[ui_s] - xg_nk[0]) / (xg_nk[1] - xg_nk[0])), 4, len(xg_nk) - 5))
                                zi_s = int(np.clip(round((pz_s[ui_s] - zg_nk[0]) / (zg_nk[1] - zg_nk[0])), 2, len(zg_nk) - 3))
                                win_s = sulc_nk[xi_s - 4 : xi_s + 5, zi_s]
                                kx_s = int(np.argmax(win_s))
                                if win_s[kx_s] > 0.00040:
                                    dx_scm_s[ui_s] = np.sign(eval_scm[ui_s, 0]) * 0.45 * float(xg_nk[xi_s - 4 + kx_s] - ax_s[ui_s])
                        ax_qs = np.clip(ax_s + np.sign(eval_scm[:, 0]) * dx_scm_s, xg_nk[0], xg_nk[-1])
                        xf_s = np.clip((ax_qs - xg_nk[0]) / (xg_nk[1] - xg_nk[0]), 0.0, len(xg_nk) - 1.0001)
                        zf_s = np.clip((pz_s - zg_nk[0]) / (zg_nk[1] - zg_nk[0]), 0.0, len(zg_nk) - 1.0001)
                        x0_s, z0_s = xf_s.astype(np.int64), zf_s.astype(np.int64)
                        tx_s, tz_s = xf_s - x0_s, zf_s - z0_s
                        y_nk_tgt = (
                            (1.0 - tx_s) * ((1.0 - tz_s) * yg_nk_sharp[x0_s, z0_s] + tz_s * yg_nk_sharp[x0_s, z0_s + 1])
                            + tx_s * ((1.0 - tz_s) * yg_nk_sharp[x0_s + 1, z0_s] + tz_s * yg_nk_sharp[x0_s + 1, z0_s + 1])
                        )
                        w_ant_nk = (
                            lean_hd
                            * (1.0 - border_u.astype(np.float64))
                            * (1.0 - w_canon_face_u)
                            * smootherstep((pz_s - 1.568) / 0.016)
                            * (1.0 - smootherstep((pz_s - 1.768) / 0.020))
                            * (1.0 - smootherstep((ax_s - 0.178) / 0.018))
                            * smootherstep((-eval_scm[:, 1] - 0.022) / 0.026)
                        )
                        nz_scm = np.flatnonzero(w_ant_nk > 0.02)
                        if len(nz_scm):
                            disp_scm = np.zeros((len(nz_scm), 3), dtype=np.float64)
                            disp_scm[:, 0] = w_ant_nk[nz_scm] * dx_scm_s[nz_scm]
                            disp_scm[:, 1] = gain_scm * w_ant_nk[nz_scm] * (y_nk_tgt[nz_scm] - eval_scm[nz_scm, 1])
                            jc_s = comb_jac_u[nz_scm]
                            jtj_s = np.einsum("nji,njk->nik", jc_s, jc_s) + 0.022 * np.eye(3)[None, :, :]
                            pu[nz_scm] += np.linalg.solve(jtj_s, np.einsum("nji,nj->ni", jc_s, disp_scm)[:, :, None])[:, :, 0]
                            pu[border_u] = border_target
                            pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

                # Orthogonal 2-mm Posterior Nape / Sub-Occipital Crease / Paired Nuchal Columns / C7 Heightfield Lock
                # strictly on backward-facing (`vn_y > 0.62`) central nape vertices (`zero pull on lateral neck Profile!`):
                xg_np = np.linspace(0.000, 0.128, 65)
                zg_np = np.linspace(1.560, 1.862, 152)
                yg_np = np.full((len(xg_np), len(zg_np)), np.nan, dtype=np.float64)
                for xi_p, xv_p in enumerate(xg_np):
                    for zi_p, zv_p in enumerate(zg_np):
                        ys_p = []
                        for s_p in ((1.0, -1.0) if xv_p > 1e-4 else (1.0,)):
                            rh_p, rn_p, _, _ = dbvh.ray_cast(
                                Vector((s_p * float(xv_p), 0.36, float(zv_p))), Vector((0.0, -1.0, 0.0)), 0.35
                            )
                            if rh_p is not None and rh_p.y > 0.020 and rn_p.y > 0.45:
                                ys_p.append(float(rh_p.y))
                        if ys_p:
                            yg_np[xi_p, zi_p] = float(np.mean(ys_p))
                yg_np_valid = np.isfinite(yg_np)
                for xi_p in range(len(xg_np)):
                    fp_x = np.isfinite(yg_np[xi_p])
                    if np.sum(fp_x) >= 6:
                        yg_np[xi_p] = np.interp(zg_np, zg_np[fp_x], yg_np[xi_p, fp_x])
                for zi_p in range(len(zg_np)):
                    fp_z = np.isfinite(yg_np[:, zi_p])
                    if np.sum(fp_z) >= 4:
                        yg_np[:, zi_p] = np.interp(xg_np, xg_np[fp_z], yg_np[fp_z, zi_p])

                if np.sum(yg_np_valid) >= 200:
                    if not np.all(np.isfinite(yg_np)):
                        yg_np = np.where(np.isfinite(yg_np), yg_np, float(np.nanmedian(yg_np)))
                    yg_np_bg = yg_np.copy()
                    for _ in range(10):
                        yg_np_bg[1:-1, 1:-1] = 0.25 * (
                            yg_np_bg[:-2, 1:-1] + yg_np_bg[2:, 1:-1] + yg_np_bg[1:-1, :-2] + yg_np_bg[1:-1, 2:]
                        )
                    nape_hp_gain = 0.80 + 0.38 * (1.0 - lean_hd)
                    yg_np_sharp = yg_np + nape_hp_gain * np.clip(yg_np - yg_np_bg, -0.0056, 0.0058)
                    sulc_np = np.clip(yg_np_bg - yg_np, 0.0, 0.010)
                    for pass_np, gain_np in enumerate((0.90, 0.84)):
                        eval_np = comb_p0_u + np.einsum("uij,uj->ui", comb_jac_u, pu - ru)
                        vt_np = eval_np[wtri]
                        fn_np = np.cross(vt_np[:, 1] - vt_np[:, 0], vt_np[:, 2] - vt_np[:, 0])
                        vn_np = np.zeros((n_u, 3), dtype=np.float64)
                        for k_np in range(3):
                            for c_np in range(3):
                                np.add.at(vn_np[:, c_np], wtri[:, k_np], fn_np[:, c_np])
                        vn_np /= np.maximum(np.linalg.norm(vn_np, axis=1, keepdims=True), 1e-12)
                        ax_np = np.abs(eval_np[:, 0])
                        pz_np = eval_np[:, 2]
                        x_np_cap = 0.052 + 0.038 * (1.0 - lean_hd) + 0.056 * (1.0 - smootherstep((pz_np - 1.655) / 0.065))
                        dx_np_s = np.zeros(n_u, dtype=np.float64)
                        dz_np_s = np.zeros(n_u, dtype=np.float64)
                        if pass_np == 0:
                            np_cand = np.flatnonzero(
                                (~border_u)
                                & (w_canon_face_u < 0.35)
                                & (ax_np >= 0.005)
                                & (ax_np <= x_np_cap - 0.006)
                                & (pz_np >= 1.575)
                                & (pz_np <= 1.852)
                                & (vn_np[:, 1] > 0.65)
                            )
                            for ui_n in np_cand:
                                xi_n = int(np.clip(round((ax_np[ui_n] - xg_np[0]) / (xg_np[1] - xg_np[0])), 3, len(xg_np) - 4))
                                zi_n = int(np.clip(round((pz_np[ui_n] - zg_np[0]) / (zg_np[1] - zg_np[0])), 3, len(zg_np) - 4))
                                if not yg_np_valid[xi_n, zi_n]:
                                    continue
                                win_nx = sulc_np[xi_n - 3 : xi_n + 4, zi_n]
                                kx_n = int(np.argmax(win_nx))
                                if win_nx[kx_n] > 0.00038:
                                    dx_np_s[ui_n] = np.sign(eval_np[ui_n, 0]) * 0.38 * float(xg_np[xi_n - 3 + kx_n] - ax_np[ui_n])
                                win_nz = sulc_np[xi_n, zi_n - 3 : zi_n + 4]
                                kz_n = int(np.argmax(win_nz))
                                if win_nz[kz_n] > 0.00038:
                                    dz_np_s[ui_n] = 0.38 * float(zg_np[zi_n - 3 + kz_n] - pz_np[ui_n])
                        ax_qn = np.clip(ax_np + np.sign(eval_np[:, 0]) * dx_np_s, xg_np[0], xg_np[-1])
                        pz_qn = np.clip(pz_np + dz_np_s, zg_np[0], zg_np[-1])
                        xf_n = np.clip((ax_qn - xg_np[0]) / (xg_np[1] - xg_np[0]), 0.0, len(xg_np) - 1.0001)
                        zf_n = np.clip((pz_qn - zg_np[0]) / (zg_np[1] - zg_np[0]), 0.0, len(zg_np) - 1.0001)
                        x0_n, z0_n = xf_n.astype(np.int64), zf_n.astype(np.int64)
                        tx_n, tz_n = xf_n - x0_n, zf_n - z0_n
                        y_np_tgt = (
                            (1.0 - tx_n) * ((1.0 - tz_n) * yg_np_sharp[x0_n, z0_n] + tz_n * yg_np_sharp[x0_n, z0_n + 1])
                            + tx_n * ((1.0 - tz_n) * yg_np_sharp[x0_n + 1, z0_n] + tz_n * yg_np_sharp[x0_n + 1, z0_n + 1])
                        )
                        w_post_nk = (
                            (1.0 - border_u.astype(np.float64))
                            * (1.0 - w_canon_face_u)
                            * smootherstep((pz_np - 1.568) / 0.016)
                            * (1.0 - smootherstep((pz_np - 1.855) / 0.020))
                            * (1.0 - smootherstep((ax_np - x_np_cap) / 0.014))
                            * smootherstep((vn_np[:, 1] - 0.58) / 0.22)
                            * yg_np_valid[x0_n, z0_n].astype(np.float64)
                        )
                        nz_np = np.flatnonzero(w_post_nk > 0.02)
                        if len(nz_np):
                            disp_np = np.zeros((len(nz_np), 3), dtype=np.float64)
                            disp_np[:, 0] = w_post_nk[nz_np] * dx_np_s[nz_np]
                            disp_np[:, 1] = np.clip(gain_np * w_post_nk[nz_np] * (y_np_tgt[nz_np] - eval_np[nz_np, 1]), -0.008, 0.008)
                            disp_np[:, 2] = w_post_nk[nz_np] * dz_np_s[nz_np]
                            jc_n = comb_jac_u[nz_np]
                            jtj_n = np.einsum("nji,njk->nik", jc_n, jc_n) + 0.024 * np.eye(3)[None, :, :]
                            pu[nz_np] += np.linalg.solve(jtj_n, np.einsum("nji,nj->ni", jc_n, disp_np)[:, :, None])[:, :, 0]
                            pu[border_u] = border_target
                            pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

                # Taut `F = 0` submental plane (`signoff-05` Col 3): tuck any downward-hanging convex submental belly (`Z=1.756..1.804m,
                # Y=-0.106..-0.044m`) cleanly upward (`+Z`) & slightly inward (`+Y`) toward a crisp, lean cervico-mental angle!
                if lean_hd > 0.50:
                    chin_tip_m = (np.abs(pu[:, 0]) <= 0.016) & (ru[:, 2] >= 1.798) & (ru[:, 2] <= 1.816) & (pu[:, 1] < -0.100)
                    z_chin_bot = float(np.percentile(pu[chin_tip_m, 2], 20)) if np.sum(chin_tip_m) >= 3 else 1.798
                    u_subm_y = np.clip((pu[:, 1] - (-0.112)) / (-0.046 - (-0.112)), 0.0, 1.0)
                    z_taut_plane = z_chin_bot - 0.0075 * u_subm_y - 0.0035 * np.clip((np.abs(pu[:, 0]) / 0.058) ** 2, 0.0, 1.2)
                    w_taut_subm = (
                        lean_hd
                        * (1.0 - border_u.astype(np.float64))
                        * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.056) / 0.022))
                        * smootherstep((ru[:, 2] - 1.754) / 0.018)
                        * (1.0 - smootherstep((ru[:, 2] - 1.804) / 0.012))
                        * smootherstep((-pu[:, 1] - 0.044) / 0.018)
                        * (1.0 - smootherstep((-pu[:, 1] - 0.106) / 0.012))
                    )
                    ts_m = (w_taut_subm > 0.02) & (pu[:, 2] < z_taut_plane)
                    if np.any(ts_m):
                        pu[ts_m, 2] += 0.88 * w_taut_subm[ts_m] * (z_taut_plane[ts_m] - pu[ts_m, 2])
                        pu[ts_m, 1] += 0.22 * w_taut_subm[ts_m] * (z_taut_plane[ts_m] - pu[ts_m, 2])
                        pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

                # Smooth ONLY anterior residual submental double-step (`Z=1.77..1.82m, Y<-0.05m`, NEVER smoothing posterior nape cords!):
                w_subm_only_fair = (
                    lean_hd
                    * (1.0 - border_u.astype(np.float64))
                    * (1.0 - 0.85 * w_canon_face_u)
                    * smootherstep((-ru[:, 1] - 0.048) / 0.022)
                    * (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.068) / 0.022))
                    * smootherstep((ru[:, 2] - 1.762) / 0.018)
                    * (1.0 - smootherstep((ru[:, 2] - 1.822) / 0.018))
                )
                sn_idx = np.flatnonzero(w_subm_only_fair > 0.02)
                if len(sn_idx):
                    wsn = w_subm_only_fair[sn_idx, None]
                    for _ in range(18):
                        nbr_sn = np.column_stack([np.bincount(es, weights=pu[ed, c], minlength=n_u) / deg for c in range(3)])
                        pu[sn_idx] += (0.50 * wsn) * (nbr_sn[sn_idx] - pu[sn_idx])
                        pu[border_u] = border_target
                        pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

        # On `is_ext_full_hd` (`M000-F100` / `M100-F100`, where a lower-set Donor nose can pull outer alar/philtrum vertices `-8 mm`
        # downward against stationary `detail_hd` nostril cavities), harmonize displacement `df = pu - ru` smoothly across the
        # nostril-cavity / columella / sub-nasal-sill / philtrum transition AND fade `w_detail_u` continuously by `(1 - w_nas_df)`
        # so zero boolean step or horizontal sub-nostril line ever forms on `signoff-05`:
        w_nas_df = np.zeros(n_u, dtype=np.float64)
        if is_ext_full_hd:
            w_nas_df = (
                (1.0 - smootherstep((np.abs(ru[:, 0]) - 0.025) / 0.010))
                * smootherstep((-ru[:, 1] - 0.076) / 0.014)
                * smootherstep((ru[:, 2] - 1.824) / 0.014)
                * (1.0 - smootherstep((ru[:, 2] - 1.892) / 0.010))
            )
            nas_idx = np.flatnonzero(w_nas_df > 0.01)
            if len(nas_idx):
                df_nas = pu - ru
                wn_col = w_nas_df[nas_idx, None]
                for _ in range(65):
                    nbr_dfn = np.column_stack([np.bincount(es, weights=df_nas[ed, c], minlength=n_u) / deg for c in range(3)])
                    df_nas[nas_idx] += (0.60 * wn_col) * (nbr_dfn[nas_idx] - df_nas[nas_idx])
                    df_nas[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0
                pu[nas_idx] = ru[nas_idx] + df_nas[nas_idx]
                pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

        # Restore crisp canonical micro-feature local relief STRICTLY on inner eyelid margins, nostril plugs & lip slit (1.4-hop feather)
        # so 100% of Donor's heavy masculine supraorbital brow ridge, glabella furrow & malar cheeks remain intact!
        pu_smooth = pu.copy()
        for _ in range(8):
            pu_smooth = 0.50 * pu_smooth + 0.50 * np.column_stack([np.bincount(es, weights=pu_smooth[ed, c], minlength=n_u) / deg for c in range(3)])
        feat_hd = detail_hd
        feat_u = np.isin(np.arange(n_u), weld[n_b_loc + np.flatnonzero(feat_hd)])
        hops_feat_u = bfs_hop_distance(n_u, adj, feat_u)
        w_detail_u = (1.0 - smootherstep(np.clip(hops_feat_u.astype(np.float64) / 1.4, 0.0, 1.0))) * (1.0 - w_nas_df)
        not_inward_u = ~np.isin(np.arange(n_u), weld[n_b_loc + np.flatnonzero(ear_l_hd | ear_r_hd | inward_oral_hd)])
        det_idx = np.flatnonzero((w_detail_u > 0.01) & not_inward_u)
        if len(det_idx):
            wd_col = w_detail_u[det_idx, None]
            pu[det_idx] = (1.0 - 0.82 * wd_col) * pu[det_idx] + (0.82 * wd_col) * (pu_smooth[det_idx] + canon_local_detail_u[det_idx])
            pu[np.abs(ru[:, 0]) <= 2.5e-4, 0] = 0.0

    comb_pol = pu[weld]
    high_out[body_band_v] = comb_pol[:n_b_loc]
    head_out = comb_pol[n_b_loc:].copy()

    # === MIRROR-SYMMETRIC KABSCH SIMILARITY FOLLOW FOR EARS & ORBITAL RINGS (ZERO EXTERIOR MOUTH CORNER SNAP, 0 BAD FACES!) ===
    hweld, _, hedges, hadj, _ = weld_graph(rest_base_head, head_tri, decimals=5)
    nh_u = int(hweld.max()) + 1
    hes, hed = hedges[:, 0], hedges[:, 1]
    hdeg = np.maximum(np.bincount(hes, minlength=nh_u).astype(np.float64), 1.0)
    hmult = np.maximum(np.bincount(hweld, minlength=nh_u).astype(np.float64), 1.0)
    flip_x = np.array([-1.0, 1.0, 1.0], dtype=np.float64)
    flip_mat = np.diag(flip_x)

    # 1) Mirror-symmetric ear follow + gentle lateral helix projection (+2.8mm outward) + OUTSIDE-ONLY 9-hop harmonic feather
    #    (100% of earComp moves as a single exact similarity unit -> ZERO folded concha/ear-canal sliver faces!):
    erl = hm.get("earRootLeftHead")
    err = hm.get("earRootRightHead")
    ecl = hm.get("earCompLeftHead")
    ecr = hm.get("earCompRightHead")
    if erl is not None and err is not None and ecl is not None and ecr is not None and np.any(erl) and np.any(err):
        src_ear_sym = np.vstack([rest_base_head[erl], rest_base_head[err] * flip_x])
        dst_ear_sym = np.vstack([head_out[erl], head_out[err] * flip_x])
        s_e, rot_el_e, tr_el_e = _kabsch_similarity(src_ear_sym, dst_ear_sym, scale_bounds=(0.92, 1.12))
        temple_widen = max(0.0, float(np.mean(head_out[erl, 0] - rest_base_head[erl, 0])))
        lat_ear_push = min(0.0028, 0.16 * temple_widen)
        tr_el_e = tr_el_e + np.array([lat_ear_push, 0.0, 0.0], dtype=np.float64)
        rot_er_e = flip_mat @ rot_el_e @ flip_mat
        tr_er_e = tr_el_e * flip_x

        for ec_m, s_ear, rot_ear, tr_ear in ((ecl, s_e, rot_el_e, tr_el_e), (ecr, s_e, rot_er_e, tr_er_e)):
            ear_placed = s_ear * (rest_base_head[ec_m] @ rot_ear.T) + tr_ear
            ec_u = np.isin(np.arange(nh_u), hweld[ec_m])
            hops_out_e = bfs_hop_distance(nh_u, hadj, ec_u)
            res_ear_u = np.zeros((nh_u, 3), dtype=np.float64)
            ear_delta = ear_placed - head_out[ec_m]
            for c in range(3):
                res_ear_u[:, c] = np.bincount(hweld[ec_m], weights=ear_delta[:, c], minlength=nh_u) / np.maximum(
                    np.bincount(hweld[ec_m], minlength=nh_u), 1.0
                )
            halo_ear_u = (hops_out_e >= 1) & (hops_out_e <= 9)
            for _ in range(60):
                nbr_re = np.column_stack([np.bincount(hes, weights=res_ear_u[hed, c], minlength=nh_u) / hdeg for c in range(3)])
                res_ear_u[halo_ear_u] = nbr_re[halo_ear_u]
            head_out += res_ear_u[hweld]
            head_out[ec_m] = ear_placed

    # 2) Mirror-symmetric orbital socket consistency (<0.15mm residual on BOTH eyes!) + smooth harmonic interior oral pouch follow:
    obl = hm.get("orbRingLeftHead")
    obr = hm.get("orbRingRightHead")
    if obl is not None and obr is not None and np.sum(obl) >= 4 and np.sum(obr) >= 4:
        src_orb_sym = np.vstack([rest_base_head[obl], rest_base_head[obr] * flip_x])
        dst_orb_sym = np.vstack([head_out[obl], head_out[obr] * flip_x])
        s_ob, rot_obl, tr_obl = _kabsch_similarity(src_orb_sym, dst_orb_sym, scale_bounds=(0.92, 1.10))
        rot_obr = flip_mat @ rot_obl @ flip_mat
        tr_obr = tr_obl * flip_x
        for rk_m, rot_o, tr_o in ((obl, rot_obl, tr_obl), (obr, rot_obr, tr_obr)):
            tgt_r = s_ob * (rest_base_head[rk_m] @ rot_o.T) + tr_o
            fm_u = np.isin(np.arange(nh_u), hweld[rk_m])
            hops_fm = bfs_hop_distance(nh_u, hadj, fm_u)
            halo_u = (hops_fm >= 1) & (hops_fm <= 2) & (~np.isin(np.arange(nh_u), hweld[ear_l_hd | ear_r_hd]))
            res_r_u = np.zeros((nh_u, 3), dtype=np.float64)
            r_del = tgt_r - head_out[rk_m]
            for c in range(3):
                res_r_u[:, c] = np.bincount(hweld[rk_m], weights=r_del[:, c], minlength=nh_u) / np.maximum(
                    np.bincount(hweld[rk_m], minlength=nh_u), 1.0
                )
            for _ in range(14):
                nbr_rr = np.column_stack([np.bincount(hes, weights=res_r_u[hed, c], minlength=nh_u) / hdeg for c in range(3)])
                res_r_u[halo_u] = nbr_rr[halo_u]
            head_out += 0.94 * res_r_u[hweld]
            head_out[rk_m] = 0.06 * head_out[rk_m] + 0.94 * tgt_r

    # NOTE: Removed AI-sheet supraorbital brow-ridge / malar raycast override (`w_brow_v`) on lean/muscular builds (`F = 0`):
    # per `body-reference-family.md §6 & §7 item 2`, facial bone identity belongs strictly to `facePresets`, NOT `muscleMass`!
    lean_or = float(np.clip(1.0 - adipose_gate, 0.0, 1.0))

    # Carry ONLY interior hidden oral-cavity pouch vertices harmonically behind the natural lips (ZERO exterior mouth-corner snap, ZERO seam fold!):
    if np.any(inward_oral_hd):
        inw_u = np.isin(np.arange(nh_u), hweld[inward_oral_hd])
        disp_hd_u = np.column_stack(
            [np.bincount(hweld, weights=(head_out - rest_base_head)[:, c], minlength=nh_u) / hmult for c in range(3)]
        )
        for _ in range(45):
            nbr_do = np.column_stack([np.bincount(hes, weights=disp_hd_u[hed, c], minlength=nh_u) / hdeg for c in range(3)])
            disp_hd_u[inw_u] = nbr_do[inw_u]
        head_out[inward_oral_hd] = (rest_base_head + disp_hd_u[hweld])[inward_oral_hd]
        if lean_or > 0.05 and np.sum(oral_att_hd & inward_oral_hd) >= 6:
            or_in_m = oral_att_hd & inward_oral_hd
            s_oa, rot_oa, tr_oa = _kabsch_similarity(rest_base_head[or_in_m], head_out[or_in_m], scale_bounds=(0.92, 1.06))
            tgt_oa = s_oa * (rest_base_head[or_in_m] @ rot_oa.T) + tr_oa
            head_out[or_in_m] = (1.0 - 0.96 * lean_or) * head_out[or_in_m] + (0.96 * lean_or) * tgt_oa

    # Enforce exact +/-X symmetry on midline headSkin vertices:
    head_out[np.abs(rest_base_head[:, 0]) <= 2.5e-4, 0] = 0.0

    # 3) Enforce ONLY the 1D vertical crown stature invariant (`max(Z) == canonical max(Z) == 2.0319m`; X and Y 100% free!)
    z_max_ref = float(rest_base_head[:, 2].max())
    z_max_cur = float(head_out[:, 2].max())
    dz_crown = z_max_ref - z_max_cur
    w_crown_z = smootherstep((rest_base_head[:, 2] - (z_max_ref - 0.032)) / 0.030)
    head_out[:, 2] += dz_crown * w_crown_z
    crown_m = hm.get("crown1dZHead", rest_base_head[:, 2] >= z_max_ref - 0.002)
    if np.any(crown_m):
        i_top = int(np.argmax(rest_base_head[:, 2]))
        head_out[i_top, 2] = rest_base_head[i_top, 2]
        head_out[:, 2] = np.minimum(head_out[:, 2], z_max_ref)

    # Local untangle guard on headSkin (relaxes locally toward neighbor average FIRST, NEVER snapping to 0.0mm lean rest_base_head!):
    hd_conn = weld_connectivity(rest_base_head, head_tri, decimals=5)
    hd_weld, (hes_g, hed_g), hmult_g, hdeg_g = hd_conn
    hdeg_f = np.maximum(hdeg_g.astype(np.float64), 1.0)
    hd_before = self_intersections(rest_base_head, head_tri, hd_weld)
    hd_areas = face_areas(rest_base_head, head_tri)
    hu_pts_g = np.column_stack([np.bincount(hd_weld, weights=head_out[:, c], minlength=len(hmult_g)) / hmult_g for c in range(3)])
    for _ in range(12):
        chk_hd = hu_pts_g[hd_weld].astype(np.float32).astype(np.float64)
        h_si = self_intersections(chk_hd, head_tri, hd_weld) - hd_before
        h_bf = np.flatnonzero(bad_faces(chk_hd, head_tri, hd_areas, hd_conn))
        if not h_si and not len(h_bf):
            head_out = chk_hd
            break
        ff = set(h_bf.tolist())
        for a, b in h_si:
            ff.add(a)
            ff.add(b)
        att = np.zeros(len(hmult_g), dtype=np.float64)
        att[np.unique(hd_weld[head_tri[list(ff)].ravel()])] = 1.0
        for _ in range(2):
            att = np.maximum(att * 0.72, np.bincount(hes_g, weights=att[hed_g], minlength=len(hmult_g)) / hdeg_f)
        for _ in range(4):
            nbr_hg = np.column_stack([np.bincount(hes_g, weights=hu_pts_g[hed_g, c], minlength=len(hmult_g)) / hdeg_f for c in range(3)])
            hu_pts_g += (0.42 * att)[:, None] * (nbr_hg - hu_pts_g)
        head_out = hu_pts_g[hd_weld].astype(np.float32).astype(np.float64)

    # Re-pin exact 1D crown apex Z after untangle:
    i_top = int(np.argmax(rest_base_head[:, 2]))
    head_out[i_top, 2] = rest_base_head[i_top, 2]
    head_out[:, 2] = np.minimum(head_out[:, 2], float(rest_base_head[:, 2].max()))

    if len(coinc_body_v):
        high_out[coinc_body_v] = head_out[seam_head[coinc_seam_s]]
    return high_out.astype(np.float32).astype(np.float64), head_out.astype(np.float32).astype(np.float64)


def pre_untangle_raw_head_features(
    rest_base_head: np.ndarray,
    head_fit_raw: np.ndarray,
    head_tri: np.ndarray,
    head_feature_masks: dict | None = None,
    adipose_gate: float = 1.0,
) -> np.ndarray:
    """Carry hidden interior oral-cavity pouch harmonically & ear pinnae via Kabsch similarity BEFORE the body/head
    guard loop so raw Meshy lip/ear self-crossings (`~203 pairs`) become 0 on step 0 without triggering 40 rollback steps!
    """
    hm = head_feature_masks or {}
    out = head_fit_raw.copy()
    if adipose_gate <= 0.02:
        # At F=0, prevent raw CG temple/ear-exclusion pinch from shrinking canonical cranium/temples/ears before the guard loop:
        z_floor_pre = 1.795 + 0.060 * smootherstep((rest_base_head[:, 1] - 0.010) / 0.040)
        w_pre_canon = smootherstep((rest_base_head[:, 2] - z_floor_pre) / 0.036)[:, None]
        out = (1.0 - w_pre_canon) * out + w_pre_canon * rest_base_head
    hweld, _, hedges, hadj, _ = weld_graph(rest_base_head, head_tri, decimals=5)
    nh_u = int(hweld.max()) + 1
    hes, hed = hedges[:, 0], hedges[:, 1]
    hdeg = np.maximum(np.bincount(hes, minlength=nh_u).astype(np.float64), 1.0)
    hmult = np.maximum(np.bincount(hweld, minlength=nh_u).astype(np.float64), 1.0)
    flip_x = np.array([-1.0, 1.0, 1.0], dtype=np.float64)
    flip_mat = np.diag(flip_x)

    erl, err = hm.get("earRootLeftHead"), hm.get("earRootRightHead")
    ecl, ecr = hm.get("earCompLeftHead"), hm.get("earCompRightHead")
    if erl is not None and err is not None and ecl is not None and ecr is not None and np.any(erl) and np.any(err):
        src_e = np.vstack([rest_base_head[erl], rest_base_head[err] * flip_x])
        dst_e = np.vstack([out[erl], out[err] * flip_x])
        s_e, rot_l, tr_l = _kabsch_similarity(src_e, dst_e, scale_bounds=(0.92, 1.06))
        rot_r = flip_mat @ rot_l @ flip_mat
        tr_r = tr_l * flip_x
        for ec_m, rot_e, tr_e in ((ecl, rot_l, tr_l), (ecr, rot_r, tr_r)):
            ear_p = s_e * (rest_base_head[ec_m] @ rot_e.T) + tr_e
            ec_u = np.isin(np.arange(nh_u), hweld[ec_m])
            hops_e = bfs_hop_distance(nh_u, hadj, ec_u)
            res_u = np.zeros((nh_u, 3), dtype=np.float64)
            ed_v = ear_p - out[ec_m]
            for c in range(3):
                res_u[:, c] = np.bincount(hweld[ec_m], weights=ed_v[:, c], minlength=nh_u) / np.maximum(
                    np.bincount(hweld[ec_m], minlength=nh_u), 1.0
                )
            halo_u = (hops_e >= 1) & (hops_e <= 6)
            for _ in range(40):
                nbr = np.column_stack([np.bincount(hes, weights=res_u[hed, c], minlength=nh_u) / hdeg for c in range(3)])
                res_u[halo_u] = nbr[halo_u]
            out += res_u[hweld]
            out[ec_m] = ear_p

    inward_oral_hd = hm.get("inwardOralHead")
    if inward_oral_hd is not None and np.any(inward_oral_hd):
        inw_u = np.isin(np.arange(nh_u), hweld[inward_oral_hd])
        disp_u = np.column_stack(
            [np.bincount(hweld, weights=(out - rest_base_head)[:, c], minlength=nh_u) / hmult for c in range(3)]
        )
        for _ in range(60):
            nbr_o = np.column_stack([np.bincount(hes, weights=disp_u[hed, c], minlength=nh_u) / hdeg for c in range(3)])
            disp_u[inw_u] = nbr_o[inw_u]
        out[inward_oral_hd] = (rest_base_head + disp_u[hweld])[inward_oral_hd]

    hd_conn = weld_connectivity(rest_base_head, head_tri, decimals=5)
    hd_weld, (hes_g, hed_g), hmult_g, hdeg_g = hd_conn
    hdeg_f = np.maximum(hdeg_g.astype(np.float64), 1.0)
    hd_before = self_intersections(rest_base_head, head_tri, hd_weld)
    hd_areas = face_areas(rest_base_head, head_tri)
    hu_pts = np.column_stack([np.bincount(hd_weld, weights=out[:, c], minlength=len(hmult_g)) / hmult_g for c in range(3)])
    for _ in range(12):
        chk = hu_pts[hd_weld].astype(np.float32).astype(np.float64)
        si = self_intersections(chk, head_tri, hd_weld) - hd_before
        bf = np.flatnonzero(bad_faces(chk, head_tri, hd_areas, hd_conn))
        if not si and not len(bf):
            return chk
        ff = set(bf.tolist())
        for a, b in si:
            ff.add(a)
            ff.add(b)
        att = np.zeros(len(hmult_g), dtype=np.float64)
        att[np.unique(hd_weld[head_tri[list(ff)].ravel()])] = 1.0
        for _ in range(2):
            att = np.maximum(att * 0.72, np.bincount(hes_g, weights=att[hed_g], minlength=len(hmult_g)) / hdeg_f)
        for _ in range(5):
            nbr_g = np.column_stack([np.bincount(hes_g, weights=hu_pts[hed_g, c], minlength=len(hmult_g)) / hdeg_f for c in range(3)])
            hu_pts += (0.46 * att)[:, None] * (nbr_g - hu_pts)
    return hu_pts[hd_weld].astype(np.float32).astype(np.float64)


def polish_head_and_neck_seam(
    rest_base_head: np.ndarray,
    head_fit_raw: np.ndarray,
    head_tri: np.ndarray,
    head_hard_pin: np.ndarray,
    seam_head: np.ndarray,
    seam_target_pts: np.ndarray,
) -> np.ndarray:
    """Propagate exact runtime LOD1 collar-seam residual smoothly up the lower neck WITHOUT any 0.0mm world-space head pins!"""
    _ = head_hard_pin
    weld, _, edges, adj, u_pts = weld_graph(rest_base_head, head_tri, decimals=5)
    n_u = len(u_pts)
    es, ed = edges[:, 0], edges[:, 1]
    deg = np.maximum(np.bincount(es, minlength=n_u).astype(np.float64), 1.0)
    mult = np.maximum(np.bincount(weld, minlength=n_u).astype(np.float64), 1.0)

    seam_u = weld[seam_head]
    is_seam_u = np.isin(np.arange(n_u), seam_u)
    hops_seam = bfs_hop_distance(n_u, adj, is_seam_u)
    # Decay seam residual smoothly to 0 above Z >= 1.795m so runtime LOD1 collar stitching never perturbs face/crown!
    far_lock_u = (u_pts[:, 2] >= 1.805) | (hops_seam >= 12)
    free_u = (~is_seam_u) & (~far_lock_u)

    res_u = np.zeros((n_u, 3), dtype=np.float64)
    for sh_v, tgt_p in zip(seam_head, seam_target_pts):
        res_u[weld[sh_v]] = tgt_p - head_fit_raw[sh_v]

    if np.any(free_u):
        for _ in range(60):
            nbr = np.column_stack([np.bincount(es, weights=res_u[ed, c], minlength=n_u) / deg for c in range(3)])
            res_u[free_u] = nbr[free_u]

    u_cur = np.column_stack([np.bincount(weld, weights=head_fit_raw[:, c], minlength=n_u) / mult for c in range(3)]) + res_u
    out = u_cur[weld]
    out[seam_head] = seam_target_pts
    # Preserve exact 1D crown Z stature invariant:
    i_top = int(np.argmax(rest_base_head[:, 2]))
    out[i_top, 2] = rest_base_head[i_top, 2]
    out[:, 2] = np.minimum(out[:, 2], float(rest_base_head[:, 2].max()))
    return out.astype(np.float32).astype(np.float64)


def fit_attached_head_submeshes(
    rest_base_head: np.ndarray,
    fit_head: np.ndarray,
    compiled_family: dict,
    head_feature_masks: dict | None = None,
) -> tuple[dict[str, np.ndarray], dict]:
    """Compute exact Kabsch similarity follow for `eyeLeft`, `eyeRight`, `lashes`, `teeth`, and `oral`
    from their fitted `headSkin` orbital/oral attachment rings so eyeballs, lashes & teeth stay 100% flush!
    """
    meshes = compiled_family["meshes"]
    eye_l_ref = gltf_to_blender(meshes["eyeLeft"]["positions"])
    eye_r_ref = gltf_to_blender(meshes["eyeRight"]["positions"])
    lashes_ref = gltf_to_blender(meshes["lashes"]["positions"])
    teeth_ref = gltf_to_blender(meshes["teeth"]["positions"])
    oral_ref = gltf_to_blender(meshes["oral"]["positions"])

    hm = head_feature_masks or {}
    # Always anchor eyeballs to the tight inner palpebral rim (`<= 4.5 mm` from canonical eyeball surface) with nearly
    # invariant anatomical eyeball radius (`0.97..1.020`) so adipose cheek/brow padding on `F > 0` builds NEVER inflates
    # eyeball spheres to `1.09x` or pokes white sclera rings through the upper/lower eyelids!
    orb_l = np.linalg.norm(rest_base_head[:, None, :] - eye_l_ref[None, :, :], axis=2).min(axis=1) <= 0.0045
    if np.sum(orb_l) < 6:
        orb_l = hm.get("orbRingLeftHead")
        if orb_l is None or np.sum(orb_l) < 4:
            orb_l = np.linalg.norm(rest_base_head[:, None, :] - eye_l_ref[None, :, :], axis=2).min(axis=1) <= 0.0085
    orb_r = np.linalg.norm(rest_base_head[:, None, :] - eye_r_ref[None, :, :], axis=2).min(axis=1) <= 0.0045
    if np.sum(orb_r) < 6:
        orb_r = hm.get("orbRingRightHead")
        if orb_r is None or np.sum(orb_r) < 4:
            orb_r = np.linalg.norm(rest_base_head[:, None, :] - eye_r_ref[None, :, :], axis=2).min(axis=1) <= 0.0085
    ot_pts = np.vstack([oral_ref, teeth_ref])
    oral_m = np.linalg.norm(rest_base_head[:, None, :] - ot_pts[None, :, :], axis=2).min(axis=1) <= 0.0052
    if np.sum(oral_m) < 6:
        oral_m = hm.get("oralAttachHead")
        if oral_m is None or np.sum(oral_m) < 4:
            oral_m = np.linalg.norm(rest_base_head[:, None, :] - ot_pts[None, :, :], axis=2).min(axis=1) <= 0.0075

    flip_x = np.array([-1.0, 1.0, 1.0], dtype=np.float64)
    flip_mat = np.diag(flip_x)
    src_orb_sym = np.vstack([rest_base_head[orb_l], rest_base_head[orb_r] * flip_x])
    dst_orb_sym = np.vstack([fit_head[orb_l], fit_head[orb_r] * flip_x])
    s_el, _, _ = _kabsch_similarity(src_orb_sym, dst_orb_sym, scale_bounds=(0.985, 1.010))
    # Keep eyeball orientation strictly level (`rot_el = I`, zero gaze pitch/yaw roll!) and anchor vertical centering
    # to the inner palpebral commissure/margin (`<= 2.6 mm` from cornea/sclera) so adipose cheek/lower-lid swelling on
    # `F > 0` builds NEVER rotates the dark iris `+8 deg` upward behind the upper lid (`milky-white sclera stare`)!
    palp_l = np.linalg.norm(rest_base_head[:, None, :] - eye_l_ref[None, :, :], axis=2).min(axis=1) <= 0.0028
    palp_r = np.linalg.norm(rest_base_head[:, None, :] - eye_r_ref[None, :, :], axis=2).min(axis=1) <= 0.0028
    if np.sum(palp_l) >= 6 and np.sum(palp_r) >= 6:
        src_c = 0.5 * (rest_base_head[palp_l].mean(axis=0) + (rest_base_head[palp_r] * flip_x).mean(axis=0))
        dst_c = 0.5 * (fit_head[palp_l].mean(axis=0) + (fit_head[palp_r] * flip_x).mean(axis=0))
    else:
        src_c = src_orb_sym.mean(axis=0)
        dst_c = dst_orb_sym.mean(axis=0)
    rot_el = np.eye(3, dtype=np.float64)
    tr_el = dst_c - s_el * src_c
    s_er = s_el
    rot_er = np.eye(3, dtype=np.float64)
    tr_er = tr_el * flip_x

    s_or, rot_or, tr_or = _kabsch_similarity(rest_base_head[oral_m], fit_head[oral_m], scale_bounds=(0.97, 1.035))

    eye_l_fit = s_el * eye_l_ref + tr_el
    eye_r_fit = s_er * eye_r_ref + tr_er
    # Seat eyeballs recessed behind upper eyelid margins when adipose cheek/orbital padding expands anteriorly (`src_c[1] - dst_c[1] > 0`)
    # so upper-lid hooding & shadow match canonical `F = 0` builds (`zero scleral-show wide-eyed stare!`):
    adipose_orb_fwd = max(0.0, float(src_c[1] - dst_c[1]) - 0.0015)
    adipose_recess_y = 0.32 * adipose_orb_fwd
    adipose_drop_z = 0.08 * adipose_orb_fwd
    y_push_l = max(0.0, float(np.percentile(fit_head[orb_l, 1], 30) - np.percentile(eye_l_fit[:, 1], 16)) + 0.0004)
    y_push_r = max(0.0, float(np.percentile(fit_head[orb_r, 1], 30) - np.percentile(eye_r_fit[:, 1], 16)) + 0.0004)
    y_push = max(0.5 * (y_push_l + y_push_r), adipose_recess_y)
    if y_push > 0.0 or adipose_drop_z > 0.0:
        eye_l_fit[:, 1] += y_push
        eye_r_fit[:, 1] += y_push
        eye_l_fit[:, 2] -= adipose_drop_z
        eye_r_fit[:, 2] -= adipose_drop_z

    lashes_fit = lashes_ref.copy()
    l_left = lashes_ref[:, 0] >= 0.0
    if np.any(l_left):
        lashes_fit[l_left] = s_el * lashes_ref[l_left] + tr_el + np.array([0.0, y_push, -adipose_drop_z])
    if np.any(~l_left):
        lashes_fit[~l_left] = s_er * lashes_ref[~l_left] + tr_er + np.array([0.0, y_push, -adipose_drop_z])

    teeth_fit = s_or * (teeth_ref @ rot_or.T) + tr_or
    oral_fit = s_or * (oral_ref @ rot_or.T) + tr_or

    err_el = float(np.linalg.norm((s_el * (rest_base_head[orb_l] @ rot_el.T) + tr_el) - fit_head[orb_l], axis=1).max() * 1000.0)
    err_er = float(np.linalg.norm((s_er * (rest_base_head[orb_r] @ rot_er.T) + tr_er) - fit_head[orb_r], axis=1).max() * 1000.0)
    err_or = float(np.linalg.norm((s_or * (rest_base_head[oral_m] @ rot_or.T) + tr_or) - fit_head[oral_m], axis=1).max() * 1000.0)

    fitted = {
        "eyeLeft": eye_l_fit.astype(np.float32).astype(np.float64),
        "eyeRight": eye_r_fit.astype(np.float32).astype(np.float64),
        "lashes": lashes_fit.astype(np.float32).astype(np.float64),
        "teeth": teeth_fit.astype(np.float32).astype(np.float64),
        "oral": oral_fit.astype(np.float32).astype(np.float64),
    }
    stats = {
        "eyeLeftScale": round(s_el, 4),
        "eyeRightScale": round(s_er, 4),
        "oralScale": round(s_or, 4),
        "eyeLeftMaxRingResidualMm": round(err_el, 3),
        "eyeRightMaxRingResidualMm": round(err_er, 3),
        "oralMaxRingResidualMm": round(err_or, 3),
    }
    return fitted, stats


def thicken_canonical_five_fingers(
    ref_pts: np.ndarray,
    fit_pts: np.ndarray,
    tri: np.ndarray,
    finger_topo: dict,
    hard_lock_mask: np.ndarray | None = None,
    adipose_gate: float = 1.0,
    raw_fit_pts: np.ndarray | None = None,
    muscle_gate: float = 0.5,
) -> tuple[np.ndarray, dict]:
    """Carry the canonical hand & all 5 fingers via mirror-symmetric 3D Kabsch similarity follow of the
    clean observed wrist-to-mid-metacarpal band (`zero 0.0mm world pins` and `zero fused-mitt MCP knuckle ridge!`),
    and apply one continuous C2 soft-tissue fullness taper from forearm -> wrist -> palm -> MCP knuckles -> 5 fingers
    with strict inter-finger clearance clamping.
    """
    weld = finger_topo["weld"]
    adj = finger_topo["adj"]
    n_u = len(finger_topo["uPts"])
    fid_u = finger_topo["fingerIdUnique"]
    side_u = finger_topo["fingerSideUnique"]
    t_phal = finger_topo["tPhalUnique"]
    nail_damp = finger_topo["dorsalNailDampUnique"]
    min_gap = finger_topo["minInterfingerGapUnique"]

    mult = np.maximum(np.bincount(weld, minlength=n_u).astype(np.float64), 1.0)
    ru = np.column_stack([np.bincount(weld, weights=ref_pts[:, c], minlength=n_u) / mult for c in range(3)])
    pu = np.column_stack([np.bincount(weld, weights=fit_pts[:, c], minlength=n_u) / mult for c in range(3)])
    meas_src = raw_fit_pts if raw_fit_pts is not None else fit_pts
    pu_meas = np.column_stack([np.bincount(weld, weights=meas_src[:, c], minlength=n_u) / mult for c in range(3)])

    wtri = weld[tri]
    v_tri = ref_pts[tri]
    fn = np.cross(v_tri[:, 1] - v_tri[:, 0], v_tri[:, 2] - v_tri[:, 0])
    vn_u = np.zeros((n_u, 3), dtype=np.float64)
    for k in range(3):
        for c in range(3):
            np.add.at(vn_u[:, c], wtri[:, k], fn[:, c])
    vn_u /= np.maximum(np.linalg.norm(vn_u, axis=1, keepdims=True), 1e-12)
    for _ in range(6):
        nbr_n = np.array([vn_u[adj[i]].mean(axis=0) if adj[i] else vn_u[i] for i in range(n_u)])
        vn_u = 0.45 * vn_u + 0.55 * nbr_n
        vn_u /= np.maximum(np.linalg.norm(vn_u, axis=1, keepdims=True), 1e-12)

    # Pool clean wrist + carpal + proximal/mid-metacarpal palm bands (`s in [-0.22, +0.52]`, well proximal to
    # Donor's `s ~ 0.90` fused knuckle mitt!) across Left (+X) and mirrored Right (-X -> +X) for exact L/R symmetry:
    flip_x = np.array([-1.0, 1.0, 1.0], dtype=np.float64)
    flip_mat = np.diag(flip_x)
    src_palm_sym = []
    dst_palm_sym = []
    s_per_side: dict[int, np.ndarray] = {}
    for sgn in (1, -1):
        u_palm_s = finger_topo["uPalmPerSide"][sgn]
        wr_s = finger_topo["wristPerSide"][sgn]
        l_palm_s = max(float(finger_topo["palmLenPerSide"][sgn]), 1e-6)
        s_s = ((ru - wr_s[None, :]) @ u_palm_s) / l_palm_s
        s_per_side[sgn] = s_s
        is_df_s = (side_u == sgn) & (fid_u >= 0) & ~(((fid_u % 5) == 0) & (s_s < 0.78))
        clean_band = (ru[:, 0] * sgn > 0.32) & (ru[:, 2] < 1.36) & (~is_df_s) & (s_s >= -0.22) & (s_s <= 0.52)
        if np.sum(clean_band) >= 12:
            if sgn == 1:
                src_palm_sym.append(ru[clean_band])
                dst_palm_sym.append(pu_meas[clean_band])
            else:
                src_palm_sym.append(ru[clean_band] * flip_x)
                dst_palm_sym.append(pu_meas[clean_band] * flip_x)

    src_wrist_sym = []
    dst_wrist_sym = []
    for sgn in (1, -1):
        s_s = s_per_side[sgn]
        is_df_s = (side_u == sgn) & (fid_u >= 0) & ~(((fid_u % 5) == 0) & (s_s < 0.78))
        # Sample the true Donor-fitted distal forearm & wrist styloid band (`s in [-0.26, -0.04]`, proximal to `hand_excl`)
        # so muscular builds measure the actual ~1.25x Donor wrist girth instead of the excluded canonical palm!
        s_wr_hi = -0.04 if adipose_gate <= 0.02 else 0.08
        wr_band = (ru[:, 0] * sgn > 0.32) & (ru[:, 2] < 1.36) & (~is_df_s) & (s_s >= -0.26) & (s_s <= s_wr_hi)
        if np.sum(wr_band) >= 8:
            src_wrist_sym.append(ru[wr_band] if sgn == 1 else ru[wr_band] * flip_x)
            dst_wrist_sym.append(pu_meas[wr_band] if sgn == 1 else pu_meas[wr_band] * flip_x)

    ad_g = float(np.clip(adipose_gate, 0.0, 1.0))
    musc_hand_g = 0.0
    slender_hand_g = 0.0
    if len(src_palm_sym) == 2:
        # On lean/muscular builds (`ad_g <= 0.02`), compute Kabsch hand/wrist frame scale bidirectionally (`[0.82, 1.25]`) from the
        # Donor-fitted wrist & distal forearm (`wr_band`) so BOTH slender (`M=0`, `s_wr < 1.0`) and muscular (`M=1`, `s_wr > 1.0`)
        # hands & 5 fingers scale coherently with wrist girth (`zero paddle-hand or tiny-hand cliff, zero volar wrist kink!`),
        # while keeping Stage A `F = 1.0` (`ad_g >= 0.999`) at `(0.996, 1.012)`!
        if ad_g <= 0.02 and len(src_wrist_sym) == 2:
            sw_pts = np.vstack(src_wrist_sym)
            dw_pts = np.vstack(dst_wrist_sym)
            slender_m = float(np.clip((0.50 - float(muscle_gate)) / 0.50, 0.0, 1.0))
            min_s_wr = 0.985 - 0.165 * slender_m
            min_s_hl = 0.985 - 0.145 * slender_m
            s_wr, _, _ = _kabsch_similarity(sw_pts, dw_pts, scale_bounds=(min_s_wr, 1.25))
            _, rot_pm, _ = _kabsch_similarity(
                np.vstack(src_palm_sym), np.vstack(dst_palm_sym), scale_bounds=(min_s_wr, 1.22)
            )
            musc_hand_g = float(np.clip((s_wr - 1.02) / 0.17, 0.0, 1.0))
            slender_hand_g = slender_m * float(np.clip((0.975 - s_wr) / 0.14, 0.0, 1.0))
            if s_wr >= 0.985:
                s_hl = float(np.clip(1.0 + 0.84 * (s_wr - 1.0), 0.985, 1.165))
            else:
                s_hl = float(np.clip(1.0 + 0.82 * (s_wr - 1.0), min_s_hl, 0.985))
            rot_hl = rot_pm
            # Anchor similarity pivot right at the wrist joint (`s in [-0.14, -0.04]`) so wrist flexion poses without a volar kink:
            wr_piv_m = []
            wr_dst_m = []
            for sgn_w in (1, -1):
                sw_s = s_per_side[sgn_w]
                idf_w = (side_u == sgn_w) & (fid_u >= 0) & ~(((fid_u % 5) == 0) & (sw_s < 0.78))
                mp_w = (ru[:, 0] * sgn_w > 0.32) & (ru[:, 2] < 1.36) & (~idf_w) & (sw_s >= -0.14) & (sw_s <= -0.04)
                if np.sum(mp_w) >= 6:
                    wr_piv_m.append(ru[mp_w] if sgn_w == 1 else ru[mp_w] * flip_x)
                    wr_dst_m.append(pu_meas[mp_w] if sgn_w == 1 else pu_meas[mp_w] * flip_x)
            p_src_piv = np.vstack(wr_piv_m).mean(axis=0) if len(wr_piv_m) == 2 else sw_pts.mean(axis=0)
            p_dst_piv = np.vstack(wr_dst_m).mean(axis=0) if len(wr_piv_m) == 2 else dw_pts.mean(axis=0)
            tr_hl = p_dst_piv - s_hl * (rot_hl @ p_src_piv)
        else:
            is_extreme_full_m = (ad_g >= 0.999) and (abs(float(muscle_gate) - 0.50) > 0.10)
            if is_extreme_full_m and len(src_wrist_sym) == 2:
                sw_pts_f = np.vstack(src_wrist_sym)
                dw_pts_f = np.vstack(dst_wrist_sym)
                s_wr_f, _, _ = _kabsch_similarity(sw_pts_f, dw_pts_f, scale_bounds=(0.94, 1.10))
                _, rot_hl, _ = _kabsch_similarity(
                    np.vstack(src_palm_sym), np.vstack(dst_palm_sym), scale_bounds=(0.94, 1.08)
                )
                s_hl = float(np.clip(1.0 + 0.85 * (s_wr_f - 1.0), 0.955, 1.075))
                wr_piv_f, wr_dst_f = [], []
                for sgn_w in (1, -1):
                    sw_s = s_per_side[sgn_w]
                    idf_w = (side_u == sgn_w) & (fid_u >= 0) & ~(((fid_u % 5) == 0) & (sw_s < 0.78))
                    mp_w = (ru[:, 0] * sgn_w > 0.32) & (ru[:, 2] < 1.36) & (~idf_w) & (sw_s >= -0.14) & (sw_s <= -0.04)
                    if np.sum(mp_w) >= 6:
                        wr_piv_f.append(ru[mp_w] if sgn_w == 1 else ru[mp_w] * flip_x)
                        wr_dst_f.append(pu_meas[mp_w] if sgn_w == 1 else pu_meas[mp_w] * flip_x)
                p_sf = np.vstack(wr_piv_f).mean(axis=0) if len(wr_piv_f) == 2 else sw_pts_f.mean(axis=0)
                p_df = np.vstack(wr_dst_f).mean(axis=0) if len(wr_dst_f) == 2 else dw_pts_f.mean(axis=0)
                tr_hl = p_df - s_hl * (rot_hl @ p_sf)
            else:
                kb_bounds = (0.85, 1.08) if ad_g <= 0.02 else (0.996, 1.012)
                s_hl, rot_hl, tr_hl = _kabsch_similarity(
                    np.vstack(src_palm_sym), np.vstack(dst_palm_sym), scale_bounds=kb_bounds
                )
    else:
        s_hl, rot_hl, tr_hl = 1.0, np.eye(3, dtype=np.float64), np.zeros(3, dtype=np.float64)

    kabsch_per_side = {
        1: (s_hl, rot_hl, tr_hl),
        -1: (s_hl, flip_mat @ rot_hl @ flip_mat, tr_hl * flip_x),
    }

    pooled_dn_fore = []
    pooled_palm_obs = []
    if ad_g < 0.999:
        for sgn_p in (1, -1):
            u_th_p = finger_topo["uThickPerSide"][sgn_p]
            s_p = s_per_side[sgn_p]
            s_kp, rot_kp, tr_kp = kabsch_per_side[sgn_p]
            pu_cp = s_kp * (ru @ rot_kp.T) + tr_kp[None, :]
            ab_p = (ru[:, 0] * sgn_p > 0.32) & (ru[:, 2] < 1.36)
            fm_p = ab_p & (s_p >= -0.55) & (s_p <= -0.05)
            if np.any(fm_p):
                pooled_dn_fore.append(np.einsum("ni,ni->n", pu_meas[fm_p] - pu_cp[fm_p], vn_u[fm_p]))
            idf_p = (side_u == sgn_p) & (fid_u >= 0) & ~(((fid_u % 5) == 0) & (s_p < 0.78))
            mp_p = ab_p & (~idf_p) & (s_p >= 0.08) & (s_p <= 0.52) & (np.abs(vn_u @ u_th_p) > 0.45)
            if np.sum(mp_p) >= 8:
                pooled_palm_obs.append(np.einsum("ni,ni->n", pu_meas[mp_p] - pu_cp[mp_p], vn_u[mp_p]))

    hand_stats = {}
    for sgn, tag in ((1, "left"), (-1, "right")):
        u_thick = finger_topo["uThickPerSide"][sgn]
        u_width = finger_topo["uWidthPerSide"][sgn]
        u_palm = finger_topo["uPalmPerSide"][sgn]
        s_all = s_per_side[sgn]
        s_kh, rot_kh, tr_kh = kabsch_per_side[sgn]

        arm_band = (ru[:, 0] * sgn > 0.32) & (ru[:, 2] < 1.36)
        fore_m = arm_band & (s_all >= -0.55) & (s_all <= -0.05)
        if not np.any(fore_m):
            continue
        pu_carry = s_kh * (ru @ rot_kh.T) + tr_kh[None, :]
        dn_fore = np.einsum("ni,ni->n", pu[fore_m] - pu_carry[fore_m], vn_u[fore_m])
        is_distal_finger = (side_u == sgn) & (fid_u >= 0) & ~(((fid_u % 5) == 0) & (s_all < 0.78))
        if ad_g <= 0.02:
            # Lean/muscular builds (`F=0`): scale hand & 5 fingers to match muscular wrist girth (`s_kh ~ 1.16-1.18x` on M100),
            # add athletic thenar/hypothenar/metacarpal palm volume (`+3.0mm`) and bony/tendinous phalangeal girth (`+1.6mm`,
            # strictly clamped to `<= 0.24 * min_gap` inter-digit clearance), and fair smoothly across `s in [-0.05, +0.46]`
            # (leaving `s <= -0.08` wrist caliper station untouched within <1% Donor error while eliminating volar wrist kinks!):
            palm_musc_rad = 0.0030 * musc_hand_g - 0.00045 * slender_hand_g
            fing_musc_rad = 0.00165 * musc_hand_g - 0.00022 * slender_hand_g
            palm_zone_m = arm_band & (~is_distal_finger) & (s_all >= -0.02)
            pzm_idx = np.flatnonzero(palm_zone_m)
            if len(pzm_idx):
                sp_m = s_all[pzm_idx]
                t_pm1 = smootherstep((sp_m + 0.02) / 0.42)
                t_pm2 = smootherstep((sp_m - 0.44) / 0.48)
                dn_pm = (palm_musc_rad * t_pm1) * (1.0 - t_pm2) + fing_musc_rad * t_pm2
                n_pm = vn_u[pzm_idx]
                cleft_damp_m = 1.0 - 0.82 * smootherstep((sp_m - 0.78) / 0.16)
                n_lat_m = (n_pm @ u_width)[:, None] * u_width[None, :]
                n_eff_m = n_pm - (1.0 - cleft_damp_m)[:, None] * n_lat_m
                pu_palm_m = pu_carry[pzm_idx] + dn_pm[:, None] * n_eff_m
                w_ov_m = smootherstep((sp_m + 0.01) / 0.36)[:, None]
                pu[pzm_idx] = (1.0 - w_ov_m) * pu[pzm_idx] + w_ov_m * pu_palm_m

            f_idx_m = np.flatnonzero(is_distal_finger)
            if len(f_idx_m):
                tf_m = t_phal[f_idx_m].copy()
                is_th_m = (fid_u[f_idx_m] % 5) == 0
                if np.any(is_th_m):
                    s_thm = s_all[f_idx_m[is_th_m]]
                    tf_m[is_th_m] = np.clip((s_thm - 0.78) / max(float(s_thm.max()) - 0.78, 0.15), 0.0, 1.0)
                w_dt_m = 1.0 - 0.62 * smootherstep((tf_m - 0.18) / 0.80)
                rad_m = fing_musc_rad * w_dt_m * nail_damp[f_idx_m]
                n_fm = vn_u[f_idx_m]
                c_th_m = (n_fm @ u_thick)[:, None] * u_thick[None, :]
                c_ax_m = np.clip(n_fm @ u_palm, 0.0, 1.0)[:, None] * (0.14 * u_palm[None, :])
                c_lat_m = n_fm @ u_width
                web_d_m = 0.18 + 0.82 * smootherstep((tf_m - 0.06) / 0.18)
                lat_d_m = np.clip(rad_m * c_lat_m * web_d_m, -0.24 * min_gap[f_idx_m], 0.24 * min_gap[f_idx_m])
                disp_fm = rad_m[:, None] * (c_th_m + c_ax_m) + lat_d_m[:, None] * u_width[None, :]
                if np.any(is_th_m):
                    th_c_m = np.minimum(rad_m[is_th_m], 0.28 * min_gap[f_idx_m[is_th_m]])
                    disp_fm[is_th_m] = th_c_m[:, None] * n_fm[is_th_m]
                pu[f_idx_m] = pu_carry[f_idx_m] + disp_fm

            # Smooth C2 carpal/wrist displacement transition (`s in [-0.06, +0.44]`, strictly distal to `s = -0.10` wrist slice!)
            # so forearm-to-hand taper is seamless and posed wrist flexion never forms a volar kink or dorsal bump:
            wrist_blend_band = np.flatnonzero(arm_band & (~is_distal_finger) & (s_all >= -0.06) & (s_all <= 0.44))
            if len(wrist_blend_band):
                wwb = (
                    smootherstep((s_all[wrist_blend_band] + 0.06) / 0.12)
                    * (1.0 - smootherstep((s_all[wrist_blend_band] - 0.28) / 0.16))
                )[:, None]
                del_w = pu - pu_carry
                for _ in range(28):
                    nbr_dw = np.array([del_w[adj[i]].mean(axis=0) if adj[i] else del_w[i] for i in wrist_blend_band])
                    del_w[wrist_blend_band] += (0.46 * wwb) * (nbr_dw - del_w[wrist_blend_band])
                pu = pu_carry + del_w

            hz_idx = np.flatnonzero(arm_band & (s_all >= 0.16))
            if len(hz_idx):
                pu_bg_h = pu.copy()
                for _ in range(4):
                    pu_bg_h[hz_idx] = 0.45 * pu_bg_h[hz_idx] + 0.55 * np.array(
                        [pu_bg_h[adj[i]].mean(axis=0) if adj[i] else pu_bg_h[i] for i in hz_idx]
                    )
                w_bony_h = smootherstep((s_all[hz_idx] - 0.18) / 0.14)[:, None]
                pu[hz_idx] += (0.38 * w_bony_h) * np.clip(pu[hz_idx] - pu_bg_h[hz_idx], -0.0018, 0.0022)
            hand_stats[tag] = {
                "wristRadialGainMm": 0.0,
                "palmTargetGainMm": round(palm_musc_rad * 1000.0, 2),
                "proximalFingerRadialAddMm": round(fing_musc_rad * 1000.0, 2),
                "kabschScale": round(s_kh, 4),
            }
            continue
        if ad_g >= 0.999:
            wrist_gain = float(np.clip(np.median(dn_fore), 0.0, 0.012))
            if wrist_gain <= 2e-4:
                hand_stats[tag] = {"wristRadialGainMm": 0.0, "palmTargetGainMm": 0.0, "proximalFingerRadialAddMm": 0.0}
                continue
            mid_palm_m = arm_band & (~is_distal_finger) & (s_all >= 0.08) & (s_all <= 0.52) & (np.abs(vn_u @ u_thick) > 0.45)
            palm_obs = (
                float(np.clip(np.median(np.einsum("ni,ni->n", pu[mid_palm_m] - pu_carry[mid_palm_m], vn_u[mid_palm_m])), 0.0, 0.010))
                if np.sum(mid_palm_m) >= 8
                else 0.62 * wrist_gain
            )
            palm_mid_gain = float(np.clip(max(0.68 * wrist_gain, 0.55 * palm_obs + 0.34 * wrist_gain), 0.0, 0.0086))
            base_rad = float(np.clip(0.30 * wrist_gain + 0.12 * palm_obs, 0.0, 0.0035))
        else:
            # Intermediate fullness (`0 < F < 1`): scale radial soft-tissue fullness strictly by `ad_g` (`0.0mm` at F=0)!
            dn_fore_sym = np.concatenate(pooled_dn_fore) if pooled_dn_fore else dn_fore
            wrist_gain = float(np.clip(np.median(dn_fore_sym), 0.0, 0.012 * ad_g))
            palm_obs = (
                float(np.clip(np.median(np.concatenate(pooled_palm_obs)), 0.0, 0.010 * ad_g))
                if pooled_palm_obs
                else 0.60 * wrist_gain
            )
            palm_mid_gain = float(np.clip(max(0.60 * wrist_gain, 0.55 * palm_obs + 0.34 * wrist_gain), 0.0, 0.0086 * ad_g))
            base_rad = float(np.clip(0.28 * wrist_gain + 0.12 * palm_obs, 0.0, 0.0035 * ad_g))

        # 1) Unified carpus + metacarpal palm/dorsum + thenar thumb pad + inter-digital knuckle web (`~is_distal_finger & s_all >= -0.35`,
        #    with NO upper s_all cutoff so zero inter-knuckle web vertex keeps a raw fused-mitt CG spike!):
        palm_zone = arm_band & (~is_distal_finger) & (s_all >= -0.35)
        pz_idx = np.flatnonzero(palm_zone)
        if len(pz_idx):
            sp = s_all[pz_idx]
            # Two-stage C2 radial thickness curve: wrist (0.96*wrist_gain at s=-0.22) -> mid-palm/thenar (palm_mid_gain at s=0.44) -> knuckle line (base_rad at s>=0.92):
            t_p1 = smootherstep((sp + 0.22) / 0.66)
            t_p2 = smootherstep((sp - 0.42) / 0.52)
            dn_stage1 = (0.96 * wrist_gain) * (1.0 - t_p1) + palm_mid_gain * t_p1
            dn_tgt = dn_stage1 * (1.0 - t_p2) + base_rad * t_p2

            n_p = vn_u[pz_idx]
            dors_palm_align = 0.90 + 0.10 * np.abs(n_p @ u_thick)
            # Damp sideways lateral expansion ONLY inside distal inter-knuckle clefts (s > 0.78) so thenar thumb pad (s=0.0..0.68) stays plump!
            cleft_lat_damp = 1.0 - 0.82 * smootherstep((sp - 0.78) / 0.16)
            n_lat_comp = (n_p @ u_width)[:, None] * u_width[None, :]
            n_eff_p = (n_p - (1.0 - cleft_lat_damp)[:, None] * n_lat_comp)
            pu_palm_goal = pu_carry[pz_idx] + (dn_tgt * dors_palm_align)[:, None] * n_eff_p

            # Smooth C2 handoff right at the wrist (`s >= -0.02` on extreme-muscle full corners so `s = -0.08` wrist station preserves
            # 100% of Donor-fitted wrist depth/width, while `M050-F100` retains its exact `sp + 0.10` blend!):
            is_ext_fm_ov = (ad_g >= 0.999) and (abs(float(muscle_gate) - 0.50) > 0.10)
            w_override = (
                smootherstep((sp + (0.02 if is_ext_fm_ov else 0.10)) / (0.38 if is_ext_fm_ov else 0.44))[:, None]
                if ad_g >= 0.999
                else smootherstep((sp + 0.14) / 0.46)[:, None]
            )
            pu[pz_idx] = (1.0 - w_override) * pu[pz_idx] + w_override * pu_palm_goal

        hand_stats[tag] = {
            "wristRadialGainMm": round(wrist_gain * 1000.0, 2),
            "palmTargetGainMm": round(palm_mid_gain * 1000.0, 2),
            "proximalFingerRadialAddMm": round(base_rad * 1000.0, 2),
            "kabschScale": round(s_kh, 4),
        }

        # 2) All 5 canonical fingers (`is_distal_finger`): start at 100% `pu_carry + base_rad` at `tf_raw = 0`
        #    (matching `palm_zone` at `s = 0.92` with ZERO raw-CG spike retention!) and taper smoothly to fingertips:
        f_idx = np.flatnonzero(is_distal_finger)
        if len(f_idx):
            tf_raw = t_phal[f_idx].copy()
            is_th = (fid_u[f_idx] % 5) == 0
            if np.any(is_th):
                s_th = s_all[f_idx[is_th]]
                tf_raw[is_th] = np.clip((s_th - 0.78) / max(float(s_th.max()) - 0.78, 0.15), 0.0, 1.0)

            w_distal_taper = 1.0 - 0.74 * smootherstep((tf_raw - 0.14) / 0.82)
            rad_mag = base_rad * w_distal_taper * nail_damp[f_idx]

            n_f = vn_u[f_idx]
            c_thick = (n_f @ u_thick)[:, None] * u_thick[None, :]
            c_axial = np.clip(n_f @ u_palm, 0.0, 1.0)[:, None] * (0.14 * u_palm[None, :])
            c_lat_scalar = n_f @ u_width
            web_lat_damp = 0.18 + 0.82 * smootherstep((tf_raw - 0.06) / 0.18)
            raw_lat_disp = rad_mag * c_lat_scalar * web_lat_damp
            max_lat_disp = 0.24 * min_gap[f_idx]
            clamped_lat_disp = np.clip(raw_lat_disp, -max_lat_disp, max_lat_disp)

            disp_f = rad_mag[:, None] * (c_thick + c_axial) + clamped_lat_disp[:, None] * u_width[None, :]
            if np.any(is_th):
                th_cap = np.minimum(rad_mag[is_th], 0.28 * min_gap[f_idx[is_th]])
                disp_f[is_th] = th_cap[:, None] * n_f[is_th]

            pu[f_idx] = pu_carry[f_idx] + disp_f

        # 3) Smooth displacement + wrist/thenar surface fairing across forearm -> wrist -> palm -> MCP knuckles -> proximal phalanges
        #    (on extreme-muscle full corners, start distal to `s = -0.08` so isotropic `pu_carry` never alters Donor wrist depth/width):
        is_ext_wr_sm = (ad_g >= 0.999) and (abs(float(muscle_gate) - 0.50) > 0.10)
        s_sh_lo = -0.05 if is_ext_wr_sm else -0.38
        s_wp_lo = -0.04 if is_ext_wr_sm else -0.34
        smooth_hand_band = arm_band & (s_all >= s_sh_lo)
        sh_idx = np.flatnonzero(smooth_hand_band)
        if len(sh_idx):
            gap_safe = np.where(is_distal_finger[sh_idx], smootherstep((min_gap[sh_idx] - 0.0022) / 0.0035), 1.0)
            w_sh = (
                smootherstep((s_all[sh_idx] - s_sh_lo) / (0.12 if is_ext_wr_sm else 0.16))
                * (1.0 - 0.65 * smootherstep((s_all[sh_idx] - 1.25) / 0.22))
                * gap_safe
            )[:, None]
            del_u = pu - pu_carry
            for _ in range(38):
                nbr_d = np.array([del_u[adj[i]].mean(axis=0) if adj[i] else del_u[i] for i in sh_idx])
                del_u[sh_idx] += (0.45 * w_sh) * (nbr_d - del_u[sh_idx])
            pu = pu_carry + del_u
            wr_palm_sm = np.flatnonzero(arm_band & (~is_distal_finger) & (s_all >= s_wp_lo) & (s_all <= 0.72))
            if len(wr_palm_sm):
                wwp = (smootherstep((s_all[wr_palm_sm] - s_wp_lo) / (0.12 if is_ext_wr_sm else 0.14)) * (1.0 - smootherstep((s_all[wr_palm_sm] - 0.56) / 0.16)))[:, None]
                for _ in range(12):
                    nbr_p1 = np.array([pu[adj[i]].mean(axis=0) if adj[i] else pu[i] for i in wr_palm_sm])
                    pu[wr_palm_sm] += (0.34 * wwp) * (nbr_p1 - pu[wr_palm_sm])
                    nbr_p2 = np.array([pu[adj[i]].mean(axis=0) if adj[i] else pu[i] for i in wr_palm_sm])
                    pu[wr_palm_sm] -= (0.356 * wwp) * (nbr_p2 - pu[wr_palm_sm])

    out = pu[weld].copy()
    if hard_lock_mask is not None:
        out[hard_lock_mask] = fit_pts[hard_lock_mask]
    return out.astype(np.float32).astype(np.float64), hand_stats
