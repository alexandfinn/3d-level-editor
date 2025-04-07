import bpy
import os
from pathlib import Path

# === SETTINGS ===
export_folder = str(Path.home() / "Downloads")

# === Get selected objects ===
selected_objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']

if not selected_objects:
    raise Exception("No mesh objects selected!")

# Store all original objects for later restoration
original_states = []

# Loop through all selected objects
for obj in selected_objects:
    # === Store original location ===
    original_states.append({
        'object': obj,
        'location': obj.location.copy(),
        'rotation': obj.rotation_euler.copy(),
        'scale': obj.scale.copy()
    })
    
    # === Make sure only this object is selected and active ===
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    
    # === Move origin to bottom center ===
    # First set origin to geometry center
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    
    # Get the dimensions and create cursor position at bottom center
    dimensions = obj.dimensions
    bpy.context.scene.cursor.location = (
        obj.location.x,
        obj.location.y,
        obj.location.z - dimensions.z/2
    )
    
    # Set origin to 3D cursor (which is at bottom center)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    
    # Move object to world origin for X and Y only
    obj.location = (0, 0, 0)
    obj.rotation_euler = (0, 0, 0)
    
    # Apply transforms to make sure everything is clean
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # === Export path ===
    filename = f"{obj.name}.glb"
    export_path = os.path.join(export_folder, filename)
    
    # === Export as .glb ===
    bpy.ops.export_scene.gltf(
        filepath=export_path,
        use_selection=True,
        export_format='GLB',
        export_apply=True
    )
    
    print(f"✅ Exported {obj.name} to: {export_path}")

# === Restore original transforms for all objects ===
for state in original_states:
    obj = state['object']
    obj.location = state['location']
    obj.rotation_euler = state['rotation']
    obj.scale = state['scale']

# Re-select all objects that were originally selected
for state in original_states:
    state['object'].select_set(True)

print(f"✅ Exported {len(selected_objects)} objects to: {export_folder}")
