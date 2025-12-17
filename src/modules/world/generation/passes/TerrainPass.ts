import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'

export class TerrainPass implements GenerationPass {
  readonly name = 'TerrainPass'

  // World constants
  private readonly SEA_LEVEL = 63
  private readonly OCEAN_FLOOR = 45
  private readonly BEACH_HEIGHT = 65
  private readonly LOWLAND_HEIGHT = 70  // Flat coastal plains
  private readonly MAX_HILL_HEIGHT = 78  // Reduced for flatter terrain

  // Archipelago layout
  private readonly ISLAND_COUNT = 4
  private readonly RING_RADIUS = 120
  private readonly ISLAND_RADIUS = 70
  private readonly STARTER_ISLAND_RADIUS = 35

  // Island configs: volcanoes + biome climate
  // Island 0 (NE): Jungle - hot humid, single volcano
  // Island 1 (NW): Taiga - cold, tall snow-capped volcano
  // Island 2 (SW): Desert - hot dry, twin peaks
  // Island 3 (SE): Forest - temperate, single volcano
  private readonly ISLANDS = [
    { volcanos: [{ox: 0, oz: 0, h: 110, r: 35}], temp: 0.6, humid: 0.7 },      // Jungle
    { volcanos: [{ox: 5, oz: -5, h: 125, r: 40}], temp: -0.3, humid: 0.3 },    // Taiga (snow peak)
    { volcanos: [{ox: -15, oz: 10, h: 105, r: 30}, {ox: 18, oz: -8, h: 100, r: 28}], temp: 0.8, humid: -0.3 }, // Desert
    { volcanos: [{ox: -5, oz: 5, h: 108, r: 32}], temp: 0.3, humid: 0.5 }      // Forest
  ]

  execute(context: GenerationContext): void {
    const { terrain } = context.worldDef

    if (terrain.generator === 'flat') {
      this.generateFlat(context, terrain.baseHeight)
    } else {
      this.generateArchipelago(context)
    }

    this.generateClimateData(context)
    this.fillTerrain(context)
    this.initializeSurfaceMap(context)
  }

