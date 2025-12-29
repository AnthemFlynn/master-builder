import { InventoryBank } from '../domain/InventoryState'

/**
 * IInventoryQuery - Port interface for inventory queries
 */
export interface IInventoryQuery {
  getSelectedSlot(): number
  getSelectedBlockId(): number
  getActiveBank(): InventoryBank
  getActiveBankId(): number
}
