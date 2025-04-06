"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModelThumbnail } from "./model-thumbnail";

// This is our model registry - add new models here
const availableModels = [
  {
    name: "Custom Model",
    path: "/models/model.glb",
  },
  {
    name: "Dungeon 1",
    path: "/models/Dungeon_Big.001.glb",
  },
  {
    name: "Table",
    path: "/models/Table_Small.glb",
  },
  // Add more models here as you add them to the public/models directory
];

export function ModelsLibrary({
  onAddModel,
}: {
  onAddModel: (modelPath: string) => void;
}) {
  const [models, setModels] = useState<{ name: string; path: string }[]>([]);

  useEffect(() => {
    // Fetch the list of models from the API endpoint
    fetch("/api/models")
      .then((response) => response.json())
      .then((data) => {
        setModels(data);
      })
      .catch((error) => {
        console.error("Failed to load models:", error);
      });
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {models.map((model) => (
        <Button
          key={model.path}
          variant="outline"
          className="flex flex-col items-center justify-center h-24 bg-gray-800 hover:bg-gray-700 text-white p-0"
          onClick={() => onAddModel(model.path)}
        >
          <ModelThumbnail modelPath={model.path} />
          <span className="text-xs truncate w-full text-center overflow-hidden text-ellipsis">
            {model.name.replace("Dungeon", "Dng")}
          </span>
        </Button>
      ))}
    </div>
  );
}