  private generateFlat(context: GenerationContext, height: number): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = height
      }
    }
  }

  private generateArchipelago(context: GenerationContext): void {
    // Multiple noise layers for rich terrain
    const hillNoise = createNoise2D(() => context.seed + 2000)
    const detailNoise = createNoise2D(() => context.seed + 3000)
    const shapeNoise = createNoise2D(() => context.seed + 4000)
    const ridgeNoise = createNoise2D(() => context.seed + 5500)   // For ridges/valleys
    const bumpNoise = createNoise2D(() => context.seed + 6500)    // Fine detail
    const coastNoise = createNoise2D(() => context.seed + 7500)   // Coastline variation
    const slopeNoise = createNoise2D(() => context.seed + 8500)   // Slope steepness variation

    // Island centers at diagonals
    const islandCenters: Array<{x: number, z: number}> = []
    for (let i = 0; i < this.ISLAND_COUNT; i++) {
      const angle = (i / this.ISLAND_COUNT) * Math.PI * 2 + Math.PI / 4
      islandCenters.push({
        x: Math.cos(angle) * this.RING_RADIUS,
        z: Math.sin(angle) * this.RING_RADIUS
      })
    }

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ)

        // Multi-octave terrain noise - reduced scales for gentler terrain
        const hills = (hillNoise(worldX * 0.006, worldZ * 0.006) + 1) * 0.5
        const hills2 = (hillNoise(worldX * 0.015, worldZ * 0.015) + 1) * 0.5
        const detail = detailNoise(worldX * 0.03, worldZ * 0.03) * 2
        const bumps = bumpNoise(worldX * 0.08, worldZ * 0.08) * 1

        // Ridge noise - gentle rolling features
        const ridgeRaw = ridgeNoise(worldX * 0.01, worldZ * 0.01)
        const ridge = 1 - Math.abs(ridgeRaw)
        const ridgeHeight = ridge * ridge * 6  // Reduced from 12

        // Slope steepness variation - biased toward FLAT (0.15 = very gentle, 0.5 = moderate)
        const slopeRaw = slopeNoise(worldX * 0.008, worldZ * 0.008)
        const steepness = 0.15 + (slopeRaw + 1) * 0.175  // Range 0.15 to 0.5

        // Find closest island
        let minDist = Infinity
        let islandIdx = 0
        let islandCenter = islandCenters[0]
        for (let i = 0; i < islandCenters.length; i++) {
          const dx = worldX - islandCenters[i].x
          const dz = worldZ - islandCenters[i].z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist < minDist) {
            minDist = dist
            islandIdx = i
            islandCenter = islandCenters[i]
          }
        }

        // Multi-scale coastline distortion
        const coastLarge = shapeNoise(worldX * 0.015, worldZ * 0.015) * 22
        const coastMed = coastNoise(worldX * 0.04, worldZ * 0.04) * 10
        const coastSmall = coastNoise(worldX * 0.08, worldZ * 0.08) * 5
        const totalCoastVar = coastLarge + coastMed + coastSmall

        let height: number

        // STARTER ISLAND at center - mostly flat with gentle rise
        const starterShape = shapeNoise(worldX * 0.025, worldZ * 0.025) * 10 + coastSmall
        const starterRadius = this.STARTER_ISLAND_RADIUS + starterShape
        if (distFromCenter < starterRadius) {
          const t = distFromCenter / starterRadius
          if (t > 0.85) {
            // Narrow beach
            height = this.lerp(this.BEACH_HEIGHT, this.SEA_LEVEL - 2, this.smoothstep(0.85, 1, t))
            height += bumps * 0.3
          } else if (t > 0.4) {
            // Flat lowlands - most of the starter island
            const lowT = this.smoothstep(0.4, 0.85, t)
            height = this.lerp(this.LOWLAND_HEIGHT, this.BEACH_HEIGHT, lowT)
            height += hills2 * 1.5 * (1 - lowT) + bumps * 0.4
          } else {
            // Gentle central rise
            const interior = 1 - t / 0.4
            height = this.LOWLAND_HEIGHT + hills * 4 * interior + hills2 * 2 + bumps * 0.5
          }
        }
        // MAIN ISLANDS
        else {
          const islandRadius = this.ISLAND_RADIUS + totalCoastVar

          if (minDist < islandRadius) {
            const t = minDist / islandRadius

            // Real island zones: beach -> lowland plains -> gentle hills -> interior peaks
            // Most of the island should be FLAT lowland
            const beachStart = 0.88  // Beach only at very edge
            const lowlandStart = 0.55 + (1 - steepness) * 0.15  // Wide lowland zone (0.55-0.70)
            const hillStart = 0.25 + (1 - steepness) * 0.10  // Hills start close to center (0.25-0.35)

            if (t > beachStart) {
              // Narrow beach at water's edge
              const beachT = this.smoothstep(beachStart, 1, t)
              height = this.lerp(this.BEACH_HEIGHT, this.SEA_LEVEL - 2, beachT)
              height += bumps * (1 - beachT) * 0.5
            } else if (t > lowlandStart) {
              // Flat coastal lowlands - the majority of the island
              const lowlandT = this.smoothstep(lowlandStart, beachStart, t)
              const baseH = this.lerp(this.LOWLAND_HEIGHT + 3, this.BEACH_HEIGHT, lowlandT)
              // Very gentle variation in lowlands
              height = baseH + hills2 * 2 * (1 - lowlandT) + bumps * 0.5 + detail * 0.3
            } else if (t > hillStart) {
              // Gentle rolling hills - transition to interior
              const hillT = this.smoothstep(hillStart, lowlandStart, t)
              const baseH = this.lerp(this.MAX_HILL_HEIGHT, this.LOWLAND_HEIGHT + 3, hillT)
              // Gradual hills
              height = baseH + hills * 6 * (1 - hillT) + hills2 * 3 + ridgeHeight * (1 - hillT) * 0.5 + bumps
            } else {
              // Interior - only near the center do we get real elevation
              const interior = 1 - t / hillStart
              const baseH = this.MAX_HILL_HEIGHT

              // Much gentler interior terrain
              const hillContrib = hills * 8 * interior + hills2 * 4
              const ridgeContrib = ridgeHeight * interior * 0.5
              const detailContrib = detail * 0.5 + bumps

              height = baseH + hillContrib + ridgeContrib + detailContrib

              // Volcano peaks - only dramatic feature, rises from flat surroundings
              for (const v of this.ISLANDS[islandIdx].volcanos) {
                const vx = islandCenter.x + v.ox
                const vz = islandCenter.z + v.oz
                const vDist = Math.sqrt((worldX - vx) ** 2 + (worldZ - vz) ** 2)
                if (vDist < v.r) {
                  const vt = 1 - vDist / v.r
                  // Gradual volcano slope (higher power = steeper near peak)
                  const volcanoPower = 2.5 + steepness * 0.5  // 2.6 to 2.75
                  const volcanoH = baseH + Math.pow(vt, volcanoPower) * (v.h - baseH) + bumps * vt * 0.5
                  height = Math.max(height, volcanoH)
                }
              }

              height = Math.min(height, 145)
            }
          }
          // OCEAN with varied floor
          else {
            const oceanDist = minDist - islandRadius
            if (oceanDist < 30) {
              // Shallow water with coral-like bumps
              const shallowT = this.smoothstep(0, 30, oceanDist)
              height = this.lerp(this.SEA_LEVEL - 4, this.OCEAN_FLOOR + 12, shallowT)
              height += bumps * (1 - shallowT)
            } else {
              // Deep ocean with varied floor
              height = this.OCEAN_FLOOR + detail * 1.5 + Math.abs(ridgeRaw) * 5
            }
          }
        }

        context.heightMap[x][z] = Math.floor(Math.max(1, Math.min(255, height)))
      }
    }
  }

  private smoothstep(e0: number, e1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private generateClimateData(context: GenerationContext): void {
    const tempNoise = createNoise2D(() => context.seed + 5000)
    const humidNoise = createNoise2D(() => context.seed + 6000)

    // Island centers
    const islandCenters: Array<{x: number, z: number}> = []
    for (let i = 0; i < this.ISLAND_COUNT; i++) {
      const angle = (i / this.ISLAND_COUNT) * Math.PI * 2 + Math.PI / 4
      islandCenters.push({
        x: Math.cos(angle) * this.RING_RADIUS,
        z: Math.sin(angle) * this.RING_RADIUS
      })
    }

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z
        const height = context.heightMap[x][z]

        // Find closest island
        let minDist = Infinity
        let islandIdx = -1
        for (let i = 0; i < islandCenters.length; i++) {
          const dx = worldX - islandCenters[i].x
          const dz = worldZ - islandCenters[i].z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist < minDist) {
            minDist = dist
            islandIdx = i
          }
        }

        // Base climate
        const tVar = tempNoise(worldX * 0.003, worldZ * 0.003) * 0.15
        const hVar = humidNoise(worldX * 0.003, worldZ * 0.003) * 0.15

        let temp = 0.3 + tVar
        let humid = 0.4 + hVar

        // Apply island biome if on island
        if (islandIdx >= 0 && minDist < this.ISLAND_RADIUS + 30) {
          const cfg = this.ISLANDS[islandIdx]
          const influence = Math.max(0, 1 - minDist / (this.ISLAND_RADIUS + 30))

          temp = this.lerp(temp, cfg.temp, influence * 0.8)
          humid = this.lerp(humid, cfg.humid, influence * 0.8)

          // Snow on high elevations of island 1
          if (islandIdx === 1 && height > 100) {
            temp -= (height - 100) * 0.025
          }
        }

        context.temperature[x][z] = Math.max(-0.5, Math.min(0.9, temp))
        context.humidity[x][z] = Math.max(-0.5, Math.min(0.9, humid))
      }
    }
  }

  private fillTerrain(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])
        context.setBlock(x, 0, z, BlockType.bedrock)
        for (let y = 1; y <= height && y < 256; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }
  }

  private initializeSurfaceMap(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])
        context.surfaceMap.set(`${x},${z}`, {
          y: height,
          blockType: BlockType.stone,
          isCave: false
        })
      }
    }
  }
}
