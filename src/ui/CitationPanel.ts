/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CitationPanel Component
 * 
 * Displays a panel with all citations from the last AI operation:
 * - Shows citation count and context
 * - Lists all citation badges
 * - Groups citations by page
 * - Shows sentence preview
 * - Click to navigate and highlight
 * 
 * Part of the Nobel Prize Citation Provenance System 🏆
 */

import type { CitationMap } from '../services/CitationService';
import { createCitationBadge } from './CitationBadge';
import PDFRenderer from '../pdf/PDFRenderer';
import TextSelection from '../pdf/TextSelection';

/**
 * Citation panel state
 */
interface CitationPanelState {
    isVisible: boolean;
    currentPreviewIndex: number | null;
}

const panelState: CitationPanelState = {
    isVisible: false,
    currentPreviewIndex: null,
};

/**
 * Show the citation panel with citations from the last AI operation
 * 
 * @param citationIndices - Array of citation indices to display
 * @param citationMap - Map of all citations
 * @param context - Context description (e.g., "PICO-T Extraction")
 */
export function showCitationPanel(
    citationIndices: number[],
    citationMap: CitationMap,
    context: string = 'AI Extraction'
): void {
    const panel = document.getElementById('citation-panel');
    if (!panel) {
        console.warn('⚠️ Citation panel element not found in DOM');
        return;
    }
    
    if (!citationIndices || citationIndices.length === 0) {
        console.log('ℹ️ No citations to display');
        panel.style.display = 'none';
        panelState.isVisible = false;
        return;
    }
    
    // Clear existing content
    panel.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'citation-panel-header';
    header.innerHTML = `
        <h4>📚 Supporting Citations (${citationIndices.length})</h4>
        <p class="citation-context">${context}</p>
        <button class="citation-panel-close" id="citation-panel-close">×</button>
    `;
    panel.appendChild(header);
    
    // Group citations by page
    const citationsByPage = groupCitationsByPage(citationIndices, citationMap);
    
    // Create badge list
    const badgeList = document.createElement('div');
    badgeList.className = 'citation-badge-list';
    
    Object.entries(citationsByPage)
        .sort(([pageA], [pageB]) => parseInt(pageA) - parseInt(pageB))
        .forEach(([pageNum, indices]) => {
            const pageGroup = document.createElement('div');
            pageGroup.className = 'citation-page-group';
            
            const pageLabel = document.createElement('div');
            pageLabel.className = 'citation-page-label';
            pageLabel.textContent = `Page ${pageNum} (${indices.length})`;
            pageGroup.appendChild(pageLabel);
            
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'citation-badges';
            
            indices.forEach(index => {
                const badge = createCitationBadge(index, citationMap, (idx) => {
                    handleCitationClick(idx, citationMap);
                });
                badgeContainer.appendChild(badge);
            });
            
            pageGroup.appendChild(badgeContainer);
            badgeList.appendChild(pageGroup);
        });
    
    panel.appendChild(badgeList);
    
    // Create preview area
    const preview = document.createElement('div');
    preview.className = 'citation-preview';
    preview.id = 'citation-preview';
    preview.innerHTML = '<p class="citation-preview-placeholder">Click a citation to see preview</p>';
    panel.appendChild(preview);
    
    // Show panel
    panel.style.display = 'block';
    panelState.isVisible = true;
    
    // Add close button handler
    const closeBtn = document.getElementById('citation-panel-close');
    if (closeBtn) {
        closeBtn.onclick = () => hideCitationPanel();
    }
    
    console.log(`✅ Citation panel displayed with ${citationIndices.length} citations`);
}

/**
 * Hide the citation panel
 */
export function hideCitationPanel(): void {
    const panel = document.getElementById('citation-panel');
    if (panel) {
        panel.style.display = 'none';
        panelState.isVisible = false;
        panelState.currentPreviewIndex = null;
    }
}

/**
 * Toggle citation panel visibility
 */
export function toggleCitationPanel(): void {
    if (panelState.isVisible) {
        hideCitationPanel();
    } else {
        // Show panel with last citations if available
        // (This would need to get data from AppState)
        console.log('ℹ️ Toggle called - implement with AppStateManager integration');
    }
}

