"use client"

import { useRef, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"

export function ModelThumbnail({ modelPath, size = 60 }: { modelPath: string; size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="bg-gray-900 rounded-md overflow-hidden">
      <Canvas shadows camera={{ position: [3, 3, 3], fov: 40 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={5} />
        <ThumbnailModel modelPath={modelPath} />
      </Canvas>
    </div>
  )
}

function ThumbnailModel({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath)
  const modelRef = useRef<THREE.Group>(null)

  // Center and scale the model to fit the thumbnail
  useEffect(() => {
    if (modelRef.current) {
      // Create a bounding box for the model
      const box = new THREE.Box3().setFromObject(modelRef.current)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      // Calculate the scale to fit the model in the view
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 1.5 / maxDim

      // Apply transformations
      modelRef.current.position.set(-center.x, -center.y, -center.z)
      modelRef.current.scale.set(scale, scale, scale)
    }
  }, [modelRef.current])

  // Clone the scene to avoid sharing issues
  const clonedScene = scene.clone()

  return (
    <group ref={modelRef}>
      <primitive object={clonedScene} />
    </group>
  )
}

