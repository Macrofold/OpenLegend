"""Finite source-based animal comparisons; trusted offline Blender preparation.

Quaternius supplies the quadruped anatomy and animation. The CC0 shrike supplies
the bird anatomy/rig. The attributed bear supplies its anatomy; its small study
rig is authored here. No native behavior, animal physics or provider calls.
"""
import argparse
import hashlib
import importlib.util
import math
from pathlib import Path
import sys
import bpy
import numpy as np
from mathutils import Vector, Quaternion, Matrix

sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, solid_material


def helper_module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/name)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


def source_objects(path, species):
    if path.suffix=='.blend':
        with bpy.data.libraries.load(str(path),link=False) as (available,loaded):
            loaded.objects=available.objects
            loaded.actions=available.actions
        objects=[o for o in loaded.objects if o and (o.type=='ARMATURE' or
            (o.type=='MESH' and (o.name.startswith(('Deer','Stag','Wolf','Bird_YBShrike')))))]
        for obj in objects:bpy.context.collection.objects.link(obj)
    else:
        before=set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(path))
        objects=list(set(bpy.data.objects)-before)
    rig=next((o for o in objects if o.type=='ARMATURE'),None)
    if rig and rig.animation_data:
        actions={a.name.split('.')[0]:a for a in loaded.actions if a}
        for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
        rig.animation_data.action=actions.get('Idle')
        bpy.context.scene.frame_set(0)
    else:actions={}
    return objects,rig,actions


def bear_rig(mesh):
    # Work in the normalized source's actual local coordinates. This is a small
    # quadruped rig, not a voxel/procedural replacement for the retained mesh.
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True)
    bpy.context.view_layer.objects.active=mesh
    world=mesh.matrix_world.copy();mesh.parent=None;mesh.matrix_world=world
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    data=bpy.data.armatures.new('Bear study skeleton')
    rig=bpy.data.objects.new('Bear study skeleton',data);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,head,tail,parent=None):
        b=data.edit_bones.new(name);b.head=head;b.tail=tail
        if parent:b.parent=data.edit_bones[parent]
    bone('Body',(0,.4,.72),(0,-.55,.9))
    bone('Head',(0,-.55,.92),(0,-1.05,.98),'Body')
    for side,x in [('L',.22),('R',-.22)]:
        for end,y in [('Front',-.55),('Back',.55)]:
            bone(end+'.'+side,(x,y,.7),(x,y,.32),'Body')
            bone(end+'Foot.'+side,(x,y,.32),(x,y-.06,.03),end+'.'+side)
    bpy.ops.object.mode_set(mode='OBJECT')
    for b in data.bones:mesh.vertex_groups.new(name=b.name)
    for vertex in mesh.data.vertices:
        x,y,z=vertex.co
        group='Head' if y<-.65 and z>.58 else 'Body'
        if z<.64 and abs(x)>.13:
            group=('Front' if y<0 else 'Back')+('Foot' if z<.32 else '')+'.'+('L' if x>0 else 'R')
        mesh.vertex_groups[group].add([vertex.index],1,'REPLACE')
    modifier=mesh.modifiers.new('Study skeletal motion','ARMATURE');modifier.object=rig
    mesh.parent=rig
    return rig


