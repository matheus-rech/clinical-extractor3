/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CitationBadge Component
 * 
 * Creates clickable citation badges [42] that:
 * - Show sentence preview on hover
 * - Navigate to source page on click
 * - Highlight source text on PDF
 * - Visual feedback on interaction
 * 
 * Part of the Nobel Prize Citation Provenance System 🏆
 */

import type { CitationMap } from '../services/CitationService';

/**
 * Create a citation badge element
 * 
 * @param citationIndex - The citation index number (e.g., 42)
 * @param citationMap - Map of all citations
 * @param onClick - Callback when badge is clicked
 * @returns HTMLElement - The badge button element
 */
export function createCitationBadge(
    citationIndex: number,
    citationMap: CitationMap,
    onClick: (index: number) => void
): HTMLElement {
    const citation = citationMap[citationIndex];
    
    // If citation doesn't exist, return empty span
    if (!citation) {
        console.warn(`⚠️ Citation [${citationIndex}] not found in map`);
        const emptySpan = document.createElement('span');
        emptySpan.className = 'citation-badge-error';
        emptySpan.textContent = `[${citationIndex}?]`;
        emptySpan.title = 'Citation not found';
        return emptySpan;
    }
    
    // Create badge button
    const badge = document.createElement('button');
    badge.className = 'citation-badge';
    badge.textContent = `[${citationIndex}]`;
    badge.setAttribute('data-citation-index', citationIndex.toString());
    badge.setAttribute('data-page-num', citation.pageNum.toString());
    
    // Tooltip with sentence preview
    const preview = citation.sentence.length > 100
        ? citation.sentence.substring(0, 100) + '...'
        : citation.sentence;
    badge.title = `Page ${citation.pageNum}: "${preview}"`;
    
    // Click handler
    badge.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(citationIndex);
        
        // Visual feedback
        badge.classList.add('citation-badge-active');
        setTimeout(() => {
            badge.classList.remove('citation-badge-active');
        }, 2000);
    };
    
    // Hover effects (handled by CSS)
    badge.onmouseenter = () => {
        badge.classList.add('citation-badge-hover');
    };
    
    badge.onmouseleave = () => {
        badge.classList.remove('citation-badge-hover');
    };
    
    return badge;
}

/**
 * Create multiple citation badges as a group
 * 
 * @param citationIndices - Array of citation indices
 * @param citationMap - Map of all citations
 * @param onClick - Callback when any badge is clicked
 * @returns HTMLElement - Container with all badges
 */
export function createCitationBadgeGroup(
    citationIndices: number[],
    citationMap: CitationMap,
    onClick: (index: number) => void
): HTMLElement {
    const container = document.createElement('span');
    container.className = 'citation-badge-group';
    
    if (!citationIndices || citationIndices.length === 0) {
        return container;
    }
    
    // Add each badge
    citationIndices.forEach((index, i) => {
        const badge = createCitationBadge(index, citationMap, onClick);
        container.appendChild(badge);
        
        // Add space between badges (except last)
        if (i < citationIndices.length - 1) {
            container.appendChild(document.createTextNode(' '));
        }
    });
    
    return container;
}

/**
 * Append citation badges to a form field
 * 
 * @param fieldElement - The input/textarea element
 * @param citationIndices - Array of citation indices
 * @param citationMap - Map of all citations
 * @param onClick - Callback when any badge is clicked
 */
export function appendCitationBadgesToField(
    fieldElement: HTMLInputElement | HTMLTextAreaElement,
    citationIndices: number[],
    citationMap: CitationMap,
    onClick: (index: number) => void
): void {
    if (!fieldElement || !citationIndices || citationIndices.length === 0) {
        return;
    }
    
    // Find or create badge container next to field
    const fieldContainer = fieldElement.parentElement;
    if (!fieldContainer) return;
    
    // Remove old badges if they exist
    const oldBadges = fieldContainer.querySelector('.citation-badge-group');
    if (oldBadges) {
        oldBadges.remove();
    }
    
    // Create new badge group
    const badgeGroup = createCitationBadgeGroup(citationIndices, citationMap, onClick);
    
    // Add badge group after the field
    fieldElement.insertAdjacentElement('afterend', badgeGroup);
}

/**
 * Clear citation badges from a field
 * 
 * @param fieldElement - The input/textarea element
 */
export function clearCitationBadges(fieldElement: HTMLInputElement | HTMLTextAreaElement): void {
    if (!fieldElement) return;
    
    const fieldContainer = fieldElement.parentElement;
    if (!fieldContainer) return;
    
    const badges = fieldContainer.querySelectorAll('.citation-badge-group');
    badges.forEach(badge => badge.remove());
}

/**
 * Clear all citation badges from the document
 */
export function clearAllCitationBadges(): void {
    const allBadges = document.querySelectorAll('.citation-badge-group');
    allBadges.forEach(badge => badge.remove());
}

/**
 * Export default object with all badge functions
 */
export default {
    createCitationBadge,
    createCitationBadgeGroup,
    appendCitationBadgesToField,
    clearCitationBadges,
    clearAllCitationBadges,
};
