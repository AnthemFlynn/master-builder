import { ILightingPass } from './ILightingPass'
import { LightData } from '../../lighting-domain/LightData'
import { ChunkCoordinate } from '../../domain/ChunkCoordinate'
import { IVoxelQuery } from '../../ports/IVoxelQuery'
import { ILightStorage } from '../../lighting-ports/ILightStorage'
import { blockRegistry } from '../../../../blocks'
import { LightValue } from '../../lighting-domain/LightValue'

interface LightNode {
  x: number
  y: number
  z: number
  r: number
  g: number
  b: number
}

export class PropagationPass implements ILightingPass {
  execute(
    lightData: LightData,
    voxels: IVoxelQuery,
    coord: ChunkCoordinate,
    storage: ILightStorage
  ): void {
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Queue for flood-fill BFS
    const lightQueue: LightNode[] = []
    const visited = new Set<string>()

    // Helper to get light from any chunk (current or neighbor)
    const getGlobalLight = (rx: number, ry: number, rz: number): LightValue | null => {
      // Fast path: inside current chunk
      if (rx >= 0 && rx < 24 && rz >= 0 && rz < 24) {
        return lightData.getLight(rx, ry, rz)
      }

      // Calculate target chunk
      const cx = coord.x + Math.floor(rx / 24)
      const cz = coord.z + Math.floor(rz / 24)
      const targetCoord = new ChunkCoordinate(cx, cz)
      
      const neighborData = storage.getLightData(targetCoord)
      if (!neighborData) return null

      // Calculate local coordinates in target chunk
      const lx = ((rx % 24) + 24) % 24
      const lz = ((rz % 24) + 24) % 24
      
      return neighborData.getLight(lx, ry, lz)
    }

    // Helper to set light in any chunk
    const setGlobalLight = (rx: number, ry: number, rz: number, value: LightValue): boolean => {
      // Fast path: inside current chunk
      if (rx >= 0 && rx < 24 && rz >= 0 && rz < 24) {
        lightData.setLight(rx, ry, rz, value)
        return true
      }

      const cx = coord.x + Math.floor(rx / 24)
      const cz = coord.z + Math.floor(rz / 24)
      const targetCoord = new ChunkCoordinate(cx, cz)

      const neighborData = storage.getLightData(targetCoord)
      if (!neighborData) return false

      const lx = ((rx % 24) + 24) % 24
      const lz = ((rz % 24) + 24) % 24

      neighborData.setLight(lx, ry, lz, value)
      return true
    }

    // Phase 0: Seed from neighbors (Pull light)
    // Check adjacent blocks of neighbors. If they have light, add to queue.
    const borderOffsets = [
      { dx: -1, dz: 0 }, // Left neighbor
      { dx: 24, dz: 0 }, // Right neighbor
      { dx: 0, dz: -1 }, // Back neighbor
      { dx: 0, dz: 24 }  // Front neighbor
    ]

    for (const { dx, dz } of borderOffsets) {
      // Iterate the face shared with this neighbor
      // If dx=-1, we check local x=-1 (neighbor's x=23)
      // We iterate y (0-256) and the other axis (z 0-24)
      
      const isXAxis = dx !== 0
      
      for (let i = 0; i < 24; i++) { // The other axis (Z or X)
        for (let y = 0; y < 256; y++) {
          const checkX = isXAxis ? dx : i
          const checkZ = isXAxis ? i : dz
          
          const light = getGlobalLight(checkX, y, checkZ)
          if (light && (light.block.r > 0 || light.block.g > 0 || light.block.b > 0)) {
             lightQueue.push({
               x: checkX,
               y: y,
               z: checkZ,
               r: light.block.r,
               g: light.block.g,
               b: light.block.b
             })
          }
        }
      }
    }

    // Phase 1: Seed from internal emissive blocks
    for (let localX = 0; localX < 24; localX++) {
      for (let localY = 0; localY < 256; localY++) {
        for (let localZ = 0; localZ < 24; localZ++) {
          const blockType = voxels.getBlockType(
            worldX + localX,
            localY,
            worldZ + localZ
          )

          if (blockType !== -1) {
            const blockDef = blockRegistry.get(blockType)
            if (blockDef && blockDef.emissive) {
              const { r, g, b } = blockDef.emissive

              if (r > 0 || g > 0 || b > 0) {
                lightQueue.push({
                  x: localX,
                  y: localY,
                  z: localZ,
                  r, g, b
                })
                
                // Ensure the block itself is set
                const current = lightData.getLight(localX, localY, localZ)
                lightData.setLight(localX, localY, localZ, {
                  sky: current.sky,
                  block: { r, g, b }
                })
              }
            }
          }
        }
      }
    }

    // Phase 2: Flood-fill (BFS)
    while (lightQueue.length > 0) {
      const node = lightQueue.shift()!
      
      // Optimization: If light is 0, stop
      if (node.r <= 0 && node.g <= 0 && node.b <= 0) continue

      const key = `${node.x},${node.y},${node.z}`
      if (visited.has(key)) continue
      visited.add(key)

      const neighbors = [
        { dx: 1, dy: 0, dz: 0 },
        { dx: -1, dy: 0, dz: 0 },
        { dx: 0, dy: 1, dz: 0 },
        { dx: 0, dy: -1, dz: 0 },
        { dx: 0, dy: 0, dz: 1 },
        { dx: 0, dy: 0, dz: -1 }
      ]

      for (const { dx, dy, dz } of neighbors) {
        const nx = node.x + dx
        const ny = node.y + dy
        const nz = node.z + dz

        if (ny < 0 || ny >= 256) continue

        // Check if block is solid
        // Note: voxels.getBlockType takes WORLD coordinates
        const neighborBlock = voxels.getBlockType(worldX + nx, ny, worldZ + nz)
        
        if (neighborBlock !== -1) {
          const neighborDef = blockRegistry.get(neighborBlock)
          if (neighborDef && neighborDef.lightAbsorption >= 15) {
            continue
          }
        }

        // Calculate attenuated light
        const newR = Math.max(0, node.r - 1)
        const newG = Math.max(0, node.g - 1)
        const newB = Math.max(0, node.b - 1)

        if (newR === 0 && newG === 0 && newB === 0) continue

        // Get current light at neighbor (Global lookup)
        const currentLight = getGlobalLight(nx, ny, nz)
        if (!currentLight) continue // Neighbor chunk not loaded

        if (newR > currentLight.block.r || newG > currentLight.block.g || newB > currentLight.block.b) {
          const success = setGlobalLight(nx, ny, nz, {
            sky: currentLight.sky,
            block: {
              r: Math.max(currentLight.block.r, newR),
              g: Math.max(currentLight.block.g, newG),
              b: Math.max(currentLight.block.b, newB)
            }
          })

          if (success) {
            lightQueue.push({ x: nx, y: ny, z: nz, r: newR, g: newG, b: newB })
          }
        }
      }
    }
  }
}