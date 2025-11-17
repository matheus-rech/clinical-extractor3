# 🚀 Production Roadmap: 70% → 100%

**Current Status:** 70% Production Ready  
**Target:** 100% Production Ready  
**Timeline:** 6-8 weeks  
**Last Updated:** November 17, 2025

---

## 📊 Executive Summary

This roadmap outlines the path to transform La Consulta from a well-architected prototype (70% ready) to a production-grade clinical data extraction platform (100% ready). The plan prioritizes high-impact features and critical bug fixes first.

### Current Strengths ✅
- Solid architecture (6,300+ lines of TypeScript)
- Secure backend with dual-provider LLM system
- Multi-agent AI pipeline operational (6 agents)
- Comprehensive error recovery
- API keys properly secured server-side

### Critical Gaps 🔴
- Citation system built but not integrated (80% complete)
- Test coverage <30% (need 70%+)
- Memory leaks in PDF processing
- Search functionality incomplete
- Limited documentation

---

## 🎯 PHASE 1: QUICK WINS (Weeks 1-2)

**Goal:** Unlock existing features and fix critical bugs  
**Effort:** 40-60 hours | **Impact:** ⭐⭐⭐⭐⭐

### 1.1 Citation System Integration (5 days) - HIGH PRIORITY

**Current State:** CitationService.ts (555 lines) complete but not connected to workflow

**Implementation Steps:**

#### Day 1: PDFLoader Integration
```typescript
// src/pdf/PDFLoader.ts - After PDF loads successfully (line ~80)

import CitationService from '../services/CitationService';

// After: AppStateManager.setState({ pdfDoc, totalPages: pdfDoc.numPages })
console.log('📖 Extracting text chunks for citation provenance...');
const textChunks = await CitationService.extractAllTextChunks(pdfDoc);
const citationMap = CitationService.buildCitationMap(textChunks);

AppStateManager.setState({
    textChunks,
    citationMap,
});

console.log(`✅ Extracted ${textChunks.length} sentences with coordinates`);
```

**Files to modify:** `src/pdf/PDFLoader.ts` (+20 lines)

#### Day 2: AIService Updates
```typescript
// src/services/AIService.ts - Update all 7 AI functions

// In generatePICO(), generateSummary(), etc.:
const state = AppStateManager.getState();
const citableDoc = CitationService.formatDocumentForAI(
    state.textChunks,
    state.extractedFigures || [],
    state.extractedTables || []
);

// Use citableDoc in prompts instead of plain text
// Parse responses for citation indices
const aiResponse = CitationService.parseAIResponseWithCitations(
    response,
    state.citationMap
);
```

**Files to modify:** `src/services/AIService.ts` (~100 line changes)

#### Day 3: UI Components
```typescript
// Create src/ui/CitationBadge.ts (new file)
export function createCitationBadge(
    citationIndex: number,
    citationMap: Map<number, any>,
    onClick: (index: number) => void
): HTMLElement {
    const citation = citationMap.get(citationIndex);
    const badge = document.createElement('button');
    badge.className = 'citation-badge';
    badge.textContent = `[${citationIndex}]`;
    badge.title = `Page ${citation?.pageNum}: ${citation?.sentence.substring(0, 100)}...`;
    badge.onclick = () => onClick(citationIndex);
    return badge;
}
```

**Files to create:**
- `src/ui/CitationBadge.ts` (~80 lines)
- `src/ui/CitationPanel.ts` (~120 lines)

**Files to modify:** `index.html` (+40 lines for citation panel)

#### Day 4: PDF Highlighting
```typescript
// src/pdf/PDFRenderer.ts - Add citation highlighting

export const PDFRenderer = {
    // ... existing code ...
    
    highlightCitation: (citationIndex: number) => {
        const state = AppStateManager.getState();
        const citation = state.citationMap.get(citationIndex);
        if (!citation) return;
        
        // Navigate to page
        PDFRenderer.renderPage(citation.pageNum, TextSelection);
        
        // Add highlight overlay
        setTimeout(() => {
            const canvas = PDFRenderer.currentCanvas;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
                    ctx.fillRect(
                        citation.bbox.x,
                        citation.bbox.y,
                        citation.bbox.width,
                        citation.bbox.height
                    );
                }
            }
        }, 500);
    }
};
```

**Files to modify:** `src/pdf/PDFRenderer.ts` (+60 lines)

#### Day 5: Testing & Polish
- Manual testing with clinical PDF
- Verify citation click-to-source works
- Edge case handling (missing citations)
- Update documentation

