"""Original shaped nature studies with fixed, explicitly painted pixel fields.

Blender --background --factory-startup --disable-autoexec --python-exit-code 1 \
  --python scripts/prepare-study-nature.py -- [--draft] [--render /private/tmp/nature.png]
No imported meshes, world/save access, external service or camera-dependent paint.
"""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import begin, box_uv, export_asset, finish, pixel_material


def field(size, background):
    return [[background for _ in range(size)] for _ in range(size)]


def patch(cells, x, y, rows, color):
    """Connected stepped brush shape; every visible mark is authored, not noise."""
    size = len(cells)
    for dy, (left, width) in enumerate(rows):
        for dx in range(left, left + width):
            cells[(y + dy) % size][(x + dx) % size] = color


def paints(output, variant):
    palettes = {
        'natural': ['#405945', '#4e6950', '#5f7956', '#738963', '#87966f', '#334d3d'],
        'graphic': ['#364e43', '#496850', '#66825d', '#83986c', '#9da97d', '#2d453c'],
        'open': ['#4a6055', '#5e7764', '#788c6c', '#93a17d', '#b0b594', '#3d554c'],
    }
    cells = field(64, 1)
    # Broad interconnected foliage planes leave substantial resting areas.
    for x, y, c in [(3, 3, 0), (29, 25, 0), (8, 44, 0), (41, 52, 5)]:
        patch(cells, x, y, [(5, 9), (2, 16), (0, 20), (1, 21), (3, 18), (5, 14), (8, 8)], c)
    for x, y in [(10, 10), (38, 4), (25, 43), (49, 31)]:
        patch(cells, x, y, [(4, 7), (1, 13), (0, 15), (0, 17), (2, 13), (5, 7)], 2)
        patch(cells, x + 2, y + 5, [(3, 7), (0, 11), (1, 10), (3, 6)], 3)
    # Sparse smaller leaf pairs sit inside larger painted groups.
    for x, y in [(15, 15), (43, 9), (31, 48), (54, 36), (3, 33), (35, 20)]:
        patch(cells, x, y, [(1, 3), (0, 5), (0, 4), (1, 2)], 3)
        patch(cells, x + 5, y + 3, [(1, 2), (0, 4), (0, 3)], 2)
        if variant == 'graphic':
            patch(cells, x + 1, y, [(0, 2), (0, 3)], 4)
    leaves = pixel_material('nature-' + variant + '-leaves', palettes[variant], cells, output)
    bark_cells = field(64, 1)
    for x, y, height in [(3, 3, 23), (18, 32, 26), (37, 5, 32), (54, 29, 25)]:
        patch(bark_cells, x, y, [(1 if n % 9 < 3 else 0, 3 if n % 11 < 7 else 2) for n in range(height)], 0)
        patch(bark_cells, x + 4, y + 2, [(0, 2)] * (height - 5), 2)
    for x, y in [(11, 26), (30, 54), (45, 16)]:
        patch(bark_cells, x, y, [(1, 3), (0, 5), (0, 5), (1, 3)], 0)
        patch(bark_cells, x + 1, y + 1, [(0, 2), (0, 2)], 3)
    bark_palette = ['#4b4031', '#6a543b', '#806b49', '#9c855b']
    if variant == 'open':
        bark_palette = ['#596052', '#8e9177', '#aaad8e', '#c4c5a6']
    bark = pixel_material('nature-' + variant + '-bark', bark_palette, bark_cells, output)
    stone_cells = field(64, 1)
    for x, y, color in [(2, 5, 0), (34, 31, 0), (21, 9, 2), (5, 39, 2), (43, 7, 3)]:
        patch(stone_cells, x, y, [(6, 8), (3, 16), (0, 21), (0, 23), (2, 22), (5, 17), (9, 11)], color)
    for x, y in [(15, 24), (36, 49), (52, 21)]:
        patch(stone_cells, x, y, [(0, 11), (3, 10), (7, 8)], 0)
        patch(stone_cells, x + 1, y - 1, [(0, 6), (5, 6)], 3)
    stone = pixel_material('nature-' + variant + '-stone', ['#535e5b', '#6e7970', '#879084', '#a3aa96'], stone_cells, output)
    berry_cells = field(16, 1)
    patch(berry_cells, 1, 2, [(1, 5), (0, 7), (0, 7), (1, 6), (2, 4)], 0)
    patch(berry_cells, 7, 7, [(1, 3), (0, 5), (0, 5), (1, 4)], 2)
    patch(berry_cells, 8, 10, [(0, 2), (0, 3)], 3)
    berry = pixel_material('nature-' + variant + '-berries', ['#5c3243', '#874352', '#ad6467', '#ce8c82'], berry_cells, output)
    return leaves, bark, stone, berry


