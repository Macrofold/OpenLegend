#!/usr/bin/env python3
"""Modular, cached direct rest-space whole-body + head/neck + hand/finger fitter for Meshy donors.

Architecture:
- `register_and_fit_donor.py`: rigid registration, limb/palm pose alignment, topological donor/canonical
  partitioning, coupled 3N CG rest-space solver, and deterministic raw-fit disk caching (`fits/_raw_fit_cache`).
- `canonical_masks.py`: canonical landmark/joint/topological masks for head features, 5 fingers, and body zones.
- `head_hand_polish.py`: donor skull-to-canonical frame alignment, seamless collar/neck polish, and 5-finger thickening.
- `post_fit_polish.py`: bare-pelvis Tutte unfolding, axilla/pec/lat fairing, and shared-map LOD0->LOD1 reduction.
- `raised_arm_corrective.py`: fat & gravity pre-LBS raised-arm corrective solver (`0.705` T-pose & `1.000` +68 deg).
- `audit_sheet.py`: fast single-scene consolidated 1:1 iteration close-up sheet + 11-board sign-off suite.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
from time import perf_counter

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
import numpy as np

sys.dont_write_bytecode = True
TOOLS_DIR = str(Path(__file__).resolve().parent)
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

from audit_sheet import render_iteration_and_signoff_boards
from canonical_masks import build_five_finger_topology, build_head_feature_pin_mask
from head_hand_polish import align_donor_head_to_canonical_skull, fit_attached_head_submeshes
from mesh_rig_utils import (
    bad_faces,
    blender_to_gltf,
    compute_clipped_cotan_edge_weights,
    eval_arm_pose_lbs,
    eval_studio_shorts_bl,
    face_areas,
    gltf_to_blender,
    map_lod0_to_lod1,
    measure_studio_shorts_clearance,
    measure_unfiltered_and_section_fidelity,
    self_intersections,
    sha256_file,
    smooth_vertex_vectors,
    smootherstep,
    smoothstep,
    vertex_normals,
    weld_connectivity,
    write_support_npz,
)
from post_fit_polish import guard_and_reduce_body_and_head
from raised_arm_corrective import pose_raised_arms_preview, solve_raised_arm_gravity_corrective

def load_donor_cached(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    """Load donor positions/triangles/colors from verified NPZ cache or extract vectorized from GLB."""
    glb_sha = sha256_file(path)
    cache_path = path.parent / "raw-extracted.npz"
    if cache_path.is_file():
        cached = np.load(cache_path, allow_pickle=False)
        if "glbSha256" in cached and str(cached["glbSha256"]) == glb_sha:
            return (
                cached["positions"].astype(np.float64),
                cached["triangles"].astype(np.int64),
                cached["colors"].astype(np.float64),
                glb_sha,
            )

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise ValueError(f"Expected 1 mesh in donor {path}, found {len(meshes)}")
    obj = meshes[0]
    mesh = obj.data
    mesh.calc_loop_triangles()

    n_verts = len(mesh.vertices)
    local_co = np.empty(n_verts * 3, dtype=np.float32)
    mesh.vertices.foreach_get("co", local_co)
    local_pts = local_co.reshape(-1, 3).astype(np.float64)
    mw = np.array(obj.matrix_world, dtype=np.float64)
    positions = local_pts @ mw[:3, :3].T + mw[:3, 3]

    n_tris = len(mesh.loop_triangles)
    tri_buf = np.empty(n_tris * 3, dtype=np.int32)
    mesh.loop_triangles.foreach_get("vertices", tri_buf)
    triangles = tri_buf.reshape(-1, 3).astype(np.int64)

    colors = np.full((n_verts, 3), 0.75, dtype=np.float64)
    img = None
    for mat in mesh.materials:
        if mat and mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image is not None:
                    img = node.image
                    break
        if img is not None:
            break
    if img is not None and mesh.uv_layers.active is not None:
        w, h = img.size
        px = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(h, w, 4)[:, :, :3]
        n_loops = len(mesh.loops)
        uv_buf = np.empty(n_loops * 2, dtype=np.float32)
        mesh.uv_layers.active.data.foreach_get("uv", uv_buf)
        uvs = uv_buf.reshape(-1, 2)
        v_idx = np.empty(n_loops, dtype=np.int32)
        mesh.loops.foreach_get("vertex_index", v_idx)
        ix = np.clip((uvs[:, 0] * w).astype(np.int64), 0, w - 1)
        iy = np.clip((uvs[:, 1] * h).astype(np.int64), 0, h - 1)
        sampled = px[iy, ix].astype(np.float64)
        counts = np.bincount(v_idx, minlength=n_verts)
        valid = counts > 0
        for ch in range(3):
            colors[valid, ch] = np.bincount(v_idx, weights=sampled[:, ch], minlength=n_verts)[valid] / counts[valid]
    elif mesh.color_attributes:
        attr = mesh.color_attributes[0]
        if attr.domain == "POINT":
            colors = np.array([c.color[:3] for c in attr.data], dtype=np.float64)

    np.savez_compressed(
        cache_path,
        glbSha256=np.array(glb_sha),
        positions=positions.astype(np.float32),
        triangles=triangles.astype(np.int32),
        colors=colors.astype(np.float32),
    )
    return positions, triangles, colors, glb_sha


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


def band_box_mid_y(pts: np.ndarray, z_lo: float, z_hi: float, max_abs_x: float) -> float:
    """Geometric slice bounding-box Y midpoint across [z_lo, z_hi], immune to vertex-density bias."""
    ys = []
    for z in np.linspace(z_lo, z_hi, 9):
        sub = pts[(pts[:, 2] >= z - 0.006) & (pts[:, 2] <= z + 0.006) & (np.abs(pts[:, 0]) <= max_abs_x)]
        if len(sub) >= 10:
            ys.append(0.5 * (float(sub[:, 1].min()) + float(sub[:, 1].max())))
    return float(np.median(ys)) if ys else 0.0


def rigid_register_donor(
    raw_xyz: np.ndarray,
    full_canon_xyz: np.ndarray,
    stature_m: float,
) -> tuple[np.ndarray, dict]:
    """Rigidly align raw donor via geometric ankle-to-neurocranium sagittal pitch, stature scale, and Y centering."""
    lo0, hi0 = raw_xyz.min(axis=0), raw_xyz.max(axis=0)
    s0 = stature_m / float(hi0[2] - lo0[2])
    temp0 = raw_xyz * s0 + np.array([-0.5 * float(lo0[0] + hi0[0]) * s0, 0.0, -float(lo0[2]) * s0])

    yc_ank = band_box_mid_y(full_canon_xyz, 0.080, 0.120, 0.35)
    yd_ank0 = band_box_mid_y(temp0, 0.080, 0.120, 0.35)
    yc_sk = band_box_mid_y(full_canon_xyz, 1.900, 1.990, 0.12)
    yd_sk0 = band_box_mid_y(temp0, 1.900, 1.990, 0.12)

    dz_span = 1.945 - 0.100
    ang_c = float(np.arctan2(dz_span, yc_sk - yc_ank))
    ang_d = float(np.arctan2(dz_span, yd_sk0 - yd_ank0))
    theta = float(np.clip(ang_c - ang_d, np.deg2rad(-5.0), np.deg2rad(5.0)))

    ct, st = float(np.cos(theta)), float(np.sin(theta))
    rot = np.array([[1.0, 0.0, 0.0], [0.0, ct, -st], [0.0, st, ct]], dtype=np.float64)
    rot_xyz = raw_xyz @ rot.T
    lo, hi = rot_xyz.min(axis=0), rot_xyz.max(axis=0)
    scale = stature_m / float(hi[2] - lo[2])
    offset_x = -0.5 * float(lo[0] + hi[0]) * scale
    offset_z = -float(lo[2]) * scale
    temp = rot_xyz * scale + np.array([offset_x, 0.0, offset_z])

    yd_ank = band_box_mid_y(temp, 0.080, 0.120, 0.35)
    yd_sk = band_box_mid_y(temp, 1.900, 1.990, 0.12)
    offset_y = 0.5 * ((yc_ank - yd_ank) + (yc_sk - yd_sk))
    offset = np.array([offset_x, offset_y, offset_z], dtype=np.float64)
    registered = rot_xyz * scale + offset
    info = {
        "rotationRowMajor": rot.tolist(),
        "sagittalPitchDegrees": round(float(np.rad2deg(theta)), 4),
        "positiveUniformScale": scale,
        "offsetM": offset.tolist(),
        "rawBoundsM": [lo0.tolist(), hi0.tolist()],
        "registeredBoundsM": [registered.min(axis=0).tolist(), registered.max(axis=0).tolist()],
        "sagittalReferenceBandsM": {
            "ankle": [0.080, 0.120],
            "neurocranium": [1.900, 1.990],
            "canonicalAnkleMidYM": round(yc_ank, 5),
            "donorAnkleMidYM": round(yd_ank + offset_y, 5),
            "canonicalCraniumMidYM": round(yc_sk, 5),
            "donorCraniumMidYM": round(yd_sk + offset_y, 5),
        },
    }
    return registered, info


def build_subdivided_head_for_lod0_seam(
    rest_high: np.ndarray,
    lod0_iface: np.ndarray,
    head_xyz: np.ndarray,
    head_tri: np.ndarray,
    seam_head: np.ndarray,
    head_weights: np.ndarray,
) -> dict:
    """Split headSkin's 46 collar-boundary triangles at LOD0's edge midpoints so LOD0 + headSkin_sub is 100% manifold."""
    seam_set = set(int(v) for v in seam_head.tolist())
    # Map each unique seam_head position to all seam_head indices sharing it (handles UV seam duplicate on headSkin)
    seam_head_pts = head_xyz[seam_head]

    # Identify LOD0 interface vertices that are edge midpoints (> 1mm from any seam_head vertex)
    d_to_head = np.linalg.norm(rest_high[lod0_iface, None, :] - seam_head_pts[None, :, :], axis=2)
    is_midpoint = d_to_head.min(axis=1) > 0.0015
    mid_lod0_verts = lod0_iface[is_midpoint]

    # Find boundary edges on head_tri where both vertices belong to seam_set
    edge_to_mid: dict[tuple[int, int], int] = {}
    new_pts = list(head_xyz)
    new_w = list(head_weights)
    mid_head_to_lod0: list[tuple[int, int, int, int]] = []

    # Collect all seam edges present in head_tri
    seam_edges = []
    for f_i, (a, b, c) in enumerate(head_tri):
        for u, v in ((a, b), (b, c), (c, a)):
            if int(u) in seam_set and int(v) in seam_set:
                seam_edges.append((int(u), int(v)))

    used_edges = set()
    for v0 in mid_lod0_verts:
        p = rest_high[v0]
        best_dist = 1e9
        best_edge = None
        for u, v in seam_edges:
            key = (min(u, v), max(u, v))
            if key in used_edges:
                continue
            pa, pb = head_xyz[u], head_xyz[v]
            ab = pb - pa
            t = float(np.clip(np.dot(p - pa, ab) / max(float(ab @ ab), 1e-12), 0.0, 1.0))
            err = float(np.linalg.norm(p - (pa + t * ab)))
            if err < best_dist:
                best_dist = err
                best_edge = key
        if best_edge is not None and best_dist < 0.005:
            used_edges.add(best_edge)
            m_idx = len(new_pts)
            u, v = best_edge
            new_pts.append(p.copy())
            w_m = 0.5 * (head_weights[u] + head_weights[v])
            w_m /= max(float(w_m.sum()), 1e-12)
            new_w.append(w_m)
            edge_to_mid[best_edge] = m_idx
            mid_head_to_lod0.append((m_idx, int(v0), u, v))

    sub_tri = []
    for a, b, c in head_tri:
        ia, ib, ic = int(a), int(b), int(c)
        e01 = (min(ia, ib), max(ia, ib))
        e12 = (min(ib, ic), max(ib, ic))
        e20 = (min(ic, ia), max(ic, ia))
        if e01 in edge_to_mid:
            m = edge_to_mid[e01]
            sub_tri.append([ia, m, ic])
            sub_tri.append([m, ib, ic])
        elif e12 in edge_to_mid:
            m = edge_to_mid[e12]
            sub_tri.append([ib, m, ia])
            sub_tri.append([m, ic, ia])
        elif e20 in edge_to_mid:
            m = edge_to_mid[e20]
            sub_tri.append([ic, m, ib])
            sub_tri.append([m, ia, ib])
        else:
            sub_tri.append([ia, ib, ic])

    return {
        "subPoints": np.asarray(new_pts, dtype=np.float64),
        "subTriangles": np.asarray(sub_tri, dtype=np.int64),
        "subWeights": np.asarray(new_w, dtype=np.float64),
        "origHeadCount": len(head_xyz),
        "midpoints": mid_head_to_lod0,
    }


def extract_mesh_joint_weights(mesh_entry: dict, n_verts: int, n_joints: int) -> np.ndarray:
    src_idx = np.asarray(mesh_entry["sourceVertexIndices"], dtype=np.int64)
    j_idx = np.asarray(mesh_entry["jointIndices"], dtype=np.int64).reshape(-1, 4)
    j_wgt = np.asarray(mesh_entry["jointWeights"], dtype=np.float64).reshape(-1, 4)
    out = np.zeros((n_verts, n_joints), dtype=np.float64)
    seen = np.zeros(n_verts, dtype=bool)
    for render_row, v_id in enumerate(src_idx):
        if not seen[v_id]:
            for k in range(4):
                if j_wgt[render_row, k] > 0:
                    out[v_id, j_idx[render_row, k]] += j_wgt[render_row, k]
            seen[v_id] = True
    s = out.sum(axis=1, keepdims=True)
    valid = s[:, 0] > 1e-12
    out[valid] /= s[valid]
    return out


def transfer_skin_to_lod0(lod0_xyz: np.ndarray, lod1_xyz: np.ndarray, lod1_tri: np.ndarray, lod1_weights: np.ndarray) -> np.ndarray:
    tree = BVHTree.FromPolygons(lod1_xyz.tolist(), lod1_tri.tolist(), all_triangles=True)
    lod0_weights = np.zeros((len(lod0_xyz), lod1_weights.shape[1]), dtype=np.float64)
    for i, pt in enumerate(lod0_xyz):
        hit, _, face, _ = tree.find_nearest(Vector(pt.tolist()))
        tri_v = lod1_tri[face]
        a, b, c = lod1_xyz[tri_v]
        e0, e1, q = b - a, c - a, np.asarray(hit, dtype=np.float64) - a
        d00, d01, d11 = float(e0 @ e0), float(e0 @ e1), float(e1 @ e1)
        denom = max(d00 * d11 - d01 * d01, 1e-20)
        u = float(np.clip(((q @ e0) * d11 - (q @ e1) * d01) / denom, 0.0, 1.0))
        v = float(np.clip(((q @ e1) * d00 - (q @ e0) * d01) / denom, 0.0, 1.0))
        if u + v > 1.0:
            u, v = u / (u + v), v / (u + v)
        w = (1.0 - u - v) * lod1_weights[tri_v[0]] + u * lod1_weights[tri_v[1]] + v * lod1_weights[tri_v[2]]
        s = float(w.sum())
        lod0_weights[i] = w / s if s > 1e-12 else lod1_weights[tri_v[0]]
    return lod0_weights


def detect_axilla_and_limb_poses(
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    canon_xyz: np.ndarray,
    canon_tri: np.ndarray,
    compiled_family: dict,
    z_shift: float,
) -> dict:
    """Measure axillary bridge height and solve full clavicle/upperarm/lowerarm/hand + thigh/calf/foot pose."""
    z_scan = np.round(np.arange(1.24, 1.585, 0.01), 4)
    donor_three_loop_max_z = 1.35
    canon_three_loop_max_z = 1.54
    trunk_half_widths = []

    for z in z_scan:
        c_l = [c for c in section_loops(canon_xyz, canon_tri, float(z)) if c["w"] > 0.04]
        if len(c_l) >= 3:
            canon_three_loop_max_z = float(z)
        d_l = [c for c in section_loops(donor_xyz, donor_tri, float(z)) if c["w"] > 0.04]
        central = [c for c in d_l if abs(c["center"][0]) < 0.08]
        minus_arm = [c for c in d_l if c["center"][0] < -0.17 and c["w"] < 0.24]
        plus_arm = [c for c in d_l if c["center"][0] > 0.17 and c["w"] < 0.24]
        if central and minus_arm and plus_arm:
            donor_three_loop_max_z = float(z)
            t_c = max(central, key=lambda c: c["n"])
            m_c = max(minus_arm, key=lambda c: c["n"])
            p_c = max(plus_arm, key=lambda c: c["n"])
            trunk_half_widths.append((float(z), 0.5 * t_c["w"], abs(m_c["maxX"]), abs(p_c["minX"])))

    # Leg centroids and exact thigh-merge height from Z = 0.10 up to Z = 1.01m
    leg_centroids = {-1: [], 1: []}
    foot_boxes = {-1: [], 1: []}
    thigh_merged_min_z = 1.01
    canon_thigh_merged_min_z = 1.01
    for z in np.round(np.arange(0.10, 1.015, 0.01), 4):
        c_l = [c for c in section_loops(canon_xyz, canon_tri, float(z)) if c["w"] > 0.045]
        if len(c_l) == 1 and z > 0.70 and c_l[0]["w"] > 0.20:
            canon_thigh_merged_min_z = min(canon_thigh_merged_min_z, float(z))
        d_l = [c for c in section_loops(donor_xyz, donor_tri, float(z)) if c["w"] > 0.045]
        if len(d_l) == 2 and d_l[0]["center"][0] < -0.03 and d_l[1]["center"][0] > 0.03:
            if z <= 0.90:
                leg_centroids[-1].append([d_l[0]["center"][0], d_l[0]["center"][1], float(z)])
                leg_centroids[1].append([d_l[1]["center"][0], d_l[1]["center"][1], float(z)])
        elif len(d_l) == 1 and z > 0.50 and d_l[0]["w"] > 0.22:
            thigh_merged_min_z = min(thigh_merged_min_z, float(z))
            if z <= 0.90:
                c0 = d_l[0]
                leg_centroids[-1].append([0.5 * (c0["minX"] + 0.0), c0["center"][1], float(z)])
                leg_centroids[1].append([0.5 * (0.0 + c0["maxX"]), c0["center"][1], float(z)])

    for z in (0.022, 0.032, 0.045):
        d_l = [c for c in section_loops(donor_xyz, donor_tri, z) if c["w"] > 0.06 and c["depth"] > 0.16]
        minus_f = [c for c in d_l if c["center"][0] < -0.04]
        plus_f = [c for c in d_l if c["center"][0] > 0.04]
        if minus_f:
            foot_boxes[-1].append(max(minus_f, key=lambda c: c["n"]))
        if plus_f:
            foot_boxes[1].append(max(plus_f, key=lambda c: c["n"]))

    landmarks_bl = {
        k: gltf_to_blender(v["position"])[0] + np.array([0.0, 0.0, z_shift])
        for k, v in compiled_family["landmarks"].items()
    }
    joints = {j["id"]: j for j in compiled_family["rig"]["joints"]}

    def joint_seg(j_id: str) -> tuple[np.ndarray, np.ndarray]:
        j = joints[j_id]
        return landmarks_bl[j["headLandmark"]].copy(), landmarks_bl[j["tailLandmark"]].copy()

    def rot_between(u: np.ndarray, v: np.ndarray) -> np.ndarray:
        u_n = u / max(float(np.linalg.norm(u)), 1e-12)
        v_n = v / max(float(np.linalg.norm(v)), 1e-12)
        q = Vector(u_n.tolist()).rotation_difference(Vector(v_n.tolist()))
        return np.array(q.to_matrix(), dtype=np.float64)

    pose_plan = {}
    for sign, side_tag, sfx in ((-1, "minusX", "r"), (1, "plusX", "l")):
        cl_h, sh_r = joint_seg(f"clavicle_{sfx}")
        _, el_r = joint_seg(f"upperarm_{sfx}")
        _, wr_r = joint_seg(f"lowerarm_{sfx}")
        _, ha_r = joint_seg(f"hand_{sfx}")
        l_cl = float(np.linalg.norm(sh_r - cl_h))
        l_up = float(np.linalg.norm(el_r - sh_r))
        l_lo = float(np.linalg.norm(wr_r - el_r))
        l_ha = float(np.linalg.norm(ha_r - wr_r))

        # Continuous top-down tracking from donor_three_loop_max_z down through wrist and palm
        track = []
        prev_xy = None
        for z in np.round(np.arange(donor_three_loop_max_z, 0.96, -0.015), 4):
            lps = [
                c
                for c in section_loops(donor_xyz, donor_tri, float(z))
                if c["center"][0] * sign > 0.17 and 0.038 < c["w"] < 0.24
            ]
            if not lps:
                continue
            if prev_xy is None:
                c = max(lps, key=lambda it: abs(it["center"][0]))
            else:
                c = min(lps, key=lambda it: np.hypot(it["center"][0] - prev_xy[0], it["center"][1] - prev_xy[1]))
                if np.hypot(c["center"][0] - prev_xy[0], c["center"][1] - prev_xy[1]) > 0.045:
                    break
            prev_xy = c["center"][:2]
            track.append([c["center"][0], c["center"][1], float(z), c["w"], c["depth"], c["w"] * c["depth"]])
        tr = np.asarray(track, dtype=np.float64)

        wr_cand = tr[(tr[:, 2] >= 1.03) & (tr[:, 2] <= 1.18)]
        wr_donor = wr_cand[int(np.argmin(wr_cand[:, 5])), :3] if len(wr_cand) else tr[-1, :3]
        # Measure actual 3D centroid of donor proximal palm (Z in [wr_z - 0.075, wr_z - 0.020])
        palm_pts = donor_xyz[
            (donor_xyz[:, 2] >= wr_donor[2] - 0.075)
            & (donor_xyz[:, 2] <= wr_donor[2] - 0.020)
            & (donor_xyz[:, 0] * sign > abs(wr_donor[0]) - 0.06)
        ]
        if len(palm_pts) >= 20:
            palm_donor = np.array(
                [
                    0.5 * float(palm_pts[:, 0].min() + palm_pts[:, 0].max()),
                    0.5 * float(palm_pts[:, 1].min() + palm_pts[:, 1].max()),
                    float(palm_pts[:, 2].mean()),
                ],
                dtype=np.float64,
            )
        else:
            palm_cand = tr[(tr[:, 2] < wr_donor[2] - 0.015) & (tr[:, 2] >= wr_donor[2] - 0.085)]
            palm_donor = palm_cand[-1, :3] if len(palm_cand) else (wr_donor + np.array([0.008 * sign, -0.02, -0.06]))

        # Keep clavicle strictly unrotated (sh_p = sh_r, r_clav = I_3): headSkin/neck vertices carry up to 64% clavicle
        # weight, so depressing the clavicle to chase Meshy arm length inflates rest-pose neck/collar width by +6..8cm!
        sh_p = sh_r.copy()
        r_clav = np.eye(3, dtype=np.float64)

        # Align elbow and wrist proportionally along the measured donor arm centerline so canonical elbow lands on
        # donor elbow and canonical wrist lands on donor wrist (0.0mm station shift, isometric 1.000x radial girth).
        pts_arm = tr[::-1, :3]  # sorted ascending Z
        tot_reach_don = float(np.linalg.norm(wr_donor - sh_p))
        target_d_up = float(np.clip(tot_reach_don * (l_up / (l_up + l_lo)), 0.90 * l_up, 1.12 * l_up))
        d_sh = np.linalg.norm(pts_arm - sh_p[None, :], axis=1)
        el_raw = pts_arm[int(np.argmin(np.abs(d_sh - target_d_up)))].copy()
        for k in range(len(pts_arm) - 1):
            d0, d1 = d_sh[k], d_sh[k + 1]
            if (d0 - target_d_up) * (d1 - target_d_up) <= 0 and abs(d1 - d0) > 1e-6:
                alpha = (target_d_up - d0) / (d1 - d0)
                el_raw = (1.0 - alpha) * pts_arm[k] + alpha * pts_arm[k + 1]
                break
        el_p = sh_p + target_d_up * (el_raw - sh_p) / np.linalg.norm(el_raw - sh_p)
        lo_len_don = float(np.clip(np.linalg.norm(wr_donor - el_p), 0.90 * l_lo, 1.12 * l_lo))
        wr_p = el_p + lo_len_don * (wr_donor - el_p) / np.linalg.norm(wr_donor - el_p)

        s_up_ax = float(np.linalg.norm(el_p - sh_p)) / l_up
        s_lo_ax = float(np.linalg.norm(wr_p - el_p)) / l_lo
        r_up = rot_between(el_r - sh_r, el_p - sh_p)
        r_lo = rot_between(r_up @ (wr_r - el_r), wr_p - el_p) @ r_up
        # Align posed hand bone r_ha smoothly onto the donor's metacarpal knuckle axis (clamped <= 24 deg from forearm r_lo)
        # so canonical carpus & palm/dorsum sit centered inside the donor's hand up to the knuckles!
        vec_forearm_hand = r_lo @ (ha_r - wr_r)
        u_fh = vec_forearm_hand / max(float(np.linalg.norm(vec_forearm_hand)), 1e-12)
        kn_pts = donor_xyz[
            (donor_xyz[:, 2] >= wr_donor[2] - 0.095)
            & (donor_xyz[:, 2] <= wr_donor[2] - 0.045)
            & (donor_xyz[:, 0] * sign > abs(wr_donor[0]) - 0.065)
        ]
        if len(kn_pts) >= 25:
            # Trim radial thumb outlier (minimal Y) by taking central 20..85% Y band for true 4-metacarpal palm center
            y_lo_k, y_hi_k = np.percentile(kn_pts[:, 1], [22, 88])
            kn_core = kn_pts[(kn_pts[:, 1] >= y_lo_k) & (kn_pts[:, 1] <= y_hi_k)]
            kn_ctr = np.median(kn_core if len(kn_core) >= 10 else kn_pts, axis=0)
            u_don_h = kn_ctr - wr_donor
            u_don_len = float(np.linalg.norm(u_don_h))
            if u_don_len > 0.025:
                u_don_h /= u_don_len
                q_diff = Vector(u_fh.tolist()).rotation_difference(Vector(u_don_h.tolist()))
                ax_q, ang_q = q_diff.axis, float(q_diff.angle)
                ang_clamped = min(ang_q, float(np.deg2rad(24.0)))
                from mathutils import Quaternion
                r_swing = np.array(Quaternion(ax_q, ang_clamped).to_matrix(), dtype=np.float64)
                r_ha = r_swing @ r_lo
            else:
                r_ha = r_lo.copy()
        else:
            r_ha = r_lo.copy()
        ha_p = wr_p + r_ha @ (ha_r - wr_r)

        # Leg chain: hip -> knee -> ankle -> horizontal foot
        hip_r, kn_r = joint_seg(f"thigh_{sfx}")
        _, an_r = joint_seg(f"calf_{sfx}")
        _, ba_r = joint_seg(f"foot_{sfx}")
        l_th = float(np.linalg.norm(kn_r - hip_r))
        l_ca = float(np.linalg.norm(an_r - kn_r))
        l_ft = float(np.linalg.norm(ba_r - an_r))

        pts_leg = np.array(sorted(leg_centroids[sign], key=lambda r: r[2]), dtype=np.float64)
        if len(pts_leg) >= 4:
            kn_raw = pts_leg[int(np.argmin(np.abs(pts_leg[:, 2] - kn_r[2])))]
            kn_p = hip_r + l_th * (kn_raw - hip_r) / np.linalg.norm(kn_raw - hip_r)
            an_raw = pts_leg[int(np.argmin(np.abs(pts_leg[:, 2] - 0.115)))]
            an_p = kn_p + l_ca * (an_raw - kn_p) / np.linalg.norm(an_raw - kn_p)
        else:
            kn_p, an_p = kn_r.copy(), an_r.copy()

        r_th = rot_between(kn_r - hip_r, kn_p - hip_r)
        r_ca = rot_between(r_th @ (an_r - kn_r), an_p - kn_p) @ r_th

        # Keep foot sole strictly horizontal (pure Z-yaw around ankle to match donor forefoot X center)
        rest_ft_vec = ba_r - an_r
        if foot_boxes[sign]:
            fc = foot_boxes[sign][0]
            # Forefoot center X vs ankle X gives gentle horizontal toe-out yaw
            dx_don = float(fc["center"][0] - an_p[0])
            dy_don = float((fc["minY"] + 0.32 * fc["depth"]) - an_p[1])
            yaw_rest = float(np.arctan2(rest_ft_vec[0], rest_ft_vec[1]))
            yaw_don = float(np.arctan2(dx_don, dy_don))
            d_yaw = float(np.clip(yaw_don - yaw_rest, np.deg2rad(-12.0), np.deg2rad(12.0)))
        else:
            d_yaw = 0.0
        cy_f, sy_f = float(np.cos(d_yaw)), float(np.sin(d_yaw))
        r_ft = np.array([[cy_f, -sy_f, 0.0], [sy_f, cy_f, 0.0], [0.0, 0.0, 1.0]], dtype=np.float64)
        # Preserve exact Z height of an_r on foot pivot so plantar sole stays at Z = 0.000m!
        an_foot_pivot = np.array([an_p[0], an_p[1], an_r[2]], dtype=np.float64)
        ba_p = an_foot_pivot + r_ft @ rest_ft_vec

        pose_plan[side_tag] = {
            "jointSuffix": sfx,
            "sign": sign,
            "clavicle": {
                "rest": [cl_h.tolist(), sh_r.tolist()],
                "posed": [cl_h.tolist(), sh_p.tolist()],
                "rotationRowMajor": r_clav.tolist(),
            },
            "arm": {
                "rest": [sh_r.tolist(), el_r.tolist(), wr_r.tolist(), ha_r.tolist()],
                "posed": [sh_p.tolist(), el_p.tolist(), wr_p.tolist(), ha_p.tolist()],
                "donorWristM": wr_donor.tolist(),
                "upperAxialScale": round(s_up_ax, 6),
                "lowerAxialScale": round(s_lo_ax, 6),
                "upperRotationRowMajor": r_up.tolist(),
                "lowerWorldRotationRowMajor": r_lo.tolist(),
                "handWorldRotationRowMajor": r_ha.tolist(),
            },
            "leg": {
                "rest": [hip_r.tolist(), kn_r.tolist(), an_r.tolist(), ba_r.tolist()],
                "posed": [hip_r.tolist(), kn_p.tolist(), an_p.tolist(), ba_p.tolist()],
                "footPivotPosedM": an_foot_pivot.tolist(),
                "thighRotationRowMajor": r_th.tolist(),
                "calfWorldRotationRowMajor": r_ca.tolist(),
                "footWorldRotationRowMajor": r_ft.tolist(),
            },
        }

    saddle_x = (
        float(np.median([0.5 * (row[1] + 0.5 * (row[2] + row[3])) for row in trunk_half_widths[-4:]]))
        if trunk_half_widths
        else 0.195
    )
    return {
        "donorLastSeparateArmTrunkZ": donor_three_loop_max_z,
        "canonicalLastSeparateArmTrunkZ": canon_three_loop_max_z,
        "axillaBridgeHeightGapM": round(canon_three_loop_max_z - donor_three_loop_max_z, 4),
        "axillaSaddleAbsXM": round(saddle_x, 4),
        "donorThighMergedMinZM": round(thigh_merged_min_z, 4),
        "canonicalThighMergedMinZM": round(canon_thigh_merged_min_z, 4),
        "sides": pose_plan,
    }


def evaluate_exact_dqs_operator(
    xyz: np.ndarray,
    triangles: np.ndarray,
    joint_names: list[str],
    weights: np.ndarray,
    pose_info: dict,
) -> tuple[np.ndarray, np.ndarray]:
    """Evaluate Blender DQS Armature at rest and +0.01*e_k to obtain exact X_posed_0 and exact 3x3 Jacobian J_v."""
    n_verts = len(xyz)
    chain_specs = []
    chain_weights = []
    used = np.zeros(n_verts, dtype=np.float64)
    j_idx = {name: idx for idx, name in enumerate(joint_names)}

    def mat4_from_rot_pts(
        r3: np.ndarray, src_origin: np.ndarray, dst_origin: np.ndarray, src_tail: np.ndarray | None = None, s_ax: float = 1.0
    ) -> Matrix:
        if src_tail is not None and abs(s_ax - 1.0) > 1e-6:
            u_b = src_tail - src_origin
            u_b = u_b / max(float(np.linalg.norm(u_b)), 1e-12)
            r_eff = r3 @ (np.eye(3, dtype=np.float64) + (s_ax - 1.0) * np.outer(u_b, u_b))
        else:
            r_eff = r3
        m = Matrix(r_eff.tolist()).to_4x4()
        m.translation = Vector(dst_origin.tolist()) - Matrix(r_eff.tolist()) @ Vector(src_origin.tolist())
        return m

    for _, spec in pose_info["sides"].items():
        sfx = spec["jointSuffix"]
        cl_h, sh_r = [np.array(p, dtype=np.float64) for p in spec["clavicle"]["rest"]]
        _, sh_p = [np.array(p, dtype=np.float64) for p in spec["clavicle"]["posed"]]
        r_cl = np.array(spec["clavicle"]["rotationRowMajor"], dtype=np.float64)

        _, el_r, wr_r, ha_r = [np.array(p, dtype=np.float64) for p in spec["arm"]["rest"]]
        _, el_p, wr_p, ha_p = [np.array(p, dtype=np.float64) for p in spec["arm"]["posed"]]
        s_up_ax = float(spec["arm"].get("upperAxialScale", 1.0))
        s_lo_ax = float(spec["arm"].get("lowerAxialScale", 1.0))
        r_up = np.array(spec["arm"]["upperRotationRowMajor"], dtype=np.float64)
        r_lo = np.array(spec["arm"]["lowerWorldRotationRowMajor"], dtype=np.float64)
        r_ha = np.array(spec["arm"]["handWorldRotationRowMajor"], dtype=np.float64)

        hip_r, kn_r, an_r, ba_r = [np.array(p, dtype=np.float64) for p in spec["leg"]["rest"]]
        hip_p, kn_p, an_p, ba_p = [np.array(p, dtype=np.float64) for p in spec["leg"]["posed"]]
        an_fp = np.array(spec["leg"]["footPivotPosedM"], dtype=np.float64)
        r_th = np.array(spec["leg"]["thighRotationRowMajor"], dtype=np.float64)
        r_ca = np.array(spec["leg"]["calfWorldRotationRowMajor"], dtype=np.float64)
        r_ft = np.array(spec["leg"]["footWorldRotationRowMajor"], dtype=np.float64)

        w_cl = weights[:, j_idx[f"clavicle_{sfx}"]]
        w_up = weights[:, j_idx[f"upperarm_{sfx}"]] + weights[:, j_idx[f"upperarm_pressure_{sfx}"]]
        w_lo = weights[:, j_idx[f"lowerarm_{sfx}"]]
        w_ha = weights[:, j_idx[f"hand_{sfx}"]]
        w_th = weights[:, j_idx[f"thigh_{sfx}"]]
        w_ca = weights[:, j_idx[f"calf_{sfx}"]]
        w_ft = weights[:, j_idx[f"foot_{sfx}"]] + weights[:, j_idx[f"ball_{sfx}"]]

        chain_specs.extend(
            [
                (f"cl_{sfx}", cl_h, sh_r, mat4_from_rot_pts(r_cl, cl_h, cl_h)),
                (f"up_{sfx}", sh_r, el_r, mat4_from_rot_pts(r_up, sh_r, sh_p, el_r, s_up_ax)),
                (f"lo_{sfx}", el_r, wr_r, mat4_from_rot_pts(r_lo, el_r, el_p, wr_r, s_lo_ax)),
                (f"ha_{sfx}", wr_r, ha_r, mat4_from_rot_pts(r_ha, wr_r, wr_p)),
                (f"th_{sfx}", hip_r, kn_r, mat4_from_rot_pts(r_th, hip_r, hip_p)),
                (f"ca_{sfx}", kn_r, an_r, mat4_from_rot_pts(r_ca, kn_r, kn_p)),
                (f"ft_{sfx}", an_r, ba_r, mat4_from_rot_pts(r_ft, an_r, an_fp)),
            ]
        )
        chain_weights.extend([w_cl, w_up, w_lo, w_ha, w_th, w_ca, w_ft])
        used += w_cl + w_up + w_lo + w_ha + w_th + w_ca + w_ft

    w_neutral = np.maximum(1.0 - used, 0.0)
    chain_specs.append(("neutral", np.array([0.0, 0.0, 0.0]), np.array([0.0, 0.0, 1.0]), Matrix.Identity(4)))
    chain_weights.append(w_neutral)
    W = np.column_stack(chain_weights)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-12)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    mesh = bpy.data.meshes.new("CanonPose")
    mesh.from_pydata(xyz.tolist(), [], triangles.tolist())
    obj = bpy.data.objects.new("CanonPose", mesh)
    bpy.context.collection.objects.link(obj)

    arm = bpy.data.armatures.new("CanonRig")
    arm_obj = bpy.data.objects.new("CanonRig", arm)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for b_name, head, tail, _ in chain_specs:
        eb = arm.edit_bones.new(b_name)
        eb.head = Vector(head.tolist())
        eb.tail = Vector(tail.tolist())
    bpy.ops.object.mode_set(mode="OBJECT")
    for b_name, _, _, world_xform in chain_specs:
        pb = arm_obj.pose.bones[b_name]
        pb.matrix = world_xform @ pb.bone.matrix_local

    for col_idx, (b_name, _, _, _) in enumerate(chain_specs):
        vg = obj.vertex_groups.new(name=b_name)
        quant = np.round(W[:, col_idx] * 100_000).astype(np.int64)
        for qval in np.unique(quant):
            if qval > 0:
                vg.add(np.flatnonzero(quant == qval).tolist(), float(qval / 100_000.0), "REPLACE")

    mod = obj.modifiers.new("Arm", "ARMATURE")
    mod.object = arm_obj
    mod.use_deform_preserve_volume = True

    def eval_for(pts_in: np.ndarray) -> np.ndarray:
        mesh.vertices.foreach_set("co", pts_in.astype(np.float32).reshape(-1))
        mesh.update()
        bpy.context.view_layer.update()
        ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
        out = np.empty(n_verts * 3, dtype=np.float32)
        ev.vertices.foreach_get("co", out)
        return out.reshape(-1, 3).astype(np.float64)

    posed_0 = eval_for(xyz)
    eps = 0.02
    jac = np.empty((n_verts, 3, 3), dtype=np.float64)
    for k in range(3):
        pert = xyz.copy()
        pert[:, k] += eps
        jac[:, :, k] = (eval_for(pert) - posed_0) / eps
    return posed_0, jac


def build_topological_parts_and_masks(
    rest_all: np.ndarray,
    posed_all_0: np.ndarray,
    all_tri: np.ndarray,
    n_body_verts: int,
    orig_head_count: int,
    joint_names: list[str],
    all_weights: np.ndarray,
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    donor_rgb: np.ndarray,
    pose_info: dict,
    compiled_family: dict,
    landmarks_bl: dict[str, np.ndarray],
) -> dict:
    """Partition donor and canonical meshes topologically into 5 anatomical parts with minimal true exclusions."""
    z_bridge = float(pose_info["donorLastSeparateArmTrunkZ"])
    saddle_x = float(pose_info["axillaSaddleAbsXM"])
    thigh_merged_z = float(pose_info["donorThighMergedMinZM"])

    # --- 1. Donor connected-component flood-fill of freestanding arms below z_bridge + 0.005 ---
    _, d_weld = np.unique(np.round(donor_xyz, 5), axis=0, return_inverse=True)
    d_wtri = d_weld[donor_tri]
    tc = donor_xyz[donor_tri].mean(axis=1)
    cx, cy, cz = tc.T

    # Guard against arm flood-fill crossing inward into the central torso (and if a wide build has `saddle_x > 0.165m` where an
    # axillary bridge leaks across `|X| < 0.12m`, tighten the barrier to `saddle_x + 0.008m` while leaving non-leaking builds 100% unchanged):
    def _flood_free_arms(
        z_pad: float,
        x_barrier: float,
        seed_x_min: float = 0.28,
        seed_z_hi: float | None = None,
        guard_wide_hip: bool = False,
    ) -> np.ndarray:
        cond = (cz < z_bridge + 0.005) & ~((cz >= z_bridge - z_pad) & (np.abs(cx) <= x_barrier))
        if guard_wide_hip:
            cond &= ~((cz < 1.10) & (np.abs(cx) < 0.315))
        pool = np.flatnonzero(cond)
        vf: dict[int, list[int]] = {}
        for fi in pool:
            for v in d_wtri[fi]:
                vf.setdefault(int(v), []).append(int(fi))
        out_side = np.zeros(len(donor_tri), dtype=np.int64)
        z_hi_s = (z_bridge - 0.01) if seed_z_hi is None else seed_z_hi
        for sgn_f in (1, -1):
            sds = np.flatnonzero((cz >= 1.10) & (cz <= z_hi_s) & (cx * sgn_f > seed_x_min))
            sn = set(sds.tolist())
            stk = sds.tolist()
            while stk:
                cur_f = stk.pop()
                for v in d_wtri[cur_f]:
                    for nb in vf.get(int(v), ()):
                        if nb not in sn:
                            sn.add(nb)
                            stk.append(nb)
            if sn:
                out_side[np.array(sorted(sn), dtype=np.int64)] = sgn_f
        return out_side

    free_arm_side = _flood_free_arms(0.015, 0.165)
    if np.any((free_arm_side != 0) & (np.abs(cx) < 0.12)):
        free_arm_side = _flood_free_arms(0.018, saddle_x + 0.008)
    # Guard wide-flank builds (e.g. `M000-F100`, where lower love-handles exceed `|X| = 0.28m` and leak across the midline)
    # without altering wide-lat `F = 0` or moderate-full builds whose arms never cross the sagittal plane:
    if np.any((free_arm_side == 1) & (cx < 0.05)) or np.any((free_arm_side == -1) & (cx > -0.05)):
        free_arm_side = _flood_free_arms(
            0.022,
            saddle_x + 0.008,
            seed_x_min=max(0.34, saddle_x + 0.085),
            seed_z_hi=min(1.24, z_bridge - 0.02),
            guard_wide_hip=True,
        )

    # --- 2. Donor eligibility: exclude ONLY upper face/cranium, distal fingers, sole/toes, fused axilla bridge, and bridged midline clefts ---
    tri_rgb = donor_rgb[donor_tri].mean(axis=1)
    red, _, blue = tri_rgb.T
    luma = tri_rgb.mean(axis=1)
    warmth = (red - blue) / np.maximum(red, 0.01)
    pelvic_cloth_zone = (free_arm_side == 0) & (np.abs(cx) < 0.295) & (cz >= 0.84) & (cz <= 1.24)
    linen_raw = pelvic_cloth_zone & (warmth < 0.22) & (luma > 0.62)

    # Continuous skintight cloth-thickness offset (0.0mm on skin -> 1.2mm on bright linen) with ZERO hem holes!
    cloth_w = (
        smoothstep((luma - 0.58) / 0.22)
        * (1.0 - smoothstep((warmth - 0.15) / 0.08))
        * pelvic_cloth_zone.astype(np.float64)
    )
    donor_cloth_offset_m = 0.0012 * cloth_w
    linen_rim_rings = np.zeros(len(donor_tri), dtype=bool)

    canon_thigh_merged_z = float(pose_info.get("canonicalThighMergedMinZM", 1.00))

    d_v = donor_xyz[donor_tri]
    d_area = np.cross(d_v[:, 1] - d_v[:, 0], d_v[:, 2] - d_v[:, 0])
    d_len = np.linalg.norm(d_area, axis=1)
    d_nrm = d_area / np.maximum(d_len[:, None], 1e-12)

    # Purely geometric midline bridge exclusions: exclude ONLY true midline fusion-web triangles that actually cross |X| <= 2.2mm
    # or face steeply downward (-Z) inside the crotch saddle, keeping 100% of separated medial inner-thigh faces intact!
    is_low_crotch_don = thigh_merged_z < 0.888
    bridge_cap_z = max(thigh_merged_z + 0.010, 0.900 if is_low_crotch_don else 0.916)
    crotch_web_z_min = max(thigh_merged_z - 0.018, 0.862 if is_low_crotch_don else 0.880)
    z_crotch_raw_est = max(thigh_merged_z + 0.006, 0.886 if is_low_crotch_don else 0.900)
    tri_crosses_mid = (d_v[:, :, 0].min(axis=1) <= 0.0022) & (d_v[:, :, 0].max(axis=1) >= -0.0022)
    groin_pouch_donor = (
        (free_arm_side == 0)
        & (cz >= crotch_web_z_min)
        & (cz <= bridge_cap_z)
        & (cy > -0.125)
        & (cy < 0.024)
        & (
            (tri_crosses_mid & (cz <= z_crotch_raw_est))
            | ((np.abs(cx) < 0.010) & (d_nrm[:, 2] < -0.52))
        )
    )
    glute_cleft_donor = np.zeros(len(donor_tri), dtype=bool)
    linen_excluded = groin_pouch_donor
    linen_skintight_kept = linen_raw & (~linen_excluded)

    # Exact anterior/posterior axillary groove x_split(cy) anchored to measured donor axillaSaddleAbsXM (saddle_x):
    # - Anterior chest/bicep crease sits at saddle_x + 2mm (~0.236m on M050-F100);
    # - Posterior lateral back-fold ends cleanly at saddle_x - 4mm (~0.230m) before the posterior triceps (~0.238m),
    #   keeping 100% of the lateral chest & first back fold in trunk_neck with ZERO triceps bleed and ZERO lateral crush!
    z_ax_grid = np.linspace(1.320, 1.580, 27)
    x_groove_grid = np.full_like(z_ax_grid, saddle_x)
    w_post_cy = smoothstep((cy - 0.005) / 0.035)
    x_split_f = saddle_x - 0.004 * w_post_cy + 0.002 * (1.0 - w_post_cy)

    # Measure the donor's anterior axillary fold & central fused bridge height so fuller armpits sit naturally (~1.500m, never pinched at 1.55m)
    m_ax_ant = (
        (d_len > 1e-10)
        & (np.abs(np.abs(cx) - saddle_x) <= 0.026)
        & (cy >= -0.145)
        & (cy <= -0.040)
        & (cz >= 1.430)
        & (cz <= 1.525)
        & (d_nrm[:, 2] < -0.22)
    )
    m_ax_bridge = (
        (d_len > 1e-10)
        & (np.abs(np.abs(cx) - saddle_x) <= 0.026)
        & (cy >= -0.036)
        & (cy <= 0.050)
        & (cz >= 1.415)
        & (cz <= 1.545)
        & (d_nrm[:, 2] < -0.25)
    )
    ax_gap = float(pose_info.get("axillaBridgeHeightGapM", 0.0))
    z_ax_ant = float(np.median(cz[m_ax_ant])) if int(np.sum(m_ax_ant)) >= 8 else (1.502 if ax_gap > 0.08 else 1.536)
    z_ax_br_hi = float(np.percentile(cz[m_ax_bridge], 80)) if int(np.sum(m_ax_bridge)) >= 8 else z_ax_ant
    z_ax_br_lo = float(np.percentile(cz[m_ax_bridge], 10)) if int(np.sum(m_ax_bridge)) >= 8 else 1.445
    z_ax_raw_tgt = 0.65 * z_ax_ant + 0.35 * min(z_ax_br_hi + 0.012, z_ax_ant + 0.008)
    if ax_gap > 0.08:
        z_ax_dome_tgt = float(np.clip(min(z_ax_raw_tgt, 1.504), 1.494, 1.508))
    else:
        z_ax_dome_tgt = float(np.clip(z_ax_raw_tgt, 1.496, 1.542))

    # Cut ONLY the downward-facing central axillary fusion bridge along saddle_x (preserves 100% of upper deltopectoral, lateral chest, back fold, bicep & tricep!)
    axilla_box = (
        (np.abs(np.abs(cx) - saddle_x) <= 0.025)
        & (cz >= min(z_ax_br_lo - 0.008, 1.435))
        & (cz <= 1.548)
        & (cy > -0.036)
        & (cy < 0.050)
        & (np.abs(d_nrm[:, 1]) < 0.44)
    )
    bridged_axilla = axilla_box & (d_nrm[:, 2] < -0.25)
    bridged_thigh = groin_pouch_donor

    # Keep 100% of Donor's true full-scale head, cranium, temples, cheekbones, brow, mid-cheeks, jowls, double-chin, neck & occiput!
    # Exclude ONLY Meshy's fused eyeball/eyelid slits, nostril plugs, lip-slit groove, and fused ear-cartilage blobs
    # (so canonical eyelids/nostrils/lips keep crisp local opening geometry and canonical ears ride cleanly on the widened skull!),
    # and keep 100% of the heel/ankle/foot walls down to Z >= 3.5mm (excluding only bottom-flat plantar faces & distal toe webbing)!
    n_du_pre = int(d_weld.max()) + 1
    du_pre = np.zeros((n_du_pre, 3), dtype=np.float64)
    du_pre[d_weld] = donor_xyz
    du_skull_aligned, skull_align_info = align_donor_head_to_canonical_skull(du_pre, rest_all, n_body_verts)
    donor_skull_xyz = du_skull_aligned[d_weld]
    sc_tri = donor_skull_xyz[donor_tri].mean(axis=1)
    scx, scy, scz = sc_tri.T

    don_ear_blob = (np.abs(scx) >= 0.085) & (scy >= -0.028) & (scy <= 0.048) & (scz >= 1.860) & (scz <= 1.948)
    don_eye_slit = (np.abs(scx) >= 0.015) & (np.abs(scx) <= 0.052) & (scy <= -0.092) & (scz >= 1.903) & (scz <= 1.929)
    don_nostril_plug = (np.abs(scx) <= 0.022) & (scy <= -0.115) & (scz >= 1.860) & (scz <= 1.877) & (d_nrm[:, 2] < -0.32)
    don_lip_slit = (np.abs(scx) <= 0.032) & (scy <= -0.112) & (scz >= 1.843) & (scz <= 1.855)
    donor_upper_head = don_ear_blob | don_eye_slit | don_nostril_plug | don_lip_slit
    donor_sole_or_toes = ((cz < 0.0035) & (d_nrm[:, 2] < -0.70)) | ((cz < 0.052) & (cy < -0.140))

    donor_distal_fingers = np.zeros(len(donor_tri), dtype=bool)
    for _, spec in pose_info["sides"].items():
        sgn = spec["sign"]
        _, _, wr_p, ha_p = [np.array(p, dtype=np.float64) for p in spec["arm"]["posed"]]
        l_palm_p = max(float(np.linalg.norm(ha_p - wr_p)), 0.075)
        h_ax = (ha_p - wr_p) / l_palm_p
        s_palm = (tc - wr_p[None, :]) @ h_ax
        # Keep wrist, carpus & metacarpal palm/dorsum up to the knuckles (0.94 * l_palm_p ~ 86mm),
        # excluding distal fingers and fused sideways thumb-web crevice triangles!
        thumb_web_crevice = (s_palm > 0.48 * l_palm_p) & (cy < wr_p[1] - 0.022) & (np.abs(d_nrm[:, 1]) > 0.72)
        donor_distal_fingers |= (free_arm_side == sgn) & ((s_palm > 0.94 * l_palm_p) | thumb_web_crevice)

    raw_eligible = (
        (d_len > 1e-10)
        & (~linen_excluded)
        & (~bridged_axilla)
        & (~bridged_thigh)
        & (~donor_upper_head)
        & (~donor_sole_or_toes)
        & (~donor_distal_fingers)
    )
    # Trim 1-ring around hard cut rims (for leg separation & metric eligibility); keep trunk_eligible watertight across the crotch saddle!
    trunk_hard_cut_faces = (
        bridged_axilla | donor_upper_head | donor_sole_or_toes | donor_distal_fingers
    ) & (d_len > 1e-10)
    trunk_rim_v = np.unique(d_wtri[trunk_hard_cut_faces])
    trunk_raw_eligible = (d_len > 1e-10) & (~trunk_hard_cut_faces)
    trunk_eligible = trunk_raw_eligible & ~(np.isin(d_wtri, trunk_rim_v).any(axis=1) & trunk_raw_eligible)

    hard_cut_faces = (
        groin_pouch_donor | bridged_axilla | bridged_thigh | donor_upper_head | donor_sole_or_toes | donor_distal_fingers
    ) & (d_len > 1e-10)
    rim_v = np.unique(d_wtri[hard_cut_faces])
    cut_rim = np.isin(d_wtri, rim_v).any(axis=1) & raw_eligible
    donor_eligible = raw_eligible & (~cut_rim)

    # Construct continuous hole-free bare-skin solver surface (bare_donor_xyz):
    # 1) Bake skintight linen cloth-thickness offset + central brief-pouch moderation onto welded donor vertices;
    # 2) Lift any Meshy inner-thigh fusion web smoothly onto the bare anatomical perineal saddle (Z ~ 0.908..0.916m) so trunk_neck is 100% watertight;
    # 3) Sculpt a smooth C2 anatomical intergluteal crease along X=0 on the closed posterior buttocks (zero hole-rim artifacts!);
    # 4) Fair waistband & leg-hem seams via volume-preserving Taubin while keeping the anterior suprapubic fold crisp under the belly!
    n_du = int(d_weld.max()) + 1
    valid_df = np.flatnonzero(~trunk_hard_cut_faces & (d_len > 1e-10))
    valid_wtri = d_wtri[valid_df]
    valid_flat = valid_wtri.ravel()
    deg_du = np.maximum(np.bincount(valid_flat, minlength=n_du), 1)

    d_u_pos = du_skull_aligned.copy()
    d_vnrm_u = np.column_stack(
        [np.bincount(valid_flat, weights=np.repeat(d_area[valid_df, c], 3), minlength=n_du) for c in range(3)]
    )
    d_vnrm_u /= np.maximum(np.linalg.norm(d_vnrm_u, axis=1, keepdims=True), 1e-12)

    cloth_w_u = np.bincount(valid_flat, weights=np.repeat(cloth_w[valid_df], 3), minlength=n_du) / deg_du
    pouch_allow_u = (
        0.0085
        * (1.0 - smoothstep((np.abs(d_u_pos[:, 0]) - 0.026) / 0.032))
        * smoothstep((d_u_pos[:, 2] - 0.880) / 0.026)
        * (1.0 - smoothstep((d_u_pos[:, 2] - 0.992) / 0.030))
        * smoothstep((-d_u_pos[:, 1] - 0.110) / 0.038)
        * np.clip(cloth_w_u, 0.0, 1.0)
    )
    d_u_pos = d_u_pos - (0.0012 * cloth_w_u + pouch_allow_u)[:, None] * d_vnrm_u

    # Smoothly lift any Meshy inner-thigh fusion web below the crotch arch onto a watertight downward-facing bare perineal saddle
    # aligned to the donor's own measured midline perineal floor (z_sad_base ~ 0.900m) so it NEVER shoves a shelf into the rear cleft!
    don_perin_z_lo = 0.855 if thigh_merged_z < 0.888 else 0.880
    don_perin_m = (
        (np.abs(d_u_pos[:, 0]) < 0.014)
        & (d_u_pos[:, 1] >= -0.145)
        & (d_u_pos[:, 1] <= 0.055)
        & (d_u_pos[:, 2] >= don_perin_z_lo)
        & (d_u_pos[:, 2] <= 0.955)
    )
    z_crotch_don = (
        float(np.median(d_u_pos[don_perin_m, 2]))
        if np.sum(don_perin_m) >= 12
        else max(thigh_merged_z - 0.008, 0.900)
    )
    z_sad_clip_lo = 0.870 if thigh_merged_z < 0.888 else 0.896
    z_sad_base = float(np.clip(z_crotch_don - 0.002, z_sad_clip_lo, 0.916))
    if thigh_merged_z < canon_thigh_merged_z - 0.008:
        wx_sad = 1.0 - smoothstep((np.abs(d_u_pos[:, 0]) - 0.024) / 0.016)
        wy_sad = smoothstep((d_u_pos[:, 1] + 0.172) / 0.030) * (1.0 - smoothstep((d_u_pos[:, 1] - 0.062) / 0.028))
        z_sad_floor_in = max(thigh_merged_z - 0.032, 0.876 if is_low_crotch_don else 0.886)
        wz_sad = smoothstep((d_u_pos[:, 2] - z_sad_floor_in) / 0.010) * (1.0 - smoothstep((d_u_pos[:, 2] - (z_sad_base + 0.014)) / 0.016))
        w_lift_sad = wx_sad * wy_sad * wz_sad
        z_sad_tgt = (z_sad_base + 0.0028) + 0.0028 * ((np.abs(d_u_pos[:, 0]) / 0.026) ** 2)
        d_u_pos[:, 2] = np.where(
            d_u_pos[:, 2] < z_sad_tgt,
            (1.0 - w_lift_sad) * d_u_pos[:, 2] + w_lift_sad * z_sad_tgt,
            d_u_pos[:, 2],
        )

        # Eliminate recessed Meshy rear-crotch brief wedgie above the perineal arch while keeping X=0 gently concave inside inner cheeks!
        z_rc_grid = np.linspace(0.892, 0.975, 18)
        y_rc_cheek = np.zeros_like(z_rc_grid)
        for zi, zv in enumerate(z_rc_grid):
            m_chk = (
                (np.abs(d_u_pos[:, 2] - zv) < 0.010)
                & (np.abs(d_u_pos[:, 0]) >= 0.028)
                & (np.abs(d_u_pos[:, 0]) <= 0.052)
                & (d_u_pos[:, 1] > 0.045)
            )
            y_rc_cheek[zi] = float(np.percentile(d_u_pos[m_chk, 1], 70)) if np.any(m_chk) else (0.110 + 0.74 * max(zv - 0.892, 0.0))
        y_cheek_u = np.interp(np.clip(d_u_pos[:, 2], z_rc_grid[0], z_rc_grid[-1]), z_rc_grid, y_rc_cheek)
        cleft_allow = 0.0080 * (1.0 - np.clip(np.abs(d_u_pos[:, 0]) / 0.042, 0.0, 1.0) ** 2)
        y_rc_floor = y_cheek_u - cleft_allow
        rear_crotch_fill_w = (
            (1.0 - smoothstep((np.abs(d_u_pos[:, 0]) - 0.036) / 0.016))
            * smoothstep((d_u_pos[:, 2] - (z_sad_base - 0.006)) / 0.018)
            * (1.0 - smoothstep((d_u_pos[:, 2] - 0.960) / 0.018))
            * smoothstep((d_u_pos[:, 1] - 0.015) / 0.020)
        )
        need_rc = d_u_pos[:, 1] < y_rc_floor
        d_u_pos[need_rc, 1] = (
            (1.0 - rear_crotch_fill_w[need_rc]) * d_u_pos[need_rc, 1] + rear_crotch_fill_w[need_rc] * y_rc_floor[need_rc]
        )

        # Fair the unified perineal-to-subgluteal & anterior-crotch saddle into a smooth C2 arch
        sad_arch_fair_w = (
            (1.0 - smoothstep((np.abs(d_u_pos[:, 0]) - 0.044) / 0.020))
            * smoothstep((d_u_pos[:, 2] - (z_sad_base - 0.014)) / 0.016)
            * (1.0 - smoothstep((d_u_pos[:, 2] - (z_sad_base + 0.056)) / 0.022))
            * smoothstep((d_u_pos[:, 1] + 0.170) / 0.028)
            * (1.0 - smoothstep((d_u_pos[:, 1] - 0.150) / 0.028))
        )
        for _ in range(20):
            fc_sa = d_u_pos[valid_wtri].mean(axis=1)
            nbr_sa = np.column_stack(
                [np.bincount(valid_flat, weights=np.repeat(fc_sa[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
            )
            d_u_pos = d_u_pos + (0.52 * sad_arch_fair_w)[:, None] * (nbr_sa - d_u_pos)

    has_linen_u = np.zeros(n_du, dtype=bool)
    has_skin_u = np.zeros(n_du, dtype=bool)
    has_linen_u[d_wtri[(~trunk_hard_cut_faces) & linen_raw].ravel()] = True
    has_skin_u[d_wtri[(~trunk_hard_cut_faces) & (~linen_raw)].ravel()] = True
    seam_seed_u = (has_linen_u & has_skin_u).astype(np.float64)
    seam_band_u = seam_seed_u.copy()
    for _ in range(16):
        f_seam = seam_band_u[valid_wtri].max(axis=1)
        seam_band_u = np.maximum(
            seam_band_u,
            0.91 * (np.bincount(valid_flat, weights=np.repeat(f_seam, 3), minlength=n_du) / deg_du),
        )
    seam_wide_u = seam_seed_u.copy()
    for _ in range(42):
        f_sw = seam_wide_u[valid_wtri].max(axis=1)
        seam_wide_u = np.maximum(
            seam_wide_u,
            0.955 * (np.bincount(valid_flat, weights=np.repeat(f_sw, 3), minlength=n_du) / deg_du),
        )
    sub_belly_fold_u = (
        smoothstep((-d_u_pos[:, 1] - 0.185) / 0.032)
        * (1.0 - smoothstep((np.abs(d_u_pos[:, 0]) - 0.115) / 0.035))
        * smoothstep((d_u_pos[:, 2] - 1.004) / 0.014)
        * (1.0 - smoothstep((d_u_pos[:, 2] - 1.032) / 0.014))
    )
    # Remove only thin elastic waistband thickness strictly at the crease root (Z ~ 1.015m), NEVER chopping Z=1.04..1.08m belly apron!
    d_u_pos[:, 1] += 0.0018 * np.clip(cloth_w_u, 0.0, 1.0) * sub_belly_fold_u
    subglute_fold_u = (
        smoothstep((d_u_pos[:, 1] - 0.082) / 0.026)
        * (1.0 - smoothstep((d_u_pos[:, 2] - 0.918) / 0.018))
        * smoothstep((np.abs(d_u_pos[:, 0]) - 0.035) / 0.025)
    )
    # Bridge any inward brief-waistband elastic indentation along the posterior sacrum/upper-glutes & lateral hips (Z in 1.032..1.220)
    waistband_groove_w = (
        seam_band_u
        * smoothstep((d_u_pos[:, 2] - 1.032) / 0.025)
        * (1.0 - smoothstep((d_u_pos[:, 2] - 1.220) / 0.025))
        * (1.0 - 0.95 * sub_belly_fold_u)
    )
    for _ in range(14):
        fc_wb = d_u_pos[valid_wtri].mean(axis=1)
        nbr_wb = np.column_stack(
            [np.bincount(valid_flat, weights=np.repeat(fc_wb[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
        )
        out_wb = np.maximum(np.einsum("ni,ni->n", nbr_wb - d_u_pos, d_vnrm_u), 0.0)
        d_u_pos = d_u_pos + (0.60 * waistband_groove_w * out_wb)[:, None] * d_vnrm_u

    # 360-degree positive surface-step fairing across brief cloth + seam band on anterior groin & lateral hips:
    # Exclude convex posterior buttocks (Y > 0.020), which are handled by volume-preserving non-shrinking Taubin below!
    cloth_step_fair_w = (
        np.clip(np.maximum(cloth_w_u, 0.92 * seam_band_u), 0.0, 1.0)
        * smoothstep((d_u_pos[:, 2] - 0.875) / 0.022)
        * (1.0 - smoothstep((d_u_pos[:, 2] - 1.215) / 0.028))
        * (1.0 - smootherstep((d_u_pos[:, 1] - 0.020) / 0.035))
        * (1.0 - 0.96 * sub_belly_fold_u)
        * (1.0 - 0.88 * subglute_fold_u)
    )
    for _ in range(34):
        fc_fc = d_u_pos[valid_wtri].mean(axis=1)
        nbr_fc = np.column_stack(
            [np.bincount(valid_flat, weights=np.repeat(fc_fc[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
        )
        d_fc = nbr_fc - d_u_pos
        dot_fc = np.einsum("ni,ni->n", d_fc, d_vnrm_u)
        d_fc_nrm = dot_fc[:, None] * d_vnrm_u
        d_fc_tan = d_fc - d_fc_nrm
        nrm_gain_fc = np.where(dot_fc >= 0.0, 0.56, 0.34)[:, None]
        d_u_pos = d_u_pos + cloth_step_fair_w[:, None] * (0.55 * d_fc_tan + nrm_gain_fc * d_fc_nrm)

    # Bridge the Meshy brief-pouch / leg-opening / center-waistband crevices across the ENTIRE bare front groin (|X| < 0.148, Z in 0.870..1.056, Y < -0.080)
    # Sample the true bare anterior-thigh crest (|X| in 0.088..0.122) while preserving the horizontal sub-belly overhang fold!
    z_fg_grid = np.linspace(0.870, 1.056, 39)
    y_fg_mid = np.zeros_like(z_fg_grid)
    y_fg_th = np.zeros_like(z_fg_grid)
    for zi, zv in enumerate(z_fg_grid):
        m_mid = (np.abs(d_u_pos[:, 2] - zv) < 0.010) & (np.abs(d_u_pos[:, 0]) <= 0.018) & (d_u_pos[:, 1] < -0.080)
        m_th = (
            (np.abs(d_u_pos[:, 2] - zv) < 0.010)
            & (np.abs(d_u_pos[:, 0]) >= 0.088)
            & (np.abs(d_u_pos[:, 0]) <= 0.122)
            & (d_u_pos[:, 1] < -0.080)
        )
        y_th_v = float(np.percentile(d_u_pos[m_th, 1], 14)) if np.any(m_th) else -0.185
        y_mid_v = float(np.percentile(d_u_pos[m_mid, 1], 22)) if np.any(m_mid) else y_th_v
        if zv <= 0.992:
            arch_fg_t = 1.0 - smootherstep(np.array([(zv - 0.896) / 0.090]))[0]
            turn_fg = 0.044 * (arch_fg_t ** 1.85)
            mons_fg = 0.0020 * (1.0 - arch_fg_t)
            y_mid_v = float(np.clip(y_mid_v, y_th_v + turn_fg - mons_fg - 0.0015, y_th_v + turn_fg + 0.0035))
        y_fg_mid[zi] = y_mid_v
        y_fg_th[zi] = y_th_v
    for _ in range(5):
        y_fg_mid[1:-1] = 0.25 * y_fg_mid[:-2] + 0.50 * y_fg_mid[1:-1] + 0.25 * y_fg_mid[2:]
        y_fg_th[1:-1] = 0.25 * y_fg_th[:-2] + 0.50 * y_fg_th[1:-1] + 0.25 * y_fg_th[2:]
    y_fg_mid_u = np.interp(np.clip(d_u_pos[:, 2], z_fg_grid[0], z_fg_grid[-1]), z_fg_grid, y_fg_mid)
    y_fg_th_u = np.interp(np.clip(d_u_pos[:, 2], z_fg_grid[0], z_fg_grid[-1]), z_fg_grid, y_fg_th)
    t_fg_x = smootherstep(np.clip(np.abs(d_u_pos[:, 0]) / 0.104, 0.0, 1.0))
    y_fg_ceil = (1.0 - t_fg_x) * y_fg_mid_u + t_fg_x * y_fg_th_u
    front_groin_fill_w = (
        (1.0 - smoothstep((np.abs(d_u_pos[:, 0]) - 0.104) / 0.032))
        * smoothstep((d_u_pos[:, 2] - 0.874) / 0.020)
        * (1.0 - smootherstep((d_u_pos[:, 2] - 1.016) / 0.016))
        * smoothstep((-d_u_pos[:, 1] - 0.082) / 0.028)
        * (1.0 - 0.96 * sub_belly_fold_u)
    )
    recessed_fg = d_u_pos[:, 1] > y_fg_ceil
    d_u_pos[recessed_fg, 1] = (
        (1.0 - front_groin_fill_w[recessed_fg]) * d_u_pos[recessed_fg, 1]
        + front_groin_fill_w[recessed_fg] * y_fg_ceil[recessed_fg]
    )
    protruding_fg = (d_u_pos[:, 1] < y_fg_ceil - 0.0006) & (d_u_pos[:, 2] < 1.024) & (np.abs(d_u_pos[:, 0]) < 0.076)
    if np.any(protruding_fg):
        w_prot = 0.90 * front_groin_fill_w[protruding_fg]
        d_u_pos[protruding_fg, 1] = (1.0 - w_prot) * d_u_pos[protruding_fg, 1] + w_prot * (y_fg_ceil[protruding_fg] - 0.0006)

    # Anterior groin & medial leg-opening groove fill (strictly anterior Y < 0 so dy_hem < 0 moves outward -Y and NEVER shrinks rear glutes!)
    leg_hem_groove_w = np.clip(
        (1.0 - smoothstep((np.abs(d_u_pos[:, 0]) - 0.142) / 0.032))
        * smoothstep((d_u_pos[:, 2] - 0.872) / 0.020)
        * (1.0 - smoothstep((d_u_pos[:, 2] - 1.022) / 0.020))
        * smoothstep((-d_u_pos[:, 1] - 0.075) / 0.030),
        0.0,
        1.0,
    )
    for _ in range(36):
        fc_hem = d_u_pos[valid_wtri].mean(axis=1)
        nbr_hem = np.column_stack(
            [np.bincount(valid_flat, weights=np.repeat(fc_hem[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
        )
        dy_hem = nbr_hem[:, 1] - d_u_pos[:, 1]
        d_u_pos[:, 1] += leg_hem_groove_w * np.where(dy_hem < 0.0, 0.68 * dy_hem, 0.52 * dy_hem)
        d_u_pos[:, 0] += 0.40 * leg_hem_groove_w * (nbr_hem[:, 0] - d_u_pos[:, 0])
        d_u_pos[:, 2] += 0.40 * leg_hem_groove_w * (nbr_hem[:, 2] - d_u_pos[:, 2])

    # Wide macroscopic panty-line & hip-waistband erasure across the ENTIRE posterior buttocks (down to Z=0.895) & lateral hips:
    # Uses wide posterior glute-cheek coverage (not narrow seam_wide_u!) so ZERO '/' '\' brief-elastic trough survives!
    rear_cheek_broad_w = (
        smootherstep((d_u_pos[:, 1] - 0.022) / 0.030)
        * smootherstep((np.abs(d_u_pos[:, 0]) - 0.024) / 0.016)
        * (1.0 - smootherstep((np.abs(d_u_pos[:, 0]) - 0.176) / 0.026))
        * smootherstep((d_u_pos[:, 2] - 0.896) / 0.020)
        * (1.0 - smootherstep((d_u_pos[:, 2] - 1.195) / 0.030))
        * (1.0 - 0.86 * subglute_fold_u)
    )
    rear_glute_hem_w = np.maximum(
        rear_cheek_broad_w,
        np.clip(np.maximum(cloth_w_u, 0.96 * seam_wide_u), 0.0, 1.0)
        * smootherstep((d_u_pos[:, 1] - 0.018) / 0.032)
        * smootherstep((np.abs(d_u_pos[:, 0]) - 0.022) / 0.015)
        * smootherstep((d_u_pos[:, 2] - 0.892) / 0.020)
        * (1.0 - smootherstep((d_u_pos[:, 2] - 1.210) / 0.030))
        * (1.0 - 0.84 * subglute_fold_u),
    )
    rgh_idx = np.flatnonzero(rear_glute_hem_w > 0.01)
    if len(rgh_idx):
        w_rgh = rear_glute_hem_w[rgh_idx, None]
        for _ in range(48):
            fc_rg0 = d_u_pos[valid_wtri].mean(axis=1)
            nbr_rg0 = np.column_stack(
                [np.bincount(valid_flat, weights=np.repeat(fc_rg0[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
            )
            d_rg0 = nbr_rg0[rgh_idx] - d_u_pos[rgh_idx]
            nv_rg0 = d_vnrm_u[rgh_idx]
            dot_rg0 = np.einsum("ni,ni->n", d_rg0, nv_rg0)[:, None]
            d_rg0_n = dot_rg0 * nv_rg0
            d_rg0_t = d_rg0 - d_rg0_n
            d_u_pos[rgh_idx] += w_rgh * (0.20 * d_rg0_t + np.where(dot_rg0 > 0.0, 0.80, 0.0) * d_rg0_n)
        for _ in range(42):
            fc_rg1 = d_u_pos[valid_wtri].mean(axis=1)
            nbr_rg1 = np.column_stack(
                [np.bincount(valid_flat, weights=np.repeat(fc_rg1[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
            )
            d_u_pos[rgh_idx] += (0.50 * w_rgh) * (nbr_rg1[rgh_idx] - d_u_pos[rgh_idx])
            fc_rg2 = d_u_pos[valid_wtri].mean(axis=1)
            nbr_rg2 = np.column_stack(
                [np.bincount(valid_flat, weights=np.repeat(fc_rg2[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
            )
            d_u_pos[rgh_idx] -= (0.518 * w_rgh) * (nbr_rg2[rgh_idx] - d_u_pos[rgh_idx])

    # Macroscopic 2D sagittal-polar convex glute-cheek envelope on bare_donor_xyz (bridges the 55mm-wide diagonal swim-briefs
    # leg-elastic indentation across Z=0.90..1.07m, |X|=0.024..0.158m via multi-scale concave hull while keeping Z~0.895m subgluteal fold crisp!):
    y0_bd_ck, z0_bd_ck = 0.015, 1.045
    dy_bd_ck = d_u_pos[:, 1] - y0_bd_ck
    dz_bd_ck = d_u_pos[:, 2] - z0_bd_ck
    th_bd_raw = np.arctan2(dz_bd_ck, dy_bd_ck)
    th_bd_ck = np.where(th_bd_raw > 1.2, th_bd_raw - 2.0 * np.pi, th_bd_raw)
    rad_bd_ck = np.hypot(dy_bd_ck, dz_bd_ck)
    th_bd_s = np.linspace(-1.26, 0.26, 44)
    x_bd_s = np.linspace(0.024, 0.156, 28)
    r_bd_grid = np.full((len(th_bd_s), len(x_bd_s)), np.nan, dtype=np.float64)
    for ti_bd, tv_bd in enumerate(th_bd_s):
        mt_bd = (np.abs(th_bd_ck - tv_bd) < 0.048) & (rad_bd_ck > 0.05) & (d_u_pos[:, 2] >= 0.885) & (d_u_pos[:, 1] > 0.020)
        if np.sum(mt_bd) >= 3:
            for xi_bd, xv_bd in enumerate(x_bd_s):
                mx_bd = mt_bd & (np.abs(np.abs(d_u_pos[:, 0]) - xv_bd) < 0.0095)
                if np.any(mx_bd):
                    r_bd_grid[ti_bd, xi_bd] = float(np.percentile(rad_bd_ck[mx_bd], 88))
            fin_bd_r = np.isfinite(r_bd_grid[ti_bd])
            if np.sum(fin_bd_r) >= 2:
                r_bd_grid[ti_bd] = np.interp(x_bd_s, x_bd_s[fin_bd_r], r_bd_grid[ti_bd, fin_bd_r])
    for xi_bd in range(len(x_bd_s)):
        fin_bd_c = np.isfinite(r_bd_grid[:, xi_bd])
        if np.sum(fin_bd_c) >= 2:
            r_bd_grid[:, xi_bd] = np.interp(th_bd_s, th_bd_s[fin_bd_c], r_bd_grid[fin_bd_c, xi_bd])
    fin_any_row = np.any(np.isfinite(r_bd_grid), axis=1)
    if np.sum(fin_any_row) >= 4:
        for ti_bd in range(len(th_bd_s)):
            fin_r = np.isfinite(r_bd_grid[ti_bd])
            if np.any(fin_r) and not np.all(fin_r):
                r_bd_grid[ti_bd] = np.interp(x_bd_s, x_bd_s[fin_r], r_bd_grid[ti_bd, fin_r])
        for xi_bd in range(len(x_bd_s)):
            fin_c = np.isfinite(r_bd_grid[:, xi_bd])
            if np.any(fin_c) and not np.all(fin_c):
                r_bd_grid[:, xi_bd] = np.interp(th_bd_s, th_bd_s[fin_c], r_bd_grid[fin_c, xi_bd])
    if np.all(np.isfinite(r_bd_grid)):
        for st_bd in (7, 4, 2, 1):
            sg_st = smootherstep((th_bd_s[st_bd:-st_bd] - (-1.16)) / 0.12)[:, None]
            for _ in range(36):
                r_m_bd = 0.5 * (r_bd_grid[: -2 * st_bd, :] + r_bd_grid[2 * st_bd :, :])
                dr_m_bd = r_m_bd - r_bd_grid[st_bd:-st_bd, :]
                r_bd_grid[st_bd:-st_bd, :] += sg_st * np.where(dr_m_bd > 0.0, 0.85 * dr_m_bd, 0.01 * dr_m_bd)
        for st_x in (5, 3, 1):
            for _ in range(28):
                r_x_bd = 0.5 * (r_bd_grid[:, : -2 * st_x] + r_bd_grid[:, 2 * st_x :])
                dr_x_bd = r_x_bd - r_bd_grid[:, st_x:-st_x]
                r_bd_grid[:, st_x:-st_x] += np.where(dr_x_bd > 0.0, 0.85 * dr_x_bd, 0.02 * dr_x_bd)
        tf_bd = np.clip((th_bd_ck - th_bd_s[0]) / (th_bd_s[1] - th_bd_s[0]), 0.0, len(th_bd_s) - 1.0001)
        xf_bd = np.clip((np.abs(d_u_pos[:, 0]) - x_bd_s[0]) / (x_bd_s[1] - x_bd_s[0]), 0.0, len(x_bd_s) - 1.0001)
        t0_bd = tf_bd.astype(np.int64)
        x0_bd = xf_bd.astype(np.int64)
        tt_bd = tf_bd - t0_bd
        tx_bd = xf_bd - x0_bd
        r_bd_u = (
            (1.0 - tt_bd) * ((1.0 - tx_bd) * r_bd_grid[t0_bd, x0_bd] + tx_bd * r_bd_grid[t0_bd, x0_bd + 1])
            + tt_bd * ((1.0 - tx_bd) * r_bd_grid[t0_bd + 1, x0_bd] + tx_bd * r_bd_grid[t0_bd + 1, x0_bd + 1])
        )
        z_hem_bd = 0.912 + 0.84 * np.clip(np.abs(d_u_pos[:, 0]) - 0.026, 0.0, 0.145)
        w_bd_hem = (
            smootherstep((np.abs(d_u_pos[:, 0]) - 0.024) / 0.014)
            * (1.0 - smootherstep((np.abs(d_u_pos[:, 0]) - 0.150) / 0.022))
            * np.exp(-(((d_u_pos[:, 2] - z_hem_bd) / 0.075) ** 2))
            * smootherstep((th_bd_ck - (-1.18)) / 0.13)
            * (1.0 - smootherstep((th_bd_ck - 0.20) / 0.14))
            * smootherstep((d_u_pos[:, 1] - 0.025) / 0.024)
            * (1.0 - 0.85 * subglute_fold_u)
        )
        act_bd = (w_bd_hem > 0.01) & (r_bd_u > rad_bd_ck)
        r_new_bd = (1.0 - 0.97 * w_bd_hem[act_bd]) * rad_bd_ck[act_bd] + (0.97 * w_bd_hem[act_bd]) * r_bd_u[act_bd]
        d_u_pos[act_bd, 1] = y0_bd_ck + r_new_bd * np.cos(th_bd_ck[act_bd])
        d_u_pos[act_bd, 2] = z0_bd_ck + r_new_bd * np.sin(th_bd_ck[act_bd])

    # Smooth monotonic posterior gluteal-cleft-to-perineum arch (Z in 0.890..0.968, Y > 0.015):
    # Erases both the briefs center-back gusset bulge at X=0 AND the two flanking briefs leg-hem indentations at |X|=18..45mm!
    z_glute_bot_grid = np.linspace(0.890, 0.968, 26)
    y_gb_mid = np.zeros_like(z_glute_bot_grid)
    y_gb_cheek = np.zeros_like(z_glute_bot_grid)
    for zi_gb, zv_gb in enumerate(z_glute_bot_grid):
        m_gb0 = (np.abs(d_u_pos[:, 2] - zv_gb) < 0.008) & (np.abs(d_u_pos[:, 0]) <= 0.012) & (d_u_pos[:, 1] > 0.020)
        m_gb1 = (
            (np.abs(d_u_pos[:, 2] - zv_gb) < 0.008)
            & (np.abs(d_u_pos[:, 0]) >= 0.046)
            & (np.abs(d_u_pos[:, 0]) <= 0.082)
            & (d_u_pos[:, 1] > 0.035)
        )
        y_chk = float(np.percentile(d_u_pos[m_gb1, 1], 82)) if np.any(m_gb1) else 0.125
        y_mid_gb = float(np.percentile(d_u_pos[m_gb0, 1], 70)) if np.any(m_gb0) else (y_chk - 0.004)
        cleft_tuck = 0.0002 + 0.0056 * smoothstep((zv_gb - 0.916) / 0.046)
        y_mid_gb = min(y_mid_gb, y_chk - cleft_tuck)
        y_gb_mid[zi_gb] = y_mid_gb
        y_gb_cheek[zi_gb] = y_chk
    for _ in range(5):
        y_gb_mid[1:-1] = 0.25 * y_gb_mid[:-2] + 0.50 * y_gb_mid[1:-1] + 0.25 * y_gb_mid[2:]
        y_gb_cheek[1:-1] = 0.25 * y_gb_cheek[:-2] + 0.50 * y_gb_cheek[1:-1] + 0.25 * y_gb_cheek[2:]
    y_gb0_u = np.interp(np.clip(d_u_pos[:, 2], z_glute_bot_grid[0], z_glute_bot_grid[-1]), z_glute_bot_grid, y_gb_mid)
    y_gb1_u = np.interp(np.clip(d_u_pos[:, 2], z_glute_bot_grid[0], z_glute_bot_grid[-1]), z_glute_bot_grid, y_gb_cheek)
    t_gb_x = smootherstep(np.clip(np.abs(d_u_pos[:, 0]) / 0.058, 0.0, 1.0))
    y_gb_arch = (1.0 - t_gb_x) * y_gb0_u + t_gb_x * y_gb1_u
    w_gb_arch = (
        (1.0 - smootherstep((np.abs(d_u_pos[:, 0]) - 0.056) / 0.020))
        * smoothstep((d_u_pos[:, 2] - 0.888) / 0.016)
        * (1.0 - smootherstep((d_u_pos[:, 2] - 0.958) / 0.018))
        * smoothstep((d_u_pos[:, 1] - 0.022) / 0.022)
    )
    gusset_bulge = (d_u_pos[:, 1] > y_gb_arch) & (np.abs(d_u_pos[:, 0]) < 0.028) & (w_gb_arch > 1e-3)
    if np.any(gusset_bulge):
        wb_g = 0.92 * w_gb_arch[gusset_bulge]
        d_u_pos[gusset_bulge, 1] = (1.0 - wb_g) * d_u_pos[gusset_bulge, 1] + wb_g * y_gb_arch[gusset_bulge]
    hem_pit_bg = (d_u_pos[:, 1] < y_gb_arch) & (np.abs(d_u_pos[:, 0]) >= 0.008) & (w_gb_arch > 1e-3)
    if np.any(hem_pit_bg):
        wb_p = 0.90 * w_gb_arch[hem_pit_bg]
        d_u_pos[hem_pit_bg, 1] = (1.0 - wb_p) * d_u_pos[hem_pit_bg, 1] + wb_p * y_gb_arch[hem_pit_bg]

    # Monotonic W-free sagittal-arch bridge across |X| <= 0.122, Z in 0.880..1.040 (strictly below the overhanging sub-belly panniculus fold at Z~1.045!)
    z_crotch_grid = np.linspace(0.880, 1.040, 36)
    y_cr_mid = np.zeros_like(z_crotch_grid)
    y_cr_lat = np.zeros_like(z_crotch_grid)
    y_cr_outer = np.zeros_like(z_crotch_grid)
    for zi_c, zv_c in enumerate(z_crotch_grid):
        m_c0 = (np.abs(d_u_pos[:, 2] - zv_c) < 0.009) & (np.abs(d_u_pos[:, 0]) <= 0.014) & (d_u_pos[:, 1] < -0.090)
        m_c1 = (
            (np.abs(d_u_pos[:, 2] - zv_c) < 0.009)
            & (np.abs(d_u_pos[:, 0]) >= 0.032)
            & (np.abs(d_u_pos[:, 0]) <= 0.062)
            & (d_u_pos[:, 1] < -0.090)
        )
        m_c2 = (
            (np.abs(d_u_pos[:, 2] - zv_c) < 0.009)
            & (np.abs(d_u_pos[:, 0]) >= 0.072)
            & (np.abs(d_u_pos[:, 0]) <= 0.114)
            & (d_u_pos[:, 1] < -0.105)
        )
        y_c2 = float(np.percentile(d_u_pos[m_c2, 1], 18)) if np.any(m_c2) else -0.180
        y_c1 = float(np.percentile(d_u_pos[m_c1, 1], 18)) if np.any(m_c1) else y_c2
        y_c0 = float(np.percentile(d_u_pos[m_c0, 1], 24)) if np.any(m_c0) else y_c2
        if zv_c <= 1.008:
            # Neutral bare masculine pubic/groin arch: gentle smooth mons above Z=0.985, smooth C2 turn-under from Z=0.985->0.896
            # (eliminating the hanging linen briefs pouch while keeping X=0..48mm as one flat/convex sheet with ZERO central V-slit!)
            arch_cr_t = 1.0 - float(smootherstep(np.array([(zv_c - 0.896) / 0.090]))[0])
            turn_under = 0.044 * (arch_cr_t ** 1.85)
            mons_proud = 0.0022 * (1.0 - arch_cr_t)
            y_c0 = float(np.clip(y_c0, y_c2 + turn_under - mons_proud - 0.0016, y_c2 + turn_under + 0.0035))
            y_c1 = float(np.clip(y_c1, 0.78 * y_c0 + 0.22 * y_c2 - 0.0012, 0.78 * y_c0 + 0.22 * y_c2 + 0.0018))
        y_cr_mid[zi_c] = y_c0
        y_cr_lat[zi_c] = y_c1
        y_cr_outer[zi_c] = y_c2
    for _ in range(6):
        y_cr_mid[1:-1] = 0.25 * y_cr_mid[:-2] + 0.50 * y_cr_mid[1:-1] + 0.25 * y_cr_mid[2:]
        y_cr_lat[1:-1] = 0.25 * y_cr_lat[:-2] + 0.50 * y_cr_lat[1:-1] + 0.25 * y_cr_lat[2:]
        y_cr_outer[1:-1] = 0.25 * y_cr_outer[:-2] + 0.50 * y_cr_outer[1:-1] + 0.25 * y_cr_outer[2:]
    y_cr0_u = np.interp(np.clip(d_u_pos[:, 2], z_crotch_grid[0], z_crotch_grid[-1]), z_crotch_grid, y_cr_mid)
    y_cr1_u = np.interp(np.clip(d_u_pos[:, 2], z_crotch_grid[0], z_crotch_grid[-1]), z_crotch_grid, y_cr_lat)
    y_cr2_u = np.interp(np.clip(d_u_pos[:, 2], z_crotch_grid[0], z_crotch_grid[-1]), z_crotch_grid, y_cr_outer)
    t_cr_x = smootherstep(np.clip(np.abs(d_u_pos[:, 0]) / 0.048, 0.0, 1.0))
    t_cr_x2 = smootherstep(np.clip((np.abs(d_u_pos[:, 0]) - 0.048) / 0.046, 0.0, 1.0))
    y_cr_inner = (1.0 - t_cr_x) * y_cr0_u + t_cr_x * y_cr1_u
    y_cr_tgt = np.where(np.abs(d_u_pos[:, 0]) <= 0.048, y_cr_inner, (1.0 - t_cr_x2) * y_cr1_u + t_cr_x2 * y_cr2_u)
    w_cr_arch = (
        (1.0 - smootherstep((np.abs(d_u_pos[:, 0]) - 0.078) / 0.026))
        * smoothstep((d_u_pos[:, 2] - 0.880) / 0.018)
        * (1.0 - smootherstep((d_u_pos[:, 2] - 1.014) / 0.016))
        * smoothstep((-d_u_pos[:, 1] - 0.092) / 0.026)
        * (1.0 - 0.96 * sub_belly_fold_u)
    )
    d_u_pos[:, 1] = (1.0 - 0.95 * w_cr_arch) * d_u_pos[:, 1] + (0.95 * w_cr_arch) * y_cr_tgt
    # One-sided forward fill across the diagonal brief leg-opening hem (|X| in 0.045..0.125, Z in 0.895..1.008) so no oblique hem groove remains!
    t_hem_x = smootherstep(np.clip((np.abs(d_u_pos[:, 0]) - 0.056) / 0.066, 0.0, 1.0))
    y_hem_env = (1.0 - t_hem_x) * y_cr1_u + t_hem_x * y_cr2_u
    w_hem_fill = (
        smootherstep((np.abs(d_u_pos[:, 0]) - 0.036) / 0.020)
        * (1.0 - smootherstep((np.abs(d_u_pos[:, 0]) - 0.114) / 0.022))
        * smoothstep((d_u_pos[:, 2] - 0.892) / 0.018)
        * (1.0 - smoothstep((d_u_pos[:, 2] - 0.996) / 0.020))
        * smoothstep((-d_u_pos[:, 1] - 0.125) / 0.026)
    )
    y_filled = np.minimum(d_u_pos[:, 1], y_hem_env)
    d_u_pos[:, 1] = (1.0 - 0.92 * w_hem_fill) * d_u_pos[:, 1] + (0.92 * w_hem_fill) * y_filled
    w_fair_groin = np.maximum(w_cr_arch, 0.85 * w_hem_fill)
    for _ in range(36):
        fc_cr = d_u_pos[valid_wtri].mean(axis=1)
        nbr_cr_y = np.bincount(valid_flat, weights=np.repeat(fc_cr[:, 1], 3), minlength=n_du) / deg_du
        d_u_pos[:, 1] += 0.58 * w_fair_groin * (nbr_cr_y - d_u_pos[:, 1])

    # Reconstruct continuous U-shaped bare sub-belly (panniculus) crease valley across X=0 strictly at the measured donor crease root
    # (Z ~ 1.015m on M050-F100, NEVER at hardcoded Z=1.0445m which chopped off the overhanging lower-belly apron!):
    m_apron_c = (np.abs(d_u_pos[:, 0]) <= 0.045) & (d_u_pos[:, 2] >= 1.055) & (d_u_pos[:, 2] <= 1.096) & (d_u_pos[:, 1] < -0.15)
    m_mons_c = (np.abs(d_u_pos[:, 0]) <= 0.045) & (d_u_pos[:, 2] >= 1.004) & (d_u_pos[:, 2] <= 1.032) & (d_u_pos[:, 1] < -0.14)
    if np.any(m_apron_c) and np.any(m_mons_c):
        y_apron_c = float(np.percentile(d_u_pos[m_apron_c, 1], 8))
        y_mons_c = float(np.percentile(d_u_pos[m_mons_c, 1], 75))
        z_root_bins = np.linspace(1.004, 1.034, 16)
        z_mons_root = 1.016
        best_y_root = -1e9
        for zr_b in z_root_bins:
            mr_b = (np.abs(d_u_pos[:, 0]) <= 0.036) & (np.abs(d_u_pos[:, 2] - zr_b) < 0.004) & (d_u_pos[:, 1] < -0.14)
            if np.any(mr_b):
                yr_b = float(np.percentile(d_u_pos[mr_b, 1], 50))
                if yr_b > best_y_root:
                    best_y_root = yr_b
                    z_mons_root = float(zr_b)
        panniculus_drop = y_mons_c - y_apron_c  # positive when belly overhangs forward (-Y) past crease root!
        if panniculus_drop > 0.024:
            w_pann_strength = float(smoothstep(np.array([(panniculus_drop - 0.024) / 0.028]))[0])
            z_sb_curve = z_mons_root + 0.016 * np.clip((np.abs(d_u_pos[:, 0]) / 0.105) ** 2, 0.0, 1.3)
            w_sb_x = 1.0 - smootherstep((np.abs(d_u_pos[:, 0]) - 0.068) / 0.036)
            w_sb_z = np.exp(-(((d_u_pos[:, 2] - z_sb_curve) / 0.0065) ** 2))
            w_sb_y = smoothstep((-d_u_pos[:, 1] - 0.175) / 0.025)
            y_sb_root_tgt = (y_mons_c + 0.0025) + 0.014 * np.clip((np.abs(d_u_pos[:, 0]) / 0.095) ** 2, 0.0, 1.2)
            dy_tuck_need = np.maximum(y_sb_root_tgt - d_u_pos[:, 1], 0.0)
            d_u_pos[:, 1] += w_pann_strength * w_sb_x * w_sb_z * w_sb_y * np.minimum(dy_tuck_need, 0.0035)

    # Smooth artificial tight briefs-waistband indentation on the anterolateral hip / lateral belly-apron border (|X|>=0.114m, strictly
    # outboard of the central sub-belly panniculus fold) so lateral hip quads never fold over onto the waistband bite!
    lat_wb_w = (
        np.clip(np.maximum(cloth_w_u, 0.92 * seam_wide_u), 0.0, 1.0)
        * smootherstep((np.abs(d_u_pos[:, 0]) - 0.112) / 0.022)
        * smootherstep((d_u_pos[:, 2] - 1.028) / 0.025)
        * (1.0 - smootherstep((d_u_pos[:, 2] - 1.158) / 0.028))
        * (1.0 - smootherstep((d_u_pos[:, 1] - 0.035) / 0.032))
    )
    lwb_idx = np.flatnonzero(lat_wb_w > 0.01)
    if len(lwb_idx):
        w_lwb = lat_wb_w[lwb_idx, None]
        for _ in range(32):
            fc_lw = d_u_pos[valid_wtri].mean(axis=1)
            nbr_lw = np.column_stack(
                [np.bincount(valid_flat, weights=np.repeat(fc_lw[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
            )
            d_u_pos[lwb_idx] += (0.48 * w_lwb) * (nbr_lw[lwb_idx] - d_u_pos[lwb_idx])

    # Preserve 100% of the donor's genuine submental double-chin, jowls, lower cheeks/buccal fullness, throat & posterior nape
    # (NO conical `outside_ell` neck carving!); apply only 3 light Taubin passes to de-facet raw Meshy triangles:
    neck_taubin_w = 0.22 * smoothstep((d_u_pos[:, 2] - 1.690) / 0.025) * (1.0 - smoothstep((d_u_pos[:, 2] - 1.885) / 0.020))
    for _ in range(3):
        fc_valid = d_u_pos[valid_wtri].mean(axis=1)
        nbr_du = np.column_stack(
            [np.bincount(valid_flat, weights=np.repeat(fc_valid[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
        )
        d_u_pos = d_u_pos + neck_taubin_w[:, None] * (nbr_du - d_u_pos)
        fc_valid2 = d_u_pos[valid_wtri].mean(axis=1)
        nbr_du2 = np.column_stack(
            [np.bincount(valid_flat, weights=np.repeat(fc_valid2[:, c], 3), minlength=n_du) / deg_du for c in range(3)]
        )
        d_u_pos = d_u_pos - (1.03 * neck_taubin_w)[:, None] * (nbr_du2 - d_u_pos)

    # Smooth C2 anatomical intergluteal valley on the hole-free bare posterior buttocks (natural rounded valley down to saddle, zero razor pinch!)
    ig_x = np.exp(-((d_u_pos[:, 0] / 0.030) ** 2))
    ig_z = smoothstep((d_u_pos[:, 2] - 0.908) / 0.028) * (1.0 - smoothstep((d_u_pos[:, 2] - 1.115) / 0.036))
    ig_y = smoothstep((d_u_pos[:, 1] - 0.072) / 0.032)
    d_u_pos[:, 1] -= 0.0058 * ig_x * ig_z * ig_y * np.clip(cloth_w_u, 0.30, 1.0)
    bare_donor_xyz = d_u_pos[d_weld]

    # Recompute face centroids & normals on bare_donor_xyz so trunk_neck cleanly includes the lifted watertight perineal saddle
    b_v = bare_donor_xyz[donor_tri]
    b_tc = b_v.mean(axis=1)
    bcx, bcy, bcz = b_tc.T

    # --- 3. Build anatomical donor part face masks along exact groove x_split_f ---
    # Preserves 100% of lateral chest & first back fold inside trunk_neck (ZERO triceps bleed!), and excludes compressed
    # medial-arm contact faces above z=1.395m from arm_l/r so L^2(u) wraps a smooth convex bicep-to-tricep cylinder!
    is_free_arm = free_arm_side != 0
    upper_trap_shelf = (cz >= 1.605) & (d_nrm[:, 2] > 0.44) & (np.abs(cx) <= 0.258)
    in_axilla_bridge_core = (
        (cz >= max(z_bridge - 0.015, 1.375))
        & (cz <= 1.548)
        & (np.abs(np.abs(cx) - saddle_x) <= 0.024)
        & (cy >= -0.034)
        & (cy <= 0.048)
        & (np.abs(d_nrm[:, 1]) < 0.44)
    )
    ant_pec_wrap = (
        0.020
        * smoothstep((-cy - 0.058) / 0.026)
        * smoothstep((cz - 1.355) / 0.035)
        * (1.0 - smoothstep((cz - 1.565) / 0.036))
    )
    post_back_taper = np.zeros_like(cz)
    trunk_x_cap = np.where(
        cz < 1.520,
        x_split_f + 0.002 + ant_pec_wrap - post_back_taper,
        (x_split_f + 0.002 + ant_pec_wrap - post_back_taper) + 0.052 * smoothstep((cz - 1.520) / 0.060),
    )
    is_inward_med_arm = (
        (cz >= 1.335)
        & (cz < 1.535)
        & (np.abs(cx) >= x_split_f - 0.010)
        & (np.sign(cx) * d_nrm[:, 0] < -0.14)
        & (np.abs(d_nrm[:, 1]) < 0.52)
    )
    compressed_med_arm = (
        (cz >= max(z_bridge - 0.025, 1.320))
        & (cz < 1.542)
        & (np.abs(cx) <= saddle_x + 0.032)
        & (np.sign(cx) * d_nrm[:, 0] < -0.18)
        & (np.abs(d_nrm[:, 1]) < 0.50)
    )
    arm_x_min = np.where(cz < 1.525, x_split_f - 0.001, x_split_f - 0.022)
    is_outward_lat_trunk = (
        (cz < 1.520)
        & (np.abs(cx) <= x_split_f + 0.006)
        & (np.sign(cx) * d_nrm[:, 0] > 0.15)
    )
    ext_arm_acromion = (cz >= 1.515) & (cz <= 1.672) & ((d_nrm[:, 2] > 0.22) | (np.abs(d_nrm[:, 1]) > 0.25))
    outer_deltoid_cap = (
        (cz >= 1.525)
        & (cz <= 1.675)
        & (~in_axilla_bridge_core)
        & ((d_nrm[:, 2] > 0.20) | (np.abs(d_nrm[:, 1]) > 0.45))
    )
    z_arm_lo = min(z_bridge, 1.345) - 0.008
    z_trunk_floor = min(0.865, z_sad_base - 0.015) if thigh_merged_z < 0.888 else 0.865
    trunk_z_ok = (bcz >= z_trunk_floor) & ((cz >= z_trunk_floor) | ((np.abs(bcx) <= 0.046) & (bcy >= -0.185) & (bcy <= 0.095)))
    d_part_masks = {
        "trunk_neck": trunk_eligible
        & (~is_free_arm)
        & (~in_axilla_bridge_core)
        & (~is_inward_med_arm)
        & trunk_z_ok
        & (
            (cz < 1.335)
            | (np.abs(cx) <= trunk_x_cap)
            | upper_trap_shelf
            | outer_deltoid_cap
            | ((cz >= 1.645) & (np.abs(cx) <= 0.285))
        ),
        "arm_l": donor_eligible
        & (~in_axilla_bridge_core)
        & (~compressed_med_arm)
        & (
            (free_arm_side == 1)
            | (
                (cz >= z_arm_lo)
                & (cz <= 1.672)
                & (~is_outward_lat_trunk)
                & ((cx >= arm_x_min) | (ext_arm_acromion & (cx >= x_split_f - 0.016)))
            )
        ),
        "arm_r": donor_eligible
        & (~in_axilla_bridge_core)
        & (~compressed_med_arm)
        & (
            (free_arm_side == -1)
            | (
                (cz >= z_arm_lo)
                & (cz <= 1.672)
                & (~is_outward_lat_trunk)
                & ((cx <= -arm_x_min) | (ext_arm_acromion & (cx <= -(x_split_f - 0.016))))
            )
        ),
        "leg_l": (donor_eligible | (trunk_eligible & (bcz >= z_sad_base + 0.002)))
        & (~is_free_arm)
        & (cz <= 1.24)
        & (cx >= -0.004),
        "leg_r": (donor_eligible | (trunk_eligible & (bcz >= z_sad_base + 0.002)))
        & (~is_free_arm)
        & (cz <= 1.24)
        & (cx <= 0.004),
    }

    # --- 4. Canonical welded pins, smooth boundary tapers, and anatomical part labels ---
    rx, ry, rz = rest_all.T
    px, py, pz = posed_all_0.T
    c_conn = weld_connectivity(rest_all, all_tri)
    c_nrm_rest = vertex_normals(rest_all, all_tri, c_conn[0])
    c_nrm_posed = vertex_normals(posed_all_0, all_tri, c_conn[0])

    is_head_row = np.arange(len(rest_all)) >= n_body_verts
    head_pin, taper_head, head_pin_raw = build_head_feature_pin_mask(
        rest_all, c_nrm_rest, all_tri, n_body_verts, compiled_family
    )
    head_feature_masks = head_pin_raw.pop("_masks", {})
    head_pin_summary = head_pin_raw

    j_map = {n: i for i, n in enumerate(joint_names)}
    w_upperarm = all_weights[:, j_map["upperarm_l"]] + all_weights[:, j_map["upperarm_pressure_l"]] + all_weights[:, j_map["upperarm_r"]] + all_weights[:, j_map["upperarm_pressure_r"]]
    w_lowerarm = all_weights[:, j_map["lowerarm_l"]] + all_weights[:, j_map["lowerarm_r"]]
    elbow_blend = np.clip(4.0 * w_upperarm * w_lowerarm, 0.0, 1.0)
    w_arm_l = all_weights[:, j_map["upperarm_l"]] + all_weights[:, j_map["upperarm_pressure_l"]] + all_weights[:, j_map["lowerarm_l"]] + all_weights[:, j_map["hand_l"]]
    w_arm_r = all_weights[:, j_map["upperarm_r"]] + all_weights[:, j_map["upperarm_pressure_r"]] + all_weights[:, j_map["lowerarm_r"]] + all_weights[:, j_map["hand_r"]]
    w_leg_l = all_weights[:, j_map["thigh_l"]] + all_weights[:, j_map["calf_l"]] + all_weights[:, j_map["foot_l"]] + all_weights[:, j_map["ball_l"]]
    w_leg_r = all_weights[:, j_map["thigh_r"]] + all_weights[:, j_map["calf_r"]] + all_weights[:, j_map["foot_r"]] + all_weights[:, j_map["ball_r"]]

    # Topological 5-finger segmentation on LOD0: ZERO world-space pins; palm observed 1:1, fingers carried via stiff local differential coupling!
    high_tri_body = all_tri[np.all(all_tri < n_body_verts, axis=1)]
    finger_topo_lod0 = build_five_finger_topology(
        rest_all[:n_body_verts],
        high_tri_body,
        w_arm_l[:n_body_verts],
        w_arm_r[:n_body_verts],
        landmarks_bl,
    )
    taper_hands = np.ones(len(rest_all), dtype=np.float64)
    taper_hands[:n_body_verts] = finger_topo_lod0["taperHandsVertex"]

    # Feet: ZERO 3D world-space pins! Plantar sole slides freely in (X, Y) on Z=0.000m (1D floor constraint in CG),
    # while distal toes taper direct donor observation on inter-toe walls and keep crisp local shape via coupled_stiff!
    forefoot_s = ry + 0.24 * np.abs(rx)
    foot_pin = np.zeros(len(rest_all), dtype=bool)
    taper_sole = smootherstep((rz - 0.0035) / 0.012)
    w_toe_z = 1.0 - smoothstep((rz - 0.056) / 0.020)
    taper_toes = 1.0 - w_toe_z * (1.0 - smootherstep((forefoot_s + 0.106) / 0.038))
    taper_feet = np.minimum(taper_sole, taper_toes)

    # Combined translation-invariant differential stiffness boost on coupled micro-features (eyelids, lips, nostrils, ears, fingers, toes):
    coupled_stiff = head_feature_masks.get("coupledStiffAll", np.ones(len(rest_all), dtype=np.float64)).copy()
    coupled_stiff[:n_body_verts] = np.maximum(coupled_stiff[:n_body_verts], finger_topo_lod0["fingerStiffVertex"])
    toe_stiff = 1.0 + 2.8 * w_toe_z * (1.0 - smootherstep((forefoot_s + 0.100) / 0.036))
    coupled_stiff = np.maximum(coupled_stiff, toe_stiff)

    hard_pin = np.zeros(len(rest_all), dtype=bool)
    hard_gain = np.ones(len(rest_all), dtype=np.float64)
    boundary_taper = taper_head * taper_hands * taper_feet

    # Canonical part assignment: keep outward-facing lateral ribcage wall (<0.196m) in trunk_neck while preserving
    # genuine medial/posterior upper-arm skin in arm_l/r; split leg_l/leg_r right along the canonical midline crotch arch!
    is_trunk_ax_wall = (np.abs(rx) < 0.196) & (rz < 1.606) & (np.sign(rx) * c_nrm_rest[:, 0] > 0.30)
    is_arm_l = (w_arm_l >= 0.52) & (~is_trunk_ax_wall)
    is_arm_r = (w_arm_r >= 0.52) & (~is_trunk_ax_wall)
    not_arm = ~(is_arm_l | is_arm_r)
    mid_crotch_m = (np.abs(rx) <= 0.0003) & (rz >= 1.010) & (rz <= 1.130)
    if np.any(mid_crotch_m):
        mc_order = np.argsort(ry[mid_crotch_m])
        z_mid_curve_all = np.interp(np.clip(ry, ry[mid_crotch_m][mc_order][0], ry[mid_crotch_m][mc_order][-1]), ry[mid_crotch_m][mc_order], rz[mid_crotch_m][mc_order])
    else:
        z_mid_curve_all = np.full(len(rest_all), 1.019, dtype=np.float64)
    w_lat_hip_part = smoothstep((np.abs(rx) - 0.040) / 0.045)
    leg_z_cap = (1.0 - w_lat_hip_part) * (z_mid_curve_all - 0.0010) + w_lat_hip_part * 0.985
    c_part = np.full(len(rest_all), "trunk_neck", dtype=object)
    c_part[(rz <= leg_z_cap) & (rx > 0.0003) & not_arm] = "leg_l"
    c_part[(rz <= leg_z_cap) & (rx < -0.0003) & not_arm] = "leg_r"
    c_part[is_arm_l] = "arm_l"
    c_part[is_arm_r] = "arm_r"

    # Canonical inferred clefts:
    # Both front groin AND underside perineal saddle are 100% observed on watertight bare_donor_xyz (zero starvation cliffs!).
    groin_inf = np.zeros(len(rest_all), dtype=np.float64)
    glute_inf = np.zeros(len(rest_all), dtype=np.float64)

    # 3) Complete 3-wall occluded axillary contact pocket (axillary dome + medial upper arm + lateral serratus contact wall):
    # Every vertex buried inside the donor's pressed arm-against-ribcage fusion gets axilla_inf -> 1.0 (zero bogus rays through solid flesh!)
    axilla_inf = np.zeros(len(rest_all), dtype=np.float64)
    lat_trunk_occ = np.zeros(len(rest_all), dtype=np.float64)
    if pose_info["axillaBridgeHeightGapM"] > 0.008:
        c_weld, (c_es, c_ed), c_mult, c_deg = c_conn
        c_first = np.zeros(len(c_mult), dtype=np.int64)
        c_first[c_weld[::-1]] = np.arange(len(c_weld) - 1, -1, -1)
        c_part_u = c_part[c_first]
        c_ry_u = ry[c_first]
        c_rz_u = rz[c_first]
        c_nrm_y_u = c_nrm_rest[c_first, 1]
        c_nrm_x_u = np.abs(c_nrm_rest[c_first, 0])
        arm_u_flag = (c_part_u == "arm_l") | (c_part_u == "arm_r")
        seam_edge = arm_u_flag[c_es] != arm_u_flag[c_ed]
        seam_band_u = np.zeros(len(c_mult), dtype=np.float64)
        seam_band_u[c_es[seam_edge]] = 1.0
        for _ in range(2):
            seam_nbr = np.bincount(c_es, weights=seam_band_u[c_ed], minlength=len(c_mult)) / np.maximum(c_deg, 1)
            seam_band_u = np.maximum(seam_band_u, 0.78 * seam_nbr)
        # Keep upper deltopectoral (ry < -0.036, rz > 1.512) & posterior deltoid-teres (ry > +0.048, rz > 1.518) 100% observed
        # on the donor's smooth exterior envelope so armpits NEVER pinch high into the front or back of the shoulder!
        in_central_vault_u = smoothstep((c_ry_u + 0.042) / 0.018) * (1.0 - smoothstep((c_ry_u - 0.048) / 0.020))
        z_ceil_seam_u = 1.508 + 0.056 * in_central_vault_u
        seam_pocket_u = (
            seam_band_u
            * (1.0 - smootherstep((c_rz_u - z_ceil_seam_u) / 0.022))
            * smoothstep((c_ry_u + 0.068) / 0.020)
            * (1.0 - smoothstep((-c_nrm_y_u - 0.58) / 0.12))
            * (1.0 - smoothstep((c_nrm_y_u - 0.52) / 0.14))
            * (1.0 - smoothstep((c_ry_u - 0.056) / 0.020))
        )
        seam_below_acr = seam_pocket_u[c_weld]

        z_occ_lo_tr = min(max(z_bridge - 0.068, 1.362), 1.384)
        z_occ_lo_arm = max(z_bridge - 0.036, 1.312)
        not_front_pec = 1.0 - smoothstep((-c_nrm_rest[:, 1] - 0.58) / 0.12)
        not_back_plate = 1.0 - smoothstep((c_nrm_rest[:, 1] - 0.52) / 0.14)
        in_central_vault = smoothstep((ry + 0.042) / 0.018) * (1.0 - smoothstep((ry - 0.048) / 0.020))
        z_ceil_occ = 1.508 + 0.058 * in_central_vault
        dome_occ = (
            smoothstep((rz - 1.468) / 0.024)
            * (1.0 - smootherstep((rz - z_ceil_occ) / 0.024))
            * smoothstep((ry + 0.068) / 0.020)
            * not_front_pec
            * not_back_plate
            * (1.0 - smoothstep((ry - 0.056) / 0.020))
            * smoothstep((np.abs(rx) - 0.148) / 0.016)
            * (1.0 - smoothstep((np.abs(rx) - 0.252) / 0.022))
            * np.maximum(
                smoothstep((-c_nrm_rest[:, 2] - 0.14) / 0.20),
                smoothstep((np.abs(c_nrm_rest[:, 0]) - 0.68) / 0.14),
            )
        )
        med_arm_occ = (
            np.where(~not_arm, 1.0, 0.0)
            * smoothstep((pz - z_occ_lo_arm) / 0.024)
            * (1.0 - smootherstep((rz - z_ceil_occ) / 0.024))
            * smoothstep((ry + 0.064) / 0.020)
            * (1.0 - smoothstep((ry - 0.064) / 0.022))
            * (1.0 - smoothstep((np.abs(c_nrm_posed[:, 1]) - 0.60) / 0.14))
            * np.maximum(
                smoothstep((-np.sign(rx) * c_nrm_rest[:, 0] - 0.18) / 0.20),
                smoothstep((-np.sign(rx) * c_nrm_posed[:, 0] - 0.18) / 0.20),
            )
        )
        lat_trunk_occ = (
            np.where(not_arm, 1.0, 0.0)
            * smoothstep((pz - z_occ_lo_tr) / 0.026)
            * (1.0 - smoothstep((rz - z_ceil_occ) / 0.020))
            * smoothstep((np.abs(rx) - 0.136) / 0.016)
            * smoothstep((ry + 0.068) / 0.020)
            * not_front_pec
            * not_back_plate
            * (1.0 - smoothstep((ry - 0.056) / 0.020))
            * smoothstep((np.sign(rx) * c_nrm_rest[:, 0] - 0.58) / 0.16)
            * (1.0 - smoothstep((np.abs(c_nrm_rest[:, 1]) - 0.60) / 0.14))
        )
        axilla_inf = np.clip(
            np.maximum(np.maximum(seam_below_acr, dome_occ), np.maximum(med_arm_occ, lat_trunk_occ)),
            0.0,
            1.0,
        )

    thigh_inf = np.zeros(len(rest_all), dtype=np.float64)
    cleft_inferred = np.clip(np.maximum(np.maximum(groin_inf, glute_inf), np.maximum(axilla_inf, thigh_inf)), 0.0, 1.0)
    obs_gain = hard_gain * boundary_taper * (1.0 - cleft_inferred)

    return {
        "donorEligibleFaces": donor_eligible,
        "donorBareSolverXyz": bare_donor_xyz,
        "donorPerinealSaddleZM": z_sad_base,
        "donorAxillaSplitZGrid": z_ax_grid,
        "donorAxillaSplitXM": x_groove_grid,
        "donorAxillaDomeZM": z_ax_dome_tgt,
        "donorLinenFaces": linen_raw,
        "donorLinenExcludedFaces": linen_excluded,
        "donorLinenSkintightKeptFaces": linen_skintight_kept,
        "donorClothOffsetM": donor_cloth_offset_m,
        "donorLinenRimFaces": linen_rim_rings,
        "donorBridgedAxillaFaces": bridged_axilla,
        "donorBridgedThighFaces": bridged_thigh,
        "donorFreeArmSide": free_arm_side,
        "donorPartMasks": d_part_masks,
        "canonicalHardPin": hard_pin,
        "canonicalFootPin": foot_pin,
        "fingerTopoLod0": finger_topo_lod0,
        "headPinSummary": head_pin_summary,
        "headFeatureMasks": head_feature_masks,
        "canonicalCoupledStiff": coupled_stiff,
        "skullAlignInfo": skull_align_info,
        "canonicalHardGain": hard_gain,
        "canonicalBoundaryTaper": boundary_taper,
        "canonicalCleftInferred": cleft_inferred,
        "canonicalGroinInf": groin_inf,
        "canonicalAxillaInf": axilla_inf,
        "canonicalLatTrunkOcc": lat_trunk_occ,
        "canonicalArmWeight": np.clip(w_arm_l + w_arm_r, 0.0, 1.0),
        "canonicalElbowBlend": elbow_blend,
        "canonicalIsHead": is_head_row.astype(np.float64),
        "canonicalRestNormals": c_nrm_rest,
        "canonicalThighInf": thigh_inf,
        "canonicalObsGain": obs_gain,
        "canonicalPart": c_part,
        "origHeadCount": orig_head_count,
    }


def solve_coupled_3n_cg(
    a_blocks: np.ndarray,
    b_rhs: np.ndarray,
    u_current: np.ndarray,
    free_mask: np.ndarray,
    connectivity,
    w_edge: np.ndarray,
    diag_w: np.ndarray,
    diag_w2: np.ndarray,
    w_step_mem: float,
    w_step_bih: float,
    w_tot_mem: float,
    w_tot_bih: float,
    tot_scale_u: np.ndarray | None = None,
    u_reg_base: np.ndarray | None = None,
    max_iter: int = 240,
) -> tuple[np.ndarray, dict]:
    """Solve exact symmetric positive-definite 3N system in rest space for incremental step du = U_next - u_current:
    (A_data + w_m L_sym + w_b L_sym^2) du = b_rhs - tot_scale * (w_tot_mem L_sym(u_rel) + w_tot_bih L_sym^2(u_rel))
    where L_sym has symmetric edge weights w_edge (stiffening micro-feature pits so they never invert).
    """
    _, (e_src, e_dst), _, degree = connectivity
    n_u = len(degree)
    free_col = free_mask[:, None]
    diag_col = diag_w[:, None]

    def laplacian_3(x: np.ndarray) -> np.ndarray:
        nbr = np.column_stack(
            [np.bincount(e_src, weights=w_edge * x[e_dst, c], minlength=n_u) for c in range(3)]
        )
        return diag_col * x - nbr

    t_col = tot_scale_u[:, None] if tot_scale_u is not None else 1.0
    w_m = w_step_mem + w_tot_mem
    w_b = w_step_bih + w_tot_bih

    # Subtract total smoothness force on u_rel = u_current - u_reg_base from RHS
    u_rel = (u_current - u_reg_base) if u_reg_base is not None else u_current
    lu_cur = laplacian_3(np.where(free_col, u_rel, 0.0))
    llu_cur = laplacian_3(lu_cur)
    rhs = np.where(free_col, b_rhs - t_col * (w_tot_mem * lu_cur + w_tot_bih * llu_cur), 0.0)

    # Exact 3x3 block Jacobi preconditioner for A_data + w_m L_sym + w_b L_sym^2
    scalar_diag = w_m * diag_w + w_b * diag_w2
    diag_blocks = a_blocks.copy()
    diag_blocks[:, 0, 0] += scalar_diag
    diag_blocks[:, 1, 1] += scalar_diag
    diag_blocks[:, 2, 2] += scalar_diag
    diag_blocks[~free_mask] = np.eye(3)
    inv_diag = np.linalg.inv(diag_blocks)

    def apply_op(x: np.ndarray) -> np.ndarray:
        xf = np.where(free_col, x, 0.0)
        lu = laplacian_3(xf)
        llu = laplacian_3(lu)
        ax = np.einsum("nij,nj->ni", a_blocks, xf) + w_m * lu + w_b * llu
        return np.where(free_col, ax, x)

    du = np.zeros((n_u, 3), dtype=np.float64)
    r = rhs - apply_op(du)
    z = np.einsum("nij,nj->ni", inv_diag, r)
    z = np.where(free_col, z, 0.0)
    p = z.copy()
    rz = float(np.sum(r * z))
    it = 0
    for it in range(1, max_iter + 1):
        max_r = float(np.max(np.abs(r)))
        if abs(rz) < 1e-24 or max_r < 1e-7:
            break
        ap = apply_op(p)
        denom = float(np.sum(p * ap))
        if abs(denom) < 1e-24:
            break
        alpha = rz / denom
        du += alpha * p
        r -= alpha * ap
        z = np.einsum("nij,nj->ni", inv_diag, r)
        z = np.where(free_col, z, 0.0)
        rz_new = float(np.sum(r * z))
        p = z + (rz_new / rz) * p
        rz = rz_new

    du = np.where(free_col, du, 0.0)
    return du, {"cgIterations": it, "maxResidual": float(np.max(np.abs(r)))}


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


def closest_point_on_polyline(pts: np.ndarray, chain: np.ndarray) -> np.ndarray:
    """Vectorized closest point on a 3D polyline chain (K, 3) for each point in pts (N, 3)."""
    best_c = np.zeros_like(pts)
    best_d2 = np.full(len(pts), np.inf, dtype=np.float64)
    for k in range(len(chain) - 1):
        a = chain[k]
        ab = chain[k + 1] - a
        ab2 = max(float(ab @ ab), 1e-12)
        t = np.clip(((pts - a[None, :]) @ ab) / ab2, 0.0, 1.0)
        cand = a[None, :] + t[:, None] * ab[None, :]
        d2 = np.sum((pts - cand) ** 2, axis=1)
        upd = d2 < best_d2
        best_d2[upd] = d2[upd]
        best_c[upd] = cand[upd]
    return best_c


def compute_posed_radial_outward_vectors(
    posed_u: np.ndarray, rest_u: np.ndarray, part_u: np.ndarray, pose_info: dict, w_arm_tot_u: np.ndarray | None = None
) -> np.ndarray:
    """Compute smooth C1 outward radial unit vectors per unique vertex across trunk, pelvis/glutes/groin, and limbs."""
    n_u = len(posed_u)
    rad = np.column_stack([posed_u[:, 0], posed_u[:, 1], np.zeros(n_u, dtype=np.float64)])

    # Anatomical stadium focus on upper ribcage/chest/back (rz in 1.18..1.66) computed smoothly across trunk & shoulder blend zone
    m_up_tr = rest_u[:, 2] > 1.12
    if np.any(m_up_tr):
        px_u = posed_u[m_up_tr, 0]
        py_u = posed_u[m_up_tr, 1]
        rz_u = rest_u[m_up_tr, 2]
        w_stad = smoothstep((rz_u - 1.18) / 0.16) * (1.0 - smoothstep((rz_u - 1.65) / 0.06))
        f_x = (0.115 + 0.068 * smoothstep((rz_u - 1.36) / 0.10)) * w_stad
        cx_u = np.clip(px_u, -f_x, f_x)
        cy_u = -0.028 * smoothstep((rz_u - 1.74) / 0.06)
        w_skull_sph = smoothstep((rz_u - 1.85) / 0.05)
        cz_vec = w_skull_sph * (posed_u[m_up_tr, 2] - 1.925)
        rad[m_up_tr] = np.column_stack([px_u - cx_u, py_u - cy_u, cz_vec])

    # First compute limb segment-axis radial vectors for legs and arms (including wrist -> knuckle palm segment!)
    for spec in pose_info["sides"].values():
        sgn = float(spec["sign"])
        p_leg, p_arm = ("leg_l", "arm_l") if sgn > 0 else ("leg_r", "arm_r")
        leg_chain = np.array(spec["leg"]["posed"][:3], dtype=np.float64)  # hip -> knee -> ankle
        arm_chain = np.array(spec["arm"]["posed"][:4], dtype=np.float64)  # shoulder -> elbow -> wrist -> knuckle

        m_leg = part_u == p_leg
        if np.any(m_leg):
            c_leg = closest_point_on_polyline(posed_u[m_leg], leg_chain)
            # Keep 100% femur-centered medial (-sgn(X)) radial direction on inner thighs (|rx| < 0.048); blend pelvis center ONLY on lateral hips!
            w_pelvis = smoothstep((rest_u[m_leg, 2] - 1.008) / 0.020) * smoothstep((np.abs(rest_u[m_leg, 0]) - 0.048) / 0.030)
            px_leg = posed_u[m_leg, 0]
            cx_pelvis = np.where(np.abs(px_leg) <= np.abs(c_leg[:, 0]), px_leg, c_leg[:, 0])
            cx = w_pelvis * cx_pelvis + (1.0 - w_pelvis) * c_leg[:, 0]
            cy = -0.018 * w_pelvis + (1.0 - w_pelvis) * c_leg[:, 1]
            rad[m_leg] = np.column_stack([px_leg - cx, posed_u[m_leg, 1] - cy, np.zeros(m_leg.sum())])

        m_arm = part_u == p_arm
        if np.any(m_arm):
            c_arm = closest_point_on_polyline(posed_u[m_arm], arm_chain)
            v_arm = posed_u[m_arm] - c_arm
            v_arm[:, 2] *= 0.35
            w_fused_ax = smoothstep((posed_u[m_arm, 2] - 1.445) / 0.035) * (
                1.0 - smoothstep((rest_u[m_arm, 2] - 1.625) / 0.035)
            )
            min_out_x = 0.16 * np.abs(v_arm[:, 1])
            vx_clamped = sgn * np.maximum(sgn * v_arm[:, 0], min_out_x)
            v_arm[:, 0] = (1.0 - w_fused_ax) * v_arm[:, 0] + w_fused_ax * vx_clamped
            rad[m_arm] = v_arm

    # Pouch-free C-infinity sagittal projection unified across lower trunk AND upper thighs (rz in 0.840..1.12):
    hip_abs_x = 0.5 * (
        abs(float(pose_info["sides"]["plusX"]["leg"]["posed"][0][0]))
        + abs(float(pose_info["sides"]["minusX"]["leg"]["posed"][0][0]))
    )
    m_low_core = np.isin(part_u, ("trunk_neck", "leg_l", "leg_r")) & (rest_u[:, 2] >= 0.810) & (rest_u[:, 2] <= 1.12)
    if np.any(m_low_core):
        px_t = posed_u[m_low_core, 0]
        py_t = posed_u[m_low_core, 1]
        pz_t = posed_u[m_low_core, 2]
        rx_t = rest_u[m_low_core, 0]
        ry_t = rest_u[m_low_core, 1]
        rz_t = rest_u[m_low_core, 2]

        # Wide-X (4.8cm), tight-Y (2.0cm) & tight-Z (1.1cm) smoothing erases canonical genital pouch & inguinal notch
        # while preserving full anterior vs perineal vs posterior separation!
        k_c = np.exp(
            -0.5
            * (
                ((rx_t[:, None] - rx_t[None, :]) / 0.048) ** 2
                + ((rz_t[:, None] - rz_t[None, :]) / 0.011) ** 2
                + ((ry_t[:, None] - ry_t[None, :]) / 0.020) ** 2
            )
        )
        k_c /= np.maximum(k_c.sum(axis=1, keepdims=True), 1e-12)
        ry_pf = k_c @ ry_t
        rz_pf = k_c @ rz_t

        k_p = np.exp(
            -0.5
            * (
                ((px_t[:, None] - px_t[None, :]) / 0.048) ** 2
                + ((pz_t[:, None] - pz_t[None, :]) / 0.016) ** 2
                + ((py_t[:, None] - py_t[None, :]) / 0.032) ** 2
            )
        )
        k_p /= np.maximum(k_p.sum(axis=1, keepdims=True), 1e-12)
        py_pf = k_p @ py_t
        pz_pf = k_p @ pz_t

        # Perineal saddle fan centered at exact canonical perineal apex (ry = -0.007) with strong anterior/posterior reach!
        dy_c = 2.65 * (ry_pf + 0.007)
        dz_c = np.minimum(rz_pf - 1.034, -0.006)
        lc = np.maximum(np.hypot(dy_c, dz_c), 1e-8)
        dy_p = 2.10 * (py_pf + 0.007)
        dz_p = np.minimum(pz_pf - 1.004, -0.005)
        lp = np.maximum(np.hypot(dy_p, dz_p), 1e-8)
        sy = 0.60 * (dy_c / lc) + 0.40 * (dy_p / lp)
        sz = 0.60 * (dz_c / lc) + 0.40 * (dz_p / lp)
        ls = np.maximum(np.hypot(sy, sz), 1e-8)
        uy_sad = sy / ls
        uz_sad = sz / ls
        ux_sad = np.clip(rx_t * 0.45, -0.06, 0.06)

        is_tr = part_u[m_low_core] == "trunk_neck"
        w_pel = 1.0 - smoothstep((rz_t - 1.015) / 0.085)
        cx_pel = np.where(np.abs(px_t) <= hip_abs_x, px_t, np.sign(px_t) * hip_abs_x)
        cy_pel = -0.018 * w_pel
        dx_tr = px_t - w_pel * cx_pel
        dy_tr = py_t - cy_pel
        tr_len = np.maximum(np.hypot(dx_tr, dy_tr), 1e-8)
        cur_leg = rad[m_low_core]
        cur_leg_len = np.maximum(np.hypot(cur_leg[:, 0], cur_leg[:, 1]), 1e-8)
        ux_base = np.where(is_tr, dx_tr / tr_len, cur_leg[:, 0] / cur_leg_len)
        uy_base = np.where(is_tr, dy_tr / tr_len, cur_leg[:, 0] * 0.0 + cur_leg[:, 1] / cur_leg_len)

        # Pouch-free horizontal sagittal projection for full front groin & rear subgluteal domes
        dy_hor = 0.60 * (ry_pf + 0.007) + 0.40 * (py_pf + 0.007)
        uy_hor_raw = np.tanh(dy_hor / 0.018)
        ux_hor_raw = np.clip(0.55 * px_t, -0.09, 0.09)
        uz_hor_raw = -0.025 * smoothstep((rz_t - 0.895) / 0.035) * (1.0 - smoothstep((rz_t - 1.055) / 0.035))
        lh = np.maximum(np.sqrt(ux_hor_raw ** 2 + uy_hor_raw ** 2 + uz_hor_raw ** 2), 1e-8)
        ux_hor, uy_hor, uz_hor = ux_hor_raw / lh, uy_hor_raw / lh, uz_hor_raw / lh

        w_pel_h = (
            np.where(is_tr, 1.0, 0.0)
            * smoothstep((rz_t - 1.018) / 0.018)
            * (1.0 - smoothstep((np.abs(rx_t) - 0.058) / 0.034))
            * (1.0 - smoothstep((rz_t - 1.062) / 0.034))
            * smoothstep((np.abs(dy_hor) - 0.005) / 0.012)
        )
        ux_sheet = (1.0 - w_pel_h) * ux_base + w_pel_h * ux_hor
        uy_sheet = (1.0 - w_pel_h) * uy_base + w_pel_h * uy_hor
        uz_sheet = w_pel_h * uz_hor

        w_arch_3d = (
            (1.0 - smoothstep((np.abs(rx_t) - 0.008) / 0.008))
            * smoothstep((rz_t - 1.012) / 0.008)
            * (1.0 - smoothstep((rz_t - 1.026) / 0.010))
            * smoothstep((ry_t + 0.018) / 0.008)
            * (1.0 - smoothstep((ry_t - 0.016) / 0.008))
        )
        rad[m_low_core] = np.column_stack(
            [
                (1.0 - w_arch_3d) * ux_sheet + w_arch_3d * ux_sad,
                (1.0 - w_arch_3d) * uy_sheet + w_arch_3d * uy_sad,
                (1.0 - w_arch_3d) * uz_sheet + w_arch_3d * uz_sad,
            ]
        )

    norms = np.linalg.norm(rad, axis=1, keepdims=True)
    fallback = np.zeros_like(rad)
    fallback[:, 1] = -1.0
    return np.where(norms > 1e-8, rad / np.maximum(norms, 1e-8), fallback)


def direct_rest_space_nonrigid_fit(
    rest_all: np.ndarray,
    posed_0: np.ndarray,
    jac_all: np.ndarray,
    all_tri: np.ndarray,
    donor_xyz: np.ndarray,
    donor_tri: np.ndarray,
    masks: dict,
    pose_info: dict,
    high_tri: np.ndarray | None = None,
    rest_low: np.ndarray | None = None,
    low_tri: np.ndarray | None = None,
    map_faces: np.ndarray | None = None,
    map_weights: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray, dict]:
    """Solve directly for rest-space displacement U_rest on welded LOD0 + headSkin_sub."""
    connectivity = weld_connectivity(rest_all, all_tri)
    weld, (e_src, e_dst), v_mult, degree = connectivity
    n_u = len(v_mult)

    # Aggregate vertex properties onto unique welded vertices
    obs_gain = masks["canonicalObsGain"]
    hard_gain = masks["canonicalHardGain"]
    b_taper = masks["canonicalBoundaryTaper"]
    groin_inf_raw = masks["canonicalGroinInf"]
    thigh_inf_raw = masks["canonicalThighInf"]
    axilla_inf_raw = masks["canonicalAxillaInf"]
    arm_w_raw = masks["canonicalArmWeight"]
    elbow_blend_raw = masks["canonicalElbowBlend"]
    is_head_raw = masks["canonicalIsHead"]
    c_part = masks["canonicalPart"]

    w_obs_u = np.bincount(weld, weights=obs_gain, minlength=n_u) / v_mult
    h_u = np.bincount(weld, weights=hard_gain, minlength=n_u) / v_mult
    bt_u = np.bincount(weld, weights=b_taper, minlength=n_u) / v_mult
    groin_inf_u = np.bincount(weld, weights=groin_inf_raw, minlength=n_u) / v_mult
    thigh_inf_u = np.bincount(weld, weights=thigh_inf_raw, minlength=n_u) / v_mult
    axilla_inf_u = np.bincount(weld, weights=axilla_inf_raw, minlength=n_u) / v_mult
    w_arm_tot_u = np.bincount(weld, weights=arm_w_raw, minlength=n_u) / v_mult
    elbow_blend_u = np.bincount(weld, weights=elbow_blend_raw, minlength=n_u) / v_mult
    is_head_u = np.bincount(weld, weights=is_head_raw, minlength=n_u) / v_mult
    free_u = h_u > 1e-6

    # Pick representative raw index for each unique welded vertex (exact for rest_all, posed_0, jac, part)
    first_raw = np.zeros(n_u, dtype=np.int64)
    first_raw[weld[::-1]] = np.arange(len(weld) - 1, -1, -1)
    rest_u = rest_all[first_raw]
    rest_nrm_u = masks["canonicalRestNormals"][first_raw]
    posed_0_u = posed_0[first_raw]
    jac_u = jac_all[first_raw]  # (n_u, 3, 3)
    gtg_u = np.einsum("nji,njk->nik", jac_u, jac_u)  # J^T J (~I_3, full-rank 3x3 SPD)
    part_u = c_part[first_raw]

    coupled_stiff_raw = masks.get("canonicalCoupledStiff", np.ones(len(rest_all), dtype=np.float64))
    coupled_stiff_u = np.bincount(weld, weights=coupled_stiff_raw, minlength=n_u) / v_mult
    coupled_edge_boost = np.maximum(coupled_stiff_u[e_src], coupled_stiff_u[e_dst])

    # Per-edge Dirichlet weights: smooth inverse-length stiffness with an isotropic pelvic cap (<=1.35x on >=2.3mm quads) so dense
    # canonical inguinal/genital/subgluteal creases unfold freely, while keeping <2.0mm sliver seam pairs & micro-features coupled!
    edge_len = np.linalg.norm(rest_u[e_src] - rest_u[e_dst], axis=1)
    mean_edge_u = np.bincount(e_src, weights=edge_len, minlength=n_u) / degree
    edge_mid_z = 0.5 * (rest_u[e_src, 2] + rest_u[e_dst, 2])
    sliver_boost = 4.15 * (1.0 - smoothstep((edge_len - 0.0011) / 0.0012))
    stiff_cap = 1.35 + sliver_boost + (6.65 - sliver_boost) * smoothstep((edge_mid_z - 1.13) / 0.05)
    edge_stiff = np.minimum(np.clip((0.0082 / np.maximum(edge_len, 0.0014)) ** 1.15, 0.65, 8.0), stiff_cap) * coupled_edge_boost
    w_slot_relax = 1.0 - 0.82 * np.clip(np.maximum(thigh_inf_u[e_src], thigh_inf_u[e_dst]), 0.0, 1.0)
    edge_stiff = edge_stiff * w_slot_relax
    w_edge = edge_stiff / np.sqrt(degree[e_src] * degree[e_dst])
    diag_w = np.bincount(e_src, weights=w_edge, minlength=n_u)
    diag_w2 = diag_w ** 2 + np.bincount(e_src, weights=w_edge ** 2, minlength=n_u)

    # ZERO world-space boundary anchor pull toward lean u=0! Unobserved coupled micro-features (fingers, toes, eyelids,
    # nostrils, lips, ears) move freely in 3D via translation-invariant differential coupling L(u) + L^2(u)!
    w_anchor_u = np.zeros(n_u, dtype=np.float64)

    # Build per-part donor BVHTrees and pre-sample reverse donor-to-canonical pull samples from seam-smoothed bare_donor_xyz
    part_names = ("trunk_neck", "arm_l", "arm_r", "leg_l", "leg_r")
    donor_bvhs: dict[str, tuple[BVHTree, np.ndarray]] = {}
    donor_rev_samples: dict[str, tuple[np.ndarray, np.ndarray, np.ndarray]] = {}
    solver_donor_xyz = masks["donorBareSolverXyz"]
    z_br_rev = float(pose_info["donorLastSeparateArmTrunkZ"])
    sad_x_rev = float(pose_info["axillaSaddleAbsXM"])
    th_z_rev = float(pose_info["donorThighMergedMinZM"])
    z_ax_split_grid = np.asarray(masks["donorAxillaSplitZGrid"], dtype=np.float64)
    x_ax_split_grid = np.asarray(masks["donorAxillaSplitXM"], dtype=np.float64)
    z_ax_dome_tgt = float(masks["donorAxillaDomeZM"])

    def eval_x_split(z_arr: np.ndarray | float) -> np.ndarray | float:
        return np.interp(np.clip(z_arr, z_ax_split_grid[0], z_ax_split_grid[-1]), z_ax_split_grid, x_ax_split_grid)

    sample_counts = {"trunk_neck": 14000, "arm_l": 4000, "arm_r": 4000, "leg_l": 6500, "leg_r": 6500}
    for pname in part_names:
        f_ids = np.flatnonzero(masks["donorPartMasks"][pname])
        u_v, inv = np.unique(donor_tri[f_ids].ravel(), return_inverse=True)
        donor_bvhs[pname] = (
            BVHTree.FromPolygons(solver_donor_xyz[u_v].tolist(), inv.reshape(-1, 3).tolist(), all_triangles=True),
            f_ids,
        )

    # Unified body_core (trunk_neck + leg_l + leg_r) BVH & reverse sample set eliminates open-boundary pile-up across trunk/leg crotch!
    f_core = np.flatnonzero(
        masks["donorPartMasks"]["trunk_neck"] | masks["donorPartMasks"]["leg_l"] | masks["donorPartMasks"]["leg_r"]
    )
    canon_th_z = float(pose_info.get("canonicalThighMergedMinZM", 1.00))
    z_sad_floor = float(masks.get("donorPerinealSaddleZM", max(th_z_rev - 0.008, 0.900)))
    tri_core_raw = donor_tri[f_core]
    c_core_tri = solver_donor_xyz[tri_core_raw].mean(axis=1)
    n_core_raw = np.cross(
        solver_donor_xyz[tri_core_raw[:, 1]] - solver_donor_xyz[tri_core_raw[:, 0]],
        solver_donor_xyz[tri_core_raw[:, 2]] - solver_donor_xyz[tri_core_raw[:, 0]],
    )
    n_core_tri = n_core_raw / np.maximum(np.linalg.norm(n_core_raw, axis=1, keepdims=True), 1e-12)
    keep_core_tri = ~(
        (
            (c_core_tri[:, 2] <= z_sad_floor - 0.002)
            & (np.abs(c_core_tri[:, 0]) <= 0.038)
            & (c_core_tri[:, 1] >= -0.155)
            & (c_core_tri[:, 1] <= 0.070)
        )
        | (
            (c_core_tri[:, 2] >= z_sad_floor - 0.012)
            & (c_core_tri[:, 2] <= 0.948)
            & (np.abs(c_core_tri[:, 0]) <= 0.034)
            & (np.abs(n_core_tri[:, 0]) > 0.52)
        )
    )
    f_core_clean = f_core[keep_core_tri]
    u_vc, inv_vc = np.unique(donor_tri[f_core_clean].ravel(), return_inverse=True)
    core_bvh_fg = BVHTree.FromPolygons(solver_donor_xyz[u_vc].tolist(), inv_vc.reshape(-1, 3).tolist(), all_triangles=True)
    s_core, n_core, lf_core, _ = sample_surface_with_normals(solver_donor_xyz, donor_tri[f_core], 26000)
    gf_core = f_core[lf_core]
    x_split_core = eval_x_split(s_core[:, 2])
    keep_core = (
        (s_core[:, 2] <= 2.040)
        & ~(
            (s_core[:, 2] >= max(z_ax_dome_tgt - 0.022, 1.460))
            & (s_core[:, 2] <= 1.558)
            & (np.abs(s_core[:, 0]) >= x_split_core - 0.018)
            & (s_core[:, 1] >= -0.038)
            & (s_core[:, 1] <= 0.050)
            & (np.abs(n_core[:, 1]) < 0.55)
        )
        & ~(
            (s_core[:, 2] <= z_sad_floor - 0.004)
            & (np.abs(s_core[:, 0]) <= 0.016)
            & (s_core[:, 1] >= -0.125)
            & (s_core[:, 1] <= 0.045)
        )
        & ~(
            (s_core[:, 2] >= z_sad_floor - 0.010)
            & (s_core[:, 2] <= 0.948)
            & (np.abs(s_core[:, 0]) <= 0.028)
            & (np.abs(n_core[:, 0]) > 0.52)
        )
    )
    donor_rev_samples["body_core"] = (s_core[keep_core], n_core[keep_core], gf_core[keep_core])

    f_upper_ext = np.flatnonzero(
        masks["donorPartMasks"]["trunk_neck"] | masks["donorPartMasks"]["arm_l"] | masks["donorPartMasks"]["arm_r"]
    )
    u_ue, inv_ue = np.unique(donor_tri[f_upper_ext].ravel(), return_inverse=True)
    upper_ext_bvh = BVHTree.FromPolygons(
        solver_donor_xyz[u_ue].tolist(), inv_ue.reshape(-1, 3).tolist(), all_triangles=True
    )

    for pname in ("arm_l", "arm_r"):
        f_ids = np.flatnonzero(masks["donorPartMasks"][pname])
        s_pts, s_nrm, local_f, _ = sample_surface_with_normals(solver_donor_xyz, donor_tri[f_ids], sample_counts[pname])
        glob_f = f_ids[local_f]
        side_key = "plusX" if pname == "arm_l" else "minusX"
        _, _, wr_p_s, ha_p_s = [np.array(p, dtype=np.float64) for p in pose_info["sides"][side_key]["arm"]["posed"]]
        h_ax_p = (ha_p_s - wr_p_s) / max(float(np.linalg.norm(ha_p_s - wr_p_s)), 1e-8)
        s_arm_d = (s_pts - wr_p_s[None, :]) @ h_ax_p
        # Include full wrist, carpus & metacarpal palm/dorsum up to 0.90*L_palm (selecting dorsal/palmar faces, excluding sideways thumb-web crevices)!
        l_palm_s = max(float(np.linalg.norm(ha_p_s - wr_p_s)), 0.075)
        keep_arm = (s_arm_d <= 0.30 * l_palm_s) | ((s_arm_d <= 0.90 * l_palm_s) & (np.abs(s_nrm[:, 0]) > 0.42))
        donor_rev_samples[pname] = (s_pts[keep_arm], s_nrm[keep_arm], glob_f[keep_arm])

    # Precompute welded canonical triangle part ownership for reverse donor pull (including midline perineal arch border triangles!)
    tri_u = weld[all_tri]
    perin_arch_tri = (
        (w_obs_u[tri_u].max(axis=1) >= 0.65)
        & (rest_u[tri_u, 2].min(axis=1) >= 0.995)
        & (np.abs(rest_u[tri_u, 0]).max(axis=1) <= 0.028)
    )
    tri_obs = ((w_obs_u[tri_u].min(axis=1) >= 0.35) | perin_arch_tri) & free_u[tri_u].all(axis=1)
    tri_part = part_u[tri_u[:, 0]]
    rev_groups = (
        ("body_core", np.isin(tri_part, ("trunk_neck", "leg_l", "leg_r"))),
        ("arm_l", tri_part == "arm_l"),
        ("arm_r", tri_part == "arm_r"),
    )

    # Exact sagittal midline X=0 pin + 3D Tutte harmonic unfolding of canonical genital/inguinoscrotal pouch (unfold_u)
    mid_u = free_u & (rest_u[:, 2] <= 2.040) & (np.abs(rest_u[:, 0]) <= 0.00025)
    sep_u = (
        free_u
        & (rest_u[:, 2] <= 2.040)
        & (np.abs(rest_u[:, 0]) > 0.00025)
        & (np.abs(rest_u[:, 0]) < 0.065)
    )
    sgn_x_u = np.sign(rest_u[:, 0])

    rz_slot_bot = 0.720
    dz_slot_crotch = min((z_sad_floor + 0.0005) - 1.019, 0.0) if (th_z_rev < canon_th_z - 0.008) else 0.0
    slot_active_u = np.zeros(n_u, dtype=bool)
    perin_floor_u = np.zeros(n_u, dtype=bool)
    crotch_hidden_u = np.zeros(n_u, dtype=bool)

    # Exact canonical midline arch curve z_mid_y_u + topological harmonic bridge field w_bridged_pel_u:
    # Separates the bridged pelvic/scrotal/perineal sheet (X=0 exists, outward/sagittal normals) from the two separated thigh cylinders
    # (inward medial-thigh normals sgn_x * nrm_x < -0.15) with C2 smoothness and ZERO boolean step cliffs!
    mid_arch_u_m = mid_u & (rest_u[:, 2] >= 1.010) & (rest_u[:, 2] <= 1.130)
    if np.any(mid_arch_u_m):
        ma_ord = np.argsort(rest_u[mid_arch_u_m, 1])
        ma_y = rest_u[mid_arch_u_m, 1][ma_ord]
        ma_z = rest_u[mid_arch_u_m, 2][ma_ord]
        z_mid_y_u = np.interp(np.clip(rest_u[:, 1], ma_y[0], ma_y[-1]), ma_y, ma_z)
    else:
        z_mid_y_u = np.full(n_u, 1.019, dtype=np.float64)

    deg_f64 = np.maximum(degree.astype(np.float64), 1.0)
    w_cot_raw = compute_clipped_cotan_edge_weights(rest_u, tri_u, e_src, e_dst, n_u)
    # Keep w_cot_x excluding mid_u (|rx|<=1mm) strictly for 1D X-harmonic unfolding so 0.8mm midline slivers never widen,
    # while healing obtuse pouch/perineal crease edges across X=0 in 3D Y/Z surface fairing (w_cot_e) so X=0 never recesses into a V-notch!
    w_scrot_pkt_x = (
        smootherstep((np.abs(rest_u[:, 0]) - 0.0010) / 0.0020)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.0180) / 0.0080))
        * smootherstep((-rest_u[:, 1] - 0.020) / 0.012)
        * smootherstep((rest_u[:, 2] - 1.008) / 0.010)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.045) / 0.015))
    )
    scrot_pkt_ex = np.minimum(w_scrot_pkt_x[e_src], w_scrot_pkt_x[e_dst])
    w_cot_x = (1.0 - scrot_pkt_ex) * w_cot_raw + scrot_pkt_ex * 1.0
    deg_cot_x = np.maximum(np.bincount(e_src, weights=w_cot_x, minlength=n_u), 1e-12)

    w_thigh_slot_wall_u = (
        (1.0 - smootherstep((rest_u[:, 2] - 1.011) / 0.009))
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.024) / 0.012))
        * smootherstep((rest_u[:, 1] + 0.044) / 0.014)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.034) / 0.014))
        * smootherstep((-sgn_x_u * rest_nrm_u[:, 0] - 0.55) / 0.25)
    )
    w_no_slot_pull_e = 1.0 - 0.88 * w_thigh_slot_wall_u[e_dst] * (1.0 - w_thigh_slot_wall_u[e_src])

    w_scrot_pkt_v = (
        (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.0180) / 0.0080))
        * (1.0 - smootherstep((rest_u[:, 1] - 0.085) / 0.018))
        * smootherstep((rest_u[:, 2] - 1.000) / 0.010)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.115) / 0.018))
    )
    scrot_pkt_e = np.minimum(w_scrot_pkt_v[e_src], w_scrot_pkt_v[e_dst])
    w_cot_e = (1.0 - scrot_pkt_e) * w_cot_raw + scrot_pkt_e * 1.0
    deg_cot_u = np.maximum(np.bincount(e_src, weights=w_cot_e, minlength=n_u), 1e-12)
    pel_cot_v = smootherstep((1.160 - rest_u[:, 2]) / 0.040) * smootherstep((rest_u[:, 2] - 0.850) / 0.040)
    pel_cot_eb = np.maximum(pel_cot_v[e_src], pel_cot_v[e_dst])
    w_pel_e = (1.0 - pel_cot_eb) * 1.0 + pel_cot_eb * w_cot_e
    deg_pel_u = np.maximum(np.bincount(e_src, weights=w_pel_e, minlength=n_u), 1e-12)

    pin_br_one = mid_u | (rest_u[:, 2] >= 1.085)
    pin_br_zero = (rest_u[:, 2] <= 1.006) | ((rest_u[:, 2] < 1.085) & (np.abs(rest_u[:, 0]) >= 0.072))
    w_br_topo = np.where(pin_br_one, 1.0, 0.0)
    br_free_idx = np.flatnonzero(~(pin_br_one | pin_br_zero))
    if len(br_free_idx):
        br_in = np.zeros(n_u, dtype=bool)
        br_in[br_free_idx] = True
        br_sub = br_in[e_src]
        br_es_g = e_src[br_sub]
        br_ed_g = e_dst[br_sub]
        br_ew_sub = w_cot_e[br_sub]
        br_g2l = np.full(n_u, -1, dtype=np.int64)
        br_g2l[br_free_idx] = np.arange(len(br_free_idx))
        br_es_loc = br_g2l[br_es_g]
        br_deg_loc = deg_cot_u[br_free_idx]
        for _ in range(1500):
            w_br_topo[br_free_idx] = (
                np.bincount(br_es_loc, weights=br_ew_sub * w_br_topo[br_ed_g], minlength=len(br_free_idx)) / br_deg_loc
            )
    upper_natal_cleft_u = smootherstep((rest_u[:, 1] - 0.004) / 0.016) * smootherstep((rest_u[:, 2] - 1.014) / 0.014)
    bridged_sheet_u = (
        smootherstep((rest_u[:, 2] - 1.016) / 0.010)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.022) / 0.014))
        * smootherstep((rest_u[:, 1] + 0.098) / 0.018)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.072) / 0.018))
    )
    inward_thigh_raw = smootherstep((-sgn_x_u * rest_nrm_u[:, 0] - 0.16) / 0.36) * (
        1.0 - np.maximum(upper_natal_cleft_u, bridged_sheet_u)
    )
    not_inward_thigh_u = np.where(mid_u, 1.0, np.where(rest_u[:, 2] <= 0.992, 0.0, 1.0 - inward_thigh_raw))
    nit_free = (~mid_u) & (rest_u[:, 2] > 0.992) & (rest_u[:, 2] < 1.085) & (np.abs(rest_u[:, 0]) < 0.072)
    for _ in range(18):
        nbr_nit = np.bincount(e_src, weights=w_cot_e * not_inward_thigh_u[e_dst], minlength=n_u) / deg_cot_u
        not_inward_thigh_u[nit_free] = 0.18 * not_inward_thigh_u[nit_free] + 0.82 * nbr_nit[nit_free]
    w_bridged_pel_u = smootherstep((w_br_topo - 0.35) / 0.38) * not_inward_thigh_u

    # Solve 2,800-iter 3D Tutte harmonic unfolding strictly respecting the leg bifurcation:
    # (Y, Z) unfold diffeomorphically down to rz=0.960 (ZERO scrotal-to-thigh Y fold-over!), while X-unfolding runs smoothly
    # on w_bridged_pel_u (ZERO step cliff on scrotal pouch, ZERO outward doorway on separated thigh cylinders!).
    x_half_unfold = 0.024 + 0.038 * smootherstep((0.022 - rest_u[:, 1]) / 0.038)
    w_groin_base_u = np.where(
        free_u,
        (1.0 - smootherstep((np.abs(rest_u[:, 0]) - x_half_unfold) / 0.022))
        * smootherstep((rest_u[:, 2] - 0.960) / 0.045)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.112) / 0.024))
        * (1.0 - smootherstep((rest_u[:, 1] - 0.032) / 0.020)),
        0.0,
    )
    w_groin_x_u = w_groin_base_u * w_bridged_pel_u
    w_cleft_base_u = np.where(
        free_u,
        0.85
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.024) / 0.012))
        * smootherstep((rest_u[:, 2] - 0.985) / 0.025)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.125) / 0.022))
        * smootherstep((rest_u[:, 1] - 0.004) / 0.012),
        0.0,
    )
    w_tutte_u = np.maximum(w_groin_base_u, w_cleft_base_u)
    unfold_u = rest_u.copy()
    unfold_u[mid_u, 0] = 0.0
    tt_idx = np.flatnonzero(w_tutte_u > 1e-3)
    if len(tt_idx):
        tt_in = np.zeros(n_u, dtype=bool)
        tt_in[tt_idx] = True
        tt_sub = tt_in[e_src]
        tt_es_g = e_src[tt_sub]
        tt_ed_g = e_dst[tt_sub]
        tt_ew_sub_x = w_cot_x[tt_sub]
        tt_ew_sub = w_cot_e[tt_sub]
        tt_g2l = np.full(n_u, -1, dtype=np.int64)
        tt_g2l[tt_idx] = np.arange(len(tt_idx))
        tt_es_loc = tt_g2l[tt_es_g]
        tt_deg_loc_x = deg_cot_x[tt_idx]
        tt_deg_loc = deg_cot_u[tt_idx]
        tt_w_xyz = np.column_stack([w_groin_x_u[tt_idx], w_tutte_u[tt_idx], w_tutte_u[tt_idx]])
        for _ in range(2800):
            nbr_tt = np.column_stack(
                [
                    np.bincount(tt_es_loc, weights=tt_ew_sub_x * unfold_u[tt_ed_g, 0], minlength=len(tt_idx)) / tt_deg_loc_x,
                    np.bincount(tt_es_loc, weights=tt_ew_sub * unfold_u[tt_ed_g, 1], minlength=len(tt_idx)) / tt_deg_loc,
                    np.bincount(tt_es_loc, weights=tt_ew_sub * unfold_u[tt_ed_g, 2], minlength=len(tt_idx)) / tt_deg_loc,
                ]
            )
            unfold_u[tt_idx] += (0.92 * tt_w_xyz) * (nbr_tt - unfold_u[tt_idx])
            unfold_u[mid_u, 0] = 0.0

    # Smooth C2 anterior-to-perineal X-harmonic polishing (weighted by w_bridged_pel_u: ZERO hard boolean step cliff!)
    w_ph_u = np.where(
        free_u & (~mid_u),
        w_bridged_pel_u
        * (1.0 - smootherstep((np.abs(unfold_u[:, 0]) - 0.052) / 0.018))
        * (1.0 - smootherstep((unfold_u[:, 2] - 1.096) / 0.022))
        * (1.0 - smootherstep((unfold_u[:, 1] - 0.018) / 0.012)),
        0.0,
    )
    ph_idx = np.flatnonzero(w_ph_u > 1e-3)
    rx_pel_u = unfold_u[:, 0].copy()
    rx_pel_u[mid_u] = 0.0
    if len(ph_idx):
        ph_in = np.zeros(n_u, dtype=bool)
        ph_in[ph_idx] = True
        ph_sub = ph_in[e_src]
        ph_es_g = e_src[ph_sub]
        ph_ed_g = e_dst[ph_sub]
        ph_ew_sub = w_cot_x[ph_sub]
        ph_g2l = np.full(n_u, -1, dtype=np.int64)
        ph_g2l[ph_idx] = np.arange(len(ph_idx))
        ph_es_loc = ph_g2l[ph_es_g]
        ph_deg_loc = deg_cot_x[ph_idx]
        w_ph_loc = 0.90 * w_ph_u[ph_idx]
        for _ in range(900):
            nbr_ph = np.bincount(ph_es_loc, weights=ph_ew_sub * rx_pel_u[ph_ed_g], minlength=len(ph_idx)) / ph_deg_loc
            rx_pel_u[ph_idx] += w_ph_loc * (nbr_ph - rx_pel_u[ph_idx])
            rx_pel_u[mid_u] = 0.0
    unfold_u[:, 0] = rx_pel_u

    # Measure actual bottom of unfolded canonical midline perineal arch (|unfold_x| < 1.8mm, excluding inner thigh!)
    arch_mid_m = (np.abs(unfold_u[:, 0]) < 0.0018) & (unfold_u[:, 2] > 0.995) & (unfold_u[:, 2] < 1.065)
    z_canon_arch_min = float(np.min(unfold_u[arch_mid_m, 2])) if np.any(arch_mid_m) else 1.0191
    z_bare_sad_floor = max(z_sad_floor + 0.0085, 0.9035)
    dz_slot_crotch = min((z_bare_sad_floor + 0.0015) - z_canon_arch_min, 0.0) if (th_z_rev < canon_th_z - 0.008) else 0.0

    # Recompute solver edge lengths & Dirichlet weights on UNFOLDED chart unfold_u so canonical pouch creases have ZERO stiffness spike,
    # and suppress 90-deg quad diagonals inside pel_cot_eb so L(u) and L^2(u) have ZERO 3:1 V-spike at X=0 and valence-5 poles!
    edge_len = np.linalg.norm(unfold_u[e_src] - unfold_u[e_dst], axis=1)
    mean_edge_u = np.bincount(e_src, weights=edge_len, minlength=n_u) / degree
    edge_mid_z = 0.5 * (unfold_u[e_src, 2] + unfold_u[e_dst, 2])
    sliver_boost = 4.15 * (1.0 - smoothstep((edge_len - 0.0011) / 0.0012))
    stiff_cap = 1.35 + sliver_boost + (6.65 - sliver_boost) * smoothstep((edge_mid_z - 1.13) / 0.05)
    edge_stiff_base = np.minimum(np.clip((0.0082 / np.maximum(edge_len, 0.0014)) ** 1.15, 0.65, 8.0), stiff_cap) * coupled_edge_boost
    edge_stiff_base = edge_stiff_base * ((1.0 - pel_cot_eb) + pel_cot_eb * (0.28 + 0.72 * w_cot_e))
    w_edge = edge_stiff_base / np.sqrt(degree[e_src] * degree[e_dst])
    diag_w = np.bincount(e_src, weights=w_edge, minlength=n_u)
    diag_w2 = diag_w ** 2 + np.bincount(e_src, weights=w_edge ** 2, minlength=n_u)

    w_len_e = 1.0 / np.maximum(edge_len, 0.0012)
    diag_len_w = np.maximum(np.bincount(e_src, weights=w_len_e, minlength=n_u), 1e-12)

    # Bifurcation-aware Rest-space X clearance:
    # - Bridged pelvic sheet (w_bridged_pel_u=1): monotonically increasing column spacing so groin columns never pile up;
    # - Separated thigh cylinders (w_bridged_pel_u=0): clean 2.8mm Rest half-gap (5.6mm total air gap) so medial thighs swell naturally!
    min_x_pel = 0.62 * np.minimum(np.abs(rx_pel_u), 0.0055) + 0.32 * np.clip(np.abs(rx_pel_u) - 0.0055, 0.0, 0.026)
    min_x_thigh = np.minimum(0.0028, 0.85 * np.abs(rest_u[:, 0]))
    min_x_upper = np.where(
        rest_u[:, 2] >= 1.75,
        np.minimum(0.75 * np.abs(rest_u[:, 0]), 0.0022),
        0.62 * np.minimum(np.abs(rest_u[:, 0]), 0.0055),
    )
    min_x_u = np.where(
        rest_u[:, 2] < 1.16,
        (1.0 - w_bridged_pel_u) * min_x_thigh + w_bridged_pel_u * min_x_pel,
        min_x_upper,
    )

    # Anchor midline perineal & lower-crotch/cleft bridge (|unfold_x| <= 24mm, unfold_y in -65..+88mm) to one V-slit-free, spike-free arch:
    # Strictly exclude vertical inward-facing medial-thigh sidewall triangles (-sgn_x * rest_nrm_x > 0.24) so vertical sidewall rows never pancake!
    not_sidewall_ps_u = np.where(mid_u, 1.0, 1.0 - smootherstep((-sgn_x_u * rest_nrm_u[:, 0] - 0.24) / 0.24))
    w_perin_sad_u = (
        np.where(free_u & (dz_slot_crotch < -0.005), 1.0, 0.0)
        * not_sidewall_ps_u
        * smootherstep((rest_u[:, 2] - 0.996) / 0.010)
        * (1.0 - smootherstep((np.abs(unfold_u[:, 0]) - 0.0220) / 0.0160))
        * smoothstep((unfold_u[:, 2] - (z_canon_arch_min - 0.022)) / 0.0100)
        * (1.0 - smoothstep((unfold_u[:, 2] - (z_canon_arch_min + 0.028)) / 0.0140))
        * smoothstep((unfold_u[:, 1] + 0.065) / 0.016)
        * (1.0 - smoothstep((unfold_u[:, 1] - 0.088) / 0.022))
    )
    z_perin_tgt_u = (
        z_bare_sad_floor
        - 0.0028 * smoothstep((unfold_u[:, 1] + 0.004) / 0.024)
        + 0.0080 * smootherstep((-unfold_u[:, 1] - 0.022) / 0.032)
        + 0.0016 * (np.clip(np.abs(unfold_u[:, 0]) / 0.0280, 0.0, 1.0) ** 2)
    )
    perin_sad_act_u = w_perin_sad_u > 1e-3

    # Sagittal X-lane guidance strictly on the bridged pelvic sheet (w_bridged_pel_u > 0), leaving separated inner thighs 100% free!
    pel_x_scale = 1.0 + 0.12 * float(smoothstep(np.array([(-dz_slot_crotch - 0.020) / 0.075]))[0])
    w_pel_lane_u = (
        np.where(free_u & (~mid_u), 1.0, 0.0)
        * w_bridged_pel_u
        * (1.0 - smoothstep((np.abs(rx_pel_u) - 0.052) / 0.018))
        * (1.0 - smoothstep((unfold_u[:, 2] - 1.088) / 0.028))
    )
    x_pel_lane_tgt_u = sgn_x_u * np.maximum(pel_x_scale * np.abs(rx_pel_u), min_x_u + 0.0006)
    pel_lane_act_u = w_pel_lane_u > 1e-3

    # Strictly monotonic REST-X cap across the trunk-side axillary wall (rz in 1.502..1.612, ry in -0.092..+0.075, |rx| in 0.162..0.206)
    # Keeps trunk_neck v=1758 (~0.223m) strictly medial to the adducted arm_l/arm_r ring (~0.238m) with ZERO triangle inversions,
    # while remaining +43mm fuller than lean F=0 so the armpit never pinches inward!
    w_ax_nrm = smoothstep((sgn_x_u * rest_nrm_u[:, 0] - 0.25) / 0.20)
    w_ax_rib_u = (
        np.where(free_u & (part_u == "trunk_neck"), 1.0, 0.0)
        * w_ax_nrm
        * (1.0 - smoothstep((w_arm_tot_u - 0.22) / 0.22))
        * smoothstep((np.abs(rest_u[:, 0]) - 0.162) / 0.014)
        * (1.0 - smoothstep((np.abs(rest_u[:, 0]) - 0.206) / 0.014))
        * smoothstep((rest_u[:, 2] - 1.502) / 0.018)
        * (1.0 - smoothstep((rest_u[:, 2] - 1.612) / 0.018))
        * smoothstep((rest_u[:, 1] + 0.028) / 0.018)
        * (1.0 - smoothstep((rest_u[:, 1] - 0.072) / 0.020))
    )
    ax_rib_u = w_ax_rib_u > 1e-3
    x_split_rest_u = eval_x_split(rest_u[:, 2])
    ax_rib_rest_cap_x_u = (
        (x_split_rest_u - 0.018)
        + 0.62 * np.clip(np.abs(rest_u[:, 0]) - 0.170, 0.0, 0.032)
        + 0.012 * smootherstep((-rest_u[:, 1] - 0.008) / 0.024)
    )
    lat_occ_raw = masks.get("canonicalLatTrunkOcc", np.zeros(len(rest_all), dtype=np.float64))
    lat_occ_u = np.bincount(weld, weights=lat_occ_raw, minlength=n_u) / v_mult
    w_lat_serratus_u = (
        np.where(free_u & (part_u == "trunk_neck"), 1.0, 0.0)
        * lat_occ_u
        * smootherstep((rest_u[:, 2] - 1.366) / 0.024)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.468) / 0.030))
        * smoothstep((rest_u[:, 1] + 0.058) / 0.020)
        * (1.0 - smoothstep((rest_u[:, 1] - 0.012) / 0.020))
        * smoothstep((sgn_x_u * rest_nrm_u[:, 0] - 0.56) / 0.18)
    )
    lat_serratus_act_u = w_lat_serratus_u > 0.03
    w_ax_y_corr_u = (
        np.where(free_u, 1.0, 0.0)
        * smoothstep((axilla_inf_u - 0.25) / 0.25)
        * (1.0 - smoothstep((w_obs_u - 0.15) / 0.20))
        * smoothstep((rest_u[:, 2] - 1.390) / 0.025)
        * (1.0 - smoothstep((rest_u[:, 2] - 1.515) / 0.022))
        * smoothstep((rest_u[:, 1] + 0.042) / 0.016)
        * (1.0 - smoothstep((rest_u[:, 1] - 0.016) / 0.016))
    )
    y_ax_corr_floor_u = 1.25 * posed_0_u[:, 1] - 0.016
    y_ax_corr_ceil_u = 1.35 * posed_0_u[:, 1] + 0.026

    # Donor-proportional Rest-space anterior/central axillary unpinch (lowers high anterior armpit crease in Rest A-pose
    # down into a smooth rounded arch matching donorAxillaDomeZM — including forward-facing hinge vertices where w_obs_u==1 —
    # while leaving top deltoid/clavicle 100% untouched!)
    dz_ax_dome = float(np.clip(1.522 - z_ax_dome_tgt, 0.0, 0.058))
    w_ant_ax_unpinch_u = (
        np.where(free_u & (dz_ax_dome > 0.006), 1.0, 0.0)
        * smootherstep((np.abs(rest_u[:, 0]) - 0.164) / 0.020)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.262) / 0.024))
        * smootherstep((rest_u[:, 2] - 1.495) / 0.020)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.582) / 0.024))
        * smootherstep((rest_u[:, 1] + 0.095) / 0.024)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.018) / 0.022))
        * smootherstep((0.26 - rest_nrm_u[:, 2]) / 0.40)
    )
    ant_ax_unpinch_act_u = w_ant_ax_unpinch_u > 0.02
    du_z_ant_ax_tgt = -0.62 * dz_ax_dome
    du_y_ant_ax_tgt = -0.14 * dz_ax_dome

    # Measure donor posterior upper-trunk lateral half-width profile (Y > 0.032m, Z=1.32..1.58m) so sub_ax_trunk
    # follows the donor's natural back V-taper without pinching Z=1.39..1.46m inward or protruding below the armpit!
    f_tr_don = donor_tri[masks["donorPartMasks"]["trunk_neck"]]
    v_tr_don = solver_donor_xyz[np.unique(f_tr_don.ravel())]
    z_post_grid = np.linspace(1.320, 1.580, 53)
    x_post_don_grid = eval_x_split(z_post_grid)
    for zi_p, zv_p in enumerate(z_post_grid):
        mp_d = (v_tr_don[:, 1] > 0.030) & (np.abs(v_tr_don[:, 2] - zv_p) < 0.010)
        if np.sum(mp_d) >= 6:
            x_post_don_grid[zi_p] = max(
                float(np.percentile(np.abs(v_tr_don[mp_d, 0]), 98)),
                float(eval_x_split(np.array([zv_p]))[0]) + 0.006 * float(smootherstep(np.array([(zv_p - 1.380) / 0.065]))[0]),
            )
    # Enforce monotonic V-taper above Z=1.365m so the first back fold under the armpit never protrudes laterally past upper lats:
    for zi_m in range(1, len(z_post_grid)):
        if z_post_grid[zi_m] >= 1.365:
            x_post_don_grid[zi_m] = max(x_post_don_grid[zi_m], x_post_don_grid[zi_m - 1] + 0.0004)
    for _ in range(8):
        x_post_don_grid[1:-1] = 0.25 * x_post_don_grid[:-2] + 0.50 * x_post_don_grid[1:-1] + 0.25 * x_post_don_grid[2:]

    # Measure anterior inframammary pectoral crease (z_rt AND y_rt!) directly from trunk_neck BVH across full breast width
    trunk_bvh_crease = donor_bvhs["trunk_neck"][0]
    x_pec_grid = np.linspace(-0.196, 0.196, 85)
    z_pec_val_grid = np.full_like(x_pec_grid, 1.454)
    y_pec_val_grid = np.full_like(x_pec_grid, -0.195)
    w_pec_fold_grid = np.zeros_like(x_pec_grid)
    z_pec_scan = np.linspace(1.395, 1.535, 141)
    ray_py_c = Vector((0.0, 1.0, 0.0))
    ray_my_c = Vector((0.0, -1.0, 0.0))
    for xi, xv in enumerate(x_pec_grid):
        if abs(xv) < 0.032 or abs(xv) > 0.192:
            continue
        ys = np.full_like(z_pec_scan, np.nan)
        for zi_s, zv_s in enumerate(z_pec_scan):
            hc, hnc, _, _ = trunk_bvh_crease.ray_cast(Vector((float(xv), -0.40, float(zv_s))), ray_py_c, 0.36)
            if hc is not None and float(hnc.y) < -0.16:
                ys[zi_s] = float(hc.y)
        best_tuck = 0.0
        best_k = -1
        for k in range(2, len(z_pec_scan) - 2):
            zv_k = float(z_pec_scan[k])
            if zv_k < 1.414 or zv_k > 1.512 or not np.all(np.isfinite(ys[k - 1 : k + 2])):
                continue
            if ys[k] < ys[k - 1] - 1e-6 or ys[k] < ys[k + 1] - 1e-6:
                continue
            y_rt_k = float(ys[k])
            ab_m = np.isfinite(ys) & (z_pec_scan >= zv_k + 0.010) & (z_pec_scan <= min(zv_k + 0.044, 1.534))
            bl_m = np.isfinite(ys) & (z_pec_scan >= max(zv_k - 0.042, 1.395)) & (z_pec_scan <= zv_k - 0.010)
            if not np.any(ab_m) or not np.any(bl_m):
                continue
            tuck_ab = y_rt_k - float(np.min(ys[ab_m]))
            tuck_bl = y_rt_k - float(np.min(ys[bl_m]))
            tuck_eff_k = min(tuck_ab, 0.65 * tuck_bl)
            if tuck_eff_k > best_tuck:
                best_tuck = tuck_eff_k
                best_k = k
        if best_k >= 0 and best_tuck > 0.0008 and abs(xv) <= 0.170:
            z_pec_val_grid[xi] = float(z_pec_scan[best_k])
            y_pec_val_grid[xi] = float(ys[best_k])
            w_pec_fold_grid[xi] = float(
                smoothstep((best_tuck - 0.0008) / 0.0026)
                * smootherstep((abs(xv) - 0.032) / 0.018)
                * (1.0 - smootherstep((abs(xv) - 0.156) / 0.024))
            )
    # Follow the raw donor's TRUE low-hanging heavy pectoral fold all the way to its outer-lower cup bottom at |X|~0.145m (~1442.5mm)
    # and curve smoothly upward ONLY past |X|=0.152m into the ~1488mm anterior axillary fold:
    for sgn_side in (-1.0, 1.0):
        anchor_m = (sgn_side * x_pec_grid >= 0.136) & (sgn_side * x_pec_grid <= 0.150) & (w_pec_fold_grid > 0.08)
        lat_m = sgn_side * x_pec_grid > 0.150
        if np.any(anchor_m) and np.any(lat_m):
            z_cup_low = float(np.median(z_pec_val_grid[anchor_m]))
            y_cup_low = float(np.median(y_pec_val_grid[anchor_m]))
            s_cup_up = smootherstep((np.abs(x_pec_grid[lat_m]) - 0.150) / 0.036)
            w_cup_up = smootherstep((np.abs(x_pec_grid[lat_m]) - 0.150) / 0.018)
            z_pec_val_grid[lat_m] = (1.0 - w_cup_up) * z_pec_val_grid[lat_m] + w_cup_up * (z_cup_low + 0.044 * s_cup_up)
            y_pec_val_grid[lat_m] = (1.0 - w_cup_up) * y_pec_val_grid[lat_m] + w_cup_up * (y_cup_low + 0.022 * s_cup_up)
    z_pec_val_grid = 0.50 * z_pec_val_grid + 0.50 * z_pec_val_grid[::-1]
    y_pec_val_grid = 0.50 * y_pec_val_grid + 0.50 * y_pec_val_grid[::-1]
    w_pec_fold_grid = 0.50 * w_pec_fold_grid + 0.50 * w_pec_fold_grid[::-1]
    for _ in range(18):
        m_v = w_pec_fold_grid[1:-1] > 0.03
        z_avg = 0.25 * z_pec_val_grid[:-2] + 0.50 * z_pec_val_grid[1:-1] + 0.25 * z_pec_val_grid[2:]
        y_avg = 0.25 * y_pec_val_grid[:-2] + 0.50 * y_pec_val_grid[1:-1] + 0.25 * y_pec_val_grid[2:]
        w_avg = 0.25 * w_pec_fold_grid[:-2] + 0.50 * w_pec_fold_grid[1:-1] + 0.25 * w_pec_fold_grid[2:]
        z_pec_val_grid[1:-1] = np.where(m_v, z_avg, z_pec_val_grid[1:-1])
        y_pec_val_grid[1:-1] = np.where(m_v, y_avg, y_pec_val_grid[1:-1])
        w_pec_fold_grid[1:-1] = w_avg

    # Measure anterior sub-belly panniculus crease valley (z_sb_val_grid, w_sb_fold_grid) down to the true Z~1.015m crease root:
    x_sb_grid = np.linspace(-0.155, 0.155, 65)
    z_sb_val_grid = 1.0165 + 0.0165 * np.clip((np.abs(x_sb_grid) / 0.105) ** 2, 0.0, 1.4)
    w_sb_fold_grid = np.zeros_like(x_sb_grid)
    z_sb_scan = np.linspace(1.002, 1.082, 81)
    for xi_s, xv_s in enumerate(x_sb_grid):
        if abs(xv_s) > 0.148:
            continue
        ys_s = np.full_like(z_sb_scan, np.nan)
        for zi_s, zv_s in enumerate(z_sb_scan):
            hc, hnc, _, _ = trunk_bvh_crease.ray_cast(Vector((float(xv_s), -0.42, float(zv_s))), ray_py_c, 0.36)
            if hc is not None and float(hnc.y) < -0.15:
                ys_s[zi_s] = float(hc.y)
        best_tuck_s = 0.0
        best_k_s = -1
        for k in range(2, len(z_sb_scan) - 2):
            zv_k = float(z_sb_scan[k])
            if zv_k < 1.008 or zv_k > 1.062 or not np.all(np.isfinite(ys_s[k - 1 : k + 2])):
                continue
            if ys_s[k] < ys_s[k - 1] - 1e-6 or ys_s[k] < ys_s[k + 1] - 1e-6:
                continue
            y_rt_k = float(ys_s[k])
            ab_m = np.isfinite(ys_s) & (z_sb_scan >= zv_k + 0.010) & (z_sb_scan <= min(zv_k + 0.042, 1.080))
            bl_m = np.isfinite(ys_s) & (z_sb_scan >= max(zv_k - 0.024, 1.002)) & (z_sb_scan <= zv_k - 0.006)
            if not np.any(ab_m) or not np.any(bl_m):
                continue
            tuck_ab = y_rt_k - float(np.min(ys_s[ab_m]))
            tuck_bl = y_rt_k - float(np.min(ys_s[bl_m]))
            tuck_eff_s = min(tuck_ab, max(0.80 * tuck_bl, 0.0022 if tuck_ab > 0.012 else 0.0))
            if tuck_eff_s > best_tuck_s:
                best_tuck_s = tuck_eff_s
                best_k_s = k
        if best_k_s >= 0 and best_tuck_s > 0.0016:
            z_sb_val_grid[xi_s] = float(z_sb_scan[best_k_s])
            w_sb_fold_grid[xi_s] = float(
                smoothstep((best_tuck_s - 0.0016) / 0.0040) * (1.0 - smoothstep((abs(xv_s) - 0.125) / 0.025))
            )
    # Symmetrize L/R sub-belly crease curve gently so canonical triangulation never tilts the center crease
    z_sb_val_grid = 0.5 * (z_sb_val_grid + z_sb_val_grid[::-1])
    w_sb_fold_grid = 0.5 * (w_sb_fold_grid + w_sb_fold_grid[::-1])
    for _ in range(4):
        m_vs = w_sb_fold_grid[1:-1] > 0.05
        z_avg_s = 0.25 * z_sb_val_grid[:-2] + 0.50 * z_sb_val_grid[1:-1] + 0.25 * z_sb_val_grid[2:]
        z_sb_val_grid[1:-1] = np.where(m_vs, z_avg_s, z_sb_val_grid[1:-1])

    # Detect donor umbilical (navel) hollow along X=0 (Z=1.155..1.265m) so canonical LOD0+LOD1 navel ring locks onto it!
    z_nav_scan = np.linspace(1.155, 1.265, 111)
    y_nav_mid = np.full_like(z_nav_scan, np.nan)
    y_nav_rim = np.full_like(z_nav_scan, np.nan)
    for zi_n, zv_n in enumerate(z_nav_scan):
        h0, hn0, _, _ = trunk_bvh_crease.ray_cast(Vector((0.0, -0.45, float(zv_n))), ray_py_c, 0.40)
        if h0 is not None and float(hn0.y) < -0.20:
            y_nav_mid[zi_n] = float(h0.y)
        rim_ys = []
        for xr_n in (-0.024, 0.024):
            hr, hnr, _, _ = trunk_bvh_crease.ray_cast(Vector((xr_n, -0.45, float(zv_n))), ray_py_c, 0.40)
            if hr is not None and float(hnr.y) < -0.20:
                rim_ys.append(float(hr.y))
        if rim_ys:
            y_nav_rim[zi_n] = float(np.mean(rim_ys))
    nav_diff = np.where(np.isfinite(y_nav_mid) & np.isfinite(y_nav_rim), y_nav_mid - y_nav_rim, 0.0)
    best_nav_i = int(np.argmax(nav_diff))
    nav_depth_m = float(nav_diff[best_nav_i])
    z_nav_don = float(z_nav_scan[best_nav_i]) if nav_depth_m > 0.0016 else 1.218
    w_nav_don = float(smoothstep(np.array([(nav_depth_m - 0.0016) / 0.0026]))[0])
    z_nav_ref_c = 1.2207
    r_nav_ref_u = np.hypot(rest_u[:, 0], rest_u[:, 2] - z_nav_ref_c)
    w_nav_halo_u = np.where(
        free_u & (part_u == "trunk_neck") & (rest_u[:, 1] < -0.090),
        w_nav_don * (1.0 - smootherstep((r_nav_ref_u - 0.014) / 0.018)),
        0.0,
    )

    active_u = np.flatnonzero(w_obs_u >= 0.18)

    def s01_scalar(x: float) -> float:
        t = 0.0 if x <= 0.0 else (1.0 if x >= 1.0 else x)
        return t * t * (3.0 - 2.0 * t)

    # Coarse-to-fine 8-pass schedule with radial segment-axis unfolding (alpha_rad, z_damp) + ray-true correspondence:
    schedules = [
        (0.65, 0.20, 0.13, 0.42, 0.48, 0.080, 0.010, 0.0040, 0.120, 0.280, 8),  # Pass 1: radial unfolding onto donor tangent planes
        (0.50, 0.26, 0.10, 0.40, 0.28, 0.042, 0.007, 0.0028, 0.090, 0.245, 6),  # Pass 2: full belly/chest/hip/thigh/glute/neck volume
        (0.38, 0.32, 0.08, 0.36, 0.16, 0.020, 0.0040, 0.0016, 0.068, 0.195, 5),  # Pass 3: limb girths, lower glute crescent & groin pad
        (0.28, 0.36, 0.065, 0.32, 0.085, 0.009, 0.0022, 0.0010, 0.048, 0.150, 4),  # Pass 4: deltoid/pec/glute/calf/forearm forms
        (0.20, 0.40, 0.050, 0.28, 0.045, 0.0045, 0.0012, 0.0006, 0.042, 0.125, 3),  # Pass 5: smooth adipose landing over lean grooves
        (0.15, 0.44, 0.042, 0.24, 0.026, 0.0028, 0.0008, 0.0004, 0.032, 0.095, 3),  # Pass 6: subgluteal/under-belly undercut lock
        (0.12, 0.48, 0.036, 0.20, 0.018, 0.0018, 0.0005, 0.0003, 0.022, 0.072, 2),  # Pass 7: smooth anatomical contour polish
        (0.10, 0.50, 0.030, 0.16, 0.014, 0.0012, 0.0004, 0.0002, 0.016, 0.055, 2),  # Pass 8: sub-millimeter fold-free tangent-plane lock
    ]

    w_pel_unfold_u = np.where(
        free_u,
        smoothstep((w_obs_u - 0.55) / 0.22)
        * (1.0 - smootherstep((np.abs(unfold_u[:, 0]) - 0.068) / 0.048))
        * smootherstep((unfold_u[:, 2] - 0.815) / 0.040)
        * (1.0 - smootherstep((unfold_u[:, 2] - 1.085) / 0.048)),
        0.0,
    )
    pelvic_unfold_u = w_pel_unfold_u > 0.02
    w_rear_cleft_notch_u = (
        (1.0 - smootherstep((np.abs(unfold_u[:, 0]) - 0.018) / 0.012))
        * smootherstep((unfold_u[:, 1] - 0.020) / 0.012)
        * smootherstep((unfold_u[:, 2] - 0.950) / 0.020)
    )
    w_pel_dome_lift_u = w_pel_unfold_u * (1.0 - w_rear_cleft_notch_u)
    pelvic_dome_lift_u = w_pel_dome_lift_u > 0.02
    ant_top_lift_taper_u = 1.0 - smootherstep((unfold_u[:, 2] - 1.034) / 0.026) * smoothstep((-unfold_u[:, 1] - 0.065) / 0.025)
    w_chest_zone_u = np.where(
        free_u & (part_u == "trunk_neck"),
        smoothstep((w_obs_u - 0.50) / 0.25)
        * (1.0 - smoothstep((w_arm_tot_u - 0.06) / 0.10))
        * smootherstep((rest_u[:, 2] - 1.375) / 0.032)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.545) / 0.032))
        * smootherstep((-rest_u[:, 1] - 0.028) / 0.026)
        * smootherstep((np.abs(rest_u[:, 0]) - 0.028) / 0.018)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.170) / 0.024)),
        0.0,
    )
    # Do NOT choke w_subbelly_zone_u or w_glute_zone_u by w_obs_u! Why: w_obs_u drops to 0 across the donor's swim-briefs faces,
    # whereas trunk_bvh_crease & core_bvh_fg are built from bare_donor_xyz (already stripped of swim-briefs!). Firing across 100% of
    # the lower belly & glute cheeks eliminates BOTH the +34mm lower-belly undercut AND the -44mm '/' '\' swim-briefs glute step!
    w_subbelly_zone_u = np.where(
        free_u & (part_u == "trunk_neck"),
        smootherstep((rest_u[:, 2] - 0.996) / 0.022)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.158) / 0.030))
        * smootherstep((-rest_u[:, 1] - 0.052) / 0.024)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.155) / 0.028)),
        0.0,
    )
    w_back_zone_u = np.where(
        free_u & (part_u == "trunk_neck"),
        smoothstep((w_obs_u - 0.50) / 0.25)
        * smootherstep((rest_u[:, 2] - 1.255) / 0.032)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.545) / 0.032))
        * smootherstep((rest_u[:, 1] - 0.022) / 0.024)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.208) / 0.024)),
        0.0,
    )
    w_glute_zone_u = np.where(
        free_u & np.isin(part_u, ("trunk_neck", "leg_l", "leg_r")),
        smootherstep((rest_u[:, 2] - 0.875) / 0.028)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.152) / 0.032))
        * smootherstep((rest_u[:, 1] + 0.005) / 0.022)
        * smootherstep((np.abs(rest_u[:, 0]) - 0.008) / 0.014)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.185) / 0.024)),
        0.0,
    )
    chest_fold_zone_u = w_chest_zone_u > 0.05
    subbelly_fold_zone_u = w_subbelly_zone_u > 0.05
    back_fold_zone_u = w_back_zone_u > 0.05
    glute_fold_zone_u = w_glute_zone_u > 0.04
    # Canonical lower-pectoral loop reference BELOW the Z~1.466m nipple star so the nipple star stays smoothly on the convex breast mound
    # while the lower-pec edge loop glides diffeomorphically onto the donor's rounded crescent pectoral fold:
    ax_pec_u = np.abs(unfold_u[:, 0])
    z_pec_loop_ref_u = (
        1.4515
        + 0.012 * ((np.clip(0.140 - ax_pec_u, 0.0, 0.100) / 0.100) ** 2)
        + 0.018 * smootherstep((ax_pec_u - 0.150) / 0.036)
    )
    w_pec_loop_u = np.where(
        free_u & (part_u == "trunk_neck") & (unfold_u[:, 1] < -0.044),
        (1.0 - smoothstep((w_arm_tot_u - 0.08) / 0.12))
        * np.exp(-(((unfold_u[:, 2] - z_pec_loop_ref_u) / 0.0185) ** 2))
        * smootherstep((ax_pec_u - 0.030) / 0.018)
        * (1.0 - smootherstep((ax_pec_u - 0.156) / 0.024)),
        0.0,
    )

    z_sb_loop_ref_u = 1.066 - 0.068 * np.clip(np.abs(unfold_u[:, 0]) - 0.020, 0.0, 0.115)
    w_subbelly_loop_u = np.where(
        free_u & (part_u == "trunk_neck") & (unfold_u[:, 1] < -0.085),
        np.exp(-(((unfold_u[:, 2] - z_sb_loop_ref_u) / 0.0175) ** 2))
        * (1.0 - smootherstep((np.abs(unfold_u[:, 0]) - 0.125) / 0.024)),
        0.0,
    )
    torso_crease_zone_u = chest_fold_zone_u | subbelly_fold_zone_u | back_fold_zone_u
    axilla_inf_u = masks["canonicalAxillaInf"][first_raw]
    # Release total-displacement regularization across BOTH occluded axillary vault AND occluded medial upper-arm vertices
    # so full circumferential adipose thickness interpolates smoothly around the inner bicep/tricep & underarm arch (never collapsing to F=0)!
    w_med_arm_occ_u = np.where(
        free_u & np.isin(part_u, ("arm_l", "arm_r")),
        (1.0 - smoothstep((w_obs_u - 0.15) / 0.45))
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.365) / 0.045)),
        0.0,
    )
    w_ax_vault_occ_u = np.where(
        free_u,
        np.maximum(smoothstep((axilla_inf_u - 0.10) / 0.20), w_med_arm_occ_u),
        0.0,
    )
    w_torso_folds_u = np.maximum(np.maximum(w_chest_zone_u, w_subbelly_zone_u), np.maximum(w_back_zone_u, w_glute_zone_u))
    w_torso_ax_u = np.clip(np.maximum(w_torso_folds_u, w_ax_vault_occ_u), 0.0, 1.0)
    non_pel_tot_u = 1.0 - 0.88 * np.clip(bt_u, 0.0, 1.0)
    base_tot_scale_u = (1.0 - w_pel_unfold_u) * non_pel_tot_u + w_pel_unfold_u * 0.085
    tot_scale_u = (1.0 - w_torso_ax_u) * base_tot_scale_u + w_torso_ax_u * 0.042
    tot_scale_u = (1.0 - w_ax_vault_occ_u) * tot_scale_u + w_ax_vault_occ_u * 0.014
    tot_scale_u = (1.0 - w_chest_zone_u) * tot_scale_u + w_chest_zone_u * 0.022
    inv_jac_u = np.linalg.inv(jac_u)
    w_tan_relax_u = np.where(
        free_u,
        smoothstep((w_obs_u - 0.60) / 0.20)
        * np.maximum(smootherstep((mean_edge_u - 0.0034) / 0.0016), 1.0 - smootherstep((unfold_u[:, 2] - 1.155) / 0.050)),
        0.0,
    )
    tan_relax_u = w_tan_relax_u > 0.02
    w_ext_e = np.ones_like(e_src, dtype=np.float64)
    diag_ext_w = np.maximum(degree.astype(np.float64), 1e-12)

    # Apply smooth C2 crotch-height + sagittal (Y) saddle-depth unfolding + axillary-dome lowering -> u_reg_base
    rest_groin_ref = unfold_u.copy()
    if dz_slot_crotch < -0.005:
        w_lat_z = 1.0 - smootherstep((np.abs(unfold_u[:, 0]) - 0.048) / 0.052)
        w_vert_z = np.where(
            unfold_u[:, 2] <= z_canon_arch_min,
            smootherstep((unfold_u[:, 2] - 0.735) / max(z_canon_arch_min - 0.735, 0.10)),
            1.0 - smootherstep((unfold_u[:, 2] - z_canon_arch_min) / 0.145),
        )
        rest_groin_ref[:, 2] += np.where(free_u, dz_slot_crotch * w_lat_z * w_vert_z, 0.0)

        # Measure actual bare-donor anterior & posterior saddle Y span and apply verified zero-fold full-halo diffeomorphic stretch!
        z_y_probe = z_sad_floor + 0.009
        h_ant_s, hn_ant_s, _, _ = core_bvh_fg.ray_cast(Vector((0.0, -0.35, z_y_probe)), Vector((0.0, 1.0, 0.0)), 0.35)
        h_pst_s, hn_pst_s, _, _ = core_bvh_fg.ray_cast(Vector((0.0, 0.35, z_y_probe)), Vector((0.0, -1.0, 0.0)), 0.35)
        dy_ant_sad = (
            float(np.clip(0.68 * (float(h_ant_s.y) - (-0.025)), -0.105, 0.0))
            if (h_ant_s is not None and float(hn_ant_s.y) < -0.18)
            else 0.0
        )
        dy_pst_sad = (
            float(np.clip(0.68 * (float(h_pst_s.y) - 0.015), 0.0, 0.072))
            if (h_pst_s is not None and float(hn_pst_s.y) > 0.18)
            else 0.0
        )
        w_pel_y = np.zeros(n_u, dtype=np.float64)
        if dy_ant_sad < -0.008 or dy_pst_sad > 0.008:
            w_lat_y = 1.0 - smootherstep((np.abs(unfold_u[:, 0]) - 0.036) / 0.048)
            w_vert_y = smootherstep((unfold_u[:, 2] - 0.950) / 0.062) * (1.0 - smootherstep((unfold_u[:, 2] - 1.045) / 0.065))
            w_pel_y = w_lat_y * w_vert_y
            dy_raw = np.where(
                unfold_u[:, 1] < -0.002,
                dy_ant_sad * np.tanh((-0.002 - unfold_u[:, 1]) / 0.032),
                dy_pst_sad * np.tanh((unfold_u[:, 1] + 0.002) / 0.028),
            )
            rest_groin_ref[:, 1] += np.where(free_u, dy_raw * w_pel_y, 0.0)

        # Relax across the ENTIRE modified halo (never clip relaxation to tiny tt_idx inside a wider dy support!)
        halo_rg_w = np.where(free_u, np.clip(np.maximum(w_tutte_u, 0.65 * w_pel_y), 0.0, 1.0), 0.0)
        hrg_idx = np.flatnonzero(halo_rg_w > 1e-3)
        if len(hrg_idx):
            w_z_hold = np.exp(-(((unfold_u[hrg_idx, 2] - z_canon_arch_min) / 0.015) ** 2))
            for _ in range(180):
                nbr_rg = np.column_stack(
                    [np.bincount(e_src, weights=w_pel_e * rest_groin_ref[e_dst, c], minlength=n_u) / deg_pel_u for c in range(3)]
                )
                step_rg = (0.55 * halo_rg_w[hrg_idx])[:, None] * (nbr_rg[hrg_idx] - rest_groin_ref[hrg_idx])
                step_rg[:, 2] *= 1.0 - 0.85 * w_z_hold
                rest_groin_ref[hrg_idx] += step_rg
                rest_groin_ref[mid_u, 0] = 0.0

    u_reg_base = np.where(free_u[:, None], rest_groin_ref - rest_u, 0.0)

    # Relax canonical lean nipple/outer-pectoral spike (u=17979/17515/18408, lap_y=-4.3mm at |rx|~0.12m, rz~1.465m) in u_reg_base
    # proportional to donor chest fullness so full-bodied donors do NOT get a ghost lean nipple stamped onto their outer breast fold!
    chest_probe_m = (part_u == "trunk_neck") & (np.abs(rest_u[:, 0]) >= 0.100) & (np.abs(rest_u[:, 0]) <= 0.132) & (rest_u[:, 2] >= 1.455) & (rest_u[:, 2] <= 1.485) & (rest_u[:, 1] < -0.075)
    dy_chest_add = 0.0
    if np.any(chest_probe_m):
        y0_ch = float(np.median(posed_0_u[chest_probe_m, 1]))
        ch_ys = []
        for sx_ch in (-0.115, 0.115):
            hc_p, hnc_p, _, _ = trunk_bvh_crease.ray_cast(Vector((sx_ch, -0.40, 1.470)), ray_py_c, 0.36)
            if hc_p is not None and float(hnc_p.y) < -0.20:
                ch_ys.append(float(hc_p.y))
        if ch_ys:
            dy_chest_add = max(0.0, y0_ch - float(np.mean(ch_ys)))
    w_pec_ghost = float(s01_scalar((dy_chest_add - 0.018) / 0.030))
    if w_pec_ghost > 0.01:
        # Zero-shrinkage Taubin smoothing localized strictly to the canonical lean nipple button (|rx|~0.118m, rz~1.466m)
        # so the 1.5mm lean nipple spike vanishes WITHOUT deflating the convex outer pectoral ribcage inward!
        w_nip_rel_u = np.where(
            free_u & (part_u == "trunk_neck") & (rest_u[:, 1] < -0.055),
            w_pec_ghost
            * np.exp(-((((np.abs(rest_u[:, 0]) - 0.118) / 0.026) ** 2) + (((rest_u[:, 2] - 1.466) / 0.024) ** 2))),
            0.0,
        )
        nip_idx = np.flatnonzero(w_nip_rel_u > 1e-3)
        if len(nip_idx):
            rest_chest_ref = rest_u.copy()
            deg_uni_ch = np.maximum(degree.astype(np.float64), 1.0)
            wnip_v = w_nip_rel_u[nip_idx, None]
            for _ in range(22):
                nbr_ch1 = np.column_stack(
                    [np.bincount(e_src, weights=rest_chest_ref[e_dst, c], minlength=n_u) / deg_uni_ch for c in range(3)]
                )
                rest_chest_ref[nip_idx] += (0.46 * wnip_v) * (nbr_ch1[nip_idx] - rest_chest_ref[nip_idx])
                nbr_ch2 = np.column_stack(
                    [np.bincount(e_src, weights=rest_chest_ref[e_dst, c], minlength=n_u) / deg_uni_ch for c in range(3)]
                )
                rest_chest_ref[nip_idx] -= (0.482 * wnip_v) * (nbr_ch2[nip_idx] - rest_chest_ref[nip_idx])
            u_reg_base[nip_idx] += rest_chest_ref[nip_idx] - rest_u[nip_idx]

    # Strictly diffeomorphic rest-space armpit lowering (max 22mm over 50mm+ C2 transitions -> |du/dx|<=0.35 << 1, ZERO inverted faces!)
    dz_axilla = float(np.clip(0.55 * (z_ax_dome_tgt - 1.548), -0.022, 0.0))
    if dz_axilla < -0.004:
        rx0_u, ry0_u, rz0_u = rest_u.T
        w_ax_x = smootherstep((np.abs(rx0_u) - 0.142) / 0.048) * (1.0 - smootherstep((np.abs(rx0_u) - 0.245) / 0.060))
        w_ax_y = smootherstep((ry0_u + 0.068) / 0.048) * (1.0 - smootherstep((ry0_u - 0.115) / 0.055))
        w_ax_z = np.where(
            rz0_u <= 1.548,
            smootherstep((rz0_u - 1.335) / 0.213),
            1.0 - smootherstep((rz0_u - 1.548) / 0.105),
        )
        u_reg_base[:, 2] += np.where(free_u, dz_axilla * w_ax_x * w_ax_y * w_ax_z, 0.0)

    u_reg_base[mid_u, 0] = 0.0
    u_current = u_reg_base.copy()

    glute_cleft_u = (np.abs(unfold_u[:, 0]) < 0.024) & (unfold_u[:, 1] > 0.001) & (unfold_u[:, 2] > 1.005) & (unfold_u[:, 2] < 1.15)
    # Start w_nv_gc_u ABOVE the convex rear-cleft-to-perineum bend (unfold_y > 0.024, unfold_z > 1.028) so 1D ry averaging never shrinks the bottom apex!
    w_nv_gc_u = np.where(
        free_u,
        (1.0 - smootherstep((np.abs(rx_pel_u) - 0.010) / 0.024))
        * smootherstep((unfold_u[:, 1] - 0.024) / 0.012)
        * smootherstep((unfold_u[:, 2] - 1.028) / 0.016)
        * (1.0 - smoothstep((unfold_u[:, 2] - 1.135) / 0.028)),
        0.0,
    )
    # Zero 1D neighbor-Y averaging on the sloped anterior groin (prevents zig-zag Z-slope vertical pleats!)
    w_nv_fg_u = np.zeros(n_u, dtype=np.float64)
    w_nv_sp_u = np.where(
        free_u,
        0.88
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.005) / 0.012))
        * smoothstep((rest_u[:, 1] - 0.025) / 0.020)
        * smoothstep((rest_u[:, 2] - 1.105) / 0.028)
        * (1.0 - smoothstep((rest_u[:, 2] - 1.640) / 0.030)),
        0.0,
    )
    w_nv_u = np.maximum(np.maximum(w_nv_gc_u, w_nv_fg_u), w_nv_sp_u)
    natal_v_u = w_nv_u > 1e-4
    # Smooth shoulder skinning-hinge across hidden axillary dome AND superior clavicle-to-acromion transition (for clean +68-deg Raised Arms!)
    # (NEVER touches w_arm==0 lateral pectoral folds or posterior back folds!)
    hinge_band = np.clip(4.2 * w_arm_tot_u * (1.0 - w_arm_tot_u), 0.0, 1.0)
    w_sh_ax = (
        hinge_band
        * smootherstep((np.abs(rest_u[:, 0]) - 0.146) / 0.024)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.278) / 0.032))
        * smootherstep((rest_u[:, 2] - 1.452) / 0.028)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.705) / 0.028))
        * smootherstep((rest_u[:, 1] + 0.074) / 0.024)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.128) / 0.024))
    )
    w_sh_acr = (
        0.78
        * hinge_band
        * smootherstep((np.abs(rest_u[:, 0]) - 0.138) / 0.024)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.308) / 0.032))
        * smootherstep((rest_u[:, 2] - 1.545) / 0.028)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.705) / 0.028))
        * smootherstep((rest_u[:, 1] + 0.105) / 0.028)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.115) / 0.028))
    )
    w_ant_pec_ax = (
        0.62
        * hinge_band
        * smootherstep((np.abs(rest_u[:, 0]) - 0.142) / 0.022)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.228) / 0.024))
        * smootherstep((rest_u[:, 2] - 1.478) / 0.024)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.555) / 0.024))
        * smootherstep((rest_u[:, 1] + 0.105) / 0.020)
        * (1.0 - smootherstep((rest_u[:, 1] + 0.032) / 0.020))
    )
    w_sh_taubin_u = np.where(free_u, np.maximum(np.maximum(w_sh_ax, w_sh_acr), w_ant_pec_ax), 0.0)
    hinge_or_upper_ax = np.maximum(
        hinge_band,
        smootherstep((rest_u[:, 2] - 1.495) / 0.026) * smootherstep((np.abs(rest_u[:, 0]) - 0.168) / 0.022),
    )
    w_post_ax_fair_u = np.where(
        free_u,
        0.90
        * hinge_or_upper_ax
        * smootherstep((np.abs(rest_u[:, 0]) - 0.135) / 0.020)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.278) / 0.028))
        * smootherstep((rest_u[:, 2] - 1.475) / 0.026)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.642) / 0.028))
        * smootherstep((rest_u[:, 1] - 0.022) / 0.020)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.195) / 0.028)),
        0.0,
    )
    # Convex deltoid/acromion & posterior-shoulder UV-seam surface polish (erases lean F=0 bony acromial sulcus dimple AND posterior UV-seam crease!)
    in_deep_ax_hollow_u = (
        (1.0 - smootherstep((rest_u[:, 2] - 1.545) / 0.022))
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.218) / 0.018))
        * smootherstep((rest_u[:, 1] + 0.045) / 0.020)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.075) / 0.022))
    )
    w_delt_surf_u = np.where(
        free_u,
        0.88
        * smootherstep((np.abs(rest_u[:, 0]) - 0.180) / 0.022)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.318) / 0.028))
        * smootherstep((rest_u[:, 2] - 1.488) / 0.026)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.658) / 0.026))
        * smootherstep((rest_u[:, 1] + 0.135) / 0.024)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.195) / 0.028))
        * (1.0 - 0.92 * in_deep_ax_hollow_u),
        0.0,
    )
    delt_surf_mask_u = w_delt_surf_u > 0.02
    w_post_corner_x_u = np.where(
        free_u & (part_u == "trunk_neck"),
        0.82
        * smootherstep((np.abs(rest_u[:, 0]) - 0.120) / 0.018)
        * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.210) / 0.022))
        * smootherstep((rest_u[:, 2] - 1.362) / 0.024)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.548) / 0.024))
        * smootherstep((rest_u[:, 1] - 0.050) / 0.022)
        * (1.0 - smootherstep((rest_u[:, 1] - 0.128) / 0.024)),
        0.0,
    )
    post_corner_x_mask_u = w_post_corner_x_u > 0.02
    w_sh_taubin_u = np.maximum(w_sh_taubin_u, w_post_ax_fair_u)
    rest_hinge_u = w_sh_taubin_u > 0.03
    w_wrist_fair_u = np.where(
        free_u & (w_arm_tot_u > 0.5) & (rest_u[:, 2] < 1.34) & (np.abs(rest_u[:, 0]) > 0.25),
        np.clip(3.2 * bt_u * (1.0 - bt_u), 0.0, 0.82),
        0.0,
    )
    wrist_fair_mask_u = w_wrist_fair_u > 0.015
    w_elbow_halo_u = np.zeros(n_u, dtype=np.float64)
    for _, spec_el in pose_info["sides"].items():
        _, el_r_pt, _, _ = [np.array(p, dtype=np.float64) for p in spec_el["arm"]["rest"]]
        d_el_u = np.linalg.norm(rest_u - el_r_pt[None, :], axis=1)
        w_elbow_halo_u = np.maximum(w_elbow_halo_u, 1.0 - smootherstep((d_el_u - 0.052) / 0.048))
    w_elbow_fair_u = np.where(
        free_u & (w_arm_tot_u > 0.45),
        np.clip(np.maximum(0.92 * smoothstep((elbow_blend_u - 0.025) / 0.16), 0.85 * w_elbow_halo_u), 0.0, 0.92),
        0.0,
    )
    elbow_fair_mask_u = w_elbow_fair_u > 0.018
    not_ant_upper_face_u = 1.0 - smootherstep((-rest_u[:, 1] - 0.045) / 0.020) * smootherstep((rest_u[:, 2] - 1.792) / 0.022)
    not_coupled_feat_u = 1.0 - smoothstep((coupled_stiff_u - 1.25) / 0.85)
    w_neck_fair_u = np.where(
        free_u & (rest_u[:, 2] >= 1.675) & (rest_u[:, 2] <= 1.875),
        (0.68 - 0.34 * smoothstep((rest_u[:, 2] - 1.775) / 0.055))
        * smoothstep((rest_u[:, 2] - 1.680) / 0.022)
        * not_ant_upper_face_u
        * not_coupled_feat_u,
        0.0,
    )
    neck_fair_mask_u = w_neck_fair_u > 0.03
    w_corner_fair_u = np.where(
        free_u,
        0.92
        * (1.0 - smootherstep((np.abs(rx_pel_u) - 0.032) / 0.020))
        * smootherstep((rest_u[:, 2] - 0.985) / 0.018)
        * (1.0 - smootherstep((rest_u[:, 2] - 1.052) / 0.020))
        * smootherstep((unfold_u[:, 1] + 0.052) / 0.016)
        * (1.0 - smootherstep((unfold_u[:, 1] - 0.038) / 0.016)),
        0.0,
    )
    w_fg_py_u = (
        np.maximum(
            np.where(
                free_u,
                (1.0 - smootherstep((np.abs(rx_pel_u) - 0.052) / 0.020))
                * smootherstep((-unfold_u[:, 1] + 0.012) / 0.014)
                * smootherstep((unfold_u[:, 2] - 0.876) / 0.026)
                * (1.0 - smootherstep((unfold_u[:, 2] - 1.044) / 0.020)),
                0.0,
            ),
            w_corner_fair_u,
        )
        * (1.0 - 0.92 * w_thigh_slot_wall_u)
    )
    fg_py_mask_u = w_fg_py_u > 0.02
    # Restrict posterior hub fairing strictly to the central natal/perineal cleft (|rx_pel_u| <= 0.042m + 0.018m feather)
    # so convex outer buttock cheeks (|X| >= 50mm) and overhanging subgluteal folds match CG's exact bare_donor_xyz rays without deflation!
    w_bg_py_u = (
        np.where(
            free_u,
            (1.0 - smootherstep((np.abs(rx_pel_u) - 0.042) / 0.018))
            * smootherstep((unfold_u[:, 1] + 0.012) / 0.014)
            * smootherstep((unfold_u[:, 2] - 0.876) / 0.026)
            * (1.0 - smootherstep((unfold_u[:, 2] - 1.036) / 0.022)),
            0.0,
        )
        * (1.0 - 0.92 * w_thigh_slot_wall_u)
    )
    bg_py_mask_u = w_bg_py_u > 0.02
    w_cot_pa_e = w_cot_e * w_no_slot_pull_e
    deg_cot_pa = np.maximum(np.bincount(e_src, weights=w_cot_pa_e, minlength=n_u), 1e-12)
    w_len_pa_e = w_len_e * w_no_slot_pull_e
    diag_len_pa = np.maximum(np.bincount(e_src, weights=w_len_pa_e, minlength=n_u), 1e-12)

    pass_logs = []

    for p_idx, (alpha_rad, z_damp, tau_t, w_rv, ws_mem, ws_bih, wt_mem, wt_bih, step_cap, max_ray, nrm_rings) in enumerate(schedules):
        posed_raw = posed_0 + np.einsum("vij,vj->vi", jac_all, u_current[weld])
        raw_nrm = vertex_normals(posed_raw, all_tri, weld)
        smooth_nrm = smooth_vertex_vectors(raw_nrm, connectivity, nrm_rings)
        pel_smooth_nrm = smooth_vertex_vectors(raw_nrm, connectivity, 14)

        posed_u = posed_raw[first_raw]
        nrm_u = smooth_nrm[first_raw]
        pel_nrm_u = pel_smooth_nrm[first_raw]
        raw_nrm_u = raw_nrm[first_raw]
        rad_u = compute_posed_radial_outward_vectors(posed_u, unfold_u, part_u, pose_info, w_arm_tot_u)

        a_blocks = np.zeros((n_u, 3, 3), dtype=np.float64)
        b_rhs = np.zeros((n_u, 3), dtype=np.float64)

        # Matched convex-combination boundary anchor pull toward canonical (u=0 -> du = -u_current) on taper zones
        has_anc = w_anchor_u > 0
        if np.any(has_anc):
            a_blocks[has_anc] += w_anchor_u[has_anc, None, None] * gtg_u[has_anc]
            b_rhs[has_anc] += -w_anchor_u[has_anc, None] * np.einsum("nij,nj->ni", gtg_u[has_anc], u_current[has_anc])

        fwd_hits = 0
        inward_cap = 0.085 if p_idx <= 2 else (0.065 if p_idx <= 5 else 0.048)
        near_cap = 0.165 if p_idx <= 2 else (0.085 if p_idx <= 5 else 0.045)
        out_cos_min = 0.08 if p_idx <= 3 else 0.20
        eye3 = np.eye(3, dtype=np.float64)

        # --- Forward Correspondence: Posed Canonical -> Part Donor BVH (unified core_bvh_fg on bridged pelvis; part BVH on separated thighs!) ---
        for u_i in active_u:
            pname = part_u[u_i]
            rx_val = float(unfold_u[u_i, 0])
            ry_val = float(unfold_u[u_i, 1])
            rz_val = float(unfold_u[u_i, 2])
            wb_pel = float(w_bridged_pel_u[u_i])
            if pname in ("trunk_neck", "leg_l", "leg_r") and ((wb_pel > 0.15 and rz_val <= 1.140) or (ry_val > 0.025 and 0.855 <= rz_val <= 1.150)):
                dbvh, df_ids = core_bvh_fg, f_core_clean
            else:
                dbvh, df_ids = donor_bvhs[pname]
            pt = posed_u[u_i]
            vn = nrm_u[u_i]
            vn_sharp = raw_nrm_u[u_i]
            rad_xy = rad_u[u_i]

            if pname in ("trunk_neck", "leg_l", "leg_r") and wb_pel > 0.15 and rz_val < 1.116 and abs(rx_val) < 0.088:
                # Continuous C2 bridged pelvic sheet evaluated on Tutte-unfolded canonical coordinates unfold_u!
                w_med_pel = (
                    wb_pel
                    * (1.0 - s01_scalar((abs(rx_val) - 0.054) / 0.034))
                    * (1.0 - s01_scalar((rz_val - 1.084) / 0.032))
                )
                w_arch_v = (
                    (1.0 - s01_scalar((abs(rx_val) - 0.022) / 0.014))
                    * s01_scalar((rz_val - 1.006) / 0.008)
                    * (1.0 - s01_scalar((rz_val - 1.028) / 0.010))
                    * s01_scalar((ry_val + 0.019) / 0.006)
                    * (1.0 - s01_scalar((ry_val - 0.010) / 0.006))
                )
                vn_pel = pel_nrm_u[u_i]
                vn_x_san = float(vn_pel[0]) * (1.0 - 0.92 * w_med_pel)
                if abs(rx_val) > 0.0005 and rx_val * vn_x_san < 0.0:
                    vn_x_san = 0.0
                vn_y_san = float(vn_pel[1])
                vn_z_san = float(vn_pel[2])
                z_d_pel = (1.0 - w_arch_v) * min(z_damp, 0.22) + w_arch_v * 0.85
                v_3d = np.array([vn_x_san, vn_y_san, z_d_pel * vn_z_san], dtype=np.float64)
                v_3d_len = float(np.linalg.norm(v_3d))
                v_3d = (v_3d / v_3d_len) if v_3d_len > 1e-6 else rad_xy
                alpha_med = 0.94 if p_idx <= 4 else 0.78
                alpha_pel = max(alpha_rad, alpha_med * w_med_pel * (1.0 - 0.75 * w_arch_v))
                ray_dir = (1.0 - alpha_pel) * v_3d + alpha_pel * rad_xy
                ray_dir /= max(float(np.linalg.norm(ray_dir)), 1e-8)

                # Pure sagittal horizontal anterior-groin & posterior-cleft ray guidance above the lower perineal arch turn
                w_ant_g = (
                    (1.0 - w_arch_v)
                    * wb_pel
                    * s01_scalar((-ry_val - 0.006) / 0.014)
                    * (1.0 - s01_scalar((rz_val - 1.090) / 0.026))
                    * (1.0 - s01_scalar((abs(rx_val) - 0.056) / 0.022))
                )
                if w_ant_g > 1e-4:
                    d_ant = np.array([0.0, -1.0, 0.0], dtype=np.float64)
                    ray_dir = (1.0 - w_ant_g) * ray_dir + w_ant_g * d_ant
                    ray_dir /= max(float(np.linalg.norm(ray_dir)), 1e-8)

                w_post_g = (
                    (1.0 - w_arch_v)
                    * wb_pel
                    * s01_scalar((ry_val - 0.004) / 0.012)
                    * (1.0 - s01_scalar((rz_val - 1.055) / 0.025))
                    * (1.0 - s01_scalar((abs(rx_val) - 0.048) / 0.020))
                )
                if w_post_g > 1e-4:
                    d_post = np.array([0.0, 1.0, 0.0], dtype=np.float64)
                    ray_dir = (1.0 - w_post_g) * ray_dir + w_post_g * d_post
                    ray_dir /= max(float(np.linalg.norm(ray_dir)), 1e-8)
            elif (alpha_rad > 0.0 or z_damp < 0.999) and 0.08 < pt[2] < 1.905:
                vn_loc = vn
                z_damp_loc = z_damp
                alpha_eff = alpha_rad
                # Preserve downward-facing submental double-chin underside, breast-fold underside, belly apron, back-fold & subgluteal overhang normals!
                is_submental_underside = (1.725 <= pt[2] <= 1.825) and (pt[1] < -0.030) and (float(vn_sharp[2]) < -0.22)
                in_fold_overhang = (
                    is_submental_underside
                    or (1.28 <= pt[2] <= 1.525 and (pt[1] < -0.065 or pt[1] > 0.035))
                    or (1.015 <= pt[2] <= 1.135 and pt[1] < -0.150)
                    or (0.880 <= pt[2] <= 1.015 and pt[1] > 0.065)
                )
                if in_fold_overhang and float(vn_sharp[2]) < -0.14:
                    vn_loc = 0.30 * vn + 0.70 * vn_sharp
                    vn_loc /= max(float(np.linalg.norm(vn_loc)), 1e-8)
                    z_damp_loc = max(z_damp, 0.86)
                    alpha_eff = min(alpha_rad, 0.12)
                vz_eff = z_damp_loc * float(vn_loc[2])
                if pt[2] > 1.72 and pt[1] < -0.020 and not is_submental_underside:
                    vz_eff = max(vz_eff, -0.35)
                    alpha_eff = max(alpha_eff, 0.24 if p_idx <= 4 else 0.12)

                rx_xy_len = max(float(np.hypot(rad_xy[0], rad_xy[1])), 1e-8)
                r_unit = np.array([rad_xy[0] / rx_xy_len, rad_xy[1] / rx_xy_len], dtype=np.float64)
                vn_xy_len = float(np.hypot(vn_loc[0], vn_loc[1]))
                if vn_xy_len >= 0.45:
                    v_xy = np.array([vn_loc[0] / vn_xy_len, vn_loc[1] / vn_xy_len], dtype=np.float64)
                else:
                    w_xy = vn_xy_len / 0.45
                    v_unit = (np.array([vn_loc[0], vn_loc[1]], dtype=np.float64) / max(vn_xy_len, 1e-8)) if vn_xy_len > 1e-6 else r_unit
                    xy_mix = w_xy * v_unit + (1.0 - w_xy) * r_unit
                    v_xy = xy_mix / max(float(np.linalg.norm(xy_mix)), 1e-8)
                xy_blend = (1.0 - alpha_eff) * v_xy + alpha_eff * r_unit
                xy_blend_len = float(np.linalg.norm(xy_blend))
                xy_final = (xy_blend / xy_blend_len) if xy_blend_len > 1e-6 else r_unit
                vz_total = vz_eff + (alpha_eff * float(rad_xy[2]) if abs(float(rad_xy[2])) > 1e-6 else 0.0)
                ray_dir = np.array([xy_final[0], xy_final[1], vz_total], dtype=np.float64)
                ray_dir /= max(float(np.linalg.norm(ray_dir)), 1e-8)
            else:
                ray_dir = vn

            # Prevent medial-facing pelvic/inguinal/gluteal normals ABOVE leg bifurcation (wb_pel > 0.25) from shooting into X=0 cleft
            if wb_pel > 0.25 and rz_val < 1.15 and 0.0010 < abs(rx_val) < 0.068:
                sx_side = 1.0 if rx_val > 0.0 else -1.0
                if sx_side * ray_dir[0] < 0.0:
                    yz_len = float(np.hypot(ray_dir[1], ray_dir[2]))
                    if yz_len >= 0.35:
                        ray_dir = np.array([0.0, ray_dir[1] / yz_len, ray_dir[2] / yz_len], dtype=np.float64)
                    else:
                        ray_dir = rad_xy
            elif (wb_pel > 0.25 or rz_val > 1.05) and abs(rx_val) <= 0.020 and (pt[2] < 1.18 or (pt[1] > 0.03 and pt[2] < 1.66)):
                ray_dir = np.array([0.16 * ray_dir[0], ray_dir[1], ray_dir[2]], dtype=np.float64)
                ray_dir /= max(float(np.linalg.norm(ray_dir)), 1e-8)

            in_pelvic_overhang = 0.86 <= pt[2] <= 1.16
            in_neck_overhang = pt[2] >= 1.72
            loc_max_ray = (
                max(max_ray, 0.235 if p_idx <= 5 else 0.165)
                if in_pelvic_overhang
                else (max(max_ray, 0.215 if p_idx <= 4 else 0.125) if in_neck_overhang else max_ray)
            )
            base_near_cap = 0.030 if p_idx <= 2 else (0.020 if p_idx <= 5 else 0.012)
            loc_near_cap = max(base_near_cap, 0.024) if (rz_val >= 1.008 and rz_val <= 1.045 and abs(rx_val) < 0.042) else base_near_cap

            best_pt = None
            best_nrm = None
            best_glob_f = -1
            best_ray_d = 1e9
            best_ray_sgn = 0.0

            h_out, hn_out, fl_out, d_out = dbvh.ray_cast(Vector(pt.tolist()), Vector(ray_dir.tolist()), loc_max_ray)
            if h_out is not None:
                hn_np = np.asarray(hn_out, dtype=np.float64)
                if float(np.dot(hn_np, ray_dir)) > out_cos_min:
                    best_ray_d = float(d_out)
                    best_ray_sgn = 1.0
                    best_pt = np.asarray(h_out, dtype=np.float64)
                    best_nrm = hn_np
                    best_glob_f = int(df_ids[int(fl_out)])

            in_cos_min = 0.22 if (1.006 <= rz_val <= 1.036 and abs(rx_val) < 0.040) else 0.38
            h_in, hn_in, fl_in, d_in = dbvh.ray_cast(Vector(pt.tolist()), Vector((-ray_dir).tolist()), inward_cap)
            if h_in is not None and float(d_in) < best_ray_d:
                hn_np = np.asarray(hn_in, dtype=np.float64)
                if float(np.dot(hn_np, ray_dir)) > in_cos_min and (best_ray_sgn <= 0.0 or best_ray_d < 0.004):
                    best_ray_d = float(d_in)
                    best_ray_sgn = -1.0
                    best_pt = np.asarray(h_in, dtype=np.float64)
                    best_nrm = hn_np
                    best_glob_f = int(df_ids[int(fl_in)])

            if best_ray_sgn == 0.0:
                nh, nhn, nfl, ndist = dbvh.find_nearest(Vector(pt.tolist()), loc_near_cap)
                if nh is not None:
                    nh_np = np.asarray(nh, dtype=np.float64)
                    nhn_np = np.asarray(nhn, dtype=np.float64)
                    nd_f = max(float(ndist), 1e-8)
                    dir_align = abs(float(np.dot(nh_np - pt, ray_dir))) >= 0.65 * nd_f
                    cos_ok = float(np.dot(nhn_np, ray_dir)) > 0.45 or float(np.dot(nhn_np, vn)) > 0.50 or float(np.dot(nhn_np, vn_sharp)) > 0.55
                    if dir_align and cos_ok and (best_pt is None or nd_f < best_ray_d * 0.65):
                        best_pt = nh_np
                        best_nrm = nhn_np
                        best_glob_f = int(df_ids[int(nfl)])

            if best_pt is not None and pname in ("trunk_neck", "leg_l", "leg_r") and pt[2] < 1.03 and abs(rx_val) > 0.008 and rx_val * float(best_pt[0]) < -0.001:
                best_pt = None
            if (
                best_pt is not None
                and pname == "trunk_neck"
                and 1.34 <= pt[2] <= 1.508
                and -0.038 <= ry_val <= 0.048
                and abs(float(rest_nrm_u[u_i, 0])) > 0.72
            ):
                if abs(float(best_pt[1] - posed_0_u[u_i, 1])) > 0.068 or abs(float(best_nrm[1])) > 0.62:
                    best_pt = None
            if (
                best_pt is not None
                and pname == "trunk_neck"
                and 1.498 <= rz_val <= 1.612
                and abs(rx_val) >= 0.168
                and -0.088 <= ry_val <= 0.072
                and not (pt[2] >= 1.515 and ry_val <= -0.015 and best_nrm is not None and float(best_nrm[1]) < -0.38)
            ):
                if abs(float(best_pt[0])) > float(eval_x_split(pt[2])) - 0.004:
                    best_pt = None
            if (
                best_pt is not None
                and best_nrm is not None
                and pname == "trunk_neck"
                and 1.405 <= rz_val <= 1.572
                and ry_val <= -0.030
                and abs(rx_val) >= 0.136
            ):
                if abs(float(best_nrm[0])) > 0.74 and abs(float(best_pt[0])) > float(eval_x_split(pt[2])) + 0.009:
                    best_pt = None
            # Never let a bridged pelvic/perineal vertex (rz >= 0.985, |rx| < 0.048) shoot downward into the donor's Z~0.82m fused thigh webbing!
            if best_pt is not None and (wb_pel > 0.12 or (rz_val >= 0.985 and abs(rx_val) < 0.048)):
                if float(best_pt[2]) < z_bare_sad_floor - 0.008:
                    best_pt = None
            dz_hit = float(best_pt[2] - pt[2]) if best_pt is not None else 0.0
            if wb_pel > 0.15 and rz_val <= 1.038 and abs(rx_val) < 0.068:
                dz_ok = (-0.105 <= dz_hit <= 0.024)
            elif 0.86 <= pt[2] <= 1.22:
                dz_ok = (-0.135 <= dz_hit <= 0.045)
            else:
                max_dz = 0.098 if pt[2] >= 1.72 else 0.068
                dz_ok = abs(dz_hit) <= max_dz
            if best_pt is not None and best_nrm is not None and dz_ok:
                if wb_pel > 0.15 and rz_val <= 1.028 and -0.018 <= ry_val <= 0.010 and abs(rx_pel_u[u_i]) < 0.048 and dz_slot_crotch < -0.005:
                    z_th_cap = z_sad_floor + 0.007 + 0.25 * abs(float(rx_pel_u[u_i]))
                    if best_pt[2] > z_th_cap:
                        best_pt = best_pt.copy()
                        best_pt[2] = z_th_cap
                if sep_u[u_i]:
                    sx = sgn_x_u[u_i]
                    dx_pr = max(0.0, sx * float(posed_u[u_i, 0] - (rest_u[u_i, 0] + u_current[u_i, 0])))
                    mx_posed = float(min_x_u[u_i]) + dx_pr
                    if best_pt[0] * sx < mx_posed:
                        best_pt = best_pt.copy()
                        best_pt[0] = mx_posed * sx

                dp = best_pt - pt
                if p_idx <= 4 and 0.875 <= pt[2] <= 1.075 and pt[1] > 0.038 and abs(rx_val) >= 0.024 and float(best_nrm[2]) < -0.18 and dp[2] < -0.015:
                    dp = dp.copy()
                    dp[2] = max(float(dp[2]), -0.015)
                dp_len = float(np.linalg.norm(dp))
                t_dist = s01_scalar((dp_len - 0.005) / 0.024)
                t_over = s01_scalar((abs(float(best_nrm[2])) - 0.28) / 0.34)
                tau_eff = max(tau_t, 0.82 * t_dist, 0.55 * t_over)
                if dp_len > step_cap:
                    dp = dp * (step_cap / dp_len)

                m_plane = tau_eff * eye3 + (1.0 - tau_eff) * np.outer(best_nrm, best_nrm)
                wo = w_obs_u[u_i]
                if 1.003 <= rz_val <= 1.080 and abs(rx_val) <= 0.062:
                    wo *= 4.2
                ji = jac_u[u_i]
                jmj = ji.T @ m_plane @ ji
                a_blocks[u_i] += wo * jmj
                b_rhs[u_i] += wo * (ji.T @ (m_plane @ dp))
                fwd_hits += 1

        # --- Reverse Correspondence: Eligible Donor Samples -> Posed Canonical Surface (Unified Core + Arms) ---
        rev_hits = 0
        if w_rv > 0.0:
            rev_acc_m = np.zeros((n_u, 3, 3), dtype=np.float64)
            rev_acc_b = np.zeros((n_u, 3), dtype=np.float64)
            rev_cnt = np.zeros(n_u, dtype=np.float64)

            rev_dist_cap = 0.145 if p_idx <= 2 else (0.088 if p_idx <= 5 else 0.048)
            for rev_key, tri_mask in rev_groups:
                c_f_ids = np.flatnonzero(tri_obs & tri_mask)
                if not len(c_f_ids):
                    continue
                cu_v, cinv = np.unique(tri_u[c_f_ids].ravel(), return_inverse=True)
                cbvh = BVHTree.FromPolygons(posed_u[cu_v].tolist(), cinv.reshape(-1, 3).tolist(), all_triangles=True)
                s_pts, s_nrm, _ = donor_rev_samples[rev_key]
                for s_i in range(len(s_pts)):
                    q = s_pts[s_i]
                    qn = s_nrm[s_i]
                    ch, chn, cfl, cdist = cbvh.find_nearest(Vector(q.tolist()), rev_dist_cap)
                    if ch is None:
                        continue
                    chn_np = np.asarray(chn, dtype=np.float64)
                    if float(np.dot(chn_np, qn)) < 0.52:
                        continue
                    ch_np = np.asarray(ch, dtype=np.float64)
                    if rev_key == "body_core" and q[2] < 1.03 and abs(float(q[0])) > 0.008 and float(q[0]) * float(ch_np[0]) < -0.001:
                        continue
                    cd_f = max(float(cdist), 1e-8)
                    if cd_f > 0.006 and abs(float(np.dot(q - ch_np, chn_np))) < 0.55 * cd_f:
                        continue
                    verts_u = tri_u[c_f_ids[int(cfl)]]
                    d3 = np.linalg.norm(posed_u[verts_u] - q[None, :], axis=1)
                    u_i = int(verts_u[int(np.argmin(d3))])
                    wb_rev = float(w_bridged_pel_u[u_i])
                    if rev_key == "body_core" and q[2] < 1.060 and wb_rev > 0.25:
                        x_tol_rev = 0.009 if abs(float(rx_pel_u[u_i])) < 0.044 else 0.016
                        if abs(float(q[0]) - float(rx_pel_u[u_i]) * pel_x_scale) > x_tol_rev:
                            continue
                        if abs(float(rx_pel_u[u_i])) < 0.036 and abs(float(qn[0])) > 0.48:
                            continue
                    if rev_key == "body_core" and 1.34 <= q[2] <= 1.508 and -0.038 <= float(rest_u[u_i, 1]) <= 0.048:
                        if abs(float(q[1] - posed_u[u_i, 1])) > 0.058 or abs(float(q[1] - posed_0_u[u_i, 1])) > 0.095:
                            continue
                        if abs(float(rest_nrm_u[u_i, 0])) > 0.70 and abs(float(qn[1])) > 0.58:
                            continue
                    rz_u_rev = float(unfold_u[u_i, 2])
                    ry_u_rev = float(unfold_u[u_i, 1])
                    dz_rev = float(q[2] - posed_u[u_i, 2])
                    if wb_rev > 0.25 and rz_u_rev <= 1.038 and abs(float(unfold_u[u_i, 0])) < 0.068:
                        if dz_rev > 0.016 or dz_rev < -0.036:
                            continue
                        if rz_u_rev <= 1.020 and -0.024 <= ry_u_rev <= 0.006 and abs(float(rx_pel_u[u_i])) < 0.048 and dz_slot_crotch < -0.005:
                            if float(q[2]) > z_sad_floor + 0.009 + 0.35 * abs(float(rx_pel_u[u_i])):
                                continue
                    else:
                        in_torso_cr = (1.24 <= q[2] <= 1.54) and (p_idx >= 3)
                        rev_dz_cap = (
                            0.130
                            if (0.86 <= q[2] <= 1.16)
                            else (0.085 if q[2] >= 1.72 else (0.013 if in_torso_cr else 0.055))
                        )
                        if abs(dz_rev) > rev_dz_cap:
                            continue
                        if in_torso_cr and abs(float(chn_np[2] - qn[2])) > 0.52:
                            continue
                    q_eff = q
                    if sep_u[u_i]:
                        sx_r = sgn_x_u[u_i]
                        dx_pr_r = max(0.0, sx_r * float(posed_u[u_i, 0] - (rest_u[u_i, 0] + u_current[u_i, 0])))
                        mx_posed_r = float(min_x_u[u_i]) + dx_pr_r
                        if q_eff[0] * sx_r < mx_posed_r:
                            q_eff = q_eff.copy()
                            q_eff[0] = mx_posed_r * sx_r
                    dp = q_eff - posed_u[u_i]
                    dp_len = float(np.linalg.norm(dp))
                    t_dist = s01_scalar((dp_len - 0.005) / 0.024)
                    t_over = s01_scalar((abs(float(qn[2])) - 0.28) / 0.34)
                    tau_eff = max(tau_t, 0.82 * t_dist, 0.55 * t_over)
                    if dp_len > step_cap:
                        dp = dp * (step_cap / dp_len)
                    mq = tau_eff * eye3 + (1.0 - tau_eff) * np.outer(qn, qn)
                    rev_acc_m[u_i] += mq
                    rev_acc_b[u_i] += mq @ dp
                    rev_cnt[u_i] += 1.0
                    rev_hits += 1

            has_rev = (rev_cnt > 0) & (w_obs_u > 0.2)
            if np.any(has_rev):
                sc = (w_rv * w_obs_u[has_rev] / rev_cnt[has_rev])
                m_avg = rev_acc_m[has_rev] * sc[:, None, None]
                b_avg = rev_acc_b[has_rev] * sc[:, None]
                jh = jac_u[has_rev]
                a_blocks[has_rev] += np.einsum("nji,njk,nkl->nil", jh, m_avg, jh)
                b_rhs[has_rev] += np.einsum("nji,nj->ni", jh, b_avg)

        # Coupled sagittal +/-Y ray tangent-plane observations inside CG for:
        # 1) Anterior pectoral fold + slight breast underside (|px| in 0.042..0.212, smooth C2 into anterior axillary fold!)
        # 2) Posterior sub-axillary & waist back folds falling naturally downward (|px| <= saddle_x - 0.008)
        if p_idx >= 1:
            w_cr_gain = 2.2 if p_idx <= 2 else (3.4 if p_idx <= 5 else 4.6)
            for u_c in np.flatnonzero(chest_fold_zone_u):
                px_c, py_c, pz_c = float(posed_u[u_c, 0]), float(posed_u[u_c, 1]), float(posed_u[u_c, 2])
                if py_c > -0.068 or pz_c < 1.385 or pz_c > 1.555 or abs(px_c) > 0.184:
                    continue
                w_px_c = 1.0 - s01_scalar((abs(px_c) - 0.160) / 0.024)
                px_c_clip = float(np.clip(px_c, x_pec_grid[0], x_pec_grid[-1]))
                wf_c = float(np.interp(px_c_clip, x_pec_grid, w_pec_fold_grid))
                zv_c_loc = float(np.interp(px_c_clip, x_pec_grid, z_pec_val_grid))
                w_lat_c = w_px_c * s01_scalar((abs(px_c) - 0.024) / 0.016)
                w_eff_c = w_px_c * max(wf_c, 0.85 * w_lat_c * float(w_chest_zone_u[u_c]))
                if w_eff_c < 0.05:
                    continue
                hc, hnc, _, _ = trunk_bvh_crease.ray_cast(Vector((px_c, -0.40, pz_c)), ray_py_c, 0.36)
                w_ny_c = s01_scalar((-float(hnc.y) - 0.22) / 0.22) if hc is not None else 0.0
                w_dy_c = (1.0 - s01_scalar((abs(float(hc.y) - py_c) - 0.115) / 0.035)) if hc is not None else 0.0
                if w_ny_c * w_dy_c > 0.02:
                    hn_c = np.asarray(hnc, dtype=np.float64)
                    dp_c = np.asarray(hc, dtype=np.float64) - posed_u[u_c]
                    dp_c_len = float(np.linalg.norm(dp_c))
                    if dp_c_len > step_cap:
                        dp_c = dp_c * (step_cap / dp_c_len)
                    in_val_c = wf_c * (1.0 - s01_scalar((abs(pz_c - zv_c_loc) - 0.014) / 0.010))
                    tau_c = 0.22 + 0.18 * in_val_c
                    mc = tau_c * eye3 + (1.0 - tau_c) * np.outer(hn_c, hn_c)
                    wo_c = 1.45 * w_cr_gain * (1.0 + 0.45 * in_val_c) * w_eff_c * w_ny_c * w_dy_c * max(float(w_obs_u[u_c]), 0.45)
                    jc = jac_u[u_c]
                    a_blocks[u_c] += wo_c * (jc.T @ mc @ jc)
                    b_rhs[u_c] += wo_c * (jc.T @ (mc @ dp_c))

            # Anterior sub-belly overhang (panniculus) crease + lower belly apron across X=0..+-0.158m
            for u_s in np.flatnonzero(subbelly_fold_zone_u):
                px_s, py_s, pz_s = float(posed_u[u_s, 0]), float(posed_u[u_s, 1]), float(posed_u[u_s, 2])
                if py_s > -0.105 or pz_s < 1.000 or pz_s > 1.158 or abs(px_s) > 0.158:
                    continue
                w_lat_s = 1.0 - s01_scalar((abs(px_s) - 0.132) / 0.026)
                w_eff_s = w_lat_s * float(w_subbelly_zone_u[u_s])
                if w_eff_s < 0.05:
                    continue
                hc, hnc, _, _ = trunk_bvh_crease.ray_cast(Vector((px_s, -0.42, pz_s)), ray_py_c, 0.36)
                if hc is not None and float(hnc.y) < -0.10 and abs(float(hc.y) - py_s) < 0.185:
                    hn_s = np.asarray(hnc, dtype=np.float64)
                    dp_s = np.asarray(hc, dtype=np.float64) - posed_u[u_s]
                    dp_s_len = float(np.linalg.norm(dp_s))
                    if dp_s_len > step_cap:
                        dp_s = dp_s * (step_cap / dp_s_len)
                    ms = np.diag([0.14, 1.45, 0.12]) + 0.62 * np.outer(hn_s, hn_s)
                    apron_boost = 1.0 + 1.65 * s01_scalar((pz_s - 1.022) / 0.024)
                    wo_s = 3.20 * apron_boost * w_cr_gain * w_eff_s
                    js = jac_u[u_s]
                    a_blocks[u_s] += wo_s * (js.T @ ms @ js)
                    b_rhs[u_s] += wo_s * (js.T @ (ms @ dp_s))

            if p_idx >= 2:
                # Tangential Z + inward valley-Y diffeomorphic ribbon alignment of shared LOD1+LOD0 loop into REAL donor pectoral crease valley:
                # Strongest in central/medial crescent (|X|=0.045..0.108m) and fading smoothly to zero before |X|=0.138m so ZERO boxy outer corner forms!
                m_z_pec = np.diag([0.0, 0.0, 1.0])
                m_y_pec = np.diag([0.0, 1.0, 0.0])
                k_pec_loop = 2.2 if p_idx <= 4 else 3.0
                for u_c in np.flatnonzero(w_pec_loop_u > 0.05):
                    px_c, py_c, pz_c = float(posed_u[u_c, 0]), float(posed_u[u_c, 1]), float(posed_u[u_c, 2])
                    if py_c > -0.058 or abs(px_c) > 0.172:
                        continue
                    w_px_pec = s01_scalar((abs(px_c) - 0.030) / 0.018) * (1.0 - s01_scalar((abs(px_c) - 0.152) / 0.024))
                    if w_px_pec <= 0.02:
                        continue
                    px_clip = float(np.clip(px_c, x_pec_grid[0], x_pec_grid[-1]))
                    wf_c = float(np.interp(px_clip, x_pec_grid, w_pec_fold_grid))
                    if wf_c <= 0.04:
                        continue
                    zv_c = float(np.interp(px_clip, x_pec_grid, z_pec_val_grid))
                    yv_c = float(np.interp(px_clip, x_pec_grid, y_pec_val_grid))
                    dz_ref_pec = float(np.clip(unfold_u[u_c, 2] - z_pec_loop_ref_u[u_c], -0.024, 0.026))
                    row_sp_pec = (0.94 if dz_ref_pec > 0.0 else 0.98) + 0.04 * (1.0 - w_px_pec * float(w_pec_loop_u[u_c]))
                    crescent_cup_w = s01_scalar((abs(px_c) - 0.038) / 0.020) * (1.0 - s01_scalar((abs(px_c) - 0.148) / 0.024))
                    overhang_z = -0.0028 * crescent_cup_w * float(np.exp(-(((dz_ref_pec - 0.0115) / 0.0095) ** 2)))
                    z_tgt_c = float(np.clip(zv_c + row_sp_pec * dz_ref_pec + overhang_z, posed_0_u[u_c, 2] - 0.028, posed_0_u[u_c, 2] + 0.022))
                    dp_z = np.array([0.0, 0.0, float(np.clip(z_tgt_c - pz_c, -step_cap, step_cap))], dtype=np.float64)
                    wo_z = k_pec_loop * float(w_pec_loop_u[u_c]) * wf_c * w_px_pec
                    jc = jac_u[u_c]
                    a_blocks[u_c] += wo_z * (jc.T @ m_z_pec @ jc)
                    b_rhs[u_c] += wo_z * (jc.T @ (m_z_pec @ dp_z))
                    w_val_y = float(np.exp(-((dz_ref_pec / 0.0088) ** 2))) * crescent_cup_w
                    if w_val_y > 0.04 and yv_c > py_c - 0.018:
                        dp_y_pec = np.array([0.0, float(np.clip((yv_c + 0.0018) - py_c, -0.5 * step_cap, step_cap)), 0.0], dtype=np.float64)
                        wo_y_pec = 1.15 * wo_z * w_val_y
                        a_blocks[u_c] += wo_y_pec * (jc.T @ m_y_pec @ jc)
                        b_rhs[u_c] += wo_y_pec * (jc.T @ (m_y_pec @ dp_y_pec))
                    w_over_y = float(np.exp(-(((dz_ref_pec - 0.0135) / 0.0105) ** 2))) * crescent_cup_w
                    if w_over_y > 0.05 and py_c > yv_c - 0.0068:
                        dp_y_ov = np.array([0.0, float(np.clip((yv_c - 0.0062) - py_c, -step_cap, 0.0)), 0.0], dtype=np.float64)
                        wo_y_ov = 1.25 * wo_z * w_over_y
                        a_blocks[u_c] += wo_y_ov * (jc.T @ m_y_pec @ jc)
                        b_rhs[u_c] += wo_y_ov * (jc.T @ (m_y_pec @ dp_y_ov))

                # Ultra-gentle Z alignment of sub-belly crease strictly near Z~1.016m root so Z=1.04..1.09m apron NEVER gets lifted or thinned:
                k_sb_loop = 0.08 if p_idx <= 4 else 0.12
                for u_sb in np.flatnonzero(w_subbelly_loop_u > 0.06):
                    px_sb, py_sb, pz_sb = float(posed_u[u_sb, 0]), float(posed_u[u_sb, 1]), float(posed_u[u_sb, 2])
                    if py_sb > -0.145 or abs(px_sb) > 0.142:
                        continue
                    w_px_sb = 1.0 - s01_scalar((abs(px_sb) - 0.115) / 0.026)
                    if w_px_sb <= 0.02:
                        continue
                    px_sb_clip = float(np.clip(px_sb, x_sb_grid[0], x_sb_grid[-1]))
                    wf_sb = float(np.interp(px_sb_clip, x_sb_grid, w_sb_fold_grid))
                    if wf_sb <= 0.08:
                        continue
                    zv_sb = float(np.interp(px_sb_clip, x_sb_grid, z_sb_val_grid))
                    dz_ref_sb = float(np.clip(unfold_u[u_sb, 2] - z_sb_loop_ref_u[u_sb], -0.024, 0.024))
                    row_sp_sb = 1.18 if dz_ref_sb > 0.0 else 0.96
                    z_tgt_sb = float(np.clip(zv_sb + row_sp_sb * dz_ref_sb, posed_0_u[u_sb, 2] - 0.008, posed_0_u[u_sb, 2] + 0.006))
                    dp_z_sb = np.array([0.0, 0.0, float(np.clip(z_tgt_sb - pz_sb, -step_cap, step_cap))], dtype=np.float64)
                    wo_z_sb = k_sb_loop * float(w_subbelly_loop_u[u_sb]) * wf_sb * w_px_sb
                    j_sb = jac_u[u_sb]
                    a_blocks[u_sb] += wo_z_sb * (j_sb.T @ m_z_pec @ j_sb)
                    b_rhs[u_sb] += wo_z_sb * (j_sb.T @ (m_z_pec @ dp_z_sb))

            # Umbilical (navel) hollow ray + canonical ring alignment so LOD0 & LOD1 capture the crisp donor navel hollow!
            if w_nav_don > 0.05:
                m_xz_nav = np.diag([1.0, 0.0, 1.0])
                for u_n in np.flatnonzero(w_nav_halo_u > 0.05):
                    px_n, py_n, pz_n = float(posed_u[u_n, 0]), float(posed_u[u_n, 1]), float(posed_u[u_n, 2])
                    wn_u = float(w_nav_halo_u[u_n])
                    rx_n = float(rest_u[u_n, 0])
                    rz_n = float(rest_u[u_n, 2])
                    x_tgt_n = 1.22 * rx_n
                    z_tgt_n = z_nav_don + 0.90 * (rz_n - z_nav_ref_c)
                    jn = jac_u[u_n]
                    if p_idx >= 2:
                        dp_xz_n = np.array(
                            [float(np.clip(x_tgt_n - px_n, -step_cap, step_cap)), 0.0, float(np.clip(z_tgt_n - pz_n, -step_cap, step_cap))],
                            dtype=np.float64,
                        )
                        wo_n_xz = (2.2 if p_idx <= 4 else 3.2) * wn_u
                        a_blocks[u_n] += wo_n_xz * (jn.T @ m_xz_nav @ jn)
                        b_rhs[u_n] += wo_n_xz * (jn.T @ (m_xz_nav @ dp_xz_n))
                    hn_hit, hnn_hit, _, _ = trunk_bvh_crease.ray_cast(Vector((px_n, -0.45, pz_n)), ray_py_c, 0.40)
                    if hn_hit is not None and float(hnn_hit.y) < -0.25 and abs(float(hn_hit.y) - py_n) < 0.045:
                        hnn_np = np.asarray(hnn_hit, dtype=np.float64)
                        dp_ny = np.asarray(hn_hit, dtype=np.float64) - posed_u[u_n]
                        dp_ny_len = float(np.linalg.norm(dp_ny))
                        if dp_ny_len > step_cap:
                            dp_ny = dp_ny * (step_cap / dp_ny_len)
                        mn_ray = 0.25 * eye3 + 0.75 * np.outer(hnn_np, hnn_np)
                        wo_ny = (2.8 if p_idx <= 4 else 4.2) * wn_u
                        a_blocks[u_n] += wo_ny * (jn.T @ mn_ray @ jn)
                        b_rhs[u_n] += wo_ny * (jn.T @ (mn_ray @ dp_ny))

            for u_b in np.flatnonzero(back_fold_zone_u):
                px_b, py_b, pz_b = float(posed_u[u_b, 0]), float(posed_u[u_b, 1]), float(posed_u[u_b, 2])
                if py_b < 0.052 or pz_b < 1.270 or pz_b > 1.548 or abs(px_b) > sad_x_rev - 0.001 or abs(px_b) < 0.048:
                    continue
                w_lat_b = 1.0 - s01_scalar((abs(px_b) - (sad_x_rev - 0.014)) / 0.014)
                if w_lat_b < 0.05:
                    continue
                hc, hnc, _, _ = trunk_bvh_crease.ray_cast(Vector((px_b, 0.36, pz_b)), ray_my_c, 0.32)
                if hc is not None and float(hnc.y) > 0.22 and abs(float(hc.y) - py_b) < 0.048:
                    hn_b = np.asarray(hnc, dtype=np.float64)
                    dp_b = np.asarray(hc, dtype=np.float64) - posed_u[u_b]
                    dp_b_len = float(np.linalg.norm(dp_b))
                    if dp_b_len > step_cap:
                        dp_b = dp_b * (step_cap / dp_b_len)
                    mb = 0.24 * eye3 + 0.76 * np.outer(hn_b, hn_b)
                    wo_b = (1.6 if p_idx <= 2 else 2.5) * w_lat_b * float(w_obs_u[u_b])
                    jb = jac_u[u_b]
                    a_blocks[u_b] += wo_b * (jb.T @ mb @ jb)
                    b_rhs[u_b] += wo_b * (jb.T @ (mb @ dp_b))

            # Coupled horizontal -Y gluteal-cheek rays (Z >= 0.900m) + sagittal-polar subgluteal fold fallback against bare donor BVH (core_bvh_fg)
            # across 100% of the posterior glute cheek (independent of w_obs_u!) so ZERO '/' '\' swim-briefs outline or lower-glute deficit occurs!
            y0_gl_hub, z0_gl_hub = 0.015, 1.045
            ray_gl_my = Vector((0.0, -1.0, 0.0))
            for u_g in np.flatnonzero(glute_fold_zone_u):
                px_g, py_g, pz_g = float(posed_u[u_g, 0]), float(posed_u[u_g, 1]), float(posed_u[u_g, 2])
                if py_g < 0.008 or pz_g < 0.875 or pz_g > 1.150 or abs(px_g) < 0.008 or abs(px_g) > 0.184:
                    continue
                used_horiz_g = False
                if pz_g >= 0.896:
                    hg_h, hng_h, _, _ = core_bvh_fg.ray_cast(Vector((px_g, 0.36, pz_g)), ray_gl_my, 0.35)
                    if hg_h is not None and float(hng_h.y) > 0.18:
                        dp_g = np.asarray(hg_h, dtype=np.float64) - posed_u[u_g]
                        if abs(float(dp_g[1])) < 0.195:
                            if np.linalg.norm(dp_g) > step_cap:
                                dp_g = dp_g * (step_cap / float(np.linalg.norm(dp_g)))
                            hn_g = np.asarray(hng_h, dtype=np.float64)
                            mg = np.diag([0.14, 1.18, 0.16]) + 0.56 * np.outer(hn_g, hn_g)
                            wo_g = (6.4 if p_idx <= 3 else 9.2) * float(w_glute_zone_u[u_g])
                            jg = jac_u[u_g]
                            a_blocks[u_g] += wo_g * (jg.T @ mg @ jg)
                            b_rhs[u_g] += wo_g * (jg.T @ (mg @ dp_g))
                            used_horiz_g = True
                if not used_horiz_g:
                    dy_g = max(py_g - y0_gl_hub, 0.020)
                    dz_g = pz_g - z0_gl_hub
                    r_g = float(np.hypot(dy_g, dz_g))
                    if r_g < 0.030:
                        continue
                    dir_g = Vector((0.0, dy_g / r_g, dz_g / r_g))
                    st_g = Vector((px_g, y0_gl_hub, z0_gl_hub)) + 0.34 * dir_g
                    hg, hng, _, _ = core_bvh_fg.ray_cast(st_g, -dir_g, 0.30)
                    if hg is not None and float(hng.dot(dir_g)) > 0.24:
                        dp_g = np.asarray(hg, dtype=np.float64) - posed_u[u_g]
                        if p_idx <= 3 and dp_g[2] < -0.016:
                            dp_g = dp_g.copy()
                            dp_g[2] = max(float(dp_g[2]), -0.016)
                        dp_g_len = float(np.linalg.norm(dp_g))
                        if dp_g_len < 0.175:
                            if dp_g_len > step_cap:
                                dp_g = dp_g * (step_cap / dp_g_len)
                            hn_g = np.asarray(hng, dtype=np.float64)
                            mg = 0.34 * eye3 + 0.66 * np.outer(hn_g, hn_g)
                            wo_g = (3.8 if p_idx <= 3 else 5.4) * float(w_glute_zone_u[u_g])
                            jg = jac_u[u_g]
                            a_blocks[u_g] += wo_g * (jg.T @ mg @ jg)
                            b_rhs[u_g] += wo_g * (jg.T @ (mg @ dp_g))

        # Smooth perineal-saddle Z landing spring across bottom crotch arch (Y 100% free to match real donor groin & glutes!)
        if np.any(perin_sad_act_u):
            kz_ps = 3.6 * w_perin_sad_u[perin_sad_act_u]
            jz_ps = jac_u[perin_sad_act_u, 2, :]
            dpz_ps = np.clip(z_perin_tgt_u[perin_sad_act_u] - posed_u[perin_sad_act_u, 2], -step_cap, step_cap)
            a_blocks[perin_sad_act_u] += kz_ps[:, None, None] * (jz_ps[:, :, None] * jz_ps[:, None, :])
            b_rhs[perin_sad_act_u] += (kz_ps * dpz_ps)[:, None] * jz_ps

        # One-sided posed lateral X cap on sub-axillary trunk_neck back/rib wall using donor-measured posterior profile x_post_don_grid(z)
        # so the first back fold under the armpit falls naturally without pinching above Z=1.47m or protruding below the armpit,
        # and with a smooth C2 anterior taper (NO 28mm step at Y=-0.052m that created an outer-breast ridge on v=1489!)
        sub_ax_trunk = (
            free_u
            & (part_u == "trunk_neck")
            & (np.abs(rest_u[:, 0]) < 0.208)
            & (posed_u[:, 2] >= 1.340)
            & (posed_u[:, 2] <= 1.585)
        )
        if np.any(sub_ax_trunk):
            x_post_cur = np.interp(np.clip(posed_u[:, 2], z_post_grid[0], z_post_grid[-1]), z_post_grid, x_post_don_grid)
            w_post_y = smootherstep((posed_u[:, 1] - 0.006) / 0.036)
            x_mid_rib = eval_x_split(posed_u[:, 2]) + 0.008 * smootherstep((-posed_u[:, 1] - 0.045) / 0.068)
            x_sp_cur = (1.0 - w_post_y) * x_mid_rib + w_post_y * x_post_cur
            over_tr_x = sub_ax_trunk & (np.abs(posed_u[:, 0]) > x_sp_cur + 0.0002)
            if np.any(over_tr_x):
                kx_tr = 11.0
                jx_tr = jac_u[over_tr_x, 0, :]
                dpx_tr = np.clip(sgn_x_u[over_tr_x] * (x_sp_cur[over_tr_x] + 0.0002) - posed_u[over_tr_x, 0], -step_cap, step_cap)
                a_blocks[over_tr_x] += kx_tr * (jx_tr[:, :, None] * jx_tr[:, None, :])
                b_rhs[over_tr_x] += (kx_tr * dpx_tr)[:, None] * jx_tr

        # Strictly one-sided lateral serratus/ribcage floor across the arm-occluded mid-ribcage (rz=1.37..1.52, ry in -0.055..+0.032):
        # Prevents inward lean-ribcage collapse in Rest A-pose while NEVER pushing posterior back-fold vertices outward!
        if np.any(lat_serratus_act_u):
            y_ell_taper_all = 0.008 * smoothstep((np.abs(rest_u[:, 1]) - 0.030) / 0.040)
            x_ls_min = eval_x_split(posed_u[:, 2]) - 0.0145 - y_ell_taper_all
            under_ls = lat_serratus_act_u & (np.abs(posed_u[:, 0]) < x_ls_min)
            if np.any(under_ls):
                kx_ls = (3.0 if p_idx <= 4 else 2.2) * w_lat_serratus_u[under_ls]
                jx_ls = jac_u[under_ls, 0, :]
                dpx_ls = np.clip(sgn_x_u[under_ls] * x_ls_min[under_ls] - posed_u[under_ls, 0], -step_cap, step_cap)
                a_blocks[under_ls] += kx_ls[:, None, None] * (jx_ls[:, :, None] * jx_ls[:, None, :])
                b_rhs[under_ls] += (kx_ls * dpx_ls)[:, None] * jx_ls

        # One-sided posed-Y corridor barriers on occluded axillary-pocket / lateral-ribcage vertices:
        # 1) Anterior floor prevents arm-weighted armpit skin (v=288, 299) from drifting forward onto the breast mound;
        # 2) Posterior ceiling prevents lateral ribcage vertices (u=19086, 19270) from drifting backward into a corner pimple above the first back fold!
        ax_y_low_m = (w_ax_y_corr_u > 0.03) & (posed_u[:, 1] < y_ax_corr_floor_u)
        if np.any(ax_y_low_m):
            ky_axl = (3.0 if p_idx <= 5 else 2.4) * w_ax_y_corr_u[ax_y_low_m]
            jy_axl = jac_u[ax_y_low_m, 1, :]
            dpy_axl = np.clip(y_ax_corr_floor_u[ax_y_low_m] - posed_u[ax_y_low_m, 1], -step_cap, step_cap)
            a_blocks[ax_y_low_m] += ky_axl[:, None, None] * (jy_axl[:, :, None] * jy_axl[:, None, :])
            b_rhs[ax_y_low_m] += (ky_axl * dpy_axl)[:, None] * jy_axl
        ax_y_hi_m = (w_ax_y_corr_u > 0.03) & (posed_u[:, 1] > y_ax_corr_ceil_u)
        if np.any(ax_y_hi_m):
            ky_axh = (3.0 if p_idx <= 5 else 2.4) * w_ax_y_corr_u[ax_y_hi_m]
            jy_axh = jac_u[ax_y_hi_m, 1, :]
            dpy_axh = np.clip(y_ax_corr_ceil_u[ax_y_hi_m] - posed_u[ax_y_hi_m, 1], -step_cap, step_cap)
            a_blocks[ax_y_hi_m] += ky_axh[:, None, None] * (jy_axh[:, :, None] * jy_axh[:, None, :])
            b_rhs[ax_y_hi_m] += (ky_axh * dpy_axh)[:, None] * jy_axh

        # Sagittal X-lane spring across observed front groin & rear glutes (keeps rx=0.004..0.048 monotonically spaced; Y/Z 100% free!)
        if np.any(pel_lane_act_u):
            kx_pl = 5.5 * w_pel_lane_u[pel_lane_act_u]
            jx_pl = jac_u[pel_lane_act_u, 0, :]
            dpx_pl = np.clip(x_pel_lane_tgt_u[pel_lane_act_u] - posed_u[pel_lane_act_u, 0], -step_cap, step_cap)
            a_blocks[pel_lane_act_u] += kx_pl[:, None, None] * (jx_pl[:, :, None] * jx_pl[:, None, :])
            b_rhs[pel_lane_act_u] += (kx_pl * dpx_pl)[:, None] * jx_pl

        # One-sided REST-X cap on trunk-side axillary pocket wall so ribcage/teres wall never pokes through medial upper arm in Rest A-pose!
        rx_cur_ax = rest_u[:, 0] + u_current[:, 0]
        ax_over_u = ax_rib_u & (np.abs(rx_cur_ax) > ax_rib_rest_cap_x_u - 0.002)
        if np.any(ax_over_u):
            kx_ax = 12.0 * w_ax_rib_u[ax_over_u]
            du_ax_tgt = np.clip(sgn_x_u[ax_over_u] * ax_rib_rest_cap_x_u[ax_over_u] - rx_cur_ax[ax_over_u], -step_cap, step_cap)
            a_blocks[ax_over_u, 0, 0] += kx_ax
            b_rhs[ax_over_u, 0] += kx_ax * du_ax_tgt

        # Donor-proportional Rest-space anterior/central axillary unpinch so the occluded anterior armpit fold lowers smoothly
        # from canonical lean Z~1.54m down to ~1.50m (matching Raw Donor) without pinching upward!
        if np.any(ant_ax_unpinch_act_u):
            au_m = ant_ax_unpinch_act_u & (u_current[:, 2] > du_z_ant_ax_tgt - 0.002)
            if np.any(au_m):
                kz_au = (4.2 if p_idx <= 4 else 5.8) * w_ant_ax_unpinch_u[au_m]
                duz_au = np.clip(du_z_ant_ax_tgt - u_current[au_m, 2], -step_cap, step_cap)
                a_blocks[au_m, 2, 2] += kz_au
                b_rhs[au_m, 2] += kz_au * duz_au
            au_ym = ant_ax_unpinch_act_u & (rest_u[:, 1] < -0.025) & (u_current[:, 1] > du_y_ant_ax_tgt)
            if np.any(au_ym):
                ky_au = 2.6 * w_ant_ax_unpinch_u[au_ym]
                duy_au = np.clip(du_y_ant_ax_tgt - u_current[au_ym, 1], -step_cap, step_cap)
                a_blocks[au_ym, 1, 1] += ky_au
                b_rhs[au_ym, 1] += ky_au * duy_au

        # Exact sagittal midline X=0 lock + 1D vertical crown stature & 1D sliding plantar floor constraints (X/Y 100% free!)
        rx_cur = rest_u[:, 0] + u_current[:, 0]
        px_cur = posed_u[:, 0]
        if np.any(mid_u):
            a_blocks[mid_u, 0, 0] += 120.0
            b_rhs[mid_u, 0] += -120.0 * rx_cur[mid_u]
        z_crown_ref = float(rest_u[:, 2].max())
        crown_1d_u = free_u & (rest_u[:, 2] >= z_crown_ref - 0.0035)
        if np.any(crown_1d_u):
            a_blocks[crown_1d_u, 2, 2] += 140.0
            b_rhs[crown_1d_u, 2] += -140.0 * u_current[crown_1d_u, 2]
        plantar_1d_u = free_u & ((rest_u[:, 2] <= 0.0045) | ((rest_u[:, 2] <= 0.0090) & (rest_nrm_u[:, 2] < -0.60)))
        if np.any(plantar_1d_u):
            jz_pl = jac_u[plantar_1d_u, 2, :]
            dpz_pl = rest_u[plantar_1d_u, 2] - posed_u[plantar_1d_u, 2]
            a_blocks[plantar_1d_u] += 140.0 * (jz_pl[:, :, None] * jz_pl[:, None, :])
            b_rhs[plantar_1d_u] += (140.0 * dpz_pl)[:, None] * jz_pl
        floor_pen_u = free_u & (~plantar_1d_u) & (rest_u[:, 2] <= 0.045) & (posed_u[:, 2] < 0.0)
        if np.any(floor_pen_u):
            jz_fl = jac_u[floor_pen_u, 2, :]
            dpz_fl = np.clip(-posed_u[floor_pen_u, 2], 0.0, step_cap)
            a_blocks[floor_pen_u] += 95.0 * (jz_fl[:, :, None] * jz_fl[:, None, :])
            b_rhs[floor_pen_u] += (95.0 * dpz_fl)[:, None] * jz_fl
        pen_r = min_x_u - sgn_x_u * rx_cur
        pen_p = (min_x_u - sgn_x_u * px_cur) / np.maximum(jac_u[:, 0, 0], 0.5)
        need_du_mag = np.maximum(pen_r, pen_p)
        bar_active = sep_u & (need_du_mag > -0.0006) & ((sgn_x_u * rx_cur < min_x_u + 0.0008) | (sgn_x_u * px_cur < min_x_u + 0.0008))
        if np.any(bar_active):
            k_bar = 22.0
            du_target_x = np.maximum(need_du_mag[bar_active], 0.0) * sgn_x_u[bar_active]
            a_blocks[bar_active, 0, 0] += k_bar
            b_rhs[bar_active, 0] += k_bar * du_target_x

        du, cg_info = solve_coupled_3n_cg(
            a_blocks,
            b_rhs,
            u_current,
            free_u,
            connectivity,
            w_edge=w_edge,
            diag_w=diag_w,
            diag_w2=diag_w2,
            w_step_mem=ws_mem,
            w_step_bih=ws_bih,
            w_tot_mem=wt_mem,
            w_tot_bih=wt_bih,
            tot_scale_u=tot_scale_u,
            u_reg_base=u_reg_base,
        )
        u_current = np.where(free_u[:, None], u_current + du, 0.0)

        # Tangential quad-spacing fairing across Passes 1-7 using C2-feathered 14-ring macro normals on pelvic/gluteal creases
        w_glute_cl_u = (
            (1.0 - smootherstep((np.abs(unfold_u[:, 0]) - 0.018) / 0.012))
            * smootherstep((unfold_u[:, 1] - 0.002) / 0.010)
            * smootherstep((unfold_u[:, 2] - 1.018) / 0.016)
            * (1.0 - smootherstep((unfold_u[:, 2] - 1.140) / 0.020))
        )
        if p_idx <= 6:
            tan_iters = 6 if p_idx <= 3 else (4 if p_idx <= 5 else 2)
            base_nrm_w = 0.0 if (p_idx == 0 or p_idx >= 6) else (0.10 if p_idx <= 3 else 0.04)
            pel_nrm_w = 0.04 if p_idx <= 2 else 0.0
            w_pec_mound_u = w_chest_zone_u * smootherstep((unfold_u[:, 2] - 1.464) / 0.018) * (1.0 - w_pec_loop_u)
            w_torso_suppress_u = np.clip(
                np.maximum(
                    np.maximum(
                        w_chest_zone_u * (1.0 - 0.60 * smootherstep((unfold_u[:, 2] - 1.464) / 0.018) * (1.0 - w_pec_loop_u)),
                        w_subbelly_zone_u,
                    ),
                    w_back_zone_u,
                ),
                0.0,
                1.0,
            )
            w_glute_dome_u = (
                smootherstep((unfold_u[:, 1] - 0.025) / 0.025)
                * smootherstep((unfold_u[:, 2] - 0.860) / 0.030)
                * (1.0 - smootherstep((unfold_u[:, 2] - 1.155) / 0.035))
            )
            pel_nrm_blend = (1.0 - w_pel_unfold_u) * base_nrm_w + w_pel_unfold_u * (pel_nrm_w * (1.0 - w_perin_sad_u))
            base_pel_nrm_u = (1.0 - w_glute_cl_u) * pel_nrm_blend + w_glute_cl_u * (0.35 * base_nrm_w)
            nrm_w_vec = (1.0 - np.maximum(w_torso_suppress_u, w_glute_dome_u)) * base_pel_nrm_u + 0.0 * w_pec_mound_u
            concav_gain = (
                w_pel_dome_lift_u
                * (0.52 if p_idx <= 3 else (0.28 if p_idx <= 5 else 0.0))
                * smoothstep((unfold_u[:, 2] - 1.024) / 0.012)
                * ant_top_lift_taper_u
            )
            base_tan_cap = 0.0085 if p_idx <= 1 else (0.0055 if p_idx <= 3 else (0.0035 if p_idx <= 5 else 0.0018))
            pel_tan_cap = 0.0150 if p_idx <= 1 else (0.0100 if p_idx <= 3 else (0.0055 if p_idx <= 5 else 0.0022))
            tan_cap_vec = ((1.0 - w_pel_unfold_u) * base_tan_cap + w_pel_unfold_u * pel_tan_cap)[:, None]
            t_mask = tan_relax_u
            w_tr_vec = w_tan_relax_u[t_mask, None]
            w_macro_pel = np.clip(np.maximum(w_pel_unfold_u, w_glute_cl_u), 0.0, 1.0)[:, None]
            pel_macro_mask = pelvic_unfold_u | glute_cleft_u
            posed_init_f = posed_0 + np.einsum("vij,vj->vi", jac_all, u_current[weld])
            posed_init_nrm = vertex_normals(posed_init_f, all_tri, weld)
            macro_posed_u = smooth_vertex_vectors(posed_init_nrm, connectivity, 14)[first_raw].copy()
            bad_mx = pel_macro_mask & (np.abs(unfold_u[:, 0]) > 0.0005) & (unfold_u[:, 0] * macro_posed_u[:, 0] < 0.0)
            macro_posed_u[bad_mx, 0] = 0.0
            macro_posed_u[pel_macro_mask, 0] *= 0.20
            macro_posed_u /= np.maximum(np.linalg.norm(macro_posed_u, axis=1, keepdims=True), 1e-8)
            g_pel_tan = 0.52 if p_idx <= 5 else 0.28
            g_base_tan = 0.42 if p_idx <= 5 else 0.24
            tan_gain_v = ((1.0 - w_pel_unfold_u) * g_base_tan + w_pel_unfold_u * g_pel_tan)[:, None]
            for _ in range(tan_iters):
                posed_full = posed_0 + np.einsum("vij,vj->vi", jac_all, u_current[weld])
                posed_mid = posed_full[first_raw]
                raw_mid = vertex_normals(posed_full, all_tri, weld)[first_raw]
                nrm_mid = (1.0 - w_macro_pel) * raw_mid + w_macro_pel * macro_posed_u
                nrm_mid /= np.maximum(np.linalg.norm(nrm_mid, axis=1, keepdims=True), 1e-8)
                nbr_mid = np.column_stack(
                    [np.bincount(e_src, weights=w_pel_e * posed_mid[e_dst, c], minlength=n_u) / deg_pel_u for c in range(3)]
                )
                d_nbr = nbr_mid - posed_mid
                d_dot = np.einsum("ni,ni->n", d_nbr, nrm_mid)
                d_nrm_proj = d_dot[:, None] * nrm_mid
                d_tan = d_nbr - d_nrm_proj
                w_fold_loop_u = np.maximum(w_pec_loop_u, w_subbelly_loop_u)
                d_tan *= (1.0 - 0.94 * w_nav_halo_u)[:, None]
                d_tan *= (1.0 - 0.70 * w_glute_zone_u)[:, None]
                d_tan[:, 1] *= 1.0 - 0.95 * w_fold_loop_u
                d_tan[:, 2] *= 1.0 - 0.65 * w_fold_loop_u
                lift_dir = nrm_mid.copy()
                lift_dir[:, 2] = np.minimum(lift_dir[:, 2], 0.0)
                d_lift = (concav_gain * np.maximum(d_dot, 0.0))[:, None] * lift_dir
                dt_step = tan_gain_v * d_tan + nrm_w_vec[:, None] * d_nrm_proj + d_lift
                dt_len = np.linalg.norm(dt_step, axis=1, keepdims=True)
                dt_step = np.where(dt_len > tan_cap_vec, dt_step * (tan_cap_vec / np.maximum(dt_len, 1e-12)), dt_step)
                du_tan = np.einsum("nij,nj->ni", inv_jac_u, dt_step)
                du_tan[mid_u, 0] = 0.0
                u_current[t_mask] += w_tr_vec * du_tan[t_mask]
                rx_chk_t = rest_u[:, 0] + u_current[:, 0]
                viol_t = t_mask & sep_u & (sgn_x_u * rx_chk_t < min_x_u)
                u_current[viol_t, 0] = sgn_x_u[viol_t] * min_x_u[viol_t] - rest_u[viol_t, 0]

        # Rest-space sagittal-faithful tangent unfolding + C2-feathered concavity lift on coarse/mid passes
        w_cleft_unfold_u = np.where(
            free_u,
            np.clip(np.maximum(w_pel_unfold_u, w_glute_cl_u * smoothstep((w_obs_u - 0.60) / 0.20)), 0.0, 1.0),
            0.0,
        )
        cleft_unfold_u = w_cleft_unfold_u > 0.02
        if p_idx <= 5 and np.any(cleft_unfold_u):
            nrm_rm_w = 0.04 if p_idx <= 2 else 0.0
            unfold_iters = 4 if p_idx <= 3 else 2
            unfold_gain = 0.48 if p_idx <= 3 else 0.30
            rest_concav_gain = (
                w_pel_dome_lift_u
                * (0.38 if p_idx <= 3 else 0.0)
                * smoothstep((unfold_u[:, 2] - 1.024) / 0.012)
                * ant_top_lift_taper_u
            )
            w_cu_vec = w_cleft_unfold_u[cleft_unfold_u, None]
            rest_init_c = rest_all + u_current[weld]
            macro_rest_u = smooth_vertex_vectors(vertex_normals(rest_init_c, all_tri, weld), connectivity, 14)[first_raw].copy()
            bad_mrx = cleft_unfold_u & (np.abs(unfold_u[:, 0]) > 0.0005) & (unfold_u[:, 0] * macro_rest_u[:, 0] < 0.0)
            macro_rest_u[bad_mrx, 0] = 0.0
            macro_rest_u[cleft_unfold_u, 0] *= 0.20
            macro_rest_u /= np.maximum(np.linalg.norm(macro_rest_u, axis=1, keepdims=True), 1e-8)
            for _ in range(unfold_iters):
                rest_full_c = rest_all + u_current[weld]
                rest_mid = rest_full_c[first_raw]
                nbr_rm = np.column_stack(
                    [np.bincount(e_src, weights=w_pel_e * rest_mid[e_dst, c], minlength=n_u) / deg_pel_u for c in range(3)]
                )
                d_rm = nbr_rm - rest_mid
                d_rm_dot = np.einsum("ni,ni->n", d_rm, macro_rest_u)
                d_rm_n = d_rm_dot[:, None] * macro_rest_u
                d_rm_t = d_rm - d_rm_n
                w_n_loc = (((1.0 - 0.75 * w_glute_cl_u) * nrm_rm_w) * (1.0 - w_perin_sad_u))[:, None]
                lift_rm_dir = macro_rest_u.copy()
                lift_rm_dir[:, 2] = np.minimum(lift_rm_dir[:, 2], 0.0)
                d_rm_lift = (rest_concav_gain * np.maximum(d_rm_dot, 0.0))[:, None] * lift_rm_dir
                step_rm = unfold_gain * d_rm_t + w_n_loc * d_rm_n + d_rm_lift
                step_rm[mid_u, 0] = 0.0
                u_current[cleft_unfold_u] += w_cu_vec * step_rm[cleft_unfold_u]
                rx_chk = rest_u[:, 0] + u_current[:, 0]
                viol_pel = cleft_unfold_u & sep_u & (sgn_x_u * rx_chk < min_x_u)
                u_current[viol_pel, 0] = sgn_x_u[viol_pel] * min_x_u[viol_pel] - rest_u[viol_pel, 0]

        # Gentle C2 symmetry fairing
        if np.any(natal_v_u):
            w_nv_pass = (
                w_nv_u
                if p_idx <= 5
                else np.maximum(0.55 * w_nv_sp_u, np.maximum(0.42 * w_nv_gc_u, 0.30 * w_nv_fg_u))
            )
            w_nv_act = w_nv_pass[natal_v_u]
            w_nv_z_act = w_nv_act * (1.0 - 0.85 * w_perin_sad_u[natal_v_u])
            w_gc_act = (
                np.maximum(w_nv_gc_u[natal_v_u], w_nv_fg_u[natal_v_u])
                if p_idx <= 5
                else 0.40 * np.maximum(w_nv_gc_u[natal_v_u], w_nv_fg_u[natal_v_u])
            )
            for _ in range(5 if p_idx <= 5 else 3):
                rx_cur = rest_u[:, 0] + u_current[:, 0]
                ry_cur = rest_u[:, 1] + u_current[:, 1]
                rz_cur = rest_u[:, 2] + u_current[:, 2]
                nbr_rx = np.bincount(e_src, weights=w_pel_e * rx_cur[e_dst], minlength=n_u) / deg_pel_u
                nbr_ry = np.bincount(e_src, weights=w_pel_e * ry_cur[e_dst], minlength=n_u) / deg_pel_u
                nbr_rz = np.bincount(e_src, weights=w_pel_e * rz_cur[e_dst], minlength=n_u) / deg_pel_u
                dy_nv = nbr_ry[natal_v_u] - ry_cur[natal_v_u]
                sp_pinhole_boost = np.where((w_nv_sp_u[natal_v_u] > 0.35) & (dy_nv > 0.0015), 1.65, 1.0)
                u_current[natal_v_u, 1] += 0.36 * sp_pinhole_boost * w_nv_act * dy_nv
                u_current[natal_v_u, 2] += 0.28 * w_nv_z_act * (nbr_rz[natal_v_u] - rz_cur[natal_v_u])
                dx_nv = 0.24 * w_gc_act * (nbr_rx[natal_v_u] - rx_cur[natal_v_u])
                u_current[natal_v_u, 0] += dx_nv
                u_current[mid_u, 0] = -rest_u[mid_u, 0]
                rx_chk_nv = rest_u[:, 0] + u_current[:, 0]
                viol_nv = natal_v_u & sep_u & (sgn_x_u * rx_chk_nv < min_x_u)
                u_current[viol_nv, 0] = sgn_x_u[viol_nv] * min_x_u[viol_nv] - rest_u[viol_nv, 0]

        # C2 displacement fairing on (u_current - u_reg_base) strictly along the hidden axillary/deltoid w_arm hinge seam:
        # Pure positive relaxation across upper/posterior deltoid seams (prevents Taubin negative overshoot on trunk/arm steps),
        # with gentle anti-shrink only inside the lower axillary vault (preserves dz_axilla height & never blurs pec or back folds!)
        if p_idx <= 7 and np.any(rest_hinge_u):
            hinge_mask = rest_hinge_u
            w_tb_sh = w_sh_taubin_u[hinge_mask, None]
            pure_pos_w = np.clip(
                np.maximum(
                    np.maximum(
                        smootherstep((rest_u[hinge_mask, 2] - 1.535) / 0.032),
                        smootherstep((w_post_ax_fair_u[hinge_mask] - 0.06) / 0.16),
                    ),
                    1.0 - smootherstep((rest_u[hinge_mask, 1] + 0.035) / 0.025),
                ),
                0.0,
                1.0,
            )[:, None]
            w_tb_neg = 0.22 * (1.0 - pure_pos_w) * w_tb_sh
            disp_iters = 7 if p_idx == 7 else 5
            for _ in range(disp_iters):
                du_rel1 = u_current - u_reg_base
                nbr_u1 = np.column_stack(
                    [np.bincount(e_src, weights=w_len_e * du_rel1[e_dst, c], minlength=n_u) / diag_len_w for c in range(3)]
                )
                u_current[hinge_mask] += (0.40 * w_tb_sh) * (nbr_u1[hinge_mask] - du_rel1[hinge_mask])
                du_rel2 = u_current - u_reg_base
                nbr_u2 = np.column_stack(
                    [np.bincount(e_src, weights=w_len_e * du_rel2[e_dst, c], minlength=n_u) / diag_len_w for c in range(3)]
                )
                u_current[hinge_mask] -= w_tb_neg * (nbr_u2[hinge_mask] - du_rel2[hinge_mask])

        # UV-welded Posed+Rest convex deltoid dome, outer-pectoral-to-shoulder bridge & posterior-shoulder seam surface polish:
        # Erases lean F=0 bony acromial dimple, smooths both convex ridges & concave ripples on the outer breast, and eliminates UV-seam creases!
        w_pec_valley_narrow_u = np.where(
            w_pec_loop_u > 1e-4,
            w_pec_loop_u * np.exp(-(((unfold_u[:, 2] - z_pec_loop_ref_u) / 0.0105) ** 2)),
            0.0,
        )
        w_ant_pec_bridge_u = np.where(
            free_u,
            0.90
            * smootherstep((np.abs(rest_u[:, 0]) - 0.125) / 0.022)
            * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.245) / 0.028))
            * smootherstep((rest_u[:, 2] - 1.408) / 0.024)
            * (1.0 - smootherstep((rest_u[:, 2] - 1.598) / 0.028))
            * smootherstep((-rest_u[:, 1] - 0.016) / 0.022)
            * (1.0 - 0.98 * w_pec_valley_narrow_u),
            0.0,
        )
        w_delt_all_u = np.maximum(w_delt_surf_u, w_ant_pec_bridge_u)
        ds_m = w_delt_all_u > 0.02
        if p_idx <= 7 and np.any(ds_m):
            delt_fat_u = smootherstep((np.linalg.norm(u_current, axis=1) - 0.012) / 0.022)
            w_hinge_post_u = np.maximum(hinge_band, np.maximum(smootherstep((rest_u[:, 1] - 0.075) / 0.035), w_ant_pec_bridge_u))
            w_ds_eff = (w_delt_all_u * np.maximum(delt_fat_u, w_hinge_post_u))[ds_m, None]
            w_post_two_sided = np.maximum(
                smootherstep((rest_u[ds_m, 1] - 0.070) / 0.035),
                w_ant_pec_bridge_u[ds_m],
            )[:, None]
            ds_iters = 11 if p_idx >= 5 else 7
            for _ in range(ds_iters):
                posed_ds = posed_0 + np.einsum("vij,vj->vi", jac_all, u_current[weld])
                p_ds_u = posed_ds[first_raw]
                n_ds_u = vertex_normals(posed_ds, all_tri, weld)[first_raw]
                nbr_ds = np.column_stack(
                    [np.bincount(e_src, weights=w_len_e * p_ds_u[e_dst, c], minlength=n_u) / diag_len_w for c in range(3)]
                )
                d_ds = nbr_ds[ds_m] - p_ds_u[ds_m]
                n_ds = n_ds_u[ds_m]
                dot_ds = np.einsum("ni,ni->n", d_ds, n_ds)[:, None]
                d_ds_n = dot_ds * n_ds
                d_ds_t = d_ds - d_ds_n
                nrm_gain_ds = np.where(dot_ds > 0.0, 0.54, 0.46 * w_post_two_sided + 0.06)
                dp_ds = w_ds_eff * (0.44 * d_ds_t + nrm_gain_ds * d_ds_n)
                u_current[ds_m] += np.einsum("nij,nj->ni", inv_jac_u[ds_m], dp_ds)

        # Gentle Rest-A-pose concave hinge-groove & two-sided outer-breast/axillary fairing
        if p_idx >= 3:
            fat_ax_u = smootherstep((np.linalg.norm(u_current, axis=1) - 0.010) / 0.018)
            w_rest_ax_open_u = np.where(
                free_u,
                fat_ax_u
                * np.maximum(
                    np.maximum(hinge_band, 0.90 * w_ant_pec_bridge_u),
                    0.78 * smootherstep((rest_u[:, 1] - 0.040) / 0.025) * smootherstep((np.abs(rest_u[:, 0]) - 0.146) / 0.022),
                )
                * smootherstep((np.abs(rest_u[:, 0]) - 0.128) / 0.022)
                * (1.0 - smootherstep((np.abs(rest_u[:, 0]) - 0.275) / 0.028))
                * smootherstep((rest_u[:, 2] - 1.415) / 0.026)
                * (1.0 - smootherstep((rest_u[:, 2] - 1.635) / 0.028))
                * smootherstep((rest_u[:, 1] + 0.145) / 0.024)
                * (1.0 - smootherstep((rest_u[:, 1] - 0.148) / 0.028))
                * (1.0 - 0.98 * w_pec_valley_narrow_u),
                0.0,
            )
            rax_m = w_rest_ax_open_u > 0.02
            if np.any(rax_m):
                w_rax_v = w_rest_ax_open_u[rax_m, None]
                for _ in range(16 if p_idx == 7 else 9):
                    rest_rax_full = rest_all + u_current[weld]
                    r_rax_u = rest_rax_full[first_raw]
                    n_rax_u = vertex_normals(rest_rax_full, all_tri, weld)[first_raw]
                    nbr_rax = np.column_stack(
                        [np.bincount(e_src, weights=w_len_e * r_rax_u[e_dst, c], minlength=n_u) / diag_len_w for c in range(3)]
                    )
                    d_rax = nbr_rax[rax_m] - r_rax_u[rax_m]
                    n_rax = n_rax_u[rax_m]
                    dot_rax = np.einsum("ni,ni->n", d_rax, n_rax)[:, None]
                    d_rax_n = dot_rax * n_rax
                    d_rax_t = d_rax - d_rax_n
                    u_current[rax_m] += w_rax_v * (0.44 * d_rax_t + np.where(dot_rax > 0.0, 0.54, 0.42) * d_rax_n)

        if p_idx <= 7 and np.any(wrist_fair_mask_u):
            wf_m = wrist_fair_mask_u
            w_wf = w_wrist_fair_u[wf_m, None]
            for _ in range(8):
                nbr_wf = np.column_stack(
                    [np.bincount(e_src, weights=w_len_e * u_current[e_dst, c], minlength=n_u) / diag_len_w for c in range(3)]
                )
                u_current[wf_m] += (0.52 * w_wf) * (nbr_wf[wf_m] - u_current[wf_m])

        if p_idx <= 7 and np.any(elbow_fair_mask_u):
            ef_m = elbow_fair_mask_u
            w_ef = w_elbow_fair_u[ef_m, None]
            # Pure relative-displacement fairing on (u_current - u_reg_base): smooths skinning hinge steps WITHOUT
            # inflating the natural concave medial cubital crease (which previously ballooned plusX_elbow width by +60%)!
            for _ in range(8):
                du_el1 = u_current - u_reg_base
                nbr_ef1 = np.column_stack(
                    [np.bincount(e_src, weights=w_len_e * du_el1[e_dst, c], minlength=n_u) / diag_len_w for c in range(3)]
                )
                u_current[ef_m] += (0.45 * w_ef) * (nbr_ef1[ef_m] - du_el1[ef_m])

        if p_idx <= 7 and np.any(neck_fair_mask_u):
            nf_m = neck_fair_mask_u
            w_nf = w_neck_fair_u[nf_m, None]
            for _ in range(11):
                nbr_nf = np.column_stack(
                    [np.bincount(e_src, weights=w_len_e * u_current[e_dst, c], minlength=n_u) / diag_len_w for c in range(3)]
                )
                u_current[nf_m] += (0.52 * w_nf) * (nbr_nf[nf_m] - u_current[nf_m])

        # Smooth relative X displacement (NEVER absolute rx_pc, which chord-shortens the curved lateral ribcage inward by -26mm!)
        # across the upper-lat / back-corner wall so sub_ax_trunk follows x_post_don_grid(z) smoothly with zero step notch at Z=1.47m!
        lbx_m = post_corner_x_mask_u
        if p_idx <= 7 and np.any(lbx_m):
            w_lbx = w_post_corner_x_u[lbx_m]
            for _ in range(5):
                du_x = u_current[:, 0]
                nbr_dux = np.bincount(e_src, weights=w_len_e * du_x[e_dst], minlength=n_u) / diag_len_w
                u_current[lbx_m, 0] += (0.28 * w_lbx) * (nbr_dux[lbx_m] - du_x[lbx_m])
                u_current[mid_u, 0] = -rest_u[mid_u, 0]

        # Unified pelvic-arch diagonal-free cotangent fairing + 3-stage C2 sagittal projection onto watertight core_bvh_fg!
        # Keep X fairing strictly on w_cot_x (excluding mid_u so 0.8mm slivers never widen), while Y/Z fairing includes X=0 across
        # both front groin and rear perineal apex so X=0 NEVER recesses into a central V-notch or double-lobe!
        pel_arch_mask_u = fg_py_mask_u | bg_py_mask_u
        if p_idx <= 7 and np.any(pel_arch_mask_u):
            pa_idx = np.flatnonzero(pel_arch_mask_u)
            w_pa = np.maximum(w_fg_py_u, w_bg_py_u)[pa_idx]
            w_ps_pa = w_perin_sad_u[pa_idx]
            w_scrot_tip_u = (
                (1.0 - smootherstep((np.abs(rx_pel_u) - 0.018) / 0.010))
                * (1.0 - smootherstep((unfold_u[:, 1] - 0.085) / 0.018))
                * smootherstep((unfold_u[:, 2] - 1.000) / 0.012)
                * (1.0 - smootherstep((unfold_u[:, 2] - 1.115) / 0.018))
            )
            w_scrot_pa = w_scrot_tip_u[pa_idx, None]

            def fair_pelvic_arch_yz(p_src: np.ndarray) -> np.ndarray:
                nbr_x = np.bincount(e_src, weights=w_cot_x * p_src[e_dst, 0], minlength=n_u) / deg_cot_x
                nbr_yz_cot = np.column_stack(
                    [np.bincount(e_src, weights=w_cot_pa_e * p_src[e_dst, c], minlength=n_u) / deg_cot_pa for c in (1, 2)]
                )
                nbr_yz_len = np.column_stack(
                    [np.bincount(e_src, weights=w_len_pa_e * p_src[e_dst, c], minlength=n_u) / diag_len_pa for c in (1, 2)]
                )
                yz_blend = (1.0 - w_scrot_pa) * nbr_yz_cot[pa_idx] + w_scrot_pa * nbr_yz_len[pa_idx]
                return np.column_stack([nbr_x[pa_idx], yz_blend])

            # Step 1: 3D clipped-cotangent relaxation across pelvic arch + tangential-only convex glute & anterior groin preservation!
            for _ in range(8):
                p_full_pa1 = posed_0 + np.einsum("vij,vj->vi", jac_all, u_current[weld])
                p_all_pa = p_full_pa1[first_raw]
                nrm_pa1 = vertex_normals(p_full_pa1, all_tri, weld)[first_raw][pa_idx]
                nbr_blend = fair_pelvic_arch_yz(p_all_pa)
                dp_raw1 = nbr_blend - p_all_pa[pa_idx]
                w_og1 = np.maximum(
                    smootherstep((np.abs(p_all_pa[pa_idx, 0]) - 0.022) / 0.016)
                    * smootherstep((p_all_pa[pa_idx, 1] - 0.030) / 0.022),
                    smootherstep((-p_all_pa[pa_idx, 1] - 0.050) / 0.028),
                )
                dot_og1 = np.einsum("ni,ni->n", dp_raw1, nrm_pa1)
                dp_raw1 = dp_raw1 - (w_og1 * np.minimum(dot_og1, 0.0))[:, None] * nrm_pa1
                dp_pa = (0.42 * w_pa)[:, None] * dp_raw1
                dp_pa[:, 2] *= 1.0 - 0.85 * w_ps_pa
                u_current[pa_idx] += np.einsum("nij,nj->ni", inv_jac_u[pa_idx], dp_pa)
                u_current[mid_u, 0] = -rest_u[mid_u, 0]
                rx_chk_pa = rest_u[:, 0] + u_current[:, 0]
                viol_pa = pel_arch_mask_u & sep_u & (sgn_x_u * rx_chk_pa < min_x_u)
                u_current[viol_pa, 0] = sgn_x_u[viol_pa] * min_x_u[viol_pa] - rest_u[viol_pa, 0]

            # Step 2: Three-stage C-infinity outside-in radial pelvic-hub projection onto bare_donor_xyz (core_bvh_fg) + quad-grid 3D polish
            # Front groin uses 12mm 5-tap horizontal filter (erasing any briefs lateral lobe); rear cleft keeps crisp 2.5mm 3-tap filter!
            dy_cap_fg = 0.048 if p_idx <= 4 else 0.032
            dy_cap_bg = 0.045 if p_idx <= 4 else 0.032
            y_hub_fg, z_hub_fg = -0.045, 0.988
            y_hub_bg, z_hub_bg = -0.035, 0.985

            def sample_3tap_dr(px_q: float, py_q: float, pz_q: float, dir_out: Vector, is_front: bool = False) -> tuple[float, float]:
                if is_front:
                    dx_tap = 0.0120 * (1.0 - s01_scalar((abs(px_q) - 0.018) / 0.018))
                    taps = (
                        (
                            (px_q - dx_tap, 0.15),
                            (px_q - 0.5 * dx_tap, 0.22),
                            (px_q, 0.26),
                            (px_q + 0.5 * dx_tap, 0.22),
                            (px_q + dx_tap, 0.15),
                        )
                        if dx_tap > 1e-4
                        else ((px_q, 1.0),)
                    )
                else:
                    dx_tap = 0.0025 * (1.0 - s01_scalar((abs(px_q) - 0.018) / 0.016))
                    taps = ((px_q - dx_tap, 0.25), (px_q, 0.50), (px_q + dx_tap, 0.25)) if dx_tap > 1e-4 else ((px_q, 1.0),)
                dr_acc, w_acc = 0.0, 0.0
                r_start = 0.068 if is_front else 0.165
                r_max = 0.140 if is_front else 0.255
                d_tol = 0.048 if is_front else 0.125
                for tx, tw in taps:
                    st = Vector((tx, py_q, pz_q)) + r_start * dir_out
                    ht, hnt, _, dt = core_bvh_fg.ray_cast(st, -dir_out, r_max)
                    if ht is not None:
                        wc = s01_scalar((float(hnt.dot(dir_out)) - 0.22) / 0.26)
                        nx_inward = abs(float(hnt.x)) if abs(tx) < 0.038 else max(0.0, -float(np.sign(tx)) * float(hnt.x))
                        wn = 1.0 - s01_scalar((nx_inward - 0.42) / 0.28)
                        wd = 1.0 - s01_scalar((abs(float(dt) - r_start) - d_tol) / 0.032)
                        wh = wc * wn * wd
                        if wh > 0.01:
                            dr_t = float((ht - Vector((tx, py_q, pz_q))).dot(dir_out))
                            dr_acc += (tw * wh) * dr_t
                            w_acc += tw * wh
                return (dr_acc / w_acc, w_acc) if w_acc > 0.01 else (0.0, 0.0)

            for sub_p, gain_proj, fair_iters, fair_gain in (
                (0, 0.78 if p_idx <= 5 else 0.80, 5, 0.36),
                (1, 0.58, 4, 0.28),
                (2, 0.40, 4, 0.22),
            ):
                p_now_pa = (posed_0 + np.einsum("vij,vj->vi", jac_all, u_current[weld]))[first_raw]
                for u_pa in pa_idx:
                    wb_pa = float(w_bridged_pel_u[u_pa])
                    px_v, py_v, pz_v = float(p_now_pa[u_pa, 0]), float(p_now_pa[u_pa, 1]), float(p_now_pa[u_pa, 2])
                    uf_y = float(unfold_u[u_pa, 1])
                    if pz_v < 0.880 or pz_v > 1.060:
                        continue

                    # (A) Anterior groin & groin-to-thigh front: smooth Y/Z continuity across X=0 & wb_pa border (ZERO V-notch, ZERO W-grooves!)
                    w_ant_root_y = max(
                        wb_pa,
                        s01_scalar((-py_v - 0.088) / 0.032)
                        * s01_scalar((pz_v - (z_sad_floor - 0.008)) / 0.016)
                        * s01_scalar((-uf_y + 0.002) / 0.020),
                    )
                    if uf_y <= 0.004 and w_fg_py_u[u_pa] > 0.02 and w_ant_root_y > 0.02 and py_v <= -0.038 and abs(px_v) <= 0.105:
                        w_zp_fg = s01_scalar((pz_v - (z_sad_floor - 0.008)) / 0.016) * (1.0 - s01_scalar((pz_v - 1.002) / 0.022))
                        w_uf_fg = s01_scalar((-uf_y + 0.004) / 0.028)
                        w_py_fg = s01_scalar((-py_v - 0.038) / 0.038)
                        if w_zp_fg * w_uf_fg * w_py_fg > 0.01:
                            w_rad_fg = max(wb_pa, (1.0 - s01_scalar((abs(px_v) - 0.022) / 0.018)) * w_ant_root_y)
                            ry_fg = min(py_v - y_hub_fg, -0.030)
                            rz_fg = w_rad_fg * min(pz_v - z_hub_fg, 0.012)
                            r_fg = float(np.hypot(ry_fg, rz_fg))
                            if r_fg >= 0.025:
                                dir_out_fg = Vector((0.0, ry_fg / r_fg, rz_fg / r_fg))
                                dr_raw_fg, w_hit = sample_3tap_dr(px_v, py_v, pz_v, dir_out_fg, is_front=True)
                                if w_hit > 0.01:
                                    w_base_fg = gain_proj * w_hit * float(w_fg_py_u[u_pa]) * w_zp_fg * w_uf_fg * w_py_fg
                                    dr_fg = float(np.clip(dr_raw_fg, -dy_cap_fg, dy_cap_fg))
                                    dpy_fg = (w_base_fg * w_ant_root_y) * dr_fg * float(dir_out_fg.y)
                                    dpz_fg = (w_base_fg * w_rad_fg) * dr_fg * float(dir_out_fg.z)
                                    z_arch_fg = (z_sad_floor + 0.0004) + 0.0018 * (s01_scalar(abs(px_v) / 0.0300) ** 2)
                                    if w_rad_fg > 0.20 and abs(px_v) < 0.024 and pz_v + dpz_fg < z_arch_fg:
                                        dpz_fg = max(dpz_fg, z_arch_fg - pz_v)
                                    dp_fg = np.array([0.0, dpy_fg, dpz_fg], dtype=np.float64)
                                    u_current[u_pa] += inv_jac_u[u_pa] @ dp_fg
                        continue

                    # (B) Posterior glute cleft, lower buttock crescent & glute-to-hamstring root across |px_v|<=152mm!
                    w_post_root_y = max(
                        wb_pa,
                        s01_scalar((py_v - 0.012) / 0.028)
                        * s01_scalar((pz_v - (z_sad_floor - 0.008)) / 0.016)
                        * s01_scalar((uf_y + 0.002) / 0.018),
                    )
                    if uf_y >= -0.002 and w_bg_py_u[u_pa] > 0.02 and w_post_root_y > 0.02 and pz_v >= 0.886 and pz_v <= 1.044 and py_v >= -0.005 and abs(px_v) <= 0.068:
                        w_zb = s01_scalar((pz_v - (z_sad_floor - 0.008)) / 0.016) * (1.0 - s01_scalar((pz_v - 1.022) / 0.022))
                        w_uf_bg = s01_scalar((uf_y + 0.002) / 0.022)
                        w_py_bg = s01_scalar((py_v + 0.005) / 0.028)
                        if w_zb * w_uf_bg * w_py_bg > 0.01:
                            w_rad_bg = max(
                                wb_pa,
                                (1.0 - 0.55 * s01_scalar((abs(px_v) - 0.020) / 0.025)) * w_post_root_y
                                if pz_v < z_hub_bg
                                else (1.0 - s01_scalar((abs(px_v) - 0.016) / 0.016)) * w_post_root_y,
                            )
                            ry_bg = max(py_v - y_hub_bg, 0.030)
                            rz_bg = w_rad_bg * (pz_v - z_hub_bg)
                            r_bg = float(np.hypot(ry_bg, rz_bg))
                            if r_bg >= 0.025:
                                dir_out_bg = Vector((0.0, ry_bg / r_bg, rz_bg / r_bg))
                                dr_raw_bg, w_hit_b = sample_3tap_dr(px_v, py_v, pz_v, dir_out_bg)
                                if w_hit_b > 0.01:
                                    w_base_bg = gain_proj * w_hit_b * float(w_bg_py_u[u_pa]) * w_zb * w_uf_bg * w_py_bg
                                    dr_bg = float(np.clip(dr_raw_bg, -dy_cap_bg, dy_cap_bg))
                                    dpy_bg = (w_base_bg * w_post_root_y) * dr_bg * float(dir_out_bg.y)
                                    dpz_bg = (w_base_bg * w_rad_bg) * dr_bg * float(dir_out_bg.z)
                                    z_arch_bg = (
                                        (z_sad_floor - 0.0045)
                                        - 0.0045 * s01_scalar((py_v - 0.012) / 0.030)
                                        + 0.0014 * s01_scalar(abs(px_v) / 0.0240)
                                    )
                                    if w_rad_bg > 0.20 and abs(px_v) < 0.028 and pz_v + dpz_bg < z_arch_bg:
                                        dpz_bg = max(dpz_bg, z_arch_bg - pz_v)
                                    dp_bg = np.array([0.0, dpy_bg, dpz_bg], dtype=np.float64)
                                    u_current[u_pa] += inv_jac_u[u_pa] @ dp_bg

                u_current[mid_u, 0] = -rest_u[mid_u, 0]
                rx_chk_pr = rest_u[:, 0] + u_current[:, 0]
                viol_pr = pel_arch_mask_u & sep_u & (sgn_x_u * rx_chk_pr < min_x_u)
                u_current[viol_pr, 0] = sgn_x_u[viol_pr] * min_x_u[viol_pr] - rest_u[viol_pr, 0]

                # Clipped-cotangent 3D polish + tangential-only convex glute & anterior groin preservation!
                for _ in range(fair_iters):
                    p_full_pa2 = posed_0 + np.einsum("vij,vj->vi", jac_all, u_current[weld])
                    p_post_pa = p_full_pa2[first_raw]
                    nrm_pa2 = vertex_normals(p_full_pa2, all_tri, weld)[first_raw][pa_idx]
                    nbr_blend2 = fair_pelvic_arch_yz(p_post_pa)
                    dp_raw2 = nbr_blend2 - p_post_pa[pa_idx]
                    w_og2 = np.maximum(
                        smootherstep((np.abs(p_post_pa[pa_idx, 0]) - 0.022) / 0.016)
                        * smootherstep((p_post_pa[pa_idx, 1] - 0.030) / 0.022),
                        smootherstep((-p_post_pa[pa_idx, 1] - 0.050) / 0.028),
                    )
                    dot_og2 = np.einsum("ni,ni->n", dp_raw2, nrm_pa2)
                    dp_raw2 = dp_raw2 - (w_og2 * np.minimum(dot_og2, 0.0))[:, None] * nrm_pa2
                    dp_pa2 = (fair_gain * w_pa)[:, None] * dp_raw2
                    dp_pa2[:, 2] *= 1.0 - 0.85 * w_ps_pa
                    u_current[pa_idx] += np.einsum("nij,nj->ni", inv_jac_u[pa_idx], dp_pa2)
                    u_current[mid_u, 0] = -rest_u[mid_u, 0]
                    rx_chk_pa2 = rest_u[:, 0] + u_current[:, 0]
                    viol_pa2 = pel_arch_mask_u & sep_u & (sgn_x_u * rx_chk_pa2 < min_x_u)
                    u_current[viol_pa2, 0] = sgn_x_u[viol_pa2] * min_x_u[viol_pa2] - rest_u[viol_pa2, 0]

        step_mm = np.linalg.norm(du, axis=1) * 1000.0
        pass_logs.append(
            {
                "pass": p_idx + 1,
                "forwardMatchedUniqueVertices": fwd_hits,
                "reverseDonorSampleMatches": rev_hits,
                "midlineBarrierActiveVertices": int(bar_active.sum()),
                "p95RestStepMm": round(float(np.quantile(step_mm, 0.95)), 3),
                "maxRestStepMm": round(float(step_mm.max()), 3),
                "cg": cg_info,
            }
        )

    u_verts = np.where((hard_gain > 1e-6)[:, None], u_current[weld], 0.0)
    posed_final = posed_0 + np.einsum("vij,vj->vi", jac_all, u_verts)
    return rest_all + u_verts, posed_final, {"passes": pass_logs}



RAW_CG_CACHE_SCHEMA = "raw-cg-fit-v3-no-world-pins"


def _compute_cg_solver_cache_key(
    glb_sha: str,
    compiled_sha: str,
    lod0_sha: str,
    lod1_sha: str,
) -> str:
    """Deterministic hash of pre-polish solver inputs + pre-polish solver source only.
    Editing `post_fit_polish.py`, `raised_arm_corrective.py`, `audit_sheet.py`, or the
    post-polish functions in `head_hand_polish.py` preserves 100% cache hit (<10s loop)!
    """
    h = hashlib.sha256()
    h.update(RAW_CG_CACHE_SCHEMA.encode("utf-8"))
    h.update(glb_sha.encode("utf-8"))
    h.update(compiled_sha.encode("utf-8"))
    h.update(lod0_sha.encode("utf-8"))
    h.update(lod1_sha.encode("utf-8"))
    # Include only pre-CG solver source up to RAW_CG_CACHE_SCHEMA + canonical_masks + align_donor_head_to_canonical_skull
    self_txt = Path(__file__).read_text().split("RAW_CG_CACHE_SCHEMA")[0]
    cm_txt = (Path(__file__).parent / "canonical_masks.py").read_text()
    hh_txt = (Path(__file__).parent / "head_hand_polish.py").read_text().split("def polish_head_and_neck_fullness")[0]
    hh_txt = "\n".join(hh_txt.splitlines()[11:])
    h.update(self_txt.encode("utf-8"))
    h.update(cm_txt.encode("utf-8"))
    h.update(hh_txt.encode("utf-8"))
    return h.hexdigest()[:16]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--donor-glb", required=True, type=Path)
    parser.add_argument("--coordinate-id", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--canonical-lod0",
        type=Path,
        default=Path(
            "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-11-peacock-full-transfer/study/continuation/finish/root/body-audit/body-v3/authoring-controls.npz"
        ),
    )
    parser.add_argument(
        "--canonical-lod1",
        type=Path,
        default=Path(
            "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-11-peacock-full-transfer/study/continuation/finish/root/body-audit/body-v3/runtime-controls.npz"
        ),
    )
    parser.add_argument(
        "--canonical-lean-support",
        type=Path,
        default=Path(
            "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study/family-20261113/supports/M050-F000-lean-v3.npz"
        ),
    )
    parser.add_argument(
        "--canonical-triangles",
        type=Path,
        default=Path(
            "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-11-peacock-full-transfer/study/transfer/final-belly/transfer-arrays.npz"
        ),
    )
    parser.add_argument(
        "--canonical-interface",
        type=Path,
        default=Path(
            "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study/execution-20261112/stage-a/fit-evidence/workspace/fit/canonical-interface.json"
        ),
    )
    parser.add_argument(
        "--canonical-compiled",
        type=Path,
        default=Path(
            "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-11-peacock-full-transfer/study/continuation/finish/root/body-audit/body-v3-kit/compiled.json"
        ),
    )
    parser.add_argument("--shared-map", type=Path, help="Optional frozen LOD0->LOD1 mapping.npz to reuse or write")
    parser.add_argument(
        "--lean-reference-support",
        type=Path,
        default=None,
        help="Optional same-muscle lean F=0 support NPZ for raised-arm fat thickness (defaults to --canonical-lean-support)",
    )
    parser.add_argument(
        "--rebuild-raw-cache",
        action="store_true",
        help="Force recomputing the raw pre-polish CG fit instead of loading from fits/_raw_fit_cache",
    )
    parser.add_argument(
        "--full-audit",
        action="store_true",
        help="Render the full 11-board sign-off suite in addition to the fast consolidated 1:1 iteration sheet",
    )
    parser.add_argument(
        "--pelvis-preview-only",
        action="store_true",
        help="Fast preview mode: render signoff-08-pelvis-groin-glutes-zoom.png only (pair with verify --concept-only)",
    )
    parser.add_argument(
        "--export-glb",
        type=Path,
        default=None,
        help="Optional output path for the assembled rigged + PBR + animated covered character .glb",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "fits" / "_raw_fit_cache",
        help="Shared raw-CG & map cache directory",
    )
    parser.add_argument(
        "--sex",
        choices=("auto", "male", "female"),
        default="auto",
        help="Anatomical pelvic contour sex (auto-detected from canonical foundation mesh by default)",
    )
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else None)

    t0 = perf_counter()
    args.output.mkdir(parents=True, exist_ok=True)

    compiled = json.loads(args.canonical_compiled.read_text())
    compiled_sha = sha256_file(args.canonical_compiled)
    lod0_sha = sha256_file(args.canonical_lod0)
    lod1_sha = sha256_file(args.canonical_lod1)
    stature_m = float(compiled["referenceStatureMetres"])
    interface = json.loads(args.canonical_interface.read_text())
    lean_sup_bl = gltf_to_blender(np.load(args.canonical_lean_support)["positions"])
    if args.lean_reference_support is not None:
        _lr_npz = np.load(args.lean_reference_support)
        lean_ref_bl = gltf_to_blender(_lr_npz["positions"]) if "positions" in _lr_npz.files else _lr_npz["full"].astype(np.float64)
    else:
        lean_ref_bl = lean_sup_bl

    rest_high_raw = np.load(args.canonical_lod0)["reference"].astype(np.float64)
    rest_low_raw = np.load(args.canonical_lod1)["reference"].astype(np.float64)
    seam_body = np.asarray(compiled["seams"][0]["bodyVertices"], dtype=np.int64)
    seam_head = np.asarray(compiled["seams"][0]["headVertices"], dtype=np.int64)

    z_shift = float(lean_sup_bl[seam_body, 2].mean() - rest_low_raw[seam_body, 2].mean())
    rest_high = rest_high_raw + np.array([0.0, 0.0, z_shift])
    rest_low = rest_low_raw + np.array([0.0, 0.0, z_shift])
    canon_head_xyz = gltf_to_blender(compiled["meshes"]["headSkin"]["positions"])
    head_tri = np.asarray(compiled["meshes"]["headSkin"]["triangles"], dtype=np.int64).reshape(-1, 3)

    landmarks_bl = {
        k: gltf_to_blender(v["position"])[0] + np.array([0.0, 0.0, z_shift])
        for k, v in compiled["landmarks"].items()
    }

    topo = np.load(args.canonical_triangles)
    high_tri = topo["lod0Triangles"].astype(np.int64)
    low_tri = topo["lod1Triangles"].astype(np.int64)
    lod0_iface = np.asarray(interface["lod0"], dtype=np.int64)

    joint_names = [j["id"] for j in compiled["rig"]["joints"]]
    n_joints = len(joint_names)
    lod1_weights = extract_mesh_joint_weights(compiled["meshes"]["bodySkin"], len(rest_low), n_joints)
    head_weights = extract_mesh_joint_weights(compiled["meshes"]["headSkin"], len(canon_head_xyz), n_joints)

    sub_head = build_subdivided_head_for_lod0_seam(
        rest_high, lod0_iface, canon_head_xyz, head_tri, seam_head, head_weights
    )
    n_body = len(rest_high)
    orig_head_n = len(canon_head_xyz)
    rest_all = np.vstack([rest_high, sub_head["subPoints"]])
    all_tri = np.vstack([high_tri, sub_head["subTriangles"] + n_body])

    # Shared LOD0 -> LOD1 reduction map (auto-cached in fits/_raw_fit_cache/shared-lod0-to-lod1-map.npz for <0.05s load!)
    raw_cache_dir = args.cache_dir.resolve()
    raw_cache_dir.mkdir(parents=True, exist_ok=True)
    default_map_cache = raw_cache_dir / "shared-lod0-to-lod1-map.npz"
    map_path = args.shared_map if args.shared_map else default_map_cache
    if map_path.is_file():
        sm = np.load(map_path)
        map_faces, map_weights = sm["faces"], sm["weights"]
    else:
        map_faces, map_weights, map_gaps = map_lod0_to_lod1(rest_high, high_tri, rest_low)
        map_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(map_path, faces=map_faces, weights=map_weights, referenceDistancesM=map_gaps)

    # Also cache transferred LOD0 skin weights alongside shared map so cached runs skip 32,335 BVH queries!
    w0_cache_path = raw_cache_dir / f"lod0-skin-weights-{compiled_sha[:12]}.npz"
    if w0_cache_path.is_file():
        lod0_weights = np.load(w0_cache_path)["weights"].astype(np.float64)
    else:
        lod0_weights = transfer_skin_to_lod0(rest_high, rest_low, low_tri, lod1_weights)
        w0_cache_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(w0_cache_path, weights=lod0_weights.astype(np.float32))
    all_weights = np.vstack([lod0_weights, sub_head["subWeights"]])

    raw_xyz, donor_tri, donor_rgb, glb_sha = load_donor_cached(args.donor_glb)
    cache_key = _compute_cg_solver_cache_key(glb_sha, compiled_sha, lod0_sha, lod1_sha)
    raw_cache_file = raw_cache_dir / f"{args.coordinate_id}-{cache_key}.npz"

    raw_cache_hit = False
    if raw_cache_file.is_file() and not args.rebuild_raw_cache:
        c_npz = np.load(raw_cache_file, allow_pickle=False)
        donor_reg = c_npz["donorReg"].astype(np.float64)
        posed_all_0 = c_npz["posedAll0"].astype(np.float64)
        jac_all = c_npz["jacAll"].astype(np.float64)
        rest_all_fit_raw = c_npz["restAllFitRaw"].astype(np.float64)
        reg_info = json.loads(str(c_npz["regInfoJson"]))
        pose_info = json.loads(str(c_npz["poseInfoJson"]))
        solve_info = json.loads(str(c_npz["solveInfoJson"]))
        j_map_c = {n: i for i, n in enumerate(joint_names)}
        w_al_c = all_weights[:n_body, j_map_c["upperarm_l"]] + all_weights[:n_body, j_map_c["upperarm_pressure_l"]] + all_weights[:n_body, j_map_c["lowerarm_l"]] + all_weights[:n_body, j_map_c["hand_l"]]
        w_ar_c = all_weights[:n_body, j_map_c["upperarm_r"]] + all_weights[:n_body, j_map_c["upperarm_pressure_r"]] + all_weights[:n_body, j_map_c["lowerarm_r"]] + all_weights[:n_body, j_map_c["hand_r"]]
        ftopo_c = build_five_finger_topology(rest_high, high_tri, w_al_c, w_ar_c, landmarks_bl)
        c_conn_c = weld_connectivity(rest_all, all_tri)
        c_nrm_c = vertex_normals(rest_all, all_tri, c_conn_c[0])
        _, _, hp_raw_c = build_head_feature_pin_mask(rest_all, c_nrm_c, all_tri, n_body, compiled)
        hf_masks_c = hp_raw_c.pop("_masks", {})
        masks = {
            "canonicalHardPin": c_npz["canonicalHardPin"].astype(bool),
            "canonicalFootPin": c_npz["canonicalFootPin"].astype(bool),
            "canonicalHardGain": np.where(c_npz["canonicalHardPin"].astype(bool), 0.0, 1.0),
            "canonicalObsGain": c_npz["canonicalObsGain"].astype(np.float64),
            "canonicalCleftInferred": c_npz["canonicalCleftInferred"].astype(np.float64),
            "canonicalArmWeight": c_npz["canonicalArmWeight"].astype(np.float64),
            "donorEligibleFaces": c_npz["donorEligibleFaces"].astype(bool),
            "donorLinenFaces": c_npz["donorLinenFaces"].astype(bool),
            "donorLinenExcludedFaces": c_npz["donorLinenExcludedFaces"].astype(bool),
            "donorLinenSkintightKeptFaces": c_npz["donorLinenSkintightKeptFaces"].astype(bool),
            "donorBridgedAxillaFaces": c_npz["donorBridgedAxillaFaces"].astype(bool),
            "donorBridgedThighFaces": c_npz["donorBridgedThighFaces"].astype(bool),
            "headPinSummary": hp_raw_c,
            "headFeatureMasks": hf_masks_c,
            "skullAlignInfo": json.loads(str(c_npz["skullAlignInfoJson"])),
            "fingerTopoLod0": ftopo_c,
        }
        if args.full_audit:
            masks = build_topological_parts_and_masks(
                rest_all, posed_all_0, all_tri, n_body, orig_head_n, joint_names, all_weights,
                donor_reg, donor_tri, donor_rgb, pose_info, compiled, landmarks_bl
            )
        raw_cache_hit = True
    else:
        donor_reg, reg_info = rigid_register_donor(raw_xyz, rest_all, stature_m)
        pose_info = detect_axilla_and_limb_poses(donor_reg, donor_tri, rest_all, all_tri, compiled, z_shift)
        posed_all_0, jac_all = evaluate_exact_dqs_operator(rest_all, all_tri, joint_names, all_weights, pose_info)
        masks = build_topological_parts_and_masks(
            rest_all,
            posed_all_0,
            all_tri,
            n_body,
            orig_head_n,
            joint_names,
            all_weights,
            donor_reg,
            donor_tri,
            donor_rgb,
            pose_info,
            compiled,
            landmarks_bl,
        )
        rest_all_fit_raw, _, solve_info = direct_rest_space_nonrigid_fit(
            rest_all,
            posed_all_0,
            jac_all,
            all_tri,
            donor_reg,
            donor_tri,
            masks,
            pose_info,
            high_tri=high_tri,
            rest_low=rest_low,
            low_tri=low_tri,
            map_faces=map_faces,
            map_weights=map_weights,
        )
        np.savez_compressed(
            raw_cache_file,
            donorReg=donor_reg.astype(np.float32),
            posedAll0=posed_all_0.astype(np.float32),
            jacAll=jac_all.astype(np.float32),
            restAllFitRaw=rest_all_fit_raw.astype(np.float32),
            canonicalHardPin=masks["canonicalHardPin"],
            canonicalFootPin=masks["canonicalFootPin"],
            canonicalObsGain=masks["canonicalObsGain"].astype(np.float32),
            canonicalCleftInferred=masks["canonicalCleftInferred"].astype(np.float32),
            canonicalArmWeight=masks["canonicalArmWeight"].astype(np.float32),
            donorEligibleFaces=masks["donorEligibleFaces"],
            donorLinenFaces=masks["donorLinenFaces"],
            donorLinenExcludedFaces=masks["donorLinenExcludedFaces"],
            donorLinenSkintightKeptFaces=masks["donorLinenSkintightKeptFaces"],
            donorBridgedAxillaFaces=masks["donorBridgedAxillaFaces"],
            donorBridgedThighFaces=masks["donorBridgedThighFaces"],
            headPinSummaryJson=np.array(json.dumps(masks["headPinSummary"])),
            skullAlignInfoJson=np.array(json.dumps(masks["skullAlignInfo"])),
            regInfoJson=np.array(json.dumps(reg_info)),
            poseInfoJson=np.array(json.dumps(pose_info)),
            solveInfoJson=np.array(json.dumps(solve_info)),
        )

    t_polish_start = perf_counter()
    from linen_briefs import extract_clean_donor_linen_masks
    from post_fit_polish import infer_adipose_fullness_gate, infer_muscle_mass_gate
    adipose_gate = infer_adipose_fullness_gate(args.coordinate_id, rest_high, rest_all_fit_raw[:n_body])
    muscle_gate = infer_muscle_mass_gate(args.coordinate_id, rest_high, rest_all_fit_raw[:n_body])
    if "donorLinenFaces" in masks and masks["donorLinenFaces"] is not None:
        clean_lf, clean_rim_lf, _ = extract_clean_donor_linen_masks(
            donor_reg, donor_tri, masks["donorLinenFaces"], masks.get("donorBridgedThighFaces")
        )
        masks["donorLinenFaces"] = clean_lf
        masks["donorLinenRimFaces"] = clean_rim_lf
    body_hard_pin = masks["canonicalHardPin"][:n_body]
    body_sole_toe_pin = masks["canonicalFootPin"][:n_body]
    head_hard_pin = masks["canonicalHardPin"][n_body : n_body + orig_head_n]
    rest_high_fit, rest_low_fit, rest_head_fit, quality = guard_and_reduce_body_and_head(
        rest_high,
        rest_all_fit_raw[:n_body],
        high_tri,
        rest_low,
        low_tri,
        canon_head_xyz,
        rest_all_fit_raw[n_body : n_body + orig_head_n],
        head_tri,
        seam_body,
        seam_head,
        map_faces,
        map_weights,
        interface,
        body_hard_pin,
        head_hard_pin,
        masks["canonicalObsGain"][:n_body],
        masks["canonicalCleftInferred"][:n_body],
        body_arm_weight=masks["canonicalArmWeight"][:n_body],
        pose_info=pose_info,
        donor_xyz=donor_reg,
        donor_tri=donor_tri,
        posed_base_high=posed_all_0[:n_body],
        jac_high=jac_all[:n_body],
        posed_base_head=posed_all_0[n_body : n_body + orig_head_n],
        jac_head=jac_all[n_body : n_body + orig_head_n],
        finger_topo_lod0=masks["fingerTopoLod0"],
        body_sole_toe_pin=body_sole_toe_pin,
        guarded_cache_path=raw_cache_dir / f"{args.coordinate_id}-guarded-{cache_key}.npz",
        head_feature_masks=masks.get("headFeatureMasks"),
        adipose_gate=adipose_gate,
        muscle_gate=muscle_gate,
        donor_eligible_faces=masks.get("donorEligibleFaces"),
        donor_bridged_axilla_faces=masks.get("donorBridgedAxillaFaces"),
        donor_bridged_thigh_faces=masks.get("donorBridgedThighFaces"),
        donor_linen_faces=masks.get("donorLinenFaces"),
        donor_linen_rim_faces=masks.get("donorLinenRimFaces"),
        sex=args.sex,
    )

    sub_head_fit = np.vstack([rest_head_fit, np.zeros((len(sub_head["midpoints"]), 3), dtype=np.float64)])
    d_h_coinc = np.linalg.norm(rest_high[:, None, :] - canon_head_xyz[seam_head][None, :, :], axis=2)
    coinc_bv, coinc_hs = np.where(d_h_coinc < 5e-4)
    if len(coinc_bv):
        sub_head_fit[seam_head[coinc_hs]] = rest_high_fit[coinc_bv]
    for m_idx, v0_idx, _, _ in sub_head["midpoints"]:
        sub_head_fit[m_idx] = rest_high_fit[v0_idx]
    rest_all_final = np.vstack([rest_high_fit, sub_head_fit])
    u_final = rest_all_final - rest_all
    posed_all_final = posed_all_0 + np.einsum("vij,vj->vi", jac_all, u_final)
    if len(coinc_bv):
        posed_all_final[n_body + seam_head[coinc_hs]] = posed_all_final[coinc_bv]
    for m_idx, v0_idx, _, _ in sub_head["midpoints"]:
        posed_all_final[n_body + m_idx] = posed_all_final[v0_idx]

    # Pose Runtime LOD1 (`8,568v`) + `headSkin` (`6,185v`) to Donor with 0.000mm watertight collar seam:
    red_tri_l0 = high_tri[map_faces]
    posed_low_0 = np.einsum("ni,nij->nj", map_weights, posed_all_0[:n_body][red_tri_l0])
    jac_low = np.einsum("ni,nijk->njk", map_weights, jac_all[:n_body][red_tri_l0])
    posed_low_fit = posed_low_0 + np.einsum("vij,vj->vi", jac_low, rest_low_fit - rest_low)
    for a_i, b_i in interface.get("lod1Aliases", []):
        m_ab = 0.5 * (posed_low_fit[int(a_i)] + posed_low_fit[int(b_i)])
        posed_low_fit[int(a_i)] = m_ab
        posed_low_fit[int(b_i)] = m_ab
    posed_head_final = posed_all_final[n_body : n_body + orig_head_n]
    posed_low_fit[seam_body] = posed_head_final[seam_head]

    lod1_base_pts = np.vstack([rest_low_fit, rest_head_fit])
    lod1_base_tri = np.vstack([low_tri, head_tri + len(rest_low_fit)])
    posed_lod1_base_pts = np.vstack([posed_low_fit, posed_head_final])

    metrics = (
        measure_unfiltered_and_section_fidelity(
            posed_all_0,
            posed_all_final,
            rest_all_final,
            all_tri,
            donor_reg,
            donor_tri,
            masks,
            pose_info,
            stature_m,
            posed_lod1_all=posed_lod1_base_pts,
            rest_lod1_all=lod1_base_pts,
            lod1_all_tri=lod1_base_tri,
        )
        if args.full_audit
        else {"mode": "fast-inner-loop"}
    )

    np.savez_compressed(
        args.output / "lod0.npz",
        reference=rest_high.astype(np.float32),
        full=rest_high_fit.astype(np.float32),
        posedBase=posed_all_0[:n_body].astype(np.float32),
        posedFit=posed_all_final[:n_body].astype(np.float32),
        triangles=high_tri.astype(np.int32),
    )
    np.savez_compressed(
        args.output / "lod1.npz",
        reference=rest_low.astype(np.float32),
        full=rest_low_fit.astype(np.float32),
        triangles=low_tri.astype(np.int32),
    )
    np.savez_compressed(
        args.output / "headSkin.npz",
        reference=canon_head_xyz.astype(np.float32),
        full=rest_head_fit.astype(np.float32),
        posedBase=posed_all_0[n_body : n_body + orig_head_n].astype(np.float32),
        posedFit=posed_all_final[n_body : n_body + orig_head_n].astype(np.float32),
        triangles=head_tri.astype(np.int32),
    )
    write_support_npz(
        args.output / "support-bodySkin.npz",
        rest_low_fit,
        "bodySkin",
        compiled,
        pose_id="peacock-canonical-a-pose-v3",
        retired_controls=["definition"],
    )
    write_support_npz(
        args.output / "support-headSkin.npz",
        rest_head_fit,
        "headSkin",
        compiled,
        pose_id="peacock-canonical-a-pose-v3",
        retired_controls=["definition"],
    )
    attached_submeshes, submesh_quality = fit_attached_head_submeshes(
        canon_head_xyz, rest_head_fit, compiled, masks.get("headFeatureMasks")
    )
    for sub_id, sub_pts_bl in attached_submeshes.items():
        write_support_npz(
            args.output / f"support-{sub_id}.npz",
            sub_pts_bl,
            sub_id,
            compiled,
            pose_id="peacock-canonical-a-pose-v3",
            retired_controls=["definition"],
        )

    if args.pelvis_preview_only:
        ra_left_bl = np.zeros_like(rest_low_fit, dtype=np.float64)
        ra_right_bl = np.zeros_like(rest_low_fit, dtype=np.float64)
        ra_hd_left_bl = np.zeros_like(rest_head_fit, dtype=np.float64)
        ra_hd_right_bl = np.zeros_like(rest_head_fit, dtype=np.float64)
        ra_quality = {"mode": "skipped-in-pelvis-preview-only"}
    elif adipose_gate <= 0.02:
        from raised_arm_corrective import _solve_lean_muscular_raised_arm_corrective

        ra_left_bl, ra_right_bl, ra_quality = _solve_lean_muscular_raised_arm_corrective(
            lean_ref_bl,
            rest_low_fit,
            low_tri,
            compiled,
            seam_body,
            lean_head_bl=canon_head_xyz,
            head_rest_bl=rest_head_fit,
            head_tri=head_tri,
            seam_head=seam_head,
            muscle_gate=muscle_gate,
        )
    else:
        ra_left_bl, ra_right_bl, ra_quality = solve_raised_arm_gravity_corrective(
            lean_ref_bl,
            rest_low_fit,
            low_tri,
            compiled,
            seam_body,
            adipose_gate=adipose_gate,
            lean_head_bl=canon_head_xyz,
            head_rest_bl=rest_head_fit,
            head_tri=head_tri,
            seam_head=seam_head,
            muscle_gate=muscle_gate,
        )
    if not args.pelvis_preview_only:
        ra_hd_left_bl = ra_quality.pop("_headLeftBl", np.zeros_like(rest_head_fit, dtype=np.float64))
        ra_hd_right_bl = ra_quality.pop("_headRightBl", np.zeros_like(rest_head_fit, dtype=np.float64))
    quality["adiposeFullnessGate"] = round(adipose_gate, 4)
    quality["muscleMassGate"] = round(muscle_gate, 4)
    quality["raisedArmCorrective"] = ra_quality
    quality["headPinSummary"] = masks["headPinSummary"]
    quality["skullAlignInfo"] = masks["skullAlignInfo"]
    quality["attachedHeadSubmeshes"] = submesh_quality
    np.savez_compressed(
        args.output / "support-raisedArmCorrective.npz",
        leftDeltaPositions=blender_to_gltf(ra_left_bl).astype(np.float32).reshape(-1),
        rightDeltaPositions=blender_to_gltf(ra_right_bl).astype(np.float32).reshape(-1),
        headLeftDeltaPositions=blender_to_gltf(ra_hd_left_bl).astype(np.float32).reshape(-1),
        headRightDeltaPositions=blender_to_gltf(ra_hd_right_bl).astype(np.float32).reshape(-1),
        clipName=np.array("Raised arms"),
        qualityJson=np.array(json.dumps(ra_quality, sort_keys=True)),
    )

    # Append solid facial submeshes (`eyeLeft, eyeRight, teeth, oral`) AND fitted `studioShorts` (with hidden-body masks OFF!)
    solid_sub_ids = ("eyeLeft", "eyeRight", "teeth", "oral")
    sub_rest_pts = [attached_submeshes[sid] for sid in solid_sub_ids]
    sub_tris_raw = [
        np.asarray(compiled["meshes"][sid]["triangles"], dtype=np.int64).reshape(-1, 3) for sid in solid_sub_ids
    ]

    def _append_submeshes(
        base_pts: np.ndarray,
        base_tri: np.ndarray,
        extra_pts_list: list[np.ndarray],
        extra_tris_list: list[np.ndarray] | None = None,
    ) -> tuple[np.ndarray, np.ndarray]:
        pts_acc = [base_pts]
        tri_acc = [base_tri]
        v_off = len(base_pts)
        t_list = extra_tris_list if extra_tris_list is not None else sub_tris_raw
        for ep, et in zip(extra_pts_list, t_list):
            pts_acc.append(ep)
            tri_acc.append(et + v_off)
            v_off += len(ep)
        return np.vstack(pts_acc), np.vstack(tri_acc)

    from linen_briefs import (
        _symmetrize_brief_pts,
        clear_briefs_against_dense_body,
        eval_linen_briefs_bl,
        inject_linen_briefs_into_family,
        linen_briefs_mirror_map,
        measure_linen_briefs_clearance,
    )

    compiled_with_briefs = inject_linen_briefs_into_family(compiled, cache_dir=raw_cache_dir)
    exported_glb_info = None
    if args.export_glb is not None:
        from export_covered_glb import export_fitted_covered_character_glb
        from verify_donor_vs_glb_and_heatmap import _extract_glb_briefs_bl

        exported_glb_info = export_fitted_covered_character_glb(
            args.export_glb.resolve(),
            compiled,
            rest_low_fit,
            rest_head_fit,
            attached_submeshes,
            z_shift=z_shift,
            rest_high_fit_bl=rest_high_fit,
            high_tri=high_tri,
            adipose_gate=float(quality.get("adiposeFullnessGate", 1.0)),
            muscle_gate=float(muscle_gate),
            donor_xyz=donor_reg,
            donor_tri=donor_tri,
            donor_bridged_axilla_faces=masks.get("donorBridgedAxillaFaces"),
            donor_bridged_thigh_faces=masks.get("donorBridgedThighFaces"),
            donor_linen_faces=masks.get("donorLinenFaces"),
            donor_linen_rim_faces=masks.get("donorLinenRimFaces"),
            posed_low_fit_bl=posed_low_fit,
            rest_low_ref_bl=rest_low,
            jac_low=jac_low,
        )
        quality["exportedCoveredGlb"] = exported_glb_info
        sh_rest_pts, sh_tri = _extract_glb_briefs_bl(args.export_glb.resolve())
        sh_rest_pts[:, 2] += float(rest_low_fit[:, 2].min())
        sh_outer_mask = np.ones(len(sh_tri), dtype=bool)
        fc_r1 = rest_low_fit[low_tri].mean(axis=1)
        pel_r1 = (np.abs(fc_r1[:, 0]) <= 0.34) & (fc_r1[:, 2] >= 0.76) & (fc_r1[:, 2] <= 1.32)
        pos_r1 = np.flatnonzero(pel_r1 & (fc_r1[:, 0] >= -1e-4))
        neg_r1 = np.flatnonzero(pel_r1 & (fc_r1[:, 0] <= +1e-4))
        all_r1 = np.flatnonzero(pel_r1)
        bvh_pos_r1 = BVHTree.FromPolygons(rest_low_fit.tolist(), low_tri[pos_r1].tolist(), all_triangles=True)
        bvh_neg_r1 = BVHTree.FromPolygons(rest_low_fit.tolist(), low_tri[neg_r1].tolist(), all_triangles=True)
        bvh_all_r1 = BVHTree.FromPolygons(rest_low_fit.tolist(), low_tri[all_r1].tolist(), all_triangles=True)
        mid_sp, mir_sp = linen_briefs_mirror_map(len(sh_rest_pts), sh_rest_pts)
        sgn_sp = np.where(mid_sp, 0.0, np.where(sh_rest_pts[:, 0] >= 0.0, 1.0, -1.0))
        sh_posed_raw = sh_rest_pts.copy()
        for bi_p in range(len(sh_rest_pts)):
            pb_p = sh_rest_pts[bi_p]
            if mid_sp[bi_p]:
                nh_p, _, ti_loc, _ = bvh_all_r1.find_nearest(Vector(pb_p.tolist()), 0.120)
                ti_p = int(all_r1[int(ti_loc)]) if ti_loc is not None else None
            elif pb_p[0] >= 0.0:
                nh_p, _, ti_loc, _ = bvh_pos_r1.find_nearest(Vector(pb_p.tolist()), 0.120)
                ti_p = int(pos_r1[int(ti_loc)]) if ti_loc is not None else None
            else:
                nh_p, _, ti_loc, _ = bvh_neg_r1.find_nearest(Vector(pb_p.tolist()), 0.120)
                ti_p = int(neg_r1[int(ti_loc)]) if ti_loc is not None else None
            if nh_p is not None and ti_p is not None:
                va_p, vb_p, vc_p = (int(v) for v in low_tri[int(ti_p)])
                a0_p, b0_p, c0_p = rest_low_fit[va_p], rest_low_fit[vb_p], rest_low_fit[vc_p]
                e1_p, e2_p, vp_p = b0_p - a0_p, c0_p - a0_p, np.asarray(nh_p, dtype=np.float64) - a0_p
                d00_p, d01_p, d11_p = float(e1_p @ e1_p), float(e1_p @ e2_p), float(e2_p @ e2_p)
                d20_p, d21_p = float(vp_p @ e1_p), float(vp_p @ e2_p)
                den_p = d00_p * d11_p - d01_p * d01_p
                if abs(den_p) > 1e-12:
                    wb_p = float(np.clip((d11_p * d20_p - d01_p * d21_p) / den_p, 0.0, 1.0))
                    wc_p = float(np.clip((d00_p * d21_p - d01_p * d20_p) / den_p, 0.0, 1.0))
                    if wb_p + wc_p > 1.0:
                        s_p = wb_p + wc_p
                        wb_p, wc_p = wb_p / s_p, wc_p / s_p
                    wa_p = 1.0 - wb_p - wc_p
                else:
                    wa_p = wb_p = wc_p = 1.0 / 3.0
                q_r_p = wa_p * a0_p + wb_p * b0_p + wc_p * c0_p
                q_p_p = wa_p * posed_low_fit[va_p] + wb_p * posed_low_fit[vb_p] + wc_p * posed_low_fit[vc_p]
                j_p = wa_p * jac_low[va_p] + wb_p * jac_low[vb_p] + wc_p * jac_low[vc_p]
                sh_posed_raw[bi_p] = q_p_p + j_p @ (pb_p - q_r_p)
        sh_posed_raw = _symmetrize_brief_pts(sh_posed_raw, mid_sp, mir_sp, sgn_sp, min_x=0.0025)
        sh_posed_pts = clear_briefs_against_dense_body(sh_posed_raw, sh_tri, posed_low_fit, low_tri)
    else:
        is_ext_full_br = (float(adipose_gate) > 0.80) and (abs(float(muscle_gate) - 0.50) > 0.10)
        sh_posed_pts, sh_tri, sh_outer_mask = eval_linen_briefs_bl(
            posed_low_fit,
            compiled_with_briefs,
            low_tri,
            dense_body_bl=posed_all_final[:n_body],
            dense_tri=high_tri,
            is_ext_full=is_ext_full_br,
        )
        sh_rest_pts, _, _ = eval_linen_briefs_bl(
            rest_low_fit,
            compiled_with_briefs,
            low_tri,
            dense_body_bl=rest_high_fit,
            dense_tri=high_tri,
            is_ext_full=is_ext_full_br,
        )
    # Clear the exact runtime `linenBriefs` garment (`sh_posed_pts` / `sh_rest_pts`) against dense `LOD0` (`high_tri`)
    # so `LOD0` and `LOD1` sign-off boards wear the identical runtime brief cut with 0.0mm poke-through!
    if args.pelvis_preview_only:
        sh_posed0_pts = sh_posed_pts
        sh_rest0_pts = sh_rest_pts
    else:
        sh_posed0_pts = clear_briefs_against_dense_body(sh_posed_pts, sh_tri, posed_all_final[:n_body], high_tri)
        sh_rest0_pts = clear_briefs_against_dense_body(sh_rest_pts, sh_tri, rest_high_fit, high_tri)
    sub_tris_with_shorts = [*sub_tris_raw, sh_tri]

    # Covered Donor-vs-Fit meshes (`linenBriefs` ON, `hiddenRegions` OFF) + explicit unmasked bare-pelvis diagnostics:
    render_posed0_pts, render_posed0_tri = _append_submeshes(
        posed_all_final, all_tri, [*sub_rest_pts, sh_posed0_pts], sub_tris_with_shorts
    )
    render_rest0_pts, render_rest0_tri = _append_submeshes(
        rest_all_final, all_tri, [*sub_rest_pts, sh_rest0_pts], sub_tris_with_shorts
    )
    posed_lod1_bare_pts, posed_lod1_bare_tri = _append_submeshes(posed_lod1_base_pts, lod1_base_tri, sub_rest_pts)
    rest_lod1_bare_pts, rest_lod1_bare_tri = _append_submeshes(lod1_base_pts, lod1_base_tri, sub_rest_pts)
    posed_lod1_cov_pts, posed_lod1_cov_tri = _append_submeshes(
        posed_lod1_base_pts, lod1_base_tri, [*sub_rest_pts, sh_posed_pts], sub_tris_with_shorts
    )
    lod1_with_head_pts, lod1_with_head_tri = _append_submeshes(
        lod1_base_pts, lod1_base_tri, [*sub_rest_pts, sh_rest_pts], sub_tris_with_shorts
    )

    if args.pelvis_preview_only:
        tpose_lbs_pts = lod1_with_head_pts
        tpose_cor_pts = lod1_with_head_pts
        r68_lbs_pts = lod1_with_head_pts
        r68_cor_pts = lod1_with_head_pts
        quality["linenBriefsClearance"] = {
            "restLod1": measure_linen_briefs_clearance(rest_low_fit, low_tri, sh_rest_pts, sh_tri, sh_outer_mask),
            "posedLod1": measure_linen_briefs_clearance(posed_low_fit, low_tri, sh_posed_pts, sh_tri, sh_outer_mask),
        }
    else:
        ra_delta = ra_left_bl + ra_right_bl
        ra_hd_delta = ra_hd_left_bl + ra_hd_right_bl

        tp_scale = 0.705
        t_lbs_b, _, _, _ = eval_arm_pose_lbs(rest_low_fit, "bodySkin", compiled, raise_scale=tp_scale)
        t_cor_b, _, _, _ = eval_arm_pose_lbs(rest_low_fit + tp_scale * ra_delta, "bodySkin", compiled, raise_scale=tp_scale)
        t_hd_lbs, _, _, _ = eval_arm_pose_lbs(rest_head_fit, "headSkin", compiled, raise_scale=tp_scale)
        t_hd_cor, _, _, _ = eval_arm_pose_lbs(rest_head_fit + tp_scale * ra_hd_delta, "headSkin", compiled, raise_scale=tp_scale)
        t_sub_pts = [eval_arm_pose_lbs(attached_submeshes[sid], sid, compiled, raise_scale=tp_scale)[0] for sid in solid_sub_ids]
        if args.export_glb is not None:
            # `T-Pose (0.705)` and `Game Raised (+68°)` rotate only upper-body bones; pelvis & thighs stay in canonical Rest pose,
            # so wear the exact exported `.glb` `linenBriefs` (`sh_rest_pts`) rather than re-evaluating un-polished cloth:
            sh_tp_lbs = sh_rest_pts
            sh_tp_cor = sh_rest_pts
        else:
            sh_tp_lbs, _, _ = eval_linen_briefs_bl(t_lbs_b, compiled_with_briefs, low_tri)
            sh_tp_cor, _, _ = eval_linen_briefs_bl(t_cor_b, compiled_with_briefs, low_tri)
        tpose_lbs_pts = np.vstack([t_lbs_b, t_hd_lbs, *t_sub_pts, sh_tp_lbs])
        tpose_cor_pts = np.vstack([t_cor_b, t_hd_cor, *t_sub_pts, sh_tp_cor])

        r68_lbs_base, _ = pose_raised_arms_preview(rest_low_fit, low_tri, rest_head_fit, head_tri, compiled, z_shift, None, None)
        r68_cor_base, _ = pose_raised_arms_preview(rest_low_fit, low_tri, rest_head_fit, head_tri, compiled, z_shift, ra_delta, ra_hd_delta)
        r68_sub_pts = [eval_arm_pose_lbs(attached_submeshes[sid], sid, compiled, raise_scale=1.0)[0] for sid in solid_sub_ids]
        n_l1_b = len(rest_low_fit)
        if args.export_glb is not None:
            sh_r68_lbs = sh_rest_pts
            sh_r68_cor = sh_rest_pts
        else:
            sh_r68_lbs, _, _ = eval_linen_briefs_bl(r68_lbs_base[:n_l1_b], compiled_with_briefs, low_tri)
            sh_r68_cor, _, _ = eval_linen_briefs_bl(r68_cor_base[:n_l1_b], compiled_with_briefs, low_tri)
        r68_lbs_pts = np.vstack([r68_lbs_base, *r68_sub_pts, sh_r68_lbs])
        r68_cor_pts = np.vstack([r68_cor_base, *r68_sub_pts, sh_r68_cor])

        quality["linenBriefsClearance"] = {
            "restLod1": measure_linen_briefs_clearance(rest_low_fit, low_tri, sh_rest_pts, sh_tri, sh_outer_mask),
            "posedLod1": measure_linen_briefs_clearance(posed_low_fit, low_tri, sh_posed_pts, sh_tri, sh_outer_mask),
            "tposeLod1": measure_linen_briefs_clearance(t_cor_b, low_tri, sh_tp_cor, sh_tri, sh_outer_mask),
            "raised68Lod1": measure_linen_briefs_clearance(r68_cor_base[:n_l1_b], low_tri, sh_r68_cor, sh_tri, sh_outer_mask),
        }

    ref_dir = Path(__file__).resolve().parent.parent / "references"
    ref_raised_jpg = ref_dir / f"{args.coordinate_id}-raised-arms-ref.jpg"
    if not ref_raised_jpg.is_file():
        ref_raised_jpg = ref_dir / f"{args.coordinate_id}-raised-arms-ref.png"
    rendered_boards = render_iteration_and_signoff_boards(
        args.output,
        args.coordinate_id,
        donor_reg,
        donor_tri,
        render_posed0_pts,
        render_posed0_tri,
        render_rest0_pts,
        render_rest0_tri,
        lod1_with_head_pts,
        lod1_with_head_tri,
        tpose_lbs_pts,
        tpose_cor_pts,
        r68_lbs_pts,
        r68_cor_pts,
        lod1_with_head_tri,
        pose_info=pose_info,
        ref_raised_jpg=ref_raised_jpg,
        full_audit=args.full_audit,
        posed_lod1_head_pts=posed_lod1_cov_pts,
        posed_lod1_head_tri=posed_lod1_cov_tri,
        posed_lod1_bare_pts=posed_lod1_bare_pts,
        posed_lod1_bare_tri=posed_lod1_bare_tri,
        rest_lod1_bare_pts=rest_lod1_bare_pts,
        rest_lod1_bare_tri=rest_lod1_bare_tri,
        pelvis_preview_only=args.pelvis_preview_only,
    )

    post_polish_sec = round(perf_counter() - t_polish_start, 2)
    total_sec = round(perf_counter() - t0, 2)
    receipt = {
        "coordinateId": args.coordinate_id,
        "donorGlb": {"path": str(args.donor_glb.resolve()), "sha256": glb_sha},
        "canonicalCompiledSha256": compiled_sha,
        "rawCgCache": {"hit": raw_cache_hit, "path": str(raw_cache_file), "key": cache_key},
        "rigidRegistration": reg_info,
        "poseAlignment": pose_info,
        "exclusions": {
            "donorTotalTriangles": int(len(donor_tri)),
            "donorEligibleTriangles": int(masks["donorEligibleFaces"].sum()),
            "donorLinenTriangles": int(masks["donorLinenFaces"].sum()),
            "donorLinenExcludedCleftTriangles": int(masks["donorLinenExcludedFaces"].sum()),
            "donorLinenSkintightKeptTriangles": int(masks["donorLinenSkintightKeptFaces"].sum()),
            "donorBridgedAxillaTriangles": int(masks["donorBridgedAxillaFaces"].sum()),
            "donorBridgedThighTriangles": int(masks["donorBridgedThighFaces"].sum()),
            "canonicalLockedVertices": int((masks["canonicalHardGain"] == 0).sum()),
            "canonicalInferredCleftVertices": int(
                ((masks["canonicalHardGain"] > 0) & (masks["canonicalObsGain"] < 0.05)).sum()
            ),
        },
        "solver": solve_info,
        "quality": quality,
        "metrics": metrics,
        "renderedBoards": rendered_boards,
        "postPolishAndRenderSeconds": post_polish_sec,
        "elapsedSeconds": total_sec,
    }
    (args.output / "receipt.json").write_text(json.dumps(receipt, indent=2, allow_nan=False) + "\n")
    print(
        json.dumps(
            {
                "coordinateId": args.coordinate_id,
                "rawCgCacheHit": raw_cache_hit,
                "postPolishAndRenderSeconds": post_polish_sec,
                "elapsedSeconds": total_sec,
                "quality": quality,
                "renderedBoards": rendered_boards,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
