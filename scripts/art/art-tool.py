"""Inspect and compare candidate models for the art workflow (AF05).

Run from Blender --background --factory-startup --disable-autoexec:

  Blender ... --python scripts/art/art-tool.py -- report --out DIR [--profile P] MODEL...
  Blender ... --python scripts/art/art-tool.py -- sheet models --out PNG --reference-height M MODEL...
  Blender ... --python scripts/art/art-tool.py -- normalize --in MODEL --out GLB --height M [--rotate-deg N]
  Blender ... --python scripts/art/art-tool.py -- clips --model RIGGED --clip Idle=FILE --clip Run=FILE --out GLB

Reads models and writes reports or sheets outside Git. It never calls a provider,
opens a world or publishes anything. Design:
docs/projects/art-workflow-tech-design.md#4-helper-scripts
"""
import argparse
import json
import math
import os
import sys
import tempfile
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

# No bytecode cache in the checkout: the asset check refuses stray files there.
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from asset_workspace import external_output  # noqa: E402

# The first proposed profile in docs/limits/3d-pixel-art.md (A3D02, A3D04-A3D06).
# This is the only copy in code; change it when the inventory changes.
BUDGETS = {
    'triangles': {'prop': 20000, 'character': 40000, 'creature': 40000},  # A3D04
    'texture_edge': 2048,  # A3D05
    'texture_area': 8388608,  # A3D05, all maps of one model
    'materials': 8,  # A3D05
    'joints': 64,  # A3D06, exported deform bones
    'influences': 4,  # A3D06
    'clips': 32,  # A3D06
    'bytes': 16 * 1024 * 1024,  # A3D02, runtime payload
}
# apps/client/src/model-animation.ts refuses an animated character without these.
REQUIRED_CLIPS = {'character': ['Idle', 'Run']}
# The glTF importer parks bone-display meshes here; they are not part of the model.
IMPORTER_HELPERS = 'glTF_not_exported'
VIEWS = {  # direction from the model to the camera; models face -Y in Blender (glTF +Z)
    'front': (0.0, -1.0, 0.0),
    'right': (-1.0, 0.0, 0.0),
    'back': (0.0, 1.0, 0.0),
    'left': (1.0, 0.0, 0.0),
    'three-quarter': (-0.7071, -0.7071, 0.0),
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def model_format(path):
    """Trust the bytes, not the name: providers have delivered FBX files named .glb."""
    head = path.open('rb').read(32)
    if head.startswith(b'glTF'):
        return '.glb'
    if head.startswith(b'Kaydara FBX Binary'):
        return '.fbx'
    return path.suffix.lower()


def import_model(path):
    suffix = model_format(path)
    if suffix in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix == '.fbx':
        bpy.ops.import_scene.fbx(filepath=str(path))
    elif suffix == '.obj':
        bpy.ops.wm.obj_import(filepath=str(path))
    else:
        raise ValueError(f'Unsupported model format: {path.name}')
    for obj in bpy.context.scene.objects:
        if any(c.name == IMPORTER_HELPERS for c in obj.users_collection):
            obj.hide_render = True
    # Measure and draw the bind pose; an imported clip may otherwise pose the body.
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            obj.data.pose_position = 'REST'
    bpy.context.view_layer.update()


def content(kind=None):
    return [o for o in bpy.context.scene.objects
            if not any(c.name == IMPORTER_HELPERS for c in o.users_collection)
            and (kind is None or o.type == kind)]


def world_bounds(meshes):
    deps = bpy.context.evaluated_depsgraph_get()
    corners = [o.evaluated_get(deps).matrix_world @ Vector(c)
               for o in meshes for c in o.evaluated_get(deps).bound_box]
    if not corners:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    low = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    high = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return low, high


def gltf_bounds(low, high):
    """Blender's -Y is glTF's +Z, so the depth bounds swap ends."""
    return {'min': [round(low.x, 4), round(low.z, 4), round(-high.y, 4)],
            'max': [round(high.x, 4), round(high.z, 4), round(-low.y, 4)]}


def measure(path, profile, expect_height):
    clear_scene()
    import_model(path)
    meshes = content('MESH')
    armatures = content('ARMATURE')
    deps = bpy.context.evaluated_depsgraph_get()
    low, high = world_bounds(meshes)
    size = high - low

    triangles = vertices = loose_vertices = loose_edges = non_manifold = zero_area = 0
    uv_layers = 0
    for obj in meshes:
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        vertices += len(mesh.vertices)
        evaluated.to_mesh_clear()
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        loose_vertices += sum(1 for v in bm.verts if not v.link_edges)
        loose_edges += sum(1 for e in bm.edges if not e.link_faces)
        non_manifold += sum(1 for e in bm.edges if e.link_faces and not e.is_manifold)
        zero_area += sum(1 for f in bm.faces if f.calc_area() < 1e-10)
        bm.free()
        uv_layers = max(uv_layers, len(obj.data.uv_layers))

    materials = {m for o in meshes for m in o.data.materials if m}
    images = {}
    for material in materials:
        if material.use_nodes:
            for node in material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image and node.image.size[0]:
                    image = node.image
                    images[image.name] = {
                        'size': list(image.size),
                        'colorSpace': image.colorspace_settings.name,
                        'alpha': image.channels == 4 and image.alpha_mode != 'NONE',
                    }

    bones = [b for a in armatures for b in a.data.bones]
    deform = [b for b in bones if b.use_deform]
    bone_names = {b.name for b in bones}
    influences = max((sum(1 for g in v.groups if g.weight > 0)
                      for o in meshes for v in o.data.vertices), default=0)
    fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
    clips = [{'name': a.name, 'frames': [round(a.frame_range[0], 2), round(a.frame_range[1], 2)],
              'seconds': round((a.frame_range[1] - a.frame_range[0]) / fps, 3)}
             for a in bpy.data.actions]
    unapplied = [o.name for o in meshes
                 if any(abs(s - 1) > 1e-4 for s in o.scale)
                 or any(abs(r) > 1e-4 for r in o.rotation_euler)]

    tri_limit = BUDGETS['triangles'][profile]
    edge = max((max(i['size']) for i in images.values()), default=0)
    area = sum(i['size'][0] * i['size'][1] for i in images.values())
    joint_count = len(deform) if deform else len(bones)
    checks = [
        ('triangles', triangles, tri_limit, 'A3D04'),
        ('textureEdge', edge, BUDGETS['texture_edge'], 'A3D05'),
        ('textureArea', area, BUDGETS['texture_area'], 'A3D05'),
        ('materials', len(materials), BUDGETS['materials'], 'A3D05'),
        ('joints', joint_count, BUDGETS['joints'], 'A3D06'),
        ('influences', influences, BUDGETS['influences'], 'A3D06'),
        ('clips', len(clips), BUDGETS['clips'], 'A3D06'),
        ('bytes', path.stat().st_size, BUDGETS['bytes'], 'A3D02'),
    ]
    missing = [c for c in REQUIRED_CLIPS.get(profile, []) if c not in {x['name'] for x in clips}]
    return {
        'file': path.name,
        'format': model_format(path).lstrip('.'),
        'bytes': path.stat().st_size,
        'profile': profile,
        'size': {
            'boundsGltf': gltf_bounds(low, high),
            'height': round(size.z, 4), 'width': round(size.x, 4), 'depth': round(size.y, 4),
            'lowestPoint': round(low.z, 4),
            'centreOffset': [round((low.x + high.x) / 2, 4), round((low.y + high.y) / 2, 4)],
            'expectedHeight': expect_height,
            'unappliedTransforms': unapplied,
        },
        'geometry': {
            'triangles': triangles, 'vertices': vertices, 'meshObjects': len(meshes),
            'looseVertices': loose_vertices, 'looseEdges': loose_edges,
            'nonManifoldEdges': non_manifold, 'zeroAreaFaces': zero_area, 'uvLayers': uv_layers,
        },
        'materials': {'count': len(materials), 'textures': images},
        'rig': {
            'bones': len(bones), 'deformBones': len(deform),
            'roots': [b.name for b in bones if b.parent is None],
            'maxInfluences': influences,
            'meshNamedLikeBone': sorted(o.name for o in meshes if o.name in bone_names),
        },
        'motion': {'fps': fps, 'clips': clips, 'missingRequired': missing},
        'budgets': [{'check': name, 'value': value, 'limit': limit, 'id': owner,
                     'status': 'over' if value > limit else 'pass'}
                    for name, value, limit, owner in checks],
    }


def report(args):
    out = external_output(args.out)
    out.mkdir(parents=True, exist_ok=True)
    failed = False
    for model in args.models:
        path = Path(model).expanduser().resolve()
        result = measure(path, args.profile, args.expect_height)
        (out / (path.stem + '.report.json')).write_text(json.dumps(result, indent=2) + '\n')
        over = [b['check'] for b in result['budgets'] if b['status'] == 'over']
        problems = over + [f"missing clip {c}" for c in result['motion']['missingRequired']]
        problems += [f"mesh named like bone {n}" for n in result['rig']['meshNamedLikeBone']]
        size, geo = result['size'], result['geometry']
        print(f"{path.name}: height {size['height']} m, lowest {size['lowestPoint']}, "
              f"{geo['triangles']} triangles, {result['materials']['count']} materials, "
              f"{len(result['materials']['textures'])} textures, {result['rig']['deformBones']} deform bones, "
              f"clips {[c['name'] for c in result['motion']['clips']]}"
              + (f" | over or missing: {', '.join(problems)}" if problems else ' | within budgets'))
        failed = failed or bool(problems)
    return 2 if (args.strict and failed) else 0


def set_render(scene, width, height, textured):
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    shading = scene.display.shading
    shading.light = 'STUDIO'
    shading.color_type = 'TEXTURE' if textured else 'SINGLE'
    shading.single_color = (0.72, 0.72, 0.72)
    shading.show_cavity = not textured
    if scene.world is None:
        scene.world = bpy.data.worlds.new('Sheet')
    scene.world.color = (0.32, 0.32, 0.32)


def reference_figure(height):
    """A plain mannequin of the look's reference height, for scale only."""
    body = bpy.data.meshes.new('Reference figure')
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.17, radius2=0.17,
                          depth=height * 0.86, matrix=Matrix.Translation((0, 0, height * 0.43)))
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=height * 0.07,
                              matrix=Matrix.Translation((0, 0, height * 0.93)))
    bm.to_mesh(body)
    bm.free()
    obj = bpy.data.objects.new('Reference figure', body)
    bpy.context.collection.objects.link(obj)
    return obj


