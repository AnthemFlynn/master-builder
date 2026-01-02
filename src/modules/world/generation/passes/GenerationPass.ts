import { GenerationContext } from '../GenerationContext'

export interface GenerationPass {
  readonly name: string
  execute(context: GenerationContext): void | Promise<void>
}
