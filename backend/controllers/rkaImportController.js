'use strict';

const fs = require('fs');
const { Rka, RkaRincianBelanja, PeriodeRpjmd, OpdPenanggungJawab } = require('../models');
const { parseSipdRkaPdf } = require('../services/rkaSipdPdfImportService');
const rkaCalculationHelper = require('../helpers/rkaCalculationHelper');
const rkaValidationService = require('../services/rkaValidationService');
const { saveRka } = require('../helpers/rkaSaveHelper');
const { cloneRkaToNextTahapan } = require('../services/rkaRevisiService');
const {
  writePlanningAudit,
  auditValuesFromRows,
} = require('../services/planningDocumentAuditService');

async function resolvePeriodeId(tahun) {
  const periode = await PeriodeRpjmd.findOne({
    where: {},
    order: [['id', 'DESC']],
  });
  const rows = await PeriodeRpjmd.findAll();
  const match = rows.find(
    (p) => Number(p.tahun_awal) <= Number(tahun) && Number(tahun) <= Number(p.tahun_akhir),
  );
  return (match || periode)?.id || null;
}

async function resolveOpdId(unitOrganisasiNama) {
  const nama = String(unitOrganisasiNama || '').trim();
  if (nama) {
    const exact = await OpdPenanggungJawab.findOne({ where: { nama_opd: nama } });
    if (exact) return exact.id;
  }
  const fallback = await OpdPenanggungJawab.findOne({ where: { nama_opd: 'Dinas Pangan' } });
  return fallback?.id || null;
}

// Bangun payload RKA siap-validasi dari hasil parse PDF + kode identitas terpisah,
// dipakai untuk baris APBD_INDUK (baseline) maupun baris tahapan target — bedanya
// hanya rincian_belanja mana yang dipakai (sisi "sebelum" utk baseline, "sesudah"
// utk tahapan target, keduanya sudah tersedia per item dari parser PDF).
function buildValidatedRka({ rkaFields, periode_id, opd_id, tahapan, rincianBelanja }) {
  const payload = { ...rkaFields, periode_id, opd_id, tahapan, rincian_belanja: rincianBelanja };
  const validatedValue = rkaValidationService.validatePayload(payload, false);
  const { rincian_belanja: rincianValid = [], ...rkaPayload } = validatedValue;
  const { processedRincian, totalAnggaranSubKegiatan } =
    rkaCalculationHelper.processRincianBelanja(rincianValid);
  rkaPayload.anggaran = totalAnggaranSubKegiatan;
  rkaPayload.rpjmd_id = null;
  rkaPayload.kode_unik_sub_kegiatan = `${rkaPayload.tahun}-${opd_id}-${rkaPayload.sub_kegiatan}-${tahapan}`;
  return { rkaPayload, processedRincian, totalAnggaranSubKegiatan };
}

