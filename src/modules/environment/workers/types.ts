export type ChunkRequest = 
  | {
      type: 'CALC_LIGHT'
      x: number
      z: number
      neighborVoxels: Record<string, ArrayBuffer>
      neighborLight?: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
    }

export type ChunkResponse = 
  | {
      type: 'LIGHT_CALCULATED'
      x: number
      z: number
      lightBuffer: {
        sky: ArrayBuffer
        block: ArrayBuffer
      }
    }

export type WorkerMessage = ChunkRequest
export type MainMessage = ChunkResponse
