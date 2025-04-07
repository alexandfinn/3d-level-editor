import bpy
import os
from pathlib import Path
import bmesh
from mathutils import Vector

# === SETTINGS ===
export_folder = str(Path.home() / "Downloads")

# === Get selected objects ===
selected_objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']

if not selected_objects:
    raise Exception("No mesh objects selected!")

# Store original selection and active object
original_selected_objects = [obj for obj in bpy.context.selected_objects]
original_active_object = bpy.context.view_layer.objects.active

# Loop through all selected objects
for obj in selected_objects:
    # === Make sure only this object is selected and active ===
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    
    # === Create a duplicate for export ===
    bpy.ops.object.duplicate()
    temp_obj = bpy.context.view_layer.objects.active
    
    # === Calculate the bounding box to find center on XY plane ===
    # Get the object's bounding box in world space
    bbox_corners = [temp_obj.matrix_world @ Vector(corner) for corner in temp_obj.bound_box]
    
    # Calculate center of bounding box
    bbox_center = sum((Vector(corner) for corner in bbox_corners), Vector()) / 8
    
    # We only want to center on X and Y axes, preserve Z
    original_z = temp_obj.location.z
    offset_x = -bbox_center.x
    offset_y = -bbox_center.y
    
    # Apply the centering offset
    temp_obj.location.x += offset_x
    temp_obj.location.y += offset_y
    
    # === Apply all transformations to the duplicate ===
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # === Export path ===
    filename = f"{obj.name}.glb"
    export_path = os.path.join(export_folder, filename)
    
    # === Export as .glb ===
    bpy.ops.export_scene.gltf(
        filepath=export_path,
        use_selection=True,
        export_format='GLB',
        export_apply=False,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_current_frame=True,
        export_animations=False
    )
    
    print(f"✅ Exported {obj.name} to: {export_path}")
    
    # === Delete the temporary object ===
    bpy.ops.object.delete()

# Restore original selection
bpy.ops.object.select_all(action='DESELECT')
for obj in original_selected_objects:
    obj.select_set(True)
if original_active_object:
    bpy.context.view_layer.objects.active = original_active_object

print(f"✅ Exported {len(selected_objects)} objects to: {export_folder}")
