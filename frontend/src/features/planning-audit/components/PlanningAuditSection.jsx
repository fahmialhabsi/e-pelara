import React, { useMemo } from "react";
import AuditTimeline from "./AuditTimeline";
import BeforeAfterDiffCard from "./BeforeAfterDiffCard";
import DocumentTracePanel from "./DocumentTracePanel";
import VersionHistoryPanel from "./VersionHistoryPanel";

/**
 * Pola audit bersama (Renstra/RPJMD) — dipakai ulang untuk Renja/RKPD/RKA/DPA/v2 dokumen.
 */
export default function PlanningAuditSection({
  documentType,
  documentId,
  auditRows = [],
  auditLoading = false,
  allowRestore = false,
  title = "Audit dokumen",
  onVersionRestored,
}) {
  const latestDiffNormalized = useMemo(
    () =>
      auditRows.find((e) => e.normalized?.changed_fields?.length)?.normalized ||
      auditRows.find((e) => e.action_type === "UPDATE" && e.normalized)?.normalized ||
      auditRows.find((e) => e.normalized)?.normalized ||
      null,
    [auditRows],
  );

  if (!documentType || !documentId) return null;

  return (
    <div className="rounded border bg-slate-50 p-4 text-sm shadow-sm">
      <h6 className="mb-3 font-semibold text-gray-900">{title}</h6>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <DocumentTracePanel documentType={documentType} documentId={documentId} />
        <VersionHistoryPanel
          documentType={documentType}
          documentId={documentId}
          allowRestore={allowRestore}
          onRestored={onVersionRestored}
        />
      </div>
      {auditLoading ? (
        <p className="text-gray-600">Memuat…</p>
      ) : (
        <>
          {latestDiffNormalized ? (
            <div className="mb-4">
              <div className="mb-1 text-xs font-medium text-gray-600">Ringkasan perubahan</div>
              <BeforeAfterDiffCard normalized={latestDiffNormalized} />
            </div>
          ) : null}
          <AuditTimeline rows={auditRows} loading={false} />
        </>
      )}
    </div>
  );
}
