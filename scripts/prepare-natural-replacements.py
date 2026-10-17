"""Prepare licensed natural forms for the finite pixel-art comparison, offline.

Use Blender --background --factory-startup --disable-autoexec --offline-mode.
Inputs are the recorded Poly Haven glTF downloads and OpenGameArt Blend files.
No world state, runtime pixel-density rules or paid service is changed here.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import shutil
import struct
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, solid_material


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'scripts'/file)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


source_study = module('source_study', 'prepare-source-study.py')
resources = module('resources', 'prepare-resource-study.py')
# Height/span are presentation envelopes, never collision or world authority.
SUBJECTS = {
    'broadleaf': ('tree_small_02', 'Woodland broadleaf', 5.1, 4.6, None),
    'birch': ('tree_small_02', 'Pale-barked woodland tree', 5.8, 3.5, None),
    'shrub': ('shrub_02', 'Woodland shrub', .9, 1.5, 'shrub_02_b'),
    'leafy-shrub': ('shrub_04', 'Leafy woodland shrub', .9, 1.5, None),
    'leafy-berries': ('shrub_04', 'Leafy berry thicket', 1.05, 1.4, None),
    'berry-bush': ('shrub_02', 'Berry thicket', 1.05, 1.4, 'shrub_02_a'),
    'grass': ('grass_medium_01', 'Meadow grass', .44, .6, 'grass_medium_01_mid_b_LOD0'),
    'reeds': ('grass_medium_01', 'Riverside stems', 1, .75, 'grass_medium_01_tall_a_LOD0'),
    'dry-fiber': ('grass_medium_01', 'Dry fiber stems', .42, .45, 'grass_medium_01_tall_c_LOD0'),
    'sword': ('antique_estoc', 'Forged estoc', 1.1, None, None),
    'shield': ('kite_shield', 'Timber kite shield', .84, None, None),
    'knife': ('fish_knife', 'Utility knife', .32, None, None),
    'bow': ('archery', 'Timber field bow', 1.25, None, 'bow'),
    'arrow': ('archery', 'Fletched arrow', .72, None, 'arrow'),
}
FINISHES = ['source', 'clear', 'quiet', 'weathered']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def finish_catalog(path):
    """Keep attribution with downloadable GLBs, including motion/depletion."""
    catalog = json.loads(path.read_text())
    for asset in [*catalog['assets'], *catalog.get('controls', [])]:
        folder = path.parent.parent/asset.get('fileGroup', path.parent.name)
        for field, hash_field in [('file', 'sha256'), ('animatedFile', 'animatedSha256'), ('depletedFile', 'depletedSha256')]:
            if field not in asset:
                continue
            file = folder/asset[field]
            raw = file.read_bytes()
            size = struct.unpack_from('<I', raw, 12)[0]
            document = json.loads(raw[20:20+size])
            document['asset']['copyright'] = asset['source']
            encoded = json.dumps(document, separators=(',', ':')).encode()
            encoded += b' '*(-len(encoded)%4)
            tail = raw[20+size:]
            file.write_bytes(struct.pack('<4sII', b'glTF', 2, 20+len(encoded)+len(tail))+
                struct.pack('<I4s', len(encoded), b'JSON')+encoded+tail)
            asset[hash_field] = digest(file)
    catalog['recipe']['sha256'] = digest(ROOT/catalog['recipe']['path'])
    for helper in catalog['helpers']:
        catalog['helpers'][helper] = digest(ROOT/'scripts'/helper)
    path.write_text(json.dumps(catalog, indent=2)+'\n')


def limit_skin_weights(objects):
    """Evaluate the same four-weight skin that the runtime glTF will render."""
    for obj in objects:
        for vertex in obj.data.vertices:
            weights = sorted(((g.group, g.weight) for g in vertex.groups if g.weight > 0), key=lambda p:p[1], reverse=True)
            if len(weights) <= 4:
                continue
            total = sum(weight for _, weight in weights[:4])
            for group_index, _ in weights:
                obj.vertex_groups[group_index].remove([vertex.index])
            for group_index, weight in weights[:4]:
                obj.vertex_groups[group_index].add([vertex.index], weight/total, 'REPLACE')


def finish_materials(objects, variant, family):
    """Retain source UV/color distinctions and alpha; remove fine PBR noise."""
    images = {}
    for material in {m for o in objects if o.type == 'MESH' for m in o.data.materials if m}:
        if not material.use_nodes:
            continue
        shader = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not shader:
            continue
        if variant != 'source':
            for socket in ('Normal', 'Roughness', 'Metallic'):
                for link in list(shader.inputs[socket].links):
                    material.node_tree.links.remove(link)
            shader.inputs['Roughness'].default_value = .9
            shader.inputs['Metallic'].default_value = .12 if family in ('sword', 'knife') else 0
            shader.inputs['Specular IOR Level'].default_value = .08
        for node in list(material.node_tree.nodes):
            if node.type != 'TEX_IMAGE' or not node.image:
                continue
            color = any(link.to_socket == shader.inputs['Base Color'] for link in node.outputs['Color'].links)
            if variant == 'source' or not color:
                continue
            original = node.image
            if original not in images:
                image = original.copy()
                image.name = family + '-' + variant + '-paint'
                limit = 512 if variant == 'clear' else 256
                ratio = min(1, limit/max(image.size))
                image.scale(max(1, round(image.size[0]*ratio)), max(1, round(image.size[1]*ratio)))
                rgba = np.array(image.pixels[:], dtype=np.float32).reshape(-1, 4)
                rgb = rgba[:, :3]
                value = rgb @ np.array([.2126, .7152, .0722])
                saturation = .88 if variant == 'clear' else .75 if variant == 'quiet' else .62
                rgb[:] = value[:, None] + (rgb-value[:, None])*saturation
                if family in ('leafy-shrub', 'leafy-berries'):
                    # The source atlas photographs yellow leaves beside brown
                    # stems. Retain that variation, but choose living woodland
                    # greens rather than carrying its pale studio color through.
                    leaves = rgb[:, 1] > rgb[:, 0]*.92
                    rgb[leaves] *= np.array([.68, .88, .66])
                if family == 'dry-fiber':
                    rgb[:] = value[:, None]*np.array([1.12, 1.0, .70])
                if variant == 'weathered':
                    rgb[:] = rgb*.93 + np.array([.025, .023, .018])
                if variant != 'clear':
                    rgb[:] = np.round(rgb*31)/31
                rgba[:, :3] = np.clip(rgb, 0, 1)
                image.pixels.foreach_set(rgba.ravel())
                image.pack()
                images[original] = image
            node.image = images[original]
            node.interpolation = 'Linear'
        if variant != 'source':
            for node in list(material.node_tree.nodes):
                if node.type == 'TEX_IMAGE' and not any(link.to_node == shader and link.to_socket.name in ('Base Color', 'Alpha') for socket in node.outputs for link in socket.links):
                    material.node_tree.nodes.remove(node)


def legacy_materials(objects, family):
    """Convert packed pre-Principled albedo to current exportable materials."""
    for obj in objects:
        # These legacy files include painting-projection UVs. The actual skin
        # and albedo use UVMap; exporting the active projection scrambles faces.
        while len(obj.data.uv_layers) > 1:
            obj.data.uv_layers.remove(obj.data.uv_layers[-1])
        if obj.data.uv_layers:
            obj.data.uv_layers.active_index = 0
    converted = {}
    for original in {m for o in objects for m in o.data.materials if m}:
        name = original.name.lower().split('.')[0]
        # Fresh Principled graphs avoid old render-engine-specific output
        # nodes. Keeping a legacy output silently exported untextured glTF.
        material = bpy.data.materials.new(f'{family} {name} albedo')
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        image_name = 'bow01D' if family in ('bow', 'arrow') else (
            'doe-'+name if family == 'deer' and name in ('body', 'head') else
            'deer-antlers.png' if name == 'antlers' else name)
        image = next((image for image in bpy.data.images if image.name.split('.')[0].lower() == image_name.split('.')[0].lower()), None)
        shader.inputs['Roughness'].default_value = .9
        shader.inputs['Specular IOR Level'].default_value = .08
        shader.inputs['Base Color'].default_value = (.015, .012, .01, 1) if name == 'eye' else (1, 1, 1, 1)
        if image and name != 'eye':
            node = material.node_tree.nodes.new('ShaderNodeTexImage')
            node.image = image
            material.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])
        elif name != 'eye':
            raise ValueError(f'Missing packed albedo for {family} {name}')
        converted[original] = material
    for obj in objects:
        for slot in obj.material_slots:
            slot.material = converted[slot.material]


def tree_uvs(objects):
    # The source uses a second UV set only on branches. Consolidating per face
    # preserves all three source materials while avoiding unused per-leaf UVs.
    # This also keeps the exact geometry control below the repository file cap.
    for obj in objects:
        if obj.type != 'MESH' or len(obj.data.uv_layers) != 2:
            continue
        first, second = obj.data.uv_layers
        for polygon in obj.data.polygons:
            if 'branches' in obj.data.materials[polygon.material_index].name:
                for loop in polygon.loop_indices:
                    first.data[loop].uv = second.data[loop].uv
        obj.data.uv_layers.remove(second)
        for material in obj.data.materials:
            for node in material.node_tree.nodes:
                if node.type == 'UVMAP':
                    node.uv_map = first.name


def simplify_tree(objects, family, variant):
    """Retain whole source leaves, then simplify each material separately.

    Uniform decimation of the full crown erases foliage before bark. Select a
    fixed subset of leaf components and widen them to produce readable groups.
    """
    obj = next(o for o in objects if o.type == 'MESH')
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    leaf_slots = {i for i, m in enumerate(obj.data.materials) if 'leaves' in m.name}
    remaining = set(mesh.verts)
    remove = []
    number = 0
    for start in mesh.verts:
        if start not in remaining:
            continue
        stack = [start]
        remaining.remove(start)
        component = []
        while stack:
            vertex = stack.pop()
            component.append(vertex)
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in remaining:
                    remaining.remove(other)
                    stack.append(other)
        if any(face.material_index not in leaf_slots for vertex in component for face in vertex.link_faces):
            continue
        number += 1
        if number % {'clear':6, 'quiet':8, 'weathered':16}[variant]:
            remove.extend(component)
        else:
            center = sum((v.co for v in component), Vector())/len(component)
            for vertex in component:
                vertex.co = center+(vertex.co-center)*(2.2 if variant == 'clear' else 2.4)
    bmesh.ops.delete(mesh, geom=remove, context='VERTS')
    bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=.00001)
    mesh.to_mesh(obj.data)
    mesh.free()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='MATERIAL')
    bpy.ops.object.mode_set(mode='OBJECT')
    objects[:] = list(bpy.context.selected_objects)
    for obj in objects:
        foliage = all('leaves' in obj.data.materials[p.material_index].name for p in obj.data.polygons)
        obj.data.calc_loop_triangles()
        target = 20000 if foliage else 4000
        total = len(obj.data.loop_triangles)
        if total > target:
            modifier = obj.modifiers.new('Finite woodland geometry budget', 'DECIMATE')
            modifier.ratio = target/total
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        if family == 'birch':
            obj.scale.x *= .73
            obj.scale.y *= .73
    bpy.context.view_layer.update()


def arrange_leafy_shrub(objects, variant):
    # shrub_04 contains four specimens laid out for an asset sheet. Keep whole
    # connected pieces from its mature right-hand plant, then compose real
    # source stems around one foot instead of importing the demonstration row.
    obj = objects[0]
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    remaining = set(mesh.verts)
    remove = []
    for start in mesh.verts:
        if start not in remaining:
            continue
        stack = [start]; remaining.remove(start); component = []
        while stack:
            vertex = stack.pop(); component.append(vertex)
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in remaining:
                    remaining.remove(other); stack.append(other)
        if sum(v.co.x for v in component)/len(component) < -.08:
            remove.extend(component)
    bmesh.ops.delete(mesh, geom=remove, context='VERTS')
    mesh.to_mesh(obj.data); mesh.free()
    obj.data.calc_loop_triangles()
    if len(obj.data.loop_triangles) > 5000:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new('Retain leaf outlines within shrub budget', 'DECIMATE')
        modifier.ratio = 5000/len(obj.data.loop_triangles)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    count = {'clear':3, 'quiet':2, 'weathered':1}[variant]
    for index in range(1, count):
        branch = obj.copy(); branch.data = obj.data.copy()
        branch.rotation_euler.z += index*2.2
        branch.location.x += .012*index
        bpy.context.collection.objects.link(branch)
        objects.append(branch)
    bpy.context.view_layer.update()


def foliage_normals(objects, family):
    if family not in ('broadleaf', 'birch', 'shrub', 'berry-bush', 'leafy-shrub', 'leafy-berries', 'grass', 'reeds', 'dry-fiber'):
        return
    for obj in objects:
        if obj.type != 'MESH':
            continue
        mesh = obj.data
        normals = [n.vector.copy() for n in mesh.corner_normals]
        inverse = obj.matrix_world.to_3x3().transposed()
        for polygon in mesh.polygons:
            material = mesh.materials[polygon.material_index]
            if family in ('broadleaf', 'birch') and 'leaves' not in material.name:
                continue
            for loop in polygon.loop_indices:
                point = obj.matrix_world @ mesh.vertices[mesh.loops[loop].vertex_index].co
                normals[loop] = (inverse @ Vector((point.x*.2, point.y*.2, .9))).normalized()
        mesh.normals_split_custom_set(normals)


def import_static(sources, family, subject, selector):
    if subject == 'archery':
        with bpy.data.libraries.load(str(sources/'archery-source.blend'), link=False) as (_, loaded):
            loaded.objects = [selector]
            # Legacy Blender textures are not linked through current nodes, so
            # appending only the mesh omits this packed source albedo.
            loaded.images = ['bow01D']
        objects = loaded.objects
        for obj in objects:
            bpy.context.collection.objects.link(obj)
        legacy_materials(objects, family)
    else:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(sources/subject/(subject+'_1k.gltf')))
        objects = list(set(bpy.data.objects)-before)
        if selector:
            for obj in objects[:]:
                if obj.name != selector:
                    objects.remove(obj)
                    bpy.data.objects.remove(obj, do_unlink=True)
    return objects


def prepare_static(sources, family):
    subject, label, height, span, selector = SUBJECTS[family]
    group = 'source-natural-'+family
    output = ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True, exist_ok=True)
    assets, controls, stages = [], [], []
    # Independent scenes keep the original high-detail tree out of each edited
    # variant's memory/export. The retained catalog uses a packed staged blend.
    for variant in FINISHES:
        if family == 'birch' and variant == 'source':
            original = json.loads((output.parent/'source-natural-broadleaf/catalog.json').read_text())['controls'][0]
            controls.append({**original, 'id':'natural-birch-source', 'family':'natural-birch',
                'label':label, 'fileGroup':'source-natural-broadleaf'})
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        objects = import_static(sources, family, subject, selector)
        if family in ('leafy-shrub', 'leafy-berries') and variant != 'source':
            arrange_leafy_shrub(objects, variant)
        if family in ('broadleaf', 'birch'):
            tree_uvs(objects)
            if variant != 'source':
                simplify_tree(objects, family, variant)
                for obj in objects:
                    for material in obj.data.materials:
                        shader = material.node_tree.nodes.get('Principled BSDF')
                        for link in list(shader.inputs['Alpha'].links):
                            material.node_tree.links.remove(link)
                        shader.inputs['Alpha'].default_value = 1
                        # Leaves are actual geometry; the source's BLEND flag
                        # has no alpha artwork and introduces needless sorting.

        # Use evaluated source extents: archery objects can carry rotations
        # whose local dimensions disagree with their actual exported envelope.
        if family in ('sword', 'knife', 'arrow'):
            graph = bpy.context.evaluated_depsgraph_get()
            points = []
            for obj in objects:
                if obj.type != 'MESH':
                    continue
                evaluated = obj.evaluated_get(graph)
                mesh = evaluated.to_mesh()
                points.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
                evaluated.to_mesh_clear()
            extent = [max(p[a] for p in points)-min(p[a] for p in points) for a in range(3)]
            axis = max(range(3), key=lambda a: extent[a])
            if axis != 2:
                rotation = Matrix.Rotation(math.pi/2, 4, 'Y' if axis == 0 else 'X')
                for obj in objects:
                    if obj.parent not in objects:
                        obj.matrix_world = rotation @ obj.matrix_world
                bpy.context.view_layer.update()
        source_study.normalize(objects, height, span)
        finish_materials(objects, variant, family)
        if variant != 'source':
            foliage_normals(objects, family)
        if family == 'birch' and variant != 'source':
            for obj in objects:
                for material in obj.data.materials:
                    if 'leaves' in material.name:
                        continue
                    shader = material.node_tree.nodes.get('Principled BSDF')
                    # Keep source bark texture; use a restrained pale-bark tint.
                    for node in material.node_tree.nodes:
                        if node.type == 'TEX_IMAGE' and any(link.to_socket == shader.inputs['Base Color'] for link in node.outputs['Color'].links):
                            rgba = np.array(node.image.pixels[:], dtype=np.float32).reshape(-1, 4)
                            value = rgba[:, :3] @ np.array([.2126, .7152, .0722])
                            rgba[:, :3] = (.34+value[:, None]*.55)*np.array([1, 1.02, .96])
                            node.image.pixels.foreach_set(rgba.ravel())
                            node.image.pack()
        fruit = resources.berries(objects, FINISHES.index(variant)-1) if family in ('berry-bush', 'leafy-berries') and variant != 'source' else []
        source = ('yd, CC0, https://opengameart.org/content/archery-set' if subject == 'archery' else 'Poly Haven, CC0, https://polyhaven.com/a/'+subject)
        description = ('Normalized original geometry and albedo; source control.' if variant == 'source' else
            {'clear':'Retained natural form and readable source color, restrained highlights.',
             'quiet':'Grouped, muted woodland color with restrained fine texture.',
             'weathered':'Worn, lower-saturation material variation on the same natural form.'}[variant])
        if family in ('leafy-shrub', 'leafy-berries'):
            description += ' Retained mature source stems composed into one rooted clump; three, two or one stem sets.'
        if family in ('broadleaf', 'birch') and variant != 'source':
            description += ' Whole source leaves retained in full, open or sparse crown groupings.'
        if family == 'birch':
            description += ' Authored slender, pale-barked adaptation of a broadleaf source; not a scanned birch.'
        if family == 'reeds':
            description += ' Tall grass source used for the existing riverside fiber clump.'
        identity = 'natural-'+family+'-'+variant
        asset, root = export_asset(objects+fruit, output, identity, 'natural-'+family, label, variant, description,
            variant == ('quiet' if family in ('broadleaf', 'birch', 'shrub', 'leafy-shrub', 'grass') else 'clear'), source)
        if fruit:
            # A separate fruit-free export preserves the same woody/leaf geometry.
            depleted, _ = export_asset(objects, output, identity+'-depleted', 'natural-'+family, label, variant, description, False, source)
            asset['depletedFile'] = depleted['file']
            asset['depletedSha256'] = depleted['sha256']
        (controls if variant == 'source' else assets).append(asset)
        stage = sources/(identity+'.blend')
        bpy.ops.wm.save_as_mainfile(filepath=str(stage), compress=True)
        stages.append(stage)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for index, stage in enumerate(stages):
        with bpy.data.libraries.load(str(stage), link=False) as (original, loaded):
            loaded.objects = original.objects
        for obj in loaded.objects:
            if obj:
                bpy.context.collection.objects.link(obj)
                if obj.parent is None:
                    obj.location.x += index*max(2, span or 2)
    if subject == 'archery':
        records = [json.loads((sources/'archery-download.json').read_text())]
        shutil.copyfile(sources/'archery-source.blend', ROOT/'art-direction/assets/source-study/yd-archery-source.blend')
    else:
        records = [entry for entry in json.loads((sources/'download-manifest.json').read_text()) if entry['asset'] == subject]
        for record in records:
            assert digest(sources/subject/record['file']) == record['sha256']
    source_study.retain(group, assets, [{'url':source.split(' ')[-1], 'license':'CC0', 'files':records}], recipe=__file__)
    catalog_path = output/'catalog.json'
    catalog = json.loads(catalog_path.read_text())
    catalog['controls'] = controls
    catalog['helpers']['prepare-resource-study.py'] = digest(ROOT/'scripts/prepare-resource-study.py')
    # Compression changes the saved source hash, so record the actual final file.
    editable = ROOT/catalog['sourceFile']
    bpy.ops.wm.save_as_mainfile(filepath=str(editable), compress=True)
    catalog['sourceSha256'] = digest(editable)
    catalog_path.write_text(json.dumps(catalog, indent=2)+'\n')
    finish_catalog(catalog_path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, required=True)
    parser.add_argument('--subjects', nargs='+', choices=SUBJECTS, default=list(SUBJECTS))
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    for family in args.subjects:
        prepare_static(args.sources, family)
