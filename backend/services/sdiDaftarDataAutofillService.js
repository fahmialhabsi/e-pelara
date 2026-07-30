// backend/services/sdiDaftarDataAutofillService.js
'use strict';

/**
 * Mesin pengisian otomatis kolom Daftar Data Daerah yang sumbernya berada di
 * luar Renstra: (1) ID DDD, (2) ID DDP, (9) Kode Standar Data,
 * (14) Klasifikasi Penyajian, (16) Kategori RAD, (17) Kode Metadata,
 * (18) Link Portal Daerah, dan (19) Link Portal SDI.
 *
 * Mesin ini TIDAK menebak. Setiap usulan disertai `alasan` dan `keyakinan`,
 * dan kolom yang tidak dapat disimpulkan dikembalikan sebagai usulan kosong
 * dengan catatan apa yang harus dilakukan pengguna. Pengguna menyetujui atau
 * menyesuaikan usulan lewat pratinjau sebelum apa pun tersimpan.
 *
 * Tentang kolom (2): Lampiran menyatakan ID DDP "dapat dikosongkan jika tidak
 * mengacu ke Data Pusat". Karena itu kolom kosong yang sudah dipastikan tidak
 * mengacu BUKAN kekurangan — statusnya direkam pada `id_ddp_status` supaya
 * rapor kelengkapan tidak lagi menandainya merah.
 */

const {
  PADANAN_DATA_PRIORITAS,
  ATURAN_PENYAJIAN,
  POLA_GEOSPASIAL,
  POLA_TATA_KELOLA,
  POLA_METADATA_RESMI,
  RAD_PENUNJANG,
  kategoriRad,
  slugkan,
} = require('./sdiKatalogReferensi');

const {
  SdiDaftarData,
  IndikatorRenstra,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
} = require('../models');

const bersih = (v) => (v == null ? '' : String(v).trim());
const kosong = (v) => bersih(v) === '';

/** Kolom yang ditangani mesin ini, berikut nomor atributnya di Lampiran. */
const KOLOM_AUTOFILL = [
  { key: 'id_ddd', no: 1, label: 'ID DDD' },
  { key: 'id_ddp', no: 2, label: 'ID DDP' },
  { key: 'kode_standar_data', no: 9, label: 'Kode Standar Data' },
  { key: 'klasifikasi_penyajian', no: 14, label: 'Klasifikasi Penyajian' },
  { key: 'kategori_rad', no: 16, label: 'Kategori RAD' },
  { key: 'kode_metadata', no: 17, label: 'Kode Metadata' },
  { key: 'link_portal_daerah', no: 18, label: 'Link Portal Daerah' },
  { key: 'link_portal_sdi', no: 19, label: 'Link Portal SDI' },
];

const usulan = (nilai, keyakinan, alasan, tambahan = {}) => ({
  nilai,
  keyakinan, // 'tinggi' | 'sedang' | 'rendah' | 'kosong'
  alasan,
  ...tambahan,
});

/**
 * Kumpulkan konteks Renstra tiap baris: kode program penaung dan daftar
 * referensi indikator asalnya. Dipetakan sekaligus agar tidak memicu query
 * beruntun saat baris berjumlah puluhan.
 */
async function muatKonteks(rows) {
  const indikatorIds = [...new Set(rows.map((r) => Number(r.indikator_renstra_id)).filter(Boolean))];
  if (!indikatorIds.length) return new Map();

  const indikator = await IndikatorRenstra.findAll({
    where: { id: indikatorIds },
    attributes: ['id', 'stage', 'ref_id', 'referensi', 'sumber_data', 'lokasi'],
    raw: true,
  });

  const perStage = indikator.reduce((acc, i) => {
    (acc[i.stage] = acc[i.stage] || []).push(Number(i.ref_id));
    return acc;
  }, {});

  const [program, kegiatan, subKegiatan] = await Promise.all([
    perStage.program?.length
      ? RenstraProgram.findAll({
          where: { id: perStage.program },
          attributes: ['id', 'kode_program'],
          raw: true,
        })
      : [],
    perStage.kegiatan?.length
      ? RenstraKegiatan.findAll({
          where: { id: perStage.kegiatan },
          attributes: ['id', 'kode_kegiatan'],
          raw: true,
        })
      : [],
    perStage.sub_kegiatan?.length
      ? RenstraSubkegiatan.findAll({
          where: { id: perStage.sub_kegiatan },
          attributes: ['id', 'kode_sub_kegiatan'],
          raw: true,
        })
      : [],
  ]);

  const kodePer = {
    program: new Map(program.map((p) => [Number(p.id), p.kode_program])),
    kegiatan: new Map(kegiatan.map((k) => [Number(k.id), k.kode_kegiatan])),
    sub_kegiatan: new Map(subKegiatan.map((s) => [Number(s.id), s.kode_sub_kegiatan])),
  };

  return new Map(
    indikator.map((i) => [
      Number(i.id),
      { ...i, kode_nomenklatur: kodePer[i.stage]?.get(Number(i.ref_id)) || null },
    ]),
  );
}

