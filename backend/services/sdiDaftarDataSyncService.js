// backend/services/sdiDaftarDataSyncService.js
'use strict';

/**
 * Menjaga Daftar Data Daerah tetap selaras dengan indikator Renstra sumbernya.
 *
 * Baris Daftar Data adalah salinan, bukan tampilan langsung, karena berkas yang
 * sudah dikirim ke Bappeda harus tetap utuh sekalipun Renstra kemudian direvisi.
 * Konsekuensinya salinan itu bisa usang — modul ini yang mendeteksi dan
 * memperbaikinya.
 *
 * Perlakuannya dibedakan menurut status baris:
 *   - draft        : diselaraskan otomatis begitu indikator Renstra berubah.
 *   - diverifikasi : hanya ditandai; penyelarasan menunggu persetujuan pengguna,
 *     dan final       karena baris ini sudah/akan menjadi bagian dokumen resmi.
 *
 * Nilai pembanding dihitung ulang lewat susunDraft() agar aturan penurunannya
 * persis sama dengan saat penarikan pertama — tidak ada logika yang digandakan.
 */

const { Op } = require('sequelize');
const { SdiDaftarData, IndikatorRenstra } = require('../models');
const { susunDraft } = require('./sdiDaftarDataHarvestService');

/** Kolom yang isinya diturunkan dari Renstra, sehingga wajib ikut berubah. */
const KOLOM_SINKRON = [
  { key: 'kode_indikator', no: 4, label: 'Kode Indikator' },
  { key: 'nama_indikator', no: 5, label: 'Nama Indikator' },
  { key: 'nama_data', no: 6, label: 'Nama Data' },
  { key: 'sumber_referensi', no: 3, label: 'Sumber Referensi' },
  { key: 'definisi', no: 12, label: 'Definisi' },
  { key: 'satuan', no: 13, label: 'Satuan' },
  { key: 'metode_pengumpulan', no: 20, label: 'Metode Pengumpulan' },
  { key: 'periode_data', no: 21, label: 'Periode Data' },
  { key: 'penanggung_jawab', no: 22, label: 'Penanggung Jawab Data' },
];

/** Status baris yang boleh diselaraskan tanpa persetujuan pengguna. */
const STATUS_OTOMATIS = ['draft'];

const SEMUA_STAGE = [
  'tujuan',
  'sasaran',
  'strategi',
  'kebijakan',
  'program',
  'kegiatan',
  'sub_kegiatan',
];

const bersih = (v) => (v == null ? '' : String(v).trim());

/**
 * Hitung nilai seharusnya untuk seluruh indikator sebuah Renstra, dipetakan
 * berdasarkan id indikator asal.
 */
async function nilaiSeharusnya(renstraId, tahun) {
  const { draft } = await susunDraft(renstraId, {
    tahun,
    stages: SEMUA_STAGE,
    hanyaBaru: false,
  });
  return new Map(draft.map((d) => [Number(d.indikator_renstra_id), d]));
}

/** Susun daftar selisih satu baris terhadap nilai seharusnya. */
function selisihBaris(row, seharusnya) {
  if (!seharusnya) return [];
  return KOLOM_SINKRON.filter((k) => bersih(row[k.key]) !== bersih(seharusnya[k.key])).map((k) => ({
    ...k,
    sekarang: bersih(row[k.key]),
    seharusnya: bersih(seharusnya[k.key]),
  }));
}

/**
 * Periksa keselarasan seluruh baris pada satu Renstra dan tahun.
 * Baris manual (tanpa indikator_renstra_id) dilewati karena tidak punya sumber.
 */
async function periksaSinkron(filter) {
  const renstraId = Number(filter.renstra_id);
  const tahun = String(filter.tahun);

  const rows = await SdiDaftarData.findAll({
    where: { renstra_id: renstraId, tahun },
    order: [
      ['urutan', 'ASC'],
      ['id', 'ASC'],
    ],
    raw: true,
  });

  const bertaut = rows.filter((r) => r.indikator_renstra_id);
  if (!bertaut.length) {
    return { total: rows.length, tidak_sinkron: 0, sumber_hilang: 0, data: [] };
  }

  const peta = await nilaiSeharusnya(renstraId, tahun);

  // Indikator yang sudah tidak ada lagi di Renstra tidak boleh dihapus diam-diam:
  // barisnya bisa jadi sudah dikirim ke Bappeda. Cukup ditandai agar ditinjau.
  const masihAda = new Set(
    (
      await IndikatorRenstra.findAll({
        where: { id: { [Op.in]: bertaut.map((r) => Number(r.indikator_renstra_id)) } },
        attributes: ['id'],
        raw: true,
      })
    ).map((i) => Number(i.id)),
  );

  const data = bertaut
    .map((row) => {
      const sumberId = Number(row.indikator_renstra_id);
      if (!masihAda.has(sumberId)) {
        return {
          id: row.id,
          nama_data: row.nama_data,
          status: row.status,
          sumber_hilang: true,
          selisih: [],
        };
      }
      const selisih = selisihBaris(row, peta.get(sumberId));
      return selisih.length
        ? {
            id: row.id,
            nama_data: row.nama_data,
            status: row.status,
            sumber_hilang: false,
            otomatis: STATUS_OTOMATIS.includes(row.status),
            selisih,
          }
        : null;
    })
    .filter(Boolean);

  return {
    total: rows.length,
    tidak_sinkron: data.filter((d) => !d.sumber_hilang).length,
    sumber_hilang: data.filter((d) => d.sumber_hilang).length,
    data,
  };
}

