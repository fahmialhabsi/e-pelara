import React, { useEffect, useState } from "react";
import { fetchDocumentVersions, restorePlanningDocumentVersion } from "../services/planningHubApi";

export default function VersionHistoryPanel({
  documentType,
  documentId,
  allowRestore = false,
  onRestored,
}) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [lastRestoreMeta, setLastRestoreMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!documentType || !documentId) return undefined;
    (async () => {
      try {
        const list = await fetchDocumentVersions(documentType, documentId);
        if (!cancelled) setRows(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setErr(e?.response?.data?.message || e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentType, documentId]);

  if (!documentType || !documentId) return null;
  if (err) {
    return <p className="text-xs text-red-600">{err}</p>;
  }
  if (!rows.length) {
    return <p className="text-xs text-gray-500">Belum ada riwayat versi global.</p>;
  }

  const onRestore = async (r) => {
    if (!allowRestore || !r?.id) return;
    const reason = window.prompt("Alasan restore (wajib):", "");
    if (!reason || !String(reason).trim()) {
      window.alert("Alasan wajib diisi.");
      return;
    }
    setBusyId(r.id);
    try {
      await restorePlanningDocumentVersion(r.id, { change_reason_text: String(reason).trim() });
      const list = await fetchDocumentVersions(documentType, documentId);
      setRows(Array.isArray(list) ? list : []);
      if (typeof onRestored === "function") onRestored();
    } catch (e) {
      window.alert(e?.response?.data?.message || e.message || "Restore gagal.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-h-48 overflow-auto rounded border bg-gray-50 p-2 text-xs">
      <div className="mb-1 font-semibold">Versi (global)</div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="p-1">#</th>
            <th className="p-1">Aksi</th>
            <th className="p-1">Waktu</th>
            {allowRestore ? <th className="p-1"> </th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-200">
              <td className="p-1">{r.version_number}</td>
              <td className="p-1">{r.action}</td>
              <td className="p-1 whitespace-nowrap">
                {r.created_at ? new Date(r.created_at).toLocaleString("id-ID") : "—"}
              </td>
              {allowRestore ? (
                <td className="p-1 whitespace-nowrap">
                  <button
                    type="button"
                    className="text-blue-700 underline disabled:opacity-50"
                    disabled={busyId === r.id}
                    onClick={() => onRestore(r)}
                  >
                    {busyId === r.id ? "…" : "Restore"}
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {lastRestoreMeta ? (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-gray-800">
          <div className="font-semibold text-amber-900">Cakupan restore terakhir</div>
          <div className="mt-1">
            <span className="text-gray-600">Scope:</span> {lastRestoreMeta.scope}
          </div>
          <div>
            <span className="text-gray-600">Field material:</span>{" "}
            {lastRestoreMeta.material_field_count ?? lastRestoreMeta.material_fields?.length ?? "—"}
          </div>
          {lastRestoreMeta.note_id ? (
            <div className="mt-1 text-gray-700">{lastRestoreMeta.note_id}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
