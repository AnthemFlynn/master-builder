import { ILightingPass } from './ILightingPass'
import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../../../shared/ports/IVoxelQuery'
import { ILightStorage } from '../../ports/ILightStorage'
import { blockRegistry } from '../../../../../modules/blocks'
import { LightValue } from '../../../../../shared/domain/LightValue'

export class PropagationPass implements ILightingPass {
  // Pre-allocated reusable coordinate to avoid GC
  private tempCoord = new ChunkCoordinate(0, 0)
  
  // Reusable queue and visited set as class properties to prevent allocation per execution
  private queue = new Int32Array(2000000 * 7) // Max size, same as QUEUE_SIZE
  private qHead = 0
  private qTail = 0
  private visited = new Map<number, number>() // Stores packed light values

  execute(
    chunkData: ChunkData,
    voxels: IVoxelQuery,
    coord: ChunkCoordinate,
    storage: ILightStorage
  ): void {
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Reset queue and visited for this execution
    this.qHead = 0
    this.qTail = 0
    this.visited.clear()

    const push = (x: number, y: number, z: number, r: number, g: number, b: number, s: number) => {
        if ((this.qTail + 7) % this.queue.length === this.qHead) return
        this.queue[this.qTail] = x
        this.queue[this.qTail+1] = y
        this.queue[this.qTail+2] = z
        this.queue[this.qTail+3] = r
        this.queue[this.qTail+4] = g
        this.queue[this.qTail+5] = b
        this.queue[this.qTail+6] = s
        this.qTail = (this.qTail + 7) % this.queue.length
    }

    const pop = () => {
        if (this.qHead === this.qTail) return null
        const x = this.queue[this.qHead]
        const y = this.queue[this.qHead+1]
        const z = this.queue[this.qHead+2]
        const r = this.queue[this.qHead+3]
        const g = this.queue[this.qHead+4]
        const b = this.queue[this.qHead+5]
        const s = this.queue[this.qHead+6]
        this.qHead = (this.qHead + 7) % this.queue.length
        return { x, y, z, r, g, b, s }
    }

    const isEmpty = () => this.qHead === this.qTail

    const keyPack = (x: number, y: number, z: number) => (x + 128) | ((z + 128) << 8) | (y << 16)
    const packLight = (r: number, g: number, b: number, s: number) => (r << 24) | (g << 16) | (b << 8) | s

    const borderOffsets = [
      { dx: -1, dz: 0 }, { dx: 24, dz: 0 },
      { dx: 0, dz: -1 }, { dx: 0, dz: 24 }
    ]

    // Helper to get light from any chunk (current or neighbor)
    const getGlobalLight = (rx: number, ry: number, rz: number): LightValue | null => {
      let targetChunk: ChunkData | undefined
      let lx: number, ly: number, lz: number

      if (rx >= 0 && rx < 24 && rz >= 0 && rz < 24) {
        targetChunk = chunkData // Current chunk
        lx = rx
        ly = ry
        lz = rz
      } else {
        const cx = coord.x + Math.floor(rx / 24)
        const cz = coord.z + Math.floor(rz / 24)
        this.tempCoord.x = cx
        this.tempCoord.z = cz
        targetChunk = storage.getLightData(this.tempCoord)
        if (!targetChunk) return null // Neighbor chunk not loaded
        lx = ((rx % 24) + 24) % 24
        ly = ry
        lz = ((rz % 24) + 24) % 24
      }
      const b = targetChunk.getBlockLight(lx, ly, lz)
      const s = targetChunk.getSkyLight(lx, ly, lz)
      return { block: b, sky: { r: s, g: s, b: s } }
    }

    // Helper to set light in any chunk
    const setGlobalLight = (rx: number, ry: number, rz: number, r: number, g: number, b: number, s: number): boolean => {
      let targetChunk: ChunkData | undefined
      let lx: number, ly: number, lz: number

      if (rx >= 0 && rx < 24 && rz >= 0 && rz < 24) {
        targetChunk = chunkData // Current chunk
        lx = rx
        ly = ry
        lz = rz
      } else {
        const cx = coord.x + Math.floor(rx / 24)
        const cz = coord.z + Math.floor(rz / 24)
        this.tempCoord.x = cx
        this.tempCoord.z = cz
        targetChunk = storage.getLightData(this.tempCoord)
        if (!targetChunk) return false // Neighbor chunk not loaded
        lx = ((rx % 24) + 24) % 24
        ly = ry
        lz = ((rz % 24) + 24) % 24
      }
      targetChunk.setBlockLight(lx, ly, lz, r, g, b)
      targetChunk.setSkyLight(lx, ly, lz, s)
      return true
    }

    // Inlined processNeighbor closure to capture scope without passing 12 arguments
    const processNeighbor = (
        nx: number, ny: number, nz: number,
        node: {r: number, g: number, b: number, s: number}
    ) => {
        if (ny < 0 || ny >= 256) return

        const lightAbsorption = voxels.getLightAbsorption(worldX + nx, ny, worldZ + nz)
        if (lightAbsorption >= 15) return

        const newR = Math.max(0, node.r - 1 - lightAbsorption)
        const newG = Math.max(0, node.g - 1 - lightAbsorption)
        const newB = Math.max(0, node.b - 1 - lightAbsorption)
        const newS = Math.max(0, node.s - 1 - lightAbsorption)

        if (newR <= 0 && newG <= 0 && newB <= 0 && newS <= 0) return

        const currentLight = getGlobalLight(nx, ny, nz)
        if (!currentLight) return

        let updated = false
        const ub = { ...currentLight.block }
        const us = { ...currentLight.sky }

        if (newR > currentLight.block.r) { ub.r = newR; updated = true; }
        if (newG > currentLight.block.g) { ub.g = newG; updated = true; }
        if (newB > currentLight.block.b) { ub.b = newB; updated = true; }
        if (newS > currentLight.sky.r) { us.r = newS; us.g = newS; us.b = newS; updated = true; }

        if (updated) {
            const success = setGlobalLight(nx, ny, nz, ub.r, ub.g, ub.b, us.r)
            if (success) {
                push(nx, ny, nz, ub.r, ub.g, ub.b, us.r)
            }
        }
    }

    // Phase 0: Seed from neighbors
    for (const { dx, dz } of borderOffsets) {
      const isXAxis = dx !== 0
      for (let i = 0; i < 24; i++) {
        for (let y = 0; y < 256; y++) {
          const checkX = isXAxis ? dx : i
          const checkZ = isXAxis ? i : dz
          const light = getGlobalLight(checkX, y, checkZ)
          if (light && (light.block.r > 0 || light.block.g > 0 || light.block.b > 0 || light.sky.r > 0)) {
             push(checkX, y, checkZ, light.block.r, light.block.g, light.block.b, light.sky.r)
          }
        }
      }
    }

    // Phase 1: Seed internal
    for (let localX = 0; localX < 24; localX++) {
      for (let localY = 0; localY < 256; localY++) {
        for (let localZ = 0; localZ < 24; localZ++) {
          const blockType = voxels.getBlockType(worldX + localX, localY, worldZ + localZ)
          
          const bl = chunkData.getBlockLight(localX, localY, localZ)
          const sl = chunkData.getSkyLight(localX, localY, localZ)
          let r = bl.r
          let g = bl.g
          let b = bl.b
          let s = sl

          if (blockType !== -1) {
            const blockDef = blockRegistry.get(blockType)
            if (blockDef && blockDef.emissive) {
              const { r: er, g: eg, b: eb } = blockDef.emissive
              r = Math.max(r, er)
              g = Math.max(g, eg)
              b = Math.max(b, eb)
            }
          }

          if (r > 0 || g > 0 || b > 0 || s > 0) {
            push(localX, localY, localZ, r, g, b, s)
            // Update data if emissive boosted it
            chunkData.setBlockLight(localX, localY, localZ, r, g, b)
            chunkData.setSkyLight(localX, localY, localZ, s)
          }
        }
      }
    }

    // Phase 2: Flood-fill (BFS) with High Perf Queue
    while (!isEmpty()) {
      const node = pop()!
      
      const k = keyPack(node.x, node.y, node.z)
      const packedPrev = this.visited.get(k)
      if (packedPrev !== undefined) {
          const pr = (packedPrev >>> 24) & 0xFF
          const pg = (packedPrev >>> 16) & 0xFF
          const pb = (packedPrev >>> 8) & 0xFF
          const ps = packedPrev & 0xFF
          if (node.r <= pr && node.g <= pg && node.b <= pb && node.s <= ps) continue
      }
      
      if (packedPrev !== undefined) {
          const pr = (packedPrev >>> 24) & 0xFF
          const pg = (packedPrev >>> 16) & 0xFF
          const pb = (packedPrev >>> 8) & 0xFF
          const ps = packedPrev & 0xFF
          const maxPacked = packLight(Math.max(node.r, pr), Math.max(node.g, pg), Math.max(node.b, pb), Math.max(node.s, ps))
          this.visited.set(k, maxPacked)
      } else {
          this.visited.set(k, packLight(node.r, node.g, node.b, node.s))
      }

      // Neighbors: Unrolled for speed
      processNeighbor(node.x + 1, node.y, node.z, node)
      processNeighbor(node.x - 1, node.y, node.z, node)
      processNeighbor(node.x, node.y + 1, node.z, node)
      processNeighbor(node.x, node.y - 1, node.z, node)
      processNeighbor(node.x, node.y, node.z + 1, node)
      processNeighbor(node.x, node.y, node.z - 1, node)
    }
  }
}
