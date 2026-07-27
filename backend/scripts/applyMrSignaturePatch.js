'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function applyReplace(content, oldStr, newStr, label) {
  const useCRLF = content.includes('\r\n');
  const o = useCRLF ? oldStr.replace(/\n/g, '\r\n') : oldStr;
  const n = useCRLF ? newStr.replace(/\n/g, '\r\n') : newStr;
  const idx = content.indexOf(o);
  if (idx === -1) {
    throw new Error('Anchor tidak ditemukan: ' + label);
  }
  const idx2 = content.indexOf(o, idx + 1);
  if (idx2 !== -1) {
    throw new Error('Anchor ditemukan lebih dari sekali (tidak unik): ' + label);
  }
  return content.slice(0, idx) + n + content.slice(idx + o.length);
}

function patchFile(relPath, edits) {
  const filePath = path.join(ROOT, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const edit of edits) {
    content = applyReplace(content, edit.old, edit.new, edit.label);
    console.log('  OK: ' + edit.label);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Selesai menulis: ' + relPath);
}

// ===================== FILE A: mrPlanningReportQueryService.js =====================
console.log('--- mrPlanningReportQueryService.js ---');
patchFile('backend/services/mr/mrPlanningReportQueryService.js', [
  {
    label: 'A1 import model PejabatPenandatangan',
    old: "const { sequelize, MrPlanningSnapshot } = require('../../models');",
    new: "const { sequelize, MrPlanningSnapshot, PejabatPenandatangan } = require('../../models');",
  },
  {
    label: 'A2 sisipkan helper getPenandatanganFromMasterData',
    old: [
      "const getReportOfficials = async (context = {}) => {",
    ].join('\n'),
    new: [
      "const getPenandatanganFromMasterData = async (tahun) => {",
      "  if (!tahun) return null;",
      "  const row = await PejabatPenandatangan.findOne({",
      "    where: { tahun: Number(tahun), role: 'KEPALA_DINAS' },",
      "  });",
      "  if (!row) return null;",
      "  return { nama: row.nama || null, nip: row.nip || null, jabatan: row.jabatan || null };",
      "};",
      "",
      "const getReportOfficials = async (context = {}) => {",
    ].join('\n'),
  },
  {
    label: 'A3 panggil getPenandatanganFromMasterData di dalam fungsi',
    old: [
      "  const namaOpd = normalizeString(context.nama_opd);",
      "  const tahun = Number(context.tahun);",
      "  const jenisDokumen = normalizeDocType(context.jenis_dokumen);",
      "",
      "  if (!namaOpd) {",
    ].join('\n'),
    new: [
      "  const namaOpd = normalizeString(context.nama_opd);",
      "  const tahun = Number(context.tahun);",
      "  const jenisDokumen = normalizeDocType(context.jenis_dokumen);",
      "  const penandatanganMaster = await getPenandatanganFromMasterData(tahun);",
      "",
      "  if (!namaOpd) {",
    ].join('\n'),
  },
  {
    label: 'A4 branch !namaOpd pakai penandatanganMaster',
    old: [
      "    return {",
      "      pemilik_risiko: null,",
      "      koordinator_risiko: null,",
      "      penandatangan_laporan: null,",
      "      source: 'opd_penanggung_jawab',",
      "      warning: 'nama_opd pada context belum tersedia.',",
      "    };",
      "  }",
    ].join('\n'),
    new: [
      "    return {",
      "      pemilik_risiko: null,",
      "      koordinator_risiko: null,",
      "      penandatangan_laporan: penandatanganMaster,",
      "      source: penandatanganMaster ? 'pejabat_penandatangan' : 'opd_penanggung_jawab',",
      "      warning: 'nama_opd pada context belum tersedia.',",
      "    };",
      "  }",
    ].join('\n'),
  },
  {
    label: 'A5 return akhir pakai penandatanganMaster',
    old: [
      "    penandatangan_laporan: kepalaDinas,",
      "    source: 'opd_penanggung_jawab',",
      "    total_officials_found: rows.length,",
      "  };",
      "};",
    ].join('\n'),
    new: [
      "    penandatangan_laporan: penandatanganMaster || kepalaDinas,",
      "    source: penandatanganMaster ? 'pejabat_penandatangan' : 'opd_penanggung_jawab',",
      "    total_officials_found: rows.length,",
      "  };",
      "};",
    ].join('\n'),
  },
]);

// ===================== FILE B: mrPlanningTlhpReportQueryService.js =====================
console.log('--- mrPlanningTlhpReportQueryService.js ---');
patchFile('backend/services/mr/mrPlanningTlhpReportQueryService.js', [
  {
    label: 'B1 import model PejabatPenandatangan',
    old: [
      'const { Op } = require("sequelize");',
      'const {',
      '  sequelize,',
      '  MrPlanningLhp,',
      '  MrPlanningTemuan,',
      '  MrPlanningTemuanRekomendasi,',
      '  MrPlanningTindakLanjut,',
      '  MrPlanningTindakLanjutDocument,',
      '  MrReferenceItem,',
      '} = require("../../models");',
    ].join('\n'),
    new: [
      'const { Op } = require("sequelize");',
      'const {',
      '  sequelize,',
      '  MrPlanningLhp,',
      '  MrPlanningTemuan,',
      '  MrPlanningTemuanRekomendasi,',
      '  MrPlanningTindakLanjut,',
      '  MrPlanningTindakLanjutDocument,',
      '  MrReferenceItem,',
      '  PejabatPenandatangan,',
      '} = require("../../models");',
    ].join('\n'),
  },
  {
    label: 'B2 sisipkan helper getPenandatanganFromMasterData',
    old: [
      'const getReportOfficials = async ({ tahun, opd_id, nama_opd } = {}) => {',
    ].join('\n'),
    new: [
      'const getPenandatanganFromMasterData = async (tahun) => {',
      '  if (!tahun) return null;',
      '  const row = await PejabatPenandatangan.findOne({',
      '    where: { tahun: Number(tahun), role: "KEPALA_DINAS" },',
      '  });',
      '  if (!row) return null;',
      '  return { nama: row.nama || null, nip: row.nip || null, jabatan: row.jabatan || null };',
      '};',
      '',
      'const getReportOfficials = async ({ tahun, opd_id, nama_opd } = {}) => {',
    ].join('\n'),
  },
  {
    label: 'B3 panggil getPenandatanganFromMasterData di dalam fungsi',
    old: [
      'const getReportOfficials = async ({ tahun, opd_id, nama_opd } = {}) => {',
      '  if (!nama_opd) {',
    ].join('\n'),
    new: [
      'const getReportOfficials = async ({ tahun, opd_id, nama_opd } = {}) => {',
      '  const penandatanganMaster = await getPenandatanganFromMasterData(tahun);',
      '',
      '  if (!nama_opd) {',
    ].join('\n'),
  },
  {
    label: 'B4 branch !nama_opd pakai penandatanganMaster',
    old: [
      '    return {',
      '      pemilik_risiko: null,',
      '      koordinator_risiko: null,',
      '      penandatangan_laporan: null,',
      '      source: "opd_penanggung_jawab",',
      '      warning: "nama_opd belum tersedia untuk cakupan laporan ini.",',
      '    };',
      '  }',
    ].join('\n'),
    new: [
      '    return {',
      '      pemilik_risiko: null,',
      '      koordinator_risiko: null,',
      '      penandatangan_laporan: penandatanganMaster,',
      '      source: penandatanganMaster ? "pejabat_penandatangan" : "opd_penanggung_jawab",',
      '      warning: "nama_opd belum tersedia untuk cakupan laporan ini.",',
      '    };',
      '  }',
    ].join('\n'),
  },
  {
    label: 'B5 return akhir pakai penandatanganMaster',
    old: [
      '  return {',
      '    pemilik_risiko: kepalaDinas,',
      '    koordinator_risiko: sekretaris,',
      '    penandatangan_laporan: kepalaDinas,',
      '    source: "opd_penanggung_jawab",',
      '    total_officials_found: rows.length,',
      '  };',
      '};',
    ].join('\n'),
    new: [
      '  return {',
      '    pemilik_risiko: kepalaDinas,',
      '    koordinator_risiko: sekretaris,',
      '    penandatangan_laporan: penandatanganMaster || kepalaDinas,',
      '    source: penandatanganMaster ? "pejabat_penandatangan" : "opd_penanggung_jawab",',
      '    total_officials_found: rows.length,',
      '  };',
      '};',
    ].join('\n'),
  },
]);

// ===================== FILE C: mrPlanningReportExportWordService.js =====================
console.log('--- mrPlanningReportExportWordService.js ---');
patchFile('backend/services/mr/mrPlanningReportExportWordService.js', [
  {
    label: 'C1 hapus fungsi getDocumentStatusNote (sudah tidak dipakai)',
    old: [
      "const getDocumentStatusNote = (report = {}) => {",
      "  const approvalGate = getReportApprovalGate(report);",
      "",
      "  if (approvalGate.ready_to_sign) {",
      "    return 'Seluruh data risiko dalam laporan ini telah melalui proses persetujuan dan dokumen FINAL — SIAP DITANDATANGANI untuk diajukan kepada Kepala Dinas.';",
      "  }",
      "",
      "  return (",
      "    'Dokumen ini masih berstatus DRAFT — BELUM SIAP DITANDATANGANI karena masih terdapat risiko yang belum melalui proses persetujuan. ' +",
      "    'Pemilik Risiko dan Koordinator Manajemen Risiko perlu menyelesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan sebagai naskah final.'",
      "  );",
      "};",
      "",
      "const getSigningOfficialName = (context = {}) =>",
    ].join('\n'),
    new: [
      "const getSigningOfficialName = (context = {}) =>",
    ].join('\n'),
  },
  {
    label: 'C2 ganti blok Penutup: hapus catatan status + tabel, tanda tangan center',
    old: [
      "  const approvalGate = getReportApprovalGate(report);",
      "",
      "  const closingChildren = [",
      "    makeHeading1('11. Penutup'),",
      "    makeParagraph(",
      "      'Laporan Manajemen Risiko Terpadu ini disusun sebagai dokumentasi hasil pengelolaan risiko, evaluasi, dan tindak lanjut pengendalian risiko pada perangkat daerah. Laporan ini menjadi bahan bagi Pemilik Risiko dan pejabat terkait dalam memperkuat pengendalian, meningkatkan akuntabilitas, serta mendukung pencapaian tujuan perangkat daerah.',",
      "    ),",
      "    makeParagraph(getDocumentStatusNote(report), {",
      "      bold: true,",
      "    }),",
      "    makeKeyValueTable([",
      "      ['Status Dokumen', safeText(approvalGate.document_status_label)],",
      "      ['Risiko Disetujui', safeText(approvalGate.approved_count)],",
      "      ['Risiko Belum Disetujui', safeText(approvalGate.not_approved_count)],",
      "      ['Catatan Persetujuan', cleanApprovalNoteForWord(approvalGate.closing_note)],",
      "    ]),",
      "",
      "    makeSpacer(),",
      "",
      "    makeParagraph(`Sofifi, ${formatIndonesianReportDate()}`, {",
      "      alignment: AlignmentType.RIGHT,",
      "    }),",
      "    makeParagraph('KEPALA DINAS PANGAN', {",
      "      alignment: AlignmentType.RIGHT,",
      "      bold: true,",
      "    }),",
      "    makeParagraph('PROVINSI MALUKU UTARA', {",
      "      alignment: AlignmentType.RIGHT,",
      "      bold: true,",
      "    }),",
      "    makeParagraph(`\\n\\n\\n${getSigningOfficialName(context)}`, {",
      "      alignment: AlignmentType.RIGHT,",
      "      bold: true,",
      "    }),",
      "    makeParagraph(`NIP. ${getSigningOfficialNip(context)}`, {",
      "      alignment: AlignmentType.RIGHT,",
      "    }),",
      "  ];",
    ].join('\n'),
    new: [
      "  const closingChildren = [",
      "    makeHeading1('11. Penutup'),",
      "    makeParagraph(",
      "      'Laporan Manajemen Risiko Terpadu ini disusun sebagai dokumentasi hasil pengelolaan risiko, evaluasi, dan tindak lanjut pengendalian risiko pada perangkat daerah. Laporan ini menjadi bahan bagi Pemilik Risiko dan pejabat terkait dalam memperkuat pengendalian, meningkatkan akuntabilitas, serta mendukung pencapaian tujuan perangkat daerah.',",
      "    ),",
      "",
      "    makeSpacer(),",
      "",
      "    makeParagraph(`Sofifi, ${formatIndonesianReportDate()}`, {",
      "      alignment: AlignmentType.CENTER,",
      "    }),",
      "    makeParagraph(`${getSigningOfficialTitle(context)},`, {",
      "      alignment: AlignmentType.CENTER,",
      "    }),",
      "    makeParagraph(`\\n\\n\\n${getSigningOfficialName(context)}`, {",
      "      alignment: AlignmentType.CENTER,",
      "      bold: true,",
      "    }),",
      "    makeParagraph(`NIP. ${getSigningOfficialNip(context)}`, {",
      "      alignment: AlignmentType.CENTER,",
      "    }),",
      "  ];",
    ].join('\n'),
  },
]);

console.log('SEMUA PATCH BERHASIL DITERAPKAN.');
