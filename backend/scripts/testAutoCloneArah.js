const { sequelize } = require("../models");
const {
  autoCloneProgramByArahKebijakan,
} = require("../services/autoCloneProgramService");

async function run() {
  try {
    const result = await autoCloneProgramByArahKebijakan({
        arahKebijakanId: 129,
        strategiId: 1,
        sasaranId: 1,
        rpjmdId: 1,
        periodeId: 2,
        tahun: 2025,
        jenisDokumen: "rpjmd",
        datasetKey: "kepmendagri_provinsi_900_2024",
        });

    console.log("DONE:", {
      totalProgram: result.length,
      program: result.map((r) => ({
        id: r.program.id,
        kode: r.program.kode_program_full,
        nama: r.program.nama_program,
        kegiatan: r.kegiatan.length,
      })),
    });
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

run();