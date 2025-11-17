/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AppState, PageTextData } from '../types';

/**
 * AppStateManager - Singleton state management with observer pattern.
 *
 * Manages global application state and notifies subscribers of changes.
 * Implements the singleton pattern to ensure a single source of truth
 * for application state across the entire application.
 *
 * Features:
 * - Singleton pattern for centralized state management
 * - Observer pattern for reactive updates
 * - Immutable state updates (returns copies, not references)
 * - Type-safe state operations
 * - Subscription management with cleanup callbacks
 *
 * @example
 * ```typescript
 * import appStateManager from './state/AppStateManager';
 *
 * // Subscribe to state changes
 * const unsubscribe = appStateManager.subscribe((state) => {
 *   console.log('State updated:', state.currentPage);
 * });
 *
 * // Update state
 * appStateManager.setState({ currentPage: 2 });
 *
 * // Get current state
 * const state = appStateManager.getState();
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
class AppStateManagerClass {
  private static instance: AppStateManagerClass;

  /**
   * Internal application state.
   * Not directly accessible to prevent unwanted mutations.
   */
  private state: AppState;

  /**
   * Set of subscriber callbacks to notify on state changes.
   */
  private subscribers: Set<(state: AppState) => void>;

  /**
   * Private constructor to prevent direct instantiation.
   * Use getInstance() to get the singleton instance.
   */
  private constructor() {
    // Initialize with default state
    this.state = {
      pdfDoc: null,
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      activeField: null,
      activeFieldElement: null,
      documentName: '',
      extractions: [],
      currentStep: 0,
      totalSteps: 8,
      markdownContent: '',
      markdownLoaded: false,
      pdfTextCache: new Map<number, PageTextData>(),
      searchMarkers: [],
      maxCacheSize: 50,
      isProcessing: false,
      lastSubmissionId: null,

      // Phase 3: Citation Provenance System 🏆
      textChunks: [],
      citationMap: {},
      activeCitationIndex: null
    };

    this.subscribers = new Set();
  }

  /**
   * Gets the singleton instance of AppStateManager.
   * Creates the instance if it doesn't exist.
   *
   * @returns The singleton AppStateManager instance
   */
  static getInstance(): AppStateManagerClass {
    if (!AppStateManagerClass.instance) {
      AppStateManagerClass.instance = new AppStateManagerClass();
    }
    return AppStateManagerClass.instance;
  }

  /**
   * Gets a deep copy of the current application state.
   * Returns a copy to prevent unwanted mutations of the internal state.
   *
   * Note: pdfTextCache is cloned as a new Map to preserve immutability.
   *
   * @returns Deep copy of the current AppState
   */
  getState(): AppState {
    // Create a deep copy to prevent external mutations
    return {
      ...this.state,
      // Clone the Map to ensure immutability
      pdfTextCache: new Map(this.state.pdfTextCache),
      // Clone arrays to prevent mutation
      extractions: [...this.state.extractions],
      searchMarkers: [...this.state.searchMarkers]
    };
  }

  /**
   * Updates the application state with partial updates.
   * Merges the provided updates with the current state and notifies all subscribers.
   *
   * Special handling for Map objects:
   * - If pdfTextCache is provided, it replaces the existing Map entirely
   * - Arrays are replaced, not merged
   *
   * @param updates - Partial state object with properties to update
   *
   * @example
   * ```typescript
   * // Update single property
   * appStateManager.setState({ currentPage: 5 });
   *
   * // Update multiple properties
   * appStateManager.setState({
   *   currentPage: 5,
   *   scale: 1.5,
   *   isProcessing: true
   * });
   *
   * // Update with complex objects
   * appStateManager.setState({
   *   extractions: [...state.extractions, newExtraction],
   *   pdfTextCache: new Map(state.pdfTextCache.set(1, 'text'))
   * });
   * ```
   */
  setState(updates: Partial<AppState>): void {
    // Merge updates with current state
    this.state = {
      ...this.state,
      ...updates
    };

    // Notify all subscribers of state change
    // Each subscriber receives a copy of the new state
    this.subscribers.forEach(callback => {
      callback(this.getState());
    });
  }

  /**
   * Subscribes a callback to state changes.
   * The callback will be invoked whenever setState() is called.
   *
   * @param callback - Function to call when state changes, receives the new state
   * @returns Unsubscribe function to remove the callback
   *
   * @example
   * ```typescript
   * // Subscribe to all state changes
   * const unsubscribe = appStateManager.subscribe((state) => {
   *   console.log('Page changed:', state.currentPage);
   *   updateUI(state);
   * });
   *
   * // Later, cleanup when no longer needed
   * unsubscribe();
   * ```
   */
  subscribe(callback: (state: AppState) => void): () => void {
    // Add callback to subscribers set
    this.subscribers.add(callback);

    // Return unsubscribe function for cleanup
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Gets the number of active subscribers.
   * Useful for debugging and monitoring.
   *
   * @returns Number of active subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Resets the state to initial values.
   * Useful for testing or when loading a new document.
   *
   * @param preserveSubscribers - If true, keeps existing subscribers (default: true)
   */
  reset(preserveSubscribers: boolean = true): void {
    const oldSubscribers = this.subscribers;

    // Reset to initial state
    this.state = {
      pdfDoc: null,
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      activeField: null,
      activeFieldElement: null,
      documentName: '',
      extractions: [],
      currentStep: 0,
      totalSteps: 8,
      markdownContent: '',
      markdownLoaded: false,
      pdfTextCache: new Map<number, PageTextData>(),
      searchMarkers: [],
      maxCacheSize: 50,
      isProcessing: false,
      lastSubmissionId: null,

      // Phase 3: Citation Provenance System 🏆
      textChunks: [],
      citationMap: {},
      activeCitationIndex: null
    };

    if (!preserveSubscribers) {
      this.subscribers = new Set();
    } else {
      // Notify existing subscribers of reset
      oldSubscribers.forEach(callback => {
        callback(this.getState());
      });
    }
  }

  /**
   * Test-only method to reset state and clear subscribers.
   * This is explicitly named to indicate it's for testing purposes only.
   * 
   * Calls reset(false) to clear both state and subscribers.
   * When preserveSubscribers is false, the reset method creates a new empty Set for subscribers.
   * 
   * @internal
   */
  __resetForTesting(): void {
    this.reset(false); // false = clear subscribers
    // Explicitly clear subscribers to ensure test isolation
  }
}

/**
 * Singleton instance of AppStateManager.
 * Import this instance throughout the application to access state management.
 *
 * @example
 * ```typescript
 * import appStateManager from './state/AppStateManager';
 *
 * // Use the singleton instance
 * const state = appStateManager.getState();
 * appStateManager.setState({ currentPage: 2 });
 * ```
 */
export default AppStateManagerClass.getInstance();