/**
 * Group citations by page number
 * 
 * @param citationIndices - Array of citation indices
 * @param citationMap - Map of all citations
 * @returns Object with pageNum as key and citation indices as value
 */
function groupCitationsByPage(
    citationIndices: number[],
    citationMap: CitationMap
): Record<string, number[]> {
    const grouped: Record<string, number[]> = {};
    
    citationIndices.forEach(index => {
        const citation = citationMap[index];
        if (citation) {
            const pageKey = citation.pageNum.toString();
            if (!grouped[pageKey]) {
                grouped[pageKey] = [];
            }
            grouped[pageKey].push(index);
        }
    });
    
    return grouped;
}

/**
 * Handle citation click - navigate and show preview
 * 
 * @param citationIndex - The clicked citation index
 * @param citationMap - Map of all citations
 */
function handleCitationClick(citationIndex: number, citationMap: CitationMap): void {
    const citation = citationMap[citationIndex];
    if (!citation) {
        console.warn(`⚠️ Citation [${citationIndex}] not found`);
        return;
    }
    
    console.log(`📍 Clicked citation [${citationIndex}] on page ${citation.pageNum}`);
    
    // Update preview
    showCitationPreview(citationIndex, citationMap);
    
    // 🎯 NEW Day 4: Navigate to page and highlight citation
    PDFRenderer.highlightCitation(citationIndex);
}

/**
 * Show preview for a specific citation
 * 
 * @param citationIndex - The citation index to preview
 * @param citationMap - Map of all citations
 */
function showCitationPreview(citationIndex: number, citationMap: CitationMap): void {
    const citation = citationMap[citationIndex];
    if (!citation) return;
    
    const preview = document.getElementById('citation-preview');
    if (!preview) return;
    
    // Update preview content
    preview.innerHTML = `
        <div class="citation-preview-box">
            <div class="citation-preview-header">
                <strong>Citation [${citationIndex}]</strong>
                <span class="citation-preview-page">Page ${citation.pageNum}</span>
            </div>
            <p class="citation-preview-text">"${citation.sentence}"</p>
            <div class="citation-preview-footer">
                <small>Confidence: ${Math.round(citation.confidence * 100)}%</small>
            </div>
        </div>
    `;
    
    // Scroll preview into view
    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    panelState.currentPreviewIndex = citationIndex;
}

/**
 * Update citation panel with new data
 * 
 * @param citationIndices - New citation indices
 * @param citationMap - Map of all citations
 * @param context - Context description
 */
export function updateCitationPanel(
    citationIndices: number[],
    citationMap: CitationMap,
    context: string
): void {
    if (panelState.isVisible) {
        showCitationPanel(citationIndices, citationMap, context);
    }
}

/**
 * Get citation statistics
 * 
 * @param citationIndices - Array of citation indices
 * @param citationMap - Map of all citations
 * @returns Statistics object
 */
export function getCitationStats(
    citationIndices: number[],
    citationMap: CitationMap
): {
    totalCitations: number;
    uniquePages: number;
    averageConfidence: number;
    pageDistribution: Record<number, number>;
} {
    const stats = {
        totalCitations: citationIndices.length,
        uniquePages: 0,
        averageConfidence: 0,
        pageDistribution: {} as Record<number, number>,
    };
    
    if (citationIndices.length === 0) return stats;
    
    const pages = new Set<number>();
    let totalConfidence = 0;
    
    citationIndices.forEach(index => {
        const citation = citationMap[index];
        if (citation) {
            pages.add(citation.pageNum);
            totalConfidence += citation.confidence;
            
            if (!stats.pageDistribution[citation.pageNum]) {
                stats.pageDistribution[citation.pageNum] = 0;
            }
            stats.pageDistribution[citation.pageNum]++;
        }
    });
    
    stats.uniquePages = pages.size;
    stats.averageConfidence = totalConfidence / citationIndices.length;
    
    return stats;
}

/**
 * Export default object with all panel functions
 */
export default {
    showCitationPanel,
    hideCitationPanel,
    toggleCitationPanel,
    updateCitationPanel,
    getCitationStats,
};
