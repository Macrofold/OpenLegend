#!/usr/bin/env python3
"""Render high-resolution 1:1 Donor-vs-LOD1-Clay-vs-Exported-GLB-PBR comparison boards,
a 2-row Signed Millimeter Deviation Heatmap (LOD0 & LOD1 vs 420k Meshy Donor), and an
18-zone quantitative millimeter deviation receipt (`deviation_audit.json`).
"""
from __future__ import annotations

import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from linen_briefs import eval_linen_briefs_bl, inject_linen_briefs_into_family  # noqa: E402
from mesh_rig_utils import smootherstep, vertex_normals, weld_connectivity  # noqa: E402
import export_covered_glb as ecg  # noqa: E402


def _look_at(obj: bpy.types.Object, pos: tuple[float, float, float], target: tuple[float, float, float]) -> None:
    obj.location = Vector(pos)
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def _setup_sculpt_lights(scn: bpy.types.Scene) -> None:
    scn.render.engine = "BLENDER_EEVEE"
    scn.view_settings.view_transform = "Standard"
    scn.view_settings.look = "None"
    scn.render.film_transparent = False

    world = bpy.data.worlds.new("VerifyWorld")
    scn.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs["Color"].default_value = (0.16, 0.165, 0.175, 1.0)
        bg.inputs["Strength"].default_value = 0.16

    # Crisp sculptural raking key + soft neutral fill (front & rear) so 2-4mm sulci & waist contours read cleanly without grazing arm cast-shadows:
    for name, loc, energy, sz, col in (
        ("FrontKey", (-1.25, -2.75, 2.55), 112.0, 1.85, (1.0, 0.985, 0.96)),
        ("FrontFill", (2.1, -2.5, 1.60), 36.0, 2.30, (0.99, 0.985, 0.98)),
        ("BackKey", (1.25, 2.75, 2.55), 112.0, 1.85, (1.0, 0.985, 0.96)),
        ("BackFill", (-2.1, 2.5, 1.60), 36.0, 2.30, (0.99, 0.985, 0.98)),
    ):
        ld = bpy.data.lights.new(name=name, type="AREA")
        ld.energy = energy
        ld.size = sz
        ld.color = col
        lo = bpy.data.objects.new(name=name, object_data=ld)
        scn.collection.objects.link(lo)
        _look_at(lo, loc, (0.0, 0.0, 1.15))


def _make_clay_mat(name: str, rgb: tuple[float, float, float], rough: float = 0.52) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = rough
    return mat


def _build_mesh_obj(name: str, pts: np.ndarray, tri: np.ndarray, mat: bpy.types.Material) -> bpy.types.Object:
    # Weld split UV-island vertices so Clay comparison panels render true C1 smooth geometry without fake UV-seam creases:
    conn = weld_connectivity(pts, tri, decimals=5)
    weld = conn[0]
    n_u = len(conn[2])
    u_pts = np.column_stack([np.bincount(weld, weights=pts[:, c], minlength=n_u) / conn[2] for c in range(3)])
    w_tri = weld[tri]
    me = bpy.data.meshes.new(name)
    me.from_pydata(u_pts.tolist(), [], w_tri.tolist())
    for p in me.polygons:
        p.use_smooth = True
    me.update()
    me.materials.append(mat)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def _load_donor_tris(donor_glb: Path, donor_reg: np.ndarray) -> np.ndarray:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(donor_glb))
    tris, v_off = [], 0
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            me = obj.data
            me.calc_loop_triangles()
            tris.append(np.asarray([lt.vertices[:] for lt in me.loop_triangles], dtype=np.int64) + v_off)
            v_off += len(me.vertices)
    assert v_off == len(donor_reg), f"Donor vertex mismatch {v_off} vs {len(donor_reg)}"
    return np.vstack(tris)


def _signed_error_mm(pts: np.ndarray, tri: np.ndarray, dbvh: BVHTree) -> np.ndarray:
    conn = weld_connectivity(pts, tri, decimals=5)
    vn = vertex_normals(pts, tri, conn[0])
    # Guarantee outward-pointing normals (`even on open garment panels whose loop winding faces inward`):
    ctr = np.mean(pts, axis=0)
    if float(np.mean(np.einsum("ni,ni->n", vn, pts - ctr[None, :]))) < 0.0:
        vn = -vn
    err = np.full(len(pts), np.nan, dtype=np.float64)
    for i in range(len(pts)):
        p, n = pts[i], vn[i]
        # Cast INWARD from outside (`p + 45 mm * n -> -n`) so rays ALWAYS hit the true outer Donor skin/brief surface
        # and NEVER hit an internal Meshy pocket/fold inside the pelvis:
        hf, hnf, _, _ = dbvh.ray_cast(Vector((p + 0.045 * n).tolist()), Vector((-n).tolist()), 0.090)
        if hf is not None and float(hnf.dot(Vector(n.tolist()))) > 0.35:
            err[i] = float((p - np.asarray(hf, dtype=np.float64)) @ n) * 1000.0
        else:
            nh, nhn, _, nd = dbvh.find_nearest(Vector(p.tolist()), 0.038)
            if nh is not None and float(nd) < 0.038 and float(np.asarray(nhn, dtype=np.float64) @ n) > 0.35:
                err[i] = float((p - np.asarray(nh, dtype=np.float64)) @ n) * 1000.0
    return err


def _err_to_srgb(err_mm: np.ndarray, valid_bare: np.ndarray) -> np.ndarray:
    """Map signed mm error to intuitive heatmap sRGB:
    `<= -8mm`: Deep Blue (indent) | `-3.5mm`: Cyan | `[-1.5, +1.5]mm`: Pale Sage/Grey (exact) | `+3.5mm`: Orange | `>= +8mm`: Red (protrusion).
    Excluded regions (`~valid_bare`: hands, toes, covered groin saddle) -> dark neutral slate `(0.28, 0.29, 0.31)`.
    """
    n = len(err_mm)
    rgba = np.broadcast_to(np.array([0.28, 0.29, 0.31, 1.0], dtype=np.float32), (n, 4)).copy()
    m = valid_bare & np.isfinite(err_mm)
    if not np.any(m):
        return rgba
    v = np.clip(err_mm[m], -10.0, 10.0)
    knots = np.array([-10.0, -5.0, -2.0, 0.0, 2.0, 5.0, 10.0], dtype=np.float64)
    cols = np.array(
        [
            [0.08, 0.22, 0.92],  # -10mm deep blue indent
            [0.18, 0.62, 0.96],  # -5mm cyan indent
            [0.62, 0.82, 0.78],  # -2mm cool mint
            [0.74, 0.80, 0.74],  #  0mm exact neutral sage-grey
            [0.86, 0.78, 0.58],  # +2mm warm sand
            [0.96, 0.50, 0.16],  # +5mm orange protrusion
            [0.92, 0.10, 0.10],  # +10mm bright red protrusion
        ],
        dtype=np.float64,
    )
    for c in range(3):
        rgba[m, c] = np.interp(v, knots, cols[:, c]).astype(np.float32)
    return rgba


