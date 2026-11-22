#!/usr/bin/env python3
"""Multi-pose & novel-pose whole-body deformation and garment-clearance audit.

Evaluates an exported runtime `.glb` character (plus optional Stage A `M050-F100`
for side-by-side extreme-muscle vs extreme-fullness comparison) across 10 poses
spanning shipped animation clips (`Idle`, `Rest A-Pose`, `Walk`, `Run`) and 6
heldout novel articulation poses (`Mid-Abduction 62 deg`, `Combat Guard 100 deg`,
`Axial Spine Twist 32 deg + Side Bend 18 deg`, `Deep Squat 84/90 deg`,
`Asymmetric Split Lunge`, and `Heroic Overhead Reach`).

Writes:
- `novel_pose_audit.json` (bone-relative triangle inversion count, collar seam
  closure, and `linenBriefs` skin-overlap & self-intersection counts per pose),
- `signoff-12-novel-poses-pbr-gallery.png` (20-panel 10-pose PBR gallery),
- `signoff-13-novel-poses-clay-audit.png` (welded-normal Clay + 1:1 high-strain zooms),
- `signoff-14-muscle-vs-fat-novel-poses.png` (when `--stage-a-fit-dir` is supplied).
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree
import numpy as np

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from mesh_rig_utils import gltf_to_blender, self_intersections, vertex_normals, weld_connectivity  # noqa: E402
import export_covered_glb as ecg  # noqa: E402

PIL_PYTHON = "/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python"


def _look_at(obj: bpy.types.Object, pos: tuple[float, float, float], target: tuple[float, float, float]) -> None:
    obj.location = Vector(pos)
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def _setup_lights(scn: bpy.types.Scene) -> None:
    scn.render.engine = "BLENDER_EEVEE"
    scn.view_settings.view_transform = "Standard"
    scn.view_settings.look = "None"
    scn.render.film_transparent = False

    world = bpy.data.worlds.new("NovelPoseWorld")
    scn.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs["Color"].default_value = (0.16, 0.165, 0.175, 1.0)
        bg.inputs["Strength"].default_value = 0.18

    for name, loc, energy, sz, col in (
        ("NP_FrontKey", (-1.35, -2.85, 2.55), 112.0, 1.90, (1.0, 0.985, 0.96)),
        ("NP_FrontFill", (2.15, -2.55, 1.60), 38.0, 2.35, (0.99, 0.985, 0.98)),
        ("NP_BackKey", (1.35, 2.85, 2.55), 112.0, 1.90, (1.0, 0.985, 0.96)),
        ("NP_BackFill", (-2.15, 2.55, 1.60), 38.0, 2.35, (0.99, 0.985, 0.98)),
    ):
        ld = bpy.data.lights.new(name=name, type="AREA")
        ld.energy = energy
        ld.size = sz
        ld.color = col
        lo = bpy.data.objects.new(name=name, object_data=ld)
        scn.collection.objects.link(lo)
        _look_at(lo, loc, (0.0, 0.0, 1.05))


def _make_clay_mat(name: str, rgb: tuple[float, float, float], rough: float = 0.48) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = 0.0
    return mat


NOVEL_POSE_SPECS: list[dict] = [
    {
        "id": "idle",
        "title": "1. Idle (Arms Lowered)",
        "kind": "clip",
        "clip": "Idle",
        "frame": 15,
        "views": [("front", 0.0, 1.00, 2.16), ("back", 180.0, 1.00, 2.16)],
        "zoom": ("1. Idle Lowered · 1:1 Back/Flanks", 180.0, 1.37, 0.78),
    },
    {
        "id": "rest_apose",
        "title": "2. Rest A-Pose (~42°)",
        "kind": "rest",
        "views": [("front", 0.0, 1.00, 2.16), ("back", 180.0, 1.00, 2.16)],
        "zoom": ("2. Rest Half-Raised · 1:1 Back/Flanks", 180.0, 1.37, 0.78),
    },
    {
        "id": "mid_abduct",
        "title": "3. Mid-Abduction (~62°)",
        "kind": "world_bones",
        # Blender world axes (+X Left, -Y Front, +Z Up): Left arm UP = -ry, Right arm UP = +ry:
        "world_rots": [
            ("clavicle_l", (0.0, -5.0, 0.0)),
            ("upperarm_l", (0.0, -20.0, 0.0)),
            ("clavicle_r", (0.0, 5.0, 0.0)),
            ("upperarm_r", (0.0, 20.0, 0.0)),
        ],
        "views": [("front", 0.0, 1.00, 2.18), ("back", 180.0, 1.00, 2.18)],
        "zoom": ("3. Mid-Abduction 62° · 1:1 Back/Lats", 180.0, 1.42, 0.82),
    },
    {
        "id": "walk_stride",
        "title": "4. Walk Mid-Stride",
        "kind": "clip",
        "clip": "Walk",
        "frame": 8,
        "views": [("qfront", 32.0, 1.00, 2.16), ("qback", 148.0, 1.00, 2.16)],
        "zoom": ("4. Walk Stride · 1:1 Rear 3/4 Torso", 148.0, 1.36, 0.82),
    },
    {
        "id": "run_stride",
        "title": "5. Run Peak Stride",
        "kind": "clip",
        "clip": "Run",
        "frame": 14,
        "views": [("qfront", -38.0, 0.98, 2.16), ("prof", 88.0, 0.98, 2.16)],
        "zoom": ("5. Run Peak · 1:1 Stride Pelvis/Quads", -52.0, 0.95, 0.86),
    },
    {
        "id": "combat_guard",
        "title": "6. Combat Guard (95° Elbows)",
        "kind": "world_bones",
        # Orthodox athletic boxing guard: both arms swung forward (-rz for L, +rz for R) & adducted slightly,
        # with clean anatomical cubital elbow flexion (+62 / +70 deg on top of natural rest bend -> ~95-100 deg guard!):
        "world_rots": [
            ("spine_01", (4.0, 0.0, -7.0)),
            ("spine_02", (5.0, 2.0, -8.0)),
            ("spine_03", (5.0, 2.0, -7.0)),
            ("neck_01", (-6.0, -2.0, 12.0)),
            ("head", (-5.0, -1.0, 10.0)),
            ("clavicle_l", (0.0, 2.0, -6.0)),
            ("upperarm_l", (-28.0, 13.0, -25.0)),
            ("clavicle_r", (0.0, -3.0, 6.0)),
            ("upperarm_r", (-21.0, -17.0, 29.0)),
            ("thigh_l", (-18.0, -6.0, 8.0)),
            ("calf_l", (22.0, 0.0, 0.0)),
            ("foot_l", (-6.0, 0.0, 0.0)),
            ("thigh_r", (12.0, 6.0, -10.0)),
            ("calf_r", (16.0, 0.0, 0.0)),
        ],
        "elbow_flex_deg": {"l": 56.0, "r": 68.0},
        "views": [("qfront", -28.0, 1.00, 2.16), ("qback", 152.0, 1.00, 2.16)],
        "zoom": ("6. Combat Guard · 1:1 Flexed Arms/Chest", -26.0, 1.44, 0.80),
    },
    {
        "id": "spine_twist_bend",
        "title": "7. Twist 32° + Side Bend 18°",
        "kind": "world_bones",
        # Progressive axial twist (+Z = turn chest Left) + lateral bend (-Y = bend Right, stretching Left flank & compressing Right flank):
        "world_rots": [
            ("spine_01", (2.0, -4.5, 8.0)),
            ("spine_02", (2.0, -5.0, 9.0)),
            ("spine_03", (2.0, -5.0, 9.0)),
            ("spine_04", (1.0, -3.5, 6.0)),
            ("neck_01", (-3.0, 5.0, -10.0)),
            ("head", (-2.0, 4.0, -10.0)),
            ("clavicle_l", (0.0, -4.0, -4.0)),
            ("upperarm_l", (-10.0, -18.0, -12.0)),
            ("clavicle_r", (0.0, -3.0, 4.0)),
            ("upperarm_r", (-6.0, -12.0, 10.0)),
            ("thigh_l", (-10.0, -5.0, 5.0)),
            ("calf_l", (12.0, 0.0, 0.0)),
            ("thigh_r", (8.0, 5.0, -5.0)),
            ("calf_r", (10.0, 0.0, 0.0)),
        ],
        "elbow_flex_deg": {"l": 24.0, "r": 22.0},
        "views": [("front", 0.0, 1.00, 2.18), ("back", 180.0, 1.00, 2.18)],
        "zoom": ("7. Spine Twist+Bend · 1:1 Waist/Ribs", 0.0, 1.35, 0.80),
    },
    {
        "id": "deep_squat",
        "title": "8. Deep Squat (80° Hip/86° Knee)",
        "kind": "world_bones",
        "pelvis_dz": -0.33,
        # Forward hip flexion = -rx, knee flexion = +rx, ankle dorsiflexion = -rx, forward torso balance = +rx, arms forward counterbalance:
        "world_rots": [
            ("spine_01", (10.0, 0.0, 0.0)),
            ("spine_02", (9.0, 0.0, 0.0)),
            ("spine_03", (7.0, 0.0, 0.0)),
            ("neck_01", (-12.0, 0.0, 0.0)),
            ("head", (-10.0, 0.0, 0.0)),
            ("clavicle_l", (0.0, 2.0, -6.0)),
            ("upperarm_l", (-38.0, 12.0, -28.0)),
            ("clavicle_r", (0.0, -2.0, 6.0)),
            ("upperarm_r", (-38.0, -12.0, 28.0)),
            ("thigh_l", (-80.0, -12.0, 10.0)),
            ("calf_l", (86.0, 0.0, 0.0)),
            ("foot_l", (-18.0, 0.0, 0.0)),
            ("thigh_r", (-80.0, 12.0, -10.0)),
            ("calf_r", (86.0, 0.0, 0.0)),
            ("foot_r", (-18.0, 0.0, 0.0)),
        ],
        "elbow_flex_deg": {"l": 28.0, "r": 28.0},
        "views": [("qfront", 34.0, 0.82, 1.94), ("qback", 146.0, 0.82, 1.94)],
        "zoom": ("8. Deep Squat · 1:1 Glutes/Hips/Knees", 142.0, 0.76, 0.86),
    },
    {
        "id": "split_lunge",
        "title": "9. Asymmetric Split Lunge",
        "kind": "world_bones",
        "pelvis_dz": -0.22,
        "world_rots": [
            ("spine_01", (6.0, 0.0, -5.0)),
            ("spine_02", (5.0, 0.0, -5.0)),
            ("neck_01", (-6.0, 0.0, 8.0)),
            ("head", (-4.0, 0.0, 6.0)),
            ("upperarm_r", (-32.0, -14.0, 22.0)),
            ("upperarm_l", (18.0, 14.0, 8.0)),
            ("thigh_l", (-74.0, -5.0, 4.0)),
            ("calf_l", (78.0, 0.0, 0.0)),
            ("foot_l", (-12.0, 0.0, 0.0)),
            ("thigh_r", (28.0, 4.0, -4.0)),
            ("calf_r", (26.0, 0.0, 0.0)),
            ("foot_r", (-22.0, 0.0, 0.0)),
        ],
        "elbow_flex_deg": {"l": 24.0, "r": 38.0},
        "views": [("qfront", -55.0, 0.86, 2.04), ("qback", 132.0, 0.86, 2.04)],
        "zoom": ("9. Split Lunge · 1:1 Pelvis/Briefs/Thighs", -50.0, 0.82, 0.86),
    },
    {
        "id": "heroic_reach",
        "title": "10. Asymmetric Overhead Reach",
        "kind": "world_bones",
        # Natural 2:1 scapulohumeral rhythm (`+14 deg clavicle upward rotation + +30 deg glenohumeral abduction + +10 deg thoracic
        # lateral tilt = ~96 deg overhead reach!`) with balanced cervical counter-rotation (`matching Poses 6-9`):
        "world_rots": [
            ("spine_02", (-2.0, -4.5, 4.0)),
            ("spine_03", (-2.0, -5.5, 5.0)),
            ("neck_01", (1.0, 5.0, -4.0)),
            ("head", (1.0, 4.0, -4.0)),
            ("clavicle_l", (2.0, -14.0, -3.0)),
            ("upperarm_l", (-8.0, -30.0, -6.0)),
            ("clavicle_r", (0.0, -3.0, 0.0)),
            ("upperarm_r", (6.0, -18.0, 4.0)),
            ("thigh_l", (-10.0, -5.0, 4.0)),
            ("calf_l", (14.0, 0.0, 0.0)),
            ("thigh_r", (8.0, 5.0, -4.0)),
            ("calf_r", (8.0, 0.0, 0.0)),
        ],
        "elbow_flex_deg": {"l": 16.0, "r": 18.0},
        "views": [("front", -8.0, 1.08, 2.48), ("back", 172.0, 1.08, 2.48)],
        "zoom": ("10. Overhead Reach · 1:1 Back Twist/Lat", 180.0, 1.40, 0.86),
    },
]


def _rotate_pose_bone_world(rig: bpy.types.Object, bname: str, r_world_3x3: Matrix) -> None:
    if bname not in rig.pose.bones:
        return
    pb = rig.pose.bones[bname]
    m_cur = rig.matrix_world @ pb.matrix
    p_head = m_cur.translation.copy()
    m_new = Matrix.Translation(p_head) @ r_world_3x3.to_4x4() @ Matrix.Translation(-p_head) @ m_cur
    pb.matrix = rig.matrix_world.inverted() @ m_new
    bpy.context.view_layer.update()


def _apply_pose_spec(rig: bpy.types.Object, spec: dict, rest_pelvis_loc: Vector) -> None:
    if rig.animation_data:
        for trk in rig.animation_data.nla_tracks:
            trk.mute = True
        rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.matrix_basis.identity()
    rig.pose.bones["pelvis"].location = Vector((0.0, 0.0, 0.0))
    bpy.context.view_layer.update()

    kind = spec["kind"]
    if kind == "clip":
        act = bpy.data.actions.get(spec["clip"])
        if act is not None and rig.animation_data is not None:
            rig.animation_data.action = act
            if hasattr(rig.animation_data, "action_slot") and getattr(act, "slots", None):
                rig.animation_data.action_slot = act.slots[0]
            bpy.context.scene.frame_set(int(spec["frame"]))
    elif kind == "world_bones":
        bpy.context.scene.frame_set(0)
        dz = float(spec.get("pelvis_dz", 0.0))
        if abs(dz) > 1e-6:
            pb_p = rig.pose.bones["pelvis"]
            m_p = rig.matrix_world @ pb_p.matrix
            m_p.translation += Vector((0.0, 0.0, dz))
            pb_p.matrix = rig.matrix_world.inverted() @ m_p
            bpy.context.view_layer.update()
        for bname, (rx, ry, rz) in spec.get("world_rots", []):
            r_w = Euler((math.radians(rx), math.radians(ry), math.radians(rz)), "XYZ").to_matrix()
            _rotate_pose_bone_world(rig, bname, r_w)
        for sfx, deg_f in spec.get("elbow_flex_deg", {}).items():
            up_n, lo_n, ha_n = f"upperarm_{sfx}", f"lowerarm_{sfx}", f"hand_{sfx}"
            if up_n in rig.pose.bones and lo_n in rig.pose.bones and ha_n in rig.pose.bones:
                p_sh = (rig.matrix_world @ rig.pose.bones[up_n].matrix).translation
                p_el = (rig.matrix_world @ rig.pose.bones[lo_n].matrix).translation
                p_wr = (rig.matrix_world @ rig.pose.bones[ha_n].matrix).translation
                u_up = (p_el - p_sh).normalized()
                u_fo = (p_wr - p_el).normalized()
                ax_h = u_up.cross(u_fo)
                if ax_h.length > 1e-5:
                    r_el = Quaternion(ax_h.normalized(), math.radians(float(deg_f))).to_matrix()
                    _rotate_pose_bone_world(rig, lo_n, r_el)
    else:
        bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    _ = rest_pelvis_loc


def _eval_mesh_world(obj: bpy.types.Object, deps) -> tuple[np.ndarray, np.ndarray]:
    eo = obj.evaluated_get(deps)
    me = eo.to_mesh()
    me.calc_loop_triangles()
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    pts = co.reshape(-1, 3).astype(np.float64)
    mw = np.array(eo.matrix_world, dtype=np.float64)
    pts = pts @ mw[:3, :3].T + mw[:3, 3]
    tb = np.empty(len(me.loop_triangles) * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("vertices", tb)
    tri = tb.reshape(-1, 3).astype(np.int64)
    eo.to_mesh_clear()
    return pts, tri


def _audit_and_render_glb(
    glb_path: Path,
    tmp_dir: Path,
    tag: str,
    pose_specs: list[dict],
    render_pbr: bool = True,
    render_clay: bool = False,
    pw: int = 440,
    ph: int = 620,
) -> dict:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    scn = bpy.context.scene
    _setup_lights(scn)
    scn.render.resolution_percentage = 100
    scn.render.image_settings.file_format = "PNG"

    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    meshes = {o.name: o for o in bpy.data.objects if o.type == "MESH" and o.name != "Icosphere"}
    for extra in [o for o in bpy.data.objects if o.type == "MESH" and o.name == "Icosphere"]:
        bpy.data.objects.remove(extra, do_unlink=True)

    body_obj = meshes["bodySkin"]
    head_obj = meshes["headSkin"]
    briefs_obj = meshes.get("linenBriefs") or meshes.get("studioShorts")

    b_names = [b.name for b in rig.pose.bones]
    vg_to_bi = {vg.index: b_names.index(vg.name) for vg in body_obj.vertex_groups if vg.name in b_names}
    nv = len(body_obj.data.vertices)
    v_bi = np.zeros((nv, 4), dtype=np.int64)
    v_bw = np.zeros((nv, 4), dtype=np.float64)
    for vi, v in enumerate(body_obj.data.vertices):
        pairs = sorted(
            [(vg_to_bi[g.group], g.weight) for g in v.groups if g.group in vg_to_bi and g.weight > 0.0],
            key=lambda x: -x[1],
        )[:4]
        s_w = sum(w for _, w in pairs)
        for k, (bi, w) in enumerate(pairs):
            v_bi[vi, k] = bi
            v_bw[vi, k] = (w / s_w) if s_w > 0.0 else 0.0

    # Reset to Rest A-Pose and record rest geometry + collar seam pairs:
    rest_pelvis_loc = rig.pose.bones["pelvis"].location.copy()
    _apply_pose_spec(rig, {"kind": "rest"}, rest_pelvis_loc)
    deps0 = bpy.context.evaluated_depsgraph_get()
    b_rest, b_tri = _eval_mesh_world(body_obj, deps0)
    h_rest, _ = _eval_mesh_world(head_obj, deps0)
    c0 = np.cross(b_rest[b_tri[:, 1]] - b_rest[b_tri[:, 0]], b_rest[b_tri[:, 2]] - b_rest[b_tri[:, 0]])
    n0 = c0 / np.maximum(np.linalg.norm(c0, axis=1, keepdims=True), 1e-12)
    rest_bone_mats = [np.array((rig.matrix_world @ pb.matrix).to_3x3(), dtype=np.float64) for pb in rig.pose.bones]

    # Match coincident collar-seam vertices (<0.2mm in Rest) to verify 0.000mm gap across all poses:
    d_bh = np.linalg.norm(b_rest[:, None, :] - h_rest[None, :, :], axis=2)
    seam_bi, seam_hi = np.where(d_bh < 2.0e-4)

    br_conn = None
    if briefs_obj is not None:
        br_r, br_t = _eval_mesh_world(briefs_obj, deps0)
        br_conn = weld_connectivity(br_r, br_t, decimals=5)

    cam_d = bpy.data.cameras.new(f"Cam_{tag}")
    cam_d.type = "ORTHO"
    cam_o = bpy.data.objects.new(f"Cam_{tag}", cam_d)
    scn.collection.objects.link(cam_o)
    scn.camera = cam_o

    def _render_view(out_file: Path, az_deg: float, cz: float, oscale: float, w_px: int, h_px: int) -> None:
        scn.render.resolution_x = w_px
        scn.render.resolution_y = h_px
        rad = math.radians(az_deg)
        dist = 3.2
        _look_at(cam_o, (dist * math.sin(rad), -dist * math.cos(rad), cz), (0.0, 0.0, cz))
        cam_d.ortho_scale = oscale
        scn.render.filepath = str(out_file)
        bpy.ops.render.render(write_still=True)

    orig_mats = {name: [slot.material for slot in obj.material_slots] for name, obj in meshes.items()}
    clay_skin = _make_clay_mat(f"ClaySkin_{tag}", (0.58, 0.58, 0.59), 0.48)
    clay_brief = _make_clay_mat(f"ClayBrief_{tag}", (0.67, 0.63, 0.56), 0.84)

    pose_metrics: dict[str, dict] = {}
    for spec in pose_specs:
        pid = spec["id"]
        _apply_pose_spec(rig, spec, rest_pelvis_loc)
        deps = bpy.context.evaluated_depsgraph_get()
        bp, bt = _eval_mesh_world(body_obj, deps)
        hp, _ = _eval_mesh_world(head_obj, deps)

        cc = np.cross(bp[bt[:, 1]] - bp[bt[:, 0]], bp[bt[:, 2]] - bp[bt[:, 0]])
        areas = 0.5 * np.linalg.norm(cc, axis=1)
        nc = cc / np.maximum(np.linalg.norm(cc, axis=1, keepdims=True), 1e-12)
        cur_bone_mats = [np.array((rig.matrix_world @ pb.matrix).to_3x3(), dtype=np.float64) for pb in rig.pose.bones]
        rel_r = np.array([cur_bone_mats[i] @ rest_bone_mats[i].T for i in range(len(b_names))])
        v_r = np.einsum("vk,vkij->vij", v_bw, rel_r[v_bi])
        t_r = v_r[bt].mean(axis=1)
        n_exp = np.einsum("tij,tj->ti", t_r, n0)
        n_exp /= np.maximum(np.linalg.norm(n_exp, axis=1, keepdims=True), 1e-12)
        dots = np.einsum("ti,ti->t", nc, n_exp)
        inv_idx = np.flatnonzero(dots <= 0.0)
        zero_idx = np.flatnonzero(areas < 1e-9)
        seam_gap_mm = (
            float(np.max(np.linalg.norm(bp[seam_bi] - hp[seam_hi], axis=1)) * 1000.0)
            if len(seam_bi)
            else 0.0
        )

        ov_cnt = 0
        br_sx = 0
        if briefs_obj is not None and br_conn is not None:
            brp, brt = _eval_mesh_world(briefs_obj, deps)
            bvh_b = BVHTree.FromPolygons(bp.tolist(), bt.tolist(), all_triangles=True)
            bvh_br = BVHTree.FromPolygons(brp.tolist(), brt.tolist(), all_triangles=True)
            ov_cnt = len(bvh_b.overlap(bvh_br))
            br_sx = len(self_intersections(brp, brt, br_conn[0]))

        pose_metrics[pid] = {
            "title": spec["title"],
            "trueBoneRelativeInvertedTriangles": int(len(inv_idx)),
            "invertedSampleRestCentroidsM": [
                [round(float(v), 3) for v in b_rest[bt[i]].mean(axis=0)] for i in inv_idx[:6]
            ],
            "zeroAreaCollapsedTriangles": int(len(zero_idx)),
            "collarSeamMaxGapMm": round(seam_gap_mm, 5),
            "linenBriefsSkinOverlapPairs": int(ov_cnt),
            "linenBriefsSelfIntersections": int(br_sx),
        }

        if render_pbr:
            for mname, mobj in meshes.items():
                for si, mat in enumerate(orig_mats[mname]):
                    mobj.material_slots[si].material = mat
            for v_id, az, cz, osc in spec["views"]:
                _render_view(tmp_dir / f"{tag}_pbr_{pid}_{v_id}.png", az, cz, osc, pw, ph)

        if render_clay:
            # Build a temporary watertight posed `bodySkin + headSkin` Clay mesh with recomputed posed welded normals
            # so Clay inspection shows true posed geometry without frozen rest-normal or split-object collar steps:
            _, ht = _eval_mesh_world(head_obj, deps)
            comb_p = np.vstack([bp, hp])
            comb_t = np.vstack([bt, ht + len(bp)])
            comb_w = weld_connectivity(comb_p, comb_t, decimals=4)[0]
            comb_vn = vertex_normals(comb_p, comb_t, comb_w)
            tmp_me = bpy.data.meshes.new("TmpWeldedClay")
            tmp_me.from_pydata(comb_p.tolist(), [], comb_t.tolist())
            tmp_me.polygons.foreach_set("use_smooth", [True] * len(tmp_me.polygons))
            tmp_me.normals_split_custom_set_from_vertices([tuple(v) for v in comb_vn])
            tmp_me.materials.append(clay_skin)
            tmp_ob = bpy.data.objects.new("TmpWeldedClay", tmp_me)
            scn.collection.objects.link(tmp_ob)

            body_obj.hide_render = True
            head_obj.hide_render = True
            for mname, mobj in meshes.items():
                if mname in ("bodySkin", "headSkin"):
                    continue
                is_garment = mname in ("linenBriefs", "studioShorts")
                for si in range(len(mobj.material_slots)):
                    mobj.material_slots[si].material = clay_brief if is_garment else clay_skin
            for v_id, az, cz, osc in spec["views"]:
                _render_view(tmp_dir / f"{tag}_clay_{pid}_{v_id}.png", az, cz, osc, pw, ph)
            if "zoom" in spec:
                _, zaz, zcz, zosc = spec["zoom"]
                _render_view(tmp_dir / f"{tag}_clay_{pid}_zoom.png", zaz, zcz, zosc, pw, ph)

            body_obj.hide_render = False
            head_obj.hide_render = False
            bpy.data.objects.remove(tmp_ob, do_unlink=True)
            bpy.data.meshes.remove(tmp_me)

    return pose_metrics


def _export_temp_stage_a_glb(stage_a_fit_dir: Path, out_glb: Path) -> None:
    """Export Stage A `M050-F100` to a temporary `.glb` from its preserved `.npz` arrays without mutating `fits/M050-F100`."""
    receipt = json.loads((stage_a_fit_dir / "receipt.json").read_text())
    raw_npz = np.load(Path(receipt["rawCgCache"]["path"]), allow_pickle=False)
    l0_npz = np.load(stage_a_fit_dir / "lod0.npz", allow_pickle=False)
    l1_npz = np.load(stage_a_fit_dir / "lod1.npz", allow_pickle=False)
    hd_npz = np.load(stage_a_fit_dir / "headSkin.npz", allow_pickle=False)
    map_cand = stage_a_fit_dir.parent / "_raw_fit_cache" / "shared-lod0-to-lod1-map.npz"
    if not map_cand.is_file():
        map_cand = Path(receipt["rawCgCache"]["path"]).parent / "shared-lod0-to-lod1-map.npz"
    map_npz = np.load(map_cand, allow_pickle=False)

    witness_pkg = ecg.ol_people.load_family(ecg.WITNESS_PACKAGE_JSON)
    compiled = witness_pkg["compiled"]
    seam_body = np.asarray(compiled["seams"][0]["bodyVertices"], dtype=np.int64)
    lean_sup_p = Path(
        "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study/family-20261113/supports/M050-F000-lean-v3.npz"
    )
    canon_l1_p = Path(
        "/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-11-peacock-full-transfer/study/continuation/finish/root/body-audit/body-v3/runtime-controls.npz"
    )
    lean_sup_bl = gltf_to_blender(np.load(lean_sup_p)["positions"])
    canon_l1_raw = np.load(canon_l1_p)["reference"].astype(np.float64)
    z_shift = float(lean_sup_bl[seam_body, 2].mean() - canon_l1_raw[seam_body, 2].mean())
    rest_low_ref = l1_npz["reference"].astype(np.float64)

    attached = {}
    for sid in ("eyeLeft", "eyeRight", "lashes", "teeth", "oral"):
        sp = stage_a_fit_dir / f"support-{sid}.npz"
        if sp.is_file():
            attached[sid] = gltf_to_blender(np.load(sp)["positions"]).astype(np.float64)

    rest_high = l0_npz["reference"].astype(np.float64)
    high_tri = l0_npz["triangles"].astype(np.int64)
    n_body = len(rest_high)
    posed_0 = raw_npz["posedAll0"][:n_body].astype(np.float64)
    jac_0 = raw_npz["jacAll"][:n_body].astype(np.float64)
    map_faces = map_npz["faces"].astype(np.int64)
    map_weights = map_npz["weights"].astype(np.float64)
    red_tri = high_tri[map_faces]
    posed_low_0 = np.einsum("ni,nij->nj", map_weights, posed_0[red_tri])
    jac_low = np.einsum("ni,nijk->njk", map_weights, jac_0[red_tri])
    rest_low_fit = l1_npz["full"].astype(np.float64)
    posed_low_fit = posed_low_0 + np.einsum("vij,vj->vi", jac_low, rest_low_fit - rest_low_ref)

    ecg.export_fitted_covered_character_glb(
        out_glb,
        compiled,
        rest_low_fit,
        hd_npz["full"].astype(np.float64),
        attached,
        z_shift=z_shift,
        rest_high_fit_bl=l0_npz["full"].astype(np.float64),
        high_tri=high_tri,
        adipose_gate=1.0,
        posed_low_fit_bl=posed_low_fit,
        rest_low_ref_bl=rest_low_ref,
        jac_low=jac_low,
    )


def _compose_boards_with_pil(tmp_dir: Path, out_dir: Path, has_stage_a: bool) -> None:
    script = """
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

