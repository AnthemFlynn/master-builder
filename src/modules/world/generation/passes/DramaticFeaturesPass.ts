import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { FeatureGenerator } from '../features/FeatureGenerator'
import { FloatingIslandGenerator } from '../features/FloatingIslandGenerator'
import { WormCaveGenerator } from '../features/WormCaveGenerator'
import { GiantTreeGenerator } from '../features/GiantTreeGenerator'
import { CrystalFormationGenerator } from '../features/CrystalFormationGenerator'

export class DramaticFeaturesPass implements GenerationPass {
  readonly name = 'DramaticFeaturesPass'

  private generators = new Map<string, FeatureGenerator>([
    ['floating_island', new FloatingIslandGenerator()],
    ['cave_system', new WormCaveGenerator()],
    ['giant_tree', new GiantTreeGenerator()],
    ['crystal_formation', new CrystalFormationGenerator()]
  ])

  execute(context: GenerationContext): void {
    for (const featureDef of context.worldDef.features) {
      const generator = this.generators.get(featureDef.type)
      if (!generator) {
        console.warn(`Unknown feature type: ${featureDef.type}`)
        continue
      }

      // Check if this chunk is affected
      if (generator.affects(context.chunkCoord, context.seed, featureDef)) {
        // Generate feature
        generator.generate(context, featureDef)
      }
    }
  }
}
