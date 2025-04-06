"use client"

import { useState, useRef, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid, TransformControls } from "@react-three/drei"
import { ObjectLibrary } from "./object-library"
import { EditorControls } from "./editor-controls"
import { ObjectList } from "./object-list"
import { v4 as uuidv4 } from "uuid"
import type * as THREE from "three"

// Now we only have "model" as the object type
export type ObjectType = "model"
export type TransformMode = "translate" | "rotate" | "scale"

export interface SceneObject {
  id: string
  type: ObjectType
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
  modelPath?: string
  groundLevel: boolean // New property to fix models to y=0
}

export function LevelEditor() {
  const [objects, setObjects] = useState<SceneObject[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [transformMode, setTransformMode] = useState<TransformMode>("translate")

  const addObject = (type: ObjectType, modelPath?: string) => {
    const newObject: SceneObject = {
      id: uuidv4(),
      type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [0.5, 0.5, 0.5],
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      modelPath,
      groundLevel: true, // Default to true for new objects
    }
    setObjects((prev) => [...prev, newObject])
    setSelectedObjectId(newObject.id)
  }

  const updateObject = (id: string, updates: Partial<SceneObject>) => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== id) return obj

        // If groundLevel is true, ensure y position is 0
        const newObj = { ...obj, ...updates }
        if (newObj.groundLevel && updates.position) {
          const newPosition: [number, number, number] = [...newObj.position]
          newPosition[1] = 0
          return { ...newObj, position: newPosition }
        }

        return newObj
      }),
    )
  }

  const deleteObject = (id: string) => {
    setObjects((prev) => prev.filter((obj) => obj.id !== id))
    if (selectedObjectId === id) {
      setSelectedObjectId(null)
    }
  }

  const selectedObject = objects.find((obj) => obj.id === selectedObjectId)

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left sidebar */}
      <div className="w-64 p-4 border-r border-gray-700 flex flex-col">
        <h2 className="text-xl font-bold mb-4">3D Level Editor</h2>
        <ObjectLibrary onAddObject={addObject} />
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Objects</h3>
          <ObjectList
            objects={objects}
            selectedId={selectedObjectId}
            onSelect={setSelectedObjectId}
            onDelete={deleteObject}
          />
        </div>
      </div>

      {/* Main canvas */}
      <div className="flex-1 relative">
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
          <ambientLight intensity={50} />
          <directionalLight
            position={[10, 10, 10]}
            intensity={4}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <Grid infiniteGrid cellSize={1} sectionSize={3} fadeDistance={30} fadeStrength={1.5} />
          <Scene
            objects={objects}
            selectedId={selectedObjectId}
            onSelect={setSelectedObjectId}
            onUpdate={updateObject}
            transformMode={transformMode}
          />
          <OrbitControls makeDefault />
        </Canvas>

        {/* Editor controls overlay */}
        <div className="absolute top-4 right-4">
          <EditorControls transformMode={transformMode} onChangeMode={setTransformMode} />
        </div>
      </div>

      {/* Right sidebar - Properties panel */}
      {selectedObject && (
        <div className="w-64 p-4 border-l border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Properties</h3>
          <ObjectProperties object={selectedObject} onUpdate={(updates) => updateObject(selectedObject.id, updates)} />
        </div>
      )}
    </div>
  )
}

