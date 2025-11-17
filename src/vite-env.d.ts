/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Vite Client Type Definitions
 *
 * Provides TypeScript type definitions for Vite-specific features,
 * primarily import.meta.env for environment variable access.
 *
 * Fixes: 7 TypeScript compilation errors related to import.meta.env
 */

/// <reference types="vite/client" />

/**
 * Define environment variables available via import.meta.env
 *
 * Vite exposes env vars with VITE_ prefix to the client.
 * All other env vars are only available server-side (backend).
 */
interface ImportMetaEnv {
  /**
   * Google Gemini API key for AI-powered extraction
   * Required for: PICO extraction, summary generation, field validation
   */
  readonly VITE_GEMINI_API_KEY: string;

  /**
   * Backend API URL (optional)
   * Default: http://localhost:8000
   * Production: Set to your deployed backend URL
   */
  readonly VITE_BACKEND_API_URL?: string;

  /**
   * Alternative backend URL naming (legacy support)
   */
  readonly VITE_BACKEND_URL?: string;

  /**
   * Anthropic API key (optional - backend fallback)
   * Used by backend for dual-provider LLM system
   */
  readonly VITE_ANTHROPIC_API_KEY?: string;

  /**
   * Enable debug mode (optional)
   * Shows additional console logging and debug UI
   */
  readonly VITE_DEBUG?: string;

  /**
   * Node environment (injected by Vite)
   * Values: 'development' | 'production' | 'test'
   */
  readonly MODE: string;

  /**
   * Base URL for assets (injected by Vite)
   */
  readonly BASE_URL: string;

  /**
   * Whether running in production (injected by Vite)
   */
  readonly PROD: boolean;

  /**
   * Whether running in development (injected by Vite)
   */
  readonly DEV: boolean;

  /**
   * Whether running server-side rendering (injected by Vite)
   */
  readonly SSR: boolean;
}

/**
 * Extend ImportMeta interface to include typed env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
