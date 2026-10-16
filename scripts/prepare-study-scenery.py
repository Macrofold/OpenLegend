"""Compile prepared source meshes into the existing instanced scenery owner.

Run with Python/Pillow/numpy after Blender exports. This preserves the two older
library choices and adds a finite study choice; no world placements are written.
"""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('scenery_source',ROOT/'scripts/prepare-library-environment.py')
reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)


class Files:
    def read(self,path):return Path(path).read_bytes()


def add(data,appearance,path):
    raw,model,accessor,image=reader.read_model(Files(),str(path))
    parts=[]
    def visit(index,parent):
        node=model['nodes'][index]
        if 'matrix' in node:matrix=np.array(node['matrix']).reshape(4,4).T
        else:
            x,y,z,w=node.get('rotation',[0,0,0,1]);scale=node.get('scale',[1,1,1])
            matrix=np.eye(4)
            matrix[:3,:3]=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],
                [2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],
                [2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])@np.diag(scale)
            matrix[:3,3]=node.get('translation',[0,0,0])
        matrix=parent@matrix
        if 'mesh' in node:
            for primitive in model['meshes'][node['mesh']]['primitives']:
                attributes=primitive['attributes'];positions=np.array(accessor(attributes['POSITION']))
                normals=np.array(accessor(attributes['NORMAL']))
                positions=(matrix@np.column_stack([positions,np.ones(len(positions))]).T).T[:,:3]
                normals=(np.linalg.inv(matrix[:3,:3]).T@normals.T).T
                normals/=np.linalg.norm(normals,axis=1)[:,None]
                source=model['materials'][primitive['material']];pbr=source.get('pbrMetallicRoughness',{})
                key='study-'+hashlib.sha256((str(path)+str(primitive['material'])).encode()).hexdigest()[:12]
                material={'baseColor':pbr.get('baseColorFactor',[1,1,1,1]),'alphaCutoff':source.get('alphaCutoff',.5) if source.get('alphaMode')=='MASK' else 0,'doubleSided':source.get('doubleSided',False),'canopyNormals':'Leaves' in source.get('name','')}
                if 'baseColorTexture' in pbr:
                    pixels,digest=image(pbr['baseColorTexture']['index'])
                    texture='study-'+digest[:12];material['texture']=texture
                    data['textures'][texture]={'width':pixels.width,'height':pixels.height,'rgba':list(pixels.tobytes())}
                data['materials'][key]=material
                colors=accessor(attributes['COLOR_0']) if 'COLOR_0' in attributes else [[1,1,1,1]]*len(positions)
                parts.append({'positions':positions,'normals':normals,'uvs':accessor(attributes['TEXCOORD_0']) if 'TEXCOORD_0' in attributes else [[0,0]]*len(positions),'colors':[c if len(c)==4 else [*c,1] for c in colors],'indices':[v[0] for v in accessor(primitive['indices'])],'material':key})
        for child in node.get('children',[]):visit(child,matrix)
    for root in model['scenes'][model.get('scene',0)]['nodes']:visit(root,np.eye(4))
    points=np.vstack([part['positions'] for part in parts]);lower=points.min(axis=0);upper=points.max(axis=0)
    width=max(upper[0]-lower[0],upper[2]-lower[2]);scale=np.array([width,upper[1]-lower[1],width]);center=np.array([(lower[0]+upper[0])/2,lower[1],(lower[2]+upper[2])/2])
    for part in parts:
        part['positions']=(part['positions']-center)/scale
        part['normals']*=scale;part['normals']/=np.linalg.norm(part['normals'],axis=1)[:,None]
        for key in ['positions','normals','uvs','colors']:part[key]=np.round(np.array(part[key]).flatten(),6).tolist()
    data['variants']['study'][appearance]={'parts':parts,'bounds':{'min':((lower-center)/scale).tolist(),'max':((upper-center)/scale).tolist()}}


if __name__=='__main__':
    path=ROOT/'apps/client/src/props/library-environment/scenery.json'
    data=json.loads(path.read_text())
    # Rebuild only this owned finite choice; older comparison sources survive.
    data['materials']={k:v for k,v in data['materials'].items() if not k.startswith('study-')}
    data['textures']={k:v for k,v in data['textures'].items() if not k.startswith('study-')}
    data['variants']['study']=dict(data['variants']['quaternius'])
    add(data,'tree-broadleaf',ROOT/'apps/client/src/props/art-study/source-nature/broadleaf-sheltered-crown.glb')
    path.write_text(json.dumps(data,separators=(',',':'))+'\n')
