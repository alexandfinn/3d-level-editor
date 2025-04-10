"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import type { TransformMode } from "./level-editor"
import { Move, RotateCcw, Maximize, Box, Magnet, Trash2, Keyboard } from "lucide-react"

export function EditorControls({
  transformMode,
  onChangeMode,
  showBoundingBoxes,
  onToggleBoundingBoxes,
  snapEnabled,
  onToggleSnap,
  onReset,
  showWasdInfo,
  onToggleWasdInfo,
}: {
  transformMode: TransformMode
  onChangeMode: (mode: TransformMode) => void
  showBoundingBoxes: boolean
  onToggleBoundingBoxes: () => void
  snapEnabled: boolean
  onToggleSnap: () => void
  onReset: () => void
  showWasdInfo: boolean
  onToggleWasdInfo: () => void
}) {
  const controls: { mode: TransformMode; icon: React.ReactNode; label: string }[] = [
    { mode: "translate", icon: <Move className="h-4 w-4" />, label: "Move" },
    { mode: "rotate", icon: <RotateCcw className="h-4 w-4" />, label: "Rotate" },
    { mode: "scale", icon: <Maximize className="h-4 w-4" />, label: "Scale" },
  ]

  return (
    <div className="bg-gray-800 p-2 rounded-lg shadow-lg">
      <div className="flex space-x-1">
        {controls.map((control) => (
          <Button
            key={control.mode}
            variant={transformMode === control.mode ? "secondary" : "default"}
            size="sm"
            onClick={() => onChangeMode(control.mode)}
            title={control.label}
          >
            {control.icon}
            <span className="ml-1">{control.label}</span>
          </Button>
        ))}
        <Button
          variant={showBoundingBoxes ? "secondary" : "default"}
          size="sm"
          onClick={onToggleBoundingBoxes}
          title="Toggle Bounding Boxes"
        >
          <Box className="h-4 w-4" />
          <span className="ml-1">Bounds</span>
        </Button>
        <Button
          variant={snapEnabled ? "secondary" : "default"}
          size="sm"
          onClick={onToggleSnap}
          title="Toggle Snapping"
          disabled={!showBoundingBoxes}
        >
          <Magnet className="h-4 w-4" />
          <span className="ml-1">Snap</span>
        </Button>
        <Button
          variant={showWasdInfo ? "secondary" : "default"}
          size="sm"
          onClick={onToggleWasdInfo}
          title="Toggle WASD Controls Info"
        >
          <Keyboard className="h-4 w-4" />
          <span className="ml-1">WASD</span>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onReset}
          title="Reset Scene"
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1">Reset</span>
        </Button>
      </div>
    </div>
  )
}