def render_tile(scene, camera, path):
    scene.camera = camera
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(str(path))
    pixels = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    array = np.flipud(pixels.reshape(image.size[1], image.size[0], 4)).copy()
    bpy.data.images.remove(image)
    return array


def label_tile(scene, lines, width, height, tmp):
    for obj in list(scene.objects):
        obj.hide_render = True
    curve = bpy.data.curves.new('Label', 'FONT')
    curve.body = '\n'.join(lines)
    curve.size = 0.1
    text = bpy.data.objects.new('Label', curve)
    scene.collection.objects.link(text)
    text.rotation_euler = (math.radians(90), 0, 0)
    text.color = (0.95, 0.95, 0.95, 1)
    bpy.context.view_layer.update()
    corners = [text.matrix_world @ Vector(c) for c in text.bound_box]
    low = Vector((min(c.x for c in corners), 0, min(c.z for c in corners)))
    high = Vector((max(c.x for c in corners), 0, max(c.z for c in corners)))
    camera = bpy.data.objects.new('Label camera', bpy.data.cameras.new('Label camera'))
    scene.collection.objects.link(camera)
    camera.data.type = 'ORTHO'
    # Fit the text block: ortho scale spans the tile's longer side.
    span_w, span_h = high.x - low.x, high.z - low.z
    camera.data.ortho_scale = 1.15 * (max(span_h, span_w * height / width) if height >= width
                                       else max(span_w, span_h * width / height))
    camera.location = ((low.x + high.x) / 2, -5, (low.z + high.z) / 2)
    camera.rotation_euler = (math.radians(90), 0, 0)
    set_render(scene, width, height, textured=False)
    scene.display.shading.color_type = 'OBJECT'
    scene.world.color = (0.18, 0.18, 0.18)
    return render_tile(scene, camera, Path(tmp) / 'label.png')