def mesh_object(name, vertices, faces, material, density=24, smooth=True, texture_size=64):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = smooth
    box_uv(obj, density, texture_size)
    return obj


def tube(name, points, radii, material, sides=9):
    vertices, faces = [], []
    points = [Vector(p) for p in points]
    for i, (point, radius) in enumerate(zip(points, radii)):
        tangent = points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]
        tangent.normalize()
        across = tangent.cross(Vector((0, 1, 0)))
        if across.length < .01:
            across = tangent.cross(Vector((1, 0, 0)))
        across.normalize()
        other = tangent.cross(across).normalized()
        for k in range(sides):
            angle = math.tau * k / sides
            vertices.append(point + radius * (math.cos(angle) * across + math.sin(angle) * other))
        if i:
            for k in range(sides):
                a, b = (i - 1) * sides + k, (i - 1) * sides + (k + 1) % sides
                faces.append((a, b, b + sides, a + sides))
    faces.extend([tuple(reversed(range(sides))), tuple((len(points) - 1) * sides + k for k in range(sides))])
    return mesh_object(name, vertices, faces, material, 32)


def foliage(name, center, scale, material, phase=0, angular=False):
    # A closed scalloped bough with an offset ridge, rather than a sphere/card.
    vertices, faces = [], []
    rings = [(-.48, .35), (-.29, .82), (-.04, 1), (.21, .91), (.43, .57), (.54, .12)]
    count = 8 if material.name.endswith('-berries') else 16 if angular else 20
    for row, (height, width) in enumerate(rings):
        for k in range(count):
            a = math.tau * k / count
            outline = 1 + .11 * math.cos(3 * a + phase) + .075 * math.sin(5 * a - phase)
            scallop = .065 * math.cos(8 * a + .4 * row)
            x = (math.cos(a) * width * (outline + scallop) + .12 * height) * scale[0]
            y = (math.sin(a) * width * outline + .11 * height) * scale[1]
            z = (height + .07 * math.cos(2 * a + phase) * width) * scale[2]
            vertices.append((center[0] + x, center[1] + y, center[2] + z))
            if row:
                previous = (row - 1) * count
                faces.append((previous + k, previous + (k + 1) % count, row * count + (k + 1) % count, row * count + k))
    faces.extend([tuple(reversed(range(count))), tuple((len(rings) - 1) * count + k for k in range(count))])
    return mesh_object(name, vertices, faces, material, 96 if material.name.endswith('-berries') else 28 if angular else 24, texture_size=16 if material.name.endswith('-berries') else 64)


def source_parts(objects, name):
    """Keep components editable; the common exporter joins temporary copies."""
    for obj in objects:
        obj.name = name + ' - ' + obj.name
    return objects


def broadleaf(variant, materials):
    leaves, bark = materials[:2]
    objects = [tube('Rooted bent trunk', [(0, 0, .02), (-.12, .01, .45), (-.08, .02, 1.4), (.07, .07, 2.4), (.12, .08, 3.3)], [.17, .135, .10, .065, .02], bark)]
    for dx, dy in [(-.35, -.16), (.33, -.21), (.04, .31)]:
        objects.append(tube('Flared root', [(0, 0, .25), (dx * .65, dy * .65, .09), (dx, dy, .025)], [.09, .055, .012], bark, 7))
    layouts = {
        'natural': [(-.83, -.1, 2.45, 1.0, .76, .98), (.75, .05, 2.69, .94, .80, .96), (-.16, .55, 3.12, .96, .76, 1.02), (.10, -.29, 3.55, .88, .69, .83), (-.61, -.51, 3.12, .67, .60, .79)],
        'graphic': [(-.96, -.15, 2.52, .90, .66, .81), (.91, .15, 2.63, .83, .70, .84), (-.46, .35, 3.25, .92, .72, .79), (.48, -.2, 3.43, .82, .75, .82), (.10, .1, 3.85, .60, .58, .55)],
        'open': [(-1.02, -.13, 2.66, .78, .60, .76), (.96, .16, 2.90, .75, .56, .80), (-.24, .31, 3.56, .73, .59, .76), (.43, -.3, 3.80, .58, .54, .55)],
    }
    for index, (x, y, z, sx, sy, sz) in enumerate(layouts[variant]):
        objects.append(tube('Visible crown branch', [(0, .04, 1.45 + index * .22), (x * .52, y * .7, z - .35), (x, y, z)], [.075 - index * .009, .04, .014], bark))
        objects.append(foliage('Broad layered leaf bough', (x, y, z), (sx, sy, sz), leaves, index * .7, variant == 'graphic'))
    return source_parts(objects, 'Broadleaf ' + variant)


