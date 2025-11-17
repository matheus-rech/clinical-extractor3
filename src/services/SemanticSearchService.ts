/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SemanticSearchService - Intelligent context-aware search for PDF content
 * 
 * Provides semantic search capabilities that go beyond simple text matching:
 * - TF-IDF scoring for relevance ranking
 * - Context-aware result grouping
 * - Synonym and related term matching
 * - Fuzzy matching for typo tolerance
 * - Search history and suggestions
 */

import AppStateManager from '../state/AppStateManager';
import type { TextChunk, Citation } from './CitationService';

export interface SemanticSearchResult {
    chunkIndex: number;
    text: string;
    pageNum: number;
    score: number;
    context: string;
    matchType: 'exact' | 'fuzzy' | 'semantic';
    highlights: Array<{ start: number; end: number }>;
    bbox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface SearchOptions {
    fuzzyThreshold?: number;      // 0-1, default 0.8
    maxResults?: number;           // default 50
    contextWindow?: number;        // chars before/after, default 100
    includeHeadings?: boolean;     // default true
    semanticExpansion?: boolean;   // expand with related terms, default true
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;
    
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - (distance / maxLen);
}

/**
 * Calculate TF-IDF score for a term in a document
 */
/**
 * Build an inverted index mapping terms to document indices
 */
function buildInvertedIndex(allDocuments: string[]): Map<string, Set<number>> {
    const invertedIndex = new Map<string, Set<number>>();
    allDocuments.forEach((text, idx) => {
        const words = text.toLowerCase().split(/\s+/);
        words.forEach(word => {
            if (!invertedIndex.has(word)) {
                invertedIndex.set(word, new Set());
            }
            invertedIndex.get(word)!.add(idx);
        });
    });
    return invertedIndex;
}

/**
 * Calculate TF-IDF score for a term in a document using an inverted index
 */
function calculateTFIDF(
    term: string,
    document: string,
    allDocuments: string[],
    invertedIndex: Map<string, Set<number>>
): number {
    const termCount = (document.toLowerCase().match(new RegExp(term.toLowerCase(), 'g')) || []).length;
    const tf = termCount / document.split(/\s+/).length;

    const docsWithTerm = invertedIndex.get(term.toLowerCase())?.size || 0;
    const idf = Math.log(allDocuments.length / (docsWithTerm + 1));

    return tf * idf;
}

/**
 * Extract context around a match
 */
function extractContext(text: string, matchStart: number, matchEnd: number, windowSize: number): string {
    const start = Math.max(0, matchStart - windowSize);
    const end = Math.min(text.length, matchEnd + windowSize);
    
    let context = text.substring(start, end);
    
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
}

/**
 * Find all occurrences of a pattern in text
 */
function findMatches(text: string, query: string): Array<{ start: number; end: number }> {
    const matches: Array<{ start: number; end: number }> = [];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    let pos = 0;
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
        matches.push({ start: pos, end: pos + query.length });
        pos += query.length;
    }
    
    return matches;
}

/**
 * Expand query with medical synonyms and related terms
 */
function expandQuery(query: string): string[] {
    const medicalSynonyms: { [key: string]: string[] } = {
        'stroke': ['cerebrovascular accident', 'cva', 'brain attack', 'cerebral infarction'],
        'hemorrhage': ['bleeding', 'haemorrhage', 'hematoma', 'haematoma'],
        'surgery': ['surgical', 'operation', 'procedure', 'intervention'],
        'patient': ['subject', 'participant', 'case', 'individual'],
        'outcome': ['result', 'prognosis', 'endpoint', 'consequence'],
        'mortality': ['death', 'fatality', 'survival', 'deceased'],
        'morbidity': ['complication', 'adverse event', 'side effect'],
        'treatment': ['therapy', 'management', 'intervention', 'care'],
        'diagnosis': ['diagnostic', 'identification', 'detection'],
        'study': ['trial', 'research', 'investigation', 'analysis'],
    };

    const terms = [query];
    const lowerQuery = query.toLowerCase();

    if (medicalSynonyms[lowerQuery]) {
        terms.push(...medicalSynonyms[lowerQuery]);
    }

    // Removed overly broad synonym expansion logic to prevent unintended matches

    return [...new Set(terms)]; // Remove duplicates
}

