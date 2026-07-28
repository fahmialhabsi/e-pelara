// backend/controllers/renstraReviewKonsistensiController.js
'use strict';

const {
  RenstraReviewKonsistensi,
  RenstraTujuan,
  RenstraSasaran,
  RenstraStrategi,
  RenstraKebijakan,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
} = require('../models');

/**
 * Peta objek reviu → model, kolom FK induk, dan level induknya.
 * Dipakai oleh aksi "terapkan" untuk memindahkan record ke induk baru.
 * `tujuan` sengaja tidak punya entri: induknya (Misi) berada di luar Renstra OPD,
 * jadi pemindahannya tidak boleh diotomatiskan dari modul ini.
 */
const PETA_OBJEK = {
  sasaran: {
    model: () => RenstraSasaran,
    fk: 'tujuan_id',
    parentLevel: 'tujuan',
    kodeField: 'nomor',
    bolehSesuaikanKode: true,
  },
  strategi: {
    model: () => RenstraStrategi,
    fk: 'sasaran_id',
    parentLevel: 'sasaran',
    kodeField: 'kode_strategi',
    bolehSesuaikanKode: true,
  },
  arah_kebijakan: {
    model: () => RenstraKebijakan,
    fk: 'strategi_id',
    parentLevel: 'strategi',
    kodeField: 'kode_kebjkn',
    bolehSesuaikanKode: true,
  },
  // Program/Kegiatan/Sub Kegiatan memakai nomenklatur baku Kepmendagri 050-5889/2021.
  // Kodenya TIDAK BOLEH dinomori ulang oleh modul reviu — hanya posisi induknya
  // yang berubah, sedangkan kode tetap mengikuti nomenklatur resmi.
  program: {
    model: () => RenstraProgram,
    fk: 'kebijakan_id',
    parentLevel: 'arah_kebijakan',
    kodeField: 'kode_program',
    bolehSesuaikanKode: false,
  },
  kegiatan: {
    model: () => RenstraKegiatan,
    fk: 'program_id',
    parentLevel: 'program',
    kodeField: 'kode_kegiatan',
    bolehSesuaikanKode: false,
  },
  sub_kegiatan: {
    model: () => RenstraSubkegiatan,
    fk: 'kegiatan_id',
    parentLevel: 'kegiatan',
    kodeField: 'kode_sub_kegiatan',
    bolehSesuaikanKode: false,
  },
};

/**
 * Susun kode baru dengan meniru pola saudara kandung di induk baru.
 * Contoh: induk baru berisi AKR-01-03.2.2.01 dan AKR-01-03.2.2.02,
 * maka objek yang dipindahkan mendapat AKR-01-03.2.2.03.
 * Mengembalikan null bila pola tidak dapat disimpulkan (mis. induk baru masih
 * kosong) — dalam hal itu kode lama sengaja dibiarkan apa adanya daripada ditebak.
 */
function hitungKodeBaru(kodeSaudara) {
  const valid = (kodeSaudara || []).filter((k) => typeof k === 'string' && /\.\d+$/.test(k));
  if (!valid.length) return null;

  const basis = valid[0].replace(/\.\d+$/, '');
  const lebar = valid[0].match(/\.(\d+)$/)[1].length;
  const tertinggi = valid
    .filter((k) => k.startsWith(`${basis}.`))
    .reduce((max, k) => {
      const n = Number(k.match(/\.(\d+)$/)?.[1] || 0);
      return n > max ? n : max;
    }, 0);

  return `${basis}.${String(tertinggi + 1).padStart(lebar, '0')}`;
}

const MODEL_PARENT = {
  tujuan: () => RenstraTujuan,
  sasaran: () => RenstraSasaran,
  strategi: () => RenstraStrategi,
  arah_kebijakan: () => RenstraKebijakan,
  program: () => RenstraProgram,
  kegiatan: () => RenstraKegiatan,
};

/** Hanya rekomendasi relokasi yang boleh dieksekusi otomatis. */
const JENIS_DAPAT_DITERAPKAN = ['pindahkan', 'ganti_program'];

