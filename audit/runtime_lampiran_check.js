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
  const efektivitas = Array.isArray(lampiran?.efektivitas_pengendalian) ? lampiran.efektivitas_pengendalian : [];
  const monitoring = Array.isArray(lampiran?.monitoring_level_risiko) ? lampiran.monitoring_level_risiko : [];

  const kodeList = daftarRisiko
    .map((r) => r?.kode_risiko || r?.risk_code || r?.kode || '')
    .filter(Boolean);

  const seen = new Set();
  const dup = new Set();
  for (const k of kodeList) {
    if (seen.has(k)) dup.add(k);
    seen.add(k);
  }

  const BLOCKING_FIELDS = ['hasil_monitoring', 'realisasi_mitigasi', 'kendala', 'tindak_lanjut'];
  const placeholderCount = [...efektivitas, ...monitoring].filter((r) =>
    BLOCKING_FIELDS.some((f) => {
      const val = r[f];
    })
  ).length;

  const result = {
    context_id: contextId,
    total_daftar_risiko: daftarRisiko.length,
    total_efektivitas_pengendalian: efektivitas.length,
    total_monitoring_level_risiko: monitoring.length,
    duplicate_kode_risiko_count: dup.size,
    duplicate_kode_risiko_samples: Array.from(dup).slice(0, 10),
    placeholder_rows_in_efektivitas_or_monitoring: placeholderCount,
    status: dup.size === 0 && placeholderCount === 0 ? 'HIJAU_PENUH' : 'KUNING_PERLU_REVIEW'
  };

  fs.writeFileSync('audit/runtime_lampiran_result.json', JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
