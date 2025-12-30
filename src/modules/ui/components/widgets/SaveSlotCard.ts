// src/modules/ui/components/widgets/SaveSlotCard.ts

import { SaveSlot } from '../../../persistence/domain/SaveSlot'

/**
 * SaveSlotCard - Save slot display with actions
 *
 * Shows save slot info (timestamp, position, mode) with
 * load, save-to, and delete actions.
 */

export interface SaveSlotCardOptions {
  /** Save slot data (null for empty slot) */
  slot: SaveSlot | null
  /** Slot identifier */
  slotId: string
  /** Whether this slot is selected */
  selected?: boolean
  /** Whether we're in "save mode" (vs load mode) */
  saveMode?: boolean
  /** Called when card is clicked */
  onClick?: (slotId: string) => void
  /** Called when load button is clicked */
  onLoad?: (slotId: string) => void
  /** Called when save button is clicked */
  onSave?: (slotId: string) => void
  /** Called when delete button is clicked */
  onDelete?: (slotId: string) => void
  /** Additional CSS classes */
  className?: string
}

export function createSaveSlotCard(options: SaveSlotCardOptions): HTMLElement {
  const {
    slot,
    slotId,
    selected = false,
    saveMode = false,
    onClick,
    onLoad,
    onSave,
    onDelete,
    className = ''
  } = options

  const isEmpty = !slot

  const card = document.createElement('div')
  card.className = `kb-save-slot ${isEmpty ? 'kb-save-slot--empty' : ''} ${selected ? 'kb-save-slot--selected' : ''} ${className}`.trim()
  card.style.cssText = `
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: ${selected ? 'var(--wood-light)' : 'var(--wood-dark)'};
    border: 3px solid ${selected ? 'var(--button-green)' : 'var(--wood-medium)'};
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: ${selected ? 'var(--glow-green)' : 'none'};
  `

  // Slot icon/number
  const icon = document.createElement('div')
  icon.className = 'kb-save-slot-icon'
  icon.style.cssText = `
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-family);
    font-size: var(--font-size-lg);
    font-weight: bold;
    color: var(--text-light);
    background: ${isEmpty ? 'var(--stone-blue-dark)' : 'var(--stone-blue)'};
    border: 2px solid var(--wood-medium);
    border-radius: var(--border-radius-sm);
    flex-shrink: 0;
  `

  if (slotId === 'autosave') {
    icon.textContent = '🔄'
    icon.title = 'Autosave'
  } else {
    const slotNum = slotId.replace('slot-', '')
    icon.textContent = slotNum
  }

  // Info section
  const info = document.createElement('div')
  info.className = 'kb-save-slot-info'
  info.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
  `

  if (isEmpty) {
    // Empty slot
    const emptyLabel = document.createElement('div')
    emptyLabel.className = 'kb-save-slot-empty-label'
    emptyLabel.textContent = slotId === 'autosave' ? 'No Autosave' : 'Empty Slot'
    emptyLabel.style.cssText = `
      font-family: var(--font-family);
      font-size: var(--font-size-md);
      color: var(--text-muted);
      font-style: italic;
    `
    info.appendChild(emptyLabel)
  } else {
    // Slot name/type
    const name = document.createElement('div')
    name.className = 'kb-save-slot-name'
    name.textContent = slotId === 'autosave' ? 'Autosave' : `Save ${slotId.replace('slot-', '')}`
    name.style.cssText = `
      font-family: var(--font-family);
      font-size: var(--font-size-md);
      font-weight: bold;
      color: var(--text-light);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    `

    // Meta info
    const meta = document.createElement('div')
    meta.className = 'kb-save-slot-meta'
    meta.style.cssText = `
      display: flex;
      gap: var(--space-md);
      font-family: var(--font-family);
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    `

    // Timestamp
    const timestamp = document.createElement('span')
    timestamp.textContent = formatDate(slot.timestamp)

    // Position (if available)
    if (slot.playerPosition) {
      const position = document.createElement('span')
      position.textContent = `X: ${Math.round(slot.playerPosition.x)}, Y: ${Math.round(slot.playerPosition.y)}`
      meta.appendChild(timestamp)
      meta.appendChild(position)
    } else {
      meta.appendChild(timestamp)
    }

    // Mode badge
    if (slot.playerMode) {
      const modeBadge = document.createElement('span')
      modeBadge.textContent = slot.playerMode === 'flying' ? '✈️' : '🚶'
      modeBadge.title = slot.playerMode
      meta.appendChild(modeBadge)
    }

    info.appendChild(name)
    info.appendChild(meta)
  }

  // Action buttons
  const actions = document.createElement('div')
  actions.className = 'kb-save-slot-actions'
  actions.style.cssText = `
    display: flex;
    gap: var(--space-sm);
    flex-shrink: 0;
  `

  const createActionBtn = (
    icon: string,
    title: string,
    color: string,
    colorDark: string,
    handler?: () => void
  ) => {
    const btn = document.createElement('button')
    btn.textContent = icon
    btn.title = title
    btn.style.cssText = `
      width: 36px;
      height: 36px;
      padding: 0;
      font-size: 14px;
      color: var(--text-light);
      background: ${color};
      border: 2px solid ${colorDark};
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    `
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)'
    })
    if (handler) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        handler()
      })
    }
    return btn
  }

  if (saveMode) {
    // Save mode: show save button
    const saveBtn = createActionBtn(
      '💾',
      'Save Here',
      'var(--button-green)',
      'var(--button-green-dark)',
      () => onSave?.(slotId)
    )
    actions.appendChild(saveBtn)
  } else if (!isEmpty) {
    // Load mode: show load and delete buttons
    const loadBtn = createActionBtn(
      '▶',
      'Load',
      'var(--button-green)',
      'var(--button-green-dark)',
      () => onLoad?.(slotId)
    )
    actions.appendChild(loadBtn)
  }

  if (!isEmpty && slotId !== 'autosave') {
    const deleteBtn = createActionBtn(
      '🗑️',
      'Delete',
      'var(--danger-red)',
      'var(--danger-red-dark)',
      () => onDelete?.(slotId)
    )
    actions.appendChild(deleteBtn)
  }

  // Hover effects
  card.addEventListener('mouseenter', () => {
    if (!selected) {
      card.style.background = 'var(--wood-medium)'
      card.style.borderColor = 'var(--wood-light)'
    }
  })
  card.addEventListener('mouseleave', () => {
    if (!selected) {
      card.style.background = 'var(--wood-dark)'
      card.style.borderColor = 'var(--wood-medium)'
    }
  })

  if (onClick) {
    card.addEventListener('click', () => onClick(slotId))
  }

  card.appendChild(icon)
  card.appendChild(info)
  card.appendChild(actions)

  return card
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()

  // Same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  // This week
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  if (date > weekAgo) {
    return date.toLocaleDateString(undefined, { weekday: 'short' })
  }

  // Older
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
