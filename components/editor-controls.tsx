"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import type { TransformMode } from "./level-editor"
import { Move, RotateCcw, Maximize } from "lucide-react"

export function EditorControls({
  transformMode,
  onChangeMode,
}: {
  transformMode: TransformMode
  onChangeMode: (mode: TransformMode) => void
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
            className={transformMode === control.mode ? "border border-white" : ""}
            size="sm"
            onClick={() => onChangeMode(control.mode)}
            title={control.label}
          >
            {control.icon}
            <span className="ml-1">{control.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

