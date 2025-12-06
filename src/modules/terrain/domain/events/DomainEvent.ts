// src/modules/terrain/domain/events/DomainEvent.ts
export interface DomainEvent {
  readonly type: string
  readonly timestamp: number
}
