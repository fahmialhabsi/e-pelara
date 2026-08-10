'use strict';

/**
 * Saran internal (BUKAN otoritas skor/evidence) untuk 5 field pendukung
 * B.1.1-B.1.4: Sumber Data, Kategori Hambatan, Hambatan, Kategori Tindak
 * Lanjut, Tindak Lanjut (mandat "Internal Field Autofill B.1.1-B.1.4").
 *
 * Prinsip anti-halusinasi: setiap saran hambatan/tindak lanjut HARUS
 * diturunkan dari fakta terobservasi (register entity, evidence gate,
 * skor_detail yang SUDAH tersimpan) — tidak pernah menebak masalah
 * (anggaran/SDM/koordinasi) tanpa sinyal eksplisit. Bila tidak ada sinyal
 * yang cukup, kembalikan null (lihat fungsi derive* di bawah).
 *
 * READ-ONLY sepenuhnya: tidak pernah menulis ke DB, tidak memanggil rule
 * engine (`prosnpRuleEngineService`) dengan cara yang menghitung ulang/
 * menyimpan skor — hanya membaca `skor_detail` yang sudah ada sebagai fakta
 * (mandat §39/§40), plus fungsi baca murni dari `prosnpEvidenceGateService`.
 */

const db = require('../../models');
const { ProsnError, listKategoriReferensi } = require('./prosnpWorkflowService');
const evidenceGate = require('./prosnpEvidenceGateService');

