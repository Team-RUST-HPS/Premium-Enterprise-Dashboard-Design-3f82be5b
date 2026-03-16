import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTheme } from "../context/theme";
import {
  Terminal, Play, RotateCcw, AlertCircle, AlertTriangle, CheckCircle2,
  Copy, Download, ChevronRight, ChevronDown, Hash,
  Clock, Layers, FileCode2, X, RefreshCw, Eye, EyeOff,
  Sparkles, Upload, HardDrive, Cloud, Server, FolderOpen,
  Link2, Settings, ChevronUp, Database, Wifi,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "var(--c-bg)", surface: "var(--c-surface)", border: "var(--c-border)",
  borderMed: "var(--c-border-med)",
  cardSubtle: "var(--c-card-subtle)", iconInactive: "var(--c-icon-inactive)", subtle: "var(--c-subtle)",
  em: "#10B981", emDim: "rgba(16,185,129,0.12)", emGlow: "var(--c-em-glow)",
  glassBg: "var(--c-glass-bg)", glassBorder: "var(--c-glass-border)",
  text: "var(--c-text)", sub: "var(--c-sub)", muted: "var(--c-muted)",
  err: "#EF4444", errDim: "rgba(239,68,68,0.10)",
  warn: "#F59E0B", warnDim: "rgba(245,158,11,0.10)",
  info: "#3B82F6", infoDim: "rgba(59,130,246,0.10)",
  purple: "#8B5CF6", purpleDim: "rgba(139,92,246,0.10)",
};

