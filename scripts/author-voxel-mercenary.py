"""Author the new Peacock Mercenary from deliberately placed, colored cubic cells.

Run with Blender, not ordinary Python:
  Blender --background --python scripts/author-voxel-mercenary.py
Optional inspection renders: append -- --preview-dir /absolute/scratch/directory

The earlier Meshy model is a visual reference only. No source mesh, texture,
camera sample or voxelization operation contributes geometry to this asset.
AGPL-3.0-only. Coordinates below are Y-up, facing +Z, in 0.025 metre cells.
"""

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "apps/client/src/characters/mercenary-assets"
CELL = 0.025
PALETTE = {
    "skin": "bb895f",
    "skinLight": "d9ad79",
    "skinShade": "956544",
    "skinWarm": "c79367",
    "eyeWhite": "ead8ad",
    "eye": "243e3b",
    "hair": "2c2928",
    "hairLight": "514235",
    "hairWarm": "6a503b",
    "mouth": "764638",
    "mail": "667776",
    "mailLight": "90a29a",
    "mailShade": "455958",
    "quilt": "865b3c",
    "quiltLight": "ae7e50",
    "quiltShade": "63432e",
    "wrap": "b4a27b",
    "wrapLight": "d2bd90",
    "wrapShade": "8b7b5d",
    "leather": "574032",
    "leatherLight": "835c3c",
    "leatherShade": "382e29",
    "sole": "272827",
    "cape": "974831",
    "capeLight": "b45b3c",
    "capeHighlight": "cc744a",
    "capeShade": "71372d",
    "capeDeep": "4a2c29",
    "gold": "d4a45b",
    "goldLight": "f0d092",
    "goldShade": "a7783f",
    "peacock": "355e57",
}


def put(cells, x, y, z, color):
    cells[(x, y, z)] = color


def box(cells, x0, x1, y0, y1, z0, z1, color):
    """Half-open integer volumes make cell thickness and joints inspectable."""
    for x in range(x0, x1):
        for y in range(y0, y1):
            for z in range(z0, z1):
                put(cells, x, y, z, color(x, y, z) if callable(color) else color)


def quilt(x, y, z):
    # Large stitched diamonds describe padded linen, rather than random noise.
    seam = (x + y) % 6 == 0 or (x - y) % 6 == 0
    return "quiltShade" if seam else "quiltLight" if z >= 3 and x % 6 < 2 else "quilt"


