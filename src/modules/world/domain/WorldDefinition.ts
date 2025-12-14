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
  noise: NoiseSchema
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

export const WorldDefinitionSchema = z.object({
  meta: MetaSchema,
  terrain: TerrainSchema,
  features: z.array(z.any()),  // Will add discriminated union in next task
  biomes: BiomesSchema
})

export type WorldDefinition = z.infer<typeof WorldDefinitionSchema>
export type Meta = z.infer<typeof MetaSchema>
export type Terrain = z.infer<typeof TerrainSchema>
export type Biomes = z.infer<typeof BiomesSchema>
export type BiomeRange = z.infer<typeof BiomeRangeSchema>
