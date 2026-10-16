"""Finite authored idle/walk poses for the retained anatomical study rig."""
import math
import bpy
from mathutils import Quaternion


def export_motion(objects, rig, root, path):
    base={bone.name:bone.rotation_quaternion.copy() for bone in rig.pose.bones}
    rest={bone.name:bone.bone.matrix_local.to_quaternion() for bone in rig.pose.bones}
    bpy.context.scene.render.fps=24
    rig.animation_data_create()
    for name,duration in [('Idle',48),('Run',24)]:
        action=bpy.data.actions.new(name)
        rig.animation_data.action=action
        for frame in range(1,duration+2,2):
            t=(frame-1)/duration*math.tau
            for bone in rig.pose.bones:
                bone.rotation_mode='QUATERNION'
                bone.rotation_quaternion=base[bone.name]
            def rotate(name,axis,angle):
                bone=rig.pose.bones[name]
                bone.rotation_quaternion=rest[name].inverted()@Quaternion(axis,angle)@rest[name]@base[name]
                bone.keyframe_insert('rotation_quaternion',frame=frame,group=name)
            for side,offset in [('L',0),('R',math.pi)]:
                s=math.sin(t+offset)
                if name=='Run':
                    rotate('upperleg01.'+side,(1,0,0),.32*s)
                    rotate('lowerleg01.'+side,(1,0,0),-.52*max(0,s))
                    rotate('foot.'+side,(1,0,0),.14*s)
                    rotate('upperarm01.'+side,(1,0,0),-.19*s)
                    rotate('lowerarm01.'+side,(1,0,0),-.12-.08*s)
                else:
                    rotate('upperarm01.'+side,(1,0,0),.015*s)
            rotate('spine03',(0,0,1),.025*math.sin(t) if name=='Run' else .008*math.sin(t))
            rotate('head',(0,0,1),-.012*math.sin(t))
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,1,action);strip.name=name
        track.mute=True
    rig.animation_data.action=None
    for bone in rig.pose.bones:bone.rotation_quaternion=base[bone.name]
    bpy.context.scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [*objects,root]:obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    # Keep skin weights, fitted garment masks and actual anatomical topology.
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_apply=True,export_animations=True,export_animation_mode='NLA_TRACKS',
        export_yup=True,export_skins=True,export_def_bones=True,export_force_sampling=True)
