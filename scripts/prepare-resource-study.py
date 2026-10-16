"""Adapt licensed camp/resource sources; retain three finite art alternatives.

Run offline in Blender. These are appearance studies, never added inventory,
resource quantities, shelter coverage or new actions.
"""
import argparse
import hashlib
import importlib.util
import math
from pathlib import Path
import sys
import bpy
import numpy as np
from mathutils import Vector
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, solid_material

FAMILIES={
 'berry-bush':('Berry bush',1.05,'nature',['Bush_Common','Bush_Common','Bush_Common'],['fruit-groups','open-canes','low-thicket']),
 'reeds':('River reeds',1.0,'nature',['Grass_Wispy_Tall','Grass_Common_Tall','Grass_Wispy_Tall'],['river-fan','broad-leaves','broken-stems']),
 'dry-fiber':('Dry fibers',.42,'nature',['Grass_Common_Tall','Grass_Wispy_Tall','Grass_Common_Short'],['standing-stems','loose-stems','low-tuft']),
 'fallen-wood':('Fallen wood',.24,'camp',['resource-wood','tree-log-small','tree-trunk'],['loose-branches','fallen-log','forked-stump']),
 'river-stones':('Loose river stones',.22,'camp',['resource-stone','rock-flat','rock-c'],['loose-stones','flat-stone','split-stone']),
 'marker':('Carved work marker',.9,'camp',['signpost-single','signpost','signpost-single'],['single-board','crossroads','worn-post']),
 'supplies':('Workshop supplies',.6,'camp',['box-open','box-large-open','barrel-open'],['open-box','wide-box','stave-barrel']),
 'bundle':('Travelling bundle',.35,'camp',['bedroll-packed','bedroll','bedroll-packed'],['rolled-wool','open-bedroll','tied-bundle']),
 'workbench':('Riverside workbench',.85,'camp',['workbench','workbench','workbench'],['open-bench','long-table','narrow-bench']),
 'backpack':('Travelling pack',.48,'pack',['backpack','backpack','backpack'],['canvas-pack','broad-flap','slender-pack']),
 'shelter':('Canvas shelter',1.9,'camp',['tent-canvas-half','tent-canvas','tent'],['open-awning','canvas-tent','framed-tent']),
}


def recolor(objects,family):
    for obj in objects:
        if obj.type!='MESH':continue
        for slot in obj.material_slots:
            material=slot.material.copy();slot.material=material
            shader=material.node_tree.nodes.get('Principled BSDF')
            if not shader:continue
            for link in list(material.node_tree.links):
                if link.to_socket in (shader.inputs['Normal'],shader.inputs['Metallic'],shader.inputs['Roughness']):material.node_tree.links.remove(link)
            shader.inputs['Roughness'].default_value=.95;shader.inputs['Metallic'].default_value=0;shader.inputs['Specular IOR Level'].default_value=.08
            for node in material.node_tree.nodes:
                if node.type!='TEX_IMAGE' or not node.image or not any(o.is_linked for o in node.outputs):continue
                image=node.image.copy();image.scale(128,128)
                rgba=np.array(image.pixels[:],dtype=np.float32).reshape(-1,4)
                rgb=rgba[:,:3];value=rgb@np.array([.26,.55,.19])
                if family=='berry-bush' and not any(word in material.name.lower() for word in ['wood','bark','trunk']):palette=['2e473a','4a643e','71834d','9aa36c']
                elif family=='reeds':palette=['45513b','697548','8d9563','b1ae78']
                elif family=='dry-fiber':palette=['665a3f','8c7c54','b2a16c','cabe8e']
                elif family=='river-stones':palette=['4a5450','69766b','939b87','b8b8a0']
                elif family in ('bundle','shelter'):palette=['49483d','6d6c54','959578','beb99b']
                else:palette=['3c3129','5c4833','856b47','b39a69']
                colors=np.array([[int(h[i:i+2],16)/255 for i in (0,2,4)] for h in palette])
                rgba[:,:3]=colors[np.digitize(value,[.24,.48,.72])]
                image.pixels.foreach_set(rgba.ravel());image.pack();node.image=image;node.interpolation='Linear'
        obj.data.validate(clean_customdata=False)


