'use strict';

/**
 * Jembatan indikator_renstra + realisasi_indikator_renstra -> lakip.
 *
 * Tabel 2.1/2.2 Renja (renjaAutoGenerateBabService.js) mencocokkan indikator via
 * teks (renja_item.indikator === lakip.indikator_kinerja). indikator_renstra
 * (stage='sub_kegiatan') punya nama yang PERSIS sama dengan renja_item.indikator
 * (keduanya diturunkan dari Renstra yang sama), sehingga jadi sumber target yang
 * tepat. Realisasi diambil dari realisasi_indikator_renstra (tabel baru, karena
 * realisasi_indikator lama terkunci FK ke tabel `indikator` RPJMD yang berbeda).
 */

function pilihTargetTahun(indikatorRenstra, tahunTarget, tahunAwalRenstra) {
  const offset = Number(tahunTarget) - Number(tahunAwalRenstra) + 1;
  const kolom = Math.min(Math.max(offset, 1), 6);
  return indikatorRenstra[`target_tahun_${kolom}`];
}

async function bridgeIndikatorRenstraKeLakip(db, renjaDokumenId) {
  const { RenjaDokumen, RenjaItem, IndikatorRenstra, RealisasiIndikatorRenstra, Lakip, RenstraPdDokumen, PeriodeRpjmd } = db;

  const dok = await RenjaDokumen.findByPk(renjaDokumenId, {
    include: [
      { model: RenstraPdDokumen, as: 'renstraPdDokumen', required: false },
      { model: PeriodeRpjmd, as: 'periode', required: false },
    ],
  });
  if (!dok) throw new Error('Dokumen Renja tidak ditemukan.');

  const renstraOpdId = dok.renstraPdDokumen?.renstra_opd_id;
  if (!renstraOpdId) {
    return { updated: 0, skipped: 0, message: 'Dokumen tidak terhubung ke Renstra OPD.' };
  }

  const tahunLalu = String(Number(dok.tahun) - 1);
  const tahunAwalRenstra = dok.periode?.tahun_awal || Number(dok.tahun);

  const renjaItems = await RenjaItem.findAll({ where: { renja_dokumen_id: renjaDokumenId } });

  const indikatorRenstraRows = await IndikatorRenstra.findAll({
    where: { renstra_id: renstraOpdId, stage: 'sub_kegiatan' },
  });
  const byNama = new Map(
    indikatorRenstraRows.map((r) => [String(r.nama_indikator || '').trim(), r]),
  );

  let updated = 0;
  let skipped = 0;

  for (const item of renjaItems) {
    const key = String(item.indikator || '').trim();
    const ir = byNama.get(key);
    if (!ir) {
      skipped++;
      continue;
    }

    const realisasiRow = await RealisasiIndikatorRenstra.findOne({
      where: { indikator_renstra_id: ir.id, tahun: tahunLalu },
    });
    if (!realisasiRow) {
      skipped++;
      continue;
    }

    const target = pilihTargetTahun(ir, tahunLalu, tahunAwalRenstra);

    const existing = await Lakip.findOne({
      where: { tahun: tahunLalu, indikator_kinerja: key, renstra_id: renstraOpdId },
    });
    const payload = {
      tahun: tahunLalu,
      periode_id: dok.periode_id,
      program: item.program,
      kegiatan: item.kegiatan,
      indikator_kinerja: key,
      target,
      realisasi: realisasiRow.nilai_realisasi,
      renstra_id: renstraOpdId,
      // renja_id FK menunjuk ke tabel legacy `renja`, bukan `renja_dokumen` — jangan diisi.
      jenis_dokumen: 'RENJA',
    };

    if (existing) {
      await existing.update(payload);
    } else {
      await Lakip.create(payload);
    }
    updated++;
  }

  return { updated, skipped, total_item: renjaItems.length, tahun_evaluasi: tahunLalu };
}

module.exports = { bridgeIndikatorRenstraKeLakip, pilihTargetTahun };
