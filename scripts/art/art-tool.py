"""Inspect and compare candidate models for the art workflow (AF05).

Run from Blender --background --factory-startup --disable-autoexec:

  Blender ... --python scripts/art/art-tool.py -- report --out DIR [--profile P] MODEL...
  Blender ... --python scripts/art/art-tool.py -- sheet models --out PNG --reference-height M MODEL...
  Blender ... --python scripts/art/art-tool.py -- normalize --in MODEL --out GLB --height M [--rotate-deg N]
  Blender ... --python scripts/art/art-tool.py -- clips --model RIGGED --clip Idle=FILE --clip Run=FILE [--bones MAP] --out GLB

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
    Meshy's 67°; MPFB's knees are straight, Meshy's slightly bent), with the hands they carry.
    Spine, neck, head and feet are left out because their rest differences are anatomy, which
    turning them would distort (Meshy's foot points 51° down to its toes, MPFB's 20°)."""
    if not path:
        return {}, []
    spec = json.loads(Path(path).expanduser().read_text())
    return spec['bones'], spec.get('alignRest', [])


def followers(rig, names):
    """Each clip bone name and the first model bone, parents first, that follows it."""
    found = {}
    for bone in bone_order(rig):
        found.setdefault(names.get(bone.name, bone.name), bone.name)
    return found


def retarget(source, target, name, frames, names, align):
    """Key `target` with the motion of `source`'s current action. Each bone turns in world space
    by the same rotation from its own rest pose, so rigs whose bone axes, rest proportions or
    extra bones differ (the mercenary's rig against Meshy's) share a clip; copying joint angles
    would twist them. The root travels by the source root's displacement scaled by hip height.
    Bones the source lacks (the mercenary's cape) stay at rest. `names` and `align` come from
    bone_map: an aligned limb first turns to the direction its clip bone rests in, so the
    clip's limb directions carry over rather than turns from a different rest pose."""
    order = bone_order(target)
    clip = {bone.name: names.get(bone.name, bone.name) for bone in order}
    shared = {n for n, c in clip.items() if c in source.pose.bones}
    if not shared:
        raise ValueError(f'{name}: no bone names in common with the model.')
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
    source_root = (sw @ source.data.bones[clip[root.name]].matrix_local).translation
    target_root = (tw @ root.matrix_local).translation
    scale = target_root.z / source_root.z  # hip heights; both rigs stand on z = 0
    to_armature = world_rotation(tw).inverted()
    target.animation_data_create()
    action = target.animation_data.action = bpy.data.actions.new(name)
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        posed = {}  # each target bone's armature-space rotation this frame
        for bone in order:
            rest = bone.matrix_local.to_quaternion()
            if bone.parent:
                inherited = posed[bone.parent.name] @ (
                    bone.parent.matrix_local.inverted() @ bone.matrix_local).to_quaternion()
            else:
                inherited = rest
            if bone.name not in shared:
                posed[bone.name] = inherited
                continue
            turn = world_rotation(sw @ source.pose.bones[clip[bone.name]].matrix) @ \
                source_rest[bone.name].inverted()
            posed[bone.name] = to_armature @ turn @ target_rest[bone.name]
            basis = inherited.inverted() @ posed[bone.name]
            pose = target.pose.bones[bone.name]
            pose.rotation_mode = 'QUATERNION'
            pose.rotation_quaternion = basis
            pose.keyframe_insert('rotation_quaternion', frame=frame, group=bone.name)
        travel = (sw @ source.pose.bones[clip[root.name]].matrix).translation - source_root
        head = tw.inverted() @ (target_root + travel * scale)
        pose = target.pose.bones[root.name]
        pose.location = root.matrix_local.inverted() @ head
        pose.keyframe_insert('location', frame=frame, group=root.name)
    target.animation_data.action = None
    return action, root.name


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
    peaks = [i for i in range(len(reach))
             if reach[i] > middle and reach[i] >= reach[i - 1] and reach[i] > reach[(i + 1) % len(reach)]]
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
    names, align = bone_map(args.bones)
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
        named[name], root = retarget(clip_rig, rig, name, frames, names, align)
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
        facts[name] = {'seconds': round((frames[-1] - frames[0]) / fps, 3),
                       'groundSpeed': round(ground_speed(rig, named[name], frames, fps, root, follows), 3)}
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
    args = parser.parse_args(argv)
    code = {'report': report, 'sheet': sheet_models, 'normalize': normalize, 'clips': clips}[args.command](args)
    sys.exit(code)


if __name__ == '__main__':
    main()
