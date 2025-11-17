import AppStateManager from '../../src/state/AppStateManager';

describe('AppStateManager', () => {
  beforeEach(() => {
    // Reset to a clean state using the public API
    AppStateManager.setState({
      pdfDoc: null,
      currentPage: 1,
      totalPages: 0,
      scale: 1.5,
      documentName: '',
      activeField: null,
      activeFieldElement: null,
      currentStep: 0,
      totalSteps: 8,
      isProcessing: false,
      extractions: [],
      searchMarkers: [],
      pdfTextCache: new Map(),
      markdownContent: '',
      markdownLoaded: false,
      textChunks: [],
      citationMap: {},
      activeCitationIndex: null,
      extractedFigures: [],
      extractedTables: [],
    });
  });

  describe('getState', () => {
    it('should return a deep copy of state', () => {
      const state1 = AppStateManager.getState();
      const state2 = AppStateManager.getState();
      
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
      expect(state1.extractions).not.toBe(state2.extractions);
    });

    it('should clone Map objects correctly', () => {
      AppStateManager.setState({
        pdfTextCache: new Map([[1, { fullText: 'test', items: [] }]]),
      });

      const state = AppStateManager.getState();
      expect(state.pdfTextCache.get(1)).toEqual({ fullText: 'test', items: [] });
    });
  });

  describe('setState', () => {
    it('should merge partial state updates', () => {
      AppStateManager.setState({ currentPage: 5 });
      expect(AppStateManager.getState().currentPage).toBe(5);
      expect(AppStateManager.getState().scale).toBe(1.5);
    });

    it('should notify subscribers on state change', () => {
      const callback = jest.fn();
      AppStateManager.subscribe(callback);

      AppStateManager.setState({ currentPage: 3 });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ currentPage: 3 })
      );
    });

    it('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      AppStateManager.subscribe(callback1);
      AppStateManager.subscribe(callback2);

      AppStateManager.setState({ isProcessing: true });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = AppStateManager.subscribe(callback);

      AppStateManager.setState({ currentPage: 2 });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      AppStateManager.setState({ currentPage: 3 });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('mutex pattern', () => {
    it('should prevent concurrent operations with isProcessing flag', () => {
      expect(AppStateManager.getState().isProcessing).toBe(false);

      AppStateManager.setState({ isProcessing: true });
      expect(AppStateManager.getState().isProcessing).toBe(true);

      AppStateManager.setState({ isProcessing: false });
      expect(AppStateManager.getState().isProcessing).toBe(false);
    });
  });
});
