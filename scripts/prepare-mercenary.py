"""Combine the approved study's existing idle/walk clips; no provider or image work.
Usage: python3 scripts/prepare-mercenary.py /absolute/path/to/mercenary-study
"""
from pathlib import Path
import copy
import hashlib
import json
import struct
import sys

source = Path(sys.argv[1]).resolve()
out = Path(__file__).resolve().parent.parent / 'apps/client/src/characters/mercenary-assets'
out.mkdir(parents=True, exist_ok=True)

def read_glb(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', raw)
    assert magic == 0x46546c67 and version == 2 and length == len(raw)
    size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(raw[20:20+size])
    size2, kind2 = struct.unpack_from('<II', raw, 20+size)
    assert kind2 == 0x004e4942
    return doc, bytearray(raw[28+size:28+size+size2])

base, binary = read_glb(source / 'assets/mercenary.glb')
walk, walk_binary = read_glb(source / 'assets/mercenary-walk.glb')
base['animations'][0]['name'] = 'Idle'
clip = copy.deepcopy(walk['animations'][0])
clip['name'] = 'Walk'
nodes = {n.get('name'): i for i, n in enumerate(base['nodes'])}
for channel in clip['channels']:
    channel['target']['node'] = nodes[walk['nodes'][channel['target']['node']]['name']]
accessors, views = {}, {}
for sampler in clip['samplers']:
    for key in ['input', 'output']:
        index = sampler[key]
        if index not in accessors:
            accessor = copy.deepcopy(walk['accessors'][index])
            view_index = accessor['bufferView']
            if view_index not in views:
                view = copy.deepcopy(walk['bufferViews'][view_index])
                start = view.get('byteOffset', 0)
                binary.extend(b'\0' * (-len(binary) % 4))
                view['byteOffset'] = len(binary)
                view['buffer'] = 0
                binary.extend(walk_binary[start:start+view['byteLength']])
                views[view_index] = len(base['bufferViews'])
                base['bufferViews'].append(view)
            accessor['bufferView'] = views[view_index]
            accessors[index] = len(base['accessors'])
            base['accessors'].append(accessor)
        sampler[key] = accessors[index]
base['animations'].append(clip)
# These four panels are replaced by runtime cloth and only supply source materials.
# Do not instantiate their unused skins: PlayCanvas 2.22.2 over-retains shared skin
# references when a skinned node has multiple primitives (the panels' two sides).
for node in base['nodes']:
    if node.get('name') in ['Cape · diagonal front throw', 'Cape · embroidered back',
                            'Cape · gathered shoulder yoke', 'Cape · right shoulder fold']:
        node.pop('skin', None)

assert all('uri' not in image for image in base['images'])
assert len(base['buffers']) == 1 and 'uri' not in base['buffers'][0]
base['buffers'][0]['byteLength'] = len(binary)
binary.extend(b'\0' * (-len(binary) % 4))
encoded = json.dumps(base, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
raw = struct.pack('<III', 0x46546c67, 2, 28+len(encoded)+len(binary))
raw += struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
raw += struct.pack('<II', len(binary), 0x004e4942) + binary
(out / 'mercenary.glb').write_bytes(raw)
cloth = source / 'assets/cloth-rest.json'
(out.parent / 'mercenary-cloth.json').write_bytes(cloth.read_bytes())
metadata = {
    'purpose': 'Trusted default-scene NPC art pilot; not a production character family',
    'source': 'Local Peacock Mercenary study, owner-selected 2026-09-28',
    'provenance': 'Meshy body/rig/walk; authored cape and runtime code; AI-assisted texture repaint. Reference design is not bundled or licensed by this derivative.',
    'clips': ['Idle', 'Walk'],
    'sourceSha256': {n: hashlib.sha256((source / 'assets' / n).read_bytes()).hexdigest() for n in ['mercenary.glb', 'mercenary-walk.glb', 'cloth-rest.json']},
    'sha256': hashlib.sha256(raw).hexdigest(),
    'bytes': len(raw),
    'joints': len(base['skins'][0]['joints']),
    'triangles': sum(base['accessors'][p['indices']]['count']//3 for m in base['meshes'] for p in m['primitives']),
    'remaining': ['Production rights/style acceptance', 'Modular equipment', 'Unsupported action/pose clips', 'Crowd and low-end GPU qualification'],
}
(out / 'provenance.json').write_text(json.dumps(metadata, indent=2)+'\n')
print(json.dumps({k:metadata[k] for k in ['bytes','joints','triangles','sha256']}))
