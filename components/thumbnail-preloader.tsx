"use client"

import { useEffect, useState } from 'react'
import { getThumbnailGenerator } from '../utils/thumbnail-generator'

export function ThumbnailPreloader({ 
  modelPaths, 
  onComplete 
}: { 
  modelPaths: string[]
  onComplete: () => void 
}) {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let isMounted = true;
    let completed = 0;

    const generateThumbnails = async () => {
      try {
        const generator = getThumbnailGenerator();
        
        // Process thumbnails in batches of 3 to avoid overwhelming the GPU
        for (let i = 0; i < modelPaths.length; i += 3) {
          const batch = modelPaths.slice(i, i + 3);
          await Promise.all(
            batch.map(async (path) => {
              try {
                await generator.generateThumbnail(path);
                if (isMounted) {
                  completed++;
                  setProgress(Math.round((completed / modelPaths.length) * 100));
                }
              } catch (error) {
                console.error(`Failed to generate thumbnail for ${path}:`, error);
              }
            })
          );
        }

        if (isMounted) {
          onComplete();
        }
      } catch (err) {
        console.error('Failed to initialize thumbnail generator:', err);
        if (isMounted) {
          setError('Failed to initialize thumbnail generator');
        }
      }
    };

    generateThumbnails();

    return () => {
      isMounted = false;
    };
  }, [modelPaths, onComplete]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
          <h2 className="text-red-500 text-xl mb-4">Error</h2>
          <p className="text-white">{error}</p>
          <button 
            onClick={onComplete}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
        <h2 className="text-white text-xl mb-4">Generating Thumbnails</h2>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-300 mt-2 text-center">{progress}%</p>
      </div>
    </div>
  )
} 