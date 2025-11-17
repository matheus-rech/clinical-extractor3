/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PDFRenderer - Handles PDF page rendering with canvas and text layer
 *
 * This module is responsible for:
 * - Rendering PDF pages to canvas elements
 * - Creating interactive text layers for selection
 * - Managing viewport transformations and scaling
 * - Integrating with text selection and extraction systems
 */

import AppStateManager from '../state/AppStateManager';
import StatusManager from '../utils/status';
import { addExtractionMarkersForPage, clearSearchMarkers } from '../utils/helpers';
import type { TextItem } from '../types';

/**
 * Extended TextItem with position and dimension data for rendering
 */
export interface PDFTextItem {
    /** DOM span element containing the text */
    element: HTMLSpanElement;
    /** X coordinate in viewport space */
    x: number;
    /** Y coordinate in viewport space */
    y: number;
    /** Width in viewport space */
    width: number;
    /** Height in viewport space */
    height: number;
    /** Text content */
    text: string;
}

/**
 * PDF.js text content item from getTextContent()
 */
interface PDFJSTextItem {
    /** Text string */
    str: string;
    /** Transform matrix [scaleX, skewY, skewX, scaleY, translateX, translateY] */
    transform: number[];
    /** Width in PDF coordinate space */
    width: number;
    /** Height in PDF coordinate space */
    height: number;
    /** Text direction (ltr/rtl) */
    dir: string;
}

/**
 * PDF.js text content result
 */
interface PDFJSTextContent {
    /** Array of text items */
    items: PDFJSTextItem[];
}

/**
 * PDF.js page viewport
 */
interface PDFJSViewport {
    /** Viewport width */
    width: number;
    /** Viewport height */
    height: number;
    /** Transform matrix */
    transform: number[];
}

/**
 * PDF.js page object
 */
interface PDFJSPage {
    /** Get viewport with scale */
    getViewport(params: { scale: number }): PDFJSViewport;
    /** Render page to canvas */
    render(params: { canvasContext: CanvasRenderingContext2D | null; viewport: PDFJSViewport }): { promise: Promise<void> };
    /** Get text content */
    getTextContent(): Promise<PDFJSTextContent>;
}

/**
 * PDF.js document object
 */
interface PDFJSDocument {
    /** Get a specific page */
    getPage(pageNum: number): Promise<PDFJSPage>;
}

/**
 * TextSelection module interface (imported dynamically to avoid circular deps)
 */
interface TextSelectionModule {
    enable(textLayer: HTMLElement, textItems: PDFTextItem[], pageNum: number): void;
}

/**
 * PDFRenderer - Main rendering engine
 */
