/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Text Structure Service
 *
 * Provides functionality to parse PDF text into structured sections and paragraphs.
 * Builds on top of existing sentence-level chunks to provide hierarchical text organization.
 *
 * @module TextStructureService
 */

import type { TextChunk } from '../types';

/**
 * Section metadata
 */
export interface Section {
    id: number;
    label: string;
    paragraphIds: number[];
    pageStart: number;
    pageEnd: number;
    sentenceIndices: number[];
}

/**
 * Paragraph metadata
 */
export interface Paragraph {
    id: number;
    sectionId: number | null;
    text: string;
    sentenceIndices: number[];
    pageStart: number;
    pageEnd: number;
    bboxUnion: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
}

/**
 * Structured text result
 */
export interface StructuredText {
    sections: Section[];
    paragraphs: Paragraph[];
    chunkIndexToParagraphId: Map<number, number>;
    paragraphIdToSectionId: Map<number, number>;
}

/**
 * Common section headings in clinical papers
 */
const SECTION_KEYWORDS = [
    'abstract',
    'background',
    'introduction',
    'methods',
    'materials and methods',
    'methodology',
    'results',
    'findings',
    'discussion',
    'conclusion',
    'conclusions',
    'acknowledgments',
    'acknowledgements',
    'references',
    'bibliography'
];

/**
 * TextStructureService Object
 *
 * Provides methods for building structured text from sentence-level chunks.
 */
