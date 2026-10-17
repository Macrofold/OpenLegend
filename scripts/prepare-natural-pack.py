"""Prepare Pablo Lizardo/Jarrhead's CC-BY 3.0 Sintel travelling pack.

Run offline in Blender with auto-execution disabled; the source has an embedded
character UI script that is unnecessary for this static prop and must not run.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import sys

import bpy

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset
spec = importlib.util.spec_from_file_location('natural', ROOT/'scripts/prepare-natural-replacements.py')
natural = importlib.util.module_from_spec(spec)
spec.loader.exec_module(natural)


def prepare(sources):
    group = 'source-natural-travel-pack'
    output = ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True, exist_ok=True)
    assets, controls, stages = [], [], []
    for variant in natural.FINISHES:
        bpy.ops.wm.open_mainfile(filepath=str(sources/'sintel_backpack.blend'), load_ui=False, use_scripts=False)
        if bpy.context.object and bpy.context.object.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        objects = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.visible_get() and not o.hide_render]
        for obj in objects:
            world = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = world
        for obj in list(bpy.data.objects):
            if obj not in objects:
                bpy.data.objects.remove(obj, do_unlink=True)
        converted, surfaces = {}, {}
        for old in {m for o in objects for m in o.data.materials if m}:
            file = ('quilt' if 'quilt' in old.name else 'backpack')+'&accessories_C.jpeg'
            if file in surfaces:
                converted[old] = surfaces[file]
                continue
            material = bpy.data.materials.new(old.name+' export')
            material.use_nodes = True
            shader = material.node_tree.nodes.get('Principled BSDF')
            node = material.node_tree.nodes.new('ShaderNodeTexImage')
            node.image = bpy.data.images.load(str(sources/file), check_existing=True)
            node.image.pack()
            uv = material.node_tree.nodes.new('ShaderNodeUVMap')
            uv.uv_map = 'UVMap'
            material.node_tree.links.new(uv.outputs['UV'], node.inputs['Vector'])
            material.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])
            shader.inputs['Roughness'].default_value = .9
            shader.inputs['Specular IOR Level'].default_value = .08
            converted[old] = material
            surfaces[file] = material
        for obj in objects:
            for slot in obj.material_slots:
                if slot.material:
                    slot.material = converted[slot.material]
            while len(obj.data.uv_layers) > 1:
                obj.data.uv_layers.remove(obj.data.uv_layers[-1])
            if obj.data.uv_layers:
                obj.data.uv_layers[0].name = 'UVMap'
                obj.data.uv_layers.active_index = 0
                obj.data.uv_layers[0].active_render = True
            for modifier in list(obj.modifiers):
                if modifier.type == 'MESH_DEFORM':
                    obj.modifiers.remove(modifier)
                elif modifier.type == 'SUBSURF':
                    modifier.levels = modifier.render_levels = 1
            for face in obj.data.polygons:
                face.use_smooth = True
        natural.finish_materials(objects, variant, 'travel-pack')
        if variant != 'source':
            # Tiny thread geometry costs far more than its screen coverage.
            # Keep the source seams in albedo and retain substantial cords.
            for obj in objects[:]:
                if obj.name.startswith('stitches_'):
                    objects.remove(obj)
                    bpy.data.objects.remove(obj, do_unlink=True)
            for obj in objects:
                bpy.context.view_layer.objects.active = obj
                obj.hide_set(False)
                for modifier in list(obj.modifiers):
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
                obj.data.calc_loop_triangles()
                total = len(obj.data.loop_triangles)
                if total > 2000:
                    modifier = obj.modifiers.new('Bound fine cord and cloth geometry', 'DECIMATE')
                    modifier.ratio = 2000/total
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
        natural.source_study.normalize(objects, .48)
        identity = 'natural-travel-pack-'+variant
        asset, _ = export_asset(objects, output, identity, 'natural-travel-pack', 'Leather pack and bedroll', variant,
            'Source leather sack, straps, cords and rolled quilt; '+variant+' finish.', variant == 'quiet',
            'Pablo Lizardo (model) and Jarrhead (texture), CC BY 3.0, https://creativecommons.org/licenses/by/3.0/; '
            'https://blendswap.com/blend/2138. Materials, scale and geometry budget adapted by OpenLegend.')
        stage = sources/(identity+'.blend')
        bpy.ops.wm.save_as_mainfile(filepath=str(stage), compress=True)
        stages.append(stage)
        (controls if variant == 'source' else assets).append(asset)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for index, stage in enumerate(stages):
        with bpy.data.libraries.load(str(stage), link=False) as (original, loaded):
            loaded.objects = original.objects
        for obj in loaded.objects:
            bpy.context.collection.objects.link(obj)
            if obj.parent is None:
                obj.location.x += index*2
    record = json.loads((sources/'download.json').read_text())
    natural.source_study.retain(group, assets, [{**record, 'license':'CC BY 3.0', 'creator':'Pablo Lizardo and Jarrhead'}], recipe=__file__)
    catalog_path = output/'catalog.json'
    catalog = json.loads(catalog_path.read_text())
    catalog['controls'] = controls
    catalog['helpers']['prepare-natural-replacements.py'] = natural.digest(ROOT/'scripts/prepare-natural-replacements.py')
    editable = ROOT/catalog['sourceFile']
    bpy.ops.wm.save_as_mainfile(filepath=str(editable), compress=True)
    catalog['sourceSha256'] = natural.digest(editable)
    catalog_path.write_text(json.dumps(catalog, indent=2)+'\n')
    natural.finish_catalog(catalog_path)
    retained = ROOT/'art-direction/assets/source-study/sintel-pack-originals'
    retained.mkdir(exist_ok=True)
    for file in ['original.zip', 'download.json', 'BLENDSWAP_LICENSE.txt']:
        shutil.copyfile(sources/file, retained/file)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    prepare(args.sources)
