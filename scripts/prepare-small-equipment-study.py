"""Authored cord/leather forms and source-rock flakes at actual item scale.

These small patterns supplement library weapons; they do not replace source
characters or trees with generated primitives, or grant native equipment.
"""
import argparse
import hashlib
import importlib.util
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector

sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, solid_material


def cord(name, points, material, radius=.007):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D'
    data.resolution_u=4;data.bevel_resolution=1;data.bevel_depth=radius
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for point,position in zip(spline.bezier_points,points):
        point.co=position;point.handle_left_type=point.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    data.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object


def main(libraries):
    spec=importlib.util.spec_from_file_location('source',ROOT/'scripts/prepare-source-study.py')
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    group='source-small-equipment';output=ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True,exist_ok=True)
    fiber=solid_material('Twisted flax','b6a07b');leather=solid_material('Worn sling leather','7e5941')
    stone=solid_material('Flaked grey stone','75817a');edge=solid_material('Fresh stone edge','a1aaa0')
    assets=[]; source_files=[]
    for family in ['cord','sling','stone-tool']:
        for index in range(3):
            objects=[]
            if family=='cord':
                variants=['loose-coil','figure-eight','working-length'];label='Fiber cord'
                if index==0:
                    points=[((.10+i*.001)*math.cos(i*math.tau/20),(.10+i*.001)*math.sin(i*math.tau/20),.01) for i in range(56)]
                elif index==1:points=[(.17*math.sin(t),.09*math.sin(t*2),.012+.004*math.cos(t)) for t in [i*math.tau/24 for i in range(25)]]
                else:points=[(-.24,-.04,.01),(-.1,.06,.01),(.04,-.03,.01),(.19,.035,.01),(.28,.02,.01)]
                objects=[cord('Laid fiber cord',points,fiber)]
                description='An intentionally laid cord silhouette, with a quiet broad strand. Compare coil, figure-eight and loose working length at real scale.'
            elif family=='sling':
                variants=['split-pouch','oval-pouch','long-pouch'];label='Field sling'
                width=[.07,.06,.045][index];length=[.15,.13,.19][index]
                verts=[(math.cos(i*math.tau/12)*width,math.sin(i*math.tau/12)*length,.025+.012*abs(math.cos(i*math.tau/12))) for i in range(12)]
                verts.append((0,0,.012))
                faces=[(12,i,(i+1)%12) for i in range(12) if not(index==0 and i in (2,3,8,9))]
                mesh=bpy.data.meshes.new('Cut sling leather');mesh.from_pydata(verts,[],faces);mesh.materials.append(leather)
                pouch=bpy.data.objects.new('Sling pouch',mesh);bpy.context.collection.objects.link(pouch)
                solid=pouch.modifiers.new('Leather thickness','SOLIDIFY');solid.thickness=.004
                objects=[pouch]
                for sign in [-1,1]:objects.append(cord('Sling cord',[(0,sign*length,.03),(.035,sign*.25,.02),(-.035,sign*.36,.015),(0,sign*.43,.01)],fiber,.005))
                description='Fitted leather pouch and two cords: split, rounded and narrow pouch alternatives. A display study of the existing sling, not a new action.'
            else:
                variants=['broad-flake','pointed-flake','small-scraper'];label='Stone tool'
                path=libraries/'kenney_survival-kit/Models/GLB format'/(['rock-c','rock-b','rock-flat'][index]+'.glb')
                source_files.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
                before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=list(set(bpy.data.objects)-before)
                helper.normalize(objects,.18,max_span=.28)
                for obj in objects:
                    if obj.type!='MESH':continue
                    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
                    world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
                    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
                    for vertex in obj.data.vertices:
                        vertex.co.y*=.18
                        if index==1:vertex.co.x*=max(.18,1-vertex.co.z/.22)
                        if index==2:vertex.co.z*=.65
                    obj.data.materials.clear();obj.data.materials.append(stone);obj.data.materials.append(edge)
                    for polygon in obj.data.polygons:polygon.material_index=int(abs(polygon.normal.y)<.45)
                description='Kenney rock planes reshaped into a thin flake, with a lighter cutting edge. Broad flake, pointed flake and scraper silhouettes.'
            variant=variants[index]
            asset,root=export_asset(objects,output,family+'-'+variant,'library-'+family,label,variant,description,index==0,
                'OpenLegend authored cord/leather patterns, AGPL-3.0-only; stone-tool source Kenney Survival Kit, CC0.')
            root.location.x=index*1.1;root.location.y=['cord','sling','stone-tool'].index(family)*1.5
            assets.append(asset)
    helper.retain(group,assets,[{'url':'https://kenney.nl/assets/survival-kit','license':'CC0','scope':'Stone flake source planes','files':source_files}],recipe=__file__)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--libraries',type=Path,required=True)
    main(parser.parse_args(sys.argv[sys.argv.index('--')+1:]).libraries)
