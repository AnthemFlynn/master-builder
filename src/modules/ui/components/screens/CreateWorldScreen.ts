// src/modules/ui/components/screens/CreateWorldScreen.ts

import { CreateWorldParams } from '../../../persistence/domain/World'
import { createPanel } from '../base/Panel'
import { createButton } from '../base/Button'
import { createRibbonTitle } from '../base/RibbonTitle'
import { createInput } from '../base/Input'
import { createToggleGroup } from '../base/ToggleGroup'

/**
 * CreateWorldScreen - New world creation form
 *
 * Allows entering world name, seed, game mode, and world type.
 */

export interface CreateWorldScreenOptions {
  /** Called when world is created */
  onCreate: (params: CreateWorldParams) => void
  /** Called when cancelled */
  onCancel: () => void
}

export interface CreateWorldScreenComponent {
  element: HTMLElement
  show: () => void
  hide: () => void
  destroy: () => void
  reset: () => void
}

export function createCreateWorldScreen(options: CreateWorldScreenOptions): CreateWorldScreenComponent {
  const { onCreate, onCancel } = options

  const container = document.createElement('div')
  container.className = 'kb-create-world-screen'
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

  // Main panel
  const panel = createPanel({
    width: '450px',
    padding: 'var(--space-lg)',
    corners: true
  })
  panel.style.cssText += `
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    animation: kb-scale-in 0.3s ease-out;
  `

  // Title
  const title = createRibbonTitle({
    title: 'Create World',
    size: 'medium'
  })
  title.style.alignSelf = 'center'

  // Form container
  const form = document.createElement('div')
  form.className = 'kb-create-world-form'
  form.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  `

  // World name input
  const nameInput = createInput({
    label: 'World Name',
    placeholder: 'My World',
    maxLength: 32,
    helper: 'Give your world a memorable name'
  })

  // Seed input
  const seedInput = createInput({
    label: 'Seed (Optional)',
    placeholder: 'Random',
    type: 'text',
    helper: 'Leave empty for random seed'
  })

  // Game mode toggle
  const gameModeToggle = createToggleGroup({
    label: 'Game Mode',
    options: [
      { value: 'creative', label: 'Creative', icon: '✨', description: 'Unlimited resources' },
      { value: 'survival', label: 'Survival', icon: '⚔️', description: 'Coming soon' }
    ],
    selected: 'creative',
    direction: 'horizontal'
  })

  // World type toggle
  const worldTypeToggle = createToggleGroup({
    label: 'World Type',
    options: [
      { value: 'default', label: 'Default', icon: '🏝️' },
      { value: 'flat', label: 'Flat', icon: '🟫' },
      { value: 'caves', label: 'Caves', icon: '🕳️' },
      { value: 'forest', label: 'Forest', icon: '🌲' }
    ],
    selected: 'default',
    direction: 'horizontal'
  })

  form.appendChild(nameInput.element)
  form.appendChild(seedInput.element)
  form.appendChild(gameModeToggle.element)
  form.appendChild(worldTypeToggle.element)

  // Buttons
  const buttonsContainer = document.createElement('div')
  buttonsContainer.style.cssText = `
    display: flex;
    gap: var(--space-md);
    justify-content: flex-end;
    margin-top: var(--space-md);
  `

  const cancelBtn = createButton({
    label: 'Cancel',
    variant: 'ghost',
    size: 'medium',
    onClick: onCancel
  })

  const createBtn = createButton({
    label: 'Create World',
    variant: 'primary',
    size: 'medium',
    icon: '✨',
    onClick: () => {
      const name = nameInput.getValue().trim() || 'My World'
      const seedStr = seedInput.getValue().trim()
      const seed = seedStr ? parseSeed(seedStr) : Math.floor(Math.random() * 1000000)
      const gameMode = gameModeToggle.getValue() as 'creative' | 'survival'
      const worldType = worldTypeToggle.getValue()

      onCreate({
        name,
        seed,
        worldType,
        gameMode
      })
    }
  })

  buttonsContainer.appendChild(cancelBtn)
  buttonsContainer.appendChild(createBtn)

  panel.appendChild(title)
  panel.appendChild(form)
  panel.appendChild(buttonsContainer)

  container.appendChild(panel)

  const reset = () => {
    nameInput.setValue('')
    seedInput.setValue('')
    gameModeToggle.setValue('creative')
    worldTypeToggle.setValue('default')
    nameInput.setError(null)
  }

  const show = () => {
    reset()
    document.body.appendChild(container)
    void container.offsetHeight
    container.style.opacity = '1'
    container.style.visibility = 'visible'
    // Focus name input
    setTimeout(() => nameInput.focus(), 100)
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

  return {
    element: container,
    show,
    hide,
    destroy,
    reset
  }
}

/**
 * Parse seed string to number
 * Supports numeric seeds or string hashing
 */
function parseSeed(seedStr: string): number {
  // If it's a number, use it directly
  const num = parseInt(seedStr, 10)
  if (!isNaN(num)) {
    return num
  }

  // Otherwise, hash the string
  let hash = 0
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
