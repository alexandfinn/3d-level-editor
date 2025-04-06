import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Get the absolute path to the public/models directory
    const modelsDirectory = path.join(process.cwd(), 'public', 'models')
    
    // Get all category directories
    const categories = fs.readdirSync(modelsDirectory)
      .filter(item => fs.statSync(path.join(modelsDirectory, item)).isDirectory())

    // Create a map of category to models
    const modelsByCategory = categories.reduce((acc, category) => {
      const categoryPath = path.join(modelsDirectory, category)
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.toLowerCase().endsWith('.glb'))
        .map(file => {
          const name = file
            .replace(/\.glb$/i, '')
            .split(/[_.]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
          
          return {
            name,
            path: `/models/${category}/${file}`,
            category
          }
        })
      
      acc[category] = files
      return acc
    }, {} as Record<string, Array<{ name: string; path: string; category: string }>>)
    
    return NextResponse.json(modelsByCategory)
  } catch (error) {
    console.error('Error reading models directory:', error)
    return NextResponse.json({}, { status: 500 })
  }
} 