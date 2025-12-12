// src/modules/persistence/domain/events/PersistenceEvents.ts
import { DomainEvent } from '../../../game/domain/events/DomainEvent'
import { SaveSlot } from '../SaveSlot'

// Save Events

export interface GameSaveStartedEvent extends DomainEvent {
  type: 'GameSaveStartedEvent'
  slotId: string
  auto: boolean
}

export interface GameSavedEvent extends DomainEvent {
  type: 'GameSavedEvent'
  slotId: string
  slotName: string
  saveSlot: SaveSlot
  auto: boolean
  duration: number                       // Save time in milliseconds
}

export interface GameSaveFailedEvent extends DomainEvent {
  type: 'GameSaveFailedEvent'
  slotId: string
  error: string
}

// Load Events

export interface GameLoadStartedEvent extends DomainEvent {
  type: 'GameLoadStartedEvent'
  slotId: string
}

export interface GameLoadedEvent extends DomainEvent {
  type: 'GameLoadedEvent'
  slotId: string
  slotName: string
}

export interface GameLoadFailedEvent extends DomainEvent {
  type: 'GameLoadFailedEvent'
  slotId: string
  error: string
}