def prepared(path, fit_height):
    """Import one model into a clean scene, standing on z = 0 and centred."""
    clear_scene()
    import_model(path)
    scene = bpy.context.scene
    meshes = content('MESH')
    low, high = world_bounds(meshes)
    root = bpy.data.objects.new('Sheet root', None)
    scene.collection.objects.link(root)
    for obj in content():
        if obj.parent is None and obj is not root:
            obj.parent = root
    scale = fit_height / (high.z - low.z) if fit_height and high.z > low.z else 1.0
    root.scale = (scale, scale, scale)
    centre = (low + high) / 2
    root.location = (-centre.x * scale, -centre.y * scale, -low.z * scale)
    bpy.context.view_layer.update()
    return meshes, world_bounds(meshes)


def view_frame(low, high, to_camera, reference_gap):
    """Camera right axis, the model's half-width along it, and the figure offset."""
    right = (-to_camera).cross(Vector((0, 0, 1))).normalized()
    corners = [Vector((x, y, z)) for x in (low.x, high.x) for y in (low.y, high.y) for z in (low.z, high.z)]
    half = max(abs(c.dot(right)) for c in corners)
    return right, half, half + reference_gap


def sheet_models(args):
    out = external_output(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tile = args.tile
    models = [Path(m).expanduser().resolve() for m in args.models]
    gap, figure_radius = 0.25, 0.2
    # One scale for every tile, so relative sizes are honest across candidates.
    extents = [args.reference_height]
    for path in models:
        _, (low, high) = prepared(path, args.fit_height)
        extents.append(high.z - low.z)
        for direction in VIEWS.values():
            _, half, offset = view_frame(low, high, Vector(direction).normalized(), gap)
            extents.append(half + offset + figure_radius)
    frame = max(extents) * 1.08
    blocks = []
    with tempfile.TemporaryDirectory() as tmp:
        for index, path in enumerate(models):
            meshes, (low, high) = prepared(path, args.fit_height)
            scene = bpy.context.scene
            figure = reference_figure(args.reference_height)
            camera = bpy.data.objects.new('Sheet camera', bpy.data.cameras.new('Sheet camera'))
            scene.collection.objects.link(camera)
            camera.data.type = 'ORTHO'
            camera.data.ortho_scale = frame
            rows = []
            for textured in (False, True):
                set_render(scene, tile, tile, textured)
                row = []
                for view, direction in VIEWS.items():
                    to_camera = Vector(direction).normalized()
                    right, half, offset = view_frame(low, high, to_camera, gap)
                    figure.location = -right * offset
                    # Centre the model and the figure together in the square tile.
                    middle = right * ((half - offset - figure_radius) / 2)
                    target = middle + Vector((0, 0, frame * 0.46))
                    camera.location = target + to_camera * 20
                    camera.rotation_euler = (-to_camera).to_track_quat('-Z', 'Y').to_euler()
                    row.append(render_tile(scene, camera, Path(tmp) / f'{index}-{view}-{int(textured)}.png'))
                rows.append(np.concatenate(row, axis=1))
            report_data = measure(path, args.profile, None)
            lines = [args.labels[index] if args.labels and index < len(args.labels) else path.stem,
                     f"{report_data['size']['height']} m tall",
                     f"{report_data['geometry']['triangles']} triangles",
                     f"{len(report_data['materials']['textures'])} textures",
                     f"{report_data['rig']['deformBones']} bones"]
            label = label_tile(bpy.context.scene, lines, tile, tile * 2, tmp)
            blocks.append(np.concatenate([label, np.concatenate(rows, axis=0)], axis=1))
        # Name the columns, so a model facing the wrong way is caught on sight.
        header_height = max(24, tile // 6)
        names = [label_tile(bpy.context.scene, [view], tile, header_height, tmp) for view in VIEWS]
        blank = np.empty_like(names[0])
        blank[:] = names[0][0, 0]
        blocks.insert(0, np.concatenate([blank] + names, axis=1))
    canvas = np.concatenate(blocks, axis=0)
    height, width = canvas.shape[:2]
    image = bpy.data.images.new('Sheet', width=width, height=height, alpha=True)
    image.pixels.foreach_set(np.flipud(canvas).reshape(-1))
    image.filepath_raw = str(out)
    image.file_format = 'PNG'
    image.save()
    print(f'Sheet: {out} ({width} x {height}); columns: label, {", ".join(VIEWS)}; rows: clay, textured')
    return 0


def continuous_rotations(path):
    """Keep each exported rotation track in one hemisphere. The exporter picks each key's
    quaternion sign alone, and PlayCanvas blends keys component by component, so a sign
    change between keys plays as a one-frame twist (seen near 180-degree leg joints)."""
    data = bytearray(path.read_bytes())
    length = int.from_bytes(data[12:16], 'little')
    gltf = json.loads(data[20:20 + length])
    binary = 20 + length + 8  # the binary chunk follows the JSON chunk and its own header
    for animation in gltf.get('animations', []):
        for channel in animation['channels']:
            accessor = gltf['accessors'][animation['samplers'][channel['sampler']]['output']]
            view = gltf['bufferViews'][accessor['bufferView']]
            if channel['target']['path'] != 'rotation' or accessor['componentType'] != 5126 \
                    or view.get('byteStride', 16) != 16:
                continue
            start = binary + view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
            keys = np.frombuffer(data, np.float32, accessor['count'] * 4, start).reshape(-1, 4).copy()
            for i in range(1, len(keys)):
                if np.dot(keys[i], keys[i - 1]) < 0:
                    keys[i] = -keys[i]
            data[start:start + keys.nbytes] = keys.tobytes()
    path.write_bytes(bytes(data))


def export_glb(out):
    """Export the selection with the working human recipe's settings (scripts/study_human_motion.py)."""
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
                              export_apply=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_yup=True,
                              export_skins=True, export_def_bones=True, export_force_sampling=True)
    continuous_rotations(out)


def normalize(args):
    """Bring one candidate to the consumer contract: size, facing, feet at 0, clean, GLB."""
    source = Path(args.input).expanduser().resolve()
    out = external_output(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()
    import_model(source)
    scene = bpy.context.scene
    meshes = content('MESH')
    low, high = world_bounds(meshes)
    root = bpy.data.objects.new('Normalize root', None)
    scene.collection.objects.link(root)
    for obj in content():
        if obj.parent is None and obj is not root:
            obj.parent = root
    # Facing is judged by eye on the sheet; automatic detection is unreliable.
    root.rotation_euler = (0, 0, math.radians(args.rotate_deg))
    bpy.context.view_layer.update()
    low, high = world_bounds(meshes)
    scale = args.height / (high.z - low.z)
    root.scale = (scale, scale, scale)
    bpy.context.view_layer.update()
    low, high = world_bounds(meshes)
    root.location = (-(low.x + high.x) / 2, -(low.y + high.y) / 2, -low.z)
    bpy.context.view_layer.update()
    for obj in content():
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    for obj in content():
        if obj is not root:
            world = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = world
    bpy.data.objects.remove(root, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bone_names = {b.name for a in content('ARMATURE') for b in a.data.bones}
    for obj in meshes:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_edges], context='VERTS')
        bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context='EDGES')
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(obj.data)
        bm.free()
        if obj.name in bone_names:  # PlayCanvas would resolve the mesh as the joint
            obj.name = 'Mesh ' + obj.name
    if args.max_texture:
        for image in bpy.data.images:
            w, h = image.size
            if max(w, h) > args.max_texture:
                factor = args.max_texture / max(w, h)
                image.scale(max(1, round(w * factor)), max(1, round(h * factor)))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in content():
        obj.select_set(True)
    export_glb(out)
    if args.blend:
        bpy.ops.wm.save_as_mainfile(filepath=str(external_output(args.blend)))
    result = measure(out, args.profile, args.height)
    size, geo = result['size'], result['geometry']
    print(f"Normalized {source.name} -> {out.name}: height {size['height']} m, lowest {size['lowestPoint']}, "
          f"{geo['triangles']} triangles, textures {[t['size'] for t in result['materials']['textures'].values()]}, "
          f"{out.stat().st_size} bytes")
    return 0



