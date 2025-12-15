import { describe, it } from 'bun:test'
import { FloatingIslandGenerator } from '../features/FloatingIslandGenerator'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { createNoise2D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

describe('Island Coordinate Debug', () => {
  it('should show where islands are placed for chunk 0,0', () => {
    const seed = 42069
    const spacing = 350
    const coord = new ChunkCoordinate(0, 0)

    console.log(`\nChunk (0, 0) world coordinates: X=${coord.x * 24} to ${coord.x * 24 + 23}, Z=${coord.z * 24} to ${coord.z * 24 + 23}`)

    // Simulate getIslandCenters logic
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        const gridX = Math.floor((coord.x * 24) / spacing) + gx
        const gridZ = Math.floor((coord.z * 24) / spacing) + gz

        const noise = createNoise2D(() => seed + gridX * 1000 + gridZ)
        const offsetX = noise(gridX, gridZ) * 80
        const offsetZ = noise(gridZ, gridX) * 80

        const islandX = gridX * spacing + offsetX
        const islandZ = gridZ * spacing + offsetZ

        const rng = new SeededRandom(seed + gridX * 7919 + gridZ * 6547)
        const radius = rng.range(50, 100)
        const height = rng.range(90, 130)

        console.log(`  Grid (${gridX}, ${gridZ}): Island at world (${islandX.toFixed(1)}, ${islandZ.toFixed(1)}, Y=${height.toFixed(1)}), radius=${radius.toFixed(1)}`)

        // Check if this island affects chunk (0,0)
        const chunkMinX = 0, chunkMaxX = 23
        const chunkMinZ = 0, chunkMaxZ = 23
        const islandMinX = islandX - radius
        const islandMaxX = islandX + radius
        const islandMinZ = islandZ - radius
        const islandMaxZ = islandZ + radius

        const intersects = islandMinX < chunkMaxX && islandMaxX > chunkMinX &&
                          islandMinZ < chunkMaxZ && islandMaxZ > chunkMinZ

        if (intersects) {
          console.log(`    -> INTERSECTS chunk (0,0)!`)
        }
      }
    }
  })
})
