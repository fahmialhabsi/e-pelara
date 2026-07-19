async function getRincianSetelahPerubahan(dpaId) {
  const {
    Dpa,
    RkaRincianBelanja,
    DpaPergeseran,
    DpaPergeseranItem,
    DpaPerubahan,
    DpaPerubahanItem,
  } = require('../models');
  const dpa = await Dpa.findByPk(dpaId);
  if (!dpa) return null;

  // 1. Ambil rincian ASLI (Sebelum) dari rka_rincian_belanja
  const rincianSebelum = await RkaRincianBelanja.findAll({
    where: { rka_id: dpa.rka_id },
    order: [['urutan', 'ASC']],
  });

  const sebelumMap = {};
  rincianSebelum.forEach((r) => {
    const kode = r.kode_rekening;
    if (!sebelumMap[kode]) {
      sebelumMap[kode] = { kode_rekening: kode, nama_rekening: r.nama_rekening, jumlah: 0 };
    }
    sebelumMap[kode].jumlah += Number(r.jumlah || 0);
  });

  // 2. Ambil semua pergeseran DISETUJUI (lintas DPA, karena dana bisa pindah antar DPA)
  const pergeseranList = await DpaPergeseran.findAll({
    where: { status: 'DISETUJUI' },
    order: [['nomor_pergeseran', 'ASC']],
    include: [{ model: DpaPergeseranItem, as: 'items' }],
  });

  // 2b. Ambil perubahan anggaran DISETUJUI milik DPA ini sendiri (bukan lintas DPA —
  //     perubahan APBD-P levelnya per-DPA, beda dengan pergeseran yang bisa lintas sub kegiatan)
  const perubahanDisetujui = await DpaPerubahan.findOne({
    where: { dpa_id: dpaId, status: 'DISETUJUI' },
    include: [{ model: DpaPerubahanItem, as: 'items' }],
  });

  // 3. Bangun override "Setelah" per kode_rekening — HANYA yang relevan dengan DPA ini:
  //    - KURANG milik pergeseran DPA ini sendiri (dana keluar dari kode rekening DPA ini)
  //    - TAMBAH yang dpa_tujuan_id = DPA ini (dana masuk, baik dari DPA sendiri maupun DPA lain)
  const deltaMap = {}; // per kode_rekening: akumulasi selisih (jumlah_menjadi - jumlah_semula)
  pergeseranList.forEach((perg) => {
    (perg.items || []).forEach((item) => {
      const isKurangMilikDpaIni = item.jenis === 'KURANG' && Number(perg.dpa_id) === Number(dpaId);
      const isTambahUntukDpaIni =
        item.jenis === 'TAMBAH' && Number(item.dpa_tujuan_id) === Number(dpaId);
      if (isKurangMilikDpaIni || isTambahUntukDpaIni) {
        const delta = Number(item.jumlah_menjadi || 0) - Number(item.jumlah_semula || 0);
        if (!deltaMap[item.kode_rekening]) {
          deltaMap[item.kode_rekening] = { delta: 0, nama_rekening: item.nama_rekening };
        }
        deltaMap[item.kode_rekening].delta += delta;
      }
    });
  });

  // 3b. Tambahkan delta dari Perubahan Anggaran (APBD-P) yang DISETUJUI
  if (perubahanDisetujui) {
    (perubahanDisetujui.items || []).forEach((item) => {
      const delta = Number(item.jumlah_sesudah || 0) - Number(item.jumlah_sebelum || 0);
      if (!deltaMap[item.kode_rekening]) {
        deltaMap[item.kode_rekening] = { delta: 0, nama_rekening: item.nama_rekening };
      }
      deltaMap[item.kode_rekening].delta += delta;
    });
  }

  // 4. Gabungkan Sebelum + delta pergeseran (kode baru dari TAMBAH otomatis masuk, Sebelum=0)
  const semuaKode = new Set([...Object.keys(sebelumMap), ...Object.keys(deltaMap)]);
  const hasil = [];
  semuaKode.forEach((kode) => {
    const sebelum = sebelumMap[kode] ? sebelumMap[kode].jumlah : 0;
    const delta = deltaMap[kode] ? deltaMap[kode].delta : 0;
    const namaRekening =
      (deltaMap[kode] && deltaMap[kode].nama_rekening) ||
      (sebelumMap[kode] && sebelumMap[kode].nama_rekening) ||
      kode;
    const setelah = sebelum + delta;
    hasil.push({
      kode_rekening: kode,
      nama_rekening: namaRekening,
      jumlah_sebelum: sebelum,
      jumlah_setelah: setelah,
      bertambah_berkurang: setelah - sebelum,
    });
  });

  hasil.sort((a, b) => a.kode_rekening.localeCompare(b.kode_rekening));
  return hasil;
}