tmp_dir, out_dir, has_a = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3] == "1"
meta = json.loads((tmp_dir / "layout_meta.json").read_text())
pw, ph = meta["pw"], meta["ph"]

def make_board(rows_spec, title, out_path):
    ncols = max(len(r) for r in rows_spec)
    nrows = len(rows_spec)
    bw = 16 + ncols * (pw + 10) + 6
    bh = 44 + nrows * (ph + 30) + 10
    im = Image.new("RGB", (bw, bh), (20, 22, 26))
    dr = ImageDraw.Draw(im)
    dr.text((16, 12), title, fill=(255, 226, 152))
    for ri, row in enumerate(rows_spec):
        oy = 44 + ri * (ph + 30)
        for ci, (lbl, fname, hi_col) in enumerate(row):
            ox = 16 + ci * (pw + 10)
            dr.text((ox + 4, oy + 4), lbl, fill=(255, 232, 175) if hi_col else (228, 234, 242))
            tile = Image.open(tmp_dir / fname).convert("RGB")
            im.paste(tile, (ox, oy + 22))
    im.save(out_path, format="PNG")

make_board(meta["pbrRows"], meta["pbrTitle"], out_dir / "signoff-12-novel-poses-pbr-gallery.png")
make_board(meta["clayRows"], meta["clayTitle"], out_dir / "signoff-13-novel-poses-clay-audit.png")
if has_a:
    make_board(meta["compRows"], meta["compTitle"], out_dir / "signoff-14-muscle-vs-fat-novel-poses.png")
