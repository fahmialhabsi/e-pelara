/**
 * Normalisasi untuk mengelompokkan nama OPD yang sama (beda spasi/kasus).
 * @param {unknown} s
 * @returns {string}
 */
export function normalizeOpdNameKey(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Satu baris OPD kanonik per nama (setelah normalisasi).
 * Jika beberapa id punya nama yang sama → dipakai id terkecil (deterministik).
 *
 * @param {Array<{ id: unknown, nama_opd?: string, nama?: string }>} rows
 * @returns {{ list: Array<{ id: number|string, nama_opd: string }>, idToCanonical: Map<string, string> }}
 */
export function dedupeOpdPenanggungJawabRows(rows) {
  const byKey = new Map();
  /** Setiap id (termasuk duplikat) → id kanonik */
  const idToCanonical = new Map();

  const sorted = [...(rows || [])]
    .filter((r) => r != null && r.id != null)
    .sort((a, b) => Number(a.id) - Number(b.id));

  for (const r of sorted) {
    const rawLabel = String(r.nama_opd || r.nama || "")
      .trim()
      .replace(/\s+/g, " ");
    const key = rawLabel ? normalizeOpdNameKey(rawLabel) : `\0__empty__${r.id}`;

    let canon = byKey.get(key);
    if (!canon) {
      canon = {
        id: r.id,
        nama_opd: rawLabel || `OPD #${r.id}`,
      };
      byKey.set(key, canon);
    }
    idToCanonical.set(String(r.id), String(canon.id));
  }

  const list = Array.from(byKey.values()).sort((a, b) =>
    String(a.nama_opd || "").localeCompare(String(b.nama_opd || ""), undefined, {
      sensitivity: "base",
    }),
  );

  return { list, idToCanonical };
}
