export type ChunkRequest = 
  | {
      type: 'GENERATE_CHUNK'
      x: number
      z: number
      renderDistance: number
    }
  | {
      type: 'CALC_LIGHT'
      x: number
      z: number
      neighborVoxels: Record<string, ArrayBuffer>
      neighborLight?: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
    }
  | {
      type: 'GEN_MESH'
      x: number
      z: number
      neighborVoxels: Record<string, ArrayBuffer>
      neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
    }

export type ChunkResponse = 
  | {
      type: 'CHUNK_GENERATED'
      x: number
      z: number
      renderDistance: number
      blockBuffer: ArrayBuffer
    }
  | {
      type: 'LIGHT_CALCULATED'
      x: number
      z: number
      lightBuffer: {
        sky: ArrayBuffer
        block: ArrayBuffer
      }
    }
  | {
      type: 'MESH_GENERATED'
      x: number
      z: number
      // Map<MaterialKey, Buffers>
      geometry: Record<string, {
        positions: ArrayBuffer
        colors: ArrayBuffer
        uvs: ArrayBuffer
        indices: ArrayBuffer
      }>
    }

export type WorkerMessage = ChunkRequest
export type MainMessage = ChunkResponse