def action_curves(action):
    """Every F-curve of an action; Blender 5 keeps them in per-slot channel bags."""
    from bpy_extras import anim_utils
    bags = [anim_utils.action_get_channelbag_for_slot(action, slot) for slot in action.slots]
    return [curve for bag in bags if bag for curve in bag.fcurves]


def native_fps(path):
    """A clip file's own key rate, read from its key spacing at Blender's default rate."""
    clear_scene()
    import_model(path)
    rate = bpy.context.scene.render.fps
    times = sorted({point.co.x for action in bpy.data.actions
                    for curve in action_curves(action) for point in curve.keyframe_points})
    steps = [b - a for a, b in zip(times, times[1:]) if b - a > 1e-4]
    return round(rate / min(steps)) if steps else rate


def without_drift(action, bone):
    """Remove one loop's net travel from the root bone, so the clip plays on the spot."""
    for curve in action_curves(action):
        points = curve.keyframe_points
        if curve.data_path != f'pose.bones["{bone}"].location' or len(points) < 2:
            continue
        x0, y0 = points[0].co.x, points[0].co.y
        span, drift = points[-1].co.x - x0, points[-1].co.y - y0
        for point in points:
            offset = drift * (point.co.x - x0) / span
            point.co.y -= offset
            point.handle_left.y -= offset
            point.handle_right.y -= offset
        curve.update()


