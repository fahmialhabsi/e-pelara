"use strict";

/**
 * Sinkron data kinerja / monev dari SIGAP-MALUT ke lk_kinerja (CALK Bab II / non-keuangan).
 * Jika SIGAP_KINERJA_SYNC_URL tidak diset atau fetch gagal, kembalikan status jelas tanpa throw.
 */

async function syncDataKinerjaDariSigap(db, tahunAnggaran) {
  const { LkKinerja } = db;
  const urlBase = process.env.SIGAP_KINERJA_SYNC_URL || "";
  const token = process.env.SIGAP_KINERJA_SYNC_TOKEN || "";

  if (!urlBase.trim()) {
    return {
      ok: false,
      imported: 0,
      reason: "SIGAP_KINERJA_SYNC_URL tidak diset — endpoint siap, sync tidak dijalankan",
    };
  }

  const url = `${urlBase.replace(/\/+$/, "")}?tahun=${encodeURIComponent(tahunAnggaran)}`;
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  try {
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      return {
        ok: false,
        imported: 0,
        reason: `HTTP ${res.status} dari SIGAP`,
      };
    }
    body = await res.json();
  } catch (e) {
    return {
      ok: false,
      imported: 0,
      reason: e.message || "Gagal menghubungi SIGAP",
    };
  }

  const items = Array.isArray(body) ? body : body?.data || body?.items || [];
  if (!items.length) {
    return { ok: true, imported: 0, reason: "Respons kosong" };
  }

  let imported = 0;
  for (const it of items) {
    const kode = it.kode_referensi || it.kode || it.id || `sigap-${imported}`;
    const payload = {
      tahun_anggaran: tahunAnggaran,
      kode_referensi: String(kode).slice(0, 64),
      judul: it.judul || it.nama || it.kegiatan || null,
      target: it.target != null ? String(it.target) : null,
      realisasi: it.realisasi != null ? String(it.realisasi) : null,
      satuan: it.satuan || null,
      kuartal: it.kuartal != null ? Number(it.kuartal) : null,
      payload: typeof it === "object" ? it : { raw: it },
      sumber: "SIGAP",
    };

    const [row, created] = await LkKinerja.findOrCreate({
      where: {
        tahun_anggaran: tahunAnggaran,
        kode_referensi: payload.kode_referensi,
        kuartal: payload.kuartal || null,
      },
      defaults: payload,
    });
    if (!created) {
      await row.update({
        judul: payload.judul,
        target: payload.target,
        realisasi: payload.realisasi,
        satuan: payload.satuan,
        payload: payload.payload,
        sumber: "SIGAP",
      });
    }
    imported++;
  }

  return { ok: true, imported };
}

module.exports = { syncDataKinerjaDariSigap };
