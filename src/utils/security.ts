/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Extraction, ValidationResult, ExtractionMethod } from '../types';
import { EXTRACTION_METHODS } from '../types';

/**
 * Security utilities for sanitizing inputs, validating data, and encoding/decoding
 */
const SecurityUtils = {
  /**
   * Sanitize text by removing HTML tags and limiting length
   * @param text - The text to sanitize
   * @returns Sanitized text string
   */
  sanitizeText: (text: string | null | undefined): string => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    // Basic sanitization: remove tags, trim, limit length
    return div.innerHTML.replace(/<[^>]*>?/gm, '').trim().substring(0, 10000);
  },

  /**
   * Validate an extraction object has required fields
   * @param extraction - The extraction object to validate
   * @returns True if extraction is valid
   */
  validateExtraction: (extraction: any): extraction is Extraction => {
    return (
      extraction &&
      extraction.fieldName &&
      extraction.text &&
      extraction.coordinates &&
      extraction.page >= 0 && // Page 0 for AI
      extraction.method &&
      typeof extraction.method === 'string' &&
      EXTRACTION_METHODS.includes(extraction.method as ExtractionMethod)
    );
  },

  /**
   * Escape HTML special characters in text
   * @param text - The text to escape
   * @returns HTML-escaped text
   */
  escapeHtml: (text: any): string => {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Validate input field based on its validation type
   * @param input - The input element to validate
   * @returns Validation result with valid flag and optional message
   */
  validateInput: (input: HTMLElement): ValidationResult => {
    const validationType = (input as HTMLInputElement).dataset.validation;
    const value = (input as HTMLInputElement).value.trim();

    if ((input as HTMLInputElement).required && !value) {
      return { valid: false, message: 'This field is required' };
    }

    if (validationType === 'doi' && value) {
      const doiRegex = /^10\.\d{4,}\/-?[A-Za-z0-9._;()/:]+$/; // Accepts some special characters
      if (!doiRegex.test(value)) {
        return { valid: false, message: 'Invalid DOI format' };
      }
    }

    if (validationType === 'pmid' && value) {
      if (!/^\d+$/.test(value)) {
        return { valid: false, message: 'PMID must be numeric' };
      }
    }

    if (validationType === 'year' && value) {
      const year = parseInt(value);
      if (isNaN(year) || year < 1900 || year > 2100) {
        return { valid: false, message: 'Invalid year (1900-2100)' };
      }
    }

    return { valid: true };
  },

  /**
   * Encode data for localStorage (simplified - no actual encryption)
   * @param data - The data object to encode
   * @returns Base64 encoded string
   */
  encodeData: (data: any): string => {
    return btoa(JSON.stringify(data));
  },

  /**
   * Decode data from localStorage
   * @param encodedData - The base64 encoded string
   * @returns Decoded data object
   */
  decodeData: (encodedData: string): any => {
    return JSON.parse(atob(encodedData));
  },
};

export default SecurityUtils;
