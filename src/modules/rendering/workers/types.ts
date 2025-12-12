export type MeshingRequest = 
  | {
      type: 'GEN_MESH'
      x: number
      z: number
      neighborVoxels: Record<string, ArrayBuffer>
      neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
    }

export type MeshingResponse =
  | {
      type: 'MESH_GENERATED'
      x: number
      z: number
      geometry: Record<string, {
        positions: ArrayBuffer
        colors: ArrayBuffer
        uvs: ArrayBuffer
        indices: ArrayBuffer
      }>
      timingMs: number
    }

export type WorkerMessage = MeshingRequest
export type MainMessage = MeshingResponse