/**
 * Selaraskan baris terpilih dengan nilai terkini dari Renstra.
 *
 * @param {object}   filter { renstra_id, tahun }
 * @param {object}   opsi
 * @param {number[]} [opsi.ids]            Batasi ke baris tertentu.
 * @param {string[]} [opsi.kolom]          Batasi ke kolom tertentu.
 * @param {boolean}  [opsi.hanyaOtomatis]  Hanya baris berstatus draft.
 */
async function segarkan(filter, opsi = {}) {
  const hasil = await periksaSinkron(filter);
  const idsTerpilih = Array.isArray(opsi.ids) && opsi.ids.length ? new Set(opsi.ids.map(Number)) : null;
  const kolomTerpilih =
    Array.isArray(opsi.kolom) && opsi.kolom.length ? new Set(opsi.kolom) : null;

  let diperbarui = 0;
  const rincian = [];

  for (const baris of hasil.data) {
    if (baris.sumber_hilang) continue;
    if (idsTerpilih && !idsTerpilih.has(Number(baris.id))) continue;
    if (opsi.hanyaOtomatis && !baris.otomatis) continue;

    const payload = {};
    baris.selisih
      .filter((s) => !kolomTerpilih || kolomTerpilih.has(s.key))
      .forEach((s) => {
        payload[s.key] = s.seharusnya;
      });
    if (!Object.keys(payload).length) continue;

    const [n] = await SdiDaftarData.update(payload, { where: { id: baris.id } });
    if (n) {
      diperbarui += 1;
      rincian.push({ id: baris.id, kolom: Object.keys(payload) });
    }
  }

  return { diperbarui, rincian, sumber_hilang: hasil.sumber_hilang };
}

/** Ambil id indikator dari klausa where sebuah operasi update massal. */
function idDariWhere(where) {
  const nilai = where?.id;
  if (nilai == null) return [];
  if (typeof nilai === 'number' || typeof nilai === 'string') return [Number(nilai)];
  if (Array.isArray(nilai)) return nilai.map(Number);
  // Sequelize menyimpan operator sebagai Symbol, mis. { [Op.in]: [...] }.
  const isi = nilai[Op.in] || nilai[Op.eq];
  if (Array.isArray(isi)) return isi.map(Number);
  if (isi != null) return [Number(isi)];
  return [];
}

/**
 * Selaraskan baris draft yang bertaut ke sekumpulan indikator yang baru berubah.
 * Dipanggil dari hook; kegagalannya tidak boleh menggagalkan penyimpanan
 * indikator Renstra, jadi seluruh galat ditelan dan hanya dicatat.
 */
async function segarkanUntukIndikator(indikatorIds) {
  const ids = [...new Set((indikatorIds || []).map(Number).filter(Boolean))];
  if (!ids.length) return;

  const terdampak = await SdiDaftarData.findAll({
    where: { indikator_renstra_id: { [Op.in]: ids }, status: { [Op.in]: STATUS_OTOMATIS } },
    attributes: ['renstra_id', 'tahun'],
    group: ['renstra_id', 'tahun'],
    raw: true,
  });

  for (const { renstra_id: renstraId, tahun } of terdampak) {
    if (!renstraId || !tahun) continue;
    await segarkan({ renstra_id: renstraId, tahun }, { hanyaOtomatis: true });
  }
}

let hookTerpasang = false;

/**
 * Pasang hook penyelarasan pada model IndikatorRenstra.
 *
 * Pembaruan indikator di modul Renstra dilakukan lewat Model.update(payload,
 * { where }) — bentuk massal — sehingga hook per-instance tidak terpicu.
 * Karena itu yang dipakai afterBulkUpdate, dengan id dibaca dari klausa where.
 */
function pasangHookSinkron() {
  if (hookTerpasang) return;
  hookTerpasang = true;

  const jalankan = (ids) => {
    if (!ids.length) return;
    // Sengaja tidak di-await: penyelarasan Daftar Data adalah efek samping,
    // bukan bagian dari transaksi penyimpanan indikator Renstra.
    segarkanUntukIndikator(ids).catch((err) =>
      console.error('[sdiDaftarData] sinkron otomatis gagal:', err.message),
    );
  };

  IndikatorRenstra.addHook('afterBulkUpdate', 'sdiSinkron', (options) =>
    jalankan(idDariWhere(options?.where)),
  );
  IndikatorRenstra.addHook('afterUpdate', 'sdiSinkron', (instance) =>
    jalankan([Number(instance?.id)]),
  );
}

module.exports = {
  KOLOM_SINKRON,
  STATUS_OTOMATIS,
  periksaSinkron,
  segarkan,
  segarkanUntukIndikator,
  pasangHookSinkron,
};
