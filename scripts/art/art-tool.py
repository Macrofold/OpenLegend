"""Inspect and compare candidate models for the art workflow (AF05).

Run from Blender --background --factory-startup --disable-autoexec:

  Blender ... --python scripts/art/art-tool.py -- report --out DIR [--profile P] MODEL...
  Blender ... --python scripts/art/art-tool.py -- sheet models --out PNG --reference-height M MODEL...
  Blender ... --python scripts/art/art-tool.py -- normalize --in MODEL --out GLB --height M [--rotate-deg N]
  Blender ... --python scripts/art/art-tool.py -- clips --model RIGGED --clip Idle=FILE --clip Run=FILE [--bones MAP] --out GLB
  Blender ... --python scripts/art/art-tool.py -- head --model RIGGED --head HEAD --head-eyes X,Y,Z --neck-cut M --out GLB

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
from mathutils import Euler, Matrix, Quaternion, Vector, interpolate, kdtree
from mathutils.bvhtree import BVHTree

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
        bpy.ops.import_scene.fbx(filepath=str(path), anim_offset=0)
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
    # Read the final world transform: glTF stores rotation as a quaternion, and a parent can
    # carry the scale. Skinned meshes are placed by their joints instead.
    unapplied = []
    for o in content():
        if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers):
            continue
        _, rotation, scale = o.matrix_world.decompose()
        if rotation.angle > 1e-3 or any(abs(v - 1) > 1e-4 for v in scale):
            unapplied.append(o.name)

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
    used = set()
    for model in args.models:
        path = Path(model).expanduser().resolve()
        result = measure(path, args.profile, args.expect_height)
        name, n = path.stem, 2
        while name in used:  # a.glb and b/a.glb, or m01.glb and m01.fbx, keep both reports
            name, n = f'{path.stem}-{n}', n + 1
        used.add(name)
        (out / (name + '.report.json')).write_text(json.dumps(result, indent=2) + '\n')
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


def export_glb(out):
    """Export the selection with the working human recipe's settings (scripts/study_human_motion.py)."""
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
                              export_apply=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_yup=True,
                              export_skins=True, export_def_bones=True, export_force_sampling=True)


def normalize(args):
    """Bring one candidate to the consumer contract: size, facing, feet at 0, clean, GLB."""
    source = Path(args.input).expanduser().resolve()
    out = external_output(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()
    import_model(source)
    if content('ARMATURE') or bpy.data.actions:
        # Rescaling a rig would leave its bone keys at the old scale, and the import shows
        # the rest pose, so its clips would export frozen.
        raise ValueError(f'{source.name} is rigged or animated; normalize takes unrigged models. '
                         'Give a rigged model its clips with the clips command instead.')
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
    for obj in meshes:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_edges], context='VERTS')
        bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context='EDGES')
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(obj.data)
        bm.free()
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


def grounded(rig, action, frames, root, follows):
    """Lower a clip's root so its lowest foot point over the clip stands where it rests. The
    library's walk, run and sprint float the clip rig 2-7 cm, and in Wave its hips rise as its
    falsely bent knees straighten while the placed legs keep their standing length; one
    constant offset per clip keeps the motion's shape. Returns the drop in metres."""
    feet = [follows[n] for n in ('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase') if n in follows]
    if not feet:
        return 0.0
    mw = rig.matrix_world
    rig.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    standing = {n: (mw @ rig.data.bones[n].head_local).z for n in feet}
    rig.data.pose_position = 'POSE'
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    excess = math.inf
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        excess = min(excess, min((mw @ rig.pose.bones[n].head).z - standing[n] for n in feet))
    rig.animation_data.action = None
    if excess <= 0.002:
        return 0.0
    bone = rig.data.bones[root]
    drop = bone.matrix_local.to_3x3().inverted() @ mw.to_3x3().inverted() @ Vector((0.0, 0.0, -excess))
    for curve in action_curves(action):
        if curve.data_path == f'pose.bones["{root}"].location':
            for point in curve.keyframe_points:
                point.co.y += drop[curve.array_index]
                point.handle_left.y += drop[curve.array_index]
                point.handle_right.y += drop[curve.array_index]
            curve.update()
    return excess


def without_drift(action, bone):
    """Remove one loop's net travel from the root bone, so the clip plays on the spot.
    Returns the travel removed, in the bone's local units."""
    removed = 0.0
    for curve in action_curves(action):
        points = curve.keyframe_points
        if curve.data_path != f'pose.bones["{bone}"].location' or len(points) < 2:
            continue
        x0, y0 = points[0].co.x, points[0].co.y
        span, drift = points[-1].co.x - x0, points[-1].co.y - y0
        removed = math.hypot(removed, drift)
        for point in points:
            offset = drift * (point.co.x - x0) / span
            point.co.y -= offset
            point.handle_left.y -= offset
            point.handle_right.y -= offset
        curve.update()
    return removed


def bone_order(rig):
    """Every bone of a rig, parents before children."""
    order, pending = [], [bone for bone in rig.data.bones if bone.parent is None]
    while pending:
        bone = pending.pop(0)
        order.append(bone)
        pending.extend(bone.children)
    return order


def world_rotation(matrix):
    return matrix.decompose()[1]


def bone_map(path):
    """Read `--bones FILE`, for a model rig of another family than the clips' (MPFB's against
    Meshy's): `bones` maps model bone names to the clip bones they follow, several to one if
    needed (MPFB's five toes follow Meshy's one); unlisted bones follow their parents. `alignRest`
    lists model limbs that rest in a different pose (MPFB's arms hang 47° below horizontal,
    Meshy's 67°), with the hands they carry. Spine, neck, head, legs and feet are left out:
    their rest differences are anatomy or joint placement, which turning them would copy. Meshy's
    automatic rig puts the knee joint in front of a straight leg (10 cm on the clip rig), so its
    leg joints read 28° bent at rest; aligned MPFB legs copied that bend and crouched in every
    clip. Meshy's foot points 51° down to its toes, MPFB's 20°. `relax` gives bones no clip moves
    a fixed turn from rest in degrees (local X, Y, Z): MPFB's fingers rest spread flat."""
    if not path:
        return {}, [], {}
    spec = json.loads(Path(path).expanduser().read_text())
    return spec['bones'], spec.get('alignRest', []), spec.get('relax', {})


def followers(rig, names):
    """Each clip bone name and the first model bone, parents first, that follows it."""
    found = {}
    for bone in bone_order(rig):
        found.setdefault(names.get(bone.name, bone.name), bone.name)
    return found


def joint_heads(order, posed, held, root, root_head):
    """Each bone's head in armature space for one frame, from the shared bones' rotations;
    other bones follow their parents (with any relax hold), as the keys will make them."""
    rotation, heads = {}, {}
    for bone in order:
        local = bone.matrix_local.to_quaternion()
        if bone.parent:
            parent = bone.parent
            inherited = rotation[parent.name] @ (parent.matrix_local.inverted() @ bone.matrix_local).to_quaternion()
            offset = parent.matrix_local.to_quaternion().inverted() @ (bone.head_local - parent.head_local)
            heads[bone.name] = heads[parent.name] + rotation[parent.name] @ offset
        else:
            inherited = local
            heads[bone.name] = root_head if bone.name == root else bone.head_local.copy()
        hold = held.get(bone.name)
        if bone.name in posed:
            rotation[bone.name] = posed[bone.name]
        else:
            rotation[bone.name] = inherited @ hold if hold else inherited
    return heads


def bend_leg(posed, thigh, shin, hip, knee, ankle, target, limit):
    """Two-bone IK in armature space: turn the thigh and shin so the ankle reaches `target`,
    keeping the knee in its current bend plane. The leg reaches at most `limit`, its standing
    reach, so it never straightens past how it stands; a farther target is pointed at."""
    upper, lower = (knee - hip).length, (ankle - knee).length
    to_target = target - hip
    if to_target.length < 1e-9:
        return
    along = to_target.normalized()
    reach = min(to_target.length, limit, upper + lower - 1e-6)
    side = (knee - hip) - along * (knee - hip).dot(along)
    if side.length < 1e-9:  # a straight leg gives no plane; keep it straight
        side = Vector((0.0, 0.0, 0.0))
    else:
        side.normalize()
    out = (upper * upper - lower * lower + reach * reach) / (2 * reach)
    new_knee = hip + along * out + side * math.sqrt(max(upper * upper - out * out, 0.0))
    posed[thigh] = (knee - hip).rotation_difference(new_knee - hip) @ posed[thigh]
    posed[shin] = (ankle - knee).rotation_difference(hip + along * reach - new_knee) @ posed[shin]


