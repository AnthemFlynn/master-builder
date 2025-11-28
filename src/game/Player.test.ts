import { describe, it, expect, beforeEach } from 'vitest'
import Player, { Mode, Speed } from './Player'

describe('Player', () => {
  let player: Player

  beforeEach(() => {
    player = new Player()
  })

  describe('initialization', () => {
    it('should initialize with walking mode', () => {
      expect(player.mode).toBe(Mode.walking)
    })

    it('should initialize with walking speed', () => {
      expect(player.speed).toBe(Speed.walking)
    })

    it('should have correct body dimensions', () => {
      expect(player.body.height).toBe(1.8)
      expect(player.body.width).toBe(0.5)
    })

    it('should have correct falling speed', () => {
      expect(player.falling).toBe(38.4)
    })

    it('should have correct jump power', () => {
      expect(player.jump).toBe(1.2522)
    })
  })

  describe('Mode enum', () => {
    it('should have all movement modes', () => {
      expect(Mode.walking).toBe('walking')
      expect(Mode.sprinting).toBe('sprinting')
      expect(Mode.flying).toBe('flying')
      expect(Mode.sprintFlying).toBe('sprintFlying')
      expect(Mode.sneaking).toBe('sneaking')
    })
  })

  describe('Speed enum', () => {
    it('should have correct walking speed', () => {
      expect(Speed.walking).toBe(5.612)
    })

    it('should have correct sprinting speed', () => {
      expect(Speed.sprinting).toBe(5.612)
    })

    it('should have correct flying speed', () => {
      expect(Speed.flying).toBe(21.78)
    })

    it('should have correct sprint flying speed', () => {
      expect(Speed.sprintFlying).toBe(21.78)
    })

    it('should have correct sneaking speed', () => {
      expect(Speed.sneaking).toBe(2.55)
    })
  })

  describe('setMode', () => {
    it('should change mode to sprinting', () => {
      player.setMode(Mode.sprinting)
      expect(player.mode).toBe(Mode.sprinting)
      expect(player.speed).toBe(Speed.sprinting)
    })

    it('should change mode to flying', () => {
      player.setMode(Mode.flying)
      expect(player.mode).toBe(Mode.flying)
      expect(player.speed).toBe(Speed.flying)
    })

    it('should change mode to sprint flying', () => {
      player.setMode(Mode.sprintFlying)
      expect(player.mode).toBe(Mode.sprintFlying)
      expect(player.speed).toBe(Speed.sprintFlying)
    })

    it('should change mode to sneaking', () => {
      player.setMode(Mode.sneaking)
      expect(player.mode).toBe(Mode.sneaking)
      expect(player.speed).toBe(Speed.sneaking)
    })

    it('should update speed when changing mode', () => {
      player.setMode(Mode.flying)
      expect(player.speed).toBe(Speed.flying)

      player.setMode(Mode.sneaking)
      expect(player.speed).toBe(Speed.sneaking)
    })

    it('should handle multiple mode changes', () => {
      player.setMode(Mode.sprinting)
      expect(player.mode).toBe(Mode.sprinting)
      expect(player.speed).toBe(Speed.sprinting)

      player.setMode(Mode.flying)
      expect(player.mode).toBe(Mode.flying)
      expect(player.speed).toBe(Speed.flying)

      player.setMode(Mode.walking)
      expect(player.mode).toBe(Mode.walking)
      expect(player.speed).toBe(Speed.walking)
    })
  })

  describe('speed relationships', () => {
    it('should have flying faster than walking', () => {
      expect(Speed.flying).toBeGreaterThan(Speed.walking)
    })

    it('should have walking faster than sneaking', () => {
      expect(Speed.walking).toBeGreaterThan(Speed.sneaking)
    })

    it('should have sprint flying equal to flying', () => {
      expect(Speed.sprintFlying).toBe(Speed.flying)
    })

    it('should have sprinting equal to walking', () => {
      expect(Speed.sprinting).toBe(Speed.walking)
    })
  })

  describe('body properties', () => {
    it('should not modify body dimensions', () => {
      const originalHeight = player.body.height
      const originalWidth = player.body.width

      player.setMode(Mode.flying)

      expect(player.body.height).toBe(originalHeight)
      expect(player.body.width).toBe(originalWidth)
    })
  })

  describe('physics properties', () => {
    it('should maintain falling speed across mode changes', () => {
      const originalFalling = player.falling

      player.setMode(Mode.flying)
      expect(player.falling).toBe(originalFalling)

      player.setMode(Mode.sneaking)
      expect(player.falling).toBe(originalFalling)
    })

    it('should maintain jump power across mode changes', () => {
      const originalJump = player.jump

      player.setMode(Mode.sprinting)
      expect(player.jump).toBe(originalJump)

      player.setMode(Mode.flying)
      expect(player.jump).toBe(originalJump)
    })
  })
})
