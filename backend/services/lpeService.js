"use strict";

const { QueryTypes } = require("sequelize");
const { generateLo } = require("./loService");

function num(v) {
  return Number(v) || 0;
}

/**
 * Generate LPE + upsert snapshot. Membandingkan ekuitas akhir dengan neraca (jujur jika selisih).
 */
async function generateLpe(sequelize, models, tahunAnggaran, koreksiManual = {}) {
  const { LpeSnapshot, NeracaSnapshot } = models;

  const locked = await LpeSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran, dikunci: true },
  });
  if (locked) {
    const err = new Error("LPE tahun ini terkunci — generate ditolak");
    err.statusCode = 403;
    throw err;
  }

  const loTahunIni = await generateLo(sequelize, models, tahunAnggaran);

  const neracaLalu = await NeracaSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran - 1, kode_akun: "3.1" },
  });
  const ekuitasAwal = neracaLalu ? num(neracaLalu.nilai_tahun_ini) : 0;

  const surplusDefisit = loTahunIni.surplus_defisit;
  const koreksiPersediaan = num(koreksiManual.persediaan);
  const koreksiAsetTetap = num(koreksiManual.aset_tetap);
  const koreksiLainnya = num(koreksiManual.lainnya);
  const kewajibanKonsolidasi = num(koreksiManual.kewajiban_konsolidasi);

  const ekuitasAkhir =
    ekuitasAwal +
    surplusDefisit +
    koreksiPersediaan +
    koreksiAsetTetap +
    koreksiLainnya +
    kewajibanKonsolidasi;

  const neracaIni = await NeracaSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran, kode_akun: "3.1" },
  });
  const ekuitasNeraca = neracaIni ? num(neracaIni.nilai_tahun_ini) : 0;
  const selisih = Math.abs(ekuitasAkhir - ekuitasNeraca);

  const komponenLpe = [
    { komponen: "EKUITAS_AWAL", nilai_tahun_ini: ekuitasAwal, urutan: 1 },
    { komponen: "SURPLUS_DEFISIT_LO", nilai_tahun_ini: surplusDefisit, urutan: 2 },
    { komponen: "KOREKSI_PERSEDIAAN", nilai_tahun_ini: koreksiPersediaan, urutan: 3 },
    { komponen: "KOREKSI_ASET_TETAP", nilai_tahun_ini: koreksiAsetTetap, urutan: 4 },
    { komponen: "KOREKSI_LAINNYA", nilai_tahun_ini: koreksiLainnya, urutan: 5 },
    {
      komponen: "KEWAJIBAN_KONSOLIDASIKAN",
      nilai_tahun_ini: kewajibanKonsolidasi,
      urutan: 6,
    },
    { komponen: "EKUITAS_AKHIR", nilai_tahun_ini: ekuitasAkhir, urutan: 7 },
  ];

  for (const k of komponenLpe) {
    const prev = await LpeSnapshot.findOne({
      where: { tahun_anggaran: tahunAnggaran - 1, komponen: k.komponen },
    });
    const payload = {
      tahun_anggaran: tahunAnggaran,
      komponen: k.komponen,
      nilai_tahun_ini: k.nilai_tahun_ini,
      nilai_tahun_lalu: prev ? num(prev.nilai_tahun_ini) : 0,
      urutan: k.urutan,
      keterangan: null,
      dikunci: false,
    };
    const [snap, created] = await LpeSnapshot.findOrCreate({
      where: { tahun_anggaran: tahunAnggaran, komponen: k.komponen },
      defaults: payload,
    });
    if (!created) {
      await snap.update({ ...payload, dikunci: snap.dikunci });
    }
  }

  return {
    ekuitas_awal: ekuitasAwal,
    surplus_defisit: surplusDefisit,
    ekuitas_akhir: ekuitasAkhir,
    ekuitas_neraca: ekuitasNeraca,
    balance_lpe_neraca: selisih < 1,
    selisih_lpe_neraca: selisih,
    lo_ringkasan: loTahunIni,
  };
}

async function kunciLpe(models, tahunAnggaran) {
  const { LpeSnapshot } = models;
  const [n] = await LpeSnapshot.update(
    { dikunci: true },
    { where: { tahun_anggaran: tahunAnggaran, dikunci: false } },
  );
  return { updated: n };
}

/**
 * Baca snapshot / agregat — tanpa generate ulang.
 */