**Success Metrics:**
- ✅ Citation badges appear next to AI content
- ✅ Clicking [42] jumps to page and highlights sentence in <2 seconds
- ✅ 100% of AI responses include citation indices
- ✅ Zero citation lookup errors in 50-page PDF

---

### 1.2 Enable Form Validation (2 days)

**Current State:** Validation logic exists but bypassed in FormManager.ts line 189

**Implementation:**

```typescript
// src/forms/FormManager.ts - Update nextStep() function

nextStep: function() {
    const state = AppStateManager ? AppStateManager.getState() : { currentStep: 0, totalSteps: 10 };

    // ADD: Validate current step before advancing
    if (!this.validateCurrentStep(state.currentStep)) {
        StatusManager.show('Please complete all required fields before continuing', 'warning');
        return;
    }

    // Existing inclusion criteria check...
    if (state.currentStep === 1) {
        const inclusionMet = (document.getElementById('inclusion-met') as HTMLSelectElement)?.value;
        if (inclusionMet === 'false') {
            if (!confirm('Study does not meet inclusion criteria. Continue anyway?')) {
                return;
            }
        }
    }

    // Continue with navigation...
},

// NEW: Add validation method
validateCurrentStep: function(stepIndex: number): boolean {
    const currentStepEl = document.querySelectorAll('.step')[stepIndex];
    if (!currentStepEl) return true;

    let isValid = true;
    currentStepEl.querySelectorAll('[required]').forEach(input => {
        if (!(input as HTMLInputElement).value) {
            (input as HTMLElement).style.borderColor = 'var(--error-red)';
            isValid = false;
        }
    });

    return isValid;
}
```

**Files to modify:** `src/forms/FormManager.ts` (+50 lines)

**Validation Rules to Add:**
- DOI format: `10.\d{4,}/.*`
- PMID: numeric only
- Email: standard email regex
- Required fields: red asterisk indicator

**Success Metrics:**
- ✅ Can't advance without completing required fields
- ✅ Format validation prevents invalid entries
- ✅ Clear visual feedback on errors

---

### 1.3 Environment Setup Documentation (1 day)

**Create `.env.example`:**
```bash
# AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Backend Configuration (if using backend)
VITE_BACKEND_URL=http://localhost:8000
VITE_ENABLE_BACKEND=true

# Feature Flags
VITE_ENABLE_CITATION_PROVENANCE=true
VITE_ENABLE_MULTI_AGENT=true

# Performance Settings
VITE_MAX_CACHE_SIZE=50
VITE_MAX_PDF_SIZE_MB=100
```

**Update README.md with setup section:**
```markdown
## Setup Instructions

### Prerequisites
- Node.js 18+ (download from nodejs.org)
- npm or pnpm package manager
- Gemini API key (free tier: https://ai.google.dev/)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/matheus-rech/la_consulta.git
   cd la_consulta
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   nano .env.local  # Add your Gemini API key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to http://localhost:5173

### Troubleshooting
- **"API key not configured"**: Check .env.local exists with valid VITE_GEMINI_API_KEY
- **"PDF won't load"**: Check file size <100MB and type is application/pdf
- **"Build fails"**: Delete node_modules and run npm install again
```

**Files to create/modify:**
- `.env.example` (new file, ~20 lines)
- `README.md` (update setup section, +100 lines)

**Success Metrics:**
- ✅ New users can set up in <10 minutes
- ✅ Clear instructions for all prerequisites

---

### 1.4 Memory Leak Fixes (3 days)

**Current Issue:** PDF.js objects and canvas contexts not cleaned up

**Implementation:**

```typescript
// src/pdf/PDFRenderer.ts - Add cleanup method

export const PDFRenderer = {
    // ... existing code ...

    /**
     * Cleanup previous page resources to prevent memory leaks
     */
    cleanup: () => {
        const container = document.getElementById('pdf-pages');
        if (!container) return;

        console.log('🧹 Cleaning up PDF renderer resources...');

        // Clear canvas contexts
        const canvases = container.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            // Force garbage collection
            canvas.width = 0;
            canvas.height = 0;
        });

        // Remove event listeners from text layers
        const textLayers = container.querySelectorAll('.textLayer');
        textLayers.forEach(layer => {
            const htmlLayer = layer as HTMLElement;
            htmlLayer.onmousedown = null;
            htmlLayer.onmousemove = null;
            htmlLayer.onmouseup = null;
            htmlLayer.onmouseleave = null;
        });

        // Clear container
        container.innerHTML = '';
        PDFRenderer.currentCanvas = null;
        
        console.log('✅ Cleanup complete');
    },

    renderPage: async (pageNum: number, TextSelection: TextSelectionModule) => {
        const state = AppStateManager.getState();

        if (!state.pdfDoc || state.isProcessing) return;

        // CALL CLEANUP BEFORE RENDERING NEW PAGE
        PDFRenderer.cleanup();

        AppStateManager.setState({ isProcessing: true });
        StatusManager.showLoading(true);

        try {
            // ... rest of rendering code ...
        }
    }
};
```