// Proses SATU berkas PDF SIPD menjadi RKA tersimpan. Dipakai baik oleh endpoint
// import satu-file (`importPdf`) maupun endpoint import banyak-file sekaligus
// (`importPdfBatch`) — supaya logika (parsing, validasi, cegah duplikat, alur
// APBD_INDUK vs Pergeseran/Perubahan) hanya ada di SATU tempat, tidak digandakan.
// Melempar Error (dgn .status/.details) kalau gagal; pemanggil yang menentukan
// apakah kegagalan itu menghentikan seluruh request (single) atau cuma dicatat
// lalu lanjut ke berkas berikutnya (batch).
async function importOneFile(file, body, uid) {
  const buffer = fs.readFileSync(file.path);
  const parsed = await parseSipdRkaPdf(buffer);

  const periode_id = await resolvePeriodeId(parsed.tahun);
  if (!periode_id) {
    throw Object.assign(
      new Error(`Tidak ditemukan Periode RPJMD yang mencakup tahun ${parsed.tahun}.`),
      { status: 400 },
    );
  }

  const opd_id = await resolveOpdId(body?.unit_organisasi);
  if (!opd_id) {
    throw Object.assign(new Error('OPD Penanggung Jawab tidak ditemukan/terdaftar.'), {
      status: 400,
    });
  }

  const { rincian_belanja, _meta, ...rkaFields } = parsed;
  const targetTahapan = body?.tahapan || 'APBD_INDUK';

  // Cegah import ganda: kombinasi tahun+OPD+sub kegiatan+tahapan ini wajib unik
  // (sama dengan `kode_unik_sub_kegiatan` yg dibentuk buildValidatedRka di bawah).
  // Tanpa pengecekan ini, import ulang PDF yang sama akan diam-diam membuat RKA
  // duplikat (alur APBD_INDUK) atau menimpa rincian belanja yang sudah ada tanpa
  // pemberitahuan (alur Pergeseran/Perubahan). Pengecekan ini juga otomatis
  // menangkap duplikat ANTAR file dalam satu batch import (mis. berkas yang sama
  // tanpa sengaja terpilih dua kali), karena tiap file diproses berurutan.
  const kodeUnikCek = `${parsed.tahun}-${opd_id}-${parsed.sub_kegiatan}-${targetTahapan}`;
  const rkaSudahAda = await Rka.findOne({ where: { kode_unik_sub_kegiatan: kodeUnikCek } });
  if (rkaSudahAda) {
    throw Object.assign(
      new Error(
        `RKA ini sudah diimpor sebelumnya (Sub Kegiatan "${parsed.sub_kegiatan}", tahapan ${targetTahapan}, tahun ${parsed.tahun} — lihat RKA #${rkaSudahAda.id}). Mohon impor RKA yang belum ada, atau gunakan tombol Edit/Pergeseran/Perubahan pada RKA #${rkaSudahAda.id} untuk memperbarui datanya.`,
      ),
      { status: 409 },
    );
  }

  // ---------------------------------------------------------------------
  // Alur lama, TIDAK diubah: import untuk APBD_INDUK (input murni tahun berjalan)
  // ---------------------------------------------------------------------
  if (targetTahapan === 'APBD_INDUK') {
    const { rkaPayload, processedRincian, totalAnggaranSubKegiatan } = buildValidatedRka({
      rkaFields,
      periode_id,
      opd_id,
      tahapan: 'APBD_INDUK',
      rincianBelanja: rincian_belanja,
    });

    const created = await saveRka(
      {
        ...rkaPayload,
        version: 1,
        is_active_version: true,
        approval_status: 'DRAFT',
        change_reason_text: `Import otomatis dari PDF SIPD: ${file.originalname}`,
        change_reason_file: file.filename,
      },
      processedRincian,
    );

    const { old_value, new_value } = auditValuesFromRows(null, created);
    await writePlanningAudit({
      module_name: 'rka',
      table_name: 'rka',
      record_id: created.id,
      action_type: 'CREATE',
      old_value,
      new_value,
      change_reason_text: `Import otomatis dari PDF SIPD: ${file.originalname}`,
      change_reason_file: file.filename,
      changed_by: uid,
      version_before: null,
      version_after: 1,
    });

    return {
      status: 201,
      payload: {
        success: true,
        message: `RKA berhasil diimpor dari PDF (${parsed.sub_kegiatan}).`,
        id: created.id,
        data: {
          id: created.id,
          program: rkaPayload.program,
          kegiatan: rkaPayload.kegiatan,
          sub_kegiatan: rkaPayload.sub_kegiatan,
          anggaran: totalAnggaranSubKegiatan,
          jumlah_baris_rincian: _meta.jumlah_baris_rincian,
          selisih_vs_alokasi_pdf: _meta.selisih_vs_alokasi_pdf,
        },
      },
    };
  }

  // ---------------------------------------------------------------------
  // Alur baru: import merepresentasikan tahapan revisi (Pergeseran/Perubahan).
  // PDF SIPD utk tahapan ini selalu punya kolom Sebelum & Sesudah — Sebelum dipakai
  // utk memastikan baseline APBD_INDUK ada (bootstrap kalau belum), Sesudah dipakai
  // sbg isi tahapan target, di-clone lewat mesin pemicuRevisi yang sama dgn tombol
  // Pergeseran/Perubahan di Dashboard RKA — supaya hasil cetak nanti sama persis
  // dgn PDF SIPD sumber (Sebelum/Sesudah/Bertambah-Berkurang match).
  // ---------------------------------------------------------------------
  const kodeUnikInduk = `${parsed.tahun}-${opd_id}-${parsed.sub_kegiatan}-APBD_INDUK`;
  let indukRka = await Rka.findOne({ where: { kode_unik_sub_kegiatan: kodeUnikInduk } });

  if (!indukRka) {
    const rincianSebelum = rincian_belanja.map((r) => ({
      ...r,
      koefisien_array: r.koefisien_array_sebelum ?? r.koefisien_array,
      harga_satuan: r.harga_satuan_sebelum ?? r.harga_satuan,
    }));
    const { rkaPayload: indukPayload, processedRincian: indukRincian } = buildValidatedRka({
      rkaFields,
      periode_id,
      opd_id,
      tahapan: 'APBD_INDUK',
      rincianBelanja: rincianSebelum,
    });
    indukRka = await saveRka(
      {
        ...indukPayload,
        version: 1,
        is_active_version: true,
        approval_status: 'APPROVED',
        change_reason_text: `Bootstrap baseline APBD_INDUK dari PDF SIPD tahapan ${targetTahapan}: ${file.originalname}`,
        change_reason_file: file.filename,
      },
      indukRincian,
    );
  }

  const kodeUnikTarget = `${parsed.tahun}-${opd_id}-${parsed.sub_kegiatan}-${targetTahapan}`;
  let targetRka = await Rka.findOne({ where: { kode_unik_sub_kegiatan: kodeUnikTarget } });

  if (!targetRka) {
    const cloneResult = await cloneRkaToNextTahapan({
      rkaId: indukRka.id,
      tahapanTujuan: targetTahapan,
      userId: uid,
    });
    targetRka = await Rka.findByPk(cloneResult.data.new_rka_id);
  }

  // Timpa rincian_belanja tahapan target dengan nilai "Sesudah" dari PDF (bukan hasil
  // clone baseline yang tadi dipakai sbg placeholder) — sesuai kondisi sebenarnya di SIPD.
  const { rkaPayload: targetPayload, processedRincian: targetRincian, totalAnggaranSubKegiatan } =
    buildValidatedRka({
      rkaFields,
      periode_id,
      opd_id,
      tahapan: targetTahapan,
      rincianBelanja: rincian_belanja,
    });

  await RkaRincianBelanja.destroy({ where: { rka_id: targetRka.id } });
  if (targetRincian.length) {
    await RkaRincianBelanja.bulkCreate(
      targetRincian.map((item) => ({ ...item, rka_id: targetRka.id })),
    );
  }
  await Rka.update(
    {
      anggaran: totalAnggaranSubKegiatan,
      change_reason_text: `Import otomatis dari PDF SIPD tahapan ${targetTahapan}: ${file.originalname}`,
      change_reason_file: file.filename,
    },
    { where: { id: targetRka.id } },
  );

  const { old_value, new_value } = auditValuesFromRows(null, targetRka);
  await writePlanningAudit({
    module_name: 'rka',
    table_name: 'rka',
    record_id: targetRka.id,
    action_type: 'CREATE',
    old_value,
    new_value,
    change_reason_text: `Import otomatis dari PDF SIPD tahapan ${targetTahapan}: ${file.originalname}`,
    change_reason_file: file.filename,
    changed_by: uid,
    version_before: null,
    version_after: targetRka.version,
  });

  return {
    status: 201,
    payload: {
      success: true,
      message: `RKA tahapan ${targetTahapan} berhasil diimpor dari PDF (${parsed.sub_kegiatan}).`,
      id: targetRka.id,
      data: {
        id: targetRka.id,
        induk_rka_id: indukRka.id,
        program: targetPayload.program,
        kegiatan: targetPayload.kegiatan,
        sub_kegiatan: targetPayload.sub_kegiatan,
        anggaran: totalAnggaranSubKegiatan,
        jumlah_baris_rincian: _meta.jumlah_baris_rincian,
        selisih_vs_alokasi_pdf: _meta.selisih_vs_alokasi_pdf,
      },
    },
  };
}

