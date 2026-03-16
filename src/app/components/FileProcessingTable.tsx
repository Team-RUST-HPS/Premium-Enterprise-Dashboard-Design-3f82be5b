import { useState, Fragment } from "react";
import { CheckCircle2, AlertCircle, ChevronRight, ChevronDown, Download, FileCode2 } from "lucide-react";

interface ProcessedFile {
  id: string; fileName: string; batchId: string; project: string;
  status: "passed" | "failed";
  receivedTime: string; processedTime: string; processingDuration: string;
  fileSize: string; recordCount: number;
  validationStatus: string; translationStatus: string; deliveryStatus: string;
  outputPath: string | null;
  errorDetails: { stage: string; errorType: string; errorMessage: string; errorCode: string; affectedRecords: number[] } | null;
}

const C = {
  bg: "var(--c-bg)", surface: "var(--c-surface)",
  em: "#10B981", emDim: "rgba(16,185,129,0.12)", text: "var(--c-text)",
  sub: "var(--c-sub)", muted: "var(--c-muted)", err: "#EF4444", warn: "#F59E0B",
  glassBg: "var(--c-glass-bg)", glassBorder: "var(--c-glass-border)",
  border: "var(--c-border)", cardSubtle: "var(--c-card-subtle)",
};

const files: ProcessedFile[] = [
  { id: "1", fileName: "EDI_837_20260316_001.x12", batchId: "B-1056", project: "HealthClaims_837", status: "passed", receivedTime: "10:15:23 AM", processedTime: "10:15:25 AM", processingDuration: "2.1s", fileSize: "45 KB", recordCount: 12, validationStatus: "passed", translationStatus: "passed", deliveryStatus: "passed", outputPath: "s3://data-engine/output/2026-03-16/EDI_837_20260316_001.json", errorDetails: null },
  { id: "2", fileName: "EDI_837_20260316_002.x12", batchId: "B-1056", project: "HealthClaims_837", status: "failed", receivedTime: "10:15:24 AM", processedTime: "10:15:26 AM", processingDuration: "1.8s", fileSize: "52 KB", recordCount: 15, validationStatus: "failed", translationStatus: "not started", deliveryStatus: "not started", outputPath: null, errorDetails: { stage: "Validation", errorType: "Field Missing", errorMessage: "CLM01 field is null in record 3", errorCode: "VAL_001", affectedRecords: [3, 7] } },
  { id: "3", fileName: "EDI_835_20260316_045.x12", batchId: "B-1057", project: "Payment_835", status: "passed", receivedTime: "10:16:01 AM", processedTime: "10:16:03 AM", processingDuration: "1.9s", fileSize: "38 KB", recordCount: 8, validationStatus: "passed", translationStatus: "passed", deliveryStatus: "passed", outputPath: "s3://data-engine/output/2026-03-16/EDI_835_20260316_045.json", errorDetails: null },
  { id: "4", fileName: "EDI_270_20260316_089.x12", batchId: "B-1058", project: "Eligibility_270", status: "passed", receivedTime: "10:16:15 AM", processedTime: "10:16:16 AM", processingDuration: "1.2s", fileSize: "28 KB", recordCount: 5, validationStatus: "passed", translationStatus: "passed", deliveryStatus: "passed", outputPath: "s3://data-engine/output/2026-03-16/EDI_270_20260316_089.json", errorDetails: null },
  { id: "5", fileName: "EDI_837_20260316_003.x12", batchId: "B-1056", project: "HealthClaims_837", status: "failed", receivedTime: "10:16:20 AM", processedTime: "10:16:21 AM", processingDuration: "0.9s", fileSize: "41 KB", recordCount: 10, validationStatus: "passed", translationStatus: "failed", deliveryStatus: "not started", outputPath: null, errorDetails: { stage: "Translation", errorType: "Mapping Error", errorMessage: "Invalid date format in ISA09 field", errorCode: "TRN_005", affectedRecords: [1] } },
  { id: "6", fileName: "EDI_835_20260316_046.x12", batchId: "B-1057", project: "Payment_835", status: "passed", receivedTime: "10:17:05 AM", processedTime: "10:17:07 AM", processingDuration: "1.5s", fileSize: "42 KB", recordCount: 9, validationStatus: "passed", translationStatus: "passed", deliveryStatus: "passed", outputPath: "s3://data-engine/output/2026-03-16/EDI_835_20260316_046.json", errorDetails: null },
];

function StageChip({ status }: { status: string }) {
  const cfg =
    status === "passed" ? { bg: `${C.em}12`, color: C.em, border: `${C.em}30` } :
    status === "failed" ? { bg: `${C.err}12`, color: C.err, border: `${C.err}30` } :
    { bg: C.glassBg, color: C.muted, border: C.glassBorder };
  return (
    <span className="font-mono uppercase px-2.5 py-1 rounded-lg" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>
      {status}
    </span>
  );
}

