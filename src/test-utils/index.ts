/**
 * Test Utilities Index
 *
 * Re-exports all test utilities for convenient importing.
 */

export { MockEventBus, type CapturedEvent } from './MockEventBus'

export {
  MockVector3,
  MockQuaternion,
  MockEuler,
  MockObject3D,
  MockScene,
  MockCamera,
  MockMesh,
  MockRaycaster,
  createMockSceneSetup
} from './MockThreeJS'

export {
  createEmptyChunk,
  createFlatChunk,
  createSingleBlockChunk,
  createFilledChunk,
  createTerrainChunk,
  createCaveChunk,
  createWaterChunk,
  createChunkNeighborhood,
  setChunkLighting
} from './TestChunkData'
