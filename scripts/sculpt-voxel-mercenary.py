"""Sculpt a finer fixed-cell mercenary using the original study's anatomy.

Blender --factory-startup --background --python scripts/sculpt-voxel-mercenary.py
Optional: -- --preview-dir /absolute/scratch/directory

The imported body and fitted cape provide the outer shape and rig landmarks.
Solid cells, material-family paint, facial corrections and thick garments are
baked offline. The runtime receives ordinary immutable, vertex-colored meshes;
no camera image, texture map, voxelization or skin deformation runs during play.
The source model's study provenance and unresolved production rights remain.
AGPL-3.0-only for this first-party authoring code; source geometry is a derivative.
"""

import argparse
from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "apps/client/src/characters/mercenary-assets"
BODY_SOURCE = ASSETS / "mercenary.glb"
CAPE_SOURCE = ASSETS.parent / "mercenary-cloth.json"
CELL = 0.0125
HEIGHT = 2.1
PALETTE = {
    "skin": "bd936d", "skinLight": "d4ad81", "skinShade": "a77c57",
    "skinWarm": "c39a74", "eye": "26342f", "eyeLight": "918d78",
    "brow": "45362c", "mouth": "493027", "lip": "94684c", "hair": "37302d",
    "hairLight": "534539", "hairWarm": "625340", "beard": "514236",
    "beardLight": "65513d", "mail": "647271", "mailLight": "80908a",
    "mailShade": "4e605f", "mailDark": "445452", "quilt": "967249",
    "quiltLight": "ac8558", "quiltShade": "7b5c3e", "quiltSeam": "6a513b",
    "wrap": "b3a07c", "wrapLight": "c5b38c", "wrapShade": "968669",
    "trouser": "736348", "trouserLight": "8a7755", "leather": "6a5138",
    "leatherLight": "866545", "leatherShade": "4a3a2c", "sole": "36332a",
    "cape": "93482f", "capeLight": "a55335", "capeShade": "7c3d2c",
    "capeDeep": "593329", "gold": "bf9452", "goldLight": "d4ab64",
    "goldShade": "9b7540", "bronze": "9f7d43", "bronzeLight": "c19b5b",
}
NAMES = ["torso", "head", "leftUpperArm", "leftForearm", "rightUpperArm",
         "rightForearm", "leftThigh", "leftShin", "rightThigh", "rightShin", "cape"]
GROUPS = {
    "Head": "head", "head_end": "head", "headfront": "head", "neck": "head",
    "LeftArm": "leftUpperArm", "LeftForeArm": "leftForearm", "LeftHand": "leftForearm",
    "RightArm": "rightUpperArm", "RightForeArm": "rightForearm", "RightHand": "rightForearm",
    "LeftUpLeg": "leftThigh", "LeftLeg": "leftShin", "LeftFoot": "leftShin", "LeftToeBase": "leftShin",
    "RightUpLeg": "rightThigh", "RightLeg": "rightShin", "RightFoot": "rightShin", "RightToeBase": "rightShin",
}
FACES = [
    ((1, 0, 0), ((1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1))),
    ((-1, 0, 0), ((0, 0, 1), (0, 1, 1), (0, 1, 0), (0, 0, 0))),
    ((0, 1, 0), ((0, 1, 1), (1, 1, 1), (1, 1, 0), (0, 1, 0))),
    ((0, -1, 0), ((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1))),
    ((0, 0, 1), ((0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1))),
    ((0, 0, -1), ((1, 0, 0), (0, 0, 0), (0, 1, 0), (1, 1, 0))),
]


def yup(point, scale):
    return Vector((point.x * scale, point.z * scale, -point.y * scale))


def blender_point(point):
    return (point[0], -point[2], point[1])


def center(cell):
    return Vector(tuple((c + 0.5) * CELL for c in cell))


def barycentric(point, a, b, c):
    u, v, p = b - a, c - a, point - a
    uu, uv, vv = u.dot(u), u.dot(v), v.dot(v)
    denominator = uu * vv - uv * uv
    if abs(denominator) < 1e-18:
        return (1.0, 0.0, 0.0)
    s = (vv * p.dot(u) - uv * p.dot(v)) / denominator
    t = (uu * p.dot(v) - uv * p.dot(u)) / denominator
    return (1 - s - t, s, t)


