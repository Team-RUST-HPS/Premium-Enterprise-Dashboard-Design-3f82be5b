import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  X, ChevronRight, ChevronDown, Shield, Sparkles, CheckCircle2,
  AlertCircle, AlertTriangle, Layers, Hash, FileCode2, Tag,
  ArrowRight, Zap, Plus, Trash2, BookOpen, Info, Filter,
} from "lucide-react";

const C = {
  bg:          "var(--c-bg)",
  glassBg:     "var(--c-glass-bg)",
  glassBorder: "var(--c-glass-border)",
  text:        "var(--c-text)",
  sub:         "var(--c-sub)",
  muted:       "var(--c-muted)",
  em:          "#10B981",
  em2:         "#34D399",
  emDim:       "rgba(16,185,129,0.14)",
  emGlow:      "var(--c-em-glow)",
  emTextGlow:  "var(--c-em-text-glow)",
  info:        "#3B82F6",
  infoDim:     "rgba(59,130,246,0.12)",
  purple:      "#8B5CF6",
  purpleDim:   "rgba(139,92,246,0.12)",
  warn:        "#F59E0B",
  warnDim:     "rgba(245,158,11,0.12)",
  err:         "#EF4444",
  errDim:      "rgba(239,68,68,0.12)",
  border:      "var(--c-border)",
};

// ─── Schema Data Types ────────────────────────────────────────────────────────
type NodeType = "schema" | "loop" | "segment" | "element" | "composite";

