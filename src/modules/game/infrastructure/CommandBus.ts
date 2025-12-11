// src/modules/terrain/application/CommandBus.ts
import { Command, CommandHandler } from '../domain/commands/Command'

export class CommandBus {
  private handlers = new Map<string, CommandHandler<any>>()
  private log: Command[] = []
  private readonly maxLogSize = 10000

  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler)
  }

  send<T extends Command>(command: T): void {
    this.log.push(command)

    // Circular buffer: remove oldest command if log exceeds max size
    if (this.log.length > this.maxLogSize) {
      this.log.shift()
    }

    const handler = this.handlers.get(command.type)

    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`)
    }

    try {
      handler.execute(command)
    } catch (error) {
      console.error(`[CommandBus] Error executing command ${command.type}:`, error)
      // Re-throw to notify caller of command failure
      throw error
    }
  }

  replay(fromIndex: number = 0): void {
    console.log(`🔄 Replaying ${this.log.length - fromIndex} commands from index ${fromIndex}`)

    for (let i = fromIndex; i < this.log.length; i++) {
      const handler = this.handlers.get(this.log[i].type)
      if (handler) {
        try {
          handler.execute(this.log[i])
        } catch (error) {
          console.error(`[CommandBus] Error replaying command ${this.log[i].type} at index ${i}:`, error)
          // Continue to next command instead of stopping replay
        }
      }
    }
  }

  getLog(): readonly Command[] {
    return this.log
  }
}
