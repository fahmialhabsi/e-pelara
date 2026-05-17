const {
  RenstraTujuan,
  RenstraSasaran,
  RenstraStrategi,
  RenstraKebijakan,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
  IndikatorRenstra,
} = require("../models");

const LEVELS = [
  {
    level: "tujuan",
    stage: "tujuan",
    model: RenstraTujuan,
    rpjmdField: "rpjmd_tujuan_id",
    labelField: "isi_tujuan",
  },
  {
    level: "sasaran",
    stage: "sasaran",
    model: RenstraSasaran,
    rpjmdField: "rpjmd_sasaran_id",
    labelField: "isi_sasaran",
  },
  {
    level: "strategi",
    stage: "strategi",
    model: RenstraStrategi,
    rpjmdField: "rpjmd_strategi_id",
    labelField: "deskripsi",
  },
  {
    level: "kebijakan",
    stage: "kebijakan",
    model: RenstraKebijakan,
    rpjmdField: "rpjmd_arah_id",
    labelField: "deskripsi",
  },
  {
    level: "program",
    stage: "program",
    model: RenstraProgram,
    rpjmdField: "rpjmd_program_id",
    fallbackRpjmdField: "ref_program_id",
    labelField: "nama_program",
  },
  {
    level: "kegiatan",
    stage: "kegiatan",
    model: RenstraKegiatan,
    rpjmdField: "rpjmd_kegiatan_id",
    fallbackRpjmdField: "ref_kegiatan_id",
    labelField: "nama_kegiatan",
  },
  {
        level: "sub_kegiatan",
        stage: "sub_kegiatan",
        model: RenstraSubkegiatan,
        rpjmdField: "rpjmd_sub_kegiatan_id",
        fallbackRpjmdField: "ref_subkegiatan_id",
        labelField: "nama_sub_kegiatan",
  },
];

function getRpjmdValue(row, cfg) {
  return row[cfg.rpjmdField] ?? row[cfg.fallbackRpjmdField] ?? null;
}

exports.validate = async (req, res) => {
  try {
    const renstraId = Number(req.query.renstra_id);

    if (!renstraId) {
      return res.status(400).json({ error: "renstra_id wajib diisi" });
    }

    const summary = {};
    const issues = [];

    for (const cfg of LEVELS) {
      const rows = await cfg.model.findAll({
        where: { renstra_id: renstraId },
        raw: true,
      });

      const indicators = await IndikatorRenstra.findAll({
        where: {
          renstra_id: renstraId,
          stage: cfg.stage,
        },
        raw: true,
      });

      const indicatorRefSet = new Set(
        indicators.map((item) => Number(item.ref_id))
      );

      let valid = 0;
      let invalid = 0;

      for (const row of rows) {
        const refId = getRpjmdValue(row, cfg);

        if (!refId) {
          invalid++;
          issues.push({
            level: cfg.level,
            row_id: row.id,
            problem: "MISSING_RPJMD_REF",
            message: `${cfg.rpjmdField} kosong`,
            name: row[cfg.labelField] ?? null,
          });
          continue;
        }

        if (!indicatorRefSet.has(Number(refId))) {
          invalid++;
          issues.push({
            level: cfg.level,
            row_id: row.id,
            ref_id: refId,
            problem: "INDIKATOR_NOT_FOUND",
            message: `Tidak ada indikator_renstra stage=${cfg.stage} ref_id=${refId}`,
            name: row[cfg.labelField] ?? null,
          });
          continue;
        }

        valid++;
      }

      summary[cfg.level] = {
        total: rows.length,
        valid,
        invalid,
      };
    }

    res.json({
      renstra_id: renstraId,
      summary,
      issues,
    });
  } catch (err) {
    console.error("renstra-chain validate error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.repair = async (req, res) => {
  try {
    const renstraId = Number(req.body.renstra_id);
    const mode = req.body.mode || "dry_run";

    if (!renstraId) {
      return res.status(400).json({ error: "renstra_id wajib diisi" });
    }

    if (!["dry_run", "apply"].includes(mode)) {
      return res.status(400).json({ error: "mode harus dry_run atau apply" });
    }

    return res.json({
      renstra_id: renstraId,
      mode,
      message:
        "Repair belum diaktifkan. Jalankan validate dulu, lalu kita implement repair berbasis hasil validasi.",
      changes: [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};