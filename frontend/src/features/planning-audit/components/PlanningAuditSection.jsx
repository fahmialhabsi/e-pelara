import React, { useMemo } from 'react';
import AuditTimeline from './AuditTimeline';
import BeforeAfterDiffCard from './BeforeAfterDiffCard';
import DocumentTracePanel from './DocumentTracePanel';
import VersionHistoryPanel from './VersionHistoryPanel';

/**
 * Pola audit bersama (Renstra/RPJMD) — dipakai ulang untuk Renja/RKPD/RKA/DPA/v2 dokumen.
 */
export default function PlanningAuditSection({
  documentType,
  documentId,
  auditRows = [],
  auditLoading = false,
  allowRestore = false,
  title = 'Audit dokumen',
  onVersionRestored,
  fieldLabelMap = {},
  statusLabelMap = {},
}) {
  const localizedAuditRows = useMemo(() => {
    return (auditRows || []).map((row) => {
      const normalized = row?.normalized;

      if (!normalized) return row;

      const mapKey = (k) => fieldLabelMap[k] || k;
      const mapStatus = (v) => statusLabelMap[v] || v;

      return {
        ...row,

        action_type: statusLabelMap[row.action_type] || row.action_type,

        normalized: {
          ...normalized,

          changed_fields: (normalized.changed_fields || []).map(mapKey),

          before:
            normalized.before && typeof normalized.before === 'object'
              ? Object.fromEntries(
                  Object.entries(normalized.before).map(([k, v]) => [mapKey(k), mapStatus(v)]),
                )
              : normalized.before,

          after:
            normalized.after && typeof normalized.after === 'object'
              ? Object.fromEntries(
                  Object.entries(normalized.after).map(([k, v]) => [mapKey(k), mapStatus(v)]),
                )
              : normalized.after,
        },
      };
    });
  }, [auditRows, fieldLabelMap, statusLabelMap]);
  const latestDiffNormalized = useMemo(
    () =>
      localizedAuditRows.find((e) => e.normalized?.changed_fields?.length)?.normalized ||
      localizedAuditRows.find((e) => e.action_type === 'Perubahan Data' && e.normalized)
        ?.normalized ||
      localizedAuditRows.find((e) => e.normalized)?.normalized ||
      null,
    [localizedAuditRows],
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
              <BeforeAfterDiffCard
                normalized={latestDiffNormalized}
                fieldLabelMap={fieldLabelMap}
                statusLabelMap={statusLabelMap}
              />
            </div>
          ) : null}
          <AuditTimeline rows={localizedAuditRows} loading={false} fieldLabelMap={fieldLabelMap} />
        </>
      )}
    </div>
  );
}
