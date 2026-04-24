"use strict";

/**
 * Evaluasi kandidat backfill mapping legacy → master (hanya saran, tidak menulis DB).
 * Tidak melakukan auto-backfill massal.
 */

function normKode(s) {
  return String(s || "").trim();
}

function normNama(s) {
  return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Apakah aman secara heuristik untuk menautkan sub transaksi ke master_sub target
 * (setelah operator verifikasi manual).
 *
 * @param {object} params
 * @param {object|null} params.existingSub — baris sub_kegiatan (partial)
 * @param {number} params.targetMasterSubId
 * @param {string} params.targetKodeSub
 * @param {string} params.targetNamaSub
 * @param {number|null} params.targetMasterKegiatanId
 */
function evaluateSubBackfillCandidate(params) {
  const {
    existingSub,
    targetMasterSubId,
    targetKodeSub,
    targetNamaSub,
    targetMasterKegiatanId,
  } = params;

  const checklist = [];
  let safe = true;

  if (!existingSub) {
    return {
      safe: false,
      checklist: [{ ok: false, item: "Tidak ada baris transaksi untuk dievaluasi." }],
    };
  }

  if (existingSub.master_sub_kegiatan_id != null) {
    safe = false;
    checklist.push({
      ok: false,
      item: "Sub sudah punya master_sub_kegiatan_id — jangan timpa tanpa audit.",
    });
  } else {
    checklist.push({
      ok: true,
      item: "master_sub_kegiatan_id masih kosong (legacy).",
    });
  }

  const kodeOk = normKode(existingSub.kode_sub_kegiatan) === normKode(targetKodeSub);
  if (!kodeOk) {
    safe = false;
    checklist.push({
      ok: false,
      item: "Kode sub transaksi tidak sama dengan master target.",
    });
  } else {
    checklist.push({ ok: true, item: "Kode sub cocok dengan master target." });
  }

  const namaOk =
    normNama(existingSub.nama_sub_kegiatan) === normNama(targetNamaSub);
  if (!namaOk) {
    checklist.push({
      ok: false,
      item: "Nama sub berbeda — verifikasi manual sebelum backfill.",
    });
    safe = false;
  } else {
    checklist.push({ ok: true, item: "Nama sub cocok (normalisasi ringan)." });
  }

  if (targetMasterKegiatanId != null && existingSub.kegiatan_id) {
    checklist.push({
      ok: true,
      item: `Periksa kegiatan induk (id ${existingSub.kegiatan_id}) memiliki master_kegiatan_id = ${targetMasterKegiatanId} sebelum mengaitkan sub.`,
    });
  }

  return {
    safe,
    target_master_sub_kegiatan_id: targetMasterSubId,
    checklist,
    recommendation: safe
      ? "Kandidat relatif aman untuk backfill mapping setelah verifikasi operator."
      : "Tidak aman otomatis — butuh koreksi data atau mapping manual.",
  };
}

/**
 * Hint untuk konflik kegiatan induk (kode/nama sama, master beda).
 */
function evaluateKegiatanBackfillHint({ existingKegiatan, targetMasterKegiatanId }) {
  const checklist = [];
  let safe = true;
  if (!existingKegiatan) {
    return { safe: false, checklist: [{ ok: false, item: "Kegiatan tidak ditemukan." }] };
  }
  if (
    existingKegiatan.master_kegiatan_id != null &&
    Number(existingKegiatan.master_kegiatan_id) !== Number(targetMasterKegiatanId)
  ) {
    safe = false;
    checklist.push({
      ok: false,
      item: "Kegiatan sudah terhubung ke master_kegiatan lain.",
    });
  } else if (existingKegiatan.master_kegiatan_id == null) {
    checklist.push({
      ok: true,
      item: "master_kegiatan_id kosong — kandidat backfill kegiatan ke master target.",
    });
  } else {
    checklist.push({ ok: true, item: "master_kegiatan_id sudah cocok." });
  }
  return {
    safe,
    checklist,
    recommendation: safe
      ? "Setelah program induk termapping benar, pertimbangkan set master_kegiatan_id."
      : "Konflik mapping kegiatan — selesaikan manual.",
  };
}

module.exports = {
  evaluateSubBackfillCandidate,
  evaluateKegiatanBackfillHint,
  normKode,
  normNama,
};
