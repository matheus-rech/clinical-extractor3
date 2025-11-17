/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Core type definitions for the Clinical Extractor application.
 * Contains all interfaces, types, and type definitions used throughout the application.
 *
 * 🏆 Including Phase 3 Citation Provenance System for Nobel-worthy research!
 */

// Import citation provenance types
import type { TextChunk, CitationMap } from '../services/CitationService';
// Import text structure types
import type { Section, Paragraph } from '../services/TextStructureService';

// ==================== EXTRACTION TYPES ====================

/**
 * Coordinates defining a bounding box for extracted text on a PDF page.
 */
export interface Coordinates {
  /** Left/X position in PDF coordinates */
  left?: number;
  x?: number;
  /** Top/Y position in PDF coordinates */
  top?: number;
  y?: number;
  /** Width of the bounding box */
  width: number;
  /** Height of the bounding box */
  height: number;
}

/**
 * Constant array of all valid extraction methods.
 * Used to derive the ExtractionMethod type and for runtime validation.
 * - 'manual': User-selected text from PDF
 * - 'gemini-pico': AI-generated PICO analysis
 * - 'gemini-summary': AI-generated summary
 * - 'gemini-metadata': AI-extracted metadata
 * - 'gemini-table': AI-extracted table data
 * - 'gemini-deep': Deep AI analysis
 */
export const EXTRACTION_METHODS = [
  'manual',
  'gemini-pico',
  'gemini-summary',
  'gemini-metadata',
  'gemini-table',
  'gemini-deep',
] as const;

/**
 * Method used for data extraction.
 * Derived from EXTRACTION_METHODS constant to ensure consistency.
 */
export type ExtractionMethod = typeof EXTRACTION_METHODS[number];

/**
 * Represents a single data extraction from the PDF or AI analysis.
 */
export interface Extraction {
  /** Unique identifier for the extraction */
  id: string;
  /** Timestamp when extraction was created */
  timestamp: string;
  /** Name of the form field this extraction populates */
  fieldName: string;
  /** Extracted text content */
  text: string;
  /** PDF page number (0 for AI-generated extractions) */
  page: number;
  /** Bounding box coordinates on the PDF page */
  coordinates: Coordinates;
  /** Method used to extract the data */
  method: ExtractionMethod;
  /** Name of the source document */
  documentName: string;
}

// ==================== APP STATE TYPES ====================

/**
 * Text item from PDF.js text layer with DOM element reference.
 */
export interface TextItem {
  /** Text content */
  str?: string;
  text?: string;
  /** DOM element containing the text */
  element?: HTMLElement;
  /** Transform matrix [scaleX, 0, 0, scaleY, x, y] */
  transform?: number[];
  /** X position */
  x?: number;
  /** Y position */
  y?: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
}

/**
 * Search marker for highlighting search results in PDF.
 */
export interface SearchMarker {
  /** DOM element of the marker */
  element: HTMLElement;
  /** Page number where marker appears */
  page: number;
}

/**
 * Cached page text data with full text and text items array.
 */
export interface PageTextData {
  /** Full text content of the page */
  fullText: string;
  /** Array of text items from PDF.js */
  items: any[];
}

/**
 * Global application state managed by AppStateManager.
 */
export interface AppState {
  /** PDF.js document object (null if no PDF loaded) */
  pdfDoc: any | null;
  /** Current page number being displayed */
  currentPage: number;
  /** Total number of pages in the PDF */
  totalPages: number;
  /** Current zoom scale (1.0 = 100%) */
  scale: number;
  /** Currently active form field name (null if none selected) */
  activeField: string | null;
  /** DOM element of the active field (null if none selected) */
  activeFieldElement: HTMLElement | null;
  /** Name of the loaded document */
  documentName: string;
  /** Array of all extractions made */
  extractions: Extraction[];
  /** Current step in the extraction wizard (0-based) */
  currentStep: number;
  /** Total number of steps in the wizard */
  totalSteps: number;
  /** Cached markdown content for AI processing */
  markdownContent: string;
  /** Whether markdown content has been loaded */
  markdownLoaded: boolean;
  /** Cache of extracted text per page (page number -> text) */
  pdfTextCache: Map<number, PageTextData>;
  /** Active search result markers on the PDF */
  searchMarkers: SearchMarker[];
  /** Maximum size of the text cache */
  maxCacheSize: number;
  /** Whether a processing operation is in progress */
  isProcessing: boolean;
  /** ID of the last Google Sheets submission (null if none) */
  lastSubmissionId: string | null;

