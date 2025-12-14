import { PerformanceConfig } from '../../game/infrastructure/PerformanceConfig'

export class AdvancedSettings {
  private container: HTMLDivElement
  private config: PerformanceConfig

  constructor(config: PerformanceConfig) {
    this.config = config
    this.container = this.createSettingsPanel()
    this.attachEventListeners()
  }

  private createSettingsPanel(): HTMLDivElement {
    const panel = document.createElement('div')
    panel.id = 'advanced-settings'
    panel.innerHTML = `
      <div style="margin-top: 20px; padding: 15px; border: 1px solid #666; border-radius: 5px;">
        <p style="font-weight: bold; margin-bottom: 10px;">Advanced Performance</p>

        <label>Worker Pool Size: <span id="worker-pool-value">${this.config.workerPoolSize}</span></label>
        <input type="range" id="worker-pool-slider" min="2" max="12" value="${this.config.workerPoolSize}" step="1">

        <label>Frame Budget (ms): <span id="budget-value">${this.config.frameBudgetMs}</span></label>
        <input type="range" id="budget-slider" min="2" max="5" value="${this.config.frameBudgetMs}" step="0.5">

        <label>LOD Transition Speed (ms): <span id="transition-value">${this.config.lodTransitionMs}</span></label>
        <input type="range" id="transition-slider" min="150" max="500" value="${this.config.lodTransitionMs}" step="50">

        <label>Mesh Cache Size: <span id="cache-value">${this.config.lodCacheSize}</span></label>
        <input type="range" id="cache-slider" min="10" max="50" value="${this.config.lodCacheSize}" step="5">

        <button id="reset-performance" class="button" style="margin-top: 10px; width: 100%;">Reset to Defaults</button>
      </div>
    `
    return panel
  }

  private attachEventListeners(): void {
    // Worker pool size
    const workerSlider = this.container.querySelector('#worker-pool-slider') as HTMLInputElement
    const workerValue = this.container.querySelector('#worker-pool-value')!
    workerSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value)
      this.config.workerPoolSize = value
      workerValue.textContent = value.toString()
      this.config.save()
    })

    // Frame budget
    const budgetSlider = this.container.querySelector('#budget-slider') as HTMLInputElement
    const budgetValue = this.container.querySelector('#budget-value')!
    budgetSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.config.frameBudgetMs = value
      budgetValue.textContent = value.toString()
      this.config.save()
    })

    // Transition speed
    const transitionSlider = this.container.querySelector('#transition-slider') as HTMLInputElement
    const transitionValue = this.container.querySelector('#transition-value')!
    transitionSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value)
      this.config.lodTransitionMs = value
      transitionValue.textContent = value.toString()
      this.config.save()
    })

    // Cache size
    const cacheSlider = this.container.querySelector('#cache-slider') as HTMLInputElement
    const cacheValue = this.container.querySelector('#cache-value')!
    cacheSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value)
      this.config.lodCacheSize = value
      cacheValue.textContent = value.toString()
      this.config.save()
    })

    // Reset button
    const resetButton = this.container.querySelector('#reset-performance')!
    resetButton.addEventListener('click', () => {
      this.config.resetToDefaults()
      this.updateUI()
    })
  }

  private updateUI(): void {
    (this.container.querySelector('#worker-pool-slider') as HTMLInputElement).value = this.config.workerPoolSize.toString();
    (this.container.querySelector('#worker-pool-value')! as HTMLElement).textContent = this.config.workerPoolSize.toString();
    (this.container.querySelector('#budget-slider') as HTMLInputElement).value = this.config.frameBudgetMs.toString();
    (this.container.querySelector('#budget-value')! as HTMLElement).textContent = this.config.frameBudgetMs.toString();
    (this.container.querySelector('#transition-slider') as HTMLInputElement).value = this.config.lodTransitionMs.toString();
    (this.container.querySelector('#transition-value')! as HTMLElement).textContent = this.config.lodTransitionMs.toString();
    (this.container.querySelector('#cache-slider') as HTMLInputElement).value = this.config.lodCacheSize.toString();
    (this.container.querySelector('#cache-value')! as HTMLElement).textContent = this.config.lodCacheSize.toString()
  }

  appendTo(parent: HTMLElement): void {
    parent.appendChild(this.container)
  }
}