def clips(args):
    """Give one rigged model the clips the game plays, each taken from a rigging output."""
    out = external_output(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # Import at the clips' own rate (providers use 30 fps), so every key lands on a whole
    # frame and exports unchanged: resampling shortens loops and flips quaternion signs,
    # which PlayCanvas blends component by component into one-frame twists.
    fps = native_fps(Path(args.clip[0].partition('=')[2]).expanduser().resolve())
    clear_scene()
    bpy.context.scene.render.fps = fps
    import_model(Path(args.model).expanduser().resolve())
    rigs = content('ARMATURE')
    if len(rigs) != 1:
        raise ValueError(f'Expected one armature in {args.model}, found {len(rigs)}.')
    rig = rigs[0]
    own_actions = set(bpy.data.actions)
    named = {}
    for spec in args.clip:
        name, _, source = spec.partition('=')
        objects, actions = set(bpy.data.objects), set(bpy.data.actions)
        import_model(Path(source).expanduser().resolve())
        found = [a for a in bpy.data.actions if a not in actions]
        if len(found) != 1:
            raise ValueError(f'{source} holds {len(found)} clips {[a.name for a in found]}; expected one.')
        for obj in set(bpy.data.objects) - objects:
            bpy.data.objects.remove(obj, do_unlink=True)
        found[0].name = name
        found[0].use_fake_user = True
        named[name] = found[0]
    root = next(bone.name for bone in rig.data.bones if bone.parent is None)
    for name in args.in_place or []:
        without_drift(named[name], root)
    rig.animation_data_create()
    rig.animation_data.action = None
    for track in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(track)
    for action in own_actions:
        bpy.data.actions.remove(action)
    # Tracks export by name, as in the working human recipe (scripts/study_human_motion.py).
    for name, action in named.items():
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, int(action.frame_range[0]), action)
        if strip.action_slot is None:  # keyed for the clip file's armature; the bone names match
            strip.action_slot = action.slots[0]
        track.mute = True
    rig.data.pose_position = 'POSE'  # import_model shows the rest pose; the export samples poses
    bpy.ops.object.select_all(action='DESELECT')
    for obj in content():
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    export_glb(out)
    result = measure(out, args.profile, None)
    over = [b['check'] for b in result['budgets'] if b['status'] == 'over'] + \
        [f'missing clip {c}' for c in result['motion']['missingRequired']]
    print(f"Clips {out.name}: {[c['name'] for c in result['motion']['clips']]}, "
          f"{result['rig']['deformBones']} deform bones, height {result['size']['height']} m"
          + (f" | over or missing: {', '.join(over)}" if over else ''))
    return 0

