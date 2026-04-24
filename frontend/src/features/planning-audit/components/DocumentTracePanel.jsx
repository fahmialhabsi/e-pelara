import React, { useEffect, useState } from "react";
import { fetchDocumentTrace } from "../services/planningHubApi";

export default function DocumentTracePanel({ documentType, documentId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!documentType || !documentId) return undefined;
    (async () => {
      try {
        const t = await fetchDocumentTrace(documentType, documentId);
        if (!cancelled) setData(t);
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
  if (!data) {
    return <p className="text-xs text-gray-500">Memuat jejak dokumen…</p>;
  }

  return (
    <div className="rounded border bg-white p-3 text-xs shadow-sm">
      <div className="mb-2 font-semibold text-gray-800">Jejak dokumen</div>
      {data.baseline_rpjmd ? (
        <p className="mb-2">
          <span className="text-gray-500">Baseline RPJMD: </span>
          {data.baseline_rpjmd.nama_rpjmd || `ID ${data.baseline_rpjmd.id}`}
        </p>
      ) : null}
      {data.parents?.length ? (
        <div className="mb-2">
          <div className="font-medium text-gray-600">Induk</div>
          <ul className="list-inside list-disc">
            {data.parents.map((p, i) => (
              <li key={i}>
                {p.type} #{p.id}
                {p.row?.judul || p.row?.nama_rpjmd ? ` — ${p.row.judul || p.row.nama_rpjmd}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.children && Object.keys(data.children).length ? (
        <div>
          <div className="font-medium text-gray-600">Turunan</div>
          {Object.entries(data.children).map(([k, v]) =>
            Array.isArray(v) && v.length ? (
              <div key={k} className="mt-1">
                <span className="font-semibold capitalize">{k}</span> ({v.length})
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
