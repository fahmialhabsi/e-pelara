import React from "react";

/** Menampilkan snapshot `normalized.before` / `normalized.after` tanpa dump JSON penuh. */
export default function BeforeAfterDiffCard({ normalized }) {
  if (!normalized || (!normalized.before && !normalized.after)) {
    return null;
  }
  const keys =
    Array.isArray(normalized.changed_fields) && normalized.changed_fields.length
      ? normalized.changed_fields.map((c) => c.field)
      : Object.keys({ ...normalized.before, ...normalized.after }).filter((k) => !k.startsWith("_"));

  const pick = (obj, k) => (obj && Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : "—");

  return (
    <div className="grid gap-2 md:grid-cols-2">
      <div className="rounded border bg-slate-50 p-2 text-xs">
        <div className="mb-1 font-semibold text-gray-600">Sebelum</div>
        <dl className="space-y-1">
          {keys.slice(0, 14).map((k) => (
            <div key={`b-${k}`} className="flex justify-between gap-2">
              <dt className="text-gray-500">{k}</dt>
              <dd className="text-right font-mono text-gray-900">{String(pick(normalized.before, k))}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded border bg-white p-2 text-xs">
        <div className="mb-1 font-semibold text-gray-600">Sesudah</div>
        <dl className="space-y-1">
          {keys.slice(0, 14).map((k) => (
            <div key={`a-${k}`} className="flex justify-between gap-2">
              <dt className="text-gray-500">{k}</dt>
              <dd className="text-right font-mono text-gray-900">{String(pick(normalized.after, k))}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
