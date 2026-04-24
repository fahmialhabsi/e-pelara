/**
 * Label dropdown / preview untuk OPD penanggung jawab.
 */
export function formatOpdPenanggungLabel(item) {
  if (!item) return "";
  if (typeof item.label === "string" && item.label.trim()) {
    return item.label.trim();
  }
  const nama = String(item.nama_opd ?? "").trim();
  const bidang = String(item.nama_bidang_opd ?? "").trim();
  if (nama && bidang) return `${nama} - ${bidang}`;
  if (nama) return nama;
  if (bidang) return bidang;
  if (item.id != null) return `OPD #${item.id}`;
  return "";
}
