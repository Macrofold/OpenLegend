"""Author three material/face studies on the preserved, rigged mercenary.

Blender --background --factory-startup --offline-mode --python-exit-code 1 --python \
  scripts/prepare-mercenary-variants.py -- --workspace /private/tmp/mercenary-art

The existing geometry, UVs, rig, scale and source artwork are read-only inputs.
Only new variants/ artwork and the requested external editable studies are saved.
No provider, image-generation service or runtime material code is involved.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'apps/client/src/characters/mercenary-assets'
SOURCE = ASSETS / 'mercenary.glb'
OUTPUT = ASSETS / 'variants'
NAMES = ('faithful', 'painted', 'graphic')
PALETTES = {
    'faithful': {
        'skin': ['#8d5d43', '#b77c57', '#d59b70', '#e0af83'],
        'hair': ['#242a2b', '#343b3d', '#535554'],
        'mail': ['#414b4f', '#536066', '#6c7a7b', '#929b96'],
        'leather': ['#3e3027', '#594330', '#755338', '#926b46'],
        'wrap': ['#736654', '#a3957c', '#c2b59b', '#d4c6ac'],
        'cape': ['#602b25', '#77392d', '#914735'],
        'gold': ['#77502b', '#b17d3d', '#d2a459', '#e0be78'],
        'ivory': '#b8b49c', 'iris': '#626a58', 'charcoal': '#262b2b',
        'lip': '#70503e', 'cheek': '#ba835f', 'nose': '#d6a077',
        'beard': '#41413b',
    },
    'painted': {
        'skin': ['#986b52', '#bd8966', '#d6a47a', '#e0b88c'],
        'hair': ['#26343a', '#3b4548', '#5e6260'],
        'mail': ['#33434a', '#4b626a', '#6b8083', '#99a49c'],
        'leather': ['#44392e', '#64503a', '#856447', '#ab8255'],
        'wrap': ['#7a705c', '#a99d81', '#c7b998', '#dfcfaa'],
        'cape': ['#612f2c', '#824235', '#a0553e'],
        'gold': ['#795632', '#af8443', '#d5af64', '#edcc83'],
        'ivory': '#d0c5a8', 'iris': '#536b60', 'charcoal': '#253036',
        'lip': '#714c3c', 'cheek': '#c18b65', 'nose': '#dfb082',
        'beard': '#45504d',
    },
    'graphic': {
        'skin': ['#8c6550', '#b98968', '#d5a881', '#e6bf91'],
        'hair': ['#26343a', '#3e4b4e', '#63706c'],
        'mail': ['#35464c', '#52676b', '#7e9190', '#abb4a7'],
        'leather': ['#3b3830', '#5d503e', '#837052', '#b29a6d'],
        'wrap': ['#706c59', '#a09a7e', '#c6bea0', '#e0d7b6'],
        'cape': ['#592c2b', '#783c33', '#9c503d'],
        'gold': ['#795631', '#b58e4c', '#dbb66e', '#edcf8d'],
        'ivory': '#d7cdb2', 'iris': '#718170', 'charcoal': '#263238',
        'lip': '#6c4a3c', 'cheek': '#be8c6b', 'nose': '#e0b68d',
        'beard': '#495550',
    },
}


def rgb(value):
    return np.array([int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32)


def colors(values):
    return np.array([rgb(v) for v in values])


def save_image(name, array, path):
    image = bpy.data.images.new(name, width=array.shape[1], height=array.shape[0], alpha=True)
    image.colorspace_settings.name = 'sRGB'
    rgba = np.ones((*array.shape[:2], 4), dtype=np.float32)
    rgba[:, :, :3] = array
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = str(path)
    image.file_format = 'PNG'
    image.save()
    image.pack()
    return image


def image_array(image):
    return np.array(image.pixels[:], dtype=np.float32).reshape(image.size[1], image.size[0], 4)[:, :, :3]


def rasterize_surface(obj, size):
    """Prepare a single UV-to-source-surface association for all three studies."""
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    positions = np.array([obj.matrix_world @ v.co for v in mesh.vertices], dtype=np.float32)
    uv = np.array([v.uv[:] for v in mesh.uv_layers.active.data], dtype=np.float32)
    output = np.zeros((size, size, 3), dtype=np.float32)
    covered = np.zeros((size, size), dtype=bool)
    for triangle in mesh.loop_triangles:
        points = uv[list(triangle.loops)] * size - .5
        lower = np.maximum(np.floor(points.min(axis=0)).astype(int), 0)
        upper = np.minimum(np.ceil(points.max(axis=0)).astype(int), size - 1)
        if np.any(upper < lower):
            continue
        xx, yy = np.meshgrid(np.arange(lower[0], upper[0] + 1), np.arange(lower[1], upper[1] + 1))
        a, b, c = points
        denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(denominator) < 1e-8:
            continue
        wa = ((b[1] - c[1]) * (xx - c[0]) + (c[0] - b[0]) * (yy - c[1])) / denominator
        wb = ((c[1] - a[1]) * (xx - c[0]) + (a[0] - c[0]) * (yy - c[1])) / denominator
        wc = 1 - wa - wb
        inside = (wa >= -.001) & (wb >= -.001) & (wc >= -.001)
        interpolated = wa[:, :, None] * positions[triangle.vertices[0]] + wb[:, :, None] * positions[triangle.vertices[1]] + wc[:, :, None] * positions[triangle.vertices[2]]
        view = np.s_[lower[1]:upper[1] + 1, lower[0]:upper[0] + 1]
        output[view][inside] = interpolated[inside]
        covered[view] |= inside
    evaluated.to_mesh_clear()
    return output, covered


def surface_materials(source, position, covered):
    x, y, z = [position[:, :, i] for i in range(3)]
    r, g, b = [source[:, :, i] for i in range(3)]
    value = source @ np.array([.25, .58, .17])
    mail = (b > r * 1.08) & (b > g * .98) & (z < 1.61)
    # The imported atlas mixes bright scuffs with cloth and tiny dark strokes
    # with skin. Establish coherent material regions on the actual surface,
    # rather than interpreting every pale worn pixel as a piece of bandage.
    cells = np.floor(position[covered] / .018).astype(np.int32)
    _, inverse = np.unique(cells, axis=0, return_inverse=True)
    counts = np.bincount(inverse)
    mail[covered] = (np.bincount(inverse, weights=mail[covered]) / counts)[inverse] > .27
    value[covered] = (np.bincount(inverse, weights=value[covered]) / counts)[inverse]
    hands = (np.abs(x) > .255) & (z > .73) & (z < 1.035)
    skin = ((r > g * 1.14) & (g > b * 1.08) & (r > .30) & (z > 1.57)) | hands
    limbs = ((z > .19) & (z < .62)) | ((np.abs(x) > .235) & (z > 1.025) & (z < 1.34))
    wraps = limbs & ~hands & ~mail
    hair = (z > 1.62) & ~skin
    leather = ~mail & ~skin & ~wraps & ~hair
    return value, mail, skin, wraps, hair, leather


def body_paint(name, position, covered, guides):
    palette = PALETTES[name]
    x, y, z = [position[:, :, i] for i in range(3)]
    value, mail, skin, wraps, hair, leather = guides
    # Retain the source's large changes in value and material boundaries. New
    # spatial marks describe material construction, rather than random noise.
    shade = np.clip(((value - .08) * 4.7).astype(int), 0, 3)
    out = colors(palette['leather'])[shade]
    pitch = .024 if name == 'faithful' else .032
    row = np.floor(z / pitch)
    course = np.mod(z / pitch, 1)
    across = np.mod((x + y * .4) / pitch + np.mod(row, 2) * .5, 1)
    ring = ((across - .5) / .31) ** 2 + ((course - .50) / .38) ** 2
    mail_shade = np.ones(value.shape, dtype=np.int8)
    if name == 'faithful':
        mail_shade[(ring > .70) & (ring < 1.12) & (course > .40)] = 2
        mail_shade[(ring < .42) & (course < .58)] = 0
    elif name == 'painted':
        # Angular, open link groups rather than oversized circular studs.
        mail_shade[(np.abs(across - (.22 + course * .46)) < .075) & (course > .25) & (course < .70)] = 2
        mail_shade[(np.abs(across - (.78 - course * .46)) < .075) & (course > .20) & (course < .64)] = 0
    else:
        # The graphic study puts detail in face/embroidery and leaves mail
        # largely quiet, with only its actual cuff and tunic-hem bands marked.
        mail_shade[(z < 1.11) | ((np.abs(x) > .24) & (z < 1.36))] = 0
    out[mail] = colors(palette['mail'])[mail_shade[mail]]
    # Broad diamond quilting, dark belt and selected seam highlights replace
    # the atlas's tiny fabric strokes; feet/pouches retain source value shapes.
    diagonal_a = np.mod((x + z * .65) / .105, 1)
    diagonal_b = np.mod((x - z * .65) / .105, 1)
    seam = (diagonal_a < .065) | (diagonal_b < .065)
    cloth = leather & (z > 1.03) & (z < 1.49)
    if name != 'faithful':
        out[cloth] = rgb(palette['leather'][2])
        out[cloth & seam] = rgb(palette['leather'][1])
        highlight = cloth & (diagonal_a > .065) & (diagonal_a < .105) & (x < .13)
        out[highlight] = rgb(palette['leather'][3])
    belt = leather & (z > .938) & (z < 1.015)
    out[belt] = rgb(palette['leather'][0])
    wrap_row = np.mod((z + x * .10) / .046, 1)
    wrap_shade = np.where(wrap_row < .13, 0, np.where(wrap_row < .31, 1, 2))
    out[wraps] = colors(palette['wrap'])[wrap_shade[wraps]]
    hair_shade = np.clip((value * 4).astype(int), 0, 2)
    out[hair] = colors(palette['hair'])[hair_shade[hair]]
    skin_shade = np.clip(((value - .23) * 6).astype(int), 0, 3)
    out[skin] = colors(palette['skin'])[skin_shade[skin]]
    # Deliberate curved-head value planes retain the existing nose and beard
    # silhouette. Eye/lid shapes are separate conforming geometry below.
    face = skin & (y < -.055) & (np.abs(x) < .085) & (z > 1.657) & (z < 1.79)
    out[face] = rgb(palette['skin'][1 if name == 'faithful' else 2])
    cheek = face & (np.abs(x) > .033) & (z < 1.718) & (z > 1.682)
    out[cheek] = rgb(palette['skin'][1])
    temple = face & (np.abs(x) > .066)
    out[temple] = rgb(palette['skin'][0])
    nose = face & (np.abs(x) < .014) & (z > 1.697) & (z < 1.744)
    out[nose] = rgb(palette['skin'][3])
    # Expand chart colors into a three-texel gutter. Tiny UV islands otherwise
    # borrow unrelated material colors as the game builds minification levels.
    valid = covered.copy()
    for _ in range(3):
        next_valid = valid.copy()
        next_out = out.copy()
        for axis, step in ((0, 1), (0, -1), (1, 1), (1, -1)):
            candidate = np.roll(valid, step, axis=axis) & ~next_valid
            edge = [slice(None), slice(None)]
            edge[axis] = 0 if step == 1 else -1
            candidate[tuple(edge)] = False
            next_out[candidate] = np.roll(out, step, axis=axis)[candidate]
            next_valid |= candidate
        out, valid = next_out, next_valid
    return out


def cape_paint(name, source):
    """Keep the peacock identity; simplify its construction, not cloth geometry."""
    palette = PALETTES[name]
    if name == 'faithful':
        gold = (source[:, :, 1] > source[:, :, 0] * .58) & (source[:, :, 0] > .39)
        value = source @ np.array([.4, .5, .1])
        out = colors(palette['cape'])[np.clip((value * 4).astype(int), 0, 2)]
        shade = np.clip(((value - .22) * 6).astype(int), 0, 3)
        out[gold] = colors(palette['gold'])[shade[gold]]
        return out
    height, width = source.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width]
    u, v = xx / width, yy / height
    out = np.empty((height, width, 3), dtype=np.float32)
    out[:] = rgb(palette['cape'][1])
    out[(u < .075) | (u > .925)] = rgb(palette['cape'][0])

    def stroke(ax, ay, bx, by, thickness, color):
        dx, dy = bx - ax, by - ay
        t = np.clip(((u - ax) * dx + (v - ay) * dy) / max(dx * dx + dy * dy, 1e-9), 0, 1)
        out[(u - ax - t * dx) ** 2 + (v - ay - t * dy) ** 2 < thickness * thickness] = color

    def oval(cx, cy, rx, ry, color):
        out[((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 < 1] = color

    gold = colors(palette['gold'])
    for side in (.045, .955):
        stroke(side, .03, side, .97, .004, gold[2])
        for row in np.arange(.10, .96, .11):
            oval(side, row, .010, .015, gold[1])
            oval(side, row, .004, .007, gold[3])
    stroke(.045, .045, .955, .045, .004, gold[2])
    # Paired opposing birds, swept necks and large teardrop feather eyes.
    # Geometry is drawn intentionally at an embroidery scale, with quiet wool
    # between motifs; no random cloth grain or replicated fine ring texture.
    for cx, cy, sign, scale in ((.37, .53, -1, 1.0), (.68, .43, 1, .78)):
        count = 7 if name == 'painted' else 5
        for i, angle in enumerate(np.linspace(-1.10, 1.10, count)):
            endx = cx + math.sin(angle) * .24 * scale
            endy = cy - (.15 + math.cos(angle) * .27) * scale
            stroke(cx, cy, endx, endy, .006 * scale, gold[1])
            oval(endx, endy, .025 * scale, .046 * scale, gold[2])
            oval(endx, endy + .003, .014 * scale, .029 * scale, gold[0])
            oval(endx, endy + .009, .006 * scale, .012 * scale, rgb(palette['cape'][0]))
            stroke(cx, cy, endx, endy - .025 * scale, .002 * scale, gold[3])
        oval(cx, cy, .047 * scale, .095 * scale, gold[2])
        neck = [(cx, cy + .04 * scale), (cx + sign * .025 * scale, cy + .12 * scale), (cx + sign * .012 * scale, cy + .20 * scale), (cx + sign * .045 * scale, cy + .24 * scale)]
        for a, b in zip(neck, neck[1:]):
            stroke(*a, *b, .018 * scale, gold[2])
        hx, hy = neck[-1]
        oval(hx, hy, .027 * scale, .020 * scale, gold[3])
        stroke(hx, hy, hx + sign * .042 * scale, hy - .006 * scale, .006 * scale, gold[2])
        oval(hx + sign * .008 * scale, hy + .004 * scale, .003 * scale, .003 * scale, gold[0])
        for offset in (-.014, 0, .014):
            stroke(hx + offset * scale, hy + .018 * scale, hx + offset * 1.3 * scale, hy + .043 * scale, .0025 * scale, gold[2])
    return out


def face_details(name, surface, head_world):
    regions = {}
    inverse = head_world.inverted()
    normal_matrix = head_world.to_3x3().transposed()

    def patch(region, polygon, offset):
        if sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(polygon, polygon[1:] + polygon[:1])) < 0:
            polygon = list(reversed(polygon))
        target = regions.setdefault(region, {'positions': [], 'normals': [], 'indices': []})
        start = len(target['positions']) // 3
        center = tuple(sum(p[i] for p in polygon) / len(polygon) for i in range(2))
        for x, z in [center] + polygon:
            location, normal, _, _ = surface.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)), 2)
            if location is None:
                raise RuntimeError('Authored facial patch misses the source head')
            location.y -= offset
            target['positions'].extend(round(v, 7) for v in inverse @ location)
            target['normals'].extend(round(v, 7) for v in (normal_matrix @ normal).normalized())
        for i in range(len(polygon)):
            target['indices'].extend([start, start + i + 1, start + (i + 1) % len(polygon) + 1])

    def ellipse(x, z, rx, rz, count=10):
        return [(x + math.cos(i * math.tau / count) * rx, z + math.sin(i * math.tau / count) * rz) for i in range(count)]

    width = {'faithful': .0155, 'painted': .0170, 'graphic': .0180}[name]
    for sign in (-1, 1):
        x = sign * .031
        patch('ivory', [(x - width, 1.733), (x - width * .55, 1.740), (x + width * .5, 1.739), (x + width, 1.733), (x + width * .5, 1.727), (x - width * .5, 1.727)], .0015)
        patch('iris', ellipse(x, 1.733, .0068, .0065), .0022)
        patch('charcoal', ellipse(x, 1.733, .0030, .0042), .0030)
        patch('charcoal', [(x - width, 1.735), (x - width * .55, 1.742), (x + width * .55, 1.741), (x + width, 1.735), (x + width * .5, 1.738), (x - width * .5, 1.739)], .0034)
        outer, inner = x + sign * .021, x - sign * .016
        brow = 1.746 + (.002 if sign < 0 else 0)
        patch('charcoal', [(outer, brow + .003), (outer - sign * .006, brow + .007), (inner, brow + .002), (inner, brow - .002), (outer - sign * .004, brow + .001)], .0018)
        if name != 'faithful':
            patch('cheek', [(sign * .035, 1.711), (sign * .063, 1.716), (sign * .069, 1.698), (sign * .052, 1.687)], .0008)
    patch('lip', [(-.018, 1.671), (-.008, 1.673), (.010, 1.672), (.019, 1.669), (.007, 1.668), (-.009, 1.669)], .0018)
    if name == 'graphic':
        patch('nose', [(-.006, 1.734), (.004, 1.735), (.012, 1.700), (.001, 1.696), (-.008, 1.702)], .0007)
        patch('beard', [(-.039, 1.657), (-.017, 1.644), (.022, 1.644), (.045, 1.660), (.032, 1.650), (.005, 1.638), (-.023, 1.645)], .0009)
    return {'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'space': 'Original animated Head node local coordinates, in source centimetres', 'authoringScript': 'scripts/prepare-mercenary-variants.py', 'palette': {k: v for k, v in PALETTES[name].items() if isinstance(v, str)}, 'regions': [{'name': key, **value} for key, value in regions.items()]}


def editable_face(rig, face):
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Authored facial detail '):
            bpy.data.objects.remove(obj, do_unlink=True)
    rest = rig.data.bones['Head'].matrix_local
    for region in face['regions']:
        positions = [rest @ Vector(region['positions'][i:i + 3]) for i in range(0, len(region['positions']), 3)]
        triangles = [region['indices'][i:i + 3] for i in range(0, len(region['indices']), 3)]
        mesh = bpy.data.meshes.new('Authored facial detail ' + region['name'])
        mesh.from_pydata(positions, [], triangles)
        mesh.update()
        obj = bpy.data.objects.new(mesh.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        obj.matrix_world = rig.matrix_world
        group = obj.vertex_groups.new(name='Head')
        group.add(list(range(len(mesh.vertices))), 1, 'REPLACE')
        modifier = obj.modifiers.new('Original Head attachment', 'ARMATURE')
        modifier.object = rig
        material = bpy.data.materials.new(mesh.name)
        material.use_nodes = True
        color = rgb(face['palette'][region['name']])
        color = np.where(color <= .04045, color / 12.92, ((color + .055) / 1.055) ** 2.4)
        material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (*color, 1)
        material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .95
        mesh.materials.append(material)
        for polygon in mesh.polygons:
            polygon.use_smooth = True


def editable_cloth(rig):
    """Restore the game's separate cloth for honest editable/source previews.

    The bundled GLB panels are only material donors, intentionally unskinned.
    Preview the same authored rest surfaces; the game still owns simulation.
    """
    data = json.loads((ASSETS.parent / 'mercenary-cloth.json').read_text())
    local = rig.data.bones['cape_root'].matrix_local @ rig.pose.bones['cape_root'].matrix.inverted() @ rig.matrix_world.inverted()
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.name.startswith('Cape ·') and 'clasp' not in obj.name:
            obj.hide_render = True
            obj.hide_set(True)
    for patch in data['patches']:
        positions = [local @ Vector((x, -z, y)) for x, y, z in zip(patch['positions'][0::3], patch['positions'][1::3], patch['positions'][2::3])]
        faces = []
        for y in range(patch['rows'] - 1):
            for x in range(patch['columns'] - 1):
                a = y * patch['columns'] + x
                face = (a, a + 1, a + patch['columns'] + 1, a + patch['columns'])
                faces.append(tuple(reversed(face)) if patch['flip'] else face)
        mesh = bpy.data.meshes.new('Editable runtime cloth ' + patch['name'])
        mesh.from_pydata(positions, [], faces)
        mesh.update()
        uv = mesh.uv_layers.new(name='Original cloth UVs')
        for polygon in mesh.polygons:
            polygon.use_smooth = True
            for index in polygon.loop_indices:
                vertex = mesh.loops[index].vertex_index
                uv.data[index].uv = patch['uvs'][vertex * 2:vertex * 2 + 2]
        obj = bpy.data.objects.new(mesh.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        obj.matrix_world = rig.matrix_world
        mesh.materials.append(bpy.data.materials['Madder wool · gold peacock embroidery'])
        mesh.materials.append(bpy.data.materials['Cape lining · dark russet'])
        group = obj.vertex_groups.new(name='cape_root')
        group.add(list(range(len(mesh.vertices))), 1, 'REPLACE')
        armature = obj.modifiers.new('Original cape root attachment', 'ARMATURE')
        armature.object = rig
        solid = obj.modifiers.new('Source-preview wool lining', 'SOLIDIFY')
        solid.thickness = .003 / rig.scale.x
        solid.material_offset = 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workspace', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    args.workspace.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    rig = bpy.data.objects['MercenaryRig']
    rig.animation_data.action = bpy.data.actions['Idle']
    bpy.context.scene.frame_set(1)
    editable_cloth(rig)
    body = bpy.data.objects['Mercenary · worn mail over quilted gambeson']
    for material in body.data.materials:
        principled = material.node_tree.nodes.get('Principled BSDF')
        for link in list(material.node_tree.links):
            if link.to_socket == principled.inputs['Emission Color']:
                material.node_tree.links.remove(link)
        principled.inputs['Emission Color'].default_value = (0, 0, 0, 1)
    size = 1024
    source = image_array(bpy.data.images['body-pixel-atlas'])
    indices = np.minimum((np.arange(size) + .5) * source.shape[0] / size, source.shape[0] - 1).astype(int)
    source = source[indices[:, None], indices[None, :]]
    position, covered = rasterize_surface(body, size)
    guides = surface_materials(source, position, covered)
    cape_source = image_array(bpy.data.images['cape-pixel-basecolor'])
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    surface = BVHTree.FromPolygons([body.matrix_world @ v.co for v in mesh.vertices], [list(t.vertices) for t in mesh.loop_triangles], all_triangles=True)
    head_world = rig.matrix_world @ rig.pose.bones['Head'].matrix
    metadata = {'source': 'Preserved owner-selected Peacock Mercenary study; local derivative only, original distribution rights remain unresolved.', 'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'blender': bpy.app.version_string, 'authoringScript': 'scripts/prepare-mercenary-variants.py', 'geometry': 'Original body vertices, UVs, rig, animations and cape geometry unchanged. Runtime cloth continues to use existing authored contact/clearance.', 'bodyMapSize': [size, size], 'capeMapSize': list(cape_source.shape[:2][::-1]), 'variants': []}
    body_texture = next(n for n in body.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and n.image.name == 'body-pixel-atlas')
    cape_material = bpy.data.materials['Madder wool · gold peacock embroidery']
    cape_texture = next(n for n in cape_material.node_tree.nodes if n.type == 'TEX_IMAGE')
    for name in NAMES:
        body_path, cape_path, face_path = [OUTPUT / f'{kind}-{name}.{extension}' for kind, extension in (('body', 'png'), ('cape', 'png'), ('face', 'json'))]
        body_image = save_image(f'Authored {name} body', body_paint(name, position, covered, guides), body_path)
        cape_image = save_image(f'Authored {name} cape', cape_paint(name, cape_source), cape_path)
        face = face_details(name, surface, head_world)
        face_path.write_text(json.dumps(face, indent=2) + '\n')
        editable_face(rig, face)
        body_texture.image = body_image
        cape_texture.image = cape_image
        body_texture.interpolation = cape_texture.interpolation = 'Closest'
        bpy.ops.wm.save_as_mainfile(filepath=str(args.workspace / f'mercenary-{name}.blend'))
        metadata['variants'].append({'name': name, 'body': body_path.name, 'cape': cape_path.name, 'face': face_path.name, 'palette': PALETTES[name], 'sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (body_path, cape_path, face_path)}})
    evaluated.to_mesh_clear()
    (OUTPUT / 'provenance.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps({'output': str(OUTPUT), 'workspace': str(args.workspace), 'coveredAtlasPixels': int(covered.sum()), 'variants': list(NAMES)}))


if __name__ == '__main__':
    main()
