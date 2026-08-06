'use strict';

/**
 * Generalisasi pola "recall" yang sudah ada di
 * `services/permendagri14/renjaRecallService.js` (`tandaiPerluRecall`) supaya
 * dipakai modul lain: RPJMD, Renstra, RKPD, RKA, DPA, LK Dispang, LAKIP.
 *
 * Filosofi (sama seperti versi Renja): fungsi di sini HANYA menandai
 * `needs_recall=true` pada baris turunan — tidak pernah menimpa nilai baris
 * itu sendiri. Penarikan ulang data yang sesungguhnya tetap aksi terpisah
 * (endpoint recall per modul, lihat controller masing-masing), supaya
 * dokumen yang sudah disetujui (`approval_status`/`status` final) tidak
 * pernah tertimpa diam-diam.
 */

/**
 * @param {import('sequelize').Model} Model - model Sequelize dengan kolom needs_recall/recall_reason
 * @param {object} whereScope - filter WAJIB diisi (mis. { rka_id }, { renstra_id, tahun }) — tolak kalau kosong
 * @param {{ reason?: string }} [opsi]
 * @returns {Promise<{ ditandai: number }>}
 */
async function flagNeedsRecall(Model, whereScope, { reason } = {}) {
  if (!Model || typeof Model.update !== 'function') {
    throw new Error('flagNeedsRecall membutuhkan model Sequelize yang valid.');
  }
  if (!whereScope || typeof whereScope !== 'object' || Object.keys(whereScope).length === 0) {
    throw new Error('flagNeedsRecall membutuhkan whereScope (cegah flag massal tak sengaja).');
  }

  const [jumlah] = await Model.update(
    {
      needs_recall: true,
      recall_reason: reason ? String(reason).slice(0, 255) : null,
    },
    { where: whereScope },
  );
  return { ditandai: jumlah };
}

/**
 * Bungkus flagNeedsRecall supaya kegagalan tidak pernah menggagalkan alur
 * penulisan data sumber — dipakai sebagai "fire-and-forget" tepat setelah
 * commit transaksi penulisan di controller/service sumber (pola sama seperti
 * `sdiDaftarDataSyncService.js` addHook afterUpdate).
 */
async function flagNeedsRecallAman(Model, whereScope, opsi = {}) {
  try {
    return await flagNeedsRecall(Model, whereScope, opsi);
  } catch (err) {
    console.error('[recallDataService] gagal menandai needs_recall:', err.message);
    return { ditandai: 0, error: err.message };
  }
}

/**
 * Tandai kelima snapshot laporan keuangan (LRA/LAK/LO/LPE/Neraca) untuk satu
 * tahun_anggaran sekaligus. Dipakai dari titik tulis BKU dan DPA — kelimanya
 * sumber datanya sama (BKU + DPA), jadi selalu di-flag bersamaan.
 */
async function flagLkSnapshotsPerluRecall(models, tahunAnggaran, reason) {
  const { LraSnapshot, LakSnapshot, LoSnapshot, LpeSnapshot, NeracaSnapshot } = models;
  const where = { tahun_anggaran: Number(tahunAnggaran) };
  const targets = [LraSnapshot, LakSnapshot, LoSnapshot, LpeSnapshot, NeracaSnapshot].filter(
    Boolean,
  );
  await Promise.all(targets.map((Model) => flagNeedsRecallAman(Model, where, { reason })));
}

/**
 * Registry deklaratif — peta lengkap "siapa memicu siapa" untuk fitur Recall
 * Data lintas modul. Ini dokumentasi hidup, bukan dieksekusi otomatis di
 * sini; setiap edge di-wire manual di titik controller/service sumbernya
 * (dicatat di kolom `wiredAt` supaya mudah diaudit mana yang sudah/belum).
 */
