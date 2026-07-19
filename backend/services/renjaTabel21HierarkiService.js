'use strict';

/**
 * Tabel 2.1 (T-C.29, Permendagri 86/2017) — rollup hierarkis Urusan > Bidang
 * Urusan > Program > Kegiatan. Hanya baris Kegiatan yang punya data kinerja
 * (indikator_renstra stage='kegiatan', dicocokkan via renstra_kegiatan.kode_kegiatan);
 * baris Urusan/Bidang Urusan/Program murni struktural (kode + nama), sesuai
 * contoh kosong pada lampiran resmi.
 *
 * Semantik tahun (dikonfirmasi user, BEDA dari "n-1/n-2/n-3" default T-C.29 generik):
 *   n-2 = tahun dokumen Renja itu sendiri (mis. 2025)
 *   n-3 = tahun - 1 (2024)
 *   n-1 = tahun + 1 (2026)
 */

function splitKodeNama(text) {
  const s = String(text ?? '').trim();
  const m = s.match(/^([\d.]+)\s*-\s*(.+)$/);
  if (m) return { kode: m[1].replace(/\.+$/, '').trim(), nama: m[2].trim() };
  return { kode: '', nama: s };
}

// "2.09.01.1.01" (Urusan.Bidang.Program.[marker konstan "1"].Kegiatan, 5 segmen)
// -> "2.09.01.01" (Urusan.Bidang.Program.Kegiatan) — buang marker konstan
// index 3, PERTAHANKAN nomor Program asli (index 2) supaya kode kegiatan dari
// program berbeda tidak tabrakan/identik.
function formatKodeKegiatanTC29(kodeKegiatanFull) {
  const seg = String(kodeKegiatanFull || '').split('.').filter(Boolean);
  if (seg.length < 5) return kodeKegiatanFull || '';
  return [seg[0], seg[1], seg[2], seg[4]].join('.');
}

function pilihTargetTahun(indikatorRenstra, tahunTarget, tahunAwalRenstra) {
  const offset = Number(tahunTarget) - Number(tahunAwalRenstra) + 1;
  const kolom = Math.min(Math.max(offset, 1), 6);
  return indikatorRenstra[`target_tahun_${kolom}`];
}

