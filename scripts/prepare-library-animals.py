"""Prepare three painted, rigged hares from CDmir/TinyWorlds' CC0 rabbit.

Run with Blender background Python; never execute scripts embedded in the source.
The original source stays unchanged beside the outputs. Texture colors below are
new authored coat regions; no source photograph or normal map is resampled.
"""
import argparse
import hashlib
import json
import math
import sys
import struct
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

SOURCE_HASH = "bb6deef1ee91b21380355138374cae87946451ce864502b1af68eb60f4750843"
VARIANTS = {
    "field": {"coat": "9f896c", "back": "776951", "belly": "d1c5a9", "muzzle": "c5b596", "ear": "a87e6d", "tip": "4b4036"},
    "russet": {"coat": "aa7955", "back": "735843", "belly": "dfc7a3", "muzzle": "c8a77e", "ear": "b47e72", "tip": "514138"},
    "winter": {"coat": "dadbcf", "back": "b7bdb2", "belly": "efead6", "muzzle": "e4dfca", "ear": "ba9c97", "tip": "5a554b"},
}


def rgb(hex_color):
    values = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values) + (1,)


def coat_at(point, normal, palette):
    x, y, z = point
    # Large intentional fields describe the back, belly, face and feet. Small
    # staggered shoulder/haunch marks are fixed paint, never frame/camera noise.
    color = palette["coat"]
    if z > 5.7 and y > -8 and normal.z > .25:
        color = palette["back"]
    if (normal.z < -.25 and z < 6.5) or (abs(x) < 1.45 and y < -6.4 and z < 7.4):
        color = palette["belly"]
    if y < -11.7 and z < 9.3:
        color = palette["muzzle"]
    if z < 1.4:
        color = palette["belly"]
    if z > 10.1 and y < -8.5:
        color = palette["ear"] if normal.y < -.15 else palette["coat"]
    if z > 13.5 and y < -8:
        color = palette["tip"]
    if y < -13.2 and 7.8 < z < 8.7 and abs(x) < .55:
        color = "655047"
    shoulder = -7.5 < y < -4.2 and 6.4 < z < 8.1
    haunch = .3 < y < 3.2 and 4.8 < z < 7
    if (shoulder or haunch) and (math.floor(y * 2) + math.floor(z * 2)) % 7 == 0:
        color = palette["muzzle"]
    return rgb(color)


