#!/usr/bin/env python3
"""Canonical topological & landmark/joint-anchored masks for bodySkin (LOD0/LOD1) and headSkin.

Replaces ad-hoc deformed world-meter (X, Y, Z) coordinate boxes with canonical topological
vertex/joint masks derived once from compiled.json landmarks, joint weights, and welded mesh
connectivity so post-polish and pose-corrective passes never fight each other or drift across
Stage A / Stage B body shapes.
"""
from __future__ import annotations

from collections import deque
import numpy as np


def smoothstep(t: np.ndarray | float) -> np.ndarray:
    c = np.clip(t, 0.0, 1.0)
    return np.clip(c * c * (3.0 - 2.0 * c), 0.0, 1.0)


def smootherstep(t: np.ndarray | float) -> np.ndarray:
    c = np.clip(t, 0.0, 1.0)
    return np.clip(c * c * c * (10.0 + c * (-15.0 + 6.0 * c)), 0.0, 1.0)


def gltf_to_blender(pts: np.ndarray) -> np.ndarray:
    arr = np.asarray(pts, dtype=np.float64).reshape(-1, 3)
    return arr[:, [0, 2, 1]] * np.array([1.0, -1.0, 1.0], dtype=np.float64)


def weld_graph(points: np.ndarray, triangles: np.ndarray, decimals: int = 5):
    _, weld = np.unique(np.round(points, decimals), axis=0, return_inverse=True)
    n_u = int(weld.max()) + 1
    wtri = weld[triangles]
    edges = np.concatenate((wtri[:, [0, 1]], wtri[:, [1, 2]], wtri[:, [2, 0]]), axis=0)
    edges = np.unique(np.concatenate((edges, edges[:, ::-1]), axis=0), axis=0)
    edges = edges[edges[:, 0] != edges[:, 1]]
    adj: list[list[int]] = [[] for _ in range(n_u)]
    for u, v in edges:
        adj[int(u)].append(int(v))
    u_pts = np.zeros((n_u, 3), dtype=np.float64)
    u_pts[weld] = points
    return weld, wtri, edges, adj, u_pts


def bfs_hop_distance(n_u: int, adj: list[list[int]], seeds: np.ndarray) -> np.ndarray:
    dist = np.full(n_u, 1_000_000, dtype=np.int32)
    q: deque[int] = deque()
    for s in np.flatnonzero(seeds):
        si = int(s)
        dist[si] = 0
        q.append(si)
    while q:
        u = q.popleft()
        nd = dist[u] + 1
        for nb in adj[u]:
            if dist[nb] > nd:
                dist[nb] = nd
                q.append(nb)
    return dist


