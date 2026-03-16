import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  FileText, CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert,
  Search, Download, FileDown, Send, Archive, ChevronRight, ChevronDown,
  Copy, Plus, Trash2, GripVertical, Sparkles, BarChart3, Database,
  X, RefreshCw, Eye, FileCode2, Clock, Shield, Layers, ArrowRight,
  Filter, Hash, Terminal, Zap, Info, TrendingUp, List, Code2,
  Edit3, Play, RotateCcw, EyeOff,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "var(--c-bg)", surface: "var(--c-surface)", border: "var(--c-border)",
  borderMed: "var(--c-border-med)",
  cardSubtle: "var(--c-card-subtle)", iconInactive: "var(--c-icon-inactive)", subtle: "var(--c-subtle)",
  em: "#10B981", emDim: "rgba(16,185,129,0.12)", emGlow: "var(--c-em-glow)",
  glassBg: "var(--c-glass-bg)", glassBorder: "var(--c-glass-border)",
  text: "var(--c-text)", sub: "var(--c-sub)", muted: "var(--c-muted)",
  err: "#EF4444", errDim: "rgba(239,68,68,0.1)",
  warn: "#F59E0B", warnDim: "rgba(245,158,11,0.1)",
  info: "#3B82F6", infoDim: "rgba(59,130,246,0.1)",
  purple: "#8B5CF6", purpleDim: "rgba(139,92,246,0.1)",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ValidationFile {
  id: string; name: string; type: "EDI" | "XML" | "JSON" | "CSV";
  timestamp: string; status: "passed" | "failed" | "warning";
  errors: number; warnings: number; snip: number;
  fileSize: string; transactionCount: number; interchangeId: string;
  senderId: string; receiverId: string; ediVersion: string;
  processingDuration: string;
}

interface ErrorEntry {
  id: string; errorId: string; snipLevel: number; severity: "error" | "warning";
  loop: string; segment: string; element: string;
  position: string; lineNumber: number;
  message: string; expected: string; actual: string;
  ruleRef: string; aiExplanation: string; remediation: string;
}

interface Transaction {
  id: string; setId: string; controlNumber: string;
  status: "passed" | "failed" | "warning";
  errors: number; warnings: number; segments: number;
  claimNumber?: string; amount?: string;
}

interface SnipLevel {
  level: number; name: string; description: string;
  status: "passed" | "failed" | "not-checked";
  violations: number;
}

interface SegmentResult {
  name: string; count: number; errors: number; warnings: number;
  status: "passed" | "failed" | "warning";
  firstOccurrence: string;
}

interface RawLine {
  lineNumber: number; content: string; hasError: boolean;
  errorId?: string; segment: string;
}

interface ErrorNode {
  id: string; name: string; type: "loop" | "segment" | "element";
  hasError?: boolean; errorId?: string; children?: ErrorNode[];
}

interface FieldMapping {
  id: string; source: string; target: string;
  type: "string" | "integer" | "boolean"; hardcoded?: string;
}

interface CsvColumn {
  id: string; columnName: string; sourceField: string;
}

// ─── Comprehensive Mock Data ───────────────────────────────────────────────────
const MOCK_FILES: ValidationFile[] = [
  { id: "f1", name: "claim_104.edi", type: "EDI", timestamp: "2026-03-16 10:15:23", status: "failed", errors: 12, warnings: 3, snip: 4, fileSize: "64 KB", transactionCount: 8, interchangeId: "ISA00104", senderId: "CLAIMSUBMIT01", receiverId: "PAYER00012345", ediVersion: "005010X222A1", processingDuration: "1.82s" },
  { id: "f2", name: "claim_105.xml", type: "XML", timestamp: "2026-03-16 10:16:01", status: "passed", errors: 0, warnings: 0, snip: 0, fileSize: "38 KB", transactionCount: 5, interchangeId: "ISA00105", senderId: "CLAIMSUBMIT01", receiverId: "PAYER00012345", ediVersion: "005010X222A1", processingDuration: "0.94s" },
  { id: "f3", name: "claim_106.edi", type: "EDI", timestamp: "2026-03-16 10:16:45", status: "warning", errors: 2, warnings: 5, snip: 1, fileSize: "42 KB", transactionCount: 6, interchangeId: "ISA00106", senderId: "CLAIMSUBMIT01", receiverId: "PAYER00012345", ediVersion: "005010X222A1", processingDuration: "1.21s" },
  { id: "f4", name: "remit_835_001.json", type: "JSON", timestamp: "2026-03-16 10:17:12", status: "passed", errors: 0, warnings: 0, snip: 0, fileSize: "21 KB", transactionCount: 3, interchangeId: "ISA00200", senderId: "PAYER00012345", receiverId: "CLAIMSUBMIT01", ediVersion: "005010X221A1", processingDuration: "0.67s" },
  { id: "f5", name: "eligib_270.edi", type: "EDI", timestamp: "2026-03-16 10:18:00", status: "failed", errors: 5, warnings: 2, snip: 2, fileSize: "29 KB", transactionCount: 4, interchangeId: "ISA00300", senderId: "PAYER00012345", receiverId: "CLAIMSUBMIT01", ediVersion: "005010X279A1", processingDuration: "1.45s" },
  { id: "f6", name: "claim_107.csv", type: "CSV", timestamp: "2026-03-16 10:18:45", status: "passed", errors: 0, warnings: 1, snip: 0, fileSize: "18 KB", transactionCount: 4, interchangeId: "N/A", senderId: "CLAIMSUBMIT01", receiverId: "PAYER00012345", ediVersion: "CSV/Proprietary", processingDuration: "0.52s" },
];