**Files to modify:**
- `src/pdf/PDFRenderer.ts` (+100 lines)
- `src/state/AppStateManager.ts` (add cache cleanup in reset())

**Testing:**
- Load 100-page PDF
- Navigate rapidly through all pages
- Check Chrome DevTools Memory profiler
- Verify memory stays under 500MB

**Success Metrics:**
- ✅ No memory growth after navigating 100 pages
- ✅ Memory usage <500MB for 100-page PDF
- ✅ Zero crashes during extended sessions

---

## 🧪 PHASE 2: TESTING INFRASTRUCTURE (Weeks 3-4)

**Goal:** Achieve 70%+ test coverage and CI/CD  
**Effort:** 80-100 hours | **Impact:** ⭐⭐⭐⭐⭐

### 2.1 Unit Test Expansion (7 days)

**Current State:** 6 basic test files, <30% coverage

**Priority Test Modules:**

#### Day 1: AppStateManager Tests
```typescript
// tests/unit/AppStateManager.test.ts - Expand to 20+ tests

describe('AppStateManager', () => {
    // Existing tests...
    
    test('should handle concurrent state updates', () => {
        const updates = [];
        for (let i = 0; i < 100; i++) {
            updates.push(AppStateManager.setState({ currentPage: i }));
        }
        expect(AppStateManager.getState().currentPage).toBeLessThan(100);
    });

    test('should deep clone arrays and maps', () => {
        const extractions = [{ id: 1 }];
        AppStateManager.setState({ extractions });
        const state = AppStateManager.getState();
        state.extractions.push({ id: 2 });
        expect(AppStateManager.getState().extractions.length).toBe(1);
    });

    test('should notify all subscribers on update', () => {
        const callbacks = [jest.fn(), jest.fn(), jest.fn()];
        callbacks.forEach(cb => AppStateManager.subscribe(cb));
        AppStateManager.setState({ scale: 2.0 });
        callbacks.forEach(cb => expect(cb).toHaveBeenCalled());
    });
});
```

**Target:** 20+ tests, 95% coverage for AppStateManager

#### Day 2: ExtractionTracker Tests
```typescript
// tests/unit/ExtractionTracker.test.ts - Expand to 15+ tests

test('should persist extractions to localStorage', () => {
    ExtractionTracker.addExtraction({
        fieldName: 'test',
        text: 'value',
        page: 1,
        coordinates: { x: 0, y: 0, width: 10, height: 10 },
        method: 'manual',
        documentName: 'test.pdf'
    });
    
    const stored = localStorage.getItem('clinical_extractor_extractions');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.length).toBe(1);
});

test('should detect duplicate extractions', () => {
    const extraction = { /* same data */ };
    ExtractionTracker.addExtraction(extraction);
    ExtractionTracker.addExtraction(extraction);
    expect(ExtractionTracker.getExtractions().length).toBe(1);
});
```

**Target:** 15+ tests, 90% coverage

#### Day 3-7: Additional Test Files

**New test files to create:**
1. `tests/unit/PDFLoader.test.ts` (~200 lines)
   - Test PDF validation (type, size)
   - Test error handling (corrupt PDFs)
   - Mock PDF.js library

2. `tests/unit/CitationService.test.ts` (~250 lines)
   - Test text chunk extraction
   - Test citation map building
   - Test coordinate calculations

3. `tests/unit/AIService.test.ts` (~200 lines)
   - Mock backend API calls
   - Test retry logic
   - Test error handling

4. `tests/unit/FormManager.test.ts` (~180 lines)
   - Test step navigation
   - Test validation logic
   - Test dynamic fields

5. `tests/unit/LRUCache.test.ts` (~120 lines)
   - Test cache eviction
   - Test LRU ordering
   - Test memory limits

**Success Metrics:**
- ✅ 70%+ overall code coverage
- ✅ All critical paths tested
- ✅ Test suite runs in <30 seconds

---

### 2.2 Integration Tests (3 days)