async function syncDpaTotalSetelahPerubahan(dpaId) {
  const { Dpa } = require('../models');
  const dpa = await Dpa.findByPk(dpaId);
  if (!dpa) return;
  const rincian = await getRincianSetelahPerubahan(dpaId);
  const totalSetelah = rincian.reduce((s, r) => s + r.jumlah_setelah, 0);
  await dpa.update({ anggaran: totalSetelah, pagu_total: totalSetelah });
}

async function getRincianDetailUntukPerubahan(dpaId) {
  const {
    Dpa,
    RkaRincianBelanja,
    DpaPergeseran,
    DpaPergeseranItem,
    DpaPerubahan,
    DpaPerubahanItem,
  } = require('../models');
  const dpa = await Dpa.findByPk(dpaId);
  if (!dpa) return null;

  const buatKey = (kode, uraian) => `${kode}|${(uraian || '').trim()}`;

  // 1. Rincian ASLI per kode_rekening + uraian (level item, bukan agregat kode saja)
  const rincianSebelum = await RkaRincianBelanja.findAll({
    where: { rka_id: dpa.rka_id },
    order: [['urutan', 'ASC']],
  });

  const sebelumMap = {};
  rincianSebelum.forEach((r) => {
    const key = buatKey(r.kode_rekening, r.uraian);
    if (!sebelumMap[key]) {
      sebelumMap[key] = {
        kode_rekening: r.kode_rekening,
        nama_rekening: r.nama_rekening,
        uraian: r.uraian,
        jumlah: 0,
        volume: Number(r.volume || 0),
        satuan: r.satuan || '',
        harga_satuan: Number(r.harga_satuan || 0),
      };
    }
    sebelumMap[key].jumlah += Number(r.jumlah || 0);
  });

  // 2. Delta dari Pergeseran DISETUJUI yang relevan dengan DPA ini, per kode+uraian
  const pergeseranList = await DpaPergeseran.findAll({
    where: { status: 'DISETUJUI' },
    order: [['nomor_pergeseran', 'ASC']],
    include: [{ model: DpaPergeseranItem, as: 'items' }],
  });

  const perubahanDisetujui = await DpaPerubahan.findOne({
    where: { dpa_id: dpaId, status: 'DISETUJUI' },
    include: [{ model: DpaPerubahanItem, as: 'items' }],
  });

  const deltaMap = {};
  const volumeOverrideMap = {}; // key -> { volume, satuan, harga_satuan } dari perubahan terbaru yang mengisi data ini

  pergeseranList.forEach((perg) => {
    (perg.items || []).forEach((item) => {
      const isKurangMilikDpaIni = item.jenis === 'KURANG' && Number(perg.dpa_id) === Number(dpaId);
      const isTambahUntukDpaIni =
        item.jenis === 'TAMBAH' && Number(item.dpa_tujuan_id) === Number(dpaId);
      if (isKurangMilikDpaIni || isTambahUntukDpaIni) {
        const key = buatKey(item.kode_rekening, item.uraian);
        const delta = Number(item.jumlah_menjadi || 0) - Number(item.jumlah_semula || 0);
        if (!deltaMap[key]) {
          deltaMap[key] = {
            delta: 0,
            kode_rekening: item.kode_rekening,
            nama_rekening: item.nama_rekening,
            uraian: item.uraian,
          };
        }
        deltaMap[key].delta += delta;
        // Hanya override volume/harga jika form Pergeseran sudah mengisi data ini (belum 0 semua)
        const adaDataVolume =
          Number(item.volume_menjadi || 0) > 0 || Number(item.harga_satuan_menjadi || 0) > 0;
        if (adaDataVolume) {
          volumeOverrideMap[key] = {
            volume: Number(item.volume_menjadi || 0),
            satuan: item.satuan_menjadi || '',
            harga_satuan: Number(item.harga_satuan_menjadi || 0),
          };
        }
      }
    });
  });

  if (perubahanDisetujui) {
    (perubahanDisetujui.items || []).forEach((item) => {
      const key = buatKey(item.kode_rekening, item.uraian);
      const delta = Number(item.jumlah_sesudah || 0) - Number(item.jumlah_sebelum || 0);
      if (!deltaMap[key]) {
        deltaMap[key] = {
          delta: 0,
          kode_rekening: item.kode_rekening,
          nama_rekening: item.nama_rekening,
          uraian: item.uraian,
        };
      }
      deltaMap[key].delta += delta;
      const adaDataVolume =
        Number(item.volume_sesudah || 0) > 0 || Number(item.harga_satuan_sesudah || 0) > 0;
      if (adaDataVolume) {
        volumeOverrideMap[key] = {
          volume: Number(item.volume_sesudah || 0),
          satuan: item.satuan_sesudah || '',
          harga_satuan: Number(item.harga_satuan_sesudah || 0),
        };
      }
    });
  }

  // 3. Gabungkan
  const semuaKey = new Set([...Object.keys(sebelumMap), ...Object.keys(deltaMap)]);
  const hasil = [];
  semuaKey.forEach((key) => {
    const s = sebelumMap[key];
    const d = deltaMap[key];
    const sebelum = s ? s.jumlah : 0;
    const delta = d ? d.delta : 0;
    const override = volumeOverrideMap[key];
    hasil.push({
      kode_rekening: (s && s.kode_rekening) || (d && d.kode_rekening),
      nama_rekening: (s && s.nama_rekening) || (d && d.nama_rekening),
      uraian: (s && s.uraian) || (d && d.uraian) || '',
      jumlah: sebelum + delta,
      volume: override ? override.volume : s ? s.volume : 0,
      satuan: override ? override.satuan : s ? s.satuan : '',
      harga_satuan: override ? override.harga_satuan : s ? s.harga_satuan : 0,
    });
  });

  hasil.sort((a, b) => a.kode_rekening.localeCompare(b.kode_rekening));
  return hasil;
}

