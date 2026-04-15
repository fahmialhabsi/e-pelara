import React from "react";

/**
 * @param {Array} rows — baris audit dari API (sudah berisi `normalized` bila backend enrich)
 */
export default function AuditTimeline({ rows = [], loading }) {
  if (loading) {
    return <p className="text-sm text-gray-600">Memuat riwayat audit…</p>;
  }
  if (!rows.length) {
    return <p className="text-sm text-gray-500">Belum ada entri audit.</p>;
  }

  return (
    <ul className="space-y-3 border-l-2 border-gray-200 pl-4">
      {rows.map((ev) => {
        const n = ev.normalized || {};
        const when = ev.changed_at
          ? new Date(ev.changed_at).toLocaleString("id-ID")
          : "—";
        return (
          <li key={ev.id} className="relative text-sm">
            <span className="absolute -left-[11px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
            <div className="font-medium text-gray-900">
              {ev.action_type}{" "}
              {ev.version_after != null ? (
                <span className="text-xs font-normal text-gray-500">
                  (v{ev.version_before ?? "—"} → v{ev.version_after})
                </span>
              ) : null}
            </div>
            <div className="text-xs text-gray-500">{when}</div>
            {ev.change_reason_text ? (
              <div className="mt-1 text-xs text-gray-700">
                <span className="font-semibold">Alasan: </span>
                {ev.change_reason_text}
              </div>
            ) : null}
            {n.summary ? (
              <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-gray-800">{n.summary}</div>
            ) : null}
            {Array.isArray(n.changed_fields) && n.changed_fields.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-xs text-gray-700">
                {n.changed_fields.slice(0, 8).map((c) => (
                  <li key={c.field}>
                    <span className="font-medium">{c.field}</span>: {String(c.from ?? "—")} →{" "}
                    {String(c.to ?? "—")}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
