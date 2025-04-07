"use client";

import type { SceneObject } from "./level-editor";
import { Button } from "@/components/ui/button";
import { Trash2, Lock } from "lucide-react";
import { ModelThumbnail } from "./model-thumbnail";

// Helper function to get category from model path
const getCategoryFromPath = (modelPath?: string): string | null => {
  if (!modelPath) return null;
  const parts = modelPath.split("/");
  return parts.length >= 3 ? parts[2] : null;
};

export function ObjectList({
  objects,
  selectedId,
  onSelect,
  onDelete,
  lockedCategories,
}: {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  lockedCategories: Set<string>;
}) {
  if (objects.length === 0) {
    return <p className="text-gray-400 text-sm">No objects in scene</p>;
  }

  return (
    <div className="space-y-1 w-full">
      {objects.map((obj) => {
        const category = getCategoryFromPath(obj.modelPath);
        const isLocked = category && lockedCategories.has(category);

        return (
          <div
            key={obj.id}
            className={`flex items-center justify-between p-2 rounded cursor-pointer ${
              isLocked
                ? "opacity-50 cursor-not-allowed bg-gray-800"
                : selectedId === obj.id
                ? "bg-gray-700"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
            onClick={() => !isLocked && onSelect(obj.id)}
          >
            <div className="flex items-center overflow-hidden flex-grow min-w-0 mr-1">
              {obj.modelPath && (
                <div
                  className="mr-2 flex-shrink-0"
                  style={{ width: 24, height: 24 }}
                >
                  <ModelThumbnail modelPath={obj.modelPath} size={24} />
                </div>
              )}
              <div className="flex items-center min-w-0">
                <span className="truncate">{obj.name}</span>
                {isLocked && (
                  <Lock className="h-3 w-3 ml-1 flex-shrink-0 text-gray-400" />
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(obj.id);
              }}
              disabled={isLocked}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