async function validasiKeseimbangan(sequelize, models, tahunAnggaran) {
  const { NeracaSnapshot, LoSnapshot, LpeSnapshot } = models;

  const neracaRows = await NeracaSnapshot.findAll({
    where: { tahun_anggaran: tahunAnggaran },
  });
  const totalAset = neracaRows
    .filter((r) => r.kelompok === "ASET")
    .reduce((s, r) => s + num(r.nilai_tahun_ini), 0);
  const totalKwj = neracaRows
    .filter((r) => r.kelompok === "KEWAJIBAN")
    .reduce((s, r) => s + num(r.nilai_tahun_ini), 0);
  const ekuitasNeracaRow = neracaRows.find((r) => r.kode_akun === "3.1");
  const ekuitasNeraca = ekuitasNeracaRow ? num(ekuitasNeracaRow.nilai_tahun_ini) : 0;
  const neracaBalance = Math.abs(totalAset - (totalKwj + ekuitasNeraca)) < 1;

  const loRows = await LoSnapshot.findAll({
    where: { tahun_anggaran: tahunAnggaran },
  });
  const pendapatan = loRows
    .filter((r) => r.kelompok === "PENDAPATAN_LO")
    .reduce((s, r) => s + num(r.nilai_tahun_ini), 0);
  const beban = loRows
    .filter((r) => r.kelompok === "BEBAN_LO")
    .reduce((s, r) => s + num(r.nilai_tahun_ini), 0);
  const surplusLo = pendapatan - beban;

  const lpeSd = await LpeSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran, komponen: "SURPLUS_DEFISIT_LO" },
  });
  const surplusLpe = lpeSd ? num(lpeSd.nilai_tahun_ini) : null;
  const loLpeMatch =
    surplusLpe === null ? null : Math.abs(surplusLo - surplusLpe) < 0.01;

  const lpeAkhir = await LpeSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran, komponen: "EKUITAS_AKHIR" },
  });
  const ekuitasLpe = lpeAkhir ? num(lpeAkhir.nilai_tahun_ini) : null;
  const lpeNeracaMatch =
    ekuitasLpe === null ? null : Math.abs(ekuitasLpe - ekuitasNeraca) < 1;

  const [totBkuRow] = await sequelize.query(
    `SELECT COALESCE(SUM(pengeluaran),0) AS t FROM bku
     WHERE tahun_anggaran = :th AND status_validasi IN ('VALID','BELUM')`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const totalBkuPengeluaran = num(totBkuRow?.t);

  const [belanjaLraRow] = await sequelize.query(
    `SELECT COALESCE(SUM(ls.realisasi),0) AS s
     FROM lra_snapshot ls
     INNER JOIN kode_akun_bas kab ON kab.kode = ls.kode_akun AND kab.jenis = 'BELANJA'
     WHERE ls.tahun_anggaran = :th`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const totalBelanjaLra = num(belanjaLraRow?.s);

  const [totBkuBelanjaRow] = await sequelize.query(
    `SELECT COALESCE(SUM(b.pengeluaran),0) AS t
     FROM bku b
     INNER JOIN kode_akun_bas kab ON kab.kode = b.kode_akun AND kab.jenis = 'BELANJA'
     WHERE b.tahun_anggaran = :th AND b.status_validasi IN ('VALID','BELUM')`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const totalBkuBelanja = num(totBkuBelanjaRow?.t);
  const lraBkuSelisih = Math.abs(totalBelanjaLra - totalBkuBelanja);

  return {
    tahun_anggaran: tahunAnggaran,
    neraca: {
      total_aset: totalAset,
      total_kewajiban: totalKwj,
      ekuitas: ekuitasNeraca,
      balance: neracaBalance,
      selisih: Math.abs(totalAset - (totalKwj + ekuitasNeraca)),
    },
    lo: {
      total_pendapatan: pendapatan,
      total_beban: beban,
      surplus_defisit: surplusLo,
    },
    lpe_lo: {
      surplus_di_lo_snapshot: surplusLo,
      surplus_di_lpe_snapshot: surplusLpe,
      cocok: loLpeMatch,
      selisih:
        surplusLpe === null ? null : Math.abs(surplusLo - surplusLpe),
    },
    lpe_neraca: {
      ekuitas_lpe: ekuitasLpe,
      ekuitas_neraca: ekuitasNeraca,
      cocok: lpeNeracaMatch,
      selisih:
        ekuitasLpe === null ? null : Math.abs(ekuitasLpe - ekuitasNeraca),
    },
    lra_bku_belanja: {
      total_belanja_lra: totalBelanjaLra,
      total_bku_pengeluaran_belanja: totalBkuBelanja,
      total_bku_pengeluaran_semua: totalBkuPengeluaran,
      cocok: lraBkuSelisih < 0.01,
      selisih: lraBkuSelisih,
    },
  };
}

module.exports = {
  generateLpe,
  kunciLpe,
  validasiKeseimbangan,
};
