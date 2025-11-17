/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AIService
 * Handles all Gemini AI integration functions for the Clinical Extractor
 * 
 * ⚠️ SECURITY UPDATE: All AI calls now route through the secure backend API
 * This prevents exposure of the Gemini API key in the frontend code.
 *
 * Includes 7 AI-powered functions:
 * 1. generatePICO() - Extract PICO-T summary (via backend)
 * 2. generateSummary() - Generate key findings summary (via backend)
 * 3. validateFieldWithAI() - Validate field content (via backend)
 * 4. findMetadata() - Search for study metadata (via backend)
 * 5. handleExtractTables() - Extract tables from document (via backend)
 * 6. handleImageAnalysis() - Analyze uploaded images (via backend)
 * 7. handleDeepAnalysis() - Deep document analysis (via backend)
 */

import AppStateManager from '../state/AppStateManager';
import ExtractionTracker from '../data/ExtractionTracker';
import StatusManager from '../utils/status';
import LRUCache from '../utils/LRUCache';
import BackendClient from './BackendClient';
import AuthManager from './AuthManager';
import CitationService from './CitationService';
import CitationPanel from '../ui/CitationPanel';

// ==================== BACKEND CLIENT INITIALIZATION ====================

/**
 * LRU Cache for PDF text with 50-page limit
 */
const pdfTextLRUCache = new LRUCache<number, { fullText: string, items: Array<any> }>(50);

/**
 * Ensure backend authentication before AI calls
 */
async function ensureBackendAuthenticated(): Promise<void> {
    const isAuthenticated = await AuthManager.ensureAuthenticated();
    if (!isAuthenticated) {
        throw new Error('Backend authentication failed. AI features unavailable.');
    }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Gets text content from a specific PDF page, using LRU cache if available.
 * @param {number} pageNum - The page number.
 * @returns {Promise<{fullText: string, items: Array<any>}>}
 */
async function getPageText(pageNum: number): Promise<{ fullText: string, items: Array<any> }> {
    const cached = pdfTextLRUCache.get(pageNum);
    if (cached) {
        return cached;
    }
    
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        throw new Error('No PDF loaded');
    }
    try {
        const page = await state.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        let fullText = '';
        const items: Array<any> = [];
        textContent.items.forEach((item: any) => {
            if (item.str) {
                fullText += item.str + ' ';
                items.push({ text: item.str, transform: item.transform });
            }
        });
        const pageData = { fullText, items };
        pdfTextLRUCache.set(pageNum, pageData);
        return pageData;
    } catch (error) {
        console.error(`Error getting text from page ${pageNum}:`, error);
        return { fullText: '', items: [] };
    }
}

/**
 * Gets all text from the loaded PDF document.
 * @returns {Promise<string|null>} Full text of the document or null if no PDF is loaded.
 */
async function getAllPdfText(): Promise<string | null> {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show("Please load a PDF first.", "warning");
        return null;
    }

    let fullText = "";
    StatusManager.show("Reading full document text...", "info", 60000); // Long timeout
    for (let i = 1; i <= state.totalPages; i++) {
        const pageData = await getPageText(i); // getPageText is already defined and caches
        fullText += pageData.fullText + "\n\n";
    }
    StatusManager.show("Document text reading complete.", "success");
    return fullText;
}



/**
 * Converts a Blob to base64 string
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} - Base64 encoded string
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve((reader.result as string).split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}



// ==================== AI EXTRACTION FUNCTIONS ====================

/**
 * ✨ Generates PICO-T summary using backend API.
 * Securely routes request through backend to protect API key.
 */
