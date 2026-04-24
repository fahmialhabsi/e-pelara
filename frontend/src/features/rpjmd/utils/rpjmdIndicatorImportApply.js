/**
 * Terapkan satu baris impor Tabel 3.1 (target tujuan & sasaran RPJMD 2025–2029) ke draft Formik indikator tujuan.
 *
 * Praktik periode 2025–2029:
 * - Nama indikator & target tahun ke-1…5 mengikuti kolom dokumen resmi (baseline akhir 2024 + target 2025–2029).
 * - Capaian tahun 1 = baseline 2024 (kondisi awal / titik tolak kinerja menjelang tahun pertama RPJMD);
 *   capaian tahun 2–5 dikosongkan agar diisi dari realisasi pemantauan atau dari rangkaian historis tab 2.28 bila relevan.
 */
export function applyRpjmdTujuanSasaran31Row(row, setFieldValue) {
  if (!row || typeof setFieldValue !== "function") return;
  setFieldValue("nama_indikator", String(row.indikator || "").trim());
  const bl = row.baseline_2024;
  setFieldValue("baseline", bl != null ? String(bl).trim() : "");
  const targetKeys = [
    "target_2025",
    "target_2026",
    "target_2027",
    "target_2028",
    "target_2029",
  ];
  targetKeys.forEach((k, i) => {
    const v = row[k];
    setFieldValue(`target_tahun_${i + 1}`, v != null ? String(v).trim() : "");
  });
  setFieldValue("capaian_tahun_1", bl != null ? String(bl).trim() : "");
  for (let i = 2; i <= 5; i += 1) {
    setFieldValue(`capaian_tahun_${i}`, "");
  }
}
