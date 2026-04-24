/** Label & varian badge untuk status audit (bukan log mentah). */

export function complianceStatusLabel(uiStatus) {
  const s = String(uiStatus || "").toLowerCase();
  if (s === "success") return "Berhasil (mutasi)";
  if (s === "failure") return "Gagal";
  if (s === "rejected") return "Ditolak";
  if (s === "preview") return "Pratinjau";
  if (s === "create") return "Buat baru";
  if (s === "update") return "Ubah";
  if (s === "delete") return "Hapus";
  return "Lainnya";
}

export function complianceStatusVariant(uiStatus) {
  const s = String(uiStatus || "").toLowerCase();
  if (s === "success" || s === "create") return "success";
  if (s === "failure") return "danger";
  if (s === "rejected") return "warning";
  if (s === "preview") return "info";
  if (s === "update") return "primary";
  if (s === "delete") return "dark";
  return "secondary";
}