export const PDFRenderer = {
    /** Current canvas element for overlay rendering */
    currentCanvas: null as HTMLCanvasElement | null,

    /** Visualization state */
    showBoundingBoxes: false,
    showTableRegions: false,

    /**
     * Renders a PDF page with canvas and interactive text layer
     *
     * @param pageNum - Page number to render (1-indexed)
     * @param TextSelection - TextSelection module for enabling text selection
     *
     * Process:
     * 1. Validates state and page number
     * 2. Sets processing state and shows loading indicator
     * 3. Retrieves page from PDF.js document
     * 4. Calculates viewport with current scale
     * 5. Creates page container div
     * 6. Renders PDF content to canvas
     * 7. Creates text layer with positioned spans
     * 8. Enables text selection on the layer
     * 9. Adds extraction markers for the page
     * 10. Updates UI state
     * 11. Renders bounding box overlays if enabled
     *
     * @throws Will log error and show status message on failure
     */
    renderPage: async (pageNum: number, TextSelection: TextSelectionModule) => {
        const state = AppStateManager.getState();

        // Validate state
        if (!state.pdfDoc || state.isProcessing) return;

        AppStateManager.setState({ isProcessing: true });
        StatusManager.showLoading(true);

        try {
            // Get page from PDF document
            const page = await (state.pdfDoc as PDFJSDocument).getPage(pageNum);
            const viewport = page.getViewport({ scale: state.scale });

            // Get or create container
            const container = document.getElementById('pdf-pages');
            if (!container) {
                console.error('PDF container not found');
                return;
            }

            // Clear previous page
            container.innerHTML = '';

            // Create page container div
            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page';
            pageDiv.style.width = viewport.width + 'px';
            pageDiv.style.height = viewport.height + 'px';

            // Create and render canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            pageDiv.appendChild(canvas);

            // Create text layer for selection
            const textContent = await page.getTextContent();
            const textLayer = document.createElement('div');
            textLayer.className = 'textLayer';
            const textItems: PDFTextItem[] = [];

            // Process each text item
            textContent.items.forEach(item => {
                // Skip empty text items
                if (!item.str || !item.str.trim()) return;

                // Create span element for text
                const span = document.createElement('span');
                span.textContent = item.str;

                // Set text directionality (ltr/rtl)
                span.dir = item.dir;

                // Disable font ligatures for better selection accuracy
                span.style.fontFeatureSettings = '"liga" 0';

                // Calculate transform using PDF.js utility
                // Transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
                const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);

                // Position the span in viewport coordinates
                // tx[4] = translateX, tx[5] = translateY
                span.style.left = tx[4] + 'px';
                span.style.top = tx[5] + 'px';

                // Calculate font size from scale factors
                // sqrt(scaleX^2 + skewY^2) gives the effective scale
                span.style.fontSize = Math.sqrt((tx[0] * tx[0]) + (tx[1] * tx[1])) + 'px';

                // Store position and size data for bounding box calculations
                span.dataset.x = String(tx[4]);
                span.dataset.y = String(tx[5]);
                span.dataset.width = String(item.width * state.scale);
                span.dataset.height = String(item.height * state.scale);

                textLayer.appendChild(span);

                // Add to text items array with full data
                textItems.push({
                    element: span,
                    x: tx[4],
                    y: tx[5],
                    width: item.width * state.scale,
                    height: item.height * state.scale,
                    text: item.str
                });
            });

            pageDiv.appendChild(textLayer);

            // Enable text selection on the layer
            TextSelection.enable(textLayer, textItems, pageNum);

            // Get extractions from state and add markers
            const extractions = state.extractions;
            addExtractionMarkersForPage(pageNum, extractions);

            // Add page to container
            container.appendChild(pageDiv);

            // Store canvas reference for overlay rendering
            PDFRenderer.currentCanvas = canvas;

            // Update application state
            AppStateManager.setState({ currentPage: pageNum });

            // Update page number input
            const pageNumInput = document.getElementById('page-num') as HTMLInputElement;
            if (pageNumInput) {
                pageNumInput.value = pageNum.toString();
            }

            // Clear any previous search markers
            clearSearchMarkers(state.searchMarkers.map(m => m.element));

            // Render bounding box overlays if enabled
            if (PDFRenderer.showBoundingBoxes) {
                await PDFRenderer.renderBoundingBoxes(page, textItems, state.scale);
            }

        } catch (error) {
            console.error("PDF Render Error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            StatusManager.show(
                `Failed to render page ${pageNum}: ${errorMessage}`,
                'error'
            );
        } finally {
            AppStateManager.setState({ isProcessing: false });
            StatusManager.showLoading(false);
        }
    },

    /**
     * Render bounding boxes over text items for provenance visualization
     *
     * @param page - PDF.js page object
     * @param textItems - Array of text items with coordinates
     * @param scale - Current viewport scale
     *
     * Draws colored rectangles around text items with index labels.
     * Color-coded by extraction status:
     * - Red: Manual extractions
     * - Green: AI extractions
     * - Blue: Standard text
     */
    renderBoundingBoxes: async (page: PDFJSPage, textItems: PDFTextItem[], scale: number) => {
        if (!PDFRenderer.currentCanvas) return;

        const canvas = PDFRenderer.currentCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const state = AppStateManager.getState();
        const viewport = page.getViewport({ scale });

        // Draw bounding box for each text item
        textItems.forEach((item, idx) => {
            // Check if this text was extracted
            const isExtracted = state.extractions.some(ext =>
                ext.text.includes(item.text)
            );

            // Color-code by extraction status
            if (isExtracted) {
                const extraction = state.extractions.find(ext => ext.text.includes(item.text));
                if (extraction?.method === 'manual') {
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';  // Red for manual
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';  // Green for AI
                    ctx.lineWidth = 2;
                }
            } else {
                ctx.strokeStyle = 'rgba(100, 100, 255, 0.3)';  // Blue for standard
                ctx.lineWidth = 1;
            }

            // Draw rectangle
            ctx.strokeRect(item.x, item.y, item.width, item.height);

            // Add index label
            if (isExtracted) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(`[${idx}]`, item.x, item.y - 2);
            }
        });
    },

    /**
     * Render table region overlays
     *
     * @param tables - Array of extracted tables
     * @param scale - Current viewport scale
     *
     * Draws blue outlines around detected tables with column dividers.
     */
    renderTableRegions: (tables: any[], scale: number) => {
        if (!PDFRenderer.currentCanvas) return;

        const canvas = PDFRenderer.currentCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        tables.forEach((table, idx) => {
            const bbox = table.boundingBox;

            // Draw table outline
            ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeRect(
                bbox.x * scale,
                bbox.y * scale,
                bbox.width * scale,
                bbox.height * scale
            );

            // Draw column dividers
            ctx.strokeStyle = 'rgba(0, 100, 255, 0.4)';
            ctx.lineWidth = 1;
            table.columnPositions.forEach((colX: number) => {
                ctx.beginPath();
                ctx.moveTo(colX * scale, bbox.y * scale);
                ctx.lineTo(colX * scale, (bbox.y + bbox.height) * scale);
                ctx.stroke();
            });

            // Add table label
            ctx.fillStyle = 'rgba(0, 100, 255, 0.9)';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(
                `Table ${idx + 1}`,
                bbox.x * scale + 5,
                bbox.y * scale + 20
            );
        });
    },

    /**
     * Toggle bounding box visualization
     */
    toggleBoundingBoxes: () => {
        PDFRenderer.showBoundingBoxes = !PDFRenderer.showBoundingBoxes;
        // Re-render current page to apply changes
        const state = AppStateManager.getState();
        if (state.currentPage) {
            // Trigger re-render (caller should handle this)
            console.log(`Bounding boxes ${PDFRenderer.showBoundingBoxes ? 'enabled' : 'disabled'}`);
        }
    },

    /**
     * Toggle table region visualization
     */
    toggleTableRegions: () => {
        PDFRenderer.showTableRegions = !PDFRenderer.showTableRegions;
        console.log(`Table regions ${PDFRenderer.showTableRegions ? 'enabled' : 'disabled'}`);
    },

    /**
     * Cleanup method to prevent memory leaks
     * 
     * Clears canvas contexts, removes DOM elements, and releases references.
     * Should be called when switching PDFs or unmounting the component.
     */
    cleanup: () => {
        if (PDFRenderer.currentCanvas) {
            const ctx = PDFRenderer.currentCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, PDFRenderer.currentCanvas.width, PDFRenderer.currentCanvas.height);
            }
            PDFRenderer.currentCanvas = null;
        }

        // Clear PDF pages container
        const container = document.getElementById('pdf-pages');
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }

        // Reset visualization state
        PDFRenderer.showBoundingBoxes = false;
        PDFRenderer.showTableRegions = false;

        console.log('PDFRenderer cleanup completed');
    },

    /**
     * Highlight a citation on the PDF
     * Phase 1.1 Day 4: Citation Provenance System 🏆
     * 
     * @param citationIndex - The citation index to highlight
     * 
     * Process:
     * 1. Retrieves citation from map
     * 2. Navigates to page if needed
     * 3. Waits for render to complete
     * 4. Draws yellow highlight rectangle over citation bbox
     * 5. Scrolls citation into view
     */
    highlightCitation: async (citationIndex: number) => {
        const state = AppStateManager.getState();
        
        if (!state.citationMap) {
            console.warn('⚠️ Citation map not available');
            return;
        }

        const citation = state.citationMap[citationIndex];
        
        if (!citation) {
            console.warn(`⚠️ Citation [${citationIndex}] not found in map`);
            return;
        }
        
        console.log(`🎯 Highlighting citation [${citationIndex}] on page ${citation.pageNum}`);
        
        // Store current citation in state
        AppStateManager.setState({ activeCitationIndex: citationIndex });
        
        // Navigate to page if not already there
        const needsNavigation = state.currentPage !== citation.pageNum;
        
        if (needsNavigation) {
            // Need to import TextSelection here - will be passed via window
            const TextSelection = (window as any).TextSelection;
            if (TextSelection) {
                await PDFRenderer.renderPage(citation.pageNum, TextSelection);
            } else {
                console.warn('⚠️ TextSelection module not available');
                return;
            }
        }
        
        // Wait for render to complete, then highlight
        setTimeout(() => {
            const canvas = PDFRenderer.currentCanvas;
            if (!canvas) {
                console.warn('⚠️ Canvas not found for highlighting');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Draw yellow highlight rectangle
            ctx.save();
            ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
            ctx.strokeStyle = '#fbc02d';
            ctx.lineWidth = 2;
            
            const bbox = citation.bbox;
            
            ctx.fillRect(
                bbox.x,
                bbox.y,
                bbox.width,
                bbox.height
            );
            
            ctx.strokeRect(
                bbox.x,
                bbox.y,
                bbox.width,
                bbox.height
            );
            
            ctx.restore();
            
            console.log('✅ Citation highlighted at', bbox);
            
            // Scroll to citation
            PDFRenderer.scrollToCitation(bbox);
        }, needsNavigation ? 500 : 100); // Wait longer if navigating to new page
    },
    
    /**
     * Clear all citation highlights
     * Re-renders the current page to remove overlay graphics
     */
    clearHighlights: async () => {
        const state = AppStateManager.getState();
        
        // Clear active citation
        AppStateManager.setState({ activeCitationIndex: null });
        
        // Re-render current page without highlights
        if (state.currentPage && state.pdfDoc) {
            const TextSelection = (window as any).TextSelection;
            if (TextSelection) {
                await PDFRenderer.renderPage(state.currentPage, TextSelection);
            }
        }
        
        console.log('✅ Citation highlights cleared');
    },
    
    /**
     * Scroll citation into view with smooth animation
     * 
     * @param bbox - Bounding box of the citation
     */
    scrollToCitation: (bbox: { x: number; y: number; width: number; height: number }) => {
        const container = document.getElementById('pdf-container');
        if (!container) {
            console.warn('⚠️ PDF container not found for scrolling');
            return;
        }
        
        // Calculate scroll position (center citation in view)
        const containerHeight = container.clientHeight;
        const scrollTop = bbox.y - (containerHeight / 2) + (bbox.height / 2);
        
        // Smooth scroll to citation
        container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
        });
        
        console.log(`✅ Scrolled to citation at y=${bbox.y}`);
    }
};

export default PDFRenderer;
