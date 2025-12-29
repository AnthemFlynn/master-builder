// src/modules/ui/components/widgets/WorldCard.ts

import { World } from '../../../persistence/domain/World'

/**
 * WorldCard - Thumbnail + info card for world list
 *
 * Displays world thumbnail, name, last played, and play time.
 * Used in the world selection screen.
 */

export interface WorldCardOptions {
  /** World data */
  world: World
  /** Whether this world is selected */
  selected?: boolean
  /** Called when card is clicked */
  onClick?: (world: World) => void
  /** Called when play button is clicked */
  onPlay?: (world: World) => void
  /** Additional CSS classes */
  className?: string
}

export function createWorldCard(options: WorldCardOptions): HTMLElement {
  const {
    world,
    selected = false,
    onClick,
    onPlay,
    className = ''
  } = options

  const card = document.createElement('div')
  card.className = `kb-world-card ${selected ? 'kb-world-card--selected' : ''} ${className}`.trim()
  card.style.cssText = `
    display: flex;
    gap: var(--space-md);
    padding: var(--space-md);
    background: ${selected ? 'var(--wood-light)' : 'var(--wood-dark)'};
    border: 3px solid ${selected ? 'var(--button-green)' : 'var(--wood-medium)'};
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: ${selected ? 'var(--glow-green)' : 'none'};
  `

  // Thumbnail
  const thumbnail = document.createElement('div')
  thumbnail.className = 'kb-world-card-thumbnail'
  thumbnail.style.cssText = `
    width: 96px;
    height: 54px;
    background: ${world.thumbnail ? `url(${world.thumbnail}) center/cover` : 'var(--stone-blue)'};
    border: 2px solid var(--wood-medium);
    border-radius: var(--border-radius-sm);
    flex-shrink: 0;
  `

  // Placeholder icon if no thumbnail
  if (!world.thumbnail) {
    const icon = document.createElement('div')
    icon.textContent = '🌍'
    icon.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    `
    thumbnail.appendChild(icon)
  }

  // Info section
  const info = document.createElement('div')
  info.className = 'kb-world-card-info'
  info.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-xs);
    min-width: 0;
  `

  // World name
  const name = document.createElement('div')
  name.className = 'kb-world-card-name'
  name.textContent = world.name
  name.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-md);
    font-weight: bold;
    color: var(--text-light);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `

  // Meta info
  const meta = document.createElement('div')
  meta.className = 'kb-world-card-meta'
  meta.style.cssText = `
    display: flex;
    gap: var(--space-md);
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
  `

  // Last played
  const lastPlayed = document.createElement('span')
  lastPlayed.textContent = formatTimeAgo(world.lastPlayed)

  // Play time
  const playTime = document.createElement('span')
  playTime.textContent = formatPlayTime(world.totalPlayTime)

  meta.appendChild(lastPlayed)
  meta.appendChild(playTime)

  info.appendChild(name)
  info.appendChild(meta)

  // Quick play button
  const playBtn = document.createElement('button')
  playBtn.className = 'kb-world-card-play'
  playBtn.textContent = '▶'
  playBtn.title = 'Play'
  playBtn.style.cssText = `
    width: 40px;
    height: 40px;
    padding: 0;
    font-size: 16px;
    color: var(--text-light);
    background: var(--button-green);
    border: 2px solid var(--button-green-dark);
    border-radius: 50%;
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
    align-self: center;
  `

  playBtn.addEventListener('mouseenter', () => {
    playBtn.style.transform = 'scale(1.1)'
    playBtn.style.boxShadow = 'var(--glow-green)'
  })
  playBtn.addEventListener('mouseleave', () => {
    playBtn.style.transform = 'scale(1)'
    playBtn.style.boxShadow = 'none'
  })
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    onPlay?.(world)
  })

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
    card.addEventListener('click', () => onClick(world))
  }

  card.appendChild(thumbnail)
  card.appendChild(info)
  card.appendChild(playBtn)

  return card
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return new Date(timestamp).toLocaleDateString()
}

function formatPlayTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return 'New'
}
