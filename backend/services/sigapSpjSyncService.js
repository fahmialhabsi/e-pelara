"use strict";

/**
 * Sinkronisasi SPJ terverifikasi PPK dari SIGAP-MALUT → BKU e-PELARA.
 *
 * Mekanisme: **HTTP API** (disarankan produksi: endpoint khusus di SIGAP + token layanan).
 * Set env:
 *   SIGAP_SPJ_SYNC_URL  — mis. http://localhost:5000/api/bridge/spj-approved
 *   SIGAP_SYNC_TOKEN    — Bearer opsional
 *
 * Respons JSON yang diharapkan: { data: [ { id, tanggal_kegiatan, nominal, kode_rekening, nomor_spj, nomor_spm, keterangan, uraian_kegiatan, jenis_belanja, status } ] }
 *
 * Tanpa URL: sync mengembalikan hasil kosong + pesan konfigurasi (tidak error fatal).
 */

/**
 * Memetakan jenis dari bridge SIGAP (jenis_spj / jenis_belanja) ke jenis_transaksi BKU e-PELARA.
 */
function mapJenisSpjSigapKeBku(row) {
  const s = String(row?.jenis_spj || row?.jenis_belanja || "").toLowerCase().trim();
  if (!s) return "LS_BARANG";
  if (s === "up" || s.includes("uang persediaan")) return "UP";
  if (s === "gu" || s.includes("ganti uang")) return "GU";
  if (s === "tup" || s.includes("tambahan uang")) return "TUP";
  if (s.includes("pegawai") || s.includes("gaji")) return "LS_GAJI";
  if (s.includes("modal") || s.includes("barang") || s.includes("jasa")) return "LS_BARANG";
  if (s.includes("penerimaan")) return "PENERIMAAN_LAIN";
  if (s.includes("pengeluaran") && !s.includes("ls")) return "PENGELUARAN_LAIN";
  return "LS_BARANG";
}

function mapJenisBelanjaKeBku(jenisBelanja) {
  return mapJenisSpjSigapKeBku({ jenis_belanja: jenisBelanja });
}

function isApprovedStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "terverifikasi_ppk" || s.includes("terverifikasi_ppk");
}

/**
 * @returns {Promise<Array>}
 */
async function ambilSpjApprovedDariSigap(tahunAnggaran) {
  const base = process.env.SIGAP_SPJ_SYNC_URL;
  if (!base || !String(base).trim()) {
    return { rows: [], configured: false, message: "SIGAP_SPJ_SYNC_URL belum di-set." };
  }
  const token = process.env.SIGAP_SYNC_TOKEN || "";
  const headers = {};
  if (token) headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  try {
    const u = new URL(base);
    u.searchParams.set("tahun", String(tahunAnggaran));
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 20000);
    const res = await fetch(u.toString(), { headers, signal: ac.signal });
    clearTimeout(to);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        rows: [],
        configured: true,
        message: `HTTP ${res.status}`,
      };
    }
    if (data && Array.isArray(data.data)) return { rows: data.data, configured: true };
    if (data && Array.isArray(data.rows)) return { rows: data.rows, configured: true };
    return { rows: [], configured: true, message: "Format respons tidak dikenali (harap sertakan array data)." };
  } catch (e) {
    return {
      rows: [],
      configured: true,
      error: e.message,
      message: "Gagal memanggil SIGAP_SPJ_SYNC_URL",
    };
  }
}

async function syncSpjDariSigap(sequelize, models, tahunAnggaran) {
  const { Bku } = models;
  const {
    buatJurnalDariBku,
    hitungUlangSaldoBkuDari,
  } = require("./bkuJurnalService");

  const hasil = {
    berhasil: 0,
    skip_sudah_ada: 0,
    gagal: 0,
    detail_gagal: [],
    configured: false,
    fetch_note: null,
  };

  const pack = await ambilSpjApprovedDariSigap(tahunAnggaran);
  hasil.configured = pack.configured;
  hasil.fetch_note = pack.message || pack.error || null;
  const spjList = (pack.rows || []).filter((r) => isApprovedStatus(r.status));

  if (!pack.configured) {
    return hasil;
  }

  for (const spj of spjList) {
    const sudahAda = await Bku.findOne({ where: { sigap_spj_id: spj.id } });
    if (sudahAda) {
      hasil.skip_sudah_ada++;
      continue;
    }

    const tgl = spj.tanggal_kegiatan || spj.tanggal || spj.tanggal_spm;
    if (!tgl) {
      hasil.gagal++;
      hasil.detail_gagal.push({ spj_id: spj.id, error: "Tanggal SPJ kosong" });
      continue;
    }
    const d = new Date(tgl);
    const bulan = d.getMonth() + 1;
    const jenis = mapJenisSpjSigapKeBku(spj);

    const t = await sequelize.transaction();
    try {
      const bkuRow = await Bku.create(
        {
          tahun_anggaran: tahunAnggaran,
          bulan,
          tanggal: String(tgl).slice(0, 10),
          nomor_bukti: spj.nomor_spj || String(spj.id),
          nomor_spm: spj.nomor_spm || null,
          uraian:
            spj.keterangan ||
            spj.uraian_kegiatan ||
            spj.sub_kegiatan_kode ||
            `SPJ SIGAP #${spj.id}`,
          jenis_transaksi: jenis,
          penerimaan: 0,
          pengeluaran: Number(spj.nominal) || 0,
          saldo: 0,
          kode_akun: spj.kode_rekening || null,
          sigap_spj_id: spj.id,
          status_validasi: "VALID",
        },
        { transaction: t },
      );

      if (!bkuRow.kode_akun) {
        await t.rollback();
        hasil.gagal++;
        hasil.detail_gagal.push({
          spj_id: spj.id,
          error: "kode_rekening kosong — tidak bisa jurnal",
        });
        continue;
      }

      const jurnal = await buatJurnalDariBku(sequelize, models, bkuRow, t);
      await bkuRow.update({ jurnal_id: jurnal.id }, { transaction: t });
      await hitungUlangSaldoBkuDari(models, tahunAnggaran, bulan, t);
      await t.commit();
      hasil.berhasil++;
    } catch (err) {
      await t.rollback();
      hasil.gagal++;
      hasil.detail_gagal.push({ spj_id: spj.id, error: err.message });
    }
  }

  return hasil;
}

module.exports = {
  syncSpjDariSigap,
  ambilSpjApprovedDariSigap,
  mapJenisBelanjaKeBku,
  mapJenisSpjSigapKeBku,
};