async function getRincianLengkapUntukCetak(dpaId) {
  const {
    Dpa,
    RkaRincianBelanja,
    DpaPergeseran,
    DpaPergeseranItem,
    DpaPerubahan,
    DpaPerubahanItem,
  } = require('../models');
  const dpa = await Dpa.findByPk(dpaId);
  if (!dpa) return null;

  const buatKey = (kode, uraian) => `${kode}|${(uraian || '').trim()}`;

  const rincianSebelum = await RkaRincianBelanja.findAll({
    where: { rka_id: dpa.rka_id },
    order: [['urutan', 'ASC']],
  });

  const sebelumMap = {};
  rincianSebelum.forEach((r) => {
    const key = buatKey(r.kode_rekening, r.uraian);
    if (!sebelumMap[key]) {
      sebelumMap[key] = {
        kode_rekening: r.kode_rekening,
        nama_rekening: r.nama_rekening,
        uraian: r.uraian,
        jumlah: 0,
        volume: Number(r.volume || 0),
        satuan: r.satuan || '',
        harga_satuan: Number(r.harga_satuan || 0),
      };
    }
    sebelumMap[key].jumlah += Number(r.jumlah || 0);
  });

  const pergeseranList = await DpaPergeseran.findAll({
    where: { status: 'DISETUJUI' },
    order: [['nomor_pergeseran', 'ASC']],
    include: [{ model: DpaPergeseranItem, as: 'items' }],
  });

  const perubahanDisetujui = await DpaPerubahan.findOne({
    where: { dpa_id: dpaId, status: 'DISETUJUI' },
    include: [{ model: DpaPerubahanItem, as: 'items' }],
  });

  const deltaMap = {};
  const sesudahOverrideMap = {};

  pergeseranList.forEach((perg) => {
    (perg.items || []).forEach((item) => {
      const isKurangMilikDpaIni = item.jenis === 'KURANG' && Number(perg.dpa_id) === Number(dpaId);
      const isTambahUntukDpaIni =
        item.jenis === 'TAMBAH' && Number(item.dpa_tujuan_id) === Number(dpaId);
      if (isKurangMilikDpaIni || isTambahUntukDpaIni) {
        const key = buatKey(item.kode_rekening, item.uraian);
        const delta = Number(item.jumlah_menjadi || 0) - Number(item.jumlah_semula || 0);
        if (!deltaMap[key]) {
          deltaMap[key] = {
            delta: 0,
            kode_rekening: item.kode_rekening,
            nama_rekening: item.nama_rekening,
            uraian: item.uraian,
          };
        }
        deltaMap[key].delta += delta;
        const adaData =
          Number(item.volume_menjadi || 0) > 0 || Number(item.harga_satuan_menjadi || 0) > 0;
        if (adaData) {
          sesudahOverrideMap[key] = {
            volume: Number(item.volume_menjadi || 0),
            satuan: item.satuan_menjadi || '',
            harga_satuan: Number(item.harga_satuan_menjadi || 0),
          };
        }
      }
    });
  });

  if (perubahanDisetujui) {
    (perubahanDisetujui.items || []).forEach((item) => {
      const key = buatKey(item.kode_rekening, item.uraian);
      const delta = Number(item.jumlah_sesudah || 0) - Number(item.jumlah_sebelum || 0);
      if (!deltaMap[key]) {
        deltaMap[key] = {
          delta: 0,
          kode_rekening: item.kode_rekening,
          nama_rekening: item.nama_rekening,
          uraian: item.uraian,
        };
      }
      deltaMap[key].delta += delta;
      const adaData =
        Number(item.volume_sesudah || 0) > 0 || Number(item.harga_satuan_sesudah || 0) > 0;
      if (adaData) {
        sesudahOverrideMap[key] = {
          volume: Number(item.volume_sesudah || 0),
          satuan: item.satuan_sesudah || '',
          harga_satuan: Number(item.harga_satuan_sesudah || 0),
        };
      }
    });
  }

  const semuaKey = new Set([...Object.keys(sebelumMap), ...Object.keys(deltaMap)]);
  const hasil = [];
  semuaKey.forEach((key) => {
    const s = sebelumMap[key];
    const d = deltaMap[key];
    const sebelum = s ? s.jumlah : 0;
    const delta = d ? d.delta : 0;
    const setelah = sebelum + delta;
    const override = sesudahOverrideMap[key];
    hasil.push({
      kode_rekening: (s && s.kode_rekening) || (d && d.kode_rekening),
      nama_rekening: (s && s.nama_rekening) || (d && d.nama_rekening),
      uraian: (s && s.uraian) || (d && d.uraian) || '',
      jumlah_sebelum: sebelum,
      volume_sebelum: s ? s.volume : 0,
      satuan_sebelum: s ? s.satuan : '',
      harga_satuan_sebelum: s ? s.harga_satuan : 0,
      jumlah_setelah: setelah,
      volume_setelah: override ? override.volume : s ? s.volume : 0,
      satuan_setelah: override ? override.satuan : s ? s.satuan : '',
      harga_satuan_setelah: override ? override.harga_satuan : s ? s.harga_satuan : 0,
      bertambah_berkurang: setelah - sebelum,
    });
  });

  hasil.sort((a, b) => a.kode_rekening.localeCompare(b.kode_rekening));
  return hasil;
}

module.exports = {
  getRincianSetelahPerubahan,
  syncDpaTotalSetelahPerubahan,
  getRincianDetailUntukPerubahan,
  getRincianLengkapUntukCetak,
};