def mail(x, y, z):
    # Short alternating paired links; deliberately coarser than a texture atlas.
    if z >= 4 or z <= -5 or abs(x) >= 8:
        return "mailLight" if (x + (y // 2) * 2) % 4 < 2 and y % 3 == 1 else "mail"
    return "mailShade"


def line(mask, x0, y0, x1, y1, color, radius=0):
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for step in range(steps + 1):
        x = round(x0 + (x1 - x0) * step / steps)
        y = round(y0 + (y1 - y0) * step / steps)
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                mask[(x + dx, y + dy)] = color


def feather(mask, x, y):
    # A diamond eye with a dark green heart is readable without sub-cell detail.
    for dx in range(-2, 3):
        for dy in range(-3, 4):
            distance = abs(dx) / 2 + abs(dy) / 3
            if distance <= 1.05:
                mask[(x + dx, y + dy)] = "goldLight" if distance > 0.55 else "peacock"
    mask[(x, y)] = "goldShade"


def make_torso():
    cells = {}
    for y in range(43, 67):
        half = 8 if y < 51 else 9 if y < 63 else 8
        depth = 5 if y < 51 else 6
        box(cells, -half, half, y, y + 1, -depth, depth, quilt if y < 50 else mail)
        for x in (-half, half - 1):
            for z in (-depth, depth - 1):
                cells.pop((x, y, z), None)
    # Thick split quilted skirts surround clothed thighs, not a bare body mesh.
    for side in (-1, 1):
        for y in range(35, 47):
            inner = 2 if y < 42 else 0
            outer = 10 if y < 43 else 9
            for x in range(inner, outer):
                sx = x if side > 0 else -x - 1
                box(cells, sx, sx + 1, y, y + 1, -5, 7, quilt)
    box(cells, -4, 4, 65, 72, -3, 4, "skinShade")
    box(cells, -6, 6, 66, 69, -4, 5, "quiltShade")
    # The leather belt replaces exterior cells and has a solid two-cell buckle.
    box(cells, -10, 10, 46, 49, -6, 7, "leather")
    box(cells, -2, 2, 46, 49, 7, 9, "gold")
    box(cells, -1, 1, 47, 48, 8, 9, "leatherShade")
    for x in range(-8, 9, 4):
        box(cells, x, x + 1, 47, 48, 7, 8, "goldShade")
    # Pouch and layered flap: both belong to the same rigid torso volume.
    box(cells, 9, 14, 39, 47, 1, 7, "leather")
    box(cells, 9, 14, 44, 47, 6, 8, "leatherLight")
    box(cells, 11, 12, 42, 45, 7, 9, "goldShade")
    # Diagonal baldric carries the recognizable mercenary silhouette.
    for y in range(50, 66):
        x = 7 - (y - 50) // 2
        box(cells, x - 1, x + 1, y, y + 1, 6, 8, "leatherShade")
        if y % 4 == 0:
            box(cells, x, x + 1, y, y + 1, 7, 8, "leatherLight")
    # Fitted mantle and diagonal chest throw have thickness, not parallel sheets.
    for y in range(61, 68):
        for x in range(-12, 14):
            if y >= 65 and abs(x) < 5:
                continue
            if x > -8 + (67 - y) * 2:
                front = 6 if abs(x) < 10 else 4
                box(cells, x, x + 1, y, y + 1, front, front + 3,
                    "capeLight" if y >= 65 else "cape")
    for x in range(-12, 13):
        for y in range(63, 67):
            box(cells, x, x + 1, y, y + 1, -10, -5, "capeShade")
    for y in range(59, 65):
        x0 = -6 + (64 - y) * 2
        box(cells, x0, 12, y, y + 1, 6, 9, "cape")
        box(cells, x0, 12, y, y + 1, 8, 9,
            "goldShade" if y == 59 else "capeLight" if y % 3 == 0 else "cape")
    box(cells, -9, -5, 64, 68, 7, 10, "gold")
    box(cells, -8, -6, 65, 67, 9, 10, "leatherShade")
    put(cells, -8, 67, 9, "goldLight")
    return cells


def make_head():
    cells = {}
    for y in range(72, 84):
        half = 4 if y < 74 else 5 if y < 82 else 4 if y == 82 else 3
        front = 5 if y < 74 else 6
        for x in range(-half, half):
            for z in range(-5, front):
                if (x in (-half, half - 1) and z in (-5, front - 1)) or (y == 83 and z > 2):
                    continue
                color = "skinLight" if z >= 3 and x < 1 else "skin" if z > -2 else "skinShade"
                if y >= 81 or z < -3 or (abs(x + 0.5) > 4 and y >= 78):
                    color = "hair"
                put(cells, x, y, z, color)
    # Ear shapes project one cell beyond the head, with warm interior squares.
    for x in (-6, 5):
        box(cells, x, x + 1, 76, 80, -1, 3, "skinShade")
        box(cells, x, x + 1, 77, 79, 2, 4, "skinWarm")
    # Permanent two-cell eyes, shadowed socket rims and swept brows.
    for x0 in (-4, 2):
        box(cells, x0, x0 + 3, 78, 80, 5, 6, "skinShade")
        box(cells, x0, x0 + 2, 79, 80, 6, 7, "eyeWhite")
        put(cells, x0 + (1 if x0 < 0 else 0), 79, 6, "eye")
        box(cells, x0, x0 + 3, 80, 81, 6, 7, "hair")
    box(cells, -1, 1, 77, 80, 6, 8, "skinWarm")
    box(cells, -1, 1, 77, 78, 8, 9, "skinLight")
    box(cells, -2, 2, 76, 77, 6, 8, "skinShade")
    # Bearded cheeks, moustache and chin are sculpted volumes with a lip opening.
    for y in range(72, 78):
        half = 4 if y < 74 else 5
        for x in range(-half, half):
            if y <= 75 or abs(x + 0.5) >= 3 or y == 76:
                box(cells, x, x + 1, y, y + 1, 4, 7,
                    "hairLight" if x < -1 and y < 76 else "hair")
    box(cells, -2, 2, 75, 76, 7, 8, "mouth")
    box(cells, -2, 2, 76, 77, 7, 8, "hair")
    box(cells, -1, 1, 73, 74, 7, 8, "hairWarm")
    # Asymmetric broad locks preserve swept dark hair, rather than a flat helmet.
    for x in range(-5, 5):
        top = 84 if -3 <= x < 1 else 83
        bottom = 81 if x < -2 else 82
        front = 3 if top == 84 else 4
        box(cells, x, x + 1, bottom, top, -4, front,
            "hairLight" if -3 <= x < 0 else "hair")
        if -3 <= x <= 2:
            put(cells, x, 81 if x < 0 else 82, 5,
                "hairWarm" if x < 0 else "hairLight")
    box(cells, -5, -4, 79, 82, 2, 5, "hair")
    box(cells, 4, 5, 79, 82, 2, 5, "hair")
    return cells


def make_upper_arm(side):
    cells = {}
    center = side * 13
    for y in range(51, 66):
        half = 4 if y >= 59 else 3
        box(cells, center - half, center + half, y, y + 1, -4, 4,
            mail if y >= 54 else quilt)
        for x in (center - half, center + half - 1):
            for z in (-4, 3):
                cells.pop((x, y, z), None)
    box(cells, center - 4, center + 4, 51, 54, -4, 4, "quiltLight")
    return cells


def make_forearm(side):
    cells = {}
    center = side * 13
    for y in range(39, 54):
        half = 3 if y >= 42 else 2
        box(cells, center - half, center + half, y, y + 1, -3, 3,
            lambda x, yy, z: "wrapLight" if (yy + z) % 5 == 0 else "wrap")
    box(cells, center - 3, center + 3, 39, 42, -3, 3, "leather")
    box(cells, center - 2, center + 2, 33, 40, -2, 3, "skin")
    box(cells, center - 2, center, 34, 39, 2, 4, "skinLight")
    # A thumb changes the profile without isolated floating detail.
    x = center - 3 if side > 0 else center + 2
    box(cells, x, x + 1, 36, 40, 1, 4, "skinShade")
    return cells


def make_thigh(side):
    cells = {}
    center = side * 5
    for y in range(25, 45):
        half = 4 if y > 31 else 3
        box(cells, center - half, center + half, y, y + 1, -4, 4, quilt)
    box(cells, center - 3, center + 3, 25, 29, -4, 4, "leather")
    return cells


def make_shin(side):
    cells = {}
    center = side * 5
    for y in range(8, 29):
        box(cells, center - 3, center + 3, y, y + 1, -3, 3,
            lambda x, yy, z: "wrapShade" if (yy + z // 2) % 5 == 0
            else "wrapLight" if z > 0 and x < center else "wrap")
    box(cells, center - 3, center + 3, 4, 12, -3, 4, "leather")
    box(cells, center - 4, center + 4, 0, 2, -4, 10, "sole")
    box(cells, center - 4, center + 4, 2, 5, -4, 9, "leatherLight")
    box(cells, center - 3, center + 3, 5, 7, -3, 7, "leather")
    box(cells, center - 2, center, 7, 11, 3, 5, "leatherLight")
    return cells


def make_cape():
    cells, embroidery = {}, {}
    # Peacock fan: seven connected feathers plus a proud neck and central body.
    for x, y in [(-12, 51), (-9, 57), (-5, 60), (0, 61), (5, 60), (9, 57), (12, 51)]:
        line(embroidery, 0, 40, x, y, "gold", 0)
        feather(embroidery, x, y)
    for y in range(30, 42):
        half = 2 if y < 38 else 3
        for x in range(-half, half + 1):
            embroidery[(x, y)] = "goldLight" if x < 0 else "gold"
    line(embroidery, 2, 40, 4, 47, "gold", 1)
    line(embroidery, 4, 47, 1, 49, "goldLight", 0)
    line(embroidery, 4, 47, 7, 46, "goldShade", 0)
    embroidery[(4, 48)] = "peacock"
    line(embroidery, -1, 31, -3, 27, "goldShade")
    line(embroidery, 1, 31, 4, 27, "goldShade")
    for y in range(7, 67):
        half = 12 if y > 60 else 14 if y > 48 else 16 if y > 28 else 18
        # Two-cell cloth is a closed volume; broad folds are permanent cell steps.
        back = (-9 if y > 63 else -10 if y > 60 else -11 if y > 57
                else -12 if y > 54 else -13 if y > 46
                else -14 if y > 43 else -15 if y > 30 else -16 if y > 27 else -17)
        for x in range(-half, half):
            fold = -1 if abs(x) % 8 < 2 else 0
            z0 = back + fold
            color = "capeLight" if x % 8 < 3 else "cape" if x % 8 < 6 else "capeShade"
            for z in range(z0 - 2, z0):
                surface = "capeDeep" if z == z0 - 1 else color
                if y < 10 or x in (-half, half - 1):
                    surface = "goldShade" if z == z0 - 1 else "gold"
                if z == z0 - 2 and (x, y) in embroidery:
                    surface = embroidery[(x, y)]
                put(cells, x, y, z, surface)
    return cells


# Rigid pivots are cell coordinates in the neutral pose. The finite animation
# envelope is authored by the renderer, not inferred from imported bone names.
PARTS = [
    ("torso", None, (0, 45, 0), make_torso),
    ("head", "torso", (0, 70, 0), make_head),
    ("leftUpperArm", "torso", (13, 64, 0), lambda: make_upper_arm(1)),
    ("leftForearm", "leftUpperArm", (13, 51, 0), lambda: make_forearm(1)),
    ("rightUpperArm", "torso", (-13, 64, 0), lambda: make_upper_arm(-1)),
    ("rightForearm", "rightUpperArm", (-13, 51, 0), lambda: make_forearm(-1)),
    ("leftThigh", None, (5, 44, 0), lambda: make_thigh(1)),
    ("leftShin", "leftThigh", (5, 27, 0), lambda: make_shin(1)),
    ("rightThigh", None, (-5, 44, 0), lambda: make_thigh(-1)),
    ("rightShin", "rightThigh", (-5, 27, 0), lambda: make_shin(-1)),
    ("cape", "torso", (0, 64, -11), make_cape),
]
FACES = [
    ((1, 0, 0), ((1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1))),
    ((-1, 0, 0), ((0, 0, 1), (0, 1, 1), (0, 1, 0), (0, 0, 0))),
    ((0, 1, 0), ((0, 1, 1), (1, 1, 1), (1, 1, 0), (0, 1, 0))),
    ((0, -1, 0), ((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1))),
    ((0, 0, 1), ((0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1))),
    ((0, 0, -1), ((1, 0, 0), (0, 0, 0), (0, 1, 0), (1, 1, 0))),
]


def blender_point(point):
    return (point[0] * CELL, -point[2] * CELL, point[1] * CELL)


def rgba(name):
    code = PALETTE[name]
    return tuple(int(code[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def create_material():
    material = bpy.data.materials.new("Mercenary · permanent cell palette")
    material.use_nodes = True
    material.use_backface_culling = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = 0.95
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Specular IOR Level"].default_value = 0.1
    colors = material.node_tree.nodes.new("ShaderNodeVertexColor")
    colors.layer_name = "MercenaryPalette"
    material.node_tree.links.new(colors.outputs["Color"], shader.inputs["Base Color"])
    return material


def connected_cells(cells):
    remaining = set(cells)
    pending = [remaining.pop()]
    while pending:
        x, y, z = pending.pop()
        for (dx, dy, dz), _ in FACES:
            other = (x + dx, y + dy, z + dz)
            if other in remaining:
                remaining.remove(other)
                pending.append(other)
    return not remaining


def create_mesh(name, cells, pivot, material):
    assert connected_cells(cells), name + " has a disconnected solid garment or detail"
    vertices, faces, colors, exposed = [], [], [], 0
    # Offline rectangle merging changes neither the cell boundary nor paint. It
    # removes needless triangles on flat single-color surfaces, never cell shapes.
    for direction, corners in FACES:
        axis = next(i for i, value in enumerate(direction) if value)
        u_axis, v_axis = [i for i in range(3) if i != axis]
        offset = 1 if direction[axis] > 0 else 0
        planes = {}
        for point, color in sorted(cells.items()):
            neighbor = tuple(point[i] + direction[i] for i in range(3))
            if neighbor in cells:
                continue
            exposed += 1
            plane = point[axis] + offset
            planes.setdefault(plane, {})[(point[u_axis], point[v_axis])] = color
        for plane, mask in sorted(planes.items()):
            for u, v in sorted(mask):
                if (u, v) not in mask:
                    continue
                color = mask[(u, v)]
                width = 1
                while mask.get((u + width, v)) == color:
                    width += 1
                height = 1
                while all(mask.get((u + i, v + height)) == color for i in range(width)):
                    height += 1
                for i in range(width):
                    for j in range(height):
                        del mask[(u + i, v + j)]
                point = [0, 0, 0]
                point[axis], point[u_axis], point[v_axis] = plane - offset, u, v
                extent = [1, 1, 1]
                extent[u_axis], extent[v_axis] = width, height
                first = len(vertices)
                for corner in corners:
                    vertices.append(blender_point(tuple(point[i] + corner[i] * extent[i] - pivot[i]
                                                        for i in range(3))))
                faces.append((first, first + 1, first + 2, first + 3))
                colors.append(rgba(color))
    mesh = bpy.data.meshes.new(name + " · exposed cell faces")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    attribute = mesh.color_attributes.new(name="MercenaryPalette", type="BYTE_COLOR", domain="CORNER")
    for polygon, color in zip(mesh.polygons, colors):
        polygon.use_smooth = False
        for index in polygon.loop_indices:
            attribute.data[index].color_srgb = color
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj["cell_size_metres"] = CELL
    obj["authored_cells"] = len(cells)
    return obj, len(faces), exposed


def preview(directory):
    """Inspection objects are added only after saving the clean editable asset."""
    directory.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.world.color = (0.16, 0.16, 0.16)
    for name, position, energy, size in [
        ("Inspection key", (3, -4, 5), 450, 4),
        ("Inspection fill", (-3, 1, 3), 300, 3),
        ("Inspection rim", (2, 3, 4), 400, 3),
    ]:
        light = bpy.data.lights.new(name, "AREA")
        light.energy, light.shape, light.size = energy, "DISK", size
        obj = bpy.data.objects.new(name, light)
        bpy.context.collection.objects.link(obj)
        obj.location = position
        obj.rotation_euler = (Vector((0, 0, 1)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    camera_data = bpy.data.cameras.new("Inspection camera")
    camera_data.type, camera_data.ortho_scale = "ORTHO", 2.5
    camera = bpy.data.objects.new("Inspection camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    for name, point, target, scale in [
        ("front", (2.3, -7, 2.7), (0, 0, 1.03), 2.5),
        ("back", (-2.1, 7, 2.7), (0, 0.08, 1.03), 2.5),
        ("profile", (7, -0.4, 2.2), (0, 0, 1.03), 2.5),
        ("face", (0.7, -5, 2.15), (0, -0.07, 1.90), 0.55),
    ]:
        camera.location = point
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
        camera_data.ortho_scale = scale
        scene.render.filepath = str(directory / (name + ".png"))
        bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview-dir", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Rebuilding this owned iteration must not create untracked .blend1 backups.
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    root = bpy.data.objects.new("MercenaryVoxel", None)
    bpy.context.collection.objects.link(root)
    material, objects, pivots, stats = create_material(), {}, {}, []
    for name, parent, pivot, factory in PARTS:
        cells = factory()
        obj, face_count, exposed = create_mesh(name, cells, pivot, material)
        obj.parent = objects[parent] if parent else root
        parent_pivot = pivots[parent] if parent else (0, 0, 0)
        obj.location = blender_point(tuple(pivot[i] - parent_pivot[i] for i in range(3)))
        objects[name], pivots[name] = obj, pivot
        stats.append({"name": name, "parent": parent or "MercenaryVoxel",
                      "pivotMetresYUp": [p * CELL for p in pivot],
                      "localPivotMetresYUp": [(pivot[i] - parent_pivot[i]) * CELL for i in range(3)],
                      "cells": len(cells), "connected": True, "exposedCellFaces": exposed,
                      "quads": face_count, "triangles": face_count * 2})
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "mercenary-voxel.blend"))
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / "mercenary-voxel.glb"),
                              export_format="GLB", export_yup=True, export_apply=False,
                              export_animations=False, export_cameras=False, export_lights=False,
                              export_extras=True, export_normals=True, export_texcoords=False)
    metadata = {
        "purpose": "New authored cubic-cell mercenary iteration; original model preserved",
        "authoring": "Explicit designed integer volumes and permanent color placements; no source-model voxelization",
        "license": "AGPL-3.0-only first-party script and newly authored geometry",
        "visualReference": "Owner-selected Peacock Mercenary study; no source geometry, textures or reference image embedded",
        "cellSizeMetres": CELL, "heightMetres": 84 * CELL, "coordinateSystem": "Y-up, front +Z",
        "parts": stats, "cells": sum(part["cells"] for part in stats),
        "triangles": sum(part["triangles"] for part in stats), "materials": 1,
        "palette": PALETTE, "textures": 0, "skins": 0, "clips": 0,
        "animation": "Rigid part transforms; renderer owns bounded idle/walk pose and pause",
        "clothing": "Opaque garment cells replace the body exterior; closed two-cell cape with fixed clearance",
        "costUSD": 0,
        "sha256": {name: hashlib.sha256((OUTPUT / name).read_bytes()).hexdigest()
                   for name in ("mercenary-voxel.glb", "mercenary-voxel.blend")},
        "sourceSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "remaining": ["Creator style acceptance", "Arbitrary poses and equipment", "Physical-device crowd qualification"],
    }
    (OUTPUT / "mercenary-voxel-provenance.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({"cells": metadata["cells"], "triangles": metadata["triangles"],
                      "bytes": (OUTPUT / "mercenary-voxel.glb").stat().st_size,
                      "sha256": metadata["sha256"]["mercenary-voxel.glb"]}))
    if args.preview_dir:
        preview(args.preview_dir.resolve())


if __name__ == "__main__":
    main()
