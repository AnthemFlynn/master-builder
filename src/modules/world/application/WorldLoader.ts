import { WorldDefinition, WorldDefinitionSchema } from '../domain/WorldDefinition'

export class WorldLoader {
  private static readonly MAX_FILE_SIZE = 1_000_000  // 1MB limit
  private cache = new Map<string, WorldDefinition>()

  async load(path: string): Promise<WorldDefinition> {
    // Check cache first
    if (this.cache.has(path)) {
      return this.cache.get(path)!
    }

    // Fetch JSON file (handle both browser/Worker and Node/Bun test environments)
    let json: any

    // Check if we're in Node/Bun test environment (has process global)
    const isNodeEnvironment = typeof process !== 'undefined' && process.versions != null

    if (isNodeEnvironment) {
      // Node/Bun test environment - use file system
      const fs = await import('fs/promises')
      const filePath = path.startsWith('/') ? `public${path}` : path
      const fileContent = await fs.readFile(filePath, 'utf-8')

      // Check size limit
      if (fileContent.length > WorldLoader.MAX_FILE_SIZE) {
        throw new Error(`World definition too large (${fileContent.length} bytes, max ${WorldLoader.MAX_FILE_SIZE})`)
      }

      json = JSON.parse(fileContent)
    } else {
      // Browser/Web Worker environment - use fetch
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load world: ${path}`)
      }

      // Check size limit to prevent DoS
      const text = await response.text()
      if (text.length > WorldLoader.MAX_FILE_SIZE) {
        throw new Error(`World definition too large (${text.length} bytes, max ${WorldLoader.MAX_FILE_SIZE})`)
      }

      json = JSON.parse(text)
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