def berries(objects,index):
    # Add fruit to the source shrub's existing canopy. Source foliage supplies
    # the silhouette; small fruit groups are authored additions, not blob trees.
    points=[]
    for obj in objects:
        if obj.type!='MESH':continue
        points.extend(obj.matrix_world@v.co for v in obj.data.vertices if (obj.matrix_world@v.co).z>.4)
    material=solid_material('Grouped ripe berries','874852')
    added=[]
    for n in range(7 if index!=1 else 5):
        angle=n*math.tau/7+.25
        direction=Vector((math.cos(angle),math.sin(angle),.18))
        p=max(points,key=lambda p:p.dot(direction)).copy()
        p*=.86;p.z+=.02
        for offset in [(-.025,0,0),(.024,0,.008),(0,-.015,-.035)]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=.033,location=p+Vector(offset))
            fruit=bpy.context.object;fruit.name='Small fruit group';fruit.data.materials.append(material)
            for polygon in fruit.data.polygons:polygon.use_smooth=True
            added.append(fruit)
    return added


def main(libraries,pack):
    spec=importlib.util.spec_from_file_location('sources',ROOT/'scripts/prepare-source-study.py')
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    group='source-resources';output=ROOT/'apps/client/src/props/art-study'/group;output.mkdir(parents=True,exist_ok=True)
    assets=[];sources=[]
    for row,(family,(label,height,library,files,variants)) in enumerate(FAMILIES.items()):
        for index,(file,variant) in enumerate(zip(files,variants)):
            path=pack if library=='pack' else libraries/('quaternius-standard/glTF' if library=='nature' else 'kenney_survival-kit/Models/GLB format')/(file+('.gltf' if library=='nature' else '.glb'))
            before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=list(set(bpy.data.objects)-before)
            helper.normalize(objects,height);recolor(objects,family)
            if family in ('workbench','backpack') and index:
                for obj in objects:
                    if not obj.parent:
                        obj.scale.x*=1.28 if index==1 else .8
                        obj.scale.y*=.85 if index==1 else .9
            fruits=[]
            if family=='berry-bush':
                for obj in objects:
                    if not obj.parent:
                        obj.scale.x*=.82 if index==1 else 1.24 if index==2 else 1
                        obj.scale.y*=.88 if index==1 else 1.15 if index==2 else 1
                        obj.scale.z*=.78 if index==2 else 1
                bpy.context.view_layer.update();fruits=berries(objects,index);objects+=fruits
            if index==2 and family in ('reeds','marker','bundle'):
                for obj in objects:
                    if not obj.parent:
                        obj.scale.x*=1.18 if family=='bundle' else .82
                        obj.scale.z*=.77 if family=='marker' else .88
            asset,placement=export_asset(objects,output,family+'-'+variant,'library-'+family,label,variant,
                variant.replace('-',' ').capitalize()+': source-authored structure, restrained material regions and clear practical use. Display art does not add supplies or change physical cover.',index==0,
                ('Quaternius Stylized Nature MegaKit Standard' if library=='nature' else 'Quaternius Survival Pack' if library=='pack' else 'Kenney Survival Kit')+', CC0. OpenLegend proportions, material grouping and authored details.')
            if fruits:
                depleted,empty_root=export_asset([o for o in objects if o not in fruits],output,family+'-'+variant+'-empty','library-'+family,label,variant,
                    'The same source bush after the visible fruit is gathered.',False,asset['source'])
                empty_root.parent=placement
                asset['depletedFile']=depleted['file'];asset['depletedSha256']=depleted['sha256']
            placement.location.x=index*3;placement.location.y=row*4
            assets.append(asset);sources.append({'file':path.name,'library':library,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    helper.retain(group,assets,[{'url':'https://quaternius.com/packs/stylizednaturemegakit.html','license':'CC0'},
        {'url':'https://kenney.nl/assets/survival-kit','license':'CC0'},
        {'url':'https://poly.pizza/m/2g9Jm7kvIU','creator':'Quaternius','license':'CC0','files':sources}],recipe=__file__)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--libraries',type=Path,required=True)
    parser.add_argument('--pack',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);main(args.libraries,args.pack)
