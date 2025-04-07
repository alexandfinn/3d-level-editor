"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, TransformControls } from "@react-three/drei";
import { ObjectLibrary } from "./object-library";
import { EditorControls } from "./editor-controls";
import { ObjectList } from "./object-list";
import { v4 as uuidv4 } from "uuid";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Box3Helper, Vector3 } from "three";

// Now we only have "model" as the object type
export type ObjectType = "model";
export type TransformMode = "translate" | "rotate" | "scale";

export interface SceneObject {
  id: string;
  type: ObjectType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  modelPath?: string;
  name: string;
  groundLevel: boolean; // New property to fix models to y=0
  snapToGrid: boolean; // New property to enable grid snapping
}

// WASD camera movement component
function WASDControls({ moveSpeed = 0.1 }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({
    w: false,
    a: false,
    s: false,
    d: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if an input element is focused
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement ||
          document.activeElement instanceof HTMLSelectElement) {
        return;
      }
      
      // Only handle WASD keys
      if (e.key.toLowerCase() === 'w' || 
          e.key.toLowerCase() === 'a' || 
          e.key.toLowerCase() === 's' || 
          e.key.toLowerCase() === 'd') {
        keys.current[e.key.toLowerCase()] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Only handle WASD keys
      if (e.key.toLowerCase() === 'w' || 
          e.key.toLowerCase() === 'a' || 
          e.key.toLowerCase() === 's' || 
          e.key.toLowerCase() === 'd') {
        keys.current[e.key.toLowerCase()] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(() => {
    // Get camera forward direction (excluding y component for horizontal movement)
    const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    // Get camera right direction
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    // Apply movement based on keys pressed
    const moveVector = new Vector3(0, 0, 0);

    if (keys.current.w) moveVector.add(forward.clone().multiplyScalar(moveSpeed));
    if (keys.current.s) moveVector.add(forward.clone().multiplyScalar(-moveSpeed));
    if (keys.current.a) moveVector.add(right.clone().multiplyScalar(-moveSpeed));
    if (keys.current.d) moveVector.add(right.clone().multiplyScalar(moveSpeed));

    // Update camera position
    if (moveVector.length() > 0) {
      camera.position.add(moveVector);
    }
  });

  return null;
}

export function LevelEditor() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [transformMode, setTransformMode] =
    useState<TransformMode>("translate");
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true); // Default to enabled
  const [snapThreshold, setSnapThreshold] = useState(0.5); // Snap distance threshold
  const [wasdMoveSpeed, setWasdMoveSpeed] = useState(0.1); // Movement speed for WASD controls
  const [showWasdInfo, setShowWasdInfo] = useState(true); // Show WASD info overlay initially

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Create a JSON string of the scene data
        const sceneData = {
          objects,
          timestamp: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(sceneData, null, 2);
        
        // Create a blob and download link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scene-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [objects]);

  // Hide WASD info after 10 seconds
  useEffect(() => {
    if (showWasdInfo) {
      const timeout = setTimeout(() => {
        setShowWasdInfo(false);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [showWasdInfo]);

  // Load objects from localStorage on component mount
  useEffect(() => {
    const savedObjects = localStorage.getItem("levelEditorObjects");
    if (savedObjects) {
      try {
        setObjects(JSON.parse(savedObjects));
      } catch (error) {
        console.error("Failed to parse saved objects:", error);
      }
    }
  }, []);

  // Save objects to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("levelEditorObjects", JSON.stringify(objects));
  }, [objects]);

  const addObject = (type: ObjectType, modelPath?: string) => {
    const modelName = modelPath
      ? modelPath.split("/").pop()?.replace(".glb", "") || "Model"
      : "Model";
    const newObject: SceneObject = {
      id: uuidv4(),
      type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [0.5, 0.5, 0.5],
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      modelPath,
      name: modelName,
      groundLevel: true,
      snapToGrid: true,
    };
    setObjects((prev) => [...prev, newObject]);
    setSelectedObjectId(newObject.id);
  };

  const updateObject = (id: string, updates: Partial<SceneObject>) => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== id) return obj;

        // If groundLevel is true, ensure y position is 0
        const newObj = { ...obj, ...updates };

        // Apply position modifications
        if (updates.position) {
          const newPosition: [number, number, number] = [...newObj.position];

          // Apply ground level constraint
          if (newObj.groundLevel) {
            newPosition[1] = 0;
          }

          // Apply grid snapping if enabled
          if (newObj.snapToGrid) {
            // Snap X and Z to 0.5 grid
            newPosition[0] = Math.round(newPosition[0] * 2) / 2;
            newPosition[2] = Math.round(newPosition[2] * 2) / 2;
          }

          return { ...newObj, position: newPosition };
        }

        return newObj;
      })
    );
  };

  const deleteObject = useCallback(
    (id: string) => {
      setObjects((prev) => prev.filter((obj) => obj.id !== id));
      if (selectedObjectId === id) {
        setSelectedObjectId(null);
      }
    },
    [selectedObjectId]
  );

  // Function to duplicate an object
  const duplicateObject = useCallback(
    (id: string) => {
      const objectToDuplicate = objects.find(obj => obj.id === id);
      if (!objectToDuplicate) return;
      
      // Create a new object based on the selected one with a small offset
      const newObject: SceneObject = {
        ...objectToDuplicate,
        id: uuidv4(), // Generate a new ID
        position: [
          objectToDuplicate.position[0] + 0.5, // Offset X by 0.5
          objectToDuplicate.position[1],
          objectToDuplicate.position[2] + 0.5, // Offset Z by 0.5
        ],
      };
      
      setObjects(prev => [...prev, newObject]);
      setSelectedObjectId(newObject.id); // Select the new object
    },
    [objects]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if an input element is focused
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement ||
          document.activeElement instanceof HTMLSelectElement) {
        return;
      }
      
      // Delete with Backspace
      if (e.key === "Backspace" && selectedObjectId) {
        deleteObject(selectedObjectId);
      }
      
      // Duplicate with Cmd+D
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && selectedObjectId) {
        e.preventDefault(); // Prevent browser's default behavior
        duplicateObject(selectedObjectId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedObjectId, deleteObject, duplicateObject]);

  const resetScene = () => {
    if (
      confirm(
        "Are you sure you want to reset the scene? This will delete all objects."
      )
    ) {
      // Clear the objects state
      setObjects([]);
      // Clear the selected object
      setSelectedObjectId(null);
      // Clear localStorage
      localStorage.removeItem("levelEditorObjects");
    }
  };

  const selectedObject = objects.find((obj) => obj.id === selectedObjectId);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left sidebar */}
      <div className="w-64 min-w-64 flex-shrink-0 p-4 border-r border-gray-700 flex flex-col">
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
          <group>
            {/* Main grid (1x1) */}
            <Grid infiniteGrid cellColor="white" />
          </group>
          <Scene
            objects={objects}
            selectedId={selectedObjectId}
            onSelect={setSelectedObjectId}
            onUpdate={updateObject}
            transformMode={transformMode}
            showBoundingBoxes={showBoundingBoxes}
            snapEnabled={snapEnabled && showBoundingBoxes}
            snapThreshold={snapThreshold}
          />
          <OrbitControls makeDefault />
          <WASDControls moveSpeed={wasdMoveSpeed} />
        </Canvas>

        {/* Editor controls overlay */}
        <div className="absolute top-4 right-4">
          <EditorControls
            transformMode={transformMode}
            onChangeMode={setTransformMode}
            showBoundingBoxes={showBoundingBoxes}
            onToggleBoundingBoxes={() => setShowBoundingBoxes((prev) => !prev)}
            snapEnabled={snapEnabled}
            onToggleSnap={() => setSnapEnabled((prev) => !prev)}
            onReset={resetScene}
            showWasdInfo={showWasdInfo}
            onToggleWasdInfo={() => setShowWasdInfo((prev) => !prev)}
          />
        </div>

        {/* WASD Controls Info Overlay */}
        {showWasdInfo && (
          <div className="absolute bottom-4 left-4 bg-gray-800/80 p-2 rounded text-sm">
            <p>Use <strong>WASD</strong> keys to move camera</p>
            <div className="flex items-center mt-2">
              <span className="mr-2">Speed:</span>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={wasdMoveSpeed}
                onChange={(e) => setWasdMoveSpeed(parseFloat(e.target.value))}
                className="w-32"
              />
              <span className="ml-2">{wasdMoveSpeed}</span>
            </div>
            <button 
              onClick={() => setShowWasdInfo(false)}
              className="text-xs text-gray-400 hover:text-white mt-1"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Right sidebar - Properties panel */}
      <div
        className={`w-64 min-w-64 flex-shrink-0 border-l border-gray-700 transition-all duration-200 ${
          selectedObject ? "p-4" : "w-0 min-w-0 opacity-0"
        }`}
      >
        {selectedObject && (
          <>
            <h3 className="text-lg font-semibold mb-4">
              {selectedObject.name}
            </h3>
            <ObjectProperties
              object={selectedObject}
              onUpdate={(updates) => updateObject(selectedObject.id, updates)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Scene({
  objects,
  selectedId,
  onSelect,
  onUpdate,
  transformMode,
  showBoundingBoxes,
  snapEnabled,
  snapThreshold,
}: {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<SceneObject>) => void;
  transformMode: TransformMode;
  showBoundingBoxes: boolean;
  snapEnabled: boolean;
  snapThreshold: number;
}) {
  const objectBoundingBoxes = useRef<Map<string, Box3>>(new Map());

  // Function to get all objects' bounding boxes except the selected one
  const getOtherBoundingBoxes = (selectedId: string | null) => {
    const boxes: Box3[] = [];
    objectBoundingBoxes.current.forEach((box, id) => {
      if (id !== selectedId) {
        boxes.push(box.clone()); // Clone to avoid modifying the original
      }
    });
    return boxes;
  };

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
          showBoundingBoxes={showBoundingBoxes}
          snapEnabled={snapEnabled}
          snapThreshold={snapThreshold}
          objectBoundingBoxes={objectBoundingBoxes}
          getOtherBoundingBoxes={() => getOtherBoundingBoxes(object.id)}
        />
      ))}
    </>
  );
}