def lift_toes(posed, foot, ankle, toes, to_armature):
    """Pitch a foot up about its ankle until no toe joint is lower than where it stands (world
    heights; `toes` pairs each toe head with its standing height), as a foot rolls onto its
    toes. One pitch, the largest any toe needs, turns them all."""
    pitch, axis = 0.0, None
    for toe, floor in toes:
        along = toe - ankle
        flat = Vector((along.x, along.y, 0.0))
        if toe.z >= floor or flat.length < 1e-9:
            continue
        length = along.length
        need = math.asin(max(-1.0, min(1.0, (floor - ankle.z) / length))) - \
            math.asin(max(-1.0, min(1.0, along.z / length)))
        if need > pitch:
            pitch, axis = need, flat.normalized().cross(Vector((0.0, 0.0, 1.0)))  # + raises toes
    if axis:
        posed[foot] = to_armature @ Quaternion(axis, pitch) @ to_armature.inverted() @ posed[foot]


# Metres above a foot's lowest toes in a stride clip within which a foot moving back under the
# hips is down. The library walk never sets its feet flat: through each stance the toes hover
# 1-3 cm up and reach the floor only as the foot rolls off them, so a 1.5 cm band found only
# that roll; moving back marks the stance, and the swing passes forward.
PLANT_BAND = 0.04
# The most a stride clip's hips lean forward beyond standing, in degrees, on average over the
# clip. The library sprint leans them 45°, which reads as a dive; runners at speed lean about
# 10-20°. A clip that leans more is scaled down in every frame, so its rise and fall stay; the
# library run (12°) and walk (4°) lean less and keep theirs. See stride_posture().
STRIDE_LEAN_MAX = 20.0
# How far a stride's arms turn with its chest as it stands up; the shoulders turn fully. Turned
# fully, the sprint's forward hand rose above the head (its chest stands 30° straighter than the
# clip's); left at the clip's turns, its back arm swung out straight behind.
STRIDE_ARM_CARRY = 0.5


def plant_feet(steps, tw, toe_points):
    """Hold each foot still while it is down in a stride clip. The library's feet speed up under
    the hips through each stance (a sprint foot from about 4 to 11 m/s while on the ground), so
    once placed legs stood the clips on the ground no single pace kept a foot still: in the
    scene study's game travel the toes slid forward a median 43% of body speed, against 14%
    for the earlier clips, whose feet floated and touched for a frame. A foot is down while its
    toes are within PLANT_BAND of their lowest and move back under the hips; through each run
    of at least three such frames the toes now move at one steady speed relative to the hips,
    from where they land to where they lift, through the heel's roll too. Each ankle goal moves
    by its toes' error and the leg is solved again; the second round takes up what the foot's
    roll changed. A contact across a closed loop's seam is one run. `steps` holds (frame,
    turns, root head, ankle goals) per frame in armature space, and its goals change in place;
    `toe_points(step)` solves one frame on a copy and returns each foot's mean toe point in
    world space (None for a foot without toes). Returns the planted distance (metres) and the
    frames it took, summed over every run, for the clip's report; None if no foot was down long
    enough."""
    count = len(steps)
    toes = [toe_points(step) for step in steps]
    heads = [tw @ step[2] for step in steps]
    paths = []  # (leg, frame index, the toes' wanted position from the hips)
    distance = frames_down = 0.0
    for leg in range(len(toes[0])):
        if toes[0][leg] is None:
            continue
        rel = [t[leg] - h for t, h in zip(toes, heads)]
        # A loop whose last frame repeats its first counts its frames once round.
        closed = (rel[0] - rel[-1]).length < 0.005
        span = count - 1 if closed else count
        low = min(t[leg].z for t in toes[:span])

        def back(i):  # models face -Y, so back is +Y; by central difference, round a closed loop
            before, after = (i - 1) % span if closed else max(i - 1, 0), (i + 1) % span if closed else min(i + 1, span - 1)
            return rel[after].y - rel[before].y > 0

        down = [toes[i][leg].z <= low + PLANT_BAND and back(i) for i in range(span)]
        runs, i = [], 0
        while i < span:
            if not down[i]:
                i += 1
                continue
            j = i
            while j + 1 < span and down[j + 1]:
                j += 1
            runs.append(list(range(i, j + 1)))
            i = j + 1
        if closed and len(runs) > 1 and runs[0][0] == 0 and runs[-1][-1] == span - 1:
            runs[0] = runs.pop() + runs[0]
        for run in (r for r in runs if len(r) >= 3):
            start, end = rel[run[0]], rel[run[-1]]
            distance += math.hypot(end.x - start.x, end.y - start.y)
            frames_down += len(run) - 1
            for k, index in enumerate(run[1:-1], 1):
                wanted = start.lerp(end, k / (len(run) - 1))
                paths += [(leg, f, wanted) for f in ([index, count - 1] if closed and index == 0 else [index])]
    for _ in range(2):
        for leg, f, wanted in paths:
            now = toes[f][leg] - heads[f]
            goal = tw @ steps[f][3][leg]
            goal.x += wanted.x - now.x
            goal.y += wanted.y - now.y
            steps[f][3][leg] = tw.inverted() @ goal
        for f in sorted({f for _, f, _ in paths}):
            toes[f] = toe_points(steps[f])
    return (distance, frames_down) if frames_down else None


def forward_pitch(turn):
    """Split a world-space turn into the rest of it and its pitch about the side axis (X: models
    face -Y, so a positive angle leans forward), in radians: turn = rest @ pitch."""
    twist = Quaternion((turn.w, turn.x, 0.0, 0.0) if turn.w >= 0 else (-turn.w, -turn.x, 0.0, 0.0))
    if twist.magnitude < 1e-9:
        return turn.copy(), 0.0
    twist.normalize()
    return turn @ twist.inverted(), 2 * math.atan2(twist.x, twist.w)


def stride_posture(turns, root, back, neck, shoulders, arms, lean_scale):
    """Stand one frame of a stride clip up as a runner stands; changes `turns`, each bone's world
    turn from rest. The library's strides lean from the hips and curl the upper back further (the
    run 29° more, 41° from upright at the shoulders), bending the neck back to look ahead.
    Straightening the back alone left the shoulders and neck at the clip's turns for that curled
    chest: the shoulders rolled forward against it, the coat's chest bunched into mounds and the
    head stood 20 cm ahead of the hips. So:
    - the hips keep their forward lean times `lean_scale` (STRIDE_LEAN_MAX);
    - each `back` bone leans with the hips, keeping its turns and side bends but no forward curl
      beyond them;
    - the `shoulders` turn with the chest, keeping the clip's hold on it, and the `arms` below
      them turn STRIDE_ARM_CARRY as far;
    - the `neck` keeps the direction it has standing, with its turns and side bends, so the head
      stays over the shoulders: tilted with the chest, a MakeHuman neck (38° forward standing)
      carried the head out in front, chin first;
    - the head keeps the clip's turn, so the gaze stays where the clip looks.
    The hips turn about their joints (retarget), so the legs placed afterwards keep the clip's
    reach and the feet land where the clip's do."""
    hips = turns[root]
    rest, lean = forward_pitch(hips)
    upright = rest @ Quaternion((1.0, 0.0, 0.0), lean * lean_scale) if lean > 0 else hips
    turns[root] = upright
    if not back:
        return
    chest = turns[back[-1]]
    for n in back:
        rest, curl = forward_pitch(turns[n] @ hips.inverted())
        turns[n] = (rest if curl > 0 else turns[n] @ hips.inverted()) @ upright
    carry = turns[back[-1]] @ chest.inverted()
    for n in shoulders:
        turns[n] = carry @ turns[n]
    part = Quaternion().slerp(carry, STRIDE_ARM_CARRY)
    for n in arms:
        turns[n] = part @ turns[n]
    for n in neck:
        turns[n] = forward_pitch(turns[n])[0]


