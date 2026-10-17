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
    for material in {m for o in objects for m in o.data.materials if m}:
        name = material.name.lower().split('.')[0]
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        for node in list(material.node_tree.nodes):
            if node.type not in ('BSDF_PRINCIPLED', 'OUTPUT_MATERIAL'):
                material.node_tree.nodes.remove(node)
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


def simplify_tree(objects, family):
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
        if number % 16:
            remove.extend(component)
        else:
            center = sum((v.co for v in component), Vector())/len(component)
            for vertex in component:
                vertex.co = center+(vertex.co-center)*2.4
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


def foliage_normals(objects, family):
    if family not in ('broadleaf', 'birch', 'shrub', 'berry-bush', 'grass', 'reeds', 'dry-fiber'):
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
        bpy.ops.wm.read_factory_settings(use_empty=True)
        objects = import_static(sources, family, subject, selector)
        if variant != 'source' and family in ('broadleaf', 'birch'):
            simplify_tree(objects, family)
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
        fruit = resources.berries(objects, FINISHES.index(variant)-1) if family == 'berry-bush' and variant != 'source' else []
        source = ('yd, CC0, https://opengameart.org/content/archery-set' if subject == 'archery' else 'Poly Haven, CC0, https://polyhaven.com/a/'+subject)
        description = ('Normalized original geometry and albedo; source control.' if variant == 'source' else
            {'clear':'Retained natural form and readable source color, restrained highlights.',
             'quiet':'Grouped, muted woodland color with restrained fine texture.',
             'weathered':'Worn, lower-saturation material variation on the same natural form.'}[variant])
        if family == 'birch':
            description += ' Authored slender, pale-barked adaptation of a broadleaf source; not a scanned birch.'
        if family == 'reeds':
            description += ' Tall grass source used for the existing riverside fiber clump.'
        identity = 'natural-'+family+'-'+variant
        asset, root = export_asset(objects+fruit, output, identity, 'natural-'+family, label, variant, description,
            variant == ('quiet' if family in ('broadleaf', 'birch', 'shrub', 'grass') else 'clear'), source)
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
    else:
        records = [entry for entry in json.loads((sources/'download-manifest.json').read_text()) if entry['asset'] == subject]
        for record in records:
            assert digest(sources/subject/record['file']) == record['sha256']
    source_study.retain(group, assets, [{'url':source.split(' ')[-1], 'license':'CC0', 'files':records}], recipe=__file__)
    catalog_path = output/'catalog.json'
    catalog = json.loads(catalog_path.read_text())
    catalog['controls'] = controls
    # Compression changes the saved source hash, so record the actual final file.
    editable = ROOT/catalog['sourceFile']
    bpy.ops.wm.save_as_mainfile(filepath=str(editable), compress=True)
    catalog['sourceSha256'] = digest(editable)
    catalog_path.write_text(json.dumps(catalog, indent=2)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, required=True)
    parser.add_argument('--subjects', nargs='+', choices=SUBJECTS, default=list(SUBJECTS))
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    for family in args.subjects:
        prepare_static(args.sources, family)
