/**
 * SearchService - Full-text search functionality for PDF content
 * 
 * Provides fast text search across PDF pages with highlighting support.
 */

import AppStateManager from '../state/AppStateManager';
import type { SearchMarker } from '../types';

export interface SearchResult {
    page: number;
    text: string;
    context: string;
    index: number;
    coordinates?: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
}

export const SearchService = {
    currentQuery: '',
    currentResults: [] as SearchResult[],
    currentIndex: -1,

    /**
     * Search for text across all PDF pages
     */
    search: async (query: string): Promise<SearchResult[]> => {
        if (!query || query.trim().length === 0) {
            SearchService.clearSearch();
            return [];
        }

        const state = AppStateManager.getState();
        if (!state.pdfDoc) {
            console.warn('No PDF document loaded');
            return [];
        }

        SearchService.currentQuery = query.toLowerCase();
        SearchService.currentResults = [];

        const pdfDoc = state.pdfDoc as any;
        const totalPages = state.totalPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                const page = await pdfDoc.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');

                const lowerPageText = pageText.toLowerCase();
                let startIndex = 0;

                while (true) {
                    const index = lowerPageText.indexOf(SearchService.currentQuery, startIndex);
                    
                    if (index === -1) break;

                    const contextStart = Math.max(0, index - 50);
                    const contextEnd = Math.min(pageText.length, index + SearchService.currentQuery.length + 50);
                    const context = pageText.substring(contextStart, contextEnd);

                    SearchService.currentResults.push({
                        page: pageNum,
                        text: pageText.substring(index, index + SearchService.currentQuery.length),
                        context: context,
                        index: SearchService.currentResults.length,
                    });

                    startIndex = index + 1;
                }
            } catch (error) {
                console.error(`Error searching page ${pageNum}:`, error);
            }
        }

        if (SearchService.currentResults.length > 0) {
            SearchService.currentIndex = 0;
        }

        return SearchService.currentResults;
    },

    /**
     * Navigate to next search result
     */
    nextResult: (): SearchResult | null => {
        if (SearchService.currentResults.length === 0) {
            return null;
        }

        SearchService.currentIndex = (SearchService.currentIndex + 1) % SearchService.currentResults.length;
        return SearchService.currentResults[SearchService.currentIndex];
    },

    /**
     * Navigate to previous search result
     */
    previousResult: (): SearchResult | null => {
        if (SearchService.currentResults.length === 0) {
            return null;
        }

        SearchService.currentIndex = 
            (SearchService.currentIndex - 1 + SearchService.currentResults.length) % 
            SearchService.currentResults.length;
        
        return SearchService.currentResults[SearchService.currentIndex];
    },

    /**
     * Get current search result
     */
    getCurrentResult: (): SearchResult | null => {
        if (SearchService.currentIndex === -1 || SearchService.currentResults.length === 0) {
            return null;
        }

        return SearchService.currentResults[SearchService.currentIndex];
    },

    /**
     * Clear search results and markers
     */
    clearSearch: (): void => {
        SearchService.currentQuery = '';
        SearchService.currentResults = [];
        SearchService.currentIndex = -1;

        const state = AppStateManager.getState();
        const markers = state.searchMarkers;

        markers.forEach(marker => {
            if (marker.element && marker.element.parentNode) {
                marker.element.parentNode.removeChild(marker.element);
            }
        });

        AppStateManager.setState({ searchMarkers: [] });
    },

    /**
     * Highlight search results on current page
     */
    highlightResults: (pageNum: number): void => {
        const resultsOnPage = SearchService.currentResults.filter(r => r.page === pageNum);
        
        if (resultsOnPage.length === 0) {
            return;
        }

        const textLayer = document.querySelector('.textLayer');
        if (!textLayer) {
            return;
        }

        const markers: SearchMarker[] = [];

        resultsOnPage.forEach(result => {
            const spans = textLayer.querySelectorAll('span');
            
            spans.forEach(span => {
                const spanText = span.textContent?.toLowerCase() || '';
                
                if (spanText.includes(SearchService.currentQuery)) {
                    const marker = document.createElement('div');
                    marker.className = 'search-marker';
                    marker.style.position = 'absolute';
                    marker.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
                    marker.style.border = '1px solid rgba(255, 200, 0, 0.8)';
                    marker.style.pointerEvents = 'none';

                    const rect = span.getBoundingClientRect();
                    const layerRect = textLayer.getBoundingClientRect();

                    marker.style.left = (rect.left - layerRect.left) + 'px';
                    marker.style.top = (rect.top - layerRect.top) + 'px';
                    marker.style.width = rect.width + 'px';
                    marker.style.height = rect.height + 'px';

                    textLayer.appendChild(marker);

                    markers.push({
                        element: marker,
                        page: pageNum
                    });
                }
            });
        });

        AppStateManager.setState({ searchMarkers: markers });
    },

    /**
     * Get search statistics
     */
    getStats: (): {
        query: string;
        totalResults: number;
        currentIndex: number;
        hasResults: boolean;
    } => {
        return {
            query: SearchService.currentQuery,
            totalResults: SearchService.currentResults.length,
            currentIndex: SearchService.currentIndex,
            hasResults: SearchService.currentResults.length > 0,
        };
    },
};

export default SearchService;
