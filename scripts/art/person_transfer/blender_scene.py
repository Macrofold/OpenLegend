"""Shared Blender studio lighting, welded-normal clay mesh, and glTF rest-pose import utilities.

Centralizes three load-bearing rendering invariants across `verify_donor_vs_glb_and_heatmap.py`
and `novel_pose_audit.py` (`docs/production-workflows/art-flows/body-reference-family.md#7-transfer-the-entire-reliable-surface`):
1. Clearing Blender's auto-assigned first alphabetical `Action` (such as `Head left 25`) back to
   identity rest pose whenever an animated `.glb` is re-imported for static evaluation;
2. Welding split UV-island vertices before clay evaluation so comparison boards render true `C1`
   geometry without fake UV-seam creases;
3. Attenuating opposing-hemisphere lights to a soft (`12%`) studio rim so rear key lights never
   cast asymmetric grazing Schlick-Fresnel glare onto a single wrist or shoulder.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True

import bpy
from mathutils import Vector
import numpy as np

from mesh_rig_utils import weld_connectivity


def look_at(obj: bpy.types.Object, pos: tuple[float, float, float], target: tuple[float, float, float]) -> None:
    obj.location = Vector(pos)
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_studio_lights(
    scn: bpy.types.Scene,
    world_name: str = "StudioAuditWorld",
    bg_strength: float = 0.16,
    aim_z: float = 1.10,
    key_energy: float = 112.0,
    fill_energy: float = 36.0,
) -> None:
    scn.render.engine = "BLENDER_EEVEE"
    scn.view_settings.view_transform = "Standard"
    scn.view_settings.look = "None"
    scn.render.film_transparent = False

    world = bpy.data.worlds.new(world_name)
    scn.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs["Color"].default_value = (0.16, 0.165, 0.175, 1.0)
        bg.inputs["Strength"].default_value = bg_strength

    for name, loc, energy, sz, col in (
        ("FrontKey", (-1.25, -2.75, 2.55), key_energy, 1.85, (1.0, 0.985, 0.96)),
        ("FrontFill", (2.10, -2.50, 1.60), fill_energy, 2.30, (0.99, 0.985, 0.98)),
        ("BackKey", (1.25, 2.75, 2.55), key_energy, 1.85, (1.0, 0.985, 0.96)),
        ("BackFill", (-2.10, 2.50, 1.60), fill_energy, 2.30, (0.99, 0.985, 0.98)),
    ):
        ld = bpy.data.lights.new(name=name, type="AREA")
        ld.energy = energy
        ld.size = sz
        ld.color = col
        lo = bpy.data.objects.new(name=name, object_data=ld)
        scn.collection.objects.link(lo)
        look_at(lo, loc, (0.0, 0.0, aim_z))


def attenuate_opposing_lights(
    scn: bpy.types.Scene,
    cam_pos: tuple[float, float, float],
    base_light_energies: dict[str, float],
    rim_scale: float = 0.12,
) -> None:
    """Attenuate opposing-hemisphere lights to a soft rim (`12%`) to prevent grazing Fresnel wrist glare."""
    cam_y = float(cam_pos[1])
    for l_obj in scn.collection.objects:
        if l_obj.type != "LIGHT" or l_obj.name not in base_light_energies:
            continue
        is_front_light = "Front" in l_obj.name
        is_back_light = "Back" in l_obj.name
        if cam_y <= 0.05 and is_back_light:
            l_obj.data.energy = base_light_energies[l_obj.name] * rim_scale
        elif cam_y >= -0.05 and is_front_light:
            l_obj.data.energy = base_light_energies[l_obj.name] * rim_scale
        else:
            l_obj.data.energy = base_light_energies[l_obj.name]


def make_clay_material(
    name: str,
    rgb: tuple[float, float, float] = (0.64, 0.62, 0.59),
    roughness: float = 0.50,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def build_welded_clay_object(
    name: str,
    pts: np.ndarray,
    tri: np.ndarray,
    mat: bpy.types.Material,
    collection: bpy.types.Collection | None = None,
    decimals: int = 5,
) -> bpy.types.Object:
    """Create a smooth Blender mesh object with welded UV-island vertices for true C1 clay shading."""
    conn = weld_connectivity(pts, tri, decimals=decimals)
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
    target_col = collection if collection is not None else bpy.context.scene.collection
    target_col.objects.link(obj)
    return obj


def reset_imported_armatures_to_rest(objects=None) -> list[bpy.types.Object]:
    """Clear auto-assigned glTF animation actions (`e.g. Head left 25`) and reset pose bones to identity."""
    objs = list(objects) if objects is not None else list(bpy.data.objects)
    armatures: list[bpy.types.Object] = []
    for obj in objs:
        if obj.animation_data is not None:
            obj.animation_data.action = None
            for track in obj.animation_data.nla_tracks:
                track.mute = True
        if obj.type == "ARMATURE":
            obj.data.pose_position = "REST"
            for pb in obj.pose.bones:
                pb.location = (0.0, 0.0, 0.0)
                pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
                pb.rotation_euler = (0.0, 0.0, 0.0)
                pb.scale = (1.0, 1.0, 1.0)
            armatures.append(obj)
    bpy.context.view_layer.update()
    return armatures


def import_glb_in_rest_pose(glb_path: Path) -> list[bpy.types.Object]:
    """Import a `.glb` and immediately reset all armatures/objects to bind rest pose."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    imported = [o for o in bpy.data.objects if o not in before]
    reset_imported_armatures_to_rest(imported)
    return imported