/** Cari tautan metadata BPS pada kolom referensi maupun rangkuman sumber data. */
function cariTautanMetadata(konteks) {
  const kandidat = [];
  const ref = Array.isArray(konteks?.referensi) ? konteks.referensi : [];
  ref.forEach((r) => kandidat.push(typeof r === 'string' ? r : r?.url || r?.judul || r?.teks || ''));
  kandidat.push(bersih(konteks?.sumber_data));

  for (const teks of kandidat) {
    const m = String(teks || '').match(POLA_METADATA_RESMI);
    if (m) return m[0];
  }
  return null;
}

/**
 * Susun usulan untuk satu baris.
 *
 * @param {object} row      Baris Daftar Data
 * @param {object} konteks  Indikator Renstra asal (boleh null untuk baris manual)
 * @param {object} opsi     { nomorMulai, urusanBaku, portalDaerah, usulkanPortalSdi }
 */
function usulkanBaris(row, konteks, opsi = {}) {
  const namaData = bersih(row.nama_data);
  // Penyimpulan hanya membaca nomenklatur, bukan definisi. Definisi berisi
  // kalimat panjang yang kata-katanya kerap memicu kecocokan palsu.
  const gabungan = `${namaData} ${bersih(row.nama_indikator)}`;
  const hasil = {};

  // (1) ID DDD — identitas unik internal, aman dinomori otomatis.
  hasil.id_ddd = usulan(
    String(opsi.nomorMulai ?? row.urutan ?? ''),
    'tinggi',
    'Nomor urut baris pada Daftar Data OPD tahun berjalan.',
  );

  // (2) ID DDP — hanya diisi bila ada padanan Data Prioritas yang tercatat.
  const padanan = PADANAN_DATA_PRIORITAS.find((p) => p.pola.test(gabungan));
  hasil.id_ddp = padanan
    ? usulan(padanan.id_ddp, 'sedang', `Padanan Data Prioritas "${padanan.nama}" (${padanan.sumber}).`, {
        id_ddp_status: 'mengacu',
      })
    : usulan(
        '',
        'sedang',
        'Tidak ditemukan padanan pada katalog Data Prioritas. Lampiran mengizinkan kolom ini dikosongkan bila data tidak mengacu ke Data Pusat — baris ditandai "tidak mengacu" agar tidak terhitung sebagai kekurangan. Cocokkan ulang pada daftar Bappenas bila ragu.',
        { id_ddp_status: 'tidak_mengacu' },
      );

  // (7) Jenis Data ikut disimpulkan karena menentukan standar mana yang dipakai
  // pada kolom (9): SDS untuk statistik, KUGI untuk geospasial.
  const geospasial = POLA_GEOSPASIAL.test(gabungan);

  // (9) Kode Standar Data — "N/A" adalah jawaban sah menurut Lampiran, dan
  // dipakai sebagai nilai baku. Nomor indikator BPS yang terbaca dari referensi
  // TIDAK dijadikan nilai utama: nomor pada SIRUSA belum tentu identik dengan
  // kode SDS pada INDAH, dan kolom ini ikut dinilai saat verifikasi. Nomor itu
  // ditawarkan sebagai alternatif agar pengguna bisa menerimanya sekali klik
  // bila memang sudah dicocokkan.
  const tautanMetadata = cariTautanMetadata(konteks);
  const idSirusa = tautanMetadata?.match(/indikator\/(\d+)/)?.[1];
  hasil.kode_standar_data = usulan(
    'N/A',
    'tinggi',
    geospasial
      ? 'Belum ada padanan unsur KUGI yang tercatat. Lampiran mengizinkan pengisian "N/A" bila data belum ada standarnya.'
      : 'Belum ada padanan Standar Data Statistik yang tercatat. Lampiran mengizinkan pengisian "N/A" bila data belum ada standarnya.',
    idSirusa
      ? {
          alternatif: {
            nilai: idSirusa,
            alasan: `Nomor indikator ${idSirusa} terbaca dari tautan metadata BPS pada referensi indikator. Pakai nilai ini hanya bila sudah dipastikan sama dengan kode SDS pada INDAH.`,
          },
        }
      : {},
  );

  // (14) Klasifikasi Penyajian — disimpulkan dari nomenklatur data. Nama data
  // sendiri diperiksa lebih dulu; nama indikator induk baru dipakai bila nama
  // data tidak memberi petunjuk, agar sifat induk tidak menular ke turunannya.
  const aturan =
    ATURAN_PENYAJIAN.find((a) => a.pola.test(namaData)) ||
    ATURAN_PENYAJIAN.find((a) => a.pola.test(gabungan));
  hasil.klasifikasi_penyajian = aturan
    ? usulan(aturan.nilai, 'sedang', `Disimpulkan karena ${aturan.alasan}.`)
    : usulan(
        'Provinsi',
        'sedang',
        'Tidak ada penanda rincian wilayah atau kategori pada nomenklatur data; produsen data adalah perangkat daerah provinsi sehingga penyajian baku adalah tingkat Provinsi.',
      );

  // (16) Kategori RAD — dari urusan pemerintahan penaung, kecuali indikator
  // tata kelola internal yang datanya bersifat administratif.
  const kodeNomenklatur = konteks?.kode_nomenklatur || opsi.urusanBaku;
  const tataKelola = POLA_TATA_KELOLA.test(gabungan);
  const rad = tataKelola ? RAD_PENUNJANG : kategoriRad(kodeNomenklatur);
  hasil.kategori_rad = rad
    ? usulan(
        rad,
        'sedang',
        tataKelola
          ? 'Indikator tata kelola internal perangkat daerah, sehingga datanya masuk kategori administrasi pemerintahan — bukan urusan teknis OPD. Cocokkan dengan daftar RAD pada SISAE SPBE sebelum difinalkan.'
          : `Diturunkan dari urusan pada kode nomenklatur ${kodeNomenklatur}. Cocokkan dengan daftar RAD pada SISAE SPBE sebelum difinalkan.`,
      )
    : usulan(
        '',
        'kosong',
        'Kode urusan tidak dapat disimpulkan dari indikator ini. Pilih kategori pada sisae.spbe.go.id/index.php/_RAD.',
      );

  // (17) Kode Metadata — tautan metadata BPS bila tersedia pada referensi.
  hasil.kode_metadata = tautanMetadata
    ? usulan(
        tautanMetadata,
        'sedang',
        'Tautan metadata BPS ditemukan pada daftar referensi indikator Renstra.',
      )
    : usulan(
        '',
        'kosong',
        geospasial
          ? 'Sertakan tautan berkas metadata geospasial. Belum ada tautan pada referensi indikator.'
          : 'Cari kode metadata pada indah.bps.go.id. Belum ada tautan metadata pada referensi indikator.',
      );

  // (18) Link Portal Daerah — hanya diusulkan bila alamat portal diketahui,
  // supaya tidak lahir tautan mati yang justru gagal saat diverifikasi.
  const slug = slugkan(namaData);
  const basis = bersih(opsi.portalDaerah).replace(/\/+$/, '');
  hasil.link_portal_daerah = basis
    ? usulan(
        `${basis}/dataset/${slug}`,
        'rendah',
        'Tautan disusun dari alamat portal daerah dan nama data. Pastikan dataset benar-benar sudah diunggah dengan slug tersebut.',
      )
    : usulan(
        '',
        'kosong',
        'Alamat Portal Data Daerah belum diisi pada pengaturan pengisian otomatis, sehingga tautan tidak diusulkan.',
      );

  // (19) Link Portal SDI — portal nasional data.go.id disebut pada Lampiran.
  hasil.link_portal_sdi = opsi.usulkanPortalSdi
    ? usulan(
        `https://data.go.id/dataset/${slug}`,
        'rendah',
        'Pola tautan Portal SDI nasional. Baru sah setelah dataset benar-benar diunggah ke data.go.id.',
      )
    : usulan(
        '',
        'kosong',
        'Usulan tautan Portal SDI dimatikan pada pengaturan pengisian otomatis.',
      );

  return hasil;
}

