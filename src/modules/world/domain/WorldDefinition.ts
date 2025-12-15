import { z } from 'zod'

const MetaSchema = z.object({
  name: z.string(),
  seed: z.number(),
  version: z.string().default('0.1.0')
})

const NoiseSchema = z.object({
  type: z.enum(['simplex', 'perlin']),
  octaves: z.number().min(1).max(8),
  frequency: z.number(),
  amplitude: z.number(),
  lacunarity: z.number().default(2.0),
  persistence: z.number().default(0.5)
})

const TerrainSchema = z.object({
  generator: z.enum(['noise', 'flat']),
  baseHeight: z.number(),
  noise: NoiseSchema.optional()
})

const BiomeRangeSchema = z.object({
  elevationRange: z.tuple([z.number(), z.number()]),
  surface: z.string(),
  subsurface: z.string()
})

const BiomesSchema = z.object({
  elevationBased: z.boolean(),
  ranges: z.array(BiomeRangeSchema)
})

const FloatingIslandFeatureSchema = z.object({
  type: z.literal('floating_island'),
  spacing: z.number(),
  noiseOffset: z.number().default(100),
  radiusRange: z.tuple([z.number(), z.number()]),
  heightRange: z.tuple([z.number(), z.number()]),
  thickness: z.number().default(15),
  material: z.string(),
  supportPillars: z.boolean().default(false)
})

const CaveSystemFeatureSchema = z.object({
  type: z.literal('cave_system'),
  density: z.number().min(0).max(1),
  radiusRange: z.tuple([z.number(), z.number()]),
  depthRange: z.tuple([z.number(), z.number()]),
  windingFactor: z.number().default(0.7)
})

const GiantTreeFeatureSchema = z.object({
  type: z.literal('giant_tree'),
  density: z.number().min(0).max(1),
  trunkRadiusRange: z.tuple([z.number(), z.number()]),
  heightRange: z.tuple([z.number(), z.number()]),
  canopyRadius: z.number(),
  material: z.object({
    trunk: z.string(),
    leaves: z.string()
  })
})

const CrystalFormationFeatureSchema = z.object({
  type: z.literal('crystal_formation'),
  density: z.number().min(0).max(1),
  heightRange: z.tuple([z.number(), z.number()]),
  material: z.string(),
  depthRange: z.tuple([z.number(), z.number()]),
  onlyInCaves: z.boolean().default(true)
})

const FeatureSchema = z.discriminatedUnion('type', [
  FloatingIslandFeatureSchema,
  CaveSystemFeatureSchema,
  GiantTreeFeatureSchema,
  CrystalFormationFeatureSchema
])

export const WorldDefinitionSchema = z.object({
  meta: MetaSchema,
  terrain: TerrainSchema,
  features: z.array(FeatureSchema),
  biomes: BiomesSchema
})

export type WorldDefinition = z.infer<typeof WorldDefinitionSchema>
export type Meta = z.infer<typeof MetaSchema>
export type Terrain = z.infer<typeof TerrainSchema>
export type Biomes = z.infer<typeof BiomesSchema>
export type BiomeRange = z.infer<typeof BiomeRangeSchema>
export type FloatingIslandFeature = z.infer<typeof FloatingIslandFeatureSchema>
export type CaveSystemFeature = z.infer<typeof CaveSystemFeatureSchema>
export type GiantTreeFeature = z.infer<typeof GiantTreeFeatureSchema>
export type CrystalFormationFeature = z.infer<typeof CrystalFormationFeatureSchema>
export type Feature = z.infer<typeof FeatureSchema>
