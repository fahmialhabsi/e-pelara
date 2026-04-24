// src/shared/components/utils/generatePayloadRenstraTabelKegiatan.js
import Decimal from "decimal.js";

// Payload generator final, auto-filter 0/null/empty
const generatePayloadRenstraTabelKegiatan = (formData) => {
  const payload = { ...formData };

  // Helper untuk convert string ribuan jadi number
  const parseNumber = (value) => {
    if (value === null || value === undefined || value === "")
      return new Decimal(0);
    if (typeof value === "number") return new Decimal(value);
    // Hapus titik ribuan dan ubah koma desimal ke titik
    const clean = value.toString().replace(/\./g, "").replace(/,/g, ".");
    return new Decimal(clean || 0);
  };

  // Konversi target & pagu per tahun
  [1, 2, 3, 4, 5, 6].forEach((i) => {
    const target = parseNumber(payload[`target_tahun_${i}`]);
    const pagu = parseNumber(payload[`pagu_tahun_${i}`]);

    if (!target.equals(0)) payload[`target_tahun_${i}`] = target.toNumber();
    else delete payload[`target_tahun_${i}`];

    if (!pagu.equals(0)) payload[`pagu_tahun_${i}`] = pagu.toNumber();
    else delete payload[`pagu_tahun_${i}`];
  });

  // Field numerik lain
  const baseline = parseNumber(payload.baseline);
  if (!baseline.equals(0)) payload.baseline = baseline.toNumber();
  else delete payload.baseline;

  const targetAkhir = parseNumber(payload.target_akhir_renstra);
  if (!targetAkhir.equals(0))
    payload.target_akhir_renstra = targetAkhir.toNumber();
  else delete payload.target_akhir_renstra;

  const paguAkhir = parseNumber(payload.pagu_akhir_renstra);
  if (!paguAkhir.equals(0)) payload.pagu_akhir_renstra = paguAkhir.toNumber();
  else delete payload.pagu_akhir_renstra;

  // Pastikan ID dikirim sebagai number
  payload.program_id = Number(payload.program_id);
  payload.kegiatan_id = Number(payload.kegiatan_id);
  payload.indikator_id = Number(payload.indikator_id);

  delete payload.tabel_program_id;

  return payload;
};

export default generatePayloadRenstraTabelKegiatan;