/**
 * Susun pratinjau usulan untuk sekumpulan baris.
 *
 * @param {object} filter { renstra_id, tahun }
 * @param {object} opsi   { kolom, hanyaKosong, portalDaerah, usulkanPortalSdi }
 */
async function pratinjau(filter, opsi = {}) {
  const kolomDipilih =
    Array.isArray(opsi.kolom) && opsi.kolom.length
      ? KOLOM_AUTOFILL.filter((k) => opsi.kolom.includes(k.key))
      : KOLOM_AUTOFILL;
  const hanyaKosong = opsi.hanyaKosong !== false;

  const rows = await SdiDaftarData.findAll({
    where: filter,
    order: [
      ['urutan', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  const konteksMap = await muatKonteks(rows);

  // Urusan baku OPD dipakai sebagai cadangan bagi indikator level Tujuan/Sasaran
  // yang tidak punya kode nomenklatur Kepmendagri sendiri.
  const urusanBaku = await tebakUrusanBaku(filter.renstra_id);

  const hasil = rows.map((row, idx) => {
    const konteks = konteksMap.get(Number(row.indikator_renstra_id)) || null;
    const semua = usulkanBaris(row, konteks, {
      nomorMulai: row.urutan || idx + 1,
      urusanBaku,
      portalDaerah: opsi.portalDaerah,
      usulkanPortalSdi: opsi.usulkanPortalSdi === true,
    });

    const perubahan = kolomDipilih
      .map((k) => ({ ...k, ...semua[k.key] }))
      // Kolom yang sudah terisi tidak diusulkan ulang, kecuali pengguna
      // meminta penimpaan — isian manual pengguna lebih tepercaya.
      .filter((u) => (hanyaKosong ? kosong(row[u.key]) : true))
      // Usulan tetap ditampilkan bila nilainya berbeda dari isi sekarang, ATAU
      // bila ia hanya mengubah penanda status ID DDP (nilai kolomnya memang
      // tetap kosong, yang berubah adalah "belum dicek" menjadi "tidak mengacu").
      .filter((u) => {
        const nilaiBerubah = !kosong(u.nilai) && bersih(u.nilai) !== bersih(row[u.key]);
        const statusBerubah = u.id_ddp_status && u.id_ddp_status !== row.id_ddp_status;
        return nilaiBerubah || statusBerubah;
      });

    return {
      id: row.id,
      nama_data: row.nama_data,
      urutan: row.urutan,
      perubahan,
    };
  });

  return {
    total_baris: rows.length,
    baris_terdampak: hasil.filter((h) => h.perubahan.length).length,
    total_perubahan: hasil.reduce((a, h) => a + h.perubahan.length, 0),
    data: hasil,
  };
}

/** Simpulkan urusan OPD dari kode program yang paling sering dipakai. */
async function tebakUrusanBaku(renstraId) {
  if (!renstraId) return null;
  const program = await RenstraProgram.findAll({
    where: { renstra_id: renstraId },
    attributes: ['kode_program'],
    raw: true,
  });
  const hitung = new Map();
  program.forEach((p) => {
    const kode = bersih(p.kode_program);
    // Program penunjang (.01) dilewati agar tidak menutupi urusan teknis OPD.
    if (!kode || /^\d+\.\d+\.0*1\b/.test(kode)) return;
    hitung.set(kode, (hitung.get(kode) || 0) + 1);
  });
  const terbanyak = [...hitung.entries()].sort((a, b) => b[1] - a[1])[0];
  return terbanyak ? terbanyak[0] : null;
}

/**
 * Terapkan hasil pratinjau yang sudah disetujui pengguna.
 *
 * @param {Array} perubahan [{ id, nilai: { kolom: nilai }, id_ddp_status? }]
 */
async function terapkan(perubahan) {
  if (!Array.isArray(perubahan) || !perubahan.length) return { diperbarui: 0 };

  const kolomSah = new Set(KOLOM_AUTOFILL.map((k) => k.key));
  let diperbarui = 0;

  for (const item of perubahan) {
    const id = Number(item?.id);
    if (!id || !item?.nilai) continue;

    const payload = {};
    Object.entries(item.nilai).forEach(([key, val]) => {
      if (kolomSah.has(key)) payload[key] = val == null ? '' : String(val);
    });
    if (item.id_ddp_status) payload.id_ddp_status = item.id_ddp_status;
    if (!Object.keys(payload).length) continue;

    const [n] = await SdiDaftarData.update(payload, { where: { id } });
    diperbarui += n;
  }

  return { diperbarui };
}

module.exports = { KOLOM_AUTOFILL, pratinjau, terapkan, usulkanBaris, muatKonteks, tebakUrusanBaku };
