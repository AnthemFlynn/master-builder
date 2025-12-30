import { createNoise2D, NoiseFunction2D } from 'simplex-noise'

/**
 * Volcano archetype types
 */
export enum VolcanoType {
  SHIELD = 'shield',           // Mauna Loa style - gradual slopes
  STRATOVOLCANO = 'strato',    // Mt. Fuji style - steep cone
  CALDERA = 'caldera',         // Crater Lake style - collapsed center
  ERODED = 'eroded',           // Na Pali style - knife-edge ridges
  MULTI_PEAK = 'multi'         // Haleakala style - multiple connected peaks
}

/**
 * Configuration for a single volcanic peak
 */
export interface PeakConfig {
  offsetX: number      // Offset from island center
  offsetZ: number
  height: number       // Peak height (blocks above sea level)
  radius: number       // Base radius of the peak
}

/**
 * Per-island configuration for organic generation
 */
export interface IslandConfig {
  centerX: number               // World X coordinate of island center
  centerZ: number               // World Z coordinate of island center
  shapeSeed: number             // Unique seed for this island's blob shape
  volcanoArchetype: VolcanoType // Which volcano style to use
  asymmetryAngle: number        // Direction of steeper slopes (radians)
  ridgeCount: number            // Number of radial ridges (4-8)
  erosionIntensity: number      // Gully depth multiplier (0-1)
  peaks: PeakConfig[]           // 1-3 peaks for this island
  baseRadius: number            // Approximate island size
  temperature: number           // Climate: -0.5 (cold) to 0.9 (hot)
  humidity: number              // Climate: -0.5 (dry) to 0.9 (wet)
}

/**
 * Result from getIslandHeight - contains height and whether point is land
 */
export interface IslandHeightResult {
  height: number
  isLand: boolean
  islandIndex: number   // Which island this point belongs to (-1 if ocean)
}

/**
 * OrganicIslandGenerator - Creates natural-looking volcanic island shapes
 *
 * Uses domain-warped simplex noise for organic coastlines and multiple
 * volcano archetypes for varied terrain.
 */
export class OrganicIslandGenerator {
  // World constants
  private readonly SEA_LEVEL = 63
  private readonly OCEAN_FLOOR = 45
  private readonly BEACH_HEIGHT = 65
  private readonly LOWLAND_HEIGHT = 70

  // Noise functions (initialized per seed)
  private warpNoise!: NoiseFunction2D
  private largeBlobNoise!: NoiseFunction2D
  private medBlobNoise!: NoiseFunction2D
  private smallBlobNoise!: NoiseFunction2D
  private ridgeNoise!: NoiseFunction2D
  private erosionNoise!: NoiseFunction2D
  private bumpNoise!: NoiseFunction2D

  private islands: IslandConfig[] = []
  private initialized = false

  constructor(private baseSeed: number) {}

  /**
   * Initialize noise functions and island configurations
   */
  initialize(): void {
    if (this.initialized) return

    // Create noise functions with different seeds
    this.warpNoise = createNoise2D(() => this.baseSeed + 1000)
    this.largeBlobNoise = createNoise2D(() => this.baseSeed + 2000)
    this.medBlobNoise = createNoise2D(() => this.baseSeed + 3000)
    this.smallBlobNoise = createNoise2D(() => this.baseSeed + 4000)
    this.ridgeNoise = createNoise2D(() => this.baseSeed + 5000)
    this.erosionNoise = createNoise2D(() => this.baseSeed + 6000)
    this.bumpNoise = createNoise2D(() => this.baseSeed + 7000)

    this.createIslandConfigurations()
    this.initialized = true
  }

