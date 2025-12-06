// src/modules/terrain/domain/commands/Command.ts
export interface Command {
  readonly type: string
  readonly timestamp: number
}

export interface CommandHandler<T extends Command> {
  execute(command: T): void
}
