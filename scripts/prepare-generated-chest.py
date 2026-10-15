"""Bounded E08 cleanup of the attributed Meshy chest; run with Blender Python.

The source hash and licence are recorded beside the runtime GLB. This preserves
the generated triangles/UVs, closes its raised lid and groups existing paint
into wood/iron regions. It does not synthesize a replacement chest mesh.
"""

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def prepare(source, output):
    expected = "eb70e139f5f776dc7204b9fff498bf9cdc7c75f275d65053d73a597b6908c5ab"
    if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
        raise ValueError("The E08 recipe requires the recorded Meshy remesh source.")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    original = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
    mesh = original.data
    world = original.matrix_world
    normal_world = world.to_3x3().inverted().transposed()
    paint = next(
        node.image
        for node in mesh.materials[0].node_tree.nodes
        if node.type == "TEX_IMAGE" and node.image.name.startswith("Baked_BaseColor")
    )
    pixels = list(paint.pixels)
    texture_width, texture_height = paint.size
    uv = mesh.uv_layers.active.data
    # The source's lid lies above this diagonal plane, including its attached
    # hinge strip. A rigid 45-degree turn closes it without deforming the base.
    hinge = Vector((0, 0.68, 0.82))
    rotation = Matrix.Rotation(math.radians(45), 3, "X")
    vertices, normals, coordinates, regions = [], [], [], []
    lid_triangles = 0
    for polygon in mesh.polygons:
        corners = [mesh.loops[index] for index in polygon.loop_indices]
        points = [world @ mesh.vertices[corner.vertex_index].co for corner in corners]
        center = sum(points, Vector()) / len(points)
        lid = center.z > 0.88 or center.z + center.y > 1.42
        lid_triangles += int(lid)
        texcoords = [uv[index].uv.copy() for index in polygon.loop_indices]
        midpoint = sum(texcoords, Vector((0, 0))) / len(texcoords)
        x = min(texture_width - 1, max(0, int(midpoint.x * texture_width)))
        y = min(texture_height - 1, max(0, int(midpoint.y * texture_height)))
        red, green, blue = pixels[(y * texture_width + x) * 4 : (y * texture_width + x) * 4 + 3]
        regions.append(0 if red > green * 1.08 and red > blue * 1.2 else 1)
        for loop_index, point, texcoord in zip(polygon.loop_indices, points, texcoords):
            normal = normal_world @ mesh.corner_normals[loop_index].vector
            if lid:
                point = hinge + rotation @ (point - hinge)
                normal = rotation @ normal
            vertices.append(point)
            normals.append(normal)
            coordinates.append(texcoord)
    minimum = Vector(tuple(min(point[axis] for point in vertices) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in vertices) for axis in range(3)))
    extent = maximum - minimum
    center = (minimum + maximum) / 2
    # Unit width/depth and bottom-anchored unit height. The existing renderer
    # supplies each unchanged crate envelope (resource height .8 m, item pile .55 m).
    normalized = [((p.x - center.x) / extent.x, (p.y - center.y) / extent.y, (p.z - minimum.z) / extent.z) for p in vertices]
    normalized_normals = [Vector((n.x * extent.x, n.y * extent.y, n.z * extent.z)).normalized() for n in normals]
    data = bpy.data.meshes.new("Generated chest · closed source triangles")
    unique, lookup, faces = [], {}, []
    for index in range(0, len(vertices), 3):
        face = []
        for corner in range(index, index + 3):
            key = (tuple(normalized[corner]), tuple(normalized_normals[corner]), tuple(coordinates[corner]))
            if key not in lookup:
                lookup[key] = len(unique)
                unique.append(normalized[corner])
            face.append(lookup[key])
        faces.append(face)
    data.from_pydata(unique, [], faces)
    data.update()
    data.normals_split_custom_set(normalized_normals)
    layer = data.uv_layers.new(name="Source UV")
    for index, coordinate in enumerate(coordinates):
        layer.data[index].uv = coordinate
    for name, color in (("Oak boards", (0.20, 0.105, 0.045, 1)), ("Forged iron", (0.035, 0.045, 0.05, 1))):
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        principled = material.node_tree.nodes.get("Principled BSDF")
        principled.inputs["Roughness"].default_value = 0.95
        principled.inputs["Metallic"].default_value = 0
        principled.inputs["Specular IOR Level"].default_value = 0.08
        principled.inputs["Base Color"].default_value = color
        data.materials.append(material)
    for polygon, region in zip(data.polygons, regions):
        polygon.material_index = region
        polygon.use_smooth = True
    obj = bpy.data.objects.new("Generated supply chest", data)
    bpy.context.collection.objects.link(obj)
    obj["source"] = "Meshy chest remesh; see generated-chest-provenance.json"
    obj["license"] = "CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/"
    obj["attribution"] = "Production Gothic reward chest created with Meshy; runtime processing by Samfa12/Codex."
    obj["modifications"] = "OpenLegend closes the generated lid, groups existing paint into oak/iron regions and fits the existing crate envelope."
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True,
        export_animations=False, export_yup=True, export_extras=True, export_image_format="AUTO")
    print(json.dumps({"sourceTriangles": len(mesh.polygons), "runtimeTriangles": len(data.polygons),
        "lidTrianglesRigidlyRotated": lid_triangles, "regionTriangles": [regions.count(0), regions.count(1)],
        "closedSourceBounds": [list(minimum), list(maximum)], "runtimeBytes": output.stat().st_size,
        "runtimeSha256": hashlib.sha256(output.read_bytes()).hexdigest()}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
    prepare(args.source, args.output)
