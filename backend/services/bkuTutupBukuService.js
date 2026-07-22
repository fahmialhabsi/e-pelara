"use strict";

/**
 * Tutup buku bulanan BKU — Bendahara menutup, PPK-SKPD/PA memeriksa &
 * menyetujui (atau menolak untuk dikoreksi). Bulan berstatus DITUTUP/DISETUJUI
 * terkunci dari perubahan (lihat assertBulanTerbuka, dipanggil dari semua
 * titik yang menulis baris `bku`).
 */

function num(v) {
  return Number(v) || 0;
}

async function ringkasanBulan(models, tahun, bulan, t) {
  const { Bku } = models;
  const rows = await Bku.findAll({
    where: { tahun_anggaran: tahun, bulan },
    order: [
      ["tanggal", "ASC"],
      ["id", "ASC"],
    ],
    transaction: t,
  });
  const totalPenerimaan = rows.reduce((s, r) => s + num(r.penerimaan), 0);
  const totalPengeluaran = rows.reduce((s, r) => s + num(r.pengeluaran), 0);
  const saldoAkhir = rows.length ? num(rows[rows.length - 1].saldo) : 0;
  const saldoAwal = saldoAkhir - totalPenerimaan + totalPengeluaran;
  return { totalPenerimaan, totalPengeluaran, saldoAwal, saldoAkhir, jumlahBaris: rows.length };
}

/** Lempar error kalau bulan ini sudah ditutup/disetujui — dipanggil sebelum create/update baris `bku`. */
async function assertBulanTerbuka(models, tahun, bulan, t) {
  const { BkuTutupBuku } = models;
  const row = await BkuTutupBuku.findOne({
    where: { tahun_anggaran: tahun, bulan },
    transaction: t,
  });
  if (row && row.status !== "BELUM_TUTUP") {
    throw new Error(
      `BKU ${tahun}/bulan ${bulan} sudah ${row.status === "DISETUJUI" ? "disetujui" : "ditutup"} — tidak bisa menambah/mengubah transaksi. Ajukan pembukaan kembali ke PPK-SKPD/PA jika perlu koreksi.`,
    );
  }
}

async function getStatusBulan(models, tahun, bulan) {
  const { BkuTutupBuku } = models;
  const row = await BkuTutupBuku.findOne({ where: { tahun_anggaran: tahun, bulan } });
  return row || { tahun_anggaran: tahun, bulan, status: "BELUM_TUTUP" };
}

async function tutupBulan(models, tahun, bulan, userId, t) {
  const { BkuTutupBuku } = models;
  const existing = await BkuTutupBuku.findOne({
    where: { tahun_anggaran: tahun, bulan },
    transaction: t,
  });
  if (existing && existing.status !== "BELUM_TUTUP") {
    throw new Error("Bulan ini sudah ditutup");
  }
  const ring = await ringkasanBulan(models, tahun, bulan, t);
  const payload = {
    status: "DITUTUP",
    saldo_awal: ring.saldoAwal,
    total_penerimaan: ring.totalPenerimaan,
    total_pengeluaran: ring.totalPengeluaran,
    saldo_akhir: ring.saldoAkhir,
    ditutup_oleh: userId || null,
    ditutup_at: new Date(),
    disetujui_oleh: null,
    disetujui_at: null,
    catatan: null,
  };
  if (existing) {
    await existing.update(payload, { transaction: t });
    return existing;
  }
  return BkuTutupBuku.create({ tahun_anggaran: tahun, bulan, ...payload }, { transaction: t });
}

async function setujuiBulan(models, tahun, bulan, userId, t) {
  const { BkuTutupBuku } = models;
  const row = await BkuTutupBuku.findOne({ where: { tahun_anggaran: tahun, bulan }, transaction: t });
  if (!row || row.status !== "DITUTUP") {
    throw new Error("Bulan ini belum ditutup Bendahara — tidak bisa disetujui");
  }
  await row.update({ status: "DISETUJUI", disetujui_oleh: userId || null, disetujui_at: new Date() }, { transaction: t });
  return row;
}

async function tolakBulan(models, tahun, bulan, catatan, t) {
  const { BkuTutupBuku } = models;
  const row = await BkuTutupBuku.findOne({ where: { tahun_anggaran: tahun, bulan }, transaction: t });
  if (!row || row.status !== "DITUTUP") {
    throw new Error("Bulan ini belum ditutup Bendahara — tidak ada yang ditolak");
  }
  await row.update(
    { status: "BELUM_TUTUP", ditutup_oleh: null, ditutup_at: null, catatan: catatan || null },
    { transaction: t },
  );
  return row;
}

module.exports = {
  ringkasanBulan,
  assertBulanTerbuka,
  getStatusBulan,
  tutupBulan,
  setujuiBulan,
  tolakBulan,
};