// Import 1 berkas PDF (perilaku lama, TIDAK berubah — tetap dipakai tombol
// "Import PDF SIPD" yang sudah ada).
async function importPdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Berkas PDF wajib diunggah.' });
  }

  try {
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const result = await importOneFile(req.file, req.body, uid);
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.details || undefined,
    });
  }
}

// Import BANYAK berkas PDF sekaligus ("Import Semua PDF"). Tiap berkas diproses
// berurutan dan independen — kegagalan pada satu berkas (mis. sudah pernah
// diimpor, atau format tidak dikenali) TIDAK menghentikan proses berkas
// lainnya, supaya user tidak perlu mengulang satu-per-satu kalau cuma satu-dua
// berkas yang bermasalah. Hasil tiap berkas dilaporkan per-item di `results`.
async function importPdfBatch(req, res) {
  if (!req.files || !req.files.length) {
    return res
      .status(400)
      .json({ success: false, error: 'Minimal satu berkas PDF wajib diunggah.' });
  }

  const uid = req.user?.id ?? req.user?.userId ?? null;
  const results = [];

  for (const file of req.files) {
    try {
      const result = await importOneFile(file, req.body, uid);
      results.push({
        filename: file.originalname,
        success: true,
        ...result.payload,
      });
    } catch (error) {
      results.push({
        filename: file.originalname,
        success: false,
        error: error.message,
        details: error.details || undefined,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  return res.status(207).json({
    success: failCount === 0,
    message:
      failCount === 0
        ? `Semua ${successCount} berkas berhasil diimpor.`
        : `${successCount} dari ${results.length} berkas berhasil diimpor, ${failCount} gagal (lihat rincian per berkas).`,
    results,
  });
}

module.exports = { importPdf, importPdfBatch };
