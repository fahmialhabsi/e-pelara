// backend/services/sdiDaftarDataHarvestService.js
'use strict';

/**
 * "Tarik dari Renstra" — menyusun draft baris Daftar Data Daerah dari indikator
 * Renstra yang sudah tersimpan di ePeLARA.
 *
 * Pemetaan mengikuti keterangan atribut pada Lampiran surat 000.7/4486/SETDA:
 *   (5) Nama Indikator : nomenklatur indikator pembangunan sesuai kode dan
 *       sumber referensi — diambil dari indikator level Sasaran yang menaungi.
 *   (6) Nama Data      : nama dari indikator atau variabel yang masuk daftar —
 *       diambil dari indikator itu sendiri.
 * Pola ini meniru baris contoh pada Lampiran (Nama Indikator "Indeks Ketahanan
 * Pangan" dengan Nama Data "Prevalensi Ketidakcukupan Pangan").
 *
 * Kolom yang tidak punya padanan di Renstra (ID DDP, Kode Standar Data,
 * Kategori RAD, Kode Metadata, dan kedua kolom link portal) sengaja dibiarkan
 * kosong agar diisi manual — nilainya berasal dari sumber di luar aplikasi
 * (daftar Bappenas, INDAH/KUGI, SISAE SPBE, portal daerah).
 */

const { Op } = require('sequelize');
const { usulkanBaris, tebakUrusanBaku } = require('./sdiDaftarDataAutofillService');
const {
  SdiDaftarData,
  IndikatorRenstra,
  RenstraOPD,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
} = require('../models');

/** Indikator level ini dianggap "Indikator"; sisanya "Variabel pembentuk". */
const STAGE_INDIKATOR = new Set(['tujuan', 'sasaran', 'strategi', 'kebijakan', 'program']);

/** Level yang ditarik secara baku — Kegiatan/Sub Kegiatan opsional. */
const STAGE_DEFAULT = ['tujuan', 'sasaran', 'program'];

const bersih = (v) => (v == null ? '' : String(v).trim());

/** Bangun map id → record agar penelusuran hierarki tidak memicu query beruntun. */
const petakan = (rows) => new Map(rows.map((r) => [Number(r.id), r]));

/**
 * Buang bagian URL dari sebuah entri referensi. Kolom (3) meminta *nama*
 * dokumen atau regulasi, bukan tautannya; entri Renstra kerap ditulis dengan
 * pola "Judul: https://..." sehingga bagian setelah tautan harus dipangkas.
 * Entri yang isinya hanya URL dilewatkan karena tidak menyebut nama dokumen.
 */