def conifer(variant, materials):
    leaves, bark = materials[:2]
    objects = [tube('Tapered conifer trunk', [(0, 0, 0), (.04, .01, 1.3), (-.05, .03, 2.7), (.03, .02, 4.0)], [.14, .1, .055, .008], bark)]
    layers = 5 if variant != 'open' else 4
    for level in range(layers):
        z = 1.25 + level * (.54 if variant != 'open' else .69)
        reach = 1.14 - level * .17
        for k in range(3):
            angle = math.tau * k / 3 + level * .71
            x, y = math.cos(angle) * reach * .56, math.sin(angle) * reach * .56
            objects.append(tube('Exposed evergreen branch', [(0, 0, z - .14), (x * .65, y * .65, z - .03), (x * 1.35, y * 1.35, z + .08)], [.044, .024, .006], bark, 7))
            objects.append(foliage('Closed evergreen spray', (x, y, z + .15), (reach * .64, reach * .48, .55 if variant != 'graphic' else .43), leaves, angle, variant == 'graphic'))
    objects.append(foliage('Evergreen leader', (.03, .02, 3.79), (.26, .22, .56), leaves, .7))
    return source_parts(objects, 'Conifer ' + variant)


def rock(variant, materials):
    stone = materials[2]
    pieces = {
        'natural': [((0, 0, .31), (.55, .41, .59), 0)],
        'graphic': [((-.16, .02, .28), (.43, .42, .56), .3), ((.29, -.04, .17), (.29, .30, .32), 1.3)],
        'open': [((-.04, .01, .15), (.63, .42, .28), 1.1), ((.11, .03, .35), (.48, .32, .23), 2.2), ((-.1, .04, .49), (.28, .23, .12), .8)],
    }
    objects = []
    for center, scale, phase in pieces[variant]:
        vertices, faces = [], []
        count = 9
        for row, (height, radius) in enumerate([(-.5, .85), (-.18, 1), (.25, .82), (.5, .43)]):
            for k in range(count):
                a = math.tau * k / count
                r = radius * (1 + .16 * math.cos(3 * a + phase))
                vertices.append((center[0] + math.cos(a) * r * scale[0], center[1] + math.sin(a) * r * scale[1], max(0, center[2] + height * scale[2] + .035 * math.sin(2 * a + phase))))
                if row:
                    faces.append(((row - 1) * count + k, (row - 1) * count + (k + 1) % count, row * count + (k + 1) % count, row * count + k))
        faces.extend([tuple(reversed(range(count))), tuple(3 * count + k for k in range(count))])
        objects.append(mesh_object('Worn stone plane', vertices, faces, stone, 48, False))
    return source_parts(objects, 'Rock ' + variant)


def berry_bush(variant, materials):
    leaves, bark, _, berry = materials
    layouts = {
        'natural': [(-.31, .03, .54, .38, .31, .48), (.26, .10, .65, .40, .31, .47), (.02, -.21, .39, .34, .27, .41), (-.02, .12, .80, .31, .25, .34)],
        'graphic': [(-.36, .01, .47, .38, .29, .39), (.30, .02, .52, .40, .30, .40), (.01, .12, .75, .42, .28, .39)],
        'open': [(-.43, .06, .56, .31, .25, .38), (.34, .12, .75, .29, .24, .40), (.05, -.25, .35, .33, .25, .32)],
    }
    objects = []
    for i, (x, y, z, sx, sy, sz) in enumerate(layouts[variant]):
        objects.append(tube('Berry cane', [(0, 0, .01), (x * .4, y * .4, z * .48), (x, y, z + .08)], [.026, .018, .008], bark, 7))
        objects.append(foliage('Closed berry leaves', (x, y, z), (sx, sy, sz), leaves, i * 1.2, variant == 'graphic'))
        # Three visibly grouped fruits; their form and paint do not depend on view.
        for dx, dz in [(-.045, .035), (.052, .01), (0, -.055)]:
            objects.append(foliage('Clustered berry', (x + dx, y - sy * 1.14, z - .03 + dz), (.052, .052, .10), berry, .2, True))
    return source_parts(objects, 'Berry bush ' + variant)


