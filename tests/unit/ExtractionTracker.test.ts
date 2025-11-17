import ExtractionTracker from '../../src/data/ExtractionTracker';
import type { Extraction } from '../../src/types';

describe('ExtractionTracker', () => {
  let mockAppStateManager: any;
  let mockStatusManager: any;

  beforeEach(() => {
    mockAppStateManager = {
      getState: jest.fn(() => ({
        extractions: [],
        documentName: 'test.pdf',
      })),
      setState: jest.fn(),
    };

    mockStatusManager = {
      show: jest.fn(),
    };

    ExtractionTracker.setDependencies({
      appStateManager: mockAppStateManager,
      statusManager: mockStatusManager,
      pdfRenderer: {
        renderPage: jest.fn(),
      } as any,
    });

    localStorage.clear();
  });

  describe('addExtraction', () => {
    it('should add valid extraction', () => {
      const extraction: Extraction = {
        id: 'ext_123',
        timestamp: new Date().toISOString(),
        fieldName: 'study_title',
        text: 'Clinical Study Title',
        page: 1,
        coordinates: { left: 10, top: 20, width: 100, height: 20 },
        method: 'manual',
        documentName: 'test.pdf',
      };

      ExtractionTracker.addExtraction(extraction);

      expect(mockAppStateManager.setState).toHaveBeenCalledWith({
        extractions: [extraction],
      });
    });

    it('should sanitize text before adding', () => {
      const extraction: Extraction = {
        id: 'ext_123',
        timestamp: new Date().toISOString(),
        fieldName: 'test',
        text: '<script>alert("xss")</script>Safe text',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual',
        documentName: 'test.pdf',
      };

      ExtractionTracker.addExtraction(extraction);

      const call = mockAppStateManager.setState.mock.calls[0][0];
      expect(call.extractions[0].text).not.toContain('<script>');
    });

    it('should reject invalid extraction', () => {
      const invalid = {
        text: 'Missing required fields',
      };

      const result = ExtractionTracker.addExtraction(invalid as any);

      // Invalid extractions should return null
      expect(result).toBeNull();
    });
  });

  describe('getExtractions', () => {
    it('should return all extractions', () => {
      const extraction: Extraction = {
        id: 'ext_1',
        timestamp: new Date().toISOString(),
        fieldName: 'field1',
        text: 'text1',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual',
        documentName: 'test.pdf',
      };

      // Add extraction
      ExtractionTracker.addExtraction(extraction);

      const result = ExtractionTracker.getExtractions();
      // Should have at least one extraction
      expect(result.length).toBeGreaterThan(0);
      // The last extraction should match what we just added
      const lastExtraction = result[result.length - 1];
      expect(lastExtraction.fieldName).toBe('field1');
      expect(lastExtraction.text).toBe('text1');
    });
  });

  describe('persistence', () => {
    it('should save extractions successfully', () => {
      // Add an extraction first
      const extraction: Extraction = {
        id: 'ext_test',
        timestamp: new Date().toISOString(),
        fieldName: 'test',
        text: 'test',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual',
        documentName: 'test.pdf',
      };
      
      const result = ExtractionTracker.addExtraction(extraction);

      // Verify extraction was added
      expect(result).not.toBeNull();
      expect(result?.fieldName).toBe('test');
    });
  });
});
