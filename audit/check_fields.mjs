const token = process.env.MR_BEARER_TOKEN || '';
const res = await fetch('http://localhost:3000/api/mr-report/context/11/lampiran', {
  headers: { Authorization: `Bearer ${token}` }
});
const json = await res.json();
const lampiran = json?.data || json || {};
const ef = (lampiran?.efektivitas_pengendalian || [])[0];
const mo = (lampiran?.monitoring_level_risiko || [])[0];
console.log('EFEKTIVITAS keys:', ef ? Object.keys(ef) : 'kosong');
console.log('MONITORING keys:', mo ? Object.keys(mo) : 'kosong');
console.log('EFEKTIVITAS sample:', JSON.stringify(ef, null, 2));
