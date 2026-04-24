"use strict";

const { Op } = require("sequelize");
const { applyJournalPostingWithTransaction } = require("./lkSaldoService");

function num(v) {
  return Number(v) || 0;
}

/** Tarif default per kategori (Permendagri 77/2020 — ilustrasi). */
const TARIF_PENYUSUTAN = {
  PERALATAN_MESIN: 0.25,
  GEDUNG_BANGUNAN: 0.05,
  JALAN_IRIGASI_INSTALASI: 0.1,
  TANAH: 0,
  ASET_TETAP_LAINNYA: 0.25,
  KDP: 0,
};

function tarifUntukAset(aset) {
  if (aset.tarif_penyusutan != null && num(aset.tarif_penyusutan) > 0) {
    return num(aset.tarif_penyusutan);
  }
  return TARIF_PENYUSUTAN[aset.kategori] || 0;
}

/** Delta penyusutan tahun berjalan (dibatasi sisa nilai buku). */
function hitungDeltaPenyusutan(aset, tarif) {
  const harga = num(aset.harga_perolehan);
  const akum = num(aset.akumulasi_penyusutan);
  if (tarif <= 0 || harga <= 0) return 0;
  const sisa = harga - akum;
  if (sisa <= 0) return 0;
  const tahunan = harga * tarif;
  const baru = Math.min(akum + tahunan, harga);
  const delta = baru - akum;
  return Math.min(delta, sisa);
}

async function generateNomorPny(JurnalUmum, tahun) {
  const prefix = `PNY-${tahun}-`;
  const last = await JurnalUmum.findOne({
    where: { nomor_jurnal: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
  });
  let next = 1;
  if (last && last.nomor_jurnal) {
    const part = last.nomor_jurnal.split("-").pop();
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(6, "0")}`;
}

async function previewPenyusutanTahunan(models, tahunAnggaran) {
  const { AsetTetap } = models;
  const list = await AsetTetap.findAll({ where: { status: "AKTIF" } });
  const hasil = [];
  for (const aset of list) {
    const tarif = tarifUntukAset(aset);
    const delta = hitungDeltaPenyusutan(aset, tarif);
    hasil.push({
      aset_id: aset.id,
      nama_barang: aset.nama_barang,
      kategori: aset.kategori,
      tarif,
      delta_penyusutan: delta,
      harga_perolehan: num(aset.harga_perolehan),
      akumulasi_penyusutan: num(aset.akumulasi_penyusutan),
    });
  }
  return { tahun_anggaran: tahunAnggaran, baris: hasil, total_penyusutan: hasil.reduce((s, x) => s + x.delta_penyusutan, 0) };
}

/**
 * Proses penyusutan: update akumulasi + jurnal POSTED + posting saldo.
 * Idempoten per aset per tahun lewat referensi PENYUSUTAN_ASSET:id:tahun.
 */
async function prosesPenyusutanTahunan(sequelize, models, tahunAnggaran) {
  const { AsetTetap, JurnalUmum, JurnalDetail, KodeAkunBas } = models;
  const tanggal = `${tahunAnggaran}-12-31`;
  const ringkas = { jurnal_dibuat: 0, dilewati: 0, detail: [] };

  const asetList = await AsetTetap.findAll({ where: { status: "AKTIF" } });

  for (const aset of asetList) {
    const ref = `PENYUSUTAN_ASSET:${aset.id}:${tahunAnggaran}`;
    const dup = await JurnalUmum.findOne({
      where: { referensi: ref, tahun_anggaran: tahunAnggaran },
    });
    if (dup) {
      ringkas.dilewati++;
      continue;
    }

    const tarif = tarifUntukAset(aset);
    const delta = hitungDeltaPenyusutan(aset, tarif);
    if (delta < 0.01) {
      ringkas.dilewati++;
      continue;
    }

    const deb = await KodeAkunBas.findOne({ where: { kode: "8.1.09", aktif: true } });
    const kre = await KodeAkunBas.findOne({ where: { kode: "1.3.07", aktif: true } });
    if (!deb || !kre) {
      throw new Error("Akun 8.1.09 atau 1.3.07 tidak ada di kode_akun_bas");
    }

    await sequelize.transaction(async (t) => {
      const fresh = await AsetTetap.findByPk(aset.id, { transaction: t });
      const delta2 = hitungDeltaPenyusutan(fresh, tarif);
      if (delta2 < 0.01) return;

      const akumBaru = num(fresh.akumulasi_penyusutan) + delta2;
      await fresh.update({ akumulasi_penyusutan: akumBaru }, { transaction: t });

      const nomor = await generateNomorPny(JurnalUmum, tahunAnggaran);
      const header = await JurnalUmum.create(
        {
          nomor_jurnal: nomor,
          tanggal,
          tahun_anggaran: tahunAnggaran,
          keterangan: `Beban penyusutan ${fresh.nama_barang} — ${tahunAnggaran}`,
          referensi: ref,
          nomor_sp2d: null,
          jenis_jurnal: "PENYESUAIAN",
          sumber: "AUTO_PENYUSUTAN",
          status: "POSTED",
          dibuat_oleh: null,
          disetujui_oleh: null,
          tanggal_disetujui: new Date(),
        },
        { transaction: t },
      );

      await JurnalDetail.create(
        {
          jurnal_id: header.id,
          kode_akun: "8.1.09",
          nama_akun: deb.nama,
          debit: delta2,
          kredit: 0,
          urutan: 0,
        },
        { transaction: t },
      );
      await JurnalDetail.create(
        {
          jurnal_id: header.id,
          kode_akun: "1.3.07",
          nama_akun: kre.nama,
          debit: 0,
          kredit: delta2,
          urutan: 1,
        },
        { transaction: t },
      );

      const full = await JurnalUmum.findByPk(header.id, {
        include: [{ model: JurnalDetail, as: "details" }],
        transaction: t,
      });
      await applyJournalPostingWithTransaction(models, full, +1, t);
      ringkas.jurnal_dibuat++;
      ringkas.detail.push({
        aset_id: fresh.id,
        nama_barang: fresh.nama_barang,
        penyusutan: delta2,
        nomor_jurnal: nomor,
      });
    });
  }

  return ringkas;
}

module.exports = {
  TARIF_PENYUSUTAN,
  previewPenyusutanTahunan,
  prosesPenyusutanTahunan,
  hitungDeltaPenyusutan,
  tarifUntukAset,
};