async function buildTabel21Rows(db, dokumenId) {
  const {
    RenjaDokumen,
    RenjaItem,
    RenstraPdDokumen,
    PeriodeRpjmd,
    RenstraKegiatan,
    IndikatorRenstra,
    RealisasiIndikatorRenstra,
  } = db;

  const dok = await RenjaDokumen.findByPk(dokumenId, {
    include: [
      { model: RenstraPdDokumen, as: 'renstraPdDokumen', required: false },
      { model: PeriodeRpjmd, as: 'periode', required: false },
    ],
  });
  if (!dok) throw new Error('Dokumen Renja tidak ditemukan.');

  const tahun = Number(dok.tahun);
  const tahunN3 = tahun - 1;
  const tahunN2 = tahun;
  const tahunN1 = tahun + 1;
  const tahunAwalRenstra = dok.periode?.tahun_awal || tahun;
  const renstraOpdId = dok.renstraPdDokumen?.renstra_opd_id || 0;

  const renjaItems = await RenjaItem.findAll({
    where: { renja_dokumen_id: dokumenId },
    order: [['id', 'ASC']],
  });

  // Kelompokkan item per kegiatan (unik per kode kegiatan), simpan urutan
  // program > kegiatan sesuai urutan kemunculan pertama di renjaItems.
  const programMap = new Map(); // kodeProgram -> { kode, nama, kegiatanKodes: Set (urutan insersi) }
  const kegiatanMap = new Map(); // kodeKegiatan -> { kode, nama, kodeProgram }

  for (const item of renjaItems) {
    const prog = splitKodeNama(item.program);
    const keg = splitKodeNama(item.kegiatan);
    if (!prog.kode || !keg.kode) continue;

    if (!programMap.has(prog.kode)) {
      programMap.set(prog.kode, { kode: prog.kode, nama: prog.nama, kegiatanKodes: new Set() });
    }
    programMap.get(prog.kode).kegiatanKodes.add(keg.kode);

    if (!kegiatanMap.has(keg.kode)) {
      kegiatanMap.set(keg.kode, { kode: keg.kode, nama: keg.nama, kodeProgram: prog.kode });
    }
  }

  const kosong = '......';
  const rows = [];
  const urusanSeen = new Set();
  const bidangSeen = new Set();

  for (const [kodeProgram, prog] of programMap.entries()) {
    const segProgram = kodeProgram.split('.').filter(Boolean); // [urusan, bidang, nomorProgram]
    const kodeUrusan = segProgram[0] || '';
    const kodeBidang = segProgram.length > 1 ? `${segProgram[0]}.${segProgram[1]}` : kodeProgram;

    if (kodeUrusan && !urusanSeen.has(kodeUrusan)) {
      urusanSeen.add(kodeUrusan);
      rows.push({
        level: 'urusan',
        kode: kodeUrusan,
        nama: kosong,
        indikator: '',
        targetRenstra: '',
        realisasiN3: '',
        targetN2: '',
        realisasiN2: '',
        tingkatRealisasi: '',
        targetN1: '',
        realisasiCapaianN1: '',
        tingkatCapaianRenstra: '',
      });
    }

    if (kodeBidang && !bidangSeen.has(kodeBidang)) {
      bidangSeen.add(kodeBidang);
      rows.push({
        level: 'bidang',
        kode: kodeBidang,
        nama: kosong,
        indikator: '',
        targetRenstra: '',
        realisasiN3: '',
        targetN2: '',
        realisasiN2: '',
        tingkatRealisasi: '',
        targetN1: '',
        realisasiCapaianN1: '',
        tingkatCapaianRenstra: '',
      });
    }

    rows.push({
      level: 'program',
      kode: kodeProgram,
      nama: prog.nama,
      indikator: '',
      targetRenstra: '',
      realisasiN3: '',
      targetN2: '',
      realisasiN2: '',
      tingkatRealisasi: '',
      targetN1: '',
      realisasiCapaianN1: '',
      tingkatCapaianRenstra: '',
    });

    for (const kodeKegiatan of prog.kegiatanKodes) {
      const keg = kegiatanMap.get(kodeKegiatan);

      let indikatorNama = kosong;
      let targetRenstra = kosong;
      let realisasiN3 = kosong;
      let targetN2 = kosong;
      let realisasiN2 = kosong;
      let targetN1 = kosong;

      if (RenstraKegiatan && IndikatorRenstra && renstraOpdId) {
        const rk = await RenstraKegiatan.findOne({
          where: { renstra_id: renstraOpdId, kode_kegiatan: kodeKegiatan },
        }).catch(() => null);

        if (rk) {
          const ir = await IndikatorRenstra.findOne({
            where: { renstra_id: renstraOpdId, stage: 'kegiatan', ref_id: rk.id },
          }).catch(() => null);

          if (ir) {
            indikatorNama = String(ir.nama_indikator || kosong).trim();
            targetRenstra = pilihTargetTahun(ir, tahunN2, tahunAwalRenstra) ?? kosong;
            targetN2 = targetRenstra;
            targetN1 = pilihTargetTahun(ir, tahunN1, tahunAwalRenstra) ?? kosong;

            if (RealisasiIndikatorRenstra) {
              const rN3 = await RealisasiIndikatorRenstra.findOne({
                where: { indikator_renstra_id: ir.id, tahun: String(tahunN3) },
              }).catch(() => null);
              const rN2 = await RealisasiIndikatorRenstra.findOne({
                where: { indikator_renstra_id: ir.id, tahun: String(tahunN2) },
              }).catch(() => null);
              if (rN3) realisasiN3 = Number(rN3.nilai_realisasi);
              if (rN2) realisasiN2 = Number(rN2.nilai_realisasi);
            }
          }
        }
      }

      let tingkatRealisasi = kosong;
      if (targetN2 !== kosong && realisasiN2 !== kosong && Number(targetN2) > 0) {
        tingkatRealisasi = `${((Number(realisasiN2) / Number(targetN2)) * 100).toFixed(2)}%`;
      }

      let realisasiCapaianN1 = kosong;
      if (realisasiN3 !== kosong && realisasiN2 !== kosong && targetN1 !== kosong) {
        realisasiCapaianN1 = Number(realisasiN3) + Number(realisasiN2) + Number(targetN1);
      }

      let tingkatCapaianRenstra = kosong;
      if (realisasiCapaianN1 !== kosong && targetRenstra !== kosong && Number(targetRenstra) > 0) {
        tingkatCapaianRenstra = `${((Number(realisasiCapaianN1) / Number(targetRenstra)) * 100).toFixed(2)}%`;
      }

      rows.push({
        level: 'kegiatan',
        kode: formatKodeKegiatanTC29(kodeKegiatan),
        nama: keg?.nama || kosong,
        indikator: indikatorNama,
        targetRenstra,
        realisasiN3,
        targetN2,
        realisasiN2,
        tingkatRealisasi,
        targetN1,
        realisasiCapaianN1,
        tingkatCapaianRenstra,
      });
    }
  }

  return { rows, tahun, tahunN3, tahunN2, tahunN1 };
}

module.exports = { buildTabel21Rows, formatKodeKegiatanTC29, splitKodeNama };
