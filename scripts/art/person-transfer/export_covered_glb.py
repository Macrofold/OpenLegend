#!/usr/bin/env python3
"""Export a fitted wrapped-family member as a complete, rigged, PBR-textured, animated runtime `.glb`.

Uses `scripts/art/people.py` (`fit_parts`, `fit_motion`, `bake_materials`, `build_scene`,
`check_export_motion`) and `scripts/art/art-tool.py` (`export_glb`, `measure(..., 'character', None)`)
with:
1) True MikkTSpace `LOD0 -> LOD1` tangent-space normal-map baking (`preserving high-pass skin pores,
   knuckle creases & navel micro-detail while pulling fine sub-triangle muscular striations on lean
   builds directly from local posed donor surfaces via J^T pullback without +-X mirror-averaging,
   faded smoothly by 3D distance from the welded collar ring and across posed axillary self-contact`),
2) Global head-to-body skin tone matching + per-angle macro-UV collar-seam tangent-normal & albedo welding,
3) Natural un-crushed eye iris & clean sclera shading,
4) Tailored woven unbleached linen albedo + double-stitched waistband & leg-hem normal map on `undyedLinen`.
"""
from __future__ import annotations

import copy
import importlib.util
import os
from pathlib import Path
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
import numpy as np

from linen_briefs import (
    _eval_brief_level_set_bl,
    clear_briefs_against_dense_body,
    eval_linen_briefs_bl,
    extract_clean_donor_linen_masks,
    fit_linen_briefs_to_donor_posed,
    inject_linen_briefs_into_family,
    unpose_donor_briefs_to_rest,
)
from mesh_rig_utils import blender_to_gltf, gltf_to_blender, self_intersections, smootherstep, vertex_normals, weld_connectivity

REPO_ART_SCRIPTS = Path(
    "/Users/mike/Documents/Projects/OpenLegend/.worktrees/metahuman-foundation-poc/scripts/art"
)
if str(REPO_ART_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(REPO_ART_SCRIPTS))

import people as ol_people  # noqa: E402

_ART_SPEC = importlib.util.spec_from_file_location("ol_art_tool", REPO_ART_SCRIPTS / "art-tool.py")
assert _ART_SPEC is not None and _ART_SPEC.loader is not None
ol_art_tool = importlib.util.module_from_spec(_ART_SPEC)
_ART_SPEC.loader.exec_module(ol_art_tool)

WITNESS_PACKAGE_JSON = Path(
    "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-11-peacock-full-transfer/study/runtime/export-witness/package/family.json"
)


def _canonical_body_nipple_uv_centers(fam: dict | None) -> tuple[list[tuple[float, float]], set[int]]:
    """Return shared canonical pectoral nipple UV centers `[(u_pos, v_pos), (u_neg, v_neg)]` and sourceVertexIndices."""
    if fam is None or "meshes" not in fam or "bodySkin" not in fam["meshes"]:
        return [], set()
    bs_m = fam["meshes"]["bodySkin"]
    bs_ref = gltf_to_blender(np.asarray(bs_m["positions"], dtype=np.float64).reshape(-1, 3))
    bs_s = np.asarray(bs_m["sourceVertexIndices"], dtype=np.int64)
    buv_m = np.asarray(bs_m["uvs"], dtype=np.float64).reshape(-1, 2)
    btri_m = bs_s[np.asarray(bs_m["renderTriangles"], dtype=np.int64).reshape(-1, 3)]
    l_conn = weld_connectivity(bs_ref, btri_m, decimals=5)
    l_weld, _, _, l_deg = l_conn
    cand_p = np.flatnonzero(
        (bs_ref[:, 0] >= 0.095)
        & (bs_ref[:, 0] <= 0.132)
        & (bs_ref[:, 2] >= 1.445)
        & (bs_ref[:, 2] <= 1.482)
        & (bs_ref[:, 1] < -0.082)
    )
    if not len(cand_p):
        return [], set()
    ref_seed = np.array([0.1088, -0.0988, 1.4624], dtype=np.float64)
    val7 = [int(v) for v in cand_p if int(l_deg[int(l_weld[int(v)])]) == 7]
    pool_p = np.asarray(val7 if val7 else cand_p, dtype=np.int64)
    sv_pos = int(pool_p[int(np.argmin(np.linalg.norm(bs_ref[pool_p] - ref_seed[None, :], axis=1)))])
    mir_pt = np.array([-bs_ref[sv_pos, 0], bs_ref[sv_pos, 1], bs_ref[sv_pos, 2]], dtype=np.float64)
    sv_neg = int(np.argmin(np.linalg.norm(bs_ref - mir_pt[None, :], axis=1)))
    uv_out: list[tuple[float, float]] = []
    for sv_c in (sv_pos, sv_neg):
        rows_c = np.flatnonzero(bs_s == sv_c)
        if len(rows_c):
            uv_c = buv_m[rows_c].mean(axis=0)
            uv_out.append((float(uv_c[0]), float(uv_c[1])))
    return uv_out, {sv_pos, sv_neg}


def _box_blur_rgb(arr: np.ndarray, radius: int, passes: int = 2) -> np.ndarray:
    """Fast separable box blur on `(H, W, 3)` float32 image."""
    out = arr.astype(np.float32, copy=True)
    if radius <= 0:
        return out
    k = 2 * radius + 1
    for _ in range(passes):
        pad_x = np.pad(out, ((0, 0), (radius, radius), (0, 0)), mode="edge")
        cs_x = np.cumsum(np.pad(pad_x, ((0, 0), (1, 0), (0, 0)), mode="constant"), axis=1)
        out = (cs_x[:, k:, :] - cs_x[:, :-k, :]) / float(k)
        pad_y = np.pad(out, ((radius, radius), (0, 0), (0, 0)), mode="edge")
        cs_y = np.cumsum(np.pad(pad_y, ((1, 0), (0, 0), (0, 0)), mode="constant"), axis=0)
        out = (cs_y[k:, :, :] - cs_y[:-k, :, :]) / float(k)
    return out


