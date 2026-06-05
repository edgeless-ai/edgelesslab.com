
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


# === NODE GRAPH ===
import random
random.seed(42)

# Create 8 nodes
for i in range(8):
    angle = (i / 8) * math.pi * 2
    radius = random.uniform(0.05, 0.15)
    x = math.cos(angle) * radius
    y = math.sin(angle) * radius
    z = random.uniform(0, 0.1)
    
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.012, location=(x, y, z), subdivisions=2)
    node = bpy.context.active_object
    node.name = f'node_{i}'
    
    sub = node.modifiers.new(name='Subdiv', type='SUBSURF')
    sub.levels = 1
    sub.render_levels = 2
    
    objects.append(node)

# Create connections
for i in range(8):
    for j in range(i+1, 8):
        if random.random() < 0.3:
            # Get positions
            obj_i = bpy.data.objects[f'node_{i}']
            obj_j = bpy.data.objects[f'node_{j}']
            
            x1, y1, z1 = obj_i.location
            x2, y2, z2 = obj_j.location
            
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            cz = (z1 + z2) / 2
            
            length = math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2)
            
            if length > 0.001:
                bpy.ops.mesh.primitive_cylinder_add(radius=0.001, depth=length, location=(cx, cy, cz))
                line = bpy.context.active_object
                line.name = f'conn_{i}_{j}'
                
                import mathutils
                direction = mathutils.Vector((x2-x1, y2-y1, z2-z1))
                up = mathutils.Vector((0, 0, 1))
                rot_axis = up.cross(direction)
                if rot_axis.length > 0.0001:
                    rot_axis.normalize()
                    angle = math.acos(up.dot(direction) / length)
                    line.rotation_euler = rot_axis * angle
                
                objects.append(line)



# === MATERIALS ===
primary_mat = bpy.data.materials.new(name='primary')
primary_mat.use_nodes = True
nodes = primary_mat.node_tree.nodes
nodes.clear()
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (0.0, 0.9, 1.0, 1)
bsdf.inputs['Metallic'].default_value = 0.9
bsdf.inputs['Roughness'].default_value = 0.15
output = nodes.new('ShaderNodeOutputMaterial')
primary_mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

accent_mat = bpy.data.materials.new(name='accent')
accent_mat.use_nodes = True
nodes = accent_mat.node_tree.nodes
nodes.clear()
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (0.1, 0.2, 0.25, 1)
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

# === DRAMATIC LIGHTING ===
key = bpy.data.lights.new('key', 'AREA')
key_obj = bpy.data.objects.new('key', key)
key_obj.location = (0.2, 0.15, 0.25)
key.energy = 400
key.size = 0.2
bpy.context.scene.collection.objects.link(key_obj)

rim = bpy.data.lights.new('rim', 'SPOT')
rim_obj = bpy.data.objects.new('rim', rim)
rim_obj.location = (-0.1, -0.2, 0.15)
rim_obj.rotation_euler = (1.2, 0, 0.3)
rim.energy = 800
rim.spot_size = 1.0
bpy.context.scene.collection.objects.link(rim_obj)

fill = bpy.data.lights.new('fill', 'AREA')
fill_obj = bpy.data.objects.new('fill', fill)
fill_obj.location = (-0.1, 0.1, 0.1)
fill.energy = 100
fill.size = 0.15
bpy.context.scene.collection.objects.link(fill_obj)


# === WORLD ===
world = bpy.data.worlds.new('world')
world.use_nodes = True
nodes = world.node_tree.nodes
nodes.clear()
bg = nodes.new('ShaderNodeBackground')
bg.inputs['Color'].default_value = (0.1, 0.2, 0.25, 1)
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