def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(prog='art-tool.py')
    commands = parser.add_subparsers(dest='command', required=True)
    rep = commands.add_parser('report', help='Measure models against the consumer contract and budgets.')
    rep.add_argument('--out', required=True)
    rep.add_argument('--profile', choices=['character', 'creature', 'prop'], default='character')
    rep.add_argument('--expect-height', type=float)
    rep.add_argument('--strict', action='store_true', help='Exit 2 when a budget is over or a required clip is missing.')
    rep.add_argument('models', nargs='+')
    sheet = commands.add_parser('sheet', help='Render comparison sheets.')
    kinds = sheet.add_subparsers(dest='kind', required=True)
    models = kinds.add_parser('models', help='Clay and textured turntables at one shared scale.')
    models.add_argument('--out', required=True)
    models.add_argument('--reference-height', type=float, required=True,
                        help="The look's reference figure height, from the art direction's production notes.")
    models.add_argument('--fit-height', type=float,
                        help='Scale every model to this height first, to compare raw candidates of unknown units.')
    models.add_argument('--profile', choices=['character', 'creature', 'prop'], default='character')
    models.add_argument('--label', dest='labels', action='append')
    models.add_argument('--tile', type=int, default=300, help='Square tile size in pixels.')
    models.add_argument('models', nargs='+')
    norm = commands.add_parser('normalize', help='Scale, face, ground, clean and export one model as GLB.')
    norm.add_argument('--in', dest='input', required=True)
    norm.add_argument('--out', required=True)
    norm.add_argument('--height', type=float, required=True, help='Height in metres from the brief.')
    norm.add_argument('--rotate-deg', type=float, default=0.0,
                      help='Turn about the vertical axis so the model faces -Y in Blender (glTF +Z).')
    norm.add_argument('--max-texture', type=int, help='Downscale textures whose longest edge exceeds this.')
    norm.add_argument('--blend', help='Also save the normalized scene as an editable .blend file.')
    norm.add_argument('--profile', choices=['character', 'creature', 'prop'], default='character')
    clip = commands.add_parser('clips', help='Give a rigged model the named clips the game plays.')
    clip.add_argument('--model', required=True, help='The rigged model whose skeleton and mesh are kept.')
    clip.add_argument('--clip', action='append', required=True, metavar='NAME=FILE',
                      help='A clip name the game plays and a rigging output that holds that one clip.')
    clip.add_argument('--in-place', action='append', metavar='NAME',
                      help="Remove that clip's net travel, so it loops on the spot.")
    clip.add_argument('--out', required=True)
    clip.add_argument('--profile', choices=['character', 'creature', 'prop'], default='character')
    args = parser.parse_args(argv)
    code = {'report': report, 'sheet': sheet_models, 'normalize': normalize, 'clips': clips}[args.command](args)
    sys.exit(code)


if __name__ == '__main__':
    main()
