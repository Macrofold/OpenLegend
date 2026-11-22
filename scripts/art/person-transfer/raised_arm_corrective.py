#!/usr/bin/env python3
"""Pre-LBS fat & gravity raised-arm corrective solver and game-rig preview evaluator."""
from __future__ import annotations

import numpy as np

from canonical_masks import bfs_hop_distance, build_body_region_joint_masks
from mesh_rig_utils import (
    bad_faces,
    blender_to_gltf,
    eval_arm_pose_lbs,
    face_areas,
    gltf_to_blender,
    self_intersections,
    smooth_vertex_vectors,
    smootherstep,
    smoothstep,
    vertex_normals,
    weld_connectivity,
)

def _solve_lean_slender_raised_arm_corrective(
    lean_rest_bl: np.ndarray,
    full_rest_bl: np.ndarray,
    tri_l: np.ndarray,
    compiled_family: dict,
    seam_body: np.ndarray,
    lean_head_bl: np.ndarray | None = None,
    head_rest_bl: np.ndarray | None = None,
    head_tri: np.ndarray | None = None,
    seam_head: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray, dict]:
    """Solve pinch-free scapulohumeral clavicle/acromion bridge, gravity-settled horizontal arm alignment,
    and taut ribcage-to-waist flank stretch for slender/ectomorphic lean builds (`M < 0.5, F = 0`, e.g. `M000-F000`),
    while leaving canonical `M050-F000` (`max delta < 0.5 mm`) untouched at zero.
    """
    max_body_diff = float(np.linalg.norm(full_rest_bl - lean_rest_bl, axis=1).max())
    if max_body_diff < 5.0e-4:
        zeros = np.zeros_like(lean_rest_bl, dtype=np.float64)
        return zeros, zeros.copy(), {
            "applied": False,
            "mode": "canonical-lean-zero-corrective",
            "muscularScale": 0.0,
            "newSelfIntersections": 0,
            "badFaces": 0,
            "maxRestDeltaMm": 0.0,
            "collarSeamMaxDeltaMm": 0.0,
        }

    rx, ry, rz = lean_rest_bl.T
    p_lean, _, hw_bl, j_names = eval_arm_pose_lbs(lean_rest_bl, "bodySkin", compiled_family, raise_scale=1.0)
    p_lean_tp, _, _, _ = eval_arm_pose_lbs(lean_rest_bl, "bodySkin", compiled_family, raise_scale=0.705)
    p_full_lbs, m_g, _, _ = eval_arm_pose_lbs(full_rest_bl, "bodySkin", compiled_family, raise_scale=1.0)
    p_tp_lbs, _, _, _ = eval_arm_pose_lbs(full_rest_bl, "bodySkin", compiled_family, raise_scale=0.705)
    m_g_inv = np.linalg.inv(m_g)

    n_j = len(j_names)
    me_b = compiled_family["meshes"]["bodySkin"]
    j_idx = np.asarray(me_b["jointIndices"], dtype=np.int64).reshape(len(lean_rest_bl), 4)
    j_wt = np.asarray(me_b["jointWeights"], dtype=np.float64).reshape(len(lean_rest_bl), 4)
    j_wt /= np.maximum(j_wt.sum(axis=1, keepdims=True), 1e-12)
    w_full = np.zeros((len(lean_rest_bl), n_j), dtype=np.float64)
    for k in range(4):
        w_full[np.arange(len(lean_rest_bl)), j_idx[:, k]] += j_wt[:, k]

    conn = weld_connectivity(lean_rest_bl, tri_l, decimals=5)
    weld, (es, ed), mult, _ = conn
    n_u = len(mult)
    first_u = np.zeros(n_u, dtype=np.int64)
    first_u[weld[::-1]] = np.arange(len(weld) - 1, -1, -1)
    has_coupled_head = (head_rest_bl is not None) and (head_tri is not None) and (seam_head is not None)
    seam_lock_body = seam_body[np.abs(rx[seam_body]) <= 0.072] if has_coupled_head else seam_body
    seam_u = np.isin(np.arange(n_u), weld[seam_lock_body])
    deg_u = np.maximum(np.bincount(es, minlength=n_u).astype(np.float64), 1.0)
    adj_u: list[list[int]] = [[] for _ in range(n_u)]
    for a_e, b_e in zip(es, ed):
        adj_u[int(a_e)].append(int(b_e))
    hops_seam_v = bfs_hop_distance(n_u, adj_u, seam_u)[weld].astype(np.float64)
    seam_free_w = np.where(hops_seam_v < 0.5, 0.0, smootherstep((hops_seam_v - 0.5) / 3.5))

    elen = np.linalg.norm(p_lean[first_u][es] - p_lean[first_u][ed], axis=1)
    w_le = 1.0 / np.maximum(elen, 0.002)
    deg_le = np.maximum(np.bincount(es, weights=w_le, minlength=n_u), 1e-12)

    p_target = p_full_lbs.copy()
    z_eff = np.maximum(rz, p_lean[:, 2])

    # 1) Refill superior clavicular/trapezius LBS pivot trough + proud outer-clavicle/AC-joint bridge (`|rx| = 0.080..0.198m`)
    #    so raising arms never dents the outer collarbone or AC joint on slender builds:
    if has_coupled_head:
        crater_drop = np.maximum(0.0, full_rest_bl[:, 2] + 0.0042 * smootherstep((np.abs(rx) - 0.088) / 0.050) - p_full_lbs[:, 2])
        w_crater = (
            0.90
            * seam_free_w
            * smootherstep((np.abs(rx) - 0.078) / 0.022)
            * (1.0 - smootherstep((np.abs(rx) - 0.198) / 0.030))
            * smootherstep((rz - 1.540) / 0.034)
        )
        p_target[:, 2] += w_crater * crater_drop
        w_ac_bridge = (
            seam_free_w
            * np.exp(-0.5 * (((np.abs(rx) - 0.152) / 0.028) ** 2))
            * smootherstep((rz - 1.575) / 0.032)
            * smootherstep((-ry + 0.025) / 0.055)
        )
        p_target[:, 2] += 0.0038 * w_ac_bridge

    # 2) Slender arm gravity settle + axillary/elbow LBS crease smoothing + taut lateral ribcage-to-waist stretch:
    for side_name, sgn in (("l", 1.0), ("r", -1.0)):
        i_up = j_names.index(f"upperarm_{side_name}")
        i_pr = j_names.index(f"upperarm_pressure_{side_name}")
        i_lo = j_names.index(f"lowerarm_{side_name}")
        i_ha = j_names.index(f"hand_{side_name}")
        w_arm_side = np.clip(w_full[:, i_up] + w_full[:, i_pr] + w_full[:, i_lo] + w_full[:, i_ha], 0.0, 1.0)
        w_arm_sm = smooth_vertex_vectors(np.repeat(w_arm_side[:, None], 3, axis=1), conn, rings=4)[:, 0]

        sh = hw_bl[i_up]
        el = hw_bl[i_lo]
        u_vec = el - sh
        u_len = max(float(np.linalg.norm(u_vec)), 1e-4)
        u_hat = u_vec / u_len
        z_world = np.array([0.0, 0.0, 1.0])
        g_up = z_world - float(np.dot(z_world, u_hat)) * u_hat
        g_up /= max(float(np.linalg.norm(g_up)), 1e-6)

        side_w = smootherstep((sgn * rx - 0.020) / 0.032)
        rel_p = p_lean - sh[None, :]
        t_ax = (rel_p @ u_hat) / u_len
        c_bone = sh[None, :] + np.clip(t_ax, -0.15, 1.85)[:, None] * u_vec[None, :]
        r_lean = p_lean - c_bone
        r_rad = np.maximum(np.linalg.norm(r_lean, axis=1), 1e-4)
        zeta = np.clip((r_lean @ g_up) / r_rad, -1.0, 1.0)
        px_tp = sgn * p_tp_lbs[:, 0]
        pz_tp = p_tp_lbs[:, 2]
        rx_sgn = sgn * rx

        # Gentle slender gravity settle along outstretched arm (prevents upward swan-neck forearm tilt & acromial hump while keeping digits rigid):
        taper_to_wrist = 1.0 - smootherstep((px_tp - 0.605) / 0.055)
        rigid_wrist_68 = 0.0125 * smootherstep((px_tp - 0.560) / 0.065)
        s_sup = smootherstep((zeta + 0.18) / 0.82)
        drop_sup = (
            (
                0.0052 * np.exp(-0.5 * (((px_tp - 0.245) / 0.050) ** 2))
                + 0.0125 * np.exp(-0.5 * (((px_tp - 0.375) / 0.062) ** 2))
                + 0.0105 * np.exp(-0.5 * (((px_tp - 0.520) / 0.060) ** 2))
            )
            * smootherstep((px_tp - 0.192) / 0.036)
            * taper_to_wrist
            + rigid_wrist_68
        )
        drop_inf = (
            (
                0.0095 * np.exp(-0.5 * (((px_tp - 0.345) / 0.068) ** 2))
                + 0.0095 * np.exp(-0.5 * (((px_tp - 0.525) / 0.060) ** 2))
            )
            * smootherstep((px_tp - 0.232) / 0.044)
            * taper_to_wrist
            + rigid_wrist_68
        )
        w_grav = (
            side_w
            * seam_free_w
            * np.clip(
                np.maximum(
                    smootherstep((w_arm_sm - 0.10) / 0.22),
                    smootherstep((px_tp - 0.175) / 0.030) * smootherstep((pz_tp - 1.560) / 0.040),
                ),
                0.0,
                1.0,
            )
            * smootherstep((z_eff - 1.455) / 0.038)
        )
        p_target -= (w_grav * (s_sup * drop_sup + (1.0 - s_sup) * drop_inf))[:, None] * g_up[None, :]

        # Subtle upward pectoral insertion & lateral flank fascia stretch (`+Z`) so the slender ribcage/waist stretches tautly:
        w_pec_str = (
            side_w
            * seam_free_w
            * smootherstep((-ry - 0.030) / 0.030)
            * smootherstep((rx_sgn - 0.050) / 0.030)
            * (1.0 - smootherstep((rx_sgn - 0.215) / 0.036))
            * smootherstep((rz - 1.390) / 0.028)
            * (1.0 - smootherstep((rz - 1.585) / 0.032))
            * (1.0 - smootherstep((w_arm_sm - 0.58) / 0.20))
        )
        p_target[:, 2] += 0.0115 * w_pec_str * smootherstep((rx_sgn - 0.080) / 0.060)

        w_fl_str = (
            side_w
            * seam_free_w
            * (1.0 - smootherstep((pz_tp - 1.540) / 0.042))
            * (1.0 - smootherstep((px_tp - 0.245) / 0.050))
            * (1.0 - smootherstep((w_arm_sm - 0.54) / 0.18))
            * smootherstep((rx_sgn - 0.070) / 0.034)
            * smootherstep((pz_tp - 1.190) / 0.026)
        )
        u_str = np.clip((pz_tp - 1.190) / (1.480 - 1.190), 0.0, 1.0)
        p_target[:, 2] += 0.0055 * w_fl_str * np.sin(np.pi * u_str)

    # Light crease-unpinching relaxation strictly inside the shoulder/axilla/elbow hinge bands (preserving bony ribs & clavicles!):
    p_lbs_u = np.column_stack([np.bincount(weld, weights=p_full_lbs[:, c], minlength=n_u) / mult for c in range(3)])
    p_u = np.column_stack([np.bincount(weld, weights=p_target[:, c], minlength=n_u) / mult for c in range(3)])
    ru_s = full_rest_bl[first_u]
    in_hinge_u = (
        (~seam_u)
        & (
            ((np.abs(ru_s[:, 0]) >= 0.145) & (np.abs(ru_s[:, 0]) <= 0.275) & (ru_s[:, 2] >= 1.425) & (ru_s[:, 2] <= 1.655))
            | ((np.abs(ru_s[:, 0]) >= 0.315) & (np.abs(ru_s[:, 0]) <= 0.435) & (ru_s[:, 2] >= 1.335) & (ru_s[:, 2] <= 1.485))
        )
    )
    h_idx = np.flatnonzero(in_hinge_u)
    if len(h_idx):
        for _ in range(14):
            nrm_h = vertex_normals(p_u[weld], tri_l, weld)[first_u][h_idx]
            nbr_h = np.column_stack([np.bincount(es, weights=w_le * p_u[ed, c], minlength=n_u) / deg_le for c in range(3)])
            dp_h = nbr_h[h_idx] - p_u[h_idx]
            dot_h = np.einsum("ni,ni->n", dp_h, nrm_h)[:, None]
            p_u[h_idx] += 0.42 * (dp_h - dot_h * nrm_h) + np.where(dot_h > 0.0, 0.55, 0.12) * (dot_h * nrm_h)
            p_u[seam_u] = p_lbs_u[seam_u]

    # Symmetrize +/-X across canonical pairs:
    from mathutils.kdtree import KDTree as _KDTree
    kd_s = _KDTree(n_u)
    for ui_k, pk in enumerate(lean_rest_bl[first_u]):
        kd_s.insert(pk.tolist(), ui_k)
    kd_s.balance()
    del_u = p_u - p_lbs_u
    del_sym = del_u.copy()
    for ui_k in range(n_u):
        pk = lean_rest_bl[first_u[ui_k]]
        if abs(pk[0]) <= 2.5e-4:
            del_sym[ui_k, 0] = 0.0
            continue
        _, mi_k, md_k = kd_s.find((-pk[0], pk[1], pk[2]))
        if mi_k is not None and md_k < 4.0e-4:
            del_sym[ui_k, 0] = 0.5 * (del_u[ui_k, 0] - del_u[mi_k, 0])
            del_sym[ui_k, 1] = 0.5 * (del_u[ui_k, 1] + del_u[mi_k, 1])
            del_sym[ui_k, 2] = 0.5 * (del_u[ui_k, 2] + del_u[mi_k, 2])
    del_u = del_sym
    del_u[seam_u] = 0.0

    si_before = self_intersections(p_lean, tri_l, weld) | self_intersections(p_full_lbs, tri_l, weld)
    base_ar = face_areas(p_lean, tri_l)
    for _ in range(12):
        chk = p_full_lbs + del_u[weld]
        chk[seam_lock_body] = p_full_lbs[seam_lock_body]
        si_c = self_intersections(chk, tri_l, weld) - si_before
        bf_c = bad_faces(chk, tri_l, base_ar, conn)
        if not si_c and not np.any(bf_c):
            break
        ff = set(np.flatnonzero(bf_c).tolist())
        for a, b in si_c:
            ff.add(a)
            ff.add(b)
        att = np.zeros(n_u, dtype=np.float64)
        att[np.unique(weld[tri_l[list(ff)].ravel()])] = 1.0
        for _ in range(3):
            att = np.maximum(att * 0.76, np.bincount(es, weights=att[ed], minlength=n_u) / deg_u)
        del_u *= (1.0 - 0.40 * np.clip(att, 0.0, 1.0))[:, None]

    p_final = p_full_lbs + del_u[weld]
    p_final[seam_lock_body] = p_full_lbs[seam_lock_body]
    si_after = self_intersections(p_final, tri_l, weld) - si_before
    bf_after = int(bad_faces(p_final, tri_l, base_ar, conn).sum())

    dp_gltf = blender_to_gltf(p_final) - blender_to_gltf(p_full_lbs)
    drest_bl = gltf_to_blender(np.einsum("vij,vj->vi", m_g_inv, dp_gltf))
    drest_bl[seam_lock_body] = 0.0

    p_tp_cor, _, _, _ = eval_arm_pose_lbs(full_rest_bl + 0.705 * drest_bl, "bodySkin", compiled_family, raise_scale=0.705)
    si_tp_base = self_intersections(p_lean_tp, tri_l, weld) | self_intersections(p_tp_lbs, tri_l, weld)
    si_tp_after = self_intersections(p_tp_cor, tri_l, weld) - si_tp_base
    bf_tp_after = int(bad_faces(p_tp_cor, tri_l, face_areas(p_lean_tp, tri_l), conn).sum())

    w_left = smootherstep((rx + 0.015) / 0.030)[:, None]
    d_left_bl = w_left * drest_bl
    d_right_bl = (1.0 - w_left) * drest_bl
    out_meta: dict = {
        "applied": True,
        "mode": "lean-slender-scapulohumeral-corrective",
        "muscularScale": 0.0,
        "newSelfIntersections": int(len(si_after)),
        "newSelfIntersectionsTPose": int(len(si_tp_after)),
        "badFaces": bf_after,
        "badFacesTPose": bf_tp_after,
        "maxRestDeltaMm": round(float(np.linalg.norm(drest_bl, axis=1).max() * 1000.0), 3),
        "collarSeamMaxDeltaMm": 0.0,
    }

    if has_coupled_head and head_rest_bl is not None and head_tri is not None and seam_head is not None:
        h_ref = lean_head_bl if lean_head_bl is not None else head_rest_bl
        hx, _, hz = h_ref.T
        p_hd_lbs, m_g_hd, _, _ = eval_arm_pose_lbs(head_rest_bl, "headSkin", compiled_family, raise_scale=1.0)
        h_conn = weld_connectivity(h_ref, head_tri, decimals=5)
        h_weld, (h_es, h_ed), h_mult, h_deg = h_conn
        n_hu = len(h_mult)
        h_deg_f = np.maximum(h_deg.astype(np.float64), 1.0)
        h_first = np.zeros(n_hu, dtype=np.int64)
        h_first[h_weld[::-1]] = np.arange(len(h_weld) - 1, -1, -1)

        dp_hd_init = np.zeros_like(head_rest_bl, dtype=np.float64)
        dp_hd_seam = p_final[seam_body] - p_hd_lbs[seam_head]
        dp_hd_init[seam_head] = dp_hd_seam
        dp_hu = np.column_stack([np.bincount(h_weld, weights=dp_hd_init[:, c], minlength=n_hu) / h_mult for c in range(3)])
        hu_x, _, hu_z = h_ref[h_first].T
        hu_lock = (hu_z >= 1.766) | ((np.abs(hu_x) <= 0.075) & (hu_z >= 1.692))
        seam_cnt = np.bincount(h_weld[seam_head], minlength=n_hu)
        has_s_u = seam_cnt > 0
        dp_hu_seam_vals = np.column_stack([np.bincount(h_weld[seam_head], weights=dp_hd_seam[:, c], minlength=n_hu) for c in range(3)])
        dp_hu_seam_vals[has_s_u] /= seam_cnt[has_s_u, None]
        dp_hu[hu_lock] = 0.0
        dp_hu[has_s_u] = dp_hu_seam_vals[has_s_u]
        for _ in range(36):
            nbr_hu = np.column_stack([np.bincount(h_es, weights=dp_hu[h_ed, c], minlength=n_hu) / h_deg_f for c in range(3)])
            dp_hu = 0.30 * dp_hu + 0.70 * nbr_hu
            dp_hu[hu_lock] = 0.0
            dp_hu[has_s_u] = dp_hu_seam_vals[has_s_u]
        dp_hd_final = dp_hu[h_weld]
        dp_hd_final[seam_head] = dp_hd_seam
        drest_hd_bl = gltf_to_blender(np.einsum("vij,vj->vi", np.linalg.inv(m_g_hd), blender_to_gltf(dp_hd_final)))
        drest_hd_bl[seam_head] = drest_bl[seam_body]
        w_hd_left = smootherstep((hx + 0.015) / 0.030)[:, None]
        d_hd_left_bl = w_hd_left * drest_hd_bl
        d_hd_right_bl = (1.0 - w_hd_left) * drest_hd_bl
        d_hd_left_bl[seam_head] = d_left_bl[seam_body]
        d_hd_right_bl[seam_head] = d_right_bl[seam_body]
        p_hd_68_cor, _, _, _ = eval_arm_pose_lbs(head_rest_bl + drest_hd_bl, "headSkin", compiled_family, raise_scale=1.0)
        p_hd_tp_cor, _, _, _ = eval_arm_pose_lbs(head_rest_bl + 0.705 * drest_hd_bl, "headSkin", compiled_family, raise_scale=0.705)
        seam_gap_68 = float(np.linalg.norm(p_final[seam_body] - p_hd_68_cor[seam_head], axis=1).max() * 1000.0)
        seam_gap_tp = float(np.linalg.norm(p_tp_cor[seam_body] - p_hd_tp_cor[seam_head], axis=1).max() * 1000.0)
        out_meta["collarSeamMaxDeltaMm"] = round(max(seam_gap_68, seam_gap_tp), 6)
        out_meta["headBadFaces"] = int(bad_faces(p_hd_68_cor, head_tri, face_areas(head_rest_bl, head_tri), h_conn).sum())
        out_meta["headBadFacesTPose"] = int(bad_faces(p_hd_tp_cor, head_tri, face_areas(head_rest_bl, head_tri), h_conn).sum())
        out_meta["headMaxRestDeltaMm"] = round(float(np.linalg.norm(drest_hd_bl, axis=1).max() * 1000.0), 3)
        out_meta["_headLeftBl"] = d_hd_left_bl
        out_meta["_headRightBl"] = d_hd_right_bl

    return d_left_bl, d_right_bl, out_meta


