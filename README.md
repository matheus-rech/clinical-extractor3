<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Clinical Extractor

A web-based clinical data extraction platform for systematic review of medical research papers, with a focus on neurosurgical literature.

**Latest Updates (Day 1-2 - November 2025):**
- ✅ Citation UI integration complete (6 new Window API functions)
- ✅ TypeScript compilation errors fixed (11 → 0 errors)
- ✅ Production-ready status: 85% (Citation system complete, TypeScript errors resolved)

## Features

- **PDF Processing**: Upload and render medical research PDFs with interactive text layers
- 🏆 **Sentence-Level Citation Provenance** - Complete citation tracking with [0], [1], [2] indexing for reproducible research and AI fact-checking
- **Multi-Agent AI Pipeline**: 6 specialized medical research agents (Study Design Expert, Patient Data Specialist, Surgical Expert, Outcomes Analyst, Neuroimaging Specialist, Table Extractor)
- **Manual & AI Extraction**: Extract data through mouse selection or AI-powered analysis
- **Multiple Export Formats**: JSON, CSV, Excel, HTML audit reports, Google Sheets integration
- **Error Recovery**: Automatic crash detection and session recovery

View your app in AI Studio: https://ai.studio/apps/drive/1DFFjaDptqv2f27UHIzLdxSc0rrZszk0G

## 🏆 Citation Provenance System - Quick Start

The Clinical Extractor includes a complete sentence-level citation tracking system for reproducible medical research:

**How it works:**

1. **Document Processing**: Every sentence gets a unique index [0], [1], [2]...
2. **AI Analysis**: AI extracts data with citations: "Study had 150 patients [3]"
3. **Verification**: Click citation [3] to jump to source sentence in PDF with highlighting
4. **Export**: All extractions include source coordinates for audit trails

**Quick Demo:**

```javascript
// Load PDF and process for citations
await processPDFForCitations();

// AI extraction returns indexed data
const aiResponse = "Mean age was 65 years [7], mortality 15% [12]";

// Jump to and verify any citation
jumpToCitation(7);  // Highlights source sentence in PDF
```

**See full guide:** [CITATION_SYSTEM_GUIDE.md](CITATION_SYSTEM_GUIDE.md)

## Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **Gemini API Key** - Get your free key at [https://ai.google.dev/](https://ai.google.dev/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/matheus-rech/la_consulta.git
   cd la_consulta
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Usage

1. **Upload a PDF**: Click "Choose PDF File" and select a medical research paper
2. **Extract Data**: Use manual selection (click and drag) or AI-powered extraction
3. **Fill Form**: Navigate through the 8-step extraction wizard
4. **Export**: Download as JSON, CSV, Excel, or submit to Google Sheets

## Architecture

The application consists of 6 major components (35 TypeScript modules including CitationPanel and CitationBadge UI components):

1. **Application Initialization** (`src/main.ts`) - Dependency injection and orchestration (58 Window API functions)
2. **PDF Pipeline** (`src/pdf/`) - PDF.js-based rendering and text extraction
3. **AI Service** (`src/services/AIService.ts`) - 7 Gemini AI functions with retry logic
4. **Multi-Agent System** (`src/services/AgentOrchestrator.ts`) - Specialized medical agents
5. **Citation System** (`src/services/CitationService.ts`) - Sentence-level provenance tracking
6. **Data Management** (`src/data/ExtractionTracker.ts`) - Audit trails and persistence
7. **Error Handling** (`src/utils/errorBoundary.ts`) - Crash recovery system

## Development

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
```

## Documentation

- [Citation System Guide](CITATION_SYSTEM_GUIDE.md) - Sentence-level citation provenance system
- [Improvement Strategy](docs/Clinical_Extractor_Improvement_Strategy.md) - Comprehensive roadmap for production readiness
- [Multi-Agent Pipeline](MULTI_AGENT_PIPELINE_COMPLETE.md) - AI agent architecture
- [AI Service Architecture](AI_SERVICE_ARCHITECTURE.md) - Gemini API integration details

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -m "Add feature"`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a Pull Request

## License

Apache-2.0

## Support

For issues and questions, please open a GitHub issue.