def build_head_feature_pin_mask(
    rest_all: np.ndarray,
    c_nrm_rest: np.ndarray,
    all_tri: np.ndarray,
    n_body_verts: int,
    compiled_family: dict,
) -> tuple[np.ndarray, np.ndarray, dict]:
    """Build relative/coupled head feature masks with ZERO 0.0mm world-space hard pins!

    - Unlocks 100% of `headSkin` (cranium, forehead, temples, cheekbones, brow, mid-cheeks,
      jowls, submental double-chin collar, neck, and occiput) to widen/deepen smoothly to Donor.
    - Identifies ONLY micro-apertures (`inward_oral`, `lip_fissure`, `eyelid_aperture`,
      `nostril_plug`) and topological `ear_pinnae` (`ear_comp_l`, `ear_comp_r` + their 2-ring
      head attachment borders `ear_root_l`, `ear_root_r`) so they get `obs_gain = 0` against
      Meshy's fused eyeballs/lips/ear-blobs while moving freely via stiff local differential
      coupling + rigid/similarity attachment follow!
    - Records `crown_1d_z` ONLY for the 1D vertical stature invariant (`max(Z) = 2.0319m`; X/Y free).
    """
    n_all = len(rest_all)
    is_head = np.arange(n_all) >= n_body_verts

    meshes = compiled_family["meshes"]
    eye_l = gltf_to_blender(meshes["eyeLeft"]["positions"])
    eye_r = gltf_to_blender(meshes["eyeRight"]["positions"])
    lashes = gltf_to_blender(meshes["lashes"]["positions"])
    teeth = gltf_to_blender(meshes["teeth"]["positions"])
    oral = gltf_to_blender(meshes["oral"]["positions"])
    eye_lash_pts = np.vstack([eye_l, eye_r, lashes])
    oral_teeth_pts = np.vstack([oral, teeth])

    head_idx = np.flatnonzero(is_head)
    hp = rest_all[head_idx]
    hn = c_nrm_rest[head_idx]
    hx, hy, hz = hp.T

    # 1. Oral interior pouch + tight lip-slit fissure (outer vermilion, philtrum, chin & cheeks stay 100% observed!)
    oral_ctr = np.array([0.0, float(oral[:, 1].mean()) + 0.015, float(oral[:, 2].mean())])
    inward_oral = (
        (hz > float(teeth[:, 2].min()) - 0.020)
        & (hz < float(eye_lash_pts[:, 2].min()))
        & (np.einsum("ij,ij->i", hp - oral_ctr[None, :], hn) < -0.012)
    )
    d_oral = np.linalg.norm(hp[:, None, :] - oral_teeth_pts[None, :, :], axis=2).min(axis=1)
    near_oral_submesh = d_oral <= 0.0060

    oral_x_max = float(np.abs(oral[:, 0]).max())
    oral_y_min = float(oral[:, 1].min())
    oral_z_mid = 0.5 * (float(oral[:, 2].min()) + float(oral[:, 2].max()))
    lip_fissure = (
        (np.abs(hx) <= oral_x_max + 0.0025)
        & (hy <= oral_y_min + 0.0110)
        & (np.abs(hz - oral_z_mid) <= 0.0055)
    )

    # 2. Tight palpebral eyelid margins & inner eye-socket pocket (brows, temples & cheekbones stay 100% observed!)
    d_eye_l = np.linalg.norm(hp[:, None, :] - eye_l[None, :, :], axis=2).min(axis=1)
    d_eye_r = np.linalg.norm(hp[:, None, :] - eye_r[None, :, :], axis=2).min(axis=1)
    d_eyes = np.linalg.norm(hp[:, None, :] - eye_lash_pts[None, :, :], axis=2).min(axis=1)
    eyelid_aperture = d_eyes <= 0.0082
    orb_ring_l = (d_eye_l <= 0.0105) & (~inward_oral)
    orb_ring_r = (d_eye_r <= 0.0105) & (~inward_oral)

    # 3. Downward-facing nostril plugs only (nasal bridge, dorsum, tip & alar sidewalls stay 100% observed!)
    nostril_plug = (
        (np.abs(hx) <= 0.0195)
        & (hy <= oral_y_min + 0.0090)
        & (hz >= 1.8630)
        & (hz <= 1.8765)
        & (hn[:, 2] < -0.32)
    )

    # 4. Topological left & right ear pinnae + 2-ring temporal/mastoid attachment border for rigid/affine ear follow!
    head_tri_sub = all_tri[np.all(is_head[all_tri], axis=1)] - n_body_verts
    hweld, _, _, hadj, hu_pts = weld_graph(hp, head_tri_sub, decimals=5)
    hux, huy, huz = hu_pts.T
    ear_seed_u = (np.abs(hux) >= 0.0755) & (huy >= -0.006) & (huy <= 0.036) & (huz >= 1.876) & (huz <= 1.934)
    ear_allow_u = (np.abs(hux) >= 0.0585) & (huy >= -0.012) & (huy <= 0.039) & (huz >= 1.866) & (huz <= 1.938)
    ear_comp_u = np.zeros(len(hu_pts), dtype=bool)
    q_ear: deque[int] = deque(int(i) for i in np.flatnonzero(ear_seed_u))
    ear_comp_u[ear_seed_u] = True
    while q_ear:
        u = q_ear.popleft()
        for nb in hadj[u]:
            if ear_allow_u[nb] and not ear_comp_u[nb]:
                ear_comp_u[nb] = True
                q_ear.append(nb)

    ear_comp_l_u = ear_comp_u & (hux > 0.0)
    ear_comp_r_u = ear_comp_u & (hux < 0.0)
    hops_ear_l = bfs_hop_distance(len(hu_pts), hadj, ear_comp_l_u)
    hops_ear_r = bfs_hop_distance(len(hu_pts), hadj, ear_comp_r_u)
    ear_root_l_u = (hops_ear_l >= 1) & (hops_ear_l <= 3)
    ear_root_r_u = (hops_ear_r >= 1) & (hops_ear_r <= 3)
    ear_pin = ear_comp_u[hweld]

    # 5. 1D vertical crown stature landmark mask (Z-only constraint, X/Y 100% free!)
    crown_lm = compiled_family.get("landmarks", {}).get("crown", {})
    crown_1d_z = hz >= float(hp[:, 2].max()) - 0.0035
    if "vertexIndices" in crown_lm:
        for vi in crown_lm["vertexIndices"]:
            if 0 <= int(vi) < len(hp):
                crown_1d_z[int(vi)] = True

    # ZERO 3D world-space hard pins anywhere on headSkin!
    head_pin = np.zeros(n_all, dtype=bool)

    aperture_local = inward_oral | near_oral_submesh | lip_fissure | eyelid_aperture | nostril_plug | ear_pin
    ap_u = np.isin(np.arange(len(hu_pts)), hweld[aperture_local])
    hops_ap_u = bfs_hop_distance(len(hu_pts), hadj, ap_u)
    # Tight 2-hop C2 observation ramp outside micro-apertures -> 100% full observation on brow, cheeks, lips, nose, temples, skull!
    taper_u = smootherstep(np.clip(hops_ap_u.astype(np.float64) / 2.2, 0.0, 1.0))
    taper_head = np.ones(n_all, dtype=np.float64)
    taper_head[head_idx] = taper_u[hweld]

    # Stiff local differential coupling boost (translation-invariant!) so eyelids, lips, nostrils & ears preserve crisp local shape
    stiff_u = np.where(hops_ap_u <= 1, 5.5, np.where(hops_ap_u == 2, 2.8, 1.0))
    coupled_stiff_head = np.ones(n_all, dtype=np.float64)
    coupled_stiff_head[head_idx] = stiff_u[hweld]

    orig_head_n = len(meshes["headSkin"]["positions"]) // 3
    summary = {
        "headWorldSpacePinnedVertices": 0,
        "headUnlockedVertices": int(orig_head_n),
        "coupledOralLipVertices": int((inward_oral[:orig_head_n] | near_oral_submesh[:orig_head_n] | lip_fissure[:orig_head_n]).sum()),
        "coupledOrbitalVertices": int(eyelid_aperture[:orig_head_n].sum()),
        "coupledEarVertices": int(ear_pin[:orig_head_n].sum()),
        "crown1dZVertices": int(crown_1d_z[:orig_head_n].sum()),
        "_masks": {
            "coupledStiffAll": coupled_stiff_head,
            "earCompLeftHead": ear_comp_l_u[hweld][:orig_head_n],
            "earCompRightHead": ear_comp_r_u[hweld][:orig_head_n],
            "earRootLeftHead": ear_root_l_u[hweld][:orig_head_n],
            "earRootRightHead": ear_root_r_u[hweld][:orig_head_n],
            "orbRingLeftHead": orb_ring_l[:orig_head_n],
            "orbRingRightHead": orb_ring_r[:orig_head_n],
            "oralAttachHead": (near_oral_submesh | lip_fissure)[:orig_head_n],
            "detailPreserveHead": (eyelid_aperture | lip_fissure | nostril_plug)[:orig_head_n],
            "inwardOralHead": inward_oral[:orig_head_n],
            "crown1dZHead": crown_1d_z[:orig_head_n],
        },
    }
    return head_pin, taper_head, summary