const FILE_ERRORS: Record<string, ErrorEntry[]> = {
  f1: [
    { id: "e1", errorId: "VAL-201", snipLevel: 2, severity: "error", loop: "CLM Loop", segment: "CLM", element: "CLM01", position: "23:1", lineNumber: 23, message: "Claim Number Missing — CLM01 cannot be null or empty", expected: "Non-null alphanumeric value (1–38 chars)", actual: "NULL", ruleRef: "X12-837P-CLM01-R", aiExplanation: "The claim identifier (CLM01) is absent in this record. This is a required field for all 837 professional claim transactions. This typically happens when the upstream system fails to generate or transmit the claim ID, often due to a null reference in the claim management system or a broken ETL step.", remediation: "Check the source system's claim ID generation pipeline. Verify the mapping rule for CLM01 in your source adapter. Ensure the database field feeding CLM01 is not nullable." },
    { id: "e2", errorId: "VAL-203", snipLevel: 3, severity: "error", loop: "ST Loop", segment: "ST", element: "ST02", position: "15:3", lineNumber: 15, message: "Control Number Invalid — ST02 must be 4-digit numeric", expected: "4-digit zero-padded numeric string (e.g. 0001)", actual: "NULL", ruleRef: "X12-837P-ST02-R", aiExplanation: "The transaction set control number (ST02) is missing or malformed. Every transaction set requires a unique 4-digit control number for envelope integrity tracking. This often indicates the transaction set generator is not incrementing or populating the control counter.", remediation: "Ensure the ST02 counter is initialized and auto-incremented per transaction set. Reset the sequence counter if it has overflowed or been corrupted." },
    { id: "e3", errorId: "VAL-209", snipLevel: 2, severity: "error", loop: "CLM Loop", segment: "CLM", element: "CLM05-3", position: "23:5", lineNumber: 23, message: "Facility Code Invalid — CLM05-3 must match X12 code set", expected: "Valid facility type code (11, 21, 23, 24, 26, 31, 32...)", actual: "99", ruleRef: "X12-837P-CLM05-3-V", aiExplanation: "CLM05-3 contains an invalid facility type code. Code '99' is not part of the approved X12 837P facility type code set. This is usually caused by a mapping from a legacy system that used proprietary facility codes not normalized to X12 standards.", remediation: "Cross-reference the source facility code against the X12 837P code set table. Create a translation table mapping legacy codes to valid X12 values in your mapping logic." },
    { id: "e4", errorId: "VAL-305", snipLevel: 3, severity: "error", loop: "NM1 Loop", segment: "NM1", element: "NM101", position: "31:1", lineNumber: 31, message: "Entity Identifier Code Missing — NM101 cannot be empty", expected: "Valid entity code (IL, QC, 85, 87, PR, DN...)", actual: "EMPTY", ruleRef: "X12-837P-NM101-R", aiExplanation: "The NM101 entity identifier is empty, which prevents the system from determining whether this NM1 loop belongs to a subscriber, provider, or payer. This field is critical for claim routing and adjudication.", remediation: "Ensure the upstream data includes the entity type for all NM1 segments. Check if the source system is sending entity role information and verify it maps correctly to NM101." },
    { id: "e5", errorId: "VAL-412", snipLevel: 4, severity: "error", loop: "REF Loop", segment: "REF", element: "REF02", position: "45:2", lineNumber: 45, message: "Member ID Pattern Mismatch — REF02 too short", expected: "Alphanumeric, 6–15 characters", actual: "AB1 (3 chars)", ruleRef: "X12-837P-REF02-FMT", aiExplanation: "The member ID in REF02 is only 3 characters, well below the minimum of 6. This may be a data quality issue from the payer's eligibility system or a truncation bug in the data extraction step.", remediation: "Validate member IDs at source before transmission. Add a length check in your pre-processing validation step and reject or flag records with IDs shorter than 6 characters." },
    { id: "e6", errorId: "VAL-115", snipLevel: 1, severity: "error", loop: "ISA Loop", segment: "ISA", element: "ISA16", position: "1:16", lineNumber: 1, message: "Component Element Separator Missing", expected: "Single character separator (typically ':')", actual: "SPACE", ruleRef: "X12-ISA16-R", aiExplanation: "The ISA16 component element separator is set to a space character, which is not a valid separator. This can cause the entire interchange to fail parsing downstream.", remediation: "Set ISA16 to a valid non-alphanumeric, non-whitespace character such as ':'. Update your EDI generator configuration." },
    { id: "e7", errorId: "VAL-501", snipLevel: 2, severity: "error", loop: "CLM Loop", segment: "CLM", element: "CLM02", position: "24:2", lineNumber: 24, message: "Total Charge Amount — Non-numeric or zero value", expected: "Positive decimal value (e.g. 150.00)", actual: "0.00", ruleRef: "X12-837P-CLM02-V", aiExplanation: "CLM02 contains a zero charge amount, which is not valid for a professional claim. This indicates either a calculation error in the billing system or the claim was submitted before charges were finalized.", remediation: "Verify that charges are calculated and finalized before EDI generation. Add a guard clause to reject claims with zero total charge amounts." },
    { id: "e8", errorId: "VAL-602", snipLevel: 2, severity: "error", loop: "SV1 Loop", segment: "SV1", element: "SV102", position: "52:2", lineNumber: 52, message: "Service Line Charge Amount Invalid", expected: "Positive decimal, max 18 chars", actual: "EMPTY", ruleRef: "X12-837P-SV102-R", aiExplanation: "The service line charge amount is missing from SV1. Each service line must carry a charge for proper adjudication. This usually indicates a line-item extraction failure in the billing interface.", remediation: "Review the SV1 segment generation logic. Ensure each service line has a corresponding charge extracted from the source billing system." },
    { id: "e9", errorId: "VAL-701", snipLevel: 3, severity: "error", loop: "DTP Loop", segment: "DTP", element: "DTP03", position: "38:3", lineNumber: 38, message: "Service Date Format Invalid", expected: "CCYYMMDD (8-digit date, qualifier 472)", actual: "2026/03/16 (slash-delimited)", ruleRef: "X12-837P-DTP03-FMT", aiExplanation: "The service date in DTP03 uses slash delimiters instead of the required CCYYMMDD format. This is a common issue when source systems use locale-formatted dates rather than X12-compliant date strings.", remediation: "Normalize all date values to CCYYMMDD format in your mapping logic before outputting to EDI. Strip any delimiters or locale-specific separators." },
    { id: "e10", errorId: "VAL-802", snipLevel: 2, severity: "error", loop: "NM1 Loop", segment: "NM1", element: "NM109", position: "33:9", lineNumber: 33, message: "Provider NPI Invalid ���� must be 10-digit numeric", expected: "10-digit National Provider Identifier", actual: "12345 (5 chars)", ruleRef: "X12-837P-NM109-NPI", aiExplanation: "The provider NPI (NM109) has only 5 digits. A valid NPI must be exactly 10 digits. This indicates either a data entry error in the provider master file or a truncation issue during data extraction.", remediation: "Validate NPIs against the NPPES registry before submission. Add a 10-digit length check on NM109 in your pre-transmission validation suite." },
    { id: "e11", errorId: "WAR-901", snipLevel: 1, severity: "warning", loop: "GS Loop", segment: "GS", element: "GS04", position: "8:4", lineNumber: 8, message: "Group Date Mismatch — GS04 differs from transaction dates by >30 days", expected: "Date within 30 days of transaction service dates", actual: "20250101 (dated 2025, transactions in 2026)", ruleRef: "X12-GS04-WARN", aiExplanation: "The functional group date (GS04) is significantly older than the transaction service dates. While not an outright rejection, this may trigger additional scrutiny or delay processing at the payer.", remediation: "Ensure GS04 reflects the actual batch generation date, not a static or hardcoded value. Use dynamic date generation in your EDI envelope builder." },
    { id: "e12", errorId: "WAR-902", snipLevel: 2, severity: "warning", loop: "CLM Loop", segment: "PWK", element: "PWK02", position: "47:2", lineNumber: 47, message: "Attachment Report Type Code — Deprecated code value", expected: "Current X12 PWK02 code set value", actual: "OZ (deprecated since 004010)", ruleRef: "X12-837P-PWK02-WARN", aiExplanation: "The PWK02 attachment report type uses 'OZ', a code that was valid in 004010 but deprecated in 005010. Most payers will still accept it but some may reject it.", remediation: "Update PWK02 to use the current 005010-compliant equivalent code. Review your code set tables against the current X12 publication." },
  ],
  f3: [
    { id: "e20", errorId: "VAL-203", snipLevel: 3, severity: "error", loop: "ST Loop", segment: "ST", element: "ST02", position: "15:3", lineNumber: 15, message: "Control Number Invalid — duplicate control number detected", expected: "Unique 4-digit control number per session", actual: "0001 (already used in same batch)", ruleRef: "X12-837P-ST02-UNIQ", aiExplanation: "This transaction set uses control number '0001' which was already used by another transaction in the same functional group. Control numbers must be unique within a session to ensure accurate acknowledgement tracking.", remediation: "Implement a session-scoped counter that increments per transaction set. Do not reset the counter within a single ISA envelope." },
    { id: "e21", errorId: "VAL-410", snipLevel: 4, severity: "error", loop: "REF Loop", segment: "REF", element: "REF01", position: "44:1", lineNumber: 44, message: "Reference Identification Qualifier — Unknown qualifier code", expected: "Valid REF01 qualifier (EJ, 1W, 6P, F8, 9F...)", actual: "XX", ruleRef: "X12-837P-REF01-V", aiExplanation: "The REF01 qualifier 'XX' is not a recognized code in the X12 837P code set. This typically results from custom or proprietary codes being passed through without translation.", remediation: "Map source system reference type codes to valid X12 REF01 qualifiers. Add a qualifier translation table to your mapping configuration." },
    { id: "e22", errorId: "WAR-201", snipLevel: 2, severity: "warning", loop: "CLM Loop", segment: "CLM", element: "CLM09", position: "23:9", lineNumber: 23, message: "Assignment of Benefits — Recommended field empty", expected: "Y (Yes) or N (No)", actual: "EMPTY", ruleRef: "X12-837P-CLM09-WARN", aiExplanation: "CLM09 (Assignment of Benefits) is empty. While technically optional in some implementations, most payers require it for clean claims. Missing this field may result in delayed or manual processing.", remediation: "Populate CLM09 based on the patient's assignment-of-benefits agreement. Typically 'Y' for participating providers." },
    { id: "e23", errorId: "WAR-301", snipLevel: 3, severity: "warning", loop: "NM1 Loop", segment: "NM1", element: "NM103", position: "31:3", lineNumber: 31, message: "Last Name Field — Contains numeric characters", expected: "Alphabetic characters only (no numbers)", actual: "SMITH2 (contains digit)", ruleRef: "X12-837P-NM103-WARN", aiExplanation: "The last name field (NM103) contains the digit '2'. This is likely a data entry artifact. While the X12 standard technically allows any alphanumeric, most payers validate against NPPES registry data which contains no numeric suffixes.", remediation: "Cleanse patient name data before mapping. Strip trailing numerics from NM103 in your pre-processing step." },
    { id: "e24", errorId: "WAR-401", snipLevel: 1, severity: "warning", loop: "ISA Loop", segment: "ISA", element: "ISA05", position: "1:5", lineNumber: 1, message: "Interchange Sender Qualifier — Non-standard value", expected: "ZZ (Mutually Defined) or 01 (DUNS)", actual: "ZQ", ruleRef: "X12-ISA05-WARN", aiExplanation: "ISA05 uses 'ZQ', a less common qualifier. While valid, it may not be recognized by all trading partner systems. 'ZZ' is the most widely accepted mutually-defined qualifier.", remediation: "Confirm the trading partner agreement specifies 'ZQ'. If not explicitly agreed, use 'ZZ' as the default sender qualifier." },
    { id: "e25", errorId: "WAR-501", snipLevel: 2, severity: "warning", loop: "SV1 Loop", segment: "SV1", element: "SV107", position: "52:7", lineNumber: 52, message: "Copay Amount — Non-zero value when subscriber pays nothing", expected: "0.00 or absent when no copay applies", actual: "10.00 (conflicts with COB data)", ruleRef: "X12-837P-SV107-WARN", aiExplanation: "SV107 shows a copay of $10.00 but the coordination of benefits data indicates full coverage with no patient responsibility. This discrepancy may cause downstream claim edits at the payer.", remediation: "Align SV107 copay values with COB data from the eligibility response (271). Implement a reconciliation check between SV107 and COB amounts before EDI generation." },
    { id: "e26", errorId: "WAR-601", snipLevel: 3, severity: "warning", loop: "CLM Loop", segment: "DTP", element: "DTP03", position: "38:3", lineNumber: 38, message: "Statement Dates — End date precedes start date", expected: "DTP03 end ≥ DTP03 start (qualifier 435)", actual: "End: 20260301, Start: 20260310", ruleRef: "X12-837P-DTP-DATE-ORDER", aiExplanation: "The statement end date is 9 days before the start date, which is logically invalid. This is often caused by incorrect date field mapping or a timezone/rollover issue in the date extraction logic.", remediation: "Add a date-order validation rule in your pre-processing: reject any record where the statement end date precedes the start date." },
  ],
  f5: [
    { id: "e30", errorId: "VAL-101", snipLevel: 1, severity: "error", loop: "ISA Loop", segment: "ISA", element: "ISA13", position: "1:13", lineNumber: 1, message: "Interchange Control Number — Non-sequential value", expected: "Sequential integer (next expected: 00000302)", actual: "00000298 (gap in sequence)", ruleRef: "X12-ISA13-SEQ", aiExplanation: "There is a gap in the interchange control number sequence. Numbers 299–301 are missing, suggesting files may have been dropped or resubmitted out of order.", remediation: "Investigate whether interchange files 299–301 were transmitted. If missing, resubmit. If already processed, update the sequence counter to resume correctly." },
    { id: "e31", errorId: "VAL-270-001", snipLevel: 2, severity: "error", loop: "HL Loop", segment: "HL", element: "HL03", position: "20:3", lineNumber: 20, message: "Hierarchical Level Code Invalid for 270", expected: "20 (Information Source), 21 (Information Receiver), 22 (Subscriber), 23 (Dependent)", actual: "99 (undefined)", ruleRef: "X12-270-HL03-V", aiExplanation: "The HL03 level code '99' is not valid for 270/271 eligibility transactions. HL03 must define the hierarchical relationship between the information source, receiver, subscriber, and dependent.", remediation: "Review the HL loop construction logic for 270 transactions. HL03 must strictly follow the X12 270 hierarchical structure. Rebuild the HL loop with correct level codes." },
    { id: "e32", errorId: "VAL-270-002", snipLevel: 2, severity: "error", loop: "NM1 Loop", segment: "NM1", element: "NM102", position: "28:2", lineNumber: 28, message: "Entity Type Qualifier — Person vs. Non-Person mismatch", expected: "1 (Person) for subscriber NM1 loop", actual: "2 (Non-Person Entity)", ruleRef: "X12-270-NM102-V", aiExplanation: "The subscriber NM1 loop has NM102 set to '2' (Non-Person Entity), but subscribers are always persons in 270 eligibility requests. This causes the payer to fail subscriber identification.", remediation: "Set NM102 to '1' for all subscriber-level NM1 loops in 270 transactions. Non-person entity codes are only valid for payer or employer NM1 loops." },
    { id: "e33", errorId: "VAL-270-003", snipLevel: 3, severity: "error", loop: "EQ Loop", segment: "EQ", element: "EQ01", position: "35:1", lineNumber: 35, message: "Service Type Code — Unrecognized code for 270", expected: "Valid service type code (1, 2, 30, 35, 48, 86, 98...)", actual: "XZ", ruleRef: "X12-270-EQ01-V", aiExplanation: "EQ01 service type code 'XZ' is not recognized in the X12 270 code set. The service type code defines what benefit/coverage category is being queried. An invalid code will cause the payer to reject the inquiry.", remediation: "Map the requested benefit categories to valid X12 270 service type codes. Use the current X12 270 implementation guide code table." },
    { id: "e34", errorId: "WAR-270-001", snipLevel: 2, severity: "warning", loop: "DMG Loop", segment: "DMG", element: "DMG02", position: "32:2", lineNumber: 32, message: "Date of Birth Format — Extra characters after date", expected: "CCYYMMDD (8 chars)", actual: "19850315T (9 chars with trailing T)", ruleRef: "X12-270-DMG02-WARN", aiExplanation: "The date of birth field contains a trailing 'T' character which appears to be a timezone indicator artifact from a datetime-to-date conversion. While the date portion is valid, the extra character may cause parsing issues.", remediation: "Strip any trailing characters from date fields during extraction. Ensure datetime-to-date conversions do not carry over time or timezone indicators." },
    { id: "e35", errorId: "WAR-270-002", snipLevel: 1, severity: "warning", loop: "ISA Loop", segment: "GS", element: "GS02", position: "7:2", lineNumber: 7, message: "Application Sender Code — Shorter than expected", expected: "15-character padded sender code", actual: "CLAIMSUB01 (10 chars, not padded)", ruleRef: "X12-GS02-PAD-WARN", aiExplanation: "GS02 should be padded to the agreed trading partner length. While the content is valid, the unpadded value may cause partner-side parsing issues if the receiver uses fixed-width parsing.", remediation: "Pad GS02 to the agreed length with spaces. Check your trading partner agreement for the expected sender code format and length." },
    { id: "e36", errorId: "VAL-270-004", snipLevel: 4, severity: "error", loop: "TRN Loop", segment: "TRN", element: "TRN02", position: "18:2", lineNumber: 18, message: "Trace Number — Duplicate within interchange", expected: "Unique reference number per 270 transaction", actual: "REF-2026-001 (already used in this interchange)", ruleRef: "X12-270-TRN02-UNIQ", aiExplanation: "TRN02 trace number 'REF-2026-001' is used in multiple transaction sets within the same interchange. Trace numbers must be unique to enable accurate response matching between 270 requests and 271 responses.", remediation: "Generate unique trace numbers per transaction set. Use a UUID or timestamp-based sequence to ensure global uniqueness within an interchange session." },
  ],
};