  /**
   * Create varied island configurations for the archipelago
   */
  private createIslandConfigurations(): void {
    const RING_RADIUS = 120
    const ISLAND_COUNT = 4

    // Assign different volcano types to each island for variety
    const volcanoTypes: VolcanoType[] = [
      VolcanoType.STRATOVOLCANO,  // NE - Classic steep volcano
      VolcanoType.ERODED,          // NW - Dramatic knife-edge ridges
      VolcanoType.MULTI_PEAK,      // SW - Twin peaks
      VolcanoType.SHIELD           // SE - Broad gentle slopes
    ]

    // Climate configurations (matching original biomes)
    const climates = [
      { temp: 0.6, humid: 0.7 },   // Jungle - hot humid
      { temp: -0.3, humid: 0.3 },  // Taiga - cold
      { temp: 0.8, humid: -0.3 },  // Desert - hot dry
      { temp: 0.3, humid: 0.5 }    // Forest - temperate
    ]

    for (let i = 0; i < ISLAND_COUNT; i++) {
      const angle = (i / ISLAND_COUNT) * Math.PI * 2 + Math.PI / 4
      const centerX = Math.cos(angle) * RING_RADIUS
      const centerZ = Math.sin(angle) * RING_RADIUS

      const archetype = volcanoTypes[i]
      const peaks = this.generatePeaksForArchetype(archetype, i)

      this.islands.push({
        centerX,
        centerZ,
        shapeSeed: this.baseSeed + i * 10000,
        volcanoArchetype: archetype,
        asymmetryAngle: angle + Math.PI,  // Steeper on ocean-facing side
        ridgeCount: 4 + (i % 3) * 2,      // 4, 6, 8, 4...
        erosionIntensity: 0.3 + (i * 0.15), // Varying erosion
        peaks,
        baseRadius: 65 + (i % 2) * 10,    // 65-75 block radius
        temperature: climates[i].temp,
        humidity: climates[i].humid
      })
    }
  }

  /**
   * Generate peak configurations based on volcano archetype
   */
  private generatePeaksForArchetype(archetype: VolcanoType, islandIndex: number): PeakConfig[] {
    switch (archetype) {
      case VolcanoType.SHIELD:
        // Broad, low profile
        return [{
          offsetX: 0,
          offsetZ: 0,
          height: 95,   // Lower than others
          radius: 45    // Very wide base
        }]

      case VolcanoType.STRATOVOLCANO:
        // Classic steep cone
        return [{
          offsetX: 0,
          offsetZ: 0,
          height: 125,  // Tall
          radius: 35    // Medium base
        }]

      case VolcanoType.CALDERA:
        // Rise then drop - rim around collapsed center
        return [{
          offsetX: 0,
          offsetZ: 0,
          height: 105,
          radius: 40
        }]

      case VolcanoType.ERODED:
        // Single peak but with dramatic ridges carved in
        return [{
          offsetX: 0,
          offsetZ: 5,
          height: 115,
          radius: 38
        }]

      case VolcanoType.MULTI_PEAK:
        // 2-3 connected peaks with saddle between
        return [
          { offsetX: -18, offsetZ: 8, height: 105, radius: 28 },
          { offsetX: 15, offsetZ: -10, height: 110, radius: 30 }
        ]

      default:
        return [{ offsetX: 0, offsetZ: 0, height: 100, radius: 35 }]
    }
  }

  /**
   * Get island configuration by index
   */
  getIslandConfig(index: number): IslandConfig | undefined {
    return this.islands[index]
  }

  /**
   * Get all island configurations
   */
  getAllIslands(): IslandConfig[] {
    return this.islands
  }

  /**
   * Calculate whether a world point is land and its height
   * Uses domain-warped noise for organic coastlines
   */
  getIslandHeight(worldX: number, worldZ: number): IslandHeightResult {
    if (!this.initialized) {
      this.initialize()
    }

    // Check starter island first (center)
    const starterResult = this.getStarterIslandHeight(worldX, worldZ)
    if (starterResult.isLand) {
      return starterResult
    }

    // Find closest main island
    let closestIsland = -1
    let closestDist = Infinity

    for (let i = 0; i < this.islands.length; i++) {
      const island = this.islands[i]
      const dx = worldX - island.centerX
      const dz = worldZ - island.centerZ
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < closestDist) {
        closestDist = dist
        closestIsland = i
      }
    }

    if (closestIsland === -1) {
      return { height: this.getOceanFloorHeight(worldX, worldZ), isLand: false, islandIndex: -1 }
    }

    const island = this.islands[closestIsland]

    // Domain warp the coordinates for organic shape
    const warpStrength = 30
    const warpedX = worldX + this.warpNoise(worldX * 0.01, worldZ * 0.01) * warpStrength
    const warpedZ = worldZ + this.warpNoise(worldZ * 0.01, worldX * 0.01) * warpStrength