  // ==================== PHASE 3: CITATION PROVENANCE SYSTEM 🏆 ====================
  /**
   * All sentence chunks with coordinates for citation tracking
   * Each chunk has a global index [0], [1], [2]... for AI citation
   * Nobel-worthy reproducible research provenance!
   */
  textChunks: TextChunk[];
  /**
   * Citation map for fast lookup: index → {sentence, page, coordinates}
   * Enables clickable citations that jump to exact source location
   */
  citationMap: CitationMap;
  /**
   * Currently highlighted citation index (null if none active)
   * Used for visual highlighting and scrolling
   */
  activeCitationIndex: number | null;
  /**
   * Citation indices from the last AI operation
   * Used to display citation badges in UI
   */
  lastAICitations?: number[];
  /**
   * Context description for the last AI operation with citations
   * e.g., "PICO-T Extraction", "Summary Generation"
   */
  lastAIContext?: string;

  // ==================== NEW: FIGURE & TABLE EXTRACTION 🖼️📊 ====================
  /**
   * Extracted figures from PDF using operator interception
   * Each figure includes data URL, dimensions, and extraction metadata
   */
  extractedFigures?: any[];
  /**
   * Extracted tables from PDF using geometric detection
   * Each table includes headers, rows, column positions, and bounding box
   */
  extractedTables?: any[];

  // ==================== NEW: TEXT STRUCTURE (SECTIONS & PARAGRAPHS) 📚 ====================
  /**
   * Structured sections detected from PDF (Abstract, Methods, Results, etc.)
   * Each section contains paragraph IDs and sentence indices
   */
  sections?: Section[];
  /**
   * Structured paragraphs grouped from sentence chunks
   * Each paragraph contains sentence indices and bounding box
   */
  paragraphs?: Paragraph[];
  /**
   * Map from chunk index to paragraph ID for fast lookup
   */
  chunkIndexToParagraphId?: Map<number, number>;
  /**
   * Map from paragraph ID to section ID for fast lookup
   */
  paragraphIdToSectionId?: Map<number, number>;
}

// Re-export citation types for convenience
export type { TextChunk, Citation, CitationMap, BoundingBox, AIResponse } from '../services/CitationService';
// Re-export text structure types for convenience
export type { Section, Paragraph, StructuredText } from '../services/TextStructureService';

// ==================== VALIDATION TYPES ====================

/**
 * Validation types for form inputs.
 */
export type ValidationType = 'doi' | 'pmid' | 'year' | 'number' | 'text';

/**
 * Result of input validation.
 */
export interface ValidationResult {
  /** Whether the input is valid */
  valid: boolean;
  /** Error message if validation failed (optional) */
  message?: string;
}

// ==================== STATUS TYPES ====================

/**
 * Status message types for user notifications.
 */
export type StatusType = 'success' | 'warning' | 'error' | 'info';

// ==================== MANAGER TYPES ====================

/**
 * Event listener registration for memory management.
 */
export interface EventListenerRegistration {
  /** DOM element with the listener */
  el: HTMLElement | Document | Window;
  /** Event type (e.g., 'click', 'keydown') */
  type: string;
  /** Event handler function */
  handler: EventListener;
}

// ==================== DYNAMIC FIELD TYPES ====================

/**
 * Types of dynamic fields that can be added to the form.
 */
export type DynamicFieldType =
  | 'indication'
  | 'intervention'
  | 'arm'
  | 'mortality'
  | 'mrs'
  | 'complication'
  | 'predictor';

/**
 * Surgical intervention types.
 */
export type SurgicalType = 'SDC_EVD' | 'SDC_ALONE' | 'EVD_ALONE' | '';

// ==================== WINDOW EXTENSIONS ====================

/**
 * Window interface extensions are now in window.d.ts
 * Import that file for global Window type definitions
 */
