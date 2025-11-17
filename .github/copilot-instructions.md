# La Consulta: AI Assistant Instructions

## Project Overview

**La Consulta** is a medical research data extraction platform that combines PDF processing with multi-agent AI to extract structured clinical data. The system features a TypeScript frontend (Vite), Python FastAPI backend, and 6 specialized medical AI agents for neurosurgical literature analysis.

## Core Architecture Patterns

### 1. Dependency Injection & Module Orchestration
The app uses strict dependency injection in `main.ts` to avoid circular dependencies:

```typescript
// Services require dependencies injected before use
ExtractionTracker.setDependencies({
    appStateManager: AppStateManager,
    statusManager: StatusManager,
    pdfRenderer: PDFRenderer
});

FormManager.setDependencies({
    appStateManager: AppStateManager,
    statusManager: StatusManager,
    dynamicFields: DynamicFields
});
```

**When adding new services**: Always check if they need dependency injection and follow this pattern.

### 2. Global State via Observer Pattern
`AppStateManager` is a singleton that manages all application state. Use it instead of component-level state:

```typescript
import AppStateManager from './state/AppStateManager';

// Reading state
const state = AppStateManager.getState();

// Updating state  
AppStateManager.setState({ isProcessing: true });

// Subscribing to changes
AppStateManager.subscribe((newState) => {
    // React to state changes
});
```

### 3. Error Boundary & Recovery System
The app has comprehensive crash recovery. All async operations must follow this pattern:

```typescript
try {
    AppStateManager.setState({ isProcessing: true });
    StatusManager.show('Processing...', 'info');
    
    // Your operation here
    const result = await someAsyncOperation();
    
    StatusManager.show('Success!', 'success');
} catch (error) {
    console.error('Operation failed:', error);
    StatusManager.show(`Error: ${error.message}`, 'error');
} finally {
    AppStateManager.setState({ isProcessing: false });
}
```

## Key Services & Their Responsibilities

### AI & Processing
- `AIService.ts` - 7 Gemini AI functions (PICO, summary, validation, etc.)
- `AgentOrchestrator.ts` - Multi-agent pipeline coordinator (6 medical specialists)
- `MedicalAgentBridge.ts` - Gemini-based medical research agents
- `CitationService.ts` - Enterprise-grade citation provenance system
- `SemanticSearchService.ts` - TF-IDF search with fuzzy matching

### PDF & Data Extraction
- `PDFLoader.ts` - PDF.js integration with validation
- `PDFRenderer.ts` - Canvas rendering with bounding box overlays
- `TextSelection.ts` - Manual text extraction with coordinates
- `FigureExtractor.ts` - PDF operator interception for images
- `TableExtractor.ts` - Geometric table detection via Y/X clustering

### Backend Integration
- `BackendClient.ts` - Direct Python FastAPI communication
- `BackendProxyService.ts` - Robust API calls with retry, caching, rate limiting
- `AuthManager.ts` - JWT authentication management

### Data & Forms
- `ExtractionTracker.ts` - Audit trail with coordinate-level provenance
- `FormManager.ts` - 8-step wizard with validation (currently disabled)
- `DynamicFields.ts` - 7 dynamic add/remove functions for clinical fields

## Development Workflow Commands

```bash
# Development
npm run dev                # Start dev server (port 3000)
npm run build              # Production build  
npm run preview            # Preview production build

# Testing
npm test                   # Run Jest test suite
npm run test:watch         # Watch mode for TDD
npm run test:coverage      # Coverage report

# Type checking
npm run lint               # TypeScript compilation check
npx tsc --noEmit           # Manual type check
npx tsc src/path/file.ts --noEmit  # Check specific file
```

## Backend Integration Patterns

The app supports both **frontend-only** and **backend-enabled** modes:

### Frontend-Only Mode (Default)
```typescript
// Direct Gemini API calls from browser
import { generatePICO } from './services/AIService';
await generatePICO();  // Uses VITE_GEMINI_API_KEY from .env.local
```

### Backend-Enabled Mode
```typescript
// Proxy through Python FastAPI backend
import BackendClient from './services/BackendClient';
await BackendClient.generatePICO(documentId, text);  // Dual-provider LLM with fallback
```

**Backend advantages**: Dual-provider LLM system (Gemini + Claude fallback), server-side API key security, rate limiting.

## Critical File Patterns

### Environment Configuration
All environment variables must be prefixed with `VITE_` for frontend access:
```bash
# .env.local (required)
VITE_GEMINI_API_KEY=your_api_key_here
VITE_BACKEND_URL=http://localhost:8000  # Optional
VITE_ENABLE_BACKEND=true  # Optional feature flag
```