def _solve_lean_muscular_raised_arm_corrective(
    lean_rest_bl: np.ndarray,
    full_rest_bl: np.ndarray,
    tri_l: np.ndarray,
    compiled_family: dict,
    seam_body: np.ndarray,
    lean_head_bl: np.ndarray | None = None,
    head_rest_bl: np.ndarray | None = None,
    head_tri: np.ndarray | None = None,
    seam_head: np.ndarray | None = None,
    muscle_gate: float | None = None,
) -> tuple[np.ndarray, np.ndarray, dict]:
    """Solve coupled bodySkin + headSkin scapulohumeral trapezius bridge, continuous 4-bump-free deltoid-bicep-elbow-forearm
    T-pose/+68° contour, wide latissimus/teres V-taper expansion, and shear-ridge-free anterior pec & posterior scapular
    transitions for lean muscular builds (delegating slender `M < 0.35` builds to `_solve_lean_slender_raised_arm_corrective`).
    """
    rx, ry, rz = lean_rest_bl.T
    nrm_ln0 = vertex_normals(lean_rest_bl, tri_l, weld_connectivity(lean_rest_bl, tri_l, decimals=5)[0])
    dn_musc = np.einsum("vi,vi->v", full_rest_bl - lean_rest_bl, nrm_ln0)
    hypertrophy_probe = (rz >= 1.42) & (rz <= 1.63) & (np.abs(rx) >= 0.05) & (np.abs(rx) <= 0.34)
    g_p88 = float(np.percentile(dn_musc[hypertrophy_probe], 88)) if np.any(hypertrophy_probe) else 0.0
    musc_scale = float(np.clip((g_p88 - 0.005) / 0.033, 0.0, 1.00))
    if (muscle_gate is not None and float(muscle_gate) < 0.35) or musc_scale <= 0.03:
        return _solve_lean_slender_raised_arm_corrective(
            lean_rest_bl,
            full_rest_bl,
            tri_l,
            compiled_family,
            seam_body,
            lean_head_bl=lean_head_bl,
            head_rest_bl=head_rest_bl,
            head_tri=head_tri,
            seam_head=seam_head,
        )

    p_lean, _, hw_bl, j_names = eval_arm_pose_lbs(lean_rest_bl, "bodySkin", compiled_family, raise_scale=1.0)
    p_lean_tp, _, _, _ = eval_arm_pose_lbs(lean_rest_bl, "bodySkin", compiled_family, raise_scale=0.705)
    p_full_lbs, m_g, _, _ = eval_arm_pose_lbs(full_rest_bl, "bodySkin", compiled_family, raise_scale=1.0)
    p_tp_lbs, _, _, _ = eval_arm_pose_lbs(full_rest_bl, "bodySkin", compiled_family, raise_scale=0.705)

    n_j = len(j_names)
    me_b = compiled_family["meshes"]["bodySkin"]
    j_idx = np.asarray(me_b["jointIndices"], dtype=np.int64).reshape(len(lean_rest_bl), 4)
    j_wt = np.asarray(me_b["jointWeights"], dtype=np.float64).reshape(len(lean_rest_bl), 4)
    j_wt /= np.maximum(j_wt.sum(axis=1, keepdims=True), 1e-12)
    w_full = np.zeros((len(lean_rest_bl), n_j), dtype=np.float64)
    for k in range(4):
        w_full[np.arange(len(lean_rest_bl)), j_idx[:, k]] += j_wt[:, k]

    conn = weld_connectivity(lean_rest_bl, tri_l, decimals=5)
    weld, (es, ed), mult, _ = conn
    n_u = len(mult)
    first_u = np.zeros(n_u, dtype=np.int64)
    first_u[weld[::-1]] = np.arange(len(weld) - 1, -1, -1)
    has_coupled_head = (head_rest_bl is not None) and (head_tri is not None) and (seam_head is not None)
    # When headSkin is coupled across the collar seam, ONLY lock the central neck/throat column (`|rx| <= 0.072m`), unlocking the
    # outer upper-trapezius collar seam (`|rx| = 0.08..0.17m`) so the -33.2mm LBS upperarm_l pivot crater refills 100%!
    seam_lock_body = seam_body[np.abs(rx[seam_body]) <= 0.072] if has_coupled_head else seam_body
    seam_u = np.isin(np.arange(n_u), weld[seam_lock_body])
    deg_u = np.maximum(np.bincount(es, minlength=n_u).astype(np.float64), 1.0)
    adj_u: list[list[int]] = [[] for _ in range(n_u)]
    for a_e, b_e in zip(es, ed):
        adj_u[int(a_e)].append(int(b_e))
    hops_seam_v = bfs_hop_distance(n_u, adj_u, seam_u)[weld].astype(np.float64)
    seam_free_w = np.where(hops_seam_v < 0.5, 0.0, smootherstep((hops_seam_v - 0.5) / 3.5))

    elen = np.linalg.norm(p_lean[first_u][es] - p_lean[first_u][ed], axis=1)
    w_le = 1.0 / np.maximum(elen, 0.002)
    deg_le = np.maximum(np.bincount(es, weights=w_le, minlength=n_u), 1e-12)

    p_target = p_full_lbs.copy()
    z_eff = np.maximum(rz, p_lean[:, 2])
    nrm_tp = vertex_normals(p_tp_lbs, tri_l, weld)
    topo_body_masks = build_body_region_joint_masks(lean_rest_bl, tri_l, j_names, w_full)
    lean_arm_post_specs: list[tuple[float, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]] = []

    # Extract narrow 3-ring anatomical sulcus/ridge relief (`infraspinatus/teres sulci, posterior-deltoid border, 3-head deltoid splits,
    # bicep/tricep grooves` — WITHOUT 9-ring rest-pec or rest-lat blobs that create armpit pillows!) in UN-PINCHED REST SPACE (`full_rest_bl`)
    # and rotate via exact orthogonal polar decomposition `R_g = U @ Vt` of `m_g`:
    rest_u_init = np.column_stack([np.bincount(weld, weights=full_rest_bl[:, c], minlength=n_u) / mult for c in range(3)])
    rest_macro_u = rest_u_init.copy()
    for _ in range(3):
        rest_macro_u = 0.48 * rest_macro_u + 0.52 * np.column_stack(
            [np.bincount(es, weights=rest_macro_u[ed, c], minlength=n_u) / deg_u for c in range(3)]
        )
    rest_musc_detail_bl = (rest_u_init - rest_macro_u)[weld]
    u_svd, _, vt_svd = np.linalg.svd(m_g)
    det_uv = np.linalg.det(u_svd @ vt_svd)
    u_svd[det_uv < 0.0, :, -1] *= -1.0
    r_ortho_g = u_svd @ vt_svd
    rot_musc_detail_bl = gltf_to_blender(np.einsum("vij,vj->vi", r_ortho_g, blender_to_gltf(rest_musc_detail_bl)))
    rot_musc_detail_u = np.column_stack([np.bincount(weld, weights=rot_musc_detail_bl[:, c], minlength=n_u) / mult for c in range(3)])

    p_macro_lbs, _, _, _ = eval_arm_pose_lbs(rest_macro_u[weld], "bodySkin", compiled_family, raise_scale=1.0)
    p_lbs_u_init = np.column_stack([np.bincount(weld, weights=p_full_lbs[:, c], minlength=n_u) / mult for c in range(3)])
    p_lbs_macro_u = np.column_stack([np.bincount(weld, weights=p_macro_lbs[:, c], minlength=n_u) / mult for c in range(3)])
    musc_detail_68_u = p_lbs_u_init - p_lbs_macro_u

    # Scapulohumeral upward-rotation medial trapezius bridge (`|rx| = 0.080..0.185m`, refilling ONLY the inner trapezius
    # pivot trough without pushing the acromion (`0.19..0.22m`) into a high boxy plateau!):
    if has_coupled_head:
        shrug_goal_z = full_rest_bl[:, 2] + (0.0075 * musc_scale) * smootherstep((np.abs(rx) - 0.090) / 0.050)
        crater_drop = np.maximum(0.0, shrug_goal_z - p_full_lbs[:, 2])
        w_crater_fill = (
            0.84
            * seam_free_w
            * smootherstep((np.abs(rx) - 0.080) / 0.024)
            * (1.0 - smootherstep((np.abs(rx) - 0.168) / 0.030))
            * smootherstep((rz - 1.545) / 0.036)
        )
        p_target[:, 2] += w_crater_fill * crater_drop

    for side_name, sgn in (("l", 1.0), ("r", -1.0)):
        arm_sleeve_side = (
            topo_body_masks["armSleeveLeftVertex"] if sgn > 0 else topo_body_masks["armSleeveRightVertex"]
        )
        i_up = j_names.index(f"upperarm_{side_name}")
        i_pr = j_names.index(f"upperarm_pressure_{side_name}")
        i_lo = j_names.index(f"lowerarm_{side_name}")
        i_ha = j_names.index(f"hand_{side_name}")
        w_arm_side = np.clip(w_full[:, i_up] + w_full[:, i_pr] + w_full[:, i_lo] + w_full[:, i_ha], 0.0, 1.0)
        w_arm_sm = smooth_vertex_vectors(np.repeat(w_arm_side[:, None], 3, axis=1), conn, rings=4)[:, 0]

        sh = hw_bl[i_up]
        el = hw_bl[i_lo]
        u_vec = el - sh
        u_len = max(float(np.linalg.norm(u_vec)), 1e-4)
        u_hat = u_vec / u_len
        z_world = np.array([0.0, 0.0, 1.0])
        g_up = z_world - float(np.dot(z_world, u_hat)) * u_hat
        g_up /= max(float(np.linalg.norm(g_up)), 1e-6)

        side_w = smootherstep((sgn * rx - 0.020) / 0.032)
        rel_p = p_lean - sh[None, :]
        t_ax = (rel_p @ u_hat) / u_len
        c_bone = sh[None, :] + np.clip(t_ax, -0.15, 1.85)[:, None] * u_vec[None, :]
        r_lean = p_lean - c_bone
        r_rad = np.maximum(np.linalg.norm(r_lean, axis=1), 1e-4)
        zeta = np.clip((r_lean @ g_up) / r_rad, -1.0, 1.0)
        px_tp = sgn * p_tp_lbs[:, 0]
        pz_tp = p_tp_lbs[:, 2]
        rx_sgn = sgn * rx

        # 1a) Anatomical Pectoralis-Major Abduction Unfold (`pulls the inferior & lateral pectoral border ~35° obliquely upward toward
        #     the humeral insertion while gently unfolding the rest-pose boxy lower-outer overhang so +68° forms a continuous strap!`):
        w_pec_lift = (
            side_w
            * seam_free_w
            * smootherstep((-ry - 0.032) / 0.030)
            * smootherstep((rx_sgn - 0.044) / 0.030)
            * (1.0 - smootherstep((rx_sgn - 0.228) / 0.038))
            * smootherstep((rz - 1.372) / 0.026)
            * (1.0 - smootherstep((rz - 1.592) / 0.032))
            * (1.0 - smootherstep((w_arm_sm - 0.58) / 0.20))
        )
        outer_pec_bias = smootherstep((rx_sgn - 0.082) / 0.064)
        p_target[:, 2] += (0.0410 * musc_scale) * w_pec_lift * (0.20 + 0.80 * outer_pec_bias)
        p_target[:, 0] += sgn * (0.0140 * musc_scale) * w_pec_lift * outer_pec_bias
        # Gently unfold the sharp lower-outer rest-pose pectoral shelf (`+Y` inward on `rz = 1.38..1.45m`) while keeping upper/clavicular pec proud (`-Y`):
        w_low_pec_unfold = (
            w_pec_lift
            * smootherstep((rx_sgn - 0.082) / 0.045)
            * (1.0 - smootherstep((rz - 1.448) / 0.028))
        )
        p_target[:, 1] += (0.0052 * musc_scale) * w_low_pec_unfold
        w_pec_proud = (
            side_w
            * seam_free_w
            * smootherstep((-ry - 0.045) / 0.030)
            * smootherstep((rx_sgn - 0.034) / 0.028)
            * (1.0 - smootherstep((rx_sgn - 0.205) / 0.036))
            * smootherstep((rz - 1.445) / 0.028)
            * (1.0 - smootherstep((rz - 1.615) / 0.030))
            * (1.0 - smootherstep((w_arm_sm - 0.58) / 0.20))
        )
        clav_delt_bridge = smootherstep((rx_sgn - 0.108) / 0.045) * smootherstep((rz - 1.490) / 0.035)
        p_target[:, 1] -= (0.0044 + 0.0042 * clav_delt_bridge) * musc_scale * w_pec_proud

        # Gentle anterior axillary pocket smoothing ONLY (`0.0 +Z` lift so we NEVER dent the lateral axillary wall in Profile!):
        w_ax_fossa_tuck = (
            side_w
            * seam_free_w
            * smootherstep((-ry - 0.015) / 0.028)
            * (1.0 - smootherstep((-ry - 0.078) / 0.028))
            * smootherstep((px_tp - 0.165) / 0.026)
            * (1.0 - smootherstep((px_tp - 0.252) / 0.030))
            * smootherstep((rz - 1.435) / 0.028)
            * (1.0 - smootherstep((rz - 1.555) / 0.028))
        )
        p_target[:, 1] += (0.0018 * musc_scale) * w_ax_fossa_tuck

        # 1b) Cylindrical Axial Arm-Envelope De-Knotting (`px_tp = 0.278..0.605m`, strictly DISTAL to the lateral deltoid cap!):
        #     Preserves 100% of the proud spherical deltoid cannonball (`px_tp < 0.278m`) while gently smoothing LBS elbow/forearm kinks!
        e_perp2 = np.cross(u_hat, g_up)
        e_perp2 /= max(float(np.linalg.norm(e_perp2)), 1e-8)

        arm_cyl_m = (arm_sleeve_side | (w_arm_sm > 0.22)) & (px_tp >= 0.185) & (px_tp <= 0.635) & (pz_tp > 1.42)
        x_ax_g = np.linspace(0.195, 0.625, 44)
        yc_ax = np.zeros_like(x_ax_g)
        zc_ax = np.zeros_like(x_ax_g)
        for xi_a, xv_a in enumerate(x_ax_g):
            ms_a = arm_cyl_m & (np.abs(px_tp - xv_a) < 0.015)
            if np.sum(ms_a) >= 4:
                yc_ax[xi_a] = 0.5 * (float(np.percentile(p_tp_lbs[ms_a, 1], 95)) + float(np.percentile(p_tp_lbs[ms_a, 1], 5)))
                zc_ax[xi_a] = 0.5 * (float(np.percentile(pz_tp[ms_a], 95)) + float(np.percentile(pz_tp[ms_a], 5)))
            else:
                yc_ax[xi_a] = yc_ax[xi_a - 1] if xi_a > 0 else 0.01
                zc_ax[xi_a] = zc_ax[xi_a - 1] if xi_a > 0 else 1.62
        # Fit a clean straight centerline from shoulder (`0.22m`) to wrist (`0.61m`) so center kinks never hide elbow/forearm humps!
        c_lin_y = np.interp(x_ax_g, [x_ax_g[2], x_ax_g[-2]], [yc_ax[2], yc_ax[-2]])
        c_lin_z = np.interp(x_ax_g, [x_ax_g[2], x_ax_g[-2]], [zc_ax[2], zc_ax[-2]])
        yc_v = np.interp(np.clip(px_tp, x_ax_g[0], x_ax_g[-1]), x_ax_g, c_lin_y)
        zc_v = np.interp(np.clip(px_tp, x_ax_g[0], x_ax_g[-1]), x_ax_g, c_lin_z)

        dy_c = p_tp_lbs[:, 1] - yc_v
        dz_c = pz_tp - zc_v
        rad_tp = np.maximum(np.hypot(dy_c, dz_c), 1e-4)
        ang_tp = np.arctan2(dy_c, dz_c)  # 0 = top (+Z), +-pi = bottom (-Z), -pi/2 = front (-Y), +pi/2 = back (+Y)

        n_th = 16
        th_centers = np.linspace(-np.pi, np.pi, n_th, endpoint=False)
        r_grid = np.full((len(x_ax_g), n_th), np.nan, dtype=np.float64)
        for xi_a, xv_a in enumerate(x_ax_g):
            ms_a = arm_cyl_m & (np.abs(px_tp - xv_a) < 0.016)
            if np.sum(ms_a) < 6:
                continue
            ang_s = ang_tp[ms_a]
            rad_s = rad_tp[ms_a]
            for ti_a, tc_a in enumerate(th_centers):
                da = np.abs((ang_s - tc_a + np.pi) % (2.0 * np.pi) - np.pi)
                mt = da < (np.pi / 6.5)
                if np.sum(mt) >= 2:
                    r_grid[xi_a, ti_a] = float(np.percentile(rad_s[mt], 82))
        for ti_a in range(n_th):
            ok_r = np.isfinite(r_grid[:, ti_a])
            if np.sum(ok_r) >= 8:
                r_grid[:, ti_a] = np.interp(x_ax_g, x_ax_g[ok_r], r_grid[ok_r, ti_a])
        if np.all(np.isfinite(r_grid)):
            r_smooth = r_grid.copy()
            # Gentle 18-pass axial smoothing preserves proud bicep/tricep bellies while erasing elbow/forearm LBS kinks:
            for _ in range(18):
                r_smooth[1:-1, :] = 0.26 * r_smooth[:-2, :] + 0.48 * r_smooth[1:-1, :] + 0.26 * r_smooth[2:, :]
                r_smooth = 0.12 * np.roll(r_smooth, -1, axis=1) + 0.76 * r_smooth + 0.12 * np.roll(r_smooth, 1, axis=1)
            # Enforce monotonic non-increasing radius ONLY past the brachioradialis belly (`0.540m -> 0.62m` wrist)
            # so the athletic forearm swell distal to the elbow (`0.45..0.53m`) stays full like `M100-F000-raised-arms-ref.png`!
            i_e0 = int(np.searchsorted(x_ax_g, 0.335))
            i_e1 = int(np.searchsorted(x_ax_g, 0.495))
            if i_e1 > i_e0 + 2:
                s_e = np.linspace(0.0, 1.0, i_e1 - i_e0 + 1)[:, None]
                r_elb_chord = (1.0 - s_e) * r_smooth[i_e0 : i_e0 + 1, :] + s_e * r_smooth[i_e1 : i_e1 + 1, :]
                r_smooth[i_e0 : i_e1 + 1, :] = np.maximum(r_smooth[i_e0 : i_e1 + 1, :], 0.91 * r_elb_chord)
                for _ in range(4):
                    r_smooth[1:-1, :] = 0.25 * r_smooth[:-2, :] + 0.50 * r_smooth[1:-1] + 0.25 * r_smooth[2:, :]
            i_elb = int(np.searchsorted(x_ax_g, 0.540))
            for xi_a in range(i_elb + 1, len(x_ax_g)):
                r_smooth[xi_a, :] = np.minimum(r_smooth[xi_a, :], r_smooth[xi_a - 1, :] + 0.0004)

            # Bilinearly sample `dr_cyl = r_smooth - r_grid` for every distal arm vertex:
            xf_a = np.clip((px_tp - x_ax_g[0]) / (x_ax_g[1] - x_ax_g[0]), 0.0, len(x_ax_g) - 1.0001)
            x0_a = xf_a.astype(np.int64)
            tx_a = xf_a - x0_a
            tf_a = ((ang_tp + np.pi) / (2.0 * np.pi)) * n_th
            t0_a = np.floor(tf_a).astype(np.int64) % n_th
            t1_a = (t0_a + 1) % n_th
            tt_a = tf_a - np.floor(tf_a)

            dr_grid = r_smooth - r_grid
            dr_v = (
                (1.0 - tx_a) * ((1.0 - tt_a) * dr_grid[x0_a, t0_a] + tt_a * dr_grid[x0_a, t1_a])
                + tx_a * ((1.0 - tt_a) * dr_grid[x0_a + 1, t0_a] + tt_a * dr_grid[x0_a + 1, t1_a])
            )
            dr_v = np.where(dr_v > 0.0, np.clip(dr_v * 0.94, 0.0, 0.0135), np.clip(dr_v * 0.85, -0.011, 0.0))

            # Smooth the underside lat-to-tricep step (`px_tp = 0.195..0.34m, zeta < -0.20`) & distal deltoid-bicep junction:
            s_under_arm = smootherstep((-zeta - 0.18) / 0.34)
            x_start_dk = 0.268 * (1.0 - s_under_arm) + 0.198 * s_under_arm
            w_arm_de_knot = (
                side_w
                * seam_free_w
                * np.where(arm_sleeve_side | (w_arm_sm > 0.20), 1.0, 0.0)
                * smootherstep((px_tp - x_start_dk) / 0.032)
                * (1.0 - smootherstep((px_tp - 0.625) / 0.036))
                * smootherstep((z_eff - 1.440) / 0.035)
            )
            u_rad_68 = np.cos(ang_tp)[:, None] * g_up[None, :] + np.sin(ang_tp)[:, None] * (sgn * e_perp2)[None, :]
            u_rad_68 /= np.maximum(np.linalg.norm(u_rad_68, axis=1, keepdims=True), 1e-8)
            p_target += (musc_scale * w_arm_de_knot * dr_v)[:, None] * u_rad_68

            # Dense-Muscle (`M = 1, F = 0`) Gravity Settle & Pronated Top-Contour Flattening (`0.0mm` bone-length change):
            # - Settles the Rigid-LBS upward-swung acromion/deltoid cap (`px_tp = 0.185..0.315m`) downward relative to chin,
            # - Flattens & elongates the rotated A-pose bicep camel-hump (`px_tp = 0.31..0.45m`) and brachioradialis hump (`0.49..0.58m`)
            #   with volume-conserving horizontal AP breadth (`+-e_perp2`),
            # - Settles dense tricep (`px_tp = 0.25..0.45m`) & forearm flexor (`0.50..0.58m`) bellies smoothly downward without loose
            #   `F > 0` fat folds, and carries a uniform rigid `-18mm` (`0.705` T-pose) / `-25.5mm * g_up` (`+68°`) gravity settle out
            #   across the wrist, palm & 5 fingers (`0.000mm` relative finger distortion, eliminating upward swan-neck forearm tilt!).
            taper_to_rigid_wrist = 1.0 - smootherstep((px_tp - 0.605) / 0.055)
            rigid_wrist_settle_68 = 0.0255 * smootherstep((px_tp - 0.565) / 0.065)
            s_sup_g = smootherstep((zeta + 0.18) / 0.82)
            s_inf_g = 1.0 - s_sup_g
            drop_sup_68 = (
                (
                    0.024 * np.exp(-0.5 * (((px_tp - 0.245) / 0.050) ** 2))
                    + 0.054 * np.exp(-0.5 * (((px_tp - 0.372) / 0.060) ** 2))
                    + 0.032 * np.exp(-0.5 * (((px_tp - 0.520) / 0.060) ** 2))
                )
                * smootherstep((px_tp - 0.175) / 0.036)
                * taper_to_rigid_wrist
                + rigid_wrist_settle_68
            )
            drop_inf_68 = (
                (
                    0.052 * np.exp(-0.5 * (((px_tp - 0.345) / 0.068) ** 2))
                    + 0.026 * np.exp(-0.5 * (((px_tp - 0.525) / 0.060) ** 2))
                )
                * smootherstep((px_tp - 0.232) / 0.044)
                * taper_to_rigid_wrist
                + rigid_wrist_settle_68
            )
            w_grav_arm = (
                side_w
                * seam_free_w
                * np.clip(
                    np.maximum(
                        smootherstep((w_arm_sm - 0.10) / 0.22),
                        smootherstep((px_tp - 0.175) / 0.030) * smootherstep((pz_tp - 1.560) / 0.040),
                    ),
                    0.0,
                    1.0,
                )
                * smootherstep((z_eff - 1.455) / 0.038)
            )
            dz_grav_68 = s_sup_g * drop_sup_68 + s_inf_g * drop_inf_68
            p_target -= (musc_scale * w_grav_arm * dz_grav_68)[:, None] * g_up[None, :]
            # Conserve 3D muscular girth anteroposteriorly (`+-e_perp2`) where superior bicep peak flattens:
            ap_widen_68 = 0.28 * np.maximum(0.0, drop_sup_68 - drop_inf_68) * np.sin(ang_tp) * taper_to_rigid_wrist
            p_target += (musc_scale * w_grav_arm * ap_widen_68)[:, None] * (sgn * e_perp2)[None, :]

            # 1c) Round ONLY sharp LBS V-creases inside the proximal axilla (`<= 11 mm` with an UPWARD concave axillary arch so we
            #     NEVER create a flat triangular flying-squirrel web obscuring the axillary hollow or teres/tricep separation!):
            xb_sc = np.linspace(0.160, 0.380, 28)
            zb_sc = np.full_like(xb_sc, np.nan)
            bot_cand_m = (w_arm_sm > 0.08) & (zeta < -0.20) & (pz_tp > 1.42) & (np.abs(p_tp_lbs[:, 1]) < 0.115)
            for bi_s, bv_s in enumerate(xb_sc):
                mb_s = bot_cand_m & (np.abs(px_tp - bv_s) < 0.015)
                if np.sum(mb_s) >= 2:
                    zb_sc[bi_s] = float(np.percentile(pz_tp[mb_s], 8))
            fb_s = np.isfinite(zb_sc)
            if np.sum(fb_s) >= 6:
                zb_sc = np.interp(xb_sc, xb_sc[fb_s], zb_sc[fb_s])
                for _ in range(3):
                    zb_sc[1:-1] = 0.25 * zb_sc[:-2] + 0.50 * zb_sc[1:-1] + 0.25 * zb_sc[2:]
                i_s0 = int(np.searchsorted(xb_sc, 0.175))
                i_s1 = int(np.searchsorted(xb_sc, 0.345))
                s_lin = np.linspace(0.0, 1.0, i_s1 - i_s0 + 1)
                zb_chord = zb_sc[i_s0] + (zb_sc[i_s1] - zb_sc[i_s0]) * s_lin + 0.0065 * np.sin(np.pi * s_lin)
                dz_scoop_g = np.zeros_like(xb_sc)
                dz_scoop_g[i_s0 : i_s1 + 1] = np.maximum(0.0, zb_sc[i_s0 : i_s1 + 1] - zb_chord)
                for _ in range(4):
                    dz_scoop_g[1:-1] = 0.25 * dz_scoop_g[:-2] + 0.50 * dz_scoop_g[1:-1] + 0.25 * dz_scoop_g[2:]
                dz_scoop_v = np.clip(np.interp(np.clip(px_tp, xb_sc[0], xb_sc[-1]), xb_sc, dz_scoop_g) * 0.72, 0.0, 0.011)
                w_under_bridge = (
                    side_w
                    * seam_free_w
                    * smootherstep((-zeta - 0.12) / 0.34)
                    * smootherstep((px_tp - 0.170) / 0.026)
                    * (1.0 - smootherstep((px_tp - 0.335) / 0.032))
                    * (1.0 - smootherstep((np.abs(p_tp_lbs[:, 1]) - 0.092) / 0.034))
                )
                p_target -= (musc_scale * w_under_bridge * dz_scoop_v)[:, None] * g_up[None, :]

        # 3) Initial Raised-Arm Flank Stretch & Wide Bodybuilder Latissimus/Teres V-Taper seed (`refined in closed loop below!`):
        top_arm_blend = 1.0 - smootherstep((pz_tp - 1.545) / 0.042)
        distal_arm_taper = 1.0 - smootherstep((px_tp - 0.258) / 0.052)
        lat_shell_x = smootherstep((rx_sgn - 0.066) / 0.036)
        lat_y_band = smootherstep((ry + 0.128) / 0.036) * (1.0 - smootherstep((ry - 0.150) / 0.038))
        w_flank_gate = (
            side_w
            * seam_free_w
            * musc_scale
            * top_arm_blend
            * distal_arm_taper
            * (1.0 - smootherstep((w_arm_sm - 0.56) / 0.18))
            * lat_shell_x
            * lat_y_band
            * smootherstep((pz_tp - 1.182) / 0.024)
        )
        waist_notch_bridge = np.exp(-0.5 * (((pz_tp - 1.228) / 0.028) ** 2))
        u_lat_seed = np.clip((pz_tp - 1.190) / (1.515 - 1.190), 0.0, 1.0)
        p_target[:, 0] += sgn * w_flank_gate * (0.0120 * waist_notch_bridge + 0.0620 * u_lat_seed)

        # Axial upward fascia stretch (`+Z`) across the external-oblique / lower-serratus flank (`Z = 1.185..1.475m`):
        u_stretch_z = np.clip((pz_tp - 1.185) / (1.475 - 1.185), 0.0, 1.0)
        dz_flank_stretch = (0.0110 * np.sin(np.pi * u_stretch_z)) * smootherstep((rx_sgn - 0.088) / 0.036)
        p_target[:, 2] += w_flank_gate * dz_flank_stretch

        # Posterolateral latissimus/teres wing rounding (`Z >= 1.33m`, without downward tent webbing!):
        w_upper_lat_only = w_flank_gate * smootherstep((pz_tp - 1.330) / 0.065)
        p_target[:, 1] += 0.0080 * w_upper_lat_only * smootherstep((ry - 0.002) / 0.038)
        w_lat_arc_dn = w_upper_lat_only * smootherstep((px_tp - 0.175) / 0.038) * smootherstep((-zeta - 0.16) / 0.35)
        p_target -= (0.0032 * w_lat_arc_dn)[:, None] * g_up[None, :]

    # Narrow anterior core lock strictly to medial sternal cleavage (`|rx| <= 0.044m` above `rz = 1.40m`) & central 6-pack rectus abdominis
    # (`|rx| <= 0.074m` below `rz = 1.40m`), freeing lateral external obliques (`|rx| >= 0.092m`) & outer 70% of pectoralis major!
    w_arm_any = np.clip(
        w_full[:, j_names.index("upperarm_l")]
        + w_full[:, j_names.index("upperarm_pressure_l")]
        + w_full[:, j_names.index("lowerarm_l")]
        + w_full[:, j_names.index("upperarm_r")]
        + w_full[:, j_names.index("upperarm_pressure_r")]
        + w_full[:, j_names.index("lowerarm_r")],
        0.0,
        1.0,
    )
    w_arm_any_sm = smooth_vertex_vectors(np.repeat(w_arm_any[:, None], 3, axis=1), conn, rings=3)[:, 0]
    ant_core_keep = (
        smootherstep((-ry - 0.030) / 0.030)
        * (1.0 - smootherstep((np.abs(rx) - np.where(rz > 1.405, 0.044, 0.074)) / 0.020))
        * (1.0 - smootherstep((rz - 1.565) / 0.026))
        * (1.0 - smootherstep((w_arm_any_sm - 0.12) / 0.12))
    )
    post_spine_keep = (
        smootherstep((ry - 0.040) / 0.028)
        * (1.0 - smootherstep((np.abs(rx) - 0.046) / 0.042))
        * (1.0 - smootherstep((rz - 1.360) / 0.035))
    )
    torso_core_keep = np.clip(np.maximum(ant_core_keep, post_spine_keep), 0.0, 1.0)
    ant_x_gate = smootherstep((np.abs(rx) - 0.026) / 0.022)
    w_mob = (
        seam_free_w
        * np.where(ry > 0.0, 1.0, ant_x_gate)
        * smootherstep((z_eff - 1.174) / 0.024)
        * (1.0 - torso_core_keep)
    )
    w_mob[seam_lock_body] = 0.0
    p_target = p_full_lbs + w_mob[:, None] * (p_target - p_full_lbs)
    mid_body_v = np.abs(rx) <= 2.5e-4
    p_target[mid_body_v, 0] = 0.0

    p_u = np.column_stack([np.bincount(weld, weights=p_target[:, c], minlength=n_u) / mult for c in range(3)])
    p_lbs_u = np.column_stack([np.bincount(weld, weights=p_full_lbs[:, c], minlength=n_u) / mult for c in range(3)])
    rx_u, ry_u, rz_u = lean_rest_bl[first_u].T
    mid_u = np.abs(rx_u) <= 2.5e-4
    px_tp_u = np.abs(p_tp_lbs[first_u, 0])
    z_eff_u = np.maximum(rz_u, p_lean[first_u, 2])
    core_keep_u = torso_core_keep[first_u]
    inner_neck_guard_u = (
        0.0
        if has_coupled_head
        else smootherstep((rz_u - 1.665) / 0.018) * (1.0 - smootherstep((np.abs(rx_u) - 0.160) / 0.025))
    )

    flank_z_floor_u = np.where(np.abs(rx_u) > 0.088, 1.176, np.where(ry_u > 0.0, 1.280, 1.385))
    w_hinge_u = (
        seam_free_w[first_u]
        * np.where(ry_u > 0.005, 1.0, smootherstep((px_tp_u - 0.068) / 0.030))
        * (1.0 - smootherstep((px_tp_u - 0.635) / 0.045))
        * smootherstep((z_eff_u - flank_z_floor_u) / 0.032)
        * (1.0 - core_keep_u)
        * (1.0 - inner_neck_guard_u)
    )
    w_hinge_u[seam_u] = 0.0
    disp_u = p_u - p_lbs_u
    # Smooth 12-pass displacement fairing eliminates mask-edge steps across flank/chest/shoulder while keeping rounded deltoid caps:
    for _ in range(12):
        nbr_d = np.column_stack([np.bincount(es, weights=w_le * disp_u[ed, c], minlength=n_u) / deg_le for c in range(3)])
        disp_u += (0.36 * w_hinge_u)[:, None] * (nbr_d - disp_u)
        disp_u[seam_u] = 0.0
        disp_u[mid_u, 0] = 0.0
    p_u = p_lbs_u + disp_u
    p_u[mid_u, 0] = 0.0

    # Fair ONLY the narrow multi-bone LBS skinning fold (`hinge_only_u`, 14 passes) so posterior scapular/infraspinatus/teres
    # relief and anterior lower-pectoral contours stay crisp while eliminating sharp +68° hinge trenches:
    w_arm_u = w_arm_any_sm[first_u]
    hinge_only_u = np.clip(4.0 * w_arm_u * (1.0 - w_arm_u), 0.0, 1.0)
    ant_ax_cord_u = (
        np.clip(hinge_only_u + 0.68 * smootherstep((px_tp_u - 0.088) / 0.028) * (1.0 - smootherstep((px_tp_u - 0.268) / 0.034)), 0.0, 1.0)
        * smootherstep((-ry_u - 0.006) / 0.028)
        * smootherstep((px_tp_u - 0.085) / 0.028)
        * (1.0 - smootherstep((px_tp_u - 0.285) / 0.032))
        * smootherstep((rz_u - 1.392) / 0.028)
        * (1.0 - smootherstep((rz_u - 1.650) / 0.024))
    )
    lat_ax_wall_u = (
        0.65
        * smootherstep((ry_u + 0.088) / 0.032)
        * (1.0 - smootherstep((ry_u - 0.095) / 0.032))
        * smootherstep((px_tp_u - 0.125) / 0.026)
        * (1.0 - smootherstep((px_tp_u - 0.305) / 0.036))
        * smootherstep((rz_u - 1.240) / 0.032)
        * (1.0 - smootherstep((rz_u - 1.575) / 0.030))
    )
    sup_and_post_hinge_u = (
        np.clip(
            hinge_only_u
            + 0.45 * smootherstep((rz_u - 1.545) / 0.036) * (1.0 - smootherstep((px_tp_u - 0.265) / 0.032)) * smootherstep((px_tp_u - 0.125) / 0.028),
            0.0,
            1.0,
        )
        * smootherstep((ry_u + 0.014) / 0.028)
        * smootherstep((px_tp_u - 0.125) / 0.028)
        * (1.0 - smootherstep((px_tp_u - 0.315) / 0.036))
        * smootherstep((rz_u - 1.415) / 0.036)
        * (1.0 - smootherstep((rz_u - 1.668) / 0.024))
    )
    delt_bicep_hinge_u = (
        0.38
        * np.clip(hinge_only_u + 0.35, 0.0, 1.0)
        * smootherstep((px_tp_u - 0.265) / 0.024)
        * (1.0 - smootherstep((px_tp_u - 0.375) / 0.028))
        * smootherstep((rz_u - 1.380) / 0.036)
    )
    elbow_hinge_u = (
        0.42
        * smootherstep((px_tp_u - 0.405) / 0.024)
        * (1.0 - smootherstep((px_tp_u - 0.505) / 0.026))
        * smootherstep((rz_u - 1.240) / 0.040)
    )
    w_surf_fair = (
        seam_free_w[first_u]
        * (1.0 - core_keep_u)
        * (1.0 - inner_neck_guard_u)
        * np.maximum(
            np.maximum(ant_ax_cord_u, lat_ax_wall_u),
            np.maximum(sup_and_post_hinge_u, np.maximum(delt_bicep_hinge_u, elbow_hinge_u)),
        )
    )
    w_surf_fair[seam_u] = 0.0
    p_env_u = p_u - musc_detail_68_u
    m_g_inv = np.linalg.inv(m_g)

    sc_idx = np.flatnonzero(w_surf_fair > 0.015)
    if len(sc_idx):
        wsc = w_surf_fair[sc_idx, None]
        is_post_sup = np.maximum(sup_and_post_hinge_u[sc_idx, None], lat_ax_wall_u[sc_idx, None])
        is_ant_pec_strap = ant_ax_cord_u[sc_idx, None]
        prox_hinge_conv_g = np.maximum(
            (0.04 + 0.18 * (1.0 - smootherstep((px_tp_u[sc_idx] - 0.252) / 0.034)))[:, None],
            0.56 * is_ant_pec_strap,
        )
        for _ in range(18):
            nrm_s = vertex_normals(p_env_u[weld], tri_l, weld)[first_u][sc_idx]
            nbr_s = np.column_stack([np.bincount(es, weights=w_le * p_env_u[ed, c], minlength=n_u) / deg_le for c in range(3)])
            dp_s = nbr_s[sc_idx] - p_env_u[sc_idx]
            dot_s = np.einsum("ni,ni->n", dp_s, nrm_s)[:, None]
            dp_sn = dot_s * nrm_s
            dp_st = dp_s - dp_sn
            conc_g = is_post_sup * 0.72 + (1.0 - is_post_sup) * 0.74
            p_env_u[sc_idx] += wsc * (0.36 * dp_st + np.where(dot_s > 0.0, conc_g, prox_hinge_conv_g) * dp_sn)
            p_env_u[seam_u] = p_lbs_macro_u[seam_u]
            p_env_u[mid_u, 0] = 0.0

    # Preserve orthogonal-rotated 3-ring muscular sulci across pectorals, infraspinatus, teres major, trapezius & anterior/posterior
    # arm faces while damping rest-pose A-pose V-creases along the stretched superior/inferior arm silhouettes (`|zeta| > 0.28`):
    ant_armpit_stretch_u = (
        hinge_only_u
        * smootherstep((-ry_u + 0.010) / 0.026)
        * smootherstep((px_tp_u - 0.145) / 0.026)
        * (1.0 - smootherstep((px_tp_u - 0.255) / 0.028))
        * smootherstep((rz_u - 1.430) / 0.028)
        * (1.0 - smootherstep((rz_u - 1.620) / 0.026))
    )
    post_prox_pinch_u = (
        hinge_only_u
        * smootherstep((ry_u - 0.005) / 0.026)
        * smootherstep((px_tp_u - 0.145) / 0.024)
        * (1.0 - smootherstep((px_tp_u - 0.245) / 0.026))
        * smootherstep((rz_u - 1.430) / 0.028)
        * (1.0 - smootherstep((rz_u - 1.625) / 0.026))
    )
    pz_tp_u = p_tp_lbs[first_u, 2]
    top_bicep_crest_u = (
        smootherstep((pz_tp_u - 1.648) / 0.036)
        * smootherstep((px_tp_u - 0.300) / 0.032)
        * (1.0 - smootherstep((px_tp_u - 0.455) / 0.036))
    )
    rot_keep_u = np.clip(
        (1.0 - 0.65 * ant_armpit_stretch_u)
        * (1.0 - 0.55 * post_prox_pinch_u - 0.22 * elbow_hinge_u)
        * (1.0 - 0.45 * top_bicep_crest_u),
        0.25,
        1.0,
    )

    # Closed-loop `0.705` Horizontal T-Pose + `+68°` Wide Bodybuilder Latissimus/Teres Monotonic V-Taper + Smooth Shoulder/Arm Bridge:
    # Solves directly in `0.705` T-pose (`while guarding +68°` and strictly excluding distal arm `w_arm >= 0.62` from `+X` stretch!)
    # from the iliac waistband (`Z = 1.188m, ~17.35 cm`) up to the upper lat/teres arch (`Z = 1.505m, ~24.0 cm`), while the inferior
    # teres-axilla-tricep `-Z` bridge (`X = 0.195..0.35m` below) curves smoothly into the raised arm with ZERO corner cliff or back dent!
    z_vt_g = np.linspace(1.180, 1.512, 36)
    torso_fl_v = (np.abs(p_tp_lbs[:, 0]) < 0.264) & (w_arm_any_sm < 0.56) & (np.abs(rx) > 0.065) & (np.abs(rx) < 0.232) & (rz < 1.518)
    sgn_v = np.where(rx >= 0.0, 1.0, -1.0)
    fl_post_gate_v = (
        smootherstep((np.abs(rx) - 0.068) / 0.030)
        * (1.0 - smootherstep((np.abs(rx) - 0.220) / 0.024))
        * (1.0 - smootherstep((rz - 1.496) / 0.026))
        * (1.0 - smootherstep((np.abs(p_tp_lbs[:, 0]) - 0.248) / 0.040))
        * (1.0 - smootherstep((w_arm_any_sm - 0.48) / 0.18))
        * smootherstep((ry + 0.128) / 0.032)
        * (1.0 - smootherstep((ry - 0.150) / 0.038))
        * (1.0 - torso_core_keep)
        * seam_free_w
    )
    c35_k = float(np.cos(np.deg2rad(35.0)))
    s35_k = float(np.sin(np.deg2rad(35.0)))
    rest_hip_m = torso_fl_v & (np.abs(full_rest_bl[:, 2] - 1.188) < 0.014)
    x_iliac_anchor = float(np.percentile(np.abs(full_rest_bl[rest_hip_m, 0]), 98.5)) if np.any(rest_hip_m) else 0.1735
    f35_iliac_anchor = (
        float(np.percentile(np.abs(full_rest_bl[rest_hip_m, 0]) * c35_k - full_rest_bl[rest_hip_m, 1] * s35_k, 98.5))
        if np.any(rest_hip_m)
        else 0.1785
    )
    b35_iliac_anchor = (
        float(np.percentile(np.abs(full_rest_bl[rest_hip_m, 0]) * c35_k + full_rest_bl[rest_hip_m, 1] * s35_k, 98.5))
        if np.any(rest_hip_m)
        else 0.1785
    )

    for _ in range(4):
        p_cur_fl = (p_env_u + rot_keep_u[:, None] * rot_musc_detail_u)[weld].copy()
        p_cur_fl[seam_lock_body] = p_full_lbs[seam_lock_body]
        drest_fl = gltf_to_blender(np.einsum("vij,vj->vi", m_g_inv, blender_to_gltf(p_cur_fl) - blender_to_gltf(p_full_lbs)))
        drest_fl[seam_lock_body] = 0.0
        p_tp_pose, _, _, _ = eval_arm_pose_lbs(full_rest_bl + 0.705 * drest_fl, "bodySkin", compiled_family, raise_scale=0.705)
        abs_x_tp = np.abs(p_tp_pose[:, 0])
        y_tp_p = p_tp_pose[:, 1]
        z_tp_p = p_tp_pose[:, 2]
        proj_f35 = abs_x_tp * c35_k - y_tp_p * s35_k
        proj_b35 = abs_x_tp * c35_k + y_tp_p * s35_k

        xc_lat = np.full_like(z_vt_g, np.nan)
        fc_35 = np.full_like(z_vt_g, np.nan)
        bc_35 = np.full_like(z_vt_g, np.nan)
        for zi_s, zv_s in enumerate(z_vt_g):
            ms_all = torso_fl_v & (np.abs(z_tp_p - zv_s) < 0.015)
            if np.sum(ms_all) >= 4:
                xc_lat[zi_s] = float(np.percentile(abs_x_tp[ms_all], 99))
                fc_35[zi_s] = float(np.percentile(proj_f35[ms_all], 98.5))
                bc_35[zi_s] = float(np.percentile(proj_b35[ms_all], 98.5))
        if np.sum(np.isfinite(xc_lat)) < 12:
            break
        for arr_g in (xc_lat, fc_35, bc_35):
            ok_a = np.isfinite(arr_g)
            arr_g[:] = np.interp(z_vt_g, z_vt_g[ok_a], arr_g[ok_a])
            arr_g[1:-1] = 0.22 * arr_g[:-2] + 0.56 * arr_g[1:-1] + 0.22 * arr_g[2:]

        u_s = np.clip((z_vt_g - 1.188) / (1.504 - 1.188), 0.0, 1.0)
        s_chord = 0.86 * u_s + 0.14 * (u_s ** 1.25)
        w_on_g = smootherstep((z_vt_g - 1.180) / 0.020)

        x0_lat = max(0.1715, min(x_iliac_anchor, 0.1748))
        x1_lat = x0_lat + 0.0655 * musc_scale
        xt_lat = (1.0 - s_chord) * x0_lat + s_chord * x1_lat
        err_lat_g = np.clip(w_on_g * (xt_lat - xc_lat) / 0.705, -0.0035, 0.052)

        f0_35 = max(0.1755, min(f35_iliac_anchor, 0.1815))
        f1_35 = f0_35 + 0.0490 * musc_scale
        ft_35 = (1.0 - s_chord) * f0_35 + s_chord * f1_35
        err_f35_g = np.clip(w_on_g * ((ft_35 - fc_35) / c35_k) / 0.705, -0.0035, 0.046)

        b0_35 = max(0.1750, min(b35_iliac_anchor, 0.1845))
        b1_35 = b0_35 + 0.0570 * musc_scale
        bt_35 = (1.0 - s_chord) * b0_35 + s_chord * b1_35
        err_b35_g = np.clip(w_on_g * ((bt_35 - bc_35) / c35_k) / 0.705, -0.0035, 0.050)

        for arr_e in (err_lat_g, err_f35_g, err_b35_g):
            for _ in range(3):
                arr_e[1:-1] = 0.25 * arr_e[:-2] + 0.50 * arr_e[1:-1] + 0.25 * arr_e[2:]

        zc_v = np.clip(z_tp_p, z_vt_g[0], z_vt_g[-1])
        e_lat_v = np.interp(zc_v, z_vt_g, err_lat_g)
        e_f35_v = np.interp(zc_v, z_vt_g, err_f35_g)
        e_b35_v = np.interp(zc_v, z_vt_g, err_b35_g)

        w_ant_s = smootherstep((-ry - 0.032) / 0.048)
        w_post_s = smootherstep((ry - 0.036) / 0.048)
        w_mid_s = np.clip(1.0 - w_ant_s - w_post_s, 0.0, 1.0)
        err_comb_v = 0.58 * e_lat_v + 0.42 * (w_ant_s * e_f35_v + w_mid_s * e_lat_v + w_post_s * e_b35_v)

        xref_v = np.maximum(np.interp(zc_v, z_vt_g, xc_lat), 0.095)
        sh_prof = np.clip((abs_x_tp - 0.060) / np.maximum(xref_v - 0.060, 0.035), 0.0, 1.05) ** 1.08
        w_z_band_v = smootherstep((z_tp_p - 1.180) / 0.020) * (1.0 - smootherstep((z_tp_p - 1.525) / 0.032))
        dx_net_v = fl_post_gate_v * w_z_band_v * err_comb_v * sh_prof
        dx_net_u = np.bincount(weld, weights=sgn_v * dx_net_v, minlength=n_u) / mult
        dy_lat_u = np.bincount(
            weld,
            weights=0.14 * np.maximum(0.0, dx_net_v) * smootherstep((ry - 0.005) / 0.040) * smootherstep((z_tp_p - 1.320) / 0.060),
            minlength=n_u,
        ) / mult
        for _ in range(6):
            dx_net_u = 0.62 * dx_net_u + 0.38 * (np.bincount(es, weights=w_le * dx_net_u[ed], minlength=n_u) / deg_le)
            dy_lat_u = 0.62 * dy_lat_u + 0.38 * (np.bincount(es, weights=w_le * dy_lat_u[ed], minlength=n_u) / deg_le)
            dx_net_u[seam_u] = 0.0
            dx_net_u[mid_u] = 0.0
            dy_lat_u[seam_u] = 0.0
        p_env_u[:, 0] += 0.88 * musc_scale * dx_net_u
        p_env_u[:, 1] += 0.88 * musc_scale * dy_lat_u
        p_env_u[seam_u] = p_lbs_macro_u[seam_u]
        p_env_u[mid_u, 0] = 0.0

    # Closed-loop `0.705` Horizontal T-Pose + `+68°` 3D Cylindrical & Gravity-Settle Calibration (`X = 0.150..0.665m`):
    # 1) Smooths the 16-angle polar cross-section `R(X, theta)` across `X = 0.235..0.640m` (bridging the distal-deltoid `X ~ 0.32m`
    #    pinch and elbow/forearm kinks across ALL 360° viewing angles — Front, 3/4, Profile, Rear 3/4 & Back),
    # 2) Calibrates vertical `(Z_top, Z_bot)` with `100%` C2-smooth axillary transition (`zero boolean mask steps!`), lower-slung
    #    acromion/deltoid cap, flattened palms-down bicep top, fuller downward-settled tricep & forearm flexor bellies, and a level
    #    gravity-settled forearm-to-wrist axis (`0.000mm` bone-length change, `0.000mm` relative hand/finger distortion),
    # 3) Maps `dp_tp` to `+68°` via `m_g @ m_tp^{-1}` so `+68°` receives the exact bone-perpendicular 3D cylindrical & gravity sculpt!
    x_sh_g = np.linspace(0.150, 0.665, 52)
    x_cyl_c = np.linspace(0.235, 0.640, 42)
    n_th_c = 16
    th_c_arr = np.linspace(-np.pi, np.pi, n_th_c, endpoint=False)
    _, m_tp_ref, _, _ = eval_arm_pose_lbs(full_rest_bl, "bodySkin", compiled_family, raise_scale=0.705)
    m_tp_to_68 = np.einsum("vij,vjk->vik", m_g, np.linalg.inv(m_tp_ref))
    x_prof_k = np.array(
        [0.150, 0.185, 0.220, 0.255, 0.290, 0.330, 0.375, 0.425, 0.470, 0.520, 0.575, 0.630, 0.665], dtype=np.float64
    )
    # Normalized top profile `s_top_k` preserving a distinct low-slung deltoid cap (`0.22..0.26m`), smooth step-down into an
    # elongated flat palms-down bicep (`0.33..0.43m`), crisp elbow (`0.47m`), and athletic brachioradialis swell (`0.52m`):
    s_top_k = np.array(
        [0.790, 0.580, 0.610, 0.580, 0.445, 0.245, 0.190, 0.150, 0.090, 0.135, 0.085, 0.025, 0.000], dtype=np.float64
    )
    # Dense-muscle bottom offset `dz_bot_k` preserving a clean axillary tuck (`0.255m`), proud settled tricep belly (`0.335m`),
    # crisp elbow taper (`0.47m`), and distinct forearm flexor belly (`0.52m`) relative to settled wrist (`0.0m` at `0.665m`):
    dz_bot_k = np.array(
        [-0.044, -0.044, -0.044, -0.044, -0.058, -0.065, -0.061, -0.047, -0.033, -0.045, -0.036, -0.014, 0.000],
        dtype=np.float64,
    )
    z_neck_hd_anch: float | None = None
    if has_coupled_head and head_rest_bl is not None:
        m_nh = (np.abs(np.abs(head_rest_bl[:, 0]) - 0.125) < 0.014) & (head_rest_bl[:, 2] > 1.68) & (head_rest_bl[:, 2] < 1.79)
        if np.sum(m_nh) >= 3:
            z_neck_hd_anch = float(np.percentile(head_rest_bl[m_nh, 2], 98.5))
    w_arm_bot_smooth = smootherstep((w_arm_any_sm - 0.08) / 0.22)
    for it_sh in range(4):
        p_cur_sh = (p_env_u + rot_keep_u[:, None] * rot_musc_detail_u)[weld].copy()
        p_cur_sh[seam_lock_body] = p_full_lbs[seam_lock_body]
        drest_sh = gltf_to_blender(np.einsum("vij,vj->vi", m_g_inv, blender_to_gltf(p_cur_sh) - blender_to_gltf(p_full_lbs)))
        drest_sh[seam_lock_body] = 0.0
        p_sh_pose, _, _, _ = eval_arm_pose_lbs(full_rest_bl + 0.705 * drest_sh, "bodySkin", compiled_family, raise_scale=0.705)
        ax_sh = np.abs(p_sh_pose[:, 0])
        py_sh = p_sh_pose[:, 1]
        pz_sh = p_sh_pose[:, 2]

        # 3D 16-angle polar de-pinching across `X = 0.235..0.640m` (erases distal-deltoid `X ~ 0.32m` V-dent & 3/4 ridges!):
        dy_cyl_v = np.zeros(len(p_sh_pose), dtype=np.float64)
        dz_cyl_v = np.zeros(len(p_sh_pose), dtype=np.float64)
        if it_sh < 3:
            m_arm_c = (w_arm_any_sm > 0.22) & (ax_sh >= 0.225) & (ax_sh <= 0.650) & (pz_sh > 1.44)
            yc_c = np.zeros_like(x_cyl_c)
            zc_c = np.zeros_like(x_cyl_c)
            for xi_c, xv_c in enumerate(x_cyl_c):
                mc_s = m_arm_c & (np.abs(ax_sh - xv_c) < 0.015)
                if np.sum(mc_s) >= 4:
                    yc_c[xi_c] = 0.5 * (float(np.percentile(py_sh[mc_s], 95)) + float(np.percentile(py_sh[mc_s], 5)))
                    zc_c[xi_c] = 0.5 * (float(np.percentile(pz_sh[mc_s], 95)) + float(np.percentile(pz_sh[mc_s], 5)))
                else:
                    yc_c[xi_c] = yc_c[xi_c - 1] if xi_c > 0 else 0.01
                    zc_c[xi_c] = zc_c[xi_c - 1] if xi_c > 0 else 1.60
            for _ in range(8):
                yc_c[1:-1] = 0.25 * yc_c[:-2] + 0.50 * yc_c[1:-1] + 0.25 * yc_c[2:]
                zc_c[1:-1] = 0.25 * zc_c[:-2] + 0.50 * zc_c[1:-1] + 0.25 * zc_c[2:]
            yc_vv = np.interp(np.clip(ax_sh, x_cyl_c[0], x_cyl_c[-1]), x_cyl_c, yc_c)
            zc_vv = np.interp(np.clip(ax_sh, x_cyl_c[0], x_cyl_c[-1]), x_cyl_c, zc_c)
            dy_rel = py_sh - yc_vv
            dz_rel = pz_sh - zc_vv
            rad_c = np.maximum(np.hypot(dy_rel, dz_rel), 1e-4)
            ang_c = np.arctan2(dy_rel, dz_rel)
            rg_c = np.full((len(x_cyl_c), n_th_c), np.nan, dtype=np.float64)
            for xi_c, xv_c in enumerate(x_cyl_c):
                mc_s = m_arm_c & (np.abs(ax_sh - xv_c) < 0.016)
                if np.sum(mc_s) < 6:
                    continue
                as_c, rs_c = ang_c[mc_s], rad_c[mc_s]
                for ti_c, tc_c in enumerate(th_c_arr):
                    da_c = np.abs((as_c - tc_c + np.pi) % (2.0 * np.pi) - np.pi)
                    mt_c = da_c < (np.pi / 6.2)
                    if np.sum(mt_c) >= 2:
                        rg_c[xi_c, ti_c] = float(np.percentile(rs_c[mt_c], 88))
            for ti_c in range(n_th_c):
                ok_c = np.isfinite(rg_c[:, ti_c])
                if np.sum(ok_c) >= 8:
                    rg_c[:, ti_c] = np.interp(x_cyl_c, x_cyl_c[ok_c], rg_c[ok_c, ti_c])
            if np.all(np.isfinite(rg_c)):
                rs_sm = rg_c.copy()
                # Gentle 6-pass polar smoothing removes single-ring skinning kinks while preserving deltoid, tricep, elbow & forearm bellies:
                for _ in range(6):
                    rs_sm[1:-1, :] = 0.24 * rs_sm[:-2, :] + 0.52 * rs_sm[1:-1, :] + 0.24 * rs_sm[2:, :]
                    rs_sm = 0.08 * np.roll(rs_sm, -1, axis=1) + 0.84 * rs_sm + 0.08 * np.roll(rs_sm, 1, axis=1)
                xf_c = np.clip((ax_sh - x_cyl_c[0]) / (x_cyl_c[1] - x_cyl_c[0]), 0.0, len(x_cyl_c) - 1.0001)
                x0_c = xf_c.astype(np.int64)
                tx_c = xf_c - x0_c
                tf_c = ((ang_c + np.pi) / (2.0 * np.pi)) * n_th_c
                t0_c = np.floor(tf_c).astype(np.int64) % n_th_c
                t1_c = (t0_c + 1) % n_th_c
                tt_c = tf_c - np.floor(tf_c)
                dr_c_grid = rs_sm - rg_c
                dr_c_v = (
                    (1.0 - tx_c) * ((1.0 - tt_c) * dr_c_grid[x0_c, t0_c] + tt_c * dr_c_grid[x0_c, t1_c])
                    + tx_c * ((1.0 - tt_c) * dr_c_grid[x0_c + 1, t0_c] + tt_c * dr_c_grid[x0_c + 1, t1_c])
                )
                dr_c_v = np.clip(dr_c_v, -0.008, 0.011) / 0.705
                w_cyl_v = (
                    smootherstep((w_arm_any_sm - 0.22) / 0.22)
                    * smootherstep((ax_sh - 0.255) / 0.032)
                    * (1.0 - smootherstep((ax_sh - 0.605) / 0.038))
                    * smootherstep((pz_sh - 1.460) / 0.035)
                    * seam_free_w
                )
                dy_cyl_v = 0.38 * musc_scale * w_cyl_v * dr_c_v * (dy_rel / rad_c)
                dz_cyl_v = 0.38 * musc_scale * w_cyl_v * dr_c_v * (dz_rel / rad_c)

        zt_sh = np.full_like(x_sh_g, np.nan)
        zb_sh = np.full_like(x_sh_g, np.nan)
        for xi_k, xv_k in enumerate(x_sh_g):
            mk_t = (np.abs(ax_sh - xv_k) < 0.013) & (pz_sh > 1.48)
            mk_b = (np.abs(ax_sh - xv_k) < 0.013) & (pz_sh > 1.44) & (w_arm_any_sm > 0.14)
            if np.sum(mk_t) >= 3:
                zt_sh[xi_k] = float(np.percentile(pz_sh[mk_t], 98.5))
            if xv_k >= 0.250 and np.sum(mk_b) >= 3:
                zb_sh[xi_k] = float(np.percentile(pz_sh[mk_b], 2.5))
        if np.sum(np.isfinite(zt_sh)) >= 16 and np.sum(np.isfinite(zb_sh)) >= 12:
            zt_sh = np.interp(x_sh_g, x_sh_g[np.isfinite(zt_sh)], zt_sh[np.isfinite(zt_sh)])
            zb_sh = np.interp(x_sh_g, x_sh_g[np.isfinite(zb_sh)], zb_sh[np.isfinite(zb_sh)])
            z_wr_top = float(zt_sh[-1])
            z_wr_bot = float(zb_sh[-1])
            z_neck_anch = z_neck_hd_anch if z_neck_hd_anch is not None else float(zt_sh[0] + 0.020)
            zt_musc = z_wr_top + np.maximum(z_neck_anch - z_wr_top, 0.085) * np.interp(x_sh_g, x_prof_k, s_top_k)
            zb_musc = z_wr_bot + np.interp(x_sh_g, x_prof_k, dz_bot_k)
            for _ in range(2):
                zt_musc[1:-1] = 0.22 * zt_musc[:-2] + 0.56 * zt_musc[1:-1] + 0.22 * zt_musc[2:]
                zb_musc[1:-1] = 0.22 * zb_musc[:-2] + 0.56 * zb_musc[1:-1] + 0.22 * zb_musc[2:]
            zt_tgt = (1.0 - musc_scale) * zt_sh + musc_scale * zt_musc
            zb_tgt = (1.0 - musc_scale) * zb_sh + musc_scale * zb_musc
            taper_sh_end = (1.0 - smootherstep((x_sh_g - 0.625) / 0.042)) * smootherstep((x_sh_g - 0.145) / 0.028)
            dz_top_g = np.clip((zt_tgt - zt_sh) / 0.705, -0.058, 0.026) * taper_sh_end
            dz_bot_g = (
                np.clip((zb_tgt - zb_sh) / 0.705, -0.054, 0.016)
                * smootherstep((x_sh_g - 0.245) / 0.038)
                * (1.0 - smootherstep((x_sh_g - 0.625) / 0.042))
            )
            for _ in range(2):
                dz_top_g[1:-1] = 0.22 * dz_top_g[:-2] + 0.56 * dz_top_g[1:-1] + 0.22 * dz_top_g[2:]
                dz_bot_g[1:-1] = 0.22 * dz_bot_g[:-2] + 0.56 * dz_bot_g[1:-1] + 0.22 * dz_bot_g[2:]
            xc_sh = np.clip(ax_sh, x_sh_g[0], x_sh_g[-1])
            dz_top_v = np.interp(xc_sh, x_sh_g, dz_top_g)
            dz_bot_v = np.interp(xc_sh, x_sh_g, dz_bot_g)
            z_mid_arm = np.interp(xc_sh, x_sh_g, 0.5 * (zt_sh + zb_sh))
            h_half_arm = np.maximum(np.interp(xc_sh, x_sh_g, 0.5 * (zt_sh - zb_sh)), 0.035)
            s_up_v = smootherstep((pz_sh - (z_mid_arm - 0.75 * h_half_arm)) / (1.50 * h_half_arm))
            w_act_top = smootherstep((ax_sh - 0.140) / 0.026) * (1.0 - smootherstep((ax_sh - 0.635) / 0.040)) * smootherstep((pz_sh - 1.480) / 0.035) * seam_free_w * (1.0 - torso_core_keep)
            w_act_bot = smootherstep((ax_sh - 0.242) / 0.038) * (1.0 - smootherstep((ax_sh - 0.635) / 0.040)) * w_arm_bot_smooth * smootherstep((pz_sh - 1.445) / 0.035) * seam_free_w
            dz_tp_v = s_up_v * (w_act_top * dz_top_v) + (1.0 - s_up_v) * (w_act_bot * dz_bot_v)
            dp_tp_bl = np.zeros_like(p_sh_pose)
            dp_tp_bl[:, 1] = dy_cyl_v
            dp_tp_bl[:, 2] = dz_cyl_v + 0.85 * dz_tp_v
            dp_68_bl = gltf_to_blender(np.einsum("vij,vj->vi", m_tp_to_68, blender_to_gltf(dp_tp_bl)))
            dp_68_u = np.column_stack([np.bincount(weld, weights=dp_68_bl[:, c], minlength=n_u) / mult for c in range(3)])
            for _ in range(3):
                nbr_sh = np.column_stack([np.bincount(es, weights=w_le * dp_68_u[ed, c], minlength=n_u) / deg_le for c in range(3)])
                dp_68_u = 0.72 * dp_68_u + 0.28 * nbr_sh
                dp_68_u[seam_u] = 0.0
                dp_68_u[mid_u, 0] = 0.0
            p_env_u += dp_68_u
            p_env_u[seam_u] = p_lbs_macro_u[seam_u]
            p_env_u[mid_u, 0] = 0.0

    # Light 3-pass micro-pinch fairing strictly across the multi-bone deltoid-bicep & elbow seams (`preserving full deltoid cap,
    # axillary tuck, tricep belly & forearm swell!` ):
    w_arm_polish_u = (
        seam_free_w[first_u]
        * smootherstep((w_arm_u - 0.18) / 0.20)
        * smootherstep((px_tp_u - 0.245) / 0.030)
        * (1.0 - smootherstep((px_tp_u - 0.595) / 0.035))
        * smootherstep((rz_u - 1.240) / 0.045)
        * (1.0 - core_keep_u)
        * (1.0 - inner_neck_guard_u)
    )
    ap_idx = np.flatnonzero(w_arm_polish_u > 0.02)
    if len(ap_idx):
        wap = (musc_scale * w_arm_polish_u[ap_idx])[:, None]
        for _ in range(3):
            nrm_ap = vertex_normals(p_env_u[weld], tri_l, weld)[first_u][ap_idx]
            nbr_ap = np.column_stack([np.bincount(es, weights=w_le * p_env_u[ed, c], minlength=n_u) / deg_le for c in range(3)])
            dp_ap = nbr_ap[ap_idx] - p_env_u[ap_idx]
            dot_ap = np.einsum("ni,ni->n", dp_ap, nrm_ap)[:, None]
            dp_apn = dot_ap * nrm_ap
            dp_apt = dp_ap - dp_apn
            p_env_u[ap_idx] += wap * (0.22 * dp_apt + np.where(dot_ap > 0.0, 0.36, 0.06) * dp_apn)
            p_env_u[seam_u] = p_lbs_macro_u[seam_u]
            p_env_u[mid_u, 0] = 0.0

    p_u = p_env_u + rot_keep_u[:, None] * rot_musc_detail_u
    p_u[seam_u] = p_lbs_u[seam_u]
    p_u[mid_u, 0] = 0.0

    # Manifold & self-intersection guard at both +68 deg and 0.705 T-pose:
    si_before = self_intersections(p_lean, tri_l, weld) | self_intersections(p_full_lbs, tri_l, weld)
    base_ar_ra = face_areas(p_lean, tri_l)
    for _ in range(10):
        chk_u_all = p_u[weld]
        chk_u_all[seam_lock_body] = p_full_lbs[seam_lock_body]
        bf_pre = bad_faces(chk_u_all, tri_l, base_ar_ra, conn)
        si_pre = self_intersections(chk_u_all, tri_l, weld) - si_before
        if not si_pre and not np.any(bf_pre):
            break
        ff_pre = set(np.flatnonzero(bf_pre).tolist())
        for a, b in si_pre:
            ff_pre.add(a)
            ff_pre.add(b)
        patch_ra = np.zeros(n_u, dtype=np.float64)
        patch_ra[np.unique(weld[tri_l[list(ff_pre)].ravel()])] = 1.0
        for _ in range(2):
            patch_ra = np.maximum(patch_ra * 0.72, np.bincount(es, weights=patch_ra[ed], minlength=n_u) / deg_u)
        patch_ra[seam_u] = 0.0
        for _ in range(4):
            nbr_fix = np.column_stack([np.bincount(es, weights=w_le * p_u[ed, c], minlength=n_u) / deg_le for c in range(3)])
            p_u += (0.45 * patch_ra)[:, None] * (nbr_fix - p_u)
            p_u[seam_u] = p_lbs_u[seam_u]

    del_ra_u = p_u - p_lbs_u
    for _ in range(12):
        chk_p = p_full_lbs + del_ra_u[weld]
        chk_p[seam_lock_body] = p_full_lbs[seam_lock_body]
        si_cur = self_intersections(chk_p, tri_l, weld) - si_before
        bf_cur = bad_faces(chk_p, tri_l, base_ar_ra, conn)
        if not si_cur and not np.any(bf_cur):
            break
        ff_ra = set(np.flatnonzero(bf_cur).tolist())
        for a, b in si_cur:
            ff_ra.add(a)
            ff_ra.add(b)
        att_ra = np.zeros(n_u, dtype=np.float64)
        att_ra[np.unique(weld[tri_l[list(ff_ra)].ravel()])] = 1.0
        for _ in range(3):
            att_ra = np.maximum(att_ra * 0.76, np.bincount(es, weights=att_ra[ed], minlength=n_u) / deg_u)
        del_ra_u *= (1.0 - 0.38 * np.clip(att_ra, 0.0, 1.0))[:, None]

    p_final = p_full_lbs + del_ra_u[weld]
    p_final[seam_lock_body] = p_full_lbs[seam_lock_body]
    si_after = self_intersections(p_final, tri_l, weld) - si_before
    bf_after = int(bad_faces(p_final, tri_l, base_ar_ra, conn).sum())

    dp_gltf = blender_to_gltf(p_final) - blender_to_gltf(p_full_lbs)
    drest_gltf = np.einsum("vij,vj->vi", m_g_inv, dp_gltf)
    drest_bl = gltf_to_blender(drest_gltf)
    drest_bl[seam_lock_body] = 0.0

    # Also verify 0 bad faces & 0 new self-intersections at 0.705 Horizontal T-Pose:
    p_tp_cor, _, _, _ = eval_arm_pose_lbs(full_rest_bl + 0.705 * drest_bl, "bodySkin", compiled_family, raise_scale=0.705)
    si_tp_base = self_intersections(p_lean_tp, tri_l, weld) | self_intersections(p_tp_lbs, tri_l, weld)
    si_tp_after = self_intersections(p_tp_cor, tri_l, weld) - si_tp_base
    bf_tp_after = int(bad_faces(p_tp_cor, tri_l, face_areas(p_lean_tp, tri_l), conn).sum())

    w_left = smootherstep((rx + 0.015) / 0.030)[:, None]
    d_left_bl = w_left * drest_bl
    d_right_bl = (1.0 - w_left) * drest_bl

    out_meta: dict = {
        "applied": True,
        "mode": "lean-muscular-scapulohumeral-corrective",
        "muscularScale": round(musc_scale, 4),
        "newSelfIntersections": int(len(si_after)),
        "newSelfIntersectionsTPose": int(len(si_tp_after)),
        "badFaces": bf_after,
        "badFacesTPose": bf_tp_after,
        "maxRestDeltaMm": round(float(np.linalg.norm(drest_bl, axis=1).max() * 1000.0), 3),
        "collarSeamMaxDeltaMm": 0.0,
    }

    if has_coupled_head and head_rest_bl is not None and head_tri is not None and seam_head is not None:
        h_ref = lean_head_bl if lean_head_bl is not None else head_rest_bl
        hx, _, hz = h_ref.T
        p_hd_lbs, m_g_hd, _, _ = eval_arm_pose_lbs(head_rest_bl, "headSkin", compiled_family, raise_scale=1.0)
        h_conn = weld_connectivity(h_ref, head_tri, decimals=5)
        h_weld, (h_es, h_ed), h_mult, h_deg = h_conn
        n_hu = len(h_mult)
        h_deg_f = np.maximum(h_deg.astype(np.float64), 1.0)
        h_first = np.zeros(n_hu, dtype=np.int64)
        h_first[h_weld[::-1]] = np.arange(len(h_weld) - 1, -1, -1)

        # Initialize headSkin lower trapezius slope (`smoothly bridging X=0.090..0.165m without puffing above the settled shoulder`) and harmonically weld to seam_body:
        shrug_hd_z = head_rest_bl[:, 2] + (0.0065 * musc_scale) * smootherstep((np.abs(hx) - 0.105) / 0.052)
        w_hd_trap = (
            smootherstep((np.abs(hx) - 0.080) / 0.024)
            * (1.0 - smootherstep((hz - 1.756) / 0.016))
        )
        dp_hd_init = np.zeros_like(head_rest_bl, dtype=np.float64)
        dp_hd_init[:, 2] = w_hd_trap * np.maximum(0.0, shrug_hd_z - p_hd_lbs[:, 2])
        dp_hd_seam = p_final[seam_body] - p_hd_lbs[seam_head]
        dp_hd_init[seam_head] = dp_hd_seam

        dp_hu = np.column_stack([np.bincount(h_weld, weights=dp_hd_init[:, c], minlength=n_hu) / h_mult for c in range(3)])
        hu_x, _, hu_z = h_ref[h_first].T
        hu_lock = (hu_z >= 1.766) | ((np.abs(hu_x) <= 0.075) & (hu_z >= 1.692))
        hu_seam = h_weld[seam_head]
        dp_hu_seam_vals = np.column_stack([np.bincount(h_weld[seam_head], weights=dp_hd_seam[:, c], minlength=n_hu) for c in range(3)])
        seam_cnt = np.bincount(h_weld[seam_head], minlength=n_hu)
        has_s_u = seam_cnt > 0
        dp_hu_seam_vals[has_s_u] /= seam_cnt[has_s_u, None]
        dp_hu[hu_lock] = 0.0
        dp_hu[has_s_u] = dp_hu_seam_vals[has_s_u]

        for _ in range(36):
            nbr_hu = np.column_stack([np.bincount(h_es, weights=dp_hu[h_ed, c], minlength=n_hu) / h_deg_f for c in range(3)])
            dp_hu = 0.30 * dp_hu + 0.70 * nbr_hu
            dp_hu[hu_lock] = 0.0
            dp_hu[has_s_u] = dp_hu_seam_vals[has_s_u]

        dp_hd_final = dp_hu[h_weld]
        dp_hd_final[seam_head] = dp_hd_seam
        drest_hd_bl = gltf_to_blender(np.einsum("vij,vj->vi", np.linalg.inv(m_g_hd), blender_to_gltf(dp_hd_final)))
        drest_hd_bl[seam_head] = drest_bl[seam_body]

        w_hd_left = smootherstep((hx + 0.015) / 0.030)[:, None]
        d_hd_left_bl = w_hd_left * drest_hd_bl
        d_hd_right_bl = (1.0 - w_hd_left) * drest_hd_bl
        d_hd_left_bl[seam_head] = d_left_bl[seam_body]
        d_hd_right_bl[seam_head] = d_right_bl[seam_body]

        p_hd_68_cor, _, _, _ = eval_arm_pose_lbs(head_rest_bl + drest_hd_bl, "headSkin", compiled_family, raise_scale=1.0)
        p_hd_tp_cor, _, _, _ = eval_arm_pose_lbs(head_rest_bl + 0.705 * drest_hd_bl, "headSkin", compiled_family, raise_scale=0.705)
        seam_gap_68 = float(np.linalg.norm(p_final[seam_body] - p_hd_68_cor[seam_head], axis=1).max() * 1000.0)
        seam_gap_tp = float(np.linalg.norm(p_tp_cor[seam_body] - p_hd_tp_cor[seam_head], axis=1).max() * 1000.0)
        hd_bf_68 = int(bad_faces(p_hd_68_cor, head_tri, face_areas(head_rest_bl, head_tri), h_conn).sum())
        hd_bf_tp = int(bad_faces(p_hd_tp_cor, head_tri, face_areas(head_rest_bl, head_tri), h_conn).sum())
        out_meta["collarSeamMaxDeltaMm"] = round(max(seam_gap_68, seam_gap_tp), 6)
        out_meta["headBadFaces"] = hd_bf_68
        out_meta["headBadFacesTPose"] = hd_bf_tp
        out_meta["headMaxRestDeltaMm"] = round(float(np.linalg.norm(drest_hd_bl, axis=1).max() * 1000.0), 3)
        out_meta["_headLeftBl"] = d_hd_left_bl
        out_meta["_headRightBl"] = d_hd_right_bl

    return d_left_bl, d_right_bl, out_meta