export function FileProcessingTable() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

  const passed = files.filter(f => f.status === "passed").length;
  const failed = files.filter(f => f.status === "failed").length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      {/* Header */}
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${C.glassBorder}` }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ color: C.text, fontSize: "1rem", fontWeight: 700 }}>File Processing Details</div>
            <p className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.72rem" }}>{files.length} files · Click any row to expand</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: `${C.em}12`, border: `1px solid ${C.em}30` }}>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: C.em }} />
              <span className="font-mono" style={{ color: C.em, fontSize: "0.72rem", fontWeight: 700 }}>{passed} Passed</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: `${C.err}12`, border: `1px solid ${C.err}30` }}>
              <AlertCircle className="w-3.5 h-3.5" style={{ color: C.err }} />
              <span className="font-mono" style={{ color: C.err, fontSize: "0.72rem", fontWeight: 700 }}>{failed} Failed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: C.glassBg, borderBottom: `1px solid ${C.glassBorder}` }}>
              {["STATUS", "FILE NAME", "BATCH", "PROJECT", "RECEIVED", "DURATION", "RECORDS", ""].map((h, i) => (
                <th key={i} className="text-left py-3.5 px-5 font-mono" style={{ color: C.muted, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <Fragment key={file.id}>
                <tr
                  onClick={() => toggle(file.id)}
                  className="cursor-pointer transition-all hover:bg-white/[0.025]"
                  style={{ borderBottom: `1px solid ${C.glassBorder}`, background: expanded === file.id ? "rgba(16,185,129,0.03)" : undefined }}
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      {file.status === "passed"
                        ? <CheckCircle2 className="w-4 h-4" style={{ color: C.em }} />
                        : <AlertCircle className="w-4 h-4" style={{ color: C.err }} />}
                      <span className="font-mono uppercase px-2.5 py-1 rounded-lg" style={{ background: file.status === "passed" ? `${C.em}12` : `${C.err}12`, color: file.status === "passed" ? C.em : C.err, border: `1px solid ${file.status === "passed" ? `${C.em}30` : `${C.err}30`}`, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em" }}>
                        {file.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.muted }} />
                      <span className="font-mono" style={{ color: C.text, fontSize: "0.82rem" }}>{file.fileName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5"><span className="font-mono" style={{ color: C.em, fontSize: "0.82rem" }}>{file.batchId}</span></td>
                  <td className="py-4 px-5"><span style={{ color: C.sub, fontSize: "0.82rem" }}>{file.project}</span></td>
                  <td className="py-4 px-5"><span className="font-mono" style={{ color: C.muted, fontSize: "0.78rem" }}>{file.receivedTime}</span></td>
                  <td className="py-4 px-5"><span className="font-mono" style={{ color: C.text, fontSize: "0.82rem" }}>{file.processingDuration}</span></td>
                  <td className="py-4 px-5"><span className="font-mono" style={{ color: C.em, fontSize: "0.82rem" }}>{file.recordCount}</span></td>
                  <td className="py-4 px-5">
                    {expanded === file.id
                      ? <ChevronDown className="w-4 h-4" style={{ color: C.em }} />
                      : <ChevronRight className="w-4 h-4" style={{ color: C.muted }} />}
                  </td>
                </tr>

                {expanded === file.id && (
                  <tr key={`${file.id}-detail`} style={{ background: C.glassBg }}>
                    <td colSpan={8} className="px-5 py-5">
                      <div className="grid grid-cols-3 gap-4">
                        {/* File info */}
                        <div className="p-4 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(12px)" }}>
                          <div className="font-mono mb-3" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>FILE INFORMATION</div>
                          <div className="space-y-3">
                            {[
                              { label: "File Size", value: file.fileSize },
                              { label: "Processed Time", value: file.processedTime },
                              { label: "Record Count", value: `${file.recordCount} records` },
                            ].map(row => (
                              <div key={row.label}>
                                <div style={{ color: C.muted, fontSize: "0.68rem", marginBottom: 2 }}>{row.label}</div>
                                <div className="font-mono" style={{ color: C.text, fontSize: "0.82rem" }}>{row.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Processing stages */}
                        <div className="p-4 rounded-xl" style={{ background: C.glassBg, border: `1px solid ${C.glassBorder}`, backdropFilter: "blur(12px)" }}>
                          <div className="font-mono mb-3" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>PROCESSING STAGES</div>
                          <div className="space-y-3">
                            {[
                              { label: "Validation", status: file.validationStatus },
                              { label: "Translation", status: file.translationStatus },
                              { label: "Delivery", status: file.deliveryStatus },
                            ].map(stage => (
                              <div key={stage.label} className="flex items-center justify-between">
                                <span style={{ color: C.sub, fontSize: "0.82rem" }}>{stage.label}</span>
                                <StageChip status={stage.status} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Error or output */}
                        <div className="p-4 rounded-xl" style={{ background: file.errorDetails ? `${C.err}06` : `${C.em}06`, border: `1px solid ${file.errorDetails ? `${C.err}25` : `${C.em}25`}` }}>
                          {file.errorDetails ? (
                            <>
                              <div className="flex items-center gap-2 font-mono mb-3" style={{ color: C.err, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>
                                <AlertCircle className="w-3.5 h-3.5" /> ERROR DETAILS
                              </div>
                              <div className="space-y-3">
                                {[
                                  { label: "Stage", value: file.errorDetails.stage, color: C.text },
                                  { label: "Error Type", value: file.errorDetails.errorType, color: C.err },
                                  { label: "Error Code", value: file.errorDetails.errorCode, color: C.err },
                                  { label: "Message", value: file.errorDetails.errorMessage, color: C.text },
                                  { label: "Affected Records", value: file.errorDetails.affectedRecords.join(", "), color: C.warn },
                                ].map(r => (
                                  <div key={r.label}>
                                    <div style={{ color: C.muted, fontSize: "0.68rem", marginBottom: 2 }}>{r.label}</div>
                                    <div className="font-mono" style={{ color: r.color, fontSize: "0.78rem", lineHeight: 1.5 }}>{r.value}</div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 font-mono mb-3" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> OUTPUT PATH
                              </div>
                              <div className="p-3 rounded-lg mb-3" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
                                <p className="font-mono break-all" style={{ color: C.em, fontSize: "0.7rem", lineHeight: 1.6 }}>{file.outputPath}</p>
                              </div>
                              <button
                                className="w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                style={{ background: C.emDim, border: `1px solid ${C.em}35`, color: C.em, fontSize: "0.78rem", fontWeight: 700 }}
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download Output
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}