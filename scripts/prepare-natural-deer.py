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
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import external_output, ROOT, WORKSPACE, workspace_path, export_asset, unique_skin_names
spec = importlib.util.spec_from_file_location('natural', ROOT/'scripts/prepare-natural-replacements.py')
natural = importlib.util.module_from_spec(spec)
spec.loader.exec_module(natural)


def grounded_actions(rig, source_idle):
    """Bake the source idle and a rigid, sagittal-plane four-beat walk.

    The old foot-control pass left conflicting one-/two-bone IK constraints
    with inconsistent pole settings active. It also reversed the footfall order.
    Solve each two-segment leg offline with a fixed bend side and bone lengths;
    keep the original idle's evaluated poses before removing those constraints.
    """
    scene = bpy.context.scene
    rig.animation_data.action = source_idle
    idle_poses = []
    for frame in range(round(source_idle.frame_range[0]), round(source_idle.frame_range[1])+1):
        scene.frame_set(frame)
        idle_poses.append({b.name: b.matrix.copy() for b in rig.pose.bones})
    scene.frame_set(0)
    base = {b.name: b.matrix.copy() for b in rig.pose.bones}
    joints = {b.name: (b.head.copy(), b.tail.copy()) for b in rig.pose.bones}
    for bone in rig.pose.bones:
        for constraint in list(bone.constraints):
            bone.constraints.remove(constraint)

    def bake(name, poses):
        action = bpy.data.actions.new(name)
        rig.animation_data.action = action
        for frame, pose in enumerate(poses):
            scene.frame_set(frame)
            for bone in rig.pose.bones:
                parent = bone.parent
                bone.rotation_mode = 'QUATERNION'
                bone.matrix_basis = bone.bone.convert_local_to_pose(
                    pose[bone.name], bone.bone.matrix_local,
                    parent_matrix=pose[parent.name] if parent else Matrix.Identity(4),
                    parent_matrix_local=parent.bone.matrix_local if parent else Matrix.Identity(4),
                    invert=True)
                for channel in ('location', 'rotation_quaternion', 'scale'):
                    bone.keyframe_insert(channel, frame=frame, group=bone.name)
        return action

    idle = bake('Idle', idle_poses)
    feet = [('Backleg_L', 0), ('Frontleg_L', .25),
            ('Backleg_R', .5), ('Frontleg_R', .75)]
    duration = round(scene.render.fps * 1.4)
    poses = []
    for frame in range(duration+1):
        pose = {name: matrix.copy() for name, matrix in base.items()}
        body_offset = Vector((0, 0, -.06 + .008*math.cos(frame/duration*math.tau*2)))
        for matrix in pose.values():
            matrix.translation += body_offset
        for leg, phase in feet:
            # Positive phase is a later touchdown: hind, same-side fore,
            # opposite hind, opposite fore. Feet sweep rearward in stance.
            t = (frame/duration - phase) % 1
            stance = .72
            if t < stance:
                travel, lift = t/stance-.5, 0
            else:
                swing = (t-stance)/(1-stance)
                # Match the planted foot's velocity at lift-off/touchdown;
                # zero-velocity easing made every step hesitate at contact.
                slope = (1-stance)/stance
                travel = .5+slope*swing-(3+3*slope)*swing**2+(2+2*slope)*swing**3
                lift = math.sin(math.pi*swing)**2
            root = joints[leg][0]+body_offset
            ankle = joints[leg+'.002'][0]+Vector((0, travel, lift*.32))
            upper = (joints[leg][1]-joints[leg][0]).length
            lower = (joints[leg+'.001'][1]-joints[leg+'.001'][0]).length
            axis = ankle-root
            distance = axis.length
            if not abs(upper-lower) < distance < upper+lower:
                raise ValueError(f'Unreachable {leg} at walk frame {frame}')
            axis.normalize()
            along = (upper*upper-lower*lower+distance*distance)/(2*distance)
            # Carpi fold forward; hind hocks fold rearward. The thin lower
            # segments must not all bend like four copies of a hind leg.
            bend = Vector((0, -1 if leg.startswith('Front') else 1, 0))
            bend = (bend-axis*bend.dot(axis)).normalized()
            middle = root+axis*along+bend*math.sqrt(max(0, upper*upper-along*along))
            for name, start, end in [(leg, root, middle), (leg+'.001', middle, ankle)]:
                original = joints[name][1]-joints[name][0]
                rotation = original.rotation_difference(end-start) @ base[name].to_quaternion()
                pose[name] = Matrix.LocRotScale(start, rotation, base[name].to_scale())
            # Hooves keep their source shape/orientation instead of curling
            # under themselves; their ankle joint carries the swing clearance.
            pose[leg+'.002'].translation = ankle
        poses.append(pose)
    walk = bake('Run', poses)
    rig.animation_data.action = idle
    scene.frame_set(0)
    return idle, walk


def prepare(sources, species):
    sources = external_output(sources)
    source = sources/(species+'-source.blend')
    family = 'woodland-'+('doe' if species == 'deer' else 'stag')
    group = 'source-'+family
    output = external_output(WORKSPACE/'apps/client/src/props/art-study'/group)
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
        idle, run = grounded_actions(rig, idle)
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
        attribution = 'Deer by CDmir / TinyWorlds, CC0, '+url+'; source skin and evaluated idle retained; rigid-leg four-beat walk, materials and export naming adapted by OpenLegend.'
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
    editable = workspace_path(catalog['sourceFile'])
    bpy.ops.wm.save_as_mainfile(filepath=str(editable), compress=True)
    catalog['sourceSha256'] = natural.digest(editable)
    catalog_path.write_text(json.dumps(catalog, indent=2)+'\n')
    natural.finish_catalog(catalog_path)
    # Retain the precise licensed input, rather than only its download link.
    retained = external_output(WORKSPACE/'art-direction/assets/source-study'/('cdmir-'+species+'-source.blend'))
    shutil.copyfile(source, retained)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    for species in ['deer', 'stag']:
        prepare(args.sources, species)
