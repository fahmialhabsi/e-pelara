/**
 * Tampilan konsisten program RPJMD / master: "KODE - NAMA"
 * (menghindari "02.09.02.: " dari kode bertitik di akhir + ":")
 *
 * Segmen pertama: hilangkan nol di depan (`02.09.01` → `2.09.01`).
 * Segmen berikutnya tidak diubah (tetap `09`, dll.).
 */
export function normalizeProgramKodeForDisplay(k) {
  if (k == null || k === "") return "";
  let s = String(k).trim();
  s = s.replace(/\.+$/g, "").trim();
  if (!s) return "";
  const parts = s.split(".");
  if (parts.length > 0) {
    const head = parts[0].replace(/^0+/, "");
    parts[0] = head === "" ? "0" : head;
  }
  return parts.join(".");
}

/**
 * Satu baris untuk dropdown / daftar.
 * @param {{ kode_program?: string, kode_program_full?: string, nama_program?: string, id?: number|string }} row
 * @param {string} [sep] pemisah, default " - "
 */
export function formatProgramOptionLabel(row, sep = " - ") {
  if (!row) return "";
  const rawK =
    row.kode_program_full != null && String(row.kode_program_full).trim() !== ""
      ? row.kode_program_full
      : row.kode_program;
  const k = normalizeProgramKodeForDisplay(rawK);
  let n = String(row.nama_program ?? "").trim();
  if (k && n) {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${esc}\\s*[:\\-–—.]\\s*`, "i");
    if (re.test(n)) {
      n = n.replace(re, "").trim();
    } else if (
      n.length > k.length &&
      n.toLowerCase().startsWith(k.toLowerCase())
    ) {
      const rest = n.slice(k.length).replace(/^[\s.:–—-]+/, "").trim();
      if (rest) n = rest;
    }
  }
  if (k && n) return `${k}${sep}${n}`;
  return k || n || String(row.id ?? "");
}
