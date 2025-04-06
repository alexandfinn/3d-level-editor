"use client"

import { useState, useEffect } from "react"
import { getThumbnailGenerator } from "../utils/thumbnail-generator"

export function ModelThumbnail({ modelPath, size = 60 }: { modelPath: string; size?: number }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let isMounted = true;

    const generateThumbnail = async () => {
      try {
        const generator = getThumbnailGenerator(size);
        const thumbnail = await generator.generateThumbnail(modelPath);
        if (isMounted) {
          setThumbnailUrl(thumbnail);
        }
      } catch (err) {
        console.error('Failed to generate thumbnail:', err);
        if (isMounted) {
          setError('Failed to load thumbnail');
        }
      }
    };

    generateThumbnail();

    return () => {
      isMounted = false;
    };
  }, [modelPath, size]);

  if (error) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-gray-900 rounded-md overflow-hidden flex items-center justify-center"
      >
        <div className="text-red-500 text-xs text-center px-2">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size }} className="bg-gray-900 rounded-md overflow-hidden">
      {thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt="Model thumbnail" 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          className="bg-transparent"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  )
}

