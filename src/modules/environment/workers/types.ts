export type ChunkRequest = 
  | {
      type: 'CALC_LIGHT'
      x: number
      z: number
      neighborVoxels: Record<string, ArrayBuffer> // Now contains Blocks AND Light
    }

export type ChunkResponse =
  | {
      type: 'LIGHT_CALCULATED'
      x: number
      z: number
      chunkBuffer: ArrayBuffer // Updated buffer with light
      timingMs: number
    }

export type WorkerMessage = ChunkRequest
export type MainMessage = ChunkResponse
