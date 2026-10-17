"""Retain CDmir/TinyWorlds' CC0 deer anatomy and clips in three pixel finishes.

Run offline in Blender with source auto-execution disabled. The old Quaternius
comparisons remain available. Current animal presentation heights stay unchanged.
"""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import shutil
import sys

import bpy

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, unique_skin_names
spec = importlib.util.spec_from_file_location('natural', ROOT/'scripts/prepare-natural-replacements.py')
natural = importlib.util.module_from_spec(spec)
spec.loader.exec_module(natural)


def walking_action(rig):
    """Author a four-beat walk through the source rig's planted-foot controls.

    Its supplied Run is a leaping bound, unsuitable for ordinary world travel.
    Keep source anatomy/weights and idle; bake this finite gait at export time.
    """
    scene = bpy.context.scene
    original_action = rig.animation_data.action
    scene.frame_set(0)
    basis = {b.name: b.matrix_basis.copy() for b in rig.pose.bones}
    matrices = {b.name: b.matrix.copy() for b in rig.pose.bones}
    feet = [('Backleg_L', 0), ('Frontleg_L', .25),
            ('Backleg_R', .5), ('Frontleg_R', .75)]
    controls = {}
    for leg, phase in feet:
        ankle = rig.pose.bones[leg+'.001']
        control = next(c.subtarget for c in ankle.constraints if c.type == 'IK')
        controls[leg] = control
        # One source controller extends below the reachable ankle. Start from
        # the evaluated ankle, not that unreachable target, to avoid snapping.
        matrices[control].translation = ankle.tail
    action = bpy.data.actions.new('Woodland four-beat walk')
    rig.animation_data.action = action
    duration = round(scene.render.fps * 1.4)
    for frame in range(duration+1):
        scene.frame_set(frame)
        for bone in rig.pose.bones:
            bone.rotation_mode = 'QUATERNION'
            bone.matrix_basis = basis[bone.name]
        for name in ('IK-Hip', 'IK-Backbone', 'IK-Head'):
            pose = matrices[name].copy()
            pose.translation.z += -.08 + .018*math.cos(frame/duration*math.tau*2)
            rig.pose.bones[name].matrix = pose
        for leg, phase in feet:
            t = (frame/duration + phase) % 1
            stance = .66
            if t < stance:
                travel, lift = t/stance-.5, 0
            else:
                swing = (t-stance)/(1-stance)
                travel = .5-(3*swing*swing-2*swing*swing*swing)
                lift = math.sin(math.pi*swing)**2
            pose = matrices[controls[leg]].copy()
            pose.translation.y += travel*.88
            pose.translation.z += lift*.25
            rig.pose.bones[controls[leg]].matrix = pose
        bpy.context.view_layer.update()
        for leg, _ in feet:
            toe = rig.pose.bones[leg+'.002']
            pose = matrices[toe.name].copy()
            pose.translation = toe.head
            toe.matrix = pose
        for bone in rig.pose.bones:
            for channel in ('location', 'rotation_quaternion', 'scale'):
                bone.keyframe_insert(channel, frame=frame, group=bone.name)
    # Idle does not key every controller. Restore the source baseline so the
    # authored walk cannot leak its final foot/body offsets into that clip.
    rig.animation_data.action = original_action
    for bone in rig.pose.bones:
        bone.matrix_basis = basis[bone.name]
    scene.frame_set(0)
    return action


def prepare(sources, species):
    source = sources/(species+'-source.blend')
    family = 'woodland-'+('doe' if species == 'deer' else 'stag')
    group = 'source-'+family
    output = ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True, exist_ok=True)
    height = 1.45 if species == 'deer' else 1.95
    assets, controls, stages = [], [], []
    url = 'https://opengameart.org/content/'+('deer-female' if species == 'deer' else 'old-deer-male')
    for variant in natural.FINISHES:
        bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
        if bpy.context.object and bpy.context.object.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        rig = bpy.data.objects['Armature']
        objects = [o for o in bpy.data.objects if o == rig or o.type == 'MESH' and o.parent == rig]
        for obj in list(bpy.data.objects):
            if obj not in objects:
                bpy.data.objects.remove(obj, do_unlink=True)
        rig.animation_data_create()
        for track in list(rig.animation_data.nla_tracks):
            rig.animation_data.nla_tracks.remove(track)
        idle = bpy.data.actions['Idle.000']
        rig.animation_data.action = idle
        bpy.context.scene.frame_set(0)
        run = walking_action(rig)
        rig.animation_data.action = idle
        bpy.context.scene.frame_set(0)
        meshes = [o for o in objects if o.type == 'MESH']
        unique_skin_names(objects, rig)
        natural.legacy_materials(meshes, species)
        natural.finish_materials(meshes, variant, species)
        natural.limit_skin_weights(meshes)
        for obj in meshes:
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
        natural.source_study.normalize(objects, height)
        identity = family+'-'+variant
        attribution = 'Deer by CDmir / TinyWorlds, CC0, '+url+'; source skin and idle retained; four-beat walk, materials and export naming adapted by OpenLegend.'
        asset, root = export_asset(objects, output, identity, family, 'Woodland doe · corrected rig' if species == 'deer' else 'Woodland stag · corrected rig', variant,
            'Source anatomy and eyes, '+('original albedo control.' if variant == 'source' else variant+' coat finish with fixed-density pixel rendering.'), variant == 'quiet', attribution)
        if variant != 'source':
            rig.animation_data.action = None
            for name, action in [('Idle', idle), ('Run', run)]:
                track = rig.animation_data.nla_tracks.new()
                track.name = name
                strip = track.strips.new(name, 0, action)
                strip.name = name
                strip.action_frame_start = action.frame_range[0]
                strip.action_frame_end = action.frame_range[1]
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
            asset['animatedFile'] = motion.name
            asset['animatedSha256'] = natural.digest(motion)
            # Restore an evaluable neutral pose in the editable comparison.
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
    natural.source_study.retain(group, assets, [{'url':url, 'creator':'CDmir / TinyWorlds', 'license':'CC0', 'file':source.name, 'sha256':natural.digest(source)}], recipe=__file__)
    catalog_path = output/'catalog.json'
    catalog = json.loads(catalog_path.read_text())
    catalog['controls'] = controls
    catalog['helpers']['prepare-natural-replacements.py'] = natural.digest(ROOT/'scripts/prepare-natural-replacements.py')
    editable = ROOT/catalog['sourceFile']
    bpy.ops.wm.save_as_mainfile(filepath=str(editable), compress=True)
    catalog['sourceSha256'] = natural.digest(editable)
    catalog_path.write_text(json.dumps(catalog, indent=2)+'\n')
    natural.finish_catalog(catalog_path)
    # Retain the precise licensed input, rather than only its download link.
    retained = ROOT/'art-direction/assets/source-study'/('cdmir-'+species+'-source.blend')
    shutil.copyfile(source, retained)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    for species in ['deer', 'stag']:
        prepare(args.sources, species)