const FILE_TRANSACTIONS: Record<string, Transaction[]> = {
  f1: [
    { id: "t1", setId: "0001", controlNumber: "0001", status: "failed", errors: 8, warnings: 2, segments: 42, claimNumber: "CLM-2026-001", amount: "1,250.00" },
    { id: "t2", setId: "0002", controlNumber: "NULL", status: "failed", errors: 2, warnings: 0, segments: 38, claimNumber: "CLM-2026-002", amount: "875.50" },
    { id: "t3", setId: "0003", controlNumber: "0003", status: "passed", errors: 0, warnings: 1, segments: 35, claimNumber: "CLM-2026-003", amount: "340.00" },
    { id: "t4", setId: "0004", controlNumber: "0004", status: "passed", errors: 0, warnings: 0, segments: 29, claimNumber: "CLM-2026-004", amount: "2,100.75" },
    { id: "t5", setId: "0005", controlNumber: "0005", status: "passed", errors: 0, warnings: 0, segments: 31, claimNumber: "CLM-2026-005", amount: "560.00" },
    { id: "t6", setId: "0006", controlNumber: "0006", status: "passed", errors: 0, warnings: 0, segments: 27, claimNumber: "CLM-2026-006", amount: "430.25" },
    { id: "t7", setId: "0007", controlNumber: "0007", status: "passed", errors: 0, warnings: 0, segments: 33, claimNumber: "CLM-2026-007", amount: "990.00" },
    { id: "t8", setId: "0008", controlNumber: "0008", status: "passed", errors: 0, warnings: 0, segments: 28, claimNumber: "CLM-2026-008", amount: "770.50" },
  ],
  f3: [
    { id: "t10", setId: "0001", controlNumber: "0001", status: "failed", errors: 1, warnings: 3, segments: 39, claimNumber: "CLM-2026-050", amount: "450.00" },
    { id: "t11", setId: "0001", controlNumber: "0001", status: "warning", errors: 0, warnings: 2, segments: 35, claimNumber: "CLM-2026-051", amount: "670.00" },
    { id: "t12", setId: "0003", controlNumber: "0003", status: "passed", errors: 0, warnings: 0, segments: 30, claimNumber: "CLM-2026-052", amount: "1,100.00" },
    { id: "t13", setId: "0004", controlNumber: "0004", status: "failed", errors: 1, warnings: 0, segments: 28, claimNumber: "CLM-2026-053", amount: "290.00" },
    { id: "t14", setId: "0005", controlNumber: "0005", status: "passed", errors: 0, warnings: 0, segments: 32, claimNumber: "CLM-2026-054", amount: "820.00" },
    { id: "t15", setId: "0006", controlNumber: "0006", status: "passed", errors: 0, warnings: 0, segments: 26, claimNumber: "CLM-2026-055", amount: "380.00" },
  ],
  f5: [
    { id: "t20", setId: "0001", controlNumber: "0001", status: "failed", errors: 3, warnings: 1, segments: 18, claimNumber: undefined, amount: undefined },
    { id: "t21", setId: "0002", controlNumber: "0002", status: "failed", errors: 2, warnings: 1, segments: 22, claimNumber: undefined, amount: undefined },
    { id: "t22", setId: "0003", controlNumber: "0003", status: "passed", errors: 0, warnings: 0, segments: 16, claimNumber: undefined, amount: undefined },
    { id: "t23", setId: "0004", controlNumber: "0004", status: "passed", errors: 0, warnings: 0, segments: 19, claimNumber: undefined, amount: undefined },
  ],
  f2: [
    { id: "t30", setId: "0001", controlNumber: "0001", status: "passed", errors: 0, warnings: 0, segments: 38 },
    { id: "t31", setId: "0002", controlNumber: "0002", status: "passed", errors: 0, warnings: 0, segments: 41 },
    { id: "t32", setId: "0003", controlNumber: "0003", status: "passed", errors: 0, warnings: 0, segments: 33 },
    { id: "t33", setId: "0004", controlNumber: "0004", status: "passed", errors: 0, warnings: 0, segments: 36 },
    { id: "t34", setId: "0005", controlNumber: "0005", status: "passed", errors: 0, warnings: 0, segments: 29 },
  ],
  f4: [
    { id: "t40", setId: "0001", controlNumber: "0001", status: "passed", errors: 0, warnings: 0, segments: 24 },
    { id: "t41", setId: "0002", controlNumber: "0002", status: "passed", errors: 0, warnings: 0, segments: 28 },
    { id: "t42", setId: "0003", controlNumber: "0003", status: "passed", errors: 0, warnings: 0, segments: 21 },
  ],
  f6: [
    { id: "t50", setId: "0001", controlNumber: "0001", status: "passed", errors: 0, warnings: 1, segments: 12 },
    { id: "t51", setId: "0002", controlNumber: "0002", status: "passed", errors: 0, warnings: 0, segments: 10 },
    { id: "t52", setId: "0003", controlNumber: "0003", status: "passed", errors: 0, warnings: 0, segments: 11 },
    { id: "t53", setId: "0004", controlNumber: "0004", status: "passed", errors: 0, warnings: 0, segments: 9 },
  ],
};

const FILE_SNIP: Record<string, SnipLevel[]> = {
  f1: [
    { level: 1, name: "Transaction Set Integrity", description: "Header/trailer matching, segment count verification", status: "failed", violations: 1 },
    { level: 2, name: "Situational Segment Requirements", description: "Required situational segments per implementation guide", status: "failed", violations: 3 },
    { level: 3, name: "Segment Count Balancing", description: "Balanced segment counts across envelopes", status: "failed", violations: 2 },
    { level: 4, name: "Element-Level Requirements", description: "Required element values and format constraints", status: "failed", violations: 4 },
    { level: 5, name: "External Code Values", description: "Validation against external code sets (ICD, HCPCS, NPI)", status: "passed", violations: 0 },
    { level: 6, name: "Secondary Balancing", description: "Secondary balance checks and cross-segment consistency", status: "passed", violations: 0 },
    { level: 7, name: "Product-Specific Rules", description: "Implementation-specific business rules", status: "passed", violations: 0 },
  ],
  f3: [
    { level: 1, name: "Transaction Set Integrity", description: "Header/trailer matching, segment count verification", status: "failed", violations: 1 },
    { level: 2, name: "Situational Segment Requirements", description: "Required situational segments per implementation guide", status: "passed", violations: 0 },
    { level: 3, name: "Segment Count Balancing", description: "Balanced segment counts across envelopes", status: "passed", violations: 0 },
    { level: 4, name: "Element-Level Requirements", description: "Required element values and format constraints", status: "failed", violations: 1 },
    { level: 5, name: "External Code Values", description: "Validation against external code sets", status: "passed", violations: 0 },
    { level: 6, name: "Secondary Balancing", description: "Secondary balance checks", status: "passed", violations: 0 },
    { level: 7, name: "Product-Specific Rules", description: "Implementation-specific business rules", status: "passed", violations: 0 },
  ],
  f5: [
    { level: 1, name: "Transaction Set Integrity", description: "Header/trailer matching, segment count verification", status: "failed", violations: 1 },
    { level: 2, name: "Situational Segment Requirements", description: "Required situational segments", status: "failed", violations: 2 },
    { level: 3, name: "Segment Count Balancing", description: "Balanced segment counts", status: "passed", violations: 0 },
    { level: 4, name: "Element-Level Requirements", description: "Required element values", status: "failed", violations: 2 },
    { level: 5, name: "External Code Values", description: "External code set validation", status: "passed", violations: 0 },
    { level: 6, name: "Secondary Balancing", description: "Secondary balance checks", status: "passed", violations: 0 },
    { level: 7, name: "Product-Specific Rules", description: "Implementation-specific rules", status: "passed", violations: 0 },
  ],
};

const PASSED_SNIP: SnipLevel[] = [1,2,3,4,5,6,7].map(l => ({ level: l, name: ["Transaction Set Integrity","Situational Segment Requirements","Segment Count Balancing","Element-Level Requirements","External Code Values","Secondary Balancing","Product-Specific Rules"][l-1], description: "", status: "passed" as const, violations: 0 }));

const FILE_SEGMENTS: Record<string, SegmentResult[]> = {
  f1: [
    { name: "ISA", count: 1, errors: 1, warnings: 0, status: "failed", firstOccurrence: "1:1" },
    { name: "GS", count: 1, errors: 0, warnings: 1, status: "warning", firstOccurrence: "7:1" },
    { name: "ST", count: 8, errors: 2, warnings: 0, status: "failed", firstOccurrence: "15:1" },
    { name: "BHT", count: 8, errors: 0, warnings: 0, status: "passed", firstOccurrence: "16:1" },
    { name: "NM1", count: 24, errors: 2, warnings: 0, status: "failed", firstOccurrence: "31:1" },
    { name: "CLM", count: 8, errors: 3, warnings: 1, status: "failed", firstOccurrence: "23:1" },
    { name: "DTP", count: 16, errors: 1, warnings: 0, status: "failed", firstOccurrence: "38:1" },
    { name: "SV1", count: 12, errors: 1, warnings: 0, status: "failed", firstOccurrence: "52:1" },
    { name: "REF", count: 10, errors: 1, warnings: 0, status: "failed", firstOccurrence: "45:1" },
    { name: "PWK", count: 4, errors: 0, warnings: 1, status: "warning", firstOccurrence: "47:1" },
    { name: "SE", count: 8, errors: 0, warnings: 0, status: "passed", firstOccurrence: "68:1" },
    { name: "GE", count: 1, errors: 0, warnings: 0, status: "passed", firstOccurrence: "69:1" },
    { name: "IEA", count: 1, errors: 0, warnings: 0, status: "passed", firstOccurrence: "70:1" },
  ],
  f5: [
    { name: "ISA", count: 1, errors: 1, warnings: 0, status: "failed", firstOccurrence: "1:1" },
    { name: "GS", count: 1, errors: 0, warnings: 1, status: "warning", firstOccurrence: "7:1" },
    { name: "ST", count: 4, errors: 1, warnings: 0, status: "failed", firstOccurrence: "15:1" },
    { name: "BHT", count: 4, errors: 0, warnings: 0, status: "passed", firstOccurrence: "16:1" },
    { name: "HL", count: 12, errors: 1, warnings: 0, status: "failed", firstOccurrence: "20:1" },
    { name: "NM1", count: 8, errors: 1, warnings: 0, status: "failed", firstOccurrence: "28:1" },
    { name: "TRN", count: 4, errors: 1, warnings: 0, status: "failed", firstOccurrence: "18:1" },
    { name: "DMG", count: 4, errors: 0, warnings: 1, status: "warning", firstOccurrence: "32:1" },
    { name: "EQ", count: 4, errors: 1, warnings: 0, status: "failed", firstOccurrence: "35:1" },
    { name: "SE", count: 4, errors: 0, warnings: 0, status: "passed", firstOccurrence: "40:1" },
  ],
};

const RAW_EDI: Record<string, RawLine[]> = {
  f1: [
    { lineNumber: 1, content: "ISA*00*          *00*          *ZZ*CLAIMSUBMIT01   *ZZ*PAYER00012345   *260316*1015*^*00501*000000104*0*P* ", hasError: true, errorId: "VAL-115", segment: "ISA" },
    { lineNumber: 7, content: "GS*HC*CLAIMSUBMIT01*PAYER00012345*20250101*1015*1*X*005010X222A1", hasError: false, segment: "GS" },
    { lineNumber: 15, content: "ST*837*NULL", hasError: true, errorId: "VAL-203", segment: "ST" },
    { lineNumber: 16, content: "BHT*0019*00*2026031601*20260316*1015*CH", hasError: false, segment: "BHT" },
    { lineNumber: 23, content: "CLM**0.00*11:B:1*YY*A*1*C*I", hasError: true, errorId: "VAL-201", segment: "CLM" },
    { lineNumber: 24, content: "CLM*CLM2026002*0.00*11:B:1*YY*A*1*C*I", hasError: true, errorId: "VAL-501", segment: "CLM" },
    { lineNumber: 31, content: "NM1**2*SMITHJOHN*WILLIAM***34*1234567890", hasError: true, errorId: "VAL-305", segment: "NM1" },
    { lineNumber: 33, content: "NM1*85*1*DRJONES*ALICE***XX*12345", hasError: true, errorId: "VAL-802", segment: "NM1" },
    { lineNumber: 38, content: "DTP*472*D8*2026/03/16", hasError: true, errorId: "VAL-701", segment: "DTP" },
    { lineNumber: 45, content: "REF*EJ*AB1", hasError: true, errorId: "VAL-412", segment: "REF" },
    { lineNumber: 47, content: "PWK*OZ*EL***AC*ATTACH-001", hasError: false, segment: "PWK" },
    { lineNumber: 52, content: "SV1*HC:99213**EMPTY*UN*1**1", hasError: true, errorId: "VAL-602", segment: "SV1" },
    { lineNumber: 68, content: "SE*42*0001", hasError: false, segment: "SE" },
    { lineNumber: 69, content: "GE*8*1", hasError: false, segment: "GE" },
    { lineNumber: 70, content: "IEA*1*000000104", hasError: false, segment: "IEA" },
  ],
};

const ERROR_TREE: ErrorNode[] = [
  { id: "isa-loop", name: "ISA Loop", type: "loop", children: [
    { id: "gs-seg", name: "GS Segment", type: "segment", children: [
      { id: "st-seg", name: "ST Segment", type: "segment", children: [
        { id: "st02", name: "ST02 Element", type: "element", hasError: true, errorId: "VAL-203" },
        { id: "st01", name: "ST01 Element", type: "element" },
      ]},
      { id: "isa16", name: "ISA16 Element", type: "element", hasError: true, errorId: "VAL-115" },
    ]},
  ]},
  { id: "clm-loop", name: "CLM Loop", type: "loop", children: [
    { id: "clm-seg", name: "CLM Segment", type: "segment", children: [
      { id: "clm01", name: "CLM01 Element", type: "element", hasError: true, errorId: "VAL-201" },
      { id: "clm02", name: "CLM02 Element", type: "element", hasError: true, errorId: "VAL-501" },
      { id: "clm05-3", name: "CLM05-3 Element", type: "element", hasError: true, errorId: "VAL-209" },
    ]},
    { id: "nm1-seg", name: "NM1 Segment", type: "segment", children: [
      { id: "nm101", name: "NM101 Element", type: "element", hasError: true, errorId: "VAL-305" },
      { id: "nm109", name: "NM109 Element", type: "element", hasError: true, errorId: "VAL-802" },
    ]},
    { id: "ref-seg", name: "REF Segment", type: "segment", children: [
      { id: "ref01", name: "REF01 Element", type: "element" },
      { id: "ref02", name: "REF02 Element", type: "element", hasError: true, errorId: "VAL-412" },
    ]},
    { id: "dtp-seg", name: "DTP Segment", type: "segment", children: [
      { id: "dtp03", name: "DTP03 Element", type: "element", hasError: true, errorId: "VAL-701" },
    ]},
    { id: "sv1-seg", name: "SV1 Segment", type: "segment", children: [
      { id: "sv102", name: "SV102 Element", type: "element", hasError: true, errorId: "VAL-602" },
    ]},
  ]},
];