DESCRIPTIONS = {
    'natural': 'Quiet connected paint, irregular organic masses and sheltered branch gaps.',
    'graphic': 'Broader stepped paint accents and angular interlocking forms; a stronger graphic comparison.',
    'open': 'Fewer separated foliage groups, longer exposed branches and a lighter silhouette.',
}
REASONS = {
    'rock': 'Natural: one readable worn stone with broad material planes and restrained fissures.',
    'broadleaf': 'Natural: asymmetric layered boughs preserve fullness without tiny alpha leaves.',
    'conifer': 'Open: separated evergreen sprays expose branches instead of forming stacked cones.',
    'berry-bush': 'Natural: readable fruit groups and a rooted silhouette with quiet foliage fields.',
}


def render_draft(roots, path):
    original = {root: root.location.copy() for root in roots.values()}
    positions = {'broadleaf-natural': (-1.25, .5, 0), 'berry-bush-natural': (1.2, -.8, 0), 'rock-natural': (1.45, .65, 0)}
    for identity, root in roots.items():
        root.location = positions.get(identity, (30, 30, 0))
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.018))
    plane = bpy.context.object
    plane.name = 'Preview floor only'
    from art_study_common import solid_material
    plane.data.materials.append(solid_material('Preview neutral earth', '#aaa38c'))
    bpy.ops.object.camera_add(location=(6.6, -10.3, 6.2))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, 1.75)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 6.6
    scene = bpy.context.scene
    scene.camera = camera
    scene.world = bpy.data.worlds.new('Soft studio sky')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.45, .52, .63, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .65
    bpy.ops.object.light_add(type='AREA', location=(-3, -4, 8))
    light = bpy.context.object
    light.data.energy = 1100
    light.data.shape = 'DISK'
    light.data.size = 5
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 4
    scene.render.resolution_x, scene.render.resolution_y = 1100, 850
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    for root, location in original.items():
        root.location = location
    for obj in [plane, camera, light]:
        bpy.data.objects.remove(obj, do_unlink=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--draft', action='store_true')
    parser.add_argument('--render', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    output, source = begin('nature')
    bpy.context.preferences.filepaths.save_version = 0
    assets, roots = [], {}
    families = [('rock', rock), ('broadleaf', broadleaf), ('conifer', conifer), ('berry-bush', berry_bush)]
    variants = ['natural'] if args.draft else ['natural', 'graphic', 'open']
    for row, variant in enumerate(variants):
        materials = paints(output, variant)
        for column, (family, factory) in enumerate(families):
            if args.draft and family == 'conifer':
                continue
            recommended = variant == ('open' if family == 'conifer' else 'natural')
            identity = family + '-' + variant
            objects = factory(variant, materials)
            floor = min((obj.matrix_world @ vertex.co).z for obj in objects for vertex in obj.data.vertices)
            for obj in objects:
                obj.location.z -= floor
            entry, root = export_asset(objects, output, identity, family,
                family.replace('-', ' ').title() + ' — ' + variant, variant,
                DESCRIPTIONS[variant] + (' ' + REASONS[family] if recommended else ''), recommended)
            entry['recommendationReason'] = REASONS[family] if recommended else None
            entry['paintPixelsPerMetre'] = {'stone': 48} if family == 'rock' else {'foliage': 28 if variant == 'graphic' else 24, 'bark': 32, **({'berries': 96} if family == 'berry-bush' else {})}
            assets.append(entry)
            roots[identity] = root
            root.location = (column * 5.8, row * 6, 0)
    if args.render:
        render_draft(roots, args.render)
    finish('nature', assets, output, source,
        'Original first-party geometry and explicit opaque pixel paint; AGPL-3.0-only. '
        'Closed foliage masses, actual branch gaps and grouped fruits. No imported CC0 geometry, '
        'micro-alpha leaves, random paint, runtime pixelation or native-world changes. '
        'Natural recommended for rock/broadleaf/bush; open recommended for conifer. '
        'Fixed planar UV seams and silhouette sampling still require moving inspection.')


if __name__ == '__main__':
    main()