def solve_raised_arm_gravity_corrective(
    lean_rest_bl: np.ndarray,
    full_rest_bl: np.ndarray,
    tri_l: np.ndarray,
    compiled_family: dict,
    seam_body: np.ndarray,
    adipose_gate: float = 1.0,
    lean_head_bl: np.ndarray | None = None,
    head_rest_bl: np.ndarray | None = None,
    head_tri: np.ndarray | None = None,
    seam_head: np.ndarray | None = None,
    muscle_gate: float = 0.5,
) -> tuple[np.ndarray, np.ndarray, dict]:
    """Solve fold-free soft-tissue sleeve de-shrug, axillary unpinch & -Z gravity tricep hang for full builds, or scapulohumeral muscular arch for lean muscular builds."""
    ad_g = float(np.clip(adipose_gate, 0.0, 1.0))
    ms_g = float(np.clip(muscle_gate, 0.0, 1.0))
    if ad_g <= 0.02:
        return _solve_lean_muscular_raised_arm_corrective(
            lean_rest_bl,
            full_rest_bl,
            tri_l,
            compiled_family,
            seam_body,
            lean_head_bl=lean_head_bl,
            head_rest_bl=head_rest_bl,
            head_tri=head_tri,
            seam_head=seam_head,
            muscle_gate=ms_g,
        )
    import hashlib as _hl
    import inspect as _insp
    import json as _json
    from pathlib import Path as _Path

    has_ext_head = (
        (head_rest_bl is not None)
        and (head_tri is not None)
        and (seam_head is not None)
        and (abs(ms_g - 0.50) > 0.10)
    )

    _ra_cache_dir = _Path("/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study/family-20261113/fits/_raw_fit_cache")
    _ra_h = _hl.sha256()
    _ra_h.update(_insp.getsource(solve_raised_arm_gravity_corrective).encode("utf-8"))
    _ra_h.update(np.array([ad_g, ms_g if has_ext_head else 0.5], dtype=np.float64).tobytes())
    _ra_h.update(np.round(lean_rest_bl[lean_rest_bl[:, 2] < 1.56], 5).astype(np.float32).tobytes())
    _ra_h.update(np.round(full_rest_bl[lean_rest_bl[:, 2] < 1.56], 5).astype(np.float32).tobytes())
    if has_ext_head and head_rest_bl is not None:
        _ra_h.update(np.round(head_rest_bl[::8], 5).astype(np.float32).tobytes())
    _ra_cp = _ra_cache_dir / f"stage-raised-arm-{_ra_h.hexdigest()[:14]}.npz"
    if _ra_cp.is_file():
        _z = np.load(_ra_cp, allow_pickle=False)
        _q = _json.loads(str(_z["qualityJson"]))
        if "mode" not in _q or _q["mode"] is None:
            _q["applied"] = True
            _q["mode"] = "adipose-gravity-tpose-corrective"
        if "headLeft" in _z.files and "headRight" in _z.files:
            _q["_headLeftBl"] = _z["headLeft"].astype(np.float64)
            _q["_headRightBl"] = _z["headRight"].astype(np.float64)
        return _z["left"].astype(np.float64), _z["right"].astype(np.float64), _q

    p_lean, _, hw_bl, j_names = eval_arm_pose_lbs(lean_rest_bl, "bodySkin", compiled_family, raise_scale=1.0)
    p_lean_tp, _, _, _ = eval_arm_pose_lbs(lean_rest_bl, "bodySkin", compiled_family, raise_scale=0.705)
    p_full_lbs, m_g, _, _ = eval_arm_pose_lbs(full_rest_bl, "bodySkin", compiled_family, raise_scale=1.0)
    p_tp_lbs, _, _, _ = eval_arm_pose_lbs(full_rest_bl, "bodySkin", compiled_family, raise_scale=0.705)

    n_j = len(j_names)
    me_b = compiled_family["meshes"]["bodySkin"]
    j_idx = np.asarray(me_b["jointIndices"], dtype=np.int64).reshape(len(lean_rest_bl), 4)
    j_wt = np.asarray(me_b["jointWeights"], dtype=np.float64).reshape(len(lean_rest_bl), 4)
    j_wt /= np.maximum(j_wt.sum(axis=1, keepdims=True), 1e-12)
    w_full = np.zeros((len(lean_rest_bl), n_j), dtype=np.float64)
    for k in range(4):
        w_full[np.arange(len(lean_rest_bl)), j_idx[:, k]] += j_wt[:, k]

    conn = weld_connectivity(lean_rest_bl, tri_l, decimals=5)
    weld, (es, ed), mult, _ = conn
    n_u = len(mult)
    first_u = np.zeros(n_u, dtype=np.int64)
    first_u[weld[::-1]] = np.arange(len(weld) - 1, -1, -1)

    rx, ry, rz = lean_rest_bl.T
    dfat_rest = full_rest_bl - lean_rest_bl
    dfat_posed = p_full_lbs - p_lean

    nrm_lean_rest = vertex_normals(lean_rest_bl, tri_l, weld)
    fat_thick = np.clip(np.einsum("vi,vi->v", dfat_rest, nrm_lean_rest), 0.0, 0.085)
    fat_smooth = smooth_vertex_vectors(np.repeat(fat_thick[:, None], 3, axis=1), conn, rings=5)[:, 0]
    nrm_lean_p = vertex_normals(p_lean, tri_l, weld)

    pec_probe = (np.abs(rx) >= 0.07) & (np.abs(rx) <= 0.14) & (rz >= 1.44) & (rz <= 1.53) & (ry < -0.06)
    pec_fat_scalar = float(np.median(fat_smooth[pec_probe])) if np.any(pec_probe) else 0.0

    p_target = p_full_lbs.copy()
    z_eff = np.maximum(rz, p_lean[:, 2])
    arm_post_specs: list[tuple[float, np.ndarray, np.ndarray, np.ndarray, np.ndarray, float]] = []

    topo_body_masks = build_body_region_joint_masks(lean_rest_bl, tri_l, j_names, w_full)
    for side_name, sgn in (("l", 1.0), ("r", -1.0)):
        arm_sleeve_side = (
            topo_body_masks["armSleeveLeftVertex"] if sgn > 0 else topo_body_masks["armSleeveRightVertex"]
        )
        i_up = j_names.index(f"upperarm_{side_name}")
        i_pr = j_names.index(f"upperarm_pressure_{side_name}")
        i_lo = j_names.index(f"lowerarm_{side_name}")
        i_ha = j_names.index(f"hand_{side_name}")

        w_arm_side = np.clip(w_full[:, i_up] + w_full[:, i_pr] + w_full[:, i_lo] + w_full[:, i_ha], 0.0, 1.0)
        w_arm_smooth = smooth_vertex_vectors(np.repeat(w_arm_side[:, None], 3, axis=1), conn, rings=5)[:, 0]

        sh = hw_bl[i_up]
        el = hw_bl[i_lo]
        u_vec = el - sh
        u_len = float(np.linalg.norm(u_vec))
        u_hat = u_vec / u_len

        z_world = np.array([0.0, 0.0, 1.0])
        g_up = z_world - float(np.dot(z_world, u_hat)) * u_hat
        g_up /= np.linalg.norm(g_up)

        side_w = smootherstep((sgn * rx - 0.015) / 0.035)
        rel_p = p_lean - sh[None, :]
        t_ax = (rel_p @ u_hat) / u_len
        c_bone = sh[None, :] + np.clip(t_ax, -0.15, 1.25)[:, None] * u_vec[None, :]
        r_lean = p_lean - c_bone
        r_rad = np.maximum(np.linalg.norm(r_lean, axis=1), 1e-4)
        zeta = np.clip((r_lean @ g_up) / r_rad, -1.0, 1.0)

        t_bins = np.linspace(-0.20, 1.15, 28)
        dz_top_bins = np.zeros_like(t_bins)
        dz_bot_bins = np.zeros_like(t_bins)
        f_rad_bins = np.zeros_like(t_bins)
        for bi, tv in enumerate(t_bins):
            m_arm = (w_arm_smooth > 0.18) & (np.abs(t_ax - tv) < 0.10) & (z_eff > 1.46)
            if np.sum(m_arm) >= 4:
                f_rad_bins[bi] = float(np.median(fat_smooth[m_arm]))
                m_top = m_arm & (zeta > 0.45)
                m_bot = m_arm & (zeta < -0.45)
                dz_top_bins[bi] = float(np.percentile(dfat_posed[m_top] @ g_up, 82)) if np.any(m_top) else f_rad_bins[bi]
                dz_bot_bins[bi] = float(np.percentile(-(dfat_posed[m_bot] @ g_up), 82)) if np.any(m_bot) else 0.35 * f_rad_bins[bi]
        valid_b = f_rad_bins > 1e-4
        if np.any(valid_b):
            dz_top_bins = np.interp(t_bins, t_bins[valid_b], dz_top_bins[valid_b])
            dz_bot_bins = np.interp(t_bins, t_bins[valid_b], dz_bot_bins[valid_b])
            f_rad_bins = np.interp(t_bins, t_bins[valid_b], f_rad_bins[valid_b])
        for _ in range(5):
            dz_top_bins[1:-1] = 0.25 * dz_top_bins[:-2] + 0.50 * dz_top_bins[1:-1] + 0.25 * dz_top_bins[2:]
            dz_bot_bins[1:-1] = 0.25 * dz_bot_bins[:-2] + 0.50 * dz_bot_bins[1:-1] + 0.25 * dz_bot_bins[2:]
            f_rad_bins[1:-1] = 0.25 * f_rad_bins[:-2] + 0.50 * f_rad_bins[1:-1] + 0.25 * f_rad_bins[2:]

        dz_top_v = np.interp(np.clip(t_ax, t_bins[0], t_bins[-1]), t_bins, dz_top_bins)
        dz_bot_v = np.interp(np.clip(t_ax, t_bins[0], t_bins[-1]), t_bins, dz_bot_bins)
        d_add_v = np.maximum(dz_top_v + dz_bot_v, 0.0)
        d_add_peak = float(np.max(d_add_v[(w_arm_side > 0.5) & (t_ax >= 0.15) & (t_ax <= 0.65)])) if np.any(w_arm_side > 0.5) else 0.0
        fat_scale = float(np.clip(d_add_peak / 0.058, 0.0, 1.35)) * ad_g

        # 1) Direct T-pose (0.705) silhouette calibration to M050-F100-raised-arms-ref.jpg anchored seamlessly to elbow/forearm:
        #    - Lifts the sagging rigid-LBS axillary curtain (`X = 0.20..0.26m`) taut upward (`+25..+30mm`) to match the stretched armpit arch,
        #      allows natural downward `-Z` gravity tricep belly hang across `X = 0.31..0.42m` (without `maximum.accumulate` flattening it),
        #      and forms a single smooth convex deltoid-to-elbow top contour with ZERO `X = 0.37m` bicep bump!
        px_lean = sgn * p_lean[:, 0]
        pz_lean = p_lean[:, 2]
        px_lean_tp = sgn * p_lean_tp[:, 0]
        pz_lean_tp = p_lean_tp[:, 2]
        px_tp_v = sgn * p_tp_lbs[:, 0]
        pz_tp_v = p_tp_lbs[:, 2]

        x_th_r = np.array([0.18, 0.21, 0.24, 0.26, 0.29, 0.32, 0.35, 0.38, 0.41, 0.44, 0.47, 0.51, 0.56, 0.60], dtype=np.float64)
        # Sleek de-shrugged upper shoulder + broad concave armpit arch (X=0.21..0.26m) + gravity-draped -Z tricep belly:
        fat_th_rat = np.array([1.52, 1.46, 1.36, 1.29, 1.23, 1.18, 1.12, 1.07, 1.03, 1.00, 1.00, 1.00, 1.00, 1.00], dtype=np.float64)

        x_tp_grid = np.linspace(0.18, 0.60, 43)
        z_top_cur_tp = np.full_like(x_tp_grid, np.nan)
        z_bot_cur_tp = np.full_like(x_tp_grid, np.nan)
        z_top_lean_g = np.full_like(x_tp_grid, np.nan)
        z_bot_lean_g = np.full_like(x_tp_grid, np.nan)
        rx_sgn = sgn * rx
        arm_top_m = (pz_lean > 1.485) & (arm_sleeve_side | ((rz > 1.525) & (px_tp_v >= 0.180) & (px_tp_v < 0.242))) & (pz_tp_v > 1.475)
        arm_bot_m = arm_sleeve_side & (rx_sgn > 0.175) & (pz_tp_v > 1.455)
        arm_lean_top_m = (pz_lean > 1.485) & (arm_sleeve_side | ((rz > 1.525) & (px_lean_tp >= 0.180) & (px_lean_tp < 0.242))) & (pz_lean_tp > 1.475)
        arm_lean_bot_m = arm_sleeve_side & (rx_sgn > 0.175) & (pz_lean_tp > 1.455)
        for xi_t, xv_t in enumerate(x_tp_grid):
            ms_tt = arm_top_m & (np.abs(px_tp_v - xv_t) < 0.015)
            ms_tb = arm_bot_m & (np.abs(px_tp_v - xv_t) < 0.015)
            if np.sum(ms_tt) >= 4:
                z_top_cur_tp[xi_t] = float(np.percentile(pz_tp_v[ms_tt], 98.5))
            if np.sum(ms_tb) >= 4:
                z_bot_cur_tp[xi_t] = float(np.percentile(pz_tp_v[ms_tb], 2.0))
            ms_lt = arm_lean_top_m & (np.abs(px_lean_tp - xv_t) < 0.015)
            ms_lb = arm_lean_bot_m & (np.abs(px_lean_tp - xv_t) < 0.015)
            if np.sum(ms_lt) >= 4:
                z_top_lean_g[xi_t] = float(np.percentile(pz_lean_tp[ms_lt], 98.5))
            if np.sum(ms_lb) >= 4:
                z_bot_lean_g[xi_t] = float(np.percentile(pz_lean_tp[ms_lb], 2.0))
        fin_tp_t = np.isfinite(z_top_cur_tp)
        fin_tp_b = np.isfinite(z_bot_cur_tp)
        fin_ln_t = np.isfinite(z_top_lean_g)
        fin_ln_b = np.isfinite(z_bot_lean_g)
        f_gate_cal = float(np.clip(fat_scale, 0.0, 1.15))
        f_cal_w = float(np.clip(fat_scale, 0.0, 1.0))
        z_top_tgt_save: np.ndarray | None = None
        z_bot_tgt_save: np.ndarray | None = None
        if np.sum(fin_tp_t) >= 8 and np.sum(fin_tp_b) >= 6 and np.sum(fin_ln_t) >= 8 and np.sum(fin_ln_b) >= 6 and f_gate_cal > 0.02:
            z_top_cur_tp = np.interp(x_tp_grid, x_tp_grid[fin_tp_t], z_top_cur_tp[fin_tp_t])
            z_bot_cur_tp = np.interp(x_tp_grid, x_tp_grid[fin_tp_b], z_bot_cur_tp[fin_tp_b])
            z_top_lean_g = np.interp(x_tp_grid, x_tp_grid[fin_ln_t], z_top_lean_g[fin_ln_t])
            z_bot_lean_g = np.interp(x_tp_grid, x_tp_grid[fin_ln_b], z_bot_lean_g[fin_ln_b])
            for _ in range(6):
                z_top_cur_tp[1:-1] = 0.25 * z_top_cur_tp[:-2] + 0.50 * z_top_cur_tp[1:-1] + 0.25 * z_top_cur_tp[2:]
                z_bot_cur_tp[1:-1] = 0.25 * z_bot_cur_tp[:-2] + 0.50 * z_bot_cur_tp[1:-1] + 0.25 * z_bot_cur_tp[2:]
                z_top_lean_g[1:-1] = 0.25 * z_top_lean_g[:-2] + 0.50 * z_top_lean_g[1:-1] + 0.25 * z_top_lean_g[2:]
                z_bot_lean_g[1:-1] = 0.25 * z_bot_lean_g[:-2] + 0.50 * z_bot_lean_g[1:-1] + 0.25 * z_bot_lean_g[2:]
            if has_ext_head:
                # Anchor T-pose shoulder top to the un-shrugged Rest acromion/clavicle slope (`eliminating rigid-LBS's +28 mm
                # boxy shoulder towers beside the neck while keeping ONE smooth continuous trap-acromion-deltoid-bicep curve with
                # ZERO acromial saddle-dip, ZERO `+68 deg` supraclavicular V-pinch, and on `ms_g > 0.75` (`M100-F100`) a firm
                # strongman tricep sweep that joins `z_bot_cur_tp` seamlessly at the elbow with ZERO hanging bat-wing pouch or cliff!):
                m_clav_rest = (sgn * full_rest_bl[:, 0] >= 0.145) & (sgn * full_rest_bl[:, 0] <= 0.185) & (full_rest_bl[:, 2] > 1.58) & (np.abs(full_rest_bl[:, 1]) < 0.12)
                z_clav_rest = float(np.percentile(full_rest_bl[m_clav_rest, 2], 96.0)) if np.sum(m_clav_rest) >= 4 else 1.678
                if ms_g > 0.75:
                    z_el_anchor = float(np.median(z_top_cur_tp[29:35])) + 0.0040
                    z_clav_anchor = max(z_el_anchor + 0.038, z_clav_rest + 0.010)
                    z_el_bot_anchor = float(np.median(z_bot_cur_tp[29:35]))
                    th_forearm = float(np.clip(z_el_anchor - z_el_bot_anchor, 0.148, 0.172))
                    s_sh_to_el = smootherstep((x_tp_grid - 0.165) / 0.345)
                    delt_cap = 0.0155 * smootherstep((x_tp_grid - 0.175) / 0.048) * (1.0 - smootherstep((x_tp_grid - 0.295) / 0.105))
                    bicep_cap = 0.0080 * smootherstep((x_tp_grid - 0.280) / 0.048) * (1.0 - smootherstep((x_tp_grid - 0.395) / 0.075))
                    z_top_fat_g = z_el_anchor + (z_clav_anchor - z_el_anchor) * (1.0 - s_sh_to_el) + delt_cap + bicep_cap
                    w_top_el_join = smootherstep((x_tp_grid - 0.455) / 0.095)
                    z_top_fat_g = (1.0 - w_top_el_join) * z_top_fat_g + w_top_el_join * z_top_cur_tp
                    sm_th_rat = np.array([1.36, 1.33, 1.29, 1.25, 1.22, 1.18, 1.14, 1.09, 1.05, 1.02, 1.00, 1.00, 1.00, 1.00], dtype=np.float64)
                    z_bot_fat_g = z_top_fat_g - th_forearm * np.interp(x_tp_grid, x_th_r, sm_th_rat)
                    w_bot_el_join = smootherstep((x_tp_grid - 0.435) / 0.095)
                    z_bot_fat_g = (1.0 - w_bot_el_join) * z_bot_fat_g + w_bot_el_join * z_bot_cur_tp
                    z_bot_fat_g[:34] = np.maximum.accumulate(z_bot_fat_g[:34])
                    for _ in range(10):
                        z_bot_fat_g[1:-1] = 0.25 * z_bot_fat_g[:-2] + 0.50 * z_bot_fat_g[1:-1] + 0.25 * z_bot_fat_g[2:]
                else:
                    z_el_anchor = float(np.median(z_top_cur_tp[29:35]))
                    z_clav_anchor = max(z_el_anchor + 0.026, z_clav_rest + 0.002)
                    z_el_bot_anchor = float(np.median(z_bot_cur_tp[29:35]))
                    th_forearm = float(np.clip(z_el_anchor - z_el_bot_anchor, 0.146, 0.190))
                    s_sh_to_el = smootherstep((x_tp_grid - 0.165) / 0.345)
                    delt_cap = 0.0025 * smootherstep((x_tp_grid - 0.178) / 0.055) * (1.0 - smootherstep((x_tp_grid - 0.305) / 0.115))
                    z_top_fat_g = z_el_anchor + (z_clav_anchor - z_el_anchor) * (1.0 - s_sh_to_el) + delt_cap
                    ext_th_rat = np.array([1.38, 1.35, 1.32, 1.29, 1.26, 1.24, 1.21, 1.17, 1.11, 1.06, 1.02, 1.00, 1.00, 1.00], dtype=np.float64)
                    z_bot_fat_g = z_top_fat_g - th_forearm * np.interp(x_tp_grid, x_th_r, ext_th_rat)
                    z_bot_fat_g[:26] = np.maximum.accumulate(z_bot_fat_g[:26])
                    for _ in range(14):
                        z_bot_fat_g[1:-1] = 0.25 * z_bot_fat_g[:-2] + 0.50 * z_bot_fat_g[1:-1] + 0.25 * z_bot_fat_g[2:]
            else:
                m_clav = (px_tp_v >= 0.145) & (px_tp_v <= 0.172) & (pz_tp_v > 1.62) & (np.abs(p_tp_lbs[:, 1]) < 0.11)
                z_clav_anchor = float(np.percentile(pz_tp_v[m_clav], 97.5)) if np.sum(m_clav) >= 4 else 1.7180
                z_el_anchor = float(np.median(z_top_cur_tp[29:35]))
                z_el_bot_anchor = float(np.median(z_bot_cur_tp[29:35]))
                th_forearm = float(np.clip(z_el_anchor - z_el_bot_anchor, 0.138, 0.162))
                s_sh_to_el = smootherstep((x_tp_grid - 0.180) / 0.285)
                delt_cap = 0.0020 * smootherstep((x_tp_grid - 0.175) / 0.045) * (1.0 - smootherstep((x_tp_grid - 0.275) / 0.105))
                z_top_fat_g = z_el_anchor + (z_clav_anchor - z_el_anchor) * (1.0 - s_sh_to_el) + delt_cap
                z_bot_fat_g = z_top_fat_g - th_forearm * np.interp(x_tp_grid, x_th_r, fat_th_rat)
                z_bot_fat_g[:32] = np.maximum.accumulate(z_bot_fat_g[:32])
                for _ in range(10):
                    z_bot_fat_g[1:-1] = 0.25 * z_bot_fat_g[:-2] + 0.50 * z_bot_fat_g[1:-1] + 0.25 * z_bot_fat_g[2:]
            z_top_tgt_g = z_top_lean_g + f_cal_w * (z_top_fat_g - z_top_lean_g)
            z_bot_tgt_g = z_bot_lean_g + f_cal_w * (z_bot_fat_g - z_bot_lean_g)
            for _ in range(4):
                z_top_tgt_g[1:-1] = 0.25 * z_top_tgt_g[:-2] + 0.50 * z_top_tgt_g[1:-1] + 0.25 * z_top_tgt_g[2:]
                z_bot_tgt_g[1:-1] = 0.25 * z_bot_tgt_g[:-2] + 0.50 * z_bot_tgt_g[1:-1] + 0.25 * z_bot_tgt_g[2:]
            z_top_tgt_save = z_top_tgt_g.copy()
            z_bot_tgt_save = z_bot_tgt_g.copy()

            taper_distal = 1.0 - smootherstep((x_tp_grid - 0.525) / 0.085)
            ramp_ax_bot = smootherstep((x_tp_grid - (0.176 if has_ext_head else 0.200)) / (0.052 if has_ext_head else 0.045))
            f_act = float(np.clip(f_cal_w / 0.25, 0.0, 1.0))
            drop_top_g = np.clip((z_top_cur_tp - z_top_tgt_g) * 1.38, -0.012, 0.036 if has_ext_head else 0.052) * f_act * taper_distal
            sag_raw_g = (z_bot_cur_tp - z_bot_tgt_g) * 1.35
            sag_up_cap = 0.058 if has_ext_head else 0.068
            sag_bot_g = np.where(sag_raw_g < 0.0, np.clip(sag_raw_g, -0.038, 0.0), np.clip(sag_raw_g, 0.0, sag_up_cap) * ramp_ax_bot) * f_act * taper_distal
            for _ in range(12):
                drop_top_g[1:-1] = 0.25 * drop_top_g[:-2] + 0.50 * drop_top_g[1:-1] + 0.25 * drop_top_g[2:]
                sag_bot_g[1:-1] = 0.25 * sag_bot_g[:-2] + 0.50 * sag_bot_g[1:-1] + 0.25 * sag_bot_g[2:]
            drop_top_prof = np.interp(np.clip(px_tp_v, x_tp_grid[0], x_tp_grid[-1]), x_tp_grid, drop_top_g)
            sag_bot_prof = np.interp(np.clip(px_tp_v, x_tp_grid[0], x_tp_grid[-1]), x_tp_grid, sag_bot_g)
        else:
            drop_top_prof = fat_scale * (0.015 * np.exp(-(((px_lean - 0.312) / 0.072) ** 2)))
            sag_bot_prof = fat_scale * (
                0.032 * np.exp(-(((px_lean - 0.246) / 0.045) ** 2))
                + 0.048 * np.exp(-(((px_lean - 0.335) / 0.064) ** 2))
            )
        s_bot = np.clip(0.5 * (1.0 - zeta), 0.0, 1.0)
        # Uniform smooth circumferential s_blend around the arm so ZERO diagonal front-to-back shear trough forms at +68 deg!
        s_blend = 0.28 * s_bot + 0.72 * (s_bot ** 1.50)

        ant_chest_stationary = (
            smootherstep((-ry - 0.095) / 0.035)
            * (1.0 - smootherstep((sgn * rx - 0.120) / 0.030))
            * (1.0 - smootherstep((w_arm_smooth - 0.12) / 0.18))
        )
        low_rib_stationary = (1.0 - smootherstep((pz_lean - 1.458) / 0.036)) * (1.0 - smootherstep((w_arm_smooth - 0.10) / 0.16))
        w_gate_top = (
            side_w
            * smootherstep((px_tp_v - 0.156) / 0.036)
            * (1.0 - smootherstep((px_tp_v - 0.575) / 0.065))
            * smootherstep((pz_lean - 1.495) / 0.050)
            * (1.0 - ant_chest_stationary)
        )
        w_gate_bot = (
            side_w
            * smootherstep((px_tp_v - 0.168) / 0.034)
            * (1.0 - smootherstep((px_tp_v - 0.585) / 0.065))
            * (1.0 - low_rib_stationary)
            * (1.0 - ant_chest_stationary)
        )
        dz_arm = (1.0 - s_blend) * (w_gate_top * drop_top_prof) + s_blend * (w_gate_bot * sag_bot_prof)
        p_target[:, 2] -= dz_arm
        arm_post_specs.append(
            (sgn, arm_sleeve_side.copy(), w_arm_smooth.copy(), s_blend.copy(), w_gate_top.copy(), w_gate_bot.copy(), f_cal_w, z_top_tgt_save, z_bot_tgt_save)
        )

        if has_ext_head:
            # Supraclavicular bridge (`|rx| = 0.104..0.205 m`) + lateral-only shrug relaxation (`|rx| >= 0.195 m` so `+68 deg`
            # NEVER digs a medial clavicular trough at `X = 0.14..0.19 m` or leaves a bulbous proximal deltoid hump next to it!):
            w_trap_ext = (
                side_w
                * smootherstep((sgn * rx - 0.104) / 0.028)
                * (1.0 - smootherstep((sgn * rx - 0.180) / 0.034))
                * smootherstep((rz - 1.580) / 0.035)
                * (1.0 - smootherstep((rz - 1.674) / 0.014))
            )
            p_target[:, 2] += 0.0042 * w_trap_ext
            shrug_excess = np.maximum(0.0, p_full_lbs[:, 2] - (full_rest_bl[:, 2] + 0.024 + 0.010 * ms_g))
            w_deshrug = (
                side_w
                * smootherstep((sgn * rx - 0.195) / 0.042)
                * (1.0 - smootherstep((sgn * rx - 0.315) / 0.065))
                * smootherstep((rz - 1.565) / 0.045)
            )
            p_target[:, 2] -= (0.20 - 0.05 * ms_g) * w_deshrug * shrug_excess
        else:
            # Gentle collar-seam-safe upper-trapezius bridge strictly inside |rx| = 0.106..0.205m (NEVER inflating an X=0.25m deltoid hump!):
            w_trap_bridge = (
                side_w
                * smootherstep((sgn * rx - 0.106) / 0.028)
                * (1.0 - smootherstep((sgn * rx - 0.175) / 0.032))
                * smootherstep((rz - 1.585) / 0.035)
                * (1.0 - smootherstep((rz - 1.674) / 0.014))
            )
            p_target[:, 2] += (0.0030 * fat_scale) * w_trap_bridge

        # Smooth wide-span upper-latissimus & teres-major lateral glide (moderate +Y so ZERO vertical pillow crease forms at |X|~0.20m in Back T-pose!):
        w_lat_flare = (
            side_w
            * (1.0 - smootherstep((w_arm_smooth - 0.65) / 0.30))
            * smootherstep((sgn * rx - 0.095) / 0.048)
            * (1.0 - smootherstep((sgn * rx - 0.275) / 0.048))
            * smootherstep((rz - 1.452) / 0.038)
            * (1.0 - smootherstep((rz - 1.605) / 0.038))
            * smootherstep((ry + 0.015) / 0.035)
        )
        p_target[:, 0] += sgn * (0.0095 * fat_scale) * w_lat_flare
        p_target[:, 1] += (0.0050 * fat_scale) * w_lat_flare * smootherstep((ry - 0.012) / 0.032)

        # Stretch the Z=1.34..1.48m outer lateral ribcage roll inward and upward when the arm lifts
        # (using a broad `0.078 m` span on `has_ext_head` so zero mid-rib S-pinch forms on wide `F=100%` flanks!):
        rib_sigma = 0.078 if has_ext_head else 0.044
        rib_dx_g = 0.0042 if has_ext_head else 0.0110
        w_lat_rib_stretch = (
            side_w
            * (1.0 - smootherstep((w_arm_smooth - 0.30) / 0.22))
            * smootherstep((sgn * rx - 0.155) / 0.026)
            * (1.0 - smootherstep((sgn * rx - (0.285 if has_ext_head else 0.250)) / 0.036))
            * np.exp(-(((rz - 1.415) / rib_sigma) ** 2))
            * smootherstep((ry + 0.045) / 0.032)
        )
        p_target[:, 0] -= sgn * (rib_dx_g * fat_scale) * w_lat_rib_stretch
        p_target[:, 2] += (0.0080 * fat_scale) * w_lat_rib_stretch

        # 3) Gentle clavipectoral / upper-pec skin stretch strictly above the inframammary crease so breasts retain clear definition in T-pose!
        w_pec_glide = (
            side_w
            * (1.0 - smootherstep((w_arm_smooth - 0.52) / 0.30))
            * smootherstep((sgn * rx - 0.132) / 0.034)
            * (1.0 - smootherstep((sgn * rx - 0.228) / 0.036))
            * smootherstep((rz - 1.488) / 0.026)
            * (1.0 - smootherstep((rz - 1.545) / 0.028))
            * smootherstep((-ry - 0.038) / 0.032)
        )
        p_target[:, 2] += (0.10 * pec_fat_scalar) * w_pec_glide
        p_target[:, 0] += sgn * (0.05 * pec_fat_scalar) * w_pec_glide

    w_arm_any = np.clip(
        w_full[:, j_names.index("upperarm_l")]
        + w_full[:, j_names.index("upperarm_pressure_l")]
        + w_full[:, j_names.index("lowerarm_l")]
        + w_full[:, j_names.index("upperarm_r")]
        + w_full[:, j_names.index("upperarm_pressure_r")]
        + w_full[:, j_names.index("lowerarm_r")],
        0.0,
        1.0,
    )
    w_arm_any_sm = smooth_vertex_vectors(np.repeat(w_arm_any[:, None], 3, axis=1), conn, rings=4)[:, 0]
    # Protect BOTH oblique back folds (rz <= 1.456m) AND the full breast cup / inframammary fold (rz <= 1.535m on lean_rest_bl, where heavy
    # F=100 breasts originate!) so T-pose Front & Back preserve crisp pectoral & back-fold definition matching M050-F100-raised-arms-ref.jpg!
    fz = full_rest_bl[:, 2]
    back_fold_keep = (
        smootherstep((ry - 0.018) / 0.026)
        * (1.0 - smootherstep((rz - 1.448) / 0.028))
        * (1.0 - smootherstep((np.abs(rx) - 0.132) / 0.028))
        * (1.0 - smootherstep((w_arm_any_sm - 0.10) / 0.12))
    )
    pec_fold_keep = (
        smootherstep((-ry - 0.055) / 0.028)
        * (1.0 - smootherstep((rz - 1.535) / 0.024))
        * (1.0 - smootherstep((fz - 1.512) / 0.022))
        * (1.0 - smootherstep((np.abs(rx) - 0.136) / 0.028))
        * (1.0 - smootherstep((w_arm_any_sm - 0.15) / 0.14))
    )
    fold_keep = np.clip(np.maximum(back_fold_keep, pec_fold_keep), 0.0, 1.0)

    seam_lock_body = seam_body[np.abs(rx[seam_body]) <= 0.072] if has_ext_head else seam_body
    z_mob_floor = 1.380 - 0.065 * smootherstep((np.abs(rx) - 0.158) / 0.026)
    top_neck_guard = (
        smootherstep((rz - 1.692) / 0.018) * (1.0 - smootherstep((np.abs(rx) - 0.085) / 0.024))
        if has_ext_head
        else smootherstep((rz - 1.682) / 0.020) * (1.0 - smootherstep((np.abs(rx) - 0.140) / 0.025))
    )
    w_mob_global = (
        smootherstep((np.abs(rx) - 0.055) / 0.035)
        * (1.0 - smootherstep((np.abs(rx) - 0.620) / 0.070))
        * smootherstep((z_eff - z_mob_floor) / 0.042)
        * (1.0 - top_neck_guard)
        * (1.0 - fold_keep)
    )
    w_mob_global[seam_lock_body] = 0.0
    p_target = p_full_lbs + w_mob_global[:, None] * (p_target - p_full_lbs)

    p_u = np.column_stack([np.bincount(weld, weights=p_target[:, c], minlength=n_u) / mult for c in range(3)])
    p_lbs_u = np.column_stack([np.bincount(weld, weights=p_full_lbs[:, c], minlength=n_u) / mult for c in range(3)])
    rx_u, ry_u, rz_u = lean_rest_bl[first_u].T
    z_eff_u = np.maximum(rz_u, p_lean[first_u, 2])
    seam_u = np.isin(np.arange(n_u), weld[seam_lock_body])

    elen = np.linalg.norm(p_lean[first_u][es] - p_lean[first_u][ed], axis=1)
    w_le = 1.0 / np.maximum(elen, 0.002)
    deg_le = np.maximum(np.bincount(es, weights=w_le, minlength=n_u), 1e-12)
    deg_u_ra = np.maximum(np.bincount(es, minlength=n_u).astype(np.float64), 1.0)

    fold_keep_u = fold_keep[first_u]
    top_neck_guard_u = (
        smootherstep((rz_u - 1.692) / 0.018) * (1.0 - smootherstep((np.abs(rx_u) - 0.085) / 0.024))
        if has_ext_head
        else smootherstep((rz_u - 1.680) / 0.020) * (1.0 - smootherstep((np.abs(rx_u) - 0.140) / 0.025))
    )
    w_relax_u = (
        smootherstep((np.abs(rx_u) - 0.075) / 0.035)
        * (1.0 - smootherstep((np.abs(rx_u) - 0.580) / 0.065))
        * smootherstep((z_eff_u - 1.420) / 0.045)
        * (1.0 - top_neck_guard_u)
        * (1.0 - fold_keep_u)
    )
    w_relax_u[seam_u] = 0.0

    # Blend smoothly from isotropic displacement fairing strictly inside the torso-axilla root (|px_u| < 0.24m) to axial-only
    # displacement fairing out on the lifted arm (|px_u| >= 0.24m) so bottom gravity tricep hang is NEVER diluted circumferentially!
    nrm_lean_u = nrm_lean_p[first_u]
    px_abs_u = np.abs(p_lean[first_u, 0])
    hinge_iso_e = 1.0 - smootherstep((0.5 * (px_abs_u[es] + px_abs_u[ed]) - 0.195) / 0.045)
    dot_e = np.einsum("ei,ei->e", nrm_lean_u[es], nrm_lean_u[ed])
    vert_frac_e = np.abs(p_lean[first_u][es, 2] - p_lean[first_u][ed, 2]) / np.maximum(elen, 1e-4)
    w_ax_dir_e = ((1.0 - np.clip(vert_frac_e, 0.0, 1.0)) ** 2.6) * (np.maximum(dot_e, 0.0) ** 2.0)
    w_dir_blend_e = hinge_iso_e * 1.0 + (1.0 - hinge_iso_e) * np.maximum(w_ax_dir_e, 0.04)
    w_le_sim = w_le * np.maximum(w_dir_blend_e, 0.04)
    deg_le_sim = np.maximum(np.bincount(es, weights=w_le_sim, minlength=n_u), 1e-12)
    disp_u = p_u - p_lbs_u
    for _ in range(24):
        nbr_d = np.column_stack([np.bincount(es, weights=w_le_sim * disp_u[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
        disp_u += (0.45 * w_relax_u)[:, None] * (nbr_d - disp_u)
        disp_u[seam_u] = 0.0
    p_u = p_lbs_u + disp_u

    w_hinge_u = w_relax_u * (1.0 - fold_keep_u)
    w_hinge_u[seam_u] = 0.0

    # Zero-shrinkage anisotropic Taubin smoothing (+0.34 / -0.356) on DISPLACEMENT disp_u using w_le_sim so bottom sag stays 100% preserved!
    disp_taub = p_u - p_lbs_u
    for _ in range(12):
        nbr1 = np.column_stack([np.bincount(es, weights=w_le_sim * disp_taub[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
        disp_taub += (0.34 * w_hinge_u)[:, None] * (nbr1 - disp_taub)
        disp_taub[seam_u] = 0.0
        nbr2 = np.column_stack([np.bincount(es, weights=w_le_sim * disp_taub[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
        disp_taub -= (0.356 * w_hinge_u)[:, None] * (nbr2 - disp_taub)
        disp_taub[seam_u] = 0.0
    p_u = p_lbs_u + disp_taub

    # Smooth C2 lower-flank ribcage anchor strictly BELOW rz = 1.475m so the upper lat / teres major (rz = 1.48..1.60m) glides smoothly
    # into the lifted arm with ZERO vertical shear crease at |X|~0.22m in T-pose Back or +68 deg Back!
    w_arm_u_ra = w_arm_any_sm[first_u]
    sgn_u_ra = np.sign(rx_u)
    w_rib_anc = (
        smootherstep((np.abs(rx_u) - 0.120) / 0.024)
        * (1.0 - smootherstep((rz_u - 1.472) / 0.028))
        * (1.0 - smootherstep((w_arm_u_ra - 0.18) / 0.12))
        * np.where(~seam_u, 1.0, 0.0)
    )
    rib_idx = np.flatnonzero(w_rib_anc > 0.01)
    if len(rib_idx):
        max_rib_dx = 0.0050 + 0.024 * smootherstep((w_arm_u_ra[rib_idx] - 0.08) / 0.18)
        cur_dx_rib = sgn_u_ra[rib_idx] * (p_u[rib_idx, 0] - p_lbs_u[rib_idx, 0])
        clamp_dx = np.minimum(cur_dx_rib, max_rib_dx)
        p_u[rib_idx, 0] = (1.0 - w_rib_anc[rib_idx]) * p_u[rib_idx, 0] + w_rib_anc[rib_idx] * (p_lbs_u[rib_idx, 0] + sgn_u_ra[rib_idx] * clamp_dx)

    # Surface relaxation strictly across upper clavipectoral/deltopectoral stretch, upper shoulder, AND posterior upper-lat-to-tricep glide
    # (NEVER touching the breast cup |px_abs_u| < 0.175m & rz_u < 1.535m, and NEVER webbing the bottom 90-deg armpit floor!):
    not_pec_cup_u = 1.0 - (
        smootherstep((-ry_u - 0.042) / 0.028)
        * (1.0 - smootherstep((rz_u - 1.536) / 0.024))
        * (1.0 - smootherstep((px_abs_u - 0.174) / 0.024))
    )
    not_back_fold_u = 1.0 - (
        smootherstep((ry_u - 0.018) / 0.026)
        * (1.0 - smootherstep((rz_u - 1.458) / 0.024))
        * (1.0 - smootherstep((px_abs_u - 0.174) / 0.024))
    )
    w_hinge_surf = (
        w_relax_u
        * not_pec_cup_u
        * not_back_fold_u
        * smootherstep((px_abs_u - 0.115) / 0.032)
        * (1.0 - smootherstep((px_abs_u - 0.355) / 0.048))
        * smootherstep((z_eff_u - 1.460) / 0.038)
    )
    hs_idx = np.flatnonzero(w_hinge_surf > 0.01)
    if len(hs_idx):
        whs = w_hinge_surf[hs_idx, None]
        is_ant_hinge = (
            smootherstep((-ry_u[hs_idx] - 0.016) / 0.028)
            * smootherstep((rz_u[hs_idx] - 1.512) / 0.026)
            * (1.0 - smootherstep((px_abs_u[hs_idx] - 0.295) / 0.038))
        )[:, None]
        is_post_hinge = (
            smootherstep((ry_u[hs_idx] - 0.008) / 0.028)
            * smootherstep((rz_u[hs_idx] - 1.462) / 0.028)
            * (1.0 - smootherstep((px_abs_u[hs_idx] - 0.355) / 0.042))
        )[:, None]
        is_upper_sh = smootherstep((rz_u[hs_idx] - 1.545) / 0.028)[:, None]
        allow_conc_bridge = np.clip(np.maximum(np.maximum(is_ant_hinge, is_post_hinge), is_upper_sh), 0.0, 1.0)
        conc_hs = (0.68 + 0.18 * is_post_hinge) * allow_conc_bridge
        conv_hs = (0.05 + 0.20 * is_ant_hinge + 0.12 * is_post_hinge) * allow_conc_bridge
        for _ in range(48):
            nrm_hs = vertex_normals(p_u[weld], tri_l, weld)[first_u]
            nbr_hs = np.column_stack([np.bincount(es, weights=p_u[ed, c], minlength=n_u) / deg_u_ra for c in range(3)])
            dp_hs = nbr_hs[hs_idx] - p_u[hs_idx]
            nv_hs = nrm_hs[hs_idx]
            dot_hs = np.einsum("ni,ni->n", dp_hs, nv_hs)[:, None]
            dp_hsn = dot_hs * nv_hs
            dp_hst = dp_hs - dp_hsn
            p_u[hs_idx] += whs * (0.56 * dp_hst + np.where(dot_hs > 0.0, conc_hs, conv_hs) * dp_hsn)
            p_u[seam_u] = p_lbs_u[seam_u]

    # Symmetric anterior clavipectoral-to-deltoid AND posterior scapular-to-tricep surface fairing directly in T-pose (0.705)
    # (strictly respecting not_pec_cup_u & not_back_fold_u) so BOTH 3/4 Front & Back T-pose have ZERO diagonal shoulder/axilla crease:
    m_g_inv = np.linalg.inv(m_g)
    p_prov0 = p_u[weld].copy()
    p_prov0[seam_lock_body] = p_full_lbs[seam_lock_body]
    dp_prov0_g = blender_to_gltf(p_prov0) - blender_to_gltf(p_full_lbs)
    drest_prov0_bl = gltf_to_blender(np.einsum("vij,vj->vi", m_g_inv, dp_prov0_g))
    drest_prov0_bl[seam_lock_body] = 0.0
    p_tp_fair, m_g_tp, _, _ = eval_arm_pose_lbs(full_rest_bl + 0.705 * drest_prov0_bl, "bodySkin", compiled_family, raise_scale=0.705)
    m_g_tp_inv = np.linalg.inv(m_g_tp)
    p_tp_u0 = np.column_stack([np.bincount(weld, weights=p_tp_fair[:, c], minlength=n_u) / mult for c in range(3)])
    p_tp_u = p_tp_u0.copy()
    px_tp_abs_u = np.abs(p_tp_u0[:, 0])
    w_tp_post_fair = (
        w_relax_u
        * not_back_fold_u
        * smootherstep((ry_u - 0.010) / 0.026)
        * smootherstep((rz_u - 1.464) / 0.028)
        * smootherstep((px_tp_abs_u - 0.100) / 0.032)
        * (1.0 - smootherstep((px_tp_abs_u - 0.335) / 0.045))
    )
    w_tp_ant_fair = (
        w_relax_u
        * not_pec_cup_u
        * smootherstep((-ry_u - 0.010) / 0.026)
        * smootherstep((rz_u - 1.504) / 0.026)
        * smootherstep((px_tp_abs_u - 0.125) / 0.032)
        * (1.0 - smootherstep((px_tp_abs_u - 0.330) / 0.045))
    )
    w_tp_both_fair = np.maximum(w_tp_post_fair, w_tp_ant_fair)
    tpf_idx = np.flatnonzero(w_tp_both_fair > 0.01)
    if len(tpf_idx):
        wtpf = w_tp_both_fair[tpf_idx, None]
        for _ in range(30):
            nrm_tpf = vertex_normals(p_tp_u[weld], tri_l, weld)[first_u]
            nbr_tpf = np.column_stack([np.bincount(es, weights=p_tp_u[ed, c], minlength=n_u) / deg_u_ra for c in range(3)])
            dp_tpf = nbr_tpf[tpf_idx] - p_tp_u[tpf_idx]
            nv_tpf = nrm_tpf[tpf_idx]
            dot_tpf = np.einsum("ni,ni->n", dp_tpf, nv_tpf)[:, None]
            dp_tpfn = dot_tpf * nv_tpf
            dp_tpft = dp_tpf - dp_tpfn
            p_tp_u[tpf_idx] += wtpf * (0.54 * dp_tpft + np.where(dot_tpf > 0.0, 0.72, 0.28) * dp_tpfn)
            p_tp_u[seam_u] = p_tp_u0[seam_u]
        dp_tp_all_g = blender_to_gltf(p_tp_u[weld]) - blender_to_gltf(p_tp_u0[weld])
        ddrest_g = np.einsum("vij,vj->vi", m_g_tp_inv, dp_tp_all_g) * (0.86 / 0.705)
        ddp100_bl = gltf_to_blender(np.einsum("vij,vj->vi", m_g, ddrest_g))
        ddp100_bl[seam_lock_body] = 0.0
        p_u += np.column_stack([np.bincount(weld, weights=ddp100_bl[:, c], minlength=n_u) / mult for c in range(3)])
        p_u[seam_u] = p_lbs_u[seam_u]

    # Closed-loop post-relaxation cross-sectional calibration on the exact T-pose LBS (0.705) silhouette:
    x_tp_post_g = np.linspace(0.18, 0.60, 43)
    taper_post = 1.0 - smootherstep((x_tp_post_g - 0.525) / 0.085)
    ramp_ax_post = smootherstep((x_tp_post_g - 0.200) / 0.045)
    min_rbot_post = -0.015 * np.ones_like(x_tp_post_g)

    def _run_tp_calibration_pass(n_passes: int, gain_scale: float = 1.0) -> None:
        nonlocal p_u
        for _ in range(n_passes):
            p_prov_all = p_u[weld]
            p_prov_all[seam_lock_body] = p_full_lbs[seam_lock_body]
            dp_prov_gltf = blender_to_gltf(p_prov_all) - blender_to_gltf(p_full_lbs)
            drest_prov_bl = gltf_to_blender(np.einsum("vij,vj->vi", m_g_inv, dp_prov_gltf))
            drest_prov_bl[seam_lock_body] = 0.0
            p_tp_post, _, _, _ = eval_arm_pose_lbs(full_rest_bl + 0.705 * drest_prov_bl, "bodySkin", compiled_family, raise_scale=0.705)
            dz_trim_all = np.zeros(len(lean_rest_bl), dtype=np.float64)
            any_trim = False
            for sgn_p, arm_sl_p, w_arm_sm_p, s_bl_p, wg_top_p, wg_bot_p, f_cw_p, z_top_tgt_p, z_bot_tgt_p in arm_post_specs:
                if f_cw_p <= 0.02 or z_top_tgt_p is None or z_bot_tgt_p is None:
                    continue
                px_p = sgn_p * p_tp_post[:, 0]
                pz_p = p_tp_post[:, 2]
                rx_sgn_p = sgn_p * rx
                arm_mt_p = (p_lean[:, 2] > 1.485) & (arm_sl_p | ((rz > 1.525) & (px_p >= 0.180) & (px_p < 0.242))) & (pz_p > 1.475)
                arm_mb_p = arm_sl_p & (rx_sgn_p > 0.175) & (pz_p > 1.455)
                zt_cur = np.full_like(x_tp_post_g, np.nan)
                zb_cur = np.full_like(x_tp_post_g, np.nan)
                for xi_p, xv_p in enumerate(x_tp_post_g):
                    ms_pt = arm_mt_p & (np.abs(px_p - xv_p) < 0.015)
                    ms_pb = arm_mb_p & (np.abs(px_p - xv_p) < 0.015)
                    if np.sum(ms_pt) >= 4:
                        zt_cur[xi_p] = float(np.percentile(pz_p[ms_pt], 98.5))
                    if np.sum(ms_pb) >= 4:
                        zb_cur[xi_p] = float(np.percentile(pz_p[ms_pb], 2.0))
                fin_pt = np.isfinite(zt_cur)
                fin_pb = np.isfinite(zb_cur)
                if np.sum(fin_pt) >= 8 and np.sum(fin_pb) >= 6:
                    any_trim = True
                    zt_cur = np.interp(x_tp_post_g, x_tp_post_g[fin_pt], zt_cur[fin_pt])
                    zb_cur = np.interp(x_tp_post_g, x_tp_post_g[fin_pb], zb_cur[fin_pb])
                    for _ in range(6):
                        zt_cur[1:-1] = 0.25 * zt_cur[:-2] + 0.50 * zt_cur[1:-1] + 0.25 * zt_cur[2:]
                        zb_cur[1:-1] = 0.25 * zb_cur[:-2] + 0.50 * zb_cur[1:-1] + 0.25 * zb_cur[2:]
                    f_act_p = float(np.clip(f_cw_p / 0.25, 0.0, 1.0)) * gain_scale
                    r_top_g = np.clip((zt_cur - z_top_tgt_p) * 1.32, -0.022, 0.052) * f_act_p * taper_post
                    rb_raw = (zb_cur - z_bot_tgt_p) * 1.34
                    r_bot_g = np.where(rb_raw < 0.0, np.clip(rb_raw, -0.028, 0.0), np.clip(rb_raw, 0.0, 0.058) * ramp_ax_post) * f_act_p * taper_post
                    for _ in range(10):
                        r_top_g[1:-1] = 0.25 * r_top_g[:-2] + 0.50 * r_top_g[1:-1] + 0.25 * r_top_g[2:]
                        r_bot_g[1:-1] = 0.25 * r_bot_g[:-2] + 0.50 * r_bot_g[1:-1] + 0.25 * r_bot_g[2:]
                    rt_v = np.interp(np.clip(px_p, x_tp_post_g[0], x_tp_post_g[-1]), x_tp_post_g, r_top_g)
                    rb_v = np.interp(np.clip(px_p, x_tp_post_g[0], x_tp_post_g[-1]), x_tp_post_g, r_bot_g)
                    dz_trim_all += w_mob_global * ((1.0 - s_bl_p) * wg_top_p * rt_v + s_bl_p * wg_bot_p * rb_v)
            if not any_trim:
                break
            dz_trim_u = np.bincount(weld, weights=dz_trim_all, minlength=n_u) / mult
            dz_trim_u[seam_u] = 0.0
            p_u[:, 2] -= dz_trim_u
            disp_tr = p_u - p_lbs_u
            for _ in range(5):
                nbr_tr1 = np.column_stack([np.bincount(es, weights=w_le_sim * disp_tr[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
                disp_tr += (0.24 * w_relax_u)[:, None] * (nbr_tr1 - disp_tr)
                disp_tr[seam_u] = 0.0
                nbr_tr2 = np.column_stack([np.bincount(es, weights=w_le_sim * disp_tr[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
                disp_tr -= (0.251 * w_relax_u)[:, None] * (nbr_tr2 - disp_tr)
                disp_tr[seam_u] = 0.0
            p_u = p_lbs_u + disp_tr

    _run_tp_calibration_pass(4, gain_scale=1.0)

    # Wide-span chord-anchored +68 deg (1.00) 3D Z + Y envelope pass (6 iterations across X = 0.19..0.58m):
    # Eliminates BOTH the X=0.31..0.38m mid-arm Popeye bicep/tricep swell AND any front-shoulder Y crease at +68 deg
    # while keeping T-pose's sleek shoulder & natural -Z gravity-draped tricep belly!
    x_68_g = np.linspace(0.132 if has_ext_head else 0.19, 0.58, 48 if has_ext_head else 40)
    taper_68_dist = 1.0 - smootherstep((x_68_g - 0.520) / 0.085)
    ramp_68_ax = smootherstep((x_68_g - (0.130 if has_ext_head else 0.195)) / 0.038)
    for _it68 in range(3):
        p68_cur = p_u[weld].copy()
        p68_cur[seam_lock_body] = p_full_lbs[seam_lock_body]
        dz68_all = np.zeros(len(lean_rest_bl), dtype=np.float64)
        dy68_all = np.zeros(len(lean_rest_bl), dtype=np.float64)
        for sgn_p, arm_sl_p, w_arm_sm_p, s_bl_p, wg_top_p, wg_bot_p, f_cw_p, _, _ in arm_post_specs:
            if f_cw_p <= 0.02:
                continue
            px68 = sgn_p * p68_cur[:, 0]
            py68 = p68_cur[:, 1]
            pz68 = p68_cur[:, 2]
            rx_sgn68 = sgn_p * rx
            x_mt_lo = 0.128 if has_ext_head else 0.185
            arm68_mt = (p_lean[:, 2] > 1.485) & (arm_sl_p | ((rz > 1.525) & (px68 >= x_mt_lo) & (px68 < 0.242))) & (pz68 > 1.485)
            arm68_mb = arm_sl_p & (rx_sgn68 > 0.175) & (pz68 > 1.460)
            zt68 = np.full_like(x_68_g, np.nan)
            zb68 = np.full_like(x_68_g, np.nan)
            yf68 = np.full_like(x_68_g, np.nan)
            yb68 = np.full_like(x_68_g, np.nan)
            for xi6, xv6 in enumerate(x_68_g):
                m6t = arm68_mt & (np.abs(px68 - xv6) < 0.015)
                m6b = arm68_mb & (np.abs(px68 - xv6) < 0.015)
                if np.sum(m6t) >= 4:
                    zt68[xi6] = float(np.percentile(pz68[m6t], 98.5))
                    yf68[xi6] = float(np.percentile(py68[m6t], 3.0))
                    yb68[xi6] = float(np.percentile(py68[m6t], 97.0))
                if np.sum(m6b) >= 4:
                    zb68[xi6] = float(np.percentile(pz68[m6b], 2.0))
            ft6 = np.isfinite(zt68) & np.isfinite(yf68) & np.isfinite(yb68)
            fb6 = np.isfinite(zb68)
            if np.sum(ft6) >= 10 and np.sum(fb6) >= 8:
                zt68 = np.interp(x_68_g, x_68_g[ft6], zt68[ft6])
                zb68 = np.interp(x_68_g, x_68_g[fb6], zb68[fb6])
                yf68 = np.interp(x_68_g, x_68_g[ft6], yf68[ft6])
                yb68 = np.interp(x_68_g, x_68_g[ft6], yb68[ft6])
                zt68_sm = zt68.copy()
                zb68_sm = zb68.copy()
                for _ in range(48):
                    zt68_sm[1:-1] = 0.25 * zt68_sm[:-2] + 0.50 * zt68_sm[1:-1] + 0.25 * zt68_sm[2:]
                    zb68_sm[1:-1] = 0.25 * zb68_sm[:-2] + 0.50 * zb68_sm[1:-1] + 0.25 * zb68_sm[2:]
                # Bridge any medial clavicular trough (`X = 0.145..0.20 m`) AND cap any bulbous proximal deltoid hump above
                # the smooth shoulder-to-elbow line (`preserving gentle strongman convexity on `M100-F100`!):
                i_c0, i_c1 = int(np.searchsorted(x_68_g, 0.146 if has_ext_head else 0.20)), int(np.searchsorted(x_68_g, 0.52))
                if i_c1 > i_c0 + 2:
                    z_chord68 = np.linspace(zt68_sm[i_c0], zt68_sm[i_c1], i_c1 - i_c0 + 1)
                    cap_68 = (0.0038 if ms_g > 0.75 else 0.0018) if has_ext_head else 0.0015
                    zt68_sm[i_c0 : i_c1 + 1] = np.minimum(zt68_sm[i_c0 : i_c1 + 1], z_chord68 + cap_68)
                    if has_ext_head:
                        zt68_sm[i_c0 : i_c1 + 1] = np.maximum(zt68_sm[i_c0 : i_c1 + 1], z_chord68 - 0.0010)
                for _ in range(12):
                    zt68_sm[1:-1] = 0.25 * zt68_sm[:-2] + 0.50 * zt68_sm[1:-1] + 0.25 * zt68_sm[2:]
                # Smooth monotonic distal arm thickness taper across X>=0.23m (anchored to unpinched proximal tricep):
                th68_cur = zt68 - zb68
                th68_mono = (zt68_sm - zb68_sm).copy()
                i_m0 = int(np.searchsorted(x_68_g, 0.225))
                th68_mono[i_m0] = max(th68_mono[i_m0], 0.204 * f_cw_p + 0.148 * (1.0 - f_cw_p))
                for ki6 in range(max(i_m0 + 1, 1), len(x_68_g)):
                    th68_mono[ki6] = min(th68_mono[ki6], th68_mono[ki6 - 1] - 0.0014)
                for _ in range(12):
                    th68_mono[1:-1] = 0.25 * th68_mono[:-2] + 0.50 * th68_mono[1:-1] + 0.25 * th68_mono[2:]
                zt68_goal = zt68_sm
                zb68_goal = (
                    zb68_sm.copy()
                    if (has_ext_head and ms_g > 0.75)
                    else np.minimum(zb68_sm, zt68_goal - np.maximum(0.142, 0.94 * th68_mono))
                )
                if has_ext_head and ms_g > 0.75:
                    i_b0, i_b1 = int(np.searchsorted(x_68_g, 0.275)), int(np.searchsorted(x_68_g, 0.525))
                    if i_b1 > i_b0 + 2:
                        zb68_goal[i_b0 : i_b1 + 1] = np.maximum.accumulate(zb68_goal[i_b0 : i_b1 + 1])
                    for _ in range(14):
                        zb68_goal[1:-1] = 0.25 * zb68_goal[:-2] + 0.50 * zb68_goal[1:-1] + 0.25 * zb68_goal[2:]
                d_top68 = np.clip((zt68 - zt68_goal) * (0.72 if has_ext_head else 0.65), -0.014 if has_ext_head else -0.008, 0.016 if has_ext_head else 0.014) * taper_68_dist * ramp_68_ax
                d_bot68 = np.clip((zb68 - zb68_goal) * 0.65, -0.016, 0.010) * taper_68_dist * ramp_68_ax
                for _ in range(10):
                    d_top68[1:-1] = 0.25 * d_top68[:-2] + 0.50 * d_top68[1:-1] + 0.25 * d_top68[2:]
                    d_bot68[1:-1] = 0.25 * d_bot68[:-2] + 0.50 * d_bot68[1:-1] + 0.25 * d_bot68[2:]
                dt_v68 = np.interp(np.clip(px68, x_68_g[0], x_68_g[-1]), x_68_g, d_top68)
                db_v68 = np.interp(np.clip(px68, x_68_g[0], x_68_g[-1]), x_68_g, d_bot68)
                if has_ext_head:
                    wg_top_68 = (
                        np.where(rx_sgn68 > 0.08, 1.0, 0.0)
                        * smootherstep((px68 - 0.128) / 0.034)
                        * (1.0 - smootherstep((px68 - 0.575) / 0.065))
                        * smootherstep((rz - 1.515) / 0.045)
                    )
                else:
                    wg_top_68 = wg_top_p
                dz68_all += w_mob_global * ((1.0 - s_bl_p) * wg_top_68 * dt_v68 + s_bl_p * wg_bot_p * db_v68)

                yf68_tgt = yf68.copy()
                yb68_tgt = yb68.copy()
                for _ in range(28):
                    ym_f = 0.5 * (yf68_tgt[:-2] + yf68_tgt[2:])
                    yf68_tgt[1:-1] += np.where(ym_f < yf68_tgt[1:-1], 0.60, 0.34) * (ym_f - yf68_tgt[1:-1])
                    yb68_tgt[1:-1] = 0.25 * yb68_tgt[:-2] + 0.50 * yb68_tgt[1:-1] + 0.25 * yb68_tgt[2:]
                w_y68_x = smootherstep((x_68_g - 0.205) / 0.032) * (1.0 - smootherstep((x_68_g - 0.515) / 0.055))
                dy_f_g = np.clip((yf68_tgt - yf68) * 0.72, -0.014, 0.012) * f_cw_p * w_y68_x
                dy_b_g = np.clip((yb68_tgt - yb68) * 0.62, -0.012, 0.014) * f_cw_p * w_y68_x
                dyf_v = np.interp(np.clip(px68, x_68_g[0], x_68_g[-1]), x_68_g, dy_f_g)
                dyb_v = np.interp(np.clip(px68, x_68_g[0], x_68_g[-1]), x_68_g, dy_b_g)
                yc68 = 0.5 * (np.interp(np.clip(px68, x_68_g[0], x_68_g[-1]), x_68_g, yf68 + yb68))
                s_back_y = smootherstep((py68 - yc68) / 0.055)
                w_arm_y68 = w_mob_global * smootherstep((w_arm_sm_p - 0.16) / 0.20) * smootherstep((pz68 - 1.495) / 0.035)
                dy68_all += w_arm_y68 * ((1.0 - s_back_y) * dyf_v + s_back_y * dyb_v)

        dz68_u = np.bincount(weld, weights=dz68_all, minlength=n_u) / mult
        dy68_u = np.bincount(weld, weights=dy68_all, minlength=n_u) / mult
        dz68_u[seam_u] = 0.0
        dy68_u[seam_u] = 0.0
        p_u[:, 2] -= dz68_u
        p_u[:, 1] += dy68_u
        disp_68 = p_u - p_lbs_u
        for _ in range(4):
            nbr_68a = np.column_stack([np.bincount(es, weights=w_le_sim * disp_68[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
            disp_68 += (0.24 * w_relax_u)[:, None] * (nbr_68a - disp_68)
            disp_68[seam_u] = 0.0
            nbr_68b = np.column_stack([np.bincount(es, weights=w_le_sim * disp_68[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
            disp_68 -= (0.251 * w_relax_u)[:, None] * (nbr_68b - disp_68)
            disp_68[seam_u] = 0.0
        p_u = p_lbs_u + disp_68

    # Zero-shrinkage tangential + Taubin surface polish across +68 deg shoulder, axilla, lateral lat-ribcage & arm-to-elbow
    # (NEVER shrinking the arm cylinder via conv > 0!) followed by 2 exact T-pose envelope lock passes!
    in_upper_clav_ax = smootherstep((z_eff_u - 1.505) / 0.024) * smootherstep((-p_lbs_u[:, 1] - 0.055) / 0.030)
    x_in_gate = np.where(in_upper_clav_ax > 0.15, 0.088, 0.105)
    w_post68_pol = (
        w_relax_u
        * not_pec_cup_u
        * not_back_fold_u
        * smootherstep((px_abs_u - x_in_gate) / 0.032)
        * (1.0 - smootherstep((px_abs_u - 0.535) / 0.065))
        * smootherstep((z_eff_u - 1.395) / 0.042)
    )
    tsp_idx = np.flatnonzero(w_post68_pol > 0.01)
    if len(tsp_idx):
        wtsp = w_post68_pol[tsp_idx, None]
        is_ax_hinge = (1.0 - smootherstep((px_abs_u[tsp_idx] - 0.305) / 0.042))[:, None]
        nrm_p68 = vertex_normals(p_u[weld], tri_l, weld)[first_u]
        for _it68 in range(36):
            if _it68 > 0 and (_it68 % 6) == 0:
                nrm_p68 = vertex_normals(p_u[weld], tri_l, weld)[first_u]
            nbr_ts = np.column_stack([np.bincount(es, weights=p_u[ed, c], minlength=n_u) / deg_u_ra for c in range(3)])
            dp_p68 = nbr_ts[tsp_idx] - p_u[tsp_idx]
            nv_p68 = nrm_p68[tsp_idx]
            dot_p68 = np.einsum("ni,ni->n", dp_p68, nv_p68)[:, None]
            dp_p68n = dot_p68 * nv_p68
            dp_p68t = dp_p68 - dp_p68n
            p_u[tsp_idx] += wtsp * (0.64 * dp_p68t + np.where(dot_p68 > 0.0, 0.68 * is_ax_hinge, 0.14 * is_ax_hinge) * dp_p68n)
            p_u[seam_u] = p_lbs_u[seam_u]
        for _ in range(18):
            nbr1_p68 = np.column_stack([np.bincount(es, weights=p_u[ed, c], minlength=n_u) / deg_u_ra for c in range(3)])
            p_u[tsp_idx] += (0.35 * wtsp) * (nbr1_p68[tsp_idx] - p_u[tsp_idx])
            p_u[seam_u] = p_lbs_u[seam_u]
            nbr2_p68 = np.column_stack([np.bincount(es, weights=p_u[ed, c], minlength=n_u) / deg_u_ra for c in range(3)])
            p_u[tsp_idx] -= (0.368 * wtsp) * (nbr2_p68[tsp_idx] - p_u[tsp_idx])
            p_u[seam_u] = p_lbs_u[seam_u]

    _run_tp_calibration_pass(2, gain_scale=0.85)

    if has_ext_head:
        # Re-lock smooth supraclavicular-to-deltoid top slope (`X = 0.140..0.48 m`) at `+68 deg` after T-pose calibration
        # so `_run_tp_calibration_pass` never re-introduces a medial clavicular dip next to a proximal deltoid hump:
        for _ in range(2):
            p68_post = p_u[weld].copy()
            p68_post[seam_lock_body] = p_full_lbs[seam_lock_body]
            dz_post_all = np.zeros(len(lean_rest_bl), dtype=np.float64)
            for sgn_p, arm_sl_p, _, s_bl_p, _, _, f_cw_p, _, _ in arm_post_specs:
                if f_cw_p <= 0.02:
                    continue
                px_q = sgn_p * p68_post[:, 0]
                pz_q = p68_post[:, 2]
                rx_q = sgn_p * rx
                mt_q = (p_lean[:, 2] > 1.485) & (arm_sl_p | ((rz > 1.525) & (px_q >= 0.128) & (px_q < 0.242))) & (pz_q > 1.485)
                zt_q = np.full_like(x_68_g, np.nan)
                for xiq, xvq in enumerate(x_68_g):
                    mq = mt_q & (np.abs(px_q - xvq) < 0.015)
                    if np.sum(mq) >= 4:
                        zt_q[xiq] = float(np.percentile(pz_q[mq], 98.5))
                fq = np.isfinite(zt_q)
                if np.sum(fq) >= 10:
                    zt_q = np.interp(x_68_g, x_68_g[fq], zt_q[fq])
                    zt_q_sm = zt_q.copy()
                    for _ in range(40):
                        zt_q_sm[1:-1] = 0.25 * zt_q_sm[:-2] + 0.50 * zt_q_sm[1:-1] + 0.25 * zt_q_sm[2:]
                    ic0, ic1 = int(np.searchsorted(x_68_g, 0.146)), int(np.searchsorted(x_68_g, 0.48))
                    if ic1 > ic0 + 2:
                        zc_q = np.linspace(zt_q_sm[ic0], zt_q_sm[ic1], ic1 - ic0 + 1)
                        cap_q = 0.0034 if ms_g > 0.75 else 0.0018
                        zt_q_sm[ic0 : ic1 + 1] = np.clip(zt_q_sm[ic0 : ic1 + 1], zc_q - 0.0008, zc_q + cap_q)
                    for _ in range(10):
                        zt_q_sm[1:-1] = 0.25 * zt_q_sm[:-2] + 0.50 * zt_q_sm[1:-1] + 0.25 * zt_q_sm[2:]
                    dt_q = np.clip((zt_q - zt_q_sm) * 0.70, -0.012, 0.014) * taper_68_dist * ramp_68_ax
                    dt_vq = np.interp(np.clip(px_q, x_68_g[0], x_68_g[-1]), x_68_g, dt_q)
                    wg_q = (
                        np.where(rx_q > 0.08, 1.0, 0.0)
                        * smootherstep((px_q - 0.128) / 0.034)
                        * (1.0 - smootherstep((px_q - 0.50) / 0.065))
                        * smootherstep((rz - 1.515) / 0.045)
                    )
                    dz_post_all += w_mob_global * (1.0 - s_bl_p) * wg_q * dt_vq
            dz_q_u = np.bincount(weld, weights=dz_post_all, minlength=n_u) / mult
            dz_q_u[seam_u] = 0.0
            p_u[:, 2] -= dz_q_u
            d_q = p_u - p_lbs_u
            for _ in range(3):
                nb_q1 = np.column_stack([np.bincount(es, weights=w_le_sim * d_q[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
                d_q += (0.22 * w_relax_u)[:, None] * (nb_q1 - d_q)
                d_q[seam_u] = 0.0
                nb_q2 = np.column_stack([np.bincount(es, weights=w_le_sim * d_q[ed, c], minlength=n_u) / deg_le_sim for c in range(3)])
                d_q -= (0.23 * w_relax_u)[:, None] * (nb_q2 - d_q)
                d_q[seam_u] = 0.0
            p_u = p_lbs_u + d_q

    # Final post-calibration lateral axillary / upper-ribcage stretch fairing (`px_abs_u <= 0.305m` ONLY — NEVER touching arm cylinder > 0.31m
    # and strictly respecting `not_pec_cup_u` & `not_back_fold_u`) so +68 deg Profile has ZERO diagonal shear ridge under the outstretched arm!
    w_lat68_fin = (
        w_relax_u
        * not_pec_cup_u
        * not_back_fold_u
        * smootherstep((px_abs_u - 0.130) / 0.028)
        * (1.0 - smootherstep((px_abs_u - 0.295) / 0.038))
        * smootherstep((z_eff_u - 1.445) / 0.036)
        * (1.0 - smootherstep((z_eff_u - 1.620) / 0.032))
    )
    lf68_idx = np.flatnonzero(w_lat68_fin > 0.01)
    if len(lf68_idx):
        wlf68 = w_lat68_fin[lf68_idx, None]
        nrm_lf68 = vertex_normals(p_u[weld], tri_l, weld)[first_u]
        for _it_lf in range(22):
            if _it_lf > 0 and (_it_lf % 6) == 0:
                nrm_lf68 = vertex_normals(p_u[weld], tri_l, weld)[first_u]
            nbr_lf = np.column_stack([np.bincount(es, weights=p_u[ed, c], minlength=n_u) / deg_u_ra for c in range(3)])
            dp_lf = nbr_lf[lf68_idx] - p_u[lf68_idx]
            nv_lf = nrm_lf68[lf68_idx]
            dot_lf = np.einsum("ni,ni->n", dp_lf, nv_lf)[:, None]
            dp_lfn = dot_lf * nv_lf
            dp_lft = dp_lf - dp_lfn
            p_u[lf68_idx] += wlf68 * (0.62 * dp_lft + np.where(dot_lf > 0.0, 0.58, 0.26) * dp_lfn)
            p_u[seam_u] = p_lbs_u[seam_u]

    # Untangle any locally compressed/inverted triangle on p_u BEFORE attenuation so both badFaces == 0 and newSelfIntersections == 0!
    si_before = self_intersections(p_lean, tri_l, weld) | self_intersections(p_full_lbs, tri_l, weld)
    base_ar_ra = face_areas(p_lean, tri_l)
    for _ in range(12):
        chk_u_all = p_u[weld]
        chk_u_all[seam_lock_body] = p_full_lbs[seam_lock_body]
        bf_pre = bad_faces(chk_u_all, tri_l, base_ar_ra, conn)
        si_pre = self_intersections(chk_u_all, tri_l, weld) - si_before
        if not si_pre and not np.any(bf_pre):
            break
        ff_pre = set(np.flatnonzero(bf_pre).tolist())
        for a, b in si_pre:
            ff_pre.add(a)
            ff_pre.add(b)
        patch_ra = np.zeros(n_u, dtype=np.float64)
        patch_ra[np.unique(weld[tri_l[list(ff_pre)].ravel()])] = 1.0
        for _ in range(2):
            patch_ra = np.maximum(patch_ra * 0.72, np.bincount(es, weights=patch_ra[ed], minlength=n_u) / deg_u_ra)
        patch_ra[seam_u] = 0.0
        for _ in range(4):
            nbr_fix = np.column_stack([np.bincount(es, weights=w_le * p_u[ed, c], minlength=n_u) / deg_le for c in range(3)])
            p_u += (0.45 * patch_ra)[:, None] * (nbr_fix - p_u)
            p_u[seam_u] = p_lbs_u[seam_u]

    del_ra_u = p_u - p_lbs_u
    for _ in range(14):
        chk_p = p_full_lbs + del_ra_u[weld]
        chk_p[seam_lock_body] = p_full_lbs[seam_lock_body]
        si_cur = self_intersections(chk_p, tri_l, weld) - si_before
        bf_cur = bad_faces(chk_p, tri_l, base_ar_ra, conn)
        if not si_cur and not np.any(bf_cur):
            break
        ff_ra = set(np.flatnonzero(bf_cur).tolist())
        for a, b in si_cur:
            ff_ra.add(a)
            ff_ra.add(b)
        att_ra = np.zeros(n_u, dtype=np.float64)
        att_ra[np.unique(weld[tri_l[list(ff_ra)].ravel()])] = 1.0
        for _ in range(4):
            att_ra = np.maximum(att_ra * 0.78, np.bincount(es, weights=att_ra[ed], minlength=n_u) / deg_u_ra)
        del_ra_u *= (1.0 - 0.38 * np.clip(att_ra, 0.0, 1.0))[:, None]

    p_final = p_full_lbs + del_ra_u[weld]
    p_final[seam_lock_body] = p_full_lbs[seam_lock_body]

    si_after = self_intersections(p_final, tri_l, weld) - si_before
    bf_after = int(bad_faces(p_final, tri_l, base_ar_ra, conn).sum())

    dp_gltf = blender_to_gltf(p_final) - blender_to_gltf(p_full_lbs)
    drest_gltf = np.einsum("vij,vj->vi", np.linalg.inv(m_g), dp_gltf)
    drest_bl = gltf_to_blender(drest_gltf)
    drest_bl[seam_lock_body] = 0.0

    w_left = smootherstep((rx + 0.015) / 0.030)[:, None]
    d_left_bl = w_left * drest_bl
    d_right_bl = (1.0 - w_left) * drest_bl
    ra_quality: dict = {
        "applied": True,
        "mode": "adipose-coupled-head-tpose-corrective" if has_ext_head else "adipose-gravity-tpose-corrective",
        "newSelfIntersections": int(len(si_after)),
        "badFaces": bf_after,
        "maxRestDeltaMm": round(float(np.linalg.norm(drest_bl, axis=1).max() * 1000.0), 3),
        "collarSeamMaxDeltaMm": round(float(np.linalg.norm(drest_bl[seam_lock_body], axis=1).max() * 1000.0), 6),
    }

    if has_ext_head and head_rest_bl is not None and head_tri is not None and seam_head is not None:
        h_ref = lean_head_bl if lean_head_bl is not None else head_rest_bl
        hx, _, hz = h_ref.T
        p_hd_lbs, m_g_hd, _, _ = eval_arm_pose_lbs(head_rest_bl, "headSkin", compiled_family, raise_scale=1.0)
        h_conn = weld_connectivity(h_ref, head_tri, decimals=5)
        h_weld, (h_es, h_ed), h_mult, h_deg = h_conn
        n_hu = len(h_mult)
        h_deg_f = np.maximum(h_deg.astype(np.float64), 1.0)
        h_first = np.zeros(n_hu, dtype=np.int64)
        h_first[h_weld[::-1]] = np.arange(len(h_weld) - 1, -1, -1)

        dp_hd_seam = p_final[seam_body] - p_hd_lbs[seam_head]
        dp_hd_init = np.zeros_like(head_rest_bl, dtype=np.float64)
        dp_hd_init[seam_head] = dp_hd_seam
        dp_hu = np.column_stack([np.bincount(h_weld, weights=dp_hd_init[:, c], minlength=n_hu) / h_mult for c in range(3)])
        hu_x, _, hu_z = h_ref[h_first].T
        hu_lock = (hu_z >= 1.762) | ((np.abs(hu_x) <= 0.072) & (hu_z >= 1.692))
        dp_hu_seam_vals = np.column_stack([np.bincount(h_weld[seam_head], weights=dp_hd_seam[:, c], minlength=n_hu) for c in range(3)])
        seam_cnt = np.bincount(h_weld[seam_head], minlength=n_hu)
        has_s_u = seam_cnt > 0
        dp_hu_seam_vals[has_s_u] /= seam_cnt[has_s_u, None]
        dp_hu[hu_lock] = 0.0
        dp_hu[has_s_u] = dp_hu_seam_vals[has_s_u]
        for _ in range(36):
            nbr_hu = np.column_stack([np.bincount(h_es, weights=dp_hu[h_ed, c], minlength=n_hu) / h_deg_f for c in range(3)])
            dp_hu = 0.30 * dp_hu + 0.70 * nbr_hu
            dp_hu[hu_lock] = 0.0
            dp_hu[has_s_u] = dp_hu_seam_vals[has_s_u]
        dp_hd_final = dp_hu[h_weld]
        dp_hd_final[seam_head] = dp_hd_seam
        drest_hd_bl = gltf_to_blender(np.einsum("vij,vj->vi", np.linalg.inv(m_g_hd), blender_to_gltf(dp_hd_final)))
        drest_hd_bl[seam_head] = drest_bl[seam_body]
        w_hd_left = smootherstep((hx + 0.015) / 0.030)[:, None]
        d_hd_left_bl = w_hd_left * drest_hd_bl
        d_hd_right_bl = (1.0 - w_hd_left) * drest_hd_bl
        d_hd_left_bl[seam_head] = d_left_bl[seam_body]
        d_hd_right_bl[seam_head] = d_right_bl[seam_body]

        p_tp_cor, _, _, _ = eval_arm_pose_lbs(full_rest_bl + 0.705 * drest_bl, "bodySkin", compiled_family, raise_scale=0.705)
        p_hd_68_cor, _, _, _ = eval_arm_pose_lbs(head_rest_bl + drest_hd_bl, "headSkin", compiled_family, raise_scale=1.0)
        p_hd_tp_cor, _, _, _ = eval_arm_pose_lbs(head_rest_bl + 0.705 * drest_hd_bl, "headSkin", compiled_family, raise_scale=0.705)
        seam_gap_68 = float(np.linalg.norm(p_final[seam_body] - p_hd_68_cor[seam_head], axis=1).max() * 1000.0)
        seam_gap_tp = float(np.linalg.norm(p_tp_cor[seam_body] - p_hd_tp_cor[seam_head], axis=1).max() * 1000.0)
        hd_bf_68 = int(bad_faces(p_hd_68_cor, head_tri, face_areas(head_rest_bl, head_tri), h_conn).sum())
        hd_bf_tp = int(bad_faces(p_hd_tp_cor, head_tri, face_areas(head_rest_bl, head_tri), h_conn).sum())
        ra_quality["collarSeamMaxDeltaMm"] = round(max(seam_gap_68, seam_gap_tp), 6)
        ra_quality["headBadFaces"] = hd_bf_68
        ra_quality["headBadFacesTPose"] = hd_bf_tp
        ra_quality["headMaxRestDeltaMm"] = round(float(np.linalg.norm(drest_hd_bl, axis=1).max() * 1000.0), 3)
        _ra_cache_dir.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            _ra_cp,
            left=d_left_bl.astype(np.float32),
            right=d_right_bl.astype(np.float32),
            headLeft=d_hd_left_bl.astype(np.float32),
            headRight=d_hd_right_bl.astype(np.float32),
            qualityJson=np.array(_json.dumps(ra_quality)),
        )
        ra_quality["_headLeftBl"] = d_hd_left_bl
        ra_quality["_headRightBl"] = d_hd_right_bl
        return d_left_bl, d_right_bl, ra_quality

    _ra_cache_dir.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(_ra_cp, left=d_left_bl.astype(np.float32), right=d_right_bl.astype(np.float32), qualityJson=np.array(_json.dumps(ra_quality)))
    return d_left_bl, d_right_bl, ra_quality


def pose_raised_arms_preview(
    lod1_xyz: np.ndarray,
    lod1_tri: np.ndarray,
    head_xyz: np.ndarray,
    head_tri: np.ndarray,
    compiled_family: dict,
    z_shift: float,
    raised_arm_rest_delta_bl: np.ndarray | None = None,
    raised_arm_head_delta_bl: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Pose runtime LOD1 + headSkin using OpenLegend's exact 30-joint rig, retargeted 'Raised arms' clip, pre-LBS soft-tissue morph, and 4-joint LBS."""
    _ = z_shift
    body_in = lod1_xyz + raised_arm_rest_delta_bl if raised_arm_rest_delta_bl is not None else lod1_xyz
    head_in = head_xyz + raised_arm_head_delta_bl if raised_arm_head_delta_bl is not None else head_xyz
    body_posed, _, _, _ = eval_arm_pose_lbs(body_in, "bodySkin", compiled_family, raise_scale=1.0)
    head_posed, _, _, _ = eval_arm_pose_lbs(head_in, "headSkin", compiled_family, raise_scale=1.0)
    comb_xyz = np.vstack([body_posed, head_posed])
    comb_tri = np.vstack([lod1_tri, head_tri + len(lod1_xyz)])
    return comb_xyz, comb_tri