const TextStructureService = {
    /**
     * Build structured text (sections and paragraphs) from sentence chunks
     *
     * @param textChunks - Array of sentence-level text chunks
     * @returns Structured text with sections and paragraphs
     */
    build: (textChunks: TextChunk[]): StructuredText => {
        console.log(`📚 Building text structure from ${textChunks.length} sentence chunks...`);
        
        const paragraphs: Paragraph[] = [];
        const sections: Section[] = [];
        const chunkIndexToParagraphId = new Map<number, number>();
        const paragraphIdToSectionId = new Map<number, number>();
        
        let currentParagraphId = 0;
        let currentSectionId = 0;
        let currentSection: Section | null = null;
        
        let i = 0;
        while (i < textChunks.length) {
            const chunk = textChunks[i];
            
            if (TextStructureService.isHeading(chunk)) {
                const sectionLabel = TextStructureService.extractSectionLabel(chunk.text);
                
                currentSection = {
                    id: currentSectionId++,
                    label: sectionLabel,
                    paragraphIds: [],
                    pageStart: chunk.pageNum,
                    pageEnd: chunk.pageNum,
                    sentenceIndices: []
                };
                
                sections.push(currentSection);
                i++;
                continue;
            }
            
            const paragraphChunks = TextStructureService.extractParagraph(textChunks, i);
            
            if (paragraphChunks.length > 0) {
                const paragraph: Paragraph = {
                    id: currentParagraphId++,
                    sectionId: currentSection?.id ?? null,
                    text: paragraphChunks.map(c => c.text).join(' '),
                    sentenceIndices: paragraphChunks.map(c => c.index),
                    pageStart: paragraphChunks[0].pageNum,
                    pageEnd: paragraphChunks[paragraphChunks.length - 1].pageNum,
                    bboxUnion: TextStructureService.calculateBBoxUnion(paragraphChunks)
                };
                
                paragraphs.push(paragraph);
                
                paragraphChunks.forEach(c => {
                    chunkIndexToParagraphId.set(c.index, paragraph.id);
                });
                
                if (currentSection) {
                    currentSection.paragraphIds.push(paragraph.id);
                    currentSection.sentenceIndices.push(...paragraph.sentenceIndices);
                    currentSection.pageEnd = paragraph.pageEnd;
                    paragraphIdToSectionId.set(paragraph.id, currentSection.id);
                }
                
                i += paragraphChunks.length;
            } else {
                i++;
            }
        }
        
        console.log(`✅ Built ${sections.length} sections and ${paragraphs.length} paragraphs`);
        
        return {
            sections,
            paragraphs,
            chunkIndexToParagraphId,
            paragraphIdToSectionId
        };
    },

    /**
     * Check if a text chunk is a heading
     *
     * @param chunk - Text chunk to check
     * @returns True if chunk is likely a heading
     */
    isHeading: (chunk: TextChunk): boolean => {
        if (chunk.isHeading) {
            return true;
        }
        
        if (chunk.fontSize && chunk.fontSize > 14) {
            return true;
        }
        
        const text = chunk.text.trim().toLowerCase();
        
        if (text.length > 100) {
            return false;
        }
        
        return SECTION_KEYWORDS.some(keyword => {
            const pattern = new RegExp(`^${keyword}\\b`, 'i');
            return pattern.test(text);
        });
    },

    /**
     * Extract section label from heading text
     *
     * @param text - Heading text
     * @returns Normalized section label
     */
    extractSectionLabel: (text: string): string => {
        const normalized = text.trim().replace(/[^\w\s]/g, '').toLowerCase();
        
        for (const keyword of SECTION_KEYWORDS) {
            if (normalized.startsWith(keyword)) {
                return keyword.charAt(0).toUpperCase() + keyword.slice(1);
            }
        }
        
        return text.trim().substring(0, 50);
    },

    /**
     * Extract a paragraph starting from the given index
     *
     * @param textChunks - Array of text chunks
     * @param startIndex - Starting index
     * @returns Array of chunks forming a paragraph
     */
    extractParagraph: (textChunks: TextChunk[], startIndex: number): TextChunk[] => {
        const paragraphChunks: TextChunk[] = [];
        let i = startIndex;
        
        while (i < textChunks.length) {
            const chunk = textChunks[i];
            
            if (TextStructureService.isHeading(chunk)) {
                break;
            }
            
            paragraphChunks.push(chunk);
            
            if (i + 1 < textChunks.length) {
                const nextChunk = textChunks[i + 1];
                
                if (TextStructureService.isParagraphBreak(chunk, nextChunk)) {
                    break;
                }
            }
            
            i++;
        }
        
        return paragraphChunks;
    },

    /**
     * Check if there's a paragraph break between two chunks
     *
     * @param chunk1 - First chunk
     * @param chunk2 - Second chunk
     * @returns True if there's a paragraph break
     */
    isParagraphBreak: (chunk1: TextChunk, chunk2: TextChunk): boolean => {
        if (chunk1.pageNum !== chunk2.pageNum) {
            return true;
        }
        
        if (!chunk1.bbox || !chunk2.bbox) {
            return false;
        }
        
        const verticalGap = Math.abs(chunk2.bbox.y - (chunk1.bbox.y + chunk1.bbox.height));
        const lineHeight = chunk1.bbox.height || 12;
        
        if (verticalGap > lineHeight * 1.5) {
            return true;
        }
        
        const horizontalShift = Math.abs(chunk2.bbox.x - chunk1.bbox.x);
        if (horizontalShift > 20) {
            return true;
        }
        
        return false;
    },

    /**
     * Calculate bounding box union for multiple chunks
     *
     * @param chunks - Array of text chunks
     * @returns Union bounding box or null
     */
    calculateBBoxUnion: (chunks: TextChunk[]): { x: number; y: number; width: number; height: number } | null => {
        const validChunks = chunks.filter(c => c.bbox);
        
        if (validChunks.length === 0) {
            return null;
        }
        
        const minX = Math.min(...validChunks.map(c => c.bbox!.x));
        const minY = Math.min(...validChunks.map(c => c.bbox!.y));
        const maxX = Math.max(...validChunks.map(c => c.bbox!.x + c.bbox!.width));
        const maxY = Math.max(...validChunks.map(c => c.bbox!.y + c.bbox!.height));
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
};

export default TextStructureService;
