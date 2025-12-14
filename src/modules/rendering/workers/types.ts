export type MeshingRequest =
  | {
      type: 'GEN_MESH'
      x: number
      z: number
      lodLevel: 0 | 1 | 2 | 3
      priority: number
      neighborVoxels: Record<string, ArrayBuffer>
      neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
    }

export type MeshingResponse =
  | {
      type: 'MESH_GENERATED'
      x: number
      z: number
      lodLevel: 0 | 1 | 2 | 3
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