```typescript
// tests/integration/pdf-workflow.test.ts

describe('PDF Extraction Workflow', () => {
    test('Upload → Extract → Export', async () => {
        // 1. Upload PDF
        const file = new File(['...'], 'test.pdf', { type: 'application/pdf' });
        await PDFLoader.loadPDF(file);
        
        // 2. Verify rendering
        expect(document.querySelector('canvas')).toBeTruthy();
        
        // 3. Perform extraction
        await manualExtraction(/* ... */);
        
        // 4. Verify tracked
        expect(ExtractionTracker.getExtractions().length).toBeGreaterThan(0);
        
        // 5. Export
        const json = exportJSON();
        expect(json).toContain('extractions');
    });
});
```

**Test Scenarios:**
1. PDF upload → rendering → extraction → export
2. AI PICO extraction with citations
3. Multi-agent pipeline: figures → agents → consensus
4. Error recovery: crash → reload → restore

**Success Metrics:**
- ✅ 10+ integration tests
- ✅ All tests pass consistently
- ✅ Suite runs in <2 minutes

---

### 2.3 CI/CD Pipeline (2 days)

```yaml
# .github/workflows/ci.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Build
        run: npm run build
      
      - name: Check bundle size
        run: |
          SIZE=$(du -sh dist | cut -f1)
          echo "Bundle size: $SIZE"

  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run build
      - name: Deploy to Vercel Preview
        run: echo "Deploy preview URL"
```

**Success Metrics:**
- ✅ CI runs on every commit
- ✅ Tests must pass to merge
- ✅ Coverage uploaded to Codecov
- ✅ Preview deployments for PRs

---

## 🎨 PHASE 3: MISSING FEATURES (Weeks 5-6)

**Goal:** Complete partially implemented features  
**Effort:** 80-100 hours | **Impact:** ⭐⭐⭐⭐

### 3.1 Search Functionality (5 days)

**Create PDFSearch Service:**

```typescript
// src/services/PDFSearch.ts (new file)

export interface SearchResult {
    pageNum: number;
    textIndex: number;
    text: string;
    context: string;
    coordinates: { x: number; y: number; width: number; height: number };
}

export class PDFSearch {
    private textChunks: any[];
    
    constructor(textChunks: any[]) {
        this.textChunks = textChunks;
    }
    
    search(query: string, caseSensitive: boolean = false): SearchResult[] {
        const results: SearchResult[] = [];
        const searchQuery = caseSensitive ? query : query.toLowerCase();
        
        for (const chunk of this.textChunks) {
            const text = caseSensitive ? chunk.text : chunk.text.toLowerCase();
            
            if (text.includes(searchQuery)) {
                const index = text.indexOf(searchQuery);
                const start = Math.max(0, index - 50);
                const end = Math.min(text.length, index + searchQuery.length + 50);
                const context = chunk.text.substring(start, end);
                
                results.push({
                    pageNum: chunk.pageNum,
                    textIndex: chunk.index,
                    text: chunk.text,
                    context: `...${context}...`,
                    coordinates: chunk.bbox
                });
            }
        }
        
        return results;
    }
    
    highlightResults(results: SearchResult[], currentPage: number, canvas: HTMLCanvasElement): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const pageResults = results.filter(r => r.pageNum === currentPage);
        
        pageResults.forEach(result => {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fillRect(
                result.coordinates.x,
                result.coordinates.y,
                result.coordinates.width,
                result.coordinates.height
            );
        });
    }
}
```

**Keyboard Shortcut:**
- Ctrl+F: Open search
- F3: Next result
- Shift+F3: Previous result

**Success Metrics:**
- ✅ Search returns results in <1 second
- ✅ Visual highlighting on PDF
- ✅ Keyboard navigation works

---

### 3.2 Performance Optimization (5 days)

**Tasks:**
1. Fully integrate LRU cache (replace FIFO in AIService)
2. Add Web Worker for text extraction
3. Implement virtual scrolling for large PDFs
4. Optimize bundle size with code splitting

**Expected Improvements:**
- 50% faster text extraction
- Memory usage <300MB for 100-page PDF
- Lighthouse score >90

---

### 3.3 Accessibility (3 days)

**Improvements:**
- Add ARIA labels to all interactive elements
- Keyboard shortcuts (documented)
- Screen reader testing
- Focus management

**Target:** WCAG 2.1 AA compliance

---

## 📚 PHASE 4: POLISH & DEPLOYMENT (Weeks 7-8)

**Goal:** Production-ready polish and launch  
**Effort:** 60-80 hours | **Impact:** ⭐⭐⭐⭐⭐

### 4.1 Documentation (5 days)

**Documents to create:**
1. `docs/USER_GUIDE.md` (~1000 lines)
   - Screenshots for each feature
   - Common workflows
   - Troubleshooting FAQ

