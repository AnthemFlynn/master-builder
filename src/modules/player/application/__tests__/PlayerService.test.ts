import { describe, it, expect, beforeEach } from 'bun:test'
import * as THREE from 'three'
import { PlayerService } from '../PlayerService'
import { PlayerMode } from '../../domain/PlayerMode'
import { MockEventBus } from '../../../../test-utils'

describe('PlayerService', () => {
  let playerService: PlayerService
  let mockEventBus: MockEventBus

  beforeEach(() => {
    mockEventBus = new MockEventBus()
    playerService = new PlayerService(mockEventBus as any)
  })

  describe('initialization', () => {
    it('should initialize with default position (8, 40, 8)', () => {
      const pos = playerService.getPosition()
      expect(pos.x).toBe(8)
      expect(pos.y).toBe(40)
      expect(pos.z).toBe(8)
    })

    it('should initialize with Walking mode', () => {
      expect(playerService.getMode()).toBe(PlayerMode.Walking)
    })

    it('should initialize with default speed 5', () => {
      expect(playerService.getSpeed()).toBe(5)
    })

    it('should initialize with velocity (0, 0, 0)', () => {
      const vel = playerService.getVelocity()
      expect(vel.x).toBe(0)
      expect(vel.y).toBe(0)
      expect(vel.z).toBe(0)
    })

    it('should initialize as not falling', () => {
      expect(playerService.isFalling()).toBe(false)
    })
  })

  describe('position management', () => {
    it('should update position via updatePosition()', () => {
      const newPos = new THREE.Vector3(100, 200, 300)
      playerService.updatePosition(newPos)

      const pos = playerService.getPosition()
      expect(pos.x).toBe(100)
      expect(pos.y).toBe(200)
      expect(pos.z).toBe(300)
    })
  })

  describe('velocity management', () => {
    it('should set velocity via setVelocity()', () => {
      const newVel = new THREE.Vector3(1, 2, 3)
      playerService.setVelocity(newVel)

      const vel = playerService.getVelocity()
      expect(vel.x).toBe(1)
      expect(vel.y).toBe(2)
      expect(vel.z).toBe(3)
    })
  })

  describe('mode management', () => {
    it('should change mode via setMode()', () => {
      playerService.setMode(PlayerMode.Flying)
      expect(playerService.getMode()).toBe(PlayerMode.Flying)
      expect(playerService.isFlying()).toBe(true)
    })

    it('should emit PlayerModeChangedEvent on mode change', () => {
      playerService.setMode(PlayerMode.Flying)

      expect(mockEventBus.wasEmitted('player', 'PlayerModeChangedEvent')).toBe(true)

      const events = mockEventBus.getEventsByType('PlayerModeChangedEvent')
      expect(events.length).toBe(1)
      expect(events[0].event.oldMode).toBe(PlayerMode.Walking)
      expect(events[0].event.newMode).toBe(PlayerMode.Flying)
    })

    it('should update speed when changing to Flying mode', () => {
      playerService.setMode(PlayerMode.Flying)
      expect(playerService.getSpeed()).toBe(10)
    })

    it('should update speed when changing to Sneaking mode', () => {
      playerService.setMode(PlayerMode.Sneaking)
      expect(playerService.getSpeed()).toBe(2.5)
    })

    it('should reset speed when changing back to Walking mode', () => {
      playerService.setMode(PlayerMode.Flying)
      playerService.setMode(PlayerMode.Walking)
      expect(playerService.getSpeed()).toBe(5)
    })
  })

  describe('falling state', () => {
    it('should set falling state via setFalling()', () => {
      playerService.setFalling(true)
      expect(playerService.isFalling()).toBe(true)

      playerService.setFalling(false)
      expect(playerService.isFalling()).toBe(false)
    })

    it('should set jump velocity via setJumpVelocity()', () => {
      playerService.setJumpVelocity(12)
      expect(playerService.getJumpVelocity()).toBe(12)
    })
  })

  describe('state restoration', () => {
    it('should restore state from snapshot', () => {
      const snapshot = {
        position: { x: 50, y: 100, z: 150 },
        velocity: { x: 1, y: 2, z: 3 },
        mode: 'Flying',
        speed: 10,
        falling: true,
        jumpVelocity: 15
      }

      playerService.restoreState(snapshot)

      const pos = playerService.getPosition()
      expect(pos.x).toBe(50)
      expect(pos.y).toBe(100)
      expect(pos.z).toBe(150)

      const vel = playerService.getVelocity()
      expect(vel.x).toBe(1)
      expect(vel.y).toBe(2)
      expect(vel.z).toBe(3)

      expect(playerService.getMode()).toBe(PlayerMode.Flying)
      expect(playerService.getSpeed()).toBe(10)
      expect(playerService.isFalling()).toBe(true)
      expect(playerService.getJumpVelocity()).toBe(15)
    })

    it('should restore Walking mode from snapshot', () => {
      // First set to flying
      playerService.setMode(PlayerMode.Flying)

      const snapshot = {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        mode: 'Walking',
        speed: 5,
        falling: false,
        jumpVelocity: 8
      }

      playerService.restoreState(snapshot)
      expect(playerService.getMode()).toBe(PlayerMode.Walking)
    })
  })

  describe('state access', () => {
    it('should expose full state via getState()', () => {
      const state = playerService.getState()
      expect(state).toBeDefined()
      expect(state.position).toBeDefined()
      expect(state.velocity).toBeDefined()
      expect(state.mode).toBeDefined()
    })
  })
})