    // Calculate distance from island center using warped coords
    const localX = warpedX - island.centerX
    const localZ = warpedZ - island.centerZ

    // Layer noise for blob shape (using island's unique seed offset)
    const seedOffset = island.shapeSeed - this.baseSeed
    const largeBlob = (this.largeBlobNoise((warpedX + seedOffset) * 0.008, (warpedZ + seedOffset) * 0.008) + 1) * 0.5
    const medBlob = (this.medBlobNoise((warpedX + seedOffset) * 0.02, (warpedZ + seedOffset) * 0.02) + 1) * 0.5
    const smallBlob = (this.smallBlobNoise((warpedX + seedOffset) * 0.05, (warpedZ + seedOffset) * 0.05) + 1) * 0.5

    // Combine blob layers
    const blobValue = largeBlob * 0.6 + medBlob * 0.25 + smallBlob * 0.15

    // Distance from center in original coords (for terrain zones)
    const distFromCenter = Math.sqrt((worldX - island.centerX) ** 2 + (worldZ - island.centerZ) ** 2)

    // Island boundary: blob value threshold determines land
    const landThreshold = 0.35
    const effectiveRadius = island.baseRadius + (blobValue - 0.5) * 60  // Blob shapes the coast

    if (distFromCenter > effectiveRadius + 20) {
      // Definitely ocean
      return {
        height: this.getOceanFloorHeight(worldX, worldZ),
        isLand: false,
        islandIndex: -1
      }
    }

    // Check if we're on land based on blob threshold
    const isLand = distFromCenter < effectiveRadius && blobValue > landThreshold

    if (!isLand) {
      // Shallow water / reef zone
      const shallowT = Math.max(0, 1 - (distFromCenter - effectiveRadius) / 30)
      const height = this.OCEAN_FLOOR + 12 + shallowT * (this.SEA_LEVEL - 4 - (this.OCEAN_FLOOR + 12))
      return { height, isLand: false, islandIndex: -1 }
    }

    // Calculate terrain height for this land point
    const height = this.calculateTerrainHeight(
      worldX, worldZ,
      localX, localZ,
      distFromCenter,
      effectiveRadius,
      island
    )