function ModelObject({
  object,
  isSelected,
  onClick,
  onUpdate,
  transformMode,
  showBoundingBoxes,
  snapEnabled,
  snapThreshold,
  objectBoundingBoxes,
  getOtherBoundingBoxes,
}: {
  object: SceneObject;
  isSelected: boolean;
  onClick: () => void;
  onUpdate: (id: string, updates: Partial<SceneObject>) => void;
  transformMode: TransformMode;
  showBoundingBoxes: boolean;
  snapEnabled: boolean;
  snapThreshold: number;
  objectBoundingBoxes: React.RefObject<Map<string, Box3>>;
  getOtherBoundingBoxes: () => Box3[];
}) {
  const { scene } = useGLTF(object.modelPath || "/models/model.glb");
  const modelRef = useRef<THREE.Group>(null);
  const boundingBoxRef = useRef<THREE.Box3Helper>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [boundingBox, setBoundingBox] = useState<Box3 | null>(null);

  // Clone the scene to avoid sharing issues
  const clonedScene = useMemo(() => {
    return scene.clone();
  }, [scene]);

  // Update bounding box on each frame when visible and store it in the ref map
  useFrame(() => {
    if (modelRef.current && boundingBox) {
      boundingBox.setFromObject(modelRef.current);

      // Store the bounding box in the scene-level map
      if (objectBoundingBoxes.current) {
        objectBoundingBoxes.current.set(object.id, boundingBox);
      }

      // Apply snapping while dragging if enabled and object is selected
      if (snapEnabled && isSelected && transformMode === "translate") {
        trySnap();
      }
    }
  });

  // Try to snap the current object to other objects' bounding boxes
  const trySnap = () => {
    if (!modelRef.current || !boundingBox) return;

    const otherBoxes = getOtherBoundingBoxes();
    if (otherBoxes.length === 0) return;

    const currentBox = boundingBox.clone();
    const currentPosition = modelRef.current.position.clone();
    let snapApplied = false;

    // Extract min and max points for current box
    const currentMin = currentBox.min;
    const currentMax = currentBox.max;

    // For each other box, check if we should snap to it
    for (const otherBox of otherBoxes) {
      const otherMin = otherBox.min;
      const otherMax = otherBox.max;

      // Check each axis (x, y, z) for potential snapping
      const axes = [0, 1, 2]; // x, y, z

      for (const axis of axes) {
        // Skip Y axis if groundLevel is true
        if (axis === 1 && object.groundLevel) continue;

        // Check if right side of current box is close to left side of other box
        if (
          Math.abs(
            currentMax.getComponent(axis) - otherMin.getComponent(axis)
          ) <= snapThreshold
        ) {
          // Snap right side to left side
          const snapOffset =
            otherMin.getComponent(axis) - currentMax.getComponent(axis);
          currentPosition.setComponent(
            axis,
            currentPosition.getComponent(axis) + snapOffset
          );
          snapApplied = true;
          break;
        }

        // Check if left side of current box is close to right side of other box
        if (
          Math.abs(
            currentMin.getComponent(axis) - otherMax.getComponent(axis)
          ) <= snapThreshold
        ) {
          // Snap left side to right side
          const snapOffset =
            otherMax.getComponent(axis) - currentMin.getComponent(axis);
          currentPosition.setComponent(
            axis,
            currentPosition.getComponent(axis) + snapOffset
          );
          snapApplied = true;
          break;
        }
      }

      if (snapApplied) break; // Exit after first snap is applied
    }

    // If we snapped, update the model position
    if (snapApplied) {
      modelRef.current.position.copy(currentPosition);
      if (object.groundLevel) {
        modelRef.current.position.setY(0); // Ensure Y=0 for ground level objects
      }
    }
  };

  // Trigger position update after transformation with snapping
  const handleTransform = () => {
    if (modelRef.current) {
      let position = modelRef.current.position.toArray() as [
        number,
        number,
        number
      ];

      // Apply final snap when releasing the control
      if (snapEnabled && showBoundingBoxes) {
        trySnap();
        // Update position after snapping
        position = modelRef.current.position.toArray() as [
          number,
          number,
          number
        ];
      }

      // Apply grid snapping
      if (object.snapToGrid) {
        position = [
          Math.round(position[0] * 2) / 2,
          position[1],
          Math.round(position[2] * 2) / 2,
        ];

        // Update the actual model position to show the snap
        modelRef.current.position.x = position[0];
        modelRef.current.position.z = position[2];
      }

      // Enforce groundLevel constraint
      if (object.groundLevel) {
        position = [position[0], 0, position[2]];
        // Force the y position to 0 in the actual object
        modelRef.current.position.setY(0);
      }

      const rotation = [
        modelRef.current.rotation.x,
        modelRef.current.rotation.y,
        modelRef.current.rotation.z,
      ] as [number, number, number];
      const scale = modelRef.current.scale.toArray() as [
        number,
        number,
        number
      ];

      onUpdate(object.id, { position, rotation, scale });
    }
  };

  // Calculate initial bounding box when model is ready
  useEffect(() => {
    if (modelRef.current) {
      const box = new Box3().setFromObject(modelRef.current);
      setBoundingBox(box);
      setIsModelReady(true);

      // Initialize the box in the ref map
      if (objectBoundingBoxes.current) {
        objectBoundingBoxes.current.set(object.id, box);
      }
    }

    // Cleanup when component unmounts
    return () => {
      if (objectBoundingBoxes.current) {
        objectBoundingBoxes.current.delete(object.id);
      }
    };
  }, [modelRef.current, object.id, objectBoundingBoxes]);

  // Enforce groundLevel constraint
  useEffect(() => {
    if (object.groundLevel && modelRef.current) {
      const currentPosition = modelRef.current.position.toArray();
      if (currentPosition[1] !== 0) {
        modelRef.current.position.setY(0);
        onUpdate(object.id, {
          position: [currentPosition[0], 0, currentPosition[2]] as [
            number,
            number,
            number
          ],
        });
      }
    }
  }, [object.groundLevel, modelRef.current, object.id, onUpdate]);

  // Calculate the actual position, enforcing groundLevel if needed
  const actualPosition: [number, number, number] = object.groundLevel
    ? [object.position[0], 0, object.position[2]]
    : object.position;

  return (
    <>
      <group
        ref={modelRef}
        position={actualPosition}
        rotation={object.rotation}
        scale={object.scale}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <primitive object={clonedScene} />
      </group>

      {showBoundingBoxes && boundingBox && (
        <primitive object={new THREE.Box3Helper(boundingBox, 0x00ff00)} />
      )}

      {isSelected && isModelReady && modelRef.current && (
        <TransformControls
          object={modelRef.current}
          mode={transformMode}
          onMouseUp={handleTransform}
          showY={!(object.groundLevel && transformMode === "translate")}
        />
      )}
    </>
  );
}

