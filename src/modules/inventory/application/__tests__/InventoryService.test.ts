import { describe, it, expect, beforeEach } from 'bun:test'
import { InventoryService } from '../InventoryService'
import { MockEventBus } from '../../../../test-utils'

// Need to initialize block registry for inventory tests
import { initializeBlockRegistry } from '../../../blocks'
initializeBlockRegistry()

describe('InventoryService', () => {
  let inventoryService: InventoryService
  let mockEventBus: MockEventBus

  beforeEach(() => {
    mockEventBus = new MockEventBus()
    inventoryService = new InventoryService(mockEventBus as any)
  })

  describe('initialization', () => {
    it('should initialize with default loadout in bank 0', () => {
      const bank = inventoryService.getActiveBank()
      expect(bank.id).toBe(0)
      expect(bank.name).toBe('Building')

      // Default slots: Stone=1, Dirt=2, Grass=3, Wood=4, Leaves=5, Sand=6, Glass=20, Plank=8, Brick=9
      expect(bank.slots[0]).toBe(1) // Stone
      expect(bank.slots[1]).toBe(2) // Dirt
      expect(bank.slots[2]).toBe(3) // Grass
      expect(bank.slots[3]).toBe(4) // Wood
      expect(bank.slots[4]).toBe(5) // Leaves
      expect(bank.slots[5]).toBe(6) // Sand
      expect(bank.slots[6]).toBe(20) // Glass
      expect(bank.slots[7]).toBe(8) // Plank
      expect(bank.slots[8]).toBe(9) // Brick
    })

    it('should initialize bank 1 with lighting items', () => {
      const banks = inventoryService.getAllBanks()
      const bank1 = banks[1]
      expect(bank1.name).toBe('Light & Ores')
      expect(bank1.slots[0]).toBe(50) // Torch/Glowstone
      expect(bank1.slots[1]).toBe(51) // Lamp
    })

    it('should emit InventoryChangedEvent on initialization', () => {
      // Constructor calls emitChange()
      expect(mockEventBus.wasEmitted('inventory', 'InventoryChangedEvent')).toBe(true)
    })
  })

  describe('slot selection', () => {
    it('should select slot via selectSlot()', () => {
      mockEventBus.clearCaptured()
      inventoryService.selectSlot(5)

      // Check event was emitted with new slot
      const events = mockEventBus.getEventsByType('InventoryChangedEvent')
      expect(events.length).toBe(1)
      expect(events[0].event.selectedSlot).toBe(5)
    })

    it('should ignore invalid slot index (negative)', () => {
      mockEventBus.clearCaptured()
      inventoryService.selectSlot(-1)

      // Should not emit event for invalid slot
      expect(mockEventBus.getEmitCount()).toBe(0)
    })

    it('should ignore invalid slot index (> 9)', () => {
      mockEventBus.clearCaptured()
      inventoryService.selectSlot(10)

      // Should not emit event for invalid slot
      expect(mockEventBus.getEmitCount()).toBe(0)
    })

    it('should allow selecting slot 0 through 9', () => {
      for (let i = 0; i <= 9; i++) {
        mockEventBus.clearCaptured()
        inventoryService.selectSlot(i)
        expect(mockEventBus.getEmitCount()).toBe(1)
      }
    })
  })

  describe('bank selection', () => {
    it('should select bank via selectBank()', () => {
      mockEventBus.clearCaptured()
      inventoryService.selectBank(1)

      const bank = inventoryService.getActiveBank()
      expect(bank.id).toBe(1)

      // Check event
      const events = mockEventBus.getEventsByType('InventoryChangedEvent')
      expect(events.length).toBe(1)
      expect(events[0].event.activeBank).toBe(1)
    })

    it('should ignore invalid bank id (negative)', () => {
      mockEventBus.clearCaptured()
      inventoryService.selectBank(-1)

      expect(mockEventBus.getEmitCount()).toBe(0)
    })

    it('should ignore invalid bank id (> 9)', () => {
      mockEventBus.clearCaptured()
      inventoryService.selectBank(10)

      expect(mockEventBus.getEmitCount()).toBe(0)
    })
  })

  describe('slot modification', () => {
    it('should set slot via setSlot()', () => {
      mockEventBus.clearCaptured()
      inventoryService.setSlot(0, 0, 99) // Set bank 0, slot 0 to block 99

      const bank = inventoryService.getActiveBank()
      expect(bank.slots[0]).toBe(99)

      expect(mockEventBus.getEmitCount()).toBe(1)
    })

    it('should set slot in different bank', () => {
      mockEventBus.clearCaptured()
      inventoryService.setSlot(2, 5, 42) // Set bank 2, slot 5 to block 42

      const banks = inventoryService.getAllBanks()
      expect(banks[2].slots[5]).toBe(42)
    })

    it('should ignore invalid bank id in setSlot()', () => {
      mockEventBus.clearCaptured()
      inventoryService.setSlot(15, 0, 99)

      expect(mockEventBus.getEmitCount()).toBe(0)
    })

    it('should ignore invalid slot index in setSlot()', () => {
      mockEventBus.clearCaptured()
      inventoryService.setSlot(0, 15, 99)

      expect(mockEventBus.getEmitCount()).toBe(0)
    })
  })

  describe('selected block retrieval', () => {
    it('should get selected block from active bank and slot', () => {
      // Default: bank 0, slot 0 = Stone (1)
      expect(inventoryService.getSelectedBlock()).toBe(1)
    })

    it('should get correct block after slot change', () => {
      inventoryService.selectSlot(2) // Grass (3)
      expect(inventoryService.getSelectedBlock()).toBe(3)
    })

    it('should get correct block after bank change', () => {
      inventoryService.selectBank(1)
      expect(inventoryService.getSelectedBlock()).toBe(50) // First slot of bank 1
    })
  })

  describe('event emission', () => {
    it('should include all relevant data in InventoryChangedEvent', () => {
      mockEventBus.clearCaptured()
      inventoryService.selectSlot(3)

      const events = mockEventBus.getEventsByType('InventoryChangedEvent')
      expect(events.length).toBe(1)

      const event = events[0].event
      expect(event.type).toBe('InventoryChangedEvent')
      expect(event.timestamp).toBeDefined()
      expect(event.activeBank).toBeDefined()
      expect(event.selectedSlot).toBe(3)
      expect(event.selectedBlock).toBeDefined()
    })
  })

  describe('bank access', () => {
    it('should get all banks', () => {
      const banks = inventoryService.getAllBanks()
      expect(banks.length).toBe(10)
    })

    it('should have 10 slots per bank', () => {
      const banks = inventoryService.getAllBanks()
      for (const bank of banks) {
        expect(bank.slots.length).toBe(10)
      }
    })
  })
})