const RECALL_EDGES = [
  {
    from: 'MasterProgram/MasterKegiatan/MasterSubKegiatan',
    to: 'Kegiatan/SubKegiatan (RPJMD)',
    alasan: 'Master nomenklatur Kepmendagri berubah',
    wiredAt: null,
    catatan:
      'Master nomenklatur TIDAK punya endpoint create/update/delete (read-only via API, ' +
      'hanya diubah lewat script seperti seedMasterKepmendagriDataset2026.js) — panggil ' +
      'flagNeedsRecall langsung dari script sejenis itu bila perlu, bukan dari controller.',
  },
  {
    from: 'Kegiatan/SubKegiatan (RPJMD)',
    to: 'RenstraOPD (via RenstraKegiatan/RenstraSubkegiatan)',
    alasan: 'Data RPJMD berubah',
    wiredAt:
      'controllers/kegiatanController.js (update/destroy), controllers/subKegiatanController.js (update/delete)',
    catatan:
      'KOREKSI: kolom needs_recall awalnya salah dipasang di tabel `renstra` (model canonical ' +
      '`Renstra`, ternyata 0 baris terpakai) — sudah dipindah/ditambah ke `renstra_opd` (model ' +
      '`RenstraOPD`, tempat asli renstra_program/renstra_kegiatan/renstra_subkegiatan bergantung, ' +
      'lihat migrations/20260802140000-add-needs-recall-to-renstra-opd.js). Endpoint RECALL: ' +
      'POST /renstra-opd/:id/recall (services/renstraOpdRecallService.js) — TIDAK reuse ' +
      'autoCloneProgramService.js (itu Master->RPJMD, bukan RPJMD->Renstra; RenstraProgram/' +
      'Kegiatan/SubKegiatan dibuat manual satu-satu, tidak ada bulk-clone). Recall-nya mengulang ' +
      'pola sinkron kode/nama yang sudah ada di renstra_subkegiatanController.update() secara ' +
      'massal untuk semua baris RenstraOPD. Diuji fungsional end-to-end ke DB nyata: berhasil.',
  },
  {
    from: 'Kegiatan/SubKegiatan (RPJMD)',
    to: 'rkpd (legacy) / rkpd_item',
    alasan: 'Data RPJMD berubah',
    wiredAt: null,
    catatan:
      'Belum di-wire — rpjmdRkpdSyncService.runCommit() menulis ke tabel `rkpd` LEGACY, ' +
      'bukan `rkpd_dokumen` (tempat kolom needs_recall dipasang pass ini). RKPD punya 2 ' +
      'skema paralel (rkpd legacy vs rkpd_dokumen/rkpd_item) — perlu diselaraskan dulu ' +
      'sebelum wiring otomatis, jangan dipaksakan.',
  },
  {
    from: 'rkpd_item',
    to: 'renja_item',
    alasan: 'RKPD berubah',
    wiredAt: 'controllers/planningRkpdDokumenController.js (updateItem) — sebagian sudah otomatis via cascadeRkpdItemToLinkedRenja',
  },
  {
    from: 'RenstraProgram/RenstraKegiatan/RenstraSubkegiatan',
    to: 'renja_item (source_renstra_*_id)',
    alasan: 'Renstra berubah',
    wiredAt: 'controllers/renstra_subkegiatanController.js (update/delete)',
  },
  {
    from: 'rka / RkaRincianBelanja',
    to: 'Dpa',
    alasan: 'RKA berubah setelah DPA dibuat',
    wiredAt: 'controllers/rkaController.js (update)',
  },
  {
    from: 'BkuObjek / Penatausahaan',
    to: 'Dpa.realisasi',
    alasan: 'Ledger baru (BKU/Penatausahaan)',
    wiredAt: 'sudah auto-recalc langsung (recalcDpaRealisasi), tidak perlu flag terpisah',
  },
  {
    from: 'Dpa',
    to: 'lk_dispang',
    alasan: 'DPA berubah',
    wiredAt:
      'controllers/dpaController.js (update, dan generateFromRka mode recall=true) — ' +
      'recall aksinya: controllers/lkDispangController.js recalcRollup (POST, ?tahun=)',
  },
  {
    from: 'RenstraIndikator + RealisasiIndikatorRenstra',
    to: 'lakip',
    alasan: 'Realisasi indikator Renstra berubah',
    wiredAt:
      'controllers/realisasiIndikatorRenstraController.js (upsert) — recall aksinya: ' +
      'controllers/lakipController.js syncFromRenstra (POST /:tahun)',
  },
  {
    from: 'Bku (create/update/destroy) + Dpa (update)',
    to: 'lra_snapshot / lak_snapshot / lo_snapshot / lpe_snapshot / neraca_snapshot',
    alasan: 'Ledger BKU atau DPA berubah',
    wiredAt:
      'controllers/lkBkuController.js (create/update/destroy), controllers/dpaController.js ' +
      '(update) — lewat helper flagLkSnapshotsPerluRecall(). Recall aksinya: endpoint `generate` ' +
      'yang SUDAH ADA per laporan (lkLraController.js, lkLakController.js, lkLoController.js, ' +
      'lkLpeController.js, lkNeracaController.js) — masing-masing service generate* SUDAH menolak ' +
      'jalan kalau baris `dikunci=true` (lihat mis. lraService.js:64-71), jadi tidak perlu gating ' +
      'tambahan seperti recallRenja; hanya perlu clear needs_recall setelah generate sukses.',
  },
  {
    from: 'MrPlanningTemuan (createRevisionFromApprovedTemuan)',
    to: 'MrPlanningRisk (hasil eskalasi TLHP->Risk)',
    alasan: 'Temuan sumber eskalasi direvisi ulang',
    wiredAt:
      'services/mr/mrPlanningTemuanService.js (createRevisionFromApprovedTemuan, hanya jika ' +
      'temuan.risk_escalation_status === "risk_created"). Recall aksinya: endpoint baru ' +
      'POST /mr-planning-risk/:id/recall (controllers/mr_planningRiskController.js recallFromTemuan ' +
      '-> services/mr/mrPlanningRiskRecallService.js recallRiskDariTemuan) — HANYA menyegarkan 4 ' +
      'field analis (nama_risiko/uraian_risiko/penyebab_risiko/dampak_risiko), reuse ' +
      'mrPlanningRiskService.updateDraftRisk() yang SUDAH menolak jalan kalau Risk bukan status ' +
      '"draft" (ensureDraftEditable) — kalau Risk sudah verifikasi/approved/ditolak, hanya dilaporkan ' +
      'sebagai diff, tidak ditimpa. Field lain (nomor_temuan/ringkasan_temuan/rekomendasi/nilai_temuan) ' +
      'TIDAK disentuh — itu tersimpan di MrPlanningContextItem terpisah, di luar cakupan pass ini.',
  },
];

module.exports = {
  flagNeedsRecall,
  flagNeedsRecallAman,
  flagLkSnapshotsPerluRecall,
  RECALL_EDGES,
};