interface SchemaNode {
  id:          string;
  name:        string;
  type:        NodeType;
  description: string;
  dataType?:   string;
  minOccurs?:  number;
  maxOccurs?:  number | "unbounded";
  minLen?:     number;
  maxLen?:     number;
  required?:   boolean;
  codeSet?:    string[];
  children?:   SchemaNode[];
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const SCHEMAS: Record<string, { label: string; version: string; root: SchemaNode }> = {
  "837P": {
    label: "837P — Professional Claims",
    version: "005010X222A1",
    root: {
      id: "837p-root", name: "EDI 837P", type: "schema", description: "HIPAA X12 Professional Claim",
      children: [
        {
          id: "837p-isa", name: "ISA — Interchange Control Header", type: "segment",
          description: "Opens the interchange envelope. Contains sender/receiver IDs and version info.", required: true,
          children: [
            { id: "isa01", name: "ISA01 · Authorization Info Qualifier", type: "element", description: "2-char code identifying authorization info type.", dataType: "ID", minLen: 2, maxLen: 2, required: true, codeSet: ["00","03"] },
            { id: "isa05", name: "ISA05 · Interchange Sender Qualifier", type: "element", description: "Qualifier identifying the sender ID.", dataType: "ID", minLen: 2, maxLen: 2, required: true, codeSet: ["01","ZZ","27","28"] },
            { id: "isa06", name: "ISA06 · Interchange Sender ID", type: "element", description: "ID of the sending trading partner.", dataType: "AN", minLen: 15, maxLen: 15, required: true },
            { id: "isa08", name: "ISA08 · Interchange Receiver ID", type: "element", description: "ID of the receiving trading partner.", dataType: "AN", minLen: 15, maxLen: 15, required: true },
            { id: "isa13", name: "ISA13 · Interchange Control Number", type: "element", description: "Unique interchange control number (sequential).", dataType: "N0", minLen: 9, maxLen: 9, required: true },
            { id: "isa16", name: "ISA16 · Component Element Separator", type: "element", description: "Single character used as sub-element separator.", dataType: "AN", minLen: 1, maxLen: 1, required: true },
          ],
        },
        {
          id: "837p-gs", name: "GS — Functional Group Header", type: "segment",
          description: "Groups related transaction sets within an interchange.", required: true,
          children: [
            { id: "gs01", name: "GS01 · Functional Identifier Code", type: "element", description: "Identifies the type of transactions in this group.", dataType: "ID", minLen: 2, maxLen: 2, required: true, codeSet: ["HC"] },
            { id: "gs02", name: "GS02 · Application Sender Code", type: "element", description: "Code identifying the originating application.", dataType: "AN", minLen: 2, maxLen: 15, required: true },
            { id: "gs04", name: "GS04 · Group Date", type: "element", description: "Date the group was created. Format CCYYMMDD.", dataType: "DT", minLen: 8, maxLen: 8, required: true },
          ],
        },
        {
          id: "837p-loop-1000a", name: "Loop 1000A — Submitter Name", type: "loop",
          description: "Identifies the submitter of the transaction.", minOccurs: 1, maxOccurs: 1,
          children: [
            {
              id: "837p-nm1-1000a", name: "NM1 — Submitter Name", type: "segment", description: "Name of the submitter entity.", required: true,
              children: [
                { id: "nm101-1000a", name: "NM101 · Entity Identifier Code", type: "element", description: "Identifies the type of entity submitting the claim.", dataType: "ID", required: true, codeSet: ["41"] },
                { id: "nm102-1000a", name: "NM102 · Entity Type Qualifier", type: "element", description: "1=Person, 2=Non-person.", dataType: "ID", required: true, codeSet: ["1","2"] },
                { id: "nm103-1000a", name: "NM103 · Last/Org Name", type: "element", description: "Last name (person) or org name (non-person).", dataType: "AN", minLen: 1, maxLen: 60, required: true },
                { id: "nm109-1000a", name: "NM109 · Submitter Identifier", type: "element", description: "Unique ID assigned to submitter by payer.", dataType: "AN", minLen: 2, maxLen: 80 },
              ],
            },
            {
              id: "837p-per-1000a", name: "PER — Submitter Contact", type: "segment", description: "Contact info for the submitter.",
              children: [
                { id: "per01-1000a", name: "PER01 · Contact Function Code", type: "element", description: "Code for the contact function.", dataType: "ID", required: true, codeSet: ["IC"] },
                { id: "per04-1000a", name: "PER04 · Communication Number", type: "element", description: "Phone number or contact value.", dataType: "AN", minLen: 1, maxLen: 256 },
              ],
            },
          ],
        },
        {
          id: "837p-loop-2000a", name: "Loop 2000A — Billing Provider", type: "loop",
          description: "Information about the billing provider.", minOccurs: 1, maxOccurs: "unbounded",
          children: [
            { id: "837p-hl-2000a", name: "HL — Hierarchical Level", type: "segment", description: "Defines the hierarchical position of the provider.", required: true,
              children: [
                { id: "hl01-2000a", name: "HL01 · Hierarchical ID Number", type: "element", description: "Sequential number within the transaction.", dataType: "AN", minLen: 1, maxLen: 12, required: true },
                { id: "hl03-2000a", name: "HL03 · Hierarchical Level Code", type: "element", description: "20=Information Source, 22=Subscriber, 23=Dependent.", dataType: "ID", required: true, codeSet: ["20","22","23"] },
              ],
            },
            {
              id: "837p-loop-2010aa", name: "Loop 2010AA — Billing Provider Name", type: "loop",
              description: "Name and address of billing provider.", minOccurs: 1, maxOccurs: 1,
              children: [
                {
                  id: "837p-nm1-2010aa", name: "NM1 — Billing Provider Name", type: "segment", description: "Legal name and NPI of billing provider.", required: true,
                  children: [
                    { id: "nm101-2010aa", name: "NM101 · Entity Code", type: "element", description: "85=Billing Provider.", dataType: "ID", required: true, codeSet: ["85"] },
                    { id: "nm109-2010aa", name: "NM109 · Billing Provider NPI", type: "element", description: "10-digit National Provider Identifier (NPI).", dataType: "AN", minLen: 10, maxLen: 10, required: true },
                  ],
                },
                { id: "837p-n3-2010aa", name: "N3 — Billing Provider Address", type: "segment", description: "Street address of billing provider.", required: true,
                  children: [
                    { id: "n301-2010aa", name: "N301 · Address Line 1", type: "element", description: "Street address line 1.", dataType: "AN", minLen: 1, maxLen: 55, required: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "837p-loop-2300", name: "Loop 2300 — Claim Information", type: "loop",
          description: "Core claim data for each claim being submitted.", minOccurs: 1, maxOccurs: "unbounded",
          children: [
            {
              id: "837p-clm", name: "CLM — Claim Information", type: "segment", description: "Primary claim data including claim ID and total charge.", required: true,
              children: [
                { id: "clm01", name: "CLM01 · Claim Identifier", type: "element", description: "Unique claim number assigned by the submitter.", dataType: "AN", minLen: 1, maxLen: 38, required: true },
                { id: "clm02", name: "CLM02 · Total Claim Charge Amount", type: "element", description: "Total billed charge for the claim. Must be > 0.", dataType: "R", minLen: 1, maxLen: 18, required: true },
                { id: "clm05", name: "CLM05 · Facility Type / Claim Frequency", type: "composite", description: "Composite: facility code, claim frequency, etc.", required: true,
                  children: [
                    { id: "clm05-1", name: "CLM05-1 · Facility Code", type: "element", description: "Place of service code.", dataType: "AN", minLen: 1, maxLen: 2 },
                    { id: "clm05-3", name: "CLM05-3 · Facility Type Code", type: "element", description: "Code identifying facility type.", dataType: "ID", codeSet: ["11","21","23","24","26","31","32"] },
                  ],
                },
                { id: "clm09", name: "CLM09 · Assignment of Benefits", type: "element", description: "Y=Assigned, N=Not assigned.", dataType: "ID", codeSet: ["Y","N","W"] },
              ],
            },
            {
              id: "837p-dtp-2300", name: "DTP — Service Date", type: "segment", description: "Service date or date range for the claim.",
              children: [
                { id: "dtp01-2300", name: "DTP01 · Date/Time Qualifier", type: "element", description: "472=Service, 435=Statement Dates.", dataType: "ID", required: true, codeSet: ["472","435","096"] },
                { id: "dtp02-2300", name: "DTP02 · Date Time Period Format", type: "element", description: "D8=CCYYMMDD, RD8=CCYYMMDD-CCYYMMDD.", dataType: "ID", required: true, codeSet: ["D8","RD8"] },
                { id: "dtp03-2300", name: "DTP03 · Date Value", type: "element", description: "Date in the format specified by DTP02. Must be CCYYMMDD for D8.", dataType: "AN", minLen: 1, maxLen: 35, required: true },
              ],
            },
            {
              id: "837p-ref-2300", name: "REF — Claim References", type: "segment", description: "Reference numbers and identifiers for the claim.",
              children: [
                { id: "ref01-2300", name: "REF01 · Reference Identification Qualifier", type: "element", description: "Code identifying the reference type.", dataType: "ID", minLen: 2, maxLen: 3, required: true, codeSet: ["D9","EA","F8","G1","LX","9F","EJ","6P","1W"] },
                { id: "ref02-2300", name: "REF02 · Reference Identification", type: "element", description: "The actual reference number or identifier.", dataType: "AN", minLen: 1, maxLen: 50, required: true },
              ],
            },
            {
              id: "837p-loop-2400", name: "Loop 2400 — Service Line", type: "loop",
              description: "Individual line items for each service rendered.", minOccurs: 1, maxOccurs: 50,
              children: [
                { id: "837p-lx", name: "LX — Service Line Counter", type: "segment", description: "Sequential line counter starting at 1.", required: true,
                  children: [
                    { id: "lx01", name: "LX01 · Assigned Number", type: "element", description: "Sequential service line number.", dataType: "N0", minLen: 1, maxLen: 6, required: true },
                  ],
                },
                {
                  id: "837p-sv1", name: "SV1 — Professional Service", type: "segment", description: "Service detail for a professional claim line.", required: true,
                  children: [
                    { id: "sv101", name: "SV101 · Procedure Code", type: "composite", description: "Procedure qualifier and code (e.g. HC:99213).", required: true,
                      children: [
                        { id: "sv101-1", name: "SV101-1 · Qualifier", type: "element", description: "HC=HCPCS, ER=Jurisdiction-Specific.", dataType: "ID" },
                        { id: "sv101-2", name: "SV101-2 · Procedure Code", type: "element", description: "HCPCS/CPT code for the service.", dataType: "AN" },
                      ],
                    },
                    { id: "sv102", name: "SV102 · Line Charge Amount", type: "element", description: "Charge for this specific service line. Must be > 0.", dataType: "R", minLen: 1, maxLen: 18, required: true },
                    { id: "sv105", name: "SV105 · Service Unit Count", type: "element", description: "Units of service.", dataType: "R", minLen: 1, maxLen: 15, required: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  "834": {
    label: "834 — Benefits Enrollment",
    version: "005010X220A1",
    root: {
      id: "834-root", name: "EDI 834", type: "schema", description: "HIPAA X12 Benefits Enrollment and Maintenance",
      children: [
        { id: "834-bgn", name: "BGN — Beginning Segment", type: "segment", description: "Identifies the transaction purpose and reference number.", required: true,
          children: [
            { id: "bgn01", name: "BGN01 · Transaction Set Purpose Code", type: "element", description: "00=Original, 15=Correction, 22=Addition.", dataType: "ID", required: true, codeSet: ["00","15","22","2"] },
            { id: "bgn02", name: "BGN02 · Reference Identification", type: "element", description: "Unique reference number for this transaction.", dataType: "AN", minLen: 1, maxLen: 50, required: true },
          ],
        },
        { id: "834-ref", name: "REF — Plan/Group Reference", type: "segment", description: "Identifies the group or plan being enrolled into.",
          children: [
            { id: "834-ref01", name: "REF01 · Reference Qualifier", type: "element", description: "38=Plan Number, 2U=Payer ID, 27=Group Dept Code.", dataType: "ID", required: true, codeSet: ["38","2U","27","6O"] },
            { id: "834-ref02", name: "REF02 · Reference Value", type: "element", description: "The actual plan number or payer ID.", dataType: "AN", minLen: 1, maxLen: 50, required: true },
          ],
        },
        {
          id: "834-loop-1000a", name: "Loop 1000A — Sponsor Name", type: "loop",
          description: "Identifies the plan sponsor.", minOccurs: 1, maxOccurs: 1,
          children: [
            { id: "834-nm1-1000a", name: "NM1 — Sponsor Name", type: "segment", required: true, description: "Legal name of the plan sponsor.",
              children: [
                { id: "834-nm101-1000a", name: "NM101 · Entity Code", type: "element", description: "P5=Plan Sponsor.", dataType: "ID", required: true, codeSet: ["P5"] },
                { id: "834-nm103-1000a", name: "NM103 · Sponsor Name", type: "element", description: "Name of the sponsor.", dataType: "AN", minLen: 1, maxLen: 60, required: true },
              ],
            },
          ],
        },
        {
          id: "834-loop-2000", name: "Loop 2000 — Member Level Detail", type: "loop",
          description: "One occurrence per member/subscriber being enrolled.", minOccurs: 1, maxOccurs: "unbounded",
          children: [
            { id: "834-ins", name: "INS — Member Indicator", type: "segment", description: "Defines relationship and maintenance type for the member.", required: true,
              children: [
                { id: "ins01", name: "INS01 · Insured Indicator", type: "element", description: "Y=Subscriber, N=Dependent.", dataType: "ID", required: true, codeSet: ["Y","N"] },
                { id: "ins02", name: "INS02 · Relationship Code", type: "element", description: "18=Self, 01=Spouse, 19=Child.", dataType: "ID", required: true, codeSet: ["18","01","19","15","17","G8"] },
                { id: "ins03", name: "INS03 · Maintenance Type Code", type: "element", description: "030=Change, 001=Add, 025=Termination.", dataType: "ID", required: true, codeSet: ["030","001","025","024","021","002"] },
              ],
            },
            { id: "834-ref-2000", name: "REF — Member Reference", type: "segment", description: "Member ID and other reference numbers.",
              children: [
                { id: "834-ref01-2000", name: "REF01 · Qualifier", type: "element", description: "0F=Member Number, 1L=Group/Policy Number.", dataType: "ID", required: true, codeSet: ["0F","1L","23","ZZ"] },
                { id: "834-ref02-2000", name: "REF02 · Member ID", type: "element", description: "The member's unique identification number.", dataType: "AN", minLen: 1, maxLen: 50, required: true },
              ],
            },
            {
              id: "834-loop-2100", name: "Loop 2100 — Member Name", type: "loop",
              description: "Name, address, demographics for this member.", minOccurs: 1, maxOccurs: "unbounded",
              children: [
                { id: "834-nm1-2100", name: "NM1 — Member Name", type: "segment", required: true, description: "Full name of the member.",
                  children: [
                    { id: "834-nm101-2100", name: "NM101 · Entity Code", type: "element", description: "IL=Insured, 74=Corrected Insured.", dataType: "ID", required: true, codeSet: ["IL","74","EY"] },
                    { id: "834-nm102-2100", name: "NM102 · Entity Type", type: "element", description: "1=Person. Members are always persons.", dataType: "ID", required: true, codeSet: ["1"] },
                    { id: "834-nm103-2100", name: "NM103 · Last Name", type: "element", description: "Member's last name.", dataType: "AN", minLen: 1, maxLen: 60, required: true },
                    { id: "834-nm104-2100", name: "NM104 · First Name", type: "element", description: "Member's first name.", dataType: "AN", minLen: 1, maxLen: 35 },
                    { id: "834-nm109-2100", name: "NM109 · Member SSN/ID", type: "element", description: "Social Security Number (qualifier 34) or member ID.", dataType: "AN", minLen: 2, maxLen: 80 },
                  ],
                },
                { id: "834-dmg", name: "DMG — Member Demographics", type: "segment", description: "Date of birth, gender, marital status.",
                  children: [
                    { id: "dmg01", name: "DMG01 · Date Format", type: "element", description: "D8=CCYYMMDD (always D8 for DOB).", dataType: "ID", required: true, codeSet: ["D8"] },
                    { id: "dmg02", name: "DMG02 · Date of Birth", type: "element", description: "Member's date of birth in CCYYMMDD format.", dataType: "DT", minLen: 8, maxLen: 8 },
                    { id: "dmg03", name: "DMG03 · Gender Code", type: "element", description: "M=Male, F=Female, U=Unknown.", dataType: "ID", codeSet: ["M","F","U"] },
                  ],
                },
                { id: "834-n3-2100", name: "N3 — Member Address", type: "segment", description: "Street address of the member.",
                  children: [
                    { id: "n301-2100", name: "N301 · Address Line 1", type: "element", description: "Street address.", dataType: "AN", minLen: 1, maxLen: 55, required: true },
                    { id: "n302-2100", name: "N302 · Address Line 2", type: "element", description: "Apt/Suite/Unit (optional).", dataType: "AN", minLen: 1, maxLen: 55 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  "270": {
    label: "270 — Eligibility Inquiry",
    version: "005010X279A1",
    root: {
      id: "270-root", name: "EDI 270", type: "schema", description: "HIPAA X12 Health Care Eligibility Inquiry",
      children: [
        {
          id: "270-loop-2000a", name: "Loop 2000A — Information Source", type: "loop",
          description: "Identifies the information source (payer/plan).", minOccurs: 1, maxOccurs: 1,
          children: [
            { id: "270-hl-2000a", name: "HL — Hierarchical Level", type: "segment", required: true, description: "HL level for info source.",
              children: [
                { id: "270-hl03-2000a", name: "HL03 · Level Code", type: "element", description: "20=Information Source.", dataType: "ID", required: true, codeSet: ["20"] },
              ],
            },
            { id: "270-nm1-2000a", name: "NM1 — Payer Name", type: "segment", required: true, description: "Name of the payer/plan.", 
              children: [
                { id: "270-nm101-2000a", name: "NM101 · Entity Code", type: "element", description: "PR=Payer.", dataType: "ID", required: true, codeSet: ["PR"] },
                { id: "270-nm103-2000a", name: "NM103 · Payer Name", type: "element", description: "Legal name of the payer.", dataType: "AN", minLen: 1, maxLen: 60, required: true },
              ],
            },
          ],
        },
        {
          id: "270-loop-2000c", name: "Loop 2000C — Subscriber", type: "loop",
          description: "Subscriber being queried for eligibility.", minOccurs: 1, maxOccurs: "unbounded",
          children: [
            { id: "270-trn", name: "TRN — Trace Number", type: "segment", description: "Unique trace number linking the 270 to its 271 response.",
              children: [
                { id: "trn01", name: "TRN01 · Trace Type Code", type: "element", description: "1=Current Transaction Trace Numbers.", dataType: "ID", required: true, codeSet: ["1","2"] },
                { id: "trn02", name: "TRN02 · Reference Identification", type: "element", description: "Unique trace number. Must be globally unique per interchange.", dataType: "AN", minLen: 1, maxLen: 50, required: true },
              ],
            },
            { id: "270-nm1-2000c", name: "NM1 — Subscriber Name", type: "segment", required: true, description: "Name and ID of the subscriber.",
              children: [
                { id: "270-nm101-2000c", name: "NM101 · Entity Code", type: "element", description: "IL=Insured/Subscriber.", dataType: "ID", required: true, codeSet: ["IL"] },
                { id: "270-nm102-2000c", name: "NM102 · Entity Type", type: "element", description: "1=Person. Subscribers are always persons.", dataType: "ID", required: true, codeSet: ["1"] },
                { id: "270-nm109-2000c", name: "NM109 · Subscriber ID", type: "element", description: "Member/Insurance ID number.", dataType: "AN", minLen: 2, maxLen: 80, required: true },
              ],
            },
            { id: "270-dmg", name: "DMG — Subscriber Demographics", type: "segment", description: "Date of birth and gender for matching.",
              children: [
                { id: "270-dmg02", name: "DMG02 · Date of Birth", type: "element", description: "Subscriber DOB in CCYYMMDD. No extra chars allowed.", dataType: "DT", minLen: 8, maxLen: 8 },
                { id: "270-dmg03", name: "DMG03 · Gender", type: "element", description: "M=Male, F=Female.", dataType: "ID", codeSet: ["M","F","U"] },
              ],
            },
            { id: "270-eq", name: "EQ — Eligibility or Benefit Inquiry", type: "segment", required: true, description: "Specifies what benefit/coverage type is being queried.",
              children: [
                { id: "eq01", name: "EQ01 · Service Type Code", type: "element", description: "Code defining the benefit category queried.", dataType: "ID", required: true, codeSet: ["1","2","30","33","35","47","48","50","86","98","UC","A0","A6"] },
              ],
            },
          ],
        },
      ],
    },
  },
  "835": {
    label: "835 — Payment Remittance",
    version: "005010X221A1",
    root: {
      id: "835-root", name: "EDI 835", type: "schema", description: "HIPAA X12 Health Care Claim Payment/Advice",
      children: [
        { id: "835-bpr", name: "BPR — Financial Information", type: "segment", required: true, description: "Payment amount, method, and financial details.",
          children: [
            { id: "bpr01", name: "BPR01 · Transaction Handling Code", type: "element", description: "C=Payment Accompanies, I=Remittance Info Only.", dataType: "ID", required: true, codeSet: ["C","D","I","P","U","X"] },
            { id: "bpr02", name: "BPR02 · Total Actual Provider Payment Amount", type: "element", description: "Total payment amount. Can be 0 if claim denied.", dataType: "R", minLen: 1, maxLen: 18, required: true },
            { id: "bpr16", name: "BPR16 · Payment Effective Date", type: "element", description: "Date payment was effective (CCYYMMDD).", dataType: "DT", minLen: 8, maxLen: 8 },
          ],
        },
        { id: "835-trn", name: "TRN — Reassociation Trace Number", type: "segment", required: true, description: "Check/EFT trace number for matching payment.",
          children: [
            { id: "835-trn01", name: "TRN01 · Trace Type Code", type: "element", description: "1=Current, 3=Reference.", dataType: "ID", required: true, codeSet: ["1","3"] },
            { id: "835-trn02", name: "TRN02 · Check/EFT Number", type: "element", description: "Check or EFT trace number.", dataType: "AN", minLen: 1, maxLen: 50, required: true },
          ],
        },
        {
          id: "835-loop-2100", name: "Loop 2100 — Header Number", type: "loop",
          description: "Payer and payee identification.", minOccurs: 1, maxOccurs: 2,
          children: [
            { id: "835-nm1-2100", name: "NM1 — Payer/Payee Name", type: "segment", required: true, description: "Payer or payee identifying information.",
              children: [
                { id: "835-nm101-2100", name: "NM101 · Entity Code", type: "element", description: "PR=Payer, PE=Payee.", dataType: "ID", required: true, codeSet: ["PR","PE"] },
                { id: "835-nm103-2100", name: "NM103 · Name", type: "element", description: "Payer or payee name.", dataType: "AN", minLen: 1, maxLen: 60, required: true },
              ],
            },
          ],
        },
        {
          id: "835-loop-2200", name: "Loop 2200 — Claim Payment", type: "loop",
          description: "Individual claim payment/denial detail.", minOccurs: 0, maxOccurs: "unbounded",
          children: [
            { id: "835-clp", name: "CLP — Claim Payment Information", type: "segment", required: true, description: "Claim-level payment adjudication data.",
              children: [
                { id: "clp01", name: "CLP01 · Claim Submitter ID", type: "element", description: "CLM01 from the original 837 claim.", dataType: "AN", minLen: 1, maxLen: 38, required: true },
                { id: "clp02", name: "CLP02 · Claim Status Code", type: "element", description: "1=Processed as Primary, 2=Processed as Secondary, 3=Tertiary, 4=Denied.", dataType: "ID", required: true, codeSet: ["1","2","3","4","19","20","25"] },
                { id: "clp03", name: "CLP03 · Total Claim Charge Amount", type: "element", description: "Total billed amount from the original claim.", dataType: "R", minLen: 1, maxLen: 18, required: true },
                { id: "clp04", name: "CLP04 · Claim Payment Amount", type: "element", description: "Amount paid. 0 if denied.", dataType: "R", minLen: 1, maxLen: 18, required: true },
              ],
            },
            { id: "835-cas", name: "CAS — Claim Adjustment", type: "segment", description: "Adjustment reason codes and amounts.",
              children: [
                { id: "cas01", name: "CAS01 · Adjustment Group Code", type: "element", description: "CO=Contractual, OA=Other, PI=Payer Initiated, PR=Patient Responsibility.", dataType: "ID", required: true, codeSet: ["CO","OA","PI","PR","CR"] },
                { id: "cas02", name: "CAS02 · Reason Code", type: "element", description: "CARC reason code for the adjustment.", dataType: "ID", minLen: 1, maxLen: 5, required: true },
                { id: "cas03", name: "CAS03 · Adjustment Amount", type: "element", description: "Dollar amount of this adjustment.", dataType: "R", minLen: 1, maxLen: 18, required: true },
              ],
            },
          ],
        },
      ],
    },
  },
};

// ─── Rule types ───────────────────────────────────────────────────────────────
const RULE_TYPES = [
  { id: "required",     label: "Required",         color: "#EF4444", desc: "Field must be present and non-empty" },
  { id: "format",       label: "Format",           color: "#3B82F6", desc: "Value must match a specific format/pattern" },
  { id: "range",        label: "Range / Length",   color: "#F59E0B", desc: "Value or length must be within specified bounds" },
  { id: "codeset",      label: "Code Set",         color: "#8B5CF6", desc: "Value must belong to an allowed set of codes" },
  { id: "conditional",  label: "Conditional",      color: "#10B981", desc: "Rule applies only when another field has a value" },
  { id: "cross-field",  label: "Cross-Field",      color: "#06B6D4", desc: "Validates relationship between two or more fields" },
  { id: "custom",       label: "Custom Logic",     color: "#F97316", desc: "Define fully custom validation logic" },
];

// ─── BackendRule (never shown in UI) ─────────────────────────────────────────
interface BackendRule {
  rule_id:       string;
  schema:        string;
  element_path:  string;
  element_name:  string;
  rule_type:     string;
  severity:      string;
  natural_lang:  string;
  condition?:    string;
  generated_at:  string;
  metadata: {
    dataType?:   string;
    minLen?:     number;
    maxLen?:     number;
    codeSet?:    string[];
    required?:   boolean;
  };
}

// ─── Active Rule (shown in UI — summary only) ─────────────────────────────────
interface ActiveRule {
  id:          string;
  elementPath: string;
  elementName: string;
  schema:      string;
  ruleType:    string;
  severity:    "error" | "warning";
  description: string;
  createdAt:   string;
}

// ─── Node type colors ─────────────────────────────────────────────────────────
const nodeTypeColor: Record<NodeType, string> = {
  schema:    "#10B981",
  loop:      "#8B5CF6",
  segment:   "#3B82F6",
  element:   "#F59E0B",
  composite: "#06B6D4",
};
const nodeTypeIcon: Record<NodeType, string> = {
  schema: "◈", loop: "⊕", segment: "▣", element: "◆", composite: "⊞",
};

// ─── Utility: build element path string ──────────────────────────────────────
function buildPath(node: SchemaNode, ancestors: SchemaNode[]): string {
  return [...ancestors.map(a => a.name.split(" ")[0]), node.name.split(" ")[0]].join(" › ");
}

// ─── Schema Tree Node ─────────────────────────────────────────────────────────
function SchemaTreeNode({
  node, depth, selected, onSelect, ancestors, searchQ,
}: {
  node:      SchemaNode;
  depth:     number;
  selected:  SchemaNode | null;
  onSelect:  (node: SchemaNode, ancestors: SchemaNode[]) => void;
  ancestors: SchemaNode[];
  searchQ:   string;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isSelected  = selected?.id === node.id;
  const matchesSearch = searchQ
    ? node.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQ.toLowerCase())
    : true;

  const [open, setOpen] = useState(depth <= 1 || node.type === "schema");

  const color = nodeTypeColor[node.type];
  const icon  = nodeTypeIcon[node.type];

  if (!matchesSearch && !hasChildren) return null;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setOpen(o => !o);
          if (node.type !== "schema") onSelect(node, ancestors);
        }}
        className="w-full flex items-center gap-1.5 rounded-lg transition-all text-left group"
        style={{
          padding: `5px ${8 + depth * 13}px`,
          background: isSelected ? "rgba(16,185,129,0.14)" : "transparent",
          border: isSelected ? "1px solid rgba(16,185,129,0.38)" : "1px solid transparent",
          marginBottom: 2,
          cursor: node.type === "schema" ? "default" : "pointer",
        }}
      >
        {hasChildren ? (
          open
            ? <ChevronDown style={{ width: 10, height: 10, color: C.muted, flexShrink: 0 }} />
            : <ChevronRight style={{ width: 10, height: 10, color: C.muted, flexShrink: 0 }} />
        ) : (
          <span style={{ width: 10, flexShrink: 0 }} />
        )}

        <span className="font-mono flex-shrink-0" style={{ fontSize: "0.62rem", color, marginRight: 3 }}>{icon}</span>

        <span
          className="font-mono truncate"
          style={{
            fontSize: "0.68rem",
            fontWeight: node.type === "loop" || node.type === "schema" ? 700 : 500,
            color: isSelected ? C.em : matchesSearch ? color : C.muted,
            textShadow: isSelected ? C.emTextGlow : undefined,
          }}
        >
          {node.name}
        </span>

        {node.required && !isSelected && (
          <span className="ml-auto flex-shrink-0 font-mono" style={{ fontSize: "0.5rem", color: C.err, fontWeight: 800 }}>REQ</span>
        )}

        {node.type === "loop" && (
          <span
            className="ml-auto font-mono flex-shrink-0"
            style={{ fontSize: "0.5rem", fontWeight: 700, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)", color: C.purple, padding: "1px 5px", borderRadius: 4 }}
          >
            LOOP
          </span>
        )}
      </button>

      {open && hasChildren && node.children!.map(child => (
        <SchemaTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
          ancestors={[...ancestors, node]}
          searchQ={searchQ}
        />
      ))}
    </div>
  );
}

// ─── Main Overlay ─────────────────────────────────────────────────────────────
export function CustomRuleBuilderOverlay({ onClose }: { onClose: () => void }) {
  const [schemaKey, setSchemaKey] = useState("837P");
  const [selectedNode, setSelectedNode]     = useState<SchemaNode | null>(null);
  const [selectedAncestors, setSelectedAncestors] = useState<SchemaNode[]>([]);
  const [searchQ, setSearchQ]               = useState("");
  const [ruleType, setRuleType]             = useState("required");
  const [severity, setSeverity]             = useState<"error" | "warning">("error");
  const [nlText, setNlText]                 = useState("");
  const [condition, setCondition]           = useState("");
  const [saving, setSaving]                 = useState(false);
  const [savedOk, setSavedOk]               = useState(false);

  // Active rules — summary visible to user
  const [activeRules, setActiveRules] = useState<ActiveRule[]>([]);
  // Backend rules — fully hidden from user
  const backendRulesRef = useRef<BackendRule[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const schema = SCHEMAS[schemaKey];
  const elementPath = selectedNode ? buildPath(selectedNode, selectedAncestors) : "";

  const handleNodeSelect = useCallback((node: SchemaNode, ancestors: SchemaNode[]) => {
    setSelectedNode(node);
    setSelectedAncestors(ancestors);
    setSavedOk(false);
    // Pre-fill NL text based on node info
    if (node.type === "element" || node.type === "composite") {
      const req = node.required ? "must be present and non-empty" : "should follow the specified format";
      setNlText(`${node.name.split("·")[0].trim()} ${req}. ${node.description}`);
    }
  }, []);

  const handleCreateRule = useCallback(() => {
    if (!selectedNode || !nlText.trim()) return;
    setSaving(true);

    setTimeout(() => {
      const ruleId = `RULE-${schemaKey}-${Date.now()}`;

      // ── Backend JSON (invisible to user) ──────────────────────────────────
      const backendRule: BackendRule = {
        rule_id:      ruleId,
        schema:       schemaKey,
        element_path: elementPath,
        element_name: selectedNode.name,
        rule_type:    ruleType,
        severity,
        natural_lang: nlText.trim(),
        condition:    condition.trim() || undefined,
        generated_at: new Date().toISOString(),
        metadata: {
          dataType: selectedNode.dataType,
          minLen:   selectedNode.minLen,
          maxLen:   selectedNode.maxLen,
          codeSet:  selectedNode.codeSet,
          required: selectedNode.required,
        },
      };
      backendRulesRef.current = [...backendRulesRef.current, backendRule];
      // ── (In a real app, this would be POSTed to /api/validation-rules) ──

      // ── Summary visible to user (no JSON) ──────────────────────────────
      const summaryRule: ActiveRule = {
        id:          ruleId,
        elementPath,
        elementName: selectedNode.name.split("·")[0].trim(),
        schema:      schemaKey,
        ruleType,
        severity,
        description: nlText.trim().slice(0, 120) + (nlText.length > 120 ? "…" : ""),
        createdAt:   new Date().toLocaleTimeString(),
      };
      setActiveRules(prev => [summaryRule, ...prev]);
      setSaving(false);
      setSavedOk(true);
      setNlText("");
      setCondition("");
      setTimeout(() => setSavedOk(false), 3000);
    }, 800);
  }, [selectedNode, nlText, ruleType, severity, condition, schemaKey, elementPath]);

  const selectedRuleTypeCfg = RULE_TYPES.find(r => r.id === ruleType)!;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(7,12,24,0.90)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(11,18,32,0.75)" }}
      >
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 38, height: 38, background: "rgba(16,185,129,0.14)", border: "1px solid rgba(16,185,129,0.32)" }}
        >
          <Shield style={{ width: 17, height: 17, color: C.em }} />
        </div>

        <div>
          <div className="font-mono" style={{ color: C.text, fontSize: "0.9rem", fontWeight: 700 }}>Custom Rule Builder</div>
          <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.62rem" }}>
            Select a schema element · Define rule in natural language · Rules are compiled to backend config
          </div>
        </div>

        {/* Schema selector */}
        <div className="flex items-center gap-2 ml-6">
          <span className="font-mono" style={{ color: C.muted, fontSize: "0.65rem" }}>Schema:</span>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {Object.entries(SCHEMAS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => { setSchemaKey(key); setSelectedNode(null); setSelectedAncestors([]); }}
                className="font-mono rounded-md px-3 py-1.5 transition-all"
                style={{
                  background: schemaKey === key ? "rgba(16,185,129,0.14)" : "transparent",
                  border: schemaKey === key ? "1px solid rgba(16,185,129,0.35)" : "1px solid transparent",
                  color: schemaKey === key ? C.em : C.muted,
                  fontSize: "0.62rem", fontWeight: 700,
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Active rules badge */}
        <div className="flex items-center gap-2 ml-auto">
          {activeRules.length > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <CheckCircle2 style={{ width: 13, height: 13, color: C.em }} />
              <span className="font-mono" style={{ color: C.em, fontSize: "0.68rem", fontWeight: 700 }}>
                {activeRules.length} rule{activeRules.length !== 1 ? "s" : ""} compiled
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-xl transition-all hover:scale-110"
            style={{ width: 34, height: 34, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)", color: C.err }}
            title="Close (Esc)"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* ── Body: three columns ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* ── LEFT: Schema Tree ─────────────────────────────────────────────── */}
        <div
          style={{
            width: 310, flexShrink: 0, display: "flex", flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(59,130,246,0.04)" }}
          >
            <BookOpen style={{ width: 13, height: 13, color: C.info }} />
            <span className="font-mono" style={{ color: C.info, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em" }}>
              {schema.label}
            </span>
            <span
              className="ml-auto font-mono px-2 py-0.5 rounded"
              style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)", color: C.info, fontSize: "0.52rem", fontWeight: 700 }}
            >
              {schema.version}
            </span>
          </div>

          {/* Search */}
          <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Filter style={{ width: 11, height: 11, color: C.muted, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Filter elements…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="bg-transparent outline-none font-mono flex-1"
                style={{ color: C.text, fontSize: "0.7rem" }}
              />
              {searchQ && (
                <button onClick={() => setSearchQ("")}>
                  <X style={{ width: 10, height: 10, color: C.muted }} />
                </button>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 flex-wrap" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {(["loop","segment","element","composite"] as NodeType[]).map(t => (
              <div key={t} className="flex items-center gap-1">
                <span className="font-mono" style={{ fontSize: "0.6rem", color: nodeTypeColor[t] }}>{nodeTypeIcon[t]}</span>
                <span className="font-mono" style={{ fontSize: "0.58rem", color: C.muted }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Tree scroll area */}
          <div
            className="flex-1 overflow-y-auto p-3"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(59,130,246,0.3) transparent" }}
          >
            <SchemaTreeNode
              node={schema.root}
              depth={0}
              selected={selectedNode}
              onSelect={handleNodeSelect}
              ancestors={[]}
              searchQ={searchQ}
            />
          </div>
        </div>

        {/* ── CENTER: Rule definition ───────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Panel header */}
          <div
            className="flex items-center gap-2 px-5 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(16,185,129,0.04)" }}
          >
            <Sparkles style={{ width: 13, height: 13, color: C.em }} />
            <span className="font-mono" style={{ color: C.em, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em" }}>RULE DEFINITION</span>
            {selectedNode && (
              <span className="font-mono ml-2 px-2 py-0.5 rounded" style={{ background: C.emDim, border: "1px solid rgba(16,185,129,0.30)", color: C.em, fontSize: "0.55rem", fontWeight: 700 }}>
                ELEMENT SELECTED
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "thin" }}>

            {!selectedNode ? (
              /* Empty state */
              <div
                className="flex flex-col items-center justify-center rounded-2xl py-20"
                style={{ border: `1px dashed rgba(255,255,255,0.10)`, background: "rgba(255,255,255,0.02)" }}
              >
                <div
                  className="flex items-center justify-center rounded-2xl mb-4"
                  style={{ width: 52, height: 52, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)" }}
                >
                  <ArrowRight style={{ width: 22, height: 22, color: C.em }} />
                </div>
                <div className="font-mono" style={{ color: C.sub, fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>
                  Select a schema element
                </div>
                <p style={{ color: C.muted, fontSize: "0.72rem", textAlign: "center", maxWidth: 280, lineHeight: 1.7 }}>
                  Click any segment, element, or composite node in the schema tree on the left to begin building a validation rule.
                </p>
              </div>
            ) : (
              <>
                {/* Selected element info card */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.22)" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ width: 36, height: 36, background: `${nodeTypeColor[selectedNode.type]}18`, border: `1px solid ${nodeTypeColor[selectedNode.type]}35` }}
                    >
                      <span className="font-mono" style={{ fontSize: "1rem", color: nodeTypeColor[selectedNode.type] }}>
                        {nodeTypeIcon[selectedNode.type]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono" style={{ color: C.text, fontSize: "0.82rem", fontWeight: 700 }}>{selectedNode.name}</div>
                      <div className="font-mono mt-1" style={{ color: C.muted, fontSize: "0.62rem" }}>
                        {elementPath}
                      </div>
                      <p className="mt-2" style={{ color: C.sub, fontSize: "0.75rem", lineHeight: 1.6 }}>{selectedNode.description}</p>
                    </div>
                  </div>

                  {/* Metadata pills */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedNode.dataType && (
                      <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)", color: C.info, fontSize: "0.58rem", fontWeight: 700 }}>
                        {selectedNode.dataType}
                      </span>
                    )}
                    {selectedNode.minLen !== undefined && selectedNode.maxLen !== undefined && (
                      <span className="font-mono px-2 py.5 rounded" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", color: C.warn, fontSize: "0.58rem", fontWeight: 700 }}>
                        Len {selectedNode.minLen}–{selectedNode.maxLen}
                      </span>
                    )}
                    {selectedNode.required && (
                      <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: C.err, fontSize: "0.58rem", fontWeight: 700 }}>
                        REQUIRED
                      </span>
                    )}
                    {selectedNode.maxOccurs && (
                      <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)", color: C.purple, fontSize: "0.58rem", fontWeight: 700 }}>
                        Max: {selectedNode.maxOccurs}
                      </span>
                    )}
                  </div>

                  {/* Code set */}
                  {selectedNode.codeSet && (
                    <div className="mt-3">
                      <div className="font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>ALLOWED CODE SET</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.codeSet.map(c => (
                          <span key={c} className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.22)", color: C.em2, fontSize: "0.65rem" }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rule type selector */}
                <div>
                  <div className="font-mono mb-2.5" style={{ color: C.muted, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>RULE TYPE</div>
                  <div className="grid grid-cols-4 gap-2">
                    {RULE_TYPES.map(rt => (
                      <button
                        key={rt.id}
                        onClick={() => setRuleType(rt.id)}
                        className="flex flex-col items-start p-2.5 rounded-xl transition-all text-left"
                        style={{
                          background: ruleType === rt.id ? `${rt.color}14` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${ruleType === rt.id ? `${rt.color}45` : "rgba(255,255,255,0.07)"}`,
                        }}
                      >
                        <span className="font-mono" style={{ color: ruleType === rt.id ? rt.color : C.muted, fontSize: "0.68rem", fontWeight: 700 }}>{rt.label}</span>
                        <span style={{ color: C.muted, fontSize: "0.58rem", lineHeight: 1.5, marginTop: 3 }}>{rt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity */}
                <div className="flex items-center gap-4">
                  <div className="font-mono" style={{ color: C.muted, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>SEVERITY</div>
                  <div className="flex items-center gap-1.5 rounded-xl p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {(["error","warning"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono transition-all capitalize"
                        style={{
                          background: severity === s ? (s === "error" ? "rgba(239,68,68,0.14)" : "rgba(245,158,11,0.14)") : "transparent",
                          border: severity === s ? `1px solid ${s === "error" ? "rgba(239,68,68,0.38)" : "rgba(245,158,11,0.38)"}` : "1px solid transparent",
                          color: severity === s ? (s === "error" ? C.err : C.warn) : C.muted,
                          fontSize: "0.65rem", fontWeight: 700,
                        }}
                      >
                        {s === "error" ? <AlertCircle style={{ width: 11, height: 11 }} /> : <AlertTriangle style={{ width: 11, height: 11 }} />}
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Natural language rule textarea */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono" style={{ color: C.muted, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>
                      RULE DESCRIPTION <span style={{ color: C.err }}>*</span>
                    </div>
                    <span className="font-mono" style={{ color: C.muted, fontSize: "0.58rem" }}>{nlText.length} / 500 chars</span>
                  </div>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${nlText.trim() ? "rgba(16,185,129,0.32)" : "rgba(255,255,255,0.10)"}` }}
                  >
                    <div
                      className="flex items-center gap-2 px-4 py-2"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(16,185,129,0.05)" }}
                    >
                      <Sparkles style={{ width: 11, height: 11, color: C.em }} />
                      <span className="font-mono" style={{ color: C.em, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>
                        NATURAL LANGUAGE — describe the rule in plain English
                      </span>
                    </div>
                    <textarea
                      value={nlText}
                      onChange={e => setNlText(e.target.value.slice(0, 500))}
                      placeholder={`e.g. "${selectedNode.name.split("·")[0].trim()} must be present and contain a valid ${selectedNode.dataType ?? "value"} with no trailing whitespace…"`}
                      className="w-full font-mono outline-none resize-none"
                      rows={4}
                      style={{
                        background: "rgba(4,9,20,0.6)",
                        color: C.text, fontSize: "0.8rem", lineHeight: 1.7,
                        padding: "14px 16px", border: "none",
                      }}
                    />
                  </div>
                  <p className="mt-1.5" style={{ color: C.muted, fontSize: "0.65rem", lineHeight: 1.6 }}>
                    Describe the rule as you would explain it to a team member. The engine will compile this into a structured validation config.
                  </p>
                </div>

                {/* Conditional logic (optional) */}
                {(ruleType === "conditional" || ruleType === "cross-field") && (
                  <div>
                    <div className="font-mono mb-2" style={{ color: C.muted, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>
                      CONDITION (optional) — when should this rule apply?
                    </div>
                    <input
                      type="text"
                      value={condition}
                      onChange={e => setCondition(e.target.value)}
                      placeholder="e.g. Only apply when CLM05-3 is present and NM102 = '1'"
                      className="w-full px-4 py-3 rounded-xl font-mono outline-none"
                      style={{
                        background: "rgba(4,9,20,0.55)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        color: C.sub, fontSize: "0.78rem",
                      }}
                    />
                  </div>
                )}

                {/* Save feedback */}
                {savedOk && (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.35)" }}
                  >
                    <CheckCircle2 style={{ width: 16, height: 16, color: C.em, flexShrink: 0 }} />
                    <div>
                      <div className="font-mono" style={{ color: C.em, fontSize: "0.75rem", fontWeight: 700 }}>Rule compiled successfully</div>
                      <div style={{ color: C.muted, fontSize: "0.68rem", marginTop: 1 }}>
                        Validation config updated in backend engine. Rule will apply on next processing run.
                      </div>
                    </div>
                  </div>
                )}

                {/* Create button */}
                <button
                  onClick={handleCreateRule}
                  disabled={!nlText.trim() || saving}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-mono transition-all hover:scale-[1.02]"
                  style={{
                    background: !nlText.trim() ? "rgba(255,255,255,0.04)" : saving ? "rgba(16,185,129,0.14)" : C.em,
                    border: !nlText.trim() ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${saving ? "rgba(16,185,129,0.35)" : "transparent"}`,
                    color: !nlText.trim() ? C.muted : saving ? C.em : "#fff",
                    fontSize: "0.78rem", fontWeight: 700,
                    boxShadow: nlText.trim() && !saving ? `0 0 24px rgba(16,185,129,0.28)` : "none",
                    cursor: !nlText.trim() ? "not-allowed" : "pointer",
                    opacity: !nlText.trim() ? 0.5 : 1,
                  }}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(16,185,129,0.25)", borderTopColor: C.em }} />
                      Compiling rule to backend config…
                    </>
                  ) : (
                    <>
                      <Zap style={{ width: 14, height: 14 }} />
                      Create Validation Rule
                      {nlText.trim() && (
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.15)", fontSize: "0.6rem" }}
                        >
                          {selectedRuleTypeCfg.label} · {severity}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Active rules ──────────────────────────────────────────────── */}
        <div
          style={{
            width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(139,92,246,0.04)" }}
          >
            <Layers style={{ width: 13, height: 13, color: C.purple }} />
            <span className="font-mono" style={{ color: C.purple, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em" }}>ACTIVE RULES</span>
            {activeRules.length > 0 && (
              <span
                className="ml-auto font-mono px-2 py-0.5 rounded"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.28)", color: C.em, fontSize: "0.58rem", fontWeight: 700 }}
              >
                {activeRules.length}
              </span>
            )}
          </div>

          <div
            className="flex-1 overflow-y-auto p-3 space-y-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.3) transparent" }}
          >
            {activeRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{ width: 44, height: 44, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.20)" }}
                >
                  <Shield style={{ width: 20, height: 20, color: `${C.purple}60` }} />
                </div>
                <p style={{ color: C.muted, fontSize: "0.72rem", textAlign: "center", lineHeight: 1.7, maxWidth: 200 }}>
                  No rules yet. Select an element and define a rule to get started.
                </p>
              </div>
            ) : (
              activeRules.map(rule => {
                const rt = RULE_TYPES.find(r => r.id === rule.ruleType);
                return (
                  <div
                    key={rule.id}
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid rgba(255,255,255,0.08)`,
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: `${rt?.color ?? C.em}14`, border: `1px solid ${rt?.color ?? C.em}30`, color: rt?.color ?? C.em, fontSize: "0.55rem", fontWeight: 700 }}
                      >
                        {rt?.label ?? rule.ruleType}
                      </span>
                      <span
                        className="font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: rule.severity === "error" ? "rgba(239,68,68,0.10)" : "rgba(245,158,11,0.10)",
                          border: `1px solid ${rule.severity === "error" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
                          color: rule.severity === "error" ? C.err : C.warn,
                          fontSize: "0.55rem", fontWeight: 700,
                        }}
                      >
                        {rule.severity.toUpperCase()}
                      </span>
                      <button
                        onClick={() => setActiveRules(prev => prev.filter(r => r.id !== rule.id))}
                        className="ml-auto opacity-0 hover:opacity-100 transition-opacity"
                        style={{ color: C.muted }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0"}
                      >
                        <Trash2 style={{ width: 10, height: 10 }} />
                      </button>
                    </div>

                    {/* Element path */}
                    <div className="font-mono mb-1" style={{ color: C.em2, fontSize: "0.6rem", lineHeight: 1.5 }}>
                      {rule.schema} · {rule.elementPath}
                    </div>

                    {/* Description */}
                    <p style={{ color: C.sub, fontSize: "0.68rem", lineHeight: 1.6 }}>{rule.description}</p>

                    {/* Time + compiled badge */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono" style={{ color: C.muted, fontSize: "0.58rem" }}>{rule.createdAt}</span>
                      <span
                        className="font-mono px-1.5 py-0.5 rounded ml-auto"
                        style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)", color: C.em, fontSize: "0.52rem", fontWeight: 700 }}
                      >
                        ✓ COMPILED
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Compile summary */}
          {activeRules.length > 0 && (
            <div
              className="flex-shrink-0 p-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(11,18,32,0.5)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Info style={{ width: 11, height: 11, color: C.muted, flexShrink: 0 }} />
                <span className="font-mono" style={{ color: C.muted, fontSize: "0.6rem", lineHeight: 1.5 }}>
                  {activeRules.filter(r => r.severity === "error").length} error rules · {activeRules.filter(r => r.severity === "warning").length} warning rules
                </span>
              </div>
              <div
                className="px-3 py-2 rounded-lg"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}
              >
                <span className="font-mono" style={{ color: C.muted, fontSize: "0.6rem", lineHeight: 1.6 }}>
                  Rules are compiled to backend validation config and applied on the next processing run. JSON payload is not exposed in the UI.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(11,18,32,0.75)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.em }} />
          <span className="font-mono" style={{ color: C.muted, fontSize: "0.62rem" }}>
            Nexus Pipeline v4.0 — Validation Rule Engine
          </span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <span className="font-mono" style={{ color: C.muted, fontSize: "0.62rem" }}>
            Schema: <span style={{ color: C.info }}>{schema.label}</span>
          </span>
          {activeRules.length > 0 && (
            <span className="font-mono" style={{ color: C.muted, fontSize: "0.62rem" }}>
              Compiled: <span style={{ color: C.em }}>{activeRules.length} rule{activeRules.length !== 1 ? "s" : ""}</span>
            </span>
          )}
          <button
            onClick={onClose}
            className="font-mono px-4 py-2 rounded-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: C.muted, fontSize: "0.68rem", fontWeight: 600,
            }}
          >
            Close · Esc
          </button>
        </div>
      </div>
    </div>
  );
}
