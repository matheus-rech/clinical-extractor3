/**
 * ExportManager
 * Handles data export functionality (JSON, CSV, Excel, Audit Report, Annotated PDF)
 */

import * as XLSX from 'xlsx';
import AppStateManager from '../state/AppStateManager';
import FormManager from '../forms/FormManager';
import ExtractionTracker from '../data/ExtractionTracker';
import StatusManager from '../utils/status';

/**
 * ExportManager Object
 * Central manager for all export operations
 */
const ExportManager = {
    /**
     * Export extraction data as JSON
     * Includes document metadata, form data, and all extractions
     */
    exportJSON: function() {
        const state = AppStateManager.getState();
        const formData = FormManager.collectFormData();
        const data = {
            document: state.documentName,
            exportDate: new Date().toISOString(),
            formData,
            extractions: ExtractionTracker.getExtractions()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `extraction_${Date.now()}.json`);
        StatusManager.show('JSON export successful (Preview)', 'success');
    },

    /**
     * Export extraction data as CSV
     * Includes field name, text, page, coordinates, and timestamp
     */
    exportCSV: function() {
        let csv = 'Field,Text,Page,X,Y,Width,Height,Timestamp\n';
        ExtractionTracker.getExtractions().forEach(ext => {
            csv += `"${ext.fieldName}","${ext.text.replace(/"/g, '""')}",${ext.page},${ext.coordinates.x},${ext.coordinates.y},${ext.coordinates.width},${ext.coordinates.height},"${ext.timestamp}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadFile(blob, `extraction_${Date.now()}.csv`);
        StatusManager.show('CSV export successful (Preview)', 'success');
    },

    /**
     * Generate and export audit report as HTML
     * Opens in new tab with document metadata, form data, and extractions
     */
    exportAudit: function() {
        const formData = FormManager.collectFormData();
        // Generate simplified HTML locally for preview
        const state = AppStateManager.getState();
        const extractions = ExtractionTracker.getExtractions();
        let html = `<h1>Audit Report</h1><h2>Document: ${state.documentName}</h2><h3>Form Data</h3><ul>`;
        Object.entries(formData).forEach(([key, value]) => html += `<li><b>${key}:</b> ${value}</li>`);
        html += `</ul><h3>Extractions</h3>`;
        extractions.forEach(ext => html += `<p><b>${ext.fieldName} (Page ${ext.page}):</b> "${ext.text}" <i>@ ${ext.timestamp}</i></p>`);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000); // Clean up blob URL
        StatusManager.show('Audit report generated (Preview)', 'success');
    },

    /**
     * Export data as Excel (.xlsx) file with multiple sheets
     * Creates professional Excel workbook with:
     * - Summary sheet with form data
     * - Extractions sheet with all extraction details
     * - Statistics sheet with extraction counts
     *
     * ⚠️ SECURITY NOTE: xlsx package is unmaintained and has 2 HIGH-severity CVEs
     * (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9). Risk is acceptable for controlled
     * use with trusted PDFs. Migration to ExcelJS planned - see MIGRATION_TODO.md
     *
     * @see SECURITY.md for complete vulnerability details
     * @see MIGRATION_TODO.md for ExcelJS migration plan
     */
    exportExcel: function() {
        const state = AppStateManager.getState();
        const formData = FormManager.collectFormData();
        const extractions = ExtractionTracker.getExtractions();

        // Create new workbook
        const workbook = XLSX.utils.book_new();

        // SHEET 1: Summary (Form Data)
        const summaryData = [
            ['Clinical Extractor - Data Export'],
            [''],
            ['Document:', state.documentName],
            ['Export Date:', new Date().toLocaleString()],
            ['Total Extractions:', extractions.length],
            [''],
            ['Form Data'],
            ['Field', 'Value']
        ];

        // Add form data rows
        Object.entries(formData).forEach(([key, value]) => {
            summaryData.push([key, String(value)]);
        });

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // SHEET 2: Extractions (Detailed)
        const extractionsData: (string | number)[][] = [
            ['Field Name', 'Extracted Text', 'Page', 'Method', 'X', 'Y', 'Width', 'Height', 'Timestamp']
        ];

        extractions.forEach(ext => {
            extractionsData.push([
                ext.fieldName,
                ext.text,
                ext.page,
                ext.method,
                ext.coordinates.x || ext.coordinates.left || 0,
                ext.coordinates.y || ext.coordinates.top || 0,
                ext.coordinates.width,
                ext.coordinates.height,
                new Date(ext.timestamp).toLocaleString()
            ]);
        });

        const extractionsSheet = XLSX.utils.aoa_to_sheet(extractionsData);
        XLSX.utils.book_append_sheet(workbook, extractionsSheet, 'Extractions');

        // SHEET 3: Statistics
        const uniquePages = new Set(extractions.map(e => e.page));
        const methodCounts = extractions.reduce((acc, ext) => {
            acc[ext.method] = (acc[ext.method] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statsData = [
            ['Extraction Statistics'],
            [''],
            ['Metric', 'Value'],
            ['Total Extractions', extractions.length],
            ['Pages with Data', uniquePages.size],
            ['Unique Fields', new Set(extractions.map(e => e.fieldName)).size],
            [''],
            ['Extraction Methods'],
            ['Method', 'Count']
        ];

        Object.entries(methodCounts).forEach(([method, count]) => {
            statsData.push([method, count]);
        });

        const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');

        // Generate Excel file and trigger download
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        this.downloadFile(blob, `clinical_extraction_${Date.now()}.xlsx`);
        StatusManager.show('✓ Excel file exported successfully!', 'success');
    },

    /**
     * Export annotated PDF with extraction highlights
     * Not available in preview mode
     */
    exportAnnotatedPDF: function() {
        StatusManager.show('Annotated PDF export not available in preview.', 'info');
    },

    /**
     * Download file helper
     * Creates temporary download link and triggers download
     * @private
     */
    downloadFile: function(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000); // Clean up blob URL
    }
};

/**
 * Individual export functions for window binding
 */
export function exportJSON() {
    ExportManager.exportJSON();
}

export function exportCSV() {
    ExportManager.exportCSV();
}

export function exportExcel() {
    ExportManager.exportExcel();
}

export function exportAudit() {
    ExportManager.exportAudit();
}

export function exportAnnotatedPDF() {
    ExportManager.exportAnnotatedPDF();
}

export default ExportManager;