// ─── Sample EDI files ─────────────────────────────────────────────────────────
const SAMPLE_FILES: Record<string, { label: string; type: string; content: string }> = {
  "837p_errors": {
    label: "837P — With Errors",
    type: "837",
    content: `ISA*00*          *00*          *ZZ*CLAIMSUBMIT01   *ZZ*PAYER00012345   *260316*1015*^*00501*000000104*0*P* ~
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
SE*42*0001~
GE*1*1~
IEA*1*000000104~`,
  },
  "837p_clean": {
    label: "837P — Clean",
    type: "837",
    content: `ISA*00*          *00*          *ZZ*CLAIMSUBMIT01   *ZZ*PAYER00012345   *260316*1015*^*00501*000000105*0*P*:~
GS*HC*CLAIMSUBMIT01*PAYER00012345*20260316*1015*2*X*005010X222A1~
ST*837*0001~
BHT*0019*00*2026031602*20260316*1015*CH~
NM1*41*2*ACME HOSPITAL*****46*ACME001~
PER*IC*BILLING DEPT*TE*5551234567~
NM1*40*2*BLUE CROSS PAYER*****46*PAYER001~
HL*1**20*1~
NM1*85*1*JONES*ALICE***XX*1234567890~
HL*2*1*22*0~
SBR*P*18*GROUP001****MC~
NM1*IL**SMITH*JOHN****MI*MEM12345~
CLM*CLM2026001*1250.00*11:B:1**A*1*C*I~
DTP*472*D8*20260316~
REF*EJ*CLM2026001~
HI*BK:J0600~
SV1*HC:99213*1250.00*UN*1**1~
SE*17*0001~
GE*1*2~
IEA*1*000000105~`,
  },
  "270_errors": {
    label: "270 Eligibility — With Errors",
    type: "270",
    content: `ISA*00*          *00*          *ZQ*CLAIMSUB01     *ZZ*PAYER00012345   *260316*1018*^*00501*000000298*0*P*:~
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
  },
  "blank": {
    label: "Blank — Start fresh",
    type: "Custom",
    content: `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER        *260316*1200*^*00501*000000001*0*P*:~
GS*HC*SENDER*RECEIVER*20260316*1200*1*X*005010X222A1~
ST*837*0001~
`,
  },
};

// ─── Types ───────────────────────────────────────��────────────────────────────
interface ParseError {
  id: string;
  lineNumber: number;
  segmentIndex: number;
  segmentName: string;
  element: string;
  elementIndex: number;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  expected: string;
  actual: string;
  aiHint: string;
}

interface ParsedSegment {
  index: number;
  lineNumber: number;
  name: string;
  elements: string[];
  errors: ParseError[];
  warnings: ParseError[];
  raw: string;
}

interface ParseResult {
  segments: ParsedSegment[];
  errors: ParseError[];
  parseTimeMs: number;
  interchangeId: string;
  senderId: string;
  receiverId: string;
  transactionType: string;
  segmentCount: number;
  isValid: boolean;
}

// ─── EDI Parser ──────────────────────────────────────────────────────────────
function parseEDI(content: string): ParseResult {
  const start = performance.now();
  const errors: ParseError[] = [];
  const segments: ParsedSegment[] = [];

  const rawSegments = content
    .split(/~\s*\n?/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let interchangeId = "—", senderId = "—", receiverId = "—", transactionType = "—";

  // Segment-specific validation rules
  const RULES: Record<string, (els: string[], idx: number, lineNum: number) => ParseError[]> = {
    ISA: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (els.length !== 16) {
        errs.push({ id: `ISA-${idx}-LEN`, lineNumber: ln, segmentIndex: idx, segmentName: "ISA", element: "ISA", elementIndex: 0, severity: "error", code: "ISA-FIELD-COUNT", message: `ISA must have exactly 16 elements, found ${els.length - 1}`, expected: "16 elements", actual: `${els.length - 1} elements`, aiHint: "ISA is a fixed-length segment. Check that your ISA serializer outputs all 16 elements including padding." });
      }
      if (els.length >= 7 && !["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "14", "15", "16", "ZZ"].includes(els[5])) {
        errs.push({ id: `ISA-${idx}-05`, lineNumber: ln, segmentIndex: idx, segmentName: "ISA", element: "ISA05", elementIndex: 5, severity: "warning", code: "ISA05-QUAL", message: `ISA05 sender qualifier '${els[5]}' is non-standard`, expected: "ZZ or 01", actual: els[5], aiHint: "Most trading partners expect ZZ (Mutually Defined). Verify your partner agreement specifies this qualifier." });
      }
      if (els.length >= 16 && (!els[15] || els[15] === " " || els[15] === "")) {
        errs.push({ id: `ISA-${idx}-16`, lineNumber: ln, segmentIndex: idx, segmentName: "ISA", element: "ISA16", elementIndex: 16, severity: "error", code: "ISA16-MISSING", message: "ISA16 component element separator is missing or space", expected: "Single non-alpha character (e.g. ':')", actual: `'${els[15] || "(empty)"}'`, aiHint: "The component separator (ISA16) cannot be a space or absent. Update your EDI generator to output ':' or another agreed separator." });
      }
      return errs;
    },
    ST: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (!els[2] || !/^\d{4}$/.test(els[2])) {
        errs.push({ id: `ST-${idx}-02`, lineNumber: ln, segmentIndex: idx, segmentName: "ST", element: "ST02", elementIndex: 2, severity: "error", code: "ST02-FORMAT", message: `ST02 control number is invalid: '${els[2] || "NULL"}'`, expected: "4-digit zero-padded numeric (e.g. 0001)", actual: els[2] || "NULL/EMPTY", aiHint: "ST02 must be exactly 4 digits. Your transaction set generator is not populating or incrementing the control number counter. Initialize with 0001 and increment per set." });
      }
      if (!els[1] || !["837", "835", "270", "271", "277", "278", "820", "834", "997", "999"].includes(els[1])) {
        errs.push({ id: `ST-${idx}-01`, lineNumber: ln, segmentIndex: idx, segmentName: "ST", element: "ST01", elementIndex: 1, severity: "warning", code: "ST01-UNKNOWN", message: `ST01 transaction type '${els[1] || "EMPTY"}' may not be supported`, expected: "837, 835, 270, 271, 997, 999...", actual: els[1] || "EMPTY", aiHint: "Verify the transaction set type matches the GS01 functional identifier and the implementation guide in use." });
      }
      return errs;
    },
    CLM: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (!els[1] || els[1].trim() === "") {
        errs.push({ id: `CLM-${idx}-01`, lineNumber: ln, segmentIndex: idx, segmentName: "CLM", element: "CLM01", elementIndex: 1, severity: "error", code: "CLM01-NULL", message: "CLM01 (Claim Number) is null or empty — this claim cannot be adjudicated", expected: "Non-null alphanumeric (1–38 chars)", actual: "NULL/EMPTY", aiHint: "CLM01 is the unique claim identifier. Check the source system's claim ID generation pipeline and ensure the ETL step properly maps the claim reference to CLM01." });
      }
      if (!els[2] || els[2] === "0.00" || els[2] === "0") {
        errs.push({ id: `CLM-${idx}-02`, lineNumber: ln, segmentIndex: idx, segmentName: "CLM", element: "CLM02", elementIndex: 2, severity: "error", code: "CLM02-ZERO", message: "CLM02 (Total Charge Amount) is zero or missing", expected: "Positive decimal > 0 (e.g. 1250.00)", actual: els[2] || "EMPTY", aiHint: "Zero-dollar claims are rejected by all payers. Verify billing charges are finalized before EDI generation and add a guard clause to reject zero-amount records." });
      }
      return errs;
    },
    NM1: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (!els[1] || els[1].trim() === "") {
        errs.push({ id: `NM1-${idx}-01`, lineNumber: ln, segmentIndex: idx, segmentName: "NM1", element: "NM101", elementIndex: 1, severity: "error", code: "NM101-MISSING", message: "NM101 entity identifier code is missing", expected: "Valid entity code (IL, 85, PR, 41, 40...)", actual: "EMPTY", aiHint: "NM101 identifies whether this loop represents a patient, provider, or payer. Without it, the payer cannot route the claim. Check entity role mapping in your source adapter." });
      }
      if (els[9] && !/^\d{10}$/.test(els[9]) && els[8] === "XX") {
        errs.push({ id: `NM1-${idx}-09`, lineNumber: ln, segmentIndex: idx, segmentName: "NM1", element: "NM109", elementIndex: 9, severity: "error", code: "NM109-NPI", message: `NPI in NM109 is not 10 digits: '${els[9]}'`, expected: "10-digit National Provider Identifier", actual: `'${els[9]}' (${els[9].length} chars)`, aiHint: "NPIs must be exactly 10 digits. Validate against the NPPES registry before submission. The source provider master file may contain truncated or invalid NPI values." });
      }
      if (els[3] && /\d/.test(els[3])) {
        errs.push({ id: `NM1-${idx}-03`, lineNumber: ln, segmentIndex: idx, segmentName: "NM1", element: "NM103", elementIndex: 3, severity: "warning", code: "NM103-NUMERIC", message: `NM103 last name '${els[3]}' contains numeric characters`, expected: "Alphabetic characters only", actual: els[3], aiHint: "Patient last names should not contain digits. Strip trailing numerics in your pre-processing data cleanse step before mapping to NM103." });
      }
      return errs;
    },
    DTP: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (els[3] && !/^\d{8}$/.test(els[3]) && els[2] === "D8") {
        errs.push({ id: `DTP-${idx}-03`, lineNumber: ln, segmentIndex: idx, segmentName: "DTP", element: "DTP03", elementIndex: 3, severity: "error", code: "DTP03-FORMAT", message: `DTP03 date '${els[3]}' is not in CCYYMMDD format`, expected: "CCYYMMDD (8 digits, e.g. 20260316)", actual: `'${els[3]}'`, aiHint: "Dates in EDI must be CCYYMMDD with no separators. Strip slashes, dashes, or timezone indicators during date normalization in your mapping logic." });
      }
      return errs;
    },
    REF: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (els[2] && els[2].length < 6) {
        errs.push({ id: `REF-${idx}-02`, lineNumber: ln, segmentIndex: idx, segmentName: "REF", element: "REF02", elementIndex: 2, severity: "error", code: "REF02-SHORT", message: `REF02 value '${els[2]}' is too short (${els[2].length} chars, min 6)`, expected: "Alphanumeric, 6–15 characters", actual: `'${els[2]}' (${els[2].length} chars)`, aiHint: "Short REF02 values often indicate truncation during data extraction. Add a length validation check in your pre-transmission EDI validator." });
      }
      if (els[1] && !["EJ", "1W", "6P", "F8", "9F", "EA", "D9", "LU"].includes(els[1])) {
        errs.push({ id: `REF-${idx}-01`, lineNumber: ln, segmentIndex: idx, segmentName: "REF", element: "REF01", elementIndex: 1, severity: "warning", code: "REF01-UNKNOWN", message: `REF01 qualifier '${els[1]}' may not be recognized by this payer`, expected: "EJ, 1W, 6P, F8, 9F...", actual: `'${els[1]}'`, aiHint: "Verify the REF01 qualifier against your payer's companion guide. Non-standard qualifiers may cause the reference to be ignored or rejected." });
      }
      return errs;
    },
    SV1: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (!els[2] || els[2].trim() === "" || els[2] === "EMPTY") {
        errs.push({ id: `SV1-${idx}-02`, lineNumber: ln, segmentIndex: idx, segmentName: "SV1", element: "SV102", elementIndex: 2, severity: "error", code: "SV102-MISSING", message: "SV102 (Service Line Charge Amount) is missing or empty", expected: "Positive decimal value (e.g. 350.00)", actual: els[2] || "EMPTY", aiHint: "Each service line requires a charge amount. Check the line-item extraction logic from your billing system. Ensure SV102 is mapped from the line charge field." });
      }
      return errs;
    },
    HL: (els, idx, ln) => {
      const errs: ParseError[] = [];
      const validCodes = ["20", "21", "22", "23", "SS", "PT", "IL", "PR", "NN", "J1", "1P", "FA", "GP", "OS"];
      if (els[3] && !validCodes.includes(els[3])) {
        errs.push({ id: `HL-${idx}-03`, lineNumber: ln, segmentIndex: idx, segmentName: "HL", element: "HL03", elementIndex: 3, severity: "error", code: "HL03-INVALID", message: `HL03 level code '${els[3]}' is not valid for this transaction`, expected: "20, 21, 22, 23 (for 270/271)", actual: `'${els[3]}'`, aiHint: "HL03 defines the hierarchical level. For 270 transactions it must be 20/21/22/23. Rebuild the HL loop with correct level codes per the implementation guide." });
      }
      return errs;
    },
    EQ: (els, idx, ln) => {
      const errs: ParseError[] = [];
      const validServiceTypes = ["1", "2", "3", "4", "5", "23", "30", "35", "48", "86", "98", "AL", "MH", "UC"];
      if (els[1] && !validServiceTypes.includes(els[1])) {
        errs.push({ id: `EQ-${idx}-01`, lineNumber: ln, segmentIndex: idx, segmentName: "EQ", element: "EQ01", elementIndex: 1, severity: "error", code: "EQ01-INVALID", message: `EQ01 service type code '${els[1]}' is unrecognized`, expected: "Valid X12 270 service type code", actual: `'${els[1]}'`, aiHint: "Map your benefit categories to valid X12 270 service type codes. Use the current X12 270 implementation guide code table." });
      }
      return errs;
    },
    DMG: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (els[2] && els[1] === "D8" && !/^\d{8}$/.test(els[2])) {
        errs.push({ id: `DMG-${idx}-02`, lineNumber: ln, segmentIndex: idx, segmentName: "DMG", element: "DMG02", elementIndex: 2, severity: "warning", code: "DMG02-FORMAT", message: `DMG02 date '${els[2]}' has extra characters or wrong format`, expected: "CCYYMMDD (8 digits)", actual: `'${els[2]}' (${els[2].length} chars)`, aiHint: "Dates must be exactly 8 digits in CCYYMMDD format. Strip any trailing timezone indicators (T, Z) during extraction." });
      }
      return errs;
    },
    GS: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (els[4] && !/^\d{8}$/.test(els[4])) {
        errs.push({ id: `GS-${idx}-04`, lineNumber: ln, segmentIndex: idx, segmentName: "GS", element: "GS04", elementIndex: 4, severity: "warning", code: "GS04-FORMAT", message: `GS04 date '${els[4]}' format may be invalid`, expected: "CCYYMMDD (8 digits)", actual: `'${els[4]}'`, aiHint: "Ensure GS04 reflects the actual batch generation date. Use dynamic date generation rather than a hardcoded or static value." });
      }
      return errs;
    },
    TRN: (els, idx, ln) => {
      const errs: ParseError[] = [];
      if (!els[2] || els[2].trim() === "") {
        errs.push({ id: `TRN-${idx}-02`, lineNumber: ln, segmentIndex: idx, segmentName: "TRN", element: "TRN02", elementIndex: 2, severity: "error", code: "TRN02-MISSING", message: "TRN02 trace number is missing", expected: "Unique reference identifier", actual: "EMPTY", aiHint: "TRN02 is required for matching 270 requests to 271 responses. Generate a unique trace number per transaction using a UUID or timestamp-based sequence." });
      }
      return errs;
    },
  };

  rawSegments.forEach((rawSeg, segIdx) => {
    const lineNumber = content.slice(0, content.indexOf(rawSeg)).split("\n").length;
    const elements = rawSeg.split("*");
    const segName = elements[0].trim().toUpperCase();

    // Extract ISA fields
    if (segName === "ISA" && elements.length >= 14) {
      interchangeId = elements[13] || "—";
      senderId = (elements[6] || "—").trim();
      receiverId = (elements[8] || "—").trim();
    }
    if (segName === "ST" && elements.length >= 2) {
      transactionType = elements[1] || "—";
    }

    const segErrors = RULES[segName] ? RULES[segName](elements, segIdx, lineNumber) : [];
    errors.push(...segErrors);

    segments.push({
      index: segIdx,
      lineNumber,
      name: segName,
      elements,
      errors: segErrors.filter(e => e.severity === "error"),
      warnings: segErrors.filter(e => e.severity === "warning"),
      raw: rawSeg,
    });
  });

  return {
    segments,
    errors,
    parseTimeMs: Math.round((performance.now() - start) * 100) / 100,
    interchangeId,
    senderId,
    receiverId,
    transactionType,
    segmentCount: segments.length,
    isValid: errors.filter(e => e.severity === "error").length === 0,
  };
}

// ─── Syntax-highlighted segment render ───────────────────────────────────────
function highlightEDI(content: string, parseResult: ParseResult | null): string {
  const errorLines = new Set<number>();
  const warnLines = new Set<number>();
  if (parseResult) {
    parseResult.errors.forEach(e => {
      if (e.severity === "error") errorLines.add(e.lineNumber);
      if (e.severity === "warning") warnLines.add(e.lineNumber);
    });
  }

  const lines = content.split("\n");
  return lines.map((line, idx) => {
    const lineNum = idx + 1;
    const hasErr = errorLines.has(lineNum);
    const hasWarn = warnLines.has(lineNum);

    // Escape HTML
    const esc = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Tokenize the line
    const highlighted = esc
      // Segment name (before first *)
      .replace(/^([A-Z0-9]{2,3})(\*|~|$)/, (_m, name, rest) => {
        const isStructural = ["ISA", "IEA", "GS", "GE", "ST", "SE"].includes(name);
        const color = isStructural ? "#8B5CF6" : "#10B981";
        return `<span style="color:${color};font-weight:700">${name}</span><span style="color:#475569">${rest}</span>`;
      })
      // Delimiters
      .replace(/\*/g, `<span style="color:#334155">*</span>`)
      .replace(/~/g, `<span style="color:#475569;font-weight:700">~</span>`);

    let bgStyle = "";
    let borderStyle = "";
    if (hasErr) {
      bgStyle = "background:rgba(239,68,68,0.08);";
      borderStyle = "border-left:3px solid #EF4444;padding-left:4px;";
    } else if (hasWarn) {
      bgStyle = "background:rgba(245,158,11,0.06);";
      borderStyle = "border-left:3px solid #F59E0B;padding-left:4px;";
    } else {
      borderStyle = "border-left:3px solid transparent;padding-left:4px;";
    }

    return `<span style="display:block;${bgStyle}${borderStyle}">${highlighted || " "}</span>`;
  }).join("");
}

// ─── File Loader types ────────────────────────────────────────────────────────
type LoadSource = "local" | "s3" | "fsx" | "azure" | "sftp" | "url";

interface LoaderConfig {
  s3: { region: string; bucket: string; key: string; profile: string };
  fsx: { mountPath: string; filePath: string; fsId: string };
  azure: { connectionString: string; container: string; blob: string };
  sftp: { host: string; port: string; user: string; path: string };
  url: { url: string; headers: string };
}

const DEFAULT_LOADER_CFG: LoaderConfig = {
  s3: { region: "us-east-1", bucket: "data-processing-edi", key: "inbound/file.edi", profile: "default" },
  fsx: { mountPath: "/mnt/fsx", filePath: "inbound/healthcare/file.edi", fsId: "fs-01234567890abcdef" },
  azure: { connectionString: "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=...", container: "edi-files", blob: "inbound/file.edi" },
  sftp: { host: "sftp.tradingpartner.com", port: "22", user: "ediuser", path: "/inbound/file.edi" },
  url: { url: "https://your-api.com/edi/file", headers: "Authorization: Bearer YOUR_TOKEN" },
};

const SOURCE_DEFS: { id: LoadSource; label: string; icon: React.FC<any>; color: string; desc: string }[] = [
  { id: "local", label: "Local File", icon: HardDrive, color: "#10B981", desc: "Upload from your machine" },
  { id: "s3", label: "AWS S3", icon: Cloud, color: "#F59E0B", desc: "S3 bucket + key path" },
  { id: "fsx", label: "Amazon FSx", icon: Server, color: "#3B82F6", desc: "FSx mount path" },
  { id: "azure", label: "Azure Blob", icon: Database, color: "#8B5CF6", desc: "Azure storage container" },
  { id: "sftp", label: "SFTP / FTP", icon: Wifi, color: "#EC4899", desc: "Remote file transfer" },
  { id: "url", label: "HTTP / API", icon: Link2, color: "#06B6D4", desc: "Fetch from URL or API" },
];

// ─── File Loader Panel ────────────────────────────────────────────────────────
function FileLoaderPanel({ onLoad, onClose }: { onLoad: (content: string, name: string) => void; onClose: () => void }) {
  const { isDark } = useTheme();
  const panelBg    = isDark ? "#0A1020" : "#FFFFFF";
  const [source, setSource] = useState<LoadSource>("local");
  const [cfg, setCfg] = useState<LoaderConfig>(DEFAULT_LOADER_CFG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateCfg = (src: keyof LoaderConfig, key: string, val: string) => {
    setCfg(prev => ({ ...prev, [src]: { ...prev[src], [key]: val } }));
  };

  // Local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      onLoad(text, file.name);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(file);
  };

  // Simulated remote fetch (mock for S3, FSx, Azure, SFTP, URL)
  const handleRemoteLoad = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setLoading(false);
      // Return a mock EDI to demonstrate
      const mockContent = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER        *260316*1200*^*00501*000000001*0*P*:~
GS*HC*SENDER*RECEIVER*20260316*1200*1*X*005010X222A1~
ST*837*0001~
BHT*0019*00*2026031601*20260316*1200*CH~
NM1*41*2*LOADED HOSPITAL*****46*LOAD001~
CLM*LOADED-001*1500.00*11:B:1**A*1*C*Y~
DTP*472*D8*20260316~
SV1*HC:99213*1500.00*UN*1**1~
SE*8*0001~
GE*1*1~
IEA*1*000000001~`;
      const nameMap: Record<LoadSource, string> = {
        s3: `s3://${cfg.s3.bucket}/${cfg.s3.key}`,
        fsx: `${cfg.fsx.mountPath}/${cfg.fsx.filePath}`,
        azure: `azure://${cfg.azure.container}/${cfg.azure.blob}`,
        sftp: `sftp://${cfg.sftp.host}${cfg.sftp.path}`,
        url: cfg.url.url,
        local: "file.edi",
      };
      onLoad(mockContent, nameMap[source]);
    }, 1400);
  };

  const srcDef = SOURCE_DEFS.find(s => s.id === source)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: panelBg, border: `1px solid ${C.em}30`, boxShadow: `0 0 60px ${C.em}15` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.glassBorder}`, background: "rgba(16,185,129,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.emDim, border: `1px solid ${C.em}35` }}>
              <FolderOpen className="w-4.5 h-4.5" style={{ color: C.em, width: 18, height: 18 }} />
            </div>
            <div>
              <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Load EDI File</div>
              <div className="font-mono" style={{ color: C.muted, fontSize: "0.65rem" }}>Select source · configure · load into editor</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
            <X className="w-4 h-4" style={{ color: C.muted }} />
          </button>
        </div>

        {/* Source selector */}
        <div className="px-6 pt-5 pb-3">
          <div className="font-mono mb-3" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>SELECT SOURCE</div>
          <div className="grid grid-cols-3 gap-2.5">
            {SOURCE_DEFS.map(s => (
              <button
                key={s.id}
                onClick={() => { setSource(s.id); setError(null); }}
                className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{
                  background: source === s.id ? `${s.color}12` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${source === s.id ? `${s.color}40` : C.glassBorder}`,
                  boxShadow: source === s.id ? `0 0 16px ${s.color}18` : "none",
                }}
              >
                <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: source === s.id ? s.color : C.muted }} />
                <div>
                  <div className="font-mono" style={{ color: source === s.id ? s.color : C.text, fontSize: "0.72rem", fontWeight: 700 }}>{s.label}</div>
                  <div style={{ color: C.muted, fontSize: "0.62rem" }}>{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Source config */}
        <div className="px-6 pb-5">
          <div className="p-4 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${srcDef.color}30` }}>
            <div className="flex items-center gap-2 mb-4">
              <srcDef.icon className="w-3.5 h-3.5" style={{ color: srcDef.color }} />
              <span className="font-mono" style={{ color: srcDef.color, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em" }}>{srcDef.label.toUpperCase()} CONFIGURATION</span>
            </div>

            {/* LOCAL */}
            {source === "local" && (
              <div className="space-y-3">
                <div
                  className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ borderColor: `${C.em}40`, background: C.emDim }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mb-3" style={{ color: C.em }} />
                  <div style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700, marginBottom: 4 }}>Click to browse or drag & drop</div>
                  <div className="font-mono" style={{ color: C.muted, fontSize: "0.68rem" }}>Supports .edi, .x12, .txt, .edi837, .edi835, .270, .835, .837</div>
                </div>
                <input ref={fileInputRef} type="file" accept=".edi,.x12,.txt,.837,.835,.270,.271,.278,.820,.834" className="hidden" onChange={handleFileUpload} />
                <div className="font-mono p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", color: C.muted, fontSize: "0.65rem" }}>
                  File is read locally — nothing is uploaded to any server
                </div>
              </div>
            )}

            {/* S3 */}
            {source === "s3" && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "AWS REGION", key: "region", placeholder: "us-east-1" },
                  { label: "PROFILE", key: "profile", placeholder: "default" },
                  { label: "S3 BUCKET", key: "bucket", placeholder: "my-edi-bucket" },
                  { label: "OBJECT KEY", key: "key", placeholder: "inbound/file.edi" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>{f.label}</label>
                    <input
                      type="text"
                      value={(cfg.s3 as any)[f.key]}
                      onChange={e => updateCfg("s3", f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg outline-none font-mono"
                      style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.text, fontSize: "0.72rem" }}
                    />
                  </div>
                ))}
                <div className="col-span-2 font-mono p-2.5 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: C.warn, fontSize: "0.63rem" }}>
                  s3://{cfg.s3.bucket}/{cfg.s3.key} · region: {cfg.s3.region} · profile: {cfg.s3.profile}
                </div>
              </div>
            )}

            {/* FSx */}
            {source === "fsx" && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "FILESYSTEM ID", key: "fsId", placeholder: "fs-01234567890abcdef" },
                  { label: "MOUNT PATH", key: "mountPath", placeholder: "/mnt/fsx" },
                  { label: "FILE PATH (relative)", key: "filePath", placeholder: "inbound/file.edi", span: true },
                ].map(f => (
                  <div key={f.key} className={(f as any).span ? "col-span-2" : ""}>
                    <label className="block font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>{f.label}</label>
                    <input
                      type="text"
                      value={(cfg.fsx as any)[f.key]}
                      onChange={e => updateCfg("fsx", f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg outline-none font-mono"
                      style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.text, fontSize: "0.72rem" }}
                    />
                  </div>
                ))}
                <div className="col-span-2 font-mono p-2.5 rounded-lg" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: C.info, fontSize: "0.63rem" }}>
                  {cfg.fsx.mountPath}/{cfg.fsx.filePath} · FSx ID: {cfg.fsx.fsId}
                </div>
              </div>
            )}

            {/* Azure */}
            {source === "azure" && (
              <div className="space-y-3">
                {[
                  { label: "CONNECTION STRING", key: "connectionString", placeholder: "DefaultEndpointsProtocol=https;..." },
                  { label: "CONTAINER", key: "container", placeholder: "edi-files" },
                  { label: "BLOB PATH", key: "blob", placeholder: "inbound/file.edi" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>{f.label}</label>
                    <input
                      type="text"
                      value={(cfg.azure as any)[f.key]}
                      onChange={e => updateCfg("azure", f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg outline-none font-mono"
                      style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.text, fontSize: "0.72rem" }}
                    />
                  </div>
                ))}
                <div className="font-mono p-2.5 rounded-lg" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: C.purple, fontSize: "0.63rem" }}>
                  azure://{cfg.azure.container}/{cfg.azure.blob}
                </div>
              </div>
            )}

            {/* SFTP */}
            {source === "sftp" && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "HOST", key: "host", placeholder: "sftp.partner.com" },
                  { label: "PORT", key: "port", placeholder: "22" },
                  { label: "USERNAME", key: "user", placeholder: "ediuser" },
                  { label: "REMOTE PATH", key: "path", placeholder: "/inbound/file.edi" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>{f.label}</label>
                    <input
                      type={f.key === "port" ? "number" : "text"}
                      value={(cfg.sftp as any)[f.key]}
                      onChange={e => updateCfg("sftp", f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg outline-none font-mono"
                      style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.text, fontSize: "0.72rem" }}
                    />
                  </div>
                ))}
                <div className="col-span-2 font-mono p-2.5 rounded-lg" style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", color: "#EC4899", fontSize: "0.63rem" }}>
                  sftp://{cfg.sftp.user}@{cfg.sftp.host}:{cfg.sftp.port}{cfg.sftp.path}
                </div>
              </div>
            )}

            {/* HTTP / URL */}
            {source === "url" && (
              <div className="space-y-3">
                <div>
                  <label className="block font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>ENDPOINT URL</label>
                  <input
                    type="url"
                    value={cfg.url.url}
                    onChange={e => updateCfg("url", "url", e.target.value)}
                    placeholder="https://api.partner.com/edi/file"
                    className="w-full px-3 py-2 rounded-lg outline-none font-mono"
                    style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.text, fontSize: "0.72rem" }}
                  />
                </div>
                <div>
                  <label className="block font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>REQUEST HEADERS (one per line)</label>
                  <textarea
                    value={cfg.url.headers}
                    onChange={e => updateCfg("url", "headers", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg outline-none font-mono resize-none"
                    style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.text, fontSize: "0.72rem", lineHeight: 1.6 }}
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg" style={{ background: C.errDim, border: `1px solid ${C.err}30` }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.err }} />
              <span style={{ color: C.err, fontSize: "0.72rem" }}>{error}</span>
            </div>
          )}

          {/* Footer actions */}
          {source !== "local" && (
            <div className="flex items-center gap-3 mt-5">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-mono" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.sub, fontSize: "0.78rem", fontWeight: 600, }}>
                Cancel
              </button>
              <button
                onClick={handleRemoteLoad}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-mono flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ background: loading ? "rgba(255,255,255,0.05)" : srcDef.color, color: loading ? C.muted : "#fff", fontSize: "0.82rem", fontWeight: 700, boxShadow: loading ? "none" : `0 0 20px ${srcDef.color}40` }}
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</>
                ) : (
                  <><Download className="w-4 h-4" /> Load from {srcDef.label}</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main EDI Live Editor Component ──────────────────────────────────────────
export function EDILiveEditor() {
  const { isDark } = useTheme();
  // theme-adaptive surface tokens
  const outerBg    = isDark ? "#060C17"            : "#FFFFFF";
  const toolbarBg  = isDark ? "rgba(7,12,24,0.95)" : "#FFFFFF";
  const rightTabBg = isDark ? "rgba(7,12,24,0.92)" : "#FFFFFF";
  const editorBg   = isDark ? "#050B18"            : "#FFFFFF";
  const gutterBg   = isDark ? "rgba(5,10,22,0.7)"  : "#F8FAFC";
  const errGutterBg= isDark ? "rgba(5,8,18,0.85)"  : "#F8FAFC";
  const consoleBg  = isDark ? "rgba(4,8,18,0.70)"  : "#FFFFFF";
  const engineBg   = isDark ? "rgba(4,8,18,0.75)"  : "#F8FAFC";
  const inactiveBtnBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const textareaColor = isDark ? "#94A3B8"          : "#334155";

  const [selectedFile, setSelectedFile] = useState("837p_errors");
  const [content, setContent] = useState(SAMPLE_FILES["837p_errors"].content);
  const [showLoader, setShowLoader] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [showHighlight, setShowHighlight] = useState(true);
  const [selectedSegIdx, setSelectedSegIdx] = useState<number | null>(null);
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const [activePanel, setActivePanel] = useState<"errors" | "tree" | "console">("errors");
  const [parseHistory, setParseHistory] = useState<{ ts: string; errors: number; warnings: number; ms: number }[]>([]);
  const [autoRun, setAutoRun] = useState(true);
  const [segmentFilter, setSegmentFilter] = useState<string>("ALL");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // rAF-throttled scroll sync — prevents layout thrashing on every event tick
  const rafRef = useRef<number | null>(null);
  const syncScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (textareaRef.current && highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop;
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    });
  }, []);

  // Run parse — fully synchronous, zero artificial delay
  const runParse = useCallback((text: string) => {
    const result = parseEDI(text);
    setParseResult(result);
    setIsParsing(false);
    setParseHistory(prev => [
      { ts: new Date().toLocaleTimeString(), errors: result.errors.filter(e => e.severity === "error").length, warnings: result.errors.filter(e => e.severity === "warning").length, ms: result.parseTimeMs },
      ...prev.slice(0, 9),
    ]);
  }, []);

  // Auto-parse on content change (debounced 500ms)
  useEffect(() => {
    if (!autoRun) return;
    setIsParsing(true);
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    parseTimerRef.current = setTimeout(() => runParse(content), 500);
    return () => { if (parseTimerRef.current) clearTimeout(parseTimerRef.current); };
  }, [content, autoRun, runParse]);

  // Initial parse
  useEffect(() => { runParse(content); }, []);

  const loadSample = (key: string) => {
    setSelectedFile(key);
    setContent(SAMPLE_FILES[key].content);
    setSelectedSegIdx(null);
    setSelectedErrorId(null);
  };

  // Single split, reused everywhere — never split the same string twice per render
  const contentLines = useMemo(() => content.split("\n"), [content]);
  const lineCount = contentLines.length;

  // O(1) line-error lookup — replaces O(n²) .some() in the gutter
  const errLineMap = useMemo(() => {
    const m = new Map<number, "error" | "warning">();
    if (!parseResult) return m;
    for (const e of parseResult.errors) {
      const existing = m.get(e.lineNumber);
      if (!existing || (existing === "warning" && e.severity === "error")) {
        m.set(e.lineNumber, e.severity as "error" | "warning");
      }
    }
    return m;
  }, [parseResult]);

  const errCount  = useMemo(() => parseResult?.errors.filter(e => e.severity === "error").length ?? 0,   [parseResult]);
  const warnCount = useMemo(() => parseResult?.errors.filter(e => e.severity === "warning").length ?? 0, [parseResult]);

  const selectedError = useMemo(() => parseResult?.errors.find(e => e.id === selectedErrorId) ?? null, [parseResult, selectedErrorId]);

  const highlightedHtml = useMemo(
    () => showHighlight
      ? highlightEDI(content, parseResult)
      : contentLines.map(l => `<span style="display:block;border-left:3px solid transparent;padding-left:4px">${l || " "}</span>`).join(""),
    [content, contentLines, parseResult, showHighlight]
  );

  const scrollToLine = (lineNumber: number) => {
    if (!textareaRef.current) return;
    const lines = textareaRef.current.value.split("\n");
    const charPos = lines.slice(0, lineNumber - 1).join("\n").length + (lineNumber > 1 ? 1 : 0);
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charPos, charPos + (lines[lineNumber - 1] || "").length);
  };

  const SEGMENT_PILLS = ["ALL","ISA","GS","ST","BHT","NM1","CLM","DTP","SV1"];

  const handleSegmentPill = (seg: string) => {
    setSegmentFilter(seg);
    if (seg === "ALL") return;
    const lines = content.split("\n");
    const idx = lines.findIndex(l => l.trimStart().startsWith(seg + "*") || l.trim() === seg);
    if (idx !== -1) scrollToLine(idx + 1);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)", background: outerBg }}>

      {/* ── Segment Filter Pills ── */}
      <div
        className="flex items-center gap-2 px-5 flex-shrink-0 overflow-x-auto"
        style={{
          paddingTop: 10, paddingBottom: 10,
          borderBottom: `1px solid ${C.glassBorder}`,
          background: toolbarBg,
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          scrollbarWidth: "none",
        }}
      >
        {SEGMENT_PILLS.map(seg => {
          const active = segmentFilter === seg;
          return (
            <button
              key={seg}
              onClick={() => handleSegmentPill(seg)}
              className="font-mono flex-shrink-0 transition-all"
              style={{
                padding: "4px 14px",
                borderRadius: 999,
                fontSize: "0.68rem",
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.03em",
                cursor: "pointer",
                border: `1.5px solid ${active ? C.em : isDark ? "rgba(255,255,255,0.14)" : "#CBD5E1"}`,
                background: active
                  ? isDark ? "rgba(16,185,129,0.14)" : "rgba(16,185,129,0.10)"
                  : isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                color: active ? C.em : isDark ? "#94A3B8" : "#64748B",
                boxShadow: active ? `0 0 10px ${C.emGlow}, 0 0 20px ${C.emGlow}` : "none",
                textShadow: active ? `0 0 8px ${C.emGlow}` : "none",
              }}
            >
              {seg}
            </button>
          );
        })}
      </div>

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${C.glassBorder}`, background: toolbarBg, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.purple }} />
            <span className="font-mono" style={{ color: C.purple, fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.1em" }}>DEV · UNIT TESTING</span>
          </div>
          <Terminal className="w-4 h-4" style={{ color: C.em }} />
          <span style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>EDI Live Text Editor</span>
          <span style={{ color: C.muted, fontSize: "0.75rem" }}>— Live parse & error highlighting</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Load file button */}
          <button
            onClick={() => setShowLoader(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono transition-all hover:scale-105"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)", color: C.purple, fontSize: "0.7rem", fontWeight: 700 }}
          >
            <Upload className="w-3 h-3" /> Load File
          </button>

          {/* File selector */}
          <select
            value={selectedFile}
            onChange={e => loadSample(e.target.value)}
            className="px-3 py-2 rounded-lg font-mono outline-none"
            style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.text, fontSize: "0.72rem" }}
          >
            {Object.entries(SAMPLE_FILES).map(([k, f]) => (
              <option key={k} value={k}>{f.label}</option>
            ))}
          </select>

          {/* Auto-parse toggle */}
          <button
            onClick={() => setAutoRun(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono"
            style={{ background: autoRun ? C.emDim : inactiveBtnBg, border: `1px solid ${autoRun ? `${C.em}40` : C.border}`, color: autoRun ? C.em : C.muted, fontSize: "0.7rem", fontWeight: 700 }}
          >
            <RefreshCw className="w-3 h-3" /> LIVE PARSE {autoRun ? "ON" : "OFF"}
          </button>

          {/* Highlight toggle */}
          <button
            onClick={() => setShowHighlight(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: showHighlight ? "rgba(59,130,246,0.1)" : inactiveBtnBg, border: `1px solid ${showHighlight ? `${C.info}40` : C.border}`, color: showHighlight ? C.info : C.muted, fontSize: "0.7rem", fontWeight: 700 }}
          >
            {showHighlight ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span className="font-mono">HIGHLIGHT</span>
          </button>

          {/* Manual run */}
          <button
            onClick={() => runParse(content)}
            disabled={isParsing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: isParsing ? inactiveBtnBg : C.em, color: isParsing ? C.muted : "#fff", fontWeight: 700, fontSize: "0.75rem", boxShadow: isParsing ? "none" : `0 0 16px ${C.emGlow}` }}
          >
            <Play className="w-3.5 h-3.5" /> {isParsing ? "Parsing…" : "Run Parse"}
          </button>
        </div>
      </div>

      {/* ── Status bar (below toolbar) ── */}
      <div className="flex items-center gap-4 px-5 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${C.glassBorder}`, background: C.glassBg }}>
        <div className="flex items-center gap-1.5 font-mono">
          <Hash className="w-3 h-3" style={{ color: C.muted }} />
          <span style={{ color: C.muted, fontSize: "0.65rem" }}>{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <Layers className="w-3 h-3" style={{ color: C.muted }} />
          <span style={{ color: C.muted, fontSize: "0.65rem" }}>{parseResult?.segmentCount ?? 0} segments</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <Clock className="w-3 h-3" style={{ color: C.muted }} />
          <span style={{ color: C.muted, fontSize: "0.65rem" }}>
            {isParsing ? "Parsing…" : parseResult ? `${parseResult.parseTimeMs}ms` : "—"}
          </span>
        </div>
        {parseResult && (
          <>
            <div className="flex items-center gap-1.5">
              <span style={{ color: C.muted, fontSize: "0.65rem", fontFamily: "monospace" }}>TX:</span>
              <span className="font-mono" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700 }}>{parseResult.transactionType}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: C.muted, fontSize: "0.65rem", fontFamily: "monospace" }}>ISA:</span>
              <span className="font-mono" style={{ color: C.sub, fontSize: "0.65rem" }}>{parseResult.interchangeId}</span>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          {errCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono" style={{ background: C.errDim, border: `1px solid ${C.err}30`, color: C.err, fontSize: "0.65rem", fontWeight: 700 }}>
              <AlertCircle className="w-3 h-3" /> {errCount} error{errCount !== 1 ? "s" : ""}
            </div>
          )}
          {warnCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono" style={{ background: C.warnDim, border: `1px solid ${C.warn}30`, color: C.warn, fontSize: "0.65rem", fontWeight: 700 }}>
              <AlertTriangle className="w-3 h-3" /> {warnCount} warning{warnCount !== 1 ? "s" : ""}
            </div>
          )}
          {parseResult?.isValid && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono" style={{ background: C.emDim, border: `1px solid ${C.em}30`, color: C.em, fontSize: "0.65rem", fontWeight: 700 }}>
              <CheckCircle2 className="w-3 h-3" /> VALID
            </div>
          )}
          {autoRun && (
            <div className="flex items-center gap-1 font-mono" style={{ color: C.em, fontSize: "0.6rem" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.em }} /> LIVE
            </div>
          )}
        </div>
      </div>

      {/* ── Main editor area ── */}
      <div className="flex flex-1 min-h-0">

        {/* ─── Editor pane (left 60%) ─── */}
        <div className="flex flex-col" style={{ flex: "0 0 60%", borderRight: `1px solid ${C.glassBorder}`, minWidth: 0 }}>

          {/* Editor header */}
          <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${C.glassBorder}`, background: C.glassBg }}>
            <div className="flex items-center gap-2">
              <FileCode2 className="w-3.5 h-3.5" style={{ color: C.em }} />
              <span className="font-mono" style={{ color: C.sub, fontSize: "0.7rem" }}>
                {SAMPLE_FILES[selectedFile]?.label} · {SAMPLE_FILES[selectedFile]?.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setContent(""); setParseResult(null); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono"
                style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.muted, fontSize: "0.65rem" }}
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(content).catch(() => {})}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono"
                style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.muted, fontSize: "0.65rem" }}
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono"
                style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, color: C.muted, fontSize: "0.65rem" }}
              >
                <Download className="w-3 h-3" /> Save
              </button>
            </div>
          </div>

          {/* Editor body */}
          <div className="flex flex-1 min-h-0 overflow-hidden relative" style={{ background: editorBg, contain: "layout style", willChange: "transform" }}>
            {/* Line numbers */}
            <div
              className="select-none flex-shrink-0 overflow-hidden"
              style={{ width: 52, background: gutterBg, borderRight: `1px solid ${C.glassBorder}`, paddingTop: 12 }}
            >
              {Array.from({ length: lineCount }, (_, i) => {
                const lineNum = i + 1;
                const lineSev = errLineMap.get(lineNum);
                const hasErr  = lineSev === "error";
                const hasWarn = lineSev === "warning";
                return (
                  <div
                    key={lineNum}
                    className="flex items-center justify-end pr-2.5 cursor-pointer"
                    style={{ height: "1.5rem", minHeight: "1.5rem" }}
                    onClick={() => {
                      const err = parseResult?.errors.find(e => e.lineNumber === lineNum);
                      if (err) { setSelectedErrorId(err.id); setActivePanel("errors"); }
                      scrollToLine(lineNum);
                    }}
                  >
                    {hasErr && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1" style={{ background: C.err }} />}
                    {!hasErr && hasWarn && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1" style={{ background: C.warn }} />}
                    <span
                      className="font-mono"
                      style={{ color: hasErr ? C.err : hasWarn ? C.warn : C.muted, fontSize: "0.65rem", fontWeight: hasErr || hasWarn ? 700 : 400, lineHeight: "1.5rem" }}
                    >
                      {lineNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Code area: highlight overlay + textarea */}
            <div className="flex-1 relative overflow-hidden">
              {/* Syntax highlight layer (behind) */}
              <div
                ref={highlightRef}
                className="absolute inset-0 overflow-auto pointer-events-none font-mono"
                style={{
                  padding: "12px 12px",
                  fontSize: "0.775rem",
                  lineHeight: "1.5rem",
                  whiteSpace: "pre",
                  color: "transparent",
                  zIndex: 1,
                }}
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
              {/* Actual textarea (on top) */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onScroll={syncScroll}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="absolute inset-0 w-full h-full resize-none outline-none font-mono"
                style={{
                  background: "transparent",
                  color: showHighlight ? "transparent" : textareaColor,
                  caretColor: C.em,
                  padding: "12px 12px",
                  fontSize: "0.775rem",
                  lineHeight: "1.5rem",
                  zIndex: 2,
                  border: "none",
                  whiteSpace: "pre",
                  overflowWrap: "normal",
                  overflowX: "auto",
                }}
              />
            </div>
          </div>

          {/* Error gutter (bottom of editor) — inline error messages */}
          {parseResult && errCount + warnCount > 0 && (
            <div className="flex-shrink-0 overflow-auto" style={{ maxHeight: 120, borderTop: `1px solid ${C.glassBorder}`, background: errGutterBg }}>
              {parseResult.errors.slice(0, 8).map(err => (
                <button
                  key={err.id}
                  onClick={() => { setSelectedErrorId(err.id); setActivePanel("errors"); scrollToLine(err.lineNumber); }}
                  className="w-full flex items-center gap-2 px-4 py-1.5 text-left transition-all hover:bg-white/[0.03]"
                  style={{ borderBottom: `1px solid ${C.glassBorder}` }}
                >
                  {err.severity === "error"
                    ? <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: C.err }} />
                    : <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: C.warn }} />}
                  <span className="font-mono" style={{ color: C.muted, fontSize: "0.65rem", minWidth: 40 }}>L{err.lineNumber}</span>
                  <span className="font-mono" style={{ color: err.severity === "error" ? C.err : C.warn, fontSize: "0.65rem", fontWeight: 700, minWidth: 60 }}>{err.code}</span>
                  <span className="font-mono" style={{ color: err.severity === "error" ? "#FCA5A5" : "#FDE68A", fontSize: "0.65rem" }}>{err.message}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Right panel (40%) ─── */}
        <div className="flex flex-col" style={{ flex: "0 0 40%", minWidth: 0 }}>
          {/* Panel tabs */}
          <div className="flex items-center gap-0 flex-shrink-0" style={{ borderBottom: `1px solid ${C.glassBorder}`, background: rightTabBg }}>
            {([
              { id: "errors" as const, label: "Errors & Warnings", icon: AlertCircle, badge: errCount + warnCount },
              { id: "tree" as const, label: "Segment Tree", icon: Layers, badge: parseResult?.segmentCount },
              { id: "console" as const, label: "Parse Log", icon: Terminal },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => setActivePanel(t.id)}
                className="flex items-center gap-1.5 px-4 py-3 relative flex-shrink-0 transition-all"
                style={{ color: activePanel === t.id ? C.em : C.muted }}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span className="font-mono" style={{ fontSize: "0.7rem", fontWeight: activePanel === t.id ? 700 : 500 }}>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="font-mono px-1.5 rounded" style={{ background: t.id === "errors" ? `${C.err}20` : C.emDim, color: t.id === "errors" ? C.err : C.em, fontSize: "0.58rem", fontWeight: 700 }}>{t.badge}</span>
                )}
                {activePanel === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: C.em }} />}
              </button>
            ))}
          </div>

          {/* ── Errors panel ── */}
          {activePanel === "errors" && (
            <div className="flex flex-col flex-1 min-h-0">
              {!parseResult ? (
                <div className="flex-1 flex items-center justify-center" style={{ color: C.muted, fontSize: "0.78rem" }}>
                  {isParsing ? "Parsing…" : "Run parse to see results"}
                </div>
              ) : parseResult.errors.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <CheckCircle2 className="w-12 h-12" style={{ color: C.em, filter: `drop-shadow(0 0 12px ${C.emGlow})` }} />
                  <div style={{ color: C.em, fontWeight: 700, fontSize: "0.95rem", textShadow: `0 0 8px ${C.emGlow}, 0 0 20px ${C.emGlow}` }}>No errors detected</div>
                  <p style={{ color: C.muted, fontSize: "0.75rem", textAlign: "center", maxWidth: 200 }}>
                    EDI content passed all validation rules. File is ready for transmission.
                  </p>
                </div>
              ) : (
                <>
                  {/* Error detail pane */}
                  {selectedError && (
                    <div className="flex-shrink-0 p-4" style={{ borderBottom: `1px solid ${C.border}`, background: selectedError.severity === "error" ? `${C.err}06` : `${C.warn}06` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {selectedError.severity === "error"
                            ? <AlertCircle className="w-4 h-4" style={{ color: C.err }} />
                            : <AlertTriangle className="w-4 h-4" style={{ color: C.warn }} />}
                          <span className="font-mono" style={{ color: selectedError.severity === "error" ? C.err : C.warn, fontSize: "0.7rem", fontWeight: 800 }}>{selectedError.code}</span>
                          <span className="font-mono px-2 py-0.5 rounded" style={{ background: C.purpleDim, color: C.purple, fontSize: "0.6rem", fontWeight: 700 }}>L{selectedError.lineNumber} · {selectedError.segmentName}:{selectedError.element}</span>
                        </div>
                        <button onClick={() => setSelectedErrorId(null)}>
                          <X className="w-3.5 h-3.5" style={{ color: C.muted }} />
                        </button>
                      </div>
                      <p style={{ color: C.text, fontSize: "0.75rem", lineHeight: 1.5, marginBottom: 8 }}>{selectedError.message}</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="p-2 rounded-lg" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}` }}>
                          <div className="font-mono mb-0.5" style={{ color: C.muted, fontSize: "0.57rem", letterSpacing: "0.08em" }}>EXPECTED</div>
                          <div className="font-mono" style={{ color: C.em, fontSize: "0.7rem", wordBreak: "break-word" }}>{selectedError.expected}</div>
                        </div>
                        <div className="p-2 rounded-lg" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}` }}>
                          <div className="font-mono mb-0.5" style={{ color: C.muted, fontSize: "0.57rem", letterSpacing: "0.08em" }}>ACTUAL</div>
                          <div className="font-mono" style={{ color: C.err, fontSize: "0.7rem", wordBreak: "break-word" }}>{selectedError.actual}</div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg" style={{ background: C.purpleDim, border: `1px solid ${C.purple}25` }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="w-3 h-3" style={{ color: C.purple }} />
                          <span className="font-mono" style={{ color: C.purple, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>AI FIX HINT</span>
                        </div>
                        <p style={{ color: C.sub, fontSize: "0.7rem", lineHeight: 1.6 }}>{selectedError.aiHint}</p>
                      </div>
                    </div>
                  )}

                  {/* Error list */}
                  <div className="flex-1 overflow-auto" style={{ contain: "layout style", willChange: "transform" }}>
                    {parseResult.errors.map(err => (
                      <button
                        key={err.id}
                        onClick={() => { setSelectedErrorId(err.id === selectedErrorId ? null : err.id); scrollToLine(err.lineNumber); }}
                        className="w-full text-left px-4 py-3 transition-all hover:bg-white/[0.025] group"
                        style={{
                          borderBottom: `1px solid ${C.glassBorder}`,
                          background: selectedErrorId === err.id
                            ? err.severity === "error" ? `${C.err}08` : `${C.warn}08`
                            : "transparent",
                          borderLeft: `3px solid ${selectedErrorId === err.id ? (err.severity === "error" ? C.err : C.warn) : "transparent"}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {err.severity === "error"
                            ? <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: C.err }} />
                            : <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: C.warn }} />}
                          <span className="font-mono" style={{ color: err.severity === "error" ? C.err : C.warn, fontSize: "0.68rem", fontWeight: 800 }}>{err.code}</span>
                          <span className="font-mono" style={{ color: C.muted, fontSize: "0.63rem" }}>L{err.lineNumber}</span>
                          <span className="font-mono ml-auto" style={{ color: C.purple, fontSize: "0.63rem" }}>{err.segmentName}:{err.element}</span>
                        </div>
                        <p style={{ color: C.sub, fontSize: "0.7rem", lineHeight: 1.4, paddingLeft: 16 }}>{err.message}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Segment Tree panel ── */}
          {activePanel === "tree" && (
            <div className="flex-1 overflow-auto" style={{ contain: "layout style", willChange: "transform" }}>
              {!parseResult ? (
                <div className="flex-1 flex items-center justify-center p-8" style={{ color: C.muted, fontSize: "0.78rem" }}>Run parse to see segment tree</div>
              ) : (
                <div className="p-3">
                  {/* Envelope info */}
                  <div className="mb-3 p-3 rounded-xl" style={{ background: C.purpleDim, border: `1px solid ${C.purple}25` }}>
                    <div className="font-mono mb-2" style={{ color: C.purple, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em" }}>INTERCHANGE INFO</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "Sender", value: parseResult.senderId },
                        { label: "Receiver", value: parseResult.receiverId },
                        { label: "ISA ID", value: parseResult.interchangeId },
                        { label: "TX Type", value: parseResult.transactionType },
                      ].map(r => (
                        <div key={r.label} className="flex items-center gap-2">
                          <span style={{ color: C.muted, fontSize: "0.63rem" }}>{r.label}:</span>
                          <span className="font-mono" style={{ color: C.sub, fontSize: "0.63rem" }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {parseResult.segments.map(seg => {
                    const hasErrors = seg.errors.length > 0;
                    const hasWarnings = seg.warnings.length > 0;
                    const expanded = expandedSegments.has(seg.index);
                    const isSelected = selectedSegIdx === seg.index;

                    return (
                      <div key={seg.index} className="mb-0.5">
                        <button
                          onClick={() => {
                            setSelectedSegIdx(isSelected ? null : seg.index);
                            setExpandedSegments(prev => {
                              const next = new Set(prev);
                              next.has(seg.index) ? next.delete(seg.index) : next.add(seg.index);
                              return next;
                            });
                            scrollToLine(seg.lineNumber);
                          }}
                          className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-all hover:bg-white/[0.03]"
                          style={{
                            background: isSelected ? (hasErrors ? `${C.err}08` : `${C.em}06`) : "transparent",
                            border: `1px solid ${isSelected ? (hasErrors ? `${C.err}30` : `${C.em}25`) : "transparent"}`,
                          }}
                        >
                          {expanded
                            ? <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: C.muted }} />
                            : <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: C.muted }} />}
                          {hasErrors && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.err }} />}
                          {!hasErrors && hasWarnings && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.warn }} />}
                          {!hasErrors && !hasWarnings && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: `${C.em}40` }} />}
                          <span
                            className="font-mono"
                            style={{
                              color: hasErrors ? C.err : hasWarnings ? C.warn : ["ISA", "IEA", "GS", "GE", "ST", "SE"].includes(seg.name) ? C.purple : C.em,
                              fontSize: "0.75rem", fontWeight: 700,
                            }}
                          >
                            {seg.name}
                          </span>
                          <span className="font-mono flex-1 truncate" style={{ color: C.muted, fontSize: "0.65rem" }}>
                            {seg.elements.slice(1, 4).filter(Boolean).join(" · ").substring(0, 35)}
                          </span>
                          <span className="font-mono flex-shrink-0" style={{ color: C.muted, fontSize: "0.6rem" }}>L{seg.lineNumber}</span>
                          {hasErrors && <span className="font-mono flex-shrink-0" style={{ color: C.err, fontSize: "0.6rem", fontWeight: 700 }}>✗{seg.errors.length}</span>}
                        </button>

                        {expanded && (
                          <div className="ml-4 mb-1 p-2 rounded-lg" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}` }}>
                            {/* Raw */}
                            <div className="font-mono mb-2 text-xs overflow-x-auto" style={{ color: "#34D399", fontSize: "0.67rem", lineHeight: 1.5, whiteSpace: "pre" }}>
                              {seg.raw.substring(0, 120)}{seg.raw.length > 120 ? "…" : ""}
                            </div>
                            {/* Elements */}
                            <div className="space-y-0.5">
                              {seg.elements.slice(1).map((el, elIdx) => {
                                const elName = `${seg.name}${String(elIdx + 1).padStart(2, "0")}`;
                                const elErr = seg.errors.find(e => e.elementIndex === elIdx + 1) || seg.warnings.find(e => e.elementIndex === elIdx + 1);
                                return (
                                  <div key={elIdx} className="flex items-center gap-2">
                                    <span className="font-mono w-12 flex-shrink-0" style={{ color: C.purple, fontSize: "0.62rem" }}>{elName}</span>
                                    <span className="font-mono flex-1 truncate" style={{ color: elErr ? (elErr.severity === "error" ? C.err : C.warn) : C.sub, fontSize: "0.65rem" }}>
                                      {el || "(empty)"}
                                    </span>
                                    {elErr && (
                                      <span className="font-mono flex-shrink-0" style={{ color: elErr.severity === "error" ? C.err : C.warn, fontSize: "0.57rem", fontWeight: 700 }}>
                                        ✗ {elErr.code}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Parse Log panel ── */}
          {activePanel === "console" && (
            <div className="flex-1 overflow-auto p-4" style={{ background: consoleBg, contain: "layout style", willChange: "transform" }}>
              <div className="font-mono mb-4" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>PARSE HISTORY (last 10)</div>
              {parseHistory.length === 0 ? (
                <p style={{ color: C.muted, fontSize: "0.75rem" }}>No parse runs yet. Make an edit or click Run Parse.</p>
              ) : (
                <div className="space-y-2">
                  {parseHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}` }}>
                      <span className="font-mono" style={{ color: C.muted, fontSize: "0.65rem", minWidth: 70 }}>{h.ts}</span>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: h.errors > 0 ? C.err : C.em }} />
                      <span className="font-mono" style={{ color: h.errors > 0 ? C.err : C.em, fontSize: "0.65rem", fontWeight: 700, minWidth: 60 }}>
                        {h.errors > 0 ? `${h.errors}E ${h.warnings}W` : h.warnings > 0 ? `0E ${h.warnings}W` : "VALID"}
                      </span>
                      <span className="font-mono flex-1" style={{ color: C.muted, fontSize: "0.62rem" }}>{h.ms}ms</span>
                      {i === 0 && <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: C.emDim, color: C.em, fontSize: "0.57rem", fontWeight: 700 }}>LATEST</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Live parse metrics */}
              {parseResult && (
                <div className="mt-5">
                  <div className="font-mono mb-3" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>CURRENT PARSE METRICS</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Segments Parsed", value: parseResult.segmentCount, color: C.em },
                      { label: "Errors Found", value: errCount, color: errCount > 0 ? C.err : C.em },
                      { label: "Warnings Found", value: warnCount, color: warnCount > 0 ? C.warn : C.em },
                      { label: "Parse Time", value: `${parseResult.parseTimeMs}ms`, color: C.info },
                      { label: "File Valid", value: parseResult.isValid ? "YES" : "NO", color: parseResult.isValid ? C.em : C.err },
                      { label: "Line Count", value: lineCount, color: C.sub },
                    ].map(m => (
                      <div key={m.label} className="p-3 rounded-lg" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}` }}>
                        <div style={{ color: C.muted, fontSize: "0.6rem", marginBottom: 2 }}>{m.label}</div>
                        <div className="font-mono" style={{ color: m.color, fontSize: "0.9rem", fontWeight: 800 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 p-3 rounded-lg" style={{ background: engineBg, border: `1px solid rgba(16,185,129,0.18)` }}>
                <div className="font-mono mb-2" style={{ color: C.em, fontSize: "0.62rem", fontWeight: 700 }}>PARSE ENGINE</div>
                <div className="space-y-1">
                  {[
                    `> EDI Parser v4.0 (Data Processing Engine)`,
                    `> Segment delimiter: ~  |  Element delimiter: *`,
                    `> Validation rules loaded: ISA, GS, ST, CLM, NM1, DTP, REF, SV1, HL, EQ, DMG, TRN`,
                    `> Live parse mode: ${autoRun ? "ENABLED (400ms debounce)" : "MANUAL"}`,
                    parseResult ? `> Last parse: ${parseResult.parseTimeMs}ms — ${parseResult.isValid ? "PASSED" : "FAILED"}` : `> Ready for input...`,
                  ].map((line, i) => (
                    <div key={i} className="font-mono" style={{ color: i === 0 ? C.em : C.muted, fontSize: "0.63rem", lineHeight: 1.7 }}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── File Loader Modal ── */}
      {showLoader && (
        <FileLoaderPanel
          onLoad={(text, _name) => {
            setContent(text);
            setSelectedFile("blank");
            setShowLoader(false);
            runParse(text);
          }}
          onClose={() => setShowLoader(false)}
        />
      )}
    </div>
  );
}
