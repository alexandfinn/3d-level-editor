import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Get the absolute path to the public/models directory
    const modelsDirectory = path.join(process.cwd(), 'public', 'models')
    
    // Read all files in the directory
    const files = fs.readdirSync(modelsDirectory)
    
    // Filter for .glb files and create model objects
    const models = files
      .filter(file => file.toLowerCase().endsWith('.glb'))
      .map(file => {
        // Format the name by removing the extension and replacing underscores with spaces
        const name = file
          .replace(/\.glb$/i, '')
          .split(/[_.]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
        
        return {
          name,
          path: `/models/${file}`,
        }
      })
    
    return NextResponse.json(models)
  } catch (error) {
    console.error('Error reading models directory:', error)
    return NextResponse.json([], { status: 500 })
  }
} 