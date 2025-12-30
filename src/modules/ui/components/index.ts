// src/modules/ui/components/index.ts

// Base components
export { createPanel, injectPanelStyles, type PanelOptions } from './base/Panel'
export { createButton, injectButtonStyles, type ButtonOptions, type ButtonVariant, type ButtonSize } from './base/Button'
export { createRibbonTitle, injectRibbonStyles, type RibbonTitleOptions } from './base/RibbonTitle'
export { createModal, type ModalOptions, type Modal } from './base/Modal'
export { createInput, type InputOptions, type InputComponent } from './base/Input'
export { createProgressBar, type ProgressBarOptions, type ProgressBarComponent } from './base/ProgressBar'
export { createToggleGroup, type ToggleGroupOptions, type ToggleOption, type ToggleGroupComponent } from './base/ToggleGroup'

// Dialogs and notifications
export { showConfirmDialog, showDeleteConfirm, showUnsavedChangesWarning, type ConfirmDialogOptions } from './base/ConfirmDialog'
export { showToast, toastSuccess, toastError, toastInfo, toastWarning, type ToastOptions, type ToastType } from './base/Toast'

// Widget components
export { createWorldCard, type WorldCardOptions } from './widgets/WorldCard'
export { createSaveSlotCard, type SaveSlotCardOptions } from './widgets/SaveSlotCard'

// Screen components
export * from './screens'

/**
 * Inject all component styles into the document
 * Call this once during application initialization
 */
export function injectAllComponentStyles(): void {
  // Import and call style injectors
  import('./base/Panel').then(m => m.injectPanelStyles())
  import('./base/Button').then(m => m.injectButtonStyles())
  import('./base/RibbonTitle').then(m => m.injectRibbonStyles())
}
