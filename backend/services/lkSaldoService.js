"use strict";

const { Op } = require("sequelize");

function num(v) {
  return Number(v) || 0;
}

function computeSaldoAkhir(normalBalance, saldoAwal, totalDebit, totalKredit) {
  const sa = num(saldoAwal);
  const td = num(totalDebit);
  const tk = num(totalKredit);
  if (normalBalance === "DEBIT") return sa + td - tk;
  return sa - td + tk;
}

/**
 * Terapkan delta baris jurnal ke saldo_akun (bulan transaksi + bulan 0).
 * @param {object} t - Sequelize transaction
 * @param {import('sequelize').ModelCtor} SaldoAkun
 * @param {import('sequelize').ModelCtor} KodeAkunBas
 * @param {number} tahunAnggaran
 * @param {number} bulanTransaksi 1-12
 * @param {string} kodeAkun
 * @param {string} namaAkun
 * @param {number} debit
 * @param {number} kredit
 * @param {number} sign +1 posting, -1 void/reverse
 */
async function applyDetailToSaldo(
  t,
  { SaldoAkun, KodeAkunBas },
  tahunAnggaran,
  bulanTransaksi,
  { kodeAkun, namaAkun, debit, kredit, sign },
) {
  const akun = await KodeAkunBas.findOne({
    where: { kode: kodeAkun },
    transaction: t,
  });
  if (!akun) {
    throw new Error(`Kode akun BAS tidak ditemukan: ${kodeAkun}`);
  }
  const normal = akun.normal_balance;
  const dD = sign * num(debit);
  const dK = sign * num(kredit);

  for (const bulan of [bulanTransaksi, 0]) {
    let row = await SaldoAkun.findOne({
      where: {
        kode_akun: kodeAkun,
        tahun_anggaran: tahunAnggaran,
        bulan,
      },
      transaction: t,
    });
    if (!row) {
      row = await SaldoAkun.create(
        {
          kode_akun: kodeAkun,
          nama_akun: namaAkun || akun.nama,
          tahun_anggaran: tahunAnggaran,
          bulan,
          saldo_awal: 0,
          total_debit: 0,
          total_kredit: 0,
          saldo_akhir: 0,
          terakhir_diperbarui: new Date(),
        },
        { transaction: t },
      );
    }
    const td = num(row.total_debit) + dD;
    const tk = num(row.total_kredit) + dK;
    const saldoAkhir = computeSaldoAkhir(normal, row.saldo_awal, td, tk);
    await row.update(
      {
        nama_akun: namaAkun || row.nama_akun || akun.nama,
        total_debit: td,
        total_kredit: tk,
        saldo_akhir: saldoAkhir,
        terakhir_diperbarui: new Date(),
      },
      { transaction: t },
    );
  }
}

/**
 * Posting saldo_akun dalam transaksi luar (mis. dari BKU).
 */
async function applyJournalPostingWithTransaction(models, jurnal, sign, t) {
  const { SaldoAkun, KodeAkunBas, JurnalDetail } = models;
  const bulan = parseInt(String(jurnal.tanggal).slice(5, 7), 10) || 1;
  let details = jurnal.details;
  if (!details || !details.length) {
    details = await JurnalDetail.findAll({
      where: { jurnal_id: jurnal.id },
      order: [
        ["urutan", "ASC"],
        ["id", "ASC"],
      ],
      transaction: t,
    });
  }
  for (const d of details) {
    await applyDetailToSaldo(
      t,
      { SaldoAkun, KodeAkunBas },
      jurnal.tahun_anggaran,
      bulan,
      {
        kodeAkun: d.kode_akun,
        namaAkun: d.nama_akun,
        debit: d.debit,
        kredit: d.kredit,
        sign,
      },
    );
  }
}

async function applyJournalPosting(sequelize, models, jurnal, sign) {
  await sequelize.transaction(async (t) => {
    await applyJournalPostingWithTransaction(models, jurnal, sign, t);
  });
}

/**
 * Hapus semua saldo tahun lalu, hitung ulang dari jurnal POSTED.
 */
async function recalculateSaldoTahun(sequelize, models, tahunAnggaran) {
  const { SaldoAkun, JurnalUmum, JurnalDetail } = models;
  await sequelize.transaction(async (t) => {
    await SaldoAkun.destroy({
      where: { tahun_anggaran: tahunAnggaran },
      transaction: t,
    });
  });

  const jurnals = await JurnalUmum.findAll({
    where: { tahun_anggaran: tahunAnggaran, status: "POSTED" },
    include: [{ model: JurnalDetail, as: "details" }],
    order: [
      ["tanggal", "ASC"],
      ["id", "ASC"],
    ],
  });

  for (const j of jurnals) {
    await applyJournalPosting(sequelize, models, j, +1);
  }

  return { rebuilt: jurnals.length };
}

module.exports = {
  computeSaldoAkhir,
  applyDetailToSaldo,
  applyJournalPosting,
  applyJournalPostingWithTransaction,
  recalculateSaldoTahun,
  num,
};