def build_five_finger_topology(
    pts_rest: np.ndarray,
    tri: np.ndarray,
    arm_weights_l: np.ndarray,
    arm_weights_r: np.ndarray,
    landmarks_bl: dict[str, np.ndarray],
) -> dict:
    """Segment wrist, carpus/palm/dorsum, and all 5 canonical fingers (0=thumb..4=pinky) topologically on LOD0 or LOD1."""
    weld, _, _, adj, u_pts = weld_graph(pts_rest, tri, decimals=5)
    n_u = len(u_pts)
    n_v = len(pts_rest)

    # Weld normals for dorsal nail-plate detection
    v_tri = pts_rest[tri]
    fn = np.cross(v_tri[:, 1] - v_tri[:, 0], v_tri[:, 2] - v_tri[:, 0])
    vn_u = np.zeros((n_u, 3), dtype=np.float64)
    wtri = weld[tri]
    for k in range(3):
        for c in range(3):
            np.add.at(vn_u[:, c], wtri[:, k], fn[:, c])
    vn_u /= np.maximum(np.linalg.norm(vn_u, axis=1, keepdims=True), 1e-12)

    u_arm_l = np.bincount(weld, weights=arm_weights_l, minlength=n_u) / np.maximum(np.bincount(weld, minlength=n_u), 1)
    u_arm_r = np.bincount(weld, weights=arm_weights_r, minlength=n_u) / np.maximum(np.bincount(weld, minlength=n_u), 1)

    finger_id_u = np.full(n_u, -1, dtype=np.int32)  # -1 = non-finger, 0..4 = L thumb..pinky, 5..9 = R thumb..pinky
    finger_side_u = np.zeros(n_u, dtype=np.int32)   # +1 left (+X), -1 right (-X)
    t_phal_u = np.zeros(n_u, dtype=np.float64)
    s_norm_u = np.full(n_u, -10.0, dtype=np.float64)
    dorsal_nail_damp_u = np.ones(n_u, dtype=np.float64)
    min_interfinger_gap_u = np.full(n_u, 1.0, dtype=np.float64)
    u_thick_per_side: dict[int, np.ndarray] = {}
    u_width_per_side: dict[int, np.ndarray] = {}
    u_palm_per_side: dict[int, np.ndarray] = {}
    wr_per_side: dict[int, np.ndarray] = {}
    palm_len_per_side: dict[int, float] = {}

    for sgn, sfx, u_arm_w, base_fid in ((1, "l", u_arm_l, 0), (-1, "r", u_arm_r, 5)):
        wr = landmarks_bl[f"hand_{sfx}.head"]
        kn = landmarks_bl[f"middle_01_{sfx}.head"]
        l_palm = float(np.linalg.norm(kn - wr))
        u_palm = (kn - wr) / max(l_palm, 1e-8)
        wr_per_side[sgn] = wr
        u_palm_per_side[sgn] = u_palm
        palm_len_per_side[sgn] = l_palm

        side_m = (u_arm_w > 0.25) & (u_pts[:, 0] * sgn > 0.25)
        s_val = ((u_pts - wr[None, :]) @ u_palm) / l_palm
        s_norm_u[side_m] = s_val[side_m]
        finger_side_u[side_m] = sgn

        # Orthonormal palm plane axes via PCA of canonical metacarpal band s_norm in [0.22, 0.85]
        palm_band = side_m & (s_val >= 0.22) & (s_val <= 0.85)
        pts_pb = u_pts[palm_band] - u_pts[palm_band].mean(axis=0)
        pts_pb -= np.outer(pts_pb @ u_palm, u_palm)
        _, _, vt = np.linalg.svd(pts_pb, full_matrices=False)
        u_width = vt[0].copy()
        # Orient u_width consistently from radial (thumb, anterior -Y) toward ulnar (pinky, posterior +Y)
        if u_width[1] < 0.0:
            u_width = -u_width
        u_thick = np.cross(u_palm, u_width)
        u_thick /= max(float(np.linalg.norm(u_thick)), 1e-8)
        # Orient u_thick toward dorsal back of hand (outward |X| / +Z)
        if u_thick[0] * sgn < 0.0:
            u_thick = -u_thick
        u_width_per_side[sgn] = u_width
        u_thick_per_side[sgn] = u_thick

        # 1) Connected components at s_norm >= 0.875: most radial (-u_width / minimal Y) component is THUMB!
        th_pool = side_m & (s_val >= 0.875)
        seen_t: set[int] = set()
        th_comps: list[list[int]] = []
        for v0 in np.flatnonzero(th_pool):
            vi = int(v0)
            if vi not in seen_t:
                st = [vi]
                seen_t.add(vi)
                comp = []
                while st:
                    cur = st.pop()
                    comp.append(cur)
                    for nb in adj[cur]:
                        if th_pool[nb] and nb not in seen_t:
                            seen_t.add(nb)
                            st.append(nb)
                th_comps.append(comp)
        th_comps.sort(key=lambda c: float((u_pts[c] @ u_width).mean()))
        thumb_distal = np.zeros(n_u, dtype=bool)
        if th_comps:
            thumb_distal[th_comps[0]] = True

        # Grow thumb proximally down to thumb MCP joint (s_norm >= 0.60 on radial border)
        w_coord = (u_pts - wr[None, :]) @ u_width
        thumb_allow = side_m & (s_val >= 0.60) & (w_coord <= float(w_coord[thumb_distal].max()) + 0.008)
        thumb_mask = thumb_distal.copy()
        qt: deque[int] = deque(int(i) for i in np.flatnonzero(thumb_distal))
        while qt:
            u = qt.popleft()
            for nb in adj[u]:
                if thumb_allow[nb] and not thumb_mask[nb] and s_val[nb] <= s_val[u] + 0.04:
                    thumb_mask[nb] = True
                    qt.append(nb)

        # 2) Connected components of the 4 fingers (index, middle, ring, pinky) at s_norm >= 1.269
        fg_pool = side_m & (~thumb_mask) & (s_val >= 1.269)
        seen_f: set[int] = set()
        fg_comps: list[list[int]] = []
        for v0 in np.flatnonzero(fg_pool):
            vi = int(v0)
            if vi not in seen_f:
                st = [vi]
                seen_f.add(vi)
                comp = []
                while st:
                    cur = st.pop()
                    comp.append(cur)
                    for nb in adj[cur]:
                        if fg_pool[nb] and nb not in seen_f:
                            seen_f.add(nb)
                            st.append(nb)
                if len(comp) >= 15:
                    fg_comps.append(comp)
        fg_comps.sort(key=lambda c: float((u_pts[c] @ u_width).mean()))

        # Multi-source BFS Voronoi propagation of the 4 fingers down to MCP knuckle line (s_norm >= 0.96)
        finger_id_u[thumb_mask] = base_fid + 0
        qf: deque[int] = deque()
        for k_f, comp in enumerate(fg_comps[:4]):
            fid = base_fid + 1 + k_f
            for vi in comp:
                finger_id_u[vi] = fid
                qf.append(vi)
        knuckle_pool = side_m & (~thumb_mask) & (s_val >= 0.96)
        while qf:
            u = qf.popleft()
            fid = finger_id_u[u]
            for nb in adj[u]:
                if knuckle_pool[nb] and finger_id_u[nb] < 0:
                    finger_id_u[nb] = fid
                    qf.append(nb)

        # Normalized phalanx coordinate t_phal in [0, 1] per finger + dorsal nail-plate damping
        for local_f in range(5):
            fid = base_fid + local_f
            fm = finger_id_u == fid
            if not np.any(fm):
                continue
            pts_f = u_pts[fm]
            if local_f == 0:
                # Thumb axis from its MCP base centroid to thumb tip
                base_m = fm & (s_val <= float(np.percentile(s_val[fm], 18)))
                tip_m = fm & (s_val >= float(np.percentile(s_val[fm], 92)))
                p_base = u_pts[base_m].mean(axis=0)
                p_tip = u_pts[tip_m].mean(axis=0)
                ax_f = p_tip - p_base
                ax_len = max(float(np.linalg.norm(ax_f)), 1e-6)
                ax_f /= ax_len
                t_raw = ((pts_f - p_base[None, :]) @ ax_f) / ax_len
            else:
                s_min = float(s_val[fm].min())
                s_max = float(s_val[fm].max())
                t_raw = (s_val[fm] - s_min) / max(s_max - s_min, 1e-6)
            t_f = np.clip(t_raw, 0.0, 1.0)
            t_phal_u[fm] = t_f

            # Damp flat dorsal fingernail beds near fingertip (t > 0.72 and dorsal normal alignment)
            dors_cos = vn_u[fm] @ u_thick
            nail_w = smootherstep((t_f - 0.70) / 0.16) * smootherstep((dors_cos - 0.35) / 0.35)
            dorsal_nail_damp_u[fm] = 1.0 - 0.85 * nail_w

        # Exact rest inter-finger clearance: distance from each finger vertex to nearest vertex on any OTHER finger (or palm across thumb web)
        palm_opp = side_m & (finger_id_u < 0) & (s_val >= 0.55)
        for local_f in range(5):
            fid = base_fid + local_f
            fm_idx = np.flatnonzero(finger_id_u == fid)
            if not len(fm_idx):
                continue
            if local_f == 0:
                other_m = (side_m & (finger_id_u >= 0) & (finger_id_u != fid)) | (palm_opp & (s_val >= 0.72))
            else:
                other_m = side_m & (finger_id_u >= 0) & (finger_id_u != fid)
            other_pts = u_pts[other_m]
            if len(other_pts):
                d_mat = np.linalg.norm(u_pts[fm_idx, None, :] - other_pts[None, :, :], axis=2)
                min_interfinger_gap_u[fm_idx] = d_mat.min(axis=1)

    # ZERO world-space hand pins! Unlock 100% of wrist, carpus, palm/dorsum AND let all 5 canonical fingers
    # translate/rotate freely with the thickened palm via stiff local differential coupling (coupledStiffVertex),
    # while tapering direct donor observation to 0 on distal phalanges so Meshy's mitten fingers never web them!
    is_finger_u = finger_id_u >= 0
    hand_pin_u = np.zeros(n_u, dtype=bool)
    taper_hands_u = np.where(
        is_finger_u,
        np.where(t_phal_u >= 0.16, 0.0, 1.0 - smootherstep(t_phal_u / 0.16)),
        1.0,
    )
    finger_stiff_u = np.where(is_finger_u, 1.0 + 3.8 * smootherstep(t_phal_u / 0.14), 1.0)

    return {
        "weld": weld,
        "uPts": u_pts,
        "adj": adj,
        "fingerIdVertex": finger_id_u[weld],
        "fingerIdUnique": finger_id_u,
        "fingerSideUnique": finger_side_u,
        "tPhalUnique": t_phal_u,
        "sNormUnique": s_norm_u,
        "dorsalNailDampUnique": dorsal_nail_damp_u,
        "minInterfingerGapUnique": min_interfinger_gap_u,
        "handPinVertex": hand_pin_u[weld],
        "taperHandsVertex": taper_hands_u[weld],
        "fingerStiffVertex": finger_stiff_u[weld],
        "uThickPerSide": u_thick_per_side,
        "uWidthPerSide": u_width_per_side,
        "uPalmPerSide": u_palm_per_side,
        "wristPerSide": wr_per_side,
        "palmLenPerSide": palm_len_per_side,
        "nVerts": n_v,
    }


