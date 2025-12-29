// src/modules/ui/application/ErrorHandler.ts

import { toastError } from '../components/base/Toast'

/**
 * ErrorHandler - Centralized error handling for UI operations
 *
 * Catches errors from async operations and displays user-friendly messages.
 */

export interface ErrorHandlerOptions {
  /** Show toast notification on error */
  showToast?: boolean
  /** Log to console */
  logToConsole?: boolean
  /** Custom error callback */
  onError?: (error: Error, context?: string) => void
}

const defaultOptions: ErrorHandlerOptions = {
  showToast: true,
  logToConsole: true
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string,
  options: ErrorHandlerOptions = {}
): T {
  const opts = { ...defaultOptions, ...options }

  return (async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error as Error, context, opts)
      return undefined
    }
  }) as T
}

/**
 * Handle an error with the configured options
 */
export function handleError(
  error: Error,
  context: string,
  options: ErrorHandlerOptions = defaultOptions
): void {
  const opts = { ...defaultOptions, ...options }

  if (opts.logToConsole) {
    console.error(`[${context}]`, error)
  }

  if (opts.showToast) {
    const message = getUserFriendlyMessage(error, context)
    toastError(message)
  }

  opts.onError?.(error, context)
}

/**
 * Convert error to user-friendly message
 */
function getUserFriendlyMessage(error: Error, context: string): string {
  // Known error types
  if (error.name === 'QuotaExceededError') {
    return 'Storage is full. Please delete some saves.'
  }

  if (error.message.includes('IndexedDB')) {
    return 'Unable to access saved data. Please try again.'
  }

  if (error.message.includes('not found')) {
    return 'The requested item could not be found.'
  }

  if (error.message.includes('network') || error.message.includes('fetch')) {
    return 'Network error. Please check your connection.'
  }

  // Context-specific messages
  switch (context) {
    case 'save':
      return 'Failed to save game. Please try again.'
    case 'load':
      return 'Failed to load save. The file may be corrupted.'
    case 'createWorld':
      return 'Failed to create world. Please try again.'
    case 'deleteWorld':
      return 'Failed to delete world. Please try again.'
    default:
      return 'An error occurred. Please try again.'
  }
}

/**
 * Try an operation and return result or null
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  context: string,
  options: ErrorHandlerOptions = {}
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    handleError(error as Error, context, options)
    return null
  }
}

/**
 * Assert a condition, throwing with context if false
 */
export function assertDefined<T>(
  value: T | null | undefined,
  name: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${name} is not defined`)
  }
}
