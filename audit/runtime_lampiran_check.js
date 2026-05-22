const fs = require('fs');

async function main() {
  const baseUrl = process.env.MR_BASE_URL || 'http://localhost:3000';
  const contextId = process.env.MR_CONTEXT_ID || '11';
  const token = process.env.MR_BEARER_TOKEN || '';

  if (!token) {
    console.error('ERROR: MR_BEARER_TOKEN belum diisi');
    process.exit(2);
  }

  const url = `${baseUrl}/api/mr-report/context/${contextId}/lampiran`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`ERROR: HTTP ${res.status} ${res.statusText}`);
    process.exit(3);
  }

  const json = await res.json();
  const lampiran = json?.data || json || {};

  const daftarRisiko = Array.isArray(lampiran?.daftar_risiko) ? lampiran.daftar_risiko : [];
  const analisisRisiko = Array.isArray(lampiran?.analisis_risiko) ? lampiran.analisis_risiko : [];
  const rencanaPengendalian = Array.isArray(lampiran?.rencana_pengendalian) ? lampiran.rencana_pengendalian : [];
  const efektivitas = Array.isArray(lampiran?.efektivitas_pengendalian) ? lampiran.efektivitas_pengendalian : [];
  const monitoring = Array.isArray(lampiran?.monitoring_level_risiko) ? lampiran.monitoring_level_risiko : [];

  const duplicateCountByCodes = (rows) => {
    const codes = rows
      .map((r) => r?.kode_risiko || r?.risk_code || r?.kode || '')
      .filter(Boolean);
    const seen = new Set();
    const dup = new Set();
    for (const code of codes) {
      if (seen.has(code)) dup.add(code);
      seen.add(code);
    }
    return { count: dup.size, samples: Array.from(dup).slice(0, 10) };
  };

  const isPlaceholder = (v) => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim().toLowerCase();
    return !s || s === 'belum tersedia' || s === 'belum diisi' || s === 'belum ditetapkan' || s === '-';
  };

  const countPlaceholderByFields = (rows, fields) =>
    rows.filter((row) => fields.some((f) => isPlaceholder(row?.[f]))).length;

  const dupBatch1 = duplicateCountByCodes(daftarRisiko);
  const placeholderBatch1 = countPlaceholderByFields([...efektivitas, ...monitoring], ['kegiatan_pengendalian', 'residual_likelihood', 'residual_impact', 'residual_level']);
  const statusBatch1 = dupBatch1.count === 0 && placeholderBatch1 === 0 ? 'HIJAU_PENUH' : 'KUNING_PERLU_REVIEW';

  const dupAnalisis = duplicateCountByCodes(analisisRisiko);
  const dupRencana = duplicateCountByCodes(rencanaPengendalian);

  const placeholderAnalisis = countPlaceholderByFields(analisisRisiko, [
    'penyebab_risiko',
    'dampak_risiko',
    'uraian_risiko',
  ]);

  const placeholderRencana = countPlaceholderByFields(rencanaPengendalian, [
    'kegiatan_pengendalian',
    'target_waktu',
    'pic',
  ]);

  const statusBatch2 =
    dupAnalisis.count === 0 &&
    dupRencana.count === 0 &&
    placeholderAnalisis === 0 &&
    placeholderRencana === 0
      ? 'HIJAU'
      : 'KUNING';

  const result = {
    context_id: contextId,
    total_daftar_risiko: daftarRisiko.length,
    total_efektivitas_pengendalian: efektivitas.length,
    total_monitoring_level_risiko: monitoring.length,
    duplicate_kode_risiko_count: dupBatch1.count,
    duplicate_kode_risiko_samples: dupBatch1.samples,
    placeholder_rows_in_efektivitas_or_monitoring: placeholderBatch1,
    status: statusBatch1,
    batch2: {
      total_analisis_risiko: analisisRisiko.length,
      total_rencana_pengendalian: rencanaPengendalian.length,
      duplicate_analisis_risiko_count: dupAnalisis.count,
      duplicate_analisis_risiko_samples: dupAnalisis.samples,
      duplicate_rencana_pengendalian_count: dupRencana.count,
      duplicate_rencana_pengendalian_samples: dupRencana.samples,
      placeholder_analisis_risiko_count: placeholderAnalisis,
      placeholder_rencana_pengendalian_count: placeholderRencana,
      status_batch2: statusBatch2,
    },
  };

  fs.writeFileSync('audit/runtime_lampiran_result.json', JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
