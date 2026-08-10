'use strict';

/**
 * Evidence Category Gate (mandat §6) — pengganti `minimum_bukti >= N` generik.
 * Setiap fungsi di sini mengecek bukti yang TERIKAT LANGSUNG (entity_type +
 * entity_id) ke satu record spesifik (surat/rapat/transaksi/inovasi/target),
 * BUKAN "ada bukti kategori X di mana pun pada indikator ini". Ini yang
 * mencegah "satu undangan melegitimasi semua rapat" (mandat §6.2).
 */

const db = require('../../models');

async function getValidBuktiUntukEntity(entityType, entityId, tenantId, transaction) {
  const links = await db.ProsnBuktiIndikator.findAll({
    where: { entity_type: entityType, entity_id: entityId, tenant_id: tenantId },
    include: [{
      model: db.ProsnBuktiDukung, as: 'buktiDukung',
      where: { status: ['aktif', 'perlu_perbaikan'], status_verifikasi: 'valid' },
      required: true,
    }],
    transaction,
  });
  return links.map((l) => l.buktiDukung);
}

async function kategoriValidSetUntukEntity(entityType, entityId, tenantId, transaction) {
  const bukti = await getValidBuktiUntukEntity(entityType, entityId, tenantId, transaction);
  return new Set(bukti.map((b) => b.kategori).filter(Boolean));
}

/** B.1.1 — surat wajib SURAT_PENUGASAN valid terikat langsung ke surat itu. */
async function suratMemilikiBuktiValid(suratId, tenantId, transaction) {
  const set = await kategoriValidSetUntukEntity('SURAT_PENUGASAN', suratId, tenantId, transaction);
  return set.has('surat_penugasan');
}

/** B.1.2 — rapat wajib UNDANGAN + DAFTAR_HADIR + NOTULEN, ketiganya terikat ke rapat itu sendiri. */
async function rapatMemilikiBuktiLengkap(rapatId, tenantId, transaction) {
  const set = await kategoriValidSetUntukEntity('RAPAT_FORKOPIMDA', rapatId, tenantId, transaction);
  const kurang = ['undangan', 'daftar_hadir', 'notulen'].filter((k) => !set.has(k));
  return { lengkap: kurang.length === 0, kurang };
}

/**
 * B.1.3 — target aktif wajib KEPUTUSAN_KDH valid.
 *
 * Corrective "B.1.3 DPA/DPPA Authoritative Target Source" (§12 mandat):
 * target yang backend-authoritative bersumber dari DPA/DPPA terstruktur
 * (source_trace berisi jejak resolusi `sistem_dpa_operasional` —
 * lihat prosnpCadanganPanganService.resolveTargetSource) TIDAK memerlukan
 * dokumen KEPUTUSAN_KDH terpisah sbg bukti, karena provenance-nya sudah
 * tervalidasi terhadap tabel DPA nyata saat target dibuat/diperbarui.
 * Target dari Keputusan Gubernur (termasuk jalur dropdown pagu/realisasi
 * existing yang TIDAK memakai mode ini) tetap mewajibkan bukti seperti
 * semula — perubahan ini source-specific, hanya untuk CADANGAN_TARGET.
 *
 * Corrective "B.1.3 RKA Authoritative Target Fallback" (§14 mandat):
 * target yang bersumber dari RKA aktif+APPROVED (source_trace berisi
 * jejak `sistem_rka_operasional`) SAMA-SAMA diterima tanpa dokumen
 * KEPUTUSAN_KDH terpisah — provenance-nya sudah tervalidasi terhadap
 * tabel `rka` nyata (eligibility ketat: is_active_version=true DAN
 * approval_status='APPROVED') saat target dibuat. Target ini TIDAK
 * memiliki `source_dpa_id` (sengaja NULL, bukan difabrikasi), sehingga
 * dicek terpisah dari cabang DPA.
 */
async function targetMemilikiKeputusanValid(targetId, tenantId, transaction) {
  const target = await db.ProsnCadanganTarget.findOne({ where: { id: targetId, tenant_id: tenantId }, transaction });
  const trace = Array.isArray(target?.source_trace) ? target.source_trace : [];
  const dariDpaOperasional = target?.source_type === 'sistem' && Boolean(target?.source_dpa_id) && trace.some((e) => e && e.jenis === 'sistem_dpa_operasional');
  const dariRkaOperasional = target?.source_type === 'sistem' && trace.some((e) => e && e.jenis === 'sistem_rka_operasional');
  if (dariDpaOperasional || dariRkaOperasional) return true;
  const set = await kategoriValidSetUntukEntity('CADANGAN_TARGET', targetId, tenantId, transaction);
  return set.has('keputusan_kdh');
}