export const SemanticSearchService = {
    searchHistory: [] as string[],
    currentResults: [] as SemanticSearchResult[],

    /**
     * Perform semantic search across text chunks
     */
    search: async (
        query: string,
        options: SearchOptions = {}
    ): Promise<SemanticSearchResult[]> => {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const {
            fuzzyThreshold = 0.8,
            maxResults = 50,
            contextWindow = 100,
            includeHeadings = true,
            semanticExpansion = true,
        } = options;

        const state = AppStateManager.getState();
        const textChunks = state.textChunks || [];

        if (textChunks.length === 0) {
            console.warn('No text chunks available for semantic search');
            return [];
        }

        if (!SemanticSearchService.searchHistory.includes(query)) {
            SemanticSearchService.searchHistory.push(query);
            if (SemanticSearchService.searchHistory.length > 20) {
                SemanticSearchService.searchHistory.shift();
            }
        }

        const searchTerms = semanticExpansion ? expandQuery(query) : [query];

        const results: SemanticSearchResult[] = [];
        const allTexts = textChunks.map(c => c.text);
        const invertedIndex = buildInvertedIndex(allTexts);

        for (const chunk of textChunks) {
            if (!includeHeadings && chunk.isHeading) {
                continue;
            }

            let bestScore = 0;
            let bestMatchType: 'exact' | 'fuzzy' | 'semantic' = 'exact';
            let bestMatches: Array<{ start: number; end: number }> = [];

            for (const term of searchTerms) {
                const exactMatches = findMatches(chunk.text, term);
                if (exactMatches.length > 0) {
                    const tfidfScore = calculateTFIDF(term, chunk.text, allTexts, invertedIndex);
                    const score = tfidfScore * 10 + exactMatches.length * 2;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatchType = term === query ? 'exact' : 'semantic';
                        bestMatches = exactMatches;
                    }
                }

                if (term.split(/\s+/).length === 1 && exactMatches.length === 0) {
                    const words = chunk.text.split(/\s+/);
                    let offset = 0;
                    for (let i = 0; i < words.length; i++) {
                        const rawWord = words[i];
                        const word = rawWord.replace(/[^\w]/g, '');
                        const similarity = calculateSimilarity(term, word);
                        
                        // Find the position of this word instance starting from offset
                        const wordStart = chunk.text.indexOf(rawWord, offset);
                        if (wordStart !== -1) {
                            const wordEnd = wordStart + rawWord.length;
                            offset = wordEnd + 1; // Move offset past this word and the following space

                            if (similarity >= fuzzyThreshold) {
                                const score = similarity * 5;
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestMatchType = 'fuzzy';
                                    bestMatches = [{ start: wordStart, end: wordEnd }];
                                }
                            }
                        }
                    }
                }
            }

            if (bestScore > 0 && bestMatches.length > 0) {
                const firstMatch = bestMatches[0];
                const context = extractContext(
                    chunk.text,
                    firstMatch.start,
                    firstMatch.end,
                    contextWindow
                );

                results.push({
                    chunkIndex: chunk.index,
                    text: chunk.text,
                    pageNum: chunk.pageNum,
                    score: bestScore,
                    context,
                    matchType: bestMatchType,
                    highlights: bestMatches,
                    bbox: chunk.bbox,
                });
            }
        }

        results.sort((a, b) => b.score - a.score);
        const limitedResults = results.slice(0, maxResults);

        SemanticSearchService.currentResults = limitedResults;

        return limitedResults;
    },

    /**
     * Get search suggestions based on history and content
     */
    getSuggestions: (partialQuery: string): string[] => {
        if (!partialQuery || partialQuery.length < 2) {
            return SemanticSearchService.searchHistory.slice(-5).reverse();
        }

        const lowerQuery = partialQuery.toLowerCase();
        
        const historySuggestions = SemanticSearchService.searchHistory
            .filter(h => h.toLowerCase().includes(lowerQuery))
            .slice(-5)
            .reverse();

        const commonTerms = [
            'stroke', 'hemorrhage', 'surgery', 'patient', 'outcome',
            'mortality', 'treatment', 'diagnosis', 'complication'
        ];
        
        const termSuggestions = commonTerms
            .filter(t => t.toLowerCase().includes(lowerQuery))
            .slice(0, 3);

        return [...new Set([...historySuggestions, ...termSuggestions])];
    },

    /**
     * Clear search history
     */
    clearHistory: (): void => {
        SemanticSearchService.searchHistory = [];
    },

    /**
     * Get current results
     */
    getCurrentResults: (): SemanticSearchResult[] => {
        return SemanticSearchService.currentResults;
    },

    /**
     * Clear current results
     */
    clearResults: (): void => {
        SemanticSearchService.currentResults = [];
    },
};

export default SemanticSearchService;