const DEFAULT_FIELD_MAPPINGS: FieldMapping[] = [
  { id: "m1", source: "ClaimNumber", target: "claim_id", type: "string" },
  { id: "m2", source: "ErrorMessage", target: "error_message", type: "string" },
  { id: "m3", source: "SNIPLevel", target: "snip_level", type: "integer" },
  { id: "m4", source: "FileStatus", target: "status", type: "string", hardcoded: "FAILED" },
];
const DEFAULT_CSV_COLUMNS: CsvColumn[] = [
  { id: "c1", columnName: "Claim_ID", sourceField: "CLM01" },
  { id: "c2", columnName: "Error_Message", sourceField: "ErrorMessage" },
  { id: "c3", columnName: "SNIP_Level", sourceField: "SNIPLevel" },
  { id: "c4", columnName: "File_Name", sourceField: "FileName" },
];
const DEFAULT_FIELDS = [
  { id: "fileName", label: "File Name", selected: true },
  { id: "claimNumber", label: "Claim Number", selected: true },
  { id: "errorId", label: "Error ID", selected: true },
  { id: "errorMessage", label: "Error Message", selected: true },
  { id: "snipLevel", label: "SNIP Level", selected: false },
  { id: "segment", label: "Segment", selected: false },
  { id: "element", label: "Element", selected: false },
  { id: "timestamp", label: "Timestamp", selected: false },
];

// ─── Full EDI content for inline editor ───────────────────────────────────────
const FULL_EDI_CONTENT: Record<string, string> = {
  f1: `ISA*00*          *00*          *ZZ*CLAIMSUBMIT01   *ZZ*PAYER00012345   *260316*1015*^*00501*000000104*0*P* ~
GS*HC*CLAIMSUBMIT01*PAYER00012345*20250101*1015*1*X*005010X222A1~
ST*837*NULL~
BHT*0019*00*2026031601*20260316*1015*CH~
NM1*41*2*ACME HOSPITAL*****46*ACME001~
PER*IC*BILLING DEPT*TE*5551234567~
NM1*40*2*BLUE CROSS PAYER*****46*PAYER001~
HL*1**20*1~
NM1*85*1*DRJONES*ALICE***XX*12345~
NM1*87*2*ACME CLINIC*****XX*1234567890~
HL*2*1*22*0~
SBR*P*18*GROUP001****MC~
NM1*IL**SMITH2*JOHN****MI*AB1~
NM1*PR*2*BLUE CROSS*****PI*PAYER001~
CLM**0.00*11:B:1**A*1*C*I~
DTP*472*D8*2026/03/16~
REF*EJ*AB1~
HI*BK:J0600~
SV1*HC:99213**EMPTY*UN*1**1~
PWK*OZ*EL***AC*ATTACH-001~
SE*42*0001~
GE*1*1~
IEA*1*000000104~`,
  f3: `ISA*00*          *00*          *ZQ*CLAIMSUBMIT01   *ZZ*PAYER00012345   *260316*1016*^*00501*000000106*0*P*:~
GS*HC*CLAIMSUBMIT01*PAYER00012345*20260316*1016*1*X*005010X222A1~
ST*837*0001~
BHT*0019*00*2026031602*20260316*1016*CH~
NM1*41*2*ACME HOSPITAL*****46*ACME001~
PER*IC*BILLING DEPT*TE*5551234567~
NM1*40*2*BLUE CROSS PAYER*****46*PAYER001~
HL*1**20*1~
NM1*85*1*JONES*ALICE***XX*1234567890~
HL*2*1*22*0~
SBR*P*18*GROUP001****MC~
NM1*IL**SMITH2*JOHN****MI*MEM12345~
CLM*CLM2026050*450.00*11:B:1**A*1*C*~
DTP*472*D8*20260310~
DTP*435*RD8*20260310-20260301~
REF*XX*CLM2026050~
HI*BK:J0600~
SV1*HC:99213*450.00*UN*1**7~
SE*18*0001~
ST*837*0001~
BHT*0019*00*2026031603*20260316*1016*CH~
NM1*85*1*JONES*ALICE***XX*1234567890~
CLM*CLM2026051*670.00*11:B:1**A*1*C*Y~
SE*12*0001~
GE*1*1~
IEA*1*000000106~`,
  f5: `ISA*00*          *00*          *ZQ*CLAIMSUB01     *ZZ*PAYER00012345   *260316*1018*^*00501*000000298*0*P*:~
GS*HS*CLAIMSUB01*PAYER00012345*20260316*1018*1*X*005010X279A1~
ST*270*0001~
BHT*0022*13*2026031601*20260316*1018~
HL*1**99*1~
NM1*PR*2*BLUE CROSS*****PI*PAYER001~
HL*2*1*21*1~
NM1*1P*1*JONES*ALICE***XX*1234567890~
HL*3*2*22*0~
TRN*1*REF-2026-001*9PAYER001~
NM1*IL*2*SMITH*JOHN****MI*MEM12345~
DMG*D8*19850315T*M~
EQ*XZ~
SE*13*0001~
GE*1*1~
IEA*1*000000298~`,
};

// ─── Inline EDI Editor (for Raw tab) ───────��─────────────────────────────────
function InlineEDIEditor({ fileId, fileName, errorLines }: { fileId: string; fileName: string; errorLines: Set<number> }) {
  const initial = FULL_EDI_CONTENT[fileId] || "// Raw EDI content not available for this file type.";
  const [content, setContent] = useState(initial);
  const [showHighlight, setShowHighlight] = useState(true);
  const [parseMs, setParseMs] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const lineCount = content.split("\n").length;

  const highlighted = useMemo(() => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const lineNum = idx + 1;
      const hasErr = errorLines.has(lineNum);
      const esc = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const colored = esc
        .replace(/^([A-Z0-9]{2,3})(\*|~|$)/, (_m, name: string, rest: string) => {
          const structural = ["ISA","IEA","GS","GE","ST","SE"].includes(name);
          return `<span style="color:${structural ? "#8B5CF6" : "#10B981"};font-weight:700">${name}</span><span style="color:#334155">${rest}</span>`;
        })
        .replace(/\*/g, `<span style="color:#334155">*</span>`)
        .replace(/~/g, `<span style="color:#475569;font-weight:700">~</span>`);
      const bg = hasErr ? "background:rgba(239,68,68,0.09);" : "";
      const bl = hasErr ? "border-left:3px solid #EF4444;padding-left:4px;" : "border-left:3px solid transparent;padding-left:4px;";
      return `<span style="display:block;${bg}${bl}">${colored || " "}</span>`;
    }).join("");
  }, [content, errorLines, showHighlight]);

  const handleChange = (val: string) => {
    const t0 = performance.now();
    setContent(val);
    setIsDirty(true);
    setSaved(false);
    setParseMs(Math.round((performance.now() - t0) * 100) / 100);
  };

  const handleSave = () => {
    setSaved(true);
    setIsDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.em}30`, background: "#060C17" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${C.glassBorder}`, background: "rgba(7,12,24,0.95)" }}>
        <Terminal className="w-3.5 h-3.5" style={{ color: C.em }} />
        <span className="font-mono flex-1" style={{ color: C.sub, fontSize: "0.68rem" }}>{fileName} — Live Editor</span>
        <span className="font-mono" style={{ color: C.muted, fontSize: "0.62rem" }}>{lineCount} lines{parseMs !== null ? ` · ${parseMs}ms` : ""}</span>
        {isDirty && <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: C.warn, fontSize: "0.6rem", fontWeight: 700, border: `1px solid ${C.warn}30` }}>UNSAVED</span>}
        <button
          onClick={() => setShowHighlight(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono"
          style={{ background: showHighlight ? C.infoDim : C.glassBg, border: `1px solid ${showHighlight ? `${C.info}35` : C.glassBorder}`, color: showHighlight ? C.info : C.muted, fontSize: "0.62rem", fontWeight: 700 }}
        >
          {showHighlight ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {showHighlight ? "HIGHLIGHT ON" : "HIGHLIGHT OFF"}
        </button>
        <button
          onClick={() => { setContent(initial); setIsDirty(false); setParseMs(null); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono"
          style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.muted, fontSize: "0.62rem" }}
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(content).catch(() => {})}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono"
          style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.muted, fontSize: "0.62rem" }}
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono"
          style={{ background: saved ? "rgba(16,185,129,0.15)" : C.em, color: "#fff", fontSize: "0.62rem", fontWeight: 700, border: `1px solid ${saved ? C.em : "transparent"}`, boxShadow: saved ? "none" : `0 0 12px ${C.emGlow}` }}
        >
          {saved ? <CheckCircle2 className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      {/* Editor body */}
      <div className="flex" style={{ height: 340 }}>
        {/* Line numbers */}
        <div className="select-none flex-shrink-0 overflow-hidden" style={{ width: 48, background: "rgba(5,9,20,0.7)", borderRight: `1px solid ${C.glassBorder}`, paddingTop: 10 }}>
          {Array.from({ length: lineCount }, (_, i) => {
            const ln = i + 1;
            const hasErr = errorLines.has(ln);
            return (
              <div key={ln} className="flex items-center justify-end pr-2" style={{ height: "1.5rem" }}>
                {hasErr && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1" style={{ background: C.err }} />}
                <span className="font-mono" style={{ color: hasErr ? C.err : C.muted, fontSize: "0.62rem", lineHeight: "1.5rem", fontWeight: hasErr ? 700 : 400 }}>{ln}</span>
              </div>
            );
          })}
        </div>

        {/* Code area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Highlight layer */}
          <div
            ref={overlayRef}
            className="absolute inset-0 overflow-auto pointer-events-none font-mono"
            style={{ padding: "10px 10px", fontSize: "0.75rem", lineHeight: "1.5rem", whiteSpace: "pre", color: "transparent", zIndex: 1 }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => handleChange(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="absolute inset-0 w-full h-full resize-none outline-none font-mono"
            style={{
              background: "transparent",
              color: showHighlight ? "transparent" : "#94A3B8",
              caretColor: C.em,
              padding: "10px 10px",
              fontSize: "0.75rem",
              lineHeight: "1.5rem",
              border: "none",
              zIndex: 2,
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
            }}
          />
        </div>
      </div>

      {/* Error gutter */}
      {errorLines.size > 0 && (
        <div className="px-4 py-2 flex items-center gap-3 flex-wrap" style={{ borderTop: `1px solid ${C.glassBorder}`, background: "rgba(239,68,68,0.05)" }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: C.err }} />
          <span className="font-mono" style={{ color: C.err, fontSize: "0.62rem", fontWeight: 700 }}>{errorLines.size} error line{errorLines.size !== 1 ? "s" : ""} highlighted</span>
          <span style={{ color: C.muted, fontSize: "0.62rem" }}>— Red left border = validation error on that segment. Edit to fix and re-validate.</span>
        </div>
      )}
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function StatusPill({ status, size = "sm" }: { status: string; size?: "xs" | "sm" }) {
  const cfg = {
    passed: { bg: `${C.em}12`, border: `${C.em}35`, color: C.em, label: "PASSED" },
    failed: { bg: `${C.err}12`, border: `${C.err}35`, color: C.err, label: "FAILED" },
    warning: { bg: `${C.warn}12`, border: `${C.warn}35`, color: C.warn, label: "WARNING" },
    "not-checked": { bg: C.glassBg, border: C.glassBorder, color: C.muted, label: "NOT CHECKED" },
  }[status] ?? { bg: C.glassBg, border: C.glassBorder, color: C.muted, label: status.toUpperCase() };

  const pad = size === "xs" ? "2px 8px" : "3px 10px";
  return (
    <span className="font-mono uppercase" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: size === "xs" ? "0.6rem" : "0.67rem", fontWeight: 700, padding: pad, borderRadius: 6, letterSpacing: "0.06em", display: "inline-block" }}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="font-mono px-2 py-0.5 rounded" style={{ background: C.emDim, border: `1px solid ${C.em}35`, color: C.em, fontSize: "0.65rem", fontWeight: 700 }}>
      {type}
    </span>
  );
}

function SeverityDot({ severity }: { severity: "error" | "warning" }) {
  const color = severity === "error" ? C.err : C.warn;
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />;
}

// ─── Error Tree Node ──────────────────────────────────────────────────────────
function ErrorTreeNode({ node, depth = 0, selectedId, onSelect }: { node: ErrorNode; depth?: number; selectedId: string | null; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = !!node.children?.length;
  const isSelected = node.errorId === selectedId;
  const typeColor = { loop: C.purple, segment: C.info, element: C.em }[node.type];

  return (
    <div style={{ marginLeft: depth * 14 }}>
      <button
        onClick={() => { if (hasChildren) setOpen(o => !o); if (node.errorId) onSelect(node.errorId); }}
        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg transition-all text-left"
        style={{ background: isSelected ? C.emDim : "transparent", border: isSelected ? `1px solid ${C.em}30` : "1px solid transparent" }}
      >
        {hasChildren
          ? open ? <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: C.muted }} /> : <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: C.muted }} />
          : <span className="w-3 flex-shrink-0" />}
        {node.hasError && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.err }} />}
        <span className="font-mono" style={{ color: node.hasError ? C.err : typeColor, fontSize: "0.78rem", fontWeight: node.hasError ? 700 : 400 }}>
          {node.name}
        </span>
        {node.hasError && <span className="ml-auto font-mono px-1.5 py-0.5 rounded" style={{ background: `${C.err}15`, color: C.err, fontSize: "0.6rem", fontWeight: 700 }}>{node.errorId}</span>}
      </button>
      {open && hasChildren && node.children!.map(c => <ErrorTreeNode key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />)}
    </div>
  );
}