def retarget(source, target, name, frames, names, align, relax, stride=False):
    """Key `target` with the motion of `source`'s current action. Each bone turns in world space
    by the same rotation from its own rest pose, so rigs whose bone axes, rest proportions or
    extra bones differ (the mercenary's rig against Meshy's) share a clip; copying joint angles
    would twist them. The root travels by the source root's displacement scaled by hip height,
    and each ankle by its clip ankle's path from rest, scaled alike, with the knee solved to
    reach it. In a `stride` clip (walk, run, sprint) a foot stays still while it is down
    (plant_feet), and the body above the hips stands as a runner's (stride_posture).
    Bones the source lacks (the mercenary's cape) stay at rest. `names`, `align` and
    `relax` come from bone_map: an aligned limb first turns to the direction its clip bone
    rests in, so the clip's limb directions carry over rather than turns from a different rest
    pose, and a relaxed bone that no clip moves holds its fixed turn."""
    order = bone_order(target)
    clip = {bone.name: names.get(bone.name, bone.name) for bone in order}
    shared = {n for n, c in clip.items() if c in source.pose.bones}
    if not shared:
        raise ValueError(f'{name}: no bone names in common with the model.')
    # A misspelt or clip-driven name would silently drop the hold.
    wrong = sorted(n for n in relax if n not in target.data.bones or n in shared)
    if wrong:
        raise ValueError(f'{name}: relax names bones the model lacks or the clip moves: {", ".join(wrong)}')
    held = {n: Euler([math.radians(a) for a in turn]).to_quaternion() for n, turn in relax.items()}
    sw, tw = source.matrix_world, target.matrix_world
    source_rest = {n: world_rotation(sw @ source.data.bones[clip[n]].matrix_local) for n in shared}
    target_rest = {n: world_rotation(tw @ target.data.bones[n].matrix_local) for n in shared}
    followed = {clip[n] for n in shared}
    turned = {}  # each aligned limb's turn to its clip bone's rest direction
    for bone in order:
        n = bone.name
        if n not in align:
            continue
        # A limb's direction runs from its joint to the next followed joint down the chain;
        # a limb with none below (a hand) turns with the aligned limb above it.
        below = [c.name for c in source.data.bones[clip[n]].children if c.name in followed]
        above = next((p.name for p in bone.parent_recursive if p.name in turned), None)
        if len(below) == 1:
            ends = [tw @ target.data.bones[m].head_local for m, c in clip.items() if c == below[0]]
            model_dir = sum(ends, Vector()) / len(ends) - tw @ target.data.bones[n].head_local
            clip_dir = sw @ source.data.bones[below[0]].head_local - sw @ source.data.bones[clip[n]].head_local
            turned[n] = clip_dir.rotation_difference(model_dir).inverted()
        elif not below and above:
            turned[n] = turned[above]
        else:
            raise ValueError(f'{name}: {n} needs one followed bone below {clip[n]} or an aligned one above.')
        target_rest[n] = turned[n] @ target_rest[n]
    root = next(bone for bone in order if bone.name in shared)
    # On the way up to the head: the back is the clip-driven bones between the root and the
    # neck, the neck those from the first neck bone up; the top of the back carries the rest of
    # the clip-driven bones above it but not the head, the shoulders nearest it and the arms
    # below them (stride_posture).
    top = next((bone for bone in order if bone.name.lower() == 'head'), None)
    back, neck, in_neck = [], [], False
    for bone in reversed(top.parent_recursive if top else []):  # the root first
        in_neck = in_neck or 'neck' in bone.name.lower()
        if bone.name in shared and bone != root:
            (neck if in_neck else back).append(bone.name)
    carried = {}
    for bone in order:
        above = {p.name for p in bone.parent_recursive}
        if (back and bone.name in shared and back[-1] in above and bone.name != top.name
                and bone.name not in neck and not above & (set(neck) | {top.name})):
            carried[bone.name] = above
    shoulders = [n for n, above in carried.items() if not above & carried.keys()]
    arms = [n for n in carried if n not in shoulders]
    lean_scale = 1.0
    if stride:
        leans = []
        for frame in frames:
            bpy.context.scene.frame_set(frame)
            hips = world_rotation(sw @ source.pose.bones[clip[root.name]].matrix) @ source_rest[root.name].inverted()
            leans.append(math.degrees(forward_pitch(hips)[1]))
        lean = sum(leans) / len(leans)
        if lean > STRIDE_LEAN_MAX:
            lean_scale = STRIDE_LEAN_MAX / lean
            print(f'{name}: hips lean {lean:.1f}° beyond standing on average, scaled to {STRIDE_LEAN_MAX:.0f}°')
    source_root = (sw @ source.data.bones[clip[root.name]].matrix_local).translation
    target_root = (tw @ root.matrix_local).translation
    scale = target_root.z / source_root.z  # hip heights; both rigs stand on z = 0
    to_armature = world_rotation(tw).inverted()
    # Legs place their ankles rather than copy their turns: the clip rig's knee joint sits in
    # front of a straight leg (its joints read 28° bent at rest), so the same turns on a leg
    # resting straight dropped MPFB feet 3-8 cm into the ground in Run and Sprint. Each ankle
    # follows its clip ankle's path from rest, scaled like the root's travel, so a planted clip
    # foot stays planted; the knee bends in the plane the turned leg chose, and a leg reaches
    # no farther than it stands, so it never straightens past its own standing angle. Lowering
    # the hips per frame to reach instead made them jump up to 11 cm between frames; clips()
    # grounds each clip with one constant offset.
    legs = []
    for side in ('Left', 'Right'):
        chain = [f'{side}UpLeg', f'{side}Leg', f'{side}Foot']
        model = [next((b.name for b in order if b.name in shared and clip[b.name] == c), None) for c in chain]
        if all(c in source.pose.bones for c in chain) and all(model):
            reach = sw @ source.data.bones[chain[2]].head_local - sw @ source.data.bones[chain[0]].head_local
            rest_reach = target.data.bones[model[2]].head_local - target.data.bones[model[0]].head_local
            toes = [b.name for b in order if b.name in shared and clip[b.name] == f'{side}ToeBase']  # MPFB's five
            legs.append((chain, model, reach, rest_reach, toes))
    to_model = tw.inverted().to_3x3()  # world vectors into armature units
    target.animation_data_create()
    action = target.animation_data.action = bpy.data.actions.new(name)
    steps = []  # each frame's bone turns, root head and ankle goals, before the legs bend
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        turns = {n: world_rotation(sw @ source.pose.bones[clip[n]].matrix) @ source_rest[n].inverted()
                 for n in shared}
        clip_hips = turns[root.name]
        if stride:
            stride_posture(turns, root.name, back, neck, shoulders, arms, lean_scale)
        posed = {n: to_armature @ turns[n] @ target_rest[n] for n in shared}  # armature-space rotations
        travel = (sw @ source.pose.bones[clip[root.name]].matrix).translation - source_root
        head = tw.inverted() @ (target_root + travel * scale)
        goals = []
        if legs:
            if stride:
                # Hips that stand up (stride_posture) turn about their joints, not their middle:
                # the root moves so the thighs stay where the clip's own hips put them, and the
                # legs keep the clip's reach. Turned about the middle, the hip joints moved
                # forward; the sprint's feet landed elsewhere, and Ada's push-off leg could not
                # reach back, so her foot lifted early and slid at travel speed.
                at_clip = joint_heads(order, dict(posed, **{root.name: to_armature @ clip_hips @ target_rest[root.name]}),
                                      held, root.name, head)
                at_now = joint_heads(order, posed, held, root.name, head)
                thighs = [model[0] for _, model, *_ in legs]
                head = head + sum((at_clip[t] - at_now[t] for t in thighs), Vector()) / len(thighs)
            heads = joint_heads(order, posed, held, root.name, head)
            for chain, (thigh, shin, foot), reach, rest_reach, toes in legs:
                now = sw @ source.pose.bones[chain[2]].head - sw @ source.pose.bones[chain[0]].head
                goal = tw @ (heads[thigh] + rest_reach + to_model @ ((now - reach) * scale))
                # The library's Wave, Punch and Dodge sink the clip rig's feet up to 4 cm below
                # where it stands; an ankle stays at or above its standing height.
                goal.z = max(goal.z, (tw @ target.data.bones[foot].head_local).z)
                goals.append(tw.inverted() @ goal)
        steps.append((frame, posed, head, goals))

    def solve(posed, head, goals):
        """Bend each leg to its ankle goal, then roll its foot off the ground (changes `posed`)."""
        heads = joint_heads(order, posed, held, root.name, head)
        for (chain, (thigh, shin, foot), reach, rest_reach, toes), goal in zip(legs, goals):
            bend_leg(posed, thigh, shin, heads[thigh], heads[shin], heads[foot], goal, rest_reach.length)
        # Feet roll on their toes instead of pushing them into the ground: MPFB's foot rests
        # 20° down to its toes and Meshy's 51°, so the clip's roll dropped MPFB toes 3-6 cm.
        heads = joint_heads(order, posed, held, root.name, head)
        for chain, (thigh, shin, foot), reach, rest_reach, toes in legs:
            lift_toes(posed, foot, tw @ heads[foot],
                      [(tw @ heads[n], (tw @ target.data.bones[n].head_local).z) for n in toes], to_armature)

    def toe_points(step):
        _, posed, head, goals = step
        trial = dict(posed)
        solve(trial, head, goals)
        heads = joint_heads(order, trial, held, root.name, head)
        return [sum((tw @ heads[n] for n in toes), Vector()) / len(toes) if toes else None
                for *_, toes in legs]

    planted = plant_feet(steps, tw, toe_points) if stride and legs else None
    for frame, posed, head, goals in steps:
        if legs:
            solve(posed, head, goals)
        for bone in order:  # parents first, so each inherits its parent's final rotation
            if bone.parent:
                inherited = posed[bone.parent.name] @ (
                    bone.parent.matrix_local.inverted() @ bone.matrix_local).to_quaternion()
            else:
                inherited = bone.matrix_local.to_quaternion()
            if bone.name in shared:
                basis = inherited.inverted() @ posed[bone.name]
            else:
                basis = held.get(bone.name)
                posed[bone.name] = inherited @ basis if basis else inherited
                if not basis:
                    continue
            pose = target.pose.bones[bone.name]
            pose.rotation_mode = 'QUATERNION'
            pose.rotation_quaternion = basis
            pose.keyframe_insert('rotation_quaternion', frame=frame, group=bone.name)
        pose = target.pose.bones[root.name]
        pose.location = root.matrix_local.inverted() @ head
        pose.keyframe_insert('location', frame=frame, group=root.name)
    target.animation_data.action = None
    return action, root.name, planted


