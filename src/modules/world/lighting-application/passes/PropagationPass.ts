// src/modules/lighting/application/passes/PropagationPass.ts
import { ILightingPass } from './ILightingPass'
import { LightData } from '../../lighting-domain/LightData'
import { ChunkCoordinate } from '../../domain/ChunkCoordinate'
import { IVoxelQuery } from '../../ports/IVoxelQuery'
import { blockRegistry } from '../../../../blocks'

interface LightNode {
  x: number
  y: number
  z: number
  r: number
  g: number
  b: number
}

export class PropagationPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoordinate): void {
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Queue for flood-fill BFS
    const lightQueue: LightNode[] = []

    // First pass: Find all emissive blocks and add to queue
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

              // Only add if block actually emits light
              if (r > 0 || g > 0 || b > 0) {
                lightQueue.push({
                  x: localX,
                  y: localY,
                  z: localZ,
                  r, g, b
                })

                // Set initial light at emissive block
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

    // Second pass: Flood-fill propagation (BFS)
    const visited = new Set<string>()

    while (lightQueue.length > 0) {
      const node = lightQueue.shift()!
      const key = `${node.x},${node.y},${node.z}`

      if (visited.has(key)) continue
      visited.add(key)

      // Propagate to 6 neighbors
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

        // Check bounds (stay within chunk)
        if (nx < 0 || nx >= 24 || ny < 0 || ny >= 256 || nz < 0 || nz >= 24) {
          continue
        }

        // Check if neighbor is solid (blocks light)
        const neighborBlock = voxels.getBlockType(worldX + nx, ny, worldZ + nz)
        if (neighborBlock !== -1) {
          const neighborDef = blockRegistry.get(neighborBlock)
          // Skip if block absorbs light (solid blocks)
          if (neighborDef && neighborDef.lightAbsorption >= 1.0) {
            continue
          }
        }

        // Calculate attenuated light (decrease by 1 per block)
        const newR = Math.max(0, node.r - 1)
        const newG = Math.max(0, node.g - 1)
        const newB = Math.max(0, node.b - 1)

        // Only propagate if there's light left
        if (newR <= 0 && newG <= 0 && newB <= 0) {
          continue
        }

        // Get current light at neighbor
        const currentLight = lightData.getLight(nx, ny, nz)

        // Only update if new light is brighter
        if (newR > currentLight.block.r || newG > currentLight.block.g || newB > currentLight.block.b) {
          lightData.setLight(nx, ny, nz, {
            sky: currentLight.sky,
            block: {
              r: Math.max(currentLight.block.r, newR),
              g: Math.max(currentLight.block.g, newG),
              b: Math.max(currentLight.block.b, newB)
            }
          })

          // Add to queue for further propagation
          lightQueue.push({ x: nx, y: ny, z: nz, r: newR, g: newG, b: newB })
        }
      }
    }

    console.log(`💡 PropagationPass: Processed ${visited.size} light nodes in chunk (${coord.x}, ${coord.z})`)
  }
}