def _bake_mikkt_lod0_to_lod1_body_normals(
    body_obj: bpy.types.Object,
    high_fit_bl: np.ndarray,
    high_tri: np.ndarray,
    w_half: int,
    h_full: int,
    fam: dict | None = None,
    donor_xyz: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
    donor_bridged_axilla_faces: np.ndarray | None = None,
    donor_bridged_thigh_faces: np.ndarray | None = None,
    donor_linen_faces: np.ndarray | None = None,
    posed_low_fit_bl: np.ndarray | None = None,
    rest_low_ref_bl: np.ndarray | None = None,
    jac_low: np.ndarray | None = None,
    adipose_gate: float = 1.0,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Bake full-resolution (`1024x1024` body tile) MikkTSpace tangent-space normals onto `body_obj`:
    - On lean/muscular builds (`adipose_gate < 0.5`) when `donor_xyz` + `posed_low_fit_bl` + `jac_low` are supplied,
      queries the `420k`-triangle Meshy Donor directly in Posed space (`mirror-symmetrized across ±X to cancel
      superficial AI micro-noise while preserving 100% of serratus slips, 3-head deltoids, brachialis, forearm
      extensors, trapezius/scapular/teres/erector cuts, 6-pack, quads & diamond calves`), pulls Donor normals back
      to Rest space via `J^T`, and transitions seamlessly to `LOD0` across brief/armpit-web/hand/foot/collar exclusions.
    - Returns `(baked_rgb_01, covered_mask, sulcus_ao_01)`.
    """
    from linen_briefs import _eval_brief_level_set_bl

    mesh = body_obj.data
    mesh.calc_tangents(uvmap="UVMap")
    uv_layer = mesh.uv_layers["UVMap"].data

    # Full native resolution (`1024x1024` for a `2048x1024` atlas) for crisp sub-triangle musculature:
    w_b = w_half
    h_b = h_full

    bs_src = (
        np.asarray(fam["meshes"]["bodySkin"]["sourceVertexIndices"], dtype=np.int64)
        if fam is not None and "bodySkin" in fam.get("meshes", {})
        else None
    )
    use_donor = (
        bs_src is not None
        and donor_xyz is not None
        and donor_tri is not None
        and posed_low_fit_bl is not None
        and rest_low_ref_bl is not None
        and jac_low is not None
    )

    n_lt = len(mesh.loop_triangles)
    tri_uv = np.zeros((n_lt, 3, 2), dtype=np.float64)
    tri_pos = np.zeros((n_lt, 3, 3), dtype=np.float64)
    tri_tan = np.zeros((n_lt, 3, 3), dtype=np.float64)
    tri_bit = np.zeros((n_lt, 3, 3), dtype=np.float64)
    tri_nrm = np.zeros((n_lt, 3, 3), dtype=np.float64)
    tri_sv = np.zeros((n_lt, 3), dtype=np.int64)

    verts = mesh.vertices
    loops = mesh.loops
    for ti, lt in enumerate(mesh.loop_triangles):
        for k, li in enumerate(lt.loops):
            lp = loops[li]
            rv = int(lp.vertex_index)
            uv = uv_layer[li].uv
            tri_uv[ti, k, 0] = (float(uv[0]) - 0.5) * 2.0 * w_b
            tri_uv[ti, k, 1] = float(uv[1]) * h_b
            tri_pos[ti, k] = verts[rv].co[:]
            tri_tan[ti, k] = lp.tangent[:]
            tri_bit[ti, k] = lp.bitangent[:]
            tri_nrm[ti, k] = lp.normal[:]
            if bs_src is not None and rv < len(bs_src):
                tri_sv[ti, k] = int(bs_src[rv])

    p_buf = np.zeros((h_b, w_b, 3), dtype=np.float64)
    t_buf = np.zeros((h_b, w_b, 3), dtype=np.float64)
    b_buf = np.zeros((h_b, w_b, 3), dtype=np.float64)
    n_buf = np.zeros((h_b, w_b, 3), dtype=np.float64)
    cov_b = np.zeros((h_b, w_b), dtype=bool)
    p_posed_buf = np.zeros((h_b, w_b, 3), dtype=np.float64) if use_donor else None
    p_ref_buf = np.zeros((h_b, w_b, 3), dtype=np.float64) if use_donor else None
    jac_buf = np.zeros((h_b, w_b, 3, 3), dtype=np.float64) if use_donor else None

    for ti in range(n_lt):
        uv0, uv1, uv2 = tri_uv[ti]
        x0 = max(0, int(np.floor(min(uv0[0], uv1[0], uv2[0]))))
        x1 = min(w_b - 1, int(np.ceil(max(uv0[0], uv1[0], uv2[0]))))
        y0 = max(0, int(np.floor(min(uv0[1], uv1[1], uv2[1]))))
        y1 = min(h_b - 1, int(np.ceil(max(uv0[1], uv1[1], uv2[1]))))
        if x1 < x0 or y1 < y0:
            continue
        denom = (uv1[1] - uv2[1]) * (uv0[0] - uv2[0]) + (uv2[0] - uv1[0]) * (uv0[1] - uv2[1])
        if abs(denom) < 1e-10:
            continue
        inv_d = 1.0 / denom
        gx, gy = np.meshgrid(
            np.arange(x0, x1 + 1, dtype=np.float64) + 0.5,
            np.arange(y0, y1 + 1, dtype=np.float64) + 0.5,
        )
        w0 = ((uv1[1] - uv2[1]) * (gx - uv2[0]) + (uv2[0] - uv1[0]) * (gy - uv2[1])) * inv_d
        w1 = ((uv2[1] - uv0[1]) * (gx - uv2[0]) + (uv0[0] - uv2[0]) * (gy - uv2[1])) * inv_d
        w2 = 1.0 - w0 - w1
        inside = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not np.any(inside):
            continue
        iy, ix = np.nonzero(inside)
        py = y0 + iy
        px = x0 + ix
        cw0, cw1, cw2 = w0[iy, ix, None], w1[iy, ix, None], w2[iy, ix, None]
        p_buf[py, px] = cw0 * tri_pos[ti, 0] + cw1 * tri_pos[ti, 1] + cw2 * tri_pos[ti, 2]
        t_buf[py, px] = cw0 * tri_tan[ti, 0] + cw1 * tri_tan[ti, 1] + cw2 * tri_tan[ti, 2]
        b_buf[py, px] = cw0 * tri_bit[ti, 0] + cw1 * tri_bit[ti, 1] + cw2 * tri_bit[ti, 2]
        n_buf[py, px] = cw0 * tri_nrm[ti, 0] + cw1 * tri_nrm[ti, 1] + cw2 * tri_nrm[ti, 2]
        if use_donor:
            sv0, sv1, sv2 = int(tri_sv[ti, 0]), int(tri_sv[ti, 1]), int(tri_sv[ti, 2])
            p_posed_buf[py, px] = cw0 * posed_low_fit_bl[sv0] + cw1 * posed_low_fit_bl[sv1] + cw2 * posed_low_fit_bl[sv2]
            p_ref_buf[py, px] = cw0 * rest_low_ref_bl[sv0] + cw1 * rest_low_ref_bl[sv1] + cw2 * rest_low_ref_bl[sv2]
            jac_buf[py, px] = (
                cw0[:, None] * jac_low[sv0] + cw1[:, None] * jac_low[sv1] + cw2[:, None] * jac_low[sv2]
            )
        cov_b[py, px] = True

    h_conn = weld_connectivity(high_fit_bl, high_tri, decimals=5)
    high_vn = vertex_normals(high_fit_bl, high_tri, h_conn[0])
    hbvh = BVHTree.FromPolygons(high_fit_bl.tolist(), high_tri.tolist(), all_triangles=True)

    # Prepare clean 420k-triangle Meshy Donor BVH + 3-ring micro-vein-filtered Donor vertex normals & local sulcus AO:
    dbvh = None
    don_sub_pts = None
    don_sub_tri = None
    don_vn = None
    don_concav = None
    w_donor_map = None
    nip_uv_list, _ = _canonical_body_nipple_uv_centers(fam)
    w_nip_uv_map = np.zeros((h_b, w_b), dtype=np.float64)
    if nip_uv_list:
        gx_n, gy_n = np.meshgrid(np.arange(w_b, dtype=np.float64) + 0.5, np.arange(h_b, dtype=np.float64) + 0.5)
        for u_np, v_np in nip_uv_list:
            cx_np = (u_np - 0.5) * 2.0 * w_b
            cy_np = v_np * h_b
            r_np_px = np.hypot(gx_n - cx_np, gy_n - cy_np)
            w_nip_uv_map = np.maximum(w_nip_uv_map, 1.0 - smootherstep((r_np_px - 10.0) / 8.0))

    if use_donor:
        web_holes = np.zeros(len(donor_tri), dtype=bool)
        if donor_bridged_axilla_faces is not None:
            web_holes |= donor_bridged_axilla_faces
        if donor_bridged_thigh_faces is not None:
            web_holes |= donor_bridged_thigh_faces
        web_holes_dil = web_holes.copy()
        if np.any(web_holes_dil):
            for _ in range(6):
                bv = np.unique(donor_tri[web_holes_dil].ravel())
                web_holes_dil |= np.any(np.isin(donor_tri, bv), axis=1)
        # Keep clean cloth boundary WITHOUT upward dilation onto overhanging bare belly skin:
        clean_lf_ex = np.zeros(len(donor_tri), dtype=bool)
        if donor_linen_faces is not None and len(donor_linen_faces) == len(donor_tri):
            clean_lf_ex, _, _ = extract_clean_donor_linen_masks(
                donor_xyz,
                donor_tri,
                np.asarray(donor_linen_faces, dtype=bool),
                donor_bridged_thigh_faces,
            )
        excl_d = web_holes_dil | clean_lf_ex
        dcz = donor_xyz[donor_tri].mean(axis=1)[:, 2]
        keep_df = (~excl_d) & (dcz >= 0.055) & (dcz <= 1.795)
        if np.sum(keep_df) >= 500:
            uv_d, inv_d = np.unique(donor_tri[keep_df].ravel(), return_inverse=True)
            don_sub_pts = donor_xyz[uv_d].astype(np.float64)
            don_sub_tri = inv_d.reshape(-1, 3).astype(np.int64)
            d_conn = weld_connectivity(don_sub_pts, don_sub_tri, decimals=5)
            d_weld, (d_es, d_ed), d_mult, d_deg = d_conn
            n_du = len(d_mult)
            d_deg_f = np.maximum(d_deg.astype(np.float64), 1.0)
            vn_raw_d = vertex_normals(don_sub_pts, don_sub_tri, d_weld)
            vn_u = np.column_stack([np.bincount(d_weld, weights=vn_raw_d[:, c], minlength=n_du) / d_mult for c in range(3)])
            # Single light 1-ring (`0.26`) normal filter preserves 100% of crisp serratus slips, forearm extensors, nipples & deltoid striations:
            vn_u = 0.74 * vn_u + 0.26 * np.column_stack(
                [np.bincount(d_es, weights=vn_u[d_ed, c], minlength=n_du) / d_deg_f for c in range(3)]
            )
            vn_u /= np.maximum(np.linalg.norm(vn_u, axis=1, keepdims=True), 1e-12)
            don_vn = vn_u[d_weld]

            # Intrinsic Donor sulcus concavity (`~9mm` scale) for crisp physiological self-shadowing:
            du_pts = np.column_stack([np.bincount(d_weld, weights=don_sub_pts[:, c], minlength=n_du) / d_mult for c in range(3)])
            du_sm = du_pts.copy()
            for _ in range(10):
                du_sm = 0.45 * du_sm + 0.55 * np.column_stack(
                    [np.bincount(d_es, weights=du_sm[d_ed, c], minlength=n_du) / d_deg_f for c in range(3)]
                )
            concav_u = np.clip(np.einsum("ni,ni->n", du_sm - du_pts, vn_u) / 0.0032, 0.0, 1.0)
            don_concav = concav_u[d_weld]
            dbvh = BVHTree.FromPolygons(don_sub_pts.tolist(), don_sub_tri.tolist(), all_triangles=True)

            # Smooth mask on canonical Rest coordinates (`exclude hands, feet, Donor briefs, and ONLY the hidden deep underarm slot —
            # NEVER excluding visible upper serratus or outer pec!`):
            pr_flat = p_ref_buf[cov_b]
            pp_flat = p_posed_buf[cov_b]
            phi_br_tex = _eval_brief_level_set_bl(pr_flat)
            brief_ex = smootherstep((phi_br_tex + 0.012) / 0.022)
            s_post_wb = smootherstep((pp_flat[:, 1] + 0.025) / 0.055)
            if adipose_gate > 0.20:
                z_d_lo = (1.0 - s_post_wb) * (0.855 + 1.10 * np.clip(np.abs(pp_flat[:, 0]) - 0.055, 0.0, 0.12)) + s_post_wb * (
                    0.850 + 0.72 * np.clip(np.abs(pp_flat[:, 0]) - 0.095, 0.0, 0.12)
                )
            else:
                z_d_lo = (1.0 - s_post_wb) * (0.964 + 1.48 * np.clip(np.abs(pp_flat[:, 0]) - 0.040, 0.0, 0.12)) + s_post_wb * (
                    0.955 + 0.90 * np.clip(np.abs(pp_flat[:, 0]) - 0.038, 0.0, 0.13)
                )
            th_deg_tx = np.degrees(np.arctan2(np.abs(p_buf[cov_b][:, 0]), -p_buf[cov_b][:, 1]))
            serr_keep_tx = (
                (1.0 - smootherstep((p_buf[cov_b][:, 1] + 0.058) / 0.022))
                * smootherstep((p_buf[cov_b][:, 2] - 1.320) / 0.022)
                * (1.0 - smootherstep((p_buf[cov_b][:, 2] - 1.472) / 0.022))
                * (1.0 - smootherstep((th_deg_tx - 65.0) / 9.0))
            )
            # Gate `flank_taper_ex` strictly to lean builds (`adipose_gate < 0.5`) so `M050-F100`'s oblique thoracolumbar back rolls
            # are 100% preserved in BOTH normal map and sulcus AO!
            lean_taper_gate = max(0.0, 1.0 - 2.0 * float(adipose_gate))
            flank_taper_ex = (
                lean_taper_gate
                * (1.0 - smootherstep((np.abs(pr_flat[:, 0]) - 0.206) / 0.024))
                * smootherstep((th_deg_tx - 48.0) / 11.0)
                * (1.0 - smootherstep((th_deg_tx - 138.0) / 13.0))
                * smootherstep((p_buf[cov_b][:, 2] - 1.125) / 0.026)
                * (1.0 - smootherstep((p_buf[cov_b][:, 2] - 1.445) / 0.030))
                * (1.0 - serr_keep_tx)
                * np.where(p_buf[cov_b][:, 1] > 0.015, smootherstep((np.abs(p_buf[cov_b][:, 0]) - 0.106) / 0.020), 1.0)
            )
            hip_wb_rise = 0.052 + 0.082 * float(np.clip(adipose_gate, 0.0, 1.0))
            z_dwb_front = (1.198 - 0.125 * adipose_gate) + hip_wb_rise * smootherstep((np.abs(pp_flat[:, 0]) - 0.030) / 0.115)
            # Keep posterior Donor-waistband suppression bounded to `<= 1.242 m` (`with central erector/spinous protection above `1.226 m`!)
            # so `M100-F000` lower erector columns & `M000-F000` lumbar spinous processes stay 100% crisp right into the rear waistband:
            z_dwb_back = 1.242 - 0.016 * (1.0 - smootherstep((np.abs(pp_flat[:, 0]) - 0.026) / 0.022))
            z_dwb = (1.0 - s_post_wb) * z_dwb_front + s_post_wb * z_dwb_back
            # On `adipose_gate > 0.20`, NEVER suppress anterior sub-apron overhang crease normals (`keep posterior sacral waistband fade only`):
            wb_ant_allow = s_post_wb if adipose_gate > 0.20 else np.ones_like(s_post_wb)
            dwb_ex = np.maximum(
                wb_ant_allow
                * (1.0 - smootherstep((np.abs(pr_flat[:, 0]) - 0.215) / 0.028))
                * smootherstep((pp_flat[:, 2] - z_d_lo) / 0.022)
                * (1.0 - smootherstep((pp_flat[:, 2] - z_dwb) / 0.024)),
                flank_taper_ex,
            )
            dwb_seam_band = np.maximum(
                wb_ant_allow
                * (1.0 - smootherstep((np.abs(pr_flat[:, 0]) - 0.215) / 0.028))
                * smootherstep((pp_flat[:, 2] - (0.855 if adipose_gate > 0.20 else 1.135)) / 0.026)
                * (1.0 - smootherstep((pp_flat[:, 2] - z_dwb_back) / 0.024)),
                flank_taper_ex,
            ) * (1.0 - brief_ex)
            dwb_seam_map = np.zeros((h_b, w_b), dtype=np.float64)
            dwb_seam_map[cov_b] = dwb_seam_band
            hand_ex = smootherstep((np.abs(pr_flat[:, 0]) - 0.395) / 0.035) * (1.0 - smootherstep((pr_flat[:, 2] - 1.335) / 0.050))
            hand_ex_map = np.zeros((h_b, w_b), dtype=np.float64)
            hand_ex_map[cov_b] = hand_ex
            # Exclude ONLY the hidden axillary/thigh cut-webbing hole rims (`web_holes_dil`, NEVER `clean_lf_ex` so bare overhanging
            # stomach skin keeps 100% Donor normal/AO correspondence right down to the waistband crease seam!):
            hole_guard_fade = np.ones(len(pp_flat), dtype=np.float64)
            ax_hole_relax = np.zeros(len(pp_flat), dtype=np.float64)
            if adipose_gate > 0.20 and np.any(web_holes_dil):
                excl_v_mask = np.zeros(len(donor_xyz), dtype=bool)
                excl_v_mask[np.unique(donor_tri[web_holes_dil].ravel())] = True
                rim_pts = donor_xyz[excl_v_mask].astype(np.float64)
                if len(rim_pts) > 0:
                    rim_sym = np.column_stack([np.abs(rim_pts[:, 0]), rim_pts[:, 1], rim_pts[:, 2]])
                    rim_q = np.unique(np.round(rim_sym / 0.004).astype(np.int32), axis=0).astype(np.float64) * 0.004
                    pp_sym = np.column_stack([np.abs(pp_flat[:, 0]), pp_flat[:, 1], pp_flat[:, 2]])
                    d_rim = np.full(len(pp_sym), 1.0, dtype=np.float64)
                    # Only texels within the bounding box of `rim_q + 0.075 m` need exact distance evaluation:
                    r_lo = rim_q.min(axis=0) - 0.075
                    r_hi = rim_q.max(axis=0) + 0.075
                    cand_m = np.all((pp_sym >= r_lo[None, :]) & (pp_sym <= r_hi[None, :]), axis=1)
                    cand_idx = np.flatnonzero(cand_m)
                    for c0 in range(0, len(cand_idx), 16384):
                        sl = cand_idx[c0 : c0 + 16384]
                        d2_chunk = np.sum((pp_sym[sl, None, :] - rim_q[None, :, :]) ** 2, axis=2)
                        d_rim[sl] = np.sqrt(np.min(d2_chunk, axis=1))
                    hole_guard_fade = smootherstep((d_rim - 0.018) / 0.044)
                    ax_hole_relax = (1.0 - smootherstep((d_rim - 0.008) / 0.036)) * smootherstep((pp_flat[:, 2] - 1.320) / 0.035)
            ax_y_ant_lim = 0.075 if adipose_gate > 0.20 else 0.108
            ax_x_lo = np.where(pr_flat[:, 1] > 0.015, 0.140, 0.156) if adipose_gate > 0.20 else 0.136
            ax_x_fthr = np.where(pr_flat[:, 1] > 0.015, 0.032, 0.048) if adipose_gate > 0.20 else 0.026
            ax_x_hi = 0.315 if adipose_gate > 0.20 else 0.258
            ax_z_lo = 1.365 if adipose_gate > 0.20 else 1.380
            ax_z_hi = 1.668 if adipose_gate > 0.20 else 1.580
            ax_y_hi = 0.188 if adipose_gate > 0.20 else 0.168
            ax_ex = np.maximum(
                smootherstep((np.abs(pr_flat[:, 0]) - ax_x_lo) / ax_x_fthr)
                * (1.0 - smootherstep((np.abs(pr_flat[:, 0]) - ax_x_hi) / 0.036))
                * smootherstep((pr_flat[:, 2] - ax_z_lo) / 0.032)
                * (1.0 - smootherstep((pr_flat[:, 2] - ax_z_hi) / 0.034))
                * smootherstep((pr_flat[:, 1] + ax_y_ant_lim) / 0.032)
                * (1.0 - smootherstep((pr_flat[:, 1] - ax_y_hi) / 0.032)),
                ax_hole_relax,
            )
            ax_ex_map = np.zeros((h_b, w_b), dtype=np.float64)
            ax_ex_map[cov_b] = ax_ex
            med_x_hi = 0.118 if adipose_gate > 0.20 else 0.054
            med_thigh_ex = (
                (1.0 - smootherstep((np.abs(pp_flat[:, 0]) - med_x_hi) / 0.024))
                * smootherstep((pp_flat[:, 2] - 0.770) / 0.025)
                * (1.0 - smootherstep((pp_flat[:, 2] - 0.965) / 0.024))
            )
            # Smooth 3D collar-seam distance fade (`0.0` within `5 mm` of the welded 3D collar ring -> `1.0` at `31 mm` away,
            # guaranteeing ZERO normal/AO step across the curving clavicular/suprasternal collar seam at `Z = 1.63..1.72m`!):
            if fam is not None and rest_low_ref_bl is not None:
                sb_idx = np.asarray(fam["seams"][0]["bodyVertices"], dtype=np.int64)
                bs_s = np.asarray(fam["meshes"]["bodySkin"]["sourceVertexIndices"], dtype=np.int64)
                b_v_co = np.array([[float(v.co.x), float(v.co.y), float(v.co.z)] for v in verts], dtype=np.float64)
                seam_3d_pts = np.array([b_v_co[int(np.flatnonzero(bs_s == int(sv))[0])] for sv in sb_idx], dtype=np.float64)
                pq_cov = p_buf[cov_b]
                d_col_b = np.sqrt(np.min(np.sum((pq_cov[:, None, :] - seam_3d_pts[None, :, :]) ** 2, axis=2), axis=1))
                collar_3d_fade = smootherstep((d_col_b - 0.005) / 0.026)
            else:
                collar_3d_fade = 1.0 - smootherstep((pr_flat[:, 2] - 1.625) / 0.025)
            # Attenuate donor normal-map HF strongly on smooth anterior adipose skin (`0.85` -> zero `ax_ex` vertical chest seam!)
            # while retaining full posterior thoracolumbar back-fat fold creases (`0.10` attenuation -> `90%` Donor normal + sulcus AO!)
            # AND `100%` of the sunken umbilical navel pit (`r <= 34 mm` around `(0, pp_z = 1.201 m)`):
            s_post_nrm = smootherstep((pr_flat[:, 1] - 0.015) / 0.045)
            z_nav_nrm = 1.205 - 0.026 * float(adipose_gate)
            if adipose_gate > 0.20 and high_fit_bl is not None:
                m_hfn = (np.abs(high_fit_bl[:, 0]) <= 0.006) & (high_fit_bl[:, 2] >= 1.155) & (high_fit_bl[:, 2] <= 1.245) & (high_fit_bl[:, 1] < -0.18)
                if np.sum(m_hfn) >= 4:
                    hfn_p = high_fit_bl[m_hfn]
                    zs_hfn = np.linspace(float(hfn_p[:, 2].min()), float(hfn_p[:, 2].max()), 33)
                    ys_hfn = np.interp(zs_hfn, hfn_p[np.argsort(hfn_p[:, 2]), 2], hfn_p[np.argsort(hfn_p[:, 2]), 1])
                    ys_hfe = ys_hfn.copy()
                    for st_hn in (6, 4, 2):
                        for _ in range(8):
                            ys_hfe[st_hn:-st_hn] = np.minimum(ys_hfe[st_hn:-st_hn], 0.5 * (ys_hfe[:-2*st_hn] + ys_hfe[2*st_hn:]))
                    z_nav_nrm = float(zs_hfn[int(np.argmax(ys_hfn - ys_hfe))])
            r_navel = np.hypot(pp_flat[:, 0] / 0.032, (pp_flat[:, 2] - z_nav_nrm) / 0.030)
            w_navel_keep = (1.0 - smootherstep((r_navel - 0.72) / 0.50)) * smootherstep((-pp_flat[:, 1] - 0.14) / 0.04)
            w_subapron_keep = (
                float(np.clip(adipose_gate, 0.0, 1.0))
                * (1.0 - smootherstep((np.abs(pp_flat[:, 0]) - 0.165) / 0.026))
                * smootherstep((pp_flat[:, 2] - 1.015) / 0.014)
                * (1.0 - smootherstep((pp_flat[:, 2] - 1.095) / 0.025))
                * smootherstep((-pp_flat[:, 1] - 0.135) / 0.035)
                * (1.0 - brief_ex)
            )
            w_nip_flat = w_nip_uv_map[cov_b]
            dwb_seam_band = dwb_seam_band * (1.0 - np.maximum(w_navel_keep, w_subapron_keep))
            dwb_seam_map[cov_b] = dwb_seam_band
            ad_nrm_atten = ((1.0 - s_post_nrm) * 0.85 + s_post_nrm * 0.10) * (1.0 - w_navel_keep) * (1.0 - 0.80 * w_subapron_keep)
            # On `adipose_gate > 0.20` and inside the canonical nipple UV halo `w_nip_flat`, keep sculpted `LOD0` (`high_fit_bl`) normals
            # so 3D umbilical cavity & canonical papilla relief align 1:1 with UV landmarks without raw Donor double-ghosting:
            ad_lod0_only = (1.0 - float(np.clip(adipose_gate, 0.0, 1.0)) * w_navel_keep) * (1.0 - w_nip_flat)
            w_d_flat = (
                np.clip(1.0 - ad_nrm_atten * adipose_gate, 0.0, 1.0)
                * ad_lod0_only
                * hole_guard_fade
                * smootherstep((pr_flat[:, 2] - 0.082) / 0.026)
                * collar_3d_fade
                * (1.0 - np.maximum(brief_ex, dwb_ex * (1.0 - np.maximum(w_navel_keep, w_subapron_keep))))
                * (1.0 - hand_ex)
                * (1.0 - ax_ex)
                * (1.0 - med_thigh_ex)
            )
            w_donor_map = np.zeros((h_b, w_b), dtype=np.float64)
            w_donor_map[cov_b] = w_d_flat
            w_navel_map = np.zeros((h_b, w_b), dtype=np.float64)
            w_navel_map[cov_b] = w_navel_keep
            w_subapron_map = np.zeros((h_b, w_b), dtype=np.float64)
            w_subapron_map[cov_b] = w_subapron_keep
            w_post_map = np.zeros((h_b, w_b), dtype=np.float64)
            s_post_medial = (
                s_post_nrm
                * (1.0 - smootherstep((np.abs(pr_flat[:, 0]) - 0.148) / 0.024))
                * (1.0 - smootherstep((pr_flat[:, 2] - 1.462) / 0.032))
                * (1.0 - ax_ex)
            )
            w_post_map[cov_b] = s_post_medial * float(adipose_gate)

    def _bary_interp(pts_arr: np.ndarray, tri_arr: np.ndarray, val_arr: np.ndarray, f_i: int, hit_pt: Vector) -> np.ndarray:
        ia, ib, ic = int(tri_arr[f_i, 0]), int(tri_arr[f_i, 1]), int(tri_arr[f_i, 2])
        pa, pb, pc_v = pts_arr[ia], pts_arr[ib], pts_arr[ic]
        v0, v1 = pb - pa, pc_v - pa
        v2 = np.asarray(hit_pt, dtype=np.float64) - pa
        d00 = float(v0 @ v0)
        d01 = float(v0 @ v1)
        d11 = float(v1 @ v1)
        d20 = float(v2 @ v0)
        d21 = float(v2 @ v1)
        den = d00 * d11 - d01 * d01
        if abs(den) > 1e-14:
            bv = float(np.clip((d11 * d20 - d01 * d21) / den, 0.0, 1.0))
            bw = float(np.clip((d00 * d21 - d01 * d20) / den, 0.0, 1.0 - bv))
            bu = 1.0 - bv - bw
            return bu * val_arr[ia] + bv * val_arr[ib] + bw * val_arr[ic]
        return val_arr[ia]

    ax_ex_map = locals().get("ax_ex_map", None)
    dwb_seam_map = locals().get("dwb_seam_map", None)
    hand_ex_map = locals().get("hand_ex_map", None)
    baked_b = np.broadcast_to(np.array([0.5, 0.5, 1.0], dtype=np.float32), (h_b, w_b, 3)).copy()
    ao_b = np.ones((h_b, w_b), dtype=np.float32)
    cy_idx, cx_idx = np.nonzero(cov_b)
    for py_i, px_i in zip(cy_idx.tolist(), cx_idx.tolist()):
        p_q = p_buf[py_i, px_i]
        n_l = n_buf[py_i, px_i]
        nl_len = float(np.linalg.norm(n_l))
        if nl_len < 1e-8:
            continue
        n_l = n_l / nl_len
        t_l = t_buf[py_i, px_i]
        b_l = b_buf[py_i, px_i]
        t_l = t_l / max(float(np.linalg.norm(t_l)), 1e-8)
        b_l = b_l / max(float(np.linalg.norm(b_l)), 1e-8)

        # 1) Baseline LOD0 Rest normal (relaxed toward smooth welded `n_l` inside the deep underarm crease, Donor-waistband strip,
        #    and distal wrist/hand where `LOD0` and `LOD1` share identical Kabsch geometry and `full_micro_delta` supplies knuckle pores):
        n_h = n_l
        hit, _, f_idx, dist = hbvh.find_nearest(Vector(p_q.tolist()), 0.016)
        if hit is not None and f_idx is not None and float(dist) <= 0.012:
            nh_cand = _bary_interp(high_fit_bl, high_tri, high_vn, int(f_idx), hit)
            nh_len = float(np.linalg.norm(nh_cand))
            if nh_len > 1e-8:
                nh_cand = nh_cand / nh_len
                if float(nh_cand @ n_l) >= 0.55:
                    ax_rel_k = 0.96 if adipose_gate > 0.20 else 0.90
                    w_ax_rel = ax_rel_k * float(ax_ex_map[py_i, px_i]) if ax_ex_map is not None else 0.0
                    wb_rel_k = 0.90 if p_q[1] > 0.020 else (0.85 if adipose_gate > 0.20 else 0.45)
                    w_wb_rel = wb_rel_k * float(dwb_seam_map[py_i, px_i]) if dwb_seam_map is not None else 0.0
                    w_hd_rel = 0.92 * float(hand_ex_map[py_i, px_i]) if hand_ex_map is not None else 0.0
                    w_rel_tot = max(w_ax_rel, w_wb_rel, w_hd_rel)
                    nh_mix = (1.0 - w_rel_tot) * nh_cand + w_rel_tot * n_l
                    nh_ml = float(np.linalg.norm(nh_mix))
                    if nh_ml > 1e-8:
                        n_h = nh_mix / nh_ml

        # 2) Direct 420k-triangle Meshy Donor normal (`pulled back to Rest via J^T`, with tight `<= 8 mm` local ray distance
        #    so a low-A-pose wrist never jumps across an air gap onto the lateral hip!):
        if dbvh is not None and w_donor_map is not None:
            wd = float(w_donor_map[py_i, px_i])
            if wd > 0.02:
                p_p = p_posed_buf[py_i, px_i]
                j_m = jac_buf[py_i, px_i]
                # Approximate posed low normal via cofactor/inverse-transpose for ray direction check:
                try:
                    n_p_approx = np.linalg.solve(j_m.T, n_l)
                except np.linalg.LinAlgError:
                    n_p_approx = n_l
                np_len = float(np.linalg.norm(n_p_approx))
                if np_len > 1e-8:
                    n_p_approx = n_p_approx / np_len
                    nd_acc = np.zeros(3, dtype=np.float64)
                    c_acc = 0.0
                    n_hits = 0
                    # Mirror-symmetrize Donor normal & sulcus-concavity queries across `+-X` on `adipose_gate > 0.20` to cancel
                    # single-sided AI shading noise while suppressing flat-skin concavity baseline (`c < 0.18` -> `0.0` AO step!):
                    sym_signs = (1.0, -1.0) if (adipose_gate > 0.20 and abs(p_p[0]) > 2.0e-3) else (1.0,)
                    w_nv_px = float(w_navel_map[py_i, px_i]) if "w_navel_map" in locals() and w_navel_map is not None else 0.0
                    w_po_px = float(w_post_map[py_i, px_i]) if "w_post_map" in locals() and w_post_map is not None else 0.0
                    w_ad_pec = (
                        float(np.clip(adipose_gate, 0.0, 1.0))
                        * float(1.0 - smootherstep(np.array([(abs(float(p_p[0])) - 0.165) / 0.030]))[0])
                        * float(smootherstep(np.array([(float(p_p[2]) - 1.320) / 0.035]))[0])
                        * float(1.0 - smootherstep(np.array([(float(p_p[2]) - 1.545) / 0.035]))[0])
                        * float(smootherstep(np.array([(-float(p_p[1]) - 0.110) / 0.030]))[0])
                    )
                    ray_half = 0.022 if (w_nv_px > 0.10 or w_po_px > 0.25) else (0.007 + 0.009 * w_ad_pec)
                    cos_min = 0.22 if w_nv_px > 0.10 else ((0.52 if w_po_px > 0.25 else 0.72) - 0.20 * w_ad_pec)
                    for sx_q in sym_signs:
                        pq_m = np.array([sx_q * p_p[0], p_p[1], p_p[2]], dtype=np.float64)
                        nq_m = np.array([sx_q * n_p_approx[0], n_p_approx[1], n_p_approx[2]], dtype=np.float64)
                        dh_pt, _, df_i, _ = dbvh.ray_cast(Vector((pq_m - ray_half * nq_m).tolist()), Vector(nq_m.tolist()), 2.0 * ray_half)
                        if dh_pt is None or df_i is None:
                            dh_pt, _, df_i, d_dist = dbvh.find_nearest(Vector(pq_m.tolist()), ray_half)
                            if d_dist is not None and float(d_dist) > ray_half:
                                dh_pt, df_i = None, None
                        if dh_pt is not None and df_i is not None:
                            nd_m = _bary_interp(don_sub_pts, don_sub_tri, don_vn, int(df_i), dh_pt)
                            nd_ml = float(np.linalg.norm(nd_m))
                            if nd_ml > 1e-8:
                                nd_m = nd_m / nd_ml
                                if float(nd_m @ nq_m) > cos_min:
                                    nd_acc += np.array([sx_q * float(nd_m[0]), float(nd_m[1]), float(nd_m[2])], dtype=np.float64)
                                    c_raw = float(_bary_interp(don_sub_pts, don_sub_tri, don_concav[:, None], int(df_i), dh_pt)[0])
                                    c_acc += max(0.0, (c_raw - 0.16) / 0.84) if adipose_gate > 0.20 else c_raw
                                    n_hits += 1
                    if n_hits > 0:
                        nd_posed = nd_acc / max(float(np.linalg.norm(nd_acc)), 1e-8)
                        nd_rest = j_m.T @ nd_posed
                        ndr_len = float(np.linalg.norm(nd_rest))
                        if ndr_len > 1e-8:
                            nd_rest = nd_rest / ndr_len
                            if float(nd_rest @ n_l) >= (0.18 if w_nv_px > 0.10 else 0.35):
                                n_blend = (1.0 - wd) * n_h + wd * nd_rest
                                nb_len = float(np.linalg.norm(n_blend))
                                if nb_len > 1e-8:
                                    n_h = n_blend / nb_len
                                ao_gain = 0.072 + 0.18 * w_nv_px + 0.065 * w_po_px
                                ao_b[py_i, px_i] = 1.0 - float(ao_gain * wd * (c_acc / n_hits))

        # On `F > 0` (`adipose_gate > 0.20`), accentuate `LOD0`'s sunken umbilical cavity normal & ambient occlusion so the PBR
        # belly button (`Row 1 Col 7`) reads as crisply sunken and shaded as `2D Concept` (`Row 1 Col 5`):
        if adipose_gate > 0.20 and "w_navel_map" in locals() and w_navel_map is not None:
            w_nv_c = float(w_navel_map[py_i, px_i])
            if w_nv_c > 0.04:
                p_nv = p_posed_buf[py_i, px_i] if p_posed_buf is not None else p_buf[py_i, px_i]
                z_nv_c = float(z_nav_nrm) if "z_nav_nrm" in locals() else 1.180
                r_nv_core = float(np.hypot(p_nv[0] / 0.0115, (p_nv[2] - z_nv_c) / 0.0110))
                nv_ao = 1.0 - 0.44 * float(adipose_gate) * float(np.exp(-(r_nv_core ** 2)))
                ao_b[py_i, px_i] = min(float(ao_b[py_i, px_i]), nv_ao)
                dn_nv = n_h - n_l
                n_boost = n_l + (1.0 + 0.85 * w_nv_c) * dn_nv
                nb_l2 = float(np.linalg.norm(n_boost))
                if nb_l2 > 1e-8:
                    n_h = n_boost / nb_l2
        if adipose_gate > 0.20 and "w_subapron_map" in locals() and w_subapron_map is not None:
            w_sa_c = float(w_subapron_map[py_i, px_i])
            if w_sa_c > 0.04:
                # Preserve crisp downward-facing overhang-crease self-shadowing (`where normal tilts downward into the sub-apron fold`):
                down_tilt = max(0.0, -float(n_h[2]) - 0.18) / 0.82
                sa_ao = 1.0 - 0.30 * float(adipose_gate) * w_sa_c * down_tilt
                ao_b[py_i, px_i] = min(float(ao_b[py_i, px_i]), sa_ao)
                n_sa_b = n_l + (1.0 + 0.55 * w_sa_c) * (n_h - n_l)
                nsa_l = float(np.linalg.norm(n_sa_b))
                if nsa_l > 1e-8:
                    n_h = n_sa_b / nsa_l
        w_np_uv = float(w_nip_uv_map[py_i, px_i])
        if w_np_uv > 0.04:
            n_np_b = n_l + (1.0 + 0.55 * w_np_uv) * (n_h - n_l)
            nnp_l = float(np.linalg.norm(n_np_b))
            if nnp_l > 1e-8:
                n_h = n_np_b / nnp_l
            pap_slope = float(np.linalg.norm(n_h - n_l))
            ao_b[py_i, px_i] = min(float(ao_b[py_i, px_i]), 1.0 - 0.14 * w_np_uv * min(pap_slope / 0.30, 1.0))

        tx = float(np.clip(n_h @ t_l, -0.90, 0.90))
        ty = float(np.clip(n_h @ b_l, -0.90, 0.90))
        tz = float(max(n_h @ n_l, 0.28))
        t_norm = float(np.sqrt(tx * tx + ty * ty + tz * tz))
        baked_b[py_i, px_i, 0] = 0.5 + 0.5 * (tx / t_norm)
        baked_b[py_i, px_i, 1] = 0.5 + 0.5 * (ty / t_norm)
        baked_b[py_i, px_i, 2] = 0.5 + 0.5 * (tz / t_norm)

    # Dilate 6 pixels into UV gutters so bilinear filtering never samples unbaked gutter edges:
    cur_cov = cov_b.copy()
    for _ in range(6):
        acc = np.zeros_like(baked_b)
        acc_ao = np.zeros_like(ao_b)
        cnt = np.zeros((h_b, w_b, 1), dtype=np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            s_img = np.roll(np.roll(baked_b, dy, axis=0), dx, axis=1)
            s_ao = np.roll(np.roll(ao_b, dy, axis=0), dx, axis=1)
            s_cov = np.roll(np.roll(cur_cov, dy, axis=0), dx, axis=1)
            m = (~cur_cov) & s_cov
            acc[m] += s_img[m]
            acc_ao[m] += s_ao[m]
            cnt[m, 0] += 1.0
        fill = (~cur_cov) & (cnt[:, :, 0] > 0.0)
        if not np.any(fill):
            break
        baked_b[fill] = acc[fill] / cnt[fill]
        ao_b[fill] = acc_ao[fill] / cnt[fill, 0]
        cur_cov[fill] = True

    return baked_b, cur_cov, ao_b


def _seamlessly_feather_collar_uvs_and_linen_material(
    fam: dict,
    materials: dict[str, bpy.types.Material],
    tmp_tex: Path,
    body_obj: bpy.types.Object | None = None,
    head_obj: bpy.types.Object | None = None,
    sole_min_z: float = 0.0,
    high_fit_bl: np.ndarray | None = None,
    high_tri: np.ndarray | None = None,
    adipose_gate: float = 1.0,
    donor_xyz: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
    donor_bridged_axilla_faces: np.ndarray | None = None,
    donor_bridged_thigh_faces: np.ndarray | None = None,
    donor_linen_faces: np.ndarray | None = None,
    posed_low_fit_bl: np.ndarray | None = None,
    rest_low_ref_bl: np.ndarray | None = None,
    jac_low: np.ndarray | None = None,
) -> None:
    """Bake MikkTSpace `LOD0 -> LOD1` body normals while preserving high-frequency pores/knuckles,
    harmonize global head-to-body skin hue + weld collar UVs, keep natural un-crushed eye irises,
    and attach a woven-linen texture with stitched waistband & leg-hem bindings to `undyedLinen`.
    """
    seam_body = np.asarray(fam["seams"][0]["bodyVertices"], dtype=np.int64)
    seam_head = np.asarray(fam["seams"][0]["headVertices"], dtype=np.int64)
    bs_src = np.asarray(fam["meshes"]["bodySkin"]["sourceVertexIndices"], dtype=np.int64)
    hs_src = np.asarray(fam["meshes"]["headSkin"]["sourceVertexIndices"], dtype=np.int64)
    buv = np.asarray(fam["meshes"]["bodySkin"]["uvs"], dtype=np.float64).reshape(-1, 2)
    huv = np.asarray(fam["meshes"]["headSkin"]["uvs"], dtype=np.float64).reshape(-1, 2)
    btri_r = np.asarray(fam["meshes"]["bodySkin"]["renderTriangles"], dtype=np.int64).reshape(-1, 3)
    htri_r = np.asarray(fam["meshes"]["headSkin"]["renderTriangles"], dtype=np.int64).reshape(-1, 3)

    def _seam_uv_segments_and_inward(
        seam_v: np.ndarray, src_idx: np.ndarray, uv_arr: np.ndarray, rtri: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        seam_set = set(int(v) for v in seam_v)
        r_adj: dict[int, set[int]] = {}
        seg_pairs: set[tuple[int, int]] = set()
        for a, b, c in rtri:
            ia, ib, ic = int(a), int(b), int(c)
            r_adj.setdefault(ia, set()).update((ib, ic))
            r_adj.setdefault(ib, set()).update((ia, ic))
            r_adj.setdefault(ic, set()).update((ia, ib))
            for u0, u1 in ((ia, ib), (ib, ic), (ic, ia)):
                if int(src_idx[u0]) in seam_set and int(src_idx[u1]) in seam_set:
                    seg_pairs.add((min(u0, u1), max(u0, u1)))

        def _vert_inward(rv_i: int) -> np.ndarray:
            uv0 = uv_arr[rv_i]
            nbr_in = [uv_arr[nb] - uv0 for nb in r_adj.get(rv_i, ()) if int(src_idx[nb]) not in seam_set]
            if nbr_in:
                d_in = np.mean(nbr_in, axis=0)
                n_in = float(np.linalg.norm(d_in))
                if n_in > 1e-8:
                    return d_in / n_in
            return np.zeros(2, dtype=np.float64)

        seg_a_list: list[np.ndarray] = []
        seg_b_list: list[np.ndarray] = []
        seg_in_list: list[np.ndarray] = []
        for ra, rb in sorted(seg_pairs):
            pa, pb = uv_arr[ra], uv_arr[rb]
            if float(np.linalg.norm(pb - pa)) <= 0.12:
                seg_a_list.append(pa)
                seg_b_list.append(pb)
                din = 0.5 * (_vert_inward(ra) + _vert_inward(rb))
                nl = float(np.linalg.norm(din))
                seg_in_list.append((din / nl) if nl > 1e-8 else np.array([0.0, 1.0], dtype=np.float64))
        if not seg_a_list:
            pts = np.array([uv_arr[int(np.flatnonzero(src_idx == int(sv))[0])] for sv in seam_v], dtype=np.float64)
            return pts, pts, np.tile(np.array([[0.0, 1.0]], dtype=np.float64), (len(pts), 1))
        return np.array(seg_a_list, dtype=np.float64), np.array(seg_b_list, dtype=np.float64), np.array(seg_in_list, dtype=np.float64)

    b_seg_a, b_seg_b, b_seg_in = _seam_uv_segments_and_inward(seam_body, bs_src, buv, btri_r)
    h_seg_a, h_seg_b, h_seg_in = _seam_uv_segments_and_inward(seam_head, hs_src, huv, htri_r)

    def _ordered_seam_uv_and_inward(
        seam_v: np.ndarray, src_idx: np.ndarray, uv_arr: np.ndarray, rtri: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray]:
        seam_set = set(int(v) for v in seam_v)
        r_adj: dict[int, list[int]] = {}
        for a, b, c in rtri:
            ia, ib, ic = int(a), int(b), int(c)
            r_adj.setdefault(ia, []).extend([ib, ic])
            r_adj.setdefault(ib, []).extend([ia, ic])
            r_adj.setdefault(ic, []).extend([ia, ib])
        uv_pts = np.zeros((len(seam_v), 2), dtype=np.float64)
        in_dirs = np.zeros((len(seam_v), 2), dtype=np.float64)
        for k, sv in enumerate(seam_v):
            r_rows = np.flatnonzero(src_idx == int(sv))
            r0 = int(r_rows[0])
            uv0 = uv_arr[r0]
            uv_pts[k] = uv0
            nbr_in = [uv_arr[nb] - uv0 for nb in r_adj.get(r0, []) if int(src_idx[nb]) not in seam_set]
            if nbr_in:
                d_in = np.mean(nbr_in, axis=0)
                n_in = float(np.linalg.norm(d_in))
                if n_in > 1e-8:
                    in_dirs[k] = d_in / n_in
        return uv_pts, in_dirs

    b_seam_uv, b_in_dir = _ordered_seam_uv_and_inward(seam_body, bs_src, buv, btri_r)
    h_seam_uv, h_in_dir = _ordered_seam_uv_and_inward(seam_head, hs_src, huv, htri_r)

    def _eval_seam_band_field(
        w_img: int, h_img: int, seg_a: np.ndarray, seg_b: np.ndarray, seg_in: np.ndarray, pair_uv: np.ndarray | None = None
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        uu = (np.arange(w_img, dtype=np.float64) + 0.5) / w_img
        vv = (np.arange(h_img, dtype=np.float64) + 0.5) / h_img
        pad_u, pad_v = 108.0 / w_img, 108.0 / h_img
        all_u = np.concatenate([seg_a[:, 0], seg_b[:, 0]])
        all_v = np.concatenate([seg_a[:, 1], seg_b[:, 1]])
        u0 = max(0, int(np.floor((all_u.min() - pad_u) * w_img)))
        u1 = min(w_img, int(np.ceil((all_u.max() + pad_u) * w_img)))
        v0 = max(0, int(np.floor((all_v.min() - pad_v) * h_img)))
        v1 = min(h_img, int(np.ceil((all_v.max() + pad_v) * h_img)))

        dist_px = np.full((h_img, w_img), 999.0, dtype=np.float64)
        signed_in = np.ones((h_img, w_img), dtype=np.float64)
        near_k = np.zeros((h_img, w_img), dtype=np.float64)
        if u1 <= u0 or v1 <= v0:
            return dist_px, signed_in, near_k

        gu, gv = np.meshgrid(uu[u0:u1] * w_img, vv[v0:v1] * h_img)
        pa_px = seg_a * np.array([w_img, h_img], dtype=np.float64)
        pb_px = seg_b * np.array([w_img, h_img], dtype=np.float64)
        in_px = seg_in * np.array([w_img, h_img], dtype=np.float64)
        in_px /= np.maximum(np.linalg.norm(in_px, axis=1, keepdims=True), 1e-8)

        best_d2 = np.full(gu.shape, 1e12, dtype=np.float64)
        best_sgn = np.ones(gu.shape, dtype=np.float64)
        for k in range(len(pa_px)):
            pa, pb = pa_px[k], pb_px[k]
            seg = pb - pa
            slen2 = float(seg[0] * seg[0] + seg[1] * seg[1])
            t_seg = np.clip(((gu - pa[0]) * seg[0] + (gv - pa[1]) * seg[1]) / max(slen2, 1e-8), 0.0, 1.0)
            proj_x = pa[0] + t_seg * seg[0]
            proj_y = pa[1] + t_seg * seg[1]
            dx = gu - proj_x
            dy = gv - proj_y
            d2 = dx * dx + dy * dy
            upd = d2 < best_d2
            if np.any(upd):
                best_d2[upd] = d2[upd]
                best_sgn[upd] = np.where((dx * in_px[k, 0] + dy * in_px[k, 1])[upd] >= 0.0, 1.0, -1.0)

        if pair_uv is not None and len(pair_uv) > 0:
            p_px = pair_uv * np.array([w_img, h_img], dtype=np.float64)
            best_pd2 = np.full(gu.shape, 1e12, dtype=np.float64)
            best_pk = np.zeros(gu.shape, dtype=np.float64)
            for kp in range(len(p_px)):
                dp2 = (gu - p_px[kp, 0]) ** 2 + (gv - p_px[kp, 1]) ** 2
                upk = dp2 < best_pd2
                if np.any(upk):
                    best_pd2[upk] = dp2[upk]
                    best_pk[upk] = float(kp)
            near_k[v0:v1, u0:u1] = best_pk

        dist_px[v0:v1, u0:u1] = np.sqrt(best_d2)
        signed_in[v0:v1, u0:u1] = best_sgn
        return dist_px, signed_in, near_k

    def _replace_material_packed_image(
        mat_id: str, old_img: bpy.types.Image, new_name: str, pixels_rgba: np.ndarray, is_normal: bool
    ) -> None:
        h_i, w_i = pixels_rgba.shape[:2]
        fresh = bpy.data.images.new(new_name, width=w_i, height=h_i, alpha=True)
        fresh.colorspace_settings.name = "Non-Color" if is_normal else "sRGB"
        fresh.pixels.foreach_set(pixels_rgba.astype(np.float32).reshape(-1))
        fresh.update()
        fresh.filepath_raw = str(tmp_tex / f"{new_name}.png")
        fresh.file_format = "PNG"
        fresh.save()
        dump_dir_env = os.environ.get("OL_DUMP_WELDED_TEX")
        if dump_dir_env:
            import shutil as _sh_dump
            _dp = Path(dump_dir_env)
            _dp.mkdir(parents=True, exist_ok=True)
            _sh_dump.copy2(tmp_tex / f"{new_name}.png", _dp / f"{new_name}.png")
        fresh.pack()
        if mat_id in materials:
            for nd in materials[mat_id].node_tree.nodes:
                if nd.type == "TEX_IMAGE" and nd.image == old_img:
                    nd.image = fresh
        bpy.data.images.remove(old_img)

    # 1) `skin-normal`:
    #    - Preserve 100% of fine pores, finger/toe knuckle creases & navel ring (`high-pass <= 5 px`) on `U >= 0.5`
    #      while replacing stale macro `M050-F000` normal waves with the exact MikkTSpace `LOD0 -> LOD1` normal bake!
    #    - On lean builds (`adipose_gate < 0.5`), remove stale double-chin/fat-neck rings baked in the witness head tile (`U < 0.5, V < 0.25`)!
    nrm_img = bpy.data.images.get("skin-normal")
    if nrm_img is not None:
        w_n, h_n = nrm_img.size
        pn = np.empty(w_n * h_n * 4, dtype=np.float32)
        nrm_img.pixels.foreach_get(pn)
        pn = pn.reshape(h_n, w_n, 4)
        half_w = w_n // 2
        neutral_n = np.array([0.5, 0.5, 1.0], dtype=np.float32)

        # Extract high-pass micro-detail: keep `radius=5, passes=2` on `headSkin` (`U < 0.5`) and distal finger/toe UV regions
        # (`preserving 100% of finger/toe knuckle creases and facial detail`), while using `radius=1, passes=1` (`true 3x3 pore-only
        # micro-grain`) across torso/limb/wrist `bodySkin` (`U >= 0.5`) so witness stomach wrinkles or wrist halos never appear!
        full_orig = pn[:, :, :3].copy()
        macro_5 = _box_blur_rgb(full_orig, radius=5, passes=2)
        macro_1 = _box_blur_rgb(full_orig, radius=1, passes=1)
        bs_ref_bl = gltf_to_blender(np.asarray(fam["meshes"]["bodySkin"]["positions"], dtype=np.float64).reshape(-1, 3))
        _, nip_sv_set = _canonical_body_nipple_uv_centers(fam)
        keep_5 = np.zeros((h_n, w_n), dtype=np.float32)
        keep_5[:, :half_w] = 1.0
        for rv_i, (u_c, v_c) in enumerate(buv):
            sv_i = int(bs_src[rv_i])
            pt_c = bs_ref_bl[sv_i]
            is_navel_uv = (abs(pt_c[0]) < 0.032) and (1.175 <= pt_c[2] <= 1.255) and (pt_c[1] < -0.085)
            is_nipple_uv = sv_i in nip_sv_set
            if (abs(pt_c[0]) > 0.495 and pt_c[2] < 1.30) or (pt_c[2] < 0.085) or is_navel_uv or is_nipple_uv:
                px_c = int(np.clip(u_c * w_n, half_w, w_n - 1))
                py_c = int(np.clip(v_c * h_n, 0, h_n - 1))
                r_kp = 16 if is_nipple_uv else 14
                keep_5[max(0, py_c - r_kp) : min(h_n, py_c + r_kp + 1), max(half_w, px_c - r_kp) : min(w_n, px_c + r_kp + 1)] = 1.0
        k_rgb = _box_blur_rgb(np.repeat(keep_5[:, :, None], 3, axis=2), radius=10, passes=2)
        full_macro = k_rgb * macro_5 + (1.0 - k_rgb) * macro_1
        # Suppress UV-island gutter boundary steps (`where witness normal map drops to neutral [0.5,0.5,1.0] outside islands`):
        non_gutter = (np.linalg.norm(full_orig - neutral_n[None, None, :], axis=2) > 0.006).astype(np.float32)
        eroded_uv = non_gutter.copy()
        for _ in range(5):
            for dy_g, dx_g in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                eroded_uv = np.minimum(eroded_uv, np.roll(np.roll(eroded_uv, dy_g, axis=0), dx_g, axis=1))
        uv_interior_w = _box_blur_rgb(np.repeat(eroded_uv[:, :, None], 3, axis=2), radius=3, passes=1)
        full_micro_delta = (full_orig - full_macro) * uv_interior_w
        head_orig = full_orig[:, :half_w, :]
        head_macro = macro_5[:, :half_w, :]

        sulcus_ao_map = None
        if body_obj is not None and high_fit_bl is not None and high_tri is not None:
            baked_lod0_nrm, cov_mask, sulcus_ao_map = _bake_mikkt_lod0_to_lod1_body_normals(
                body_obj,
                high_fit_bl,
                high_tri,
                w_n - half_w,
                h_n,
                fam=fam,
                donor_xyz=donor_xyz,
                donor_tri=donor_tri,
                donor_bridged_axilla_faces=donor_bridged_axilla_faces,
                donor_bridged_thigh_faces=donor_bridged_thigh_faces,
                donor_linen_faces=donor_linen_faces,
                posed_low_fit_bl=posed_low_fit_bl,
                rest_low_ref_bl=rest_low_ref_bl,
                jac_low=jac_low,
                adipose_gate=adipose_gate,
            )
            # Dilate `baked_lod0_nrm` 8 px outward into UV gutters (`!cov_mask`) so bilinear texture filtering across
            # wrist/arm/leg UV seams NEVER blends interior tangent normals with `neutral_n = [0.5, 0.5, 1.0]`:
            dil_nrm = baked_lod0_nrm.copy()
            dil_cov = cov_mask.copy()
            for _ in range(8):
                unfilled = ~dil_cov
                if not np.any(unfilled):
                    break
                acc_n = np.zeros_like(dil_nrm)
                cnt_n = np.zeros(dil_cov.shape, dtype=np.float32)
                for dy_d, dx_d in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
                    sh_c = np.roll(np.roll(dil_cov, dy_d, axis=0), dx_d, axis=1)
                    sh_n = np.roll(np.roll(dil_nrm, dy_d, axis=0), dx_d, axis=1)
                    acc_n += np.where(sh_c[:, :, None], sh_n, 0.0)
                    cnt_n += sh_c.astype(np.float32)
                can_fill = unfilled & (cnt_n > 0.0)
                if not np.any(can_fill):
                    break
                dil_nrm[can_fill] = acc_n[can_fill] / cnt_n[can_fill, None]
                dil_cov[can_fill] = True
            base_body_nrm = np.where(dil_cov[:, :, None], dil_nrm, neutral_n[None, None, :])
            if sulcus_ao_map is not None:
                dil_ao = sulcus_ao_map.copy()
                ao_cov = cov_mask.copy()
                for _ in range(8):
                    unf_a = ~ao_cov
                    if not np.any(unf_a):
                        break
                    acc_a = np.zeros_like(dil_ao)
                    cnt_a = np.zeros(ao_cov.shape, dtype=np.float32)
                    for dy_d, dx_d in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        sh_c = np.roll(np.roll(ao_cov, dy_d, axis=0), dx_d, axis=1)
                        sh_a = np.roll(np.roll(dil_ao, dy_d, axis=0), dx_d, axis=1)
                        acc_a += np.where(sh_c, sh_a, 0.0)
                        cnt_a += sh_c.astype(np.float32)
                    can_a = unf_a & (cnt_a > 0.0)
                    if not np.any(can_a):
                        break
                    dil_ao[can_a] = acc_a[can_a] / cnt_a[can_a]
                    ao_cov[can_a] = True
                sulcus_ao_map = dil_ao
        else:
            base_body_nrm = np.broadcast_to(neutral_n, full_orig[:, half_w:, :].shape).copy()

        macro_atlas = np.zeros_like(full_orig)
        macro_atlas[:, half_w:, :] = base_body_nrm
        macro_atlas[:, :half_w, :] = head_macro

        # On lean/muscular builds (`F < 0.5`), bake Donor SCM/nuchal neck normals onto `headSkin`, AND on adipose builds (`F >= 0.5`),
        # bake Donor's horizontal posterior occipital/nuchal fat rolls (`pq_h[1] > +0.022 m, Z = 1.68..1.86 m`) onto `headSkin`!
        lean_neck_w = float(np.clip(1.0 - 2.0 * adipose_gate, 0.0, 1.0))
        ad_nape_w = float(np.clip(adipose_gate, 0.0, 1.0))
        if lean_neck_w > 0.02 or ad_nape_w > 0.02:
            vv_h = (np.arange(h_n, dtype=np.float32) + 0.5) / float(h_n)
            neck_band = (1.0 - smootherstep((vv_h - 0.16) / 0.11).astype(np.float32))[:, None, None] * lean_neck_w
            head_macro_clean = (1.0 - neck_band) * head_macro + neck_band * neutral_n

            if head_obj is not None and donor_xyz is not None and donor_tri is not None:
                h_me = head_obj.data
                h_me.calc_tangents(uvmap="UVMap")
                h_uv_l = h_me.uv_layers["UVMap"].data
                h_verts = h_me.vertices
                seam_3d_h = np.array(
                    [
                        [
                            float(h_verts[int(np.flatnonzero(hs_src == int(sv))[0])].co.x),
                            float(h_verts[int(np.flatnonzero(hs_src == int(sv))[0])].co.y),
                            float(h_verts[int(np.flatnonzero(hs_src == int(sv))[0])].co.z) + sole_min_z,
                        ]
                        for sv in seam_head
                    ],
                    dtype=np.float64,
                )
                dcz_h = donor_xyz[donor_tri].mean(axis=1)[:, 2]
                z_dh_max = 1.88 if ad_nape_w > 0.1 else 1.81
                keep_dh = (dcz_h >= 1.60) & (dcz_h <= z_dh_max) & (np.abs(donor_xyz[donor_tri].mean(axis=1)[:, 0]) <= 0.22)
                if np.sum(keep_dh) >= 120:
                    uv_dh, inv_dh = np.unique(donor_tri[keep_dh].ravel(), return_inverse=True)
                    dh_pts = donor_xyz[uv_dh].astype(np.float64)
                    dh_tri = inv_dh.reshape(-1, 3).astype(np.int64)
                    dh_conn = weld_connectivity(dh_pts, dh_tri, decimals=5)
                    dh_vn_raw = vertex_normals(dh_pts, dh_tri, dh_conn[0])
                    dh_vn_u = np.column_stack(
                        [np.bincount(dh_conn[0], weights=dh_vn_raw[:, c], minlength=len(dh_conn[2])) / dh_conn[2] for c in range(3)]
                    )
                    dh_vn_u /= np.maximum(np.linalg.norm(dh_vn_u, axis=1, keepdims=True), 1e-12)
                    dh_vn = dh_vn_u[dh_conn[0]]
                    dh_bvh = BVHTree.FromPolygons(dh_pts.tolist(), dh_tri.tolist(), all_triangles=True)

                    hp_buf = np.zeros((h_n, half_w, 3), dtype=np.float64)
                    ht_buf = np.zeros((h_n, half_w, 3), dtype=np.float64)
                    hb_buf = np.zeros((h_n, half_w, 3), dtype=np.float64)
                    hn_buf = np.zeros((h_n, half_w, 3), dtype=np.float64)
                    h_cov = np.zeros((h_n, half_w), dtype=bool)
                    h_loops = h_me.loops
                    for lt in h_me.loop_triangles:
                        t_uv = np.zeros((3, 2), dtype=np.float64)
                        t_p = np.zeros((3, 3), dtype=np.float64)
                        t_t = np.zeros((3, 3), dtype=np.float64)
                        t_b = np.zeros((3, 3), dtype=np.float64)
                        t_n = np.zeros((3, 3), dtype=np.float64)
                        for k_l, li in enumerate(lt.loops):
                            lp = h_loops[li]
                            rv = int(lp.vertex_index)
                            uv = h_uv_l[li].uv
                            t_uv[k_l, 0] = float(uv[0]) * 2.0 * half_w
                            t_uv[k_l, 1] = float(uv[1]) * h_n
                            co = h_verts[rv].co
                            t_p[k_l] = [float(co.x), float(co.y), float(co.z) + sole_min_z]
                            t_t[k_l] = lp.tangent[:]
                            t_b[k_l] = lp.bitangent[:]
                            t_n[k_l] = lp.normal[:]
                        if t_p[:, 2].min() > (1.865 if ad_nape_w > 0.1 else 1.788):
                            continue
                        uv0, uv1, uv2 = t_uv
                        x0 = max(0, int(np.floor(min(uv0[0], uv1[0], uv2[0]))))
                        x1 = min(half_w - 1, int(np.ceil(max(uv0[0], uv1[0], uv2[0]))))
                        y0 = max(0, int(np.floor(min(uv0[1], uv1[1], uv2[1]))))
                        y1 = min(h_n - 1, int(np.ceil(max(uv0[1], uv1[1], uv2[1]))))
                        if x1 < x0 or y1 < y0:
                            continue
                        den = (uv1[1] - uv2[1]) * (uv0[0] - uv2[0]) + (uv2[0] - uv1[0]) * (uv0[1] - uv2[1])
                        if abs(den) < 1e-10:
                            continue
                        gx, gy = np.meshgrid(np.arange(x0, x1 + 1, dtype=np.float64) + 0.5, np.arange(y0, y1 + 1, dtype=np.float64) + 0.5)
                        w0 = ((uv1[1] - uv2[1]) * (gx - uv2[0]) + (uv2[0] - uv1[0]) * (gy - uv2[1])) / den
                        w1 = ((uv2[1] - uv0[1]) * (gx - uv2[0]) + (uv0[0] - uv2[0]) * (gy - uv2[1])) / den
                        w2 = 1.0 - w0 - w1
                        ins = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
                        if not np.any(ins):
                            continue
                        iy, ix = np.nonzero(ins)
                        py_h, px_h = y0 + iy, x0 + ix
                        cw0, cw1, cw2 = w0[iy, ix, None], w1[iy, ix, None], w2[iy, ix, None]
                        hp_buf[py_h, px_h] = cw0 * t_p[0] + cw1 * t_p[1] + cw2 * t_p[2]
                        ht_buf[py_h, px_h] = cw0 * t_t[0] + cw1 * t_t[1] + cw2 * t_t[2]
                        hb_buf[py_h, px_h] = cw0 * t_b[0] + cw1 * t_b[1] + cw2 * t_b[2]
                        hn_buf[py_h, px_h] = cw0 * t_n[0] + cw1 * t_n[1] + cw2 * t_n[2]
                        h_cov[py_h, px_h] = True

                    d_col_h_cov = np.sqrt(np.min(np.sum((hp_buf[h_cov][:, None, :] - seam_3d_h[None, :, :]) ** 2, axis=2), axis=1))
                    col_fade_h_buf = np.zeros((h_n, half_w), dtype=np.float64)
                    # Smooth 45 mm collar-ring fade + wide `75 mm` upper-neck fade on `lean_neck_w` (`eliminates any horizontal mid-neck
                    # normal-map cut-off line across `M000-F000`'s SCM/cervical spine!), and `28 mm / 56 mm` ray range on `ad_nape_w`
                    # so `M050-F100`'s horizontal posterior occipital/nape fat rolls bake cleanly onto `headSkin`:
                    col_fade_h_buf[h_cov] = smootherstep((d_col_h_cov - 0.016) / 0.042)
                    head_nape_ao = np.ones((h_n, half_w), dtype=np.float32)

                    hy_i, hx_i = np.nonzero(h_cov)
                    for py_i, px_i in zip(hy_i.tolist(), hx_i.tolist()):
                        pq_h = hp_buf[py_i, px_i]
                        w_lean_nk = (
                            0.52
                            * float(smootherstep(np.array([(pq_h[2] - 1.690) / 0.032]))[0])
                            * float(1.0 - smootherstep(np.array([(pq_h[2] - 1.715) / 0.078]))[0])
                            * float(col_fade_h_buf[py_i, px_i])
                            * lean_neck_w
                        )
                        w_ad_nape = (
                            0.95
                            * ad_nape_w
                            * float(smootherstep(np.array([(pq_h[1] - 0.018) / 0.028]))[0])
                            * float(smootherstep(np.array([(pq_h[2] - 1.678) / 0.024]))[0])
                            * float(1.0 - smootherstep(np.array([(pq_h[2] - 1.842) / 0.028]))[0])
                            * float(1.0 - smootherstep(np.array([(abs(pq_h[0]) - 0.094) / 0.026]))[0])
                            * float(col_fade_h_buf[py_i, px_i])
                        )
                        w_z_nk = max(w_lean_nk, w_ad_nape)
                        if w_z_nk <= 0.015:
                            continue
                        nl_h = hn_buf[py_i, px_i]
                        nll = float(np.linalg.norm(nl_h))
                        if nll < 1e-8:
                            continue
                        nl_h /= nll
                        tl_h = ht_buf[py_i, px_i] / max(float(np.linalg.norm(ht_buf[py_i, px_i])), 1e-8)
                        bl_h = hb_buf[py_i, px_i] / max(float(np.linalg.norm(hb_buf[py_i, px_i])), 1e-8)
                        ray_back = 0.028 if w_ad_nape > w_lean_nk else 0.014
                        dh_pt, _, df_i, _ = dh_bvh.ray_cast(Vector((pq_h - ray_back * nl_h).tolist()), Vector(nl_h.tolist()), 2.0 * ray_back)
                        if dh_pt is not None and df_i is not None:
                            ia, ib, ic = int(dh_tri[df_i, 0]), int(dh_tri[df_i, 1]), int(dh_tri[df_i, 2])
                            nd_h = (dh_vn[ia] + dh_vn[ib] + dh_vn[ic]) / 3.0
                            ndl = float(np.linalg.norm(nd_h))
                            if ndl > 1e-8:
                                nd_h /= ndl
                                min_dot_h = 0.45 if w_ad_nape > w_lean_nk else 0.78
                                max_t_h = 0.70 if w_ad_nape > w_lean_nk else 0.34
                                if float(nd_h @ nl_h) > min_dot_h:
                                    if w_ad_nape > w_lean_nk:
                                        nb_h = nl_h + (1.85 * w_z_nk) * (nd_h - nl_h)
                                    else:
                                        nb_h = (1.0 - w_z_nk) * nl_h + w_z_nk * nd_h
                                    nb_h /= max(float(np.linalg.norm(nb_h)), 1e-8)
                                    tx_h = float(np.clip(nb_h @ tl_h, -max_t_h, max_t_h))
                                    ty_h = float(np.clip(nb_h @ bl_h, -max_t_h, max_t_h))
                                    tz_h = float(max(nb_h @ nl_h, 0.65 if w_ad_nape > w_lean_nk else 0.72))
                                    tn_h = float(np.sqrt(tx_h * tx_h + ty_h * ty_h + tz_h * tz_h))
                                    head_macro_clean[py_i, px_i] = np.array(
                                        [0.5 + 0.5 * tx_h / tn_h, 0.5 + 0.5 * ty_h / tn_h, 0.5 + 0.5 * tz_h / tn_h],
                                        dtype=np.float32,
                                    )
                                    if w_ad_nape > 0.05:
                                        sd_np = float(np.dot(np.asarray(dh_pt, dtype=np.float64) - pq_h, nl_h))
                                        dnz_crease = max(0.0, float(nd_h[2] - nl_h[2]))
                                        fold_ao = np.clip(1.0 + 38.0 * min(sd_np, 0.0) - 0.20 * dnz_crease * w_ad_nape, 0.80, 1.0)
                                        head_nape_ao[py_i, px_i] = float(fold_ao)
            macro_atlas[:, :half_w, :] = head_macro_clean

        # Smoothly taper `macro_atlas` AND suppress UV-edge micro-delta across a wide `56 px` collar-seam band toward `neutral_n`
        # (`unified vertex normals`, using true mesh boundary UV segments with zero hard step discontinuity; on `ad_nape_w > 0.2`,
        # `headSkin` uses `28 px` inward width so `lower_nape_roll` at `49..93 px` is preserved above `col_fade_h_buf`!):
        w_seam_tot = np.zeros((h_n, w_n), dtype=np.float32)
        for is_head_seg, (seg_a_s, seg_b_s, seg_in_s) in enumerate(((b_seg_a, b_seg_b, b_seg_in), (h_seg_a, h_seg_b, h_seg_in))):
            d_px, sgn_in, _ = _eval_seam_band_field(w_n, h_n, seg_a_s, seg_b_s, seg_in_s)
            in_fade_px = 28.0 if (is_head_seg == 1 and ad_nape_w > 0.20) else 88.0
            w_fn = np.where(
                sgn_in < 0.0,
                1.0 - smootherstep(d_px / 28.0),
                1.0 - smootherstep(d_px / in_fade_px),
            ).astype(np.float32)
            w_seam_tot = np.maximum(w_seam_tot, w_fn)
            macro_atlas = (1.0 - w_fn[:, :, None]) * macro_atlas + w_fn[:, :, None] * neutral_n
        micro_seam_keep = 1.0 - 0.95 * np.clip(w_seam_tot * 1.30, 0.0, 1.0)[:, :, None]
        pn[:, :, :3] = np.clip(macro_atlas + (0.85 * micro_seam_keep) * full_micro_delta, 0.02, 0.98)
        vec_n = pn[:, :, :3] * 2.0 - 1.0
        vec_n /= np.maximum(np.linalg.norm(vec_n, axis=2, keepdims=True), 1e-8)
        pn[:, :, :3] = (vec_n + 1.0) * 0.5
        _replace_material_packed_image("skin", nrm_img, "skin-normal-welded", pn, is_normal=True)

    # 2) `skin-color`:
    #    - Harmonize global `bodySkin` (`U >= 0.5`) RGB tone to match `headSkin`'s warm neck tone while keeping 100% of
    #      real fingernails, palms, soles, areolae, and navel!
    #    - Add subtle physiological skin micro-grain on `U >= 0.5` matching `headSkin`'s pore grain, plus collar-seam welding!
    col_img = bpy.data.images.get("skin-color")
    if col_img is not None:
        w_c, h_c = col_img.size
        pc = np.empty(w_c * h_c * 4, dtype=np.float32)
        col_img.pixels.foreach_get(pc)
        pc = pc.reshape(h_c, w_c, 4)
        half_wc = w_c // 2

        n_s = len(b_seam_uv)
        b_samples = np.zeros((n_s, 3), dtype=np.float64)
        h_samples = np.zeros((n_s, 3), dtype=np.float64)
        for k in range(n_s):
            bp = b_seam_uv[k] * np.array([w_c, h_c]) + 10.0 * b_in_dir[k]
            hp = h_seam_uv[k] * np.array([w_c, h_c]) + 10.0 * h_in_dir[k]
            xb, yb = int(np.clip(bp[0], 0, w_c - 1)), int(np.clip(bp[1], 0, h_c - 1))
            xh, yh = int(np.clip(hp[0], 0, w_c - 1)), int(np.clip(hp[1], 0, h_c - 1))
            b_samples[k] = pc[yb, xb, :3].astype(np.float64)
            h_samples[k] = pc[yh, xh, :3].astype(np.float64)

        # Match overall `bodySkin` (`U >= 0.5`) chrominance & value to `headSkin`'s neck tone so head and torso share one cohesive skin tone:
        rgb_gain = np.clip(np.median(h_samples, axis=0) / np.maximum(np.median(b_samples, axis=0), 1e-4), 0.78, 1.26).astype(np.float32)
        pc[:, half_wc:, :3] = np.clip(pc[:, half_wc:, :3] * rgb_gain[None, None, :], 0.0, 1.0)
        if sulcus_ao_map is not None and sulcus_ao_map.shape == (h_c, w_c - half_wc):
            pc[:, half_wc:, :3] = np.clip(pc[:, half_wc:, :3] * sulcus_ao_map[:, :, None], 0.0, 1.0)
        if "head_nape_ao" in locals() and head_nape_ao is not None and head_nape_ao.shape == (h_c, half_wc):
            pc[:, :half_wc, :3] = np.clip(pc[:, :half_wc, :3] * head_nape_ao[:, :, None], 0.0, 1.0)
        # Render shared, build-independent natural warm rose-umber areola + papilla pigment at the canonical `skin-color` UV nipple
        # centers (`so 3D papilla relief, normal map, and areola color stay 0.00 mm locked across all 5 builds and every slider blend`):
        nip_uv_col, _ = _canonical_body_nipple_uv_centers(fam)
        for u_nc, v_nc in nip_uv_col:
            cx_nc = u_nc * float(w_c)
            cy_nc = v_nc * float(h_c)
            x0_nc = max(half_wc, int(np.floor(cx_nc - 22.0)))
            x1_nc = min(w_c - 1, int(np.ceil(cx_nc + 22.0)))
            y0_nc = max(0, int(np.floor(cy_nc - 22.0)))
            y1_nc = min(h_c - 1, int(np.ceil(cy_nc + 22.0)))
            if x1_nc < x0_nc or y1_nc < y0_nc:
                continue
            gx_c, gy_c = np.meshgrid(
                np.arange(x0_nc, x1_nc + 1, dtype=np.float64) + 0.5,
                np.arange(y0_nc, y1_nc + 1, dtype=np.float64) + 0.5,
            )
            r_px = np.hypot(gx_c - cx_nc, gy_c - cy_nc)
            w_ar = (1.0 - smootherstep((r_px - 8.5) / 8.0)).astype(np.float32)
            w_pp = np.exp(-0.5 * ((r_px / 3.8) ** 2)).astype(np.float32)
            mul_rgb = (
                1.0
                - w_ar[:, :, None] * np.array([0.17, 0.28, 0.32], dtype=np.float32)[None, None, :]
                - w_pp[:, :, None] * np.array([0.16, 0.23, 0.25], dtype=np.float32)[None, None, :]
            )
            pc[y0_nc : y1_nc + 1, x0_nc : x1_nc + 1, :3] = np.clip(
                pc[y0_nc : y1_nc + 1, x0_nc : x1_nc + 1, :3] * mul_rgb, 0.0, 1.0
            )

        # Add subtle epidermal melanin/hemoglobin micro-grain (`±0.0075`) across `bodySkin` matching `headSkin` texture richness:
        rng_skin = np.random.default_rng(20261117)
        fine_grain = rng_skin.standard_normal((h_c // 2, (w_c - half_wc) // 2, 3)).astype(np.float32)
        fine_grain = _box_blur_rgb(fine_grain, radius=1, passes=1)
        fine_up = np.repeat(np.repeat(fine_grain, 2, axis=0), 2, axis=1)[:h_c, : (w_c - half_wc)]
        grain_tint = fine_up[:, :, 0:1] * np.array([0.0085, 0.0062, 0.0052], dtype=np.float32)[None, None, :]
        pc[:, half_wc:, :3] = np.clip(pc[:, half_wc:, :3] + grain_tint, 0.0, 1.0)

        pair_rgb = np.zeros((n_s, 3), dtype=np.float64)
        for k in range(n_s):
            bp = b_seam_uv[k] * np.array([w_c, h_c]) + 14.0 * b_in_dir[k]
            hp = h_seam_uv[k] * np.array([w_c, h_c]) + 14.0 * h_in_dir[k]
            xb, yb = int(np.clip(bp[0], 0, w_c - 1)), int(np.clip(bp[1], 0, h_c - 1))
            xh, yh = int(np.clip(hp[0], 0, w_c - 1)), int(np.clip(hp[1], 0, h_c - 1))
            pair_rgb[k] = 0.5 * (pc[yb, xb, :3].astype(np.float64) + pc[yh, xh, :3].astype(np.float64))
        for _ in range(8):
            pair_rgb = 0.25 * np.roll(pair_rgb, -1, axis=0) + 0.50 * pair_rgb + 0.25 * np.roll(pair_rgb, 1, axis=0)

        for seg_a_s, seg_b_s, seg_in_s, p_uv_s in (
            (b_seg_a, b_seg_b, b_seg_in, b_seam_uv),
            (h_seg_a, h_seg_b, h_seg_in, h_seam_uv),
        ):
            d_px, sgn_in, k_f = _eval_seam_band_field(w_c, h_c, seg_a_s, seg_b_s, seg_in_s, pair_uv=p_uv_s)
            act = d_px <= 90.0
            if np.any(act):
                k0 = np.round(k_f[act]).astype(np.int64) % n_s
                tgt_c = pair_rgb[k0].astype(np.float32)
                w_cb = np.where(
                    sgn_in[act] < 0.0,
                    1.0 - smootherstep(d_px[act] / 26.0),
                    1.0 - smootherstep(d_px[act] / 86.0),
                ).astype(np.float32)[:, None]
                pc[act, :3] = (1.0 - w_cb) * pc[act, :3] + w_cb * tgt_c
        _replace_material_packed_image("skin", col_img, "skin-color-welded", pc, is_normal=False)
    if "skin" in materials:
        bs_skin = materials["skin"].node_tree.nodes.get("Principled BSDF")
        if bs_skin is not None:
            # Physiological athletic skin roughness (`0.48` vs chalky `0.62`) + human epidermal Specular IOR (`0.30` -> IOR ~1.39,
            # preventing plastic-white grazing Schlick-Fresnel rim glare while keeping crisp striation highlights):
            bs_skin.inputs["Roughness"].default_value = float(0.48 + 0.10 * np.clip(adipose_gate * 2.0, 0.0, 1.0))
            if "Specular IOR Level" in bs_skin.inputs:
                bs_skin.inputs["Specular IOR Level"].default_value = 0.30

    # 3) `eyes-color`: Keep the crisp natural grey-green iris un-crushed while gently warming/cleaning the visible sclera ring!
    eyes_img = bpy.data.images.get("eyes-color")
    if eyes_img is not None:
        w_e, h_e = eyes_img.size
        pe = np.empty(w_e * h_e * 4, dtype=np.float32)
        eyes_img.pixels.foreach_get(pe)
        pe = pe.reshape(h_e, w_e, 4)
        ue = (np.arange(w_e, dtype=np.float32) + 0.5) / w_e - 0.5
        ve = (np.arange(h_e, dtype=np.float32) + 0.5) / h_e - 0.5
        re = np.hypot(ue[None, :], ve[:, None])
        sclera_ring = smootherstep((re - 0.168) / 0.025).astype(np.float32) * (
            1.0 - smootherstep((re - 0.34) / 0.08).astype(np.float32)
        )
        clean_sclera = np.clip(0.68 * pe[:, :, :3] + 0.32 * np.array([0.82, 0.79, 0.76], dtype=np.float32), 0.0, 1.0)
        pe[:, :, :3] = (1.0 - 0.55 * sclera_ring[:, :, None]) * pe[:, :, :3] + (0.55 * sclera_ring[:, :, None]) * clean_sclera
        _replace_material_packed_image("eyes", eyes_img, "eyes-color-toned", pe, is_normal=False)
    if "eyes" in materials:
        bs_eye = materials["eyes"].node_tree.nodes.get("Principled BSDF")
        if bs_eye is not None:
            bs_eye.inputs["Roughness"].default_value = 0.22

    # 4) Bake a crisp 512x512 warm unbleached woven-linen albedo + stitched waistband/leg-hem normal texture onto `undyedLinen`:
    if "undyedLinen" in materials:
        mat_l = materials["undyedLinen"]
        nodes = mat_l.node_tree.nodes
        links = mat_l.node_tree.links
        bs_l = nodes.get("Principled BSDF")
        if bs_l is not None:
            sz = 512
            yy, xx = np.mgrid[0:sz, 0:sz].astype(np.float32)
            vv_l = (yy + 0.5) / float(sz)  # 0.0 = leg-opening hem -> 1.0 = top V-waistband hem
            # Plain-weave warp/weft linen thread modulation (`tileable in X`):
            warp = np.sin(2.0 * np.pi * xx / 8.0)
            weft = np.sin(2.0 * np.pi * yy / 12.0)
            slub = 0.5 * np.sin(2.0 * np.pi * xx / 53.0) + 0.5 * np.cos(2.0 * np.pi * yy / 67.0)
            weave = 0.020 * warp * weft + 0.012 * slub

            # Tailored medieval plain-weave oatmeal linen with crisp `3%` (`~7 mm`) ribbed waistband & leg-opening hem trim right on the
            # actual garment edges (`NEVER at `vv = 0.082` = `23 mm` inside the panel, so ZERO ghost "brief-inside-a-brief" outline forms!):
            in_wb = smootherstep((vv_l - 0.962) / 0.016).astype(np.float32)
            in_leg_hem = (1.0 - smootherstep((vv_l - 0.030) / 0.016)).astype(np.float32)
            hem_band = np.clip(in_wb + in_leg_hem, 0.0, 1.0)
            rib_wb = 0.014 * np.sin(2.0 * np.pi * xx / 4.0) * hem_band

            base_srgb = np.array([0.772, 0.724, 0.640], dtype=np.float32)
            rgb_l = np.clip(
                base_srgb[None, None, :] + (1.35 * weave + 0.85 * rib_wb - 0.018 * hem_band)[:, :, None],
                0.0,
                1.0,
            )
            rgba_l = np.concatenate([rgb_l, np.ones((sz, sz, 1), dtype=np.float32)], axis=2)

            im_lc = bpy.data.images.new("undyedLinen-color", width=sz, height=sz, alpha=True)
            im_lc.colorspace_settings.name = "sRGB"
            im_lc.pixels.foreach_set(rgba_l.reshape(-1))
            im_lc.update()
            im_lc.filepath_raw = str(tmp_tex / "undyedLinen-color.png")
            im_lc.file_format = "PNG"
            im_lc.save()
            im_lc.pack()

            # Crisp plain-weave thread + `3%`-edge hem-rib micro-normal (`0.0` interior step ridge!):
            h_field = 0.56 * weave + 0.22 * rib_wb + 0.010 * hem_band
            dh_dx = 0.5 * (np.roll(h_field, -1, axis=1) - np.roll(h_field, 1, axis=1))
            dh_dy = np.zeros_like(h_field)
            dh_dy[1:-1, :] = 0.5 * (h_field[2:, :] - h_field[:-2, :])
            nx_l = np.clip(-8.0 * dh_dx, -0.28, 0.28)
            ny_l = np.clip(-8.0 * dh_dy, -0.28, 0.28)
            nz_l = np.sqrt(np.maximum(1.0 - nx_l * nx_l - ny_l * ny_l, 0.2))
            nrm_l = np.stack([0.5 + 0.5 * nx_l, 0.5 + 0.5 * ny_l, 0.5 + 0.5 * nz_l, np.ones_like(nx_l)], axis=2)
            im_ln = bpy.data.images.new("undyedLinen-normal", width=sz, height=sz, alpha=True)
            im_ln.colorspace_settings.name = "Non-Color"
            im_ln.pixels.foreach_set(nrm_l.reshape(-1))
            im_ln.update()
            im_ln.filepath_raw = str(tmp_tex / "undyedLinen-normal.png")
            im_ln.file_format = "PNG"
            im_ln.save()
            im_ln.pack()

            bs_l.inputs["Roughness"].default_value = 0.94
            tex_c = nodes.new("ShaderNodeTexImage")
            tex_c.image = im_lc
            links.new(tex_c.outputs["Color"], bs_l.inputs["Base Color"])
            tex_n = nodes.new("ShaderNodeTexImage")
            tex_n.image = im_ln
            nmap = nodes.new("ShaderNodeNormalMap")
            links.new(tex_n.outputs["Color"], nmap.inputs["Color"])
            links.new(nmap.outputs["Normal"], bs_l.inputs["Normal"])


def _rebind_and_dynamic_clear_linen_briefs(
    fam: dict,
    evaluated: dict,
    body_fit_bl: np.ndarray,
    draped_briefs_bl: np.ndarray,
    motion: list[dict],
    dense_body_bl: np.ndarray | None = None,
    dense_tri: np.ndarray | None = None,
    is_ext_full_wb: bool = False,
    donor_shifted_bl: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
) -> None:
    """Clear `linenBriefs` cleanly in Rest pose (`0` overlaps, `0` self-intersections, zero standing leg-hem inflation)
    and transfer smooth `±X`-symmetric 4-bone skin weights directly from `bodySkin` via `ol_people.surface_skin_weights`.
    """
    from linen_briefs import _symmetrize_brief_pts, linen_briefs_mirror_map

    _ = (motion, is_ext_full_wb, donor_shifted_bl, donor_tri)
    body_mesh = fam["meshes"]["bodySkin"]
    sh_mesh = fam["meshes"]["linenBriefs"]
    low_tri = np.asarray(body_mesh["triangles"], dtype=np.int64).reshape(-1, 3)
    sh_tri = np.asarray(sh_mesh["triangles"], dtype=np.int64).reshape(-1, 3)
    n_bv = len(body_fit_bl)
    n_gv = len(draped_briefs_bl)

    src_v_idx = np.asarray(body_mesh["sourceVertexIndices"], dtype=np.int64)
    r_j_idx = np.asarray(body_mesh["jointIndices"], dtype=np.int64).reshape(-1, 4)
    r_j_wt = np.asarray(body_mesh["jointWeights"], dtype=np.float64).reshape(-1, 4)
    body_src_weights: list[dict[int, float]] = [{} for _ in range(n_bv)]
    seen_src = np.zeros(n_bv, dtype=bool)
    for r_row, sv in enumerate(src_v_idx):
        sv_i = int(sv)
        if not seen_src[sv_i]:
            seen_src[sv_i] = True
            body_src_weights[sv_i] = {
                int(j): float(w) for j, w in zip(r_j_idx[r_row], r_j_wt[r_row]) if w > 0.0
            }

    all_adj: list[set[int]] = [set() for _ in range(n_gv)]
    for a, b, c_i in sh_tri:
        ia, ib, ic = int(a), int(b), int(c_i)
        for u, v in ((ia, ib), (ib, ic), (ic, ia)):
            all_adj[u].add(v)
            all_adj[v].add(u)
    diag_edges: set[tuple[int, int]] = set()
    for q_i in range(0, len(sh_tri) - 1, 2):
        sh = sorted({int(v) for v in sh_tri[q_i]} & {int(v) for v in sh_tri[q_i + 1]})
        if len(sh) == 2:
            diag_edges.add((sh[0], sh[1]))
    quad_adj: list[list[int]] = [
        [nb for nb in all_adj[i] if (min(i, nb), max(i, nb)) not in diag_edges] or list(all_adj[i])
        for i in range(n_gv)
    ]

    mid_g, mir_g = linen_briefs_mirror_map(n_gv, draped_briefs_bl)
    sgn_g = np.where(mid_g, 0.0, np.where(draped_briefs_bl[:, 0] >= 0.0, 1.0, -1.0))
    cur_br_bl = _symmetrize_brief_pts(draped_briefs_bl, mid_g, mir_g, sgn_g, min_x=0.0025)

    # Rest-pose outward clearance ONLY against exported `body_fit_bl` (`zero standing leg-hem inflation, zero stacked passes`):
    _ = (dense_body_bl, dense_tri)
    cur_br_bl = clear_briefs_against_dense_body(cur_br_bl, sh_tri, body_fit_bl, low_tri)

    final_gltf_f32 = blender_to_gltf(cur_br_bl).astype(np.float32).reshape(-1)
    fitted_body_entry = {
        **body_mesh,
        "positions": blender_to_gltf(body_fit_bl).astype(np.float32).reshape(-1).tolist(),
    }
    final_bind = ol_people.bind_surface(fitted_body_entry, "bodySkin", final_gltf_f32)
    raw_sw = ol_people.surface_skin_weights(final_bind, body_src_weights)

    joints = fam["rig"]["joints"]
    jnames = [j["id"] if isinstance(j, dict) else j for j in joints]
    nj = len(jnames)
    j_idx = {name: i for i, name in enumerate(jnames)}
    j_mir = np.arange(nj, dtype=np.int64)
    for name, idx in j_idx.items():
        if name.endswith("_l") and (name[:-2] + "_r") in j_idx:
            j_mir[idx] = j_idx[name[:-2] + "_r"]
        elif name.endswith("_r") and (name[:-2] + "_l") in j_idx:
            j_mir[idx] = j_idx[name[:-2] + "_l"]

    W_g = np.zeros((n_gv, nj), dtype=np.float64)
    for vi, w_map in enumerate(raw_sw):
        for j_k, w_v in w_map.items():
            if w_v > 0.0:
                W_g[vi, int(j_k)] += float(w_v)
    W_g /= np.maximum(W_g.sum(axis=1, keepdims=True), 1e-12)

    # Remap ONLY stray `spine_*` overhang bleed on the lower front cup onto `pelvis` (`leaving `thigh_l/r` & glutes 1:1`):
    pel_i = j_idx.get("pelvis", -1)
    sp_cols = [j_idx[nm] for nm in ("spine_01", "spine_02", "spine_03", "spine_04", "spine_05") if nm in j_idx]
    if pel_i >= 0 and sp_cols:
        m_fmid = (np.abs(cur_br_bl[:, 0]) <= 0.015) & (cur_br_bl[:, 1] < -0.04)
        z_f_top_s = float(np.max(cur_br_bl[m_fmid, 2])) if np.any(m_fmid) else 1.12
        low_cup_m = (cur_br_bl[:, 1] < -0.04) & (cur_br_bl[:, 2] <= z_f_top_s - 0.020)
        if np.any(low_cup_m):
            sp_sum = W_g[low_cup_m][:, sp_cols].sum(axis=1)
            for sc in sp_cols:
                W_g[low_cup_m, sc] = 0.0
            W_g[low_cup_m, pel_i] += sp_sum

    # Enforce `±X` symmetry + 4 light quad-grid smoothing passes so adjacent garment triangles deform smoothly:
    W_g = 0.5 * (W_g + W_g[mir_g][:, j_mir])
    for _ in range(4):
        W_nxt = W_g.copy()
        for vi in range(n_gv):
            if quad_adj[vi]:
                W_nxt[vi] = 0.68 * W_g[vi] + 0.32 * W_g[quad_adj[vi]].mean(axis=0)
        W_g = 0.5 * (W_nxt + W_nxt[mir_g][:, j_mir])
    W_g /= np.maximum(W_g.sum(axis=1, keepdims=True), 1e-12)

    f_ji = np.zeros((n_gv, 4), dtype=np.int64)
    f_jw = np.zeros((n_gv, 4), dtype=np.float64)
    for vi in range(n_gv):
        if mid_g[vi]:
            w_row = W_g[vi]
            centrals = sorted(
                [(j, float(w_row[j])) for j in range(nj) if j_mir[j] == j and w_row[j] > 1e-5],
                key=lambda x: -x[1],
            )
            pairs = sorted(
                [
                    (j, int(j_mir[j]), float(w_row[j] + w_row[j_mir[j]]))
                    for j in range(nj)
                    if j < j_mir[j] and (w_row[j] + w_row[j_mir[j]]) > 1e-5
                ],
                key=lambda x: -x[2],
            )
            chosen: list[tuple[int, float]] = []
            if pairs and pairs[0][2] >= 1e-4:
                chosen.extend([(pairs[0][0], 0.5 * pairs[0][2]), (pairs[0][1], 0.5 * pairs[0][2])])
                chosen.extend(centrals[:2])
            else:
                chosen.extend(centrals[:4])
            tot = sum(w for _, w in chosen)
            for k, (jk, wk) in enumerate(chosen[:4]):
                f_ji[vi, k] = jk
                f_jw[vi, k] = wk / max(tot, 1e-12)
        elif cur_br_bl[vi, 0] >= 0.0:
            top4 = np.argsort(-W_g[vi])[:4]
            ws = np.where(W_g[vi, top4] > 1e-5, W_g[vi, top4], 0.0)
            s_w = float(ws.sum())
            f_ji[vi] = np.where(ws > 0.0, top4, 0)
            f_jw[vi] = (ws / s_w) if s_w > 0.0 else np.array([1.0, 0.0, 0.0, 0.0])
    for vi in range(n_gv):
        if not mid_g[vi] and cur_br_bl[vi, 0] < 0.0:
            mi = int(mir_g[vi])
            f_ji[vi] = j_mir[f_ji[mi]]
            f_jw[vi] = f_jw[mi]

    sh_mesh["positions"] = final_gltf_f32.tolist()
    sh_mesh["jointIndices"] = f_ji.reshape(-1).tolist()
    sh_mesh["jointWeights"] = f_jw.reshape(-1).tolist()
    fam["parts"]["linenBriefs"]["pieces"][0]["fit"] = final_bind
    ol_people.fit_parts(fam, evaluated, parts=(), variants=None)


def _condition_bodyskin_abdominal_weights(
    fam: dict,
    rest_low_fit_bl: np.ndarray,
    is_ext_full_wb: bool = False,
    gh_pivot_bl: tuple[float, float, float] | None = None,
    sole_min_z: float = 0.0,
) -> None:
    """Clean & symmetrize `bodySkin` 4-joint LBS weights inside the abdominal/pelvic trunk (`|rx| <= 0.235m, rz in [1.02, 1.47]m`):
    - Eliminates upstream 4-bone truncation ties across the navel (`where adjacent X=0 vertices previously alternated between
      7.6% thigh_l and 9.6% thigh_r, folding navel triangles inside-out into a sharp beak during Run strides`).
    - Smoothly transfers stray `thigh_l` / `thigh_r` bleed above the inguinal/waistband crease (`rz >= 1.102m` at midline) onto
      `pelvis` / `spine_01` / `spine_02`, while keeping 100% natural symmetric thigh follow inside the groin/thigh gusset (`for Deep Squat`).
    - Gently diffuses trunk `pelvis`/`spine_01..03` weights across protruding abdominal/flank soft tissue (`scaled with radial protrusion`)
      while leaving 100% of arms, hands, shoulders, collar seam, knees, calves, and sole probes bit-for-bit untouched.
    """
    bs = fam["meshes"]["bodySkin"]
    jlist = fam["rig"]["joints"]
    jnames = [j["id"] if isinstance(j, dict) else j for j in jlist]
    nj = len(jnames)
    j_idx = {name: i for i, name in enumerate(jnames)}

    j_mir = np.arange(nj, dtype=np.int64)
    for name, idx in j_idx.items():
        if name.endswith("_l") and (name[:-2] + "_r") in j_idx:
            j_mir[idx] = j_idx[name[:-2] + "_r"]
        elif name.endswith("_r") and (name[:-2] + "_l") in j_idx:
            j_mir[idx] = j_idx[name[:-2] + "_l"]

    ref_bl = gltf_to_blender(np.asarray(bs["positions"], dtype=np.float64).reshape(-1, 3))
    src_idx = np.asarray(bs["sourceVertexIndices"], dtype=np.int64)
    r_tri = np.asarray(bs["renderTriangles"], dtype=np.int64).reshape(-1, 3)
    ji_raw = np.asarray(bs["jointIndices"], dtype=np.int64).reshape(-1, 4)
    jw_raw = np.asarray(bs["jointWeights"], dtype=np.float64).reshape(-1, 4)
    seam_body = set(int(v) for v in fam["seams"][0]["bodyVertices"])

    n_sv = len(ref_bl)
    n_rv = len(src_idx)
    s_conn = weld_connectivity(ref_bl, src_idx[r_tri], decimals=5)
    s_weld, (s_es, s_ed), s_mult, s_deg = s_conn
    n_su = len(s_mult)
    first_sv = np.zeros(n_su, dtype=np.int64)
    first_sv[s_weld[::-1]] = np.arange(n_sv - 1, -1, -1)
    ru = ref_bl[first_sv]
    fu = rest_low_fit_bl[first_sv]
    seam_u = np.zeros(n_su, dtype=bool)
    for sv in seam_body:
        seam_u[s_weld[sv]] = True

    W = np.zeros((n_su, nj), dtype=np.float64)
    cnt_u = np.zeros(n_su, dtype=np.float64)
    for rv in range(n_rv):
        ui = int(s_weld[src_idx[rv]])
        for k in range(4):
            wt = float(jw_raw[rv, k])
            if wt > 0.0:
                W[ui, int(ji_raw[rv, k])] += wt
        cnt_u[ui] += 1.0
    W /= np.maximum(cnt_u[:, None], 1.0)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-12)

    rx, ry, rz = ru[:, 0], ru[:, 1], ru[:, 2]
    ax = np.abs(rx)
    in_pelvis_abd_zone = (~seam_u) & (ax <= 0.235) & (rz >= 1.020) & (rz <= 1.470)

    kd = KDTree(n_su)
    for ui, pt in enumerate(ru):
        kd.insert(pt.tolist(), ui)
    kd.balance()

    mir_u = np.full(n_su, -1, dtype=np.int64)
    mid_u = ax <= 3.5e-4
    for ui in np.flatnonzero(in_pelvis_abd_zone):
        if mid_u[ui]:
            mir_u[ui] = ui
        else:
            _, mi, md = kd.find((-float(ru[ui, 0]), float(ru[ui, 1]), float(ru[ui, 2])))
            if mi is not None and md < 2.5e-3 and int(mi) != ui and in_pelvis_abd_zone[int(mi)]:
                mir_u[ui] = int(mi)

    W_sym = W.copy()
    for ui in np.flatnonzero(in_pelvis_abd_zone):
        mi = int(mir_u[ui])
        if mi >= 0:
            W_sym[ui] = 0.5 * (W[ui] + W[mi, j_mir])
    W = W_sym / np.maximum(W_sym.sum(axis=1, keepdims=True), 1e-12)

    tl_i, tr_i = j_idx["thigh_l"], j_idx["thigh_r"]
    pel_i, sp1_i, sp2_i, sp3_i = j_idx["pelvis"], j_idx["spine_01"], j_idx["spine_02"], j_idx["spine_03"]

    s_post = smootherstep((ry - 0.005) / 0.055)
    z_ing_front = 1.050 + 0.06 * np.clip(ax, 0.0, 0.165)
    # Anchor the lateral & posterior iliac waistband (`rz >= 1.102..1.158 m`) cleanly to `pelvis` on `bodySkin` itself so 80-deg
    # `Deep Squat` keeps a flat horizontal sacral & lateral hip strap (`zero upside-down hip-strap fold!`) AND `linenBriefs` shares
    # `bodySkin`'s exact weights (`0` Twist poke-through!):
    z_ing_back = 1.096 + 0.04 * np.clip(ax, 0.0, 0.165)
    z_ing = (1.0 - s_post) * z_ing_front + s_post * z_ing_back
    z_ing_ramp = (1.0 - s_post) * 0.052 + s_post * 0.048
    in_trunk = 1.0 - smootherstep((ax - 0.228) / 0.022)
    # Gentle, wide (`ax <= 0.088 m`) upper-pubic `pelvis` support above `rz >= 1.048 m` (`completely clear of sub-crotch inner-thigh
    # walls AND wide enough across the hip crease that 84-deg Deep Squat flexes the front brief harmoniously without weight ridges!`):
    ant_pouch_pelvis = (
        0.18
        * smootherstep((-ry - 0.068) / 0.024)
        * smootherstep((rz - 1.048) / 0.020)
        * (1.0 - smootherstep((rz - 1.105) / 0.025))
        * (1.0 - smootherstep((ax - 0.088) / 0.028))
    )
    thigh_transfer = np.clip(
        np.maximum(in_trunk * smootherstep((rz - z_ing) / z_ing_ramp), ant_pouch_pelvis) * np.where(in_pelvis_abd_zone, 1.0, 0.0),
        0.0,
        1.0,
    )

    w_th_tot = (W[:, tl_i] + W[:, tr_i]) * thigh_transfer
    W[:, tl_i] *= 1.0 - thigh_transfer
    W[:, tr_i] *= 1.0 - thigh_transfer

    s_sp1 = smootherstep((rz - 1.155) / 0.085)
    s_sp2 = smootherstep((rz - 1.235) / 0.085)
    w_to_sp2 = 0.48 * s_sp2
    w_to_sp1 = 0.46 * s_sp1 * (1.0 - 0.55 * s_sp2)
    w_to_pel = 1.0 - w_to_sp1 - w_to_sp2
    W[:, pel_i] += w_th_tot * w_to_pel
    W[:, sp1_i] += w_th_tot * w_to_sp1
    W[:, sp2_i] += w_th_tot * w_to_sp2

    protrusion_m = np.clip(np.hypot(fu[:, 0], fu[:, 1]) - np.hypot(ru[:, 0], ru[:, 1]), 0.0, 0.22)
    abd_band = (
        in_trunk
        * smootherstep((rz - 1.075) / 0.045)
        * (1.0 - smootherstep((rz - 1.445) / 0.055))
        * np.where(in_pelvis_abd_zone, 1.0, 0.0)
    )
    diff_w = abd_band * (0.36 + 0.54 * smootherstep((protrusion_m - 0.015) / 0.110))
    trunk_cols = [pel_i, sp1_i, sp2_i, sp3_i]
    s_deg_f = np.maximum(s_deg.astype(np.float64), 1.0)
    for _ in range(10):
        sub_w = W[:, trunk_cols].copy()
        nbr_w = np.column_stack(
            [np.bincount(s_es, weights=sub_w[s_ed, c], minlength=n_su) / s_deg_f for c in range(len(trunk_cols))]
        )
        orig_sum = sub_w.sum(axis=1, keepdims=True)
        mixed = (1.0 - 0.45 * diff_w[:, None]) * sub_w + (0.45 * diff_w[:, None]) * nbr_w
        mixed_sum = np.maximum(mixed.sum(axis=1, keepdims=True), 1e-12)
        upd = orig_sum[:, 0] > 1e-6
        for kc, jc in enumerate(trunk_cols):
            W[upd, jc] = mixed[upd, kc] * (orig_sum[upd, 0] / mixed_sum[upd, 0])

    W_post = W.copy()
    for ui in np.flatnonzero(in_pelvis_abd_zone):
        mi = int(mir_u[ui])
        if mi >= 0:
            W_post[ui] = 0.5 * (W[ui] + W[mi, j_mir])
    W = W_post / np.maximum(W_post.sum(axis=1, keepdims=True), 1e-12)

    out_ji_u = np.zeros((n_su, 4), dtype=np.int64)
    out_jw_u = np.zeros((n_su, 4), dtype=np.float64)
    central_parent_fallback = {sp3_i: sp2_i, sp2_i: sp1_i, sp1_i: pel_i}

    for ui in np.flatnonzero(in_pelvis_abd_zone):
        if mid_u[ui]:
            w_row = W[ui].copy()
            centrals = sorted(
                [(j, float(w_row[j])) for j in range(nj) if j_mir[j] == j and w_row[j] > 1e-5],
                key=lambda x: -x[1],
            )
            pairs = sorted(
                [
                    (j, int(j_mir[j]), float(w_row[j] + w_row[j_mir[j]]))
                    for j in range(nj)
                    if j < j_mir[j] and (w_row[j] + w_row[j_mir[j]]) > 1e-5
                ],
                key=lambda x: -x[2],
            )
            chosen: list[tuple[int, float]] = []
            if pairs and pairs[0][2] >= 1e-4:
                chosen.extend([(pairs[0][0], 0.5 * pairs[0][2]), (pairs[0][1], 0.5 * pairs[0][2])])
                if len(centrals) > 2:
                    c_keep = dict(centrals[:2])
                    for cj, cw in centrals[2:]:
                        tgt_c = central_parent_fallback.get(cj, centrals[0][0])
                        c_keep[tgt_c if tgt_c in c_keep else centrals[0][0]] += cw
                    chosen.extend(sorted(c_keep.items(), key=lambda x: -x[1]))
                else:
                    chosen.extend(centrals[:2])
            else:
                rem_pair_w = sum(ps for _, _, ps in pairs)
                c_map = dict(centrals)
                if rem_pair_w > 0.0:
                    tgt_p = pel_i if pel_i in c_map or rz[ui] < 1.38 else (centrals[0][0] if centrals else pel_i)
                    c_map[tgt_p] = c_map.get(tgt_p, 0.0) + rem_pair_w
                chosen = sorted(c_map.items(), key=lambda x: -x[1])[:4]
            tot = sum(w for _, w in chosen)
            for k, (ji_k, jw_k) in enumerate(chosen[:4]):
                out_ji_u[ui, k] = ji_k
                out_jw_u[ui, k] = jw_k / max(tot, 1e-12)
        elif ru[ui, 0] > 0.0 or mir_u[ui] < 0 or ru[int(mir_u[ui]), 0] <= 0.0:
            top4 = np.argsort(-W[ui])[:4]
            ws = np.where(W[ui, top4] > 1e-5, W[ui, top4], 0.0)
            s_w = float(ws.sum())
            out_ji_u[ui] = np.where(ws > 0.0, top4, 0)
            out_jw_u[ui] = (ws / s_w) if s_w > 0.0 else np.array([1.0, 0.0, 0.0, 0.0])

    for ui in np.flatnonzero(in_pelvis_abd_zone):
        if not mid_u[ui]:
            mi = int(mir_u[ui])
            if ru[ui, 0] < 0.0 and mi >= 0 and ru[mi, 0] > 0.0:
                out_ji_u[ui] = j_mir[out_ji_u[mi]]
                out_jw_u[ui] = out_jw_u[mi]

    new_ji = ji_raw.copy()
    new_jw = jw_raw.copy()
    for rv in range(n_rv):
        ui = int(s_weld[int(src_idx[rv])])
        if in_pelvis_abd_zone[ui]:
            new_ji[rv] = out_ji_u[ui]
            new_jw[rv] = out_jw_u[ui]

    # On thick `F = 100%` adipose builds (`sh_pad > 0.024 m`, `0.0` touch on `F = 0` lean builds!), also diffuse compressed
    # axillary/deltoid 4-joint weights with inverse-fitted-edge-length (`1 / |fu[u] - fu[v]|`) coupling (`leaving `seam_u`
    # 100% untouched!) so bunched axillary rings never overtake each other in `Idle` or `Overhead Reach`:
    sh_probe_m = (ax >= 0.165) & (ax <= 0.285) & (rz >= 1.560) & (rz <= 1.685)
    sh_pad = float(np.percentile(np.linalg.norm(fu[sh_probe_m] - ru[sh_probe_m], axis=1), 85)) if np.any(sh_probe_m) else 0.0
    if sh_pad > 0.024:
        in_sh_ax_zone = (~seam_u) & (ax >= (0.105 if is_ext_full_wb else 0.135)) & (ax <= 0.355) & (rz >= (1.385 if is_ext_full_wb else 1.435)) & (rz <= 1.720)
        sh_cols = [
            j_idx[nm]
            for nm in ("spine_03", "spine_04", "spine_05", "clavicle_l", "upperarm_l", "upperarm_pressure_l", "clavicle_r", "upperarm_r", "upperarm_pressure_r")
            if nm in j_idx
        ]
        W_sh = np.zeros((n_su, nj), dtype=np.float64)
        cnt_sh = np.zeros(n_su, dtype=np.float64)
        for rv in range(n_rv):
            ui = int(s_weld[int(src_idx[rv])])
            for k in range(4):
                wt = float(new_jw[rv, k])
                if wt > 0.0:
                    W_sh[ui, int(new_ji[rv, k])] += wt
            cnt_sh[ui] += 1.0
        W_sh /= np.maximum(cnt_sh[:, None], 1.0)
        W_sh /= np.maximum(W_sh.sum(axis=1, keepdims=True), 1e-12)
        elen_fu = 1.0 / np.maximum(np.linalg.norm(fu[s_es] - fu[s_ed], axis=1), 0.0025)
        deg_fu = np.maximum(np.bincount(s_es, weights=elen_fu, minlength=n_su), 1e-12)
        if is_ext_full_wb:
            # Kinematic glenohumeral pivot transfer (`eliminates BOTH the superior acromial V-notch collapse AND the drooping
            # medial pectoral/axillary bulge when `upperarm_l` abducts `-30 deg` in `Asymmetric Overhead Reach`):
            fu_sole = fu - np.array([0.0, 0.0, sole_min_z], dtype=np.float64)
            fu_ax = np.abs(fu_sole[:, 0])
            fu_z = fu_sole[:, 2]
            gh_x = abs(float(gh_pivot_bl[0])) if gh_pivot_bl is not None else 0.222
            gh_z = float(gh_pivot_bl[2]) if gh_pivot_bl is not None else 1.548
            dx_gh = fu_ax - gh_x
            dz_gh = fu_z - gh_z
            w_sup_gh = (
                0.78
                * smootherstep((sh_pad - 0.024) / 0.016)
                * smootherstep((dz_gh - 0.012) / 0.036)
                * (1.0 - smootherstep((dx_gh - 0.026) / 0.042))
                * smootherstep((fu_ax - 0.115) / 0.026)
                * np.where(in_sh_ax_zone, 1.0, 0.0)
            )
            w_med_gh = (
                0.82
                * smootherstep((sh_pad - 0.024) / 0.016)
                * (1.0 - smootherstep((dx_gh + 0.028) / 0.036))
                * smootherstep((fu_z - 1.385) / 0.036)
                * smootherstep((fu_ax - 0.105) / 0.025)
                * np.where(in_sh_ax_zone, 1.0, 0.0)
            )
            s_clv_med = smootherstep((dz_gh + 0.035) / 0.055)
            sp3_col = j_idx.get("spine_03", -1)
            for sgn_side, sfx in ((1.0, "_l"), (-1.0, "_r")):
                clv_c = j_idx.get(f"clavicle{sfx}", -1)
                arm_cs = [j_idx[nm] for nm in (f"upperarm{sfx}", f"upperarm_pressure{sfx}") if nm in j_idx]
                if clv_c < 0 or not arm_cs:
                    continue
                side_m = in_sh_ax_zone & ((ru[:, 0] * sgn_side) > 0.0)
                for ui in np.flatnonzero(side_m):
                    w_tr = max(float(w_sup_gh[ui]), float(w_med_gh[ui]))
                    if w_tr <= 0.005:
                        continue
                    arm_sum = float(W_sh[ui, arm_cs].sum())
                    if arm_sum <= 1e-6:
                        continue
                    W_sh[ui, arm_cs] *= 1.0 - w_tr
                    moved = w_tr * arm_sum
                    if float(w_sup_gh[ui]) >= float(w_med_gh[ui]) or sp3_col < 0:
                        W_sh[ui, clv_c] += moved
                    else:
                        sc = float(s_clv_med[ui])
                        W_sh[ui, clv_c] += sc * moved
                        W_sh[ui, sp3_col] += (1.0 - sc) * moved
            w_sh_ax = (
                smootherstep((sh_pad - 0.024) / 0.018)
                * smootherstep((dx_gh + 0.022) / 0.032)
                * (1.0 - smootherstep((ax - 0.325) / 0.032))
                * smootherstep((rz - 1.430) / 0.032)
                * np.where(in_sh_ax_zone, 1.0, 0.0)
            )
            for _ in range(8):
                sub_sh = W_sh[:, sh_cols].copy()
                nbr_sh = np.column_stack(
                    [np.bincount(s_es, weights=elen_fu * sub_sh[s_ed, c], minlength=n_su) / deg_fu for c in range(len(sh_cols))]
                )
                orig_sh_s = sub_sh.sum(axis=1, keepdims=True)
                mix_sh = (1.0 - 0.36 * w_sh_ax[:, None]) * sub_sh + (0.36 * w_sh_ax[:, None]) * nbr_sh
                mix_sh_s = np.maximum(mix_sh.sum(axis=1, keepdims=True), 1e-12)
                upd_sh = (orig_sh_s[:, 0] > 1e-6) & (w_sh_ax > 0.005)
                for kc, jc in enumerate(sh_cols):
                    W_sh[upd_sh, jc] = mix_sh[upd_sh, kc] * (orig_sh_s[upd_sh, 0] / mix_sh_s[upd_sh, 0])
            w_apply_sh = np.maximum(w_sh_ax, np.maximum(w_sup_gh, w_med_gh))
        else:
            w_sh_ax = (
                smootherstep((sh_pad - 0.024) / 0.018)
                * smootherstep((ax - 0.140) / 0.028)
                * (1.0 - smootherstep((ax - 0.320) / 0.032))
                * smootherstep((rz - 1.440) / 0.032)
                * np.where(in_sh_ax_zone, 1.0, 0.0)
            )
            for _ in range(18):
                sub_sh = W_sh[:, sh_cols].copy()
                nbr_sh = np.column_stack(
                    [np.bincount(s_es, weights=elen_fu * sub_sh[s_ed, c], minlength=n_su) / deg_fu for c in range(len(sh_cols))]
                )
                orig_sh_s = sub_sh.sum(axis=1, keepdims=True)
                mix_sh = (1.0 - 0.55 * w_sh_ax[:, None]) * sub_sh + (0.55 * w_sh_ax[:, None]) * nbr_sh
                mix_sh_s = np.maximum(mix_sh.sum(axis=1, keepdims=True), 1e-12)
                upd_sh = (orig_sh_s[:, 0] > 1e-6) & (w_sh_ax > 0.005)
                for kc, jc in enumerate(sh_cols):
                    W_sh[upd_sh, jc] = mix_sh[upd_sh, kc] * (orig_sh_s[upd_sh, 0] / mix_sh_s[upd_sh, 0])
            w_apply_sh = w_sh_ax
        mir_sh = np.full(n_su, -1, dtype=np.int64)
        for ui in np.flatnonzero(in_sh_ax_zone):
            _, mi, md = kd.find((-float(ru[ui, 0]), float(ru[ui, 1]), float(ru[ui, 2])))
            if mi is not None and md < 2.5e-3 and int(mi) != ui and in_sh_ax_zone[int(mi)]:
                mir_sh[ui] = int(mi)
        W_sh_sym = W_sh.copy()
        for ui in np.flatnonzero(in_sh_ax_zone):
            mi = int(mir_sh[ui])
            if mi >= 0:
                W_sh_sym[ui] = 0.5 * (W_sh[ui] + W_sh[mi, j_mir])
        W_sh = W_sh_sym / np.maximum(W_sh_sym.sum(axis=1, keepdims=True), 1e-12)
        sh_ji_u = np.zeros((n_su, 4), dtype=np.int64)
        sh_jw_u = np.zeros((n_su, 4), dtype=np.float64)
        for ui in np.flatnonzero(in_sh_ax_zone):
            if ru[ui, 0] > 0.0 or mir_sh[ui] < 0 or ru[int(mir_sh[ui]), 0] <= 0.0:
                top4 = np.argsort(-W_sh[ui])[:4]
                ws = np.where(W_sh[ui, top4] > 1e-5, W_sh[ui, top4], 0.0)
                s_w = float(ws.sum())
                sh_ji_u[ui] = np.where(ws > 0.0, top4, 0)
                sh_jw_u[ui] = (ws / s_w) if s_w > 0.0 else np.array([1.0, 0.0, 0.0, 0.0])
        for ui in np.flatnonzero(in_sh_ax_zone):
            mi = int(mir_sh[ui])
            if ru[ui, 0] < 0.0 and mi >= 0 and ru[mi, 0] > 0.0:
                sh_ji_u[ui] = j_mir[sh_ji_u[mi]]
                sh_jw_u[ui] = sh_jw_u[mi]
        for rv in range(n_rv):
            ui = int(s_weld[int(src_idx[rv])])
            if in_sh_ax_zone[ui] and w_apply_sh[ui] > 0.005:
                new_ji[rv] = sh_ji_u[ui]
                new_jw[rv] = sh_jw_u[ui]

    bs["jointIndices"] = new_ji.astype(np.uint32).reshape(-1).tolist()
    bs["jointWeights"] = new_jw.astype(np.float32).reshape(-1).tolist()


def export_fitted_covered_character_glb(
    out_glb_path: Path,
    compiled_family: dict,
    rest_low_fit_bl: np.ndarray,
    rest_head_fit_bl: np.ndarray,
    attached_submeshes_bl: dict[str, np.ndarray],
    z_shift: float = 0.0,
    rest_high_fit_bl: np.ndarray | None = None,
    high_tri: np.ndarray | None = None,
    adipose_gate: float = 1.0,
    muscle_gate: float = 0.5,
    donor_xyz: np.ndarray | None = None,
    donor_tri: np.ndarray | None = None,
    donor_bridged_axilla_faces: np.ndarray | None = None,
    donor_bridged_thigh_faces: np.ndarray | None = None,
    donor_linen_faces: np.ndarray | None = None,
    donor_linen_rim_faces: np.ndarray | None = None,
    posed_low_fit_bl: np.ndarray | None = None,
    rest_low_ref_bl: np.ndarray | None = None,
    jac_low: np.ndarray | None = None,
) -> dict:
    """Assemble and export `out_glb_path` (`+Y` up, metres, soles at 0, facing `+Z`, rigged + animated
    + fitted `linenBriefs`), then re-import and validate against `art-tool.py`'s `character` budget.
    """
    fam = copy.deepcopy(inject_linen_briefs_into_family(compiled_family))
    is_ext_full_wb = (float(adipose_gate) > 0.80) and (abs(float(muscle_gate) - 0.50) > 0.10)
    if not is_ext_full_wb:
        _condition_bodyskin_abdominal_weights(fam, rest_low_fit_bl)
    seam_body = np.asarray(fam["seams"][0]["bodyVertices"], dtype=np.int64)
    seam_head = np.asarray(fam["seams"][0]["headVertices"], dtype=np.int64)

    body_fit_bl = rest_low_fit_bl.copy()
    head_fit_bl = rest_head_fit_bl.copy()
    head_fit_bl[seam_head] = body_fit_bl[seam_body]

    sole_min_z = float(body_fit_bl[:, 2].min())
    body_fit_bl[:, 2] -= sole_min_z
    head_fit_bl[:, 2] -= sole_min_z
    high_shifted_bl = None
    if rest_high_fit_bl is not None:
        high_shifted_bl = rest_high_fit_bl.copy()
        high_shifted_bl[:, 2] -= sole_min_z
    sub_shifted = {k: (v - np.array([0.0, 0.0, sole_min_z])) for k, v in attached_submeshes_bl.items()}

    actual_crown_m = float(head_fit_bl[:, 2].max())
    fam["referenceStatureMetres"] = actual_crown_m
    stature_ctrl = fam["statureControl"]
    fam["controls"][stature_ctrl]["bounds"] = [actual_crown_m, actual_crown_m]
    fam["controls"][stature_ctrl]["default"] = actual_crown_m

    lm_dz = float(z_shift - sole_min_z)
    for lk, ldef in fam["landmarks"].items():
        if "position" in ldef:
            pos = list(ldef["position"])
            pos[1] = float(pos[1]) + lm_dz
            ldef["position"] = pos
    fam["landmarks"][fam["soleLandmark"]]["position"][1] = 0.0
    fam["landmarks"][fam["crownLandmark"]]["position"][1] = actual_crown_m

    canon_positions: dict[str, np.ndarray] = {
        "bodySkin": blender_to_gltf(body_fit_bl).astype(np.float32).reshape(-1),
        "headSkin": blender_to_gltf(head_fit_bl).astype(np.float32).reshape(-1),
    }
    low_tri_fit = np.asarray(fam["meshes"]["bodySkin"]["triangles"], dtype=np.int64).reshape(-1, 3)
    if donor_xyz is not None and donor_tri is not None and posed_low_fit_bl is not None:
        fc_don_g = donor_xyz[donor_tri].mean(axis=1)
        lf_src_g = (
            np.asarray(donor_linen_faces, dtype=bool)
            if (donor_linen_faces is not None and len(donor_linen_faces) == len(donor_tri))
            else (_eval_brief_level_set_bl(fc_don_g) > 0.0)
        )
        posed_br_bl, sh_tri_d, _ = fit_linen_briefs_to_donor_posed(
            donor_xyz,
            donor_tri,
            lf_src_g,
            donor_linen_rim_faces,
            donor_bridged_thigh_faces,
            adipose_gate=float(adipose_gate),
            muscle_gate=float(muscle_gate),
        )
        rest_br_unshifted = unpose_donor_briefs_to_rest(
            posed_br_bl,
            sh_tri_d,
            posed_low_fit_bl,
            rest_low_fit_bl,
            low_tri_fit,
            rest_high_fit=rest_high_fit_bl,
            high_tri=high_tri,
        )
        draped_briefs_bl = rest_br_unshifted - np.array([0.0, 0.0, sole_min_z], dtype=np.float64)
    else:
        draped_briefs_bl, _, _ = eval_linen_briefs_bl(
            body_fit_bl,
            fam,
            low_tri_fit,
            dense_body_bl=high_shifted_bl,
            dense_tri=high_tri,
            is_ext_full=is_ext_full_wb,
        )
    draped_briefs_gltf = blender_to_gltf(draped_briefs_bl).astype(np.float32).reshape(-1)
    fitted_body_mesh_entry = {**fam["meshes"]["bodySkin"], "positions": canon_positions["bodySkin"].tolist()}
    fam["meshes"]["linenBriefs"]["positions"] = draped_briefs_gltf.tolist()
    fam["parts"]["linenBriefs"]["pieces"][0]["fit"] = ol_people.bind_surface(
        fitted_body_mesh_entry, "bodySkin", draped_briefs_gltf
    )
    for sid, spts in sub_shifted.items():
        canon_positions[sid] = blender_to_gltf(spts).astype(np.float32).reshape(-1)
    for fit_surf in fam.get("fitSurfaces", []):
        if fit_surf not in canon_positions:
            canon_positions[fit_surf] = np.asarray(fam["meshes"][fit_surf]["positions"], dtype=np.float32).reshape(-1)

    landmarks = {
        lk: (
            ol_people.surface_points(
                canon_positions[ldef["surface"]["meshId"]],
                ldef["surface"]["triangle"],
                ldef["surface"]["barycentric"],
                ol_people.flat(ldef["surface"]["offset"]),
            ).tolist()
            if "surface" in ldef
            else list(ldef["position"])
        )
        for lk, ldef in fam["landmarks"].items()
    }
    rest_mats, inv_bind = ol_people.rest_hierarchy(fam, landmarks)
    if is_ext_full_wb:
        j_list_gh = fam["rig"]["joints"]
        ua_idx = next((idx for idx, jj in enumerate(j_list_gh) if (jj["id"] if isinstance(jj, dict) else jj) == "upperarm_l"), -1)
        gh_piv = None
        if ua_idx >= 0:
            rm_all = np.asarray(rest_mats, dtype=np.float64).reshape(len(j_list_gh), 4, 4).transpose(0, 2, 1)
            gh_bl_arr = gltf_to_blender(np.array([[rm_all[ua_idx, 0, 3], rm_all[ua_idx, 1, 3], rm_all[ua_idx, 2, 3]]], dtype=np.float64))[0]
            gh_piv = (float(gh_bl_arr[0]), float(gh_bl_arr[1]), float(gh_bl_arr[2]))
        _condition_bodyskin_abdominal_weights(
            fam, rest_low_fit_bl, is_ext_full_wb=True, gh_pivot_bl=gh_piv, sole_min_z=sole_min_z
        )
    recipe = {
        "family": copy.deepcopy(fam["reference"]),
        "controls": {k: v["default"] for k, v in fam["controls"].items()},
        "selections": {
            fam["faceSelectionRole"]: next(iter(fam["facePresets"].keys())),
            fam["coverageSelectionRole"]: "linenBriefs",
        },
    }
    evaluated = {
        "recipe": recipe,
        "canonicalPositions": canon_positions,
        "landmarks": landmarks,
        "statureMetres": actual_crown_m,
        "scale": 1.0,
        "restMatrices": rest_mats,
        "inverseBindMatrices": inv_bind,
    }
    ol_people.fit_parts(fam, evaluated, parts=(), variants=None)
    motion = ol_people.fit_motion(fam, evaluated, ol_art_tool)
    donor_shifted_bl = (donor_xyz - np.array([0.0, 0.0, sole_min_z], dtype=np.float64)) if donor_xyz is not None else None
    _rebind_and_dynamic_clear_linen_briefs(
        fam,
        evaluated,
        body_fit_bl,
        draped_briefs_bl,
        motion,
        dense_body_bl=high_shifted_bl,
        dense_tri=high_tri,
        is_ext_full_wb=is_ext_full_wb,
        donor_shifted_bl=donor_shifted_bl,
        donor_tri=donor_tri,
    )

    witness_pkg = ol_people.load_family(WITNESS_PACKAGE_JSON)
    pkg_for_mats = {
        "manifest": witness_pkg["manifest"],
        "root": witness_pkg["root"],
        "compiled": fam,
    }

    out_glb_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_tex = Path(tempfile.mkdtemp(prefix=".glb-tex-", dir=out_glb_path.parent))
    try:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        material_ids = [fam["meshes"][m]["materialId"] for m in evaluated["activeMeshes"]]
        materials = ol_people.bake_materials(pkg_for_mats, recipe, tmp_tex, material_ids)
        ol_people.build_scene(fam, evaluated, materials, motion, ol_art_tool)
        body_scene_obj = bpy.data.objects.get("bodySkin")
        head_scene_obj = bpy.data.objects.get("headSkin")
        if body_scene_obj is not None and head_scene_obj is not None:
            bs_src_r = np.asarray(fam["meshes"]["bodySkin"]["sourceVertexIndices"], dtype=np.int64)
            hs_src_r = np.asarray(fam["meshes"]["headSkin"]["sourceVertexIndices"], dtype=np.int64)
            # Compute true watertight area-weighted vertex normals across the combined `bodySkin + headSkin` mesh
            # (`so UV seams AND the 96-vertex collar seam share exact C1 continuous surface normals in the exported .glb!`):
            b_co_s = np.empty(len(body_scene_obj.data.vertices) * 3, dtype=np.float32)
            body_scene_obj.data.vertices.foreach_get("co", b_co_s)
            b_pts_s = b_co_s.reshape(-1, 3).astype(np.float64)
            h_co_s = np.empty(len(head_scene_obj.data.vertices) * 3, dtype=np.float32)
            head_scene_obj.data.vertices.foreach_get("co", h_co_s)
            h_pts_s = h_co_s.reshape(-1, 3).astype(np.float64)
            body_scene_obj.data.calc_loop_triangles()
            head_scene_obj.data.calc_loop_triangles()
            b_tb = np.empty(len(body_scene_obj.data.loop_triangles) * 3, dtype=np.int32)
            body_scene_obj.data.loop_triangles.foreach_get("vertices", b_tb)
            h_tb = np.empty(len(head_scene_obj.data.loop_triangles) * 3, dtype=np.int32)
            head_scene_obj.data.loop_triangles.foreach_get("vertices", h_tb)
            comb_pts_s = np.vstack([b_pts_s, h_pts_s])
            comb_tri_s = np.vstack([b_tb.reshape(-1, 3), h_tb.reshape(-1, 3) + len(b_pts_s)]).astype(np.int64)
            comb_weld_s = weld_connectivity(comb_pts_s, comb_tri_s, decimals=4)[0]
            comb_vn_s = vertex_normals(comb_pts_s, comb_tri_s, comb_weld_s)
            body_scene_obj.data.normals_split_custom_set_from_vertices([tuple(v) for v in comb_vn_s[: len(b_pts_s)]])
            head_scene_obj.data.normals_split_custom_set_from_vertices([tuple(v) for v in comb_vn_s[len(b_pts_s) :]])
            _ = (bs_src_r, hs_src_r)
        _seamlessly_feather_collar_uvs_and_linen_material(
            fam,
            materials,
            tmp_tex,
            body_obj=body_scene_obj,
            head_obj=head_scene_obj,
            sole_min_z=sole_min_z,
            high_fit_bl=high_shifted_bl,
            high_tri=high_tri,
            adipose_gate=adipose_gate,
            donor_xyz=donor_xyz,
            donor_tri=donor_tri,
            donor_bridged_axilla_faces=donor_bridged_axilla_faces,
            donor_bridged_thigh_faces=donor_bridged_thigh_faces,
            donor_linen_faces=donor_linen_faces,
            posed_low_fit_bl=posed_low_fit_bl,
            rest_low_ref_bl=rest_low_ref_bl,
            jac_low=jac_low,
        )
        bpy.ops.object.select_all(action="SELECT")
        ol_art_tool.export_glb(out_glb_path, force_sampling=False)
        motion_check = ol_people.check_export_motion(out_glb_path, fam, evaluated, motion)
        report = ol_art_tool.measure(out_glb_path, "character", None)
    finally:
        for obj in list(bpy.data.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions, bpy.data.materials, bpy.data.images):
            for blk in list(coll):
                if blk.users == 0:
                    coll.remove(blk)
        shutil.rmtree(tmp_tex, ignore_errors=True)

    failed_budgets = [b for b in report["budgets"] if b["status"] != "pass"]
    if failed_budgets or report["motion"]["missingRequired"] or report["geometry"]["zeroAreaFaces"]:
        raise RuntimeError(
            f"Exported {out_glb_path} failed character checks: budgets={failed_budgets}, "
            f"missingClips={report['motion']['missingRequired']}, zeroArea={report['geometry']['zeroAreaFaces']}"
        )
    return {
        "glbPath": str(out_glb_path),
        "bytes": out_glb_path.stat().st_size,
        "sha256": ol_people.file_record(out_glb_path)["sha256"],
        "triangles": report["geometry"]["triangles"],
        "vertices": report["geometry"]["vertices"],
        "zeroAreaFaces": report["geometry"]["zeroAreaFaces"],
        "clips": [c["name"] for c in report["motion"]["clips"]],
        "budgetAllPass": True,
        "motionExportCheck": motion_check,
    }
