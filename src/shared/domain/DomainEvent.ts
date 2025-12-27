// src/shared/domain/DomainEvent.ts
export interface DomainEvent {
  readonly type: string
  readonly timestamp: number
}
