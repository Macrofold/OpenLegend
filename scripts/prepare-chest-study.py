"""Three actual source constructions, tailored to the current supply-crate envelope."""
import argparse
import hashlib
import importlib.util
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, pixel_material, solid_material, box_uv


def prepare(libraries):
    spec=importlib.util.spec_from_file_location('sources',ROOT/'scripts/prepare-source-study.py')
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    group='source-chests';output=ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True,exist_ok=True)
    cells=np.full((64,64),2,dtype=int)
    for row in (7,25,44,62): cells[row:row+1,:]=0
    for u,v,length in [(4,10,20),(29,13,17),(10,31,31),(42,36,17),(2,49,24),(33,55,22)]:
        cells[v,u:u+length]=1;cells[v+1,u+2:u+length-2]=3
    cells[8,:]=3;cells[26,18:58]=3;cells[45,2:42]=3
    wood=pixel_material('Worked oak boards',['49372b','654934','83603f','a98050'],cells.tolist(),output)
    iron=solid_material('Quiet forged iron','414945',roughness=.98)
    assets=[];sources=[]
    for index,(filename,variant) in enumerate([
        (ROOT/'apps/client/src/props/generated-chest.glb','carved-lid'),
        (libraries/'kenney_survival-kit/Models/GLB format/chest.glb','banded-lid'),
        (libraries/'kenney_survival-kit/Models/GLB format/box-large.glb','plank-cache'),
    ]):
        before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(filename))
        objects=list(set(bpy.data.objects)-before)
        # All alternatives occupy the same existing resource-crate envelope.
        points=[obj.matrix_world@vertex.co for obj in objects if obj.type=='MESH' for vertex in obj.data.vertices]
        low=Vector([min(p[i] for p in points) for i in range(3)])
        high=Vector([max(p[i] for p in points) for i in range(3)])
        scale=Matrix.Diagonal(Vector((1/(high.x-low.x),.8/(high.y-low.y),.8/(high.z-low.z),1)))
        transform=scale@Matrix.Translation(Vector((-(high.x+low.x)/2,-(high.y+low.y)/2,-low.z)))
        for obj in objects:
            if obj.parent not in objects: obj.matrix_world=transform@obj.matrix_world
        for obj in objects:
            if obj.type!='MESH': continue
            assignments=[]
            images={}
            for material in obj.data.materials:
                if not material.use_nodes: continue
                shader=material.node_tree.nodes.get('Principled BSDF')
                if shader and shader.inputs['Base Color'].links:
                    node=shader.inputs['Base Color'].links[0].from_node
                    if node.type=='TEX_IMAGE':
                        images[material]=np.array(node.image.pixels[:]).reshape(node.image.size[1],node.image.size[0],4)
            uv=obj.data.uv_layers.active
            for polygon in obj.data.polygons:
                material=obj.data.materials[polygon.material_index]
                if material in images and uv:
                    image=images[material];point=sum((uv.data[i].uv for i in polygon.loop_indices),Vector((0,0)))/len(polygon.loop_indices)
                    r,g,b=image[min(image.shape[0]-1,max(0,int(point.y*image.shape[0]))),min(image.shape[1]-1,max(0,int(point.x*image.shape[1])))][:3]
                    metal=not (r>b*1.2 and r>g*1.04)
                else:
                    metal='iron' in material.name.lower() or 'metal' in material.name.lower()
                assignments.append(int(metal))
            obj.data.materials.clear();obj.data.materials.append(wood);obj.data.materials.append(iron)
            for polygon,region in zip(obj.data.polygons,assignments): polygon.material_index=region
            box_uv(obj,density=64,size=64)
        desc=[
            'Closed carved lid from the retained generated source, with quiet oak boards and restrained iron. Ornament remains visible for comparison.',
            'Practical banded lid from the Kenney source, with clear hinges, clasp and board construction. The broad form survives a small game view.',
            'Low square plank cache from the Kenney source. Plain construction suits supplies and offers a less ornamental silhouette.',
        ][index]
        credit=('Production Gothic reward chest created with Meshy; runtime processing by Samfa12/Codex. CC BY 4.0; OpenLegend closes, fits and repaints the source.' if index==0 else 'Kenney Survival Kit, CC0; OpenLegend fits and repaints the source.')
        asset,placement=export_asset(objects,output,'chest-'+variant,'library-chest','Supply chest',variant,desc,index==1,credit)
        placement.location.x=index*1.6;assets.append(asset)
        sources.append({'path':str(filename),'sha256':hashlib.sha256(filename.read_bytes()).hexdigest(),'credit':credit})
    helper.retain(group,assets,sources,recipe=__file__)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--libraries',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);prepare(args.libraries)