def paint(mesh, palette, output):
    size = 64
    pixels = list(rgb(palette["coat"])) * (size * size)
    mesh.calc_loop_triangles()
    uv = mesh.uv_layers[0].data
    for tri in mesh.loop_triangles:
        if mesh.polygons[tri.polygon_index].material_index == 1:
            continue
        coords = [uv[i].uv * size for i in tri.loops]
        points = [mesh.vertices[i].co for i in tri.vertices]
        a, b, c = coords
        det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
        if abs(det) < 1e-8:
            continue
        for py in range(max(0, math.floor(min(p.y for p in coords))), min(size, math.ceil(max(p.y for p in coords)))):
            for px in range(max(0, math.floor(min(p.x for p in coords))), min(size, math.ceil(max(p.x for p in coords)))):
                u = ((b.y - c.y) * (px + .5 - c.x) + (c.x - b.x) * (py + .5 - c.y)) / det
                v = ((c.y - a.y) * (px + .5 - c.x) + (a.x - c.x) * (py + .5 - c.y)) / det
                w = 1 - u - v
                if min(u, v, w) >= -.025:
                    color = coat_at(points[0] * u + points[1] * v + points[2] * w, tri.normal, palette)
                    pixels[(py * size + px) * 4:(py * size + px + 1) * 4] = color
    image = bpy.data.images.new("Authored 64px coat", width=size, height=size, alpha=False)
    image.pixels = pixels
    image.filepath_raw = str(output)
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def material(name, color, image=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = .95
    shader.inputs["Specular IOR Level"].default_value = .08
    if image:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = image
        node.interpolation = "Closest"
        mat.node_tree.links.new(node.outputs["Color"], shader.inputs["Base Color"])
    return mat


def prepare(source, output, variant):
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    rabbit = bpy.data.objects["Rabbit"]
    rig = bpy.data.objects["Armature"]
    for obj in list(bpy.data.objects):
        if obj not in (rabbit, rig):
            bpy.data.objects.remove(obj, do_unlink=True)
    # Alpha fur and whisker cards are unsuitable at this size; the original
    # solid animal, actual eye geometry and every skeletal joint are retained.
    mesh = rabbit.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index >= 782], context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    for polygon in mesh.polygons:
        polygon.material_index = int(all(i < 38 for i in polygon.vertices))
        polygon.use_smooth = True
    # Rest-mesh changes preserve the original weighted skeleton and source clips.
    for vertex in mesh.vertices:
        x, y, z = vertex.co
        ear = max((g.weight for g in vertex.groups if rabbit.vertex_groups[g.group].name.startswith("Ear_")), default=0)
        if variant == "field":
            vertex.co.x *= .94
            vertex.co.z += max(0, z - 10) * .08 * ear
        elif variant == "russet":
            vertex.co.x *= 1.04
            vertex.co.y += max(0, z - 10) * .16 * ear
            vertex.co.x += x * .10 * ear
            vertex.co.z -= max(0, z - 10) * .04 * ear
        else:
            vertex.co.x *= 1.13 if y > -9 else 1.08
            vertex.co.z -= max(0, z - 10) * .18 * ear
            vertex.co.y += .18 * ear
    # Match glTF's four-weight skinning before measuring the exported envelope.
    for vertex in mesh.vertices:
        weights = sorted(((g.group, g.weight) for g in vertex.groups if g.weight > 0), key=lambda pair: pair[1], reverse=True)
        total = sum(weight for _, weight in weights[:4])
        for index, _ in weights:
            rabbit.vertex_groups[index].remove([vertex.index])
        for index, weight in weights[:4]:
            rabbit.vertex_groups[index].add([vertex.index], weight / total, "REPLACE")
    mesh.update()
    mesh.validate(clean_customdata=False)
    mesh.materials.clear()
    image = paint(mesh, VARIANTS[variant], output / f"hare-{variant}-coat.png")
    mesh.materials.append(material(f"{variant} authored coat", (1, 1, 1, 1), image))
    mesh.materials.append(material("Warm dark eyes", rgb("211d19")))
    for polygon in mesh.polygons:
        polygon.material_index = int(all(i < 38 for i in polygon.vertices))
    # Delete unused projection layers; this trusted recipe paints the source UVs.
    while len(mesh.uv_layers) > 1:
        mesh.uv_layers.remove(mesh.uv_layers[-1])
    mesh.uv_layers.active_index = 0
    rig.animation_data.action = bpy.data.actions["Sitting.000"]
    bpy.context.scene.frame_set(0)
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = rabbit.evaluated_get(deps)
    posed = evaluated.to_mesh()
    points = [evaluated.matrix_world @ v.co for v in posed.vertices]
    minimum = Vector(tuple(min(p[a] for p in points) for a in range(3)))
    maximum = Vector(tuple(max(p[a] for p in points) for a in range(3)))
    evaluated.to_mesh_clear()
    scale = .45 / (maximum.z - minimum.z)
    root = bpy.data.objects.new(f"Hare {variant} · fixed native height", None)
    bpy.context.collection.objects.link(root)
    rig.parent = root
    root.scale = (scale,) * 3
    root.location.z = -minimum.z * scale
    # Export two real source actions only. Keep source controls/constraints for
    # sampling, but never attach locomotion to the native entity transform.
    rig.animation_data.action = None
    for name, source_name, end in (("Idle", "Sitting.000", 550), ("Run", "Running", 16)):
        action = bpy.data.actions[source_name]
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, 0, action)
        strip.action_frame_start = 0
        strip.action_frame_end = end
        strip.frame_start = 0
        strip.frame_end = end
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (root, rig, rabbit): obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    target = output / f"hare-{variant}.glb"
    bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB", use_selection=True,
        export_animation_mode="NLA_TRACKS", export_bake_animation=True,
        export_anim_slide_to_zero=True, export_anim_single_armature=True,
        export_force_sampling=True, export_yup=True, export_extras=True,
        export_image_format="AUTO", export_texcoords=True, export_normals=True)
    # Fit the actual exported/skinned neutral pose, because glTF samples source
    # constraints and skin matrices; the source object's bounds alone differ.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(target.resolve()))
    bpy.context.scene.frame_set(0)
    deps = bpy.context.evaluated_depsgraph_get()
    actual = next(o for o in bpy.data.objects if o.type == "MESH" and o.parent and o.parent.type == "ARMATURE").evaluated_get(deps)
    posed = actual.to_mesh()
    points = [actual.matrix_world @ v.co for v in posed.vertices]
    low = min(p.z for p in points)
    high = max(p.z for p in points)
    actual.to_mesh_clear()
    correction = .45 / (high - low)
    blob = target.read_bytes()
    length = struct.unpack_from("<I", blob, 12)[0]
    data = json.loads(blob[20:20 + length])
    top = next(n for n in data["nodes"] if n.get("name") == f"Hare {variant} · fixed native height")
    top["scale"] = [v * correction for v in top["scale"]]
    top["translation"][1] = (top["translation"][1] - low) * correction
    encoded = json.dumps(data, separators=(",", ":"), ensure_ascii=True).encode()
    encoded += b" " * (-len(encoded) % 4)
    rest = blob[20 + length:]
    target.write_bytes(struct.pack("<III", 0x46546c67, 2, 20 + len(encoded) + len(rest)) + struct.pack("<II", len(encoded), 0x4e4f534a) + encoded + rest)
    return {"variant": variant, "sourceNeutralBounds": [list(minimum), list(maximum)],
        "scale": scale * correction, "heightMetres": .45, "texture": [64, 64],
        "runtimeBytes": target.stat().st_size, "runtimeSha256": hashlib.sha256(target.read_bytes()).hexdigest()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != SOURCE_HASH:
        raise ValueError("Expected the retained, unmodified CC0 CDmir rabbit source")
    args.output.mkdir(parents=True, exist_ok=True)
    result = [prepare(args.source, args.output, name) for name in VARIANTS]
    (args.output / "preparation.json").write_text(json.dumps(result, indent=2) + "\n")
