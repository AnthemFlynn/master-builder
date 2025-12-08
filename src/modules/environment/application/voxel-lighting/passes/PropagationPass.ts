import { ILightingPass } from './ILightingPass'
import { LightData } from '../../domain/voxel-lighting/LightData'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../../../shared/ports/IVoxelQuery'
import { ILightStorage } from '../../ports/ILightStorage'
import { blockRegistry } from '../../../../../modules/blocks'
import { LightValue } from '../../domain/voxel-lighting/LightValue'

export class PropagationPass implements ILightingPass {
  // Pre-allocated reusable coordinate to avoid GC
  private tempCoord = new ChunkCoordinate(0, 0)

  execute(
    lightData: LightData,
    voxels: IVoxelQuery,
    coord: ChunkCoordinate,
    storage: ILightStorage
  ): void {
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Queue: Use a flat Int32Array as a ring buffer/queue for ZERO allocation
    // Format: x, y, z, r, g, b, s (7 ints per node)
    const QUEUE_SIZE = 2000000 * 7 // Increased to 2M to handle Sky Light flood
    const queue = new Int32Array(QUEUE_SIZE)
    let qHead = 0
    let qTail = 0

    const push = (x: number, y: number, z: number, r: number, g: number, b: number, s: number) => {
        if ((qTail + 7) % QUEUE_SIZE === qHead) {
            // Queue Full - Drop logic or expand. For now, drop (rare).
            return
        }
        queue[qTail] = x
        queue[qTail+1] = y
        queue[qTail+2] = z
        queue[qTail+3] = r
        queue[qTail+4] = g
        queue[qTail+5] = b
        queue[qTail+6] = s
        qTail = (qTail + 7) % QUEUE_SIZE
    }

    const pop = () => {
        if (qHead === qTail) return null
        const x = queue[qHead]
        const y = queue[qHead+1]
        const z = queue[qHead+2]
        const r = queue[qHead+3]
        const g = queue[qHead+4]
        const b = queue[qHead+5]
        const s = queue[qHead+6]
        qHead = (qHead + 7) % QUEUE_SIZE
        return { x, y, z, r, g, b, s }
    }

    const isEmpty = () => qHead === qTail

    const visited = new Map<number, number>()
    const keyPack = (x: number, y: number, z: number) => (x + 32) | ((z + 32) << 6) | (y << 12)
    const packLight = (r: number, g: number, b: number, s: number) => (r << 24) | (g << 16) | (b << 8) | s

    // Helper to get light from any chunk (current or neighbor)
    const getGlobalLight = (rx: number, ry: number, rz: number): LightValue | null => {
      if (rx >= 0 && rx < 24 && rz >= 0 && rz < 24) {
        return lightData.getLight(rx, ry, rz)
      }
      const cx = coord.x + Math.floor(rx / 24)
      const cz = coord.z + Math.floor(rz / 24)
      this.tempCoord.x = cx
      this.tempCoord.z = cz
      const neighborData = storage.getLightData(this.tempCoord)
      if (!neighborData) return null
      const lx = ((rx % 24) + 24) % 24
      const lz = ((rz % 24) + 24) % 24
      return neighborData.getLight(lx, ry, lz)
    }

    const setGlobalLight = (rx: number, ry: number, rz: number, value: LightValue): boolean => {
      if (rx >= 0 && rx < 24 && rz >= 0 && rz < 24) {
        lightData.setLight(rx, ry, rz, value)
        return true
      }
      const cx = coord.x + Math.floor(rx / 24)
      const cz = coord.z + Math.floor(rz / 24)
      this.tempCoord.x = cx
      this.tempCoord.z = cz
      const neighborData = storage.getLightData(this.tempCoord)
      if (!neighborData) return false
      const lx = ((rx % 24) + 24) % 24
      const lz = ((rz % 24) + 24) % 24
      neighborData.setLight(lx, ry, lz, value)
      return true
    }

    const borderOffsets = [
      { dx: -1, dz: 0 }, { dx: 24, dz: 0 },
      { dx: 0, dz: -1 }, { dx: 0, dz: 24 }
    ]

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
          const currentLight = lightData.getLight(localX, localY, localZ)
          let r = currentLight.block.r
          let g = currentLight.block.g
          let b = currentLight.block.b
          let s = currentLight.sky.r

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
            lightData.setLight(localX, localY, localZ, { sky: { r: s, g: s, b: s }, block: { r, g, b } })
          }
        }
      }
    }

    // Phase 2: Flood-fill (BFS) with High Perf Queue
    while (!isEmpty()) {
      const node = pop()!
      
      // Smart Visited Check
      const k = keyPack(node.x, node.y, node.z)
      const packedPrev = visited.get(k)
      if (packedPrev !== undefined) {
          const pr = (packedPrev >>> 24) & 0xFF
          const pg = (packedPrev >>> 16) & 0xFF
          const pb = (packedPrev >>> 8) & 0xFF
          const ps = packedPrev & 0xFF
          // If node is dimmer or equal in ALL channels, skip
          if (node.r <= pr && node.g <= pg && node.b <= pb && node.s <= ps) continue
      }
      
      // Update visited with MAX of each channel
      if (packedPrev !== undefined) {
          const pr = (packedPrev >>> 24) & 0xFF
          const pg = (packedPrev >>> 16) & 0xFF
          const pb = (packedPrev >>> 8) & 0xFF
          const ps = packedPrev & 0xFF
          const maxPacked = packLight(Math.max(node.r, pr), Math.max(node.g, pg), Math.max(node.b, pb), Math.max(node.s, ps))
          visited.set(k, maxPacked)
      } else {
          visited.set(k, packLight(node.r, node.g, node.b, node.s))
      }

      // Neighbors: Unrolled for speed
      this.processNeighbor(node.x + 1, node.y, node.z, node, worldX, worldZ, voxels, getGlobalLight, setGlobalLight, push)
      this.processNeighbor(node.x - 1, node.y, node.z, node, worldX, worldZ, voxels, getGlobalLight, setGlobalLight, push)
      this.processNeighbor(node.x, node.y + 1, node.z, node, worldX, worldZ, voxels, getGlobalLight, setGlobalLight, push)
      this.processNeighbor(node.x, node.y - 1, node.z, node, worldX, worldZ, voxels, getGlobalLight, setGlobalLight, push)
      this.processNeighbor(node.x, node.y, node.z + 1, node, worldX, worldZ, voxels, getGlobalLight, setGlobalLight, push)
      this.processNeighbor(node.x, node.y, node.z - 1, node, worldX, worldZ, voxels, getGlobalLight, setGlobalLight, push)
    }
  }

  private processNeighbor(
      nx: number, ny: number, nz: number,
      node: {r: number, g: number, b: number, s: number},
      worldX: number, worldZ: number,
      voxels: IVoxelQuery,
      getGlobalLight: any,
      setGlobalLight: any,
      push: any
  ) {
      if (ny < 0 || ny >= 256) return

      const lightAbsorption = voxels.getLightAbsorption(worldX + nx, ny, worldZ + nz)
      if (lightAbsorption >= 15) return

      const newR = Math.max(0, node.r - 1 - lightAbsorption)
      const newG = Math.max(0, node.g - 1 - lightAbsorption)
      const newB = Math.max(0, node.b - 1 - lightAbsorption)
      
      // Re-enable Sky Light propagation (Horizontal).
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
          const success = setGlobalLight(nx, ny, nz, { sky: us, block: ub })
          if (success) {
              // Push node with updated sky light
              push(nx, ny, nz, ub.r, ub.g, ub.b, us.r)
          }
      }
  }
}