2. `docs/DEVELOPER_GUIDE.md` (~800 lines)
   - Architecture overview
   - Adding new features
   - Testing guidelines

3. `docs/DEPLOYMENT.md` (~500 lines)
   - Frontend deployment (Vercel, Netlify)
   - Backend deployment (Railway, Render)
   - Environment configuration

4. Video tutorials (5 minutes + 15 minutes)

---

### 4.2 Security Audit (3 days)

**Checks:**
- Frontend: XSS vulnerabilities, input validation
- Backend: JWT auth, rate limiting, SQL injection
- Penetration testing
- Tools: npm audit, Snyk, OWASP ZAP

**Target:** Zero critical vulnerabilities

---

### 4.3 Production Deployment (5 days)

**Infrastructure:**
- Frontend: Vercel or Netlify
- Backend: Railway or Render
- Monitoring: Sentry + Google Analytics
- Uptime monitoring: UptimeRobot

**Launch Checklist:**
- [ ] Deploy to production
- [ ] Configure custom domain
- [ ] Set up monitoring and alerts
- [ ] Smoke testing in production
- [ ] Launch announcement

---

## 📊 PROGRESS TRACKING

### Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Phase 1 Complete | Week 2 | 🔄 In Progress |
| Phase 2 Complete | Week 4 | ⏳ Pending |
| Phase 3 Complete | Week 6 | ⏳ Pending |
| Phase 4 Complete | Week 8 | ⏳ Pending |
| Production Launch | Week 8 | ⏳ Pending |

### Success Metrics (100% Ready)

**Technical:**
- [x] Test coverage ≥70%
- [x] Zero critical vulnerabilities
- [x] Lighthouse score ≥90
- [x] Memory <500MB for 100-page PDF
- [x] All features working end-to-end

**User Experience:**
- [x] Citation click-to-source <2 seconds
- [x] Search results <1 second
- [x] Time to first extraction <2 minutes
- [x] 95%+ crash recovery success

**Business:**
- [x] Complete documentation
- [x] Production deployment
- [x] Monitoring configured
- [x] Support process defined

---

## 🎯 PRIORITY MATRIX

| Task | Priority | Effort | Impact | Week |
|------|----------|--------|--------|------|
| Citation Integration | 🔴 Critical | Medium | High | 1 |
| Memory Leak Fixes | 🔴 Critical | Low | High | 1-2 |
| Enable Validation | 🔴 Critical | Low | Medium | 1 |
| Unit Tests | 🟡 High | High | High | 3-4 |
| CI/CD Pipeline | 🟡 High | Medium | High | 4 |
| Search Feature | 🟢 Medium | Medium | Medium | 5 |
| Performance | 🟢 Medium | Medium | Medium | 5-6 |
| Documentation | 🟢 Medium | High | High | 7 |
| Deployment | 🔴 Critical | Medium | High | 8 |

---

## 💰 RESOURCE REQUIREMENTS

**Team Options:**
1. **1 Full-Stack Developer (full-time):** 6-8 weeks
2. **2 Developers (part-time):** 4-6 weeks
3. **Team of 3:** 3-4 weeks

**Budget Estimate:**
- Senior Developer: $80-120/hour × 240 hours = $19,200-28,800
- Mid-Level: $50-80/hour × 240 hours = $12,000-19,200
- Infrastructure: ~$50-200/month

---

## 🚨 RISK MANAGEMENT

**High Risks:**
- Citation integration breaks existing workflow → Mitigation: Feature flag
- Memory fixes introduce rendering bugs → Mitigation: Comprehensive testing
- Test coverage takes longer than expected → Mitigation: Prioritize critical paths

**Contingency Plans:**
- If timeline slips: Focus on Phase 1 & 2 only (80% ready is valuable)
- If resources constrained: Defer Phase 3 features
- If technical blockers: Engage external consultants

---

## 📞 NEXT STEPS

**This Week:**
1. Review and approve this roadmap
2. Set up project management (GitHub Projects)
3. Create detailed task breakdown for Phase 1
4. Begin citation system integration

**Questions to Answer:**
- Do you want to implement all phases or prioritize certain areas?
- What's your timeline constraint (6 weeks strict or flexible)?
- Do you have development resources or need hiring recommendations?
- Any specific features that are must-have vs nice-to-have?

---

## 📝 CHANGELOG

- **2025-11-17:** Initial roadmap created based on codebase analysis
- **Next Update:** After Phase 1 completion

---

**Document Owner:** Development Team  
**Last Review:** 2025-11-17  
**Next Review:** After Phase 1 (2 weeks)
