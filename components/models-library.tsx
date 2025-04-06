"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModelThumbnail } from "./model-thumbnail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Model {
  name: string;
  path: string;
  category: string;
}

interface ModelsByCategory {
  [category: string]: Model[];
}

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
  const [modelsByCategory, setModelsByCategory] = useState<ModelsByCategory>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const categories = Object.keys(modelsByCategory);

  useEffect(() => {
    // Fetch the list of models from the API endpoint
    fetch("/api/models")
      .then((response) => response.json())
      .then((data: ModelsByCategory) => {
        setModelsByCategory(data);
        // Set the initial category to the first one if available
        if (Object.keys(data).length > 0) {
          setSelectedCategory(Object.keys(data)[0]);
        }
      })
      .catch((error) => {
        console.error("Failed to load models:", error);
      });
  }, []);

  const currentModels = selectedCategory ? modelsByCategory[selectedCategory] || [] : [];

  return (
    <div className="space-y-4">
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-2">
        {currentModels.map((model) => (
          <Button
            key={model.path}
            variant="outline"
            className="flex flex-col items-center justify-center h-24 bg-gray-800 hover:bg-gray-700 text-white p-0"
            onClick={() => onAddModel(model.path)}
          >
            <ModelThumbnail modelPath={model.path} />
            <span className="text-xs truncate w-full text-center overflow-hidden text-ellipsis">
              {model.name}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
