// src/modules/ui/components/screens/WorldSelectScreen.ts

import { World } from '../../../persistence/domain/World'
import { createPanel } from '../base/Panel'
import { createButton } from '../base/Button'
import { createRibbonTitle } from '../base/RibbonTitle'
import { createWorldCard } from '../widgets/WorldCard'

/**
 * WorldSelectScreen - World selection list
 *
 * Shows all worlds with thumbnails and quick-play buttons.
 * Allows navigating to world detail or creating new world.
 */

export interface WorldSelectScreenOptions {
  /** Available worlds */
  worlds: World[]
  /** Called when a world card is clicked */
  onSelectWorld: (world: World) => void
  /** Called when quick-play is clicked */
  onPlayWorld: (world: World) => void
  /** Called when delete is clicked */
  onDeleteWorld?: (world: World) => void
  /** Called when Create World is clicked */
  onCreateWorld: () => void
  /** Called when Back is clicked */
  onBack: () => void
}

export interface WorldSelectScreenComponent {
  element: HTMLElement
  show: () => void
  hide: () => void
  destroy: () => void
  setWorlds: (worlds: World[]) => void
}

export function createWorldSelectScreen(options: WorldSelectScreenOptions): WorldSelectScreenComponent {
  const {
    worlds: initialWorlds,
    onSelectWorld,
    onPlayWorld,
    onDeleteWorld,
    onCreateWorld,
    onBack
  } = options

  let worlds = initialWorlds

  const container = document.createElement('div')
  container.className = 'kb-world-select-screen'
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
    z-index: var(--z-modal);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-normal), visibility var(--transition-normal);
  `

  // Decorative background
  const bgDecor = document.createElement('div')
  bgDecor.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at 20% 80%, rgba(76, 175, 80, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(123, 94, 173, 0.08) 0%, transparent 50%);
    pointer-events: none;
  `

  // Main panel
  const panel = createPanel({
    width: '500px',
    maxHeight: '80vh',
    padding: 'var(--space-lg)',
    corners: true
  })
  panel.style.cssText += `
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    animation: kb-scale-in 0.3s ease-out;
  `

  // Header with title and create button
  const header = document.createElement('div')
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  `

  const title = createRibbonTitle({
    title: 'Your Worlds',
    size: 'small'
  })

  const createBtn = createButton({
    label: 'New World',
    variant: 'primary',
    size: 'small',
    icon: '✨',
    onClick: onCreateWorld
  })

  header.appendChild(title)
  header.appendChild(createBtn)

  // Worlds list container
  const worldsList = document.createElement('div')
  worldsList.className = 'kb-worlds-list'
  worldsList.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    overflow-y: auto;
    max-height: calc(80vh - 200px);
    padding-right: var(--space-sm);
  `

  const renderWorlds = () => {
    worldsList.innerHTML = ''

    if (worlds.length === 0) {
      const emptyState = document.createElement('div')
      emptyState.style.cssText = `
        text-align: center;
        padding: var(--space-xxl);
        color: var(--text-muted);
        font-family: var(--font-family);
      `
      emptyState.innerHTML = `
        <div style="font-size: 48px; margin-bottom: var(--space-md);">🌍</div>
        <div style="font-size: var(--font-size-lg); margin-bottom: var(--space-sm);">No Worlds Yet</div>
        <div style="font-size: var(--font-size-sm);">Create your first world to get started!</div>
      `
      worldsList.appendChild(emptyState)
      return
    }

    worlds.forEach(world => {
      const card = createWorldCard({
        world,
        onClick: (w) => onSelectWorld(w),
        onPlay: (w) => onPlayWorld(w),
        onDelete: onDeleteWorld ? (w) => onDeleteWorld(w) : undefined
      })
      worldsList.appendChild(card)
    })
  }

  renderWorlds()

  // Back button
  const backBtn = createButton({
    label: 'Back',
    variant: 'ghost',
    size: 'medium',
    icon: '←',
    onClick: onBack
  })
  backBtn.style.alignSelf = 'flex-start'
  backBtn.style.marginTop = 'var(--space-sm)'

  panel.appendChild(header)
  panel.appendChild(worldsList)
  panel.appendChild(backBtn)

  container.appendChild(bgDecor)
  container.appendChild(panel)

  const show = () => {
    document.body.appendChild(container)
    void container.offsetHeight
    container.style.opacity = '1'
    container.style.visibility = 'visible'
  }

  const hide = () => {
    container.style.opacity = '0'
    container.style.visibility = 'hidden'
    setTimeout(() => {
      if (container.parentElement) {
        container.parentElement.removeChild(container)
      }
    }, 250)
  }

  const destroy = () => {
    hide()
  }

  const setWorlds = (newWorlds: World[]) => {
    worlds = newWorlds
    renderWorlds()
  }

  return {
    element: container,
    show,
    hide,
    destroy,
    setWorlds
  }
}
