"use client"

import type { SceneObject } from "./level-editor"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { ModelThumbnail } from "./model-thumbnail"

export function ObjectList({
  objects,
  selectedId,
  onSelect,
  onDelete,
}: {
  objects: SceneObject[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (objects.length === 0) {
    return <p className="text-gray-400 text-sm">No objects in scene</p>
  }

  return (
    <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
      {objects.map((obj, index) => (
        <div
          key={obj.id}
          className={`flex items-center justify-between p-2 rounded ${
            selectedId === obj.id ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"
          }`}
          onClick={() => onSelect(obj.id)}
        >
          <div className="flex items-center">
            <div className="mr-2 flex-shrink-0" style={{ width: 24, height: 24 }}>
              <ModelThumbnail modelPath={obj.modelPath || "/models/model.glb"} size={24} />
            </div>
            <span>{obj.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(obj.id)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

