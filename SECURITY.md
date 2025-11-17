# Security Policy

## Known Vulnerabilities

### xlsx Package (CVE-2024-xxxxx)

**Status:** ⚠️ KNOWN ISSUE - Acceptable Risk
**Severity:** HIGH
**Package:** xlsx@0.18.5 (unmaintained)
**CVEs:**
- [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)
- [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)

**Description:**
The xlsx package used for Excel export functionality is no longer maintained and contains two high-severity vulnerabilities. These vulnerabilities require a malicious PDF to be loaded by the user, making them low-risk in controlled research environments.

**Risk Assessment:**
- **Likelihood:** LOW (requires user to load malicious PDF)
- **Impact:** HIGH (potential code execution)
- **Overall Risk:** MEDIUM (acceptable for controlled use)

**Affected Features:**
- Excel export (`exportExcel()` function)
- File: `src/services/ExportManager.ts`

**Mitigation:**
1. **Short-term:** Continue using xlsx with awareness of risk
2. **Long-term:** Migrate to ExcelJS (see MIGRATION_TODO.md)
3. **Best Practice:** Only process trusted PDF files from reputable sources

**Migration Plan:**
See [MIGRATION_TODO.md](MIGRATION_TODO.md) for complete migration roadmap to ExcelJS (~3 hours).

**No npm Fix Available:**
```bash
npm audit
# 2 high severity vulnerabilities
# No fix available - package is unmaintained
```

---

## Reporting Security Issues

If you discover a security vulnerability, please email [your-email@example.com] or open a GitHub issue.

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Security Best Practices

When using the Clinical Extractor:
1. ✅ Only process PDFs from trusted sources
2. ✅ Keep dependencies updated regularly
3. ✅ Use in controlled research environments
4. ✅ Do not expose to untrusted user input
5. ✅ Review audit logs for suspicious activity

---

**Last Updated:** November 2025
**Next Review:** Quarterly security audit