def author_motion(rig,species):
    rig.animation_data_create();actions={}
    if species=='bird':
        # The downloaded file contains an asymmetric demonstration pose. Start
        # from its anatomical rest rig and fold the real wings for ground idle.
        for b in rig.pose.bones:
            b.rotation_mode='QUATERNION';b.rotation_quaternion=Quaternion();b.location=(0,0,0)
        for b in rig.pose.bones:
            for constraint in b.constraints:
                if constraint.type=='IK' and constraint.target is None: constraint.mute=True
        # A perched bird carries its chest upright. Rest geometry is a flight
        # rig, so zero rotations alone leave the head pointed at the ground.
        pelvis=rig.pose.bones['pelvis_control']
        rest=pelvis.bone.matrix_local.to_quaternion()
        pelvis.rotation_quaternion=rest.inverted()@Quaternion((1,0,0),-.38)@rest
        bpy.context.view_layer.update()
        def aim(name,direction,normal=None):
            bpy.context.view_layer.update()
            b=rig.pose.bones[name];head=b.head.copy()
            if normal is None:
                turn=(b.tail-b.head).rotation_difference(Vector(direction))
                b.matrix=Matrix.Translation(head)@turn.to_matrix().to_4x4()@Matrix.Translation(-head)@b.matrix
            else:
                y=Vector(direction).normalized();z=Vector(normal)
                z=(z-y*z.dot(y)).normalized();x=y.cross(z).normalized()
                matrix=Matrix((x,y,z)).transposed().to_4x4();matrix.translation=head
                b.matrix=matrix
        for side,sign in [('L',1),('R',-1)]:
            # Fold at all three real wing joints, not just the shoulder. Keeping
            # the outboard wing straight leaves long spikes behind the body.
            for name,direction in [('shoulder',(sign*.006,.020,-.007)),
                ('Wing',(sign*.001,-.020,-.004)),('Wing.001',(sign*.001,.023,-.007)),
                ('Wing.002',(0,.045,-.015))]:
                aim(name+'.'+side,direction,(-sign,0,0))
            for name in ['w_feather','w_feather.001']:
                aim(name+'.'+side,(0,.028,-.004),(-sign,0,0))
            # Closed feathers overlap rather than hanging at their full flight
            # width. The flight clip restores their original spread.
            for name in ['Wing','Wing.001','Wing.002','w_feather','w_feather.001']:
                rig.pose.bones[name+'.'+side].scale.x=.46
            # Fold the tail fan into a narrow layered silhouette.
            aim('t_feather.'+side,(-sign*.001,.032,-.006))
            aim('t_feather.'+side+'.001',(0,.032,-.006))
        bpy.context.view_layer.update()
    base={b.name:(b.rotation_quaternion.copy(),b.location.copy(),b.scale.copy()) for b in rig.pose.bones}
    for name,duration in [('Idle',60),('Walk',30)]:
        action=bpy.data.actions.new(name);rig.animation_data.action=action;actions[name]=action
        for frame in range(0,duration+1,2):
            t=frame/duration*math.tau
            for b in rig.pose.bones:
                b.rotation_mode='QUATERNION';b.rotation_quaternion=base[b.name][0];b.location=base[b.name][1];b.scale=base[b.name][2]
                # Preserve every authored constant pose in exported NLA clips;
                # otherwise unkeyed source joints can return to their rest pose.
                if frame in (0,duration):
                    b.keyframe_insert('rotation_quaternion',frame=frame)
                    b.keyframe_insert('location',frame=frame)
                    b.keyframe_insert('scale',frame=frame)
            def turn(name,angle):
                b=rig.pose.bones[name];b.rotation_quaternion=base[name][0]@Quaternion((1,0,0),angle)
                b.keyframe_insert('rotation_quaternion',frame=frame)
            if species=='bear':
                turn('Head',.025*math.sin(t))
                for side,offset in [('L',0),('R',math.pi)]:
                    for end,shift in [('Front',0),('Back',math.pi)]:
                        s=math.sin(t+offset+shift)
                        turn(end+'.'+side,.19*s if name=='Walk' else 0)
                        turn(end+'Foot.'+side,-.24*max(0,s) if name=='Walk' else 0)
            else:
                turn('head',.06*math.sin(t))
                turn('tail_base',.035*math.sin(t))
                for side,offset in [('L',0),('R',math.pi)]:
                    if name=='Walk':
                        for joint in ['Wing','Wing.001','Wing.002','w_feather','w_feather.001']:
                            wing=rig.pose.bones[joint+'.'+side]
                            wing.rotation_quaternion=Quaternion()
                            wing.scale=(1,1,1)
                            wing.keyframe_insert('rotation_quaternion',frame=frame)
                            wing.keyframe_insert('scale',frame=frame)
                        b=rig.pose.bones['shoulder.'+side];rest=b.bone.matrix_local.to_quaternion()
                        sign=1 if side=='L' else -1
                        b.rotation_quaternion=rest.inverted()@Quaternion((0,1,0),sign*.55*math.sin(t*2))@rest
                        b.keyframe_insert('rotation_quaternion',frame=frame)
                    b=rig.pose.bones['foot_ctl.'+side]
                    # The source bird is approximately 12 cm tall before its
                    # parent scale. Small alternating foot targets retain IK.
                    b.location=base[b.name][1]+Vector((0,.004*math.sin(t+offset),.003*max(0,math.sin(t+offset)))) if name=='Walk' else base[b.name][1]
                    b.keyframe_insert('location',frame=frame)
        rig.animation_data.action=None
    bpy.context.scene.frame_set(0)
    return actions


