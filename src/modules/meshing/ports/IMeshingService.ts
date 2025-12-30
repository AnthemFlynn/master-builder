import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'

/**
 * IMeshingService - Port interface for mesh generation
 */
export interface IMeshingService {
  markDirty(coord: ChunkCoordinate, reason: 'block' | 'light' | 'global'): void
  processDirtyQueue(budgetMs?: number): { chunksProcessed: number; budgetUsedMs: number }
  getQueueDepth(): number
  getWorkerUtilization(): { busy: number; total: number }
}