def ground_speed(rig, action, frames, fps, root, follows):
    """The travel speed a looping gait implies: how fast a foot slides back under the hips as it
    touches down, over the frames within 1.5 cm of its lowest reach. The game scales playback by
    displayed speed over this, so a foot stays put where it visibly meets the ground. These
    clips' feet speed up under the hips through each stance, so a whole-stance average left
    them sliding forward as they landed (about 40% of body speed at 6.6 m/s). Each speed spans the
    frames either side, so a sprint's single contact frame still counts (frame pairs in a 3 cm
    band left one push-off sample, 14 m/s on MPFB people), and only a foot moving back counts,
    because a low swing passes forward through the band (the mercenary's walk clears 6 cm)."""
    feet = [follows[n] for n in ('LeftToeBase', 'RightToeBase') if n in follows] or \
        [follows[n] for n in ('LeftFoot', 'RightFoot') if n in follows]
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]  # Blender 5 plays an action through its slot
    samples = {foot: [] for foot in feet}
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        hips = (rig.matrix_world @ rig.pose.bones[root].matrix).translation
        for foot in feet:
            point = (rig.matrix_world @ rig.pose.bones[foot].matrix).translation
            samples[foot].append((point.z, point.x - hips.x, point.y - hips.y))
    rig.animation_data.action = None
    speeds = []
    for track in samples.values():
        loop = track[:-1]  # a stride's last frame repeats its first
        low = min(z for z, _, _ in loop)
        for i, (z, _, _) in enumerate(loop):
            (_, x0, y0), (_, x1, y1) = loop[i - 1], loop[(i + 1) % len(loop)]
            if z <= low + 0.015 and y1 > y0:  # models face -Y, so back is +Y
                speeds.append(math.hypot(x1 - x0, y1 - y0) * fps / 2)
    return sum(speeds) / len(speeds) if speeds else 0.0


def foot_reach(rig, action, frames, foot, root):
    """How far ahead of the hips a foot is on each frame; models face -Y (glTF +Z)."""
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    reach = []
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        hips = (rig.matrix_world @ rig.pose.bones[root].matrix).translation
        reach.append(hips.y - (rig.matrix_world @ rig.pose.bones[foot].matrix).translation.y)
    rig.animation_data.action = None
    return reach


def one_cycle(rig, action, frames, root, follows):
    """Make a gait clip one stride that starts at left heel strike (the left foot at its farthest
    ahead), so the game can blend walk, run and sprint phase-aligned; feet otherwise cross
    mid-blend. Heel strike is a single clear peak, unlike toe height, which a rolling foot
    lifts mid-stance. A closed single-stride loop is rotated; a longer clip keeps its first
    whole stride."""
    foot = follows.get('LeftFoot') or follows['LeftToeBase']
    reach = foot_reach(rig, action, frames, foot, root)
    middle = (max(reach) + min(reach)) / 2
    # A loop's last frame stands for its first, so the strike is sought among the frames once
    # round. Sought on that last frame too, the strike could fall there; the loop was then kept
    # as it was and ended on its own last frame, which after retargeting can differ from the
    # first, so it no longer closed and hitched once a stride (Kest's and Orin's sprints).
    span = len(reach) - 1
    peaks = [i for i in range(span)
             if reach[i] > middle and reach[i] >= reach[(i - 1) % span] and reach[i] > reach[(i + 1) % span]]
    if not peaks:
        raise ValueError(f'{action.name}: no left heel strike found for --stride.')
    onsets = peaks
    first = frames[0]
    curves = [(curve, {round(p.co.x): p.co.y for p in curve.keyframe_points}) for curve in action_curves(action)]
    if len(onsets) == 1:  # a closed loop holding one stride: rotate it to start at the contact
        span = len(frames) - 1
        order = [frames[(onsets[0] + i) % span] for i in range(span)] + [frames[onsets[0]]]
    else:
        order = list(range(frames[onsets[0]], frames[onsets[1]] + 1))
    for curve, values in curves:
        points = curve.keyframe_points
        points.clear()
        points.add(len(order))
        for i, frame in enumerate(order):
            points[i].co = (first + i, values[frame])
            points[i].interpolation = 'LINEAR'
        curve.update()
    return range(first, first + len(order))


