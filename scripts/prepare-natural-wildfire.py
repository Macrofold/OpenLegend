"""Adapt Wildfire Games' CC BY-SA 3.0 wolf and travelling pack, offline.

First run with Blender 4.2 and --convert-collada (the last supported Collada
importer), then with current Blender without that flag. Exact inputs, license
and commit are retained beside the editable derivatives. Never execute sources.
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

INPUTS = {
    'wolf': 'meshes/skeletal/wolf.dae',
    'wolf-idle': 'animation/quadraped/wolf_idle_01.dae',
    'wolf-run': 'animation/quadraped/wolf_run.dae',
    'backpack': 'meshes/props/m_backpack.dae',
}
ATTRIBUTION = ('Wildfire Games, https://wildfiregames.com/, CC BY-SA 3.0, '
    'https://creativecommons.org/licenses/by-sa/3.0/; source geometry and wolf '
    'motion retained, materials and silhouette smoothing adapted by OpenLegend. '
    'These derivative assets remain CC BY-SA 3.0.')


def convert(sources):
    for name, file in INPUTS.items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.wm.collada_import(filepath=str(sources/file))
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(sources/(name+'-converted.blend')), compress=True)


def prepare(sources, family):
    group = 'source-natural-'+family
    output = ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True, exist_ok=True)
    assets, controls, stages = [], [], []
    wolf = family == 'wolf'
    for variant in natural.FINISHES:
        bpy.ops.wm.open_mainfile(filepath=str(sources/(('wolf-idle' if wolf else family)+'-converted.blend')), load_ui=False, use_scripts=False)
        objects = [o for o in bpy.context.scene.objects if o.type in ('MESH', 'ARMATURE')]
        meshes = [o for o in objects if o.type == 'MESH']
        if wolf:
            rig = next(o for o in objects if o.type == 'ARMATURE')
            idle = rig.animation_data.action
            idle.name = 'Idle'
            with bpy.data.libraries.load(str(sources/'wolf-run-converted.blend'), link=False) as (original, loaded):
                loaded.actions = original.actions
            run = loaded.actions[0]
            run.name = 'Run'
            bpy.context.scene.frame_set(0)
            # One subdivision rounds shoulders and flanks while keeping the
            # source anatomy, facial artwork and weight-painted source rig.
            if variant != 'source':
                for obj in meshes:
                    modifier = obj.modifiers.new('Round source silhouette', 'SUBSURF')
                    modifier.levels = modifier.render_levels = 1
                    bpy.context.view_layer.objects.active = obj
                    bpy.ops.object.modifier_move_up(modifier=modifier.name)
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
        texture = ('textures/skins/skeletal/animal_wolf'+
            ('_grey' if variant in ('quiet', 'source') else '_white' if variant == 'weathered' else '')+'.png') if wolf else 'textures/skins/props/backpack_trader_celt.dds'
        material = bpy.data.materials.new(f'natural {family} {variant}')
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        node = material.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = bpy.data.images.load(str(sources/texture), check_existing=True)
        node.image.pack()
        material.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])
        shader.inputs['Roughness'].default_value = .9
        shader.inputs['Specular IOR Level'].default_value = .08
        for obj in meshes:
            obj.data.materials.clear()
            obj.data.materials.append(material)
            for face in obj.data.polygons:
                face.use_smooth = variant != 'source'
        natural.finish_materials(meshes, variant, family)
        if wolf:
            natural.limit_skin_weights(meshes)
        natural.source_study.normalize(objects, .96 if wolf else .48)
        identity = 'natural-'+family+'-'+variant
        asset, root = export_asset(objects, output, identity, 'natural-'+family,
            'Woodland wolf' if wolf else 'Rejected box-shaped pack', variant,
            ('Source control.' if variant == 'source' else
             'Source anatomy, facial coat markings and motion; rounded silhouette, '+variant+' coat.' if wolf else
             'Source leather and woven cargo pack, '+variant+' material finish.'),
            wolf and variant == 'quiet', ATTRIBUTION)
        if wolf and variant != 'source':
            rig.animation_data.action = None
            for name, action in [('Idle', idle), ('Run', run)]:
                track = rig.animation_data.nla_tracks.new()
                track.name = name
                strip = track.strips.new(name, 0, action)
                strip.name = name
                strip.action_frame_start, strip.action_frame_end = action.frame_range
                strip.frame_start = 0
                strip.frame_end = action.frame_range[1]-action.frame_range[0]
                track.mute = True
            bpy.ops.object.select_all(action='DESELECT')
            for obj in [*objects, root]:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = rig
            motion = output/(identity+'-motion.glb')
            bpy.ops.export_scene.gltf(filepath=str(motion), export_format='GLB', use_selection=True,
                export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                export_anim_slide_to_zero=True, export_yup=True, export_skins=True,
                export_def_bones=True, export_extras=True)
            asset['animatedFile'], asset['animatedSha256'] = motion.name, natural.digest(motion)
            rig.animation_data.action = idle
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
                obj.location.x += index*3
    manifest = json.loads((sources/'manifest.json').read_text())
    natural.source_study.retain(group, assets, [{**manifest, 'license':'CC BY-SA 3.0', 'creator':'Wildfire Games'}], recipe=__file__)
    catalog_path = output/'catalog.json'
    catalog = json.loads(catalog_path.read_text())
    catalog['controls'] = controls
    catalog['helpers']['prepare-natural-replacements.py'] = natural.digest(ROOT/'scripts/prepare-natural-replacements.py')
    editable = ROOT/catalog['sourceFile']
    bpy.ops.wm.save_as_mainfile(filepath=str(editable), compress=True)
    catalog['sourceSha256'] = natural.digest(editable)
    catalog_path.write_text(json.dumps(catalog, indent=2)+'\n')
    natural.finish_catalog(catalog_path)
    retained = ROOT/'art-direction/assets/source-study/wildfire-originals'
    for file in ['manifest.json', *[entry['file'] for entry in manifest['files']]]:
        destination = retained/file
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(sources/file, destination)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, required=True)
    parser.add_argument('--convert-collada', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    if args.convert_collada:
        convert(args.sources)
    else:
        for family in ['wolf', 'backpack']:
            prepare(args.sources, family)
