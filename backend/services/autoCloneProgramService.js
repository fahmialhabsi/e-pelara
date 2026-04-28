const { Op } = require("sequelize");
const {
  sequelize,
  Program,
  Kegiatan,
  SubKegiatan,
  MasterProgram,
  MasterKegiatan,
  MasterSubKegiatan,
  ProgramArahKebijakan,
  ArahKebijakanProgramMapping,
} = require("../models");

async function autoCloneProgramByArahKebijakan({
  arahKebijakanId,
  strategiId = null,
  periodeId = null,
  sasaranId = null,
  rpjmdId = null,
  tahun = null,
  jenisDokumen = null,
  datasetKey = "kepmendagri_provinsi_900_2024",
}) {
  return await sequelize.transaction(async (t) => {
    const mappings = await ArahKebijakanProgramMapping.findAll({
      where: {
        arah_kebijakan_id: arahKebijakanId,
        dataset_key: datasetKey,
        is_active: true,
      },
      transaction: t,
    });

    const result = [];

    for (const mapping of mappings) {
      const masterProgram = await MasterProgram.findOne({
        where: {
          id: mapping.master_program_id,
          dataset_key: datasetKey,
          is_active: true,
        },
        transaction: t,
      });

      if (!masterProgram) continue;

      const finalPeriodeId = periodeId || mapping.periode_id;
      const finalTahun = tahun || masterProgram.tahun || null;
      const finalJenisDokumen = jenisDokumen || "rpjmd";

      if (!finalPeriodeId) {
        throw new Error("periode_id wajib tersedia untuk auto clone program.");
      }

      if (!sasaranId) {
        throw new Error("sasaranId wajib dikirim untuk auto clone program.");
      }

      if (!rpjmdId && !sasaranId) {
        throw new Error("rpjmdId atau sasaranId wajib dikirim untuk auto clone program.");
      }

      // 1. Clone Program
      let program = await Program.findOne({
          where: {
            periode_id: finalPeriodeId,
            nama_program: masterProgram.nama_program,
          },
          transaction: t,
        });

        if (!program) {
          [program] = await Program.findOrCreate({
            where: {
              kode_program_full: masterProgram.kode_program_full,
              periode_id: finalPeriodeId,
              jenis_dokumen: finalJenisDokumen,
            },
            defaults: {
              kode_program: masterProgram.kode_program,
              kode_program_full: masterProgram.kode_program_full,
              nama_program: masterProgram.nama_program,
              master_program_id: masterProgram.id,
              sasaran_id: sasaranId || masterProgram.sasaran_id,
              rpjmd_id:
                rpjmdId || sasaranId || masterProgram.rpjmd_id || masterProgram.sasaran_id,
              periode_id: finalPeriodeId,
              tahun: finalTahun,
              jenis_dokumen: finalJenisDokumen,
              input_mode: "MASTER",
              pagu_anggaran: masterProgram.pagu_anggaran || 0,
              prioritas: masterProgram.prioritas || null,
              opd_penanggung_jawab: masterProgram.opd_penanggung_jawab || null,
              bidang_opd_penanggung_jawab:
                masterProgram.bidang_opd_penanggung_jawab || null,
            },
            transaction: t,
          });
        }

        await program.update(
          {
            kode_program: program.kode_program || masterProgram.kode_program,
            kode_program_full: program.kode_program_full || masterProgram.kode_program_full,
            nama_program: program.nama_program || masterProgram.nama_program,
            master_program_id: program.master_program_id || masterProgram.id,
            input_mode: program.input_mode || "MASTER",
          },
          { transaction: t }
        );

        await program.reload({ transaction: t });

      // 2. Hubungkan Program ↔ Arah Kebijakan
      await ProgramArahKebijakan.findOrCreate({
        where: {
          program_id: program.id,
          arah_kebijakan_id: arahKebijakanId,
        },
        defaults: {
          program_id: program.id,
          arah_kebijakan_id: arahKebijakanId,
          strategi_id: strategiId || null,
        },
        transaction: t,
      });

      // 3. Clone Kegiatan dari master_kegiatan
      const masterKegiatanList = await MasterKegiatan.findAll({
        where: {
          master_program_id: masterProgram.id,
          dataset_key: datasetKey,
          is_active: true,
        },
        transaction: t,
      });

      const clonedKegiatan = [];

      for (const masterKegiatan of masterKegiatanList) {
        let kegiatan = await Kegiatan.findOne({
          where: {
            periode_id: finalPeriodeId,
            jenis_dokumen: finalJenisDokumen,
            [Op.or]: [
              { kode_kegiatan: masterKegiatan.kode_kegiatan },
              { nama_kegiatan: masterKegiatan.nama_kegiatan },
            ],
          },
          transaction: t,
        });

          if (!kegiatan) {
            kegiatan = await Kegiatan.create(
              {
                program_id: program.id,
                kode_kegiatan: masterKegiatan.kode_kegiatan,
                nama_kegiatan: masterKegiatan.nama_kegiatan,
                periode_id: finalPeriodeId,
                tahun: finalTahun,
                jenis_dokumen: finalJenisDokumen,
                pagu_anggaran: masterKegiatan.pagu_anggaran || 0,
                opd_penanggung_jawab:
                  masterKegiatan.opd_penanggung_jawab ||
                  program.opd_penanggung_jawab ||
                  null,
                bidang_opd_penanggung_jawab:
                  masterKegiatan.bidang_opd_penanggung_jawab ||
                  program.bidang_opd_penanggung_jawab ||
                  null,
              },
              { transaction: t }
            );
          }

          await kegiatan.update(
            {
              program_id: kegiatan.program_id || program.id,
              kode_kegiatan: kegiatan.kode_kegiatan || masterKegiatan.kode_kegiatan,
              nama_kegiatan: kegiatan.nama_kegiatan || masterKegiatan.nama_kegiatan,
              periode_id: kegiatan.periode_id || finalPeriodeId,
              jenis_dokumen: kegiatan.jenis_dokumen || finalJenisDokumen,
              tahun: kegiatan.tahun || finalTahun,
            },
            { transaction: t }
          );

        // 4. Clone Sub Kegiatan dari master_sub_kegiatan
        const masterSubKegiatanList = await MasterSubKegiatan.findAll({
          where: {
            master_kegiatan_id: masterKegiatan.id,
            dataset_key: datasetKey,
            is_active: true,
          },
          transaction: t,
        });

        const clonedSubKegiatan = [];

        for (const masterSubKegiatan of masterSubKegiatanList) {
          let subKegiatan = await SubKegiatan.findOne({
            where: {
              periode_id: finalPeriodeId,
              jenis_dokumen: finalJenisDokumen,
              kode_sub_kegiatan: masterSubKegiatan.kode_sub_kegiatan,
            },
            transaction: t,
          });

          if (!subKegiatan) {
            [subKegiatan] = await SubKegiatan.findOrCreate({
              where: {
                kode_sub_kegiatan: masterSubKegiatan.kode_sub_kegiatan,
                kegiatan_id: kegiatan.id,
                periode_id: finalPeriodeId,
                jenis_dokumen: finalJenisDokumen,
              },
              defaults: {
                kegiatan_id: kegiatan.id,
                kode_sub_kegiatan: masterSubKegiatan.kode_sub_kegiatan,
                nama_sub_kegiatan: masterSubKegiatan.nama_sub_kegiatan,
                periode_id: finalPeriodeId,
                tahun: finalTahun,
                jenis_dokumen: finalJenisDokumen,
                pagu_anggaran: masterSubKegiatan.pagu_anggaran || 0,

                opd_penanggung_jawab:
                  masterSubKegiatan.opd_penanggung_jawab ||
                  kegiatan.opd_penanggung_jawab ||
                  null,

                bidang_opd_penanggung_jawab:
                  masterSubKegiatan.bidang_opd_penanggung_jawab ||
                  kegiatan.bidang_opd_penanggung_jawab ||
                  null,

                nama_opd:
                  masterSubKegiatan.nama_opd ||
                  kegiatan.nama_opd ||
                  "Belum ditentukan",

                nama_bidang_opd:
                  masterSubKegiatan.nama_bidang_opd ||
                  kegiatan.nama_bidang_opd ||
                  "Belum ditentukan",

                sub_bidang_opd:
                  masterSubKegiatan.sub_bidang_opd ||
                  kegiatan.sub_bidang_opd ||
                  "Belum ditentukan",
              },
              transaction: t,
            });
          }

          clonedSubKegiatan.push(subKegiatan);
        }

        clonedKegiatan.push({
          kegiatan,
          sub_kegiatan: clonedSubKegiatan,
        });
      }

      result.push({
        program,
        kegiatan: clonedKegiatan,
      });
    }

    return result;
  });
}

module.exports = {
  autoCloneProgramByArahKebijakan,
};