/** B.1.3 — tiap jenis transaksi wajib kategori bukti tertentu, terikat ke transaksi itu sendiri. */
const KATEGORI_WAJIB_PER_JENIS_TRANSAKSI = {
  pengadaan: ['dokumen_pengadaan', 'bukti_penerimaan'],
  penerimaan_lain_sah: ['dokumen_pengadaan', 'bukti_penerimaan'],
  penyaluran: ['dokumen_penyaluran'],
  susut_rusak: ['berita_acara', 'dokumen_penetapan'],
  koreksi_masuk: ['dokumen_koreksi'],
  koreksi_keluar: ['dokumen_koreksi'],
  saldo_awal: [], // saldo awal tahun disahkan lewat KEPUTUSAN_KDH target, bukan per-baris; carry-forward otomatis juga dikecualikan
};
async function transaksiMemilikiBuktiValid(transaksi, tenantId, transaction) {
  if (transaksi.is_carry_forward) return { valid: true, alasan: null }; // sistem-generated dari saldo akhir semester sebelumnya, sudah terverifikasi di periode asalnya
  const wajib = KATEGORI_WAJIB_PER_JENIS_TRANSAKSI[transaksi.jenis_transaksi] || [];
  if (wajib.length === 0) return { valid: true, alasan: null };
  const set = await kategoriValidSetUntukEntity('STOK_TRANSAKSI', transaksi.id, tenantId, transaction);
  const cocok = wajib.some((k) => set.has(k));
  return { valid: cocok, alasan: cocok ? null : `Transaksi ${transaksi.jenis_transaksi} tanggal ${transaksi.tanggal} tidak dihitung karena belum ada bukti kategori ${wajib.join(' atau ')} yang valid & terikat langsung.` };
}

/** B.1.4 — skor 1,00 wajib BUKTI_IMPLEMENTASI; skor 2,00 tambah PERKADA valid terikat ke inovasi yang sama. */
async function inovasiEvidenceStatus(inovasiId, tenantId, transaction) {
  const set = await kategoriValidSetUntukEntity('INOVASI', inovasiId, tenantId, transaction);
  return { adaBuktiImplementasi: set.has('bukti_implementasi'), adaDokumenPerkada: set.has('perkada') };
}

/**
 * Generalisasi Indicator Foundation (spek 34 §5) — bukti yang terikat generik
 * ke PENGISIAN (bukan ke satu record register spesifik). Dipakai indikator
 * kuantitatif (MBG 2.2 checklist sarpras, MBG 2.4/2.5/2.6 capaian persentase)
 * yang buktinya berupa SATU dokumen mencakup keseluruhan (mis. inventaris
 * sarpras, dokumen penetapan sasaran), bukan per-baris child record.
 */
async function kategoriValidSetUntukIndikator(indikatorId, tenantId, transaction) {
  const pengisian = await db.ProsnPengisian.findOne({ where: { indikator_id: indikatorId, tenant_id: tenantId }, attributes: ['id'], transaction });
  if (!pengisian) return new Set();
  // PENTING: bukti bertipe PENGISIAN disimpan dgn entity_id=NULL (lihat createBukti),
  // BUKAN entity_id=pengisian.id — filter yg benar-benar men-scope ke pengisian
  // spesifik ini adalah kolom pengisian_id sendiri, bukan entity_id (yg selalu
  // NULL & karenanya TIDAK boleh dipakai sbg pembeda antar-pengisian, kalau
  // tidak query akan mencampur bukti PENGISIAN milik indikator lain).
  const links = await db.ProsnBuktiIndikator.findAll({
    where: { entity_type: 'PENGISIAN', pengisian_id: pengisian.id, tenant_id: tenantId },
    include: [{
      model: db.ProsnBuktiDukung, as: 'buktiDukung',
      where: { status: ['aktif', 'perlu_perbaikan'], status_verifikasi: 'valid' },
      required: true,
    }],
    transaction,
  });
  return new Set(links.map((l) => l.buktiDukung.kategori).filter(Boolean));
}

/** MBG 2.1 — Satgas wajib evidence terikat langsung ke baris satgas_mbg itu sendiri. */
async function kategoriValidSetUntukSatgasMbg(satgasMbgId, tenantId, transaction) {
  return kategoriValidSetUntukEntity('SATGAS_MBG', satgasMbgId, tenantId, transaction);
}

/**
 * MBG 2.3 — tiap entri laporan berkala wajib evidence penyampaiannya SENDIRI,
 * terikat ke baris laporan_satgas_mbg spesifik (satu laporan bulan Januari
 * TIDAK boleh dipakai memvalidasi laporan bulan Februari — sama prinsip B.1.2).
 */
async function kategoriValidSetUntukLaporanSatgasMbg(laporanSatgasMbgId, tenantId, transaction) {
  return kategoriValidSetUntukEntity('LAPORAN_SATGAS_MBG', laporanSatgasMbgId, tenantId, transaction);
}

module.exports = {
  getValidBuktiUntukEntity,
  kategoriValidSetUntukEntity,
  suratMemilikiBuktiValid,
  rapatMemilikiBuktiLengkap,
  targetMemilikiKeputusanValid,
  transaksiMemilikiBuktiValid,
  inovasiEvidenceStatus,
  kategoriValidSetUntukIndikator,
  kategoriValidSetUntukSatgasMbg,
  kategoriValidSetUntukLaporanSatgasMbg,
  KATEGORI_WAJIB_PER_JENIS_TRANSAKSI,
};
