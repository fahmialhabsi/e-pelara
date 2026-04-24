"use strict";

const { QueryTypes } = require("sequelize");

function num(v) {
  return Number(v) || 0;
}

/**
 * LO akrual: pendapatan dari saldo akun 9.x (digunakan_di LO);
 * beban agregat dari BKU (belanja 5.1/5.2) + jurnal penyusutan (8.1.09).
 */
async function generateLo(sequelize, models, tahunAnggaran) {
  const { LoSnapshot } = models;

  const locked = await LoSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran, dikunci: true },
  });
  if (locked) {
    const err = new Error("LO tahun ini terkunci — generate ditolak");
    err.statusCode = 403;
    throw err;
  }

  const pendapatanRows = await sequelize.query(
    `SELECT sa.kode_akun, sa.saldo_akhir AS nilai, kab.nama AS nama_akun
     FROM saldo_akun sa
     INNER JOIN kode_akun_bas kab ON kab.kode = sa.kode_akun AND kab.aktif = 1
     WHERE sa.tahun_anggaran = :th AND sa.bulan = 12
       AND kab.digunakan_di = 'LO' AND kab.jenis = 'PENDAPATAN'`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );

  const rows = [];
  let urutan = 10;
  let totalPendapatan = 0;

  for (const p of pendapatanRows) {
    const nilai = Math.abs(num(p.nilai));
    totalPendapatan += nilai;
    const prev = await LoSnapshot.findOne({
      where: { tahun_anggaran: tahunAnggaran - 1, kode_akun: p.kode_akun },
    });
    rows.push({
      kode_akun: p.kode_akun,
      nama_akun: p.nama_akun,
      kelompok: "PENDAPATAN_LO",
      nilai_tahun_ini: nilai,
      nilai_tahun_lalu: prev ? num(prev.nilai_tahun_ini) : 0,
      urutan: urutan++,
    });
  }

  const [bpRow] = await sequelize.query(
    `SELECT COALESCE(SUM(pengeluaran),0) AS t FROM bku
     WHERE tahun_anggaran = :th AND status_validasi IN ('VALID','BELUM')
       AND kode_akun LIKE '5.1%'`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const bebanPegawai = num(bpRow?.t);

  const [bbRow] = await sequelize.query(
    `SELECT COALESCE(SUM(pengeluaran),0) AS t FROM bku
     WHERE tahun_anggaran = :th AND status_validasi IN ('VALID','BELUM')
       AND kode_akun LIKE '5.2%'`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const bebanBarang = num(bbRow?.t);

  const [susRow] = await sequelize.query(
    `SELECT COALESCE(SUM(d.debit),0) AS t
     FROM jurnal_detail d
     INNER JOIN jurnal_umum j ON j.id = d.jurnal_id
     WHERE j.tahun_anggaran = :th AND j.status = 'POSTED'
       AND j.sumber = 'AUTO_PENYUSUTAN' AND d.kode_akun = '8.1.09'`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const bebanPenyusutan = num(susRow?.t);

  const bebanDefs = [
    {
      kode_akun: "8.1.01",
      nama_akun: "Beban Pegawai — LO",
      nilai: bebanPegawai,
      urutan: 50,
    },
    {
      kode_akun: "8.1.02",
      nama_akun: "Beban Barang dan Jasa — LO",
      nilai: bebanBarang,
      urutan: 60,
    },
    {
      kode_akun: "8.1.09",
      nama_akun: "Beban Penyusutan dan Amortisasi — LO",
      nilai: bebanPenyusutan,
      urutan: 90,
    },
  ];

  for (const b of bebanDefs) {
    const prev = await LoSnapshot.findOne({
      where: { tahun_anggaran: tahunAnggaran - 1, kode_akun: b.kode_akun },
    });
    rows.push({
      kode_akun: b.kode_akun,
      nama_akun: b.nama_akun,
      kelompok: "BEBAN_LO",
      nilai_tahun_ini: b.nilai,
      nilai_tahun_lalu: prev ? num(prev.nilai_tahun_ini) : 0,
      urutan: b.urutan,
    });
  }

  const totalBeban = bebanDefs.reduce((s, b) => s + b.nilai, 0);
  const surplusDefisit = totalPendapatan - totalBeban;

  for (const row of rows) {
    const payload = {
      tahun_anggaran: tahunAnggaran,
      kode_akun: row.kode_akun,
      nama_akun: row.nama_akun,
      kelompok: row.kelompok,
      nilai_tahun_ini: row.nilai_tahun_ini,
      nilai_tahun_lalu: row.nilai_tahun_lalu,
      urutan: row.urutan,
      dikunci: false,
    };
    const [snap, created] = await LoSnapshot.findOrCreate({
      where: { tahun_anggaran: tahunAnggaran, kode_akun: row.kode_akun },
      defaults: payload,
    });
    if (!created) {
      await snap.update({ ...payload, dikunci: snap.dikunci });
    }
  }

  return {
    total_pendapatan: totalPendapatan,
    total_beban: totalBeban,
    surplus_defisit: surplusDefisit,
    beban_penyusutan: bebanPenyusutan,
  };
}

async function kunciLo(models, tahunAnggaran) {
  const { LoSnapshot } = models;
  const [n] = await LoSnapshot.update(
    { dikunci: true },
    { where: { tahun_anggaran: tahunAnggaran, dikunci: false } },
  );
  return { updated: n };
}

module.exports = { generateLo, kunciLo };
