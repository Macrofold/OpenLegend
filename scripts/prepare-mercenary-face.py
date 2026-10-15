"""Author small shaped facial details against the original head surface.

Run with Blender --background --factory-startup --python scripts/prepare-mercenary-face.py.
The output stores Head-local geometry, so camera motion never paints the face.
The source model and its distinctive nose, beard, scars and hair stay intact.
"""
from pathlib import Path
import hashlib
import json
import math

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ASSETS = Path(__file__).resolve().parents[1] / "apps/client/src/characters/mercenary-assets"
OUTPUT = ASSETS / "mercenary-face.json"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ASSETS / "mercenary.glb"))
rig = bpy.data.objects["MercenaryRig"]
rig.animation_data.action = bpy.data.actions["Idle"]
bpy.context.scene.frame_set(1)
obj = bpy.data.objects["Mercenary · worn mail over quilted gambeson"]
evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh = evaluated.to_mesh()
mesh.calc_loop_triangles()
vertices = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
surface = BVHTree.FromPolygons(vertices, [list(t.vertices) for t in mesh.loop_triangles], all_triangles=True)
head_inverse = (rig.matrix_world @ rig.pose.bones["Head"].matrix).inverted()
regions = {}


def patch(region, polygon, offset):
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(polygon, polygon[1:] + polygon[:1]))
    if area < 0:
        polygon = list(reversed(polygon))
    target = regions.setdefault(region, {"positions": [], "indices": []})
    start = len(target["positions"]) // 3
    center = tuple(sum(point[axis] for point in polygon) / len(polygon) for axis in range(2))
    for x, z in [center] + polygon:
        location, normal, _, _ = surface.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)), 2)
        if location is None:
            raise RuntimeError("Facial detail does not meet the authored head")
        # Offset along the viewing-facing surface normal; the tiny gap avoids
        # fighting the original face while the points keep its curved shape.
        location += normal * offset
        local = head_inverse @ location
        target["positions"].extend(round(value, 7) for value in local)
    for i in range(len(polygon)):
        target["indices"].extend([start, start + i + 1, start + (i + 1) % len(polygon) + 1])


def ellipse(x, z, rx, rz, count=12):
    return [(x + math.cos(i * 2 * math.pi / count) * rx,
             z + math.sin(i * 2 * math.pi / count) * rz) for i in range(count)]


for sign in (-1, 1):
    x = sign * .031
    # Slightly angular almonds follow the stern, asymmetric source face rather
    # than adding spherical cartoon eyeballs or a rectangular pixel mask.
    patch("ivory", [(x-.017,1.733), (x-.010,1.741), (x+.008,1.741),
                    (x+.017,1.734), (x+.009,1.726), (x-.010,1.727)], .0015)
    patch("iris", ellipse(x, 1.7335, .0072, .0075), .0023)
    patch("charcoal", ellipse(x, 1.7335, .0036, .0050), .0032)
    # A tapered upper lid and angled brow preserve the character's dark brows.
    patch("charcoal", [(x-.017,1.735), (x-.010,1.743), (x+.009,1.743),
                       (x+.017,1.736), (x+.009,1.740), (x-.010,1.740)], .0033)
    outer = x + sign * .019
    inner = x - sign * .015
    patch("charcoal", [(outer,1.752), (outer-sign*.004,1.757),
                       (inner,1.750), (inner,1.744), (outer-sign*.003,1.749)], .0018)

# A short muted lip crease remains inside the original moustache; the source
# nose and beard retain their shaped geometry and individual silhouette.
patch("lip", [(-.017,1.671),(-.009,1.673),(.010,1.673),(.018,1.669),
              (.009,1.669),(-.009,1.669)], .0016)

data = {"sourceSha256": hashlib.sha256((ASSETS / "mercenary.glb").read_bytes()).hexdigest(),
        "space": "Original animated Head node local coordinates, in source centimetres",
        "authoringScript": "scripts/prepare-mercenary-face.py",
        "regions": [{"name": name, **value} for name, value in regions.items()]}
OUTPUT.write_text(json.dumps(data, indent=2) + "\n")
print(json.dumps({"output": str(OUTPUT), "regions": len(regions),
                  "vertices": sum(len(r["positions"])//3 for r in regions.values()),
                  "triangles": sum(len(r["indices"])//3 for r in regions.values())}))