function namaDokumen(teks) {
  const isi = bersih(teks);
  if (!isi) return '';
  const tanpaUrl = isi.split(/https?:\/\//i)[0];
  return tanpaUrl.replace(/[\s:;,-]+$/, '').trim();
}

/**
 * Rangkai kolom (3) Sumber Referensi: nama dokumen perencanaan atau regulasi
 * yang menjadi basis penentuan daftar data.
 */
function susunSumberReferensi(indikator, renstra) {
  const bagian = [];
  const periode =
    renstra?.tahun_mulai && renstra?.tahun_akhir
      ? ` ${renstra.tahun_mulai}-${renstra.tahun_akhir}`
      : '';

  if (STAGE_INDIKATOR.has(indikator.stage)) bagian.push('RPJMD');
  bagian.push(`Renstra ${bersih(renstra?.nama_opd) || 'Perangkat Daerah'}${periode}`);

  const daftar = Array.isArray(indikator.referensi) ? indikator.referensi : [];
  daftar.forEach((r) => {
    const teks = namaDokumen(typeof r === 'string' ? r : r?.judul || r?.teks || r?.regulasi);
    if (teks) bagian.push(teks);
  });

  return [...new Set(bagian.filter(Boolean))].join('; ');
}

/**
 * Tentukan isi kolom (5) Nama Indikator.
 *
 * Lampiran membedakan kolom (5) "nomenklatur dari indikator pembangunan" dari
 * kolom (6) "nama dari indikator atau variabel yang masuk dalam daftar data".
 * Keduanya baru berbeda ketika baris berisi VARIABEL PEMBENTUK — seperti baris
 * contoh pada Lampiran: indikator "Indeks Ketahanan Pangan" dengan variabel
 * "Prevalensi Ketidakcukupan Pangan".
 *
 * Indikator level Tujuan sampai Program adalah indikator pembangunan itu
 * sendiri, sehingga kolom (5) diisi namanya sendiri. Menariknya ke indikator
 * Sasaran penaung justru keliru: satu Sasaran lazim menopang beberapa
 * indikator, sehingga seluruh barisnya akan tertulis dengan nama indikator
 * pertama Sasaran tersebut.
 *
 * Untuk variabel (Kegiatan/Sub Kegiatan), indikator penaung dipakai HANYA bila
 * penaungnya tunggal — bila lebih dari satu, tidak ada dasar untuk memilih
 * salah satunya, jadi kolom (5) diisi nama variabel itu sendiri.
 */
function tentukanNamaIndikator(indikator, konteks) {
  const { kegiatanMap, subKegiatanMap, perStage } = konteks;
  const namaSendiri = bersih(indikator.nama_indikator);

  // Indikator pembangunan: kolom (5) sama dengan nomenklaturnya sendiri.
  if (STAGE_INDIKATOR.has(indikator.stage)) return namaSendiri;

  const refId = Number(indikator.ref_id);
  let programId = null;
  if (indikator.stage === 'kegiatan') {
    programId = Number(kegiatanMap.get(refId)?.program_id) || null;
  } else if (indikator.stage === 'sub_kegiatan') {
    const kegiatan = kegiatanMap.get(Number(subKegiatanMap.get(refId)?.kegiatan_id));
    programId = Number(kegiatan?.program_id) || null;
  }
  if (!programId) return namaSendiri;

  const indikatorProgram = (perStage.get('program') || []).filter(
    (i) => Number(i.ref_id) === programId,
  );
  return indikatorProgram.length === 1
    ? bersih(indikatorProgram[0].nama_indikator) || namaSendiri
    : namaSendiri;
}

/** Potong teks panjang pada batas kata agar sel Excel tetap terbaca. */
function ringkas(teks, batas = 400) {
  const isi = bersih(teks).replace(/\s+/g, ' ');
  if (isi.length <= batas) return isi;
  return `${isi.slice(0, isi.lastIndexOf(' ', batas) || batas)}...`;
}

/**
 * Susun kolom Metode Pengumpulan.
 *
 * Indikator bermode sumber data "tabel" menyimpan puluhan baris rincian yang
 * bila disalin utuh membuat sel Excel tidak terbaca. Untuk mode itu cukup
 * disebutkan jumlah sumber dan rujukannya ke Kartu Indikator Renstra
 * (Lampiran I dokumen Renstra), bukan seluruh isinya.
 */
const metodePengumpulan = (indikator) => {
  const tabel = Array.isArray(indikator.sumber_data_tabel?.rows)
    ? indikator.sumber_data_tabel.rows
    : Array.isArray(indikator.sumber_data_tabel)
      ? indikator.sumber_data_tabel
      : null;

  const dasar =
    indikator.sumber_data_mode === 'tabel' && tabel?.length
      ? `Kompilasi data sekunder dari ${tabel.length} sumber sebagaimana dirinci pada Kartu Indikator Renstra.`
      : ringkas(indikator.sumber_data);

  const cara = ringkas(indikator.metode_penghitungan);
  return [dasar && `Sumber data: ${dasar}`, cara && `Metode penghitungan: ${cara}`]
    .filter(Boolean)
    .join(' ');
};

/**
 * Susun daftar draft baris dari indikator Renstra.
 *
 * @param {number}   renstraId
 * @param {object}   opsi
 * @param {string[]} [opsi.stages]         Level indikator yang ditarik.
 * @param {string}   [opsi.tahun]          Tahun Daftar Data (default tahun berjalan).
 * @param {boolean}  [opsi.hanyaBaru=true] Lewati indikator yang sudah pernah ditarik.
 */
async function susunDraft(renstraId, opsi = {}) {
  const stages = Array.isArray(opsi.stages) && opsi.stages.length ? opsi.stages : STAGE_DEFAULT;
  const tahun = bersih(opsi.tahun) || String(new Date().getFullYear());
  const hanyaBaru = opsi.hanyaBaru !== false;

  const renstra = await RenstraOPD.findByPk(renstraId);
  if (!renstra) {
    const err = new Error('Renstra tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const indikator = await IndikatorRenstra.findAll({
    where: { renstra_id: renstraId },
    order: [
      ['stage', 'ASC'],
      ['kode_indikator', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  // Hanya level Program ke bawah yang dipetakan: penelusuran induk berhenti di
  // Program (untuk variabel Kegiatan/Sub Kegiatan), dan kode nomenklatur
  // Kepmendagri hanya melekat pada ketiga level itu.
  const [program, kegiatan] = await Promise.all([
    RenstraProgram.findAll({ where: { renstra_id: renstraId }, raw: true }),
    RenstraKegiatan.findAll({ where: { renstra_id: renstraId }, raw: true }),
  ]);

  // renstra_subkegiatan tidak menyimpan renstra_id — penyaringannya lewat
  // kegiatan induk, sesuai struktur tabel yang berlaku.
  const kegiatanIds = kegiatan.map((k) => k.id);
  const subKegiatan = kegiatanIds.length
    ? await RenstraSubkegiatan.findAll({
        where: { kegiatan_id: { [Op.in]: kegiatanIds } },
        raw: true,
      })
    : [];

  const perStage = new Map();
  indikator.forEach((i) => {
    if (!perStage.has(i.stage)) perStage.set(i.stage, []);
    perStage.get(i.stage).push(i);
  });

  const konteks = {
    programMap: petakan(program),
    kegiatanMap: petakan(kegiatan),
    subKegiatanMap: petakan(subKegiatan),
    perStage,
  };

  const sudahAda = new Set(
    (
      await SdiDaftarData.findAll({
        where: { renstra_id: renstraId, tahun },
        attributes: ['indikator_renstra_id'],
        raw: true,
      })
    )
      .map((r) => Number(r.indikator_renstra_id))
      .filter(Boolean),
  );

  const namaOpd = bersih(renstra.nama_opd);
  const urusanBaku = await tebakUrusanBaku(renstraId);
  const draft = [];

  // Kode nomenklatur Kepmendagri milik objek yang diukur indikator — bahan
  // penyimpulan Kategori RAD pada pengisian otomatis.
  const kodeNomenklaturDari = (i) => {
    if (i.stage === 'program') return konteks.programMap.get(Number(i.ref_id))?.kode_program;
    if (i.stage === 'kegiatan') return konteks.kegiatanMap.get(Number(i.ref_id))?.kode_kegiatan;
    if (i.stage === 'sub_kegiatan')
      return konteks.subKegiatanMap.get(Number(i.ref_id))?.kode_sub_kegiatan;
    return null;
  };

  indikator
    .filter((i) => stages.includes(i.stage))
    .filter((i) => bersih(i.nama_indikator))
    .filter((i) => !(hanyaBaru && sudahAda.has(Number(i.id))))
    .forEach((i, idx) => {
      const namaIndikator = tentukanNamaIndikator(i, konteks);
      draft.push({
        renstra_id: renstraId,
        tahun,
        nama_opd: namaOpd,
        urutan: idx + 1,
        indikator_renstra_id: i.id,
        sumber_tarikan: 'renstra',

        id_ddd: '',
        id_ddp: '',
        sumber_referensi: susunSumberReferensi(i, renstra),
        kode_indikator: bersih(i.kode_indikator),
        nama_indikator: namaIndikator || bersih(i.nama_indikator),
        nama_data: bersih(i.nama_indikator),
        jenis_data: 'statistik',
        indikator_variabel: STAGE_INDIKATOR.has(i.stage) ? 'indikator' : 'variabel',
        kode_standar_data: '',
        produsen_data: namaOpd,
        klasifikasi_risiko: 'terbuka',
        definisi: bersih(i.definisi_operasional),
        satuan: bersih(i.satuan),
        klasifikasi_penyajian: '',
        jadwal_pemutakhiran: 'tahunan',
        kategori_rad: '',
        kode_metadata: '',
        link_portal_daerah: '',
        link_portal_sdi: '',

        metode_pengumpulan: metodePengumpulan(i),
        periode_data:
          renstra.tahun_mulai && renstra.tahun_akhir
            ? `${renstra.tahun_mulai}-${renstra.tahun_akhir}`
            : tahun,
        penanggung_jawab: bersih(i.penanggung_jawab) || namaOpd,
        status: 'draft',
        catatan: `Ditarik otomatis dari indikator Renstra level ${i.stage}.`,
      });

      // Kolom di luar Renstra langsung diisi usulan mesin auto-fill supaya
      // baris hasil tarikan tidak lahir dalam keadaan setengah kosong.
      // Usulan berkeyakinan "rendah" (tautan portal) sengaja tidak ikut —
      // tautan yang belum tentu ada lebih berbahaya daripada sel kosong.
      const baris = draft[draft.length - 1];
      // i adalah instance Sequelize; sebarannya harus lewat get({plain:true})
      // agar kolom referensi dan sumber_data benar-benar terbaca mesin auto-fill.
      const konteksIndikator = {
        ...i.get({ plain: true }),
        kode_nomenklatur: kodeNomenklaturDari(i),
      };
      const saran = usulkanBaris(baris, konteksIndikator, {
        nomorMulai: idx + 1,
        urusanBaku,
        portalDaerah: opsi.portalDaerah,
        usulkanPortalSdi: opsi.usulkanPortalSdi === true,
      });

      Object.entries(saran).forEach(([kolom, u]) => {
        if (u.keyakinan === 'kosong') return;
        if (u.keyakinan === 'rendah' && !opsi.sertakanKeyakinanRendah) return;
        if (bersih(u.nilai)) baris[kolom] = u.nilai;
        if (u.id_ddp_status) baris.id_ddp_status = u.id_ddp_status;
      });
    });

  return { renstra, draft };
}

/** Simpan draft hasil tarikan; nomor urut melanjutkan baris yang sudah ada. */
async function tarikDanSimpan(renstraId, opsi = {}) {
  const { draft } = await susunDraft(renstraId, opsi);
  if (!draft.length) return { tersimpan: 0, data: [] };

  const tahun = draft[0].tahun;
  const terakhir = (await SdiDaftarData.max('urutan', { where: { renstra_id: renstraId, tahun } })) || 0;

  // ID DDD mengikuti nomor urut final agar identitas baris tidak berubah
  // ketika penarikan dilakukan bertahap pada tahun yang sama.
  const data = await SdiDaftarData.bulkCreate(
    draft.map((row, i) => {
      const urutan = Number(terakhir) + i + 1;
      return { ...row, urutan, id_ddd: String(urutan) };
    }),
  );
  return { tersimpan: data.length, data };
}

module.exports = { susunDraft, tarikDanSimpan, STAGE_DEFAULT, STAGE_INDIKATOR };