class Reference:
    def __init__(self, vertices, triangles, uvs=None, weights=None, tags=None):
        self.vertices, self.triangles = vertices, triangles
        self.uvs, self.weights = uvs, weights
        self.tree = BVHTree.FromPolygons(vertices, triangles, all_triangles=True)
        self.low = [min(p[a] for p in vertices) for a in range(3)]
        self.high = [max(p[a] for p in vertices) for a in range(3)]
        self.tags = tags

    def sample(self, point, face):
        triangle = self.triangles[face]
        bary = barycentric(point, *(self.vertices[i] for i in triangle))
        owners = defaultdict(float)
        if self.weights:
            for index, factor in zip(triangle, bary):
                for name, weight in self.weights[index].items():
                    owners[name] += factor * weight
        owner = max(owners, key=owners.get) if owners else "torso"
        uv = [sum(bary[j] * self.uvs[face][j][a] for j in range(3)) for a in range(2)] if self.uvs else None
        return owner, uv


def import_body():
    bpy.ops.import_scene.gltf(filepath=str(BODY_SOURCE))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    body = next(obj for obj in bpy.context.scene.objects
                if obj.type == "MESH" and obj.vertex_groups and obj.name.startswith("Mercenary"))
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    world_vertices = [body.matrix_world @ v.co for v in mesh.vertices]
    scale = HEIGHT / (max(p.z for p in world_vertices) - min(p.z for p in world_vertices))
    vertices = [yup(p, scale) for p in world_vertices]
    floor = min(p.y for p in vertices)
    for p in vertices:
        p.y -= floor
    triangles = [tuple(t.vertices) for t in mesh.loop_triangles]
    names = {g.index: GROUPS.get(g.name, "torso") for g in body.vertex_groups}
    weights = []
    for v in body.data.vertices:
        grouped = defaultdict(float)
        for weight in v.groups:
            grouped[names[weight.group]] += weight.weight
        weights.append(dict(grouped))
    reference = Reference(vertices, triangles, weights=weights)
    landmarks = {bone.name: yup(rig.matrix_world @ bone.head, scale) for bone in rig.pose.bones}
    for point in landmarks.values():
        point.y -= floor
    evaluated.to_mesh_clear()
    return reference, landmarks, scale, floor