def build_body_region_joint_masks(
    pts_rest: np.ndarray,
    tri: np.ndarray,
    joint_names: list[str],
    joint_weights: np.ndarray,
) -> dict:
    """Build canonical joint-weight & topological hop-distance masks for pelvis/groin, axilla, chest & back."""
    weld, _, _, adj, u_pts = weld_graph(pts_rest, tri, decimals=5)
    n_u = len(u_pts)
    j_map = {n: i for i, n in enumerate(joint_names)}

    def u_weight(cols: list[str]) -> np.ndarray:
        raw = sum(joint_weights[:, j_map[c]] for c in cols if c in j_map)
        return np.bincount(weld, weights=raw, minlength=n_u) / np.maximum(np.bincount(weld, minlength=n_u), 1)

    w_pelvis_u = u_weight(["pelvis", "spine_01"])
    w_thigh_u = u_weight(["thigh_l", "thigh_r"])
    w_chest_u = u_weight(["spine_03", "spine_04", "spine_05"])
    w_arm_l_u = u_weight(["upperarm_l", "upperarm_pressure_l", "lowerarm_l", "hand_l"])
    w_arm_r_u = u_weight(["upperarm_r", "upperarm_pressure_r", "lowerarm_r", "hand_r"])
    w_clav_l_u = u_weight(["clavicle_l"])
    w_clav_r_u = u_weight(["clavicle_r"])

    # Topological hop distance from sagittal pelvic midline (X=0) for pure monotonic groin/pubic-apex unfolding
    mid_pel_u = (np.abs(u_pts[:, 0]) <= 0.00025) & ((w_pelvis_u + w_thigh_u) > 0.35)
    pel_mid_hops = bfs_hop_distance(n_u, adj, mid_pel_u)

    # Topological arm-sleeve vs lateral-ribcage wall mask (never starves bottom underarm vertices in raised-arm poses!)
    v_tri = pts_rest[tri]
    fn = np.cross(v_tri[:, 1] - v_tri[:, 0], v_tri[:, 2] - v_tri[:, 0])
    vn_u = np.zeros((n_u, 3), dtype=np.float64)
    wtri = weld[tri]
    for k in range(3):
        for c in range(3):
            np.add.at(vn_u[:, c], wtri[:, k], fn[:, c])
    vn_u /= np.maximum(np.linalg.norm(vn_u, axis=1, keepdims=True), 1e-12)

    is_trunk_rib_wall_u = (
        (w_chest_u > 0.55)
        & ((w_arm_l_u + w_arm_r_u) < 0.28)
        & (np.abs(u_pts[:, 0]) < 0.196)
        & (np.sign(u_pts[:, 0]) * vn_u[:, 0] > 0.28)
    )
    arm_sleeve_l_u = ((w_arm_l_u + 0.35 * w_clav_l_u) > 0.13) & (~is_trunk_rib_wall_u) & (u_pts[:, 0] > 0.05)
    arm_sleeve_r_u = ((w_arm_r_u + 0.35 * w_clav_r_u) > 0.13) & (~is_trunk_rib_wall_u) & (u_pts[:, 0] < -0.05)

    return {
        "weld": weld,
        "uPts": u_pts,
        "pelvisWeightVertex": w_pelvis_u[weld],
        "thighWeightVertex": w_thigh_u[weld],
        "chestWeightVertex": w_chest_u[weld],
        "pelvicMidlineHopsUnique": pel_mid_hops,
        "armSleeveLeftVertex": arm_sleeve_l_u[weld],
        "armSleeveRightVertex": arm_sleeve_r_u[weld],
        "trunkRibWallVertex": is_trunk_rib_wall_u[weld],
    }