def _render_panels(cam_o: bpy.types.Object, cam_d: bpy.types.Camera, panels: list, pw: int, ph: int, tmp_dir: Path) -> list[np.ndarray]:
    scn = bpy.context.scene
    scn.render.resolution_x = pw
    scn.render.resolution_y = ph
    scn.render.resolution_percentage = 100
    scn.render.image_settings.file_format = "PNG"
    base_light_e = {o.name: float(o.data.energy) for o in scn.collection.objects if o.type == "LIGHT"}
    tiles = []
    for idx, (_lbl, cpos, ctgt, oscale) in enumerate(panels):
        # Attenuate opposing-hemisphere lights to a natural 12% studio rim so a 112W rear key light never blasts
        # asymmetric grazing Fresnel glare past the waist onto a single wrist in front/3-4 shots (and vice versa):
        cy = float(cpos[1])
        front_mul = 1.0 if cy <= 0.4 else 0.12
        back_mul = 1.0 if cy >= -0.4 else 0.12
        for o in scn.collection.objects:
            if o.type == "LIGHT" and o.name in base_light_e:
                if o.name.startswith("Front"):
                    o.data.energy = base_light_e[o.name] * front_mul
                elif o.name.startswith("Back"):
                    o.data.energy = base_light_e[o.name] * back_mul
        cam_d.ortho_scale = oscale
        _look_at(cam_o, cpos, ctgt)
        tp = tmp_dir / f"tile_{idx}.png"
        scn.render.filepath = str(tp)
        bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(str(tp))
        arr = np.empty(pw * ph * 4, dtype=np.float32)
        im.pixels.foreach_get(arr)
        bpy.data.images.remove(im)
        tp.unlink(missing_ok=True)
        tiles.append(arr.reshape(ph, pw, 4))
    for o in scn.collection.objects:
        if o.type == "LIGHT" and o.name in base_light_e:
            o.data.energy = base_light_e[o.name]
    return tiles


def _save_grid(rows_of_tiles: list[list[np.ndarray]], out_png: Path, gap: int = 6) -> None:
    n_r = len(rows_of_tiles)
    n_c = len(rows_of_tiles[0])
    ph, pw = rows_of_tiles[0][0].shape[:2]
    tot_h = n_r * ph + (n_r - 1) * gap
    tot_w = n_c * pw + (n_c - 1) * gap
    canvas = np.zeros((tot_h, tot_w, 4), dtype=np.float32)
    canvas[:, :, 3] = 1.0
    canvas[:, :, :3] = 0.05
    # Note: in Blender image buffer, y=0 is bottom! Put Row 0 at the TOP of the PNG:
    for r_i, row in enumerate(rows_of_tiles):
        y0 = (n_r - 1 - r_i) * (ph + gap)
        for c_i, tile in enumerate(row):
            x0 = c_i * (pw + gap)
            canvas[y0 : y0 + ph, x0 : x0 + pw, :] = tile
    out_im = bpy.data.images.new("GridOut", width=tot_w, height=tot_h, alpha=True)
    out_im.colorspace_settings.name = "sRGB"
    out_im.pixels.foreach_set(canvas.reshape(-1))
    out_im.filepath_raw = str(out_png)
    out_im.file_format = "PNG"
    out_im.save()
    bpy.data.images.remove(out_im)


