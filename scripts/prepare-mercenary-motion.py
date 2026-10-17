"""Export the bundled pilot's motion comparisons without duplicating its meshes.

/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \\
  --python scripts/prepare-mercenary-motion.py

The sharp motion is a developer-only silhouette fixture, not a gameplay action.
The original GLB is never modified or uploaded. Blender's armature-only export
preserves the original named bone hierarchy for the existing PlayCanvas actor.
"""
from pathlib import Path
import hashlib
import json
import math
import struct

import bpy
from mathutils import Quaternion

ASSETS = Path(__file__).resolve().parents[1] / "apps/client/src/characters/mercenary-assets"
SOURCE = ASSETS / "mercenary.glb"
OUTPUT = ASSETS / "mercenary-motion.glb"


def curves(action):
    return [curve for layer in action.layers for strip in layer.strips
            for bag in strip.channelbags for curve in bag.fcurves]


def held_copy(source, name, spacing):
    action = source.copy()
    action.name = name
    start, end = map(int, action.frame_range)
    frames = list(range(start, end, spacing)) + [end]
    for curve in curves(action):
        values = [(frame, curve.evaluate(frame)) for frame in frames]
        curve.keyframe_points.clear()
        for frame, value in values:
            curve.keyframe_points.insert(frame, value, options={"FAST"}).interpolation = "CONSTANT"
        curve.update()
    return action


def sharp_fixture(rig, idle):
    """A planted, empty-handed anticipation/strike/recovery for timing review."""
    rig.animation_data.action = idle
    bpy.context.scene.frame_set(1)
    base = {bone.name: (bone.location.copy(), bone.rotation_quaternion.copy(), bone.scale.copy())
            for bone in rig.pose.bones}
    action = bpy.data.actions.new("SharpFixtureSmooth")
    rig.animation_data.action = action
    # A broad diagonal gesture reads from front and profile. No weapon, hit,
    # root displacement or native activity is introduced by this visual fixture.
    poses = [
        (1, {}),
        (7, {"Spine01": (0, -8, -9), "Spine": (0, -9, -5),
             "RightArm": (-48, -20, 20), "RightForeArm": (-60, 0, 0),
             "LeftArm": (-16, 0, -12), "Head": (0, 8, 4)}),
        (10, {"Spine01": (0, -12, -12), "Spine": (0, -10, -8),
              "RightArm": (-66, -25, 25), "RightForeArm": (-75, 0, 0),
              "LeftArm": (-23, 0, -15), "Head": (0, 10, 5)}),
        (12, {"Spine01": (10, 17, 14), "Spine": (5, 12, 8),
              "RightArm": (24, 20, -36), "RightForeArm": (-10, 0, 0),
              "LeftArm": (-30, 0, -5), "Head": (-5, -10, -3)}),
        (19, {"Spine01": (4, 7, 6), "Spine": (2, 4, 3),
              "RightArm": (10, 7, -12), "RightForeArm": (-15, 0, 0)}),
        (25, {}),
    ]
    for frame, offsets in poses:
        for bone in rig.pose.bones:
            location, rotation, scale = base[bone.name]
            bone.location = location
            bone.rotation_quaternion = rotation
            bone.scale = scale
            for axis, degrees in zip(((1, 0, 0), (0, 1, 0), (0, 0, 1)), offsets.get(bone.name, ())):
                bone.rotation_quaternion @= Quaternion(axis, math.radians(degrees))
            for path in ("location", "rotation_quaternion", "scale"):
                bone.keyframe_insert(path, frame=frame, group=bone.name)
    for curve in curves(action):
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
    action.use_fake_user = True
    held = action.copy()
    held.name = "SharpFixtureHeld"
    for curve in curves(held):
        for point in curve.keyframe_points:
            point.interpolation = "CONSTANT"
    held.use_fake_user = True


def glb_document(path):
    content = path.read_bytes()
    length = struct.unpack_from("<I", content, 12)[0]
    return json.loads(content[20:20 + length])


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    rig = bpy.data.objects["MercenaryRig"]
    walk = bpy.data.actions["Walk"]
    idle = bpy.data.actions["Idle"]
    held_copy(walk, "WalkHeld8", 3).use_fake_user = True
    held_copy(walk, "WalkHeld12", 2).use_fake_user = True
    sharp_fixture(rig, idle)
    rig.animation_data.action = idle
    # The source clips remain in mercenary.glb. This file contains only the
    # experimental alternatives, all imported by the same scene resource owner.
    for action in (idle, walk):
        action.use_fake_user = False
    for track in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(track)
    rig.animation_data.action = None
    bpy.data.actions.remove(idle)
    bpy.data.actions.remove(walk)
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="ACTIONS",
        export_force_sampling=False, export_armature_object_remove=False,
        export_optimize_animation_size=False, export_materials="NONE",
        export_cameras=False, export_lights=False, export_leaf_bone=False,
        export_frame_range=False, export_anim_slide_to_zero=True,
    )
    document = glb_document(OUTPUT)
    assert not document.get("meshes") and not document.get("images")
    expected = {"WalkHeld8", "WalkHeld12", "SharpFixtureSmooth", "SharpFixtureHeld"}
    assert {animation["name"] for animation in document["animations"]} == expected
    for animation in document["animations"]:
        if animation["name"] != "SharpFixtureSmooth":
            assert all(sampler.get("interpolation") == "STEP" for sampler in animation["samplers"])
    print(json.dumps({"source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                      "runtime_sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
                      "runtime_bytes": OUTPUT.stat().st_size,
                      "clips": [{"name": a["name"], "channels": len(a["channels"])}
                                for a in document["animations"]]}, indent=2))


if __name__ == "__main__":
    main()
