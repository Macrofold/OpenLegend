"""Original posed people for the representative dimensional pixel-art study.

Blender --background --factory-startup --disable-autoexec --python-exit-code 1 \
  --python scripts/prepare-study-people.py -- [--draft]
No imported human, mercenary geometry, provider, world/save, or paid service.
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import begin, pixel_material, export_asset, finish

VARIANTS = ('quiet', 'crafted', 'graphic')
PEOPLE = {
    'mara': {'label': 'Mara Reed', 'height': 1.70, 'cloth': ['#3a4c4c', '#526968', '#758783', '#a1afa0'],
             'skin': ['#8b6049', '#b78461', '#d7a97e', '#e8c19a'],
             'hair': ['#302d2a', '#4c4034', '#766047'], 'description': 'Patched wool coat, crossed repair satchel and bound hair; visual proposal for the camp mender.'},
    'tavin': {'label': 'Tavin Vale', 'height': 1.78, 'cloth': ['#514734', '#786c47', '#a49665', '#c8b681'],
              'skin': ['#694c3d', '#956d50', '#bd9269', '#d5b18a'],
              'hair': ['#272b29', '#41463b', '#62644d'], 'description': 'Reed-woven vest, rolled sleeves, belt pouch and travel boots; visual proposal for the camp traveler.'},
    'armor': {'label': 'Kest · armor', 'height': 1.82, 'cloth': ['#343e43', '#505e62', '#7a8585', '#aab0a4'],
              'skin': ['#936a54', '#bb8d70', '#d9ad88', '#ecd0a5'],
              'hair': ['#302d2a', '#4b4239', '#71614e'], 'description': 'Padded jack, leather shoulder protection and layered mail study; visual proposal for the watchpost traveler.'},
}
REGIONS = {'face': (0, 64, 64, 64), 'cloth': (0, 0, 64, 64), 'leather': (64, 0, 32, 32),
           'trousers': (96, 0, 32, 64), 'hair': (64, 96, 32, 32), 'skin': (64, 64, 32, 32),
           'metal': (96, 96, 32, 32), 'lining': (96, 64, 32, 32), 'strap': (64, 32, 32, 32), 'sleeve': (5, 32, 20, 28)}


def atlas(identity, style, output):
    p = PEOPLE[identity]
    palette = p['cloth'] + p['skin'] + p['hair'] + ['#342e29', '#514333', '#786043', '#ad8b59', '#dfbd7d',
        '#d8d3b5', '#242d2e', '#8b6b53', '#343b3c', '#555f5d', '#858f88', '#b4b9a8', '#ae735d']
    cells = np.zeros((128, 128), dtype=np.int32)
    def rect(region, x, y, w, h, color):
        ox, oy, rw, rh = REGIONS[region]
        x0, y0 = max(0, x), max(0, y)
        x1, y1 = min(rw, x+w), min(rh, y+h)
        if x1 > x0 and y1 > y0:
            cells[oy+y0:oy+y1, ox+x0:ox+x1] = color
    def line(region, points, color, width=1):
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            count = max(abs(x1-x0), abs(y1-y0), 1)
            for k in range(count+1):
                t = k / count
                rect(region, round(x0+(x1-x0)*t), round(y0+(y1-y0)*t), width, width, color)
    for region, base in [('cloth', 1), ('face', 6), ('leather', 12), ('trousers', 19),
                          ('hair', 8), ('skin', 6), ('metal', 20), ('lining', 0), ('strap', 12)]:
        _, _, w, h = REGIONS[region]
        rect(region, 0, 0, w, h, base)
    # Broad folds, seams and material landmarks; no random noise or lit-image reduction.
    rect('cloth', 0, 0, 8, 64, 0)
    rect('cloth', 12, 8, 5, 14, 2)
    rect('cloth', 48, 7, 5, 17, 0)
    rect('cloth', 21, 42, 4, 11, 2)
    rect('cloth', 45, 42, 4, 11, 0)
    rect('cloth', 4, 3, 2, 54, 0)
    rect('cloth', 6, 6, 2, 45, 2)
    rect('cloth', 3, 2, 58, 3, 0)
    if identity == 'mara':
        rect('cloth', 8, 11, 12, 13, 0)
        rect('cloth', 10, 13, 8, 9, 2)
        rect('cloth', 42, 29, 12, 13, 2)
        rect('cloth', 44, 31, 8, 9, 1)
        if style == 'crafted':
            for x in range(8, 21, 4):
                rect('cloth', x, 11, 2, 1, 3)
                rect('cloth', x, 23, 2, 1, 3)
            for y in range(14, 23, 4):
                rect('cloth', 8, y, 1, 2, 3)
                rect('cloth', 19, y, 1, 2, 3)
            line('cloth', [(6, 49), (16, 46), (23, 48)], 3, 1)
            rect('cloth', 43, 39, 9, 1, 3)
        elif style == 'graphic':
            rect('cloth', 8, 11, 13, 13, 3)
            rect('cloth', 11, 14, 8, 8, 2)
            rect('cloth', 40, 6, 8, 18, 0)
            rect('cloth', 5, 57, 55, 3, 3)
    elif identity == 'tavin':
        # Woven panels describe reed fiber in grouped bands, not all-over speckle.
        for y in range(9, 59, 8 if style == 'quiet' else 6):
            rect('cloth', 5, y, 23, 2, 2)
            rect('cloth', 36, y, 22, 2, 2)
        if style == 'crafted':
            for x in (8, 16, 24, 37, 45, 53):
                for y in range(6, 59, 12):
                    rect('cloth', x, y, 2, 5, 3)
                    rect('cloth', x+2, y+6, 2, 5, 0)
        elif style == 'graphic':
            for x in (10, 20, 40, 50):
                line('cloth', [(x, 5), (x+5, 16), (x, 27), (x+5, 38), (x, 49), (x+5, 59)], 3, 2)
            rect('cloth', 29, 0, 6, 64, 0)
    else:
        # Quiet quilt, deliberately placed link clusters, or bold guarded panels.
        if style == 'quiet':
            for x in (10, 21, 42, 53):
                rect('cloth', x, 7, 2, 51, 0)
                rect('cloth', x+2, 9, 2, 46, 2)
        elif style == 'crafted':
            for y in range(8, 59, 8):
                for x in range(5+(y//8 % 2)*3, 58, 9):
                    rect('cloth', x, y, 6, 2, 2)
                    rect('cloth', x, y+2, 2, 3, 3)
                    rect('cloth', x+4, y+2, 2, 3, 0)
                    rect('cloth', x+1, y+5, 4, 1, 0)
        else:
            for x in (8, 19, 42, 53):
                rect('cloth', x, 7, 4, 51, 0)
                rect('cloth', x+4, 11, 3, 44, 3)
            rect('cloth', 5, 54, 55, 4, 3)
    # Leather edges, purposeful clasp and boot folds.
    for region in ('leather', 'strap'):
        rect(region, 0, 0, 32, 3, 11)
        rect(region, 2, 3, 3, 26, 13)
        rect(region, 28, 3, 3, 27, 11)
        line(region, [(8, 27), (18, 24), (26, 26)], 13, 2)
        if style != 'quiet':
            for y in range(5, 27, 5):
                rect(region, 6, y, 1, 2, 14)
    rect('metal', 0, 0, 7, 32, 19)
    rect('metal', 9, 0, 4, 32, 22)
    rect('metal', 13, 0, 8, 32, 21)
    rect('metal', 23, 0, 4, 32, 19)
    rect('trousers', 0, 0, 4, 64, 17)
    rect('trousers', 8, 4, 4, 56, 20)
    line('trousers', [(24, 60), (20, 34), (25, 19), (21, 1)], 17, 3)
    # Hair is grouped swept locks, not a single shiny helmet.
    for x, y, h in ((3, 8, 18), (10, 0, 23), (18, 5, 22), (26, 2, 20)):
        rect('hair', x, y, 3, h, 9)
        if style != 'quiet':
            rect('hair', x+3, y+3, 2, h-4, 10)
    # Dedicated face. Broad 3–4pixel cells yield ~16 meaningful vertical rows.
    rect('face', 0, 0, 12, 64, 4)
    rect('face', 52, 0, 12, 64, 4)
    rect('face', 12, 8, 40, 48, 5)
    rect('face', 16, 24, 32, 28, 6)
    rect('face', 20, 48, 28, 8, 7)
    rect('face', 16, 27, 12, 5, 7)
    rect('face', 40, 27, 9, 5, 6)
    rect('face', 28, 12, 13, 3, 5 if identity == 'mara' else 4)
    # Eyes: brow, pale inset, dark pupil and upper lid remain distinct.
    for x in (14, 39):
        rect('face', x+2, 42, 8, 2, 9)
        rect('face', x+1, 35, 10, 3, 16)
        rect('face', x+5, 35, 3, 4, 17)
        rect('face', x+2, 38, 8, 1, 4)
    rect('face', 31, 29, 4, 5, 7)
    rect('face', 35, 29, 3, 3, 5)
    rect('face', 31, 28, 6, 1, 5)
    rect('face', 27, 19, 13, 3, 18)
    rect('face', 30, 16, 8, 2, 7)
    if identity == 'armor':
        rect('face', 20, 10, 27, 7, 9)
        rect('face', 16, 16, 8, 9, 9)
        rect('face', 44, 16, 6, 9, 9)
        rect('face', 27, 19, 13, 3, 18)
    elif identity == 'tavin':
        rect('face', 16, 42, 8, 2, 9)
        rect('face', 41, 43, 8, 2, 9)
        rect('face', 27, 18, 13, 2, 18)
        rect('face', 37, 20, 5, 2, 18)
    if style == 'crafted':
        rect('face', 16, 29, 8, 3, 23)
        rect('face', 43, 29, 5, 3, 23)
        rect('face', 18, 39, 7, 1, 4)
        rect('face', 42, 39, 7, 1, 4)
    elif style == 'graphic':
        rect('face', 12, 22, 8, 13, 4)
        rect('face', 45, 24, 7, 10, 4)
        rect('face', 22, 48, 22, 7, 7)
        rect('face', 28, 19, 13, 3, 4)
    material = pixel_material(identity+'-'+style+'-atlas', palette, cells.tolist(), output)
    return material


def uv_project(obj, region, axes=(0, 2), bounds=None):
    mesh = obj.data
    uv = mesh.uv_layers.new(name='Authored fixed pixel islands')
    if bounds is None:
        bounds = [(min(v.co[i] for v in mesh.vertices), max(v.co[i] for v in mesh.vertices)) for i in axes]
    ox, oy, w, h = REGIONS[region]
    for loop in mesh.loops:
        co = mesh.vertices[loop.vertex_index].co
        u = (co[axes[0]]-bounds[0][0]) / max(.0001, bounds[0][1]-bounds[0][0])
        v = (co[axes[1]]-bounds[1][0]) / max(.0001, bounds[1][1]-bounds[1][0])
        uv.data[loop.index].uv = ((ox+1+u*(w-2))/128, (oy+1+v*(h-2))/128)


def mesh_object(name, vertices, faces, material, region, smooth=True, axes=(0, 2), bounds=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    for face in mesh.polygons:
        face.use_smooth = smooth
    uv_project(obj, region, axes, bounds)
    return obj


def volume(name, sections, material, region, steps=12, smooth=True, bounds=None):
    # Each sewn volume is closed. Clothing is the visible body surface;
    # there is no hidden naked mesh that can poke through during orbit.
    vertices = [(cx+rx*math.sin(i*math.tau/steps), cy-ry*math.cos(i*math.tau/steps), z)
                for z, cx, cy, rx, ry in sections for i in range(steps)]
    faces = []
    for j in range(len(sections)-1):
        for i in range(steps):
            a = j*steps+i
            b = j*steps+(i+1)%steps
            faces.append((a, b, b+steps, a+steps))
    faces.extend([tuple(range(steps-1, -1, -1)), tuple((len(sections)-1)*steps+i for i in range(steps))])
    return mesh_object(name, vertices, faces, material, region, smooth, bounds=bounds)


def plate(name, points, thickness, material, region, bevel=0):
    vertices = [(x, y, z) for x, y, z in points] + [(x, y+thickness, z) for x, y, z in points]
    n = len(points)
    faces = [tuple(range(n-1, -1, -1)), tuple(range(n, n*2))]
    faces.extend((i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n))
    return mesh_object(name, vertices, faces, material, region, False)


def ribbon(name, points, width, depth, material, region):
    # Closed straps follow intentionally chosen contact positions.
    front = []
    for i, p in enumerate(points):
        d = Vector(points[min(i+1,len(points)-1)]) - Vector(points[max(0,i-1)])
        tangent = Vector((d.z, 0, -d.x)).normalized()*width/2
        front.append(Vector(p)+tangent)
    for i, p in reversed(list(enumerate(points))):
        d = Vector(points[min(i+1,len(points)-1)]) - Vector(points[max(0,i-1)])
        tangent = Vector((d.z, 0, -d.x)).normalized()*width/2
        front.append(Vector(p)-tangent)
    return plate(name, front, depth, material, region)


def person(identity, style, output):
    material = atlas(identity, style, output)
    p = PEOPLE[identity]
    objects = []
    def add(obj):
        objects.append(obj)
        return obj
    width = .95 if identity == 'mara' else 1.04 if identity == 'armor' else 1
    # Trousers form separate tapered legs, with a small natural stagger.
    for side in (-1, 1):
        foot_y = -.025 if side == -1 else .025
        add(volume('Fitted trouser '+str(side), [(.16, side*.095, foot_y, .054, .052),
            (.47, side*.09, 0, .069, .068), (.72, side*.09, .006, .081, .076),
            (.91, side*.082, .006, .086, .087)], material, 'trousers', 10))
        add(volume('Stitched boot '+str(side), [(.025, side*.095, foot_y-.036, .064, .124),
            (.075, side*.095, foot_y-.035, .062, .119), (.14, side*.095, foot_y+.006, .057, .065),
            (.245, side*.095, foot_y+.01, .058, .064)], material, 'leather', 10))
        add(volume('Boot sole '+str(side), [(.008, side*.095, foot_y-.035, .067, .127),
            (.031, side*.095, foot_y-.035, .067, .127)], material, 'lining', 10, False))
    coat_hem = .66 if identity == 'mara' else .89 if identity == 'tavin' else .83
    add(volume('Coat body' if identity == 'mara' else 'Woven vest' if identity == 'tavin' else 'Padded jack',
        [(coat_hem, 0, .014, .19*width, .113), (.91, 0, .012, .166*width, .108),
         (1.08, 0, .008, .144*width, .103), (1.25, 0, .003, .178*width, .114),
         (1.36, 0, .005, .205*width, .111), (1.41, 0, .006, .153*width, .089)], material, 'cloth', 16))
    # A shaped collar surrounds a closed neck, rather than intersecting paper lapels.
    add(volume('Neck', [(1.385, 0, .002, .058, .054), (1.515, 0, .002, .061, .056)], material, 'skin', 10))
    add(volume('Bound collar', [(1.386, 0, -.001, .085, .074), (1.478 if identity == 'mara' else 1.46, 0, -.001, .072, .065)], material, 'leather', 12))
    for side in (-1, 1):
        cuff_z = .99 if identity == 'tavin' else .86
        add(volume('Tailored sleeve '+str(side), [(cuff_z, side*.254, -.024, .054, .059),
            (1.08, side*.249, -.014, .062, .072), (1.29, side*.224, .005, .078, .084),
            (1.365, side*.177, .008, .083, .082)], material, 'lining' if identity=='tavin' else 'sleeve', 10))
        if identity == 'tavin':
            add(volume('Rolled sleeve '+str(side), [(.974, side*.254, -.024, .061, .065),
                (1.022, side*.254, -.024, .063, .066)], material, 'leather', 10))
            add(volume('Forearm '+str(side), [(.825, side*.264, -.042, .037, .039),
                (.975, side*.254, -.025, .048, .047)], material, 'skin', 10))
        else:
            add(volume('Cuff '+str(side), [(.838, side*.254, -.024, .057, .063),
                (.89, side*.254, -.024, .058, .064)], material, 'leather', 10))
        add(volume('Hand '+str(side), [(.741, side*.264, -.041, .029, .022),
            (.765, side*.267, -.046, .037, .029), (.815, side*.263, -.042, .039, .031),
            (.855, side*.255, -.027, .031, .028)], material, 'skin', 10))
        add(volume('Thumb '+str(side), [(.782, side*.233, -.064, .018, .018),
            (.829, side*.232, -.055, .018, .02)], material, 'skin', 8))
    # Belt encloses the actual coat; no hidden trunk mesh.
    add(volume('Belt', [(1.035, 0, .007, .153*width, .115),
        (1.086, 0, .007, .153*width, .115)], material, 'strap', 16))
    add(plate('Belt clasp', [(-.031,-.116,1.043),(.031,-.116,1.043),(.031,-.116,1.078),(-.031,-.116,1.078)], .014, material, 'metal'))
    # Shaped jaw/chin, cheek volume and a real three-dimensional nose.
    chin_z = 1.49 if identity == 'mara' else 1.472
    jaw_z = 1.518 if identity == 'mara' else 1.495
    head = add(volume('Shaped face', [(chin_z,0,-.008,.043,.048), (jaw_z,0,-.01,.06,.067),
        (1.55,0,.002,.087 if identity=='tavin' else .083,.079), (1.625,0,.005,.094 if identity=='tavin' else .089,.083),
        (1.69,0,.008,.079,.078), (1.726,0,.011,.058,.06)], material, 'face', 20,
        bounds=[(-.096,.096) if identity=='tavin' else (-.09,.09),(1.472,1.726)]))
    nose_vertices=[(-.010,-.078,1.613),(.010,-.078,1.613),(-.012,-.079,1.583),
        (.012,-.079,1.583),(0,-.091,1.593)]
    nose_faces=[(0,1,4),(1,3,4),(3,2,4),(2,0,4),(0,2,3,1)]
    centroid=sum((Vector(p) for p in nose_vertices),Vector())/len(nose_vertices)
    for i,face in enumerate(nose_faces):
        points=[Vector(nose_vertices[v]) for v in face]
        normal=(points[1]-points[0]).cross(points[2]-points[0])
        if normal.dot(sum(points,Vector())/len(points)-centroid)<0:
            nose_faces[i]=tuple(reversed(face))
    add(mesh_object('Small shaped nose',nose_vertices,nose_faces,material,'skin',False))
    for side in (-1, 1):
        add(volume('Ear '+str(side), [(1.557,side*.086,.004,.014,.013),
            (1.59,side*.094,.002,.018,.018),(1.627,side*.088,.005,.014,.014)], material, 'skin', 8))
    # Irregular scalp dome + side lock volumes retain a human head silhouette.
    add(volume('Hair crown', [(1.667,0,.028,.091,.072), (1.711,-.005,.021,.083,.077),
        (1.752,-.008,.025,.054,.051), (1.765,-.009,.023,.015,.016)], material, 'hair', 14, False))
    # A rear scalp surface prevents face paint appearing through the back of the head.
    hair_vertices=[]
    hair_faces=[]
    for z,rx,ry in [(1.51 if identity=='mara' else 1.558,.077,.081),(1.63,.094,.09),(1.704,.081,.082)]:
        for i in range(13):
            angle=math.pi/2+i*math.pi/12
            hair_vertices.append((rx*math.sin(angle),.008-ry*math.cos(angle),z))
    for j in range(2):
        for i in range(12):
            a=j*13+i
            hair_faces.append((a,a+1,a+14,a+13))
    add(mesh_object('Rear hair surface',hair_vertices,hair_faces,material,'hair',False))
    # Swept fringe leaves both eyebrows visible from the front.
    add(plate('Swept fringe', [(-.083,-.069,1.673),(-.073,-.071,1.724),(.035,-.074,1.741),
        (.082,-.066,1.698),(.031,-.081,1.694),(.008,-.081,1.712),(-.027,-.081,1.683)], .029, material, 'hair'))
    for side in (-1,1):
        add(volume('Side lock '+str(side), [(1.596 if identity=='armor' else 1.56, side*.079,.022,.018,.028),
            (1.676,side*.085,.016,.019,.037)], material, 'hair', 8, False))
    if identity == 'mara':
        add(volume('Bound braid', [(1.273,.096,.066,.019,.019),(1.32,.101,.066,.03,.027),
            (1.377,.093,.065,.026,.026),(1.432,.089,.062,.032,.03),
            (1.49,.082,.058,.031,.032),(1.59,.07,.045,.033,.035)], material, 'hair', 8, False))
        add(volume('Braid binding', [(1.296,.099,.067,.026,.027),(1.316,.099,.067,.026,.027)], material, 'leather',8))
        add(volume('Repair satchel', [(.824,.171,-.081,.067,.035),(.855,.177,-.082,.082,.047),
            (.959,.172,-.084,.081,.044),(.983,.167,-.078,.063,.037)], material, 'leather', 10))
        add(plate('Satchel folded flap', [(.095,-.13,.98),(.241,-.13,.98),(.239,-.134,.934),
            (.177,-.141,.914),(.098,-.134,.934)],.016,material,'strap'))
        add(ribbon('Crossed satchel strap', [(-.128,-.074,1.4),(-.081,-.119,1.32),
            (.01,-.123,1.19),(.095,-.12,1.057),(.172,-.134,.97)], .026,.012,material,'strap'))
    elif identity == 'tavin':
        add(volume('Belt pouch', [(.887,-.161,-.065,.052,.033),(.958,-.169,-.082,.062,.04),
            (1.022,-.164,-.076,.057,.037)], material,'leather',10))
    else:
        # Rigid tailored leather protection has real thickness; continuous jack below.
        for side in (-1,1):
            add(volume('Leather shoulder guard '+str(side), [(1.267,side*.202,.004,.087,.094),
                (1.347,side*.197,.008,.103,.108),(1.391,side*.173,.009,.082,.092)],material,'leather',10,False))
            add(volume('Forearm guard '+str(side), [(.88,side*.254,-.025,.064,.069),
                (1.001,side*.254,-.018,.067,.074)],material,'leather',10,False))
        add(plate('Jack split hem panel', [(-.154,-.094,.956),(.154,-.094,.956),(.147,-.102,.833),
            (.019,-.12,.82),(0,-.115,.87),(-.019,-.12,.82),(-.147,-.102,.833)],.035,material,'cloth'))
    # Slightly shorter facial proportions keep brows, eyes and mouth together.
    for obj in objects:
        if obj.name.startswith(('Shaped face','Small shaped nose','Ear ','Hair crown','Rear hair','Swept fringe','Side lock')):
            for vertex in obj.data.vertices:
                vertex.co.z=1.61+(vertex.co.z-1.61)*.93
    # Fit once at authoring; camera motion and zoom never change pixels or model size.
    if identity == 'tavin':
        for obj in objects:
            if obj.name.startswith('Swept fringe'):
                for vertex in obj.data.vertices:
                    vertex.co.x *= -1
    top = max((obj.matrix_world@v.co).z for obj in objects for v in obj.data.vertices)
    bottom = min((obj.matrix_world@v.co).z for obj in objects for v in obj.data.vertices)
    scale = p['height']/(top-bottom)
    for obj in objects:
        for v in obj.data.vertices:
            v.co.x *= scale
            v.co.y *= scale
            v.co.z = (v.co.z-bottom)*scale
    return objects


def draft_render(objects):
    for obj in bpy.context.scene.objects:
        obj.hide_render = obj not in objects
    world = bpy.data.worlds.new('Neutral studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.24,.28,.29,1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .8
    bpy.context.scene.world = world
    camera_data = bpy.data.cameras.new('Study camera')
    camera = bpy.data.objects.new('Study camera',camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location=(2.8,-5,2.6)
    camera.rotation_euler=(Vector((0,0,.86))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.type='ORTHO'
    camera_data.ortho_scale=2.05
    bpy.context.scene.camera=camera
    for name,location,energy,size in [('Key',(-3,-4,5),450,4),('Fill',(4,-2,3),160,3)]:
        data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.shape='DISK'; data.size=size
        lamp=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(lamp); lamp.location=location
        lamp.rotation_euler=(Vector((0,0,1))-lamp.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.device='CPU'
    scene.cycles.samples=16
    scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED'
    scene.render.threads=4
    scene.render.resolution_x=640; scene.render.resolution_y=800; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='Standard'
    scene.render.filepath='/private/tmp/openlegend-study-mara-draft.png'
    bpy.ops.render.render(write_still=True)
    scene.render.resolution_x=128; scene.render.resolution_y=160
    scene.render.filepath='/private/tmp/openlegend-study-mara-128.png'
    bpy.ops.render.render(write_still=True)


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--draft',action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    output,source=begin('people')
    entries=[]
    for row,identity in enumerate(PEOPLE):
        for col,style in enumerate(VARIANTS):
            if args.draft and (identity,style)!=('mara','quiet'):
                continue
            objects=person(identity,style,output)
            if args.draft:
                draft_render(objects)
                return
            item,root=export_asset(objects,output,identity+'-'+style,identity,
                PEOPLE[identity]['label'],style,PEOPLE[identity]['description']+' '+
                {'quiet':'Broad quiet paint and restrained seams.', 'crafted':'Authored stitching, woven groups or open mail clusters.',
                 'graphic':'Bolder edge bands and high-contrast face/material grouping.'}[style],
                recommended=(style=='crafted' if identity in ('mara','tavin') else style=='quiet'))
            entries.append(item)
            root.location=(col*1.1,row*1.3,0)
    finish('people',entries,output,source,[
        'Nine original static posed human studies. Named characters are visual proposals, not changed native identities or loadouts.',
        'One 128x128 nearest-sampled fixed painted atlas per subject/finish; dedicated 64x64 face with 3–4 texel grouped cells and deliberate eyes.',
        'Continuous shaped human geometry with closed thick clothing; no naked mesh underneath. No extra screen-space pixelation or cubic anatomy.',
        'Mara 1.70m, Tavin 1.78m, Kest armor 1.82m. Static art only: no claim of animation, equipped-item compatibility or physical cloth support.',
        'One mesh/material per runtime figure. Separate tailored parts remain editable in the Blender source.',
        'No imported human geometry, reference-game artwork, provider call or unresolved mercenary derivative.'
    ])

if __name__=='__main__':
    main()
