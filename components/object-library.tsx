"use client"
import type { ObjectType } from "./level-editor"
import { ModelsLibrary } from "./models-library"

export function ObjectLibrary({
  onAddObject,
}: {
  onAddObject: (type: ObjectType, modelPath?: string) => void
}) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">3D Models</h3>
      <ModelsLibrary onAddModel={(modelPath) => onAddObject("model", modelPath)} />
    </div>
  )
}

