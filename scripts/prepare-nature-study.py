"""Adapt selected CC0 nature structures with quiet material groups in Blender."""
import argparse
import hashlib
import importlib.util
from pathlib import Path
import sys
import bpy
import numpy as np
from mathutils import Vector
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, solid_material

FAMILIES={
 'library-conifer':('Conifer',5.6,['Pine_1','Pine_3','Pine_5'],['tiered-boughs','slender-crown','sheltered-pine']),
 'library-birch':('Pale woodland tree',4.8,['CommonTree_2','CommonTree_3','CommonTree_4'],['forked-trunk','slender-birch','open-branches']),
 'library-shrub':('Woodland shrub',1.2,['Bush_Common','Bush_Common_Flowers','Bush_Common'],['rounded-thicket','open-flowering','low-spreading']),
 'library-rock':('Weathered stone',.8,['Rock_Medium_1','Rock_Medium_2','Rock_Medium_3'],['rounded-shoulder','split-planes','low-slab']),
 'library-grass':('Ground growth',.42,['Grass_Common_Short','Grass_Wispy_Short','Grass_Common_Tall'],['broad-tuft','fine-tuft','open-stems']),
 'library-fern':('Woodland fern',.65,['Fern_1','Fern_1','Fern_1'],['open-fronds','arching-fronds','sheltered-fronds']),
}


def main(libraries):
 spec=importlib.util.spec_from_file_location('source_study',ROOT/'scripts/prepare-source-study.py')
 helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
 bpy.ops.wm.read_factory_settings(use_empty=True)
 output=ROOT/'apps/client/src/props/art-study/source-vegetation';output.mkdir(parents=True,exist_ok=True)
 assets=[];sources=[]
 for row,(family,(label,height,files,variants)) in enumerate(FAMILIES.items()):
  for index,(file,variant) in enumerate(zip(files,variants)):
   path=libraries/'quaternius-standard/glTF'/(file+'.gltf')
   before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=list(set(bpy.data.objects)-before)
   helper.clean_materials();helper.normalize(objects,height)
   for obj in objects:
    if obj.type!='MESH':continue
    # A low spreading bush / tighter sheltered fern are actual crown changes.
    if family=='library-shrub' and index==2:obj.scale.x*=1.35;obj.scale.y*=1.18;obj.scale.z*=.77
    if family=='library-fern' and index==2:obj.scale.x*=.68;obj.scale.y*=.8;obj.scale.z*=.92
    if family=='library-fern' and index==1:
     inverse=obj.matrix_world.inverted()
     for vertex in obj.data.vertices:
      p=obj.matrix_world@vertex.co
      radius=(p.x*p.x+p.y*p.y)**.5
      p.z=max(.015,p.z-.28*radius*radius)
      p.x*=1.16;p.y*=1.16
      vertex.co=inverse@p
    colors=obj.data.color_attributes.active_color
    if colors is None:colors=obj.data.color_attributes.new(name='Material groups',type='FLOAT_COLOR',domain='CORNER')
    normals=[n.vector.copy() for n in obj.data.corner_normals]
    normal_inverse=obj.matrix_world.to_3x3().transposed()
    for material in obj.data.materials:
     material['studyPrepared']=True
     foliage=any(word in material.name.lower() for word in ['leave','leaf','grass','plant','fern','flower'])
     shader=material.node_tree.nodes.get('Principled BSDF')
     if not shader:continue
     for node in material.node_tree.nodes:
      if node.type!='TEX_IMAGE' or not node.image or not any(o.is_linked for o in node.outputs):continue
      node.image=node.image.copy();node.image.scale(128,128)
      pixels=np.array(node.image.pixels[:],dtype=np.float32).reshape(-1,4)
      if foliage:pixels[:,:3]=1
      elif family=='library-birch':
       value=pixels[:,:3].mean(axis=1);pixels[:,:3]=np.where((value<.19)[:,None],[.29,.32,.29],[.68,.69,.58])
      elif family=='library-rock':
       value=pixels[:,:3].mean(axis=1);pixels[:,:3]=np.array([[.33,.38,.37],[.45,.49,.44],[.57,.59,.51]])[np.digitize(value,[.38,.65])]
      else:
       value=pixels[:,:3].mean(axis=1);pixels[:,:3]=np.array([.23,.19,.15])+value[:,None]*np.array([.24,.22,.16])
      node.image.pixels.foreach_set(pixels.ravel());node.image.pack()
    for polygon in obj.data.polygons:
     name=obj.data.materials[polygon.material_index].name.lower()
     foliage=any(word in name for word in ['leave','leaf','grass','plant','fern','flower'])
     for loop in polygon.loop_indices:
      vertex=obj.data.loops[loop].vertex_index;p=obj.matrix_world@obj.data.vertices[vertex].co
      if foliage:
       palette=['314b42','425b47','61734f','81905c'] if family=='library-conifer' else ['354d3e','526b43','72854d','97a165']
       h='c9c5a2' if 'flower' in name else palette[min(3,max(0,int(p.z/height*3.5)))];rgb=np.array([int(h[i:i+2],16)/255 for i in (0,2,4)])
       rgb=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
       colors.data[loop if colors.domain=='CORNER' else vertex].color=(*rgb,1)
       n=Vector((p.x*.55,p.y*.55,(p.z-height*.55)*.3+.7)).normalized()
       normals[loop]=(normal_inverse@n).normalized()
    obj.data.normals_split_custom_set(normals)
   asset,placement=export_asset(objects,output,family.replace('library-','')+'-'+variant,family,label,variant,
     'Source-authored '+file+' structure; broad moss/olive or stone groups, restrained bark and controlled canopy normals. '+variant.replace('-',' ')+'.',index==({'library-conifer':2,'library-birch':1}.get(family,0)),
     'Quaternius Stylized Nature MegaKit Standard, CC0. OpenLegend material groups and selected crown proportions; no source normal maps.')
   placement.location.x=index*(height+1);placement.location.y=row*7
   assets.append(asset);sources.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 helper.retain('source-vegetation',assets,[{'url':'https://quaternius.com/packs/stylizednaturemegakit.html','license':'CC0','files':sources}],recipe=__file__)


if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--libraries',type=Path,required=True)
 args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);main(args.libraries)
