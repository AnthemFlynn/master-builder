export type ChunkRequest =
  | {
      type: 'GENERATE_CHUNK'
      x: number
      z: number
      renderDistance: number
    }
  | {
      type: 'SET_WORLD_TYPE'
      worldType: string  // 'default' | 'flat' | 'caves' | 'forest' | 'crystals'
      seed?: number      // Optional seed override
    }

export type ChunkResponse =
  | {
      type: 'CHUNK_GENERATED'
      x: number
      z: number
      renderDistance: number
      blockBuffer: ArrayBuffer
      metadata: Map<number, any>
      timingMs: number
    }
  | {
      type: 'WORLD_TYPE_SET'
      worldType: string
      success: boolean
    }

export type WorkerMessage = ChunkRequest
export type MainMessage = ChunkResponse
