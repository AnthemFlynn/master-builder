import { WorldDefinition, WorldDefinitionSchema } from '../domain/WorldDefinition'

export class WorldLoader {
  private cache = new Map<string, WorldDefinition>()

  async load(path: string): Promise<WorldDefinition> {
    // Check cache first
    if (this.cache.has(path)) {
      return this.cache.get(path)!
    }

    // Fetch JSON file (handle both browser and Node/Bun environments)
    let json: any

    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load world: ${path}`)
      }
      json = await response.json()
    } else {
      // Node/Bun test environment - use file system
      const fs = await import('fs/promises')
      const filePath = path.startsWith('/') ? `public${path}` : path
      const fileContent = await fs.readFile(filePath, 'utf-8')
      json = JSON.parse(fileContent)
    }

    // Validate with Zod
    const result = WorldDefinitionSchema.safeParse(json)
    if (!result.success) {
      throw new Error(`Invalid world definition: ${result.error.message}`)
    }

    // Cache and return
    this.cache.set(path, result.data)
    return result.data
  }
}