function ObjectProperties({
  object,
  onUpdate,
}: {
  object: SceneObject;
  onUpdate: (updates: Partial<SceneObject>) => void;
}) {
  const handlePositionChange = (axis: number, value: number) => {
    // If groundLevel is true and axis is Y (1), ignore the change
    if (object.groundLevel && axis === 1) return;

    const newPosition = [...object.position] as [number, number, number];
    newPosition[axis] = value;
    onUpdate({ position: newPosition });
  };

  const handleRotationChange = (axis: number, value: number) => {
    const newRotation = [...object.rotation] as [number, number, number];
    newRotation[axis] = value;
    onUpdate({ rotation: newRotation });
  };

  const rotateObject = (direction: "left" | "right") => {
    // Get current Y rotation
    const currentRotationY = object.rotation[1];

    // Calculate new rotation (add or subtract 90 degrees in radians)
    const rotationAmount = Math.PI / 2; // 90 degrees in radians
    const newRotationY =
      direction === "left"
        ? currentRotationY - rotationAmount
        : currentRotationY + rotationAmount;

    // Update rotation
    const newRotation: [number, number, number] = [
      object.rotation[0],
      newRotationY,
      object.rotation[2],
    ];

    onUpdate({ rotation: newRotation });
  };

  const handleScaleChange = (axis: number, value: number) => {
    const newScale = [...object.scale] as [number, number, number];
    newScale[axis] = value;
    onUpdate({ scale: newScale });
  };

  const handleGroundLevelChange = (checked: boolean) => {
    onUpdate({ groundLevel: checked });
  };

  const handleSnapToGridChange = (checked: boolean) => {
    onUpdate({ snapToGrid: checked });

    // If enabling snap to grid, immediately apply it to the current position
    if (checked) {
      const snappedPosition: [number, number, number] = [
        Math.round(object.position[0] * 2) / 2,
        object.position[1],
        Math.round(object.position[2] * 2) / 2,
      ];
      onUpdate({ position: snappedPosition });
    }
  };

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
              onChange={(e) =>
                handlePositionChange(0, Number.parseFloat(e.target.value) || 0)
              }
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Y</label>
            <input
              type="number"
              value={object.groundLevel ? 0 : object.position[1]}
              onChange={(e) =>
                handlePositionChange(1, Number.parseFloat(e.target.value) || 0)
              }
              className={`w-full bg-gray-800 text-white px-2 py-1 rounded ${
                object.groundLevel ? "opacity-50" : ""
              }`}
              step={0.1}
              disabled={object.groundLevel}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Z</label>
            <input
              type="number"
              value={object.position[2]}
              onChange={(e) =>
                handlePositionChange(2, Number.parseFloat(e.target.value) || 0)
              }
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
              onChange={(e) =>
                handleRotationChange(0, Number.parseFloat(e.target.value) || 0)
              }
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Y</label>
            <input
              type="number"
              value={object.rotation[1]}
              onChange={(e) =>
                handleRotationChange(1, Number.parseFloat(e.target.value) || 0)
              }
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Z</label>
            <input
              type="number"
              value={object.rotation[2]}
              onChange={(e) =>
                handleRotationChange(2, Number.parseFloat(e.target.value) || 0)
              }
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              step={0.1}
            />
          </div>
        </div>
        <div className="mt-2 flex space-x-2">
          <button
            onClick={() => rotateObject("left")}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-lg"
          >
            ↺
          </button>
          <button
            onClick={() => rotateObject("right")}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-lg"
          >
            ↻
          </button>
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
              onChange={(e) =>
                handleScaleChange(0, Number.parseFloat(e.target.value) || 0)
              }
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
              onChange={(e) =>
                handleScaleChange(1, Number.parseFloat(e.target.value) || 0)
              }
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
              onChange={(e) =>
                handleScaleChange(2, Number.parseFloat(e.target.value) || 0)
              }
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

        <div className="flex items-center space-x-2 mb-2">
          <input
            type="checkbox"
            id="snapToGrid"
            checked={object.snapToGrid}
            onChange={(e) => handleSnapToGridChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="snapToGrid" className="font-medium">
            Snap to Grid (0.5×0.5)
          </label>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Model</h4>
        <p className="text-sm text-gray-400">
          {object.modelPath || "/models/model.glb"}
        </p>
      </div>
    </div>
  );
}