def clips(args):
    """Give one rigged model the clips the game plays, retargeted from rigging outputs."""
    out = external_output(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # Work at the first clip's own rate (providers use 30 fps), so its keys land on whole
    # frames and export unchanged; resampling at Blender's 24 fps shortened a 0.7 s run loop.
    # A glTF clip at another rate keeps its timing and is resampled to this one.
    first = args.clip[0].partition('=')[2].partition('#')[0]
    fps = native_fps(Path(first).expanduser().resolve())
    clear_scene()
    scene = bpy.context.scene
    scene.render.fps = fps
    import_model(Path(args.model).expanduser().resolve())
    scene.render.fps = fps  # the FBX importer adopts the file's rate
    rigs = content('ARMATURE')
    if len(rigs) != 1:
        raise ValueError(f'Expected one armature in {args.model}, found {len(rigs)}.')
    rig = rigs[0]
    rig.data.pose_position = 'POSE'  # import_model shows the rest pose; retargeting reads poses
    rig.animation_data_create()
    rig.animation_data.action = None
    for track in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(track)
    own_actions = set(bpy.data.actions)
    strides = set(args.stride or [])
    names, align, relax = bone_map(args.bones)
    follows = followers(rig, names)
    named, facts, removed = {}, {}, {}
    for spec in args.clip:
        name, _, source = spec.partition('=')
        source, _, wanted = source.partition('#')
        objects, actions = set(bpy.data.objects), set(bpy.data.actions)
        import_model(Path(source).expanduser().resolve())
        if scene.render.fps != fps:
            # The FBX importer keyed this clip at its own rate; restoring ours would re-time it.
            raise ValueError(f'{source} is at {scene.render.fps} fps; clips here are {fps} fps. '
                             'Export it as glTF, which keeps its timing.')
        found = [a for a in bpy.data.actions if a not in actions and (not wanted or a.name == wanted)]
        if len(found) != 1:
            raise ValueError(f'{source} holds {len(found)} matching clips; name one with FILE#ACTION.')
        clip_rig = next(o for o in set(bpy.data.objects) - objects if o.type == 'ARMATURE')
        clip_rig.data.pose_position = rig.data.pose_position = 'POSE'  # import_model rests every rig
        clip_rig.animation_data.action = found[0]
        low, high = found[0].frame_range
        frames = range(math.floor(low), math.ceil(high) + 1)
        named[name], root, planted = retarget(clip_rig, rig, name, frames, names, align, relax, stride=name in strides)
        named[name].use_fake_user = True
        for obj in set(bpy.data.objects) - objects:
            bpy.data.objects.remove(obj, do_unlink=True)
        for action in set(bpy.data.actions) - actions - {named[name]}:
            bpy.data.actions.remove(action)
        if name in strides:
            # Remove the source loop's travel before trimming too: rotating a closed loop that
            # still travels would leave a jump back at its old seam, invisible to a later pass.
            removed[name] = without_drift(named[name], root)
            frames = one_cycle(rig, named[name], frames, root, follows)
        print(f'{name}: lowered {grounded(rig, named[name], frames, root, follows) * 100:.1f} cm to the ground')
        # Measured on the planted clip: where a foot was held still the measure reads the speed
        # it was held at, and a foot down too briefly to hold (the mercenary's sprint touches
        # for one frame) is measured where it touches. Pacing to the held speed alone sped his
        # sprint up and slid his left foot 80% of body speed.
        speed = ground_speed(rig, named[name], frames, fps, root, follows)
        facts[name] = {'seconds': round((frames[-1] - frames[0]) / fps, 3), 'groundSpeed': round(speed, 3)}
        if planted:
            print(f'{name}: feet held still for {planted[1]:.0f} frames, at {planted[0] / planted[1] * fps:.2f} m/s')
    # Strides always loop on the spot: the game moves the body and paces the legs to it.
    # docs/projects/3d-pixel-art-tech-design.md#7-animation-attachments-and-time
    for name in sorted(strides | set(args.in_place or [])):
        # The travelling root, not the first parentless bone (the mercenary's cape root is one).
        travel = math.hypot(removed.get(name, 0.0), without_drift(named[name], root))
        print(f'{name}: removed {travel:.3f} of travel per loop from {root}, in its own units')
    for action in own_actions:
        bpy.data.actions.remove(action)
    # Tracks export by name, as in the working human recipe (scripts/study_human_motion.py).
    for name, action in named.items():
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, int(action.frame_range[0]), action)
        if strip.action_slot is None:  # bind the rig's own slot, the one holding bone curves
            strip.action_slot = next((slot for slot in action.slots
                                      if slot.identifier == 'OB' + rig.name), action.slots[0])
        track.mute = True
    bpy.ops.object.select_all(action='DESELECT')
    # A motion file holds only the skeleton and clips; the game merges them onto the model.
    for obj in [rig] if args.motion_only else content():
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    export_glb(out)
    out.with_suffix('.clips.json').write_text(json.dumps(facts, indent=1) + '\n')
    if args.motion_only:
        print(f'Motion {out.name}: {facts}, {out.stat().st_size} bytes')
        return 0
    result = measure(out, args.profile, None)
    over = [b['check'] for b in result['budgets'] if b['status'] == 'over'] + \
        [f'missing clip {c}' for c in result['motion']['missingRequired']]
    print(f"Clips {out.name}: {facts}, {result['rig']['deformBones']} deform bones, "
          f"height {result['size']['height']} m" + (f" | over or missing: {', '.join(over)}" if over else ''))
    return 0


def point(text):
    values = [float(v) for v in text.split(',')]
    if len(values) != 3:
        raise ValueError(f'Expected X,Y,Z, got {text!r}.')
    return Vector(values)


def dominant_bones(obj):
    """Each vertex's strongest bone, or None where a vertex has no weight."""
    names = {group.index: group.name for group in obj.vertex_groups}
    strongest = []
    for vertex in obj.data.vertices:
        best = max(vertex.groups, key=lambda g: g.weight, default=None)
        strongest.append(names.get(best.group) if best is not None and best.weight > 0 else None)
    return strongest


def face_colours(obj):
    """Each face's paint at its middle (nearest texel of its material's first image), or None."""
    cache, colours = {}, []
    uv = obj.data.uv_layers.active.data if obj.data.uv_layers.active else None
    for poly in obj.data.polygons:
        material = obj.material_slots[poly.material_index].material if obj.material_slots else None
        image = next((n.image for n in (material.node_tree.nodes if material and material.use_nodes else [])
                      if getattr(n, 'image', None)), None)
        if image is None or uv is None:
            colours.append(None)
            continue
        if image.name not in cache:
            w, h = image.size
            cache[image.name] = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, -1)[:, :, :3]
        pixels = cache[image.name]
        u = sum(uv[i].uv.x for i in poly.loop_indices) / poly.loop_total
        v = sum(uv[i].uv.y for i in poly.loop_indices) / poly.loop_total
        h, w = pixels.shape[:2]
        colours.append(pixels[min(h - 1, max(0, int((v % 1.0) * h))), min(w - 1, max(0, int((u % 1.0) * w)))])
    return colours


def eye_landmarks(rig, meshes, family):
    """The point between the eyes at the front of the eyeballs, and the eye spacing, for a rig
    with two eye bones (the MakeHuman family); a painted face has none and needs them given."""
    eyes = sorted((b for b in rig.data.bones if b.name in family and b.name.lower().startswith('eye')),
                  key=lambda b: b.head_local.x)
    if len(eyes) != 2:
        return None, None
    centres = [rig.matrix_world @ b.head_local for b in eyes]
    front = min((o.matrix_world @ v.co).y for o in meshes
                for v, bone in zip(o.data.vertices, dominant_bones(o)) if bone in {b.name for b in eyes})
    middle = (centres[0] + centres[1]) / 2
    return Vector((middle.x, front, middle.z)), (centres[1] - centres[0]).length