def body_paint(point, owner):
    x, y, z = point
    ix, iy, iz = (int(math.floor(v / CELL)) for v in point)
    if owner == "head":
        # Permanent broad scalp/beard regions follow the actual head surface;
        # painted highlights in the source atlas cannot become pale scalp holes.
        scalp = y > 2.035 or (z < 0.055 and y > 1.865) or (abs(x) > 0.071 and y > 1.965)
        swept = z > 0.09 and y > (2.005 if x < -0.020 else 2.026)
        if scalp or swept:
            return "hairLight" if x < -0.020 and y > 2.025 else "hair"
        beard = (z > 0.045 and 1.855 < y < 1.925) or (z > 0.065 and abs(x) > 0.055 and 1.88 < y < 1.950)
        moustache = z > 0.112 and 1.932 < y < 1.947 and abs(x) < 0.036
        if beard or moustache:
            return "beardLight" if x < -0.025 and y < 1.925 else "beard"
        return "skinLight" if x < -0.008 and z > 0.08 else "skinWarm" if z > 0.10 else "skin"
    if owner.endswith("Forearm"):
        if y < 1.17:
            return "skinLight" if z > 0.09 else "skin"
        return "wrapShade" if (iy + iz // 3) % 7 == 0 else "wrapLight" if z > 0.03 else "wrap"
    if owner.endswith("Shin"):
        if y < 0.22:
            return "sole" if y < 0.04 else "leatherLight" if z > 0.08 else "leather"
        if y > 0.60:
            return "trouserLight" if z > 0.01 else "trouser"
        return "wrapShade" if (iy + iz // 3) % 7 == 0 else "wrapLight" if z > 0.025 else "wrap"
    if owner.endswith("Thigh") and y < 0.68:
        return "trouserLight" if z > 0.01 else "trouser"
    # Geometry and the original material regions locate mail, padded panels,
    # belts and pouches. Color and detail are new restrained fixed-cell paint.
    pouch = owner == "torso" and -0.26 < x < -0.16 and 1.05 < y < 1.28 and z > 0.10
    if pouch:
        return "leatherLight" if z > 0.16 else "leather"
    if owner == "torso" and y > 1.74 and abs(x) < 0.11:
        return "leatherLight" if z > 0.10 else "leather"
    shirt = owner == "torso" and (y > 1.23 or 1.00 < y < 1.18) and abs(x) < 0.27
    if owner.endswith("UpperArm") or shirt:
        mark = (ix + iy // 2) % 6 == 0 and iy % 4 == 0
        return "mailLight" if mark else "mailShade" if z < -0.08 else "mail"
    if 1.18 < y < 1.23 and abs(x) < 0.25:
        return "leatherLight" if z > 0.15 else "leather"
    if y > 1.04 and abs(x) > 0.20:
        return "leatherShade" if z < 0.08 else "leather"
    # Long, overlapping quilt panels follow the source shape; small fixed seams
    # replace the rejected uniform diamond checkerboard.
    seam = ix % 19 == 0 and z > 0.08
    return "quiltSeam" if seam else "quiltLight" if z > 0.12 else "quiltShade" if z < -0.08 else "quilt"


def fill_body(reference):
    cells = {name: {} for name in NAMES}
    low = [math.floor(v / CELL) for v in reference.low]
    high = [math.ceil(v / CELL) for v in reference.high]
    direction = Vector((0, 0, -1))
    columns, odd, odd_locations = 0, 0, []
    for x in range(low[0], high[0]):
        for y in range(low[1], high[1]):
            origin = Vector(((x + 0.5) * CELL, (y + 0.5) * CELL, reference.high[2] + CELL))
            hits = []
            for _ in range(40):
                point, normal, face, distance = reference.tree.ray_cast(origin, direction)
                if point is None:
                    break
                if not hits or abs(hits[-1] - point.z) > CELL * 0.02:
                    hits.append(point.z)
                origin.z = point.z - CELL * 0.002
            if not hits:
                continue
            columns += 1
            if len(hits) % 2:
                odd += 1
                odd_locations.append([x, y])
            for front, back in zip(hits[0::2], hits[1::2]):
                for z in range(math.floor(back / CELL), math.ceil(front / CELL)):
                    key = (x, y, z)
                    point = center(key)
                    nearest, normal, face, distance = reference.tree.find_nearest(point)
                    owner, uv = reference.sample(nearest, face)
                    cells[owner][key] = body_paint(point, owner)
    print("BODY", json.dumps({"cells": sum(map(len, cells.values())), "columns": columns, "oddColumns": odd}), flush=True)
    return cells, {"sampledColumns": columns, "oddIntersectionColumns": odd,
                   "oddColumnCellsXY": odd_locations}


def cape_reference(scale, floor):
    data = json.loads(CAPE_SOURCE.read_text())
    vertices, triangles, uvs, tags = [], [], [], []
    for patch in data["patches"]:
        start = len(vertices)
        positions, texcoords = patch["positions"], patch["uvs"]
        vertices.extend(Vector((positions[i] * scale, positions[i + 1] * scale - floor, positions[i + 2] * scale))
                        for i in range(0, len(positions), 3))
        for row in range(patch["rows"] - 1):
            for column in range(patch["columns"] - 1):
                a = row * patch["columns"] + column
                for tri in ((a, a + 1, a + patch["columns"]),
                            (a + 1, a + patch["columns"] + 1, a + patch["columns"])):
                    triangles.append(tuple(start + i for i in tri))
                    uvs.append([tuple(texcoords[2 * i:2 * i + 2]) for i in tri])
                    tags.append(patch["name"])
    return Reference(vertices, triangles, uvs, tags=tags)


def embroidery_mask():
    """Two flowing peacocks, long tails and narrow vines, deliberately repainted."""
    mask, width, height = {}, 96, 160

    def dot(x, y, color, radius=0):
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                mask[(x + dx, y + dy)] = color

    def line(a, b, color, radius=0):
        steps = max(abs(a[0] - b[0]), abs(a[1] - b[1]), 1)
        for step in range(steps + 1):
            dot(round(a[0] + (b[0] - a[0]) * step / steps),
                round(a[1] + (b[1] - a[1]) * step / steps), color, radius)

    def curve(a, b, c, color, radius=0):
        previous = a
        for step in range(1, 41):
            t = step / 40
            point = tuple(round((1 - t) ** 2 * a[i] + 2 * t * (1 - t) * b[i] + t * t * c[i]) for i in range(2))
            line(previous, point, color, radius)
            previous = point

    def ellipse(cx, cy, rx, ry, color):
        for x in range(cx - rx, cx + rx + 1):
            for y in range(cy - ry, cy + ry + 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    dot(x, y, color)

    # Two body/neck profiles retain the source's signature instead of a fan icon.
    for cx, cy, direction in [(36, 90, -1), (61, 75, 1)]:
        ellipse(cx, cy, 5, 11, "gold")
        curve((cx + direction * 2, cy + 7), (cx + direction * 6, cy + 23),
              (cx - direction * 2, cy + 30), "gold", 1)
        ellipse(cx - direction * 2, cy + 30, 2, 2, "goldLight")
        line((cx - direction * 2, cy + 30), (cx + direction * 5, cy + 29), "goldShade")
        line((cx - 2, cy - 8), (cx - 4, cy - 15), "goldShade")
        line((cx + 1, cy - 8), (cx + 4, cy - 15), "goldShade")
        for feather in range(7):
            ex = cx - 23 + feather * 7
            ey = 9 + (feather % 3) * 5
            mx, my = cx + (ex - cx) // 3, cy - 27
            curve((cx, cy - 7), (mx, my), (ex, ey), "goldShade")
            for j in range(3):
                t = (j + 1) / 4
                fx = round((1 - t) ** 2 * cx + 2 * t * (1 - t) * mx + t * t * ex)
                fy = round((1 - t) ** 2 * (cy - 7) + 2 * t * (1 - t) * my + t * t * ey)
                ellipse(fx, fy, 2, 4, "gold")
                dot(fx, fy + 1, "goldLight")
                dot(fx, fy, "capeShade")
    for x in (2, 93):
        line((x, 4), (x, 153), "goldShade")
        for y in range(12, 145, 12):
            direction = 1 if x < 48 else -1
            curve((x + direction * 3, y - 4), (x + direction * 7, y),
                  (x + direction * 4, y + 5), "gold")
    line((2, 4), (93, 4), "goldShade")
    return mask, width, height


def fill_cape(reference):
    cells = {}
    mask, width, height = embroidery_mask()
    low = [math.floor((v - CELL) / CELL) for v in reference.low]
    high = [math.ceil((v + CELL) / CELL) for v in reference.high]
    for x in range(low[0], high[0]):
        for y in range(low[1], high[1]):
            for z in range(low[2], high[2]):
                key = (x, y, z)
                point = center(key)
                nearest, normal, face, distance = reference.tree.find_nearest(point, CELL * 0.90)
                if nearest is None:
                    continue
                owner, uv = reference.sample(nearest, face)
                back = reference.tags[face] == "back"
                embroidery = mask.get((round(uv[0] * (width - 1)), round(uv[1] * (height - 1)))) if back else None
                outward = point.z < nearest.z + CELL * 0.15 if back else point.z > nearest.z - CELL * 0.15
                if embroidery and outward:
                    color = embroidery
                elif back and not outward:
                    color = "capeDeep"
                else:
                    color = "capeLight" if normal.x < -0.12 else "capeShade" if normal.x > 0.25 else "cape"
                cells[key] = color
    print("CAPE", len(cells), flush=True)
    return cells


def face_details(cells):
    head = cells["head"]
    columns = defaultdict(list)
    for key in head:
        columns[key[:2]].append(key[2])
    # Small recessed dark eye apertures with one muted light accent. They sit
    # on the original eye line and cheeks, not an added rectangular head.
    for side in (-1, 1):
        for x in range(round(side * 0.0375 / CELL) - 1, round(side * 0.0375 / CELL) + 1):
            y = round(1.975 / CELL)
            if (x, y) in columns:
                z = max(columns[(x, y)])
                head[(x, y, z)] = "eye"
                if x == round(side * 0.0375 / CELL) - 1:
                    head[(x, y, z)] = "eyeLight"
            for by in (y + 1,):
                if (x, by) in columns:
                    head[(x, by, max(columns[(x, by)]))] = "brow"
    for x in range(-1, 2):
        y = round(1.925 / CELL)
        if (x, y) in columns:
            head[(x, y, max(columns[(x, y)]))] = "mouth"
        if (x, y - 1) in columns:
            head[(x, y - 1, max(columns[(x, y - 1)]))] = "lip"


def brooch(cells, scale):
    # Preserve the actual small round shoulder clasp rather than a square block.
    body = cells["torso"]
    c = Vector((-0.12 * scale, 1.52 * scale, 0.078 * scale))
    for x in range(math.floor((c.x - 0.05) / CELL), math.ceil((c.x + 0.05) / CELL)):
        for y in range(math.floor((c.y - 0.05) / CELL), math.ceil((c.y + 0.05) / CELL)):
            distance = math.hypot((x + 0.5) * CELL - c.x, (y + 0.5) * CELL - c.y)
            if 0.029 <= distance <= 0.047:
                for z in range(math.floor(c.z / CELL), math.ceil((c.z + 0.021) / CELL)):
                    body[(x, y, z)] = "bronzeLight" if x * CELL < c.x else "bronze"


def rgba(name):
    code = PALETTE[name]
    return tuple(int(code[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def create_material():
    material = bpy.data.materials.new("Mercenary · sculpted permanent cell colors")
    material.use_nodes = True
    material.use_backface_culling = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = 0.96
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Specular IOR Level"].default_value = 0.10
    colors = material.node_tree.nodes.new("ShaderNodeVertexColor")
    colors.layer_name = "MercenaryPalette"
    material.node_tree.links.new(colors.outputs["Color"], shader.inputs["Base Color"])
    return material


def create_mesh(name, cells, pivot, material):
    vertices, faces, colors, exposed = [], [], [], 0
    for direction, corners in FACES:
        axis = next(i for i, value in enumerate(direction) if value)
        u_axis, v_axis = [i for i in range(3) if i != axis]
        offset = 1 if direction[axis] > 0 else 0
        planes = {}
        for point, color in sorted(cells.items()):
            if tuple(point[i] + direction[i] for i in range(3)) in cells:
                continue
            exposed += 1
            planes.setdefault(point[axis] + offset, {})[(point[u_axis], point[v_axis])] = color
        for plane, mask in sorted(planes.items()):
            for u, v in sorted(mask):
                if (u, v) not in mask:
                    continue
                color = mask[(u, v)]
                width, height = 1, 1
                while mask.get((u + width, v)) == color:
                    width += 1
                while all(mask.get((u + i, v + height)) == color for i in range(width)):
                    height += 1
                for i in range(width):
                    for j in range(height):
                        del mask[(u + i, v + j)]
                point, extent = [0, 0, 0], [1, 1, 1]
                point[axis], point[u_axis], point[v_axis] = plane - offset, u, v
                extent[u_axis], extent[v_axis] = width, height
                first = len(vertices)
                for corner in corners:
                    vertices.append(blender_point(tuple((point[i] + corner[i] * extent[i]) * CELL - pivot[i]
                                                        for i in range(3))))
                faces.append((first, first + 1, first + 2, first + 3))
                colors.append(rgba(color))
    mesh = bpy.data.meshes.new(name + " · sculpted exposed cell faces")
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
    directory.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 900, 1100
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.world.color = (0.16, 0.16, 0.16)
    for name, point, energy, size in [("Key", (3, -4, 5), 450, 4), ("Fill", (-3, 1, 3), 300, 3), ("Rim", (2, 3, 4), 400, 3)]:
        light = bpy.data.lights.new(name, "AREA")
        light.energy, light.shape, light.size = energy, "DISK", size
        obj = bpy.data.objects.new(name, light)
        bpy.context.collection.objects.link(obj)
        obj.location = point
        obj.rotation_euler = (Vector((0, 0, 1)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    data = bpy.data.cameras.new("Inspection camera")
    data.type = "ORTHO"
    camera = bpy.data.objects.new("Inspection camera", data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    for name, point, target, scale in [
        ("front", (2.0, -7, 2.5), (0, 0, 1.03), 2.5),
        ("back", (-2.0, 7, 2.5), (0, 0.1, 1.03), 2.5),
        ("profile", (7, -0.5, 2.3), (0, 0, 1.03), 2.5),
        ("face", (0.5, -5, 2.2), (0, -0.085, 1.96), 0.45),
    ]:
        camera.location = point
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
        data.ortho_scale, scene.render.filepath = scale, str(directory / (name + ".png"))
        bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview-dir", type=Path)
    parser.add_argument("--cell-record", type=Path,
                        help="Optional scratch-only occupied-cell record for geometry verification")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.data.orphans_purge(do_recursive=True)
    reference, bones, scale, floor = import_body()
    cells, fill_metrics = fill_body(reference)
    cells["cape"] = fill_cape(cape_reference(scale, floor))
    face_details(cells)
    brooch(cells, scale)
    for name in NAMES[:-1]:
        for key in cells["cape"]:
            cells[name].pop(key, None)
    # Delete imported render objects, preserving only the read geometry scaffold
    # in provenance. No source textures, armature, animations or lights ship.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.data.orphans_purge(do_recursive=True)
    root = bpy.data.objects.new("MercenarySculpted", None)
    bpy.context.collection.objects.link(root)
    pivots = {
        "torso": bones["Hips"], "head": bones["neck"],
        "leftUpperArm": bones["LeftArm"], "leftForearm": bones["LeftForeArm"],
        "rightUpperArm": bones["RightArm"], "rightForearm": bones["RightForeArm"],
        "leftThigh": bones["LeftUpLeg"], "leftShin": bones["LeftLeg"],
        "rightThigh": bones["RightUpLeg"], "rightShin": bones["RightLeg"], "cape": bones["cape_root"],
    }
    parents = {name: None for name in NAMES}
    for name in ["head", "leftUpperArm", "rightUpperArm", "cape"]:
        parents[name] = "torso"
    for side in ("left", "right"):
        parents[side + "Forearm"] = side + "UpperArm"
        parents[side + "Shin"] = side + "Thigh"
    if args.cell_record:
        args.cell_record.parent.mkdir(parents=True, exist_ok=True)
        args.cell_record.write_text(json.dumps({"cellSizeMetres": CELL, "solidFilling": fill_metrics,
            "parts": {name: {"parent": parents[name], "pivotMetresYUp": list(pivots[name]),
                              "cells": [list(key) + [color] for key, color in sorted(cells[name].items())]}
                      for name in NAMES}}))
    material, objects, stats = create_material(), {}, []
    for name in NAMES:
        obj, quads, exposed = create_mesh(name, cells[name], pivots[name], material)
        parent = parents[name]
        obj.parent = objects[parent] if parent else root
        local = pivots[name] - pivots[parent] if parent else pivots[name]
        obj.location = blender_point(local)
        objects[name] = obj
        stats.append({"name": name, "parent": parent or "MercenarySculpted", "pivotMetresYUp": list(pivots[name]),
                      "localPivotMetresYUp": list(local), "cells": len(cells[name]), "quads": quads,
                      "exposedCellFaces": exposed, "triangles": quads * 2})
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(ASSETS / "mercenary-sculpted.blend"))
    bpy.ops.export_scene.gltf(filepath=str(ASSETS / "mercenary-sculpted.glb"), export_format="GLB", export_yup=True,
                              export_apply=False, export_animations=False, export_cameras=False, export_lights=False,
                              export_extras=True, export_normals=True, export_texcoords=False)
    all_cells = [key for part in cells.values() for key in part]
    bounds = {"min": [min(point[axis] for point in all_cells) * CELL for axis in range(3)],
              "max": [(max(point[axis] for point in all_cells) + 1) * CELL for axis in range(3)]}
    metadata = {
        "purpose": "Finer source-guided fixed-cell mercenary; original and first block iteration retained",
        "lineage": "Body anatomy and rig landmarks from original Meshy study; fitted cape from authored study rest geometry",
        "authoring": "Offline solid-shape conversion, material-family repaint, explicit face correction, thick cape and small round bronze clasp",
        "license": "First-party authoring script AGPL-3.0-only; inherited model/reference production rights remain unqualified study provenance",
        "cellSizeMetres": CELL, "coordinateSystem": "Y-up, front +Z", "sourceScale": scale,
        "boundsYUp": bounds, "widthMetres": bounds["max"][0] - bounds["min"][0],
        "heightMetres": bounds["max"][1] - bounds["min"][1],
        "parts": stats, "cells": sum(len(c) for c in cells.values()),
        "triangles": sum(p["triangles"] for p in stats), "materials": 1, "textures": 0, "skins": 0, "clips": 0,
        "palette": PALETTE, "solidFilling": fill_metrics, "costUSD": 0,
        "sourceSha256": {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                         for p in (Path(__file__), BODY_SOURCE, CAPE_SOURCE)},
        "sha256": {name: hashlib.sha256((ASSETS / name).read_bytes()).hexdigest()
                   for name in ("mercenary-sculpted.glb", "mercenary-sculpted.blend")},
        "remaining": ["Creator likeness/style acceptance", "Arbitrary poses and equipment", "Production rights", "Crowd/device qualification"],
    }
    (ASSETS / "mercenary-sculpted-provenance.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print("EXPORT", json.dumps({"cells": metadata["cells"], "triangles": metadata["triangles"],
                               "bytes": (ASSETS / "mercenary-sculpted.glb").stat().st_size}), flush=True)
    if args.preview_dir:
        preview(args.preview_dir.resolve())


if __name__ == "__main__":
    main()