### Window API Exposure
The app exposes 40+ functions globally for HTML onclick handlers:
```typescript
// main.ts - All functions exposed via window.ClinicalExtractor
window.ClinicalExtractor = {
    generatePICO,
    exportJSON, 
    addAnnotation,
    semanticSearch,
    // ... 36 more functions
};
```

### PDF.js Configuration
PDF.js requires specific worker setup in `main.ts`:
```typescript
window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
```

## Multi-Agent AI Pipeline

The system routes content to 6 specialized medical agents based on pattern matching:

```typescript
// Content classification examples
'patient_demographics' → ['PatientDataSpecialistAgent', 'TableExtractorAgent']
'surgical_procedures' → ['SurgicalExpertAgent', 'TableExtractorAgent'] 
'outcomes_statistics' → ['OutcomesAnalystAgent', 'TableExtractorAgent']
'neuroimaging_data' → ['NeuroimagingSpecialistAgent', 'TableExtractorAgent']
'study_methodology' → ['StudyDesignExpertAgent', 'TableExtractorAgent']
```

All agents use `gemini-2.0-flash-thinking-exp-1219` for complex clinical reasoning, except TableExtractorAgent which uses `gemini-2.0-flash-exp` for fast validation.

## Citation Provenance System

The app implements sentence-level citation tracking:

```typescript
// 1. Process PDF into indexed format
const result = await CitationService.processPDFDocument(pdfDoc);
// Result: "[0] First sentence. [1] Second sentence..."

// 2. AI responds with citations
// "The study had 150 patients [3] with mean age 65 years [7]..."

// 3. Extract and verify citations
const citations = CitationService.extractCitations(aiResponse);
const source = result.citationMap["3"];  // Get source location

// 4. Visual highlighting in PDF
CitationService.highlightCitation(3, result.citationMap);
```

**Key principle**: Every AI extraction must include citation indices for reproducible research.

## Testing & Quality Patterns

### Test Structure
- **Unit tests**: `tests/unit/` - Service-level testing with mocks
- **Integration tests**: `tests/e2e/` - End-to-end workflow testing
- **Setup**: `tests/setup.ts` - Jest configuration with jsdom

### Performance Considerations
- **Memory**: Use `LRUCache` for expensive computations
- **APIs**: Use `CircuitBreaker` for external service calls
- **Cleanup**: Register event listeners with `MemoryManager` for auto-cleanup
- **PDFs**: Limit text cache to 50 pages, call `PDFRenderer.cleanup()` between pages

### Security Requirements
- **Input sanitization**: Always use `security.ts` utils for user input
- **XSS prevention**: Never directly inject user content into HTML
- **API keys**: Store in environment variables, never in code

## Common Gotchas & Solutions

### TypeScript Issues
- **Circular dependencies**: Use dependency injection pattern
- **Module not found**: Check imports are relative (`./` not `@/`)
- **Type errors**: Interfaces are in `src/types/index.ts`

### PDF Processing Issues  
- **Memory leaks**: Call `PDFRenderer.cleanup()` before rendering new pages
- **Large files**: Check file size limits (<100MB)
- **Worker errors**: Verify PDF.js worker URL is accessible

### State Management Issues
- **Stuck processing**: Check `isProcessing` flag in state, reset in finally blocks
- **Lost data**: `ExtractionTracker` auto-saves to localStorage
- **Broken navigation**: Form validation is disabled in `FormManager.ts` lines 676-703

### AI/API Issues
- **429 errors**: Backend has automatic fallback to Claude
- **No responses**: Check API keys in .env.local
- **Slow performance**: Use backend proxy for caching and retry logic

## Adding New Features

### New AI Function
1. Add to `AIService.ts` with proper error handling
2. Export from service  
3. Add to Window API in `main.ts`
4. Test with sample PDF

### New Service
1. Create in `src/services/`
2. Follow naming: `[Feature]Service.ts`
3. Add dependency injection if needed
4. Write unit tests in `tests/unit/`

### New Form Step
1. Add HTML in `index.html` with class `step`
2. Increment `totalSteps` in AppState interface  
3. Add dynamic fields in `DynamicFields.ts` if needed
4. Link with class `linked-input` for auto-binding

Remember: This codebase prioritizes **reproducible medical research** through comprehensive audit trails, citation provenance, and multi-agent validation. Every feature should support the goal of extracting verifiable clinical data.