    return { height, isLand: true, islandIndex: closestIsland }
  }

  /**
   * Calculate terrain height for a land point based on volcano archetype
   */
  private calculateTerrainHeight(
    worldX: number, worldZ: number,
    localX: number, localZ: number,
    distFromCenter: number,
    effectiveRadius: number,
    island: IslandConfig
  ): number {
    // Normalized distance from center (0 = center, 1 = edge)
    const t = distFromCenter / effectiveRadius

    // Terrain zones
    const beachStart = 0.90
    const lowlandStart = 0.60
    const foothillStart = 0.35

    let baseHeight: number

    if (t > beachStart) {
      // Beach zone
      const beachT = (t - beachStart) / (1 - beachStart)
      baseHeight = this.lerp(this.BEACH_HEIGHT, this.SEA_LEVEL - 2, beachT)
    } else if (t > lowlandStart) {
      // Lowland plains
      const lowlandT = (t - lowlandStart) / (beachStart - lowlandStart)
      baseHeight = this.lerp(this.LOWLAND_HEIGHT + 5, this.BEACH_HEIGHT, lowlandT)
    } else if (t > foothillStart) {
      // Rolling foothills
      const hillT = (t - foothillStart) / (lowlandStart - foothillStart)
      baseHeight = this.lerp(80, this.LOWLAND_HEIGHT + 5, hillT)
    } else {
      // Interior volcanic terrain
      baseHeight = 80
    }

    // Add volcanic features only in interior
    if (t < foothillStart) {
      baseHeight = this.addVolcanicFeatures(
        worldX, worldZ,
        localX, localZ,
        distFromCenter,
        island,
        baseHeight
      )
    }

    // Add fine detail bumps everywhere
    const bumps = this.bumpNoise(worldX * 0.08, worldZ * 0.08) * 1.5

    return Math.floor(Math.max(1, Math.min(180, baseHeight + bumps)))
  }

  /**
   * Add volcanic features based on archetype
   */
  private addVolcanicFeatures(
    worldX: number, worldZ: number,
    localX: number, localZ: number,
    distFromCenter: number,
    island: IslandConfig,
    baseHeight: number
  ): number {
    let height = baseHeight

    // Add peaks based on archetype
    for (const peak of island.peaks) {
      const peakX = island.centerX + peak.offsetX
      const peakZ = island.centerZ + peak.offsetZ
      const peakDist = Math.sqrt((worldX - peakX) ** 2 + (worldZ - peakZ) ** 2)

      if (peakDist < peak.radius) {
        const peakT = 1 - peakDist / peak.radius
        let volcanoHeight: number

        switch (island.volcanoArchetype) {
          case VolcanoType.SHIELD:
            // Gradual slopes - power 1.5 for very gentle rise
            volcanoHeight = baseHeight + Math.pow(peakT, 1.5) * (peak.height - baseHeight)
            break

          case VolcanoType.STRATOVOLCANO:
            // Steep cone - power 3.0 for dramatic peak
            volcanoHeight = baseHeight + Math.pow(peakT, 3.0) * (peak.height - baseHeight)
            // Add asymmetry (steeper on one side)
            const asymAngle = Math.atan2(worldZ - peakZ, worldX - peakX)
            const asymFactor = 0.5 + 0.5 * Math.cos(asymAngle - island.asymmetryAngle)
            volcanoHeight = baseHeight + (volcanoHeight - baseHeight) * (0.7 + asymFactor * 0.3)
            break

          case VolcanoType.CALDERA:
            // Rises then drops in center (crater)
            if (peakT > 0.7) {
              // Inner crater - drops down
              const craterT = (peakT - 0.7) / 0.3
              const rimHeight = baseHeight + Math.pow(0.7, 2.0) * (peak.height - baseHeight)
              volcanoHeight = this.lerp(rimHeight, rimHeight - 25, craterT)
            } else {
              // Outer slopes rising to rim
              volcanoHeight = baseHeight + Math.pow(peakT, 2.0) * (peak.height - baseHeight)
            }
            break

          case VolcanoType.ERODED:
            // Dramatic knife-edge ridges with V-shaped valleys
            volcanoHeight = this.addErodedFeatures(
              worldX, worldZ, peakX, peakZ,
              peakT, baseHeight, peak.height, island
            )
            break

          case VolcanoType.MULTI_PEAK:
            // Standard peak shape for multi-peak
            volcanoHeight = baseHeight + Math.pow(peakT, 2.5) * (peak.height - baseHeight)
            break

          default:
            volcanoHeight = baseHeight + Math.pow(peakT, 2.5) * (peak.height - baseHeight)
        }

        height = Math.max(height, volcanoHeight)
      }
    }

    // Add radial ridges
    height = this.addRadialRidges(worldX, worldZ, island, height)

    // Add erosion gullies
    height = this.addErosionGullies(worldX, worldZ, island, height, distFromCenter)

    return height
  }

  /**
   * Add eroded knife-edge ridges for ERODED archetype
   */
  private addErodedFeatures(
    worldX: number, worldZ: number,
    peakX: number, peakZ: number,
    peakT: number,
    baseHeight: number, peakHeight: number,
    island: IslandConfig
  ): number {
    // Base volcano shape
    let height = baseHeight + Math.pow(peakT, 2.2) * (peakHeight - baseHeight)

    // Add dramatic ridges radiating from peak
    const angle = Math.atan2(worldZ - peakZ, worldX - peakX)
    const ridgeCount = island.ridgeCount

    // Find distance to nearest ridge line
    const ridgeAngle = (angle + Math.PI) / (Math.PI * 2 / ridgeCount)
    const ridgeFrac = ridgeAngle - Math.floor(ridgeAngle)
    const ridgeDist = Math.abs(ridgeFrac - 0.5) * 2  // 0 = on ridge, 1 = between ridges

    // V-shaped valleys between ridges
    const valleyDepth = 20 * island.erosionIntensity * peakT
    const valleyCarve = ridgeDist * ridgeDist * valleyDepth

    // Knife-edge effect: ridges are sharp, valleys are deep
    height -= valleyCarve

    return height
  }

  /**
   * Add radial ridges extending from volcano peak
   */
  private addRadialRidges(
    worldX: number, worldZ: number,
    island: IslandConfig,
    currentHeight: number
  ): number {
    // Skip for non-volcanic areas
    if (currentHeight < 75) return currentHeight

    const mainPeak = island.peaks[0]
    if (!mainPeak) return currentHeight

    const peakX = island.centerX + mainPeak.offsetX
    const peakZ = island.centerZ + mainPeak.offsetZ
    const dx = worldX - peakX
    const dz = worldZ - peakZ
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > mainPeak.radius * 1.5) return currentHeight

    const angle = Math.atan2(dz, dx)
    const ridgeSpacing = Math.PI * 2 / island.ridgeCount

    // Add subtle noise to ridge positions
    const ridgeNoise = this.ridgeNoise(worldX * 0.02, worldZ * 0.02) * 0.3

    // Find alignment with nearest ridge
    let bestRidgeAlign = 0
    for (let i = 0; i < island.ridgeCount; i++) {
      const ridgeAngle = i * ridgeSpacing + ridgeNoise
      const angleDiff = Math.abs(((angle - ridgeAngle + Math.PI) % (Math.PI * 2)) - Math.PI)
      const alignment = Math.max(0, 1 - angleDiff / (ridgeSpacing * 0.4))
      bestRidgeAlign = Math.max(bestRidgeAlign, alignment)
    }

    // Ridge height contribution
    const ridgeHeight = bestRidgeAlign * 8 * (1 - dist / mainPeak.radius)

    return currentHeight + ridgeHeight
  }

  /**
   * Carve erosion gullies perpendicular to ridges
   */
  private addErosionGullies(
    worldX: number, worldZ: number,
    island: IslandConfig,
    currentHeight: number,
    distFromCenter: number
  ): number {
    if (island.erosionIntensity < 0.1) return currentHeight
    if (currentHeight < 75) return currentHeight  // No gullies on lowlands

    // Erosion noise for gully placement
    const erosion = this.erosionNoise(worldX * 0.04, worldZ * 0.04)

    // Gullies form in valleys between ridges
    if (erosion < -0.3) {
      const gullyDepth = (Math.abs(erosion + 0.3) / 0.7) * 6 * island.erosionIntensity
      const heightFactor = Math.max(0, (currentHeight - 75) / 50)  // Deeper gullies on slopes
      return currentHeight - gullyDepth * heightFactor
    }

    return currentHeight
  }

  /**
   * Get starter island height (center island - flat with gentle rise)
   */
  private getStarterIslandHeight(worldX: number, worldZ: number): IslandHeightResult {
    const STARTER_RADIUS = 35
    const dist = Math.sqrt(worldX * worldX + worldZ * worldZ)

    // Add some coastline variation
    const coastVar = this.smallBlobNoise(worldX * 0.03, worldZ * 0.03) * 8
    const effectiveRadius = STARTER_RADIUS + coastVar

    if (dist > effectiveRadius) {
      return { height: this.SEA_LEVEL - 4, isLand: false, islandIndex: -1 }
    }

    const t = dist / effectiveRadius

    let height: number
    if (t > 0.85) {
      // Narrow beach
      height = this.lerp(this.BEACH_HEIGHT, this.SEA_LEVEL - 2, (t - 0.85) / 0.15)
    } else if (t > 0.4) {
      // Flat lowlands
      height = this.lerp(this.LOWLAND_HEIGHT, this.BEACH_HEIGHT, (t - 0.4) / 0.45)
    } else {
      // Gentle central rise
      const interior = 1 - t / 0.4
      height = this.LOWLAND_HEIGHT + interior * 4
    }

    const bumps = this.bumpNoise(worldX * 0.08, worldZ * 0.08) * 0.5
    return {
      height: Math.floor(height + bumps),
      isLand: true,
      islandIndex: -1  // Starter island is special
    }
  }

  /**
   * Get ocean floor height with variation
   */
  private getOceanFloorHeight(worldX: number, worldZ: number): number {
    const variation = this.bumpNoise(worldX * 0.02, worldZ * 0.02) * 5
    return this.OCEAN_FLOOR + variation
  }

  /**
   * Linear interpolation helper
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t))
  }
}
