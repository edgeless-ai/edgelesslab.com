
import bpy
import math
import sys
import os

out_path = sys.argv[-1]

# Clear
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for m in bpy.data.meshes: bpy.data.meshes.remove(m)
for m in bpy.data.materials: bpy.data.materials.remove(m)

objects = []


# === ABSTRACT PRIMITIVE ===
bpy.ops.mesh.primitive_ico_sphere_add(radius=0.06, location=(0, 0, 0.06), subdivisions=2)
sphere = bpy.context.active_object
sphere.name = 'primary'

bevel = sphere.modifiers.new(name='Bevel', type='BEVEL')
bevel.width = 0.001
bevel.segments = 2

sub = sphere.modifiers.new(name='Subdiv', type='SUBSURF')
sub.levels = 2
sub.render_levels = 3

objects.append(sphere)

# Add accent ring
bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.003, location=(0, 0, 0.06))
ring = bpy.context.active_object
ring.name = 'accent_ring'
ring.rotation_euler = (math.radians(45), 0, math.radians(30))

objects.append(ring)

# Add small satellites
for i in range(3):
    angle = (i / 3) * math.pi * 2
    x = math.cos(angle) * 0.08
    y = math.sin(angle) * 0.08
    
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.015, location=(x, y, 0.06))
    sat = bpy.context.active_object
    sat.name = f'accent_{i}'
    
    objects.append(sat)



# === MATERIALS ===
primary_mat = bpy.data.materials.new(name='primary')
primary_mat.use_nodes = True
nodes = primary_mat.node_tree.nodes
nodes.clear()
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (0.95, 0.95, 0.97, 1)
bsdf.inputs['Metallic'].default_value = 0.9
bsdf.inputs['Roughness'].default_value = 0.15
output = nodes.new('ShaderNodeOutputMaterial')
primary_mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

accent_mat = bpy.data.materials.new(name='accent')
accent_mat.use_nodes = True
nodes = accent_mat.node_tree.nodes
nodes.clear()
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (0.9, 0.9, 0.92, 1)
bsdf.inputs['Metallic'].default_value = 0.7
bsdf.inputs['Roughness'].default_value = 0.25
output = nodes.new('ShaderNodeOutputMaterial')
accent_mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])


# Apply materials
for obj in objects:
    if obj.name.startswith('accent_'):
        obj.data.materials.append(accent_mat)
    else:
        obj.data.materials.append(primary_mat)


# === CAMERA ===
cam_data = bpy.data.cameras.new('cam')
cam_obj = bpy.data.objects.new('cam', cam_data)
cam_obj.location = (0.2, -0.15, 0.12)
cam_obj.rotation_euler = (1.1, 0, 0.85)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# === STUDIO LIGHTING ===
key = bpy.data.lights.new('key', 'AREA')
key_obj = bpy.data.objects.new('key', key)
key_obj.location = (0.2, 0.15, 0.2)
key.energy = 400
key.size = 0.2
bpy.context.scene.collection.objects.link(key_obj)

fill = bpy.data.lights.new('fill', 'AREA')
fill_obj = bpy.data.objects.new('fill', fill)
fill_obj.location = (-0.1, 0.1, 0.15)
fill.energy = 150
fill.size = 0.15
bpy.context.scene.collection.objects.link(fill_obj)

rim = bpy.data.lights.new('rim', 'SPOT')
rim_obj = bpy.data.objects.new('rim', rim)
rim_obj.location = (0, -0.2, 0.15)
rim_obj.rotation_euler = (1.1, 0, 0)
rim.energy = 500
rim.spot_size = 1.0
bpy.context.scene.collection.objects.link(rim_obj)


# === WORLD ===
world = bpy.data.worlds.new('world')
world.use_nodes = True
nodes = world.node_tree.nodes
nodes.clear()
bg = nodes.new('ShaderNodeBackground')
bg.inputs['Color'].default_value = (0.9, 0.9, 0.92, 1)
bg.inputs['Strength'].default_value = 0.2
output = nodes.new('ShaderNodeOutputWorld')
world.node_tree.links.new(bg.outputs['Background'], output.inputs['Surface'])
bpy.context.scene.world = world

# === RENDER ===
scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1920
scene.render.resolution_percentage = 100
scene.render.engine = 'BLENDER_EEVEE'
scene.render.filepath = '/tmp/skill_artifact_temp.png'

if hasattr(scene.eevee, 'use_bloom'):
    scene.eevee.use_bloom = True
    scene.eevee.bloom_intensity = 0.08

bpy.ops.render.render(write_still=True)

# Export
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB')
print("Exported: " + out_path)
