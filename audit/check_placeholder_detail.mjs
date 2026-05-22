const token = process.env.MR_BEARER_TOKEN || '';
const res = await fetch('http://localhost:3000/api/mr-report/context/11/lampiran', {
  headers: { Authorization: `Bearer ${token}` }
});
const json = await res.json();
const lampiran = json?.data || json || {};
const ef = lampiran?.efektivitas_pengendalian || [];
const mo = lampiran?.monitoring_level_risiko || [];
const ar = lampiran?.analisis_risiko || [];
const rp = lampiran?.rencana_pengendalian || [];

const belum = (v) => !v || String(v).trim().toLowerCase().includes('belum') || String(v).trim() === '-';

console.log('\n=== RINGKASAN AUDIT PLACEHOLDER ===');
console.log(`Efektivitas kegiatan_pengendalian kosong : ${ef.filter(r=>belum(r.kegiatan_pengendalian)).length}/${ef.length} → DATA BELUM DIINPUT USER`);
console.log(`Monitoring rekomendasi kosong            : ${mo.filter(r=>belum(r.rekomendasi)).length}/${mo.length} → WARNING (non-blocking)`);
console.log(`Analisis risiko placeholder              : ${ar.filter(r=>belum(r.penyebab_risiko)||belum(r.dampak_risiko)||belum(r.uraian_risiko)).length}/${ar.length}`);
console.log(`Rencana pengendalian placeholder         : ${rp.filter(r=>belum(r.kegiatan_pengendalian)||belum(r.target_waktu)||belum(r.pic)).length}/${rp.length}`);

const dupRp = new Set();
const seen = new Set();
rp.forEach(r => { const k = r?.kode_risiko||''; if(seen.has(k)) dupRp.add(k); seen.add(k); });
console.log(`Duplikat rencana_pengendalian            : ${dupRp.size} kode → ${[...dupRp].join(', ')}`);
console.log('\n→ KUNING = data belum diinput, bukan bug sistem');
