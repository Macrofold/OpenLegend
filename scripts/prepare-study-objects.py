"""Author the finite chest, sword and shield studies in Blender.

Run with Blender --background --factory-startup --disable-autoexec --python.
All designs and painted pixels here are original OpenLegend work. Camera motion
does not participate in their construction. --draft limits work to two leaders;
--render writes a small CPU review image outside the repository.
"""
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import begin, box_uv, export_asset, finish, pixel_material, solid_material


def rectangle(cells, x, y, width, height, color):
    for row in range(max(y, 0), min(y + height, len(cells))):
        for col in range(max(x, 0), min(x + width, len(cells[0]))):
            cells[row][col] = color


def paints(output, variant):
    wood_colors = {
        'quiet': ['#302d2a', '#655741', '#92805c', '#b19b70', '#d1ba84'],
        'crafted': ['#302b29', '#5b4032', '#876044', '#ae8255', '#d3ae73'],
        'graphic': ['#292e38', '#573e3b', '#8c5448', '#b77556', '#d9a26a'],
    }
    # Sparse grain bands leave most of each plank quiet. Knots use small joined
    # clusters, not a noise generator; the scale is fixed in physical metres.
    wood = [[2] * 64 for _ in range(64)]
    strokes = [(1, 5, 18, 1, 3), (4, 6, 10, 1, 3), (30, 7, 24, 1, 1),
        (40, 8, 12, 1, 1), (12, 18, 28, 1, 3), (19, 19, 8, 1, 3),
        (4, 26, 20, 1, 1), (9, 27, 11, 1, 1), (34, 37, 25, 1, 3),
        (38, 38, 14, 1, 3), (2, 48, 31, 1, 1), (12, 49, 10, 1, 1),
        (35, 57, 21, 1, 3), (40, 58, 10, 1, 3)]
    for stroke in strokes:
        rectangle(wood, *stroke)
    for x, y in [(20, 32), (48, 15)]:
        for dx, dy, w, c in [(0, 0, 7, 1), (-2, 1, 11, 1), (0, 2, 7, 1),
                              (2, 1, 3, 0), (-2, 3, 7, 3)]:
            rectangle(wood, x + dx, y + dy, w, 1, c)
    if variant == 'graphic':
        for x, y, width in [(2, 11, 14), (32, 32, 21), (8, 53, 18)]:
            rectangle(wood, x, y, width, 2, 3)
    timber = pixel_material('chest-' + variant + '-timber', wood_colors[variant], wood, output)

    iron_colors = ['#242b33', '#3b4852', '#61717a', '#9ca9a9', '#d0d1bd']
    iron = [[1] * 32 for _ in range(32)]
    for x, y, width, height, color in [(1, 2, 2, 19, 2), (2, 2, 1, 7, 3),
        (22, 9, 4, 2, 0), (24, 10, 3, 2, 0), (9, 22, 10, 1, 2),
        (9, 23, 6, 1, 2), (18, 2, 4, 1, 3), (4, 29, 7, 1, 0)]:
        rectangle(iron, x, y, width, height, color)
    iron_mat = pixel_material('objects-' + variant + '-forged-iron', iron_colors, iron, output, .72, .18)
    brass = solid_material('objects-' + variant + '-warm-brass', '#b09b69', .66, .25)
    seam = solid_material('objects-' + variant + '-deep-seam', '#292b30')
    grip = [[2] * 16 for _ in range(32)]
    for y in range(1, 32, 6):
        rectangle(grip, 0, y, 16, 1, 1)
        rectangle(grip, 1, y + 1, 7, 1, 3)
    leather = pixel_material('objects-' + variant + '-leather-wrap',
        ['#292727', '#493d35', '#766047', '#a18762'], grip, output)
    return {'wood': timber, 'iron': iron_mat, 'brass': brass, 'seam': seam, 'leather': leather}


def mesh(name, points, faces, material, density=32, texture_size=64):
    data = bpy.data.meshes.new(name)
    data.from_pydata(points, [], faces)
    data.update()
    # Closed handmade sections can use either drawing order; export consistent
    # outward normals rather than relying on a double-sided material to hide it.
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    box_uv(obj, density, texture_size)
    return obj


