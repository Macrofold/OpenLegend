"""Compile prepared source meshes into the existing instanced scenery owner.

Run with Python/Pillow/numpy after Blender exports. This preserves the two older
library choices and adds a finite study choice; no world placements are written.
"""
import argparse
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


def add(data,appearance,path,family='study'):
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
                key='study-'+hashlib.sha256((str(path.relative_to(ROOT))+str(primitive['material'])).encode()).hexdigest()[:12]
                material={'baseColor':pbr.get('baseColorFactor',[1,1,1,1]),'alphaCutoff':source.get('alphaCutoff',.5) if source.get('alphaMode')=='MASK' else 0,'doubleSided':source.get('doubleSided',False),'canopyNormals':any(word in source.get('name','').lower() for word in ['leav','leaf','grass','fern','twigs'])}
                if 'baseColorTexture' in pbr:
                    pixels,digest=image(pbr['baseColorTexture']['index'])
                    if max(pixels.size)>128:
                        original=pixels
                        pixels=pixels.resize((128,128),reader.Image.Resampling.BOX)
                        alpha,_=reader.prepared_alpha(original,128,max(material['alphaCutoff'],.001))
                        pixels.putalpha(alpha)
                    texture='study-'+digest[:12];material['texture']=texture
                    data['textures'][texture]={'width':pixels.width,'height':pixels.height,'rgba':list(pixels.tobytes())}
                data['materials'][key]=material
                colors=accessor(attributes['COLOR_0']) if 'COLOR_0' in attributes else [[1,1,1,1]]*len(positions)
                uvs=np.array(accessor(attributes['TEXCOORD_0']) if 'TEXCOORD_0' in attributes else [[0,0]]*len(positions),dtype=float)
                transform=pbr.get('baseColorTexture',{}).get('extensions',{}).get('KHR_texture_transform',{})
                if transform:
                    angle=transform.get('rotation',0);c,s=np.cos(angle),np.sin(angle)
                    uvs=(uvs*np.array(transform.get('scale',[1,1])))@np.array([[c,s],[-s,c]])+np.array(transform.get('offset',[0,0]))
                parts.append({'positions':positions,'normals':normals,'uvs':uvs,'colors':[c if len(c)==4 else [*c,1] for c in colors],'indices':[v[0] for v in accessor(primitive['indices'])],'material':key})
        for child in node.get('children',[]):visit(child,matrix)
    for root in model['scenes'][model.get('scene',0)]['nodes']:visit(root,np.eye(4))
    points=np.vstack([part['positions'] for part in parts]);lower=points.min(axis=0);upper=points.max(axis=0)
    width=max(upper[0]-lower[0],upper[2]-lower[2]);scale=np.array([width,upper[1]-lower[1],width]);center=np.array([(lower[0]+upper[0])/2,lower[1],(lower[2]+upper[2])/2])
    for part in parts:
        part['positions']=(part['positions']-center)/scale
        part['normals']*=scale;part['normals']/=np.linalg.norm(part['normals'],axis=1)[:,None]
        for key in ['positions','normals','uvs','colors']:part[key]=np.round(np.array(part[key]).flatten(),6).tolist()
    data['variants'][family][appearance]={'parts':parts,'bounds':{'min':((lower-center)/scale).tolist(),'max':((upper-center)/scale).tolist()}}


def canopy(data):
    """Group greens on the source geometry once; no screen noise or fake holes."""
    for appearance,shape in data['variants']['canopy'].items():
        for part in shape['parts']:
            material=data['materials'][part['material']]
            if not material.get('canopyNormals'):
                # The preceding birch finish replaced bark with near-white
                # plateaus. Bring that pale bark into the shaded woodland range.
                if appearance=='tree-birch':material['baseColor']=[.52,.56,.49,1]
                continue
            positions=np.array(part['positions']).reshape(-1,3)
            x,y,z=positions.T
            group=np.clip(np.floor((np.sin(x*13+z*7)+np.sin(y*17-z*11)+2)*.75),0,2)
            palette=np.array([[.77,.91,1.02],[.96,1.03,.89],[1.16,1.12,.84]])
            colors=np.array(part['colors'],dtype=float).reshape(-1,4)
            colors[:,:3]*=palette[group.astype(int)]
            part['colors']=np.round(np.clip(colors,0,1).flatten(),6).tolist()
    # UV transforms have been baked already. Join truly identical materials,
    # including the fir's living/dead bark, instead of adding a draw per patch.
    for shape in data['variants']['canopy'].values():
        merged={}
        for part in shape['parts']:
            signature=json.dumps(data['materials'][part['material']],sort_keys=True)
            if signature not in merged:merged[signature]=part;continue
            target=merged[signature];offset=len(target['positions'])//3
            for key in ['positions','normals','uvs','colors']:target[key].extend(part[key])
            target['indices'].extend(index+offset for index in part['indices'])
        shape['parts']=list(merged.values())
    # Both comparisons may be loaded together; distinct prepared materials must
    # not overwrite the retained source's cache entry when someone switches.
    keys={part['material'] for shape in data['variants']['canopy'].values() for part in shape['parts']}
    data['materials']={'canopy-'+key:data['materials'][key] for key in keys}
    for shape in data['variants']['canopy'].values():
        for part in shape['parts']:part['material']='canopy-'+part['material']


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--canopy',action='store_true');args=parser.parse_args()
    output=ROOT/'apps/client/src/props/library-environment'
    if args.canopy:
        source=json.loads((output/'scenery-study.json').read_text())
        data={'variants':{'canopy':source['shapes']},'materials':source['materials'],'textures':source['textures']}
        add(data,'tree-conifer',ROOT/'apps/client/src/props/art-study/source-grounded-conifer/grounded-conifer-quiet.glb','canopy')
        canopy(data)
        outputs=reader.write_variants(data,output)
        paths=[output/'scenery-study.json',ROOT/'apps/client/src/props/art-study/source-grounded-conifer/catalog.json']
        provenance={'recipe':str(Path(__file__).relative_to(ROOT)),'recipeSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'sources':[{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],'outputs':outputs}
        (output/'canopy-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
        sys.exit(0)
    data={'variants':{},'materials':{},'textures':{}}
    for name in ['kenney','quaternius']:
        source=json.loads((output/('scenery-'+name+'.json')).read_text())
        data['variants'][name]=source['shapes']
        data['materials'].update(source['materials']);data['textures'].update(source['textures'])
    data['variants']['study']=dict(data['variants']['quaternius'])
    add(data,'tree-broadleaf',ROOT/'apps/client/src/props/art-study/source-nature/broadleaf-sheltered-crown.glb')
    for appearance,file in [('tree-conifer','conifer-sheltered-pine'),('tree-birch','birch-slender-birch'),('woodland-shrub','shrub-rounded-thicket'),('meadow-grass','grass-broad-tuft')]:
        add(data,appearance,ROOT/'apps/client/src/props/art-study/source-vegetation'/(file+'.glb'))
    data['variants']={'study':data['variants']['study']}
    outputs=reader.write_variants(data,output)
    provenance={'recipe':str(Path(__file__).relative_to(ROOT)),
        'recipeSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'sources':[{'catalog':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
                   for path in [ROOT/'apps/client/src/props/art-study/source-nature/catalog.json',ROOT/'apps/client/src/props/art-study/source-vegetation/catalog.json']],
        'outputs':outputs}
    (output/'study-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
