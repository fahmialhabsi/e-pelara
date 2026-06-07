// src/shared/components/utils/generatePayloadRenstraTabelKegiatan.js
import Decimal from 'decimal.js';

// Payload generator final, auto-filter 0/null/empty
const generatePayloadRenstraTabelKegiatan = (formData) => {
  const payload = { ...formData };

  // Helper untuk convert string ribuan jadi number
  const parseNumber = (value) => {
    if (value === '' || value === null || value === undefined) return new Decimal(0);
    if (typeof value === 'number') {
      return Number.isFinite(value) ? new Decimal(Math.round(value)) : new Decimal(0);
    }
    let raw = String(value).trim();
    // Hapus prefix Rp dan spasi
    raw = raw.replace(/[Rp\s]/g, '');
    // Format desimal backend: 280000000.00
    if (/^\d+\.\d{1,2}$/.test(raw)) {
      return new Decimal(Math.round(Number(raw)));
    }
    // Format Indonesia: 280.000.000
    raw = raw.replace(/\./g, '').replace(',', '.');
    const n = Number(raw);
    return Number.isFinite(n) ? new Decimal(Math.round(n)) : new Decimal(0);
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
  if (!targetAkhir.equals(0)) payload.target_akhir_renstra = targetAkhir.toNumber();
  else delete payload.target_akhir_renstra;

  const paguAkhir = parseNumber(payload.pagu_akhir_renstra);
  if (!paguAkhir.equals(0)) payload.pagu_akhir_renstra = paguAkhir.toNumber();
  else delete payload.pagu_akhir_renstra;

  // Pastikan ID dikirim sebagai number
  payload.program_id = Number(payload.program_id);
  payload.kegiatan_id = Number(payload.kegiatan_id);
  payload.indikator_id = Number(payload.indikator_id);
  payload.kebijakan_id = payload.kebijakan_id ? Number(payload.kebijakan_id) : null;

  delete payload.tabel_program_id;

  console.log('kebijakan_id sebelum return:', payload.kebijakan_id);
  return payload;
};

export default generatePayloadRenstraTabelKegiatan;