// ─── Tabbed File Detail ────────────────���──────────────────────────────────────
type DetailTab = "summary" | "errors" | "transactions" | "segments" | "explorer" | "raw" | "heatmap";

function FileDetailPanel({ file, onClose }: { file: ValidationFile; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>("summary");
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [errSearch, setErrSearch] = useState("");
  const [errSeverity, setErrSeverity] = useState<"all" | "error" | "warning">("all");
  const [errSnip, setErrSnip] = useState<number | "all">("all");
  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const [rawEditMode, setRawEditMode] = useState(false);

  const errors = FILE_ERRORS[file.id] ?? [];
  const transactions = FILE_TRANSACTIONS[file.id] ?? [];
  const snipLevels = FILE_SNIP[file.id] ?? PASSED_SNIP;
  const segments = FILE_SEGMENTS[file.id] ?? [];
  const rawLines = RAW_EDI[file.id] ?? [];

  const filteredErrors = useMemo(() => errors.filter(e => {
    const q = errSearch.toLowerCase();
    const matchText = e.errorId.toLowerCase().includes(q) || e.message.toLowerCase().includes(q) || e.segment.toLowerCase().includes(q) || e.element.toLowerCase().includes(q);
    const matchSev = errSeverity === "all" || e.severity === errSeverity;
    const matchSnip = errSnip === "all" || e.snipLevel === errSnip;
    return matchText && matchSev && matchSnip;
  }), [errors, errSearch, errSeverity, errSnip]);

  const selectedError = errors.find(e => e.errorId === selectedErrorId) ?? null;

  const TABS: { id: DetailTab; label: string; icon: React.FC<any>; badge?: number }[] = [
    { id: "summary", label: "Summary", icon: BarChart3 },
    { id: "errors", label: "All Errors", icon: AlertCircle, badge: errors.length },
    { id: "transactions", label: "Transactions", icon: Layers, badge: transactions.length },
    { id: "segments", label: "Segments", icon: Hash },
    { id: "explorer", label: "Error Explorer", icon: Eye },
    { id: "raw", label: "Raw EDI", icon: Terminal },
    { id: "heatmap", label: "Heatmap", icon: TrendingUp },
  ];

  const copyLine = (content: string, ln: number) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedLine(ln);
    setTimeout(() => setCopiedLine(null), 1500);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.em}30`, background: "rgba(8,14,26,0.95)" }}>
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.glassBorder}`, background: "rgba(16,185,129,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.emDim, border: `1px solid ${C.em}35` }}>
            <FileCode2 className="w-4 h-4" style={{ color: C.em }} />
          </div>
          <div>
            <div className="font-mono" style={{ color: C.text, fontSize: "0.9rem", fontWeight: 700 }}>{file.name}</div>
            <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>
              {file.fileSize} · {file.transactionCount} transactions · {file.processingDuration}
            </div>
          </div>
          <StatusPill status={file.status} />
          <TypeBadge type={file.type} />
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
          <X className="w-4 h-4" style={{ color: C.muted }} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: `1px solid ${C.glassBorder}` }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-3 relative flex-shrink-0 transition-all"
            style={{ color: tab === t.id ? C.em : C.muted }}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="font-mono" style={{ fontSize: "0.72rem", fontWeight: tab === t.id ? 700 : 500 }}>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className="font-mono px-1.5 rounded" style={{ background: t.id === "errors" ? `${C.err}20` : C.emDim, color: t.id === "errors" ? C.err : C.em, fontSize: "0.6rem", fontWeight: 700 }}>{t.badge}</span>
            )}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: C.em }} />}
          </button>
        ))}
      </div>

      {/* ── SUMMARY TAB ── */}
      {tab === "summary" && (
        <div className="p-5">
          <div className="grid grid-cols-3 gap-5 mb-5">
            {/* File metadata */}
            <div className="col-span-1 p-4 rounded-xl space-y-3" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}` }}>
              <div className="font-mono mb-3" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>FILE METADATA</div>
              {[
                { label: "File Name", value: file.name },
                { label: "Type", value: file.type },
                { label: "EDI Version", value: file.ediVersion },
                { label: "Interchange ID", value: file.interchangeId },
                { label: "Sender ID", value: file.senderId },
                { label: "Receiver ID", value: file.receiverId },
                { label: "Timestamp", value: file.timestamp },
                { label: "File Size", value: file.fileSize },
                { label: "Processing Time", value: file.processingDuration },
                { label: "Transaction Count", value: `${file.transactionCount}` },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-2">
                  <span style={{ color: C.muted, fontSize: "0.72rem", flexShrink: 0 }}>{row.label}</span>
                  <span className="font-mono text-right" style={{ color: C.text, fontSize: "0.72rem", fontWeight: 600, wordBreak: "break-all" }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Validation summary */}
            <div className="col-span-1 space-y-3">
              <div className="p-4 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}` }}>
                <div className="font-mono mb-3" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>VALIDATION SUMMARY</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Errors", value: file.errors, color: file.errors > 0 ? C.err : C.em },
                    { label: "Warnings", value: file.warnings, color: file.warnings > 0 ? C.warn : C.em },
                    { label: "SNIP Violations", value: file.snip, color: file.snip > 0 ? C.purple : C.em },
                    { label: "Transactions", value: file.transactionCount, color: C.info },
                  ].map(m => (
                    <div key={m.label} className="p-3 rounded-lg" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                      <div className="font-mono" style={{ color: m.color, fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{m.value}</div>
                      <div style={{ color: C.muted, fontSize: "0.68rem", marginTop: 2 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall status */}
              <div className="p-4 rounded-xl" style={{ background: file.status === "failed" ? C.errDim : file.status === "warning" ? C.warnDim : C.emDim, border: `1px solid ${file.status === "failed" ? `${C.err}30` : file.status === "warning" ? `${C.warn}30` : `${C.em}30`}` }}>
                <div className="flex items-center gap-2 mb-2">
                  {file.status === "failed" ? <AlertCircle className="w-4 h-4" style={{ color: C.err }} /> : file.status === "warning" ? <AlertTriangle className="w-4 h-4" style={{ color: C.warn }} /> : <CheckCircle2 className="w-4 h-4" style={{ color: C.em }} />}
                  <span className="font-mono" style={{ color: file.status === "failed" ? C.err : file.status === "warning" ? C.warn : C.em, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em" }}>
                    {file.status === "failed" ? "VALIDATION FAILED" : file.status === "warning" ? "PASSED WITH WARNINGS" : "VALIDATION PASSED"}
                  </span>
                </div>
                <p style={{ color: C.sub, fontSize: "0.72rem", lineHeight: 1.6 }}>
                  {file.status === "failed"
                    ? `${file.errors} errors must be resolved before this file can be processed.`
                    : file.status === "warning"
                    ? `File processed with ${file.warnings} non-critical warnings. Review recommended.`
                    : "All validation rules passed. File processed successfully."}
                </p>
              </div>
            </div>

            {/* SNIP compliance */}
            <div className="col-span-1 p-4 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(16px)" }}>
              <div className="font-mono mb-3" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>SNIP COMPLIANCE (1–7)</div>
              <div className="space-y-2">
                {snipLevels.map(s => (
                  <div key={s.level} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: s.status === "failed" ? `${C.err}07` : C.glassBg, border: `1px solid ${s.status === "failed" ? `${C.err}25` : C.glassBorder}`, backdropFilter: "blur(8px)" }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 font-mono" style={{ background: s.status === "failed" ? `${C.err}18` : s.status === "passed" ? `${C.em}12` : C.glassBg, color: s.status === "failed" ? C.err : s.status === "passed" ? C.em : C.muted, fontSize: "0.65rem", fontWeight: 800 }}>
                      {s.level}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ color: s.status === "failed" ? C.err : C.text, fontSize: "0.72rem", fontWeight: 600 }} className="truncate">{s.name}</div>
                    </div>
                    {s.violations > 0
                      ? <span className="font-mono flex-shrink-0" style={{ color: C.err, fontSize: "0.65rem", fontWeight: 700 }}>{s.violations}✗</span>
                      : s.status === "passed" ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: C.em }} /> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BA-friendly summary */}
          {errors.length > 0 && (
            <div className="p-4 rounded-xl" style={{ background: `${C.warn}06`, border: `1px solid ${C.warn}20` }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" style={{ color: C.warn }} />
                <span style={{ color: C.warn, fontSize: "0.78rem", fontWeight: 700 }}>Business-Friendly Issue Summary</span>
                <span style={{ color: C.muted, fontSize: "0.7rem" }}>— Plain-English for BA / BPaaS teams</span>
              </div>
              <div className="space-y-2">
                {[
                  `${errors.filter(e => e.element.includes("CLM01")).length} claim(s) are missing claim numbers (CLM01 is null) — these cannot be adjudicated.`,
                  `${errors.filter(e => e.segment === "NM1").length} NM1 segment(s) have entity identifier or NPI issues — provider/subscriber cannot be identified.`,
                  `${errors.filter(e => e.severity === "error" && e.segment === "DTP").length > 0 ? "1 or more" : "No"} service dates are in an invalid format — payer systems will reject these transactions.`,
                  `${errors.filter(e => e.severity === "warning").length} non-critical warning(s) detected — review recommended before next batch submission.`,
                ].filter((_, i) => i === 0 || errors.length > 0).map((line, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 font-mono" style={{ background: i < 3 ? `${C.err}15` : `${C.warn}12`, color: i < 3 ? C.err : C.warn, fontSize: "0.6rem", fontWeight: 800 }}>
                      {i < 3 ? "✗" : "!"}
                    </div>
                    <p style={{ color: C.sub, fontSize: "0.78rem", lineHeight: 1.6 }}>{line}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ALL ERRORS TAB ── */}
      {tab === "errors" && (
        <div className="p-5">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(12px)" }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.muted }} />
              <input type="text" placeholder="Search by ID, message, segment, element..." value={errSearch} onChange={e => setErrSearch(e.target.value)} className="flex-1 bg-transparent outline-none font-mono" style={{ color: C.text, fontSize: "0.78rem" }} />
              {errSearch && <button onClick={() => setErrSearch("")}><X className="w-3 h-3" style={{ color: C.muted }} /></button>}
            </div>
            <div className="flex gap-1.5">
              {(["all", "error", "warning"] as const).map(s => (
                <button key={s} onClick={() => setErrSeverity(s)} className="px-3 py-2 rounded-lg font-mono transition-all" style={{ background: errSeverity === s ? (s === "error" ? C.errDim : s === "warning" ? C.warnDim : C.emDim) : C.glassBg, border: `1px solid ${errSeverity === s ? (s === "error" ? `${C.err}35` : s === "warning" ? `${C.warn}35` : `${C.em}35`) : C.glassBorder}`, color: errSeverity === s ? (s === "error" ? C.err : s === "warning" ? C.warn : C.em) : C.muted, fontSize: "0.7rem", fontWeight: 700, backdropFilter: "blur(8px)" }}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {(["all", 1, 2, 3, 4, 5, 6, 7] as const).map(s => (
                <button key={s} onClick={() => setErrSnip(s)} className="px-2.5 py-2 rounded-lg font-mono transition-all" style={{ background: errSnip === s ? C.purpleDim : C.glassBg, border: `1px solid ${errSnip === s ? `${C.purple}35` : C.glassBorder}`, color: errSnip === s ? C.purple : C.muted, fontSize: "0.68rem", fontWeight: 700, backdropFilter: "blur(8px)" }}>
                  {s === "all" ? "ALL" : `S${s}`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ color: C.muted, fontSize: "0.7rem", marginBottom: 12 }} className="font-mono">
            {filteredErrors.length} of {errors.length} errors shown
          </div>

          {filteredErrors.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: C.em }} />
              <p style={{ color: C.muted, fontSize: "0.82rem" }}>No errors match the current filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredErrors.map(err => (
                <ErrorRow key={err.id} err={err} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {tab === "transactions" && (
        <div className="p-5">
          <div className="mb-4 flex items-center gap-4">
            <div style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Transaction Set Breakdown</div>
            <div className="flex gap-2">
              {[
                { label: "Passed", value: transactions.filter(t => t.status === "passed").length, color: C.em },
                { label: "Failed", value: transactions.filter(t => t.status === "failed").length, color: C.err },
                { label: "Warning", value: transactions.filter(t => t.status === "warning").length, color: C.warn },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono" style={{ background: `${s.color}12`, border: `1px solid ${s.color}30`, color: s.color, fontSize: "0.68rem", fontWeight: 700 }}>
                  {s.value} {s.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.glassBorder}` }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: C.glassBg, borderBottom: `1px solid ${C.glassBorder}` }}>
                  {["SET ID", "CONTROL #", "STATUS", "ERRORS", "WARNINGS", "SEGMENTS", "CLAIM #", "AMOUNT"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-mono" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id} style={{ borderBottom: i < transactions.length - 1 ? `1px solid ${C.glassBorder}` : "none", background: tx.status === "failed" ? `${C.err}04` : tx.status === "warning" ? `${C.warn}04` : undefined }}>
                    <td className="py-3 px-4">
                      <span className="font-mono" style={{ color: C.em, fontSize: "0.78rem", fontWeight: 700 }}>ST-{tx.setId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono" style={{ color: tx.controlNumber === "NULL" ? C.err : C.text, fontSize: "0.78rem" }}>{tx.controlNumber}</span>
                    </td>
                    <td className="py-3 px-4"><StatusPill status={tx.status} size="xs" /></td>
                    <td className="py-3 px-4">
                      <span className="font-mono" style={{ color: tx.errors > 0 ? C.err : C.muted, fontSize: "0.78rem", fontWeight: tx.errors > 0 ? 700 : 400 }}>{tx.errors}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono" style={{ color: tx.warnings > 0 ? C.warn : C.muted, fontSize: "0.78rem", fontWeight: tx.warnings > 0 ? 700 : 400 }}>{tx.warnings}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono" style={{ color: C.sub, fontSize: "0.78rem" }}>{tx.segments}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono" style={{ color: C.sub, fontSize: "0.75rem" }}>{tx.claimNumber ?? "—"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono" style={{ color: tx.amount ? C.em : C.muted, fontSize: "0.78rem" }}>{tx.amount ? `$${tx.amount}` : "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SEGMENTS TAB ── */}
      {tab === "segments" && (
        <div className="p-5">
          <div className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Segment-Level Validation Results</div>

          {segments.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: C.em }} />
              <p style={{ color: C.muted, fontSize: "0.82rem" }}>All segments passed validation for this file.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden mb-5" style={{ border: `1px solid ${C.glassBorder}` }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: C.glassBg, borderBottom: `1px solid ${C.glassBorder}` }}>
                      {["SEGMENT", "STATUS", "OCCURRENCES", "ERRORS", "WARNINGS", "FIRST AT"].map(h => (
                        <th key={h} className="text-left py-3 px-4 font-mono" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((seg, i) => (
                      <tr key={seg.name} style={{ borderBottom: i < segments.length - 1 ? `1px solid ${C.glassBorder}` : "none", background: seg.status === "failed" ? `${C.err}04` : seg.status === "warning" ? `${C.warn}04` : undefined }}>
                        <td className="py-3 px-4">
                          <span className="font-mono" style={{ color: C.em, fontSize: "0.82rem", fontWeight: 700 }}>{seg.name}</span>
                        </td>
                        <td className="py-3 px-4"><StatusPill status={seg.status} size="xs" /></td>
                        <td className="py-3 px-4">
                          <span className="font-mono" style={{ color: C.sub, fontSize: "0.78rem" }}>{seg.count}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono" style={{ color: seg.errors > 0 ? C.err : C.muted, fontSize: "0.78rem", fontWeight: seg.errors > 0 ? 700 : 400 }}>{seg.errors}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono" style={{ color: seg.warnings > 0 ? C.warn : C.muted, fontSize: "0.78rem", fontWeight: seg.warnings > 0 ? 600 : 400 }}>{seg.warnings}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono" style={{ color: C.muted, fontSize: "0.72rem" }}>Line {seg.firstOccurrence}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mini visual */}
              <div className="p-4 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(12px)" }}>
                <div className="font-mono mb-3" style={{ color: C.muted, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>ERROR DISTRIBUTION BY SEGMENT</div>
                <div className="space-y-2">
                  {segments.filter(s => s.errors + s.warnings > 0).map(seg => {
                    const total = seg.errors + seg.warnings;
                    const maxTotal = Math.max(...segments.map(s => s.errors + s.warnings));
                    const pct = (total / maxTotal) * 100;
                    return (
                      <div key={seg.name} className="flex items-center gap-3">
                        <span className="font-mono w-10 text-right flex-shrink-0" style={{ color: C.sub, fontSize: "0.72rem", fontWeight: 700 }}>{seg.name}</span>
                        <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-lg flex items-center px-3" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${seg.errors > 0 ? C.err : C.warn}40, ${seg.errors > 0 ? C.err : C.warn})`, minWidth: 30 }}>
                            <span className="font-mono" style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 700 }}>{seg.errors}e {seg.warnings > 0 ? `${seg.warnings}w` : ""}</span>
                          </div>
                        </div>
                        <span className="font-mono w-12 text-right flex-shrink-0" style={{ color: seg.errors > 0 ? C.err : C.warn, fontSize: "0.72rem", fontWeight: 700 }}>{Math.round(pct)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ERROR EXPLORER TAB ── */}
      {tab === "explorer" && (
        <div className="grid grid-cols-5" style={{ minHeight: 420 }}>
          {/* Tree */}
          <div className="col-span-2 p-4 overflow-auto" style={{ borderRight: `1px solid ${C.glassBorder}` }}>
            <div className="font-mono mb-3" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>EDI HIERARCHY TREE</div>
            {(FILE_ERRORS[file.id]?.length ?? 0) === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: C.em }} />
                <p style={{ color: C.muted, fontSize: "0.75rem" }}>No errors in hierarchy</p>
              </div>
            ) : (
              ERROR_TREE.map(node => (
                <ErrorTreeNode key={node.id} node={node} selectedId={selectedErrorId} onSelect={setSelectedErrorId} />
              ))
            )}
          </div>
          {/* Detail */}
          <div className="col-span-3 p-5 overflow-auto">
            {selectedError ? (
              <ErrorDetailPane error={selectedError} onClose={() => setSelectedErrorId(null)} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-12 gap-3">
                <Eye className="w-10 h-10" style={{ color: `${C.muted}40` }} />
                <p style={{ color: C.muted, fontSize: "0.78rem", textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
                  Select an element with an error in the tree to view detailed diagnostics, AI explanation, and remediation steps.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RAW EDI TAB ── */}
      {tab === "raw" && (() => {
        const errorLineNums = new Set(rawLines.filter(l => l.hasError).map(l => l.lineNumber));
        const hasFullContent = !!FULL_EDI_CONTENT[file.id];
        return (
          <div className="p-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Raw EDI Content</div>
                <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>
                  {rawEditMode ? "Live text editor — errors highlighted, edit to fix" : "Error lines highlighted in red — click line number to copy"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono" style={{ background: `${C.err}12`, border: `1px solid ${C.err}30`, color: C.err, fontSize: "0.68rem", fontWeight: 700 }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: C.err }} /> {rawLines.filter(l => l.hasError).length} error line{rawLines.filter(l => l.hasError).length !== 1 ? "s" : ""}
                </span>
                {/* Toggle: View / Edit */}
                {hasFullContent && (
                  <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${C.glassBorder}` }}>
                    <button
                      onClick={() => setRawEditMode(false)}
                      className="flex items-center gap-1.5 px-3 py-2 font-mono transition-all"
                      style={{ background: !rawEditMode ? C.emDim : C.glassBg, color: !rawEditMode ? C.em : C.muted, fontSize: "0.68rem", fontWeight: !rawEditMode ? 700 : 500, borderRight: `1px solid ${C.glassBorder}` }}
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <button
                      onClick={() => setRawEditMode(true)}
                      className="flex items-center gap-1.5 px-3 py-2 font-mono transition-all"
                      style={{ background: rawEditMode ? "rgba(139,92,246,0.12)" : C.glassBg, color: rawEditMode ? C.purple : C.muted, fontSize: "0.68rem", fontWeight: rawEditMode ? 700 : 500 }}
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Edit mode — inline live editor */}
            {rawEditMode && hasFullContent ? (
              <InlineEDIEditor fileId={file.id} fileName={file.name} errorLines={errorLineNums} />
            ) : rawLines.length === 0 ? (
              <div className="py-12 text-center p-4 rounded-xl" style={{ background: C.glassBg, backdropFilter: "blur(12px)" }}>
                <Terminal className="w-8 h-8 mx-auto mb-2" style={{ color: C.muted }} />
                <p style={{ color: C.muted, fontSize: "0.78rem" }}>Raw EDI view not available for this file type.</p>
              </div>
            ) : (
              /* View mode — read-only highlighted lines */
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(4,8,18,0.7)", border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(14px)" }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${C.glassBorder}`, background: C.glassBg }}>
                  <Terminal className="w-3.5 h-3.5" style={{ color: C.em }} />
                  <span className="font-mono" style={{ color: C.muted, fontSize: "0.65rem", letterSpacing: "0.08em" }}>{file.name} · {file.ediVersion}</span>
                  {hasFullContent && (
                    <button
                      onClick={() => setRawEditMode(true)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono transition-all hover:scale-105"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: C.purple, fontSize: "0.62rem", fontWeight: 700 }}
                    >
                      <Edit3 className="w-3 h-3" /> Open in Live Editor
                    </button>
                  )}
                </div>
                <div className="p-3 overflow-x-auto">
                  {rawLines.map(line => (
                    <div
                      key={line.lineNumber}
                      className="flex items-start gap-0 group rounded-sm"
                      style={{ background: line.hasError ? `${C.err}12` : "transparent", borderLeft: line.hasError ? `2px solid ${C.err}` : "2px solid transparent", marginBottom: 1 }}
                    >
                      <button
                        onClick={() => copyLine(line.content, line.lineNumber)}
                        className="flex items-center gap-1.5 flex-shrink-0 w-14 py-1 px-2 transition-all"
                        title="Click to copy line"
                      >
                        <span className="font-mono" style={{ color: line.hasError ? C.err : C.muted, fontSize: "0.65rem", minWidth: 24, textAlign: "right" }}>{line.lineNumber}</span>
                        {copiedLine === line.lineNumber
                          ? <CheckCircle2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" style={{ color: C.em }} />
                          : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" style={{ color: C.muted }} />}
                      </button>
                      <div className="flex-1 py-1 pr-3 flex items-start gap-3">
                        <code className="font-mono flex-1" style={{ color: line.hasError ? "#FCA5A5" : "#34D399", fontSize: "0.75rem", whiteSpace: "pre", letterSpacing: "0.01em", lineHeight: 1.6 }}>
                          {line.content}
                        </code>
                        {line.hasError && line.errorId && (
                          <button
                            onClick={() => { setSelectedErrorId(line.errorId!); setTab("explorer"); }}
                            className="flex-shrink-0 font-mono px-2 py-0.5 rounded transition-all hover:scale-105"
                            style={{ background: `${C.err}20`, color: C.err, fontSize: "0.6rem", fontWeight: 700, border: `1px solid ${C.err}30` }}
                            title="View error details"
                          >
                            {line.errorId} ↗
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── HEATMAP TAB ── */}
      {tab === "heatmap" && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Error Heatmap by Segment</div>
              <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>Visual distribution of errors across segment types</div>
            </div>
            {errors.length > 0 && (
              <span className="font-mono px-3 py-1.5 rounded-lg" style={{ background: `${C.err}12`, color: C.err, fontSize: "0.7rem", fontWeight: 700, border: `1px solid ${C.err}25` }}>
                {errors.filter(e => e.severity === "error").length} errors · {errors.filter(e => e.severity === "warning").length} warnings
              </span>
            )}
          </div>

          {errors.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: C.em }} />
              <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700, marginBottom: 6 }}>Perfect Score</div>
              <p style={{ color: C.muted, fontSize: "0.8rem" }}>No errors detected — all segments passed validation.</p>
            </div>
          ) : (() => {
            const segMap: Record<string, { errors: number; warnings: number }> = {};
            errors.forEach(e => {
              if (!segMap[e.segment]) segMap[e.segment] = { errors: 0, warnings: 0 };
              if (e.severity === "error") segMap[e.segment].errors++;
              else segMap[e.segment].warnings++;
            });
            const segs = Object.entries(segMap).sort((a, b) => (b[1].errors + b[1].warnings) - (a[1].errors + a[1].warnings));
            const maxTotal = Math.max(...segs.map(([, v]) => v.errors + v.warnings));

            return (
              <div className="space-y-3">
                {segs.map(([seg, counts]) => {
                  const total = counts.errors + counts.warnings;
                  const errPct = (counts.errors / total) * 100;
                  const warnPct = (counts.warnings / total) * 100;
                  const barPct = (total / maxTotal) * 100;
                  return (
                    <div key={seg}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="font-mono w-10 text-right flex-shrink-0" style={{ color: C.sub, fontSize: "0.78rem", fontWeight: 700 }}>{seg}</span>
                        <div className="flex-1 h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.glassBorder}` }}>
                          <div className="h-full flex" style={{ width: `${barPct}%` }}>
                            {counts.errors > 0 && (
                              <div className="h-full flex items-center px-2.5 transition-all" style={{ width: `${errPct}%`, background: `linear-gradient(90deg, ${C.err}60, ${C.err})`, minWidth: counts.errors > 0 ? 24 : 0 }}>
                                <span className="font-mono" style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 800 }}>{counts.errors}E</span>
                              </div>
                            )}
                            {counts.warnings > 0 && (
                              <div className="h-full flex items-center px-2.5 transition-all" style={{ width: `${warnPct}%`, background: `linear-gradient(90deg, ${C.warn}60, ${C.warn})`, minWidth: counts.warnings > 0 ? 24 : 0 }}>
                                <span className="font-mono" style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 800 }}>{counts.warnings}W</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="font-mono w-16 text-right flex-shrink-0" style={{ color: counts.errors > 0 ? C.err : C.warn, fontSize: "0.72rem", fontWeight: 700 }}>
                          {Math.round(barPct)}%
                        </span>
                      </div>
                      {/* Error list under segment */}
                      <div className="ml-13 pl-10 space-y-1">
                        {errors.filter(e => e.segment === seg).map(e => (
                          <div key={e.id} className="flex items-center gap-2 pl-2">
                            <SeverityDot severity={e.severity} />
                            <span className="font-mono" style={{ color: e.severity === "error" ? C.err : C.warn, fontSize: "0.65rem", fontWeight: 700 }}>{e.errorId}</span>
                            <span style={{ color: C.muted, fontSize: "0.68rem" }}>{e.element} — {e.message.substring(0, 50)}{e.message.length > 50 ? "…" : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Error Row (expandable) ───────────────────────────────────────────────────
function ErrorRow({ err }: { err: ErrorEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${err.severity === "error" ? `${C.err}25` : `${C.warn}25`}`, background: err.severity === "error" ? `${C.err}04` : `${C.warn}04` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.02]"
      >
        <SeverityDot severity={err.severity} />
        <span className="font-mono flex-shrink-0" style={{ color: err.severity === "error" ? C.err : C.warn, fontSize: "0.72rem", fontWeight: 800, minWidth: 80 }}>{err.errorId}</span>
        <span className="font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: C.purpleDim, color: C.purple, fontSize: "0.6rem", fontWeight: 700 }}>S{err.snipLevel}</span>
        <span className="font-mono flex-shrink-0" style={{ color: C.em, fontSize: "0.72rem", fontWeight: 700, minWidth: 40 }}>{err.segment}</span>
        <span className="font-mono flex-shrink-0" style={{ color: C.info, fontSize: "0.72rem", minWidth: 60 }}>{err.element}</span>
        <span className="flex-1 truncate" style={{ color: C.text, fontSize: "0.78rem" }}>{err.message}</span>
        <span className="font-mono flex-shrink-0" style={{ color: C.muted, fontSize: "0.65rem" }}>L{err.lineNumber}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.em }} /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.muted }} />}
      </button>
      {open && <ErrorDetailPane error={err} compact />}
    </div>
  );
}

// ─── Error Detail Pane ────────────────────────────────────────────────────────
function ErrorDetailPane({ error, onClose, compact }: { error: ErrorEntry; onClose?: () => void; compact?: boolean }) {
  return (
    <div className="p-4" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
      {onClose && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" style={{ color: C.err }} />
            <span className="font-mono" style={{ color: C.err, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em" }}>ERROR DETAILS</span>
          </div>
          <button onClick={onClose}><X className="w-3.5 h-3.5" style={{ color: C.muted }} /></button>
        </div>
      )}

      <div className={`grid gap-4 mb-4 ${compact ? "grid-cols-2" : "grid-cols-4"}`}>
        {[
          { label: "Error ID", value: error.errorId, color: C.err },
          { label: "SNIP Level", value: `Level ${error.snipLevel}`, color: C.purple },
          { label: "Segment", value: error.segment, color: C.info },
          { label: "Element", value: error.element, color: C.em },
          { label: "Line : Position", value: `L${error.lineNumber} · ${error.position}`, color: C.sub },
          { label: "Rule Reference", value: error.ruleRef, color: C.muted },
          { label: "Expected", value: error.expected, color: C.em },
          { label: "Actual", value: error.actual, color: C.err },
        ].map(row => (
          <div key={row.label} className="p-3 rounded-lg" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(10px)" }}>
            <div style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }} className="font-mono">{row.label.toUpperCase()}</div>
            <div className="font-mono" style={{ color: row.color, fontSize: "0.78rem", fontWeight: 600, wordBreak: "break-word", lineHeight: 1.4 }}>{row.value}</div>
          </div>
        ))}
      </div>

      {/* Full message */}
      <div className="mb-3 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: `1px solid ${C.err}20` }}>
        <div className="font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em" }}>ERROR MESSAGE</div>
        <p style={{ color: C.text, fontSize: "0.8rem", lineHeight: 1.6 }}>{error.message}</p>
      </div>

      {/* AI Explanation */}
      <div className="mb-3 p-3 rounded-lg" style={{ background: C.purpleDim, border: `1px solid ${C.purple}25` }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: C.purple }} />
          <span className="font-mono" style={{ color: C.purple, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>AI ROOT CAUSE ANALYSIS</span>
        </div>
        <p style={{ color: C.sub, fontSize: "0.78rem", lineHeight: 1.7 }}>{error.aiExplanation}</p>
      </div>

      {/* Remediation */}
      <div className="p-3 rounded-lg" style={{ background: C.emDim, border: `1px solid ${C.em}25` }}>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5" style={{ color: C.em }} />
          <span className="font-mono" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>REMEDIATION STEPS</span>
        </div>
        <p style={{ color: C.sub, fontSize: "0.78rem", lineHeight: 1.7 }}>{error.remediation}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ValidationReport({ projectName }: { projectName: string }) {
  const [selectedFile, setSelectedFile] = useState<ValidationFile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "passed" | "failed" | "warning">("all");

  // Export builder
  const [exportFields, setExportFields] = useState(DEFAULT_FIELDS);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(DEFAULT_FIELD_MAPPINGS);
  const [csvColumns, setCsvColumns] = useState<CsvColumn[]>(DEFAULT_CSV_COLUMNS);

  // ACK
  const [ackStatuses, setAckStatuses] = useState<Record<string, string | null>>({ "997": null, "999": null, custom: null });
  const [sendingAck, setSendingAck] = useState<string | null>(null);

  // Archival
  const [archiveDest, setArchiveDest] = useState({ s3: true, fsx: false, local: false });
  const [archiveUri, setArchiveUri] = useState("s3://data-processing-engine/reports/healthcare-claims/");
  const [archiving, setArchiving] = useState(false);
  const [archived, setArchived] = useState(false);

  const totalFiles = MOCK_FILES.length;
  const passedFiles = MOCK_FILES.filter(f => f.status === "passed").length;
  const failedFiles = MOCK_FILES.filter(f => f.status === "failed").length;
  const warningFiles = MOCK_FILES.filter(f => f.status === "warning").length;
  const totalSnip = MOCK_FILES.reduce((a, f) => a + f.snip, 0);
  const totalWarnings = MOCK_FILES.reduce((a, f) => a + f.warnings, 0);
  const totalErrors = MOCK_FILES.reduce((a, f) => a + f.errors, 0);

  const filteredFiles = MOCK_FILES.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const generatedJson = JSON.stringify(
    fieldMappings.reduce((acc: Record<string, unknown>, m) => {
      acc[m.target] = m.hardcoded ?? (m.type === "integer" ? 0 : m.type === "boolean" ? false : "string_value");
      return acc;
    }, {}), null, 2
  );

  const csvPreview = [
    csvColumns.map(c => c.columnName).join(","),
    csvColumns.map(c => c.sourceField === "CLM01" ? "12345" : c.sourceField === "ErrorMessage" ? "Claim Number Missing" : c.sourceField === "SNIPLevel" ? "3" : "sample").join(","),
  ].join("\n");

  const handleSendAck = (type: string) => {
    setSendingAck(type);
    setAckStatuses(prev => ({ ...prev, [type]: "pending" }));
    setTimeout(() => { setSendingAck(null); setAckStatuses(prev => ({ ...prev, [type]: "sent" })); }, 2000);
  };

  const handleArchive = () => {
    setArchiving(true);
    setTimeout(() => { setArchiving(false); setArchived(true); }, 2500);
  };

  const card = { background: C.glassBg, border: `1px solid ${C.glassBorder}`, borderRadius: "1rem", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as React.CSSProperties;

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {["Projects", projectName, "Reports", "Data Validation Report"].map((crumb, i, arr) => (
              <span key={i} className="flex items-center gap-2">
                <span style={{ color: i === arr.length - 1 ? C.em : C.muted, fontSize: "0.75rem", fontWeight: i === arr.length - 1 ? 600 : 400 }} className="font-mono">{crumb}</span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3" style={{ color: C.glassBorder }} />}
              </span>
            ))}
          </div>
          <h2 style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Data Validation Report</h2>
          <p className="font-mono mt-1" style={{ color: C.muted, fontSize: "0.72rem" }}>Generated: 2026-03-16 10:20:00 UTC — 24-hour window</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.sub, fontSize: "0.8rem", fontWeight: 600, backdropFilter: "blur(12px)" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: C.em, color: "#fff", fontSize: "0.8rem", fontWeight: 700, boxShadow: `0 0 20px ${C.emGlow}` }}>
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Files Processed", value: totalFiles, icon: FileText, color: C.info, sub: "Total batch", filter: "all" as const },
          { label: "Passed", value: passedFiles, icon: CheckCircle2, color: C.em, sub: `${Math.round((passedFiles/totalFiles)*100)}% success rate`, filter: "passed" as const },
          { label: "Failed", value: failedFiles, icon: AlertCircle, color: C.err, sub: `${totalErrors} total errors`, filter: "failed" as const },
          { label: "Warnings", value: warningFiles, icon: AlertTriangle, color: C.warn, sub: `${totalWarnings} warning flags`, filter: "warning" as const },
          { label: "SNIP Violations", value: totalSnip, icon: ShieldAlert, color: C.purple, sub: "Across all files", filter: "all" as const },
        ].map((m, i) => (
          <button
            key={i}
            onClick={() => setStatusFilter(m.filter)}
            className="p-4 rounded-xl text-left transition-all hover:scale-[1.03]"
            style={{ background: `${m.color}08`, border: `1px solid ${statusFilter === m.filter && i !== 0 && i !== 4 ? m.color : `${m.color}25`}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${m.color}18` }}>
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
              </div>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: m.color }} />
            </div>
            <div className="font-mono mb-0.5" style={{ color: m.color, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>{m.value}</div>
            <div style={{ color: C.sub, fontSize: "0.75rem", fontWeight: 600, marginTop: 3 }}>{m.label}</div>
            <div className="font-mono mt-1" style={{ color: C.muted, fontSize: "0.65rem" }}>{m.sub}</div>
          </button>
        ))}
      </div>

      {/* ─── File Table ─── */}
      <div style={card} className="overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${C.glassBorder}` }}>
          <div>
            <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>File-Level Validation Table</div>
            <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>{filteredFiles.length} files — click a row to open in-depth validation panel</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["all", "passed", "failed", "warning"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className="px-2.5 py-1.5 rounded-lg font-mono transition-all" style={{ background: statusFilter === s ? C.emDim : C.glassBg, border: `1px solid ${statusFilter === s ? `${C.em}40` : C.glassBorder}`, color: statusFilter === s ? C.em : C.muted, fontSize: "0.65rem", fontWeight: 700, backdropFilter: "blur(8px)" }}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(10px)" }}>
              <Search className="w-3 h-3" style={{ color: C.muted }} />
              <input type="text" placeholder="Search files..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent outline-none font-mono" style={{ color: C.text, fontSize: "0.72rem", width: 130 }} />
            </div>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr style={{ background: C.glassBg, borderBottom: `1px solid ${C.glassBorder}` }}>
              {["FILE NAME", "TYPE", "TIMESTAMP", "STATUS", "ERRORS", "WARNINGS", "SNIP", "TRANSACTIONS", ""].map((h, i) => (
                <th key={i} className="text-left py-3 px-4 font-mono" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map(file => (
              <tr
                key={file.id}
                onClick={() => setSelectedFile(selectedFile?.id === file.id ? null : file)}
                className="cursor-pointer transition-all hover:bg-white/[0.025]"
                style={{ borderBottom: `1px solid ${C.glassBorder}`, background: selectedFile?.id === file.id ? `${C.em}05` : undefined }}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-3.5 h-3.5" style={{ color: C.muted }} />
                    <span className="font-mono" style={{ color: C.text, fontSize: "0.8rem", fontWeight: 500 }}>{file.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4"><TypeBadge type={file.type} /></td>
                <td className="py-3 px-4"><span className="font-mono" style={{ color: C.muted, fontSize: "0.72rem" }}>{file.timestamp}</span></td>
                <td className="py-3 px-4"><StatusPill status={file.status} size="xs" /></td>
                <td className="py-3 px-4">
                  <span className="font-mono" style={{ color: file.errors > 0 ? C.err : C.em, fontSize: "0.8rem", fontWeight: 700 }}>{file.errors}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono" style={{ color: file.warnings > 0 ? C.warn : C.muted, fontSize: "0.8rem", fontWeight: file.warnings > 0 ? 600 : 400 }}>{file.warnings}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono" style={{ color: file.snip > 0 ? C.purple : C.muted, fontSize: "0.8rem", fontWeight: file.snip > 0 ? 600 : 400 }}>{file.snip}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono" style={{ color: C.sub, fontSize: "0.78rem" }}>{file.transactionCount}</span>
                </td>
                <td className="py-3 px-4">
                  {selectedFile?.id === file.id
                    ? <ChevronDown className="w-3.5 h-3.5" style={{ color: C.em }} />
                    : <ChevronRight className="w-3.5 h-3.5" style={{ color: C.muted }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── File Detail Panel ─── */}
      {selectedFile && (
        <FileDetailPanel file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}

      {/* ─── Export Panel ─── */}
      <div style={card} className="p-5">
        <div className="mb-4">
          <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Report Export</div>
          <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>Download validation reports in multiple formats</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Download PDF", sub: "Human-readable report", icon: FileDown, color: C.err },
            { label: "Download CSV", sub: "Tabular data export", icon: Download, color: C.em },
            { label: "Download JSON", sub: "Machine-readable payload", icon: Code2, color: C.info },
          ].map((exp, i) => (
            <button key={i} className="flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.02]" style={{ background: `${exp.color}08`, border: `1px solid ${exp.color}25` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${exp.color}15`, border: `1px solid ${exp.color}30` }}>
                <exp.icon className="w-5 h-5" style={{ color: exp.color }} />
              </div>
              <div>
                <div style={{ color: C.text, fontSize: "0.82rem", fontWeight: 600 }}>{exp.label}</div>
                <div style={{ color: C.muted, fontSize: "0.68rem", marginTop: 2 }}>{exp.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Custom Export Builder ─── */}
      <div style={card} className="p-5">
        <div className="mb-4">
          <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Custom Data Export Builder</div>
          <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>Define field mapping for downstream database push</div>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {/* Field selection */}
          <div className="p-4 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(12px)" }}>
            <div className="font-mono mb-3" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>SELECT FIELDS</div>
            <div className="space-y-1.5">
              {exportFields.map(field => (
                <button key={field.id} onClick={() => setExportFields(prev => prev.map(f => f.id === field.id ? { ...f, selected: !f.selected } : f))} className="w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all hover:bg-white/5">
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: field.selected ? C.em : C.glassBg, border: field.selected ? "none" : `1px solid ${C.glassBorder}` }}>
                    {field.selected && <span style={{ color: "#fff", fontSize: "0.6rem" }}>✓</span>}
                  </div>
                  <span style={{ color: field.selected ? C.text : C.muted, fontSize: "0.78rem" }}>{field.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Field mapping */}
          <div className="p-4 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(12px)" }}>
            <div className="font-mono mb-3" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>FIELD MAPPING</div>
            <div className="space-y-2">
              {fieldMappings.map((m, i) => (
                <div key={m.id} className="flex items-center gap-1.5">
                  <input value={m.source} onChange={e => setFieldMappings(prev => prev.map((x, j) => j === i ? { ...x, source: e.target.value } : x))} className="flex-1 px-2.5 py-1.5 rounded-lg font-mono outline-none" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.sub, fontSize: "0.72rem", backdropFilter: "blur(8px)" }} />
                  <span style={{ color: C.muted, fontSize: "0.8rem" }}>→</span>
                  <input value={m.target} onChange={e => setFieldMappings(prev => prev.map((x, j) => j === i ? { ...x, target: e.target.value } : x))} className="flex-1 px-2.5 py-1.5 rounded-lg font-mono outline-none" style={{ background: C.emDim, border: `1px solid ${C.em}25`, color: C.em, fontSize: "0.72rem" }} />
                  <select value={m.type} onChange={e => setFieldMappings(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value as FieldMapping["type"] } : x))} className="px-1.5 py-1.5 rounded-lg font-mono outline-none" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.muted, fontSize: "0.68rem", backdropFilter: "blur(8px)" }}>
                    <option value="string">str</option>
                    <option value="integer">int</option>
                    <option value="boolean">bool</option>
                  </select>
                </div>
              ))}
              <button onClick={() => setFieldMappings(prev => [...prev, { id: Date.now().toString(), source: "NewField", target: "new_field", type: "string" }])} className="w-full flex items-center gap-2 p-2 rounded-lg" style={{ border: `1px dashed ${C.em}30`, color: C.em, fontSize: "0.72rem" }}>
                <Plus className="w-3.5 h-3.5" /> Add Mapping
              </button>
            </div>
          </div>
          {/* JSON preview */}
          <div className="p-4 rounded-xl flex flex-col" style={{ background: "rgba(4,9,20,0.8)", border: `1px solid rgba(16,185,129,0.2)`, backdropFilter: "blur(16px)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono" style={{ color: C.em, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>JSON PREVIEW</span>
              <Copy className="w-3.5 h-3.5" style={{ color: C.muted }} />
            </div>
            <pre className="flex-1 font-mono overflow-auto" style={{ color: "#34D399", fontSize: "0.68rem", lineHeight: 1.7 }}>{generatedJson}</pre>
          </div>
        </div>
      </div>

      {/* ─── CSV Builder ─── */}
      <div style={card} className="p-5">
        <div className="mb-4">
          <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>CSV Output Builder</div>
          <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>Configure CSV structure for downstream integration</div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="flex gap-4 mb-2 px-3 py-2 rounded-lg" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(8px)" }}>
              <span className="font-mono flex-1" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700 }}>COLUMN NAME</span>
              <span className="font-mono flex-1" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700 }}>SOURCE FIELD</span>
              <span className="w-6" />
            </div>
            <div className="space-y-1.5">
              {csvColumns.map((col, i) => (
                <div key={col.id} className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5" style={{ color: C.muted }} />
                  <input value={col.columnName} onChange={e => setCsvColumns(prev => prev.map((c, j) => j === i ? { ...c, columnName: e.target.value } : c))} className="flex-1 px-3 py-2 rounded-lg font-mono outline-none" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.text, fontSize: "0.75rem", backdropFilter: "blur(8px)" }} />
                  <input value={col.sourceField} onChange={e => setCsvColumns(prev => prev.map((c, j) => j === i ? { ...c, sourceField: e.target.value } : c))} className="flex-1 px-3 py-2 rounded-lg font-mono outline-none" style={{ background: C.emDim, border: `1px solid ${C.em}20`, color: C.em, fontSize: "0.75rem" }} />
                  <button onClick={() => setCsvColumns(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" style={{ color: C.muted }} /></button>
                </div>
              ))}
              <button onClick={() => setCsvColumns(prev => [...prev, { id: Date.now().toString(), columnName: "New_Column", sourceField: "FieldName" }])} className="w-full flex items-center gap-2 p-2 rounded-lg" style={{ border: `1px dashed ${C.em}30`, color: C.em, fontSize: "0.72rem" }}>
                <Plus className="w-3.5 h-3.5" /> Add Column
              </button>
            </div>
          </div>
          <div className="p-4 rounded-xl flex flex-col" style={{ background: "rgba(4,9,20,0.8)", border: `1px solid rgba(16,185,129,0.2)`, backdropFilter: "blur(16px)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono" style={{ color: C.em, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>CSV PREVIEW</span>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: C.em, color: "#fff", fontSize: "0.65rem", fontWeight: 700 }}><Download className="w-2.5 h-2.5" /> Download</button>
            </div>
            <pre className="font-mono flex-1 overflow-auto" style={{ color: "#34D399", fontSize: "0.72rem", lineHeight: 1.8 }}>{csvPreview}</pre>
          </div>
        </div>
      </div>

      {/* ─── ACK Panel ─── */}
      <div style={card} className="p-5">
        <div className="mb-4">
          <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Acknowledgement (ACK) Panel</div>
          <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>Send functional acknowledgements to trading partners</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "997", label: "Send 997 ACK", sub: "Functional Acknowledgement", color: C.em },
            { key: "999", label: "Send 999 ACK", sub: "Implementation Acknowledgement", color: C.info },
            { key: "custom", label: "Send Custom ACK", sub: "Configure custom envelope", color: C.purple },
          ].map(ack => {
            const status = ackStatuses[ack.key];
            const isSending = sendingAck === ack.key;
            return (
              <div key={ack.key} className="p-4 rounded-xl" style={{ background: `${ack.color}06`, border: `1px solid ${ack.color}20` }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ack.color}15`, border: `1px solid ${ack.color}30` }}>
                    <Send className="w-4 h-4" style={{ color: ack.color }} />
                  </div>
                  <div>
                    <div style={{ color: C.text, fontSize: "0.82rem", fontWeight: 600 }}>{ack.label}</div>
                    <div style={{ color: C.muted, fontSize: "0.68rem" }}>{ack.sub}</div>
                  </div>
                </div>
                {status && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: status === "sent" ? `${C.em}08` : `${C.warn}08`, border: `1px solid ${status === "sent" ? `${C.em}20` : `${C.warn}20`}` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: status === "sent" ? C.em : C.warn }} />
                    <span className="font-mono" style={{ color: status === "sent" ? C.em : C.warn, fontSize: "0.65rem", fontWeight: 700 }}>ACK {status.toUpperCase()}</span>
                  </div>
                )}
                <button onClick={() => !status && handleSendAck(ack.key)} disabled={!!status || isSending} className="w-full py-2.5 rounded-xl font-mono transition-all hover:scale-105" style={{ background: status ? C.glassBg : `${ack.color}18`, border: `1px solid ${status ? C.glassBorder : `${ack.color}35`}`, color: status ? C.muted : ack.color, fontSize: "0.75rem", fontWeight: 700, backdropFilter: "blur(8px)" }}>
                  {isSending ? "Sending…" : status ? "Sent ✓" : "Send Now"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Archival Panel ─── */}
      <div style={card} className="p-5">
        <div className="mb-4">
          <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Report Archival</div>
          <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>Archive validation reports to chosen storage destinations</div>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-2">
            <div className="font-mono mb-2" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>ARCHIVE DESTINATION</div>
            {[
              { key: "s3", label: "Amazon S3", sub: "Cloud object storage" },
              { key: "fsx", label: "AWS FSx", sub: "Managed file system" },
              { key: "local", label: "Local Storage", sub: "On-premise filesystem" },
            ].map(dest => (
              <button key={dest.key} onClick={() => setArchiveDest(prev => ({ ...prev, [dest.key]: !prev[dest.key as keyof typeof prev] }))} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all" style={{ background: archiveDest[dest.key as keyof typeof archiveDest] ? C.emDim : C.glassBg, border: `1px solid ${archiveDest[dest.key as keyof typeof archiveDest] ? `${C.em}35` : C.glassBorder}`, backdropFilter: "blur(10px)" }}>
                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: archiveDest[dest.key as keyof typeof archiveDest] ? C.em : C.glassBg, border: archiveDest[dest.key as keyof typeof archiveDest] ? "none" : `1px solid ${C.glassBorder}` }}>
                  {archiveDest[dest.key as keyof typeof archiveDest] && <span style={{ color: "#fff", fontSize: "0.6rem" }}>✓</span>}
                </div>
                <div>
                  <div style={{ color: C.text, fontSize: "0.78rem", fontWeight: 600 }}>{dest.label}</div>
                  <div style={{ color: C.muted, fontSize: "0.68rem" }}>{dest.sub}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="col-span-2 flex flex-col gap-3">
            <div>
              <div className="font-mono mb-2" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>DESTINATION URI</div>
              <input value={archiveUri} onChange={e => setArchiveUri(e.target.value)} className="w-full px-4 py-2.5 rounded-xl font-mono outline-none" style={{ background: "rgba(4,9,20,0.75)", border: `1px solid rgba(16,185,129,0.22)`, color: "#34D399", fontSize: "0.78rem", backdropFilter: "blur(12px)" }} />
              <div className="font-mono mt-1" style={{ color: C.muted, fontSize: "0.65rem" }}>Will archive to: <span style={{ color: C.sub }}>{archiveUri}report_2026-03-16.zip</span></div>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-2">
              {archived && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: `${C.em}08`, border: `1px solid ${C.em}25` }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: C.em }} />
                  <span style={{ color: C.em, fontSize: "0.8rem", fontWeight: 600 }}>Report archived successfully</span>
                </div>
              )}
              <button onClick={handleArchive} disabled={archiving || archived} className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl transition-all hover:scale-[1.02]" style={{ background: archived ? `${C.em}10` : C.em, border: archived ? `1px solid ${C.em}30` : "none", color: archived ? C.em : "#fff", fontWeight: 700, boxShadow: archived ? "none" : `0 0 25px ${C.emGlow}` }}>
                <Archive className="w-4 h-4" />
                {archiving ? "Archiving…" : archived ? "Archived ✓" : "Archive Report"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