function Scene({
  objects,
  selectedId,
  onSelect,
  onUpdate,
  transformMode,
}: {
  objects: SceneObject[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdate: (id: string, updates: Partial<SceneObject>) => void
  transformMode: TransformMode
}) {
  return (
    <>
      {objects.map((object) => (
        <ModelObject
          key={object.id}
          object={object}
          isSelected={object.id === selectedId}
          onClick={() => onSelect(object.id)}
          onUpdate={onUpdate}
          transformMode={transformMode}
        />
      ))}
    </>
  )
}

function ModelObject({
  object,
  isSelected,
  onClick,
  onUpdate,
  transformMode,
}: {
  object: SceneObject
  isSelected: boolean
  onClick: () => void
  onUpdate: (id: string, updates: Partial<SceneObject>) => void
  transformMode: TransformMode
}) {
  const { scene } = useGLTF(object.modelPath || "/models/model.glb")
  const modelRef = useRef<THREE.Group>(null)
  const [isModelReady, setIsModelReady] = useState(false)

  // Clone the scene to avoid sharing issues
  const clonedScene = useMemo(() => {
    return scene.clone()
  }, [scene])

  // Set up the ref and mark as ready when the model is loaded
  useEffect(() => {
    if (modelRef.current) {
      setIsModelReady(true)
    }
  }, [modelRef.current])

  // Enforce groundLevel constraint
  useEffect(() => {
    if (object.groundLevel && modelRef.current) {
      const currentPosition = modelRef.current.position.toArray()
      if (currentPosition[1] !== 0) {
        modelRef.current.position.setY(0)
        onUpdate(object.id, {
          position: [currentPosition[0], 0, currentPosition[2]] as [number, number, number],
        })
      }
    }
  }, [object.groundLevel, modelRef.current, object.id, onUpdate])

  const handleTransform = () => {
    if (modelRef.current) {
      let position = modelRef.current.position.toArray() as [number, number, number]

      // Enforce groundLevel constraint
      if (object.groundLevel) {
        position = [position[0], 0, position[2]]
        // Force the y position to 0 in the actual object
        modelRef.current.position.setY(0)
      }

      const rotation = [modelRef.current.rotation.x, modelRef.current.rotation.y, modelRef.current.rotation.z] as [
        number,
        number,
        number,
      ]
      const scale = modelRef.current.scale.toArray() as [number, number, number]

      onUpdate(object.id, { position, rotation, scale })
    }
  }

  // Calculate the actual position, enforcing groundLevel if needed
  const actualPosition: [number, number, number] = object.groundLevel
    ? [object.position[0], 0, object.position[2]]
    : object.position

  return (
    <>
      <group
        ref={modelRef}
        position={actualPosition}
        rotation={object.rotation}
        scale={object.scale}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        <primitive object={clonedScene} />
      </group>

      {isSelected && isModelReady && modelRef.current && (
        <TransformControls
          object={modelRef}
          mode={transformMode}
          onMouseUp={handleTransform}
          // Disable the Y axis control when groundLevel is true and in translate mode
          showY={!(object.groundLevel && transformMode === "translate")}
        />
      )}
    </>
  )
}

function ObjectProperties({
  object,
  onUpdate,
}: {
  object: SceneObject
  onUpdate: (updates: Partial<SceneObject>) => void
}) {
  const handlePositionChange = (axis: number, value: number) => {
    // If groundLevel is true and axis is Y (1), ignore the change
    if (object.groundLevel && axis === 1) return

    const newPosition = [...object.position] as [number, number, number]
    newPosition[axis] = value
    onUpdate({ position: newPosition })
  }

  const handleRotationChange = (axis: number, value: number) => {
    const newRotation = [...object.rotation] as [number, number, number]
    newRotation[axis] = value
    onUpdate({ rotation: newRotation })
  }

  const handleScaleChange = (axis: number, value: number) => {
    const newScale = [...object.scale] as [number, number, number]
    newScale[axis] = value
    onUpdate({ scale: newScale })
  }

  const handleGroundLevelChange = (checked: boolean) => {
    onUpdate({ groundLevel: checked })
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Position</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs mb-1">X</label>
            <input
              type="number"
              value={object.position[0]}
              onChange={(e) => handlePositionChange(0, Number.parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Y</label>
            <input
              type="number"
              value={object.groundLevel ? 0 : object.position[1]}
              onChange={(e) => handlePositionChange(1, Number.parseFloat(e.target.value) || 0)}
              className={`w-full bg-gray-800 text-white px-2 py-1 rounded ${object.groundLevel ? "opacity-50" : ""}`}
              step={0.1}
              disabled={object.groundLevel}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Z</label>
            <input
              type="number"
              value={object.position[2]}
              onChange={(e) => handlePositionChange(2, Number.parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Rotation</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs mb-1">X</label>
            <input
              type="number"
              value={object.rotation[0]}
              onChange={(e) => handleRotationChange(0, Number.parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Y</label>
            <input
              type="number"
              value={object.rotation[1]}
              onChange={(e) => handleRotationChange(1, Number.parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Z</label>
            <input
              type="number"
              value={object.rotation[2]}
              onChange={(e) => handleRotationChange(2, Number.parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Scale</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs mb-1">X</label>
            <input
              type="number"
              value={object.scale[0]}
              onChange={(e) => handleScaleChange(0, Number.parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
              min={0.1}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Y</label>
            <input
              type="number"
              value={object.scale[1]}
              onChange={(e) => handleScaleChange(1, Number.parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
              min={0.1}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Z</label>
            <input
              type="number"
              value={object.scale[2]}
              onChange={(e) => handleScaleChange(2, Number.parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
              min={0.1}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="checkbox"
            id="groundLevel"
            checked={object.groundLevel}
            onChange={(e) => handleGroundLevelChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="groundLevel" className="font-medium">
            Fix to Ground Level (Y=0)
          </label>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Model</h4>
        <p className="text-sm text-gray-400">{object.modelPath || "/models/model.glb"}</p>
      </div>
    </div>
  )
}

// Import these at the top of the file
import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"