"""
    subprocess.run(
        [PIL_PYTHON, "-c", script, str(tmp_dir), str(out_dir), "1" if has_stage_a else "0"],
        check=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--subject-label", type=str, default=None, help="Display label / coordinate ID (auto-inferred if omitted)")
    parser.add_argument("--pose-specs-json", type=Path, default=None, help="Optional JSON file overriding or extending NOVEL_POSE_SPECS")
    parser.add_argument("--compare-glb", action="append", default=[], help="Optional extra comparison GLBs formatted as LABEL=PATH")
    parser.add_argument("--stage-a-fit-dir", type=Path, default=None)
    parser.add_argument("--export-stage-a-glb", type=Path, default=None)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else None)

    out_dir = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    subj_label = args.subject_label
    if not subj_label:
        rec_p = out_dir / "receipt.json"
        if rec_p.is_file():
            subj_label = json.loads(rec_p.read_text()).get("coordinateId")
        if not subj_label:
            subj_label = args.glb.stem.replace("-covered", "")

    active_pose_specs = list(NOVEL_POSE_SPECS)
    if args.pose_specs_json is not None and args.pose_specs_json.is_file():
        custom_doc = json.loads(args.pose_specs_json.read_text())
        if isinstance(custom_doc, dict) and custom_doc.get("mode") == "append":
            active_pose_specs.extend(custom_doc["poses"])
        elif isinstance(custom_doc, dict) and "poses" in custom_doc:
            active_pose_specs = list(custom_doc["poses"])
        elif isinstance(custom_doc, list):
            active_pose_specs = custom_doc

    tmp_dir = Path(tempfile.mkdtemp(prefix=".novel-pose-", dir=out_dir))

    pw, ph = 430, 610
    try:
        subj_metrics = _audit_and_render_glb(
            args.glb.resolve(),
            tmp_dir,
            "subj",
            active_pose_specs,
            render_pbr=True,
            render_clay=True,
            pw=pw,
            ph=ph,
        )

        comp_pose_ids = [s["id"] for s in active_pose_specs if s["id"] in ("idle", "run_stride", "combat_guard", "spine_twist_bend", "deep_squat")]
        if not comp_pose_ids:
            comp_pose_ids = [s["id"] for s in active_pose_specs[: min(5, len(active_pose_specs))]]
        comp_specs = [s for s in active_pose_specs if s["id"] in comp_pose_ids]

        comp_entries: list[tuple[str, str, dict]] = []
        for idx_c, raw_kv in enumerate(args.compare_glb):
            if "=" not in raw_kv:
                raise ValueError(f"--compare-glb must be LABEL=PATH, got {raw_kv!r}")
            c_lbl, c_path_s = raw_kv.split("=", 1)
            c_tag = f"cmp{idx_c}"
            c_met = _audit_and_render_glb(
                Path(c_path_s).resolve(),
                tmp_dir,
                c_tag,
                comp_specs,
                render_pbr=True,
                render_clay=False,
                pw=pw,
                ph=ph,
            )
            comp_entries.append((c_lbl.strip(), c_tag, c_met))

        stage_a_metrics = None
        has_stage_a = args.stage_a_fit_dir is not None and args.stage_a_fit_dir.is_dir()
        if has_stage_a:
            tmp_stage_a_glb = (
                args.export_stage_a_glb.resolve()
                if args.export_stage_a_glb is not None
                else (tmp_dir / "stage-a-M050-F100-covered-check.glb")
            )
            _export_temp_stage_a_glb(args.stage_a_fit_dir.resolve(), tmp_stage_a_glb)
            stage_a_metrics = _audit_and_render_glb(
                tmp_stage_a_glb,
                tmp_dir,
                "m050f100",
                comp_specs,
                render_pbr=True,
                render_clay=False,
                pw=pw,
                ph=ph,
            )
            comp_entries.append(("M050-F100 (Fullness)", "m050f100", stage_a_metrics))

        # Build PBR gallery layout (`5 columns`):
        pbr_flat: list[tuple[str, str, bool]] = []
        for spec in active_pose_specs:
            pid = spec["id"]
            for v_id, _, _, _ in spec["views"]:
                v_lbl = {"front": "Front", "back": "Back", "qfront": "3/4 Front", "qback": "3/4 Back", "prof": "Profile"}.get(v_id, v_id)
                pbr_flat.append((f"{spec['title']} · {v_lbl}", f"subj_pbr_{pid}_{v_id}.png", spec["kind"] == "world_bones"))
        pbr_rows = [pbr_flat[i : i + 5] for i in range(0, len(pbr_flat), 5)]

        # Build Clay audit layout (`full-body Clay views` + `1:1 high-strain Clay close-ups`):
        clay_full: list[tuple[str, str, bool]] = []
        clay_zooms: list[tuple[str, str, bool]] = []
        for spec in active_pose_specs:
            pid = spec["id"]
            v_pick = spec["views"][1][0] if (len(spec["views"]) > 1 and pid in ("idle", "rest_apose", "mid_abduct", "spine_twist_bend")) else spec["views"][0][0]
            v_lbl = {"front": "Front", "back": "Back", "qfront": "3/4 Front", "qback": "3/4 Back", "prof": "Profile"}.get(v_pick, v_pick)
            clay_full.append((f"{spec['title']} · Clay {v_lbl}", f"subj_clay_{pid}_{v_pick}.png", False))
            if "zoom" in spec:
                z_lbl = spec["zoom"][0]
                clay_zooms.append((z_lbl, f"subj_clay_{pid}_zoom.png", True))
        clay_rows = [clay_full[i : i + 5] for i in range(0, len(clay_full), 5)] + [
            clay_zooms[i : i + 5] for i in range(0, len(clay_zooms), 5)
        ]

        has_comp = len(comp_entries) > 0
        comp_rows = []
        if has_comp:
            spec_by_id = {s["id"]: s for s in active_pose_specs}
            for pid in comp_pose_ids:
                sp = spec_by_id[pid]
                v0 = sp["views"][0][0]
                v1 = sp["views"][1][0] if len(sp["views"]) > 1 else v0
                l0 = {"front": "Front", "back": "Back", "qfront": "3/4 Front", "qback": "3/4 Back", "prof": "Profile"}.get(v0, v0)
                l1 = {"front": "Front", "back": "Back", "qfront": "3/4 Front", "qback": "3/4 Back", "prof": "Profile"}.get(v1, v1)
                row_tiles: list[tuple[str, str, bool]] = []
                for vi_use, l_use in ((v0, l0), (v1, l1)):
                    row_tiles.append((f"{subj_label} · {sp['title']} {l_use}", f"subj_pbr_{pid}_{vi_use}.png", True))
                    for c_lbl, c_tag, _ in comp_entries:
                        row_tiles.append((f"{c_lbl} · {sp['title']} {l_use}", f"{c_tag}_pbr_{pid}_{vi_use}.png", False))
                comp_rows.append(row_tiles)

        comp_names = " vs ".join([subj_label] + [c[0] for c in comp_entries])
        (tmp_dir / "layout_meta.json").write_text(
            json.dumps(
                {
                    "pw": pw,
                    "ph": ph,
                    "pbrTitle": f"{subj_label} · Shipped Clips & Novel Poses Runtime .glb PBR Gallery (4-Joint LBS + Dynamic-Cleared linenBriefs)",
                    "pbrRows": pbr_rows,
                    "clayTitle": f"{subj_label} · Novel-Pose Welded-Normal Clay Audit (Full-Body + 1:1 High-Strain Joint & Flank Zooms)",
                    "clayRows": clay_rows,
                    "compTitle": f"{comp_names} · Side-by-Side Novel-Pose Runtime .glb Deformation",
                    "compRows": comp_rows,
                }
            )
        )
        _compose_boards_with_pil(tmp_dir, out_dir, has_comp)

        summary = {
            "subjectLabel": subj_label,
            "glbPath": str(args.glb.resolve()),
            "subjectPoses": subj_metrics,
            "subjectMaxInvertedTriangles": max(v["trueBoneRelativeInvertedTriangles"] for v in subj_metrics.values()),
            "subjectMaxBriefsOverlaps": max(v["linenBriefsSkinOverlapPairs"] for v in subj_metrics.values()),
            "subjectMaxCollarSeamGapMm": max(v["collarSeamMaxGapMm"] for v in subj_metrics.values()),
            "comparisonSubjects": {
                c_lbl: {
                    "poses": c_met,
                    "maxInvertedTriangles": max(v["trueBoneRelativeInvertedTriangles"] for v in c_met.values()),
                    "maxBriefsOverlaps": max(v["linenBriefsSkinOverlapPairs"] for v in c_met.values()),
                    "maxCollarSeamGapMm": max(v["collarSeamMaxGapMm"] for v in c_met.values()),
                }
                for c_lbl, _, c_met in comp_entries
            },
            "stageAM050F100Poses": stage_a_metrics,
            "stageAMaxInvertedTriangles": (
                max(v["trueBoneRelativeInvertedTriangles"] for v in stage_a_metrics.values())
                if stage_a_metrics
                else None
            ),
            "stageAMaxBriefsOverlaps": (
                max(v["linenBriefsSkinOverlapPairs"] for v in stage_a_metrics.values())
                if stage_a_metrics
                else None
            ),
        }
        (out_dir / "novel_pose_audit.json").write_text(json.dumps(summary, indent=2) + "\n")
        print("NOVEL_POSE_AUDIT_SUMMARY_START")
        print(json.dumps(summary, indent=2))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
