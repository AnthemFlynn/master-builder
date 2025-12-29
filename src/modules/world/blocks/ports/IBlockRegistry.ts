import { BlockDefinition, BlockCategory } from '../domain/types'

/**
 * IBlockRegistry - Port interface for block registry
 */
export interface IBlockRegistry {
  get(id: number): BlockDefinition | undefined
  getAllBlocks(): BlockDefinition[]
  getByCategory(category: BlockCategory): BlockDefinition[]
  getInventoryBlocks(): BlockDefinition[]
  getBlockCount(): number
}