async function getPengisianKonteks(pengisianId, tenantId) {
  const pengisian = await db.ProsnPengisian.findOne({
    where: { id: pengisianId, tenant_id: tenantId },
    include: [{
      model: db.ProsnIndikator, as: 'indikator',
      include: [{ model: db.ProsnPeriode, as: 'periode' }, { model: db.ProsnMasterIndikator, as: 'masterIndikator' }],
    }],
  });
  if (!pengisian) throw new ProsnError('Pengisian tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  return pengisian;
}

async function collectFacts(pengisian, tenantId) {
  const indikator = pengisian.indikator;
  const periode = indikator.periode;
  const tipe_form = indikator.tipe_form;
  const base = { tipe_form, tahun: periode.tahun, semester: periode.semester, skorDetail: pengisian.skor_detail || null };

  if (tipe_form === 'penugasan_kdh') {
    const suratList = await db.ProsnSuratPenugasan.findAll({ where: { pengisian_id: pengisian.id, tenant_id: tenantId }, raw: true });
    let valid = 0;
    for (const s of suratList) { if (await evidenceGate.suratMemilikiBuktiValid(s.id, tenantId)) valid += 1; }
    return { ...base, surat: { total: suratList.length, valid } };
  }
  if (tipe_form === 'koordinasi_forkopimda') {
    const rapatList = await db.ProsnRapatForkopimda.findAll({ where: { pengisian_id: pengisian.id, tenant_id: tenantId }, raw: true });
    let lengkap = 0;
    for (const r of rapatList) { const e = await evidenceGate.rapatMemilikiBuktiLengkap(r.id, tenantId); if (e.lengkap) lengkap += 1; }
    return { ...base, rapat: { total: rapatList.length, lengkap } };
  }
  if (tipe_form === 'cadangan_pangan_beras') {
    const target = await db.ProsnCadanganTarget.findOne({ where: { tenant_id: tenantId, tahun_target: String(periode.tahun), status_aktif: true }, raw: true });
    const transaksiTotal = await db.ProsnStokTransaksi.count({ where: { pengisian_id: pengisian.id, tenant_id: tenantId } });
    const mappingTotal = indikator.master_indikator_id
      ? await db.ProsnNomenklaturMapping.count({ where: { master_indikator_id: indikator.master_indikator_id } })
      : 0;
    return { ...base, target: { ada: Boolean(target) }, transaksi: { total: transaksiTotal }, mapping: { ada: mappingTotal > 0 } };
  }
  if (tipe_form === 'inovasi_dan_perkada') {
    const inovasiList = await db.ProsnInovasi.findAll({ where: { pengisian_id: pengisian.id, tenant_id: tenantId }, raw: true });
    let adaPerkada = false;
    let adaBuktiImplementasi = false;
    for (const i of inovasiList) {
      const status = await evidenceGate.inovasiEvidenceStatus(i.id, tenantId);
      if (status.adaDokumenPerkada) adaPerkada = true;
      if (status.adaBuktiImplementasi) adaBuktiImplementasi = true;
    }
    const adaHasilTerukur = inovasiList.some((i) => Boolean(i.hasil_kuantitatif || i.hasil_kualitatif));
    return { ...base, inovasi: { total: inovasiList.length, adaPerkada, adaBuktiImplementasi, adaHasilTerukur } };
  }
  throw new ProsnError(`Internal autofill belum mendukung tipe_form "${tipe_form}".`, 409, 'PROSNP_INTERNAL_AUTOFILL_UNSUPPORTED');
}

const KOSONG = { hambatan: null, hambatanKode: null, hambatanConfidence: 'NONE', hambatanReasons: [], tindakLanjut: null, tindakLanjutKode: null, tindakLanjutConfidence: 'NONE', tindakLanjutReasons: [] };

function deriveB11(facts) {
  const { tahun, semester, surat, skorDetail } = facts;
  const sumberReasons = ['register_surat_penugasan.total', 'register_surat_penugasan.valid'];
  const sumberDataText = surat.total > 0
    ? `Register Surat Penugasan Kepala Daerah dan bukti dokumen terverifikasi; mencakup ${surat.total} surat pada Semester ${semester} Tahun ${tahun} (${surat.valid} surat dengan bukti valid).`
    : `Register Surat Penugasan Kepala Daerah pada Semester ${semester} Tahun ${tahun} (belum ada surat tercatat).`;
  const sumberDataConfidence = surat.valid > 0 ? 'HIGH' : (surat.total > 0 ? 'MEDIUM' : 'LOW');

  let hasil = { ...KOSONG };
  if (surat.total === 0) {
    hasil = {
      hambatan: 'Belum ada surat penugasan Kepala Daerah kepada OPD yang tercatat pada register untuk periode ini.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['register_surat_penugasan.total=0'],
      tindakLanjut: 'Menyusun dan menerbitkan surat penugasan Kepala Daerah kepada OPD sesuai kebutuhan cakupan tugas (pengadaan/pengelolaan/penyaluran) pada periode berjalan.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['register_surat_penugasan.total=0'],
    };
  } else if (surat.valid === 0) {
    hasil = {
      hambatan: 'Surat penugasan sudah tercatat namun belum ada bukti dokumen SURAT_PENUGASAN berstatus Valid yang terikat langsung ke surat tersebut.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['register_surat_penugasan.valid=0'],
      tindakLanjut: 'Melengkapi bukti dokumen SURAT_PENUGASAN yang sah dan mengikatnya langsung ke surat penugasan terkait.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['register_surat_penugasan.valid=0'],
    };
  } else if (skorDetail && Array.isArray(skorDetail.bulan_kosong) && skorDetail.bulan_kosong.length > 0) {
    // Bulan tanpa surat sah adalah fakta (gap), tapi sistem tidak tahu apakah
    // akar penyebabnya kualitas data, administrasi, frekuensi penerbitan, atau
    // faktor operasional lain — default ke LAINNYA agar tidak overclaim
    // (mandat corrective pass "B.1.1 Internal Autofill Category Mapping").
    hasil = {
      hambatan: 'Frekuensi penerbitan surat penugasan belum memenuhi cakupan bulanan periode penilaian; masih terdapat bulan tanpa surat penugasan yang sah.',
      hambatanKode: 'LAINNYA', hambatanConfidence: 'HIGH', hambatanReasons: ['skor_detail.bulan_kosong', 'skor_detail.interval_bulan_terpanjang'],
      tindakLanjut: 'Menelusuri dan melengkapi dokumen surat penugasan yang sah untuk bulan yang belum terdokumentasi, serta memastikan penerbitan/pengarsipan surat berikutnya dilakukan secara berkala sesuai kebutuhan periode.',
      tindakLanjutKode: 'LAINNYA', tindakLanjutConfidence: 'HIGH', tindakLanjutReasons: ['skor_detail.bulan_kosong'],
    };
  }
  return { sumberDataText, sumberDataConfidence, sumberReasons, ...hasil };
}

function deriveB12(facts) {
  const { tahun, semester, rapat, skorDetail } = facts;
  const sumberReasons = ['register_rapat_forkopimda.total', 'register_rapat_forkopimda.lengkap'];
  const sumberDataText = rapat.total > 0
    ? `Register Rapat Koordinasi Forkopimda beserta dokumen undangan, daftar hadir, dan notulen yang terverifikasi pada Semester ${semester} Tahun ${tahun} (${rapat.total} rapat tercatat, ${rapat.lengkap} dengan bukti lengkap).`
    : `Register Rapat Koordinasi Forkopimda pada Semester ${semester} Tahun ${tahun} (belum ada rapat tercatat).`;
  const sumberDataConfidence = rapat.lengkap > 0 ? 'HIGH' : (rapat.total > 0 ? 'MEDIUM' : 'LOW');

  let hasil = { ...KOSONG };
  if (rapat.total === 0) {
    hasil = {
      hambatan: 'Belum ada rapat koordinasi Forkopimda yang tercatat pada register untuk periode ini.',
      hambatanKode: 'KOORDINASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['register_rapat_forkopimda.total=0'],
      tindakLanjut: 'Menjadwalkan dan melaksanakan rapat koordinasi Forkopimda sesuai kebutuhan periode, mencakup topik pengadaan/pengelolaan/penyaluran.',
      tindakLanjutKode: 'KOORDINASI_STAKEHOLDER', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['register_rapat_forkopimda.total=0'],
    };
  } else if (rapat.lengkap === 0) {
    hasil = {
      hambatan: 'Rapat koordinasi sudah tercatat namun belum ada yang memiliki bukti undangan, daftar hadir, dan notulen lengkap yang terikat langsung ke rapat tersebut.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['register_rapat_forkopimda.lengkap=0'],
      tindakLanjut: 'Melengkapi dokumen undangan, daftar hadir, dan notulen untuk rapat koordinasi yang telah dilaksanakan.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['register_rapat_forkopimda.lengkap=0'],
    };
  } else if (skorDetail && Array.isArray(skorDetail.bulan_kosong) && skorDetail.bulan_kosong.length > 0) {
    hasil = {
      hambatan: 'Frekuensi rapat koordinasi Forkopimda yang sah belum memenuhi cakupan bulanan periode penilaian; masih terdapat bulan tanpa rapat sah.',
      hambatanKode: 'KOORDINASI', hambatanConfidence: 'HIGH', hambatanReasons: ['skor_detail.bulan_kosong'],
      tindakLanjut: 'Menjadwalkan rapat koordinasi Forkopimda tambahan untuk bulan yang belum terpenuhi pada periode penilaian.',
      tindakLanjutKode: 'KOORDINASI_STAKEHOLDER', tindakLanjutConfidence: 'HIGH', tindakLanjutReasons: ['skor_detail.bulan_kosong'],
    };
  }
  return { sumberDataText, sumberDataConfidence, sumberReasons, ...hasil };
}

function deriveB13(facts) {
  const { tahun, target, transaksi, mapping } = facts;
  const sumberReasons = ['cadangan_target.ada', 'stok_transaksi.total', 'nomenklatur_mapping.ada'];
  const sources = [];
  if (target.ada) sources.push('Keputusan Kepala Daerah mengenai target Cadangan Pangan Beras');
  if (transaksi.total > 0) sources.push('register transaksi/mutasi stok');
  if (mapping.ada) sources.push('mapping sumber DPA/Penatausahaan');
  const sumberDataText = sources.length
    ? `${sources.join(', ')} pada Tahun ${tahun}.`
    : `Belum ada sumber data (target/transaksi/mapping) yang teridentifikasi pada Tahun ${tahun}.`;
  const sumberDataConfidence = target.ada && transaksi.total > 0 ? 'HIGH' : (sources.length ? 'MEDIUM' : 'LOW');

  let hasil = { ...KOSONG };
  if (!target.ada) {
    hasil = {
      hambatan: 'Target Cadangan Pangan Beras belum tersedia/ditetapkan pada sistem.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['cadangan_target.ada=false'],
      tindakLanjut: 'Melengkapi dokumen penetapan target Cadangan Pangan Beras.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['cadangan_target.ada=false'],
    };
  } else if (transaksi.total === 0) {
    hasil = {
      hambatan: 'Belum terdapat transaksi/mutasi stok yang dapat digunakan untuk menghitung realisasi Cadangan Pangan Beras.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['stok_transaksi.total=0'],
      tindakLanjut: 'Melengkapi pencatatan transaksi/mutasi stok berdasarkan bukti yang sah.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['stok_transaksi.total=0'],
    };
  } else if (!mapping.ada) {
    hasil = {
      hambatan: 'Mapping sumber DPA/Penatausahaan untuk indikator ini belum tersedia/terhubung.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'LOW', hambatanReasons: ['nomenklatur_mapping.ada=false'],
      tindakLanjut: 'Melakukan pemetaan sumber data (DPA/Penatausahaan) yang belum terhubung.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'LOW', tindakLanjutReasons: ['nomenklatur_mapping.ada=false'],
    };
  }
  return { sumberDataText, sumberDataConfidence, sumberReasons, ...hasil };
}

function deriveB14(facts) {
  const { tahun, inovasi } = facts;
  const sumberReasons = ['register_inovasi.total', 'inovasi.ada_perkada', 'inovasi.ada_bukti_implementasi'];
  const sources = [];
  if (inovasi.total > 0) sources.push('Register Inovasi');
  if (inovasi.adaPerkada) sources.push('Peraturan Kepala Daerah (Perkada)');
  if (inovasi.adaBuktiImplementasi) sources.push('bukti implementasi terverifikasi');
  const sumberDataText = sources.length
    ? `${sources.join(', ')} pada Tahun ${tahun}.`
    : `Belum ada sumber data (register inovasi) yang teridentifikasi pada Tahun ${tahun}.`;
  const sumberDataConfidence = inovasi.adaPerkada && inovasi.adaBuktiImplementasi ? 'HIGH' : (inovasi.total > 0 ? 'MEDIUM' : 'LOW');

  let hasil = { ...KOSONG };
  if (inovasi.total === 0) {
    hasil = {
      hambatan: 'Belum ada inovasi pengadaan/pengelolaan gabah-beras dan penyaluran CBP yang dicatat pada register.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['register_inovasi.total=0'],
      tindakLanjut: 'Mencatat inisiatif/inovasi yang telah atau sedang dilaksanakan pada register inovasi, sesuai relevansi pengadaan/pengelolaan/penyaluran.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['register_inovasi.total=0'],
    };
  } else if (!inovasi.adaPerkada) {
    hasil = {
      hambatan: 'Inovasi sudah tercatat namun dokumen Peraturan Kepala Daerah (Perkada) terkait belum tersedia/terverifikasi.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['inovasi.ada_perkada=false'],
      tindakLanjut: 'Melengkapi dokumen Peraturan Kepala Daerah (Perkada) yang mendasari inovasi dan mengikatnya sebagai bukti pada record inovasi terkait.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['inovasi.ada_perkada=false'],
    };
  } else if (!inovasi.adaBuktiImplementasi) {
    hasil = {
      hambatan: 'Dokumen Perkada sudah tersedia namun bukti implementasi inovasi belum tersedia/terverifikasi.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'MEDIUM', hambatanReasons: ['inovasi.ada_bukti_implementasi=false'],
      tindakLanjut: 'Melengkapi bukti implementasi inovasi yang sah dan mengikatnya langsung ke record inovasi terkait.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'MEDIUM', tindakLanjutReasons: ['inovasi.ada_bukti_implementasi=false'],
    };
  } else if (!inovasi.adaHasilTerukur) {
    hasil = {
      hambatan: 'Hasil kuantitatif/kualitatif inovasi belum dilengkapi pada register.',
      hambatanKode: 'DATA_INFORMASI', hambatanConfidence: 'LOW', hambatanReasons: ['inovasi.ada_hasil_terukur=false'],
      tindakLanjut: 'Melengkapi hasil kuantitatif/kualitatif inovasi pada register.',
      tindakLanjutKode: 'PERBAIKAN_DATA', tindakLanjutConfidence: 'LOW', tindakLanjutReasons: ['inovasi.ada_hasil_terukur=false'],
    };
  }
  return { sumberDataText, sumberDataConfidence, sumberReasons, ...hasil };
}

const DERIVE_BY_TIPE_FORM = {
  penugasan_kdh: deriveB11,
  koordinasi_forkopimda: deriveB12,
  cadangan_pangan_beras: deriveB13,
  inovasi_dan_perkada: deriveB14,
};

function resolveKategori(list, kode) {
  if (!kode) return { id: null, label: null };
  const found = list.find((k) => k.kode === kode);
  return found ? { id: found.id, label: found.label } : { id: null, label: null };
}

/** Rakit kontrak saran final dari draft derive* + resolusi kategori by kode (bukan id hardcode). */
function assembleSuggestion(draft, kategoriHambatanList, kategoriTindakLanjutList) {
  const kh = resolveKategori(kategoriHambatanList, draft.hambatanKode);
  const ktl = resolveKategori(kategoriTindakLanjutList, draft.tindakLanjutKode);
  return {
    sumber_data: draft.sumberDataText || null,
    kategori_hambatan_id: kh.id,
    kategori_hambatan_label: kh.label,
    hambatan: draft.hambatan || null,
    kategori_tindak_lanjut_id: ktl.id,
    kategori_tindak_lanjut_label: ktl.label,
    tindak_lanjut: draft.tindakLanjut || null,
    reasons: {
      sumber_data: draft.sumberReasons || [],
      hambatan: draft.hambatanReasons || [],
      tindak_lanjut: draft.tindakLanjutReasons || [],
    },
    confidence: {
      sumber_data: draft.sumberDataConfidence || 'NONE',
      hambatan: draft.hambatanConfidence || 'NONE',
      tindak_lanjut: draft.tindakLanjutConfidence || 'NONE',
    },
    generated_at: new Date().toISOString(),
    authority: 'INTERNAL_SUGGESTION',
  };
}

/** Endpoint entry point — READ-ONLY, tidak pernah menulis DB (mandat §3/§36). */
async function previewInternalAutofill(pengisianId, tenantId) {
  const pengisian = await getPengisianKonteks(pengisianId, tenantId);
  const tipe_form = pengisian.indikator.tipe_form;
  const deriveFn = DERIVE_BY_TIPE_FORM[tipe_form];
  if (!deriveFn) throw new ProsnError(`Internal autofill belum mendukung tipe_form "${tipe_form}".`, 409, 'PROSNP_INTERNAL_AUTOFILL_UNSUPPORTED');

  const facts = await collectFacts(pengisian, tenantId);
  const draft = deriveFn(facts);
  const [kategoriHambatan, kategoriTindakLanjut] = await Promise.all([
    listKategoriReferensi('hambatan'),
    listKategoriReferensi('tindak_lanjut'),
  ]);
  return assembleSuggestion(draft, kategoriHambatan, kategoriTindakLanjut);
}

module.exports = {
  previewInternalAutofill,
  collectFacts,
  deriveB11, deriveB12, deriveB13, deriveB14,
  assembleSuggestion, resolveKategori,
};
