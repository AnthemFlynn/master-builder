export type ChunkRequest = 
  | {
      type: 'GENERATE_CHUNK'
      x: number
      z: number
      renderDistance: number
    }

export type ChunkResponse = 
  | {
      type: 'CHUNK_GENERATED'
      x: number
      z: number
      renderDistance: number
      blockBuffer: ArrayBuffer
      metadata: Map<number, any>
    }

export type WorkerMessage = ChunkRequest
export type MainMessage = ChunkResponse