def bevel(obj, amount=.008):
    modifier = obj.modifiers.new('Small worn construction edges', 'BEVEL')
    modifier.width = amount
    modifier.segments = 1
    modifier.affect = 'EDGES'
    modifier = obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
    modifier.keep_sharp = True
    return obj


def box(name, location, scale, material, amount=.008, density=32, texture_size=64):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    box_uv(obj, density, texture_size)
    return bevel(obj, amount) if amount else obj


def cylinder(name, location, radius, depth, material, rotation=(math.pi / 2, 0, 0), vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
        location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    box_uv(obj, 64, 32)
    return bevel(obj, min(.002, radius / 5))


def rivet(name, point, mat, radius=.008):
    return cylinder(name, point, radius, .006, mat, vertices=8)


def strip(name, x, halfwidth, section, material, thickness=.011):
    """A closed iron strap follows the same physical lid curve as the timber."""
    points = []
    for y, z in section:
        points.extend([(x - halfwidth, y, z), (x + halfwidth, y, z),
                       (x - halfwidth, y, z - thickness), (x + halfwidth, y, z - thickness)])
    faces = []
    for i in range(len(section) - 1):
        a, b = i * 4, (i + 1) * 4
        faces.extend([(a, a + 1, b + 1, b), (a + 2, b + 2, b + 3, a + 3),
                      (a, b, b + 2, a + 2), (a + 1, a + 3, b + 3, b + 1)])
    faces.extend([(0, 2, 3, 1), (len(points)-4, len(points)-3, len(points)-1, len(points)-2)])
    return bevel(mesh(name, points, faces, material, 64, 32), .002)


def chest(variant, materials):
    objects = []
    wood, iron, brass, seam = [materials[key] for key in ('wood', 'iron', 'brass', 'seam')]
    width, depth, base = .85, .52, .415
    objects.append(box('Shadow between the chest planks', (0, 0, .26), (.82, .495, .34), seam, .012))
    # These horizontal boards have actual narrow joints and softly worn corners.
    for course in range(3):
        z = .13 + course * .105
        for y in (-depth / 2, depth / 2):
            objects.append(box('Separate long oak plank', (0, y, z), (width, .035, .10), wood, .006))
        for x in (-width / 2, width / 2):
            objects.append(box('Separate end oak plank', (x, 0, z), (.035, depth-.025, .10), wood, .006))
    for x in (-.335, .335):
        for y in (-.20, .20):
            objects.append(box('Short inset chest foot', (x, y, .05), (.11, .105, .10), iron if variant == 'graphic' else wood, .012))
    arch = .035 if variant == 'quiet' else .17 if variant == 'crafted' else .135
    steps = 7 if variant == 'crafted' else 5
    section = [(-.277 + .554 * i / steps, base + arch * math.sin(math.pi * i / steps)) for i in range(steps + 1)]
    # Thick curved slats and closed wooden end caps have no alpha cards.
    for i in range(steps):
        y1, z1 = section[i]
        y2, z2 = section[i + 1]
        inset = .0015
        points = [(x, y, z) for x in (-.445, .445) for y, z in
            [(y1+inset, z1), (y2-inset, z2), (y2-inset, z2-.028), (y1+inset, z1-.028)]]
        objects.append(bevel(mesh('Arched timber lid stave', points,
            [(0, 4, 5, 1), (3, 2, 6, 7), (0, 1, 2, 3), (4, 7, 6, 5), (1, 5, 6, 2), (0, 3, 7, 4)], wood), .003))
    cap = [(-.277, base-.025)] + section + [(.277, base-.025)]
    for x in (-.429, .429):
        points = [(x + dx, y, z) for dx in (-.012, .012) for y, z in cap]
        n = len(cap)
        faces = [tuple(range(n-1, -1, -1)), tuple(range(n, n*2))]
        faces.extend((i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n))
        objects.append(bevel(mesh('Solid arched lid end', points, faces, wood), .003))
    positions = (-.31, .31) if variant == 'quiet' else (-.285, .285)
    strap_width = .022 if variant == 'quiet' else .032
    for x in positions:
        for y in (-.284, .284):
            objects.append(box('Forged corner binding', (x, y, .25), (strap_width*2, .014, .335), iron, .003, 64, 32))
        strap_section = [(y, z+.009) for y, z in section]
        objects.append(strip('Continuous iron lid binding', x, strap_width, strap_section, iron))
        for z in (.12, .32, .4):
            objects.append(rivet('Set iron nail', (x, -.292, z), brass if variant == 'crafted' else iron))
        # Rear hinge is recognizable when the object is orbited.
        objects.append(box('Rear hinge leaf', (x, .285, .372), (.065, .016, .10), iron, .003, 64, 32))
        objects.append(cylinder('Hinge knuckle', (x, .291, .418), .014, .085, iron, (0, math.pi/2, 0)))
    objects.append(box('Latch plate', (0, -.288, .342), (.076, .016, .13), iron, .006, 64, 32))
    objects.append(box('Latch over the lid joint', (0, -.297, .412), (.045, .02, .09), iron, .004, 64, 32))
    objects.append(rivet('Latch pin', (0, -.307, .414), brass, .011))
    # The keyhole is a deliberately readable shape rather than a random dark mark.
    objects.append(cylinder('Keyhole eye', (0, -.3, .338), .009, .003, seam, vertices=8))
    objects.append(box('Keyhole stem', (0, -.302, .328), (.01, .003, .015), seam, .001))
    if variant != 'quiet':
        for sign in (-1, 1):
            handle = [(sign*.448, y, z) for y, z in [(-.075,.29),(-.06,.255),(.06,.255),(.075,.29)]]
            for a, b in zip(handle, handle[1:]):
                objects.append(beam('Forged carrying handle', a, b, .013, iron))
    if variant == 'graphic':
        # A fitted chevron is distinct construction, not just a palette swap.
        for sign in (-1, 1):
            objects.append(beam('Diagonal front iron brace', (sign*.07,-.292,.12), (sign*.275,-.292,.375), .024, iron))
        objects.append(box('Warm maker mark', (0,-.306,.22), (.043,.004,.035), brass, .003))
    return objects


def beam(name, start, end, radius, material):
    a, b = Vector(start), Vector(end)
    obj = cylinder(name, (a+b)*.5, radius, (b-a).length, material, (0,0,0), vertices=8)
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return obj


def blade_paint(output, variant):
    colors = ['#2e3d48', '#526571', '#87959b', '#b6bfb9', '#e2dfc4']
    cells = [[2] * 32 for _ in range(128)]
    # A long asymmetric reflected band, edge glints and the fuller follow the
    # blade, with long quiet metal fields between their authored stepped changes.
    for y in range(128):
        for x in range(32):
            if x < 3 or x > 28:
                cells[y][x] = 3
            if x in (0,31):
                cells[y][x] = 4
            if 6 <= x < 11:
                cells[y][x] = 3
            if variant == 'crafted' and 14 <= x <= 17 and 10 < y < 111:
                cells[y][x] = 1
            if variant == 'graphic' and x < 19:
                cells[y][x] = 1
        start = 7 if y < 23 else 9 if y < 48 else 8 if y < 82 else 10
        rectangle(cells, start, y, 2, 1, 4 if variant != 'graphic' else 3)
    if variant == 'quiet':
        rectangle(cells, 22, 39, 3, 11, 1)
        rectangle(cells, 24, 48, 2, 8, 1)
    elif variant == 'crafted':
        for x, y, w in [(20, 19, 5), (22, 20, 3), (4, 79, 3), (5, 80, 2)]:
            rectangle(cells, x, y, w, 1, 4)
    else:
        # Five joined gilt maker's cuts, kept near the forte.
        for x, y, w, h in [(14, 11, 2, 12), (12, 20, 6, 2), (12, 13, 6, 2), (18, 15, 2, 4)]:
            rectangle(cells, x, y, w, h, 4)
    return pixel_material('sword-' + variant + '-steel', colors, cells, output, .64, .22)


def blade_mesh(material, variant):
    # Physical, closed diamond/hexagonal section. A highlighted texture never
    # substitutes for actual blade thickness or creates detached bright cards.
    rings = [( .23, .027, .0055), (.32,.027,.005), (.72,.022,.004), (.91,.014,.003)]
    if variant == 'quiet':
        rings = [(.23,.024,.005), (.33,.025,.005), (.72,.019,.004), (.91,.011,.003)]
    elif variant == 'graphic':
        rings = [(.23,.034,.007), (.30,.034,.006), (.72,.024,.0045), (.90,.014,.003)]
    points = []
    for z, w, t in rings:
        points.extend([(-w,0,z),(-w*.55,-t,z),(w*.55,-t,z),(w,0,z),(w*.55,t,z),(-w*.55,t,z)])
    points.append((0,0,1.0))
    faces = [tuple(range(5,-1,-1))]
    for ring in range(len(rings)-1):
        for i in range(6):
            faces.append((ring*6+i,ring*6+(i+1)%6,(ring+1)*6+(i+1)%6,(ring+1)*6+i))
    for i in range(6):
        faces.append(((len(rings)-1)*6+i,(len(rings)-1)*6+(i+1)%6,len(points)-1))
    obj = mesh('Closed tapered steel blade', points, faces, material)
    uv = obj.data.uv_layers.active
    for polygon in obj.data.polygons:
        for index in polygon.loop_indices:
            vertex=obj.data.loops[index].vertex_index
            p = obj.data.vertices[vertex].co
            width=rings[vertex//6][1] if vertex < len(points)-1 else .001
            uv.data[index].uv = (p.x/(width*2)+.5, (p.z-.23)/.77)
    return obj


def sword(variant, materials, output):
    iron, brass, leather = [materials[key] for key in ('iron','brass','leather')]
    steel = blade_paint(output, variant)
    objects = [blade_mesh(steel, variant)]
    objects.append(box('Blade tang seated through the guard', (0,0,.221), (.034,.011,.05), iron,.001,64,32))
    objects.append(cylinder('Oval wrapped sword grip', (0,0,.132), .017, .14, leather, (0,0,0), 10))
    objects[-1].scale.y = .77
    if variant == 'quiet':
        objects.append(box('Simple forged straight guard', (0,0,.215), (.19,.028,.021), iron,.007,64,32))
        objects.append(cylinder('Plain wheel pommel', (0,0,.035), .029,.025, iron, vertices=12))
        objects.append(rivet('Pommel peen', (0,-.016,.035), brass,.009))
    elif variant == 'crafted':
        for sign in (-1,1):
            objects.append(beam('Swept crossguard root', (0,0,.213), (sign*.071,0,.211), .014, iron))
            objects.append(beam('Swept crossguard tip', (sign*.071,0,.211), (sign*.108,0,.187), .012, iron))
            objects.append(cylinder('Faceted quillon end', (sign*.108,0,.188), .016,.025, brass, vertices=8))
        objects.append(cylinder('Raised wheel pommel', (0,0,.035), .031,.026, iron, vertices=12))
        objects.append(cylinder('Pommel bronze face', (0,-.015,.035), .02,.008, brass, vertices=8))
        objects.append(cylinder('Dark pommel center', (0,-.021,.035), .01,.004, iron, vertices=8))
    else:
        for sign in (-1,1):
            objects.append(beam('Downturned broad guard', (0,0,.218), (sign*.086,0,.19), .018, brass))
            objects.append(box('Forged dark quillon cap', (sign*.087,0,.191), (.029,.033,.033), iron,.006,64,32))
        pommel = cylinder('Octagonal counterweight', (0,0,.034), .031,.032, brass, vertices=8)
        objects.append(pommel)
        objects.append(cylinder('Dark pommel medallion', (0,-.018,.034), .018,.005, iron, vertices=8))
    for z in (.068,.197):
        objects.append(cylinder('Fitted grip ferrule', (0,0,z), .018,.009, iron, (0,0,0),10))
        objects[-1].scale.y=.8
    return objects


def shield(variant, materials):
    wood, iron, leather, brass = [materials[key] for key in ('wood','iron','leather','brass')]
    objects = []
    # A shallow curved body reads as joined boards, never a flat alpha billboard.
    radius = .33
    if variant == 'quiet':
        outline = [(radius*math.sin(a*math.tau/16), .36+radius*math.cos(a*math.tau/16)) for a in range(16)]
    elif variant == 'crafted':
        outline = [(-.30,.71),(.30,.71),(.32,.45),(.24,.20),(0,.01),(-.24,.20),(-.32,.45)]
    else:
        outline = [(-.28,.72),(.28,.72),(.33,.56),(.27,.21),(0,.01),(-.27,.21),(-.33,.56)]
    # Fill each width interval with a vertically clipped plank using the exact
    # silhouette; narrow dark joint lines are physical gaps over the backing.
    def clipped(poly, boundary, lower):
        result=[]
        for a,b in zip(poly,poly[1:]+poly[:1]):
            ain = a[0]>=boundary if lower else a[0]<=boundary
            bin = b[0]>=boundary if lower else b[0]<=boundary
            if ain: result.append(a)
            if ain != bin:
                t=(boundary-a[0])/(b[0]-a[0])
                result.append((boundary,a[1]+(b[1]-a[1])*t))
        return result
    def panel(name, polygon, material, y, thick):
        points=[(x,y+offset,z) for offset in (0,thick) for x,z in polygon]
        n=len(polygon)
        faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
        faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
        return mesh(name,points,faces,material)
    objects.append(panel('Solid shield backing', outline, iron, .001,.032))
    for i in range(7):
        left=-.35+i*.10+.002
        right=left+.096
        polygon=clipped(clipped(outline,left,True),right,False)
        if len(polygon)>=3:
            plank=panel('Fitted vertical wooden shield board', polygon, wood,-.012,.02)
            for uv in plank.data.uv_layers.active.data:
                uv.uv=(uv.uv.y,uv.uv.x)
            objects.append(plank)
    if variant != 'quiet':
        # The graphic design has fitted metal braces; the crafted design has
        # narrow edge plates. Both keep the wooden field readable.
        if variant == 'graphic':
            for x in (-.18,.18):
                objects.append(box('Vertical shield iron reinforcement',(x,-.028,.47),(.026,.014,.44),iron,.003,64,32))
            objects.append(box('Horizontal shield iron reinforcement',(0,-.029,.43),(.54,.014,.029),iron,.003,64,32))
        for a,b in zip(outline,outline[1:]+outline[:1]):
            objects.append(beam('Forged protective rim',(a[0],-.014,a[1]),(b[0],-.014,b[1]),.012,iron))
    # Closed low dome with concentric bevel rings, not a hemisphere of cubes.
    center_z=.36 if variant=='quiet' else .43
    rings=[(.105,-.012),(.064,-.051),(.036,-.08)]
    points=[(r*math.sin(i*math.tau/12),y,center_z+r*math.cos(i*math.tau/12)) for r,y in rings for i in range(12)]
    points.append((0,-.09,center_z))
    faces=[]
    for ring in range(2):
        faces.extend((ring*12+i,ring*12+(i+1)%12,(ring+1)*12+(i+1)%12,(ring+1)*12+i) for i in range(12))
    faces.extend((24+i,24+(i+1)%12,36) for i in range(12))
    faces.append(tuple(range(11,-1,-1)))
    objects.append(mesh('Faceted raised shield boss',points,faces,iron,64,32))
    for x,z in [(-.086,center_z),(.086,center_z),(0,center_z+.086),(0,center_z-.086)]:
        objects.append(rivet('Shield boss fastener',(x,-.032,z),brass if variant=='crafted' else iron,.008))
    # Back straps and grip are visible from the rear inspection view.
    for z in (center_z-.10,center_z+.10):
        objects.append(box('Back leather arm strap',(0,.066,z),(.25,.022,.04),leather,.006,64,16))
    objects.append(box('Rear wooden hand grip',(0,.092,center_z),(.035,.045,.21),wood,.009))
    return objects


DESCRIPTIONS = {
    'chest': {
        'quiet': 'Low flat lid, pale worn planks and sparse corner iron. Quiet portable storage; little ornament.',
        'crafted': 'Seven-stave arched oak lid, continuous forged bindings, real hinges, carrying handles and a clear keyed latch.',
        'graphic': 'Broad copper-red timber, shallow pentagonal arch, dark chevron braces and a warm maker mark.',
    },
    'sword': {
        'quiet': 'Narrow tapered blade, straight iron guard and plain wheel pommel; simple stepped blade reflection.',
        'crafted': 'Shaped steel blade with a painted fuller, swept quillons, wrapped oval grip and inset bronze wheel pommel.',
        'graphic': 'Broad dark blade, long stepped reflection and gilt maker cuts; downturned bronze guard with dark capped tips.',
    },
    'shield': {
        'quiet': 'Simple round wooden board shield, low iron boss and rear straps. Sparse fixed grain.',
        'crafted': 'Tapered kite silhouette, close-fitted vertical boards, protective rim, bronze boss nails and visible rear straps.',
        'graphic': 'Clipped shoulders, broad dark iron cross braces and a raised boss over copper-red boards.',
    },
}


def review_render(path, roots):
    # CPU-only review: isolated lighting and equal-scale leader objects. The
    # normal study uses actual GLBs in PlayCanvas; this is an authoring check.
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH': obj.hide_render=True
    for root in roots:
        for child in root.children_recursive:
            child.hide_render=False
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.device='CPU'
    scene.cycles.samples=24
    scene.render.threads_mode='FIXED'
    scene.render.threads=4
    scene.render.resolution_x=1200
    scene.render.resolution_y=850
    scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Neutral study sky')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.18,.22,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
    ground=solid_material('Review ground','#565d5d')
    box('Review floor',(1,0,-.04),(5,5,.06),ground,.005)
    for name,location,power,size in [('Broad sky',(-2,-3,5),650,4),('Warm edge',(3,2,4),450,3)]:
        data=bpy.data.lights.new(name,'AREA')
        data.energy=power
        data.shape='DISK'
        data.size=size
        obj=bpy.data.objects.new(name,data)
        scene.collection.objects.link(obj)
        obj.location=location
        obj.rotation_euler=(Vector((.7,0,.4))-obj.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Source review camera')
    obj=bpy.data.objects.new('Source review camera',data)
    scene.collection.objects.link(obj)
    scene.camera=obj
    obj.location=(2.35,-3.9,2.3)
    obj.rotation_euler=(Vector((.65,0,.42))-obj.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO'
    data.ortho_scale=2.65
    scene.view_settings.view_transform='Standard'
    scene.view_settings.look='None'
    scene.render.filepath=str(path)
    scene.render.image_settings.file_format='PNG'
    bpy.ops.render.render(write_still=True)


def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    draft='--draft' in args
    output,source=begin('objects')
    assets=[]
    roots=[]
    materials={variant:paints(output,variant) for variant in ('quiet','crafted','graphic') if not draft or variant=='crafted'}
    families=('chest','sword') if draft else ('chest','sword','shield')
    for row,family in enumerate(families):
        for col,variant in enumerate(('quiet','crafted','graphic')):
            if draft and variant!='crafted': continue
            objects=chest(variant,materials[variant]) if family=='chest' else sword(variant,materials[variant],output) if family=='sword' else shield(variant,materials[variant])
            bpy.context.view_layer.update()
            minimum=min((obj.matrix_world @ Vector(corner)).z for obj in objects for corner in obj.bound_box)
            for obj in objects:
                obj.location.z-=minimum
            entry,root=export_asset(objects,output,family+'-'+variant,family,
                {'chest':'Travel chest','sword':'Arming sword','shield':'Wooden shield'}[family],variant,DESCRIPTIONS[family][variant],variant=='crafted')
            root.location=(row*1.05 if draft else col*1.25,row*0 if draft else row*1.25,0)
            assets.append(entry)
            roots.append(root)
    finish('objects',assets,output,source,
        'Original shaped meshes with deliberate fixed pixel artwork. Crafted is the working recommendation: readable construction and selected material detail with quiet timber/steel fields. Study only; no native equipment or inventory behavior changes. GLB front is +Z and metres are preserved. Timber 32 texels/m, iron 64 texels/m; blade reflection uses a fixed 32 by 128 atlas with no camera-dependent repainting.')
    if '--render' in args:
        target=Path(args[args.index('--render')+1])
        target.parent.mkdir(parents=True,exist_ok=True)
        review_render(target,roots)


if __name__=='__main__':
    main()
