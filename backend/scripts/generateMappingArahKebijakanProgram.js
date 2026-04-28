const {
  sequelize,
  ArahKebijakan,
  MasterProgram,
  ArahKebijakanProgramMapping,
} = require("../models");

const mappingRules = [
  {
    kode_arah: "ASST1-01-01.1.1",
    kode_program_full: ["1.02.02", "1.02.03", "1.02.04", "1.02.05"],
  },
  {
    kode_arah: "ASST1-01-01.1.2",
    kode_program_full: ["1.02.02", "1.02.05"],
  },
  {
    kode_arah: "ASST1-01-02.1.1",
    kode_program_full: ["1.01.02", "1.01.03", "1.01.04"],
  },
  {
    kode_arah: "ASST1-01-02.1.2",
    kode_program_full: ["1.01.02", "1.01.04"],
  },
  {
    kode_arah: "ASST1-01-03.1.1",
    kode_program_full: ["1.06.02", "1.06.04", "1.06.05"],
  },
  {
    kode_arah: "ASST1-01-04.1.1",
    kode_program_full: ["2.19.02", "2.19.03", "2.19.04", "1.06.02"],
  },
  {
    kode_arah: "ASST2-01-01.1.1",
    kode_program_full: ["3.27.02", "3.27.03", "3.30.03", "3.31.02"],
  },
  {
    kode_arah: "ASST2-01-02.1.1",
    kode_program_full: ["2.17.07", "2.17.08", "3.26.02", "3.26.03", "3.26.04", "3.26.05"],
  },
  {
    kode_arah: "ASST2-01-03.1.1",
    kode_program_full: ["2.09.02", "2.09.03", "2.09.04", "2.09.05"],
  },
  {
    kode_arah: "ASST3-01-01.1.1",
    kode_program_full: ["2.16.02", "2.16.03", "5.01.02", "5.01.03"],
  },
  {
    kode_arah: "ASST3-01-02.1.1",
    kode_program_full: ["5.02.02", "5.03.02", "5.04.02"],
  },
  {
    kode_arah: "ASST4-01-01.1.1",
    kode_program_full: ["1.05.02", "1.05.03", "1.05.04", "8.01.06"],
  },
  {
    kode_arah: "ASST4-01-02.1.1",
    kode_program_full: ["2.18.02", "2.18.03", "2.18.04", "2.18.05", "2.18.06"],
  },
  {
    kode_arah: "ASST5-01-01.1.1",
    kode_program_full: ["2.22.02", "2.22.03", "2.22.04", "2.22.05", "2.22.06"],
  },
  {
    kode_arah: "ASST5-01-02.1.1",
    kode_program_full: ["2.11.02", "2.11.03", "2.11.04", "2.11.11"],
  },
  {
    kode_arah: "ASST6-01-01.1.1",
    kode_program_full: ["2.13.02", "2.13.03", "2.13.04", "2.13.05"],
  },
  {
    kode_arah: "ASST6-01-02.1.1",
    kode_program_full: ["1.03.10", "2.15.02", "2.16.03"],
  },
  {
    kode_arah: "ASST6-01-03.1.1",
    kode_program_full: ["1.03.03", "1.03.05", "3.29.05", "3.29.06"],
  },
];

async function run() {
  try {
    const dataset_key = "kepmendagri_provinsi_900_2024";

    const arahList = await ArahKebijakan.findAll();
    const programList = await MasterProgram.findAll({
        where: {
        dataset_key,
        is_active: true,
        },
        });

    let success = 0;
    let skipped = 0;

    for (const ak of arahList) {
        const rule = mappingRules.find((r) => r.kode_arah === ak.kode_arah);

        if (!rule) {
        skipped++;
        console.log("❌ Belum ada rule:", ak.id, ak.kode_arah);
        continue;
        }

        const matchedPrograms = rule.kode_program_full
        .map((kode) => {
        const program = programList.find((p) => p.kode_program_full === kode);

        if (!program) {
                console.log("⚠️ Program tidak ditemukan di master_program:", kode);
        }

        return program;
        })
        .filter(Boolean);

        const uniquePrograms = [
        ...new Map(matchedPrograms.map((p) => [p.id, p])).values(),
        ];

        if (uniquePrograms.length === 0) {
        skipped++;
        console.log("❌ Tidak ada program valid:", ak.id, ak.kode_arah);
        continue;
        }

        for (const program of uniquePrograms) {
        await ArahKebijakanProgramMapping.findOrCreate({
        where: {
                arah_kebijakan_id: ak.id,
                master_program_id: program.id,
                dataset_key,
        },
        defaults: {
                periode_id: ak.periode_id,
                jenis_dokumen: ak.jenis_dokumen,
                is_active: true,
        },
        });

        success++;
        console.log("✅ Mapped:", ak.kode_arah, "→", program.kode_program_full);
        }
        }

    console.log("================================");
    console.log("✅ Success:", success);
    console.log("⚠️ Skipped:", skipped);
    console.log("🚀 DONE");
  } catch (error) {
    console.error("❌ ERROR generate mapping:", error);
  } finally {
    await sequelize.close();
  }
}

run();