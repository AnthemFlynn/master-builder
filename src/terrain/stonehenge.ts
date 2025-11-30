import * as THREE from 'three'
import { BlockType } from './index'

/**
 * Stonehenge Sundial - Simplified
 * Builds a clock structure at ground level for testing sun/shadow movement
 */
export default class Stonehenge {
  /**
   * Build Stonehenge at player location using terrain's buildBlock method
   */
  static build(terrain: any, centerX: number, centerZ: number): void {
    console.log(`🗿 Building Stonehenge Sundial at (${centerX}, ~, ${centerZ})...`)

    // Find ground height at center
    const groundY = this.findGroundHeight(terrain, centerX, centerZ)

    // Build flat platform
    const platformRadius = 12
    for (let x = -platformRadius; x <= platformRadius; x++) {
      for (let z = -platformRadius; z <= platformRadius; z++) {
        const dist = Math.sqrt(x * x + z * z)
        if (dist <= platformRadius) {
          terrain.buildBlock(
            new THREE.Vector3(centerX + x, groundY, centerZ + z),
            BlockType.stone,
            true // ignore height check
          )
        }
      }
    }

    // Build outer ring: 12 hour markers (pillar pairs with capstones)
    const outerRadius = 8
    const pillarHeight = 3

    for (let hour = 0; hour < 12; hour++) {
      // 12 o'clock = north (angle 0), going clockwise
      const angle = (hour / 12) * Math.PI * 2 - Math.PI / 2 // -90° so 12 is north

      const markerX = Math.round(centerX + outerRadius * Math.cos(angle))
      const markerZ = Math.round(centerZ + outerRadius * Math.sin(angle))

      // Build single pillar at each hour
      for (let h = 1; h <= pillarHeight; h++) {
        terrain.buildBlock(
          new THREE.Vector3(markerX, groundY + h, markerZ),
          BlockType.stone,
          true
        )
      }

      // Capstone on top
      const isCardinal = hour % 3 === 0 // 12, 3, 6, 9 o'clock
      const capType = isCardinal ? BlockType.glowstone : BlockType.quartz
      terrain.buildBlock(
        new THREE.Vector3(markerX, groundY + pillarHeight + 1, markerZ),
        capType,
        true
      )
    }

    // Build inner ring: 6 support markers at even hours
    const innerRadius = 4
    for (let hour = 0; hour < 12; hour += 2) {
      const angle = (hour / 12) * Math.PI * 2 - Math.PI / 2
      const pillarX = Math.round(centerX + innerRadius * Math.cos(angle))
      const pillarZ = Math.round(centerZ + innerRadius * Math.sin(angle))

      for (let h = 1; h <= 2; h++) {
        terrain.buildBlock(
          new THREE.Vector3(pillarX, groundY + h, pillarZ),
          BlockType.stone,
          true
        )
      }
    }

    // Build center gnomon (tall shadow caster)
    const gnomonHeight = 8
    for (let h = 1; h <= gnomonHeight; h++) {
      terrain.buildBlock(
        new THREE.Vector3(centerX, groundY + h, centerZ),
        BlockType.stone,
        true
      )
    }

    // Diamond on top
    terrain.buildBlock(
      new THREE.Vector3(centerX, groundY + gnomonHeight + 1, centerZ),
      BlockType.diamond,
      true
    )

    console.log(`🗿 Stonehenge complete at ground level y=${groundY}`)
    console.log(`   Walk around and test shadow rotation!`)
    console.log(`   Press Cmd+B to spawn another Stonehenge`)
  }

  /**
   * Find the terrain height at a position
   */
  private static findGroundHeight(terrain: any, x: number, z: number): number {
    // Use terrain noise to find ground level
    const yOffset = Math.floor(
      terrain.noise.get(x / terrain.noise.gap, z / terrain.noise.gap, terrain.noise.seed) *
        terrain.noise.amp
    )
    return 30 + yOffset
  }

  /**
   * Check if Stonehenge already exists at a location
   */
  static existsAt(centerX: number, centerZ: number, customBlocks: any[]): boolean {
    // Check for diamond block (gnomon top)
    const groundY = 30 // Approximate
    return customBlocks.some(
      (block: any) => block.x === centerX &&
               block.z === centerZ &&
               block.type === BlockType.diamond &&
               block.y >= groundY + 5 // Should be high up
    )
  }
}
