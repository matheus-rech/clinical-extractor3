# Migration Plan: xlsx → ExcelJS

## Overview

Migrate from unmaintained `xlsx` package to actively maintained `exceljs` package to resolve 2 HIGH-severity CVEs.

**Estimated Time:** 3 hours
**Priority:** MEDIUM (acceptable risk for now)
**Target Date:** Q1 2026

---

## Why Migrate?

**Current State (xlsx):**
- ❌ Unmaintained since 2022
- ❌ 2 HIGH-severity CVEs (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9)
- ❌ No security updates
- ✅ Currently works fine for our use case

**Target State (ExcelJS):**
- ✅ Actively maintained (5,000+ stars on GitHub)
- ✅ No known vulnerabilities
- ✅ Better API and TypeScript support
- ✅ More features (styles, formulas, charts)
- ✅ Similar file size (~200KB vs ~180KB)

---

## Migration Checklist

### Phase 1: Preparation (30 min)

- [ ] Install ExcelJS: `npm install exceljs`
- [ ] Review ExcelJS documentation: https://github.com/exceljs/exceljs
- [ ] Read current `exportExcel()` implementation in `src/services/ExportManager.ts`
- [ ] Identify all xlsx API calls (writeFile, aoa_to_sheet, book_new, etc.)

### Phase 2: Implementation (90 min)

- [ ] Create new `exportExcelNew()` function using ExcelJS
- [ ] Convert workbook creation: `new ExcelJS.Workbook()`
- [ ] Convert worksheet creation: `workbook.addWorksheet('name')`
- [ ] Convert data writing: Use ExcelJS row/cell API
- [ ] Add professional styling:
  - [ ] Header row (bold, blue background)
  - [ ] Borders and gridlines
  - [ ] Column auto-width
  - [ ] Data formatting (dates, numbers)
- [ ] Implement file download: Use Blob + FileSaver.js

### Phase 3: Testing (45 min)

- [ ] Test with sample extraction data
- [ ] Verify Excel file opens correctly in:
  - [ ] Microsoft Excel (Windows/Mac)
  - [ ] Google Sheets
  - [ ] LibreOffice Calc
- [ ] Compare output with old xlsx version
- [ ] Test edge cases:
  - [ ] Empty extractions
  - [ ] Large datasets (100+ rows)
  - [ ] Special characters in data
  - [ ] Unicode text

### Phase 4: Deployment (15 min)

- [ ] Rename `exportExcel()` → `exportExcelLegacy()`
- [ ] Rename `exportExcelNew()` → `exportExcel()`
- [ ] Update Window API exposure
- [ ] Remove xlsx package: `npm uninstall xlsx`
- [ ] Run `npm audit` to verify CVEs resolved
- [ ] Update SECURITY.md to mark issue as RESOLVED
- [ ] Commit with message: "feat: Migrate from xlsx to ExcelJS (resolves CVE-2024-xxxxx)"

---

## Code Migration Guide

### Before (xlsx)
```typescript
import * as XLSX from 'xlsx';

export function exportExcel(): void {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ['Field', 'Value'],
        ['Study Type', 'RCT']
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Extractions');
    XLSX.writeFile(wb, 'extractions.xlsx');
}
```

### After (ExcelJS)
```typescript
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportExcel(): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Extractions');

    // Add headers with styling
    const headerRow = worksheet.addRow(['Field', 'Value']);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };

    // Add data
    worksheet.addRow(['Study Type', 'RCT']);

    // Auto-width columns
    worksheet.columns.forEach(column => {
        column.width = 20;
    });

    // Generate blob and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, 'extractions.xlsx');
}
```

---

## Testing Checklist

After migration, verify:
- [ ] File downloads correctly
- [ ] Headers are bold and blue
- [ ] Data is correctly formatted
- [ ] File opens in Excel without errors
- [ ] No TypeScript compilation errors
- [ ] Bundle size hasn't increased significantly
- [ ] `npm audit` shows 0 high-severity issues

---

## Rollback Plan

If migration fails:
1. Keep `exportExcelLegacy()` function with xlsx
2. Revert Window API to use legacy function
3. Document issues encountered
4. Plan for retry with more preparation

---

## Resources

- **ExcelJS Docs:** https://github.com/exceljs/exceljs
- **Migration Guide:** https://github.com/exceljs/exceljs/wiki/Migration-from-xlsx
- **API Reference:** https://github.com/exceljs/exceljs/blob/master/README.md
- **Examples:** https://github.com/exceljs/exceljs/tree/master/examples

---

**Created:** November 2025
**Assignee:** TBD
**Status:** PLANNED