const LABEL_LEVEL = {
  tujuan: 'Tujuan',
  sasaran: 'Sasaran',
  strategi: 'Strategi',
  arah_kebijakan: 'Arah Kebijakan',
  program: 'Program',
  kegiatan: 'Kegiatan',
  sub_kegiatan: 'Sub Kegiatan',
};

const MENU_LEVEL = {
  tujuan: 'Tujuan Renstra',
  sasaran: 'Sasaran Renstra',
  strategi: 'Strategi Renstra',
  arah_kebijakan: 'Arah Kebijakan Renstra',
  program: 'Program Renstra',
  kegiatan: 'Kegiatan Renstra',
  sub_kegiatan: 'Sub Kegiatan Renstra',
};

const tglIndo = (nilai) => {
  const d = nilai ? new Date(nilai) : new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const isSuperAdmin = (req) =>
  String(req.user?.role || req.user?.peran || '').toUpperCase() === 'SUPER_ADMIN';

/** Ambil "kode - uraian" dari record induk apa pun levelnya. */
async function labelInduk(level, id) {
  const ParentModel = MODEL_PARENT[level]?.();
  if (!ParentModel || !id) return '';
  const p = await ParentModel.findByPk(id);
  if (!p) return '';
  const kode = p.kode_strategi || p.kode_kebjkn || p.kode_program || p.nomor || p.no_tujuan || '';
  const uraian = p.deskripsi || p.nama_program || p.isi_sasaran || p.isi_tujuan || '';
  return `${LABEL_LEVEL[level] || level} ${kode} - ${uraian}`.trim();
}

/**
 * Susun Catatan Tindak Lanjut secara baku dari isian catatan reviu, agar
 * seluruh pereviu memakai rumusan dan urutan informasi yang sama.
 * Teks ini menjadi bagian dokumen reviu, sehingga konsistensinya dijaga di
 * sisi server — bukan diserahkan pada pengetikan bebas di form.
 */
async function susunCatatanTindakLanjut(row) {
  const labelLevel = LABEL_LEVEL[row.objek_level] || row.objek_level;
  const menu = MENU_LEVEL[row.objek_level] || 'modul Renstra terkait';
  const objek = `${labelLevel} ${row.objek_kode || ''} - ${row.objek_uraian || ''}`
    .replace(/\s+-\s+$/, '')
    .trim();
  const target =
    (await labelInduk(row.usulan_parent_level, row.usulan_parent_id)) || 'induk yang diusulkan';

  if (JENIS_DAPAT_DITERAPKAN.includes(row.jenis_rekomendasi)) {
    if (row.diterapkan_at) {
      const infoKode = row.kode_sebelum
        ? `, disertai penyesuaian kode dari ${row.kode_sebelum} menjadi ${row.objek_kode}`
        : '';
      return (
        `${objek} telah dipindahkan ke ${target} pada ${tglIndo(row.diterapkan_at)} melalui fitur ` +
        `Terapkan pada modul Reviu Konsistensi oleh ${row.diterapkan_oleh || '-'}${infoKode}. ` +
        `Hasil pemindahan diverifikasi pada menu ${menu} dan Daftar Program. ` +
        `Status diubah menjadi Selesai setelah verifikasi dinyatakan sesuai.`
      );
    }
    return (
      `Pemindahan ${objek} ke ${target} akan dieksekusi melalui tombol Terapkan pada modul ` +
      `Reviu Konsistensi. Setelah diterapkan, hasilnya diverifikasi pada menu ${menu} dan ` +
      `Daftar Program, kemudian status diubah menjadi Selesai.`
    );
  }

  if (row.jenis_rekomendasi === 'pecah') {
    return (
      `Pemecahan ${objek} dikerjakan manual melalui menu ${menu}: rumusan lama dipersempit ` +
      `sesuai butir pertama rekomendasi, lalu ditambahkan rumusan baru untuk butir berikutnya ` +
      `pada induk yang sama, dan masing-masing ditautkan ke Program yang sesuai nomenklatur. ` +
      `Status diubah menjadi Ditindaklanjuti setelah seluruh rumusan tersimpan, dan menjadi ` +
      `Selesai setelah diverifikasi pada dokumen Renstra Tabel T-C.26 dan T-C.27.`
    );
  }

  if (row.jenis_rekomendasi === 'gabungkan') {
    return (
      `Penggabungan ${objek} dikerjakan manual melalui menu ${menu}: rumusan yang tumpang tindih ` +
      `dilebur menjadi satu, tautan Program dan indikator turunannya dipindahkan ke rumusan hasil ` +
      `penggabungan, lalu rumusan yang tidak terpakai dihapus. Status diubah menjadi Ditindaklanjuti ` +
      `setelah penggabungan tersimpan, dan menjadi Selesai setelah diverifikasi pada dokumen Renstra.`
    );
  }

  if (row.jenis_rekomendasi === 'perbaiki_rumusan') {
    return (
      `Perbaikan rumusan ${objek} dikerjakan manual melalui menu ${menu} dengan mengubah uraiannya ` +
      `sesuai rekomendasi. Kode, induk, dan Program penaung tidak berubah sehingga tidak diperlukan ` +
      `penyesuaian nomenklatur. Status diubah menjadi Ditindaklanjuti setelah rumusan tersimpan, ` +
      `dan menjadi Selesai setelah diverifikasi pada dokumen Renstra Tabel T-C.26.`
    );
  }

  return (
    `Hasil reviu menyatakan ${objek} telah sesuai dengan kaidah penjabaran Renstra dan nomenklatur ` +
    `yang berlaku, sehingga tidak diperlukan tindak lanjut perbaikan. Catatan ini disimpan sebagai ` +
    `bukti dukung pelaksanaan reviu konsistensi.`
  );
}

/** Regenerasi catatan, kecuali sudah ditandai ditulis manual oleh SUPER_ADMIN. */
async function segarkanCatatan(id) {
  const row = await RenstraReviewKonsistensi.findByPk(id);
  if (!row || row.catatan_manual) return;
  const teks = await susunCatatanTindakLanjut(row);
  await RenstraReviewKonsistensi.update({ catatan_tindak_lanjut: teks }, { where: { id } });
}

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

exports.create = async (req, res) => {
  try {
    const renstraId = toInt(req.body.renstra_id);
    if (!renstraId) return res.status(400).json({ error: 'renstra_id wajib diisi' });
    if (!req.body.objek_level || !toInt(req.body.objek_id)) {
      return res.status(400).json({ error: 'objek_level dan objek_id wajib diisi' });
    }
    if (!req.body.jenis_rekomendasi) {
      return res.status(400).json({ error: 'jenis_rekomendasi wajib dipilih' });
    }
    if (!req.body.rekomendasi || !String(req.body.rekomendasi).trim()) {
      return res.status(400).json({ error: 'rekomendasi wajib diisi' });
    }

    // Catatan Tindak Lanjut hanya boleh ditulis manual oleh SUPER_ADMIN.
    // Untuk peran lain, teks apa pun dari klien diabaikan dan disusun ulang server-side.
    const manual = isSuperAdmin(req) && req.body.catatan_manual === true;

    const data = await RenstraReviewKonsistensi.create({
      ...req.body,
      catatan_manual: manual,
      catatan_tindak_lanjut: manual ? req.body.catatan_tindak_lanjut : null,
      renstra_id: renstraId,
      objek_id: toInt(req.body.objek_id),
      usulan_parent_id: toInt(req.body.usulan_parent_id),
      dasar_hukum: Array.isArray(req.body.dasar_hukum) ? req.body.dasar_hukum : [],
    });

    await segarkanCatatan(data.id);
    res.status(201).json(await RenstraReviewKonsistensi.findByPk(data.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.renstra_id) where.renstra_id = toInt(req.query.renstra_id);
    if (req.query.objek_level) where.objek_level = req.query.objek_level;
    if (req.query.status) where.status = req.query.status;

    const data = await RenstraReviewKonsistensi.findAll({
      where,
      order: [
        ['objek_level', 'ASC'],
        ['objek_kode', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await RenstraReviewKonsistensi.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await RenstraReviewKonsistensi.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const payload = { ...req.body };
    if (payload.usulan_parent_id !== undefined) {
      payload.usulan_parent_id = toInt(payload.usulan_parent_id);
    }
    if (payload.dasar_hukum !== undefined && !Array.isArray(payload.dasar_hukum)) {
      payload.dasar_hukum = [];
    }
    // Jejak penerapan tidak boleh ditimpa lewat form biasa.
    delete payload.parent_id_sebelum;
    delete payload.diterapkan_at;
    delete payload.diterapkan_oleh;
    delete payload.kode_sebelum;

    // Hanya SUPER_ADMIN yang boleh menulis catatan manual.
    const manual = isSuperAdmin(req) && payload.catatan_manual === true;
    payload.catatan_manual = manual;
    if (!manual) delete payload.catatan_tindak_lanjut;

    await RenstraReviewKonsistensi.update(payload, { where: { id: req.params.id } });
    await segarkanCatatan(req.params.id);
    res.json(await RenstraReviewKonsistensi.findByPk(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const jumlah = await RenstraReviewKonsistensi.destroy({ where: { id: req.params.id } });
    if (!jumlah) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json({ message: 'Data reviu berhasil dihapus' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Terapkan rekomendasi relokasi: pindahkan objek ke induk baru.
 * Sengaja dibatasi pada jenis pindahkan/ganti_program — rekomendasi pecah,
 * gabungkan, dan perbaiki rumusan melahirkan/meleburkan record beserta kode
 * dan turunannya, sehingga harus dikerjakan manual lewat form masing-masing.
 */
exports.terapkan = async (req, res) => {
  try {
    const row = await RenstraReviewKonsistensi.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Data tidak ditemukan' });

    if (!JENIS_DAPAT_DITERAPKAN.includes(row.jenis_rekomendasi)) {
      return res.status(400).json({
        error:
          'Rekomendasi jenis ini tidak dapat diterapkan otomatis. Lakukan perubahan lewat form ' +
          'objek terkait, lalu ubah status reviu menjadi "ditindaklanjuti".',
      });
    }
    if (row.diterapkan_at) {
      return res.status(400).json({ error: 'Rekomendasi ini sudah pernah diterapkan' });
    }

    const peta = PETA_OBJEK[row.objek_level];
    if (!peta) {
      return res
        .status(400)
        .json({ error: `Objek level "${row.objek_level}" tidak mendukung pemindahan otomatis` });
    }

    const parentId = toInt(row.usulan_parent_id);
    if (!parentId) {
      return res.status(400).json({ error: 'usulan_parent_id belum diisi pada catatan reviu ini' });
    }

    const Model = peta.model();
    const objek = await Model.findByPk(row.objek_id);
    if (!objek) {
      return res.status(404).json({ error: 'Record objek reviu sudah tidak ada di Renstra' });
    }

    // Induk tujuan wajib ada dan berada di Renstra yang sama — mencegah
    // objek berpindah ke Renstra/OPD/tahun lain secara tidak sengaja.
    const ParentModel = MODEL_PARENT[peta.parentLevel]?.();
    if (!ParentModel) {
      return res.status(400).json({ error: 'Model induk tidak dikenali' });
    }
    const parent = await ParentModel.findByPk(parentId);
    if (!parent) {
      return res.status(404).json({ error: 'Induk tujuan pemindahan tidak ditemukan' });
    }
    if (parent.renstra_id != null && Number(parent.renstra_id) !== Number(row.renstra_id)) {
      return res
        .status(400)
        .json({ error: 'Induk tujuan pemindahan berada di Renstra yang berbeda' });
    }

    const nilaiSebelum = objek[peta.fk];
    await Model.update({ [peta.fk]: parentId }, { where: { id: row.objek_id } });

    // Penyesuaian kode mengikuti pola saudara kandung di induk baru, agar urutan
    // pada daftar dan dokumen tetap rapi. Hanya untuk kode internal Renstra.
    let kodeSebelum = null;
    let kodeBaru = null;
    if (row.sesuaikan_kode && peta.bolehSesuaikanKode && peta.kodeField) {
      const saudara = await Model.findAll({
        where: { [peta.fk]: parentId },
        attributes: ['id', peta.kodeField],
        raw: true,
      });
      kodeBaru = hitungKodeBaru(
        saudara.filter((s) => Number(s.id) !== Number(row.objek_id)).map((s) => s[peta.kodeField]),
      );
      if (kodeBaru) {
        kodeSebelum = objek[peta.kodeField];
        await Model.update({ [peta.kodeField]: kodeBaru }, { where: { id: row.objek_id } });
      }
    }

    await RenstraReviewKonsistensi.update(
      {
        parent_id_sebelum: nilaiSebelum,
        kode_sebelum: kodeSebelum,
        // Snapshot ikut diperbarui agar catatan reviu menampilkan kode terkini.
        ...(kodeBaru ? { objek_kode: kodeBaru } : {}),
        status: 'ditindaklanjuti',
        diterapkan_at: new Date(),
        diterapkan_oleh: req.user?.nama || req.user?.username || req.user?.email || 'sistem',
      },
      { where: { id: row.id } },
    );

    await segarkanCatatan(row.id);

    const pesanKode = kodeBaru ? `, kode: ${kodeSebelum} → ${kodeBaru}` : '';
    // Pemindahan hanya mengubah induk Renstra (strategi_id). Tautan ke dokumen
    // RPJMD (rpjmd_arah_id) tidak ikut berpindah dan tidak dapat disimpulkan
    // otomatis, padahal dropdown pada form Program memfilter berdasarkan kolom itu.
    const pesanRpjmd =
      row.objek_level === 'arah_kebijakan'
        ? ' PERHATIAN: buka menu Arah Kebijakan Renstra dan pilih ulang Arah Kebijakan RPJMD agar sesuai induk baru, jika tidak arah kebijakan ini tidak akan muncul pada dropdown form Program.'
        : '';
    res.json({
      message: `Objek berhasil dipindahkan (${peta.fk}: ${nilaiSebelum ?? '-'} → ${parentId}${pesanKode}).${pesanRpjmd}`,
      data: await RenstraReviewKonsistensi.findByPk(row.id),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/** Kembalikan objek ke induk semula menggunakan parent_id_sebelum. */
exports.batalkanTerapan = async (req, res) => {
  try {
    const row = await RenstraReviewKonsistensi.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Data tidak ditemukan' });
    if (!row.diterapkan_at) {
      return res.status(400).json({ error: 'Rekomendasi ini belum pernah diterapkan' });
    }

    const peta = PETA_OBJEK[row.objek_level];
    if (!peta) return res.status(400).json({ error: 'Objek level tidak mendukung pembatalan' });

    await peta.model().update(
      {
        [peta.fk]: row.parent_id_sebelum ?? null,
        // Kode ikut dikembalikan bila sebelumnya sempat dinomori ulang.
        ...(row.kode_sebelum && peta.kodeField ? { [peta.kodeField]: row.kode_sebelum } : {}),
      },
      { where: { id: row.objek_id } },
    );

    await RenstraReviewKonsistensi.update(
      {
        status: 'disetujui',
        parent_id_sebelum: null,
        ...(row.kode_sebelum ? { objek_kode: row.kode_sebelum } : {}),
        kode_sebelum: null,
        diterapkan_at: null,
        diterapkan_oleh: null,
      },
      { where: { id: row.id } },
    );

    await segarkanCatatan(row.id);

    res.json({
      message: 'Penerapan dibatalkan, objek dikembalikan ke induk semula',
      data: await RenstraReviewKonsistensi.findByPk(row.id),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