async function generatePICO(): Promise<void> {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first.', 'warning');
        return;
    }
    if (state.isProcessing) {
        StatusManager.show('Please wait for the current operation to finish.', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    const loadingEl = document.getElementById('pico-loading');
    if (loadingEl) loadingEl.style.display = 'block';
    StatusManager.show('✨ Analyzing document for PICO-T summary with citation tracking...', 'info');

    try {
        // Ensure backend authentication
        await ensureBackendAuthenticated();

        const documentId = state.documentName || `temp-${Date.now()}`;

        // 🎯 NEW: Use citation-aware document if available
        let documentText: string;
        let useCitations = false;

        if (state.textChunks && state.textChunks.length > 0 && state.citationMap) {
            console.log('📚 Using citation-indexed document format');
            documentText = CitationService.formatDocumentForAI(
                state.textChunks,
                state.extractedFigures || [],
                state.extractedTables || []
            );
            useCitations = true;
        } else {
            console.log('⚠️ Citations not available, using plain text');
            const plainText = await getAllPdfText();
            if (!plainText) {
                throw new Error("Could not read text from the PDF.");
            }
            documentText = plainText;
        }

        // Call backend API with citation-aware document
        const response = await BackendClient.generatePICO(documentId, documentText);
        const data = response; // Backend returns PICO fields directly

        // 🎯 NEW: Parse citations from response if available
        if (useCitations && state.citationMap) {
            try {
                // Try to extract citation indices from response
                const responseText = JSON.stringify(response);
                const aiResponse = CitationService.parseAIResponseWithCitations(
                    responseText,
                    state.citationMap
                );
                
                if (aiResponse.citationIndices.length > 0) {
                    console.log(`✅ Found ${aiResponse.citationIndices.length} citation(s):`, aiResponse.citationIndices);
                    
                    // Store citations in state for UI display
                    AppStateManager.setState({
                        lastAICitations: aiResponse.citationIndices,
                        lastAIContext: 'PICO-T Extraction'
                    });

                    // 🎯 DAY 5: Auto-show citation panel
                    try {
                        CitationPanel.showCitationPanel(
                            aiResponse.citationIndices,
                            state.citationMap,
                            'PICO-T Extraction'
                        );
                        console.log('📚 Citation panel displayed automatically');
                    } catch (panelError) {
                        console.warn('⚠️ Failed to show citation panel:', panelError);
                    }
                } else {
                    console.log('ℹ️ No citations found in AI response');
                }
            } catch (citationError) {
                console.warn('⚠️ Failed to parse citations:', citationError);
                // Continue without citations - non-critical error
            }
        }

        // Populate fields
        const populationField = document.getElementById('eligibility-population') as HTMLInputElement;
        const interventionField = document.getElementById('eligibility-intervention') as HTMLInputElement;
        const comparatorField = document.getElementById('eligibility-comparator') as HTMLInputElement;
        const outcomesField = document.getElementById('eligibility-outcomes') as HTMLInputElement;
        const timingField = document.getElementById('eligibility-timing') as HTMLInputElement;
        const typeField = document.getElementById('eligibility-type') as HTMLInputElement;

        if (populationField) populationField.value = data.population || '';
        if (interventionField) interventionField.value = data.intervention || '';
        if (comparatorField) comparatorField.value = data.comparator || '';
        if (outcomesField) outcomesField.value = data.outcomes || '';
        if (timingField) timingField.value = data.timing || '';
        if (typeField) typeField.value = data.study_type || '';

        // Add to trace log
        const state2 = AppStateManager.getState();
        const coords = { x: 0, y: 0, width: 0, height: 0 }; // AI extractions have no coords
        ExtractionTracker.addExtraction({ fieldName: 'population (AI)', text: data.population, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'intervention (AI)', text: data.intervention, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'comparator (AI)', text: data.comparator, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'outcomes (AI)', text: data.outcomes, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'timing (AI)', text: data.timing, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });
        ExtractionTracker.addExtraction({ fieldName: 'studyType (AI)', text: data.study_type, page: 0, coordinates: coords, method: 'gemini-pico', documentName: state2.documentName });

        StatusManager.show('✨ PICO-T fields auto-populated by AI (via secure backend)!', 'success');

    } catch (error: any) {
        console.error("Backend PICO-T Error:", error);
        StatusManager.show(`AI extraction failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        const loadingEl = document.getElementById('pico-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

/**
 * ✨ Generates a summary of key findings using backend API.
 * Securely routes request through backend to protect API key.
 */
async function generateSummary(): Promise<void> {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first.', 'warning');
        return;
    }
    if (state.isProcessing) {
        StatusManager.show('Please wait for the current operation to finish.', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    const loadingEl = document.getElementById('summary-loading');
    if (loadingEl) loadingEl.style.display = 'block';
    StatusManager.show('✨ Generating summary with citation tracking...', 'info');

    try {
        // Ensure backend authentication
        await ensureBackendAuthenticated();

        const documentId = state.documentName || `temp-${Date.now()}`;

        // 🎯 Use citation-aware document if available
        let documentText: string;
        let useCitations = false;

        if (state.textChunks && state.textChunks.length > 0 && state.citationMap) {
            console.log('📚 Using citation-indexed document for summary');
            documentText = CitationService.formatDocumentForAI(
                state.textChunks,
                state.extractedFigures || [],
                state.extractedTables || []
            );
            useCitations = true;
        } else {
            console.log('⚠️ Citations not available, using plain text');
            const plainText = await getAllPdfText();
            if (!plainText) {
                throw new Error("Could not read text from the PDF.");
            }
            documentText = plainText;
        }

        // Call backend API with citation-aware document
        const response = await BackendClient.generateSummary(documentId, documentText);
        const summaryText = response.summary; // Backend returns {summary: string}

        // 🎯 Parse citations from response if available
        if (useCitations && state.citationMap) {
            try {
                const responseText = JSON.stringify(response);
                const aiResponse = CitationService.parseAIResponseWithCitations(
                    responseText,
                    state.citationMap
                );
                
                if (aiResponse.citationIndices.length > 0) {
                    console.log(`✅ Summary has ${aiResponse.citationIndices.length} citation(s):`, aiResponse.citationIndices);
                    
                    AppStateManager.setState({
                        lastAICitations: aiResponse.citationIndices,
                        lastAIContext: 'Summary Generation'
                    });
                }
            } catch (citationError) {
                console.warn('⚠️ Failed to parse citations from summary:', citationError);
            }
        }

        const summaryField = document.getElementById('predictorsPoorOutcomeSurgical') as HTMLTextAreaElement;
        if (summaryField) summaryField.value = summaryText;

        // Add to trace log
        const state2 = AppStateManager.getState();
        ExtractionTracker.addExtraction({
            fieldName: 'summary (AI)',
            text: summaryText,
            page: 0,
            coordinates: {x:0, y:0, width:0, height:0},
            method: 'gemini-summary',
            documentName: state2.documentName
        });

        StatusManager.show('✨ Key findings summary generated by AI (via secure backend)!', 'success');

    } catch (error: any) {
        console.error("Backend Summary Error:", error);
        StatusManager.show(`AI summary failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        const loadingEl = document.getElementById('summary-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

/**
 * ✨ Validates a field's content against the PDF text using backend API.
 * Securely routes request through backend to protect API key.
 */
async function validateFieldWithAI(fieldId: string): Promise<void> {
    const state = AppStateManager.getState();
    const field = document.getElementById(fieldId) as HTMLInputElement;
    if (!field) {
        StatusManager.show(`Field ${fieldId} not found.`, 'error');
        return;
    }

    const claim = field.value;
    if (!claim) {
        StatusManager.show('Field is empty, nothing to validate.', 'warning');
        return;
    }

    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first.', 'warning');
        return;
    }
    if (state.isProcessing) {
        StatusManager.show('Please wait for the current operation to finish.', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    StatusManager.showLoading(true);
    StatusManager.show(`✨ Validating claim with citation tracking: "${claim.substring(0, 30)}..."`, 'info');

    try {
        // Ensure backend authentication
        await ensureBackendAuthenticated();

        const documentId = state.documentName || `temp-${Date.now()}`;

        // 🎯 Use citation-aware document if available
        let documentText: string;
        let useCitations = false;

        if (state.textChunks && state.textChunks.length > 0 && state.citationMap) {
            console.log('📚 Using citation-indexed document for validation');
            documentText = CitationService.formatDocumentForAI(
                state.textChunks,
                state.extractedFigures || [],
                state.extractedTables || []
            );
            useCitations = true;
        } else {
            console.log('⚠️ Citations not available, using plain text');
            const plainText = await getAllPdfText();
            if (!plainText) {
                throw new Error("Could not read text from PDF for validation.");
            }
            documentText = plainText;
        }

        // Call backend API with citation-aware document
        const response = await BackendClient.validateField(documentId, fieldId, claim, documentText);
        const validation = response; // Backend returns {is_supported, quote, confidence}

        // 🎯 Parse citations from response if available
        if (useCitations && state.citationMap) {
            try {
                const responseText = JSON.stringify(response);
                const aiResponse = CitationService.parseAIResponseWithCitations(
                    responseText,
                    state.citationMap
                );
                
                if (aiResponse.citationIndices.length > 0) {
                    console.log(`✅ Validation has ${aiResponse.citationIndices.length} citation(s):`, aiResponse.citationIndices);
                    
                    AppStateManager.setState({
                        lastAICitations: aiResponse.citationIndices,
                        lastAIContext: 'Field Validation'
                    });
                }
            } catch (citationError) {
                console.warn('⚠️ Failed to parse citations from validation:', citationError);
            }
        }

        if (validation.is_supported) {
            StatusManager.show(`✓ VALIDATED (Confidence: ${Math.round(validation.confidence * 100)}%): "${validation.quote}"`, 'success', 10000);
            field.style.borderColor = 'var(--success-green)';
        } else {
            StatusManager.show(`✗ NOT SUPPORTED (Confidence: ${Math.round(validation.confidence * 100)}%). Reason: "${validation.quote}"`, 'warning', 10000);
            field.style.borderColor = 'var(--warning-orange)';
        }

    } catch (error: any) {
        console.error("Backend Validation Error:", error);
        StatusManager.show(`AI validation failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        StatusManager.showLoading(false);
    }
}

/**
 * ✨ Finds study metadata using backend API.
 * Securely routes request through backend to protect API key.
 */
async function findMetadata(): Promise<void> {
    const state = AppStateManager.getState();
    if (state.isProcessing) {
        StatusManager.show('Please wait for the current operation to finish.', 'warning');
        return;
    }
    const citationField = document.getElementById('citation') as HTMLInputElement;
    const citationText = citationField?.value || '';
    if (!citationText) {
        StatusManager.show('Please enter a citation or title first.', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    const loadingEl = document.getElementById('metadata-loading');
    if (loadingEl) loadingEl.style.display = 'block';
    StatusManager.show('✨ Searching for metadata with citation tracking...', 'info');

    try {
        // Ensure backend authentication
        await ensureBackendAuthenticated();

        const documentId = state.documentName || `temp-${Date.now()}`;

        // 🎯 Use citation-aware document if available
        let documentText: string;
        let useCitations = false;

        if (state.textChunks && state.textChunks.length > 0 && state.citationMap) {
            console.log('📚 Using citation-indexed document for metadata');
            documentText = CitationService.formatDocumentForAI(
                state.textChunks,
                state.extractedFigures || [],
                state.extractedTables || []
            );
            useCitations = true;
        } else {
            console.log('⚠️ Citations not available, using plain text');
            const plainText = await getAllPdfText();
            if (!plainText) {
                throw new Error("Could not read text from the PDF.");
            }
            documentText = plainText;
        }

        // Call backend API with citation-aware document
        const response = await BackendClient.findMetadata(documentId, documentText);
        const data = response; // Backend returns {doi, pmid, journal, year}

        // 🎯 Parse citations from response if available
        if (useCitations && state.citationMap) {
            try {
                const responseText = JSON.stringify(response);
                const aiResponse = CitationService.parseAIResponseWithCitations(
                    responseText,
                    state.citationMap
                );
                
                if (aiResponse.citationIndices.length > 0) {
                    console.log(`✅ Metadata has ${aiResponse.citationIndices.length} citation(s):`, aiResponse.citationIndices);
                    
                    AppStateManager.setState({
                        lastAICitations: aiResponse.citationIndices,
                        lastAIContext: 'Metadata Extraction'
                    });
                }
            } catch (citationError) {
                console.warn('⚠️ Failed to parse citations from metadata:', citationError);
            }
        }

        const doiField = document.getElementById('doi') as HTMLInputElement;
        const pmidField = document.getElementById('pmid') as HTMLInputElement;
        const journalField = document.getElementById('journal') as HTMLInputElement;
        const yearField = document.getElementById('year') as HTMLInputElement;

        if (data.doi && doiField) doiField.value = data.doi;
        if (data.pmid && pmidField) pmidField.value = data.pmid;
        if (data.journal && journalField) journalField.value = data.journal;
        if (data.year && yearField) yearField.value = data.year.toString();

        StatusManager.show('✨ Metadata auto-populated (via secure backend)!', 'success');

    } catch (error: any) {
        console.error("Backend Metadata Error:", error);
        StatusManager.show(`AI metadata search failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        const loadingEl = document.getElementById('metadata-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

/**
 * ✨ Extracts tables from the document using backend API.
 * Securely routes request through backend to protect API key.
 */
async function handleExtractTables(): Promise<void> {
    const state = AppStateManager.getState();
    const resultsContainer = document.getElementById('table-extraction-results');
    if (!state.pdfDoc) {
        StatusManager.show("Please load a PDF first.", "warning");
        return;
    }

    if (resultsContainer) resultsContainer.innerHTML = 'Extracting tables with citation tracking... ✨';
    StatusManager.showLoading(true);

    try {
        // Ensure backend authentication
        await ensureBackendAuthenticated();

        const documentId = state.documentName || `temp-${Date.now()}`;

        // 🎯 Use citation-aware document if available
        let documentText: string;
        let useCitations = false;

        if (state.textChunks && state.textChunks.length > 0 && state.citationMap) {
            console.log('📚 Using citation-indexed document for table extraction');
            documentText = CitationService.formatDocumentForAI(
                state.textChunks,
                state.extractedFigures || [],
                state.extractedTables || []
            );
            useCitations = true;
        } else {
            console.log('⚠️ Citations not available, using plain text');
            const plainText = await getAllPdfText();
            if (!plainText) return;
            documentText = plainText;
        }

        // Call backend API with citation-aware document
        const response = await BackendClient.extractTables(documentId, documentText);
        const result = response; // Backend returns {tables: [...]}

        // 🎯 Parse citations from response if available
        if (useCitations && state.citationMap) {
            try {
                const responseText = JSON.stringify(response);
                const aiResponse = CitationService.parseAIResponseWithCitations(
                    responseText,
                    state.citationMap
                );
                
                if (aiResponse.citationIndices.length > 0) {
                    console.log(`✅ Table extraction has ${aiResponse.citationIndices.length} citation(s):`, aiResponse.citationIndices);
                    
                    AppStateManager.setState({
                        lastAICitations: aiResponse.citationIndices,
                        lastAIContext: 'Table Extraction'
                    });
                }
            } catch (citationError) {
                console.warn('⚠️ Failed to parse citations from table extraction:', citationError);
            }
        }

        if (result.tables && result.tables.length > 0 && resultsContainer) {
            renderTables(result.tables, resultsContainer);
            StatusManager.show(`Successfully extracted ${result.tables.length} tables (via secure backend).`, 'success');
        } else {
            if (resultsContainer) resultsContainer.innerText = "No tables found in the document.";
            StatusManager.show("No tables were identified by the AI.", "info");
        }

    } catch (error: any) {
        console.error("Backend Table Extraction Error:", error);
        if (resultsContainer) resultsContainer.innerText = `Error: ${error.message}`;
        StatusManager.show("Table extraction failed.", "error");
    } finally {
        StatusManager.showLoading(false);
    }
}

/**
 * Renders extracted tables in the UI
 * @param {Array} tables - Array of table objects
 * @param {HTMLElement} container - Container element to render tables into
 */
function renderTables(tables: any[], container: HTMLElement): void {
    container.innerHTML = '';
    tables.forEach((tableData, index) => {
        const details = document.createElement('details');
        details.open = true; // Open by default

        const summary = document.createElement('summary');
        summary.textContent = `Table ${index + 1}: ${tableData.title || 'Untitled'}`;

        const description = document.createElement('p');
        description.textContent = tableData.description || '';
        description.style.fontSize = '11px';
        description.style.fontStyle = 'italic';

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        if (tableData.data && tableData.data.length > 0) {
            // Assume first row is header
            const headerRow = document.createElement('tr');
            tableData.data[0].forEach((headerText: string) => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            // The rest are body rows
            for (let i = 1; i < tableData.data.length; i++) {
                const bodyRow = document.createElement('tr');
                tableData.data[i].forEach((cellText: string) => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    bodyRow.appendChild(td);
                });
                tbody.appendChild(bodyRow);
            }
        }

        table.appendChild(thead);
        table.appendChild(tbody);

        details.appendChild(summary);
        if(tableData.description) details.appendChild(description);
        details.appendChild(table);

        container.appendChild(details);
    });
}

/**
 * ✨ Analyzes an uploaded image with a text prompt using backend API.
 * Securely routes request through backend to protect API key.
 */
async function handleImageAnalysis(): Promise<void> {
    const fileInput = document.getElementById('image-upload-input') as HTMLInputElement;
    const promptField = document.getElementById('image-analysis-prompt') as HTMLInputElement;
    const resultsContainer = document.getElementById('image-analysis-results');
    const prompt = promptField?.value || '';

    if (!fileInput?.files || fileInput.files.length === 0) {
        StatusManager.show("Please upload an image.", "warning");
        return;
    }
    if (!prompt) {
        StatusManager.show("Please enter a prompt for image analysis.", "warning");
        return;
    }

    const file = fileInput.files[0];
    if (resultsContainer) resultsContainer.innerHTML = 'Analyzing image... ✨';
    StatusManager.showLoading(true);

    try {
        // Ensure backend authentication
        await ensureBackendAuthenticated();

        const base64Data = await blobToBase64(file);
        
        const state = AppStateManager.getState();
        const documentId = state.documentName || `temp-${Date.now()}`;

        // Call backend API instead of direct Gemini
        const response = await BackendClient.analyzeImage(documentId, base64Data, prompt);
        const analysisText = response.analysis; // Backend returns {analysis: string}

        if (resultsContainer) resultsContainer.innerText = analysisText;
        StatusManager.show("Image analyzed successfully (via secure backend).", "success");

    } catch (error: any) {
        console.error("Backend Image Analysis Error:", error);
        if (resultsContainer) resultsContainer.innerText = `Error: ${error.message}`;
        StatusManager.show("Image analysis failed.", "error");
    } finally {
        StatusManager.showLoading(false);
    }
}

/**
 * ✨ Performs deep analysis on the document text using backend API.
 * Securely routes request through backend to protect API key.
 */
async function handleDeepAnalysis(): Promise<void> {
    const state = AppStateManager.getState();
    const promptField = document.getElementById('deep-analysis-prompt') as HTMLInputElement;
    const resultsContainer = document.getElementById('deep-analysis-results');
    const prompt = promptField?.value || '';

    if (!prompt) {
        StatusManager.show("Please enter a prompt for deep analysis.", "warning");
        return;
    }
    if (!state.pdfDoc) {
        StatusManager.show("Please load a PDF first.", "warning");
        return;
    }

    if (resultsContainer) resultsContainer.innerHTML = 'Thinking deeply with citation tracking... ✨';
    StatusManager.showLoading(true);

    try {
        // Ensure backend authentication
        await ensureBackendAuthenticated();

        const documentId = state.documentName || `temp-${Date.now()}`;

        // 🎯 Use citation-aware document if available
        let documentText: string;
        let useCitations = false;

        if (state.textChunks && state.textChunks.length > 0 && state.citationMap) {
            console.log('📚 Using citation-indexed document for deep analysis');
            documentText = CitationService.formatDocumentForAI(
                state.textChunks,
                state.extractedFigures || [],
                state.extractedTables || []
            );
            useCitations = true;
        } else {
            console.log('⚠️ Citations not available, using plain text');
            const plainText = await getAllPdfText();
            if (!plainText) return;
            documentText = plainText;
        }

        // Call backend API with citation-aware document
        const response = await BackendClient.deepAnalysis(documentId, documentText, prompt);
        const analysisText = response.analysis; // Backend returns {analysis: string}

        // 🎯 Parse citations from response if available
        if (useCitations && state.citationMap) {
            try {
                const responseText = JSON.stringify(response);
                const aiResponse = CitationService.parseAIResponseWithCitations(
                    responseText,
                    state.citationMap
                );
                
                if (aiResponse.citationIndices.length > 0) {
                    console.log(`✅ Deep analysis has ${aiResponse.citationIndices.length} citation(s):`, aiResponse.citationIndices);
                    
                    AppStateManager.setState({
                        lastAICitations: aiResponse.citationIndices,
                        lastAIContext: 'Deep Analysis'
                    });
                }
            } catch (citationError) {
                console.warn('⚠️ Failed to parse citations from deep analysis:', citationError);
            }
        }

        if (resultsContainer) resultsContainer.innerText = analysisText;
        StatusManager.show("Deep analysis completed (via secure backend).", "success");

    } catch (error: any) {
        console.error("Backend Deep Analysis Error:", error);
        if (resultsContainer) resultsContainer.innerText = `Error: ${error.message}`;
        StatusManager.show("Deep analysis failed.", "error");
    } finally {
        StatusManager.showLoading(false);
    }
}

// ==================== EXPORTS ====================

/**
 * AIService object - Central manager for all AI operations
 * All AI calls now securely route through the backend API
 */
const AIService = {
    generatePICO,
    generateSummary,
    validateFieldWithAI,
    findMetadata,
    handleExtractTables,
    handleImageAnalysis,
    handleDeepAnalysis,
    // Helper functions (exported for potential internal use)
    getPageText,
    getAllPdfText,
};

export default AIService;

// Export individual functions for window binding
export {
    generatePICO,
    generateSummary,
    validateFieldWithAI,
    findMetadata,
    handleExtractTables,
    handleImageAnalysis,
    handleDeepAnalysis,
};