def export_clips(objects,rig,root,actions,path):
    rig.animation_data_create()
    for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
    rig.animation_data.action=None
    for name,source in [('Idle','Idle'),('Run','Walk')]:
        action=actions[source]
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,0,action);strip.name=name
        strip.action_frame_start=action.frame_range[0];strip.action_frame_end=action.frame_range[1]
        strip.frame_start=0;strip.frame_end=action.frame_range[1]-action.frame_range[0]
        track.mute=True
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [*objects,root]:obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_apply=True,export_animations=True,export_animation_mode='NLA_TRACKS',
        export_force_sampling=True,export_anim_slide_to_zero=True,export_yup=True,
        export_skins=True,export_def_bones=True,export_extras=True)


def coat(objects,species,index,output,paint):
    palettes={
        'wolf':['777c72','a6ab98','424a48'],
        'deer':['906c48','c8b48b','5b4738'],
        'stag':['7e6246','bba57a','514438'],
        'bird':['737b70','c9c5ab','3f4948'],
        'bear':['5e4b3e','9c8061','3f3832'],
    }
    base,light,dark=palettes[species]
    for obj in objects:
        if obj.type!='MESH':continue
        # Preserve the source's eyes, muzzle, hooves and antler assignments.
        if species in ('deer','stag','wolf'):
            for slot in obj.material_slots:
                original=slot.material
                shader=next((n for n in original.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
                value=sum(shader.inputs['Base Color'].default_value[:3])/3 if shader else .3
                name=original.name.lower()
                color=dark if value<.09 else light if value>.4 else base
                if 'eye' in name and ('black' in name or value<.05):color='222b29'
                if 'horn' in obj.name.lower():color='ae9b73'
                slot.material=solid_material(species+' '+name+' coat',color)
            # A fuller ruff or leaner outline changes silhouette, while the
            # third comparison adds a broad back/belly boundary below.
            for vertex in obj.data.vertices:
                if index==1:vertex.co.x*=1.08 if species=='wolf' else .94
            if index==2:
                # The source deer also has a white legacy color layer. glTF
                # consumers use COLOR_0, so export the authored layer first.
                for previous in list(obj.data.color_attributes):obj.data.color_attributes.remove(previous)
                attr=obj.data.color_attributes.new(name='Authored coat regions',type='FLOAT_COLOR',domain='CORNER')
                obj.data.color_attributes.active_color=attr
                for poly in obj.data.polygons:
                    for loop in poly.loop_indices:
                        p=obj.matrix_world@obj.data.vertices[obj.data.loops[loop].vertex_index].co
                        factor=.65 if p.z>.62 and p.y>.05 else 1.12 if p.z<.48 else 1
                        material=obj.data.materials[poly.material_index]
                        base_color=material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value
                        attr.data[loop].color=(*(min(1,c*factor) for c in base_color[:3]),1)
                for material in obj.data.materials:
                    shader=material.node_tree.nodes.get('Principled BSDF')
                    vertex_color=material.node_tree.nodes.new('ShaderNodeVertexColor');vertex_color.layer_name=attr.name
                    shader.inputs['Base Color'].default_value=(1,1,1,1)
                    material.node_tree.links.new(vertex_color.outputs['Color'],shader.inputs['Base Color'])
        else:
            source_image=next((n.image for m in obj.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and ('diff' in n.image.name or species=='bear')),None)
            if species=='bird' and source_image is None:
                source_image=next(i for i in bpy.data.images if i.name.startswith('bird_shrike1_diff'))
            image=source_image.copy();image.scale(256,256)
            rgba=np.array(image.pixels[:],dtype=np.float32).reshape(-1,4)
            value=rgba[:,:3]@np.array([.26,.55,.19])
            colors=np.array([[int(h[i:i+2],16)/255 for i in (0,2,4)] for h in [dark,base,light,'d6c9aa']])
            rgba[:,:3]=colors[np.digitize(value,[.19,.49,.76])]
            rgba[value<.075,:3]=[.10,.12,.11]
            if index:
                position,covered=paint.rasterize_surface(obj,256)
                x,y,z=[position[:,:,i].reshape(-1) for i in range(3)]
                band=(z>.13)&(z<.20) if species=='bird' else (z>.8)&(y>.0)
                if index==1:rgba[band,:3]=np.array([.45,.34,.23])
                else:rgba[(abs(x)>.04 if species=='bird' else y<-.5)&band,:3]=np.array([.70,.64,.48])
            image.pixels.foreach_set(rgba.ravel());image.pack()
            material=solid_material(species+' authored coat','ffffff')
            texture=material.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image;texture.interpolation='Linear'
            material.node_tree.links.new(texture.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
            obj.data.materials.clear();obj.data.materials.append(material)
            if index==1:
                for vertex in obj.data.vertices:vertex.co.x*=1.07
        for poly in obj.data.polygons:poly.use_smooth=True
        obj.data.validate(clean_customdata=False)
        # Match the consumer's four-weight limit before measuring/exporting.
        for vertex in obj.data.vertices:
            weights=sorted(((g.group,g.weight) for g in vertex.groups if g.weight>0),key=lambda pair:pair[1],reverse=True)
            if len(weights)<=4:continue
            total=sum(w for _,w in weights[:4])
            for group,_ in weights:obj.vertex_groups[group].remove([vertex.index])
            for group,weight in weights[:4]:obj.vertex_groups[group].add([vertex.index],weight/total,'REPLACE')


def main(sources,species):
    helper=helper_module('prepare-source-study.py');paint=helper_module('prepare-mercenary-variants.py')
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30
    group='source-'+species;output=ROOT/'apps/client/src/props/art-study'/group;output.mkdir(parents=True,exist_ok=True)
    path=sources/('shrike/bird_yellow_billed_shrike/bird_shrike1.blend' if species=='bird' else 'bear.glb' if species=='bear' else 'Blends/'+species.title()+'.blend')
    heights={'wolf':.96,'deer':1.45,'stag':1.95,'bird':.23,'bear':1.25}
    variants={'wolf':['field-grey','full-ruff','dark-saddle'],'deer':['woodland-doe','slender-doe','dark-back'],'stag':['branching-antlers','slender-stag','dark-mantle'],'bird':['grey-wing','warm-bib','wing-bars'],'bear':['forest-brown','heavy-shoulder','pale-muzzle']}[species]
    assets=[]
    for index,variant in enumerate(variants):
        objects,rig,actions=source_objects(path,species)
        helper.normalize(objects,heights[species])
        if species=='bear':
            mesh=next(o for o in objects if o.type=='MESH');rig=bear_rig(mesh);objects.append(rig)
        if species in ('bear','bird'):actions=author_motion(rig,species)
        rig.animation_data.action=actions['Idle'];bpy.context.scene.frame_set(0)
        helper.normalize(objects,heights[species])
        coat(objects,species,index,output,paint)
        rig.animation_data.action=actions['Idle'];bpy.context.scene.frame_set(0)
        label='Woodland bird' if species=='bird' else species.title()
        attribution=('Bear by madtrollstudio, CC BY 3.0, https://poly.pizza/m/kLLBpmcw0w; recolored, proportion study and rig by OpenLegend.' if species=='bear' else
            'Yellow-billed shrike by pistachio, CC0, OpenGameArt; woodland plumage and idle/flight study by OpenLegend.' if species=='bird' else
            'Quaternius Ultimate Animated Animals, CC0; coat grouping and proportions by OpenLegend; source Idle and Walk clips retained.')
        asset,root=export_asset(objects,output,species+'-'+variant,'library-'+species,label,variant,
            variant.replace('-',' ').capitalize()+': retained source anatomy with deliberate coat regions. '+('Source idle/walk clips.' if species in ('wolf','deer','stag') else 'Authored study idle/flight clips; no new native action.' if species=='bird' else 'Authored study idle/walk clips; no new native action.'),index==0,attribution)
        motion=output/(species+'-'+variant+'-motion.glb');export_clips(objects,rig,root,actions,motion)
        asset['animatedFile']=motion.name;asset['animatedSha256']=hashlib.sha256(motion.read_bytes()).hexdigest()
        root.location.x=index*3;assets.append(asset)
    url='https://poly.pizza/m/kLLBpmcw0w' if species=='bear' else 'https://opengameart.org/content/bird-yellow-billed-shrike' if species=='bird' else 'https://quaternius.com/packs/ultimateanimatedanimals.html'
    helper.retain(group,assets,[{'url':url,'license':'CC BY 3.0' if species=='bear' else 'CC0','file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}],recipe=__file__)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--sources',type=Path,required=True)
    parser.add_argument('--species',choices=['wolf','deer','stag','bird','bear'],required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);main(args.sources,args.species)
