/**
 * Label prioritas untuk list/nested/export Cascading RPJMD:
 * - jika ada kode dan uraian/nama: `kode — uraian/nama`
 * - jika hanya uraian/nama: uraian/nama
 * - jika hanya kode: kode
 * Uraian diutamakan atas nama; sama sumber field dengan form.
 */

export const CASCADING_PRIORITAS_NASIONAL_FIELDS = {
  uraianKey: "uraian_prionas",
  namaKey: "nama_prionas",
  kodeKey: "kode_prionas",
};

export const CASCADING_PRIORITAS_DAERAH_FIELDS = {
  uraianKey: "uraian_prioda",
  namaKey: "nama_prioda",
  kodeKey: "kode_prioda",
};

export const CASCADING_PRIORITAS_GUB_FIELDS = {
  uraianKey: "uraian_priogub",
  namaKey: "nama_priogub",
  kodeKey: "kode_priogub",
};

export function cascadingPrioritasDisplayLabel(row, { uraianKey, namaKey, kodeKey }) {
  if (!row) return "";
  const u = String(row[uraianKey] ?? "").trim();
  const n = String(row[namaKey] ?? "").trim();
  const desk = u || n;
  const k = String(row[kodeKey] ?? "").trim();
  if (k && desk) {
    if (desk === k) return k;
    return `${k} — ${desk}`;
  }
  if (desk) return desk;
  return k;
}

/** Tooltip hover: sama dengan teks badge (sudah memuat kode + uraian bila ada). */
export function cascadingPrioritasTooltipText(row, fields) {
  if (!row) return "";
  return cascadingPrioritasDisplayLabel(row, fields);
}