def graft_head(args):
    """Give a rigged body (with or without clips) a separately generated head.

    The old head goes: the meshes that hang mostly on the head bone and the bones below it (eyes,
    brows, lashes, hair), and every skin face hanging only on those bones. The new head is scaled
    and moved so its eyes land on the old eyes and cut flat at the neck cut, keeping the plain
    undershirt its views gave it. Below the base of the neck that bust is fitted onto the body's
    bare skin, under the clothing and, at an open neckline, showing like an undershirt; where the
    neck is cut above its base, the cut's edge is drawn onto the old skin instead. Either way the
    two meet without a step or a gap, and the old skin the new head covers goes, except along
    that seam. The body's own skin paint is tinted to the new neck where skin is its own mesh. The
    head is skinned with the weights of the nearest old skin, so its jaw follows the head and its
    neck the neck bones in every clip, and the bust with the skin it lies on. Clothing is never
    cut. How this was found: art-direction/studies/2026-11-03-character-fixes/README.md.
    """
    band, seam, cover, fit = 0.02, 0.01, 0.04, 0.04  # metres; see the study record
    fits = 20  # rounds of pressing the bust onto the skin and relaxing it
    out = external_output(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # Work at the body's own clip rate, as clips() does: at Blender's 24 fps the export resampled
    # its 30 fps clips and cut the 0.7 s run loop to 0.667 s, dropping the frame that closes it.
    model = Path(args.model).expanduser().resolve()
    fps = native_fps(model)
    clear_scene()
    bpy.context.scene.render.fps = fps
    import_model(model)
    rigs = content('ARMATURE')
    if len(rigs) != 1:
        raise ValueError(f'Expected one armature in {args.model}, found {len(rigs)}.')
    rig = rigs[0]
    named = [b.name for b in rig.data.bones if b.name.lower() == (args.head_bone or 'head').lower()]
    if len(named) != 1:
        raise ValueError(f'Name the head bone with --head-bone; found {named or "none"}.')
    head_bone = rig.data.bones[named[0]]
    family = {head_bone.name} | {b.name for b in head_bone.children_recursive}
    neck = {b.name for b in head_bone.parent_recursive if 'neck' in b.name.lower()}
    meshes = [o for o in content('MESH') if o.parent is rig]
    eyes, spacing = eye_landmarks(rig, meshes, family)
    eyes = point(args.model_eyes) if args.model_eyes else eyes
    spacing = args.model_eye_spacing or spacing
    if eyes is None:
        raise ValueError('This rig has no eye bones: give --model-eyes, read from front and side renders.')
    if args.scale:
        scale = args.scale
    elif spacing and args.head_eye_spacing:
        scale = spacing / args.head_eye_spacing
    else:
        raise ValueError('Give --scale, or --head-eye-spacing (and --model-eye-spacing for a painted face).')

    # Head parts go whole: eyes, brows and hair hang partly on the head (a long braid only 21%)
    # and otherwise on the neck and spine, at most a tenth on a limb, where the body's skin hangs
    # 40% on its limbs and clothing hardly on the head. Skin meshes, with some faces on the head,
    # are cut below; the rest (clothing) stays.
    axial = family | {b.name for b in head_bone.parent_recursive}
    removed = {'objects': [], 'faces': 0}
    skins = []
    for obj in meshes:
        strongest = dominant_bones(obj)
        on_head = sum(bone in family for bone in strongest)
        on_limbs = sum(bone not in axial for bone in strongest)
        if strongest and on_head * 10 >= len(strongest) and on_limbs * 10 <= len(strongest):
            removed['objects'].append(obj.name)
            bpy.data.objects.remove(obj, do_unlink=True)
        elif any(bone in family for bone in strongest):
            skins.append((obj, strongest))
    if not skins:
        raise ValueError(f'No mesh hangs on {head_bone.name}; nothing to replace.')
    # What else the body wears; an unskinned helper mesh is not clothing.
    clothing = [o for o in content('MESH') if o.parent is rig and o not in {s for s, _ in skins}
                and any(dominant_bones(o))]

    # Weights by bone for each vertex. Bones below the head (jaw, eyes) fold into the head; the
    # new head has no parts for them.
    def bone_mixes(obj):
        names = {g.index: g.name for g in obj.vertex_groups}
        mixes = []
        for vertex in obj.data.vertices:
            mix = {}
            for g in vertex.groups:
                bone = names.get(g.group)
                if bone in rig.data.bones and g.weight > 0:
                    bone = head_bone.name if bone in family else bone
                    mix[bone] = mix.get(bone, 0.0) + g.weight
            mixes.append(mix)
        return mixes
    # Weight sources for the head: the old skin as it was, head included.
    samples, weights = [], []
    for obj, _ in skins:
        for vertex, mix in zip(obj.data.vertices, bone_mixes(obj)):
            if mix:
                samples.append(obj.matrix_world @ vertex.co)
                weights.append(mix)
    # On a body painted as one mesh, a collar, scarf or hood hangs on the neck and spine like the
    # skin under it; there covered skin goes only where its paint matches the old head's (skin,
    # hair) in 12 levels per channel, give or take one. A colour the old head lacks is clothing.
    def level(colour):
        return tuple(min(11, int(x * 12)) for x in colour)
    def skin_like(c):  # warm: not an undershirt's grey or black hair; any depth of skin tone
        return c is not None and c[0] >= c[1] >= c[2] and c[0] - c[2] > 0.04 and c[0] > 0.12
    palettes = {}
    for obj, strongest in skins:
        if args.neck_by_colour:
            counts = {}
            for poly, colour in zip(obj.data.polygons, face_colours(obj)):
                if colour is not None and all(strongest[i] in family for i in poly.vertices):
                    counts[level(colour)] = counts.get(level(colour), 0) + 1
            total = sum(counts.values()) or 1
            palettes[obj.name] = [k for k, n in counts.items() if n / total >= 0.005]
    # The old head's own faces go first, so the seam is drawn onto the body that stays.
    points, polygons, point_mixes = [], [], []
    for obj, strongest in skins:
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        doomed = [f for f in mesh.faces if all(strongest[v.index] in family for v in f.verts)]
        removed['faces'] += len(doomed)
        # Faces only: deleting their vertices too renumbered the rest, so the per-vertex bone list
        # no longer lined up and half the old nape read as finger skin and stayed over the new one.
        bmesh.ops.delete(mesh, geom=doomed, context='FACES_ONLY')
        mesh.to_mesh(obj.data)  # vertices stay, so the per-vertex bone list still lines up
        mesh.free()
        base = len(points)
        points.extend(obj.matrix_world @ v.co for v in obj.data.vertices)
        polygons.extend(tuple(base + i for i in p.vertices) for p in obj.data.polygons)
        point_mixes.extend(bone_mixes(obj))
    body = BVHTree.FromPolygons(points, polygons)
    for obj in clothing:  # the body as dressed: where a cut edge counts as on the body
        base = len(points)
        points.extend(obj.matrix_world @ v.co for v in obj.data.vertices)
        polygons.extend(tuple(base + i for i in p.vertices) for p in obj.data.polygons)
    dressed = BVHTree.FromPolygons(points, polygons)

    def worn_weights(location, face):
        """The old skin's own weights at a point on one of its faces."""
        corners = polygons[face]
        mix = {}
        for i, share in zip(corners, interpolate.poly_3d_calc([points[i] for i in corners], location)):
            for bone, w in point_mixes[i].items():
                mix[bone] = mix.get(bone, 0.0) + w * share
        total = sum(mix.values()) or 1.0
        return {bone: w / total for bone, w in mix.items()}

    before = set(bpy.data.objects)
    import_model(Path(args.head).expanduser().resolve())
    arrived = [o for o in bpy.data.objects if o not in before]
    parts = [o for o in arrived if o.type == 'MESH']
    if len(parts) != 1:
        raise ValueError(f'Expected one mesh in {args.head}, found {len(parts)}.')
    head = parts[0]
    for obj in arrived:
        if obj is not head:
            bpy.data.objects.remove(obj, do_unlink=True)
    head.parent = None
    head.data.transform(head.matrix_world)  # bake the file's own placement, then place it ourselves
    head.matrix_world = Matrix.Identity(4)
    head.data.transform(Matrix.Translation(eyes) @ Matrix.Scale(scale, 4) @ Matrix.Translation(-point(args.head_eyes)))
    mesh = bmesh.new()
    mesh.from_mesh(head.data)
    # glTF splits vertices along texture seams; joined again, only real openings are edges.
    bmesh.ops.remove_doubles(mesh, verts=mesh.verts[:], dist=1e-5)
    bmesh.ops.bisect_plane(mesh, geom=mesh.verts[:] + mesh.edges[:] + mesh.faces[:], dist=1e-6,
                           plane_co=(0, 0, args.neck_cut), plane_no=(0, 0, 1), clear_inner=True)
    mesh.to_mesh(head.data)
    mesh.free()
    # The views dress every head in a plain dark-grey undershirt down to its shoulders. At an
    # open neckline it stays and reads as an undershirt; stripping it there left the old skin
    # showing between its neckline and the clothing, in another colour.
    # Below the base of the neck that bust is the generated person's chest, not this body's:
    # placed by the eyes it stood up to 10 cm in front of a coat, cut flat like a shelf, and as
    # MakeHuman bodies have no skin under their clothes, the nearest old skin it took its weights
    # from was the throat and chin, so it swung with the head. Everything below the base that
    # joins the cut's edge is fitted onto the bare skin as cloth is, pressed onto it and relaxed
    # in turns, fully below the base of the body's own neck (lower at the throat than at the nape)
    # and 1.5 mm out so the new skin wins the depth test, with its open edge laid level at its own
    # height; it then moves with that skin. Pushed under the clothing instead, it folded into a
    # ruff at the neckline; pressed in one go, the shelf's flat top crumpled into a strip there;
    # and drawn to the nearest skin, the open edge rose in the middle and opened a notch. A hair
    # lock hanging past the base on its own stays put. Elsewhere the cut's edge is drawn onto the
    # old skin, fully at the edge and fading over `band`; on a neck cut above its base (the painted
    # sheet bodies) or a rig without neck bones, that is all that moves.
    joint = min((rig.matrix_world @ rig.data.bones[n].head_local for n in neck), key=lambda p: p.z, default=None)
    neck_base = joint.z if joint else -math.inf
    mesh = bmesh.new()
    mesh.from_mesh(head.data)
    edge = [v for v in mesh.verts if v.is_boundary and v.co.z < args.neck_cut + 0.005]
    if not edge:  # a cut below the head leaves its whole bust unfitted, standing off like a shelf
        raise ValueError(f'--neck-cut {args.neck_cut} is below the placed head, whose lowest point is at '
                         f'{min(v.co.z for v in mesh.verts):.3f}: cut above it.')
    rim = [v.co.copy() for v in edge]
    rim_tree = kdtree.KDTree(len(rim))
    for i, co in enumerate(rim):
        rim_tree.insert(co, i)
    rim_tree.balance()
    # The bust, piece by piece: what joins the cut's edge below the base. A piece that comes
    # nowhere near the body (a braid's cut end) stays put. Judged by its cut edge alone, a cut
    # through only the front of Mike's chest was nowhere near and left the shelf.
    bust, seen = set(), set()
    for start in (v for v in edge if v.co.z < neck_base):
        if start in seen:
            continue
        piece, pending = {start}, [start]
        while pending:
            vertex = pending.pop()
            for link in vertex.link_edges:
                other = link.other_vert(vertex)
                if other not in piece and other.co.z < neck_base:
                    piece.add(other)
                    pending.append(other)
        seen |= piece
        if any(dressed.find_nearest(v.co)[3] < 2 * band for v in piece):
            bust |= piece
    def on_skin(vertex):
        """Where a bust vertex goes on the bare skin: the open edge, seen level from outside at
        its own height; the rest, the nearest skin."""
        if vertex.is_boundary:
            level = Vector((vertex.co.x - joint.x, vertex.co.y - joint.y, 0.0))
            level = level.normalized() if level.length > 1e-6 else Vector((0.0, -1.0, 0.0))
            location, normal, _, _ = body.ray_cast(vertex.co + level * 0.3, -level, 0.6)
            if location is not None:
                return location, normal
        location, normal, _, _ = body.find_nearest(vertex.co)
        return location, normal
    # The press is full at the base of the body's own neck, where its skin hangs half on the neck
    # and head, read level all round the neck, and grows over `fit` above it, but never from above
    # the lowest neck bone: at the nape, where that base is level with the bone, it grows from the
    # bone and is full `fit` below it. The bone sits at the back of the base, which slopes about
    # 6 cm lower to the throat: pressed from the bone all round, a generated throat 2 cm in front
    # of the old one was pushed onto it just under the jaw, a ring across the neck. Ended lower,
    # below where the generated chest juts out, part of that chest stayed out and pinched the neck
    # above the collar. Where the cut leaves less room than `fit` (Ada's), the press grows over the
    # room left, so the bust lies fully on the skin at its edge.
    def neck_base_at(angle):
        direction = Vector((math.sin(angle), -math.cos(angle), 0.0))  # 0 is the front (-Y)
        z = neck_base + 0.06
        while z > args.neck_cut:
            location, normal, face, _ = body.ray_cast(Vector((joint.x, joint.y, z)) + direction * 0.3, -direction, 0.6)
            # a hit facing away came through the old head's opening, from inside the far side
            if location is not None and normal.dot(direction) > 0 and sum(
                    w for bone, w in worn_weights(location, face).items() if bone in neck or bone == head_bone.name) <= 0.5:
                return z
            z -= 0.0025
        return neck_base
    sides = 36
    tops = [min(neck_base, neck_base_at(2 * math.pi * i / sides) + fit) for i in range(sides)] if bust else []
    pull = {}
    for v in bust:
        turn = (math.atan2(v.co.x - joint.x, -(v.co.y - joint.y)) % (2 * math.pi)) / (2 * math.pi) * sides
        i = int(turn) % sides
        top = tops[i] + (tops[(i + 1) % sides] - tops[i]) * (turn - int(turn))
        span = max(min(fit, top - args.neck_cut), 0.001)
        distance = rim_tree.find(v.co)[2] if rim else band
        t = max(1 - distance / band if distance < band else 0.0, min(1.0, max(0.0, (top - v.co.z) / span)))
        pull[v] = t * t * (3 - 2 * t)
    for round_ in range(fits + 1):
        for v in bust:
            location, normal = on_skin(v)
            if location is not None:
                v.co = v.co.lerp(location + normal * 0.0015, pull[v])
        if round_ < fits:
            means = {v: sum((link.other_vert(v).co for link in v.link_edges), Vector()) / len(v.link_edges)
                     for v in bust if v.link_edges and not v.is_boundary}  # relaxed, an open edge draws in
            for v, mean in means.items():
                v.co = v.co.lerp(mean, 0.5 * pull[v])
    # What the skin could not take (where it stops under clothing) goes; the rest lies on it,
    # hidden under the clothing or showing at its neckline like an undershirt.
    skin_at = {v: body.find_nearest(v.co) for v in bust}
    hidden = {v for v in bust if pull[v] > 0.99 and (skin_at[v][0] is None or skin_at[v][3] > 0.005)}
    bmesh.ops.delete(mesh, geom=[f for f in mesh.faces if all(v in hidden for v in f.verts)], context='FACES')
    bmesh.ops.delete(mesh, geom=[v for v in mesh.verts if not v.link_faces], context='VERTS')
    pull = {v: t for v, t in pull.items() if v.is_valid}
    mesh.verts.index_update()
    shares = {}  # head vertex index: how far it is drawn onto the skin, and the skin's weights there
    for vertex in mesh.verts:
        if vertex in pull:
            location, _, face, _ = skin_at[vertex]
            if location is not None:
                shares[vertex.index] = pull[vertex], worn_weights(location, face)
            continue
        distance = rim_tree.find(vertex.co)[2] if rim else band
        at_edge = 1 - distance / band if distance < band else 0.0
        if at_edge > 0:
            location, normal, _, gap = body.find_nearest(vertex.co)
            if location is not None and gap < 2 * band:
                vertex.co = vertex.co.lerp(location + normal * 0.0015, at_edge * at_edge * (3 - 2 * at_edge))
    # The seam now runs wherever the head ends: its cut edge or where it went under clothing.
    rim = [v.co.copy() for v in mesh.verts if v.is_boundary and v.co.z < max(args.neck_cut + 0.005, neck_base)]
    rim_tree = kdtree.KDTree(len(rim))
    for i, co in enumerate(rim):
        rim_tree.insert(co, i)
    rim_tree.balance()
    mesh.to_mesh(head.data)
    mesh.free()
    new_skin = BVHTree.FromPolygons([v.co for v in head.data.vertices], [tuple(p.vertices) for p in head.data.polygons])

    # Where skin is its own mesh (the MakeHuman family), tint all its paint to the new head's
    # neck, so the old skin below the seam and the hands match the face: per channel, the ratio
    # of the two necks' skin colours. Each is the median of the lighter half of its warm samples,
    # because brown hair (a braid by the neck) is warm too but darker than the skin beside it. A
    # body painted as one mesh is left alone: tinting it by colour also shifted clothing near the
    # skin's colours and missed its lightest skin.
    def skin_tone(samples):
        colours = np.array(samples)
        light = colours @ np.array([0.3, 0.59, 0.11])
        return np.median(colours[light >= np.median(light)], axis=0)
    tint = None
    if not args.neck_by_colour:
        new_neck = [c for poly, c in zip(head.data.polygons, face_colours(head))
                    if skin_like(c) and rim and 0.02 < rim_tree.find(poly.center)[2] < 0.10]  # the neck, above the undershirt
        old_neck = [c for obj, strongest in skins for poly, c in zip(obj.data.polygons, face_colours(obj))
                    if skin_like(c) and all(strongest[i] in neck for i in poly.vertices)]
        if new_neck and old_neck:
            new_median, old_median = skin_tone(new_neck), skin_tone(old_neck)
            print(f'Skin: new neck {np.round(new_median, 3)} ({len(new_neck)} faces), '
                  f'old neck {np.round(old_median, 3)} ({len(old_neck)} faces)')
            tint = np.clip(new_median / np.maximum(old_median, 1e-3), 0.5, 2.0)
            for image in {n.image for obj, _ in skins for slot in obj.material_slots if slot.material
                          for n in slot.material.node_tree.nodes if getattr(n, 'image', None)}:
                pixels = np.array(image.pixels[:], dtype=np.float32).reshape(-1, image.channels)
                pixels[:, :3] = np.clip(pixels[:, :3] * tint, 0.0, 1.0)
                image.pixels = pixels.ravel().tolist()
                image.update()
                image.pack()

    # The old skin of the neck and upper back (never shoulders or limbs) goes where the new head
    # covers it within `cover`, except along the seam, so no hole opens. Where skin is its own
    # mesh, all of it above the base of the neck counts as neck (MakeHuman hangs the sides of the
    # neck partly on the collarbones, and that skin, standing outside a slimmer new neck, showed
    # at the collar), and skin the fitted bust lies on goes too, whatever it hangs on and even
    # along the seam, or it showed through mid-run.
    for obj, strongest in skins:
        world = obj.matrix_world
        own_skin = obj.name not in palettes  # skin as its own mesh, not painted with the clothing
        head_like = None
        if obj.name in palettes:
            colours, palette = face_colours(obj), palettes[obj.name]

            def head_like(index):
                colour = colours[index]
                return colour is not None and any(all(abs(a - b) <= 1 for a, b in zip(level(colour), k))
                                                  for k in palette)
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        mesh.faces.ensure_lookup_table()
        doomed = []
        for face in mesh.faces:
            centre = world @ face.calc_center_median()
            if centre.z <= args.neck_cut:
                continue
            location, _, _, gap = new_skin.find_nearest(centre)
            if location is None or gap > cover:
                continue
            fitted = own_skin and pull and gap < 0.003  # the fitted bust lies on it
            neckish = all(strongest[v.index] in axial for v in face.verts) or (own_skin and centre.z >= neck_base)
            if not fitted and (not neckish or (rim and rim_tree.find(location)[2] < seam)):
                continue
            if head_like is None or head_like(face.index):
                doomed.append(face)
        removed['faces'] += len(doomed)
        bmesh.ops.delete(mesh, geom=doomed, context='FACES')
        bmesh.ops.delete(mesh, geom=[v for v in mesh.verts if not v.link_faces], context='VERTS')
        mesh.to_mesh(obj.data)  # also drops the vertices the old head's faces left
        mesh.free()
        if not obj.data.polygons:
            removed['objects'].append(obj.name)
            bpy.data.objects.remove(obj, do_unlink=True)

    tree = kdtree.KDTree(len(samples))
    for i, co in enumerate(samples):
        tree.insert(co, i)
    tree.balance()
    groups = {}
    for vertex in head.data.vertices:
        mix = {}
        for _, i, distance in tree.find_n(vertex.co, 4):
            share = 1.0 / max(distance, 1e-4)
            for bone, w in weights[i].items():
                mix[bone] = mix.get(bone, 0.0) + w * share
        if vertex.index in shares:
            # The bust takes the skin's own weights where it was drawn onto it, as far as it was
            # drawn, so it moves with that skin instead of the nearest throat.
            t, drawn = shares[vertex.index]
            total = sum(mix.values())
            mix = {bone: (1 - t) * mix.get(bone, 0.0) / total + t * drawn.get(bone, 0.0)
                   for bone in mix.keys() | drawn.keys()}
        top = sorted(mix.items(), key=lambda kv: -kv[1])[:BUDGETS['influences']]
        total = sum(w for _, w in top)
        for bone, w in top:
            if bone not in groups:
                groups[bone] = head.vertex_groups.new(name=bone)
            groups[bone].add([vertex.index], w / total, 'REPLACE')
    head.name = head.data.name = 'generated head'  # never a bone's name (the consumer contract)
    # Every map in the output, the body's too: a generated body's own map is 2048², and the game's
    # copies are capped at 1024² for their GPU memory (3d-models.md, Give a person a generated head).
    for image in bpy.data.images:
        if image.size[0] and max(image.size) > args.max_texture:
            factor = args.max_texture / max(image.size)
            image.scale(round(image.size[0] * factor), round(image.size[1] * factor))
    head.parent = rig
    head.matrix_parent_inverse = rig.matrix_world.inverted()
    head.modifiers.new('Armature', 'ARMATURE').object = rig

    rig.data.pose_position = 'POSE'
    if rig.animation_data:
        rig.animation_data.action = None  # export the clips' tracks, not a stray active action
    bpy.ops.object.select_all(action='DESELECT')
    for obj in content():
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    faces = len(head.data.polygons)
    export_glb(out)
    result = measure(out, args.profile, None)  # reloads the scene from the exported file
    over = [b['check'] for b in result['budgets'] if b['status'] == 'over']
    over += [f'mesh named like bone {n}' for n in result['rig']['meshNamedLikeBone']]
    print(f"Head {out.name}: scale {scale:.4f}, eyes at {tuple(round(c, 4) for c in eyes)}; removed "
          f"{len(removed['objects'])} meshes {removed['objects']} and {removed['faces']} skin faces; "
          f"skin tint {None if tint is None else [round(float(t), 3) for t in tint]}; "
          f"head {faces} faces; clips "
          f"{[c['name'] for c in result['motion']['clips']]}" + (f" | over or wrong: {', '.join(over)}" if over else ''))
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
    clip.add_argument('--clip', action='append', required=True, metavar='NAME=FILE[#ACTION]',
                      help='A clip name the game plays and a file holding that clip; #ACTION picks one '
                           'of several.')
    clip.add_argument('--in-place', action='append', metavar='NAME',
                      help="Remove that clip's net travel, so it loops on the spot.")
    # Not --cycle: Blender's Cycles add-on claims abbreviations of its --cycles-* options.
    clip.add_argument('--stride', action='append', metavar='NAME',
                      help='Make that gait clip one stride starting at left heel strike, on the spot.')
    clip.add_argument('--bones', metavar='FILE',
                      help="JSON naming the clip bone each model bone follows, for a rig of another "
                           "family (scripts/art/bone-maps/).")
    clip.add_argument('--out', required=True)
    clip.add_argument('--motion-only', action='store_true',
                      help='Export only the skeleton and clips, for a model that loads its motion separately.')
    clip.add_argument('--profile', choices=['character', 'creature', 'prop'], default='character')
    graft = commands.add_parser('head', help="Replace a rigged body's head with a generated head.")
    graft.add_argument('--model', required=True, help='The rigged body, with or without clips; both are kept.')
    graft.add_argument('--head', required=True, help='The generated head and neck, facing -Y in Blender.')
    graft.add_argument('--out', required=True)
    graft.add_argument('--head-eyes', required=True, metavar='X,Y,Z',
                       help="The point between the head's eyes at the front of the eyeballs, in its own units.")
    graft.add_argument('--model-eyes', metavar='X,Y,Z',
                       help='The same point on the body; found from eye bones when the rig has them.')
    graft.add_argument('--scale', type=float, help="Scale for the head; else the eye spacings' ratio.")
    graft.add_argument('--head-eye-spacing', type=float, help="Pupil to pupil on the head, in its own units.")
    graft.add_argument('--model-eye-spacing', type=float, help='Pupil to pupil on the body, for a painted face.')
    graft.add_argument('--neck-cut', type=float, required=True,
                       help='Height in metres where the new head is cut, inside the clothing (1.50 on a 1.85 m body).')
    graft.add_argument('--neck-by-colour', action='store_true',
                       help="Remove covered skin only where its paint matches the old head's, for a body "
                            "whose clothing and skin are one mesh.")
    graft.add_argument('--head-bone', help='The head bone, when it is not named head.')
    graft.add_argument('--max-texture', type=int, default=BUDGETS['texture_edge'])
    graft.add_argument('--profile', choices=['character', 'creature', 'prop'], default='character')
    args = parser.parse_args(argv)
    code = {'report': report, 'sheet': sheet_models, 'normalize': normalize, 'clips': clips,
            'head': graft_head}[args.command](args)
    sys.exit(code)


if __name__ == '__main__':
    main()
