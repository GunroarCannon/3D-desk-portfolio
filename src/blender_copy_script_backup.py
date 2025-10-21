import bpy

class SimpleOperator(bpy.types.Operator):
    bl_idname = "wm.simple_operator"
    bl_label = "ccopy"
    
    def execute(self, context):
        obj = bpy.context.active_object

        if obj and obj.type == "MESH" and obj.mode == "EDIT":
            bpy.ops.object.mode_set(mode="OBJECT")
            
            for v in obj.data.vertices:
                if v.select:
                    pos = v.co
                    bpy.context.window_manager.clipboard = f"{pos.x}, {pos.y}, {pos.z}"
                    print("Hey there, copied: ", pos)
                    break
            bpy.ops.object.mode_set(mode="EDIT")
        else:
            print("Select a mesh and enter Edit Mode")
        
        return {'FINISHED'}
            
        
bpy.utils.register_class(SimpleOperator)