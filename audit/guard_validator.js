const fs = require('fs');

const FILES = {
  route:       'backend/routes/mr_planningReportRoutes.js',
  queryService:'backend/services/mr/mrPlanningReportQueryService.js',
  exportWord:  'backend/services/mr/mrPlanningReportExportWordService.js',
  exportExcel: 'backend/services/mr/mrPlanningReportExportExcelService.js',
  frontendPage:'frontend/src/pages/mr/MrPlanningReportPage.jsx',
  frontendSvc: 'frontend/src/services/mrPlanningReportService.js',
};

const CHECKS = [
  { guard:'A', file:'queryService', pattern:/\.filter\(|dedup|distinct|Set\(/i,      label:'Deduplicate data sebelum response' },
  { guard:'B', file:'queryService', pattern:/status.*=.*['"]approved|final['"]/i,     label:'Filter status approved/final' },
  { guard:'B', file:'frontendPage', pattern:/draft|placeholder|!data|null.*return/i, label:'Guard render jika data kosong' },
  { guard:'C', file:'exportWord',   pattern:/reduce|sum|total/i,                      label:'Kalkulasi total dari data aktual di Word' },
  { guard:'C', file:'exportExcel',  pattern:/reduce|sum|total/i,                      label:'Kalkulasi total dari data aktual di Excel' },
  { guard:'D', file:'exportWord',   pattern:/\$\{.*\}/,                               label:'Narasi dinamis (template literal) di Word' },
  { guard:'E', file:'frontendSvc',  pattern:/response\??\.data|getResponseData/i,               label:'Parse response konsisten di frontend service' },
  { guard:'F', file:'exportWord',   pattern:/usulan|rencana|draft/i,                  label:'Label usulan/rencana di Word export' },
];

let passed = 0, failed = 0;
CHECKS.forEach(({ guard, file, pattern, label }) => {
  const path = FILES[file];
  if (!fs.existsSync(path)) { console.log(`[GUARD ${guard}] ⚠️  FILE NOT FOUND: ${path}`); failed++; return; }
  const content = fs.readFileSync(path, 'utf8');
  const ok = pattern.test(content);
  console.log(`[GUARD ${guard}] ${ok ? '✅' : '❌'} ${label}`);
  ok ? passed++ : failed++;
});
console.log(`\nHasil: ${passed} lulus, ${failed} perlu perhatian dari ${CHECKS.length} pengecekan`);