def _extract_glb_briefs_bl(glb_path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Read exported `linenBriefs` Rest positions (converted to Blender Z-up) and triangles directly from `glb_path`."""
    import struct

    with open(glb_path, "rb") as f:
        f.read(12)
        jlen, _ = struct.unpack("<II", f.read(8))
        gltf = json.loads(f.read(jlen).decode("utf-8"))
        blen, _ = struct.unpack("<II", f.read(8))
        bin_buf = f.read(blen)
    for mesh in gltf["meshes"]:
        if "linenBriefs" not in mesh["name"]:
            continue
        prim = mesh["primitives"][0]
        acc = gltf["accessors"][prim["attributes"]["POSITION"]]
        bv = gltf["bufferViews"][acc["bufferView"]]
        off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
        v = np.frombuffer(bin_buf, dtype=np.float32, count=acc["count"] * 3, offset=off).reshape(-1, 3)
        pts_bl = np.stack([v[:, 0], -v[:, 2], v[:, 1]], axis=1).astype(np.float64)
        iacc = gltf["accessors"][prim["indices"]]
        ibv = gltf["bufferViews"][iacc["bufferView"]]
        ioff = ibv.get("byteOffset", 0) + iacc.get("byteOffset", 0)
        dt = np.uint16 if iacc["componentType"] == 5123 else np.uint32
        tri = np.frombuffer(bin_buf, dtype=dt, count=iacc["count"], offset=ioff).reshape(-1, 3).astype(np.int64)
        return pts_bl, tri
    raise RuntimeError(f"No linenBriefs mesh found in {glb_path}")


def main() -> None:
    raw_argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    pelvis_preview = ("--pelvis-preview" in raw_argv) or ("--concept-only" in raw_argv)
    concept_only = pelvis_preview
    argv = [a for a in raw_argv if a not in ("--concept-only", "--pelvis-preview")]
    rev_dir = Path(argv[0]).resolve()
    glb_path = Path(argv[1]).resolve()
    explicit_concept = Path(argv[2]).resolve() if len(argv) >= 3 else None
    study_dir = rev_dir.parent.parent
    fam_dir = study_dir / "family-20261113"

    receipt = json.loads((rev_dir / "receipt.json").read_text())
    coord_id = receipt["coordinateId"]
    raw_npz = np.load(Path(receipt["rawCgCache"]["path"]), allow_pickle=False)
    map_npz = np.load(fam_dir / "fits" / "_raw_fit_cache" / "shared-lod0-to-lod1-map.npz", allow_pickle=False)
    lod0_npz = np.load(rev_dir / "lod0.npz", allow_pickle=False)
    lod1_npz = np.load(rev_dir / "lod1.npz", allow_pickle=False)
    head_npz = np.load(rev_dir / "headSkin.npz", allow_pickle=False)

    donor_reg = raw_npz["donorReg"].astype(np.float64)
    donor_tri = _load_donor_tris(Path(receipt["donorGlb"]["path"]), donor_reg)
    dbvh_all = BVHTree.FromPolygons(donor_reg.tolist(), donor_tri.tolist(), all_triangles=True)
    br_thigh = (
        raw_npz["donorBridgedThighFaces"].astype(bool)
        if "donorBridgedThighFaces" in raw_npz.files and len(raw_npz["donorBridgedThighFaces"]) == len(donor_tri)
        else np.zeros(len(donor_tri), dtype=bool)
    )
    br_axilla = (
        raw_npz["donorBridgedAxillaFaces"].astype(bool)
        if "donorBridgedAxillaFaces" in raw_npz.files and len(raw_npz["donorBridgedAxillaFaces"]) == len(donor_tri)
        else np.zeros(len(donor_tri), dtype=bool)
    )
    dbvh_clean = BVHTree.FromPolygons(donor_reg.tolist(), donor_tri[~(br_thigh | br_axilla)].tolist(), all_triangles=True)

    rest_high = lod0_npz["reference"].astype(np.float64)
    high_tri = lod0_npz["triangles"].astype(np.int64)
    n_body = len(rest_high)
    posed_0 = raw_npz["posedAll0"][:n_body].astype(np.float64)
    jac_0 = raw_npz["jacAll"][:n_body].astype(np.float64)
    posed_raw = posed_0 + np.einsum("vij,vj->vi", jac_0, raw_npz["restAllFitRaw"][:n_body].astype(np.float64) - rest_high)
    posed_lod0 = lod0_npz["posedFit"].astype(np.float64)

    rest_low = lod1_npz["reference"].astype(np.float64)
    rest_low_fit = lod1_npz["full"].astype(np.float64)
    low_tri = lod1_npz["triangles"].astype(np.int64)
    map_faces = map_npz["faces"].astype(np.int64)
    map_weights = map_npz["weights"].astype(np.float64)
    red_tri = high_tri[map_faces]
    posed_low_0 = np.einsum("ni,nij->nj", map_weights, posed_0[red_tri])
    jac_low = np.einsum("ni,nijk->njk", map_weights, jac_0[red_tri])
    posed_lod1 = posed_low_0 + np.einsum("vij,vj->vi", jac_low, rest_low_fit - rest_low)

    posed_head = head_npz["posedFit"].astype(np.float64)
    head_tri = head_npz["triangles"].astype(np.int64)

    # Map the ACTUAL exported `.glb` `linenBriefs` mesh into Donor Posed space via exact skeleton LBS Jacobian (`jac_low`)
    # on `rest_low_fit` (`matching runtime glTF LBS without non-linear normal shearing across thigh-gap triangles`):
    from mathutils.geometry import barycentric_transform

    sole_min_z = float(rest_low_fit[:, 2].min())
    glb_br_rest_bl, glb_br_tri = _extract_glb_briefs_bl(glb_path)
    glb_br_rest_bl[:, 2] += sole_min_z
    fc_l1 = rest_low_fit[low_tri].mean(axis=1)
    pel_l1 = (np.abs(fc_l1[:, 0]) <= 0.34) & (fc_l1[:, 2] >= 0.76) & (fc_l1[:, 2] <= 1.32)
    pos_l1 = np.flatnonzero(pel_l1 & (fc_l1[:, 0] >= -1e-4))
    neg_l1 = np.flatnonzero(pel_l1 & (fc_l1[:, 0] <= +1e-4))
    all_l1 = np.flatnonzero(pel_l1)
    bvh_pos_l1 = BVHTree.FromPolygons(rest_low_fit.tolist(), low_tri[pos_l1].tolist(), all_triangles=True)
    bvh_neg_l1 = BVHTree.FromPolygons(rest_low_fit.tolist(), low_tri[neg_l1].tolist(), all_triangles=True)
    bvh_all_l1 = BVHTree.FromPolygons(rest_low_fit.tolist(), low_tri[all_l1].tolist(), all_triangles=True)
    posed_glb_br_bl = glb_br_rest_bl.copy()
    for bi in range(len(glb_br_rest_bl)):
        pb = glb_br_rest_bl[bi]
        if abs(float(pb[0])) <= 3.0e-4:
            nh_l, _, ti_loc, _ = bvh_all_l1.find_nearest(Vector(pb.tolist()), 0.120)
            ti_l = int(all_l1[int(ti_loc)]) if ti_loc is not None else None
        elif pb[0] >= 0.0:
            nh_l, _, ti_loc, _ = bvh_pos_l1.find_nearest(Vector(pb.tolist()), 0.120)
            ti_l = int(pos_l1[int(ti_loc)]) if ti_loc is not None else None
        else:
            nh_l, _, ti_loc, _ = bvh_neg_l1.find_nearest(Vector(pb.tolist()), 0.120)
            ti_l = int(neg_l1[int(ti_loc)]) if ti_loc is not None else None
        if nh_l is not None and ti_l is not None:
            va_i, vb_i, vc_i = (int(v) for v in low_tri[int(ti_l)])
            a0, b0, c0 = rest_low_fit[va_i], rest_low_fit[vb_i], rest_low_fit[vc_i]
            e1, e2, v2p = b0 - a0, c0 - a0, np.asarray(nh_l, dtype=np.float64) - a0
            d00, d01, d11 = float(e1 @ e1), float(e1 @ e2), float(e2 @ e2)
            d20, d21 = float(v2p @ e1), float(v2p @ e2)
            denom = d00 * d11 - d01 * d01
            if abs(denom) > 1e-12:
                wb = float(np.clip((d11 * d20 - d01 * d21) / denom, 0.0, 1.0))
                wc = float(np.clip((d00 * d21 - d01 * d20) / denom, 0.0, 1.0))
                if wb + wc > 1.0:
                    s_bc = wb + wc
                    wb, wc = wb / s_bc, wc / s_bc
                wa = 1.0 - wb - wc
            else:
                wa, wb, wc = 1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0
            q_rest = wa * a0 + wb * b0 + wc * c0
            q_posed = wa * posed_lod1[va_i] + wb * posed_lod1[vb_i] + wc * posed_lod1[vc_i]
            j_tri = wa * jac_low[va_i] + wb * jac_low[vb_i] + wc * jac_low[vc_i]
            posed_glb_br_bl[bi] = q_posed + j_tri @ (pb - q_rest)

    tmp_dir = rev_dir / "_tmp_verify_tiles"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    # 1) Quantitative signed millimeter deviation audit (BOTH un-blinded Covered `bodySkin + linenBriefs` AND Bare `LOD0`/`LOD1` vs Donor):
    e_lod1_cov = _signed_error_mm(posed_lod1, low_tri, dbvh_clean)
    e_briefs_raw = _signed_error_mm(posed_glb_br_bl, glb_br_tri, dbvh_clean)
    # Do not penalize intentional outward tensioned-cloth bridging across Meshy's carved intergluteal butt-crack wedgie
    # (`keep negative deficits, outer glute domes, leg openings, and waistbands 100% un-masked`):
    e_briefs = e_briefs_raw.copy()
    m_rear_bridge = (
        (posed_glb_br_bl[:, 1] > 0.025)
        & (np.abs(posed_glb_br_bl[:, 0]) <= 0.062)
        & np.isfinite(e_briefs)
        & (e_briefs > 0.0)
    )
    if np.any(m_rear_bridge):
        x_rb = np.abs(posed_glb_br_bl[m_rear_bridge, 0])
        w_bridge_allow = 1.0 - smootherstep((x_rb - 0.036) / 0.024)
        e_briefs[m_rear_bridge] = (1.0 - w_bridge_allow) * e_briefs[m_rear_bridge]
    e_raw = _signed_error_mm(posed_raw, high_tri, dbvh_all) if not pelvis_preview else np.zeros(len(posed_raw), dtype=np.float64)
    e_lod0 = _signed_error_mm(posed_lod0, high_tri, dbvh_all) if not pelvis_preview else np.zeros(len(posed_lod0), dtype=np.float64)
    e_lod1 = _signed_error_mm(posed_lod1, low_tri, dbvh_all)

    def _bare_valid(ref_arr: np.ndarray) -> np.ndarray:
        is_hand = (np.abs(ref_arr[:, 0]) > 0.43) & (ref_arr[:, 2] < 1.32)
        is_foot = ref_arr[:, 2] < 0.09
        is_top = ref_arr[:, 2] > 1.71
        is_pouch = (np.abs(ref_arr[:, 0]) < 0.075) & (ref_arr[:, 2] >= 0.88) & (ref_arr[:, 2] <= 1.11) & (ref_arr[:, 1] < 0.03)
        return (~is_hand) & (~is_foot) & (~is_top) & (~is_pouch)

    def _cov_body_valid(ref_arr: np.ndarray) -> np.ndarray:
        is_hand = (np.abs(ref_arr[:, 0]) > 0.43) & (ref_arr[:, 2] < 1.32)
        is_foot = ref_arr[:, 2] < 0.09
        is_top = ref_arr[:, 2] > 1.71
        valid_c = (~is_hand) & (~is_foot) & (~is_top)
        if np.any(br_axilla) and len(ref_arr) == len(posed_lod1):
            for vi_c in np.flatnonzero(valid_c & (ref_arr[:, 2] > 1.28) & (np.abs(ref_arr[:, 0]) > 0.11)):
                _, _, f_all, _ = dbvh_all.find_nearest(Vector(posed_lod1[vi_c].tolist()), 0.060)
                if f_all is not None and bool(br_axilla[int(f_all)]):
                    valid_c[vi_c] = False
        return valid_c

    bv0 = _bare_valid(rest_high)
    bv1 = _bare_valid(rest_low)
    cv1 = _cov_body_valid(rest_low)
    bv_br = np.ones(len(posed_glb_br_bl), dtype=bool)

    # Measure Donor true crotch-base Z (`excluding donorBridgedThighFaces`) vs Posed Exported `linenBriefs` crotch-base Z:
    don_clean_pts = donor_reg[np.unique(donor_tri[~br_thigh].ravel())]
    m_dc = (np.abs(don_clean_pts[:, 0]) <= 0.014) & (don_clean_pts[:, 1] >= -0.15) & (don_clean_pts[:, 1] <= 0.04) & (don_clean_pts[:, 2] >= 0.855) & (don_clean_pts[:, 2] <= 1.05)
    # Outlier-guarded Donor crotch arch min Z:
    if np.sum(m_dc) >= 8:
        ys_dc = np.linspace(-0.125, 0.045, 25)
        zs_dc = np.full(len(ys_dc), np.nan, dtype=np.float64)
        for yi_c, yq in enumerate(ys_dc):
            z_row = []
            for xq_c in (-0.012, -0.006, 0.0, 0.006, 0.012):
                rh_c, rn_c, _, _ = dbvh_clean.ray_cast(Vector((float(xq_c), float(yq), 0.78)), Vector((0.0, 0.0, 1.0)), 0.35)
                if rh_c is not None and 0.855 <= float(rh_c.z) <= 1.05 and float(rn_c.z) < -0.15:
                    z_row.append(float(rh_c.z))
            if z_row:
                zs_dc[yi_c] = float(np.median(z_row))
        ok_dc = np.isfinite(zs_dc)
        for yi_c in np.flatnonzero(ok_dc):
            lo_c, hi_c = max(0, int(yi_c) - 4), min(len(ys_dc), int(yi_c) + 5)
            loc_c = zs_dc[lo_c:hi_c][np.isfinite(zs_dc[lo_c:hi_c])]
            if len(loc_c) >= 3 and zs_dc[yi_c] < float(np.percentile(loc_c, 75)) - 0.022:
                ok_dc[yi_c] = False
        vals_dc = zs_dc[ok_dc] if int(np.sum(ok_dc)) >= 3 else zs_dc[np.isfinite(zs_dc)]
        z_don_crotch = float(np.min(vals_dc)) if len(vals_dc) >= 1 else float(np.percentile(don_clean_pts[m_dc, 2], 10))
    else:
        z_don_crotch = 0.960
    m_bc = (np.abs(posed_glb_br_bl[:, 0]) <= 0.016) & (posed_glb_br_bl[:, 1] >= -0.15) & (posed_glb_br_bl[:, 1] <= 0.04)
    z_fit_crotch = float(np.min(posed_glb_br_bl[m_bc, 2])) if np.any(m_bc) else float(np.min(posed_glb_br_bl[:, 2]))
    crotch_dz_mm = round((z_fit_crotch - z_don_crotch) * 1000.0, 2)

    m_br_front_mid = (np.abs(posed_glb_br_bl[:, 0]) <= 0.010) & (posed_glb_br_bl[:, 1] < -0.035)
    z_br_lo = float(np.min(posed_glb_br_bl[m_br_front_mid, 2])) if np.any(m_br_front_mid) else z_fit_crotch
    z_br_hi = float(np.max(posed_glb_br_bl[m_br_front_mid, 2])) if np.any(m_br_front_mid) else 1.105
    z_br_split = z_br_lo + 0.56 * (z_br_hi - z_br_lo)

    covered_pelvis_zones = {}
    for cz_name, cz_mask in [
        (
            "front_pelvis_briefs",
            (np.abs(posed_glb_br_bl[:, 0]) <= 0.115)
            & (posed_glb_br_bl[:, 1] < -0.030)
            & (posed_glb_br_bl[:, 2] >= z_br_lo + 0.010)
            & np.isfinite(e_briefs),
        ),
        (
            "upper_pubic_briefs",
            (np.abs(posed_glb_br_bl[:, 0]) <= 0.075)
            & (posed_glb_br_bl[:, 1] < -0.040)
            & (posed_glb_br_bl[:, 2] >= z_br_split)
            & (posed_glb_br_bl[:, 2] <= z_br_hi - 0.008)
            & np.isfinite(e_briefs),
        ),
        (
            "lower_cup_briefs",
            (np.abs(posed_glb_br_bl[:, 0]) <= 0.055)
            & (posed_glb_br_bl[:, 1] < -0.040)
            & (posed_glb_br_bl[:, 2] >= z_br_lo + 0.010)
            & (posed_glb_br_bl[:, 2] < z_br_split)
            & np.isfinite(e_briefs),
        ),
        (
            "crotch_base",
            (np.abs(posed_glb_br_bl[:, 0]) <= 0.038)
            & (posed_glb_br_bl[:, 1] >= -0.145)
            & (posed_glb_br_bl[:, 1] <= 0.045)
            & (posed_glb_br_bl[:, 2] <= z_br_lo + 0.030)
            & np.isfinite(e_briefs),
        ),
        (
            "rear_seat_briefs",
            (posed_glb_br_bl[:, 1] > 0.030)
            & np.isfinite(e_briefs),
        ),
        (
            "rear_waistband_briefs",
            (posed_glb_br_bl[:, 1] > 0.030)
            & (posed_glb_br_bl[:, 2] >= float(np.max(posed_glb_br_bl[posed_glb_br_bl[:, 1] > 0.030, 2])) - 0.035)
            & np.isfinite(e_briefs),
        ),
    ]:
        if int(np.sum(cz_mask)) >= 3:
            covered_pelvis_zones[cz_name] = {
                "coveredGlbBriefs_p05_med_p95_mm": [round(float(np.percentile(e_briefs[cz_mask], q)), 2) for q in (5, 50, 95)],
                "coveredGlbBriefs_min_max_mm": [round(float(np.min(e_briefs[cz_mask])), 2), round(float(np.max(e_briefs[cz_mask])), 2)],
            }
    if "crotch_base" in covered_pelvis_zones:
        covered_pelvis_zones["crotch_base"]["donorCrotchBaseMinZ_m"] = round(z_don_crotch, 4)
        covered_pelvis_zones["crotch_base"]["fitBriefsCrotchBaseMinZ_m"] = round(z_fit_crotch, 4)
        covered_pelvis_zones["crotch_base"]["crotchBaseDeltaZ_mm"] = crotch_dz_mm

    zone_report = dict(covered_pelvis_zones)
    if not pelvis_preview:
        zones = [
            ("upper_pecs_front", lambda p: (p[:, 2] >= 1.50) & (p[:, 2] <= 1.62) & (np.abs(p[:, 0]) <= 0.16) & (p[:, 1] < -0.05)),
            ("lower_outer_pecs", lambda p: (p[:, 2] >= 1.41) & (p[:, 2] < 1.50) & (np.abs(p[:, 0]) >= 0.08) & (np.abs(p[:, 0]) <= 0.175) & (p[:, 1] < -0.05)),
            ("upper_abs_front", lambda p: (p[:, 2] >= 1.28) & (p[:, 2] < 1.42) & (np.abs(p[:, 0]) <= 0.095) & (p[:, 1] < -0.06)),
            ("lower_abs_front", lambda p: (p[:, 2] >= 1.17) & (p[:, 2] < 1.28) & (np.abs(p[:, 0]) <= 0.095) & (p[:, 1] < -0.06)),
            ("waist_ant_oblique_groove", lambda p: (p[:, 2] >= 1.12) & (p[:, 2] <= 1.34) & (np.abs(p[:, 0]) > 0.085) & (np.abs(p[:, 0]) <= 0.150) & (p[:, 1] < -0.02)),
            ("waist_lateral_flank", lambda p: (p[:, 2] >= 1.12) & (p[:, 2] <= 1.35) & (np.abs(p[:, 0]) >= 0.130) & (np.abs(p[:, 0]) <= 0.185) & (np.abs(p[:, 1]) <= 0.08)),
            ("waist_rear_lovehandle", lambda p: (p[:, 2] >= 1.15) & (p[:, 2] <= 1.34) & (np.abs(p[:, 0]) >= 0.085) & (np.abs(p[:, 0]) <= 0.165) & (p[:, 1] > 0.02)),
            ("lumbar_erectors_back", lambda p: (p[:, 2] >= 1.18) & (p[:, 2] <= 1.35) & (np.abs(p[:, 0]) <= 0.085) & (p[:, 1] > 0.03)),
            ("serratus_lateral_ribs", lambda p: (p[:, 2] >= 1.30) & (p[:, 2] <= 1.49) & (np.abs(p[:, 0]) >= 0.105) & (np.abs(p[:, 0]) <= 0.185) & (p[:, 1] < 0.02)),
            ("scapula_mid_upper_back", lambda p: (p[:, 2] >= 1.36) & (p[:, 2] <= 1.64) & (np.abs(p[:, 0]) <= 0.175) & (p[:, 1] > 0.03)),
            ("deltoid_cap", lambda p: (p[:, 2] >= 1.48) & (p[:, 2] <= 1.64) & (np.abs(p[:, 0]) >= 0.195) & (np.abs(p[:, 0]) <= 0.31)),
            ("bicep_tricep_upper_arm", lambda p: (p[:, 2] >= 1.33) & (p[:, 2] < 1.49) & (np.abs(p[:, 0]) >= 0.21) & (np.abs(p[:, 0]) <= 0.36)),
            ("forearm", lambda p: (p[:, 2] >= 1.12) & (p[:, 2] < 1.34) & (np.abs(p[:, 0]) >= 0.29) & (np.abs(p[:, 0]) <= 0.43)),
            ("outer_hip_trochanter", lambda p: (p[:, 2] >= 0.92) & (p[:, 2] <= 1.12) & (np.abs(p[:, 0]) >= 0.15) & (np.abs(p[:, 0]) <= 0.22)),
            ("quads_front_outer", lambda p: (p[:, 2] >= 0.56) & (p[:, 2] <= 0.92) & (np.abs(p[:, 0]) >= 0.06) & (p[:, 1] < 0.01)),
            ("inner_thigh_adductors", lambda p: (p[:, 2] >= 0.65) & (p[:, 2] <= 0.92) & (np.abs(p[:, 0]) < 0.075)),
            ("hamstrings_back", lambda p: (p[:, 2] >= 0.58) & (p[:, 2] <= 0.92) & (p[:, 1] >= 0.01)),
            ("calves", lambda p: (p[:, 2] >= 0.20) & (p[:, 2] <= 0.50)),
        ]
        for zname, fn in zones:
            m0 = bv0 & fn(posed_lod0) & np.isfinite(e_lod0) & np.isfinite(e_raw)
            m1 = bv1 & fn(posed_lod1) & np.isfinite(e_lod1)
            if np.sum(m0) >= 4 and np.sum(m1) >= 3:
                zone_report[zname] = {
                    "rawCg_p05_med_p95_mm": [round(float(np.percentile(e_raw[m0], q)), 2) for q in (5, 50, 95)],
                    "lod0_p05_med_p95_mm": [round(float(np.percentile(e_lod0[m0], q)), 2) for q in (5, 50, 95)],
                    "lod1_p05_med_p95_mm": [round(float(np.percentile(e_lod1[m1], q)), 2) for q in (5, 50, 95)],
                    "lod1_min_max_mm": [round(float(np.min(e_lod1[m1])), 2), round(float(np.max(e_lod1[m1])), 2)],
                }

    m0_all = bv0 & np.isfinite(e_lod0)
    m1_all = bv1 & np.isfinite(e_lod1)
    audit_summary = {
        "coordinateId": coord_id,
        "mode": "pelvis-preview" if pelvis_preview else "full",
        "crotchBaseDeltaZ_mm": crotch_dz_mm,
        "coveredPelvisZones": covered_pelvis_zones,
        "overallBareBodyLod0_p02_p05_med_p95_p98_mm": None if pelvis_preview else [round(float(np.percentile(e_lod0[m0_all], q)), 2) for q in (2, 5, 50, 95, 98)],
        "overallBareBodyLod1_p02_p05_med_p95_p98_mm": [round(float(np.percentile(e_lod1[m1_all], q)), 2) for q in (2, 5, 50, 95, 98)],
        "zones": zone_report,
    }
    (rev_dir / "deviation_audit.json").write_text(json.dumps(audit_summary, indent=2) + "\n")

    # 2) Render Un-Blinded Signed Millimeter Deviation Heatmap:
    #    - Row 1: Covered Runtime `LOD1 + Exported .glb linenBriefs` Full-Body 5-Angle (`Pelvis 100% Un-Blinded!`)
    #    - Row 2: Covered Pelvis `1:1` Close-Up (`Front`, `3/4 Front`, `Sub-Apron Tilt`, `Arms-Hidden Right Profile`, `Back Glutes`)
    #    - Rows 3–4 (in full mode): Bare Authoring `LOD0` & Bare Runtime `LOD1`
    heat_panels_full = [
        ("Front", (0.0, -3.2, 1.02), (0.0, 0.0, 1.02), 2.12),
        ("3/4 Front", (-2.1, -2.4, 1.02), (0.0, 0.0, 1.02), 2.12),
        ("Right Profile", (-3.2, 0.0, 1.02), (0.0, 0.0, 1.02), 2.12),
        ("Rear 3/4", (-2.1, 2.4, 1.02), (0.0, 0.0, 1.02), 2.12),
        ("Back", (0.0, 3.2, 1.02), (0.0, 0.0, 1.02), 2.12),
    ]
    heat_panels_pelvis = [
        ("Front 1:1", (0.0, -2.2, 1.00), (0.0, 0.0, 1.00), 0.58),
        ("3/4 Front 1:1", (-1.26, -1.80, 1.00), (0.0, 0.0, 1.00), 0.58),
        ("Sub-Apron Tilt 1:1", (0.0, -2.04, 0.18), (0.0, 0.0, 1.00), 0.58),
        ("Arms-Hidden Right Profile 1:1", (-2.2, 0.0, 1.00), (0.0, 0.0, 1.00), 0.58),
        ("Back Glutes 1:1", (0.0, 2.2, 1.00), (0.0, 0.0, 1.00), 0.58),
    ]

    def _add_vc_mesh(name: str, pts_v: np.ndarray, tri_v: np.ndarray, err_v: np.ndarray, mask_v: np.ndarray, mat_vc: bpy.types.Material) -> bpy.types.Object:
        obj_v = _build_mesh_obj(name, pts_v, tri_v, mat_vc)
        me_v = obj_v.data
        ca_v = me_v.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="POINT")
        rgba_v = _err_to_srgb(err_v, mask_v)
        conn_v = weld_connectivity(pts_v, tri_v, decimals=5)
        weld_v, mult_v = conn_v[0], conn_v[2]
        rgba_u = np.column_stack(
            [np.bincount(weld_v, weights=rgba_v[:, c], minlength=len(mult_v)) / mult_v for c in range(4)]
        ).astype(np.float32)
        ca_v.data.foreach_set("color", rgba_u.reshape(-1))
        me_v.update()
        return obj_v

    heat_rows = []
    # Build Covered scene (`posed_lod1 + posed_glb_br_bl`):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    _setup_sculpt_lights(scn)
    mat_vc_c = bpy.data.materials.new("HeatCovMat")
    mat_vc_c.use_nodes = True
    nt_c = mat_vc_c.node_tree
    nt_c.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 0.65
    ca_nd_c = nt_c.nodes.new("ShaderNodeVertexColor")
    ca_nd_c.layer_name = "Col"
    nt_c.links.new(ca_nd_c.outputs["Color"], nt_c.nodes.get("Principled BSDF").inputs["Base Color"])
    obj_cov_body = _add_vc_mesh("HeatCovBody", posed_lod1, low_tri, e_lod1_cov, cv1, mat_vc_c)
    _add_vc_mesh("HeatCovBriefs", posed_glb_br_bl, glb_br_tri, e_briefs, bv_br, mat_vc_c)
    _build_mesh_obj("HeatCovHead", posed_head, head_tri, _make_clay_mat("HeadSlateC", (0.34, 0.35, 0.37), 0.65))
    cam_d = bpy.data.cameras.new("HeatCovCam")
    cam_d.type = "ORTHO"
    cam_o = bpy.data.objects.new("HeatCovCam", cam_d)
    scn.collection.objects.link(cam_o)
    scn.camera = cam_o
    heat_rows.append(_render_panels(cam_o, cam_d, heat_panels_full, 560, 920, tmp_dir))

    # Row 2: Covered `1:1` Pelvis Close-Up with Arms Hidden (`canonical rest_low |X| > 0.205m` stripped so forearm/hand never occludes Right Profile!):
    no_arm_tri_m = np.all(np.abs(rest_low[low_tri, 0]) <= 0.205, axis=1)
    obj_cov_body.hide_render = True
    _add_vc_mesh("HeatCovBodyNoArms", posed_lod1, low_tri[no_arm_tri_m], e_lod1_cov, cv1, mat_vc_c)
    heat_rows.append(_render_panels(cam_o, cam_d, heat_panels_pelvis, 560, 640 if pelvis_preview else 920, tmp_dir))

    if not pelvis_preview:
        for pts_h, tri_h, err_h, bv_h in (
            (posed_lod0, high_tri, e_lod0, bv0),
            (posed_lod1, low_tri, e_lod1, bv1),
        ):
            bpy.ops.wm.read_factory_settings(use_empty=True)
            scn = bpy.context.scene
            _setup_sculpt_lights(scn)
            mat_vc = bpy.data.materials.new("HeatMat")
            mat_vc.use_nodes = True
            nt = mat_vc.node_tree
            bsdf = nt.nodes.get("Principled BSDF")
            bsdf.inputs["Roughness"].default_value = 0.65
            ca_node = nt.nodes.new("ShaderNodeVertexColor")
            ca_node.layer_name = "Col"
            nt.links.new(ca_node.outputs["Color"], bsdf.inputs["Base Color"])
            _add_vc_mesh("HeatBody", pts_h, tri_h, err_h, bv_h, mat_vc)
            _build_mesh_obj("HeatHead", posed_head, head_tri, _make_clay_mat("HeadSlate", (0.34, 0.35, 0.37), 0.65))
            cam_d = bpy.data.cameras.new("HeatCam")
            cam_d.type = "ORTHO"
            cam_o = bpy.data.objects.new("HeatCam", cam_d)
            scn.collection.objects.link(cam_o)
            scn.camera = cam_o
            heat_rows.append(_render_panels(cam_o, cam_d, heat_panels_full, 560, 920, tmp_dir))

    # Allow variable row heights in `_save_grid` (`e.g. 920 full-body row + 640 pelvis zoom row in preview`):
    if pelvis_preview:
        n_c_g = len(heat_rows[0])
        pw_g = heat_rows[0][0].shape[1]
        gap_g = 6
        tot_w_g = n_c_g * pw_g + (n_c_g - 1) * gap_g
        tot_h_g = sum(r[0].shape[0] for r in heat_rows) + (len(heat_rows) - 1) * gap_g
        canvas_g = np.zeros((tot_h_g, tot_w_g, 4), dtype=np.float32)
        canvas_g[:, :, 3] = 1.0
        canvas_g[:, :, :3] = 0.05
        y_cur = tot_h_g
        for row_g in heat_rows:
            rh_g = row_g[0].shape[0]
            y_cur -= rh_g
            for c_i, tile_g in enumerate(row_g):
                x0_g = c_i * (pw_g + gap_g)
                canvas_g[y_cur : y_cur + rh_g, x0_g : x0_g + pw_g, :] = tile_g
            y_cur -= gap_g
        out_im_g = bpy.data.images.new("GridOutP", width=tot_w_g, height=tot_h_g, alpha=True)
        out_im_g.colorspace_settings.name = "sRGB"
        out_im_g.pixels.foreach_set(canvas_g.reshape(-1))
        out_im_g.filepath_raw = str(rev_dir / "signed-deviation-heatmap.png")
        out_im_g.file_format = "PNG"
        out_im_g.save()
        bpy.data.images.remove(out_im_g)
    else:
        _save_grid(heat_rows, rev_dir / "signed-deviation-heatmap.png")

    # 3) Render Matched-Camera `Donor vs LOD1 Clay vs .glb PBR`:
    all_comp_panels = [
        ("Full Front", (0.0, -3.2, 1.03), (0.0, 0.0, 1.03), 2.16),
        ("Full 3/4", (-2.1, -2.4, 1.03), (0.0, 0.0, 1.03), 2.16),
        ("Right Profile", (-3.2, 0.0, 1.03), (0.0, 0.0, 1.03), 2.16),
        ("Full Back", (0.0, 3.2, 1.03), (0.0, 0.0, 1.03), 2.16),
        ("Torso/Waist/Arms Front-3/4", (-1.05, -2.4, 1.40), (0.0, 0.0, 1.40), 0.84),
        ("Back/Scapula/Arms Close-Up", (0.65, 2.5, 1.42), (0.0, 0.0, 1.42), 0.84),
        ("Waist/Briefs/Quads/Calves", (-1.35, -2.2, 0.78), (0.0, 0.0, 0.78), 1.05),
    ]
    comp_panels = [all_comp_panels[0], all_comp_panels[2], all_comp_panels[3]] if concept_only else all_comp_panels
    pw_c, ph_c = 550, 920

    # Row 0: Reference 420k Meshy Donor
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    _setup_sculpt_lights(scn)
    _build_mesh_obj("DonorClay", donor_reg, donor_tri, _make_clay_mat("DonMat", (0.58, 0.58, 0.59), 0.48))
    cam_d = bpy.data.cameras.new("CompCam0")
    cam_d.type = "ORTHO"
    cam_o = bpy.data.objects.new("CompCam0", cam_d)
    scn.collection.objects.link(cam_o)
    scn.camera = cam_o
    row_donor = _render_panels(cam_o, cam_d, comp_panels, pw_c, ph_c, tmp_dir)

    # Row 1: Fitted Posed LOD1 Clay + ACTUAL Exported `.glb` `linenBriefs` (`exact vertex parity with Col 7 PBR & Row 6 Overlays!`)
    sh_posed_pts, sh_tri = posed_glb_br_bl, glb_br_tri
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    _setup_sculpt_lights(scn)
    clay_skin = _make_clay_mat("FitClay", (0.58, 0.58, 0.59), 0.48)
    comb_lod1_pts = np.vstack([posed_lod1, posed_head])
    comb_lod1_tri = np.vstack([low_tri, head_tri + len(posed_lod1)])
    _build_mesh_obj("Lod1BodyAndHead", comb_lod1_pts, comb_lod1_tri, clay_skin)
    _build_mesh_obj("Lod1Briefs", sh_posed_pts, sh_tri, _make_clay_mat("BriefClay", (0.66, 0.63, 0.57), 0.82))
    cam_d = bpy.data.cameras.new("CompCam1")
    cam_d.type = "ORTHO"
    cam_o = bpy.data.objects.new("CompCam1", cam_d)
    scn.collection.objects.link(cam_o)
    scn.camera = cam_o
    row_lod1_clay = _render_panels(cam_o, cam_d, comp_panels, pw_c, ph_c, tmp_dir)

    # Row 2: Re-Imported Exported Runtime `.glb` PBR (resetting any auto-assigned alphabetical action such as `Head left 25` to Rest!):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    for obj_imp in bpy.data.objects:
        if obj_imp.type == "ARMATURE":
            if obj_imp.animation_data is not None:
                obj_imp.animation_data.action = None
            for pb in obj_imp.pose.bones:
                pb.location = (0.0, 0.0, 0.0)
                pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
                pb.rotation_euler = (0.0, 0.0, 0.0)
                pb.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()
    scn = bpy.context.scene
    _setup_sculpt_lights(scn)
    cam_d = bpy.data.cameras.new("CompCam2")
    cam_d.type = "ORTHO"
    cam_o = bpy.data.objects.new("CompCam2", cam_d)
    scn.collection.objects.link(cam_o)
    scn.camera = cam_o
    row_glb_pbr = _render_panels(cam_o, cam_d, comp_panels, pw_c, ph_c, tmp_dir)

    if not concept_only:
        _save_grid([row_donor, row_lod1_clay, row_glb_pbr], rev_dir / "donor-vs-glb-pbr-1to1.png")
        _save_grid([row_glb_pbr[:4] + [row_glb_pbr[4], row_glb_pbr[6]]], rev_dir / "exported-glb-pbr-turnaround.png")

    # 4) Matched-stature 2D Concept (`explicit --concept-sheet`, `selected-grid.json`, or `candidates/*-<coord_id>.png`) vs 3D Donor vs Runtime LOD1 Clay vs Exported `.glb` PBR:
    chosen_cand: Path | None = explicit_concept if (explicit_concept is not None and explicit_concept.is_file()) else None
    if chosen_cand is None:
        sel_grid_p = study_dir / "grid-9-20261112" / "selected-grid.json"
        if sel_grid_p.is_file():
            sel_grid = json.loads(sel_grid_p.read_text())
            if coord_id in sel_grid and Path(sel_grid[coord_id]["path"]).is_file():
                chosen_cand = Path(sel_grid[coord_id]["path"])
    if chosen_cand is None:
        cand_matches = sorted((study_dir / "grid-9-20261112" / "candidates").glob(f"*-{coord_id}.png"))
        if cand_matches:
            chosen_cand = cand_matches[-1]
    if chosen_cand is not None:
        import subprocess

        i_f, i_p, i_b = (0, 1, 2) if concept_only else (0, 2, 3)
        for vname, tile_arr in [
            ("donor_front", row_donor[i_f]), ("donor_prof", row_donor[i_p]), ("donor_back", row_donor[i_b]),
            ("lod1_front", row_lod1_clay[i_f]), ("lod1_prof", row_lod1_clay[i_p]), ("lod1_back", row_lod1_clay[i_b]),
            ("glb_front", row_glb_pbr[i_f]), ("glb_prof", row_glb_pbr[i_p]), ("glb_back", row_glb_pbr[i_b]),
        ]:
            im_tmp = bpy.data.images.new("TmpT", width=tile_arr.shape[1], height=tile_arr.shape[0], alpha=True)
            im_tmp.colorspace_settings.name = "sRGB"
            im_tmp.pixels.foreach_set(tile_arr.reshape(-1))
            im_tmp.filepath_raw = str(tmp_dir / f"ccomp_{vname}.png")
            im_tmp.file_format = "PNG"
            im_tmp.save()
            bpy.data.images.remove(im_tmp)
        pil_stitch = """
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
tmp, c_path, out_p, cid = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
c_im_all = Image.open(c_path).convert("RGB")
cw, ch = c_im_all.size
arr = np.asarray(c_im_all, dtype=np.float32)
fg_all = np.linalg.norm(arr - arr[8, 8][None, None, :], axis=2) > 18.0
col_cnt = fg_all.sum(axis=0)
s1 = int(cw * 0.30) + int(np.argmin(col_cnt[int(cw * 0.30):int(cw * 0.44)]))
s2 = int(cw * 0.56) + int(np.argmin(col_cnt[int(cw * 0.56):int(cw * 0.70)]))
c_views = {"front": c_im_all.crop((0, 0, s1, ch)), "prof": c_im_all.crop((s1, 0, s2, ch)), "back": c_im_all.crop((s2, 0, cw, ch))}
def b_fg(im, thr=14.0):
    a = np.asarray(im, dtype=np.float32)
    ys, xs = np.nonzero(np.linalg.norm(a - a[6, 6][None, None, :], axis=2) > thr)
    y0, y1 = int(ys.min()), int(ys.max())
    tx = xs[ys < y0 + max(12, int(0.10 * (y1 - y0)))]
    return y0, y1, float(0.5 * (tx.min() + tx.max())) if len(tx) else float(0.5 * (xs.min() + xs.max()))
def crop_u(im, ty0, ty1, txm, f0, f1, dw, dh):
    hf = ty1 - ty0
    cy0, cy1 = int(round(ty0 + f0 * hf)), int(round(ty0 + f1 * hf))
    bw = int(round(max(1, cy1 - cy0) * (dw / dh)))
    cx0 = int(round(txm - 0.5 * bw))
    cx1 = cx0 + bw
    px, py = max(0, -cx0, cx1 - im.width) + 8, max(0, -cy0, cy1 - im.height) + 8
    can = Image.new("RGB", (im.width + 2*px, im.height + 2*py), im.getpixel((6, 6)))
    can.paste(im, (px, py))
    return can.crop((cx0+px, cy0+py, cx1+px, cy1+py)).resize((dw, dh), Image.Resampling.LANCZOS)
fw_t, fh_t, zw_t, zh_t = 380, 646, 420, 646
board = Image.new("RGB", (12 + 4*(fw_t+8) + 12 + 3*(zw_t+8) + 12, 38 + 3*(fh_t+30) + 12), (20, 22, 26))
draw = ImageDraw.Draw(board)
draw.text((14, 10), f"{cid} · Matched-Stature Normal Comparison: 2D Concept vs 3D Donor vs Runtime LOD1 Clay vs Exported .glb PBR", fill=(255, 225, 150))
for ri, (vk, vt) in enumerate([("front", "Front"), ("prof", "Right Profile"), ("back", "Back")]):
    d_im = Image.open(tmp / f"ccomp_donor_{vk}.png").convert("RGB")
    l_im = Image.open(tmp / f"ccomp_lod1_{vk}.png").convert("RGB")
    g_im = Image.open(tmp / f"ccomp_glb_{vk}.png").convert("RGB")
    ry0, ry1, rxm = b_fg(c_views[vk], 18.0)
    ty0, ty1, txm = b_fg(l_im, 12.0)
    sc = (ty1 - ty0) / max(ry1 - ry0, 1)
    rsz = c_views[vk].resize((int(round(c_views[vk].width*sc)), int(round(c_views[vk].height*sc))), Image.Resampling.LANCZOS)
    c_im = Image.new("RGB", l_im.size, c_views[vk].getpixel((6, 6)))
    c_im.paste(rsz, (int(round(txm - rxm*sc)), int(round(ty0 - ry0*sc))))
    oy, ox = 38 + ri * (fh_t + 30), 12
    for lbl, s_im in [(f"2D Concept · {vt}", c_im), (f"3D Donor · {vt}", d_im), (f"Fit LOD1 Clay · {vt}", l_im), (f"Exported .glb PBR · {vt}", g_im)]:
        draw.text((ox + 4, oy + 4), lbl, fill=(230, 236, 244))
        board.paste(s_im.resize((fw_t, fh_t), Image.Resampling.LANCZOS), (ox, oy + 22))
        ox += fw_t + 8
    ox += 12
    for lbl, s_im in [(f"2D Concept · 1:1 ({vt})", c_im), (f"Fit LOD1 Clay · 1:1 ({vt})", l_im), (f"Exported .glb PBR · 1:1 ({vt})", g_im)]:
        draw.text((ox + 4, oy + 4), lbl, fill=(255, 232, 175) if "Concept" in lbl else (230, 236, 244))
        board.paste(crop_u(s_im, ty0, ty1, txm, 0.08, 0.58, zw_t, zh_t), (ox, oy + 22))
        ox += zw_t + 8
board.save(out_p, format="PNG")
"""
        subprocess.run(
            [
                "/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python",
                "-c",
                pil_stitch,
                str(tmp_dir),
                str(chosen_cand),
                str(rev_dir / "concept-vs-donor-clay-pbr.png"),
                coord_id,
            ],
            check=True,
        )

    if tmp_dir.exists():
        for p in tmp_dir.glob("*"):
            p.unlink(missing_ok=True)
        tmp_dir.rmdir()

    print("DEVIATION_AUDIT_SUMMARY_START")
    print(json.dumps(audit_summary, indent=2))


if __name__ == "__main__":
    main()
